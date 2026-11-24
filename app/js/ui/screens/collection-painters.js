// Colección → pestaña «Pintores»: lista por épocas con buscador y estado; tocar uno abre su ficha.

import { esc } from '../dom.js';
import { icons } from '../icons.js';
import { page } from '../shell.js';
import { loadCss } from '../lazy-css.js';
import { accentStyle, focusHeading } from '../dom.js';
import { playEra } from '../audio-bridge.js';
import { painterGroups, lifeSpan } from '../../engine/painters.js';
import { initials } from '../artist-sheet.js';

const STATE_TEXT = { mastered: 'dominado', started: 'en marcha', new: 'sin ver' };

// «Cuadros | Pintores»: dos rutas, así atrás y recargar vuelven a la misma pestaña.
export function collTabs(active) {
  const tab = (id, href, label) => `<a class="coll-tab" href="#${href}"${active === id ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<nav class="coll-tabs" aria-label="Colección">${tab('works', 'coleccion', 'Cuadros')}${tab('painters', 'coleccion-pintores', 'Pintores')}</nav>`;
}

function rowHtml({ artist, state, seen, total }) {
  const sub = [lifeSpan(artist), artist.country].filter(Boolean).join(' · ');
  return `<li><button type="button" class="pl-row is-${state}" data-artist="${esc(artist.id)}" aria-label="${esc(artist.name)}, ${STATE_TEXT[state]}${seen ? `, ${seen} de ${total} cuadros vistos` : ''}: ver ficha">
      <span class="pl-node" aria-hidden="true">${state === 'mastered' ? icons.check(20) : esc(initials(artist.name))}</span>
      <span class="pl-text"><span class="pl-name">${esc(artist.name)}</span><span class="pl-sub">${esc(sub)}</span></span>
      <span class="pl-count" aria-hidden="true">${seen ? `${seen}/${total}` : ''}</span>
      <span class="pl-go" aria-hidden="true">${icons.next(18)}</span></button></li>`;
}

export function groupsHtml(ctx, query) {
  const groups = painterGroups(ctx.store.get().progress, ctx.index, query);
  if (!groups.length) return '<p class="pl-empty">Ningún pintor con ese nombre.</p>';
  return groups.map(({ movement, artists }) => `<section class="pl-group" style="${accentStyle(movement.accent)}" aria-label="${esc(movement.name)}">
      <h2 class="pl-era">${esc(movement.name)}</h2><ul class="pl-list">${artists.map(rowHtml).join('')}</ul></section>`).join('');
}

export async function renderPainters(ctx, el) {
  await loadCss('css/ficha.css');
  const total = painterGroups(ctx.store.get().progress, ctx.index).reduce((n, g) => n + g.artists.length, 0);
  el.innerHTML = page(ctx, 'collection', `
    <header class="section-head"><h1>Colección</h1><p class="section-sub">${total} pintores</p></header>
    ${collTabs('painters')}
    <label class="pl-search"><span class="sr-only">Buscar pintor</span>
      <input class="pl-input" type="search" placeholder="Buscar pintor" autocomplete="off" enterkeyhint="search"></label>
    <div class="pl-results" aria-live="polite">${groupsHtml(ctx, '')}</div>`);
  focusHeading(el);
  playEra('menu');
  const results = el.querySelector('.pl-results');
  el.querySelector('.pl-input').addEventListener('input', (ev) => { results.innerHTML = groupsHtml(ctx, ev.target.value); });
}
