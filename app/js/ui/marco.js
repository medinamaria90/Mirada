// Marco de museo para las miniaturas de «¿Cuál es de X?» (ronda y test de gancho): paspartú y
// moldura con la proporción del lienzo (acotada). La miniatura del atlas se ve al instante y se cambia por la
// imagen grande cuando carga (sin bloquear; si falla, se queda la miniatura).

import { esc } from './dom.js';
import { artFrame } from './art.js';

// Proporción (ancho / alto) mínima y máxima de la vista previa: 3:4 vertical y 4:3 apaisado.
export const MARCO_AR_MIN = 3 / 4;
export const MARCO_AR_MAX = 4 / 3;

// Proporción del marco: la del lienzo, acotada. Más allá, la imagen se recorta dentro del marco.
export function marcoRatio(artwork) {
  const ar = (artwork.w || 4) / (artwork.h || 3);
  return Math.min(MARCO_AR_MAX, Math.max(MARCO_AR_MIN, ar));
}

// Variables del marco: proporción y punto de interés (`focus`: [x, y] de 0 a 1; al centro si falta).
export function marcoStyle(artwork) {
  const f = Array.isArray(artwork.focus) ? artwork.focus.map(Number) : [];
  const [fx, fy] = [0, 1].map((i) => (Number.isFinite(f[i]) ? Math.min(1, Math.max(0, f[i])) : 0.5));
  return `--mar:${marcoRatio(artwork).toFixed(4)};--fx:${fx};--fy:${fy}`;
}

export function marcoHtml(artwork, opts = {}) {
  if (!artwork) return '';
  return `<span class="marco" style="${marcoStyle(artwork)}" data-full="${esc(artwork.img)}"><span class="marco-paspartu">${artFrame(artwork, { ...opts, thumb: true })}</span></span>`;
}

// Precarga la imagen grande de cada marco de `root` y, al cargar, sustituye la miniatura.
export function upgradeMarcos(root) {
  for (const marco of root.querySelectorAll('.marco[data-full]')) {
    const full = marco.dataset.full;
    const frame = marco.querySelector('.art');
    const img = frame && frame.querySelector('img');
    if (!img || img.getAttribute('src') === full) continue;
    const big = new Image();
    big.decoding = 'async';
    big.onload = () => {
      // La ronda puede haber pasado de pregunta mientras cargaba.
      if (!marco.isConnected || frame.classList.contains('is-broken')) return;
      frame.classList.remove('art-sheet');
      img.removeAttribute('width');
      img.removeAttribute('height');
      img.src = full;
    };
    big.src = full;
  }
}
