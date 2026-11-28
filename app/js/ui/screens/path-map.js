// Mapa del camino (portada): el sendero serpentea de abajo arriba por un paisaje de época; cada parada es
// un nodo redondo con el cuadro dentro. Abajo, el hito de salida; por época, un tramo con su paisaje (SVG
// aparte, cargado al acercarse), el sendero, el cartel de la época al borde del camino, los rótulos de tramo,
// los nodos y los desvíos de las ramas; arriba del todo, «Tu museo». El DOM va en orden cronológico
// (salida primero) y el CSS lo invierte (column-reverse): el tabulador y el lector de pantalla recorren el
// camino en el orden del juego. Trazado en path-layout.js; carteles y desvíos en path-signs.js.

import { placeMap } from './map-scroll.js';
import { recallMap } from './map-memory.js';
import { esc, accentStyle, plural, joinNames } from '../dom.js';
import { icons } from '../icons.js';
import { coverOf } from '../art.js';
import { STATE_LABEL, DORMANT_TEXT, startedLabel, dotFor, nodeHtml } from './path-nodes.js';
import {
  artistStatus, salaStatus, movementStatus, isReviewUnlocked, hasMovementReview, nextStep, stepStatus, isPathMastered, needsIntro,
} from '../../engine/progress.js';
import { isGalleryOpen, galleryWorks } from '../../engine/goals.js';
import { isDormant } from '../../engine/review.js';
import { salaLearnWorks } from '../../engine/catalog.js';
import { MAP_W, STEP, SIDE_X, GATE_Y, pathLayout, eraLayout, walkedD } from './path-layout.js';
import { trailSvg, eraArch, startBlock, museumBlock, branchSpot, branchState, tramoState, stepName, ofEra, pct } from './path-signs.js';
import { eraLore, tramoLore, loreHere, tramoFresh } from './path-lore.js';
import { eraGate, bridgeRails, eraPlace, startPlace } from './path-art.js';

export { MAP_W, STEP, pathLayout, eraLayout, DORMANT_TEXT };
import { pathActions, showLockNote, levelCard } from './path-actions.js';

export { pathActions, showLockNote, levelCard };
export { watchLandscapes } from '../map-land.js';

// ---------- HTML ----------

// Parada actual, la siguiente cerrada (algo más presente que el resto de lo cerrado) y, si lo siguiente es la
// presentación de la época o el cartel del tramo, su medallón o su rombo (here: ahí se posa «Tú»).
function mapKeys(ctx) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const current = nextStep(p, index);
  const at = current ? index.steps.indexOf(current) : -1;
  const after = at >= 0 ? index.steps.slice(at + 1).find((s) => stepStatus(p, index, s) === 'locked') : null;
  return { current: current ? `${current.type}:${current.id}` : '', next: after ? `${after.type}:${after.id}` : '', era: current ? current.movementId : '', here: loreHere(p, index, current) };
}

// lazy: solo se pintan del todo la época actual y sus vecinas; las demás quedan como hueco de su altura y
// fillPendingEras las rellena después, una por tarea (el primer pintado no bloquea en móviles lentos).
const NEAR_ERAS = 0;
// Rama o parada («artist:<id>») de la que se vuelve al mapa: recibe el foco. jump: además, centrar la vista en esa
// parada (un pintor «En el camino» desde una rama); sin él, la vista vuelve a donde estaba (map-memory.js).
export const HOME_MAP = 'inicio';
// Nodo de cada época que la pone a prueba (antes «Repaso»: el único repaso a mano es el botón ↻).
export const REVIEW_NODE_NAME = 'Prueba de época';
let focusBranch = '';
let focusStep = '';
let focusJump = false;
export const setMapFocus = (branchId, step = '', jump = false) => { focusBranch = branchId || ''; focusStep = step; focusJump = jump; };
// Pantalla de una rama: la parada recién jugada («artist:<id>»), para volver centrada en ella y subir a la siguiente.
let branchStep = '';
export const setBranchFocus = (step = '') => { branchStep = step; };
export const takeBranchFocus = () => { const s = branchStep; branchStep = ''; return s; };
export function renderPathMap(ctx, { lazy = false } = {}) {
  const { index } = ctx;
  const layout = pathLayout(index);
  const keys = mapKeys(ctx);
  const here = Math.max(0, layout.eras.findIndex((e) => e.id === keys.era));
  const stepEra = focusStep.startsWith('artist:') ? index.movementOf(focusStep.slice(7))?.id : focusStep.startsWith('sala:') ? focusStep.slice(5) : '';
  const focus = stepEra ? layout.eras.findIndex((e) => e.id === stepEra)
    : focusBranch ? layout.eras.findIndex((e) => e.branches.some((b) => b.id === focusBranch)) : -1;
  const html = layout.eras.map((era, i) => (!lazy || Math.abs(i - here) <= NEAR_ERAS || i === focus
    ? eraBlock(ctx, era, layout.eras[i - 1], keys)
    : `<li class="path-era is-pending" data-era="${esc(era.id)}" style="--era-tint:var(--map-tint-${esc(era.id)});aspect-ratio:${MAP_W}/calc(${era.h} * var(--k, 1))"></li>`)).join('');
  const firstTint = layout.eras.length ? `var(--map-tint-${esc(layout.eras[0].id)})` : 'transparent';
  const done = isPathMastered(ctx.store.get().progress, index);
  // La placa y el medallón de la primera época van en la puerta de la muralla de salida.
  const first = layout.eras[0];
  const firstArch = first && !first.arch
    ? `${archHtml(ctx, first, { ...layout.start.arch, ...startPlace() }, layout.start.h)}${medallion(ctx, first, layout.start.stop, layout.start.h, keys, 'div')}` : '';
  return `${startBlock(layout.start, firstTint, firstArch)}${html}${museumBlock(layout.museum, index.visibleMovements.length, done)}`;
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
  const nodes = sala ? [salaNode(ctx, movement, keys)] : index.stageArtists(movement.id).map((a) => artistNode(ctx, a, keys));
  if (!sala && hasMovementReview(index, era.id)) nodes.push(reviewNode(ctx, movement, status === 'locked'));
  const branches = era.branches.map((b) => ({ spot: b, branch: index.branch(b.id) })).filter((b) => b.branch)
    .map((b) => ({ ...b, st: b.spot.extra ? tramoState(p, index, b.branch, era.id) : branchState(p, index, b.branch) }));
  // Orden del DOM = orden de lectura y de tabulación: por cada parada, el cartel de su tramo si empieza en ella, la
  // parada y, si sale de ella, el desvío de su rama; la sala, al final.
  const items = nodes.map((node, i) => {
    const pt = era.points[i];
    const side = pt.x < MAP_W / 2 ? 'left' : 'right';
    // --room: parte del ancho que queda hacia donde cuelga el nombre (el rótulo nunca pasa del margen de 8 px).
    const state = node.key === keys.current ? ' is-current' : node.key === keys.next ? ' is-next' : '';
    const sec = era.sections.find((s) => s.at === i);
    const head = sec ? tramoNode(ctx, era, sec, keys) : '';
    const spur = branches.filter((b) => b.spot.at === i).map((b) => branchSpot(b.spot, b.branch, b.st, index, era.h)).join('');
    const after = node.key === keys.current && keys.here ? ' is-after-lore' : '';
    return `${head}<li class="stage-spot is-${side}${state}${after}" data-step="${esc(node.key)}" style="left:${pct(pt.x, MAP_W)};top:${pct(pt.y, era.h)};--room:${((side === 'left' ? MAP_W - pt.x : pt.x) / MAP_W).toFixed(3)}">${node.html}</li>${spur}`;
  }).join('');
  const last = era.points[era.points.length - 1];
  const gallery = isGalleryOpen(p, index, era.id) ? galleryNode(ctx, movement, last, era.h) : '';
  const place = era.gate ? eraPlace(era.gate.x, era.gate.y) : null;
  const sign = era.arch ? archHtml(ctx, era, place ? { ...era.arch, ...place.box } : era.arch, era.h) : '';
  const gateStop = era.gate ? medallion(ctx, era, era.gate.stop, era.h, keys, 'li', prevEra) : '';
  const prevTint = prevEra ? `var(--map-tint-${esc(prevEra.id)})` : 'var(--era-tint)';
  return `<li class="path-era movement movement-${status}${sala ? ' movement-sala' : ''}${sealed ? ' is-sealed' : ''}${era.gate ? ' has-gate' : ''}" data-era="${esc(era.id)}" style="${accentStyle(movement.accent)};--gate-y:${GATE_Y};--era-tint:var(--map-tint-${esc(era.id)});--era-prev:${prevTint};--era-h:${era.h};aspect-ratio:${MAP_W}/calc(${era.h} * var(--k, 1))">
    <img class="path-land" alt="" width="${MAP_W}" height="${era.h}" decoding="async" data-src="img/mapa/${esc(era.id)}.svg">
    ${trailSvg(era.h, era.trail, branches.map((b) => ({ spur: b.spot.spur, tail: b.spot.tail, open: b.st.open })), walked(index, era, nodes, keys))}
    ${frontSvg(era, status === 'locked')}
    ${sign}
    <ol class="stages">${gateStop}${items}${gallery}</ol>
  </li>`;
}

// Placa de una época en su puerta (arch: su caja en el tramo de alto h).
function archHtml(ctx, era, arch, h) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  return eraArch({
    movement: index.movement(era.id), status: movementStatus(p, index, era.id), sealed: Boolean(p.medals[`movement-${era.id}`]),
    arch, h, tone: accentStyle(index.movement(era.id).accent),
  });
}

// Medallón de la época en el arco de su puerta (stop: su sitio en el tramo de alto h): nombre, paradas dominadas (las
// mismas que se ven en el camino, sin el repaso) y si su presentación está sin ver.
function medallion(ctx, era, stop, h, keys, tag = 'li', prevEra = null) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const sala = index.isSala(era.id);
  const states = sala ? [salaStatus(p, index, era.id)] : index.stageArtists(era.id).map((a) => artistStatus(p, index, a.id));
  return eraLore({
    movement: index.movement(era.id), status: movementStatus(p, index, era.id), sealed: Boolean(p.medals[`movement-${era.id}`]),
    done: states.filter((st) => st === 'mastered').length, total: states.length, prevName: prevEra ? index.movement(prevEra.id).name : '', stop, h, tag,
    fresh: needsIntro(p, index, era.id), here: keys.here === `era:${era.id}`,
  });
}

// Rombo de un tramo, sobre el sendero antes de su primer pintor.
function tramoNode(ctx, era, sec, keys) {
  const p = ctx.store.get().progress;
  const first = ctx.index.stageArtists(era.id)[sec.at];
  const here = keys.here === `tramo:${sec.key}`;
  return tramoLore({
    sec, info: sectionInfo(ctx, era.id, sec), h: era.h, here, next: first ? first.id : '',
    fresh: tramoFresh(p, ctx.index, first?.id), locked: !first || artistStatus(p, ctx.index, first.id) === 'locked',
  });
}

// Delante del sendero: la puerta de ciudad de la época (cerrada, con su portón) y los pretiles de sus puentes.
export function frontSvg(era, locked = false) {
  const art = `${era.gate ? eraGate(era.gate.x, era.gate.y, { locked }) : ''}${era.bridges.map(bridgeRails).join('')}`;
  return art ? `<svg class="path-gate" viewBox="0 0 ${MAP_W} ${era.h}" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" focusable="false">${art}</svg>` : '';
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

// Tramo de la época: nombre y dominados, para su cartel. Cuenta todas sus paradas, también las extra (engine/roster.js):
// la cifra casa con las paradas que se ven en el camino y con el cartel de la época.
export function sectionInfo(ctx, movementId, s) {
  const p = ctx.store.get().progress;
  const group = ctx.index.stageArtists(movementId).filter((a) => a.section === s.name);
  return { name: s.name, total: group.length, got: group.filter((a) => artistStatus(p, ctx.index, a.id) === 'mastered').length };
}

function artistNode(ctx, artist, keys) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const status = artistStatus(p, index, artist.id);
  const key = `artist:${artist.id}`;
  const prevStep = index.steps[index.stepIndex('artist', artist.id) - 1];
  const dormant = status === 'mastered' && isDormant(p, artist.id, ctx.today ? ctx.today() : null);
  const lock = prevStep ? `Antes, acierta la mitad con ${stepName(index, prevStep)}` : '';
  // Cerrado y lejos: solo el nombre corto (pesa menos); la siguiente parada, con el nombre entero.
  const quiet = status === 'locked' && key !== keys.next;
  const html = nodeHtml({
    cls: dormant ? 'is-dormant' : '', action: 'stage', id: artist.id, status, lock, current: key === keys.current && !keys.here,
    unlock: status === 'locked' && prevStep ? `${prevStep.type}:${prevStep.id}` : '',
    label: status === 'started' ? startedLabel(artist.name, p.artists[artist.id]?.best)
      : `${artist.name}, ${STATE_LABEL[status]}${status === 'locked' && lock ? `. ${lock}` : ''}${dormant ? `. ${DORMANT_TEXT}` : ''}`,
    // Dormido: sin texto bajo el nombre (lo dice la etiqueta, para el lector).
    name: quiet ? artist.short || artist.name : artist.name, meta: '',
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
  const lock = prev ? `Antes, acierta la mitad con ${stepName(index, prev)}` : '';
  const html = nodeHtml({
    cls: 'stage-sala', action: 'sala', id: movement.id, status, lock, current: key === keys.current && !keys.here,
    unlock: status === 'locked' && prev ? `${prev.type}:${prev.id}` : '',
    label: status === 'started' ? startedLabel(`Conoce el movimiento ${movement.name}`, p.salas?.[movement.id]?.best)
      : `Conoce el movimiento ${movement.name}, ${STATE_LABEL[status]}${status === 'locked' && lock ? `. ${lock}` : ''}`,
    name: 'Conoce el movimiento', meta: '',
    dot: dotFor(status, salaCover(index, movement.id), movement.name),
  });
  return { type: 'sala', key, status, html };
}

// Pintores de la época aún sin dominar: todos (para el lector) y en corto para la nota al tocar
// («Leonardo y Veronés», «Botticelli, Rafael y 4 más»).
const PENDING_NAMES_MAX = 2;
function pendingSteps(ctx, progress, movementId) {
  return ctx.index.stepsOf(movementId).filter((s) => s.type === 'artist' && artistStatus(progress, ctx.index, s.id) !== 'mastered');
}
// Los nombres no se parten entre dos líneas (espacios duros).
export function pendingNames(list) {
  const names = list.map((n) => n.replace(/ /g, '\u00a0'));
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
  const steps = open ? [] : pendingSteps(ctx, p, movement.id);
  const pending = steps.map((s) => stepName(ctx.index, s));
  // Cerrada: quién falta, con «Ir» a la primera parada que falta (path-actions.js).
  const lock = pending.length ? `${pending.length === 1 ? 'Te falta' : 'Te faltan'} ${pendingNames(pending)}` : 'Se abre al terminar la época';
  const unlock = steps.length ? `${steps[0].type}:${steps[0].id}` : '';
  // Cerrado: lo que falta, dicho en claro bajo la etiqueta («Falta 1 pintor»).
  const missing = pending.length && !quiet ? (pending.length === 1 ? 'Falta 1 pintor' : `Faltan ${pending.length} pintores`) : '';
  const name = REVIEW_NODE_NAME;
  const meta = best ? `Mejor: ${Math.round(best * 100)}\u00a0%` : missing;
  const icon = medal ? icons.medal(22) : icons.arch(open ? 24 : 18);
  const label = `${REVIEW_NODE_NAME} ${ofEra(movement.name)}${open ? '' : `, cerrada. Se abre después de ${joinNames(pending)}`}`;
  const html = `<button class="stage stage-review is-${status}" data-action="review" data-id="${esc(movement.id)}" data-status="${open ? 'open' : 'locked'}"
        aria-label="${esc(label)}" data-lock="${esc(lock)}"${unlock ? ` data-unlock="${esc(unlock)}"` : ''}>
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

// Al pintar la portada: la primera vez, la vista va a la parada actual; al volver, a donde estaba (map-scroll.js).
export function scrollToCurrent(el) {
  const focus = { branchId: focusBranch, step: focusStep, jump: focusJump, restore: recallMap(HOME_MAP) };
  focusBranch = '';
  focusStep = '';
  focusJump = false;
  return placeMap(el, focus);
}
