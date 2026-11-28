// Cabecera (feedback de María, punto 7): la racha ya no lleva un sol con un número (lo pulsó creyendo
// que era el interruptor de modo claro) sino una llama y «n día(s)»; el anillo de la meta lleva su
// cifra «hecho/meta». Sin navegador: el módulo construye HTML y se comprueba el texto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { defaultState } from '../app/js/state/schema.js';
import { emptyProgress, DEFAULT_GOAL } from '../app/js/engine/progress.js';
import { icons } from '../app/js/ui/icons.js';
import { topBar, streakGoalChip, streakTip, cuadroChip } from '../app/js/ui/shell.js';
import { cropRect, tryLabel } from '../app/js/engine/cuadro-calendar.js';

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..', 'app');
const TODAY = '2026-11-24';

function ctxWith({ streak = 0, xpToday = 0, goal = DEFAULT_GOAL } = {}) {
  const progress = emptyProgress();
  if (streak) progress.streak = { current: streak, best: streak, last: TODAY, graceOn: null, days: [TODAY] };
  progress.xpByDay = { [TODAY]: xpToday };
  return { store: { get: () => ({ progress, settings: { ...defaultState().settings, dailyGoal: goal } }) }, today: () => TODAY, dailyDay: () => TODAY };
}

test('cabecera: meta y racha en una sola pieza (la llama dentro del aro de la meta) que se explica al tocarla, nunca un sol', () => {
  assert.equal(icons.sun, undefined, 'el icono de sol sigue existiendo');
  assert.ok(typeof icons.flame === 'function' && icons.flame(16).includes('<svg') && icons.flame(16).includes('aria-hidden="true"'));
  const one = streakGoalChip(1, 20, 50);
  assert.ok(one.includes('aria-label="Racha: 1 día. Meta de hoy: 20 de 50 puntos"') && one.includes('>1<') && one.includes('>día<'));
  assert.ok(one.includes(icons.flame(16)) && one.includes('class="ring-fill"'), 'la llama va dentro del aro de la meta');
  assert.ok(one.includes('data-tip="Hoy empieza tu racha. El aro se llena con tu meta de hoy: 20 de 50 puntos."'), one);
  assert.doesNotMatch(one, /\d+\/\d+</, 'sin la cifra «20/50» que no se entendía');
  assert.equal(streakTip(0, 0, 50), 'Juega hoy y empieza tu racha. El aro se llena con tu meta de hoy: 0 de 50 puntos.');
  assert.equal(streakTip(4, 80, 50), 'Llevas 4 días seguidos jugando. El aro se llena con tu meta de hoy: 50 de 50 puntos.');
  assert.ok(streakGoalChip(3, 80, 50).includes('is-met'), 'meta cumplida: el aro entero');
  for (const html of [topBar(ctxWith({ streak: 3 })), topBar(ctxWith())]) {
    assert.ok(!/\bsol\b/i.test(html) && !html.includes('sun'), 'la cabecera menciona un sol');
    assert.ok(html.includes('<span>Sfumato</span>'), 'la cabecera lleva el nombre');
    assert.ok(html.includes('class="chip chip-streak"') && !html.includes('chip-goal'));
  }
  const files = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? files(p) : n.endsWith('.js') ? [p] : []; });
  for (const f of files(join(app, 'js'))) assert.ok(!readFileSync(f, 'utf8').includes('icons.sun'), `${f} usa icons.sun`);
});

test('cabecera: el Cuadro del día está en la cabecera: pendiente con su detalle y el punto; hecho, la miniatura con ✓', () => {
  const work = { id: 'w1', w: 1000, h: 500 };
  const early = topBar(ctxWith());
  assert.ok(early.includes('class="chip chip-cuadro"') && early.includes('href="#cuadro-del-dia"') && early.includes('aria-label="Cuadro del día, pendiente"') && early.includes('chip-dot'),
    'sin calendario aún: el icono con el punto');
  assert.ok(!early.includes('chip-level') && !early.includes('chip-daily'), 'ni rango ni reto diario');
  const today = { artwork: 'w1', focus: [0.5, 0.5], crop: cropRect(work, [0.5, 0.5], 3), labelFor: tryLabel };
  const pending = cuadroChip(today, null, work);
  assert.ok(pending.includes('img/g/w1.jpg') && pending.includes('background-size:600.0% 300.0%') && pending.includes('chip-dot'), 'el detalle del paso 1 (×3) en el círculo');
  const done = cuadroChip(today, { n: 3, guesses: ['a', 'b'], won: true, tries: 2 }, work);
  assert.ok(done.includes('is-done') && done.includes('img/t/w1.jpg') && done.includes('chip-cuadro-ok') && !done.includes('chip-dot'));
  assert.ok(done.includes('aria-label="Cuadro del día, hecho: a la segunda"'));
  const lost = cuadroChip(today, { n: 3, guesses: ['a', 'b', 'c', 'd'], won: false, tries: 4 }, work);
  assert.ok(lost.includes('aria-label="Cuadro del día, hecho: esta vez no"'));
  assert.ok(cuadroChip(null, { n: 3, guesses: ['a'], won: true, tries: 1 }, work).includes('aria-label="Cuadro del día, hecho"'), 'sin calendario aún');
  const ctx = { ...ctxWith(), index: { artwork: () => work }, cuadroToday: () => ({ ...today, n: 3, slot: 3 }) };
  ctx.store.get().progress.cuadros = { [TODAY]: { n: 3, guesses: ['a'], won: true, tries: 1 } };
  assert.ok(topBar(ctx).includes('hecho: a la primera'));
});

test('cabecera: «Repasar» (↻) lleva a #repaso, aparece desde 3 cuadros vistos, sin candado, y el punto solo con algo pendiente', async () => {
  const { reviewChip, reviewState, topBar: bar } = await import('../app/js/ui/shell.js');
  const { bigIndex } = await import('./helpers.js');
  const index = bigIndex();
  const a = index.path[0];
  const progress = emptyProgress();
  progress.artists[a.id] = { plays: 1, best: 0.9, mastered: true, last: TODAY };
  const ctx = { ...ctxWith(), index, store: { get: () => ({ progress, settings: defaultState().settings }) } };
  index.worksOf(a.id).slice(0, 2).forEach((w) => { progress.srs[`art:${w.id}`] = { box: 3, due: '2026-12-20' }; });
  assert.equal(reviewState(ctx), null, 'con 2 cuadros vistos aún no aparece');
  assert.doesNotMatch(bar(ctx), /chip-review|lock/);
  progress.srs[`art:${index.worksOf(a.id)[2].id}`] = { box: 3, due: '2026-12-20' };
  assert.deepEqual(reviewState(ctx), { pending: false });
  const calm = reviewChip(reviewState(ctx));
  assert.ok(calm.includes('href="#repaso"') && calm.includes('aria-label="Repasar"') && calm.includes(icons.repeat(20)));
  assert.ok(!calm.includes('chip-dot'), 'sin nada pendiente, sin punto');
  progress.fallados = [{ id: index.worksOf(a.id)[0].id, date: TODAY, times: 1, hits: 0 }];
  const due = reviewChip(reviewState(ctx));
  assert.ok(!reviewChip(reviewState(ctx), false).includes('chip-dot'), 'con el Cuadro del día pendiente, un solo punto: el suyo');
  ctx.store.get().progress.cuadros = {};
  assert.ok(!bar(ctx).match(/chip-review[^]*?<\/a>/)[0].includes('chip-dot'), 'en la cabecera, sin Cuadro del día hecho, «Repasar» no lleva punto');
  assert.ok(due.includes('chip-dot') && due.includes('hay cuadros pendientes') && !/\d/.test(due.replace(/<svg[^]*?<\/svg>/g, '').replace(/\d+(px|em)/g, '')), 'punto sin número');
  const html = bar(ctx);
  assert.ok(html.indexOf('chip-streak') < html.indexOf('chip-review') && html.indexOf('chip-review') < html.indexOf('chip-cuadro'), 'entre la racha y el Cuadro del día');
});
