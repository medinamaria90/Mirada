// Ficha de museo de las obras (data/catalog-ficha.json): se pide una vez, de forma diferida, y se une
// al índice. Sin ella todo funciona: el museo es un añadido bajo el cuadro.

import { mergeCatalogFicha } from '../engine/catalog.js';

let pending = null;

export function ensureFicha(index) {
  pending = pending || fetch('data/catalog-ficha.json', { cache: 'no-cache' })
    .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
    .then((data) => { mergeCatalogFicha(index, data); return true; })
    .catch((err) => { console.info('Ficha de museo no disponible:', err.message); pending = null; return false; });
  return pending;
}

// «Galería Uffizi, Florencia» (lo que haya).
export function museumLine(work) {
  return [work.museum, work.city].filter(Boolean).join(', ');
}
