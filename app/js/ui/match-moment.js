// Momento de dominar por primera vez a un gran maestro o un maestro (pantalla de resultado): su retrato o su cuadro, el
// sello que cae y por qué importa. Dura unos 2 s, se salta con un toque o una tecla y no roba el foco: el resultado queda
// debajo, tal cual (y su aviso para lectores de pantalla lo cuenta). Con movimiento reducido, quieto (mismo tiempo, sin animación).

import { esc } from './dom.js';
import { mediumSrc, coverOf } from './art.js';
import { sealHtml, loadSealCss } from './seal.js';
import { avatarWork, avatarCrop } from '../engine/painters.js';

const SHOW_MS = 2400;
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
  const el = document.createElement('div');
  el.className = 'match';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<div class="match-card">
    <span class="match-art"><img src="${esc(mediumSrc(work))}" alt="" style="object-position:${crop.x}% ${crop.y}%" decoding="async"></span>
    <span class="match-seal">${sealHtml(artist, 'lg')}</span>
    <p class="match-name">${esc(artist.name)}</p>
    ${artist.why ? `<p class="match-why">${esc(artist.why.text)}</p>` : ''}
  </div>`;
  document.body.appendChild(el);
  let timer = 0;
  let done = false;
  const close = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    window.removeEventListener('keydown', close, true);
    window.removeEventListener('hashchange', close);
    el.classList.add('is-out');
    setTimeout(() => el.remove(), OUT_MS);
  };
  timer = setTimeout(close, SHOW_MS);
  el.addEventListener('click', close, { once: true });
  window.addEventListener('keydown', close, true);
  window.addEventListener('hashchange', close);
}
