// Propiedad: la guía (nextStep, la burbuja del mapa, el resultado) nunca manda a un nivel, pintor o paso que la interfaz
// enseñe cerrado. Recorre estados variados, con niveles aprobados y cuadros sin ver, y el caso de Leonardo de María.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyProgress } from '../app/js/engine/progress.js';
import { nextStep, artistStep } from '../app/js/engine/next-step.js';
import { deepStatus } from '../app/js/engine/levels.js';
import { levelStates } from '../app/js/engine/level-ring.js';
import { playStatus } from '../app/js/engine/branches.js';
import { createRng } from '../app/js/engine/rng.js';
import { migrate, defaultState } from '../app/js/state/schema.js';
import { realIndex } from './helpers-real.js';

const real = realIndex();
const TODAY = '2026-11-28';
const DAYS = ['2026-11-10', '2026-11-20', '2026-11-26', '2026-11-27'];

// Lo que la interfaz enseña al abrir el destino: null si se puede jugar, o por qué está cerrado.
function closedReason(progress, to) {
  const deep = /^a-fondo-(.+)-(\d+)$/.exec(to);
  if (deep) {
    const [, id, n] = deep;
    const level = Number(n);
    if (deepStatus(progress, real, id, level) === 'locked') return `${to}: el nivel está cerrado`;
    if (levelStates(progress, real, id).find((l) => l.level === level)?.state === 'locked') return `${to}: el aro lo enseña cerrado`;
    return null;
  }
  const stage = /^etapa-([^-]+(?:-[^-]+)*?)(?:--.+)?$/.exec(to);
  if (stage) {
    const s = playStatus(progress, real, stage[1]);
    return !s || s === 'locked' ? `${to}: el pintor está cerrado (${s})` : null;
  }
  return null;
}

// Estado al azar: un tramo del camino superado, pintores a medias (algunos aprobados con cuadros sin ver), niveles «a fondo»
// jugados (también fuera de orden) y una propuesta de profundizar a la vista.
function randomState(seed) {
  const rng = createRng(`guia:${seed}`);
  const p = emptyProgress();
  const upTo = Math.floor(rng.next() * real.steps.length);
  real.steps.forEach((s, i) => {
    if (i > upTo) return;
    const best = i < upTo ? 0.75 + rng.next() * 0.25 : rng.next();
    const passed = i < upTo || best >= 0.75;
    const rec = { plays: 1 + Math.floor(rng.next() * 3), best, mastered: passed, last: rng.pick(DAYS) };
    if (s.type === 'sala') p.salas[s.id] = rec;
    else {
      const works = real.levelWorks(s.id, 1).map((w) => w.id).filter(() => rng.next() < 0.8);
      p.artists[s.id] = { ...rec, works };
      for (const l of real.deepLevels(s.id)) {
        const r = rng.next();
        if (r < 0.25) p.deep[`${s.id}:${l.id}`] = { plays: 1, best: 0.8 + rng.next() * 0.2, mastered: true, last: rng.pick(DAYS) };
        else if (r < 0.45) p.deep[`${s.id}:${l.id}`] = { plays: 1, best: rng.next() * 0.7, mastered: false, last: rng.pick(DAYS) };
      }
    }
  });
  const offers = Object.keys(p.deep);
  if (offers.length && rng.next() < 0.5) p.deepen = { ...(p.deepen || {}), pending: rng.pick(offers) };
  return p;
}

// María con Leonardo: aprobó «Quién fue» (80 %) con un cuadro sin ver (antes, sin superar) y la guía le propone su nivel 2.
function leonardo() {
  const p = { ...emptyProgress() };
  real.steps.slice(0, real.pathIndex('leonardo')).forEach((s) => {
    const rec = { plays: 1, best: 0.9, mastered: true, last: '2026-11-26' };
    if (s.type === 'sala') p.salas[s.id] = rec; else p.artists[s.id] = rec;
  });
  const works = real.levelWorks('leonardo', 1).map((w) => w.id);
  p.artists.leonardo = { plays: 1, best: 0.8, mastered: false, last: '2026-11-27', works: works.slice(0, -1) };
  p.deepen = { pending: 'leonardo:2', at: 0, skips: {} };
  const state = { ...defaultState(), progress: p };
  delete state.progress.passRule;
  return migrate(state).progress;
}

const kinds = [{ kind: 'map' }, { kind: 'srs' }];

test('el caso de Leonardo: lo que propone la guía está abierto (su nivel 2, Florencia)', () => {
  const p = leonardo();
  assert.equal(deepStatus(p, real, 'leonardo', 2), 'available');
  assert.deepEqual(levelStates(p, real, 'leonardo').map((l) => l.state), ['done', 'next']);
  for (const plan of kinds) {
    const step = nextStep(p, real, TODAY, { plan });
    assert.equal(closedReason(p, step.to), null, `${plan.kind} → ${step.to}`);
  }
  assert.equal(closedReason(p, artistStep(p, real, 'leonardo').to), null);
});

test('propiedad: nextStep nunca manda a algo cerrado (200 estados al azar)', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const p = randomState(seed);
    for (const plan of kinds) {
      const step = nextStep(p, real, TODAY, { plan });
      assert.equal(closedReason(p, step.to), null, `estado ${seed}, ${plan.kind}: ${step.kind} → ${step.to}`);
    }
    for (const id of Object.keys(p.artists).slice(-3)) {
      const step = artistStep(p, real, id);
      if (step) assert.equal(closedReason(p, step.to), null, `estado ${seed}, artistStep ${id} → ${step.to}`);
    }
  }
});
