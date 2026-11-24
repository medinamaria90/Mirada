// Fin de ronda: aciertos, XP, medallas, racha, desbloqueos y acciones para compartir.

import { esc, onAction, accentStyle, announce, focusHeading, prefersReducedMotion, $ } from '../dom.js';
import { icons } from '../icons.js';
import { artFrame, coverOf } from '../art.js';
import { goalRing } from '../shell.js';
import { levelFor, levelName, MASTERY, UNLOCK_MIN, isStepUnlocked } from '../../engine/progress.js';
import { mainTrait } from '../../engine/feedback.js';
import { weekOf } from '../../engine/dates.js';
import { encodeChallenge, tokenForRound } from '../../engine/challenge.js';
import { shareText, dailyGrid } from '../../engine/daily.js';
import { medalBadge } from './medals.js';
import { medalInfo } from '../../engine/medal-info.js';
import { daySummary, listNames, CLOSURE_THUMBS } from '../../engine/closure.js';

export function headline(accuracy) {
  if (accuracy >= 1) return 'Impecable';
  if (accuracy >= 0.75) return 'Muy buen ojo';
  if (accuracy >= 0.5) return 'Vas cogiendo el estilo';
  return 'Se aprende mirando';
}

// Tarjeta pulsable (lleva a algún sitio) o fija (sin aspecto de botón).
function eventCard({ icon, kicker, title, to = null, cls = '' }) {
  const body = `<span class="event-icon">${icon}</span><span class="event-text"><span class="event-kicker">${esc(kicker)}</span><span class="event-title">${esc(title)}</span></span>`;
  if (!to) return `<section class="event ${cls}">${body}</section>`;
  return `<button class="event event-link ${cls}" data-action="go" data-to="${esc(to)}">${body}<span class="event-go" aria-hidden="true">${icons.next(20)}</span></button>`;
}

function stepRoute(index, step) {
  if (!step) return null;
  return step.type === 'sala' ? `sala-${step.id}` : `etapa-${step.id}`;
}

// opts: { plan, outcome, title, accent, friendScore?, firstTry, shareTopic?, primary?, onDone?, more? }
// more: { label, to } acción extra (p. ej. «Repasar más» tras el repaso rápido).
export function renderResult(ctx, el, opts) {
  const { index } = ctx;
  const { outcome, plan } = opts;
  const state = ctx.store.get();
  const p = state.progress;
  const level = levelFor(p.xp);
  const levelBefore = levelFor(Math.max(0, p.xp - outcome.xp));
  const firstTry = opts.firstTry;
  const token = tokenForRound(index, plan);
  const isDaily = plan.kind === 'daily' || plan.kind === 'weekly';
  const events = outcome.events;
  const medals = events.filter((e) => e.type === 'medal');
  const levelUp = events.find((e) => e.type === 'levelup');
  const streak = events.find((e) => e.type === 'streak');
  const unlock = events.find((e) => e.type === 'unlock');
  const reviewUnlock = events.find((e) => e.type === 'review-unlock');
  const goal = events.find((e) => e.type === 'goal');
  const completed = events.find((e) => e.type === 'movement-complete');
  // El sello principal: el del pintor dominado o, si no, el del movimiento.
  const heroMedal = medals.find((m) => m.id.startsWith('artist-')) || medals.find((m) => m.id.startsWith('movement-'));
  const otherMedals = medals.filter((m) => m !== heroMedal
    && !(completed && m.id === `movement-${completed.movementId}`)
    && !(goal && m.id === 'goal-1'));

  const blocks = [];
  if (opts.friendScore != null) {
    const mine = outcome.score;
    const theirs = opts.friendScore;
    const verdict = mine > theirs ? 'Ganas tú' : mine < theirs ? 'Gana tu amigo' : 'Empate';
    blocks.push(`<section class="duel" aria-label="Comparación">
      <div class="duel-side"><span class="duel-num">${mine}</span><span class="duel-who">Tú</span></div>
      <span class="duel-vs">${verdict}</span>
      <div class="duel-side"><span class="duel-num">${theirs}</span><span class="duel-who">Tu amigo</span></div>
    </section>`);
  }
  if (isDaily) {
    blocks.push(`<div class="grid-row" role="img" aria-label="${outcome.score} aciertos de ${outcome.total}">${firstTry.map((ok) => `<span class="sq ${ok ? 'is-ok' : ''}"></span>`).join('')}</div>`);
  }
  // Cierre de etapa: lo aprendido hoy (obra + rasgo del pintor), solo con la mitad de aciertos o
  // más; con menos, una frase de ánimo y «Repetir» como acción principal. Informativo, no pulsable.
  const low = (plan.kind === 'stage' || plan.kind === 'sala') && outcome.accuracy < UNLOCK_MIN;
  if (low) {
    blocks.push('<p class="result-cheer">Vuelve a mirar sus cuadros: a la segunda se ve más.</p>');
  } else if (plan.kind === 'stage' && plan.artistId && index.artist(plan.artistId)) {
    const a = index.artist(plan.artistId);
    const w = coverOf(index, a.id);
    const trait = mainTrait(a);
    if (w && trait) {
      blocks.push(`<section class="learned" aria-label="Hoy has aprendido">
        ${artFrame(w, { cls: 'learned-art', alt: `${w.title}, de ${a.name}`, label: w.title, thumb: true, zoom: {} })}
        <div class="learned-text"><p class="event-kicker">Hoy has aprendido</p><p class="learned-name">${esc(a.name)}</p><p class="learned-trait">${esc(trait)}</p></div>
      </section>`);
    }
  }
  if (goal) {
    blocks.push(eventCard({ icon: goalRing(goal.goal, goal.goal, 30), kicker: 'Meta del día', title: 'Cumplida', to: 'perfil', cls: 'event-goal' }));
    // El pintor de la etapa ya sale arriba en «Hoy has aprendido»: no se repite.
    blocks.push(dayDone(ctx, p, plan.kind === 'stage' && !low ? plan.artistId : null));
  }
  if (completed && index.movement(completed.movementId)) {
    const m = index.movement(completed.movementId);
    blocks.push(`<section class="event event-seal" style="${accentStyle(m.accent)}">${medalBadge(ctx, `movement-${m.id}`, true)}<span class="event-text"><span class="event-kicker">Movimiento completo</span><span class="event-title">${esc(m.name)}</span></span></section>`);
  }
  if (levelUp) {
    blocks.push(eventCard({ icon: icons.gem(22), kicker: 'Nuevo nivel', title: levelName(levelUp.level), to: 'perfil', cls: 'event-level' }));
  }
  for (const m of otherMedals) {
    const info = medalInfo(m.id, index);
    blocks.push(`<button class="event event-link event-medal" data-action="go" data-to="medallas">${medalBadge(ctx, m.id, true)}<span class="event-text"><span class="event-kicker">${esc(info.sub)}</span><span class="event-title">${esc(info.title)}</span></span><span class="event-go" aria-hidden="true">${icons.next(20)}</span></button>`);
  }
  if (unlock && !goal) {
    const a = unlock.artistId ? index.artist(unlock.artistId) : null;
    const m = unlock.movementId ? index.movement(unlock.movementId) : null;
    const isSala = unlock.step?.type === 'sala';
    const name = m ? m.name : a ? a.name : isSala ? index.movement(unlock.step.id)?.name : '';
    if (name) blocks.push(eventCard({ icon: icons.play(20), kicker: m ? 'Se abre un movimiento' : 'Siguiente etapa', title: name, to: stepRoute(index, unlock.step) }));
  }
  if (reviewUnlock && !goal && index.movement(reviewUnlock.movementId)) {
    blocks.push(eventCard({ icon: icons.repeat(22), kicker: 'Repaso disponible', title: index.movement(reviewUnlock.movementId).name, to: `repaso-${reviewUnlock.movementId}` }));
  }
  if (streak) blocks.push(weekStrip(ctx, streak.value, streak.grace));

  const roundMastered = outcome.mastered ?? outcome.accuracy >= MASTERY;
  const retry = (plan.kind === 'stage' || plan.kind === 'sala') && !roundMastered
    ? (plan.kind === 'stage' ? `etapa-${plan.artistId}` : `sala-${plan.movementId}`) : null;
  // Con menos de la mitad de aciertos lo primero es repetir (y la parada siguiente, si estaba
  // cerrada, sigue cerrada).
  const step = plan.kind === 'stage' ? { type: 'artist', id: plan.artistId } : plan.kind === 'sala' ? { type: 'sala', id: plan.movementId } : null;
  const nextOf = step ? index.steps[index.stepIndex(step.type, step.id) + 1] : null;
  const gated = Boolean(retry && nextOf && outcome.accuracy < UNLOCK_MIN && !isStepUnlocked(p, index, nextOf));
  // Cierre del día (meta cumplida): «Seguir» y, si la ronda se comparte, compartir; sin llamadas a
  // seguir jugando (repetir, más repaso, siguiente etapa: va en «La próxima vez»). Compartir se queda:
  // la meta por defecto se cumple con la primera ronda del día y el reto diario vive de su cuadrícula.
  // Con menos de la mitad de aciertos manda «Repetir» (y «Volver al camino»), también en el cierre.
  const closing = Boolean(goal);
  const blocked = Boolean(retry && low);
  // 75 % o más, pero sin acertar bastantes cuadros del propio pintor: aún no está dominado.
  const ownNote = outcome.ownShort && plan.artistId && index.artist(plan.artistId)
    ? `<p class="result-note">Para dominarlo, acierta más cuadros de ${esc(index.artist(plan.artistId).short || index.artist(plan.artistId).name)}</p>` : '';
  const shareLabel = isDaily ? 'Copiar resultado' : opts.friendScore != null ? 'Devolver el reto' : 'Retar a un amigo';
  const reduce = prefersReducedMotion();
  const fromPct = level.index === levelBefore.index ? Math.round(levelBefore.progress * 100) : 0;
  const toPct = Math.round(level.progress * 100);
  // Con poco que contar (p. ej. Ronda libre), todo junto y centrado: sin hueco en medio.
  el.innerHTML = `<div class="result ${heroMedal ? 'has-medal' : ''} ${blocks.length <= 1 ? 'result-compact' : ''}" style="${accentStyle(opts.accent)}">
    <main class="result-body" id="main">
      <div class="result-hero">
        <span class="result-glow" aria-hidden="true"></span>
        ${heroMedal ? `<div class="hero-medal">${medalBadge(ctx, heroMedal.id, true, 'lg')}</div>` : ''}
        <p class="result-kicker">${esc(opts.title)}</p>
        <h1 class="result-title">${headline(outcome.accuracy)}</h1>
        ${heroMedal ? `<p class="hero-medal-name">${esc(medalInfo(heroMedal.id, index).sub)}</p>` : ''}
      </div>
      <dl class="tally">
        <div><dt>Aciertos</dt><dd>${outcome.score}/${outcome.total}</dd></div>
        <div><dt>Experiencia</dt><dd>+<span class="countup" data-to="${outcome.xp}">${reduce ? outcome.xp : 0}</span></dd></div>
        <div><dt>Precisión</dt><dd>${Math.round(outcome.accuracy * 100)}%</dd></div>
      </dl>
      ${blocks.join('')}
      <div class="level-line">
        <span>${esc(level.name)}</span>
        <span class="bar" role="progressbar" aria-label="Progreso de nivel" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${toPct}"><span style="width:${reduce ? toPct : fromPct}%" data-to="${toPct}"></span></span>
        <span>${esc(level.next.name)}</span>
      </div>
      <div class="result-actions">
        ${ownNote}
        ${blocked ? `${gated ? `<p class="result-note result-gate">${icons.lock(16)}<span>Con la mitad de aciertos se abre la siguiente</span></p>` : ''}
        <button class="btn btn-primary btn-wide" data-action="go" data-to="${esc(retry)}" data-primary>${icons.repeat(20)}<span>Repetir</span></button>
        <button class="btn btn-secondary btn-wide" data-action="done">Volver al camino</button>` : `
        <button class="btn btn-primary btn-wide" data-action="done" data-primary>${esc(opts.primary || 'Seguir')}</button>
        ${retry && !closing ? `<button class="btn btn-secondary btn-wide" data-action="go" data-to="${esc(retry)}">${icons.repeat(20)}<span>Repetir</span></button>` : ''}`}
        ${opts.more && !closing ? `<button class="btn btn-secondary btn-wide" data-action="go" data-to="${esc(opts.more.to)}">${icons.repeat(20)}<span>${esc(opts.more.label)}</span></button>` : ''}
        ${token ? `<button class="btn btn-secondary btn-wide" data-action="share">${icons[isDaily ? 'copy' : 'duel'](20)}<span>${shareLabel}</span></button>` : ''}
        <p class="copy-status" role="status"></p>
        <textarea class="copy-fallback" readonly hidden aria-label="Texto para compartir" rows="4"></textarea>
      </div>
    </main>
  </div>`;

  window.scrollTo(0, 0);
  focusHeading(el);
  countUp($('.countup', el));
  const levelBar = $('.level-line .bar > span', el);
  if (!reduce && levelBar) setTimeout(() => { levelBar.style.width = `${toPct}%`; }, 450);
  playSequence(ctx, events, Boolean(heroMedal));
  announce(`${headline(outcome.accuracy)}. ${outcome.score} de ${outcome.total}.${goal ? ' Meta del día cumplida.' : ''}`);

  onAction(el, {
    done: () => {
      ctx.audio.sfx('tap');
      if (opts.onDone) opts.onDone();
      else ctx.go('inicio', { replace: true });
    },
    go: (b) => {
      ctx.audio.sfx('tap');
      if (b.dataset.to) ctx.go(b.dataset.to, { replace: true });
    },
    share: () => {
      ctx.audio.sfx('tap');
      const url = `${location.href.split('#')[0]}#${encodeChallenge(token, outcome.score)}`;
      const text = isDaily
        ? shareText({ title: plan.kind === 'weekly' ? `Mirada · Reto semanal ${plan.week.slice(6)}` : `Mirada · Reto diario ${plan.date.slice(8)}/${plan.date.slice(5, 7)}`, score: outcome.score, total: outcome.total, grid: dailyGrid(firstTry), url })
        : `He acertado ${outcome.score} de ${outcome.total} en Mirada${opts.shareTopic ? ` (${opts.shareTopic})` : ''}. ¿Me superas?\n${url}`;
      copyText(el, text);
    },
  });
}

export async function copyText(el, text) {
  const status = $('.copy-status', el);
  const fallback = $('.copy-fallback', el);
  let ok = false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      ok = true;
    }
  } catch {
    ok = false;
  }
  if (!ok) {
    try {
      fallback.hidden = false;
      fallback.value = text;
      fallback.select();
      ok = document.execCommand && document.execCommand('copy');
    } catch {
      ok = false;
    }
  }
  if (ok) {
    status.textContent = 'Copiado. Pégalo donde quieras.';
    fallback.hidden = true;
  } else {
    fallback.hidden = false;
    fallback.value = text;
    status.textContent = 'Cópialo desde aquí:';
  }
  status.classList.add('is-visible');
}

// Cierre del día: pintores y cuadros nuevos de hoy y la próxima parada. Informativo: sin botones
// (las miniaturas se abren a pantalla completa, como cualquier cuadro).
function dayDone(ctx, p, shownArtist = null) {
  const { index } = ctx;
  const sum = daySummary(p, index, ctx.today());
  const names = sum.artists.filter((id) => id !== shownArtist).map((id) => index.artist(id).short || index.artist(id).name);
  const thumbs = sum.works.slice(0, CLOSURE_THUMBS).map((id) => index.artwork(id))
    .map((w) => artFrame(w, { cls: 'day-done-thumb', alt: w.title, label: w.title, thumb: true, zoom: {} })).join('');
  const lines = [
    names.length ? `<p class="day-done-line">Has conocido a ${esc(listNames(names))}</p>` : '',
    sum.works.length ? `<p class="day-done-line">${sum.works.length === 1 ? '1 cuadro nuevo' : `${sum.works.length} cuadros nuevos`}</p>` : '',
    thumbs ? `<div class="day-done-thumbs">${thumbs}</div>` : '',
    sum.next ? `<p class="day-done-next">La próxima vez: <strong>${esc(sum.next.name)}</strong></p>` : '',
  ].join('');
  return `<section class="day-done" aria-labelledby="day-done-h"><h2 id="day-done-h" class="event-kicker">Hoy</h2>${lines}</section>`;
}

// Días perdidos que ha perdonado la gracia de la semana (1 o 2).
export function graceSavedText(n) {
  if (!n) return '';
  return n === 1 ? 'Racha a salvo: te quedaba un día de gracia' : 'Racha a salvo: te quedaban dos días de gracia';
}

function weekStrip(ctx, value, grace = 0) {
  const p = ctx.store.get().progress;
  const days = new Set(p.streak.days);
  const today = ctx.today();
  const labels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const cells = weekOf(today).map((d, i) => `<span class="day ${days.has(d) ? 'is-on' : ''} ${d === today ? 'is-today' : ''}"><span class="day-dot"></span><span class="day-label">${labels[i]}</span></span>`).join('');
  const title = value === 1 ? 'Primer día' : `${value} días seguidos`;
  const saved = graceSavedText(grace);
  return `<section class="event event-streak"><span class="event-icon">${icons.flame(22)}</span><span class="event-text"><span class="event-kicker">Racha</span><span class="event-title">${title}</span>${saved ? `<span class="event-sub">${esc(saved)}</span>` : ''}</span></section>
    <div class="week" aria-hidden="true">${cells}</div>`;
}

function countUp(node) {
  if (!node || prefersReducedMotion()) return;
  const to = Number(node.dataset.to) || 0;
  const start = performance.now() + 250;
  const dur = 900;
  const step = (t) => {
    const k = Math.max(0, Math.min(1, (t - start) / dur));
    node.textContent = String(Math.round(to * (1 - (1 - k) ** 3)));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Sonidos del cierre, al ritmo de las animaciones: la medalla suena cuando se estampa.
function playSequence(ctx, events, heroMedal) {
  const queue = [['complete', 0]];
  let t = 0;
  if (heroMedal || events.some((e) => e.type === 'medal')) queue.push(['medal', (t = 700)]);
  if (events.some((e) => e.type === 'levelup')) queue.push(['levelup', (t += 650)]);
  if (events.some((e) => e.type === 'goal')) queue.push(['streak', (t += 600)]);
  if (events.some((e) => e.type === 'unlock' || e.type === 'review-unlock')) queue.push(['unlock', (t += 550)]);
  queue.forEach(([name, at]) => setTimeout(() => ctx.audio.sfx(name), at));
}
