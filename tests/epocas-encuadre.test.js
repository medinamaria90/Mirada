// Encuadre del cuadro en las tarjetas de época y de cartel (ui/screens/era-cards.js, engine/framing.js): la obra sale entera,
// con su proporción, sin recortar caras ni figuras («La creación de Adán» salía en cuadrado y a Adán le faltaba la cabeza).
// Solo una tarjeta con un detalle a propósito (`region`) puede recortar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cardFrame, coverLoss, ratioOf, MARCO_AR_MIN, MARCO_AR_MAX } from '../app/js/engine/framing.js';
import { regionOf } from '../app/js/engine/stories.js';
import { cardHtml } from '../app/js/ui/screens/era-cards.js';

const app = join(dirname(fileURLToPath(import.meta.url)), '..', 'app');
const read = (...p) => JSON.parse(readFileSync(join(app, ...p), 'utf8'));
const works = new Map(read('data', 'catalog.json').artworks.map((w) => [w.id, w]));

// Todas las tarjetas con cuadro: las de cada época y las de cada cartel (ramas y tramos).
function allCards() {
  const out = [];
  for (const f of readdirSync(join(app, 'data', 'epocas')).filter((n) => n.endsWith('.json') && n !== 'index.json')) {
    read('data', 'epocas', f).cards.forEach((c, i) => out.push({ where: `${f} #${i}`, card: c }));
  }
  for (const f of readdirSync(join(app, 'data', 'carteles')).filter((n) => n.endsWith('.json'))) {
    for (const [k, sign] of Object.entries(read('data', 'carteles', f))) {
      (sign?.cards || []).forEach((c, i) => out.push({ where: `${f} ${k} #${i}`, card: c }));
    }
  }
  return out.filter(({ card }) => card && card.artwork);
}

test('tarjetas de época y cartel: ninguna recorta una obra muy apaisada o muy alargada sin un detalle a propósito', () => {
  const cards = allCards();
  assert.ok(cards.length > 100, 'no se han encontrado las tarjetas');
  let extreme = 0;
  for (const { where, card } of cards) {
    const w = works.get(card.artwork);
    assert.ok(w, `${where}: la obra ${card.artwork} no está en el catálogo`);
    const r = ratioOf(w);
    const part = regionOf(card.region);
    if (part || card.focus) continue;
    const { ratio, box } = cardFrame(w, part);
    const loss = coverLoss(r, ratio);
    if (r < MARCO_AR_MIN || r > MARCO_AR_MAX) extreme++;
    assert.equal(box, null, `${where}: recorta sin region`);
    assert.ok(loss < 1e-9, `${where}: ${w.title} (${r.toFixed(2)}) pierde un ${Math.round(loss * 100)} % al encuadrarse`);
  }
  assert.ok(extreme > 10, 'la prueba no ve obras fuera de rango');
});

test('tarjeta de época: la caja lleva la proporción de la obra entera y la hoja de estilo la respeta', () => {
  const adan = { id: 'w1', artistId: 'a', title: 'La creación de Adán', w: 2150, h: 1000 };
  const index = { artwork: () => adan, artist: () => ({ short: 'Miguel Ángel' }) };
  const html = cardHtml(index, { kicker: 'Cómo se pintaba', text: 'Al fresco', artwork: 'w1' }, 2, 9);
  assert.match(html, /class="era-card-art" style="--card-ar:2\.1500"/);
  const css = readFileSync(join(app, 'css', 'epocas.css'), 'utf8');
  const rule = css.match(/\.era-card-art \.art \{([^}]*)\}/)?.[1] || '';
  assert.match(rule, /aspect-ratio:\s*var\(--card-ar\)/, 'la caja no reserva la proporción de la obra');
  assert.match(rule, /width:\s*min\(100%,\s*calc\(var\(--era-art-h\) \* var\(--card-ar\)\)\)/, 'el ancho no sale de la obra');
  assert.doesNotMatch(rule, /height:\s*100%/, 'una altura fija vuelve a recortar las obras apaisadas');
});

test('tarjeta de época con detalle a propósito: la caja toma la proporción de la región y la imagen se coloca', () => {
  const w = { w: 2000, h: 1000 };
  const { ratio, box } = cardFrame(w, regionOf([0.25, 0, 0.75, 1]));
  assert.equal(ratio, 1);
  assert.deepEqual(box, { left: -50, top: 0, width: 200, height: 100 });
  const index = { artwork: () => ({ id: 'w2', artistId: 'a', title: 'T', ...w }), artist: () => null };
  assert.match(cardHtml(index, { kicker: 'K', text: 't', artwork: 'w2', region: [0.25, 0, 0.75, 1] }, 2, 9), /era-card-art is-region" style="--card-ar:1\.0000;--rl:-50%/);
});
