// ============================================================
// SEFE — Configuración (config.js)  ·  SELECTOR DE ENTORNO
// ============================================================
// Un SOLO config.js para todos los entornos. Ya no hay un archivo
// distinto por carpeta: este mismo detecta solo dónde está corriendo
// (Producción, Pruebas o un cliente) y elige la base que corresponde.
//
// Cómo decide, EN ORDEN:
//   1. ?env=NOMBRE en la URL   → gana sobre todo (para probar)
//   2. la ruta /Pruebas/       → base de PRUEBAS
//   3. el dominio              → cada cliente tiene el suyo
//   4. si nada calza           → PRODUCCIÓN  (el default seguro)
//
// REGLA DE ORO: Producción es el default. Pruebas o un cliente SÓLO se
// encienden con una señal explícita (ruta, dominio o ?env). Así el
// sitio real nunca cae por error en la base equivocada.
//
// DAR DE ALTA UN CLIENTE NUEVO: copiar el bloque "PLANTILLA" de abajo,
// descomentarlo, y poner su url/key de Supabase y su dominio. Nada más.
// ============================================================

const SEFE_ENTORNOS = {

  produccion: {
    entorno: 'produccion',
    url: 'https://krbyulpmfazntjwnpxnw.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyYnl1bHBtZmF6bnRqd25weG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMzY1MjQsImV4cCI6MjA5NzcxMjUyNH0.72uJxSRXGl8JviVtmhylYW7_Cr-zW767jEOYD4JOYFI',
    dominios: ['sistema.se-fe.com'],
    // Funciones que se están probando: se publican apagadas y se
    // encienden acá cuando están listas. El código viaja igual.
    funciones: {
      whatsapp: false,
      // Número de documento/cotización asignado por la base (secuencia),
      // en vez de max+1 en el navegador. Probado en Pruebas → encendido.
      numeroPorBase: true,
      // Logo (imagen) embebido en los Excel exportados. Probado en
      // Pruebas (abren sin "archivo dañado" y con el logo) → encendido.
      logoEnExcel: true
    }
  },

  pruebas: {
    entorno: 'pruebas',
    url: 'https://imvoyzxdvtoktckazzsv.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltdm95enhkdnRva3Rja2F6enN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MjAwMjYsImV4cCI6MjA5ODA5NjAyNn0.grVM8a132r_UmRDs-6DYc9oPN1nKz_mtHa9LKGdAq4Y',
    // Pruebas NO se detecta por dominio (comparte host con Producción):
    // se detecta por la ruta /Pruebas/ o con ?env=pruebas.
    rutas: ['/pruebas'],
    funciones: {
      // Bandeja de WhatsApp: encendida SÓLO en Pruebas. Las tablas de
      // conversaciones y mensajes existen únicamente en esta base.
      whatsapp: true,
      // Número por secuencia de la base: ENCENDIDO en Pruebas para probarlo.
      numeroPorBase: true,
      // Logo en los Excel: ENCENDIDO en Pruebas para probarlo.
      logoEnExcel: true
    }
  }

  // ── PLANTILLA CLIENTE NUEVO ──────────────────────────────────
  // Copiar, descomentar, y completar url / key / dominio. El bloque
  // `marca` es OPCIONAL: lo que no se ponga se hereda de SEFE. Sirve
  // para que cada instalación se vea con el nombre, logo y colores
  // del cliente (en la interfaz y en los documentos).
  //
  // ,clienteEjemplo: {
  //   entorno: 'clienteEjemplo',
  //   url: 'https://XXXXXXXXXXXX.supabase.co',
  //   key: 'ANON_KEY_PUBLICA_DEL_CLIENTE',
  //   dominios: ['clienteejemplo.se-fe.com'],
  //   funciones: { whatsapp: false },
  //   // Módulos opcionales. Lo que no se ponga queda ENCENDIDO.
  //   // Base (siempre): pedidos, facturación, clientes, inventario,
  //   // reportes y administración. Para apagar un módulo: false.
  //   modulos: {
  //     cotizaciones: true,   // cotizaciones a clientes
  //     cobros: true,         // cuentas por cobrar + recordatorios
  //     compras: true,        // compras, proveedores y cuentas por pagar
  //     bancos: true          // bancos, conciliación y talonarios
  //   },
  //   marca: {
  //     nombre: 'Cliente Ejemplo',                 // barra lateral, pestaña, ícono
  //     tagline: 'PEDIDOS & FACTURACIÓN',
  //     nombreLargo: 'Cliente Ejemplo, S.A.',      // pantalla de carga
  //     monograma: 'CE',                            // el cuadrito de 2 letras
  //     logo: 'data:image/png;base64,....',         // logo del cliente (imagen)
  //     razonSocial: 'Cliente Ejemplo, S.A.',       // documentos (notas)
  //     membrete: 'Cliente Ejemplo, S.A.',          // membrete de Excel / pie de PDF
  //     nombreDoc: 'Cliente Ejemplo',               // encabezado de órdenes e inventario
  //     nit: '1234567-8',
  //     ciudadPais: 'Guatemala, C.A.',
  //     ciudadDoc: 'Guatemala, Guatemala',
  //     prefijoArchivo: 'CLIENTE',                  // prefijo de los Excel descargados
  //     colorPrimario: '#173916',                   // color principal (interfaz)
  //     colorAcento: '#A8C038'                      // color de acento (interfaz)
  //   }
  // }

};

// Detecta el entorno a partir de la URL (o de un objeto tipo location,
// para poder probarlo). Devuelve siempre un nombre válido; ante la
// duda, 'produccion'.
function _sefeDetectarEntorno(loc){
  loc = loc || (typeof window !== 'undefined' ? window.location : {});
  const host   = String(loc.hostname || '').toLowerCase();
  const path   = String(loc.pathname || '').toLowerCase();
  const search = String(loc.search   || '').toLowerCase();

  // 1) ?env= explícito (gana sobre todo)
  const m = search.match(/[?&]env=([a-z0-9_-]+)/);
  if (m && SEFE_ENTORNOS[m[1]]) return m[1];

  // 2) por ruta (ej. /Pruebas/) — antes que el dominio, porque Pruebas
  //    comparte host con Producción y sólo la ruta las distingue.
  for (const nombre in SEFE_ENTORNOS){
    const rutas = SEFE_ENTORNOS[nombre].rutas || [];
    if (rutas.some(r => path.indexOf(String(r).toLowerCase()) !== -1)) return nombre;
  }

  // 3) por dominio (cada cliente y Producción tienen el suyo)
  for (const nombre in SEFE_ENTORNOS){
    const doms = SEFE_ENTORNOS[nombre].dominios || [];
    if (doms.some(d => host === String(d).toLowerCase())) return nombre;
  }

  // 4) default seguro
  return 'produccion';
}

// Lo que consume el resto del sistema (igual que antes: .url .key
// .entorno .funciones). No cambia nada aguas abajo.
const SEFE_CONFIG = SEFE_ENTORNOS[_sefeDetectarEntorno()] || SEFE_ENTORNOS.produccion;

if (typeof console !== 'undefined' && console.info){
  console.info('SEFE · entorno: ' + SEFE_CONFIG.entorno);
}

// Para la prueba automática (node). En el navegador no hace nada.
if (typeof module !== 'undefined' && module.exports){
  module.exports = { SEFE_ENTORNOS, _sefeDetectarEntorno };
}
