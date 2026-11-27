// Núcleo de las historias, como las de Instagram (ui/story-viewer.js las del nivel de un pintor; ui/screens/cuadro-dia-hecho.js la
// del Cuadro del día): tarjetas sueltas ({ text, artwork, focus?, region?, whole? }), el cuadro a sangre llenando la pantalla con
// un barrido lento, barras de progreso, la cabecera que le pasen, 2-3 líneas sobre un degradado y el pie de la obra. Tocar a la
// derecha avanza, a la izquierda vuelve; deslizar hacia abajo o la X la cierran. En la última tarjeta, las acciones.
//
// Avanza sola al llenarse la barra (salvo con movimiento reducido) y se para en la última; tiene botón de pausa, Espacio pausa o
// reanuda, mantener el dedo pausa y usar el teclado (Tab) también. Para el teclado y el lector hay botones «anterior» y
// «siguiente» que solo se ven con el foco. Atrás cierra la historia (entra en el historial, como el visor).

import { accentStyle, prefersReducedMotion } from './dom.js';
import { icons } from './icons.js';
import { mediaHtml, copyHtml } from './story-card.js';
import { shareButtonHtml, noteHtml, flashNote } from './story-share.js';
import { step, cardDuration, storySrc } from '../engine/stories.js';
import { guardGhostTaps } from './tap-guard.js';

const HOLD_MS = 180; // mantener el dedo así de rato pausa la historia
const SWIPE_MIN = 50; // px de arrastre horizontal para pasar de tarjeta
const SWIPE_CLOSE = 80; // px de arrastre hacia abajo para cerrarla
const SWIPE_RATIO = 1.3; // el arrastre tiene que ir claramente en esa dirección
const ZONE_BACK = 0.33; // el tercio izquierdo vuelve; el resto avanza

let current = null;

// La duración crece con el tamaño de letra del sistema (con el texto al 200 % se tarda el doble en leer).
const fontScale = () => Math.max(1, (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) / 16);

// Cómo se cerró la historia (lo que devuelve runStory en `ended`).
export const STORY_END = Object.freeze({
  NONE: 'none', // no había historia: no se mostró nada
  PLAY: 'play', // el botón principal de la última tarjeta (o pasada la última)
  MORE: 'more', // «Ver más»
  CLOSE: 'close', // la X, Esc o deslizar hacia abajo
  BACK: 'back', // atrás del navegador o cambio de ruta
});

// Abre la historia y devuelve una promesa que se cumple al cerrarla con { shown, ended }: los cuadros que ha enseñado y cómo
// se cerró. opts: { cards, label (nombre accesible), accent, whoHtml (la cabecera), name (el pintor, para el texto alternativo),
// className, override(pos, card) → otra obra para esa tarjeta, look (pista «Fíjate en…» de la última), onPlay (función, o false
// sin botón principal), playLabel, onMore (función, o false sin «Ver más»), guest (la abre un enlace compartido: en la última
// tarjeta tocar la cierra), shareable + onShare() → nota, history: false (no entra en el historial) }.
export function runStory(ctx, opts) {
  const { index } = ctx;
  const { cards, name = '', guest = false, look = '', shareable = false } = opts;
  const auto = !prefersReducedMotion();
  const useHistory = opts.history !== false;
  const opener = document.activeElement;
  const more = opts.onMore || (() => {});
  if (current) current.close();
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = `story${opts.className ? ` ${opts.className}` : ''}`;
    dlg.setAttribute('aria-label', opts.label);
    dlg.setAttribute('style', accentStyle(opts.accent));
    dlg.innerHTML = `<div class="story-frame">
      <div class="story-media"></div>
      <div class="story-head">
        <div class="story-bars" aria-hidden="true">${cards.map(() => '<span class="story-bar"><span></span></span>').join('')}</div>
        <div class="story-top">
          ${opts.whoHtml || '<span></span>'}
          ${auto ? `<button type="button" class="story-icon" data-st="pause" aria-pressed="false" aria-label="Pausar">${icons.pause(20)}</button>` : ''}
          ${shareable ? shareButtonHtml() : ''}
          <button type="button" class="story-icon story-close" data-st="close" aria-label="Cerrar">${icons.close(24)}</button>
        </div>
      </div>
      <button type="button" class="story-step story-back" data-st="prev" aria-label="Anterior">${icons.prev(22)}</button>
      <button type="button" class="story-step story-next" data-st="next" aria-label="Siguiente">${icons.next(22)}</button>
      <div class="story-bottom"></div>
      ${shareable ? noteHtml() : ''}
      <p class="sr-only" data-live role="status" aria-live="polite"></p>
    </div>`;
    document.body.appendChild(dlg);
    const media = dlg.querySelector('.story-media');
    const bottom = dlg.querySelector('.story-bottom');
    const pauseBtn = dlg.querySelector('[data-st="pause"]');
    const shownIds = [];
    let pos = 0;
    let closed = false;
    let userPaused = false;

    const setPaused = (on) => {
      dlg.classList.toggle('is-paused', on);
      if (pauseBtn) {
        pauseBtn.setAttribute('aria-pressed', String(on));
        pauseBtn.setAttribute('aria-label', on ? 'Reanudar' : 'Pausar');
        pauseBtn.innerHTML = on ? icons.play(20) : icons.pause(20);
      }
    };
    const togglePause = () => { if (auto) { userPaused = !userPaused; setPaused(userPaused); } };
    // Mientras se elige con quién compartir, la historia espera; luego sigue como estaba.
    const share = async () => {
      const wasPaused = userPaused;
      if (auto) { userPaused = true; setPaused(true); }
      flashNote(dlg, await opts.onShare());
      if (auto && !wasPaused && !closed) { userPaused = false; setPaused(false); }
    };
    const show = (manual) => {
      const card = cards[pos];
      const last = pos === cards.length - 1;
      const override = opts.override ? opts.override(pos, card) : null;
      const base = override || index.artwork(card.artwork);
      // `whole`: la obra entera (sobre su fondo desenfocado), sin recorte.
      const work = base && card.whole && !override ? { ...base, whole: true } : base;
      if (work) shownIds.push(work.id);
      bottom.innerHTML = copyHtml(card, work, { last, look, play: opts.onPlay !== false, playLabel: opts.playLabel, more: opts.onMore !== false });
      // La obra entera se coloca en el hueco que deja el texto (sin su degradado de arriba): el texto no tapa nada.
      const textH = bottom.offsetHeight - parseFloat(getComputedStyle(bottom).paddingTop || '0');
      media.style.setProperty('--story-text-h', `${Math.max(0, Math.round(textH))}px`);
      const frame = media.clientWidth && media.clientHeight ? media.clientWidth / media.clientHeight : undefined;
      media.innerHTML = override ? mediaHtml(work, null, pos, name, frame) : mediaHtml(work, card.focus, pos, name, frame, card.region);
      dlg.classList.toggle('is-last', last);
      dlg.querySelector('.story-back').hidden = pos === 0;
      dlg.querySelector('.story-next').hidden = last;
      dlg.querySelectorAll('.story-bar').forEach((b, i) => {
        b.classList.toggle('is-done', i < pos || (i === pos && !auto));
        b.classList.toggle('is-now', auto && i === pos);
        b.style.setProperty('--dur', `${Math.round(cardDuration(card) * fontScale())}ms`);
      });
      const now = dlg.querySelector('.story-bar.is-now > span');
      if (now) { now.style.animation = 'none'; void now.offsetWidth; now.style.animation = ''; }
      // Solo se anuncia lo que el usuario pide (la primera tarjeta y cada cambio a mano), no lo que avanza solo.
      const copy = bottom.querySelector('.story-copy');
      const hint = () => {
        copy.classList.toggle('has-more', copy.scrollHeight - copy.scrollTop - copy.clientHeight > 4);
        copy.classList.toggle('is-scrollable', copy.scrollHeight > copy.clientHeight);
      };
      copy.addEventListener('scroll', hint, { passive: true });
      hint();
      // El texto lo lee el lector al recibir el foco (abajo): la región viva solo dice en qué tarjeta se está (sin leerlo dos veces).
      if (manual) dlg.querySelector('[data-live]').textContent = `Tarjeta ${pos + 1} de ${cards.length}`;
      // El foco, en el texto (sin anillo): los botones de anterior/siguiente solo aparecen cuando se llega a ellos con Tab.
      if (manual || pos === 0) copy.focus({ preventScroll: true });
      const nextCard = cards[pos + 1];
      const nextWork = nextCard && index.artwork(nextCard.artwork);
      if (nextWork) new Image().src = storySrc(nextWork, nextCard.focus, nextCard.region);
    };

    // Entra en el historial: atrás cierra la historia y deja en la ficha (o donde se estuviera).
    let pushed = false;
    if (useHistory) {
      try { history.pushState({ sfStory: true }, ''); pushed = true; } catch { /* sin historial: la X y Esc siguen funcionando */ }
    }
    const onPop = () => finish(STORY_END.BACK);

    // then: lo que sigue al cerrar (Jugar, Ver más); con entrada propia en el historial, cuando esta ya se ha quitado.
    function finish(ended = STORY_END.CLOSE, then = null) {
      const fromPop = ended === STORY_END.BACK;
      if (closed) return;
      closed = true;
      current = null;
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onPop);
      document.removeEventListener('keydown', onDocKey);
      if (dlg.open) dlg.close();
      dlg.remove();
      guardGhostTaps();
      const after = () => { resolve({ shown: shownIds, ended }); if (then) then(); };
      if (pushed && !fromPop) {
        window.addEventListener('popstate', after, { once: true });
        try { history.back(); } catch { window.removeEventListener('popstate', after); after(); return; }
      } else after();
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    }
    const go = (delta, manual = true) => {
      const r = step(pos, cards.length, delta);
      if (r.end) return finish(STORY_END.PLAY);
      if (r.pos === pos) return;
      pos = r.pos;
      if (manual) ctx.audio.sfx('tap');
      show(manual);
    };

    dlg.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-st]');
      if (b) {
        const what = b.dataset.st;
        if (what !== 'pause' && what !== 'share') ctx.audio.sfx('tap');
        if (what === 'close') finish();
        else if (what === 'pause') togglePause();
        else if (what === 'share') share();
        else if (what === 'play') finish(STORY_END.PLAY, typeof opts.onPlay === 'function' ? opts.onPlay : null);
        else if (what === 'more') finish(STORY_END.MORE, more);
        else go(what === 'next' ? 1 : -1);
        return;
      }
      if (ev.target.closest('a, button, .story-actions')) return;
      // Tocar la historia: el tercio izquierdo vuelve, el resto avanza (como en Instagram); en la última no se cierra sola, salvo
      // la compartida, que no tiene botones al final.
      const r = dlg.querySelector('.story-frame').getBoundingClientRect();
      const back = ev.clientX - r.left < r.width * ZONE_BACK;
      if (back || guest || pos < cards.length - 1) go(back ? -1 : 1);
    });
    // La barra activa llena y pasa a la siguiente tarjeta (sin anunciarla: no la ha pedido); en la última se queda, salvo en la
    // compartida, que termina.
    dlg.addEventListener('animationend', (ev) => {
      if (ev.target.parentElement?.classList.contains('is-now') && (guest || pos < cards.length - 1)) go(1, false);
    });
    // Mantener el dedo pausa (para leer con calma: el texto sigue a la vista); al soltar sigue. Arrastrar a un lado pasa de tarjeta y hacia abajo la cierra.
    let holdTimer = null;
    let from = null;
    const release = () => { clearTimeout(holdTimer); if (!userPaused && dlg.classList.contains('is-paused')) setPaused(false); };
    dlg.addEventListener('pointerdown', (ev) => {
      const copy = ev.target.closest('.story-copy');
      from = { x: ev.clientX, y: ev.clientY, scrolls: Boolean(copy && copy.scrollHeight > copy.clientHeight) };
      delete dlg.dataset.swiped;
      delete dlg.dataset.held;
      if (!ev.target.closest('button, a')) holdTimer = setTimeout(() => { setPaused(true); dlg.dataset.held = '1'; }, HOLD_MS);
    });
    // En el móvil, un dedo que se mueve un poco o una pulsación larga (menú de la imagen) cancelan el puntero aunque el dedo siga
    // apoyado: la pausa dura entonces hasta que se levanta.
    dlg.addEventListener('pointercancel', (ev) => {
      from = null;
      if (ev.pointerType !== 'touch') { release(); return; }
      const lift = () => { document.removeEventListener('touchend', lift); document.removeEventListener('touchcancel', lift); release(); };
      document.addEventListener('touchend', lift);
      document.addEventListener('touchcancel', lift);
    });
    dlg.addEventListener('contextmenu', (ev) => ev.preventDefault());
    dlg.addEventListener('pointerup', (ev) => {
      release();
      if (!from) return;
      const dx = ev.clientX - from.x;
      const dy = ev.clientY - from.y;
      const scrolls = from.scrolls;
      from = null;
      if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * SWIPE_RATIO) { dlg.dataset.swiped = '1'; go(dx < 0 ? 1 : -1); }
      else if (!scrolls && dy > SWIPE_CLOSE && dy > Math.abs(dx) * SWIPE_RATIO) { dlg.dataset.swiped = '1'; finish(); }
    });
    // Un arrastre o una pulsación larga no cuentan además como toque.
    dlg.addEventListener('click', (ev) => {
      if (dlg.dataset.swiped || dlg.dataset.held) { ev.stopImmediatePropagation(); delete dlg.dataset.swiped; delete dlg.dataset.held; }
    }, true);
    // Espacio pausa o reanuda esté donde esté el foco (en un botón no lo activa); Tab (teclado) deja de avanzar sola.
    dlg.addEventListener('keydown', (ev) => {
      if (ev.key === ' ') {
        ev.preventDefault();
        ev.stopPropagation();
        togglePause();
      } else if (ev.key === 'Tab' && auto && !userPaused) {
        userPaused = true;
        setPaused(true);
      } else if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
        // Una flecha, una tarjeta: se corta aquí para que el manejador del documento no la cuente otra vez.
        ev.preventDefault();
        ev.stopPropagation();
        if (ev.key === 'ArrowLeft' || pos < cards.length - 1) go(ev.key === 'ArrowRight' ? 1 : -1);
      }
    }, true);
    dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); finish(); });
    // El foco no sale de la historia: Tab da la vuelta dentro de ella.
    const focusables = () => [...dlg.querySelectorAll('button:not([hidden]), a[href]')].filter((e) => !e.disabled && e.getClientRects().length);
    dlg.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Tab') return;
      const list = focusables();
      if (!list.length) return;
      // También desde el texto (tabindex -1, tras los botones): sin nada enfocable después (o antes), da la vuelta.
      const at = document.activeElement;
      const follows = (e) => Boolean(at.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING);
      if (ev.shiftKey && !list.some((e) => e !== at && !follows(e))) { ev.preventDefault(); list[list.length - 1].focus(); }
      else if (!ev.shiftKey && !list.some((e) => e !== at && follows(e))) { ev.preventDefault(); list[0].focus(); }
    });
    const onDocKey = (ev) => {
      if (ev.defaultPrevented || dlg.contains(ev.target)) return;
      if (ev.key === 'ArrowRight') { if (pos < cards.length - 1) go(1); }
      else if (ev.key === 'ArrowLeft') go(-1);
      else if (ev.key === ' ') togglePause();
      else if (ev.key === 'Escape') finish();
      else return;
      ev.preventDefault();
    };
    document.addEventListener('keydown', onDocKey);
    // Sin entrada propia en el historial, cambiar de ruta (atrás del navegador) cierra la historia.
    window.addEventListener(useHistory ? 'popstate' : 'hashchange', onPop);
    current = { close: () => finish(STORY_END.CLOSE) };
    try { dlg.showModal(); } catch { dlg.setAttribute('open', ''); }
    show(true);
  });
}
