// ============================================================
// SEFE — Service Worker (PWA)
// ============================================================
// Sólo existe para que la app sea INSTALABLE (ícono propio, pantalla
// completa). A propósito NO cachea nada: cada pedido va a la red, así
// la app nunca sirve código viejo (se actualiza sola al publicar, igual
// que siempre). El modo offline real se puede agregar más adelante.
// ============================================================

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Passthrough: hay un handler de fetch (requisito para poder instalar),
// pero no interceptamos nada — dejamos que la red responda normal.
self.addEventListener('fetch', () => { /* red directa */ });
