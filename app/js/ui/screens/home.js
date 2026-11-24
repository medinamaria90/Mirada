// Inicio: tarjetas del día y camino por movimientos.

import { esc, onAction, accentStyle, longDate, announce, plural, $ } from '../dom.js';
import { icons } from '../icons.js';
import { page, topBar } from '../shell.js';
import { artFrame, coverOf, ZOOM_BADGE } from '../art.js';
import {
  artistStatus, salaStatus, movementStatus, isReviewUnlocked, hasMovementReview, nextStep, stepStatus, pathProgress, isPathComplete,
  isPathMastered, stepsToMaster,
} from '../../engine/progress.js';
import { recognizedCount, isGalleryOpen, galleryWorks, planDetail, answerDetail } from '../../engine/goals.js';
import { salaLearnWorks } from '../../engine/catalog.js';
import { readSession } from '../../state/session.js';
import { dueKeys, QUICK_REVIEW } from '../../engine/srs.js';
import { playEra } from '../audio-bridge.js';
import { weekOf, isoWeek } from '../../engine/dates.js';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

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
  // que el mapa asome en la primera pantalla; el detalle se despliega desde su fila.
  const dayCards = [];
  if (mastered) {
    const week = isoWeek(ctx.dailyDay());
    const weekly = p.weekly?.[week.key];
    dayCards.push({ cls: 'card-daily card-weekly', action: 'weekly', icon: icons.target(22), title: 'Reto semanal', sub: `Semana ${week.week} · 15 cuadros`, status: weekly ? `${weekly.score}/${weekly.total}` : 'Jugar' });
  }
  dayCards.push({ cls: 'card-daily', action: 'daily', icon: icons.calendar(22), title: 'Reto diario', sub: longDate(ctx.dailyDay()), status: daily ? `${daily.score}/${daily.total}` : 'Jugar' });
  if (due > 0) {
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
  const visible = index.visibleMovements;
  const path = visible.map((m, i) => movementBlock(ctx, m, i, visible[i - 1])).join('');
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
        <ol class="path" aria-label="Camino por movimientos">${path}</ol>
        ${finale}
      </div>
    </div>`);

  playEra('menu');

  onAction(el, {
    stage: (b) => {
      ctx.audio.sfx('tap');
      if (b.dataset.status === 'locked') return showLockNote(ctx, b);
      ctx.go(`etapa-${b.dataset.id}`);
    },
    sala: (b) => {
      ctx.audio.sfx('tap');
      if (b.dataset.status === 'locked') return showLockNote(ctx, b);
      ctx.go(`sala-${b.dataset.id}`);
    },
    intro: (b) => {
      ctx.audio.sfx('tap');
      ctx.go(`movimiento-${b.dataset.id}`);
    },
    resume: () => {
      ctx.audio.sfx('tap');
      if (session) ctx.go(session.route);
    },
    review: (b) => {
      ctx.audio.sfx('tap');
      if (b.dataset.status === 'locked') return showLockNote(ctx, b);
      ctx.go(`repaso-${b.dataset.id}`);
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
    gallery: (b) => {
      ctx.audio.sfx('tap');
      ctx.go(`galeria-${b.dataset.id}`);
    },
    detail: (b) => answerDetailCard(ctx, el, b),
  });
}

// --- Detalle del día: recorte ampliado de una obra ya aprendida y «¿De quién es?» ----------

function detailCard(ctx) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const day = ctx.dailyDay();
  const plan = planDetail(p, index, day);
  if (!plan) return '';
  const done = p.detail?.[day];
  return `<section class="card-detail" aria-labelledby="detail-h" data-day="${esc(day)}">
    ${done ? detailZoom(index, plan) : detailCrop(index, plan)}
    <div class="detail-body">
      <p class="card-kicker">Detalle del día</p>
      <h2 id="detail-h" class="detail-q">¿De quién es?</h2>
      ${done ? detailAnswered(index, plan, done) : `<div class="detail-options" role="group" aria-labelledby="detail-h">${plan.options.map((o) => `<button class="option detail-option" data-action="detail" data-id="${esc(o.id)}">${esc(o.label)}</button>`).join('')}</div>`}
    </div>
  </section>`;
}

// Fila plegable del bloque «Hoy»: un recorte pequeño de muestra; al abrirla, la tarjeta entera.
function detailRow(ctx, plan) {
  const { index } = ctx;
  const done = ctx.store.get().progress.detail?.[plan.day];
  const status = done ? (done.correct ? 'Bien visto' : 'Hecho') : '¿De quién es?';
  return `<details class="today-detail">
      <summary class="today-row">
        <span class="today-icon today-crop" aria-hidden="true">${detailCrop(index, plan, '')}</span>
        <span class="today-text"><span class="today-name">Detalle del día</span><span class="today-sub">${esc(status)}</span></span>
        <span class="today-more" aria-hidden="true">${icons.next(18)}</span>
      </summary>
      ${detailCard(ctx)}
    </details>`;
}

function detailCrop(index, plan, alt = 'Detalle de un cuadro') {
  const w = index.artwork(plan.artworkId);
  const { x, y, scale } = plan.crop;
  return `<div class="detail-crop" style="--cx:${x}%;--cy:${y}%;--cs:${scale}">
    <img src="${esc(w.img)}" alt="${esc(alt)}" width="${w.w}" height="${w.h}" loading="lazy" decoding="async">
  </div>`;
}

// Tras responder, el recorte abre el cuadro entero en el visor (antes no: lo desvelaría).
function detailZoom(index, plan) {
  const w = index.artwork(plan.artworkId);
  return `<button type="button" class="detail-zoom" data-zoom="${esc(w.id)}" aria-label="Ver en grande: ${esc(w.title)}">${detailCrop(index, plan, '')}${ZOOM_BADGE}</button>`;
}

function detailAnswered(index, plan, done) {
  const w = index.artwork(plan.artworkId);
  const a = index.artist(plan.answerId);
  return `<p class="detail-result ${done.correct ? 'is-ok' : 'is-bad'}">${done.correct ? `${icons.check(18)}<span>Es de ${esc(a.name)}</span>` : `${icons.eye(18)}<span>Es de ${esc(a.name)}</span>`}</p>
      <p class="detail-work"><em>${esc(w.title)}</em>${w.year ? ` · ${esc(w.year)}` : ''}</p>`;
}

function answerDetailCard(ctx, el, button) {
  const { index } = ctx;
  const card = button.closest('.card-detail');
  const day = card?.dataset.day;
  if (!card || day !== ctx.dailyDay()) return;
  const plan = planDetail(ctx.store.get().progress, index, day);
  let outcome = null;
  ctx.store.update((s) => {
    outcome = answerDetail(s.progress, plan, button.dataset.id, ctx.today());
    return outcome ? { ...s, progress: outcome.progress } : s;
  });
  if (!outcome) return;
  ctx.audio.sfx(outcome.correct ? 'correct' : 'wrong');
  const done = { correct: outcome.correct };
  const body = card.querySelector('.detail-body');
  body.querySelector('.detail-options').outerHTML = `${detailAnswered(index, plan, done)}${outcome.xp ? `<p class="detail-xp">+${outcome.xp} XP</p>` : ''}`;
  card.querySelector('.detail-crop')?.replaceWith(document.createRange().createContextualFragment(detailZoom(index, plan)));
  const top = el.querySelector('.topbar');
  if (top) top.outerHTML = topBar(ctx);
  const rowSub = card.closest('.today-detail')?.querySelector('.today-sub');
  if (rowSub) rowSub.textContent = outcome.correct ? 'Bien visto' : 'Hecho';
  const result = body.querySelector('.detail-result');
  result.setAttribute('tabindex', '-1');
  result.focus({ preventScroll: true });
  announce(`${outcome.correct ? 'Bien visto. ' : ''}${result.textContent.trim()}`);
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

function movementBlock(ctx, movement, i, prevMovement) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const status = movementStatus(p, index, movement.id);
  const sala = index.isSala(movement.id);
  const steps = index.stepsOf(movement.id);
  if (!steps.length) return '';
  const done = sala
    ? (salaStatus(p, index, movement.id) === 'mastered' ? 1 : 0)
    : index.stageArtists(movement.id).filter((a) => artistStatus(p, index, a.id) === 'mastered').length;
  const lockedNote = status === 'locked' && prevMovement ? `Termina ${esc(prevMovement.name)} para abrirlo` : '';
  const sealed = Boolean(p.medals[`movement-${movement.id}`]);
  const num = sealed
    ? `<span class="movement-num movement-seal" aria-hidden="true">${icons.laurel(26)}</span>`
    : `<span class="movement-num" aria-hidden="true">${ROMAN[i] || i + 1}</span>`;
  const titles = `${num}
      <span class="movement-titles">
        <span class="movement-name">${esc(movement.name)}</span>
        <span class="movement-period">${esc(movement.period)}${status !== 'locked' ? ` · ${done}/${steps.length}` : ''}</span>
      </span>${sealed ? '<span class="sr-only">, completo</span>' : ''}`;
  // Abierta, la cabecera vuelve a mostrar la intro del movimiento.
  const head = status === 'locked'
    ? `<h2 class="movement-head">${titles}</h2>`
    : `<h2 class="movement-head-wrap"><button class="movement-head is-button" data-action="intro" data-id="${esc(movement.id)}" aria-label="${esc(movement.name)}: ver presentación">${titles}<span class="movement-more" aria-hidden="true">${icons.next(18)}</span></button></h2>`;
  const gallery = isGalleryOpen(p, index, movement.id) ? galleryButton(ctx, movement) : '';
  const body = (sala ? salaButton(ctx, movement) : `${stageList(ctx, movement)}${hasMovementReview(index, movement.id) ? reviewButton(ctx, movement) : ''}`) + gallery;
  return `<li class="movement movement-${status}${sala ? ' movement-sala' : ''}${sealed ? ' is-sealed' : ''}" style="${accentStyle(movement.accent)}">
    ${head}
    ${status === 'locked' ? `<p class="movement-lockline">${icons.lock(16)}<span>${lockedNote}</span></p>` : `<p class="movement-blurb">${esc(movement.blurb)}</p>`}
    <ol class="stages">${body}</ol>
  </li>`;
}

// Pintores del movimiento; si tienen tramos (section), un subtítulo al empezar cada uno.
function stageList(ctx, movement) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const artists = index.stageArtists(movement.id);
  let html = '';
  artists.forEach((a, k) => {
    if (a.section && a.section !== artists[k - 1]?.section) {
      const group = artists.filter((x) => x.section === a.section);
      const got = group.filter((x) => artistStatus(p, index, x.id) === 'mastered').length;
      html += `<li class="stage-section" aria-hidden="false"><span class="stage-section-name">${esc(a.section)}</span><span class="stage-section-count">${got}/${group.length}</span></li>`;
    }
    html += stageButton(ctx, a);
  });
  return html;
}

function reviewButton(ctx, movement) {
  const p = ctx.store.get().progress;
  const reviewOpen = isReviewUnlocked(p, ctx.index, movement.id);
  const reviewBest = p.reviews[movement.id]?.best;
  const reviewMedal = (reviewBest || 0) >= 0.75;
  return `<li><button class="stage stage-review ${reviewMedal ? 'is-mastered' : reviewOpen ? 'is-available' : 'is-locked'}" data-action="review" data-id="${esc(movement.id)}" data-status="${reviewOpen ? 'open' : 'locked'}"
        aria-label="Repaso de ${esc(movement.name)}${reviewOpen ? '' : ', bloqueado'}" data-lock="Se abre al dominar a todos sus pintores">
        <span class="stage-dot">${reviewMedal ? icons.medal(20) : reviewOpen ? icons.repeat(20) : icons.lock(18)}</span>
        <span class="stage-text"><span class="stage-name">Repaso de ${esc(movement.name)}</span>
        <span class="stage-meta">${reviewBest ? `Mejor: ${Math.round(reviewBest * 100)}%` : reviewOpen ? 'Todos mezclados' : 'Domina a todos para abrirlo'}</span></span>
      </button><p class="lock-note"></p></li>`;
}

// Sala del movimiento dominado (galería): se abre junto al sello.
function galleryButton(ctx, movement) {
  const n = galleryWorks(ctx.store.get().progress, ctx.index, movement.id).length;
  return `<li><button class="stage stage-gallery is-mastered" data-action="gallery" data-id="${esc(movement.id)}" aria-label="Sala de ${esc(movement.name)}">
      <span class="stage-dot">${icons.laurel(26)}</span>
      <span class="stage-text"><span class="stage-name">Sala de ${esc(movement.name)}</span><span class="stage-meta">${n ? plural(n, 'obra', 'obras') : 'Sus cuadros, con calma'}</span></span>
    </button></li>`;
}

function salaButton(ctx, movement) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const status = salaStatus(p, index, movement.id);
  const info = p.salas?.[movement.id];
  const cover = salaCover(index, movement.id);
  const i = index.stepIndex('sala', movement.id);
  const prev = index.steps[i - 1];
  const prevName = prev ? (prev.type === 'sala' ? index.movement(prev.id).name : (index.artist(prev.id).short || index.artist(prev.id).name)) : '';
  const meta = {
    locked: 'Sala del movimiento',
    available: 'Empezar',
    started: `Por repasar · ${Math.round((info?.best || 0) * 100)}%`,
    mastered: 'Dominado',
  }[status];
  const stateLabel = { locked: 'bloqueado', available: 'disponible', started: 'por repasar', mastered: 'dominado' }[status];
  const dot = status === 'locked'
    ? icons.lock(18)
    : `${cover ? artFrame(cover, { cls: 'stage-thumb', alt: '', label: initials(movement.name), thumb: true }) : ''}${status === 'mastered' ? `<span class="stage-badge">${icons.check(14)}</span>` : ''}`;
  return `<li><button class="stage stage-sala is-${status}" data-action="sala" data-id="${esc(movement.id)}" data-status="${status}"
      data-lock="${prev ? `Se abre con la mitad de aciertos en ${esc(prevName)}` : ''}" aria-label="Conoce el movimiento ${esc(movement.name)}, ${stateLabel}">
      <span class="stage-dot">${dot}</span>
      <span class="stage-text"><span class="stage-name">Conoce el movimiento</span><span class="stage-meta">${esc(meta)}</span></span>
    </button><p class="lock-note"></p></li>`;
}

export function salaCover(index, movementId) {
  const works = salaLearnWorks(index, movementId);
  return works.slice().sort((a, b) => (b.fame || 0) - (a.fame || 0))[0] || null;
}

function stageButton(ctx, artist) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const status = artistStatus(p, index, artist.id);
  const info = p.artists[artist.id];
  const cover = coverOf(index, artist.id);
  const prevStep = index.steps[index.stepIndex('artist', artist.id) - 1];
  const prev = prevStep ? (prevStep.type === 'sala' ? { short: index.movement(prevStep.id).name, sala: true } : index.artist(prevStep.id)) : null;
  const years = artist.born && artist.died ? `${artist.born}–${artist.died}` : '';
  const meta = {
    locked: years,
    available: 'Empezar',
    started: `Por repasar · ${Math.round((info?.best || 0) * 100)}%`,
    mastered: 'Dominado',
  }[status];
  const stateLabel = { locked: 'bloqueado', available: 'disponible', started: 'por repasar', mastered: 'dominado' }[status];
  const dot = status === 'locked'
    ? icons.lock(18)
    : `${cover ? artFrame(cover, { cls: 'stage-thumb', alt: '', label: initials(artist.name), thumb: true }) : ''}${status === 'mastered' ? `<span class="stage-badge">${icons.check(14)}</span>` : ''}`;
  return `<li><button class="stage is-${status}" data-action="stage" data-id="${esc(artist.id)}" data-status="${status}"
      data-lock="${prev ? `Se abre con la mitad de aciertos en ${esc(prev.short || prev.name)}` : ''}" aria-label="${esc(artist.name)}, ${stateLabel}">
      <span class="stage-dot">${dot}</span>
      <span class="stage-text"><span class="stage-name">${esc(artist.name)}</span><span class="stage-meta">${esc(meta)}</span></span>
    </button><p class="lock-note"></p></li>`;
}

function showLockNote(ctx, button) {
  const note = button.parentElement.querySelector('.lock-note');
  if (!note) return;
  note.textContent = button.dataset.lock || 'Aún bloqueado';
  note.classList.add('is-visible');
  announce(note.textContent);
  clearTimeout(note._t);
  note._t = setTimeout(() => note.classList.remove('is-visible'), 2600);
}

export { coverOf };

export function initials(name) {
  return String(name).split(/\s+/).filter((w) => /^[A-ZÁÉÍÓÚÑ]/.test(w)).slice(0, 2).map((w) => w[0]).join('');
}

export function scrollToCurrent(el) {
  const target = $('.stage.is-available:not(.stage-review)', el) || $('.stage.is-started', el);
  if (target && target.getBoundingClientRect().top > window.innerHeight * 0.8) {
    target.scrollIntoView({ block: 'center' });
  }
}
