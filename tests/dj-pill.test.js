// Modo «afinar música» en el móvil: tras meter el código en Ajustes, la barra se ve en el mapa
// (suene o no la música). Necesita Chrome y Playwright: solo con MIRADA_E2E=1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const enabled = process.env.MIRADA_E2E === '1';
const PORT = 8947;
const SETTLE_MS = 2500;
const TAPS = 5;
const CODE = '1612';
const STATE = { version: 4, onboarded: true,
  progress: { xp: 300, artists: {}, salas: {}, intros: { renacimiento: '2026-11-20' }, reviews: {}, srs: {}, collection: {}, medals: {},
    streak: { current: 2, best: 2, last: '2026-11-25', graceOn: null, days: [] },
    stats: { answered: 20, correct: 18, newCorrect: 10, rounds: 3 }, daily: {}, weekly: {}, challenges: { played: 0 }, xpByDay: {} },
  settings: { music: true, sfx: false, volume: 0.6, reducedMotion: false, dailyGoal: 50 }, session: {} };

test('afinar música: la barra se ve en el mapa tras entrar con el código', {
  skip: enabled ? false : 'omitido: ejecuta con MIRADA_E2E=1',
  timeout: 90000,
}, async () => {
  const pw = process.env.MIRADA_PLAYWRIGHT || '/opt/npm-tools/node_modules/playwright';
  const { chromium, devices } = await import(pathToFileURL(join(pw, 'index.mjs')).href);
  const server = spawn('python3', ['tools/serve_local.py', String(PORT), 'app'], { cwd: root, stdio: 'ignore' });
  const browser = await chromium.launch({ executablePath: process.env.MIRADA_CHROME || undefined });
  try {
    await new Promise((r) => setTimeout(r, 1000));
    const page = await browser.newPage({ ...devices['Pixel 7'] });
    const base = `http://127.0.0.1:${PORT}/`;
    // Partida sembrada antes de que arranque la app (una sola vez por pestaña), sin carreras con su primer guardado.
    await page.addInitScript((st) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('mirada.state', JSON.stringify(st)); localStorage.setItem('sfumato.coach', '1'); localStorage.setItem('mirada.coach', '1');
    }, STATE);
    await page.goto(`${base}#perfil`); await page.waitForTimeout(SETTLE_MS);
    await page.click('[data-action="open-settings"]');
    for (let i = 0; i < TAPS; i += 1) await page.click('#settings-title');
    await page.fill('.dj-sheet input[name=code]', CODE);
    await page.click('.dj-sheet button[type=submit]');
    await page.waitForSelector('.su-section:not([hidden])');
    assert.equal(await page.locator('.dj-bar').count(), 0, 'la barra no se enciende sola al entrar');
    await page.check('[data-su=dj]');
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
    await page.goto(`${base}#inicio`); await page.waitForTimeout(SETTLE_MS);
    await page.mouse.click(3, 300); // un toque: el navegador deja arrancar el audio
    await page.waitForTimeout(SETTLE_MS);
    const pill = await page.evaluate(() => {
      const p = document.querySelector('.dj-bar');
      const r = p?.getBoundingClientRect();
      const hit = p && r.width ? document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) : null;
      return { hidden: !p || p.hidden, visibleOnTop: Boolean(hit?.closest('.dj-bar')), text: p?.innerText ?? '' };
    });
    assert.equal(pill.hidden, false, 'la barra debe verse en el mapa');
    assert.equal(pill.visibleOnTop, true, 'nada debe taparla');
    assert.ok(pill.text.trim().length > 0);
    assert.ok(!/menu|renaissance/.test(pill.text), 'nombres humanos, no claves');
    await page.goto(`${base}#perfil`); await page.waitForTimeout(SETTLE_MS);
    await page.click('[data-action="open-settings"]');
    await page.uncheck('[data-su=dj]');
    assert.equal(await page.locator('.dj-bar').count(), 0, 'apagada, la barra desaparece');
    assert.equal(await page.locator('.su-section').isVisible(), true, 'la sección sigue disponible');
    const keyBefore = await page.evaluate(() => localStorage.getItem('mirada.state'));
    await page.click('[data-su=trial]');
    await page.waitForSelector('.trial-bar');
    assert.match(await page.innerText('.trial-bar'), /Modo prueba/);
    assert.equal(await page.locator('.stage.is-locked, [data-status="locked"]').count(), 0, 'en prueba no queda nada cerrado en el mapa');
    await page.click('.trial-back');
    assert.equal(await page.locator('.trial-bar').count(), 0);
    assert.equal(await page.evaluate(() => localStorage.getItem('mirada.state')), keyBefore, 'la partida real no cambia');
    await page.goto(`${base}#perfil`); await page.waitForTimeout(SETTLE_MS);
    await page.click('[data-action="open-settings"]');
    await page.click('[data-su=trial]'); // sale de Ajustes al momento: click, no check
    await page.waitForSelector('.trial-bar');
    await page.goto(`${base}#perfil`); await page.waitForTimeout(SETTLE_MS);
    await page.click('[data-action="open-settings"]');
    await page.click('[data-su-exit]');
    assert.equal(await page.locator('.trial-bar').count(), 0, 'salir del modo acaba también la prueba');
    assert.equal(await page.evaluate(() => localStorage.getItem('mirada.state')), keyBefore, 'y vuelve la partida real');
    await page.goto(`${base}#perfil`); await page.waitForTimeout(SETTLE_MS);
    await page.click('[data-action="open-settings"]');
    assert.equal(await page.locator('.su-section').isVisible(), false, 'salir oculta la sección');
    await page.reload(); await page.waitForTimeout(SETTLE_MS);
    await page.click('[data-action="open-settings"]');
    assert.equal(await page.locator('.su-section').isVisible(), false, 'la salida se recuerda');
  } finally {
    await browser.close();
    server.kill();
  }
});
