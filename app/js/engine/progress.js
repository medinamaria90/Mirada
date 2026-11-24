// Progreso: experiencia, niveles, racha diaria, medallas y desbloqueo del mapa. Puro.

import { daysBetween } from './dates.js';
import { recordAnswer, artKey, artistKey } from './srs.js';
import { noAuthorQuestion } from './catalog.js';

// Niveles con nombres del mundo del arte. Tras el último, la curva sigue: «Gran maestro II»,
// «III»… cada LEVEL_STEP_AFTER puntos, para que nunca se agote.
export const LEVELS = [
  { name: 'Curioso', min: 0 },
  { name: 'Aficionado', min: 100 },
  { name: 'Visitante', min: 250 },
  { name: 'Observador', min: 450 },
  { name: 'Copista', min: 700 },
  { name: 'Aprendiz de taller', min: 1000 },
  { name: 'Oficial de taller', min: 1400 },
  { name: 'Conocedor', min: 1900 },
  { name: 'Crítico', min: 2500 },
  { name: 'Restaurador', min: 3200 },
  { name: 'Conservador', min: 4000 },
  { name: 'Comisario', min: 5000 },
  { name: 'Académico', min: 6200 },
  { name: 'Maestro', min: 7600 },
  { name: 'Gran maestro', min: 9200 },
];
export const LEVEL_STEP_AFTER = 2000;
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

// Nivel i (0..∞): nombre y XP mínima.
export function levelAt(i) {
  if (i < LEVELS.length) return LEVELS[i];
  const k = i - LEVELS.length + 2; // Gran maestro II, III…
  const last = LEVELS[LEVELS.length - 1];
  return { name: `${last.name} ${ROMAN[k] || k}`, min: last.min + (k - 1) * LEVEL_STEP_AFTER };
}

export function levelName(i) {
  return levelAt(i).name;
}

// Meta diaria (XP de hoy). La primera es la de por defecto: una ronda basta.
export const GOAL_OPTIONS = [50, 100, 200];
export const DEFAULT_GOAL = GOAL_OPTIONS[0];
export const REVIEW_MIN_ARTISTS = 3;

export const XP = { correct: 10, newBonus: 5, comboStep: 2, comboCap: 10, complete: 20, perfect: 15 };
export const MASTERY = 0.75;
// Etapa de pintor (oleada 9): 70 % de aciertos a la primera (en rondas de 7, 5 aciertos) y, además,
// al menos 2 de cada 3 preguntas sobre el propio pintor: conocer a los anteriores y responder por
// descarte no basta para dominarlo. Salas y repasos siguen con MASTERY.
export const STAGE_MASTERY = 0.7;
export const OWN_MASTERY = 2 / 3;

// Aciertos necesarios entre n preguntas con un umbral (sin errores de coma flotante).
export function needed(n, share) {
  return Math.ceil(share * n - 1e-9);
}

// Preguntas sobre el propio pintor (own: [{ q, correct }]): 2 de cada 3. Con solo 2 (pintores con
// pocas obras) se perdona un fallo si el acierto es su «¿Cuál es de X?» (la obra ya vista, con
// relleno de pintores aún no aprendidos: por descarte se acierta 1 de cada 4).
export function ownRoundMastered(own) {
  const ok = own.filter((a) => a.correct);
  if (own.length === 2 && ok.length === 1) return ok[0].q?.type === 'which';
  return ok.length >= needed(own.length, OWN_MASTERY);
}

// Primera etapa (nadie aprendido antes): «¿Quién lo pintó?» siempre es el propio pintor y no prueba
// nada, así que no cuenta. Hacen falta 3 de cada 4 «¿Cuál es de X?», con el calentamiento (la obra
// ya vista) acertado. Con 4 (calentamiento + 3 no vistas), adivinar domina el 3,9 % de las rondas.
export function firstStageOwnMastered(own) {
  const which = own.filter((a) => a.q?.type === 'which');
  if (!which.length) return own.every((a) => a.correct);
  if (which.some((a) => a.q.isNew === false && !a.correct)) return false;
  return which.filter((a) => a.correct).length >= needed(which.length, MASTERY);
}

// ¿La ronda de etapa domina al pintor? answers: [{ q, correct, retry }] (las de reintento no cuentan).
// first: primera etapa del camino.
export function stageRoundMastered(answers, artistId, accuracy, { first = false } = {}) {
  const own = answers.filter((a) => !a.retry && a.q && a.q.artistId === artistId);
  if (first) return firstStageOwnMastered(own);
  if (accuracy < STAGE_MASTERY) return false;
  return ownRoundMastered(own);
}

// Regla de dominio de una etapa para el cálculo exacto de los tests (global + propias).
export function stageRule(index, artistId) {
  return index.pathIndex(artistId) === 0
    ? { mastery: 0, ownRule: firstStageOwnMastered }
    : { mastery: STAGE_MASTERY, ownRule: ownRoundMastered };
}
// Para abrir la parada siguiente hace falta acertar al menos la mitad en esta.
export const UNLOCK_MIN = 0.5;
export const STREAK_MEDALS = [3, 7, 30];

export function emptyProgress() {
  return {
    xp: 0,
    streak: { current: 0, best: 0, last: null, graceOn: null, days: [] },
    artists: {},
    salas: {},
    intros: {},
    reviews: {},
    srs: {},
    collection: {},
    medals: {},
    stats: { answered: 0, correct: 0, newCorrect: 0, rounds: 0 },
    daily: {},
    weekly: {},
    detail: {},
    challenges: { played: 0 },
    xpByDay: {},
  };
}

// «Ojo de <pintor>» (meta larga): todas sus obras que se preguntan, en la caja EYE_BOX del repaso o
// más. La caja 4 (y no la 5, la más alta): llegar a la 5 pide 25 días como mínimo por obra y, con el
// repaso rápido de 3 cuadros al día y las cajas bajas primero, en la práctica más de un mes.
export const EYE_BOX = 4;
export function hasEye(progress, index, artistId) {
  const works = index.worksOf(artistId).filter((w) => !noAuthorQuestion(w));
  const srs = progress.srs || {};
  return works.length > 0 && works.every((w) => (srs[artKey(w.id)]?.box || 0) >= EYE_BOX);
}

// XP de una respuesta; `combo` = aciertos seguidos contando esta.
export function xpForAnswer({ correct, isNew, combo, retry }) {
  if (!correct) return 0;
  if (retry) return Math.round(XP.correct / 2);
  const comboBonus = Math.min(XP.comboCap, Math.max(0, combo - 2) * XP.comboStep);
  return XP.correct + (isNew ? XP.newBonus : 0) + comboBonus;
}

export function levelFor(xp) {
  const v = Math.max(0, Number(xp) || 0);
  let i = 0;
  while (v >= levelAt(i + 1).min) i++;
  const cur = levelAt(i);
  const next = levelAt(i + 1);
  const progress = (v - cur.min) / (next.min - cur.min);
  return { index: i, name: cur.name, min: cur.min, next, progress };
}

export function todayXp(progress, today) {
  return Number(progress.xpByDay?.[today]) || 0;
}

export function normalizeGoal(goal) {
  return GOAL_OPTIONS.includes(goal) ? goal : DEFAULT_GOAL;
}

// Racha: un día seguido suma; se perdona un día perdido como mucho una vez por semana.
export function touchStreak(streak, today) {
  const s = { ...streak, days: streak.days ? streak.days.slice() : [] };
  if (s.last === today) return { streak: s, increased: false, graceUsed: false };
  let graceUsed = false;
  if (!s.last) s.current = 1;
  else {
    const gap = daysBetween(s.last, today);
    if (gap === 1) s.current += 1;
    else if (gap === 2 && (!s.graceOn || daysBetween(s.graceOn, today) >= 7)) {
      s.current += 1;
      s.graceOn = today;
      graceUsed = true;
    } else if (gap <= 0) {
      // Reloj hacia atrás: no se toca la racha.
      return { streak: s, increased: false, graceUsed: false };
    } else s.current = 1;
  }
  s.last = today;
  s.best = Math.max(s.best || 0, s.current);
  if (!s.days.includes(today)) s.days.push(today);
  s.days = s.days.slice(-60);
  return { streak: s, increased: true, graceUsed };
}

// Racha que se muestra hoy (si ya se rompió, 0).
export function visibleStreak(streak, today) {
  if (!streak.last) return 0;
  const gap = daysBetween(streak.last, today);
  if (gap <= 1) return streak.current;
  if (gap === 2 && (!streak.graceOn || daysBetween(streak.graceOn, today) >= 7)) return streak.current;
  return 0;
}

// --- Camino: paradas (pintores con etapa y salas) -----------------------------

function stepRecord(progress, step) {
  if (!step) return null;
  return step.type === 'sala' ? progress.salas?.[step.id] : progress.artists?.[step.id];
}

function stepPlayed(progress, step) {
  return (stepRecord(progress, step)?.plays || 0) > 0;
}

// Parada superada: jugada con al menos la mitad de aciertos (o dominada).
export function stepPassed(progress, step) {
  const rec = stepRecord(progress, step);
  return Boolean(rec && (rec.mastered || ((rec.plays || 0) > 0 && (Number(rec.best) || 0) >= UNLOCK_MIN)));
}

export function isStepUnlocked(progress, index, step) {
  const i = step ? index.stepIndex(step.type, step.id) : -1;
  if (i < 0) return false;
  if (i === 0) return true;
  return stepPassed(progress, index.steps[i - 1]);
}

export function stepStatus(progress, index, step) {
  const rec = stepRecord(progress, step);
  if (rec?.mastered) return 'mastered';
  if (rec?.plays) return 'started';
  return isStepUnlocked(progress, index, step) ? 'available' : 'locked';
}

export function artistStatus(progress, index, artistId) {
  return stepStatus(progress, index, { type: 'artist', id: artistId });
}

export function salaStatus(progress, index, movementId) {
  return stepStatus(progress, index, { type: 'sala', id: movementId });
}

export function movementStatus(progress, index, movementId) {
  const steps = index.stepsOf(movementId);
  if (!steps.length) return 'locked';
  const states = steps.map((s) => stepStatus(progress, index, s));
  if (states.every((s) => s === 'mastered')) return 'mastered';
  if (states[0] === 'locked') return 'locked';
  return 'open';
}

// Repaso de movimiento: solo con al menos REVIEW_MIN_ARTISTS pintores con etapa (con menos no
// aporta nada nuevo) y tras dominarlos a todos. Las salas no tienen repaso aparte.
export function hasMovementReview(index, movementId) {
  return !index.isSala(movementId) && index.stageArtists(movementId).length >= REVIEW_MIN_ARTISTS;
}

export function isReviewUnlocked(progress, index, movementId) {
  if (!hasMovementReview(index, movementId)) return false;
  return movementStatus(progress, index, movementId) === 'mastered';
}

// Progreso global del camino: paradas dominadas y jugadas.
export function pathProgress(progress, index) {
  const states = index.steps.map((s) => stepStatus(progress, index, s));
  return {
    total: states.length,
    mastered: states.filter((s) => s === 'mastered').length,
    played: states.filter((s) => s === 'mastered' || s === 'started').length,
  };
}

// Camino recorrido entero (todas las paradas jugadas al menos una vez).
export function isPathComplete(progress, index) {
  const pp = pathProgress(progress, index);
  return pp.total > 0 && pp.played === pp.total;
}

// Camino dominado entero (todas las paradas con medalla): abre la ronda libre y las metas largas.
export function isPathMastered(progress, index) {
  const pp = pathProgress(progress, index);
  return pp.total > 0 && pp.mastered === pp.total;
}

// Paradas jugadas pero aún sin dominar, en orden del camino.
export function stepsToMaster(progress, index) {
  return index.steps.filter((s) => stepStatus(progress, index, s) === 'started');
}

// Siguiente parada del camino (pintor o sala).
export function nextStep(progress, index) {
  return index.steps.find((s) => stepStatus(progress, index, s) === 'available')
    || index.steps.find((s) => stepStatus(progress, index, s) === 'started')
    || null;
}

// La intro de un movimiento se muestra la primera vez que se entra en él.
export function needsIntro(progress, index, movementId) {
  if (progress.intros?.[movementId]) return false;
  return !index.stepsOf(movementId).some((s) => stepPlayed(progress, s));
}

export function medalInfo(id, index) {
  const [kind, ...rest] = id.split('-');
  const ref = rest.join('-');
  if (kind === 'artist') return { title: index.artist(ref)?.name || ref, sub: 'Pintor dominado' };
  if (kind === 'movement') return { title: index.movement(ref)?.name || ref, sub: 'Movimiento dominado' };
  if (kind === 'streak') return { title: `${ref} días`, sub: 'Racha' };
  if (kind === 'eye') {
    const a = index.artist(ref);
    return { title: `Ojo de ${a ? a.short || a.name : ref}`, sub: 'Reconoces todos sus cuadros' };
  }
  if (id === 'weekly-1') return { title: 'Primer reto semanal', sub: 'Reto' };
  if (id === 'goal-1') return { title: 'Primera meta del día', sub: 'Meta diaria' };
  if (id === 'daily-1') return { title: 'Primer reto diario', sub: 'Reto' };
  if (id === 'daily-perfect') return { title: 'Reto diario perfecto', sub: 'Reto' };
  if (id === 'challenge-1') return { title: 'Primer duelo', sub: 'Reto a un amigo' };
  if (id === 'new-1') return { title: 'Primer cuadro nuevo', sub: 'Lo has reconocido sin verlo antes' };
  return { title: id, sub: '' };
}

// ¿Ya ha visto a este pintor? Con etapa: jugada alguna vez. Invitado: alguna parada de su movimiento
// jugada (los invitados salen en salas, repasos y de distractor).
export function isKnownArtist(progress, index, artistId) {
  const a = index.artist(artistId);
  if (!a) return false;
  if (index.pathIndex(artistId) >= 0) return stepPlayed(progress, { type: 'artist', id: artistId });
  return index.stepsOf(a.movementId).some((s) => stepPlayed(progress, s));
}

// Reto con pintores que aún no ha visto (p. ej. un reto diario o semanal aceptado por un jugador
// nuevo): se avisa antes y sus preguntas no cuentan para la precisión, el repaso ni la colección.
export function unseenArtists(progress, index, questions) {
  return [...new Set(questions.map((q) => q.artistId))].filter((id) => !isKnownArtist(progress, index, id));
}

function subjectArtwork(q) {
  return q.type === 'which' ? q.targetArtworkId : q.artworkId;
}

// Aplica una ronda terminada. `result` = { kind, artistId?, movementId?, date?, answers, firstTry }
// answers: [{ q, correct, retry, combo }]. opts.goal: meta diaria en XP.
export function finishRound(progress, index, result, today, opts = {}) {
  const events = [];
  const p = structuredCloneSafe(progress);
  p.salas = p.salas || {};
  p.xpByDay = p.xpByDay && typeof p.xpByDay === 'object' ? p.xpByDay : {};
  const levelBefore = levelFor(p.xp).index;
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

  const total = result.firstTry.length;
  const score = result.firstTry.filter((v) => v === true).length;
  const accuracy = total ? score / total : 0;
  let roundMastered = accuracy >= MASTERY;
  let ownShort = false;
  xp += XP.complete + (total && score === total ? XP.perfect : 0);

  if (result.kind === 'stage' && result.artistId && index.pathIndex(result.artistId) >= 0) {
    const step = { type: 'artist', id: result.artistId };
    const unlockCheck = watchNextStep(p, index, step);
    const prev = p.artists[result.artistId] || { plays: 0, best: 0, mastered: false };
    const first = index.pathIndex(result.artistId) === 0;
    roundMastered = stageRoundMastered(result.answers, result.artistId, accuracy, { first });
    ownShort = accuracy >= STAGE_MASTERY && !roundMastered;
    const mastered = prev.mastered || roundMastered;
    p.artists[result.artistId] = { plays: prev.plays + 1, best: Math.max(prev.best, accuracy), mastered, last: today };
    p.srs = recordAnswer(p.srs, artistKey(result.artistId), roundMastered, today);
    if (mastered) award(`artist-${result.artistId}`);
    unlockCheck(events);
    const movId = index.artist(result.artistId).movementId;
    if (mastered && !prev.mastered && movementStatus(p, index, movId) === 'mastered') {
      if (!p.medals[`movement-${movId}`]) events.push({ type: 'movement-complete', movementId: movId });
      award(`movement-${movId}`);
      if (isReviewUnlocked(p, index, movId)) events.push({ type: 'review-unlock', movementId: movId });
    }
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
  if (result.kind === 'daily' && result.date && !p.daily[result.date]) {
    p.daily[result.date] = { score, total, firstTry: result.firstTry.slice() };
    award('daily-1');
    if (total && score === total) award('daily-perfect');
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
  // La racha se celebra desde el primer día.
  if (streakTouch.increased) events.push({ type: 'streak', value: p.streak.current });
  for (const n of STREAK_MEDALS) if (p.streak.current >= n) award(`streak-${n}`);

  const levelAfter = levelFor(p.xp).index;
  if (levelAfter > levelBefore) events.push({ type: 'levelup', level: levelAfter });

  return { progress: p, events, xp, score, total, accuracy, mastered: roundMastered, ownShort };
}

// Recuerda si la parada siguiente estaba bloqueada y devuelve una función que, tras actualizar
// el progreso, emite el evento de desbloqueo si ahora está abierta.
function watchNextStep(p, index, step) {
  const next = index.steps[index.stepIndex(step.type, step.id) + 1];
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
