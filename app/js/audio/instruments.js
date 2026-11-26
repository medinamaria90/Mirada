// Timbres sintetizados: osciladores + envolventes + filtros, y cuerda pulsada Karplus-Strong.
// Todas las funciones: (ctx, dest, when, midi, dur, vel, opts) -> instante de fin (s).
// Cada nota crea pocos nodos y se desconecta sola al terminar.
import { midiToFreq, clamp } from './theory.js';
import { pluckBuffer } from './ks.js';
import { WINDS } from './sustained.js';
import { castanets } from './percussion.js';

// ---------------------------------------------------------------- utilidades
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
  const last = nodes[0];
  last.onended = () => nodes.forEach((n) => { try { n.disconnect(); } catch { /* ya desconectado */ } });
  return end;
}

const bufCache = new Map(); // buffers KS por (tipo, nota, sr); se comparten entre contextos del mismo sr
function ksBuffer(ctx, kind, midi, cfg) {
  const key = `${kind}:${midi}:${ctx.sampleRate}`;
  let hit = bufCache.get(key);
  if (!hit) {
    if (bufCache.size > 90) bufCache.delete(bufCache.keys().next().value);
    const r = pluckBuffer(ctx.sampleRate, midiToFreq(midi), cfg.seconds, { ...cfg, seed: midi });
    const buffer = ctx.createBuffer(1, r.data.length, ctx.sampleRate);
    buffer.copyToChannel(r.data, 0);
    hit = { buffer, freq: r.freq };
    bufCache.set(key, hit);
  }
  return hit;
}

// ---------------------------------------------------------------- cuerda pulsada
// damp = paso bajo del bucle (los agudos mueren antes), cut = corte final (Hz), body = cuerpo de madera,
// attack = subida inicial (s). Afinado contra el «suena demasiado metálico» (nov. 2026): excitación más
// suave, bucle más cerrado, corte más bajo y caja de madera sin presencia aguda; el clave conserva algo
// más de brillo (es su carácter), con menos registro de 4 pies.
export const KS = {
  lute: { t60: 1.8, blend: 0.5, bright: 0.22, pick: 0.2, seconds: 1.6, rel: 0.5, peak: 0.9, octave: 0, damp: 0.5, cut: 3200, body: 0.5, attack: 0.004 },
  harpsichord: { t60: 1.5, blend: 0.6, bright: 0.5, pick: 0.13, seconds: 1.2, rel: 0.07, peak: 0.8, octave: 0.18, damp: 0.6, cut: 4200, body: 0.35, attack: 0.002 },
  harpsiLite: { t60: 0.85, blend: 0.58, bright: 0.42, pick: 0.27, seconds: 0.8, rel: 0.05, peak: 0.8, octave: 0.12, damp: 0.58, cut: 4000, body: 0.35, attack: 0.002 },
  guitar: { t60: 2.6, blend: 0.5, bright: 0.26, pick: 0.28, seconds: 2.2, rel: 0.6, peak: 0.85, octave: 0, damp: 0.5, cut: 3400, body: 0.6, attack: 0.004 },
  // arpa: cuerda de tripa pulsada en el centro (pocos armónicos), larga y sin cuerpo de caja
  harp: { t60: 3.2, blend: 0.5, bright: 0.18, pick: 0.45, seconds: 2.6, rel: 1.2, peak: 0.8, octave: 0, damp: 0.45, cut: 3000, body: 0.3, attack: 0.006 },
  pizz: { t60: 0.55, blend: 0.5, bright: 0.28, pick: 0.32, seconds: 0.6, rel: 0.12, peak: 0.9, octave: 0, damp: 0.5, cut: 3200, body: 0.55, attack: 0.003 },
  balalaika: { t60: 0.9, blend: 0.5, bright: 0.3, pick: 0.16, seconds: 0.9, rel: 0.12, peak: 0.8, octave: 0, damp: 0.55, cut: 3400, body: 0.4, attack: 0.003 },
  koto: { t60: 2.2, blend: 0.5, bright: 0.3, pick: 0.12, seconds: 2, rel: 0.7, peak: 0.85, octave: 0, damp: 0.5, cut: 3600, body: 0.25, attack: 0.003 },
};

function plucked(kind) {
  const cfg = KS[kind];
  return (ctx, dest, when, midi, dur, vel) => {
    const { buffer, freq } = ksBuffer(ctx, kind, midi, cfg);
    const rate = midiToFreq(midi) / freq;
    const g = ctx.createGain();
    const amp = vel * cfg.peak;
    const off = when + dur;
    g.gain.setValueAtTime(amp, when);
    g.gain.setValueAtTime(amp, off);
    g.gain.linearRampToValueAtTime(0.0001, off + cfg.rel); // la cuerda se apaga (clave) o se deja morir (laúd)
    const end = Math.min(off + cfg.rel, when + buffer.duration / rate) + 0.02;
    const make = (r, level) => {
      const s = ctx.createBufferSource();
      s.buffer = buffer;
      s.playbackRate.value = r;
      if (level === 1) s.connect(g);
      else { const lg = ctx.createGain(); lg.gain.value = level; s.connect(lg); lg.connect(g); }
      s.start(when);
      s.stop(end);
      return s;
    };
    const main = make(rate, 1);
    if (cfg.octave && midi <= 84) make(rate * 2, cfg.octave); // registro de 4 pies
    g.connect(dest);
    return finish(end, main, g);
  };
}

// ---------------------------------------------------------------- pianos
const PIANO = {
  piano: { amps: [1, 0.55, 0.32, 0.2, 0.12, 0.08, 0.05, 0.03], tau: 1.3, peak: 0.55, bright: 1, unison: 2, rel: 0.25 },
  felt: { amps: [1, 0.35, 0.14, 0.06, 0.03], tau: 1.0, peak: 0.6, bright: 0.45, unison: 2, rel: 0.2 },
  fortepiano: { amps: [1, 0.45, 0.6, 0.18, 0.32, 0.1, 0.12, 0.05], tau: 0.55, peak: 0.5, bright: 0.8, unison: 1, rel: 0.1 },
};

function pianoLike(name) {
  const cfg = PIANO[name];
  return (ctx, dest, when, midi, dur, vel, o = {}) => {
    const freq = midiToFreq(midi);
    const tau = cfg.tau * clamp(1.6 - (midi - 48) / 48, 0.45, 1.6); // graves duran más
    const rel = o.pedal ? 0.9 : cfg.rel;
    const tr = when + Math.max(0.05, dur + (o.pedal ? 0.35 : 0));
    const amp = vel * cfg.peak;
    const g = ctx.createGain();
    const vr = Math.max(0.0003, amp * Math.exp(-(tr - when) / tau));
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(amp, when + 0.004);
    g.gain.exponentialRampToValueAtTime(vr, tr);
    g.gain.exponentialRampToValueAtTime(0.0001, tr + rel);
    const f = ctx.createBiquadFilter(); // el timbre se apaga al decaer (como una cuerda real)
    f.type = 'lowpass';
    const fc0 = clamp(freq * (2.5 + vel * 8 * cfg.bright), 500, 9000);
    f.frequency.setValueAtTime(fc0, when);
    f.frequency.exponentialRampToValueAtTime(clamp(freq * 2, 350, fc0), when + tau * 1.5);
    f.Q.value = 0.4;
    f.connect(g);
    g.connect(dest);
    const w = wave(ctx, name, cfg.amps);
    const end = tr + rel + 0.05;
    const oscs = [];
    for (let i = 0; i < cfg.unison; i++) {
      const s = ctx.createOscillator();
      s.setPeriodicWave(w);
      s.frequency.value = freq;
      if (cfg.unison > 1) s.detune.value = (i === 0 ? -3 : 3);
      s.connect(f);
      s.start(when);
      s.stop(end);
      oscs.push(s);
    }
    return finish(end, oscs[0], f, g);
  };
}

// ---------------------------------------------------------------- caja de música y campanas
function pinged(name, amps, tau, { peak = 0.5, trem = null } = {}) {
  return (ctx, dest, when, midi, dur, vel, o = {}) => {
    const t = o.decay ?? tau;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vel * peak, when + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, when + t);
    const s = ctx.createOscillator();
    s.setPeriodicWave(wave(ctx, name, amps));
    s.frequency.value = midiToFreq(midi);
    g.connect(dest);
    s.start(when);
    s.stop(when + t + 0.03);
    const extra = [];
    if (trem) { // vibráfono: el motor hace ondular la amplitud (etapa aparte, sin tocar la envolvente)
      const tg = ctx.createGain();
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      tg.gain.value = 1 - trem.depth;
      lfo.frequency.value = trem.rate;
      depth.gain.value = trem.depth;
      lfo.connect(depth);
      depth.connect(tg.gain);
      s.connect(tg);
      tg.connect(g);
      lfo.start(when);
      lfo.stop(when + t + 0.03);
      extra.push(tg, lfo, depth);
    } else s.connect(g);
    return finish(when + t + 0.03, s, ...extra, g);
  };
}

// Campana por modulación de frecuencia con razón inarmónica (carácter de celesta/campana).
function bell(ctx, dest, when, midi, dur, vel, o = {}) {
  const f = midiToFreq(midi);
  const t = o.decay ?? clamp(2.8 - (midi - 60) * 0.03, 1.0, 3.0);
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, when);
  out.gain.linearRampToValueAtTime(vel * 0.42, when + 0.003);
  out.gain.exponentialRampToValueAtTime(0.0001, when + t);
  const car = ctx.createOscillator();
  const mod = ctx.createOscillator();
  const mg = ctx.createGain();
  car.frequency.value = f;
  mod.frequency.value = f * 3.5;
  mg.gain.setValueAtTime(f * 1.6, when);
  mg.gain.exponentialRampToValueAtTime(f * 0.05, when + t * 0.5);
  mod.connect(mg);
  mg.connect(car.frequency);
  car.connect(out);
  out.connect(dest);
  car.start(when);
  mod.start(when);
  car.stop(when + t + 0.03);
  mod.stop(when + t + 0.03);
  return finish(when + t + 0.03, car, mod, mg, out);
}

// ---------------------------------------------------------------- cuerda frotada / colchón
function bowed({ attack, release, cut, peak, detune }) {
  return (ctx, dest, when, midi, dur, vel) => {
    const f = midiToFreq(midi);
    const end = when + dur;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vel * peak, when + attack);
    g.gain.setValueAtTime(vel * peak, Math.max(when + attack, end - 0.02));
    g.gain.linearRampToValueAtTime(0.0001, end + release);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = clamp(f * cut, 300, 4000);
    lp.Q.value = 0.7;
    lp.connect(g);
    g.connect(dest);
    const oscs = [-detune, detune].map((d) => {
      const s = ctx.createOscillator();
      s.type = 'sawtooth';
      s.frequency.value = f;
      s.detune.value = d;
      s.connect(lp);
      s.start(when);
      s.stop(end + release + 0.05);
      return s;
    });
    return finish(end + release + 0.05, oscs[0], lp, g);
  };
}

// ---------------------------------------------------------------- sonidos simples para efectos
function soft(ctx, dest, when, midi, dur, vel, o = {}) {
  const t = o.decay ?? dur;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(vel * 0.6, when + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, when + t);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900;
  const s = ctx.createOscillator();
  s.type = 'triangle';
  s.frequency.value = midiToFreq(midi);
  s.connect(lp);
  lp.connect(g);
  g.connect(dest);
  s.start(when);
  s.stop(when + t + 0.03);
  return finish(when + t + 0.03, s, lp, g);
}

export const INSTRUMENTS = {
  lute: plucked('lute'),
  harpsichord: plucked('harpsichord'),
  harpsiLite: plucked('harpsiLite'),
  guitar: plucked('guitar'),
  harp: plucked('harp'),
  pizz: plucked('pizz'),
  balalaika: plucked('balalaika'),
  koto: plucked('koto'),
  piano: pianoLike('piano'),
  felt: pianoLike('felt'),
  fortepiano: pianoLike('fortepiano'),
  musicbox: pinged('musicbox', [1, 0.3, 0, 0, 0, 0.1], 1.4),
  chime: pinged('chime', [1, 0.4, 0.12], 0.6),
  celesta: pinged('celesta', [1, 0.12, 0, 0.32, 0, 0, 0, 0.06], 1.3, { peak: 0.45 }),
  glock: pinged('glock', [1, 0.25, 0, 0, 0.08], 0.9, { peak: 0.4 }),
  vibraphone: pinged('vibraphone', [1, 0.08, 0, 0.1], 2.6, { peak: 0.42, trem: { rate: 4.5, depth: 0.35 } }),
  bell,
  cello: bowed({ attack: 0.12, release: 0.5, cut: 5, peak: 0.28, detune: 5 }),
  pad: bowed({ attack: 0.5, release: 0.8, cut: 3, peak: 0.16, detune: 7 }),
  soft,
  castanets,
  ...WINDS,
};

/** Envío a reverb por instrumento (0..1, se multiplica por el de la pieza). */
export const WET = { lute: 1, harpsichord: 0.8, harpsiLite: 0.8, guitar: 0.9, harp: 1, pizz: 0.6, piano: 1, felt: 1,
  fortepiano: 0.7, musicbox: 1, celesta: 1, glock: 0.9, vibraphone: 1, bell: 1, cello: 1, pad: 1, chime: 1, soft: 0.5,
  recorder: 0.9, flute: 0.9, clarinet: 0.8, accordion: 0.6, viola: 1, strings: 1,
  organ: 1, fiddle: 0.9, gamba: 0.9,
  balalaika: 0.8, koto: 1, castanets: 0.5, shakuhachi: 1 };

/** Control de polifonía: limita las notas simultáneas; descarta las menos importantes. */
export class Budget {
  constructor(max) { this.max = max; this.ends = []; }
  acquire(when, end, priority = 1) {
    this.ends = this.ends.filter((e) => e > when);
    if (this.ends.length >= this.max && priority < 2) return false;
    this.ends.push(end);
    return true;
  }
}
