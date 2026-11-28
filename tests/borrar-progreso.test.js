// «Borrar progreso» (Ajustes): qué borra, qué conserva, la pulsación larga y que nunca usa confirm().
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { wipeProgress, freshState, isProgressKey } from '../app/js/state/wipe.js';
import { createStore, STORAGE_KEY } from '../app/js/state/store.js';
import { migrate } from '../app/js/state/schema.js';
import { createHold } from '../app/js/ui/hold-press.js';
import { wipeDialogHtml, wipeButtonHtml, HOLD_MS } from '../app/js/ui/wipe-section.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

function storage(init = {}) {
  const data = { ...init };
  return {
    get length() { return Object.keys(data).length; },
    key: (i) => Object.keys(data)[i] ?? null,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
    data,
  };
}

const played = () => {
  const st = migrate(null);
  return { ...st, onboarded: true, progress: { ...st.progress, xp: 900 }, settings: { ...st.settings, theme: 'dark', music: false, sfx: false, volume: 0.2, reducedMotion: true, dailyGoal: 200, name: 'Ana', avatar: 'w12' } };
};

test('borrar: quita el progreso y las claves de progreso, y conserva las preferencias', () => {
  const st = played();
  const s = storage({
    [STORAGE_KEY]: JSON.stringify(st),
    'sfumato.coach': '1', 'sfumato.stories': '["a:1"]', 'sfumato.lastStep': 'x', 'sfumato.futura': '1',
    'mirada.test.last': '{}', 'mirada.test.recent': '[]', 'mirada.cuadro': '{}',
    'sfumato.su': '1', 'sfumato.dj': '1', 'sfumato.clock': '{}', 'sfumato.recarga': '1',
    'mirada.cuenta': '{"refresh":"R"}', 'mirada.stats': 'x',
  });
  const next = wipeProgress(s, st.settings);
  for (const k of ['sfumato.coach', 'sfumato.stories', 'sfumato.lastStep', 'sfumato.futura', 'mirada.test.last', 'mirada.test.recent', 'mirada.cuadro']) assert.equal(s.getItem(k), null, k);
  for (const k of ['sfumato.su', 'sfumato.dj', 'sfumato.clock', 'sfumato.recarga', 'mirada.cuenta', 'mirada.stats']) assert.notEqual(s.getItem(k), null, `${k} no es progreso`);
  const saved = JSON.parse(s.getItem(STORAGE_KEY));
  assert.deepEqual(saved, next);
  assert.equal(saved.onboarded, false, 'vuelve la bienvenida');
  assert.equal(saved.progress.xp, 0);
  assert.deepEqual(saved.progress.artists || {}, {});
  assert.deepEqual({ theme: saved.settings.theme, music: saved.settings.music, sfx: saved.settings.sfx, volume: saved.settings.volume, reducedMotion: saved.settings.reducedMotion },
    { theme: 'dark', music: false, sfx: false, volume: 0.2, reducedMotion: true });
  assert.equal(saved.settings.name, '');
  assert.equal(saved.settings.avatar, '');
  assert.equal(saved.settings.dailyGoal, freshState().settings.dailyGoal);
  assert.equal(createStore({ storage: s }).get().progress.xp, 0, 'el almacén lo lee sin errores');
});

test('isProgressKey: solo progreso', () => {
  assert.equal(isProgressKey('sfumato.coach'), true);
  assert.equal(isProgressKey('mirada.cuadro'), true);
  assert.equal(isProgressKey('sfumato.su'), false);
  assert.equal(isProgressKey('mirada.cuenta'), false);
  assert.equal(isProgressKey(null), false);
});

test('mantener pulsado: solo cuenta al cumplir el tiempo; soltar antes cancela', () => {
  const log = [];
  const timers = { fn: null, setTimeout: (f) => { timers.fn = f; return 1; }, clearTimeout: () => { timers.fn = null; } };
  const hold = createHold({ ms: HOLD_MS, onStart: () => log.push('start'), onCancel: () => log.push('cancel'), onDone: () => log.push('done'), timers });
  hold.start();
  hold.cancel();
  assert.equal(timers.fn, null);
  assert.deepEqual(log, ['start', 'cancel']);
  hold.start();
  hold.start(); // el teclado repite: no reinicia
  timers.fn();
  assert.deepEqual(log, ['start', 'cancel', 'start', 'done']);
  hold.cancel(); // ya terminado: no hay nada que cancelar
  assert.equal(log.length, 4);
});

test('diálogo: dos pasos con los textos pedidos, «Cancelar» principal y sin confirm()', () => {
  const html = wipeDialogHtml();
  assert.match(html, /¿Borrar todo tu progreso\?/);
  assert.match(html, /Se perderán tus pintores, cuadros, medallas, racha y ajustes de juego\. No se puede deshacer\./);
  assert.match(html, /Se conservan el tema, el volumen y la música\./);
  assert.match(html, /Última confirmación\. Es irreversible\./);
  assert.match(html, /btn btn-primary" data-action="wipe-cancel">Cancelar/);
  assert.match(html, /data-action="wipe-next">Borrar</);
  assert.doesNotMatch(html, /data-action="wipe-(do|confirm)"/, 'el segundo paso no se confirma con un toque');
  assert.match(wipeButtonHtml(), />Borrar progreso</);
  const src = ['../app/js/ui/wipe-section.js', '../app/js/ui/hold-press.js', '../app/js/state/wipe.js', '../app/js/ui/screens/profile-settings.js'].map(read).join('\n');
  assert.doesNotMatch(src, /\b(confirm|alert|prompt)\(/);
  assert.match(read('../app/js/ui/screens/profile-settings.js'), /wipeButtonHtml\(\)[\s\S]*<\/dialog>/, 'va al final de Ajustes');
  assert.ok(read('../app/js/ui/screens/profile-settings.js').indexOf('data-action="credits"') < read('../app/js/ui/screens/profile-settings.js').indexOf('wipeButtonHtml()'), 'tras «Fuentes y créditos»');
});

test('el botón y la barra usan variables, no colores a mano', () => {
  const css = read('../app/css/profile.css');
  const block = css.slice(css.indexOf('.settings-wipe'), css.indexOf('.settings-credits:focus-visible'));
  assert.match(block, /var\(--bad\)/);
  assert.doesNotMatch(block, /#[0-9a-f]{3,8}\b|rgba?\(/i);
});
