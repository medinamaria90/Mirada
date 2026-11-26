// Vida de paso por el aire: pájaros que llegan, se posan en un árbol, saltan a otro y se van; mariposas de día; la
// sombra de una nube que pasa; de noche, estrellas que titilan (capa propia, en los huecos libres del paisaje y
// reflejadas en el agua) y, muy de vez en cuando, una estrella fugaz.

import { at, between, fade, heading, pick, play, spawn } from './map-actor.js';
import { visibleParts } from './map-scene.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const BIRD_SPEED = 38;             // unidades del SVG por segundo
const BIRD_PERCH_MS = [2600, 6000];
const BIRD_HOP = [50, 210];        // distancia entre el primer árbol y el segundo
const BIRD_ARC = 14;               // lo que sube el vuelo entre dos puntos
const BIRD_ENTRY_RISE = 60;        // llega desde el borde, algo más arriba que el árbol
const BIRD_FLIGHT_SAMPLES = 6;
const BIRD_PAIR_DELAY_MS = 420;
const BIRD_PAIR_GAP = 5;           // la pareja se posa a esta distancia
const BIRD_FADE_MS = 500;
const BIRD_ANCHOR = '-50%, -90%';  // posado: las patas en la copa
const FLY_SPEED = 11;              // mariposa
const FLY_HOPS = 4;
const FLY_REACH = 70;
const FLY_WOBBLE = 6;
const CLOUD_MS = [42000, 60000];
const METEOR_MS = 1100;
const METEOR_RUN = 120;            // unidades que recorre la estrella fugaz
const METEOR_ANGLE = [16, 32];     // grados por debajo de la horizontal
const STAR_SHARE = 0.8;            // de los huecos libres, cuántos llevan estrella
const SPARKLE_EVERY = 4;           // una de cada cuatro, estrella de cuatro puntas
const STAR_R = [0.8, 1.4];
const SPARKLE_R = 2.4;
const GLINT_R = 0.75;
const TWINKLE_GROUPS = 4;

const BIRD_SVG = `<svg viewBox="0 0 12 8" aria-hidden="true" focusable="false">
  <g class="bird-fly"><path class="bird-wing" d="M1 3.6Q3.4 1.4 6 4.2Q8.6 1.4 11 3.6Q8.4 3 6 5.4Q3.6 3 1 3.6Z"/></g>
  <g class="bird-sit"><path class="bird-body" d="M3.4 6.4Q3.6 4 6.6 4.2L8.8 5.6Q7.2 7.6 3.4 6.4ZM3.6 6.2L1.6 7"/><circle class="bird-body" cx="8.2" cy="3.8" r="1.35"/></g>
</svg>`;

const BUTTERFLY_SVG = `<svg viewBox="0 0 8 6" aria-hidden="true" focusable="false"><g class="fly-wings">
  <path class="fly-wing" d="M4 3Q1 -.6 .6 2Q.4 4.6 4 3Z"/><path class="fly-wing is-r" d="M4 3Q7 -.6 7.4 2Q7.6 4.6 4 3Z"/>
</g></svg>`;

// ---- estrellas: una capa por tramo, encima del paisaje y por debajo del sendero ----------------------------------

function sparkle(x, y, r) {
  const k = r * 0.22;
  return `M${x} ${y - r}L${x + k} ${y - k}L${x + r} ${y}L${x + k} ${y + k}L${x} ${y + r}L${x - k} ${y + k}L${x - r} ${y}L${x - k} ${y - k}Z`;
}

const pairsOf = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).map((p) => p.split(',').map(Number));

// Puntos fijos (sin azar: el mismo cielo cada vez) a partir de los huecos libres y los brillos del agua.
export function starPoints(free, glints) {
  const stars = free.filter((_, i) => (i * 7919) % 10 < STAR_SHARE * 10).map(([x, y], i) => ({
    x, y, sparkle: i % SPARKLE_EVERY === 0, r: STAR_R[0] + ((i * 37) % 10) / 10 * (STAR_R[1] - STAR_R[0]), group: i % TWINKLE_GROUPS,
  }));
  return stars.concat(glints.map(([x, y], i) => ({ x, y, sparkle: false, r: GLINT_R, group: (i + 1) % TWINKLE_GROUPS, glint: true })));
}

export function addStars(svg) {
  if (svg.nextElementSibling?.classList.contains('path-stars')) return null;
  const pts = starPoints(pairsOf(svg.dataset.free), pairsOf(svg.dataset.glints));
  if (!pts.length) return null;
  const layer = document.createElementNS(SVG_NS, 'svg');
  layer.setAttribute('class', 'path-stars');
  layer.setAttribute('viewBox', svg.getAttribute('viewBox'));
  layer.setAttribute('preserveAspectRatio', 'none');
  layer.setAttribute('aria-hidden', 'true');
  layer.setAttribute('focusable', 'false');
  layer.innerHTML = pts.map((p) => (p.sparkle
    ? `<path class="star tw-${p.group}" d="${sparkle(p.x, p.y, SPARKLE_R)}"/>`
    : `<circle class="star tw-${p.group}${p.glint ? ' is-glint' : ''}" cx="${p.x}" cy="${p.y}" r="${p.r.toFixed(2)}"/>`)).join('');
  svg.after(layer);
  return layer;
}

// ---- pájaros ---------------------------------------------------------------------------------------------------

function flight(a, b) {
  return Array.from({ length: BIRD_FLIGHT_SAMPLES + 1 }, (_, i) => {
    const t = i / BIRD_FLIGHT_SAMPLES;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t - Math.sin(Math.PI * t) * BIRD_ARC };
  });
}

// Plan del pájaro: [{x, y, ms, sit}] (ms: cuándo llega a ese punto).
function birdPlan(scene, a, b) {
  const enterLeft = a.x < scene.w / 2;
  const start = { x: enterLeft ? -8 : scene.w + 8, y: a.y - BIRD_ENTRY_RISE };
  const exitRight = b.x >= scene.w / 2;
  const end = { x: exitRight ? scene.w + 8 : -8, y: Math.max(scene.view.top, b.y - BIRD_ENTRY_RISE * 1.4) };
  const plan = [];
  let ms = 0;
  const fly = (from, to) => {
    flight(from, to).forEach((p, i) => {
      if (i === 0 && plan.length) return;
      if (i) ms += (Math.hypot(to.x - from.x, to.y - from.y) / BIRD_FLIGHT_SAMPLES / BIRD_SPEED) * 1000;
      plan.push({ ...p, ms, sit: false, dir: Math.sign(to.x - from.x) || 1 });
    });
  };
  const sit = (p) => {
    plan[plan.length - 1].sit = true;
    ms += between(BIRD_PERCH_MS);
    plan.push({ ...p, ms, sit: false, dir: plan[plan.length - 1].dir });   // aquí echa a volar
  };
  fly(start, a); sit(a); fly(a, b); sit(b); fly(b, end);
  return plan;
}

function birdFrames(scene, plan) {
  const total = plan[plan.length - 1].ms;
  const fadeEdge = BIRD_FADE_MS / total;
  const body = plan.map((p, i) => ({
    offset: p.ms / total,
    transform: at(scene, p.x, p.y, { flip: p.dir < 0, anchor: BIRD_ANCHOR }),
    opacity: i === 0 || i === plan.length - 1 ? 0 : Math.min(1, fade(p.ms / total, fadeEdge) * 2),
  }));
  // Posado o volando: se cambia de dibujo de golpe al llegar y al salir.
  const pose = (sitting) => plan.map((p) => ({ offset: p.ms / total, opacity: (p.sit === sitting) ? 1 : 0, easing: 'steps(1, end)' }));
  return { body, fly: pose(false), sit: pose(true), total };
}

export function birdVisit(scene, { pair = Math.random() < 0.4 } = {}) {
  const trees = visibleParts(scene, 30).trees;
  const a = pick(trees);
  if (!a) return null;
  const b = pick(trees.filter((t) => { const d = Math.hypot(t.x - a.x, t.y - a.y); return d >= BIRD_HOP[0] && d <= BIRD_HOP[1]; }));
  if (!b) return null;
  const one = (dx, delay) => {
    const el = spawn(scene, 'bird', BIRD_SVG);
    const { body, fly, sit, total } = birdFrames(scene, birdPlan(scene, { x: a.x + dx, y: a.y }, { x: b.x - dx, y: b.y }));
    const opts = { duration: total, delay, easing: 'linear', fill: 'both' };
    el.querySelector('.bird-fly').animate(fly, opts);
    el.querySelector('.bird-sit').animate(sit, opts);
    return play(el, body, total, { delay });
  };
  return pair ? Promise.all([one(-BIRD_PAIR_GAP / 2, 0), one(BIRD_PAIR_GAP / 2, BIRD_PAIR_DELAY_MS)]) : one(0, 0);
}

// ---- mariposas, nube y estrella fugaz --------------------------------------------------------------------------

export function butterfly(scene) {
  const free = visibleParts(scene, 30).free;
  const nearOf = (p) => free.filter((f) => f !== p && Math.hypot(f.x - p.x, f.y - p.y) < FLY_REACH);
  const first = pick(free.filter((p) => nearOf(p).length >= 2));
  if (!first) return null;
  const near = nearOf(first);
  const hops = [first, ...near.sort(() => Math.random() - 0.5).slice(0, FLY_HOPS - 1)];
  const pts = [];
  hops.forEach((p, i) => {
    const q = hops[i + 1];
    if (!q) { pts.push(p); return; }
    for (let k = 0; k < 4; k++) {
      const t = k / 4;
      pts.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t + Math.sin(t * Math.PI * 2) * FLY_WOBBLE });
    }
  });
  const el = spawn(scene, 'butterfly', BUTTERFLY_SVG);
  if (Math.random() < 0.5) el.classList.add('is-gold');
  let dist = 0;
  const lens = pts.map((p, i) => (dist += i ? Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0));
  const frames = pts.map((p, i) => ({ offset: lens[i] / dist, transform: at(scene, p.x, p.y), opacity: fade(lens[i] / dist, 0.12) }));
  return play(el, frames, (dist / FLY_SPEED) * 1000, { easing: 'ease-in-out' });
}

// La sombra de una nube cruza despacio lo que se ve del tramo.
export function cloudShadow(scene) {
  const { view } = scene;
  if (view.bottom - view.top < scene.w / 2) return null;
  const y = between([view.top + (view.bottom - view.top) * 0.25, view.top + (view.bottom - view.top) * 0.75]);
  const right = Math.random() < 0.5;
  const el = spawn(scene, 'cloud', '');
  const xs = right ? [-scene.w * 0.5, scene.w * 1.5] : [scene.w * 1.5, -scene.w * 0.5];
  const drift = between([-30, 30]);
  const frames = [
    { offset: 0, transform: at(scene, xs[0], y), opacity: 0 },
    { offset: 0.2, opacity: 1 },
    { offset: 0.8, opacity: 1 },
    { offset: 1, transform: at(scene, xs[1], y + drift), opacity: 0 },
  ];
  return play(el, frames, between(CLOUD_MS));
}

// Estrella fugaz: una raya de luz que cruza un trozo del cielo en un segundo.
export function shootingStar(scene) {
  const { view } = scene;
  const right = Math.random() < 0.5;
  const angle = between(METEOR_ANGLE);
  const a = { x: right ? between([20, scene.w * 0.5]) : between([scene.w * 0.5, scene.w - 20]), y: between([view.top + 20, view.top + (view.bottom - view.top) * 0.45]) };
  const rad = (angle * Math.PI) / 180;
  const b = { x: a.x + Math.cos(rad) * METEOR_RUN * (right ? 1 : -1), y: a.y + Math.sin(rad) * METEOR_RUN };
  const turn = heading(scene, a, b);
  const el = spawn(scene, 'meteor', '');
  const frames = [
    { offset: 0, transform: at(scene, a.x, a.y, { angle: turn, anchor: '-100%, -50%' }), opacity: 0 },
    { offset: 0.25, opacity: 1 },
    { offset: 1, transform: at(scene, b.x, b.y, { angle: turn, anchor: '-100%, -50%' }), opacity: 0 },
  ];
  return play(el, frames, METEOR_MS, { easing: 'ease-in' });
}
