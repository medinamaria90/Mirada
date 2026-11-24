// Barroco: tres variantes con clave, cuerda y bajo continuo.
import { scalePcs } from '../theory.js';
import { FORM4 } from '../scores.js';

export const BAROQUE = [
  {
    id: 'zarabanda',
    name: 'Zarabanda de la sala',
    label: 'Viola, clave y cello, 3/4, salto de cuarta apoyado en el 2',
    character: 'solemne, lento, elegante',
    piece: {
      title: 'Zarabanda de la sala', key: 'Sol menor', tonic: 7, mode: 'minor',
      scale: scalePcs(7, 'minor', [6]), bpm: 60, beatsPerBar: 3, form: FORM4, style: 'sarabande',
      voices: { mel: 'viola', acc: 'harpsichord', bass: 'cello' },
      vg: { mel: 0.9, acc: 0.7, bass: 0.8 },
      reverb: 0.38, level: 0.54, rubato: { amp: 0.015, ritard: 0.07 }, orn: { kind: 'turn', prob: 0.12 },
      dyn: { A: 1, open: 1.02, close: 0.95, B: 1.08 },
      sections: {
        A: {
          chords: ['Gm', 'Cm', 'D', 'Gm', 'Eb', 'Cm:2|D:1'],
          mel: ['D5/1 G5/2', 'G5/1 C6/2', 'A5/1 F#5/1 D5/1', 'G5/1 Bb5/1.5 A5/.5',
            'G5/1 Eb5/2', 'Eb5/1 C5/1 A4/1'],
        },
        open: { chords: ['Cm:2|D:1', 'D'], mel: ['G5/1 Eb5/1 D5/1', 'F#5/1 A5/2'] },
        close: { chords: ['Cm:2|D:1', 'Gm'], mel: ['Eb5/1 C5/1 A4/1', 'Bb4/1 G4/2'] },
        B: {
          chords: ['Bb', 'Eb', 'Cm', 'F', 'Bb', 'Gm', 'Cm:2|D:1', 'D'],
          mel: ['D5/1 Bb5/2', 'Eb6/1 Bb5/1 G5/1', 'G5/1 C6/2', 'A5/1 F5/1 C5/1',
            'F5/1 Bb5/2', 'G5/1 D5/1 Bb4/1', 'C5/1 Eb5/1 F#5/1', 'A5/2 D5/1'],
        },
      },
    },
  },
  {
    id: 'invencion',
    name: 'Invención a dos voces',
    label: 'Dos voces de clave y cello, 4/4, imitación en corcheas',
    character: 'ingenioso, nítido, animado',
    piece: {
      title: 'Invención a dos voces', key: 'Fa mayor', tonic: 5, mode: 'major',
      scale: scalePcs(5, 'major'), bpm: 104, beatsPerBar: 4, form: FORM4, style: 'continuo',
      voices: { mel: 'harpsichord', cnt: 'harpsichord', bass: 'cello' },
      vg: { mel: 1, cnt: 0.8, bass: 0.75 },
      reverb: 0.22, level: 0.82, rubato: { amp: 0, ritard: 0.04 }, orn: { kind: 'mordent', prob: 0.14 },
      dyn: { A: 1, open: 1, close: 0.97, B: 1.06 },
      sections: {
        A: {
          chords: ['F', 'C', 'Dm', 'Bb', 'F', 'Gm|C'],
          mel: ['*.5 F5 G5 A5 F5 C6/1 A5/1', '*.5 E5 F5 G5 E5 C6/1 G5/1', '*.5 D5 E5 F5 D5 A5/1 F5/1',
            '*.5 Bb4 C5 D5 Bb4 F5/1 D5/1', '*.5 F5 E5 F5 G5 A5 Bb5 C6 A5', '*.5 Bb5 A5 G5 F5 E5 D5 C5 E5'],
          cnt: ['r/4', 'r/2 *.5 C4 D4 E4 C4', 'F4/1 A4/1 D4/2', 'D4/1 F4/1 Bb3/2', 'A4/2 C5/1 A4/1', 'Bb4/1 G4/1 E4/1 G4/1'],
        },
        open: {
          chords: ['Gm|C', 'C'],
          mel: ['*.5 D5 G5 Bb5 D6 C6 G5 E5 G5', 'E5/1 G5/1 C6/2'],
          cnt: ['G4/2 E4/2', 'C4/2 G4/2'],
        },
        close: {
          chords: ['Gm|C', 'F'],
          mel: ['*.5 D5 G5 Bb5 D6 C6 G5 E5 C5', 'F5/2 A5/1 F5/1'],
          cnt: ['G4/2 E4/2', 'F4/2 A4/1 F4/1'],
        },
        B: {
          chords: ['C', 'F', 'Dm', 'Am', 'Bb', 'F', 'Gm|C', 'C'],
          mel: ['*.5 C6 D6 E6 C6 G6/1 E6/1', '*.5 A5 Bb5 C6 A5 F6/1 C6/1', '*.5 D6 C6 Bb5 A5 G5 F5 E5 D5',
            '*.5 C5 D5 E5 C5 A5/1 E5/1', '*.5 D5 E5 F5 D5 Bb5/1 F5/1', '*.5 A5 G5 F5 E5 D5 C5 Bb4 A4',
            '*.5 G4 A4 Bb4 D5 E5/1 G5/1', '*.5 C5 D5 E5 G5 C6/1 E5/1'],
          cnt: ['r/2 *.5 C5 D5 E5 C5', 'A4/1 F4/1 C5/2', 'F4/2 A4/2', 'r/2 *.5 A4 G4 A4 C5',
            'Bb4/2 D5/1 F4/1', 'A4/2 C5/2', 'G4/1 Bb4/1 G4/1 E4/1', 'E4/2 G4/1 C5/1'],
        },
      },
    },
  },
  {
    id: 'obertura',
    name: 'Obertura con puntillo',
    label: 'Cuerda, clave y cello caminante, 4/4, ritmo con puntillo',
    character: 'majestuoso, firme, luminoso',
    piece: {
      title: 'Obertura con puntillo', key: 'Re mayor', tonic: 2, mode: 'major',
      scale: scalePcs(2, 'major'), bpm: 84, beatsPerBar: 4, form: FORM4, style: 'walking',
      voices: { mel: 'strings', acc: 'harpsichord', bass: 'cello' },
      vg: { mel: 0.9, acc: 0.6, bass: 0.8 },
      reverb: 0.3, level: 0.67, rubato: { amp: 0.006, ritard: 0.05 }, orn: { kind: 'mordent', prob: 0.1 },
      dyn: { A: 1, open: 1.02, close: 0.96, B: 1.08 },
      sections: {
        A: {
          chords: ['D', 'G', 'A', 'D', 'Bm', 'Em|A'],
          mel: ['D5/1.5 E5/.5 F#5/1 A5/1', 'B5/1.5 A5/.5 G5/1 D5/1', 'C#5/1.5 D5/.5 E5/1 A5/1',
            'F#5/2 D5/1 A4/1', 'B4/1.5 C#5/.5 D5/1 F#5/1', 'G5/1 E5/1 C#5/1 E5/1'],
        },
        open: { chords: ['Em|A', 'A'], mel: ['G5/1.5 F#5/.5 E5/1 A5/1', 'C#6/1.5 B5/.5 A5/1 E5/1'] },
        close: { chords: ['Em|A', 'D'], mel: ['G5/1.5 F#5/.5 E5/1 C#5/1', 'D5/2 F#5/1 D5/1'] },
        B: {
          chords: ['A', 'D', 'F#m', 'Bm', 'G', 'A', 'D|A', 'A'],
          mel: ['A5/1.5 B5/.5 C#6/1 E6/1', 'F#6/1.5 E6/.5 D6/1 A5/1', 'C#6/1.5 B5/.5 A5/1 F#5/1',
            'D5/1.5 E5/.5 F#5/1 B5/1', 'G5/1.5 A5/.5 B5/1 D6/1', 'C#6/1 A5/1 E5/1 A5/1',
            'F#5/1 D5/1 E5/1 C#5/1', 'A4/1.5 B4/.5 C#5/1 E5/1'],
        },
      },
    },
  },
];
