// Pantalla de una rama (#rama-<id>): su propio tramo de mapa, con su paisaje, su música y la luz de la hora. Sus
// pintores son las paradas (mismos nodos que el camino común); los que también están en el camino común se ven como
// «En el camino» y llevan a su parada allí. Jugar usa las rutas de siempre (#etapa-<pintor>--<rama>). Arriba,
// «Camino» vuelve al mapa centrado en el desvío. Se entra con un acercamiento desde el desvío (map-zoom.js).

import { esc, onAction, accentStyle, joinNames, $ } from '../dom.js';
import { icons } from '../icons.js';
import { bottomNav } from '../shell.js';
import { coverOf } from '../art.js';
import { stageRoute } from '../router.js';
import { playEra } from '../audio-bridge.js';
import { PLAYLISTS } from '../../audio/playlists.js';
import { branchStatus, branchLockReason, branchProgress } from '../../engine/branches.js';
import { isExtraStep } from '../../engine/progress.js';
import { MAP_W, branchLayout, branchLand, walkedD } from './path-layout.js';
import { trailSvg, stepName, pct } from './path-signs.js';
import { STATE_LABEL, metaFor, dotFor, nodeHtml } from './path-nodes.js';
import { setMapFocus, showLockNote, watchMapMode, watchLandscapes, levelCard } from './path-map.js';
import { startMapLife } from '../map-life.js';
import { addLevelRings } from '../deep-badges.js';
import { loadCss } from '../lazy-css.js';

// Música de la rama: su lista si la tiene; si no, la de su época.
export function branchMusic(index, branch) {
  if (PLAYLISTS[branch.id]) return branch.id;
  return index.movement(branch.movementId || branch.opensAt)?.era || 'menu';
}

// Por qué está cerrado un pintor de la rama, en una frase.
function lockText(index, progress, row, branchId) {
  const why = branchLockReason(progress, index, row.artistId, branchId);
  if (why?.pending.length) return `Se abre al dominar a ${joinNames(why.pending.map((s) => stepName(index, s)))}`;
  if (why?.before) return `Se abre con la mitad de aciertos en ${index.artist(why.before)?.short || index.artist(why.before)?.name}`;
  return 'Aún cerrado';
}

function node(ctx, branch, row, current, section) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const a = index.artist(row.artistId);
  const dot = dotFor(row.status, coverOf(index, a.id), a.name);
  if (row.onPath) {
    return nodeHtml({
      cls: 'is-onpath', action: 'path-stop', id: a.id, status: row.status, lock: '', section,
      label: `${a.name}: en el camino común, ${STATE_LABEL[row.status]}. Ir a su parada`, name: a.name, meta: 'En el camino', dot,
    });
  }
  const lock = row.status === 'locked' ? lockText(index, p, row, branch.id) : '';
  return nodeHtml({
    cls: '', action: 'stage', id: a.id, status: row.status, lock, current, section,
    label: `${a.name}, ${STATE_LABEL[row.status]}${lock ? `. ${lock}` : ''}`,
    name: a.name, meta: metaFor(row.status, p.artists[a.id], current), dot,
  });
}

function mapHtml(ctx, branch) {
  const { index } = ctx;
  const rows = branchStatus(ctx.store.get().progress, index, branch.id);
  const layout = branchLayout(index, branch);
  const at = rows.findIndex((r) => !r.onPath && (r.status === 'available' || r.status === 'started'));
  const sectionAt = new Map(layout.sections.map((s) => {
    // Las paradas extra (engine/roster.js) no cuentan en el tramo.
    const group = rows.filter((r) => r.opensAt === s.movementId && !isExtraStep(ctx.store.get().progress, { type: 'artist', id: r.artistId }));
    return [s.at, { name: s.name, total: group.length, got: group.filter((r) => r.status === 'mastered').length }];
  }));
  const items = rows.map((row, i) => {
    const pt = layout.points[i];
    const side = pt.x < MAP_W / 2 ? 'left' : 'right';
    const sec = sectionAt.get(i);
    const head = sec ? `<li class="sr-only">Tramo ${esc(sec.name)}: ${sec.got} de ${sec.total} dominados</li>` : '';
    const html = node(ctx, branch, row, i === at, sec);
    return `${head}<li class="stage-spot is-${side}${i === at ? ' is-current' : ''}" data-step="artist:${esc(row.artistId)}" style="left:${pct(pt.x, MAP_W)};top:${pct(pt.y, layout.h)};--room:${((side === 'left' ? MAP_W - pt.x : pt.x) / MAP_W).toFixed(3)}">${html}</li>`;
  }).join('');
  const done = rows.every((r) => r.status === 'mastered');
  const walked = at >= 0 ? walkedD(layout, at) : done ? walkedD(layout) : '';
  const land = branchLand(branch);
  const tint = `var(--map-tint-${esc(land)})`;
  return `<li class="path-foot" style="--era-tint:${tint}" aria-hidden="true"></li>
    <li class="path-era" data-era="${esc(branch.id)}" style="--era-tint:${tint};--era-prev:${tint};--era-h:${layout.h};aspect-ratio:${MAP_W}/calc(${layout.h} * var(--k, 1))">
      <img class="path-land" alt="" width="${MAP_W}" height="${layout.h}" decoding="async" data-src="img/mapa/rama-${esc(branch.id)}.svg">
      ${trailSvg(layout.h, layout.trail, [], walked)}
      <ol class="stages">${items}</ol>
    </li>`;
}

export async function renderBranch(ctx, el, branchId) {
  const { index } = ctx;
  const branch = index.branch(branchId);
  if (!branch) return ctx.go('inicio', { replace: true });
  await loadCss('css/rama.css');
  if (!el.isConnected) return null;
  const accent = index.movement(branch.movementId || branch.opensAt)?.accent;
  const { mastered, total } = branchProgress(ctx.store.get().progress, index, branch.id);
  el.innerHTML = `<div class="page page-home page-branch" style="${accent ? accentStyle(accent) : ''}">
    <header class="topbar branch-bar">
      <button type="button" class="branch-back" data-action="back" aria-label="Volver al camino">${icons.prev(20)}<span>Camino</span></button>
      <h1 class="branch-title">${esc(branch.name)}</h1>
      <span class="branch-tally" aria-label="${mastered} de ${total} dominados">${mastered}/${total}</span>
    </header>
    <main class="content" id="main">
      <ol class="path path-map path-branch" aria-label="Pintores de la rama ${esc(branch.name)}">${mapHtml(ctx, branch)}</ol>
    </main>${bottomNav('home')}</div>`;

  // Al volver al mapa (con «Camino» o con atrás), se centra en el desvío de esta rama.
  setMapFocus(branch.id);
  playEra(branchMusic(index, branch));
  watchLandscapes(el);
  const map = el.querySelector('.path-map');
  const life = startMapLife(map);
  const stops = [watchMapMode(map), life.stop];
  addLevelRings(ctx, el);
  if (ctx.store.get().progress.roster?.fresh?.length) import('../new-painters.js').then((m) => m.tagNewStops(ctx, el)).catch((err) => console.error(err));
  ctx.setCleanup(() => stops.forEach((fn) => fn()));
  requestAnimationFrame(() => {
    const target = $('.stage-spot.is-current .stage', el);
    if (target) target.scrollIntoView({ block: 'center' });
    else window.scrollTo(0, document.documentElement.scrollHeight);
  });

  onAction(el, {
    back: () => {
      ctx.audio.sfx('tap');
      if (ctx.prevRoute() === 'inicio') history.back();
      else ctx.go('inicio');
    },
    stage: (b) => {
      if (b.dataset.card) return levelCard(ctx, b, branch.id);
      ctx.audio.sfx('tap');
      if (b.dataset.status === 'locked') return showLockNote(b);
      return ctx.go(stageRoute(b.dataset.id, branch.id));
    },
    // Pintor del camino común: al mapa, centrado en su parada.
    'path-stop': (b) => {
      ctx.audio.sfx('tap');
      setMapFocus(branch.id, `artist:${b.dataset.id}`);
      ctx.go('inicio');
    },
  });
}
