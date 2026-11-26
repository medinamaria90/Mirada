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

const pieceLine = (info) => [info.title, info.author].filter(Boolean).join(' · ');

function render(info) {
  if (!pill) return;
  pill.hidden = !info;
  if (!info) return;
  pill.querySelector('.dj-title').textContent = pieceLine(info);
  pill.querySelector('.dj-key').textContent = `${info.key} · ${info.role}`;
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
      <span class="dj-title"></span><span class="dj-key"></span></button>
    <div class="dj-actions" id="dj-actions" hidden>
      <button type="button" class="dj-btn" data-dj="next">Siguiente</button>
      <button type="button" class="dj-btn" data-dj="close">Cerrar</button>
    </div>`;
  pill.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) return;
    if (btn.dataset.dj === 'next') audio.nextPiece();
    else setOpen(btn.dataset.dj !== 'close' && pill.querySelector('.dj-actions').hidden);
  });
  document.body.appendChild(pill);
  stopListening = audio.onPieceChange(render);
  render(audio.nowPlaying());
}

function unmountPill() {
  stopListening?.();
  stopListening = null;
  pill?.remove();
  pill = null;
}

/** Enciende o apaga el modo (y lo recuerda). */
export function setDj(on) {
  saveDj(on);
  if (on) mountPill();
  else unmountPill();
}

/** Al arrancar: si el modo estaba encendido, monta la pastilla. */
export function startDjIfOn() {
  if (isDjOn()) mountPill();
}
