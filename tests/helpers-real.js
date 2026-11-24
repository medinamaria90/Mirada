// Catálogo real publicado: data/catalog.json + los textos de data/catalog-text.json.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex, mergeCatalogText } from '../app/js/engine/catalog.js';

const data = join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'data');
import { LEGACY_IDS } from '../app/js/state/legacy-ids.js';

// Id del catálogo grande de una obra del catálogo pequeño (a<N>, b<N>): los tests antiguos las nombran así.
export function W(oldId) {
  if (!LEGACY_IDS[oldId]) throw new Error(`obra antigua sin equivalente: ${oldId}`);
  return LEGACY_IDS[oldId];
}
export const realCatalogJson = () => JSON.parse(readFileSync(join(data, 'catalog.json'), 'utf8'));
export const realTextJson = () => JSON.parse(readFileSync(join(data, 'catalog-text.json'), 'utf8'));

export function realIndex() {
  const index = buildIndex(realCatalogJson());
  mergeCatalogText(index, realTextJson());
  return index;
}
