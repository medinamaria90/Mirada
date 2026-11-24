// Karplus-Strong: cuerda pulsada sintetizada en un buffer (función pura, sin Web Audio).
import { mulberry32 } from './theory.js';

/**
 * Genera una cuerda pulsada.
 * @param sr        frecuencia de muestreo
 * @param freq      frecuencia deseada (Hz)
 * @param seconds   duración del buffer
 * @param o.t60     tiempo (s) en caer 60 dB, igual para todas las alturas
 * @param o.blend   peso del promedio (0.5 = clásico; mayor = más brillante)
 * @param o.bright  brillo de la excitación inicial (0..1)
 * @param o.pick    posición de la púa (fracción de la cuerda): da carácter
 * @returns { data: Float32Array normalizado a pico 1, freq: frecuencia real obtenida }
 * El llamador afina exactamente con playbackRate = freq / resultado.freq.
 */
export function pluckBuffer(sr, freq, seconds, o = {}) {
  const { t60 = 1.5, blend = 0.5, bright = 0.5, pick = 0.2, seed = 1 } = o;
  const delay = Math.max(2, Math.floor(sr / freq - (1 - blend)));
  const actual = sr / (delay + (1 - blend));
  const rho = Math.pow(10, -3 / (t60 * actual)); // ganancia por vuelta de la cuerda
  const rng = mulberry32(seed * 7919 + Math.round(freq));

  // excitación: ruido suavizado + peine de púa, sin continua
  const line = new Float32Array(delay);
  let lp = 0;
  for (let i = 0; i < delay; i++) {
    lp += bright * ((rng() * 2 - 1) - lp);
    line[i] = lp;
  }
  const pk = Math.max(1, Math.round(delay * pick));
  const ex = new Float32Array(delay);
  let mean = 0;
  for (let i = 0; i < delay; i++) { ex[i] = line[i] - (i >= pk ? line[i - pk] * 0.8 : 0); mean += ex[i]; }
  mean /= delay;
  for (let i = 0; i < delay; i++) line[i] = ex[i] - mean;

  const total = Math.floor(sr * seconds);
  const data = new Float32Array(total);
  let p = 0;
  let prev = 0;
  let peak = 1e-9;
  for (let n = 0; n < total; n++) {
    const cur = line[p];
    const y = rho * (blend * cur + (1 - blend) * prev);
    line[p] = y;
    prev = cur;
    p = p + 1 === delay ? 0 : p + 1;
    data[n] = y;
    const a = Math.abs(y);
    if (a > peak) peak = a;
  }
  const norm = 1 / peak;
  const fade = Math.min(total, Math.floor(sr * 0.03));
  for (let n = 0; n < total; n++) {
    let g = norm;
    if (n >= total - fade) g *= (total - n) / fade;
    data[n] *= g;
  }
  return { data, freq: actual };
}
