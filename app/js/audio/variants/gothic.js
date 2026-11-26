// Gótico: dos piezas propias más, con fídula, arpa, flauta dulce y órgano portativo sobre bordones.
import { scalePcs } from '../theory.js';
import { FORM4 } from '../forms.js';

const DYN = { A: 1, open: 1, close: 0.96, B: 1.06 };

export const GOTHIC = [
  {
    id: 'estampida',
    name: 'Estampida del mercado',
    label: 'Fídula, arpa y órgano, 6/8, frases con final abierto y cerrado',
    character: 'danzante, rústico, luminoso',
    piece: {
      // Cada frase se toca dos veces con el mismo compás de partida: la primera acaba en la (abierto) y
      // la segunda en sol (cerrado), como los puncta de las estampidas.
      title: 'Estampida del mercado', key: 'Sol mixolidio', tonic: 7, mode: 'mixolydian',
      scale: scalePcs(7, 'mixolydian'), bpm: 138, beatsPerBar: 6, form: FORM4, style: 'estampie',
      voices: { mel: 'fiddle', cnt: 'recorder', acc: 'harp', bass: 'harp', pad: 'organ' },
      vg: { mel: 0.95, cnt: 0.6, acc: 0.7, bass: 0.8, pad: 0.45 },
      reverb: 0.4, level: 0.93, rubato: { amp: 0.008, ritard: 0.05 }, orn: { kind: 'mordent', prob: 0.1 }, dyn: DYN,
      sections: {
        A: {
          chords: ['G', 'F', 'G', 'C', 'F', 'Dm'],
          mel: ['D5/2 B4/1 G4/2 B4/1', 'C5/2 A4/1 F4/2 A4/1', 'B4/1 C5/1 D5/1 E5/2 D5/1', 'C5/2 E5/1 G5/3',
            'F5/2 E5/1 D5/2 C5/1', 'D5/2 C5/1 D5/2 F5/1'],
        },
        open: { chords: ['C|F', 'Am'], mel: ['E5/2 D5/1 C5/2 A4/1', 'C5/1 B4/1 C5/1 A4/3'] },
        close: { chords: ['C|F', 'G'], mel: ['E5/2 D5/1 C5/2 A4/1', 'B4/1 A4/1 B4/1 G4/3'] },
        B: {
          chords: ['C', 'G', 'F', 'C', 'Am', 'G', 'Dm', 'F'],
          mel: ['G5/2 E5/1 C5/2 E5/1', 'D5/2 B4/1 D5/2 G5/1', 'A5/2 G5/1 F5/2 A5/1', 'G5/3 E5/3',
            'E5/2 A5/1 C6/2 A5/1', 'B5/2 A5/1 G5/2 D5/1', 'F5/2 E5/1 D5/2 A4/1', 'C5/2 D5/1 C5/3'],
          cnt: ['C6/3 E6/3', 'B5/3 D6/3', 'C6/3 A5/3', 'E6/3 C6/3', 'C6/3 E6/3', 'D6/3 B5/3', 'A5/3 F5/3', 'A5/6'],
        },
      },
    },
  },
  {
    id: 'lauda',
    name: 'Lauda de vísperas',
    label: 'Órgano portativo, fídula en bordón y arpa, 4/4, mi frigio',
    character: 'recogido, grave, sereno',
    piece: {
      // Modo de mi (frigio): la cadencia baja fa–mi por semitono, el color más medieval de todos.
      title: 'Lauda de vísperas', key: 'Mi frigio', tonic: 4, mode: 'phrygian',
      scale: scalePcs(4, 'phrygian'), bpm: 58, beatsPerBar: 4, form: FORM4, style: 'lauda',
      voices: { mel: 'organ', pad: 'fiddle', acc: 'harp', bass: 'harp' },
      vg: { mel: 1, pad: 0.55, acc: 0.7, bass: 0.8 },
      reverb: 0.55, level: 0.83, rubato: { amp: 0.014, ritard: 0.07 }, orn: { kind: 'mordent', prob: 0.06 }, dyn: DYN,
      sections: {
        A: {
          chords: ['Em', 'Dm', 'Em', 'Am', 'F', 'G'],
          mel: ['B4/1 E5/1 F5/1 G5/1', 'F5/1.5 E5/.5 D5/2', 'G5/1 A5/1 B5/2', 'C6/2 B5/1 A5/1',
            'A5/1 G5/1 F5/1 A5/1', 'G5/3 F5/1'],
        },
        open: { chords: ['Dm', 'Am'], mel: ['F5/1 E5/1 D5/1 C5/1', 'C5/1 B4/1 A4/2'] },
        close: { chords: ['F|Dm', 'Em'], mel: ['A5/1 G5/1 F5/2', 'E5/4'] },
        B: {
          chords: ['C', 'G', 'Am', 'Em', 'F', 'G', 'Dm', 'Am'],
          mel: ['E5/1 G5/1 C6/2', 'B5/1.5 A5/.5 G5/2', 'A5/1 C6/1 D6/2', 'E6/1 D6/1 B5/2',
            'C6/2 A5/1 F5/1', 'G5/1 B5/1 D6/1 B5/1', 'A5/1 F5/1 D5/1 E5/1', 'C5/2 A4/2'],
        },
      },
    },
  },
];
