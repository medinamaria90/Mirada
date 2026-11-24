// Reverb por convolución con respuesta al impulso generada por código (sin archivos).
import { mulberry32 } from './theory.js';

/** Impulso estéreo: ruido con caída exponencial, que se oscurece con el tiempo y primeras reflexiones. */
export function makeImpulse(ctx, seconds = 2.4, seed = 11) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    const rng = mulberry32(seed + ch * 101);
    const pre = Math.floor(sr * 0.012);
    let lp = 0;
    for (let i = pre; i < len; i++) {
      const t = (i - pre) / (len - pre);
      const k = 0.65 - 0.5 * t; // coeficiente del filtro: más grave al final
      lp += k * ((rng() * 2 - 1) - lp);
      d[i] = lp * Math.pow(1 - t, 3.2);
    }
    for (let r = 0; r < 6; r++) d[pre + Math.floor(rng() * sr * 0.06)] += (rng() - 0.5) * 0.6;
  }
  return buf;
}
