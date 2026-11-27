// Calendario del Cuadro del día y encuadre de su detalle (engine/cuadro-dia.js tiene el juego). Va aparte para que la cabecera
// (ui/shell.js) pinte el detalle de hoy sin cargar el resto. Puro.

import { daysBetween, isDayKey } from './dates.js';

// Avisa cuando quedan menos días de calendario por delante (lo comprueban tests/cuadro-dia.test.js y tools/sync_cuadro_dia.py).
export const CUADRO_ALARM_DAYS = 3;
export const CUADRO_ROUTE = 'cuadro-del-dia';
// Zoom del detalle del paso 1 (tools/sync_cuadro_dia.py comprueba su nitidez con el mismo valor).
export const DETAIL_ZOOM = 3;
// Zoom del paso 2: su recorte contiene el del paso 1 y es el detalle que se pinta al desplegar (tools/share_pages.py, img/dia/).
export const WIDE_ZOOM = 1.6;
const TRY_LABELS = ['A la primera', 'A la segunda', 'A la tercera', 'A la cuarta'];
export const LOST_LABEL = 'Esta vez no';
// «A la segunda» o «Esta vez no» para una partida guardada ({ won, tries }).
export const tryLabel = (record) => (record.won ? TRY_LABELS[record.tries - 1] || TRY_LABELS[TRY_LABELS.length - 1] : LOST_LABEL);

// Número del día (1 el de estreno). Antes del estreno, el 1.
export function dayNumber(dateKey, start) {
  if (!isDayKey(dateKey) || !isDayKey(start)) return 1;
  return Math.max(1, daysBetween(start, dateKey) + 1);
}

// Entrada del calendario de un número de día: la lista da la vuelta, nunca hay un día vacío.
export function entryFor(days, n) {
  if (!Array.isArray(days) || !days.length) return null;
  const k = ((Math.max(1, Math.floor(n)) - 1) % days.length + days.length) % days.length;
  return days[k];
}

// Posición en el calendario (1..largo) del día n: nombra su archivo de datos y su página para compartir.
export const slotFor = (count, n) => ((Math.max(1, n) - 1) % Math.max(1, count)) + 1;

// Días de calendario por delante de hoy (negativo si ya ha dado la vuelta) y la alarma de que se acaba.
export function daysLeft(count, start, dateKey) {
  return count - dayNumber(dateKey, start);
}
export const calendarAlarm = (count, start, dateKey) => daysLeft(count, start, dateKey) < CUADRO_ALARM_DAYS;

// Rectángulo [x0, y0, x1, y1] (de 0 a 1) de la obra que se ve en un marco de proporción `frame` (ancho / alto) con ese zoom
// alrededor de `focus` (como crop_rect de tools/sync_cuadro_dia.py). Sin salirse del cuadro.
export function cropRect(work, focus, zoom = 1, frame = 1) {
  const ratio = work && work.w > 0 && work.h > 0 ? work.w / work.h : 1;
  let rw = ratio > frame ? frame / ratio : 1;
  let rh = ratio > frame ? 1 : ratio / frame;
  rw /= zoom;
  rh /= zoom;
  const [fx, fy] = Array.isArray(focus) ? focus : [0.5, 0.5];
  const cx = Math.min(Math.max(fx, rw / 2), 1 - rw / 2);
  const cy = Math.min(Math.max(fy, rh / 2), 1 - rh / 2);
  return [cx - rw / 2, cy - rh / 2, cx + rw / 2, cy + rh / 2];
}

