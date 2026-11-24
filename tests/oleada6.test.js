// Oleada 6: dominio que exige al propio pintor, camino dominado, obras de atribución dudosa,
// reto semanal, «Ojo de…», cuadros que reconoces, salas de movimientos dominados, detalle del día
// y migración v3 → v4.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { planStage, planMovementReview, planSrsReview, planGeneral } from '../app/js/engine/planner.js';
import { planDaily, planWeekly, planFree, dailyPool, WEEKLY_SIZE } from '../app/js/engine/daily.js';
import { decodeChallenge, encodeChallenge, tokenForRound } from '../app/js/engine/challenge.js';
import { planChallenge } from '../app/js/engine/daily.js';
import { emptyProgress, stageRoundMastered, isPathMastered, isPathComplete, stepsToMaster, hasEye, MASTERY, OWN_MASTERY, needed, EYE_BOX } from '../app/js/engine/progress.js';
import { finishRound } from '../app/js/engine/finish.js';
import { medalInfo } from '../app/js/engine/medal-info.js';
import { isAttributed, noAuthorQuestion, makeWhoQuestion, makeWhichQuestion } from '../app/js/engine/questions.js';
import {
  recognizedCount, RECOGNIZED_BOX, eyeProgress, isGalleryOpen, galleryWorks, openGalleries, 
} from '../app/js/engine/goals.js';
import { isoWeek, expandWeek, isoWeeksIn } from '../app/js/engine/dates.js';
import { migrate, SCHEMA_VERSION, MIGRATIONS } from '../app/js/state/schema.js';
import { createStore, STORAGE_KEY } from '../app/js/state/store.js';
import { parseRoute } from '../app/js/ui/router.js';
import { createRng } from '../app/js/engine/rng.js';
import { MAX_BOX } from '../app/js/engine/srs.js';
import { memoryStorage } from './helpers.js';
import { W } from './helpers-real.js';

const here = dirname(fileURLToPath(import.meta.url));
const real = buildIndex(JSON.parse(readFileSync(join(here, '..', 'app', 'data', 'catalog.json'), 'utf8')));
const TODAY = '2026-11-24';

function masterAll(index, upTo = index.steps.length) {
  const p = emptyProgress();
  index.steps.slice(0, upTo).forEach((s) => {
    const rec = { plays: 1, best: 0.9, mastered: true, last: TODAY };
    if (s.type === 'sala') p.salas[s.id] = rec; else p.artists[s.id] = rec;
  });
  return p;
}

// --- Dominio: 75 % y 2 de cada 3 sobre el propio pintor ------------------------------------

test('dominio de etapa: con el 75 % no basta si se fallan los cuadros del propio pintor', () => {
  const artist = real.path[10];
  const plan = planStage(real, artist.id, 3);
  const own = plan.questions.filter((q) => q.artistId === artist.id);
  assert.ok(own.length >= 2);
  // Todo bien salvo los del pintor (fallados hasta quedar por debajo de 2/3).
  const fails = own.length - needed(own.length, OWN_MASTERY) + 1;
  let failed = 0;
  const answers = plan.questions.map((q) => {
    const correct = !(q.artistId === artist.id && failed++ < fails);
    return { q, correct, retry: false, combo: 1 };
  });
  const firstTry = answers.map((a) => a.correct);
  const accuracy = firstTry.filter(Boolean).length / firstTry.length;
  assert.ok(accuracy >= MASTERY, `${accuracy}`);
  assert.equal(stageRoundMastered(answers, artist.id, accuracy), false);
  const out = finishRound(emptyProgress(), real, { kind: 'stage', artistId: artist.id, answers, firstTry }, TODAY);
  assert.equal(out.mastered, false);
  assert.equal(out.ownShort, true);
  assert.equal(out.progress.artists[artist.id].mastered, false);
  // Todo bien: dominado.
  const all = plan.questions.map((q) => ({ q, correct: true, retry: false, combo: 1 }));
  const ok = finishRound(emptyProgress(), real, { kind: 'stage', artistId: artist.id, answers: all, firstTry: all.map(() => true) }, TODAY);
  assert.equal(ok.mastered, true);
  assert.equal(ok.progress.artists[artist.id].mastered, true);
  // Los reintentos no cuentan para el propio pintor.
  assert.equal(stageRoundMastered([{ q: own[0], correct: true, retry: true }, { q: own[0], correct: false, retry: false }], artist.id, 1), false);
});

test('camino completo solo con todo dominado; si no, cuántas quedan y cuál es la primera', () => {
  const p = masterAll(real);
  assert.ok(isPathMastered(p, real));
  const [a, b] = [real.path[5], real.path[27]];
  p.artists[a.id] = { plays: 1, best: 0.57, mastered: false, last: TODAY };
  p.artists[b.id] = { plays: 1, best: 0.66, mastered: false, last: TODAY };
  assert.ok(isPathComplete(p, real), 'todas jugadas');
  assert.ok(!isPathMastered(p, real), 'pero no dominadas');
  assert.deepEqual(stepsToMaster(p, real).map((s) => s.id), [a.id, b.id]);
});

// --- Atribución dudosa ---------------------------------------------------------------------

test('obra atribuida (atributed: true): «(atribuida)» en el título y nunca en preguntas de autor', () => {
  // El catálogo grande no trae obras de atribución dudosa (el proceso las excluye): se marca una de Leonardo.
  const cat = JSON.parse(readFileSync(join(here, '..', 'app', 'data', 'catalog.json'), 'utf8'));
  const id = W('a154');
  cat.artworks.find((w) => w.id === id).attributed = true;
  const idx = buildIndex(cat);
  const litta = idx.artwork(id);
  assert.ok(litta && isAttributed(litta));
  assert.ok(noAuthorQuestion(litta));
  const rng = createRng('x');
  assert.equal(makeWhoQuestion(idx, litta, 0.5, rng), null);
  assert.equal(makeWhichQuestion(idx, litta, 0.5, rng), null);
  const authorIds = (qs) => qs.filter((q) => q.type !== 'movement').flatMap((q) => [q.artworkId, q.targetArtworkId, ...q.options.map((o) => o.artworkId)]);
  for (let s = 1; s <= 40; s++) {
    for (const a of idx.path.slice(0, 6)) assert.ok(!authorIds(planStage(idx, a.id, s).questions).includes(id), `etapa ${a.id}/${s}`);
    assert.ok(!authorIds(planMovementReview(idx, 'renacimiento', s).questions).includes(id));
    assert.ok(!authorIds(planFree(idx, s).questions).includes(id));
    assert.ok(!authorIds(planGeneral(idx, idx.worksOf('leonardo'), `g${s}`)).includes(id));
  }
  assert.ok(!authorIds(planSrsReview(idx, [`art:${id}`, 'artist:leonardo'], 1).questions).includes(id));
  for (let d = 1; d <= 28; d++) assert.ok(!authorIds(planDaily(idx, `2026-02-${String(d).padStart(2, '0')}`).questions).includes(id));
});

// --- Reto semanal ----------------------------------------------------------------------------

test('semana ISO: casos frontera y semanas reales', () => {
  assert.deepEqual(isoWeek('2026-11-24'), { year: 2026, week: 48, key: '2026-W48', compact: 'w202648' });
  assert.equal(isoWeek('2027-01-01').key, '2026-W53');
  assert.equal(isoWeek('2026-01-01').key, '2026-W01');
  assert.equal(isoWeek('2029-12-31').key, '2030-W01');
  assert.equal(isoWeeksIn(2026), 53);
  assert.equal(isoWeeksIn(2027), 52);
  assert.equal(expandWeek('w202648'), '2026-W48');
  assert.equal(expandWeek('w202753'), null);
  assert.equal(expandWeek('w202600'), null);
});

test('reto semanal: 15 preguntas deterministas por semana, compartible por enlace y validado', () => {
  const a = planWeekly(real, '2026-W48');
  const b = planWeekly(real, '2026-W48');
  assert.equal(a.questions.length, WEEKLY_SIZE);
  assert.deepEqual(a, b, 'misma semana, mismas preguntas');
  assert.notDeepEqual(planWeekly(real, '2026-W49').questions, a.questions);
  const pool = new Set(dailyPool(real).map((w) => w.id));
  for (const q of a.questions) assert.ok(pool.has(q.artworkId || q.targetArtworkId), 'de todo el camino');
  const token = tokenForRound(real, a);
  assert.equal(token, 'w202648');
  const hash = encodeChallenge(token, 12);
  const decoded = decodeChallenge(hash, { today: TODAY });
  assert.deepEqual({ kind: decoded.kind, week: decoded.week, score: decoded.score }, { kind: 'weekly', week: '2026-W48', score: 12 });
  assert.deepEqual(planChallenge(real, decoded).questions, a.questions);
  assert.equal(decodeChallenge('reto-w202649-3', { today: TODAY }), null, 'semana futura');
  assert.equal(decodeChallenge('reto-w202552-3', { today: TODAY }), null, 'antes del juego');
  assert.equal(planChallenge(real, { ...decoded, score: 16 }), null, 'más aciertos que preguntas');
  assert.equal(parseRoute('#reto-semanal').name, 'weekly');
  assert.equal(parseRoute('#reto-w202648-12', { today: TODAY }).name, 'challenge');
});

test('reto semanal: se guarda una vez por semana y da su medalla', () => {
  const plan = planWeekly(real, '2026-W48');
  const answers = plan.questions.map((q, i) => ({ q, correct: i % 3 !== 0, retry: false, combo: 1 }));
  const firstTry = answers.map((x) => x.correct);
  const once = finishRound(masterAll(real), real, { kind: 'weekly', week: '2026-W48', answers, firstTry }, TODAY);
  assert.deepEqual(once.progress.weekly['2026-W48'], { score: 10, total: 15, firstTry });
  assert.ok(once.events.some((e) => e.type === 'medal' && e.id === 'weekly-1'));
  const again = finishRound(once.progress, real, { kind: 'weekly', week: '2026-W48', answers: answers.map((x) => ({ ...x, correct: true })), firstTry: firstTry.map(() => true) }, TODAY);
  assert.equal(again.progress.weekly['2026-W48'].score, 10, 'la segunda vez no cuenta');
  assert.equal(medalInfo('weekly-1', real).title, 'Primer reto semanal');
});

// --- Ojo de… y cuadros que reconoces ----------------------------------------------------------

test('«Ojo de…»: todas las obras del pintor en la caja 4 o más; medalla al cerrar la ronda', () => {
  const artist = real.artist('vermeer');
  const works = real.worksOf(artist.id).filter((w) => !noAuthorQuestion(w));
  const p = masterAll(real, 14);
  works.forEach((w, i) => { p.srs[`art:${w.id}`] = { box: i === 0 ? EYE_BOX - 1 : i % 2 ? EYE_BOX : MAX_BOX, due: '2026-11-01' }; });
  assert.equal(hasEye(p, real, artist.id), false);
  assert.deepEqual(eyeProgress(p, real, artist.id), { top: works.length - 1, total: works.length, done: false });
  // Un acierto más en la obra que faltaba (repaso espaciado) sube su caja y gana la medalla.
  const q = makeWhoQuestion(real, works[0], 0.5, createRng('eye'));
  const out = finishRound(p, real, { kind: 'srs', answers: [{ q, correct: true, retry: false, combo: 1 }], firstTry: [true] }, TODAY);
  assert.ok(hasEye(out.progress, real, artist.id));
  assert.ok(out.events.some((e) => e.type === 'medal' && e.id === 'eye-vermeer'));
  assert.equal(medalInfo('eye-vermeer', real).title, 'Ojo de Vermeer');
});

test('cuadros que reconoces: obras en la caja 3 o más', () => {
  const p = emptyProgress();
  const [w1, w2, w3] = real.artworks;
  p.srs[`art:${w1.id}`] = { box: RECOGNIZED_BOX, due: TODAY };
  p.srs[`art:${w2.id}`] = { box: RECOGNIZED_BOX - 1, due: TODAY };
  p.srs[`art:${w3.id}`] = { box: MAX_BOX, due: TODAY };
  p.srs['artist:leonardo'] = { box: 5, due: TODAY };
  p.srs['art:no-existe'] = { box: 5, due: TODAY };
  assert.equal(recognizedCount(p, real), 2);
});

// --- Salas de movimientos dominados ------------------------------------------------------------

test('sala de movimiento: abierta solo con el movimiento dominado y con sus obras reconocidas', () => {
  const mov = real.visibleMovements[0];
  const steps = real.stepsOf(mov.id);
  const partial = masterAll(real, steps.length - 1);
  assert.equal(isGalleryOpen(partial, real, mov.id), false);
  const p = masterAll(real, steps.length);
  assert.equal(isGalleryOpen(p, real, mov.id), true);
  assert.deepEqual(openGalleries(p, real).map((m) => m.id), [mov.id]);
  const works = real.worksOfMovement(mov.id);
  p.collection = { [works[2].id]: TODAY, [works[0].id]: TODAY, [real.worksOfMovement(real.visibleMovements[3].id)[0].id]: TODAY };
  const g = galleryWorks(p, real, mov.id);
  assert.deepEqual(g.map((w) => w.id).sort(), [works[0].id, works[2].id].sort());
  assert.ok(g[0].yearSort <= g[1].yearSort, 'ordenadas en el tiempo');
  assert.equal(isGalleryOpen(p, real, 'no-existe'), false);
  assert.equal(parseRoute('#galeria-barroco').name, 'gallery');
});

// --- Estado: migración v3 → v4 -------------------------------------------------------------------

test('migración v3 → v4: añade reto semanal sin perder progreso', () => {
  const v3 = {
    version: 3, onboarded: true,
    progress: { xp: 1200, artists: { leonardo: { plays: 2, best: 0.8, mastered: true } }, srs: { 'art:a154': { box: 4, due: TODAY } }, xpByDay: { [TODAY]: 40 }, medals: { 'artist-leonardo': TODAY } },
    settings: { music: false, sfx: true, volume: 0.3, reducedMotion: true, dailyGoal: 100 },
    session: {},
  };
  const out = migrate(v3, MIGRATIONS, 4);
  assert.ok(SCHEMA_VERSION >= 4, 'la v4 ya existe (las versiones siguientes encadenan)');
  assert.equal(out.version, 4);
  assert.deepEqual(out.progress.weekly, {});
  assert.equal(out.progress.xp, 1200);
  assert.deepEqual(out.progress.srs, v3.progress.srs);
  assert.equal(out.settings.dailyGoal, 100);
  assert.equal(out.progress.medals['artist-leonardo'], TODAY);
  const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify(v3) });
  const store = createStore({ storage });
  assert.equal(store.get().version, SCHEMA_VERSION);
  store.update((s) => ({ ...s, progress: { ...s.progress, weekly: { '2026-W48': { score: 9, total: 15 } } } }));
  assert.equal(createStore({ storage }).get().progress.weekly['2026-W48'].score, 9);
});

test('feedback: si una obra vuelve a salir en la ronda, no se repite su `look` (rasgo del pintor)', async () => {
  const { feedbackFor } = await import('../app/js/engine/feedback.js');
  const w = real.artworks.find((x) => real.pathIndex(x.artistId) >= 0 && !noAuthorQuestion(x));
  const index = { ...real, artwork: (id) => (id === w.id ? { ...w, look: 'Mira la luz de la ventana' } : real.artwork(id)) };
  const q = makeWhoQuestion(real, w, 0.5, createRng('fb'));
  const memo = new Map();
  const first = feedbackFor(index, q, true, memo).lines[0];
  const second = feedbackFor(index, q, true, memo).lines[0];
  assert.equal(first, 'Mira la luz de la ventana.');
  assert.notEqual(second, first);
});

// --- Reto con pintores que aún no ha visto (jugador nuevo) --------------------------------------

test('reto aceptado por un jugador nuevo: las preguntas de pintores no vistos no cuentan para la precisión', async () => {
  const { unseenArtists, isKnownArtist } = await import('../app/js/engine/progress.js');
  const { planWeekly } = await import('../app/js/engine/daily.js');
  const p = emptyProgress();
  const weekly = planWeekly(real, '2026-W48');
  const questions = weekly.questions || weekly;
  assert.ok(unseenArtists(p, real, questions).length > 0, 'un jugador nuevo no conoce a nadie');
  const answers = questions.map((q, i) => ({ q, correct: i % 2 === 0, retry: false, combo: 1 }));
  const firstTry = answers.map((a) => a.correct);
  const out = finishRound(p, real, { kind: 'challenge', unseen: true, answers, firstTry, challenge: true }, TODAY);
  assert.equal(out.progress.stats.answered, 0);
  assert.equal(out.progress.stats.correct, 0);
  assert.deepEqual(out.progress.srs, {});
  assert.deepEqual(out.progress.collection, {});
  assert.ok(out.progress.medals['challenge-1'], 'el reto sí cuenta como jugado');
  // Un pintor ya jugado sí cuenta.
  const known = masterAll(real);
  assert.ok(isKnownArtist(known, real, real.path[0].id));
  assert.equal(unseenArtists(known, real, questions).length, 0);
  const out2 = finishRound(known, real, { kind: 'challenge', unseen: true, answers, firstTry, challenge: true }, TODAY);
  assert.equal(out2.progress.stats.answered, questions.length);
});
