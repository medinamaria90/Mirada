// Colección (pestaña «Cuadros»): una franja por pintor con «n de m» y sus 3 últimas obras desbloqueadas, por
// movimiento en orden cronológico (o lo más reciente primero), invitados juntos y, con 15 pintores o más,
// buscador con sugerencias y filtro por movimiento. Tocar el nombre o «Ver todas» abre la ficha del pintor.

import { esc, onAction, focusHeading, accentStyle } from '../dom.js';
import { icons } from '../icons.js';
import { page } from '../shell.js';
import { artFrame } from '../art.js';
import { playEra } from '../audio-bridge.js';
import { openGalleries, galleryWorks } from '../../engine/goals.js';
import { collectionStrips, unlockedMap, unlockedPainterCount, unlockedMovements, suggestPool, SEARCH_MIN_PAINTERS } from '../../engine/collection.js';
import { eyeLabel } from './medals.js';
import { renderPainters, collTabs } from './collection-painters.js';
import { mountCard } from './collection-card.js';
import { loadCss } from '../lazy-css.js';
import { suggestBoxHtml, mountSuggestBox } from '../suggest-box.js';

// Orden y filtro elegidos: se quedan mientras se navega por la app.
const view = { recent: false, movementId: null };

function stripHtml(ctx, s) {
  const count = `<span class="coll-count" aria-label="${s.count} de ${s.total} cuadros">${s.count} de ${s.total}</span>`;
  const isGuests = s.kind === 'guests';
  const name = isGuests
    ? `<h2 class="coll-artist-name">${esc(s.name)}</h2>`
    : `<h2 class="coll-artist-name"><button type="button" class="coll-name-btn" data-artist="${esc(s.id)}">${esc(s.name)}${icons.next(16)}</button></h2>`;
  const all = isGuests
    ? '<button type="button" class="coll-all" data-action="painters">Ver todas</button>'
    : `<button type="button" class="coll-all" data-artist="${esc(s.id)}" data-focus="gallery" aria-label="Ver todas las obras de ${esc(s.name)}">Ver todas</button>`;
  const eye = isGuests ? '' : eyeLine(ctx, s.id);
  return `<section class="coll-strip" style="${accentStyle(s.movement.accent)}" aria-label="${esc(s.name)}">
      <header class="coll-strip-head">${name}${count}${all}</header>${eye}
      <ul class="coll-grid">${s.shown.map((w) => `<li><button class="coll-item" data-action="open" data-id="${esc(w.id)}" aria-label="${esc(w.title)}">
        ${artFrame(w, { alt: '', cls: 'art-thumb', label: w.title, thumb: true })}</button></li>`).join('')}</ul>
    </section>`;
}

// Franjas con un encabezado pequeño por movimiento (en el orden cronológico); en «recientes», sin encabezados.
function listHtml(ctx, strips) {
  let last = null;
  return strips.map((s) => {
    const head = !view.recent && s.movement.id !== last ? `<h3 class="coll-era" style="${accentStyle(s.movement.accent)}">${esc(s.movement.name)}</h3>` : '';
    last = s.movement.id;
    return head + stripHtml(ctx, s);
  }).join('');
}

function controlsHtml(ctx, searchable) {
  const { progress } = ctx.store.get();
  const chips = searchable ? `<div class="coll-chips" role="group" aria-label="Filtrar por movimiento">
      <button type="button" class="chip-filter" data-action="era" data-id="" aria-pressed="${!view.movementId}">Todos</button>
      ${unlockedMovements(progress, ctx.index).map((m) => `<button type="button" class="chip-filter" data-action="era" data-id="${esc(m.id)}" aria-pressed="${view.movementId === m.id}">${esc(m.name)}</button>`).join('')}
    </div>` : '';
  return `${searchable ? suggestBoxHtml() : ''}${chips}
    <button type="button" class="coll-recent" data-action="recent" aria-pressed="${view.recent}"><span class="coll-recent-box" aria-hidden="true">${icons.check(14)}</span>Lo último primero</button>`;
}

export async function renderCollection(ctx, el, { tab = 'works' } = {}) {
  if (tab === 'painters') return renderPainters(ctx, el);
  await loadCss('css/ficha.css');
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
    : `<div class="coll-controls">${controlsHtml(ctx, searchable)}</div><div class="coll-list">${listHtml(ctx, strips())}</div>`}
    <dialog class="card-dialog" aria-labelledby="dlg-title"></dialog>`);
  focusHeading(el);
  playEra('menu');

  // La ficha del cuadro pasa por todas las obras desbloqueadas, en el orden de la lista.
  let list = strips().flatMap((s) => s.works);
  const card = mountCard(ctx, el, () => list);
  const redraw = () => {
    const current = strips();
    list = current.flatMap((s) => s.works);
    el.querySelector('.coll-list').innerHTML = listHtml(ctx, current);
    el.querySelector('.coll-recent')?.setAttribute('aria-pressed', String(view.recent));
    el.querySelectorAll('[data-action="era"]').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.id || null) === view.movementId)));
  };

  if (searchable) {
    const stop = mountSuggestBox(el.querySelector('.sg'), {
      index,
      pool: () => suggestPool(ctx.store.get().progress, index),
      onPick: ({ kind, id }) => {
        const input = el.querySelector('.sg-input');
        if (kind === 'artist') {
          import('../artist-sheet.js').then((m) => m.openArtistSheet(ctx, id, { opener: input, playable: true })).catch((err) => console.error(err));
        } else {
          import('../viewer.js').then((m) => m.openViewer({ index, works: [index.artwork(id)], start: 0, reveal: true, opener: input })).catch((err) => console.error(err));
        }
      },
    });
    ctx.setCleanup(stop);
  }

  onAction(el, {
    ...card.handlers,
    recent: () => { ctx.audio.sfx('tap'); view.recent = !view.recent; redraw(); },
    era: (b) => { ctx.audio.sfx('tap'); view.movementId = b.dataset.id || null; redraw(); },
    painters: () => { ctx.audio.sfx('tap'); ctx.go('coleccion-pintores'); },
    gallery: (b) => {
      ctx.audio.sfx('tap');
      ctx.go(`galeria-${b.dataset.id}`);
    },
  });
}

// «Ojo de X · 3/7» bajo el nombre de un pintor dominado (meta larga visible).
export function eyeLine(ctx, artistId) {
  const e = eyeLabel(ctx, artistId);
  return e ? `<p class="eye-line">${icons.eye(16)}<span>${esc(e.text)}</span></p>` : '';
}
