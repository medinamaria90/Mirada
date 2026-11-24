// Rococó y Neoclasicismo: fortepiano y cuerda ligera.
import { scalePcs } from '../theory.js';
import { FORM4 } from '../scores.js';

export const ROCOCO = [
  {
    id: 'gavota',
    name: 'Gavota del fortepiano',
    label: 'Fortepiano, pizzicato y cuerda, 4/4, anacrusa que sube a la tónica',
    character: 'galante, picado, risueño',
    piece: {
      title: 'Gavota del fortepiano', key: 'Re mayor', tonic: 2, mode: 'major',
      scale: scalePcs(2, 'major'), bpm: 108, beatsPerBar: 4, form: FORM4, style: 'gavotte',
      voices: { mel: 'fortepiano', acc: 'fortepiano', bass: 'pizz', cnt: 'strings' },
      vg: { mel: 1, acc: 0.55, bass: 0.8, cnt: 0.35 },
      reverb: 0.25, level: 0.75, rubato: { amp: 0.005, ritard: 0.04 }, orn: { kind: 'grace', prob: 0.14 },
      art: 0.85, dyn: { A: 1, open: 1, close: 0.96, B: 1.05 },
      sections: {
        A: {
          chords: ['D', 'A', 'D', 'G', 'D', 'A'],
          mel: ['F#5/.5 G5/.5 A5/1 D6/1 A5/1', 'C#6/.5 B5/.5 A5/1 E5/1 A5/1', 'F#5/.5 G5/.5 A5/1 B5/.5 A5/.5 F#5/1',
            'G5/1 B5/.5 A5/.5 G5/1 D5/1', 'D5/.5 E5/.5 F#5/1 A5/1 F#5/1', 'E5/1 C#5/.5 D5/.5 E5/1 A5/1'],
          cnt: ['A4/4', 'C#5/4', 'A4/4', 'B4/4', 'F#4/4', 'E4/4'],
        },
        open: { chords: ['Em|A', 'A'], mel: ['G5/1 B5/1 A5/1 C#6/1', 'E6/1 C#6/1 A5/2'], cnt: ['G4/2 E4/2', 'A4/4'] },
        close: { chords: ['Em|A', 'D'], mel: ['G5/1 E5/1 A5/.5 G5/.5 E5/1', 'F#5/.5 E5/.5 D5/3'], cnt: ['G4/2 E4/2', 'D4/4'] },
        B: {
          chords: ['A', 'D', 'Bm', 'F#m', 'G', 'D', 'Em|A', 'A'],
          mel: ['A5/.5 B5/.5 C#6/1 E6/1 C#6/1', 'D6/.5 C#6/.5 B5/1 A5/1 F#5/1', 'B5/.5 C#6/.5 D6/1 F#6/1 D6/1',
            'C#6/1 A5/.5 F#5/.5 A5/1 C#6/1', 'B5/.5 C#6/.5 D6/1 G5/1 B5/1', 'A5/1 F#5/.5 D5/.5 F#5/1 A5/1',
            'G5/1 B5/1 A5/1 G5/1', 'E5/1 C#5/.5 D5/.5 E5/2'],
          cnt: ['C#5/4', 'D5/4', 'D5/4', 'C#5/4', 'B4/4', 'A4/4', 'B4/2 C#5/2', 'E4/4'],
        },
      },
    },
  },
  {
    id: 'minueto',
    name: 'Minueto con flauta',
    label: 'Flauta y fortepiano con bajo de Alberti, 3/4, arpegio que sube',
    character: 'aireado, cortés, claro',
    piece: {
      title: 'Minueto con flauta', key: 'Si bemol mayor', tonic: 10, mode: 'major',
      scale: scalePcs(10, 'major'), bpm: 120, beatsPerBar: 3, form: FORM4, style: 'alberti',
      voices: { mel: 'flute', acc: 'fortepiano', bass: 'fortepiano' },
      vg: { mel: 0.9, acc: 0.55, bass: 0.7 },
      reverb: 0.28, level: 0.56, rubato: { amp: 0.006, ritard: 0.05 }, orn: { kind: 'grace', prob: 0.16 },
      dyn: { A: 1, open: 1, close: 0.96, B: 1.06 },
      sections: {
        A: {
          chords: ['Bb', 'F', 'Gm', 'Eb', 'Bb', 'F'],
          mel: ['Bb4/1 D5/.5 F5/.5 Bb5/1', 'A5/1 F5/.5 C5/.5 F5/1', 'G5/1 Bb5/.5 D6/.5 G5/1',
            'G5/1.5 F5/.5 Eb5/1', 'D5/1 F5/.5 Bb5/.5 D6/1', 'C6/1 A5/.5 F5/.5 C5/1'],
        },
        open: { chords: ['Cm:2|F:1', 'F'], mel: ['Eb5/1 G5/1 A5/1', 'C6/2 A5/1'] },
        close: { chords: ['Cm:2|F:1', 'Bb'], mel: ['Eb5/1 C5/1 A4/1', 'Bb4/3'] },
        B: {
          chords: ['F', 'Bb', 'Gm', 'Cm', 'F', 'Dm', 'Eb:2|F:1', 'F'],
          mel: ['F5/1 A5/.5 C6/.5 F6/1', 'D6/1.5 C6/.5 Bb5/1', 'Bb5/1 G5/.5 D5/.5 G5/1', 'Eb5/1 G5/.5 C6/.5 Eb6/1',
            'C6/1.5 Bb5/.5 A5/1', 'F5/1 A5/.5 D5/.5 A5/1', 'G5/1 Bb5/1 A5/1', 'C6/1 A5/1 F5/1'],
        },
      },
    },
  },
];
