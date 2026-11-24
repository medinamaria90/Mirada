// Ficha de un cuadro de la Colección: el cuadro en grande (un toque lo abre a pantalla completa) y se pasa al
// anterior o al siguiente deslizando, con las flechas o con ←/→, en el orden de la lista que se le da.

import { esc, accentStyle, $ } from '../dom.js';
import { icons } from '../icons.js';
import { artFrame } from '../art.js';
import { artistLink } from '../artist-link.js';
import { museumLine } from '../ficha-data.js';

// getList: () => [obras] en el orden en que se pasan. Devuelve { show(id), handlers } (los handlers se unen
// a los de la pantalla con onAction).
export function mountCard(ctx, el, getList) {
  const { index } = ctx;
  const dialog = $('.card-dialog', el);
  let cur = -1;

  function renderCard(i) {
    const list = getList();
    cur = Math.max(0, Math.min(list.length - 1, i));
    const w = list[cur];
    const a = index.artist(w.artistId);
    const n = list.length;
    dialog.setAttribute('style', accentStyle(index.movement(a.movementId).accent));
    dialog.innerHTML = `<div class="dlg-body">
        <div class="dlg-art">${artFrame(w, { alt: `${w.title}, de ${a.name}`, eager: true, cls: 'art-dialog', label: w.title, zoom: { action: 'zoom', label: `Ver en grande: ${w.title}` } })}</div>
        <div class="dlg-text">
        ${n > 1 ? `<div class="dlg-nav" role="group" aria-label="Cuadros">
          <button type="button" class="icon-btn" data-action="prev" aria-label="Cuadro anterior"${cur === 0 ? ' disabled' : ''}>${icons.prev(22)}</button>
          <span class="dlg-count" aria-live="polite">${cur + 1} / ${n}</span>
          <button type="button" class="icon-btn" data-action="next" aria-label="Cuadro siguiente"${cur === n - 1 ? ' disabled' : ''}>${icons.next(22)}</button>
        </div>` : ''}
        <h2 id="dlg-title" class="dlg-title">${esc(w.title)}</h2>
        <p class="dlg-meta">${artistLink(a.id, a.name, 'dlg-artist')}${w.year ? `<span class="dlg-year"> · ${esc(w.year)}</span>` : ''}</p>
        <p class="dlg-museum">${esc(museumLine(w))}</p>
        <p class="dlg-hint">${esc(w.look || a.hint || '')}</p>
        <button class="btn btn-secondary btn-wide" data-action="close">Cerrar</button>
        </div>
      </div>`;
    // Museo y ciudad (ficha de museo, diferida): se rellenan al llegar.
    const shown = w.id;
    ctx.ensureFicha().then(() => { if (getList()[cur]?.id === shown) $('.dlg-museum', dialog).textContent = museumLine(w); });
    // Las vecinas, ya pedidas para que pasar sea inmediato.
    for (const k of [cur - 1, cur + 1]) if (list[k]) new Image().src = list[k].img;
  }

  function step(delta) {
    const k = cur + delta;
    if (k < 0 || k >= getList().length) return;
    const focusedNav = document.activeElement?.dataset?.action;
    renderCard(k);
    ctx.audio.sfx('tap');
    const keep = focusedNav === 'prev' || focusedNav === 'next' ? $(`[data-action="${focusedNav}"]`, dialog) : null;
    (keep && !keep.disabled ? keep : $('.dlg-art .art', dialog))?.focus({ preventScroll: true });
  }

  // Deslizar sobre el cuadro: pasa de cuadro (y no lo abre).
  let swipe = null;
  let swiped = false;
  dialog.addEventListener('pointerdown', (ev) => {
    swipe = ev.target.closest('.dlg-art') ? { x: ev.clientX, y: ev.clientY } : null;
    swiped = false;
  });
  dialog.addEventListener('pointerup', (ev) => {
    if (!swipe) return;
    const dx = ev.clientX - swipe.x;
    const dy = ev.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      swiped = true;
      step(dx < 0 ? 1 : -1);
    }
  });
  dialog.addEventListener('pointercancel', () => { swipe = null; });
  dialog.addEventListener('keydown', (ev) => {
    if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
      ev.preventDefault();
      step(ev.key === 'ArrowRight' ? 1 : -1);
    }
  });
  // Al cerrar la ficha, la lista queda en el cuadro donde te has quedado, con el foco en él.
  dialog.addEventListener('close', () => {
    const w = cur >= 0 ? getList()[cur] : null;
    const item = w ? el.querySelector(`.coll-item[data-id="${CSS.escape(w.id)}"]`) : null;
    if (!item) return;
    item.scrollIntoView({ block: 'center', behavior: 'auto' });
    item.focus({ preventScroll: true });
  });
  dialog.addEventListener('click', (ev) => {
    if (ev.target === dialog) dialog.close?.();
  });

  return {
    handlers: {
      open: (b) => {
        ctx.audio.sfx('tap');
        renderCard(getList().findIndex((w) => w.id === b.dataset.id));
        try {
          dialog.showModal();
        } catch {
          dialog.setAttribute('open', '');
        }
        $('[data-action="close"]', dialog).focus({ preventScroll: true });
      },
      prev: () => step(-1),
      next: () => step(1),
      zoom: (b, ev) => {
        if (swiped) { swiped = false; ev?.preventDefault(); return; }
        ctx.audio.sfx('tap');
        import('../viewer.js').then((m) => m.openViewer({
          index, works: getList(), start: cur, reveal: true, opener: b,
          // Lo que se pasa en el visor se queda en la ficha.
          onClose: (pos) => {
            if (pos === cur || !dialog.open) return null;
            renderCard(pos);
            return $('.dlg-art .art', dialog);
          },
        })).catch((err) => console.error(err));
      },
      close: () => {
        ctx.audio.sfx('tap');
        if (dialog.close) dialog.close();
        else { dialog.removeAttribute('open'); dialog.dispatchEvent(new Event('close')); }
      },
    },
  };
}
