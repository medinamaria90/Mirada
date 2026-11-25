// Colección (pestaña «Cuadros»): una franja por pintor con «n de m» y sus 3 últimas obras desbloqueadas, siempre por
// movimiento en orden cronológico, invitados juntos y, con 15 pintores o más, buscador con sugerencias y filtro por
// movimiento. El nombre lleva a la ficha, «Ver sus n cuadros» a su galería y una miniatura abre el visor en esa obra.

import { esc, onAction, focusHeading, accentStyle } from '../dom.js';
import { icons } from '../icons.js';
import { page } from '../shell.js';
import { artFrame } from '../art.js';
import { playEra } from '../audio-bridge.js';
import { openGalleries, galleryWorks } from '../../engine/goals.js';
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
    ? `<h2 class="coll-artist-name coll-guests-name">${esc(s.name)}</h2>`
    : `<h2 class="coll-artist-name"><button type="button" class="coll-name-btn" data-artist="${esc(s.id)}"><span>${esc(s.name)}</span>${icons.next(16)}</button></h2>`;
  const route = isGuests ? `obras-invitados-${s.movement.id}` : `obras-${s.id}`;
  const all = `<button type="button" class="coll-all" data-action="works" data-to="${esc(route)}">${s.count === 1 ? 'Ver su cuadro' : `Ver sus ${s.count} cuadros`}${icons.next(14)}</button>`;
  return `<section class="coll-strip" style="${accentStyle(s.movement.accent)}" aria-label="${esc(s.name)}">
      <header class="coll-strip-head"><div class="coll-strip-id">${name}<span class="coll-count" aria-label="${s.count} de ${s.total} cuadros">${s.count} de ${s.total}</span></div>${all}</header>
      <ul class="coll-grid">${s.shown.map((w) => `<li><button class="coll-item" data-action="open" data-id="${esc(w.id)}" data-strip="${esc(s.id)}" aria-label="${esc(w.title)}">
        ${artFrame(w, { alt: '', cls: 'art-thumb', label: w.title, thumb: true, defer: true })}</button></li>`).join('')}</ul>
    </section>`;
}

// Franjas con un encabezado pequeño por movimiento (en el orden cronológico); en «recientes», sin encabezados.
function listHtml(strips) {
  let last = null;
  return strips.map((s) => {
    const head = s.movement.id !== last ? `<h3 class="coll-era" style="${accentStyle(s.movement.accent)}">${esc(s.movement.name)}</h3>` : '';
    last = s.movement.id;
    return head + stripHtml(s);
  }).join('');
}

function controlsHtml(ctx, searchable) {
  const { progress } = ctx.store.get();
  const chips = searchable ? `<div class="coll-chips" role="group" aria-label="Filtrar por movimiento">
      <button type="button" class="chip-filter" data-action="era" data-id="" aria-pressed="${!view.movementId}">Todos</button>
      ${unlockedMovements(progress, ctx.index).map((m) => `<button type="button" class="chip-filter" data-action="era" data-id="${esc(m.id)}" aria-pressed="${view.movementId === m.id}">${esc(m.name)}</button>`).join('')}
    </div>` : '';
  return `${searchable ? suggestBoxHtml() : ''}${chips}`;
}

export async function renderCollection(ctx, el, { tab = 'works' } = {}) {
  if (tab === 'painters') return renderPainters(ctx, el);
  await loadCss('css/coleccion.css');
  const { index } = ctx;
  const progress = ctx.store.get().progress;
  const owned = unlockedMap(progress, index);
  // Obras que se pueden reconocer en el camino: las de pintores con etapa y las de las salas.
  const total = index.artworks.filter((w) => !index.artist(w.artistId).guest || index.isSala(index.artist(w.artistId).movementId)).length;
  const ownedCount = Object.keys(owned).length;
  const searchable = unlockedPainterCount(progress, index) >= SEARCH_MIN_PAINTERS;
  if (!searchable) view.movementId = null;
  const strips = () => collectionStrips(ctx.store.get().progress, index, view);

  // Salas de los movimientos dominados: arriba, como entrada a la galería de cada uno.
  const galleries = openGalleries(progress, index);
  const salas = galleries.length ? `<section class="coll-salas" aria-labelledby="salas-h">
      <h2 id="salas-h" class="coll-artist">Salas <span class="coll-count">${galleries.length}</span></h2>
      <ul class="sala-list">${galleries.map((m) => {
        const n = galleryWorks(progress, index, m.id).length;
        return `<li><button class="sala-link" data-action="gallery" data-id="${esc(m.id)}" style="${accentStyle(m.accent)}">
          <span class="sala-seal" aria-hidden="true">${icons.laurel(22)}</span>
          <span class="sala-text"><span class="sala-name">${esc(m.name)}</span><span class="sala-meta">${n} ${n === 1 ? 'obra' : 'obras'}</span></span>
          <span class="sala-go" aria-hidden="true">${icons.next(18)}</span></button></li>`;
      }).join('')}</ul>
    </section>` : '';

  el.innerHTML = page(ctx, 'collection', `
    <header class="section-head"><h1>Colección</h1><p class="section-sub">${ownedCount} de ${total} vistos</p></header>
    ${collTabs('works')}
    ${salas}
    ${ownedCount === 0
    ? `<div class="empty"><span class="empty-icon">${icons.frames(36)}</span><p>Cada cuadro que reconozcas se guardará aquí.</p>
        <a class="btn btn-primary" href="#inicio">Ir al camino</a></div>`
    : `${searchable ? `<div class="coll-controls">${controlsHtml(ctx, searchable)}</div>` : ''}<div class="coll-list">${listHtml(strips())}</div>`}`);
  focusHeading(el);
  playEra('menu');
  observeDeferred(el);

  const redraw = () => {
    el.querySelector('.coll-list').innerHTML = listHtml(strips());
    observeDeferred(el);
    el.querySelectorAll('[data-action="era"]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.id || null) === view.movementId)));
  };

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
    era: (b) => { ctx.audio.sfx('tap'); view.movementId = b.dataset.id || null; redraw(); },
    gallery: (b) => {
      ctx.audio.sfx('tap');
      ctx.go(`galeria-${b.dataset.id}`);
    },
  });
}
