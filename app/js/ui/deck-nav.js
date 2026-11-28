// Navegación común de los visores de tarjetas: la presentación de una época (screens/era-cards.js), el cartel de un tramo o
// de una rama (sign-cards.js) y la historia de un pintor (story-core.js). El aspecto cambia (época y tramo en claro, pintor
// en oscuro sobre su cuadro), pero avanzar, volver y salir es igual en los tres: arriba, barras de progreso, la etiqueta de
// tipo y, a la derecha, compartir (si aplica) y la X; tocar a la derecha avanza y a la izquierda vuelve, y deslizar también;
// abajo, «Seguir» (destacado) y, si hay un atajo, «Saltar» o «Ir a las preguntas». En la última tarjeta, el botón principal
// pasa a ser lo que toca («Empezar», «Ir a las preguntas», «Volver al camino»…). Estilos en css/deck.css.

import { esc } from './dom.js';
import { icons } from './icons.js';

// Textos de los botones: los mismos en los tres visores.
export const DECK_LABEL = Object.freeze({
  next: 'Seguir',
  questions: 'Ir a las preguntas',
  skip: 'Saltar',
  start: 'Empezar',
  toPath: 'Volver al camino',
  back: 'Volver',
});

// Nombres accesibles de los controles, también comunes.
export const DECK_ARIA = Object.freeze({ close: 'Cerrar', share: 'Compartir', prev: 'Anterior', next: 'Siguiente' });

// El tercio izquierdo vuelve; el resto avanza (como en Instagram).
export const ZONE_BACK = 0.33;

// -1 si el toque cae en la zona de volver, 1 si en la de avanzar.
export function tapSide(clientX, rect) {
  return clientX - rect.left < rect.width * ZONE_BACK ? -1 : 1;
}

export function barsHtml(total) {
  return `<div class="deck-bars" aria-hidden="true">${Array.from({ length: total }, () => '<span class="deck-bar"><span></span></span>').join('')}</div>`;
}

// Barras hechas hasta la tarjeta actual (incluida).
export function setBars(scope, pos) {
  scope.querySelectorAll('.deck-bar').forEach((b, i) => b.classList.toggle('is-done', i <= pos));
}

export const shareButtonHtml = () =>
  `<button type="button" class="deck-icon deck-share" data-deck="share" aria-label="${DECK_ARIA.share}">${icons.share(20)}</button>`;

// Cabecera: barras y, debajo, la etiqueta (labelHtml: «Época», «Tramo» o quién cuenta la historia), compartir y la X.
export function headHtml({ total, labelHtml = '', share = false }) {
  return `<div class="deck-head">
      ${barsHtml(total)}
      <div class="deck-top">
        ${labelHtml || '<span></span>'}
        ${share ? shareButtonHtml() : ''}
        <button type="button" class="deck-icon deck-close" data-deck="close" aria-label="${DECK_ARIA.close}">${icons.close(24)}</button>
      </div>
    </div>`;
}

export const kindLabelHtml = (text) => `<p class="deck-label">${esc(text)}</p>`;

// Anterior / siguiente para el teclado y el lector: solo se ven con el foco (al tocar mandan las zonas de la pantalla).
export const stepButtonsHtml = () =>
  `<button type="button" class="deck-step deck-back" data-deck="prev" aria-label="${DECK_ARIA.prev}">${icons.prev(22)}</button>
      <button type="button" class="deck-step deck-next" data-deck="next" aria-label="${DECK_ARIA.next}">${icons.next(22)}</button>`;

// Pie: el atajo (secondary: { label, action }) y el botón principal ({ label, action }). action: el data-deck del botón.
export function actionsHtml({ secondary = null, primary }) {
  return `<div class="deck-actions">
      ${secondary ? `<button type="button" class="btn deck-secondary" data-deck="${secondary.action}">${esc(secondary.label)}</button>` : ''}
      <button type="button" class="btn btn-primary deck-primary" data-deck="${primary.action}">${esc(primary.label)}</button>
    </div>`;
}

// Pie de los carruseles (época y cartel): anterior/siguiente para el teclado y los dos botones; wireDeck pone sus textos.
export const deckFootHtml = () =>
  `${stepButtonsHtml()}${actionsHtml({ secondary: { label: '', action: 'skip' }, primary: { label: DECK_LABEL.next, action: 'primary' } })}`;

// Carrusel de tarjetas (época y cartel): se desliza con el dedo (scroll-snap) y, como la historia, se avanza tocando a la
// derecha, se vuelve tocando a la izquierda y con los botones del pie. scope: donde están la cabecera, el carrusel y el pie
// (deckFootHtml). endLabel: el principal en la última tarjeta; onEnd, lo que hace. onSkip: «Saltar» mientras quedan tarjetas
// (si lo hay). more: { label, go } el secundario «Más sobre…» de la última (si lo hay). onClose: la X (si no la cierra otro,
// como mountSheet); onShare: compartir.
export function wireDeck(ctx, { scope, track, endLabel, onEnd, onSkip = null, more = null, onClose = null, onShare = null }) {
  const slides = [...track.children];
  const total = slides.length;
  const primary = scope.querySelector('.deck-primary');
  const secondary = scope.querySelector('.deck-secondary');
  const back = scope.querySelector('.deck-back');
  const fwd = scope.querySelector('.deck-next');
  let pos = 0;
  const go = (i) => {
    const k = Math.max(0, Math.min(total - 1, i));
    if (k === pos) return;
    ctx.audio.sfx('tap');
    slides[k].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  };
  const sync = () => {
    pos = Math.max(0, Math.min(total - 1, Math.round(track.scrollLeft / Math.max(1, track.clientWidth))));
    const last = pos === total - 1;
    setBars(scope, pos);
    primary.textContent = last ? endLabel : DECK_LABEL.next;
    secondary.dataset.deck = last ? 'more' : 'skip';
    secondary.textContent = last ? more?.label || '' : DECK_LABEL.skip;
    secondary.hidden = last ? !more : !onSkip;
    back.hidden = pos === 0;
    fwd.hidden = last;
  };
  sync();
  track.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
  scope.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-deck]');
    if (b) {
      const what = b.dataset.deck;
      if (what === 'share') { onShare?.(); return; }
      ctx.audio.sfx('tap');
      if (what === 'close') onClose?.();
      else if (what === 'skip') onSkip?.();
      else if (what === 'more') more?.go();
      else if (what === 'primary') { if (pos === total - 1) onEnd(); else go(pos + 1); }
      else go(pos + (what === 'next' ? 1 : -1));
      return;
    }
    // Un toque en la tarjeta (no en un botón ni en un cuadro, que se abre en grande): a la izquierda vuelve, a la derecha avanza.
    if (!track.contains(ev.target) || ev.target.closest('button, a')) return;
    go(pos + tapSide(ev.clientX, track.getBoundingClientRect()));
  });
}
