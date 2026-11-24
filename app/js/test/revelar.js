// Test de cultura pictórica: la opción elegida y la correcta quedan a la vista por encima de la
// hoja de feedback (misma regla que la ronda de la app, ui/screens/lesson.js): se deja sitio debajo
// (lo que mide la hoja) y se desplaza lo justo, sin esconder la de arriba bajo la barra. Si las dos
// no caben a la vez, se ocultan las demás opciones para que queden juntas (.options.is-trimmed).

import { $, $$, prefersReducedMotion } from '../ui/dom.js';

const GAP_BAR = 8;
const GAP_SHEET = 12;
const ROOM_MARGIN = 20;
const PAD_EXTRA = 24;

export function revealAnswers(lesson) {
  const stage = $('.lesson-stage', lesson);
  const feedback = $('.feedback', lesson);
  const marked = $$('.option.is-correct, .option.is-wrong', stage);
  if (!stage || !feedback || !marked.length) return;
  const sheet = feedback.getBoundingClientRect();
  const overlapsX = marked.some((m) => { const r = m.getBoundingClientRect(); return r.right > sheet.left && r.left < sheet.right; });
  if (!overlapsX) return;
  const barBottom = $('.lesson-bar', lesson).getBoundingClientRect().bottom;
  // La hoja aún está entrando: su borde superior final sale de su alto.
  const sheetTop = window.innerHeight - sheet.height - (parseFloat(getComputedStyle(feedback).bottom) || 0);
  const span = () => {
    const rects = marked.map((m) => m.getBoundingClientRect());
    return { top: Math.min(...rects.map((r) => r.top)), bottom: Math.max(...rects.map((r) => r.bottom)) };
  };
  const room = sheetTop - barBottom - ROOM_MARGIN;
  let { top, bottom } = span();
  if (bottom - top > room && marked.length > 1) {
    $('.options', stage)?.classList.add('is-trimmed');
    ({ top, bottom } = span());
  }
  stage.style.paddingBottom = `${Math.ceil(sheet.height + PAD_EXTRA)}px`;
  const need = bottom + GAP_SHEET - sheetTop;
  const delta = need > 0 ? Math.min(need, Math.max(0, top - (barBottom + GAP_BAR))) : top < barBottom + GAP_BAR ? top - barBottom - GAP_BAR : 0;
  if (delta !== 0) window.scrollBy({ top: delta, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

// Al cambiar de pregunta: sin hueco extra ni opciones recortadas.
export function resetReveal(lesson) {
  const stage = $('.lesson-stage', lesson);
  if (stage) stage.style.paddingBottom = '';
}
