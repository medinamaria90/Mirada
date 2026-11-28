// Hoja del mapa: se abre desde abajo al tocar un pintor por descubrir (locked-painter-sheet.js) y, desde Perfil → Ajustes,
// «Cómo se juega». Se carga al primer toque.

import { esc, accentStyle } from './dom.js';
import { icons } from './icons.js';
import { loadCss } from './lazy-css.js';
import { modalSlot, mountSheet } from './modal-slot.js';

const slot = modalSlot();

export async function openSheet(ctx, opener, accent, body) {
  const turn = slot.begin();
  await loadCss('css/mapa-hoja.css');
  if (slot.stale(turn)) return null; // otro toque ha pedido otra hoja mientras cargaba esta
  const dlg = document.createElement('dialog');
  dlg.className = 'map-sheet';
  dlg.setAttribute('aria-labelledby', 'ms-title');
  if (accent) dlg.setAttribute('style', accentStyle(accent));
  dlg.innerHTML = `<div class="ms-body"><span class="ms-grip" aria-hidden="true"></span>
    <button type="button" class="icon-btn ms-close" data-ms="close" aria-label="Cerrar">${icons.close(22)}</button>${body}</div>`;
  document.body.appendChild(dlg);
  const handle = { dlg };
  mountSheet(dlg, { slot, handle, opener, closeSelector: '[data-ms="close"]' });
  dlg.querySelector('.ms-close').focus({ preventScroll: true });
  return handle;
}

// «Cómo se juega» (Perfil → Ajustes), en cuatro líneas. Es el único sitio donde la app se explica.
const HOW = [
  ['book', 'Cada época empieza en el medallón de su puerta, y cada tramo, en un rombo: ahí se cuenta su historia.'],
  ['arch', 'Cada parada redonda es un pintor: miras sus cuadros y aprendes a reconocerlo.'],
  ['eye', 'Después, preguntas rápidas: ¿quién lo pintó? Aciertas y la parada se ilumina.'],
  ['fork', 'Al terminar una época se abre la siguiente, y ramas con más pintores.'],
];
export function openIntroSheet(ctx, _id, opener) {
  const body = `<header class="ms-head"><p class="ms-kicker">El camino</p><h2 class="ms-title" id="ms-title">Cómo se juega</h2></header>
    <ul class="ms-how">${HOW.map(([icon, text]) => `<li><span class="ms-mark is-available" aria-hidden="true">${icons[icon](14)}</span><span>${esc(text)}</span></li>`).join('')}</ul>
    <button type="button" class="btn btn-primary btn-wide ms-ok" data-ms="close">Vamos</button>`;
  return openSheet(ctx, opener, ctx.index.visibleMovements[0]?.accent, body);
}
