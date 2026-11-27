// Cuadro del día: un solo cuadro famoso, el mismo para todos en el día de Madrid. «¿De quién es?» con 6 pintores y 4 intentos;
// cada fallo apaga ese nombre y enseña más (CUADRO_STEPS). El calendario es una lista curada (contenido/cuadro-del-dia/,
// volcada a data/dia/ por tools/sync_cuadro_dia.py): el día de estreno es el n.º 1 y cada día usa calendario[(n - 1) % largo],
// así que añadir obras al catálogo no mueve ningún día y, si se acaba la lista, vuelve a empezar. Puro.

import { isDayKey } from './dates.js';
import { dayNumber, entryFor, slotFor, daysLeft, calendarAlarm, cropRect, tryLabel, CUADRO_ALARM_DAYS, CUADRO_ROUTE, DETAIL_ZOOM, LOST_LABEL } from './cuadro-calendar.js';
import { normalizeGoal, touchStreak, STREAK_MEDALS } from './progress.js';
import { rankFor, RANKS } from './ranks.js';

// El calendario y el encuadre (ui/shell.js los usa en la cabecera sin cargar el resto).
export { dayNumber, entryFor, slotFor, daysLeft, calendarAlarm, cropRect, tryLabel, CUADRO_ALARM_DAYS, CUADRO_ROUTE, DETAIL_ZOOM, LOST_LABEL };

export const CUADRO_TRIES = 4;
export const CUADRO_OPTIONS = 6;
// Lo que enseña cada paso (paso = fallos + 1): zoom sobre el detalle elegido y qué pista se suma.
export const CUADRO_STEPS = Object.freeze([
  { zoom: DETAIL_ZOOM, hint: null },
  { zoom: 1.6, hint: 'era' },
  { zoom: 1, hint: 'year' },
  { zoom: 1, hint: 'museum' },
]);
export const CUADRO_XP = { won: 10, lost: 5 };
export const MEDAL_FIRST = 'daily-1';
export const MEDAL_PERFECT = 'daily-perfect';

// Partida: { guesses: [pintor], won }. Termina al acertar o al gastar los intentos.
export const newGame = () => ({ guesses: [], won: false });
export const isOver = (game) => Boolean(game.won || game.guesses.length >= CUADRO_TRIES);
export const misses = (game) => game.guesses.length - (game.won ? 1 : 0);

// Paso que se enseña (1 a 4); terminada, 0: el cuadro entero y todas las pistas.
export function revealStep(game) {
  if (isOver(game)) return 0;
  return Math.min(CUADRO_STEPS.length, misses(game) + 1);
}

// Pistas visibles: las de los pasos ya alcanzados (todas al terminar), en orden.
export function hintsFor(game) {
  const step = revealStep(game);
  const upTo = step === 0 ? CUADRO_STEPS.length : step;
  return CUADRO_STEPS.slice(0, upTo).map((s) => s.hint).filter(Boolean);
}

// Zoom del cuadro en el paso actual (1 = entero).
export const zoomFor = (game) => (revealStep(game) === 0 ? 1 : CUADRO_STEPS[revealStep(game) - 1].zoom);

// Intento: devuelve la partida nueva o la misma si no vale (terminada, nombre repetido o que no está entre las opciones).
export function guess(game, entry, artistId) {
  if (isOver(game) || game.guesses.includes(artistId) || !entry.options.includes(artistId)) return game;
  return { guesses: [...game.guesses, artistId], won: artistId === entry.artistId };
}

// Registro guardado de un día: { n, guesses, won, tries }.
export function cuadroRecord(n, game) {
  return { n, guesses: game.guesses.slice(), won: Boolean(game.won), tries: game.guesses.length };
}

export const cuadroCount = (progress) => Object.keys(progress?.cuadros || {}).filter(isDayKey).length;
export const cuadroOf = (progress, day) => progress?.cuadros?.[day] || null;

// Aplica el cuadro de un día al progreso una sola vez: lo guarda, da XP (10 si se acierta, 5 si no), cuenta para la meta y
// la racha general, y las medallas «Primer cuadro del día» y «A la primera». `today`: día local de la racha y la XP.
export function finishCuadro(progress, index, { date, n, game }, today, opts = {}) {
  if (!isDayKey(date) || !isOver(game) || progress.cuadros?.[date]) return { progress, events: [], xp: 0, applied: false };
  const p = JSON.parse(JSON.stringify(progress));
  const events = [];
  const award = (id) => {
    if (!p.medals[id]) { p.medals[id] = today; events.push({ type: 'medal', id }); }
  };
  const record = cuadroRecord(n, game);
  p.cuadros = { ...(p.cuadros || {}), [date]: record };
  award(MEDAL_FIRST);
  if (record.won && record.tries === 1) award(MEDAL_PERFECT);
  const xp = record.won ? CUADRO_XP.won : CUADRO_XP.lost;
  p.xp = (Number(p.xp) || 0) + xp;
  p.xpByDay = { ...(p.xpByDay || {}) };
  const before = Number(p.xpByDay[today]) || 0;
  p.xpByDay[today] = before + xp;
  const goal = opts.goal ? normalizeGoal(opts.goal) : null;
  if (goal && before < goal && before + xp >= goal) { events.push({ type: 'goal', goal }); award('goal-1'); }
  const touch = touchStreak(p.streak, today);
  p.streak = touch.streak;
  if (touch.increased) events.push({ type: 'streak', value: p.streak.current, grace: touch.graceUsed });
  for (const k of STREAK_MEDALS) if (p.streak.current >= k) award(`streak-${k}`);
  if (index) {
    const rank = rankFor(p, index);
    if (rank.index > (Number(p.rank) || 0)) { p.rank = rank.index; events.push({ type: 'rank', index: rank.index, name: RANKS[rank.index].name }); }
  }
  return { progress: p, events, xp, applied: true, record };
}

// Cuadritos: uno por intento (🟥 fallo, 🟩 acierto) y ⬛ los que no hizo falta usar.
export function cuadroGrid(record) {
  const marks = (record.guesses || []).map((_, i) => (record.won && i === record.guesses.length - 1 ? '🟩' : '🟥'));
  while (marks.length < CUADRO_TRIES) marks.push('⬛');
  return marks.join('');
}

// Texto para compartir: sin pintor, título ni año (no destripa el cuadro a quien aún no lo ha jugado).
export function cuadroShareText(record, url) {
  return [`Sfumato · Cuadro del día ${record.n}`, `🖼️ ${cuadroGrid(record)}`, url].filter(Boolean).join('\n');
}

// ¿Lo propone la guía de «siguiente paso» como acción secundaria? Una vez al día (progress.cuadroNudge guarda el día), si
// está pendiente y nunca tras una ronda floja.
export function cuadroNudge(progress, day, { weak = false } = {}) {
  return !weak && isDayKey(day) && !cuadroOf(progress, day) && progress?.cuadroNudge !== day;
}
export const markNudged = (progress, day) => (progress.cuadroNudge === day ? progress : { ...progress, cuadroNudge: day });

// «6 h» hasta el siguiente (medianoche en Madrid); por debajo de una hora, «menos de 1 h». `madridClock`: { h, m }.
export function nextInLabel({ h, m }) {
  const mins = 24 * 60 - (h * 60 + m);
  return mins < 60 ? 'menos de 1 h' : `${Math.floor(mins / 60)} h`;
}
