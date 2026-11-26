// Ficha de pintor dentro de una ronda (feedback, «Conoce a»): un diálogo sobre la pantalla, sin cambiar de ruta
// para no perder la ronda. Fuera de las rondas la ficha es una pantalla (`#pintor-<id>`, screens/artist-page.js).
// El contenido es el mismo (ui/artist-profile.js).

import { accentStyle } from './dom.js';
import { icons } from './icons.js';
import { observeDeferred } from './lazy-img.js';
import { loadCss } from './lazy-css.js';
import { loadSealCss } from './seal.js';
import { profileHtml, wireProfile } from './artist-profile.js';
import { modalSlot, mountSheet } from './modal-slot.js';

const slot = modalSlot();

export function closeArtistSheet() {
  slot.close();
}

// opts: { opener, playable, branchId } (dentro de una ronda no se ofrece jugar; desde la hoja de una rama del mapa sí,
// y «Jugar» sigue en esa rama).
export async function openArtistSheet(ctx, artistId, opts = {}) {
  const artist = ctx.index.artist(artistId);
  if (!artist) return null;
  const turn = slot.begin();
  const opener = opts.opener || document.activeElement;
  await Promise.all([loadCss('css/ficha.css'), loadSealCss()]);
  const close = `<button type="button" class="ap-close" data-as="close" aria-label="Cerrar">${icons.close(22)}</button>`;
  const html = await profileHtml(ctx, artistId, { playable: opts.playable === true, branchId: opts.branchId || '', navigate: false, tag: 'h2', leadControl: close });
  if (slot.stale(turn)) return null; // otro toque ha pedido otra hoja mientras cargaba esta
  const dlg = document.createElement('dialog');
  dlg.className = 'artist-sheet';
  dlg.setAttribute('aria-labelledby', 'ap-name');
  dlg.setAttribute('style', accentStyle(ctx.index.movement(artist.movementId)?.accent));
  dlg.innerHTML = `<div class="ap ap-in-dialog">${html}</div>`;
  document.body.appendChild(dlg);

  const handle = {};
  mountSheet(dlg, { slot, handle, opener, closeSelector: '[data-as="close"]' });
  wireProfile(ctx, dlg, artistId, { beforeGo: () => handle.close() });
  observeDeferred(dlg);
  dlg.querySelector('.ap-close').focus({ preventScroll: true });
  return handle;
}
