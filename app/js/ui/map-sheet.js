// Hoja del mapa: se abre desde abajo al tocar el cartel de una época cerrada (qué falta y qué espera) o el
// de una rama (sus pintores por épocas, con su estado; cada pintor abre su ficha). Se carga al primer toque.

import { esc, accentStyle } from './dom.js';
import { icons } from './icons.js';
import { loadCss } from './lazy-css.js';
import { branchStatus, movementReached } from '../engine/branches.js';
import { lifeSpan } from '../engine/painters.js';

const KIND = {
  epoca: { kicker: 'Rama de la época', about: 'Pintores menos conocidos de la época, para afinar la mirada.' },
  escuela: { kicker: 'Escuela', about: 'Sus pintores en orden cronológico. Se abren por épocas, al ritmo del camino.' },
  rama: { kicker: 'Rama', about: '' },
};
const STATE = { mastered: 'Dominado', started: 'En marcha', available: 'Abierto', locked: 'Por abrir' };
const STATE_ICON = { mastered: 'check', started: 'play', available: 'play', locked: 'lock' };

let current = null;

function names(list) {
  if (list.length <= 1) return list.join('');
  return `${list.slice(0, -1).join(', ')} y ${list[list.length - 1]}`;
}

async function open(ctx, opener, accent, body) {
  if (current) current.close();
  await loadCss('css/mapa-hoja.css');
  const dlg = document.createElement('dialog');
  dlg.className = 'map-sheet';
  dlg.setAttribute('aria-labelledby', 'ms-title');
  if (accent) dlg.setAttribute('style', accentStyle(accent));
  dlg.innerHTML = `<div class="ms-body"><span class="ms-grip" aria-hidden="true"></span>
    <button type="button" class="icon-btn ms-close" data-ms="close" aria-label="Cerrar">${icons.close(22)}</button>${body}</div>`;
  document.body.appendChild(dlg);
  const close = () => {
    if (current !== handle) return;
    current = null;
    if (dlg.open) dlg.close();
    dlg.remove();
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
  };
  const handle = { close, dlg };
  current = handle;
  dlg.addEventListener('click', (ev) => {
    if (ev.target === dlg) return close();
    const b = ev.target.closest('[data-ms]');
    if (!b) return;
    ctx.audio.sfx('tap');
    if (b.dataset.ms === 'close') return close();
    if (b.dataset.ms === 'artist') {
      close();
      import('./artist-sheet.js').then((m) => m.openArtistSheet(ctx, b.dataset.id, { opener })).catch((err) => console.error(err));
    }
  });
  dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); close(); });
  try { dlg.showModal(); } catch { dlg.setAttribute('open', ''); }
  dlg.querySelector('.ms-close').focus({ preventScroll: true });
  return handle;
}

// Época cerrada: cuándo se abre, de qué va y quién espera.
export function openEraSheet(ctx, movementId, opener) {
  const { index } = ctx;
  const movement = index.movement(movementId);
  if (!movement) return null;
  const order = index.visibleMovements.map((m) => m.id);
  const prev = index.movement(order[order.indexOf(movementId) - 1]);
  const painters = index.stageArtists(movementId).map((a) => a.short || a.name);
  const body = `<header class="ms-head"><p class="ms-kicker">${esc(movement.period)}</p><h2 class="ms-title" id="ms-title">${esc(movement.name)}</h2></header>
    <p class="ms-lock">${icons.lock(16)}<span>${prev ? `Se abre al terminar ${esc(prev.name)}.` : 'Aún cerrada.'}</span></p>
    ${movement.blurb ? `<p class="ms-about">${esc(movement.blurb)}</p>` : ''}
    ${painters.length ? `<p class="ms-wait"><span class="ms-label">Te esperan</span>${esc(names(painters))}</p>` : ''}
    <button type="button" class="btn btn-primary btn-wide ms-ok" data-ms="close">Entendido</button>`;
  return open(ctx, opener, movement.accent, body);
}

function painterRow(ctx, row) {
  const a = ctx.index.artist(row.artistId);
  if (!a) return '';
  const inner = `<span class="ms-mark is-${row.status}" aria-hidden="true">${icons[STATE_ICON[row.status]](14)}</span>
    <span class="ms-who"><span class="ms-name">${esc(a.name)}</span>${lifeSpan(a) ? `<span class="ms-years">${esc(lifeSpan(a))}</span>` : ''}</span>
    <span class="ms-state">${STATE[row.status]}</span>`;
  return row.reached
    ? `<li><button type="button" class="ms-row" data-ms="artist" data-id="${esc(a.id)}" aria-label="${esc(a.name)}, ${STATE[row.status].toLowerCase()}: ver su ficha">${inner}</button></li>`
    : `<li class="ms-row is-locked">${inner}</li>`;
}

// Rama: estado, de qué va y sus pintores por tramos de época (los de épocas aún no vistas, apagados).
export function openBranchSheet(ctx, branchId, opener) {
  const { index } = ctx;
  const branch = index.branch(branchId);
  if (!branch) return null;
  const progress = ctx.store.get().progress;
  const rows = branchStatus(progress, index, branchId);
  const openNow = movementReached(progress, index, branch.opensAt);
  const mastered = rows.filter((r) => r.status === 'mastered').length;
  const kind = KIND[branch.kind] || KIND.rama;
  const own = index.movement(branch.movementId);
  const about = kind.about || own?.blurb || '';
  const groups = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.opensAt === row.opensAt) last.rows.push(row);
    else groups.push({ opensAt: row.opensAt, reached: row.reached, rows: [row] });
  }
  const single = groups.length === 1;
  const list = groups.map((g) => {
    const era = index.movement(g.opensAt);
    const head = single ? '' : `<h3 class="ms-group">${esc(era?.name || '')}${g.reached ? '' : `<span class="ms-group-lock">${icons.lock(12)}<span>al llegar</span></span>`}</h3>`;
    return `<section class="ms-section">${head}<ul class="ms-list">${g.rows.map((r) => painterRow(ctx, r)).join('')}</ul></section>`;
  }).join('');
  const status = openNow
    ? `<p class="ms-progress"><span class="ms-bar"><span style="width:${rows.length ? Math.round((mastered / rows.length) * 100) : 0}%"></span></span><span>${mastered} de ${rows.length} dominados</span></p>`
    : `<p class="ms-lock">${icons.lock(16)}<span>Se abre al llegar a ${esc(index.movement(branch.opensAt)?.name || '')}.</span></p>`;
  const body = `<header class="ms-head"><p class="ms-kicker">${esc(kind.kicker)}</p><h2 class="ms-title" id="ms-title">${esc(branch.name)}</h2></header>
    ${status}${about ? `<p class="ms-about">${esc(about)}</p>` : ''}${list}`;
  return open(ctx, opener, own?.accent || index.movement(branch.opensAt)?.accent, body);
}
