// Ampliar dentro del visor: la aritmética, sin DOM, del pellizco, el doble toque, la rueda y el
// teclado (la parte con eventos está en viewer-gestures.js). El marco del cuadro se pinta con
// `translate(x, y) scale(s)` y el origen en su centro: (x, y) es cuánto se ha movido el centro del
// cuadro respecto a su sitio, en píxeles de pantalla. Un estado es { scale, x, y }.
//
// La «caja» (box) describe dónde está el cuadro: w × h es el marco en reposo y vw × vh la ventana
// (el escenario del visor) centrada en él. Ampliado, el cuadro nunca deja hueco: si cabe en la
// ventana va centrado y, si no, se desplaza hasta que su borde toca el de la ventana.

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 4;
export const ZOOM_TAP = 2.5; // doble toque o doble clic
export const ZOOM_STEP = 1.5; // teclado: + y − multiplican o dividen por esto
export const ZOOM_REST = 1.02; // al soltar el pellizco por debajo de esto, vuelve a 1×
export const REST = Object.freeze({ scale: 1, x: 0, y: 0 });

// Deslizar entre cuadros a 1×: cuánto hay que arrastrar (fracción del ancho) o a qué velocidad
// (px/ms) para pasar al siguiente; con menos, el cuadro vuelve a su sitio.
export const SWIPE_FRACTION = 0.2;
export const SWIPE_SPEED = 0.45;

// Doble toque: dos toques a menos de este tiempo (ms) y distancia (px) uno de otro.
export const TAP_GAP_MS = 320;
export const TAP_RADIUS = 36;
export const TAP_SLOP = 10; // moverse más que esto ya no es un toque

export function clampZoom(scale) {
  if (!Number.isFinite(scale)) return ZOOM_MIN;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale));
}

export function isRest(state) {
  return state.scale <= ZOOM_MIN;
}

// Hasta dónde se puede mover el centro del cuadro (w × h, ampliado `scale` veces) dentro de la
// ventana vw × vh, en cada eje (el límite vale igual hacia los dos lados).
export function panLimits(scale, w, h, vw = w, vh = h) {
  return { x: Math.max(0, (scale * w - vw) / 2), y: Math.max(0, (scale * h - vh) / 2) };
}

export function clampPan(state, box) {
  const lim = panLimits(state.scale, box.w, box.h, box.vw, box.vh);
  return {
    scale: state.scale,
    x: Math.max(-lim.x, Math.min(lim.x, state.x)) || 0,
    y: Math.max(-lim.y, Math.min(lim.y, state.y)) || 0,
  };
}

// Cambia la escala manteniendo fijo el punto (fx, fy), medido desde el centro del cuadro en
// reposo: lo que había bajo los dedos sigue bajo los dedos.
export function zoomAbout(state, scale, fx, fy, box) {
  const s = clampZoom(scale);
  if (s === ZOOM_MIN) return REST;
  const k = s / state.scale;
  return clampPan({ scale: s, x: fx - k * (fx - state.x), y: fy - k * (fy - state.y) }, box);
}

export function panBy(state, dx, dy, box) {
  if (isRest(state)) return REST;
  return clampPan({ scale: state.scale, x: state.x + dx, y: state.y + dy }, box);
}

// Doble toque: a ZOOM_TAP centrado en el punto tocado, o de vuelta a 1× si ya estaba ampliado.
export function toggleZoom(state, fx, fy, box) {
  return isRest(state) ? zoomAbout(state, ZOOM_TAP, fx, fy, box) : REST;
}

// Un paso del pellizco: `start` es el estado al apoyar los dos dedos y `ratio` la distancia entre
// ellos ahora dividida por la de entonces; `mid` el punto medio ahora y `prevMid` en el paso anterior
// (ambos desde el centro del cuadro en reposo). Partiendo del estado actual, escala en torno al punto
// medio y arrastra lo que se haya movido ese punto medio.
export function pinchStep(state, start, ratio, mid, prevMid, box) {
  const z = zoomAbout(state, start.scale * ratio, mid.x, mid.y, box);
  return panBy(z, mid.x - prevMid.x, mid.y - prevMid.y, box);
}

// Al soltar el pellizco: casi a 1× cuenta como 1× (vuelve a su sitio).
export function settleZoom(state) {
  return state.scale < ZOOM_REST ? REST : state;
}

// Teclado: + / − (dir = 1 / -1) sobre el centro.
export function stepZoom(state, dir, box) {
  return zoomAbout(state, dir > 0 ? state.scale * ZOOM_STEP : state.scale / ZOOM_STEP, 0, 0, box);
}

// Cuadro al que va el visor al soltar un arrastre horizontal a 1×: dx es lo que se ha movido el
// dedo (negativo hacia la izquierda, es decir, hacia el siguiente), width el ancho de un cuadro y
// speed la velocidad al soltar (px/ms).
export function swipeTarget(pos, n, dx, width, speed = 0) {
  if (Math.abs(dx) < width * SWIPE_FRACTION && Math.abs(speed) < SWIPE_SPEED) return pos;
  return Math.max(0, Math.min(n - 1, pos - Math.sign(dx)));
}

// ¿Dos toques seguidos en el mismo sitio? Cada uno: { x, y, t } (t en ms).
export function isDoubleTap(prev, tap) {
  return Boolean(prev) && tap.t - prev.t <= TAP_GAP_MS && Math.hypot(tap.x - prev.x, tap.y - prev.y) <= TAP_RADIUS;
}

export function transformOf(state) {
  if (isRest(state)) return '';
  return `translate(${state.x.toFixed(2)}px, ${state.y.toFixed(2)}px) scale(${state.scale.toFixed(4)})`;
}

// «2,5×»: un decimal con coma, sin ceros de más.
export function formatZoom(scale) {
  const rounded = Math.round(scale * 10) / 10;
  return `${String(rounded).replace('.', ',')}×`;
}
