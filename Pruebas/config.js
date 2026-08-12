// ============================================================
//  config.js — CREDENCIALES DE LA BASE DE PRUEBAS
//  Proyecto Supabase: sefe-pruebas
// ============================================================
//  ⚠️ Este archivo es SOLO para la carpeta /Pruebas/
//     Apunta a la base de datos de PRUEBAS, no a la real.
//
//  Es también donde se encienden las funciones que se están
//  probando, para que existan acá y no en producción.
// ============================================================

const SEFE_CONFIG = {
  // URL base del proyecto (SIN /rest/v1/ al final)
  url: 'https://imvoyzxdvtoktckazzsv.supabase.co',

  // anon public key del proyecto sefe-pruebas
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltdm95enhkdnRva3Rja2F6enN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MjAwMjYsImV4cCI6MjA5ODA5NjAyNn0.grVM8a132r_UmRDs-6DYc9oPN1nKz_mtHa9LKGdAq4Y',

  // Nombre del entorno (sale en la consola del navegador al arrancar)
  entorno: 'pruebas',

  // ── Funciones que se están probando ─────────────────────────
  funciones: {
    // Bandeja de WhatsApp: encendida SÓLO acá.
    // Las tablas de conversaciones y mensajes existen únicamente en
    // esta base, así que producción no puede verlas aunque quisiera.
    whatsapp: true
  }
};
