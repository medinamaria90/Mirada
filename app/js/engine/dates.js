// Fechas locales como texto 'AAAA-MM-DD'. Las diferencias se calculan en UTC
// a partir de los componentes para que los cambios de hora no descuadren los días.

export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isDayKey(text) {
  return typeof text === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(text);
}

function toUtc(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function daysBetween(fromKey, toKey) {
  return Math.round((toUtc(toKey) - toUtc(fromKey)) / 86400000);
}

export function addDays(key, n) {
  const t = new Date(toUtc(key) + n * 86400000);
  const y = t.getUTCFullYear();
  const m = String(t.getUTCMonth() + 1).padStart(2, '0');
  const d = String(t.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Lunes a domingo de la semana que contiene `key`.
export function weekOf(key) {
  const weekday = (new Date(toUtc(key)).getUTCDay() + 6) % 7;
  const monday = addDays(key, -weekday);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function compactDay(key) {
  return key.replace(/-/g, '');
}

export function expandDay(compact) {
  if (!/^\d{8}$/.test(compact)) return null;
  const key = `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null;
  return key;
}

// Día en Madrid (AAAA-MM-DD): el reto diario es el mismo para todos, viva donde viva cada uno.
// Si el navegador no sabe de zonas horarias, se usa el día local.
let madridFmt;
export function madridDayKey(date = new Date()) {
  try {
    madridFmt = madridFmt || new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' });
    const parts = Object.fromEntries(madridFmt.formatToParts(date).map((p) => [p.type, p.value]));
    const key = `${parts.year}-${parts.month}-${parts.day}`;
    return isDayKey(key) ? key : dayKey(date);
  } catch {
    return dayKey(date);
  }
}

// Semana ISO (lunes a domingo; la semana 1 es la que contiene el primer jueves del año).
// Devuelve { year, week, key: 'AAAA-Wss', compact: 'wAAAAss' }.
export function isoWeek(key) {
  const t = new Date(toUtc(key));
  const weekday = (t.getUTCDay() + 6) % 7; // lunes = 0
  t.setUTCDate(t.getUTCDate() - weekday + 3); // jueves de esa semana
  const year = t.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ((firstThursday.getUTCDay() + 6) % 7) + 3);
  const week = 1 + Math.round((t - firstThursday) / (7 * 86400000));
  const ww = String(week).padStart(2, '0');
  return { year, week, key: `${year}-W${ww}`, compact: `w${year}${ww}` };
}

// Semanas que tiene un año ISO (52 o 53).
export function isoWeeksIn(year) {
  return isoWeek(`${year}-12-28`).week;
}

// 'w202648' → '2026-W48' (null si no es una semana real).
export function expandWeek(compact) {
  const m = /^w(\d{4})(\d{2})$/.exec(String(compact || ''));
  if (!m) return null;
  const year = Number(m[1]);
  const week = Number(m[2]);
  if (week < 1 || week > isoWeeksIn(year)) return null;
  return `${m[1]}-W${m[2]}`;
}
