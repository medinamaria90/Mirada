// Marco cuadrado del Cuadro del día (ui/screens/cuadro-dia.js y cuadro-dia-hecho.js): el cuadro recortado alrededor del detalle
// con el zoom de cada paso, o entero (contain) sobre un fondo desenfocado de sí mismo. La imagen pequeña se ve mientras llega la
// HD (la de los detalles: la de 1200 px se ve borrosa a ×3). Al tocarlo se abre en grande sin enseñar más de lo que permite el
// paso: con un detalle, una lupa a pantalla completa con ese mismo recorte; con el cuadro entero, el visor (sin título ni autor
// hasta acabar).

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
const bigSrc = (work) => (work.hd && work.hd.img) || work.img;

// El marco: dos imágenes con la misma caja (la pequeña debajo y la grande encima, que aparece al cargar) y, con el cuadro
// entero, su fondo desenfocado. `label`: nombre accesible del botón; sin él, un marco que no se pulsa (el de la lupa).
export function frameHtml(work, focus, zoom, label = '') {
  const style = boxStyle(imageBox(work, focus, zoom));
  const tag = label ? 'button' : 'div';
  const attrs = label ? ` type="button" data-action="zoom" aria-label="${esc(label)}"` : '';
  return `<${tag} class="cdd-frame${zoom > 1 ? ' is-detail' : ''}"${attrs}>
    <img class="cdd-bg" src="${esc(tinySrc(work))}" alt="" aria-hidden="true" draggable="false">
    <img class="cdd-img cdd-low" src="${esc(smallSrc(work))}" alt="" style="${style}" draggable="false">
    <img class="cdd-img cdd-hi" src="${esc(bigSrc(work))}" alt="" style="${style}" draggable="false" fetchpriority="high" decoding="async">
    ${label ? `<span class="cdd-zoom-badge" aria-hidden="true">${icons.loupe(18)}</span>` : ''}
  </${tag}>`;
}

// Mueve el marco a otro paso (el CSS anima la caja) y marca si aún es un detalle.
export function setFrame(root, work, focus, zoom) {
  const frame = root.querySelector('.cdd-frame');
  if (!frame) return;
  frame.classList.toggle('is-detail', zoom > 1);
  const style = boxStyle(imageBox(work, focus, zoom));
  frame.querySelectorAll('.cdd-img').forEach((img) => img.setAttribute('style', style));
}

// La grande aparece cuando ha cargado (si falla, se queda la pequeña).
export function wireFrame(root) {
  const hi = root.querySelector('.cdd-hi');
  if (!hi) return;
  const show = () => hi.classList.add('is-ready');
  if (hi.complete && hi.naturalWidth) show();
  else hi.addEventListener('load', show, { once: true });
}

// Abre en grande lo que se ve: con detalle (zoom > 1), la lupa con el mismo recorte; entero, el visor (reveal: ya acabado).
export function openLarge(ctx, work, focus, zoom, { reveal = false, opener = null } = {}) {
  if (zoom <= 1) {
    return import('./viewer.js').then((m) => m.openViewer({ index: ctx.index, works: [work], reveal, opener, label: reveal ? work.title : 'Cuadro del día en grande' }));
  }
  return Promise.resolve(openLoupe(work, focus, zoom, opener));
}

function openLoupe(work, focus, zoom, opener) {
  const dlg = document.createElement('dialog');
  dlg.className = 'cdd-loupe';
  dlg.setAttribute('aria-label', 'Detalle en grande');
  dlg.innerHTML = `<button type="button" class="cdd-loupe-close" data-l="close" aria-label="Cerrar">${icons.close(24)}</button>
    <div class="cdd-loupe-box">${frameHtml(work, focus, zoom)}</div>`;
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
