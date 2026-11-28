// Acciones del mapa del camino (portada y ramas): paradas, carteles, desvíos y el aviso de lo que falta en lo cerrado.

import { $, announce, prefersReducedMotion } from '../dom.js';
import { branchRoute, stageRoute, deepRoute, go } from '../router.js';
import { zoomInto } from '../map-zoom.js';
import { loreBefore } from './path-lore.js';

// La tarjeta del nodo de un pintor con niveles se carga al primer toque. branchId: rama desde la que se abre.
export const levelCard = (ctx, b, branchId = '') => {
  ctx.audio.sfx('tap');
  import('../level-card.js').then((m) => m.openLevelCard(ctx, b, branchId)).catch((err) => console.error(err));
};

// Un pintor abierto cuya época o tramo aún no se han visto: su tarjeta avisa de qué va antes («Empezar · antes, el
// Renacimiento») y su botón lleva a esa secuencia (época, tramo, pintor). Devuelve si ha abierto la tarjeta.
export const loreFirstCard = (ctx, b, branchId = '') => {
  if (b.dataset.status === 'locked') return false;
  const before = loreBefore(ctx.store.get().progress, ctx.index, b.dataset.id);
  if (!before) return false;
  ctx.audio.sfx('tap');
  import('../lore-first-card.js').then((m) => m.openLoreFirstCard(ctx, b, before, branchId)).catch((err) => console.error(err));
  return true;
};

// Donde está «Tú»: el medallón o el rombo si son lo siguiente del camino; si no, la parada actual.
export const HERE = '.lore-spot.is-here .lore, .stage-spot.is-current .stage';

// Acciones de las paradas, para onAction en la portada.
export function pathActions(ctx) {
  const guarded = (route) => (b) => {
    ctx.audio.sfx('tap');
    if (b.dataset.status === 'locked') return showLockNote(b);
    return ctx.go(`${route}-${b.dataset.id}`);
  };
  return {
    // Dominado con niveles (aro): su tarjeta, con sus historias y «Jugar».
    stage: (b, ev) => (b.dataset.card ? levelCard(ctx, b) : loreFirstCard(ctx, b) || guarded('etapa')(b, ev)),
    sala: guarded('sala'),
    review: guarded('repaso'),
    intro: (b) => {
      ctx.audio.sfx('tap');
      ctx.go(`movimiento-${b.dataset.id}`);
    },
    // Medallón o rombo por delante del progreso: el mismo aviso que un pintor cerrado.
    'lore-lock': (b) => {
      ctx.audio.sfx('tap');
      showLockNote(b);
    },
    gallery: (b) => {
      ctx.audio.sfx('tap');
      ctx.go(`galeria-${b.dataset.id}`);
    },
    'goto-current': (_, ev) => {
      ev.preventDefault();
      const target = $(HERE) || $('.stage.is-available, .stage.is-started');
      if (!target) return;
      target.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'instant' : 'smooth' });
      target.focus({ preventScroll: true });
    },
    // Cartel de un tramo o de una rama: sus tarjetas (sign-cards.js, cargado al primer toque). Si es lo siguiente del
    // camino (data-next: su primer pintor), va como un paso más: «Saltar»/«Seguir» y después, el pintor.
    cartel: (b) => {
      ctx.audio.sfx('tap');
      const next = b.dataset.next;
      const opts = { title: b.dataset.title || '', onDone: next ? () => ctx.go(stageRoute(next)) : null };
      import('../sign-cards.js').then((m) => m.openSignCards(ctx, b.dataset.kind, b.dataset.id, b, opts)).catch((err) => console.error(err));
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
// puede) y sale UNA pastilla pequeña con lo que falta y «Ir» (a la parada que lo abre: data-unlock). «Ir» lleva el
// camino hasta esa parada y la toca (su tarjeta o su ronda); si no está en esta pantalla, va a jugarla. Nunca hay dos: el nuevo sustituye al anterior. Se cierra
// al tocar fuera, al desplazar el mapa, con Esc o al cambiar de pantalla. Sin temporizador.

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
    note.innerHTML = `<p class="lock-note-text"></p><button type="button" class="lock-note-go" hidden>Ir</button>`;
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
  const goBtn = note.querySelector('.lock-note-go');
  const unlock = button.dataset.unlock || '';
  goBtn.hidden = !unlock;
  if (unlock) goBtn.setAttribute('aria-label', `Ir: ${text}`);
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
  document.addEventListener('pointerdown', onDown, true);
  document.addEventListener('scroll', onScroll, { capture: true, passive: true });
  document.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', closeLockNote);
  const onGo = (e) => {
    e.stopPropagation();
    closeLockNote();
    goToStep(unlock);
  };
  goBtn.addEventListener('click', onGo);
  open = {
    note,
    off: () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('scroll', onScroll, { capture: true });
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('hashchange', closeLockNote);
      goBtn.removeEventListener('click', onGo);
    },
  };
}

const GO_SETTLE_MS = 450;   // lo que tarda el camino en llegar a la parada antes de tocarla

// A la parada que abre lo cerrado: en esta pantalla, el camino baja (o sube) hasta ella y se toca; si no está, a jugarla.
export function goToStep(key) {
  const [type, id, level] = key.split(':');
  // Un nivel «a fondo» (el imprescindible que falta en una puerta de época): a su ronda.
  if (type === 'deep') return go(deepRoute(id, Number(level)));
  const target = document.querySelector(`.stage-spot[data-step="${CSS.escape(key)}"] .stage`);
  if (!target) return go(type === 'sala' ? `sala-${id}` : stageRoute(id));
  const reduce = prefersReducedMotion();
  target.scrollIntoView({ block: 'center', behavior: reduce ? 'instant' : 'smooth' });
  target.focus({ preventScroll: true });
  return setTimeout(() => { if (target.isConnected) target.click(); }, reduce ? 0 : GO_SETTLE_MS);
}
