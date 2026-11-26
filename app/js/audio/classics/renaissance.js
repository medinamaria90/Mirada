// Clásicos del Renacimiento: arreglos propios de obras de dominio público para el sintetizador.
import { scalePcs } from '../theory.js';
import { FORM4 } from '../scores.js';
import { ARRANGEMENT } from './arrangement.js';

/** Bajo de la romanesca en sol menor: III–VII–i–V | III–VII–i–V–i, un acorde por compás. */
const ROMANESCA = ['Bb', 'F', 'Gm', 'D', 'Bb', 'F', 'Gm:2|D:1', 'Gm'];

export const RENAISSANCE_CLASSICS = [
  {
    // Forma de Narváez: el canto sobre la romanesca (Sib–Fa–Solm–Re | Sib–Fa–Solm–Re–Solm, un acorde
    // por compás de 3/4) y diferencias: glosa en corcheas arriba, glosa en la voz grave bajo el canto
    // en notas largas, y vuelta al canto adornado con cadencia en sol, que enlaza con el principio.
    id: 'vacas',
    name: 'Guárdame las vacas',
    label: 'Vihuela sola, 3/4, romanesca con diferencias en corcheas',
    character: 'noble, español, cantable',
    source: '«Cuatro diferencias sobre Guárdame las vacas», Luis de Narváez (1538)',
    arrangement: ARRANGEMENT,
    piece: {
      title: 'Guárdame las vacas', key: 'Sol menor', tonic: 7, mode: 'minor',
      scale: scalePcs(7, 'minor', [6]), bpm: 84, beatsPerBar: 3,
      form: [['tema'], ['glosa'], ['bajos'], ['final']], style: 'vihuela',
      voices: { mel: 'guitar', acc: 'guitar', bass: 'guitar', cnt: 'guitar' },
      vg: { mel: 1, acc: 0.6, bass: 0.85, cnt: 0.8 },
      reverb: 0.3, level: 0.88, rubato: { amp: 0.012, ritard: 0.08 }, orn: { kind: 'mordent', prob: 0.06 },
      dyn: { tema: 0.96, glosa: 1.04, bajos: 1, final: 1 },
      sections: {
        tema: {
          chords: ROMANESCA,
          mel: ['D5/2 C5/.5 D5/.5', 'C5/2 A4/1', 'Bb4/1.5 A4/.5 G4/1', 'A4/2 F#4/1', 'D5/2 F5/1',
            'C5/2 D5/.5 C5/.5', 'Bb4/1 C5/.5 Bb4/.5 A4/1', 'G4/3'],
        },
        glosa: {
          chords: ROMANESCA,
          mel: ['*.5 D5 C5 D5 Eb5 F5 D5', '*.5 C5 Bb4 A4 Bb4 C5 A4', '*.5 Bb4 A4 G4 A4 Bb4 G4',
            'A4/.5 F#4/.5 D4/.5 F#4/.5 A4/1', '*.5 D5 F5 Bb5 A5 G5 F5', '*.5 C5 D5 C5 Bb4 A4 C5',
            '*.5 Bb4 A4 G4 Bb4 A4 F#4', 'G4/2 r/1'],
        },
        bajos: {
          chords: ROMANESCA,
          mel: ['D5/3', 'C5/3', 'Bb4/3', 'A4/3', 'D5/3', 'C5/3', 'Bb4/2 A4/1', 'G4/3'],
          cnt: ['r/1 *.5 F3 G3 A3 Bb3', 'r/1 *.5 C4 A3 F3 A3', 'r/1 *.5 Bb3 C4 D4 Bb3', 'r/1 *.5 A3 F#3 D3 F#3',
            'r/1 *.5 D4 C4 Bb3 A3', 'r/1 *.5 A3 Bb3 C4 A3', 'r/1 *.5 D4 Bb3 A3 F#3', 'G3/3'],
        },
        final: {
          chords: ROMANESCA,
          mel: ['D5/2 Eb5/.5 D5/.5', 'C5/2 Bb4/.5 A4/.5', 'Bb4/1.5 A4/.5 G4/1', 'A4/2 F#4/1',
            'D5/.5 Eb5/.5 F5/1 D5/1', 'C5/1 A4/.5 Bb4/.5 C5/1', 'Bb4/1 A4/.5 G4/.5 F#4/1', 'G4/3'],
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
