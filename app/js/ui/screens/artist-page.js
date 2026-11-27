// Ficha de pintor como pantalla (`#pintor-<id>`, `#pintor-<id>-etapas`): atrás vuelve a donde estabas.

import { esc, accentStyle, focusHeading } from '../dom.js';
import { icons } from '../icons.js';
import { bottomNav } from '../shell.js';
import { observeDeferred } from '../lazy-img.js';
import { loadCss } from '../lazy-css.js';
import { loadSealCss } from '../seal.js';
import { profileHtml, wireProfile } from '../artist-profile.js';
import { playEra } from '../audio-bridge.js';

// Atrás del navegador si hay a dónde volver dentro de la app; si no (enlace directo), a la Colección.
export function goBack(ctx) {
  if (ctx.prevRoute()) history.back();
  else ctx.go('coleccion', { replace: true });
}

export const backButton = () => `<button type="button" class="ap-back" data-ap-nav="back" aria-label="Atrás">${icons.prev(22)}</button>`;

export async function renderArtistPage(ctx, el, artistId, { focus = '' } = {}) {
  const artist = ctx.index.artist(artistId);
  if (!artist) return ctx.go('coleccion', { replace: true });
  await Promise.all([loadCss('css/ficha.css'), loadSealCss()]);
  const html = await profileHtml(ctx, artistId, { playable: true, navigate: true, tag: 'h1', leadControl: backButton() });
  el.innerHTML = `<div class="page page-artist"><main class="content ap ap-page" id="main" style="${accentStyle(ctx.index.movement(artist.movementId)?.accent)}">${html}</main>${bottomNav('collection')}</div>`;
  playEra('menu');
  observeDeferred(el);
  el.querySelector('.ap-back').addEventListener('click', () => { ctx.audio.sfx('tap'); goBack(ctx); });
  wireProfile(ctx, el, artistId);
  miniHeader(ctx, el, artist);
  const row = focus === 'stages' ? el.querySelector('.hl-row') : null;
  if (row) {
    // Por «Ver etapas» (galería, logros): la vista va a la fila de sus niveles y el foco, a su primer círculo.
    row.scrollIntoView({ block: 'center', behavior: 'auto' });
    row.querySelector('.hl')?.focus({ preventScroll: true });
  } else focusHeading(el);
}

// Cabecera compacta (atrás, su cara, su nombre y el botón de jugar) que aparece al desplazarse, cuando el botón de jugar (o, sin él,
// el nombre) sale por arriba: la acción principal nunca se pierde. Oculta, no se puede alcanzar con el teclado.
function miniHeader(ctx, el, artist) {
  const main = el.querySelector('.ap-actions .btn');
  const anchor = main || el.querySelector('.ap-name');
  const face = el.querySelector('.ap-photo')?.innerHTML || '';
  // La misma palabra que el botón principal («Empezar», «Repasar»), sin el nivel.
  const verb = main?.firstChild?.textContent.trim() || '';
  const bar = document.createElement('div');
  bar.className = 'ap-mini';
  bar.inert = true;
  bar.setAttribute('aria-hidden', 'true');
  bar.innerHTML = `<button type="button" class="ap-mini-back" aria-label="Atrás">${icons.prev(22)}</button>
    <span class="ap-mini-av" aria-hidden="true">${face}</span><span class="ap-mini-name">${esc(artist.short || artist.name)}</span>
    ${main ? `<button type="button" class="ap-mini-play">${icons.play(14)}<span>${esc(verb)}</span></button>` : ''}`;
  el.querySelector('.page-artist').appendChild(bar);
  bar.querySelector('.ap-mini-back').addEventListener('click', () => { ctx.audio.sfx('tap'); goBack(ctx); });
  bar.querySelector('.ap-mini-play')?.addEventListener('click', () => main.click());
  if (!anchor || typeof IntersectionObserver !== 'function') return;
  new IntersectionObserver(([entry]) => {
    const on = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    bar.classList.toggle('is-on', on);
    bar.inert = !on;
    bar.setAttribute('aria-hidden', String(!on));
  }).observe(anchor);
}
