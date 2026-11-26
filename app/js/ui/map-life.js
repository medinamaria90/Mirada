// Mapa vivo: la luz sigue a la hora del móvil (variables --day-night y --day-dusk en el mapa, que tiñen los colores
// del paisaje en mapa-vivo.css) y, si se permite el movimiento, de vez en cuando una racha de viento mece los árboles y un
// carruaje recorre un tramo del sendero. Todo son animaciones CSS de transform y opacity (el carruaje, con la
// Web Animations API): ningún bucle por fotograma. Se para con la pestaña oculta o al salir de la portada; con
// «Reducir animaciones» (o el ajuste del sistema), todo quieto, pero con la luz del día igualmente.

import { daylight } from '../engine/daylight.js';
import { prefersReducedMotion } from './dom.js';
import { MAP_W } from './screens/path-layout.js';

const DAYLIGHT_TICK_MS = 60 * 1000;         // la luz se recalcula cada minuto (en media hora cambia poco a poco)
const GUST_MS = 3600;                        // lo que dura una racha (y su animación en mapa-vivo.css)
const GUST_GAP_MS = [16000, 40000];          // entre racha y racha, al azar
const CART_GAP_MS = [22000, 55000];          // entre carruaje y carruaje
const CART_FIRST_MS = 6000;                  // el primero, poco después de abrir
const CART_RUN = 150;                        // unidades de sendero que recorre (ancho del mapa: 390)
const CART_SPEED = 10;                       // unidades por segundo: despacio
const CART_SAMPLES = 16;
const CART_FADE = 0.1;                       // aparece y se va fundido (fracción del recorrido)
const CART_PATH_FROM = 0.12;                 // tramo del sendero donde puede empezar (ni la entrada ni el final)
const CART_PATH_TO = 0.8;
const VISIBLE_MARGIN = '0px';

const between = ([a, b]) => a + Math.random() * (b - a);

// Carruaje visto desde arriba, mirando hacia +x (el caballo delante); simétrico, para ir en cualquier sentido.
const CART_SVG = `<svg viewBox="0 0 30 12" aria-hidden="true" focusable="false">
  <ellipse class="cart-shade" cx="14" cy="6.8" rx="14" ry="5"/>
  <rect class="cart-wheel" x="1.5" y=".6" width="5" height="2" rx="1"/><rect class="cart-wheel" x="1.5" y="9.4" width="5" height="2" rx="1"/>
  <rect class="cart-wheel" x="9.5" y=".6" width="4" height="2" rx="1"/><rect class="cart-wheel" x="9.5" y="9.4" width="4" height="2" rx="1"/>
  <rect class="cart-body" x="0" y="2" width="14" height="8" rx="2"/><rect class="cart-roof" x="1.6" y="3.2" width="9" height="5.6" rx="1.4"/>
  <path class="cart-shaft" d="M14 4.4H19M14 7.6H19"/>
  <ellipse class="cart-horse" cx="23" cy="6" rx="4.6" ry="2.2"/><circle class="cart-horse" cx="28" cy="6" r="1.5"/>
</svg>`;

export function applyDaylight(map, date = new Date()) {
  const { night, dusk } = daylight(date);
  map.style.setProperty('--day-night', String(night));
  map.style.setProperty('--day-dusk', String(dusk));
  return { night, dusk };
}

// Puntos del carruaje a lo largo del sendero de un tramo, en px de la pantalla (el SVG del sendero se estira).
function cartFrames(li, path) {
  const total = path.getTotalLength();
  const run = Math.min(CART_RUN, total * (CART_PATH_TO - CART_PATH_FROM));
  const from = total * CART_PATH_FROM + Math.random() * (total * (CART_PATH_TO - CART_PATH_FROM) - run);
  const box = li.getBoundingClientRect();
  const viewH = path.ownerSVGElement.viewBox.baseVal.height;
  const sx = box.width / MAP_W;
  const sy = box.height / viewH;
  const pts = Array.from({ length: CART_SAMPLES + 1 }, (_, i) => path.getPointAtLength(from + (run * i) / CART_SAMPLES));
  if (Math.random() < 0.5) pts.reverse();
  const frames = pts.map((p, i) => {
    const q = pts[Math.min(i + 1, pts.length - 1)];
    const o = pts[Math.max(i - 1, 0)];
    const angle = (Math.atan2((q.y - o.y) * sy, (q.x - o.x) * sx) * 180) / Math.PI;
    const t = i / CART_SAMPLES;
    return {
      offset: t, transform: `translate(${(p.x * sx).toFixed(1)}px, ${(p.y * sy).toFixed(1)}px) rotate(${angle.toFixed(1)}deg) translate(-50%, -50%)`,
      opacity: t < CART_FADE || t > 1 - CART_FADE ? 0 : 1,
    };
  });
  frames[0].opacity = 0;
  frames[frames.length - 1].opacity = 0;
  return { frames, duration: (run / CART_SPEED) * 1000 };
}

function runCart(li) {
  const path = li.querySelector('.path-trail .trail-fill:not(.is-done)');
  if (!path || typeof path.getTotalLength !== 'function' || li.querySelector('.map-cart')) return;
  const cart = document.createElement('span');
  cart.className = 'map-cart';
  cart.innerHTML = CART_SVG;
  path.ownerSVGElement.after(cart);
  const { frames, duration } = cartFrames(li, path);
  const anim = cart.animate(frames, { duration, easing: 'linear', fill: 'both' });
  anim.finished.catch(() => 'cancelado').finally(() => cart.remove());
}

// Arranca la vida del mapa; devuelve cómo pararla. now: reloj (las pruebas lo cambian).
export function startMapLife(map, { now = () => new Date() } = {}) {
  if (!map) return { refresh: () => {}, stop: () => {} };
  const timers = new Set();
  const visible = new Set();
  const later = (fn, ms) => {
    const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
    timers.add(t);
  };
  const alive = () => !document.hidden && !prefersReducedMotion() && !map.classList.contains('is-linear');
  const refresh = () => {
    applyDaylight(map, now());
    map.classList.toggle('is-alive', alive());
  };
  const gust = () => {
    if (alive()) {
      map.classList.add('is-gust');
      later(() => map.classList.remove('is-gust'), GUST_MS);
    }
    later(gust, between(GUST_GAP_MS));
  };
  const cart = () => {
    const eras = [...visible].filter((li) => li.isConnected && li.querySelector('.path-land:not(img)'));
    if (alive() && eras.length) runCart(eras[Math.floor(Math.random() * eras.length)]);
    later(cart, between(CART_GAP_MS));
  };
  let io = null;
  const watchEras = () => {
    if (!io) return;
    map.querySelectorAll('.path-era:not([data-life])').forEach((li) => { li.dataset.life = '1'; io.observe(li); });
  };
  if (typeof IntersectionObserver === 'function') {
    io = new IntersectionObserver((entries) => entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target))), { rootMargin: VISIBLE_MARGIN });
  }
  refresh();
  watchEras();
  const tick = setInterval(() => { refresh(); watchEras(); }, DAYLIGHT_TICK_MS);
  const onVisibility = () => refresh();
  document.addEventListener('visibilitychange', onVisibility);
  later(gust, between(GUST_GAP_MS));
  later(cart, CART_FIRST_MS);
  return {
    refresh: () => { refresh(); watchEras(); },
    stop: () => {
      clearInterval(tick);
      timers.forEach(clearTimeout);
      timers.clear();
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      map.classList.remove('is-alive', 'is-gust');
      map.querySelectorAll('.map-cart').forEach((c) => c.remove());
    },
  };
}
