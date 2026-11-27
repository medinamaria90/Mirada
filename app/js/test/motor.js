// Test de cultura pictórica (página de gancho app/test/): motor adaptativo. Puro: sin DOM.
//
// Banco fijo de 5 tramos × 8 preguntas (app/test/preguntas.json), en orden dentro de cada tramo.
// Se juega por bloques de 4 del tramo actual, empezando por el fácil. Al cerrar un bloque:
//   · 3 o 4 aciertos → sube de tramo;
//   · 2 aciertos      → repite tramo (las 4 siguientes; si el tramo está agotado, sube);
//   · 0 o 1           → se para (acertar al tuntún con 4 opciones es 1 de 4) y muestra el resultado.
// También se para al agotar el banco (en el último tramo se siguen jugando sus bloques mientras
// queden). Sin pausas: el test sigue solo mientras se acierte (como mucho MAX_QUESTIONS). «Ver mi
// resultado» vale en cualquier momento.
//
// Puntuación acumulada: cada acierto suma los puntos de su tramo (1, 2, 3, 4, 5), así quien llega
// más lejos y ve más preguntas suma más. El máximo honesto (todo acierto) es perfectScore(bank).

export const TIERS = [
  { id: 1, key: 'facil', name: 'Fácil', points: 1 },
  { id: 2, key: 'media', name: 'Media', points: 2 },
  { id: 3, key: 'dificil', name: 'Difícil', points: 3 },
  { id: 4, key: 'experto', name: 'Experto', points: 4 },
  { id: 5, key: 'friki', name: 'Friki', points: 5 },
];
export const PER_TIER = 8;
export const BLOCK = 4;
export const UP_FROM = 3; // aciertos del bloque para subir de tramo
export const STOP_BELOW = 2; // con menos aciertos que esto, se para
export const MAX_QUESTIONS = TIERS.length * PER_TIER;
export const KINDS = ['who', 'movement', 'which'];
export const OPTIONS_PER_QUESTION = 4;

export const tierById = (id) => TIERS.find((t) => t.id === id) || null;

// Preguntas del banco de un tramo, en su orden.
const ofTier = (bank, tier) => bank.filter((q) => q.tier === tier);

// Estado inicial: en el primer tramo, con su primera pregunta en pantalla.
export function createTest(bank) {
  const state = { bank, tier: TIERS[0].id, used: {}, answers: [], block: [], status: 'playing', reason: null, current: null };
  return nextQuestion(state);
}

// Siguiente pregunta no jugada del tramo actual; null si el tramo está agotado.
function pending(state, tier = state.tier) {
  const used = state.used[tier] || 0;
  return ofTier(state.bank, tier)[used] || null;
}

function nextQuestion(state) {
  const q = pending(state);
  if (!q) return finish(state, 'bank');
  return { ...state, status: 'playing', current: q, used: { ...state.used, [state.tier]: (state.used[state.tier] || 0) + 1 } };
}

export function currentQuestion(state) {
  return state.status === 'playing' ? state.current : null;
}

// Responde la pregunta en pantalla. Devuelve el estado con la respuesta anotada y el bloque
// actualizado; la pregunta sigue en `current` para pintar el feedback hasta llamar a advance().
export function answer(state, optionId) {
  const q = state.current;
  if (!q || state.status !== 'playing' || state.answers.some((a) => a.id === q.id)) return state;
  const correct = optionId === q.answer;
  const points = correct ? tierById(q.tier).points : 0;
  const entry = { id: q.id, tier: q.tier, correct, points, picked: optionId };
  return { ...state, answers: [...state.answers, entry], block: [...state.block, entry] };
}

export function isAnswered(state) {
  return Boolean(state.current) && state.answers.some((a) => a.id === state.current.id);
}

// Tras el feedback: siguiente pregunta o fin según la regla del bloque.
export function advance(state) {
  if (state.status !== 'playing' || !isAnswered(state)) return state;
  if (state.block.length < BLOCK) return nextQuestion(state);
  const hits = state.block.filter((a) => a.correct).length;
  if (hits < STOP_BELOW) return finish(state, 'stop');
  // En el último tramo no hay a dónde subir: se siguen jugando sus bloques mientras queden.
  const wanted = Math.min(hits >= UP_FROM ? state.tier + 1 : state.tier, TIERS[TIERS.length - 1].id);
  const tier = TIERS.map((t) => t.id).find((id) => id >= wanted && pending(state, id));
  if (!tier) return finish(state, 'bank');
  return nextQuestion({ ...state, tier, block: [] });
}

// «Ver mi resultado» (en cualquier momento) o fin por regla. reason: 'stop' | 'bank' | 'user'.
export function finish(state, reason = 'user') {
  if (state.status === 'done') return state;
  return { ...state, status: 'done', reason, current: null };
}

export function score(state) {
  return state.answers.reduce((n, a) => n + a.points, 0);
}

// Resumen para el resultado: aciertos, preguntas vistas, puntos, tramo máximo y desglose por tramo
// (solo los tramos jugados).
export function summary(state) {
  const asked = state.answers.length;
  const correct = state.answers.filter((a) => a.correct).length;
  const tiers = TIERS
    .map((t) => {
      const list = state.answers.filter((a) => a.tier === t.id);
      return { ...t, asked: list.length, correct: list.filter((a) => a.correct).length, points: list.reduce((n, a) => n + a.points, 0) };
    })
    .filter((t) => t.asked);
  const top = tiers.length ? tiers[tiers.length - 1] : TIERS[0];
  return { asked, correct, score: score(state), top, tiers, reason: state.reason };
}

// Juega el test entero con una política decide(question) → true si acierta. Devuelve el estado
// final (para las pruebas). Si la política devuelve el id de una opción, se usa tal cual.
export function simulate(bank, decide) {
  let state = createTest(bank);
  while (state.status !== 'done') {
    const q = state.current;
    const r = decide(q);
    const pick = typeof r === 'string' ? r : r ? q.answer : q.options.find((o) => o !== q.answer);
    state = advance(answer(state, pick));
  }
  return { state };
}

// Puntos del jugador que lo acierta todo (sube de tramo con cada bloque y apura el último).
export function perfectScore(bank) {
  return score(simulate(bank, () => true).state);
}
