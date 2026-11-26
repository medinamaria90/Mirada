// Patrones de acompañamiento: convierten cada acorde (parte de compás) en notas.
// Cada estilo recibe (part, next, piece) y devuelve [{o, dur, midi, vel, voice}],
// con `o` = desplazamiento en tiempos desde el inicio de la parte.
import { bassMidi, pcMidi, voicing, stepIn } from './theory.js';
import { DANCE_STYLES } from './styles-dance.js';
import { BRANCH_STYLES } from './styles-ramas.js';

const VIHUELA_BASS_LO = 41; // fa grave: la romanesca baja Sib–Fa y sube a Sol y Re sin saltar de octava
const VIHUELA_INNER_LO = 53; // díada interior entre fa3 y fa4, por debajo de la melodía

const roll = (notes, o, dur, vel, voice, gap = 0.04) =>
  notes.map((midi, i) => ({ o: o + i * gap, dur, midi, vel, voice }));

export const STYLES = {
  ...DANCE_STYLES,
  ...BRANCH_STYLES,
  // Laúd: bajo + acorde rasgueado en los tiempos fuertes (danza lenta).
  lute({ chord: c, len }) {
    const out = [];
    const bs = bassMidi(c, 38);
    for (let k = 0; k < len - 0.01; k += 2) {
      const span = Math.min(2, len - k);
      const low = k === 0 ? bs : pcMidi((c.bass + 7) % 12, 38);
      out.push({ o: k, dur: span, midi: low, vel: k === 0 ? 0.78 : 0.6, voice: 'bass' });
      out.push(...roll(voicing(c, 55, 3), k + 0.05, span, k === 0 ? 0.42 : 0.34, 'acc', 0.045));
    }
    return out;
  },

  // Vihuela: bajo grave que se deja sonar y una díada interior (tercera y la nota de arriba) en el 1;
  // en compases de cuatro, otra díada más suave en el 3. Nada de rasgueo: la melodía va sola arriba.
  vihuela({ chord: c, len }) {
    const third = pcMidi((c.root + c.intervals[1]) % 12, VIHUELA_INNER_LO);
    const upper = pcMidi((c.root + c.intervals[2]) % 12, third + 1);
    const out = [{ o: 0, dur: len, midi: bassMidi(c, VIHUELA_BASS_LO), vel: 0.72, voice: 'bass' }];
    out.push(...roll([third, upper], 0.03, len, 0.34, 'acc', 0.035));
    if (len >= 4) out.push(...roll([third, upper], 2, len - 2, 0.24, 'acc', 0.03));
    return out;
  },

  // Bajo continuo: línea caminante (raíz, tercera, quinta, nota de aproximación al siguiente acorde).
  continuo({ chord: c, len }, next, piece) {
    const n = Math.max(1, Math.round(len));
    const root = bassMidi(c, 38);
    const out = [];
    let prev = root;
    for (let j = 0; j < n; j++) {
      let midi = root;
      if (j === n - 1 && n > 1 && next) {
        let tgt = bassMidi(next.chord, 38);
        if (Math.abs(tgt + 12 - prev) < Math.abs(tgt - prev)) tgt += 12;
        midi = stepIn(piece.scale, tgt, prev > tgt ? 1 : -1);
      } else if (j === 1) midi = root + c.intervals[1];
      else if (j === 2) midi = root + c.intervals[2];
      else if (j >= 3) midi = root + 12;
      out.push({ o: j, dur: 0.85, midi, vel: j === 0 ? 0.8 : 0.52, voice: 'bass' });
      prev = midi;
    }
    return out;
  },

  // Minué: bajo en el 1, dos notas ligeras en 2 y 3.
  minuet({ chord: c, len }) {
    const out = [{ o: 0, dur: 0.9, midi: bassMidi(c, 43), vel: 0.62, voice: 'bass' }];
    const up = voicing(c, 55, 3).slice(1);
    for (let k = 1; k < len - 0.01; k++) {
      up.forEach((midi, i) => out.push({ o: k + i * 0.02, dur: 0.45, midi, vel: 0.34, voice: 'acc' }));
    }
    return out;
  },

  // Bajo de Alberti (grave–agudo–medio–agudo) en corcheas.
  alberti({ chord: c, len }) {
    const low = bassMidi(c, 45);
    const mid = low + c.intervals[1];
    const high = low + c.intervals[2];
    const pat = [low, high, mid, high];
    const vels = [0.55, 0.36, 0.42, 0.36];
    const out = [];
    for (let i = 0; i < Math.round(len * 2); i++) {
      out.push({ o: i * 0.5, dur: 0.48, midi: pat[i % 4], vel: vels[i % 4], voice: i % 4 === 0 ? 'bass' : 'acc' });
    }
    return out;
  },

  // Arpegio amplio con pedal: todas las notas sostienen durante la parte.
  arpeggio({ chord: c, len }) {
    const bs = bassMidi(c, 36);
    const up = voicing(c, bs + 7, 3);
    const seq = [bs, up[0], up[1], up[2] ?? up[1] + 5, up[1], up[0]];
    const vels = [0.58, 0.34, 0.3, 0.33, 0.3, 0.27];
    const n = Math.round(len * 2);
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({ o: i * 0.5, dur: len - i * 0.5 + 0.2, midi: seq[i % 6], vel: vels[i % 6], voice: i === 0 ? 'bass' : 'acc' });
    }
    return out;
  },

  // Canción popular: cuerda grave sostenida + acordes sobrios de piano.
  folk({ chord: c, len }) {
    const out = [{ o: 0, dur: len, midi: bassMidi(c, 36), vel: 0.55, voice: 'bass' }];
    const tri = voicing(c, 55, 3);
    for (let k = 1; k < len - 0.01; k += 2) out.push(...roll(tri, k, Math.min(2, len - k), 0.27, 'acc', 0.03));
    return out;
  },

  // Impresionismo: bajo largo y un arpegio ascendente con mucho aire.
  haze({ chord: c, len }) {
    const bs = bassMidi(c, 36);
    const up = voicing(c, bs + 9, 4);
    const out = [{ o: 0, dur: len, midi: bs, vel: 0.5, voice: 'bass' }];
    const start = len >= 3 ? 1 : 0.5;
    up.slice(0, len >= 3 ? 4 : 2).forEach((midi, i) =>
      out.push({ o: start + i * 0.5, dur: len - start, midi, vel: 0.3 - i * 0.02, voice: 'acc' }));
    return out;
  },

  // Postimpresionismo: síncopa (0, 1.5, 2.5, 3.5) con bajo y acordes secos.
  pulse({ chord: c, len }) {
    const bs = bassMidi(c, 38);
    const fifth = pcMidi((c.bass + 7) % 12, 38);
    const tri = voicing(c, 52, 3);
    const out = [{ o: 0, dur: 1.4, midi: bs, vel: 0.7, voice: 'bass' }];
    if (len >= 2) out.push(...roll(tri, 1.5, 0.45, 0.4, 'acc', 0.015));
    if (len >= 4) {
      out.push({ o: 2.5, dur: 0.45, midi: fifth, vel: 0.55, voice: 'bass' });
      out.push(...roll(tri, 3.5, 0.45, 0.36, 'acc', 0.015));
    }
    return out;
  },

  // Moderno: campanas en grupos (3+2): bajo, y pequeño arpegio de cuartas.
  bells({ chord: c, len }) {
    const bs = bassMidi(c, 40);
    const up = voicing(c, bs + 12, 3);
    const out = [{ o: 0, dur: len, midi: bs, vel: 0.5, voice: 'bass' }];
    out.push({ o: 0.5, dur: 1.5, midi: up[0], vel: 0.3, voice: 'acc' });
    if (len > 1.5) out.push({ o: 1.25, dur: 1.5, midi: up[1], vel: 0.27, voice: 'acc' });
    if (len >= 4) {
      out.push({ o: 3, dur: 1.5, midi: up[2] ?? up[1], vel: 0.3, voice: 'acc' });
      out.push({ o: 3.5, dur: 1.5, midi: up[0], vel: 0.24, voice: 'acc' });
    }
    return out;
  },

  // Menú: bajo, arpegio suave de piano de fieltro y colchón de cuerdas.
  warm({ chord: c, len }) {
    const bs = bassMidi(c, 40);
    const up = voicing(c, bs + 7, 3);
    const seq = [bs, up[0], up[1], up[0]];
    const out = [];
    for (let i = 0; i < Math.round(len); i++) {
      out.push({ o: i, dur: i === 0 ? Math.min(2, len) : 1, midi: seq[i % 4], vel: i === 0 ? 0.5 : 0.3, voice: i === 0 ? 'bass' : 'acc' });
    }
    out.push(...voicing(c, 55, 3).map((midi) => ({ o: 0, dur: len, midi, vel: 0.2, voice: 'pad' })));
    return out;
  },
};
