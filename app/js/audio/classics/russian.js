// Rama «Escuela rusa»: arreglos propios de una canción popular y de Chaikovski (dominio público).
import { scalePcs } from '../theory.js';
import { FORM4 } from '../scores.js';
import { ARRANGEMENT } from './arrangement.js';

const SWAN_THEME = ['F#5/2 B4/.5 C#5/.5 D5/.5 E5/.5', 'F#5/3 D5/1', 'F#5/3 D5/1', 'F#5/3 B4/1', 'D5/1 B4/1 G4/1 D5/1',
  'B4/4'];

export const RUSSIAN_CLASSICS = [
  {
    id: 'korobeiniki',
    name: 'Korobéiniki',
    label: 'Acordeón y guitarra, 4/4, canción de los buhoneros',
    character: 'vivo, popular, decidido',
    source: '«Korobéiniki», canción popular rusa sobre un poema de Nikolái Nekrásov (1861)',
    arrangement: ARRANGEMENT,
    piece: {
      title: 'Korobéiniki', key: 'La menor', tonic: 9, mode: 'minor',
      scale: scalePcs(9, 'minor', [8]), bpm: 120, beatsPerBar: 4, form: FORM4, style: 'polka',
      voices: { mel: 'accordion', acc: 'guitar', bass: 'guitar' }, vg: { mel: 0.85, acc: 0.75, bass: 0.9 },
      reverb: 0.28, level: 0.6, rubato: { amp: 0.004, ritard: 0.04 }, orn: { kind: 'grace', prob: 0.06 },
      dyn: { A: 1, open: 1, close: 0.97, B: 1.06 },
      sections: {
        A: {
          chords: ['E', 'Am', 'E', 'Am', 'Dm', 'C'],
          mel: ['E5/1 B4/.5 C5/.5 D5/1 C5/.5 B4/.5', 'A4/1 A4/.5 C5/.5 E5/1 D5/.5 C5/.5', 'B4/1.5 C5/.5 D5/1 E5/1',
            'C5/1 A4/1 A4/2', 'r/.5 D5/1 F5/.5 A5/1 G5/.5 F5/.5', 'E5/1.5 C5/.5 E5/1 D5/.5 C5/.5'],
        },
        open: { chords: ['E', 'Am:2|E:2'], mel: ['B4/1 B4/.5 C5/.5 D5/1 E5/1', 'C5/1 A4/1 B4/2'] },
        close: { chords: ['E', 'Am'], mel: ['B4/1 B4/.5 C5/.5 D5/1 E5/1', 'C5/1 A4/1 A4/2'] },
        B: {
          chords: ['F', 'C', 'G', 'Am', 'Dm', 'Am', 'E', 'E'],
          mel: ['A5/1 G5/.5 F5/.5 C5/1 F5/1', 'G5/1 E5/.5 D5/.5 C5/2', 'D5/1 B4/.5 C5/.5 D5/1 G5/1', 'E5/1 C5/1 A4/2',
            'F5/1 D5/.5 E5/.5 F5/1 A5/1', 'E5/1 C5/.5 D5/.5 E5/1 A4/1', 'B4/1 G#4/.5 A4/.5 B4/1 D5/1', 'E5/2 G#4/2'],
        },
      },
    },
  },
  {
    id: 'cisnes',
    name: 'El lago de los cisnes',
    label: 'Viola, piano y cello, 4/4, tema del cisne en si menor',
    character: 'lírico, nostálgico, elegante',
    source: 'Tema del cisne de «El lago de los cisnes», Piotr Ilich Chaikovski (1876)',
    arrangement: ARRANGEMENT,
    piece: {
      title: 'El lago de los cisnes', key: 'Si menor', tonic: 11, mode: 'minor',
      scale: scalePcs(11, 'minor', [10]), bpm: 76, beatsPerBar: 4, form: FORM4, style: 'arpeggio', pedal: true,
      voices: { mel: 'viola', acc: 'piano', bass: 'cello' }, vg: { mel: 0.9, acc: 0.6, bass: 0.75 },
      reverb: 0.5, level: 0.4, rubato: { amp: 0.02, ritard: 0.08 }, orn: null,
      dyn: { A: 1, open: 1, close: 0.95, B: 1.07 },
      sections: {
        A: { chords: ['Bm', 'D', 'Bm', 'Bm:3|G:1', 'G', 'Bm'], mel: SWAN_THEME },
        open: { chords: ['Em:2|F#:2', 'F#'], mel: ['E5/1 D5/1 C#5/1 B4/1', 'A#4/2 C#5/2'] },
        close: { chords: ['Em:2|F#:2', 'Bm:1|F#:1|Bm:2'], mel: ['E5/1 D5/1 C#5/1 E5/1', 'D5/1 C#5/1 B4/2'] },
        B: {
          chords: ['D', 'G', 'D', 'A', 'Bm', 'Em', 'Bm:1|F#:1|Bm:1|F#:1', 'F#'],
          mel: ['D5/1 E5/1 F#5/1 A5/1', 'G5/2 F#5/1 E5/1', 'F#5/1 E5/1 D5/1 B4/1', 'C#5/2 A4/2', 'B4/1 C#5/1 D5/1 F#5/1',
            'E5/2 D5/1 C#5/1', 'D5/1 C#5/1 B4/1 A#4/1', 'C#5/2 F#5/2'],
        },
      },
    },
  },
];
