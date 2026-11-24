// Anti-trampa: nadie puede «dominar» una etapa sin mirar los cuadros. Sobre el catálogo real, para
// cada parada del camino y 120 semillas, se juega con bots que no miran (siempre el pintor o el
// movimiento de la etapa, siempre la opción más repetida, siempre un pintor ya aprendido, el mixto
// del evaluador —moneda en «quién» + movimiento anterior—, el aprendido más reciente, nunca el de
// la etapa, siempre la misma posición) y se calcula la probabilidad exacta de dominar la ronda con
// la regla de progress.js (stageRule: 75 % —70 % en catálogos sin niveles— y 2 de cada 3 sobre el propio pintor; en la primera
// etapa, 3 de cada 4 «¿Cuál es de X?» con el calentamiento). Falla si en alguna etapa se
// supera en más del 5 % de las rondas. Además, el alumno que conoce a todos los anteriores pero no
// ha estudiado al de la etapa (responde por descarte) no domina más del 25 % de las rondas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { planStage, planSala, planMovementReview, OWN_NEW } from '../app/js/engine/planner.js';
import { hasMovementReview, MASTERY, stageRule, emptyProgress } from '../app/js/engine/progress.js';
import { worksBySrs } from '../app/js/engine/review.js';
import { BOTS, eliminator, student, attentive, roundContext, masteryProbability, probAtLeast } from './lib/antibot.js';
import { salaCatalog } from './helpers.js';

const here = dirname(fileURLToPath(import.meta.url));
const real = buildIndex(JSON.parse(readFileSync(join(here, '..', 'app', 'data', 'catalog.json'), 'utf8')));
const SEEDS = 120;
export const MAX_SHARE = 0.05;
export const MAX_ELIMINATOR = 0.25;

function worstFor(index, plans, ctxFor, bots = BOTS) {
  const out = {};
  for (const [name, bot] of Object.entries(bots)) {
    let sum = 0;
    for (const plan of plans) {
      const rule = plan.kind === 'stage' ? stageRule(index, plan.artistId) : { mastery: MASTERY };
      const own = plan.kind === 'stage' ? { ownArtist: plan.artistId, ownRule: rule.ownRule } : {};
      sum += masteryProbability(bot, plan.questions, ctxFor(plan), rule.mastery, own);
    }
    out[name] = sum / plans.length;
  }
  return out;
}

// review(step): cuadros de repaso elegidos por antigüedad (engine/review.js) para planStage.
function stageReport(index, bots = BOTS, { review = () => [], seeds = SEEDS } = {}) {
  return index.steps.map((step) => {
    const learned = index.path.slice(0, Math.max(0, index.pathIndex(step.id))).map((a) => a.id);
    const plans = [];
    for (let s = 1; s <= seeds; s++) plans.push(step.type === 'sala' ? planSala(index, step.id, s) : planStage(index, step.id, s, { review: review(step) }));
    const rates = worstFor(index, plans, (plan) => roundContext(index, plan.questions, {
      stageArtist: step.type === 'artist' ? step.id : null, stageMovement: step.movementId, learned,
    }), bots);
    return { id: step.id, rates };
  });
}

test('probabilidad exacta de llegar al umbral (Poisson-binomial)', () => {
  assert.equal(probAtLeast([1, 1, 0], 2), 1);
  assert.ok(Math.abs(probAtLeast([0.5, 0.5], 1) - 0.75) < 1e-12);
  assert.ok(Math.abs(probAtLeast([0.25, 0.25, 0.25, 0.25], 4) - 0.25 ** 4) < 1e-12);
});

test('anti-bot: ninguna etapa del catálogo real se domina sin mirar (≤ 5 % de rondas)', () => {
  const report = stageReport(real);
  assert.equal(report.length, real.steps.length);
  for (const { id, rates } of report) {
    for (const [bot, rate] of Object.entries(rates)) {
      assert.ok(rate <= MAX_SHARE, `${id}: el bot «${bot}» domina el ${(rate * 100).toFixed(1)} % de las rondas`);
    }
  }
});

test('anti-bot: tampoco en salas (catálogo sintético) ni en los repasos de movimiento', () => {
  const salas = buildIndex(salaCatalog());
  for (const { id, rates } of stageReport(salas).filter((r) => salas.isSala(r.id))) {
    for (const [bot, rate] of Object.entries(rates)) assert.ok(rate <= MAX_SHARE, `sala ${id}: «${bot}» ${(rate * 100).toFixed(1)} %`);
  }
  for (const m of real.visibleMovements.filter((x) => hasMovementReview(real, x.id))) {
    const plans = Array.from({ length: SEEDS }, (_, i) => planMovementReview(real, m.id, i + 1));
    const learned = real.path.filter((a) => real.movement(a.movementId).order <= m.order).map((a) => a.id);
    const rates = worstFor(real, plans, (plan) => roundContext(real, plan.questions, { stageMovement: m.id, learned }));
    for (const [bot, rate] of Object.entries(rates)) assert.ok(rate <= MAX_SHARE, `repaso ${m.id}: «${bot}» ${(rate * 100).toFixed(1)} %`);
  }
});

test('anti-descarte: conocer a los anteriores sin estudiar al de la etapa no basta (≤ 25 % de rondas)', () => {
  const report = stageReport(real, { eliminator });
  for (const { id, rates } of report) {
    assert.ok(rates.eliminator <= MAX_ELIMINATOR, `${id}: por descarte domina el ${(rates.eliminator * 100).toFixed(1)} %`);
  }
});

// Cuadro de repaso de cada etapa (v12): una de las preguntas de repaso es de un pintor dominado hace
// días (el más antiguo del camino o uno intermedio). La ronda no cambia de forma: los mismos umbrales.
test('anti-bot y anti-descarte con el cuadro de repaso elegido por antigüedad (≤ 5 % y ≤ 25 %)', () => {
  const p = emptyProgress();
  const variants = {
    'el más antiguo': (step) => (real.pathIndex(step.id) > 0 ? [worksBySrs(p, real, real.path[0].id)[0].id] : []),
    'uno intermedio': (step) => {
      const i = real.pathIndex(step.id);
      return i > 0 ? [worksBySrs(p, real, real.path[Math.floor(i / 2)].id).at(-1).id] : [];
    },
  };
  for (const [label, review] of Object.entries(variants)) {
    for (const { id, rates } of stageReport(real, { ...BOTS, eliminator }, { review, seeds: 60 })) {
      for (const [bot, rate] of Object.entries(rates)) {
        const max = bot === 'eliminator' ? MAX_ELIMINATOR : MAX_SHARE;
        assert.ok(rate <= max, `${label} · ${id}: «${bot}» domina el ${(rate * 100).toFixed(1)} %`);
      }
    }
  }
});

test('«¿De qué movimiento es?» no tiene siempre la misma respuesta (ni la anterior ni la de la etapa)', () => {
  for (const step of real.steps.filter((s) => s.type === 'artist')) {
    const answers = new Map();
    let n = 0;
    for (let s = 1; s <= 60; s++) {
      for (const q of planStage(real, step.id, s).questions.filter((x) => x.type === 'movement')) {
        n++;
        answers.set(q.answerId, (answers.get(q.answerId) || 0) + 1);
      }
    }
    if (!n) continue;
    const top = Math.max(...answers.values()) / n;
    assert.ok(answers.size >= 2 && top <= 0.75, `${step.id}: respuestas de movimiento ${JSON.stringify([...answers])}`);
  }
});

test('preguntas del pintor de la etapa con pintores aún no aprendidos de distractor (catálogo real)', () => {
  for (const step of real.steps.filter((s) => s.type === 'artist' && real.pathIndex(s.id) > 0)) {
    const learned = new Set(real.path.slice(0, real.pathIndex(step.id)).map((a) => a.id));
    for (let s = 1; s <= 20; s++) {
      for (const q of planStage(real, step.id, s).questions.filter((x) => x.artistId === step.id)) {
        if (q.type === 'who') {
          const unlearned = q.options.filter((o) => o.id !== step.id && !learned.has(o.id));
          assert.ok(unlearned.length >= 2 && q.options.some((o) => learned.has(o.id)), `${step.id}/${s}: «¿Quién?» ${q.options.map((o) => o.id)}`);
        }
        if (q.type === 'which') {
          const others = q.options.filter((o) => o.id !== q.answerId).map((o) => real.artwork(o.artworkId).artistId);
          assert.ok(others.every((id) => !learned.has(id)), `${step.id}/${s}: «¿Cuál?» con relleno ya aprendido`);
        }
      }
    }
  }
});

// Dominio justo con pocas obras sin ver: los pintores del camino con menos obras preguntables por enseñar
// (los demás tienen 3 o más de nivel 1, más las «a fondo»). Alumno atento: 88 % en pintores aprendidos,
// 90 % obras vistas, 70 % obras nuevas. Con el 75 % de la ronda, ≥ 60 % de rondas dominadas.
test('dominio justo: un alumno atento domina ≥ 60 % de las rondas en los pintores con menos obras por preguntar', () => {
  const few = real.path.slice(1).sort((a, b) => real.newWorks(a.id).length - real.newWorks(b.id).length).slice(0, 6);
  const report = stageReport(real, { attentive: student(0.88, 0.9, 0.7), eliminator });
  for (const a of few) {
    const { rates } = report.find((r) => r.id === a.id);
    assert.ok(rates.attentive >= 0.6, `${a.id}: atento ${(rates.attentive * 100).toFixed(1)} %`);
    assert.ok(rates.eliminator <= MAX_ELIMINATOR, `${a.id}: por descarte ${(rates.eliminator * 100).toFixed(1)} %`);
  }
});

test('preguntas propias: calentamiento + OWN_NEW no enseñadas (sin otra vista); la de movimiento puede ser otra suya vista', () => {
  for (const a of real.path.slice(1)) {
    const unseen = real.newWorks(a.id).filter((w) => !w.spoiler && !w.attributed).length;
    for (let s = 1; s <= 10; s++) {
      const own = planStage(real, a.id, s).questions.filter((q) => q.artistId === a.id && q.type !== 'movement');
      assert.equal(own.length, 1 + Math.min(OWN_NEW, unseen), `${a.id}/${s}: ${own.length} propias con ${unseen} sin ver`);
      assert.equal(own.filter((q) => !q.isNew).length, 1, `${a.id}/${s}: una sola vista`);
      assert.ok(own.filter((q) => q.type === 'who').length <= 2, `${a.id}/${s}: demasiadas «¿Quién?» propias`);
    }
  }
});

// Dificultad justa. Alumno atento del evaluador: 88 % en obras ya enseñadas, 70 % en las nunca enseñadas.
// Catálogo grande: la ronda pregunta las obras de nivel 1 que faltan (3 no vistas) y se domina con el 75 %
// y todas las obras del nivel vistas, así que domina entre el 60 % y el 80 % de las rondas (hoy 64–70 %,
// media ≈ 66 %; en el catálogo pequeño era 65–80 % con el 70 %). Repetir la ronda es parte del juego.
export const FAIR_MIN = 0.6;
export const FAIR_MAX = 0.8;
test('dificultad justa: el alumno atento (88 % vistas, 70 % no vistas) domina el 60–80 % de las rondas en cada etapa', () => {
  const report = stageReport(real, { attentive: attentive(0.88, 0.7) });
  const rates = report.map((r) => r.rates.attentive);
  for (const { id, rates: r } of report) {
    assert.ok(r.attentive >= FAIR_MIN && r.attentive <= FAIR_MAX, `${id}: atento ${(r.attentive * 100).toFixed(1)} %`);
  }
  const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
  assert.ok(mean >= 0.62 && mean <= 0.78, `media ${(mean * 100).toFixed(1)} %`);
});
