// «Su tiempo» en la ficha del pintor: barras de vida alineadas, sin años, de él y de los pintores que ya conoces más cercanos
// (engine/chrono.js → timeOf), con el eje en siglos y una frase («Llegó justo después de Masaccio y coincidió con
// Botticelli»). Sin nadie conocido con quien compararlo, no sale. Para el lector, la frase y una etiqueta con el orden.

import { esc } from './dom.js';
import { avatarHtml } from './avatar.js';
import { timeOf } from '../engine/chrono.js';

// Una barra más estrecha que esto (en % del eje) lleva el nombre fuera, al lado que tenga sitio.
const NARROW = 34;
const NAME_LEFT_FROM = 55;
// Dos siglos del eje a menos de esto (en %) no caben: se queda el que marca la frontera de siglo.
const TICK_MIN = 18;
// Un siglo que empieza tan a la derecha lleva el nombre a la izquierda de su raya (si no, se sale de la tarjeta).
const TICK_END = 80;

function ticksOf(axis) {
  const out = [];
  for (const a of axis) {
    const prev = out[out.length - 1];
    if (!prev || a.at - prev.at >= TICK_MIN) out.push(a);
    else if (out.length === 1) out[0] = a;
  }
  return out;
}

// face(id): la cara de cada pintor para el avatar de su barra ({ work, x, y } o null).
export function timeHtml(ctx, artistId, face) {
  const t = timeOf(ctx.index, ctx.store.get().progress, artistId);
  if (t.neighbours.length < 2) return '';
  const rows = t.neighbours.slice().sort((a, b) => a.born - b.born);
  const bar = (r) => {
    const width = Math.max(r.to - r.from, 0);
    const out = width < NARROW ? (r.from >= NAME_LEFT_FROM ? ' is-name-left' : ' is-name-right') : '';
    return `<li class="st-row"><span class="st-bar${r.current ? ' is-current' : ''}${out}" style="--from:${r.from}%;--width:${width}%">
      ${avatarHtml(ctx.index.artist(r.id), face(r.id), 'st-av')}<span class="st-name">${esc(r.name)}</span></span></li>`;
  };
  const axis = ticksOf(t.axis).map((a, i) => `<span class="st-tick${a.at ? '' : ' is-edge'}${a.at > TICK_END ? ' is-end' : ''}" style="--at:${a.at}%">${i ? '' : 'siglo '}${esc(a.label)}</span>`).join('');
  return `<section class="ap-section ap-time" aria-labelledby="ap-time-h"><div class="st-card">
    <h2 id="ap-time-h" class="st-h">Su tiempo</h2>
    <ul class="st-rows" role="img" aria-label="${esc(rows.map((r) => r.name).join(', '))}">${rows.map(bar).join('')}</ul>
    <div class="st-axis" aria-hidden="true">${axis}</div>
    ${t.phrase ? `<p class="st-phrase">${esc(t.phrase)}</p>` : ''}
  </div></section>`;
}
