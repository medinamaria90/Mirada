// Entrada breve del repaso (#repaso): qué se va a repasar en una frase («Repasamos a Miguel Ángel y 5 cuadros más») con la
// cara del pintor a medias (al tocarla, su ficha) y «Empezar». Así no empieza sin decir nada. Solo HTML y sus toques.

import { esc, onAction, focusHeading } from '../dom.js';
import { icons } from '../icons.js';
import { avatarHtml } from '../avatar.js';
import { avatarWork, seenOf } from '../../engine/painters.js';
import { reviewIntroText, REVIEW_TITLE } from '../../engine/review.js';

function faceHtml(ctx, artistId) {
  const artist = artistId ? ctx.index.artist(artistId) : null;
  if (!artist) return `<span class="ri-icon" aria-hidden="true">${icons.repeat(34)}</span>`;
  const face = avatarWork(seenOf(ctx.store.get().progress, ctx.index, artist.id));
  return `<button type="button" class="ri-face" data-action="painter" aria-label="${esc(`${artist.name}: ver su ficha`)}">${avatarHtml(artist, face, 'ri-av')}</button>`;
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
