import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyProgress, xpForAnswer, levelFor, touchStreak, visibleStreak, finishRound, artistStatus, movementStatus,
  isReviewUnlocked, nextStep, LEVELS, XP,
} from '../app/js/engine/progress.js';
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

test('racha: suma por día, perdona un día una vez por semana y se rompe después', () => {
  let s = emptyProgress().streak;
  s = touchStreak(s, '2026-11-01').streak;
  assert.equal(s.current, 1);
  const same = touchStreak(s, '2026-11-01');
  assert.equal(same.increased, false);
  s = touchStreak(s, '2026-11-02').streak;
  assert.equal(s.current, 2);
  const grace = touchStreak(s, '2026-11-04'); // se salta el día 3
  assert.equal(grace.graceUsed, true);
  assert.equal(grace.streak.current, 3);
  s = grace.streak;
  s = touchStreak(s, '2026-11-06').streak; // segundo hueco en la misma semana: se rompe
  assert.equal(s.current, 1);
  assert.equal(s.best, 3);
  s = touchStreak(s, '2026-11-07').streak;
  s = touchStreak(s, '2026-11-12').streak; // hueco largo
  assert.equal(s.current, 1);
  assert.equal(visibleStreak({ current: 5, last: '2026-11-10', graceOn: null }, '2026-11-11'), 5);
  assert.equal(visibleStreak({ current: 5, last: '2026-11-10', graceOn: null }, '2026-11-12'), 5);
  assert.equal(visibleStreak({ current: 5, last: '2026-11-10', graceOn: null }, '2026-11-13'), 0);
  assert.equal(touchStreak({ ...s }, '2026-11-01').increased, false, 'reloj hacia atrás no rompe');
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
  assert.ok(up.events.some((e) => e.type === 'levelup' && e.level === 1));

  const review = planMovementReview(index, 'mov1', 3);
  const answers = review.questions.map((q) => ({ q, correct: true, retry: false, combo: 1 }));
  const rv = finishRound(emptyProgress(), index, { kind: 'review', movementId: 'mov1', answers, firstTry: answers.map(() => true) }, '2026-11-23');
  assert.ok(rv.progress.medals['movement-mov1']);
});

test('reto diario se registra una sola vez y da medallas', () => {
  const index = bigIndex();
  const plan = planStage(index, 'p11', 1);
  const answers = plan.questions.map((q) => ({ q, correct: true, retry: false, combo: 1 }));
  const res = { kind: 'daily', date: '2026-11-23', answers, firstTry: answers.map(() => true) };
  const r1 = finishRound(emptyProgress(), index, res, '2026-11-23');
  assert.ok(r1.progress.medals['daily-1'] && r1.progress.medals['daily-perfect']);
  const r2 = finishRound(r1.progress, index, { ...res, firstTry: answers.map(() => false) }, '2026-11-23');
  assert.equal(r2.progress.daily['2026-11-23'].score, answers.length, 'el primer resultado se conserva');
});

test('racha de 3 días concede medalla', () => {
  const index = bigIndex();
  let p = emptyProgress();
  for (const d of ['2026-11-01', '2026-11-02', '2026-11-03']) p = playStage(p, index, 'p11', () => true, d).progress;
  assert.ok(p.medals['streak-3']);
});
