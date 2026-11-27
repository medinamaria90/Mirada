// Acciones del mapa del camino (portada y ramas): paradas, carteles, desvíos y el aviso de lo que falta en lo cerrado.

import { $, announce, prefersReducedMotion } from '../dom.js';
import { icons } from '../icons.js';
import { branchRoute } from '../router.js';
import { zoomInto } from '../map-zoom.js';

// La hoja del mapa (época cerrada, cómo se juega) se carga al primer toque: no cuenta en el arranque.
const sheet = (ctx, fn, b) => {
  ctx.audio.sfx('tap');
  import('../map-sheet.js').then((m) => m[fn](ctx, b.dataset.id, b)).catch((err) => console.error(err));
};

// La tarjeta del nodo de un pintor con niveles se carga al primer toque. branchId: rama desde la que se abre.
export const levelCard = (ctx, b, branchId = '') => {
  ctx.audio.sfx('tap');
  import('../level-card.js').then((m) => m.openLevelCard(ctx, b, branchId)).catch((err) => console.error(err));
};

// Acciones de las paradas, para onAction en la portada.
export function pathActions(ctx) {
  const guarded = (route) => (b) => {
    ctx.audio.sfx('tap');
    if (b.dataset.status === 'locked') return showLockNote(b);
    return ctx.go(`${route}-${b.dataset.id}`);
  };
  return {
    // Dominado con niveles (aro): su tarjeta, con sus historias y «Jugar».
    stage: (b, ev) => (b.dataset.card ? levelCard(ctx, b) : guarded('etapa')(b, ev)),
    sala: guarded('sala'),
    review: guarded('repaso'),
    intro: (b) => {
      ctx.audio.sfx('tap');
      ctx.go(`movimiento-${b.dataset.id}`);
    },
    gallery: (b) => {
      ctx.audio.sfx('tap');
      ctx.go(`galeria-${b.dataset.id}`);
    },
    'era-lock': (b) => sheet(ctx, 'openEraSheet', b),
    start: (b) => sheet(ctx, 'openIntroSheet', b),
    'goto-current': (_, ev) => {
      ev.preventDefault();
      const target = $('.stage-spot.is-current .stage') || $('.stage.is-available, .stage.is-started');
      if (!target) return;
      target.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'instant' : 'smooth' });
      target.focus({ preventScroll: true });
    },
    // Cartel de un tramo o de una rama: sus tarjetas (sign-cards.js, cargado al primer toque).
    cartel: (b) => {
      ctx.audio.sfx('tap');
      import('../sign-cards.js').then((m) => m.openSignCards(ctx, b.dataset.kind, b.dataset.id, b)).catch((err) => console.error(err));
    },
    // Rama abierta: se entra en su pantalla con un acercamiento; cerrada, una nota con lo que falta.
    branch: (b) => {
      ctx.audio.sfx('tap');
      if (b.dataset.status === 'locked') return showLockNote(b);
      return zoomInto(b, () => ctx.go(branchRoute(b.dataset.id)));
    },
  };
}

// Aviso de lo cerrado: al tocar un candado, la parada tiembla como un cofre cerrado (y el móvil vibra un instante, si
// puede) y sale UN globo pequeño con lo que falta y su cruz. Nunca hay dos: el nuevo sustituye al anterior. Se cierra
// con la cruz, al tocar fuera, al desplazar el mapa, con Esc o al cambiar de pantalla. Sin temporizador.

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
