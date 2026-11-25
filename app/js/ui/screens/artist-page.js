// Ficha de pintor como pantalla (`#pintor-<id>`, `#pintor-<id>-etapas`): atrás vuelve a donde estabas.

import { accentStyle, focusHeading } from '../dom.js';
import { icons } from '../icons.js';
import { bottomNav } from '../shell.js';
import { observeDeferred } from '../lazy-img.js';
import { loadCss } from '../lazy-css.js';
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
  await loadCss('css/ficha.css');
  const html = await profileHtml(ctx, artistId, { playable: true, navigate: true, tag: 'h1', leadControl: backButton() });
  el.innerHTML = `<div class="page page-artist"><main class="content ap ap-page" id="main" style="${accentStyle(ctx.index.movement(artist.movementId)?.accent)}">${html}</main>${bottomNav('collection')}</div>`;
  playEra('menu');
  observeDeferred(el);
  el.querySelector('.ap-back').addEventListener('click', () => { ctx.audio.sfx('tap'); goBack(ctx); });
  wireProfile(ctx, el, artistId);
  const target = focus === 'stages' ? el.querySelector('.ap-stages-section') : null;
  if (target) target.scrollIntoView({ block: 'start', behavior: 'auto' });
  else focusHeading(el);
}
