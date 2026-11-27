// Forma del camino (docs/eval/camino-experto.md): sendero que siempre sube, con curvas amplias y sin giros bruscos,
// unas cuatro paradas por pantalla, puerta con su arco al entrar en cada época (y en cada rama), puentes rectos y alineados con el sendero, carteles
// que no se pisan, el cartel de un tramo o de una rama en tarjetas y ningún cruce de agua sin puente en los paisajes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { pathLayout, branchLayout, roadX, bridgeSlots, BRIDGE_HALF, GATE_Y, STEP, GAP } from '../app/js/ui/screens/path-layout.js';
import { at } from '../app/js/ui/screens/path-curve.js';
import { signSources } from '../app/js/engine/credits.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const real = buildIndex(JSON.parse(readFileSync(join(root, 'app', 'data', 'catalog.json'), 'utf8')));
const layout = pathLayout(real);
const tramos = [...layout.eras, ...real.branches.map((b) => branchLayout(real, b))];

const MIN_RADIUS = 120;      // radio mínimo de curva (unidades de diseño)
const MAX_SLOPE = 0.72;      // desplazamiento lateral por unidad de subida (≈36° respecto a la vertical)
const SCREEN = 680;          // alto útil de una pantalla de móvil en unidades de diseño

// Recorre el sendero en muestras con su pendiente y su curvatura.
function samples(segs) {
  const out = [];
  const d = 1e-3;
  for (const s of segs) {
    for (let t = 0.02; t < 0.99; t += 0.02) {
      const a = at(s, t - d);
      const b = at(s, t + d);
      const c = at(s, t);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const k = Math.abs(dx * (b.y - 2 * c.y + a.y) - dy * (b.x - 2 * c.x + a.x)) / (Math.hypot(dx, dy) ** 3 || 1);
      out.push({ ...c, dy, slope: Math.abs(dx / (dy || 1e-9)), radius: k > 1e-9 ? 1 / k : Infinity });
    }
  }
  return out;
}

test('camino: el sendero siempre sube, sin giros bruscos (radio ≥ 120) ni tramos tumbados', () => {
  for (const t of tramos) {
    const pts = samples(t.segs);
    assert.ok(pts.every((p) => p.dy < 0), `${t.id}: el sendero baja en algún punto`);
    const r = Math.min(...pts.map((p) => p.radius));
    const slope = Math.max(...pts.map((p) => p.slope));
    assert.ok(r >= MIN_RADIUS, `${t.id}: giro brusco (radio ${Math.round(r)})`);
    assert.ok(slope <= MAX_SLOPE, `${t.id}: tramo demasiado tumbado (${slope.toFixed(2)})`);
  }
});

test('camino: unas cuatro paradas por pantalla y el sendero cambia de lado cada varias paradas, no en cada una', () => {
  const perScreen = SCREEN / STEP;
  assert.ok(perScreen >= 3.5 && perScreen <= 4.5, `${perScreen.toFixed(1)} paradas por pantalla`);
  for (const era of layout.eras) {
    const sides = era.points.map((p) => p.x < 195);
    const flips = sides.slice(1).filter((s, i) => s !== sides[i]).length;
    assert.ok(flips <= Math.ceil(era.points.length / 2.5), `${era.id}: cambia de lado ${flips} veces en ${era.points.length} paradas`);
  }
});

test('camino: puerta al entrar en cada época (salvo la primera, que sale de la muralla), con el sendero recto por ella', () => {
  layout.eras.forEach((era, i) => {
    if (!i) return assert.equal(era.gate, null);
    assert.ok(era.gate && era.gate.y === era.h - GATE_Y, `${era.id}: sin puerta`);
    for (const y of [era.gate.y - 20, era.gate.y, era.gate.y + 20]) assert.ok(Math.abs(roadX(era.segs, y) - era.gate.x) < 0.5, `${era.id}: el sendero no pasa recto por la puerta`);
  });
});

test('camino: los puentes van en el sendero, rectos y alineados con él, y solo donde llega derecho', () => {
  const withBridges = tramos.filter((t) => t.bridges.length);
  assert.ok(['renacimiento', 'manierismo-y-norte', 'impresionismo', 'gotico', 'escuela-rusa'].every((id) => withBridges.some((t) => t.id === id)), 'falta el puente de algún río');
  for (const t of withBridges) {
    for (const b of t.bridges) {
      for (let dy = -BRIDGE_HALF; dy <= BRIDGE_HALF; dy += 5) assert.ok(Math.abs(roadX(t.segs, b.y + dy) - b.x) < 0.5, `${t.id}: el sendero se tuerce sobre el puente`);
      assert.ok(Math.abs(t.points[b.at].x - t.points[b.at + 1].x) <= 30, `${t.id}: puente entre dos paradas de lados distintos`);
    }
  }
  assert.deepEqual(bridgeSlots([{ x: 130 }, { x: 260 }, { x: 250 }, { x: 140 }], 1), [1], 'el puente, donde el sendero va derecho');
  assert.deepEqual(bridgeSlots([{ x: 130 }, { x: 260 }], 1), [], 'sin tramo derecho no se tiende puente');
});

test('camino: el desvío de una rama nunca sale del paso de un puente ni pegado a su cabeza', () => {
  for (const e of layout.eras) {
    for (const s of e.branches) {
      for (const b of e.bridges) assert.ok(Math.abs(s.from.y - b.y) >= BRIDGE_HALF + 20, `${e.id}: el desvío de una rama choca con el puente`);
    }
  }
});

test('camino: espaciado por elementos; el mojón de cada tramo, en su hueco antes de su primer pintor, sin pisar nada', () => {
  const box = (s) => ({ y0: s.top ?? s.y - 66, y1: s.y });
  const overlapY = (a, b) => a.y0 < b.y1 && b.y0 < a.y1;
  for (const era of tramos) {
    const ys = era.points.map((p) => p.y);
    // Nunca menos de STEP entre dos paradas; donde hay mojón, rama o puente, más.
    ys.slice(1).forEach((y, i) => assert.ok(ys[i] - y >= STEP - 0.5, `${era.id}: paradas ${i} y ${i + 1} amontonadas`));
    for (const s of era.sections) {
      const below = s.at ? era.points[s.at - 1].y : era.h;
      // Entre la parada anterior (o la entrada) y su primer pintor, con aire para el medio nodo y su nombre.
      assert.ok(s.sign.top > era.points[s.at].y + 40 && s.sign.y < below - 40, `${era.id}/${s.name}: el mojón no va en su hueco`);
      if (era.arch && !s.at) assert.ok(s.sign.y <= era.arch.top - 10, `${era.id}/${s.name}: pegado a la lápida`);
      for (const b of era.branches || []) assert.ok(!overlapY(box(s.sign), box(b.sign)), `${era.id}/${s.name}: comparte altura con el cartel de ${b.id}`);
      for (const b of era.bridges) assert.ok(s.sign.top > b.y + BRIDGE_HALF || s.sign.y < b.y - BRIDGE_HALF, `${era.id}/${s.name}: sobre un puente`);
      // Hueco con mojón y rama: suma los dos.
      if (s.at && (era.branches || []).some((b) => b.at === s.at)) assert.ok(era.points[s.at - 1].y - era.points[s.at].y >= GAP.node * 2 + GAP.tramo + GAP.rama - 0.5, `${era.id}/${s.name}: mojón y rama sin sitio`);
    }
  }
});

test('camino: cada época y cada rama entran por una puerta con su arco; la primera, por la muralla de salida', () => {
  assert.ok(!layout.eras[0].arch && layout.start.arch, 'el arco de la primera época no va sobre la muralla');
  for (const era of tramos.filter((e) => e !== layout.eras[0])) {
    assert.ok(era.gate && era.arch, `${era.id}: sin puerta o sin lápida`);
    assert.ok(era.arch.top < era.arch.y && Math.abs(era.arch.y - era.gate.y) < 10, `${era.id}: la lápida no está de pie junto a la puerta`);
    // Lo primero del tramo (el rótulo de la primera parada) queda por encima de la lápida.
    assert.ok(era.points[0].y + 36 < era.arch.top, `${era.id}: la primera parada choca con la lápida`);
  }
});

test('carteles: portada y tarjetas del cartel; sin textos, solo el nombre', async () => {
  globalThis.document = globalThis.document || { documentElement: {} };
  const { signSlides } = await import('../app/js/ui/sign-cards.js');
  const ramas = JSON.parse(readFileSync(join(root, 'app', 'data', 'carteles', 'ramas.json'), 'utf8'));
  const tramosData = JSON.parse(readFileSync(join(root, 'app', 'data', 'carteles', 'tramos.json'), 'utf8'));
  assert.deepEqual(ramas, JSON.parse(readFileSync(join(root, 'contenido', 'ramas.json'), 'utf8')), 'app/data/carteles desfasado: python3 -I tools/sync_carteles.py');
  const gotico = signSlides(real, 'rama', ramas.gotico, 'Gótico');
  assert.equal(gotico.total, ramas.gotico.cards.length + 1);
  assert.ok(gotico.html.includes('>Gótico</h2>') && gotico.html.includes(ramas.gotico.lead) && gotico.html.includes('Descubre más'));
  assert.ok(!gotico.html.includes(ramas.gotico.source), 'la fuente no va en las tarjetas (solo en «Fuentes y créditos»)');
  const empty = signSlides(real, 'tramo', undefined, 'Venecia');
  assert.equal(empty.total, 1);
  assert.ok(empty.html.includes('>Venecia</h2>') && empty.html.includes('>Tramo</p>') && !empty.html.includes('Descubre más'));
  // Todos los tramos del camino común y de las escuelas tienen su cartel.
  for (const era of layout.eras) for (const s of era.sections) assert.ok(tramosData[s.key], `sin cartel para el tramo ${s.key}`);
  for (const b of real.branches) {
    assert.ok(ramas[b.id], `sin cartel para la rama ${b.id}`);
    for (const s of branchLayout(real, b).sections) assert.ok(tramosData[s.key], `sin cartel para el tramo ${s.key}`);
  }
  assert.ok(signSources(ramas, tramosData).length >= 10, 'las fuentes de los carteles no llegan a «Fuentes y créditos»');
});

test('paisajes: el sendero y los desvíos nunca cruzan agua sin puente, y ningún edificio pisa un río (por él pasan las barcas)', { skip: spawnSync('python3', ['--version']).status !== 0 }, () => {
  const code = `
import json, subprocess, sys
sys.path.insert(0, 'tools')
import mapa_svg as S
lay = json.loads(subprocess.run(['node', 'tools/mapa-layout.mjs', 'app/data/catalog.json'], capture_output=True, text=True, check=True).stdout)
light, dark = S.brand_palette()
for era in lay['eras'] + lay['branches']:
    S.build(era, light, dark)
print(json.dumps(S.ERRORES))`;
  const run = spawnSync('python3', ['-c', code], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(JSON.parse(run.stdout.trim().split('\n').pop()), []);
});
