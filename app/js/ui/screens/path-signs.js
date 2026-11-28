// Señalética del mapa del camino: la placa con el nombre de cada época en el ático de su puerta, las tablillas de rama al
// borde del camino (placa sobre dos postes) y la placa de «Tu museo». Las paradas que cuentan (medallón y rombo) van en
// path-lore.js. También los desvíos de las ramas y el sendero en SVG. Solo HTML (sin DOM ni estado propio).

import { esc, joinNames } from '../dom.js';
import { icons } from '../icons.js';
import { MAP_W, f } from './path-layout.js';
import { startArt, museumArt, inscription } from './path-art.js';
import { branchProgress, branchStatus, tramoOpen, tramoPending } from '../../engine/branches.js';

export const pct = (v, total) => `${f((v / total) * 100)}%`;

// Nombre corto de una parada (pintor o sala), para frases como «se abre al dominar a Botticelli y Berruguete».
export const stepName = (index, s) => (s.type === 'sala' ? index.movement(s.id)?.name : index.artist(s.id)?.short || index.artist(s.id)?.name) || '';

// Nombre de época con su artículo: «el Barroco», «el Manierismo y el Renacimiento del Norte», «el Simbolismo y
// las vanguardias». Cada parte unida por « y » lleva el suyo; en minúscula y acabada en -s, «las»/«los».
export function withArticle(name) {
  return String(name).split(' y ').map((part) => {
    if (/^\p{Lu}/u.test(part)) return `el ${part}`;
    return `${/as$/.test(part) ? 'las' : /os$/.test(part) ? 'los' : 'el'} ${part}`;
  }).join(' y ');
}
// «del Renacimiento», «de las vanguardias» (Repaso del…, Sala del…).
export const ofEra = (name) => `de ${withArticle(name)}`.replace(/^de el /, 'del ');
// Siglos con espacio duro: «s. XIX» no se parte en dos líneas.
export const period = (text) => String(text || '').replace(/s\. /g, 's.\u00a0');
// «al terminar el Barroco», «al llegar al Realismo».
export const afterEra = (verb, name) => `al ${verb} ${withArticle(name)}`;
export const toEra = (name) => withArticle(name).replace(/^el /, 'al ').replace(/^(las|los) /, 'a $1 ');

// Desvío (sendero estrecho de una rama): dos trazos como el camino, más finos.
// Más allá del cartel, el desvío se pierde en el paisaje: unas piedras que se apagan hacia el borde.
const spurSvg = (b) => `${b.tail ? `<path class="spur-tail" d="${b.tail}"/>` : ''}<path class="spur-edge${b.open ? '' : ' is-locked'}" d="${b.spur}"/><path class="spur-fill${b.open ? '' : ' is-locked'}" d="${b.spur}"/>${b.open ? `<path class="spur-grain" d="${b.spur}"/>` : ''}`;

// Sendero de tierra: sombra suave debajo, borde algo irregular (rim), firme y unas piedrecitas sueltas (grain). done: el
// tramo ya recorrido, en tierra más cálida y pisada (encima del pendiente).
const dirt = (d, cls = '') => `<path class="trail-rim${cls}" d="${d}"/><path class="trail-rim is-b${cls}" d="${d}"/><path class="trail-edge${cls}" d="${d}"/><path class="trail-fill${cls}" d="${d}"/>`;
const grain = (d, cls = '') => `<path class="trail-grain${cls}" d="${d}"/><path class="trail-grain is-b${cls}" d="${d}"/>`;
export function trailSvg(h, d, spurs = [], done = '') {
  const walked = done ? `${dirt(done, ' is-done')}${grain(done, ' is-done')}` : '';
  return `<svg class="path-trail" viewBox="0 0 ${MAP_W} ${h}" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path class="trail-shade" d="${d}"/>${spurs.map(spurSvg).join('')}${dirt(d)}${grain(d)}${walked}</svg>`;
}

// Caja del cartel (placa sobre dos postes): su borde junto al camino en `edge`, el pie de los postes en `y`; la placa
// crece hacia fuera.
export function signBox(sign, h, extra = '') {
  const across = sign.side === 'left' ? `right:${pct(MAP_W - sign.edge, MAP_W)}` : `left:${pct(sign.edge, MAP_W)}`;
  return `class="road-sign is-${sign.side}${extra ? ` ${extra}` : ''}" style="${across};bottom:${pct(h - sign.y, h)};max-width:${pct(sign.room, MAP_W)}"`;
}

// Puerta de la época (o de la rama): su caja es toda la puerta; el ático, donde va el nombre, en fracciones de
// ella (path-art.js, eraPlace). tone: estilo del acento de la época (la primera va en la salida, fuera de su tramo).
const archBox = (arch, h, tone = '') => `class="era-arch" style="left:${pct(arch.x0, MAP_W)};right:${pct(MAP_W - arch.x1, MAP_W)};bottom:${pct(h - arch.y, h)};top:${pct(arch.top, h)};--attic-at:${f(arch.atticAt * 100)}%;--attic-h:${f(arch.atticH * 100)}%;--attic-w:${f(arch.atticW * 100)}%${tone ? `;${tone}` : ''}"`;

// Nombre en la placa del ático, en capitales (una o dos líneas, por palabras enteras). Los largos, algo más pequeños, pero
// nunca por debajo de 10,5 px (--fit en mapa-carteles.css); la puerta no crece.
const INSCR_CHARS = 12;   // letras por línea que caben a tamaño completo
const INSCR_MIN = 0.88;   // 10,5 px de 12
export const inscriptionHtml = (word) => {
  const longest = Math.max(...word.split(' ').map((w) => w.length));
  const fit = Math.max(INSCR_MIN, Math.min(1, INSCR_CHARS / longest));
  return `<span class="arch-name" style="--fit:${f(fit)}${fit < 1 ? ';--track-on:0' : ''}">${esc(word)}</span>`;
};

// Puerta de una época: el nombre, en la placa de piedra del ático (un rótulo, no un botón: lo que se pulsa es el medallón
// del arco, path-lore.js). Completa, en oro; cerrada, el portón lo dice (path-art.js).
export function eraArch({ movement, status, sealed, arch, h, tone = '' }) {
  const cls = `arch-band${sealed ? ' is-done' : ''}${status === 'locked' ? ' is-locked' : ''}`;
  return `<h2 ${archBox(arch, h, tone)}><span class="${cls}">${inscriptionHtml(inscription(movement.name))}</span></h2>`;
}

// Salida: la puerta de la muralla, que es también la entrada de la primera época (archHtml: su placa, encima, y su
// medallón en el arco).
// Alto de la franja bajo el mapa (.path-foot en main.css): el sendero sigue por ella hasta el borde.
export const FOOT_H = 84;
export function startBlock(start, tint, archHtml = '') {
  const art = (cls, body) => `<svg class="${cls}" viewBox="0 0 ${MAP_W} ${start.h}" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" focusable="false">${body}</svg>`;
  // path-foot: el suelo sigue bajo la barra de abajo (sin franja oscura al llegar al final del mapa).
  const x = start.segs[0].a.x;
  const foot = `M${f(x)} 0V${FOOT_H}`;
  return `<li class="path-foot" style="--era-tint:${tint}" aria-hidden="true">${trailSvg(FOOT_H, foot, [], foot)}</li><li class="path-start" style="--era-tint:${tint};aspect-ratio:${MAP_W}/calc(${start.h} * var(--k, 1))">
    ${art('path-start-art', startArt().back)}${trailSvg(start.h, start.trail, [], start.trail)}${art('path-start-art is-front', startArt().front)}
    ${archHtml}
  </li>`;
}

// «Tu museo»: la meta, arriba del todo. Cúpula y columnas en el estilo limpio del paisaje; la placa va debajo
// del edificio (no lo tapa). Con todo dominado, la placa lo celebra (sello de oro) y lleva a la Colección.
export function museumBlock(museum, n, done = false) {
  const building = `<svg class="path-museum-art" viewBox="0 0 390 ${museum.h}" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" focusable="false">${museumArt()}</svg>`;
  const epochs = n === 1 ? 'Una época' : `${n} épocas`;
  const plate = done
    ? `<button type="button" class="sign-plate is-done path-museum-head" data-action="collection" aria-label="Museo completo: ${epochs}, todas terminadas. Ver tu colección"><span class="sign-seal" aria-hidden="true">${icons.laurel(16)}</span><span class="sign-name">Museo completo</span><span class="sign-meta"><span>${epochs} · Ver tu colección</span></span><span class="sign-more" aria-hidden="true">${icons.next(14)}</span></button>`
    : `<p class="sign-plate is-static path-museum-head"><span class="sign-name">Tu museo</span><span class="sign-meta"><span>${epochs}, todos los pintores</span></span></p>`;
  return `<li class="path-museum${done ? ' is-done' : ''}" style="aspect-ratio:${MAP_W}/calc(${museum.h} * var(--k, 1))">
    ${building}${trailSvg(museum.h, museum.trail, [], done ? museum.trail : '')}
    <div ${signBox(museum.sign, museum.h)}>${plate}</div>
  </li>`;
}

// Nombre corto para el cartel del desvío (el completo va en su pantalla): «Más del Barroco», «Gótico»,
// «Estampa japonesa»… Sin palabras partidas: el cartel es lo bastante ancho.
export function branchShort(branch, index) {
  if (branch.kind === 'epoca') {
    const era = String(index.movement(branch.movementId || branch.opensAt)?.name || '').split(/\s+/)[0];
    return `Más del ${era}`;
  }
  return String(branch.name).replace(/\s*\([^)]*\)\s*$/, '');
}

// Estado de una rama para el mapa: abierta (dominado el primer tramo de su época), sus pintores propios
// dominados y, cerrada, las paradas que faltan para abrirla (engine/branches.js).
export function branchState(progress, index, branch) {
  const { open, mastered, total } = branchProgress(progress, index, branch.id);
  return { open, mastered, total, pending: open ? [] : tramoPending(progress, index, branch.opensAt) };
}

// Señal de una escuela en una época posterior en la que se abre un tramo nuevo: sus pintores propios de ese tramo.
export function tramoState(progress, index, branch, movementId) {
  const rows = branchStatus(progress, index, branch.id).filter((r) => r.opensAt === movementId && !r.onPath);
  const open = tramoOpen(progress, index, movementId);
  return { open, fresh: rows.length, mastered: rows.filter((r) => r.status === 'mastered').length, total: rows.length, pending: open ? [] : tramoPending(progress, index, movementId) };
}

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// Qué abre una rama cerrada, en una frase: «se abre después de Botticelli y Berruguete».
export function branchWhy(index, st) {
  return st.pending.length ? `se abre después de ${joinNames(st.pending.map((p) => stepName(index, p)))}` : 'aún cerrada';
}

// Tablilla de una rama al final de su desvío (sobre dos postes): nombre y cifra (completa, con el sello de hecho);
// cerrada, «faltan n» con candado.
// Abierta, entra directamente en la pantalla de la rama; cerrada, una nota dice qué falta. extra: señal de una escuela
// en una época posterior («Escuela rusa · 14 nuevos»), que entra en la misma rama.
export function branchSpot(spot, branch, st, index, h) {
  const done = st.total && st.mastered === st.total;
  const cls = `${done ? 'is-mastered' : st.open ? 'is-open' : 'is-locked'}${spot.extra ? ' is-extra' : ''}`;
  const n = st.pending.length;
  const allDone = spot.extra && st.total && st.mastered === st.total;
  const fresh = allDone ? `${st.mastered}/${st.total}` : `${st.fresh} ${st.fresh === 1 ? 'nuevo' : 'nuevos'}`;
  const label = spot.extra
    ? `${branch.name}: ${allDone ? `${st.total} de ${st.total} pintores` : `${st.fresh === 1 ? 'un pintor nuevo' : `${st.fresh} pintores nuevos`} en esta época`}${st.open ? '' : `, ${branchWhy(index, st)}`}`
    : done ? `${branch.name}: rama completa, ${st.total} de ${st.total} pintores` : st.open ? `${branch.name}: rama abierta, ${st.mastered} de ${st.total} pintores` : `${branch.name}: rama cerrada, ${branchWhy(index, st)}`;
  // Cerrada: tras quién se abre («tras Goya»; con varias paradas pendientes, cuántos pintores faltan).
  const line = !st.open ? `${icons.lock(11)} ${n === 1 ? `tras ${esc(stepName(index, st.pending[0]))}` : `faltan ${n} pintores`}` : spot.extra ? fresh : `${st.mastered}/${st.total}`;
  return `<li ${signBox(spot.sign, h, 'branch-spot')}>
      <button type="button" class="sign-plate branch ${cls}" data-action="branch" data-id="${esc(branch.id)}" data-status="${st.open ? 'open' : 'locked'}" data-lock="${st.open ? '' : esc(cap(branchWhy(index, st)))}"${!st.open && st.pending[0] ? ` data-unlock="${esc(`${st.pending[0].type}:${st.pending[0].id}`)}"` : ''} aria-label="${esc(label)}">
        <span class="sign-name">${esc(branchShort(branch, index))}</span>${st.open ? metaRow(spot.sign.side, `<span>${line}</span>`) : `<span class="sign-meta"><span>${line}</span></span>`}
      </button></li>`;
}

// Fila de abajo del poste indicador, con su flecha hacia donde se va (el lado del cartel): delante si va a la
// izquierda, detrás si va a la derecha. Cerrada, sin flecha (aún no se puede ir; lleva el candado).
const signArrow = (side) => `<span class="sign-arrow" aria-hidden="true">${side === 'left' ? icons.prev(13) : icons.next(13)}</span>`;
const metaRow = (side, body) => `<span class="sign-meta">${side === 'left' ? signArrow(side) : ''}${body}${side === 'left' ? '' : signArrow(side)}</span>`;

// Vuelta al camino en la pantalla de una rama: el mismo poste que se tocó para entrar, junto a la puerta y del lado
// por el que queda el camino común, con la época a la que se vuelve. Lleva de vuelta al camino, a la vista del desvío.
export function backSpot(back, eraName, h) {
  return `<li ${signBox(back, h, 'branch-spot is-back')}><button type="button" class="sign-plate branch is-back" data-action="back-to-fork" aria-label="Volver al camino${eraName ? `, ${esc(toEra(eraName))}` : ''}">
      ${metaRow(back.side, '<span class="sign-name">Volver al camino</span>')}
    </button></li>`;
}

// Puerta de la rama en su pantalla, a la entrada: su nombre corto en la placa (la cuenta ya está en la cabecera); su cartel
// en tarjetas lo abre el medallón del arco (path-lore.js branchLore).
export function branchEntrySign(branch, arch, h, mastered, total, short = branch.name) {
  return `<h2 ${archBox(arch, h)}><span class="arch-band${total && mastered === total ? ' is-done' : ''}">${inscriptionHtml(inscription(short))}</span></h2>`;
}
