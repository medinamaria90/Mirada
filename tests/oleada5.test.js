// Oleada 5: desbloqueo con mérito, retos por enlace validados, rutas inválidas y repaso rápido.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { planStage, planSrsReview, QUICK_REVIEW } from '../app/js/engine/planner.js';
import { decodeChallenge, encodeChallenge, tokenForRound } from '../app/js/engine/challenge.js';
import { planChallenge } from '../app/js/engine/daily.js';
import { planDaily } from '../app/js/engine/daily.js';
import {
  emptyProgress, finishRound, artistStatus, isStepUnlocked, stepPassed, nextStep, UNLOCK_MIN,
} from '../app/js/engine/progress.js';
import { isSpoiler } from '../app/js/engine/questions.js';
import { parseRoute } from '../app/js/ui/router.js';
import { bigIndex } from './helpers.js';

const here = dirname(fileURLToPath(import.meta.url));
const real = buildIndex(JSON.parse(readFileSync(join(here, '..', 'app', 'data', 'catalog.json'), 'utf8')));

function play(progress, index, artistId, correctCount, today = '2026-11-24') {
  const plan = planStage(index, artistId, 1);
  const firstTry = plan.questions.map((_, i) => i < correctCount);
  const answers = plan.questions.map((q, i) => ({ q, correct: firstTry[i], retry: false, combo: 1 }));
  return { ...finishRound(progress, index, { kind: 'stage', artistId, answers, firstTry }, today), total: plan.questions.length };
}

test('desbloqueo con mérito: la siguiente etapa se abre con al menos la mitad de aciertos', () => {
  const index = bigIndex();
  const [first, second] = index.path;
  const n = planStage(index, first.id, 1).questions.length;
  const low = play(emptyProgress(), index, first.id, Math.ceil(n * UNLOCK_MIN) - 1);
  assert.ok(low.accuracy < UNLOCK_MIN);
  assert.equal(artistStatus(low.progress, index, first.id), 'started');
  assert.equal(artistStatus(low.progress, index, second.id), 'locked', 'con menos de la mitad sigue cerrada');
  assert.ok(!low.events.some((e) => e.type === 'unlock'));
  assert.deepEqual(nextStep(low.progress, index), { type: 'artist', id: first.id, movementId: first.movementId }, 'toca repetir');
  // Repetir con la mitad o más la abre y emite el desbloqueo.
  const ok = play(low.progress, index, first.id, Math.ceil(n * UNLOCK_MIN));
  assert.ok(ok.accuracy >= UNLOCK_MIN);
  assert.ok(stepPassed(ok.progress, { type: 'artist', id: first.id }));
  assert.equal(artistStatus(ok.progress, index, second.id), 'available');
  assert.ok(ok.events.some((e) => e.type === 'unlock' && e.artistId === second.id));
  // Lo ya jugado no se vuelve a bloquear aunque el anterior tenga menos de la mitad.
  const p = { ...emptyProgress(), artists: { [first.id]: { plays: 1, best: 0.2 }, [second.id]: { plays: 2, best: 0.8, mastered: true } } };
  assert.equal(artistStatus(p, index, second.id), 'mastered');
  assert.equal(isStepUnlocked(p, index, { type: 'artist', id: second.id }), false);
});

test('retos por enlace: fechas reales, no futuras, desde 2026 y puntuación dentro de la ronda', () => {
  const today = '2026-11-24';
  assert.ok(decodeChallenge('reto-d20261124-9', { today }));
  assert.ok(decodeChallenge('reto-d20260101-3', { today }));
  assert.equal(decodeChallenge('reto-d20261125-9', { today }), null, 'futuro');
  assert.equal(decodeChallenge('reto-d90261124-9', { today }), null, 'año 9026');
  assert.equal(decodeChallenge('reto-d20251231-9', { today }), null, 'antes de 2026');
  assert.equal(decodeChallenge('reto-d20260230-9', { today }), null, 'fecha que no existe');
  assert.equal(decodeChallenge('reto-gzzzzzzzz-1'), null, 'semilla fuera de rango');
  const daily = planDaily(real, '2026-11-23');
  const total = daily.questions.length;
  const okHash = encodeChallenge(tokenForRound(real, daily), total);
  assert.ok(planChallenge(real, decodeChallenge(okHash, { today })));
  const tooMany = decodeChallenge(`reto-d20261123-${total + 1}`, { today });
  assert.ok(tooMany, 'el formato es válido…');
  assert.equal(planChallenge(real, tooMany), null, '…pero la puntuación no cabe en la ronda');
  const stage = planStage(real, real.path[3].id, 77);
  const n = stage.questions.length;
  assert.ok(planChallenge(real, decodeChallenge(encodeChallenge(tokenForRound(real, stage), n))));
  assert.equal(planChallenge(real, decodeChallenge(`reto-${tokenForRound(real, stage)}-${n + 1}`)), null);
  assert.equal(planChallenge(real, decodeChallenge('reto-szzx1-2')), null, 'etapa que no existe');
});

test('rutas: nombres válidos, repaso rápido y enlaces que no valen', () => {
  const today = '2026-11-24';
  assert.deepEqual(parseRoute('', { today }), { name: 'home' });
  assert.deepEqual(parseRoute('#inicio', { today }), { name: 'home' });
  assert.deepEqual(parseRoute('#repaso-rapido', { today }), { name: 'quick' });
  assert.deepEqual(parseRoute('#repaso', { today }), { name: 'srs' });
  assert.equal(parseRoute('#repaso-barroco', { today }).name, 'review');
  assert.equal(parseRoute('#etapa-leonardo', { today }).name, 'stage');
  for (const bad of ['#reto-zzz', '#reto-d20991231-3', '#cualquier-cosa', '#/ruta', '#k=v', '#Inicio']) {
    assert.equal(parseRoute(bad, { today }).name, 'invalid', bad);
  }
});

test('repaso rápido: 3 preguntas de lo que toca hoy, sin obras que delatan y reproducible', () => {
  const due = real.artworks.slice(0, 20).map((w) => `art:${w.id}`).concat(['artist:leonardo']);
  const plan = planSrsReview(real, due, 5, QUICK_REVIEW);
  assert.equal(QUICK_REVIEW, 3);
  assert.equal(plan.questions.length, 3);
  assert.deepEqual(planSrsReview(real, due, 5, QUICK_REVIEW), plan);
  for (const q of plan.questions) assert.ok(!isSpoiler(real.artwork(q.type === 'which' ? q.targetArtworkId : q.artworkId)));
  // Cuenta para la racha y la meta diaria como cualquier ronda.
  const answers = plan.questions.map((q) => ({ q, correct: true, retry: false, combo: 1 }));
  const r = finishRound(emptyProgress(), real, { kind: 'srs', answers, firstTry: answers.map(() => true) }, '2026-11-24', { goal: 50 });
  assert.equal(r.progress.streak.current, 1);
  assert.ok(r.progress.xpByDay['2026-11-24'] >= 50 || r.events.every((e) => e.type !== 'goal'));
  assert.ok(r.xp > 0);
});

test('catálogo en dos partes: lo mínimo para pintar y los textos después; atlas resuelto', async () => {
  const { realCatalogJson, realTextJson, realIndex } = await import('./helpers-real.js');
  const { resolveThumb, mergeCatalogText } = await import('../app/js/engine/catalog.js');
  const core = realCatalogJson();
  assert.ok(core.artworks.every((w) => !('look' in w)) && core.artists.every((a) => !('traits' in a)));
  const idx = realIndex();
  assert.ok(idx.artworks.filter((w) => w.look).length > 150, 'los look llegan con el segundo archivo');
  assert.ok(idx.path.every((a) => a.traits.length === 3));
  assert.ok(realTextJson().look);
  // Región del atlas y rutas seguras.
  const atlas = { sheets: ['img/s/c0.jpg'], size: [[864, 864]] };
  assert.deepEqual(resolveThumb([0, 4, 8, 280, 200], atlas), { src: 'img/s/c0.jpg', x: 4, y: 8, w: 280, h: 200, sw: 864, sh: 864 });
  assert.equal(resolveThumb([3, 4, 8, 280, 200], atlas), null);
  assert.equal(resolveThumb('https://x.y/a.jpg', atlas), null);
  assert.deepEqual(resolveThumb('img/a1.jpg', atlas), { src: 'img/a1.jpg' });
  assert.equal(mergeCatalogText(idx, { look: { nope: 'x' }, traits: { nope: ['y'] } }), 0);
});
