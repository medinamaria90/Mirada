// Cinta del tiempo sin años (engine/chrono.js): los pintores conocidos en fila, a distancia proporcional a cuándo vivieron,
// cada uno con su miniatura y su nombre, en la respuesta de «¿Quién fue antes?». Para el lector, una etiqueta con el orden.

import { esc } from './dom.js';
import { loadCss } from './lazy-css.js';
import { avatarHtml } from './avatar.js';
import { avatarWork, avatarCrop, seenOf } from '../engine/painters.js';
import { faceWork } from '../engine/question-before.js';

export const loadRibbonCss = () => loadCss('css/cinta.css');

// Miniatura de un pintor: su autorretrato o retrato ya visto o, si no, su cuadro más conocido.
function faceOf(ctx, artistId) {
  const seen = seenOf(ctx.store.get().progress, ctx.index, artistId);
  const own = avatarWork(seen);
  if (own) return own;
  const work = faceWork(ctx.index, artistId);
  return work ? { work, ...avatarCrop(work) } : null;
}

// rows: [{ id, name, at, current }].
export function ribbonHtml(ctx, rows) {
  if (rows.length < 2) return '';
  const dots = rows.map((r) => {
    const artist = ctx.index.artist(r.id);
    return `<span class="cinta-p${r.current ? ' is-current' : ''}" style="--at:${r.at}%">
      <span class="cinta-dot" aria-hidden="true">${avatarHtml(artist, faceOf(ctx, r.id))}</span>
      <span class="cinta-name" aria-hidden="true">${esc(r.name)}</span></span>`;
  }).join('');
  const label = `En el tiempo: ${rows.map((r) => r.name).join(', ')}`;
  return `<div class="cinta" role="img" aria-label="${esc(label)}">${dots}</div>`;
}
