// Realismo: piano y clarinete con aire popular.
import { scalePcs } from '../theory.js';
import { FORM4 } from '../scores.js';

const FORM6 = [['A', 'open'], ['A', 'close'], ['B'], ['A', 'close'], ['B'], ['A', 'close']]; // 48 compases

export const REALISM = [
  {
    id: 'polca',
    name: 'Polca de feria',
    label: 'Clarinete, piano y pizzicato, 2/4, tríada que sube en corcheas',
    character: 'popular, campechano, alegre',
    piece: {
      title: 'Polca de feria', key: 'Fa mayor', tonic: 5, mode: 'major',
      scale: scalePcs(5, 'major'), bpm: 104, beatsPerBar: 2, form: FORM6, style: 'polka',
      voices: { mel: 'clarinet', acc: 'piano', bass: 'pizz' },
      vg: { mel: 0.9, acc: 0.55, bass: 0.85 },
      reverb: 0.3, level: 0.51, rubato: { amp: 0.006, ritard: 0.05 }, orn: { kind: 'grace', prob: 0.1 },
      dyn: { A: 1, open: 1, close: 0.96, B: 1.06 },
      sections: {
        A: {
          chords: ['F', 'C', 'F', 'Bb', 'F', 'C'],
          mel: ['A4/.5 C5/.5 F5/1', 'G5/.5 E5/.5 C5/1', 'A4/.5 C5/.5 F5/.5 A5/.5', 'Bb5/1 F5/1',
            'A5/.5 F5/.5 C5/1', 'E5/1 G5/.5 C6/.5'],
        },
        open: { chords: ['Gm|C', 'C'], mel: ['Bb5/.5 A5/.5 G5/1', 'E5/1 G5/1'] },
        close: { chords: ['Gm|C', 'F'], mel: ['Bb5/.5 G5/.5 E5/1', 'F5/2'] },
        B: {
          chords: ['Dm', 'Am', 'Bb', 'F', 'Gm', 'C', 'F|C', 'C'],
          mel: ['D5/.5 F5/.5 A5/1', 'C6/.5 A5/.5 E5/1', 'D5/.5 F5/.5 Bb5/1', 'C6/.5 A5/.5 F5/1',
            'G5/.5 Bb5/.5 D6/1', 'E6/.5 C6/.5 G5/1', 'A5/1 G5/1', 'E5/.5 G5/.5 C5/1'],
        },
      },
    },
  },
  {
    id: 'habanera',
    name: 'Habanera gris',
    label: 'Clarinete, piano y cello, 2/4, ritmo de habanera',
    character: 'sobrio, mecido, crepuscular',
    piece: {
      title: 'Habanera gris', key: 'Re menor', tonic: 2, mode: 'minor',
      scale: scalePcs(2, 'minor', [1]), bpm: 66, beatsPerBar: 2, form: FORM4, style: 'habanera',
      voices: { mel: 'clarinet', acc: 'piano', bass: 'piano', cnt: 'cello' },
      vg: { mel: 0.9, acc: 0.6, bass: 0.85, cnt: 0.5 },
      reverb: 0.35, level: 0.31, rubato: { amp: 0.012, ritard: 0.06 }, orn: { kind: 'grace', prob: 0.08 },
      dyn: { A: 1, open: 1, close: 0.95, B: 1.06 },
      sections: {
        A: {
          chords: ['Dm', 'Gm', 'A', 'Dm', 'Bb', 'Gm|A'],
          mel: ['A4/.75 D5/.25 F5/1', 'G5/.75 F5/.25 D5/1', 'C#5/.75 E5/.25 A5/1', 'F5/1 D5/1',
            'D5/.75 F5/.25 Bb5/1', 'G5/.5 Bb5/.5 A5/.5 E5/.5'],
        },
        open: { chords: ['Gm|A', 'A'], mel: ['Bb5/1 A5/.5 G5/.5', 'E5/.75 C#5/.25 A4/1'] },
        close: { chords: ['Gm|A', 'Dm'], mel: ['Bb4/1 A4/.5 G4/.5', 'A4/.75 F4/.25 D5/1'] },
        B: {
          chords: ['F', 'C', 'Dm', 'A', 'Bb', 'F', 'Gm|A', 'A'],
          mel: ['A5/.75 C6/.25 F5/1', 'G5/.75 E5/.25 C5/1', 'D5/.75 F5/.25 A5/1', 'C#6/.75 A5/.25 E5/1',
            'D6/.75 Bb5/.25 F5/1', 'A5/.5 C6/.5 A5/.5 F5/.5', 'G5/1 E5/.5 C#5/.5', 'A5/.75 G5/.25 E5/1'],
          cnt: ['F3/2', 'E3/2', 'F3/2', 'E3/2', 'D3/2', 'C3/2', 'Bb2/1 A2/1', 'A2/2'],
        },
      },
    },
  },
];
