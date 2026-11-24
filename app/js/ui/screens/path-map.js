// Mapa del camino (portada): el sendero serpentea de abajo arriba por un paisaje de época; cada
// parada es un nodo redondo con el cuadro dentro. Por época: un tramo con su paisaje (SVG aparte,
// cargado al acercarse), el sendero (un <svg> ligero con un path), la cartela, los nodos, un cofre y,
// al final del todo, «Tu museo». El DOM va en orden cronológico (Renacimiento primero) y el CSS lo
// invierte (column-reverse): así el tabulador y el lector de pantalla recorren el camino en el orden
// del juego, y el primer nodo del DOM es el primero que se juega.

import { esc, accentStyle, announce, plural, $ } from '../dom.js';
import { icons } from '../icons.js';
import { artFrame, coverOf } from '../art.js';
import {
  artistStatus, salaStatus, movementStatus, isReviewUnlocked, hasMovementReview, nextStep,
} from '../../engine/progress.js';
import { isGalleryOpen, galleryWorks } from '../../engine/goals.js';
import { salaLearnWorks } from '../../engine/catalog.js';
import { characterHtml } from '../path-character.js';

// Trazado en coordenadas de diseño (ancho 390); en pantalla todo va en porcentajes y escala con la
// columna. tools/mapa_svg.py pinta los paisajes con este mismo trazado (lo lee por tools/mapa-layout.mjs).
export const MAP_W = 390;
export const STEP = 112;            // distancia vertical entre paradas
const PAD_BOTTOM = 96;              // entrada del tramo: la cartela de época
const PAD_TOP = 28;                 // salida del tramo
const MUSEUM_H = 200;        // bloque «Tu museo»
const MUSEUM_Y = 150;               // donde acaba el sendero bajo el museo
const XS = [120, 268, 130, 274, 118, 270, 126, 272];   // zigzag de los nodos
const SIDE_X = { left: 48, right: MAP_W - 48 };        // sala de la época, en el margen estrecho
const LANDSCAPE_MARGIN = '240px 0px';                  // se pide el paisaje al acercarse a este margen
const CHEST_T = 0.42;               // el cofre, en el sendero entre la 2.ª y la 3.ª parada, algo más cerca de la 2.ª

const f = (n) => String(Math.round(n * 100) / 100);
const pct = (v, total) => `${f((v / total) * 100)}%`;

function cubic(a, b) {
  const ym = (a.y + b.y) / 2;
  return `C${f(a.x)} ${f(ym)} ${f(b.x)} ${f(ym)} ${f(b.x)} ${f(b.y)}`;
}

// Punto del sendero entre dos nodos (la misma cúbica que dibuja trailD), en t de 0 a 1.
export function trailPoint(a, b, t) {
  const k = 1 - t;
  const ym = (a.y + b.y) / 2;
  return { x: a.x * k * k * k + 3 * a.x * k * k * t + 3 * b.x * k * t * t + b.x * t * t * t, y: a.y * k * k * k + 3 * ym * k * k * t + 3 * ym * k * t * t + b.y * t * t * t };
}

// Sendero: tangentes verticales en cada nodo; entra por abajo (xIn) y sale por arriba en vertical.
function trailD(start, points, end) {
  let d = `M${f(start.x)} ${f(start.y)}`;
  let prev = start;
  for (const p of points) {
    d += cubic(prev, p);
    prev = p;
  }
  return `${d}L${f(end.x)} ${f(end.y)}`;
}

// Tramo de una época: alto, nodos (de abajo arriba), cofre en el sendero tras la 2.ª parada, cartela
// y sendero. phase: nodos acumulados antes (mantiene el zigzag entre épocas); xIn: x del último
// nodo de la época anterior (el sendero entra por ahí).
export function eraLayout(nodeCount, phase = 0, xIn = null) {
  const h = PAD_BOTTOM + nodeCount * STEP + PAD_TOP;
  const points = Array.from({ length: nodeCount }, (_, i) => ({ x: XS[(phase + i) % XS.length], y: h - PAD_BOTTOM - STEP / 2 - i * STEP }));
  const start = { x: xIn ?? points[0].x, y: h };
  const k = Math.min(1, nodeCount - 2);
  const chest = nodeCount >= 2 ? trailPoint(points[k], points[k + 1], CHEST_T) : null;
  const last = points[points.length - 1];
  return { h, points, start, chest, ribbon: { x: MAP_W / 2, y: h - PAD_BOTTOM / 2 }, trail: trailD(start, points, { x: last.x, y: 0 }) };
}

function museumLayout(xIn) {
  const start = { x: xIn, y: MUSEUM_H };
  const end = { x: MAP_W / 2, y: MUSEUM_Y };
  return { h: MUSEUM_H, trail: `M${f(start.x)} ${f(start.y)}${cubic(start, end)}` };
}

// Trazado de todo el camino, época a época (y el museo al final).
export function pathLayout(index) {
  const eras = [];
  let phase = 0;
  let xIn = null;
  for (const m of index.visibleMovements) {
    const n = index.stepsOf(m.id).length + (hasMovementReview(index, m.id) ? 1 : 0);
    if (!n) continue;
    const era = eraLayout(n, phase, xIn);
    eras.push({ id: m.id, ...era });
    phase += n;
    xIn = era.points[n - 1].x;
  }
  return { eras, museum: museumLayout(xIn ?? MAP_W / 2) };
}

// ---------- HTML ----------

export function renderPathMap(ctx) {
  const { index } = ctx;
  const layout = pathLayout(index);
  const current = nextStep(ctx.store.get().progress, index);
  const currentKey = current ? `${current.type}:${current.id}` : '';
  const html = layout.eras.map((era, i) => eraBlock(ctx, era, layout.eras[i - 1], currentKey)).join('');
  return `${html}${museumBlock(index, layout.museum)}`;
}

function trailSvg(h, d) {
  return `<svg class="path-trail" viewBox="0 0 ${MAP_W} ${h}" width="100%" height="100%" aria-hidden="true" focusable="false">
      <path class="trail-edge" d="${d}"/><path class="trail-fill" d="${d}"/><path class="trail-steps" d="${d}"/></svg>`;
}

function eraBlock(ctx, era, prevEra, currentKey) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const movement = index.movement(era.id);
  const status = movementStatus(p, index, era.id);
  const sala = index.isSala(era.id);
  const sealed = Boolean(p.medals[`movement-${era.id}`]);
  const prevName = prevEra ? index.movement(prevEra.id).name : '';
  const nodes = [];
  if (sala) {
    nodes.push(salaNode(ctx, movement, currentKey));
  } else {
    nodes.push(...artistNodes(ctx, movement, currentKey));
    if (hasMovementReview(index, era.id)) nodes.push(reviewNode(ctx, movement));
  }
  const spots = nodes.map((node, i) => {
    const pt = era.points[i];
    const side = pt.x < MAP_W / 2 ? 'left' : 'right';
    const isCurrent = node.key === currentKey;
    const section = node.section ? sectionLabel(node.section, pt, era.h) : '';
    return `${section}<li class="stage-spot is-${side}${isCurrent ? ' is-current' : ''}" data-step="${esc(node.key)}" style="left:${pct(pt.x, MAP_W)};top:${pct(pt.y, era.h)}">
      ${node.html}<p class="lock-note"></p>${isCurrent ? characterHtml() : ''}
    </li>`;
  }).join('');
  const last = era.points[era.points.length - 1];
  const gallery = isGalleryOpen(p, index, era.id) ? galleryNode(ctx, movement, last, era.h) : '';
  const chest = era.chest
    ? `<li class="path-chest" aria-hidden="true" style="left:${pct(era.chest.x, MAP_W)};top:${pct(era.chest.y, era.h)}">${icons.chest(24)}</li>`
    : '';
  return `<li class="path-era movement movement-${status}${sala ? ' movement-sala' : ''}${sealed ? ' is-sealed' : ''}" data-era="${esc(era.id)}" style="${accentStyle(movement.accent)};--era-tint:var(--map-tint-${esc(era.id)});aspect-ratio:${MAP_W}/${era.h}">
    <img class="path-land" alt="" width="${MAP_W}" height="${era.h}" decoding="async" data-src="img/mapa/${esc(era.id)}.svg">
    ${trailSvg(era.h, era.trail)}
    ${ribbon(movement, status, sealed, nodes, prevName, era)}
    <ol class="stages">${spots}${gallery}${chest}</ol>
  </li>`;
}

// Cartela de la época: nombre, siglos y «n/m»; abierta, lleva a la presentación del movimiento.
function ribbon(movement, status, sealed, nodes, prevName, era) {
  const steps = nodes.filter((n) => n.type !== 'review');
  const done = steps.filter((n) => n.status === 'mastered').length;
  const count = status === 'locked' ? '' : ` · ${done}/${steps.length}`;
  const lockLine = status === 'locked' && prevName ? `<span class="movement-lockline">${icons.lock(13)}<span>Termina ${esc(prevName)} para abrirlo</span></span>` : '';
  const seal = sealed ? `<span class="movement-seal" aria-hidden="true">${icons.laurel(18)}</span>` : '';
  const inner = `${seal}<span class="movement-titles">
      <span class="movement-name">${esc(movement.name)}</span>
      <span class="movement-period">${esc(movement.period)}${count}</span>${lockLine}
    </span>${sealed ? '<span class="sr-only">, completo</span>' : ''}`;
  const pos = `style="left:${pct(era.ribbon.x, MAP_W)};top:${pct(era.ribbon.y, era.h)}"`;
  return status === 'locked'
    ? `<h2 class="movement-head" ${pos}>${inner}</h2>`
    : `<h2 class="movement-head-wrap" ${pos}><button class="movement-head is-button" data-action="intro" data-id="${esc(movement.id)}" aria-label="${esc(movement.name)}: ver presentación">${inner}<span class="movement-more" aria-hidden="true">${icons.next(16)}</span></button></h2>`;
}

function sectionLabel(section, pt, h) {
  return `<li class="stage-section" style="left:50%;top:${pct(pt.y + STEP / 2, h)}"><span class="stage-section-name">${esc(section.name)}</span><span class="stage-section-count">${section.got}/${section.total}</span></li>`;
}

// Pintores de la época; si tienen tramos (section), el primero de cada tramo lleva su cartel.
function artistNodes(ctx, movement, currentKey) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const artists = index.stageArtists(movement.id);
  return artists.map((a, k) => {
    const node = artistNode(ctx, a, currentKey);
    if (a.section && a.section !== artists[k - 1]?.section) {
      const group = artists.filter((x) => x.section === a.section);
      node.section = { name: a.section, got: group.filter((x) => artistStatus(p, index, x.id) === 'mastered').length, total: group.length };
    }
    return node;
  });
}

const STATE_LABEL = { locked: 'bloqueado', available: 'disponible', started: 'por repasar', mastered: 'dominado' };

// Texto bajo el nombre solo cuando dice algo: «Empezar»/«Seguir» en el nodo actual y «Repite · n %»
// (pintado como botón) en lo jugado que aún no está dominado: el repaso de la época solo se abre al
// dominarlos a todos, y María quería que se viera claro qué hacer.
function metaFor(status, info, current) {
  if (current) return status === 'started' ? 'Seguir' : 'Empezar';
  if (status === 'started') return `Repite · ${Math.round((info?.best || 0) * 100)}%`;
  return '';
}

function dotFor(status, cover, label) {
  if (status === 'locked') return icons.lock(18);
  const thumb = cover ? artFrame(cover, { cls: 'stage-thumb', alt: '', label, thumb: true }) : '';
  const badge = status === 'mastered' ? `<span class="stage-badge">${icons.check(14)}</span>` : '';
  return `${thumb}${badge}`;
}

function nodeHtml({ cls, action, id, status, lock, label, name, meta, dot }) {
  return `<button class="stage ${cls} is-${status}" data-action="${action}" data-id="${esc(id)}" data-status="${status}" data-lock="${esc(lock)}" aria-label="${esc(label)}">
      <span class="stage-dot">${dot}</span>
      <span class="stage-text"><span class="stage-name">${esc(name)}</span>${meta ? `<span class="stage-meta">${esc(meta)}</span>` : ''}</span>
    </button>`;
}

function artistNode(ctx, artist, currentKey) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const status = artistStatus(p, index, artist.id);
  const key = `artist:${artist.id}`;
  const isCurrent = key === currentKey;
  const prevStep = index.steps[index.stepIndex('artist', artist.id) - 1];
  const prev = prevStep ? (prevStep.type === 'sala' ? index.movement(prevStep.id).name : index.artist(prevStep.id).short || index.artist(prevStep.id).name) : '';
  const html = nodeHtml({
    cls: '', action: 'stage', id: artist.id, status,
    lock: prev ? `Se abre con la mitad de aciertos en ${prev}` : '',
    label: `${artist.name}, ${STATE_LABEL[status]}`,
    name: artist.name, meta: metaFor(status, p.artists[artist.id], isCurrent),
    dot: dotFor(status, coverOf(index, artist.id), initials(artist.name)),
  });
  return { type: 'artist', key, status, html };
}

function salaNode(ctx, movement, currentKey) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const status = salaStatus(p, index, movement.id);
  const key = `sala:${movement.id}`;
  const isCurrent = key === currentKey;
  const i = index.stepIndex('sala', movement.id);
  const prev = index.steps[i - 1];
  const prevName = prev ? (prev.type === 'sala' ? index.movement(prev.id).name : index.artist(prev.id).short || index.artist(prev.id).name) : '';
  const html = nodeHtml({
    cls: 'stage-sala', action: 'sala', id: movement.id, status,
    lock: prev ? `Se abre con la mitad de aciertos en ${prevName}` : '',
    label: `Conoce el movimiento ${movement.name}, ${STATE_LABEL[status]}`,
    name: 'Conoce el movimiento', meta: metaFor(status, p.salas?.[movement.id], isCurrent),
    dot: dotFor(status, salaCover(index, movement.id), initials(movement.name)),
  });
  return { type: 'sala', key, status, html };
}

// Qué le falta al jugador para abrir el repaso: los pintores del tramo aún no dominados, por su
// nombre («Falta dominar a Veronés», «Faltan Tiziano y 2 más»), para que el candado se explique solo.
const PENDING_NAMES_MAX = 2;
function pendingLine(ctx, progress, movementId) {
  const names = ctx.index.stepsOf(movementId)
    .filter((s) => s.type === 'artist' && artistStatus(progress, ctx.index, s.id) !== 'mastered')
    .map((s) => ctx.index.artist(s.id).short || ctx.index.artist(s.id).name);
  if (!names.length) return '';
  if (names.length === 1) return `Falta dominar a ${names[0]}`;
  const shown = names.slice(0, PENDING_NAMES_MAX);
  const rest = names.length - shown.length;
  return `Faltan ${shown.join(' y ')}${rest ? ` y ${rest} más` : ''}`;
}

function reviewNode(ctx, movement) {
  const p = ctx.store.get().progress;
  const open = isReviewUnlocked(p, ctx.index, movement.id);
  const best = p.reviews[movement.id]?.best;
  const medal = (best || 0) >= 0.75;
  const status = medal ? 'mastered' : open ? 'available' : 'locked';
  const pending = open ? '' : pendingLine(ctx, p, movement.id);
  const meta = best ? `Mejor: ${Math.round(best * 100)}%` : pending;
  const html = `<button class="stage stage-review is-${status}" data-action="review" data-id="${esc(movement.id)}" data-status="${open ? 'open' : 'locked'}"
        aria-label="Repaso de ${esc(movement.name)}${open ? '' : `, bloqueado. ${esc(pending)}`}" data-lock="${esc(pending || 'Se abre al dominar a todos sus pintores')}">
        <span class="stage-dot">${medal ? icons.medal(22) : open ? icons.arch(24) : icons.lock(18)}</span>
        <span class="stage-text"><span class="stage-name">Repaso</span>${meta ? `<span class="stage-meta">${esc(meta)}</span>` : ''}</span>
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

// «Tu museo»: la meta, arriba del todo. Cúpula y columnas en el estilo limpio del paisaje.
function museumBlock(index, museum) {
  const n = index.visibleMovements.length;
  const building = `<svg class="path-museum-art" viewBox="0 0 390 200" width="100%" height="100%" aria-hidden="true" focusable="false">
      <path class="land-far" d="M-10 92V62C60 40 130 66 200 48C270 32 330 62 400 44V92Z"/>
      <path class="land-front" d="M-10 92V78C90 62 150 86 240 70C310 58 350 82 400 70V92Z"/>
      <ellipse class="land-shade" cx="197" cy="100" rx="60" ry="8"/>
      <rect class="land-front" x="146" y="66" width="98" height="30"/>
      <rect class="land-side" x="232" y="66" width="12" height="30"/>
      <path class="land-top" d="M140 66H250L256 60H146Z"/>
      ${[158, 180, 202, 224].map((x) => `<rect class="land-window" x="${x}" y="72" width="8" height="24" rx="1"/>`).join('')}
      <path class="land-side" d="M171 66C171 38 219 38 219 66Z"/>
      <path class="land-front" d="M171 66C171 38 209 38 207 66Z"/>
      <rect class="land-front" x="192" y="34" width="6" height="9"/><path class="land-side" d="M191 34L195 26L199 34Z"/>
      <rect class="land-front" x="128" y="62" width="6" height="34"/><rect class="land-side" x="126" y="60" width="10" height="3"/>
      <rect class="land-front" x="256" y="62" width="6" height="34"/><rect class="land-side" x="254" y="60" width="10" height="3"/>
      <path class="land-leaf-2" d="M108 98C100 82 100 60 108 48C116 60 116 82 108 98Z"/><path class="land-leaf" d="M108 98C100 82 100 60 108 48C110 60 110 82 108 98Z"/>
      <path class="land-leaf-2" d="M284 98C276 84 276 64 284 52C292 64 292 84 284 98Z"/><path class="land-leaf" d="M284 98C276 84 276 64 284 52C286 64 286 84 284 98Z"/>
    </svg>`;
  return `<li class="path-museum" style="aspect-ratio:${MAP_W}/${museum.h}">
    ${building}${trailSvg(museum.h, museum.trail)}
    <p class="movement-head path-museum-head" style="left:50%;top:${pct(MUSEUM_Y + 18, museum.h)}">
      <span class="movement-titles"><span class="movement-name">Tu museo</span><span class="movement-period">${n === 1 ? 'Una época' : `${n} épocas`}, todos los pintores</span></span>
    </p>
  </li>`;
}

export function salaCover(index, movementId) {
  const works = salaLearnWorks(index, movementId);
  return works.slice().sort((a, b) => (b.fame || 0) - (a.fame || 0))[0] || null;
}

export function initials(name) {
  return String(name).split(/\s+/).filter((w) => /^[A-ZÁÉÍÓÚÑ]/.test(w)).slice(0, 2).map((w) => w[0]).join('');
}

// ---------- comportamiento (necesita DOM) ----------

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
