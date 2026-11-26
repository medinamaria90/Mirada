// Clásicos del Renacimiento: arreglos propios de obras de dominio público para el sintetizador.
import { scalePcs } from '../theory.js';
import { FORM4 } from '../scores.js';
import { ARRANGEMENT } from './arrangement.js';

export const RENAISSANCE_CLASSICS = [
  {
    id: 'vacas',
    name: 'Guárdame las vacas',
    label: 'Laúd solo, 3/4, romanesca con diferencias en corcheas',
    character: 'noble, español, cantable',
    source: '«Cuatro diferencias sobre Guárdame las vacas», Luis de Narváez (1538)',
    arrangement: ARRANGEMENT,
    piece: {
      title: 'Guárdame las vacas', key: 'Sol menor', tonic: 7, mode: 'minor',
      scale: scalePcs(7, 'minor', [6]), bpm: 84, beatsPerBar: 3, form: FORM4, style: 'lute',
      voices: { mel: 'lute', acc: 'lute', bass: 'lute' }, vg: { mel: 1, acc: 0.75, bass: 0.9 },
      reverb: 0.36, level: 0.82, rubato: { amp: 0.012, ritard: 0.06 }, orn: { kind: 'mordent', prob: 0.1 },
      dyn: { A: 1, open: 1, close: 0.96, B: 1.06 },
      sections: {
        A: {
          chords: ['Bb', 'F', 'Gm', 'D', 'Bb', 'F'],
          mel: ['D5/1.5 Eb5/.5 D5/1', 'C5/2 A4/1', 'Bb4/1.5 A4/.5 G4/1', 'A4/2 F#4/1', 'D5/1 F5/1 D5/1',
            'C5/1.5 Bb4/.5 A4/1'],
        },
        open: { chords: ['Gm:2|D:1', 'D'], mel: ['Bb4/1 A4/1 F#4/1', 'A4/2 D5/1'] },
        close: { chords: ['Gm:2|D:1', 'Gm'], mel: ['Bb4/1 A4/1 F#4/1', 'G4/3'] },
        B: {
          chords: ['Bb', 'F', 'Gm', 'D', 'Bb', 'F', 'Gm:2|D:1', 'Gm'],
          mel: ['*.5 D5 Eb5 F5 Eb5 D5 C5', '*.5 C5 D5 C5 Bb4 A4 G4', '*.5 Bb4 C5 Bb4 A4 G4 F#4',
            'A4/1 D5/.5 C5/.5 A4/1', '*.5 F5 G5 F5 Eb5 D5 C5', '*.5 A4 Bb4 C5 D5 C5 Bb4',
            '*.5 G4 A4 Bb4 C5 D5 F#5', 'G5/1.5 F#5/.5 G5/1'],
        },
      },
    },
  },
  {
    id: 'greensleeves',
    name: 'Greensleeves',
    label: 'Flauta dulce y laúd, 3/4, canción en la menor',
    character: 'melancólico, sencillo, inglés',
    source: '«Greensleeves», canción anónima inglesa (c. 1580)',
    arrangement: ARRANGEMENT,
    piece: {
      title: 'Greensleeves', key: 'La menor', tonic: 9, mode: 'minor',
      scale: scalePcs(9, 'minor', [8]), bpm: 100, beatsPerBar: 3, form: FORM4, style: 'minuet',
      voices: { mel: 'recorder', acc: 'lute', bass: 'lute' }, vg: { mel: 0.95, acc: 0.8, bass: 0.9 },
      reverb: 0.38, level: 0.5, rubato: { amp: 0.01, ritard: 0.06 }, orn: { kind: 'grace', prob: 0.08 },
      dyn: { A: 1, open: 1, close: 0.96, B: 1.06 },
      sections: {
        A: {
          chords: ['Am', 'C', 'G', 'G', 'Am', 'Am'],
          mel: ['C5/2 D5/1', 'E5/1.5 F5/.5 E5/1', 'D5/2 B4/1', 'G4/1.5 A4/.5 B4/1', 'C5/2 A4/1',
            'A4/1.5 G#4/.5 A4/1'],
        },
        open: { chords: ['E', 'E'], mel: ['B4/2 G#4/1', 'E4/2 A4/1'] },
        close: { chords: ['E', 'Am'], mel: ['B4/2 G#4/1', 'A4/3'] },
        B: {
          chords: ['C', 'C', 'G', 'G', 'Am', 'Am', 'E', 'E'],
          mel: ['G5/3', 'G5/1.5 F5/.5 E5/1', 'D5/2 B4/1', 'G4/1.5 A4/.5 B4/1', 'C5/2 A4/1',
            'A4/1.5 G#4/.5 A4/1', 'B4/2 G#4/1', 'E4/2 A4/1'],
        },
      },
    },
  },
];
