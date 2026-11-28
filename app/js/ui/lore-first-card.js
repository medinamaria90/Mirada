// Tarjeta de un pintor al que aún no se ha llegado por la presentación de su época o el cartel de su tramo: sale anclada
// a su retrato, como la de los niveles (level-card.js), y dice qué va antes en el botón («Empezar · antes, el
// Renacimiento»). El botón lleva a esa secuencia (época, tramo, pintor): nunca se salta nada sin avisar. Se cierra al
// pulsar fuera, con Esc, al desplazar el mapa o al cambiar de pantalla.

import { esc } from './dom.js';
import { icons } from './icons.js';
import { loadCss } from './lazy-css.js';
import { modalSlot, mountSheet } from './modal-slot.js';
import { place } from './level-card.js';
import { stageRoute } from './router.js';

const slot = modalSlot();
const MOVE_CLOSE_PX = 40;   // el mapa se ha movido bajo la tarjeta: se cierra

// button: el nodo del pintor en el mapa. before: lo que va antes («el Renacimiento»). branchId: rama desde la que se abre.
export async function openLoreFirstCard(ctx, button, before, branchId = '') {
  const artist = ctx.index.artist(button.dataset.id);
  const dot = button.querySelector('.stage-dot');
  if (!artist || !dot) return null;
  const turn = slot.begin();
  await loadCss('css/niveles.css');
  if (slot.stale(turn) || !button.isConnected) return null;
  const dlg = document.createElement('dialog');
  dlg.className = 'lc';
  dlg.setAttribute('aria-labelledby', 'lc-name');
  dlg.innerHTML = `<div class="lc-lit" aria-hidden="true"><span class="stage is-available">${dot.outerHTML.replace(/<span class="map-cue".*?<\/span>/, '')}</span></div>
    <div class="lc-card">
      <div class="lc-head">
        <button type="button" class="lc-name" id="lc-name" data-lc="profile">${esc(artist.short || artist.name)}${icons.next(20)}</button>
      </div>
      <button type="button" class="btn btn-primary btn-wide lc-play" data-lc="play">Empezar <small>· antes, ${esc(before)}</small></button>
    </div>`;
  document.body.appendChild(dlg);
  const handle = { dlg };
  const close = mountSheet(dlg, { slot, handle, opener: button, closeSelector: '.lc-lit' });
  place(dlg, dot);
  const y0 = window.scrollY;
  const onMove = () => { if (Math.abs(window.scrollY - y0) > MOVE_CLOSE_PX) close({ silent: true }); };
  requestAnimationFrame(() => window.addEventListener('scroll', onMove, { passive: true }));
  dlg.addEventListener('close', () => window.removeEventListener('scroll', onMove));
  dlg.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-lc]');
    if (!b) return;
    ctx.audio.sfx('tap');
    close({ silent: true });
    ctx.go(b.dataset.lc === 'profile' ? `pintor-${artist.id}` : stageRoute(artist.id, branchId));
  });
  dlg.querySelector('.lc-play').focus({ preventScroll: true });
  return handle;
}
