// Motor de sonido de Sfumato: música original por época + efectos, todo sintetizado con Web Audio.
// Contrato (SPEC §5): unlock, setEra, startMusic, stopMusic, sfx, setMusicEnabled, setSfxEnabled,
// setVolume, getState (+ restore para que la app persista las preferencias).
// Listas (activas por defecto): cada sitio (época o rama) tiene un tema principal y hasta dos
// secundarios (playlists.js); al entrar y al acabar cada pieza, rotation.js decide la siguiente según
// la hora y lo que ya ha sonado en la visita. onPiece avisa de cada cambio. setEra acepta cualquier lista.
// Ninguna función pública lanza: si algo falla o no hay Web Audio, simplemente no hace nada.
import { SCORES, ERAS } from './scores.js';
import { SFX_NAMES, playSfx } from './sfx.js';
import { createGraph, createMusicPlayer } from './player.js';
import { piecesOf, pieceKey, getPiece, DEFAULT_VARIANT } from './variants.js';
import { nextPiece, hasList, playlistOf } from './rotation.js';
import { pieceInfo, allPieces } from './piece-info.js';
import { PLAYLISTS } from './playlists.js';
import { listOrder, followingList } from './list-names.js';
import { isGameNight } from '../state/game-clock.js';

export { ERAS, SFX_NAMES };

const CROSSFADE = 1.5; // s, cambio de lista
const PIECE_FADE = 2.5; // s, relevo entre dos piezas de la misma lista
// `era`: clave de la lista que suena (época o rama). `variants`: variante elegida a mano por era (sin
// listas). `shuffle`: listas activas (principal y secundarios); `piece`: clave de la pieza actual.
const DEFAULT_STATE = { unlocked: false, era: 'menu', musicEnabled: true, sfxEnabled: true, volume: 0.7, playing: false, variants: {}, shuffle: true, piece: 'menu' };
const state = { ...DEFAULT_STATE, variants: {} };
const chosen = {}; // lista -> clave de pieza elegida (por la lista o a mano)
let pinned = null;           // lista escogida a mano en el modo secreto: suena en lugar de la de la pantalla
let visit = { list: null, mainRuns: 0, altsPlayed: 0 }; // lo que ha sonado desde que se entró en el sitio
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
const activeList = () => pinned ?? state.era;
const currentKey = (list) => chosen[list]
  ?? (SCORES[list] ? pieceKey(list, state.variants[list]) : playlistOf(list)?.main ?? 'menu');

/** Desplazamiento de tónica (-6..5 semitonos) para transponer los efectos a la pieza actual. */
const tonicOffset = () => {
  const pc = getPiece(currentKey(activeList()))?.tonic ?? 0;
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

/**
 * Elige la pieza que toca en la lista (sin fundido; quien llama lanza el reproductor).
 * `last` = la que acaba de terminar, o null al entrar en el sitio.
 */
function pickPiece(list, last = null) {
  if (!state.shuffle) return;
  if (last === null || visit.list !== list) visit = { list, mainRuns: 0, altsPlayed: 0 };
  const main = playlistOf(list)?.main;
  if (last !== null) visit.mainRuns = last === main ? visit.mainRuns + 1 : 0;
  const key = nextPiece(list, { last, mainRuns: visit.mainRuns, altsPlayed: visit.altsPlayed, date: new Date(), night: isGameNight() });
  if (!key) return;
  if (key !== main) { visit.altsPlayed += 1; visit.mainRuns = 0; }
  chosen[list] = key;
  emitPiece(list, key);
}

function emitPiece(list, key) {
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
  pickPiece(activeList(), state.piece);
  finished.fadeOutAndDispose(PIECE_FADE);
  current = launchPlayer(activeList(), PIECE_FADE);
}

function startPlaying() {
  if (!ctx || !graph || !state.unlocked || !state.musicEnabled || current) return;
  pickPiece(activeList());
  current = launchPlayer(activeList(), 1.2);
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
  pinned = null; // otra pantalla: se acaba la lista escogida a mano
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
  chosen[era] = pieceKey(era, variant); // la elegida a mano suena ya; la lista sigue después
  if (currentKey(era) === before || era !== state.era || !current || !ctx) return;
  const old = current;
  old.fadeOutAndDispose(CROSSFADE);
  current = launchPlayer(era, CROSSFADE);
}

/** Activa o desactiva las listas (la página de escucha las apaga para oír una pieza concreta). */
function setShuffle(on) { state.shuffle = !!on; }

/** Suscribe `fn({ list, piece })` a cada cambio de pieza; devuelve la baja. */
function onPiece(fn) {
  if (typeof fn !== 'function') return () => {};
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Pieza que toca ahora en la lista actual: { id, title, author, key, role } (modo «afinar música»). */
const nowPlaying = () => pieceInfo(currentKey(activeList()), activeList());

/** Modo «afinar música»: pasa `step` piezas por la lista (1 = siguiente, -1 = anterior), recorriéndolas todas, también las que no rotan. */
function move(step) {
  if (!current || !ctx) return;
  const list = activeList();
  const keys = allPieces(list);
  const key = keys[(keys.indexOf(currentKey(list)) + step + keys.length) % keys.length];
  if (!key) return;
  chosen[list] = key;
  emitPiece(list, key);
  current.fadeOutAndDispose(CROSSFADE);
  current = launchPlayer(list, CROSSFADE);
}
const next = () => move(1);
const previous = () => move(-1);

/** Lista que suena ahora (la de la pantalla, o la escogida a mano en el modo secreto). */
const nowList = () => activeList();

/** Modo «afinar música»: salta a la lista siguiente del catálogo de música y pone su principal; dura hasta cambiar de pantalla. */
function nextList() {
  const order = listOrder(Object.keys(PLAYLISTS), hasList);
  const target = followingList(order, activeList());
  if (!target) return;
  pinned = target;
  pickPiece(target);
  if (!current || !ctx) return;
  current.fadeOutAndDispose(CROSSFADE);
  current = launchPlayer(target, CROSSFADE);
}

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

const readState = () => ({ ...state, variants: { ...state.variants } });

/** Carga preferencias guardadas por la app (admite estados parciales o corruptos). */
function restoreState(saved) {
  if (!saved || typeof saved !== 'object') return;
  if ('musicEnabled' in saved) state.musicEnabled = !!saved.musicEnabled;
  if ('sfxEnabled' in saved) state.sfxEnabled = !!saved.sfxEnabled;
  if ('volume' in saved) setVolume(saved.volume);
  if ('shuffle' in saved) setShuffle(saved.shuffle);
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
  previous: safe(previous),
  nextList: safe(nextList),
  list: safe(nowList, 'menu'),
  getState: safe(readState, { ...DEFAULT_STATE, variants: {} }),
  restore: safe(restoreState),
};

// Atajos nombrados (misma función que audio.getState / audio.restore).
export const getState = audio.getState;
export const restore = audio.restore;
