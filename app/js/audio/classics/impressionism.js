// Clásico del Impresionismo: arreglo propio de una obra de dominio público para el sintetizador.
import { scalePcs } from '../theory.js';
import { FORM4 } from '../scores.js';
import { ARRANGEMENT } from './arrangement.js';

export const IMPRESSIONISM_CLASSICS = [
  {
    id: 'satie',
    name: 'Gymnopédie n.º 1',
    label: 'Piano con pedal, 3/4, acordes de séptima que se mecen',
    character: 'lento, suspendido, melancólico',
    source: '«Gymnopédie n.º 1», Erik Satie (1888)',
    arrangement: ARRANGEMENT,
    piece: {
      title: 'Gymnopédie n.º 1', key: 'Re mayor', tonic: 2, mode: 'major',
      scale: scalePcs(2, 'major'), bpm: 72, beatsPerBar: 3, form: FORM4, style: 'sarabande', pedal: true,
      voices: { mel: 'piano', acc: 'piano', bass: 'piano' }, vg: { mel: 1, acc: 0.5, bass: 0.65 },
      reverb: 0.55, level: 0.3, rubato: { amp: 0.02, ritard: 0.08 }, orn: null,
      dyn: { A: 1, open: 1, close: 0.95, B: 1.06 },
      sections: {
        A: {
          chords: ['Gmaj7', 'Dmaj7', 'A/G', 'D6', 'A/G', 'Dmaj7'],
          mel: ['F#5/3', 'A5/1 G5/1 F#5/1', 'C#5/3', 'B4/3', 'C#5/3', 'D5/3'],
        },
        open: { chords: ['Gmaj9', 'Dmaj7'], mel: ['A4/3', 'F#4/3'] },
        close: { chords: ['Gmaj7', 'D'], mel: ['B4/1 A4/1 F#4/1', 'D5/3'] },
        B: {
          chords: ['Em7', 'A7', 'Dmaj7', 'Bm7', 'Em7', 'A7', 'Gmaj7', 'A'],
          mel: ['B4/1 C#5/1 D5/1', 'E5/2 C#5/1', 'F#5/3', 'D5/1 C#5/1 B4/1', 'G5/2 F#5/1', 'E5/1 C#5/1 A4/1',
            'B4/3', 'A4/2 C#5/1'],
        },
      },
    },
  },
];
