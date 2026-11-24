// Ejecución de una ronda ya planificada (engine/planner.js). Pura.

// Ejecución de una ronda (pura): los fallos vuelven al final una vez. extras: preguntas que no cuentan
// (cuadros fallados en rondas anteriores, engine/fallados.js); van al final como reintentos.
export function createRound(questions, extras = []) {
  const again = questions.length ? extras.map((q) => ({ q, base: 0, retry: true })) : [];
  return {
    queue: [...questions.map((q, i) => ({ q, base: i, retry: false })), ...again],
    pos: 0,
    baseCount: questions.length,
    firstTry: Array(questions.length).fill(null),
    combo: 0,
    bestCombo: 0,
  };
}

export function currentItem(round) {
  return round.queue[round.pos] || null;
}

export function answerRound(round, correct, reshuffle = (q) => q) {
  const item = currentItem(round);
  if (!item) return round;
  const queue = round.queue.slice();
  const firstTry = round.firstTry.slice();
  if (!item.retry) firstTry[item.base] = correct;
  if (!correct && !item.retry) queue.push({ q: reshuffle(item.q), base: item.base, retry: true });
  const combo = correct ? round.combo + 1 : 0;
  return { ...round, queue, firstTry, pos: round.pos + 1, combo, bestCombo: Math.max(round.bestCombo, combo) };
}

export function roundDone(round) {
  return round.pos >= round.queue.length;
}

export function roundProgress(round) {
  return round.queue.length ? round.pos / round.queue.length : 1;
}

export function roundScore(round) {
  return round.firstTry.filter((v) => v === true).length;
}
