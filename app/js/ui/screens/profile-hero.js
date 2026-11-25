// Identidad del perfil: portada (cuadro elegido o el favorito, con pie y recorte hacia su punto de
// interés), avatar (logo, inicial o un cuadro), saludo con lápiz y rango con lo que falta.

import { esc, $ } from '../dom.js';
import { icons, logoMark } from '../icons.js';
import { artFrame } from '../art.js';
import { rankFor } from '../../engine/ranks.js';
import { rankProgress, coverWork, sampleCover, avatarWork, focusPosition, initialOf, collectionIds } from '../../engine/profile.js';

const IDLE_TIMEOUT_MS = 800;
const PENCIL = '<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>';

function avatar(name, work) {
  if (work) {
    return `<span class="pf-avatar has-art" aria-hidden="true"><img src="${esc(work.img)}" alt="" width="88" height="88" decoding="async" style="object-position:${focusPosition(work, 25)}"></span>`;
  }
  const initial = initialOf(name);
  return `<span class="pf-avatar ${initial ? 'has-initial' : ''}" aria-hidden="true">${initial ? `<span class="pf-initial">${esc(initial)}</span>` : logoMark(46)}</span>`;
}

// La miniatura del atlas sale de golpe y la imagen entera entra por encima cuando llega (upgradeCover).
function cover(ctx, work) {
  if (!work) return `<div class="pf-cover is-empty" aria-hidden="true">${icons.frames(84)}</div>`;
  const artist = ctx.index.artist(work.artistId);
  return `<div class="pf-cover">
    ${artFrame(work, { alt: '', cls: 'pf-cover-art', label: work.title, thumb: true, eager: true, zoom: { group: 'portada' } })}
    <img class="pf-cover-full" alt="" data-src="${esc(work.img)}" style="object-position:${focusPosition(work, 30)}">
    <p class="pf-cover-cap">${esc(work.title)}${artist ? ` · ${esc(artist.name)}` : ''}</p>
  </div>`;
}

function rankBlock(rank, bar, pct) {
  const needs = bar.next
    ? `<p class="pf-rank-next">Para ser ${esc(bar.next)}</p>
      <ul class="pf-needs">${bar.items.map((i) => `<li><span>${esc(i.text)}</span><span class="pf-mini" aria-hidden="true"><span style="width:${Math.round(i.fraction * 100)}%"></span></span></li>`).join('')}</ul>`
    : '<p class="pf-rank-next">El rango más alto</p>';
  return `<div class="pf-rank">
      <p class="pf-rank-name">${icons.gem(20)}<span>${esc(rank.name)}</span></p>
      <div class="pf-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${bar.next ? `Avance hacia ${esc(bar.next)}` : 'Rango más alto'}"><span style="width:${pct}%"></span></div>
      ${needs}
    </div>`;
}

export function heroHtml(ctx) {
  const { index } = ctx;
  const state = ctx.store.get();
  const p = state.progress;
  const { name = '', cover: coverId = '', avatar: avatarId = '' } = state.settings;
  const rank = rankFor(p, index);
  const bar = rankProgress(rank);
  const pct = Math.round(bar.fraction * 100);
  const greeting = name ? `Hola, ${esc(name)}` : 'Ponte un nombre';
  const hasPictures = collectionIds(p, index).length > 0;
  return `<header class="pf-hero">
    <h1 class="sr-only" id="pf-title" tabindex="-1">Perfil</h1>
    ${hasPictures ? `<button type="button" class="pf-look" data-action="open-look" aria-label="Cambiar portada y avatar" aria-haspopup="dialog">${icons.frames(22)}</button>` : ''}
    ${cover(ctx, coverWork(p, index, coverId) || sampleCover(index))}
    <button type="button" class="pf-gear" data-action="open-settings" aria-label="Ajustes" aria-haspopup="dialog">${icons.gear(24)}</button>
    <div class="pf-id">
      ${avatar(name, avatarWork(p, index, avatarId))}
      <div class="pf-greeting"><button type="button" class="pf-name-btn ${name ? '' : 'is-empty'} ${[...name].length > 14 ? 'is-long' : ''}" data-action="edit-name" aria-haspopup="dialog" aria-label="${name ? `Hola, ${esc(name)}. Cambiar nombre` : 'Ponte un nombre'}"><span class="pf-name-text">${greeting}</span>${PENCIL}</button></div>
    </div>
    ${rankBlock(rank, bar, pct)}
  </header>`;
}

// En conexiones lentas o con ahorro de datos no se pide la imagen entera de la portada.
function saveData() {
  const c = typeof navigator === 'undefined' ? null : navigator.connection;
  return Boolean(c && (c.saveData || ['slow-2g', '2g'].includes(c.effectiveType)));
}

// Tras pintar: la imagen entera de la portada se pide cuando el navegador está libre.
export function upgradeCover(el) {
  const img = $('.pf-cover-full[data-src]', el);
  if (!img || saveData()) return;
  const load = () => {
    img.addEventListener('load', () => img.classList.add('is-on'), { once: true });
    img.src = img.dataset.src;
  };
  if (typeof requestIdleCallback === 'function') requestIdleCallback(load, { timeout: IDLE_TIMEOUT_MS });
  else setTimeout(load, 0);
}

// Cambió el nombre, la portada o el avatar: se repintan solo esas piezas (los botones que abren hojas se
// quedan donde están, así el foco no se pierde).
export function refreshHero(ctx, el) {
  const next = document.createElement('template');
  next.innerHTML = heroHtml(ctx);
  const fresh = next.content;
  $('.pf-cover', el).replaceWith($('.pf-cover', fresh));
  $('.pf-avatar', el).replaceWith($('.pf-avatar', fresh));
  const btn = $('.pf-name-btn', el);
  const nb = $('.pf-name-btn', fresh);
  btn.className = nb.className;
  btn.setAttribute('aria-label', nb.getAttribute('aria-label'));
  btn.innerHTML = nb.innerHTML;
  upgradeCover(el);
}
