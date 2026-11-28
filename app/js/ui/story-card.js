// Piezas de la historia (ui/story-viewer.js): el cuadro a sangre con su barrido lento, el texto sobre el degradado con el pie
// de la obra y el pie con los botones comunes (deck-nav.js).

import { esc } from './dom.js';
import { icons } from './icons.js';
import { tinySrc } from './art.js';
import { actionsHtml, DECK_LABEL } from './deck-nav.js';
import { frameFor, captionOf, storySrc } from '../engine/stories.js';

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
  const img = `<img class="story-img" src="${esc(storySrc(work, focus, region))}" alt="${esc(alt)}" width="${work.w || 4}" height="${work.h || 3}" decoding="async" fetchpriority="high" draggable="false">`;
  const backdrop = crop ? '' : `<img class="story-bg" src="${esc(tinySrc(work))}" alt="" aria-hidden="true" draggable="false">`;
  const box = crop ? ` style="--bl:${f.box.left}%;--bt:${f.box.top}%;--bw:${f.box.width}%;--bh:${f.box.height}%"` : '';
  const pan = crop ? `pan-${pos % PAN_KINDS}` : `fit-${pos % FIT_KINDS}`;
  return `<div class="story-art${crop ? ' is-crop' : ' is-fit'}"${box}>
    <div class="story-pan" data-pan="${pan}">${backdrop}${img}</div></div>`;
}

// Texto de la tarjeta y su pie. En la última, además, la pista «Fíjate en…» (look, si la hay). El pie es el de todos los visores
// de tarjetas (deck-nav.js): «Seguir» destacado y, si después hay preguntas (questions: su texto), «Ir a las preguntas»; en la
// última, el principal pasa a ser endLabel («Volver», «Seguir»…) o, con questionsEnd (después solo vienen las preguntas),
// «Ir a las preguntas». about: en la última, el secundario «Más sobre…» (la ficha, para ampliar). suggest: en la última, otra
// historia sugerida (la sesión «Repasar»), como enlace sobre los botones.
// card.kicker: un antetítulo (tarjetas de época).
export function copyHtml(card, work, { last, look = '', endLabel = DECK_LABEL.next, questions = '', questionsEnd = false, about = '', suggest = '' }) {
  const caption = captionOf(work);
  const kicker = card.kicker ? `<p class="story-kicker">${esc(card.kicker)}</p>` : '';
  return `<div class="story-copy" tabindex="-1">${kicker}<p class="story-text">${esc(card.text)}</p>
      ${caption ? `<p class="story-caption">${esc(caption)}</p>` : ''}
      ${last && look ? `<p class="story-look">${icons.eye(18)}<span>${esc(look)}</span></p>` : ''}</div>${footHtml(last, { endLabel, questions, questionsEnd, about, suggest })}`;
}

function footHtml(last, { endLabel, questions, questionsEnd, about, suggest }) {
  const skip = questions ? { label: questions, action: 'questions' } : null;
  if (!last) return actionsHtml({ secondary: skip, primary: { label: DECK_LABEL.next, action: 'next' } });
  const link = suggest ? `<button type="button" class="story-suggest" data-deck="more">${esc(suggest)}</button>` : '';
  const more = about ? { label: about, action: 'more' } : null;
  const end = questions && questionsEnd
    ? actionsHtml({ secondary: more, primary: { label: questions, action: 'play' } })
    : actionsHtml({ secondary: more || skip, primary: { label: endLabel, action: 'play' } });
  return link + end;
}
