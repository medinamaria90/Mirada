// Ficha de pintor dentro de una ronda (feedback, «Conoce a»): un diálogo sobre la pantalla, sin cambiar de ruta
// para no perder la ronda. Fuera de las rondas la ficha es una pantalla (`#pintor-<id>`, screens/artist-page.js).
// El contenido es el mismo (ui/artist-profile.js).

import { accentStyle } from './dom.js';
import { icons } from './icons.js';
import { loadCss } from './lazy-css.js';
import { profileHtml, wireProfile } from './artist-profile.js';

let current = null;

export function closeArtistSheet() {
  if (current) current.close();
}

// opts: { opener }
export async function openArtistSheet(ctx, artistId, opts = {}) {
  const artist = ctx.index.artist(artistId);
  if (!artist) return null;
  closeArtistSheet();
  const opener = opts.opener || document.activeElement;
  await loadCss('css/ficha.css');
  const close = `<button type="button" class="ap-close" data-as="close" aria-label="Cerrar">${icons.close(22)}</button>`;
  const html = await profileHtml(ctx, artistId, { playable: false, navigate: false, tag: 'h2', leadControl: close });
  const dlg = document.createElement('dialog');
  dlg.className = 'artist-sheet';
  dlg.setAttribute('aria-labelledby', 'ap-name');
  dlg.setAttribute('style', accentStyle(ctx.index.movement(artist.movementId)?.accent));
  dlg.innerHTML = `<div class="ap ap-in-dialog">${html}</div>`;
  document.body.appendChild(dlg);

  const handle = { close: () => {
    if (current !== handle) return;
    current = null;
    if (dlg.open) dlg.close();
    dlg.remove();
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
  } };
  current = handle;
  wireProfile(ctx, dlg, artistId);
  dlg.addEventListener('click', (ev) => {
    if (ev.target === dlg || ev.target.closest('[data-as="close"]')) handle.close();
  });
  dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); handle.close(); });
  try { dlg.showModal(); } catch { dlg.setAttribute('open', ''); }
  dlg.querySelector('.ap-close').focus({ preventScroll: true });
  return handle;
}
