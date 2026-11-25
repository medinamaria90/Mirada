// Datos del perfil que no necesitan DOM: avance al siguiente rango, portada y avatar, «Mi museo», metal
// de los logros, inicial del avatar y último resultado del test. Puro.

import { artKey } from './srs.js';
import { STREAK_MEDALS } from './progress.js';
import { TEST_LEVELS } from '../test/resultado.js';

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

// Los logros de cada clase («artist», «eye», «streak»…) se reparten por turnos para que la muestra no
// sean ocho «Ojo de…» seguidos. `ids` ya viene ordenado por importancia dentro de cada clase.
export function interleaveByKind(ids) {
  const groups = new Map();
  for (const id of ids) {
    const kind = String(id).split('-')[0];
    if (!groups.has(kind)) groups.set(kind, []);
    groups.get(kind).push(id);
  }
  const lists = [...groups.values()];
  const out = [];
  for (let i = 0; out.length < ids.length; i++) for (const l of lists) if (i < l.length) out.push(l[i]);
  return out;
}

// Cifra para los números grandes: exacta hasta 9 999, y «31,2 mil» / «9,9 M» a partir de ahí (nunca se parte).
export function compactNumber(n) {
  const v = Math.max(0, Math.round(Number(n) || 0));
  // Siempre hacia abajo: 9 999 999 es «9,9 M», no «10 M» (un hito que aún no se ha alcanzado).
  const one = (x) => (Math.floor(x * 10) / 10).toFixed(1).replace('.', ',').replace(/,0$/, '');
  if (v < 10000) return String(v);
  if (v < 1000000) return `${one(v / 1000)} mil`;
  return `${one(v / 1000000)} M`;
}

// Avance hacia el siguiente rango: el del requisito menos cumplido (0..1), porque el rango no sube hasta
// cumplirlos todos, y, por requisito, lo que falta en una frase y su avance. Rango máximo: barra llena y
// sin nada pendiente.
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const fmt = (n) => n.toLocaleString('es-ES');
const NEED_TEXT = {
  xp: (n) => `Ganar ${fmt(n)} XP más`,
  deep: (n) => `Dominar ${plural(n, 'nivel «a fondo»', 'niveles «a fondo»')} más`,
  eras: (n) => `«A fondo» en ${plural(n, 'época', 'épocas')} más`,
  complete: (n) => `Completar ${plural(n, 'gran maestro', 'grandes maestros')} más`,
  grand: (n, grand) => `${plural(n, 'gran maestro', 'grandes maestros')} más hasta el nivel ${grand.upTo}`,
};

export function rankProgress(rank) {
  const next = rank.next;
  if (!next) return { fraction: 1, next: null, parts: [], items: [] };
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
  const ratio = (k) => Math.min(1, have[k] / want[k]);
  const fraction = Math.min(...keys.map(ratio));
  const items = rank.missing.map((m) => ({ key: m.key, text: NEED_TEXT[m.key](m.need - m.have, next.grand), fraction: ratio(m.key) }));
  return { fraction, next: next.name, parts: items.map((i) => i.text), items };
}

// Cuadros de la colección (los mismos que cuentan Colección y el inicio).
export function collectionIds(progress, index) {
  return Object.keys(progress.collection || {}).filter((id) => index.artwork(id));
}

// Toda la colección, el último de cada fecha primero; a igual fecha, el añadido más tarde (orden de inserción).
export function collectionWorks(progress, index) {
  const rev = collectionIds(progress, index).map((id, i) => ({ id, date: String(progress.collection[id]), i }));
  rev.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.i - a.i));
  return rev.map((e) => index.artwork(e.id));
}

// «Mi museo»: los últimos n de la colección.
export function museumWorks(progress, index, n = MUSEUM_SIZE) {
  return collectionWorks(progress, index).slice(0, n);
}

// Portada automática, portada de muestra y cuadro de la tarjeta que se comparte: SOLO de obras amables.
// Lo manda una lista blanca curada a mano (app/data/gentle.json: paisajes, retratos serenos, bodegones, escenas
// cotidianas; sin desnudos, muerte, pasión, violencia ni obras de varias tablas). Las palabras clave del título son
// solo una red de seguridad (si la lista no cargase, o por si alguien añade una obra sin revisar). La portada que
// elige la usuaria se respeta en pantalla, pero nunca viaja en la tarjeta si no está en la lista.
const HARSH_TITLE = /fusilamiento|tres de mayo|dos de mayo|crucifi|martirio|m[aá]rtir|decapita|degollad|judit|holofernes|masacre|matanza|batalla|battle|guerra|muerte|muerto|cad[aá]ver|anatom[ií]a|asesin|saturno|calvario|descendimiento|piedad|lamentaci|ejecuci|ahorcad|medusa|goliat|infierno|diablo|desastres|apocalipsis|juicio final|flagelaci|lapidaci|sard[aá]napalo|s[oó]crates|lady jane|comisario|sepulcro|suplicio|tortura|rapto|violaci|cruz|ecce homo|desollamiento|desollando|desollad|espinas|garrotazos|duelo|herid|aquelarre|bruja|espectro|esqueleto|vampiro|desnud|maja|venus|cleopatra|lucrecia|tarquinio|cristo atado|santa [a-záéíóú]+|tr[ií]ptico|pol[ií]ptico/i;
export const isHarsh = (work) => HARSH_TITLE.test(String(work?.title || ''));

// Conjunto de ids de la lista blanca (null si no hay datos: entonces solo vale la red de seguridad).
export const gentleSet = (data) => (Array.isArray(data?.works) ? new Set(data.works.map((w) => w.id)) : null);
const isGentle = (work, gentle) => !isHarsh(work) && (!gentle || gentle.has(work.id));

const FRIENDLY_TITLE = /venus|primavera|jard[ií]n|nen[uú]far|girasol|noche estrellada|perla|lechera|baile|desayuno|paseo|impresi[oó]n|amanecer|campo|paisaje|flores|rosas|dama|joven|ni[nñ]|ba[nñ]|merienda|domingo|lago|puente|puesta de sol|barcas|cuento|lectura/i;

// Portada de muestra para quien aún no tiene cuadros: de la lista blanca, famoso, apaisado y amable.
export function sampleCover(index, gentle = null) {
  const score = (w) => (w.fame || 0) * 10 + (w.w > w.h ? 4 : 0) + (w.focus ? 2 : 0) + (FRIENDLY_TITLE.test(w.title) ? 6 : 0);
  const pool = index.artworks.filter((w) => isGentle(w, gentle));
  return (pool.length ? pool : index.artworks).slice().sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id))[0] || null;
}

// Portada: la elegida si está en la colección; si no, la obra amable de la colección con más fama (a igualdad, del
// pintor con más cuadros, apaisada y de repaso más avanzado). Sin ninguna amable, la de muestra. null si no hay colección.
export function coverWork(progress, index, chosen = '', gentle = null) {
  const owned = collectionIds(progress, index).map((id) => index.artwork(id));
  if (!owned.length) return null;
  if (chosen && progress.collection[chosen] && index.artwork(chosen)) return index.artwork(chosen);
  const count = new Map();
  for (const w of owned) count.set(w.artistId, (count.get(w.artistId) || 0) + 1);
  const box = (w) => progress.srs?.[artKey(w.id)]?.box || 0;
  const best = owned.filter((w) => isGentle(w, gentle)).sort((a, b) => (b.fame || 0) - (a.fame || 0)
    || count.get(b.artistId) - count.get(a.artistId) || (b.w > b.h) - (a.w > a.h) || box(b) - box(a) || a.id.localeCompare(b.id))[0];
  return best || sampleCover(index, gentle);
}

// Cuadro de la tarjeta que se comparte: la portada elegida solo si es de la lista blanca; si no, la automática.
export function shareCover(progress, index, chosen = '', gentle = null) {
  const ok = chosen && index.artwork(chosen) && isGentle(index.artwork(chosen), gentle) ? chosen : '';
  return coverWork(progress, index, ok, gentle) || sampleCover(index, gentle);
}

// Avatar elegido (cuadro de la colección) o null: entonces va el logo o la inicial.
export function avatarWork(progress, index, chosen = '') {
  return chosen && progress.collection?.[chosen] && index.artwork(chosen) ? index.artwork(chosen) : null;
}

// Punto de interés de una obra (fracciones 0..1 de ancho y alto) como object-position en %.
export function focusPosition(work, fallbackY = 30) {
  const f = work?.focus;
  if (Array.isArray(f) && f.length === 2 && f.every((v) => Number.isFinite(v))) {
    const pct = (v) => Math.round(Math.min(1, Math.max(0, v)) * 100);
    return `${pct(f[0])}% ${pct(f[1])}%`;
  }
  return `50% ${fallbackY}%`;
}

// Inicial del avatar (primera letra del nombre, en mayúscula); '' sin nombre.
export function initialOf(name) {
  const letter = /\p{L}/u.exec(String(name || ''));
  return letter ? letter[0].toLocaleUpperCase('es-ES') : '';
}

// Último resultado del test de cultura (localStorage['mirada.test.last']): null si no hay o no vale. El
// nombre del nivel solo se da por bueno si es uno de los del test (resultados antiguos usaban los de los rangos).
export function parseLastTest(raw) {
  let v = null;
  try { v = JSON.parse(raw); } catch { return null; }
  if (!v || !Number.isInteger(v.correct) || !Number.isInteger(v.asked) || v.asked <= 0 || v.correct < 0 || v.correct > v.asked || typeof v.level !== 'string') return null;
  const pct = Number.isFinite(v.percentile) && v.percentile >= 1 && v.percentile <= 99 ? Math.round(v.percentile) : null;
  const date = typeof v.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.date) ? v.date : '';
  const grid = typeof v.grid === 'string' && /^[🟩🟨⬜]{1,8}$/u.test(v.grid) ? v.grid : '';
  return { correct: v.correct, asked: v.asked, level: TEST_LEVELS.includes(v.level) ? v.level : '', percentile: pct, date, grid };
}
