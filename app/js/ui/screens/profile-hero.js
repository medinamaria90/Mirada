// Identidad del perfil, en una cabecera compacta: avatar (logo, inicial o un cuadro), saludo con lápiz y, a la
// derecha, el engranaje de Ajustes. Con cuadros en la colección, el avatar es un botón que abre la hoja para
// elegirlo (lleva una chapita de cuadro). El rango va en su tarjeta (profile-rank.js).

import { esc, $ } from '../dom.js';
import { icons, logoMark } from '../icons.js';
import { tinySrc } from './profile-art.js';
import { graphemes } from '../../state/schema.js';
import { avatarWork, focusPosition, initialOf, collectionIds } from '../../engine/profile.js';

const LONG_NAME = 14;
const PENCIL = '<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>';
// Chapita del avatar elegible: un cuadrito con un paisaje (cambiar la imagen).
const PICTURE = '<svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="m3.5 16 5-5 4.5 4.5 2.5-2.5 5 5"/><circle cx="15.5" cy="9" r="1.4"/></svg>';

function avatarFace(name, work) {
  if (work) {
    return `<span class="pf-avatar has-art" aria-hidden="true"><img src="${esc(tinySrc(work))}" alt="" width="88" height="88" decoding="async" style="object-position:${focusPosition(work, 25)}"></span>`;
  }
  const initial = initialOf(name);
  return `<span class="pf-avatar ${initial ? 'has-initial' : ''}" aria-hidden="true">${initial ? `<span class="pf-initial">${esc(initial)}</span>` : logoMark(46)}</span>`;
}

// Sin cuadros no hay nada que elegir: el avatar es solo imagen. Con cuadros, botón con su chapita.
function avatarSlot(name, work, canPick) {
  const face = avatarFace(name, work);
  if (!canPick) return `<span class="pf-avatar-slot">${face}</span>`;
  return `<button type="button" class="pf-avatar-slot pf-avatar-btn" data-action="open-look" aria-label="Cambiar avatar" aria-haspopup="dialog">${face}<span class="pf-avatar-badge" aria-hidden="true">${PICTURE}</span></button>`;
}

export function heroHtml(ctx) {
  const { index } = ctx;
  const state = ctx.store.get();
  const p = state.progress;
  const { name = '', avatar: avatarId = '' } = state.settings;
  const greeting = name ? `Hola, ${esc(name)}` : 'Ponte un nombre';
  const canPick = collectionIds(p, index).length > 0;
  return `<header class="pf-hero">
    <h1 class="sr-only" id="pf-title" tabindex="-1">Perfil</h1>
    <div class="pf-id">
      ${avatarSlot(name, avatarWork(p, index, avatarId), canPick)}
      <div class="pf-greeting"><button type="button" class="pf-name-btn ${name ? '' : 'is-empty'} ${graphemes(name).length > LONG_NAME ? 'is-long' : ''}" data-action="edit-name" aria-haspopup="dialog" aria-label="${name ? `Hola, ${esc(name)}. Cambiar nombre` : 'Ponte un nombre'}"><span class="pf-name-text">${greeting}</span>${PENCIL}</button></div>
      <button type="button" class="pf-gear" data-action="open-settings" aria-label="Ajustes" aria-haspopup="dialog">${icons.gear(24)}</button>
    </div>
  </header>`;
}

// Cambió el nombre o el avatar: se repintan solo esas piezas (los botones que abren hojas se quedan donde
// están, así el foco no se pierde).
export function refreshHero(ctx, el) {
  const next = document.createElement('template');
  next.innerHTML = heroHtml(ctx);
  const fresh = next.content;
  $('.pf-avatar', el).replaceWith($('.pf-avatar', fresh));
  const btn = $('.pf-name-btn', el);
  const nb = $('.pf-name-btn', fresh);
  btn.className = nb.className;
  btn.setAttribute('aria-label', nb.getAttribute('aria-label'));
  btn.innerHTML = nb.innerHTML;
}
