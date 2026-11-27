// Aviso de lo cerrado en el mapa (portada y ramas): al tocar un candado, la parada tiembla como un cofre cerrado (y el
// móvil vibra un instante, si puede) y sale UN globo pequeño con lo que falta y su cruz. Nunca hay dos: el nuevo
// sustituye al anterior. Se cierra con la cruz, al tocar fuera, al desplazar el mapa, con Esc o al cambiar de pantalla.
// Sin temporizador: no se va mientras se lee.

import { announce, prefersReducedMotion } from '../dom.js';
import { icons } from '../icons.js';

const SHAKE_MS = 420;       // lo que dura el temblor (como --dur-lock-shake)
const VIBRATE_MS = 14;      // un toque corto, no un zumbido
const SCROLL_CLOSE = 24;    // px que se mueve la parada antes de cerrar el globo
const EDGE = 8;             // aire con el borde de la pantalla

let open = null;

export function closeLockNote() {
  if (!open) return;
  const { note, off } = open;
  open = null;
  off();
  note.classList.remove('is-visible');
}

function shake(button) {
  if (prefersReducedMotion()) return;
  const target = button.querySelector('.stage-dot') || button;
  target.classList.remove('is-shaking');
  void target.offsetWidth; // reinicia la animación si se toca otra vez
  target.classList.add('is-shaking');
  setTimeout(() => target.classList.remove('is-shaking'), SHAKE_MS);
  if (navigator.vibrate) navigator.vibrate(VIBRATE_MS);
}

function noteFor(button) {
  let note = button.parentElement.querySelector('.lock-note');
  if (!note) {
    note = document.createElement('div');
    note.className = 'lock-note';
    note.innerHTML = `<p class="lock-note-text"></p><button type="button" class="lock-note-close" aria-label="Cerrar">${icons.close(16)}</button>`;
    button.after(note);
  }
  return note;
}

export function showLockNote(button) {
  closeLockNote();
  shake(button);
  const note = noteFor(button);
  const text = button.dataset.lock || 'Aún cerrada';
  note.querySelector('.lock-note-text').textContent = text;
  note.style.translate = '';
  note.classList.add('is-visible');
  // Dentro de la pantalla: si asoma por un lado, se corre.
  const r = note.getBoundingClientRect();
  const shift = r.left < EDGE ? EDGE - r.left : r.right > window.innerWidth - EDGE ? window.innerWidth - EDGE - r.right : 0;
  if (shift) note.style.translate = `${Math.round(shift)}px 0`;
  announce(text);
  const top0 = button.getBoundingClientRect().top;
  const onDown = (e) => { if (!note.contains(e.target) && !button.contains(e.target)) closeLockNote(); };
  const onScroll = () => { if (Math.abs(button.getBoundingClientRect().top - top0) > SCROLL_CLOSE) closeLockNote(); };
  const onKey = (e) => { if (e.key === 'Escape') closeLockNote(); };
  const onClose = (e) => { e.stopPropagation(); closeLockNote(); button.focus({ preventScroll: true }); };
  const closer = note.querySelector('.lock-note-close');
  document.addEventListener('pointerdown', onDown, true);
  document.addEventListener('scroll', onScroll, { capture: true, passive: true });
  document.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', closeLockNote);
  closer.addEventListener('click', onClose);
  open = {
    note,
    off: () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('scroll', onScroll, { capture: true });
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('hashchange', closeLockNote);
      closer.removeEventListener('click', onClose);
    },
  };
}
