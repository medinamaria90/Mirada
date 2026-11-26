// Clásicos del Barroco: arreglos propios de obras de dominio público para el sintetizador.
import { scalePcs } from '../theory.js';
import { FORM4 } from '../scores.js';
import { ARRANGEMENT } from './arrangement.js';

const CANON_GROUND = ['D:2|A:2', 'Bm:2|F#m:2', 'G:2|D:2', 'G:2|A:2'];

export const BAROQUE_CLASSICS = [
  {
    id: 'minueto',
    name: 'Minueto en sol',
    label: 'Clave, 3/4, minueto del cuaderno de Anna Magdalena',
    character: 'amable, claro, elegante',
    source: 'Minueto en sol mayor del «Cuaderno de Anna Magdalena Bach», atribuido a Christian Petzold (1725)',
    arrangement: ARRANGEMENT,
    piece: {
      title: 'Minueto en sol', key: 'Sol mayor', tonic: 7, mode: 'major',
      scale: scalePcs(7, 'major', [1]), bpm: 116, beatsPerBar: 3, form: FORM4, style: 'minuet',
      voices: { mel: 'harpsichord', acc: 'harpsiLite', bass: 'harpsichord' }, vg: { mel: 1, acc: 0.7, bass: 0.8 },
      reverb: 0.26, level: 1.25, rubato: { amp: 0.005, ritard: 0.04 }, orn: { kind: 'mordent', prob: 0.12 },
      dyn: { A: 1, open: 1, close: 0.97, B: 1.06 },
      sections: {
        A: {
          chords: ['G', 'G', 'C', 'G', 'C', 'G'],
          mel: ['D5/1 G4/.5 A4/.5 B4/.5 C5/.5', 'D5/1 G4/1 G4/1', 'E5/1 C5/.5 D5/.5 E5/.5 F#5/.5',
            'G5/1 G4/1 G4/1', 'C5/1 D5/.5 C5/.5 B4/.5 A4/.5', 'B4/1 C5/.5 B4/.5 A4/.5 G4/.5'],
        },
        open: { chords: ['D', 'D'], mel: ['F#4/1 G4/.5 A4/.5 B4/.5 G4/.5', 'A4/3'] },
        close: { chords: ['D', 'G'], mel: ['A4/1 B4/.5 A4/.5 G4/.5 F#4/.5', 'G4/1 B4/1 D5/1'] },
        B: {
          chords: ['G', 'D', 'G', 'A7', 'D', 'G:1|D:1|A:1', 'D:1|A:2', 'D'],
          mel: ['B5/1 G5/.5 A5/.5 B5/.5 G5/.5', 'A5/1 D5/.5 E5/.5 F#5/.5 D5/.5', 'G5/1 E5/.5 F#5/.5 G5/.5 D5/.5',
            'C#5/1 B4/.5 C#5/.5 A4/1', 'A4/.5 B4/.5 C#5/.5 D5/.5 E5/.5 F#5/.5', 'G5/1 F#5/1 E5/1',
            'F#5/1 A4/1 C#5/1', 'D5/3'],
        },
      },
    },
  },
  {
    id: 'canon',
    name: 'Canon en re',
    label: 'Cuerda, clave y cello, 4/4, bajo obstinado con canon',
    character: 'sereno, luminoso, envolvente',
    source: 'Canon en re mayor, Johann Pachelbel (c. 1680)',
    arrangement: ARRANGEMENT,
    piece: {
      title: 'Canon en re', key: 'Re mayor', tonic: 2, mode: 'major',
      scale: scalePcs(2, 'major'), bpm: 60, beatsPerBar: 4, form: FORM4, style: 'ground',
      voices: { mel: 'viola', cnt: 'viola', acc: 'harpsichord', bass: 'cello', pad: 'strings' },
      vg: { mel: 0.9, cnt: 0.7, acc: 0.6, bass: 0.8, pad: 0.45 },
      reverb: 0.4, level: 0.55, rubato: { amp: 0.008, ritard: 0.06 }, orn: { kind: 'turn', prob: 0.08 },
      dyn: { A: 1, open: 1, close: 0.96, B: 1.06 },
      sections: {
        A: {
          chords: [...CANON_GROUND, ...CANON_GROUND.slice(0, 2)],
          mel: ['F#5/2 E5/2', 'D5/2 C#5/2', 'B4/2 A4/2', 'B4/2 C#5/2', 'D5/2 C#5/2', 'B4/2 A4/2'],
          cnt: ['r/4', 'r/4', 'r/4', 'r/4', 'F#5/2 E5/2', 'D5/2 C#5/2'],
        },
        open: { chords: CANON_GROUND.slice(2), mel: ['G4/2 F#4/2', 'G4/2 E5/2'], cnt: ['B4/2 A4/2', 'B4/2 C#5/2'] },
        close: {
          chords: ['G:2|D:2', 'A:2|D:2'],
          mel: ['B4/2 A4/2', 'C#5/2 D5/2'],
          cnt: ['D5/2 F#5/2', 'E5/2 F#5/2'],
        },
        B: {
          chords: [...CANON_GROUND, ...CANON_GROUND.slice(0, 3), 'G:2|Asus4:1|A:1'],
          mel: ['D4 F#4 A4 G4', 'F#4 D4 F#4 E4', 'D4 B3 D4 A4', 'G4 B4 A4 G4', 'F#4 D4 E4 C#5', 'D5 F#5 A5 A4',
            'B4 G4 A4 F#4', 'D4 D5 D5 C#5'],
          cnt: ['D5/2 C#5/2', 'B4/2 A4/2', 'G4/2 F#4/2', 'G4/2 E4/2', 'D5/2 C#5/2', 'B4/2 A4/2', 'G4/2 F#4/2',
            'G4/2 E5/2'],
        },
      },
    },
  },
];
