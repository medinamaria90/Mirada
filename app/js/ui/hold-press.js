// Mantener pulsado un botón un tiempo (ratón, dedo o teclado) antes de que cuente. Soltar antes, salir del botón
// o perder el foco lo cancela. `timers` se inyecta para las pruebas.

export function createHold({ ms, onStart, onCancel, onDone, timers = globalThis }) {
  let timer = null;
  const cancel = () => {
    if (timer === null) return;
    timers.clearTimeout(timer);
    timer = null;
    onCancel();
  };
  const start = () => {
    if (timer !== null) return;
    onStart();
    timer = timers.setTimeout(() => { timer = null; onDone(); }, ms);
  };
  return { start, cancel, active: () => timer !== null };
}

/** Conecta `button` a un `hold`: puntero y teclado (Espacio o Intro). */
export function bindHold(button, hold) {
  button.addEventListener('pointerdown', (ev) => { if (ev.button === 0 || ev.pointerType === 'touch') hold.start(); });
  for (const type of ['pointerup', 'pointerleave', 'pointercancel', 'blur']) button.addEventListener(type, hold.cancel);
  button.addEventListener('keydown', (ev) => {
    if (ev.key !== ' ' && ev.key !== 'Enter') return;
    ev.preventDefault();
    if (!ev.repeat) hold.start();
  });
  button.addEventListener('keyup', hold.cancel);
  button.addEventListener('contextmenu', (ev) => ev.preventDefault());
}
