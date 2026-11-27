// Logros del perfil: una fila de cuatro (las tres últimas conseguidas, con su anillo de oro, plata o bronce, y
// la pendiente más cercana en gris con su avance) y «N de M ›», que abre la pantalla de logros (#logros, en
// achievements.js). Aquí también la hoja de cada logro (qué es, cómo se gana y cuándo), que comparten las dos.

import { esc, longDate, $ } from '../dom.js';
import { medalInfo } from '../../engine/medal-info.js';
import { medalBadge, medalZoom, allMedalIds, medalHow, eyeLabel } from './medals.js';
import { medalTier, interleaveByKind, TIERS, TIER_NAMES } from '../../engine/profile.js';
import { medalProgress, nearestMedal } from '../../engine/medal-near.js';
import { bindSheet } from './profile-sheet.js';

const ROW_GOT = 3; // conseguidas en la fila del perfil (más la más cercana: cuatro)
const ROW_SIZE = 4;
const ARC_PX = 64; // diámetro del arco de avance alrededor del sello de 52 px
const ARC_STROKE = 3;
export const GROUPS = [
  ['artist', 'Pintores'], ['movement', 'Movimientos'], ['streak', 'Rachas'], ['eye', 'Ojo de…'], ['other', 'Retos y metas'],
];
// Subtítulo de un logro que aún no se tiene: dice de qué clase es, sin dar por hecho nada.
const KIND_NAMES = { artist: 'Pintor', movement: 'Movimiento', streak: 'Racha', eye: 'Ojo de…', other: 'Meta' };
export const kindOf = (id) => { const k = id.split('-')[0]; return GROUPS.some(([g]) => g === k) ? k : 'other'; };

// El logro conseguido es un hecho («Veronés, ya lo reconoces») y el pendiente, una meta («Reconocer a Veronés»). Para la hoja.
export const medalName = (ctx, id, has) => {
  const title = medalInfo(id, ctx.index).title;
  if (id.startsWith('streak-')) return `Racha de ${title}`;
  if (!id.startsWith('artist-')) return title;
  return has ? `${title}, ya lo reconoces` : `Reconocer a ${title}`;
};

// Nombre corto para la casilla («Piero», «3 días»): el anillo de metal ya dice si está conseguido.
function shortName(ctx, id) {
  const [kind, ...rest] = id.split('-');
  const a = kind === 'artist' ? ctx.index.artist(rest.join('-')) : null;
  return a ? a.short || a.name : medalInfo(id, ctx.index).title;
}

// Conseguidas (oro primero, las más recientes antes, de clases distintas por turnos) y pendientes.
export function medalList(ctx) {
  const p = ctx.store.get().progress;
  const ids = allMedalIds(ctx.index);
  const got = ids.filter((id) => p.medals[id])
    .sort((a, b) => TIERS.indexOf(medalTier(a)) - TIERS.indexOf(medalTier(b)) || String(p.medals[b]).localeCompare(String(p.medals[a])));
  return { got: interleaveByKind(got), rest: ids.filter((id) => !p.medals[id]), total: ids.length };
}

// Pendiente más cercana ({ id, have, need }) o null.
export const nearest = (ctx) => nearestMedal(ctx.store.get().progress, ctx.index, allMedalIds(ctx.index), ctx.today());

// Anillo metálico alrededor del sello (conseguidos): degradado del metal, no solo un color plano. El
// nombre del metal va en la hoja de cada logro y para lectores de pantalla, no repetido en cada casilla.
export const tierRing = (tier, badge) => `<span class="pf-ring tier-${tier}">${badge}</span>`;

// Arco del avance alrededor de un sello pendiente.
export function progressArc(have, need) {
  const r = (ARC_PX - ARC_STROKE) / 2;
  const c = 2 * Math.PI * r;
  const k = Math.max(0, Math.min(1, need ? have / need : 0));
  const mid = ARC_PX / 2;
  return `<svg class="pf-arc" width="${ARC_PX}" height="${ARC_PX}" viewBox="0 0 ${ARC_PX} ${ARC_PX}" aria-hidden="true" focusable="false">
    <circle class="pf-arc-track" cx="${mid}" cy="${mid}" r="${r}"/>
    <circle class="pf-arc-fill" cx="${mid}" cy="${mid}" r="${r}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - k)).toFixed(2)}" transform="rotate(-90 ${mid} ${mid})"/></svg>`;
}

// Casilla de un logro. `near`: { have, need } para pintar el arco y «12 de 15» en vez del nombre.
export function medalCell(ctx, id, has, near = null) {
  const tier = medalTier(id);
  const badge = medalBadge(ctx, id);
  const name = shortName(ctx, id);
  const status = has ? `${TIER_NAMES[tier]}, conseguida` : near ? `pendiente, ${near.have} de ${near.need}` : 'pendiente';
  const seal = has ? tierRing(tier, badge) : near ? `<span class="pf-near-seal">${progressArc(near.have, near.need)}${badge}</span>` : badge;
  return `<li><button type="button" class="pf-medal tier-${tier} ${has ? 'is-got' : 'is-missing'} ${near ? 'is-near' : ''}" data-action="medal" data-id="${esc(id)}" aria-haspopup="dialog" aria-label="${esc(`${medalName(ctx, id, has)}, ${status}`)}">
      ${seal}<span class="pf-medal-name" aria-hidden="true">${near ? `${near.have} de ${near.need}` : esc(name)}</span></button></li>`;
}

// Fila del perfil: las tres conseguidas más recientes y la más cercana; si falta alguna, pendientes.
export function medalRow(ctx) {
  const p = ctx.store.get().progress;
  const { rest } = medalList(ctx);
  const recent = allMedalIds(ctx.index).filter((id) => p.medals[id])
    .sort((a, b) => String(p.medals[b]).localeCompare(String(p.medals[a]))).slice(0, ROW_GOT);
  const near = nearest(ctx);
  const cells = recent.map((id) => medalCell(ctx, id, true));
  if (near) cells.push(medalCell(ctx, near.id, false, near));
  for (const id of interleaveByKind(rest)) {
    if (cells.length >= ROW_SIZE) break;
    if (id !== near?.id) cells.push(medalCell(ctx, id, false));
  }
  return cells.join('');
}

export function medalsHtml(ctx) {
  const { got, total } = medalList(ctx);
  return `<section class="pf-sec pf-medals-sec" aria-labelledby="pf-medals-h">
    <div class="pf-sec-head"><h2 id="pf-medals-h">Logros</h2>
      <a class="pf-link" href="#logros" aria-label="Todos los logros: ${got.length} de ${total}">${got.length} de ${total}<span class="pf-chev" aria-hidden="true">›</span></a></div>
    <ul class="pf-medals pf-medal-row">${medalRow(ctx)}</ul>
  </section>`;
}

export const medalSheetHtml = () => '<dialog class="card-dialog sheet-dialog medal-dialog" aria-labelledby="medal-dlg-title"></dialog>';

// Hoja de cada logro. Devuelve los manejadores de acciones.
export function wireMedals(ctx, el) {
  const medalDialog = $('.medal-dialog', el);
  const medalSheet = bindSheet(medalDialog);
  return {
    medal: (b) => {
      ctx.audio.sfx('tap');
      const id = b.dataset.id;
      const info = medalInfo(id, ctx.index);
      const date = ctx.store.get().progress.medals[id];
      const eye = id.startsWith('eye-') ? eyeLabel(ctx, id.slice(4)) : null;
      const prog = date ? null : medalProgress(ctx.store.get().progress, ctx.index, id, ctx.today());
      const how = medalHow(id);
      const seal = medalZoom(ctx, id, medalBadge(ctx, id, false, 'lg'));
      const unit = eye ? (eye.total === 1 ? 'cuadro' : 'cuadros') : '';
      medalDialog.innerHTML = `<div class="dlg-body medal-dlg tier-${medalTier(id)} ${date ? 'is-got' : 'is-missing'}">
        ${date ? tierRing(medalTier(id), seal) : seal}
        <h2 id="medal-dlg-title" class="dlg-title">${esc(medalName(ctx, id, Boolean(date)))}</h2>
        <p class="dlg-meta">${esc(date ? info.sub : KIND_NAMES[kindOf(id)])} · ${TIER_NAMES[medalTier(id)]}</p>
        ${date ? `<p class="dlg-hint">Conseguida el ${esc(longDate(date).toLowerCase())}</p>` : how ? `<p class="dlg-hint">${esc(how)}</p>` : ''}
        ${prog ? `<p class="medal-dlg-prog">${prog.have} de ${prog.need}${unit ? ` ${unit}` : ''}</p>` : ''}
        <button class="btn btn-secondary btn-wide" data-action="close-sheet">Cerrar</button>
      </div>`;
      medalSheet.open(b, '[data-action="close-sheet"]');
    },
  };
}
