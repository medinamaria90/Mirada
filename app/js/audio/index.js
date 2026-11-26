// Motor de sonido de Sfumato: música original por época + efectos, todo sintetizado con Web Audio.
// Contrato (SPEC §5): unlock, setEra, startMusic, stopMusic, sfx, setMusicEnabled, setSfxEnabled,
// setVolume, getState (+ restore para que la app persista las preferencias).
// Rotación (activa por defecto): al empezar una lista (época o rama temática) o al terminar una
// pieza, suena otra de esa lista sin repetir las últimas (rotation.js); onPiece avisa de cada pieza
// elegida para que la app la recuerde. setEra acepta la clave de cualquier lista.
// Ninguna función pública lanza: si algo falla o no hay Web Audio, simplemente no hace nada.
import { SCORES, ERAS } from './scores.js';
import { SFX_NAMES, playSfx } from './sfx.js';
import { createGraph, createMusicPlayer } from './player.js';
import { piecesOf, pieceKey, getPiece, DEFAULT_VARIANT } from './variants.js';
import { pickNext, pushRecent, cleanRecent, hasList, rotationPool } from './rotation.js';
import { pieceInfo } from './piece-info.js';

export { ERAS, SFX_NAMES };

const CROSSFADE = 1.5; // s, cambio de lista
const PIECE_FADE = 2.5; // s, relevo entre dos piezas de la misma lista
// `era`: clave de la lista que suena (época o rama). `variants`: variante elegida a mano por era (sin
// rotación). `shuffle`: rotación activa; `recent`: por lista, las últimas piezas que sonaron (la más
// reciente primero); `piece`: clave de la pieza actual de la lista.
const DEFAULT_STATE = { unlocked: false, era: 'menu', musicEnabled: true, sfxEnabled: true, volume: 0.7, playing: false, variants: {}, shuffle: true, recent: {}, piece: 'menu' };
const state = { ...DEFAULT_STATE, variants: {}, recent: {} };
const chosen = {}; // lista -> clave de pieza elegida (por la rotación o a mano)
const listeners = new Set();

let ctx = null;
let graph = null;
let current = null;          // reproductor activo
let wantMusic = false;       // la app pidió música (aunque aún no esté desbloqueado o esté desactivada)
let suspendedByHidden = false;
let visibilityBound = false;

const num = (v, fb) => (v !== null && v !== '' && v !== undefined && Number.isFinite(Number(v)) ? Number(v) : fb);
const safe = (fn, fallback) => (...args) => { try { return fn(...args); } catch { return fallback; } };

/** Clave de la pieza que toca en una lista: la elegida, o la variante de la era, o la primera de la rama. */
const currentKey = (list) => chosen[list]
  ?? (SCORES[list] ? pieceKey(list, state.variants[list]) : rotationPool(list)[0]?.key ?? 'menu');

/** Desplazamiento de tónica (-6..5 semitonos) para transponer los efectos a la pieza actual. */
const tonicOffset = () => {
  const pc = getPiece(currentKey(state.era))?.tonic ?? 0;
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

/** Rotación: elige la siguiente pieza de la lista (sin fundido; quien llama lanza el reproductor). */
function pickPiece(list) {
  if (!state.shuffle) return;
  const key = pickNext(list, state.recent[list]);
  if (!key) return;
  state.recent[list] = pushRecent(state.recent[list], key);
  chosen[list] = key;
  for (const fn of listeners) { try { fn({ list, piece: key }); } catch { /* un oyente roto no para la música */ } }
}

function launchPlayer(list, fade) {
  state.piece = currentKey(list);
  const p = createMusicPlayer(ctx, graph, state.piece, { onEnd: state.shuffle ? () => advance(p) : null });
  p.start(fade);
  return p;
}

/** Al terminar una pieza entra la siguiente de la misma era, con un relevo suave. */
function advance(finished) {
  if (current !== finished || !ctx) return;
  pickPiece(state.era);
  finished.fadeOutAndDispose(PIECE_FADE);
  current = launchPlayer(state.era, PIECE_FADE);
}

function startPlaying() {
  if (!ctx || !graph || !state.unlocked || !state.musicEnabled || current) return;
  pickPiece(state.era);
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
  if (!hasList(era) || era === state.era) return;
  state.era = era;
  if (!current || !ctx) return;
  pickPiece(era);
  const old = current;
  old.fadeOutAndDispose(CROSSFADE);
  current = launchPlayer(era, CROSSFADE);
}

/** Elige la pieza de una lista (`base` o un id de piecesOf). Si está sonando, cambia con fundido. */
function setVariant(era, variant = DEFAULT_VARIANT) {
  if (!piecesOf(era).some((v) => v.id === variant)) return;
  const before = currentKey(era);
  if (variant === DEFAULT_VARIANT) delete state.variants[era];
  else state.variants[era] = variant;
  chosen[era] = pieceKey(era, variant); // la elegida a mano suena ya; la rotación sigue después
  if (currentKey(era) === before || era !== state.era || !current || !ctx) return;
  const old = current;
  old.fadeOutAndDispose(CROSSFADE);
  current = launchPlayer(era, CROSSFADE);
}

/** Activa o desactiva la rotación (la página de escucha la apaga para oír una pieza concreta). */
function setShuffle(on) { state.shuffle = !!on; }

/** Suscribe `fn({ list, piece })` a cada pieza que elige la rotación; devuelve la baja. */
function onPiece(fn) {
  if (typeof fn !== 'function') return () => {};
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Pieza que toca ahora en la lista actual: { id, title, author, key } (modo «afinar música»). */
const nowPlaying = () => pieceInfo(currentKey(state.era), state.era);

/** Salta a otra pieza de la lista que suena, con el mismo relevo que al terminar una. */
function next() { if (current) advance(current); }

/** Variantes disponibles de una era, sin la partitura: [{ id, name, label, character }]. */
const listVariants = (era) => piecesOf(era).map(({ id, name, label, character, source }) => ({ id, name, label, character, ...(source ? { source } : {}) }));

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

const readState = () => ({
  ...state, variants: { ...state.variants },
  recent: Object.fromEntries(Object.entries(state.recent).map(([era, ids]) => [era, [...ids]])),
});

/** Carga preferencias guardadas por la app (admite estados parciales o corruptos). */
function restoreState(saved) {
  if (!saved || typeof saved !== 'object') return;
  if ('musicEnabled' in saved) state.musicEnabled = !!saved.musicEnabled;
  if ('sfxEnabled' in saved) state.sfxEnabled = !!saved.sfxEnabled;
  if ('volume' in saved) setVolume(saved.volume);
  if ('shuffle' in saved) setShuffle(saved.shuffle);
  if (saved.recent && typeof saved.recent === 'object') state.recent = { ...state.recent, ...cleanRecent(saved.recent) };
  if (saved.variants && typeof saved.variants === 'object') {
    for (const [era, variant] of Object.entries(saved.variants)) if (typeof variant === 'string') setVariant(era, variant);
  }
  if (typeof saved.era === 'string' && hasList(saved.era)) setEra(saved.era);
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
  setVariant: safe(setVariant),
  listVariants: safe(listVariants, []),
  setShuffle: safe(setShuffle),
  onPiece: safe(onPiece, () => {}),
  nowPlaying: safe(nowPlaying, null),
  next: safe(next),
  getState: safe(readState, { ...DEFAULT_STATE, variants: {}, recent: {} }),
  restore: safe(restoreState),
};

// Atajos nombrados (misma función que audio.getState / audio.restore).
export const getState = audio.getState;
export const restore = audio.restore;
