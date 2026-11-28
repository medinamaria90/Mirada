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
import { pathLayout, branchLayout, roadX, bridgeSlots, BRIDGE_HALF, GATE_Y, STEP, START_STOP, GAP } from '../app/js/ui/screens/path-layout.js';
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
    // Recto desde abajo, por el arco, hasta el medallón (que va sobre el sendero).
    assert.ok(Math.abs(roadX(era.segs, era.gate.stop.y) - era.gate.x) < 0.5 && era.gate.stop.y < era.gate.y, `${era.id}: el medallón no va sobre el sendero, en el arco`);
    for (const y of [era.gate.stop.y, era.gate.y, era.gate.y + 20]) assert.ok(Math.abs(roadX(era.segs, y) - era.gate.x) < 0.5, `${era.id}: el sendero no pasa recto por la puerta`);
  });
});

test('camino: los puentes van en el sendero, rectos y alineados con él, y solo donde llega derecho', () => {
  const withBridges = tramos.filter((t) => t.bridges.length);
  assert.ok(['renacimiento', 'manierismo-y-norte', 'impresionismo', 'gotico', 'escuela-rusa'].every((id) => withBridges.some((t) => t.id === id)), 'falta el puente de algún río');
  for (const t of withBridges) {
    for (const b of t.bridges) {
      for (let dy = -BRIDGE_HALF; dy <= BRIDGE_HALF; dy += 5) assert.ok(Math.abs(roadX(t.segs, b.y + dy) - b.x) < 0.5, `${t.id}: el sendero se tuerce sobre el puente`);
      assert.ok(Math.abs(t.stops[b.at].x - t.stops[b.at + 1].x) <= 30, `${t.id}: puente entre dos paradas de lados distintos`);
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

// Ritmo del camino: medallón de la época → rombo del tramo → pintores → … → prueba de época, todas las paradas a la misma
// distancia (en vertical, que es lo que se recorre al desplazar), también de una época a la siguiente y de la salida a la
// primera; los rombos van sobre el sendero, justo antes de su primer pintor, y nada (puente, rama) rompe el ritmo.
const TOL = 1.5;
test('camino: todas las paradas a la misma distancia, también entre épocas; rombo y medallón sobre el sendero', () => {
  const box = (s) => ({ y0: s.y - 66, y1: s.y });
  // En el mapa entero, de abajo arriba: salida, y cada época (su alto, apilado).
  let base = 0;
  const ys = [START_STOP.y - layout.start.h];
  for (const era of layout.eras) {
    for (const st of era.stops) ys.push(base - (era.h - st.y) - layout.start.h);
    base -= era.h;
  }
  // En el hueco entre dos paradas cabe medio nodo a cada lado y un puente o el cartel de una rama.
  assert.ok(2 * GAP.node + Math.max(GAP.bridge, GAP.rama) <= STEP && GAP.bridge >= 2 * BRIDGE_HALF, 'el hueco entre paradas no da para un puente o una rama');
  const gaps = ys.slice(1).map((y, i) => ys[i] - y);
  gaps.forEach((g, i) => assert.ok(Math.abs(g - STEP) <= TOL, `paradas ${i} y ${i + 1} del camino a ${g.toFixed(1)} (deberían ir a ${STEP})`));
  for (const era of tramos) {
    era.stops.slice(1).forEach((st, i) => assert.ok(Math.abs(era.stops[i].y - st.y - STEP) <= TOL, `${era.id}: paradas ${i} y ${i + 1} a distinta distancia`));
    for (const s of era.sections) {
      const j = era.stops.findIndex((st) => st.kind === 'tramo' && st.at === s.at);
      assert.ok(j >= 0 && era.stops[j + 1].kind === 'node' && era.stops[j + 1].at === s.at, `${era.id}/${s.name}: el rombo no va justo antes de su primer pintor`);
      assert.ok(Math.abs(roadX(era.segs, s.sign.y) - s.sign.x) < 0.5, `${era.id}/${s.name}: el rombo no va sobre el sendero`);
    }
    for (const b of era.branches || []) {
      for (const p of era.points) assert.ok(!(box(b.sign).y0 < p.y + 29 && p.y - 29 < box(b.sign).y1) || Math.abs(p.x - b.x) > 60, `${era.id}: el cartel de ${b.id} pisa una parada`);
    }
  }
});

test('camino: cada época y cada rama entran por una puerta con su arco; la primera, por la muralla de salida', () => {
  assert.ok(!layout.eras[0].arch && layout.start.arch, 'el arco de la primera época no va sobre la muralla');
  for (const era of tramos.filter((e) => e !== layout.eras[0])) {
    assert.ok(era.gate && era.arch, `${era.id}: sin puerta o sin dintel`);
    assert.ok(era.arch.top < era.arch.y && era.arch.y < era.gate.y, `${era.id}: el dintel no se apoya sobre la puerta`);
    // La parada que sigue al medallón (rombo o pintor) queda por encima de la puerta, con aire.
    assert.ok(era.stops[1].y + 36 < era.arch.top, `${era.id}: la parada que sigue a la puerta choca con ella`);
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
