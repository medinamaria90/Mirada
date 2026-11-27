// Historias compartidas: la ruta que las abre, qué niveles se comparten, el enlace y sus páginas con vista previa (app/h/).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseRoute, storyRoute } from '../app/js/ui/router.js';
import { isShareable, levelStory, SHARE_LEVEL } from '../app/js/engine/stories.js';
import { storyUrl } from '../app/js/ui/story-share.js';
import { copyHtml } from '../app/js/ui/story-card.js';

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..', 'app');
const json = (p) => JSON.parse(readFileSync(join(app, p), 'utf8'));

test('historia compartida: la ruta lleva pintor (con guiones) y nivel', () => {
  assert.deepEqual(parseRoute(`#${storyRoute('el-greco', 1)}`), { name: 'story', artistId: 'el-greco', level: 1 });
  assert.equal(parseRoute('#historia-goya').name, 'invalid');
});

test('historia compartida: solo el nivel 1 (no destripa lo que viene)', () => {
  assert.equal(isShareable(1), true);
  assert.equal(isShareable(2), false);
});

test('historia compartida: el enlace va a su página, en la misma dirección de la app y sin nada más de quien comparte', () => {
  assert.equal(storyUrl('goya', 1, 'https://x.test/app/?a=1#perfil'), 'https://x.test/app/h/goya-1.html');
});

test('historia compartida: sin «Jugar» ni «Ver más», la última tarjeta no lleva acciones', () => {
  const html = copyHtml({ text: 'Hola' }, null, { last: true, play: false, more: false });
  assert.ok(!html.includes('story-actions'));
  assert.ok(copyHtml({ text: 'Hola' }, null, { last: true, play: true }).includes('data-st="more"'));
});

test('historia compartida: cada historia de nivel 1 tiene su página con su imagen ligera, la primera frase y el salto a la app', () => {
  const index = json('data/historias/index.json');
  const works = new Map(json('data/catalog.json').artworks.map((w) => [w.id, w]));
  const pages = new Set(readdirSync(join(app, 'h')).filter((f) => !f.startsWith('epoca-')));
  const expected = Object.keys(index).filter((id) => index[id].includes(SHARE_LEVEL));
  assert.equal(pages.size, expected.length, 'páginas de más o de menos: python3 -I tools/share_pages.py');
  for (const id of expected) {
    const name = `${id}-${SHARE_LEVEL}.html`;
    assert.ok(pages.has(name), `falta app/h/${name}`);
    const html = readFileSync(join(app, 'h', name), 'utf8');
    const card = levelStory(json(`data/historias/${id}.json`), SHARE_LEVEL).cards[0];
    assert.ok(works.has(card.artwork), `${name}: obra fuera del catálogo`);
    assert.ok(html.includes(`content="https://sfumato.dibulios.com/img/og/${id}-${SHARE_LEVEL}.jpg"`), `${name}: imagen ligera`);
    assert.ok(html.includes(`location.replace('../#${storyRoute(id, SHARE_LEVEL)}')`), `${name}: salto`);
  }
});
