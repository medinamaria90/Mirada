// Música propia de las ramas por escuela: Maestros españoles, Escuela rusa, Pintura británica y Estampa
// japonesa. Las tres primeras son variaciones del tema de la portada (ver ramas-temas.js) con el color
// de su tierra; la japonesa lleva el mismo ritmo de gancho sobre la escala in, con un puente en yo.
// Todas compuestas para esta app: no citan ninguna obra existente.
import { MOLDS, themePiece, FORM_THEME, DYN_THEME } from './ramas-temas.js';

// Escala in (miyako-bushi) sobre re: re, mi bemol, sol, la, si bemol; el puente pasa a la yo
// (re, mi, sol, la, si), más luminosa. La escala de la pieza es la unión de las dos.
const IN_YO_ON_D = new Set([2, 3, 7, 9, 10, 4, 11]);

const JAPAN_A = {
  chords: ['Gm', 'Dsus4', 'Dsus4', 'Ebmaj7', 'Gm', 'Gsus2'],
  mel: ['G5/1.5 A5/.5 G5/1 Eb5/1', 'D5/.5 G5/.5 Bb5/2 A5/1', 'A5/1.5 Bb5/.5 A5/1 G5/1',
    'Eb5/.5 G5/.5 D6/2 Bb5/1', 'G5/1.5 A5/.5 G5/1 Eb5/1', 'D5/.5 Eb5/.5 G5/.5 A5/1 D6/1.5'],
};

export const SCHOOL_PIECES = {
  'maestros-espanoles': [{
    id: 'seguidilla',
    name: 'Seguidilla del patio',
    label: 'Guitarra, cello y castañuelas, 3/4, el tema de la portada en la menor',
    character: 'español, luminoso, garboso',
    piece: themePiece(MOLDS.MINOR_3, {}, {
      title: 'Seguidilla del patio', key: 'La menor (cadencia andaluza)', bpm: 104, style: 'seguidilla',
      voices: { mel: 'guitar', acc: 'guitar', bass: 'guitar', cnt: 'cello', perc: 'castanets' },
      vg: { mel: 1, acc: 0.42, bass: 0.62, cnt: 0.55, perc: 0.5 },
      reverb: 0.3, level: 0.86, rubato: { amp: 0.012, ritard: 0.06 }, orn: { kind: 'grace', prob: 0.1 },
    }),
  }],

  'escuela-rusa': [{
    id: 'balalaica',
    name: 'Tema en balalaica',
    label: 'Acordeón, balalaica y coro de cuerdas, 4/4, el tema de la portada en re menor',
    character: 'ruso, nostálgico, cálido',
    piece: themePiece(MOLDS.MINOR_4, {}, {
      title: 'Tema en balalaica', key: 'Re menor', bpm: 92, style: 'balalaika',
      voices: { mel: 'accordion', acc: 'balalaika', bass: 'balalaika', pad: 'strings', cnt: 'cello' },
      vg: { mel: 0.9, acc: 0.6, bass: 0.85, pad: 0.5, cnt: 0.55 },
      reverb: 0.4, level: 0.85, rubato: { amp: 0.02, ritard: 0.07 }, orn: { kind: 'grace', prob: 0.06 },
    }),
  }],

  'pintura-britanica': [{
    id: 'campina',
    name: 'Danza de la campiña',
    label: 'Flauta, arpa y cuerdas, 6/8, el tema de la portada en sol mayor',
    character: 'campestre, alegre, verde',
    piece: themePiece(MOLDS.MAJOR_6, {}, {
      title: 'Danza de la campiña', key: 'Sol mayor', bpm: 168, style: 'country',
      voices: { mel: 'flute', acc: 'harp', bass: 'cello', pad: 'strings', cnt: 'viola' },
      vg: { mel: 0.9, acc: 0.65, bass: 0.55, pad: 0.45, cnt: 0.5 },
      reverb: 0.38, level: 0.55, rubato: { amp: 0.01, ritard: 0.05 }, orn: { kind: 'grace', prob: 0.08 },
    }),
  }],

  'ukiyo-e': [{
    id: 'koto',
    name: 'Tema en koto',
    label: 'Shakuhachi y koto, 4/4, el gancho de la portada en escala in',
    character: 'sereno, delicado, aireado',
    piece: {
      title: 'Tema en koto', key: 'Re (escala in; puente en yo)', tonic: 2, mode: 'minor',
      scale: IN_YO_ON_D, bpm: 70, beatsPerBar: 4, form: FORM_THEME, dyn: DYN_THEME, style: 'koto',
      voices: { mel: 'shakuhachi', acc: 'koto', bass: 'koto', cnt: 'koto' },
      vg: { mel: 0.9, acc: 0.7, bass: 0.75, cnt: 0.55 },
      reverb: 0.55, level: 0.58, rubato: { amp: 0.03, ritard: 0.09 }, orn: { kind: 'grace', prob: 0.08 },
      sections: {
        A: JAPAN_A,
        A2: { ...JAPAN_A, cnt: ['D4/2 Bb3/2', 'A3/4', 'D4/4', 'Eb4/2 G4/2', 'G3/2 Bb3/2', 'A3/4'] },
        open: { chords: ['Ebmaj7', 'Dsus4'], mel: ['Bb5/1 G5/1 A5/1 Eb5/1', 'D5/3 A4/1'] },
        close: { chords: ['Ebmaj7:2|Aq3:2', 'Dsus4'], mel: ['Bb5/1 G5/1 A5/1 G5/1', 'D5/3 A4/1'] },
        B: {
          chords: ['G', 'Em', 'Asus4', 'Dsus2', 'G', 'Em', 'Asus4', 'Dsus4'],
          mel: ['B4/1 D5/.5 E5/1.5 D5/1', 'E5/2 G5/1 E5/1', 'A5/1 B5/.5 D6/1.5 B5/1', 'A5/3 E5/1',
            'D5/1 E5/.5 G5/1.5 A5/1', 'B5/2 A5/1 G5/1', 'E5/1 D5/1 E5/1 A5/1', 'A5/2 G5/1 A5/1'],
        },
      },
    },
  }],
};
