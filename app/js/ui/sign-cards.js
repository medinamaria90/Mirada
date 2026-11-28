// Carteles del mapa en tarjetas: al tocar el cartel de un tramo (o el de una rama, en su pantalla) se abre a pantalla
// completa como las tarjetas de época (screens/era-cards.js): una portada con tres cuadros del grupo (sign-wall.js), el
// nombre y la idea en una frase, y después sus tarjetas, cada una con su cuadro. Textos en data/carteles/ (de contenido/ramas.json y tramos.json, con
// tools/sync_carteles.py); su fuente queda en los datos y se ve en «Fuentes y créditos». Se carga al primer toque.

import { esc } from './dom.js';
import { icons } from './icons.js';
import { loadCss } from './lazy-css.js';
import { modalSlot, mountSheet } from './modal-slot.js';
import { cardHtml, wireCards } from './screens/era-cards.js';
import { artFrame } from './art.js';
import { signWall } from './sign-wall.js';

const FILES = { rama: 'ramas', tramo: 'tramos' };
const KICKER = { rama: 'Rama', tramo: 'Tramo' };
const SKIP_LABEL = { skip: 'Saltar', end: 'Seguir' };
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
// nombre que se tocó y, si se sabe el grupo, su pared de cuadros.
export function signSlides(index, kind, sign, fallbackTitle, id = '') {
  const cards = (sign?.cards || []).filter((c) => c && c.text);
  const total = cards.length + 1;
  const cover = `<section class="era-slide era-cover sc-cover" role="group" aria-label="1 de ${total}">
      ${wallHtml(index, kind, id, sign)}
      <p class="era-chip">${esc(sign?.kicker || KICKER[kind])}</p>
      <h2 class="sc-title" id="sc-title">${esc(sign?.title || fallbackTitle)}</h2>
      ${sign?.lead ? `<p class="sc-lead">${esc(sign.lead)}</p>` : ''}
      ${cards.length ? `<button type="button" class="era-more" data-era="next">Descubre más${icons.next(16)}</button>` : ''}
    </section>`;
  return { total, html: cover + cards.map((c, i) => cardHtml(index, c, i + 2, total)).join('') };
}

// kind: «rama» o «tramo»; id: la rama o la clave del tramo; opener: el cartel tocado (recupera el foco al cerrar).
// onDone: abierto como paso del camino (flows.js withTramo): en vez de la cruz, «Saltar» (y «Seguir» en la última
// tarjeta), y al cerrarlo se continúa al pintor; salir de la pantalla no continúa.
// onQuestions(cards): en un tramo con preguntas de concepto, «Ir a las preguntas» al llegar a la última tarjeta; cierra
// las tarjetas sin continuar (onDone no se llama) y quien abrió decide dónde salen las preguntas.
export async function openSignCards(ctx, kind, id, opener, { title: fallback = '', onDone = null, onQuestions = null } = {}) {
  const turn = slot.begin();
  const [signs] = await Promise.all([loadSigns(kind), loadCss('css/epocas.css'), loadCss('css/carteles.css')]);
  if (slot.stale(turn)) return null;
  const title = opener?.querySelector('.sign-name')?.textContent || fallback;
  const { total, html } = signSlides(ctx.index, kind, signs[id], title, id);
  const dlg = document.createElement('dialog');
  dlg.className = onDone ? 'sign-cards is-step' : 'sign-cards';
  dlg.setAttribute('aria-labelledby', 'sc-title');
  dlg.innerHTML = `<div class="sc-body">
      ${onDone
    ? `<button type="button" class="sc-skip" data-sc="close">${SKIP_LABEL.skip}</button>`
    : `<button type="button" class="icon-btn sc-close" data-sc="close" aria-label="Cerrar">${icons.close(22)}</button>`}
      <div class="era-track" tabindex="0" aria-roledescription="carrusel" aria-label="El cartel en tarjetas">${html}</div>
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
  let toQuestions = false;
  const onClose = onDone ? ({ silent }) => { if (!silent && !toQuestions) onDone(); } : null;
  const close = mountSheet(dlg, { slot, handle, opener, closeSelector: '[data-sc="close"]', onClose });
  const body = dlg.querySelector('.sc-body');
  const track = dlg.querySelector('.era-track');
  if (total > 1) wireCards(ctx, body, track, total);
  if (onDone) relabelAtEnd(track, dlg.querySelector('.sc-skip'));
  if (kind === 'tramo' && onQuestions) offerQuestions(ctx, id, body, total > 1 ? track : null, signs[id]?.cards || [], () => {
    toQuestions = true;
    close({ silent: true });
    onQuestions(signs[id]?.cards || []);
  });
  dlg.querySelector('[data-sc="close"]').focus({ preventScroll: true });
  return handle;
}

// «Ir a las preguntas» bajo las tarjetas del tramo, al llegar a la última (ui/concept-quiz.js), si el tramo tiene preguntas.
function offerQuestions(ctx, key, body, track, cards, go) {
  import('./concept-quiz.js').then(async (cq) => {
    if (!(await cq.hasConcepts('tramo', key)) || !body.isConnected) return;
    cq.offerAtEnd(track, (b) => { b.classList.add('sc-cq'); body.append(b); }, () => { ctx.audio.sfx('tap'); go(); });
  }).catch((err) => console.error(err));
}

// Como paso del camino, el botón de arriba dice «Saltar» mientras quedan tarjetas y «Seguir» en la última.
function relabelAtEnd(track, button) {
  const sync = () => {
    const last = track.scrollLeft + track.clientWidth >= track.scrollWidth - track.clientWidth / 2;
    button.textContent = last ? SKIP_LABEL.end : SKIP_LABEL.skip;
  };
  sync();
  track.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
}
