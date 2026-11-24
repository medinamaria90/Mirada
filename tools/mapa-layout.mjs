// Trazado del mapa del camino en JSON, para que tools/mapa_svg.py pinte los paisajes con las mismas
// medidas que la app (ui/screens/path-layout.js es la única fuente del trazado): alto de cada tramo, nodos,
// lado del cartel de la época y paradas con el desvío de una rama (ahí no se pinta nada en el margen).
//   node tools/mapa-layout.mjs app/data/catalog.json
import { readFileSync } from 'node:fs';
import { buildIndex } from '../app/js/engine/catalog.js';
import { pathLayout, MAP_W, STEP } from '../app/js/ui/screens/path-layout.js';

const index = buildIndex(JSON.parse(readFileSync(process.argv[2], 'utf8')));
const layout = pathLayout(index);
const eras = layout.eras.map((e) => ({ id: e.id, h: e.h, points: e.points, start: e.start, signSide: e.sign.side, branchAt: e.branches.map((b) => b.at) }));
process.stdout.write(JSON.stringify({ width: MAP_W, step: STEP, eras }));
