// Precarga en reposo de lo que se toca después en la portada y la barra de abajo: tarjeta del pintor, hojas y carteles
// del mapa, historias, visor, Colección y Perfil, con sus hojas de estilo. Sin esto, el primer toque esperaba a la red
// (cada módulo y cada hoja, una ida y vuelta revalidada por el service worker) y la pantalla tardaba en reaccionar.
// Se pide de una en una, en ratos libres, para no competir con lo que se está pintando.

import { loadCss } from './lazy-css.js';

const MODULES = [
  () => import('./level-card.js'),
  () => import('./map-sheet.js'),
  () => import('./sign-cards.js'),
  () => import('./story-viewer.js'),
  () => import('./viewer.js'),
  () => import('./screens/collection.js'),
  () => import('./screens/profile.js'),
];
const STYLES = ['css/niveles.css', 'css/mapa-hoja.css', 'css/epocas.css', 'css/carteles.css', 'css/historias.css', 'css/deck.css', 'css/sello.css', 'css/coleccion.css'];
const IDLE_TIMEOUT_MS = 3000;

const idle = (fn) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: IDLE_TIMEOUT_MS }) : setTimeout(fn, 0));

export function warmUp() {
  const queue = [...MODULES, ...STYLES.map((href) => () => loadCss(href))];
  const next = () => {
    const job = queue.shift();
    if (!job) return;
    Promise.resolve(job()).catch((err) => console.info('Precarga omitida:', err.message)).finally(() => idle(next));
  };
  idle(next);
}
