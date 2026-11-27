// Sistema de carteles del mapa y vuelta al mismo sitio: arco de época con la única cuenta, tablillas de tramo sin
// contador (completas, con un sello), la parada actual sin botón «Empezar» y la vista que vuelve exactamente a donde
// estaba (map-memory.js), sin recentrar a la fuerza en la parada actual.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { anchorOf, scrollForAnchor } from '../app/js/ui/screens/map-memory.js';
import { tramoSign, eraArch, branchEntrySign } from '../app/js/ui/screens/path-signs.js';
import { metaFor, nodeHtml } from '../app/js/ui/screens/path-nodes.js';

const app = join(dirname(fileURLToPath(import.meta.url)), '..', 'app');
const SIGN = { side: 'right', edge: 220, y: 500, top: 452, room: 150 };

test('vuelta al mapa: el ancla guarda el punto del centro de la pantalla y vuelve a dejarlo ahí', () => {
  const items = [{ top: -900, height: 1000 }, { top: 100, height: 2000 }, { top: 2100, height: 150 }];
  const a = anchorOf(items, 900);
  assert.deepEqual(a, { index: 1, frac: (450 - 100) / 2000 });
  // Mismo sitio aunque al volver el mapa esté desplazado de otra forma (otra posición de partida).
  // El tramo queda ahora 5000 px más abajo, con la vista arriba (scrollY 0): el punto se ve otra vez en el centro (450).
  const later = { top: 5000, height: 2000 };
  const y = scrollForAnchor(a, later, 0, 900);
  assert.equal(later.top - y + a.frac * later.height, 450);
  // Con el ancho cambiado (tramos más altos), la misma fracción del tramo.
  const wide = { top: 300, height: 2400 };
  const y2 = scrollForAnchor(a, wide, 1000, 900);
  assert.equal(1000 + 300 + a.frac * 2400 - y2, 450);
  // Fuera de los tramos: el más cercano; nunca un desplazamiento negativo.
  assert.equal(anchorOf(items, 10000).index, 2);
  assert.equal(anchorOf([], 900), null);
  assert.equal(scrollForAnchor({ index: 0, frac: 0 }, { top: 0, height: 100 }, 0, 900), 0);
});

test('vuelta al mapa: solo se centra en la parada actual al abrir o con «Tu parada»; al volver, donde estaba', () => {
  const scroll = readFileSync(join(app, 'js', 'ui', 'screens', 'map-scroll.js'), 'utf8');
  const map = readFileSync(join(app, 'js', 'ui', 'screens', 'path-map.js'), 'utf8');
  const home = readFileSync(join(app, 'js', 'ui', 'screens', 'home.js'), 'utf8');
  const branch = readFileSync(join(app, 'js', 'ui', 'screens', 'branch.js'), 'utf8');
  assert.ok(!/GLIDE|smooth/.test(scroll), 'queda el desplazamiento automático hacia la parada siguiente');
  assert.ok(/restore: recallMap\(HOME_MAP\)/.test(map), 'la portada no recupera dónde estaba');
  assert.ok(/rememberMap\(HOME_MAP, map\)/.test(home) && /rememberMap\(memo, map\)/.test(branch), 'no se guarda la vista al salir del mapa');
  assert.ok(/prevRoute\(\) === 'inicio'\) forgetMap\(memo\)/.test(branch), 'entrar en una rama desde el camino no empieza en su parada actual');
});

test('carteles: tablilla de tramo sin contador; completa, con su sello; el arco lleva la única cuenta de la época', () => {
  const half = tramoSign({ name: 'Venecia', key: 'Venecia', sign: SIGN }, { got: 1, total: 3 }, 1000);
  assert.ok(half.includes('>Venecia</span>') && !/\d\/\d/.test(half) && !half.includes('sign-check'), 'la tablilla a medias lleva cifra o sello');
  assert.ok(half.includes('aria-label="Tramo Venecia: 1 de 3 dominados. Ver cartel"'));
  const done = tramoSign({ name: 'Venecia', key: 'Venecia', sign: SIGN }, { got: 3, total: 3 }, 1000);
  assert.ok(done.includes('sign-check') && !/\d\/\d/.test(done) && done.includes('Tramo Venecia: completo'), 'la completa no lleva su sello');
  const arch = { x: 200, y: 900, top: 818, x0: 10, x1: 390 };
  const movement = { id: 'barroco', name: 'Barroco', period: 's. XVII' };
  const open = eraArch({ movement, status: 'available', sealed: false, done: 4, total: 9, prevName: 'Renacimiento', arch, h: 1000 });
  assert.ok(open.includes('class="era-arch"') && open.includes('data-action="intro"') && open.includes('s. XVII · 4/9'));
  const sealed = eraArch({ movement, status: 'mastered', sealed: true, done: 9, total: 9, prevName: '', arch, h: 1000 });
  assert.ok(sealed.includes('arch-band is-done') && !sealed.includes('9/9') && !sealed.includes('sign-seal'), 'la completa lleva cifra o sello flotante');
  const locked = eraArch({ movement, status: 'locked', sealed: false, done: 0, total: 9, prevName: 'el Manierismo', arch, h: 1000 });
  assert.ok(locked.includes('data-action="era-lock"') && !locked.includes('0/9'));
  const rama = branchEntrySign({ id: 'gotico', name: 'Gótico' }, arch, 1000, 2, 5);
  assert.ok(rama.includes('class="era-arch"') && rama.includes('data-kind="rama"') && !rama.includes('2/5'), 'el arco de la rama repite la cuenta de la cabecera');
});

test('parada actual: sin botón «Empezar»; marca «Tú» y se toca el propio nodo', () => {
  assert.equal(metaFor('available', null), '');
  assert.equal(metaFor('started', { best: 0.5 }), 'Repite · 50 %');
  const html = nodeHtml({ cls: '', action: 'stage', id: 'x', status: 'available', lock: '', label: 'X', name: 'X', meta: '', dot: '', current: true });
  assert.ok(html.includes('class="stage-you" aria-hidden="true">Tú<') && html.includes('aria-current="step"') && html.includes('data-action="stage"'));
  assert.ok(!nodeHtml({ cls: '', action: 'stage', id: 'x', status: 'available', lock: '', label: 'X', name: 'X', meta: '', dot: '' }).includes('stage-you'));
  const coach = readFileSync(join(app, 'js', 'ui', 'coach.js'), 'utf8');
  assert.ok(!coach.includes('«Empezar»'), 'la guía de bienvenida sigue hablando del botón «Empezar»');
});

test('«Tu parada»: píldora con texto y flecha; los colores del sistema de carteles, solo en variables', async () => {
  const ret = readFileSync(join(app, 'js', 'ui', 'screens', 'map-return.js'), 'utf8');
  assert.ok(/RETURN_TEXT = 'Tu parada'/.test(ret) && ret.includes('map-return-text') && ret.includes('map-return-arrow'));
  const css = readFileSync(join(app, 'css', 'mapa-carteles.css'), 'utf8');
  assert.ok(!/#[0-9a-f]{3,8}\b|rgba?\(/i.test(css), 'colores escritos a mano en mapa-carteles.css');
  assert.ok(readFileSync(join(app, 'index.html'), 'utf8').includes('href="css/mapa-carteles.css"'));
});
