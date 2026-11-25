// Colección (pestaña «Cuadros»): una franja por pintor con «n de m» y sus 3 últimas obras desbloqueadas, siempre por
// movimiento en orden cronológico, invitados juntos y, con 15 pintores o más, buscador con sugerencias y filtro por
// movimiento. El nombre lleva a la ficha, «Ver sus n cuadros» a su galería y una miniatura abre el visor en esa obra.

import { esc, onAction, focusHeading, accentStyle } from '../dom.js';
import { icons } from '../icons.js';
import { page } from '../shell.js';
import { artFrame } from '../art.js';
import { playEra } from '../audio-bridge.js';
import { openGalleries } from '../../engine/goals.js';
import { collectionStrips, unlockedMap, unlockedPainterCount, unlockedMovements, suggestPool, SEARCH_MIN_PAINTERS } from '../../engine/collection.js';
import { renderPainters, collTabs } from './collection-painters.js';
import { loadCss } from '../lazy-css.js';
import { observeDeferred } from '../lazy-img.js';
import { suggestBoxHtml, mountSuggestBox } from '../suggest-box.js';

// Filtro por movimiento elegido: se queda mientras se navega por la app.
const view = { movementId: null };

function stripHtml(s) {
  const isGuests = s.kind === 'guests';
  const name = isGuests
    ? `<h3 class="coll-artist-name coll-guests-name">${esc(s.name)}</h3>`
    : `<h3 class="coll-artist-name"><button type="button" class="coll-name-btn" data-artist="${esc(s.id)}"><span>${esc(s.name)}</span>${icons.next(16)}</button></h3>`;
  const route = isGuests ? `obras-invitados-${s.movement.id}` : `obras-${s.id}`;
  const all = `<button type="button" class="coll-all" data-action="works" data-to="${esc(route)}">${isGuests ? (s.count === 1 ? 'Ver el cuadro' : `Ver los ${s.count} cuadros`) : s.count === 1 ? 'Ver su cuadro' : `Ver sus ${s.count} cuadros`}${icons.next(14)}</button>`;
  return `<section class="coll-strip" style="${accentStyle(s.movement.accent)}" aria-label="${esc(s.name)}">
      <header class="coll-strip-head">${name}<div class="coll-strip-sub"><span class="coll-count" aria-label="${s.count} de ${s.total} cuadros">${s.count} de ${s.total}</span>${all}</div></header>
      <ul class="coll-grid">${s.shown.map((w) => `<li><button class="coll-item" data-action="open" data-id="${esc(w.id)}" data-strip="${esc(s.id)}" aria-label="${esc(w.title)}">
        ${artFrame(w, { alt: '', cls: 'art-thumb', label: w.title, small: true, defer: true })}</button></li>`).join('')}</ul>
    </section>`;
}

// Franjas con un encabezado pequeño por movimiento (siempre en orden cronológico).
function listHtml(strips) {
  let last = null;
  return strips.map((s) => {
    const head = s.movement.id !== last ? `<h2 class="coll-era" style="${accentStyle(s.movement.accent)}">${esc(s.movement.name)}</h2>` : '';
    last = s.movement.id;
    return head + stripHtml(s);
  }).join('');
}

// Una sola barra compacta: buscador y filtro por movimiento (un desplegable), para que el primer cuadro quede a la vista.
function controlsHtml(ctx) {
  const options = unlockedMovements(ctx.store.get().progress, ctx.index)
    .map((m) => `<option value="${esc(m.id)}"${view.movementId === m.id ? ' selected' : ''}>${esc(m.name)}</option>`).join('');
  return `<div class="coll-bar">${suggestBoxHtml()}
    <label class="coll-filter"><span class="sr-only">Movimiento</span>
      <select class="coll-select"><option value="">Todos</option>${options}</select></label></div>`;
}

// Salas de los movimientos dominados: una fila compacta que se desplaza, no un bloque que empuje los cuadros.
function salasHtml(ctx, galleries) {
  if (!galleries.length) return '';
  return `<nav class="coll-salas" aria-label="Salas"><span class="coll-salas-label">Salas</span>
    ${galleries.map((m) => `<button type="button" class="sala-chip" data-action="gallery" data-id="${esc(m.id)}" style="${accentStyle(m.accent)}">${icons.arch(18)}<span>${esc(m.name)}</span></button>`).join('')}</nav>`;
}

export async function renderCollection(ctx, el, { tab = 'works' } = {}) {
  if (tab === 'painters') return renderPainters(ctx, el);
  await loadCss('css/coleccion.css');
  const { index } = ctx;
  const progress = ctx.store.get().progress;
  const owned = unlockedMap(progress, index);
  // Todas las obras del catálogo: lo que se cuenta arriba y lo que se desbloquea son lo mismo (invitados incluidos).
  const total = index.artworks.length;
  const ownedCount = Object.keys(owned).length;
  const searchable = unlockedPainterCount(progress, index) >= SEARCH_MIN_PAINTERS;
  if (!searchable) view.movementId = null;
  const strips = () => collectionStrips(ctx.store.get().progress, index, view);

  const galleries = openGalleries(progress, index);

  el.innerHTML = page(ctx, 'collection', `
    <header class="section-head"><h1>Colección</h1><p class="section-sub">${ownedCount} de ${total} vistos</p></header>
    ${collTabs('works')}
    ${salasHtml(ctx, galleries)}
    ${ownedCount === 0
    ? `<div class="empty"><span class="empty-icon">${icons.frames(36)}</span><p>Cada cuadro que veas se guardará aquí.</p>
        <a class="btn btn-primary" href="#inicio">Ir al camino</a></div>`
    : `${searchable ? controlsHtml(ctx) : ''}<div class="coll-list">${listHtml(strips())}</div>`}`);
  focusHeading(el);
  playEra('menu');
  observeDeferred(el);

  const redraw = () => {
    el.querySelector('.coll-list').innerHTML = listHtml(strips());
    observeDeferred(el);
  };

  el.querySelector('.coll-select')?.addEventListener('change', (ev) => { ctx.audio.sfx('tap'); view.movementId = ev.target.value || null; redraw(); });
  if (searchable) {
    const stop = mountSuggestBox(el.querySelector('.sg'), {
      index,
      pool: () => suggestPool(ctx.store.get().progress, index),
      onPick: ({ kind, id }) => {
        const input = el.querySelector('.sg-input');
        if (kind === 'artist') {
          ctx.go(`pintor-${id}`);
        } else {
          import('../viewer.js').then((m) => m.openViewer({ index, works: [index.artwork(id)], start: 0, reveal: true, opener: input })).catch((err) => console.error(err));
        }
      },
    });
    ctx.setCleanup(stop);
  }

  onAction(el, {
    // Una miniatura abre el visor en esa obra; se pasa por todas las desbloqueadas del pintor.
    open: (b) => {
      ctx.audio.sfx('tap');
      const strip = strips().find((x) => x.id === b.dataset.strip);
      if (!strip) return;
      import('../viewer.js').then((m) => m.openViewer({ index, works: strip.works, start: Math.max(0, strip.works.findIndex((w) => w.id === b.dataset.id)), reveal: true, opener: b })).catch((err) => console.error(err));
    },
    works: (b) => { ctx.audio.sfx('tap'); ctx.go(b.dataset.to); },
    gallery: (b) => {
      ctx.audio.sfx('tap');
      ctx.go(`galeria-${b.dataset.id}`);
    },
  });
}
