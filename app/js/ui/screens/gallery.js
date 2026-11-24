// Sala de un movimiento dominado: galería tranquila con sus obras reconocidas a buen tamaño, la
// frase de qué mirar en cada una y la música de la época. Se abre desde el sello del movimiento
// en el mapa y desde Colección.

import { esc, onAction, accentStyle, focusHeading, plural } from '../dom.js';
import { icons } from '../icons.js';
import { artFrame } from '../art.js';
import { playEra } from '../audio-bridge.js';
import { isGalleryOpen, galleryWorks } from '../../engine/goals.js';

// Mínimo de cuadros colgados: si aún se reconocen pocos, se completan con los de «Conoce a».
const MIN_WORKS = 3;

export function galleryList(ctx, movementId) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const works = galleryWorks(p, index, movementId);
  if (works.length < MIN_WORKS) {
    const seen = new Set(works.map((w) => w.id));
    const learn = index.stageArtists(movementId).flatMap((a) => index.learnWorks(a.id)).filter((w) => !seen.has(w.id));
    works.push(...learn.slice(0, MIN_WORKS - works.length));
    works.sort((a, b) => a.yearSort - b.yearSort);
  }
  return works;
}

export function renderGallery(ctx, el, movementId) {
  const { index } = ctx;
  const movement = index.movement(movementId);
  if (!movement || !index.visibleMovements.includes(movement)) {
    ctx.toast('Ese enlace no vale');
    return ctx.go('inicio', { replace: true });
  }
  if (!isGalleryOpen(ctx.store.get().progress, index, movementId)) {
    ctx.toast('Se abre al dominar el movimiento');
    return ctx.go('inicio', { replace: true });
  }
  const works = galleryList(ctx, movementId);
  const items = works.map((w, i) => {
    const a = index.artist(w.artistId);
    return `<li class="gallery-item">
      <figure class="gallery-figure">
        ${artFrame(w, { alt: `${w.title}, de ${a.name}`, eager: i < 2, cls: 'art-gallery', label: w.title, zoom: { group: 'gallery' } })}
        <figcaption>
          <span class="gallery-title">${esc(w.title)}</span>
          <span class="gallery-meta">${esc([a.name, w.year].filter(Boolean).join(' · '))}</span>
          ${w.look ? `<span class="gallery-look">${esc(w.look)}</span>` : ''}
        </figcaption>
      </figure>
    </li>`;
  }).join('');
  el.innerHTML = `<div class="gallery" style="${accentStyle(movement.accent)}">
    <div class="lesson-bar">
      <button class="icon-btn" data-action="leave" aria-label="Volver">${icons.close(22)}</button>
      <p class="lesson-bar-title">Sala</p>
    </div>
    <main class="gallery-body" id="main">
      <header class="gallery-head">
        <span class="gallery-seal" aria-hidden="true">${icons.laurel(28)}</span>
        <h1 class="gallery-name">${esc(movement.name)}</h1>
        <p class="gallery-sub">${esc(movement.period)} · ${plural(works.length, 'obra', 'obras')}</p>
        <p class="gallery-blurb">${esc(movement.blurb)}</p>
      </header>
      <ol class="gallery-list">${items}</ol>
      <button class="btn btn-secondary btn-wide gallery-back" data-action="leave">Volver</button>
    </main>
  </div>`;
  playEra(movement.era);
  focusHeading(el);
  onAction(el, {
    leave: () => {
      ctx.audio.sfx('tap');
      ctx.go(ctx.prevRoute && ctx.prevRoute() === 'coleccion' ? 'coleccion' : 'inicio');
    },
  });
}
