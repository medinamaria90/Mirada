// Inicio: tarjetas del día, progreso y el mapa del camino (ui/screens/path-map.js).

import { esc, onAction, accentStyle, longDate, plural, prefersReducedMotion } from '../dom.js';
import { icons } from '../icons.js';
import { page } from '../shell.js';
import { artFrame, coverOf } from '../art.js';
import { detailCard, detailRow, answerDetailCard } from './home-detail.js';
import { renderPathMap, pathActions, watchLandscapes, scrollToCurrent, salaCover, initials } from './path-map.js';
import { settleCharacter } from '../path-character.js';
import { nextStep, pathProgress, isPathComplete, isPathMastered, stepsToMaster } from '../../engine/progress.js';
import { recognizedCount, planDetail } from '../../engine/goals.js';
import { readSession } from '../../state/session.js';
import { dueKeys, QUICK_REVIEW } from '../../engine/srs.js';
import { review5Works, REVIEW5_MIN, REVIEW5_NAME } from '../../engine/review.js';
import { playEra } from '../audio-bridge.js';
import { weekOf, isoWeek } from '../../engine/dates.js';

export function renderHome(ctx, el) {
  const { index } = ctx;
  const state = ctx.store.get();
  const p = state.progress;
  const today = ctx.today();
  const next = nextStep(p, index);
  const session = readSession(state, index, Date.now());
  const due = dueKeys(p.srs, today).length;
  const daily = p.daily[ctx.dailyDay()];
  const complete = isPathComplete(p, index);
  // «Camino completo» solo con todo dominado; si quedan paradas por repasar, se dice cuántas.
  const mastered = isPathMastered(p, index);
  const pending = complete && !mastered ? stepsToMaster(p, index) : [];

  const cards = [];
  if (session) {
    const done = session.round.pos;
    const total = session.round.queue.length;
    const pm = session.plan;
    const cover = pm.artistId && index.artist(pm.artistId) ? coverOf(index, pm.artistId)
      : pm.movementId && index.isSala(pm.movementId) ? salaCover(index, pm.movementId) : null;
    cards.push(`<button class="card card-continue${cover ? '' : ' no-thumb'}" data-action="resume" style="${accentStyle(session.accent)}">
      ${cover ? artFrame(cover, { cls: 'card-thumb', alt: '', label: initials(session.title), thumb: true }) : ''}
      <span class="card-text"><span class="card-kicker">Ronda a medias · ${done}/${total}</span><span class="card-title">${esc(session.title)}</span></span>
      <span class="card-go" aria-hidden="true">${icons.play(18)}</span>
    </button>`);
  } else if (mastered) {
    // Camino dominado: siempre hay algo con sentido que hacer.
    cards.push(`<button class="card card-continue no-thumb" data-action="free">
      <span class="card-text"><span class="card-kicker">Camino completo</span><span class="card-title">Ronda libre</span></span>
      <span class="card-go" aria-hidden="true">${icons.shuffle(20)}</span>
    </button>`);
  }
  if (!session && next && !mastered) {
    const isSala = next.type === 'sala';
    const movement = index.movement(next.movementId);
    const cover = isSala ? salaCover(index, next.id) : coverOf(index, next.id);
    const name = isSala ? movement.name : index.artist(next.id).name;
    const started = isSala ? p.salas?.[next.id]?.plays : p.artists[next.id]?.plays;
    const kicker = pending.length ? `Por repasar · ${pending.length === 1 ? 'queda 1' : `quedan ${pending.length}`}`
      : started ? 'Sigue con' : isSala ? 'Conoce el movimiento' : 'Conoce a';
    cards.push(`<button class="card card-continue" data-action="${isSala ? 'sala' : 'stage'}" data-id="${esc(next.id)}" style="${accentStyle(movement.accent)}">
      ${cover ? artFrame(cover, { cls: 'card-thumb', alt: '', label: initials(name), thumb: true }) : ''}
      <span class="card-text"><span class="card-kicker">${kicker}</span><span class="card-title">${esc(name)}</span></span>
      <span class="card-go" aria-hidden="true">${icons.play(18)}</span>
    </button>`);
  }
  // Tarjetas del día. Con tres o más (camino avanzado) se agrupan en un bloque «Hoy» compacto para
  // que el mapa asome en la primera pantalla; la lupa del día se despliega desde su fila.
  const dayCards = [];
  if (mastered) {
    const week = isoWeek(ctx.dailyDay());
    const weekly = p.weekly?.[week.key];
    dayCards.push({ cls: 'card-daily card-weekly', action: 'weekly', icon: icons.target(22), title: 'Reto semanal', sub: `Semana ${week.week} · 15 cuadros`, status: weekly ? `${weekly.score}/${weekly.total}` : 'Jugar' });
  }
  dayCards.push({ cls: 'card-daily', action: 'daily', icon: icons.calendar(22), title: 'Reto diario', sub: longDate(ctx.dailyDay()), status: daily ? `${daily.score}/${daily.total}` : 'Jugar' });
  const review5 = review5Works(p, index, today).length;
  if (review5 >= REVIEW5_MIN) {
    // Repaso de 5 (opcional): fallados, vencidos y antiguos de pintores dominados. Ocupa el sitio del
    // repaso rápido, que repasaría casi lo mismo.
    dayCards.push({ cls: 'card-review', action: 'review5', icon: icons.repeat(22), title: REVIEW5_NAME, sub: plural(review5, 'cuadro', 'cuadros'), status: 'Jugar' });
  } else if (due > 0) {
    // Repaso rápido: 3 preguntas de lo que se te puede olvidar hoy (cuenta para racha y meta). Se dice
    // cuántos cuadros son hoy, no el total pendiente (que crece y desanima).
    dayCards.push({ cls: 'card-review', action: 'quick', icon: icons.repeat(22), title: 'Repaso de hoy', sub: plural(Math.min(due, QUICK_REVIEW), 'cuadro', 'cuadros'), status: 'Jugar' });
  }
  const detailPlan = planDetail(p, index, ctx.dailyDay());
  const compact = dayCards.length + (detailPlan ? 1 : 0) >= 3;
  const dayCard = (c) => `<button class="card ${c.cls}" data-action="${c.action}">
      <span class="card-icon">${c.icon}</span>
      <span class="card-text"><span class="card-title">${esc(c.title)}</span><span class="card-sub">${esc(c.sub)}</span></span>
      <span class="card-status">${esc(c.status)}</span>
    </button>`;
  const dayRow = (c) => `<li><button class="today-row ${c.cls}" data-action="${c.action}">
      <span class="today-icon">${c.icon}</span>
      <span class="today-text"><span class="today-name">${esc(c.title)}</span><span class="today-sub">${esc(c.sub)}</span></span>
      <span class="card-status">${esc(c.status)}</span>
    </button></li>`;
  if (!compact) cards.push(...dayCards.map(dayCard));
  const detail = compact ? '' : detailCard(ctx);
  const todayBlock = compact ? `<section class="today-block" aria-labelledby="today-h">
      <h2 id="today-h" class="today-h">Hoy</h2>
      <ul class="today-list">${dayCards.map(dayRow).join('')}${detailPlan ? `<li>${detailRow(ctx, detailPlan)}</li>` : ''}</ul>
    </section>` : '';
  const pp = pathProgress(p, index);
  const pct = pp.total ? Math.round((pp.mastered / pp.total) * 100) : 0;
  const overall = `<section class="overall" aria-label="Progreso del camino">
      <div class="overall-row"><span class="overall-label">Camino</span><span class="overall-count">${pp.mastered}/${pp.total} dominados</span></div>
      <span class="overall-bar" role="progressbar" aria-label="Paradas dominadas" aria-valuemin="0" aria-valuemax="${pp.total}" aria-valuenow="${pp.mastered}"><span style="width:${pct}%"></span></span>
    </section>`;
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
    <div class="home-grid">
      <aside class="home-side">
        <section class="today" aria-label="${compact ? 'Seguir' : 'Hoy'}">${cards.join('')}${detail}${todayBlock}</section>
        ${overall}
        ${sideExtras(ctx)}
      </aside>
      <div class="home-main">
        <ol class="path path-map" aria-label="Camino por movimientos, del Renacimiento arriba hacia tu museo">${renderPathMap(ctx)}</ol>
        ${finale}
      </div>
    </div>`);

  playEra('menu');
  watchLandscapes(el);
  settleCharacter(el, { reduced: prefersReducedMotion() });

  onAction(el, {
    ...pathActions(ctx),
    resume: () => {
      ctx.audio.sfx('tap');
      if (session) ctx.go(session.route);
    },
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
    detail: (b) => answerDetailCard(ctx, el, b),
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

export { coverOf, scrollToCurrent };
