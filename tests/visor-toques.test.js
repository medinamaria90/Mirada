// Visor y toques: el doble toque amplía (no cierra), el toque simple en el fondo espera a descartar un
// doble toque, deslizar hacia abajo cierra y, al cerrar cualquier capa, los toques fantasma no
// responden la pregunta de debajo. Lo puro va siempre; el recorrido táctil en Chrome (móvil, con
// hasTouch) solo con MIRADA_E2E=1 (Playwright y Chrome en MIRADA_PLAYWRIGHT y MIRADA_CHROME).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { createServer } from 'node:net';
import { GHOST_RADIUS, GHOST_TAP_MS, RECENT_POINTER_MS, isGhostTap, shouldGuard } from '../app/js/ui/tap-guard.js';
import { DROP_DISTANCE, TAP_GAP_MS, isDropClose } from '../app/js/ui/viewer-zoom.js';

const here = dirname(fileURLToPath(import.meta.url));
const src = (p) => readFileSync(join(here, '..', 'app', p), 'utf8');

test('toques fantasma: se descartan los toques en el mismo sitio durante el margen, nunca el teclado', () => {
  assert.ok(GHOST_TAP_MS >= 400 && GHOST_TAP_MS <= 500);
  const g = { until: 450, x: 100, y: 100 };
  assert.equal(isGhostTap({ detail: 1, x: 110, y: 120 }, 100, g), true);
  assert.equal(isGhostTap({ detail: 1, x: 110, y: 120 }, 451, g), false, 'pasado el margen');
  assert.equal(isGhostTap({ detail: 1, x: 100, y: 100 + GHOST_RADIUS + 1 }, 100, g), false, 'un toque decidido en otro sitio');
  assert.equal(isGhostTap({ detail: 0, x: 100, y: 100 }, 100, g), false, 'Enter o Espacio (detail 0) siempre pasan');
  assert.equal(isGhostTap({ detail: 1, x: 100, y: 100 }, 100, null), false);
});

test('toques fantasma: la guarda solo se arma si el cierre viene de un toque (no con Esc ni atrás)', () => {
  assert.equal(shouldGuard(1000, 1000 - 50), true);
  assert.equal(shouldGuard(1000, 1000 - RECENT_POINTER_MS - 1), false);
  assert.equal(shouldGuard(1000, -Infinity), false);
  assert.equal(shouldGuard(1000, 900, 950), false, 'una tecla después del toque: se ha cerrado con Esc');
});

test('toques fantasma: el visor y todas las hojas que se cierran sobre la pantalla activan la guarda', () => {
  for (const f of ['js/ui/viewer.js', 'js/ui/modal-slot.js', 'js/ui/artwork-sheet.js', 'js/ui/cuadro-frame.js',
    'js/ui/story-core.js', 'js/ui/story-link.js', 'js/ui/screens/profile-sheet.js']) {
    assert.match(src(f), /guardGhostTaps\(\)/, `${f} no protege contra toques fantasma al cerrar`);
  }
});

test('visor: deslizar hacia abajo cierra con recorrido o con velocidad', () => {
  assert.equal(isDropClose(DROP_DISTANCE, 0), true);
  assert.equal(isDropClose(DROP_DISTANCE - 1, 0), false);
  assert.equal(isDropClose(40, 1), true, 'un gesto rápido corto también cierra');
  assert.equal(isDropClose(8, 2), false, 'un toque no es un deslizamiento');
});

test('sin zoom de página: viewport fijo y doble toque desactivado fuera del visor', () => {
  assert.match(src('index.html'), /user-scalable=no/);
  assert.match(src('css/main.css'), /\*, \*::before, \*::after \{ touch-action: pan-x pan-y; \}/);
  assert.match(src('css/main.css'), /\.viewer-stage, \.viewer-stage \* \{ touch-action: none;/);
});

// --- Recorrido táctil real ----------------------------------------------------------------------
const enabled = process.env.MIRADA_E2E === '1';
const PLAYWRIGHT = process.env.MIRADA_PLAYWRIGHT || '/opt/node-tools/node_modules/playwright';
const CHROME = process.env.MIRADA_CHROME || '/usr/bin/google-chrome';
const QUICK_MS = 110; // entre los dos toques de un doble toque

const freePort = () => new Promise((ok) => {
  const s = createServer();
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => ok(port)); });
});

test('visor en el móvil: doble toque amplía sin cerrar, el toque tras cerrar no responde y el pellizco amplía', {
  skip: enabled ? false : 'recorrido táctil omitido: ejecuta con MIRADA_E2E=1 para incluirlo',
  timeout: 90 * 1000,
}, async () => {
  const port = await freePort();
  const server = spawn(process.env.MIRADA_PYTHON || 'python3', [join(here, '..', 'tools', 'serve_local.py'), String(port), join(here, '..', 'app'), process.env.MIRADA_IMG_DIR || ''], { stdio: 'ignore' });
  const { chromium } = await import(pathToFileURL(join(PLAYWRIGHT, 'index.mjs')).href);
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--mute-audio'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    for (let i = 0; i < 50; i += 1) {
      try { await page.goto(`http://127.0.0.1:${port}/`); break; } catch { await page.waitForTimeout(100); }
    }
    await page.waitForTimeout(800);
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], id) => ({ x, y, id })) });

    // Una «respuesta» que tapa toda la pantalla debajo del visor: cuenta los toques que le llegan.
    const open = () => page.evaluate(async () => {
      if (!document.getElementById('e2e-answer')) {
        const b = document.createElement('button');
        b.id = 'e2e-answer';
        b.style.cssText = 'position:fixed;inset:0;z-index:2147483000;opacity:0';
        window.__hits = 0;
        b.addEventListener('click', () => { window.__hits += 1; });
        document.body.appendChild(b);
      }
      const { openViewer } = await import('/js/ui/viewer.js');
      const index = { artist: () => ({ name: 'Pintor' }) };
      const works = [{ id: 'e2e', title: 'Cuadro', img: 'img/e2e-no-existe.jpg', w: 1600, h: 900, artistId: 'p' }];
      window.__v = openViewer({ index, works, reveal: false, title: '¿De qué época es?' });
    });
    const state = () => page.evaluate(() => ({
      open: Boolean(document.querySelector('.viewer[open]')), zoom: window.__v?.zoom ?? 1, hits: window.__hits,
    }));
    const boxes = () => page.evaluate(() => {
      const f = document.querySelector('.viewer-frame').getBoundingClientRect();
      const st = document.querySelector('.viewer-stage').getBoundingClientRect();
      return { fx: f.left + f.width / 2, fy: f.top + f.height / 2, bx: f.left + f.width / 2, by: (st.top + f.top) / 2, fh: f.height };
    });
    const doubleTap = async (x, y) => { await page.touchscreen.tap(x, y); await page.waitForTimeout(QUICK_MS); await page.touchscreen.tap(x, y); };

    await open();
    let b = await boxes();
    // 1. Doble toque en el cuadro: no cierra y amplía; otro doble toque vuelve a 1×.
    await doubleTap(b.fx + 40, b.fy);
    await page.waitForTimeout(TAP_GAP_MS + 200);
    let s = await state();
    assert.ok(s.open, 'el doble toque sobre el cuadro cierra el visor');
    assert.ok(s.zoom > 1, `el doble toque no amplía (${s.zoom})`);
    await doubleTap(b.fx + 40, b.fy);
    await page.waitForTimeout(TAP_GAP_MS + 200);
    s = await state();
    assert.ok(s.open && s.zoom === 1, 'el segundo doble toque no vuelve a 1×');

    // 2. Doble toque en el fondo (encima del cuadro apaisado): tampoco cierra ni toca la respuesta.
    await doubleTap(b.bx, b.by);
    await page.waitForTimeout(TAP_GAP_MS + 300);
    s = await state();
    assert.ok(s.open, 'el doble toque en el fondo cierra el visor');
    assert.equal(s.hits, 0, 'un toque ha llegado a la respuesta de debajo');
    await page.keyboard.press('0');

    // 3. Pellizco: dos dedos que se separan amplían.
    await touch('touchStart', [[b.fx - 30, b.fy], [b.fx + 30, b.fy]]);
    for (let k = 1; k <= 8; k += 1) await touch('touchMove', [[b.fx - 30 - k * 12, b.fy], [b.fx + 30 + k * 12, b.fy]]);
    await touch('touchEnd', []);
    await page.waitForTimeout(300);
    s = await state();
    assert.ok(s.open && s.zoom > 1.5, `el pellizco no amplía (${s.zoom})`);
    await page.keyboard.press('0');
    await page.waitForTimeout(300);

    // 4. Toque simple en el fondo: espera al doble toque y luego cierra; un toque justo después no responde.
    await page.touchscreen.tap(b.bx, b.by);
    await page.waitForTimeout(100);
    assert.ok((await state()).open, 'el toque simple cierra de golpe, sin esperar a un posible doble toque');
    await page.waitForSelector('.viewer', { state: 'detached', timeout: 2000 });
    await page.touchscreen.tap(b.bx + 10, b.by + 10);
    assert.equal((await state()).hits, 0, 'el toque justo tras cerrar responde la pregunta');
    await page.waitForTimeout(GHOST_TAP_MS + 100);
    await page.touchscreen.tap(b.bx + 10, b.by + 10);
    assert.equal((await state()).hits, 1, 'pasado el margen, la respuesta no se puede pulsar');

    // 5. Cerrar con la X y tocar en seguida: tampoco responde.
    await open();
    await page.waitForTimeout(200);
    const x = await page.locator('.viewer [data-v="close"]').boundingBox();
    await page.touchscreen.tap(x.x + x.width / 2, x.y + x.height / 2);
    await page.touchscreen.tap(x.x + x.width / 2, x.y + x.height / 2);
    s = await state();
    assert.ok(!s.open && s.hits === 1, 'el toque tras cerrar con la X responde la pregunta');

    // 6. Deslizar hacia abajo cierra.
    await page.waitForTimeout(GHOST_TAP_MS + 100);
    await open();
    await page.waitForTimeout(200);
    b = await boxes();
    await touch('touchStart', [[b.fx, b.fy]]);
    for (let k = 1; k <= 10; k += 1) await touch('touchMove', [[b.fx, b.fy + k * 20]]);
    await touch('touchEnd', []);
    await page.waitForSelector('.viewer', { state: 'detached', timeout: 2000 });
  } finally {
    await browser.close();
    server.kill();
  }
});
