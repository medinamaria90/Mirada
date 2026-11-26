// Piezas de la historia (ui/story-viewer.js): el cuadro a sangre con su barrido lento, el texto sobre el degradado con el pie
// de la obra y, en la última tarjeta, las dos acciones (Jugar, Ver más).

import { esc } from './dom.js';
import { icons } from './icons.js';
import { tinySrc } from './art.js';
import { frameFor, captionOf } from '../engine/stories.js';

const PAN_KINDS = 3; // barridos distintos (acercarse, deslizar a un lado y al otro), uno por tarjeta

// La obra, a sangre y centrada en su punto de interés o, si es muy alta o muy apaisada (o no tiene punto de interés), entera
// sobre un fondo desenfocado de ella misma. El barrido mueve el conjunto (solo transform).
export function mediaHtml(work, focus, pos, artistName) {
  if (!work) return '';
  const f = frameFor(work, focus);
  const crop = f.mode === 'crop';
  const alt = `${work.title}, de ${artistName}`;
  const img = `<img class="story-img" src="${esc(work.img)}" alt="${esc(alt)}" width="${work.w || 4}" height="${work.h || 3}" decoding="async" fetchpriority="high" draggable="false">`;
  const backdrop = crop ? '' : `<img class="story-bg" src="${esc(tinySrc(work))}" alt="" aria-hidden="true" draggable="false">`;
  return `<div class="story-art${crop ? ' is-crop' : ''}" style="--x:${f.x}%;--y:${f.y}%;--z:${f.zoom}">
    <div class="story-pan" data-pan="${pos % PAN_KINDS}">${backdrop}${img}</div></div>`;
}

// Texto de la tarjeta y su pie. En la última, además, la pista «Fíjate en…» (look, si la hay) y las acciones (play: false
// si no hay nada que jugar; more: false sin «Ver más»).
export function copyHtml(card, work, { last, look = '', play, more = true }) {
  const caption = captionOf(work);
  const foot = !last || (!play && !more) ? '' : `<div class="story-actions">
      ${more ? '<button type="button" class="btn story-more" data-st="more">Ver más</button>' : ''}
      ${play ? '<button type="button" class="btn btn-primary story-play" data-st="play">Jugar</button>' : ''}
    </div>`;
  return `<div class="story-copy" tabindex="-1"><p class="story-text">${esc(card.text)}</p>
      ${caption ? `<p class="story-caption">${esc(caption)}</p>` : ''}
      ${last && look ? `<p class="story-look">${icons.eye(18)}<span>${esc(look)}</span></p>` : ''}</div>${foot}`;
}
