// Carteles del mapa en tarjetas: al tocar el cartel de un tramo (o el de una rama, en su pantalla) se abre a pantalla
// completa como las tarjetas de época (screens/era-cards.js), con la navegación común de los visores de tarjetas
// (deck-nav.js): una portada con tres cuadros del grupo (sign-wall.js), el nombre y la idea en una frase, y después sus
// tarjetas, cada una con su cuadro. Textos en data/carteles/ (de contenido/ramas.json y tramos.json, con
// tools/sync_carteles.py); su fuente queda en los datos y se ve en «Fuentes y créditos». Se carga al primer toque.

import { esc } from './dom.js';
import { loadCss } from './lazy-css.js';
import { modalSlot, mountSheet } from './modal-slot.js';
import { cardHtml, eraMore } from './screens/era-cards.js';
import { artFrame } from './art.js';
import { signWall } from './sign-wall.js';
import { headHtml, kindLabelHtml, deckFootHtml, wireDeck, DECK_LABEL } from './deck-nav.js';

const FILES = { rama: 'ramas', tramo: 'tramos' };
const KICKER = { rama: 'Rama', tramo: 'Tramo' };
// Última tarjeta fuera del camino: el cartel de un tramo deja en el camino; el de una rama, en su pantalla.
const END_LABEL = { rama: DECK_LABEL.back, tramo: DECK_LABEL.toPath };
const MORE_TRAMO = 'Más sobre este tramo ›';
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

// Pared de la portada: tres cuadros del grupo (sign-wall.js), de alto fijo para que nada salte al cargar.
function wallHtml(index, kind, id, sign) {
  const works = id ? signWall(index, kind, id, sign) : [];
  if (!works.length) return '';
  const items = works.map((w, i) => `<span class="wall-item wall-${i}">${artFrame(w, { alt: '', eager: true, label: '', thumb: true, zoom: { group: 'sign-wall' } })}</span>`);
  return `<div class="wall wall-sm sc-wall">${items.join('')}</div>`;
}

// Portada y tarjetas de un cartel (id: la rama o la clave del tramo). Sin textos (o sin red), solo la portada con el
// nombre que se tocó y, si se sabe el grupo, su pared de cuadros. El tipo («Tramo», «Rama») va en la cabecera.
export function signSlides(index, kind, sign, fallbackTitle, id = '') {
  const cards = (sign?.cards || []).filter((c) => c && c.text);
  const total = cards.length + 1;
  const cover = `<section class="era-slide era-cover sc-cover" role="group" aria-label="1 de ${total}">
      ${wallHtml(index, kind, id, sign)}
      <h2 class="sc-title" id="sc-title" tabindex="-1">${esc(sign?.title || fallbackTitle)}</h2>
      ${sign?.lead ? `<p class="sc-lead">${esc(sign.lead)}</p>` : ''}
    </section>`;
  return { total, html: cover + cards.map((c, i) => cardHtml(index, c, i + 2, total)).join('') };
}

// kind: «rama» o «tramo»; id: la rama o la clave del tramo; opener: el cartel tocado (recupera el foco al cerrar).
// onDone: abierto como paso del camino (flows.js withTramo): abajo, «Saltar» y, en la última tarjeta, «Seguir», que continúan al
// pintor; la X (o Esc) no continúa: avisa a onExit, si lo hay. Salir de la pantalla no avisa a ninguno.
export async function openSignCards(ctx, kind, id, opener, { title: fallback = '', onDone = null, onExit = null } = {}) {
  const turn = slot.begin();
  const [signs] = await Promise.all([loadSigns(kind), loadCss('css/epocas.css'), loadCss('css/deck.css'), loadCss('css/carteles.css')]);
  if (slot.stale(turn)) return null;
  const title = opener?.querySelector('.sign-name')?.textContent || fallback;
  const { total, html } = signSlides(ctx.index, kind, signs[id], title, id);
  const dlg = document.createElement('dialog');
  dlg.className = 'sign-cards';
  dlg.setAttribute('aria-labelledby', 'sc-title');
  dlg.innerHTML = `<div class="sc-body deck-light">
      ${headHtml({ total, labelHtml: kindLabelHtml(KICKER[kind]) })}
      <div class="era-track" tabindex="0" aria-roledescription="carrusel" aria-label="El cartel en tarjetas">${html}</div>
      ${deckFootHtml()}
    </div>`;
  document.body.appendChild(dlg);
  const handle = { dlg };
  // Cartel de tramo visto (también si se salta): el camino ya no lo enseña antes del pintor (progress.signs).
  if (kind === 'tramo') {
    if (!ctx.store.get().progress.signs?.[id]) {
      const today = ctx.today();
      ctx.store.update((s) => ({ ...s, progress: { ...s.progress, signs: { ...(s.progress.signs || {}), [id]: today } } }));
    }
  }
  // Cómo se cierra: «Saltar» o el final siguen el camino; la X, Esc o tocar fuera, no.
  let done = false;
  const onClose = ({ silent }) => {
    if (silent) return;
    if (done) onDone?.();
    else onExit?.();
  };
  const close = mountSheet(dlg, { slot, handle, opener, closeSelector: '[data-deck="close"]', onClose });
  const finish = () => { done = Boolean(onDone); close(); };
  wireDeck(ctx, {
    scope: dlg.querySelector('.sc-body'),
    track: dlg.querySelector('.era-track'),
    endLabel: onDone ? DECK_LABEL.next : END_LABEL[kind],
    onEnd: finish,
    onSkip: onDone ? finish : null,
    // «Más sobre este tramo ›»: la ficha de su época, para ampliar (si la hay).
    more: kind === 'tramo' ? eraMore(ctx, ctx.index.artists.find((a) => a.section === id)?.movementId, MORE_TRAMO) : null,
  });
  // La X la cierra mountSheet (closeSelector). El foco, en el título (como en la presentación de la época).
  dlg.querySelector('#sc-title').focus({ preventScroll: true });
  return handle;
}
