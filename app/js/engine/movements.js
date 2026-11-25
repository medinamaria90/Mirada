// Orden cronológico de los movimientos por su fecha de inicio (no por el orden del camino: una rama como la estampa
// japonesa tiene su sitio en el tiempo). Puro.

const ROMAN = { I: 1, V: 5, X: 10 };
const toInt = (r) => [...r].reduce((n, c, i, a) => n + (ROMAN[c] < (ROMAN[a[i + 1]] || 0) ? -ROMAN[c] : ROMAN[c]), 0);

// Año de inicio de un periodo escrito a la española: «1860–1890» → 1860; «s. XIII–XIV» → 1200;
// «finales s. XVIII–…» → 1770; «mediados–finales s. XIX» → 1840. Sin dato, null.
export function periodStart(period) {
  const text = String(period || '');
  const year = /\b(1[0-9]{3})\b/.exec(text);
  if (year) return Number(year[1]);
  const century = /s\.\s*([IVX]+)/.exec(text) || /([IVX]+)\s*$/.exec(text);
  if (!century) return null;
  const base = (toInt(century[1]) - 1) * 100;
  return base + (/^\s*finales/.test(text) ? 70 : /^\s*mediados/.test(text) ? 40 : 0);
}

const cache = new WeakMap();

// Los movimientos del catálogo por fecha de inicio (a igualdad, el orden del camino).
export function movementsChrono(index) {
  if (!cache.has(index)) {
    const list = index.movements.map((m) => ({ m, start: periodStart(m.period) ?? 9999 }))
      .sort((a, b) => a.start - b.start || a.m.order - b.m.order).map((x) => x.m);
    cache.set(index, list);
  }
  return cache.get(index);
}
