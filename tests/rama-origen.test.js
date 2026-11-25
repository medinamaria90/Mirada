// La rama de origen viaja a todo lo que relanza una etapa: «Siguiente en la rama» y «Repetir» del resultado, la
// ficha del pintor abierta desde la hoja de una rama y la propia hoja. Pintores en dos ramas: Juan de Juanes
// (Descubre el Renacimiento y Maestros españoles) y Giotto (Gótico y Descubre el Renacimiento).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { stageRoute, parseRoute } from '../app/js/ui/router.js';
import { emptyProgress } from '../app/js/engine/progress.js';
import { branchAfterRound } from '../app/js/engine/branches.js';
import { realIndex } from './helpers-real.js';

const here = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(here, '..', 'app', 'js', p), 'utf8');
const real = realIndex();
const TODAY = '2026-11-25';

test('rama de origen: la ruta la lleva y vuelve a salir igual', () => {
  for (const [artist, branch] of [['juan-de-juanes', 'descubre-renacimiento'], ['giotto', 'descubre-renacimiento'], ['giotto', 'gotico']]) {
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
  p.artists['juan-de-juanes'] = { plays: 1, best: 1, mastered: true, last: TODAY };
  p.artists.giotto = { plays: 1, best: 1, mastered: true, last: TODAY };
  assert.equal(branchAfterRound(p, real, 'juan-de-juanes', 'descubre-renacimiento').branch.id, 'descubre-renacimiento');
  assert.equal(branchAfterRound(p, real, 'juan-de-juanes', 'maestros-espanoles').branch.id, 'maestros-espanoles');
  assert.equal(branchAfterRound(p, real, 'giotto', 'descubre-renacimiento').branch.id, 'descubre-renacimiento');
  assert.equal(branchAfterRound(p, real, 'giotto', 'gotico').branch.id, 'gotico');
});

test('rama de origen: «Repetir», «Siguiente en la rama», la ficha y la hoja usan stageRoute con la rama', () => {
  const result = read('ui/screens/result.js');
  assert.ok(/retry = [^;]*stageRoute\(plan\.artistId, inBranch\?\.branch\.id\)/s.test(result), '«Repetir» sin la rama');
  assert.ok(/stageRoute\(branchNext\.id, inBranch\.branch\.id\)/.test(result), '«Siguiente en la rama» sin la rama');
  assert.ok(/stageRoute\(artistId, opts\.branchId\)/.test(read('ui/artist-sheet.js')), 'la ficha juega sin la rama');
  const sheet = read('ui/map-sheet.js');
  assert.ok(/openArtistSheet\(ctx, b\.dataset\.id, \{ opener, branchId: b\.dataset\.branch/.test(sheet), 'la hoja abre la ficha sin la rama');
  assert.ok(/stageRoute\(b\.dataset\.id, b\.dataset\.branch\)/.test(sheet));
  // Ningún enlace a una etapa se escribe a mano fuera del router (salvo las paradas del camino común).
  for (const file of ['ui/artist-sheet.js', 'ui/map-sheet.js', 'ui/screens/path-map.js', 'ui/screens/home.js']) assert.ok(!/`etapa-\$\{/.test(read(file)), `${file}: ruta de etapa a mano`);
});
