// Colección: obras reconocidas, agrupadas por pintor, con ficha.

import { esc, onAction, focusHeading, accentStyle, $ } from '../dom.js';
import { icons } from '../icons.js';
import { page } from '../shell.js';
import { artFrame } from '../art.js';
import { playEra } from '../audio-bridge.js';
import { openGalleries, galleryWorks } from '../../engine/goals.js';
import { eyeLabel } from './medals.js';
import { renderPainters, collTabs } from './collection-painters.js';
import { artistLink } from '../artist-link.js';
import { museumLine } from '../ficha-data.js';

export function renderCollection(ctx, el, { tab = 'works' } = {}) {
  if (tab === 'painters') return renderPainters(ctx, el);
  const { index } = ctx;
  const owned = ctx.store.get().progress.collection;
  // Obras que se pueden reconocer en el camino: las de pintores con etapa y las de las salas.
  const total = index.artworks.filter((w) => !index.artist(w.artistId).guest || index.isSala(index.artist(w.artistId).movementId)).length;
  const ownedCount = Object.keys(owned).filter((id) => index.artwork(id)).length;
  const order = [...index.path, ...index.artists.filter((a) => index.pathIndex(a.id) < 0)];
  const groups = order
    .map((a) => ({ a, works: index.worksOf(a.id).filter((w) => owned[w.id]) }))
    .filter((g) => g.works.length);

  const body = groups.length
    ? groups.map(({ a, works }) => `<section class="coll-group" style="${accentStyle(index.movement(a.movementId).accent)}">
        <h2 class="coll-artist">${esc(a.name)} <span class="coll-count">${works.length}/${index.worksOf(a.id).length}</span></h2>
        ${eyeLine(ctx, a.id)}
        <ul class="coll-grid">${works.map((w) => `<li><button class="coll-item" data-action="open" data-id="${esc(w.id)}" aria-label="${esc(w.title)}">
          ${artFrame(w, { alt: '', cls: 'art-thumb', label: w.title, thumb: true })}</button></li>`).join('')}</ul>
      </section>`).join('')
    : `<div class="empty"><span class="empty-icon">${icons.frames(36)}</span><p>Cada cuadro que reconozcas se guardará aquí.</p>
        <a class="btn btn-primary" href="#inicio">Ir al camino</a></div>`;

  // Salas de los movimientos dominados: arriba, como entrada a la galería de cada uno.
  const galleries = openGalleries(ctx.store.get().progress, index);
  const salas = galleries.length ? `<section class="coll-salas" aria-labelledby="salas-h">
      <h2 id="salas-h" class="coll-artist">Salas <span class="coll-count">${galleries.length}</span></h2>
      <ul class="sala-list">${galleries.map((m) => {
        const n = galleryWorks(ctx.store.get().progress, index, m.id).length;
        return `<li><button class="sala-link" data-action="gallery" data-id="${esc(m.id)}" style="${accentStyle(m.accent)}">
          <span class="sala-seal" aria-hidden="true">${icons.laurel(22)}</span>
          <span class="sala-text"><span class="sala-name">${esc(m.name)}</span><span class="sala-meta">${n} ${n === 1 ? 'obra' : 'obras'}</span></span>
          <span class="sala-go" aria-hidden="true">${icons.next(18)}</span></button></li>`;
      }).join('')}</ul>
    </section>` : '';

  el.innerHTML = page(ctx, 'collection', `
    <header class="section-head"><h1>Colección</h1><p class="section-sub">${ownedCount} de ${total} vistos</p></header>
    ${collTabs('works')}
    ${salas}
    ${body}
    <dialog class="card-dialog" aria-labelledby="dlg-title"></dialog>`);
  focusHeading(el);
  playEra('menu');

  // Ficha: el cuadro en grande (un toque lo abre a pantalla completa) y se pasa al anterior o al
  // siguiente deslizando, con las flechas o con ←/→, en el mismo orden que la rejilla.
  const dialog = $('.card-dialog', el);
  const list = groups.flatMap((g) => g.works);
  let cur = -1;

  function renderCard(i) {
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
    ctx.ensureFicha().then(() => { if (list[cur] && list[cur].id === shown) $('.dlg-museum', dialog).textContent = museumLine(w); });
    // Las vecinas, ya pedidas para que pasar sea inmediato.
    for (const k of [cur - 1, cur + 1]) if (list[k]) new Image().src = list[k].img;
  }

  function step(delta) {
    const k = cur + delta;
    if (k < 0 || k >= list.length) return;
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
  // Al cerrar la ficha, la rejilla queda en el cuadro donde te has quedado, con el foco en él.
  dialog.addEventListener('close', () => {
    const item = cur >= 0 ? el.querySelector(`.coll-item[data-id="${CSS.escape(list[cur].id)}"]`) : null;
    if (!item) return;
    item.scrollIntoView({ block: 'center', behavior: 'auto' });
    item.focus({ preventScroll: true });
  });

  onAction(el, {
    open: (b) => {
      ctx.audio.sfx('tap');
      renderCard(list.findIndex((w) => w.id === b.dataset.id));
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
        index, works: list, start: cur, reveal: true, opener: b,
        // Lo que se pasa en el visor se queda en la ficha.
        onClose: (pos) => {
          if (pos === cur || !dialog.open) return null;
          renderCard(pos);
          return $('.dlg-art .art', dialog);
        },
      })).catch((err) => console.error(err));
    },
    gallery: (b) => {
      ctx.audio.sfx('tap');
      ctx.go(`galeria-${b.dataset.id}`);
    },
    close: () => {
      ctx.audio.sfx('tap');
      if (dialog.close) dialog.close();
      else { dialog.removeAttribute('open'); dialog.dispatchEvent(new Event('close')); }
    },
  });
  dialog.addEventListener('click', (ev) => {
    if (ev.target === dialog) dialog.close?.();
  });
}

// «Ojo de X · 3/7» bajo el nombre de un pintor dominado (meta larga visible).
export function eyeLine(ctx, artistId) {
  const e = eyeLabel(ctx, artistId);
  return e ? `<p class="eye-line">${icons.eye(16)}<span>${esc(e.text)}</span></p>` : '';
}
