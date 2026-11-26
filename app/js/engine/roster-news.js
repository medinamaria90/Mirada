// Pintores nuevos a la vista (engine/roster.js): los que llevan «Nuevo» y ya se pueden jugar (abiertos o paradas
// extra). Los que quedan más allá del punto al que ha llegado no se anuncian todavía. Puro.

import { playStatus } from './branches.js';
import { isExtraStep } from './progress.js';
import { isFresh, rosterIds } from './roster.js';

export function newInSight(progress, index) {
  return rosterIds(index).filter((id) => isFresh(progress, id)
    && (isExtraStep(progress, { type: 'artist', id }) || !['locked', null].includes(playStatus(progress, index, id))));
}

// Los que aún no se han anunciado en el aviso del mapa.
export function newToTell(progress, index) {
  const told = progress.roster?.told || [];
  return newInSight(progress, index).filter((id) => !told.includes(id));
}
