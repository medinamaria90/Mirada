// Entrada breve del repaso (#repaso): qué se va a repasar en una frase («Repasamos a Miguel Ángel y 5 cuadros más») con la
// cara del pintor a medias (al tocarla, su ficha) y «Empezar». Así no empieza sin decir nada. Solo HTML y sus toques.

import { esc, onAction, focusHeading } from '../dom.js';
import { icons } from '../icons.js';
import { avatarWork, avatarCrop, seenOf } from '../../engine/painters.js';
import { coverOf, mediumSrc } from '../art.js';
import { reviewIntroText, REVIEW_TITLE } from '../../engine/review.js';

function faceHtml(ctx, artistId) {
  const artist = artistId ? ctx.index.artist(artistId) : null;
  if (!artist) return `<span class="ri-icon" aria-hidden="true">${icons.repeat(34)}</span>`;
  // Su cara (un autorretrato visto) o, si no, un detalle de su cuadro más conocido: nunca solo las iniciales.
  const cover = coverOf(ctx.index, artist.id);
  const face = avatarWork(seenOf(ctx.store.get().progress, ctx.index, artist.id)) || (cover ? { work: cover, ...avatarCrop(cover) } : null);
  // A este tamaño, la imagen mediana (la miniatura del atlas se vería pixelada).
  const img = face ? `<img src="${esc(mediumSrc(face.work))}" alt="" decoding="async" style="object-position:${face.x}% ${face.y}%">` : '';
  return `<button type="button" class="ri-face" data-action="painter" aria-label="${esc(`${artist.name}: ver su ficha`)}"><span class="ri-av">${img}</span></button>`;
}

// onStart: empieza la ronda. Devuelve cómo quitar los toques.
export function showReviewIntro(ctx, el, session, onStart) {
  el.innerHTML = `<div class="welcome review-intro">
    <div class="lesson-bar ri-bar"><button class="icon-btn" data-action="leave" aria-label="Volver">${icons.close(22)}</button></div>
    <main class="welcome-body" id="main">
      ${faceHtml(ctx, session.started)}
      <p class="kicker">${esc(REVIEW_TITLE)}</p>
      <h1 class="welcome-title welcome-title-sm">${esc(reviewIntroText(session, ctx.index))}</h1>
      <button class="btn btn-primary btn-wide" data-action="start" data-primary>Empezar</button>
    </main>
  </div>`;
  focusHeading(el);
  const off = onAction(el, {
    start: () => { ctx.audio.sfx('tap'); off(); onStart(); },
    painter: () => { ctx.audio.sfx('tap'); off(); ctx.go(`pintor-${session.started}`); },
    leave: () => { ctx.audio.sfx('tap'); off(); history.length > 1 ? history.back() : ctx.go('inicio'); },
  });
  return off;
}
