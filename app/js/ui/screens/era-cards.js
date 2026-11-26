// Tarjetas de una época (data/epocas/<movimiento>.json): en la presentación de la época se desliza a la derecha
// para ver la época en ocho tarjetas (cuándo y dónde, por qué surge… y una curiosidad). Cada tarjeta, un cuadro de la
// época (se abre en grande) y su fuente. Sin tarjetas, la presentación queda como estaba.

import { esc, $, $$ } from '../dom.js';
import { icons } from '../icons.js';
import { artFrame } from '../art.js';
import { loadCss } from '../lazy-css.js';
import { sourceLabel } from '../../engine/stories.js';

const cache = new Map();

function loadCards(movementId) {
  if (!cache.has(movementId)) {
    const pending = fetch(new URL(`../../../data/epocas/${movementId}.json`, import.meta.url))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => (data && Array.isArray(data.cards) ? data.cards : []))
      .catch((err) => {
        console.info('Tarjetas de época no disponibles:', err.message);
        cache.set(movementId, null); // se reintenta la próxima vez
        return [];
      });
    cache.set(movementId, pending);
  }
  return cache.get(movementId) || loadCards(movementId);
}

function cardHtml(index, card, n, total) {
  const w = index.artwork(card.artwork);
  const who = w ? index.artist(w.artistId) : null;
  const label = sourceLabel(card.source);
  return `<section class="era-slide era-card" role="group" aria-roledescription="tarjeta" aria-label="${n} de ${total}: ${esc(card.kicker)}">
    ${w ? `<div class="era-card-art">${artFrame(w, { alt: '', cls: 'era-art', label: w.title, zoom: { group: 'era-cards', label: `Ver en grande: ${w.title}` } })}</div>
      <p class="era-card-work">${esc(w.title)}${who ? ` · ${esc(who.short || who.name)}` : ''}</p>` : ''}
    <p class="era-chip">${esc(card.kicker)}</p>
    <p class="era-text">${esc(card.text)}</p>
    ${label ? `<a class="era-source" href="${esc(card.source)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>` : ''}
  </section>`;
}

// root: el .welcome de la presentación. La portada (cuadros, título, frase) pasa a ser la primera diapositiva.
export async function mountEraCards(ctx, root, movementId) {
  const [cards] = await Promise.all([loadCards(movementId), loadCss('css/epocas.css')]);
  const body = $('.welcome-body', root);
  if (!cards.length || !body || !root.isConnected) return;
  const enter = $('[data-action="enter"]', body);
  const cover = [...body.children].filter((c) => c !== enter);
  const total = cards.length + 1;
  const track = document.createElement('div');
  track.className = 'era-track';
  track.setAttribute('tabindex', '0');
  track.setAttribute('aria-roledescription', 'carrusel');
  track.setAttribute('aria-label', 'La época en tarjetas');
  const first = document.createElement('section');
  first.className = 'era-slide era-cover';
  first.setAttribute('role', 'group');
  first.setAttribute('aria-label', `1 de ${total}`);
  first.append(...cover);
  first.insertAdjacentHTML('beforeend', `<button type="button" class="era-more" data-era="next">Descubre la época${icons.next(16)}</button>`);
  track.append(first);
  track.insertAdjacentHTML('beforeend', cards.map((c, i) => cardHtml(ctx.index, c, i + 2, total)).join(''));
  const dots = `<div class="era-dots">${Array.from({ length: total }, (_, i) => `<button type="button" class="era-dot" data-era="go" data-i="${i}" aria-label="Tarjeta ${i + 1} de ${total}"><span></span></button>`).join('')}</div>`;
  body.prepend(track);
  track.insertAdjacentHTML('afterend', dots);
  root.classList.add('has-era-cards');

  const slides = $$('.era-slide', track);
  const go = (i) => slides[Math.max(0, Math.min(total - 1, i))].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  const sync = () => {
    const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    $$('.era-dot', body).forEach((d, k) => d.setAttribute('aria-current', k === i ? 'true' : 'false'));
  };
  sync();
  track.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
  body.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-era]');
    if (!b) return;
    ctx.audio.sfx('tap');
    go(b.dataset.era === 'next' ? 1 : Number(b.dataset.i));
  });
}
