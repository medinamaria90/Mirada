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

// Montaje común de la hoja: pulsar fuera o Esc la cierra, y cambiar de pantalla (el botón «atrás» del móvil) también,
// sin devolver el foco a un botón que ya no está. Devuelve la función de cierre.
export function mountSheet(dlg, { slot, handle, opener, closeSelector }) {
  let closed = false;
  const close = ({ silent = false } = {}) => {
    if (closed) return;
    closed = true;
    slot.release(handle);
    window.removeEventListener('hashchange', onHash);
    if (dlg.open) dlg.close();
    dlg.remove();
    if (!silent && opener && opener.isConnected) opener.focus({ preventScroll: true });
  };
  const onHash = () => close({ silent: true });
  handle.close = close;
  slot.take(handle);
  dlg.addEventListener('click', (ev) => {
    if (ev.target === dlg || ev.target.closest(closeSelector)) close();
  });
  dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); close(); });
  window.addEventListener('hashchange', onHash);
  try { dlg.showModal(); } catch { dlg.setAttribute('open', ''); }
  return close;
}
