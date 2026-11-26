// Momento de dominar por primera vez a un gran maestro o un maestro (pantalla de resultado): su retrato o su cuadro, el
// sello que cae y por qué importa. Entra animado y se queda hasta que se cierra: la X de arriba, «Seguir», Esc o un toque
// fuera de la tarjeta. Al cerrarse, el foco vuelve al resultado. Con movimiento reducido, sin animación.

import { esc } from './dom.js';
import { icons } from './icons.js';
import { mediumSrc, coverOf } from './art.js';
import { sealHtml, loadSealCss } from './seal.js';
import { avatarWork, avatarCrop } from '../engine/painters.js';

const OUT_MS = 350;

export async function showMatchMoment(ctx, artistId) {
  const { index } = ctx;
  const artist = index.artist(artistId);
  const works = index.worksOf(artistId);
  const face = avatarWork(works, { selfOnly: true });
  const work = face ? face.work : coverOf(index, artistId);
  if (!artist || !work) return;
  await loadSealCss();
  const crop = face || avatarCrop(work);
  const dlg = document.createElement('dialog');
  dlg.className = 'match';
  dlg.setAttribute('aria-labelledby', 'match-name');
  dlg.innerHTML = `<button type="button" class="match-close" data-m="close" aria-label="Cerrar">${icons.close(24)}</button>
  <div class="match-card">
    <span class="match-art"><img src="${esc(mediumSrc(work))}" alt="" style="object-position:${crop.x}% ${crop.y}%" decoding="async"></span>
    <span class="match-seal">${sealHtml(artist, 'lg')}</span>
    <p class="match-name" id="match-name">${esc(artist.name)}</p>
    ${artist.why ? `<p class="match-why">${esc(artist.why.text)}</p>` : ''}
    <button type="button" class="btn btn-primary btn-wide match-go" data-m="close">Seguir</button>
  </div>`;
  document.body.appendChild(dlg);
  let done = false;
  const close = () => {
    if (done) return;
    done = true;
    ctx.audio?.sfx('tap');
    window.removeEventListener('hashchange', close);
    dlg.classList.add('is-out');
    setTimeout(() => { dlg.close(); dlg.remove(); }, OUT_MS);
  };
  // Un toque fuera de la tarjeta (en el fondo) o en la X o «Seguir» la cierra; dentro de la tarjeta, no.
  dlg.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-m="close"]') || !ev.target.closest('.match-card')) close();
  });
  dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); close(); });
  window.addEventListener('hashchange', close);
  dlg.showModal();
  dlg.querySelector('.match-go').focus({ preventScroll: true });
}
