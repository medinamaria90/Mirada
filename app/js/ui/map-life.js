// Mapa vivo: la luz sigue al reloj del juego (state/game-clock.js: un día cada pocos minutos de juego; variables --day-night y --day-dusk en el mapa, que tiñen los colores
// del paisaje en mapa-vivo.css) y, si se permite el movimiento, de vez en cuando pasa algo en el tramo que se ve:
// una racha de viento mece los árboles, un carruaje recorre el sendero, alguien cruza un puente, una barca navega,
// unos pájaros se posan, una mariposa revolotea, pasa la sombra de una nube y, de noche, cae una estrella fugaz
// (map-critters.js, map-sky.js). Pocas cosas a la vez y con pausas largas al azar. Todo son animaciones de
// transform y opacity (CSS o Web Animations API): ningún bucle por fotograma. Se para con la pestaña oculta o al
// salir de la portada; con «Reducir animaciones» (o el ajuste del sistema), todo quieto, pero con la luz del día. Lo que
// se mueve solo (agua, molinos, estrellas, luces) se anima únicamente en el tramo que se ve (.is-seen).

import { gameLight } from '../engine/daylight.js';
import { clockMinute } from '../state/game-clock.js';
import { prefersReducedMotion } from './dom.js';
import { cartRide, crossBridge, driftLake, rowAcross, sailRiver, swim } from './map-critters.js';
import { sceneOf, visibleParts } from './map-scene.js';
import { birdVisit, butterfly, cloudShadow, shootingStar } from './map-sky.js';
import { between, pick } from './map-actor.js';

const DAYLIGHT_TICK_MS = 4 * 1000;          // la luz se recalcula a menudo: el atardecer del juego dura un par de minutos
const GUST_MS = 3600;                        // lo que dura una racha (y su animación en mapa-vivo.css)
const GUST_GAP_MS = [16000, 40000];          // entre racha y racha, al azar
const SCENE_GAP_MS = [9000, 26000];          // entre escena y escena (carruaje, puente, barca, pájaros…)
const SCENE_FIRST_MS = 5000;                 // la primera, poco después de abrir
const MAX_SCENES = 2;                        // nunca más de dos cosas pasando a la vez
const METEOR_GAP_MS = [50000, 150000];       // estrella fugaz: muy de vez en cuando
const NIGHT_AT = 0.5;                        // a partir de aquí es de noche para la vida (no hay pájaros ni mariposas)
const DEEP_NIGHT = 0.8;                      // y aquí ya se ven estrellas fugaces
const DUSK_AT = 0.5;
const STARS_AT = 0.6;                        // las estrellas asoman (mapa-vida.css: .path-stars) y titilan
const LAMPS_AT = 0.35;                       // la primera tanda de luces se enciende (mapa-vivo.css: .lamp-0)
const VISIBLE_MARGIN = '0px';
// Tramos que se vigilan: solo el que se ve se anima (.is-seen; agua, molinos, humo, estrellas, luces y aros).
const LIVE_PARTS = '.path-era, .path-start, .path-museum';

// Qué puede pasar y con qué peso, según la luz y lo que se ve del tramo.
function sceneChoices(scene, { night, dusk }) {
  const seen = visibleParts(scene);
  const day = night < NIGHT_AT;
  const water = seen.rivers.length > 0;
  const list = [
    [2, cartRide, true],
    [3, crossBridge, seen.bridges.some((b) => b.run)],
    [day ? 2 : 1, sailRiver, water],
    [1, rowAcross, water],
    [1, swim, water && day && dusk < DUSK_AT],
    [2, driftLake, seen.lakes.length > 0],
    [4, birdVisit, day && seen.trees.length > 1],
    [2, butterfly, day && dusk < DUSK_AT && seen.free.length > 2],
    [1, cloudShadow, day],
  ];
  return list.filter(([,, ok]) => ok).flatMap(([w, fn]) => Array(w).fill(fn));
}

// La luz va tramo a tramo (variables --day-night y --day-dusk en cada tramo): cambiarla en el mapa entero recalculaba
// los estilos de miles de piezas de golpe (un parón de un quinto de segundo en un móvil medio cada pocos segundos del
// atardecer). Se pone en los tramos que se ven y en el que entra en pantalla; y en pasos de LIGHT_STEP, que el ojo no
// distingue, para cambiar menos veces.
const LIGHT_STEP = 0.05;
const LIGHT_PARTS = `${LIVE_PARTS}, .path-foot`;
const stepped = (v) => (Math.round(v / LIGHT_STEP) * LIGHT_STEP).toFixed(2);
function lightPart(el, night, dusk) {
  if (el.style.getPropertyValue('--day-night') !== night) el.style.setProperty('--day-night', night);
  if (el.style.getPropertyValue('--day-dusk') !== dusk) el.style.setProperty('--day-dusk', dusk);
}

// parts: los tramos a los que poner la luz (por omisión, todos; sin tramos, el mapa entero).
export function applyDaylight(map, minute = clockMinute(), parts = null) {
  const { night, dusk } = gameLight(minute);
  const targets = parts || [...map.querySelectorAll(LIGHT_PARTS)];
  (targets.length ? targets : [map]).forEach((el) => lightPart(el, stepped(night), stepped(dusk)));
  // De día no titila lo que no se ve (estrellas, luces apagadas): sin estas clases no se animan.
  if (map.classList.contains('is-night') !== night >= STARS_AT) map.classList.toggle('is-night', night >= STARS_AT);
  if (map.classList.contains('is-lit') !== night >= LAMPS_AT) map.classList.toggle('is-lit', night >= LAMPS_AT);
  return { night, dusk };
}

// Arranca la vida del mapa; devuelve cómo pararla. clock: minuto del día de juego (las pruebas lo cambian).
export function startMapLife(map, { clock = clockMinute } = {}) {
  if (!map) return { refresh: () => {}, stop: () => {} };
  const timers = new Set();
  const visible = new Set();
  const later = (fn, ms) => {
    const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
    timers.add(t);
  };
  const alive = () => !document.hidden && !prefersReducedMotion() && !map.classList.contains('is-linear');
  // Tramos que aún no tienen luz (recién pintados) y los que se ven; los demás la reciben al entrar en pantalla.
  const litNow = () => (io ? [...map.querySelectorAll(LIGHT_PARTS)].filter((el) => el.classList.contains('is-seen') || !el.style.getPropertyValue('--day-night')) : null);
  const refresh = () => {
    applyDaylight(map, clock(), litNow());
    map.classList.toggle('is-alive', alive());
  };
  const gust = () => {
    if (alive()) {
      map.classList.add('is-gust');
      later(() => map.classList.remove('is-gust'), GUST_MS);
    }
    later(gust, between(GUST_GAP_MS));
  };
  let playing = 0;
  const shown = () => [...visible].filter((li) => li.isConnected && li.matches('.path-era') && li.querySelector('svg.path-land'));
  const run = (promise) => {
    if (!promise) return false;
    playing += 1;
    Promise.resolve(promise).finally(() => { playing -= 1; });
    return true;
  };
  const scene = () => {
    if (alive() && playing < MAX_SCENES) {
      const light = gameLight(clock());
      // Se prueba en los tramos a la vista, al azar, hasta que algo encaja.
      for (const li of shown().sort(() => Math.random() - 0.5)) {
        const sc = sceneOf(li);
        const choices = sc ? sceneChoices(sc, light) : [];
        if (choices.length && run(pick(choices)(sc))) break;
      }
    }
    later(scene, between(SCENE_GAP_MS));
  };
  const meteor = () => {
    const li = pick(shown());
    if (alive() && li && gameLight(clock()).night >= DEEP_NIGHT) {
      const sc = sceneOf(li);
      if (sc) shootingStar(sc);
    }
    later(meteor, between(METEOR_GAP_MS));
  };
  let io = null;
  const watchEras = () => {
    if (!io) return;
    map.querySelectorAll(`:is(${LIVE_PARTS}):not([data-life])`).forEach((li) => { li.dataset.life = '1'; io.observe(li); });
  };
  if (typeof IntersectionObserver === 'function') {
    io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target);
      e.target.classList.toggle('is-seen', e.isIntersecting);
      if (e.isIntersecting) applyDaylight(map, clock(), [e.target]);
    }), { rootMargin: VISIBLE_MARGIN });
  }
  refresh();
  watchEras();
  const tick = setInterval(() => { refresh(); watchEras(); }, DAYLIGHT_TICK_MS);
  const onVisibility = () => refresh();
  document.addEventListener('visibilitychange', onVisibility);
  later(gust, between(GUST_GAP_MS));
  later(scene, SCENE_FIRST_MS);
  later(meteor, between(METEOR_GAP_MS));
  return {
    refresh: () => { refresh(); watchEras(); },
    stop: () => {
      clearInterval(tick);
      timers.forEach(clearTimeout);
      timers.clear();
      io?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      map.classList.remove('is-alive', 'is-gust');
      map.querySelectorAll('.is-seen').forEach((li) => li.classList.remove('is-seen'));
      map.querySelectorAll('.map-critter').forEach((c) => c.remove());
    },
  };
}
