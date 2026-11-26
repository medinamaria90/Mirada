// Escena de un tramo del mapa para la vida de paso (map-critters.js, map-sky.js): lee del paisaje en línea lo que
// tools/mapa_svg.py marca (ríos, lagos, puentes, árboles, huecos libres) y el sendero, estén donde estén, y lo da en
// unidades del SVG con lo necesario para pasarlas a píxeles del tramo (el SVG se estira a lo ancho y a lo alto).

const VIEW_PAD_PX = 96;            // franja de arriba y de abajo que tapan la cabecera y la barra de pestañas
const TRAIL_STEP = 3;              // unidades de sendero entre muestra y muestra
const BIG_TREE = 14;               // alto mínimo (unidades) de un árbol donde se posa un pájaro
const BRIDGE_REACH = 14;           // lo que se alarga el paso del puente más allá de cada orilla
const LAKE_NEAR = 30;              // un puente a esta distancia de un lago lo cruza

const nums = (s) => String(s || '').trim().split(/\s+/).map(Number);
const pairs = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).map((p) => p.split(',').map(Number));

// Centro del río a la altura x: tools/mapa_svg.py → mapa.py rio() ondula las dos orillas a la vez cada 60 unidades
// (curvas cuadráticas, de ahí el 2t(1-t)), así que el cauce serpentea sin cambiar de ancho.
export const RIVER_WAVE = 60;
export function riverCenter(river, x) {
  const span = Math.max(0, Math.min(x, river.x1) - river.x0);
  const i = Math.floor(span / RIVER_WAVE);
  const t = (span - i * RIVER_WAVE) / RIVER_WAVE;
  return river.y + 2 * t * (1 - t) * river.wave * (i % 2 ? -1 : 1);
}

// Muestras del sendero (en unidades del SVG) con su longitud acumulada.
function trailSamples(path) {
  if (!path || typeof path.getTotalLength !== 'function') return [];
  const total = path.getTotalLength();
  const out = [];
  for (let l = 0; l <= total; l += TRAIL_STEP) {
    const p = path.getPointAtLength(l);
    out.push({ x: p.x, y: p.y, l });
  }
  return out;
}

// Tramo del sendero que cruza una banda horizontal (un río bajo un puente): de la muestra que entra a la que sale,
// el trozo más cercano a x.
export function trailCrossing(samples, x, yTop, yBottom) {
  const runs = [];
  let run = null;
  samples.forEach((s) => {
    if (s.y >= yTop && s.y <= yBottom) {
      if (!run) { run = []; runs.push(run); }
      run.push(s);
    } else run = null;
  });
  const dist = (r) => Math.min(...r.map((s) => Math.abs(s.x - x)));
  const best = runs.sort((a, b) => dist(a) - dist(b))[0];
  return best && best.length > 1 ? best : null;
}

export function sceneOf(li) {
  const svg = li?.querySelector('svg.path-land');
  if (!svg || !svg.viewBox?.baseVal) return null;
  const vb = svg.viewBox.baseVal;
  const box = li.getBoundingClientRect();
  if (!box.width || !box.height) return null;
  const sx = box.width / vb.width;
  const sy = box.height / vb.height;
  const view = {
    top: Math.max(0, (VIEW_PAD_PX - box.top) / sy),
    bottom: Math.min(vb.height, (window.innerHeight - VIEW_PAD_PX - box.top) / sy),
  };
  const inView = (y, pad = 0) => y >= view.top + pad && y <= view.bottom - pad;
  const rivers = [...svg.querySelectorAll('[data-river]')].map((g) => {
    const [x0, x1, y, h, wave] = nums(g.dataset.river);
    return { x0, x1, y, h, wave };
  });
  const lakes = [...svg.querySelectorAll('[data-lake]')].map((g) => {
    const [cx, y, rx, ry] = nums(g.dataset.lake);
    return { cx, y, rx, ry };
  });
  const trail = trailSamples(li.querySelector('.path-trail .trail-fill:not(.is-done)'));
  // Puentes con agua debajo: los del sendero se cruzan por el sendero; los sueltos, de lado a lado del tablero.
  const bridges = [...svg.querySelectorAll('[data-bridge]')].map((g) => {
    const [cx, y, w] = nums(g.dataset.bridge);
    const river = rivers.find((r) => Math.abs(r.y - y) < r.h);
    const lake = lakes.find((k) => Math.abs(k.cx - cx) < k.rx + LAKE_NEAR && Math.abs(k.y - y) < LAKE_NEAR);
    if (!river && !lake) return null;
    const half = (river ? river.h / 2 : 0) + BRIDGE_REACH;
    const run = trailCrossing(trail, cx, y - half, y + half);
    const onTrail = run && run.some((s) => Math.abs(s.x - cx) < w / 2);
    return { cx, y, w, run: onTrail ? run : null };
  }).filter(Boolean);
  const trees = [...svg.querySelectorAll('[data-sway]')].map((g) => {
    const b = g.getBBox();
    return { x: b.x + b.width / 2, y: b.y + Math.min(3, b.height * 0.12), h: b.height };
  }).filter((t) => t.h >= BIG_TREE);
  return {
    li, svg, box, sx, sy, w: vb.width, h: vb.height, view, inView, rivers, lakes, bridges, trees, trail,
    free: pairs(svg.dataset.free).map(([x, y]) => ({ x, y })),
    // De unidades del SVG a píxeles del tramo.
    px: (x, y) => [x * sx, y * sy],
  };
}

// Lo que se ve de la escena ahora (con un margen para que nada asome pegado al borde).
export function visibleParts(scene, pad = 12) {
  const { inView } = scene;
  return {
    rivers: scene.rivers.filter((r) => inView(r.y, pad)),
    lakes: scene.lakes.filter((k) => inView(k.y, pad)),
    bridges: scene.bridges.filter((b) => inView(b.y, pad)),
    trees: scene.trees.filter((t) => inView(t.y, pad)),
    free: scene.free.filter((f) => inView(f.y, pad)),
  };
}
