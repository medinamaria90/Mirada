// Cuadros: imagen con marcador de carga, tamaño reservado y alternativa digna si falla.

import { esc } from './dom.js';

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

// Recorte de la hoja del atlas: la miniatura se escala para cubrir el marco (como object-fit:
// cover) con unidades de contenedor en CSS (.art-sheet). Se recorta 1 px por lado para que no
// asome nada de la celda vecina.
function sheetVars(t) {
  return `--tx:${t.x + 1};--ty:${t.y + 1};--tw:${Math.max(1, t.w - 2)};--th:${Math.max(1, t.h - 2)};--sw:${t.sw};--sh:${t.sh}`;
}

// Marca pequeña de «se puede ver en grande» (esquina del cuadro). Decorativa.
export const ZOOM_BADGE = '<span class="zoom-badge" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></span>';

// opts: { alt, cls, eager, label, thumb, zoom }
// alt vacío: imagen decorativa (el texto va en el botón o la tarjeta que la contiene).
// zoom: el cuadro es un botón que lo abre en el visor a pantalla completa (ui/viewer.js):
//   { group?, label? } usa la delegación global (data-zoom; con pie de título · autor · año);
//   { action, label } deja la acción a la pantalla (p. ej. en las preguntas, sin revelar nada).
export function artFrame(artwork, opts = {}) {
  if (!artwork) return '';
  const w = Math.max(1, artwork.w || 4);
  const h = Math.max(1, artwork.h || 3);
  const failed = broken.has(artwork.id);
  const label = opts.label ?? artwork.id;
  const t = opts.thumb ? artwork.thumb : null;
  const sheet = t && Number.isFinite(t.x) && t.sw > 0 && t.sh > 0;
  const style = `--arw:${w};--arh:${h}${sheet ? `;${sheetVars(t)}` : ''}`;
  const size = sheet ? `width="${t.sw}" height="${t.sh}"` : `width="${w}" height="${h}"`;
  const z = opts.zoom;
  const tag = z ? 'button' : 'span';
  const zoomAttrs = !z ? '' : ` type="button" aria-label="${esc(z.label || `Ver en grande: ${artwork.title}`)}"${
    z.action ? ` data-action="${esc(z.action)}"` : ` data-zoom="${esc(artwork.id)}"${z.group ? ` data-zoom-group="${esc(z.group)}"` : ''}`}`;
  return `<${tag} class="art ${sheet ? 'art-sheet ' : ''}${z ? 'art-zoom ' : ''}${opts.cls || ''} ${failed ? 'is-broken' : ''}" style="${style}" data-art="${esc(artwork.id)}" data-label="${esc(label)}"${zoomAttrs}>${
    failed
      ? ''
      : `<img src="${esc(artSrc(artwork, opts.thumb))}" alt="${z ? '' : esc(opts.alt ?? '')}" ${size} loading="${opts.eager ? 'eager' : 'lazy'}" decoding="async"${opts.eager ? ' fetchpriority="high"' : ''}>`
  }${z ? ZOOM_BADGE : ''}</${tag}>`;
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
