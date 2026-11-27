// Pantalla «Logros» (#logros): atrás, «N de M», filtros (todos, conseguidos, pendientes), la tarjeta «El más
// cerca» y los grupos en filas de cuatro. Cada logro abre su hoja (profile-medals.js).

import { esc, onAction, focusHeading, $ } from '../dom.js';
import { bottomNav } from '../shell.js';
import { icons } from '../icons.js';
import { medalList, medalCell, medalName, nearest, progressArc, medalSheetHtml, wireMedals, kindOf, GROUPS } from './profile-medals.js';
import { medalBadge } from './medals.js';

const FILTERS = [['all', 'Todos'], ['got', 'Conseguidos'], ['missing', 'Pendientes']];

export function medalGroupsHtml(ctx, filter) {
  const { got, rest } = medalList(ctx);
  const all = [...got.map((id) => [id, true]), ...rest.map((id) => [id, false])];
  return GROUPS.map(([kind, title]) => {
    const inKind = all.filter(([id]) => kindOf(id) === kind);
    const have = inKind.filter(([, has]) => has).length;
    const shown = inKind.filter(([, has]) => filter === 'all' || (filter === 'got') === has);
    if (!shown.length) return '';
    return `<section class="pf-medal-group" aria-labelledby="mg-${kind}"><h2 id="mg-${kind}" class="pf-group-head">${title} <span class="pf-count">${have} de ${inKind.length}</span></h2>
      <ul class="pf-medals pf-medal-grid">${shown.map(([id, has]) => medalCell(ctx, id, has)).join('')}</ul></section>`;
  }).join('') || '<p class="pf-lead">Nada por aquí todavía</p>';
}

function nearCardHtml(ctx) {
  const near = nearest(ctx);
  if (!near) return '';
  const pct = Math.round((near.have / near.need) * 100);
  const name = medalName(ctx, near.id, false);
  return `<button type="button" class="pf-near-card is-missing" data-action="medal" data-id="${esc(near.id)}" aria-haspopup="dialog" aria-label="${esc(`El más cerca: ${name}, ${near.have} de ${near.need}`)}">
    <span class="pf-near-seal" aria-hidden="true">${progressArc(near.have, near.need)}${medalBadge(ctx, near.id)}</span>
    <span class="pf-near-text" aria-hidden="true"><span class="pf-near-kicker">El más cerca</span><span class="pf-near-name">${esc(name)}</span>
      <span class="pf-near-bar"><span style="width:${pct}%"></span></span><span class="pf-near-count">${near.have} de ${near.need}</span></span>
  </button>`;
}

// Atrás vuelve a donde estabas; con un enlace directo, al perfil.
function back(ctx) {
  if (ctx.prevRoute()) history.back();
  else ctx.go('perfil', { replace: true });
}

export function renderAchievements(ctx, el) {
  const { got, total } = medalList(ctx);
  el.innerHTML = `<div class="page page-profile page-medals"><main class="content pf-logros" id="main">
    <header class="pf-logros-head"><button type="button" class="icon-btn pf-back" aria-label="Atrás">${icons.prev(24)}</button><h1 class="pf-logros-title">Logros</h1><span class="pf-count">${got.length} de ${total}</span></header>
    <div class="pf-logros-body">
      <div class="pf-filters" role="group" aria-label="Filtrar logros">
        ${FILTERS.map(([id, name]) => `<button type="button" class="pf-filter" data-action="medals-filter" data-filter="${id}" aria-pressed="${id === 'all'}">${name}</button>`).join('')}
      </div>
      ${nearCardHtml(ctx)}
      <div class="pf-medal-groups">${medalGroupsHtml(ctx, 'all')}</div>
    </div>
  </main>${bottomNav('profile')}</div>
  ${medalSheetHtml()}`;
  focusHeading(el);
  $('.pf-back', el).addEventListener('click', () => { ctx.audio.sfx('tap'); back(ctx); });
  onAction(el, {
    ...wireMedals(ctx, el),
    'medals-filter': (b) => {
      ctx.audio.sfx('tap');
      $('.pf-medal-groups', el).innerHTML = medalGroupsHtml(ctx, b.dataset.filter);
      el.querySelectorAll('[data-action="medals-filter"]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      const near = $('.pf-near-card', el);
      if (near) near.hidden = b.dataset.filter === 'got'; // «El más cerca» es un pendiente
    },
  });
}
