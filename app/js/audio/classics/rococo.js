// Clásico del Rococó y el Neoclasicismo: arreglo propio de una obra de dominio público.
import { scalePcs } from '../theory.js';
import { FORM4 } from '../scores.js';
import { ARRANGEMENT } from './arrangement.js';

export const ROCOCO_CLASSICS = [
  {
    id: 'mozart',
    name: 'Ah, vous dirai-je, maman',
    label: 'Fortepiano, 4/4, tema y variación en semicorcheas',
    character: 'juguetón, claro, luminoso',
    source: 'Tema de las variaciones «Ah, vous dirai-je, maman», K. 265, Wolfgang Amadeus Mozart (1781)',
    arrangement: ARRANGEMENT,
    piece: {
      title: 'Ah, vous dirai-je, maman', key: 'Do mayor', tonic: 0, mode: 'major',
      scale: scalePcs(0, 'major'), bpm: 100, beatsPerBar: 4, form: FORM4, style: 'alberti',
      voices: { mel: 'fortepiano', acc: 'fortepiano', bass: 'fortepiano' }, vg: { mel: 1, acc: 0.6, bass: 0.75 },
      reverb: 0.22, level: 0.73, rubato: { amp: 0.005, ritard: 0.05 }, orn: { kind: 'grace', prob: 0.08 },
      dyn: { A: 1, open: 1, close: 0.96, B: 1.06 },
      sections: {
        A: {
          chords: ['C', 'F:2|C:2', 'F:2|C:2', 'G:2|C:2', 'C:2|G7:2', 'C:2|G:2'],
          mel: ['C5 C5 G5 G5', 'A5 A5 G5/2', 'F5 F5 E5 E5', 'D5 D5 C5/2', 'G5 G5 F5 F5', 'E5 E5 D5/2'],
        },
        open: { chords: ['C:2|G7:2', 'C:2|G:2'], mel: ['G5 G5 F5 F5', 'E5 E5 D5/2'] },
        close: { chords: ['F:2|C:2', 'G:2|C:2'], mel: ['F5 F5 E5 E5', 'D5 D5 C5/2'] },
        B: {
          chords: ['C', 'F:2|C:2', 'F:2|C:2', 'G:2|C:2', 'C:2|G7:2', 'C:2|G:2', 'C:2|G7:2', 'C:2|G:2'],
          mel: ['*.25 C5 D5 C5 B4 C5 D5 C5 B4 G5 A5 G5 F5 G5 A5 G5 F5',
            '*.25 A5 B5 A5 G5 A5 B5 A5 G5 G5 F5 E5 F5 G5 E5 C5 E5',
            '*.25 F5 G5 F5 E5 F5 G5 F5 E5 E5 F5 E5 D5 E5 F5 E5 D5',
            '*.25 D5 E5 D5 C5 D5 E5 D5 C5 C5 E5 G5 E5 C5/1',
            '*.25 G5 A5 G5 F5 G5 A5 G5 F5 F5 G5 F5 E5 F5 G5 F5 E5',
            '*.25 E5 F5 E5 D5 E5 F5 E5 D5 D5 E5 D5 C5 B4 C5 D5 B4',
            '*.25 G5 A5 G5 F5 G5 A5 G5 F5 F5 G5 F5 E5 F5 G5 F5 E5',
            '*.25 E5 F5 E5 D5 E5 F5 E5 D5 D5/2'],
        },
      },
    },
  },
];
