// Bienvenida (primera vez).

import { onAction, focusHeading } from '../dom.js';
import { artFrame } from '../art.js';

export function renderWelcome(ctx, el) {
  const { index } = ctx;
  // Tres obras icónicas de movimientos distintos como pequeña sala de exposición.
  const picks = [];
  for (const m of index.movements) {
    const works = index.stageArtists(m.id).flatMap((a) => index.learnWorks(a.id)).sort((a, b) => (b.fame || 0) - (a.fame || 0));
    if (works[0]) picks.push(works[0]);
    if (picks.length === 3) break;
  }
  const wall = picks.map((w, i) => `<span class="wall-item wall-${i}">${artFrame(w, { alt: '', eager: true, label: '', thumb: true, zoom: { group: 'welcome' } })}</span>`).join('');
  el.innerHTML = `<div class="welcome">
    <main class="welcome-body" id="main">
      <div class="wall">${wall}</div>
      <h1 class="welcome-title">Mirada</h1>
      <p class="welcome-line">Aprende a reconocer a los grandes pintores de un vistazo.</p>
      <button class="btn btn-primary btn-wide" data-action="start" data-primary>Empezar</button>
    </main>
  </div>`;
  focusHeading(el);
  onAction(el, {
    start: () => {
      ctx.audio.unlock();
      ctx.audio.sfx('tap');
      ctx.store.update((s) => ({ ...s, onboarded: true }));
      ctx.go('inicio');
    },
  });
}
