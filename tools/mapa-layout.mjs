// Trazado del mapa del camino en JSON, para que tools/mapa_svg.py pinte los paisajes con las mismas
// medidas que la app (ui/screens/path-layout.js es la única fuente del trazado): alto de cada tramo, nodos,
// lado del cartel de la época, paradas con el desvío de una rama y, por parada, la caja aproximada de su
// rótulo (nombre y tramo, en el lado ancho): ahí no se pinta nada.
//   node tools/mapa-layout.mjs app/data/catalog.json
import { readFileSync } from 'node:fs';
import { buildIndex } from '../app/js/engine/catalog.js';
import { hasMovementReview } from '../app/js/engine/progress.js';
import { pathLayout, MAP_W, STEP } from '../app/js/ui/screens/path-layout.js';

const index = buildIndex(JSON.parse(readFileSync(process.argv[2], 'utf8')));
const layout = pathLayout(index);
const NAME_PX = 7.8;      // ancho medio de una letra del nombre (Outfit 500, 14 px)
const KICKER_PX = 6.8;    // y del rótulo de tramo (600, 12 px)
const GAP = 38;           // del centro del nodo al principio del rótulo
const HALF_H = 36;        // medio alto del rótulo (nombre y botón)
const KICKER_H = 22;
function labels(era) {
  const artists = index.isSala(era.id) ? [] : index.stageArtists(era.id);
  const names = artists.map((a) => a.name);
  if (hasMovementReview(index, era.id)) names.push('Repaso · faltan 10');
  return era.points.map((p, i) => {
    const kicker = era.sections.find((s) => s.at === i);
    const w = Math.max((names[i] || '').length * NAME_PX, kicker ? kicker.name.length * KICKER_PX + 30 : 0) + 18;
    const left = p.x < MAP_W / 2;
    const x0 = left ? p.x + GAP : Math.max(0, p.x - GAP - w);
    const x1 = left ? Math.min(MAP_W, p.x + GAP + w) : p.x - GAP;
    return { x0: Math.round(x0), x1: Math.round(x1), y0: Math.round(p.y - HALF_H - (kicker ? KICKER_H : 0)), y1: Math.round(p.y + HALF_H) };
  });
}
const eras = layout.eras.map((e) => ({ id: e.id, h: e.h, points: e.points, start: e.start, signSide: e.sign.side, branchAt: e.branches.map((b) => b.at), labels: labels(e) }));
process.stdout.write(JSON.stringify({ width: MAP_W, step: STEP, eras }));
