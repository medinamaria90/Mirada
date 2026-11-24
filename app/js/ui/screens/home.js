// Inicio: la franja «Hoy» fija bajo la cabecera y el mapa del camino (ui/screens/path-map.js).

import { esc, onAction } from '../dom.js';
import { icons } from '../icons.js';
import { page } from '../shell.js';
import { artFrame } from '../art.js';
import { todayStrip, todayDialog, todayActions } from './home-today.js';
import { renderPathMap, pathActions, watchLandscapes, scrollToCurrent } from './path-map.js';
import { isPathMastered, stepsToMaster, isPathComplete } from '../../engine/progress.js';
import { recognizedCount } from '../../engine/goals.js';
import { dueKeys } from '../../engine/srs.js';
import { playEra } from '../audio-bridge.js';
import { weekOf } from '../../engine/dates.js';

export function renderHome(ctx, el) {
  const { index } = ctx;
  const state = ctx.store.get();
  const p = state.progress;
  const today = ctx.today();
  const due = dueKeys(p.srs, today).length;
  const complete = isPathComplete(p, index);
  // «Camino completo» solo con todo dominado; si quedan paradas por repasar, se dice cuántas.
  const mastered = isPathMastered(p, index);
  const pending = complete && !mastered ? stepsToMaster(p, index) : [];

  const recognized = recognizedCount(p, index);
  let finale = '';
  if (mastered) {
    finale = `<section class="finale" aria-label="Camino completo">
      <span class="finale-icon">${icons.laurel(30)}</span>
      <h2 class="finale-title">Camino completo</h2>
      <p class="finale-count"><strong>${recognized}</strong> ${recognized === 1 ? 'cuadro que reconoces' : 'cuadros que reconoces'}</p>
      <div class="finale-actions">
        <button class="btn btn-primary btn-wide" data-action="free">${icons.shuffle(20)}<span>Ronda libre</span></button>
        <button class="btn btn-secondary btn-wide" data-action="weekly">${icons.target(20)}<span>Reto semanal</span></button>
        ${due > 0 ? `<button class="btn btn-secondary btn-wide" data-action="srs">${icons.repeat(20)}<span>Repaso</span></button>` : ''}
      </div>
    </section>`;
  } else if (pending.length) {
    const first = pending[0];
    const firstName = first.type === 'sala' ? index.movement(first.id).name : index.artist(first.id).name;
    finale = `<section class="finale" aria-label="Por dominar">
      <span class="finale-icon">${icons.repeat(28)}</span>
      <h2 class="finale-title">${pending.length === 1 ? 'Te queda 1 por dominar' : `Te quedan ${pending.length} por dominar`}</h2>
      <div class="finale-actions">
        <button class="btn btn-primary btn-wide" data-action="${first.type === 'sala' ? 'sala' : 'stage'}" data-id="${esc(first.id)}">${icons.repeat(20)}<span>Repasar ${esc(firstName)}</span></button>
      </div>
    </section>`;
  }
  el.innerHTML = page(ctx, 'home', `
    <h1 class="sr-only">Tu camino</h1>
    ${todayStrip(ctx)}
    ${todayDialog()}
    <div class="home-grid">
      <aside class="home-side">${sideExtras(ctx)}</aside>
      <div class="home-main">
        <ol class="path path-map" aria-label="Camino por movimientos, del Renacimiento arriba hacia tu museo">${renderPathMap(ctx)}</ol>
        ${finale}
      </div>
    </div>`);

  playEra('menu');
  watchLandscapes(el);

  onAction(el, {
    ...pathActions(ctx),
    ...todayActions(ctx, el),
    daily: () => {
      ctx.audio.sfx('tap');
      ctx.go('reto-diario');
    },
    srs: () => {
      ctx.audio.sfx('tap');
      ctx.go('repaso');
    },
    quick: () => {
      ctx.audio.sfx('tap');
      ctx.go('repaso-rapido');
    },
    review5: () => {
      ctx.audio.sfx('tap');
      ctx.go('repaso5');
    },
    collection: () => {
      ctx.audio.sfx('tap');
      ctx.go('coleccion');
    },
    free: () => {
      ctx.audio.sfx('tap');
      ctx.go('ronda-libre');
    },
    weekly: () => {
      ctx.audio.sfx('tap');
      ctx.go('reto-semanal');
    },
  });
}

// Escritorio: bajo las tarjetas del día, la semana y las últimas obras reconocidas (la columna
// lateral no se queda vacía). En el móvil no se muestra: ya está en Perfil y Colección.
function sideExtras(ctx) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const today = ctx.today();
  const days = new Set(p.streak.days);
  const labels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const week = weekOf(today);
  const active = week.filter((d) => days.has(d)).length;
  const cells = week.map((d, i) => `<span class="day ${days.has(d) ? 'is-on' : ''} ${d === today ? 'is-today' : ''}"><span class="day-dot"></span><span class="day-label">${labels[i]}</span></span>`).join('');
  const recent = Object.entries(p.collection)
    .filter(([id]) => index.artwork(id))
    .sort((a, b) => (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0))
    .slice(0, 4)
    .map(([id]) => index.artwork(id));
  const owned = Object.keys(p.collection).filter((id) => index.artwork(id)).length;
  const coll = recent.length
    ? `<button class="side-coll" data-action="collection" aria-label="Colección: ${owned} ${owned === 1 ? 'obra' : 'obras'}">
        <span class="side-head"><span class="side-title">Colección</span><span class="side-count">${owned}</span><span class="side-go" aria-hidden="true">${icons.next(18)}</span></span>
        <span class="side-thumbs">${recent.map((w) => artFrame(w, { cls: 'side-thumb', alt: '', label: '', thumb: true })).join('')}</span>
      </button>`
    : '';
  return `<div class="side-extras">
      <section class="side-week" aria-label="${active} días con práctica esta semana">
        <span class="side-head"><span class="side-title">Esta semana</span><span class="side-count">${active}/7</span></span>
        <div class="week" aria-hidden="true">${cells}</div>
      </section>
      ${coll}
    </div>`;
}

export { scrollToCurrent };
