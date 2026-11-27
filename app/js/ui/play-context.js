// Contexto de juego: el pintor desde cuya tarjeta del mapa se entra a jugar (ui/level-card.js). Al terminar, el siguiente
// paso es sobre ese pintor (engine/next-step.js artistStep) y no el global. En memoria; se consume al empezar la ronda.

let artist = '';

export function setPlayContext(artistId) {
  artist = artistId || '';
}

// ¿Se entró desde la tarjeta de este pintor? Lo consume.
export function takePlayContext(artistId) {
  const hit = Boolean(artist) && artist === artistId;
  artist = '';
  return hit;
}
