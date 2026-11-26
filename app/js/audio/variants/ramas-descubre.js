// Música propia de las ramas «Descubre…»: el tema de la portada vestido de su época, pero con otro
// compás, otra tonalidad y otros instrumentos que la música del camino común, para que al entrar en
// la rama se note el cambio de sitio. Moldes y transporte en ramas-temas.js.
import { MOLDS, themePiece } from './ramas-temas.js';

/** Novenas en lugar de séptimas y tríadas (color impresionista y simbolista). */
const NINTHS = { maj7: 'maj9', m7: 'm9', 7: '9', '': 'add9' };
const ADD9 = { '': 'add9', m: 'm7' };

const entry = (id, name, label, character, piece) => ({ id, name, label, character, piece });

export const DISCOVER_PIECES = {
  'descubre-renacimiento': [entry('gallarda', 'Tema en gallarda',
    'Flauta dulce, arpa y viola, 3/4, el tema de la portada en sol mayor', 'festivo, antiguo, ligero',
    themePiece(MOLDS.MAJOR_3, {}, {
      title: 'Tema en gallarda', key: 'Sol mayor', bpm: 100, style: 'galliard',
      voices: { mel: 'recorder', acc: 'harp', bass: 'harp', pad: 'viola', cnt: 'viola' },
      vg: { mel: 0.9, acc: 0.7, bass: 0.85, pad: 0.45, cnt: 0.5 },
      reverb: 0.36, level: 0.51, rubato: { amp: 0.012, ritard: 0.05 }, orn: { kind: 'mordent', prob: 0.1 },
    }))],

  'descubre-manierismo-y-norte': [entry('tiento', 'Tema en tiento',
    'Viola, clave suave y cello, 4/4, el tema de la portada en la menor', 'grave, tenso, recogido',
    themePiece(MOLDS.MINOR_4, { shift: -5 }, {
      title: 'Tema en tiento', key: 'La menor', bpm: 70, style: 'ground',
      voices: { mel: 'viola', acc: 'harpsiLite', bass: 'harpsiLite', pad: 'cello', cnt: 'cello' },
      vg: { mel: 1, acc: 0.6, bass: 0.75, pad: 0.4, cnt: 0.55 },
      reverb: 0.4, level: 0.71, rubato: { amp: 0.02, ritard: 0.07 }, orn: { kind: 'turn', prob: 0.06 },
    }))],

  'descubre-barroco': [entry('aria', 'Tema en aria',
    'Traverso, clave y cello caminante, 4/4, el tema de la portada en fa mayor', 'noble, fluido, sereno',
    themePiece(MOLDS.MAJOR_4, { shift: -7 }, {
      title: 'Tema en aria', key: 'Fa mayor', bpm: 66, style: 'walking',
      voices: { mel: 'flute', acc: 'harpsiLite', bass: 'cello', cnt: 'viola' },
      vg: { mel: 0.9, acc: 0.6, bass: 0.6, cnt: 0.5 },
      reverb: 0.34, level: 0.57, rubato: { amp: 0.01, ritard: 0.05 }, orn: { kind: 'mordent', prob: 0.12 },
    }))],

  'descubre-rococo-neoclasicismo': [entry('serenata', 'Tema en serenata',
    'Clarinete y cuerdas en pizzicato, 4/4, el tema de la portada en la mayor', 'galante, claro, amable',
    themePiece(MOLDS.MAJOR_4, { shift: -3 }, {
      title: 'Tema en serenata', key: 'La mayor', bpm: 92, style: 'serenade',
      voices: { mel: 'clarinet', acc: 'pizz', bass: 'pizz', pad: 'strings', cnt: 'viola' },
      vg: { mel: 0.9, acc: 0.6, bass: 0.75, pad: 0.4, cnt: 0.5 },
      reverb: 0.32, level: 0.68, rubato: { amp: 0.01, ritard: 0.05 }, orn: { kind: 'grace', prob: 0.08 },
    }))],

  'descubre-romanticismo': [entry('barcarola', 'Tema en barcarola',
    'Cello y piano con pedal, 6/8, el tema de la portada en la bemol mayor', 'cálido, ondulante, lírico',
    themePiece(MOLDS.MAJOR_6, { shift: 1, flats: true }, {
      title: 'Tema en barcarola', key: 'La bemol mayor', bpm: 120, style: 'barcarolle', pedal: true,
      voices: { mel: 'cello', acc: 'piano', bass: 'piano', cnt: 'viola' },
      vg: { mel: 1, acc: 0.55, bass: 0.75, cnt: 0.45 },
      reverb: 0.5, level: 0.38, rubato: { amp: 0.03, ritard: 0.09 }, orn: { kind: 'turn', prob: 0.06 },
    }))],

  'descubre-realismo': [entry('vals', 'Tema en vals de domingo',
    'Acordeón y guitarra, 3/4, el tema de la portada en re menor', 'popular, sencillo, melancólico',
    themePiece(MOLDS.MINOR_3, { shift: -7, flats: true }, {
      title: 'Tema en vals de domingo', key: 'Re menor', bpm: 108, style: 'waltz',
      voices: { mel: 'accordion', acc: 'guitar', bass: 'guitar', cnt: 'cello' },
      vg: { mel: 0.85, acc: 0.6, bass: 0.8, cnt: 0.5 },
      reverb: 0.3, level: 0.81, rubato: { amp: 0.015, ritard: 0.06 }, orn: { kind: 'grace', prob: 0.05 },
    }))],

  'descubre-impresionismo': [entry('acuarela', 'Tema en acuarela',
    'Flauta, arpa y cuerdas, 4/4, el tema de la portada con novenas en mi mayor', 'luminoso, líquido, suave',
    themePiece(MOLDS.MAJOR_4, { shift: -8, color: NINTHS }, {
      title: 'Tema en acuarela', key: 'Mi mayor (acordes de 9.ª)', bpm: 58, style: 'wash',
      voices: { mel: 'flute', acc: 'harp', bass: 'harp', cnt: 'strings' },
      vg: { mel: 0.85, acc: 0.75, bass: 0.85, cnt: 0.55 },
      reverb: 0.62, level: 0.6, rubato: { amp: 0.03, ritard: 0.08 }, orn: { kind: 'grace', prob: 0.06 },
    }))],

  'descubre-postimpresionismo': [entry('tresillo', 'Tema en tresillo',
    'Clarinete, guitarra y pizzicato, 4/4, el tema de la portada en re mayor', 'soleado, vivo, cálido',
    themePiece(MOLDS.MAJOR_4, { shift: -10 }, {
      title: 'Tema en tresillo', key: 'Re mayor', bpm: 96, style: 'tresillo',
      voices: { mel: 'clarinet', acc: 'guitar', bass: 'pizz', cnt: 'viola' },
      vg: { mel: 0.9, acc: 0.6, bass: 0.8, cnt: 0.5 },
      reverb: 0.3, level: 0.66, rubato: { amp: 0.01, ritard: 0.05 }, orn: { kind: 'grace', prob: 0.06 },
    }))],

  'descubre-simbolismo-modernismo': [entry('cristal', 'Tema en vals de cristal',
    'Vibráfono, arpa y cuerdas, 3/4, el tema de la portada en mi bemol mayor', 'etéreo, soñador, frágil',
    themePiece(MOLDS.MAJOR_3, { shift: -4, flats: true, color: ADD9 }, {
      title: 'Tema en vals de cristal', key: 'Mi bemol mayor (con novenas)', bpm: 84, style: 'pluckwaltz',
      voices: { mel: 'vibraphone', acc: 'harp', bass: 'harp', pad: 'strings', cnt: 'strings' },
      vg: { mel: 0.9, acc: 0.7, bass: 0.8, pad: 0.4, cnt: 0.5 },
      reverb: 0.58, level: 0.88, rubato: { amp: 0.025, ritard: 0.08 }, orn: { kind: 'grace', prob: 0.05 },
    }))],
};
