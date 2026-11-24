// Trazado del mapa del camino (puro, sin DOM): alto de cada tramo, nodos, sendero, carteles al borde del
// camino y desvíos de las ramas, en coordenadas de diseño (ancho 390; en pantalla todo va en porcentajes y
// escala con la columna). tools/mapa_svg.py pinta los paisajes con este mismo trazado (lo lee por
// tools/mapa-layout.mjs), así que nada del paisaje cae bajo un cartel.

import { hasMovementReview } from '../../engine/progress.js';

export const MAP_W = 390;
export const STEP = 112;             // distancia vertical entre paradas
const PAD_BOTTOM = 140;              // entrada del tramo: tramo recto del sendero y el cartel de la época al lado
const RUN = 96;                      // el sendero entra recto (vertical) este alto: el cartel cabe a su lado
const PAD_TOP = 28;                  // salida del tramo
const XS = [120, 268, 130, 274, 118, 270, 126, 272];   // zigzag de los nodos
export const SIDE_X = { left: 48, right: MAP_W - 48 }; // margen estrecho: sala de la época y ramas
export const ROAD_HALF = 15;         // medio ancho del sendero (borde incluido)
const ROAD_GAP = 12;                 // aire entre el sendero y un cartel
const EDGE = 10;                     // aire con el borde del mapa
const SIGN_BOX = { top: 96, bottom: 14 };   // cartel de época: entre h-96 y h-14
const SECTION_HALF = 11;             // medio alto del rótulo de tramo
const SECTION_GAP = 6;                // el rótulo de tramo, más pegado al sendero
const SPUR_DROP = 46;                // el desvío de una rama sale del sendero algo por debajo de su nodo
// Salida (abajo del todo) y «Tu museo» (arriba): bloques propios con su dibujo.
export const START_H = 190;
export const START_PLAZA = { x: MAP_W / 2, y: 150 };
export const START_OUT_X = 270;      // por donde sale el sendero hacia el primer tramo
const START_ARCH_LEFT = 146;         // la placa de salida no tapa el arco
export const MUSEUM_H = 200;
export const MUSEUM_DOOR = { x: MAP_W / 2, y: 112 };

const f = (n) => String(Math.round(n * 100) / 100);

// Curva con tangentes verticales en los extremos (así el sendero entra y sale de cada nodo en vertical).
const curve = (a, b) => ({ a, b, c1: { x: a.x, y: (a.y + b.y) / 2 }, c2: { x: b.x, y: (a.y + b.y) / 2 } });
const line = (a, b) => ({ a, b, c1: a, c2: b });
const bez = (p0, p1, p2, p3, t) => {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
};
const at = (s, t) => ({ x: bez(s.a.x, s.c1.x, s.c2.x, s.b.x, t), y: bez(s.a.y, s.c1.y, s.c2.y, s.b.y, t) });

export function segmentsD(segs) {
  if (!segs.length) return '';
  return segs.reduce((d, s) => `${d}C${f(s.c1.x)} ${f(s.c1.y)} ${f(s.c2.x)} ${f(s.c2.y)} ${f(s.b.x)} ${f(s.b.y)}`, `M${f(segs[0].a.x)} ${f(segs[0].a.y)}`);
}

// x del sendero a la altura y (los tramos siempre suben: y decrece a lo largo de cada segmento).
export function roadX(segs, y) {
  const s = segs.find((g) => y <= g.a.y && y >= g.b.y) || (y > segs[0].a.y ? segs[0] : segs[segs.length - 1]);
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (at(s, mid).y > y) lo = mid; else hi = mid;
  }
  return at(s, (lo + hi) / 2).x;
}

// Hueco libre a un lado del sendero entre y1 y y2: { side, edge (borde del cartel junto al camino), room }.
export function besideRoad(segs, y1, y2, prefer, gap = ROAD_GAP) {
  const xs = Array.from({ length: 9 }, (_, i) => roadX(segs, y1 + ((y2 - y1) * i) / 8));
  const left = Math.min(...xs) - ROAD_HALF - gap;
  const right = Math.max(...xs) + ROAD_HALF + gap;
  const rooms = { left: left - EDGE, right: MAP_W - EDGE - right };
  const side = rooms[prefer] >= rooms[prefer === 'left' ? 'right' : 'left'] * 0.6 ? prefer : (prefer === 'left' ? 'right' : 'left');
  return { side, edge: side === 'left' ? left : right, room: Math.max(0, Math.round(rooms[side])) };
}

const sideOf = (x) => (x < MAP_W / 2 ? 'left' : 'right');
const other = (side) => (side === 'left' ? 'right' : 'left');

// Tramo de una época con n paradas. phase: paradas anteriores (mantiene el zigzag entre épocas); xIn: x por la
// que llega el sendero (la última parada de la época anterior o la salida).
export function eraLayout(nodeCount, phase = 0, xIn = null) {
  const h = PAD_BOTTOM + nodeCount * STEP + PAD_TOP;
  const points = Array.from({ length: nodeCount }, (_, i) => ({ x: XS[(phase + i) % XS.length], y: h - PAD_BOTTOM - STEP / 2 - i * STEP }));
  const start = { x: xIn ?? points[0].x, y: h };
  const runTop = { x: start.x, y: h - RUN };
  const last = points[points.length - 1];
  const segs = [line(start, runTop), curve(runTop, points[0])];
  points.slice(1).forEach((p, i) => segs.push(curve(points[i], p)));
  segs.push(line(last, { x: last.x, y: 0 }));
  // Cartel de la época: al lado del tramo recto de entrada, en el lado de la primera parada.
  const sign = { y: h - SIGN_BOX.bottom, top: h - SIGN_BOX.top, ...besideRoad(segs, h - SIGN_BOX.top, h - SIGN_BOX.bottom, other(sideOf(start.x))) };
  return { h, points, start, segs, sign, trail: segmentsD(segs) };
}

// Rótulo de tramo: entre la parada anterior (o la entrada) y la primera del tramo, al lado del sendero.
// Va del lado de su parada salvo que ahí salga el desvío de una rama.
function sectionSpot(era, i, hasBranch) {
  const p = era.points[i];
  const y = p.y + STEP / 2;
  return { y, ...besideRoad(era.segs, y - SECTION_HALF, y + SECTION_HALF, hasBranch ? other(sideOf(p.x)) : sideOf(p.x), SECTION_GAP) };
}

// Paradas que llevan una rama a su lado: repartidas por el tramo, nunca la última (ahí va la sala). Su cartel
// ocupa el margen por encima de la parada y su desvío, el de debajo; si la parada abre un tramo, su rótulo
// pasa al otro lado, que debe estar libre (la parada anterior no lleva rama). starts: paradas que abren tramo.
export function branchSlots(n, k, starts = new Set()) {
  if (!k || n < 2) return [];
  const valid = (set) => [...set].every((i) => !starts.has(i) || !set.has(i - 1));
  const slots = new Set();
  for (let j = 0; j < k; j++) {
    const target = Math.round(((j + 1) * (n - 1)) / (k + 1));
    const order = Array.from({ length: n - 1 }, (_, i) => i)
      .sort((x, y) => (Math.abs(x - target) + (starts.has(x) ? 1.5 : 0) + (x === 0 ? 2 : 0))
        - (Math.abs(y - target) + (starts.has(y) ? 1.5 : 0) + (y === 0 ? 2 : 0)));
    const pick = order.find((i) => !slots.has(i) && valid(new Set([...slots, i])));
    if (pick !== undefined) slots.add(pick);
  }
  return [...slots].sort((x, y) => x - y);
}

// Desvío de una rama: del sendero (algo por debajo de su parada) al margen estrecho, donde está su cartel.
function branchSpot(era, i) {
  const p = era.points[i];
  const side = sideOf(p.x);
  const end = { x: SIDE_X[side], y: p.y - 6 };
  const from = { x: roadX(era.segs, p.y + SPUR_DROP), y: p.y + SPUR_DROP };
  const spur = `M${f(from.x)} ${f(from.y)}C${f((from.x + end.x) / 2)} ${f(from.y)} ${f(end.x)} ${f(from.y - 10)} ${f(end.x)} ${f(end.y)}`;
  return { at: i, side, x: end.x, y: end.y, spur };
}

const KIND_ORDER = { rama: 0, epoca: 1, escuela: 2 };

// Ramas que se abren en cada época (una vez, donde empiezan), en orden: medieval/estampa, época, escuela.
export function branchesAt(index, movementId) {
  return (index.branches || [])
    .filter((b) => b.opensAt === movementId)
    .sort((a, b) => (KIND_ORDER[a.kind] ?? 3) - (KIND_ORDER[b.kind] ?? 3));
}

function museumLayout(xIn) {
  const start = { x: xIn, y: MUSEUM_H };
  const segs = [curve(start, MUSEUM_DOOR)];
  const sign = { y: MUSEUM_H - 18, top: MUSEUM_H - 78, ...besideRoad(segs, MUSEUM_H - 78, MUSEUM_H - 18, other(sideOf(xIn))) };
  return { h: MUSEUM_H, segs, sign, trail: segmentsD(segs) };
}

function startLayout() {
  const segs = [curve(START_PLAZA, { x: START_OUT_X, y: 0 })];
  // La placa de salida, a la izquierda del arco (sus pilares quedan en x 158-236).
  const beside = besideRoad(segs, START_H - 78, START_H - 22, 'left');
  const edge = Math.min(beside.edge, START_ARCH_LEFT);
  const sign = { y: START_H - 22, top: START_H - 78, side: 'left', edge, room: Math.round(edge - 10) };
  return { h: START_H, segs, sign, trail: segmentsD(segs) };
}

// Trazado de todo el camino: salida, época a época (con sus rótulos de tramo y ramas) y el museo al final.
export function pathLayout(index) {
  const eras = [];
  let phase = 0;
  let xIn = START_OUT_X;
  for (const m of index.visibleMovements) {
    const artists = index.isSala(m.id) ? [] : index.stageArtists(m.id);
    const n = index.stepsOf(m.id).length + (hasMovementReview(index, m.id) ? 1 : 0);
    if (!n) continue;
    const era = eraLayout(n, phase, xIn);
    const branches = branchesAt(index, m.id);
    const starts = new Set(artists.map((a, i) => (a.section && a.section !== artists[i - 1]?.section ? i : -1)).filter((i) => i >= 0));
    const slots = branchSlots(n, branches.length, starts);
    const sections = artists.map((a, i) => (a.section && a.section !== artists[i - 1]?.section ? { at: i, name: a.section, ...sectionSpot(era, i, slots.includes(i)) } : null)).filter(Boolean);
    eras.push({ id: m.id, ...era, sections, branches: slots.map((at, k) => ({ id: branches[k].id, ...branchSpot(era, at) })) });
    phase += n;
    xIn = era.points[n - 1].x;
  }
  return { start: startLayout(), eras, museum: museumLayout(xIn) };
}
