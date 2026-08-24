// ============================================================
//  SEFE · test-fuente.js — fuente del app para las pruebas
// ============================================================
//  Antes el código del app vivía dentro de index.html (un <script>
//  gigante). Ahora está partido en módulos js/app-1.js, js/app-2.js, …
//  que el navegador carga en orden. Las pruebas siguen buscando
//  funciones por su nombre; para no cambiar cada prueba, este archivo
//  arma el fuente completo concatenando los módulos EN ORDEN, igual a
//  como corren en el navegador.
// ============================================================
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, 'js');
const src = fs.readdirSync(dir)
  .filter(f => /^app-\d+\.js$/.test(f))
  .sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10))
  .map(f => fs.readFileSync(path.join(dir, f), 'utf8'))
  .join('\n');
module.exports = src;
