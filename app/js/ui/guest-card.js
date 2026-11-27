// Tarjeta de invitado en la ronda (engine/guest-intro.js): antes de la primera pregunta sobre un invitado sin presentar,
// su cuadro, su nombre, quién era y su relación con el pintor de la ronda. No es pregunta ni puntúa: «Seguir» y a jugar.

import { esc } from './dom.js';
import { icons } from './icons.js';
import { artFrame } from './art.js';
import { loadCss } from './lazy-css.js';

export const loadGuestCss = () => loadCss('css/invitado.css');

// intro: { artistId, name, text, work } de engine/guest-intro.js guestIntro.
export function guestCardHtml(intro) {
  const w = intro.work;
  const art = w ? `<figure class="guest-art">${artFrame(w, { alt: '', eager: true, cls: 'art-hero guest-hero', label: w.title, zoom: { action: 'guest-zoom', label: `${w.title}, de ${intro.name}: ver en grande` } })}
      <figcaption class="guest-caption"><em>${esc(w.title)}</em>${w.year ? ` · ${esc(w.year)}` : ''}</figcaption></figure>` : '';
  return `<div class="guest-card" role="group" aria-labelledby="guest-title">
    <p class="guest-kicker">${icons.user(16)}<span>Invitado</span></p>
    <h1 class="guest-title" id="guest-title">Te presentamos a <span class="guest-name">${esc(intro.name)}</span></h1>
    ${art}
    ${intro.text ? `<p class="guest-text">${esc(intro.text)}</p>` : ''}
    <button class="btn btn-primary btn-wide guest-go" data-action="guest-continue" data-primary>Seguir</button>
  </div>`;
}
