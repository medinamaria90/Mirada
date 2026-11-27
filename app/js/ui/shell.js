// Marco común de las pantallas principales: cabecera compacta y navegación inferior.

import { esc } from './dom.js';
import { icons, logoMark } from './icons.js';
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

// Reto diario: botón redondo con el calendario; pendiente, solo el icono con un punto de aviso; hecho, «4/5».
export function dailyChip(daily) {
  if (!daily) return `<a class="chip chip-daily" href="#reto-diario" aria-label="Reto diario, pendiente"><span class="chip-pill">${icons.calendar(20)}<span class="chip-dot" aria-hidden="true"></span></span></a>`;
  return `<a class="chip chip-daily is-done" href="#reto-diario" aria-label="Reto diario, hecho: ${daily.score} de ${daily.total}"><span class="chip-pill">${icons.calendar(18)}<span class="chip-daily-text">${daily.score}/${daily.total}</span></span></a>`;
}

// Dónde va el botón «Repasar»: 'header' (cabecera, entre la racha y el reto diario) o 'map' (píldora fija en el mapa,
// simétrica a «Tu parada», screens/review-pill.js). Lo decide la puerta de calidad comparando las dos.
export const REVIEW_PLACE = 'header';

// Estado del botón «Repasar»: null si aún no existe (menos de 3 cuadros vistos; nunca con candado) o { pending }.
export function reviewState(ctx) {
  if (!ctx.index) return null;
  const p = ctx.store.get().progress;
  if (!hasReview(p, ctx.index)) return null;
  return { pending: reviewPending(p, ctx.index, ctx.today()) };
}

// «Repasar»: botón redondo con ↻, como el del reto diario; con algo pendiente, el punto coral (sin número).
export function reviewChip(review) {
  if (!review) return '';
  return `<a class="chip chip-review" href="#repaso" aria-label="Repasar${review.pending ? ', hay cuadros pendientes' : ''}"><span class="chip-pill">${icons.repeat(20)}${review.pending ? '<span class="chip-dot" aria-hidden="true"></span>' : ''}</span></a>`;
}

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
      ${REVIEW_PLACE === 'header' ? reviewChip(reviewState(ctx)) : ''}
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

export function page(ctx, active, content) {
  return `<div class="page page-${active}">${topBar(ctx)}<main class="content" id="main">${content}</main>${bottomNav(active)}</div>`;
}
