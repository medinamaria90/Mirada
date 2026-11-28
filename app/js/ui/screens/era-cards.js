// Tarjetas de una época (data/epocas/<movimiento>.json): la presentación de la época se recorre en ocho tarjetas (o nueve,
// con una extra) (cuándo y dónde, por qué surge… y una curiosidad), con la navegación común de los visores de tarjetas
// (deck-nav.js). Cada tarjeta, un cuadro de la época (se abre en grande). Su fuente queda en los datos y se ve en «Fuentes y
// créditos». Sin tarjetas, la portada sola. Arriba, «Compartir» manda el enlace a la época en tarjetas (h/epoca-<id>.html,
// ui/story-share.js).

import { esc, $ } from '../dom.js';
import { artFrame } from '../art.js';
import { loadCss } from '../lazy-css.js';
import { eraUrl, shareLink, NOTES } from '../story-share.js';
import { cardFrame } from '../../engine/framing.js';
import { regionOf } from '../../engine/stories.js';
import { headHtml, kindLabelHtml, deckFootHtml, wireDeck } from '../deck-nav.js';

const ERA_LABEL = 'Época';

const cache = new Map();

// Tarjetas válidas de unos datos, o null si no lo son (el archivo no es de esta época o no trae tarjetas).
export function cardsOf(data, movementId) {
  if (!data || data.movementId !== movementId || !Array.isArray(data.cards)) return null;
  const cards = data.cards.filter((c) => c && typeof c.kicker === 'string' && typeof c.text === 'string');
  return cards.length ? cards : null;
}

// Tarjetas de una época ([] si no tiene); también las usa «Fuentes y créditos» para listar sus fuentes. Solo se
// recuerda lo que llega bien: un fallo (sin red, un 404 o una respuesta a medias durante un despliegue) no deja la
// época sin tarjetas el resto de la sesión, que en la app instalada puede durar días; se reintenta la próxima vez.
export function loadCards(movementId) {
  if (!cache.has(movementId)) {
    const pending = fetch(new URL(`../../../data/epocas/${movementId}.json`, import.meta.url), { cache: 'no-cache' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const cards = cardsOf(data, movementId);
        if (!cards) throw new Error('sin tarjetas');
        return cards;
      })
      .catch((err) => {
        console.warn(`Tarjetas de ${movementId} no disponibles:`, err.message);
        cache.delete(movementId);
        return [];
      });
    cache.set(movementId, pending);
  }
  return cache.get(movementId);
}

// Caja del cuadro de una tarjeta: la proporción de la obra entera (o de su `region`, si la tarjeta enseña un detalle a
// propósito), para que nada se recorte y el hueco quede reservado antes de que llegue la imagen.
function artBoxAttrs(w, card) {
  const { ratio, box } = cardFrame(w, regionOf(card.region));
  const place = box ? `;--rl:${box.left}%;--rt:${box.top}%;--rw:${box.width}%;--rh:${box.height}%` : '';
  return `class="era-card-art${box ? ' is-region' : ''}" style="--card-ar:${ratio.toFixed(4)}${place}"`;
}

export function cardHtml(index, card, n, total) {
  const w = index.artwork(card.artwork);
  const who = w ? index.artist(w.artistId) : null;
  return `<section class="era-slide era-card" role="group" aria-roledescription="tarjeta" aria-label="${n} de ${total}: ${esc(card.kicker)}">
    ${w ? `<div ${artBoxAttrs(w, card)}>${artFrame(w, { alt: '', cls: 'era-art', label: w.title, zoom: { group: 'era-cards', label: `Ver en grande: ${w.title}` } })}</div>
      <p class="era-card-work">${esc(w.title)}${who ? ` · ${esc(who.short || who.name)}` : ''}</p>` : ''}
    <p class="era-chip">${esc(card.kicker)}</p>
    <p class="era-text">${esc(card.text)}</p>
  </section>`;
}

// Tarjetas listas para montar: los datos y su hoja de estilo. La presentación espera a ambos antes de pintarse, para
// salir ya en su forma final (montar el carrusel sobre una portada ya pintada la hacía saltar).
export async function prepareEraCards(movementId) {
  const [cards] = await Promise.all([loadCards(movementId), loadCss('css/epocas.css'), loadCss('css/deck.css')]);
  return cards;
}

// Ficha de una época (para ampliar desde la última tarjeta de la época y de sus tramos): aún no existe; cuando la haya, esta
// función devuelve su ruta y aparece el secundario «Más sobre…». Hasta entonces, sin botón (nada que no lleve a ningún sitio).
export const eraFichaRoute = () => null;

// «Más sobre…» de la última tarjeta, si la época tiene ficha. label: el texto («Más sobre el Renacimiento ›» por defecto).
export function eraMore(ctx, movementId, label = '') {
  const route = movementId ? eraFichaRoute(movementId) : null;
  const movement = ctx.index.movement(movementId);
  if (!route || !movement) return null;
  return { label: label || `Más sobre ${movement.name} ›`, go: () => ctx.go(route) };
}

// root: el .welcome de la presentación. La portada (cuadros, título, frase) pasa a ser la primera tarjeta, dentro de la
// navegación común de los visores de tarjetas (deck-nav.js): barras, «Época», compartir y la X arriba; «Seguir» abajo y, en la
// última tarjeta, el botón de la presentación (Seguir, Volver al camino, Empezar…), que hace lo que hacía. skip: como paso
// del camino, «Saltar» va directo a lo siguiente. Se llama antes de que la pantalla se pinte (sin salto); si llega tarde (red
// muy lenta), late la monta con un fundido suave.
export function mountEraCards(ctx, root, movementId, cards, { late = false, skip = false } = {}) {
  const body = $('.welcome-body', root);
  if (!body || !root.isConnected || $('.era-track', root)) return;
  const enter = $('[data-action="enter"]', body);
  const cover = [...body.children].filter((c) => c !== enter);
  // Mover la portada al carrusel le quita el foco (el título lo tiene al abrir): se le devuelve.
  const focused = root.contains(document.activeElement) ? document.activeElement : null;
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
  track.append(first);
  track.insertAdjacentHTML('beforeend', cards.map((c, i) => cardHtml(ctx.index, c, i + 2, total)).join(''));
  body.prepend(track);
  // El botón de la presentación queda en la página (lo escucha la pantalla) y lo pulsa el principal de la última tarjeta.
  enter.hidden = true;
  enter.removeAttribute('data-primary');
  body.insertAdjacentHTML('beforebegin', headHtml({ total, labelHtml: kindLabelHtml(ERA_LABEL), share: true }));
  body.insertAdjacentHTML('afterend', deckFootHtml());
  $('.deck-primary', root).setAttribute('data-primary', '');
  root.classList.add('has-era-cards', 'deck-light');
  if (late) root.classList.add('era-late');
  if (focused && !focused.contains(document.activeElement)) focused.focus({ preventScroll: true });
  wireDeck(ctx, {
    scope: root,
    track,
    endLabel: enter.textContent,
    onEnd: () => enter.click(),
    onSkip: skip ? () => enter.click() : null,
    more: eraMore(ctx, movementId),
    onClose: () => ctx.go('inicio'),
    onShare: async () => {
      ctx.audio.sfx('tap');
      const note = NOTES[await shareLink({ url: eraUrl(movementId), title: ctx.index.movement(movementId)?.name || '' })];
      if (note) ctx.toast(note);
    },
  });
}
