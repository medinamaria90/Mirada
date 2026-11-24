// Reto a un amigo codificado en un hash plano: #reto-<semilla>-<aciertos>.
// La semilla describe la ronda para poder reconstruirla igual en otro dispositivo:
//   s<idx>x<seed>  etapa del pintor nº idx del camino
//   m<idx>x<seed>  repaso del movimiento nº idx
//   r<idx>x<seed>  sala del movimiento nº idx (movimiento sin pintores con etapa)
//   d<AAAAMMDD>    reto diario de esa fecha
//   w<AAAAss>      reto semanal de esa semana ISO
//   g<seed>        ronda general
// idx y seed van en base 36. Solo letras minúsculas, dígitos y guiones.

// La ronda de un reto se reconstruye con planChallenge (engine/daily.js); este módulo solo
// codifica y valida el enlace (lo usa el enrutado al arrancar, sin cargar el planificador).
import { compactDay, expandDay, expandWeek, isoWeek } from './dates.js';

const HASH_RE = /^reto-([a-z0-9]{2,24})-(\d{1,2})$/;

export function tokenForRound(index, round) {
  const seed = (round.seed >>> 0).toString(36);
  if (round.kind === 'stage') return `s${index.pathIndex(round.artistId).toString(36)}x${seed}`;
  if (round.kind === 'review') {
    const i = index.movements.findIndex((m) => m.id === round.movementId);
    return `m${i.toString(36)}x${seed}`;
  }
  if (round.kind === 'sala') {
    const i = index.movements.findIndex((m) => m.id === round.movementId);
    return i < 0 ? null : `r${i.toString(36)}x${seed}`;
  }
  if (round.kind === 'daily') return `d${compactDay(round.date)}`;
  if (round.kind === 'weekly') return `w${round.week.replace('-W', '')}`;
  if (round.kind === 'general') return `g${seed}`;
  return null;
}

export function encodeChallenge(token, score) {
  const s = Math.max(0, Math.min(99, Math.floor(score)));
  return `reto-${token}-${s}`;
}

// Retos diarios: solo fechas reales desde que existe el juego y nunca futuras (si se sabe el día).
export const FIRST_DAILY = '2026-01-01';
export const FIRST_WEEKLY = '2026-W01';
const MAX_SEED = 0xffffffff;

// opts.today: día de hoy (AAAA-MM-DD, el del reto diario) para rechazar diarios futuros.
export function decodeChallenge(hash, opts = {}) {
  const text = String(hash || '').replace(/^#/, '');
  const m = HASH_RE.exec(text);
  if (!m) return null;
  const descriptor = parseToken(m[1], opts);
  if (!descriptor) return null;
  return { token: m[1], score: Number(m[2]), ...descriptor };
}

export function parseToken(token, opts = {}) {
  let m = /^([smr])([0-9a-z]{1,3})x([0-9a-z]{1,7})$/.exec(token);
  if (m) {
    const kind = { s: 'stage', m: 'review', r: 'sala' }[m[1]];
    const seed = parseInt(m[3], 36);
    return seed <= MAX_SEED ? { kind, idx: parseInt(m[2], 36), seed } : null;
  }
  m = /^d(\d{8})$/.exec(token);
  if (m) {
    const date = expandDay(m[1]);
    if (!date || date < FIRST_DAILY || (opts.today && date > opts.today)) return null;
    return { kind: 'daily', date };
  }
  m = /^(w\d{6})$/.exec(token);
  if (m) {
    const week = expandWeek(m[1]);
    if (!week || week < FIRST_WEEKLY || (opts.today && week > isoWeek(opts.today).key)) return null;
    return { kind: 'weekly', week };
  }
  m = /^g([0-9a-z]{1,7})$/.exec(token);
  if (m) {
    const seed = parseInt(m[1], 36);
    return seed <= MAX_SEED ? { kind: 'general', seed } : null;
  }
  return null;
}
