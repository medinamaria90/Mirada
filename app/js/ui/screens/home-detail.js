// Lupa del día (portada): recorte ampliado de una obra ya aprendida y «¿De quién es?». Resuelta,
// la tarjeta se encoge a una sola fila (miniatura, nombre y «Título · Pintor») que abre el visor,
// para que no se confunda con el reto diario. Solo construye HTML; el DOM lo toca answerDetailCard.

import { esc, announce } from '../dom.js';
import { icons } from '../icons.js';
import { topBar } from '../shell.js';
import { artFrame, ZOOM_BADGE } from '../art.js';
import { planDetail, answerDetail } from '../../engine/goals.js';

export const DETAIL_NAME = 'Lupa del día';
const KICKER_ICON = 14;

export function detailCard(ctx) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const day = ctx.dailyDay();
  const plan = planDetail(p, index, day);
  if (!plan) return '';
  const done = p.detail?.[day];
  if (done) return detailDone(index, plan, done, day);
  return `<section class="card-detail" aria-labelledby="detail-h" data-day="${esc(day)}">
    ${detailCrop(index, plan)}
    <div class="detail-body">
      ${detailKicker('p')}
      <h2 id="detail-h" class="detail-q">¿De quién es?</h2>
      <div class="detail-options" role="group" aria-labelledby="detail-h">${plan.options.map((o) => `<button class="option detail-option" data-action="detail" data-id="${esc(o.id)}">${esc(o.label)}</button>`).join('')}</div>
    </div>
  </section>`;
}

// Fila del bloque «Hoy»: pendiente, plegable con un recorte pequeño de muestra (al abrirla, la
// tarjeta entera); resuelta, la misma fila compacta de la portada.
export function detailRow(ctx, plan) {
  const { index } = ctx;
  const done = ctx.store.get().progress.detail?.[plan.day];
  if (done) return detailDone(index, plan, done, plan.day);
  return `<details class="today-detail">
      <summary class="today-row">
        <span class="today-icon today-crop" aria-hidden="true">${detailCrop(index, plan, '')}</span>
        <span class="today-text"><span class="today-name">${DETAIL_NAME}</span><span class="today-sub">¿De quién es?</span></span>
        <span class="today-more" aria-hidden="true">${icons.next(18)}</span>
      </summary>
      ${detailCard(ctx)}
    </details>`;
}

function detailKicker(tag) {
  return `<${tag} class="card-kicker detail-kicker">${icons.loupe(KICKER_ICON)}<span>${DETAIL_NAME}</span></${tag}>`;
}

// Resuelta: una sola fila pulsable (abre el cuadro entero en el visor) con la miniatura del atlas,
// el nombre pequeño y «Título · Pintor». Sin pregunta ni recorte grande: no parece un reto pendiente.
// La obra sale de lo guardado (lo aprendido después puede cambiar el plan del día).
function detailDone(index, plan, done, day) {
  const w = index.artwork(done.artworkId) || index.artwork(plan.artworkId);
  const a = index.artist(w.artistId);
  return `<section class="card-detail is-done" aria-label="${DETAIL_NAME}" data-day="${esc(day)}">
    <button type="button" class="detail-done" data-zoom="${esc(w.id)}" aria-label="Ver en grande: ${esc(w.title)}, de ${esc(a.name)}">
      ${artFrame(w, { cls: 'detail-thumb', alt: '', label: '', thumb: true })}
      <span class="detail-done-text">
        ${detailKicker('span')}
        <span class="detail-done-work"><em>${esc(w.title)}</em> · ${esc(a.short || a.name)}</span>
      </span>
      <span class="detail-done-go" aria-hidden="true">${icons.next(18)}</span>
    </button>
  </section>`;
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

// Respuesta en vivo: la tarjeta muestra el resultado en su sitio (la fila compacta llega al volver
// a pintar la portada).
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
  const rowSub = card.closest('.today-detail')?.querySelector('.today-sub');
  if (rowSub) rowSub.textContent = outcome.correct ? 'Bien visto' : 'Hecho';
  const result = body.querySelector('.detail-result');
  result.setAttribute('tabindex', '-1');
  result.focus({ preventScroll: true });
  announce(`${outcome.correct ? 'Bien visto. ' : ''}${result.textContent.trim()}`);
}
