// Sección «Superusuario» de Ajustes: un interruptor por opción del registro y la salida del modo.

import { SU_OPTIONS } from './su-options.js';
import { isSuperOn, setSuper, SU_EVENT } from './su-mode.js';
import { loadCss } from './lazy-css.js';

const optionHtml = (ctx, o) => `<label class="setting">
    <span>${o.label}</span>
    <input type="checkbox" role="switch" class="switch" data-su="${o.id}" ${o.get(ctx) ? 'checked' : ''}>
  </label>`;

export const superHtml = () => `<section class="su-section" aria-labelledby="su-title" hidden>
    <h3 id="su-title" class="su-title">Superusuario</h3>
    <div class="su-options"></div>
    <button type="button" class="btn btn-quiet btn-wide" data-su-exit>Salir del modo superusuario</button>
  </section>`;

/** Conecta la sección (ya dentro de Ajustes): se muestra u oculta según el modo y aplica los interruptores. */
export function wireSuper(root, ctx, close) {
  const section = root.querySelector('.su-section');
  const box = section.querySelector('.su-options');
  const refresh = () => {
    const on = isSuperOn();
    section.hidden = !on;
    if (!on) return;
    loadCss('css/dj.css');
    box.innerHTML = SU_OPTIONS.map((o) => optionHtml(ctx, o)).join('');
  };
  box.addEventListener('change', (ev) => {
    const opt = SU_OPTIONS.find((o) => o.id === ev.target.dataset.su);
    if (!opt) return;
    opt.set(ctx, ev.target.checked);
    if (opt.leaves) close();
  });
  section.querySelector('[data-su-exit]').addEventListener('click', () => setSuper(false));
  window.addEventListener(SU_EVENT, refresh);
  refresh();
}
