// Fin de ronda: una sola pantalla que no se desplaza. Arriba el cuadro con la medalla, el titular y lo aprendido; después
// tres cifras (aciertos, experiencia, cuadros nuevos) y una fila de logros de alto fijo (result-chips.js). Abajo, fija,
// la acción principal (el siguiente paso recomendado, engine/next-step.js) y como mucho tres secundarias: «Volver al
// camino», una para practicar y compartir (solo icono). Con letra grande solo se desplaza lo de en medio. El momento
// de dominar a un maestro (ui/match-moment.js) va antes, encima, hasta que se cierra. Estilos: css/resultado.css.

import { esc, onAction, accentStyle, announce, focusHeading, prefersReducedMotion, $ } from '../dom.js';
import { icons } from '../icons.js';
import { mediumSrc, tinySrc, coverOf } from '../art.js';
import { MASTERY, UNLOCK_MIN, isStepUnlocked, gateSteps } from '../../engine/progress.js';
import { nextStep, DONE_TITLE } from '../../engine/next-step.js';
import { RANKS } from '../../engine/ranks.js';
import { isoWeek } from '../../engine/dates.js';
import { pendingWorks } from '../../engine/levels.js';
import { stageTitle, tierOf, isMasterTier, avatarCrop, avatarWork, seenOf } from '../../engine/painters.js';
import { deepRoute, stageRoute, branchRoute } from '../router.js';
import { practiceAction } from './result-actions.js';
import { roundChips, chipsHtml, wireChips } from './result-chips.js';
import { mainTrait } from '../../engine/feedback.js';
import { encodeChallenge, tokenForRound } from '../../engine/challenge.js';
import { shareText, dailyGrid } from '../../engine/daily.js';
import { medalBadge } from './medals.js';
import { medalInfo } from '../../engine/medal-info.js';
import { newWorksCount } from '../../engine/closure.js';
import { branchAfterRound } from '../../engine/branches.js';
import { setMapFocus, setBranchFocus } from './path-map.js';

export { extraRounds } from './result-actions.js';

// Subida de rango, en una línea: lo conseguido y lo que viene («¡Ya eres Copista! Ahora, a por Oficial de taller»).
const RANK_UP = (ev) => `¡Ya eres ${ev.name}!${RANKS[ev.index + 1] ? ` Ahora, a por ${RANKS[ev.index + 1].name}` : ''}`;

export function headline(accuracy) {
  if (accuracy >= 1) return 'Impecable';
  if (accuracy >= 0.75) return 'Muy buen ojo';
  if (accuracy >= 0.5) return 'Vas cogiendo el estilo';
  return 'Se aprende mirando';
}

const subjectOf = (q) => (q.type === 'which' ? q.targetArtworkId : q.artworkId);

// Cuadro de la cabecera: el del pintor de la etapa o, si no, el más famoso de la ronda (ya visto: sin spoilers).
function heroWork(index, plan) {
  if (plan.artistId && index.artist(plan.artistId)) return coverOf(index, plan.artistId);
  const works = (plan.questions || []).map((q) => index.artwork(subjectOf(q))).filter(Boolean);
  return works.sort((a, b) => (b.fame || 0) - (a.fame || 0))[0] || null;
}

// El cuadro a sangre arriba (versión mediana, con su punto de interés); se abre a pantalla completa como cualquier cuadro.
function heroArt(work) {
  const crop = avatarCrop(work);
  return `<button type="button" class="art art-zoom res-art-img" data-art="${esc(work.id)}" data-label="${esc(work.title)}" data-zoom="${esc(work.id)}" aria-label="${esc(`Ver en grande: ${work.title}`)}">
    <img src="${esc(mediumSrc(work))}" alt="" style="object-position:${crop.x}% ${crop.y}%" decoding="async" fetchpriority="high"></button>`;
}

// La frase bajo el titular, por prioridad: el duelo, la cuadrícula del reto, el ánimo de una ronda floja, por qué aún no
// está dominado o, en una etapa, el rasgo del pintor (lo aprendido).
function lineHtml(ctx, r) {
  const { index } = ctx;
  const { plan, outcome } = r;
  if (r.friendScore != null) {
    const mine = outcome.score;
    const verdict = mine > r.friendScore ? 'Ganas tú' : mine < r.friendScore ? 'Gana tu amigo' : 'Empate';
    return `<p class="res-line"><strong>${verdict}</strong> · ${mine} a ${r.friendScore}</p>`;
  }
  if (r.isDaily) return `<div class="grid-row res-grid" role="img" aria-label="${outcome.score} aciertos de ${outcome.total}">${r.firstTry.map((ok) => `<span class="sq ${ok ? 'is-ok' : ''}"></span>`).join('')}</div>`;
  // Subida de rango: qué has conseguido y qué viene ahora, en una línea (la cuadrícula del reto va antes).
  if (r.rankUp && !r.low) return `<p class="res-line res-rank">${icons.gem(18)}<span>${esc(RANK_UP(r.rankUp))}</span></p>`;
  if (r.low) {
    const gate = r.gated ? `<span class="res-gate">${icons.lock(16)}<span>Con la mitad de aciertos se abre la siguiente</span></span>` : '';
    return `<p class="res-line">Vuelve a mirar sus cuadros: a la segunda se ve más.</p>${gate}`;
  }
  const artist = plan.artistId ? index.artist(plan.artistId) : null;
  const who = artist ? artist.short || artist.name : '';
  if (outcome.ownShort && artist) return `<p class="res-line">Para dominarlo, acierta más cuadros de ${esc(who)}</p>`;
  const missing = outcome.coverShort && artist ? pendingWorks(ctx.store.get().progress, index, artist.id, plan.level || 1).length : 0;
  if (missing) return `<p class="res-line">${missing === 1 ? 'Te falta 1 cuadro suyo por ver' : `Te faltan ${missing} cuadros suyos por ver`}: una ronda más</p>`;
  const trait = plan.kind === 'stage' && artist ? mainTrait(artist) : '';
  return trait ? `<p class="res-line">${esc(trait)}</p>` : '';
}

// La medalla montada sobre el cuadro: la del pintor o movimiento dominados (con su ✓) o el sello de un nivel «a fondo».
// Con el pintor dominado, su cara (un autorretrato visto) o un detalle de otro cuadro suyo visto, distinto del de arriba.
function medalHtml(ctx, heroMedal, deepDone, topWork) {
  const artistId = heroMedal?.id.startsWith('artist-') ? heroMedal.id.slice('artist-'.length) : '';
  if (artistId) {
    const seen = seenOf(ctx.store.get().progress, ctx.index, artistId);
    const face = avatarWork(seen) || seen.filter((w) => w !== topWork).sort((a, b) => (b.fame || 0) - (a.fame || 0)).map((w) => ({ work: w, ...avatarCrop(w) }))[0];
    const img = face ? `<img src="${esc(mediumSrc(face.work))}" alt="" style="object-position:${face.x}% ${face.y}%" decoding="async">` : '';
    return `<div class="res-medal"><span class="res-face">${img}</span><span class="res-medal-check" aria-hidden="true">${icons.check(18)}</span></div>`;
  }
  if (heroMedal) return `<div class="res-medal">${medalBadge(ctx, heroMedal.id, true, 'lg')}</div>`;
  return deepDone ? `<div class="res-medal"><span class="res-seal" aria-hidden="true">${icons.check(40)}</span></div>` : '';
}

const secondaryBtn = (b) => (b.iconOnly
  ? `<button class="btn btn-secondary res-btn2 is-icon" data-action="${b.action}" aria-label="${esc(b.label)}">${icons[b.icon](20)}</button>`
  : `<button class="btn btn-secondary res-btn2" data-action="${b.action}"${b.to ? ` data-to="${esc(b.to)}"` : ''}>${b.icon ? icons[b.icon](20) : ''}<span>${esc(b.label)}</span></button>`);

// ↻ solo para «Repasar»; «Repetir» va sin icono.
const STEP_ICON = { review: 'repeat', weekly: 'target' };

// Botón principal: el siguiente paso. Al camino («Seguir», «Volver al camino») cierra como siempre; el resto va a su ruta.
// «Sigue: <pintor>» lleva su miniatura.
function mainButtonHtml(ctx, step, primaryText) {
  if (step.kind === 'path' || step.kind === 'done') {
    return `<button class="btn btn-primary btn-wide" data-action="done" data-primary>${esc(step.kind === 'path' ? primaryText || step.label : step.label)}</button>`;
  }
  const work = step.kind === 'stop' && step.artistId ? coverOf(ctx.index, step.artistId) : null;
  const lead = work ? `<span class="res-next-art" aria-hidden="true"><img src="${esc(tinySrc(work))}" alt="" decoding="async"></span>`
    : STEP_ICON[step.kind] ? icons[STEP_ICON[step.kind]](20) : '';
  return `<button class="btn btn-primary btn-wide" data-action="go" data-to="${esc(step.to)}" data-primary>${lead}<span>${esc(step.label)}</span></button>`;
}

// opts: { plan, outcome, title, accent, friendScore?, firstTry, shareTopic?, primary?, onDone?, before?, branchId?, prevKind?,
// goalJustMet? } (prevKind: tipo de la sesión anterior; goalJustMet: esta sesión cumple la meta del día).
export function renderResult(ctx, el, opts) {
  const { index } = ctx;
  const { outcome, plan } = opts;
  const p = ctx.store.get().progress;
  const token = tokenForRound(index, plan);
  const isDaily = plan.kind === 'daily' || plan.kind === 'weekly';
  const events = outcome.events;
  const medals = events.filter((e) => e.type === 'medal');
  const streak = events.find((e) => e.type === 'streak');
  const goal = events.find((e) => e.type === 'goal');
  const completed = events.find((e) => e.type === 'movement-complete');
  const deepDone = events.find((e) => e.type === 'deep-mastered');
  // El sello principal: el del pintor dominado o, si no, el del movimiento. Con una ronda floja no se presume de él.
  const heroMedal = outcome.accuracy < UNLOCK_MIN ? null : medals.find((m) => m.id.startsWith('artist-')) || medals.find((m) => m.id.startsWith('movement-'));
  const otherMedals = medals.filter((m) => m !== heroMedal
    && !(completed && m.id === `movement-${completed.movementId}`)
    && !(goal && m.id === 'goal-1')
    && !(streak && m.id.startsWith('streak-')));

  const low = (plan.kind === 'stage' || plan.kind === 'sala') && outcome.accuracy < UNLOCK_MIN;
  // Ronda de un pintor de rama (opts.branchId: la rama desde la que se entró): su avance va en una ficha; al volver, el mapa
  // se centra en esa rama.
  const inBranch = plan.kind === 'stage' && plan.artistId ? branchAfterRound(p, index, plan.artistId, opts.branchId) : null;
  if (inBranch) setMapFocus(inBranch.branch.id);
  const branchDone = Boolean(inBranch && inBranch.total && inBranch.mastered === inBranch.total);
  const chips = roundChips(index, { events, otherMedals, branch: inBranch && { ...inBranch, done: branchDone } });

  const roundMastered = outcome.mastered ?? outcome.accuracy >= MASTERY;
  const isDeep = plan.kind === 'stage' && plan.level >= 2;
  const retry = (plan.kind === 'stage' || plan.kind === 'sala') && !roundMastered
    ? (plan.kind === 'stage' ? (isDeep ? deepRoute(plan.artistId, plan.level) : stageRoute(plan.artistId, inBranch?.branch.id)) : `sala-${plan.movementId}`) : null;
  // Con menos de la mitad de aciertos lo primero es repetir (y la parada siguiente, si estaba cerrada, sigue cerrada).
  const step = plan.kind === 'stage' && !isDeep ? { type: 'artist', id: plan.artistId } : plan.kind === 'sala' ? { type: 'sala', id: plan.movementId } : null;
  // La siguiente parada normal: las extra (pintores nuevos en tramos ya superados) no cuentan.
  const nextOf = step ? gateSteps(p, index.steps.slice(index.stepIndex(step.type, step.id) + 1))[0] || null : null;
  const duel = opts.friendScore != null;
  const goalJustMet = opts.goalJustMet ?? Boolean(goal);
  // El siguiente paso (engine/next-step.js); los duelos no llevan recomendación.
  const week = typeof ctx.dailyDay === 'function' ? isoWeek(ctx.dailyDay()).key : '';
  const next = duel ? { kind: 'path', to: 'inicio', label: 'Seguir' }
    : nextStep(p, index, ctx.today(), { plan, outcome, goalJustMet, prevKind: opts.prevKind, branchId: inBranch?.branch.id || opts.branchId || '', week, origin: opts.origin || '' });
  const blocked = next.kind === 'retry';
  const gated = Boolean(blocked && nextOf && !isStepUnlocked(p, index, nextOf));
  const toPath = next.kind === 'path' || next.kind === 'done';

  // Secundarias: volver (si el principal no vuelve ya), una para practicar (nunca la misma que el principal; ninguna al
  // cerrar el día ni en un duelo) y compartir.
  const practice = blocked ? null : practiceAction(ctx, plan, { retry, closing: goalJustMet, duel, prevKind: opts.prevKind, main: next.to });
  const shareLabel = isDaily ? 'Copiar resultado' : duel ? 'Devolver el reto' : 'Retar';
  const backLabel = opts.branchId && plan.kind === 'stage' && !isDeep ? 'Volver a la rama' : 'Volver al camino';
  const secondary = [
    toPath ? null : { action: 'done', label: backLabel },
    practice ? { action: 'go', to: practice.to, label: practice.label, icon: practice.icon } : null,
    token && !blocked ? { action: 'share', label: shareLabel, icon: isDaily ? 'copy' : 'duel' } : null,
  ].filter(Boolean);
  // Con tres, compartir va solo con su icono.
  if (secondary.length === 3) secondary[2].iconOnly = true;
  const mainButton = mainButtonHtml(ctx, next, opts.primary);

  const master = heroMedal?.id.startsWith('artist-') ? index.artist(heroMedal.id.slice('artist-'.length)) : null;
  const deepStage = deepDone && index.deepLevels(deepDone.artistId).find((l) => l.id === deepDone.level);
  const kicker = master ? `${master.short || master.name} · Dominado`
    : heroMedal ? `${medalInfo(heroMedal.id, index).title} · Dominado`
      : deepStage ? `${stageTitle(index.artist(deepDone.artistId), deepStage)} · Superado` : opts.title;
  const work = heroWork(index, plan);
  const art = work ? heroArt(work) : '';
  const reduce = prefersReducedMotion();
  const fresh = newWorksCount(opts.before, p);
  el.innerHTML = `<div class="res${heroMedal || deepDone ? ' has-medal' : ''}${art ? '' : ' no-art'}" style="${accentStyle(opts.accent)}">
    <main class="res-mid" id="main">
      <div class="res-art">${art}</div>
      <div class="res-head">
        ${medalHtml(ctx, heroMedal, deepDone, work)}
        <p class="res-kicker">${esc(kicker)}</p>
        <h1 class="res-title">${next.kind === 'done' ? DONE_TITLE : headline(outcome.accuracy)}</h1>
        ${lineHtml(ctx, { plan, outcome, low, gated, isDaily, friendScore: opts.friendScore, firstTry: opts.firstTry, rankUp: events.find((e) => e.type === 'rank') })}
      </div>
      <dl class="res-tally">
        <div><dt>Aciertos</dt><dd>${outcome.score}/${outcome.total}</dd></div>
        <div><dt>Experiencia</dt><dd>+<span class="countup" data-to="${outcome.xp}">${reduce ? outcome.xp : 0}</span></dd></div>
        <div><dt>Cuadros nuevos</dt><dd>${fresh}</dd></div>
      </dl>
      ${chipsHtml(chips)}
    </main>
    <footer class="res-foot">
      <p class="copy-status" role="status"></p>
      <textarea class="copy-fallback" readonly hidden aria-label="Texto para compartir" rows="3"></textarea>
      ${mainButton}
      ${secondary.length ? `<div class="res-row${secondary.length === 1 ? ' is-one' : secondary.length === 3 ? ' has-icon' : ''}">${secondary.map(secondaryBtn).join('')}</div>` : ''}
    </footer>
  </div>`;

  window.scrollTo(0, 0);
  focusHeading(el);
  countUp($('.countup', el));
  wireChips(el);
  playSequence(ctx, events, Boolean(heroMedal));
  // Primera vez que domina a un gran maestro o un maestro: su momento, encima, hasta que se cierra (ui/match-moment.js).
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
      const rankUp = events.find((e) => e.type === 'rank');
      if (rankUp && b.dataset.to === opts.origin) ctx.toast(RANK_UP(rankUp), { carry: true });
      if (b.dataset.to) ctx.go(b.dataset.to, { replace: true });
    },
    share: () => {
      ctx.audio.sfx('tap');
      const url = `${location.href.split('#')[0]}#${encodeChallenge(token, outcome.score)}`;
      const text = isDaily
        ? shareText({ title: plan.kind === 'weekly' ? `Sfumato · Reto semanal ${plan.week.slice(6)}` : `Sfumato · Reto diario ${plan.date.slice(8)}/${plan.date.slice(5, 7)}`, score: outcome.score, total: outcome.total, grid: dailyGrid(opts.firstTry), url })
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
