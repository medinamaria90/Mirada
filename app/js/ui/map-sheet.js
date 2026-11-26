// Hoja del mapa: se abre desde abajo al tocar el cartel de una época cerrada (qué falta y qué espera) o el
// de una rama (sus pintores por épocas, con su estado; cada pintor abre su ficha). Se carga al primer toque.

import { esc, accentStyle, joinNames } from './dom.js';
import { stageRoute } from './router.js';
import { icons } from './icons.js';
import { loadCss } from './lazy-css.js';
import { branchStatus, tramoPending } from '../engine/branches.js';
import { branchState, tramoState, branchWhy, afterEra, period } from './screens/path-signs.js';
import { pathLayout } from './screens/path-layout.js';
import { lifeSpan } from '../engine/painters.js';
import { modalSlot, mountSheet } from './modal-slot.js';

const KIND = {
  epoca: { kicker: 'Rama de la época', about: 'Pintores menos conocidos de la época, para afinar la mirada.' },
  escuela: { kicker: 'Escuela', about: 'Sus pintores en orden cronológico. Se abren por épocas, al ritmo del camino.' },
  rama: { kicker: 'Rama', about: '' },
};
const STATE = { mastered: 'Dominado', started: 'En marcha', available: 'Abierto', locked: 'Por abrir' };
const STATE_ICON = { mastered: 'check', started: 'play', available: 'play', locked: 'lock' };

const slot = modalSlot();


// focus: selector del control que recibe el foco al abrir (tras «Atrás», la fila de la que se vino).
async function open(ctx, opener, accent, body, focus = '') {
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
    if (b.dataset.ms === 'play') {
      close();
      return ctx.go(stageRoute(b.dataset.id, b.dataset.branch));
    }
    if (b.dataset.ms === 'branch') {
      close();
      return openBranchSheet(ctx, b.dataset.id, opener, b.dataset.era || '');
    }
    if (b.dataset.ms === 'back') {
      close();
      return openEraBranchesSheet(ctx, b.dataset.id, opener, b.dataset.from || '');
    }
    if (b.dataset.ms === 'artist') {
      close();
      // La ficha abierta desde una rama juega en esa rama.
      import('./artist-sheet.js').then((m) => m.openArtistSheet(ctx, b.dataset.id, { opener, playable: true, branchId: b.dataset.branch || '' })).catch((err) => console.error(err));
    }
  });
  (focus && dlg.querySelector(focus) || dlg.querySelector('.ms-close')).focus({ preventScroll: true });
  return handle;
}

// «Cómo se juega» (botón de la salida), en tres líneas. Es el único sitio donde la app se explica.
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

const PLAY = { available: 'Empezar', started: 'Seguir', mastered: 'Repetir' };

// Fila de un pintor: toda la fila abre su ficha; si se puede jugar en la rama, un botón «Empezar» propio.
// Los que ya tienen parada en el camino común se juegan allí («En el camino»).
function painterRow(ctx, row, branchId) {
  const a = ctx.index.artist(row.artistId);
  if (!a) return '';
  const state = row.onPath ? 'En el camino' : STATE[row.status];
  const inner = `<span class="ms-mark is-${row.onPath ? 'path' : row.status}" aria-hidden="true">${row.onPath ? icons.arch(14) : icons[STATE_ICON[row.status]](14)}</span>
    <span class="ms-who"><span class="ms-name">${esc(a.name)}</span><span class="ms-years">${esc([lifeSpan(a), state].filter(Boolean).join(' · '))}</span></span>`;
  const play = !row.onPath && row.status !== 'locked'
    ? `<button type="button" class="btn ${row.status === 'mastered' ? 'btn-secondary' : 'btn-primary'} ms-play" data-ms="play" data-id="${esc(a.id)}" data-branch="${esc(branchId)}" aria-label="${PLAY[row.status]}: ${esc(a.name)}">${PLAY[row.status]}</button>` : '';
  if (!row.reached && !row.onPath) return `<li class="ms-item"><span class="ms-row is-locked">${inner}</span></li>`;
  return `<li class="ms-item"><button type="button" class="ms-row" data-ms="artist" data-id="${esc(a.id)}" data-branch="${esc(branchId)}" aria-label="${esc(a.name)}, ${state.toLowerCase()}: ver su ficha">${inner}</button>${play}</li>`;
}

// Rama: estado, de qué va y sus pintores agrupados por la época en la que se abren (en el orden del camino,
// un grupo por época); los de épocas aún cerradas, apagados y con lo que las abre.
// fromEra: se abrió desde «Ramas de esta época» de esa época; la hoja lleva «Atrás» para volver a ella.
export function openBranchSheet(ctx, branchId, opener, fromEra = '') {
  const { index } = ctx;
  const branch = index.branch(branchId);
  if (!branch) return null;
  const progress = ctx.store.get().progress;
  const rows = branchStatus(progress, index, branchId);
  const st = branchState(progress, index, branch);
  const kind = KIND[branch.kind] || KIND.rama;
  const own = index.movement(branch.movementId);
  const about = kind.about || own?.blurb || '';
  const eras = index.visibleMovements.map((m) => m.id).filter((id) => rows.some((r) => r.opensAt === id));
  const single = eras.length === 1;
  const list = eras.map((id) => {
    const group = rows.filter((r) => r.opensAt === id);
    const reached = group[0].reached;
    // El motivo del primer grupo ya va arriba (estado de la rama): no se repite.
    const why = reached || (!st.open && id === branch.opensAt) ? '' : branchWhy(index, { pending: tramoPending(progress, index, id) });
    const head = single ? '' : `<h3 class="ms-group"><span>${esc(index.movement(id)?.name || '')}</span>${!why ? '' : `<span class="ms-group-lock">${icons.lock(12)}<span>${esc(why)}</span></span>`}</h3>`;
    return `<section class="ms-section">${head}<ul class="ms-list">${group.map((r) => painterRow(ctx, r, branchId)).join('')}</ul></section>`;
  }).join('');
  const status = st.open
    ? `<p class="ms-progress"><span class="ms-bar"><span style="width:${st.total ? Math.round((st.mastered / st.total) * 100) : 0}%"></span></span><span>${st.mastered} de ${st.total} dominados</span></p>`
    : `<p class="ms-lock">${icons.lock(16)}<span>${esc(cap(branchWhy(index, st)))}.</span></p>`;
  const back = fromEra ? `<button type="button" class="icon-btn ms-back" data-ms="back" data-id="${esc(fromEra)}" data-from="${esc(branchId)}" aria-label="Atrás: ramas de esta época">${icons.prev(22)}</button>` : '';
  const body = `${back}<header class="ms-head"><p class="ms-kicker">${esc(kind.kicker)}</p><h2 class="ms-title" id="ms-title">${esc(branch.name)}</h2></header>
    ${status}${about ? `<p class="ms-about">${esc(about)}</p>` : ''}${list}`;
  return open(ctx, opener, own?.accent || index.movement(branch.opensAt)?.accent, body);
}

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// Todas las ramas de una época (cuando son más de dos van en un solo cartel): cada fila abre la hoja de su rama.
// focusBranch: al volver con «Atrás» desde una rama, el foco vuelve a su fila.
export function openEraBranchesSheet(ctx, eraId, opener, focusBranch = '') {
  const { index } = ctx;
  const movement = index.movement(eraId);
  const era = pathLayout(index).eras.find((e) => e.id === eraId);
  const group = era?.branches.find((b) => b.group);
  if (!movement || !group) return null;
  const progress = ctx.store.get().progress;
  const rows = group.members.map((m) => ({ ...m, branch: index.branch(m.id) })).filter((m) => m.branch).map((m) => {
    const st = m.extra ? tramoState(progress, index, m.branch, eraId) : branchState(progress, index, m.branch);
    const kind = (KIND[m.branch.kind] || KIND.rama).kicker;
    const line = !st.open ? branchWhy(index, st) : m.extra ? `${st.fresh === 1 ? '1 pintor nuevo' : `${st.fresh} pintores nuevos`} en esta época` : `${st.mastered} de ${st.total} dominados`;
    const mark = st.total && st.mastered === st.total ? 'mastered' : st.open ? 'available' : 'locked';
    return `<li class="ms-item"><button type="button" class="ms-row" data-ms="branch" data-id="${esc(m.branch.id)}" data-era="${esc(eraId)}" aria-label="${esc(`${m.branch.name}, ${line}`)}">
      <span class="ms-mark is-${mark}" aria-hidden="true">${icons[mark === 'mastered' ? 'check' : mark === 'available' ? 'fork' : 'lock'](14)}</span>
      <span class="ms-who"><span class="ms-name">${esc(m.branch.name)}</span><span class="ms-years">${esc(kind)} · ${esc(line)}</span></span>
      <span class="ms-go" aria-hidden="true">${icons.next(18)}</span></button></li>`;
  }).join('');
  const body = `<header class="ms-head"><p class="ms-kicker">${esc(movement.name)}</p><h2 class="ms-title" id="ms-title">Ramas de esta época</h2></header>
    <ul class="ms-list">${rows}</ul>`;
  const focus = focusBranch && /^[a-z0-9-]+$/.test(focusBranch) ? `.ms-row[data-ms="branch"][data-id="${focusBranch}"]` : '';
  return open(ctx, opener, movement.accent, body, focus);
}
