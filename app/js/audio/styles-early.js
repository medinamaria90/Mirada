// Acompañamientos del Gótico (bordones en quintas vacías, sin terceras) y del Manierismo y Norte
// (consort de gambas, órgano y virginal). Misma firma que styles.js: (part, next, piece) -> eventos.
import { bassMidi, pcMidi, voicing } from './theory.js';

const DRONE_LO = 45;   // la2: el bordón de órgano o fídula vive entre la2 y sol#3
const HARP_LO = 38;    // re2: bajo del arpa
const LAMENT_LO = 45;  // el bajo cromático re–do#–do–si–si♭–la baja nota a nota sin saltar de octava
const FIFTH = 7;
const OCTAVE = 12;

const roll = (notes, o, dur, vel, voice, gap = 0.03) =>
  notes.map((midi, i) => ({ o: o + i * gap, dur, midi, vel, voice }));
/** Quinta vacía (fundamental y quinta) sostenida por la voz `voice`. */
const openFifth = (c, len, vel, voice) => {
  const r = pcMidi(c.root, DRONE_LO);
  return [r, r + FIFTH].map((midi) => ({ o: 0, dur: len, midi, vel, voice }));
};

export const EARLY_STYLES = {
  // Gótico, cantiga (3/4): órgano en quintas vacías, arpa con el bajo en el 1 y quinta y octava en el 2 y el 3.
  drone({ chord: c, len }) {
    const r = pcMidi(c.root, HARP_LO);
    const out = [...openFifth(c, len, 0.3, 'pad'), { o: 0, dur: len, midi: r, vel: 0.6, voice: 'bass' }];
    for (let k = 1; k < len - 0.01; k++) {
      out.push({ o: k, dur: 1.2, midi: r + OCTAVE + (k === 1 ? FIFTH : 0), vel: k === 1 ? 0.3 : 0.24, voice: 'acc' });
    }
    return out;
  },

  // Gótico, estampida (6/8): bordón de órgano, arpa en 1 y 4 (fundamental, quinta) y díada en 3 y 6.
  estampie({ chord: c, len }) {
    const r = pcMidi(c.root, HARP_LO);
    const out = openFifth(c, len, 0.26, 'pad');
    for (let k = 0; k < len - 0.01; k += 3) {
      out.push({ o: k, dur: 1.4, midi: k === 0 ? r : r + FIFTH, vel: k === 0 ? 0.66 : 0.52, voice: 'bass' });
      if (len - k >= 3) out.push(...roll([r + OCTAVE + FIFTH, r + 2 * OCTAVE], k + 2, 0.8, 0.3, 'acc'));
    }
    return out;
  },

  // Gótico, lauda (4/4 lento): fídula en bordón, arpa con el bajo en el 1 y un arpegio vacío en 2, 3 y 4.
  lauda({ chord: c, len }) {
    const r = pcMidi(c.root, HARP_LO);
    const out = [...openFifth(c, len, 0.28, 'pad'), { o: 0, dur: len, midi: r, vel: 0.55, voice: 'bass' }];
    const up = [r + OCTAVE + FIFTH, r + 2 * OCTAVE, r + OCTAVE + FIFTH];
    for (let k = 1; k < len - 0.01; k++) out.push({ o: k, dur: len - k, midi: up[k - 1] ?? up[0], vel: 0.26, voice: 'acc' });
    return out;
  },

  // Norte, consort (4/4): gamba grave en blancas y órgano sosteniendo el acorde bajo la polifonía.
  consort({ chord: c, len }) {
    const out = voicing(c, 57, 3).map((midi) => ({ o: 0.02, dur: len - 0.04, midi, vel: 0.22, voice: 'acc' }));
    for (let k = 0; k < len - 0.01; k += 2) {
      out.push({ o: k, dur: Math.min(2, len - k), midi: bassMidi(c, HARP_LO), vel: k === 0 ? 0.6 : 0.48, voice: 'bass' });
    }
    return out;
  },

  // Norte, tema con virginal (4/4): gamba en 1 y 3 (fundamental, quinta) y acorde corto de virginal en 2 y 4.
  virginal({ chord: c, len }) {
    const bs = bassMidi(c, HARP_LO);
    const tri = voicing(c, 55, 3);
    const out = [];
    for (let k = 0; k < len - 0.01; k++) {
      if (k % 2 === 0) out.push({ o: k, dur: 1.8, midi: k === 0 ? bs : pcMidi((c.bass + FIFTH) % 12, HARP_LO), vel: k === 0 ? 0.58 : 0.46, voice: 'bass' });
      else out.push(...roll(tri, k, 0.6, 0.32, 'acc', 0.02));
    }
    return out;
  },

  // Manierismo, lamento (3/4): bajo cromático de gamba en el 1 y órgano que entra en el 2, como un suspiro.
  lament({ chord: c, len }) {
    const out = [{ o: 0, dur: len, midi: bassMidi(c, LAMENT_LO), vel: 0.6, voice: 'bass' }];
    if (len > 1) out.push(...voicing(c, 57, 3).map((midi) => ({ o: 1, dur: len - 1, midi, vel: 0.22, voice: 'acc' })));
    return out;
  },
};
