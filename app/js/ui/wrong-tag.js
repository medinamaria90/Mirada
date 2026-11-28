// Lo elegido por error tras un fallo de autor, marcado en su propia opción y no en una línea aparte:
// en «¿Cuál es de X?», la miniatura elegida recibe una etiqueta con el nombre de su pintor, que cae
// con un pequeño rebote mientras el marco tiembla (css: .option-tag, .is-tagged; con «reducir
// animaciones», solo un fundido). El lector de pantalla lo oye con chosenSpeech().
import { esc, $ } from './dom.js';

// Frase para el lector de pantalla: «Elegiste un cuadro de Greuze.» / «Elegiste a Greuze.»
export function chosenSpeech({ name, artworkId }) {
  return artworkId ? `Elegiste un cuadro de ${name}.` : `Elegiste a ${name}.`;
}

// Pone la etiqueta del pintor en la miniatura elegida por error (`button`, o la marcada como
// fallo dentro de `scope`). Una sola vez por opción.
export function tagWrongArt(scope, name, button = $('.option-art.is-wrong', scope)) {
  if (!button || !name || $('.option-tag', button)) return;
  ($('.marco', button) || button).insertAdjacentHTML('beforeend', `<span class="option-tag" aria-hidden="true">${esc(name)}</span>`);
  button.classList.add('is-tagged');
  button.setAttribute('aria-label', `${button.getAttribute('aria-label')}, de ${name}`);
}
