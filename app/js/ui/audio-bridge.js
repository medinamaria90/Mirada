// Puente tolerante con el motor de audio (§5): si falta o falla, todo es no-op.
// El motor se importa tarde (en reposo tras pintar o en el primer gesto) para no retrasar el
// arranque; mientras tanto se recuerda lo pedido (era, ajustes, desbloqueo) y se aplica al cargar.
// Rotación de piezas: el motor elige otra pieza de la época al entrar en ella o al acabar la que
// suena; aquí se recuerdan las últimas de cada época entre visitas (para no repetir al volver y para
// que la favorita suene primero solo la primera vez). Va en localStorage y no en el estado versionado:
// es una comodidad de este navegador, no progreso; no merece migración ni viajar al exportar, y si se
// pierde no pasa nada (solo podría repetirse una pieza una vez).

const NOOP = {
  unlock() {}, setEra() {}, startMusic() {}, stopMusic() {}, sfx() {},
  setMusicEnabled() {}, setSfxEnabled() {}, setVolume() {},
  getState: () => ({ unlocked: false, era: 'menu', musicEnabled: false, sfxEnabled: false, volume: 0, playing: false }),
};

let engine = NOOP;
let available = false;
let loading = null;
const pending = { era: 'menu', settings: null, unlocked: false, music: false };
export const MUSIC_MEMORY_KEY = 'sfumato.music.recent';

/** Últimas piezas por época guardadas en este navegador ({} si no hay o no se puede leer). */
export function readMusicMemory() {
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem(MUSIC_MEMORY_KEY) || '{}');
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch {
    return {}; // sin almacenamiento o dato roto: se empieza sin memoria
  }
}

function writeMusicMemory(recent) {
  try {
    globalThis.localStorage?.setItem(MUSIC_MEMORY_KEY, JSON.stringify(recent || {}));
  } catch { /* sin almacenamiento: la rotación sigue, solo que sin recordar entre visitas */ }
}

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
  call('restore', { recent: readMusicMemory() });
  call('onPiece', () => writeMusicMemory(call('getState')?.recent));
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
  isAvailable: () => available,
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
