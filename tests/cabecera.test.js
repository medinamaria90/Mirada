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
import { topBar, goalChip, streakChip, dailyChip } from '../app/js/ui/shell.js';

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..', 'app');
const TODAY = '2026-11-24';

function ctxWith({ streak = 0, xpToday = 0, goal = DEFAULT_GOAL } = {}) {
  const progress = emptyProgress();
  if (streak) progress.streak = { current: streak, best: streak, last: TODAY, graceOn: null, days: [TODAY] };
  progress.xpByDay = { [TODAY]: xpToday };
  return { store: { get: () => ({ progress, settings: { ...defaultState().settings, dailyGoal: goal } }) }, today: () => TODAY, dailyDay: () => TODAY };
}

test('cabecera: la racha lleva una llama y «n día(s)», nunca un sol', () => {
  assert.equal(icons.sun, undefined, 'el icono de sol sigue existiendo');
  assert.ok(typeof icons.flame === 'function' && icons.flame(18).includes('<svg') && icons.flame(18).includes('aria-hidden="true"'));
  const one = streakChip(1);
  assert.ok(one.includes('aria-label="Racha: 1 día"') && one.includes('>1<') && one.includes('>día<'));
  const three = streakChip(3);
  assert.ok(three.includes('aria-label="Racha: 3 días"') && three.includes('>3<') && three.includes('>días<'));
  assert.ok(three.includes(icons.flame(18)), 'el chip no lleva la llama');
  assert.ok(three.includes('href="#perfil"'), 'el chip ya no abre el perfil');
  for (const html of [topBar(ctxWith({ streak: 3 })), topBar(ctxWith())]) {
    assert.ok(!/\bsol\b/i.test(html) && !html.includes('sun'), 'la cabecera menciona un sol');
    assert.ok(html.includes('class="chip chip-streak"'));
  }
  assert.ok(topBar(ctxWith()).includes('aria-label="Racha: 0 días"'), 'sin racha, «0 días»');
  // Ningún otro módulo pide el sol.
  const files = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? files(p) : n.endsWith('.js') ? [p] : []; });
  for (const f of files(join(app, 'js'))) assert.ok(!readFileSync(f, 'utf8').includes('icons.sun'), `${f} usa icons.sun`);
});

test('cabecera: el anillo de la meta lleva la cifra «hecho/meta» y conserva su aria-label', () => {
  assert.ok(goalChip(0, 50).includes('aria-label="Meta de hoy: 0 de 50 XP"') && goalChip(0, 50).includes('<span class="chip-goal-text">0/50</span>'));
  assert.ok(goalChip(80, 50).includes('>50/50<') && goalChip(80, 50).includes('is-met'), 'por encima de la meta se topa en la meta');
  const html = topBar(ctxWith({ xpToday: 20, goal: 100 }));
  assert.ok(html.includes('class="chip chip-goal"') && html.includes('Meta de hoy: 20 de 100 XP') && html.includes('>20/100<'));
});

test('cabecera: el reto diario está en la cabecera (sin chip de rango): pendiente o hecho con «4/5», hacia el reto', () => {
  const pending = topBar(ctxWith());
  assert.ok(pending.includes('class="chip chip-daily"') && pending.includes('href="#reto-diario"') && pending.includes('aria-label="Reto diario, pendiente"'));
  assert.ok(!pending.includes('chip-level') && !pending.includes('minibar'), 'el chip del rango sigue en la cabecera');
  const done = dailyChip({ score: 4, total: 5 });
  assert.ok(done.includes('is-done') && done.includes('>4/5<') && done.includes('aria-label="Reto diario, hecho: 4 de 5"') && done.includes(icons.calendar(18)));
  const ctx = ctxWith();
  const state = ctx.store.get();
  state.progress.daily = { [TODAY]: { score: 5, total: 5 } };
  assert.ok(topBar(ctx).includes('>5/5<'));
});

test('cabecera: «Repasar» (↻) lleva a #repaso, aparece desde 3 cuadros vistos, sin candado, y el punto solo con algo pendiente', async () => {
  const { reviewChip, reviewState, topBar: bar, REVIEW_PLACE } = await import('../app/js/ui/shell.js');
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
  assert.ok(due.includes('chip-dot') && due.includes('hay cuadros pendientes') && !/\d/.test(due.replace(/<svg[^]*?<\/svg>/g, '').replace(/\d+(px|em)/g, '')), 'punto sin número');
  if (REVIEW_PLACE === 'header') {
    const html = bar(ctx);
    assert.ok(html.indexOf('chip-streak') < html.indexOf('chip-review') && html.indexOf('chip-review') < html.indexOf('chip-daily'), 'entre la racha y el reto diario');
  }
});
