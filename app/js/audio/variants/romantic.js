// Romanticismo: piano expresivo con rubato y cuerdas graves.
import { scalePcs } from '../theory.js';
import { FORM4 } from '../scores.js';

export const ROMANTIC = [
  {
    id: 'barcarola',
    name: 'Barcarola',
    label: 'Piano con pedal y cello, 6/8, quinta que sube y se mece',
    character: 'ondulante, nostálgico, amplio',
    piece: {
      title: 'Barcarola', key: 'La menor', tonic: 9, mode: 'minor',
      scale: scalePcs(9, 'minor', [8]), bpm: 150, beatsPerBar: 6, form: FORM4, style: 'barcarolle', pedal: true,
      voices: { mel: 'piano', acc: 'piano', bass: 'piano', cnt: 'cello' },
      vg: { mel: 1, acc: 0.65, bass: 0.85, cnt: 0.5 },
      reverb: 0.55, level: 0.24, rubato: { amp: 0.03, ritard: 0.09 }, orn: { kind: 'turn', prob: 0.08 },
      dyn: { A: 1, open: 1.02, close: 0.94, B: 1.1 },
      sections: {
        A: {
          chords: ['Am', 'Dm', 'E', 'Am', 'F', 'C'],
          mel: ['E5/2 A5/1 C6/2 B5/1', 'A5/2 F5/1 D5/3', 'G#5/2 B5/1 E6/2 D6/1',
            'C6/3 A5/3', 'A5/2 C6/1 F6/2 E6/1', 'E6/2 C6/1 G5/3'],
        },
        open: { chords: ['Dm|E', 'E'], mel: ['F5/2 A5/1 G#5/2 B5/1', 'B5/3 G#5/2 E5/1'] },
        close: { chords: ['Dm|E', 'Am'], mel: ['F5/2 D5/1 B4/2 G#4/1', 'A4/6'] },
        B: {
          chords: ['C', 'G', 'Am', 'E', 'F', 'Dm', 'Bm7b5|E', 'E'],
          mel: ['G5/2 C6/1 E6/2 D6/1', 'D6/2 B5/1 G5/3', 'C6/2 E6/1 A6/2 G6/1', 'G#6/3 E6/3',
            'F6/2 E6/1 C6/3', 'D6/2 F6/1 A5/3', 'F5/2 D5/1 G#5/2 B5/1', 'E6/3 D6/2 B5/1'],
          cnt: ['E4/6', 'D4/6', 'C4/6', 'B3/6', 'A3/6', 'F3/6', 'F3/3 E3/3', 'E3/6'],
        },
      },
    },
  },
  {
    id: 'balada',
    name: 'Balada de la ventana',
    label: 'Piano y cello, 4/4, arpegio que sube hasta la sexta',
    character: 'íntimo, cantable, melancólico',
    piece: {
      title: 'Balada de la ventana', key: 'Fa mayor', tonic: 5, mode: 'major',
      scale: scalePcs(5, 'major'), bpm: 72, beatsPerBar: 4, form: FORM4, style: 'arpeggio', pedal: true,
      voices: { mel: 'piano', acc: 'piano', bass: 'cello' },
      vg: { mel: 1, acc: 0.6, bass: 0.6 },
      reverb: 0.5, level: 0.29, rubato: { amp: 0.03, ritard: 0.09 }, orn: { kind: 'turn', prob: 0.1 },
      dyn: { A: 1, open: 1.02, close: 0.94, B: 1.08 },
      sections: {
        A: {
          chords: ['F', 'Dm', 'Bb', 'C', 'F', 'Am'],
          mel: ['A4/1 C5/1 F5/1.5 E5/.5', 'D5/1.5 C5/.5 A4/2', 'Bb4/1 D5/1 F5/1.5 G5/.5',
            'E5/1.5 D5/.5 C5/2', 'F5/1 A5/1 C6/1.5 Bb5/.5', 'A5/1.5 G5/.5 E5/2'],
        },
        open: { chords: ['Gm:2|C:2', 'C'], mel: ['G5/1 Bb5/1 G5/1 E5/1', 'E5/2 D5/1 G5/1'] },
        close: { chords: ['Gm:2|C:2', 'F'], mel: ['Bb5/1 G5/1 E5/1 D5/1', 'C5/1 F5/3'] },
        B: {
          chords: ['Dm', 'Bb', 'Gm', 'C', 'Am', 'Dm', 'Gm:2|C:2', 'C'],
          mel: ['A5/1 D6/1 F6/1.5 E6/.5', 'D6/1.5 C6/.5 Bb5/2', 'G5/1 Bb5/1 D6/1.5 C6/.5', 'E6/1.5 D6/.5 C6/2',
            'C6/1 E6/1 A5/2', 'F5/1 A5/1 D6/1.5 C6/.5', 'Bb5/1 G5/1 G5/1 E5/1', 'G5/2 E5/1 D5/1'],
        },
      },
    },
  },
];
