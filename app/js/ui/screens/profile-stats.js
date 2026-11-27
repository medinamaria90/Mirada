// Cuatro cifras del perfil en fichas de 2 × 2, todas pulsables: racha (abre su logro siguiente), pintores
// dominados (Colección › Pintores), cuadros vistos (Colección) y épocas completas (el camino).

import { esc } from '../dom.js';
import { icons } from '../icons.js';
import { collectionIds } from '../../engine/profile.js';
import { visibleStreak, STREAK_MEDALS } from '../../engine/progress.js';

const BRUSH = '<svg class="icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M19.5 3.5 10 13l1 1 9.5-9.5a1.4 1.4 0 0 0-1-2Z"/><path d="M9.6 13.4c-2.1-.4-3.9 1-4 3.1-.1 1.5-1 2.4-2.1 2.9 3.2 1.4 7.3.6 7.9-2.6"/></svg>';
const COLUMNS = '<svg class="icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3.5 9 12 4l8.5 5z"/><path d="M5.5 10v7.5M9.8 10v7.5M14.2 10v7.5M18.5 10v7.5M3.5 20.5h17"/></svg>';

// Cifras del perfil (sin DOM): { streak, painters, works, eras, erasTotal }.
export function profileStats(ctx) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const movements = index.visibleMovements;
  return {
    streak: visibleStreak(p.streak || {}, ctx.today()),
    painters: Object.keys(p.artists || {}).filter((id) => p.artists[id]?.mastered && index.artist(id)).length,
    works: collectionIds(p, index).length,
    eras: movements.filter((m) => p.medals?.[`movement-${m.id}`]).length,
    erasTotal: movements.length,
  };
}

// Logro de racha que toca ahora (el primero sin conseguir; con todos, el más alto).
function streakMedal(p) {
  const n = STREAK_MEDALS.find((d) => !p.medals?.[`streak-${d}`]) ?? STREAK_MEDALS[STREAK_MEDALS.length - 1];
  return `streak-${n}`;
}

export function statsHtml(ctx) {
  const s = profileStats(ctx);
  const p = ctx.store.get().progress;
  const tile = ({ tone, icon, num, total = '', label, attrs, aria }) => `<li><${attrs.href ? 'a' : 'button type="button"'} class="pf-stat tone-${tone}" ${Object.entries(attrs).map(([k, v]) => `${k}="${esc(v)}"`).join(' ')} aria-label="${esc(aria)}">
      <span class="pf-stat-icon" aria-hidden="true">${icon}</span>
      <span class="pf-stat-text" aria-hidden="true"><span class="pf-stat-num">${num}${total ? `<span class="pf-stat-total">/${total}</span>` : ''}</span><span class="pf-stat-label">${label}</span></span>
    </${attrs.href ? 'a' : 'button'}></li>`;
  const tiles = [
    { tone: 'brand', icon: icons.flame(22), num: s.streak, label: s.streak === 1 ? 'Día de racha' : 'Días de racha', attrs: { 'data-action': 'medal', 'data-id': streakMedal(p), 'aria-haspopup': 'dialog' }, aria: `Racha: ${s.streak} ${s.streak === 1 ? 'día' : 'días'}` },
    { tone: 'gold', icon: BRUSH, num: s.painters, label: s.painters === 1 ? 'Pintor dominado' : 'Pintores dominados', attrs: { href: '#coleccion-pintores' }, aria: `${s.painters} ${s.painters === 1 ? 'pintor dominado' : 'pintores dominados'}` },
    { tone: 'ok', icon: icons.frames(22), num: s.works, label: s.works === 1 ? 'Cuadro visto' : 'Cuadros vistos', attrs: { href: '#coleccion' }, aria: `${s.works} ${s.works === 1 ? 'cuadro visto' : 'cuadros vistos'}` },
    { tone: 'accent', icon: COLUMNS, num: s.eras, total: s.erasTotal, label: 'Épocas', attrs: { href: '#inicio' }, aria: `Épocas completas: ${s.eras} de ${s.erasTotal}` },
  ];
  return `<section class="pf-sec pf-stats-sec" aria-label="Tus cifras"><ul class="pf-stats">${tiles.map(tile).join('')}</ul></section>`;
}
