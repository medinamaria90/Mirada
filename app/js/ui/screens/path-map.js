// Mapa del camino (portada): el sendero serpentea de abajo arriba por un paisaje de época; cada parada es
// un nodo redondo con el cuadro dentro. Abajo, el hito de salida; por época, un tramo con su paisaje (SVG
// aparte, cargado al acercarse), el sendero, el cartel de la época al borde del camino, los rótulos de tramo,
// los nodos y los desvíos de las ramas; arriba del todo, «Tu museo». El DOM va en orden cronológico
// (salida primero) y el CSS lo invierte (column-reverse): el tabulador y el lector de pantalla recorren el
// camino en el orden del juego. Trazado en path-layout.js; carteles y desvíos en path-signs.js.

import { esc, accentStyle, announce, plural, $ } from '../dom.js';
import { icons } from '../icons.js';
import { artFrame, coverOf } from '../art.js';
import {
  artistStatus, salaStatus, movementStatus, isReviewUnlocked, hasMovementReview, nextStep, stepStatus,
} from '../../engine/progress.js';
import { isGalleryOpen, galleryWorks } from '../../engine/goals.js';
import { isDormant } from '../../engine/review.js';
import { salaLearnWorks } from '../../engine/catalog.js';
import { MAP_W, STEP, SIDE_X, pathLayout, eraLayout } from './path-layout.js';
import { trailSvg, eraSign, startBlock, museumBlock, branchSpot, branchState, pct } from './path-signs.js';

export { MAP_W, STEP, pathLayout, eraLayout };
const LANDSCAPE_MARGIN = '240px 0px';                  // se pide el paisaje al acercarse a este margen

// ---------- HTML ----------

export function renderPathMap(ctx) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const layout = pathLayout(index);
  const current = nextStep(p, index);
  // La siguiente parada cerrada tras la actual: algo más presente que el resto de lo cerrado.
  const at = current ? index.steps.indexOf(current) : -1;
  const after = at >= 0 ? index.steps.slice(at + 1).find((s) => stepStatus(p, index, s) === 'locked') : null;
  const keys = { current: current ? `${current.type}:${current.id}` : '', next: after ? `${after.type}:${after.id}` : '' };
  const html = layout.eras.map((era, i) => eraBlock(ctx, era, layout.eras[i - 1], keys)).join('');
  const firstTint = layout.eras.length ? `var(--map-tint-${esc(layout.eras[0].id)})` : 'transparent';
  return `${startBlock(layout.start, layout.eras, firstTint)}${html}${museumBlock(layout.museum, index.visibleMovements.length)}`;
}

function eraBlock(ctx, era, prevEra, keys) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const movement = index.movement(era.id);
  const status = movementStatus(p, index, era.id);
  const sala = index.isSala(era.id);
  const sealed = Boolean(p.medals[`movement-${era.id}`]);
  const nodes = sala ? [salaNode(ctx, movement, keys)] : index.stageArtists(movement.id).map((a) => artistNode(ctx, a, keys));
  if (!sala && hasMovementReview(index, era.id)) nodes.push(reviewNode(ctx, movement));
  const spots = nodes.map((node, i) => {
    const pt = era.points[i];
    const side = pt.x < MAP_W / 2 ? 'left' : 'right';
    const state = node.key === keys.current ? ' is-current' : node.key === keys.next ? ' is-next' : '';
    return `<li class="stage-spot is-${side}${state}" data-step="${esc(node.key)}" style="left:${pct(pt.x, MAP_W)};top:${pct(pt.y, era.h)}">
      ${node.html}<p class="lock-note"></p>
    </li>`;
  }).join('');
  const sections = era.sections.map((s) => sectionLabel(ctx, era.id, s, era.h)).join('');
  const branches = era.branches.map((b) => ({ spot: b, branch: index.branch(b.id) })).filter((b) => b.branch)
    .map((b) => ({ ...b, st: branchState(p, index, b.branch) }));
  const branchHtml = branches.map((b) => branchSpot(b.spot, b.branch, b.st, index.movement(b.branch.opensAt)?.name || movement.name, era.h)).join('');
  const last = era.points[era.points.length - 1];
  const gallery = isGalleryOpen(p, index, era.id) ? galleryNode(ctx, movement, last, era.h) : '';
  const steps = nodes.filter((n) => n.type !== 'review');
  const sign = eraSign({
    movement, status, sealed, sign: era.sign, h: era.h,
    done: steps.filter((n) => n.status === 'mastered').length, total: steps.length,
    prevName: prevEra ? index.movement(prevEra.id).name : '',
  });
  return `<li class="path-era movement movement-${status}${sala ? ' movement-sala' : ''}${sealed ? ' is-sealed' : ''}" data-era="${esc(era.id)}" style="${accentStyle(movement.accent)};--era-tint:var(--map-tint-${esc(era.id)});aspect-ratio:${MAP_W}/${era.h}">
    <img class="path-land" alt="" width="${MAP_W}" height="${era.h}" decoding="async" data-src="img/mapa/${esc(era.id)}.svg">
    ${trailSvg(era.h, era.trail, branches.map((b) => ({ spur: b.spot.spur, open: b.st.open })))}
    ${sign}
    <ol class="stages">${sections}${spots}${branchHtml}${gallery}</ol>
  </li>`;
}

// Rótulo de tramo: texto pequeño en versalitas al borde del sendero, nunca encima.
function sectionLabel(ctx, movementId, s, h) {
  const p = ctx.store.get().progress;
  const group = ctx.index.stageArtists(movementId).filter((a) => a.section === s.name);
  const got = group.filter((a) => artistStatus(p, ctx.index, a.id) === 'mastered').length;
  const across = s.side === 'left' ? `right:${pct(MAP_W - s.edge, MAP_W)}` : `left:${pct(s.edge, MAP_W)}`;
  return `<li class="stage-section is-${s.side}" style="${across};top:${pct(s.y, h)};max-width:${pct(s.room, MAP_W)}"><span class="stage-section-name">${esc(s.name)}</span><span class="stage-section-count">${got}/${group.length}</span></li>`;
}

const STATE_LABEL = { locked: 'bloqueado', available: 'disponible', started: 'por repasar', mastered: 'dominado' };
// Pintor dormido (engine/review.js): dominado y sin salir en una semana.
export const DORMANT_TEXT = '¿Lo recuerdas?';

// Texto bajo el nombre solo cuando dice algo: «Empezar»/«Seguir» en el nodo actual y «Repite · n %»
// (pintado como botón) en lo jugado que aún no está dominado: el repaso de la época solo se abre al
// dominarlos a todos, y María quería que se viera claro qué hacer.
function metaFor(status, info, current) {
  if (current) return status === 'started' ? 'Seguir' : 'Empezar';
  if (status === 'started') return `Repite · ${Math.round((info?.best || 0) * 100)}%`;
  return '';
}

// Cerrado: sin cuadro (no se adelanta nada) y un candado pequeño; el nodo es más pequeño y suave.
function dotFor(status, cover, label) {
  if (status === 'locked') return icons.lock(12);
  const thumb = cover ? artFrame(cover, { cls: 'stage-thumb', alt: '', label, thumb: true }) : '';
  const badge = status === 'mastered' ? `<span class="stage-badge">${icons.check(13)}</span>` : '';
  return `${thumb}${badge}`;
}

function nodeHtml({ cls, action, id, status, lock, label, name, meta, dot }) {
  return `<button class="stage ${cls} is-${status}" data-action="${action}" data-id="${esc(id)}" data-status="${status}" data-lock="${esc(lock)}" aria-label="${esc(label)}">
      <span class="stage-dot">${dot}</span>
      <span class="stage-text"><span class="stage-name">${esc(name)}</span>${meta ? `<span class="stage-meta">${esc(meta)}</span>` : ''}</span>
    </button>`;
}

const stepName = (index, step) => (step.type === 'sala' ? index.movement(step.id).name : index.artist(step.id).short || index.artist(step.id).name);

function artistNode(ctx, artist, keys) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const status = artistStatus(p, index, artist.id);
  const key = `artist:${artist.id}`;
  const prevStep = index.steps[index.stepIndex('artist', artist.id) - 1];
  const dormant = status === 'mastered' && isDormant(p, artist.id, ctx.today ? ctx.today() : null);
  const html = nodeHtml({
    cls: dormant ? 'is-dormant' : '', action: 'stage', id: artist.id, status,
    lock: prevStep ? `Se abre con la mitad de aciertos en ${stepName(index, prevStep)}` : '',
    label: `${artist.name}, ${STATE_LABEL[status]}${dormant ? `. ${DORMANT_TEXT}` : ''}`,
    name: artist.name, meta: dormant ? DORMANT_TEXT : metaFor(status, p.artists[artist.id], key === keys.current),
    dot: dotFor(status, coverOf(index, artist.id), initials(artist.name)),
  });
  return { type: 'artist', key, status, html };
}

function salaNode(ctx, movement, keys) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const status = salaStatus(p, index, movement.id);
  const key = `sala:${movement.id}`;
  const prev = index.steps[index.stepIndex('sala', movement.id) - 1];
  const html = nodeHtml({
    cls: 'stage-sala', action: 'sala', id: movement.id, status,
    lock: prev ? `Se abre con la mitad de aciertos en ${stepName(index, prev)}` : '',
    label: `Conoce el movimiento ${movement.name}, ${STATE_LABEL[status]}`,
    name: 'Conoce el movimiento', meta: metaFor(status, p.salas?.[movement.id], key === keys.current),
    dot: dotFor(status, salaCover(index, movement.id), initials(movement.name)),
  });
  return { type: 'sala', key, status, html };
}

// Pintores de la época aún sin dominar, por su nombre y en corto: «Veronés», «Leonardo y Veronés»,
// «Botticelli, Rafael y 4 más». Explica el candado del repaso sin un bloque de texto.
const PENDING_NAMES_MAX = 2;
export function pendingNames(ctx, progress, movementId) {
  const names = ctx.index.stepsOf(movementId)
    .filter((s) => s.type === 'artist' && artistStatus(progress, ctx.index, s.id) !== 'mastered')
    .map((s) => stepName(ctx.index, s));
  if (names.length <= PENDING_NAMES_MAX) return names.join(' y ');
  return `${names.slice(0, PENDING_NAMES_MAX).join(', ')} y ${names.length - PENDING_NAMES_MAX} más`;
}

function reviewNode(ctx, movement) {
  const p = ctx.store.get().progress;
  const open = isReviewUnlocked(p, ctx.index, movement.id);
  const best = p.reviews[movement.id]?.best;
  const medal = (best || 0) >= 0.75;
  const status = medal ? 'mastered' : open ? 'available' : 'locked';
  const pending = open ? '' : pendingNames(ctx, p, movement.id);
  const lock = pending ? `Domina a ${pending} para abrirlo` : 'Se abre al dominar a todos sus pintores';
  const meta = best ? `Mejor: ${Math.round(best * 100)}%` : '';
  const icon = medal ? icons.medal(22) : icons.arch(open ? 24 : 18);
  const html = `<button class="stage stage-review is-${status}" data-action="review" data-id="${esc(movement.id)}" data-status="${open ? 'open' : 'locked'}"
        aria-label="Repaso de ${esc(movement.name)}${open ? '' : `, bloqueado. ${esc(lock)}`}" data-lock="${esc(lock)}">
        <span class="stage-dot">${icon}${open ? '' : `<span class="stage-lock">${icons.lock(10)}</span>`}</span>
        <span class="stage-text"><span class="stage-name">${pending ? `<b>Repaso:</b> ${esc(pending)}` : 'Repaso'}</span>${meta ? `<span class="stage-meta">${esc(meta)}</span>` : ''}</span>
      </button>`;
  return { type: 'review', key: `review:${movement.id}`, status, html };
}

// Sala de la época dominada (galería): junto a la última parada, en el margen estrecho.
function galleryNode(ctx, movement, last, h) {
  const n = galleryWorks(ctx.store.get().progress, ctx.index, movement.id).length;
  const side = last.x < MAP_W / 2 ? 'left' : 'right';
  return `<li class="stage-spot stage-spot-aside is-${side}" style="left:${pct(SIDE_X[side], MAP_W)};top:${pct(last.y, h)}">
      <button class="stage stage-gallery is-mastered" data-action="gallery" data-id="${esc(movement.id)}" aria-label="Sala de ${esc(movement.name)}">
        <span class="stage-dot">${icons.laurel(24)}</span>
        <span class="stage-text"><span class="stage-name">Sala</span>${n ? `<span class="stage-meta">${plural(n, 'obra', 'obras')}</span>` : ''}</span>
      </button></li>`;
}

export function salaCover(index, movementId) {
  const works = salaLearnWorks(index, movementId);
  return works.slice().sort((a, b) => (b.fame || 0) - (a.fame || 0))[0] || null;
}

export function initials(name) {
  return String(name).split(/\s+/).filter((w) => /^[A-ZÁÉÍÓÚÑ]/.test(w)).slice(0, 2).map((w) => w[0]).join('');
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
    stage: guarded('etapa'),
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
    branch: (b) => sheet(ctx, 'openBranchSheet', b),
  };
}

function showLockNote(button) {
  const note = button.parentElement.querySelector('.lock-note');
  if (!note) return;
  note.textContent = button.dataset.lock || 'Aún bloqueado';
  note.classList.add('is-visible');
  announce(note.textContent);
  clearTimeout(note._t);
  note._t = setTimeout(() => note.classList.remove('is-visible'), 2600);
}

// El paisaje de cada tramo se pide cuando el tramo se acerca a la pantalla (nunca los nueve de golpe).
export function watchLandscapes(root) {
  const imgs = Array.from(root.querySelectorAll('.path-land[data-src]'));
  const load = (img) => {
    img.src = img.dataset.src;
    delete img.dataset.src;
  };
  if (typeof IntersectionObserver !== 'function') {
    imgs.forEach(load);
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      load(e.target);
      io.unobserve(e.target);
    }
  }, { rootMargin: LANDSCAPE_MARGIN });
  imgs.forEach((img) => io.observe(img));
}

// Al abrir la portada, la vista va a la parada actual si queda fuera de la primera pantalla.
export function scrollToCurrent(el) {
  const target = $('.stage.is-available:not(.stage-review)', el) || $('.stage.is-started', el);
  if (target && target.getBoundingClientRect().top > window.innerHeight * 0.8) {
    target.scrollIntoView({ block: 'center' });
  }
}
