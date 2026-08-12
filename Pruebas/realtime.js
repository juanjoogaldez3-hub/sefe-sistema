// ============================================================
//  SEFE · realtime.js — SINCRONIZACIÓN EN VIVO
// ============================================================
//  Qué resuelve: antes había que dar F5 para ver lo que hacían
//  los demás. `cargarTodo()` sólo corre al entrar, así que los
//  arrays globales (documentos, clientes, productos…) se quedaban
//  congelados con la foto del momento del login.
//
//  Cómo lo resuelve: se suscribe a los cambios de Postgres por
//  websocket (Supabase Realtime). Cuando llega un cambio:
//      1. parcha el array global que corresponde
//      2. re-renderiza la vista activa, si ese cambio la afecta
//
//  Esto funciona porque cada vista de SEFE es una función pura
//  de "arrays → innerHTML" (renderDocs, renderCobros, …). No hay
//  estado escondido: con el array al día, un re-render basta.
//
//  ── REGLA DE ORO ────────────────────────────────────────────
//  Nunca re-renderizar encima de alguien que está trabajando.
//  Si hay un modal abierto o el cursor está dentro de un campo,
//  los cambios se acumulan y aparece la pastilla de "ver cambios"
//  en lugar de refrescar de golpe. En un sistema contable que los
//  números se muevan solos debajo del cursor es peor que el F5.
//
//  Este archivo es autocontenido: inyecta su propio CSS y su
//  propio HTML. Para integrarlo sólo hace falta:
//      <script src="realtime.js"></script>   (después de db.js)
//      iniciarRealtime()   al entrar
//      detenerRealtime()   al salir
// ============================================================

(function () {
  'use strict';

  // ============================================================
  //  1. QUÉ TABLA AFECTA A QUÉ VISTA
  // ============================================================
  //  `arr`       → devuelve el array global a parchar
  //  `map`       → convierte la fila de la base (snake_case) al
  //                objeto de la app (camelCase). Son los MISMOS
  //                mapeadores de db.js, para que no puedan divergir.
  //  `conservar` → campos que el evento NO trae y hay que rescatar
  //                del objeto local (ej: los abonos viven en otra
  //                tabla, no vienen dentro del documento).
  //  `vistas`    → qué vistas hay que re-renderizar si esto cambia.
  //
  //  Ojo con dos ausencias deliberadas en `vistas`:
  //    · 'reportes'    — un reporte es una foto de un momento; que
  //                      se recalcule solo mientras lo estás leyendo
  //                      es desconcertante. Se refresca al re-entrar.
  //    · 'nuevacompra' — es un formulario a medio llenar.
  // ============================================================
  const TABLAS = {

    // ── Documentos y su dinero ──────────────────────────────
    documentos: {
      arr: () => documentos,
      map: (f) => mapDocumentoFromDB(f, []),
      conservar: ['abonos'],
      vistas: ['documentos', 'cobros', 'panel', 'despachos', 'misentregas', 'clientedet'],
    },
    // Los abonos NO son un array de primer nivel: viven dentro de
    // cada documento. Por eso van con `anidado` en vez de `arr`.
    abonos: {
      anidado: {
        padres: () => documentos,
        fk: 'documento_id',
        lista: 'abonos',
        map: (f) => mapAbonoFromDB(f),
        idLocal: '_id',
      },
      vistas: ['documentos', 'cobros', 'panel', 'clientedet', 'talonarios'],
    },

    // ── Catálogos ───────────────────────────────────────────
    clientes: {
      arr: () => clientes,
      map: mapClienteFromDB,
      vistas: ['clientes', 'clientedet', 'panel', 'cobros', 'pedido'],
    },
    productos: {
      arr: () => productos,
      map: mapProductoFromDB,
      vistas: ['inventario', 'panel', 'pedido'],
    },
    proveedores: {
      arr: () => proveedores,
      map: mapProveedorFromDB,
      vistas: ['proveedores', 'proveedordet', 'compras'],
    },
    categorias: {
      arr: () => categorias,
      map: mapCategoriaFromDB,
      idCampo: 'nombre', // esta tabla se identifica por nombre, no por id
      vistas: ['inventario'],
    },

    // ── Compras y pagos a proveedor ─────────────────────────
    compras: {
      arr: () => compras,
      map: (f) => mapCompraFromDB(f, []),
      conservar: ['abonos'],
      vistas: ['compras', 'porpagar', 'panel', 'proveedordet'],
    },
    pagos_proveedor: {
      anidado: {
        padres: () => compras,
        fk: 'compra_id',
        lista: 'abonos',
        map: (f) => mapPagoProveedorFromDB(f),
        idLocal: '_id',
      },
      vistas: ['compras', 'porpagar', 'panel', 'proveedordet'],
    },

    // ── Cobros en ruta ──────────────────────────────────────
    cobros_ruta: {
      arr: () => cobrosRuta,
      map: mapCobroRutaFromDB,
      vistas: ['cobros', 'panel'],
    },

    // ── Bancos ──────────────────────────────────────────────
    cuentas_banco: {
      arr: () => cuentasBanco,
      map: mapCuentaBancoFromDB,
      vistas: ['bancos'],
    },
    movimientos_banco: {
      arr: () => movimientosBanco,
      map: mapMovimientoBancoFromDB,
      vistas: ['bancos', 'panel'],
    },

    // ── Talonarios de recibos ───────────────────────────────
    talonarios: {
      arr: () => talonarios,
      map: mapTalonarioFromDB,
      vistas: ['talonarios'],
    },
    recibos_anulados: {
      arr: () => recibosAnulados,
      map: mapReciboAnuladoFromDB,
      vistas: ['talonarios'],
    },

    // ── Módulos varios ──────────────────────────────────────
    recordatorios: {
      arr: () => recordatorios,
      map: mapRecordatorioFromDB,
      vistas: ['recordatorios', 'panel'],
    },
    cotizaciones: {
      arr: () => cotizaciones,
      map: mapCotizacionFromDB,
      vistas: ['cotizaciones', 'panel'],
    },
    usuarios: {
      arr: () => usuarios,
      map: mapUsuarioFromDB,
      vistas: ['usuarios'],
    },

    // ── Auditoría ───────────────────────────────────────────
    //  Cada acción del sistema escribe acá, así que es la tabla
    //  más ruidosa. Aun así el costo es bajo: sólo re-renderiza
    //  si alguien tiene la vista de Auditoría abierta.
    auditoria: {
      arr: () => auditLog,
      map: mapAuditoriaFromDB,
      idCampo: 'seq',
      alFrente: true, // auditLog va del más nuevo al más viejo
      vistas: ['auditoria'],
    },
  };

  // Vista → función que la dibuja. Es el mismo mapa que usa go().
  const RENDERS = {
    panel: 'renderPanel',
    pedido: 'render',
    cotizaciones: 'renderCotizaciones',
    documentos: 'renderDocs',
    cobros: 'renderCobros',
    clientes: 'renderCli',
    clientedet: 'renderCliDet',
    recordatorios: 'renderRecordatorios',
    inventario: 'renderProd',
    compras: 'renderCompras',
    porpagar: 'renderPorPagar',
    bancos: 'renderBancos',
    proveedores: 'renderProveedores',
    proveedordet: 'renderProveedorDet',
    talonarios: 'renderTalonarios',
    usuarios: 'renderUsuarios',
    auditoria: 'renderAuditoria',
    despachos: 'renderDespachos',
    misentregas: 'renderMisEntregas',
  };

  // ============================================================
  //  2. ESTADO INTERNO
  // ============================================================
  let canal = null;              // el canal de Supabase Realtime
  let activo = false;            // ¿está corriendo la sincronización?
  let estadoConexion = 'off';    // off | conectando | vivo | caido
  let huboCaida = false;         // ¿se perdió la conexión en algún momento?
  let resincronizando = false;   // candado para no resincronizar dos veces
  let vistasPendientes = new Set();
  let cambiosPendientes = 0;
  let temporizador = null;
  let reintento = null;
  let intentos = 0;
  let vigilante = null;
  let vigilanteAuth = null;      // escucha la renovación del token (RLS)

  // ============================================================
  //  3. HELPERS
  // ============================================================

  // ¿Qué vista está abierta ahora? (#v-documentos → 'documentos')
  function vistaActiva() {
    const el = document.querySelector('.view.active');
    return el ? el.id.replace(/^v-/, '') : null;
  }

  // ¿Podemos re-renderizar sin arruinarle el trabajo a alguien?
  // Devuelve el motivo del bloqueo, o null si hay vía libre.
  function motivoBloqueo() {
    // 1. Pestaña en segundo plano: no gastamos render, acumulamos.
    if (document.hidden) return 'oculta';
    // 2. Modal abierto (los dos tipos que usa SEFE).
    if (document.querySelector('.overlay.show, .doc-overlay.show')) return 'modal';
    // 3. Cursor dentro de un campo: nadie escribe y ve cómo se le borra.
    const el = document.activeElement;
    if (el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) && el.type !== 'hidden' && !el.readOnly) {
      return 'foco';
    }
    return null;
  }

  // Compara sólo las llaves que produce el mapeador. Sirve para
  // detectar el ECO: cuando vos guardás algo, Postgres te devuelve
  // tu propio cambio por el websocket. Si lo que llega es idéntico
  // a lo que ya tenemos, no hay nada que redibujar.
  function esIgual(local, nuevo) {
    if (!local) return false;
    for (const k in nuevo) {
      if (JSON.stringify(local[k]) !== JSON.stringify(nuevo[k])) return false;
    }
    return true;
  }

  // ============================================================
  //  4. APLICAR UN CAMBIO AL ESTADO LOCAL
  // ============================================================
  //  Devuelven true sólo si el estado realmente cambió, para no
  //  redibujar de gusto.

  // Tablas normales (un array de primer nivel).
  function aplicarPlano(cfg, evento) {
    const arr = cfg.arr();
    if (!Array.isArray(arr)) return false; // la app aún no arrancó
    const idCampo = cfg.idCampo || 'id';

    if (evento.eventType === 'DELETE') {
      // OJO: en un DELETE, Postgres sólo manda la llave primaria.
      const id = evento.old ? evento.old[idCampo] : null;
      if (id == null) return false;
      const i = arr.findIndex((x) => x[idCampo] === id);
      if (i < 0) return false;
      arr.splice(i, 1);
      return true;
    }

    const fila = evento.new;
    if (!fila || fila[idCampo] == null) return false;
    const obj = cfg.map(fila);
    const i = arr.findIndex((x) => x[idCampo] === fila[idCampo]);

    if (i < 0) {
      // Fila nueva. `alFrente` es para auditLog, que va al revés.
      if (cfg.alFrente) arr.unshift(obj);
      else arr.push(obj);
      return true;
    }

    // Rescatar lo que el evento no trae (ej: los abonos del documento).
    (cfg.conservar || []).forEach((k) => { obj[k] = arr[i][k]; });
    if (esIgual(arr[i], obj)) return false; // eco de un cambio propio
    arr.splice(i, 1, obj);
    return true;
  }

  // Tablas hijas (abonos dentro de documentos, pagos dentro de compras).
  function aplicarAnidado(cfg, evento) {
    const padres = cfg.padres();
    if (!Array.isArray(padres)) return false;
    const fila = evento.eventType === 'DELETE' ? evento.old : evento.new;
    if (!fila || fila.id == null) return false;

    // Buscar el padre por la llave foránea…
    let padre = fila[cfg.fk] != null ? padres.find((p) => p.id === fila[cfg.fk]) : null;
    // …y si el DELETE no la trajo (Postgres manda sólo la PK),
    // buscar al padre que tenga a este hijo en su lista.
    if (!padre) {
      padre = padres.find((p) => (p[cfg.lista] || []).some((x) => x[cfg.idLocal] === fila.id));
    }
    if (!padre) return false;

    if (!Array.isArray(padre[cfg.lista])) padre[cfg.lista] = [];
    const lista = padre[cfg.lista];
    const i = lista.findIndex((x) => x[cfg.idLocal] === fila.id);

    if (evento.eventType === 'DELETE') {
      if (i < 0) return false;
      lista.splice(i, 1);
      return true;
    }
    const obj = cfg.map(fila);
    if (i < 0) { lista.push(obj); return true; }
    if (esIgual(lista[i], obj)) return false;
    lista.splice(i, 1, obj);
    return true;
  }

  // Punto de entrada de todo evento que llega por el websocket.
  function alCambio(tabla, evento) {
    const cfg = TABLAS[tabla];
    if (!cfg) return;
    let cambio = false;
    try {
      cambio = cfg.anidado ? aplicarAnidado(cfg.anidado, evento) : aplicarPlano(cfg, evento);
    } catch (e) {
      console.error('[realtime] error aplicando cambio de ' + tabla, e);
      return;
    }
    if (!cambio) return;
    cfg.vistas.forEach((v) => vistasPendientes.add(v));
    cambiosPendientes++;
    programarRefresco();
  }

  // ============================================================
  //  5. REFRESCO DE PANTALLA
  // ============================================================

  // Agrupamos los cambios que llegan juntos (guardar un documento
  // dispara varios eventos) y redibujamos una sola vez.
  function programarRefresco() {
    clearTimeout(temporizador);
    temporizador = setTimeout(intentarRefrescar, 400);
  }

  function intentarRefrescar() {
    if (!cambiosPendientes) return;
    if (motivoBloqueo()) { mostrarPastilla(); return; } // esperamos a que se libere
    refrescarYa();
  }

  function refrescarYa() {
    const v = vistaActiva();
    if (v && vistasPendientes.has(v)) {
      const fn = RENDERS[v];
      if (fn && typeof window[fn] === 'function') {
        try { window[fn](); }
        catch (e) { console.error('[realtime] falló ' + fn + '()', e); }
      }
    }
    vistasPendientes.clear();
    cambiosPendientes = 0;
    ocultarPastilla();
  }

  // ============================================================
  //  6. INTERFAZ — pastilla de cambios + indicador de conexión
  // ============================================================

  function montarUI() {
    if (document.getElementById('rt-estilos')) return;

    const css = document.createElement('style');
    css.id = 'rt-estilos';
    css.textContent = `
      .rt-pastilla{position:fixed;top:78px;left:50%;transform:translateX(-50%) translateY(-14px);
        display:none;align-items:center;gap:9px;background:var(--green);color:#fff;
        padding:9px 15px;border-radius:22px;box-shadow:var(--shadow-lg);font-size:12.5px;
        font-weight:600;cursor:pointer;z-index:150;opacity:0;
        transition:opacity .25s,transform .25s cubic-bezier(.2,.85,.3,1)}
      .rt-pastilla.show{display:flex;opacity:1;transform:translateX(-50%) translateY(0)}
      .rt-pastilla:hover{background:var(--green-700)}
      .rt-pastilla svg{width:14px;height:14px;stroke:currentColor;stroke-width:2.2;fill:none}
      .rt-pastilla .rt-n{background:var(--lime);color:var(--green);border-radius:11px;
        padding:1px 7px;font-size:11px;font-weight:700}
      .rt-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;
        background:var(--muted-2);transition:background .3s}
      .rt-dot.vivo{background:var(--ok)}
      .rt-dot.conectando{background:var(--warn);animation:rt-late 1.4s infinite}
      .rt-dot.caido{background:var(--danger)}
      @keyframes rt-late{0%,100%{opacity:1}50%{opacity:.25}}
      .rt-conn{display:inline-flex;align-items:center;gap:6px;font-size:11px;
        font-weight:600;color:var(--muted)}
      /* En pantalla chica se esconde sólo el TEXTO ("En vivo"), nunca el
         puntito. Antes acá decía '.rt-conn span', que agarraba los dos
         y dejaba al celular sin ningún indicador de conexión. */
      @media(max-width:600px){.rt-conn #rt-conn-txt{display:none}.rt-pastilla{top:64px}}
    `;
    document.head.appendChild(css);

    // Pastilla "hay cambios nuevos"
    const p = document.createElement('button');
    p.className = 'rt-pastilla';
    p.id = 'rt-pastilla';
    p.onclick = refrescarYa;
    document.body.appendChild(p);

    // Puntito de conexión, junto al badge de rol en la barra de arriba
    const badge = document.getElementById('role-badge');
    if (badge && badge.parentNode && !document.getElementById('rt-conn')) {
      const c = document.createElement('div');
      c.className = 'rt-conn';
      c.id = 'rt-conn';
      c.innerHTML = '<span class="rt-dot" id="rt-dot"></span><span id="rt-conn-txt"></span>';
      badge.parentNode.insertBefore(c, badge);
    }
  }

  function mostrarPastilla() {
    const p = document.getElementById('rt-pastilla');
    if (!p || !cambiosPendientes) return;
    const n = cambiosPendientes;
    p.innerHTML =
      '<svg viewBox="0 0 24 24"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>' +
      '<path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>' +
      '<span>' + (n === 1 ? 'Hay un cambio nuevo' : 'Hay cambios nuevos') + '</span>' +
      '<span class="rt-n">' + (n > 99 ? '99+' : n) + '</span>';
    p.classList.add('show');
  }

  function ocultarPastilla() {
    const p = document.getElementById('rt-pastilla');
    if (p) p.classList.remove('show');
  }

  function pintarConexion(estado) {
    estadoConexion = estado;
    const dot = document.getElementById('rt-dot');
    const txt = document.getElementById('rt-conn-txt');
    if (!dot) return;
    dot.className = 'rt-dot ' + (estado === 'off' ? '' : estado);
    const etiquetas = { vivo: 'En vivo', conectando: 'Conectando…', caido: 'Sin conexión', off: '' };
    if (txt) txt.textContent = etiquetas[estado] || '';
  }

  // ============================================================
  //  7. RESINCRONIZACIÓN
  // ============================================================
  //  Si el websocket se cae (wifi, laptop dormida, túnel), los
  //  eventos de ese hueco se pierden PARA SIEMPRE — no hay forma
  //  de pedirlos después. Así que al volver, recargamos todo.
  //  Con los volúmenes actuales sale más barato que llevar un
  //  registro de "qué me perdí".
  async function resincronizar(motivo) {
    if (resincronizando || typeof cargarTodo !== 'function') return;
    resincronizando = true;
    console.log('[realtime] resincronizando (' + motivo + ')');
    try {
      const ok = await cargarTodo();
      if (ok) {
        recalcularCorrelativos();
        const v = vistaActiva();
        const fn = v && RENDERS[v];
        if (fn && typeof window[fn] === 'function') {
          try { window[fn](); } catch (e) { console.error('[realtime] render tras resync', e); }
        }
        vistasPendientes.clear();
        cambiosPendientes = 0;
        ocultarPastilla();
      }
    } catch (e) {
      console.error('[realtime] falló la resincronización', e);
    } finally {
      resincronizando = false;
    }
  }

  // Los contadores de correlativos se calculan en el cliente con
  // max(id)+1, así que después de recargar hay que recalcularlos.
  //
  // NOTA: esto es un parche, no la solución. Calcular correlativos
  // en el navegador significa que dos personas creando un pedido a
  // la vez pueden sacar el MISMO número. La solución de verdad es
  // una secuencia de Postgres. Queda pendiente.
  function recalcularCorrelativos() {
    const max = (a, campo) => (Array.isArray(a) ? a.reduce((m, x) => Math.max(m, x[campo] || 0), 0) : 0) + 1;
    try { cliN = max(clientes, 'id'); } catch (e) {}
    try { prodN = max(productos, 'id'); } catch (e) {}
    try { corr = max(documentos, 'numero'); } catch (e) {}
    try { cotN = max(cotizaciones, 'numero'); } catch (e) {}
    try { compN = max(compras, 'id'); } catch (e) {}
    try { usrN = max(usuarios, 'id'); } catch (e) {}
    try { pilN = max(pilotos, 'id'); } catch (e) {}
    try { vendN = max(vendedores, 'id'); } catch (e) {}
    try { cobroRutaN = max(cobrosRuta, 'id'); } catch (e) {}
    try { provN = max(proveedores, 'id'); } catch (e) {}
  }

  // ============================================================
  //  8. CONEXIÓN
  // ============================================================

  function conectar() {
    if (typeof sb === 'undefined' || !sb.channel) {
      console.warn('[realtime] Supabase no está disponible');
      return;
    }
    desconectarCanal();
    pintarConexion('conectando');

    // Un solo canal con todas las suscripciones: más liviano que
    // abrir un canal por tabla.
    canal = sb.channel('sefe-live');
    Object.keys(TABLAS).forEach((tabla) => {
      canal.on('postgres_changes', { event: '*', schema: 'public', table: tabla },
        (payload) => alCambio(tabla, payload));
    });

    canal.subscribe((estado) => {
      if (estado === 'SUBSCRIBED') {
        intentos = 0;
        pintarConexion('vivo');
        // Si veníamos de una caída, perdimos eventos: recargar.
        if (huboCaida) { huboCaida = false; resincronizar('reconexión'); }
      } else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT' || estado === 'CLOSED') {
        if (!activo) return;
        huboCaida = true;
        pintarConexion('caido');
        reconectarConEspera();
      }
    });
  }

  // Reintento con espera creciente: 2s, 4s, 8s… hasta 30s.
  function reconectarConEspera() {
    if (!activo || reintento) return;
    const espera = Math.min(2000 * Math.pow(2, intentos), 30000);
    intentos++;
    reintento = setTimeout(() => { reintento = null; if (activo) conectar(); }, espera);
  }

  function desconectarCanal() {
    if (canal) {
      try { sb.removeChannel(canal); } catch (e) {}
      canal = null;
    }
  }

  // ============================================================
  //  9. ARRANQUE Y PARADA
  // ============================================================

  // Con RLS activo, el websocket manda el token de la sesión para
  // saber qué filas te puede entregar. Ese token vence cada tanto y
  // se renueva solo — pero si no le avisamos a Realtime, se queda con
  // el viejo y DEJA DE RECIBIR EN SILENCIO, que es el peor modo de
  // fallar: todo se ve bien y los datos están viejos.
  function seguirElToken() {
    if (typeof sb === 'undefined' || !sb.auth || !sb.auth.onAuthStateChange) return;
    try {
      const { data } = sb.auth.onAuthStateChange((evento, sesion) => {
        if (!activo) return;
        if (evento === 'TOKEN_REFRESHED' || evento === 'SIGNED_IN') {
          try { sb.realtime.setAuth(sesion && sesion.access_token); } catch (e) {}
        }
      });
      vigilanteAuth = data && data.subscription ? data.subscription : null;
    } catch (e) { /* si la versión de supabase-js no lo soporta, ella sola se encarga */ }
  }

  function iniciarRealtime() {
    if (activo) return;
    activo = true;
    montarUI();
    seguirElToken();
    conectar();

    // Reintenta el refresco pendiente cuando se libera el bloqueo
    // (se cerró el modal, se salió del campo). Barato y sin sorpresas.
    clearInterval(vigilante);
    vigilante = setInterval(() => {
      if (cambiosPendientes && !motivoBloqueo()) refrescarYa();
    }, 1200);

    window.addEventListener('online', alVolverInternet);
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    console.log('[realtime] sincronización en vivo activada');
  }

  function detenerRealtime() {
    activo = false;
    desconectarCanal();
    if (vigilanteAuth) { try { vigilanteAuth.unsubscribe(); } catch (e) {} vigilanteAuth = null; }
    clearInterval(vigilante);
    clearTimeout(temporizador);
    clearTimeout(reintento);
    reintento = null;
    vistasPendientes.clear();
    cambiosPendientes = 0;
    ocultarPastilla();
    pintarConexion('off');
    window.removeEventListener('online', alVolverInternet);
    document.removeEventListener('visibilitychange', alCambiarVisibilidad);
  }

  function alVolverInternet() {
    if (!activo) return;
    huboCaida = true;
    intentos = 0;
    conectar();
  }

  // Al volver a la pestaña: si el canal no está vivo, reconectar.
  // Si sí lo está pero se acumularon cambios, mostrarlos.
  function alCambiarVisibilidad() {
    if (!activo || document.hidden) return;
    if (estadoConexion !== 'vivo') { intentos = 0; conectar(); }
    else if (cambiosPendientes && !motivoBloqueo()) refrescarYa();
  }

  // ============================================================
  //  10. API PÚBLICA
  // ============================================================
  window.iniciarRealtime = iniciarRealtime;
  window.detenerRealtime = detenerRealtime;
  window.resincronizarRealtime = resincronizar;
  // Para diagnosticar desde la consola del navegador:
  window._realtime = {
    estado: () => ({ activo, conexion: estadoConexion, pendientes: cambiosPendientes,
                     vistas: [...vistasPendientes], bloqueo: motivoBloqueo() }),
    tablas: () => Object.keys(TABLAS),
  };
})();
