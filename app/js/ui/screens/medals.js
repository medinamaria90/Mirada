// Medallas: insignia visual y catálogo completo para el perfil.
// Pintor: su cuadro más conocido dentro del sello. Movimiento: laurel. Racha: sol y días.

import { esc, accentStyle, cssVar } from '../dom.js';
import { icons } from '../icons.js';
import { artFrame, coverOf, isBroken, ZOOM_BADGE } from '../art.js';
import { STREAK_MEDALS, artistStatus } from '../../engine/progress.js';
import { eyeProgress } from '../../engine/goals.js';

// size: 'sm' (perfil, resultado) | 'lg' (sello de celebración)
export function medalBadge(ctx, id, animate = false, size = 'sm') {
  const { index } = ctx;
  const [kind, ...rest] = id.split('-');
  const ref = rest.join('-');
  let accent = cssVar('--medal-accent');
  let inner = icons.medal(size === 'lg' ? 34 : 22);
  let cls = '';
  if (kind === 'artist' && index.artist(ref)) {
    const a = index.artist(ref);
    accent = index.movement(a.movementId)?.accent || accent;
    const w = coverOf(index, ref);
    if (w && !isBroken(w.id)) {
      cls = 'medal-art';
      inner = artFrame(w, { cls: 'medal-thumb', alt: '', label: '', thumb: true });
    } else inner = icons.eye(size === 'lg' ? 34 : 22);
  } else if (kind === 'eye' && index.artist(ref)) {
    // Ojo de…: el ojo sobre el color del movimiento del pintor (no su cuadro: es otra medalla).
    accent = index.movement(index.artist(ref).movementId)?.accent || accent;
    cls = 'medal-eye';
    inner = icons.eye(size === 'lg' ? 40 : 26);
  } else if (kind === 'movement' && index.movement(ref)) {
    accent = index.movement(ref).accent || accent;
    inner = icons.laurel(size === 'lg' ? 40 : 26);
  } else if (kind === 'streak') {
    // Lleva un número: fondo liso y oscuro para que se lea (AA) en claro y en oscuro.
    accent = cssVar('--medal-streak');
    cls = 'medal-streak';
    inner = `<span class="medal-stack">${icons.flame(size === 'lg' ? 26 : 16)}<span class="medal-num">${esc(ref)}</span></span>`;
  } else if (kind === 'daily') {
    inner = icons.frames(size === 'lg' ? 32 : 20);
  } else if (kind === 'weekly') {
    inner = icons.calendar(size === 'lg' ? 32 : 20);
  } else if (kind === 'challenge') {
    inner = icons.duel(size === 'lg' ? 32 : 20);
  } else if (kind === 'new') {
    inner = icons.eye(size === 'lg' ? 32 : 20);
  } else if (kind === 'goal') {
    inner = icons.target(size === 'lg' ? 32 : 20);
  }
  return `<span class="medal medal-${size} ${cls} ${animate ? 'is-new' : ''}" style="${accentStyle(accent)}" aria-hidden="true"><span class="medal-inner">${inner}</span></span>`;
}

// Sello grande de la hoja de una medalla de pintor: su cuadro se puede ver en grande.
export function medalZoom(ctx, id, badge) {
  if (!id.startsWith('artist-')) return badge;
  const w = coverOf(ctx.index, id.slice(7));
  if (!w || isBroken(w.id)) return badge;
  return `<button type="button" class="medal-zoom" data-zoom="${esc(w.id)}" aria-label="Ver en grande: ${esc(w.title)}">${badge}${ZOOM_BADGE}</button>`;
}

// Todas las medallas posibles con el catálogo actual, en orden de aparición.
export function allMedalIds(index) {
  return [
    'new-1',
    ...index.path.map((a) => `artist-${a.id}`),
    ...index.visibleMovements.map((m) => `movement-${m.id}`),
    ...STREAK_MEDALS.map((n) => `streak-${n}`),
    'goal-1', 'daily-1', 'daily-perfect', 'challenge-1', 'weekly-1',
    ...index.path.map((a) => `eye-${a.id}`),
  ];
}

// Cómo se gana cada medalla (hoja de detalle del perfil). Frases cortas.
export function medalHow(id) {
  const [kind, ...rest] = id.split('-');
  const ref = rest.join('-');
  if (kind === 'artist') return 'Domina su etapa del camino';
  if (kind === 'movement') return 'Domina todas sus paradas del camino';
  if (kind === 'streak') return `Practica ${ref} días seguidos`;
  if (kind === 'eye') return 'Acierta cada cuadro suyo en repasos de días distintos, hasta reconocerlos todos';
  if (id === 'weekly-1') return 'Juega un reto semanal';
  if (id === 'goal-1') return 'Cumple la meta del día';
  if (id === 'daily-1') return 'Juega un cuadro del día';
  if (id === 'daily-perfect') return 'Acierta un cuadro del día a la primera';
  if (id === 'challenge-1') return 'Juega un reto que te mande alguien';
  if (id === 'new-1') return 'Acierta un cuadro que no habías visto';
  return '';
}

// «Ojo de X · 3/7» para un pintor dominado (null si no aplica).
export function eyeLabel(ctx, artistId) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const a = index.artist(artistId);
  if (!a || index.pathIndex(artistId) < 0 || artistStatus(p, index, artistId) !== 'mastered') return null;
  const e = eyeProgress(p, index, artistId);
  if (!e.total) return null;
  return { text: `Ojo de ${a.short || a.name} · ${e.top}/${e.total}`, ...e };
}
