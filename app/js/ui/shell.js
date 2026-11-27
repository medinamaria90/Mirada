// Marco común de las pantallas principales: cabecera compacta y navegación inferior.

import { esc } from './dom.js';
import { icons, logoMark } from './icons.js';
import { tinySrc, smallSrc } from './art.js';
import { cropRect, tryLabel, CUADRO_ROUTE, DETAIL_ZOOM } from '../engine/cuadro-calendar.js';
import { visibleStreak, todayXp, normalizeGoal } from '../engine/progress.js';
import { hasReview, reviewPending } from '../engine/review.js';

// Anillo de la meta diaria (XP de hoy / meta). size en px.
export function goalRing(done, goal, size = 30) {
  const r = (size - 5) / 2;
  const c = 2 * Math.PI * r;
  const k = Math.max(0, Math.min(1, goal ? done / goal : 0));
  const met = k >= 1;
  return `<span class="ring ${met ? 'is-met' : ''}" style="--ring:${size}px" aria-hidden="true">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}"/>
      <circle class="ring-fill" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - k)).toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    </svg>${met ? `<span class="ring-mark">${icons.check(Math.round(size * 0.5))}</span>` : ''}</span>`;
}

// Chip de la meta diaria: anillo con la cifra «hecho/meta» al lado. Abre el perfil.
export function goalChip(done, goal) {
  const shown = Math.min(done, goal);
  return `<a class="chip chip-goal" href="#perfil" aria-label="Meta de hoy: ${shown} de ${goal} XP"><span class="chip-pill">${goalRing(done, goal)}<span class="chip-goal-text">${shown}/${goal}</span></span></a>`;
}

// Chip de la racha: llama y «n día(s)» (el número solo, junto a un sol, parecía un interruptor de tema).
export function streakChip(streak) {
  const unit = streak === 1 ? 'día' : 'días';
  return `<a class="chip chip-streak" href="#perfil" aria-label="Racha: ${streak} ${unit}"><span class="chip-pill">${icons.flame(18)}<span class="chip-stack"><span class="chip-num">${streak}</span><span class="chip-unit">${unit}</span></span></span></a>`;
}

// Cuadro del día: botón redondo. Pendiente, un círculo con el detalle de hoy (el mismo del paso 1) y el punto de aviso; hecho,
// la miniatura del cuadro entero con ✓. `today`: { artwork, focus } de hoy (null mientras llega el calendario: solo el icono).
// `record`: la partida de hoy si ya está hecha (engine/cuadro-dia.js). `work`: la obra del catálogo.
export function cuadroChip(today, record, work) {
  const href = `#${CUADRO_ROUTE}`;
  if (record && work) {
    return `<a class="chip chip-cuadro is-done" href="${href}" aria-label="Cuadro del día, hecho: ${esc(tryLabel(record).toLowerCase())}"><span class="chip-pill"><span class="chip-cuadro-img" style="background-image:url('${esc(tinySrc(work))}')"></span><span class="chip-cuadro-ok" aria-hidden="true">${icons.check(12)}</span></span></a>`;
  }
  const label = 'Cuadro del día, pendiente';
  if (!today || !work) return `<a class="chip chip-cuadro" href="${href}" aria-label="${label}"><span class="chip-pill">${icons.frames(20)}<span class="chip-dot" aria-hidden="true"></span></span></a>`;
  const [x0, y0, x1, y1] = cropRect(work, today.focus, DETAIL_ZOOM);
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
export function reviewChip(review) {
  if (!review) return '';
  return `<a class="chip chip-review" href="#repaso" aria-label="Repasar${review.pending ? ', hay cuadros pendientes' : ''}"><span class="chip-pill">${icons.repeat(20)}${review.pending ? '<span class="chip-dot" aria-hidden="true"></span>' : ''}</span></a>`;
}

// Cuadro de hoy (main.js lo sabe cuando ha llegado data/dia/index.json).
const today0 = (ctx) => (typeof ctx.cuadroToday === 'function' ? ctx.cuadroToday() : null);

export function topBar(ctx) {
  const state = ctx.store.get();
  const p = state.progress;
  const today = ctx.today();
  const streak = visibleStreak(p.streak, today);
  const goal = normalizeGoal(state.settings.dailyGoal);
  const done = todayXp(p, today);
  return `<header class="topbar">
    <a class="brand" href="#inicio" aria-label="Sfumato, inicio">${logoMark(30)}<span>Sfumato</span></a>
    <div class="topbar-stats">
      ${goalChip(done, goal)}
      ${streakChip(streak)}
      ${reviewChip(reviewState(ctx))}
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

export function page(ctx, active, content) {
  return `<div class="page page-${active}">${topBar(ctx)}<main class="content" id="main">${content}</main>${bottomNav(active)}</div>`;
}
