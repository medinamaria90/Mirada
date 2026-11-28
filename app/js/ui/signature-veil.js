// Velo sobre las firmas legibles de un cuadro mientras se pregunta por su autor (test, rondas, repasos
// y el visor ampliado): hasta responder, la firma no delata. Las cajas (`work.signs`, fracciones
// [x0, y0, x1, y1] de la imagen) vienen de contenido/firmas.json vía el catálogo; sin ellas, no hay velo.
// Pinta lo mismo que el Cuadro del día (ui/cuadro-frame.js): la miniatura desenfocada encima.

import { veilHtml } from './cuadro-frame.js';

const WHOLE = { left: 0, top: 0, width: 1, height: 1 };
const isFraction = (v) => Number.isFinite(v) && v >= 0 && v <= 1;

// Cajas válidas de la obra (una caja mal formada se ignora).
export function signsOf(work) {
  const list = work && Array.isArray(work.signs) ? work.signs : [];
  return list.filter((b) => Array.isArray(b) && b.length === 4 && b.every(isFraction) && b[2] > b[0] && b[3] > b[1]);
}

// HTML de los velos, para meterlos dentro de un marco que muestra la imagen entera.
export const veilsHtml = (work) => signsOf(work).map((box) => veilHtml(WHOLE, box, work)).join('');

// Quita los velos de `root` (al responder).
export function unveil(root) {
  root.querySelectorAll('.cdd-veil').forEach((el) => el.remove());
}

// ¿La zona [u0, v0, u1, v1] de la imagen toca alguna firma? (la lupa no debe enseñarla)
export function touchesSign(work, [u0, v0, u1, v1]) {
  return signsOf(work).some(([x0, y0, x1, y1]) => u0 < x1 && u1 > x0 && v0 < y1 && v1 > y0);
}
