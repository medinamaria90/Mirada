// Bots que juegan sin mirar los cuadros (para el test anti-trampa). Puro.
// Cada bot devuelve, para cada pregunta, la probabilidad de acertarla; con eso se calcula la
// probabilidad exacta de dominar la ronda (sin ruido de muestreo).
//
// ctx: { stageArtist, stageMovement, learned:Set, learnedOrder:Map(id → posición en el camino),
//        freq:Map, index }

const uniform = (q) => 1 / q.options.length;
const among = (q, ids) => (ids.length ? (ids.includes(q.answerId) ? 1 / ids.length : 0) : uniform(q));
const has = (q, id) => Boolean(id) && q.options.some((o) => o.id === id);

// Movimiento inmediatamente anterior al de la etapa entre las opciones (la «regla» del exploit).
function previousMovement(q, ctx) {
  const order = (id) => ctx.index?.movement(id)?.order;
  const own = order(ctx.stageMovement);
  if (own == null) return null;
  const prev = q.options.map((o) => o.id).filter((id) => order(id) < own).sort((a, b) => order(b) - order(a));
  return prev[0] || null;
}

// Pintor aprendido más reciente entre las opciones.
function mostRecentLearned(q, ctx) {
  const cands = q.options.map((o) => o.id).filter((id) => ctx.learned.has(id) && id !== ctx.stageArtist);
  if (!cands.length) return null;
  return cands.sort((a, b) => (ctx.learnedOrder.get(b) ?? -1) - (ctx.learnedOrder.get(a) ?? -1))[0];
}

// Distancia entre dos opciones para «el raro de los cuatro»: otra familia pesa más que cualquier
// diferencia de siglos; después, los años (de la obra o del pintor).
const FAMILY_GAP = 1000;
function optionRef(q, o, index) {
  if (q.type === 'which') return index.refOfWork(index.artwork(o.artworkId));
  if (q.type === 'who') return index.refOfArtist(index.artist(o.id));
  return null;
}
function oddDistance(q, a, b, index) {
  const [ra, rb] = [optionRef(q, a, index), optionRef(q, b, index)];
  if (!ra || !rb) return 0;
  return (ra.family === rb.family ? 0 : FAMILY_GAP) + Math.abs(ra.year - rb.year);
}

export const BOTS = {
  // «El raro de los cuatro»: elige la opción más distinta de las otras tres (por familia o siglo); empata al azar. La buena no debe ser casi nunca la rara.
  // En «¿De qué movimiento?» las opciones van en orden cronológico y su posición ya la vigilan los bots
  // de posición, así que ahí el raro elige al azar.
  raro(q, ctx) {
    if (q.type === 'movement') return uniform(q);
    const odd = q.options.map((o) => q.options.reduce((n, other) => n + oddDistance(q, o, other, ctx.index), 0));
    const max = Math.max(...odd);
    const top = q.options.filter((o, i) => odd[i] === max).map((o) => o.id);
    return among(q, top);
  },
  // Siempre el pintor / movimiento de la etapa si está entre las opciones; si no, al azar.
  stage(q, ctx) {
    if (q.type === 'who' && has(q, ctx.stageArtist)) return q.answerId === ctx.stageArtist ? 1 : 0;
    if (q.type === 'movement' && has(q, ctx.stageMovement)) return q.answerId === ctx.stageMovement ? 1 : 0;
    return uniform(q);
  },
  // Siempre la opción que más se repite en la ronda (entre preguntas de texto).
  frequent(q, ctx) {
    if (q.type === 'which') return uniform(q);
    let max = 0;
    for (const o of q.options) max = Math.max(max, ctx.freq.get(o.id) || 0);
    const tied = q.options.filter((o) => (ctx.freq.get(o.id) || 0) === max).map((o) => o.id);
    return among(q, tied);
  },
  // Siempre un pintor ya aprendido distinto del de la etapa (si no hay, el de la etapa).
  learned(q, ctx) {
    if (q.type === 'who') {
      const cands = q.options.map((o) => o.id).filter((id) => ctx.learned.has(id) && id !== ctx.stageArtist);
      if (cands.length) return among(q, cands);
    }
    return BOTS.stage(q, ctx);
  },
  // Bot mixto del evaluador (ronda 3): en «¿Quién?», si están el de la etapa y alguno aprendido,
  // moneda entre el de la etapa y uno aprendido; en «¿De qué movimiento?», el inmediatamente anterior.
  mixed(q, ctx) {
    if (q.type === 'who') {
      const learned = q.options.map((o) => o.id).filter((id) => ctx.learned.has(id) && id !== ctx.stageArtist);
      const stage = has(q, ctx.stageArtist);
      if (stage && learned.length) return 0.5 * (q.answerId === ctx.stageArtist ? 1 : 0) + 0.5 * among(q, learned);
      if (stage) return q.answerId === ctx.stageArtist ? 1 : 0;
      if (learned.length) return among(q, learned);
      return uniform(q);
    }
    if (q.type === 'movement') {
      const prev = previousMovement(q, ctx);
      if (prev) return q.answerId === prev ? 1 : 0;
      return BOTS.stage(q, ctx);
    }
    return uniform(q);
  },
  // Siempre el movimiento inmediatamente anterior; en «¿Quién?», el de la etapa.
  previous(q, ctx) {
    if (q.type === 'movement') {
      const prev = previousMovement(q, ctx);
      if (prev) return q.answerId === prev ? 1 : 0;
    }
    return BOTS.stage(q, ctx);
  },
  // El aprendido más reciente (y su movimiento); si no hay, el de la etapa.
  recent(q, ctx) {
    if (q.type === 'who') {
      const id = mostRecentLearned(q, ctx);
      if (id) return q.answerId === id ? 1 : 0;
    }
    if (q.type === 'movement' && ctx.index) {
      const lastLearned = [...ctx.learned].sort((a, b) => (ctx.learnedOrder.get(b) ?? -1) - (ctx.learnedOrder.get(a) ?? -1))[0];
      const mov = lastLearned ? ctx.index.artist(lastLearned)?.movementId : null;
      if (has(q, mov)) return q.answerId === mov ? 1 : 0;
    }
    return BOTS.stage(q, ctx);
  },
  // Nunca el de la etapa: al azar entre las demás opciones.
  notStage(q, ctx) {
    const avoid = q.type === 'who' ? ctx.stageArtist : q.type === 'movement' ? ctx.stageMovement : null;
    const ids = q.options.map((o) => o.id).filter((id) => id !== avoid);
    return among(q, ids);
  },
  // Siempre la primera opción (o cualquier posición fija): la posición de la respuesta es uniforme.
  first(q) {
    return q.options[0].id === q.answerId ? 1 : 0;
  },
  // Siempre la 2.ª, la 3.ª o la 4.ª opción: en «¿De qué movimiento es?» las opciones van en orden cronológico,
  // así que la posición de la buena no puede ser predecible.
  second(q) {
    return q.options[1].id === q.answerId ? 1 : 0;
  },
  third(q) {
    return q.options[2].id === q.answerId ? 1 : 0;
  },
  fourth(q) {
    return q.options[3].id === q.answerId ? 1 : 0;
  },
};

// Alumno que conoce a todos los pintores anteriores pero NO ha estudiado al de la etapa, y responde
// por descarte: si la obra es de un pintor conocido, acierta; si no, elige al azar entre las
// opciones que no son de pintores conocidos. Movimiento: conoce el de los pintores conocidos; si no,
// apuesta por el de la etapa. Necesita ctx.index.
export function eliminator(q, ctx) {
  const index = ctx.index;
  const known = (id) => ctx.learned.has(id);
  if (known(q.artistId)) return 1;
  if (q.type === 'who') return among(q, q.options.map((o) => o.id).filter((id) => !known(id)));
  if (q.type === 'which') return among(q, q.options.filter((o) => !known(index.artwork(o.artworkId).artistId)).map((o) => o.id));
  if (has(q, ctx.stageMovement)) return q.answerId === ctx.stageMovement ? 1 : 0;
  return uniform(q);
}

export function roundContext(index, questions, { stageArtist = null, stageMovement = null, learned = [] } = {}) {
  const freq = new Map();
  for (const q of questions) {
    if (q.type === 'which') continue;
    for (const o of q.options) freq.set(o.id, (freq.get(o.id) || 0) + 1);
  }
  return {
    index, stageArtist, stageMovement, freq,
    learned: new Set(learned),
    learnedOrder: new Map(learned.map((id, i) => [id, i])),
  };
}

// Distribución del número de aciertos de una suma de Bernoulli(p_i).
export function distribution(ps) {
  let dist = [1];
  for (const p of ps) {
    const next = Array(dist.length + 1).fill(0);
    dist.forEach((v, k) => { next[k] += v * (1 - p); next[k + 1] += v * p; });
    dist = next;
  }
  return dist;
}

// P(suma de Bernoulli(p_i) >= need)
export function probAtLeast(ps, need) {
  return distribution(ps).slice(Math.max(0, need)).reduce((a, b) => a + b, 0);
}

const needOf = (n, share) => Math.ceil(share * n - 1e-9);

// Probabilidad exacta de dominar la ronda. Con opts.ownArtist (etapa) se exige además la regla de
// las preguntas propias (opts.ownRule, p. ej. progress.ownRoundMastered: recibe [{ q, correct }]);
// se enumeran todos los resultados posibles de las propias (como mucho 2^6).
export function masteryProbability(bot, questions, ctx, mastery = 0.75, opts = {}) {
  const need = needOf(questions.length, mastery);
  const ps = questions.map((q) => bot(q, ctx));
  if (!opts.ownArtist) return probAtLeast(ps, need);
  const own = [];
  const rest = [];
  questions.forEach((q, i) => (q.artistId === opts.ownArtist ? own : rest).push(i));
  const restDist = distribution(rest.map((i) => ps[i]));
  const rule = opts.ownRule || ((ans) => ans.filter((a) => a.correct).length >= needOf(ans.length, opts.ownShare ?? 0));
  let total = 0;
  for (let mask = 0; mask < 1 << own.length; mask++) {
    let p = 1;
    let k = 0;
    const answers = own.map((i, j) => {
      const correct = Boolean((mask >> j) & 1);
      p *= correct ? ps[i] : 1 - ps[i];
      k += correct ? 1 : 0;
      return { q: questions[i], correct };
    });
    if (!p || !rule(answers)) continue;
    let tail = 0;
    for (let j = Math.max(0, need - k); j < restDist.length; j++) tail += restDist[j];
    total += p * tail;
  }
  return total;
}

// Alumno que mira (para el test de dominio justo): acierta con pKnown las preguntas sobre pintores ya
// aprendidos, con pSeen las obras vistas del de la etapa y con pNew sus obras nuevas.
export function student(pKnown, pSeen, pNew) {
  return (q, ctx) => (q.artistId === ctx.stageArtist ? (q.isNew ? pNew : pSeen) : pKnown);
}

// Alumno atento del evaluador (ronda 6): acierta con pSeen las obras ya enseñadas (role `learn`, de
// cualquier pintor) y con pUnseen las que nunca se han enseñado, sin mirar de qué pintor son.
export function attentive(pSeen = 0.88, pUnseen = 0.7) {
  return (q) => (q.isNew ? pUnseen : pSeen);
}
