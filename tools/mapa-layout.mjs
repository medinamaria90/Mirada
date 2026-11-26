// Trazado del mapa del camino en JSON, para que tools/mapa_svg.py pinte los paisajes con las mismas
// medidas que la app (ui/screens/path-layout.js es la única fuente del trazado): alto de cada tramo, nodos,
// lado del cartel de la época, paradas con el desvío de una rama y, por parada, la caja aproximada de su
// rótulo (nombre y tramo, en el lado ancho): ahí no se pinta nada.
//   node tools/mapa-layout.mjs app/data/catalog.json
import { readFileSync } from 'node:fs';
import { buildIndex } from '../app/js/engine/catalog.js';
import { hasMovementReview } from '../app/js/engine/progress.js';
import { pathLayout, branchLayout, branchLand, roadX, MAP_W, STEP } from '../app/js/ui/screens/path-layout.js';

const index = buildIndex(JSON.parse(readFileSync(process.argv[2], 'utf8')));
const layout = pathLayout(index);
const NAME_PX = 7.8;      // ancho medio de una letra del nombre (Outfit 500, 14 px)
const KICKER_PX = 6.8;    // y del rótulo de tramo (600, 12 px)
const GAP = 38;           // del centro del nodo al principio del rótulo
const HALF_H = 36;        // medio alto del rótulo (nombre y botón)
const KICKER_H = 22;
function eraNames(era) {
  const names = (index.isSala(era.id) ? [] : index.stageArtists(era.id)).map((a) => a.name);
  if (hasMovementReview(index, era.id)) names.push('Repaso · faltan 10');
  return names;
}
function labels(era, names) {
  return era.points.map((p, i) => {
    const kicker = era.sections.find((s) => s.at === i);
    const w = Math.max((names[i] || '').length * NAME_PX, kicker ? kicker.name.length * KICKER_PX + 30 : 0) + 18;
    const left = p.x < MAP_W / 2;
    const x0 = left ? p.x + GAP : Math.max(0, p.x - GAP - w);
    const x1 = left ? Math.min(MAP_W, p.x + GAP + w) : p.x - GAP;
    return { x0: Math.round(x0), x1: Math.round(x1), y0: Math.round(p.y - HALF_H - (kicker ? KICKER_H : 0)), y1: Math.round(p.y + HALF_H) };
  });
}
// x del sendero cada ROAD_STEP de alto (el esparcido de detalles no cae sobre él) y la caja del cartel de la época.
const ROAD_STEP = 8;
const road = (e) => Array.from({ length: Math.floor(e.h / ROAD_STEP) + 1 }, (_, i) => Math.round(roadX(e.segs, i * ROAD_STEP)));
const eras = layout.eras.map((e) => ({
  id: e.id, h: e.h, points: e.points, start: e.start, signSide: e.sign.side, branchAt: e.branches.map((b) => b.at), labels: labels(e, eraNames(e)),
  road: road(e), roadStep: ROAD_STEP, sign: { side: e.sign.side, edge: Math.round(e.sign.edge), top: e.sign.top, y: e.sign.y },
  branches: e.branches.map((b) => ({ x: b.x, y: b.y })),
}));
// Pantallas de rama (rama-<id>.svg): su tramo, con el paisaje de su época o el suyo (deco) y sin carteles.
const NO_SIGN = { side: 'left', edge: -MAP_W, top: -MAP_W, y: -MAP_W };
const branches = (index.branches || []).map((b) => {
  const e = branchLayout(index, b);
  return {
    id: `rama-${b.id}`, deco: branchLand(b), h: e.h, points: e.points, start: e.start, signSide: null, branchAt: [],
    labels: labels(e, b.artists.map((id) => index.artist(id)?.name || '')), road: road(e), roadStep: ROAD_STEP, sign: NO_SIGN, branches: [],
  };
});
process.stdout.write(JSON.stringify({ width: MAP_W, step: STEP, eras, branches }));
