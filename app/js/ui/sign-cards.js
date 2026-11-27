// Carteles del mapa en tarjetas: al tocar el cartel de un tramo (o el de una rama, en su pantalla) se abre a pantalla
// completa como las tarjetas de época (screens/era-cards.js): una portada con el nombre y la idea en una frase, y
// después sus tarjetas, cada una con su cuadro. Textos en data/carteles/ (de contenido/ramas.json y tramos.json, con
// tools/sync_carteles.py); su fuente queda en los datos y se ve en «Fuentes y créditos». Se carga al primer toque.

import { esc } from './dom.js';
import { icons } from './icons.js';
import { loadCss } from './lazy-css.js';
import { modalSlot, mountSheet } from './modal-slot.js';
import { cardHtml, wireCards } from './screens/era-cards.js';

const FILES = { rama: 'ramas', tramo: 'tramos' };
const KICKER = { rama: 'Rama', tramo: 'Tramo' };
const cache = new Map();
const slot = modalSlot();

// Carteles de un tipo ({ clave: cartel }; {} si no se pueden cargar, y se reintenta la próxima vez).
export function loadSigns(kind) {
  const file = FILES[kind];
  if (!cache.has(file)) {
    cache.set(file, fetch(new URL(`../../data/carteles/${file}.json`, import.meta.url))
      .then((res) => (res.ok ? res.json() : {}))
      .catch((err) => {
        console.info('Carteles no disponibles:', err.message);
        cache.delete(file);
        return {};
      }));
  }
  return cache.get(file);
}

// Portada y tarjetas de un cartel. Sin textos (o sin red), solo la portada con el nombre que se tocó.
export function signSlides(index, kind, sign, fallbackTitle) {
  const cards = (sign?.cards || []).filter((c) => c && c.text);
  const total = cards.length + 1;
  const cover = `<section class="era-slide era-cover sc-cover" role="group" aria-label="1 de ${total}">
      <p class="era-chip">${esc(sign?.kicker || KICKER[kind])}</p>
      <h2 class="sc-title" id="sc-title">${esc(sign?.title || fallbackTitle)}</h2>
      ${sign?.lead ? `<p class="sc-lead">${esc(sign.lead)}</p>` : ''}
      ${cards.length ? `<button type="button" class="era-more" data-era="next">Descubre más${icons.next(16)}</button>` : ''}
    </section>`;
  return { total, html: cover + cards.map((c, i) => cardHtml(index, c, i + 2, total)).join('') };
}

// kind: «rama» o «tramo»; id: la rama o la clave del tramo; opener: el cartel tocado (recupera el foco al cerrar).
export async function openSignCards(ctx, kind, id, opener) {
  const turn = slot.begin();
  const [signs] = await Promise.all([loadSigns(kind), loadCss('css/epocas.css'), loadCss('css/carteles.css')]);
  if (slot.stale(turn)) return null;
  const title = opener?.querySelector('.sign-name')?.textContent || '';
  const { total, html } = signSlides(ctx.index, kind, signs[id], title);
  const dlg = document.createElement('dialog');
  dlg.className = 'sign-cards';
  dlg.setAttribute('aria-labelledby', 'sc-title');
  dlg.innerHTML = `<div class="sc-body">
      <button type="button" class="icon-btn sc-close" data-sc="close" aria-label="Cerrar">${icons.close(22)}</button>
      <div class="era-track" tabindex="0" aria-roledescription="carrusel" aria-label="El cartel en tarjetas">${html}</div>
    </div>`;
  document.body.appendChild(dlg);
  const handle = { dlg };
  mountSheet(dlg, { slot, handle, opener, closeSelector: '[data-sc="close"]' });
  const body = dlg.querySelector('.sc-body');
  if (total > 1) wireCards(ctx, body, dlg.querySelector('.era-track'), total);
  dlg.querySelector('.sc-close').focus({ preventScroll: true });
  return handle;
}
