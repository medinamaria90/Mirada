// Traslado del progreso desde la dirección antigua por el fragmento «#importar=».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeImport, decodeImport, importFromHash, IMPORT_PREFIX } from '../app/js/state/import-state.js';

const memory = (init = {}) => {
  const data = { ...init };
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data };
};
const state = (xp) => ({ version: 4, onboarded: true, progress: { xp, artists: {} }, settings: {} });

test('codifica y decodifica el estado (con tildes) en base64url', () => {
  const s = JSON.stringify({ ...state(120), nota: 'Velázquez ñ' });
  const enc = encodeImport(s);
  assert.ok(!/[+/=]/.test(enc));
  assert.deepEqual(decodeImport(IMPORT_PREFIX + enc), JSON.parse(s));
  assert.equal(decodeImport('#inicio'), null);
  assert.equal(decodeImport(IMPORT_PREFIX + '%%%'), null);
});

test('importa si trae más XP que lo que hay; si no, conserva lo actual', () => {
  const hash = IMPORT_PREFIX + encodeImport(JSON.stringify(state(300)));
  const empty = memory();
  assert.equal(importFromHash(empty, 'k', hash), true);
  assert.equal(JSON.parse(empty.data.k).progress.xp, 300);
  const more = memory({ k: JSON.stringify(state(500)) });
  assert.equal(importFromHash(more, 'k', hash), false);
  assert.equal(JSON.parse(more.data.k).progress.xp, 500);
  assert.equal(importFromHash(null, 'k', hash), false);
});
