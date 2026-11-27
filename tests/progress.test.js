import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyProgress, xpForAnswer, levelFor, touchStreak, visibleStreak, artistStatus, movementStatus, isReviewUnlocked, nextStep, LEVELS, XP, graceLeft } from '../app/js/engine/progress.js';
import { finishRound } from '../app/js/engine/finish.js';
import { planStage, planMovementReview } from '../app/js/engine/planner.js';
import { bigIndex } from './helpers.js';

function playStage(progress, index, artistId, correctFn, today) {
  const plan = planStage(index, artistId, 1);
  let combo = 0;
  const answers = plan.questions.map((q, i) => {
    const correct = correctFn(i);
    combo = correct ? combo + 1 : 0;
    return { q, correct, retry: false, combo };
  });
  return finishRound(progress, index, { kind: 'stage', artistId, answers, firstTry: answers.map((a) => a.correct) }, today);
}

test('XP por acierto con bonus de cuadro nuevo y de aciertos seguidos', () => {
  assert.equal(xpForAnswer({ correct: false, isNew: true, combo: 0 }), 0);
  assert.equal(xpForAnswer({ correct: true, isNew: false, combo: 1 }), XP.correct);
  assert.equal(xpForAnswer({ correct: true, isNew: true, combo: 1 }), XP.correct + XP.newBonus);
  assert.equal(xpForAnswer({ correct: true, isNew: false, combo: 4 }), XP.correct + 2 * XP.comboStep);
  assert.equal(xpForAnswer({ correct: true, isNew: false, combo: 50 }), XP.correct + XP.comboCap);
  assert.equal(xpForAnswer({ correct: true, isNew: false, combo: 1, retry: true }), XP.correct / 2);
});

test('niveles con nombres y progreso hacia el siguiente', () => {
  assert.equal(levelFor(0).name, 'Curioso');
  assert.equal(levelFor(LEVELS[1].min).name, 'Aficionado');
  assert.equal(levelFor(LEVELS[1].min - 1).index, 0);
  // La curva no se agota: tras el último nivel con nombre siguen «Gran maestro II, III…».
  const last = LEVELS.at(-1);
  assert.equal(levelFor(last.min).name, last.name);
  assert.ok(levelFor(last.min).next, 'siempre hay un nivel siguiente');
  assert.match(levelFor(999999).name, /^Gran maestro [IVXL0-9]+$/);
  assert.ok(levelFor(999999).progress >= 0 && levelFor(999999).progress < 1);
  const mid = levelFor((LEVELS[1].min + LEVELS[2].min) / 2);
  assert.ok(Math.abs(mid.progress - 0.5) < 1e-9);
});

test('racha: suma por día, perdona hasta 2 días por semana (se recargan el lunes) y se rompe después', () => {
  let s = emptyProgress().streak;
  s = touchStreak(s, '2026-11-01').streak; // domingo
  assert.equal(s.current, 1);
  const same = touchStreak(s, '2026-11-01');
  assert.equal(same.increased, false);
  s = touchStreak(s, '2026-11-02').streak; // lunes
  assert.equal(s.current, 2);
  const grace = touchStreak(s, '2026-11-04'); // se salta el 3: primer día de gracia de la semana
  assert.equal(grace.graceUsed, 1);
  assert.equal(grace.streak.current, 3);
  assert.equal(graceLeft(grace.streak, '2026-11-04'), 1);
  const second = touchStreak(grace.streak, '2026-11-06'); // se salta el 5: segundo
  assert.equal(second.graceUsed, 1);
  assert.equal(second.streak.current, 4);
  assert.equal(graceLeft(second.streak, '2026-11-06'), 0);
  s = touchStreak(second.streak, '2026-11-08').streak; // tercer hueco en la misma semana: se rompe
  assert.equal(s.current, 1);
  assert.equal(s.best, 4);
  // El lunes se recargan: dos días seguidos perdidos (lunes 9 y martes 10) caben en la semana nueva.
  assert.equal(graceLeft(s, '2026-11-09'), 2);
  const two = touchStreak(s, '2026-11-11');
  assert.equal(two.graceUsed, 2);
  assert.equal(two.streak.current, 2);
  s = touchStreak(two.streak, '2026-11-12').streak;
  s = touchStreak(s, '2026-11-20').streak; // hueco largo
  assert.equal(s.current, 1);
  assert.equal(visibleStreak({ current: 5, last: '2026-11-10', graceDays: [] }, '2026-11-11'), 5);
  assert.equal(visibleStreak({ current: 5, last: '2026-11-10', graceDays: [] }, '2026-11-12'), 5);
  assert.equal(visibleStreak({ current: 5, last: '2026-11-10', graceDays: [] }, '2026-11-13'), 5, 'dos días perdidos: aún a salvo');
  assert.equal(visibleStreak({ current: 5, last: '2026-11-10', graceDays: [] }, '2026-11-14'), 0);
  assert.equal(visibleStreak({ current: 5, last: '2026-11-10', graceDays: ['2026-11-09'] }, '2026-11-13'), 0, 'solo quedaba uno');
  assert.equal(touchStreak({ ...s }, '2026-11-01').increased, false, 'reloj hacia atrás no rompe');
});

test('racha: cada día perdido gasta la gracia de su propia semana', () => {
  // Gastados los dos de la semana del 2 al 8; se pierde el domingo 8 y se juega el lunes 9: no cabe.
  const full = { current: 7, best: 7, last: '2026-11-07', graceDays: ['2026-11-03', '2026-11-05'], days: [] };
  assert.equal(touchStreak(full, '2026-11-09').streak.current, 1);
  // Con uno libre en esa semana, el domingo perdido cabe aunque se juegue ya en la semana siguiente.
  const one = { ...full, graceDays: ['2026-11-03'] };
  const kept = touchStreak(one, '2026-11-09');
  assert.equal(kept.streak.current, 8);
  assert.deepEqual(kept.streak.graceDays, ['2026-11-03', '2026-11-08']);
  assert.equal(graceLeft(kept.streak, '2026-11-09'), 2, 'la semana nueva empieza con los dos');
});

test('racha por una ronda cualquiera (etapa, repaso, reto semanal, repaso) aunque no se llegue a la meta', () => {
  const index = bigIndex();
  const kinds = [
    { kind: 'stage', artistId: index.path[0].id, plan: planStage(index, index.path[0].id, 1) },
    { kind: 'review', movementId: index.visibleMovements[0].id, plan: planMovementReview(index, index.visibleMovements[0].id, 1) },
    { kind: 'weekly', week: '2026-W45', plan: planStage(index, index.path[0].id, 2) },
    { kind: 'srs', plan: planStage(index, index.path[0].id, 4) },
  ];
  for (const { plan, ...extra } of kinds) {
    let p = emptyProgress();
    p.streak = { current: 3, best: 3, last: '2026-11-02', graceDays: [], days: ['2026-11-02'] };
    const answers = plan.questions.map((q) => ({ q, correct: false, retry: false, combo: 0 }));
    const out = finishRound(p, index, { ...extra, answers, firstTry: answers.map(() => false) }, '2026-11-03', { goal: 200 });
    assert.equal(out.progress.streak.current, 4, `${extra.kind}: la racha no sigue`);
    assert.ok(!out.events.some((e) => e.type === 'goal'), `${extra.kind}: la meta no va aparte`);
    p = out.progress;
  }
});

test('desbloqueos: primer pintor disponible; terminar una etapa abre la siguiente; dominar abre el repaso', () => {
  const index = bigIndex();
  let p = emptyProgress();
  assert.equal(artistStatus(p, index, 'p11'), 'available');
  assert.equal(artistStatus(p, index, 'p12'), 'locked');
  assert.equal(movementStatus(p, index, 'mov2'), 'locked');
  assert.equal(nextStep(p, index).id, 'p11');

  let r = playStage(p, index, 'p11', (i) => i !== 0 && i !== 1, '2026-11-23'); // bajo acierto (falla el calentamiento)
  p = r.progress;
  assert.equal(artistStatus(p, index, 'p11'), 'started');
  assert.equal(artistStatus(p, index, 'p12'), 'available');
  assert.ok(r.events.some((e) => e.type === 'unlock' && e.artistId === 'p12'));
  assert.ok(!p.medals['artist-p11']);

  r = playStage(p, index, 'p11', () => true, '2026-11-23');
  p = r.progress;
  assert.equal(artistStatus(p, index, 'p11'), 'mastered');
  assert.ok(r.events.some((e) => e.type === 'medal' && e.id === 'artist-p11'));

  for (const id of ['p12', 'p13']) p = playStage(p, index, id, () => true, '2026-11-23').progress;
  assert.equal(movementStatus(p, index, 'mov1'), 'mastered');
  assert.ok(isReviewUnlocked(p, index, 'mov1'));
  assert.equal(artistStatus(p, index, 'p21'), 'available');
  assert.equal(movementStatus(p, index, 'mov2'), 'open');
});

test('fin de ronda: XP, colección, SRS, medallas y subida de nivel', () => {
  const index = bigIndex();
  const r = playStage(emptyProgress(), index, 'p21', () => true, '2026-11-23');
  assert.ok(r.xp > 0 && r.progress.xp === r.xp);
  assert.ok(Object.keys(r.progress.collection).length >= 3);
  assert.ok(Object.keys(r.progress.srs).some((k) => k.startsWith('art:')));
  assert.ok(r.progress.srs['artist:p21']);
  assert.ok(r.progress.medals['new-1']);
  assert.equal(r.progress.streak.current, 1);
  assert.equal(r.accuracy, 1);

  let p = { ...emptyProgress(), xp: LEVELS[1].min - 5 };
  const up = playStage(p, index, 'p11', () => true, '2026-11-23');
  assert.ok(!up.events.some((e) => e.type === 'levelup'), 'la escala de niveles ya no se enseña: solo hay rangos');

  const review = planMovementReview(index, 'mov1', 3);
  const answers = review.questions.map((q) => ({ q, correct: true, retry: false, combo: 1 }));
  const rv = finishRound(emptyProgress(), index, { kind: 'review', movementId: 'mov1', answers, firstTry: answers.map(() => true) }, '2026-11-23');
  assert.ok(rv.progress.medals['movement-mov1']);
});

test('una ronda con kind «daily» (reto diario de antes) ya no toca el diario ni da sus medallas', () => {
  const index = bigIndex();
  const plan = planStage(index, 'p11', 1);
  const answers = plan.questions.map((q) => ({ q, correct: true, retry: false, combo: 1 }));
  const r1 = finishRound(emptyProgress(), index, { kind: 'daily', date: '2026-11-23', answers, firstTry: answers.map(() => true) }, '2026-11-23');
  assert.deepEqual(r1.progress.daily, {});
  assert.ok(!r1.progress.medals['daily-1'] && !r1.progress.medals['daily-perfect']);
});

test('racha de 3 días concede medalla', () => {
  const index = bigIndex();
  let p = emptyProgress();
  for (const d of ['2026-11-01', '2026-11-02', '2026-11-03']) p = playStage(p, index, 'p11', () => true, d).progress;
  assert.ok(p.medals['streak-3']);
});
