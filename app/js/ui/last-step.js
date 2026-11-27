// El último siguiente paso recomendado (engine/next-step.js), guardado mientras dura la visita (sessionStorage): lo que
// queda atrás se recomienda de vez en cuando, nunca dos veces seguidas, y el resultado y el mapa dicen lo mismo. Si el
// navegador no deja guardar, se queda en memoria.

const KEY = 'sfumato.lastStep';
let memory = null;

export function lastStep() {
  try {
    return window.sessionStorage.getItem(KEY) || memory;
  } catch {
    return memory;
  }
}

export function rememberStep(kind) {
  memory = kind || null;
  try {
    if (memory) window.sessionStorage.setItem(KEY, memory);
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // Sin almacenamiento: basta la memoria.
  }
}
