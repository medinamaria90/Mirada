// Niveles «a fondo» en el itinerario (decisión de María, 28/11): imprescindibles por época que cierran la puerta de la
// época siguiente (sin cerrar lo ya cruzado; las ramas nunca bloquean) y «Profundiza en…» intercalado, ponderado, en
// rotación y con enfriamiento (engine/essentials.js, engine/deepen.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyProgress, stepStatus, isPathMastered } from '../app/js/engine/progress.js';
import { deepStatus } from '../app/js/engine/levels.js';
import { essentialsOf, missingEssentials, allMissingEssentials, essentialStepLabel } from '../app/js/engine/essentials.js';
import {
  DEEPEN_EVERY, ROTATION, COOL_DAYS, COOL_FLOOR, currentOffer, pickOffer, noteOffer, skipOffer, settleOffer, offerWeight, deepenCandidates, deepenState,
} from '../app/js/engine/deepen.js';
import { nextStep } from '../app/js/engine/next-step.js';
import { doorLock, eraLore } from '../app/js/ui/screens/path-lore.js';
import { addDays } from '../app/js/engine/dates.js';
import { realIndex } from './helpers-real.js';

const real = realIndex();
const TODAY = '2026-11-28';
const done = () => ({ plays: 1, best: 1, mastered: true, last: TODAY });
const eras = real.visibleMovements.map((m) => m.id);
const stepsOfEras = (ids) => real.steps.filter((s) => ids.includes(s.type === 'sala' ? s.id : real.artist(s.id).movementId));
function masterEras(p, ids) {
  for (const s of stepsOfEras(ids)) (s.type === 'sala' ? p.salas : p.artists)[s.id] = done();
  return p;
}
function masterEssentials(p, ids) {
  for (const id of ids) for (const e of essentialsOf(real, id)) p.deep[`${e.artistId}:${e.level}`] = done();
  return p;
}
const firstOf = (era) => real.stepsOf(era)[0];

test('datos: cada época del camino tiene 2-4 imprescindibles de pintores del camino, con peso 1-3 y título', () => {
  for (const id of eras) {
    const list = essentialsOf(real, id);
    assert.ok(list.length >= 2 && list.length <= 4, `${id}: ${list.length}`);
    for (const e of list) {
      assert.ok(real.pathIndex(e.artistId) >= 0, `${e.artistId} fuera del camino`);
      assert.ok([1, 2, 3].includes(e.weight) && e.title, `${e.artistId}:${e.level}`);
      assert.ok(real.deepLevels(e.artistId).some((l) => l.id === e.level), `${e.artistId} sin nivel ${e.level}`);
    }
  }
  assert.ok(essentialsOf(real, 'romanticismo').some((e) => e.artistId === 'goya' && e.level === 2), 'las pinturas negras, su nivel 2');
});

test('un imprescindible es el primer «a fondo» de su pintor: se abre con el nivel 1 dominado y los siguientes, en orden', () => {
  const p = emptyProgress();
  assert.equal(deepStatus(p, real, 'goya', 2), 'locked');
  p.artists.goya = done();
  assert.equal(deepStatus(p, real, 'goya', 2), 'available');
  assert.equal(deepStatus(p, real, 'goya', 3), 'locked', 'sin atajos: el nivel 3 espera al 2 aunque sea imprescindible');
  p.deep['goya:2'] = done();
  assert.equal(deepStatus(p, real, 'goya', 3), 'available');
});

test('puerta de época: cruzar pide los imprescindibles de ESA época; el candado dice cuál y la guía lleva a él', () => {
  const upTo = eras.slice(0, eras.indexOf('barroco') + 1);
  const p = masterEssentials(masterEras(emptyProgress(), upTo), upTo.filter((id) => id !== 'barroco'));
  const next = firstOf('rococo-neoclasicismo');
  assert.equal(stepStatus(p, real, next), 'locked');
  const step = nextStep(p, real, TODAY, { plan: { kind: 'map' } });
  assert.equal(step.kind, 'essential');
  assert.equal(step.label, essentialStepLabel(real, essentialsOf(real, 'barroco')[0]));
  assert.ok(step.label.startsWith('Sigue: '), 'tono positivo');
  assert.match(step.to, /^a-fondo-/);
  assert.ok(!/ayer|mañana|hace /.test(step.label), 'sin tiempo concreto');
  masterEssentials(p, ['barroco']);
  assert.equal(stepStatus(p, real, next), 'available');
});

test('no se cierra hacia atrás: quien ya entró en la época sigue dentro aunque le falten imprescindibles', () => {
  const upTo = eras.slice(0, eras.indexOf('barroco') + 1);
  const p = masterEras(emptyProgress(), upTo);
  const next = firstOf('rococo-neoclasicismo');
  assert.equal(stepStatus(p, real, next), 'locked');
  p.intros['rococo-neoclasicismo'] = TODAY;
  assert.equal(stepStatus(p, real, next), 'available');
  // Y con la primera parada ya jugada, igual.
  const q = masterEras(emptyProgress(), upTo);
  q.artists[next.id] = { plays: 1, best: 0.6, mastered: false, last: TODAY };
  assert.notEqual(stepStatus(q, real, next), 'locked');
});

test('las ramas y los niveles no imprescindibles nunca bloquean; el final del camino pide todos los imprescindibles', () => {
  const p = masterEras(emptyProgress(), eras);
  masterEssentials(p, eras);
  // Ninguna rama jugada ni ningún otro nivel «a fondo»: todo abierto.
  for (const id of eras) assert.notEqual(stepStatus(p, real, firstOf(id)), 'locked', id);
  assert.equal(isPathMastered(p, real), true);
  assert.deepEqual(allMissingEssentials(p, real), []);
  delete p.deep['goya:2'];
  assert.deepEqual(allMissingEssentials(p, real).map((e) => `${e.artistId}:${e.level}`), ['goya:2']);
  assert.equal(stepStatus(p, real, firstOf('realismo')), 'mastered', 'lo ya jugado no se cierra');
});

// Jugador con el camino hecho hasta el Romanticismo (y sus imprescindibles, para poder cruzar): muchos niveles pendientes.
function midway() {
  const upTo = eras.slice(0, eras.indexOf('romanticismo') + 1);
  const p = masterEras(emptyProgress(), upTo);
  masterEssentials(p, upTo.slice(0, -1));
  for (const id of upTo) p.reviews[id] = { best: 1 }; // Pruebas de época superadas: nada pendiente atrás
  // Imprescindibles abiertos, los dos de una época ya cruzada (que no cierra hacia atrás): el 2 de Caravaggio (peso 3) y el 3
  // de Velázquez (peso 2). Los de Goya, hechos. (Lo empezado y sin abrir sigue cerrado: una sola regla, levels.js levelOpen.)
  masterEssentials(p, ['romanticismo']);
  delete p.deep['caravaggio:2'];
  delete p.deep['velazquez:3'];
  return p;
}

test('selección ponderada: los imprescindibles salen más a menudo, y los de más peso más aún', () => {
  const p = midway();
  const counts = {};
  const N = 3000;
  for (let i = 0; i < N; i += 1) {
    const st = { ...deepenState(p), count: i };
    const c = pickOffer(p, real, TODAY, st);
    counts[c.key] = (counts[c.key] || 0) + 1;
  }
  const cand = deepenCandidates(p, real);
  const rate = (pred) => {
    const keys = cand.filter(pred).map((c) => c.key);
    return keys.reduce((a, k) => a + (counts[k] || 0), 0) / keys.length;
  };
  const plain = rate((c) => !real.essential(c.artistId, c.level));
  const heavy = rate((c) => real.essential(c.artistId, c.level)?.weight === 3);
  const mid = rate((c) => real.essential(c.artistId, c.level)?.weight === 2);
  assert.ok(heavy > mid && mid > plain, `peso 3 ${heavy}, peso 2 ${mid}, normal ${plain}`);
  assert.ok(Object.keys(counts).length > cand.length / 2, 'variado: salen muchos distintos');
});

test('cadencia: cada DEEPEN_EVERY pintores nuevos; la propuesta a la vista se mantiene hasta aceptarla o saltarla', () => {
  let p = midway();
  const offer = currentOffer(p, real, TODAY);
  assert.ok(offer, 'con avance de sobra, toca proponer');
  p = noteOffer(p, real, offer.key);
  assert.equal(currentOffer(p, real, TODAY).key, offer.key, 'sigue a la vista');
  p = skipOffer(p, TODAY);
  assert.equal(currentOffer(p, real, TODAY), null, 'tras saltarla, no hasta jugar más pintores nuevos');
  const fresh = firstOf('realismo');
  const more = real.steps.slice(real.steps.indexOf(fresh), real.steps.indexOf(fresh) + DEEPEN_EVERY);
  p = masterEssentials(p, ['romanticismo']);
  for (const s of more) p.artists[s.id] = { plays: 1, best: 0.6, mastered: false, last: TODAY };
  assert.ok(currentOffer(p, real, TODAY), `tras ${DEEPEN_EVERY} pintores nuevos, otra`);
});

test('rotación: tras saltar A la siguiente no es A, y A no vuelve hasta haber ofrecido otras', () => {
  let p = midway();
  const seen = [];
  for (let i = 0; i < ROTATION + 2; i += 1) {
    p = { ...p, deepen: { ...deepenState(p), at: -100 } }; // siempre toca proponer
    const offer = currentOffer(p, real, addDays(TODAY, i));
    if (seen.length) assert.notEqual(offer.key, seen[seen.length - 1], 'nunca la recién saltada');
    assert.ok(!seen.slice(-(ROTATION - 1)).includes(offer.key), `${offer.key} repetida antes de ${ROTATION}`);
    seen.push(offer.key);
    p = skipOffer(noteOffer(p, real, offer.key), addDays(TODAY, i));
  }
  assert.equal(deepenState(p).skips[seen[0]].length, 1, 'el salto se guarda con su día');
  assert.equal(deepenState(p).skips[seen[0]][0], TODAY);
});

test('enfriamiento: muchos saltos bajan su peso, nunca a cero, y se recupera con el tiempo', () => {
  const p = midway();
  const c = { artistId: 'goya', level: 2, key: 'goya:2' };
  const fresh = offerWeight(p, real, c, TODAY);
  const withSkips = (n, day) => ({ ...deepenState(p), skips: { 'goya:2': Array.from({ length: n }, () => day) } });
  assert.equal(offerWeight(p, real, c, TODAY, withSkips(1, TODAY)), fresh, 'un salto no enfría');
  const cold = offerWeight(p, real, c, TODAY, withSkips(3, TODAY));
  const colder = offerWeight(p, real, c, TODAY, withSkips(8, TODAY));
  assert.ok(cold < fresh && colder < cold, `${fresh} > ${cold} > ${colder}`);
  assert.ok(colder >= fresh * COOL_FLOOR - 1e-9, 'nunca desaparece');
  assert.equal(offerWeight(p, real, c, addDays(TODAY, COOL_DAYS), withSkips(8, TODAY)), fresh, 'pasado el tiempo, se recupera');
});

test('jugar la propuesta la acepta; jugar otra cosa cuenta como salto con su día', () => {
  const p = noteOffer(midway(), real, 'goya:2');
  const accepted = settleOffer(p, { kind: 'stage', artistId: 'goya', level: 2 }, TODAY);
  assert.equal(deepenState(accepted).pending, '');
  assert.equal(deepenState(accepted).skips['goya:2'], undefined);
  const skipped = settleOffer(p, { kind: 'stage', artistId: 'goya' }, TODAY);
  assert.deepEqual(deepenState(skipped).skips['goya:2'], [TODAY]);
});

test('itinerario: «Profundiza en <pintor>: nivel N» entra antes de la parada siguiente, solo cuando toca', () => {
  let p = midway();
  masterEssentials(p, ['romanticismo']);
  const step = nextStep(p, real, TODAY, { plan: { kind: 'map' } });
  assert.equal(step.kind, 'deepen');
  assert.match(step.label, /^Profundiza en .+: nivel \d+$/);
  p = skipOffer(noteOffer(p, real, step.offer), TODAY);
  assert.equal(nextStep(p, real, TODAY, { plan: { kind: 'map' } }).kind, 'stop', 'saltada, sigue el camino');
  assert.deepEqual(missingEssentials(p, real, 'romanticismo'), []);
});

test('globo de la época cerrada: sin «la puerta de…» (el medallón es la puerta); con imprescindibles pendientes, dice cuál y «Ir» va a su nivel', () => {
  const upTo = eras.slice(0, eras.indexOf('barroco') + 1);
  const rococo = real.movement('rococo-neoclasicismo');
  const p = masterEssentials(masterEras(emptyProgress(), upTo), upTo.filter((id) => id !== 'barroco'));
  const missing = missingEssentials(p, real, 'barroco');
  assert.ok(missing.length >= 2, 'el caso necesita varios imprescindibles pendientes');
  const door = doorLock(p, real, rococo);
  assert.equal(door.lock, `Antes, conoce ${missing[0].title} y ${missing.length - 1} más`);
  assert.equal(door.unlock, `deep:${missing[0].artistId}:${missing[0].level}`, 'Ir, a su nivel (su pintor ya está dominado)');
  const html = eraLore({ movement: rococo, sealed: false, done: 0, total: 5, door, stop: { x: 100, y: 100 }, h: 1000, fresh: false, here: false });
  assert.ok(html.includes(`data-lock="Antes, conoce ${missing[0].title}`) && html.includes(`Cerrada: Antes, conoce `), 'el medallón lleva la línea y su etiqueta la lee');
  assert.ok(door.lock.length <= 70, 'cabe en el globo (232 px) en pocas líneas');
  // Con uno solo pendiente, sin «y n más».
  const one = masterEssentials(masterEras(emptyProgress(), upTo), upTo);
  delete one.deep[`${missing[0].artistId}:${missing[0].level}`];
  assert.equal(doorLock(one, real, rococo).lock, `Antes, conoce ${missing[0].title}`);
  assert.equal(doorLock(masterEssentials(masterEras(emptyProgress(), upTo), upTo), real, rococo), null, 'con todo hecho la puerta se abre');
  // Sin imprescindibles pendientes: lejos, «Se abre al llegar aquí» sin «Ir» ni cuadros sin presentar.
  const far = doorLock(emptyProgress(), real, rococo);
  assert.deepEqual(far, { lock: 'Se abre al llegar aquí', unlock: '' });
  // Con la parada anterior en juego (sin superar), se pide acertar la mitad con ella y «Ir» va a ella.
  const gate = real.steps[real.stepIndex(firstOf('rococo-neoclasicismo').type, firstOf('rococo-neoclasicismo').id) - 1];
  const near = masterEras(emptyProgress(), upTo.slice(0, -1));
  for (const s of real.stepsOf('barroco')) if (s !== gate && s.id !== gate.id) (s.type === 'sala' ? near.salas : near.artists)[s.id] = done();
  const prevDoor = doorLock(near, real, rococo);
  assert.ok(prevDoor.lock.startsWith('Antes, acierta la mitad con ') && prevDoor.unlock === `${gate.type}:${gate.id}`, JSON.stringify(prevDoor));
});
