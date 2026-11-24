// Hoja modal del perfil (<dialog>): se cierra con Esc, tocando fuera o con su botón, con una animación
// corta de salida; el foco no sale de ella y, al cerrar, vuelve al botón que la abrió.

import { prefersReducedMotion } from '../dom.js';

const CLOSE_MS = 180; // lo que dura .is-closing en profile.css

export function bindSheet(dialog) {
  let opener = null;
  let closing = false;
  const finish = () => {
    closing = false;
    dialog.classList.remove('is-closing');
    try { dialog.close(); } catch { dialog.removeAttribute('open'); }
  };
  const close = () => {
    if (!dialog.open || closing) return;
    if (prefersReducedMotion()) { finish(); return; }
    closing = true;
    dialog.classList.add('is-closing');
    setTimeout(finish, CLOSE_MS);
  };
  dialog.addEventListener('close', () => {
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    opener = null;
  });
  // Esc: la animación de salida también.
  dialog.addEventListener('cancel', (ev) => { ev.preventDefault(); close(); });
  dialog.addEventListener('click', (ev) => { if (ev.target === dialog || ev.target.closest('[data-action="close-sheet"]')) close(); });
  return {
    // focusSel: elemento de la hoja que recibe el foco al abrir.
    open(from, focusSel) {
      opener = from || null;
      try { dialog.showModal(); } catch { dialog.setAttribute('open', ''); }
      const target = focusSel ? dialog.querySelector(focusSel) : null;
      if (target) target.focus();
    },
    close,
  };
}
