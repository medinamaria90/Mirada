// Postimpresionismo: guitarra y acordeón con aire provenzal.
import { scalePcs } from '../theory.js';
import { FORM4 } from '../scores.js';

export const POSTIMPRESSIONISM = [
  {
    id: 'musette',
    name: 'Musette provenzal',
    label: 'Acordeón y guitarra, 3/4, cuarta que sube y vuelve',
    character: 'soleado, callejero, cordial',
    piece: {
      title: 'Musette provenzal', key: 'Sol mayor', tonic: 7, mode: 'major',
      scale: scalePcs(7, 'major'), bpm: 132, beatsPerBar: 3, form: FORM4, style: 'musette',
      voices: { mel: 'accordion', acc: 'guitar', bass: 'guitar', pad: 'accordion' },
      vg: { mel: 0.85, acc: 0.8, bass: 0.9, pad: 0.45 },
      reverb: 0.3, level: 0.79, rubato: { amp: 0.006, ritard: 0.05 }, orn: { kind: 'grace', prob: 0.1 },
      art: 0.9, dyn: { A: 1, open: 1, close: 0.96, B: 1.06 },
      sections: {
        A: {
          chords: ['G', 'C', 'D', 'G', 'Em', 'C:2|D:1'],
          mel: ['D5/1 G5/1 B5/.5 A5/.5', 'G5/1 E5/1 C5/1', 'A5/1 F#5/.5 E5/.5 D5/1', 'B5/2 G5/1',
            'E5/1 G5/1 B5/.5 A5/.5', 'G5/1 E5/1 F#5/1'],
        },
        open: { chords: ['Am:2|D:1', 'D'], mel: ['C6/1 A5/1 F#5/1', 'A5/2 D5/1'] },
        close: { chords: ['Am:2|D:1', 'G'], mel: ['E5/1 C5/1 A4/1', 'G4/1 B4/1 D5/1'] },
        B: {
          chords: ['D', 'G', 'Em', 'Bm', 'C', 'G', 'Am:2|D:1', 'D'],
          mel: ['A5/1 D6/1 F#6/.5 E6/.5', 'D6/1 B5/1 G5/1', 'B5/1 E6/1 G6/.5 F#6/.5', 'F#6/2 D6/1',
            'E6/1 C6/1 G5/1', 'B5/1 D6/1 G5/1', 'C6/1 A5/1 F#5/1', 'A5/1 F#5/.5 E5/.5 D5/1'],
        },
      },
    },
  },
  {
    id: 'rasgueo',
    name: 'Rasgueo del sur',
    label: 'Guitarra sola con acordeón al fondo, 4/4, mixolidio rasgueado',
    character: 'cálido, terroso, rítmico',
    piece: {
      title: 'Rasgueo del sur', key: 'La mixolidio', tonic: 9, mode: 'mixolydian',
      scale: scalePcs(9, 'mixolydian'), bpm: 100, beatsPerBar: 4, form: FORM4, style: 'strum',
      voices: { mel: 'guitar', acc: 'guitar', bass: 'guitar', cnt: 'accordion' },
      vg: { mel: 1, acc: 0.75, bass: 0.9, cnt: 0.4 },
      reverb: 0.3, level: 1.0, rubato: { amp: 0.008, ritard: 0.05 }, orn: { kind: 'grace', prob: 0.08 },
      dyn: { A: 1, open: 1, close: 0.96, B: 1.06 },
      sections: {
        A: {
          chords: ['A', 'G', 'D', 'A', 'F#m', 'G:2|D:2'],
          mel: ['E5/.5 A5/1 C#6/1 B5/.5 A5/1', 'G5/1.5 B5/.5 D6/1 B5/1', 'F#5/.5 A5/1 D6/1 C#6/.5 A5/1',
            'E6/1.5 C#6/.5 A5/2', 'C#6/.5 F#5/1 A5/1 C#6/.5 E6/1', 'D6/1 B5/1 A5/1 F#5/1'],
        },
        open: { chords: ['G:2|D:2', 'D'], mel: ['B5/1 G5/1 F#5/1 D5/1', 'A5/2 F#5/1 D5/1'] },
        close: { chords: ['G:2|D:2', 'A'], mel: ['B5/1 D6/1 A5/1 F#5/1', 'E5/1 C#5/.5 A5/2.5'] },
        B: {
          chords: ['Bm', 'F#m', 'G', 'D', 'Bm', 'A', 'G:2|D:2', 'D'],
          mel: ['B5/.5 D6/1 F#6/1 E6/.5 D6/1', 'C#6/1.5 A5/.5 F#5/2', 'G5/.5 B5/1 D6/1 B5/.5 G5/1', 'A5/1.5 F#5/.5 D5/2',
            'D5/.5 F#5/1 B5/1 A5/.5 F#5/1', 'E5/1.5 C#6/.5 A5/2', 'B5/1 G5/1 A5/1 F#5/1', 'D6/1.5 A5/.5 F#5/1 E5/1'],
          cnt: ['B4/4', 'A4/4', 'B4/4', 'A4/4', 'D5/4', 'C#5/4', 'B4/2 A4/2', 'A4/4'],
        },
      },
    },
  },
];
