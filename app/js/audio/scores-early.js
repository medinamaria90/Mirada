// Partituras originales de las dos épocas más antiguas (compuestas para esta app, no citan ninguna obra):
//  - Gótico: aire de cantiga, en modo eclesiástico, con bordón de órgano portativo en quintas vacías.
//  - Manierismo y Norte: polifonía a la flamenca, con la viola da gamba imitando a la flauta dulce.
// Mismo formato que scores.js.
import { scalePcs } from './theory.js';
import { FORM4 } from './forms.js';

const DYN = { A: 1, open: 1, close: 0.96, B: 1.06 };

export const EARLY_SCORES = {
  // ------------------------------------------------------------------ Gótico
  // Cantiga en re dórico, 3/4 trocaico (largo-corto). La primera vuelta acaba abierta en do y la
  // segunda cerrada en re (ouvert y clos); la mudanza (B) sube a la octava y acaba en la, la quinta.
  gothic: {
    title: 'Cantiga del claustro', key: 'Re dórico', tonic: 2, mode: 'dorian',
    scale: scalePcs(2, 'dorian'), bpm: 80, beatsPerBar: 3, form: FORM4, style: 'drone',
    voices: { mel: 'recorder', acc: 'harp', bass: 'harp', pad: 'organ' },
    vg: { mel: 0.95, acc: 0.7, bass: 0.8, pad: 0.5 },
    reverb: 0.45, level: 0.5, rubato: { amp: 0.012, ritard: 0.06 }, orn: { kind: 'mordent', prob: 0.1 }, dyn: DYN,
    sections: {
      A: {
        chords: ['Dm', 'Dm', 'C', 'Dm', 'F', 'G'],
        mel: ['A4/1 D5/1 E5/1', 'F5/2 E5/1', 'G5/1 F5/1 E5/1', 'D5/2 A4/1', 'C5/1 D5/1 F5/1', 'D5/1 G5/1 A5/1'],
      },
      open: { chords: ['C', 'C'], mel: ['G5/1 F5/1 E5/1', 'E5/2 C5/1'] },
      close: { chords: ['C', 'Dm'], mel: ['G5/1 F5/1 E5/1', 'D5/3'] },
      B: {
        chords: ['F', 'C', 'F', 'G', 'Am', 'G', 'C', 'Am'],
        mel: ['A5/2 C6/1', 'G5/1 E5/1 G5/1', 'A5/1 C6/1 D6/1', 'D6/2 B5/1', 'C6/1 B5/1 A5/1', 'B5/1 A5/1 G5/1',
          'E5/1 G5/1 F5/1', 'E5/2 D5/1'],
      },
    },
  },

  // ------------------------------------------------------------------ Manierismo y Norte
  // Motete instrumental en sol menor: la flauta expone el tema (sol–re, mi♭–re–do–si♭) y la gamba lo
  // imita un compás después, a la octava baja; en B es la gamba la que empieza y la flauta responde.
  northern: {
    title: 'Motete de Brujas', key: 'Sol menor', tonic: 7, mode: 'minor',
    scale: scalePcs(7, 'minor', [6]), bpm: 66, beatsPerBar: 4, form: FORM4, style: 'consort',
    voices: { mel: 'recorder', cnt: 'gamba', acc: 'organ', bass: 'gamba' },
    vg: { mel: 0.95, cnt: 0.8, acc: 0.55, bass: 0.7 },
    reverb: 0.5, level: 0.47, rubato: { amp: 0.01, ritard: 0.06 }, orn: { kind: 'mordent', prob: 0.08 }, dyn: DYN,
    sections: {
      A: {
        chords: ['Gm', 'Eb', 'Cm', 'D', 'Gm', 'Cm|D'],
        mel: ['G4/2 D5/2', 'Eb5/1 D5/1 C5/1 Bb4/1', 'C5/1.5 Bb4/.5 A4/1 G4/1', 'F#4/1 G4/1 A4/2',
          'Bb4/1 C5/1 D5/2', 'C5/1 Eb5/1 D5/2'],
        cnt: ['r/4', 'G3/2 D4/2', 'Eb4/1 D4/1 C4/1 Bb3/1', 'D4/2 A3/2', 'G3/1 F3/1 Eb3/1 D3/1', 'Eb3/2 F#3/2'],
      },
      open: {
        chords: ['Gm|Cm', 'D'],
        mel: ['Bb4/2 C5/1 Eb5/1', 'D5/2 A4/1 F#4/1'],
        cnt: ['G3/2 G3/1 A3/1', 'F#3/2 D3/2'],
      },
      close: {
        chords: ['Cm|D', 'Gm'],
        mel: ['Eb5/1 C5/1 A4/1 F#4/1', 'G4/4'],
        cnt: ['C4/2 D4/2', 'G3/4'],
      },
      B: {
        chords: ['Bb', 'F', 'Gm', 'D', 'Eb', 'Bb', 'Cm|D', 'D'],
        mel: ['D5/2 F5/2', 'F5/1 G5/1 A5/2', 'Bb5/1 A5/1 G5/1 F5/1', 'A5/2 F#5/1 D5/1',
          'G5/1.5 F5/.5 Eb5/1 D5/1', 'D5/1 F5/1 Bb5/2', 'C6/1 Bb5/1 A5/2', 'D5/2 C5/1 A4/1'],
        cnt: ['Bb3/1 C4/1 D4/2', 'F4/1 Eb4/1 D4/1 C4/1', 'Bb3/2 D4/2', 'D4/2 A3/2',
          'Eb4/1 D4/1 C4/1 Bb3/1', 'Bb3/2 F3/2', 'Eb3/2 D3/2', 'D3/2 F#3/2'],
      },
    },
  },
};
