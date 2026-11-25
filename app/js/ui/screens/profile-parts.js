// Piezas del perfil (HTML): tres cifras, «Mi museo», test y «Seguir practicando». La identidad está en
// profile-hero.js, los logros en profile-medals.js y los ajustes en profile-settings.js.

import { esc, longDate } from '../dom.js';
import { icons } from '../icons.js';
import { tinyFrame } from './profile-art.js';
import { museumWorks, collectionIds, compactNumber, plural, MUSEUM_SIZE } from '../../engine/profile.js';
import { artistStatus, isPathMastered, pathProgress } from '../../engine/progress.js';
import { review5Works, REVIEW5_MIN, REVIEW5_NAME } from '../../engine/review.js';
import { isoWeek } from '../../engine/dates.js';

const SHARE = '<svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/></svg>';
const nf = (n) => n.toLocaleString('es-ES');

// Tres cifras grandes, sin cajas: cuadros vistos (los de tu colección: los mismos que cuentan Colección e
// inicio y los que cuelgan en «Mi museo»; una sola palabra, «vistos», en toda la app), pintores dominados y
// XP. La racha ya está en la cabecera de la app.
export function figuresHtml(ctx) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const pictures = collectionIds(p, index).length;
  const painters = index.path.filter((a) => artistStatus(p, index, a.id) === 'mastered').length;
  // Las cifras grandes no se parten: se abrevian («31,2 mil») y la exacta queda para lectores de pantalla.
  const num = (n) => (compactNumber(n) === String(n) ? nf(n) : `<span aria-hidden="true">${compactNumber(n)}</span><span class="sr-only">${nf(n)}</span>`);
  const fig = (icon, n, label, sub) => `<li class="pf-fig"><span class="pf-fig-icon" aria-hidden="true">${icon}</span><strong class="pf-fig-num${compactNumber(n) === String(n) ? '' : ' is-compact'}">${num(n)}</strong><span class="pf-fig-label">${label}</span>${sub ? `<span class="pf-fig-sub">${sub}</span>` : ''}</li>`;
  return `<section class="pf-figs-sec" aria-labelledby="pf-figs-h"><h2 id="pf-figs-h" class="sr-only">Tus cifras</h2><ul class="pf-figs">
    ${fig(icons.frames(22), pictures, pictures === 1 ? 'cuadro visto' : 'cuadros vistos', '')}
    ${fig(icons.eye(22), painters, painters === 1 ? 'pintor dominado' : 'pintores dominados', '')}
    ${fig(icons.gem(22), p.xp, 'XP', 'en total')}
  </ul></section>`;
}

// Usuario nuevo: en vez de ceros, para qué sirve esto y por dónde empezar.
export function welcomeHtml() {
  return `<section class="pf-sec pf-welcome-sec" aria-labelledby="pf-welcome-h">
    <h2 id="pf-welcome-h">Aquí vivirá tu museo</h2>
    <p class="pf-lead">Cada cuadro que veas jugando se colgará aquí, y entonces podrás elegir tu portada y tu avatar.</p>
    <a class="btn btn-primary btn-wide" href="#inicio">Ir al camino</a>
  </section>`;
}

// «Mi museo»: los últimos cuadros de la colección en 3×3; se abren en el visor y se pasan deslizando.
// Solo se pinta con algún cuadro (sin ninguno, el perfil enseña la bienvenida).
export function museumHtml(ctx) {
  const works = museumWorks(ctx.store.get().progress, ctx.index);
  const tiles = works.map((w) => `<li>${tinyFrame(w, { alt: '', cls: 'pf-tile', label: w.title, zoom: { group: 'museo' } })}</li>`);
  // Huecos solo para completar la fila: con un cuadro, dos marcos vacíos; no ocho.
  const slots = Math.min(MUSEUM_SIZE, Math.max(3, Math.ceil(works.length / 3) * 3));
  while (tiles.length < slots) tiles.push('<li class="pf-tile pf-tile-empty" aria-hidden="true"></li>');
  return `<section class="pf-sec pf-museum-sec" aria-labelledby="pf-museum-h">
    <div class="pf-sec-head"><h2 id="pf-museum-h">Mi museo</h2><a class="pf-link" href="#coleccion">Ver todo</a></div>
    <p class="pf-lead">Último en colgarse: ${esc(works[0]?.title || '')}</p>
    <ul class="pf-museum">${tiles.join('')}</ul>
  </section>`;
}

// «Tu test de pintura»: último resultado (si lo hay) y los botones. `primary`: el botón de hacer el test
// es el principal de la pantalla (si no, lo es otro, como «Ir al camino» sin cuadros).
export function testHtml(last, { primary = true } = {}) {
  const result = last ? `<div class="pf-test-card">
      ${last.level ? `<p class="pf-test-level">${esc(last.level)}</p>` : ''}
      <p class="pf-test-score"><strong>${last.correct}</strong> de ${last.asked}${last.percentile != null ? ` · Sabes más de pintura que el <strong>${last.percentile} %</strong> de la gente` : ''}</p>
      ${last.date ? `<p class="pf-test-date">Hecho el ${esc(longDate(last.date).toLowerCase())}</p>` : ''}
    </div>` : '';
  return `<section class="pf-sec pf-test-sec" aria-labelledby="pf-test-h">
    <div class="pf-sec-head"><h2 id="pf-test-h">Tu test de pintura</h2></div>
    ${result}
    <div class="pf-actions">
      <a class="btn ${last || !primary ? 'btn-secondary' : 'btn-primary'}" href="test/">${last ? 'Repetir el test' : 'Hacer el test'}</a>
      ${last ? `<button type="button" class="btn btn-primary" data-action="share-test">${SHARE}<span>Compartir</span></button>` : ''}
    </div>
  </section>`;
}

// «Seguir practicando»: el repaso de 5 (si hay) y el reto semanal; sin el camino dominado, el reto se ve
// bloqueado y dice lo que falta (una fila que no se pulsa y lo parece: candado y sin flecha).
export function practiceHtml(ctx) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const row = (it) => (it.locked
    ? `<li><div class="pf-go is-locked"><span class="pf-go-icon" aria-hidden="true">${icons.lock(22)}</span><span class="pf-go-name">${esc(it.name)}<span class="pf-go-sub">${esc(it.sub)}</span></span></div></li>`
    : `<li><button type="button" class="pf-go" data-action="${it.action}">
      <span class="pf-go-icon" aria-hidden="true">${it.icon}</span><span class="pf-go-name">${esc(it.name)}</span>
      ${it.done ? `<span class="pf-go-done"><span class="sr-only">Hecho: </span>${icons.check(16)}${esc(it.done)}</span>` : ''}
      <span class="pf-go-next" aria-hidden="true">${icons.next(20)}</span></button></li>`);
  const items = [];
  // El repaso se ve siempre: sin cuadros que repasar, bloqueado y con el motivo.
  if (review5Works(p, index, ctx.today()).length >= REVIEW5_MIN) {
    items.push({ action: 'review5', icon: icons.repeat(24), name: REVIEW5_NAME, done: '' });
  } else {
    items.push({ locked: true, name: REVIEW5_NAME, sub: `Vuelve cuando tengas ${REVIEW5_MIN} cuadros que repasar` });
  }
  if (isPathMastered(p, index)) {
    const week = p.weekly?.[isoWeek(ctx.dailyDay()).key];
    items.push({ action: 'weekly', icon: icons.target(24), name: 'Reto semanal', done: week ? `${week.score}/${week.total}` : '' });
  } else {
    const pp = pathProgress(p, index);
    const left = pp.total - pp.mastered;
    // Sin ninguna parada dominada, una cifra grande desanima: solo se dice cómo se abre.
    const sub = pp.mastered === 0 ? 'Se abre al dominar el camino' : `Domina el camino: te ${left === 1 ? 'queda' : 'quedan'} ${plural(left, 'parada', 'paradas')}`;
    items.push({ locked: true, name: 'Reto semanal', sub });
  }
  return `<section class="pf-sec pf-practice-sec" aria-labelledby="pf-practice-h">
    <div class="pf-sec-head"><h2 id="pf-practice-h">Seguir practicando</h2></div>
    <ul class="pf-practice">${items.map(row).join('')}</ul>
  </section>`;
}
