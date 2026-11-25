// Flujos de juego: etapa de pintor, sala de movimiento, intro de movimiento, repasos,
// reto diario, reto de un amigo y ronda retomada.

import { artistLink } from '../artist-link.js';
import { esc, onAction, accentStyle, defaultAccent, focusHeading, announce, $, $$ } from '../dom.js';
import { icons } from '../icons.js';
import { artFrame } from '../art.js';
import { runLesson } from './lesson.js';
import { renderResult, copyText } from './result.js';
import { playEra } from '../audio-bridge.js';
import { randomSeed } from '../../engine/rng.js';
import { planStage, planMovementReview, planSrsReview, planReview5, planSala, salaLearnWorks, QUICK_REVIEW } from '../../engine/planner.js';
import { planDaily, planFree, planWeekly, planChallenge, dailyGrid, shareText } from '../../engine/daily.js';
import { encodeChallenge } from '../../engine/challenge.js';
import { salaStatus, isReviewUnlocked, needsIntro, isPathMastered, unseenArtists, isKnownArtist } from '../../engine/progress.js';
import { finishRound } from '../../engine/finish.js';
import { seenWorks } from '../../engine/levels.js';
import { playStatus } from '../../engine/branches.js';
import { falladoQuestion } from '../../engine/fallados.js';
import { contrabandWork, review5Works, hasReview5, REVIEW5_MIN, REVIEW5_NAME } from '../../engine/review.js';
import { isoWeek } from '../../engine/dates.js';
import { mainTrait } from '../../engine/feedback.js';
import { eyeLabel } from './medals.js';
import { dueKeys } from '../../engine/srs.js';
import { makeSession, withSession, clearSession } from '../../state/session.js';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

// Enlace que no lleva a ningún sitio (o a algo aún cerrado): aviso breve y al inicio.
function leave(ctx, message = 'Ese enlace no vale') {
  ctx.toast(message);
  ctx.go('inicio', { replace: true });
}

function currentRoute() {
  return String(location.hash || '').replace(/^#/, '') || 'inicio';
}

function complete(ctx, result) {
  const today = ctx.today();
  let outcome = null;
  ctx.store.update((s) => {
    outcome = finishRound(s.progress, ctx.index, result, today, { goal: s.settings.dailyGoal });
    return clearSession({ ...s, progress: outcome.progress });
  });
  return outcome;
}

function planMeta(plan) {
  return { kind: plan.kind, seed: plan.seed, artistId: plan.artistId, movementId: plan.movementId, date: plan.date, week: plan.week };
}

// Rondas que no llevan al final un cuadro fallado antes: los retos con un amigo y el semanal (iguales
// para todos) y el repaso de 5 (ya lleva los fallados entre sus preguntas).
const NO_EXTRA = new Set(['challenge', 'weekly', 'review5']);

function falladoExtras(ctx, kind, plan) {
  if (NO_EXTRA.has(kind)) return [];
  const p = ctx.store.get().progress;
  const q = falladoQuestion(p, ctx.index, plan.questions, plan.seed || plan.date || 1, (w) => isKnownArtist(p, ctx.index, w.artistId));
  return q ? [q] : [];
}

// Ejecuta una ronda y la guarda tras cada respuesta para poder retomarla (state/session.js).
function play(ctx, el, opts) {
  const { plan, accent, title, kind, extra = {}, friendScore = null, shareTopic = '', resume = null, more = null } = opts;
  const meta = { route: opts.route || currentRoute(), title, accent, kind, extra, friendScore, shareTopic, plan: planMeta(plan) };
  const questions = resume ? resume.round.queue.map((it) => it.q) : plan.questions;
  return runLesson(ctx, el, {
    questions,
    extras: resume ? [] : falladoExtras(ctx, kind, plan),
    accent,
    seed: plan.seed || plan.date || 1,
    label: title,
    interlude: plan.kind === 'sala',
    resume,
    onSave: (snapshot) => ctx.store.update((s) => withSession(s, makeSession(meta, snapshot, Date.now()))),
    onQuit: () => {
      ctx.store.update(clearSession);
      ctx.go('inicio', { replace: true });
    },
    onBackAfterDone: () => ctx.go('inicio', { replace: true }),
    onDone: (summary) => {
      const outcome = complete(ctx, { kind, ...extra, answers: summary.answers, firstTry: summary.firstTry, challenge: friendScore != null });
      // Después de cualquier ronda, el repaso de 5 si hay cuadros para él; si no, «Repasar más» tras el rápido.
      const review5 = friendScore == null && hasReview5(ctx.store.get().progress, ctx.index, ctx.today());
      const moreReview = !review5 && typeof more === 'function' && more();
      renderResult(ctx, el, {
        plan, outcome, title, accent, firstTry: summary.firstTry, friendScore, shareTopic, branchId: extra.branchId,
        more: review5 ? { label: REVIEW5_NAME, to: 'repaso5' } : moreReview ? { label: 'Repasar más', to: 'repaso' } : null,
      });
    },
  });
}

// --- Ronda retomada -----------------------------------------------------------

export function resumeSession(ctx, el, session) {
  const { index } = ctx;
  const plan = session.plan;
  const era = plan.artistId && index.movementOf(plan.artistId) ? index.movementOf(plan.artistId).era
    : plan.movementId && index.movement(plan.movementId) ? index.movement(plan.movementId).era : 'menu';
  playEra(era);
  ctx.setCleanup(play(ctx, el, {
    route: session.route,
    plan,
    accent: session.accent || defaultAccent(),
    title: session.title,
    kind: session.kind,
    extra: session.extra,
    friendScore: session.friendScore,
    shareTopic: session.shareTopic,
    resume: { round: session.round, answers: session.answers, xpLive: session.xpLive, freshIntroShown: session.freshIntroShown },
  }));
  announce('Seguimos donde lo dejaste');
}

// --- Intro de movimiento --------------------------------------------------------

export function introWorks(index, movementId) {
  if (index.isSala(movementId)) return salaLearnWorks(index, movementId).slice(0, 3);
  const picks = [];
  for (const a of index.stageArtists(movementId)) {
    const w = index.learnWorks(a.id).slice().sort((x, y) => (y.fame || 0) - (x.fame || 0))[0];
    if (w) picks.push(w);
    if (picks.length === 3) break;
  }
  if (picks.length < 3) {
    const rest = index.worksOfMovement(movementId)
      .filter((w) => !picks.includes(w) && !picks.some((p) => p.artistId === w.artistId))
      .sort((x, y) => (y.fame || 0) - (x.fame || 0));
    picks.push(...rest.slice(0, 3 - picks.length));
  }
  return picks;
}

// mode 'first': se ve al entrar por primera vez y el botón continúa; 'again': desde el mapa.
export function renderIntro(ctx, el, movementId, { mode = 'again', onEnter = null } = {}) {
  const { index } = ctx;
  const movement = index.movement(movementId);
  if (!movement || !index.visibleMovements.includes(movement)) return leave(ctx);
  const n = index.visibleMovements.indexOf(movement);
  const works = introWorks(index, movementId);
  const order = works.length === 3 ? [works[1], works[0], works[2]] : works;
  const wall = order.map((w, i) => `<span class="wall-item wall-${i}">${artFrame(w, { alt: '', eager: true, label: '', thumb: true, zoom: { group: 'intro' } })}</span>`).join('');
  playEra(movement.era);
  el.innerHTML = `<div class="welcome intro" style="${accentStyle(movement.accent)}">
    <main class="welcome-body" id="main">
      <div class="wall">${wall}</div>
      <p class="kicker intro-kicker"><span class="intro-num">${ROMAN[n] || n + 1}</span>${esc(movement.period)}</p>
      <h1 class="welcome-title welcome-title-sm">${esc(movement.name)}</h1>
      <p class="welcome-line">${esc(movement.blurb)}</p>
      <button class="btn btn-primary btn-wide" data-action="enter" data-primary>${mode === 'first' ? 'Entrar' : 'Volver al camino'}</button>
    </main>
  </div>`;
  focusHeading(el);
  const off = onAction(el, {
    enter: () => {
      ctx.audio.sfx('tap');
      off();
      if (mode === 'first') {
        const today = ctx.today();
        ctx.store.update((s) => ({ ...s, progress: { ...s.progress, intros: { ...(s.progress.intros || {}), [movementId]: today } } }));
        if (onEnter) return onEnter();
      }
      ctx.go('inicio');
    },
  });
}

// --- Pantalla «Conoce…» compartida (pintor y sala) -------------------------------

function learnScreen(ctx, el, { cls = '', titleArtistId = '', accent, barTitle, kicker, title, meta, badge = '', works, caption, aside, carouselLabel, onPractice }) {
  const slides = works.map((w, i) => `<figure class="slide" role="group" aria-roledescription="diapositiva" aria-label="${i + 1} de ${works.length}">
      ${artFrame(w, { alt: caption(w).alt, eager: i === 0, cls: 'art-slide', label: w.title, zoom: { group: 'learn' } })}
      <figcaption><span class="slide-title">${esc(w.title)}</span><span class="slide-year">${esc(caption(w).sub)}</span>${w.look ? `<span class="slide-look">${esc(w.look)}</span>` : ''}</figcaption>
    </figure>`).join('');

  // La pista va antes del carrusel y las flechas viven en la barra de abajo: nada de lo que se
  // enseña queda bajo la barra fija de «Practicar».
  el.innerHTML = `<div class="learn ${cls}" style="${accentStyle(accent)}">
    <div class="lesson-bar">
      <button class="icon-btn" data-action="leave" aria-label="Volver al camino">${icons.close(22)}</button>
      <p class="lesson-bar-title">${esc(barTitle)}</p>
    </div>
    <main class="learn-body" id="main">
      <p class="kicker">${esc(kicker)}</p>
      <h1 class="learn-title">${titleArtistId ? artistLink(titleArtistId, title, 'learn-artist') : esc(title)}</h1>
      <p class="learn-meta">${esc(meta)}</p>
      ${badge}
      ${aside}
      <section class="carousel" id="learn-carousel" aria-roledescription="carrusel" aria-label="${esc(carouselLabel)}">
        <div class="carousel-track" tabindex="0" aria-label="Desliza o usa las flechas">${slides}</div>
      </section>
    </main>
    <div class="learn-cta">
      <div class="carousel-controls" role="group" aria-label="Obras" aria-controls="learn-carousel">
        <button class="icon-btn" data-action="prev" aria-label="Obra anterior">${icons.prev(22)}</button>
        <span class="carousel-count" aria-live="polite">1 / ${works.length}</span>
        <button class="icon-btn" data-action="next" aria-label="Obra siguiente">${icons.next(22)}</button>
      </div>
      <button class="btn btn-primary" data-action="practice" data-primary>Practicar</button>
    </div>
  </div>`;

  const track = $('.carousel-track', el);
  const count = $('.carousel-count', el);
  const slidesEls = $$('.slide', el);
  const current = () => Math.round(track.scrollLeft / Math.max(1, slidesEls[0].offsetWidth + gap(track)));
  const goTo = (i) => {
    const k = Math.max(0, Math.min(slidesEls.length - 1, i));
    track.scrollTo({ left: slidesEls[k].offsetLeft - slidesEls[0].offsetLeft, behavior: document.documentElement.classList.contains('reduce-motion') ? 'auto' : 'smooth' });
  };
  const sync = () => {
    const i = Math.min(slidesEls.length - 1, current());
    count.textContent = `${i + 1} / ${slidesEls.length}`;
    $('[data-action="prev"]', el).disabled = i === 0;
    $('[data-action="next"]', el).disabled = i === slidesEls.length - 1;
  };
  track.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
  track.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowRight') { goTo(current() + 1); ev.preventDefault(); }
    if (ev.key === 'ArrowLeft') { goTo(current() - 1); ev.preventDefault(); }
  });
  sync();
  focusHeading(el);
  // Hueco inferior = altura real de la barra (cambia con el zoom de texto o al partirse en dos filas).
  const cta = $('.learn-cta', el);
  const body = $('.learn-body', el);
  const fit = () => body.style.setProperty('--cta-h', `${Math.ceil(cta.getBoundingClientRect().height)}px`);
  fit();
  let ro = null;
  if (typeof ResizeObserver === 'function') {
    ro = new ResizeObserver(fit);
    ro.observe(cta);
  }

  const offLearn = onAction(el, {
    prev: () => { ctx.audio.sfx('tap'); goTo(current() - 1); },
    next: () => { ctx.audio.sfx('tap'); goTo(current() + 1); },
    leave: () => { ctx.audio.sfx('tap'); ctx.go('inicio'); },
    practice: () => {
      ctx.audio.sfx('tap');
      offLearn();
      if (ro) ro.disconnect();
      onPractice();
    },
  });
}

function gap(track) {
  return parseFloat(getComputedStyle(track).columnGap) || 0;
}

// Si es la primera vez en el movimiento, antes se muestra su intro.
// Las ramas-movimiento (Gótico, Estampa japonesa) no tienen presentación propia: se entra directo.
function withIntro(ctx, el, movementId, show) {
  const visible = ctx.index.visibleMovements.some((m) => m.id === movementId);
  if (visible && needsIntro(ctx.store.get().progress, ctx.index, movementId)) {
    return renderIntro(ctx, el, movementId, { mode: 'first', onEnter: show });
  }
  return show();
}

// Historia al empezar un nivel (una vez, saltable): después se muestra lo que sigue. Sin historia, de seguido.
function withStory(ctx, el, artistId, level, show) {
  import('../story-viewer.js')
    .then((m) => m.playStory(ctx, artistId, level))
    .catch((err) => { console.error(err); })
    .then(() => { if (el.isConnected) show(); });
}

// --- Etapa de pintor -------------------------------------------------------

// branchId: rama desde la que se entra (#etapa-<pintor>--<rama>); el resultado sigue en ella.
export function renderStage(ctx, el, artistId, branchId = '') {
  const { index } = ctx;
  const artist = index.artist(artistId);
  const status = artist ? playStatus(ctx.store.get().progress, index, artistId) : null;
  if (!status) return leave(ctx);
  if (status === 'locked') return leave(ctx, 'Aún no está abierta');
  const movement = index.movement(artist.movementId);
  withIntro(ctx, el, movement.id, () => withStory(ctx, el, artistId, 1, () => {
    // Una de las preguntas de repaso, de un pintor dominado hace días (sin anunciarlo).
    const review = contrabandWork(ctx.store.get().progress, index, artistId, ctx.today());
    const seen = [...seenWorks(ctx.store.get().progress, artistId)];
    const plan = planStage(index, artistId, randomSeed(), { review: review ? [review] : [], seen });
    playEra(movement.era);
    const years = artist.born && artist.died ? `${artist.born}–${artist.died}` : '';
    learnScreen(ctx, el, {
      accent: movement.accent,
      barTitle: movement.name,
      kicker: 'Conoce a',
      title: artist.name,
      titleArtistId: artist.id,
      meta: [artist.country, years].filter(Boolean).join(' · '),
      badge: (() => { const e = eyeLabel(ctx, artistId); return e ? `<p class="eye-line">${icons.eye(16)}<span>${esc(e.text)}</span></p>` : ''; })(),
      works: plan.learn,
      caption: (w) => ({ alt: `${w.title}, de ${artist.name}`, sub: w.year || '' }),
      aside: artist.hint ? `<aside class="hint"><span class="hint-icon">${icons.eye(20)}</span><p>${esc(artist.hint)}</p></aside>` : '',
      carouselLabel: `Obras de ${artist.short || artist.name}`,
      onPractice: () => ctx.setCleanup(play(ctx, el, { plan, accent: movement.accent, title: artist.name, kind: 'stage', extra: branchId ? { artistId, branchId } : { artistId }, shareTopic: artist.name })),
    });
  }));
}

// --- Sala de movimiento (sin pintores con etapa) ---------------------------------

export function renderSala(ctx, el, movementId) {
  const { index } = ctx;
  const movement = index.movement(movementId);
  if (!movement || !index.isSala(movementId)) return leave(ctx);
  if (salaStatus(ctx.store.get().progress, index, movementId) === 'locked') return leave(ctx, 'Aún no está abierta');
  withIntro(ctx, el, movementId, () => {
    const plan = planSala(index, movementId, randomSeed());
    if (!plan || plan.questions.length < 4) return ctx.go('inicio');
    playEra(movement.era);
    const traits = (movement.traits || []).map((t) => `<li>${esc(t)}</li>`).join('');
    learnScreen(ctx, el, {
      cls: 'learn-sala',
      accent: movement.accent,
      barTitle: 'Sala',
      kicker: 'Conoce el movimiento',
      title: movement.name,
      meta: movement.period,
      works: plan.learn,
      caption: (w) => {
        const a = index.artist(w.artistId);
        return { alt: `${w.title}, de ${a.name}`, sub: [a.name, w.year].filter(Boolean).join(' · ') };
      },
      aside: `<aside class="hint hint-sala"><span class="hint-icon">${icons.eye(20)}</span><div><p>${esc(movement.blurb)}</p>${traits ? `<ul class="traits">${traits}</ul>` : ''}</div></aside>`,
      carouselLabel: `Obras de ${movement.name}`,
      onPractice: () => ctx.setCleanup(play(ctx, el, { plan, accent: movement.accent, title: movement.name, kind: 'sala', extra: { movementId }, shareTopic: movement.name })),
    });
  });
}

// --- Repaso de movimiento ----------------------------------------------------

export function renderMovementReview(ctx, el, movementId) {
  const { index } = ctx;
  const movement = index.movement(movementId);
  if (!movement) return leave(ctx);
  if (!isReviewUnlocked(ctx.store.get().progress, index, movementId)) return leave(ctx, 'Aún no está abierto');
  const plan = planMovementReview(index, movementId, randomSeed());
  if (!plan.questions.length) return ctx.go('inicio');
  playEra(movement.era);
  ctx.setCleanup(play(ctx, el, { plan, accent: movement.accent, title: `Repaso de ${movement.name}`, kind: 'review', extra: { movementId }, shareTopic: movement.name }));
}

// --- Repaso espaciado (completo o rápido de 3 preguntas desde el inicio) ----------------

export function renderSrsReview(ctx, el, { quick = false } = {}) {
  const { index } = ctx;
  const due = dueKeys(ctx.store.get().progress.srs, ctx.today());
  const plan = planSrsReview(index, due, randomSeed(), quick ? QUICK_REVIEW : undefined);
  if (!plan.questions.length) return leave(ctx, 'Hoy no hay nada que repasar');
  playEra('menu');
  ctx.setCleanup(play(ctx, el, {
    plan, accent: defaultAccent(), title: quick ? 'Repaso rápido' : 'Repaso', kind: 'srs',
    more: quick ? () => dueKeys(ctx.store.get().progress.srs, ctx.today()).length > 0 : null,
  }));
}

// --- Repaso de 5: cuadros fallados, vencidos y antiguos de pintores dominados ------------------

export function renderReview5(ctx, el) {
  const ids = review5Works(ctx.store.get().progress, ctx.index, ctx.today());
  const plan = planReview5(ctx.index, ids, randomSeed());
  if (ids.length < REVIEW5_MIN || plan.questions.length < REVIEW5_MIN) return leave(ctx, 'Hoy no hay nada que repasar');
  playEra('menu');
  ctx.setCleanup(play(ctx, el, { plan, accent: defaultAccent(), title: REVIEW5_NAME, kind: 'review5' }));
}

// --- Reto diario ------------------------------------------------------------

export function renderDaily(ctx, el) {
  const { index } = ctx;
  const today = ctx.dailyDay();
  const plan = planDaily(index, today);
  const done = ctx.store.get().progress.daily[today];
  playEra('menu');
  if (done) return renderDailyDone(ctx, el, plan, done);
  if (plan.questions.length < 4) return ctx.go('inicio');
  ctx.setCleanup(play(ctx, el, { plan, accent: defaultAccent(), title: 'Reto diario', kind: 'daily', extra: { date: today } }));
}

// --- Reto semanal (camino dominado): 15 preguntas de todo el camino, iguales para todos ---------

export function weekKey(ctx) {
  return isoWeek(ctx.dailyDay()).key;
}

export function renderWeekly(ctx, el) {
  const { index } = ctx;
  if (!isPathMastered(ctx.store.get().progress, index)) return leave(ctx, 'Se abre al dominar todo el camino');
  const week = weekKey(ctx);
  const plan = planWeekly(index, week);
  const done = ctx.store.get().progress.weekly?.[week];
  playEra('menu');
  if (done) return renderDailyDone(ctx, el, plan, done);
  if (plan.questions.length < 4) return ctx.go('inicio');
  ctx.setCleanup(play(ctx, el, { plan, accent: defaultAccent(), title: 'Reto semanal', kind: 'weekly', extra: { week } }));
}

export function gridTitle(plan) {
  if (plan.kind === 'weekly') return `Sfumato · Reto semanal ${plan.week.slice(6)}`;
  return `Sfumato · Reto diario ${plan.date.slice(8)}/${plan.date.slice(5, 7)}`;
}

function renderDailyDone(ctx, el, plan, done) {
  const firstTry = done.firstTry || [];
  const weekly = plan.kind === 'weekly';
  el.innerHTML = `<div class="result">
    <main class="result-body" id="main">
      <p class="result-kicker">${weekly ? 'Reto semanal' : 'Reto diario'}</p>
      <h1 class="result-title">${weekly ? 'Hecho esta semana' : 'Hecho por hoy'}</h1>
      <dl class="tally"><div><dt>Aciertos</dt><dd>${done.score}/${done.total}</dd></div></dl>
      <div class="grid-row" role="img" aria-label="${done.score} aciertos de ${done.total}">${firstTry.map((ok) => `<span class="sq ${ok ? 'is-ok' : ''}"></span>`).join('')}</div>
      <p class="result-note">${weekly ? 'Hay uno nuevo cada lunes.' : 'Hay uno nuevo cada día.'}</p>
      <div class="result-actions">
        <button class="btn btn-primary btn-wide" data-action="share">${icons.copy(20)}<span>Copiar resultado</span></button>
        <button class="btn btn-secondary btn-wide" data-action="home">Volver al camino</button>
        <p class="copy-status" role="status"></p>
        <textarea class="copy-fallback" readonly hidden aria-label="Texto para compartir" rows="4"></textarea>
      </div>
    </main>
  </div>`;
  focusHeading(el);
  onAction(el, {
    home: () => { ctx.audio.sfx('tap'); ctx.go('inicio'); },
    share: () => {
      ctx.audio.sfx('tap');
      const token = weekly ? `w${plan.week.replace('-W', '')}` : `d${plan.date.replace(/-/g, '')}`;
      const url = `${location.href.split('#')[0]}#${encodeChallenge(token, done.score)}`;
      copyText(el, shareText({ title: gridTitle(plan), score: done.score, total: done.total, grid: dailyGrid(firstTry), url }));
    },
  });
}

// --- Reto de un amigo -------------------------------------------------------

export function renderChallenge(ctx, el, challenge) {
  const { index } = ctx;
  const plan = planChallenge(index, challenge);
  if (!plan || plan.questions.length < 4) {
    ctx.store.update((s) => (s.onboarded ? s : { ...s, onboarded: true }));
    return leave(ctx);
  }
  const total = plan.questions.length;
  const topic = plan.kind === 'stage' ? index.artist(plan.artistId).name
    : plan.kind === 'review' || plan.kind === 'sala' ? index.movement(plan.movementId).name
      : plan.kind === 'daily' ? 'Reto diario' : plan.kind === 'weekly' ? 'Reto semanal' : 'Ronda variada';
  const accent = plan.kind === 'stage' ? index.movementOf(plan.artistId).accent
    : plan.kind === 'review' || plan.kind === 'sala' ? index.movement(plan.movementId).accent : defaultAccent();
  const friendScore = Math.min(challenge.score, total);
  // Reto de todo el camino con pintores que aún no ha visto: se avisa (sin bloquear) y esas preguntas
  // no cuentan para su precisión.
  const unseen = ['daily', 'weekly', 'general'].includes(plan.kind)
    && unseenArtists(ctx.store.get().progress, index, plan.questions).length > 0;
  el.innerHTML = `<div class="welcome welcome-duel" style="${accentStyle(accent)}">
    <main class="welcome-body" id="main">
      <span class="duel-badge">${icons.duel(30)}</span>
      <p class="kicker">Te han retado</p>
      <h1 class="welcome-title welcome-title-sm">${friendScore} de ${total}</h1>
      <p class="welcome-line">Tu amigo acertó ${friendScore} en «${esc(topic)}». ¿Lo superas?</p>
      ${unseen ? `<p class="welcome-note">${icons.eye(18)}<span>Salen pintores que aún no has visto</span></p>` : ''}
      <button class="btn btn-primary btn-wide" data-action="accept" data-primary>Aceptar el reto</button>
      <button class="btn btn-ghost btn-wide" data-action="home">Ahora no</button>
    </main>
  </div>`;
  focusHeading(el);
  announce(`Te han retado: ${friendScore} de ${total}`);
  const offLanding = onAction(el, {
    home: () => {
      ctx.audio.unlock();
      ctx.store.update((s) => (s.onboarded ? s : { ...s, onboarded: true }));
      ctx.go('inicio');
    },
    accept: () => {
      offLanding();
      ctx.audio.unlock();
      ctx.audio.sfx('tap');
      ctx.store.update((s) => (s.onboarded ? s : { ...s, onboarded: true }));
      const era = plan.kind === 'stage' ? index.movementOf(plan.artistId).era : plan.kind === 'review' || plan.kind === 'sala' ? index.movement(plan.movementId).era : 'menu';
      playEra(era);
      const prog = ctx.store.get().progress;
      const isTodayDaily = plan.kind === 'daily' && plan.date === ctx.dailyDay() && !prog.daily[plan.date];
      // El semanal de esta semana cuenta como propio si el camino está dominado y aún no se ha jugado.
      const isThisWeekly = plan.kind === 'weekly' && plan.week === weekKey(ctx) && !prog.weekly?.[plan.week] && isPathMastered(prog, index);
      const kind = isTodayDaily ? 'daily' : isThisWeekly ? 'weekly' : 'challenge';
      const extra = { ...(isTodayDaily ? { date: plan.date } : isThisWeekly ? { week: plan.week } : {}), ...(unseen ? { unseen: true } : {}) };
      const start = () => ctx.setCleanup(play(ctx, el, {
        plan, accent, title: `Reto · ${topic}`, kind, extra, friendScore, shareTopic: topic,
      }));
      if (needsLook(ctx, plan)) return lookFirst(ctx, el, plan, accent, start);
      return start();
    },
  });
}

// Reto de una etapa o sala que aún no se ha jugado: antes, en qué fijarse.
function needsLook(ctx, plan) {
  const p = ctx.store.get().progress;
  if (plan.kind === 'stage') return !(p.artists[plan.artistId]?.plays > 0);
  if (plan.kind === 'sala') return !(p.salas?.[plan.movementId]?.plays > 0);
  return false;
}

function lookFirst(ctx, el, plan, accent, start) {
  const { index } = ctx;
  let name;
  let works;
  let line;
  if (plan.kind === 'stage') {
    const a = index.artist(plan.artistId);
    name = a.name;
    works = (plan.learn || index.learnWorks(a.id)).slice(0, 4);
    line = mainTrait(a);
  } else {
    const m = index.movement(plan.movementId);
    name = m.name;
    works = (plan.learn || salaLearnWorks(index, m.id)).slice(0, 3);
    line = m.blurb || '';
  }
  const order = works.length === 3 ? [works[1], works[0], works[2]] : works;
  const wall = order.map((w, i) => `<span class="wall-item wall-${i}">${artFrame(w, { alt: '', eager: true, label: '', thumb: true, zoom: { group: 'look' } })}</span>`).join('');
  el.innerHTML = `<div class="welcome look-first" style="${accentStyle(accent)}">
    <main class="welcome-body" id="main">
      <div class="wall wall-sm">${wall}</div>
      <p class="kicker">Antes de empezar</p>
      <h1 class="welcome-title welcome-title-sm">${esc(name)}</h1>
      ${line ? `<aside class="hint hint-center"><span class="hint-icon">${icons.eye(20)}</span><p>${esc(line)}</p></aside>` : ''}
      <button class="btn btn-primary btn-wide" data-action="go" data-primary>Empezar</button>
    </main>
  </div>`;
  focusHeading(el);
  const off = onAction(el, {
    go: () => {
      off();
      ctx.audio.sfx('tap');
      start();
    },
  });
}

// --- Ronda libre (camino dominado): 10 preguntas mezcladas de todo el camino ------------

export function renderFree(ctx, el) {
  const { index } = ctx;
  const plan = planFree(index, randomSeed());
  if (!isPathMastered(ctx.store.get().progress, index) || plan.questions.length < 4) return leave(ctx, 'Se abre al dominar todo el camino');
  playEra('menu');
  ctx.setCleanup(play(ctx, el, { plan, accent: defaultAccent(), title: 'Ronda libre', kind: 'general', shareTopic: 'ronda libre' }));
}

