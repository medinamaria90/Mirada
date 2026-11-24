// Datos del perfil que no necesitan DOM: avance al siguiente rango, portada, «Mi museo», metal de los
// logros, inicial del avatar y último resultado del test. Puro.

import { artKey } from './srs.js';
import { STREAK_MEDALS } from './progress.js';

export const MUSEUM_SIZE = 9;

// Metal de cada logro (oro, plata o bronce) según lo difícil que es.
export const TIERS = ['gold', 'silver', 'bronze'];
export const TIER_NAMES = { gold: 'Oro', silver: 'Plata', bronze: 'Bronce' };

export function medalTier(id) {
  const [kind, ...rest] = String(id).split('-');
  const ref = rest.join('-');
  if (kind === 'eye') return 'gold';
  if (kind === 'streak') {
    const i = STREAK_MEDALS.indexOf(Number(ref));
    return i < 0 ? 'bronze' : TIERS[Math.max(0, 2 - i)];
  }
  if (kind === 'movement' || id === 'daily-perfect') return 'silver';
  return 'bronze';
}

// Avance hacia el siguiente rango: media de lo cumplido en cada requisito (0..1) y lo que falta, en
// frases cortas. Rango máximo: barra llena y sin nada pendiente.
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const MISSING_TEXT = {
  xp: (n) => `${n.toLocaleString('es-ES')} XP`,
  deep: (n) => plural(n, 'nivel «a fondo»', 'niveles «a fondo»'),
  eras: (n) => plural(n, 'época con «a fondo»', 'épocas con «a fondo»'),
  complete: (n) => plural(n, 'gran maestro completo', 'grandes maestros completos'),
  grand: (n, need) => `${plural(n, 'gran maestro', 'grandes maestros')} hasta el nivel ${need.upTo}`,
};

export function rankProgress(rank) {
  const next = rank.next;
  if (!next) return { fraction: 1, next: null, parts: [] };
  const s = rank.stats;
  const have = {
    xp: s.xp,
    deep: s.deep,
    eras: s.eras,
    complete: s.complete,
    grand: next.grand ? s.grand.filter((v) => v >= next.grand.upTo).length : 0,
  };
  const want = { xp: next.xp, deep: next.deep, eras: next.eras, complete: next.complete, grand: next.grand?.count };
  const keys = Object.keys(want).filter((k) => want[k]);
  const fraction = keys.reduce((sum, k) => sum + Math.min(1, have[k] / want[k]), 0) / keys.length;
  const parts = rank.missing.map((m) => MISSING_TEXT[m.key](m.need - m.have, next.grand));
  return { fraction, next: next.name, parts };
}

// Último cuadro de cada fecha primero; a igual fecha, el añadido más tarde (orden de inserción).
export function museumWorks(progress, index, n = MUSEUM_SIZE) {
  const entries = Object.entries(progress.collection || {}).filter(([id]) => index.artwork(id));
  const rev = entries.map((e, i) => ({ id: e[0], date: String(e[1]), i }));
  rev.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.i - a.i));
  return rev.slice(0, n).map((e) => index.artwork(e.id));
}

// Portada: el cuadro más famoso del pintor del que más cuadros tiene el jugador (a igualdad, el
// del repaso más avanzado). null si aún no tiene ninguno.
export function coverWork(progress, index) {
  const owned = Object.keys(progress.collection || {}).map((id) => index.artwork(id)).filter(Boolean);
  if (!owned.length) return null;
  const count = new Map();
  for (const w of owned) count.set(w.artistId, (count.get(w.artistId) || 0) + 1);
  const box = (w) => progress.srs?.[artKey(w.id)]?.box || 0;
  const best = [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  return owned.filter((w) => w.artistId === best)
    .sort((a, b) => (b.fame || 0) - (a.fame || 0) || box(b) - box(a) || a.id.localeCompare(b.id))[0];
}

// Inicial del avatar (primera letra del nombre, en mayúscula); '' sin nombre.
export function initialOf(name) {
  const first = [...String(name || '').trim()][0];
  return first ? first.toLocaleUpperCase('es-ES') : '';
}

// Último resultado del test de cultura (localStorage['mirada.test.last']): null si no hay o no vale.
export function parseLastTest(raw) {
  let v = null;
  try { v = JSON.parse(raw); } catch { return null; }
  if (!v || !Number.isFinite(v.correct) || !Number.isFinite(v.asked) || v.asked <= 0 || typeof v.level !== 'string') return null;
  const pct = Number.isFinite(v.percentile) && v.percentile >= 1 && v.percentile <= 99 ? Math.round(v.percentile) : null;
  return { correct: v.correct, asked: v.asked, level: v.level, percentile: pct };
}

export function testShareText(last, url) {
  const lines = [`He acertado ${last.correct} de ${last.asked} en el test de Sfumato · ${last.level}`];
  if (last.percentile != null) lines.push(`Sé más de pintura que el ${last.percentile} % de la gente`);
  if (url) lines.push(url);
  return lines.join('\n');
}
