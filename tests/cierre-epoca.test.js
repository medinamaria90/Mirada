// Cierre de época (engine/era-end.js, ui/screens/era-end.js, data/cierres.json): sale una vez y solo al completar la época;
// hay frase puente (≤ 180 caracteres, con fuente) para cada transición del camino y para cada rama; se integra con nextStep
// (el resultado lleva al cierre y el cierre cruza a la época siguiente); y quien ya traía épocas cerradas no los ve de golpe.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { realIndex } from './helpers-real.js';
import { emptyProgress } from '../app/js/engine/progress.js';
import { finishRound } from '../app/js/engine/finish.js';
import { planStage } from '../app/js/engine/planner.js';
import { seenWorks } from '../app/js/engine/levels.js';
import { nextStep, mapGuide } from '../app/js/engine/next-step.js';
import {
  pendingClosure, markClosureSeen, seedClosures, closedBranches, crossRoute, closureTitle, eraAfter, parseClosureKey, SEED_MARK,
} from '../app/js/engine/era-end.js';
import { parseRoute, stageRoute } from '../app/js/ui/router.js';
import { migrate, defaultState } from '../app/js/state/schema.js';

const real = realIndex();
const TODAY = '2026-11-28';
const BRIDGE_MAX = 180;
const bridges = JSON.parse(readFileSync(new URL('../app/data/cierres.json', import.meta.url), 'utf8'));
const ren = real.stepsOf('renacimiento').map((s) => s.id);
const stepTo = (s) => (s.type === 'sala' ? `sala-${s.id}` : stageRoute(s.id));

// Rondas perfectas de un pintor hasta dominarlo (o un tope); devuelve el progreso y los eventos de la última.
function master(p, artistId) {
  let out = null;
  for (let seed = 1; seed <= 6 && !p.artists[artistId]?.mastered; seed += 1) {
    const plan = planStage(real, artistId, seed, { seen: [...seenWorks(p, artistId)] });
    const answers = plan.questions.map((q) => ({ q, correct: true, retry: false, combo: 1 }));
    out = finishRound(p, real, { kind: 'stage', artistId, answers, firstTry: answers.map(() => true) }, TODAY);
    p = out.progress;
  }
  return { p, out };
}

function almostRenaissance() {
  let p = emptyProgress();
  for (const id of ren.slice(0, -1)) p = master(p, id).p;
  return p;
}

test('cierre: no sale mientras falte un pintor; al dominar al último, una sola vez', () => {
  const before = almostRenaissance();
  assert.equal(pendingClosure(before, real), null, 'con la época a medias no hay cierre');
  const { p, out } = master(before, ren[ren.length - 1]);
  assert.ok(out.events.some((e) => e.type === 'movement-complete' && e.movementId === 'renacimiento'));
  assert.deepEqual(pendingClosure(p, real), { type: 'era', id: 'renacimiento', key: 'renacimiento' });
  const seen = markClosureSeen(p, real, 'renacimiento', TODAY);
  assert.equal(seen.closures.seen.renacimiento, TODAY);
  assert.equal(pendingClosure(seen, real), null, 'visto: no se repite');
});

test('cierre y nextStep: el resultado lleva al cierre («Cerrar el Renacimiento»); visto, la ruta sigue por la época siguiente', () => {
  const { p, out } = master(almostRenaissance(), ren[ren.length - 1]);
  const plan = { kind: 'stage', artistId: ren[ren.length - 1] };
  const s = nextStep(p, real, TODAY, { plan, outcome: out, goalJustMet: true });
  assert.deepEqual([s.kind, s.to, s.label], ['closure', 'cierre-renacimiento', 'Cerrar el Renacimiento']);
  assert.deepEqual(parseRoute('#cierre-renacimiento'), { name: 'closure', key: 'renacimiento' });
  assert.equal(mapGuide(p, real, TODAY).kind, 'closure', 'el mapa también lo propone mientras no se vea');
  const seen = markClosureSeen(p, real, 'renacimiento', TODAY);
  const after = nextStep(seen, real, TODAY, { plan, outcome: out });
  assert.notEqual(after.kind, 'closure');
  const next = eraAfter(real, 'renacimiento');
  assert.equal(next, 'manierismo-y-norte');
  // Lo siguiente: la Prueba de época que acaba de abrirse (regla 5 bis, de vez en cuando) o la época siguiente.
  assert.ok(after.to === 'repaso-renacimiento' || after.artistId === real.stepsOf(next)[0].id, after.to);
  const go = nextStep(seen, real, TODAY, { plan, outcome: out, prevStep: 'debt' });
  assert.equal(go.artistId, real.stepsOf(next)[0].id, 'tras el cierre, la guía sigue por la época siguiente');
  assert.equal(crossRoute(seen, real, next, stepTo), `movimiento-${next}`, '«Cruzar» lleva al medallón y la presentación');
  const entered = { ...seen, intros: { ...seen.intros, [next]: TODAY } };
  assert.equal(crossRoute(entered, real, next, stepTo), stageRoute(real.stepsOf(next)[0].id), 'ya presentada: a su parada abierta');
  assert.equal(crossRoute(emptyProgress(), real, 'barroco', stepTo), null, 'a una época aún cerrada no se cruza');
  assert.equal(closureTitle(real, { type: 'era', id: 'renacimiento' }), 'Has terminado el Renacimiento');
});

test('frases puente: una por cada transición del camino y por cada rama, ≤ 180 caracteres, con fuente y sin «ayer» ni «mañana»', () => {
  const eras = real.visibleMovements.map((m) => m.id);
  assert.deepEqual(Object.keys(bridges.eras).sort(), eras.slice().sort());
  for (const [i, id] of eras.entries()) {
    const b = bridges.eras[id];
    assert.equal(b.to, eras[i + 1], `${id}: lleva a la época siguiente del camino`);
  }
  assert.deepEqual(Object.keys(bridges.branches).sort(), real.branches.map((b) => b.id).sort());
  for (const [key, b] of [...Object.entries(bridges.eras), ...Object.entries(bridges.branches)]) {
    assert.ok(b.text && b.text.length <= BRIDGE_MAX, `${key}: ${b.text.length} caracteres`);
    assert.match(b.source, /^https:\/\//, `${key}: lleva fuente`);
    assert.doesNotMatch(b.text, /\b(ayer|mañana)\b/i, key);
    if (b.to) assert.ok(eras.includes(b.to), `${key}: cruza a una época del camino`);
  }
});

test('ramas: al terminar una rama, su cierre (después del de la época, si coinciden)', () => {
  let p = emptyProgress();
  for (const id of real.stepsOf('renacimiento').slice(0, 2).map((s) => s.id)) p = master(p, id).p;
  p = seedClosures(p, real);
  const own = real.branch('gotico').artists.filter((id) => real.pathIndex(id) < 0);
  for (const id of own) p = master(p, id).p;
  assert.ok(closedBranches(p, real).includes('gotico'));
  assert.deepEqual(pendingClosure(p, real), { type: 'branch', id: 'gotico', key: 'rama-gotico' });
  assert.deepEqual(parseClosureKey(real, 'rama-gotico'), { type: 'branch', id: 'gotico', key: 'rama-gotico' });
  assert.equal(nextStep(p, real, TODAY, { plan: { kind: 'stage', artistId: own[own.length - 1] } }).label, 'Cerrar la rama');
  assert.equal(pendingClosure(markClosureSeen(p, real, 'rama-gotico', TODAY), real), null);
});

test('migración: quien ya traía épocas cerradas no ve los cierres de golpe; como mucho, el de la última si aún no ha cruzado', () => {
  // Un estado de antes (sin closures) llega sin sembrar y conserva todo su progreso.
  const old = defaultState();
  delete old.progress.closures;
  old.progress.medals = { 'movement-renacimiento': '2026-11-01', 'movement-manierismo-y-norte': '2026-11-10' };
  old.progress.xp = 1234;
  const state = migrate(JSON.parse(JSON.stringify(old)));
  assert.equal(state.progress.xp, 1234);
  assert.equal(state.progress.closures.seeded, false);
  // Sin cruzar al Barroco: solo queda el del Manierismo.
  const seeded = seedClosures(state.progress, real);
  assert.equal(seeded.closures.seen.renacimiento, SEED_MARK);
  assert.equal(seeded.closures.seen['manierismo-y-norte'], undefined);
  assert.equal(pendingClosure(state.progress, real).id, 'manierismo-y-norte');
  assert.equal(seedClosures(seeded, real), seeded, 'sembrar dos veces no cambia nada');
  // Ya en el Barroco: ninguno.
  const crossed = { ...state.progress, intros: { barroco: '2026-11-11' } };
  assert.equal(pendingClosure(crossed, real), null);
  // Una partida nueva no trae nada que ver.
  assert.equal(pendingClosure(emptyProgress(), real), null);
});
