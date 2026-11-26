// Hoja modal del perfil (<dialog>): se cierra con Esc, tocando fuera o con su botón, con una animación
// corta de salida; el foco entra en ella al abrir (con un solo control, Tab puede salir al navegador) y, al
// cerrar, vuelve al botón que la abrió.

import { prefersReducedMotion } from '../dom.js';

const CLOSE_MS = 180; // lo que dura .is-closing en profile.css
const KB_VAR = '--kb-inset'; // hueco que ocupa el teclado bajo la hoja (profile.css)
const KB_MIN_PX = 80; // por debajo, no es un teclado (barras del navegador)

// Respaldo para navegadores que no reducen la ventana con el teclado: sube la hoja lo que lo tapa y deja
// a la vista sus botones. Con `interactive-widget=resizes-content` el hueco es 0 y no hace nada.
function keepAboveKeyboard(dialog) {
  const vv = window.visualViewport;
  if (!vv) return () => {};
  const update = () => {
    const gap = Math.round(window.innerHeight - vv.height - vv.offsetTop);
    const inset = gap > KB_MIN_PX ? gap : 0;
    dialog.style.setProperty(KB_VAR, `${inset}px`);
    if (inset) dialog.querySelector('.sheet-actions')?.scrollIntoView({ block: 'nearest' });
  };
  vv.addEventListener('resize', update);
  vv.addEventListener('scroll', update);
  update();
  return () => {
    vv.removeEventListener('resize', update);
    vv.removeEventListener('scroll', update);
    dialog.style.removeProperty(KB_VAR);
  };
}

export function bindSheet(dialog) {
  let opener = null;
  let closing = false;
  let stopKeyboard = () => {};
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
    stopKeyboard();
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
      stopKeyboard();
      stopKeyboard = keepAboveKeyboard(dialog);
      const target = focusSel ? dialog.querySelector(focusSel) : null;
      if (target) target.focus();
    },
    close,
  };
}
