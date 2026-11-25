// Historia al empezar un nivel, como las de Instagram: una columna 9:16 con el cuadro a sangre, barras de progreso,
// quién cuenta la historia, 2-3 líneas y la fuente discreta. Saltable en cualquier momento, sin examen. Una vez por
// nivel (se vuelve a ver desde la ficha del pintor). Pintores sin historia: no se muestra nada.
//
// Avanza sola al llenarse la barra (salvo con movimiento reducido), con un botón visible de pausa; Espacio pausa o
// reanuda esté donde esté el foco, mantener el dedo pausa y usar el teclado (Tab) también. Atrás cierra la historia
// y deja en la pantalla de debajo (entra en el historial, como el visor).

import { esc, accentStyle, prefersReducedMotion } from './dom.js';
import { icons } from './icons.js';
import { loadCss } from './lazy-css.js';
import { loadStory } from './story-data.js';
import { avatarHtml } from './avatar.js';
import { seenOf, avatarWork } from '../engine/painters.js';
import { levelStory, cropOf, step, storyKey, sourceLabel, cardDuration } from '../engine/stories.js';
import { storySeen, markStorySeen } from '../state/stories-seen.js';

const HOLD_MS = 180; // mantener el dedo así de rato pausa la historia
const SWIPE_MIN = 50; // px de arrastre horizontal para pasar de tarjeta
const ZONE_BACK = 0.33; // el tercio izquierdo de la imagen vuelve; el resto avanza

let current = null;

function mediaHtml(index, card) {
  const w = index.artwork(card.artwork);
  const c = cropOf(card.focus);
  const img = w ? `<img class="story-img" src="${esc(w.img)}" alt="${esc(`${w.title}, de ${index.artist(w.artistId)?.name || ''}`)}" width="${w.w || 4}" height="${w.h || 3}" decoding="async" fetchpriority="high">` : '';
  return `<div class="story-art${c.whole ? '' : ' is-crop'}" style="--x:${c.x}%;--y:${c.y}%;--z:${c.zoom}">${img}</div>`;
}

function cardHtml(card, pos, count, forced) {
  const label = sourceLabel(card.source);
  const last = pos === count - 1;
  // El texto tiene su propio desplazamiento (con letra grande) y los botones quedan fijos abajo.
  return `<div class="story-copy" tabindex="-1"><p class="story-text">${esc(card.text)}</p>
      ${label ? `<a class="story-source" href="${esc(String(card.source).split('#')[0])}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>` : ''}</div>
    <div class="story-nav">
      <button type="button" class="icon-btn story-back" data-st="prev" aria-label="Tarjeta anterior"${pos === 0 ? ' hidden' : ''}>${icons.prev(22)}</button>
      <button type="button" class="btn btn-primary story-next" data-st="next">${last ? (forced ? 'Cerrar' : 'Listo') : 'Siguiente'}</button>
    </div>`;
}

// La duración crece con el tamaño de letra del sistema (con el texto al 200 % se tarda el doble en leer).
const fontScale = () => Math.max(1, (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) / 16);

// Muestra la historia del nivel y devuelve una promesa que se cumple al terminar o saltarla (true si se mostró).
// opts: { force } vuelve a mostrarla aunque ya se haya visto.
export async function playStory(ctx, artistId, level, opts = {}) {
  const key = storyKey(artistId, level);
  if (!opts.force && storySeen(key)) return false;
  const [story] = await Promise.all([loadStory(artistId), loadCss('css/historias.css')]);
  const lv = levelStory(story, level);
  if (!lv) return false;
  const { index } = ctx;
  if (current) current.close();
  markStorySeen(key);
  const artist = index.artist(artistId);
  const opener = document.activeElement;
  const auto = !prefersReducedMotion();

  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'story';
    dlg.setAttribute('aria-label', `Historia: ${lv.title || artist?.name || ''}`);
    dlg.setAttribute('style', accentStyle(index.movement(artist?.movementId)?.accent));
    dlg.innerHTML = `<div class="story-frame">
      <div class="story-head">
        <div class="story-bars" aria-hidden="true">${lv.cards.map(() => '<span class="story-bar"><span></span></span>').join('')}</div>
        <div class="story-top">
          <span class="story-who"><span class="story-avatar" aria-hidden="true">${avatarHtml(artist, avatarWork(seenOf(ctx.store.get().progress, index, artistId)))}</span>
            <span class="story-who-text"><span class="story-name">${esc(artist?.short || artist?.name || '')}</span><span class="story-title">${esc(lv.stage || lv.title)}</span></span></span>
          ${auto ? `<button type="button" class="story-icon" data-st="pause" aria-pressed="false" aria-label="Pausar">${icons.pause(22)}</button>` : ''}
          <button type="button" class="story-skip" data-st="skip">Saltar</button>
        </div>
      </div>
      <div class="story-media"></div>
      <p class="story-paused" aria-hidden="true">En pausa</p>
      <div class="story-bottom"></div>
      <p class="sr-only" data-live role="status" aria-live="polite"></p>
    </div>`;
    document.body.appendChild(dlg);
    const media = dlg.querySelector('.story-media');
    const bottom = dlg.querySelector('.story-bottom');
    const pauseBtn = dlg.querySelector('[data-st="pause"]');
    let pos = 0;
    let closed = false;
    let userPaused = false;

    const setPaused = (on) => {
      dlg.classList.toggle('is-paused', on);
      if (pauseBtn) {
        pauseBtn.setAttribute('aria-pressed', String(on));
        pauseBtn.setAttribute('aria-label', on ? 'Reanudar' : 'Pausar');
        pauseBtn.innerHTML = on ? icons.play(22) : icons.pause(22);
      }
    };
    const show = (manual) => {
      media.innerHTML = mediaHtml(index, lv.cards[pos]);
      bottom.innerHTML = cardHtml(lv.cards[pos], pos, lv.cards.length, Boolean(opts.force));
      dlg.querySelectorAll('.story-bar').forEach((b, i) => {
        b.classList.toggle('is-done', i < pos || (i === pos && !auto));
        b.classList.toggle('is-now', auto && i === pos);
        b.style.setProperty('--dur', `${Math.round(cardDuration(lv.cards[pos]) * fontScale())}ms`);
      });
      const now = dlg.querySelector('.story-bar.is-now > span');
      if (now) { now.style.animation = 'none'; void now.offsetWidth; now.style.animation = ''; }
      // Solo se anuncia lo que el usuario pide (la primera tarjeta y cada cambio a mano), no lo que avanza solo.
      if (manual) dlg.querySelector('[data-live]').textContent = lv.cards[pos].text;
      if (manual || pos === 0) dlg.querySelector('.story-next').focus({ preventScroll: true });
      const nextCard = lv.cards[pos + 1];
      const nextWork = nextCard && index.artwork(nextCard.artwork);
      if (nextWork) new Image().src = nextWork.img;
    };

    // Entra en el historial: atrás cierra la historia y deja en la ficha (o donde se estuviera).
    let pushed = false;
    try { history.pushState({ sfStory: true }, ''); pushed = true; } catch { /* sin historial: Saltar y Esc siguen funcionando */ }
    const onPop = () => finish(true);

    function finish(fromPop = false) {
      if (closed) return;
      closed = true;
      current = null;
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('keydown', onDocKey);
      if (dlg.open) dlg.close();
      dlg.remove();
      if (pushed && !fromPop) { try { history.back(); } catch { /* nada */ } }
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
      resolve(true);
    }
    const go = (delta, manual = true) => {
      const r = step(pos, lv.cards.length, delta);
      if (r.end) return finish();
      if (r.pos === pos) return;
      pos = r.pos;
      if (manual) ctx.audio.sfx('tap');
      show(manual);
    };

    dlg.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-st]');
      if (b) {
        const what = b.dataset.st;
        if (what === 'skip') { ctx.audio.sfx('tap'); finish(); }
        else if (what === 'pause') { userPaused = !userPaused; setPaused(userPaused); }
        else go(what === 'next' ? 1 : -1);
        return;
      }
      // Tocar la imagen: el tercio izquierdo vuelve, el resto avanza (como en Instagram).
      const art = ev.target.closest('.story-media');
      if (art) {
        const r = art.getBoundingClientRect();
        go(ev.clientX - r.left < r.width * ZONE_BACK ? -1 : 1);
      }
    });
    // La barra activa llena y pasa a la siguiente tarjeta (sin anunciarla: no la ha pedido).
    dlg.addEventListener('animationend', (ev) => { if (ev.target.parentElement?.classList.contains('is-now')) go(1, false); });
    // Mantener el dedo sobre el cuadro o el texto pausa; al soltar sigue.
    let holdTimer = null;
    let from = null;
    const release = () => { clearTimeout(holdTimer); if (!userPaused && dlg.classList.contains('is-paused')) setPaused(false); };
    dlg.addEventListener('pointerdown', (ev) => {
      from = { x: ev.clientX, y: ev.clientY };
      delete dlg.dataset.swiped;
      delete dlg.dataset.held;
      if (ev.target.closest('.story-media, .story-bottom') && !ev.target.closest('button, a')) holdTimer = setTimeout(() => { setPaused(true); dlg.dataset.held = '1'; }, HOLD_MS);
    });
    dlg.addEventListener('pointercancel', release);
    dlg.addEventListener('pointerup', (ev) => {
      release();
      if (!from) return;
      const dx = ev.clientX - from.x;
      const dy = ev.clientY - from.y;
      from = null;
      if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.3) { dlg.dataset.swiped = '1'; go(dx < 0 ? 1 : -1); }
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
        if (auto) { userPaused = !userPaused; setPaused(userPaused); }
      } else if (ev.key === 'Tab' && auto && !userPaused) {
        userPaused = true;
        setPaused(true);
      } else if (ev.key === 'ArrowRight') { ev.preventDefault(); go(1); } else if (ev.key === 'ArrowLeft') { ev.preventDefault(); go(-1); }
    }, true);
    dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); finish(); });
    // El foco no sale de la historia: Tab da la vuelta dentro de ella y, si se pierde (el cuerpo de la página), las teclas
    // siguen valiendo y devuelven el foco al botón de seguir.
    const focusables = () => [...dlg.querySelectorAll('button:not([hidden]), a[href]')].filter((e) => !e.disabled && e.getClientRects().length);
    dlg.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Tab') return;
      const list = focusables();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
    });
    const onDocKey = (ev) => {
      if (dlg.contains(ev.target)) return;
      if (ev.key === 'ArrowRight') go(1);
      else if (ev.key === 'ArrowLeft') go(-1);
      else if (ev.key === ' ' && auto) { userPaused = !userPaused; setPaused(userPaused); }
      else if (ev.key === 'Escape') finish();
      else return;
      ev.preventDefault();
      dlg.querySelector('.story-next')?.focus({ preventScroll: true });
    };
    document.addEventListener('keydown', onDocKey);
    window.addEventListener('popstate', onPop);
    current = { close: () => finish(false) };
    try { dlg.showModal(); } catch { dlg.setAttribute('open', ''); }
    show(true);
  });
}
