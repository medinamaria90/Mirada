// Marco común de las pantallas principales: cabecera compacta y navegación inferior.

import { esc } from './dom.js';
import { icons, logoMark } from './icons.js';
import { tinySrc, smallSrc } from './art.js';
import { visibleStreak, todayXp, normalizeGoal } from '../engine/progress.js';
import { hasReview, reviewPending } from '../engine/review.js';

// Anillo de la meta diaria (XP de hoy / meta). size en px.
export function goalRing(done, goal, size = 30, inner = '') {
  const r = (size - 5) / 2;
  const c = 2 * Math.PI * r;
  const k = Math.max(0, Math.min(1, goal ? done / goal : 0));
  const met = k >= 1;
  return `<span class="ring ${met ? 'is-met' : ''}" style="--ring:${size}px" aria-hidden="true">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}"/>
      <circle class="ring-fill" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - k)).toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    </svg>${inner ? `<span class="ring-mark ring-inner">${inner}</span>` : met ? `<span class="ring-mark">${icons.check(Math.round(size * 0.5))}</span>` : ''}</span>`;
}

// Lo que dice la llama al tocarla, en una línea.
export function streakTip(streak, done, goal) {
  const shown = Math.min(done, goal);
  const days = streak > 1 ? `Llevas ${streak} días seguidos jugando` : streak === 1 ? 'Hoy empieza tu racha' : 'Juega hoy y empieza tu racha';
  return `${days}. El aro se llena con tu meta de hoy: ${shown} de ${goal} puntos.`;
}

// Meta y racha en una pieza: la llama dentro del aro de la meta de hoy y los días al lado. Al tocarla, su explicación.
export function streakGoalChip(streak, done, goal) {
  const shown = Math.min(done, goal);
  const unit = streak === 1 ? 'día' : 'días';
  return `<button type="button" class="chip chip-streak" data-tip="${esc(streakTip(streak, done, goal))}" aria-expanded="false" aria-label="Racha: ${streak} ${unit}. Meta de hoy: ${shown} de ${goal} puntos"><span class="chip-pill">${goalRing(done, goal, 32, icons.flame(16))}<span class="chip-stack"><span class="chip-num">${streak}</span><span class="chip-unit">${unit}</span></span></span></button>`;
}

// La pieza de meta y racha con el estado actual (para repintarla al cambiar la meta en Ajustes).
export function headerStreakChip(ctx) {
  const state = ctx.store.get();
  const today = ctx.today();
  return streakGoalChip(visibleStreak(state.progress.streak, today), todayXp(state.progress, today), normalizeGoal(state.settings.dailyGoal));
}

// Cuadro del día: botón redondo. Pendiente, un círculo con el detalle de hoy (el mismo del paso 1) y el punto de aviso; hecho,
// la miniatura del cuadro entero con ✓. `today`: lo de hoy de ui/cuadro-data.js ({ crop, labelFor… }; null mientras llega el
// calendario: solo el icono). `record`: la partida de hoy si ya está hecha (engine/cuadro-dia.js). `work`: la obra del catálogo.
// Sin importar nada del Cuadro del día: la cabecera va en todas las pantallas.
const CUADRO_HREF = '#cuadro-del-dia'; // CUADRO_ROUTE de engine/cuadro-calendar.js
export function cuadroChip(today, record, work) {
  const href = CUADRO_HREF;
  if (record && work) {
    const how = today?.labelFor ? `: ${today.labelFor(record).toLowerCase()}` : '';
    return `<a class="chip chip-cuadro is-done" href="${href}" aria-label="Cuadro del día, hecho${esc(how)}"><span class="chip-pill"><span class="chip-cuadro-img" style="background-image:url('${esc(tinySrc(work))}')"></span><span class="chip-cuadro-ok" aria-hidden="true">${icons.check(12)}</span></span></a>`;
  }
  const label = 'Cuadro del día, pendiente';
  if (!today?.crop || !work) return `<a class="chip chip-cuadro" href="${href}" aria-label="${label}"><span class="chip-pill">${icons.frames(20)}<span class="chip-dot" aria-hidden="true"></span></span></a>`;
  const [x0, y0, x1, y1] = today.crop;
  const w = x1 - x0;
  const h = y1 - y0;
  const pos = (v, size) => (size >= 1 ? 50 : (v / (1 - size)) * 100).toFixed(1);
  const bg = `background-image:url('${esc(smallSrc(work))}');background-size:${(100 / w).toFixed(1)}% ${(100 / h).toFixed(1)}%;background-position:${pos(x0, w)}% ${pos(y0, h)}%`;
  return `<a class="chip chip-cuadro" href="${href}" aria-label="${label}"><span class="chip-pill"><span class="chip-cuadro-img" style="${bg}"></span><span class="chip-dot" aria-hidden="true"></span></span></a>`;
}

// Estado del botón «Repasar»: null si aún no existe (menos de 3 cuadros vistos; nunca con candado) o { pending }.
export function reviewState(ctx) {
  if (!ctx.index) return null;
  const p = ctx.store.get().progress;
  if (!hasReview(p, ctx.index)) return null;
  return { pending: reviewPending(p, ctx.index, ctx.today()) };
}

// «Repasar»: en la cabecera de todas las pantallas, entre la racha y el Cuadro del día (la puerta de calidad lo prefirió a una
// píldora en el mapa: el mismo sitio en todas, pareja del Cuadro del día y sin tapar el camino). Botón redondo con ↻, como el
// del Cuadro del día; con algo pendiente, el punto coral (sin número).
// showDot: false cuando ya hay otro punto en la cabecera (el del Cuadro del día pendiente): un solo aviso a la vez.
export function reviewChip(review, showDot = true) {
  if (!review) return '';
  return `<a class="chip chip-review" href="#repaso" aria-label="Repasar${review.pending ? ', hay cuadros pendientes' : ''}"><span class="chip-pill">${icons.repeat(20)}<span class="chip-review-text" aria-hidden="true">Repasar</span>${review.pending && showDot ? '<span class="chip-dot" aria-hidden="true"></span>' : ''}</span></a>`;
}

// Cuadro de hoy (main.js lo sabe cuando ha llegado data/dia/index.json).
const today0 = (ctx) => (typeof ctx.cuadroToday === 'function' ? ctx.cuadroToday() : null);

export function topBar(ctx) {
  const state = ctx.store.get();
  const p = state.progress;
  const cuadroDone = Boolean(p.cuadros?.[ctx.dailyDay()]);
  return `<header class="topbar">
    <a class="brand" href="#inicio" aria-label="Sfumato, inicio">${logoMark(30)}<span>Sfumato</span></a>
    <div class="topbar-stats">
      ${headerStreakChip(ctx)}
      ${reviewChip(reviewState(ctx), cuadroDone)}
      ${cuadroChip(today0(ctx), p.cuadros?.[ctx.dailyDay()], ctx.index && today0(ctx) ? ctx.index.artwork(today0(ctx).artwork) : null)}
    </div>
  </header>`;
}

export function bottomNav(active) {
  const item = (id, href, label, icon) =>
    `<a class="nav-item" href="#${href}" ${active === id ? 'aria-current="page"' : ''}>${icon}<span>${label}</span></a>`;
  return `<nav class="bottomnav" aria-label="Secciones">
    ${item('home', 'inicio', 'Camino', icons.arch(22))}
    ${item('collection', 'coleccion', 'Colec\u00adción', icons.frames(22))}
    ${item('profile', 'perfil', 'Perfil', icons.user(22))}
  </nav>`;
}

let tipsReady = false;

export function page(ctx, active, content) {
  if (!tipsReady && typeof document !== 'undefined' && document.addEventListener) {
    installHeaderTips();
    tipsReady = true;
  }
  return `<div class="page page-${active}">${topBar(ctx)}<main class="content" id="main">${content}</main>${bottomNav(active)}</div>`;
}

// Explicación de una línea al tocar una pieza de la cabecera que no lleva a ningún sitio ([data-tip]): sale debajo y se
// cierra al tocar fuera, con Esc o al desplazarse. Se instala una vez, con la primera pantalla que lleva cabecera.
const TIP_SCROLL_PX = 24;

export function installHeaderTips(doc = document) {
  let open = null;
  const close = () => {
    if (!open) return;
    open.chip.setAttribute('aria-expanded', 'false');
    open.tip.remove();
    open = null;
  };
  doc.addEventListener('click', (ev) => {
    const chip = ev.target.closest?.('[data-tip]');
    const was = open?.chip;
    close();
    if (!chip || chip === was) return;
    const tip = doc.createElement('p');
    tip.className = 'chip-tip';
    tip.setAttribute('role', 'status');
    tip.textContent = chip.dataset.tip;
    const r = chip.getBoundingClientRect();
    tip.style.top = `${Math.round(r.bottom + 4)}px`;
    doc.body.appendChild(tip);
    const w = tip.offsetWidth;
    const vw = doc.documentElement.clientWidth;
    tip.style.left = `${Math.round(Math.min(Math.max(r.left + r.width / 2 - w / 2, 12), vw - 12 - w))}px`;
    chip.setAttribute('aria-expanded', 'true');
    open = { chip, tip, y: window.scrollY };
  });
  doc.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') close(); });
  // Solo un desplazamiento de verdad la cierra (no el ajuste de unos píxeles que hace el navegador al tocar).
  window.addEventListener('scroll', () => { if (open && Math.abs(window.scrollY - open.y) > TIP_SCROLL_PX) close(); }, { passive: true });
  window.addEventListener('hashchange', close);
}
