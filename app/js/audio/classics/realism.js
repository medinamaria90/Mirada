// Clásico del Realismo: arreglo propio de una obra de dominio público para el sintetizador.
import { scalePcs } from '../theory.js';
import { FORM4 } from '../scores.js';
import { ARRANGEMENT } from './arrangement.js';

// El tema de Grieg en cuatro compases: sube por la escala, se tuerce con un cromatismo y vuelve.
const THEME = ['*.5 B4 C#5 D5 E5 F#5 D5 F#5/1', '*.5 F5 C#5 F5/1 E5 C5 E5/1', '*.5 B4 C#5 D5 E5 F#5 D5 F#5 B5',
  '*.5 A5 F#5 D5 F#5 A5/2'];
const up = (bar) => bar.replace(/([A-G][#b]?)(\d)/g, (_, n, o) => `${n}${Number(o) + 1}`);
const THEME_CHORDS = ['Bm', 'C#7:2|C:2', 'Bm', 'D'];

export const REALISM_CLASSICS = [
  {
    id: 'grieg',
    name: 'En la gruta del rey de la montaña',
    label: 'Clarinete, cello y piano, 4/4, tema que vuelve y crece',
    character: 'misterioso, travieso, creciente',
    source: '«En la gruta del rey de la montaña», «Peer Gynt», Edvard Grieg (1875)',
    arrangement: ARRANGEMENT,
    piece: {
      title: 'En la gruta del rey de la montaña', key: 'Si menor', tonic: 11, mode: 'minor',
      scale: scalePcs(11, 'minor', [10]), bpm: 112, beatsPerBar: 4, form: FORM4, style: 'polka', art: 0.7,
      voices: { mel: 'clarinet', acc: 'piano', bass: 'cello' }, vg: { mel: 0.9, acc: 0.6, bass: 0.8 },
      reverb: 0.3, level: 0.49, rubato: { amp: 0, ritard: 0.04 }, orn: null,
      dyn: { A: 0.92, open: 0.96, close: 1, B: 1.1 },
      sections: {
        A: { chords: [...THEME_CHORDS, ...THEME_CHORDS.slice(0, 2)], mel: [...THEME, ...THEME.slice(0, 2)] },
        open: { chords: THEME_CHORDS.slice(2), mel: THEME.slice(2) },
        close: { chords: ['Bm', 'F#:2|Bm:2'], mel: [THEME[2], '*.5 F#5 C#5 A#4 C#5 B4/2'] },
        B: {
          chords: [...THEME_CHORDS, ...THEME_CHORDS],
          mel: [...THEME.map(up), ...THEME.slice(0, 3).map(up), '*.5 A6 F#6 D6 F#6 A5/2'],
        },
      },
    },
  },
];
