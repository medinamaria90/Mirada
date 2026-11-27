// Obras que las vistas recortan demasiado (engine/framing.js): la casilla de «¿Cuál es de X?» y la historia. Lista las que
// pierden más de LOSS_OK y si ya tienen foco revisado (contenido/focos.json, o el «Detalle del día» de tools/catalog_data.py)
// o están marcadas «entera». Las pendientes se revisan mirando la imagen y se apuntan en contenido/focos.json; luego
// python3 -I tools/catalog_from_pipeline.py app. La prueba tests/recortes.test.js falla mientras quede alguna.
//
// Uso: node tools/recortes.mjs [--todas]   (sin --todas, solo las pendientes; sale con código 1 si hay alguna)
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { cropLosses, needsFocus, focusOf, LOSS_OK, LOSS_FOCUSED } from '../app/js/engine/framing.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Ids de las obras que salen en alguna historia (contenido/historias/*.json).
export function storyWorks(root = ROOT) {
  const dir = join(root, 'contenido', 'historias');
  const ids = new Set();
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
    for (const lv of JSON.parse(readFileSync(join(dir, f), 'utf8')).levels || []) {
      for (const c of lv.cards || []) ids.add(c.artwork);
    }
  }
  return ids;
}

export const pendingFocus = (artworks, inStory) => artworks.filter((w) => needsFocus(w, { inStory: inStory.has(w.id) }));

// Filas del informe: obras que alguna vista recorta más de LOSS_OK (la historia, solo hasta LOSS_FOCUSED: más allá va entera).
export function cropRows(artworks, inStory) {
  return artworks.map((w) => {
    const loss = cropLosses(w);
    const story = inStory.has(w.id);
    const views = [loss.pregunta > LOSS_OK && 'pregunta', story && loss.historia > LOSS_OK && loss.historia <= LOSS_FOCUSED && 'historia'].filter(Boolean);
    const status = needsFocus(w, { inStory: story }) ? 'PENDIENTE' : focusOf(w) ? `foco ${focusOf(w).join(',')}` : w.whole ? 'entera' : 'sin recorte importante';
    return { id: w.id, artistId: w.artistId, title: w.title, ratio: (w.w / w.h).toFixed(2), views, status,
      pregunta: Math.round(loss.pregunta * 100), historia: story ? Math.round(loss.historia * 100) : null };
  }).filter((r) => r.views.length);
}

function main() {
  const cat = JSON.parse(readFileSync(join(ROOT, 'app', 'data', 'catalog.json'), 'utf8'));
  const rows = cropRows(cat.artworks, storyWorks());
  const shown = process.argv.includes('--todas') ? rows : rows.filter((r) => r.status === 'PENDIENTE');
  for (const r of shown) {
    const loss = [`pregunta ${r.pregunta}%`, r.historia == null ? '' : `historia ${r.historia}%`].filter(Boolean).join(' · ');
    console.log(`${r.id}\t${r.ratio}\t${loss}\t${r.status}\t${r.artistId}: ${r.title}`);
  }
  const pending = rows.filter((r) => r.status === 'PENDIENTE').length;
  console.log(`${rows.length} obras con recorte importante en alguna vista; ${pending} sin foco revisado.`);
  if (pending) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
