// Simbolismo y vanguardias: celesta, vibráfono y cromatismo suave.
import { scalePcs } from '../theory.js';
import { FORM4 } from '../scores.js';

export const MODERN = [
  {
    id: 'celesta',
    name: 'Celesta nocturna',
    label: 'Celesta y vibráfono, 3/4, terceras que suben con mediante cromática',
    character: 'misterioso, cristalino, suspendido',
    piece: {
      title: 'Celesta nocturna', key: 'Mi mayor (con do y sol naturales)', tonic: 4, mode: 'major',
      scale: scalePcs(4, 'major', [0, 7]), bpm: 76, beatsPerBar: 3, form: FORM4, style: 'shimmer',
      voices: { mel: 'celesta', acc: 'vibraphone', bass: 'vibraphone' },
      vg: { mel: 0.9, acc: 0.6, bass: 0.7 },
      reverb: 0.55, level: 1.45, rubato: { amp: 0.012, ritard: 0.06 }, orn: null,
      dyn: { A: 1, open: 1, close: 0.95, B: 1.06 },
      sections: {
        A: {
          chords: ['Emaj7', 'C#m7', 'Amaj7', 'Cmaj7', 'Emaj7', 'F#m7'],
          mel: ['G#5/1 B5/1 D#6/1', 'E6/2 B5/1', 'C#6/1 E6/1 G#6/1', 'G6/2 E6/1', 'D#6/1 B5/1 G#5/1', 'A5/2 C#6/1'],
        },
        open: { chords: ['Amaj7:2|B:1', 'B'], mel: ['C#6/1 E6/1 D#6/1', 'F#6/2 D#6/1'] },
        close: { chords: ['Amaj7:2|B:1', 'Emaj7'], mel: ['A5/1 C#6/1 B5/1', 'G#5/3'] },
        B: {
          chords: ['Cmaj7', 'Amaj7', 'F#m7', 'B', 'G#m7', 'Cmaj7', 'Amaj7:2|B:1', 'B'],
          mel: ['E5/1 G5/1 B5/1', 'C#6/2 A5/1', 'A5/1 C#6/1 E6/1', 'F#6/2 D#6/1',
            'B5/1 D#6/1 F#6/1', 'G6/1 E6/1 C6/1', 'C#6/1 E6/1 D#6/1', 'B5/2 F#5/1'],
        },
      },
    },
  },
  {
    id: 'lidio',
    name: 'Flauta lidia',
    label: 'Flauta y vibráfono, 4/4, terceras lidias con séptima de color',
    character: 'flotante, limpio, moderno',
    piece: {
      title: 'Flauta lidia', key: 'Do lidio (con si bemol)', tonic: 0, mode: 'lydian',
      scale: scalePcs(0, 'lydian', [10]), bpm: 84, beatsPerBar: 4, form: FORM4, style: 'wash', pedal: true,
      voices: { mel: 'flute', acc: 'vibraphone', bass: 'vibraphone' },
      vg: { mel: 0.9, acc: 0.6, bass: 0.7 },
      reverb: 0.5, level: 0.61, rubato: { amp: 0.012, ritard: 0.06 }, orn: null,
      dyn: { A: 1, open: 1, close: 0.95, B: 1.06 },
      sections: {
        A: {
          chords: ['Cmaj7', 'D', 'Em7', 'Bm7', 'Cmaj7', 'Am7'],
          mel: ['E5/1.5 G5/.5 B5/1 F#5/1', 'A5/2 F#5/1 D5/1', 'G5/1.5 B5/.5 D6/1 B5/1',
            'A5/2 F#5/1 D5/1', 'E5/1 G5/1 B5/1 D6/1', 'C6/2 A5/1 E5/1'],
        },
        open: { chords: ['Am7:2|D:2', 'D'], mel: ['E5/1 G5/1 F#5/1 A5/1', 'A5/2 Bb5/1 A5/1'] },
        close: { chords: ['Am7:2|D:2', 'Cmaj7'], mel: ['E5/1 C5/1 D5/1 F#5/1', 'G5/2 E5/2'] },
        B: {
          chords: ['Em7', 'C7', 'Am7', 'D', 'Bm7', 'G', 'Am7:2|D:2', 'D'],
          mel: ['B5/1.5 D6/.5 F#6/1 D6/1', 'E6/2 Bb5/1 G5/1', 'A5/1.5 C6/.5 E6/1 C6/1', 'D6/2 A5/1 F#5/1',
            'F#5/1.5 A5/.5 D6/1 B5/1', 'G5/2 B5/1 D6/1', 'C6/1 A5/1 F#5/1 A5/1', 'A5/2 F#5/1 E5/1'],
        },
      },
    },
  },
];
