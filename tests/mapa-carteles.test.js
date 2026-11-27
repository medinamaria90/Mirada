// Sistema de carteles del mapa y vuelta al mismo sitio: lápida de época con la única cuenta (una ranura), mojones de
// tramo sin contador (completos, dorados), la parada actual sin botón «Empezar» y la vista que vuelve exactamente a donde
// estaba (map-memory.js), sin recentrar a la fuerza en la parada actual.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { anchorOf, scrollForAnchor } from '../app/js/ui/screens/map-memory.js';
import { tramoSign, eraArch, branchEntrySign } from '../app/js/ui/screens/path-signs.js';
import { metaFor, nodeHtml } from '../app/js/ui/screens/path-nodes.js';
import { pointsUp } from '../app/js/ui/screens/map-return.js';

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

test('carteles: tablilla de tramo (un solo objeto) sin contador; completa, dorada sin iconos; el dintel lleva la única cuenta', () => {
  const half = tramoSign({ name: 'Venecia', key: 'Venecia', sign: SIGN }, { got: 1, total: 3 }, 1000);
  assert.ok(half.includes('>Venecia</span>') && !/\d\/\d/.test(half) && !half.includes('is-done') && !half.includes('tramo-stone'), 'la tablilla a medias lleva cifra, va dorada o repite con un mojón');
  assert.ok(half.includes('aria-label="Tramo Venecia: 1 de 3 dominados. Ver cartel"'));
  const done = tramoSign({ name: 'Venecia', key: 'Venecia', sign: SIGN }, { got: 3, total: 3 }, 1000);
  assert.ok(done.includes('sign-plate is-tramo is-done') && !done.includes('<svg') && !/\d\/\d/.test(done) && done.includes('Tramo Venecia: completo'), 'la completa no se dora o lleva un icono suelto');
  const arch = { x: 200, y: 900, top: 866, side: 'center', x0: 10, x1: 390 };
  const movement = { id: 'barroco', name: 'Barroco', period: 's. XVII' };
  const open = eraArch({ movement, status: 'available', sealed: false, done: 4, total: 9, prevName: 'Renacimiento', arch, h: 1000 });
  assert.ok(open.includes('class="era-arch"') && open.includes('data-action="intro"') && open.includes('arch-progress') && open.includes('4 de 9 pintores dominados'));
  assert.ok(!open.includes('4/9') && !open.includes('arch-meta'), 'cifra o siglos pegados al nombre');
  const sealed = eraArch({ movement, status: 'mastered', sealed: true, done: 9, total: 9, prevName: '', arch, h: 1000 });
  assert.ok(sealed.includes('arch-band is-done') && !sealed.includes('9/9') && sealed.includes('--p:1'), 'la completa lleva cifra');
  const locked = eraArch({ movement, status: 'locked', sealed: false, done: 0, total: 9, prevName: 'el Manierismo', arch, h: 1000 });
  assert.ok(locked.includes('data-action="era-lock"') && !locked.includes('0/9') && !locked.includes('arch-progress'));
  const rama = branchEntrySign({ id: 'gotico', name: 'Gótico' }, arch, 1000, 2, 5);
  assert.ok(rama.includes('class="era-arch"') && rama.includes('data-kind="rama"') && !rama.includes('2/5'), 'el dintel de la rama repite la cuenta de la cabecera');
  const css = readFileSync(join(app, 'css', 'main.css'), 'utf8') + readFileSync(join(app, 'css', 'mapa-carteles.css'), 'utf8');
  assert.ok(!css.includes('sign-check') && !css.includes('trail-thread'), 'queda el sello suelto o la raya central del sendero');
});

test('candados: un solo aviso a la vez, sin temporizador; se cierra al tocar fuera, al desplazar o con Esc', () => {
  const js = readFileSync(join(app, 'js', 'ui', 'screens', 'path-actions.js'), 'utf8');
  assert.ok(/export function showLockNote\(button\) \{\s*closeLockNote\(\);/.test(js), 'un aviso nuevo no cierra el anterior');
  assert.ok(!/setTimeout\(\(\) => note/.test(js), 'el aviso se va solo mientras se lee');
  assert.ok(js.includes("'pointerdown'") && js.includes("'scroll'") && js.includes("'Escape'") && js.includes('lock-note-close'), 'falta una forma de cerrarlo');
  assert.ok(js.includes('navigator.vibrate') && js.includes('prefersReducedMotion()'), 'sin temblor/vibración o sin respetar el movimiento reducido');
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

test('volver a tu parada: la flecha apunta a donde queda, también tras un salto largo (se calcula al desplazar)', () => {
  assert.equal(pointsUp(-7000, 800), true, 'parada muy arriba: flecha arriba');
  assert.equal(pointsUp(7181, 800), false, 'parada muy abajo: flecha abajo');
  assert.equal(pointsUp(900, 800), false);
  const ret = readFileSync(join(app, 'js', 'ui', 'screens', 'map-return.js'), 'utf8');
  assert.ok(ret.includes("addEventListener('scroll'") && ret.includes('.news-card'), 'la flecha no se recalcula al desplazar o el botón queda bajo la tarjeta de novedades');
});

test('volver a tu parada: círculo con flecha y «Tú» (sin cuadro volando); los colores de carteles, solo en variables', async () => {
  const ret = readFileSync(join(app, 'js', 'ui', 'screens', 'map-return.js'), 'utf8');
  assert.ok(/RETURN_TEXT = 'Tú'/.test(ret) && ret.includes('map-return-arrow') && !ret.includes('map-return-art') && ret.includes("'Ir a tu parada'"));
  const css = readFileSync(join(app, 'css', 'mapa-carteles.css'), 'utf8');
  assert.ok(!/#[0-9a-f]{3,8}\b|rgba?\(/i.test(css), 'colores escritos a mano en mapa-carteles.css');
  assert.ok(readFileSync(join(app, 'index.html'), 'utf8').includes('href="css/mapa-carteles.css"'));
});

test('vuelta desde una rama: la tablilla «Volver al camino» fija el foco del mapa en el desvío de ESA rama', () => {
  const branch = readFileSync(join(app, 'js', 'ui', 'screens', 'branch.js'), 'utf8');
  assert.ok(/'back-to-fork': \(\) => returnToMap\(ctx, branch\.id\)/.test(branch), 'la tablilla no vuelve al desvío de su rama');
  assert.ok(/if \(fork\) setMapFocus\(fork, '', true\);/.test(branch), 'la vuelta no centra el mapa en el desvío');
});
