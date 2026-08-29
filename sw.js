// ============================================================
// SEFE — Service Worker (PWA)
// ============================================================
// Existe para que la app sea INSTALABLE (ícono propio, pantalla
// completa) y, sobre todo, para que NUNCA sirva código viejo.
//
// Estrategia: "network-first sin caché" para nuestros propios archivos
// (HTML/JS/CSS del mismo dominio). Cada carga los pide a la red con
// cache:'no-store', así el navegador no puede quedarse con la versión
// vieja que guardó GitHub Pages (Cache-Control: max-age=600). Al
// publicar, el cambio se ve de una, sin refresco fuerte.
//
// Nota: no hay modo offline (a propósito). Todo lo externo (Supabase,
// CDNs) es de otro dominio y no se toca.
// ============================================================

const SW_VERSION = 'sefe-2026-08-29-1'; // bump para forzar re-activación

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  const mismoDominio = url.origin === self.location.origin;
  const esAppFile = mismoDominio && req.method === 'GET' &&
                    /\.(?:js|css|html)$/i.test(url.pathname);
  const esNavegacion = req.mode === 'navigate';
  if (esAppFile || esNavegacion) {
    // Siempre desde la red, saltando el caché HTTP del navegador.
    e.respondWith(
      fetch(req, { cache: 'no-store' }).catch(() => fetch(req))
    );
  }
  // Todo lo demás: passthrough (no interceptamos).
});
