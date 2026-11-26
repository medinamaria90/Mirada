import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyProgress, nextStepIn } from '../app/js/engine/progress.js';
import { bigIndex } from './helpers.js';

const played = (progress, ids, rec) => ({ ...progress, artists: { ...progress.artists, ...Object.fromEntries(ids.map((id) => [id, rec])) } });

test('siguiente parada de una época: la abierta, si no la empezada, y nada si está todo dominado o cerrado', () => {
  const index = bigIndex();
  const p0 = emptyProgress();
  assert.equal(nextStepIn(p0, index, 'mov1')?.id, 'p11');
  assert.equal(nextStepIn(p0, index, 'mov2'), null, 'época aún cerrada: sin parada');
  const started = played(p0, ['p11'], { plays: 1, best: 0.2 });
  assert.equal(nextStepIn(started, index, 'mov1')?.id, 'p11', 'empezada y sin aprobar: sigue ahí');
  const mastered = played(p0, ['p11', 'p12', 'p13'], { plays: 1, best: 1, mastered: true });
  assert.equal(nextStepIn(mastered, index, 'mov1'), null);
  assert.equal(nextStepIn(mastered, index, 'mov2')?.id, 'p21');
});
