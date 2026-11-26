// Partituras originales como datos. Todas compuestas para esta app; no citan ninguna obra existente.
//
// Formato de cada pieza:
//   sections.{A,open,close,B}: { chords: [...], mel: [...] }  (un elemento por compás)
//   - chords: "Dm" | "F:2|C:2" (varios acordes por compás con peso relativo) | "Eb/G" (bajo)
//   - mel: notas "C#5/1.5" (nombre/duración en tiempos), "r/1" silencio, "*.5" = duración por defecto
//   form: orden de secciones. A+open (8 compases, final abierto), A+close (8, final conclusivo), B (8).
//   style: patrón de acompañamiento generado desde los acordes (ver styles.js).
import { scalePcs } from './theory.js';

export const FORM4 = [['A', 'open'], ['A', 'close'], ['B'], ['A', 'close']]; // A–A'–B–A' = 32 compases
export const FORM3 = [['A', 'open'], ['A', 'close'], ['B']];                 // A–A'–B = 24 compases

export const ERAS = ['menu', 'renaissance', 'baroque', 'rococo', 'neoclassic', 'romantic',
  'realism', 'impressionism', 'postimpressionism', 'modern'];

export const SCORES = {
  // ------------------------------------------------------------------ Renacimiento
  renaissance: {
    title: 'Pavana del alba', key: 'Re dórico', tonic: 2, mode: 'dorian',
    scale: scalePcs(2, 'dorian'), bpm: 72, beatsPerBar: 4, form: FORM4, style: 'lute',
    voices: { mel: 'lute', acc: 'lute', bass: 'lute' }, vg: { mel: 1, acc: 0.8, bass: 0.9 },
    reverb: 0.35, level: 0.94, rubato: { amp: 0.012, ritard: 0.05 }, orn: { kind: 'mordent', prob: 0.14 },
    sections: {
      A: {
        chords: ['Dm', 'C', 'F', 'C', 'Dm', 'F|C'],
        mel: ['A4/1 D5/1.5 C5/.5 D5/1', 'E5/2 D5/1 C5/1', 'C5/1 A4/1 F4/1 G4/1',
          'G4/2 E4/1 G4/1', 'A4/1 D5/1 E5/1 F5/1', 'F5/1 E5/.5 D5/.5 E5/1 C5/1'],
      },
      open: { chords: ['F|G', 'A'], mel: ['C5/1 A4/1 B4/1 G4/1', 'E5/2 A4/2'] },
      close: { chords: ['Am|G', 'Dm'], mel: ['C5/1 E5/1 D5/1 B4/1', 'A4/1 D5/3'] },
      B: {
        chords: ['F', 'C', 'Am', 'G', 'F', 'C', 'Em|Am', 'G'],
        mel: ['C5/2 A4/1 C5/1', 'E5/2 G5/2', 'A5/1 G5/1 E5/1 C5/1', 'D5/1 B4/1 G4/2',
          'A4/1 C5/1 F5/2', 'E5/1.5 D5/.5 C5/1 E5/1', 'G5/1 E5/1 C5/1 E5/1', 'D5/2 B4/1 A4/1'],
      },
    },
  },

  // ------------------------------------------------------------------ Barroco
  baroque: {
    title: 'Giga sin nombre', key: 'Re menor', tonic: 2, mode: 'minor',
    scale: scalePcs(2, 'minor', [1]), bpm: 96, beatsPerBar: 4, form: FORM4, style: 'continuo',
    voices: { mel: 'harpsichord', acc: 'harpsichord', bass: 'harpsichord' }, vg: { mel: 1, acc: 0.6, bass: 0.8 },
    reverb: 0.22, level: 1.13, rubato: { amp: 0, ritard: 0.04 }, orn: { kind: 'mordent', prob: 0.18 },
    sections: {
      A: {
        chords: ['Dm', 'Dm', 'Gm', 'C7', 'F', 'Bb'],
        mel: ['*.5 D5 F5 E5 G5 F5 A5 G5 F5', '*.5 A5 G5 F5 E5 D5 F5 E5 D5',
          '*.5 Bb4 D5 C5 E5 D5 F5 E5 D5', '*.5 G4 Bb4 A4 C5 Bb4 D5 C5 Bb4',
          '*.5 A4 C5 Bb4 D5 C5 E5 D5 C5', '*.5 D5 F5 E5 G5 F5 A5 G5 F5'],
      },
      open: { chords: ['Em7b5|A7', 'A'], mel: ['*.5 G5 F5 E5 D5 C#5 E5 A4 C#5', 'E5/1 C#5/1 A4/2'] },
      close: { chords: ['Em7b5|A7', 'Dm'], mel: ['*.5 G5 F5 E5 D5 E5 A4 G4 C#5', 'D5/2 F5/1 D5/1'] },
      B: {
        chords: ['F', 'Bb', 'Gm7', 'C7', 'F', 'Dm', 'Gm|Em7b5', 'A7'],
        mel: ['*.5 C6 A5 Bb5 G5 A5 F5 G5 E5', '*.5 Bb5 G5 A5 F5 G5 E5 F5 D5',
          '*.5 G5 E5 F5 D5 E5 C5 D5 Bb4', '*.5 E5 C5 D5 Bb4 C5 A4 Bb4 G4',
          '*.5 F5 A5 C6 A5 F5/1 C5/1', '*.5 D5 F5 A5 F5 D5 F5 A5 D6',
          '*.5 Bb5 A5 G5 F5 G5 F5 E5 D5', '*.5 C#5 E5 G5 E5 C#5/1 A4/1'],
      },
    },
  },

  // ------------------------------------------------------------------ Rococó
  rococo: {
    title: 'Minué de la caja', key: 'Sol mayor', tonic: 7, mode: 'major',
    scale: scalePcs(7, 'major'), bpm: 112, beatsPerBar: 3, form: FORM4, style: 'minuet',
    voices: { mel: 'musicbox', acc: 'harpsiLite', bass: 'harpsiLite' }, vg: { mel: 0.9, acc: 0.7, bass: 0.8 },
    reverb: 0.3, level: 0.97, rubato: { amp: 0.008, ritard: 0.04 }, orn: { kind: 'grace', prob: 0.22 },
    sections: {
      A: {
        chords: ['G', 'D', 'G', 'C', 'G', 'Em'],
        mel: ['B4/1 D5/.5 G5/.5 F#5/.5 G5/.5', 'A5/1 F#5/.5 D5/.5 E5/.5 F#5/.5',
          'G5/.5 B5/.5 A5/.5 G5/.5 F#5/1', 'E5/1 G5/.5 E5/.5 C5/1',
          'D5/1 B4/.5 D5/.5 G5/1', 'G5/1 E5/.5 G5/.5 B5/1'],
      },
      open: { chords: ['Am:2|D:1', 'D'], mel: ['C6/1 A5/1 F#5/1', 'A5/2 F#5/1'] },
      close: { chords: ['C:2|D:1', 'G'], mel: ['E5/1 G5/1 F#5/1', 'D5/1 B4/.5 A4/.5 G4/1'] },
      B: {
        chords: ['D', 'A7', 'D', 'Bm', 'Em', 'A7', 'D', 'D7'],
        mel: ['D5/1 F#5/.5 A5/.5 D6/1', 'C#6/1 E6/.5 C#6/.5 A5/1', 'D6/1 B5/.5 A5/.5 F#5/1',
          'D5/1 F#5/.5 B5/.5 A5/1', 'G5/1 E5/.5 G5/.5 B5/1', 'A5/1 G5/.5 F#5/.5 E5/1',
          'F#5/1 A5/.5 F#5/.5 D5/1', 'C6/1 A5/1 F#5/1'],
      },
    },
  },

  // ------------------------------------------------------------------ Neoclasicismo
  neoclassic: {
    title: 'Andantino simétrico', key: 'Do mayor', tonic: 0, mode: 'major',
    scale: scalePcs(0, 'major'), bpm: 100, beatsPerBar: 4, form: FORM4, style: 'alberti',
    voices: { mel: 'fortepiano', acc: 'fortepiano', bass: 'fortepiano' }, vg: { mel: 1, acc: 0.6, bass: 0.7 },
    reverb: 0.2, level: 0.73, rubato: { amp: 0.005, ritard: 0.04 }, orn: { kind: 'grace', prob: 0.12 },
    sections: {
      A: {
        chords: ['C', 'F:2|C:2', 'Dm:2|G:2', 'G', 'C', 'Am:2|F:2'],
        mel: ['G4/1 C5/1 E5/2', 'F5/1 E5/.5 D5/.5 E5/1 C5/1', 'F5/1 D5/1 D5/1 B4/1',
          'B4/1 G4/1 D5/2', 'G4/1 C5/1 E5/1 G5/1', 'A5/1 E5/1 F5/1 C5/1'],
      },
      open: { chords: ['Dm:2|G:2', 'G'], mel: ['D5/1 F5/1 G5/1 B4/1', 'D5/2 B4/1 G4/1'] },
      close: { chords: ['Dm:2|G7:2', 'C'], mel: ['D5/1 F5/1 G5/1 F5/1', 'E5/2 C5/2'] },
      B: {
        chords: ['G', 'D:2|G:2', 'Em:2|Am:2', 'D', 'Em', 'Am', 'F:2|Dm:2', 'G7'],
        mel: ['B4/1 D5/1 G5/2', 'F#5/1 A5/1 G5/1 D5/1', 'G5/1 E5/1 C6/1 A5/1', 'A5/1 F#5/1 D5/2',
          'E5/1 G5/1 B5/2', 'A5/1 G5/.5 F5/.5 E5/2', 'F5/1 A5/1 D5/1 F5/1', 'G5/1 F5/1 D5/1 B4/1'],
      },
    },
  },

  // ------------------------------------------------------------------ Romanticismo
  romantic: {
    title: 'Nocturno en mi bemol', key: 'Mi bemol mayor', tonic: 3, mode: 'major',
    scale: scalePcs(3, 'major'), bpm: 66, beatsPerBar: 3, form: FORM4, style: 'arpeggio', pedal: true,
    voices: { mel: 'piano', acc: 'piano', bass: 'piano' }, vg: { mel: 1, acc: 0.7, bass: 0.9 },
    reverb: 0.55, level: 0.27, rubato: { amp: 0.035, ritard: 0.09 }, orn: { kind: 'turn', prob: 0.1 },
    sections: {
      A: {
        chords: ['Eb', 'Cm', 'Ab', 'Bb7', 'Eb/G', 'Fm7'],
        mel: ['Bb4/1.5 Eb5/.5 G5/1', 'G5/1 F5/.5 Eb5/.5 C5/1', 'C5/1.5 Eb5/.5 Ab5/1',
          'F5/1 D5/.5 F5/.5 Ab5/1', 'Bb5/1.5 G5/.5 Eb5/1', 'Ab5/1 C6/.5 Bb5/.5 Ab5/1'],
      },
      open: { chords: ['Ab', 'Bb7'], mel: ['Eb6/1.5 C6/.5 Ab5/1', 'F5/2 D5/1'] },
      close: { chords: ['Ab:2|Bb7:1', 'Eb'], mel: ['C6/1 Eb6/1 D6/1', 'Bb5/1 G5/1 Eb5/1'] },
      B: {
        chords: ['Cm', 'Gm/Bb', 'Ab', 'Eb/G', 'Fm7', 'Dm7b5', 'Eb/Bb', 'Bb7'],
        mel: ['Eb5/1 G5/1 C6/1', 'Bb5/1.5 Ab5/.5 G5/1', 'Ab5/1 C6/1 Eb6/1', 'Bb5/1.5 C6/.5 D6/1',
          'C6/1 Ab5/1 F5/1', 'F5/1.5 Ab5/.5 C6/1', 'Bb5/2 G5/1', 'F5/1.5 D5/.5 F5/1'],
      },
    },
  },

  // ------------------------------------------------------------------ Realismo
  realism: {
    title: 'Canción de la estepa', key: 'Sol menor', tonic: 7, mode: 'minor',
    scale: scalePcs(7, 'minor', [6]), bpm: 60, beatsPerBar: 4, form: FORM4, style: 'folk',
    voices: { mel: 'piano', acc: 'piano', bass: 'cello' }, vg: { mel: 1, acc: 0.6, bass: 0.9 },
    reverb: 0.4, level: 0.36, rubato: { amp: 0.02, ritard: 0.07 }, orn: null,
    sections: {
      A: {
        chords: ['Gm', 'Dm', 'Bb', 'F', 'Cm', 'Gm'],
        mel: ['D5/1.5 C5/.5 Bb4/1 A4/1', 'A4/2 F4/1 A4/1', 'Bb4/1.5 C5/.5 D5/1 F5/1',
          'C5/1 A4/1 F4/2', 'Eb5/1.5 D5/.5 C5/1 Eb5/1', 'D5/1 Bb4/1 G4/2'],
      },
      open: { chords: ['Eb:2|D:2', 'D'], mel: ['G5/1 Bb4/1 A4/1 F#4/1', 'D5/2 A4/2'] },
      close: { chords: ['Eb:2|D:2', 'Gm'], mel: ['Bb4/1 G4/1 F#4/1 A4/1', 'G4/4'] },
      B: {
        chords: ['Bb', 'F', 'Gm', 'Eb', 'Cm', 'Gm', 'Cm:2|D:2', 'D'],
        mel: ['F5/2 D5/1 F5/1', 'A5/1.5 G5/.5 F5/1 C5/1', 'Bb5/2 A5/1 G5/1', 'G5/1.5 F5/.5 Eb5/2',
          'G5/1 Eb5/1 C5/2', 'Bb4/1 D5/1 G5/2', 'Eb5/1 C5/1 D5/1 F#5/1', 'A5/2 F#5/1 D5/1'],
      },
    },
  },

  // ------------------------------------------------------------------ Impresionismo
  impressionism: {
    title: 'Reflejos', key: 'Re bemol (pentatónica y tonos enteros)', tonic: 1, mode: 'major',
    scale: scalePcs(1, 'major'), bpm: 56, beatsPerBar: 4, form: FORM4, style: 'haze', pedal: true,
    voices: { mel: 'piano', acc: 'piano', bass: 'piano' }, vg: { mel: 0.9, acc: 0.55, bass: 0.7 },
    reverb: 0.65, level: 0.41, rubato: { amp: 0.03, ritard: 0.08 }, orn: { kind: 'grace', prob: 0.08 },
    sections: {
      A: {
        chords: ['Dbmaj9', 'Dbmaj9', 'Gbmaj9', 'Ebm9', 'Dbmaj9', 'Bbm9'],
        mel: ['F5/2 Ab5/1 Eb5/1', 'Db6/1 Bb5/1 Ab5/2', 'Bb5/2 Ab5/1 F5/1',
          'Gb5/1 Bb5/1 Db6/2', 'Ab5/2 F5/1 Eb5/1', 'Db6/1 Ab5/1 F5/2'],
      },
      open: { chords: ['Gbmaj9:2|Ebm9:2', 'Ab9'], mel: ['Bb5/2 Db6/1 Bb5/1', 'C6/2 Eb6/1 Db6/1'] },
      close: { chords: ['Gbmaj9:2|Ab9:2', 'Dbmaj9'], mel: ['Bb5/2 Gb5/1 Ab5/1', 'F5/1 Ab5/1 Db6/2'] },
      B: {
        chords: ['Bbm9', 'Bbm9', 'Gbmaj9', 'Dbmaj9', 'Dbaug', 'Ebm9', 'Gbmaj9:2|Ebm9:2', 'Ab9'],
        mel: ['F5/1 Ab5/1 Db6/2', 'C6/2 Ab5/1 F5/1', 'Db6/1 Bb5/1 Ab5/2', 'Ab5/1 F5/1 Eb5/2',
          'A5/2 F5/1 Eb5/1', 'Gb5/1 Bb5/1 F6/2', 'Db6/2 Bb5/1 Gb5/1', 'Eb5/2 C5/1 Ab4/1'],
      },
    },
  },

  // ------------------------------------------------------------------ Postimpresionismo
  postimpressionism: {
    title: 'Color de tarde', key: 'Re mixolidio', tonic: 2, mode: 'mixolydian',
    scale: scalePcs(2, 'mixolydian'), bpm: 108, beatsPerBar: 4, form: FORM4, style: 'pulse',
    voices: { mel: 'piano', acc: 'piano', bass: 'piano' }, vg: { mel: 1, acc: 0.65, bass: 0.85 },
    reverb: 0.3, level: 0.26, rubato: { amp: 0.008, ritard: 0.04 }, orn: { kind: 'grace', prob: 0.1 },
    sections: {
      A: {
        chords: ['D', 'C', 'G', 'D', 'Em', 'C'],
        mel: ['A4/.5 D5/1 F#5/1 A5/.5 F#5/1', 'G5/1.5 E5/.5 C5/1 E5/1', 'D5/.5 G5/1 B5/1 G5/.5 D5/1',
          'A5/1.5 F#5/.5 D5/2', 'G5/.5 B5/1 G5/1 E5/.5 G5/1', 'E5/1.5 G5/.5 C6/1 G5/1'],
      },
      open: { chords: ['C', 'G'], mel: ['E5/.5 G5/1 E5/1 C5/.5 E5/1', 'B4/1.5 D5/.5 G5/2'] },
      close: { chords: ['C:2|G:2', 'D'], mel: ['E5/1 G5/1 B4/1 D5/1', 'F#5/1.5 A5/.5 D5/2'] },
      B: {
        chords: ['Bm', 'A', 'G', 'D', 'Bm', 'A', 'G', 'A'],
        mel: ['B4/.5 D5/1 F#5/1 D5/.5 B4/1', 'A5/1.5 E5/.5 C#5/1 E5/1', 'G5/.5 B5/1 D6/1 B5/.5 G5/1',
          'F#5/1 A5/.5 D6/1.5 A5/1', 'D5/.5 F#5/1 B5/1 F#5/.5 D5/1', 'C#6/1.5 A5/.5 E5/1 A5/1',
          'B5/1 G5/1 D5/.5 G5/1.5', 'C#6/1.5 A5/.5 E5/2'],
      },
    },
  },

  // ------------------------------------------------------------------ Moderno
  modern: {
    title: 'Cuartas', key: 'Mi dórico (acordes por cuartas)', tonic: 4, mode: 'dorian',
    scale: scalePcs(4, 'dorian'), bpm: 92, beatsPerBar: 5, form: FORM4, style: 'bells',
    voices: { mel: 'bell', acc: 'bell', bass: 'bell' }, vg: { mel: 0.9, acc: 0.6, bass: 0.7 },
    reverb: 0.5, level: 1.07, rubato: { amp: 0.01, ritard: 0.05 }, orn: null,
    sections: {
      A: {
        chords: ['Eq3', 'Aq3', 'Eq3', 'Bq3', 'F#q3', 'Aq3'],
        mel: ['E5/1 A5/1 D6/1 B5/2', 'A5/1.5 D6/.5 G5/1 E6/2', 'E5/1 B5/1 A5/1 D6/1 B5/1',
          'B5/2 E6/1 A5/2', 'F#5/1 B5/1 E6/1 C#6/2', 'G5/1 D6/1 A5/3'],
      },
      open: { chords: ['Aq3', 'Bq3'], mel: ['D6/1.5 G5/.5 A5/1 E5/2', 'E5/1 A5/1 B5/3'] },
      close: { chords: ['Bq3:3|Aq3:2', 'Eq3'], mel: ['B5/1 E6/1 A5/1 D6/1 G5/1', 'A5/1 D6/1 E5/3'] },
      B: {
        chords: ['C#q3', 'F#q3', 'Bq3', 'Eq3', 'C#q3', 'F#q3', 'Bq3', 'Bsus2'],
        mel: ['C#6/1 F#5/1 B5/1 F#6/2', 'E6/1.5 B5/.5 F#5/1 B5/2', 'A5/1 E6/1 B5/3', 'D6/1 A5/1 E5/1 A5/2',
          'F#5/1 B5/1 C#6/1 B5/2', 'B5/1.5 E6/.5 F#6/1 E6/2', 'E6/1 A5/1 B5/3', 'F#5/2 C#6/1 B5/2'],
      },
    },
  },

  // ------------------------------------------------------------------ Menú
  menu: {
    title: 'Sala de entrada', key: 'Do mayor', tonic: 0, mode: 'major',
    scale: scalePcs(0, 'major'), bpm: 84, beatsPerBar: 4, form: FORM3, style: 'warm',
    voices: { mel: 'felt', acc: 'felt', bass: 'felt', pad: 'pad' }, vg: { mel: 1, acc: 0.6, bass: 0.7, pad: 0.5 },
    reverb: 0.4, level: 0.29, rubato: { amp: 0.01, ritard: 0.04 }, orn: { kind: 'grace', prob: 0.06 },
    sections: {
      A: {
        chords: ['Cmaj7', 'Am7', 'Fmaj7', 'G', 'Cmaj7', 'Em7'],
        mel: ['E5/1 G5/1 E5/1 D5/1', 'C5/1 E5/1 A5/2', 'A5/1 G5/1 F5/1 E5/1',
          'D5/1 B4/1 G4/2', 'E5/1.5 G5/.5 C6/1 G5/1', 'B5/1 G5/1 E5/2'],
      },
      open: { chords: ['Fmaj7:2|Dm7:2', 'G'], mel: ['A5/1 C6/1 A5/1 F5/1', 'B4/1 D5/1 G5/2'] },
      close: { chords: ['Fmaj7:2|G:2', 'Cmaj7'], mel: ['A5/1 F5/1 D5/1 B4/1', 'G5/1 E5/1 C5/2'] },
      B: {
        chords: ['Am7', 'Dm7', 'G', 'Cmaj7', 'Fmaj7', 'Em7', 'Dm7:2|G:2', 'G'],
        mel: ['C5/1 E5/1 G5/1 E5/1', 'F5/1 A5/1 C6/2', 'B5/1 G5/1 D5/2', 'E5/1 G5/1 B5/2',
          'A5/1.5 G5/.5 F5/1 E5/1', 'G5/1 E5/1 B4/2', 'D5/1 F5/1 G5/1 B5/1', 'D6/2 B5/1 G5/1'],
      },
    },
  },
};
