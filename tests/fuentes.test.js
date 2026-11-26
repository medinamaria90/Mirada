// «Fuentes y créditos»: las fuentes salen de los datos (épocas, pintores, obras) y no se enseñan en las tarjetas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mergeCatalogFicha } from '../app/js/engine/catalog.js';
import { sourceTitle, uniqueSources, eraSources, artistSources, imageCredits, licenseSummary, commonsUrl, licenseName } from '../app/js/engine/credits.js';
import { parseRoute } from '../app/js/ui/router.js';
import { realIndex } from './helpers-real.js';

const app = join(dirname(fileURLToPath(import.meta.url)), '..', 'app');
const json = (p) => JSON.parse(readFileSync(join(app, p), 'utf8'));
const src = (p) => readFileSync(join(app, p), 'utf8');

test('fuentes: título legible de cada fuente (sitio y página) y textos que no son dirección, tal cual', () => {
  assert.equal(sourceTitle('https://es.wikipedia.org/wiki/Sandro_Botticelli'), 'Wikipedia · Sandro Botticelli');
  assert.equal(sourceTitle('https://es.wikipedia.org/wiki/Diego_Vel%C3%A1zquez'), 'Wikipedia · Diego Velázquez');
  assert.equal(sourceTitle('https://www.britannica.com/art/Western-painting/Baroque'), 'britannica.com · Baroque');
  assert.equal(sourceTitle('https://www.wikidata.org/wiki/Q15790'), 'Wikidata');
  assert.equal(sourceTitle('https://www.museodelprado.es/'), 'museodelprado.es');
  assert.equal(sourceTitle('Wikipedia ES, «La fragua»'), 'Wikipedia ES, «La fragua»');
  assert.ok(sourceTitle(`https://example.org/${'a'.repeat(200)}`).length <= 72);
});

test('fuentes: juntas, sin repetir (sin el ancla) y en orden', () => {
  const list = uniqueSources(['https://es.wikipedia.org/wiki/Rafael', 'https://es.wikipedia.org/wiki/Rafael#Retratos', '', null, 'Museo de prueba', 'Museo de prueba']);
  assert.deepEqual(list, [{ url: 'https://es.wikipedia.org/wiki/Rafael', title: 'Wikipedia · Rafael' }, { url: '', title: 'Museo de prueba' }]);
});

test('fuentes: cada época con tarjetas y cada pintor tienen sus fuentes; Wikidata para las fechas', async () => {
  const index = realIndex();
  for (const id of json('data/epocas/index.json')) {
    assert.ok(eraSources(json(`data/epocas/${id}.json`).cards).length > 0, `${id} sin fuentes`);
  }
  const goya = index.artist('goya');
  const list = artistSources(goya, index.worksOf('goya'), json('data/historias/goya.json'));
  assert.ok(list.some((s) => s.url === goya.why.source.split('#')[0]), 'por qué importa');
  assert.ok(list.some((s) => s.url === `https://www.wikidata.org/wiki/${goya.qid}`), 'fechas y país');
  assert.equal(new Set(list.map((s) => s.url || s.title)).size, list.length, 'sin repetir');
});

test('fuentes: crédito de cada imagen (archivo de Commons y licencia) y resumen de licencias', () => {
  const index = realIndex();
  mergeCatalogFicha(index, json('data/catalog-ficha.json'));
  const credits = imageCredits(index.worksOf('velazquez'));
  assert.ok(credits.length > 0);
  assert.ok(credits.every((c) => c.url.startsWith('https://commons.wikimedia.org/wiki/File:') && c.license));
  const sum = licenseSummary(index.artworks);
  assert.equal(sum.reduce((n, l) => n + l.count, 0), index.artworks.filter((w) => w.source?.file).length);
  assert.equal(sum[0].license, 'Dominio público');
  assert.equal(commonsUrl('Las Meninas, by Diego Velázquez.jpg'), 'https://commons.wikimedia.org/wiki/File:Las_Meninas%2C_by_Diego_Vel%C3%A1zquez.jpg');
  assert.equal(licenseName('PDM-owner'), 'Dominio público');
  assert.equal(licenseName('CC BY-SA 4.0'), 'CC BY-SA 4.0');
});

test('fuentes: página propia (#fuentes) y ningún enlace de fuente en tarjetas de época, historias ni ficha', () => {
  assert.deepEqual(parseRoute('#fuentes'), { name: 'credits' });
  assert.match(src('js/ui/screens/profile-settings.js'), /data-action="credits"/);
  for (const f of ['js/ui/screens/era-cards.js', 'js/ui/story-card.js', 'js/ui/story-viewer.js', 'js/ui/artist-profile.js']) {
    assert.doesNotMatch(src(f), /\.source\b|sourceLabel|story-sources|era-source|ap-source/, `${f} enseña fuentes`);
  }
});
