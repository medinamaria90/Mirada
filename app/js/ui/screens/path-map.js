// Mapa del camino (portada): el sendero serpentea de abajo arriba por un paisaje de época; cada parada es
// un nodo redondo con el cuadro dentro. Abajo, el hito de salida; por época, un tramo con su paisaje (SVG
// aparte, cargado al acercarse), el sendero, el cartel de la época al borde del camino, los rótulos de tramo,
// los nodos y los desvíos de las ramas; arriba del todo, «Tu museo». El DOM va en orden cronológico
// (salida primero) y el CSS lo invierte (column-reverse): el tabulador y el lector de pantalla recorren el
// camino en el orden del juego. Trazado en path-layout.js; carteles y desvíos en path-signs.js.

import { placeMap } from './map-scroll.js';
import { esc, accentStyle, announce, plural, joinNames, $ } from '../dom.js';
import { icons } from '../icons.js';
import { coverOf } from '../art.js';
import { branchRoute } from '../router.js';
import { zoomInto } from '../map-zoom.js';
import { STATE_LABEL, DORMANT_TEXT, metaFor, dotFor, nodeHtml } from './path-nodes.js';
import {
  artistStatus, salaStatus, movementStatus, isReviewUnlocked, hasMovementReview, nextStep, stepStatus, isPathMastered,
} from '../../engine/progress.js';
import { isGalleryOpen, galleryWorks } from '../../engine/goals.js';
import { isDormant } from '../../engine/review.js';
import { salaLearnWorks } from '../../engine/catalog.js';
import { MAP_W, STEP, SIDE_X, pathLayout, eraLayout, walkedD } from './path-layout.js';
import { trailSvg, eraSign, startBlock, museumBlock, branchSpot, branchGroupSpot, branchState, tramoState, stepName, ofEra, pct } from './path-signs.js';

export { MAP_W, STEP, pathLayout, eraLayout, DORMANT_TEXT };
export { watchLandscapes } from '../map-land.js';

// ---------- HTML ----------

// Parada actual y la siguiente cerrada (algo más presente que el resto de lo cerrado).
function mapKeys(ctx) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const current = nextStep(p, index);
  const at = current ? index.steps.indexOf(current) : -1;
  const after = at >= 0 ? index.steps.slice(at + 1).find((s) => stepStatus(p, index, s) === 'locked') : null;
  return { current: current ? `${current.type}:${current.id}` : '', next: after ? `${after.type}:${after.id}` : '', era: current ? current.movementId : '' };
}

// lazy: solo se pintan del todo la época actual y sus vecinas; las demás quedan como hueco de su altura y
// fillPendingEras las rellena después, una por tarea (el primer pintado no bloquea en móviles lentos).
const NEAR_ERAS = 0;
// Rama en la que centrar el mapa al volver (de su pantalla o tras una ronda de rama) o, si se da, una parada
// («artist:<id>», desde un pintor «En el camino» de una rama).
let focusBranch = '';
let focusStep = '';
export const setMapFocus = (branchId, step = '') => { focusBranch = branchId || ''; focusStep = step; };
export function renderPathMap(ctx, { lazy = false } = {}) {
  const { index } = ctx;
  const layout = pathLayout(index);
  const keys = mapKeys(ctx);
  const here = Math.max(0, layout.eras.findIndex((e) => e.id === keys.era));
  const stepEra = focusStep.startsWith('artist:') ? index.movementOf(focusStep.slice(7))?.id : focusStep.startsWith('sala:') ? focusStep.slice(5) : '';
  const focus = stepEra ? layout.eras.findIndex((e) => e.id === stepEra)
    : focusBranch ? layout.eras.findIndex((e) => e.branches.some((b) => b.id === focusBranch || b.members?.some((x) => x.id === focusBranch))) : -1;
  const html = layout.eras.map((era, i) => (!lazy || Math.abs(i - here) <= NEAR_ERAS || i === focus
    ? eraBlock(ctx, era, layout.eras[i - 1], keys)
    : `<li class="path-era is-pending" data-era="${esc(era.id)}" style="--era-tint:var(--map-tint-${esc(era.id)});aspect-ratio:${MAP_W}/calc(${era.h} * var(--k, 1))"></li>`)).join('');
  const firstTint = layout.eras.length ? `var(--map-tint-${esc(layout.eras[0].id)})` : 'transparent';
  const done = isPathMastered(ctx.store.get().progress, index);
  return `${startBlock(layout.start, firstTint)}${html}${museumBlock(layout.museum, index.visibleMovements.length, done)}`;
}

// Rellena las épocas pendientes, la más cercana a la actual primero, una por tarea. Devuelve cómo pararlo.
export function fillPendingEras(ctx, root, onFill = () => {}) {
  const layout = pathLayout(ctx.index);
  const keys = mapKeys(ctx);
  const here = Math.max(0, layout.eras.findIndex((e) => e.id === keys.era));
  const queue = layout.eras.map((era, i) => ({ era, i })).filter(({ era }) => root.querySelector(`.path-era.is-pending[data-era="${era.id}"]`))
    .sort((x, y) => Math.abs(x.i - here) - Math.abs(y.i - here));
  let timer = null;
  const step = () => {
    const next = queue.shift();
    if (!next) return;
    const li = root.querySelector(`.path-era.is-pending[data-era="${next.era.id}"]`);
    if (li) {
      li.insertAdjacentHTML('afterend', eraBlock(ctx, next.era, layout.eras[next.i - 1], keys));
      li.remove();
      onFill();
    }
    timer = setTimeout(step, 0);
  };
  timer = setTimeout(step, 0);
  return () => clearTimeout(timer);
}

function eraBlock(ctx, era, prevEra, keys) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const movement = index.movement(era.id);
  const status = movementStatus(p, index, era.id);
  const sala = index.isSala(era.id);
  const sealed = Boolean(p.medals[`movement-${era.id}`]);
  const sectionAt = new Map(era.sections.map((s) => [s.at, sectionInfo(ctx, era.id, s)]));
  const nodes = sala ? [salaNode(ctx, movement, keys)] : index.stageArtists(movement.id).map((a, i) => artistNode(ctx, a, keys, sectionAt.get(i)));
  if (!sala && hasMovementReview(index, era.id)) nodes.push(reviewNode(ctx, movement, status === 'locked'));
  const stOf = (id, extra) => (extra ? tramoState(p, index, index.branch(id), era.id) : branchState(p, index, index.branch(id)));
  const branches = era.branches.map((b) => (b.group
    ? { spot: b, group: b.members.filter((x) => index.branch(x.id)).map((x) => stOf(x.id, x.extra)) }
    : { spot: b, branch: index.branch(b.id) })).filter((b) => b.group || b.branch)
    .map((b) => (b.group ? { ...b, st: { open: b.group.some((x) => x.open) } } : { ...b, st: stOf(b.spot.id, b.spot.extra) }));
  // Orden del DOM = orden de lectura y de tabulación: por cada parada, el rótulo de su tramo (para el lector),
  // la parada y, si sale de ella, el desvío de su rama; la sala, al final.
  const items = nodes.map((node, i) => {
    const pt = era.points[i];
    const side = pt.x < MAP_W / 2 ? 'left' : 'right';
    // --room: parte del ancho que queda hacia donde cuelga el nombre (el rótulo nunca pasa del margen de 8 px).
    const state = node.key === keys.current ? ' is-current' : node.key === keys.next ? ' is-next' : '';
    const sec = sectionAt.get(i);
    const head = sec ? `<li class="sr-only">Tramo ${esc(sec.name)}: ${sec.got} de ${sec.total} dominados</li>` : '';
    const spur = branches.filter((b) => b.spot.at === i).map((b) => (b.group ? branchGroupSpot(b.spot, b.group, era.id, era.h) : branchSpot(b.spot, b.branch, b.st, index, era.h))).join('');
    return `${head}<li class="stage-spot is-${side}${state}" data-step="${esc(node.key)}" style="left:${pct(pt.x, MAP_W)};top:${pct(pt.y, era.h)};--room:${((side === 'left' ? MAP_W - pt.x : pt.x) / MAP_W).toFixed(3)}">${node.html}</li>${spur}`;
  }).join('');
  const last = era.points[era.points.length - 1];
  const gallery = isGalleryOpen(p, index, era.id) ? galleryNode(ctx, movement, last, era.h) : '';
  const steps = nodes.filter((n) => n.type !== 'review');
  const sign = eraSign({
    movement, status, sealed, sign: era.sign, h: era.h,
    done: steps.filter((n) => n.status === 'mastered').length, total: steps.length,
    prevName: prevEra ? index.movement(prevEra.id).name : '',
  });
  const prevTint = prevEra ? `var(--map-tint-${esc(prevEra.id)})` : 'var(--era-tint)';
  return `<li class="path-era movement movement-${status}${sala ? ' movement-sala' : ''}${sealed ? ' is-sealed' : ''}" data-era="${esc(era.id)}" style="${accentStyle(movement.accent)};--era-tint:var(--map-tint-${esc(era.id)});--era-prev:${prevTint};--era-h:${era.h};aspect-ratio:${MAP_W}/calc(${era.h} * var(--k, 1))">
    <img class="path-land" alt="" width="${MAP_W}" height="${era.h}" decoding="async" data-src="img/mapa/${esc(era.id)}.svg">
    ${trailSvg(era.h, era.trail, branches.map((b) => ({ spur: b.spot.spur, tail: b.spot.tail, open: b.st.open })), walked(index, era, nodes, keys))}
    ${sign}
    <ol class="stages">${items}${gallery}</ol>
  </li>`;
}

// Sendero ya recorrido del tramo (como en Duolingo): entero en las épocas pasadas, hasta la parada actual en la
// suya y nada en las que vienen.
function walked(index, era, nodes, keys) {
  if (!keys.current) return walkedD(era);
  const order = (id) => index.visibleMovements.findIndex((m) => m.id === id);
  const diff = order(era.id) - order(keys.era);
  if (diff) return diff < 0 ? walkedD(era) : '';
  const at = nodes.findIndex((n) => n.key === keys.current);
  return at < 0 ? '' : walkedD(era, at);
}

// Tramo de la época: nombre y dominados. Se ve como un rótulo pequeño sobre el nombre de su primera parada
// (lado ancho, nunca sobre el sendero) y el lector lo oye antes de sus paradas.
function sectionInfo(ctx, movementId, s) {
  const p = ctx.store.get().progress;
  const group = ctx.index.stageArtists(movementId).filter((a) => a.section === s.name);
  return { name: s.name, total: group.length, got: group.filter((a) => artistStatus(p, ctx.index, a.id) === 'mastered').length };
}

function artistNode(ctx, artist, keys, section) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const status = artistStatus(p, index, artist.id);
  const key = `artist:${artist.id}`;
  const prevStep = index.steps[index.stepIndex('artist', artist.id) - 1];
  const dormant = status === 'mastered' && isDormant(p, artist.id, ctx.today ? ctx.today() : null);
  const lock = prevStep ? `Se abre con la mitad de aciertos en ${stepName(index, prevStep)}` : '';
  // Cerrado y lejos: solo el nombre corto (pesa menos); la siguiente parada, con el nombre entero.
  const quiet = status === 'locked' && key !== keys.next;
  const html = nodeHtml({
    cls: dormant ? 'is-dormant' : '', action: 'stage', id: artist.id, status, lock, section, current: key === keys.current,
    label: `${artist.name}, ${STATE_LABEL[status]}${status === 'locked' && lock ? `. ${lock}` : ''}${dormant ? `. ${DORMANT_TEXT}` : ''}`,
    name: quiet ? artist.short || artist.name : artist.name, meta: dormant ? DORMANT_TEXT : metaFor(status, p.artists[artist.id], key === keys.current),
    dot: dotFor(status, coverOf(index, artist.id), artist.name),
  });
  return { type: 'artist', key, status, html };
}

function salaNode(ctx, movement, keys) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const status = salaStatus(p, index, movement.id);
  const key = `sala:${movement.id}`;
  const prev = index.steps[index.stepIndex('sala', movement.id) - 1];
  const lock = prev ? `Se abre con la mitad de aciertos en ${stepName(index, prev)}` : '';
  const html = nodeHtml({
    cls: 'stage-sala', action: 'sala', id: movement.id, status, lock, current: key === keys.current,
    label: `Conoce el movimiento ${movement.name}, ${STATE_LABEL[status]}${status === 'locked' && lock ? `. ${lock}` : ''}`,
    name: 'Conoce el movimiento', meta: metaFor(status, p.salas?.[movement.id], key === keys.current),
    dot: dotFor(status, salaCover(index, movement.id), movement.name),
  });
  return { type: 'sala', key, status, html };
}

// Pintores de la época aún sin dominar: todos (para el lector) y en corto para la nota al tocar
// («Leonardo y Veronés», «Botticelli, Rafael y 4 más»).
const PENDING_NAMES_MAX = 2;
function pendingOf(ctx, progress, movementId) {
  return ctx.index.stepsOf(movementId)
    .filter((s) => s.type === 'artist' && artistStatus(progress, ctx.index, s.id) !== 'mastered')
    .map((s) => stepName(ctx.index, s));
}
export function pendingNames(names) {
  if (names.length <= PENDING_NAMES_MAX) return joinNames(names);
  return joinNames([...names.slice(0, PENDING_NAMES_MAX), `${names.length - PENDING_NAMES_MAX} más`]);
}

// quiet: época aún cerrada; el repaso solo enseña su icono (lo lejano, en silencio).
function reviewNode(ctx, movement, quiet = false) {
  const p = ctx.store.get().progress;
  const open = isReviewUnlocked(p, ctx.index, movement.id);
  const best = p.reviews[movement.id]?.best;
  const medal = (best || 0) >= 0.75;
  const status = medal ? 'mastered' : open ? 'available' : 'locked';
  const pending = open ? [] : pendingOf(ctx, p, movement.id);
  const lock = pending.length ? `Domina a ${pendingNames(pending)} para abrirlo` : 'Se abre al dominar a todos sus pintores';
  const name = pending.length && !quiet ? `Repaso · ${pending.length === 1 ? 'falta 1' : `faltan ${pending.length}`}` : 'Repaso';
  const meta = best ? `Mejor: ${Math.round(best * 100)}\u00a0%` : '';
  const icon = medal ? icons.medal(22) : icons.arch(open ? 24 : 18);
  const label = `Repaso ${ofEra(movement.name)}${open ? '' : `, bloqueado. Para abrirlo, domina a ${joinNames(pending)}`}`;
  const html = `<button class="stage stage-review is-${status}" data-action="review" data-id="${esc(movement.id)}" data-status="${open ? 'open' : 'locked'}"
        aria-label="${esc(label)}" data-lock="${esc(lock)}">
        <span class="stage-dot">${icon}${open ? '' : `<span class="stage-lock">${icons.lock(10)}</span>`}</span>
        <span class="stage-text"><span class="stage-name">${esc(name)}</span>${meta ? `<span class="stage-meta">${esc(meta)}</span>` : ''}</span>
      </button>`;
  return { type: 'review', key: `review:${movement.id}`, status, html };
}

// Sala de la época dominada (galería): junto a la última parada, en el margen estrecho.
function galleryNode(ctx, movement, last, h) {
  const n = galleryWorks(ctx.store.get().progress, ctx.index, movement.id).length;
  const side = last.x < MAP_W / 2 ? 'left' : 'right';
  return `<li class="stage-spot stage-spot-aside is-${side}" style="left:${pct(SIDE_X[side], MAP_W)};top:${pct(last.y, h)}">
      <button class="stage stage-gallery is-mastered" data-action="gallery" data-id="${esc(movement.id)}" aria-label="Sala ${esc(ofEra(movement.name))}">
        <span class="stage-dot">${icons.laurel(24)}</span>
        <span class="stage-text"><span class="stage-name">Sala</span>${n ? `<span class="stage-meta">${plural(n, 'obra', 'obras')}</span>` : ''}</span>
      </button></li>`;
}

export function salaCover(index, movementId) {
  const works = salaLearnWorks(index, movementId);
  return works.slice().sort((a, b) => (b.fame || 0) - (a.fame || 0))[0] || null;
}

// ---------- comportamiento (necesita DOM) ----------

// La hoja del mapa (época cerrada, rama) se carga al primer toque: no cuenta en el arranque.
const sheet = (ctx, fn, b) => {
  ctx.audio.sfx('tap');
  import('../map-sheet.js').then((m) => m[fn](ctx, b.dataset.id, b)).catch((err) => console.error(err));
};

// Acciones de las paradas, para onAction en la portada.
export function pathActions(ctx) {
  const guarded = (route) => (b) => {
    ctx.audio.sfx('tap');
    if (b.dataset.status === 'locked') return showLockNote(b);
    return ctx.go(`${route}-${b.dataset.id}`);
  };
  return {
    // Dominado con niveles «a fondo» por hacer (aro): a sus etapas, en la ficha.
    stage: (b, ev) => (b.dataset.deep ? (ctx.audio.sfx('tap'), ctx.go(`pintor-${b.dataset.id}-etapas`)) : guarded('etapa')(b, ev)),
    sala: guarded('sala'),
    review: guarded('repaso'),
    intro: (b) => {
      ctx.audio.sfx('tap');
      ctx.go(`movimiento-${b.dataset.id}`);
    },
    gallery: (b) => {
      ctx.audio.sfx('tap');
      ctx.go(`galeria-${b.dataset.id}`);
    },
    'era-lock': (b) => sheet(ctx, 'openEraSheet', b),
    start: (b) => sheet(ctx, 'openIntroSheet', b),
    'goto-current': (_, ev) => {
      ev.preventDefault();
      const target = $('.stage-spot.is-current .stage') || $('.stage.is-available, .stage.is-started');
      if (!target) return;
      target.scrollIntoView({ block: 'center' });
      target.focus({ preventScroll: true });
    },
    // Rama abierta: se entra en su pantalla con un acercamiento; cerrada, una nota con lo que falta.
    branch: (b) => {
      ctx.audio.sfx('tap');
      if (b.dataset.status === 'locked') return showLockNote(b);
      return zoomInto(b, () => ctx.go(branchRoute(b.dataset.id)));
    },
    branches: (b) => sheet(ctx, 'openEraBranchesSheet', b),
  };
}

const NOTE_MS = 4500;   // da tiempo a leerla con la letra grande
export function showLockNote(button) {
  let note = button.parentElement.querySelector('.lock-note');
  if (!note) {
    note = document.createElement('p');
    note.className = 'lock-note';
    note.setAttribute('aria-hidden', 'true');
    button.after(note);
  }
  note.textContent = button.dataset.lock || 'Aún bloqueado';
  note.style.translate = '';
  note.classList.add('is-visible');
  // Dentro de la pantalla: si asoma por un lado, se corre.
  const r = note.getBoundingClientRect();
  const shift = r.left < 8 ? 8 - r.left : r.right > window.innerWidth - 8 ? window.innerWidth - 8 - r.right : 0;
  if (shift) note.style.translate = `${Math.round(shift)}px 0`;
  announce(note.textContent);
  clearTimeout(note._t);
  note._t = setTimeout(() => note.classList.remove('is-visible'), NOTE_MS);
}

// Modo del mapa: ilustrado hasta el 150 % de letra; por encima (o en una ventana de menos de 300 px, como un zoom
// del 200 %), el camino en línea. Sigue a la letra y a la ventana mientras la pantalla está abierta. Devuelve cómo
// dejar de vigilarlo.
const LINEAR_SCALE = 1.5;
const LINEAR_WIDTH = 340;   // a 320 px el mapa ilustrado no deja 8 px de margen a los rótulos
const TALL_POWER = 1.8;
export function watchMapMode(map) {
  if (!map) return () => {};
  const fit = () => {
    const scale = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
    const linear = scale > LINEAR_SCALE || window.innerWidth < LINEAR_WIDTH;
    map.classList.toggle('is-linear', linear);
    // Ilustrado con letra grande: el trazado se estira en vertical algo más que la letra (los rótulos, más altos y
    // más largos, caben entre el sendero que sube y el que baja sin montarse).
    const k = linear ? 1 : Math.max(1, scale) ** TALL_POWER;
    map.classList.toggle('is-tall', k > 1);
    map.style.setProperty('--k', String(Math.round(k * 1000) / 1000));
  };
  fit();
  if (typeof ResizeObserver !== 'function') return () => {};
  // Una sonda de 1rem: cambia de tamaño cuando cambia la letra (ajuste del navegador o del sistema).
  const probe = document.createElement('span');
  probe.className = 'map-probe';
  probe.setAttribute('aria-hidden', 'true');
  map.before(probe);
  const ro = new ResizeObserver(fit);
  ro.observe(probe);
  ro.observe(document.documentElement);
  return () => { ro.disconnect(); probe.remove(); };
}

// Al abrir la portada, la vista va a la parada actual (o a la parada o rama de la que se vuelve): ui/screens/map-scroll.js.
export function scrollToCurrent(el) {
  const focus = { branchId: focusBranch, step: focusStep };
  focusBranch = '';
  focusStep = '';
  return placeMap(el, focus);
}
