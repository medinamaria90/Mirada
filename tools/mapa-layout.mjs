// Trazado del mapa del camino en JSON, para que tools/mapa_svg.py pinte los paisajes con las mismas
// medidas que la app (ui/screens/path-map.js es la única fuente del trazado).
//   node tools/mapa-layout.mjs app/data/catalog.json
import { readFileSync } from 'node:fs';
import { buildIndex } from '../app/js/engine/catalog.js';
import { pathLayout, MAP_W, STEP } from '../app/js/ui/screens/path-map.js';

const index = buildIndex(JSON.parse(readFileSync(process.argv[2], 'utf8')));
const layout = pathLayout(index);
process.stdout.write(JSON.stringify({ width: MAP_W, step: STEP, eras: layout.eras.map((e) => ({ id: e.id, h: e.h, points: e.points, chest: e.chest, start: e.start })) }));
