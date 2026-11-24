// Aviso breve que no bloquea (p. ej. «Ese enlace no vale»). Vive fuera de #app para sobrevivir
// al cambio de pantalla. Es una región viva (role="status") que siempre está en el árbol de
// accesibilidad: el texto se pone un instante después de mostrarla para que se anuncie.
// Si la página se recarga justo después (el enlace roto ya se ha cambiado por #inicio), el aviso
// se repite al arrancar (sessionStorage, unos segundos).

const KEY = 'mirada.toast';
const REPLAY_MS = 5000;
let timer = null;
let textTimer = null;

function session() {
  try {
    return window.sessionStorage || null;
  } catch {
    return null;
  }
}

function show(el, text, ms) {
  clearTimeout(timer);
  clearTimeout(textTimer);
  el.textContent = '';
  el.classList.remove('is-on');
  void el.offsetWidth;
  el.classList.add('is-on');
  textTimer = setTimeout(() => { el.textContent = text; }, 60);
  timer = setTimeout(() => {
    el.classList.remove('is-on');
    timer = setTimeout(() => { el.textContent = ''; }, 300);
  }, ms);
}

export function toast(text, ms = 4000) {
  const el = document.getElementById('toast');
  if (!el) return;
  show(el, text, ms);
  try { session()?.setItem(KEY, JSON.stringify({ text, at: Date.now() })); } catch { /* sin almacenamiento */ }
}

// Al arrancar: repite un aviso de hace un momento (si lo hay) y lo olvida.
export function replayToast() {
  const s = session();
  if (!s) return;
  try {
    const saved = JSON.parse(s.getItem(KEY) || 'null');
    s.removeItem(KEY);
    if (saved && typeof saved.text === 'string' && Date.now() - saved.at < REPLAY_MS && saved.text.length < 80) {
      const el = document.getElementById('toast');
      if (el) show(el, saved.text, 4000);
    }
  } catch { /* nada */ }
}
