// Paisajes del mapa: cada tramo pide su SVG (app/img/mapa, tools/mapa_svg.py) cuando se acerca a la pantalla y lo
// mete en la página, para que el CSS lo pinte con las variables del tema (clases k-*) y lo anime (mapa-vivo.css):
// árboles que se mecen (data-sway), agua que fluye (data-flow) y ventanas que se encienden de noche (data-lamp,
// copiadas a una capa de luces por encima del velo de la noche) y estrellas de noche (map-sky.js). Si algo falla,
// el paisaje se ve como imagen.

import { addStars } from './map-sky.js';
import { MAP_W } from './screens/path-layout.js';

const LANDSCAPE_MARGIN = '240px 0px';   // se pide el paisaje al acercarse a este margen
const SVG_NS = 'http://www.w3.org/2000/svg';
const LAMP_GROUPS = 3;                  // las luces se encienden en tres tandas al anochecer
const FLICKER_EVERY = 7;                // una de cada siete parpadea de vez en cuando
const FLICKER_PHASES = 4;

// Retraso de cada árbol en la racha de viento: según su x (el viento cruza de izquierda a derecha).
export function prepareSway(svg) {
  svg.querySelectorAll('[data-sway]').forEach((g) => {
    g.style.setProperty('--sway', (Number(g.dataset.sway || 0) / MAP_W).toFixed(2));
  });
}

// Capa de luces: una copia de cada ventana o farola, en su propio SVG encima del velo de la noche.
export function addLamps(svg, before = null) {
  const sources = Array.from(svg.querySelectorAll('[data-lamp]'));
  if (!sources.length || svg.nextElementSibling?.classList.contains('path-lamps')) return null;
  const layer = document.createElementNS(SVG_NS, 'svg');
  layer.setAttribute('class', `path-lamps${svg.classList.contains('is-front') ? ' is-front' : ''}`);
  layer.setAttribute('viewBox', svg.getAttribute('viewBox'));
  layer.setAttribute('preserveAspectRatio', 'none');
  layer.setAttribute('aria-hidden', 'true');
  layer.setAttribute('focusable', 'false');
  sources.forEach((src, i) => {
    const lamp = src.cloneNode(false);
    lamp.removeAttribute('data-lamp');
    lamp.setAttribute('class', `lamp lamp-${i % LAMP_GROUPS}`);
    if (i % FLICKER_EVERY === FLICKER_EVERY - 1) {
      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('class', `lamp-flicker is-${(i / FLICKER_EVERY | 0) % FLICKER_PHASES}`);
      g.append(lamp);
      layer.append(g);
    } else {
      layer.append(lamp);
    }
  });
  svg.parentNode.insertBefore(layer, before || svg.nextSibling);
  return layer;
}

async function inlineLandscape(img) {
  const url = img.dataset.src;
  delete img.dataset.src;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    const doc = new DOMParser().parseFromString(await res.text(), 'image/svg+xml');
    const src = doc.documentElement;
    if (src.nodeName !== 'svg') throw new Error(`${url}: no es un SVG`);
    src.querySelectorAll('style, script').forEach((n) => n.remove());
    const svg = document.importNode(src, true);
    svg.setAttribute('class', 'path-land');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    prepareSway(svg);
    if (!img.isConnected) return;
    img.replaceWith(svg);
    addLamps(svg, svg.parentNode.querySelector('.stages'));
    addStars(svg);
  } catch (err) {
    // Sin red o con un archivo raro: el paisaje quieto, como imagen (con su propio tema).
    console.warn(err);
    img.src = url;
  }
}

// Los dibujos propios del mapa (puerta de salida, museo) ya están en la página: solo sus árboles y sus luces.
export function liveArt(root) {
  root.querySelectorAll('.path-start-art, .path-museum-art').forEach((svg) => {
    prepareSway(svg);
    addLamps(svg);
  });
}

// El paisaje de cada tramo se pide cuando el tramo se acerca a la pantalla (nunca los nueve de golpe).
let landObserver = null;
export function watchLandscapes(root) {
  const imgs = Array.from(root.querySelectorAll('.path-land[data-src]:not([data-watched])'));
  imgs.forEach((img) => { img.dataset.watched = '1'; });
  if (typeof IntersectionObserver !== 'function') {
    imgs.forEach(inlineLandscape);
    return;
  }
  if (!landObserver) {
    landObserver = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        landObserver.unobserve(e.target);
        inlineLandscape(e.target);
      }
    }, { rootMargin: LANDSCAPE_MARGIN });
  }
  requestAnimationFrame(() => requestAnimationFrame(() => imgs.forEach((img) => landObserver.observe(img))));
}
