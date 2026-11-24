// Hoja modal del perfil (<dialog>): Esc y tocar fuera la cierran, el foco no sale de ella y, al
// cerrar, vuelve al botón que la abrió.

export function bindSheet(dialog) {
  let opener = null;
  const close = () => {
    if (!dialog.open) return;
    try { dialog.close(); } catch { dialog.removeAttribute('open'); }
  };
  dialog.addEventListener('close', () => {
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    opener = null;
  });
  dialog.addEventListener('click', (ev) => { if (ev.target === dialog) close(); });
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
