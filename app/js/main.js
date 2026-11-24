// Arranque: catálogo, estado, audio y enrutado. Solo lo imprescindible va en la cadena estática
// (precargada con <link rel="modulepreload"> en index.html); la primera pantalla (bienvenida o
// inicio) se pide en paralelo con el catálogo y el resto (rondas, colección, perfil, salas, textos
// largos del catálogo y audio) después de pintar.

import { buildIndex, mergeCatalogText } from './engine/catalog.js';
import { dayKey, madridDayKey } from './engine/dates.js';
import { createStore, safeStorage, STORAGE_KEY } from './state/store.js';
import { parseRoute, go } from './ui/router.js';
import { audio, loadAudioWhenIdle, applyAudioSettings, bindBackgroundPause } from './ui/audio-bridge.js';
import { installArtListeners } from './ui/art.js';
import { esc, onAction, focusHeading, clearAnnounce } from './ui/dom.js';
import { toast, replayToast } from './ui/toast.js';
import { readSession } from './state/session.js';
import { applyTheme } from './ui/theme.js';

const root = document.getElementById('app');
const loadWelcome = () => import('./ui/screens/welcome.js');
const loadHome = () => import('./ui/screens/home.js');
const loadFlows = () => import('./ui/screens/flows.js');
const loadCollection = () => import('./ui/screens/collection.js');
const loadProfile = () => import('./ui/screens/profile.js');
const loadGallery = () => import('./ui/screens/gallery.js');

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

function showError(message) {
  root.innerHTML = `<div class="screen"><div class="welcome"><main class="welcome-body" id="main">
    <h1 class="welcome-title welcome-title-sm">No se ha podido abrir la colección</h1>
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
    if (active && active !== document.body && active.closest(INTERACTIVE)) return;
    if (document.querySelector('.sheet:not([hidden]), .feedback.is-open, .viewer')) return;
    const primary = [...root.querySelectorAll('[data-primary]')].filter((b) => !b.disabled && b.getClientRects().length);
    if (primary.length !== 1) return;
    ev.preventDefault();
    primary[0].click();
  });
}

// Cualquier cuadro con data-zoom se abre en el visor a pantalla completa (módulo diferido: no
// cuenta en el arranque).
function installZoom(getIndex) {
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-zoom]');
    const index = getIndex();
    if (!el || !index) return;
    ev.preventDefault();
    import('./ui/viewer.js')
      .then((m) => m.zoomFromElement(index, el))
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
  const store = createStore({ storage });
  document.documentElement.classList.toggle('reduce-motion', Boolean(store.get().settings.reducedMotion));
  applyTheme(store.get().settings.theme);
  // La primera pantalla se pide ya, a la vez que el catálogo.
  const atHome = /^#?(inicio)?$/.test(location.hash || '');
  if (!store.get().onboarded) loadWelcome().catch(() => {});
  else if (atHome) loadHome().catch(() => {});

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
  installZoom(() => index);
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

  const FLOW_ROUTES = new Set(['stage', 'sala', 'review', 'srs', 'quick', 'review5', 'daily', 'weekly', 'challenge', 'free']);
  let firstRender = true;
  let renderToken = 0;

  // Pantalla de un módulo diferido: si mientras llega se ha cambiado de ruta, no se pinta.
  function lazy(token, screen, loader, fn, needsText = false) {
    Promise.all([loader(), needsText ? ensureText() : null])
      .then(([mod]) => {
        if (token !== renderToken) return;
        fn(mod);
      })
      .catch((err) => {
        if (token !== renderToken) return;
        console.error(err);
        showError('Comprueba la conexión y vuelve a intentarlo.');
      });
    return screen;
  }

  function render() {
    if (cleanup) {
      try { cleanup(); } catch (err) { console.error(err); }
      cleanup = null;
    }
    const token = ++renderToken;
    const route = parseRoute(location.hash, { today: ctx.dailyDay() });
    const routeName = String(location.hash || '').replace(/^#/, '') || 'inicio';
    if (routeName !== currentRouteName) { prevRoute = currentRouteName; currentRouteName = routeName; }
    const onboarded = store.get().onboarded;
    const screen = document.createElement('div');
    screen.className = 'screen';
    root.replaceChildren(screen);
    window.scrollTo(0, 0);
    // Lo que dijo el lector de pantalla en la pantalla anterior ya no vale.
    clearAnnounce();

    if (route.name === 'invalid') {
      toast('Ese enlace no vale');
      return go('inicio', { replace: true });
    }
    const welcome = () => lazy(token, screen, loadWelcome, (m) => m.renderWelcome(ctx, screen));
    if (!onboarded && route.name !== 'challenge') return welcome();

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
    switch (route.name) {
      case 'welcome': return welcome();
      case 'stage': return flow((m) => m.renderStage(ctx, screen, route.artistId));
      case 'sala': return flow((m) => m.renderSala(ctx, screen, route.movementId));
      case 'intro': return flow((m) => m.renderIntro(ctx, screen, route.movementId));
      case 'review': return flow((m) => m.renderMovementReview(ctx, screen, route.movementId));
      case 'srs': return flow((m) => m.renderSrsReview(ctx, screen));
      case 'quick': return flow((m) => m.renderSrsReview(ctx, screen, { quick: true }));
      case 'review5': return flow((m) => m.renderReview5(ctx, screen));
      case 'daily': return flow((m) => m.renderDaily(ctx, screen));
      case 'weekly': return flow((m) => m.renderWeekly(ctx, screen));
      case 'gallery': return lazy(token, screen, loadGallery, (m) => m.renderGallery(ctx, screen, route.movementId), true);
      case 'challenge': return flow((m) => m.renderChallenge(ctx, screen, route.challenge));
      case 'free': return flow((m) => m.renderFree(ctx, screen));
      case 'collection': return lazy(token, screen, loadCollection, (m) => m.renderCollection(ctx, screen), true);
      case 'profile': return lazy(token, screen, loadProfile, (m) => m.renderProfile(ctx, screen));
      case 'medals': return lazy(token, screen, loadProfile, (m) => m.renderProfile(ctx, screen, { focus: 'medals' }));
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
  render();
  // Después de pintar: textos del catálogo, audio y las pantallas que vendrán.
  whenIdle(() => {
    ensureText();
    loadFlows().catch(() => {});
  });
  loadAudioWhenIdle();
  bindBackgroundPause();
  // Contador de visitas sin cookies (vacío por defecto: no pide nada). En reposo, como el audio.
  setTimeout(() => import('./stats.js').then((m) => m.startStats({ store })).catch(() => {}), 3000);
}

boot();
