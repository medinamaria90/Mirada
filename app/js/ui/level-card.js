// Tarjeta del nodo de un pintor con niveles (como la de las lecciones de Duolingo): al tocar su retrato en el mapa o en una
// rama sale anclada con su pico al retrato, que sigue encendido sobre el velo. Arriba, «Pintor ›» (a su ficha) y «Nivel 3 de
// 5»; en medio, un círculo por nivel (ui/level-row.js); abajo, un único botón «Empezar · <nivel>», que hace lo mismo que el
// círculo resaltado («Repasar» con todo hecho). Solo la tienen los pintores con más de un nivel. Se carga al primer toque. Pulsar fuera, Esc, desplazar el mapa o cambiar de pantalla la cierran.

import { esc } from './dom.js';
import { icons } from './icons.js';
import { loadCss } from './lazy-css.js';
import { loadStory } from './story-data.js';
import { modalSlot, mountSheet } from './modal-slot.js';
import { levelRing } from '../engine/level-ring.js';
import { rowLevels, rowHtml, wireRow, levelRoute } from './level-row.js';

const slot = modalSlot();
const EDGE = 16;        // margen de la tarjeta con los bordes de la ventana
const TIP = 14;         // del aro al cuerpo de la tarjeta (sitio para el pico)
const CARD_MAX = 420;   // ancho máximo de la tarjeta (escritorio)
const TOP_ROOM = 0.18;  // si no cabe ni arriba ni abajo, el retrato sube a esta altura de la ventana

const px = (name) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;

function cardHtml(artist, ring, levels) {
  const next = ring.levels.find((l) => l.state === 'next');
  const play = next ? `Empezar <small>· ${esc(next.short)}</small>` : 'Repasar';
  const pill = ring.done ? 'Completo' : `Nivel ${ring.at} de ${ring.total}`;
  return `<div class="lc-card">
      <div class="lc-head">
        <button type="button" class="lc-name" id="lc-name" data-lc="profile">${esc(artist.short || artist.name)}${icons.next(20)}</button>
        <span class="lc-level${ring.done ? ' is-done' : ''}">${pill}</span>
      </div>
      ${rowHtml(levels)}
      <div class="hl-more" hidden></div>
      <button type="button" class="btn btn-primary btn-wide lc-play" data-lc="play">${play}</button>
    </div>`;
}

// Coloca el retrato encendido sobre el original y la tarjeta debajo (o encima, si no cabe), con el pico hacia el retrato.
function place(dlg, dot) {
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
  const ring = artist && levelRing(ctx.store.get().progress, index, artistId);
  if (!ring) return null;
  const turn = slot.begin();
  const [story] = await Promise.all([loadStory(artistId), loadCss('css/niveles.css')]);
  if (slot.stale(turn) || !button.isConnected) return null;
  const levels = rowLevels(index, artistId, story, ring.levels);
  const dot = button.querySelector('.stage-dot');
  const dlg = document.createElement('dialog');
  dlg.className = 'lc';
  dlg.setAttribute('aria-labelledby', 'lc-name');
  dlg.innerHTML = `<div class="lc-lit" aria-hidden="true"><span class="stage is-mastered${button.classList.contains('has-ring') ? ' has-ring' : ''}">${dot.outerHTML}</span></div>${cardHtml(artist, ring, levels)}`;
  document.body.appendChild(dlg);
  const handle = { dlg };
  const close = mountSheet(dlg, { slot, handle, opener: button, closeSelector: '.lc-lit' });
  place(dlg, dot);
  const onMove = () => close({ silent: true });
  requestAnimationFrame(() => {
    window.addEventListener('scroll', onMove, { passive: true, once: true });
    window.addEventListener('resize', onMove, { once: true });
  });
  dlg.addEventListener('close', () => {
    window.removeEventListener('scroll', onMove);
    window.removeEventListener('resize', onMove);
  });
  const go = (route) => { close({ silent: true }); ctx.go(route); };
  const play = (level) => go(levelRoute(artistId, level, branchId));
  wireRow(ctx, dlg, artistId, dlg.querySelector('.hl-more'), { play, replay: play });
  dlg.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-lc]');
    if (!b) return;
    ctx.audio.sfx('tap');
    if (b.dataset.lc === 'profile') go(`pintor-${artistId}`);
    else go(levelRoute(artistId, ring.next || 1, branchId));
  });
  dlg.querySelector('.lc-play').focus({ preventScroll: true });
  return handle;
}
