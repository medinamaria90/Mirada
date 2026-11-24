// Efectos de sonido como datos: notas (t en s, m = MIDI en Do, d = duración/ring, v = fuerza, type = timbre).
// Se transponen a la tónica de la pieza que suena para no chocar con ella (sobre todo quintas y octavas).
import { INSTRUMENTS } from './instruments.js';

export const SFX_NAMES = ['tap', 'correct', 'wrong', 'streak', 'levelup', 'medal', 'unlock', 'complete'];

const N = (t, m, d, v, type = 'chime', decay) => ({ t, m, d, v, type, decay });

export const SFX = {
  // Un clic mínimo, casi imperceptible.
  tap: { duck: 0, notes: [N(0, 88, 0.07, 0.3, 'chime', 0.07)] },
  // Dos notas ascendentes, una quinta: limpio y amable.
  correct: { duck: 0.5, hold: 0.45, notes: [N(0, 79, 0.35, 0.55), N(0.1, 86, 0.5, 0.6)] },
  // Suave y grave: baja una cuarta hasta la tónica; resuelve, no castiga.
  wrong: { duck: 0.6, hold: 0.4, notes: [N(0, 55, 0.3, 0.5, 'soft'), N(0.14, 48, 0.4, 0.5, 'soft')] },
  // Pequeña fanfarria ascendente.
  streak: { duck: 0.45, hold: 0.6, notes: [N(0, 72, 0.3, 0.5), N(0.075, 76, 0.3, 0.5), N(0.15, 79, 0.3, 0.55),
    N(0.225, 84, 0.45, 0.6), N(0.3, 91, 0.5, 0.45)] },
  // Arpegio ascendente más amplio con brillo final.
  levelup: { duck: 0.4, hold: 0.85, notes: [N(0, 67, 0.3, 0.5), N(0.09, 72, 0.3, 0.5), N(0.18, 76, 0.3, 0.5),
    N(0.27, 79, 0.35, 0.55), N(0.36, 84, 0.45, 0.6), N(0.45, 88, 0.6, 0.6), N(0.45, 76, 0.55, 0.3, 'bell', 0.55)] },
  // Campana: golpe, quinta y octava.
  medal: { duck: 0.4, hold: 0.9, notes: [N(0, 72, 0.9, 0.7, 'bell', 0.9), N(0.14, 79, 0.85, 0.6, 'bell', 0.8),
    N(0.28, 84, 0.8, 0.55, 'chime', 0.8)] },
  // Algo que se abre: tres notas ascendentes suaves.
  unlock: { duck: 0.5, hold: 0.5, notes: [N(0, 74, 0.35, 0.5), N(0.07, 81, 0.35, 0.5), N(0.14, 86, 0.5, 0.55),
    N(0.21, 93, 0.35, 0.3)] },
  // Final de lección: arpegio, acorde pleno y destellos.
  complete: { duck: 0.3, hold: 1.9, notes: [N(0, 60, 0.4, 0.5), N(0.1, 64, 0.4, 0.5), N(0.2, 67, 0.4, 0.5),
    N(0.3, 72, 0.45, 0.55), N(0.4, 76, 0.45, 0.55), N(0.5, 79, 0.45, 0.6), N(0.6, 84, 0.6, 0.6),
    N(0.78, 72, 1.6, 0.55, 'bell', 1.6), N(0.78, 79, 1.5, 0.45, 'chime', 1.4), N(0.78, 84, 1.5, 0.5, 'chime', 1.5),
    N(0.78, 88, 1.4, 0.4, 'chime', 1.3), N(1.0, 91, 0.7, 0.35), N(1.12, 96, 0.8, 0.3)] },
};

/** Duración total (s) de un efecto. */
export const sfxLength = (name) => Math.max(...SFX[name].notes.map((n) => n.t + (n.decay ?? n.d)));

/**
 * Reproduce un efecto en `graph.sfxBus` y baja la música un momento (ducking).
 * tonicOffset: semitonos (-6..5) para transponer a la tónica de la pieza actual.
 */
export function playSfx(ctx, graph, name, { tonicOffset = 0, when = ctx.currentTime + 0.01, duck = true } = {}) {
  const def = SFX[name];
  if (!def) return 0;
  for (const n of def.notes) {
    INSTRUMENTS[n.type](ctx, graph.sfxBus, when + n.t, n.m + tonicOffset, n.d, n.v, { decay: n.decay });
  }
  if (duck && def.duck && graph.duck) {
    const g = graph.duck.gain;
    g.cancelScheduledValues(when);
    g.setTargetAtTime(def.duck, when, 0.02);
    g.setTargetAtTime(1, when + def.hold, 0.25);
  }
  return sfxLength(name);
}
