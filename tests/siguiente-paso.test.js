// Siguiente paso recomendado (engine/next-step.js): una prueba por regla, en orden de prioridad, y ninguna con
// «mañana» ni «ayer». Sin navegador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bigIndex } from './helpers.js';
import { emptyProgress } from '../app/js/engine/progress.js';
import { nextStep } from '../app/js/engine/next-step.js';

const big = bigIndex();
const TODAY = '2026-11-24';
const [a, b, c, d, e, f] = big.path;

const mastered = (p, ids) => { for (const id of ids) { p.artists[id] = { plays: 1, best: 0.9, mastered: true, last: '2026-11-23' }; p.medals[`artist-${id}`] = '2026-11-23'; } return p; };
const seenWorksOf = (p, id, n = 4) => { big.worksOf(id).slice(0, n).forEach((w) => { p.collection[w.id] = '2026-11-20'; }); return p; };
const base = () => seenWorksOf(seenWorksOf(mastered(emptyProgress(), [a.id, b.id]), a.id), b.id);
const outcome = (accuracy, events = []) => ({ accuracy, events });
const step = (p, opts) => nextStep(p, big, TODAY, opts);

test('regla 1: etapa o sala por debajo del 50 % → «Repetir»', () => {
  const s = step(base(), { plan: { kind: 'stage', artistId: c.id }, outcome: outcome(0.4), goalJustMet: true });
  assert.deepEqual([s.kind, s.label, s.to], ['retry', 'Repetir', `etapa-${c.id}`]);
});

test('regla 2: la sesión cumple la meta → «Volver al camino» (el cierre dice «Por hoy, hecho»)', () => {
  const s = step(base(), { plan: { kind: 'stage', artistId: c.id }, outcome: outcome(0.8), goalJustMet: true });
  assert.deepEqual([s.kind, s.label, s.to], ['done', 'Volver al camino', 'inicio']);
});

test('regla 3: repaso que traía un pintor a medias → su ronda, «Sigue: <pintor>» (avanza, no «vuelve»)', () => {
  const p = base();
  p.artists[c.id] = { plays: 1, best: 0.6, mastered: false };
  const s = step(p, { plan: { kind: 'srs', started: c.id }, outcome: outcome(0.9) });
  assert.deepEqual([s.kind, s.label, s.to], ['stop', `Sigue: ${c.short || c.name}`, `etapa-${c.id}`]);
});

test('regla 4: 3 pintores a medias o 5 fallados, sin repaso antes → «Repasar»; nunca dos repasos seguidos', () => {
  const p = base();
  for (const x of [c, d, e]) p.artists[x.id] = { plays: 1, best: 0.6, mastered: false };
  seenWorksOf(p, c.id);
  const s = step(p, { plan: { kind: 'stage', artistId: e.id }, outcome: outcome(0.6) });
  assert.deepEqual([s.kind, s.label, s.to], ['review', 'Repasar', 'repaso']);
  assert.notEqual(step(p, { plan: { kind: 'stage', artistId: e.id }, outcome: outcome(0.6), prevKind: 'srs' }).kind, 'review');
  assert.notEqual(step(p, { plan: { kind: 'srs' }, outcome: outcome(0.6) }).kind, 'review');
  const q = base();
  q.fallados = big.worksOf(a.id).slice(0, 5).map((w) => ({ id: w.id, date: '2026-11-20', times: 1, hits: 0 }));
  assert.equal(step(q, { plan: { kind: 'daily' }, outcome: outcome(0.7) }).kind, 'review');
});

test('regla 5: rama con siguiente → «Siguiente en la rama»; nivel «a fondo» con siguiente → «Siguiente: <etapa>»', () => {
  const branch = big.branches?.[0];
  if (branch) {
    const p = mastered(emptyProgress(), big.path.map((x) => x.id));
    const [first] = branch.artists.filter((id) => big.pathIndex(id) < 0);
    p.artists[first] = { plays: 1, best: 0.8, mastered: true };
    const s = step(p, { plan: { kind: 'stage', artistId: first }, outcome: outcome(0.8), branchId: branch.id });
    if (s.kind === 'branch') assert.equal(s.label, 'Siguiente en la rama');
  }
  // «A fondo»: un índice con dos niveles para el pintor a.
  const levels = [{ id: 2, name: 'La corte', short: 'La corte' }, { id: 3, name: 'Los últimos años', short: 'Últimos años' }];
  const deepIndex = { ...big, deepLevels: (id) => (id === a.id ? levels : []), levelWorks: () => [] };
  const p = base();
  p.deep = { [`${a.id}:2`]: { plays: 1, best: 0.9, mastered: true } };
  const s = nextStep(p, deepIndex, TODAY, { plan: { kind: 'stage', artistId: a.id, level: 2 }, outcome: outcome(0.9, [{ type: 'deep-mastered', artistId: a.id, level: 2 }]) });
  assert.equal(s.kind, 'deep');
  assert.equal(s.label, 'Siguiente: Últimos años');
});

test('regla 5 bis: lo pendiente atrás (Prueba de época o el pintor a medias que la cierra), de vez en cuando', () => {
  const [m1, m2] = big.visibleMovements;
  const own = big.stepsOf(m1.id).filter((st) => st.type === 'artist').map((st) => st.id);
  const p = mastered(emptyProgress(), own.slice(0, -1));
  const late = own.at(-1);
  p.artists[late] = { plays: 1, best: 0.6, mastered: false };
  for (const st of big.stepsOf(m1.id).filter((x) => x.type === 'sala')) p.salas[st.id] = { plays: 1, best: 0.9, mastered: true };
  seenWorksOf(p, own[0]);
  const s = step(p, { plan: { kind: 'stage', artistId: late }, outcome: outcome(0.6) });
  const openStep = big.stepsOf(m2.id)[0];
  if (s.kind === 'debt') assert.deepEqual([s.label, s.to], [`Sigue: ${big.artist(late).short || big.artist(late).name}`, `etapa-${late}`]);
  else assert.equal(s.kind, 'stop', 'si la siguiente parada aún es de la misma época, no hay nada atrás');
  // Ya en la época siguiente: lo de atrás sale, pero nunca dos veces seguidas.
  p.artists[openStep.id] = undefined;
  const mid = step(p, { plan: { kind: 'stage', artistId: openStep.id }, outcome: outcome(0.8) });
  assert.equal(mid.kind, 'debt', JSON.stringify(mid));
  assert.equal(step(p, { plan: { kind: 'stage', artistId: openStep.id }, outcome: outcome(0.8), prevStep: 'debt' }).kind, 'stop');
  // Época terminada y su Prueba sin hacer: «Prueba de época: <época>».
  p.artists[late] = { plays: 2, best: 0.9, mastered: true };
  const test1 = step(p, { plan: { kind: 'stage', artistId: openStep.id }, outcome: outcome(0.8) });
  assert.deepEqual([test1.kind, test1.label, test1.to], ['debt', `Prueba de época: ${m1.name}`, `repaso-${m1.id}`]);
  p.reviews = { [m1.id]: { best: 0.8 } };
  assert.notEqual(step(p, { plan: { kind: 'stage', artistId: openStep.id }, outcome: outcome(0.8) }).kind, 'debt', 'superada, ya no se recomienda');
});

test('regla 6: parada abierta y sin jugar → «Sigue: <pintor>», con 50-74 % no se recomienda repetir', () => {
  const p = base();
  p.artists[c.id] = { plays: 1, best: 0.6, mastered: false };
  // (prevStep 'debt': lo pendiente atrás, la regla 5 bis, acaba de salir.)
  const s = step(p, { plan: { kind: 'stage', artistId: c.id }, outcome: outcome(0.6), prevStep: 'debt' });
  assert.deepEqual([s.kind, s.label, s.artistId], ['stop', `Sigue: ${d.short || d.name}`, d.id]);
});

test('regla 7: camino dominado → «Reto semanal» pendiente o, hecho, «Repasar»', () => {
  const p = mastered(emptyProgress(), big.steps.filter((s) => s.type === 'artist').map((s) => s.id));
  for (const s of big.steps.filter((x) => x.type === 'sala')) p.salas[s.id] = { plays: 1, best: 0.9, mastered: true };
  seenWorksOf(p, a.id);
  const first = step(p, { plan: { kind: 'daily' }, outcome: outcome(0.8), week: '2026-W48' });
  assert.deepEqual([first.kind, first.label], ['weekly', 'Reto semanal']);
  p.weekly = { '2026-W48': { score: 10, total: 15 } };
  assert.deepEqual(step(p, { plan: { kind: 'daily' }, outcome: outcome(0.8), week: '2026-W48' }).label, 'Repasar');
  assert.equal(step(p, { plan: { kind: 'srs' }, outcome: outcome(0.8), week: '2026-W48' }).kind, 'path', 'tras un repaso, no otro');
});

test('ningún paso dice «mañana» ni «ayer»', () => {
  const p = base();
  p.artists[c.id] = { plays: 1, best: 0.6, mastered: false };
  const cases = [
    { plan: { kind: 'stage', artistId: c.id }, outcome: outcome(0.3) },
    { plan: { kind: 'stage', artistId: c.id }, outcome: outcome(0.8), goalJustMet: true },
    { plan: { kind: 'srs', started: c.id }, outcome: outcome(0.8) },
    { plan: { kind: 'stage', artistId: c.id }, outcome: outcome(0.6) },
    { plan: { kind: 'story' } },
  ];
  for (const opts of cases) assert.doesNotMatch(JSON.stringify(step(p, opts)), /mañana|ayer/i);
  assert.ok(f);
});

// ---------------------------------------------------------------- Rango: lo que cuenta, una sola acción y vuelta al Perfil
const { realIndex } = await import('./helpers-real.js');
const { deepChoices, whyNoChoice, rankFocus, rankConditions } = await import('../app/js/engine/rank-goals.js');
const { RANKS } = await import('../app/js/engine/ranks.js');
const { stageReturnTo, isGoalScreen } = await import('../app/js/ui/router.js');
const real = realIndex();
const copista = RANKS.find((r) => r.name === 'Copista');
const oficial = RANKS.find((r) => r.name === 'Oficial de taller');
const masterReal = (ids) => { const p = emptyProgress(); for (const id of ids) { p.artists[id] = { plays: 1, best: 0.9, mastered: true }; p.medals[`artist-${id}`] = TODAY; } return p; };

test('rango: «Elegir» solo ofrece niveles «a fondo» que, aprobados, cuentan; ordenados por cercanía; si ninguno, por qué', () => {
  const p = masterReal(['botticelli', 'rafael', 'leonardo']);
  const deep = deepChoices(p, real, 'deep', copista);
  assert.ok(deep.length >= 3 && deep.every((c) => c.level === 2), 'el nivel 2 de cada pintor dominado cuenta');
  // Uno empezado y casi hecho va primero.
  p.deep = { 'leonardo:2': { plays: 1, best: 0.7, mastered: false } };
  assert.equal(deepChoices(p, real, 'deep', copista)[0].artistId, 'leonardo');
  // «El nivel 2 de un gran maestro»: solo grandes maestros y solo su nivel 2.
  const grand = deepChoices(p, real, 'grand', oficial);
  assert.ok(grand.length && grand.every((c) => real.artist(c.artistId).category === 'gran-maestro' && c.level === oficial.grand.upTo), JSON.stringify(grand));
  assert.ok(!grand.some((c) => c.artistId === 'botticelli' && real.artist('botticelli').category !== 'gran-maestro'));
  // Hasta el nivel 3: el nivel 2 aún no cumple; sin ninguno que cuente, ninguna elección y una línea humana.
  const upTo3 = { ...oficial, grand: { count: 1, upTo: 3 } };
  assert.deepEqual(deepChoices(p, real, 'grand', upTo3), []);
  assert.match(whyNoChoice('grand', upTo3), /nivel 2 de un gran maestro/);
  p.deep['rafael:2'] = { plays: 1, best: 0.9, mastered: true };
  assert.deepEqual(deepChoices(p, real, 'grand', upTo3).map((c) => [c.artistId, c.level]), [['rafael', 3]]);
  // «Épocas»: nunca un nivel de una época que ya tiene su «a fondo».
  const eraOf = real.artist('rafael').movementId;
  assert.ok(deepChoices(p, real, 'eras', { ...oficial, eras: 2 }).every((c) => real.artist(c.artistId).movementId !== eraOf));
  assert.doesNotMatch(rankConditions(oficial).map((c) => c.label).join(' '), /hasta el nivel/, 'texto que no se entiende');
});

test('rango: una sola acción recomendada, el nivel que cuenta para más condiciones', () => {
  const p = masterReal(['botticelli', 'rafael', 'leonardo']);
  p.xp = 2325;
  const conds = rankConditions(oficial, { xp: 2325, deep: 1, eras: 1, grand: [1], complete: 0 });
  const focus = rankFocus(p, real, oficial, conds);
  assert.equal(real.artist(focus.choice.artistId).category, 'gran-maestro', 'el nivel 2 de un gran maestro suma a dos condiciones');
  assert.deepEqual(focus.keys.sort(), ['deep', 'grand']);
  // Con solo XP pendiente, «Jugar».
  const onlyXp = rankFocus(p, real, oficial, rankConditions(oficial, { xp: 100, deep: 9, eras: 9, grand: [9], complete: 9 }));
  assert.deepEqual([onlyXp.key, onlyXp.choice], ['xp', null]);
});

test('rango: lo jugado desde el Perfil vuelve al Perfil (y desde logros, a logros)', () => {
  assert.equal(stageReturnTo('', 'perfil'), 'perfil');
  assert.equal(stageReturnTo('', 'logros'), 'logros');
  assert.ok(isGoalScreen('perfil') && !isGoalScreen('inicio'));
  const p = base();
  const s = step(p, { plan: { kind: 'stage', artistId: a.id, level: 2 }, outcome: outcome(0.8), goalJustMet: true, origin: 'perfil' });
  assert.deepEqual([s.kind, s.to, s.label], ['origin', 'perfil', 'Volver al perfil']);
  assert.equal(step(p, { plan: { kind: 'stage', artistId: a.id, level: 2 }, outcome: outcome(0.3), origin: 'perfil' }).kind, 'retry', 'con menos del 50 %, primero repetir');
});
