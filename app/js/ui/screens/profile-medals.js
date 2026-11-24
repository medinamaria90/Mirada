// Logros del perfil: las medallas con su metal (oro, plata, bronce), los pendientes en gris discreto
// y la hoja de cada una (qué es, cómo se gana y cuándo).

import { esc, longDate, $ } from '../dom.js';
import { medalInfo } from '../../engine/medal-info.js';
import { medalBadge, medalZoom, allMedalIds, medalHow, eyeLabel } from './medals.js';
import { medalTier, TIERS, TIER_NAMES } from '../../engine/profile.js';
import { bindSheet } from './profile-sheet.js';

const FIRST_SHOWN = 8; // casillas visibles antes de «Ver todos»

const medalName = (ctx, id, has) => (!has && id.startsWith('eye-') && eyeLabel(ctx, id.slice(4))?.text) || medalInfo(id, ctx.index).title;

// Conseguidas (oro primero, y las más recientes antes) y, detrás, las pendientes: primero los «Ojo de…»
// con avance, que son las más cercanas.
export function medalList(ctx) {
  const p = ctx.store.get().progress;
  const ids = allMedalIds(ctx.index);
  const got = ids.filter((id) => p.medals[id])
    .sort((a, b) => TIERS.indexOf(medalTier(a)) - TIERS.indexOf(medalTier(b)) || String(p.medals[b]).localeCompare(String(p.medals[a])));
  const pending = ids.filter((id) => !p.medals[id]);
  const near = pending.filter((id) => id.startsWith('eye-'))
    .map((id) => ({ id, e: eyeLabel(ctx, id.slice(4)) }))
    .filter((x) => x.e && x.e.top > 0)
    .sort((x, y) => y.e.top / y.e.total - x.e.top / x.e.total)
    .map((x) => x.id);
  return { got, rest: [...near, ...pending.filter((id) => !near.includes(id))], total: ids.length };
}

function cell(ctx, id, has) {
  const tier = medalTier(id);
  return `<li><button type="button" class="pf-medal tier-${tier} ${has ? 'is-got' : 'is-missing'}" data-action="medal" data-id="${esc(id)}" aria-haspopup="dialog">
      ${medalBadge(ctx, id)}<span class="pf-medal-name">${esc(medalName(ctx, id, has))}</span><span class="sr-only">${has ? `${TIER_NAMES[tier]}, conseguida` : 'pendiente'}</span></button></li>`;
}

export function medalCells(ctx, all) {
  const { got, rest } = medalList(ctx);
  const cells = [...got.map((id) => cell(ctx, id, true)), ...rest.map((id) => cell(ctx, id, false))];
  return { html: (all ? cells : cells.slice(0, FIRST_SHOWN)).join(''), hidden: Math.max(0, cells.length - FIRST_SHOWN) };
}

export function medalsHtml(ctx) {
  const { got, total } = medalList(ctx);
  const { html, hidden } = medalCells(ctx, false);
  return `<section class="pf-sec" id="logros" aria-labelledby="pf-medals-h">
    <div class="pf-sec-head"><h2 id="pf-medals-h">Logros</h2><span class="pf-count">${got.length} de ${total}</span></div>
    <ul class="pf-medals">${html}</ul>
    ${hidden ? `<button type="button" class="btn btn-secondary btn-wide pf-more" data-action="more-medals" aria-expanded="false">Ver todos</button>` : ''}
  </section>
  <dialog class="card-dialog medal-dialog" aria-labelledby="medal-dlg-title"></dialog>`;
}

// Hoja de una medalla y el botón «Ver todos». Devuelve los manejadores de acciones.
export function wireMedals(ctx, el) {
  const dialog = $('.medal-dialog', el);
  const sheet = bindSheet(dialog);
  return {
    medal: (b) => {
      ctx.audio.sfx('tap');
      const id = b.dataset.id;
      const info = medalInfo(id, ctx.index);
      const date = ctx.store.get().progress.medals[id];
      const eye = id.startsWith('eye-') ? eyeLabel(ctx, id.slice(4)) : null;
      const how = medalHow(id);
      dialog.innerHTML = `<div class="dlg-body medal-dlg tier-${medalTier(id)} ${date ? 'is-got' : 'is-missing'}">
        ${medalZoom(ctx, id, medalBadge(ctx, id, false, 'lg'))}
        <h2 id="medal-dlg-title" class="dlg-title">${esc(info.title)}</h2>
        <p class="dlg-meta">${esc(info.sub)} · ${TIER_NAMES[medalTier(id)]}</p>
        ${date ? `<p class="dlg-hint">Conseguida el ${esc(longDate(date).toLowerCase())}</p>` : how ? `<p class="dlg-hint">${esc(how)}</p>` : ''}
        ${!date && eye ? `<p class="medal-dlg-prog">${eye.top} de ${eye.total} cuadros</p>` : ''}
        <button class="btn btn-secondary btn-wide" data-action="close-sheet">Cerrar</button>
      </div>`;
      sheet.open(b, '[data-action="close-sheet"]');
    },
    'more-medals': (b) => {
      ctx.audio.sfx('tap');
      const open = b.getAttribute('aria-expanded') !== 'true';
      $('.pf-medals', el).innerHTML = medalCells(ctx, open).html;
      b.setAttribute('aria-expanded', String(open));
      b.textContent = open ? 'Ver menos' : 'Ver todos';
    },
  };
}
