// Logros del perfil: una muestra de ocho (de clases distintas) con su anillo de oro, plata o bronce y los
// pendientes en gris; «Ver todos» abre una hoja con grupos y filtros; cada logro abre su hoja (qué es,
// cómo se gana y cuándo).

import { esc, longDate, $ } from '../dom.js';
import { icons } from '../icons.js';
import { medalInfo } from '../../engine/medal-info.js';
import { medalBadge, medalZoom, allMedalIds, medalHow, eyeLabel } from './medals.js';
import { medalTier, interleaveByKind, TIERS, TIER_NAMES } from '../../engine/profile.js';
import { bindSheet } from './profile-sheet.js';

const FIRST_SHOWN = 8; // casillas de la muestra en móvil, antes de «Ver todos»
const DESKTOP_EXTRA = 4; // y las que se añaden en escritorio (CSS: .pf-extra), donde sobra sitio
const GROUPS = [
  ['artist', 'Pintores'], ['movement', 'Movimientos'], ['streak', 'Rachas'], ['eye', 'Ojo de…'], ['other', 'Retos y metas'],
];
const FILTERS = [['all', 'Todos'], ['got', 'Conseguidos'], ['missing', 'Pendientes']];
// Subtítulo de un logro que aún no se tiene: dice de qué clase es, sin dar por hecho nada.
const KIND_NAMES = { artist: 'Pintor', movement: 'Movimiento', streak: 'Racha', eye: 'Ojo de…', other: 'Meta' };
const kindOf = (id) => { const k = id.split('-')[0]; return GROUPS.some(([g]) => g === k) ? k : 'other'; };

// El logro conseguido es un hecho («Veronés dominado») y el pendiente, una meta («Domina a Veronés»).
const medalName = (ctx, id, has) => {
  if (!has && id.startsWith('eye-') && eyeLabel(ctx, id.slice(4))?.text) return eyeLabel(ctx, id.slice(4)).text;
  const title = medalInfo(id, ctx.index).title;
  if (!id.startsWith('artist-')) return title;
  return has ? `${title} dominado` : `Domina a ${title}`;
};

// Conseguidas (oro primero, las más recientes antes, y de clases distintas por turnos) y, detrás, las
// pendientes: primero el «Ojo de…» con más avance, que es el más cercano.
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
  const nearest = near.slice(0, 1);
  return { got: interleaveByKind(got), rest: [...nearest, ...interleaveByKind(pending.filter((id) => !nearest.includes(id)))], total: ids.length };
}

// Anillo metálico alrededor del sello (conseguidos): degradado del metal, no solo un color plano. El
// nombre del metal va en la hoja de cada logro y para lectores de pantalla, no repetido en cada casilla.
export const tierRing = (tier, badge) => `<span class="pf-ring tier-${tier}">${badge}</span>`;

function cell(ctx, id, has) {
  const tier = medalTier(id);
  const badge = medalBadge(ctx, id);
  const name = medalName(ctx, id, has);
  return `<li><button type="button" class="pf-medal tier-${tier} ${has ? 'is-got' : 'is-missing'}" data-action="medal" data-id="${esc(id)}" aria-haspopup="dialog" aria-label="${esc(`${name}, ${has ? `${TIER_NAMES[tier]}, conseguida` : 'pendiente'}`)}">
      ${has ? tierRing(tier, badge) : badge}<span class="pf-medal-name">${esc(name)}</span></button></li>`;
}

export function medalSample(ctx) {
  const { got, rest } = medalList(ctx);
  return [...got.map((id) => cell(ctx, id, true)), ...rest.map((id) => cell(ctx, id, false))]
    .slice(0, FIRST_SHOWN + DESKTOP_EXTRA)
    .map((html, i) => (i < FIRST_SHOWN ? html : html.replace('<li>', '<li class="pf-extra">')))
    .join('');
}

// Hoja «Logros»: por grupos, con el recuento de cada uno, según el filtro.
export function medalGroupsHtml(ctx, filter) {
  const { got, rest } = medalList(ctx);
  const all = [...got.map((id) => [id, true]), ...rest.map((id) => [id, false])];
  return GROUPS.map(([kind, title]) => {
    const inKind = all.filter(([id]) => kindOf(id) === kind);
    const have = inKind.filter(([, has]) => has).length;
    const shown = inKind.filter(([, has]) => filter === 'all' || (filter === 'got') === has);
    if (!shown.length) return '';
    return `<section class="pf-medal-group" aria-labelledby="mg-${kind}"><h3 id="mg-${kind}" class="pf-group-head">${title} <span class="pf-count">${have} de ${inKind.length}</span></h3>
      <ul class="pf-medals">${shown.map(([id, has]) => cell(ctx, id, has)).join('')}</ul></section>`;
  }).join('') || '<p class="pf-lead">Nada por aquí todavía</p>';
}

export function medalsHtml(ctx) {
  const { got, total } = medalList(ctx);
  return `<section class="pf-sec pf-medals-sec" id="logros" aria-labelledby="pf-medals-h">
    <div class="pf-sec-head"><h2 id="pf-medals-h">Logros</h2><span class="pf-count">${got.length} de ${total}</span></div>
    <ul class="pf-medals">${medalSample(ctx)}</ul>
    <button type="button" class="btn btn-secondary btn-wide pf-more" data-action="open-medals" aria-haspopup="dialog">Ver los ${total}</button>
  </section>
  <dialog class="card-dialog sheet-dialog medals-dialog" aria-labelledby="medals-title">
    <div class="dlg-body medals-body">
      <div class="sheet-head"><h2 id="medals-title" class="dlg-title">Logros</h2>
        <button type="button" class="icon-btn" data-action="close-sheet" aria-label="Cerrar">${icons.close(22)}</button></div>
      <div class="segs medals-filters" role="group" aria-label="Filtrar logros">
        ${FILTERS.map(([id, name]) => `<button type="button" class="seg" data-action="medals-filter" data-filter="${id}" aria-pressed="false"><span class="seg-num">${name}</span></button>`).join('')}
      </div>
      <div class="medals-groups"></div>
    </div>
  </dialog>
  <dialog class="card-dialog sheet-dialog medal-dialog" aria-labelledby="medal-dlg-title"></dialog>`;
}

// Hojas de los logros. Devuelve los manejadores de acciones.
export function wireMedals(ctx, el) {
  const medalDialog = $('.medal-dialog', el);
  const medalSheet = bindSheet(medalDialog);
  const listDialog = $('.medals-dialog', el);
  const listSheet = bindSheet(listDialog);
  const paintList = (filter) => {
    $('.medals-groups', listDialog).innerHTML = medalGroupsHtml(ctx, filter);
    listDialog.querySelectorAll('[data-action="medals-filter"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
    listDialog.querySelectorAll('[data-action="medals-filter"]').forEach((b) => b.classList.toggle('is-on', b.dataset.filter === filter));
  };
  return {
    'open-medals': (b) => { ctx.audio.sfx('tap'); paintList('all'); listSheet.open(b, '[data-action="close-sheet"]'); },
    'medals-filter': (b) => { ctx.audio.sfx('tap'); paintList(b.dataset.filter); },
    medal: (b) => {
      ctx.audio.sfx('tap');
      const id = b.dataset.id;
      const info = medalInfo(id, ctx.index);
      const date = ctx.store.get().progress.medals[id];
      const eye = id.startsWith('eye-') ? eyeLabel(ctx, id.slice(4)) : null;
      const how = medalHow(id);
      const seal = medalZoom(ctx, id, medalBadge(ctx, id, false, 'lg'));
      medalDialog.innerHTML = `<div class="dlg-body medal-dlg tier-${medalTier(id)} ${date ? 'is-got' : 'is-missing'}">
        ${date ? tierRing(medalTier(id), seal) : seal}
        <h2 id="medal-dlg-title" class="dlg-title">${esc(medalName(ctx, id, Boolean(date)))}</h2>
        <p class="dlg-meta">${esc(date ? info.sub : KIND_NAMES[kindOf(id)])} · ${TIER_NAMES[medalTier(id)]}</p>
        ${date ? `<p class="dlg-hint">Conseguida el ${esc(longDate(date).toLowerCase())}</p>` : how ? `<p class="dlg-hint">${esc(how)}</p>` : ''}
        ${!date && eye ? `<p class="medal-dlg-prog">${eye.top} de ${eye.total} ${eye.total === 1 ? 'cuadro' : 'cuadros'}</p>` : ''}
        <button class="btn btn-secondary btn-wide" data-action="close-sheet">Cerrar</button>
      </div>`;
      medalSheet.open(b, '[data-action="close-sheet"]');
    },
  };
}
