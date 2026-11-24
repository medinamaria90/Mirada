// Timbres sostenidos (vientos, lengüetas, cuerda frotada ligera): onda periódica con armónicos
// propios, filtro que sigue la altura, envolvente de ataque/relajación y vibrato opcional.
// Misma firma que el resto de instrumentos: (ctx, dest, when, midi, dur, vel) -> instante de fin (s).
import { midiToFreq, clamp } from './theory.js';

const waves = new WeakMap(); // ctx -> { nombre: PeriodicWave }
function wave(ctx, name, amps) {
  let m = waves.get(ctx);
  if (!m) waves.set(ctx, (m = {}));
  if (!m[name]) {
    const real = new Float32Array(amps.length + 1);
    const imag = new Float32Array(amps.length + 1);
    amps.forEach((a, i) => { imag[i + 1] = a; });
    m[name] = ctx.createPeriodicWave(real, imag);
  }
  return m[name];
}

function finish(end, ...nodes) {
  nodes[0].onended = () => nodes.forEach((n) => { try { n.disconnect(); } catch { /* ya desconectado */ } });
  return end;
}

/**
 * @param name     clave de la onda (caché por contexto)
 * @param cfg.amps    armónicos (1 = fundamental)
 * @param cfg.attack  s hasta el nivel pleno
 * @param cfg.release s de cola tras la nota
 * @param cfg.cut     corte del paso bajo, en múltiplos de la fundamental
 * @param cfg.peak    ganancia máxima (vel = 1)
 * @param cfg.detune  cents de desafinación entre dos osciladores (0 = uno solo)
 * @param cfg.vib     { rate (Hz), depth (cents), delay (s) } o null
 */
export function sustained(name, cfg) {
  const { amps, attack, release, cut, peak, detune = 0, vib = null } = cfg;
  return (ctx, dest, when, midi, dur, vel) => {
    const f = midiToFreq(midi);
    const end = when + Math.max(0.06, dur);
    const level = vel * peak;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(level, when + attack);
    g.gain.setValueAtTime(level, Math.max(when + attack, end - 0.02));
    g.gain.linearRampToValueAtTime(0.0001, end + release);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = clamp(f * cut, 400, 6000);
    lp.Q.value = 0.5;
    lp.connect(g);
    g.connect(dest);
    const stopAt = end + release + 0.05;
    const w = wave(ctx, name, amps);
    const oscs = (detune ? [-detune / 2, detune / 2] : [0]).map((d) => {
      const s = ctx.createOscillator();
      s.setPeriodicWave(w);
      s.frequency.value = f;
      s.detune.value = d;
      s.connect(lp);
      s.start(when);
      s.stop(stopAt);
      return s;
    });
    const extra = [];
    if (vib && dur > vib.delay + 0.1) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = vib.rate;
      depth.gain.setValueAtTime(0, when);
      depth.gain.linearRampToValueAtTime(vib.depth, when + vib.delay + 0.3);
      lfo.connect(depth);
      oscs.forEach((s) => depth.connect(s.detune));
      lfo.start(when);
      lfo.stop(stopAt);
      extra.push(lfo, depth);
    }
    return finish(stopAt, oscs[0], ...oscs.slice(1), ...extra, lp, g);
  };
}

export const WINDS = {
  // Flauta dulce: casi senoidal, un poco de tercer armónico y vibrato leve.
  recorder: sustained('recorder', { amps: [1, 0.05, 0.14, 0.02], attack: 0.05, release: 0.09, cut: 6, peak: 0.34, vib: { rate: 5.2, depth: 6, delay: 0.2 } }),
  // Flauta travesera: más pura y con vibrato algo más amplio.
  flute: sustained('flute', { amps: [1, 0.12, 0.03, 0.01], attack: 0.04, release: 0.1, cut: 5, peak: 0.34, vib: { rate: 5, depth: 9, delay: 0.25 } }),
  // Clarinete: armónicos impares, cálido en el grave.
  clarinet: sustained('clarinet', { amps: [1, 0.02, 0.5, 0.02, 0.22, 0.01, 0.1], attack: 0.045, release: 0.09, cut: 7, peak: 0.3, vib: { rate: 4.6, depth: 4, delay: 0.35 } }),
  // Acordeón: lengüetas dobles ligeramente desafinadas, brillante pero filtrado.
  accordion: sustained('accordion', { amps: [1, 0.55, 0.38, 0.26, 0.18, 0.12, 0.08, 0.05], attack: 0.06, release: 0.1, cut: 4.5, peak: 0.2, detune: 9 }),
  // Viola / cuerda ligera para colchón: dos voces desafinadas, ataque suave.
  viola: sustained('viola', { amps: [1, 0.6, 0.4, 0.3, 0.2, 0.14, 0.1, 0.06], attack: 0.1, release: 0.4, cut: 5.5, peak: 0.24, detune: 7, vib: { rate: 4.8, depth: 5, delay: 0.4 } }),
  strings: sustained('strings', { amps: [1, 0.5, 0.35, 0.25, 0.16, 0.1, 0.07], attack: 0.28, release: 0.7, cut: 4, peak: 0.18, detune: 11 }),
};
