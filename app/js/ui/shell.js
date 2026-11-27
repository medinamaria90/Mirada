// Marco común de las pantallas principales: cabecera compacta y navegación inferior.

import { esc } from './dom.js';
import { icons, logoMark } from './icons.js';
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

// Cómo es la cabecera: 'merged' (B: meta y racha en un solo icono, la llama dentro del aro de la meta) o 'minimal' (A: solo
// «Repasar» y el reto diario; la meta y la racha, en el resultado y el Perfil). Lo decide la puerta de calidad.
export const HEADER_STYLE = 'merged';

// Lo que dice la llama al tocarla, en una línea.
export function streakTip(streak, done, goal) {
  const shown = Math.min(done, goal);
  const days = streak > 1 ? `Llevas ${streak} días seguidos jugando` : streak === 1 ? 'Llevas 1 día jugando' : 'Juega hoy y empieza tu racha';
  return `${days}. El aro se llena con tu meta de hoy: ${shown} de ${goal} XP.`;
}

// Meta y racha en una pieza: la llama dentro del aro de la meta de hoy y los días al lado. Al tocarla, su explicación.
export function streakGoalChip(streak, done, goal) {
  const shown = Math.min(done, goal);
  const unit = streak === 1 ? 'día' : 'días';
  return `<button type="button" class="chip chip-streak" data-tip="${esc(streakTip(streak, done, goal))}" aria-expanded="false" aria-label="Racha: ${streak} ${unit}. Meta de hoy: ${shown} de ${goal} XP"><span class="chip-pill">${goalRing(done, goal, 32, icons.flame(16))}<span class="chip-stack"><span class="chip-num">${streak}</span><span class="chip-unit">${unit}</span></span></span></button>`;
}

// La pieza de meta y racha con el estado actual (para repintarla al cambiar la meta en Ajustes).
export function headerStreakChip(ctx) {
  const state = ctx.store.get();
  const today = ctx.today();
  return streakGoalChip(visibleStreak(state.progress.streak, today), todayXp(state.progress, today), normalizeGoal(state.settings.dailyGoal));
}

// Reto diario: botón redondo con el calendario; pendiente, solo el icono con un punto de aviso; hecho, «4/5».
export function dailyChip(daily) {
  if (!daily) return `<a class="chip chip-daily" href="#reto-diario" aria-label="Reto diario, pendiente"><span class="chip-pill">${icons.calendar(20)}<span class="chip-dot" aria-hidden="true"></span></span></a>`;
  return `<a class="chip chip-daily is-done" href="#reto-diario" aria-label="Reto diario, hecho: ${daily.score} de ${daily.total}"><span class="chip-pill">${icons.calendar(18)}<span class="chip-daily-text">${daily.score}/${daily.total}</span></span></a>`;
}

// Estado del botón «Repasar»: null si aún no existe (menos de 3 cuadros vistos; nunca con candado) o { pending }.
export function reviewState(ctx) {
  if (!ctx.index) return null;
  const p = ctx.store.get().progress;
  if (!hasReview(p, ctx.index)) return null;
  return { pending: reviewPending(p, ctx.index, ctx.today()) };
}

// «Repasar»: en la cabecera de todas las pantallas, entre la racha y el reto diario (la puerta de calidad lo prefirió a una
// píldora en el mapa: el mismo sitio en todas, pareja del reto diario y sin tapar el camino). Botón redondo con ↻, como el
// del reto diario; con algo pendiente, el punto coral (sin número).
export function reviewChip(review) {
  if (!review) return '';
  return `<a class="chip chip-review" href="#repaso" aria-label="Repasar${review.pending ? ', hay cuadros pendientes' : ''}"><span class="chip-pill">${icons.repeat(20)}<span class="chip-review-text" aria-hidden="true">Repasar</span>${review.pending ? '<span class="chip-dot" aria-hidden="true"></span>' : ''}</span></a>`;
}

export function topBar(ctx) {
  const state = ctx.store.get();
  const p = state.progress;
  const today = ctx.today();
  return `<header class="topbar">
    <a class="brand" href="#inicio" aria-label="Sfumato, inicio">${logoMark(30)}<span>Sfumato</span></a>
    <div class="topbar-stats">
      ${HEADER_STYLE === 'merged' ? headerStreakChip(ctx) : ''}
      ${reviewChip(reviewState(ctx))}
      ${dailyChip(p.daily?.[ctx.dailyDay()])}
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
    open = { chip, tip };
  });
  doc.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') close(); });
  window.addEventListener('scroll', close, { passive: true });
  window.addEventListener('hashchange', close);
}
