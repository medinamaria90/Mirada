import { guardGhostTaps } from './tap-guard.js';

// Hueco para un diálogo modal que se abre tras una carga asíncrona (hojas del mapa y del pintor): solo hay uno a la
// vez. Con dos toques seguidos, el último gana y el anterior no llega a abrirse (antes se abrían los dos y el primero
// quedaba huérfano, sin forma de cerrarlo). Cerrar siempre cierra ESE diálogo, sea o no el actual.

export function modalSlot() {
  let current = null;
  let ticket = 0;
  return {
    // Al empezar a abrir: cierra lo que haya y devuelve el turno de esta apertura.
    begin() {
      if (current) current.close();
      return ++ticket;
    },
    // Tras las cargas: si otro toque ha pedido turno después, esta apertura se abandona.
    stale(turn) { return turn !== ticket; },
    take(handle) {
      if (current && current !== handle) current.close();
      current = handle;
    },
    release(handle) { if (current === handle) current = null; },
    close() { if (current) current.close(); },
  };
}

// El segundo toque de un doble toque (o uno impaciente con el móvil ocupado) cae en el fondo de la hoja recién abierta
// o en la copia del nodo y la cerraba sola. Tocar fuera o en el nodo solo cierra pasado este margen desde que se abre;
// los botones de cerrar, siempre.
export const TAP_GRACE_MS = 600;
export function tapAfterOpen(downAt, openedAt) {
  return Number.isFinite(downAt) && downAt - openedAt >= TAP_GRACE_MS;
}

// Montaje común de la hoja: pulsar fuera o Esc la cierra, y cambiar de pantalla (el botón «atrás» del móvil) también,
// sin devolver el foco a un botón que ya no está. onClose({ silent }) se avisa al cerrar (silent: por cambio de pantalla).
// Devuelve la función de cierre.
export function mountSheet(dlg, { slot, handle, opener, closeSelector, onClose = null }) {
  let closed = false;
  const openedAt = performance.now();
  let downAt = -Infinity;
  const close = ({ silent = false } = {}) => {
    if (closed) return;
    closed = true;
    slot.release(handle);
    window.removeEventListener('hashchange', onHash);
    if (dlg.open) dlg.close();
    dlg.remove();
    guardGhostTaps();
    if (!silent && opener && opener.isConnected) opener.focus({ preventScroll: true });
    onClose?.({ silent });
  };
  const onHash = () => close({ silent: true });
  handle.close = close;
  slot.take(handle);
  dlg.addEventListener('pointerdown', (ev) => { downAt = ev.timeStamp; }, { passive: true });
  dlg.addEventListener('click', (ev) => {
    const hit = ev.target === dlg ? dlg : ev.target.closest(closeSelector);
    if (!hit) return;
    // Con teclado (detail 0) no hay toque previo; un botón de cerrar se ha buscado a propósito.
    if (ev.detail === 0 || hit.tagName === 'BUTTON' || tapAfterOpen(downAt, openedAt)) close();
  });
  dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); close(); });
  window.addEventListener('hashchange', onHash);
  try { dlg.showModal(); } catch { dlg.setAttribute('open', ''); }
  return close;
}
