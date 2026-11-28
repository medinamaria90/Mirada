// Progreso: experiencia, niveles, racha diaria, medallas y desbloqueo del mapa. Puro. Aplicar una ronda
// terminada (finishRound) está en engine/finish.js: solo hace falta al acabar una ronda, no al arrancar.

import { artKey } from './srs.js';
import { noAuthorQuestion } from './catalog.js';
import { daysBetween, addDays, weekOf } from './dates.js';
import { gateEssentials } from './essentials.js';

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
export function stageRoundMastered(answers, artistId, accuracy, { first = false, mastery = STAGE_MASTERY } = {}) {
  const own = answers.filter((a) => !a.retry && a.q && a.q.artistId === artistId);
  if (first) return firstStageOwnMastered(own);
  if (accuracy < mastery) return false;
  return ownRoundMastered(own);
}

// Regla de dominio de una etapa para el cálculo exacto de los tests (global + propias).
export function stageRule(index, artistId) {
  return index.pathIndex(artistId) === 0
    ? { mastery: 0, ownRule: firstStageOwnMastered }
    : { mastery: stageMastery(index), ownRule: ownRoundMastered };
}

// Umbral de una etapa: 70 % en el catálogo pequeño y 75 % (decisión de María) en el grande con niveles.
export function stageMastery(index) {
  return index.hasLevels ? 0.75 : STAGE_MASTERY;
}
// Para abrir la parada siguiente hace falta acertar al menos la mitad en esta.
export const UNLOCK_MIN = 0.5;
export const STREAK_MEDALS = [3, 7, 30];

export function emptyProgress() {
  return {
    xp: 0,
    streak: { current: 0, best: 0, last: null, graceOn: null, graceDays: [], days: [] },
    artists: {},
    salas: {},
    intros: {},
    // Carteles de tramo ya vistos: { tramo: 'AAAA-MM-DD' } (el camino enseña cada uno una vez, antes de su primer pintor).
    signs: {},
    reviews: {},
    srs: {},
    collection: {},
    medals: {},
    stats: { answered: 0, correct: 0, newCorrect: 0, rounds: 0 },
    // Reto diario de antes (ya no existe): se conserva tal cual, solo de lectura.
    daily: {},
    weekly: {},
    // Cuadro del día: { 'AAAA-MM-DD': { n, guesses, won, tries } } y el último día que la guía lo propuso (engine/cuadro-dia.js).
    cuadros: {},
    cuadroNudge: '',
    // Niveles «a fondo»: { 'pintor:nivel': { plays, best, mastered, last } } (engine/levels.js).
    deep: {},
    // Propuestas de profundizar (engine/deepen.js): pintores del camino jugados en la última, las últimas ofrecidas, la que
    // está a la vista y los saltos de cada nivel con su día (rotación y enfriamiento).
    deepen: { at: 0, count: 0, recent: [], pending: '', skips: {} },
    // Rango más alto alcanzado (índice en engine/ranks.js): nunca baja.
    rank: 0,
    challenges: { played: 0 },
    xpByDay: {},
    // Cuadros fallados que vuelven: [{ id, date, times, hits }] (engine/review.js).
    fallados: [],
    // Último día en que salió cada pintor en una pregunta: { artistId: 'AAAA-MM-DD' } (engine/review.js).
    seen: {},
    // Cierres de época y de rama ya vistos: { seeded, seen: { clave: 'AAAA-MM-DD' } } (engine/era-end.js). Un estado anterior
    // lo recibe sin sembrar y se siembra al cargar el catálogo: sus cierres de antes cuentan como vistos (como mucho, el último).
    closures: { seeded: false, seen: {} },
    // Invitados ya presentados con su tarjeta: { artistId: 'AAAA-MM-DD' } (engine/guest-intro.js). Solo valen para
    // preguntar por ellos, no para el camino. Un estado anterior lo recibe vacío (state/schema.js mergeDefaults).
    guests: {},
    // «Repasar a…» (engine/recall.js): últimas respuestas de autor y de época [{ t, a, c?, w, ok, d, r? }] y el último pintor o
    // época recordados. Un estado anterior los recibe vacíos (state/schema.js mergeDefaults), sin perder nada.
    slips: [],
    recall: { last: '', date: '' },
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

// --- Racha -------------------------------------------------------------------------
// Cualquier ronda terminada la mantiene (la meta de XP va aparte). Días de gracia: GRACE_PER_WEEK por
// semana (lunes a domingo); cada día perdido gasta uno de la semana en la que cae y se recargan solos
// cada lunes. streak.graceDays guarda los días perdonados. (Aquí y no en un módulo aparte: va en la
// cadena de arranque y cada módulo es una petición más.)

export const GRACE_PER_WEEK = 2;
const STREAK_KEEP_DAYS = 60;
const KEEP_GRACE = 14;

function mondayOf(day) {
  return weekOf(day)[0];
}

function graceDays(streak) {
  return Array.isArray(streak.graceDays) ? streak.graceDays.filter((d) => typeof d === 'string') : [];
}

// Días de gracia que quedan en la semana de `day`.
export function graceLeft(streak, day) {
  const monday = mondayOf(day);
  const used = graceDays(streak).filter((d) => mondayOf(d) === monday).length;
  return Math.max(0, GRACE_PER_WEEK - used);
}

// Días perdidos entre la última práctica y hoy (sin contar ninguno de los dos), o null si alguno no
// cabe en los días de gracia de su semana.
function forgivable(streak, today) {
  const missed = [];
  for (let d = addDays(streak.last, 1); d < today; d = addDays(d, 1)) missed.push(d);
  const probe = { graceDays: graceDays(streak) };
  for (const d of missed) {
    if (graceLeft(probe, d) <= 0) return null;
    probe.graceDays.push(d);
  }
  return missed;
}

// Un día seguido suma; con huecos, los días perdidos gastan días de gracia si quedan en su semana.
// graceUsed: días perdonados en esta llamada (0, 1 o 2).
export function touchStreak(streak, today) {
  const s = { ...streak, days: streak.days ? streak.days.slice() : [], graceDays: graceDays(streak) };
  if (s.last === today) return { streak: s, increased: false, graceUsed: 0 };
  let graceUsed = 0;
  if (!s.last) s.current = 1;
  else {
    const gap = daysBetween(s.last, today);
    // Reloj hacia atrás: no se toca la racha.
    if (gap <= 0) return { streak: s, increased: false, graceUsed: 0 };
    const missed = gap === 1 ? [] : forgivable(s, today);
    if (missed) {
      s.current += 1;
      if (missed.length) {
        s.graceDays = [...s.graceDays, ...missed].slice(-KEEP_GRACE);
        s.graceOn = today;
        graceUsed = missed.length;
      }
    } else s.current = 1;
  }
  s.last = today;
  s.best = Math.max(s.best || 0, s.current);
  if (!s.days.includes(today)) s.days.push(today);
  s.days = s.days.slice(-STREAK_KEEP_DAYS);
  return { streak: s, increased: true, graceUsed };
}

// Racha que se muestra hoy (si ya se rompió, 0): sigue viva mientras los días perdidos quepan en la gracia.
export function visibleStreak(streak, today) {
  if (!streak.last) return 0;
  if (daysBetween(streak.last, today) <= 1) return streak.current;
  return forgivable(streak, today) ? streak.current : 0;
}

// --- Camino: paradas (pintores con etapa y salas) -----------------------------

function stepRecord(progress, step) {
  if (!step) return null;
  return step.type === 'sala' ? progress.salas?.[step.id] : progress.artists?.[step.id];
}

// Parada extra: pintor añadido por una actualización en un tramo que ya tenía superado (engine/roster.js). Se juega
// cuando se quiera y no cuenta como pendiente para abrir nada (ni la parada siguiente, ni ramas, ni repaso, ni época).
export function isExtraStep(progress, step) {
  const extra = progress?.roster?.extra;
  return Boolean(step) && step.type === 'artist' && Array.isArray(extra) && extra.includes(step.id);
}

// Paradas que cuentan para abrir y completar (sin las extra).
export function gateSteps(progress, steps) {
  return steps.filter((s) => !isExtraStep(progress, s));
}

// Parada anterior que la abre: la previa del camino saltando las extra (null si es la primera).
export function gateBefore(progress, index, step) {
  const i = step ? index.stepIndex(step.type, step.id) : -1;
  for (let j = i - 1; j >= 0; j -= 1) if (!isExtraStep(progress, index.steps[j])) return index.steps[j];
  return null;
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
  if (isExtraStep(progress, step)) return true;
  const gate = gateBefore(progress, index, step);
  if (!gate) return true;
  // Puerta de época: además, los imprescindibles de la época que se deja (engine/essentials.js).
  return stepPassed(progress, gate) && !gateEssentials(progress, index, step, gate).length;
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
  const steps = gateSteps(progress, index.stepsOf(movementId));
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
  const states = gateSteps(progress, index.steps).map((s) => stepStatus(progress, index, s));
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
// Las extra, solo cuando no queda otra.
export function nextStep(progress, index) {
  const main = gateSteps(progress, index.steps);
  const extra = index.steps.filter((s) => isExtraStep(progress, s));
  const find = (list, st) => list.find((s) => stepStatus(progress, index, s) === st);
  return find(main, 'available') || find(main, 'started') || find(extra, 'available') || find(extra, 'started') || null;
}

// La intro de un movimiento se muestra la primera vez que se entra en él.
export function needsIntro(progress, index, movementId) {
  if (progress.intros?.[movementId]) return false;
  return !index.stepsOf(movementId).some((s) => stepPlayed(progress, s));
}

// ¿Su tramo sale en el camino (rombo y cartel)? El primer tramo de cada época, el que sigue a su puerta, no: tras las tarjetas
// de la época no aporta nada (decisión de María, 28/11). Sigue existiendo en los datos (abre las ramas, agrupa a los nuevos).
export function hasTramoSign(index, artistId) {
  const artist = index.artist(artistId);
  const first = artist && index.stageArtists(artist.movementId)[0];
  return Boolean(artist?.section) && artist.section !== first?.section;
}

// El cartel de un tramo sale una vez, al entrar por primera vez en él (como la presentación de la época): un paso más del
// camino antes del pintor. Nunca si ya se vio o si ya se jugó algún pintor del tramo.
export function needsTramo(progress, index, artistId) {
  const key = index.artist(artistId)?.section;
  if (!key || progress.signs?.[key] || !hasTramoSign(index, artistId)) return false;
  return !index.path.some((a) => a.section === key && stepPlayed(progress, { type: 'artist', id: a.id }));
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
