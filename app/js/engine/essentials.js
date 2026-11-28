// Niveles «a fondo» imprescindibles (decisión de María, 28/11): las obras capitales que nadie debería saltarse
// (contenido/imprescindibles.json → index.essentials). Obligatoriedad suave:
//   · cruzar a la época siguiente exige los imprescindibles de ESA época (progress.js isStepUnlocked);
//   · el final del camino («Camino completo», «Museo completo») exige todos;
//   · quien ya cruzó una puerta no queda bloqueado hacia atrás (eraCrossed): lo que le falte solo se le ofrece antes;
//   · los demás niveles y las ramas nunca bloquean.
// Son los primeros «a fondo» de su pintor (los niveles van por importancia): se abren en orden, sin atajos.
// Puro y sin depender de progress.js (que lo usa para las puertas).

import { deepStatus } from './levels.js';

const isPlayed = (rec) => (Number(rec?.plays) || 0) > 0;

export const essentialKey = (e) => `${e.artistId}:${e.level}`;

export function isEssentialDone(progress, e) {
  return Boolean(progress.deep?.[essentialKey(e)]?.mastered);
}

// Imprescindibles de una época, de más a menos peso (a igual peso, en el orden del archivo).
export function essentialsOf(index, movementId) {
  return (index.essentials || []).filter((e) => e.movementId === movementId)
    .map((e, i) => ({ e, i })).sort((a, b) => b.e.weight - a.e.weight || a.i - b.i).map(({ e }) => e);
}

export function missingEssentials(progress, index, movementId) {
  return essentialsOf(index, movementId).filter((e) => !isEssentialDone(progress, e));
}

// Todos los que faltan, en orden del camino (épocas) y de peso.
export function allMissingEssentials(progress, index) {
  return index.visibleMovements.flatMap((m) => missingEssentials(progress, index, m.id));
}

// Época de una parada del camino.
export function stepEra(index, step) {
  if (!step) return null;
  return step.type === 'sala' ? step.id : index.artist(step.id)?.movementId || null;
}

// ¿Ya entró en esta época? (vio su presentación o jugó alguna de sus paradas). Lo abierto no se cierra.
export function eraCrossed(progress, index, movementId) {
  if (progress.intros?.[movementId]) return true;
  return index.stepsOf(movementId).some((s) => isPlayed(s.type === 'sala' ? progress.salas?.[s.id] : progress.artists?.[s.id]));
}

// Lo que cierra la puerta de `step` (la primera parada de una época) además de la parada anterior: los imprescindibles
// que faltan de la época de `gate` (la parada que la abre). [] si no es una puerta de época, si ya la cruzó o si no falta nada.
export function gateEssentials(progress, index, step, gate) {
  const from = stepEra(index, gate);
  const to = stepEra(index, step);
  if (!from || !to || from === to || eraCrossed(progress, index, to)) return [];
  return missingEssentials(progress, index, from);
}

// ¿Se puede jugar ya su nivel? (si no, primero el nivel 1 de su pintor y, si es su nivel 3 o 4, los imprescindibles de antes).
export const essentialOpen = (progress, index, e) => deepStatus(progress, index, e.artistId, e.level) !== 'locked';

// Botón de la guía, en positivo como el resto de pasos: «Sigue: Leonardo» (nivel 1) o «Sigue: Goya · nivel 2».
// Si con el nivel no cabe en una línea (STEP_LABEL_MAX), solo «Sigue: Goya».
export const STEP_LABEL_MAX = 38;
export const essentialStepLabel = (index, e) => {
  const a = index.artist(e.artistId);
  const name = `Sigue: ${a.short || a.name}`;
  const full = e.level > 1 ? `${name} · nivel ${e.level}` : name;
  return full.length <= STEP_LABEL_MAX ? full : name;
};
// Lo que falta, sin tiempo ni nivel (solo para el candado): «Te falta conocer las pinturas negras de Goya».
export const essentialNeed = (e) => `Te falta conocer ${e.title}`;
// Texto del candado, con el nivel: «Te falta conocer las pinturas negras de Goya (nivel 2)».
export const essentialLock = (e) => `${essentialNeed(e)} (nivel ${e.level})`;
