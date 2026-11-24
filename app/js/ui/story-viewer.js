// Historia al empezar un nivel, como las de Instagram: barras de progreso, el detalle grande de un cuadro,
// 2-3 líneas y la fuente discreta. Saltable en cualquier momento, sin examen. Una vez por nivel (se vuelve a
// ver desde la ficha del pintor). Pintores sin historia: no se muestra nada.

import { esc, accentStyle } from './dom.js';
import { icons } from './icons.js';
import { loadCss } from './lazy-css.js';
import { loadStory } from './story-data.js';
import { levelStory, cropOf, step, storyKey, sourceLabel } from '../engine/stories.js';
import { storySeen, markStorySeen } from '../state/stories-seen.js';

const SWIPE_MIN = 50; // px de arrastre horizontal para pasar de tarjeta
const ZONE_BACK = 0.33; // el tercio izquierdo de la imagen vuelve; el resto avanza

let current = null;

function cardHtml(index, card, pos, count) {
  const w = index.artwork(card.artwork);
  const c = cropOf(card.focus);
  const label = sourceLabel(card.source);
  const art = w ? `<img class="story-img" src="${esc(w.img)}" alt="${esc(`${w.title}, de ${index.artist(w.artistId)?.name || ''}`)}" width="${w.w || 4}" height="${w.h || 3}" decoding="async" fetchpriority="high">` : '';
  return `<div class="story-art${c.whole ? '' : ' is-crop'}" style="--x:${c.x}%;--y:${c.y}%;--z:${c.zoom}">${art}</div>
    <div class="story-card" aria-live="polite">
      <p class="story-text">${esc(card.text)}</p>
      ${label ? `<a class="story-source" href="${esc(String(card.source).split('#')[0])}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>` : ''}
    </div>
    <div class="story-nav">
      <button type="button" class="icon-btn story-back" data-st="prev" aria-label="Tarjeta anterior"${pos === 0 ? ' hidden' : ''}>${icons.prev(22)}</button>
      <button type="button" class="btn btn-primary story-next" data-st="next">${pos === count - 1 ? 'Seguir' : 'Siguiente'}</button>
    </div>`;
}

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

  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'story';
    dlg.setAttribute('aria-label', `Historia: ${lv.title || artist?.name || ''}`);
    dlg.setAttribute('style', accentStyle(index.movement(artist?.movementId)?.accent));
    dlg.innerHTML = `<div class="story-bars" aria-hidden="true">${lv.cards.map(() => '<span class="story-bar"><span></span></span>').join('')}</div>
      <div class="story-top"><p class="story-title">${esc(lv.stage || lv.title)}</p>
        <button type="button" class="story-skip" data-st="skip">Saltar</button></div>
      <div class="story-body"></div>`;
    document.body.appendChild(dlg);
    const body = dlg.querySelector('.story-body');
    let pos = 0;
    let closed = false;

    const show = () => {
      body.innerHTML = cardHtml(index, lv.cards[pos], pos, lv.cards.length);
      dlg.querySelectorAll('.story-bar').forEach((b, i) => b.classList.toggle('is-done', i <= pos));
      dlg.querySelector('.story-next').focus({ preventScroll: true });
      const nextCard = lv.cards[pos + 1];
      const nextWork = nextCard && index.artwork(nextCard.artwork);
      if (nextWork) new Image().src = nextWork.img;
    };
    const finish = () => {
      if (closed) return;
      closed = true;
      current = null;
      window.removeEventListener('hashchange', finish);
      if (dlg.open) dlg.close();
      dlg.remove();
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
      resolve(true);
    };
    const go = (delta) => {
      const r = step(pos, lv.cards.length, delta);
      if (r.end) return finish();
      if (r.pos === pos) return;
      pos = r.pos;
      ctx.audio.sfx('tap');
      show();
    };

    dlg.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-st]');
      if (b) {
        if (b.dataset.st === 'skip') { ctx.audio.sfx('tap'); finish(); } else go(b.dataset.st === 'next' ? 1 : -1);
        return;
      }
      // Tocar la imagen: el tercio izquierdo vuelve, el resto avanza (como en Instagram).
      const art = ev.target.closest('.story-art');
      if (art) {
        const r = art.getBoundingClientRect();
        go(ev.clientX - r.left < r.width * ZONE_BACK ? -1 : 1);
      }
    });
    let from = null;
    dlg.addEventListener('pointerdown', (ev) => { from = { x: ev.clientX, y: ev.clientY }; delete dlg.dataset.swiped; });
    dlg.addEventListener('pointerup', (ev) => {
      if (!from) return;
      const dx = ev.clientX - from.x;
      const dy = ev.clientY - from.y;
      from = null;
      if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.3) { dlg.dataset.swiped = '1'; go(dx < 0 ? 1 : -1); }
    });
    // Un arrastre no cuenta además como toque en la imagen.
    dlg.addEventListener('click', (ev) => { if (dlg.dataset.swiped) { ev.stopImmediatePropagation(); delete dlg.dataset.swiped; } }, true);
    dlg.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowRight') { ev.preventDefault(); go(1); } else if (ev.key === 'ArrowLeft') { ev.preventDefault(); go(-1); }
    });
    dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); finish(); });
    window.addEventListener('hashchange', finish);
    current = { close: finish };
    try { dlg.showModal(); } catch { dlg.setAttribute('open', ''); }
    show();
  });
}
