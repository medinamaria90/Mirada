// Paradas que cuentan, sobre el sendero (solo HTML): el medallón de cada época, en el arco de su puerta, y el rombo de
// cada tramo, antes de su primer pintor. Misma familia (terracota con un libro en crema), distinta de los nodos redondos
// de los pintores. Mientras no se han visto, un puntito y un respiro suave; la burbuja del itinerario se posa en ellas cuando son lo
// siguiente del camino (la presentación o el cartel van antes que el pintor).

import { esc } from '../dom.js';
import { icons } from '../icons.js';
import { MAP_W } from './path-layout.js';
import { pct, withArticle } from './path-signs.js';
import { lockOf } from './path-nodes.js';
import { gateEssentials, essentialOpen } from '../../engine/essentials.js';
import { needsTramo, artistStatus, movementStatus, stepStatus, stepPassed } from '../../engine/progress.js';
import { pendingLore, loreKey } from '../../engine/lore.js';

const artistOrSalaOpen = (progress, index, step) => stepStatus(progress, index, step) !== 'locked';

const BOOK = { era: 26, tramo: 20 };

// Qué parada didáctica es lo siguiente del camino («era:<id>» o «tramo:<clave>»), según la parada actual del juego: la
// primera sin ver hasta ella (engine/lore.js), aunque sea de un tramo ya empezado.
export function loreHere(progress, index, current) {
  if (!current) return '';
  const lore = pendingLore(progress, index, { type: current.type, id: current.id });
  return lore ? loreKey(lore) : '';
}

// Lo que va antes de un pintor («el Renacimiento», «Los tres genios»): la primera presentación de época o cartel de tramo
// sin ver hasta él. '' si nada. Al tocar al pintor se avisa de esto, no se salta en silencio.
export function loreBefore(progress, index, artistId) {
  const lore = pendingLore(progress, index, { type: 'artist', id: artistId });
  if (!lore) return '';
  return lore.type === 'era' ? withArticle(index.movement(lore.id).name) : lore.key;
}

// Un rombo de tramo está «sin ver» si se puede llegar a él (su primer pintor ya está abierto) y su cartel no se ha abierto.
export function tramoFresh(progress, index, firstArtistId) {
  return Boolean(firstArtistId) && artistStatus(progress, index, firstArtistId) !== 'locked' && needsTramo(progress, index, firstArtistId);
}

// kind: «era» (medallón) o «tramo» (rombo). state: open | locked | done. fresh: sin ver. here: es lo siguiente del camino. name: la
// pastilla (el rombo; el medallón lleva su nombre en la placa de la puerta). attrs: data-* de la acción. tag: «li» dentro
// de la lista de paradas; «div» en la salida.
export function loreNode({ kind, key, x, y, h, state = 'open', fresh = false, here = false, name = '', label, attrs, tag = 'li' }) {
  const side = x < MAP_W / 2 ? 'left' : 'right';
  const room = ((side === 'left' ? MAP_W - x : x) / MAP_W).toFixed(3);
  const marks = `${fresh ? '<span class="lore-ping" aria-hidden="true"></span>' : ''}${state === 'done' ? `<span class="stage-badge">${icons.check(13)}</span>` : ''}${state === 'locked' ? `<span class="stage-lock">${icons.lock(10)}</span>` : ''}`;
  const text = name ? `<span class="stage-text"><span class="stage-name">${esc(name)}</span></span>` : '';
  return `<${tag} class="stage-spot lore-spot is-${side}${here ? ' is-here' : ''}" data-lore="${esc(key)}" style="left:${pct(x, MAP_W)};top:${pct(y, h)};--room:${room}">
      <button type="button" class="lore lore-${kind} is-${state}${fresh ? ' is-fresh' : ''}" ${attrs} aria-label="${esc(label)}${fresh ? '. Sin ver' : ''}"${here ? ' aria-current="step"' : ''}>
        <span class="lore-dot"><span class="lore-face" aria-hidden="true">${icons.book(BOOK[kind])}</span>${marks}</span>${text}
      </button></${tag}>`;
}

// Lo que cierra la lectura (medallón y rombos) de una época por delante del progreso: no se ha cruzado su puerta. Al llegar
// se abre todo lo suyo para leer, aunque sus pintores sigan su desbloqueo normal. null si la época ya está alcanzada.
// { lock: el aviso del globo, unlock: la parada que la abre (el «Ir» del globo) }. El medallón ES la puerta: no dice «la puerta
// de…». Con la parada anterior superada, lo que falta conocer («Antes, conoce las pinturas negras de Goya», y «y 2 más» si hay
// más) y «Ir» a su nivel; con la anterior en juego, acertar la mitad con ella; más lejos, «Se abre al llegar aquí» sin «Ir»
// (nombrar paradas que aún no se han visto sería hablar de lo que no se conoce).
export function doorLock(progress, index, movement) {
  if (!movement || movementStatus(progress, index, movement.id) !== 'locked') return null;
  const first = index.stepsOf(movement.id)[0];
  const prev = first ? index.steps[index.stepIndex(first.type, first.id) - 1] : null;
  const must = first && prev && stepPassed(progress, prev) ? gateEssentials(progress, index, first, prev) : [];
  if (must.length) {
    const [next] = must;
    return {
      lock: `Antes, conoce ${next.title}${must.length > 1 ? ` y ${must.length - 1} más` : ''}`,
      unlock: essentialOpen(progress, index, next) ? `deep:${next.artistId}:${next.level}` : `artist:${next.artistId}`,
    };
  }
  if (first && prev && artistOrSalaOpen(progress, index, prev)) {
    const { text, unlock } = lockOf(progress, index, first, prev);
    return { lock: text, unlock };
  }
  return { lock: 'Se abre al llegar aquí', unlock: '' };
}

const lockAttrs = (door) => `data-action="lore-lock" data-status="locked" data-lock="${esc(door.lock)}" data-unlock="${esc(door.unlock)}"`;

// Medallón de una época: abre su presentación; por delante del progreso, cerrado (candado y aviso, como un pintor cerrado).
export function eraLore({ movement, sealed, done, total, door = null, stop, h, fresh, here, tag = 'li' }) {
  const count = `${done} de ${total} ${total === 1 ? 'pintor' : 'pintores'}`;
  return loreNode({
    kind: 'era', key: `era:${movement.id}`, x: stop.x, y: stop.y, h, tag, fresh: fresh && !door, here,
    state: door ? 'locked' : sealed ? 'done' : 'open',
    label: door ? `${movement.name}, ${movement.period}. Cerrada: ${door.lock}` : `${movement.name}, ${movement.period}, ${sealed ? 'completa' : count}: ver presentación`,
    attrs: door ? lockAttrs(door) : `data-action="intro" data-id="${esc(movement.id)}" aria-haspopup="false"`,
  });
}

// Rombo de un tramo: abre su cartel en tarjetas desde que se llega a su época, aunque sus pintores sigan cerrados; antes, cerrado
// (door, doorLock). next: su primer pintor, al que sigue el cartel si es lo siguiente del camino.
export function tramoLore({ sec, info, h, fresh = false, here = false, door = null, next = '' }) {
  const done = info.total > 0 && info.got === info.total;
  return loreNode({
    kind: 'tramo', key: `tramo:${sec.key}`, x: sec.sign.x, y: sec.sign.y, h, fresh, here, name: sec.name,
    state: door ? 'locked' : done ? 'done' : 'open',
 label: door ? `Tramo ${sec.name}. Cerrado: ${door.lock}` : `Tramo ${sec.name}: ${done ? 'completo' : `${info.got} de ${info.total} pintores`}. Ver cartel`,
    attrs: door ? lockAttrs(door) : `data-action="cartel" data-kind="tramo" data-id="${esc(sec.key)}" data-title="${esc(sec.name)}"${here && next ? ` data-next="${esc(next)}"` : ''} aria-haspopup="dialog"`,
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
