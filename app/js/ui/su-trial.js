// Modo prueba del superusuario: todo desbloqueado sobre una copia en memoria (state/store.js, enterTrial).
// Una franja fija arriba lo avisa y deja volver a la partida real, intacta.

import { trialState } from '../engine/trial.js';
import { loadCss } from './lazy-css.js';

let bar = null;

export const isTrialOn = (ctx) => ctx.store.inTrial();

function mountBar(ctx) {
  if (bar) return;
  loadCss('css/dj.css');
  bar = document.createElement('div');
  bar.className = 'trial-bar';
  bar.innerHTML = `<span class="trial-text">Modo prueba · todo desbloqueado</span>
    <button type="button" class="trial-back">Volver a mi partida</button>`;
  bar.querySelector('.trial-back').addEventListener('click', () => setTrial(ctx, false));
  document.body.prepend(bar);
  document.documentElement.classList.add('has-trial');
}

function unmountBar() {
  bar?.remove();
  bar = null;
  document.documentElement.classList.remove('has-trial');
}

export function setTrial(ctx, on) {
  if (on === ctx.store.inTrial()) return;
  if (on) { ctx.store.enterTrial((st) => trialState(st, ctx.index)); mountBar(ctx); }
  else { ctx.store.exitTrial(); unmountBar(); }
  ctx.go('inicio');
}
