// Trazado del mapa del camino (puro, sin DOM): alto de cada tramo, nodos, sendero, puentes, puerta de época, carteles al
// borde del camino y desvíos de las ramas, en coordenadas de diseño (ancho 390; en pantalla todo va en porcentajes y
// escala con la columna). tools/mapa_svg.py pinta los paisajes con este mismo trazado (lo lee por
// tools/mapa-layout.mjs): el agua sale de los puentes que fija este archivo y nada del paisaje cae bajo un cartel.
// Forma (docs/eval/camino-experto.md): un sendero de tierra que deriva despacio de un lado a otro, unas cuatro paradas
// por pantalla, recto donde cruza un puente y por la puerta de cada época.

import { hasMovementReview } from '../../engine/progress.js';
import { spline, segmentsD, roadX, f } from './path-curve.js';

export { segmentsD, roadX, f };
export const MAP_W = 390;
export const STEP = 172;             // distancia vertical entre paradas (unas cuatro por pantalla)
const ENTRY = { pad: 232, run: 64, gate: true };   // entrada de la época (y de una rama): recta por la puerta y su arco
// El primer tramo arranca justo tras la puerta de salida: sin puerta propia (su arco va sobre la de la muralla).
const FIRST_ENTRY = { pad: 172, run: 64, gate: false };
const PAD_TOP = 28;                  // salida del tramo
export const GATE_Y = 44;            // la puerta de la época, sobre la recta de entrada
// Deriva lenta: el sendero cambia de lado cada tres o cuatro paradas (nunca en cada una).
const XS = [148, 162, 248, 262, 240, 152, 142, 158];
const FIRST_PHASE = 2;               // el primer tramo empieza del lado por el que sale el sendero de la puerta
export const SIDE_X = { left: 42, right: MAP_W - 42 }; // margen estrecho: sala de la época
export const ROAD_HALF = 13;         // medio ancho del sendero (borde incluido)
const ROAD_GAP = 12;                 // aire entre el sendero y un cartel
const EDGE = 10;                     // aire con el borde del mapa
// Arco de la época: el rótulo con su nombre se apoya en los pilares de la puerta, centrado en el sendero. lift: de la
// puerta al pie del rótulo; h: su alto aproximado (dos líneas de nombre y los siglos); gap: aire mínimo con la tablilla
// de un tramo que empiece justo después.
export const ARCH = { lift: 52, h: 82, gap: 24 };
const TRAMO_BOX = { top: 58, bottom: 106 }; // tablilla de tramo: bajo su primera parada, en el lado de los nombres
// Puentes: el sendero va recto BRIDGE_HALF por encima y por debajo del centro (el tablero no se curva) y solo se
// tiende donde dos paradas seguidas quedan del mismo lado (el camino llega derecho, sin giros forzados).
export const BRIDGE_HALF = 35;
const BRIDGE_MAX_DX = 30;
// Ríos por paisaje (época o rama temática): cuántos cruza el sendero, cada uno con su puente.
const RIVERS = { renacimiento: 1, 'manierismo-y-norte': 1, impresionismo: 1, gotico: 1, 'escuela-rusa': 2 };
const BRANCH_BELOW = 118;            // pie del cartel de la rama, bajo su parada (la placa queda bajo el nodo)
const BRANCH_SIGN_H = 66;            // alto del cartel de una rama, postes incluidos
const BRANCH_SIGN_X = 58;            // el desvío acaba bajo el cartel de la rama, a esta distancia del borde
const TAIL_OUT = 6;                  // tras el cartel, el desvío sigue hasta salir del mapa…
const TAIL_DROP = 26;                // …bajando un poco
const SPUR_DROP = 6;                 // el desvío sale del sendero algo por debajo del pie del cartel
// Salida (abajo del todo) y «Tu museo» (arriba): bloques propios con su dibujo.
export const START_H = 150;
export const START_PLAZA = { x: MAP_W / 2, y: 118 };
export const START_OUT_X = 270;      // por donde sale el sendero hacia el primer tramo
export const START_ARCH = { x: 209, y: 52 };   // pie del rótulo de la primera época: sobre la puerta de la muralla
export const MUSEUM_H = 280;
export const MUSEUM_DOOR = { x: MAP_W / 2, y: 112 };

const sideOf = (x) => (x < MAP_W / 2 ? 'left' : 'right');
const other = (side) => (side === 'left' ? 'right' : 'left');

// Sendero recorrido de un tramo hasta su parada i (incluida la entrada); i = null, el tramo entero.
export function walkedD(era, i = null) {
  return i === null ? era.trail : segmentsD(era.segs.slice(0, era.nodeSeg[i] + 1));
}

// Hueco libre a un lado del sendero entre y1 y y2: { side, edge (borde del cartel junto al camino), room }.
export function besideRoad(segs, y1, y2, prefer, gap = ROAD_GAP) {
  const xs = Array.from({ length: 9 }, (_, i) => roadX(segs, y1 + ((y2 - y1) * i) / 8));
  const left = Math.min(...xs) - ROAD_HALF - gap;
  const right = Math.max(...xs) + ROAD_HALF + gap;
  const rooms = { left: left - EDGE, right: MAP_W - EDGE - right };
  const side = rooms[prefer] >= rooms[other(prefer)] * 0.6 ? prefer : other(prefer);
  return { side, edge: side === 'left' ? left : right, room: Math.max(0, Math.round(rooms[side])) };
}

// Dónde cruza el sendero sus ríos: entre dos paradas del mismo lado, repartidos por el tramo (k: la parada de abajo).
export function bridgeSlots(points, count) {
  const fits = points.slice(0, -1).map((p, k) => k).filter((k) => Math.abs(points[k].x - points[k + 1].x) <= BRIDGE_MAX_DX);
  const out = [];
  for (let j = 0; j < count; j++) {
    const target = ((j + 1) * (points.length - 1)) / (count + 1);
    const pick = fits.filter((k) => out.every((o) => Math.abs(o - k) >= 2)).sort((a, b) => Math.abs(a - target) - Math.abs(b - target))[0];
    if (pick !== undefined) out.push(pick);
  }
  return out.sort((a, b) => a - b);
}

// Tramo de una época (o rama) con n paradas. phase: paradas anteriores (sigue la deriva entre épocas); xIn: x por la
// que llega el sendero; entry: alto de la entrada, de su recta y si lleva puerta; rivers: ríos que cruza.
export function eraLayout(nodeCount, phase = 0, xIn = null, entry = ENTRY, rivers = 0) {
  const h = entry.pad + nodeCount * STEP + PAD_TOP;
  const points = Array.from({ length: nodeCount }, (_, i) => ({ x: XS[(phase + i) % XS.length], y: h - entry.pad - STEP / 2 - i * STEP }));
  const start = { x: xIn ?? points[0].x, y: h };
  const bridges = bridgeSlots(points, rivers).map((k) => ({
    at: k, x: (points[k].x + points[k + 1].x) / 2, y: (points[k].y + points[k + 1].y) / 2, len: BRIDGE_HALF * 2,
  }));
  const way = [{ ...start, v: true, line: true }, { x: start.x, y: h - entry.run, v: true }];
  const nodeAt = [];
  points.forEach((p, i) => {
    nodeAt.push(way.length);
    way.push({ ...p });
    const b = bridges.find((x) => x.at === i);
    if (b) way.push({ x: b.x, y: b.y + BRIDGE_HALF, v: true, line: true }, { x: b.x, y: b.y - BRIDGE_HALF, v: true });
  });
  way.push({ x: points[points.length - 1].x, y: 0, v: true });
  const segs = spline(way);
  const gate = entry.gate ? { x: start.x, y: h - GATE_Y } : null;
  // Rótulo del arco: pie centrado en el sendero, sobre los pilares de la puerta.
  const arch = gate ? archAt(gate.x, gate.y - ARCH.lift) : null;
  return { h, points, start, segs, nodeSeg: nodeAt.map((w) => w - 1), bridges, gate, arch, trail: segmentsD(segs) };
}

// Rótulo de un arco con su pie en (x, y): la caja en la que se centra (simétrica respecto a x, recortada por los bordes
// del mapa) y su borde de arriba.
export function archAt(x, y) {
  const half = Math.min(x, MAP_W - x) - EDGE;
  return { x, y, top: y - ARCH.h, x0: x - half, x1: x + half };
}

// Tablilla de un tramo (unidad de pintores) que empieza en la parada i: bajo ella, en el lado de su nombre. Si el
// tramo empieza nada más cruzar el arco, la tablilla sube lo justo para no quedar pegada al rótulo de la época.
export function tramoSign(era, i) {
  const p = era.points[i];
  const y2 = Math.min(p.y + TRAMO_BOX.bottom, era.arch ? era.arch.top - ARCH.gap : Infinity);
  const y1 = y2 - (TRAMO_BOX.bottom - TRAMO_BOX.top);
  return { at: i, y: y2, top: y1, ...besideRoad(era.segs, y1, y2, other(sideOf(p.x))) };
}

// Paradas que llevan una rama a su lado: repartidas por el tramo, ni la primera ni la última (ahí va la sala)
// si hay sitio, y evitando las vetadas (justo encima de un puente o de un cambio de lado). Su cartel ocupa el margen estrecho bajo la parada (el nombre va al otro lado).
export function branchSlots(n, k, banned = []) {
  if (!k || n < 2) return [];
  const slots = new Set();
  const cost = (i, target) => Math.abs(i - target) + (i === 0 ? 2 : 0) + (banned.includes(i) ? n : 0);
  for (let j = 0; j < k; j++) {
    const target = Math.round(((j + 1) * (n - 1)) / (k + 1));
    const order = Array.from({ length: n - 1 }, (_, i) => i).sort((x, y) => cost(x, target) - cost(y, target));
    const pick = order.find((i) => !slots.has(i));
    if (pick !== undefined) slots.add(pick);
  }
  return [...slots].sort((x, y) => x - y);
}

// Desvío de una rama: del sendero al margen estrecho, bajo su parada (el cartel de dos postes queda por debajo del
// nodo, así puede crecer hasta el sendero sin tocarlo); tras el cartel, el desvío sigue y se pierde por el borde.
function branchSpot(era, i) {
  const p = era.points[i];
  const side = sideOf(p.x);
  const y = p.y + BRANCH_BELOW;
  const xs = Array.from({ length: 9 }, (_, k) => roadX(era.segs, y - BRANCH_SIGN_H + (BRANCH_SIGN_H * k) / 8));
  const edge = side === 'left' ? Math.min(...xs) - ROAD_HALF - ROAD_GAP : Math.max(...xs) + ROAD_HALF + ROAD_GAP;
  const end = { x: side === 'left' ? BRANCH_SIGN_X : MAP_W - BRANCH_SIGN_X, y };
  const from = { x: roadX(era.segs, y + SPUR_DROP), y: y + SPUR_DROP };
  const spur = `M${f(from.x)} ${f(from.y)}C${f((from.x + end.x) / 2)} ${f(from.y)} ${f(end.x)} ${f(from.y)} ${f(end.x)} ${f(end.y)}`;
  const out = side === 'left' ? -TAIL_OUT : MAP_W + TAIL_OUT;
  const tail = `M${f(end.x)} ${f(end.y)}C${f(end.x)} ${f(end.y + TAIL_DROP)} ${f((end.x + out) / 2)} ${f(end.y + TAIL_DROP)} ${f(out)} ${f(end.y + TAIL_DROP / 2)}`;
  const sign = { side, edge, y, room: Math.round(side === 'left' ? edge - EDGE : MAP_W - EDGE - edge) };
  return { at: i, side, x: end.x, y, from, spur, tail, sign };
}

const KIND_ORDER = { rama: 0, epoca: 1, escuela: 2 };

// Ramas de cada época: las que empiezan en ella (medieval/estampa, época, escuela) y, como señal aparte (extra),
// las escuelas que abren en ella un tramo nuevo con pintores propios.
export function branchesAt(index, movementId) {
  const all = index.branches || [];
  const own = (b, id) => b.artists.some((a) => index.pathIndex(a) < 0 && (b.tramos.find((t) => t.artists.includes(a))?.opensAt || b.opensAt) === id);
  const starts = all.filter((b) => b.opensAt === movementId).sort((a, b) => (KIND_ORDER[a.kind] ?? 3) - (KIND_ORDER[b.kind] ?? 3));
  const extras = all.filter((b) => b.kind === 'escuela' && b.opensAt !== movementId && own(b, movementId));
  return [...starts.map((b) => ({ branch: b, extra: false })), ...extras.map((b) => ({ branch: b, extra: true }))];
}

// Paisaje de una rama: las de época, el de su época; las temáticas (escuelas, gótico, estampa), el suyo.
export const branchLand = (branch) => (branch.kind === 'epoca' ? branch.movementId : branch.id);

// Pantalla de una rama: su propio tramo con sus pintores como paradas (mismo trazado que una época). Entra por abajo
// por su puerta, bajo el arco con el nombre de la rama, y sale por arriba, perdiéndose en el paisaje. Carteles de tramo (escuelas): uno por
// época en la que se abre un grupo de pintores, si hay más de uno. Las temáticas (Gótico, Estampa japonesa) no llevan.
export function branchLayout(index, branch) {
  const n = branch.artists.length;
  const opens = new Map(branch.tramos.flatMap((t) => t.artists.map((id) => [id, t.opensAt])));
  const eraOf = (id) => opens.get(id) || branch.opensAt;
  const era = eraLayout(n, 0, MAP_W / 2, ENTRY, RIVERS[branchLand(branch)] || 0);
  const groups = new Set(branch.artists.map(eraOf)).size;
  // Cada época, una vez: en su primer pintor (el orden es cronológico y alguna época vuelve a salir más arriba).
  const sections = groups < 2 || branch.kind === 'rama' ? [] : branch.artists.map((id, i) => (branch.artists.findIndex((x) => eraOf(x) === eraOf(id)) === i
    ? { at: i, movementId: eraOf(id), key: `${branch.id}/${eraOf(id)}`, name: String(index.movement(eraOf(id))?.name || '').split(' y ')[0], sign: tramoSign(era, i) } : null)).filter(Boolean);
  return { id: branch.id, ...era, sections };
}

// «Tu museo»: el sendero entra recto (su placa va al lado, bajo el edificio) y sube hasta la puerta.
const MUSEUM_RUN = 124;
function museumLayout(xIn) {
  const segs = spline([{ x: xIn, y: MUSEUM_H, v: true, line: true }, { x: xIn, y: MUSEUM_H - MUSEUM_RUN, v: true }, { ...MUSEUM_DOOR, v: true }]);
  const sign = { y: MUSEUM_H - 14, top: MUSEUM_H - MUSEUM_RUN + 4, ...besideRoad(segs, MUSEUM_H - MUSEUM_RUN + 4, MUSEUM_H - 14, other(sideOf(xIn))) };
  return { h: MUSEUM_H, segs, sign, trail: segmentsD(segs) };
}

// Salida: la puerta de la muralla es también la entrada de la primera época; su rótulo va sobre ella.
function startLayout() {
  const segs = spline([{ ...START_PLAZA, v: true }, { x: START_OUT_X, y: 0, v: true }]);
  return { h: START_H, segs, arch: archAt(START_ARCH.x, START_ARCH.y), trail: segmentsD(segs) };
}

// Trazado de todo el camino: salida, época a época (con su puerta, sus puentes, sus carteles de tramo y un desvío con
// cartel por cada rama) y el museo al final.
export function pathLayout(index) {
  const eras = [];
  let phase = FIRST_PHASE;
  let xIn = START_OUT_X;
  for (const m of index.visibleMovements) {
    const artists = index.isSala(m.id) ? [] : index.stageArtists(m.id);
    const n = index.stepsOf(m.id).length + (hasMovementReview(index, m.id) ? 1 : 0);
    if (!n) continue;
    const era = eraLayout(n, phase, xIn, eras.length ? ENTRY : FIRST_ENTRY, RIVERS[m.id] || 0);
    const sections = artists.map((a, i) => (a.section && a.section !== artists[i - 1]?.section ? { at: i, name: a.section, key: a.section, sign: tramoSign(era, i) } : null)).filter(Boolean);
    const branches = branchesAt(index, m.id);
    // Ninguna rama sobre un puente (su cartel y su desvío caerían en el río) ni donde el sendero acaba de cambiar de
    // lado (su cartel caería en el hito del paisaje de la parada anterior).
    const turns = era.points.map((pt, i) => i).filter((i) => i > 0 && sideOf(era.points[i - 1].x) !== sideOf(era.points[i].x));
    const slots = branchSlots(n, branches.length, [...era.bridges.map((b) => b.at + 1), ...turns]);
    const spots = branches.map((b, k) => ({ id: b.branch.id, extra: b.extra, ...branchSpot(era, slots[k]) }));
    eras.push({ id: m.id, ...era, sections, branches: spots });
    phase += n;
    xIn = era.points[n - 1].x;
  }
  return { start: startLayout(), eras, museum: museumLayout(xIn) };
}
