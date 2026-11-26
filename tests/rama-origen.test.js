// La rama de origen viaja a todo lo que relanza una etapa: «Siguiente en la rama» y «Repetir» del resultado, la
// ficha del pintor abierta desde la hoja de una rama y la propia hoja. Dentro de una rama manda el estado del pintor
// en esa rama (no el mejor de todas), también para los del camino común que aparecen en ella. Pintor en dos ramas:
// Juan de Juanes (Descubre el Renacimiento y Maestros españoles). Giotto, gran maestro de Gótico, solo está en esa rama.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stageRoute, parseRoute } from '../app/js/ui/router.js';
import { emptyProgress } from '../app/js/engine/progress.js';
import { branchAfterRound, branchLockReason, branchProgress, firstTramo, playStatus, playStatusFrom, statusInBranch } from '../app/js/engine/branches.js';
import { playTargets } from '../app/js/engine/painters.js';
import { realIndex } from './helpers-real.js';

const real = realIndex();
const TODAY = '2026-11-25';
const JUANES = 'juan-de-juanes';

test('rama de origen: la ruta la lleva y vuelve a salir igual', () => {
  for (const [artist, branch] of [[JUANES, 'descubre-renacimiento'], [JUANES, 'maestros-espanoles'], ['giotto', 'gotico']]) {
    const route = stageRoute(artist, branch);
    assert.equal(route, `etapa-${artist}--${branch}`);
    assert.deepEqual(parseRoute(`#${route}`), { name: 'stage', artistId: artist, branchId: branch });
  }
  assert.equal(stageRoute('giotto'), 'etapa-giotto');
  assert.deepEqual(parseRoute('#etapa-giotto'), { name: 'stage', artistId: 'giotto', branchId: '' });
});

test('rama de origen: el resultado sigue en la rama de la que se viene (Juan de Juanes y Giotto)', () => {
  const p = emptyProgress();
  real.steps.forEach((x) => { p.artists[x.id] = { plays: 1, best: 1, mastered: true, last: TODAY }; });
  p.artists[JUANES] = { plays: 1, best: 1, mastered: true, last: TODAY };
  p.artists.giotto = { plays: 1, best: 1, mastered: true, last: TODAY };
  assert.equal(branchAfterRound(p, real, JUANES, 'descubre-renacimiento').branch.id, 'descubre-renacimiento');
  assert.equal(branchAfterRound(p, real, JUANES, 'maestros-espanoles').branch.id, 'maestros-espanoles');
  assert.equal(branchAfterRound(p, real, 'giotto', 'gotico').branch.id, 'gotico');
});

// Camino común dominado hasta el primer tramo del Renacimiento: se abren Gótico, Maestros españoles y Descubre…
function renacimientoAbierto() {
  const p = emptyProgress();
  const last = firstTramo(real, 'renacimiento').at(-1).id;
  const stop = real.steps.findIndex((s) => s.id === last);
  for (const s of real.steps.slice(0, stop + 1)) (s.type === 'artist' ? p.artists : p.salas)[s.id] = { plays: 1, best: 1, mastered: true, last: TODAY };
  return p;
}

test('dentro de una rama manda el estado en esa rama: Juan de Juanes abierto en Maestros españoles y «Por abrir» en Descubre', () => {
  const p = renacimientoAbierto();
  // Al principio, cerrado en las dos: Bermejo va antes en Maestros españoles y Fra Angelico en Descubre.
  assert.equal(playStatus(p, real, JUANES), 'locked');
  assert.deepEqual(branchLockReason(p, real, JUANES, 'maestros-espanoles'), { pending: [], before: 'bermejo' });
  assert.deepEqual(branchLockReason(p, real, JUANES, 'descubre-renacimiento'), { pending: [], before: 'fra-angelico' });
  // Con Bermejo jugado (Berruguete ya está superado en el camino común) se abre en Maestros españoles.
  p.artists.bermejo = { plays: 1, best: 0.6, mastered: false, last: TODAY };
  // Fuera de una rama, el mejor de sus ramas: se puede jugar.
  assert.equal(playStatus(p, real, JUANES), 'available');
  assert.equal(statusInBranch(p, real, JUANES, 'maestros-espanoles'), 'available');
  assert.equal(playTargets(p, real, JUANES, 'maestros-espanoles').stage, 'available');
  // Desde Descubre sigue cerrado: la ruta no lo deja jugar y la ficha no lo ofrece.
  assert.equal(statusInBranch(p, real, JUANES, 'descubre-renacimiento'), 'locked');
  assert.equal(playStatusFrom(p, real, JUANES, 'descubre-renacimiento'), 'locked');
  assert.equal(playTargets(p, real, JUANES, 'descubre-renacimiento').stage, null);
  assert.equal(branchLockReason(p, real, JUANES, 'descubre-renacimiento').before, 'fra-angelico');
  assert.equal(playStatusFrom(p, real, JUANES, 'maestros-espanoles'), 'available');
  // Una rama que no lo tiene (o inventada en la URL) no cambia nada: manda la regla general.
  assert.equal(playStatusFrom(p, real, JUANES, 'gotico'), 'available');
  assert.equal(playStatusFrom(p, real, JUANES, 'no-existe'), 'available');
});

test('Giotto, solo en Gótico: Cimabue y Duccio van antes', () => {
  const p = renacimientoAbierto();
  assert.equal(playStatus(p, real, 'giotto'), 'locked');
  assert.deepEqual(branchLockReason(p, real, 'giotto', 'gotico'), { pending: [], before: 'cimabue' });
  p.artists.cimabue = { plays: 1, best: 0.6, mastered: false, last: TODAY };
  assert.equal(statusInBranch(p, real, 'giotto', 'gotico'), 'locked');
  assert.equal(branchLockReason(p, real, 'giotto', 'gotico').before, 'duccio');
  p.artists.duccio = { plays: 1, best: 1, mastered: true, last: TODAY };
  assert.equal(statusInBranch(p, real, 'giotto', 'gotico'), 'available');
  assert.equal(playStatus(p, real, 'giotto'), 'available');
  assert.equal(playTargets(p, real, 'giotto', 'gotico').stage, 'available');
});

test('«Se abre» frente a «Siguiente» se decide con el estado en la rama de origen', () => {
  // Antes de la ronda de Duccio en Gótico, Giotto está cerrado allí.
  const before = renacimientoAbierto();
  before.artists.cimabue = { plays: 1, best: 1, mastered: true, last: TODAY };
  assert.equal(statusInBranch(before, real, 'giotto', 'gotico'), 'locked');
  const after = structuredClone(before);
  after.artists.duccio = { plays: 1, best: 1, mastered: true, last: TODAY };
  assert.equal(branchAfterRound(after, real, 'duccio', 'gotico').next, 'giotto');
  assert.equal(statusInBranch(after, real, 'giotto', 'gotico'), 'available');
  // Juan de Juanes: tras Bermejo, «Siguiente en la rama» en Maestros españoles aunque en Descubre siga cerrado.
  const juanes = renacimientoAbierto();
  juanes.artists.bermejo = { plays: 1, best: 1, mastered: true, last: TODAY };
  assert.equal(branchAfterRound(juanes, real, 'bermejo', 'maestros-espanoles').next, JUANES);
  assert.equal(statusInBranch(juanes, real, JUANES, 'descubre-renacimiento'), 'locked');
});

test('un pintor del camino común jugado desde una rama sigue en ella: Berruguete desde Maestros españoles', () => {
  const p = renacimientoAbierto();
  // Bermejo (invitado, 1440) va antes que Berruguete en la rama: superado, el siguiente es Juan de Juanes.
  p.artists.bermejo = { plays: 1, best: 1, mastered: true, last: TODAY };
  assert.ok(real.pathIndex('berruguete') >= 0, 'Berruguete está en el camino común');
  const after = branchAfterRound(p, real, 'berruguete', 'maestros-espanoles');
  assert.equal(after.branch.id, 'maestros-espanoles');
  assert.equal(after.next, 'juan-de-juanes', '«Siguiente en la rama»: Juan de Juanes');
  assert.equal(after.mastered, 1);
  assert.equal(after.total, branchProgress(p, real, 'maestros-espanoles').total);
  assert.equal(stageRoute(after.next, after.branch.id), 'etapa-juan-de-juanes--maestros-espanoles');
  // Desde el camino (sin rama) o desde una rama que no lo tiene, sigue siendo una parada del camino.
  assert.equal(branchAfterRound(p, real, 'berruguete'), null);
  assert.equal(branchAfterRound(p, real, 'berruguete', 'gotico'), null);
  assert.equal(statusInBranch(p, real, 'berruguete', 'maestros-espanoles'), playStatus(p, real, 'berruguete'));
});
