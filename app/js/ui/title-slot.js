// Título del cuadro bajo la imagen: el hueco se reserva desde el principio (nada salta) pero va
// vacío y oculto hasta responder, porque el título delata autor, época o movimiento («Madonna»).
// Tras responder se rellena con una aparición suave. En «¿Cuál es de X?» no hay hueco.

export const titleSlotHtml = () => '<p class="q-title" data-title-slot aria-hidden="true"></p>';

export function revealTitle(root, title) {
  const slot = root.querySelector('[data-title-slot]');
  if (!slot || !title) return;
  slot.textContent = title;
  slot.removeAttribute('aria-hidden');
  // Un fotograma después, para que la transición de opacidad parta de 0.
  requestAnimationFrame(() => slot.classList.add('is-on'));
}
