// Lo ganado al acabar el Cuadro del día (ui/screens/cuadro-dia-hecho.js): puntos, racha que sube y medallas nuevas, en una fila
// de pastillas. Puro (devuelve HTML).

import { esc } from './dom.js';
import { icons } from './icons.js';
import { CUADRO_XP } from '../engine/cuadro-dia.js';
import { medalInfo } from '../engine/medal-info.js';

// record: la partida guardada; events: los de finishCuadro (engine/cuadro-dia.js).
export function gainsHtml(index, record, events) {
  const items = [{ text: `+${record.won ? CUADRO_XP.won : CUADRO_XP.lost} puntos`, icon: '' }];
  const streak = events.find((e) => e.type === 'streak');
  if (streak) items.push({ text: `${streak.value} ${streak.value === 1 ? 'día' : 'días'} de racha`, icon: icons.flame(16) });
  // La medalla de racha ya la dice la pastilla de la racha.
  for (const m of events.filter((e) => e.type === 'medal' && !(streak && e.id.startsWith('streak-')))) items.push({ text: medalInfo(m.id, index).title, icon: icons.medal(16) });
  return `<ul class="cdd-gains" aria-label="Lo que has ganado">${items.map((it, i) => `<li class="cdd-gain${i ? ' is-extra' : ''}">${it.icon}<span>${esc(it.text)}</span></li>`).join('')}</ul>`;
}

