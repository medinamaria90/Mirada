// Nombre legible de una pieza para el modo «afinar música»: título, autor (solo los clásicos) y la
// clave de la lista en la que suena (época o rama). Función pura, sin Web Audio.
import { piecesOf, splitKey } from './variants.js';

/** Apellido o nombre corto del autor de cada clásico (la fuente completa va en `source`). */
const AUTHORS = {
  'renaissance/vacas': 'Narváez', 'renaissance/greensleeves': 'Anónimo', 'baroque/minueto': 'Petzold',
  'baroque/canon': 'Pachelbel', 'rococo/mozart': 'Mozart', 'romantic/himno': 'Beethoven', 'romantic/elisa': 'Beethoven',
  'realism/grieg': 'Grieg', 'impressionism/satie': 'Satie', 'escuela-rusa/korobeiniki': 'Popular rusa',
  'escuela-rusa/cisnes': 'Chaikovski', 'ukiyo-e/sakura': 'Tradicional japonesa',
};

/** Autor sacado de la fuente («…, Luis de Narváez (1538)» → «Luis de Narváez») si no está en AUTHORS. */
const authorFromSource = (source) => source.split(',').pop().replace(/\(.*\)/, '').trim();

/** { id, title, author, key } de una clave de pieza que suena en la lista `list`; null si no existe. */
export function pieceInfo(id, list) {
  const { era, variant } = splitKey(id);
  const entry = piecesOf(era).find((v) => v.id === variant);
  if (!entry) return null;
  const author = entry.source ? AUTHORS[id] || authorFromSource(entry.source) : '';
  return { id, title: entry.name, author, key: list || era };
}
