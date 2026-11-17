// ============================================================
//  SEFE · test-fuente.js — EL CÓDIGO ACTUAL, PARA LAS PRUEBAS
// ============================================================
//  Casi todas las test-*.js hacen  require('./test-fuente')  y reciben el
//  texto de todo el código de la app (js/app-1.js … js/app-13.js, en el
//  mismo orden de los <script> de index.html), para sacarle pedazos y
//  probarlos.
//
//  Antes este archivo era una COPIA GUARDADA del código (≈1.1 MB) que se
//  regeneraba a mano; se dejó de regenerar y las pruebas terminaron
//  verificando código viejo (pasaban aunque el actual estuviera roto).
//  Ahora se lee el código de disco cada vez: no hay nada que regenerar.
//
//  Las constantes que iban al inicio de la copia vieja (FEL_BACKEND_URL,
//  GOOGLE_MAPS_KEY, ORS_API_KEY, SEFE_BODEGA, SEFE_REPARTO…) viven hoy al
//  principio de js/app-1.js, así que siguen viniendo incluidas.
// ============================================================
const fs = require('fs'), path = require('path');

// Mismo orden que index.html. Si se agrega un js/app-14.js hay que sumarlo
// acá (y en index.html).
const ARCHIVOS = [];
for (let i = 1; i <= 13; i++) ARCHIVOS.push(path.join(__dirname, 'js', 'app-' + i + '.js'));

let src = '';
for (const f of ARCHIVOS) src += fs.readFileSync(f, 'utf8') + '\n';

module.exports = src;
