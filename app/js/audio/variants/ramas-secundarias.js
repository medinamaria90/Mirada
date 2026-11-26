// Segundas piezas de las ramas por escuela (secundarias en playlists.js): melodías propias, sin el
// gancho de la portada, para que el rato largo en una rama no sea siempre el mismo tema.
// Todas compuestas para esta app: no citan ninguna obra existente (la folía es un bajo tradicional).
import { scalePcs } from '../theory.js';
import { FORM4 } from '../scores.js';

const DYN = { A: 1, open: 1, close: 0.95, B: 1.07 };

export const SCHOOL_ALT_PIECES = {
  'maestros-espanoles': [{
    id: 'folia',
    name: 'Folía de la galería',
    label: 'Viola y guitarra, 3/4, melodía propia sobre el bajo de folía',
    character: 'grave, noble, español',
    piece: {
      title: 'Folía de la galería', key: 'Re menor', tonic: 2, mode: 'minor',
      scale: scalePcs(2, 'minor', [1]), bpm: 80, beatsPerBar: 3, form: FORM4, dyn: DYN, style: 'sarabande',
      voices: { mel: 'viola', acc: 'guitar', bass: 'guitar' }, vg: { mel: 1, acc: 0.6, bass: 0.8 },
      reverb: 0.4, level: 0.65, rubato: { amp: 0.02, ritard: 0.08 }, orn: { kind: 'mordent', prob: 0.08 },
      sections: {
        A: {
          chords: ['Dm', 'A', 'Dm', 'C', 'F', 'C'],
          mel: ['D5/1 F5/1.5 E5/.5', 'E5/1 C#5/1.5 A4/.5', 'F5/1 A5/1.5 G5/.5', 'G5/1 E5/1.5 C5/.5',
            'A5/1 C6/1.5 Bb5/.5', 'G5/1 E5/1 G5/1'],
        },
        open: { chords: ['Dm', 'A'], mel: ['F5/1 D5/1.5 E5/.5', 'E5/2 C#5/1'] },
        close: { chords: ['Dm:2|A:1', 'Dm'], mel: ['F5/1 D5/1 C#5/1', 'D5/2 A4/1'] },
        B: {
          chords: ['Bb', 'F', 'Gm', 'D', 'Bb', 'F', 'Gm:2|A:1', 'A'],
          mel: ['D5/.5 F5/.5 Bb5/1.5 A5/.5', 'A5/1 F5/1 C5/1', 'Bb4/.5 D5/.5 G5/1.5 F5/.5', 'F#5/2 D5/1',
            'D5/.5 F5/.5 Bb5/1.5 C6/.5', 'A5/1 F5/1.5 A5/.5', 'Bb5/1 G5/1 E5/1', 'C#5/2 A4/1'],
        },
      },
    },
  }],

  'escuela-rusa': [{
    id: 'neva',
    name: 'Vals del Neva',
    label: 'Violín y balalaica, 3/4, vals en mi menor',
    character: 'melancólico, elegante, invernal',
    piece: {
      title: 'Vals del Neva', key: 'Mi menor', tonic: 4, mode: 'minor',
      scale: scalePcs(4, 'minor', [3]), bpm: 112, beatsPerBar: 3, form: FORM4, dyn: DYN, style: 'waltz',
      voices: { mel: 'viola', acc: 'balalaika', bass: 'balalaika' }, vg: { mel: 1, acc: 0.65, bass: 0.85 },
      reverb: 0.42, level: 0.7, rubato: { amp: 0.025, ritard: 0.08 }, orn: { kind: 'grace', prob: 0.06 },
      sections: {
        A: {
          chords: ['Em', 'Em', 'Am', 'Am', 'B7', 'Em'],
          mel: ['B4/1 E5/1 G5/1', 'B5/2 A5/.5 G5/.5', 'A5/1.5 G5/.5 E5/1', 'C5/2 E5/1',
            'D#5/1 F#5/1 A5/1', 'G5/1.5 F#5/.5 E5/1'],
        },
        open: { chords: ['C', 'B7'], mel: ['E5/1 G5/1 C6/1', 'B5/2 F#5/1'] },
        close: { chords: ['Am:2|B7:1', 'Em'], mel: ['C6/1 A5/1 F#5/1', 'E5/3'] },
        B: {
          chords: ['G', 'D', 'Em', 'B7', 'C', 'G', 'Am:2|B7:1', 'B7'],
          mel: ['D5/1 G5/1 B5/1', 'A5/2 F#5/1', 'G5/1 B5/1 E6/1', 'D#6/2 B5/1',
            'E6/1 C6/1 G5/1', 'B5/2 G5/1', 'A5/1 C6/1 B5/1', 'F#5/2 D#5/1'],
        },
      },
    },
  }],

  'pintura-britanica': [{
    id: 'colina',
    name: 'Aire de la colina',
    label: 'Flauta dulce y arpa, 4/4, aire lento en re mayor',
    character: 'tranquilo, verde, abierto',
    piece: {
      title: 'Aire de la colina', key: 'Re mayor (puente mixolidio)', tonic: 2, mode: 'major',
      scale: scalePcs(2, 'major', [0]), bpm: 76, beatsPerBar: 4, form: FORM4, dyn: DYN, style: 'arpeggio',
      voices: { mel: 'recorder', acc: 'harp', bass: 'harp' }, vg: { mel: 0.95, acc: 0.65, bass: 0.8 },
      reverb: 0.45, level: 0.52, rubato: { amp: 0.02, ritard: 0.07 }, orn: { kind: 'grace', prob: 0.08 },
      sections: {
        A: {
          chords: ['D', 'G', 'Bm', 'A', 'D', 'G'],
          mel: ['A4/1 D5/1.5 E5/.5 F#5/1', 'G5/2 F#5/1 E5/1', 'F#5/1.5 E5/.5 D5/1 B4/1', 'C#5/2 A4/2',
            'A4/1 D5/1.5 E5/.5 F#5/1', 'B5/1.5 A5/.5 G5/1 E5/1'],
        },
        open: { chords: ['Em:2|A:2', 'A'], mel: ['G5/1 F#5/1 E5/1 C#5/1', 'E5/2 A4/2'] },
        close: { chords: ['G:2|A:2', 'D'], mel: ['B4/1 D5/1 C#5/1 E5/1', 'D5/3 A4/1'] },
        B: {
          chords: ['D', 'C', 'G', 'D', 'Bm', 'G', 'Em:2|A:2', 'A'],
          mel: ['F#5/1 A5/1.5 B5/.5 A5/1', 'G5/1.5 E5/.5 C5/2', 'D5/1 G5/1.5 A5/.5 B5/1', 'A5/3 F#5/1',
            'D6/1.5 C#6/.5 B5/1 F#5/1', 'G5/1.5 A5/.5 B5/1 D5/1', 'E5/1 G5/1 C#5/1 E5/1', 'C#5/2 A4/2'],
        },
      },
    },
  }],

  'ukiyo-e': [{
    id: 'lluvia',
    name: 'Lluvia en Edo',
    label: 'Koto y cuerdas, 4/4, escala in sobre mi',
    character: 'quieto, húmedo, contemplativo',
    piece: {
      title: 'Lluvia en Edo', key: 'Mi (escala in)', tonic: 4, mode: 'minor',
      scale: new Set([4, 5, 9, 11, 0]), bpm: 66, beatsPerBar: 4, form: FORM4, dyn: DYN, style: 'wash',
      voices: { mel: 'koto', acc: 'strings', bass: 'koto' }, vg: { mel: 0.7, acc: 0.9, bass: 0.6 },
      reverb: 0.6, level: 1.1, rubato: { amp: 0.03, ritard: 0.1 }, orn: { kind: 'grace', prob: 0.06 },
      sections: {
        A: {
          chords: ['Am', 'Fmaj7', 'Esus4', 'Am', 'Fmaj7', 'Esus4'],
          mel: ['E5/1 F5/1 A5/2', 'A5/1 B5/1 C6/1 B5/1', 'A5/1.5 F5/.5 E5/2', 'C5/1 B4/1 A4/2',
            'F5/1 A5/1 B5/1 C6/1', 'B5/2 A5/1 F5/1'],
        },
        open: { chords: ['Fmaj7', 'Esus4'], mel: ['E5/1 C5/1 B4/1 A4/1', 'E5/3 r/1'] },
        close: { chords: ['Fmaj7:2|Esus4:2', 'Am'], mel: ['C5/1 B4/1 A4/1 F4/1', 'E4/2 A4/2'] },
        B: {
          chords: ['Asus2', 'Fmaj7', 'Am', 'Esus4', 'Asus2', 'Fmaj7', 'Bq3', 'Esus4'],
          mel: ['E5/1 A5/1 B5/2', 'C6/1.5 B5/.5 A5/2', 'E6/2 C6/1 B5/1', 'A5/3 F5/1',
            'E5/1 A5/1 B5/2', 'C6/1 E6/1 F6/1 E6/1', 'B5/2 A5/1 F5/1', 'E5/4'],
        },
      },
    },
  }],
};
