// Textos cortos de la pantalla de resultado que dependen del pintor y del nivel. Puro, sin DOM.
// El nombre de una etapa («Savonarola», «Maestà») es una etiqueta interna del aro de niveles: sin su pintor ni su número no
// dice nada a quien no lo conoce, así que aquí se habla de «<pintor> · Nivel N».

const nameOf = (artist) => artist.short || artist.name;

// «Botticelli · Nivel 2»; con `done`, «Botticelli · Nivel 2 superado».
export function levelLabel(artist, level, done = false) {
  return `${nameOf(artist)} · Nivel ${level}${done ? ' superado' : ''}`;
}

// Frase de los cuadros que faltan por ver. Solo promete «una ronda más» si el botón principal lleva a esa misma ronda;
// si propone otra cosa (otro pintor), se queda en el hecho.
export function missingLine(missing, sameRound) {
  const base = missing === 1 ? 'Te falta 1 cuadro suyo por ver' : `Te faltan ${missing} cuadros suyos por ver`;
  return sameRound ? `${base}: una ronda más` : base;
}

// La ficha de un pintor: su ruta y la etiqueta accesible de lo que abre.
export const fichaRoute = (artist) => `pintor-${artist.id}`;
export const fichaLabel = (artist) => `Ver la ficha de ${nameOf(artist)}`;
