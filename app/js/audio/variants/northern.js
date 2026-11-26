// Manierismo y Norte: dos piezas propias más. Una, la tensión manierista (bajo cromático de lamento);
// la otra, el tema de la portada («Sala de entrada») tratado en imitación a la flamenca.
import { scalePcs } from '../theory.js';
import { FORM4 } from '../forms.js';

const DYN = { A: 1, open: 1, close: 0.96, B: 1.06 };

export const NORTHERN = [
  {
    id: 'espejo',
    name: 'Fantasía del espejo',
    label: 'Viola da gamba, órgano y flauta dulce, 3/4, bajo cromático que desciende',
    character: 'tenso, cromático, melancólico',
    piece: {
      // El bajo baja por semitonos re–do#–do–si–si♭–la (lamento); en B sube hasta un mi mayor lejano
      // tras si♭ (relación de tritono) antes de volver a la dominante.
      title: 'Fantasía del espejo', key: 'Re menor', tonic: 2, mode: 'minor',
      scale: scalePcs(2, 'minor', [1, 11]), bpm: 58, beatsPerBar: 3, form: FORM4, style: 'lament',
      voices: { mel: 'gamba', cnt: 'recorder', acc: 'organ', bass: 'gamba' },
      vg: { mel: 1, cnt: 0.6, acc: 0.55, bass: 0.7 },
      reverb: 0.5, level: 0.69, rubato: { amp: 0.018, ritard: 0.08 }, orn: { kind: 'grace', prob: 0.08 }, dyn: DYN,
      sections: {
        A: {
          chords: ['Dm', 'A/C#', 'Dm/C', 'G/B', 'Gm/Bb', 'A'],
          mel: ['A4/2 D5/1', 'E5/2 C#5/1', 'D5/1 F5/1 E5/1', 'D5/2 B4/1', 'D5/1.5 C5/.5 Bb4/1', 'A4/1 C#5/1 E5/1'],
        },
        open: { chords: ['Bb', 'A'], mel: ['F5/1 E5/1 D5/1', 'C#5/2 E5/1'] },
        close: { chords: ['Gm:2|A:1', 'Dm'], mel: ['Bb4/1 G4/1 A4/1', 'D5/3'] },
        B: {
          chords: ['F', 'C/E', 'Dm', 'A/C#', 'Bb', 'Gm/Bb', 'E7', 'A'],
          mel: ['C5/2 A4/1', 'G4/1 C5/1 E5/1', 'F5/2 E5/1', 'E5/1 C#5/1 A4/1', 'D5/2 F5/1', 'G5/1 F5/1 E5/1',
            'D5/1 B4/1 G#4/1', 'C#5/2 A4/1'],
          cnt: ['A5/3', 'G5/3', 'A5/3', 'C#6/3', 'D6/2 C6/1', 'Bb5/3', 'B5/2 G#5/1', 'A5/3'],
        },
      },
    },
  },
  {
    id: 'tema',
    name: 'Tema en imitación',
    label: 'Flauta dulce, viola da gamba y virginal, 4/4, el tema de la portada en canon',
    character: 'reconocible, ordenado, cálido',
    piece: {
      // Gancho de «Sala de entrada» (3–5–3–2 | 1–3–6–5) en fa mayor: la flauta lo canta y la gamba lo
      // imita un compás después, dos octavas abajo, durante tres compases; luego acompaña libre.
      title: 'Tema en imitación', key: 'Fa mayor', tonic: 5, mode: 'major',
      scale: scalePcs(5, 'major'), bpm: 80, beatsPerBar: 4, form: FORM4, style: 'virginal',
      voices: { mel: 'recorder', cnt: 'gamba', acc: 'harpsiLite', bass: 'gamba' },
      vg: { mel: 0.9, cnt: 0.75, acc: 0.65, bass: 0.7 },
      reverb: 0.42, level: 0.49, rubato: { amp: 0.01, ritard: 0.05 }, orn: { kind: 'mordent', prob: 0.1 }, dyn: DYN,
      sections: {
        A: {
          chords: ['F', 'Dm', 'Bb', 'Gm', 'F', 'Am'],
          mel: ['A5/1.5 C6/.5 A5/1 G5/1', 'F5/.5 A5/.5 D6/2 C6/1', 'D6/1.5 F6/.5 D6/1 C6/1',
            'Bb5/.5 D6/.5 G6/2 E6/1', 'A5/1.5 C6/.5 A5/1 G5/1', 'A5/.5 C6/.5 D6/.5 F6/1 E6/1.5'],
          cnt: ['r/4', 'A3/1.5 C4/.5 A3/1 G3/1', 'F3/.5 A3/.5 D4/2 C4/1', 'D4/1.5 F4/.5 D4/1 C4/1',
            'C4/2 A3/2', 'A3/2 C4/2'],
        },
        open: {
          chords: ['Bb|C', 'C'],
          mel: ['D6/1 F6/1 E6/1 C6/1', 'G5/1 A5/.5 Bb5/.5 C6/2'],
          cnt: ['Bb3/2 C4/2', 'E4/2 G3/2'],
        },
        close: {
          chords: ['Bb|C', 'F'],
          mel: ['D6/1 Bb5/1 G5/1 E5/1', 'F5/2 r/1 C5/1'],
          cnt: ['Bb3/2 C4/2', 'F3/4'],
        },
        B: {
          chords: ['Dm', 'Gm', 'C', 'F', 'Bb', 'F', 'Gm|C', 'C'],
          mel: ['D5/1 F5/.5 A5/1.5 G5/1', 'Bb5/2 A5/1 G5/1', 'G5/1 C6/.5 E6/1.5 D6/1', 'C6/3 A5/1',
            'Bb5/1 D6/.5 F6/1.5 E6/1', 'C6/2 A5/1 F5/1', 'G5/1 Bb5/1 C6/1 E6/1', 'E6/2 C6/1 G5/1'],
          cnt: ['D4/2 F4/2', 'G3/2 Bb3/2', 'C4/2 E4/2', 'F3/2 A3/2', 'Bb3/2 D4/2', 'A3/2 F3/2', 'G3/2 C4/2', 'C4/2 E4/2'],
        },
      },
    },
  },
];
