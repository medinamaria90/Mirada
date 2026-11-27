// Arranque: catálogo, estado, audio y enrutado. Solo lo imprescindible va en la cadena estática
// (precargada con <link rel="modulepreload"> en index.html); la primera pantalla (bienvenida o
// inicio) se pide en paralelo con el catálogo y el resto (rondas, colección, perfil, salas, textos
// largos del catálogo y audio) después de pintar.

import { buildIndex, mergeCatalogText } from './engine/catalog.js';
import { dayKey, madridDayKey } from './engine/dates.js';
import { createStore, safeStorage, STORAGE_KEY } from './state/store.js';
import { reconcileRoster, markRosterSeen } from './engine/roster.js';
import { parseRoute, go, ROUTES } from './ui/router.js';
import { audio, loadAudioWhenIdle, applyAudioSettings, bindBackgroundPause } from './ui/audio-bridge.js';
import { installArtListeners } from './ui/art.js';
import { esc, onAction, focusHeading, clearAnnounce } from './ui/dom.js';
import { toast, replayToast, routeChanged } from './ui/toast.js';
import { readSession } from './state/session.js';
import { applyTheme } from './ui/theme.js';
import { shouldAutoReload } from './ui/load-recovery.js';

const root = document.getElementById('app');
// Mudanza de dirección: fragmento con el progreso y dirección antigua, iguales que MOVE_PREFIX y OLD_HOST de
// state/mudanza.js (módulo diferido, solo se pide si hace falta; lo comprueba tests/mudanza.test.js).
const MOVE_HASH = '#mudanza=';
const OLD_HOSTNAME = 'sfumato-arte.onrender.com';
const MOVE_TOAST = 'Tu progreso ya está aquí';
// Vuelta del acceso con Google (cloud/cloud.js): Supabase añade «?code=…» o, si no se completa, «?error=…».
const SIGN_IN_RETURN = /[?&](code|error)=/;
const SIGN_IN_FAILED = 'No se ha podido entrar';
// Módulos del inicio fuera de la cadena estática: al abrir en el inicio se precargan a la vez (sin cascada de
// importaciones). La lista la da tools/home-graph.mjs y tests/arranque-mapa.test.js comprueba que coincide.
const HOME_MODULES = [
  'engine/branches.js', 'engine/daylight.js', 'engine/goals.js', 'engine/level-ring.js', 'engine/levels.js', 'engine/questions.js', 'engine/review.js', 'state/game-clock.js', 'ui/deep-badges.js',
  'ui/icons.js', 'ui/map-actor.js', 'ui/map-critters.js', 'ui/map-land.js', 'ui/map-life.js', 'ui/map-scene.js', 'ui/map-sky.js', 'ui/map-zoom.js', 'ui/screens/home.js', 'ui/screens/map-memory.js',
  'ui/screens/map-return.js',
  'ui/screens/map-scroll.js', 'ui/screens/path-actions.js', 'ui/screens/path-art.js', 'ui/screens/path-curve.js', 'ui/screens/path-layout.js', 'ui/screens/path-map.js', 'ui/screens/path-nodes.js',
  'ui/screens/path-signs.js', 'ui/shell.js',
];
function preloadModules(list) {
  for (const path of list) {
    const link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = `js/${path}`;
    document.head.appendChild(link);
  }
}
const loadWelcome = () => import('./ui/screens/welcome.js');
const loadStoryLink = () => import('./ui/story-link.js');
const loadHome = () => import('./ui/screens/home.js');
const loadFlows = () => import('./ui/screens/flows.js');
const loadCollection = () => import('./ui/screens/collection.js');
const loadProfile = () => import('./ui/screens/profile.js');
const loadGallery = () => import('./ui/screens/gallery.js');
const loadBranch = () => import('./ui/screens/branch.js');
const loadArtistPage = () => import('./ui/screens/artist-page.js');
const loadArtistWorks = () => import('./ui/screens/artist-works.js');
const loadCredits = () => import('./ui/screens/credits.js');
const loadAbout = () => import('./ui/screens/about.js');

async function loadJson(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function loadCatalog() {
  const data = await loadJson('data/catalog.json');
  if (!Array.isArray(data.movements) || !Array.isArray(data.artists) || !Array.isArray(data.artworks)) {
    throw new Error('Catálogo con formato inesperado');
  }
  return data;
}

function showError(message, title = 'No se ha podido abrir la colección') {
  root.innerHTML = `<div class="screen"><div class="welcome"><main class="welcome-body" id="main">
    <h1 class="welcome-title welcome-title-sm">${esc(title)}</h1>
    <p class="welcome-line">${esc(message)}</p>
    <button class="btn btn-primary btn-wide" data-action="retry">Reintentar</button>
  </main></div></div>`;
  onAction(root.firstElementChild, { retry: () => location.reload() });
  focusHeading(root);
}

// Después de que la primera pantalla haya cargado sus imágenes (evento load) y en reposo.
function whenIdle(fn) {
  const idle = () => {
    if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 2000 });
    else setTimeout(fn, 300);
  };
  if (document.readyState === 'complete') setTimeout(idle, 400);
  else window.addEventListener('load', () => setTimeout(idle, 400), { once: true });
}

// Pantallas con un único botón principal ([data-primary]): Enter o Espacio lo pulsan aunque el foco
// esté en el título (que se enfoca al entrar para que el lector de pantalla lo anuncie).
function installPrimaryKeys() {
  const INTERACTIVE = 'button, a[href], input, select, textarea, summary, [contenteditable], [role="button"], [role="switch"], [role="slider"], [tabindex]:not([tabindex="-1"])';
  document.addEventListener('keydown', (ev) => {
    if (ev.defaultPrevented || ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.repeat) return;
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    const active = document.activeElement;
    // Solo cuenta el propio elemento: un título dentro de un contenedor enfocable (el carrusel de la época) no es un botón.
    if (active && active !== document.body && active.matches(INTERACTIVE)) return;
    if (document.querySelector('.sheet:not([hidden]), .feedback.is-open, .viewer')) return;
    const primary = [...root.querySelectorAll('[data-primary]')].filter((b) => !b.disabled && b.getClientRects().length);
    if (primary.length !== 1) return;
    ev.preventDefault();
    primary[0].click();
  });
}

// Cualquier cuadro con data-zoom se abre en el visor a pantalla completa (módulo diferido: no
// cuenta en el arranque).
// «Ver más» del visor (Colección, ficha del pintor) abre la página de la obra.
function installZoom(getIndex, getCtx) {
  const more = (id, opener) => import('./ui/artwork-sheet.js')
    .then((m) => m.openArtworkSheet(getCtx(), id, { opener })).catch((err) => console.error(err));
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-zoom]');
    const index = getIndex();
    if (!el || !index) return;
    ev.preventDefault();
    import('./ui/viewer.js')
      .then((m) => m.zoomFromElement(index, el, { more }))
      .catch((err) => console.error(err));
  });
}

// Cualquier nombre de pintor con data-artist="<id>" abre su ficha: pantalla (#pintor-<id>) o, dentro de una ronda, diálogo.
function installArtistLinks(getCtx) {
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-artist]');
    const ctx = getCtx();
    if (!el || !ctx) return;
    ev.preventDefault();
    // En una pantalla con navegación inferior (.page) la ficha es una pantalla; en una ronda, un diálogo.
    if (el.closest('.page')) return ctx.go(`pintor-${el.dataset.artist}${el.dataset.focus === 'stages' ? '-etapas' : ''}`);
    import('./ui/artist-sheet.js')
      .then((m) => m.openArtistSheet(ctx, el.dataset.artist, { opener: el }))
      .catch((err) => console.error(err));
  });
}

// Sin zoom de página: Safari en iOS ignora user-scalable=no, así que se frenan también sus gestos
// de pellizco y cualquier movimiento con dos dedos (el desplazamiento con uno sigue igual).
function blockPageZoom() {
  // Solo Safari (WebKit) tiene eventos gesture*: en el resto bastan el viewport y touch-action, y
  // así no se añade un touchmove no pasivo que frene el desplazamiento.
  if (!('ongesturestart' in window)) return;
  const stop = (ev) => { if (ev.cancelable) ev.preventDefault(); };
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(type, stop, { passive: false });
  document.addEventListener('touchmove', (ev) => { if (ev.touches && ev.touches.length > 1) stop(ev); }, { passive: false });
}

async function boot() {
  blockPageZoom();
  installArtListeners(document);
  const storage = safeStorage(() => window.localStorage);
  // Progreso que llega de la dirección antigua (ver state/import-state.js); el fragmento se limpia.
  // Módulo diferido: solo se pide cuando llega progreso (no cuenta en el arranque normal).
  if ((location.hash || '').startsWith('#importar=')) {
    const { importFromHash } = await import('./state/import-state.js');
    importFromHash(storage, STORAGE_KEY, location.hash);
    history.replaceState(null, '', `${location.pathname}${location.search}#inicio`);
  }
  // Progreso que llega de la dirección de antes al mudarse (ver state/mudanza.js); el fragmento se limpia.
  // Vuelve al fragmento con el que se llegó a la dirección antigua (p. ej. un enlace compartido).
  let moved = 'nada';
  if ((location.hash || '').startsWith(MOVE_HASH)) {
    const { receiveMove } = await import('./state/mudanza.js');
    const got = await receiveMove(storage, STORAGE_KEY, location.hash).catch(() => ({ result: 'nada', route: '' }));
    moved = got.result;
    history.replaceState(null, '', `${location.pathname}${location.search}${got.route || '#inicio'}`);
  }
  // En la dirección antigua: si la nueva ya responde, se pasa sola a ella con lo guardado (el módulo comprueba la
  // dirección; en la nueva, en local y en las pruebas no hace nada).
  if (location.hostname === OLD_HOSTNAME) {
    import('./ui/move-redirect.js').then((m) => m.moveToNewHome({ storage, stateKey: STORAGE_KEY })).catch(() => {});
  }
  // Vuelta de Google: se junta el progreso de la nube con el de aquí antes de crear el almacén; se vuelve al perfil.
  let signedIn = '';
  if (SIGN_IN_RETURN.test(location.search)) {
    signedIn = await import('./cloud/cloud.js').then((m) => m.finishSignIn(storage, STORAGE_KEY)).catch(() => 'error');
    if (signedIn) history.replaceState(null, '', `${location.pathname}#perfil`);
  }
  const store = createStore({ storage });
  document.documentElement.classList.toggle('reduce-motion', Boolean(store.get().settings.reducedMotion));
  applyTheme(store.get().settings.theme);
  // La primera pantalla se pide ya, a la vez que el catálogo.
  const atHome = /^#?(inicio)?$/.test(location.hash || '');
  if (!store.get().onboarded) loadWelcome().catch(() => {});
  else if (atHome) {
    preloadModules(HOME_MODULES);
    loadHome().catch(() => {});
  }

  let catalog;
  try {
    catalog = await loadCatalog();
  } catch (err) {
    console.warn('Catálogo no disponible:', err);
    showError('Comprueba la conexión y vuelve a intentarlo.');
    return;
  }
  applyAudioSettings(store.get().settings);

  const index = buildIndex(catalog);
  // Pintores que trae una actualización: paradas extra o con «Nuevo» (engine/roster.js).
  const withRoster = (s) => { const progress = reconcileRoster(s.progress, index); return progress === s.progress ? s : { ...s, progress }; };
  store.update(withRoster);
  installZoom(() => index, () => ctx);
  installArtistLinks(() => ctx);
  // Textos de las pistas por obra (`look`) y rasgos: se piden tras pintar; sin ellos todo funciona.
  let textPromise = null;
  const ensureText = () => {
    textPromise = textPromise || loadJson('data/catalog-text.json')
      .then((text) => { mergeCatalogText(index, text); })
      .catch((err) => { console.info('Textos del catálogo no disponibles:', err.message); textPromise = null; });
    return textPromise;
  };

  let cleanup = null;
  // Ruta de la pantalla anterior (p. ej. para que «Volver» de una sala lleve a Colección).
  let prevRoute = '';
  let currentRouteName = '';
  const ctx = {
    prevRoute: () => prevRoute,
    index,
    store,
    audio,
    today: () => dayKey(new Date()),
    // El reto diario va por el día de Madrid para que sea el mismo para todos.
    dailyDay: () => madridDayKey(new Date()),
    go,
    toast,
    ensureText,
    ensureFicha: () => import('./ui/ficha-data.js').then((m) => m.ensureFicha(index)),
    setCleanup: (fn) => {
      cleanup = typeof fn === 'function' ? fn : null;
    },
  };

  // Desbloqueo del audio en la primera interacción (las políticas del navegador lo exigen).
  const unlockOnce = () => {
    audio.unlock();
    if (store.get().settings.music) audio.startMusic();
    window.removeEventListener('pointerup', unlockOnce, true);
    window.removeEventListener('keydown', unlockOnce, true);
  };
  window.addEventListener('pointerup', unlockOnce, true);
  window.addEventListener('keydown', unlockOnce, true);

  const FLOW_ROUTES = new Set(['stage', 'deep', 'sala', 'review', 'srs', 'quick', 'review5', 'daily', 'weekly', 'challenge', 'free']);
  let firstRender = true;
  let renderToken = 0;

  // Atrás devuelve a la pantalla anterior donde estaba (con su desplazamiento). Cada entrada del historial lleva
  // un número en history.state: si al llegar a una ruta su número es menor que el de la anterior, se ha vuelto atrás.
  const scrollByRoute = new Map();
  let lastIdx = -1;
  let maxIdx = -1;
  let restoreY = null;
  function navigationKind() {
    const st = history.state || {};
    if (!Number.isInteger(st.idx)) {
      maxIdx += 1;
      try { history.replaceState({ ...st, idx: maxIdx }, ''); } catch { /* sin historial */ }
      lastIdx = maxIdx;
      return 'push';
    }
    maxIdx = Math.max(maxIdx, st.idx);
    const kind = st.idx < lastIdx ? 'back' : 'forward';
    lastIdx = st.idx;
    return kind;
  }

  // Pantalla de un módulo diferido: si mientras llega se ha cambiado de ruta, no se pinta.
  function lazy(token, screen, loader, fn, needsText = false) {
    Promise.all([loader(), needsText ? ensureText() : null])
      .then(([mod]) => {
        if (token !== renderToken) return null;
        return Promise.resolve(fn(mod)).then(() => {
          if (token === renderToken && restoreY != null) window.scrollTo(0, restoreY);
        });
      })
      .catch((err) => {
        if (token !== renderToken) return;
        console.error(err);
        // Módulos de dos versiones mezclados (o un corte de red): la primera vez se recarga sola.
        if (shouldAutoReload(safeStorage(() => window.sessionStorage), location.hash, Date.now())) return location.reload();
        showError('Comprueba la conexión y vuelve a intentarlo.', 'No se ha podido abrir');
      });
    return screen;
  }

  function render() {
    if (cleanup) {
      try { cleanup(); } catch (err) { console.error(err); }
      cleanup = null;
    }
    if (currentRouteName) scrollByRoute.set(currentRouteName, window.scrollY);
    const token = ++renderToken;
    let route = parseRoute(location.hash, { today: ctx.dailyDay() });
    // Historia compartida: se ve encima del camino (o de la bienvenida) y la dirección queda en el inicio, sin saltar a una ronda
    // a medias.
    if (route.name === 'story') {
      const { artistId, level } = route;
      history.replaceState(null, '', `${location.pathname}${location.search}#${ROUTES.home}`);
      route = { name: 'home' };
      firstRender = false;
      loadStoryLink().then((m) => m.playSharedStory(ctx, artistId, level)).catch((err) => console.error(err));
    }
    const routeName = String(location.hash || '').replace(/^#/, '') || 'inicio';
    if (routeName !== currentRouteName) { prevRoute = currentRouteName; currentRouteName = routeName; routeChanged(); }
    restoreY = navigationKind() === 'back' ? (scrollByRoute.get(routeName) ?? null) : null;
    const onboarded = store.get().onboarded;
    const screen = document.createElement('div');
    screen.className = 'screen';
    root.replaceChildren(screen);
    window.scrollTo(0, 0);
    // Lo que dijo el lector de pantalla en la pantalla anterior ya no vale.
    clearAnnounce();

    if (route.name === 'invalid') {
      toast('Ese enlace no vale', { carry: true });
      return go('inicio', { replace: true });
    }
    const welcome = () => lazy(token, screen, loadWelcome, (m) => m.renderWelcome(ctx, screen));
    if (!onboarded && route.name !== 'challenge' && route.name !== 'era') return welcome();

    // Ronda a medias: se retoma en su ruta y, al abrir la app en el inicio, se vuelve a ella.
    const session = readSession(store.get(), index, Date.now());
    const hashName = String(location.hash || '').replace(/^#/, '');
    const isBoot = firstRender;
    firstRender = false;
    if (session) {
      if (FLOW_ROUTES.has(route.name) && hashName === session.route) {
        return lazy(token, screen, loadFlows, (m) => m.resumeSession(ctx, screen, session), true);
      }
      if (isBoot && route.name === 'home') return go(session.route, { replace: true });
    }
    const flow = (fn) => lazy(token, screen, loadFlows, (m) => fn(m), true);
    // Abrir la ficha de un pintor nuevo le quita la etiqueta «Nuevo».
    if (route.name === 'artist') store.update((s) => { const progress = markRosterSeen(s.progress, route.artistId); return progress === s.progress ? s : { ...s, progress }; });
    switch (route.name) {
      case 'welcome': return welcome();
      case 'stage': return flow((m) => m.renderStage(ctx, screen, route.artistId, route.branchId));
      case 'deep': return flow((m) => m.renderDeep(ctx, screen, route.artistId, route.level));
      case 'sala': return flow((m) => m.renderSala(ctx, screen, route.movementId));
      case 'intro': return flow((m) => m.renderIntro(ctx, screen, route.movementId));
      case 'era': return flow((m) => m.renderIntro(ctx, screen, route.movementId, { mode: 'shared' }));
      case 'review': return flow((m) => m.renderMovementReview(ctx, screen, route.movementId));
      case 'srs': return flow((m) => m.renderSrsReview(ctx, screen));
      case 'quick': return flow((m) => m.renderSrsReview(ctx, screen, { quick: true }));
      case 'review5': return flow((m) => m.renderReview5(ctx, screen));
      case 'daily': return flow((m) => m.renderDaily(ctx, screen));
      case 'weekly': return flow((m) => m.renderWeekly(ctx, screen));
      case 'artist': return lazy(token, screen, loadArtistPage, (m) => m.renderArtistPage(ctx, screen, route.artistId, { focus: route.focus }), true);
      case 'works': return lazy(token, screen, loadArtistWorks, (m) => m.renderArtistWorks(ctx, screen, route.spec), true);
      case 'branch': return lazy(token, screen, loadBranch, (m) => m.renderBranch(ctx, screen, route.branchId));
      case 'gallery': return lazy(token, screen, loadGallery, (m) => m.renderGallery(ctx, screen, route.movementId), true);
      case 'challenge': return flow((m) => m.renderChallenge(ctx, screen, route.challenge));
      case 'free': return flow((m) => m.renderFree(ctx, screen));
      case 'collection': return lazy(token, screen, loadCollection, (m) => m.renderCollection(ctx, screen), true);
      case 'profile': return lazy(token, screen, loadProfile, (m) => m.renderProfile(ctx, screen));
      case 'medals': return lazy(token, screen, loadProfile, (m) => m.renderMedals(ctx, screen));
      case 'credits': return lazy(token, screen, loadCredits, (m) => m.renderCredits(ctx, screen), true);
      case 'about': return lazy(token, screen, loadAbout, (m) => m.renderAbout(ctx, screen), true);
      default:
        return lazy(token, screen, loadHome, (m) => {
          m.renderHome(ctx, screen);
          m.scrollToCurrent(screen);
        });
    }
  }

  window.addEventListener('hashchange', render);
  installPrimaryKeys();
  replayToast();
  if (moved === 'traido' || signedIn === 'traido') toast(MOVE_TOAST, { carry: true });
  else if (signedIn === 'error') toast(SIGN_IN_FAILED, { carry: true });
  render();
  // Después de pintar: textos del catálogo, audio y las pantallas que vendrán.
  whenIdle(() => {
    ensureText();
    loadFlows().catch(() => {});
    import('./ui/dj-mode.js').then((m) => m.startDjIfOn()).catch(() => {}); // modo secreto «afinar música»
    startCloudWhenReady(store, storage, () => {
      // Progreso de otro dispositivo: se aplica su tema y se repinta (salvo en mitad de una ronda).
      applyTheme(store.get().settings.theme);
      document.documentElement.classList.toggle('reduce-motion', Boolean(store.get().settings.reducedMotion));
      if (!FLOW_ROUTES.has(parseRoute(location.hash, { today: ctx.dailyDay() }).name)) render();
      toast(MOVE_TOAST);
    });
  });
  loadAudioWhenIdle();
  bindBackgroundPause();
  registerServiceWorker();
  // Contador de visitas sin cookies (vacío por defecto: no pide nada). En reposo, como el audio.
  setTimeout(() => import('./stats.js').then((m) => m.startStats({ store })).catch(() => {}), 3000);
}

// Cuenta y progreso en la nube (cloud/): solo si hay proyecto configurado; sin sesión no pide nada.
function startCloudWhenReady(store, storage, refresh) {
  import('./cloud/config.js')
    .then((c) => (c.cloudReady() ? import('./cloud/cloud.js') : null))
    .then((m) => m?.startCloud({ store, storage, stateKey: STORAGE_KEY, refresh }))
    .catch(() => {});
}

// Instalable como app (sin barra de direcciones) y abre sin red lo ya visto. Solo en https o en local.
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  whenIdle(() => navigator.serviceWorker.register(new URL('../sw.js', import.meta.url)).catch((err) => console.info('Sin service worker:', err.message)));
}

boot();
