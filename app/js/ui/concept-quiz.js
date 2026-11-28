// La tanda de preguntas tras las tarjetas de una época (medallón) o de un tramo (rombo): «Ir a las preguntas» la abre en la
// pantalla y al terminar (o al salir con la X) se sigue a lo que tocaba. Se puede saltar, no da puntos ni desbloquea nada;
// sus respuestas cuentan para «Repasar…» (engine/concepts.js finishConcepts). El banco se carga al primer uso.

import { runLesson } from './screens/lesson.js';
import { randomSeed, createRng } from '../engine/rng.js';
import { cleanBank, bankFor, planConcepts, finishConcepts } from '../engine/concepts.js';

export const QUESTIONS_LABEL = 'Ir a las preguntas';
let bankPromise = null;

// El banco ([] si no se puede cargar; se reintenta la próxima vez).
export function loadConceptBank() {
  if (!bankPromise) {
    bankPromise = fetch(new URL('../../data/preguntas-concepto.json', import.meta.url))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const bank = cleanBank(data);
        if (!bank.length) bankPromise = null;
        return bank;
      })
      .catch((err) => {
        console.info('Preguntas de concepto no disponibles:', err.message);
        bankPromise = null;
        return [];
      });
  }
  return bankPromise;
}

// ¿Hay preguntas para esta época o este tramo? (para enseñar «Ir a las preguntas»)
export async function hasConcepts(scope, id) {
  return bankFor(await loadConceptBank(), scope, id).length > 0;
}

// Quita la entrada de guarda que deja la ronda en el historial (ui/screens/lesson.js) antes de seguir, para que «atrás»
// no tenga que pasar por ella.
function afterGuard(then) {
  if (history.state && history.state.miradaGuard) {
    window.addEventListener('popstate', () => then(), { once: true });
    history.back();
  } else then();
}

// scope: 'epoca' o 'tramo'; id: el movimiento o la clave del tramo; movement: la época (acento y recall); cardWorks: los
// cuadros de las tarjetas recién vistas; onEnd(): sigue (tras la última respuesta o al salir).
export async function runConceptQuiz(ctx, el, { scope, id, movement, cardWorks = new Set(), onEnd }) {
  const bank = await loadConceptBank();
  if (!el.isConnected) return;
  const rng = createRng(`concepts:${randomSeed()}`);
  const questions = planConcepts(ctx.store.get().progress, ctx.index, bank, scope, id, rng, { cardWorks });
  if (!questions.length) { onEnd(); return; }
  let dispose = () => {};
  const end = (summary) => {
    dispose();
    if (summary) {
      ctx.store.update((s) => ({ ...s, progress: finishConcepts(s.progress, ctx.index, summary.answers, ctx.today(), movement.id) }));
      const right = summary.firstTry.filter(Boolean).length;
      const total = summary.firstTry.length;
      ctx.toast(right === total ? '¡Todas acertadas!' : `${right} de ${total} acertadas`);
    }
    afterGuard(() => { if (el.isConnected) onEnd(); });
  };
  dispose = runLesson(ctx, el, {
    questions,
    accent: movement.accent,
    seed: randomSeed(),
    label: 'Preguntas',
    dunno: true,
    noRetry: true,
    noPoints: true,
    skippable: true,
    onDone: (summary) => end(summary),
    onQuit: () => end(null),
    onBackAfterDone: () => {},
  });
}

// «Ir a las preguntas» bajo un carrusel de tarjetas: aparece al llegar a la última (y ya se queda); sin carrusel, desde el
// principio. place(button): lo pone en su sitio; onShow(): al aparecer (p. ej. para pasar «Seguir» a secundario).
export function offerAtEnd(track, place, onGo, { onShow = () => {} } = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn btn-primary cq-go';
  button.textContent = QUESTIONS_LABEL;
  button.hidden = true;
  button.addEventListener('click', onGo);
  place(button);
  const sync = () => {
    if (!button.hidden) return;
    // Con la pantalla aún sin pintar (ancho 0) no se sabe dónde está: se espera al primer desplazamiento.
    const last = !track || (track.clientWidth > 0 && track.scrollLeft + track.clientWidth >= track.scrollWidth - track.clientWidth / 2);
    if (!last) return;
    button.hidden = false;
    onShow();
  };
  sync();
  track?.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
  return button;
}

// Cuadros de unas tarjetas (de época o de tramo), para preferir preguntas sobre lo que se acaba de ver.
export const cardWorksOf = (cards) => new Set((cards || []).map((c) => c && c.artwork).filter(Boolean));
