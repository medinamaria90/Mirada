// Patrones de acompañamiento de las variantes: danzas y texturas con bajo y pulso claros.
// Misma firma que styles.js: (part, next, piece) -> [{o, dur, midi, vel, voice}].
// Voces: 'bass' (grave), 'acc' (acordes/arpegios), 'pad' (colchón sostenido), 'cnt' la define la partitura.
import { bassMidi, pcMidi, voicing } from './theory.js';

const roll = (notes, o, dur, vel, voice, gap = 0.03) =>
  notes.map((midi, i) => ({ o: o + i * gap, dur, midi, vel, voice }));
const fifthOf = (c, lo) => pcMidi((c.bass + 7) % 12, lo);

export const DANCE_STYLES = {
  // Renacimiento, 6/8 (6 tiempos = corcheas): bajo en 1 y 4, acorde ligero en 3 y 6, viola sostenida.
  gigue({ chord: c, len }) {
    const bs = bassMidi(c, 38);
    const tri = voicing(c, 55, 3);
    const out = [{ o: 0, dur: len, midi: bassMidi(c, 48), vel: 0.3, voice: 'pad' }];
    for (let k = 0; k < len - 0.01; k += 3) {
      out.push({ o: k, dur: 1.4, midi: k === 0 ? bs : fifthOf(c, 38), vel: k === 0 ? 0.76 : 0.6, voice: 'bass' });
      if (len - k >= 3) out.push(...roll(tri, k + 2, 0.9, 0.36, 'acc'));
    }
    return out;
  },

  // Renacimiento, bajo obstinado: laúd en el bajo (1 y 3) y acorde en 2 y 4; viola sostiene la fundamental.
  ground({ chord: c, len }) {
    const bs = bassMidi(c, 38);
    const tri = voicing(c, 55, 3);
    const out = [{ o: 0, dur: len, midi: bassMidi(c, 50), vel: 0.26, voice: 'pad' }];
    for (let k = 0; k < len - 0.01; k++) {
      if (k % 2 === 0) out.push({ o: k, dur: 1.6, midi: k === 0 ? bs : bs + 12, vel: k === 0 ? 0.74 : 0.5, voice: 'bass' });
      else out.push(...roll(tri, k, 0.9, 0.34, 'acc', 0.04));
    }
    return out;
  },

  // Barroco, zarabanda (3/4): bajo largo, acorde ligero en 1 y apoyado en 2.
  sarabande({ chord: c, len }) {
    const tri = voicing(c, 53, 4);
    const out = [{ o: 0, dur: len, midi: bassMidi(c, 36), vel: 0.72, voice: 'bass' }];
    out.push(...roll(tri, 0, 1, 0.3, 'acc', 0.02));
    if (len >= 2) out.push(...roll(tri, 1, Math.min(2, len - 1), 0.44, 'acc', 0.025));
    return out;
  },

  // Barroco, bajo caminante en corcheas (cello) con acordes de clave en los tiempos.
  walking({ chord: c, len }, next, piece) {
    const root = bassMidi(c, 36);
    const tri = voicing(c, 55, 3);
    const steps = [root, root + c.intervals[1], root + c.intervals[2], root + 12, root + c.intervals[2], root + c.intervals[1]];
    const out = [];
    const n = Math.round(len * 2);
    for (let i = 0; i < n; i++) {
      let midi = steps[i % steps.length];
      if (i === n - 1 && next) { // nota de paso hacia el bajo siguiente
        let tgt = bassMidi(next.chord, 36);
        if (Math.abs(tgt + 12 - root) < Math.abs(tgt - root)) tgt += 12;
        midi = tgt > root ? tgt - 1 : tgt + 1;
        if (!piece.scale.has(((midi % 12) + 12) % 12)) midi = tgt > root ? tgt - 2 : tgt + 2;
      }
      out.push({ o: i * 0.5, dur: 0.46, midi, vel: i % 2 === 0 ? 0.62 : 0.44, voice: 'bass' });
    }
    for (let k = 0; k < len - 0.01; k += 2) out.push(...roll(tri, k, 0.9, k === 0 ? 0.4 : 0.32, 'acc', 0.015));
    return out;
  },

  // Rococó, gavota (4/4 ligero): bajo en 1 y 3, acordes cortos en 2 y 4.
  gavotte({ chord: c, len }) {
    const bs = bassMidi(c, 43);
    const tri = voicing(c, 55, 3);
    const out = [];
    for (let k = 0; k < len - 0.01; k++) {
      if (k % 2 === 0) out.push({ o: k, dur: 0.7, midi: k === 0 ? bs : fifthOf(c, 43), vel: k === 0 ? 0.62 : 0.5, voice: 'bass' });
      else out.push(...roll(tri, k, 0.4, 0.34, 'acc', 0.01));
    }
    return out;
  },

  // Vals (3/4): bajo en 1, acordes ligeros en 2 y 3 (más leve el 3).
  waltz({ chord: c, len }) {
    const tri = voicing(c, 55, 3);
    const out = [{ o: 0, dur: 1.2, midi: bassMidi(c, 38), vel: 0.66, voice: 'bass' }];
    for (let k = 1; k < len - 0.01; k++) out.push(...roll(tri, k, 0.8, k === 1 ? 0.36 : 0.3, 'acc', 0.012));
    return out;
  },

  // Barcarola (6/8): bajo en 1, arpegio ascendente en 2–3, quinta en 4 y arpegio en 5–6; con pedal.
  barcarolle({ chord: c, len }) {
    const bs = bassMidi(c, 36);
    const up = voicing(c, bs + 7, 3);
    const out = [];
    for (let k = 0; k < len - 0.01; k += 3) {
      out.push({ o: k, dur: 2.8, midi: k === 0 ? bs : fifthOf(c, 36), vel: k === 0 ? 0.6 : 0.46, voice: 'bass' });
      out.push({ o: k + 1, dur: 2, midi: up[0], vel: 0.32, voice: 'acc' });
      out.push({ o: k + 2, dur: 1.2, midi: up[1] ?? up[0] + 7, vel: 0.3, voice: 'acc' });
    }
    return out;
  },

  // Polca / aire popular (2/4): bajo en 1 y 2 (fundamental, quinta), acordes en las contras.
  polka({ chord: c, len }) {
    const bs = bassMidi(c, 38);
    const tri = voicing(c, 55, 3);
    const out = [];
    for (let k = 0; k < len - 0.01; k++) {
      out.push({ o: k, dur: 0.45, midi: k % 2 === 0 ? bs : fifthOf(c, 38), vel: k === 0 ? 0.7 : 0.55, voice: 'bass' });
      out.push(...roll(tri, k + 0.5, 0.4, 0.34, 'acc', 0.01));
    }
    return out;
  },

  // Habanera (2/4): bajo con puntillo (1, 1.75, 2.5 en semicorcheas) y acorde a contratiempo.
  habanera({ chord: c, len }) {
    const bs = bassMidi(c, 38);
    const tri = voicing(c, 55, 3);
    const out = [{ o: 0, dur: 0.7, midi: bs, vel: 0.7, voice: 'bass' }];
    if (len >= 2) {
      out.push({ o: 0.75, dur: 0.22, midi: bs + 12, vel: 0.42, voice: 'bass' });
      out.push({ o: 1, dur: 0.45, midi: fifthOf(c, 38), vel: 0.55, voice: 'bass' });
      out.push(...roll(tri, 1.5, 0.45, 0.36, 'acc', 0.01));
    }
    return out;
  },

  // Impresionismo: bajo largo, acorde de 9.ª en bloque a mitad de parte, sostenido con pedal.
  wash({ chord: c, len }) {
    const bs = bassMidi(c, 36);
    const up = voicing(c, bs + 9, 4);
    const half = len / 2;
    const out = [{ o: 0, dur: len, midi: bs, vel: 0.52, voice: 'bass' }];
    out.push(...roll(up.slice(0, 3), 0.5, len - 0.5, 0.26, 'acc', 0.06));
    if (len >= 3) out.push(...roll(up.slice(1), half, len - half, 0.24, 'acc', 0.06));
    return out;
  },

  // Musette (3/4): guitarra con bajo en 1 y acordes en 2 y 3; acordeón sostiene el acorde.
  musette({ chord: c, len }) {
    const tri = voicing(c, 55, 3);
    const out = [{ o: 0, dur: 1.2, midi: bassMidi(c, 40), vel: 0.66, voice: 'bass' }];
    for (let k = 1; k < len - 0.01; k++) out.push(...roll(tri, k, 0.7, 0.34, 'acc', 0.018));
    out.push(...voicing(c, 50, 3).map((midi) => ({ o: 0.05, dur: len - 0.1, midi, vel: 0.26, voice: 'pad' })));
    return out;
  },

  // Postimpresionismo (4/4): guitarra rasgueada, bajo en 1 y 3, acorde en 2 y en la contra del 3.
  strum({ chord: c, len }) {
    const bs = bassMidi(c, 38);
    const tri = voicing(c, 52, 4);
    const out = [{ o: 0, dur: 1.4, midi: bs, vel: 0.7, voice: 'bass' }];
    if (len >= 2) out.push(...roll(tri, 1, 0.9, 0.36, 'acc', 0.02));
    if (len >= 4) {
      out.push({ o: 2, dur: 1.4, midi: fifthOf(c, 38), vel: 0.55, voice: 'bass' });
      out.push(...roll(tri, 2.5, 0.5, 0.3, 'acc', 0.02));
      out.push(...roll(tri, 3, 0.9, 0.34, 'acc', 0.02));
    }
    return out;
  },

  // Moderno: vibráfono en bloques resonantes, bajo en 1, acorde en 1.5 y respuesta en 3.5.
  shimmer({ chord: c, len }) {
    const bs = bassMidi(c, 40);
    const up = voicing(c, bs + 12, 3);
    const out = [{ o: 0, dur: len, midi: bs, vel: 0.5, voice: 'bass' }];
    out.push(...roll(up, 1.5, len, 0.3, 'acc', 0.05));
    if (len >= 4) out.push({ o: 3.5, dur: 1.5, midi: up[0] + 12, vel: 0.22, voice: 'acc' });
    return out;
  },

  // Portada: piano de fieltro con bajo y acorde roto (grave, quinta, tercera, octava) + cuerdas graves.
  cradle({ chord: c, len }) {
    const bs = bassMidi(c, 40);
    const up = voicing(c, bs + 7, 3);
    const seq = [bs, up[0], up[1], up[2] ?? up[0] + 12];
    const vels = [0.5, 0.3, 0.28, 0.26];
    const out = [];
    for (let i = 0; i < Math.round(len * 2); i++) {
      out.push({ o: i * 0.5, dur: i === 0 ? Math.min(2, len) : 0.9, midi: seq[i % 4], vel: vels[i % 4], voice: i === 0 ? 'bass' : 'acc' });
    }
    out.push(...voicing(c, 48, 2).map((midi) => ({ o: 0, dur: len, midi, vel: 0.18, voice: 'pad' })));
    return out;
  },

  // Portada 2 (3/4): guitarra con bajo en 1 y arpegio en 2 y 3, cello en la fundamental.
  pluckwaltz({ chord: c, len }) {
    const bs = bassMidi(c, 40);
    const up = voicing(c, 52, 3);
    const out = [{ o: 0, dur: 1.4, midi: bs, vel: 0.62, voice: 'bass' }];
    out.push({ o: 0, dur: len, midi: bassMidi(c, 36), vel: 0.22, voice: 'pad' });
    if (len >= 2) out.push({ o: 1, dur: 1, midi: up[1], vel: 0.32, voice: 'acc' });
    if (len >= 3) out.push({ o: 2, dur: 1, midi: up[2] ?? up[0] + 12, vel: 0.3, voice: 'acc' });
    return out;
  },
};
