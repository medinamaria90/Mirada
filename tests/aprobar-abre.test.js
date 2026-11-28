// Aprobar la ronda de un nivel abre el siguiente, como en Duolingo (decisión de María, 28/11). Los cuadros sin ver de un
// nivel aprobado salen primero después (rondas del pintor y «Repasar»), y el estado de antes se migra al cargar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyProgress } from '../app/js/engine/progress.js';
import { finishRound } from '../app/js/engine/finish.js';
import { pendingWorks, approvedPending, deepStatus, levelCovered, seenWorks } from '../app/js/engine/levels.js';
import { essentialOpen } from '../app/js/engine/essentials.js';
import { levelStates, levelRing } from '../app/js/engine/level-ring.js';
import { reviewSession } from '../app/js/engine/review.js';
import { planReviewSession } from '../app/js/engine/planner.js';
import { migrate, defaultState } from '../app/js/state/schema.js';
import { migratePassRule, PASS_RULE } from '../app/js/state/pass-rule.js';
import { realIndex } from './helpers-real.js';

const real = realIndex();
const TODAY = '2026-11-28';
const subject = (q) => (q.type === 'which' ? q.targetArtworkId : q.artworkId);

// María con Rafael: aprobó «Quién fue» (80 %) y le faltaba 1 cuadro del nivel 1 por ver; se guardó sin superar.
function mariaRafael() {
  const level1 = real.levelWorks('rafael', 1).map((w) => w.id);
  const missing = real.levelWorks('rafael', 1).find((w) => w.role !== 'learn').id;
  const progress = {
    ...emptyProgress(),
    artists: { rafael: { plays: 1, best: 0.8, mastered: false, last: '2026-11-27', since: '2026-11-27', works: level1.filter((id) => id !== missing) } },
  };
  return { state: { ...defaultState(), progress }, missing };
}

test('el caso de María: Rafael aprobado con un cuadro sin ver abre su nivel siguiente al cargar', () => {
  const { state, missing } = mariaRafael();
  delete state.progress.passRule;
  const p = migrate(state).progress;
  assert.equal(p.artists.rafael.mastered, true);
  assert.equal(p.medals['artist-rafael'], '2026-11-27');
  const [first, second] = levelStates(p, real, 'rafael');
  assert.deepEqual([first.state, second.state], ['done', 'next'], 'el aro: «Quién fue» hecho y el siguiente abierto');
  assert.ok(levelRing(p, real, 'rafael'));
  assert.equal(deepStatus(p, real, 'rafael', second.level), 'available');
  for (const e of real.essentials.filter((x) => x.artistId === 'rafael' && x.level === second.level)) assert.equal(essentialOpen(p, real, e), true);
  // El cuadro que faltaba no se pierde: sigue pendiente, y el nivel aún no está «completo» (logro, no requisito).
  assert.deepEqual(pendingWorks(p, real, 'rafael', 1).map((w) => w.id), [missing]);
  assert.equal(levelCovered([...seenWorks(p, 'rafael')], real, 'rafael', 1), false);
  assert.deepEqual(approvedPending(p, real, 'rafael', second.level).map((w) => w.id), [missing]);
});

test('migración: solo lo aprobado (≥ 75 %); una sola vez; el estado nuevo ya trae la marca', () => {
  const progress = {
    ...emptyProgress(),
    artists: { giotto: { plays: 2, best: 0.6, mastered: false, last: '2026-11-20' }, rafael: { plays: 1, best: 0.75, mastered: false, last: '2026-11-21' } },
    deep: { 'rafael:2': { plays: 1, best: 0.9, mastered: false, last: '2026-11-22' }, 'giotto:2': { plays: 1, best: 0.5, mastered: false } },
  };
  const out = migratePassRule({ progress }).progress;
  assert.equal(out.artists.giotto.mastered, false);
  assert.equal(out.artists.rafael.mastered, true);
  assert.equal(out.deep['rafael:2'].mastered, true);
  assert.equal(out.deep['giotto:2'].mastered, false);
  assert.equal(out.passRule, PASS_RULE);
  const again = { progress: { ...out, artists: { ...out.artists, giotto: { ...out.artists.giotto, best: 0.9 } } } };
  assert.equal(migratePassRule(again), again, 'con la marca no se toca');
  assert.equal(defaultState().progress.passRule, PASS_RULE);
});

test('aprobar abre el siguiente nivel aunque falten cuadros, y suspender no', () => {
  const { state } = mariaRafael();
  const p = { ...state.progress, artists: {} };
  const next = real.deepLevels('rafael')[0].id;
  const play = (from, ok) => {
    const level1 = real.levelWorks('rafael', 1).filter((w) => w.role !== 'learn').slice(0, 1);
    const q = { type: 'who', artistId: 'rafael', artworkId: level1[0].id };
    const answers = Array.from({ length: 8 }, () => ({ q, correct: ok, retry: false, combo: 1 }));
    return finishRound(from, real, { kind: 'stage', artistId: 'rafael', answers, firstTry: answers.map((a) => a.correct) }, TODAY);
  };
  const low = play(p, false);
  assert.equal(deepStatus(low.progress, real, 'rafael', next), 'locked');
  const pass = play(p, true);
  assert.ok(pendingWorks(pass.progress, real, 'rafael', 1).length > 0, 'quedan cuadros sin ver');
  assert.equal(pass.mastered, true);
  assert.equal(deepStatus(pass.progress, real, 'rafael', next), 'available');
});

test('«Repasar» trae el cuadro sin ver de un nivel aprobado y, al salir, cuenta como visto', () => {
  const { state, missing } = mariaRafael();
  const p = migrate({ ...state, progress: { ...state.progress, passRule: 0 } }).progress;
  const session = reviewSession(p, real, TODAY);
  assert.ok(session.works.includes(missing), 'el cuadro que faltaba entra en el repaso');
  const plan = planReviewSession(real, session, 5);
  const answers = plan.questions.map((q) => ({ q, correct: true, retry: false, combo: 1 }));
  assert.ok(answers.some((a) => subject(a.q) === missing));
  const after = finishRound(p, real, { kind: 'srs', answers, firstTry: answers.map(() => true) }, TODAY).progress;
  assert.equal(pendingWorks(after, real, 'rafael', 1).length, 0);
  assert.equal(levelCovered([...seenWorks(after, 'rafael')], real, 'rafael', 1), true, 'nivel completo, como logro');
});
