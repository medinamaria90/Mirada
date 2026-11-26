// Hoja del mapa: se abre desde abajo al tocar el cartel de una época cerrada (qué falta y qué espera), el botón
// «Cómo se juega» o el cartel «Ramas (n)» de una época con varias (cada rama abierta entra en su pantalla).
// Se carga al primer toque.

import { esc, accentStyle, joinNames } from './dom.js';
import { branchRoute } from './router.js';
import { icons } from './icons.js';
import { loadCss } from './lazy-css.js';
import { branchState, tramoState, branchWhy, afterEra, period } from './screens/path-signs.js';
import { pathLayout } from './screens/path-layout.js';
import { modalSlot, mountSheet } from './modal-slot.js';

const KIND = { epoca: 'Rama de la época', escuela: 'Escuela', rama: 'Rama' };
const slot = modalSlot();

async function open(ctx, opener, accent, body) {
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
  const close = mountSheet(dlg, { slot, handle, opener, closeSelector: '[data-ms="close"]' });
  dlg.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-ms]');
    if (!b || b.dataset.ms === 'close') return;
    ctx.audio.sfx('tap');
    if (b.dataset.ms === 'go') {
      close();
      ctx.go(branchRoute(b.dataset.id));
    }
  });
  dlg.querySelector('.ms-close').focus({ preventScroll: true });
  return handle;
}

// «Cómo se juega» (caseta de «Información» de la salida), en tres líneas. Es el único sitio donde la app se explica.
const HOW = [
  ['arch', 'Cada parada es un pintor: miras sus cuadros y aprendes a reconocerlo.'],
  ['eye', 'Después, preguntas rápidas: ¿quién lo pintó? Aciertas y la parada se ilumina.'],
  ['fork', 'Al dominar una época se abre la siguiente, y ramas con más pintores.'],
];
export function openIntroSheet(ctx, _id, opener) {
  const body = `<header class="ms-head"><p class="ms-kicker">El camino</p><h2 class="ms-title" id="ms-title">Cómo se juega</h2></header>
    <ul class="ms-how">${HOW.map(([icon, text]) => `<li><span class="ms-mark is-available" aria-hidden="true">${icons[icon](14)}</span><span>${esc(text)}</span></li>`).join('')}</ul>
    <button type="button" class="btn btn-primary btn-wide ms-ok" data-ms="close">Vamos</button>`;
  return open(ctx, opener, ctx.index.visibleMovements[0]?.accent, body);
}

// Época cerrada: cuándo se abre, de qué va y quién espera.
export function openEraSheet(ctx, movementId, opener) {
  const { index } = ctx;
  const movement = index.movement(movementId);
  if (!movement) return null;
  const order = index.visibleMovements.map((m) => m.id);
  const prev = index.movement(order[order.indexOf(movementId) - 1]);
  const painters = index.stageArtists(movementId).map((a) => a.short || a.name);
  const body = `<header class="ms-head"><p class="ms-kicker">${esc(period(movement.period))}</p><h2 class="ms-title" id="ms-title">${esc(movement.name)}</h2></header>
    <p class="ms-lock">${icons.lock(16)}<span>${prev ? `Se abre ${esc(afterEra('terminar', prev.name))}.` : 'Aún cerrada.'}</span></p>
    ${movement.blurb ? `<p class="ms-about">${esc(movement.blurb)}</p>` : ''}
    ${painters.length ? `<p class="ms-wait"><span class="ms-label">Te esperan</span>${esc(joinNames(painters))}</p>` : ''}
    <button type="button" class="btn btn-primary btn-wide ms-ok" data-ms="close">Entendido</button>`;
  return open(ctx, opener, movement.accent, body);
}

// Todas las ramas de una época (cuando son más de dos van en un solo cartel): cada rama abierta entra en su
// pantalla; las cerradas dicen qué falta.
export function openEraBranchesSheet(ctx, eraId, opener) {
  const { index } = ctx;
  const movement = index.movement(eraId);
  const era = pathLayout(index).eras.find((e) => e.id === eraId);
  const group = era?.branches.find((b) => b.group);
  if (!movement || !group) return null;
  const progress = ctx.store.get().progress;
  const rows = group.members.map((m) => ({ ...m, branch: index.branch(m.id) })).filter((m) => m.branch).map((m) => {
    const st = m.extra ? tramoState(progress, index, m.branch, eraId) : branchState(progress, index, m.branch);
    const kind = KIND[m.branch.kind] || KIND.rama;
    const line = !st.open ? branchWhy(index, st) : m.extra ? `${st.fresh === 1 ? '1 pintor nuevo' : `${st.fresh} pintores nuevos`} en esta época` : `${st.mastered} de ${st.total} dominados`;
    const mark = st.total && st.mastered === st.total ? 'mastered' : st.open ? 'available' : 'locked';
    const inner = `<span class="ms-mark is-${mark}" aria-hidden="true">${icons[mark === 'mastered' ? 'check' : mark === 'available' ? 'fork' : 'lock'](14)}</span>
      <span class="ms-who"><span class="ms-name">${esc(m.branch.name)}</span><span class="ms-years">${esc(kind)} · ${esc(line)}</span></span>`;
    if (!st.open) return `<li class="ms-item"><span class="ms-row is-locked">${inner}</span></li>`;
    return `<li class="ms-item"><button type="button" class="ms-row" data-ms="go" data-id="${esc(m.branch.id)}" aria-label="${esc(`${m.branch.name}, ${line}`)}">${inner}
      <span class="ms-go" aria-hidden="true">${icons.next(18)}</span></button></li>`;
  }).join('');
  const body = `<header class="ms-head"><p class="ms-kicker">${esc(movement.name)}</p><h2 class="ms-title" id="ms-title">Ramas de esta época</h2></header>
    <ul class="ms-list">${rows}</ul>`;
  return open(ctx, opener, movement.accent, body);
}
