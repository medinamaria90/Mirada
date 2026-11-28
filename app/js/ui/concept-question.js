// Preguntas de concepto en la ronda (engine/concepts.js): «¿Cuál de estos cuadros es…?» con cuatro cuadros como opciones
// (como «¿Cuál es de X?») y las demás con uno o dos cuadros arriba y cuatro respuestas de texto. Hasta responder no se ve
// ni título ni autor y las firmas van veladas; al responder, cada cuadro dice cuál es y la hoja explica el porqué.

import { esc, $, $$ } from './dom.js';
import { artFrame } from './art.js';
import { marcoHtml } from './marco.js';
import { veilsHtml } from './signature-veil.js';
import { tagWrongArt } from './wrong-tag.js';
import { loadCss } from './lazy-css.js';
import { CUAL } from '../engine/concepts.js';

export const loadConceptCss = () => loadCss('css/conceptos.css');

export function conceptQuestionHtml(index, q, head, dunno) {
  if (q.kind === CUAL) {
    // Pulsar un cuadro abre el visor con los cuatro («Es este» responde); 1-4 responden directo.
    const opts = q.options.map((o, i) => {
      const w = index.artwork(o.artworkId);
      return `<button class="option option-art" data-action="pick" data-id="${esc(o.id)}" data-pos="${i}" aria-label="Opción ${i + 1}" aria-haspopup="dialog">
        ${marcoHtml(w, { alt: '', eager: true, label: `Opción ${i + 1}`, veils: veilsHtml(w) })}<span class="key" aria-hidden="true">${i + 1}</span></button>`;
    }).join('');
    return `<div class="q-head">${head}</div><div class="options options-grid" role="group" aria-label="Elige un cuadro">${opts}</div>${dunno}`;
  }
  const many = q.works.length > 1;
  const works = q.works.map((id, i) => {
    const w = index.artwork(id);
    const label = q.labels[i] || '';
    const name = many ? `Cuadro ${i + 1}${label ? `, ${label}` : ''}` : 'Cuadro';
    return `<figure class="cq-work" data-pos="${i}">
        ${label ? `<figcaption class="cq-label">${esc(label)}</figcaption>` : ''}
        ${artFrame(w, { alt: '', eager: true, cls: 'cq-art', veils: veilsHtml(w), label: name, zoom: { action: 'cq-zoom', label: `${name}: ver en grande` } })}
        <p class="cq-title" aria-live="polite"></p>
      </figure>`;
  }).join('');
  const opts = q.options.map((o, i) => `<button class="option" data-action="answer" data-id="${esc(o.id)}"><span class="key" aria-hidden="true">${i + 1}</span><span class="opt-text">${esc(o.label)}</span></button>`).join('');
  return `<div class="q-head">${head}</div><div class="cq-works${many ? ' is-pair' : ''}">${works}</div>
    <div class="options options-list" role="group" aria-label="Respuestas">${opts}${dunno}</div>`;
}

// Al responder: cada cuadro de arriba dice cuál es (título · pintor) y, en «¿Cuál…?», el elegido por error, de qué época era.
export function revealConcept(stage, index, q, chosenId) {
  const caption = (id) => {
    const w = index.artwork(id);
    const who = w ? index.artist(w.artistId) : null;
    return w ? `${w.title}${who ? ` · ${who.short || who.name}` : ''}` : '';
  };
  if (q.kind === CUAL) {
    const chosen = q.options.find((o) => o.id === chosenId);
    const era = chosen && chosen.id !== q.answerId ? index.movement(chosen.movementId) : null;
    if (era) tagWrongArt(stage, era.name);
    return;
  }
  $$('.cq-work', stage).forEach((fig, i) => {
    const line = $('.cq-title', fig);
    if (line) line.textContent = caption(q.works[i]);
    fig.classList.add('is-told');
  });
}

// Cuerpo de la hoja de respuesta: el porqué de la elegida (si falló) y el de la buena.
export const conceptLinesHtml = (fb) => fb.lines.map((t) => `<p class="fb-line">${esc(t)}</p>`).join('');
