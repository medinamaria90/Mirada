// Racha diaria. Puro. Cualquier ronda terminada la mantiene (la meta de XP va aparte, en progress.js).
// Días de gracia: GRACE_PER_WEEK por semana (lunes a domingo); cada día perdido gasta uno de la
// semana en la que cae y se recargan solos cada lunes. streak.graceDays guarda los días perdonados.

import { daysBetween, addDays, weekOf } from './dates.js';

export const GRACE_PER_WEEK = 2;
const KEEP_DAYS = 60;
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
  s.days = s.days.slice(-KEEP_DAYS);
  return { streak: s, increased: true, graceUsed };
}

// Racha que se muestra hoy (si ya se rompió, 0): sigue viva mientras los días perdidos quepan en la gracia.
export function visibleStreak(streak, today) {
  if (!streak.last) return 0;
  if (daysBetween(streak.last, today) <= 1) return streak.current;
  return forgivable(streak, today) ? streak.current : 0;
}
