// Señalética del mapa del camino, en tres familias: el arco de cada época (rótulo grande sobre su puerta, centrado en
// el sendero), las tablillas pequeñas de tramo y de rama al borde del camino (placa sobre dos postes) y las placas de
// salida y de «Tu museo». También los desvíos de las ramas y el sendero en SVG. Solo HTML (sin DOM ni estado propio).

import { esc, joinNames } from '../dom.js';
import { icons } from '../icons.js';
import { MAP_W, f } from './path-layout.js';
import { startArt, museumArt, KIOSK, START_PAVING } from './path-art.js';
import { branchProgress, branchStatus, tramoOpen, tramoPending } from '../../engine/branches.js';

const KIOSK_SIGN = 8;      // el botón de la caseta abarca también su letrero
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
// tramo ya recorrido, en tierra más cálida y pisada (encima del pendiente). plaza: la salida, donde el sendero nace de
// una plaza empedrada (sin remate en punta): su borde va bajo el sendero y su suelo encima, así se funden.
const dirt = (d, cls = '') => `<path class="trail-rim${cls}" d="${d}"/><path class="trail-rim is-b${cls}" d="${d}"/><path class="trail-edge${cls}" d="${d}"/><path class="trail-fill${cls}" d="${d}"/>`;
const grain = (d, cls = '') => `<path class="trail-grain${cls}" d="${d}"/><path class="trail-grain is-b${cls}" d="${d}"/>`;
const ellipse = (cls, e, grow = 0) => `<ellipse class="${cls}" cx="${f(e.cx)}" cy="${f(e.cy)}" rx="${f(e.rx + grow)}" ry="${f(e.ry + grow)}"/>`;
export const PLAZA_RIM = 3;
export function trailSvg(h, d, spurs = [], done = '', plaza = null) {
  const walked = done ? `${dirt(done, ' is-done')}${grain(done, ' is-done')}` : '';
  const under = plaza ? ellipse('plaza-rim', plaza, PLAZA_RIM) : '';
  const over = plaza ? `${ellipse('plaza-fill', plaza)}${ellipse('plaza-stones', plaza, -PLAZA_RIM)}` : '';
  return `<svg class="path-trail" viewBox="0 0 ${MAP_W} ${h}" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path class="trail-shade" d="${d}"/>${spurs.map(spurSvg).join('')}${under}${dirt(d)}${grain(d)}${walked}${over}</svg>`;
}

// Caja del cartel (placa sobre dos postes): su borde junto al camino en `edge`, el pie de los postes en `y`; la placa
// crece hacia fuera.
export function signBox(sign, h, extra = '') {
  const across = sign.side === 'left' ? `right:${pct(MAP_W - sign.edge, MAP_W)}` : `left:${pct(sign.edge, MAP_W)}`;
  return `class="road-sign is-${sign.side}${extra ? ` ${extra}` : ''}" style="${across};bottom:${pct(h - sign.y, h)};max-width:${pct(sign.room, MAP_W)}"`;
}

// Lápida (época o rama): su caja junto a la puerta, con el pie en el suelo; la lápida se arrima a la puerta.
// tone: estilo del acento de la época (el arco de la primera va en la salida, fuera de su tramo).
const archBox = (arch, h, tone = '') => `class="era-arch is-${arch.side}" style="left:${pct(arch.x0, MAP_W)};right:${pct(MAP_W - arch.x1, MAP_W)};bottom:${pct(h - arch.y, h)}${tone ? `;${tone}` : ''}"`;

// Lápida de una época, en el dintel de su puerta: el nombre (dos líneas como mucho), los siglos y, debajo, una ranura
// grabada que se va llenando con los pintores dominados (la única cuenta de la época, sin cifras pegadas al título).
// Completa, la losa se dora y la ranura queda llena de oro. Abierta, lleva a la presentación; cerrada, candado y una
// hoja con lo que hay que hacer (el motivo no ocupa la lápida).
const groove = (share) => `<span class="arch-progress" aria-hidden="true"><span class="arch-progress-fill" style="--p:${f(share)}"></span></span>`;
export function eraArch({ movement, status, sealed, done, total, prevName, arch, h, tone = '' }) {
  const locked = status === 'locked';
  const meta = `<span class="arch-meta">${locked ? `${icons.lock(12)} ` : ''}${esc(period(movement.period))}</span>`;
  const name = `<span class="arch-name">${esc(movement.name)}</span>`;
  const why = prevName ? `se abre ${afterEra('terminar', prevName)}` : 'aún cerrada';
  const count = `${done} de ${total} ${total === 1 ? 'pintor dominado' : 'pintores dominados'}`;
  const button = locked
    ? `<button type="button" class="arch-band is-locked" data-action="era-lock" data-id="${esc(movement.id)}" aria-haspopup="dialog" aria-label="${esc(movement.name)}, ${esc(movement.period)}. Cerrada: ${esc(why)}">${name}${meta}</button>`
    : `<button type="button" class="arch-band${sealed ? ' is-done' : ''}" data-action="intro" data-id="${esc(movement.id)}" aria-label="${esc(movement.name)}, ${esc(movement.period)}, ${sealed ? 'completa' : count}: ver presentación">${name}${meta}${groove(sealed ? 1 : total ? done / total : 0)}</button>`;
  return `<h2 ${archBox(arch, h, tone)}>${button}</h2>`;
}

// Salida: la puerta de la muralla, que es también la entrada de la primera época (archHtml: su arco, encima); junto a la
// puerta, la caseta de «Información» (dibujada en el paisaje, path-art.js) abre «Cómo se juega»: un botón transparente
// la cubre.
export function startBlock(start, tint, archHtml = '') {
  const art = (cls, body) => `<svg class="${cls}" viewBox="0 0 ${MAP_W} ${start.h}" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" focusable="false">${body}</svg>`;
  // path-foot: el suelo sigue bajo la barra de abajo (sin franja oscura al llegar al final del mapa).
  return `<li class="path-foot" style="--era-tint:${tint}" aria-hidden="true"></li><li class="path-start" style="--era-tint:${tint};aspect-ratio:${MAP_W}/calc(${start.h} * var(--k, 1))">
    ${art('path-start-art', startArt().back)}${trailSvg(start.h, start.trail, [], start.trail, START_PAVING)}${art('path-start-art is-front', startArt().front)}
    ${archHtml}<button type="button" class="start-kiosk" data-action="start" style="left:${pct(KIOSK.x + KIOSK.w / 2, MAP_W)};top:${pct(KIOSK.y - KIOSK.h / 2 - KIOSK_SIGN, start.h)}" aria-haspopup="dialog" aria-label="Cómo se juega"><span class="start-kiosk-text">Cómo se juega</span></button>
  </li>`;
}

// «Tu museo»: la meta, arriba del todo. Cúpula y columnas en el estilo limpio del paisaje; la placa va debajo
// del edificio (no lo tapa). Con todo dominado, la placa lo celebra (sello de oro) y lleva a la Colección.
export function museumBlock(museum, n, done = false) {
  const building = `<svg class="path-museum-art" viewBox="0 0 390 ${museum.h}" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" focusable="false">${museumArt()}</svg>`;
  const epochs = n === 1 ? 'Una época' : `${n} épocas`;
  const plate = done
    ? `<button type="button" class="sign-plate is-done path-museum-head" data-action="collection" aria-label="Museo completo: ${epochs} dominadas. Ver tu colección"><span class="sign-seal" aria-hidden="true">${icons.laurel(16)}</span><span class="sign-name">Museo completo</span><span class="sign-meta"><span>${epochs} dominadas · Ver tu colección</span></span><span class="sign-more" aria-hidden="true">${icons.next(14)}</span></button>`
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

// Qué abre una rama cerrada, en una frase: «se abre al dominar a Botticelli y Berruguete».
export function branchWhy(index, st) {
  return st.pending.length ? `se abre al dominar a ${joinNames(st.pending.map((p) => stepName(index, p)))}` : 'aún cerrada';
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
    ? `${branch.name}: ${allDone ? `${st.total} de ${st.total} dominados` : `${st.fresh === 1 ? 'un pintor nuevo' : `${st.fresh} pintores nuevos`} en esta época`}${st.open ? '' : `, ${branchWhy(index, st)}`}`
    : done ? `${branch.name}: rama completa, ${st.total} de ${st.total} dominados` : st.open ? `${branch.name}: rama abierta, ${st.mastered} de ${st.total} dominados` : `${branch.name}: rama cerrada, ${branchWhy(index, st)}`;
  // Cerrada: tras quién se abre («tras Goya»; con varias paradas pendientes, cuántos pintores faltan).
  const line = !st.open ? `${icons.lock(11)} ${n === 1 ? `tras ${esc(stepName(index, st.pending[0]))}` : `faltan ${n} pintores`}` : spot.extra ? fresh : `${st.mastered}/${st.total}`;
  return `<li ${signBox(spot.sign, h, 'branch-spot')}>
      <button type="button" class="sign-plate branch ${cls}" data-action="branch" data-id="${esc(branch.id)}" data-status="${st.open ? 'open' : 'locked'}" data-lock="${st.open ? '' : esc(cap(branchWhy(index, st)))}" aria-label="${esc(label)}">
        <span class="sign-name">${esc(branchShort(branch, index))}</span>${metaRow(spot.sign.side, `<span>${line}</span>`)}
      </button></li>`;
}

// Fila de abajo del poste indicador, con su flecha hacia donde se va (el lado del cartel): delante si va a la
// izquierda, detrás si va a la derecha.
const signArrow = (side) => `<span class="sign-arrow" aria-hidden="true">${side === 'left' ? icons.prev(13) : icons.next(13)}</span>`;
const metaRow = (side, body) => `<span class="sign-meta">${side === 'left' ? signArrow(side) : ''}${body}${side === 'left' ? '' : signArrow(side)}</span>`;

// Vuelta al camino en la pantalla de una rama: el mismo poste que se tocó para entrar, junto a la puerta y del lado
// por el que queda el camino común, con la época a la que se vuelve. Lleva de vuelta al camino, a la vista del desvío.
export function backSpot(back, eraName, h) {
  return `<li ${signBox(back, h, 'branch-spot is-back')}><button type="button" class="sign-plate branch is-back" data-action="back" aria-label="Volver al camino${eraName ? `, ${esc(toEra(eraName))}` : ''}">
      <span class="sign-name">Volver al camino</span>${metaRow(back.side, eraName ? `<span>${esc(eraName)}</span>` : '')}
    </button></li>`;
}

// Mojón de un tramo (unidad de pintores), en su hueco justo antes de su primer pintor: una estela de piedra al borde
// del sendero y, a su lado, la tablilla con el nombre (la cuenta va en la lápida de la época). Completo, la tablilla
// se dora y la estela lleva su inscripción de oro, sin iconos sueltos. Se lee siempre, aunque sus pintores estén
// cerrados: abre su cartel en tarjetas (sign-cards.js).
export function tramoSign(sec, info, h) {
  const done = info.total > 0 && info.got === info.total;
  const label = `Tramo ${sec.name}: ${done ? 'completo' : `${info.got} de ${info.total} dominados`}. Ver cartel`;
  return `<li ${signBox(sec.sign, h, 'is-tramo')}><button type="button" class="sign-plate is-tramo${done ? ' is-done' : ''}" data-action="cartel" data-kind="tramo" data-id="${esc(sec.key)}" aria-haspopup="dialog" aria-label="${esc(label)}">
      <span class="tramo-stone" aria-hidden="true"></span><span class="sign-name">${esc(sec.name)}</span></button></li>`;
}

// Arco de la rama en su pantalla, a la entrada: solo el nombre (la cuenta ya está en la cabecera); abre el cartel de la
// rama en tarjetas.
export function branchEntrySign(branch, arch, h, mastered, total) {
  const label = `${branch.name}, ${mastered} de ${total} dominados. Ver cartel`;
  return `<h2 ${archBox(arch, h)}><button type="button" class="arch-band${total && mastered === total ? ' is-done' : ''}" data-action="cartel" data-kind="rama" data-id="${esc(branch.id)}" aria-haspopup="dialog" aria-label="${esc(label)}">
      <span class="arch-name">${esc(branch.name)}</span></button></h2>`;
}
