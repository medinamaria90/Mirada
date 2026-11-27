// Colección: una sola página que invita a entrar. Arriba, el buscador (pintores conocidos, sus cuadros y también los que
// aún esperan); después «Lo último» que has visto y una fila por época con todos sus pintores: los conocidos llevan a su
// ficha (con su galería) y los que esperan salen bloqueados, con su hoja (quién es y dónde lo conocerás), sin enseñar
// ninguna obra suya. Las épocas sin nadie conocido van al final, bajo «Por descubrir». `#coleccion-pintores` (enlaces antiguos) abre esta misma página.

import { focusHeading } from '../dom.js';
import { icons } from '../icons.js';
import { page } from '../shell.js';
import { playEra } from '../audio-bridge.js';
import { openGalleries } from '../../engine/goals.js';
import { unlockedMap } from '../../engine/collection.js';
import { recentWorks, eraShelves, searchPool } from '../../engine/collection-shelves.js';
import { recentHtml, shelfHtml, subtitle } from './collection-shelves.js';
import { loadCss } from '../lazy-css.js';
import { observeDeferred } from '../lazy-img.js';
import { suggestBoxHtml, mountSuggestBox } from '../suggest-box.js';

function openLocked(ctx, id, opener) {
  import('../locked-painter-sheet.js').then((m) => m.openLockedPainter(ctx, id, opener)).catch((err) => console.error(err));
}

export async function renderCollection(ctx, el) {
  await loadCss('css/coleccion.css');
  const { index } = ctx;
  const progress = ctx.store.get().progress;
  const owned = Object.keys(unlockedMap(progress, index)).length;
  const shelves = eraShelves(progress, index);
  const painters = shelves.reduce((n, s) => n + s.known, 0);
  const salas = new Set(openGalleries(progress, index).map((m) => m.id));
  const intros = progress.intros || {};
  // Primero las épocas en las que ya conoces a alguien; después, las que te esperan (las dos en orden cronológico).
  const met = shelves.filter((s) => s.known > 0);
  const ahead = shelves.filter((s) => s.known === 0);
  const shelf = (s) => shelfHtml(s, { introSeen: Boolean(intros[s.movement.id]) && s.known > 0, salaOpen: salas.has(s.movement.id) });

  el.innerHTML = page(ctx, 'collection', `
    <header class="section-head"><h1>Colección</h1>${owned ? `<p class="section-sub">${subtitle(painters, owned)}</p>` : ''}</header>
    ${suggestBoxHtml()}
    ${owned ? recentHtml(recentWorks(progress, index), owned) : `<div class="cx-empty"><span class="empty-icon">${icons.frames(32)}</span><p>Cada cuadro que veas se guardará aquí.</p>
      <a class="btn btn-primary" href="#inicio">Ir al camino</a></div>`}
    ${met.map(shelf).join('')}
    ${ahead.length ? `<h2 class="cx-ahead">Por descubrir</h2>${ahead.map(shelf).join('')}` : ''}`);
  focusHeading(el);
  playEra('menu');
  observeDeferred(el);
  ctx.ensureText();

  const input = el.querySelector('.sg-input');
  ctx.setCleanup(mountSuggestBox(el.querySelector('.sg'), {
    index,
    pool: () => searchPool(ctx.store.get().progress, index),
    onPick: ({ kind, id }) => {
      if (kind === 'artist') ctx.go(`pintor-${id}`);
      else if (kind === 'locked') openLocked(ctx, id, input);
      else import('../viewer.js').then((m) => m.openViewer({ index, works: [index.artwork(id)], start: 0, reveal: true, opener: input })).catch((err) => console.error(err));
    },
  }));

  el.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-locked]');
    if (!b) return;
    ctx.audio.sfx('tap');
    openLocked(ctx, b.dataset.locked, b);
  });
}
