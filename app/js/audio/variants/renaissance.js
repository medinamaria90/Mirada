// Renacimiento (también manierismo y norte): variantes con laúd, flauta dulce y viola. Las dos
// primeras son variaciones de «Pavana del alba» (el tema principal, scores.js): su motivo de arranque
// (la–re′–do′–re′) en re, como la pareja pavana–gallarda de las danzas del siglo XVI.
import { scalePcs } from '../theory.js';
import { FORM4 } from '../scores.js';

/** Primera mitad de la romanesca en la menor (III–VII–i–V–III–VII), compartida por el canto y su glosa. */
const ROMANESCA_A = ['C', 'G', 'Am', 'E', 'C', 'G'];

/** A (el tema solo) – A2 (se suma una contramelodía) – B – A2: 32 compases. */
const FORM_VARIATION = [['A', 'open'], ['A2', 'close'], ['B'], ['A2', 'close']];
const DYN_VARIATION = { A: 1, A2: 1.03, open: 1, close: 0.95, B: 1.07 };

// Pavana en sombra: el motivo en re menor, reharmonizado (i–VI–iv–V), más lento y con la flauta.
const SOMBRA_A = {
  chords: ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'Gm|A'],
  mel: ['A4/1 D5/1.5 C5/.5 D5/1', 'F5/2 D5/1 Bb4/1', 'Bb4/1 G4/1 A4/1 Bb4/1',
    'A4/2 C#5/1 E5/1', 'A4/1 D5/1 E5/1 F5/1', 'G5/1 F5/.5 E5/.5 E5/1 C#5/1'],
};

// Gallarda del alba: el mismo motivo en 3/4, glosado en corcheas, con la armonía original.
const GALLARDA_A = {
  chords: ['Dm', 'C', 'F', 'C', 'Dm', 'F|C'],
  mel: ['A4/.5 D5/1 C5/.5 D5/1', 'E5/1 G5/.5 E5/.5 D5/.5 C5/.5', 'C5/.5 D5/.5 C5/.5 A4/.5 F4/.5 G4/.5',
    'G4/1.5 A4/.5 G4/.5 E4/.5', 'A4/.5 D5/.5 E5/1 F5/1', 'F5/.5 E5/.5 D5/.5 E5/.5 D5/.5 C5/.5'],
};

export const RENAISSANCE = [
  {
    id: 'sombra',
    name: 'Pavana en sombra',
    label: 'Flauta dulce, laúd punteado y viola, 4/4, el motivo de la pavana en re menor',
    character: 'íntimo, lento, melancólico',
    piece: {
      title: 'Pavana en sombra', key: 'Re menor', tonic: 2, mode: 'minor',
      scale: scalePcs(2, 'minor', [1]), bpm: 58, beatsPerBar: 4, form: FORM_VARIATION, style: 'pavane',
      voices: { mel: 'recorder', acc: 'lute', bass: 'lute', cnt: 'viola' },
      vg: { mel: 0.9, acc: 0.85, bass: 0.9, cnt: 0.5 },
      reverb: 0.42, level: 0.56, rubato: { amp: 0.018, ritard: 0.08 }, orn: { kind: 'turn', prob: 0.08 },
      dyn: DYN_VARIATION,
      sections: {
        A: SOMBRA_A,
        A2: { ...SOMBRA_A, cnt: ['F4/2 E4/2', 'D4/2 F4/2', 'G4/2 D4/2', 'E4/2 C#4/2', 'D4/1 E4/1 F4/2', 'G4/2 E4/2'] },
        open: { chords: ['Bb|C', 'A'], mel: ['D5/1 Bb4/1 C5/1 E5/1', 'E5/2 A4/2'] },
        close: { chords: ['Gm|A', 'Dm'], mel: ['Bb4/1 D5/1 C#5/1 E5/1', 'D5/3 A4/1'] },
        B: {
          chords: ['F', 'C', 'Dm', 'A', 'Bb', 'F', 'Gm|A', 'A'],
          mel: ['C5/2 A4/1 C5/1', 'E5/2 G5/2', 'A5/1 G5/1 F5/1 D5/1', 'E5/1 C#5/1 A4/2',
            'Bb4/1 D5/1 F5/2', 'F5/1.5 E5/.5 D5/1 C5/1', 'D5/1 Bb4/1 C#5/1 A4/1', 'E5/2 C#5/1 A4/1'],
          cnt: ['A4/4', 'G4/4', 'F4/4', 'E4/2 C#4/2', 'D4/4', 'A3/2 C4/2', 'D4/2 E4/2', 'A3/4'],
        },
      },
    },
  },
  {
    id: 'gallarda',
    name: 'Gallarda del alba',
    label: 'Fídula, laúd y flauta dulce, 3/4, el motivo de la pavana glosado',
    character: 'vivo, saltarín, cortesano',
    piece: {
      title: 'Gallarda del alba', key: 'Re dórico', tonic: 2, mode: 'dorian',
      scale: scalePcs(2, 'dorian'), bpm: 108, beatsPerBar: 3, form: FORM_VARIATION, style: 'galliard',
      voices: { mel: 'fiddle', acc: 'lute', bass: 'lute', pad: 'gamba', cnt: 'recorder' },
      vg: { mel: 0.9, acc: 0.85, bass: 0.9, pad: 0.4, cnt: 0.55 },
      reverb: 0.36, level: 0.74, rubato: { amp: 0.008, ritard: 0.05 }, orn: { kind: 'mordent', prob: 0.12 },
      dyn: DYN_VARIATION,
      sections: {
        A: GALLARDA_A,
        A2: { ...GALLARDA_A, cnt: ['F4/3', 'E4/1.5 G4/1.5', 'A3/1.5 C4/1.5', 'C4/1.5 E4/1.5', 'F4/1.5 A4/1.5', 'A4/1.5 G4/1.5'] },
        open: { chords: ['F|G', 'A'], mel: ['C5/1 A4/.5 B4/1 G4/.5', 'E5/1 C#5/1 A4/1'] },
        close: { chords: ['Am|G', 'Dm'], mel: ['C5/.5 E5/.5 D5/.5 B4/.5 G4/.5 B4/.5', 'A4/.5 E5/.5 D5/2'] },
        B: {
          chords: ['F', 'C', 'Am', 'G', 'F', 'C', 'Em|Am', 'G'],
          mel: ['C5/1.5 A4/.5 C5/1', 'E5/1 G5/2', 'A5/.5 G5/.5 E5/1 C5/1', 'D5/1 B4/.5 A4/.5 G4/1',
            'A4/.5 C5/.5 F5/2', 'E5/1 D5/.5 C5/.5 E5/1', 'G5/.5 E5/.5 B4/.5 C5/.5 E5/.5 A5/.5', 'D5/1.5 C5/.5 B4/1'],
          cnt: ['F4/1.5 A4/1.5', 'G4/3', 'E4/1.5 A4/1.5', 'B4/1.5 G4/1.5', 'F4/3', 'G4/1.5 E4/1.5', 'E4/1.5 C5/1.5', 'B4/3'],
        },
      },
    },
  },
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
