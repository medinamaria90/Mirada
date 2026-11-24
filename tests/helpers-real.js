// Catálogo real publicado: data/catalog.json + los textos de data/catalog-text.json.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex, mergeCatalogText } from '../app/js/engine/catalog.js';

const data = join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'data');
export const realCatalogJson = () => JSON.parse(readFileSync(join(data, 'catalog.json'), 'utf8'));
export const realTextJson = () => JSON.parse(readFileSync(join(data, 'catalog-text.json'), 'utf8'));

export function realIndex() {
  const index = buildIndex(realCatalogJson());
  mergeCatalogText(index, realTextJson());
  return index;
}
