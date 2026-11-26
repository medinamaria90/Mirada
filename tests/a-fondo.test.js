// Niveles «a fondo»: ruta, etapas de la ficha, celebración en el resultado (a fondo, rango y
// cobertura) y ronda guardada con su nivel.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { emptyProgress } from '../app/js/engine/progress.js';
import { parseRoute, deepRoute } from '../app/js/ui/router.js';
import { stageList } from '../app/js/engine/painters.js';
import { planStage } from '../app/js/engine/planner.js';
import { finishRound } from '../app/js/engine/finish.js';
import { makeSession, readSession } from '../app/js/state/session.js';

const here = dirname(fileURLToPath(import.meta.url));
const real = buildIndex(JSON.parse(readFileSync(join(here, '..', 'app', 'data', 'catalog.json'), 'utf8')));

test('ruta «a fondo»: a-fondo-<pintor>-<nivel>, con ids con guiones, y no confunde otras rutas', () => {
  assert.equal(deepRoute('el-greco', 3), 'a-fondo-el-greco-3');
  assert.deepEqual(parseRoute('#a-fondo-el-greco-3'), { name: 'deep', artistId: 'el-greco', level: 3 });
  assert.deepEqual(parseRoute('#a-fondo-goya-2'), { name: 'deep', artistId: 'goya', level: 2 });
  assert.equal(parseRoute('#a-fondo-goya-1').name, 'invalid', 'el nivel 1 no es «a fondo»');
  assert.equal(parseRoute('#a-fondo-goya').name, 'invalid');
  assert.equal(parseRoute('#etapa-goya').name, 'stage');
});

test('ficha: etapas con su estado; la segunda se abre al dominar la primera', () => {
  const p = emptyProgress();
  p.artists.goya = { plays: 1, mastered: true };
  let st = stageList(p, real, 'goya');
  assert.equal(st[0].status, 'available');
  assert.equal(st[1].status, 'locked');
  p.deep[`goya:${st[0].id}`] = { plays: 1, best: 0.9, mastered: true };
  st = stageList(p, real, 'goya');
  assert.deepEqual([st[0].status, st[1].status], ['mastered', 'available']);
});

function answersFor(plan, ok) {
  return plan.questions.map((q) => ({ q, correct: ok, retry: false, combo: 0 }));
}

test('ronda «a fondo»: celebra deep-mastered, no toca la parada y el plan lleva su nivel', () => {
  const p = emptyProgress();
  p.artists.goya = { plays: 1, best: 1, mastered: true, works: real.worksOf('goya').filter((w) => w.level === 1).map((w) => w.id) };
  const level = real.deepLevels('goya')[0].id;
  const plan = planStage(real, 'goya', 7, { level });
  assert.equal(plan.level, level);
  const res = finishRound(p, real, { kind: 'stage', artistId: 'goya', level, answers: answersFor(plan, true), firstTry: plan.questions.map(() => true) }, '2026-11-25', {});
  assert.ok(res.events.some((e) => e.type === 'deep-mastered' && e.artistId === 'goya' && e.level === level), JSON.stringify(res.events));
  assert.equal(res.progress.artists.goya.mastered, true);
  assert.equal(res.progress.artists.goya.plays, 1, 'la parada del camino no suma partidas');
});

test('ronda guardada: el nivel «a fondo» sobrevive a recargar', () => {
  const plan = planStage(real, 'goya', 7, { level: 2 });
  const round = { queue: plan.questions.map((q, i) => ({ q, base: i, retry: false })), pos: 0, baseCount: plan.questions.length, firstTry: plan.questions.map(() => null), combo: 0, bestCombo: 0 };
  const meta = { route: 'a-fondo-goya-2', title: 't', accent: '', kind: 'stage', extra: { artistId: 'goya', level: 2 }, plan: { kind: 'stage', seed: 7, artistId: 'goya', level: 2 } };
  const s = makeSession(meta, { round, answers: [], xpLive: 0 }, Date.now());
  const back = readSession({ session: JSON.parse(JSON.stringify(s)) }, real, Date.now());
  assert.ok(back, 'la sesión no vale');
  assert.equal(back.extra.level, 2);
  assert.equal(back.plan.level, 2);
});
