// Acercamiento al entrar en una rama: el mapa crece hacia el hito del desvío y se funde; la pantalla de la rama
// aparece creciendo desde abajo (rama.css). Con «Reducir animaciones», directo.

import { prefersReducedMotion } from './dom.js';

const FALLBACK_MS = 420;

export function zoomInto(target, then) {
  const content = target.closest('.content');
  if (!content || prefersReducedMotion() || typeof content.animate !== 'function') return then();
  const css = getComputedStyle(document.documentElement);
  const ms = parseFloat(css.getPropertyValue('--dur-zoom')) || FALLBACK_MS;
  const scale = parseFloat(css.getPropertyValue('--zoom-scale')) || 1;
  const box = content.getBoundingClientRect();
  const dot = (target.querySelector('.branch-dot') || target).getBoundingClientRect();
  content.style.transformOrigin = `${dot.left + dot.width / 2 - box.left}px ${dot.top + dot.height / 2 - box.top}px`;
  const anim = content.animate([{ transform: 'none', opacity: 1 }, { transform: `scale(${scale})`, opacity: 0 }], { duration: ms, easing: 'ease-in', fill: 'forwards' });
  let done = false;
  const go = () => { if (!done) { done = true; then(); } };
  anim.finished.then(go, go);
  return null;
}
