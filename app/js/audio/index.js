// Motor de sonido de Mirada: música original por época + efectos, todo sintetizado con Web Audio.
// Contrato (SPEC §5): unlock, setEra, startMusic, stopMusic, sfx, setMusicEnabled, setSfxEnabled,
// setVolume, getState (+ restore para que la app persista las preferencias).
// Ninguna función pública lanza: si algo falla o no hay Web Audio, simplemente no hace nada.
import { SCORES, ERAS } from './scores.js';
import { SFX_NAMES, playSfx } from './sfx.js';
import { createGraph, createMusicPlayer } from './player.js';

export { ERAS, SFX_NAMES };

const CROSSFADE = 1.5; // s, cambio de era
const state = { unlocked: false, era: 'menu', musicEnabled: true, sfxEnabled: true, volume: 0.7, playing: false };

let ctx = null;
let graph = null;
let current = null;          // reproductor activo
let wantMusic = false;       // la app pidió música (aunque aún no esté desbloqueado o esté desactivada)
let suspendedByHidden = false;
let visibilityBound = false;

const num = (v, fb) => (v !== null && v !== '' && v !== undefined && Number.isFinite(Number(v)) ? Number(v) : fb);
const safe = (fn, fallback) => (...args) => { try { return fn(...args); } catch { return fallback; } };

/** Desplazamiento de tónica (-6..5 semitonos) para transponer los efectos a la pieza actual. */
const tonicOffset = () => {
  const pc = SCORES[state.era]?.tonic ?? 0;
  return ((pc + 6) % 12) - 6;
};

/** Curva perceptual: el control de volumen es lineal para el oído. */
const applyVolume = () => {
  if (!ctx || !graph) return;
  graph.master.gain.setTargetAtTime(state.volume * state.volume, ctx.currentTime, 0.03);
};

function bindVisibility() {
  if (visibilityBound || typeof document === 'undefined') return;
  visibilityBound = true;
  document.addEventListener('visibilitychange', safe(() => {
    if (!ctx) return;
    if (document.hidden) {
      if (ctx.state === 'running') { suspendedByHidden = true; ctx.suspend().catch(() => {}); }
    } else if (suspendedByHidden) {
      suspendedByHidden = false;
      ctx.resume().catch(() => {});
    }
  }));
}

function launchPlayer(era, fade) {
  const p = createMusicPlayer(ctx, graph, era);
  p.start(fade);
  return p;
}

function startPlaying() {
  if (!ctx || !graph || !state.unlocked || !state.musicEnabled || current) return;
  current = launchPlayer(state.era, 1.2);
  state.playing = true;
}

function stopPlaying(fade = 1) {
  if (current) { current.fadeOutAndDispose(fade); current = null; }
  state.playing = false;
}

function unlock() {
  if (!ctx) {
    const Ctor = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Ctor) return false;
    try { ctx = new Ctor({ latencyHint: 'playback' }); } catch { ctx = new Ctor(); }
    graph = createGraph(ctx);
    bindVisibility();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  try { // iOS: un sonido vacío dentro del gesto termina de desbloquear el audio
    const s = ctx.createBufferSource();
    s.buffer = ctx.createBuffer(1, 1, 22050);
    s.connect(ctx.destination);
    s.start(0);
  } catch { /* no crítico */ }
  state.unlocked = true;
  applyVolume();
  if (wantMusic) startPlaying();
  return true;
}

function setEra(era) {
  if (!SCORES[era] || era === state.era) return;
  state.era = era;
  if (!current || !ctx) return;
  const old = current;
  old.fadeOutAndDispose(CROSSFADE);
  current = launchPlayer(era, CROSSFADE);
}

function startMusic() {
  wantMusic = true;
  startPlaying();
}

function stopMusic() {
  wantMusic = false;
  stopPlaying(1);
}

function sfx(name) {
  if (!state.unlocked || !state.sfxEnabled || !ctx || !graph || !SFX_NAMES.includes(name)) return;
  if (ctx.state === 'suspended' && !(typeof document !== 'undefined' && document.hidden)) ctx.resume().catch(() => {});
  playSfx(ctx, graph, name, { tonicOffset: tonicOffset() });
}

function setMusicEnabled(on) {
  state.musicEnabled = !!on;
  if (!state.musicEnabled) stopPlaying(0.8);
  else { wantMusic = true; startPlaying(); }
}

function setSfxEnabled(on) { state.sfxEnabled = !!on; }

function setVolume(v) {
  state.volume = Math.min(1, Math.max(0, num(v, state.volume)));
  applyVolume();
}

const readState = () => ({ ...state });

/** Carga preferencias guardadas por la app (admite estados parciales o corruptos). */
function restoreState(saved) {
  if (!saved || typeof saved !== 'object') return;
  if ('musicEnabled' in saved) state.musicEnabled = !!saved.musicEnabled;
  if ('sfxEnabled' in saved) state.sfxEnabled = !!saved.sfxEnabled;
  if ('volume' in saved) setVolume(saved.volume);
  if (typeof saved.era === 'string' && SCORES[saved.era]) setEra(saved.era);
  if (!state.musicEnabled) stopPlaying(0.5);
}

export const audio = {
  unlock: safe(unlock, false),
  setEra: safe(setEra),
  startMusic: safe(startMusic),
  stopMusic: safe(stopMusic),
  sfx: safe(sfx),
  setMusicEnabled: safe(setMusicEnabled),
  setSfxEnabled: safe(setSfxEnabled),
  setVolume: safe(setVolume),
  getState: safe(readState, { unlocked: false, era: 'menu', musicEnabled: true, sfxEnabled: true, volume: 0.7, playing: false }),
  restore: safe(restoreState),
};

// Atajos nombrados (misma función que audio.getState / audio.restore).
export const getState = audio.getState;
export const restore = audio.restore;
