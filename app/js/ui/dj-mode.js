// Modo secreto «afinar música» (para María): una pastilla fija bajo la barra superior enseña la pieza
// que suena (título, autor si es un clásico y la clave de la lista) y, al tocarla, deja saltar a otra.
// Se activa desde Ajustes (dj-sheet.js) y se recuerda en este navegador: no es progreso.

import { audio } from './audio-bridge.js';
import { loadCss } from './lazy-css.js';

export const DJ_KEY = 'sfumato.dj';
const ON = '1';

let pill = null;
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
const hasTopbar = () => Boolean(document.querySelector('.topbar'));
const musicOff = () => audio.settings()?.music === false;

/** Pieza principal de la lista de esta pantalla: lo que sonaría si hubiera sonido. */
function wouldPlay() {
  if (!preview) return null;
  const era = preview.hasList(audio.era()) ? audio.era() : FALLBACK_ERA;
  const main = preview.playlistOf(era)?.main;
  return main ? preview.pieceInfo(main, era) : null;
}

function render() {
  if (!pill) return;
  const playing = audio.nowPlaying();
  const info = playing || wouldPlay();
  pill.hidden = !info || !hasTopbar();
  if (!info) return;
  pill.classList.toggle('is-silent', !playing);
  pill.querySelector('.dj-title').textContent = pieceLine(info);
  pill.querySelector('.dj-key').textContent = `${info.key} · ${info.role}`;
  const note = pill.querySelector('.dj-note');
  note.hidden = Boolean(playing);
  note.textContent = musicOff() ? NOTE_OFF : NOTE_SILENT;
}

/** Gesto del usuario: intenta arrancar la música (respeta Ajustes: si está apagada, no la enciende). */
export function wakeMusic() {
  if (musicOff()) return;
  audio.unlock();
  audio.startMusic();
}

function setOpen(open) {
  pill.querySelector('.dj-now').setAttribute('aria-expanded', String(open));
  pill.querySelector('.dj-actions').hidden = !open;
}

function mountPill() {
  if (pill) return;
  loadCss('css/dj.css');
  pill = document.createElement('div');
  pill.className = 'dj-pill';
  pill.hidden = true;
  pill.innerHTML = `<button type="button" class="dj-now" aria-expanded="false" aria-controls="dj-actions">
      <span class="dj-title"></span><span class="dj-key"></span><span class="dj-note" hidden></span></button>
    <div class="dj-actions" id="dj-actions" hidden>
      <button type="button" class="dj-btn" data-dj="next">Siguiente</button>
      <button type="button" class="dj-btn" data-dj="close">Cerrar</button>
    </div>`;
  pill.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) return;
    if (btn.dataset.dj === 'next') audio.nextPiece();
    else {
      if (btn.classList.contains('dj-now') && !audio.nowPlaying()) wakeMusic();
      setOpen(btn.dataset.dj !== 'close' && pill.querySelector('.dj-actions').hidden);
    }
  });
  document.body.appendChild(pill);
  // El motor avisa antes de marcar «suena»: se repinta en cuanto termina el aviso.
  stopListening = audio.onPieceChange(() => queueMicrotask(render));
  const app = document.getElementById('app') || document.body;
  let queued = false;
  observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; render(); });
  });
  observer.observe(app, { childList: true });
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
