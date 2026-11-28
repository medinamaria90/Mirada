// El itinerario de «Siguiente»: pulsando solo lo que propone nextStep se recorre el camino principal en orden y sin saltarse
// nada sin ver (medallón de cada época, cada cartel de tramo que quede, cada pintor), aunque se intercalen cierres de época,
// repasos, «a fondo», pruebas de época o fallos. Reproduce lo que hace la interfaz al entrar en un destino
// (ui/screens/flows.js withLore: las paradas didácticas sin ver hasta él, y después él). También con partidas de versiones
// anteriores (migradas, a medias, con pintores de un tramo jugados antes de que su cartel fuera un paso).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realIndex } from './helpers-real.js';
import { emptyProgress, hasTramoSign, needsTramo, needsIntro } from '../app/js/engine/progress.js';
import { finishRound } from '../app/js/engine/finish.js';
import { planStage, planSala, planMovementReview } from '../app/js/engine/planner.js';
import { seenWorks } from '../app/js/engine/levels.js';
import { nextStep } from '../app/js/engine/next-step.js';
import { markClosureSeen } from '../app/js/engine/era-end.js';
import { finishRecall, ARTIST, MOVEMENT } from '../app/js/engine/recall.js';
import { pendingLore, loreStops, loreKey, loreSeen, stepTarget } from '../app/js/engine/lore.js';
import { migrate } from '../app/js/state/schema.js';
import { createRng } from '../app/js/engine/rng.js';

const real = realIndex();
const TODAY = '2026-11-28';
const OLD_DAY = '2026-11-26';
const MAX_STEPS = 4000;
const LOW = 0.3;          // ronda floja: menos del 50 %
const TRAMO = 'Los tres genios';

const answersFor = (plan, accuracy = 1) => {
  const k = Math.round(plan.questions.length * accuracy);
  const answers = plan.questions.map((q, i) => ({ q, correct: i < k, retry: false, combo: 1 }));
  return { answers, firstTry: answers.map((a) => a.correct) };
};

// Lo que enseña la interfaz al entrar en un destino: cada parada didáctica sin ver hasta él, en orden, y después él.
function enter(p, target, seen) {
  let q = p;
  for (let lore = pendingLore(q, real, target); lore; lore = pendingLore(q, real, target)) {
    seen.push(loreKey(lore));
    q = lore.type === 'era' ? { ...q, intros: { ...q.intros, [lore.id]: TODAY } } : { ...q, signs: { ...q.signs, [lore.key]: TODAY } };
  }
  seen.push(`${target.type}:${target.id}`);
  return q;
}

let seed = 0;
function playArtist(p, artistId, level = 1, accuracy = 1, day = TODAY) {
  const plan = planStage(real, artistId, ++seed, { seen: [...seenWorks(p, artistId)], ...(level > 1 ? { level } : {}) });
  return finishRound(p, real, { kind: 'stage', artistId, ...(level > 1 ? { level } : {}), ...answersFor(plan, accuracy) }, day);
}

// Propiedad del itinerario: si el paso lleva a un pintor o a una época con una parada didáctica sin ver antes, lo dice
// (`lore`, la primera); nunca propone un pintor de un tramo cuyo cartel no se ha visto sin pasar antes por él.
function checkStep(p, step) {
  const target = ['closure', 'origin'].includes(step.kind) ? null : stepTarget(step);
  const pending = target && pendingLore(p, real, target);
  assert.equal(step.lore, pending ? loreKey(pending) : undefined, `paso ${step.kind} ${step.to}: parada sin ver ${pending ? loreKey(pending) : '-'}`);
  if (target?.type === 'artist' && real.pathIndex(target.id) >= 0) {
    const sec = real.artist(target.id).section;
    const sign = loreStops(real).find((s) => s.type === 'tramo' && s.key === sec);
    if (sign && !loreSeen(p, sign)) assert.ok(step.lore, `propone a ${target.id} sin el cartel de «${sec}»`);
  }
}

// Antes de jugar a un pintor del camino (en cualquier nivel), todo lo didáctico hasta él está visto.
function checkPlay(p, target) {
  const stop = pendingLore(p, real, target);
  assert.equal(stop, null, `se juega ${target.type}:${target.id} con ${stop ? loreKey(stop) : ''} sin ver`);
}

const pathDone = (p) => real.steps.every((s) => (s.type === 'sala' ? p.salas?.[s.id]?.mastered : p.artists?.[s.id]?.mastered) || (s.type === 'artist' && p.artists?.[s.id]?.plays));

// Recorre nextStep desde `start`. rng: con él, rondas flojas (fail) y desvíos del mapa (detour: un «a fondo» abierto o
// «Repasar a» un pintor ya jugado, que también pasan por withLore). until: hasta cuándo. Devuelve lo visto, en orden.
function walk(start = emptyProgress(), { rng = null, fail = 0, detour = 0, until = pathDone, maxSteps = MAX_STEPS } = {}) {
  let p = start;
  const seen = [];
  const kinds = [];
  let plan = { kind: 'map' };
  let outcome = null;
  let prevKind = null;
  let prevStep = null;
  const accuracy = () => (rng && rng() < fail ? LOW : 1);
  for (let i = 0; i < maxSteps && !until(p); i += 1) {
    if (rng && rng() < detour) {
      const played = real.path.filter((a) => p.artists?.[a.id]?.mastered);
      const a = played.length ? played[Math.floor(rng() * played.length)] : null;
      if (a && rng() < 0.5) {
        const level = real.deepLevels(a.id).find((l) => !p.deep?.[`${a.id}:${l.id}`]?.mastered);
        if (level) {
          p = enter(p, { type: 'artist', id: a.id }, seen);
          checkPlay(p, { type: 'artist', id: a.id });
          p = playArtist(p, a.id, level.id, accuracy()).progress;
        }
      } else if (a) {
        p = finishRecall(enter(p, { type: 'artist', id: a.id }, seen), ARTIST, a.id, TODAY);
      }
    }
    const step = nextStep(p, real, TODAY, { plan, outcome, prevKind, prevStep });
    checkStep(p, step);
    kinds.push(step.kind);
    prevKind = plan.kind === 'srs' ? 'srs' : null;
    prevStep = step.kind;
    outcome = null;
    const route = step.to;
    if (step.kind === 'closure') { p = markClosureSeen(p, real, step.closure, TODAY); plan = { kind: 'closure' }; continue; }
    if (step.kind === 'review' || step.kind === 'path' || step.kind === 'done' || step.kind === 'weekly') { plan = { kind: 'srs' }; continue; }
    const target = stepTarget(step);
    if (target) p = enter(p, target, seen);
    if (step.kind === 'recall') {
      p = finishRecall(p, step.artistId ? ARTIST : MOVEMENT, step.artistId || step.movementId, TODAY);
      plan = { kind: 'recall' };
      continue;
    }
    if (route.startsWith('repaso-')) {
      checkPlay(p, target);
      const plan2 = planMovementReview(real, step.movementId, ++seed);
      p = finishRound(p, real, { kind: 'review', movementId: step.movementId, ...answersFor(plan2) }, TODAY).progress;
      plan = { kind: 'review' };
      continue;
    }
    const deep = /^a-fondo-(.+)-(\d+)$/.exec(route);
    if (deep) {
      const [, id, level] = deep;
      checkPlay(p, { type: 'artist', id });
      const out = playArtist(p, id, Number(level), accuracy());
      p = out.progress;
      plan = { kind: 'stage', artistId: id, level: Number(level) };
      outcome = { accuracy: 1, events: out.events };
      continue;
    }
    const sala = route.startsWith('sala-');
    const id = sala ? route.slice(5) : route.replace(/^etapa-/, '').replace(/--.*$/, '');
    assert.ok(sala || route.startsWith('etapa-'), `ruta inesperada ${route} (${step.kind})`);
    // «Repetir» no lleva destino en el paso: la interfaz pasa igual por withLore.
    if (!target) p = enter(p, { type: sala ? 'sala' : 'artist', id }, seen);
    checkPlay(p, { type: sala ? 'sala' : 'artist', id });
    let out;
    const acc = accuracy();
    if (sala) {
      out = finishRound(p, real, { kind: 'sala', movementId: id, ...answersFor(planSala(real, id, ++seed), acc) }, TODAY);
      plan = { kind: 'sala', movementId: id };
    } else {
      out = playArtist(p, id, 1, acc);
      plan = { kind: 'stage', artistId: id };
    }
    p = out.progress;
    outcome = { accuracy: acc, events: out.events };
  }
  assert.ok(until(p), `el itinerario no llega en ${maxSteps} pasos (último: ${kinds.slice(-5).join(', ')})`);
  return { seen, kinds, progress: p };
}

const firstSeen = (seen) => [...new Set(seen)];
const before = (seen, a, b) => seen.indexOf(a) >= 0 && seen.indexOf(a) < seen.indexOf(b);

// Lo que toca ver, en orden de camino: por época, su medallón; luego, por pintor, el cartel de su tramo (si empieza ahí) y él.
function expected() {
  const list = [];
  for (const m of real.visibleMovements) {
    list.push(`era:${m.id}`);
    let prev = null;
    for (const s of real.stepsOf(m.id)) {
      if (s.type === 'artist') {
        const sec = real.artist(s.id).section;
        if (hasTramoSign(real, s.id) && sec !== prev) list.push(`tramo:${sec}`);
        prev = sec;
      }
      list.push(`${s.type}:${s.id}`);
    }
  }
  return list;
}

test('itinerario: pulsando solo «Siguiente» se ve cada medallón, cartel de tramo y pintor, en orden y sin saltos', () => {
  const { seen: all, kinds } = walk();
  const seen = firstSeen(all);
  const want = expected();
  const order = seen.filter((k) => want.includes(k));
  assert.deepEqual(order, want.filter((k) => order.includes(k)), 'orden del camino');
  const missing = want.filter((k) => !seen.includes(k));
  assert.deepEqual(missing, [], `pasos del camino que el itinerario no enseñó: ${missing.join(', ')}`);
  assert.ok(kinds.length > want.length / 2);
});

test('itinerario: el primer tramo de cada época no sale; los siguientes sí', () => {
  for (const m of real.visibleMovements) {
    const head = real.stageArtists(m.id)[0];
    if (head) assert.equal(hasTramoSign(real, head.id), false, `${m.id}: el primer pintor no abre tramo`);
  }
  assert.ok(!expected().includes('tramo:Nace el Renacimiento') && expected().includes(`tramo:${TRAMO}`));
});

// Partida del 26/11: entonces Rafael abría el tramo y el cartel aún no era un paso; ella lo jugó. Antes del arreglo, el
// cartel no salía nunca (bastaba un pintor del tramo jugado) y «Siguiente» llevaba a Leonardo, Miguel Ángel y Rafael sin él.
function oldGame(extra = []) {
  let p = emptyProgress();
  p = { ...p, intros: { renacimiento: OLD_DAY } };
  for (const id of ['botticelli', 'masaccio', 'piero', 'berruguete', ...extra]) p = playArtist(p, id, 1, 1, OLD_DAY).progress;
  return p;
}

test('partida antigua con un pintor del tramo ya jugado: el cartel sale antes del siguiente pintor del tramo', () => {
  for (const extra of [['rafael'], ['leonardo'], ['rafael', 'leonardo']]) {
    const start = oldGame(extra);
    const { seen } = walk(start, { until: (p) => p.artists?.tiziano?.plays > 0 });
    const next = real.stageArtists('renacimiento').find((a) => !extra.includes(a.id) && a.section === TRAMO);
    assert.equal(needsTramo(start, real, next.id), true, `${extra}: jugar a un pintor del tramo no da su cartel por visto`);
    assert.ok(before(seen, `tramo:${TRAMO}`, `artist:${next.id}`), `${extra}: «${TRAMO}» antes de ${next.id} (${seen.slice(0, 12).join(', ')})`);
    assert.equal(seen.filter((k) => k === `tramo:${TRAMO}`).length, 1, 'una sola vez');
  }
});

test('el cartel olvidado sale también antes de un «a fondo», un «Repasar a» o el pintor de un tramo posterior', () => {
  const start = oldGame(['leonardo', 'miguel-angel', 'rafael']);
  checkStep(start, nextStep(start, real, TODAY, {}));
  for (const target of [{ type: 'artist', id: 'rafael' }, { type: 'artist', id: 'tiziano' }, { type: 'movement', id: 'renacimiento' }]) {
    assert.equal(loreKey(pendingLore(start, real, target)), `tramo:${TRAMO}`, `${target.id}`);
  }
  assert.equal(pendingLore(start, real, { type: 'artist', id: 'berruguete' }), null, 'lo de antes del tramo no lo pide');
  const seen = [];
  enter(start, { type: 'artist', id: 'tiziano' }, seen);
  assert.deepEqual(seen, [`tramo:${TRAMO}`, 'tramo:El color de Venecia', 'artist:tiziano']);
});

test('partida migrada de una versión anterior, a medias del Barroco y sin presentaciones ni carteles vistos', () => {
  let p = emptyProgress();
  const upTo = real.path.findIndex((a) => a.id === 'rubens');
  for (const a of real.path.slice(0, upTo)) p = playArtist(p, a.id, 1, 1, OLD_DAY).progress;
  for (const s of real.steps.filter((x) => x.type === 'sala' && real.stepIndex('sala', x.id) < real.stepIndex('artist', 'rubens'))) {
    p = finishRound(p, real, { kind: 'sala', movementId: s.id, ...answersFor(planSala(real, s.id, ++seed)) }, OLD_DAY).progress;
  }
  const { intros, signs, levelOrder, ...old } = p;
  const migrated = migrate({ version: 9, progress: old, settings: {} }).progress;
  assert.deepEqual(migrated.signs || {}, {}, 'la migración no da carteles por vistos');
  assert.equal(needsIntro(migrated, real, 'barroco'), true, 'jugar en una época no da su presentación por vista');
  const { seen } = walk(migrated, { until: (q) => q.artists?.rubens?.plays > 0 });
  const owed = loreStops(real).filter((s) => s.pos <= real.stepIndex('artist', 'rubens')).map(loreKey);
  for (const k of owed) assert.ok(before(seen, k, 'artist:rubens'), `${k} antes de Rubens`);
});

test('recorridos al azar con fallos, repasos y «a fondo»: nunca se juega nada con una parada didáctica sin ver detrás', () => {
  for (const s of [1, 2, 3]) {
    const rng = createRng(1000 + s).next;
    const start = s === 1 ? emptyProgress() : oldGame(s === 2 ? ['rafael'] : ['leonardo', 'miguel-angel']);
    const stopAt = real.stepIndex('artist', 'rubens');
    const { seen } = walk(start, { rng, fail: 0.2, detour: 0.15, until: (q) => real.steps.slice(0, stopAt + 1).every((st) => st.type === 'sala' ? q.salas?.[st.id]?.plays : q.artists?.[st.id]?.plays) });
    assert.ok(seen.includes(`tramo:${TRAMO}`), `semilla ${s}: «${TRAMO}» visto`);
  }
});
