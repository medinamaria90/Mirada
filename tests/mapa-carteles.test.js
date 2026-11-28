// Sistema de carteles del mapa y vuelta al mismo sitio: placa de época en su puerta, medallón y rombos de tramo como
// paradas (sin ver, con puntito; completos, con sello), la parada actual sin botón «Empezar» y la vista que vuelve
// exactamente a donde estaba (map-memory.js), sin recentrar a la fuerza en la parada actual.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { anchorOf, scrollForAnchor } from '../app/js/ui/screens/map-memory.js';
import { eraArch, branchEntrySign } from '../app/js/ui/screens/path-signs.js';
import { tramoLore, eraLore, branchLore } from '../app/js/ui/screens/path-lore.js';
import { eraPlace, eraGate, inscription } from '../app/js/ui/screens/path-art.js';
import { nodeHtml } from '../app/js/ui/screens/path-nodes.js';
import { pointsUp } from '../app/js/ui/screens/map-return.js';

const app = join(dirname(fileURLToPath(import.meta.url)), '..', 'app');
const SIGN = { side: 'right', x: 240, y: 500 };

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

test('carteles: rombo de tramo y medallón de época, paradas de la misma familia; placa de la puerta sin botón', () => {
  const half = tramoLore({ sec: { name: 'Venecia', key: 'Venecia', sign: SIGN }, info: { got: 1, total: 3 }, h: 1000 });
  assert.ok(half.includes('<span class="stage-name">Venecia</span>') && half.includes('class="lore lore-tramo is-open"') && !/\d\/\d/.test(half) && !half.includes('📖'), 'el rombo a medias lleva cifra o emoji');
  assert.ok(half.includes('aria-label="Tramo Venecia: 1 de 3 pintores. Ver cartel"') && half.includes('data-action="cartel"'));
  const done = tramoLore({ sec: { name: 'Venecia', key: 'Venecia', sign: SIGN }, info: { got: 3, total: 3 }, h: 1000 });
  assert.ok(done.includes('lore-tramo is-done') && done.includes('stage-badge') && done.includes('Tramo Venecia: completo'), 'el completo no lleva sello');
  const fresh = tramoLore({ sec: { name: 'Venecia', key: 'Venecia', sign: SIGN }, info: { got: 0, total: 3 }, h: 1000, fresh: true, here: true, next: 'tiziano' });
  assert.ok(fresh.includes('lore-ping') && fresh.includes('is-fresh') && fresh.includes('Sin ver') && fresh.includes('data-next="tiziano"') && fresh.includes('stage-you'), 'el rombo sin ver no lo dice o no sigue al pintor');
  const arch = { x: 200, y: 900, ...eraPlace(200, 900).box };
  const movement = { id: 'barroco', name: 'Barroco', period: 's. XVII' };
  const plate = eraArch({ movement, status: 'available', sealed: false, arch, h: 1000 });
  assert.ok(plate.includes('class="era-arch"') && plate.includes('>Barroco</span>') && !plate.includes('<button') && !plate.includes('data-action'), 'la placa es un botón o no lleva el nombre');
  const stop = { x: 200, y: 890 };
  const open = eraLore({ movement, status: 'available', sealed: false, done: 4, total: 9, prevName: 'Renacimiento', stop, h: 1000, fresh: false, here: false });
  assert.ok(open.includes('lore lore-era is-open') && open.includes('data-action="intro"') && open.includes('4 de 9 pintores') && !open.includes('lore-ping'), 'el medallón abierto no abre la presentación');
  assert.ok(open.includes(`top:${(890 / 10).toFixed(0)}%`), 'el medallón no va en su sitio');
  const sealed = eraLore({ movement, status: 'mastered', sealed: true, done: 9, total: 9, stop, h: 1000 });
  assert.ok(sealed.includes('lore-era is-done') && sealed.includes('completa'), 'la completa no lo dice');
  assert.ok(eraArch({ movement, status: 'mastered', sealed: true, arch, h: 1000 }).includes('arch-band is-done'), 'la placa de la completa no va en oro');
  const locked = eraLore({ movement, status: 'locked', sealed: false, done: 0, total: 9, prevName: 'el Manierismo', stop, h: 1000, fresh: true });
  assert.ok(locked.includes('data-action="era-lock"') && locked.includes('is-locked') && !locked.includes('lore-ping'), 'la cerrada abre la presentación o lleva el puntito');
  assert.ok(eraGate(200, 900, { locked: true }).length > eraGate(200, 900).length, 'la puerta cerrada no lleva portón');
  // El nombre corto de la época de Van Eyck, fiel a lo que hay al cruzar la puerta; el resto, entero y sin paréntesis.
  assert.equal(inscription('Manierismo y Renacimiento del Norte'), 'Renacimiento del Norte');
  assert.equal(inscription('Estampa japonesa (ukiyo-e)'), 'Estampa japonesa');
  assert.equal(inscription('Rococó y Neoclasicismo'), 'Rococó y Neoclasicismo');
  const rama = branchEntrySign({ id: 'gotico', name: 'Gótico' }, arch, 1000, 2, 5);
  assert.ok(rama.includes('class="era-arch"') && !rama.includes('2/5'), 'la puerta de la rama repite la cuenta de la cabecera');
  assert.ok(branchLore({ branch: { id: 'gotico', name: 'Gótico' }, stop, h: 1000, mastered: 2, total: 5 }).includes('data-kind="rama"'), 'el medallón de la rama no abre su cartel');
  // Sin ver: respira, salvo con «Reducir animaciones»; zona táctil de 48 px como mínimo.
  const cssC = readFileSync(join(app, 'css', 'mapa-carteles.css'), 'utf8');
  assert.ok(/prefers-reduced-motion: reduce\) \{ \.lore\.is-fresh \.lore-face \{ animation: none/.test(cssC) && /html\.reduce-motion \.lore\.is-fresh/.test(cssC), 'el respiro no respeta «Reducir animaciones»');
  const brandC = readFileSync(join(app, 'css', 'brand.css'), 'utf8');
  assert.ok(Number(brandC.match(/--lore-hit: (\d+)px/)[1]) >= 48, 'zona táctil del medallón y el rombo por debajo de 48 px');
  const css = readFileSync(join(app, 'css', 'main.css'), 'utf8') + readFileSync(join(app, 'css', 'mapa-carteles.css'), 'utf8');
  assert.ok(!css.includes('sign-check') && !css.includes('trail-thread') && !css.includes('proto-'), 'queda el sello suelto, la raya central o restos del prototipo');
  const brand = readFileSync(join(app, 'css', 'brand.css'), 'utf8');
  assert.ok(!/Cinzel/.test(brand) && /--inscr-weight: 600/.test(brand), 'la inscripción no va en la letra de la app en semibold');
  assert.equal(inscription('Postimpresionismo'), 'Postimpresionismo', 'se parte una palabra con guion');
});

test('candados: un solo aviso a la vez, sin temporizador; se cierra al tocar fuera, al desplazar o con Esc', () => {
  const js = readFileSync(join(app, 'js', 'ui', 'screens', 'path-actions.js'), 'utf8');
  assert.ok(/export function showLockNote\(button\) \{\s*closeLockNote\(\);/.test(js), 'un aviso nuevo no cierra el anterior');
  assert.ok(!/setTimeout\(\(\) => note/.test(js), 'el aviso se va solo mientras se lee');
  assert.ok(js.includes("'pointerdown'") && js.includes("'scroll'") && js.includes("'Escape'") && js.includes('lock-note-close'), 'falta una forma de cerrarlo');
  assert.ok(js.includes('navigator.vibrate') && js.includes('prefersReducedMotion()'), 'sin temblor/vibración o sin respetar el movimiento reducido');
});

test('parada actual: sin botón «Empezar»; marca «Tú» y se toca el propio nodo', () => {
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

test('inscripción de la época: de noche, letras claras sobre la piedra en sombra (se lee con el mapa oscurecido)', () => {
  const css = readFileSync(join(app, 'css', 'mapa-carteles.css'), 'utf8');
  const at = css.indexOf('\n.arch-name {');
  const rule = css.slice(at, css.indexOf('}', at));
  assert.ok(/--inscr-night-ink\) calc\(var\(--day-night, 0\) \* 100%\)/.test(rule), 'el color de la inscripción no sigue a la noche del mapa');
});
