// Desplazamiento rápido del mapa (como el de los contactos o el de Google Fotos): un carril fino en el borde derecho con
// una marca por época (o por tramo, en las ramas), el asa de «estás aquí» y un punto en tu parada. Aparece al desplazar
// el mapa y se esconde a los pocos segundos; al arrastrar el asa (o mantener pulsada una marca) el carril se ensancha,
// sale una burbuja con la época que pasa por el centro de la pantalla y el mapa va detrás en tiempo real; al soltar, se
// queda ahí. Un toque en una marca lleva a la puerta de su época. Con lector de pantalla o teclado, las marcas son una
// lista de botones (una sola parada de tabulador; las flechas pasan de una a otra).
// Oculto no cuesta nada: ni bucles ni medidas, solo una escucha pasiva del desplazamiento que lo enciende.
// items(): las épocas del mapa en el orden del camino, [{ id, label, sub, thumb, tint, top, bottom, focusEl }], con top y
// bottom en coordenadas del documento, tint (el suelo de la época, para su puntito) y focusEl(), lo que recibe el foco al ir con teclado (las mide el que lo monta: screens/map-scrubber-items.js).

import { esc, prefersReducedMotion } from './dom.js';
import { loadCss } from './lazy-css.js';

export const MIN_SCREENS = 2.5;   // solo en mapas de más de dos pantallas y media
export const HIDE_MS = 1800;      // se esconde tras este rato sin desplazar
export const HOLD_MS = 260;       // mantener pulsada una marca empieza a arrastrar
export const DRAG_SLOP = 6;       // px que se mueve el dedo antes de contar como arrastre
export const GATE_AT = 0.82;      // al ir a una época, su puerta queda a esta altura de la pantalla
const THUMB_H = 48;               // alto del asa (zona táctil)
const BUZZ_MS = 8;                // vibración corta al cruzar de una época a otra (al arrastrar)
const ARM_EVENTS = ['touchstart', 'wheel', 'keydown', 'pointerdown'];

const clamp01 = (v) => Math.min(1, Math.max(0, v));
// Color del suelo de una época en el carril: su tinte del mapa, algo más hondo (brand.css --scrub-soil).
const soil = (it) => (it.tint ? `color-mix(in srgb, var(--map-tint-${esc(it.tint)}), var(--scrub-soil))` : 'var(--scrub-line)');

// ---------- cuentas (sin DOM) ----------

// Desplazamiento máximo de la página.
export const maxScroll = (docH, viewH) => Math.max(0, docH - viewH);
// Fracción del carril que corresponde a un desplazamiento y al revés.
export const fracOf = (scrollY, max) => (max > 0 ? clamp01(scrollY / max) : 0);
export const scrollOf = (f, max) => Math.round(clamp01(f) * max);
// Época que pasa por el centro de la pantalla con la vista en scrollY: la que contiene ese punto, o la más cercana
// (arriba del todo, «Tu museo», cuenta como la última; abajo, la salida, como la primera).
export function itemAt(items, scrollY, viewH) {
  if (!items.length) return null;
  const y = scrollY + viewH / 2;
  const inside = items.find((it) => y >= it.top && y < it.bottom);
  if (inside) return inside;
  return items.reduce((best, it) => (Math.min(Math.abs(y - it.top), Math.abs(y - it.bottom)) < Math.min(Math.abs(y - best.top), Math.abs(y - best.bottom)) ? it : best));
}
// Desplazamiento que deja la puerta de una época (el pie de su tramo: el camino sube) a GATE_AT de la pantalla.
export const gateScroll = (item, viewH, max) => Math.round(Math.min(max, Math.max(0, item.bottom - viewH * GATE_AT)));
// Marca de una época en el carril: donde el asa deja su puerta en el centro de la pantalla (al cruzarla cambia la burbuja).
export const markFrac = (item, viewH, max) => fracOf(item.bottom - viewH / 2, max);
// Carril coloreado por tramos, como una línea del tiempo: cada época, del color de su suelo, entre su marca (su puerta)
// y la de la siguiente; lo que queda bajo la primera marca, de la primera época. fracs: la marca de cada una (0 arriba).
export function trackGradient(items, fracs) {
  if (!items.length) return '';
  const stops = [];
  for (let i = items.length - 1; i >= 0; i--) {
    const from = i === items.length - 1 ? 0 : fracs[i + 1];
    const to = i === 0 ? 1 : fracs[i];
    stops.push(`${soil(items[i])} ${(from * 100).toFixed(2)}% ${(to * 100).toFixed(2)}%`);
  }
  return `linear-gradient(to bottom, ${stops.join(', ')})`;
}
// ¿Vale la pena? Solo con mapa y bastante largo.
export const worthIt = (mapH, viewH) => mapH > viewH * MIN_SCREENS;

// ---------- montaje ----------

// screen: la pantalla; map: el mapa (sin él no se monta nada); label: nombre de la lista para el lector.
// Devuelve cómo quitarlo.
export function mountScrubber(screen, { map, items, label = 'Épocas del camino', current = () => null }) {
  if (!screen || !map || typeof window === 'undefined') return () => {};
  const nav = document.createElement('nav');
  nav.className = 'scrub';
  nav.setAttribute('aria-label', label);
  nav.innerHTML = `<span class="scrub-veil" aria-hidden="true"></span><span class="scrub-band" aria-hidden="true"></span><span class="scrub-line" aria-hidden="true"></span><ol class="scrub-marks"></ol>
    <span class="scrub-here" aria-hidden="true" hidden></span>
    <span class="scrub-thumb" aria-hidden="true"><span class="scrub-grip"></span></span>
    <span class="scrub-bubble" aria-hidden="true"><span class="scrub-pic"></span><span class="scrub-words"><span class="scrub-name"></span><span class="scrub-sub"></span></span></span>`;
  const marks = nav.querySelector('.scrub-marks');
  const thumb = nav.querySelector('.scrub-thumb');
  const here = nav.querySelector('.scrub-here');
  const bubble = nav.querySelector('.scrub-bubble');
  const pic = nav.querySelector('.scrub-pic');
  const name = nav.querySelector('.scrub-name');
  const sub = nav.querySelector('.scrub-sub');
  let list = [];
  let geo = { viewH: 0, max: 0, trackTop: 0, run: 0 };
  let shown = false;
  let armed = false;
  let hover = false;
  let drag = null;       // { offset, f, moved }
  let press = null;      // marca pulsada: { button, y, timer }
  let frame = 0;
  let hideTimer = 0;
  let lastId = '';
  let built = false;
  let quietUntil = 0;    // tras un arrastre que empezó en una marca, su «click» no cuenta como toque

  const measure = () => {
    const viewH = window.innerHeight;
    const max = maxScroll(document.documentElement.scrollHeight, viewH);
    const r = nav.getBoundingClientRect();
    geo = { viewH, max, trackTop: r.top, run: Math.max(1, r.height - THUMB_H) };
    list = items();
    if (!built || marks.children.length !== list.length) build();
    const fracs = list.map((it) => markFrac(it, viewH, max));
    fracs.forEach((f, i) => { marks.children[i].style.setProperty('--at', `${(f * geo.run + THUMB_H / 2).toFixed(1)}px`); });
    nav.style.setProperty('--scrub-track', trackGradient(list, fracs));
    const cur = current();
    here.hidden = cur === null;
    if (cur !== null) here.style.setProperty('--at', `${(fracOf(cur - viewH / 2, max) * geo.run + THUMB_H / 2).toFixed(1)}px`);
  };
  // Las marcas: botones en el orden del camino (el carril las coloca de abajo arriba).
  const build = () => {
    built = true;
    marks.innerHTML = list.map((it, i) => `<li class="scrub-mark-row"><button type="button" class="scrub-mark" data-i="${i}" tabindex="${i ? -1 : 0}"${it.tint ? ` style="--dot:${soil(it)}"` : ''}><span class="sr-only">Ir a ${esc(it.label)}</span></button></li>`).join('');
  };
  const setThumb = (f) => {
    thumb.style.transform = `translateY(${(f * geo.run).toFixed(1)}px)`;
    bubble.style.transform = `translateY(${(f * geo.run).toFixed(1)}px)`;
  };
  const setBubble = (it) => {
    if (!it || it.id === lastId) return;
    // Al arrastrar, cruzar a otra época se nota en la mano (sin vibración con «reducir animaciones»).
    if (drag && lastId && !prefersReducedMotion()) navigator.vibrate?.(BUZZ_MS);
    lastId = it.id;
    name.textContent = it.label;
    sub.textContent = it.sub || '';
    pic.innerHTML = it.thumb || '';
    pic.hidden = !it.thumb;
  };
  const sync = () => {
    frame = 0;
    if (!shown) return;
    const y = window.scrollY;
    if (!drag) setThumb(fracOf(y, geo.max));
    const it = itemAt(list, y, geo.viewH);
    marks.querySelectorAll('.scrub-mark').forEach((b, i) => b.toggleAttribute('aria-current', list[i] === it));
    setBubble(it);
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(sync); };
  const hideLater = () => {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { if (!drag && !press && !hover && !nav.contains(document.activeElement)) hide(); else hideLater(); }, HIDE_MS);
  };
  const show = () => {
    if (!shown) {
      measure();
      shown = true;
      nav.classList.add('is-shown');
    }
    schedule();
    hideLater();
  };
  const hide = () => {
    shown = false;
    nav.classList.remove('is-shown');
  };
  const onScroll = () => { if (armed || drag) show(); };
  const arm = () => { armed = true; };

  // Arrastre: el asa sigue al dedo y el mapa va detrás (un desplazamiento por fotograma).
  const fracAt = (clientY, offset) => clamp01((clientY - offset - geo.trackTop - THUMB_H / 2) / geo.run);
  const startDrag = (ev, offset) => {
    show();
    drag = { offset, f: fracAt(ev.clientY, offset), moved: false, id: ev.pointerId };
    nav.classList.add('is-active');
    moveTo(drag.f);
  };
  let scrollFrame = 0;
  const moveTo = (f) => {
    drag.f = f;
    setThumb(f);
    setBubble(itemAt(list, scrollOf(f, geo.max), geo.viewH));
    if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; if (drag) window.scrollTo({ top: scrollOf(drag.f, geo.max), behavior: 'instant' }); });
  };
  const endDrag = () => {
    if (!drag) return;
    // Al soltar, se queda donde está: el último desplazamiento pendiente se aplica ya y no se recoloca nada.
    cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    window.scrollTo({ top: scrollOf(drag.f, geo.max), behavior: 'instant' });
    drag = null;
    nav.classList.remove('is-active');
    lastId = '';
    schedule();
    hideLater();
  };
  const onThumbDown = (ev) => {
    if (ev.button > 0) return;
    ev.preventDefault();
    thumb.setPointerCapture?.(ev.pointerId);
    measure();
    const r = thumb.getBoundingClientRect();
    startDrag(ev, ev.clientY - (r.top + r.height / 2));
  };
  const onMarkDown = (ev) => {
    const button = ev.target.closest?.('.scrub-mark');
    if (!button || ev.button > 0) return;
    button.setPointerCapture?.(ev.pointerId);
    measure();
    press = { button, y: ev.clientY, timer: setTimeout(() => { if (press) startDrag({ clientY: press.y, pointerId: ev.pointerId }, 0); }, HOLD_MS) };
  };
  const onMove = (ev) => {
    if (press && !drag && Math.abs(ev.clientY - press.y) > DRAG_SLOP) startDrag(ev, 0);
    if (!drag) return;
    drag.moved = true;
    moveTo(fracAt(ev.clientY, drag.offset));
  };
  const onUp = () => {
    if (press) { clearTimeout(press.timer); if (drag) quietUntil = performance.now() + HOLD_MS; }
    press = null;
    endDrag();
  };
  const go = (i, byKey) => {
    const it = list[i];
    if (!it) return;
    measure();
    window.scrollTo({ top: gateScroll(it, geo.viewH, geo.max), behavior: prefersReducedMotion() ? 'instant' : 'smooth' });
    // Con teclado, el foco pasa al mapa, a la entrada de esa época.
    if (byKey) it.focusEl?.()?.focus({ preventScroll: true });
    show();
  };
  const onClick = (ev) => {
    const button = ev.target.closest?.('.scrub-mark');
    if (!button) return;
    if (performance.now() < quietUntil) return;
    go(Number(button.dataset.i), ev.detail === 0);
  };
  // Teclado: una sola parada de tabulador; arriba es la época siguiente (el camino sube), abajo la anterior.
  const KEYS = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 };
  const onKey = (ev) => {
    const button = ev.target.closest?.('.scrub-mark');
    if (!button) return;
    const all = [...marks.querySelectorAll('.scrub-mark')];
    const at = all.indexOf(button);
    const to = ev.key === 'Home' ? 0 : ev.key === 'End' ? all.length - 1 : KEYS[ev.key] ? at + KEYS[ev.key] : -1;
    if (to < 0 || to >= all.length) return;
    ev.preventDefault();
    all.forEach((b, i) => { b.tabIndex = i === to ? 0 : -1; });
    all[to].focus();
  };
  const onFocus = () => { armed = true; show(); };
  const onResize = () => { if (shown) measure(); };
  const onEnter = () => { hover = true; };
  const onLeave = () => { hover = false; };

  thumb.addEventListener('pointerdown', onThumbDown);
  marks.addEventListener('pointerdown', onMarkDown);
  nav.addEventListener('pointermove', onMove);
  nav.addEventListener('pointerup', onUp);
  nav.addEventListener('pointercancel', onUp);
  nav.addEventListener('click', onClick);
  nav.addEventListener('keydown', onKey);
  nav.addEventListener('focusin', onFocus);
  nav.addEventListener('pointerenter', onEnter);
  nav.addEventListener('pointerleave', onLeave);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  // Solo lo enciende un desplazamiento hecho por la persona (no la recolocación del mapa al abrirse).
  ARM_EVENTS.forEach((t) => window.addEventListener(t, arm, { capture: true, passive: true }));
  map.before(nav);
  loadCss('css/mapa-rapido.css');
  list = items();
  build();

  return () => {
    clearTimeout(hideTimer);
    if (press) clearTimeout(press.timer);
    cancelAnimationFrame(frame);
    cancelAnimationFrame(scrollFrame);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    ARM_EVENTS.forEach((t) => window.removeEventListener(t, arm, true));
    nav.remove();
  };
}
