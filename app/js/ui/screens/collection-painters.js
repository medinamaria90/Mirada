// Colección → pestaña «Pintores»: lista por épocas con buscador y estado; tocar uno abre su ficha.

import { esc } from '../dom.js';
import { icons } from '../icons.js';
import { page } from '../shell.js';
import { loadCss } from '../lazy-css.js';
import { accentStyle, focusHeading } from '../dom.js';
import { playEra } from '../audio-bridge.js';
import { painterGroups, lifeSpan } from '../../engine/painters.js';
import { SEARCH_MIN_PAINTERS } from '../../engine/collection.js';
import { avatarHtml } from '../avatar.js';
import { observeDeferred } from '../lazy-img.js';

const STATE_TEXT = { mastered: 'dominado', started: 'en marcha' };
const RING = 48;
const RING_STROKE = 4;

// Anillo de progreso proporcional a n/m (color de marca) alrededor del avatar (el mismo de la ficha y la historia). Dominado:
// el anillo se queda y se añade una insignia dorada pequeña con el check.
export function ringHtml(artist, avatar, state, seen, total, cover) {
  const r = (RING - RING_STROKE) / 2;
  const c = 2 * Math.PI * r;
  const k = total ? Math.min(1, seen / total) : 0;
  return `<span class="pl-node" aria-hidden="true"><svg class="pl-ring-svg" width="${RING}" height="${RING}" viewBox="0 0 ${RING} ${RING}">
    <circle class="pl-ring-track" cx="${RING / 2}" cy="${RING / 2}" r="${r}"/>
    <circle class="pl-ring-fill" cx="${RING / 2}" cy="${RING / 2}" r="${r}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - k)).toFixed(2)}" transform="rotate(-90 ${RING / 2} ${RING / 2})"/>
  </svg><span class="pl-av">${avatarHtml(artist, avatar, '', { defer: true, texture: cover })}</span>${state === 'mastered' ? `<span class="pl-badge">${icons.check(11)}</span>` : ''}</span>`;
}

// «Cuadros | Pintores»: dos rutas, así atrás y recargar vuelven a la misma pestaña.
export function collTabs(active) {
  const tab = (id, href, label) => `<a class="coll-tab" href="#${href}"${active === id ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<nav class="coll-tabs" aria-label="Colección">${tab('works', 'coleccion', 'Cuadros')}${tab('painters', 'coleccion-pintores', 'Pintores')}</nav>`;
}

function rowHtml({ artist, state, seen, total, avatar, cover }) {
  const sub = [lifeSpan(artist), artist.country].filter(Boolean).join(' · ');
  const mastered = state === 'mastered';
  return `<li><button type="button" class="pl-row is-${state}" data-artist="${esc(artist.id)}" aria-label="${esc(artist.name)}, ${STATE_TEXT[state]}, ${seen} de ${total} cuadros vistos: ver ficha">
      ${ringHtml(artist, avatar, state, seen, total, cover)}
      <span class="pl-text"><span class="pl-name">${esc(artist.name)}</span><span class="pl-sub">${esc(sub)}</span>${mastered ? `<span class="pl-state">Dominado · ${seen}/${total}</span>` : ''}</span>
      ${mastered ? '' : `<span class="pl-count" aria-hidden="true">${seen}/${total}</span>`}
      <span class="pl-go" aria-hidden="true">${icons.next(18)}</span></button></li>`;
}

// Los invitados, igual que en «Cuadros», juntos bajo su propio rótulo al final del movimiento.
export function groupsHtml(ctx, query) {
  const groups = painterGroups(ctx.store.get().progress, ctx.index, query);
  if (!groups.length) {
    return query.trim()
      ? '<p class="pl-empty">Ningún pintor con ese nombre, de momento.</p>'
      : `<div class="pl-empty"><p>Aquí irán los pintores que vayas conociendo.</p><a class="btn btn-primary" href="#inicio">Ir al camino</a></div>`;
  }
  return groups.map(({ movement, known, total, hidden, artists }) => {
    const regular = artists.filter((r) => r.artist.category !== 'invitado');
    const guests = artists.filter((r) => r.artist.category === 'invitado');
    return `<section class="pl-group" style="${accentStyle(movement.accent)}" aria-label="${esc(movement.name)}">
      <h2 class="pl-era"><span>${esc(movement.name)}</span><span class="pl-era-count">${known} de ${total} pintores</span></h2>
      ${regular.length ? `<ul class="pl-list">${regular.map(rowHtml).join('')}</ul>` : ''}
      ${guests.length ? `<h3 class="pl-sub-guests">Invitados</h3><ul class="pl-list">${guests.map(rowHtml).join('')}</ul>` : ''}
      ${hidden && !query.trim() ? `<p class="pl-more">y ${hidden} por descubrir</p>` : ''}</section>`;
  }).join('');
}

export async function renderPainters(ctx, el) {
  await loadCss('css/coleccion.css');
  const known = painterGroups(ctx.store.get().progress, ctx.index).reduce((n, g) => n + g.known, 0);
  // El buscador sale con tantos pintores conocidos como en «Cuadros»; antes no hay nada que buscar.
  const searchable = known >= SEARCH_MIN_PAINTERS;
  el.innerHTML = page(ctx, 'collection', `
    <header class="section-head"><h1>Colección</h1><p class="section-sub">${known} ${known === 1 ? 'pintor' : 'pintores'}</p></header>
    ${collTabs('painters')}
    ${searchable ? `<label class="pl-search"><span class="sr-only">Buscar pintor</span>
      <input class="pl-input" type="search" placeholder="Buscar pintor" autocomplete="off" enterkeyhint="search"></label>` : ''}
    <div class="pl-results" aria-live="polite">${groupsHtml(ctx, '')}</div>`);
  focusHeading(el);
  playEra('menu');
  observeDeferred(el);
  const results = el.querySelector('.pl-results');
  el.querySelector('.pl-input')?.addEventListener('input', (ev) => { results.innerHTML = groupsHtml(ctx, ev.target.value); observeDeferred(results); });
}
