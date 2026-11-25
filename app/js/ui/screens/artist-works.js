// Galería de un pintor (`#obras-<id>`) o de los invitados de un movimiento (`#obras-invitados-<movimiento>`): rejilla de 3
// columnas con todas sus obras desbloqueadas (cada una abre el visor y se pasan deslizando) y huecos discretos para las
// que faltan, sin imagen ni título. Atrás vuelve a donde estabas.

import { esc, accentStyle, focusHeading } from '../dom.js';
import { icons } from '../icons.js';
import { artFrame } from '../art.js';
import { bottomNav } from '../shell.js';
import { loadCss } from '../lazy-css.js';
import { observeDeferred } from '../lazy-img.js';
import { playEra } from '../audio-bridge.js';
import { seenOf } from '../../engine/painters.js';
import { collectionStrips } from '../../engine/collection.js';
import { goBack, backButton } from './artist-page.js';
import { missingHtml } from '../artist-profile.js';

// { title, works (cronológicas), total, movement, artistId | null } o null si no existe.
export function worksSpec(ctx, spec) {
  const { index } = ctx;
  const progress = ctx.store.get().progress;
  if (spec.kind === 'guests') {
    const strip = collectionStrips(progress, index, { movementId: spec.movementId }).find((s) => s.kind === 'guests');
    const movement = index.movement(spec.movementId);
    if (!strip || !movement) return null;
    return { title: `Invitados · ${movement.name}`, works: strip.works.slice().sort((a, b) => (a.yearSort || 0) - (b.yearSort || 0)), total: strip.total, movement, artistId: null };
  }
  const artist = index.artist(spec.artistId);
  if (!artist) return null;
  return { title: artist.name, works: seenOf(progress, index, artist.id), total: index.worksOf(artist.id).length, movement: index.movement(artist.movementId), artistId: artist.id };
}

// Cada obra vista con su miniatura (abre el visor). Lo que falta se resume en una frase al final (pintor: lo que se
// desbloquea y dónde; invitados: «y 22 por descubrir» y el autor bajo cada obra), nunca como una pared de casillas vacías.
export function worksGridHtml(index, group, works, { byAuthor = false } = {}) {
  const cell = (w) => `<li>${artFrame(w, { alt: '', cls: 'art-thumb', label: w.title, small: true, defer: true, zoom: { group, label: `Ver en grande: ${w.title}`, badge: false } })}${byAuthor ? `<span class="aw-who">${esc(index.artist(w.artistId)?.short || index.artist(w.artistId)?.name || '')}</span>` : ''}</li>`;
  return `<ul class="ap-grid aw-grid">${works.map(cell).join('')}</ul>`;
}

export async function renderArtistWorks(ctx, el, spec) {
  const data = worksSpec(ctx, spec);
  if (!data) return ctx.go('coleccion', { replace: true });
  await loadCss('css/ficha.css');
  const n = data.works.length;
  const gaps = data.total - n;
  const progress = ctx.store.get().progress;
  const missing = spec.kind === 'guests'
    ? (gaps > 0 ? `<p class="aw-more">y ${gaps} por descubrir</p>` : '')
    : missingHtml(progress, ctx.index, spec.artistId, n, data.total, 'obras');
  const body = n
    ? `${worksGridHtml(ctx.index, `aw-${spec.kind === 'guests' ? spec.movementId : spec.artistId}`, data.works, { byAuthor: spec.kind === 'guests' })}${missing}`
    : `<div class="aw-empty"><p>Los cuadros que veas de ${esc(data.title)} se guardarán aquí.</p><a class="btn btn-primary" href="#inicio">Ir al camino</a></div>`;
  el.innerHTML = `<div class="page page-works"><main class="content aw" id="main" style="${accentStyle(data.movement?.accent)}">
    <header class="aw-head">${backButton()}
      <div class="aw-titles"><h1 class="aw-title">${esc(data.title)}</h1><p class="aw-sub">${n} de ${data.total} cuadros</p></div>
      ${data.artistId && n ? `<button type="button" class="aw-ficha" data-artist="${esc(data.artistId)}">Su ficha${icons.next(16)}</button>` : ''}
    </header>
    ${body}
  </main>${bottomNav('collection')}</div>`;
  playEra('menu');
  el.querySelector('.ap-back').addEventListener('click', () => { ctx.audio.sfx('tap'); goBack(ctx); });
  observeDeferred(el);
  focusHeading(el);
}
