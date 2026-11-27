// Test de cultura pictórica: salir a medias pide confirmación («¿Dejar el test?»), con la hoja propia de la app
// (index.html, #test-leave; nunca confirm()). Cubre el aspa, Esc y «atrás» (el gesto de Android y el botón del
// navegador): al empezar se mete en el historial una entrada de guarda con la misma URL; si «atrás» la quita a
// mitad de partida, se vuelve a poner y se abre la hoja. Con el resultado en pantalla, «atrás» vuelve a la portada.

const GUARD = { testGuard: true };

// hooks: { phase() → 'playing' | 'done' | null, onLeave(), onBackFromResult(), onOpen(), onStay() }
export function createLeaveGuard(doc, win, hooks) {
  const sheet = doc.getElementById('test-leave');
  const backdrop = doc.getElementById('test-leave-backdrop');
  let guarded = false;
  let skipPop = false;

  const isOpen = () => Boolean(sheet && !sheet.hidden);
  function show(open) {
    if (!sheet) return;
    sheet.hidden = !open;
    if (backdrop) backdrop.hidden = !open;
    if (open) sheet.querySelector('[data-action="leave-stay"]')?.focus();
  }

  function arm() {
    if (guarded) return;
    try {
      win.history.pushState(GUARD, '');
      guarded = true;
    } catch { /* sin historial: el aspa y Esc siguen pidiendo confirmación */ }
  }

  // Quita la entrada de guarda (salir o repetir desde la portada): así «atrás» no se queda en blanco.
  function disarm() {
    show(false);
    if (!guarded) return;
    guarded = false;
    skipPop = true;
    try { win.history.back(); } catch { skipPop = false; }
  }

  function ask() {
    if (hooks.phase() !== 'playing') return false;
    hooks.onOpen?.();
    show(true);
    return true;
  }

  win.addEventListener('popstate', (ev) => {
    if (skipPop) { skipPop = false; return; }
    // De vuelta en la guarda (p. ej. al cerrar el visor, que mete su propia entrada): no es salir.
    if (ev.state && ev.state.testGuard) return;
    if (!guarded) return;
    guarded = false;
    const phase = hooks.phase();
    if (phase === 'playing') {
      arm();
      ask();
    } else if (phase === 'done') {
      hooks.onBackFromResult();
    }
  });

  return {
    arm,
    disarm,
    ask,
    isOpen,
    stay() { hooks.onStay?.(); show(false); },
    leave() { disarm(); hooks.onLeave(); },
    // Esc: abre la hoja a mitad de partida y la cierra si ya está abierta. Devuelve true si la ha usado.
    onEscape() {
      if (isOpen()) { this.stay(); return true; }
      return ask();
    },
  };
}
