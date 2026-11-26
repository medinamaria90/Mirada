// Trazado del mapa del camino (puro, sin DOM): alto de cada tramo, nodos, sendero, carteles al borde del
// camino y desvíos de las ramas, en coordenadas de diseño (ancho 390; en pantalla todo va en porcentajes y
// escala con la columna). tools/mapa_svg.py pinta los paisajes con este mismo trazado (lo lee por
// tools/mapa-layout.mjs), así que nada del paisaje cae bajo un cartel.

import { hasMovementReview } from '../../engine/progress.js';

export const MAP_W = 390;
export const STEP = 124;             // distancia vertical entre paradas
const PAD_BOTTOM = 196;              // entrada del tramo: tramo recto del sendero y el cartel de la época al lado
const RUN = 134;                     // el sendero entra recto (vertical) este alto: el cartel cabe a su lado
const PAD_TOP = 28;                  // salida del tramo
// El primer tramo arranca justo tras la puerta de salida: entrada más corta (sin un largo trecho vacío).
const FIRST_ENTRY = { pad: 124, run: 72 };
const XS = [128, 262, 136, 266, 126, 264, 134, 260];   // zigzag de los nodos
export const SIDE_X = { left: 42, right: MAP_W - 42 }; // margen estrecho: sala de la época y ramas (lejos del nodo)
export const ROAD_HALF = 15;         // medio ancho del sendero (borde incluido)
const ROAD_GAP = 12;                 // aire entre el sendero y un cartel
const EDGE = 10;                     // aire con el borde del mapa
const SIGN_BOX = { top: 130, bottom: 14 };  // cartel de época: entre h-96 y h-14
const BRANCH_LIFT = 14;               // el hito de la rama, algo por encima de su parada (aire con el nodo)
const SPUR_DROP = 46;                // el desvío de una rama sale del sendero algo por debajo de su nodo
// Salida (abajo del todo) y «Tu museo» (arriba): bloques propios con su dibujo.
export const START_H = 150;
export const START_PLAZA = { x: MAP_W / 2, y: 118 };
export const START_OUT_X = 270;      // por donde sale el sendero hacia el primer tramo
const START_ARCH_LEFT = 140;         // la placa de salida no tapa la puerta de la muralla
export const MUSEUM_H = 280;
export const MUSEUM_DOOR = { x: MAP_W / 2, y: 112 };

export const f = (n) => String(Math.round(n * 100) / 100);

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

// Sendero recorrido de un tramo hasta su parada i (incluida la entrada); i = null, el tramo entero.
export function walkedD(era, i = null) {
  return i === null ? era.trail : segmentsD(era.segs.slice(0, i + 2));
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
export function besideRoad(segs, y1, y2, prefer) {
  const xs = Array.from({ length: 9 }, (_, i) => roadX(segs, y1 + ((y2 - y1) * i) / 8));
  const left = Math.min(...xs) - ROAD_HALF - ROAD_GAP;
  const right = Math.max(...xs) + ROAD_HALF + ROAD_GAP;
  const rooms = { left: left - EDGE, right: MAP_W - EDGE - right };
  const side = rooms[prefer] >= rooms[prefer === 'left' ? 'right' : 'left'] * 0.6 ? prefer : (prefer === 'left' ? 'right' : 'left');
  return { side, edge: side === 'left' ? left : right, room: Math.max(0, Math.round(rooms[side])) };
}

const sideOf = (x) => (x < MAP_W / 2 ? 'left' : 'right');
const other = (side) => (side === 'left' ? 'right' : 'left');

// Tramo de una época con n paradas. phase: paradas anteriores (mantiene el zigzag entre épocas); xIn: x por la
// que llega el sendero (la última parada de la época anterior o la salida).
// entry: alto de la entrada y de su tramo recto (el primer tramo, más corto).
export function eraLayout(nodeCount, phase = 0, xIn = null, entry = { pad: PAD_BOTTOM, run: RUN }) {
  const h = entry.pad + nodeCount * STEP + PAD_TOP;
  const points = Array.from({ length: nodeCount }, (_, i) => ({ x: XS[(phase + i) % XS.length], y: h - entry.pad - STEP / 2 - i * STEP }));
  const start = { x: xIn ?? points[0].x, y: h };
  const runTop = { x: start.x, y: h - entry.run };
  const last = points[points.length - 1];
  const segs = [line(start, runTop), curve(runTop, points[0])];
  points.slice(1).forEach((p, i) => segs.push(curve(points[i], p)));
  segs.push(line(last, { x: last.x, y: 0 }));
  // Cartel de la época: al lado del tramo recto de entrada, en el lado de la primera parada.
  const sign = { y: h - SIGN_BOX.bottom, top: h - SIGN_BOX.top, ...besideRoad(segs, h - SIGN_BOX.top, h - SIGN_BOX.bottom, other(sideOf(start.x))) };
  return { h, points, start, segs, sign, trail: segmentsD(segs) };
}

// Paradas que llevan una rama a su lado: repartidas por el tramo, ni la primera ni la última (ahí va la sala)
// si hay sitio. Su cartel ocupa el margen estrecho por encima de la parada y su desvío, el de debajo; el
// rótulo de tramo va en el lado ancho, junto al nombre, así que no chocan.
export function branchSlots(n, k) {
  if (!k || n < 2) return [];
  const slots = new Set();
  for (let j = 0; j < k; j++) {
    const target = Math.round(((j + 1) * (n - 1)) / (k + 1));
    const order = Array.from({ length: n - 1 }, (_, i) => i)
      .sort((x, y) => (Math.abs(x - target) + (x === 0 ? 2 : 0)) - (Math.abs(y - target) + (y === 0 ? 2 : 0)));
    const pick = order.find((i) => !slots.has(i));
    if (pick !== undefined) slots.add(pick);
  }
  return [...slots].sort((x, y) => x - y);
}

// Desvío de una rama: del sendero (algo por debajo de su parada) al margen estrecho, donde está su cartel.
function branchSpot(era, i) {
  const p = era.points[i];
  const side = sideOf(p.x);
  const end = { x: SIDE_X[side], y: p.y - BRANCH_LIFT };
  const from = { x: roadX(era.segs, p.y + SPUR_DROP), y: p.y + SPUR_DROP };
  const spur = `M${f(from.x)} ${f(from.y)}C${f((from.x + end.x) / 2)} ${f(from.y)} ${f(end.x)} ${f(from.y - 10)} ${f(end.x)} ${f(end.y)}`;
  return { at: i, side, x: end.x, y: end.y, spur };
}

const KIND_ORDER = { rama: 0, epoca: 1, escuela: 2 };
export const MAX_BRANCH_SIGNS = 2;

// Ramas de cada época: las que empiezan en ella (medieval/estampa, época, escuela) y, como señal aparte (extra),
// las escuelas que abren en ella un tramo nuevo con pintores propios.
export function branchesAt(index, movementId) {
  const all = index.branches || [];
  const own = (b, id) => b.artists.some((a) => index.pathIndex(a) < 0 && (b.tramos.find((t) => t.artists.includes(a))?.opensAt || b.opensAt) === id);
  const starts = all.filter((b) => b.opensAt === movementId).sort((a, b) => (KIND_ORDER[a.kind] ?? 3) - (KIND_ORDER[b.kind] ?? 3));
  const extras = all.filter((b) => b.kind === 'escuela' && b.opensAt !== movementId && own(b, movementId));
  return [...starts.map((b) => ({ branch: b, extra: false })), ...extras.map((b) => ({ branch: b, extra: true }))];
}

// «Tu museo»: el sendero entra recto (su placa va al lado, bajo el edificio) y sube hasta la puerta.
const MUSEUM_RUN = 124;
function museumLayout(xIn) {
  const start = { x: xIn, y: MUSEUM_H };
  const runTop = { x: xIn, y: MUSEUM_H - MUSEUM_RUN };
  const segs = [line(start, runTop), curve(runTop, MUSEUM_DOOR)];
  const sign = { y: MUSEUM_H - 14, top: MUSEUM_H - MUSEUM_RUN + 4, ...besideRoad(segs, MUSEUM_H - MUSEUM_RUN + 4, MUSEUM_H - 14, other(sideOf(xIn))) };
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

// Trazado de todo el camino: salida, época a época (con dónde empieza cada tramo y dónde salen las ramas) y
// el museo al final.
export function pathLayout(index) {
  const eras = [];
  let phase = 0;
  let xIn = START_OUT_X;
  for (const m of index.visibleMovements) {
    const artists = index.isSala(m.id) ? [] : index.stageArtists(m.id);
    const n = index.stepsOf(m.id).length + (hasMovementReview(index, m.id) ? 1 : 0);
    if (!n) continue;
    const era = eraLayout(n, phase, xIn, eras.length ? undefined : FIRST_ENTRY);
    const branches = branchesAt(index, m.id);
    // Las ramas temáticas (Gótico, Estampa japonesa) llevan siempre su cartel; si con las demás pasan de
    // MAX_BRANCH_SIGNS carteles, las demás van juntas en uno solo («Ramas (n)»), que abre una hoja con todas.
    const themed = branches.filter((b) => b.branch.kind === 'rama' && !b.extra);
    const rest = branches.filter((b) => !themed.includes(b));
    const grouped = branches.length > MAX_BRANCH_SIGNS && rest.length > 1;
    const slots = branchSlots(n, themed.length + (grouped ? 1 : rest.length));
    const sections = artists.map((a, i) => (a.section && a.section !== artists[i - 1]?.section ? { at: i, name: a.section } : null)).filter(Boolean);
    const signs = [...themed, ...(grouped ? [{ group: rest }] : rest)];
    const spots = signs.map((b, k) => (b.group
      ? { id: `era-${m.id}`, group: true, members: b.group.map((x) => ({ id: x.branch.id, extra: x.extra })), extra: false, ...branchSpot(era, slots[k]) }
      : { id: b.branch.id, extra: b.extra, ...branchSpot(era, slots[k]) }));
    eras.push({ id: m.id, ...era, sections, branches: spots });
    phase += n;
    xIn = era.points[n - 1].x;
  }
  return { start: startLayout(), eras, museum: museumLayout(xIn) };
}
