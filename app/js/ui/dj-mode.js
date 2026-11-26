// Modo secreto «afinar música» (para María): una barra fina arriba de la app, en el flujo (empuja el
// contenido), enseña la pieza que suena (título, autor, lista y papel) y deja ir a la anterior, a la
// siguiente o a la siguiente lista.
// Se activa desde Ajustes (dj-sheet.js) y se recuerda en este navegador: no es progreso.

import { audio } from './audio-bridge.js';
import { loadCss } from './lazy-css.js';
import { listName } from '../audio/list-names.js';

export const DJ_KEY = 'sfumato.dj';
const ON = '1';

let pill = null; // la barra
let stopListening = null;

export function isDjOn() {
  try { return globalThis.localStorage?.getItem(DJ_KEY) === ON; } catch { return false; }
}

function saveDj(on) {
  try {
    if (on) localStorage.setItem(DJ_KEY, ON);
    else localStorage.removeItem(DJ_KEY);
  } catch { /* sin almacenamiento: el modo dura hasta recargar */ }
}

const NOTE_SILENT = 'Sin sonido · toca para escuchar';
const NOTE_OFF = 'Música desactivada en Ajustes';
const FALLBACK_ERA = 'menu';

let observer = null;
let preview = null; // módulos puros del motor (sin Web Audio), para decir qué sonaría sin arrancarlo

const pieceLine = (info) => [info.title, info.author].filter(Boolean).join(' · ');
const musicOff = () => audio.settings()?.music === false;

/** Pieza principal de la lista de esta pantalla: lo que sonaría si hubiera sonido. */
function wouldPlay() {
  if (!preview) return null;
  const want = audio.list();
  const era = preview.hasList(want) ? want : FALLBACK_ERA;
  const main = preview.playlistOf(era)?.main;
  return main ? preview.pieceInfo(main, era) : null;
}

function render() {
  if (!pill) return;
  const playing = audio.nowPlaying();
  const info = playing || wouldPlay();
  pill.hidden = !info;
  document.documentElement.classList.toggle('has-dj', !pill.hidden);
  if (!info) return;
  pill.classList.toggle('is-silent', !playing);
  pill.querySelector('.dj-title').textContent = pieceLine(info);
  const where = `${listName(info.key)} · ${info.role}`;
  pill.querySelector('.dj-key').textContent = playing ? where : `${musicOff() ? NOTE_OFF : NOTE_SILENT} · ${where}`;
}

/** Gesto del usuario: intenta arrancar la música (respeta Ajustes: si está apagada, no la enciende). */
export function wakeMusic() {
  if (musicOff()) return;
  audio.unlock();
  audio.startMusic();
}

function mountPill() {
  if (pill) return;
  loadCss('css/dj.css');
  pill = document.createElement('div');
  pill.className = 'dj-bar';
  pill.hidden = true;
  pill.innerHTML = `<button type="button" class="dj-btn" data-dj="prev" aria-label="Pieza anterior">⏮</button>
    <button type="button" class="dj-now" data-dj="now"><span class="dj-title"></span><span class="dj-key"></span></button>
    <button type="button" class="dj-btn" data-dj="next" aria-label="Pieza siguiente">⏭</button>
    <button type="button" class="dj-btn" data-dj="list" aria-label="Siguiente lista">⏭⏭</button>`;
  pill.addEventListener('click', (ev) => {
    const kind = ev.target.closest('button')?.dataset.dj;
    if (kind === 'prev') audio.previousPiece();
    else if (kind === 'next') audio.nextPiece();
    else if (kind === 'list') audio.nextList();
    else if (kind === 'now' && !audio.nowPlaying()) wakeMusic();
  });
  document.body.prepend(pill);
  document.documentElement.classList.add('has-dj');
  // El motor avisa antes de marcar «suena»: se repinta en cuanto termina el aviso.
  stopListening = audio.onPieceChange(() => queueMicrotask(render));
  const app = document.getElementById('app') || document.body;
  let queued = false;
  observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; render(); });
  });
  observer.observe(app, { childList: true, subtree: true });
  window.addEventListener('hashchange', render);
  Promise.all([import('../audio/piece-info.js'), import('../audio/rotation.js')])
    .then(([info, rot]) => { preview = { pieceInfo: info.pieceInfo, ...rot }; render(); })
    .catch(() => render());
  render();
}

function unmountPill() {
  stopListening?.();
  stopListening = null;
  observer?.disconnect();
  observer = null;
  window.removeEventListener('hashchange', render);
  pill?.remove();
  document.documentElement.classList.remove('has-dj');
  pill = null;
}

/** Enciende o apaga el modo (y lo recuerda). Al encender, arranca la música en ese mismo toque. */
export function setDj(on) {
  saveDj(on);
  if (on) { mountPill(); wakeMusic(); }
  else unmountPill();
}

/** Al arrancar: si el modo estaba encendido, monta la pastilla. */
export function startDjIfOn() {
  if (isDjOn()) mountPill();
}
