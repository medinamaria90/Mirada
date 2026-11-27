// Marco cuadrado del Cuadro del día (ui/screens/cuadro-dia.js y cuadro-dia-hecho.js): el cuadro recortado alrededor del detalle
// con el zoom de cada paso, o entero (contain) sobre un fondo desenfocado de sí mismo. La imagen pequeña se ve mientras llega la
// HD (la de los detalles: la de 1200 px se ve borrosa a ×3). Al tocarlo se abre en grande sin enseñar más de lo que permite el
// paso: una lupa a pantalla completa con ese mismo recorte o, con el cuadro entero, entero; la firma, tapada hasta acabar.

import { esc } from './dom.js';
import { icons } from './icons.js';
import { smallSrc, tinySrc } from './art.js';
import { cropRect } from '../engine/cuadro-calendar.js';
import { guardGhostTaps } from './tap-guard.js';

const pct = (v) => `${(v * 100).toFixed(2)}%`;

// Caja de la imagen dentro del marco (en % del marco): recortada (zoom > 1) o entera y centrada (zoom 1).
export function imageBox(work, focus, zoom) {
  if (zoom > 1) {
    const [x0, y0, x1, y1] = cropRect(work, focus, zoom);
    const w = x1 - x0;
    const h = y1 - y0;
    return { left: -x0 / w, top: -y0 / h, width: 1 / w, height: 1 / h };
  }
  const ratio = work.w > 0 && work.h > 0 ? work.w / work.h : 1;
  const width = ratio >= 1 ? 1 : ratio;
  const height = ratio >= 1 ? 1 / ratio : 1;
  return { left: (1 - width) / 2, top: (1 - height) / 2, width, height };
}

const boxStyle = (b) => `left:${pct(b.left)};top:${pct(b.top)};width:${pct(b.width)};height:${pct(b.height)}`;

// Velo sobre la firma o una inscripción legible (`veil`: [x0, y0, x1, y1] de la obra), hasta acabar, en el marco y en la vista
// grande. No desenfoca lo de debajo (backdrop-filter casi no actúa junto al borde del cuadro y la firma se leía): pinta encima
// el mismo trozo sacado de la miniatura de 240 px (donde la firma ya casi no existe), desenfocado y algo ampliado alrededor del
// velo para que el borde borroso quede fuera. Un poco de margen por si el trazo se sale.
const VEIL_PAD = 0.01;
const veilRect = (veil) => [veil[0] - VEIL_PAD, veil[1] - VEIL_PAD, veil[2] + VEIL_PAD, veil[3] + VEIL_PAD].map((v) => Math.min(1, Math.max(0, v)));
function veilStyle(b, veil) {
  const [x0, y0, x1, y1] = veilRect(veil);
  return boxStyle({ left: b.left + x0 * b.width, top: b.top + y0 * b.height, width: (x1 - x0) * b.width, height: (y1 - y0) * b.height });
}
// La miniatura dentro del velo, con la caja de la obra entera (en % del velo) y ampliada desde el centro del velo.
function veilInner(veil) {
  const [x0, y0, x1, y1] = veilRect(veil);
  const w = x1 - x0;
  const h = y1 - y0;
  const origin = `${(((x0 + x1) / 2) * 100).toFixed(2)}% ${(((y0 + y1) / 2) * 100).toFixed(2)}%`;
  return `${boxStyle({ left: -x0 / w, top: -y0 / h, width: 1 / w, height: 1 / h })};transform-origin:${origin}`;
}
const veilHtml = (b, veil, work) => (veil
  ? `<span class="cdd-veil" aria-hidden="true" style="${veilStyle(b, veil)}"><img class="cdd-veil-img" src="${esc(tinySrc(work))}" alt="" style="${veilInner(veil)}" draggable="false"></span>`
  : '');
const bigSrc = (work) => (work.hd && work.hd.img) || work.img;

// El marco: dos imágenes con la misma caja (la pequeña debajo y la grande encima, que aparece al cargar) y, con el cuadro
// entero, su fondo desenfocado. `label`: nombre accesible del botón; sin él, un marco que no se pulsa (el de la lupa).
// `veil`: la firma que se tapa (mientras no se ha acabado).
export function frameHtml(work, focus, zoom, label = '', veil = null) {
  const box = imageBox(work, focus, zoom);
  const style = boxStyle(box);
  const tag = label ? 'button' : 'div';
  const attrs = label ? ` type="button" data-action="zoom" aria-label="${esc(label)}"` : '';
  return `<${tag} class="cdd-frame${zoom > 1 ? ' is-detail' : ''}"${attrs}>
    <img class="cdd-bg" src="${esc(tinySrc(work))}" alt="" aria-hidden="true" draggable="false">
    <img class="cdd-img cdd-low" src="${esc(smallSrc(work))}" alt="" style="${style}" draggable="false">
    <img class="cdd-img cdd-hi" src="${esc(bigSrc(work))}" alt="" style="${style}" draggable="false" fetchpriority="high" decoding="async">
    ${veilHtml(box, veil, work)}
    ${label ? `<span class="cdd-zoom-badge" aria-hidden="true">${icons.loupe(18)}</span>` : ''}
  </${tag}>`;
}

// Mueve el marco a otro paso (el CSS anima la caja) y marca si aún es un detalle. `veil`: la firma tapada, o null al acabar.
export function setFrame(root, work, focus, zoom, veil = null) {
  const frame = root.querySelector('.cdd-frame');
  if (!frame) return;
  frame.classList.toggle('is-detail', zoom > 1);
  const box = imageBox(work, focus, zoom);
  const style = boxStyle(box);
  frame.querySelectorAll('.cdd-img').forEach((img) => img.setAttribute('style', style));
  const old = frame.querySelector('.cdd-veil');
  if (!veil) { if (old) old.remove(); return; }
  if (old) old.setAttribute('style', veilStyle(box, veil));
  else frame.querySelector('.cdd-hi').insertAdjacentHTML('afterend', veilHtml(box, veil, work));
}

// La grande aparece cuando ha cargado (si falla, se queda la pequeña).
export function wireFrame(root) {
  const hi = root.querySelector('.cdd-hi');
  if (!hi) return;
  const show = () => hi.classList.add('is-ready');
  if (hi.complete && hi.naturalWidth) show();
  else hi.addEventListener('load', show, { once: true });
}

// Abre en grande lo que se ve. Ya acabado (reveal), el visor de la app. Antes, la lupa del juego: con el mismo recorte del
// paso o, con el cuadro entero, entero y con la firma tapada (el visor deja ampliar la imagen grande y leerla).
export function openLarge(ctx, work, focus, zoom, { reveal = false, opener = null, veil = null } = {}) {
  if (reveal) return import('./viewer.js').then((m) => m.openViewer({ index: ctx.index, works: [work], reveal, opener, label: work.title }));
  return Promise.resolve(openLoupe(work, focus, zoom, opener, veil));
}

function openLoupe(work, focus, zoom, opener, veil) {
  const dlg = document.createElement('dialog');
  dlg.className = 'cdd-loupe';
  dlg.setAttribute('aria-label', zoom > 1 ? 'Detalle en grande' : 'Cuadro en grande');
  dlg.innerHTML = `<button type="button" class="cdd-loupe-close" data-l="close" aria-label="Cerrar">${icons.close(24)}</button>
    <div class="cdd-loupe-box">${frameHtml(work, focus, zoom, '', veil)}</div>`;
  document.body.appendChild(dlg);
  wireFrame(dlg);
  let pushed = false;
  try { history.pushState({ cddLoupe: true }, ''); pushed = true; } catch { /* sin historial: la X y Esc bastan */ }
  let closed = false;
  const onPop = () => close(true);
  function close(fromPop = false) {
    if (closed) return;
    closed = true;
    window.removeEventListener('popstate', onPop);
    if (dlg.open) dlg.close();
    dlg.remove();
    guardGhostTaps();
    if (pushed && !fromPop) history.back();
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
  }
  window.addEventListener('popstate', onPop);
  dlg.addEventListener('click', () => close());
  dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); close(); });
  try { dlg.showModal(); } catch { dlg.setAttribute('open', ''); }
  dlg.querySelector('[data-l="close"]').focus();
  return { close };
}
