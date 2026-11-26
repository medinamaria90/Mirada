// Aviso breve que no bloquea (p. ej. «Ese enlace no vale»). Vive fuera de #app para sobrevivir
// al cambio de pantalla. Es una región viva (role="status") que siempre está en el árbol de
// accesibilidad: el texto se pone un instante después de mostrarla para que se anuncie.
// Si la página se recarga justo después (el enlace roto ya se ha cambiado por #inicio), el aviso
// se repite al arrancar (sessionStorage, unos segundos).
// Al cambiar de pantalla el aviso se cierra (no tapa la cabecera de la siguiente), salvo el que explica una redirección
// ({ carry: true }): ese aguanta un cambio de ruta, el de la propia redirección.

const KEY = 'mirada.toast';
const REPLAY_MS = 5000;
let timer = null;
let textTimer = null;
let carry = 0;
const HIDE_MS = 300;

function session() {
  try {
    return window.sessionStorage || null;
  } catch {
    return null;
  }
}

function show(el, text, ms, keep) {
  carry = keep ? 1 : 0;
  clearTimeout(timer);
  clearTimeout(textTimer);
  el.textContent = '';
  el.classList.remove('is-on');
  void el.offsetWidth;
  el.classList.add('is-on');
  textTimer = setTimeout(() => { el.textContent = text; }, 60);
  timer = setTimeout(() => hide(el), ms);
}

function hide(el) {
  clearTimeout(timer);
  clearTimeout(textTimer);
  el.classList.remove('is-on');
  timer = setTimeout(() => { el.textContent = ''; }, HIDE_MS);
}

const TOAST_MS = 4000;

export function toast(text, { carry: keep = false, ms = TOAST_MS } = {}) {
  const el = document.getElementById('toast');
  if (!el) return;
  show(el, text, ms, keep);
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
      if (el) show(el, saved.text, TOAST_MS, true);
    }
  } catch { /* nada */ }
}

// La app ha cambiado de ruta: se cierra el aviso, salvo el que acompaña a una redirección (una sola vez).
export function routeChanged() {
  if (carry > 0) { carry -= 1; return; }
  const el = document.getElementById('toast');
  if (el && el.classList.contains('is-on')) hide(el);
}
