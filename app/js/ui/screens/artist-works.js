// Galería de un pintor (`#obras-<id>`) o de los invitados de un movimiento (`#obras-invitados-<movimiento>`): rejilla de 3
// columnas con todas sus obras desbloqueadas (cada una abre el visor y se pasan deslizando) y huecos discretos para las
// que faltan, sin imagen ni título. Atrás vuelve a donde estabas.

import { esc, accentStyle, focusHeading } from '../dom.js';
import { icons } from '../icons.js';
import { artFrame } from '../art.js';
import { bottomNav } from '../shell.js';
import { loadCss } from '../lazy-css.js';
import { playEra } from '../audio-bridge.js';
import { seenOf } from '../../engine/painters.js';
import { collectionStrips } from '../../engine/collection.js';
import { goBack, backButton } from './artist-page.js';

// { title, works (cronológicas), total, movement, artistId | null } o null si no existe.
export function worksSpec(ctx, spec) {
  const { index } = ctx;
  const progress = ctx.store.get().progress;
  if (spec.kind === 'guests') {
    const strip = collectionStrips(progress, index, { movementId: spec.movementId }).find((s) => s.kind === 'guests');
    const movement = index.movement(spec.movementId);
    if (!strip || !movement) return null;
    return { title: 'Invitados', works: strip.works.slice().sort((a, b) => (a.yearSort || 0) - (b.yearSort || 0)), total: strip.total, movement, artistId: null };
  }
  const artist = index.artist(spec.artistId);
  if (!artist) return null;
  return { title: artist.name, works: seenOf(progress, index, artist.id), total: index.worksOf(artist.id).length, movement: index.movement(artist.movementId), artistId: artist.id };
}

export function worksGridHtml(group, works, total) {
  const gaps = Math.max(0, total - works.length);
  return `<ul class="ap-grid aw-grid">${works.map((w) => `<li>${artFrame(w, { alt: '', cls: 'art-thumb', label: w.title, thumb: true, zoom: { group, label: `Ver en grande: ${w.title}` } })}</li>`).join('')}${'<li class="ap-gap" aria-hidden="true"></li>'.repeat(gaps)}</ul>`;
}

export async function renderArtistWorks(ctx, el, spec) {
  const data = worksSpec(ctx, spec);
  if (!data) return ctx.go('coleccion', { replace: true });
  await loadCss('css/ficha.css');
  const n = data.works.length;
  const gaps = data.total - n;
  el.innerHTML = `<div class="page page-works"><main class="content aw" id="main" style="${accentStyle(data.movement?.accent)}">
    <header class="aw-head">${backButton()}
      <div class="aw-titles"><h1 class="aw-title">${esc(data.title)}</h1><p class="aw-sub">${n} de ${data.total} cuadros</p></div>
      ${data.artistId ? `<button type="button" class="aw-ficha" data-artist="${esc(data.artistId)}">Su ficha${icons.next(16)}</button>` : ''}
    </header>
    ${worksGridHtml(`aw-${spec.kind === 'guests' ? spec.movementId : spec.artistId}`, data.works, data.total)}
    ${gaps > 0 ? `<p class="sr-only">${gaps === 1 ? 'Falta 1 cuadro por descubrir' : `Faltan ${gaps} cuadros por descubrir`}</p>` : ''}
  </main>${bottomNav('collection')}</div>`;
  playEra('menu');
  el.querySelector('.ap-back').addEventListener('click', () => { ctx.audio.sfx('tap'); goBack(ctx); });
  focusHeading(el);
}
