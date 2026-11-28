// Hoja del mapa: se abre desde abajo al tocar el medallón de una época cerrada (qué falta y qué espera) y, desde Perfil →
// Ajustes, «Cómo se juega». Se carga al primer toque.

import { esc, accentStyle, joinNames } from './dom.js';
import { icons } from './icons.js';
import { loadCss } from './lazy-css.js';
import { afterEra, period } from './screens/path-signs.js';
import { modalSlot, mountSheet } from './modal-slot.js';
import { eraCrossed, missingEssentials, essentialLock } from '../engine/essentials.js';
import { essentialRoute } from '../engine/next-step.js';

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

// Época cerrada: cuándo se abre, de qué va y quién espera.
export function openEraSheet(ctx, movementId, opener) {
  const { index } = ctx;
  const movement = index.movement(movementId);
  if (!movement) return null;
  const order = index.visibleMovements.map((m) => m.id);
  const prev = index.movement(order[order.indexOf(movementId) - 1]);
  const painters = index.stageArtists(movementId).map((a) => a.short || a.name);
  const p = ctx.store.get().progress;
  // Lo que pide la puerta además de terminar la época anterior: sus imprescindibles, cada uno con «Ir» (engine/essentials.js).
  const must = prev && !eraCrossed(p, index, movementId) ? missingEssentials(p, index, prev.id) : [];
  const musts = must.map((e) => `<li><span>${esc(essentialLock(e))}</span><button type="button" class="btn btn-secondary ms-go" data-to="${esc(essentialRoute(p, index, e))}">Ir</button></li>`).join('');
  const body = `<header class="ms-head"><p class="ms-kicker">${esc(period(movement.period))}</p><h2 class="ms-title" id="ms-title">${esc(movement.name)}</h2></header>
    <p class="ms-lock">${icons.lock(16)}<span>${prev ? `Se abre ${esc(afterEra('terminar', prev.name))}.` : 'Aún cerrada.'}</span></p>
    ${musts ? `<ul class="ms-must">${musts}</ul>` : ''}
    ${movement.blurb ? `<p class="ms-about">${esc(movement.blurb)}</p>` : ''}
    ${painters.length ? `<p class="ms-wait"><span class="ms-label">Te esperan</span>${esc(joinNames(painters))}</p>` : ''}
    <button type="button" class="btn btn-primary btn-wide ms-ok" data-ms="close">Entendido</button>`;
  return openSheet(ctx, opener, movement.accent, body).then((handle) => {
    handle?.dlg.querySelectorAll('.ms-go').forEach((b) => b.addEventListener('click', () => { ctx.audio.sfx('tap'); ctx.go(b.dataset.to); }));
    return handle;
  });
}
