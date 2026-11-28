// Qué pintor o qué época se le está olvidando (para «Repasar a…»). Puro.
// Cada respuesta de autor («¿Quién lo pintó?», «¿Cuál es de X?») o de época («¿De qué movimiento es?») queda en un registro
// corto (progress.slips). Un fallo cuenta para el que era la respuesta y para el elegido por error. No cuentan las preguntas
// sobre el propio pintor (o la propia sala) de la ronda que se juega: aprender a uno nuevo no es olvidarlo. Con bastantes
// fallos recientes, la guía propone «Repasar a Vermeer» o «Repasar el Barroco» (engine/next-step.js); al terminar esa
// sesión, su cuenta vuelve a cero. Repasar y recordar son lo mismo: una sola sesión por pintor («Repasar a Vermeer»).

import { addDays } from './dates.js';

// Criterio, fácil de ajustar: RECALL_SLIPS fallos en los últimos RECALL_WINDOW_DAYS días, o menos de RECALL_LOW_RATE de
// aciertos con RECALL_MIN_ASKED preguntas o más.
export const RECALL_SLIPS = 3;
export const RECALL_WINDOW_DAYS = 14;
export const RECALL_MIN_ASKED = 6;
export const RECALL_LOW_RATE = 0.5;
// Registro: las últimas RECALL_LOG_MAX respuestas.
export const RECALL_LOG_MAX = 80;
// «No lo sé» (ui/screens/lesson.js) pesa más que un fallo: no acordarse es la señal más clara.
export const RECALL_DUNNO_WEIGHT = 2;
// Confusión: elegir Y siendo X (o al revés) al menos estas veces.
export const CONFUSION_MIN = 2;

export const ARTIST = 'artist';
export const MOVEMENT = 'movement';
// Las de concepto (engine/concepts.js) cuentan para la época por la que preguntan.
const TYPE_OF_QUESTION = { who: ARTIST, which: ARTIST, movement: MOVEMENT, concept: MOVEMENT };
const CODE = { [ARTIST]: 'a', [MOVEMENT]: 'm' };

export const recallKey = (type, id) => `${type}:${id}`;
// La sesión «Repasar a Vermeer» / «Repasar el Barroco» (ui/screens/recall.js).
export const recallRoute = (type, id) => (type === MOVEMENT ? `repasar-epoca-${id}` : `repasar-${id}`);
export const movementLabel = (m) => `${/^estampa/i.test(m.name) ? 'la' : 'el'} ${m.name}`;
export const recallLabel = (index, type, id) => (type === MOVEMENT ? `Repasar ${movementLabel(index.movement(id))}` : `Repasar a ${index.artist(id).short || index.artist(id).name}`);

export function cleanSlips(list) {
  return (Array.isArray(list) ? list : []).filter((e) => e && (e.t === 'a' || e.t === 'm') && typeof e.a === 'string' && typeof e.d === 'string');
}

// De quién (pintor) o de qué época era lo elegido; null si no se sabe.
function chosenOf(index, q, chosen) {
  if (!chosen || chosen === q.answerId) return null;
  // En las de concepto, solo las opciones con cuadro dicen de qué época era lo elegido.
  if (q.type === 'concept') return (q.options || []).find((o) => o.id === chosen)?.movementId || null;
  if (q.type === 'which') {
    const option = (q.options || []).find((o) => o.id === chosen);
    const work = option ? index.artwork(option.artworkId || option.id) : null;
    return work ? work.artistId : null;
  }
  return chosen;
}

// Añade las respuestas de una ronda al registro. answers: [{ q, correct, retry, chosen, dunno? }] («No lo sé»: peso
// RECALL_DUNNO_WEIGHT en `n`). opts.skip(a): respuestas que no
// cuentan (pintores aún no vistos). opts.round: { artistId, movementId } de la ronda (lo propio no cuenta).
export function logAnswers(list, answers, index, today, { skip = () => false, round = {} } = {}) {
  const out = cleanSlips(list).slice();
  for (const ans of answers || []) {
    const q = ans?.q;
    const type = q && TYPE_OF_QUESTION[q.type];
    if (!type || ans.retry || skip(ans)) continue;
    const subject = type === ARTIST ? q.artistId : q.type === 'concept' ? q.movementId : q.answerId;
    if (!subject) continue;
    const own = type === ARTIST ? round.artistId : round.movementId;
    const entry = { t: CODE[type], a: subject, d: today, ok: ans.correct ? 1 : 0, w: q.type === 'which' ? q.targetArtworkId : q.artworkId };
    if (ans.dunno) entry.n = RECALL_DUNNO_WEIGHT;
    else if (!ans.correct) {
      const c = chosenOf(index, q, ans.chosen);
      if (c && c !== subject) entry.c = c;
    }
    if (own && (own === subject || own === entry.c)) entry.r = own;
    out.push(entry);
  }
  return out.slice(-RECALL_LOG_MAX);
}

// Cuentas recientes por pintor o época: Map 'artist:id' → { type, id, slips, asked, ok, with: Map(otro → veces), works: [obras falladas] }.
export function recallStats(list, today) {
  const from = typeof today === 'string' && today ? addDays(today, -RECALL_WINDOW_DAYS) : '';
  const stats = new Map();
  const get = (type, id) => {
    const key = recallKey(type, id);
    if (!stats.has(key)) stats.set(key, { type, id, slips: 0, asked: 0, ok: 0, with: new Map(), works: [] });
    return stats.get(key);
  };
  for (const e of cleanSlips(list)) {
    if (e.d < from) continue;
    const type = e.t === 'a' ? ARTIST : MOVEMENT;
    if (e.r !== e.a) {
      const s = get(type, e.a);
      s.asked += 1;
      s.ok += e.ok ? 1 : 0;
      if (!e.ok) {
        s.slips += Number.isInteger(e.n) && e.n > 0 ? e.n : 1;
        if (e.w) s.works.push(e.w);
        if (e.c) s.with.set(e.c, (s.with.get(e.c) || 0) + 1);
      }
    }
    if (!e.ok && e.c && e.r !== e.c) {
      const s = get(type, e.c);
      s.slips += 1;
      s.with.set(e.a, (s.with.get(e.a) || 0) + 1);
    }
  }
  return stats;
}

export const isForgotten = (s) => s.slips >= RECALL_SLIPS || (s.asked >= RECALL_MIN_ASKED && s.ok / s.asked < RECALL_LOW_RATE);

// ¿Lo ha aprendido? Un pintor dominado; una época con algún pintor (o su sala) dominado.
export function isLearned(progress, index, type, id) {
  if (type === ARTIST) return Boolean(index.artist(id) && progress.artists?.[id]?.mastered);
  if (!index.movement(id)) return false;
  return index.stepsOf(id).some((s) => (s.type === 'sala' ? progress.salas?.[s.id]?.mastered : progress.artists?.[s.id]?.mastered));
}

// Con quién lo confunde: el otro pintor (u otra época) más elegido en su lugar, CONFUSION_MIN veces o más y ya conocido. null si no.
export function confusedWith(progress, index, stat) {
  if (!stat) return null;
  const ranked = [...stat.with.entries()].sort((a, b) => b[1] - a[1]);
  for (const [id, n] of ranked) {
    if (n < CONFUSION_MIN) break;
    const known = stat.type === ARTIST ? (progress.artists?.[id]?.plays || 0) > 0 : Boolean(index.movement(id));
    if (known) return id;
  }
  return null;
}

// Lo que más se le olvida: { type, id, slips, confused } o null. A igualdad, el que era la respuesta antes que el elegido. Nunca el último que recordó (progress.recall.last).
export function forgottenSubject(progress, index, today) {
  if (!cleanSlips(progress.slips).length) return null;
  const last = progress.recall?.last || '';
  const list = [...recallStats(progress.slips, today).values()]
    .filter((s) => recallKey(s.type, s.id) !== last && isForgotten(s) && isLearned(progress, index, s.type, s.id))
    .sort((a, b) => b.slips - a.slips || (b.asked - b.ok) - (a.asked - a.ok) || a.ok / Math.max(1, a.asked) - b.ok / Math.max(1, b.asked) || (a.type === ARTIST ? -1 : 1));
  const top = list[0];
  return top ? { type: top.type, id: top.id, slips: top.slips, confused: confusedWith(progress, index, top) } : null;
}

// Sesión terminada: la cuenta de ese pintor o época vuelve a cero y queda como el último recordado.
export function forgetSlips(list, type, id) {
  const code = CODE[type];
  return cleanSlips(list).filter((e) => !(e.t === code && (e.a === id || e.c === id)));
}

export function finishRecall(progress, type, id, today) {
  return { ...progress, slips: forgetSlips(progress.slips, type, id), recall: { last: recallKey(type, id), date: today } };
}
