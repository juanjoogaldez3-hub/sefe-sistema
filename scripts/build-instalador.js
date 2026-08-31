// ============================================================
//  SEFE · Generador del INSTALADOR de base para un cliente nuevo
// ============================================================
//  Qué hace: junta TODAS las migraciones de supabase/migrations/,
//  en orden, en un solo archivo supabase/INSTALAR-CLIENTE.sql. Así,
//  para montar la base de un cliente nuevo se pega UN solo script en
//  el SQL Editor de su Supabase, en vez de 16 archivos uno por uno.
//
//  Cómo se corre:   node scripts/build-instalador.js
//
//  Importante: NO se edita INSTALAR-CLIENTE.sql a mano. Cada vez que
//  se agrega una migración, se vuelve a correr esto y listo. La
//  prueba test-instalador.js falla si el archivo quedó desactualizado.
// ============================================================

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const DIR_MIG = path.join(RAIZ, 'supabase', 'migrations');
const SALIDA = path.join(RAIZ, 'supabase', 'INSTALAR-CLIENTE.sql');

// Devuelve el contenido del instalador (para reusar en la prueba).
function construirInstalador() {
  const archivos = fs.readdirSync(DIR_MIG)
    .filter(f => f.endsWith('.sql'))
    .sort();  // los nombres empiezan con AAAAMMDDHHMMSS → orden cronológico

  const cab = [
    '-- ============================================================',
    '-- SEFE · INSTALADOR DE BASE PARA UN CLIENTE NUEVO',
    '-- ============================================================',
    '-- ⚠️ ARCHIVO GENERADO — NO EDITAR A MANO.',
    '--    Se arma con: node scripts/build-instalador.js',
    '--    (junta todas las migraciones de supabase/migrations/).',
    '--',
    '-- QUÉ ES: todo lo que necesita la base de un cliente nuevo, en',
    '-- una sola pegada. Tablas, seguridad (RLS capa 1 y 2), índices y',
    '-- secuencias. Reemplaza correr las ' + archivos.length + ' migraciones una por una.',
    '--',
    '-- CÓMO SE USA (una sola vez, en la base NUEVA y VACÍA del cliente):',
    '--   1. Crear el proyecto en Supabase (queda vacío).',
    '--   2. Abrir SQL Editor → New query.',
    '--   3. Pegar TODO este archivo y Run.',
    '--   4. Al final deben verse las tablas creadas, sin errores.',
    '--',
    '-- Es idempotente: si se corre de más, no rompe nada.',
    '-- Incluye ' + archivos.length + ' migraciones, en este orden:',
    ...archivos.map((f, i) => '--   ' + String(i + 1).padStart(2, '0') + '. ' + f),
    '-- ============================================================',
    '',
    ''
  ].join('\n');

  const cuerpo = archivos.map(f => {
    const sql = fs.readFileSync(path.join(DIR_MIG, f), 'utf8').replace(/\s*$/, '');
    return [
      '',
      '-- ╔══════════════════════════════════════════════════════════╗',
      '-- ║  ' + f.padEnd(56) + '║',
      '-- ╚══════════════════════════════════════════════════════════╝',
      '',
      sql,
      ''
    ].join('\n');
  }).join('\n');

  return cab + cuerpo + '\n';
}

module.exports = { construirInstalador, SALIDA, DIR_MIG };

// Si se corre directo (no importado), escribe el archivo.
if (require.main === module) {
  const contenido = construirInstalador();
  fs.writeFileSync(SALIDA, contenido);
  const n = (contenido.match(/^-- ║/gm) || []).length;
  console.log('✓ INSTALAR-CLIENTE.sql generado (' + n + ' migraciones, ' +
    contenido.split('\n').length + ' líneas)');
}
