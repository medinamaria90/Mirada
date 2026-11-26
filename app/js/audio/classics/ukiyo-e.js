// Rama «Estampa japonesa»: arreglo propio de una canción tradicional japonesa (dominio público).
import { FORM4 } from '../scores.js';
import { ARRANGEMENT } from './arrangement.js';

// Escala «in» (miyako-bushi) sobre la: la, si, do, mi, fa.
const IN_SCALE = new Set([9, 11, 0, 4, 5]);
const L1 = 'A5/1 A5/1 B5/2';
const L2 = ['A5/1 B5/1 C6/1 B5/1', 'A5/1 B5/1 A5/1 F5/1', 'E5/1 C5/1 E5/1 F5/1', 'E5/1 E5/1 C5/1 B4/1'];
const L2_CHORDS = ['Am', 'Am:2|F:2', 'Am:2|Fmaj7:2', 'Esus4'];
const low = (bar) => bar.replace(/([A-G][#b]?)(\d)/g, (_, n, o) => `${n}${Number(o) - 1}`);

export const UKIYOE_CLASSICS = [
  {
    id: 'sakura',
    name: 'Sakura, sakura',
    label: 'Flauta y laúd pulsado, 4/4, escala japonesa in',
    character: 'sereno, delicado, primaveral',
    source: '«Sakura, sakura», canción tradicional japonesa (periodo Edo, publicada en 1888)',
    arrangement: ARRANGEMENT,
    piece: {
      title: 'Sakura, sakura', key: 'La (escala in)', tonic: 9, mode: 'minor',
      scale: IN_SCALE, bpm: 66, beatsPerBar: 4, form: FORM4, style: 'haze',
      voices: { mel: 'flute', acc: 'harpsiLite', bass: 'lute' }, vg: { mel: 0.95, acc: 0.6, bass: 0.7 },
      reverb: 0.55, level: 0.55, rubato: { amp: 0.02, ritard: 0.08 }, orn: { kind: 'grace', prob: 0.06 },
      dyn: { A: 1, open: 1, close: 0.95, B: 1.06 },
      sections: {
        A: { chords: ['Am', 'Am', ...L2_CHORDS], mel: [L1, L1, ...L2] },
        open: { chords: L2_CHORDS.slice(0, 2), mel: L2.slice(0, 2) },
        close: { chords: ['Esus4', 'Am/E'], mel: ['E5/1 F5/1 B5/.5 A5/.5 F5/1', 'E5/4'] },
        B: {
          chords: [...L2_CHORDS, 'Am', 'Am', 'Esus4', 'Am/E'],
          mel: [...L2.map(low), low(L1), low(L1), 'E5/1 F5/1 B5/.5 A5/.5 F5/1', 'E5/4'],
        },
      },
    },
  },
];
