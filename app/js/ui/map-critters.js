// Vida de paso por tierra y agua: paseantes (o el carruaje) que cruzan un puente siguiendo el sendero, barcas que
// recorren o cruzan un río (pasando bajo el puente), alguien que nada y una barca que deriva en un lago. Cada
// función recibe la escena de un tramo (map-scene.js) y devuelve una promesa que se cumple al terminar, o null si
// ahí no hay sitio para ella.

import { along, between, pick, play, spawn } from './map-actor.js';
import { riverCenter, visibleParts } from './map-scene.js';

const WALK_SPEED = 4.5;            // unidades del SVG por segundo (el mapa mide 390 de ancho)
const CART_SPEED = 10;
const SAIL_SPEED = 8;
const ROW_SPEED = 2.2;
const SWIM_SPEED = 2.4;
const DRIFT_SPEED = 2.6;
const SWIM_RUN = [44, 80];
const CLEAR_OF_TRAIL = 44;         // barcas que cruzan y nadadores, lejos del sendero (y del puente)
const RIVER_EDGE = 18;             // las barcas entran y salen por fuera del mapa
const SAIL_RISE = 2;               // la quilla, algo por debajo del centro del cauce
const BANK_GAP = 5;                // la barca que cruza sale y llega a esta distancia de la orilla
const SAMPLE_STEP = 10;
const BOAT_ANCHOR = '-50%, -88%';  // las barcas se apoyan en el agua por la quilla
const LAKE_RUN = 0.5;              // fracción del ancho del lago que recorre la barca

// Carruaje visto desde arriba, mirando hacia +x (el caballo delante); simétrico, para ir en cualquier sentido.
export const CART_SVG = `<svg viewBox="0 0 30 12" aria-hidden="true" focusable="false">
  <ellipse class="cart-shade" cx="14" cy="6.8" rx="14" ry="5"/>
  <rect class="cart-wheel" x="1.5" y=".6" width="5" height="2" rx="1"/><rect class="cart-wheel" x="1.5" y="9.4" width="5" height="2" rx="1"/>
  <rect class="cart-wheel" x="9.5" y=".6" width="4" height="2" rx="1"/><rect class="cart-wheel" x="9.5" y="9.4" width="4" height="2" rx="1"/>
  <rect class="cart-body" x="0" y="2" width="14" height="8" rx="2"/><rect class="cart-roof" x="1.6" y="3.2" width="9" height="5.6" rx="1.4"/>
  <path class="cart-shaft" d="M14 4.4H19M14 7.6H19"/>
  <ellipse class="cart-horse" cx="23" cy="6" rx="4.6" ry="2.2"/><circle class="cart-horse" cx="28" cy="6" r="1.5"/>
</svg>`;

// Dos paseantes vistos desde arriba, mirando hacia +x: hombros, cabeza y su sombra; cada uno con su paso.
const WALKERS_SVG = `<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
  <g class="walker is-a"><ellipse class="walker-shade" cx="4.9" cy="4.3" rx="2" ry="2.6"/><ellipse class="walker-body" cx="4" cy="3.6" rx="1.45" ry="2.4"/><circle class="walker-head" cx="4.4" cy="3.6" r="1.1"/></g>
  <g class="walker is-b"><ellipse class="walker-shade" cx="7.9" cy="9.1" rx="2" ry="2.6"/><ellipse class="walker-body is-b" cx="7" cy="8.4" rx="1.45" ry="2.4"/><circle class="walker-head" cx="7.4" cy="8.4" r="1.1"/></g>
</svg>`;

// Velero de lado (como los del paisaje), con la vela hacia +x.
const SAIL_SVG = `<svg viewBox="0 0 14 14" aria-hidden="true" focusable="false"><g class="boat-rock">
  <ellipse class="boat-wake" cx="7" cy="13.2" rx="7.5" ry="1"/>
  <path class="boat-hull" d="M0 10L2.2 13H11.8L14 10Z"/><rect class="boat-hull" x="6.3" y="1" width="1.2" height="9.2"/>
  <path class="boat-sail" d="M7.9 1.2L13 8.4H7.9Z"/>
</g></svg>`;

// Barquita de remos de lado: casco, quien rema y el remo.
const ROW_SVG = `<svg viewBox="0 0 14 12" aria-hidden="true" focusable="false"><g class="boat-rock">
  <ellipse class="boat-wake" cx="7" cy="11.3" rx="7.5" ry=".9"/>
  <ellipse class="rower-body" cx="7" cy="6.6" rx="1.7" ry="2.1"/><circle class="rower-head" cx="7" cy="3.9" r="1.3"/>
  <path class="boat-oar" d="M2.6 10.6L10.8 6.6"/>
  <path class="boat-hull" d="M.6 8.2L2.8 11H11.2L13.4 8.2Z"/>
</g></svg>`;

// Alguien que nada, visto desde arriba hacia +x: la cabeza, los brazos que se turnan y la estela.
const SWIM_SVG = `<svg viewBox="0 0 14 8" aria-hidden="true" focusable="false">
  <path class="swim-wake" d="M5 1.6Q2.6 4 5 6.4M2.6 .8Q-.6 4 2.6 7.2"/>
  <ellipse class="swim-arm is-a" cx="10.6" cy="2.2" rx="1.6" ry=".6"/><ellipse class="swim-arm is-b" cx="10.6" cy="5.8" rx="1.6" ry=".6"/>
  <circle class="swim-head" cx="8.4" cy="4" r="1.5"/>
</svg>`;

// x del sendero a la altura y (la muestra más cercana), o null si el sendero no pasa por ahí.
function trailXAt(scene, y) {
  let best = null;
  for (const s of scene.trail) if (!best || Math.abs(s.y - y) < Math.abs(best.y - y)) best = s;
  return best ? best.x : null;
}

const clearOfTrail = (scene, x, y) => {
  const tx = trailXAt(scene, y);
  return tx === null || Math.abs(x - tx) > CLEAR_OF_TRAIL;
};

// Paseantes (o, a veces, el carruaje) que cruzan un puente del sendero, alineados con él.
export function crossBridge(scene, { cart = Math.random() < 0.3 } = {}) {
  const bridge = pick(visibleParts(scene).bridges.filter((b) => b.run));
  if (!bridge) return null;
  const pts = Math.random() < 0.5 ? [...bridge.run].reverse() : bridge.run;
  const el = spawn(scene, cart ? 'cart' : 'walkers', cart ? CART_SVG : WALKERS_SVG);
  const { frames, duration } = along(scene, pts, { speed: cart ? CART_SPEED : WALK_SPEED, edge: 0.2, turn: true });
  return play(el, frames, duration);
}

// Puntos del centro del cauce de x0 a x1.
function riverLine(river, x0, x1, rise) {
  const n = Math.max(2, Math.ceil(Math.abs(x1 - x0) / SAMPLE_STEP));
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = x0 + ((x1 - x0) * i) / n;
    return { x, y: riverCenter(river, x) + rise };
  });
}

// Un velero recorre el río de orilla a orilla del mapa (bajo el puente del sendero).
export function sailRiver(scene) {
  const river = pick(visibleParts(scene).rivers);
  if (!river) return null;
  const right = Math.random() < 0.5;
  const [a, b] = [river.x0 - RIVER_EDGE, river.x1 + RIVER_EDGE];
  const pts = riverLine(river, right ? a : b, right ? b : a, SAIL_RISE);
  const el = spawn(scene, 'boat', SAIL_SVG, { under: true });
  const { frames, duration } = along(scene, pts, { speed: SAIL_SPEED, edge: 0.06, flip: !right, anchor: BOAT_ANCHOR });
  return play(el, frames, duration);
}

// Una barquita de remos cruza el río de una orilla a la otra, lejos del sendero.
export function rowAcross(scene) {
  const river = pick(visibleParts(scene).rivers);
  if (!river) return null;
  const spots = Array.from({ length: 12 }, () => between([river.x0 + 30, river.x1 - 40])).filter((x) => clearOfTrail(scene, x, river.y));
  if (!spots.length) return null;
  const x = spots[0];
  const c = riverCenter(river, x);
  const half = river.h / 2 - BANK_GAP;
  const down = Math.random() < 0.5;
  const pts = [{ x, y: c - half * (down ? 1 : -1) }, { x, y: c + half * (down ? 1 : -1) }];
  const el = spawn(scene, 'rowboat', ROW_SVG, { under: true });
  const { frames, duration } = along(scene, pts, { speed: ROW_SPEED, edge: 0.18, flip: Math.random() < 0.5, anchor: BOAT_ANCHOR });
  return play(el, frames, duration);
}

// Alguien nada un rato río abajo (o arriba), lejos del sendero.
export function swim(scene) {
  const river = pick(visibleParts(scene).rivers);
  if (!river) return null;
  const run = between(SWIM_RUN);
  const right = Math.random() < 0.5;
  const starts = Array.from({ length: 12 }, () => between([river.x0 + 20, river.x1 - 20 - run]))
    .filter((x) => [x, x + run / 2, x + run].every((xx) => clearOfTrail(scene, xx, river.y)));
  if (!starts.length) return null;
  const [x0, x1] = right ? [starts[0], starts[0] + run] : [starts[0] + run, starts[0]];
  const el = spawn(scene, 'swimmer', SWIM_SVG, { under: true });
  const { frames, duration } = along(scene, riverLine(river, x0, x1, 0), { speed: SWIM_SPEED, edge: 0.2, turn: true });
  return play(el, frames, duration);
}

// Una barca deriva despacio por un lago.
export function driftLake(scene) {
  const lake = pick(visibleParts(scene).lakes);
  if (!lake) return null;
  const right = Math.random() < 0.5;
  const reach = lake.rx * LAKE_RUN;
  const y = lake.y + lake.ry * 0.2;
  const pts = [{ x: lake.cx - reach * (right ? 1 : -1), y }, { x: lake.cx + reach * (right ? 1 : -1), y }];
  const el = spawn(scene, 'rowboat', ROW_SVG, { under: true });
  const { frames, duration } = along(scene, pts, { speed: DRIFT_SPEED, edge: 0.25, flip: !right, anchor: BOAT_ANCHOR });
  return play(el, frames, duration);
}

// Carruaje por un tramo del sendero (lo de siempre del mapa vivo).
const CART_RUN = 150;
const CART_PATH = [0.12, 0.8];     // ni la entrada ni el final del tramo
export function cartRide(scene) {
  const { trail } = scene;
  if (trail.length < 2 || scene.li.querySelector('.map-cart')) return null;
  const total = trail[trail.length - 1].l;
  const span = total * (CART_PATH[1] - CART_PATH[0]);
  const run = Math.min(CART_RUN, span);
  const from = total * CART_PATH[0] + Math.random() * (span - run);
  let pts = trail.filter((s) => s.l >= from && s.l <= from + run);
  if (pts.length < 2) return null;
  if (Math.random() < 0.5) pts = pts.reverse();
  const el = spawn(scene, 'cart', CART_SVG);
  const { frames, duration } = along(scene, pts, { speed: CART_SPEED, edge: 0.1, turn: true });
  return play(el, frames, duration);
}
