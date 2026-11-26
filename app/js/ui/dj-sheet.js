// Puerta del modo «afinar música»: cinco toques seguidos (en menos de 3 s) en el título de Ajustes
// abren esta hoja; con el código (1538, el año de «Guárdame las vacas») se enciende, y aquí mismo se apaga.

import { icons } from './icons.js';
import { bindSheet } from './screens/profile-sheet.js';
import { isDjOn, setDj } from './dj-mode.js';
import { loadCss } from './lazy-css.js';

const TAPS = 5;
const TAP_WINDOW_MS = 3000;
const CODE = '1538';

const sheetHtml = () => `<dialog class="card-dialog sheet-dialog dj-sheet" aria-labelledby="dj-title">
    <div class="dlg-body">
      <div class="sheet-head"><h2 id="dj-title" class="dlg-title">Afinar música</h2>
        <button type="button" class="icon-btn" data-action="close-sheet" aria-label="Cerrar">${icons.close(22)}</button></div>
      <form class="dj-code" method="dialog">
        <input class="pf-input" name="code" inputmode="numeric" autocomplete="off" maxlength="8" aria-label="Código">
        <p class="dj-wrong" role="alert" hidden>Ese no es</p>
        <button type="submit" class="btn btn-primary btn-wide">Entrar</button>
      </form>
      <label class="setting dj-switch" hidden>
        <span>Afinar música</span>
        <input type="checkbox" role="switch" class="switch" checked>
      </label>
    </div>
  </dialog>`;

function showState(dialog) {
  const on = isDjOn();
  dialog.querySelector('.dj-code').hidden = on;
  dialog.querySelector('.dj-switch').hidden = !on;
  dialog.querySelector('.switch').checked = on;
}

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
    setDj(true);
    showState(dialog);
  });
  dialog.querySelector('.switch').addEventListener('change', (ev) => {
    setDj(ev.target.checked);
    if (!ev.target.checked) { input.value = ''; showState(dialog); input.focus(); }
  });
  showState(dialog);
  sheet.open(opener, isDjOn() ? '.switch' : '.pf-input');
}

/** Cuenta los toques en `target`; al quinto seguido abre la hoja. */
export function bindDjTaps(target) {
  let taps = [];
  target.addEventListener('click', () => {
    const now = Date.now();
    taps = [...taps.filter((t) => now - t < TAP_WINDOW_MS), now];
    if (taps.length < TAPS) return;
    taps = [];
    openSheet(target);
  });
}
