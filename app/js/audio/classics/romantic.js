// Clásicos del Romanticismo: arreglos propios de obras de dominio público para el sintetizador.
import { scalePcs } from '../theory.js';
import { FORM4 } from '../scores.js';
import { ARRANGEMENT } from './arrangement.js';

// 48 compases: «Para Elisa» va en 3/8 a corcheas rápidas y con 32 la vuelta quedaría corta.
const FORM6 = [['A', 'open'], ['A', 'close'], ['B'], ['A', 'open'], ['A', 'close'], ['B']];

export const ROMANTIC_CLASSICS = [
  {
    id: 'himno',
    name: 'Himno de la alegría',
    label: 'Viola, fortepiano y cello, 4/4, tema de la Novena',
    character: 'luminoso, fraterno, sereno',
    source: 'Tema del «Himno de la alegría», 9.ª sinfonía, Ludwig van Beethoven (1824)',
    arrangement: ARRANGEMENT,
    piece: {
      title: 'Himno de la alegría', key: 'Do mayor', tonic: 0, mode: 'major',
      scale: scalePcs(0, 'major'), bpm: 92, beatsPerBar: 4, form: FORM4, style: 'folk',
      voices: { mel: 'viola', acc: 'fortepiano', bass: 'cello' }, vg: { mel: 0.9, acc: 0.7, bass: 0.8 },
      reverb: 0.4, level: 0.6, rubato: { amp: 0.01, ritard: 0.06 }, orn: null,
      dyn: { A: 1, open: 1, close: 0.96, B: 1.06 },
      sections: {
        A: {
          chords: ['C', 'C:3|G:1', 'C', 'C:2|G:2', 'C', 'C:3|G:1'],
          mel: ['E5 E5 F5 G5', 'G5 F5 E5 D5', 'C5 C5 D5 E5', 'E5/1.5 D5/.5 D5/2', 'E5 E5 F5 G5', 'G5 F5 E5 D5'],
        },
        open: { chords: ['C', 'C:2|G:2'], mel: ['C5 C5 D5 E5', 'E5/1.5 D5/.5 D5/2'] },
        close: { chords: ['C', 'G:2|C:2'], mel: ['C5 C5 D5 E5', 'D5/1.5 C5/.5 C5/2'] },
        B: {
          chords: ['G:2|C:2', 'G:2|C:2', 'G:2|C:1|G:1', 'C:1|D7:1|G:2', 'C', 'C:3|G:1', 'C', 'G:2|C:2'],
          mel: ['D5 D5 E5 C5', 'D5/1 E5/.5 F5/.5 E5/1 C5/1', 'D5/1 E5/.5 F5/.5 E5/1 D5/1', 'C5/1 D5/1 G4/2',
            'E5 E5 F5 G5', 'G5 F5 E5 D5', 'C5 C5 D5 E5', 'D5/1.5 C5/.5 C5/2'],
        },
      },
    },
  },
  {
    id: 'elisa',
    name: 'Para Elisa',
    label: 'Piano con pedal, 3/8, mi–re# que se mece',
    character: 'íntimo, delicado, nostálgico',
    source: 'Bagatela «Para Elisa», WoO 59, Ludwig van Beethoven (1810)',
    arrangement: ARRANGEMENT,
    piece: {
      title: 'Para Elisa', key: 'La menor', tonic: 9, mode: 'minor',
      scale: scalePcs(9, 'minor', [8, 3]), bpm: 150, beatsPerBar: 3, form: FORM6, style: 'minuet', pedal: true,
      voices: { mel: 'piano', acc: 'piano', bass: 'piano' }, vg: { mel: 1, acc: 0.55, bass: 0.7 },
      reverb: 0.5, level: 0.21, rubato: { amp: 0.02, ritard: 0.08 }, orn: null,
      dyn: { A: 1, open: 1, close: 0.95, B: 1.06 },
      sections: {
        A: {
          chords: ['Am', 'Am', 'E', 'Am', 'Am', 'Am'],
          mel: ['E5/.5 D#5/.5 E5/.5 B4/.5 D5/.5 C5/.5', 'A4/1 r/.5 C4/.5 E4/.5 A4/.5', 'B4/1 r/.5 E4/.5 G#4/.5 B4/.5',
            'C5/1 r/.5 E4/.5 E5/.5 D#5/.5', 'E5/.5 D#5/.5 E5/.5 B4/.5 D5/.5 C5/.5', 'A4/1 r/.5 C4/.5 E4/.5 A4/.5'],
        },
        open: { chords: ['E', 'Am'], mel: ['B4/1 r/.5 E4/.5 C5/.5 B4/.5', 'A4/1 r/1 E5/.5 D#5/.5'] },
        close: { chords: ['E', 'Am'], mel: ['B4/1 r/.5 E4/.5 C5/.5 B4/.5', 'A4/1 r/.5 B4/.5 C5/.5 D5/.5'] },
        B: {
          chords: ['C', 'G7', 'Am', 'E', 'E', 'E', 'E', 'E'],
          mel: ['E5/1.5 G4/.5 F5/.5 E5/.5', 'D5/1.5 F4/.5 E5/.5 D5/.5', 'C5/1.5 E4/.5 D5/.5 C5/.5',
            'B4/1 r/.5 E4/.5 E5/.5 r/.5', 'r/.5 E5/.5 E6/.5 r/.5 E5/.5 D#5/.5', 'E5/.5 r/1 D#5/.5 E5/.5 D#5/.5',
            'E5/.5 D#5/.5 E5/.5 D#5/.5 E5/.5 D#5/.5', 'E5/.5 D#5/.5 E5/.5 D#5/.5 E5/.5 D#5/.5'],
        },
      },
    },
  },
];
