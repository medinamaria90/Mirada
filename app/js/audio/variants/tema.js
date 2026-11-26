// Tema principal de Sfumato y sus variaciones por época (leitmotiv, a la manera de Animal Crossing):
// la misma cabeza melódica en todas, cambiando modo, compás, timbre y acompañamiento.
//
// Gancho (2 compases de 4/4), en grados de la escala: 3–5–3–2 | 1–3–6–5, con el ritmo
// largo-corto-negra-negra | corchea-corchea-blanca-negra («mi—sol mi re | do mi la— sol»).
// Sale de la primera frase de «Sala de entrada» (mi–sol–mi–re, do–mi–la). Cada versión lo repite en
// secuencia (compás 3 una tercera arriba), lo recupera en el compás 5 y sube con el motivo-firma
// 3–5–6–8 (mi–sol–la–do′) hacia la cadencia. El puente cambia de ritmo (secuencia ascendente en
// valores largos) y acaba en la dominante para volver al principio.
// Fuera de lista (playlists.js no cambia): se oyen con «Siguiente» en el modo secreto y en escucha.html.
import { scalePcs } from '../theory.js';

// A (sin contramelodía) – A2 (con contramelodía) – B – A2: 32 compases.
const FORM_THEME = [['A', 'open'], ['A2', 'close'], ['B'], ['A2', 'close']];
const DYN = { A: 1, A2: 1.03, open: 1, close: 0.95, B: 1.08 };

/** A2 = A con contramelodía (la segunda vez el tema se arropa, como en los arreglos de AC). */
const withCounter = (a, cnt) => ({ chords: a.chords, mel: a.mel, cnt });

const MENU_A = {
  chords: ['Cmaj7', 'Am7', 'Fmaj7', 'G7', 'Cmaj7', 'Em7'],
  mel: ['E5/1.5 G5/.5 E5/1 D5/1', 'C5/.5 E5/.5 A5/2 G5/1', 'A5/1.5 C6/.5 A5/1 G5/1',
    'F5/.5 A5/.5 D6/2 B5/1', 'E5/1.5 G5/.5 E5/1 D5/1', 'E5/.5 G5/.5 A5/.5 C6/1 B5/1.5'],
};

const RENAISSANCE_A = {
  chords: ['Dm', 'G', 'C', 'Am', 'Dm', 'F:2|C:2'],
  mel: ['F5/1.5 A5/.5 F5/1 E5/1', 'D5/.5 F5/.5 B5/2 A5/1', 'E5/1.5 G5/.5 E5/1 D5/1',
    'C5/.5 E5/.5 A5/2 G5/1', 'F5/1.5 A5/.5 F5/1 E5/1', 'F5/.5 A5/.5 B5/.5 D6/1 C6/1.5'],
};

const ROMANTIC_A = {
  chords: ['Cm', 'Ab', 'Fm', 'G7', 'Cm', 'Eb'],
  mel: ['Eb5/1.5 G5/.5 Eb5/1 D5/1', 'C5/.5 Eb5/.5 Ab5/2 G5/1', 'Ab5/1.5 C6/.5 Ab5/1 G5/1',
    'F5/.5 Ab5/.5 D6/2 B5/1', 'Eb5/1.5 G5/.5 Eb5/1 D5/1', 'G5/.5 Bb5/.5 C6/.5 Eb6/1 D6/1.5'],
};

const IMPRESSIONISM_A = {
  chords: ['Dbmaj9', 'Bbm9', 'Gbmaj9', 'Ab9', 'Dbmaj9', 'Ebm9'],
  mel: ['F5/1.5 Ab5/.5 F5/1 Eb5/1', 'Db5/.5 F5/.5 Bb5/2 Ab5/1', 'Bb5/1.5 Db6/.5 Bb5/1 Ab5/1',
    'Gb5/.5 Bb5/.5 Eb6/2 C6/1', 'F5/1.5 Ab5/.5 F5/1 Eb5/1', 'F5/.5 Ab5/.5 Bb5/.5 Db6/1 C6/1.5'],
};

export const THEME = {
  menu: [{
    id: 'tema',
    name: 'Sala de entrada (tema)',
    label: 'Piano de fieltro, cuerdas y clarinete, 4/4, gancho de la portada',
    character: 'cálido, neutro, memorable',
    piece: {
      title: 'Sala de entrada (tema)', key: 'Do mayor', tonic: 0, mode: 'major',
      scale: scalePcs(0, 'major'), bpm: 88, beatsPerBar: 4, form: FORM_THEME, style: 'warm',
      voices: { mel: 'felt', acc: 'felt', bass: 'felt', pad: 'pad', cnt: 'clarinet' },
      vg: { mel: 1, acc: 0.6, bass: 0.7, pad: 0.5, cnt: 0.55 },
      reverb: 0.4, level: 0.29, rubato: { amp: 0.01, ritard: 0.05 }, orn: { kind: 'grace', prob: 0.05 }, dyn: DYN,
      sections: {
        A: MENU_A,
        A2: withCounter(MENU_A, ['r/2 G4/2', 'E4/2 G4/2', 'F4/3 E4/1', 'D4/4', 'r/2 G4/2', 'G4/2 B4/2']),
        open: { chords: ['Fmaj7:2|G:2', 'G'], mel: ['A5/1 C6/1 B5/1 G5/1', 'D5/1 E5/.5 F5/.5 G5/2'] },
        close: { chords: ['Fmaj7:2|G:2', 'Cmaj7'], mel: ['A5/1 F5/1 D5/1 B4/1', 'C5/2 r/1 G4/1'] },
        B: {
          chords: ['Am7', 'Dm7', 'G', 'Cmaj7', 'Fmaj7', 'Em7', 'Dm7:2|G:2', 'G'],
          mel: ['A4/1 C5/.5 E5/1.5 D5/1', 'F5/2 E5/1 D5/1', 'D5/1 G5/.5 B5/1.5 A5/1', 'G5/3 E5/1',
            'A5/1 C6/.5 E6/1.5 D6/1', 'B5/2 G5/1 E5/1', 'F5/1 A5/1 B5/1 D6/1', 'D6/2 B5/1 G5/1'],
        },
      },
    },
  }],

  renaissance: [{
    id: 'tema',
    name: 'Tema en pavana',
    label: 'Flauta dulce y laúd, 4/4, el tema de la portada en re dórico',
    character: 'antiguo, sereno, reconocible',
    piece: {
      title: 'Tema en pavana', key: 'Re dórico', tonic: 2, mode: 'dorian',
      scale: scalePcs(2, 'dorian', [1]), bpm: 76, beatsPerBar: 4, form: FORM_THEME, style: 'lute',
      voices: { mel: 'recorder', acc: 'lute', bass: 'lute', cnt: 'viola' },
      vg: { mel: 0.9, acc: 0.8, bass: 0.9, cnt: 0.5 },
      reverb: 0.36, level: 0.5, rubato: { amp: 0.012, ritard: 0.05 }, orn: { kind: 'mordent', prob: 0.12 }, dyn: DYN,
      sections: {
        A: RENAISSANCE_A,
        A2: withCounter(RENAISSANCE_A, ['D4/4', 'D4/2 B3/2', 'C4/2 E4/2', 'E4/4', 'D4/2 A3/2', 'A3/2 G3/2']),
        open: { chords: ['F:2|G:2', 'A'], mel: ['A5/1 C6/1 B5/1 G5/1', 'E5/2 C#5/1 A4/1'] },
        close: { chords: ['Am:2|G:2', 'Dm'], mel: ['E5/1.5 C5/.5 B4/1 G4/1', 'D5/3 A4/1'] },
        B: {
          chords: ['F', 'C', 'Dm', 'Am', 'G', 'C', 'Dm:2|C:2', 'A'],
          mel: ['C5/1 F5/.5 A5/1.5 G5/1', 'G5/2 E5/1 C5/1', 'F5/1 A5/.5 D6/1.5 C6/1', 'C6/2 A5/1 E5/1',
            'D5/1 G5/.5 B5/1.5 A5/1', 'G5/3 E5/1', 'F5/1 A5/1 G5/1 E5/1', 'E5/2 C#5/1 A4/1'],
        },
      },
    },
  }],

  romantic: [{
    id: 'tema',
    name: 'Tema en nocturno',
    label: 'Piano con pedal y cello, 4/4, el tema de la portada en do menor',
    character: 'íntimo, nostálgico, expresivo',
    piece: {
      title: 'Tema en nocturno', key: 'Do menor', tonic: 0, mode: 'minor',
      scale: scalePcs(0, 'minor', [11]), bpm: 63, beatsPerBar: 4, form: FORM_THEME, style: 'cradle', pedal: true,
      voices: { mel: 'piano', acc: 'piano', bass: 'piano', pad: 'strings', cnt: 'cello' },
      vg: { mel: 1, acc: 0.6, bass: 0.8, pad: 0.4, cnt: 0.7 },
      reverb: 0.55, level: 0.32, rubato: { amp: 0.035, ritard: 0.09 }, orn: { kind: 'turn', prob: 0.08 }, dyn: DYN,
      sections: {
        A: ROMANTIC_A,
        A2: withCounter(ROMANTIC_A, ['C4/2 G3/2', 'Ab3/2 C4/2', 'C4/4', 'B3/2 D4/2', 'G3/4', 'Bb3/2 G3/2']),
        open: { chords: ['Ab:2|G7:2', 'G'], mel: ['C6/1 Eb6/1 D6/1 B5/1', 'G5/2 F5/1 D5/1'] },
        close: { chords: ['Fm:2|G7:2', 'Cm'], mel: ['Ab5/1 F5/1 D5/1 B4/1', 'C5/3 G4/1'] },
        B: {
          chords: ['Eb', 'Bb', 'Cm', 'Gm', 'Ab', 'Eb/G', 'Fm:2|G7:2', 'G7'],
          mel: ['Bb4/1 Eb5/.5 G5/1.5 F5/1', 'F5/2 D5/1 Bb4/1', 'Eb5/1 G5/.5 C6/1.5 Bb5/1', 'Bb5/2 G5/1 D5/1',
            'C6/1 Eb6/.5 Ab6/1.5 G6/1', 'G6/2 Eb6/1 Bb5/1', 'Ab5/1 C6/1 B5/1 D6/1', 'F6/2 D6/1 B5/1'],
          cnt: ['G3/2 Bb3/2', 'D4/4', 'C4/2 Eb4/2', 'D4/4', 'C4/2 Eb4/2', 'Bb3/4', 'C4/2 D4/2', 'B3/2 G3/2'],
        },
      },
    },
  }],

  impressionism: [{
    id: 'tema',
    name: 'Tema en reflejos',
    label: 'Flauta, arpa y cuerdas, 4/4, el tema de la portada con novenas',
    character: 'luminoso, flotante, reconocible',
    piece: {
      title: 'Tema en reflejos', key: 'Re bemol mayor (acordes de 9.ª)', tonic: 1, mode: 'major',
      scale: scalePcs(1, 'major'), bpm: 60, beatsPerBar: 4, form: FORM_THEME, style: 'haze',
      voices: { mel: 'flute', acc: 'harp', bass: 'harp', cnt: 'strings' },
      vg: { mel: 0.85, acc: 0.75, bass: 0.85, cnt: 0.6 },
      reverb: 0.62, level: 0.59, rubato: { amp: 0.03, ritard: 0.08 }, orn: { kind: 'grace', prob: 0.06 }, dyn: DYN,
      sections: {
        A: IMPRESSIONISM_A,
        A2: withCounter(IMPRESSIONISM_A, ['Ab4/4', 'F4/4', 'Gb4/2 F4/2', 'Eb4/4', 'Ab4/4', 'Gb4/2 Bb4/2']),
        open: { chords: ['Gbmaj9:2|Ab9:2', 'Ab9'], mel: ['Bb5/1 Db6/1 C6/1 Ab5/1', 'Eb5/2 F5/1 Ab5/1'] },
        close: { chords: ['Gbmaj9:2|Ab9:2', 'Dbmaj9'], mel: ['Bb5/1 Gb5/1 Eb5/1 C5/1', 'Db5/3 Ab4/1'] },
        B: {
          chords: ['Amaj9', 'Gbmaj9', 'Amaj9', 'Dbmaj9', 'Bbm9', 'Ebm9', 'Gbmaj9:2|Ab9:2', 'Ab9'],
          mel: ['E5/1 A5/.5 C#6/1.5 B5/1', 'Bb5/2 F5/1 Db5/1', 'C#5/1 E5/.5 G#5/1.5 F#5/1', 'Ab5/2 F5/1 Eb5/1',
            'Db6/1 F6/.5 Ab6/1.5 F6/1', 'Gb6/2 Db6/1 Bb5/1', 'Bb5/1 Db6/1 C6/1 Eb6/1', 'Eb6/2 C6/1 Ab5/1'],
        },
      },
    },
  }],
};
