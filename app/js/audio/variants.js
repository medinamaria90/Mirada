// Registro de variantes musicales por época. La variante `base` es la partitura original de
// scores.js y sigue siendo la que suena por defecto; las demás viven en variants/<era>.js.
//
// Cada variante: { id, name, label, character, piece } (los clásicos añaden source y arrangement)
//   id        clave corta y estable (se guarda en preferencias)
//   label     una línea: instrumentos, compás y motivo («Laúd y flauta, 6/8, motivo ascendente»)
//   character tres palabras sobre su carácter
//   piece     partitura con el mismo formato que scores.js
// Clave de pieza: `era` (base) o `era/id`; compilePiece y createMusicPlayer trabajan con esa clave.
import { SCORES, ERAS } from './scores.js';
import { MENU } from './variants/menu.js';
import { RENAISSANCE } from './variants/renaissance.js';
import { BAROQUE } from './variants/baroque.js';
import { ROCOCO } from './variants/rococo.js';
import { ROMANTIC } from './variants/romantic.js';
import { REALISM } from './variants/realism.js';
import { IMPRESSIONISM } from './variants/impressionism.js';
import { POSTIMPRESSIONISM } from './variants/postimpressionism.js';
import { MODERN } from './variants/modern.js';
import { CLASSICS, BRANCH_CLASSICS } from './classics.js';

export const DEFAULT_VARIANT = 'base';
const SEP = '/';

const EXTRA = {
  menu: MENU, renaissance: RENAISSANCE, baroque: BAROQUE, rococo: ROCOCO, romantic: ROMANTIC,
  realism: REALISM, impressionism: IMPRESSIONISM, postimpressionism: POSTIMPRESSIONISM, modern: MODERN,
};

/** Descripción de las piezas originales (las que suenan hoy). */
const BASE_META = {
  menu: { label: 'Piano de fieltro y cuerdas, 4/4, acordes mayores', character: 'cálido, amable, quieto' },
  renaissance: { label: 'Laúd solo, 4/4, pavana en re dórico', character: 'sereno, antiguo, cortesano' },
  baroque: { label: 'Clave solo, 4/4, corcheas sin pausa', character: 'ágil, ordenado, incansable' },
  rococo: { label: 'Caja de música y clave, 3/4, minué', character: 'ligero, dulce, decorativo' },
  neoclassic: { label: 'Fortepiano, 4/4, bajo de Alberti', character: 'claro, simétrico, sobrio' },
  romantic: { label: 'Piano solo, 3/4, arpegios con pedal', character: 'íntimo, lento, soñador' },
  realism: { label: 'Piano y cello, 4/4, canción grave', character: 'sobrio, popular, melancólico' },
  impressionism: { label: 'Piano con pedal, 4/4, acordes de 9.ª', character: 'brumoso, suspendido, suave' },
  postimpressionism: { label: 'Piano, 4/4, síncopa mixolidia', character: 'vivo, soleado, rítmico' },
  modern: { label: 'Campanas, 5/4, acordes por cuartas', character: 'etéreo, extraño, flotante' },
};

/** Lista de variantes de una era (la original, las compuestas y los clásicos). Vacía si la era no existe. */
export function variantsOf(era) {
  const base = SCORES[era];
  if (!base) return [];
  const meta = BASE_META[era] || { label: '', character: '' };
  return [{ id: DEFAULT_VARIANT, name: base.title, label: meta.label, character: meta.character, piece: base },
    ...(EXTRA[era] || []), ...(CLASSICS[era] || [])];
}

/** Ramas temáticas con piezas propias (claves de lista que no son épocas). */
export const BRANCHES = Object.keys(BRANCH_CLASSICS);

/** Piezas de una lista: las variantes de una era o las piezas propias de una rama. */
export const piecesOf = (list) => (SCORES[list] ? variantsOf(list) : BRANCH_CLASSICS[list] || []);

/** Clave de pieza a partir de era y variante. */
export const pieceKey = (era, variant = DEFAULT_VARIANT) =>
  (!variant || variant === DEFAULT_VARIANT ? era : `${era}${SEP}${variant}`);

/** `era/variante` -> { era, variant } (variante `base` si no se indica). */
export function splitKey(key) {
  const [era, variant = DEFAULT_VARIANT] = String(key).split(SEP);
  return { era, variant };
}

/** Partitura de una clave de pieza, o null si no existe. */
export function getPiece(key) {
  const { era, variant } = splitKey(key);
  return piecesOf(era).find((v) => v.id === variant)?.piece ?? null;
}

/** Todas las claves de pieza (base y variantes de todas las eras, y piezas de las ramas). */
export function allPieceKeys() {
  return [...ERAS, ...BRANCHES].flatMap((list) => piecesOf(list).map((v) => pieceKey(list, v.id)));
}
