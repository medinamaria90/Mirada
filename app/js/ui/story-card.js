// Piezas de la historia (ui/story-viewer.js): el cuadro a sangre con su barrido lento, el texto sobre el degradado con el pie
// de la obra y, en la última tarjeta, las dos acciones (Jugar, Ver más).

import { esc } from './dom.js';
import { icons } from './icons.js';
import { tinySrc } from './art.js';
import { frameFor, captionOf } from '../engine/stories.js';

const PAN_KINDS = 3; // barridos a sangre (acercarse, deslizar a un lado y al otro), uno por tarjeta
const FIT_KINDS = 2; // con la obra entera, solo un zoom suave (acercarse o alejarse): no se pierde nada de los bordes

// La obra, a sangre con su punto de interés por encima del texto o, si el recorte perdería demasiado, entera sobre un fondo
// desenfocado de ella misma y en el hueco que deja el texto (engine/stories.js, frameFor). `frame`: proporción del marco.
// El barrido mueve el conjunto (solo transform). `region`: el detalle intencionado de la tarjeta, si lo tiene.
export function mediaHtml(work, focus, pos, artistName, frame, region = null) {
  if (!work) return '';
  const f = frameFor(work, focus, frame, region);
  const crop = f.mode === 'crop';
  const alt = `${work.title}, de ${artistName}`;
  const img = `<img class="story-img" src="${esc(work.img)}" alt="${esc(alt)}" width="${work.w || 4}" height="${work.h || 3}" decoding="async" fetchpriority="high" draggable="false">`;
  const backdrop = crop ? '' : `<img class="story-bg" src="${esc(tinySrc(work))}" alt="" aria-hidden="true" draggable="false">`;
  const box = crop ? ` style="--bl:${f.box.left}%;--bt:${f.box.top}%;--bw:${f.box.width}%;--bh:${f.box.height}%"` : '';
  const pan = crop ? `pan-${pos % PAN_KINDS}` : `fit-${pos % FIT_KINDS}`;
  return `<div class="story-art${crop ? ' is-crop' : ' is-fit'}"${box}>
    <div class="story-pan" data-pan="${pan}">${backdrop}${img}</div></div>`;
}

// Texto de la tarjeta y su pie. En la última, además, la pista «Fíjate en…» (look, si la hay) y las acciones (play: false
// si no hay nada que jugar; playLabel, su texto: «Repetir nivel» al volver a ver la de un nivel hecho; more: false sin «Ver más»).
export function copyHtml(card, work, { last, look = '', play, playLabel = 'Jugar', more = true }) {
  const caption = captionOf(work);
  const foot = !last || (!play && !more) ? '' : `<div class="story-actions">
      ${more ? '<button type="button" class="btn story-more" data-st="more">Ver más</button>' : ''}
      ${play ? `<button type="button" class="btn btn-primary story-play" data-st="play">${esc(playLabel)}</button>` : ''}
    </div>`;
  return `<div class="story-copy" tabindex="-1"><p class="story-text">${esc(card.text)}</p>
      ${caption ? `<p class="story-caption">${esc(caption)}</p>` : ''}
      ${last && look ? `<p class="story-look">${icons.eye(18)}<span>${esc(look)}</span></p>` : ''}</div>${foot}`;
}
