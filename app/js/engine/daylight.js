// Luz del día del mapa (puro, sin DOM): a partir de la hora del móvil, cuánto es de noche (0 de día, 1 de
// noche) y cuánto brilla el amanecer o el atardecer (0 a 1, con su pico a la salida y la puesta del sol). Las
// horas del sol son aproximadas, por mes (Madrid, hora local de mediados de cada mes), y se interpolan día a
// día: no se pide la ubicación.

const MIN_PER_DAY = 24 * 60;
const DAY_MS = 864e5;
const MID_MONTH = 15;
// [salida, puesta] en minutos desde medianoche, día 15 de cada mes (enero a diciembre).
export const SUN_TIMES = [
  [516, 1085], [494, 1123], [455, 1154], [466, 1245], [425, 1275], [404, 1306],
  [416, 1305], [443, 1273], [471, 1226], [499, 1177], [473, 1078], [508, 1068],
];
export const TWILIGHT_MIN = 30;    // la luz cambia en media hora, centrada en la salida o la puesta
export const GLOW_MIN = 40;        // el arrebol dura algo más: sube y baja en torno a la salida y la puesta

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (v) => { const t = clamp01(v); return t * t * (3 - 2 * t); };
const round2 = (v) => Math.round(v * 100) / 100;

// Salida y puesta del sol (minutos) para una fecha: entre los días 15 de dos meses seguidos, en línea recta.
export function sunTimes(date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const before = date.getDate() < MID_MONTH;
  const a = before ? (m + 11) % 12 : m;
  const b = (a + 1) % 12;
  const from = new Date(y, before ? m - 1 : m, MID_MONTH);   // mes -1: diciembre del año anterior
  const to = new Date(from.getFullYear(), from.getMonth() + 1, MID_MONTH);
  const t = (date - from) / (to - from || DAY_MS);
  const mix = (i) => SUN_TIMES[a][i] + (SUN_TIMES[b][i] - SUN_TIMES[a][i]) * clamp01(t);
  return { rise: Math.round(mix(0)), set: Math.round(mix(1)) };
}

// { night, dusk } para un instante.
export function daylight(date) {
  const t = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
  const { rise, set } = sunTimes(date);
  const half = TWILIGHT_MIN / 2;
  const day = smooth((t - rise + half) / TWILIGHT_MIN) * (1 - smooth((t - set + half) / TWILIGHT_MIN));
  const near = (sun) => Math.min(Math.abs(t - sun), MIN_PER_DAY - Math.abs(t - sun));
  const glow = (sun) => smooth(1 - near(sun) / GLOW_MIN);
  return { night: round2(1 - day), dusk: round2(Math.max(glow(rise), glow(set))) };
}
