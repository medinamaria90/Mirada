// «Su tiempo» en la ficha del pintor: barras de vida alineadas, sin años, de él y de los pintores que ya conoces más cercanos
// (engine/chrono.js → timeOf), con el eje en siglos y una frase («Llegó justo después de Masaccio y coincidió con
// Botticelli»). Sin nadie conocido con quien compararlo, no sale. Para el lector, la frase y una etiqueta con el orden.

import { esc } from './dom.js';
import { avatarHtml } from './avatar.js';
import { timeOf } from '../engine/chrono.js';

// Ancho de referencia de la tarjeta (px) y lo que ocupa un nombre dentro de su barra: cara, huecos y unos px por letra.
// Si la barra no da para el nombre entero, este sale fuera de ella, al lado con más sitio (nunca cortado).
const CARD_PX = 300;
const BAR_CHROME_PX = 52;
const CHAR_PX = 8.6;
// Margen (en % de la tarjeta) que se deja entre el nombre de fuera y el borde.
const ROOM_GAP = 2;
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
// link: con navegación (fuera de una ronda), cada barra de otro pintor lleva a su ficha.
export function timeHtml(ctx, artistId, face, link = false) {
  const t = timeOf(ctx.index, ctx.store.get().progress, artistId);
  if (t.neighbours.length < 2) return '';
  const rows = t.neighbours.slice().sort((a, b) => a.born - b.born);
  const bar = (r) => {
    const width = Math.max(r.to - r.from, 0);
    const fits = (width / 100) * CARD_PX >= BAR_CHROME_PX + r.name.length * CHAR_PX;
    const left = r.from > 100 - r.to;
    const out = fits ? '' : left ? ' is-name-left' : ' is-name-right';
    const room = Math.max(Math.floor(left ? r.from : 100 - r.to) - ROOM_GAP, 0);
    const inner = `<span class="st-bar${r.current ? ' is-current' : ''}${out}" style="--from:${r.from}%;--width:${width}%;--room:${room}">${avatarHtml(ctx.index.artist(r.id), face(r.id), 'st-av')}<span class="st-name">${esc(r.name)}</span></span>`;
    if (r.current) return `<li class="st-row"><span class="st-hit" aria-current="true">${inner}</span></li>`;
    return `<li class="st-row">${link
      ? `<button type="button" class="st-hit" data-ap="artist" data-id="${esc(r.id)}">${inner}</button>`
      : `<span class="st-hit">${inner}</span>`}</li>`;
  };
  const axis = ticksOf(t.axis).map((a, i) => `<span class="st-tick${a.at ? '' : ' is-edge'}${a.at > TICK_END ? ' is-end' : ''}" style="--at:${a.at}%">${i ? '' : 'siglo '}${esc(a.label)}</span>`).join('');
  return `<section class="ap-section ap-time" aria-labelledby="ap-time-h"><div class="st-card">
    <h2 id="ap-time-h" class="st-h">Su tiempo</h2>
    <ul class="st-rows">${rows.map(bar).join('')}</ul>
    <div class="st-axis" aria-hidden="true">${axis}</div>
    ${t.phrase ? `<p class="st-phrase">${esc(t.phrase)}</p>` : ''}
  </div></section>`;
}
