// Puerta del modo superusuario: cinco toques seguidos (en menos de 3 s) en el título de Ajustes
// abren esta hoja; con el código (1612, elegido por María) se activa la sección «Superusuario» de Ajustes.

import { icons } from './icons.js';
import { bindSheet } from './screens/profile-sheet.js';
import { isSuperOn, setSuper } from './su-mode.js';
import { loadCss } from './lazy-css.js';

const TAPS = 5;
const TAP_WINDOW_MS = 3000;
const CODE = '1612';

const sheetHtml = () => `<dialog class="card-dialog sheet-dialog dj-sheet" aria-labelledby="dj-title">
    <div class="dlg-body">
      <div class="sheet-head"><h2 id="dj-title" class="dlg-title">Código</h2>
        <button type="button" class="icon-btn" data-action="close-sheet" aria-label="Cerrar">${icons.close(22)}</button></div>
      <form class="dj-code" method="dialog">
        <input class="pf-input" name="code" inputmode="numeric" autocomplete="off" maxlength="8" aria-label="Código">
        <p class="dj-wrong" role="alert" hidden>Ese no es</p>
        <button type="submit" class="btn btn-primary btn-wide">Entrar</button>
      </form>
    </div>
  </dialog>`;

function openSheet(opener) {
  loadCss('css/dj.css');
  document.body.insertAdjacentHTML('beforeend', sheetHtml());
  const dialog = document.body.lastElementChild;
  const sheet = bindSheet(dialog);
  const input = dialog.querySelector('.pf-input');
  const wrong = dialog.querySelector('.dj-wrong');
  dialog.addEventListener('close', () => dialog.remove());
  dialog.querySelector('.dj-code').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const ok = input.value.trim() === CODE;
    wrong.hidden = ok;
    if (!ok) { input.select(); return; }
    setSuper(true);
    sheet.close();
  });
  sheet.open(opener, '.pf-input');
}

/** Cuenta los toques en `target`; al quinto seguido pide el código (si ya eres superusuario, no hace nada). */
export function bindDjTaps(target) {
  let taps = [];
  target.addEventListener('click', () => {
    const now = Date.now();
    taps = [...taps.filter((t) => now - t < TAP_WINDOW_MS), now];
    if (taps.length < TAPS) return;
    taps = [];
    if (!isSuperOn()) openSheet(target);
  });
}
