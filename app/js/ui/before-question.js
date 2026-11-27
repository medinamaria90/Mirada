// «¿Quién fue antes?» en la ronda (engine/question-before.js): dos tarjetas con el cuadro más conocido de cada pintor y su
// nombre; se responde pulsando la tarjeta (el cuadro es la carátula del pintor). La respuesta lleva la mini cinta.

import { esc } from './dom.js';
import { artFrame } from './art.js';
import { ribbonHtml } from './chrono-ribbon.js';

export function beforeQuestionHtml(index, q, head) {
  const opts = q.options.map((o, i) => `<button class="option option-before" data-action="answer" data-id="${esc(o.id)}">
      ${artFrame(index.artwork(o.artworkId), { alt: '', eager: true, small: true, cls: 'before-art', label: '' })}
      <span class="before-name"><span class="key" aria-hidden="true">${i + 1}</span>${esc(o.label)}</span></button>`).join('');
  return `<div class="q-head">${head}</div><div class="options options-before" role="group" aria-label="Respuestas">${opts}</div>`;
}

// La mini cinta bajo la frase de la respuesta (fb.ribbon de engine/feedback.js), o '' si no la hay.
export const beforeRibbonHtml = (ctx, fb) => (fb.ribbon ? ribbonHtml(ctx, fb.ribbon) : '');
