// Gestos sobre el cuadro del visor (Pointer Events sobre el escenario, que lleva touch-action: none):
//  - pellizco con dos dedos: amplía entre 1× y 4× en torno al punto medio de los dedos (y los sigue);
//  - doble toque o doble clic: 1× ↔ 2,5× centrado en el punto tocado;
//  - un dedo (o el ratón) ampliado: desplaza el cuadro sin salirse de los bordes;
//  - un dedo a 1×: desliza el carril entre cuadros (como el desplazamiento nativo, que el
//    touch-action: none ya no deja hacer al navegador); ampliado, deslizar no cambia de cuadro;
//  - un dedo hacia abajo a 1×: el cuadro baja con el dedo y, con recorrido o velocidad, cierra el visor;
//  - Ctrl+rueda (o pellizco en el trackpad): amplía; rueda sola, ampliado: desplaza.
// El teclado (+, −, 0 y flechas) lo manda el visor por la API devuelta. La aritmética y los límites
// están en viewer-zoom.js. El navegador nunca amplía la página: el escenario tiene touch-action: none
// y la rueda con Ctrl se cancela.

import { prefersReducedMotion } from './dom.js';
import {
  REST, TAP_SLOP, isRest, panBy, pinchStep, settleZoom, stepZoom, swipeTarget, toggleZoom, transformOf,
  zoomAbout, isDoubleTap, isDropClose,
} from './viewer-zoom.js';

const WHEEL_FACTOR = 0.0025; // deltaY de 100 (una muesca) ≈ ×0,78 o ×1,28
const SETTLE_MS = 260; // lo que dura la transición de vuelta (--viewer-zoom-dur en el CSS)
const KEY_PAN = 0.2; // flechas: fracción del escenario por pulsación

// opts: { track, current() → { slide, stage, frame } | null, loupe(), moving(), slide() → { pos, n },
//         snapTo(k), onZoom(state), onPinch(), onDrop() }
export function attachZoom(dlg, opts) {
  const { track } = opts;
  let state = REST;
  let painted = null; // { slide, frame } que llevan la transformación actual
  let settleTimer = 0;
  const pointers = new Map(); // pointerId → { x, y }
  let gesture = null; // { kind: 'tap' | 'swipe' | 'pan' | 'pinch' | 'none', ... }
  let lastTap = null;

  const center = (stage) => {
    const r = stage.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };
  // Caja del cuadro actual: marco en reposo (medidas de maqueta, sin transformar) y escenario.
  const boxOf = (cur) => {
    const r = cur.stage.getBoundingClientRect();
    return { w: cur.frame.offsetWidth, h: cur.frame.offsetHeight, vw: r.width, vh: r.height };
  };
  const focal = (cur, x, y) => {
    const c = center(cur.stage);
    return { x: x - c.x, y: y - c.y };
  };

  function paint(next, animated) {
    const cur = opts.current();
    if (!cur) return;
    if (painted && painted.frame !== cur.frame) clearPainted();
    clearTimeout(settleTimer);
    state = next;
    painted = { slide: cur.slide, frame: cur.frame };
    cur.frame.style.transform = transformOf(state);
    cur.frame.classList.toggle('is-settling', animated && !prefersReducedMotion());
    if (isRest(state)) {
      // El escenario deja de recortar cuando el cuadro ha vuelto a su sitio.
      const done = () => { cur.slide.classList.remove('is-zoomed'); cur.frame.classList.remove('is-settling'); };
      if (animated && !prefersReducedMotion()) settleTimer = setTimeout(done, SETTLE_MS);
      else done();
    } else cur.slide.classList.add('is-zoomed');
    opts.onZoom(state);
  }
  function clearPainted() {
    if (!painted) return;
    painted.frame.style.transform = '';
    painted.frame.classList.remove('is-settling');
    painted.slide.classList.remove('is-zoomed');
    painted = null;
  }
  function reset(animated = true) {
    if (isRest(state)) return;
    const cur = opts.current();
    if (!cur || cur.frame !== painted?.frame) {
      // El cuadro que estaba ampliado ya no es el actual: se limpia sin animar.
      clearPainted();
      state = REST;
      opts.onZoom(state);
      return;
    }
    paint(REST, animated);
  }

  const onStage = (ev) => ev.target.closest?.('.viewer-stage');
  const two = () => [...pointers.values()];
  const dist = ([a, b]) => Math.hypot(a.x - b.x, a.y - b.y);
  const mid = (cur, [a, b]) => focal(cur, (a.x + b.x) / 2, (a.y + b.y) / 2);

  function onDown(ev) {
    if (ev.button > 0 || !onStage(ev)) return;
    const cur = opts.current();
    if (!cur) return;
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pointers.size === 1) {
      if (opts.loupe()) return; // con la lupa, un dedo mueve la lente
      ev.preventDefault(); // ni selección ni arrastre de la imagen
      capture(cur.stage, ev.pointerId);
      gesture = { kind: 'tap', id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, left0: track.scrollLeft, last: { x: ev.clientX, y: ev.clientY, t: ev.timeStamp }, speed: 0 };
    } else if (pointers.size === 2) {
      if (opts.moving()) return;
      ev.preventDefault();
      capture(cur.stage, ev.pointerId);
      if (gesture?.kind === 'swipe') endSwipe(cur, 0, 0); // el carril vuelve a su sitio
      if (opts.loupe()) opts.onPinch();
      const pts = two();
      gesture = { kind: 'pinch', start: state, dist0: Math.max(1, dist(pts)), prevMid: mid(cur, pts) };
    }
  }

  function onMove(ev) {
    const p = pointers.get(ev.pointerId);
    if (!p || !gesture) return;
    p.x = ev.clientX;
    p.y = ev.clientY;
    const cur = opts.current();
    if (!cur) return;
    if (gesture.kind === 'pinch') {
      if (pointers.size < 2) return;
      const pts = two();
      const m = mid(cur, pts);
      paint(pinchStep(state, gesture.start, dist(pts) / gesture.dist0, m, gesture.prevMid, boxOf(cur)), false);
      gesture.prevMid = m;
      return;
    }
    if (ev.pointerId !== gesture.id) return;
    const dx = ev.clientX - gesture.x0;
    const dy = ev.clientY - gesture.y0;
    if (gesture.kind === 'tap') {
      if (Math.hypot(dx, dy) <= TAP_SLOP) return;
      if (!isRest(state)) gesture.kind = 'pan';
      else if (Math.abs(dx) > Math.abs(dy) && !opts.moving() && opts.slide().n > 1) {
        gesture.kind = 'swipe';
        gesture.pos0 = Math.round(gesture.left0 / Math.max(1, track.clientWidth));
        track.classList.add('is-dragging');
      } else if (dy > Math.abs(dx) && !opts.moving()) gesture.kind = 'drop';
      else gesture.kind = 'none';
    }
    if (gesture.kind === 'drop') cur.frame.style.transform = `translateY(${Math.max(0, dy)}px)`;
    if (gesture.kind === 'pan') paint(panBy(state, ev.clientX - gesture.last.x, ev.clientY - gesture.last.y, boxOf(cur)), false);
    else if (gesture.kind === 'swipe') track.scrollLeft = gesture.left0 - dx;
    const dt = ev.timeStamp - gesture.last.t;
    if (dt > 0) {
      gesture.speed = (ev.clientX - gesture.last.x) / dt;
      gesture.speedY = (ev.clientY - gesture.last.y) / dt;
    }
    gesture.last = { x: ev.clientX, y: ev.clientY, t: ev.timeStamp };
  }

  function endSwipe(cur, dx, speed) {
    const { n } = opts.slide();
    opts.snapTo(swipeTarget(gesture.pos0, n, dx, Math.max(1, track.clientWidth), speed));
  }

  function onUp(ev) {
    if (!pointers.delete(ev.pointerId) || !gesture) return;
    const cur = opts.current();
    if (gesture.kind === 'pinch') {
      if (pointers.size >= 1) {
        // Queda un dedo: sigue desplazando (ampliado) o no hace nada.
        const [id, p] = [...pointers.entries()][0];
        const settled = settleZoom(state);
        if (settled !== state) paint(settled, true);
        gesture = { kind: isRest(state) ? 'none' : 'pan', id, x0: p.x, y0: p.y, left0: track.scrollLeft, last: { x: p.x, y: p.y, t: ev.timeStamp }, speed: 0 };
      } else {
        gesture = null;
        if (cur) paint(settleZoom(state), true);
      }
      return;
    }
    if (ev.pointerId !== gesture.id) return;
    const g = gesture;
    gesture = null;
    if (!cur) return;
    if (g.kind === 'tap' && ev.type === 'pointerup') {
      const tap = { x: ev.clientX, y: ev.clientY, t: ev.timeStamp };
      if (isDoubleTap(lastTap, tap)) {
        lastTap = null;
        const f = focal(cur, tap.x, tap.y);
        paint(toggleZoom(state, f.x, f.y, boxOf(cur)), true);
      } else lastTap = tap;
    } else if (g.kind === 'swipe') {
      gesture = g;
      endSwipe(cur, ev.clientX - g.x0, ev.type === 'pointerup' ? g.speed : 0);
      gesture = null;
    } else if (g.kind === 'drop') {
      const up = ev.type === 'pointerup';
      if (up && isDropClose(ev.clientY - g.y0, g.speedY || 0)) opts.onDrop();
      else paint(REST, true); // vuelve a su sitio
    }
  }

  function onWheel(ev) {
    if (!onStage(ev) || opts.moving()) return;
    const cur = opts.current();
    if (!cur) return;
    if (ev.ctrlKey || ev.metaKey) {
      ev.preventDefault();
      const f = focal(cur, ev.clientX, ev.clientY);
      paint(zoomAbout(state, state.scale * Math.exp(-ev.deltaY * WHEEL_FACTOR), f.x, f.y, boxOf(cur)), false);
    } else if (!isRest(state)) {
      ev.preventDefault();
      paint(panBy(state, -ev.deltaX, -ev.deltaY, boxOf(cur)), false);
    }
  }

  function capture(el, id) {
    try { el.setPointerCapture(id); } catch { /* sin captura, los eventos siguen llegando al diálogo */ }
  }

  dlg.addEventListener('pointerdown', onDown);
  dlg.addEventListener('pointermove', onMove);
  dlg.addEventListener('pointerup', onUp);
  dlg.addEventListener('pointercancel', onUp);
  dlg.addEventListener('wheel', onWheel, { passive: false });

  return {
    get scale() { return state.scale; },
    reset,
    // Teclado: +/− sobre el centro; flechas, ampliado, desplazan una fracción del escenario.
    step(dir) {
      const cur = opts.current();
      if (cur) paint(stepZoom(state, dir, boxOf(cur)), true);
    },
    pan(dx, dy) {
      const cur = opts.current();
      if (!cur || isRest(state)) return false;
      const box = boxOf(cur);
      paint(panBy(state, -dx * box.vw * KEY_PAN, -dy * box.vh * KEY_PAN, box), true);
      return true;
    },
  };
}
