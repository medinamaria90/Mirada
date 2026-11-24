// Marco de museo para las miniaturas de «¿Cuál es de X?» (ronda y test de gancho): paspartú y
// moldura con la proporción del lienzo. La miniatura del atlas se ve al instante y se cambia por la
// imagen grande cuando carga (sin bloquear; si falla, se queda la miniatura).

import { esc } from './dom.js';
import { artFrame } from './art.js';

export function marcoHtml(artwork, opts = {}) {
  if (!artwork) return '';
  return `<span class="marco" data-full="${esc(artwork.img)}"><span class="marco-paspartu">${artFrame(artwork, { ...opts, thumb: true })}</span></span>`;
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
