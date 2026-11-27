// Piezas de la Colección: la fila «Lo último» (cuadros en su proporción, se abren en el visor) y una fila por época con
// sus pintores en tarjetas (portada de su cuadro visto más famoso; tocarla lleva a su ficha) y, detrás, los que esperan,
// bloqueados (monograma y candado, sin ninguna obra suya; tocarlos abre su hoja).

import { esc, accentStyle, plural } from '../dom.js';
import { icons } from '../icons.js';
import { artFrame, smallSrc } from '../art.js';
import { initials } from '../avatar.js';
import { avatarCrop } from '../../engine/painters.js';

export const RECENT_GROUP = 'cx-recent';

export function recentHtml(works, total) {
  if (!works.length) return '';
  const all = total > works.length ? `<a class="cx-all" href="#coleccion-cuadros">Ver los ${total}${icons.next(16)}</a>` : '';
  return `<section class="cx-sec" aria-labelledby="cx-recent-h">
    <div class="cx-head"><h2 class="cx-h" id="cx-recent-h">Lo último</h2>${all}</div>
    <ul class="cx-rail cx-works">${works.map((w) => `<li>${artFrame(w, { alt: '', cls: 'cx-work', label: w.title, small: true, defer: true, zoom: { group: RECENT_GROUP, label: `Ver en grande: ${w.title}`, badge: false } })}</li>`).join('')}</ul>
  </section>`;
}

function knownCard({ artist, state, seen, total, cover }) {
  const pos = cover ? avatarCrop(cover) : null;
  const img = cover
    ? `<img data-src="${esc(smallSrc(cover))}" alt="" loading="lazy" decoding="async" style="object-position:${pos.x}% ${pos.y}%">`
    : `<span class="cx-mono" aria-hidden="true">${esc(initials(artist.name))}</span>`;
  const done = state === 'mastered';
  return `<li><button type="button" class="cx-card${done ? ' is-mastered' : ''}" data-artist="${esc(artist.id)}" aria-label="${esc(`${artist.name}, ${seen} de ${total} cuadros${done ? ', dominado' : ''}`)}">
    <span class="cx-cover">${img}${done ? `<span class="cx-badge" aria-hidden="true">${icons.check(12)}</span>` : ''}</span>
    <span class="cx-name">${esc(artist.short || artist.name)}</span><span class="cx-sub">${seen} de ${total}</span></button></li>`;
}

function lockedCard({ artist }) {
  return `<li><button type="button" class="cx-card is-locked" data-locked="${esc(artist.id)}" aria-label="${esc(`${artist.name}, por descubrir`)}">
    <span class="cx-cover"><span class="cx-mono" aria-hidden="true">${esc(initials(artist.name))}</span><span class="cx-lock" aria-hidden="true">${icons.lock(14)}</span></span>
    <span class="cx-name">${esc(artist.short || artist.name)}</span><span class="cx-sub">Por descubrir</span></button></li>`;
}

// Una época: título (a su presentación si ya la has visto), «n de m pintores», su sala si está abierta y la fila.
export function shelfHtml({ movement, known, total, painters }, { introSeen, salaOpen }) {
  const title = introSeen
    ? `<a class="cx-era-link" href="#movimiento-${esc(movement.id)}">${esc(movement.name)}${icons.next(16)}</a>`
    : esc(movement.name);
  const sala = salaOpen ? `<a class="cx-sala" href="#galeria-${esc(movement.id)}">${icons.arch(16)}<span>Sala</span></a>` : '';
  return `<section class="cx-sec cx-era${known ? '' : ' is-ahead'}" style="${accentStyle(movement.accent)}" aria-label="${esc(movement.name)}">
    <div class="cx-head"><h2 class="cx-h">${title}</h2>${sala}<span class="cx-count">${known} de ${total}</span></div>
    <ul class="cx-rail">${painters.map((p) => (p.state === 'locked' ? lockedCard(p) : knownCard(p))).join('')}</ul>
  </section>`;
}

export function subtitle(painters, works) {
  if (!painters && !works) return '';
  return `${plural(painters, 'pintor', 'pintores')} · ${plural(works, 'cuadro', 'cuadros')}`;
}
