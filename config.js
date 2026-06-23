// ============================================================
// SEFE — Configuración (config.js)
// ============================================================
// ESTE ES EL ÚNICO ARCHIVO DONDE PONÉS TUS CREDENCIALES.
// Lo editás UNA SOLA VEZ. No lo vuelvas a tocar después.
//
// Cuando te pase un db.js nuevo en el futuro, NO toca este archivo,
// así que tus credenciales quedan guardadas para siempre acá.
//
// Dónde conseguir los valores:
//   Supabase → tu proyecto → Settings (engranaje) → API
//     • "Project URL"  → va en url    (SIN /rest/v1/ y SIN barra al final)
//     • "anon public"  → va en key
// ============================================================

const SEFE_CONFIG = {
  url: "https://krbyulpmfazntjwnpxnw.supabase.co",   // ← TU Project URL
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyYnl1bHBtZmF6bnRqd25weG53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMzY1MjQsImV4cCI6MjA5NzcxMjUyNH0.72uJxSRXGl8JviVtmhylYW7_Cr-zW767jEOYD4JOYFI"                            // ← TU anon public key
};
