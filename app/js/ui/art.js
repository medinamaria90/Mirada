// Cuadros: imagen con marcador de carga, tamaño reservado y alternativa digna si falla.

import { esc } from './dom.js';
import { focusOf } from '../engine/framing.js';

const broken = new Set();
const errorHandlers = new Set();

export function isBroken(id) {
  return broken.has(id);
}

export function onArtworkError(fn) {
  errorHandlers.add(fn);
  return () => errorHandlers.delete(fn);
}

// Ruta de la imagen: hoja del atlas (o miniatura suelta) donde el cuadro se pinta pequeño;
// original si no.
export function artSrc(artwork, thumb = false) {
  return (thumb && artwork.thumb && artwork.thumb.src) || artwork.img;
}

// Miniatura suelta de un cuadro (img/t/<id>.jpg, lado mayor 240 px, ~10 KB: la pinta tools/make_atlas.py): para las listas
// que enseñan pocos cuadros dispersos, donde pedir una hoja entera del atlas (~200 KB) por cada uno pesa megas.
export const tinySrc = (artwork) => `img/t/${artwork.id}.jpg`;
// Tamaños intermedios (tools/make_atlas.py): img/g (320 px: galerías y franjas, nítidas en pantallas de alta densidad) e img/m (800 px: portada).
export const smallSrc = (artwork) => `img/g/${artwork.id}.jpg`;
export const mediumSrc = (artwork) => `img/m/${artwork.id}.jpg`;

// Recorte de la hoja del atlas: la miniatura se escala para cubrir el marco (como object-fit:
// cover) con unidades de contenedor en CSS (.art-sheet). Se recorta 1 px por lado para que no
// asome nada de la celda vecina.
function sheetVars(t) {
  return `--tx:${t.x + 1};--ty:${t.y + 1};--tw:${Math.max(1, t.w - 2)};--th:${Math.max(1, t.h - 2)};--sw:${t.sw};--sh:${t.sh}`;
}

// Marca pequeña de «se puede ver en grande» (esquina del cuadro). Decorativa.
export const ZOOM_BADGE = '<span class="zoom-badge" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></span>';

// opts: { alt, cls, eager, label, thumb, tiny, small, zoom, defer }
// small: el tamaño de galería (smallSrc, 320 px) en lugar de la miniatura de 240 px.
// tiny: miniatura suelta (tinySrc) en lugar de la hoja del atlas; el cuadro entero, recortado por CSS como cualquier imagen.
// defer: la imagen se pide cuando se acerca a la pantalla (ui/lazy-img.js), no antes: en las listas largas con miniaturas
//   dispersas, cada una trae una hoja entera del atlas y pedirlas todas de golpe pesa megas.
// alt vacío: imagen decorativa (el texto va en el botón o la tarjeta que la contiene).
// zoom: el cuadro es un botón que lo abre en el visor a pantalla completa (ui/viewer.js):
//   { group?, label?, more? } usa la delegación global (data-zoom; con pie de título · autor · año; more: con su dato
//   curioso y «Ver más», que abre la página de la obra: ui/viewer-more.js);
//   { action, label } deja la acción a la pantalla (p. ej. en las preguntas, sin revelar nada).
export function artFrame(artwork, opts = {}) {
  if (!artwork) return '';
  const w = Math.max(1, artwork.w || 4);
  const h = Math.max(1, artwork.h || 3);
  const failed = broken.has(artwork.id);
  const label = opts.label ?? artwork.id;
  const t = opts.thumb && !opts.tiny && !opts.small ? artwork.thumb : null;
  const sheet = t && Number.isFinite(t.x) && t.sw > 0 && t.sh > 0;
  // Donde el cuadro se recorta (casillas, miniaturas cuadradas), el recorte se centra en su foco revisado si lo tiene.
  const f = focusOf(artwork);
  const style = `--arw:${w};--arh:${h}${f ? `;--fx:${f[0]};--fy:${f[1]}` : ''}${sheet ? `;${sheetVars(t)}` : ''}`;
  const size = sheet ? `width="${t.sw}" height="${t.sh}"` : `width="${w}" height="${h}"`;
  const z = opts.zoom;
  const tag = z ? 'button' : 'span';
  const zoomAttrs = !z ? '' : ` type="button" aria-label="${esc(z.label || `Ver en grande: ${artwork.title}`)}"${
    z.action ? ` data-action="${esc(z.action)}"` : ` data-zoom="${esc(artwork.id)}"${z.group ? ` data-zoom-group="${esc(z.group)}"` : ''}${z.more ? ' data-zoom-more="1"' : ''}`}`;
  return `<${tag} class="art ${sheet ? 'art-sheet ' : ''}${z ? 'art-zoom ' : ''}${opts.cls || ''} ${failed ? 'is-broken' : ''}" style="${style}" data-art="${esc(artwork.id)}" data-label="${esc(label)}"${zoomAttrs}>${
    failed
      ? ''
      : `<img ${opts.defer ? 'data-src' : 'src'}="${esc(opts.small ? smallSrc(artwork) : opts.tiny ? tinySrc(artwork) : artSrc(artwork, opts.thumb))}" alt="${z ? '' : esc(opts.alt ?? '')}" ${size} loading="${opts.eager ? 'eager' : 'lazy'}" decoding="async"${opts.eager ? ' fetchpriority="high"' : ''}>`
  }${opts.veils || ''}${z && z.badge !== false ? ZOOM_BADGE : ''}</${tag}>`;
}

// Delegación global de carga y error (los eventos load/error no burbujean: captura).
export function installArtListeners(root) {
  root.addEventListener('load', (ev) => {
    if (ev.target.tagName === 'IMG') ev.target.closest('.art')?.classList.add('is-loaded');
  }, true);
  root.addEventListener('error', (ev) => {
    const img = ev.target;
    if (img.tagName !== 'IMG') return;
    const frame = img.closest('.art');
    if (!frame) return;
    const id = frame.dataset.art;
    broken.add(id);
    frame.classList.add('is-broken');
    img.remove();
    for (const fn of errorHandlers) {
      try {
        fn(id);
      } catch (err) {
        console.error(err);
      }
    }
  }, true);
}

// Precarga (una vez por ruta: varias obras comparten hoja del atlas).
const preloaded = new Set();
export function preload(artworks, thumb = false) {
  for (const w of artworks) {
    if (!w || broken.has(w.id)) continue;
    const src = artSrc(w, thumb);
    if (preloaded.has(src)) continue;
    preloaded.add(src);
    const img = new Image();
    img.decoding = 'async';
    img.onerror = () => { broken.add(w.id); preloaded.delete(src); };
    img.src = src;
  }
}

// Obra que representa a un pintor (miniatura del mapa, medallas, tarjeta de cierre).
export function coverOf(index, artistId) {
  const learn = index.learnWorks(artistId).slice().sort((a, b) => (b.fame || 0) - (a.fame || 0));
  return learn[0] || index.worksOf(artistId)[0] || null;
}
