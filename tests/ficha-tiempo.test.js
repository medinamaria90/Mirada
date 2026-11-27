// «Su tiempo»: cada barra de otro pintor es un botón que lleva a su ficha; la del propio pintor, no. Un nombre que no cabe
// en su barra sale fuera (nunca cortado) y el CSS da el área táctil mínima (--hit, 48 px) y foco visible.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { emptyProgress } from '../app/js/engine/progress.js';
import { timeHtml } from '../app/js/ui/ficha-tiempo.js';
import { realIndex } from './helpers-real.js';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, '..', 'app', 'css', 'ficha.css'), 'utf8');
const brand = readFileSync(join(here, '..', 'app', 'css', 'brand.css'), 'utf8');
const index = realIndex();

function ctxKnowing(ids) {
  const p = emptyProgress();
  for (const id of ids) for (const w of index.worksOf(id)) p.collection[w.id] = '2026-11-20';
  return { index, store: { get: () => ({ progress: p }) } };
}
const ids = ['veronese', 'tiziano', 'tintoretto', 'bruegel', 'el-greco'];

test('«Su tiempo»: las barras de otros pintores son botones a su ficha y la propia lleva aria-current', () => {
  const html = timeHtml(ctxKnowing(ids), 'veronese', () => null, true);
  const buttons = [...html.matchAll(/<button type="button" class="st-hit" data-ap="artist" data-id="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(buttons.length >= 1);
  assert.ok(!buttons.includes('veronese'));
  assert.equal((html.match(/aria-current="true"/g) || []).length, 1);
  assert.ok(!html.includes('role="img"'), 'no esconde los botones a los lectores de pantalla');
});

test('«Su tiempo»: sin navegación (dentro de una ronda) no hay botones', () => {
  const html = timeHtml(ctxKnowing(ids), 'veronese', () => null, false);
  assert.ok(!html.includes('<button'));
});

test('«Su tiempo»: un nombre que no cabe en su barra sale fuera, al lado con más sitio', () => {
  const html = timeHtml(ctxKnowing(ids), 'veronese', () => null, true);
  const out = [...html.matchAll(/class="st-bar[^"]*is-name-(left|right)[^"]*" style="--from:([\d.]+)%;--width:([\d.]+)%;--room:(\d+)"/g)];
  for (const [, side, from, width, room] of out) {
    const space = side === 'left' ? Number(from) : 100 - Number(from) - Number(width);
    assert.ok(Number(room) <= space, 'el nombre cabe en el sitio que se le da');
  }
});

test('«Su tiempo» y «No lo confundas con»: área táctil de 48 px, foco visible y sin destello', () => {
  assert.match(brand, /--hit: 48px/);
  assert.match(css, /--st-bar-h: var\(--hit\)/);
  assert.match(css, /button\.st-hit:focus-visible/);
  assert.match(css, /\.ap-twin:focus-visible/);
  assert.match(css, /\.st-hit \{[^}]*-webkit-tap-highlight-color: transparent/);
  assert.match(css, /\.ap-twin \{ -webkit-tap-highlight-color: transparent/);
});
