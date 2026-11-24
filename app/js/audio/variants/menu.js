// Portada: «tema principal de Mirada» en dos variantes. Comparten el motivo-firma (tercera menor
// ascendente, segunda y tercera: mi–sol–la–do', y la vuelta a sol), que puede asomar en celebraciones.
import { scalePcs } from '../theory.js';
import { FORM4 } from '../scores.js';

export const MENU = [
  {
    id: 'umbral',
    name: 'Umbral',
    label: 'Piano de fieltro, flauta y cuerdas, 4/4, motivo-firma',
    character: 'cálido, sereno, acogedor',
    piece: {
      title: 'Umbral', key: 'Do mayor', tonic: 0, mode: 'major',
      scale: scalePcs(0, 'major'), bpm: 80, beatsPerBar: 4, form: FORM4, style: 'cradle',
      voices: { mel: 'felt', acc: 'felt', bass: 'felt', pad: 'strings', cnt: 'flute' },
      vg: { mel: 1, acc: 0.6, bass: 0.75, pad: 0.45, cnt: 0.8 },
      reverb: 0.42, level: 0.27, rubato: { amp: 0.012, ritard: 0.05 }, orn: { kind: 'grace', prob: 0.05 },
      dyn: { A: 1, open: 1, close: 0.95, B: 1.08 },
      sections: {
        A: {
          chords: ['Cmaj7', 'Am7', 'Fmaj7', 'G', 'Cmaj7', 'Em7'],
          mel: ['E5/1 G5/.5 A5/.5 C6/1.5 G5/.5', 'A5/1 G5/.5 E5/.5 C5/2', 'F5/1 A5/.5 C6/.5 E6/1.5 C6/.5',
            'D6/1 B5/.5 G5/.5 D5/2', 'E5/1 G5/.5 A5/.5 C6/1 D6/1', 'B5/1.5 G5/.5 E5/1 D5/1'],
        },
        open: { chords: ['Fmaj7:2|G:2', 'G'], mel: ['A5/1 C6/1 B5/1 G5/1', 'D5/2 E5/1 G5/1'] },
        close: { chords: ['Fmaj7:2|G:2', 'Cmaj7'], mel: ['A5/1 F5/1 D5/1 B4/1', 'E5/1 C5/3'] },
        B: {
          chords: ['Am7', 'Dm7', 'G', 'Cmaj7', 'Fmaj7', 'Em7', 'Dm7:2|G:2', 'G'],
          mel: ['C6/1 E6/.5 D6/.5 C6/1 A5/1', 'F5/1 A5/.5 C6/.5 D6/2', 'B5/1.5 A5/.5 G5/1 D5/1',
            'E5/1 G5/.5 A5/.5 C6/2', 'A5/1 C6/.5 E6/.5 F6/1 C6/1', 'G5/1.5 B5/.5 E5/1 G5/1',
            'F5/1 A5/1 B5/1 D6/1', 'D6/2 B5/1 G5/1'],
          cnt: ['r/2 E5/2', 'A4/4', 'r/1 D5/3', 'r/2 B4/2', 'C5/4', 'r/1 B4/3', 'D5/2 G5/2', 'r/1 F5/1 G5/2'],
        },
      },
    },
  },
  {
    id: 'paseo',
    name: 'Paseo',
    label: 'Flauta dulce, guitarra y cello, 3/4, motivo-firma en vals',
    character: 'ligero, culto, confiado',
    piece: {
      title: 'Paseo', key: 'Sol mayor', tonic: 7, mode: 'major',
      scale: scalePcs(7, 'major'), bpm: 104, beatsPerBar: 3, form: FORM4, style: 'pluckwaltz',
      voices: { mel: 'recorder', acc: 'guitar', bass: 'guitar', pad: 'cello' },
      vg: { mel: 0.9, acc: 0.8, bass: 0.85, pad: 0.5 },
      reverb: 0.38, level: 0.54, rubato: { amp: 0.01, ritard: 0.05 }, orn: { kind: 'grace', prob: 0.08 },
      dyn: { A: 1, open: 1.02, close: 0.95, B: 1.06 },
      sections: {
        A: {
          chords: ['G', 'Em', 'C', 'D', 'G', 'Bm'],
          mel: ['B4/1 D5/.5 E5/.5 G5/1', 'G5/1 E5/1 B4/1', 'C5/1 E5/.5 F#5/.5 A5/1',
            'A5/1.5 F#5/.5 D5/1', 'B4/1 D5/.5 E5/.5 G5/1', 'F#5/1 D5/1 B4/1'],
        },
        open: { chords: ['C:2|D:1', 'D'], mel: ['E5/1 G5/1 F#5/1', 'A5/2 F#5/1'] },
        close: { chords: ['C:2|D:1', 'G'], mel: ['E5/1 C5/1 A4/1', 'B4/1 G4/2'] },
        B: {
          chords: ['Em', 'C', 'G', 'D', 'Em', 'C', 'Am:2|D:1', 'D'],
          mel: ['E5/1 G5/.5 A5/.5 B5/1', 'C6/1 G5/1 E5/1', 'D5/1 G5/.5 A5/.5 B5/1', 'A5/1.5 F#5/.5 D5/1',
            'B5/1 G5/1 E5/1', 'E5/1 G5/.5 A5/.5 C6/1', 'A5/1 C6/1 A5/1', 'F#5/2 E5/1'],
        },
      },
    },
  },
];
