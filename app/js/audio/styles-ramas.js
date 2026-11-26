// Patrones de acompañamiento de la música de las ramas (escuelas y «Descubre…»).
// Misma firma que styles.js: (part, next, piece) -> [{o, dur, midi, vel, voice}].
// Voces: 'bass', 'acc', 'pad' (colchón) y 'perc' (castañuelas, sin altura: la nota es solo nominal).
import { bassMidi, pcMidi, voicing } from './theory.js';

const roll = (notes, o, dur, vel, voice, gap = 0.03) =>
  notes.map((midi, i) => ({ o: o + i * gap, dur, midi, vel, voice }));
const fifthOf = (c, lo) => pcMidi((c.bass + 7) % 12, lo);

/** Nota nominal de la percusión (el timbre no tiene altura; debe caer en el rango de la partitura). */
const PERC_NOTE = 84;
/** Separación entre golpes de la carretilla de castañuelas, en tiempos. */
const CASTANET_ROLL = 0.17;
/** Paso del trémolo de la balalaica, en tiempos (semicorcheas). */
const TREMOLO_STEP = 0.25;

export const BRANCH_STYLES = {
  // Seguidilla (3/4): guitarra con bajo en 1 y rasgueo en 2 y 3; castañuelas suaves, carretilla al 3.
  seguidilla({ chord: c, len }) {
    const tri = voicing(c, 52, 4);
    const out = [{ o: 0, dur: Math.min(1.6, len), midi: bassMidi(c, 40), vel: 0.66, voice: 'bass' }];
    for (let k = 1; k < len - 0.01; k++) out.push(...roll(tri, k, 0.7, k === 1 ? 0.34 : 0.28, 'acc', 0.022));
    out.push({ o: 0, dur: 0.05, midi: PERC_NOTE, vel: 0.24, voice: 'perc' });
    if (len >= 3) {
      out.push({ o: 2 - CASTANET_ROLL, dur: 0.05, midi: PERC_NOTE, vel: 0.14, voice: 'perc' });
      out.push({ o: 2, dur: 0.05, midi: PERC_NOTE, vel: 0.22, voice: 'perc' });
    }
    return out;
  },

  // Balalaica (4/4): bajo pulsado en 1 y 3 (fundamental y quinta) y trémolo breve del acorde en 2 y 4,
  // con un coro de cuerdas que sostiene el acorde por debajo.
  balalaika({ chord: c, len }) {
    const dyad = voicing(c, 57, 3).slice(1);
    const out = [{ o: 0, dur: len, midi: bassMidi(c, 45), vel: 0.18, voice: 'pad' }];
    out.push(...voicing(c, 52, 3).map((midi) => ({ o: 0.02, dur: len - 0.05, midi, vel: 0.14, voice: 'pad' })));
    for (let k = 0; k < len - 0.01; k++) {
      if (k % 2 === 0) out.push({ o: k, dur: 0.9, midi: k === 0 ? bassMidi(c, 40) : fifthOf(c, 40), vel: k === 0 ? 0.66 : 0.52, voice: 'bass' });
      else {
        for (let j = 0; j < 4; j++) out.push(...roll(dyad, k + j * TREMOLO_STEP, TREMOLO_STEP, 0.3 - j * 0.04, 'acc', 0.012));
      }
    }
    return out;
  },

  // Danza de la campiña (6/8, seis corcheas): bajo en 1 y 4, acordes ligeros en 2-3 y 5-6, cuerdas debajo.
  country({ chord: c, len }) {
    const tri = voicing(c, 55, 3);
    const out = [{ o: 0, dur: len, midi: bassMidi(c, 50), vel: 0.2, voice: 'pad' }];
    for (let k = 0; k < len - 0.01; k += 3) {
      out.push({ o: k, dur: 2.6, midi: k === 0 ? bassMidi(c, 40) : fifthOf(c, 40), vel: k === 0 ? 0.64 : 0.5, voice: 'bass' });
      if (len - k >= 3) {
        out.push(...roll(tri, k + 1, 0.8, 0.3, 'acc', 0.015));
        out.push(...roll(tri.slice(1), k + 2, 0.8, 0.24, 'acc', 0.015));
      }
    }
    return out;
  },

  // Koto: nota grave larga y un arpegio que sube y vuelve, con mucho aire entre notas.
  koto({ chord: c, len }) {
    const bs = bassMidi(c, 38);
    const up = voicing(c, bs + 12, 3);
    const out = [{ o: 0, dur: len, midi: bs, vel: 0.5, voice: 'bass' }];
    const steps = [[0.5, up[0]], [1, up[1]], [1.5, up[2] ?? up[0] + 12]];
    if (len >= 4) steps.push([2.5, up[1]], [3, up[0]]);
    for (const [o, midi] of steps) if (o < len) out.push({ o, dur: len - o, midi, vel: 0.28, voice: 'acc' });
    return out;
  },

  // Gallarda (3/4): bajo largo en 1, acorde breve en la contra del 2 y otro en el 3 (paso de danza).
  galliard({ chord: c, len }) {
    const tri = voicing(c, 55, 3);
    const out = [{ o: 0, dur: len, midi: bassMidi(c, 48), vel: 0.2, voice: 'pad' }];
    out.push({ o: 0, dur: Math.min(2, len), midi: bassMidi(c, 40), vel: 0.64, voice: 'bass' });
    if (len >= 2) out.push(...roll(tri, 1.5, 0.45, 0.28, 'acc', 0.02));
    if (len >= 3) out.push(...roll(tri, 2, 0.9, 0.34, 'acc', 0.025));
    return out;
  },

  // Serenata (4/4): pizzicato con bajo en 1 y 3 y acordes a contratiempo; cuerdas sostienen debajo.
  serenade({ chord: c, len }) {
    const tri = voicing(c, 57, 3);
    const out = [{ o: 0, dur: len, midi: bassMidi(c, 48), vel: 0.16, voice: 'pad' }];
    for (let k = 0; k < len - 0.01; k++) {
      if (k % 2 === 0) out.push({ o: k, dur: 0.5, midi: k === 0 ? bassMidi(c, 40) : fifthOf(c, 40), vel: k === 0 ? 0.66 : 0.54, voice: 'bass' });
      out.push(...roll(tri, k + 0.5, 0.35, 0.3, 'acc', 0.01));
    }
    return out;
  },

  // Tresillo (4/4, 3+3+2): bajo en 1, en la contra del 2 y en 4; acordes en 2 y en la contra del 3.
  tresillo({ chord: c, len }) {
    const tri = voicing(c, 55, 3);
    const bs = bassMidi(c, 40);
    const out = [{ o: 0, dur: 1.4, midi: bs, vel: 0.66, voice: 'bass' }];
    if (len >= 2) {
      out.push({ o: 1.5, dur: 1.4, midi: fifthOf(c, 40), vel: 0.5, voice: 'bass' });
      out.push(...roll(tri, 1, 0.45, 0.3, 'acc', 0.015));
    }
    if (len >= 4) {
      out.push({ o: 3, dur: 0.9, midi: bs + 12, vel: 0.46, voice: 'bass' });
      out.push(...roll(tri, 2.5, 0.45, 0.28, 'acc', 0.015));
    }
    return out;
  },
};
