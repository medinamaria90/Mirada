// Tarjeta del nodo de un pintor con niveles (como la de las lecciones de Duolingo): al tocar su retrato en el mapa o en una
// rama sale anclada con su pico al retrato, que sigue encendido sobre el velo. Arriba, «Pintor ›» (a su ficha) y «Nivel 3 de
// 5»; en medio, un círculo por nivel (ui/level-row.js); abajo, un único botón «Empezar · <nivel>», que hace lo mismo que el
// círculo resaltado («Repasar» con todo hecho). Solo la tienen los pintores con más de un nivel. Se carga al primer toque. Pulsar fuera, Esc, desplazar el mapa o cambiar de pantalla la cierran.
// Se pinta al instante: si la historia del pintor aún no ha llegado (el mapa la precarga, ui/story-prefetch.js), los
// círculos salen con una obra de cada nivel y se completan con la historia en cuanto llega.

import { esc } from './dom.js';
import { icons } from './icons.js';
import { loadCss } from './lazy-css.js';
import { loadStory, peekStory } from './story-data.js';
import { modalSlot, mountSheet } from './modal-slot.js';
import { levelRing, startedRing, startedLine } from '../engine/level-ring.js';
import { rowLevels, rowHtml, wireRow, levelRoute } from './level-row.js';
import { setPlayContext } from './play-context.js';

const slot = modalSlot();
const EDGE = 16;        // margen de la tarjeta con los bordes de la ventana
const TIP = 14;         // del aro al cuerpo de la tarjeta (sitio para el pico)
const CARD_MAX = 420;   // ancho máximo de la tarjeta (escritorio)
const TOP_ROOM = 0.18;  // si no cabe ni arriba ni abajo, el retrato sube a esta altura de la ventana
const MOVE_CLOSE_PX = 40; // el mapa se ha movido bajo la tarjeta: se cierra (menos es un resto del desplazamiento)

const px = (name) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;

// A medias (ring.started): una línea con lo que falta («Has acertado el 67 %; hace falta un 75 %») y «Repetir».
function cardHtml(artist, ring, levels) {
  const next = ring.levels.find((l) => l.state === 'next');
  const play = ring.started ? 'Repetir' : next ? `Empezar <small>· ${esc(next.short)}</small>` : 'Repasar';
  const pill = ring.done ? 'Completo' : ring.total < 2 ? '' : `Nivel ${ring.at} de ${ring.total}`;
  return `<div class="lc-card">
      <div class="lc-head">
        <button type="button" class="lc-name" id="lc-name" data-lc="profile">${esc(artist.short || artist.name)}${icons.next(20)}</button>
        ${pill ? `<span class="lc-level${ring.done ? ' is-done' : ''}">${pill}</span>` : ''}
      </div>
      ${ring.started ? `<p class="lc-line">${esc(startedLine(ring))}</p>` : ''}
      ${ring.started && ring.total < 2 ? '' : rowHtml(levels)}
      <div class="hl-more" hidden></div>
      <button type="button" class="btn btn-primary btn-wide lc-play" data-lc="play">${play}</button>
    </div>`;
}

// Coloca el retrato encendido sobre el original y la tarjeta debajo (o encima, si no cabe), con el pico hacia el retrato.
export function place(dlg, dot) {
  const out = px('--ring-out');
  let r = dot.getBoundingClientRect();
  const card = dlg.querySelector('.lc-card');
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const w = Math.min(vw - 2 * EDGE, CARD_MAX);
  card.style.width = `${w}px`;
  const h = card.offsetHeight;
  const fitsBelow = (rr) => rr.bottom + out + TIP + h <= vh - EDGE;
  const fitsAbove = (rr) => rr.top - out - TIP - h >= EDGE;
  if (!fitsBelow(r) && !fitsAbove(r)) {
    window.scrollBy(0, r.top - out - vh * TOP_ROOM);
    r = dot.getBoundingClientRect();
  }
  const below = fitsBelow(r) || !fitsAbove(r);
  const cx = r.left + r.width / 2;
  const left = Math.min(Math.max(cx - w / 2, EDGE), vw - EDGE - w);
  card.style.left = `${left}px`;
  // Encima, anclada por abajo: si crece (la línea de un nivel), crece hacia arriba y no tapa el retrato.
  card.style.top = below ? `${r.bottom + out + TIP}px` : 'auto';
  card.style.bottom = below ? 'auto' : `${vh - (r.top - out - TIP)}px`;
  card.style.setProperty('--tip-x', `${cx - left}px`);
  card.dataset.side = below ? 'below' : 'above';
  const lit = dlg.querySelector('.lc-lit');
  lit.style.left = `${r.left}px`;
  lit.style.top = `${r.top}px`;
  lit.style.setProperty('--dot', `${r.width}px`);
}

// button: el nodo del mapa (.stage con aro). branchId: rama desde la que se abre (jugar el nivel 1 sigue en ella).
export async function openLevelCard(ctx, button, branchId = '') {
  const artistId = button.dataset.id;
  const { index } = ctx;
  const artist = index.artist(artistId);
  const progress = ctx.store.get().progress;
  const ring = artist && (levelRing(progress, index, artistId) || startedRing(progress, index, artistId));
  if (!ring) return null;
  const turn = slot.begin();
  await loadCss('css/niveles.css');
  if (slot.stale(turn) || !button.isConnected) return null;
  const known = peekStory(artistId);
  // En la fila, el nivel a medias se toca como el siguiente (lo vuelve a jugar).
  const rowStates = ring.levels.map((l) => (l.state === 'partial' ? { ...l, state: 'next' } : l));
  const levels = rowLevels(index, artistId, known ?? null, rowStates);
  const dot = button.querySelector('.stage-dot');
  const dlg = document.createElement('dialog');
  dlg.className = 'lc';
  dlg.setAttribute('aria-labelledby', 'lc-name');
  dlg.innerHTML = `<div class="lc-lit" aria-hidden="true"><span class="stage ${ring.started ? 'is-started' : 'is-mastered'}${button.classList.contains('has-ring') ? ' has-ring' : ''}">${dot.outerHTML}</span></div>${cardHtml(artist, ring, levels)}`;
  document.body.appendChild(dlg);
  const handle = { dlg };
  const close = mountSheet(dlg, { slot, handle, opener: button, closeSelector: '.lc-lit' });
  place(dlg, dot);
  // Se cierra si el mapa se mueve de verdad bajo ella o gira la pantalla; no por un resto de desplazamiento que llega
  // tarde con el móvil ocupado, ni por la barra del sistema o del navegador que cambia el alto (antes se abría y se
  // cerraba sola).
  let y0 = window.scrollY;
  const w0 = window.innerWidth;
  const onMove = () => { if (Math.abs(window.scrollY - y0) > MOVE_CLOSE_PX) close({ silent: true }); };
  const onResize = () => { if (window.innerWidth !== w0) close({ silent: true }); };
  requestAnimationFrame(() => {
    y0 = window.scrollY;
    window.addEventListener('scroll', onMove, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
  });
  dlg.addEventListener('close', () => {
    window.removeEventListener('scroll', onMove);
    window.removeEventListener('resize', onResize);
  });
  const go = (route) => { close({ silent: true }); ctx.go(route); };
  // Lo que se juega desde la tarjeta de un pintor cierra con algo sobre él (ui/play-context.js).
  const play = (level) => { setPlayContext(artistId); go(levelRoute(artistId, level, branchId)); };
  wireRow(ctx, dlg, artistId, dlg.querySelector('.hl-more'), { play, replay: play });
  dlg.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-lc]');
    if (!b) return;
    ctx.audio.sfx('tap');
    if (b.dataset.lc === 'profile') go(`pintor-${artistId}`);
    else play(ring.next || 1);
  });
  dlg.querySelector('.lc-play').focus({ preventScroll: true });
  if (known === undefined) loadStory(artistId).then((story) => { if (story && dlg.open) fillStories(dlg, rowLevels(index, artistId, story, rowStates)); });
  return handle;
}

// La historia llega con la tarjeta abierta: los círculos pasan a su portada y a «ver su historia», sin perder el foco.
function fillStories(dlg, levels) {
  const row = dlg.querySelector('.hl-row');
  if (!row) return;
  const focused = row.contains(document.activeElement) ? document.activeElement.dataset.hl : null;
  row.outerHTML = rowHtml(levels);
  if (focused) dlg.querySelector(`.hl[data-hl="${focused}"]`)?.focus({ preventScroll: true });
}
