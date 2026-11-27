// Toques fantasma: al cerrar una capa (el visor, una hoja, una historia) lo que había debajo vuelve a
// estar al alcance del dedo. Si la capa se cierra en mitad de un gesto (el primer toque de un doble
// toque, un dedo impaciente que repite), el toque siguiente cae en el mismo sitio, sobre una respuesta
// o un botón, y cuenta como pulsado. Cada capa llama a guardGhostTaps() al cerrarse: si el cierre viene
// de un dedo o del ratón (un toque hace menos de RECENT_POINTER_MS y ninguna tecla después), durante
// GHOST_TAP_MS se ignoran los toques a menos de GHOST_RADIUS de ese toque. Un toque decidido en otro
// sitio pasa; cerrar con Esc no arma la guarda y el teclado (clic con detail 0) nunca se bloquea.

export const GHOST_TAP_MS = 450;
export const GHOST_RADIUS = 64; // px: el segundo toque de un doble toque cae casi donde el primero
export const RECENT_POINTER_MS = 700;

let guard = null; // { until, x, y }
let lastPointer = { t: -Infinity, x: 0, y: 0 };
let lastKey = -Infinity;

// Puras, para las pruebas: ¿se arma la guarda? ¿se descarta este clic?
export function shouldGuard(now, lastPointerAt, lastKeyAt = -Infinity) {
  return lastPointerAt > lastKeyAt && now - lastPointerAt <= RECENT_POINTER_MS;
}
export function isGhostTap(click, now, g) {
  return Boolean(g) && click.detail !== 0 && now < g.until && Math.hypot(click.x - g.x, click.y - g.y) <= GHOST_RADIUS;
}

function onPointer(ev) {
  lastPointer = { t: performance.now(), x: ev.clientX, y: ev.clientY };
}
function onKey() {
  lastKey = performance.now();
}
function onClick(ev) {
  if (!isGhostTap({ detail: ev.detail, x: ev.clientX, y: ev.clientY }, performance.now(), guard)) return;
  ev.preventDefault();
  ev.stopImmediatePropagation();
}

// En la fase de captura de window: llega antes que cualquier otro escuchador de la app.
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', onPointer, { capture: true, passive: true });
  window.addEventListener('pointerup', onPointer, { capture: true, passive: true });
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('click', onClick, true);
}

export function guardGhostTaps(ms = GHOST_TAP_MS) {
  const now = performance.now();
  if (shouldGuard(now, lastPointer.t, lastKey)) guard = { until: now + ms, x: lastPointer.x, y: lastPointer.y };
}
