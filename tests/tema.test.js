// Tema (feedback de María, punto 7): en Ajustes hay un selector «Claro · Oscuro · Como el móvil» que se
// guarda en settings.theme y pone data-theme en <html>; brand.css define el oscuro tanto para el sistema
// como para el forzado. Sin navegador: el documento se simula con lo mínimo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { applyTheme, chooseTheme, themePicker } from '../app/js/ui/theme.js';
import { createStore, STORAGE_KEY } from '../app/js/state/store.js';
import { THEMES, DEFAULT_THEME, normalizeTheme } from '../app/js/state/schema.js';
import { memoryStorage } from './helpers.js';

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..', 'app');

// Elemento mínimo con atributos; el documento simulado resuelve --bg según data-theme.
function fakeElement(attrs = {}) {
  const map = new Map(Object.entries(attrs));
  return {
    getAttribute: (k) => (map.has(k) ? map.get(k) : null),
    setAttribute: (k, v) => map.set(k, String(v)),
    removeAttribute: (k) => map.delete(k),
    hasAttribute: (k) => map.has(k),
  };
}
function fakeDocument({ systemDark = false } = {}) {
  const html = fakeElement();
  const metas = [fakeElement({ name: 'theme-color', content: 'LIGHT-BG', media: '(prefers-color-scheme: light)' }), fakeElement({ name: 'theme-color', content: 'DARK-BG', media: '(prefers-color-scheme: dark)' })];
  const bg = () => {
    const forced = html.getAttribute('data-theme');
    const dark = forced ? forced === 'dark' : systemDark;
    return dark ? ' DARK-BG ' : ' LIGHT-BG ';
  };
  return {
    documentElement: html,
    metas,
    querySelectorAll: (sel) => (sel === 'meta[name="theme-color"]' ? metas : []),
    defaultView: { getComputedStyle: () => ({ getPropertyValue: (p) => (p === '--bg' ? bg() : '') }) },
  };
}

test('tema: tres valores, «como el móvil» por defecto y cualquier otra cosa vuelve a él', () => {
  assert.deepEqual(THEMES, ['light', 'dark', 'system']);
  assert.equal(DEFAULT_THEME, 'system');
  for (const v of ['light', 'dark', 'system']) assert.equal(normalizeTheme(v), v);
  for (const v of [undefined, null, 'auto', 'DARK', 3]) assert.equal(normalizeTheme(v), 'system');
});

test('tema: applyTheme pone o quita data-theme y lleva la barra del navegador al fondo del tema', () => {
  const doc = fakeDocument({ systemDark: true });
  assert.equal(applyTheme('light', doc), 'light');
  assert.equal(doc.documentElement.getAttribute('data-theme'), 'light');
  assert.deepEqual(doc.metas.map((m) => m.getAttribute('content')), ['LIGHT-BG', 'LIGHT-BG'], 'con el móvil en oscuro, «Claro» pinta la barra clara');
  assert.equal(applyTheme('dark', doc), 'dark');
  assert.deepEqual(doc.metas.map((m) => m.getAttribute('content')), ['DARK-BG', 'DARK-BG']);
  assert.equal(applyTheme('system', doc), 'system');
  assert.equal(doc.documentElement.hasAttribute('data-theme'), false);
  assert.deepEqual(doc.metas.map((m) => m.getAttribute('content')), ['LIGHT-BG', 'DARK-BG'], 'vuelven los colores por esquema del index.html');
  assert.equal(applyTheme('lo-que-sea', doc), 'system');
  assert.equal(doc.documentElement.hasAttribute('data-theme'), false);
});

test('tema: chooseTheme guarda settings.theme, sobrevive a la recarga y aplica el atributo', () => {
  const storage = memoryStorage();
  const store = createStore({ storage });
  const doc = fakeDocument();
  assert.equal(store.get().settings.theme, 'system');
  assert.equal(chooseTheme(store, 'dark', doc), 'dark');
  assert.equal(store.get().settings.theme, 'dark');
  assert.equal(JSON.parse(storage.data[STORAGE_KEY]).settings.theme, 'dark');
  assert.equal(createStore({ storage }).get().settings.theme, 'dark');
  assert.equal(doc.documentElement.getAttribute('data-theme'), 'dark');
  assert.equal(chooseTheme(store, 'rarito', doc), 'system', 'un valor extraño no se guarda tal cual');
  assert.equal(store.get().settings.theme, 'system');
  assert.equal(doc.documentElement.hasAttribute('data-theme'), false);
});

test('tema: el selector de Ajustes tiene las tres opciones y marca solo la elegida', () => {
  const html = themePicker('dark');
  assert.equal((html.match(/data-action="theme"/g) || []).length, 3);
  for (const name of ['Claro', 'Oscuro', 'Como el móvil']) assert.ok(html.includes(`>${name}<`), `falta «${name}»`);
  assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
  assert.ok(html.includes('data-value="dark" aria-pressed="true"'));
  assert.ok(html.includes('class="seg is-on" data-action="theme" data-value="dark"'));
  assert.ok(themePicker(undefined).includes('data-value="system" aria-pressed="true"'), 'sin valor, «Como el móvil»');
  assert.ok(html.includes('>Tema<') && html.includes('role="group"'));
});

test('tema: el index.html fuerza el tema guardado antes de pintar, con la misma clave del almacén', () => {
  const html = readFileSync(join(app, 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] || '';
  assert.ok(script.includes(`localStorage.getItem('${STORAGE_KEY}')`), 'el guion de arranque no lee la clave del almacén');
  assert.ok(script.includes("setAttribute('data-theme'") && script.includes('settings.theme'));
  assert.ok(html.includes('href="js/ui/theme.js"'), 'theme.js sin precarga');
});

test('tema: en brand.css el oscuro vale para el sistema (sin forzar claro) y para «Oscuro», con copias idénticas', () => {
  const css = readFileSync(join(app, 'css', 'brand.css'), 'utf8');
  const block = (selector) => {
    const m = css.match(new RegExp(`${selector.replace(/[[\]()*+?.\\^$|]/g, '\\$&')}\\s*\\{([^}]*)\\}`));
    assert.ok(m, `falta el bloque ${selector}`);
    return m[1].split(/;\s*/).map((d) => d.trim()).filter((d) => d && !d.startsWith('/*')).sort();
  };
  const viaMedia = block(':root:not([data-theme="light"])');
  const forced = block(':root[data-theme="dark"]');
  assert.ok(viaMedia.length >= 15, 'el bloque oscuro se ha quedado corto');
  assert.deepEqual(forced.filter((d) => !d.startsWith('color-scheme')), viaMedia, 'las dos copias del tema oscuro se han separado');
  const mediaIdx = css.indexOf('@media (prefers-color-scheme: dark)');
  assert.ok(mediaIdx >= 0 && css.indexOf(':root:not([data-theme="light"])', mediaIdx) > mediaIdx, 'el bloque del sistema no está dentro del @media');
  assert.ok(/:root\[data-theme="light"\]\s*\{\s*color-scheme:\s*light/.test(css), 'forzar «Claro» no fija color-scheme');
  assert.ok(/:root\[data-theme="dark"\]\s*\{\s*color-scheme:\s*dark/.test(css), 'forzar «Oscuro» no fija color-scheme');
});
