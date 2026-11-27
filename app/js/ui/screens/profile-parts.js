// Piezas del perfil (HTML): bienvenida y «Practicar» (test de pintura y reto semanal; el repaso va en el botón ↻). La identidad está
// en profile-hero.js, el rango en profile-rank.js, las cifras en profile-stats.js, los logros en profile-medals.js
// y los ajustes en profile-settings.js.

import { esc } from '../dom.js';
import { icons } from '../icons.js';
import { plural } from '../../engine/profile.js';
import { isPathMastered, pathProgress } from '../../engine/progress.js';
import { isoWeek } from '../../engine/dates.js';

const QUESTION = '<svg class="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.6"/><path d="M12 17h.01"/></svg>';
const SHARE = '<svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/></svg>';

// Usuario nuevo: en vez de ceros, para qué sirve esto y por dónde empezar.
export function welcomeHtml() {
  return `<section class="pf-sec pf-welcome-sec" aria-labelledby="pf-welcome-h">
    <h2 id="pf-welcome-h">Tu perfil empieza aquí</h2>
    <p class="pf-lead">Juega y cada cuadro que veas irá a tu Colección. Con ellos podrás elegir tu avatar.</p>
    <a class="btn btn-primary btn-wide" href="#inicio">Ir al camino</a>
  </section>`;
}

// «Practicar»: el test de pintura (con el
// último resultado y «Compartir» al lado, si lo hay) y el reto semanal; sin el camino dominado, el reto se ve
// bloqueado y dice lo que falta (una fila que no se pulsa y lo parece: candado y sin flecha).
export function practiceHtml(ctx, last = null) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const testRow = () => `<li class="pf-go-pair"><a class="pf-go" href="test/">
      <span class="pf-go-icon" aria-hidden="true">${QUESTION}</span><span class="pf-go-name">Test de pintura<span class="pf-go-sub">${last ? esc(`${last.level ? `${last.level} · ` : ''}${last.correct} de ${last.asked}`) : 'Mide lo que sabes'}</span></span>
      <span class="pf-go-next" aria-hidden="true">${icons.next(20)}</span></a>
      ${last ? `<button type="button" class="icon-btn pf-share" data-action="share-test" aria-label="Compartir el resultado del test">${SHARE}</button>` : ''}</li>`;
  const row = (it) => (it.test ? testRow() : it.locked
    ? `<li><div class="pf-go is-locked"><span class="pf-go-icon" aria-hidden="true">${icons.lock(22)}</span><span class="pf-go-name">${esc(it.name)}<span class="pf-go-sub">${esc(it.sub)}</span></span></div></li>`
    : `<li><button type="button" class="pf-go" data-action="${it.action}">
      <span class="pf-go-icon" aria-hidden="true">${it.icon}</span><span class="pf-go-name">${esc(it.name)}</span>
      ${it.done ? `<span class="pf-go-done"><span class="sr-only">Hecho: </span>${icons.check(16)}${esc(it.done)}</span>` : ''}
      <span class="pf-go-next" aria-hidden="true">${icons.next(20)}</span></button></li>`);
  const items = [];
  items.push({ test: true });
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
    <div class="pf-sec-head"><h2 id="pf-practice-h">Practicar</h2></div>
    <ul class="pf-practice">${items.map(row).join('')}</ul>
  </section>`;
}
