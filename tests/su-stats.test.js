// Fila «Estadísticas» del Superusuario: URL del panel, contador público y fallo silencioso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { panelUrl, counterUrl, parseVisitors, fetchWeeklyVisitors, statsRowHtml } from '../app/js/ui/su-stats.js';

test('panel: URL exacta y fila oculta sin código', () => {
  assert.equal(panelUrl('mirada'), 'https://mirada.goatcounter.com');
  assert.equal(panelUrl(''), '');
  assert.equal(statsRowHtml(''), '');
  assert.equal(panelUrl('a/b'), '');
  const html = statsRowHtml('mirada');
  assert.match(html, /href="https:\/\/mirada\.goatcounter\.com"/);
  assert.match(html, /target="_blank" rel="noopener"/);
});

test('contador público: URL de la última semana y números con separadores', () => {
  const url = counterUrl('mirada', new Date('2026-11-27T10:00:00Z'));
  assert.equal(url, 'https://mirada.goatcounter.com/counter/TOTAL.json?start=2026-11-20&end=2026-11-27');
  assert.equal(parseVisitors({ count: '1 234', count_unique: '1,234' }), 1234);
  assert.equal(parseVisitors({ count: '56' }), 56);
  assert.equal(parseVisitors({}), null);
});

test('si la petición falla o no está activado, devuelve null (solo enlace)', async () => {
  assert.equal(await fetchWeeklyVisitors('mirada', async () => ({ ok: true, json: async () => ({ count_unique: '42' }) })), 42);
  assert.equal(await fetchWeeklyVisitors('mirada', async () => ({ ok: false, status: 403 })), null);
  assert.equal(await fetchWeeklyVisitors('mirada', async () => { throw new Error('red'); }), null);
  assert.equal(await fetchWeeklyVisitors('', async () => assert.fail('sin código no pide nada')), null);
});

test('no hay token de API en el código', () => {
  for (const f of ['../app/js/ui/su-stats.js', '../app/js/stats-config.js']) {
    assert.doesNotMatch(readFileSync(new URL(f, import.meta.url), 'utf8'), /Bearer|api[_-]?token/i);
  }
});
