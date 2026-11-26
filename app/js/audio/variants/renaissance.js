// Renacimiento (también manierismo y norte): tres variantes con laúd, flauta dulce y viola.
import { scalePcs } from '../theory.js';
import { FORM4 } from '../scores.js';

/** Primera mitad de la romanesca en la menor (III–VII–i–V–III–VII), compartida por el canto y su glosa. */
const ROMANESCA_A = ['C', 'G', 'Am', 'E', 'C', 'G'];

export const RENAISSANCE = [
  {
    id: 'saltarello',
    name: 'Saltarello del jardín',
    label: 'Flauta dulce, laúd y viola, 6/8, motivo ascendente',
    character: 'danzante, luminoso, festivo',
    piece: {
      title: 'Saltarello del jardín', key: 'Sol mixolidio', tonic: 7, mode: 'mixolydian',
      scale: scalePcs(7, 'mixolydian'), bpm: 168, beatsPerBar: 6, form: FORM4, style: 'gigue',
      voices: { mel: 'recorder', acc: 'lute', bass: 'lute', pad: 'viola', cnt: 'viola' },
      vg: { mel: 0.95, acc: 0.8, bass: 0.9, pad: 0.55, cnt: 0.5 },
      reverb: 0.38, level: 0.48, rubato: { amp: 0.008, ritard: 0.05 }, orn: { kind: 'mordent', prob: 0.1 },
      dyn: { A: 1, open: 1, close: 0.96, B: 1.06 },
      sections: {
        A: {
          chords: ['G', 'F', 'C', 'G', 'Em', 'F|C'],
          mel: ['G5/1 A5/1 B5/1 D6/2 B5/1', 'C6/1 A5/1 F5/1 A5/2 C6/1', 'E5/1 G5/1 C6/1 B5/2 G5/1',
            'D6/2 B5/1 G5/3', 'E5/1 G5/1 B5/1 E6/2 D6/1', 'C6/1 A5/1 F5/1 E5/2 G5/1'],
        },
        open: { chords: ['Em|Dm', 'Dm'], mel: ['G5/1 B5/1 E6/1 F5/2 A5/1', 'A5/2 F5/1 D5/3'] },
        close: { chords: ['F|Dm', 'G'], mel: ['A5/1 C6/1 A5/1 F5/2 A5/1', 'B5/1 A5/1 G5/4'] },
        B: {
          chords: ['C', 'G', 'Am', 'Em', 'F', 'C', 'Am|F', 'Dm'],
          mel: ['C6/1 D6/1 E6/1 G6/2 E6/1', 'D6/1 B5/1 G5/1 B5/2 D6/1', 'A5/1 C6/1 E6/1 C6/2 A5/1',
            'B5/1 G5/1 E5/1 G5/2 B5/1', 'F5/1 A5/1 C6/1 F6/2 C6/1', 'E6/1 D6/1 C6/1 G5/2 E5/1',
            'A5/1 C6/1 B5/1 A5/2 F5/1', 'D5/1 F5/1 A5/1 D6/2 C6/1'],
          cnt: ['E5/3 G5/3', 'D5/6', 'C5/3 E5/3', 'B4/6', 'A4/3 C5/3', 'G4/6', 'E5/3 C5/3', 'D5/3 A4/3'],
        },
      },
    },
  },
  {
    id: 'romanesca',
    name: 'Romanesca de la tarde',
    label: 'Vihuela, viola y flauta dulce, 4/4, bajo obstinado',
    character: 'grave, noble, meditativo',
    piece: {
      title: 'Romanesca de la tarde', key: 'La menor', tonic: 9, mode: 'minor',
      scale: scalePcs(9, 'minor', [8]), bpm: 66, beatsPerBar: 4, style: 'vihuela',
      // la última vuelta repite el canto glosado en corcheas (G) antes de la cadencia
      form: [['A', 'open'], ['A', 'close'], ['B'], ['G', 'close']],
      voices: { mel: 'guitar', acc: 'guitar', bass: 'guitar', pad: 'viola', cnt: 'recorder' },
      vg: { mel: 1, acc: 0.6, bass: 0.85, pad: 0.45, cnt: 0.65 },
      reverb: 0.36, level: 1.13, rubato: { amp: 0.012, ritard: 0.07 }, orn: { kind: 'mordent', prob: 0.1 },
      dyn: { A: 1, open: 1, close: 0.95, B: 1.05, G: 1.02 },
      sections: {
        A: {
          chords: ROMANESCA_A,
          mel: ['E5/2 D5/1 C5/1', 'D5/1.5 B4/.5 G4/1 B4/1', 'C5/2 B4/1 A4/1',
            'G#4/2 B4/1 E5/1', 'E5/1 G5/1 E5/1 C5/1', 'D5/2 B4/.5 C5/.5 D5/1'],
        },
        G: {
          chords: ROMANESCA_A,
          mel: ['E5/.5 G5/.5 F5/.5 E5/.5 D5/1 C5/.5 D5/.5', 'D5/.5 E5/.5 D5/.5 B4/.5 G4/.5 A4/.5 B4/1',
            'C5/.5 E5/.5 D5/.5 C5/.5 B4/.5 C5/.5 A4/1', 'G#4/.5 A4/.5 B4/.5 G#4/.5 E4/.5 G#4/.5 B4/.5 E5/.5',
            'E5/.5 F5/.5 G5/.5 F5/.5 E5/.5 D5/.5 C5/1', 'D5/.5 B4/.5 G4/.5 B4/.5 C5/.5 B4/.5 D5/1'],
        },
        open: { chords: ['Am|E', 'E'], mel: ['E5/1 C5/1 B4/1 G#4/1', 'B4/1 E5/1 G#5/1 B5/1'] },
        close: { chords: ['Am|E', 'Am'], mel: ['C5/1 A4/1 B4/1 G#4/1', 'A4/4'] },
        B: {
          chords: ['F', 'C', 'Dm', 'E', 'Am', 'G', 'F|E', 'E'],
          mel: ['A5/2 G5/1 F5/1', 'E5/1 G5/1 C6/2', 'D6/1.5 C6/.5 A5/1 F5/1', 'G#5/2 E5/1 B4/1',
            'C5/1 E5/1 A5/2', 'B5/1.5 A5/.5 G5/1 D5/1', 'A5/1 F5/1 G#5/1 E5/1', 'E5/2 D5/1 B4/1'],
          cnt: ['C5/4', 'E5/2 G5/2', 'F5/4', 'E5/2 B4/2', 'C5/4', 'D5/2 B4/2', 'C5/2 B4/2', 'G#4/4'],
        },
      },
    },
  },
  {
    id: 'villancico',
    name: 'Villancico de corte',
    label: 'Flauta dulce y laúd, 3/4, tríada que sube y gira',
    character: 'alegre, ágil, cortesano',
    piece: {
      title: 'Villancico de corte', key: 'Re mixolidio', tonic: 2, mode: 'mixolydian',
      scale: scalePcs(2, 'mixolydian'), bpm: 126, beatsPerBar: 3, form: FORM4, style: 'waltz',
      voices: { mel: 'recorder', acc: 'lute', bass: 'lute' },
      vg: { mel: 0.95, acc: 0.8, bass: 0.9 },
      reverb: 0.35, level: 0.49, rubato: { amp: 0.008, ritard: 0.05 }, orn: { kind: 'mordent', prob: 0.12 },
      dyn: { A: 1, open: 1, close: 0.96, B: 1.06 },
      sections: {
        A: {
          chords: ['D', 'C', 'G', 'D', 'Bm', 'G:2|C:1'],
          mel: ['D5/1 F#5/1 A5/1', 'G5/1.5 E5/.5 C5/1', 'B4/1 D5/1 G5/1', 'A5/2 F#5/1',
            'B4/1 D5/1 F#5/1', 'G5/1 B5/1 G5/1'],
        },
        open: { chords: ['Am', 'C'], mel: ['A5/1 C6/1 E5/1', 'G5/2 E5/1'] },
        close: { chords: ['Am:2|C:1', 'D'], mel: ['E5/1 C5/1 E5/1', 'F#5/1 E5/1 D5/1'] },
        B: {
          chords: ['G', 'D', 'Em', 'Bm', 'G', 'D', 'Am:2|C:1', 'C'],
          mel: ['G5/1 B5/1 D6/1', 'A5/1.5 F#5/.5 D5/1', 'E5/1 G5/1 B5/1', 'F#5/2 D5/1',
            'G5/1 A5/1 B5/1', 'A5/1 D6/1 F#5/1', 'E5/1 A5/1 G5/1', 'E5/1 G5/1 C5/1'],
        },
      },
    },
  },
];
