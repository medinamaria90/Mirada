// Percusión suave sin altura (castañuelas). Misma firma que el resto de instrumentos:
// (ctx, dest, when, midi, dur, vel) -> instante de fin (s); `midi` y `dur` no cuentan.
const NOISE_SECONDS = 0.25;
const noises = new WeakMap(); // ctx -> buffer de ruido (se comparte entre golpes)

function noiseBuffer(ctx) {
  let buf = noises.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * NOISE_SECONDS), ctx.sampleRate);
    const data = buf.getChannelData(0);
    let seed = 7;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 16807) % 2147483647;
      data[i] = (seed / 2147483647) * 2 - 1;
    }
    noises.set(ctx, buf);
  }
  return buf;
}

// Castañuela: chasquido de madera, ruido por un paso banda estrecho (dos maderas: 1,9 y 2,7 kHz)
// con caída de unos 30 ms. Volumen bajo: acompaña, no marca.
const CASTANET = { bands: [[1900, 6, 1], [2700, 7, 0.7]], decay: 0.035, peak: 0.5 };

export function castanets(ctx, dest, when, midi, dur, vel) {
  const end = when + CASTANET.decay + 0.02;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(vel * CASTANET.peak, when + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, when + CASTANET.decay);
  g.connect(dest);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const filters = CASTANET.bands.map(([f, q, level]) => {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f;
    bp.Q.value = q;
    const lg = ctx.createGain();
    lg.gain.value = level;
    src.connect(bp);
    bp.connect(lg);
    lg.connect(g);
    return [bp, lg];
  }).flat();
  src.start(when, Math.random() * (NOISE_SECONDS - 0.06));
  src.stop(end);
  src.onended = () => [src, ...filters, g].forEach((n) => { try { n.disconnect(); } catch { /* ya desconectado */ } });
  return end;
}
