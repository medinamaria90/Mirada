// Visor a pantalla completa: cualquier cuadro de la app se abre en grande al pulsarlo. Ocupa toda
// la ventana de la app (dentro del iframe del artifact no hay Fullscreen API garantizada).
// Fondo oscuro neutro, cuadro entero (contain) con la imagen grande y la miniatura del atlas
// mientras carga; varios cuadros se pasan deslizando, con las flechas o con el teclado.
// Se cierra con el aspa, Esc, el botón atrás del navegador y tocando fuera del cuadro (no al
// deslizar). Sin zoom de página: para mirar detalles se amplía el cuadro dentro del visor (pellizco,
// doble toque, Ctrl+rueda o teclado + − 0; viewer-gestures.js) entre 1× y 4×; ampliado, el dedo
// desplaza el cuadro y no cambia de cuadro; al pasar de cuadro, cerrar o activar la lupa vuelve a 1×.
// Queda también la lupa (lente circular que amplía la zona bajo el dedo con la imagen grande; con la
// lupa activa, arrastrar sobre el cuadro no lo cambia; funciona a 1× y ampliar la apaga).
//
// En una pregunta sin responder (reveal: false) no dice título, autor ni año (tampoco en alt ni
// aria). Con pick, un botón «Es este» responde con el cuadro que se está viendo; cerrar no responde.

import { ensureFicha, museumLine } from './ficha-data.js';
import { esc, prefersReducedMotion } from './dom.js';
import { artFrame, isBroken } from './art.js';
import { icons } from './icons.js';
import { attachZoom } from './viewer-gestures.js';
import { formatZoom, isRest } from './viewer-zoom.js';
import { moreHtml } from './viewer-more.js';

const CLOSE = '<svg class="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18"/></svg>';
const PREV = '<svg class="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7"/></svg>';
const NEXT = '<svg class="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>';

const ZOOM_TAG_MS = 900; // el indicador «2,5×» se va solo

let current = null;

// opts: { index, works: [artwork], start, reveal = true, label (nombre accesible), title (texto
//         visible arriba, p. ej. la pregunta), pick: { label, onPick(i) } | null,
//         opener: elemento al que vuelve el foco, onChange(pos): al pasar de cuadro,
//         onClose(pos) → elemento al que volver (opcional), more(workId, opener): «Ver más» bajo cada
//         cuadro revelado (ui/viewer-more.js) }
export function openViewer(opts) {
  if (current) current.close({ silent: true });
  const { index, works, start = 0, reveal = true, pick = null } = opts;
  if (!works || !works.length) return null;
  const n = works.length;
  const label = opts.label || (reveal && n === 1 ? works[0].title : 'Cuadro en grande');
  const opener = opts.opener || document.activeElement;

  const dlg = document.createElement('dialog');
  dlg.className = `viewer${opts.title ? ' has-title' : ''}`;
  dlg.setAttribute('aria-label', label);
  dlg.innerHTML = `
    <div class="viewer-top">
      ${opts.title ? `<p class="viewer-title" aria-hidden="true">${esc(opts.title)}</p>` : '<span></span>'}
      <div class="viewer-tools">
        <button type="button" class="viewer-btn viewer-loupe" data-v="loupe" aria-pressed="false" aria-label="Lupa">${icons.loupe(24)}</button>
        <button type="button" class="viewer-btn viewer-close" data-v="close" aria-label="Cerrar">${CLOSE}</button>
      </div>
    </div>
    <div class="viewer-track" aria-live="off">${works.map((w, i) => slideHtml(index, w, i, n, reveal, i === start, Boolean(opts.more))).join('')}</div>
    <div class="viewer-bar">
      ${n > 1 ? `<div class="viewer-nav" role="group" aria-label="Cuadros">
        <button type="button" class="viewer-btn" data-v="prev" aria-label="Cuadro anterior">${PREV}</button>
        <span class="viewer-count" aria-live="polite">${start + 1} / ${n}</span>
        <button type="button" class="viewer-btn" data-v="next" aria-label="Cuadro siguiente">${NEXT}</button>
      </div>` : ''}
      ${pick ? `<button type="button" class="btn viewer-pick" data-v="pick">${esc(pick.label || 'Es este')}</button>` : ''}
    </div>
    <div class="viewer-lens" aria-hidden="true" hidden></div>
    <div class="viewer-zoom" role="status" hidden></div>`;
  document.body.appendChild(dlg);

  // Museo y ciudad bajo el cuadro, solo con la obra revelada (antes de responder delatarían al pintor).
  if (reveal) {
    ensureFicha(index).then(() => {
      dlg.querySelectorAll('.viewer-slide').forEach((el, k) => { const m = el.querySelector('.viewer-museum'); if (m) m.textContent = museumLine(works[k]); });
    });
  }
  const track = dlg.querySelector('.viewer-track');
  const slides = [...dlg.querySelectorAll('.viewer-slide')];
  const count = dlg.querySelector('.viewer-count');
  let pos = Math.max(0, Math.min(n - 1, start));

  const root = document.documentElement;
  const prevOverflow = root.style.overflow;
  root.style.overflow = 'hidden';
  root.classList.add('has-viewer');

  // Atrás del navegador (o gesto atrás) cierra el visor: entrada de historial propia, misma URL.
  // Al volver a la entrada anterior, el navegador no debe mover la página (restauraría el
  // desplazamiento guardado y taparía, p. ej., la respuesta marcada sobre la hoja de feedback). El
  // modo se guarda por entrada: se marca la actual como «manual» antes de añadir la del visor.
  let pushed = false;
  let prevRestoration = null;
  try {
    if ('scrollRestoration' in history) {
      prevRestoration = history.scrollRestoration;
      history.scrollRestoration = 'manual';
    }
    history.pushState({ miradaViewer: true }, '');
    pushed = true;
  } catch { /* sin historial: el aspa y Esc siguen funcionando */ }
  const restoreScrollMode = () => {
    if (prevRestoration == null) return;
    try { history.scrollRestoration = prevRestoration; } catch { /* nada */ }
  };

  const pickBtn = dlg.querySelector('[data-v="pick"]');
  const loupeBtn = dlg.querySelector('[data-v="loupe"]');
  const lens = dlg.querySelector('.viewer-lens');
  const indexAt = () => Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
  const settledAt = (k) => Math.abs(track.scrollLeft - k * track.clientWidth) < 2;
  // Cambio pedido con flechas o teclado: la posición queda fijada al pedirlo (no al terminar de
  // deslizar) y «Es este» no responde hasta que el cuadro ha llegado (si no, se respondería con
  // el anterior).
  let target = null;
  let targetTimer = 0;
  let lastPos = pos;
  let zoom = null; // gestos de ampliar (se enlaza más abajo)
  const settle = () => {
    target = null;
    clearTimeout(targetTimer);
    track.classList.remove('is-dragging');
  };
  const paint = () => {
    if (count) count.textContent = `${pos + 1} / ${n}`;
    const prev = dlg.querySelector('[data-v="prev"]');
    const next = dlg.querySelector('[data-v="next"]');
    if (prev) prev.disabled = pos === 0;
    if (next) next.disabled = pos === n - 1;
    slides.forEach((s, i) => {
      s.setAttribute('aria-hidden', String(i !== pos));
      if (Math.abs(i - pos) <= 1) loadBig(s);
    });
    const moving = target != null || !settledAt(pos);
    if (pickBtn) pickBtn.setAttribute('aria-disabled', String(moving));
    if (pos !== lastPos) {
      lastPos = pos;
      hideLens();
      if (zoom) zoom.reset(false);
      if (opts.onChange) opts.onChange(pos);
    }
  };
  const sync = () => {
    if (closed) return;
    if (target != null) {
      if (settledAt(target)) settle();
    } else pos = Math.max(0, Math.min(n - 1, indexAt()));
    paint();
  };
  // force: ir aunque sea el cuadro actual (al soltar un arrastre corto, el carril vuelve a su sitio).
  const goTo = (i, force = false) => {
    const k = Math.max(0, Math.min(n - 1, i));
    if (!force && k === pos && target == null) return;
    pos = k;
    target = k;
    clearTimeout(targetTimer);
    // Por si el navegador no llega a avisar del final del desplazamiento.
    targetTimer = setTimeout(() => { settle(); sync(); }, 900);
    track.scrollTo({ left: k * track.clientWidth, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    paint();
  };

  // --- Lupa ----------------------------------------------------------------------------------
  // Lente circular con la zona bajo el dedo ampliada (como mucho LOUPE_ZOOM) con la imagen grande.
  // El aumento se limita para no pasar de ≈1,2 px de pantalla por píxel de imagen (las imágenes
  // miden como mucho 1000 px): con imágenes pequeñas o cuadros grandes, menos aumento.
  let loupeOn = false;
  let lensAt = null; // { u, v } fracción del cuadro bajo la lente
  let dragging = null;
  const LOUPE_ZOOM = 2.5;
  const LOUPE_MIN = 1.6;
  const lensSize = () => (Math.min(window.innerWidth, window.innerHeight) >= 700 ? 210 : 160);
  const currentFrame = () => slides[pos]?.querySelector('.viewer-frame');
  const bigReady = () => {
    const img = slides[pos]?.querySelector('.viewer-img');
    return slides[pos]?.classList.contains('is-big') && img && img.naturalWidth ? img : null;
  };
  function zoomFor(img, frameRect) {
    const ratio = img.naturalWidth / Math.max(1, frameRect.width);
    return Math.max(LOUPE_MIN, Math.min(LOUPE_ZOOM, ratio * 1.2));
  }
  function hideLens() {
    lens.hidden = true;
    lens.classList.remove('is-on');
    if (!loupeOn) lensAt = null;
  }
  // (u, v): punto del cuadro; (px, py): dónde está el dedo (null con teclado: lente centrada en el punto).
  function showLens(u, v, px = null, py = null, pointerType = 'touch') {
    const img = bigReady();
    const frame = currentFrame();
    if (!img || !frame) return;
    const r = frame.getBoundingClientRect();
    const d = lensSize();
    const z = zoomFor(img, r);
    const fx = r.left + u * r.width;
    const fy = r.top + v * r.height;
    let cx = px ?? fx;
    let cy = py ?? fy;
    // Con el dedo, la lente va por encima para no taparla (si no cabe, por debajo); con ratón o
    // teclado, centrada en el punto.
    if (px != null && pointerType !== 'mouse') {
      const gap = d / 2 + 28;
      cy = py - gap - d / 2 >= 4 ? py - gap : py + gap;
    }
    const vw = dlg.clientWidth || window.innerWidth;
    const vh = dlg.clientHeight || window.innerHeight;
    const left = Math.max(4, Math.min(vw - d - 4, cx - d / 2));
    const top = Math.max(4, Math.min(vh - d - 4, cy - d / 2));
    lens.style.width = `${d}px`;
    lens.style.height = `${d}px`;
    lens.style.left = `${left}px`;
    lens.style.top = `${top}px`;
    lens.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
    lens.style.backgroundSize = `${r.width * z}px ${r.height * z}px`;
    lens.style.backgroundPosition = `${d / 2 - u * r.width * z}px ${d / 2 - v * r.height * z}px`;
    lens.dataset.u = u.toFixed(4);
    lens.dataset.v = v.toFixed(4);
    lens.dataset.zoom = z.toFixed(2);
    lens.hidden = false;
    lens.classList.add('is-on');
    lensAt = { u, v };
  }
  function setLoupe(on) {
    if (on && zoom) zoom.reset();
    loupeOn = on;
    dlg.classList.toggle('is-loupe', on);
    if (loupeBtn) loupeBtn.setAttribute('aria-pressed', String(on));
    dragging = null;
    lensAt = null;
    hideLens();
  }
  const pointAt = (ev) => {
    const r = currentFrame()?.getBoundingClientRect();
    if (!r || !r.width) return null;
    return { u: Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), v: Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height)) };
  };
  function onLensDown(ev) {
    if (!loupeOn || !ev.target.closest('.viewer-frame') || ev.button > 0) return;
    ev.preventDefault();
    dragging = { id: ev.pointerId, type: ev.pointerType };
    try { ev.target.closest('.viewer-frame').setPointerCapture(ev.pointerId); } catch { /* nada */ }
    const p = pointAt(ev);
    if (p) showLens(p.u, p.v, ev.clientX, ev.clientY, ev.pointerType);
  }
  function onLensMove(ev) {
    if (!dragging || ev.pointerId !== dragging.id) return;
    ev.preventDefault();
    const p = pointAt(ev);
    if (p) showLens(p.u, p.v, ev.clientX, ev.clientY, dragging.type);
  }
  function onLensUp(ev) {
    if (!dragging || ev.pointerId !== dragging.id) return;
    dragging = null;
    hideLens();
  }

  // --- Ampliar (pellizco, doble toque, rueda, teclado) ---------------------------------------------
  const zoomTag = dlg.querySelector('.viewer-zoom');
  let zoomTimer = 0;
  zoom = attachZoom(dlg, {
    track,
    current: () => {
      const s = closed ? null : slides[pos];
      return s ? { slide: s, stage: s.querySelector('.viewer-stage'), frame: s.querySelector('.viewer-frame') } : null;
    },
    loupe: () => loupeOn,
    moving: () => target != null || !settledAt(pos),
    slide: () => ({ pos, n }),
    snapTo: (k) => goTo(k, true),
    onPinch: () => setLoupe(false),
    onZoom(state) {
      clearTimeout(zoomTimer);
      if (isRest(state)) { zoomTag.hidden = true; return; }
      if (loupeOn) setLoupe(false);
      zoomTag.textContent = formatZoom(state.scale);
      zoomTag.hidden = false;
      zoomTimer = setTimeout(() => { zoomTag.hidden = true; }, ZOOM_TAG_MS);
    },
  });

  // Tocar fuera cierra, pero no si el dedo se ha movido (deslizar entre cuadros).
  let down = null;
  function onDown(ev) {
    down = { x: ev.clientX, y: ev.clientY, left: track.scrollLeft };
  }
  const wasDrag = (ev) => down && (Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > 10 || Math.abs(track.scrollLeft - down.left) > 4);

  function onClick(ev) {
    const b = ev.target.closest('[data-v]');
    if (b && !b.disabled) {
      const v = b.dataset.v;
      if (v === 'close') return close();
      if (v === 'loupe') return setLoupe(!loupeOn);
      if (v === 'prev') return goTo(pos - 1);
      if (v === 'next') return goTo(pos + 1);
      if (v === 'more') { const id = works[pos].id; return close({ silent: true, then: () => opts.more(id, opener) }); }
      if (v === 'pick') {
        if (b.getAttribute('aria-disabled') === 'true') return;
        return choose(pos);
      }
      return;
    }
    if (wasDrag(ev)) return;
    // Tocar el fondo (todo lo que no es el cuadro ni un botón) cierra.
    if (!ev.target.closest('.viewer-frame, button')) close();
  }

  function focusables() {
    return [...dlg.querySelectorAll('button')].filter((x) => !x.disabled && x.getClientRects().length);
  }

  function onKey(ev) {
    if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
    let handled = true;
    const arrows = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (ev.key === 'Escape') {
      if (loupeOn) setLoupe(false);
      else close();
    } else if (loupeOn && arrows[ev.key]) {
      // Con la lupa, las flechas mueven la lente por el cuadro.
      const [dx, dy] = arrows[ev.key];
      const at = lensAt || { u: 0.5, v: 0.5 };
      const step = ev.shiftKey ? 0.15 : 0.05;
      showLens(Math.max(0, Math.min(1, at.u + (lensAt ? dx * step : 0))), Math.max(0, Math.min(1, at.v + (lensAt ? dy * step : 0))));
    } else if (ev.key === '+' || ev.key === '=') zoom.step(1);
    else if (ev.key === '-' || ev.key === '_') zoom.step(-1);
    else if (ev.key === '0') zoom.reset();
    else if (arrows[ev.key] && zoom.pan(...arrows[ev.key])) { /* ampliado, las flechas desplazan el cuadro */ }
    else if (ev.key === 'ArrowRight') goTo(pos + 1);
    else if (ev.key === 'ArrowLeft') goTo(pos - 1);
    else if (pick && /^[1-9]$/.test(ev.key) && Number(ev.key) <= n) choose(Number(ev.key) - 1);
    else if (ev.key === 'Tab') {
      const items = focusables();
      if (items.length) {
        const i = items.indexOf(document.activeElement);
        items[(i + (ev.shiftKey ? -1 : 1) + items.length) % items.length].focus();
      }
    } else handled = false;
    if (handled) {
      ev.preventDefault();
      ev.stopPropagation();
    }
  }

  function onPop() {
    pushed = false;
    close({ fromPop: true });
  }

  function onHash() {
    // Otra pantalla: el visor ya no tiene sentido (la entrada de historial ya no es la nuestra).
    pushed = false;
    close({ silent: true });
  }

  let closed = false;
  // then: lo que se hace ya fuera del visor, con el historial de vuelta en su sitio (p. ej. abrir la página de la obra).
  function close({ fromPop = false, silent = false, then = null } = {}) {
    if (closed) return;
    closed = true;
    current = null;
    clearTimeout(targetTimer);
    clearTimeout(zoomTimer);
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('popstate', onPop);
    window.removeEventListener('hashchange', onHash);
    root.style.overflow = prevOverflow;
    root.classList.remove('has-viewer');
    try { dlg.close(); } catch { /* nada */ }
    dlg.remove();
    if (pushed && !fromPop) {
      // Ya de vuelta en la entrada anterior, se deja su modo como estaba.
      const done = () => { window.removeEventListener('popstate', done); clearTimeout(timer); setTimeout(restoreScrollMode, 0); if (then) then(); };
      const timer = setTimeout(done, 1000);
      window.addEventListener('popstate', done);
      try { history.back(); } catch { done(); }
    } else {
      setTimeout(restoreScrollMode, 0);
      if (then) then();
    }
    // onClose puede devolver el elemento al que volver (p. ej. el cuadro donde te has quedado).
    let back = opener;
    if (opts.onClose) {
      try { back = opts.onClose(pos) || opener; } catch (err) { console.error(err); }
    }
    if (!silent && back && back.isConnected) back.focus({ preventScroll: back === opener });
  }

  function choose(i) {
    const fn = pick && pick.onPick;
    close();
    if (fn) fn(i);
  }

  dlg.addEventListener('pointerdown', onDown, true);
  dlg.addEventListener('pointerdown', onLensDown);
  dlg.addEventListener('pointermove', onLensMove);
  dlg.addEventListener('pointerup', onLensUp);
  dlg.addEventListener('pointercancel', onLensUp);
  dlg.addEventListener('click', onClick);
  // Con la lupa activa, la imagen no se arrastra (ratón) ni abre menús (pulsación larga).
  dlg.addEventListener('dragstart', (ev) => ev.preventDefault());
  dlg.addEventListener('contextmenu', (ev) => { if (loupeOn && ev.target.closest('.viewer-frame')) ev.preventDefault(); });
  dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); close(); });
  track.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('popstate', onPop);
  window.addEventListener('hashchange', onHash);

  try { dlg.showModal(); } catch { dlg.setAttribute('open', ''); }
  // Posición inicial sin animación.
  track.scrollLeft = pos * track.clientWidth;
  sync();
  const first = dlg.querySelector('[data-v="pick"]') || dlg.querySelector('[data-v="close"]');
  first.focus({ preventScroll: true });

  current = { close, dialog: dlg, get pos() { return pos; }, goTo, setLoupe, get loupe() { return loupeOn; }, get zoom() { return zoom.scale; } };
  return current;
}

function slideHtml(index, w, i, n, reveal, eager, more) {
  const a = index.artist(w.artistId);
  // Autor de la obra: el del pintor o, en una parada conjunta (los Lorenzetti), el suyo propio (`by`).
  const who = w.by || a?.name;
  const caption = reveal ? [who, w.year].filter(Boolean).join(' · ') : '';
  const alt = reveal ? `${w.title}${who ? `, de ${who}` : ''}` : '';
  const slideLabel = n > 1 ? `${i + 1} de ${n}` : (reveal ? w.title : 'Cuadro');
  const broken = isBroken(w.id);
  // Miniatura del atlas debajo (ya está en caché) y la imagen grande encima cuando carga.
  const thumb = artFrame(w, { thumb: true, cls: 'viewer-thumb', alt: '', label: reveal ? w.title : '' });
  const big = broken ? '' : `<img class="viewer-img" data-src="${esc(w.img)}" alt="${esc(alt)}" width="${w.w || 4}" height="${w.h || 3}" decoding="async"${eager ? ` src="${esc(w.img)}"` : ''}>`;
  return `<figure class="viewer-slide" role="group" aria-roledescription="cuadro" aria-label="${esc(slideLabel)}">
      <div class="viewer-stage"><div class="viewer-frame" style="--arw:${Math.max(1, w.w || 4)};--arh:${Math.max(1, w.h || 3)}">${thumb}${big}</div></div>
      ${reveal ? `<figcaption class="viewer-caption"><span class="viewer-name">${esc(w.title)}</span><span class="viewer-meta">${esc(caption)}</span><span class="viewer-museum">${esc(museumLine(w))}</span>${more ? moreHtml(w) : ''}</figcaption>` : ''}
    </figure>`;
}

function loadBig(slide) {
  const img = slide.querySelector('.viewer-img');
  if (!img || img.dataset.bound) return;
  img.dataset.bound = '1';
  const done = () => slide.classList.add('is-big');
  img.addEventListener('load', done, { once: true });
  img.addEventListener('error', () => img.remove(), { once: true });
  if (!img.getAttribute('src')) img.setAttribute('src', img.dataset.src);
  if (img.complete && img.naturalWidth) done();
}

// Delegación global: cualquier elemento con data-zoom="<id de obra>" abre el visor (con pie).
// data-zoom-group agrupa los cuadros de una misma pantalla para pasarlos deslizando.
export function zoomFromElement(index, el, { more = null } = {}) {
  const id = el.dataset.zoom;
  const group = el.dataset.zoomGroup;
  const scope = el.closest('dialog') || document;
  const els = group ? [...scope.querySelectorAll(`[data-zoom-group="${CSS.escape(group)}"]`)] : [el];
  const works = els.map((x) => index.artwork(x.dataset.zoom)).filter(Boolean);
  const start = Math.max(0, works.findIndex((w) => w.id === id));
  // Al cerrar, el foco (y la pantalla) vuelven al cuadro donde te has quedado.
  const onClose = (pos) => {
    const back = els[pos];
    if (!back || back === el || !back.isConnected) return el;
    back.scrollIntoView({ block: 'center', behavior: 'auto' });
    return back;
  };
  return openViewer({ index, works, start, reveal: true, opener: el, onClose, more: el.dataset.zoomMore ? more : null });
}
