// Pantalla que no carga tras un despliegue (módulos de dos versiones mezclados): la app se recarga sola una vez y el
// service worker pide código, estilos y datos revalidados. Sin navegador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import { shouldAutoReload, RELOAD_KEY, RELOAD_WINDOW_MS } from '../app/js/ui/load-recovery.js';

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..', 'app');

function memoryStorage() {
  const data = new Map();
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => data.set(k, String(v)), data };
}

test('recuperación: el primer fallo de una ruta recarga sola; el segundo seguido, no (sin bucles)', () => {
  const storage = memoryStorage();
  assert.equal(shouldAutoReload(storage, '#rama-gotico', 1000), true);
  assert.equal(shouldAutoReload(storage, '#rama-gotico', 2000), false);
  // Pasado el margen, o en otra ruta, vuelve a intentarlo.
  assert.equal(shouldAutoReload(storage, '#rama-gotico', 1000 + RELOAD_WINDOW_MS), true);
  assert.equal(shouldAutoReload(storage, '#coleccion', 1000 + RELOAD_WINDOW_MS + 1), true);
});

test('recuperación: sin almacén o con datos rotos no recarga ni rompe', () => {
  assert.equal(shouldAutoReload(null, '#rama-gotico', 1000), false);
  const storage = memoryStorage();
  storage.setItem(RELOAD_KEY, '{roto');
  assert.equal(shouldAutoReload(storage, '#rama-gotico', 1000), false);
});

test('recuperación: un fallo al cargar una pantalla no usa alert y pasa por la recarga automática', () => {
  const main = readFileSync(join(app, 'js', 'main.js'), 'utf8');
  assert.ok(!/\balert\(|\bconfirm\(/.test(main));
  const lazy = main.slice(main.indexOf('function lazy('), main.indexOf('function render('));
  assert.ok(/shouldAutoReload\(/.test(lazy) && /location\.reload\(\)/.test(lazy), 'la carga diferida no se recupera sola');
  const html = readFileSync(join(app, 'index.html'), 'utf8');
  assert.ok(html.includes('href="js/ui/load-recovery.js"'), 'falta precargar load-recovery.js (cadena estática)');
});

// Ejecuta sw.js con un `self` falso y devuelve las opciones con que pide cada URL a la red.
async function swFetchInit(url) {
  const listeners = {};
  const calls = [];
  const self = {
    location: { origin: 'https://sfumato.test' },
    addEventListener: (type, fn) => { listeners[type] = fn; },
    skipWaiting: () => {},
    clients: { claim: () => {} },
  };
  const ctx = {
    self, URL,
    fetch: (req, init) => { calls.push({ req, init }); return Promise.resolve({ ok: false }); },
    caches: { open: () => Promise.reject(new Error('sin caché')), match: () => Promise.resolve(null), keys: () => Promise.resolve([]) },
  };
  vm.runInNewContext(readFileSync(join(app, 'sw.js'), 'utf8'), ctx);
  let responded;
  listeners.fetch({ request: { method: 'GET', url }, respondWith: (p) => { responded = p; } });
  await responded;
  return calls[0].init;
}

test('service worker: código, estilos, datos y la página se revalidan; las imágenes usan la caché normal', async () => {
  for (const path of ['/js/ui/screens/branch.js', '/css/main.css', '/data/catalog.json', '/', '/index.html']) {
    assert.equal((await swFetchInit(`https://sfumato.test${path}`))?.cache, 'no-cache', path);
  }
  for (const path of ['/img/w123.jpg', '/fonts/a.woff2']) {
    assert.equal(await swFetchInit(`https://sfumato.test${path}`), undefined, path);
  }
});
