// Encuadre de las obras en las vistas que las recortan (la casilla de «¿Cuál es de X?» y la historia). Puro: no toca el DOM.
//
// Regla: una vista solo recorta sin más si se pierde poco del cuadro (LOSS_OK). Si se pierde más, hace falta un punto de
// foco revisado mirando la imagen (`focus` del catálogo: contenido/focos.json o el «Detalle del día»), para que el recorte
// guarde caras y figura principal. tools/recortes.mjs saca la lista y una prueba avisa si una obra nueva no lo tiene.

// Fracción del cuadro que se puede perder al recortar por el centro sin revisar nada.
export const LOSS_OK = 0.15;
// Con foco revisado, la historia recorta a sangre hasta esto; más allá, la obra entera sobre su fondo desenfocado.
export const LOSS_FOCUSED = 0.45;
// Proporción (ancho / alto) del marco de la historia en un móvil típico (412 × 915): la que usan la herramienta y la prueba.
export const STORY_RATIO = 412 / 915;
// Casilla de la pregunta: la proporción del lienzo, acotada entre 3:4 vertical y 4:3 apaisado.
export const MARCO_AR_MIN = 3 / 4;
export const MARCO_AR_MAX = 4 / 3;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round1 = (v) => Math.round(v * 10) / 10;

export const ratioOf = (work) => (work && work.w > 0 && work.h > 0 ? work.w / work.h : 1);

// Lo que se pierde (0 a 1) al cubrir una caja de proporción `box` con una obra de proporción `ratio`.
export const coverLoss = (ratio, box) => 1 - Math.min(ratio / box, box / ratio);

export const marcoRatio = (work) => clamp(ratioOf(work), MARCO_AR_MIN, MARCO_AR_MAX);

// Punto de foco revisado de la obra, [x, y] de 0 a 1, o null.
export function focusOf(work) {
  const f = Array.isArray(work?.focus) ? work.focus.map(Number) : [];
  return f.length >= 2 && f.slice(0, 2).every(Number.isFinite) ? [clamp(f[0], 0, 1), clamp(f[1], 0, 1)] : null;
}

// Caja de la imagen (en % del marco: left, top, width, height) que cubre un marco de proporción `frame` con la obra
// ampliada `zoom` veces, llevando su punto (fx, fy) lo más cerca posible del punto (tx, ty) del marco sin dejar huecos.
export function coverBox(ratio, frame, [fx, fy], zoom = 1, [tx, ty] = [0.5, 0.5]) {
  const w = (ratio > frame ? ratio / frame : 1) * zoom;
  const h = (ratio > frame ? 1 : frame / ratio) * zoom;
  const left = clamp(tx - fx * w, 1 - w, 0);
  const top = clamp(ty - fy * h, 1 - h, 0);
  return { left: round1(left * 100), top: round1(top * 100), width: round1(w * 100), height: round1(h * 100) };
}

// Las vistas que recortan y lo que pierde cada obra en ellas. La historia solo cuenta en las obras que salen en alguna.
export function cropLosses(work, frame = STORY_RATIO) {
  const r = ratioOf(work);
  return { pregunta: coverLoss(r, marcoRatio(work)), historia: coverLoss(r, frame) };
}

// ¿Pide un foco revisado? Si la casilla de la pregunta pierde más de LOSS_OK o, en una obra de historia, si se podría
// enseñar a sangre con foco (pierde entre LOSS_OK y LOSS_FOCUSED) y nadie ha decidido aún ni foco ni «entera» (`whole`).
export function needsFocus(work, { inStory = false } = {}) {
  if (focusOf(work)) return false;
  const loss = cropLosses(work);
  if (loss.pregunta > LOSS_OK) return true;
  return inStory && !work.whole && loss.historia > LOSS_OK && loss.historia <= LOSS_FOCUSED;
}
