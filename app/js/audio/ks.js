// Karplus-Strong: cuerda pulsada sintetizada en un buffer (función pura, sin Web Audio).
// Para que no suene metálica: excitación con ruido filtrado dos veces (sin brillo de ruido blanco),
// un paso bajo de un polo dentro del bucle (los armónicos altos mueren antes que la fundamental),
// un pequeño cuerpo resonante fijo (dos resonancias de caja) y un corte final que quita el siseo.
import { mulberry32 } from './theory.js';

/** Biquad RBJ (paso bajo o paso banda de pico constante); devuelve un Float32Array nuevo. */
function biquad(data, sr, type, f0, q, gain = 1) {
  const w = (2 * Math.PI * f0) / sr;
  const sn = Math.sin(w), cs = Math.cos(w), al = sn / (2 * q);
  let b0, b1, b2;
  if (type === 'lowpass') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = (1 - cs) / 2; }
  else { b0 = al; b1 = 0; b2 = -al; } // bandpass
  const a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al;
  b0 /= a0; b1 /= a0; b2 /= a0;
  const na1 = a1 / a0, na2 = a2 / a0;
  const out = new Float32Array(data.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let n = 0; n < data.length; n++) {
    const x = data[n];
    const y = b0 * x + b1 * x1 + b2 * x2 - na1 * y1 - na2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    out[n] = y * gain;
  }
  return out;
}

/** Periodo real (muestras) por autocorrelación alrededor del retardo nominal, con interpolación. */
function measurePeriod(data, sr, nominal) {
  const win = Math.min(data.length - Math.ceil(nominal) - 4, Math.floor(sr * 0.25));
  if (win < nominal) return nominal;
  const corr = (lag) => { let s = 0; for (let n = 0; n < win; n++) s += data[n] * data[n + lag]; return s; };
  const lo = Math.max(2, Math.floor(nominal) - 2), hi = Math.ceil(nominal) + 3;
  let best = lo, bestV = -Infinity;
  const vals = {};
  for (let l = lo; l <= hi; l++) { vals[l] = corr(l); if (vals[l] > bestV) { bestV = vals[l]; best = l; } }
  const a = vals[best - 1] ?? corr(best - 1), b = bestV, c = vals[best + 1] ?? corr(best + 1);
  const den = a - 2 * b + c;
  return den === 0 ? best : best + (0.5 * (a - c)) / den;
}

/**
 * Genera una cuerda pulsada.
 * @param sr        frecuencia de muestreo
 * @param freq      frecuencia deseada (Hz)
 * @param seconds   duración del buffer
 * @param o.t60     tiempo (s) en caer 60 dB, igual para todas las alturas
 * @param o.blend   peso del promedio (0.5 = clásico; mayor = más brillante)
 * @param o.bright  brillo de la excitación inicial (0..1; se filtra dos veces)
 * @param o.pick    posición de la púa (fracción de la cuerda): da carácter
 * @param o.damp    paso bajo del bucle (1 = ninguno; 0,3–0,6 = los agudos mueren antes)
 * @param o.cut     corte final (Hz) que quita el siseo por encima (0 = ninguno)
 * @param o.body    cantidad de cuerpo resonante (0 = ninguno)
 * @returns { data: Float32Array normalizado a pico 1, freq: frecuencia real medida }
 * El llamador afina exactamente con playbackRate = freq / resultado.freq.
 */
export function pluckBuffer(sr, freq, seconds, o = {}) {
  const { t60 = 1.5, blend = 0.5, bright = 0.5, pick = 0.2, seed = 1, damp = 1, cut = 0, body = 0 } = o;
  const extra = damp < 1 ? (1 - damp) / damp : 0; // retardo que añade el paso bajo del bucle (en graves)
  const delay = Math.max(2, Math.floor(sr / freq - (1 - blend) - extra));
  const nominal = sr / freq;
  const rho = Math.pow(10, -3 / (t60 * freq)); // ganancia por vuelta de la cuerda
  const rng = mulberry32(seed * 7919 + Math.round(freq));

  // excitación: ruido filtrado dos veces + peine de púa, sin continua
  const line = new Float32Array(delay);
  let lp1 = 0, lp2 = 0;
  for (let i = 0; i < delay; i++) {
    lp1 += bright * ((rng() * 2 - 1) - lp1);
    lp2 += bright * (lp1 - lp2);
    line[i] = lp2;
  }
  const pk = Math.max(1, Math.round(delay * pick));
  const ex = new Float32Array(delay);
  let mean = 0;
  for (let i = 0; i < delay; i++) { ex[i] = line[i] - (i >= pk ? line[i - pk] * 0.8 : 0); mean += ex[i]; }
  mean /= delay;
  for (let i = 0; i < delay; i++) line[i] = ex[i] - mean;

  const total = Math.floor(sr * seconds);
  let data = new Float32Array(total);
  let p = 0;
  let prev = 0;
  let s = 0; // estado del paso bajo del bucle
  for (let n = 0; n < total; n++) {
    const cur = line[p];
    let y = rho * (blend * cur + (1 - blend) * prev);
    if (damp < 1) { s += damp * (y - s); y = s; }
    line[p] = y;
    prev = cur;
    p = p + 1 === delay ? 0 : p + 1;
    data[n] = y;
  }
  const period = measurePeriod(data, sr, nominal);

  if (body > 0) { // caja: resonancia grave de madera y una presencia suave
    const low = biquad(data, sr, 'bandpass', 190, 1.6, 0.9 * body);
    const mid = biquad(data, sr, 'bandpass', 2400, 1.2, 0.35 * body);
    for (let n = 0; n < total; n++) data[n] += low[n] + mid[n];
  }
  if (cut > 0 && cut < sr / 2) data = biquad(data, sr, 'lowpass', cut, 0.7);

  let peak = 1e-9;
  for (let n = 0; n < total; n++) { const a = Math.abs(data[n]); if (a > peak) peak = a; }
  const norm = 1 / peak;
  const fade = Math.min(total, Math.floor(sr * 0.03));
  for (let n = 0; n < total; n++) {
    let g = norm;
    if (n >= total - fade) g *= (total - n) / fade;
    data[n] *= g;
  }
  return { data, freq: sr / period };
}
