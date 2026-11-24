// Oleada 3: obras que delatan al autor, salas de movimiento, intro, ronda en curso y tramos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { createRng } from '../app/js/engine/rng.js';
import { makeWhoQuestion, makeWhichQuestion, makeMovementQuestion, makeQuestion, isSpoiler } from '../app/js/engine/questions.js';
import {
  planStage, planSala, planMovementReview, planSrsReview, planGeneral, salaLearnWorks, createRound, answerRound,
} from '../app/js/engine/planner.js';
import { planDaily, dailyPool } from '../app/js/engine/daily.js';
import { tokenForRound, encodeChallenge, decodeChallenge } from '../app/js/engine/challenge.js';
import { planChallenge } from '../app/js/engine/daily.js';
import {
  emptyProgress, finishRound, salaStatus, artistStatus, movementStatus, isReviewUnlocked, nextStep, needsIntro, MASTERY,
} from '../app/js/engine/progress.js';
import { migrate, defaultState, SCHEMA_VERSION } from '../app/js/state/schema.js';
import { createStore, STORAGE_KEY } from '../app/js/state/store.js';
import { makeSession, readSession, withSession, clearSession, SESSION_TTL } from '../app/js/state/session.js';
import { bigCatalog, bigIndex, memoryStorage, salaCatalog } from './helpers.js';

const here = dirname(fileURLToPath(import.meta.url));
const realCatalog = () => JSON.parse(readFileSync(join(here, '..', 'app', 'data', 'catalog.json'), 'utf8'));
const real = buildIndex(realCatalog());
// Las salas se prueban con un catálogo sintético: el catálogo real cambia entre oleadas.
const salas = buildIndex(salaCatalog());
const ROCOCO = 'sala-a';
const MODERN = 'sala-b';
const FIRST = real.path[0].id;

function subject(q) {
  return q.type === 'which' ? q.targetArtworkId : q.artworkId;
}

function assertNoSpoilerLeak(index, questions, label) {
  for (const q of questions) {
    assert.ok(q, `${label}: pregunta nula`);
    const art = index.artwork(subject(q));
    // Regla: una obra que delata al autor no sale en ninguna pregunta (ni en grande ni en miniatura).
    assert.ok(!isSpoiler(art), `${label}: ${q.type} con ${art.id}`);
    if (q.type === 'which') for (const o of q.options) assert.ok(!isSpoiler(index.artwork(o.artworkId)), `${label}: miniatura ${o.artworkId}`);
    assert.equal(new Set(q.options.map((o) => o.id)).size, q.options.length, `${label}: opciones únicas`);
    assert.equal(q.options.filter((o) => o.id === q.answerId).length, 1, `${label}: una correcta`);
  }
}

// --- Obras que se delatan -------------------------------------------------------

test('catálogo: miniatura en el atlas para todas las obras y `spoiler` solo como true', () => {
  const cat = realCatalog();
  assert.ok(cat.atlas && cat.atlas.sheets.length >= 1 && cat.atlas.sheets.length <= 24);
  assert.ok(cat.artworks.every((w) => Array.isArray(w.thumb) && w.thumb.length === 5));
  for (const w of real.artworks) {
    const t = w.thumb;
    assert.ok(t && t.src.startsWith('img/s/'), w.id);
    assert.ok(t.x + t.w <= t.sw && t.y + t.h <= t.sh, `${w.id}: dentro de la hoja`);
    assert.ok(Math.abs(t.w / t.h - w.w / w.h) < 0.03 * (w.w / w.h) + 0.01, `${w.id}: proporciones`);
  }
  assert.ok(cat.artworks.every((w) => !('spoiler' in w) || w.spoiler === true));
});

test('spoiler: una obra con el nombre del autor no sale en ninguna pregunta (quién, movimiento ni miniaturas)', () => {
  // Si el catálogo real no tiene obras con firma, se marca una para la prueba.
  const cat = realCatalog();
  if (!cat.artworks.some((w) => w.spoiler)) cat.artworks.find((w) => w.artistId === FIRST).spoiler = true;
  const real = buildIndex(cat);
  const spoilers = real.artworks.filter(isSpoiler);
  assert.ok(spoilers.length >= 1);
  for (const w of spoilers) {
    assert.equal(makeWhoQuestion(real, w, 0.5, createRng(1)), null);
    assert.equal(makeWhichQuestion(real, w, 0.5, createRng(1)), null);
    assert.equal(makeMovementQuestion(real, w, 0.5, createRng(1)), null);
    for (const type of ['who', 'which', 'movement']) assert.equal(makeQuestion(type, real, w, 0.5, createRng(2)), null, `${w.id} pedida como ${type}`);
  }
  const owners = [...new Set(spoilers.map((w) => w.artistId))].filter((id) => real.pathIndex(id) >= 0);
  for (let seed = 1; seed <= 60; seed++) {
    for (const id of owners) assertNoSpoilerLeak(real, planStage(real, id, seed).questions, `etapa ${id}`);
    for (const st of real.steps.filter((x) => x.type === 'sala')) assertNoSpoilerLeak(real, planSala(real, st.id, seed).questions, 'sala');
    const reviewMov = real.visibleMovements.find((m) => real.stageArtists(m.id).length >= 2);
    if (reviewMov) assertNoSpoilerLeak(real, planMovementReview(real, reviewMov.id, seed).questions, 'repaso');
    assertNoSpoilerLeak(real, planGeneral(real, dailyPool(real), `g:${seed}`), 'general');
    assertNoSpoilerLeak(real, planSrsReview(real, spoilers.map((w) => `art:${w.id}`), seed).questions, 'srs');
  }
  // Las etapas siguen teniendo práctica aunque el pintor tenga obras con firma, y en «Conoce a»
  // se siguen enseñando.
  for (const id of owners) assert.ok(planStage(real, id, 3).practice.length >= (real.pathIndex(id) === 0 ? 1 : 2));
  const learnSpoiler = spoilers.find((w) => w.role === 'learn' && real.pathIndex(w.artistId) >= 0);
  if (learnSpoiler) assert.ok(planStage(real, learnSpoiler.artistId, 1).learn.some((w) => w.id === learnSpoiler.id));
});

// --- Salas -----------------------------------------------------------------------

test('salas: movimientos sin pintores con etapa son una parada en su orden cronológico', () => {
  const ids = salas.steps.filter((s) => s.type === 'sala').map((s) => s.id);
  assert.deepEqual(ids, [ROCOCO, MODERN]);
  const i = salas.stepIndex('sala', ROCOCO);
  assert.equal(salas.steps[i - 1].movementId, 'mov2');
  assert.equal(salas.steps[i + 1].movementId, 'mov3');
  assert.equal(salas.steps.at(-1).id, MODERN);
  assert.ok(salas.visibleMovements.some((m) => m.id === ROCOCO));
  assert.equal(salas.path.length, salas.steps.filter((s) => s.type === 'artist').length, 'path sigue siendo solo pintores');
  // En el catálogo real, toda sala es un movimiento sin pintores con etapa.
  for (const st of real.steps.filter((x) => x.type === 'sala')) assert.equal(real.stageArtists(st.id).length, 0);
  // Sin salas (catálogo sintético) los pasos son exactamente el camino de siempre.
  const big = bigIndex();
  assert.deepEqual(big.steps.map((s) => s.id), big.path.map((a) => a.id));
});

test('sala genérica: cualquier movimiento solo con invitados se trata como sala', () => {
  const cat = bigCatalog();
  cat.movements.push({ id: 'solo', name: 'Solo invitados', period: '', order: 6, era: 'modern', blurb: 'B', accent: '#123456' });
  let n = 1000;
  for (const [id, works] of [['x1', 3], ['x2', 2], ['x3', 1], ['x4', 1]]) {
    cat.artists.push({ id, name: `Invitado ${id}`, short: id, movementId: 'solo', order: n, guest: true, hint: 'h', traits: [], similarTo: [] });
    for (let k = 0; k < works; k++) cat.artworks.push({ id: `z${n++}`, artistId: id, title: 'T', year: '1900', yearSort: 1900, img: 'img/z.jpg', w: 1, h: 1, role: 'new', fame: 1, confidence: 'high' });
  }
  const index = buildIndex(cat);
  assert.ok(index.isSala('solo'));
  assert.equal(index.steps.at(-1).type, 'sala');
  const plan = planSala(index, 'solo', 4);
  assert.ok(plan.questions.length >= 5);
  assert.deepEqual(plan, planSala(index, 'solo', 4));
});

test('sala: conoce el movimiento con 3-4 obras de invitados distintos y ronda de movimiento y autor', () => {
  for (const mid of [ROCOCO, MODERN]) {
    const learn = salaLearnWorks(salas, mid);
    assert.ok(learn.length >= 3 && learn.length <= 4);
    assert.equal(new Set(learn.map((w) => w.artistId)).size, learn.length, 'pintores distintos');
    const leads = new Set(salas.salaArtists(mid).map((a) => a.id));
    let who = 0;
    let movement = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const plan = planSala(salas, mid, seed);
      assert.deepEqual(plan, planSala(salas, mid, seed), 'determinista');
      assert.ok(plan.questions.length >= 5 && plan.questions.length <= 10);
      const learnIds = new Set(plan.learn.map((w) => w.id));
      let own = 0;
      for (const q of plan.questions) {
        assert.ok(['who', 'movement'].includes(q.type));
        if (salas.artist(q.artistId).movementId !== mid) {
          // Contraste: obra de un movimiento anterior, con la sala entre las opciones.
          assert.equal(q.type, 'movement');
          assert.equal(q.phase, 'fresh');
          assert.ok(q.options.some((o) => o.id === mid));
          continue;
        }
        if (q.type === 'movement') own++;
        assert.equal(q.isNew, !learnIds.has(q.artworkId));
        if (q.type === 'who') {
          who++;
          assert.ok(leads.has(q.artistId), 'autor entre los invitados con ≥2 obras');
          // Los otros protagonistas siempre aparecen como opción.
          for (const id of leads) assert.ok(q.options.some((o) => o.id === id));
          assert.ok(q.options.every((o) => salas.artist(o.id).movementId === mid), 'opciones del mismo movimiento');
        } else movement++;
      }
      const movementQs = plan.questions.filter((q) => q.type === 'movement').length;
      assert.ok(own < movementQs || movementQs <= 2, 'la sala no es siempre la respuesta de «¿De qué movimiento es?»');
      assert.ok(plan.practice.every((q) => learnIds.has(q.artworkId)));
      assert.ok(plan.fresh.every((q) => !learnIds.has(q.artworkId)));
    }
    assert.ok(who > 40 && movement > 40, `${mid}: mezcla (${who} quién, ${movement} movimiento)`);
  }
});

test('sala: se desbloquea en orden, da XP, colección y medalla del movimiento, y abre lo siguiente', () => {
  let p = emptyProgress();
  const before = salas.steps.slice(0, salas.stepIndex('sala', ROCOCO));
  assert.equal(salaStatus(p, salas, ROCOCO), 'locked');
  for (const s of before) p.artists[s.id] = { plays: 1, best: 0.5, mastered: false };
  assert.equal(salaStatus(p, salas, ROCOCO), 'available');
  assert.deepEqual(nextStep(p, salas), { type: 'sala', id: ROCOCO, movementId: ROCOCO });
  assert.equal(movementStatus(p, salas, ROCOCO), 'open');
  assert.equal(isReviewUnlocked(p, salas, ROCOCO), false);
  const firstRomantic = salas.stepsOf('mov3')[0].id;
  assert.equal(artistStatus(p, salas, firstRomantic), 'locked');

  const plan = planSala(salas, ROCOCO, 7);
  const answers = plan.questions.map((q) => ({ q, correct: true, retry: false, combo: 1 }));
  const r = finishRound(p, salas, { kind: 'sala', movementId: ROCOCO, answers, firstTry: answers.map(() => true) }, '2026-11-23');
  assert.ok(r.xp > 0);
  assert.equal(r.progress.salas[ROCOCO].plays, 1);
  assert.ok(r.progress.medals[`movement-${ROCOCO}`]);
  assert.ok(Object.keys(r.progress.collection).length >= plan.questions.length - 2);
  assert.equal(salaStatus(r.progress, salas, ROCOCO), 'mastered');
  assert.equal(movementStatus(r.progress, salas, ROCOCO), 'mastered');
  assert.equal(artistStatus(r.progress, salas, firstRomantic), 'available');
  assert.ok(r.events.some((e) => e.type === 'unlock' && e.artistId === firstRomantic && e.movementId === 'mov3'));

  // Con menos del 75 % no hay medalla pero sí desbloqueo.
  const low = finishRound(p, salas, { kind: 'sala', movementId: ROCOCO, answers, firstTry: answers.map((_, i) => i < 2) }, '2026-11-23');
  assert.ok(low.accuracy < MASTERY);
  assert.ok(!low.progress.medals[`movement-${ROCOCO}`]);
  assert.equal(salaStatus(low.progress, salas, ROCOCO), 'started');

  // Terminar el último pintor del Barroco emite el desbloqueo de la sala.
  const last = before.at(-1).id;
  const q = planStage(salas, last, 1);
  const a2 = q.questions.map((qq) => ({ q: qq, correct: true, retry: false, combo: 1 }));
  const p2 = { ...emptyProgress(), artists: Object.fromEntries(before.slice(0, -1).map((s) => [s.id, { plays: 1 }])) };
  const r2 = finishRound(p2, salas, { kind: 'stage', artistId: last, answers: a2, firstTry: a2.map(() => true) }, '2026-11-23');
  assert.ok(r2.events.some((e) => e.type === 'unlock' && e.step.type === 'sala' && e.movementId === ROCOCO));
});

test('reto a un amigo: semilla de sala r<idx>x<seed> reconstruye la misma ronda; las demás siguen igual', () => {
  const plan = planSala(salas, MODERN, 424242);
  const token = tokenForRound(salas, plan);
  assert.match(token, /^r[0-9a-z]+x[0-9a-z]+$/);
  const dec = decodeChallenge(`#${encodeChallenge(token, 6)}`);
  assert.equal(dec.kind, 'sala');
  assert.deepEqual(planChallenge(salas, dec).questions, plan.questions);
  // Un índice que no es sala no se acepta.
  assert.equal(planChallenge(salas, { kind: 'sala', idx: 0, seed: 1 }), null);
  const stage = planStage(real, real.path.at(-1).id, 99);
  assert.deepEqual(planChallenge(real, decodeChallenge(encodeChallenge(tokenForRound(real, stage), 4))).questions, stage.questions);
  const daily = planDaily(real, '2026-11-23');
  assert.deepEqual(planChallenge(real, decodeChallenge(encodeChallenge(tokenForRound(real, daily), 4))).questions, daily.questions);
  const stage2 = planStage(salas, 'p22', 99);
  assert.deepEqual(planChallenge(salas, decodeChallenge(encodeChallenge(tokenForRound(salas, stage2), 4))).questions, stage2.questions);
});

// --- Intro de movimiento -----------------------------------------------------------

test('intro: se necesita la primera vez y no si ya se vio o ya se jugó en el movimiento', () => {
  const p = emptyProgress();
  const m1 = real.movement(real.artist(FIRST).movementId).id;
  const m2 = real.visibleMovements.find((m) => m.id !== m1).id;
  assert.equal(needsIntro(p, real, m1), true);
  assert.equal(needsIntro({ ...p, intros: { [m1]: '2026-11-23' } }, real, m1), false);
  assert.equal(needsIntro({ ...p, artists: { [FIRST]: { plays: 1 } } }, real, m1), false);
  assert.equal(needsIntro({ ...p, salas: { [ROCOCO]: { plays: 1 } } }, salas, ROCOCO), false);
  assert.equal(needsIntro({ ...p, intros: undefined }, real, m2), true);
});

// --- Tramos del mapa ----------------------------------------------------------------

test('tramos (`section` opcional): se conservan en orden y, si no hay, no pasa nada', () => {
  const cat = bigCatalog();
  cat.artists.filter((a) => a.movementId === 'mov2' && !a.guest).forEach((a, i) => { a.section = i < 2 ? 'Uno' : 'Dos'; });
  const index = buildIndex(cat);
  assert.deepEqual(index.stageArtists('mov2').map((a) => a.section), ['Uno', 'Uno', 'Dos']);
  // En el catálogo real los tramos, si existen, son contiguos dentro de cada movimiento.
  for (const m of real.visibleMovements) {
    const secs = real.stageArtists(m.id).map((a) => a.section).filter(Boolean);
    const runs = secs.filter((x, i) => x !== secs[i - 1]);
    assert.equal(new Set(runs).size, runs.length, `tramos contiguos en ${m.id}`);
  }
});

// --- Ronda en curso: store y migración ------------------------------------------------

function sampleSession(now, index = real) {
  const plan = planStage(index, FIRST, 5);
  let round = createRound(plan.questions);
  round = answerRound(round, true);
  round = answerRound(round, false);
  const answers = [
    { q: plan.questions[0], correct: true, retry: false, combo: 1 },
    { q: plan.questions[1], correct: false, retry: false, combo: 0 },
  ];
  const meta = { route: `etapa-${FIRST}`, title: 'Pintor', accent: '#8a6d3b', kind: 'stage', extra: { artistId: FIRST }, shareTopic: 'Pintor', plan };
  return makeSession(meta, { round, answers, xpLive: 10, freshIntroShown: false }, now);
}

test('migración v1 → actual: conserva el progreso y añade ronda en curso, salas e intros', () => {
  const v1 = { version: 1, onboarded: true, progress: { xp: 300, artists: { leonardo: { plays: 2, best: 0.8, mastered: true } }, medals: { 'artist-leonardo': '2026-11-20' } }, settings: { music: false, sfx: true, volume: 0.4, reducedMotion: false } };
  const out = migrate(v1);
  assert.equal(out.version, SCHEMA_VERSION);
  assert.equal(out.progress.xp, 300);
  assert.deepEqual(out.progress.artists.leonardo, { plays: 2, best: 0.8, mastered: true });
  assert.deepEqual(out.progress.salas, {});
  assert.deepEqual(out.progress.intros, {});
  assert.deepEqual(out.session, {});
  assert.equal(out.settings.music, false);
  assert.deepEqual(migrate({ onboarded: true }).session, {}, 'sin versión también llega a v2');
  assert.deepEqual(defaultState().session, {});
});

test('ronda en curso: se guarda, sobrevive a recargar, se valida y caduca a las 12 h', () => {
  const now = Date.UTC(2026, 10, 23, 20, 0);
  const storage = memoryStorage();
  const store = createStore({ storage });
  store.update((s) => withSession({ ...s, onboarded: true }, sampleSession(now)));
  const reloaded = createStore({ storage });
  const s = readSession(reloaded.get(), real, now + 60 * 1000);
  assert.ok(s);
  assert.equal(s.route, `etapa-${FIRST}`);
  assert.equal(s.round.pos, 2);
  assert.equal(s.round.queue.length, s.round.baseCount + 1, 'el fallo vuelve al final');
  assert.deepEqual(s.round.firstTry.slice(0, 2), [true, false]);
  assert.equal(s.answers.length, 2);
  assert.equal(s.plan.artistId, FIRST);
  assert.equal(s.xpLive, 10);
  assert.equal(readSession(reloaded.get(), real, now + SESSION_TTL - 1000) !== null, true);
  assert.equal(readSession(reloaded.get(), real, now + SESSION_TTL), null, 'caduca a las 12 h');
  assert.equal(readSession(reloaded.get(), real, now - 10 * 60 * 1000), null, 'fecha futura no vale');
  // Las etiquetas salen del catálogo, no del almacenamiento.
  const raw = JSON.parse(storage.data[STORAGE_KEY]);
  raw.session.round.queue.forEach((it) => it.q.options.forEach((o) => { o.label = '<img src=x>'; }));
  const tampered = readSession(migrate(raw), real, now);
  for (const it of tampered.round.queue) for (const o of it.q.options) assert.ok(!o.label.includes('<'));
  // Datos corruptos o de otro catálogo: se descartan.
  raw.session.round.queue[0].q.artistId = 'no-existe';
  assert.equal(readSession(migrate(raw), real, now), null);
  assert.equal(readSession({ session: { route: 'x', kind: 'stage', savedAt: now, round: 5 } }, real, now), null);
  assert.equal(readSession({ session: {} }, real, now), null);
  assert.equal(readSession(defaultState(), real, now), null);
  // Limpiar.
  store.update(clearSession);
  assert.deepEqual(createStore({ storage }).get().session, {});
});
