// Puente tolerante con el motor de audio (§5): si falta o falla, todo es no-op.
// El motor se importa tarde (en reposo tras pintar o en el primer gesto) para no retrasar el
// arranque; mientras tanto se recuerda lo pedido (era, ajustes, desbloqueo) y se aplica al cargar.
// Qué pieza suena en cada sitio lo decide el motor (principal y secundarios, audio/playlists.js);
// aquí solo se avisa a quien quiera saber qué suena (modo «afinar música»).

const NOOP = {
  unlock() {}, setEra() {}, startMusic() {}, stopMusic() {}, sfx() {},
  setMusicEnabled() {}, setSfxEnabled() {}, setVolume() {},
  getState: () => ({ unlocked: false, era: 'menu', musicEnabled: false, sfxEnabled: false, volume: 0, playing: false }),
};

let engine = NOOP;
let available = false;
let loading = null;
const pending = { era: 'menu', settings: null, unlocked: false, music: false };
const pieceListeners = new Set(); // modo «afinar música»: quien quiere saber qué pieza suena

export function loadAudio() {
  if (loading) return loading;
  loading = import('../audio/index.js')
    .then((mod) => {
      const candidate = mod?.audio || mod?.default;
      if (candidate && typeof candidate.sfx === 'function') {
        engine = candidate;
        available = true;
        replay();
      }
      return available;
    })
    .catch(() => {
      engine = NOOP;
      return false;
    });
  return loading;
}

// Carga en reposo, después de pintar la primera pantalla.
// Con la música y los efectos apagados no hace falta: se deja para cuando se enciendan (applyAudioSettings).
let deferred = false;
const wanted = () => !pending.settings || Boolean(pending.settings.music || pending.settings.sfx);
export function loadAudioWhenIdle(delay = 2500) {
  const start = () => {
    if (wanted()) loadAudio();
    else deferred = true;
  };
  setTimeout(() => {
    try {
      if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(start, { timeout: 3000 });
      else start();
    } catch {
      start();
    }
  }, delay);
}

function replay() {
  call('onPiece', () => {
    const info = call('nowPlaying');
    for (const fn of pieceListeners) fn(info);
  });
  if (pending.settings) applyAudioSettings(pending.settings);
  call('setEra', pending.era);
  if (pending.unlocked) {
    call('unlock');
    if (pending.music) call('startMusic');
  }
}

function call(name, ...args) {
  try {
    const fn = engine[name];
    return typeof fn === 'function' ? fn.apply(engine, args) : undefined;
  } catch {
    return undefined;
  }
}

export const audio = {
  unlock: () => {
    pending.unlocked = true;
    if (!available) loadAudio();
    return call('unlock');
  },
  setEra: (era) => {
    pending.era = era || 'menu';
    return call('setEra', pending.era);
  },
  startMusic: () => {
    pending.music = true;
    return call('startMusic');
  },
  stopMusic: () => {
    pending.music = false;
    return call('stopMusic');
  },
  sfx: (name) => call('sfx', name),
  setMusicEnabled: (v) => call('setMusicEnabled', v),
  setSfxEnabled: (v) => call('setSfxEnabled', v),
  setVolume: (v) => call('setVolume', v),
  getState: () => call('getState') || { ...NOOP.getState(), unlocked: pending.unlocked },
  /** Pieza que suena ({ id, title, author, key }) o null si no hay música. */
  nowPlaying: () => (call('getState')?.playing ? call('nowPlaying') || null : null),
  nextPiece: () => call('next'),
  previousPiece: () => call('previous'),
  nextList: () => call('nextList'),
  /** Lista que suena (la de la pantalla o la escogida a mano en el modo secreto). */
  list: () => call('list') || pending.era,
  /** Avisa con `fn(info)` cada vez que cambia la pieza; devuelve la baja. */
  onPieceChange: (fn) => {
    pieceListeners.add(fn);
    return () => pieceListeners.delete(fn);
  },
  isAvailable: () => available,
  /** Lista (época o rama) pedida para la pantalla actual. */
  era: () => pending.era,
  /** Preferencias de audio de Ajustes que la app ha aplicado (null si aún no). */
  settings: () => (pending.settings ? { ...pending.settings } : null),
};

// Aplica las preferencias guardadas en el store al motor.
export function applyAudioSettings(settings) {
  pending.settings = { ...settings };
  if (!available) {
    if (deferred && wanted()) loadAudio();
    return;
  }
  if (typeof engine.restore === 'function') {
    call('restore', { musicEnabled: settings.music, sfxEnabled: settings.sfx, volume: settings.volume });
  }
  audio.setMusicEnabled(Boolean(settings.music));
  audio.setSfxEnabled(Boolean(settings.sfx));
  audio.setVolume(Number(settings.volume) || 0);
}

// Música de fondo según la era; solo suena si el usuario ya interactuó.
export function playEra(era) {
  audio.setEra(era || 'menu');
  if (audio.getState().unlocked) audio.startMusic();
}

// En segundo plano la música se calla. El motor ya atiende `visibilitychange`, pero algunos
// navegadores de Android y las pestañas abiertas desde otra app no lo disparan (o lo hacen tarde):
// aquí se escuchan también `pagehide`, `freeze` y la pérdida de foco de la ventana, y se para la
// música sin olvidar que estaba pedida, para reanudarla al volver.
const BLUR_GRACE_MS = 800; // perder el foco un instante (teclado, barra de direcciones) no cuenta
let pausedInBackground = false;
let blurTimer = null;

function pauseInBackground() {
  if (pausedInBackground || !pending.music) return;
  pausedInBackground = true;
  call('stopMusic');
}

function resumeFromBackground() {
  if (blurTimer) { clearTimeout(blurTimer); blurTimer = null; }
  if (!pausedInBackground) return;
  pausedInBackground = false;
  if (pending.music && pending.unlocked) call('startMusic');
}

export const isPausedInBackground = () => pausedInBackground;

export function bindBackgroundPause(doc = globalThis.document, win = globalThis.window, graceMs = BLUR_GRACE_MS) {
  if (!doc || !win || typeof doc.addEventListener !== 'function') return;
  const onVisibility = () => { if (doc.hidden) pauseInBackground(); else resumeFromBackground(); };
  doc.addEventListener('visibilitychange', onVisibility);
  doc.addEventListener('freeze', pauseInBackground);
  win.addEventListener('pagehide', pauseInBackground);
  win.addEventListener('blur', () => {
    if (blurTimer) clearTimeout(blurTimer);
    blurTimer = setTimeout(() => {
      blurTimer = null;
      if (doc.hidden || (typeof doc.hasFocus === 'function' && !doc.hasFocus())) pauseInBackground();
    }, graceMs);
  });
  win.addEventListener('focus', resumeFromBackground);
  win.addEventListener('pageshow', resumeFromBackground);
}
