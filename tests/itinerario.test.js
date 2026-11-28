// El itinerario de «Siguiente»: una partida nueva que solo pulsa lo que propone nextStep, acertándolo todo, recorre el camino
// principal entero en orden y sin saltarse nada sin ver (medallón de cada época, cada cartel de tramo que quede, cada
// pintor), aunque se intercalen cierres de época, repasos, «a fondo» o pruebas de época. Reproduce lo que hace la interfaz
// al entrar en una parada (ui/screens/flows.js: withIntro y withTramo antes del pintor).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realIndex } from './helpers-real.js';
import { emptyProgress, needsIntro, needsTramo, hasTramoSign } from '../app/js/engine/progress.js';
import { finishRound } from '../app/js/engine/finish.js';
import { planStage, planSala, planMovementReview } from '../app/js/engine/planner.js';
import { seenWorks } from '../app/js/engine/levels.js';
import { nextStep } from '../app/js/engine/next-step.js';
import { markClosureSeen } from '../app/js/engine/era-end.js';
import { finishRecall, ARTIST, MOVEMENT } from '../app/js/engine/recall.js';

const real = realIndex();
const TODAY = '2026-11-28';
const MAX_STEPS = 4000;

const perfect = (plan) => { const answers = plan.questions.map((q) => ({ q, correct: true, retry: false, combo: 1 })); return { answers, firstTry: answers.map(() => true) }; };

// Lo que ve quien entra en una parada: la presentación de su época, el cartel de su tramo y, al fin, el pintor o la sala.
function enter(p, step, seen) {
  const mid = step.type === 'sala' ? step.id : real.artist(step.id).movementId;
  let q = p;
  if (real.visibleMovements.some((m) => m.id === mid) && needsIntro(q, real, mid)) {
    seen.push(`era:${mid}`);
    q = { ...q, intros: { ...q.intros, [mid]: TODAY } };
  }
  if (step.type === 'artist' && needsTramo(q, real, step.id)) {
    const key = real.artist(step.id).section;
    seen.push(`tramo:${key}`);
    q = { ...q, signs: { ...q.signs, [key]: TODAY } };
  }
  seen.push(`${step.type}:${step.id}`);
  return q;
}

let seed = 0;
function playArtist(p, artistId, level = 1) {
  const plan = planStage(real, artistId, ++seed, { seen: [...seenWorks(p, artistId)], ...(level > 1 ? { level } : {}) });
  const { answers, firstTry } = perfect(plan);
  return finishRound(p, real, { kind: 'stage', artistId, ...(level > 1 ? { level } : {}), answers, firstTry }, TODAY);
}

// Recorre nextStep hasta que no queda nada del camino principal por ver. Devuelve lo visto por primera vez, en orden.
function walk() {
  let p = emptyProgress();
  const seen = [];
  const kinds = [];
  let plan = { kind: 'map' };
  let outcome = null;
  let prevKind = null;
  let prevStep = null;
  const done = () => real.steps.every((s) => (s.type === 'sala' ? p.salas?.[s.id]?.mastered : p.artists?.[s.id]?.mastered) || (s.type === 'artist' && p.artists?.[s.id]?.plays));
  for (let i = 0; i < MAX_STEPS && !done(); i += 1) {
    const step = nextStep(p, real, TODAY, { plan, outcome, prevKind, prevStep });
    kinds.push(step.kind);
    prevKind = plan.kind === 'srs' ? 'srs' : null;
    prevStep = step.kind;
    outcome = null;
    const route = step.to;
    if (step.kind === 'closure') { p = markClosureSeen(p, real, step.closure, TODAY); plan = { kind: 'closure' }; continue; }
    if (step.kind === 'recall') {
      p = finishRecall(p, step.artistId ? ARTIST : MOVEMENT, step.artistId || step.movementId, TODAY);
      plan = { kind: 'recall' };
      continue;
    }
    if (step.kind === 'review') { plan = { kind: 'srs' }; continue; }
    if (step.kind === 'debt' && route.startsWith('repaso-')) {
      const plan2 = planMovementReview(real, step.movementId, ++seed);
      const { answers, firstTry } = perfect(plan2);
      p = finishRound(p, real, { kind: 'review', movementId: step.movementId, answers, firstTry }, TODAY).progress;
      plan = { kind: 'review' };
      continue;
    }
    if (step.kind === 'deep' || step.kind === 'deepen' || (step.kind === 'essential' && route.startsWith('a-fondo-'))) {
      const [, id, level] = /^a-fondo-(.+)-(\d+)$/.exec(route);
      const out = playArtist(p, id, Number(level));
      p = out.progress;
      plan = { kind: 'stage', artistId: id, level: Number(level) };
      outcome = { accuracy: 1, events: out.events };
      continue;
    }
    const sala = route.startsWith('sala-');
    const id = sala ? route.slice(5) : route.replace(/^etapa-/, '').replace(/--.*$/, '');
    assert.ok(sala || route.startsWith('etapa-'), `ruta inesperada ${route} (${step.kind})`);
    p = enter(p, sala ? { type: 'sala', id } : { type: 'artist', id }, seen);
    let out;
    if (sala) {
      const pl = planSala(real, id, ++seed);
      const { answers, firstTry } = perfect(pl);
      out = finishRound(p, real, { kind: 'sala', movementId: id, answers, firstTry }, TODAY);
      plan = { kind: 'sala', movementId: id };
    } else {
      out = playArtist(p, id);
      plan = { kind: 'stage', artistId: id };
    }
    p = out.progress;
    outcome = { accuracy: 1, events: out.events };
  }
  assert.ok(done(), `el itinerario no termina el camino en ${MAX_STEPS} pasos (último: ${kinds.slice(-5).join(', ')})`);
  return { seen: [...new Set(seen)], kinds };
}

// Lo que toca ver, en orden de camino: por época, su medallón; luego, por pintor, el cartel de su tramo (si empieza ahí) y él.
function expected() {
  const list = [];
  for (const m of real.visibleMovements) {
    list.push(`era:${m.id}`);
    let before = null;
    for (const s of real.stepsOf(m.id)) {
      if (s.type === 'artist') {
        const sec = real.artist(s.id).section;
        if (hasTramoSign(real, s.id) && sec !== before) list.push(`tramo:${sec}`);
        before = sec;
      }
      list.push(`${s.type}:${s.id}`);
    }
  }
  return list;
}

test('itinerario: pulsando solo «Siguiente» se ve cada medallón, cartel de tramo y pintor, en orden y sin saltos', () => {
  const { seen, kinds } = walk();
  const want = expected().filter((k) => seen.includes(k) || !k.startsWith('artist:') || real.path.some((a) => `artist:${a.id}` === k));
  assert.deepEqual(seen.filter((k) => want.includes(k) || k.startsWith('era:') || k.startsWith('tramo:')), want.filter((k) => seen.includes(k) || k.startsWith('era:') || k.startsWith('tramo:')));
  const missing = expected().filter((k) => !seen.includes(k));
  assert.deepEqual(missing, [], `pasos del camino que el itinerario no enseñó: ${missing.join(', ')}`);
  assert.ok(kinds.length > expected().length / 2);
});

test('itinerario: el primer tramo de cada época no sale; los siguientes sí', () => {
  for (const m of real.visibleMovements) {
    const head = real.stageArtists(m.id)[0];
    if (head) assert.equal(hasTramoSign(real, head.id), false, `${m.id}: el primer pintor no abre tramo`);
  }
  assert.ok(!expected().includes('tramo:Nace el Renacimiento') && expected().includes('tramo:Los tres genios'));
});
