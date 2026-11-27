// Las preguntas por autor («¿Cuál es de X?» y «¿Quién lo pintó?» con X de respuesta) solo usan pintores que ya han
// salido. Caso de María en Maestros españoles: tras jugar a Bermejo, la ronda de Juan de Juanes preguntaba por Fra
// Angelico, Uccello… (los anteriores en «Descubre el Renacimiento», la primera rama que lo lista), sin conocerlos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyProgress } from '../app/js/engine/progress.js';
import { firstTramo } from '../app/js/engine/branches.js';
import { planStage, metOnly } from '../app/js/engine/planner.js';
import { metArtistIds } from '../app/js/engine/painters.js';
import { realIndex } from './helpers-real.js';

const real = realIndex();
const TODAY = '2026-11-26';
const JUANES = 'juan-de-juanes';
const SEEDS = 40;

function espanolesTrasBermejo() {
  const p = emptyProgress();
  const last = firstTramo(real, 'renacimiento').at(-1).id;
  const stop = real.steps.findIndex((s) => s.id === last);
  for (const s of real.steps.slice(0, stop + 1)) (s.type === 'artist' ? p.artists : p.salas)[s.id] = { plays: 1, best: 1, mastered: true, last: TODAY };
  p.artists.bermejo = { plays: 1, best: 0.6, mastered: false, last: TODAY };
  return p;
}

// Pintor por el que pregunta cada pregunta de autor (las de movimiento no preguntan por nadie).
const authorsAsked = (plan) => plan.questions.filter((q) => q.type !== 'movement').map((q) => q.artistId);

test('rama: el orden de los anteriores es el de la rama desde la que se juega', () => {
  const ids = (list) => list.map((a) => a.id);
  assert.deepEqual(ids(real.branchBefore(JUANES, 'maestros-espanoles')), ['bermejo', 'berruguete']);
  assert.equal(real.branchBefore(JUANES, 'descubre-renacimiento')[0].id, 'fra-angelico');
  assert.equal(real.branchBefore(JUANES, 'no-existe')[0].id, 'fra-angelico');
  assert.deepEqual(real.branchBefore('bermejo', 'maestros-espanoles'), []);
});

test('Maestros españoles tras Bermejo: Juan de Juanes solo pregunta por pintores ya conocidos', () => {
  const p = espanolesTrasBermejo();
  const met = metArtistIds(p, real);
  const ok = new Set([...met, JUANES]);
  for (let seed = 1; seed <= SEEDS; seed++) {
    const plan = planStage(real, JUANES, seed, { branchId: 'maestros-espanoles', met });
    const strangers = authorsAsked(plan).filter((id) => !ok.has(id));
    assert.deepEqual(strangers, [], `semilla ${seed}: pregunta por ${strangers.join(', ')}`);
  }
});

test('sin historia ni nivel, un pintor anterior de la rama no sale como autor por el que se pregunta', () => {
  // Berruguete va antes en la rama pero, si no se ha jugado ni visto su historia, no cuenta como conocido.
  const p = espanolesTrasBermejo();
  delete p.artists.berruguete;
  const met = metArtistIds(p, real);
  assert.ok(!met.includes('berruguete'));
  for (let seed = 1; seed <= SEEDS; seed++) {
    const plan = planStage(real, JUANES, seed, { branchId: 'maestros-espanoles', met });
    assert.ok(!authorsAsked(plan).includes('berruguete'), `semilla ${seed}`);
  }
  // Ver su historia no basta: hay que haberlo jugado (decisión de María, 27/11).
  assert.ok(!metArtistIds(p, real, (id) => id === 'berruguete').includes('berruguete'));
});

test('primer pintor de la rama (Bermejo): todas las preguntas son de él', () => {
  const p = espanolesTrasBermejo();
  delete p.artists.bermejo;
  const met = metArtistIds(p, real);
  for (let seed = 1; seed <= SEEDS; seed++) {
    const plan = planStage(real, 'bermejo', seed, { branchId: 'maestros-espanoles', met });
    assert.deepEqual([...new Set(authorsAsked(plan))], ['bermejo'], `semilla ${seed}`);
  }
});

test('metOnly: sin lista de conocidos no filtra; con ella, solo los conocidos', () => {
  const list = [{ id: 'a' }, { id: 'b' }];
  assert.equal(metOnly(list, undefined), list);
  assert.deepEqual(metOnly(list, ['b']), [{ id: 'b' }]);
});
