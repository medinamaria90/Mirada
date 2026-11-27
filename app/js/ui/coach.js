// Guía de bienvenida: tres «coach marks» que señalan el nodo actual, la franja «Hoy» y la pestaña
// Colección. Solo la primera vez (marca propia en localStorage), saltable con «Saltar» o Esc, sin
// tapar lo que señala y sin bloquear la pantalla.

import { esc } from './dom.js';
import { loadCss } from './lazy-css.js';
import { coachPlacement } from './coach-place.js';
import { coachSeen, markCoachSeen } from '../state/store.js';

export const COACH_STEPS = [
  { target: '.stage-spot.is-current .stage, .stage-spot.is-current .stage-text', text: 'Aquí empieza tu camino. Toca el cuadro y conoce a tu primer pintor.' },
  { target: '.chip-daily', text: 'Cada día, un reto de cinco preguntas.' },
  { target: '.bottomnav a[href="#coleccion"]', text: 'Cada cuadro que reconozcas se guarda en Colección.' },
];

const visible = (el) => Boolean(el && el.getClientRects().length);

// Lo señalado puede ser varios elementos (el nodo y su rótulo): se señala el rectángulo que los une.
function targetRect(root, selector) {
  const rects = [...root.querySelectorAll(selector)].filter(visible).map((e) => e.getBoundingClientRect());
  if (!rects.length) return null;
  const top = Math.min(...rects.map((r) => r.top));
  const left = Math.min(...rects.map((r) => r.left));
  return { top, left, width: Math.max(...rects.map((r) => r.right)) - left, height: Math.max(...rects.map((r) => r.bottom)) - top };
}

// Arranca la guía si es la primera vez. Devuelve una función que la cierra (para la limpieza).
export function maybeStartCoach(root = document) {
  if (coachSeen()) return () => {};
  const steps = COACH_STEPS.filter((s) => visible(root.querySelector(s.target)));
  if (!steps.length) return () => {};
  markCoachSeen();
  let stop = () => {};
  loadCss('css/coach.css').then(() => { stop = run(root, steps); });
  return () => stop();
}

function run(root, steps) {
  let k = 0;
  const ring = document.createElement('div');
  ring.className = 'coach-ring';
  ring.setAttribute('aria-hidden', 'true');
  const card = document.createElement('div');
  card.className = 'coach-card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Guía');
  document.body.append(ring, card);

  function place() {
    const r = targetRect(root, steps[k].target);
    if (!r) return;
    const pad = 6;
    Object.assign(ring.style, { top: `${r.top - pad}px`, left: `${r.left - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
    const c = card.getBoundingClientRect();
    const spot = coachPlacement(r, { width: c.width, height: c.height }, { width: window.innerWidth, height: window.innerHeight });
    Object.assign(card.style, { top: `${spot.top}px`, left: `${spot.left}px` });
    card.dataset.side = spot.side;
  }

  function show() {
    const last = k === steps.length - 1;
    card.innerHTML = `<p class="coach-step" aria-hidden="true">${k + 1} / ${steps.length}</p>
      <p class="coach-text">${esc(steps[k].text)}</p>
      <div class="coach-actions">
        <button type="button" class="btn btn-ghost coach-skip" data-coach="skip">Saltar</button>
        <button type="button" class="btn btn-primary coach-next" data-coach="next">${last ? 'Entendido' : 'Siguiente'}</button>
      </div>`;
    root.querySelector(steps[k].target).scrollIntoView({ block: 'center', behavior: 'auto' });
    place();
    card.querySelector('[data-coach="next"]').focus({ preventScroll: true });
  }

  function close() {
    window.removeEventListener('resize', place);
    window.removeEventListener('scroll', place, true);
    document.removeEventListener('keydown', onKey, true);
    ring.remove();
    card.remove();
  }
  function onKey(ev) {
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); close(); }
  }
  card.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-coach]');
    if (!b) return;
    if (b.dataset.coach === 'skip' || k === steps.length - 1) return close();
    k += 1;
    show();
  });
  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, true);
  document.addEventListener('keydown', onKey, true);
  show();
  return close;
}
