// Una ronda jugada desde una rama vuelve a ella (salir, atrás, X, «Seguir»), aunque la pantalla anterior sea otra
// etapa de la misma rama (tras «Siguiente en la rama»).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stageReturnTo, parseRoute, stageRoute } from '../app/js/ui/router.js';

test('desde una rama, la vuelta es la pantalla de la rama', () => {
  assert.equal(stageReturnTo('gotico', 'rama-gotico'), 'rama-gotico');
  assert.equal(stageReturnTo('gotico', 'etapa-cimabue--gotico'), 'rama-gotico', 'tras «Siguiente en la rama»');
  assert.equal(stageReturnTo('gotico', ''), 'rama-gotico', 'ronda retomada');
});

test('sin rama, vuelve a la ficha o galería de la que se venía; si no, al camino', () => {
  assert.equal(stageReturnTo('', 'pintor-giotto'), 'pintor-giotto');
  assert.equal(stageReturnTo('', 'obras-giotto'), 'obras-giotto');
  assert.equal(stageReturnTo('', 'inicio'), null);
  assert.equal(stageReturnTo(undefined, 'etapa-giotto'), null);
});

test('la ruta de etapa de rama lleva la rama', () => {
  assert.deepEqual(parseRoute(`#${stageRoute('cimabue', 'gotico')}`), { name: 'stage', artistId: 'cimabue', branchId: 'gotico' });
});

test('«Ver» de pintores nuevos encuentra la rama aunque vaya dentro de «Ramas (n)»', async () => {
  const { branchSignSelector } = await import('../app/js/ui/new-painters.js');
  const sel = branchSignSelector('escuela-rusa');
  assert.ok(sel.includes('.branch[data-id="escuela-rusa"]'));
  assert.ok(sel.includes('.branch.is-group[data-members~="escuela-rusa"]'));
});
