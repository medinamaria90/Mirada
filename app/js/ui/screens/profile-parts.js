// Piezas del perfil (HTML): identidad, tres cifras, «Mi museo», test y «Seguir practicando».
// Los logros están en profile-medals.js y los ajustes en profile-settings.js.

import { esc, plural } from '../dom.js';
import { icons, logoMark } from '../icons.js';
import { artFrame } from '../art.js';
import { rankFor } from '../../engine/ranks.js';
import { rankProgress, coverWork, museumWorks, initialOf, MUSEUM_SIZE } from '../../engine/profile.js';
import { recognizedCount } from '../../engine/goals.js';
import { visibleStreak, graceLeft, artistStatus, isPathMastered } from '../../engine/progress.js';
import { review5Works, REVIEW5_MIN, REVIEW5_NAME } from '../../engine/review.js';
import { isoWeek } from '../../engine/dates.js';

const PENCIL = '<svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/></svg>';

// Días de gracia que quedan esta semana (se recargan el lunes): un día perdido no rompe la racha.
export function graceLine(left) {
  if (left <= 0) return 'Sin días de gracia hasta el lunes';
  return left === 1 ? 'Te queda 1 día de gracia esta semana' : `Te quedan ${left} días de gracia esta semana`;
}

const graceShort = (left) => (left <= 0 ? 'Sin gracia' : left === 1 ? '1 día de gracia' : `${left} días de gracia`);

function avatar(name) {
  const initial = initialOf(name);
  return `<span class="pf-avatar ${initial ? 'has-initial' : ''}" aria-hidden="true">${initial ? `<span class="pf-initial">${esc(initial)}</span>` : logoMark(46)}</span>`;
}

function cover(work) {
  if (!work) return `<div class="pf-cover is-empty" aria-hidden="true">${logoMark(120)}</div>`;
  return `<div class="pf-cover">${artFrame(work, { alt: '', cls: 'pf-cover-art', label: work.title, eager: true, zoom: { group: 'portada' } })}</div>`;
}

// Portada, avatar, saludo con lápiz y rango con su barra.
export function heroHtml(ctx) {
  const { index } = ctx;
  const state = ctx.store.get();
  const p = state.progress;
  const name = state.settings.name || '';
  const rank = rankFor(p, index);
  const bar = rankProgress(rank);
  const pct = Math.round(bar.fraction * 100);
  const greeting = name ? `Hola, ${esc(name)}` : 'Ponte un nombre';
  const next = bar.next
    ? `<p class="pf-rank-next">Para ${esc(bar.next)}: ${esc(bar.parts.join(' · '))}</p>`
    : '<p class="pf-rank-next">El rango más alto</p>';
  return `<header class="pf-hero">
    ${cover(coverWork(p, index))}
    <button type="button" class="pf-gear" data-action="open-settings" aria-label="Ajustes" aria-haspopup="dialog">${icons.gear(24)}</button>
    <div class="pf-id">
      ${avatar(name)}
      <h1 class="pf-greeting" id="pf-greeting"><button type="button" class="pf-name-btn ${name ? '' : 'is-empty'}" data-action="edit-name" aria-haspopup="dialog" aria-label="${name ? `Hola, ${esc(name)}. Cambiar nombre` : 'Ponte un nombre'}"><span class="pf-name-text">${greeting}</span>${PENCIL}</button></h1>
    </div>
    <div class="pf-rank">
      <p class="pf-rank-name">${icons.gem(20)}<span>${esc(rank.name)}</span></p>
      <div class="pf-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${bar.next ? `Avance hacia ${esc(bar.next)}` : 'Rango más alto'}"><span style="width:${pct}%"></span></div>
      ${next}
    </div>
  </header>`;
}

// Tres cifras grandes, sin cajas: cuadros que reconoces, pintores dominados y racha con su gracia.
export function figuresHtml(ctx) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const today = ctx.today();
  const pictures = recognizedCount(p, index);
  const painters = index.path.filter((a) => artistStatus(p, index, a.id) === 'mastered').length;
  const streak = visibleStreak(p.streak, today);
  const left = graceLeft(p.streak, today);
  const fig = (icon, n, label, extra = '', aria = '') => `<li class="pf-fig"${aria ? ` aria-label="${esc(aria)}"` : ''}>
      <span class="pf-fig-icon" aria-hidden="true">${icon}</span><strong class="pf-fig-num">${n}</strong><span class="pf-fig-label">${label}</span>${extra}</li>`;
  return `<section aria-labelledby="pf-figs-h"><h2 id="pf-figs-h" class="sr-only">Tus cifras</h2><ul class="pf-figs">
    ${fig(icons.frames(22), pictures, pictures === 1 ? 'cuadro' : 'cuadros')}
    ${fig(icons.eye(22), painters, painters === 1 ? 'pintor' : 'pintores')}
    ${fig(icons.flame(22), streak, streak === 1 ? 'día seguido' : 'días seguidos', `<span class="pf-fig-sub">${graceShort(left)}</span>`, `${plural(streak, 'día seguido', 'días seguidos')}. ${graceLine(left)}`)}
  </ul></section>`;
}

// «Mi museo»: los últimos cuadros reconocidos en 3×3; se abren en el visor y se pasan deslizando.
export function museumHtml(ctx) {
  const works = museumWorks(ctx.store.get().progress, ctx.index);
  const tiles = works.map((w) => `<li>${artFrame(w, { alt: '', cls: 'pf-tile', label: w.title, thumb: true, zoom: { group: 'museo' } })}</li>`);
  while (tiles.length < MUSEUM_SIZE) tiles.push('<li class="pf-tile pf-tile-empty" aria-hidden="true"></li>');
  return `<section class="pf-sec" aria-labelledby="pf-museum-h">
    <div class="pf-sec-head"><h2 id="pf-museum-h">Mi museo</h2>${works.length ? '<a class="pf-link" href="#coleccion">Ver todo</a>' : ''}</div>
    <ul class="pf-museum">${tiles.join('')}</ul>
    ${works.length ? '' : '<a class="btn btn-primary btn-wide pf-cta" href="#inicio">Ir al camino</a>'}
  </section>`;
}

// «Tu test de pintura»: último resultado (si lo hay) y los botones.
export function testHtml(last) {
  const result = last ? `<div class="pf-test-card">
      <p class="pf-test-level">${esc(last.level)}</p>
      <p class="pf-test-score"><strong>${last.correct}</strong> de ${last.asked}${last.percentile != null ? ` · Sabes más de pintura que el <strong>${last.percentile} %</strong> de la gente` : ''}</p>
    </div>` : '';
  return `<section class="pf-sec" aria-labelledby="pf-test-h">
    <div class="pf-sec-head"><h2 id="pf-test-h">Tu test de pintura</h2></div>
    ${result}
    <div class="pf-actions">
      <a class="btn ${last ? 'btn-secondary' : 'btn-primary'}" href="test/">Hacer el test</a>
      ${last ? `<button type="button" class="btn btn-secondary" data-action="share-test">${icons.copy(20)}<span>Compartir</span></button>` : ''}
    </div>
  </section>`;
}

// «Seguir practicando»: el repaso de 5 (si hay) y el reto semanal (con el camino dominado).
export function practiceHtml(ctx) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const items = [];
  if (review5Works(p, index, ctx.today()).length >= REVIEW5_MIN) {
    items.push({ action: 'review5', icon: icons.repeat(24), name: REVIEW5_NAME, done: '' });
  }
  if (isPathMastered(p, index)) {
    const week = p.weekly?.[isoWeek(ctx.dailyDay()).key];
    items.push({ action: 'weekly', icon: icons.target(24), name: 'Reto semanal', done: week ? `${week.score}/${week.total}` : '' });
  }
  if (!items.length) return '';
  return `<section class="pf-sec" aria-labelledby="pf-practice-h">
    <div class="pf-sec-head"><h2 id="pf-practice-h">Seguir practicando</h2></div>
    <ul class="pf-practice">${items.map((it) => `<li><button type="button" class="pf-go" data-action="${it.action}">
      <span class="pf-go-icon" aria-hidden="true">${it.icon}</span><span class="pf-go-name">${esc(it.name)}</span>
      ${it.done ? `<span class="pf-go-done"><span class="sr-only">Hecho: </span>${icons.check(16)}${esc(it.done)}</span>` : ''}
      <span class="pf-go-next" aria-hidden="true">${icons.next(20)}</span></button></li>`).join('')}</ul>
  </section>`;
}
