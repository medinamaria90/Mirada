// Rango general (docs/propuesta-pintores.md §5): XP + niveles «a fondo». Sin XP no se sube aunque se hagan
// niveles, y sin niveles el XP no basta, así que repasar sin más no sube. Nunca se baja (progress.rank
// guarda el más alto alcanzado). Puro.
//
// Unidad «a fondo»: un nivel de etapa dominado (2..n) de cualquier pintor, o un pintor de una rama
// dominado (cuenta como un «a fondo»: las ramas «Descubre…», de escuela, gótica y de estampa japonesa).

import { deepStatus } from './levels.js';

// need: grand = grandes maestros «hasta el nivel k» (básico + «a fondo» 2..k); complete = grandes
// maestros con todos sus niveles; eras = épocas con algún «a fondo»; deep = unidades «a fondo» en total.
export const RANKS = [
  { name: 'Curioso', xp: 0 },
  { name: 'Aficionado', xp: 300 },
  { name: 'Copista', xp: 1200, deep: 1 },
  { name: 'Oficial de taller', xp: 3000, deep: 4, grand: { count: 1, upTo: 2 } },
  { name: 'Conocedor', xp: 6000, eras: 3, grand: { count: 3, upTo: 2 } },
  { name: 'Conservador', xp: 10000, deep: 15, grand: { count: 3, upTo: 3 } },
  { name: 'Comisario', xp: 16000, deep: 30, eras: 9, complete: 1 },
  { name: 'Gran maestro', xp: 25000, deep: 60, complete: 5 },
];

const isStageArtist = (a) => a.category === 'gran-maestro' || a.category === 'maestro';

// Cifras del progreso que miden los rangos.
export function rankStats(progress, index) {
  let deep = 0;
  const eras = new Set();
  const grand = []; // por gran maestro: niveles «a fondo» seguidos desde el 2 que lleva dominados (null: sin dominar el básico)
  let complete = 0;
  for (const a of index.artists) {
    const mastered = Boolean(progress.artists?.[a.id]?.mastered);
    const levels = index.deepLevels(a.id);
    const done = levels.filter((l) => deepStatus(progress, index, a.id, l.id) === 'mastered');
    let units = done.length;
    if (!isStageArtist(a) && mastered) units += 1; // pintor de rama dominado
    if (units) { deep += units; eras.add(a.movementId); }
    if (a.category === 'gran-maestro') {
      let run = 0;
      for (const l of levels) { if (deepStatus(progress, index, a.id, l.id) !== 'mastered') break; run = l.id; }
      grand.push(mastered ? run || 1 : 0);
      if (mastered && done.length === levels.length) complete += 1;
    }
  }
  return { xp: Math.max(0, Number(progress.xp) || 0), deep, eras: eras.size, grand, complete };
}

function missing(rank, stats) {
  const out = [];
  const need = (key, have, want) => { if (have < want) out.push({ key, have, need: want }); };
  need('xp', stats.xp, rank.xp);
  if (rank.deep) need('deep', stats.deep, rank.deep);
  if (rank.eras) need('eras', stats.eras, rank.eras);
  if (rank.complete) need('complete', stats.complete, rank.complete);
  if (rank.grand) need('grand', stats.grand.filter((v) => v >= rank.grand.upTo).length, rank.grand.count);
  return out;
}

// { index, name, next, missing } con lo que falta para el siguiente (lista de { key, have, need }).
// `index` nunca baja del rango ya guardado en progress.rank.
export function rankFor(progress, index) {
  const stats = rankStats(progress, index);
  let reached = 0;
  RANKS.forEach((r, i) => { if (!missing(r, stats).length) reached = i; });
  const stored = Math.min(RANKS.length - 1, Math.max(0, Number(progress.rank) || 0));
  const i = Math.max(reached, stored);
  const next = RANKS[i + 1] || null;
  return { index: i, name: RANKS[i].name, next, missing: next ? missing(next, stats) : [], stats };
}
