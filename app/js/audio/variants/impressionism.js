// Impresionismo: piano con pedal, acordes de novena y tonos enteros a ratos.
import { scalePcs } from '../theory.js';
import { FORM4 } from '../scores.js';

export const IMPRESSIONISM = [
  {
    id: 'tonos',
    name: 'Tonos enteros',
    label: 'Piano con pedal y flauta, 4/4, novenas y escala de tonos enteros',
    character: 'brumoso, suspendido, luminoso',
    piece: {
      title: 'Tonos enteros', key: 'Mi lidio (con tonos enteros)', tonic: 4, mode: 'lydian',
      scale: scalePcs(4, 'lydian', [0, 2]), bpm: 52, beatsPerBar: 4, form: FORM4, style: 'wash', pedal: true,
      voices: { mel: 'piano', acc: 'piano', bass: 'piano', cnt: 'flute' },
      vg: { mel: 0.9, acc: 0.5, bass: 0.7, cnt: 0.6 },
      reverb: 0.65, level: 0.43, rubato: { amp: 0.03, ritard: 0.08 }, orn: null,
      dyn: { A: 1, open: 1, close: 0.94, B: 1.06 },
      sections: {
        A: {
          chords: ['Emaj9', 'C#m9', 'F#9', 'Bmaj9', 'Emaj9', 'G#m9'],
          mel: ['G#5/2 F#5/1 B5/1', 'E5/2 D#5/1 G#5/1', 'A#5/1.5 G#5/.5 E5/2',
            'D#5/2 F#5/1 C#6/1', 'B5/2 G#5/1 F#5/1', 'D#6/1.5 B5/.5 A#5/2'],
        },
        open: { chords: ['Eaug:2|Daug:2', 'F#9'], mel: ['C6/1 G#5/1 F#5/1 A#5/1', 'E6/2 C#6/1 A#5/1'] },
        close: { chords: ['Eaug:2|Daug:2', 'Emaj9'], mel: ['C6/1 G#5/1 F#5/1 D5/1', 'F#5/1 E5/3'] },
        B: {
          chords: ['C#m9', 'Bmaj9', 'G#m9', 'F#9', 'Emaj9', 'C#m9', 'Eaug:2|Daug:2', 'F#9'],
          mel: ['G#5/2 B5/1 D#6/1', 'C#6/2 A#5/1 F#5/1', 'B5/2 D#6/1 F#6/1', 'E6/1.5 C#6/.5 A#5/2',
            'G#5/1 B5/1 D#6/2', 'E6/2 C#6/1 G#5/1', 'E5/1 G#5/1 A#5/1 C6/1', 'E6/2 G#5/1 A#5/1'],
          cnt: ['r/2 E5/2', 'D#5/4', 'r/1 B4/3', 'C#5/4', 'r/2 F#5/2', 'E5/4', 'C5/2 D5/2', 'C#5/4'],
        },
      },
    },
  },
  {
    id: 'arabesco',
    name: 'Arabesco',
    label: 'Piano con pedal y celesta, 3/4, giro pentatónico',
    character: 'fluido, delicado, aguado',
    piece: {
      title: 'Arabesco', key: 'Fa mayor (novenas)', tonic: 5, mode: 'major',
      scale: scalePcs(5, 'major'), bpm: 92, beatsPerBar: 3, form: FORM4, style: 'waltz', pedal: true,
      voices: { mel: 'piano', acc: 'piano', bass: 'piano', cnt: 'celesta' },
      vg: { mel: 0.9, acc: 0.5, bass: 0.7, cnt: 0.35 },
      reverb: 0.6, level: 0.28, rubato: { amp: 0.025, ritard: 0.07 }, orn: { kind: 'grace', prob: 0.06 },
      dyn: { A: 1, open: 1, close: 0.95, B: 1.06 },
      sections: {
        A: {
          chords: ['Fmaj9', 'Dm9', 'Gm9', 'C9', 'Fmaj9', 'Am7'],
          mel: ['A5/1 C6/1 G5/1', 'F5/1 A5/1 E5/1', 'D5/1 F5/1 A5/1', 'G5/2 E5/1', 'C6/1 A5/1 G5/1', 'E5/1 G5/1 C6/1'],
        },
        open: { chords: ['Gm9:2|C9:1', 'C9'], mel: ['D6/1 Bb5/1 G5/1', 'E5/2 D5/1'] },
        close: { chords: ['Gm9:2|C9:1', 'Fmaj9'], mel: ['Bb5/1 A5/1 G5/1', 'G5/1 A5/2'] },
        B: {
          chords: ['Bbmaj9', 'Am7', 'Gm9', 'C9', 'Dm9', 'Bbmaj9', 'Gm9:2|C9:1', 'C9'],
          mel: ['D6/1 F6/1 C6/1', 'E6/1 C6/1 G5/1', 'A5/1 D6/1 Bb5/1', 'G5/2 D5/1',
            'E5/1 A5/1 D6/1', 'C6/1 D6/1 F5/1', 'A5/1 Bb5/1 G5/1', 'E5/1 G5/1 Bb5/1'],
          cnt: ['C6/3', 'r/1 E6/2', 'D6/3', 'r/1 E6/2', 'F6/3', 'r/1 D6/2', 'Bb5/2 G5/1', 'r/1 E6/2'],
        },
      },
    },
  },
];
