// ============================================================
// SEFE — Configuración (config.js)
// ============================================================
// ESTE ARCHIVO ES DISTINTO EN CADA ENTORNO:
//   · éste (la raíz)  → base de PRODUCCIÓN
//   · Pruebas/config.js → base de PRUEBAS
// Por eso es también el lugar donde se decide qué funciones están
// encendidas en cada uno.
// ============================================================

const SEFE_CONFIG = {
  url: "https://krbyulpmfazntjwnpxnw.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyYnl1bHBtZmF6bnRqd25weG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMzY1MjQsImV4cCI6MjA5NzcxMjUyNH0.72uJxSRXGl8JviVtmhylYW7_Cr-zW767jEOYD4JOYFI",

  // Nombre del entorno (sale en la consola del navegador al arrancar)
  entorno: "produccion",

  // ── Funciones que se están probando ─────────────────────────
  // Sirven para publicar código sin encenderlo en producción.
  // El código viaja igual —es la misma rama para los dos— pero acá
  // se decide si se ve o no.
  funciones: {
    // Bandeja de WhatsApp dentro del sistema.
    // En producción va APAGADA hasta que esté probada: sin esto no
    // aparece el menú, no se consulta ninguna tabla y no se abre
    // ninguna conexión.
    whatsapp: false
  }
};
