// Mapa vivo: la luz sigue al reloj del juego (state/game-clock.js: un día cada pocos minutos de juego; variables --day-night y --day-dusk en el mapa, que tiñen los colores
// del paisaje en mapa-vivo.css) y, si se permite el movimiento, de vez en cuando pasa algo en el tramo que se ve:
// una racha de viento mece los árboles, un carruaje recorre el sendero, alguien cruza un puente, una barca navega,
// unos pájaros se posan, una mariposa revolotea, pasa la sombra de una nube y, de noche, cae una estrella fugaz
// (map-critters.js, map-sky.js). Pocas cosas a la vez y con pausas largas al azar. Todo son animaciones de
// transform y opacity (CSS o Web Animations API): ningún bucle por fotograma. Se para con la pestaña oculta o al
// salir de la portada; con «Reducir animaciones» (o el ajuste del sistema), todo quieto, pero con la luz del día.

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
const VISIBLE_MARGIN = '0px';

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

export function applyDaylight(map, minute = clockMinute()) {
  const { night, dusk } = gameLight(minute);
  // Solo si cambia (de día y de noche, casi siempre igual): así no se recalculan los estilos del mapa en balde.
  if (map.style.getPropertyValue('--day-night') !== String(night)) map.style.setProperty('--day-night', String(night));
  if (map.style.getPropertyValue('--day-dusk') !== String(dusk)) map.style.setProperty('--day-dusk', String(dusk));
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
  const refresh = () => {
    applyDaylight(map, clock());
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
  const shown = () => [...visible].filter((li) => li.isConnected && li.querySelector('svg.path-land'));
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
      map.querySelectorAll('.map-critter').forEach((c) => c.remove());
    },
  };
}
