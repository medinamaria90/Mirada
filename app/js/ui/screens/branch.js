// Pantalla de una rama (#rama-<id>): su propio tramo de mapa, con su paisaje, su música y la luz de la hora. Sus
// pintores son las paradas (mismos nodos que el camino común), con el arco de la rama a la entrada y una tablilla por tramo.
// Los que también están en el camino común se ven como
// «En el camino» y llevan a su parada allí. Jugar usa las rutas de siempre (#etapa-<pintor>--<rama>). Arriba,
// «Camino» vuelve al mapa donde estaba. Se entra con un acercamiento desde el desvío (map-zoom.js).

import { esc, onAction, accentStyle, joinNames, $ } from '../dom.js';
import { icons } from '../icons.js';
import { bottomNav } from '../shell.js';
import { coverOf } from '../art.js';
import { stageRoute } from '../router.js';
import { playEra } from '../audio-bridge.js';
import { PLAYLISTS } from '../../audio/playlists.js';
import { branchStatus, branchLockReason, branchProgress } from '../../engine/branches.js';
import { MAP_W, GATE_Y, branchLayout, branchLand, walkedD } from './path-layout.js';
import { trailSvg, tramoSign, branchEntrySign, backSpot, stepName, pct } from './path-signs.js';
import { STATE_LABEL, startedLabel, dotFor, nodeHtml } from './path-nodes.js';
import { placeMap } from './map-scroll.js';
import { rememberMap, recallMap, forgetMap } from './map-memory.js';
import { setMapFocus, takeBranchFocus, showLockNote, watchMapMode, watchLandscapes, levelCard, pathActions, frontSvg } from './path-map.js';
import { startMapLife } from '../map-life.js';
import { addLevelRings } from '../deep-badges.js';
import { watchStoryPrefetch } from '../story-prefetch.js';
import { loadCss } from '../lazy-css.js';

const FOOT_H = 84;                  // alto de la franja bajo el mapa (.path-foot en main.css)

// Música de la rama: su lista si la tiene; si no, la de su época.
export function branchMusic(index, branch) {
  if (PLAYLISTS[branch.id]) return branch.id;
  return index.movement(branch.movementId || branch.opensAt)?.era || 'menu';
}

// Por qué está cerrado un pintor de la rama, en una frase.
function lockText(index, progress, row, branchId) {
  const why = branchLockReason(progress, index, row.artistId, branchId);
  if (why?.pending.length) return `Se abre después de ${joinNames(why.pending.map((s) => stepName(index, s)))}`;
  if (why?.before) return `Se abre al acertar la mitad en ${index.artist(why.before)?.short || index.artist(why.before)?.name}`;
  return 'Aún cerrado';
}

function node(ctx, branch, row, current) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const a = index.artist(row.artistId);
  const dot = dotFor(row.status, coverOf(index, a.id), a.name, p.artists[a.id]?.best);
  if (row.onPath) {
    return nodeHtml({
      cls: 'is-onpath', action: 'path-stop', id: a.id, status: row.status, lock: '',
      label: `${a.name}: en el camino común, ${STATE_LABEL[row.status]}. Ir a su parada`, name: a.name, meta: 'En el camino', dot,
    });
  }
  const lock = row.status === 'locked' ? lockText(index, p, row, branch.id) : '';
  return nodeHtml({
    cls: '', action: 'stage', id: a.id, status: row.status, lock, current,
    label: row.status === 'started' ? startedLabel(a.name, p.artists[a.id]?.best) : `${a.name}, ${STATE_LABEL[row.status]}${lock ? `. ${lock}` : ''}`,
    name: a.name, meta: '', dot,
  });
}

function mapHtml(ctx, branch) {
  const { index } = ctx;
  const rows = branchStatus(ctx.store.get().progress, index, branch.id);
  const layout = branchLayout(index, branch);
  const at = rows.findIndex((r) => !r.onPath && (r.status === 'available' || r.status === 'started'));
  // Cartel de cada tramo (época en la que se abre un grupo de pintores), antes de su primera parada; cuenta los pintores
  // propios de la rama, como su cartel de entrada y la cabecera (los «En el camino» cuentan en el camino común).
  const tramo = (s) => {
    const group = rows.filter((r) => r.opensAt === s.movementId && !r.onPath);
    return tramoSign(s, { total: group.length, got: group.filter((r) => r.status === 'mastered').length }, layout.h, layout.sections.indexOf(s) + 1);
  };
  const items = rows.map((row, i) => {
    const pt = layout.points[i];
    const side = pt.x < MAP_W / 2 ? 'left' : 'right';
    const sec = layout.sections.find((s) => s.at === i);
    const head = sec ? tramo(sec) : '';
    const html = node(ctx, branch, row, i === at);
    return `${head}<li class="stage-spot is-${side}${i === at ? ' is-current' : ''}" data-step="artist:${esc(row.artistId)}" style="left:${pct(pt.x, MAP_W)};top:${pct(pt.y, layout.h)};--room:${((side === 'left' ? MAP_W - pt.x : pt.x) / MAP_W).toFixed(3)}">${html}</li>`;
  }).join('');
  const done = rows.every((r) => r.status === 'mastered');
  const { mastered, total } = branchProgress(ctx.store.get().progress, index, branch.id);
  const sign = branchEntrySign(branch, layout.arch, layout.h, mastered, total);
  const walked = at >= 0 ? walkedD(layout, at) : done ? walkedD(layout) : '';
  const land = branchLand(branch);
  const tint = `var(--map-tint-${esc(land)})`;
  // Bajo la barra de abajo, el sendero sigue hasta el borde (no empieza cortado en seco).
  const foot = `M${layout.start.x} 0V${FOOT_H}`;
  return `<li class="path-foot" style="--era-tint:${tint}" aria-hidden="true">${trailSvg(FOOT_H, foot, [], walked ? foot : '')}</li>
    <li class="path-era has-gate" data-era="${esc(branch.id)}" style="--gate-y:${GATE_Y};--era-tint:${tint};--era-prev:${tint};--era-h:${layout.h};aspect-ratio:${MAP_W}/calc(${layout.h} * var(--k, 1))">
      <img class="path-land" alt="" width="${MAP_W}" height="${layout.h}" decoding="async" data-src="img/mapa/rama-${esc(branch.id)}.svg">
      ${trailSvg(layout.h, layout.trail, [{ spur: layout.back.spur, open: true }], walked)}
      ${frontSvg(layout)}
      ${sign}
      <ol class="stages">${backSpot(layout.back, index.movement(branch.opensAt)?.name || '', layout.h)}${items}</ol>
    </li>`;
}

// Vuelta al camino: atrás si se vino de él (la vista, donde estaba); fork: además, centrada en el desvío de esa rama.
export function returnToMap(ctx, fork = '') {
  ctx.audio.sfx('tap');
  if (fork) setMapFocus(fork, '', true);
  if (ctx.prevRoute() === 'inicio') history.back();
  else ctx.go('inicio');
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
      <span class="branch-tally" aria-label="${mastered} de ${total} pintores">${mastered}/${total}</span>
    </header>
    <main class="content" id="main">
      <ol class="path path-map path-branch" aria-label="Pintores de la rama ${esc(branch.name)}">${mapHtml(ctx, branch)}</ol>
    </main>${bottomNav('home')}</div>`;

  // Al volver al mapa (con «Camino» o con atrás), el desvío de esta rama recibe el foco (la vista, donde estaba).
  setMapFocus(branch.id);
  playEra(branchMusic(index, branch));
  watchLandscapes(el);
  const map = el.querySelector('.path-map');
  const life = startMapLife(map);
  // Al salir, se guarda dónde estaba la vista; al volver (de una ronda, una ficha…), se vuelve ahí. Entrar desde el
  // camino empieza de nuevo en la parada actual.
  const memo = `rama-${branch.id}`;
  if (ctx.prevRoute() === 'inicio') forgetMap(memo);
  const back = recallMap(memo);
  const stops = [() => rememberMap(memo, map), watchMapMode(map), life.stop];
  addLevelRings(ctx, el);
  stops.push(watchStoryPrefetch(el).stop);
  if (ctx.store.get().progress.roster?.fresh?.length) import('../new-painters.js').then((m) => m.tagNewStops(ctx, el)).catch((err) => console.error(err));
  // De vuelta (de una ronda, una ficha…): donde estaba la vista, con el foco en la parada jugada.
  const played = takeBranchFocus();
  if (played || back) stops.push(placeMap(el, { step: played, restore: back }));
  ctx.setCleanup(() => stops.forEach((fn) => fn()));
  if (!played && !back) {
    requestAnimationFrame(() => {
      const target = $('.stage-spot.is-current .stage', el);
      if (target) target.scrollIntoView({ block: 'center' });
      else window.scrollTo(0, document.documentElement.scrollHeight);
    });
  }

  onAction(el, {
    cartel: pathActions(ctx).cartel,
    back: () => returnToMap(ctx),
    // Tablilla «Volver al camino»: siempre al desvío de esta rama (aunque se llegara a ella por otro sitio).
    'back-to-fork': () => returnToMap(ctx, branch.id),
    stage: (b) => {
      if (b.dataset.card) return levelCard(ctx, b, branch.id);
      ctx.audio.sfx('tap');
      if (b.dataset.status === 'locked') return showLockNote(b);
      return ctx.go(stageRoute(b.dataset.id, branch.id));
    },
    // Pintor del camino común: al mapa, centrado en su parada.
    'path-stop': (b) => {
      ctx.audio.sfx('tap');
      setMapFocus(branch.id, `artist:${b.dataset.id}`, true);
      ctx.go('inicio');
    },
  });
}
