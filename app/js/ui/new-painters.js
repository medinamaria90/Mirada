// Pintores nuevos en el mapa (engine/roster.js): etiqueta «Nuevo» junto al nombre de cada parada nueva a la vista y,
// la primera vez, una tarjeta breve con «Ver», que lleva el mapa a la primera. Se añade al DOM ya pintado (como el aro
// de niveles): el nodo lleva data-new y su CSS va aparte (css/nuevos.css). Se carga solo si hay pintores nuevos.

import { esc, joinNames, announce } from './dom.js';
import { icons } from './icons.js';
import { loadCss } from './lazy-css.js';
import { newInSight, newToTell } from '../engine/roster-news.js';
import { markRosterTold } from '../engine/roster.js';

const NAMES_MAX = 3;   // en la tarjeta: «Masaccio, Piero della Francesca y 3 más»
const NEW_LABEL = 'Nuevo';
const LEAVE_MS = 220;  // como --dur-pop (salida de la tarjeta)

export const hasFresh = (progress) => Array.isArray(progress.roster?.fresh) && progress.roster.fresh.length > 0;

// Etiqueta en los nodos de pintor (mapa y pantallas de rama). Se puede llamar cada vez que se pinta algo más.
export function tagNewStops(ctx, root) {
  const ids = new Set(newInSight(ctx.store.get().progress, ctx.index));
  if (!ids.size) return;
  loadCss('css/nuevos.css');
  for (const spot of root.querySelectorAll('.stage-spot[data-step^="artist:"]')) {
    const button = spot.querySelector('.stage');
    if (!button || button.dataset.new || !ids.has(spot.dataset.step.slice('artist:'.length))) continue;
    button.dataset.new = '1';
    button.setAttribute('aria-label', `${button.getAttribute('aria-label')}. ${NEW_LABEL}`);
    button.querySelector('.stage-name')?.insertAdjacentHTML('beforeend', ` <span class="stage-new" aria-hidden="true">${NEW_LABEL}</span>`);
  }
}

function namesOf(ctx, ids) {
  const names = ids.map((id) => ctx.index.artist(id)?.name).filter(Boolean);
  return names.length <= NAMES_MAX ? joinNames(names) : joinNames([...names.slice(0, NAMES_MAX - 1), `${names.length - NAMES_MAX + 1} más`]);
}

// Cartel de una rama en el mapa (cada rama lleva el suyo, al final de su desvío).
export const branchSignSelector = (branchId) => `.sign-plate.branch[data-id="${branchId}"]`;

// Dónde está en el mapa: su parada o, si solo es de rama, el desvío de su rama.
function spotOf(ctx, root, id) {
  return root.querySelector(`.stage-spot[data-step="artist:${id}"] .stage`)
    || ctx.index.branchesOf(id).map((b) => root.querySelector(branchSignSelector(b.id))).find(Boolean)
    || null;
}

// Tarjeta del mapa con los pintores nuevos aún no anunciados. Una sola vez por pintor.
export function tellNewPainters(ctx, root) {
  const ids = newToTell(ctx.store.get().progress, ctx.index);
  if (!ids.length || root.querySelector('.news-card')) return;
  ctx.store.update((s) => ({ ...s, progress: markRosterTold(s.progress, ids) }));
  loadCss('css/nuevos.css').then(() => {
    if (!root.isConnected) return;
    const text = `Nuevos pintores en tu camino: ${namesOf(ctx, ids)}`;
    root.insertAdjacentHTML('beforeend', `<aside class="news-card" aria-label="Pintores nuevos">
        <span class="news-icon" aria-hidden="true">${icons.spark(20)}</span>
        <p class="news-text">${esc(text)}</p>
        <button type="button" class="news-see">Ver</button>
        <button type="button" class="news-close" aria-label="Cerrar">${icons.close(18)}</button>
      </aside>`);
    const card = root.querySelector('.news-card');
    const close = () => { card.classList.add('is-leaving'); setTimeout(() => card.remove(), LEAVE_MS); };
    card.querySelector('.news-close').addEventListener('click', () => { ctx.audio.sfx('tap'); close(); });
    card.querySelector('.news-see').addEventListener('click', () => {
      ctx.audio.sfx('tap');
      close();
      // Las épocas lejanas se pintan después: si aún no está, se espera un poco.
      const go = (tries) => {
        const target = ids.map((id) => spotOf(ctx, root, id)).find(Boolean);
        if (!target) { if (tries > 0) setTimeout(() => go(tries - 1), 120); return; }
        target.scrollIntoView({ block: 'center', behavior: ctx.store.get().settings.reducedMotion ? 'auto' : 'smooth' });
        target.focus({ preventScroll: true });
      };
      go(10);
    });
    announce(text);
  }).catch((err) => console.error(err));
}
