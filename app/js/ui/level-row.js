// Fila de niveles de un pintor: un círculo por nivel del aro (engine/level-ring.js), tenga o no historia, con su título corto
// debajo, como las historias destacadas de Instagram. La portada es la primera tarjeta de su historia o, sin historia, una de
// sus obras. Va en la tarjeta del nodo del mapa (ui/level-card.js) y en la ficha (ui/artist-profile.js), y se comporta igual
// en las dos, con el mismo criterio que su botón grande «Empezar · <nivel>»:
//   · el siguiente (aro coral‑oro y ▶): lo mismo que el botón grande, su historia (si la tiene) y las preguntas;
//   · hecho (aro de oro): vuelve a poner su historia, con «Repetir nivel» en la última tarjeta; sin historia, repite el nivel;
//   · cerrado (desenfocado, candado): tiembla y dice «Se abre al terminar <nivel>».

import { esc, announce } from './dom.js';
import { icons } from './icons.js';
import { tinySrc } from './art.js';
import { levelStory, cropOf } from '../engine/stories.js';
import { deepRoute, stageRoute } from './router.js';

const LABEL = { done: 'hecho, volver a ver su historia', next: 'empezar', locked: 'cerrado' };
const LABEL_BARE = { ...LABEL, done: 'hecho, repetir' };
const NO_STORY = 'Este nivel no tiene historia';

// Niveles con su portada: [{ level, short, state, story (si tiene historia), work, crop }].
export function rowLevels(index, artistId, story, levels) {
  return levels.map((l) => {
    const card = levelStory(story, l.level)?.cards[0];
    if (card) return { ...l, story: true, work: index.artwork(card.artwork), crop: cropOf(card.focus) };
    return { ...l, story: false, work: index.levelWorks(artistId, l.level)[0], crop: cropOf() };
  });
}

const lockText = (levels, i) => `Se abre al terminar ${levels[i - 1]?.short || ''}`.trim();

function circle(l, i, levels) {
  const img = l.work ? `<img src="${esc(tinySrc(l.work))}" alt="" decoding="async" style="object-position:${l.crop.x}% ${l.crop.y}%">` : '';
  const mark = l.state === 'next' ? `<span class="hl-play">${icons.play(12)}</span>` : l.state === 'locked' ? `<span class="hl-lock">${icons.lock(18)}</span>` : '';
  const said = l.state === 'locked' ? lockText(levels, i).toLowerCase() : (l.story ? LABEL : LABEL_BARE)[l.state];
  const label = `Nivel ${i + 1}, ${l.short}: ${said}`;
  return `<li><button type="button" class="hl is-${l.state}" data-hl="${l.level}" data-state="${l.state}" data-story="${l.story ? 1 : 0}" aria-label="${esc(label)}">
      <span class="hl-c">${img}${mark}</span><span class="hl-t">${esc(l.short)}</span></button></li>`;
}

export function rowHtml(levels, cls = '') {
  if (!levels.length) return '';
  return `<ul class="hl-row${cls ? ` ${cls}` : ''}" aria-label="Niveles">${levels.map((l, i) => circle(l, i, levels)).join('')}</ul>`;
}

// Ruta que juega un nivel (su historia y después las preguntas).
export const levelRoute = (artistId, level, branchId = '') => (level === 1 ? stageRoute(artistId, branchId) : deepRoute(artistId, level));

// Vuelve a poner la historia de un nivel, sin ronda; con `replay`, su última tarjeta ofrece «Repetir nivel».
export const watchStory = (ctx, artistId, level, replay = null) => import('./story-viewer.js')
  .then((m) => m.playStory(ctx, artistId, level, { force: true, onPlay: replay ? () => replay(level) : false, playLabel: 'Repetir nivel' }))
  .catch((err) => console.error(err));

// Toques en la fila (y su nota, `more`). hooks: { play(level) } empieza el siguiente nivel (lo mismo que el botón grande);
// { replay(level) } repite uno hecho (sin él —la ficha dentro de una ronda—, un nivel hecho solo pone su historia).
export function wireRow(ctx, root, artistId, more, hooks) {
  const note = (text) => {
    more.innerHTML = `<p class="hl-note">${esc(text)}</p>`;
    more.hidden = false;
    announce(text);
  };
  root.addEventListener('click', (ev) => {
    const button = ev.target.closest('.hl');
    if (!button) return undefined;
    ctx.audio.sfx('tap');
    const level = Number(button.dataset.hl);
    const state = button.dataset.state;
    const hasStory = button.dataset.story === '1';
    more.hidden = true;
    if (state === 'next') return hasStory || hooks.replay ? hooks.play(level) : note(NO_STORY);
    if (state === 'locked') {
      button.classList.remove('is-shaking');
      void button.offsetWidth;
      button.classList.add('is-shaking');
      const prev = button.closest('li')?.previousElementSibling?.querySelector('.hl-t')?.textContent || '';
      return note(`Se abre al terminar ${prev}`.trim());
    }
    if (hasStory) return watchStory(ctx, artistId, level, hooks.replay);
    return hooks.replay ? hooks.replay(level) : note(NO_STORY);
  });
}
