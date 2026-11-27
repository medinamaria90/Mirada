// Test de cultura pictórica: «Sala de entrada» en piano de puntillas. Es la misma melodía de la
// portada, nota a nota y en do mayor (sin adornos ni doblar a la octava, para no salirse de su
// escala ni de su registro, sol4–re6); cambian el instrumento (piano solo), el tempo (algo más
// vivo), el toque (un poco picado) y el acompañamiento: bajo y acorde alternos, cortos, de puntillas.
// La armonía se reviste con acordes de la misma tonalidad (la menor, re menor, mi menor y sol con
// séptima) que dan un punto de intriga sin una sola disonancia. Forma A–A′–B–A′ de 32 compases
// (unos 74 s antes de volver a empezar), con la segunda A arropada por una voz grave del mismo piano.
import { scalePcs } from '../theory.js';

const FORM = [['A', 'open'], ['A2', 'close'], ['B'], ['A2', 'close']];

// Melodía de «Sala de entrada» (scores.js, `menu`), sin cambiar una nota ni un ritmo.
const MEL_A = ['E5/1 G5/1 E5/1 D5/1', 'C5/1 E5/1 A5/2', 'A5/1 G5/1 F5/1 E5/1',
  'D5/1 B4/1 G4/2', 'E5/1.5 G5/.5 C6/1 G5/1', 'B5/1 G5/1 E5/2'];
const CHORDS_A = ['C:2|Am7:2', 'Am', 'Dm7', 'G7', 'C:2|Am7:2', 'Em7'];

const A = { chords: CHORDS_A, mel: MEL_A };
// La segunda vez, una voz grave con notas de cada acorde (mano izquierda del mismo piano).
const A2 = { chords: CHORDS_A, mel: MEL_A, cnt: ['C4/2 A3/2', 'A3/2 C4/2', 'D4/2 F4/2', 'F4/2 D4/2', 'C4/2 E4/2', 'E4/2 B3/2'] };

export const TEST_PIECES = {
  test: [{
    id: 'reto',
    name: 'Sala de entrada (piano del reto)',
    label: 'Piano solo, 4/4, el tema de la portada de puntillas',
    character: 'ligero, atento, juguetón',
    piece: {
      title: 'Sala de entrada (piano del reto)', key: 'Do mayor', tonic: 0, mode: 'major',
      scale: scalePcs(0, 'major'), bpm: 104, beatsPerBar: 4, form: FORM, style: 'tiptoe', art: 0.82, octaveB: false,
      voices: { mel: 'piano', acc: 'piano', bass: 'piano', cnt: 'piano' },
      vg: { mel: 0.9, acc: 0.5, bass: 0.62, cnt: 0.42 },
      reverb: 0.34, level: 0.38, rubato: { amp: 0.008, ritard: 0.05 }, orn: null,
      dyn: { A: 1, A2: 1.03, open: 1, close: 0.95, B: 1.06 },
      sections: {
        A,
        A2,
        open: { chords: ['F:2|Dm7:2', 'G'], mel: ['A5/1 C6/1 A5/1 F5/1', 'B4/1 D5/1 G5/2'] },
        close: { chords: ['F:2|G7:2', 'C'], mel: ['A5/1 F5/1 D5/1 B4/1', 'G5/1 E5/1 C5/2'] },
        B: {
          chords: ['Am7', 'Dm7', 'G7', 'Em', 'Dm7', 'C:2|Em:2', 'Dm7:2|G7:2', 'G'],
          mel: ['C5/1 E5/1 G5/1 E5/1', 'F5/1 A5/1 C6/2', 'B5/1 G5/1 D5/2', 'E5/1 G5/1 B5/2',
            'A5/1.5 G5/.5 F5/1 E5/1', 'G5/1 E5/1 B4/2', 'D5/1 F5/1 G5/1 B5/1', 'D6/2 B5/1 G5/1'],
        },
      },
    },
  }],
};
