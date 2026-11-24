// Lupa del día: recorte ampliado de una obra ya aprendida y «¿De quién es?». La pregunta se hace en el
// cuadro de diálogo que abre la franja «Hoy» (home-today.js); resuelta, la franja abre el cuadro en el
// visor. Solo construye HTML; el DOM lo toca answerDetailCard.

import { esc, announce } from '../dom.js';
import { icons } from '../icons.js';
import { topBar } from '../shell.js';
import { ZOOM_BADGE } from '../art.js';
import { planDetail, answerDetail } from '../../engine/goals.js';

export const DETAIL_NAME = 'Lupa del día';
const KICKER_ICON = 14;

export function detailCard(ctx) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const day = ctx.dailyDay();
  const plan = planDetail(p, index, day);
  if (!plan || p.detail?.[day]) return '';
  return `<section class="card-detail" aria-labelledby="detail-h" data-day="${esc(day)}">
    ${detailCrop(index, plan)}
    <div class="detail-body">
      ${detailKicker()}
      <h2 id="detail-h" class="detail-q">¿De quién es?</h2>
      <div class="detail-options" role="group" aria-labelledby="detail-h">${plan.options.map((o) => `<button class="option detail-option" data-action="detail" data-id="${esc(o.id)}">${esc(o.label)}</button>`).join('')}</div>
    </div>
  </section>`;
}

function detailKicker() {
  return `<p class="card-kicker detail-kicker">${icons.loupe(KICKER_ICON)}<span>${DETAIL_NAME}</span></p>`;
}

function detailCrop(index, plan, alt = 'Detalle de un cuadro') {
  const w = index.artwork(plan.artworkId);
  const { x, y, scale } = plan.crop;
  return `<div class="detail-crop" style="--cx:${x}%;--cy:${y}%;--cs:${scale}">
    <img src="${esc(w.img)}" alt="${esc(alt)}" width="${w.w}" height="${w.h}" loading="lazy" decoding="async">
  </div>`;
}

// Tras responder, el recorte abre el cuadro entero en el visor (antes no: lo desvelaría).
function detailZoom(index, plan) {
  const w = index.artwork(plan.artworkId);
  return `<button type="button" class="detail-zoom" data-zoom="${esc(w.id)}" aria-label="Ver en grande: ${esc(w.title)}">${detailCrop(index, plan, '')}${ZOOM_BADGE}</button>`;
}

function detailAnswered(index, plan, done) {
  const w = index.artwork(plan.artworkId);
  const a = index.artist(plan.answerId);
  return `<p class="detail-result ${done.correct ? 'is-ok' : 'is-bad'}">${done.correct ? `${icons.check(18)}<span>Es de ${esc(a.name)}</span>` : `${icons.eye(18)}<span>Es de ${esc(a.name)}</span>`}</p>
      <p class="detail-work"><em>${esc(w.title)}</em>${w.year ? ` · ${esc(w.year)}` : ''}</p>`;
}

// Respuesta en vivo: la tarjeta muestra el resultado en su sitio.
export function answerDetailCard(ctx, el, button) {
  const { index } = ctx;
  const card = button.closest('.card-detail');
  const day = card?.dataset.day;
  if (!card || day !== ctx.dailyDay()) return;
  const plan = planDetail(ctx.store.get().progress, index, day);
  let outcome = null;
  ctx.store.update((s) => {
    outcome = answerDetail(s.progress, plan, button.dataset.id, ctx.today());
    return outcome ? { ...s, progress: outcome.progress } : s;
  });
  if (!outcome) return;
  ctx.audio.sfx(outcome.correct ? 'correct' : 'wrong');
  const done = { correct: outcome.correct };
  const body = card.querySelector('.detail-body');
  body.querySelector('.detail-options').outerHTML = `${detailAnswered(index, plan, done)}${outcome.xp ? `<p class="detail-xp">+${outcome.xp} XP</p>` : ''}`;
  card.querySelector('.detail-crop')?.replaceWith(document.createRange().createContextualFragment(detailZoom(index, plan)));
  const top = el.querySelector('.topbar');
  if (top) top.outerHTML = topBar(ctx);
  const result = body.querySelector('.detail-result');
  result.setAttribute('tabindex', '-1');
  result.focus({ preventScroll: true });
  announce(`${outcome.correct ? 'Bien visto. ' : ''}${result.textContent.trim()}`);
}
