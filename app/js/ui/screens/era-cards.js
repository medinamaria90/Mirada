// Tarjetas de una época (data/epocas/<movimiento>.json): en la presentación de la época se desliza a la derecha
// para ver la época en ocho tarjetas (cuándo y dónde, por qué surge… y una curiosidad). Cada tarjeta, un cuadro de la
// época (se abre en grande). Su fuente queda en los datos y se ve en «Fuentes y créditos». Sin tarjetas, la presentación
// queda como estaba. Arriba, «Compartir» manda el enlace a la época en tarjetas (h/epoca-<id>.html, ui/story-share.js).

import { esc, $, $$ } from '../dom.js';
import { icons } from '../icons.js';
import { artFrame } from '../art.js';
import { loadCss } from '../lazy-css.js';
import { eraUrl, shareLink, NOTES } from '../story-share.js';

const cache = new Map();

// Tarjetas de una época ([] si no tiene); también las usa «Fuentes y créditos» para listar sus fuentes.
export function loadCards(movementId) {
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

export function cardHtml(index, card, n, total) {
  const w = index.artwork(card.artwork);
  const who = w ? index.artist(w.artistId) : null;
  return `<section class="era-slide era-card" role="group" aria-roledescription="tarjeta" aria-label="${n} de ${total}: ${esc(card.kicker)}">
    ${w ? `<div class="era-card-art">${artFrame(w, { alt: '', cls: 'era-art', label: w.title, zoom: { group: 'era-cards', label: `Ver en grande: ${w.title}` } })}</div>
      <p class="era-card-work">${esc(w.title)}${who ? ` · ${esc(who.short || who.name)}` : ''}</p>` : ''}
    <p class="era-chip">${esc(card.kicker)}</p>
    <p class="era-text">${esc(card.text)}</p>
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
  body.prepend(track);
  wireCards(ctx, body, track, total);
  root.classList.add('has-era-cards');
  root.insertAdjacentHTML('beforeend', `<button type="button" class="icon-btn era-share" aria-label="Compartir">${icons.share(20)}</button>`);
  $('.era-share', root).addEventListener('click', async () => {
    ctx.audio.sfx('tap');
    const note = NOTES[await shareLink({ url: eraUrl(movementId), title: ctx.index.movement(movementId)?.name || '' })];
    if (note) ctx.toast(note);
  });
}

// Puntos y paso de tarjeta: uno por diapositiva (el actual, alargado); «Descubre…» pasa a la segunda. scope: donde van
// los puntos (tras el carrusel) y se escuchan los toques.
export function wireCards(ctx, scope, track, total) {
  const dots = `<div class="era-dots">${Array.from({ length: total }, (_, i) => `<button type="button" class="era-dot" data-era="go" data-i="${i}" aria-label="Tarjeta ${i + 1} de ${total}"><span></span></button>`).join('')}</div>`;
  track.insertAdjacentHTML('afterend', dots);
  const slides = $$('.era-slide', track);
  const go = (i) => slides[Math.max(0, Math.min(total - 1, i))].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  const sync = () => {
    const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    $$('.era-dot', scope).forEach((d, k) => d.setAttribute('aria-current', k === i ? 'true' : 'false'));
  };
  sync();
  track.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
  scope.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-era]');
    if (!b) return;
    ctx.audio.sfx('tap');
    go(b.dataset.era === 'next' ? 1 : Number(b.dataset.i));
  });
}
