// Marco común de las pantallas principales: cabecera compacta y navegación inferior.

import { esc } from './dom.js';
import { icons, logoMark } from './icons.js';
import { levelFor, visibleStreak, todayXp, normalizeGoal } from '../engine/progress.js';

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

export function topBar(ctx) {
  const state = ctx.store.get();
  const p = state.progress;
  const today = ctx.today();
  const streak = visibleStreak(p.streak, today);
  const level = levelFor(p.xp);
  const goal = normalizeGoal(state.settings.dailyGoal);
  const done = todayXp(p, today);
  return `<header class="topbar">
    <a class="brand" href="#inicio" aria-label="Mirada, inicio">${logoMark(30)}<span>Mirada</span></a>
    <div class="topbar-stats">
      <a class="chip chip-goal" href="#perfil" aria-label="Meta de hoy: ${Math.min(done, goal)} de ${goal} XP"><span class="chip-pill">${goalRing(done, goal)}</span></a>
      <a class="chip" href="#perfil" aria-label="Racha: ${streak} ${streak === 1 ? 'día' : 'días'}"><span class="chip-pill">${icons.sun(18)}<span>${streak}</span></span></a>
      <a class="chip chip-level" href="#perfil" aria-label="Nivel ${esc(level.name)}, ${p.xp} puntos de experiencia">
        <span class="chip-pill">${icons.gem(18)}<span class="chip-level-text"><span class="chip-level-name">${esc(level.name)}</span><span class="minibar" aria-hidden="true"><span style="width:${Math.round(level.progress * 100)}%"></span></span></span></span>
      </a>
    </div>
  </header>`;
}

export function bottomNav(active) {
  const item = (id, href, label, icon) =>
    `<a class="nav-item" href="#${href}" ${active === id ? 'aria-current="page"' : ''}>${icon}<span>${label}</span></a>`;
  return `<nav class="bottomnav" aria-label="Secciones">
    ${item('home', 'inicio', 'Camino', icons.home(22))}
    ${item('collection', 'coleccion', 'Colección', icons.frames(22))}
    ${item('profile', 'perfil', 'Perfil', icons.user(22))}
  </nav>`;
}

export function page(ctx, active, content) {
  return `<div class="page page-${active}">${topBar(ctx)}<main class="content" id="main">${content}</main>${bottomNav(active)}</div>`;
}
