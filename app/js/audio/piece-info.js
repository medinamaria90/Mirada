// Nombre legible de una pieza para el modo «afinar música»: título, autor (solo los clásicos), la
// clave de la lista en la que suena (época o rama) y su papel en ella. Función pura, sin Web Audio.
import { piecesOf, pieceKey, splitKey } from './variants.js';
import { rotationPool, firstPiece } from './rotation.js';

/** Apellido o nombre corto del autor de cada clásico (la fuente completa va en `source`). */
const AUTHORS = {
  'renaissance/vacas': 'Narváez', 'renaissance/greensleeves': 'Anónimo', 'baroque/minueto': 'Petzold',
  'baroque/canon': 'Pachelbel', 'rococo/mozart': 'Mozart', 'romantic/himno': 'Beethoven', 'romantic/elisa': 'Beethoven',
  'realism/grieg': 'Grieg', 'impressionism/satie': 'Satie', 'escuela-rusa/korobeiniki': 'Popular rusa',
  'escuela-rusa/cisnes': 'Chaikovski', 'ukiyo-e/sakura': 'Tradicional japonesa',
};

/** Autor sacado de la fuente («…, Luis de Narváez (1538)» → «Luis de Narváez») si no está en AUTHORS. */
const authorFromSource = (source) => source.split(',').pop().replace(/\(.*\)/, '').trim();

/**
 * Todas las piezas que puede sonar en una lista, estén o no en su rotación (María las recorre con
 * «Siguiente» para decidir): las de la rotación primero y luego el resto de la época o rama.
 */
export function allPieces(list) {
  const pool = rotationPool(list).map((p) => p.key);
  return [...new Set([...pool, ...piecesOf(list).map((v) => pieceKey(list, v.id))])];
}

/** Papel de una pieza en su lista: la que abre, otra de la rotación o una que hoy no suena sola. */
export function pieceRole(id, list) {
  if (firstPiece(list) === id) return 'principal';
  return rotationPool(list).some((p) => p.key === id) ? 'secundaria' : 'fuera de lista';
}

/** { id, title, author, key, role } de una clave de pieza que suena en la lista `list`; null si no existe. */
export function pieceInfo(id, list) {
  const { era, variant } = splitKey(id);
  const entry = piecesOf(era).find((v) => v.id === variant);
  if (!entry) return null;
  const key = list || era;
  const author = entry.source ? AUTHORS[id] || authorFromSource(entry.source) : '';
  return { id, title: entry.name, author, key, role: pieceRole(id, key) };
}
