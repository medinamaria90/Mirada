// Aplica una ronda terminada al progreso: XP, repaso espaciado, colección, cola de fallados, último
// día visto, dominio de etapas y salas, medallas, meta diaria, racha y nivel. Puro.

import { recordAnswer, artKey, artistKey, updateFallados } from './srs.js';
import { logAnswers, finishRecall } from './recall.js';
import { rankFor, RANKS } from './ranks.js';
import { settleOffer } from './deepen.js';
import { seenAfterRound, markPendingSeen, deepKey, LEVELS_MASTERY } from './levels.js';
import { xpForAnswer, unseenArtists, MASTERY, STAGE_MASTERY, XP, stageRoundMastered, movementStatus, isReviewUnlocked, hasEye, normalizeGoal, touchStreak, STREAK_MEDALS, isStepUnlocked, isExtraStep } from './progress.js';

function subjectArtwork(q) {
  return q.type === 'which' ? q.targetArtworkId : q.artworkId;
}

// Aplica una ronda terminada. `result` = { kind, artistId?, movementId?, date?, answers, firstTry }
// answers: [{ q, correct, retry, combo }]. opts.goal: meta diaria en XP.
export function finishRound(progress, index, result, today, opts = {}) {
  const events = [];
  const p = structuredCloneSafe(progress);
  p.salas = p.salas || {};
  p.deep = p.deep && typeof p.deep === 'object' ? p.deep : {};
  p.xpByDay = p.xpByDay && typeof p.xpByDay === 'object' ? p.xpByDay : {};
  const award = (id) => {
    if (!p.medals[id]) {
      p.medals[id] = today;
      events.push({ type: 'medal', id });
    }
  };

  let xp = 0;
  const unseen = new Set(result.unseen ? unseenArtists(progress, index, result.answers.map((a) => a.q)) : []);
  for (const a of result.answers) {
    xp += xpForAnswer({ correct: a.correct, isNew: a.q.isNew, combo: a.combo, retry: a.retry });
    if (a.retry || unseen.has(a.q.artistId)) continue;
    p.stats.answered += 1;
    const artId = subjectArtwork(a.q);
    if (a.correct) {
      p.stats.correct += 1;
      if (artId && !p.collection[artId]) p.collection[artId] = today;
      if (a.q.isNew) {
        p.stats.newCorrect += 1;
        award('new-1');
      }
    }
    if (artId) p.srs = recordAnswer(p.srs, artKey(artId), a.correct, today);
  }

  p.fallados = updateFallados(p.fallados, result.answers, today, (a) => unseen.has(a.q.artistId));
  p.seen = markSeen(p.seen, index, result.answers, today, unseen);
  if (index.hasLevels) p.artists = markPendingSeen(p, index, result.answers.filter((a) => !unseen.has(a.q?.artistId)));
  // «Repasar a…»: la sesión terminada pone a cero la cuenta de su pintor o época; las demás rondas apuntan sus respuestas.
  if (result.kind === 'recall' && (result.artistId || result.movementId)) {
    Object.assign(p, finishRecall(p, result.recallType, result.artistId || result.movementId, today));
  } else {
    const round = { artistId: result.kind === 'stage' ? result.artistId : '', movementId: result.kind === 'sala' ? result.movementId : '' };
    p.slips = logAnswers(p.slips, result.answers, index, today, { skip: (a) => unseen.has(a.q.artistId), round });
  }

  const total = result.firstTry.length;
  const score = result.firstTry.filter((v) => v === true).length;
  const accuracy = total ? score / total : 0;
  let roundMastered = accuracy >= MASTERY;
  let ownShort = false;
  xp += XP.complete + (total && score === total ? XP.perfect : 0);

  const inBranch = result.kind === 'stage' && result.artistId && index.pathIndex(result.artistId) < 0 && index.branchesOf(result.artistId).length > 0;
  if (result.kind === 'stage' && result.artistId && (index.pathIndex(result.artistId) >= 0 || inBranch)) {
    const id = result.artistId;
    const onPath = index.pathIndex(id) >= 0;
    const level = Number.isInteger(result.level) && result.level >= 2 ? result.level : 1;
    const step = { type: 'artist', id };
    const unlockCheck = onPath && level === 1 ? watchNextStep(p, index, step) : () => {};
    const prev = p.artists[id] || { plays: 0, best: 0, mastered: false };
    const first = index.pathIndex(id) === 0;
    // Catálogo con niveles: aprobar la ronda (75 %) supera el nivel y abre el siguiente, aunque falten obras por ver
    // (decisión de María, 28/11; engine/levels.js).
    const mastery = index.hasLevels ? LEVELS_MASTERY : STAGE_MASTERY;
    roundMastered = stageRoundMastered(result.answers, id, accuracy, { first, mastery });
    const works = index.hasLevels ? seenAfterRound(p, index, id, level, result.answers) : prev.works;
    ownShort = accuracy >= mastery && !roundMastered;
    const keep = works ? { works } : {};
    if (level === 1) {
      const mastered = prev.mastered || roundMastered;
      p.artists[id] = { ...prev, ...keep, plays: prev.plays + 1, best: Math.max(prev.best, accuracy), mastered, last: today, since: prev.since || today };
      if (mastered) award(`artist-${id}`);
      unlockCheck(events);
      const movId = index.artist(id).movementId;
      if (onPath && mastered && !prev.mastered && movementStatus(p, index, movId) === 'mastered') {
        if (!p.medals[`movement-${movId}`]) events.push({ type: 'movement-complete', movementId: movId });
        award(`movement-${movId}`);
        if (isReviewUnlocked(p, index, movId)) events.push({ type: 'review-unlock', movementId: movId });
      }
    } else {
      // Ronda «a fondo»: no toca la parada del camino (plays, best, mastered), solo su último día y lo visto.
      const key = deepKey(id, level);
      const d = p.deep[key] || { plays: 0, best: 0, mastered: false };
      p.deep[key] = { plays: d.plays + 1, best: Math.max(d.best, accuracy), mastered: d.mastered || roundMastered, last: today };
      p.artists[id] = { ...prev, ...keep, last: today };
      if (roundMastered && !d.mastered) events.push({ type: 'deep-mastered', artistId: id, level });
    }
    p.srs = recordAnswer(p.srs, artistKey(id), roundMastered, today);
  }
  if (result.kind === 'sala' && result.movementId && index.isSala(result.movementId)) {
    const step = { type: 'sala', id: result.movementId };
    const unlockCheck = watchNextStep(p, index, step);
    const prev = p.salas[result.movementId] || { plays: 0, best: 0, mastered: false };
    const mastered = prev.mastered || accuracy >= MASTERY;
    p.salas[result.movementId] = { plays: prev.plays + 1, best: Math.max(prev.best, accuracy), mastered, last: today };
    if (mastered && !p.medals[`movement-${result.movementId}`]) events.push({ type: 'movement-complete', movementId: result.movementId });
    if (mastered) award(`movement-${result.movementId}`);
    unlockCheck(events);
  }
  if (result.kind === 'review' && result.movementId) {
    const prev = p.reviews[result.movementId] || { best: 0 };
    p.reviews[result.movementId] = { best: Math.max(prev.best, accuracy), last: today };
    if (accuracy >= MASTERY) award(`movement-${result.movementId}`);
  }
  if (result.kind === 'weekly' && result.week && !p.weekly?.[result.week]) {
    p.weekly = { ...(p.weekly || {}), [result.week]: { score, total, firstTry: result.firstTry.slice() } };
    award('weekly-1');
  }
  // Ojo de…: pintores de esta ronda con todas sus obras en la caja más alta.
  const touched = new Set(result.answers.map((a) => a.q && a.q.artistId).filter((id) => index.pathIndex(id) >= 0));
  for (const id of touched) if (hasEye(p, index, id)) award(`eye-${id}`);
  if (result.challenge) {
    p.challenges.played += 1;
    award('challenge-1');
  }

  p.stats.rounds += 1;
  p.xp += xp;
  const dayBefore = Number(p.xpByDay[today]) || 0;
  p.xpByDay[today] = dayBefore + xp;
  p.xpByDay = pruneDays(p.xpByDay, 21);
  const goal = opts.goal ? normalizeGoal(opts.goal) : null;
  if (goal && dayBefore < goal && dayBefore + xp >= goal) {
    events.push({ type: 'goal', goal });
    award('goal-1');
  }
  const streakTouch = touchStreak(p.streak, today);
  p.streak = streakTouch.streak;
  // Cualquier ronda terminada mantiene la racha (la meta de XP va aparte). Se celebra desde el primer
  // día; grace: días perdidos que se han perdonado con los días de gracia de la semana.
  if (streakTouch.increased) events.push({ type: 'streak', value: p.streak.current, grace: streakTouch.graceUsed });
  for (const n of STREAK_MEDALS) if (p.streak.current >= n) award(`streak-${n}`);

  const rank = rankFor(p, index);
  const rankBefore = Math.max(0, Number(p.rank) || 0);
  if (rank.index > rankBefore) {
    p.rank = rank.index;
    events.push({ type: 'rank', index: rank.index, name: RANKS[rank.index].name });
  }

  // La propuesta de profundizar a la vista: aceptada si era esta ronda; saltada si se ha jugado otra cosa (engine/deepen.js).
  return { progress: settleOffer(p, result, today), events, xp, score, total, accuracy, mastered: roundMastered, ownShort };
}

// Último día en que salió cada pintor con etapa en una pregunta (sin reintentos ni pintores aún no
// vistos): lo usan el cuadro de repaso de cada etapa y los pintores dormidos (engine/review.js).
function markSeen(seen, index, answers, today, unseen) {
  const out = seen && typeof seen === 'object' && !Array.isArray(seen) ? { ...seen } : {};
  for (const a of answers) {
    const id = a.q && a.q.artistId;
    if (!a.retry && id && !unseen.has(id) && index.pathIndex(id) >= 0) out[id] = today;
  }
  return out;
}

// Recuerda si la parada siguiente estaba bloqueada y devuelve una función que, tras actualizar
// el progreso, emite el evento de desbloqueo si ahora está abierta.
function watchNextStep(p, index, step) {
  // La siguiente que cuenta (las paradas extra están siempre abiertas y no abren nada).
  const next = isExtraStep(p, step) ? null : index.steps.slice(index.stepIndex(step.type, step.id) + 1).find((s) => !isExtraStep(p, s));
  const wasLocked = next && !isStepUnlocked(p, index, next);
  return (events) => {
    if (!wasLocked || !isStepUnlocked(p, index, next)) return;
    const newMovement = next.movementId !== index.steps[index.stepIndex(step.type, step.id)].movementId;
    events.push({
      type: 'unlock',
      step: { type: next.type, id: next.id },
      artistId: next.type === 'artist' ? next.id : null,
      movementId: newMovement ? next.movementId : null,
    });
  };
}

// Conserva solo los últimos `keep` días (claves AAAA-MM-DD).
function pruneDays(byDay, keep) {
  const keys = Object.keys(byDay).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort().slice(-keep);
  return Object.fromEntries(keys.map((k) => [k, Math.max(0, Number(byDay[k]) || 0)]));
}

function structuredCloneSafe(obj) {
  return JSON.parse(JSON.stringify(obj));
}
