// Oleada 4: curva de dificultad, preguntas de movimiento, práctica sin repetir obra, pintores con
// 3 obras, feedback que enseña, meta diaria, niveles sin fin, hitos y migración v3.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { createRng } from '../app/js/engine/rng.js';
import {
  pickDistractorArtists, similarity, targetSimilarity, questionSimilarity, makeMovementQuestion, MOVEMENT_MAX_GAP,
} from '../app/js/engine/questions.js';
import { planStage, stepDifficulty, MIN_ROUND, FIRST_STAGE_ROUND, ROUND_SPAN } from '../app/js/engine/planner.js';
import { planFree } from '../app/js/engine/daily.js';
import { tokenForRound, encodeChallenge, decodeChallenge } from '../app/js/engine/challenge.js';
import { planChallenge } from '../app/js/engine/daily.js';
import { feedbackFor, mainTrait, artistLines } from '../app/js/engine/feedback.js';
import {
  emptyProgress, finishRound, levelFor, levelAt, LEVELS, todayXp, normalizeGoal, DEFAULT_GOAL, GOAL_OPTIONS,
  hasMovementReview, isReviewUnlocked, pathProgress, isPathComplete, movementStatus,
} from '../app/js/engine/progress.js';
import { madridDayKey } from '../app/js/engine/dates.js';
import { migrate, defaultState, SCHEMA_VERSION } from '../app/js/state/schema.js';
import { createStore, STORAGE_KEY } from '../app/js/state/store.js';
import { bigIndex, sampleIndex, mixedCatalog, memoryStorage } from './helpers.js';

const here = dirname(fileURLToPath(import.meta.url));
const real = buildIndex(JSON.parse(readFileSync(join(here, '..', 'app', 'data', 'catalog.json'), 'utf8')));
const mixed = buildIndex(mixedCatalog());
const SEEDS = 40;

const subjectOf = (q) => (q.type === 'which' ? q.targetArtworkId : q.artworkId);

// Parecido medio de los distractores de «¿Quién lo pintó?» y «¿Cuál es de X?» por etapa.
function stageCurve(index) {
  return index.path.map((a) => {
    let sum = 0;
    let n = 0;
    for (let s = 1; s <= SEEDS; s++) {
      for (const q of planStage(index, a.id, s).questions) {
        const v = questionSimilarity(index, q);
        if (v != null) { sum += v; n++; }
      }
    }
    return { id: a.id, mean: n ? sum / n : 0 };
  });
}

// --- 1. Curva de dificultad --------------------------------------------------------------

export const MAX_STAGE_JUMP = 0.35;

test('curva: el parecido medio de los distractores sube suave por etapa en el catálogo real (sin saltos)', () => {
  const curve = stageCurve(real);
  assert.ok(curve.length >= 2);
  for (let i = 1; i < curve.length; i++) {
    const jump = curve[i].mean - curve[i - 1].mean;
    assert.ok(Math.abs(jump) <= MAX_STAGE_JUMP,
      `salto brusco ${curve[i - 1].id} (${curve[i - 1].mean.toFixed(2)}) → ${curve[i].id} (${curve[i].mean.toFixed(2)})`);
  }
  assert.ok(curve.at(-1).mean > curve[0].mean + 0.8, 'al final del camino, distractores claramente más parecidos');
  assert.ok(curve[0].mean < 0.8, 'al principio, pintores muy distintos');
});

test('curva: también sin saltos en un catálogo con pintores de 3 obras y una sala', () => {
  const curve = stageCurve(mixed);
  for (let i = 1; i < curve.length; i++) assert.ok(Math.abs(curve[i].mean - curve[i - 1].mean) <= 0.6, `${curve[i].id}`);
});

test('curva: la dificultad base es continua por parada y sube dentro de la ronda', () => {
  for (const index of [real, mixed]) {
    const ds = index.steps.map((s) => stepDifficulty(index, s.type, s.id));
    for (let i = 1; i < ds.length; i++) {
      assert.ok(ds[i] > ds[i - 1], 'creciente');
      // Con un camino de verdad (≥ 10 paradas), cada parada sube menos que una ronda: se solapan.
      if (index.steps.length >= 10) assert.ok(ds[i] - ds[i - 1] < ROUND_SPAN, 'rondas solapadas');
    }
  }
});

test('distractores: el parecido medio sigue al objetivo y hasta la mitad hay como mucho un «confundible»', () => {
  const index = bigIndex();
  const target = index.artist('p32');
  for (const d of [0, 0.3, 0.6, 0.9]) {
    let sum = 0;
    for (let s = 0; s < 200; s++) {
      const picks = pickDistractorArtists(index, target, 3, d, createRng(s));
      assert.equal(picks.length, 3);
      assert.equal(new Set(picks.map((a) => a.id)).size, 3);
      if (d < 0.5) assert.ok(picks.filter((a) => similarity(index, target, a) === 3).length <= 1);
      sum += picks.reduce((n, a) => n + similarity(index, target, a), 0) / 3;
    }
    const mean = sum / 200;
    assert.ok(Math.abs(mean - targetSimilarity(d)) < 0.45, `d=${d}: medio ${mean.toFixed(2)} vs objetivo ${targetSimilarity(d).toFixed(2)}`);
  }
});

// --- 2. ¿De qué movimiento es? ------------------------------------------------------------

test('movimiento: siempre una opción contigua en el tiempo; desde la mitad, ninguna absurdamente lejana', () => {
  for (const index of [real, mixed]) {
    const list = index.movements;
    for (let s = 0; s < 300; s++) {
      const rng = createRng(`mov:${s}`);
      const art = rng.pick(index.path.flatMap((a) => index.worksOf(a.id)).filter((w) => !w.spoiler));
      const d = (s % 10) / 10;
      const q = makeMovementQuestion(index, art, d, rng);
      const pos = list.findIndex((m) => m.id === q.answerId);
      const gaps = q.options.filter((o) => o.id !== q.answerId).map((o) => Math.abs(list.findIndex((m) => m.id === o.id) - pos));
      assert.ok(gaps.includes(1), 'al menos un movimiento contiguo');
      assert.equal(new Set(q.options.map((o) => o.id)).size, q.options.length);
      if (d >= 0.5 && list.length > MOVEMENT_MAX_GAP + 1) assert.ok(gaps.every((g) => g <= MOVEMENT_MAX_GAP), `huecos ${gaps}`);
    }
  }
});

// --- 3. Práctica sin repetir obra y pintores de 3 obras ------------------------------------

test('etapa: ninguna obra se pregunta dos veces mientras queden obras sin usar (catálogo real)', () => {
  for (const a of real.path) {
    for (let s = 1; s <= 15; s++) {
      const plan = planStage(real, a.id, s);
      const subjects = plan.questions.map(subjectOf);
      // En la primera etapa (sin nadie antes) se repite una obra vista solo si ya no quedan sin usar.
      const usable = real.worksOf(a.id).filter((w) => !w.spoiler && !w.attributed).length;
      if (real.pathIndex(a.id) === 0 && subjects.length > usable) assert.equal(new Set(subjects).size, usable, `${a.id} semilla ${s}`);
      else assert.equal(new Set(subjects).size, subjects.length, `${a.id} semilla ${s}`);
      assert.ok(plan.questions.length >= MIN_ROUND || real.pathIndex(a.id) === 0, `${a.id}: ronda de ${plan.questions.length}`);
      // Las miniaturas de relleno no repiten obras preguntadas en la ronda.
      const asked = new Set(subjects);
      for (const q of plan.questions.filter((x) => x.type === 'which')) {
        for (const o of q.options) if (o.id !== q.answerId) assert.ok(!asked.has(o.artworkId), 'relleno repetido');
      }
    }
  }
});

test('pintor con 3 obras (2 vistas + 1 nueva): ronda con sentido mezclando repaso de pintores ya aprendidos', () => {
  const three = mixed.path.filter((a) => mixed.worksOf(a.id).length === 3 && mixed.pathIndex(a.id) > 0);
  assert.ok(three.length >= 3, 'el catálogo mixto tiene pintores de 3 obras con etapa');
  for (const a of three) {
    for (let s = 1; s <= 20; s++) {
      const plan = planStage(mixed, a.id, s);
      const own = plan.questions.filter((q) => q.artistId === a.id);
      // Oleada 9: la de calentamiento y la nueva (la otra vista no se vuelve a preguntar).
      assert.equal(own.length, 2, 'calentamiento + su obra nueva');
      assert.ok(plan.questions.length >= MIN_ROUND, `longitud ${plan.questions.length}`);
      assert.ok(plan.practice.some((q) => q.artistId !== a.id), 'repaso intercalado en la práctica');
      const before = new Set(mixed.path.slice(0, mixed.pathIndex(a.id)).map((x) => x.id));
      for (const q of plan.questions.filter((x) => x.artistId !== a.id)) assert.ok(before.has(q.artistId), 'solo pintores ya aprendidos');
      assert.ok(plan.fresh.some((q) => q.artistId === a.id && q.isNew), 'su cuadro nuevo');
      const subjects = plan.questions.map(subjectOf);
      assert.equal(new Set(subjects).size, subjects.length);
    }
  }
  // Fixture: Tiziano con 3 obras tiene etapa propia y una ronda válida.
  const sample = sampleIndex();
  assert.ok(sample.pathIndex('tiziano') >= 0);
  const plan = planStage(sample, 'tiziano', 3);
  assert.ok(plan.questions.length >= MIN_ROUND);
});

test('primer pintor con 3 obras y sin nadie antes: la ronda se completa repitiendo sus obras', () => {
  const cat = mixedCatalog();
  cat.movements.find((m) => m.id === 'm1').order = 99; // m2 (pintores de 3 obras) pasa a ser el primero
  const index = buildIndex(cat);
  const first = index.path[0];
  assert.equal(index.worksOf(first.id).length, 3);
  const plan = planStage(index, first.id, 1);
  assert.ok(plan.questions.length >= FIRST_STAGE_ROUND);
  assert.ok(plan.questions.every((q) => q.artistId === first.id));
});

// --- 4. Feedback que enseña -------------------------------------------------------------

test('feedback: una sola frase que enseña (el `look` de la obra); al fallar, quién era + esa frase', () => {
  const index = sampleIndex();
  let withLook = null;
  for (let s = 1; s <= 30 && !withLook; s++) {
    withLook = planStage(index, 'tiziano', s).questions.find((q) => q.type === 'who' && index.artwork(q.artworkId).look);
  }
  assert.ok(withLook, 'hay una pregunta sobre una obra con look');
  const look = index.artwork(withLook.artworkId).look;
  const ok = feedbackFor(index, withLook, true, new Map());
  assert.equal(ok.lines.length, 1);
  assert.ok(ok.lines[0].startsWith(look.replace(/\.$/, '')));
  const bad = feedbackFor(index, withLook, false, new Map());
  assert.match(bad.title, new RegExp(index.artist(withLook.artistId).name));
  assert.equal(bad.lines.length, 1, 'una sola frase');
  assert.ok(bad.lines[0].startsWith(look.replace(/\.$/, '')));
  // Nunca «Mira…» y «Fíjate en…» a la vez.
  for (const fb of [ok, bad]) assert.ok(!(fb.lines.join(' ').includes('Mira') && fb.lines.join(' ').includes('Fíjate')));
});

test('feedback: sin `look`, el rasgo rota y no se repite el mismo texto seguido', () => {
  const index = mixed;
  const a = mixed.path[0];
  const work = index.worksOf(a.id).find((w) => !w.look);
  const q = { type: 'who', artworkId: work.id, artistId: a.id, answerId: a.id, options: [], isNew: false };
  const memo = new Map();
  const texts = [0, 1, 2].map(() => feedbackFor(index, q, false, memo).lines.join(' '));
  assert.notEqual(texts[0], texts[1]);
  assert.notEqual(texts[1], texts[2]);
  assert.ok(texts.every((t) => t && !t.includes('\n')));
  // Al fallar el movimiento se explica el movimiento.
  const mq = { ...q, type: 'movement', answerId: a.movementId };
  assert.ok(feedbackFor(index, mq, false, new Map()).lines[0].startsWith('Blurb'));
  assert.equal(mainTrait(a), `Fíjate en el rasgo de ${a.id}.`);
});

// --- 7, 9, 10, 11. Progreso: racha, meta, niveles, hitos ------------------------------------

function playAll(progress, index, artistId, today, goal) {
  const plan = planStage(index, artistId, 1);
  const answers = plan.questions.map((q, i) => ({ q, correct: true, retry: false, combo: i + 1 }));
  return finishRound(progress, index, { kind: 'stage', artistId, answers, firstTry: answers.map(() => true) }, today, { goal });
}

test('racha visible desde el primer día y meta diaria que se celebra una sola vez', () => {
  const index = bigIndex();
  const r1 = playAll(emptyProgress(), index, 'p11', '2026-11-24', 50);
  assert.ok(r1.events.some((e) => e.type === 'streak' && e.value === 1), 'racha el día 1');
  assert.ok(r1.events.some((e) => e.type === 'goal' && e.goal === 50));
  assert.ok(r1.progress.medals['goal-1']);
  assert.equal(todayXp(r1.progress, '2026-11-24'), r1.xp);
  const r2 = playAll(r1.progress, index, 'p12', '2026-11-24', 50);
  assert.ok(!r2.events.some((e) => e.type === 'goal'), 'la meta ya estaba cumplida');
  assert.ok(!r2.events.some((e) => e.type === 'streak'), 'la racha ya contó hoy');
  assert.equal(todayXp(r2.progress, '2026-11-24'), r1.xp + r2.xp);
  // Meta alta: no se cumple con una ronda.
  assert.ok(!playAll(emptyProgress(), index, 'p11', '2026-11-24', 200).events.some((e) => e.type === 'goal'));
  // Solo se guardan los últimos días.
  let p = emptyProgress();
  for (let d = 1; d <= 30; d++) p = playAll(p, index, 'p11', `2026-10-${String(d).padStart(2, '0')}`, 50).progress;
  assert.ok(Object.keys(p.xpByDay).length <= 21);
  assert.equal(normalizeGoal(7), DEFAULT_GOAL);
  assert.deepEqual(GOAL_OPTIONS.map(normalizeGoal), GOAL_OPTIONS);
});

test('niveles: más nombres y curva que no se agota', () => {
  assert.ok(LEVELS.length >= 14);
  let prev = -1;
  for (let i = 0; i < 40; i++) {
    const l = levelAt(i);
    assert.ok(l.min > prev && l.name);
    prev = l.min;
    assert.equal(levelFor(l.min).index, i);
  }
  assert.equal(new Set(Array.from({ length: 30 }, (_, i) => levelAt(i).name)).size, 30, 'nombres distintos');
});

test('repaso de movimiento solo con ≥3 pintores con etapa; sello del movimiento al dominarlo entero', () => {
  // m2 tiene 2 pintores con etapa: sin repaso, pero con medalla de movimiento al dominarlos.
  assert.equal(hasMovementReview(mixed, 'm2'), false);
  assert.equal(hasMovementReview(mixed, 'm5'), true);
  let p = emptyProgress();
  for (const a of mixed.path.filter((x) => x.movementId !== 'm2' && mixed.pathIndex(x.id) < mixed.pathIndex('a21'))) {
    p = playAll(p, mixed, a.id, '2026-11-24').progress;
  }
  p = playAll(p, mixed, 'a21', '2026-11-24').progress;
  const r = playAll(p, mixed, 'a22', '2026-11-24');
  assert.equal(movementStatus(r.progress, mixed, 'm2'), 'mastered');
  assert.ok(r.events.some((e) => e.type === 'movement-complete' && e.movementId === 'm2'));
  assert.ok(r.progress.medals['movement-m2']);
  assert.equal(isReviewUnlocked(r.progress, mixed, 'm2'), false, 'sin repaso con menos de 3 pintores');
  assert.ok(!r.events.some((e) => e.type === 'review-unlock'));
});

test('camino completo: progreso global y ronda libre reproducible por enlace', () => {
  const index = bigIndex();
  let p = emptyProgress();
  assert.deepEqual(pathProgress(p, index), { total: index.steps.length, mastered: 0, played: 0 });
  for (const a of index.path) p = playAll(p, index, a.id, '2026-11-24').progress;
  assert.equal(isPathComplete(p, index), true);
  assert.equal(pathProgress(p, index).mastered, index.steps.length);
  const free = planFree(index, 777);
  assert.equal(free.questions.length, 10);
  const dec = decodeChallenge(encodeChallenge(tokenForRound(index, free), 6));
  assert.deepEqual(planChallenge(index, dec).questions, free.questions);
});

// --- Reto diario por el día de Madrid ----------------------------------------------------

test('reto diario: el día se cuenta en Madrid', () => {
  assert.equal(madridDayKey(new Date(Date.UTC(2026, 10, 24, 23, 30))), '2026-11-25');
  assert.equal(madridDayKey(new Date(Date.UTC(2026, 6, 1, 21, 59))), '2026-07-01');
  assert.equal(madridDayKey(new Date(Date.UTC(2026, 6, 1, 22, 1))), '2026-07-02');
});

// --- Esquema v3 --------------------------------------------------------------------------

test('migración v2 → v3: añade meta diaria y XP por día sin perder progreso ni ronda en curso', () => {
  const v2 = {
    version: 2, onboarded: true,
    progress: { xp: 640, artists: { p11: { plays: 1, best: 0.9, mastered: true } }, salas: {}, intros: { mov1: '2026-11-20' } },
    settings: { music: false, sfx: true, volume: 0.3, reducedMotion: true },
    session: { route: 'etapa-p11', kind: 'stage' },
  };
  const out = migrate(v2);
  assert.ok(SCHEMA_VERSION >= 3);
  assert.equal(out.version, SCHEMA_VERSION);
  assert.equal(out.settings.dailyGoal, DEFAULT_GOAL);
  assert.equal(out.settings.music, false);
  assert.equal(out.settings.reducedMotion, true);
  assert.deepEqual(out.progress.xpByDay, {});
  assert.equal(out.progress.xp, 640);
  assert.deepEqual(out.progress.intros, { mov1: '2026-11-20' });
  assert.equal(out.session.route, 'etapa-p11');
  assert.equal(defaultState().settings.dailyGoal, DEFAULT_GOAL);
  // Store: un estado v2 guardado se lee en la versión actual y se puede cambiar la meta.
  const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify(v2) });
  const store = createStore({ storage });
  assert.equal(store.get().version, SCHEMA_VERSION);
  store.update((s) => ({ ...s, settings: { ...s.settings, dailyGoal: 200 } }));
  assert.equal(createStore({ storage }).get().settings.dailyGoal, 200);
});
