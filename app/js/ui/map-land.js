// Paisajes del mapa: cada tramo pide su SVG (app/img/mapa, tools/mapa_svg.py) cuando se acerca a la pantalla y lo
// mete en la página, para que el CSS lo pinte con las variables del tema (clases k-*) y lo anime (mapa-vivo.css):
// árboles que se mecen (data-sway), agua que fluye (data-flow) y ventanas que se encienden de noche (data-lamp,
// copiadas a una capa de luces por encima del velo de la noche), estrellas de noche (map-sky.js) y lo que se mueve solo
// (agua, surtidor, aspas, humo), cada pieza en su SVG suelto. Si algo falla,
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

// Capa de luces: una copia de cada ventana o farola encima del velo de la noche, en una capa por tanda (se encienden
// en tres tandas) y las que parpadean en la suya: se funden y parpadean capas enteras, cosa de la tarjeta gráfica,
// en vez de cada luz dentro de un SVG (estilos en el hilo principal a cada fotograma).
function lampSvg(viewBox, cls, lamps) {
  const sky = document.createElementNS(SVG_NS, 'svg');
  if (cls) sky.setAttribute('class', cls);
  sky.setAttribute('viewBox', viewBox);
  sky.setAttribute('preserveAspectRatio', 'none');
  sky.setAttribute('focusable', 'false');
  sky.append(...lamps);
  return sky;
}
export function addLamps(svg, before = null) {
  const sources = Array.from(svg.querySelectorAll('[data-lamp]'));
  if (!sources.length || svg.nextElementSibling?.classList.contains('path-lamps')) return null;
  const layer = document.createElement('div');
  layer.className = `path-lamps${svg.classList.contains('is-front') ? ' is-front' : ''}`;
  layer.setAttribute('aria-hidden', 'true');
  const viewBox = svg.getAttribute('viewBox');
  const groups = Array.from({ length: LAMP_GROUPS }, () => ({ steady: [], flicker: Array.from({ length: FLICKER_PHASES }, () => []) }));
  sources.forEach((src, i) => {
    const lamp = src.cloneNode(false);
    lamp.removeAttribute('data-lamp');
    lamp.setAttribute('class', 'lamp');
    const group = groups[i % LAMP_GROUPS];
    if (i % FLICKER_EVERY === FLICKER_EVERY - 1) group.flicker[(i / FLICKER_EVERY | 0) % FLICKER_PHASES].push(lamp);
    else group.steady.push(lamp);
  });
  groups.forEach((group, g) => {
    if (!group.steady.length && !group.flicker.some((f) => f.length)) return;
    const tanda = document.createElement('div');
    tanda.className = `lamps-g lamp-${g}`;
    if (group.steady.length) tanda.append(lampSvg(viewBox, '', group.steady));
    group.flicker.forEach((lamps, phase) => { if (lamps.length) tanda.append(lampSvg(viewBox, `lamp-flicker is-${phase}`, lamps)); });
    layer.append(tanda);
  });
  svg.parentNode.insertBefore(layer, before || svg.nextSibling);
  return layer;
}

// Lo que se mueve solo en el paisaje (brillos del agua, surtidor, aspas, humo) sale del SVG del tramo a un SVG
// diminuto por pieza, en su sitio: animar una pieza dentro del SVG grande obligaba a recalcular y repintar todo el
// paisaje en cada fotograma en el hilo principal; animado el SVG suelto, lo hace la tarjeta gráfica.
const MOVERS = '[data-flow], [data-jet], [data-spin], [data-puff]';
const MOVER_ATTRS = ['data-flow', 'data-jet', 'data-spin', 'data-puff'];
const pct = (v, total) => `${((v / total) * 100).toFixed(3)}%`;
export function liftMovers(svg, { front = false } = {}) {
  const vb = svg.viewBox?.baseVal;
  const movers = Array.from(svg.querySelectorAll(MOVERS)).filter((el) => !el.closest('[transform]') && !el.parentElement.closest(MOVERS));
  if (!vb || !vb.width || !movers.length || svg.nextElementSibling?.classList.contains('path-movers')) return null;
  const box = document.createElement('div');
  box.className = `path-land path-movers${front ? ' is-front' : ''}`;
  box.setAttribute('aria-hidden', 'true');
  for (const el of movers) {
    const b = el.getBBox();
    if (!b.width && !b.height) continue;
    const bit = document.createElementNS(SVG_NS, 'svg');
    bit.setAttribute('class', 'path-bit');
    bit.setAttribute('viewBox', `${b.x} ${b.y} ${b.width || 1} ${b.height || 1}`);
    bit.setAttribute('preserveAspectRatio', 'none');
    bit.setAttribute('focusable', 'false');
    for (const name of MOVER_ATTRS) {
      if (!el.hasAttribute(name)) continue;
      bit.setAttribute(name, el.getAttribute(name));
      el.removeAttribute(name);
    }
    bit.style.left = pct(b.x - vb.x, vb.width);
    bit.style.top = pct(b.y - vb.y, vb.height);
    bit.style.width = pct(b.width || 1, vb.width);
    bit.style.height = pct(b.height || 1, vb.height);
    bit.append(el);
    box.append(bit);
  }
  if (!box.children.length) return null;
  svg.after(box);
  return box;
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
    liftMovers(svg);
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
    liftMovers(svg, { front: svg.classList.contains('is-front') });
  });
}

// El paisaje de cada tramo se pide cuando el tramo se acerca a la pantalla (nunca los nueve de golpe).
// El vigilante es uno para toda la app: los paisajes de una pantalla que ya se ha ido se dejan de vigilar (si no, cada
// uno retenía en memoria la portada entera de la que formaba parte).
let landObserver = null;
const watched = new Set();
function unwatchGone() {
  for (const img of watched) {
    if (img.isConnected) continue;
    landObserver?.unobserve(img);
    watched.delete(img);
  }
}
export function watchLandscapes(root) {
  const imgs = Array.from(root.querySelectorAll('.path-land[data-src]:not([data-watched])'));
  imgs.forEach((img) => { img.dataset.watched = '1'; });
  unwatchGone();
  if (typeof IntersectionObserver !== 'function') {
    imgs.forEach(inlineLandscape);
    return;
  }
  if (!landObserver) {
    landObserver = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        landObserver.unobserve(e.target);
        watched.delete(e.target);
        inlineLandscape(e.target);
      }
    }, { rootMargin: LANDSCAPE_MARGIN });
  }
  requestAnimationFrame(() => requestAnimationFrame(() => imgs.forEach((img) => {
    if (!img.isConnected) return;
    watched.add(img);
    landObserver.observe(img);
  })));
}
