// Trazado del mapa del camino en JSON, para que tools/mapa_svg.py pinte los paisajes con las mismas
// medidas que la app (ui/screens/path-layout.js es la única fuente del trazado): alto de cada tramo, nodos,
// puentes (el agua sale de ellos), puerta de la época, desvíos de las ramas y, por parada, la caja aproximada de su
// rótulo; también las cajas del arco de la época y de las tablillas de tramo y de rama: ahí no se pinta nada.
//   node tools/mapa-layout.mjs app/data/catalog.json
import { readFileSync } from 'node:fs';
import { buildIndex } from '../app/js/engine/catalog.js';
import { hasMovementReview } from '../app/js/engine/progress.js';
import { pathLayout, branchLayout, branchLand, roadX, MAP_W, STEP } from '../app/js/ui/screens/path-layout.js';

const index = buildIndex(JSON.parse(readFileSync(process.argv[2], 'utf8')));
const layout = pathLayout(index);
const NAME_PX = 7.8;      // ancho medio de una letra del nombre (Outfit 500, 14 px)
const GAP = 38;           // del centro del nodo al principio del rótulo
const HALF_H = 36;        // medio alto del rótulo (nombre y botón)
const SIGN_PX = 7.2;      // ancho medio de una letra en los carteles de tramo y de rama (600, 13 px)
const SIGN_PAD = 30;      // relleno y flecha de la placa
const SIGN_H = 62;        // alto de un cartel de tramo o de rama, postes incluidos
const PLACE_HALF = 94;    // medio ancho de la puerta de ciudad de la época (torreones incluidos)
const PLACE_UP = 98;      // de su pie a la punta de los tejados
function eraNames(era) {
  const names = (index.isSala(era.id) ? [] : index.stageArtists(era.id)).map((a) => a.name);
  if (hasMovementReview(index, era.id)) names.push('Repaso · faltan 10');
  return names;
}
function labels(era, names) {
  return era.points.map((p, i) => {
    const w = (names[i] || '').length * NAME_PX + 18;
    const left = p.x < MAP_W / 2;
    const x0 = left ? p.x + GAP : Math.max(0, p.x - GAP - w);
    const x1 = left ? Math.min(MAP_W, p.x + GAP + w) : p.x - GAP;
    return { x0: Math.round(x0), x1: Math.round(x1), y0: Math.round(p.y - HALF_H), y1: Math.round(p.y + HALF_H) };
  });
}
// Caja de un cartel pequeño (tramo o rama): crece hacia fuera desde su borde junto al camino.
function signBox(sign, text, extra = 0) {
  const w = Math.min(sign.room, Math.max(...String(text).split(' ').map((t) => t.length)) * SIGN_PX * 2 + SIGN_PAD + extra);
  const [x0, x1] = sign.side === 'left' ? [sign.edge - w, sign.edge] : [sign.edge, sign.edge + w];
  return { x0: Math.round(x0), x1: Math.round(x1), y0: Math.round(sign.y - SIGN_H), y1: Math.round(sign.y) };
}
// Caja de la puerta de ciudad de la época (path-art.js): ahí no se pinta nada.
const archBox = (e) => (e.gate ? [{ x0: Math.max(0, Math.round(e.gate.x - PLACE_HALF)), x1: Math.min(MAP_W, Math.round(e.gate.x + PLACE_HALF)), y0: Math.round(e.gate.y - PLACE_UP), y1: Math.round(e.gate.y + 4) }] : []);
const signBoxes = (e) => [...archBox(e), ...(e.sections || []).map((s) => signBox(s.sign, s.name)), ...(e.branches || []).map((b) => signBox(b.sign, 'Más del Renacimiento'))];
// x del sendero cada ROAD_STEP de alto (el esparcido de detalles no cae sobre él).
const ROAD_STEP = 8;
const road = (e) => Array.from({ length: Math.floor(e.h / ROAD_STEP) + 1 }, (_, i) => Math.round(roadX(e.segs, i * ROAD_STEP)));
// Desvío de una rama en puntos (para comprobar que no cruza agua): curva del sendero al cartel, cada SPUR_T.
const SPUR_T = 0.05;
const spurPoints = (b) => {
  const [x0, y0, cx1, cy1, cx2, cy2, x1, y1] = b.spur.match(/-?[\d.]+/g).map(Number);
  const bz = (a, c, d, e, t) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * c + 3 * (1 - t) * t * t * d + t ** 3 * e;
  return Array.from({ length: Math.round(1 / SPUR_T) + 1 }, (_, i) => [Math.round(bz(x0, cx1, cx2, x1, i * SPUR_T)), Math.round(bz(y0, cy1, cy2, y1, i * SPUR_T))]);
};
const common = (e) => ({ h: e.h, points: e.points, start: e.start, road: road(e), roadStep: ROAD_STEP, bridges: e.bridges, gate: e.gate });
const eras = layout.eras.map((e) => ({
  id: e.id, ...common(e), branchAt: e.branches.map((b) => b.at), labels: [...labels(e, eraNames(e)), ...signBoxes(e)],
  branches: e.branches.map((b) => ({ x: b.x, y: b.y, spur: spurPoints(b) })),
}));
// Pantallas de rama (rama-<id>.svg): su tramo, con el paisaje de su época o el suyo (deco), su arco a la entrada y las
// tablillas de tramo.
const branches = (index.branches || []).map((b) => {
  const e = branchLayout(index, b);
  return {
    id: `rama-${b.id}`, deco: branchLand(b), ...common(e), branchAt: [],
    labels: [...labels(e, b.artists.map((id) => index.artist(id)?.name || '')), ...signBoxes(e)], branches: [],
  };
});
process.stdout.write(JSON.stringify({ width: MAP_W, step: STEP, eras, branches }));
