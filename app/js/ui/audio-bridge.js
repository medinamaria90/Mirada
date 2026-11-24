// Puente tolerante con el motor de audio (§5): si falta o falla, todo es no-op.
// El motor se importa tarde (en reposo tras pintar o en el primer gesto) para no retrasar el
// arranque; mientras tanto se recuerda lo pedido (era, ajustes, desbloqueo) y se aplica al cargar.

const NOOP = {
  unlock() {}, setEra() {}, startMusic() {}, stopMusic() {}, sfx() {},
  setMusicEnabled() {}, setSfxEnabled() {}, setVolume() {},
  getState: () => ({ unlocked: false, era: 'menu', musicEnabled: false, sfxEnabled: false, volume: 0, playing: false }),
};

let engine = NOOP;
let available = false;
let loading = null;
const pending = { era: 'menu', settings: null, unlocked: false, music: false };

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
export function loadAudioWhenIdle(delay = 2500) {
  const start = () => { loadAudio(); };
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
  if (!available) return;
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
