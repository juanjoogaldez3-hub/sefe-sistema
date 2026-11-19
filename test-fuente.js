// ============================================================
//  SEFE · test-fuente.js — EL CÓDIGO FUENTE ACTUAL, PARA LAS PRUEBAS
// ============================================================
//  Las pruebas (test-*.js) hacen `const src = require('./test-fuente')`
//  y buscan patrones en ese texto.
//
//  ANTES este archivo era una copia CONGELADA (un module.exports="..."
//  de ~1.2 MB generado a mano). Nadie lo regeneraba, así que las pruebas
//  verificaban el código viejo y podían pasar aunque el código real
//  hubiera cambiado o se hubiera roto.
//
//  AHORA arma el mismo texto en vivo desde los archivos de hoy:
//    · los mismos archivos que tenía la copia congelada: js/app-1.js …
//      js/app-N.js (sin config.js, db.js, realtime.js, index.html ni
//      js/marca-laml.js — las pruebas que necesitan esos archivos los
//      leen directo con fs);
//    · en el MISMO ORDEN en que los carga index.html (se lee de sus
//      <script src="js/app-N.js">, así un archivo nuevo entra solo);
//    · unidos con '\n', igual que la copia congelada.
//
//  Exporta un string, igual que antes: no hay que tocar las pruebas.
// ============================================================
const fs = require('fs');
const path = require('path');

const leer = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8');

// Orden de carga según index.html (ignora el "?v=..." de caché).
const html = leer('index.html');
const archivos = [];
const re = /<script[^>]*\ssrc="(js\/app-\d+\.js)(?:\?[^"]*)?"/g;
let m;
while ((m = re.exec(html))) if (!archivos.includes(m[1])) archivos.push(m[1]);

// Red de seguridad: si index.html cambiara de forma y no se encontrara
// ningún script, mejor fallar fuerte que dejar a 70 pruebas buscando en
// un texto vacío (pasarían las que verifican que algo NO esté).
if (!archivos.length) {
  throw new Error('test-fuente.js: no se encontraron <script src="js/app-N.js"> en index.html');
}
// Y si existe un js/app-N.js que index.html no carga, avisar: o sobra el
// archivo o falta la etiqueta (el navegador no lo ejecutaría).
const enDisco = fs.readdirSync(path.join(__dirname, 'js'))
  .filter((f) => /^app-\d+\.js$/.test(f)).map((f) => 'js/' + f);
const sinCargar = enDisco.filter((f) => !archivos.includes(f));
if (sinCargar.length) {
  throw new Error('test-fuente.js: index.html no carga ' + sinCargar.join(', '));
}

module.exports = archivos.map(leer).join('\n');
