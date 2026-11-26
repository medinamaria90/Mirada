// El tema de la portada («mi— sol mi re | do mi la— sol») en cuatro moldes para la música de las
// ramas: mayor y menor, en 4/4, 3/4 y 6/8. Cada pieza de rama parte de un molde, lo transporta a su
// tonalidad y le pone su compás, timbre y acompañamiento; así se reconoce el hilo de Sfumato y a la
// vez se nota que se ha cambiado de sitio. Lógica pura: solo datos y transporte de nombres de notas.
import { scalePcs, noteToMidi } from '../theory.js';
import { THEME } from './tema.js';

/** A (sin contramelodía) – A2 (con ella) – B – A2: 32 compases. */
export const FORM_THEME = [['A', 'open'], ['A2', 'close'], ['B'], ['A2', 'close']];
/** Dinámica por sección: el puente (B) algo más presente y el cierre más recogido. */
export const DYN_THEME = { A: 1, A2: 1.03, open: 1, close: 0.95, B: 1.08 };

const withCounter = (a, cnt) => ({ chords: a.chords, mel: a.mel, cnt });

// ---------------------------------------------------------------- moldes

/** Mayor, 4/4: el tema de la portada tal cual (do mayor). */
const MAJOR_4 = { tonic: 0, mode: 'major', extra: [], beatsPerBar: 4, sections: THEME.menu[0].piece.sections };

/** Menor, 4/4 (re menor): el gancho baja a la sexta menor (si bemol) y cadencia con la dominante mayor. */
const MINOR_4_A = {
  chords: ['Dm', 'Bb:3|A:1', 'F', 'Gm:2|A:2', 'Dm', 'Bb:2|C:2'],
  mel: ['F5/1.5 A5/.5 F5/1 E5/1', 'D5/.5 F5/.5 Bb5/2 A5/1', 'A5/1.5 C6/.5 A5/1 G5/1',
    'G5/.5 Bb5/.5 D6/1 E6/1 C#6/1', 'F5/1.5 A5/.5 F5/1 E5/1', 'D5/.5 F5/.5 G5/.5 Bb5/1 A5/1.5'],
};
const MINOR_4 = {
  tonic: 2, mode: 'minor', extra: [1], beatsPerBar: 4,
  sections: {
    A: MINOR_4_A,
    A2: withCounter(MINOR_4_A, ['D4/4', 'D4/3 C#4/1', 'C4/4', 'Bb3/2 A3/2', 'A3/4', 'Bb3/2 C4/2']),
    open: { chords: ['Gm:2|A:2', 'A'], mel: ['Bb5/1 G5/1 E5/1 C#5/1', 'E5/2 A4/2'] },
    close: { chords: ['Gm:2|A7:2', 'Dm'], mel: ['Bb4/1 D5/1 C#5/1 E5/1', 'D5/3 A4/1'] },
    B: {
      chords: ['F', 'C', 'Dm', 'A', 'Bb', 'F', 'Gm:2|A:2', 'A'],
      mel: ['C5/1 F5/.5 A5/1.5 G5/1', 'G5/2 E5/1 C5/1', 'D5/1 F5/.5 A5/1.5 G5/1', 'E5/2 C#5/1 A4/1',
        'D5/1 F5/.5 Bb5/1.5 A5/1', 'A5/2 F5/1 C5/1', 'Bb4/1 D5/1 C#5/1 E5/1', 'E5/2 C#5/1 A4/1'],
    },
  },
};

/** Menor, 3/4 (la menor): el gancho cae por el semitono fa–mi (cadencia andaluza) en cada respuesta. */
const MINOR_3_A = {
  chords: ['Am', 'F:2|E:1', 'C', 'Dm:2|E:1', 'Am', 'F:2|E:1'],
  mel: ['C5/1.5 E5/.5 C5/.5 B4/.5', 'A4/.5 C5/.5 F5/1 E5/1', 'E5/1.5 G5/.5 E5/.5 D5/.5',
    'F5/.5 A5/.5 D6/1 B5/1', 'C5/1.5 E5/.5 C5/.5 B4/.5', 'A4/.5 C5/.5 D5/.5 F5/.5 E5/1'],
};
const MINOR_3 = {
  tonic: 9, mode: 'minor', extra: [8], beatsPerBar: 3,
  sections: {
    A: MINOR_3_A,
    A2: withCounter(MINOR_3_A, ['A3/3', 'A3/2 G#3/1', 'G3/3', 'F3/2 E3/1', 'E3/3', 'F3/2 G#3/1']),
    open: { chords: ['Dm:2|E:1', 'E'], mel: ['F5/1 E5/.5 D5/.5 B4/.5 C5/.5', 'B4/1 G#4/1 E4/1'] },
    close: { chords: ['Dm:2|E:1', 'Am'], mel: ['D5/1 F5/.5 E5/.5 B4/1', 'A4/2 E4/1'] },
    B: {
      chords: ['F', 'G', 'C', 'E', 'F', 'G', 'Dm:2|E:1', 'E'],
      mel: ['A4/1 C5/.5 F5/1.5', 'D5/2 B4/1', 'E5/1 G5/.5 C6/1.5', 'B5/2 G#5/1',
        'A5/1 C6/.5 F6/1.5', 'D6/2 B5/1', 'A5/1 F5/1 G#5/1', 'B5/1 G#5/1 E5/1'],
    },
  },
};

/** Mayor, 3/4 (sol mayor): el gancho en compás ternario y el motivo-firma (si–re–mi–sol) al cerrar. */
const MAJOR_3_A = {
  chords: ['G', 'C:2|D:1', 'D', 'Am:2|D:1', 'G', 'Em:2|D:1'],
  mel: ['B4/1.5 D5/.5 B4/.5 A4/.5', 'G4/.5 B4/.5 E5/1 D5/1', 'D5/1.5 F#5/.5 D5/.5 C5/.5',
    'C5/.5 E5/.5 A5/1 F#5/1', 'B4/1.5 D5/.5 B4/.5 A4/.5', 'B4/.5 D5/.5 E5/.5 G5/.5 F#5/1'],
};
const MAJOR_3 = {
  tonic: 7, mode: 'major', extra: [], beatsPerBar: 3,
  sections: {
    A: MAJOR_3_A,
    A2: withCounter(MAJOR_3_A, ['G3/3', 'E3/2 F#3/1', 'A3/3', 'C4/2 A3/1', 'B3/3', 'G3/2 A3/1']),
    open: { chords: ['C:2|D:1', 'D'], mel: ['E5/1 C5/.5 A4/.5 F#4/1', 'D5/2 A4/1'] },
    close: { chords: ['C:2|D:1', 'G'], mel: ['E5/1 C5/.5 A4/.5 F#4/1', 'G4/2 D4/1'] },
    B: {
      chords: ['Em', 'Am', 'D', 'G', 'C', 'Am', 'C:2|D:1', 'D'],
      mel: ['G4/1 B4/.5 E5/1.5', 'E5/2 C5/1', 'F#5/1 A5/.5 D6/1.5', 'B5/2 G5/1',
        'G5/1 C6/.5 E6/1.5', 'C6/2 A5/1', 'G5/1 E5/1 F#5/1', 'A5/1 F#5/1 D5/1'],
    },
  },
};

/** Mayor, 6/8 (sol mayor, seis corcheas): el gancho con paso de giga (largo-corto). */
const MAJOR_6_A = {
  chords: ['G', 'C', 'D', 'Am:3|D:3', 'G', 'C:3|D:3'],
  mel: ['B4/2 D5/1 B4/2 A4/1', 'G4/1 B4/1 E5/3 D5/1', 'D5/2 F#5/1 D5/2 C5/1',
    'C5/1 E5/1 A5/3 F#5/1', 'B4/2 D5/1 B4/2 A4/1', 'G4/1 B4/1 C5/1 D5/2 E5/1'],
};
const MAJOR_6 = {
  tonic: 7, mode: 'major', extra: [], beatsPerBar: 6,
  sections: {
    A: MAJOR_6_A,
    A2: withCounter(MAJOR_6_A, ['D4/6', 'E4/3 C4/3', 'F#4/3 A4/3', 'E4/3 F#4/3', 'D4/3 B3/3', 'E4/3 F#4/3']),
    open: { chords: ['C:3|D:3', 'D'], mel: ['E5/2 C5/1 A4/2 F#4/1', 'D5/3 A4/3'] },
    close: { chords: ['C:3|D:3', 'G'], mel: ['E5/2 C5/1 A4/2 F#4/1', 'G4/3 D4/3'] },
    B: {
      chords: ['Em', 'C', 'G', 'D', 'Em', 'Am', 'C:3|D:3', 'D'],
      mel: ['B4/3 E5/2 D5/1', 'E5/3 C5/2 B4/1', 'D5/3 G5/2 F#5/1', 'A5/3 F#5/2 D5/1',
        'G5/3 E5/2 B4/1', 'C5/3 E5/2 A5/1', 'G5/2 E5/1 F#5/2 D5/1', 'A5/3 F#5/2 D5/1'],
    },
  },
};

export const MOLDS = { MAJOR_4, MINOR_4, MINOR_3, MAJOR_3, MAJOR_6 };

// ---------------------------------------------------------------- transporte

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const NOTE_IN_BAR = /([A-G][#b]?)(\d)/g;
const CHORD_ROOT = /^([A-G][#b]?)(.*)$/;
const pc = (name) => (noteToMidi(`${name}4`) % 12 + 12) % 12;

/** Compás de melodía transportado `shift` semitonos («E5/1.5 G5/.5» +2 → «F#5/1.5 A5/.5»). */
export function transposeBar(bar, shift, flats = false) {
  const names = flats ? FLATS : SHARPS;
  return bar.replace(NOTE_IN_BAR, (_, n, o) => {
    const midi = noteToMidi(`${n}${o}`) + shift;
    return `${names[midi % 12]}${Math.floor(midi / 12) - 1}`;
  });
}

/**
 * Celda de acordes transportada («Dm:2|E:1»). `color` cambia el tipo de acorde (p. ej. séptimas por
 * novenas para el Impresionismo): { '': 'add9', maj7: 'maj9' }.
 */
export function transposeChords(cell, shift, flats = false, color = {}) {
  const names = flats ? FLATS : SHARPS;
  const move = (name) => names[(pc(name) + shift + 12) % 12];
  return cell.split('|').map((part) => {
    const [name, w] = part.split(':');
    const [body, bass] = name.split('/');
    const [, root, quality] = CHORD_ROOT.exec(body);
    const q = color[quality] ?? quality;
    const chord = `${move(root)}${q}${bass ? `/${move(bass)}` : ''}`;
    return w === undefined ? chord : `${chord}:${w}`;
  }).join('|');
}

function transposeSection(sec, shift, flats, color) {
  const out = {
    chords: sec.chords.map((c) => transposeChords(c, shift, flats, color)),
    mel: sec.mel.map((b) => transposeBar(b, shift, flats)),
  };
  if (sec.cnt) out.cnt = sec.cnt.map((b) => transposeBar(b, shift, flats));
  return out;
}

/**
 * Pieza completa a partir de un molde: transporta melodía, contramelodía, acordes y escala, y añade
 * forma y dinámica del tema. `props` trae el resto de la partitura (título, tempo, estilo, voces…).
 * @param mold   uno de MOLDS
 * @param opts.shift  semitonos (con signo)
 * @param opts.flats  escribir con bemoles
 * @param opts.color  cambio de tipo de acorde (ver transposeChords)
 */
export function themePiece(mold, { shift = 0, flats = false, color = {} }, props) {
  const sections = Object.fromEntries(Object.entries(mold.sections)
    .map(([name, sec]) => [name, transposeSection(sec, shift, flats, color)]));
  const tonic = (mold.tonic + shift + 120) % 12;
  return {
    tonic, mode: mold.mode, scale: scalePcs(tonic, mold.mode, mold.extra.map((x) => (x + shift + 120) % 12)),
    beatsPerBar: mold.beatsPerBar, form: FORM_THEME, dyn: DYN_THEME, ...props, sections,
  };
}
