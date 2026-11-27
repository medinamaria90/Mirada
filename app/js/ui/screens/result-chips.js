// Logros de una ronda en la pantalla de resultado: fichas pequeñas de alto fijo, una fila que no crece nunca. Cada ficha
// lleva a su sitio (perfil, medallas, la rama, la ficha del pintor). Se ven como mucho tres; si hay más, «+N» enseña el resto
// en la misma fila (se desliza de lado, la pantalla no cambia de alto).

import { esc } from '../dom.js';
import { icons } from '../icons.js';
import { medalInfo } from '../../engine/medal-info.js';
import { stageTitle } from '../../engine/painters.js';
import { branchRoute } from '../router.js';

// Fichas visibles de entrada (la tercera es «+N» cuando hay más de tres).
export const CHIPS_SHOWN = 3;

const stepRoute = (step) => (step.type === 'sala' ? `sala-${step.id}` : `etapa-${step.id}`);

// Fichas de una ronda, por orden de importancia: lo que abre o cierra algo (nivel, rama, movimiento) antes que la meta, la
// racha, el rango y las medallas. Datos sin HTML: [{ key, icon, tone ('brand' | 'gold' | 'ok'), title, sub, label?, to }].
// r: { events, otherMedals, branch: { branch, mastered, total, done } | null }
export function roundChips(index, r) {
  const { events, otherMedals = [], branch = null } = r;
  const find = (type) => events.find((e) => e.type === type);
  const out = [];
  const deep = find('deep-mastered');
  const artist = deep ? index.artist(deep.artistId) : null;
  const stage = artist ? index.deepLevels(artist.id).find((l) => l.id === deep.level) : null;
  if (stage) out.push({ key: 'deep', icon: 'check', tone: 'gold', title: stageTitle(artist, stage), sub: 'Nivel superado', to: `pintor-${artist.id}` });
  if (branch) {
    out.push({ key: 'branch', icon: 'fork', tone: 'brand', title: branch.branch.name, sub: branch.done ? 'Rama completa' : `Rama · ${branch.mastered}/${branch.total}`, to: branchRoute(branch.branch.id) });
  }
  const completed = find('movement-complete');
  const done = completed && index.movement(completed.movementId);
  if (done) out.push({ key: 'movement', icon: 'laurel', tone: 'gold', title: done.name, sub: 'Completo', to: 'medallas' });
  // Solo cuando se abre otro movimiento: la parada siguiente del mismo tramo ya la enseña el mapa al volver.
  const unlock = find('unlock');
  const opened = unlock?.movementId && index.movement(unlock.movementId);
  if (opened && !find('goal')) out.push({ key: 'unlock', icon: 'play', tone: 'brand', title: opened.name, sub: 'Se abre', to: stepRoute(unlock.step) });
  if (find('goal')) out.push({ key: 'goal', icon: 'check', tone: 'ok', title: 'Meta', sub: 'Cumplida', to: 'perfil' });
  const streak = find('streak');
  if (streak) out.push({ key: 'streak', icon: 'flame', tone: 'brand', title: streak.value === 1 ? '1 día' : `${streak.value} días`, sub: streak.grace ? 'Racha a salvo' : 'Racha', to: 'perfil' });
  const rank = find('rank');
  if (rank) out.push({ key: 'rank', icon: 'gem', tone: 'gold', title: rank.name, sub: 'Rango', to: 'perfil' });
  // El nombre de la medalla suele ser largo: la ficha dice «Medalla · Nueva» y el nombre va en su etiqueta. Varias, en una
  // sola ficha («2 medallas · Nuevas»): fichas iguales en fila no dicen nada.
  if (otherMedals.length === 1) {
    const [m] = otherMedals;
    out.push({ key: `medal-${m.id}`, icon: 'medal', tone: 'gold', title: 'Medalla', sub: 'Nueva', label: `Medalla nueva: ${medalInfo(m.id, index).title}`, to: 'medallas' });
  } else if (otherMedals.length > 1) {
    const names = otherMedals.map((m) => medalInfo(m.id, index).title).join(', ');
    out.push({ key: 'medals', icon: 'medal', tone: 'gold', title: `${otherMedals.length} medallas`, sub: 'Nuevas', label: `${otherMedals.length} medallas nuevas: ${names}`, to: 'medallas' });
  }
  const review = find('review-unlock');
  const reviewed = review && !find('goal') && index.movement(review.movementId);
  if (reviewed) out.push({ key: 'review', icon: 'repeat', tone: 'brand', title: reviewed.name, sub: 'Prueba de época', to: `repaso-${review.movementId}` });
  return out;
}

const chipHtml = (c, hidden) => `<button type="button" class="res-chip" data-action="go" data-to="${esc(c.to)}" data-chip="${esc(c.key)}"${c.label ? ` aria-label="${esc(c.label)}"` : ''}${hidden ? ' hidden' : ''}>
    <span class="res-chip-ic is-${c.tone}" aria-hidden="true">${icons[c.icon](18)}</span><span class="res-chip-t"><strong>${esc(c.title)}</strong><small>${esc(c.sub)}</small></span></button>`;

// Fila de fichas: con más de tres, las dos primeras y «+N» (que enseña las demás, ocultas hasta entonces).
export function chipsHtml(chips) {
  if (!chips.length) return '';
  const fold = chips.length > CHIPS_SHOWN;
  const shown = fold ? CHIPS_SHOWN - 1 : chips.length;
  const more = chips.length - shown;
  return `<div class="res-chips" role="group" aria-label="Logros">${chips.map((c, i) => chipHtml(c, i >= shown)).join('')}${
    fold ? `<button type="button" class="res-chip res-chip-more" data-chips="more" aria-label="Ver ${more} más"><strong>+${more}</strong></button>` : ''}</div>`;
}

// «+N»: enseña las fichas ocultas en la misma fila y lleva el foco (y la vista) a la primera.
export function wireChips(root) {
  const more = root.querySelector('[data-chips="more"]');
  if (!more) return;
  more.addEventListener('click', () => {
    const hidden = [...root.querySelectorAll('.res-chip[hidden]')];
    hidden.forEach((c) => { c.hidden = false; });
    more.remove();
    hidden[0]?.focus({ preventScroll: true });
    hidden[0]?.scrollIntoView({ inline: 'center', block: 'nearest' });
  });
}
