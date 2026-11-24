// Reproductor de una pieza (una era): cadena de nodos, instrumentos y fundidos.
// También el grafo de audio común (volumen maestro, limitador, bus de música, ducking, reverb)
// y un renderizado sin conexión (OfflineAudioContext) para verificar la señal.
import { SCORES } from './scores.js';
import { INSTRUMENTS, WET, Budget } from './instruments.js';
import { Sequencer } from './sequencer.js';
import { makeImpulse } from './reverb.js';
import { playSfx } from './sfx.js';

const MUSIC_LEVEL = 0.5; // la música es un fondo: siempre por debajo de los efectos
const SFX_LEVEL = 0.75;

/** Grafo común a música y efectos. */
export function createGraph(ctx) {
  const master = ctx.createGain();
  const limiter = ctx.createDynamicsCompressor(); // red de seguridad: evita saturar
  limiter.threshold.value = -4;
  limiter.knee.value = 6;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.2;
  master.connect(limiter);
  limiter.connect(ctx.destination);

  const musicBus = ctx.createGain();
  musicBus.gain.value = MUSIC_LEVEL;
  const duck = ctx.createGain(); // baja la música mientras suena un efecto
  musicBus.connect(duck);
  duck.connect(master);

  const sfxBus = ctx.createGain();
  sfxBus.gain.value = SFX_LEVEL;
  sfxBus.connect(master);

  const reverbIn = ctx.createGain();
  const convolver = ctx.createConvolver();
  convolver.buffer = makeImpulse(ctx);
  reverbIn.connect(convolver);
  convolver.connect(musicBus);
  return { master, limiter, musicBus, duck, sfxBus, reverbIn, convolver };
}

/** Un reproductor por era; al cambiar de era conviven dos durante el fundido cruzado. */
export function createMusicPlayer(ctx, graph, era) {
  const piece = SCORES[era];
  const bus = ctx.createGain();
  const wetBus = ctx.createGain();
  bus.gain.value = 0;
  wetBus.gain.value = 0;
  bus.connect(graph.musicBus);
  wetBus.connect(graph.reverbIn);

  const budget = new Budget(26);
  const routes = {};
  const route = (inst) => {
    if (!routes[inst]) {
      const input = ctx.createGain();
      const wet = ctx.createGain();
      wet.gain.value = (WET[inst] ?? 1) * piece.reverb;
      input.connect(bus);
      input.connect(wet);
      wet.connect(wetBus);
      routes[inst] = input;
    }
    return routes[inst];
  };

  const play = (ev, when, dur) => {
    const inst = piece.voices[ev.voice];
    const fn = INSTRUMENTS[inst];
    if (!fn) return;
    if (!budget.acquire(when, when + dur + 0.5, ev.voice === 'mel' ? 2 : 1)) return;
    fn(ctx, route(inst), when, ev.midi, dur, Math.min(1, ev.vel * (piece.vg[ev.voice] ?? 1)), { pedal: piece.pedal });
  };

  const seq = new Sequencer(ctx, era, play, { seed: era.length * 977 + 13 });
  let disposed = false;

  const fadeTo = (target, secs) => {
    const t = ctx.currentTime;
    for (const g of [bus.gain, wetBus.gain]) {
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(target, t + secs);
    }
  };

  return {
    era, piece,
    start(fadeIn = 1.5) { bus.gain.value = 0; wetBus.gain.value = 0; seq.start(); fadeTo(piece.level, fadeIn); },
    fadeOutAndDispose(secs = 1.5) {
      fadeTo(0, secs);
      setTimeout(() => this.dispose(), secs * 1000 + 150);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      seq.stop();
      for (const n of [bus, wetBus, ...Object.values(routes)]) { try { n.disconnect(); } catch { /* ok */ } }
    },
    /** Programa de golpe `seconds` de música (renderizado sin conexión). */
    renderTo(seconds) {
      bus.gain.value = piece.level;
      wetBus.gain.value = piece.level;
      seq.loopStart = 0;
      seq.prepare(0);
      seq.scheduleRange(seconds, -Infinity);
    },
  };
}

/** Renderiza una era sin conexión. Devuelve el AudioBuffer (para medir picos y RMS). */
export async function renderEraOffline(era, seconds = 20, sampleRate = 44100) {
  const OAC = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  const off = new OAC(2, Math.ceil(sampleRate * seconds), sampleRate);
  const graph = createGraph(off);
  createMusicPlayer(off, graph, era).renderTo(seconds);
  return off.startRendering();
}

/** Renderiza un efecto sin conexión (con la música apagada). */
export async function renderSfxOffline(name, tonicOffset = 0, sampleRate = 44100) {
  const OAC = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  const off = new OAC(2, Math.ceil(sampleRate * 3.2), sampleRate);
  const graph = createGraph(off);
  playSfx(off, graph, name, { tonicOffset, when: 0.01, duck: false });
  return off.startRendering();
}
