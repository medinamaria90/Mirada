// Trazado del mapa del camino (puro, sin DOM): alto de cada tramo, nodos, sendero, puentes, puerta de época, carteles al
// borde del camino y desvíos de las ramas, en coordenadas de diseño (ancho 390; en pantalla todo va en porcentajes y
// escala con la columna). tools/mapa_svg.py pinta los paisajes con este mismo trazado (lo lee por
// tools/mapa-layout.mjs): el agua sale de los puentes que fija este archivo y nada del paisaje cae bajo un cartel.
// Forma (docs/eval/camino-experto.md): un sendero de tierra que deriva despacio de un lado a otro, unas cuatro paradas
// por pantalla, recto donde cruza un puente y por la puerta de cada época.

import { hasMovementReview, hasTramoSign } from '../../engine/progress.js';
import { spline, segmentsD, roadX, f } from './path-curve.js';

export { segmentsD, roadX, f };
export const MAP_W = 390;
export const STEP = 180;             // distancia vertical entre dos paradas seguidas, sean las que sean (unas cuatro por pantalla)
// Paradas del sendero, todas a STEP: el medallón de la época (en el arco de su puerta), el rombo de cada tramo, los
// pintores y la prueba de época. Entre la última parada de una época y el medallón de la siguiente, también STEP: media
// por arriba (PAD_TOP) y media por abajo (lead).
export const LORE_UP = 10;           // el medallón, algo por encima del pie de su puerta (se apoya en el sendero)
export const GATE_Y = STEP / 2 - LORE_UP; // pie de la puerta de la época, sobre el borde bajo de su tramo
const PAD_TOP = STEP / 2;            // de la última parada al borde alto del tramo
const GATE_RUN = LORE_UP;            // recto por la puerta hasta pasar el medallón (más arriba, la piedra tapa el sendero)
// Salida: la puerta de la muralla lleva el medallón de la primera época; su primera parada, a STEP de él.
export const START_H = 150;
export const START_GATE_X = 225;     // paso de la puerta de la muralla: el sendero la cruza recto, por el centro del arco
export const START_GATE_Y = 96;      // pie de la puerta de la muralla
export const START_STOP = { x: START_GATE_X, y: START_GATE_Y - LORE_UP };
const ENTRY = { gate: true, lead: STEP / 2 };
const FIRST_ENTRY = { gate: false, lead: STEP - START_STOP.y };
// Deriva lenta: el sendero cambia de lado cada tres o cuatro paradas (nunca en cada una).
const XS = [148, 162, 248, 262, 240, 152, 142, 158];
const FIRST_PHASE = 2;               // el primer tramo empieza del lado por el que sale el sendero de la puerta
export const SIDE_X = { left: 42, right: MAP_W - 42 }; // margen estrecho: sala de la época
export const ROAD_HALF = 13;         // medio ancho del sendero (borde incluido)
const ROAD_GAP = 12;                 // aire entre el sendero y un cartel
const EDGE = 10;                     // aire con el borde del mapa
// Puerta de ciudad de la época (path-art.js): lift + h es lo que ocupa sobre su pie (torreones con su tejado).
export const ARCH = { lift: 50, h: 50 };
// Lo que cabe en el hueco entre dos paradas (siempre STEP): medio nodo a cada lado y, en medio, un puente o el cartel de
// una rama (nunca los dos).
export const GAP = { node: 48, bridge: 70, rama: 84 };
const BRANCH_SIGN_FOOT = 12;         // el pie del cartel de la rama, sobre el borde bajo de su hueco
// Puentes: el sendero va recto BRIDGE_HALF por encima y por debajo del centro (el tablero no se curva) y solo se
// tiende donde dos paradas seguidas quedan del mismo lado (el camino llega derecho, sin giros forzados).
export const BRIDGE_HALF = 35;
const BRIDGE_MAX_DX = 30;
// Ríos por paisaje (época o rama temática): cuántos cruza el sendero, cada uno con su puente.
const RIVERS = { renacimiento: 1, 'manierismo-y-norte': 1, impresionismo: 1, gotico: 1, 'escuela-rusa': 2 };
const BRANCH_SIGN_H = 66;            // alto del cartel de una rama, postes incluidos
const BRANCH_SIGN_X = 58;            // el desvío acaba bajo el cartel de la rama, a esta distancia del borde
const TAIL_OUT = 6;                  // tras el cartel, el desvío sigue hasta salir del mapa…
const TAIL_DROP = 26;                // …bajando un poco
const SPUR_DROP = 20;                // el desvío nace del sendero por debajo del pie del cartel…
const SPUR_RUN = 30;                 // …y sale tangente a él (sigue su dirección este trecho antes de abrirse)
const SPUR_EASE = 0.38;              // cuánto se alarga la curva al llegar al cartel (sin codo)
// Salida (abajo del todo) y «Tu museo» (arriba): bloques propios con su dibujo.
export const START_PLAZA = { x: MAP_W / 2, y: 118 };
export const START_ARCH = { x: START_GATE_X, y: 66 };
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
export function bridgeSlots(points, count, banned = []) {
  const fits = points.slice(0, -1).map((p, k) => k).filter((k) => Math.abs(points[k].x - points[k + 1].x) <= BRIDGE_MAX_DX && !banned.includes(k));
  const out = [];
  for (let j = 0; j < count; j++) {
    const target = ((j + 1) * (points.length - 1)) / (count + 1);
    const pick = fits.filter((k) => out.every((o) => Math.abs(o - k) >= 2)).sort((a, b) => Math.abs(a - target) - Math.abs(b - target))[0];
    if (pick !== undefined) out.push(pick);
  }
  return out.sort((a, b) => a - b);
}

// Tramo de una época (o rama) con n paradas de juego (pintores, sala, prueba). phase: paradas anteriores (sigue la deriva
// entre épocas); xIn: x por la que llega el sendero; entry: entrada (con puerta o sin ella, y a qué altura va la primera
// parada); rivers: ríos que cruza; marks: paradas que abren tramo (`tramos`: su rombo va justo antes, sobre el sendero) y
// cuántas ramas salen de él (`branches`). Todas las paradas del sendero (medallón, rombos y nodos) quedan a STEP.
export function eraLayout(nodeCount, phase = 0, xIn = null, entry = ENTRY, rivers = 0, marks = {}) {
  const tramoAt = marks.tramos || [];
  // Paradas en orden, de abajo arriba: el medallón de la puerta, y por cada pintor su rombo de tramo (si lo abre) y él.
  const stops = entry.gate ? [{ kind: 'gate', at: -1 }] : [];
  for (let g = 0; g < nodeCount; g++) {
    if (tramoAt.includes(g)) stops.push({ kind: 'tramo', at: g });
    stops.push({ kind: 'node', at: g });
  }
  const x0 = xIn ?? XS[phase % XS.length];
  let drift = 0;
  stops.forEach((st, j) => {
    st.u = entry.lead + j * STEP;
    st.x = st.kind === 'gate' ? x0 : XS[(phase + drift++) % XS.length];
  });
  const h = Math.round(stops[stops.length - 1].u + PAD_TOP);
  stops.forEach((st) => { st.y = h - st.u; });
  const nodeStop = Array.from({ length: nodeCount }, (_, g) => stops.findIndex((st) => st.kind === 'node' && st.at === g));
  const points = nodeStop.map((j) => ({ x: stops[j].x, y: stops[j].y }));
  // Puentes: en el hueco entre dos paradas del mismo lado (nunca el que sale de la puerta: ahí va recto por el arco).
  const bridgeAt = bridgeSlots(stops, rivers, stops.map((st, j) => (st.kind === 'gate' ? j : -1)).filter((j) => j >= 0));
  // Ramas: bajo su pintor, en el hueco que viene de otro pintor (ni de un rombo ni de la puerta), sin puente y sin cambio
  // de lado (su cartel caería en el hito del paisaje de la parada anterior).
  // Puente o cambio de lado, nunca; tras un rombo, solo si no queda otro sitio.
  const hard = [];
  const soft = [];
  nodeStop.forEach((j, g) => {
    const prev = stops[j - 1];
    if (!prev || prev.kind === 'gate' || bridgeAt.includes(j - 1) || sideOf(prev.x) !== sideOf(stops[j].x)) hard.push(g);
    else if (prev.kind === 'tramo') soft.push(g);
  });
  const branchAt = branchSlots(nodeCount, marks.branches || 0, soft, hard);
  const start = { x: x0, y: h };
  const bridges = bridgeAt.map((k) => ({ at: k, x: (stops[k].x + stops[k + 1].x) / 2, y: (stops[k].y + stops[k + 1].y) / 2, len: BRIDGE_HALF * 2 }));
  const gate = entry.gate ? { x: x0, y: h - GATE_Y, stop: { x: x0, y: stops[0].y } } : null;
  const way = [{ ...start, v: true, line: true }];
  if (gate) way.push({ x: x0, y: gate.y - GATE_RUN, v: true });
  const wayAt = [];
  stops.forEach((st, j) => {
    wayAt.push(way.length);
    if (st.kind !== 'gate') way.push({ x: st.x, y: st.y });
    const b = bridges.find((x) => x.at === j);
    if (b) way.push({ x: b.x, y: b.y + BRIDGE_HALF, v: true, line: true }, { x: b.x, y: b.y - BRIDGE_HALF, v: true });
  });
  way.push({ x: stops[stops.length - 1].x, y: 0, v: true });
  const segs = spline(way);
  // Dintel: sobre los pilares de la puerta, centrado en el sendero.
  const arch = gate ? archAt(gate.x, gate.y - ARCH.lift) : null;
  // Rombos de tramo, sobre el sendero; pie del cartel de cada rama, en el hueco bajo su pintor.
  const tramoPts = Object.fromEntries(stops.filter((st) => st.kind === 'tramo').map((st) => [st.at, { x: st.x, y: st.y }]));
  const ramaFoot = Object.fromEntries(branchAt.map((g) => {
    const below = stops[nodeStop[g] - 1].u;
    return [g, h - (below + (STEP - GAP.rama) / 2) - BRANCH_SIGN_FOOT];
  }));
  const allStops = stops.map(({ kind, at, x, y }) => ({ kind, at, x, y }));
  return { h, points, start, segs, nodeSeg: nodeStop.map((j) => wayAt[j] - 1), bridges, gate, arch, trail: segmentsD(segs), branchAt, tramoPts, ramaFoot, stops: allStops };
}

// Dintel de la puerta con el paso en x y su pie en y: la caja en la que se centra (simétrica respecto a x, recortada
// por los bordes del mapa) y su borde de arriba.
export function archAt(x, y) {
  const half = Math.min(x, MAP_W - x) - EDGE;
  return { x, y, top: y - ARCH.h, side: 'center', x0: x - half, x1: x + half };
}

// Rombo de un tramo (unidad de pintores) que empieza en la parada i: sobre el sendero, justo antes de ella; su nombre, en
// la misma pastilla que los pintores, hacia el lado ancho.
export function tramoSign(era, i) {
  const p = era.tramoPts[i];
  return { at: i, x: p.x, y: p.y, side: sideOf(p.x) };
}

// Paradas que llevan una rama a su lado: repartidas por el tramo, ni la primera ni la última (ahí va la sala)
// si hay sitio, evitando las vetadas (banned: tras un rombo) y, salvo que no quede otra, las prohibidas (never: sobre un
// puente o un cambio de lado). Su cartel ocupa el margen estrecho bajo la parada (el nombre va al otro lado).
export function branchSlots(n, k, banned = [], never = []) {
  if (!k || n < 2) return [];
  const slots = new Set();
  const cost = (i, target) => Math.abs(i - target) + (i === 0 ? 2 : 0) + (banned.includes(i) ? n : 0) + (never.includes(i) ? n * n : 0);
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
  const y = era.ramaFoot[i];
  const xs = Array.from({ length: 9 }, (_, k) => roadX(era.segs, y - BRANCH_SIGN_H + (BRANCH_SIGN_H * k) / 8));
  const edge = side === 'left' ? Math.min(...xs) - ROAD_HALF - ROAD_GAP : Math.max(...xs) + ROAD_HALF + ROAD_GAP;
  const end = { x: side === 'left' ? BRANCH_SIGN_X : MAP_W - BRANCH_SIGN_X, y };
  const from = { x: roadX(era.segs, y + SPUR_DROP), y: y + SPUR_DROP };
  // Bifurcación natural: nace tangente al sendero (el primer control, sobre él mismo) y se abre poco a poco hacia el cartel.
  const c1 = { x: roadX(era.segs, from.y - SPUR_RUN), y: from.y - SPUR_RUN };
  const spur = `M${f(from.x)} ${f(from.y)}C${f(c1.x)} ${f(c1.y)} ${f(end.x + (from.x - end.x) * SPUR_EASE)} ${f(end.y)} ${f(end.x)} ${f(end.y)}`;
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

// Vuelta al camino desde la pantalla de una rama: una tablilla como la del desvío por el que se entró, junto a la puerta,
// en el lado por el que queda el camino común (el contrario al que salió el desvío), con su vereda hacia el borde.
const BACK = { foot: 8, spurUp: 22, out: 8, clear: 92 };   // clear: del paso al borde de la tablilla (fuera de la puerta de ciudad)
function backSign(era, side) {
  const x = era.gate.x;
  const edge = side === 'left' ? x - BACK.clear : x + BACK.clear;
  const y = era.h - BACK.foot;
  const from = { x, y: era.h - BACK.spurUp };
  const out = side === 'left' ? -BACK.out : MAP_W + BACK.out;
  const spur = `M${f(from.x)} ${f(from.y + SPUR_DROP)}C${f(from.x)} ${f(from.y + SPUR_DROP - SPUR_RUN)} ${f(from.x + (out - from.x) * SPUR_EASE)} ${f(from.y - 4)} ${f(out)} ${f(from.y - 4)}`;
  return { side, edge, y, room: Math.round(side === 'left' ? edge - EDGE : MAP_W - EDGE - edge), spur };
}

// Pantalla de una rama: su propio tramo con sus pintores como paradas (mismo trazado que una época). Entra por abajo
// por su puerta, bajo el arco con el nombre de la rama, y sale por arriba, perdiéndose en el paisaje. Carteles de tramo (escuelas): uno por
// época en la que se abre un grupo de pintores, si hay más de uno. Las temáticas (Gótico, Estampa japonesa) no llevan.
// La vuelta al camino va del lado por el que queda el camino común (el contrario al del desvío en el mapa); la lápida,
// al otro.
export function branchLayout(index, branch) {
  const backSide = other(branchSide(index, branch.id));
  const n = branch.artists.length;
  const opens = new Map(branch.tramos.flatMap((t) => t.artists.map((id) => [id, t.opensAt])));
  const eraOf = (id) => opens.get(id) || branch.opensAt;
  const groups = new Set(branch.artists.map(eraOf)).size;
  // Cada época, una vez: en su primer pintor (el orden es cronológico y alguna época vuelve a salir más arriba).
  const heads = groups < 2 || branch.kind === 'rama' ? [] : branch.artists.map((id, i) => (branch.artists.findIndex((x) => eraOf(x) === eraOf(id)) === i ? i : -1)).filter((i) => i >= 0);
  const era = eraLayout(n, 0, MAP_W / 2, ENTRY, RIVERS[branchLand(branch)] || 0, { tramos: heads });
  const sections = heads.map((i) => {
    const id = branch.artists[i];
    return { at: i, movementId: eraOf(id), key: `${branch.id}/${eraOf(id)}`, name: String(index.movement(eraOf(id))?.name || '').split(' y ')[0], sign: tramoSign(era, i) };
  });
  return { id: branch.id, ...era, sections, back: backSign(era, backSide) };
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
  // El sendero llega desde abajo (sigue bajo la barra de abajo, en la franja path-foot): sin arranque en punta.
  const segs = spline([{ x: START_GATE_X, y: START_H, v: true, line: true }, { x: START_GATE_X, y: 0, v: true }]);
  return { h: START_H, segs, arch: archAt(START_ARCH.x, START_ARCH.y), stop: START_STOP, trail: segmentsD(segs) };
}

// Lado hacia el que sale el desvío de una rama en el camino común (su cartel principal, no las señales extra).
export function branchSide(index, branchId) {
  for (const era of pathLayout(index).eras) {
    const spot = era.branches.find((b) => b.id === branchId && !b.extra);
    if (spot) return spot.side;
  }
  return 'left';
}

// Trazado de todo el camino: salida, época a época (con su puerta, sus puentes, sus carteles de tramo y un desvío con
// cartel por cada rama) y el museo al final.
export function pathLayout(index) {
  const eras = [];
  let phase = FIRST_PHASE;
  let xIn = START_GATE_X;
  for (const m of index.visibleMovements) {
    const artists = index.isSala(m.id) ? [] : index.stageArtists(m.id);
    const n = index.stepsOf(m.id).length + (hasMovementReview(index, m.id) ? 1 : 0);
    if (!n) continue;
    const heads = artists.map((a, i) => (hasTramoSign(index, a.id) && a.section !== artists[i - 1]?.section ? i : -1)).filter((i) => i >= 0);
    const branches = branchesAt(index, m.id);
    const era = eraLayout(n, phase, xIn, eras.length ? ENTRY : FIRST_ENTRY, RIVERS[m.id] || 0, { tramos: heads, branches: branches.length });
    const sections = heads.map((i) => ({ at: i, name: artists[i].section, key: artists[i].section, sign: tramoSign(era, i) }));
    const spots = branches.map((b, k) => ({ id: b.branch.id, extra: b.extra, ...branchSpot(era, era.branchAt[k]) }));
    eras.push({ id: m.id, ...era, sections, branches: spots });
    phase += era.stops.filter((st) => st.kind !== 'gate').length;
    xIn = era.points[n - 1].x;
  }
  return { start: startLayout(), eras, museum: museumLayout(xIn) };
}
