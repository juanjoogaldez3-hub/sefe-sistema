// ============================================================
//  SEFE · Generador de las FICHAS de la tienda anterior
// ============================================================
//  Qué hace: toma los productos de la tienda vieja
//  (solucionesefectivasgt.com, bajados de la API pública de
//  WooCommerce Store en archivos p1.json, p2.json, …) y arma
//  tienda/fichas-anteriores.json: un array compacto de
//      [nombre, urlFoto, descripcion]
//  para que el sistema importe nombre, foto y descripción.
//
//  La descripción sale en TEXTO PLANO (nada de HTML), en un
//  mini-formato de líneas separadas por "\n":
//      texto                → párrafo normal
//      ## Título            → encabezado
//      • texto              → ítem de lista
//      @pdf Etiqueta|URL    → enlace a un PDF (hoja técnica / SDS)
//  La primera línea siempre es el resumen corto del producto.
//
//  Cómo se corre:
//      node scripts/build-fichas-tienda.js <carpeta-con-los-p*.json>
//
//  Cómo se bajan los p*.json (100 productos por página):
//      https://solucionesefectivasgt.com/wp-json/wc/store/v1/products?per_page=100&page=1
//
//  Importante: NO se edita fichas-anteriores.json a mano; se vuelve
//  a correr esto. Sin dependencias: sólo Node. Lo que viene de la web
//  vieja se trata como DATOS (se le quita todo el HTML).
// ============================================================

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const SALIDA = path.join(RAIZ, 'tienda', 'fichas-anteriores.json');
const BASE_SUBIDAS = 'https://solucionesefectivasgt.com/wp-content/uploads/';
const TOPE = 4000;          // máximo de caracteres por descripción

// ---------- Entidades HTML ----------
const ENTIDADES = {
  nbsp: '\u00A0', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  ntilde: 'ñ', Ntilde: 'Ñ', uuml: 'ü', Uuml: 'Ü', iexcl: '¡', iquest: '¿',
  deg: '°', ordm: 'º', ordf: 'ª', reg: '®', copy: '©', trade: '™',
  times: '×', middot: '·', bull: '•', hellip: '…', ndash: '–', mdash: '—',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»',
  prime: '′', Prime: '″', frac12: '½', frac14: '¼', frac34: '¾',
  micro: 'µ', plusmn: '±', sup2: '²', sup3: '³', euro: '€', cent: '¢',
};

function decodificar(s) {
  return String(s == null ? '' : s).replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g, (m, e) => {
    if (e[0] === '#') {
      const n = (e[1] === 'x' || e[1] === 'X') ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      if (!n || n > 0x10FFFF) return '';
      try { return String.fromCodePoint(n); } catch (_) { return ''; }
    }
    return Object.prototype.hasOwnProperty.call(ENTIDADES, e) ? ENTIDADES[e] : m;
  });
}

// ---------- Mojibake (UTF-8 leído como Windows-1252: "Ã±" → "ñ") ----------
const CP1252 = {
  '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87,
  'ˆ': 0x88, '‰': 0x89, 'Š': 0x8A, '‹': 0x8B, 'Œ': 0x8C, 'Ž': 0x8E,
  '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97,
  '˜': 0x98, '™': 0x99, 'š': 0x9A, '›': 0x9B, 'œ': 0x9C, 'ž': 0x9E, 'Ÿ': 0x9F,
};
const CONT = '[\\u0080-\\u00BF' + Object.keys(CP1252).join('') + ']';
const RE_MOJIBAKE = new RegExp('[ÃÂÌ]' + CONT + '|â' + CONT + '{2}|ï»¿', 'g');
const UTF8 = new TextDecoder('utf-8', { fatal: true });

function arreglarMojibake(s) {
  // Sólo se tocan las secuencias que empiezan con Ã / Â / Ì / â: son las que
  // aparecen en español mal codificado y casi nunca en un texto sano.
  return s.replace(RE_MOJIBAKE, m => {
    const bytes = Array.from(m, c => (CP1252[c] !== undefined ? CP1252[c] : c.charCodeAt(0)));
    try { return UTF8.decode(Uint8Array.from(bytes)); } catch (_) { return m; }
  }).normalize('NFC');     // de paso: tildes "sueltas" (o + ´) → una sola letra
}

// Limpieza de un tramo de texto ya sin etiquetas.
function limpiarTexto(s) {
  return arreglarMojibake(s)
    .replace(/[\u200B-\u200F\u2028\u2029\u2060\uFEFF\u00AD]/g, '')      // invisibles
    .replace(/\[\/?[a-zA-Z_][\w-]*(?:\s[^\]\n]*)?\]/g, ' ')            // shortcodes [algo]
    .replace(/[<>]/g, c => (c === '<' ? '‹' : '›'))                     // que no quede nada que parezca etiqueta
    .replace(/[\s\u00A0]+/g, ' ');
}

const unEspacio = s => s.replace(/\s+/g, ' ').trim();

// ---------- HTML → líneas del mini-formato ----------
const BLOQUE = new Set(['p', 'div', 'section', 'article', 'ul', 'ol', 'li', 'pre', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'blockquote',
  'header', 'footer', 'figure', 'figcaption', 'dl', 'dt', 'dd', 'main', 'aside', 'nav', 'form']);
const NEGRITA = new Set(['strong', 'b']);
const RE_TOKEN = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>|([^<]+)|</g;
const RE_VINETA = /^\s*[•·▪●■◦✓✔►➤\-–—*]\s+/;
const RE_MEDIO = /\.(?:png|jpe?g|gif|webp|svg|mp4|mov|webm)(?:\?.*)?$|youtube\.com|youtu\.be|vimeo\.com/i;
const FIN_ORACION = /[.:;!?…]["”»)]?$/;

function esPdfValido(url) {
  return url.startsWith(BASE_SUBIDAS) && /\.pdf$/i.test(url) && !/[\s|"'<>]/.test(url);
}

function etiquetaPdf(texto, url) {
  let t = unEspacio(texto.replace(/\|/g, ' ')).replace(/\s*:$/, '').slice(0, 60).trim();
  if (t) return t;
  const arch = url.slice(url.lastIndexOf('/') + 1).toLowerCase();
  if (/sds|msds|seguridad/.test(arch)) return 'Hoja de seguridad (SDS)';
  if (/tecnica|ficha|hoja/.test(arch)) return 'Hoja técnica';
  if (/brochure|catalogo/.test(arch)) return 'Brochure';
  return 'Documento PDF';
}

// Devuelve [{tipo:'p'|'h'|'li'|'pdf', texto}] a partir de un HTML.
function htmlALineas(html) {
  const lineas = [];
  let piezas = [];            // {t, b} texto (b = en negrita) o {br:true}
  let pdfs = [];              // PDFs encontrados en el bloque actual
  let negrita = 0, enLi = 0, enH = 0, enPre = 0, saltar = null;
  let enlace = null;          // {url, desde, pdf} mientras hay un <a> abierto que interesa

  const cerrarEnlace = () => {
    if (!enlace) return;
    if (enlace.pdf) {
      const quitadas = piezas.splice(enlace.desde);
      pdfs.push({ url: enlace.url, texto: quitadas.map(p => p.t || ' ').join('') });
    } else {
      // enlace a una foto o video: se marca su texto ("VIDEO", "MSDS"…) para
      // tirarlo si el bloque no trae nada más (sin el enlace no dice nada)
      for (let i = enlace.desde; i < piezas.length; i++) if (!piezas[i].br) piezas[i].m = true;
    }
    enlace = null;
  };

  const cerrarBloque = () => {
    cerrarEnlace();
    // Partir el bloque en tramos por cada <br>
    const tramos = [[]];
    for (const p of piezas) (p.br ? tramos.push([]) : tramos[tramos.length - 1].push(p));
    const segs = [];
    for (const tr of tramos) {
      const texto = unEspacio(tr.map(p => p.t).join(''));
      if (!texto) continue;
      const conLetras = tr.filter(p => p.t.trim());
      if (conLetras.every(p => p.m)) continue;                 // sólo un enlace a foto/video
      segs.push({ texto, negrita: conLetras.every(p => p.b) });
    }
    // Unir los <br> que cortan una oración a la mitad (texto pegado de un PDF)
    const unidos = [];
    for (const s of segs) {
      const ant = unidos[unidos.length - 1];
      if (ant && !RE_VINETA.test(s.texto) && !ant.titulo) {
        if (ant.negrita && !s.negrita && ant.texto.length <= 60) {
          // "Aroma<br>Inspirado en…": rótulo en negrita + su texto
          if (enLi) {
            ant.texto += (/[:.]$/.test(ant.texto) ? ' ' : ': ') + s.texto;
            ant.negrita = false;
            continue;
          }
          ant.titulo = true;
        } else {
          const sigueMinuscula = /^[a-záéíóúñü(,;]/.test(s.texto);
          const cortada = (!FIN_ORACION.test(ant.texto) || /\s\d{1,2}\.$/.test(ant.texto)) && ant.texto.length >= 35;
          if (sigueMinuscula || cortada || /,$/.test(ant.texto)) {
            ant.texto += ' ' + s.texto;
            ant.negrita = ant.negrita && s.negrita;
            continue;
          }
        }
      }
      unidos.push({ texto: s.texto, negrita: s.negrita, titulo: false });
    }
    for (const s of unidos) {
      let texto = s.texto, tipo = 'p';
      const conVineta = RE_VINETA.test(texto);
      if (conVineta) texto = texto.replace(RE_VINETA, '').trim();
      if (!texto || !/[\p{L}\p{N}]/u.test(texto)) continue;    // sólo signos: fuera
      const corto = texto.length <= 80 && !/\.$/.test(texto);
      if (enLi || conVineta) tipo = 'li';
      else if (enH && corto) tipo = 'h';
      // párrafo que es sólo negrita corta = título (si trae números es un dato: "Costo: Q 17.79")
      else if ((s.negrita || s.titulo) && corto && !/\d/.test(texto)) tipo = 'h';
      if (tipo === 'h') texto = texto.replace(/\s*:$/, '');
      lineas.push({ tipo, texto });
    }
    for (const p of pdfs) {
      if (!lineas.some(l => l.tipo === 'pdf' && l.url === p.url)) {
        lineas.push({ tipo: 'pdf', url: p.url, texto: etiquetaPdf(p.texto, p.url) + '|' + p.url });
      }
    }
    piezas = []; pdfs = [];
  };

  let m;
  RE_TOKEN.lastIndex = 0;
  while ((m = RE_TOKEN.exec(html))) {
    if (m[4] !== undefined || m[0] === '<') {                 // texto
      if (saltar) continue;
      let t = decodificar(m[0]);
      if (enPre) {
        const partes = t.split(/\r?\n/);
        partes.forEach((p, i) => {
          if (i) piezas.push({ br: true });
          piezas.push({ t: limpiarTexto(p), b: negrita > 0 });
        });
      } else {
        piezas.push({ t: limpiarTexto(t), b: negrita > 0 });
      }
      continue;
    }
    if (m[2] === undefined) continue;                          // comentario
    const cierra = m[1] === '/';
    const tag = m[2].toLowerCase();
    if (saltar) { if (cierra && tag === saltar) saltar = null; continue; }
    if (tag === 'script' || tag === 'style') { if (!cierra) saltar = tag; continue; }
    if (tag === 'br') { piezas.push({ br: true }); continue; }
    if (NEGRITA.has(tag)) { negrita = Math.max(0, negrita + (cierra ? -1 : 1)); continue; }
    if (tag === 'a') {
      if (cierra) { cerrarEnlace(); continue; }
      cerrarEnlace();
      const h = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(m[3] || '');
      let url = h ? decodificar(h[1] || h[2] || h[3] || '').trim() : '';
      // la web vieja tiene enlaces propios todavía con http:// → se pasan a https://
      url = url.replace(/^http:\/\/(?:www\.)?solucionesefectivasgt\.com\//i, 'https://solucionesefectivasgt.com/');
      if (esPdfValido(url)) enlace = { url, desde: piezas.length, pdf: true };
      else if (RE_MEDIO.test(url)) enlace = { url, desde: piezas.length, pdf: false };
      continue;
    }
    if (tag === 'td' || tag === 'th') { piezas.push({ t: ' ', b: negrita > 0 }); continue; }
    if (BLOQUE.has(tag)) {
      cerrarBloque();
      if (tag === 'li') enLi = Math.max(0, enLi + (cierra ? -1 : 1));
      else if (/^h[1-6]$/.test(tag)) enH = Math.max(0, enH + (cierra ? -1 : 1));
      else if (tag === 'pre') enPre = Math.max(0, enPre + (cierra ? -1 : 1));
    }
    // cualquier otra etiqueta (span, em, img, …) se descarta
  }
  cerrarBloque();
  return lineas;
}

// Para comparar líneas sin importar mayúsculas, tildes ni signos.
const norma = s => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');

// "## Altura" + "27.5 cm"  →  "Altura: 27.5 cm" (fichas de medidas, notas de fragancia…)
function unirRotulos(lineas) {
  const out = [];
  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i], sig = lineas[i + 1];
    if (l.tipo === 'h' && l.texto.length <= 30 && sig && sig.tipo === 'p' && sig.texto.length <= 60 &&
        !/: /.test(sig.texto)) {
      out.push({ tipo: 'p', texto: l.texto + ': ' + sig.texto });
      i++;
    } else out.push(l);
  }
  return out;
}

// Arreglos entre líneas vecinas:
//  · párrafo cortado a media oración que sigue en el párrafo siguiente → se unen;
//  · "Características:" / "Dimensiones:" con su contenido debajo → pasa a ser título;
//  · "VIDEO:" / "PRODUCTO COMPATIBLE:" sin nada debajo (era una foto o video) → fuera.
function arreglarVecinas(lineas) {
  const unidas = [];
  for (const l of lineas) {
    const ant = unidas[unidas.length - 1];
    if (ant && ant.tipo === 'p' && l.tipo === 'p' && /^[a-záéíóúñü]/.test(l.texto) &&
        ant.texto.length >= 35 && !FIN_ORACION.test(ant.texto)) {
      ant.texto += ' ' + l.texto;
    } else unidas.push({ tipo: l.tipo, texto: l.texto, url: l.url });
  }
  const esRotulo = l => l && l.tipo === 'p' && l.texto.length <= 60 && /:$/.test(l.texto);
  const out = [];
  for (let i = 0; i < unidas.length; i++) {
    const l = unidas[i], sig = unidas[i + 1];
    if (esRotulo(l)) {
      if (!sig || sig.tipo === 'h' || sig.tipo === 'pdf' || esRotulo(sig)) continue;
      out.push({ tipo: 'h', texto: l.texto.replace(/\s*:$/, '') });
      continue;
    }
    out.push(l);
  }
  return out;
}

function quitarRepetidas(lineas) {
  const vistas = new Set();
  return lineas.filter(l => {
    const k = l.tipo === 'pdf' ? 'pdf|' + l.url : norma(l.texto);
    if (!k) return false;
    // lo repetido se quita (también un título que repite el resumen); los
    // títulos no se anotan: "Características" puede salir más de una vez
    if (vistas.has(k)) return false;
    if (l.tipo !== 'h') vistas.add(k);
    return true;
  });
}

// Quita títulos que quedaron sin contenido debajo (al final, o justo antes de un PDF).
function quitarTitulosColgados(lineas) {
  const out = lineas.filter((l, i) => !(i > 0 && l.tipo === 'h' && lineas[i + 1] && lineas[i + 1].tipo === 'pdf'));
  while (out.length > 1 && out[out.length - 1].tipo === 'h') out.pop();
  return out;
}

const PREFIJO = { p: '', h: '## ', li: '• ', pdf: '@pdf ' };

function armarDescripcion(corta, larga) {
  let res = unirRotulos(htmlALineas(corta || ''));
  let det = unirRotulos(htmlALineas(larga || ''));

  // Resumen: el primer párrafo; los párrafos largos que siguen se le unen,
  // las líneas cortas ("Presentación: Galón") quedan aparte.
  const resumen = [];
  for (const l of res) {
    const prim = resumen[0];
    if (prim && resumen.length === 1 && l.tipo === 'p' && l.texto.length > 60 &&
        prim.texto.length > 60 && prim.texto.length + l.texto.length <= 400) {
      prim.texto += ' ' + l.texto;
    } else resumen.push({ tipo: l.tipo, texto: l.texto, url: l.url });
  }

  // Si la descripción larga arranca repitiendo el resumen, no duplicar.
  if (resumen.length && det.length) {
    const r = norma(resumen[0].texto), d = norma(det[0].texto);
    if (det[0].tipo !== 'pdf' && r.length >= 12 && d.length > r.length && d.startsWith(r)) {
      // el resumen es el comienzo del primer párrafo largo: queda el párrafo entero como resumen
      resumen[0] = { tipo: 'p', texto: det[0].texto };
      det = det.slice(1);
    }
  }

  det = arreglarVecinas(det);
  if (resumen.length && resumen[0].tipo !== 'pdf') resumen[0].tipo = 'p';   // el resumen va como texto simple
  // Fuera lo que ya no vale en la tienda nueva: precios y costos de la tienda
  // anterior (los precios los pone el sistema) y sus datos de contacto.
  const VIEJO = /\bQ\s?\.?\s?\d|whats\s?app|\+502|@solucionesefectivasgt|podamos cotizar/i;
  let todas = quitarTitulosColgados(quitarRepetidas(resumen.concat(det).filter(l => l.tipo === 'pdf' || !VIEJO.test(l.texto))));
  if (!todas.length) return '';

  // La primera línea es el resumen: va como texto simple (sin "## " ni "• ").
  const iTexto = todas.findIndex(l => l.tipo !== 'pdf');
  if (iTexto > 0) todas.unshift(todas.splice(iTexto, 1)[0]);
  if (todas[0].tipo !== 'pdf') todas[0] = { tipo: 'p', texto: todas[0].texto };

  // Tope de largo: se corta en fin de línea.
  const out = [];
  let largo = 0;
  for (const l of todas) {
    const s = PREFIJO[l.tipo] + l.texto;
    if (largo + s.length + (out.length ? 1 : 0) > TOPE) break;
    largo += s.length + (out.length ? 1 : 0);
    out.push(l);
  }
  if (!out.length) return (PREFIJO[todas[0].tipo] + todas[0].texto).slice(0, TOPE);
  return quitarTitulosColgados(out).map(l => PREFIJO[l.tipo] + l.texto).join('\n');
}

// ---------- Armado del archivo ----------
function leerProductos(carpeta) {
  const archivos = fs.readdirSync(carpeta)
    .filter(f => /^p\d+\.json$/.test(f))
    .sort((a, b) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10));
  if (!archivos.length) throw new Error('No hay archivos p1.json, p2.json… en ' + carpeta);
  let productos = [];
  for (const f of archivos) {
    const datos = JSON.parse(fs.readFileSync(path.join(carpeta, f), 'utf8'));
    if (!Array.isArray(datos)) throw new Error(f + ' no es un array');
    productos = productos.concat(datos);
  }
  return productos;
}

function construirFichas(productos) {
  return productos.map(p => {
    const nombre = unEspacio(arreglarMojibake(decodificar(p.name)));
    const img = p.images && p.images[0] && typeof p.images[0].src === 'string' ? p.images[0].src : '';
    const foto = img.startsWith(BASE_SUBIDAS) ? img : '';
    return [nombre, foto, armarDescripcion(p.short_description, p.description)];
  });
}

if (require.main === module) {
  const carpeta = process.argv[2];
  if (!carpeta) {
    console.error('Uso: node scripts/build-fichas-tienda.js <carpeta-con-los-p*.json>');
    process.exit(1);
  }
  const fichas = construirFichas(leerProductos(path.resolve(carpeta)));
  const json = JSON.stringify(fichas);
  fs.writeFileSync(SALIDA, json);
  const conDesc = fichas.filter(f => f[2]);
  const largos = conDesc.map(f => f[2].length);
  console.log(`✓ fichas-anteriores.json generado: ${fichas.length} fichas, ` +
    `${fichas.filter(f => f[1]).length} con foto, ${conDesc.length} con descripción, ` +
    `${(Buffer.byteLength(json) / 1024).toFixed(1)} KB ` +
    `(largo promedio ${Math.round(largos.reduce((a, b) => a + b, 0) / (largos.length || 1))}, ` +
    `máximo ${Math.max(0, ...largos)}).`);
}

module.exports = { construirFichas, leerProductos, armarDescripcion, htmlALineas };
