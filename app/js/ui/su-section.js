// Sección «Superusuario» de Ajustes: un interruptor por opción del registro y la salida del modo.

import { SU_OPTIONS } from './su-options.js';
import { isSuperOn, setSuper, SU_EVENT } from './su-mode.js';
import { loadCss } from './lazy-css.js';
import { statsRowHtml, fillVisitors } from './su-stats.js';
import { setTrial } from './su-trial.js';

const optionHtml = (ctx, o) => `<label class="setting">
    <span>${o.label}</span>
    <input type="checkbox" role="switch" class="switch" data-su="${o.id}" ${o.get(ctx) ? 'checked' : ''}>
  </label>`;

// `extra`: acciones de la sección que no son interruptores (p. ej. «Empezar de cero», de profile-settings.js).
export const superHtml = (extra = '') => `<section class="su-section" aria-labelledby="su-title" hidden>
    <h3 id="su-title" class="su-title">Superusuario</h3>
    <div class="su-options"></div>
    ${extra}
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
    box.innerHTML = SU_OPTIONS.map((o) => optionHtml(ctx, o)).join('') + statsRowHtml();
    fillVisitors(box);
  };
  box.addEventListener('change', (ev) => {
    const opt = SU_OPTIONS.find((o) => o.id === ev.target.dataset.su);
    if (!opt) return;
    opt.set(ctx, ev.target.checked);
    if (opt.leaves) close();
  });
  // Al salir del modo, el modo prueba también se acaba: vuelve la partida real.
  section.querySelector('[data-su-exit]').addEventListener('click', () => {
    if (ctx.store.inTrial()) { close(); setTrial(ctx, false); }
    setSuper(false);
  });
  // Se deja de escuchar al cambiar de pantalla: si no, cada visita a Ajustes dejaba su pantalla entera retenida en memoria.
  const stop = new AbortController();
  window.addEventListener(SU_EVENT, refresh, { signal: stop.signal });
  window.addEventListener('hashchange', () => stop.abort(), { once: true, signal: stop.signal });
  refresh();
}
