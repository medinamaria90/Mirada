// Historias destacadas de un pintor: un círculo por nivel del aro (engine/level-ring.js), con la portada de la primera tarjeta
// de su historia y su título corto debajo, como las destacadas de Instagram. Va en la tarjeta del nodo del mapa
// (ui/level-card.js) y en la ficha (ui/artist-profile.js), y se comporta igual en las dos:
//   · hecho (aro de oro): elegir entre volver a ver su historia (sin ronda) y repetir el nivel;
//   · el siguiente (aro coral‑oro y ▶): su historia y las preguntas (la ruta del nivel);
//   · cerrado (desenfocado, candado): tiembla y dice «Se abre al terminar <nivel>».

import { esc, announce } from './dom.js';
import { icons } from './icons.js';
import { tinySrc } from './art.js';
import { levelStory, cropOf } from '../engine/stories.js';
import { focusOf } from '../engine/framing.js';
import { deepRoute, stageRoute } from './router.js';

const LABEL = { done: 'vista, volver a verla', next: 'jugar', locked: 'cerrada' };

// Niveles con historia (sin historia no hay círculo), con su portada: [{ level, short, state, work, crop }].
export function rowLevels(index, story, levels) {
  return levels.map((l) => ({ ...l, card: levelStory(story, l.level)?.cards[0] })).filter((l) => l.card)
    .map(({ card, ...l }) => {
      const work = index.artwork(card.artwork);
      // El círculo se centra en el detalle de la tarjeta o, si no lo tiene, en el foco revisado de la obra.
      const f = card.focus ? null : focusOf(work);
      return { ...l, work, crop: f ? { x: Math.round(f[0] * 100), y: Math.round(f[1] * 100) } : cropOf(card.focus) };
    });
}

const lockText = (levels, i) => `Se abre al terminar ${levels[i - 1]?.short || ''}`.trim();

function circle(l, i, levels) {
  const img = l.work ? `<img src="${esc(tinySrc(l.work))}" alt="" decoding="async" style="object-position:${l.crop.x}% ${l.crop.y}%">` : '';
  const mark = l.state === 'next' ? `<span class="hl-play">${icons.play(12)}</span>` : l.state === 'locked' ? `<span class="hl-lock">${icons.lock(18)}</span>` : '';
  const label = `Historia ${i + 1}, ${l.short}: ${l.state === 'locked' ? lockText(levels, i).toLowerCase() : LABEL[l.state]}`;
  return `<li><button type="button" class="hl is-${l.state}" data-hl="${l.level}" data-state="${l.state}" aria-label="${esc(label)}">
      <span class="hl-c">${img}${mark}</span><span class="hl-t">${esc(l.short)}</span></button></li>`;
}

export function rowHtml(levels, cls = '') {
  if (!levels.length) return '';
  return `<ul class="hl-row${cls ? ` ${cls}` : ''}" aria-label="Historias">${levels.map((l, i) => circle(l, i, levels)).join('')}</ul>`;
}

// Ruta que juega un nivel (su historia y después las preguntas).
export const levelRoute = (artistId, level, branchId = '') => (level === 1 ? stageRoute(artistId, branchId) : deepRoute(artistId, level));

// Línea bajo la fila: «Se abre al terminar …» (cerrado) o, en un nivel hecho, elegir entre volver a ver su historia y
// repetir el nivel.
const pickHtml = (short) => `<div class="hl-pick" role="group" aria-label="${esc(short)}">
    <button type="button" class="hl-pick-btn" data-pick="story">${icons.play(18)}<span>Ver historia</span></button>
    <button type="button" class="hl-pick-btn" data-pick="again">${icons.repeat(18)}<span>Repetir nivel</span></button></div>`;

// Vuelve a poner la historia de un nivel, sin ronda.
export const watchStory = (ctx, artistId, level) => import('./story-viewer.js')
  .then((m) => m.playStory(ctx, artistId, level, { force: true, onPlay: false }))
  .catch((err) => console.error(err));

// Toques en la fila (y en su línea, `more`). hooks: { play(level) } juega el siguiente nivel; { replay(level) } repite uno
// hecho (sin él, tocar un nivel hecho solo vuelve a poner su historia: la ficha dentro de una ronda).
export function wireRow(ctx, root, artistId, more, hooks) {
  let picked = 0;
  const story = (level) => watchStory(ctx, artistId, level);
  const say = (html, text) => {
    more.innerHTML = html;
    more.hidden = false;
    if (text) announce(text);
  };
  root.addEventListener('click', (ev) => {
    const pick = ev.target.closest('[data-pick]');
    if (pick && picked) {
      ctx.audio.sfx('tap');
      return pick.dataset.pick === 'story' ? story(picked) : hooks.replay(picked);
    }
    const button = ev.target.closest('.hl');
    if (!button) return undefined;
    ctx.audio.sfx('tap');
    const level = Number(button.dataset.hl);
    const state = button.dataset.state;
    root.querySelectorAll('.hl[aria-expanded]').forEach((b) => b.removeAttribute('aria-expanded'));
    if (state === 'next') return hooks.play(level);
    if (state === 'locked') {
      button.classList.remove('is-shaking');
      void button.offsetWidth;
      button.classList.add('is-shaking');
      picked = 0;
      const prev = button.closest('li')?.previousElementSibling?.querySelector('.hl-t')?.textContent || '';
      const text = `Se abre al terminar ${prev}`.trim();
      return say(`<p class="hl-note">${esc(text)}</p>`, text);
    }
    if (!hooks.replay) return story(level);
    picked = level;
    button.setAttribute('aria-expanded', 'true');
    say(pickHtml(button.querySelector('.hl-t')?.textContent || ''));
    return more.querySelector('.hl-pick-btn')?.focus({ preventScroll: true });
  });
}
