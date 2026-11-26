// Fin de ronda: aciertos, XP, medallas, racha, desbloqueos y acciones para compartir.

import { esc, onAction, accentStyle, announce, focusHeading, prefersReducedMotion, $ } from '../dom.js';
import { icons } from '../icons.js';
import { artFrame, coverOf } from '../art.js';
import { goalRing } from '../shell.js';
import { MASTERY, UNLOCK_MIN, isStepUnlocked, gateSteps } from '../../engine/progress.js';
import { pendingWorks, deepStatus } from '../../engine/levels.js';
import { stageTitle, tierOf, isMasterTier } from '../../engine/painters.js';
import { deepRoute, stageRoute, branchRoute } from '../router.js';
import { practiceAction } from './result-actions.js';
import { mainTrait } from '../../engine/feedback.js';
import { weekOf } from '../../engine/dates.js';
import { encodeChallenge, tokenForRound } from '../../engine/challenge.js';
import { shareText, dailyGrid } from '../../engine/daily.js';
import { medalBadge } from './medals.js';
import { rankFor } from '../../engine/ranks.js';
import { rankProgress } from '../../engine/profile.js';
import { medalInfo } from '../../engine/medal-info.js';
import { daySummary, listNames, CLOSURE_THUMBS } from '../../engine/closure.js';
import { branchAfterRound, statusInBranch } from '../../engine/branches.js';
import { setMapFocus, setBranchFocus } from './path-map.js';

export { extraRounds } from './result-actions.js';

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

// El «siguiente» de la celebración de un nivel «a fondo»: la etapa siguiente si ya está abierta, o null.
function deepNext(ctx, ev) {
  const { index } = ctx;
  const next = index.deepLevels(ev.artistId).find((l) => l.id > ev.level);
  return next && deepStatus(ctx.store.get().progress, index, ev.artistId, next.id) !== 'locked' ? next : null;
}

// «Nivel superado»: sello que se estampa, nombre de la etapa, las obras de la etapa a la vista y un solo «siguiente» (la etapa que
// sigue, o su ficha si era la última).
function deepCelebration(ctx, ev) {
  const { index } = ctx;
  const artist = index.artist(ev.artistId);
  const stage = index.deepLevels(ev.artistId).find((l) => l.id === ev.level);
  const next = deepNext(ctx, ev);
  const works = (stage ? stage.works : []).slice(0, 6);
  const thumbs = works.length ? `<ul class="deep-cele-works" style="--cols:${Math.min(works.length, works.length === 6 ? 3 : 5)}">${works.map((w) => `<li>${artFrame(w, { alt: '', cls: 'deep-cele-thumb', label: w.title, small: true, zoom: { group: 'deep-cele', badge: false, label: `Ver en grande: ${w.title}` } })}</li>`).join('')}</ul>` : '';
  const ficha = `<button type="button" class="deep-cele-link" data-action="go" data-to="pintor-${esc(ev.artistId)}">Ver su ficha${icons.next(16)}</button>`;
  const main = next ? `<button type="button" class="btn btn-primary btn-wide" data-action="go" data-to="${esc(deepRoute(ev.artistId, next.id))}">${esc(`Siguiente: ${stageTitle(artist, next)}`)}</button>` : '';
  return `<section class="deep-cele" style="${accentStyle(index.movement(artist.movementId)?.accent)}" aria-label="Nivel a fondo superado">
    <span class="deep-cele-seal" aria-hidden="true">${icons.check(40)}</span>
    <p class="event-kicker">Nivel a fondo superado</p>
    <p class="deep-cele-title">${esc(stage ? stageTitle(artist, stage) : 'Nivel superado')}</p>
    <p class="deep-cele-who">${esc(artist.name)}</p>
    ${thumbs}
    <div class="deep-cele-actions">${main}${ficha}</div>
  </section>`;
}

function stepRoute(index, step) {
  if (!step) return null;
  return step.type === 'sala' ? `sala-${step.id}` : `etapa-${step.id}`;
}

// Rango y avance al siguiente: el mismo que enseña el perfil (una sola escala visible).
export function rankLine(p, index) {
  const rank = rankFor(p, index);
  const bar = rankProgress(rank);
  return { name: rank.name, next: bar.next, pct: Math.round(bar.fraction * 100) };
}

// opts: { plan, outcome, title, accent, friendScore?, firstTry, shareTopic?, primary?, onDone?, more? }
// more: { label, to } acción extra (p. ej. «Repasar más» tras el repaso rápido); va como la acción de practicar.
export function renderResult(ctx, el, opts) {
  const { index } = ctx;
  const { outcome, plan } = opts;
  const state = ctx.store.get();
  const p = state.progress;
  // Una sola escala visible: los rangos (engine/ranks.js), los mismos que enseña el perfil.
  const rank = rankLine(p, index);
  const firstTry = opts.firstTry;
  const token = tokenForRound(index, plan);
  const isDaily = plan.kind === 'daily' || plan.kind === 'weekly';
  const events = outcome.events;
  const medals = events.filter((e) => e.type === 'medal');
  const rankUp = events.find((e) => e.type === 'rank');
  const streak = events.find((e) => e.type === 'streak');
  const unlock = events.find((e) => e.type === 'unlock');
  const reviewUnlock = events.find((e) => e.type === 'review-unlock');
  const goal = events.find((e) => e.type === 'goal');
  const completed = events.find((e) => e.type === 'movement-complete');
  // El sello principal: el del pintor dominado o, si no, el del movimiento.
  // Con una ronda floja no se presume de «Pintor dominado» (el sello se ganó antes).
  const heroMedal = outcome.accuracy < UNLOCK_MIN ? null : medals.find((m) => m.id.startsWith('artist-')) || medals.find((m) => m.id.startsWith('movement-'));
  const otherMedals = medals.filter((m) => m !== heroMedal
    && !(completed && m.id === `movement-${completed.movementId}`)
    && !(goal && m.id === 'goal-1')
    // Una sola tarjeta de racha: si hay racha, la medalla de racha no se repite.
    && !(streak && m.id.startsWith('streak-')));

  // «Hoy has aprendido» solo cuando el pintor se acaba de conocer o dominar: no tiene sentido en uno ya dominado.
  const alreadyMastered = Boolean(plan.artistId && p.artists?.[plan.artistId]?.mastered && !medals.some((m) => m.id === `artist-${plan.artistId}`));

  const isDeepRound = plan.kind === 'stage' && plan.level >= 2;
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
  // Ronda de un pintor de rama (opts.branchId: la rama desde la que se entró): su avance va arriba y pulsable,
  // sin «La próxima vez» del camino común; al volver, el mapa se centra en esa rama.
  const inBranch = plan.kind === 'stage' && plan.artistId ? branchAfterRound(p, index, plan.artistId, opts.branchId) : null;
  const branchNext = inBranch && !low && inBranch.next ? index.artist(inBranch.next) : null;
  if (inBranch) setMapFocus(inBranch.branch.id);
  if (low) {
    blocks.push('<p class="result-cheer">Vuelve a mirar sus cuadros: a la segunda se ve más.</p>');
  } else if (plan.kind === 'stage' && !(plan.level >= 2) && !alreadyMastered && plan.artistId && index.artist(plan.artistId)) {
    const a = index.artist(plan.artistId);
    const w = coverOf(index, a.id);
    const trait = mainTrait(a);
    if (w && trait) {
      blocks.push(`<section class="learned" aria-label="Hoy has aprendido">
        ${artFrame(w, { cls: 'learned-art', alt: `${w.title}, de ${a.name}`, label: w.title, thumb: true, zoom: { badge: false } })}
        <div class="learned-text"><p class="event-kicker">Hoy has aprendido</p><p class="learned-name">${esc(a.name)}</p><p class="learned-trait">${esc(trait)}</p></div>
      </section>`);
    }
  }
  if (goal) {
    blocks.push(eventCard({ icon: goalRing(goal.goal, goal.goal, 30), kicker: 'Meta del día', title: 'Cumplida', to: 'perfil', cls: 'event-goal' }));
    // El pintor de la etapa ya sale arriba en «Hoy has aprendido»: no se repite.
    blocks.push(dayDone(ctx, p, plan.kind === 'stage' && !low ? plan.artistId : null, { showNext: !isDeepRound && !inBranch }));
  }
  if (completed && index.movement(completed.movementId)) {
    const m = index.movement(completed.movementId);
    blocks.push(`<section class="event event-seal" style="${accentStyle(m.accent)}">${medalBadge(ctx, `movement-${m.id}`, true)}<span class="event-text"><span class="event-kicker">Movimiento completo</span><span class="event-title">${esc(m.name)}</span></span></section>`);
  }
  // Nivel «a fondo» superado: su propio momento (va el primero, grande y con destino). El rango y el resto, después.
  const deepDone = events.find((e) => e.type === 'deep-mastered');
  if (deepDone) blocks.unshift(deepCelebration(ctx, deepDone));
  if (rankUp) {
    blocks.push(eventCard({ icon: icons.gem(22), kicker: 'Nuevo rango', title: rankUp.name, to: 'perfil', cls: 'event-level' }));
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
  // Ronda de un pintor de rama: el avance de la rama y, si se ha abierto, el siguiente (acción principal).
  if (inBranch) {
    // «Se abre X» solo si lo abre esta ronda; si ya estaba abierto, «Siguiente: X».
    const wasOpen = branchNext && opts.before && statusInBranch(opts.before, index, branchNext.id, inBranch.branch.id) !== 'locked';
    const complete = inBranch.total && inBranch.mastered === inBranch.total;
    const justDone = complete && opts.before && branchAfterRound(opts.before, index, plan.artistId, inBranch.branch.id)?.mastered !== inBranch.total;
    const title = branchNext ? (wasOpen ? `Siguiente: ${branchNext.name}` : `Se abre ${branchNext.name}`) : complete ? (justDone ? 'Todos sus pintores' : 'Rama completa') : 'Sigue en la rama';
    if (justDone) blocks.unshift(`<section class="event event-seal event-branch-done"><span class="event-icon">${icons.laurel(26)}</span><span class="event-text"><span class="event-kicker">Rama completa</span><span class="event-title">${esc(inBranch.branch.name)}</span></span></section>`);
    blocks.splice(justDone ? 1 : 0, 0, eventCard({ icon: icons.fork(22), kicker: `Rama · ${inBranch.branch.name} ${inBranch.mastered}/${inBranch.total}`, title, to: branchRoute(inBranch.branch.id), cls: 'event-branch' }));
  }
  if (reviewUnlock && !goal && index.movement(reviewUnlock.movementId)) {
    blocks.push(eventCard({ icon: icons.repeat(22), kicker: 'Repaso disponible', title: index.movement(reviewUnlock.movementId).name, to: `repaso-${reviewUnlock.movementId}` }));
  }
  if (streak) blocks.push(weekStrip(ctx, streak.value, streak.grace, medals.some((m) => m.id.startsWith('streak-'))));

  const roundMastered = outcome.mastered ?? outcome.accuracy >= MASTERY;
  const isDeep = plan.kind === 'stage' && plan.level >= 2;
  const retry = (plan.kind === 'stage' || plan.kind === 'sala') && !roundMastered
    ? (plan.kind === 'stage' ? (isDeep ? deepRoute(plan.artistId, plan.level) : stageRoute(plan.artistId, inBranch?.branch.id)) : `sala-${plan.movementId}`) : null;
  // Con menos de la mitad de aciertos lo primero es repetir (y la parada siguiente, si estaba
  // cerrada, sigue cerrada).
  const step = plan.kind === 'stage' && !isDeep ? { type: 'artist', id: plan.artistId } : plan.kind === 'sala' ? { type: 'sala', id: plan.movementId } : null;
  // La siguiente parada normal: las extra (pintores nuevos en tramos ya superados) no cuentan.
  const nextOf = step ? gateSteps(p, index.steps.slice(index.stepIndex(step.type, step.id) + 1))[0] || null : null;
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
  // 75 % o más y bien repartido, pero faltan cuadros suyos por ver: una ronda más los enseña.
  const missing = outcome.coverShort && plan.artistId ? pendingWorks(p, index, plan.artistId, plan.level || 1).length : 0;
  const coverNote = missing ? `<p class="result-note">${missing === 1 ? 'Te falta 1 cuadro suyo por ver' : `Te faltan ${missing} cuadros suyos por ver`}: una ronda más</p>` : '';
  // Una sola acción para seguir practicando (sin duplicados); con la ronda floja, «Repetir» ya es la principal.
  const practice = blocked ? null : practiceAction(ctx, plan, { retry, more: opts.more, closing, duel: opts.friendScore != null });
  // La acción principal, siempre a mano en la barra de abajo: «Repetir» si la ronda no salió, el siguiente de la rama o «Seguir».
  const mainButton = blocked
    ? `<button class="btn btn-primary btn-wide" data-action="go" data-to="${esc(retry)}" data-primary>${icons.repeat(20)}<span>Repetir</span></button>`
    : branchNext
      ? `<button class="btn btn-primary btn-wide" data-action="go" data-to="${esc(stageRoute(branchNext.id, inBranch.branch.id))}" data-primary>Siguiente en la rama</button>`
      : `<button class="btn ${deepDone && deepNext(ctx, deepDone) ? 'btn-secondary' : 'btn-primary'} btn-wide" data-action="done" data-primary>${esc(deepDone ? 'Volver al camino' : opts.primary || 'Seguir')}</button>`;
  const shareLabel = isDaily ? 'Copiar resultado' : opts.friendScore != null ? 'Devolver el reto' : 'Retar a un amigo';
  const reduce = prefersReducedMotion();
  const toPct = rank.pct;
  // Sin subida de rango la barra no se anima desde un punto inventado (el avance depende de más que el XP).
  const fromPct = rankUp ? 0 : toPct;
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
        <div><dt>Precisión</dt><dd>${Math.round(outcome.accuracy * 100)}\u00a0%</dd></div>
      </dl>
      ${blocks.join('')}
      <div class="level-line">
        <span>${esc(rank.name)}</span>
        <span class="bar" role="progressbar" aria-label="${rank.next ? `Avance hacia ${esc(rank.next)}` : 'Rango más alto'}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${toPct}"><span style="width:${reduce ? toPct : fromPct}%" data-to="${toPct}"></span></span>
        <span>${rank.next ? esc(rank.next) : ''}</span>
      </div>
      <div class="result-actions">
        ${ownNote}${coverNote}
        ${blocked && gated ? `<p class="result-note result-gate">${icons.lock(16)}<span>Con la mitad de aciertos se abre la siguiente</span></p>` : ''}
        ${blocked || branchNext ? `<button class="btn btn-secondary btn-wide" data-action="done">${opts.branchId ? 'Volver a la rama' : 'Volver al camino'}</button>` : ''}
        ${practice ? `<button class="btn btn-secondary btn-wide" data-action="go" data-to="${esc(practice.to)}">${icons[practice.icon](20)}<span>${esc(practice.label)}</span></button>` : ''}
        ${token ? `<button class="btn btn-secondary btn-wide" data-action="share">${icons[isDaily ? 'copy' : 'duel'](20)}<span>${shareLabel}</span></button>` : ''}
        <p class="copy-status" role="status"></p>
        <textarea class="copy-fallback" readonly hidden aria-label="Texto para compartir" rows="4"></textarea>
      </div>
      <div class="result-dock">${mainButton}</div>
    </main>
  </div>`;

  window.scrollTo(0, 0);
  focusHeading(el);
  countUp($('.countup', el));
  const levelBar = $('.level-line .bar > span', el);
  if (!reduce && levelBar) setTimeout(() => { levelBar.style.width = `${toPct}%`; }, 450);
  playSequence(ctx, events, Boolean(heroMedal));
  // Primera vez que domina a un gran maestro o un maestro: su momento, encima y breve (ui/match-moment.js).
  const master = heroMedal?.id.startsWith('artist-') ? index.artist(heroMedal.id.slice('artist-'.length)) : null;
  const moment = master && isMasterTier(master) ? master : null;
  if (moment) import('../match-moment.js').then((m) => m.showMatchMoment(ctx, moment.id)).catch((err) => console.error(err));
  const momentText = moment ? ` ${tierOf(moment).label}: ${moment.name}.${moment.why ? ` ${moment.why.text}` : ''}` : '';
  announce(`${headline(outcome.accuracy)}. ${outcome.score} de ${outcome.total}.${goal ? ' Meta del día cumplida.' : ''}${momentText}`);

  onAction(el, {
    done: () => {
      ctx.audio.sfx('tap');
      if (opts.onDone) return opts.onDone();
      // Ronda jugada desde la pantalla de una rama: de vuelta a ella, en la parada jugada.
      if (opts.branchId && plan.kind === 'stage' && !isDeep && plan.artistId) {
        setBranchFocus(`artist:${plan.artistId}`);
        return ctx.go(branchRoute(opts.branchId), { replace: true });
      }
      // De vuelta al mapa, en la parada recién jugada (la rama ya se marcó arriba).
      if (!inBranch && plan.kind === 'stage' && plan.artistId) setMapFocus('', `artist:${plan.artistId}`);
      else if (plan.kind === 'sala') setMapFocus('', `sala:${plan.movementId}`);
      return ctx.go('inicio', { replace: true });
    },
    go: (b) => {
      ctx.audio.sfx('tap');
      if (b.dataset.to) ctx.go(b.dataset.to, { replace: true });
    },
    share: () => {
      ctx.audio.sfx('tap');
      const url = `${location.href.split('#')[0]}#${encodeChallenge(token, outcome.score)}`;
      const text = isDaily
        ? shareText({ title: plan.kind === 'weekly' ? `Sfumato · Reto semanal ${plan.week.slice(6)}` : `Sfumato · Reto diario ${plan.date.slice(8)}/${plan.date.slice(5, 7)}`, score: outcome.score, total: outcome.total, grid: dailyGrid(firstTry), url })
        : `He acertado ${outcome.score} de ${outcome.total} en Sfumato${opts.shareTopic ? ` (${opts.shareTopic})` : ''}. ¿Me superas?\n${url}`;
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
function dayDone(ctx, p, shownArtist = null, { showNext = true } = {}) {
  const { index } = ctx;
  const sum = daySummary(p, index, ctx.today());
  const names = sum.artists.filter((id) => id !== shownArtist).map((id) => index.artist(id).short || index.artist(id).name);
  const thumbs = sum.works.slice(0, CLOSURE_THUMBS).map((id) => index.artwork(id))
    .map((w) => artFrame(w, { cls: 'day-done-thumb', alt: w.title, label: w.title, thumb: true, zoom: { badge: false } })).join('');
  const lines = [
    names.length ? `<p class="day-done-line">Has conocido a ${esc(listNames(names))}</p>` : '',
    sum.works.length ? `<p class="day-done-line">${sum.works.length === 1 ? '1 cuadro nuevo' : `${sum.works.length} cuadros nuevos`}</p>` : '',
    thumbs ? `<div class="day-done-thumbs">${thumbs}</div>` : '',
    showNext && sum.next ? `<p class="day-done-next">La próxima vez: <strong>${esc(sum.next.name)}</strong></p>` : '',
  ].join('');
  return `<section class="day-done" aria-labelledby="day-done-h"><h2 id="day-done-h" class="event-kicker">Hoy</h2>${lines}</section>`;
}

// Días perdidos que ha perdonado la gracia de la semana (1 o 2).
export function graceSavedText(n) {
  if (!n) return '';
  return n === 1 ? 'Racha a salvo: te quedaba un día de gracia' : 'Racha a salvo: te quedaban dos días de gracia';
}

function weekStrip(ctx, value, grace = 0, medal = false) {
  const p = ctx.store.get().progress;
  const days = new Set(p.streak.days);
  const today = ctx.today();
  const labels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const cells = weekOf(today).map((d, i) => `<span class="day ${days.has(d) ? 'is-on' : ''} ${d === today ? 'is-today' : ''}"><span class="day-dot"></span><span class="day-label">${labels[i]}</span></span>`).join('');
  const title = value === 1 ? 'Primer día' : `${value} días seguidos`;
  const saved = medal ? 'Nueva medalla de racha' : graceSavedText(grace);
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
  if (events.some((e) => e.type === 'rank')) queue.push(['levelup', (t += 650)]);
  if (events.some((e) => e.type === 'goal')) queue.push(['streak', (t += 600)]);
  if (events.some((e) => e.type === 'unlock' || e.type === 'review-unlock')) queue.push(['unlock', (t += 550)]);
  queue.forEach(([name, at]) => setTimeout(() => ctx.audio.sfx(name), at));
}
