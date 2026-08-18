// ============================================================
//  SEFE · test-egress.js — LA CARGA INICIAL NO BAJA LOS PDFs
// ============================================================
//  Cómo se corre:   node test-egress.js
//  No necesita instalar nada ni conectarse a internet.
//
//  POR QUÉ EXISTE
//
//  documentos.pdf_base64 / xml_base64 guardan el PDF y el XML de cada
//  factura en base64. Son el 90% del peso de la base. Bajarlos en cada
//  login disparó el egress de Supabase a 34 GB (688% del plan gratis).
//
//  El arreglo: cargarTodo() trae 'documentos' SIN esos dos campos, y el
//  PDF se pide a pedido con asegurarPdfDoc() sólo al abrir una factura.
//
//  Esta prueba cuida dos cosas que, si se rompen, no dan error visible:
//   1. Que la lista de columnas (DOC_COLS_SIN_BLOBS) no se olvide ninguna
//      columna que el mapeador sí lee — salvo, a propósito, los dos blobs.
//      (Si alguien agrega un campo al mapeador y no a la lista, esa
//       columna llegaría vacía en cada carga, en silencio.)
//   2. Que asegurarPdfDoc() traiga el PDF cuando toca y no cuando no.
// ============================================================

const fs = require('fs'), vm = require('vm');
const src = fs.readFileSync(__dirname + '/db.js', 'utf8');

let fallos = 0, pruebas = 0;
const ok = (t, c, e) => { pruebas++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '  → ' + e)); if (!c) fallos++; };

function trozo(desde, hasta) {
  const i = src.indexOf(desde);
  if (i < 0) { console.log('✗ no se encontró: ' + desde); process.exit(1); }
  const j = src.indexOf(hasta, i);
  return src.slice(i, j + hasta.length);
}

console.log('\n═══ DOC_COLS_SIN_BLOBS cubre todo lo que el mapeador lee ═══');

// La lista de columnas que pide la carga inicial
const mCols = src.match(/const DOC_COLS_SIN_BLOBS='([^']+)'/);
if (!mCols) { console.log('✗ no se encontró DOC_COLS_SIN_BLOBS'); process.exit(1); }
const cols = new Set(mCols[1].split(','));

// Los campos d.xxx que lee mapDocumentoFromDB
const mapBody = trozo('function mapDocumentoFromDB', '\n}');
const leidos = [...mapBody.matchAll(/\bd\.([a-z0-9_]+)/g)].map(m => m[1]);
const leidosUnicos = [...new Set(leidos)];

const BLOBS = ['pdf_base64', 'xml_base64']; // a propósito FUERA de la lista
const faltantes = leidosUnicos.filter(c => !cols.has(c) && !BLOBS.includes(c));
ok('ninguna columna que el mapeador lee quedó fuera de la lista',
  faltantes.length === 0, 'faltan en DOC_COLS: ' + faltantes.join(', '));

ok('los dos blobs pesados NO están en la lista (se piden a pedido)',
  !cols.has('pdf_base64') && !cols.has('xml_base64'),
  'la lista todavía baja: ' + BLOBS.filter(b => cols.has(b)).join(', '));

ok('el mapeador sí lee los blobs (para cuando llegan a pedido)',
  BLOBS.every(b => leidosUnicos.includes(b)));

console.log('\n═══ asegurarPdfDoc() trae el PDF sólo cuando toca ═══');

// Cargar sólo la función asegurarPdfDoc en un sandbox con un sb de mentira
const fnSrc = trozo('async function asegurarPdfDoc(f){', '\n}');
let llamadasALaBase = 0;
const sbMock = {
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => { llamadasALaBase++; return { data: { pdf_base64: 'PDF-DE-LA-BASE', xml_base64: 'XML-DE-LA-BASE' }, error: null }; }
      })
    })
  })
};
const ctx = { sb: sbMock, console };
vm.createContext(ctx);
vm.runInContext(fnSrc + '\n;globalThis.__f=asegurarPdfDoc;', ctx);
const asegurarPdfDoc = ctx.__f;

(async () => {
  // 1) Ya cargado en memoria → lo devuelve sin tocar la base
  llamadasALaBase = 0;
  let r = await asegurarPdfDoc({ id: 1, pdfBase64: 'YA-ESTABA', autorizacion: 'A1' });
  ok('si ya está en memoria, no vuelve a la base', llamadasALaBase === 0 && r === 'YA-ESTABA', 'llamadas=' + llamadasALaBase + ' r=' + r);

  // 2) Sin autorización (no es factura con PDF oficial) → null, sin tocar la base
  llamadasALaBase = 0;
  r = await asegurarPdfDoc({ id: 2 });
  ok('sin autorización devuelve null y no toca la base', llamadasALaBase === 0 && r === null, 'llamadas=' + llamadasALaBase + ' r=' + r);

  // 3) Con autorización y sin PDF → lo trae, lo cachea y devuelve
  llamadasALaBase = 0;
  const f = { id: 3, autorizacion: 'A3' };
  r = await asegurarPdfDoc(f);
  ok('lo trae de la base cuando falta', llamadasALaBase === 1 && r === 'PDF-DE-LA-BASE', 'llamadas=' + llamadasALaBase + ' r=' + r);
  ok('lo deja cacheado en el objeto (pdf y xml)', f.pdfBase64 === 'PDF-DE-LA-BASE' && f.xmlBase64 === 'XML-DE-LA-BASE');

  // 4) Segunda vez sobre el mismo objeto → ya cacheado, no vuelve
  llamadasALaBase = 0;
  await asegurarPdfDoc(f);
  ok('la segunda vez ya no toca la base', llamadasALaBase === 0);

  // 5) f nulo no rompe
  r = await asegurarPdfDoc(null);
  ok('con f nulo devuelve null sin romper', r === null);

  console.log('\n' + (fallos === 0 ? `✓ TODO BIEN — ${pruebas} pruebas pasaron` : `✗ ${fallos} de ${pruebas} fallaron`) + '\n');
  process.exit(fallos ? 1 : 0);
})();
