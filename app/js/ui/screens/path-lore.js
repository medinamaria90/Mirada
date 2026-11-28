// Paradas que cuentan, sobre el sendero (solo HTML): el medallón de cada época, en el arco de su puerta, y el rombo de
// cada tramo, antes de su primer pintor. Misma familia (terracota con un libro en crema), distinta de los nodos redondos
// de los pintores. Mientras no se han visto, un puntito y un respiro suave; la marca «Tú» se posa en ellas cuando son lo
// siguiente del camino (la presentación o el cartel van antes que el pintor).

import { esc } from '../dom.js';
import { icons } from '../icons.js';
import { MAP_W } from './path-layout.js';
import { pct, afterEra } from './path-signs.js';
import { needsIntro, needsTramo, artistStatus } from '../../engine/progress.js';

const BOOK = { era: 26, tramo: 20 };

// Qué parada didáctica es lo siguiente del camino («era:<id>» o «tramo:<clave>»), según la parada actual del juego.
export function loreHere(progress, index, current) {
  if (!current) return '';
  if (needsIntro(progress, index, current.movementId) && index.visibleMovements.some((m) => m.id === current.movementId)) return `era:${current.movementId}`;
  if (current.type === 'artist' && needsTramo(progress, index, current.id)) return `tramo:${index.artist(current.id).section}`;
  return '';
}

// Un rombo de tramo está «sin ver» si se puede llegar a él (su primer pintor ya está abierto) y su cartel no se ha abierto.
export function tramoFresh(progress, index, firstArtistId) {
  return Boolean(firstArtistId) && artistStatus(progress, index, firstArtistId) !== 'locked' && needsTramo(progress, index, firstArtistId);
}

// kind: «era» (medallón) o «tramo» (rombo). state: open | locked | done. fresh: sin ver. here: la marca «Tú». name: la
// pastilla (el rombo; el medallón lleva su nombre en la placa de la puerta). attrs: data-* de la acción. tag: «li» dentro
// de la lista de paradas; «div» en la salida.
export function loreNode({ kind, key, x, y, h, state = 'open', fresh = false, here = false, name = '', label, attrs, tag = 'li' }) {
  const side = x < MAP_W / 2 ? 'left' : 'right';
  const room = ((side === 'left' ? MAP_W - x : x) / MAP_W).toFixed(3);
  const marks = `${fresh ? '<span class="lore-ping" aria-hidden="true"></span>' : ''}${state === 'done' ? `<span class="stage-badge">${icons.check(13)}</span>` : ''}${state === 'locked' ? `<span class="stage-lock">${icons.lock(10)}</span>` : ''}${here ? '<span class="stage-you" aria-hidden="true">Tú</span>' : ''}`;
  const text = name ? `<span class="stage-text"><span class="stage-name">${esc(name)}</span></span>` : '';
  return `<${tag} class="stage-spot lore-spot is-${side}${here ? ' is-here' : ''}" data-lore="${esc(key)}" style="left:${pct(x, MAP_W)};top:${pct(y, h)};--room:${room}">
      <button type="button" class="lore lore-${kind} is-${state}${fresh ? ' is-fresh' : ''}" ${attrs} aria-label="${esc(label)}${fresh ? '. Sin ver' : ''}"${here ? ' aria-current="step"' : ''}>
        <span class="lore-dot"><span class="lore-face" aria-hidden="true">${icons.book(BOOK[kind])}</span>${marks}</span>${text}
      </button></${tag}>`;
}

// Medallón de una época: abre su presentación; cerrada, la hoja que cuenta qué falta.
export function eraLore({ movement, status, sealed, done, total, prevName = '', stop, h, fresh, here, tag = 'li' }) {
  const locked = status === 'locked';
  const count = `${done} de ${total} ${total === 1 ? 'pintor' : 'pintores'}`;
  const why = prevName ? `se abre ${afterEra('terminar', prevName)}` : 'aún cerrada';
  return loreNode({
    kind: 'era', key: `era:${movement.id}`, x: stop.x, y: stop.y, h, tag, fresh: fresh && !locked, here,
    state: locked ? 'locked' : sealed ? 'done' : 'open',
    label: locked ? `${movement.name}, ${movement.period}. Cerrada: ${why}` : `${movement.name}, ${movement.period}, ${sealed ? 'completa' : count}: ver presentación`,
    attrs: `data-action="${locked ? 'era-lock' : 'intro'}" data-id="${esc(movement.id)}" aria-haspopup="${locked ? 'dialog' : 'false'}"`,
  });
}

// Rombo de un tramo: abre su cartel en tarjetas (se lee siempre, aunque sus pintores estén cerrados). next: su primer
// pintor, al que sigue el cartel si es lo siguiente del camino.
export function tramoLore({ sec, info, h, fresh = false, here = false, locked = false, next = '' }) {
  const done = info.total > 0 && info.got === info.total;
  return loreNode({
    kind: 'tramo', key: `tramo:${sec.key}`, x: sec.sign.x, y: sec.sign.y, h, fresh, here, name: sec.name,
    state: done ? 'done' : locked ? 'locked' : 'open',
    label: `Tramo ${sec.name}: ${done ? 'completo' : `${info.got} de ${info.total} pintores`}. Ver cartel`,
    attrs: `data-action="cartel" data-kind="tramo" data-id="${esc(sec.key)}" data-title="${esc(sec.name)}"${here && next ? ` data-next="${esc(next)}"` : ''} aria-haspopup="dialog"`,
  });
}

// Medallón de la puerta de una rama, en su pantalla: abre el cartel de la rama en tarjetas.
export function branchLore({ branch, stop, h, mastered, total }) {
  return loreNode({
    kind: 'era', key: `rama:${branch.id}`, x: stop.x, y: stop.y, h, state: total && mastered === total ? 'done' : 'open',
    label: `${branch.name}, ${mastered} de ${total} pintores. Ver cartel`,
    attrs: `data-action="cartel" data-kind="rama" data-id="${esc(branch.id)}" data-title="${esc(branch.name)}" aria-haspopup="dialog"`,
  });
}
