// Señalética del mapa del camino: carteles de época al borde del sendero (poste y placa), hito de salida,
// «Tu museo», desvíos de las ramas con su cartel y el sendero en SVG. Solo HTML (sin DOM ni estado propio).

import { esc, joinNames } from '../dom.js';
import { icons } from '../icons.js';
import { MAP_W, START_PLAZA, f } from './path-layout.js';
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
// Guion blando en las palabras largas de los carteles estrechos (se parten por una sílaba, no por una letra):
// antes de la consonante que abre la sílaba más cercana a la mitad («Rena-cimiento», «Impre-sionismo»).
const VOWEL = /[aeiouáéíóú]/i;
const KEEP = /^(pr|br|tr|dr|cr|gr|fr|pl|bl|cl|gl|fl|ch|ll|rr)$/i;
export function softHyphen(word, min = 10) {
  if (word.length < min) return word;
  const cuts = [];
  for (let i = 2; i < word.length - 3; i++) {
    if (!VOWEL.test(word[i]) && VOWEL.test(word[i + 1])) {
      const pair = word.slice(i - 1, i + 1);
      const at = !VOWEL.test(word[i - 1]) && KEEP.test(pair) ? i - 1 : i;
      if (VOWEL.test(word[at - 1]) || !VOWEL.test(word[at])) cuts.push(at);
    }
  }
  if (!cuts.length) return word;
  const best = cuts.sort((a, b) => Math.abs(a - word.length / 2) - Math.abs(b - word.length / 2))[0];
  return `${word.slice(0, best)}\u00ad${word.slice(best)}`;
}
const hyphenate = (text) => text.split(' ').map((w) => softHyphen(w)).join(' ');

// «al terminar el Barroco», «al llegar al Realismo».
export const afterEra = (verb, name) => `al ${verb} ${withArticle(name)}`;
export const toEra = (name) => withArticle(name).replace(/^el /, 'al ').replace(/^(las|los) /, 'a $1 ');

// Desvío (sendero estrecho de una rama): dos trazos como el camino, más finos.
const spurSvg = (b) => `<path class="spur-edge${b.open ? '' : ' is-locked'}" d="${b.spur}"/><path class="spur-fill${b.open ? '' : ' is-locked'}" d="${b.spur}"/>`;

export function trailSvg(h, d, spurs = []) {
  return `<svg class="path-trail" viewBox="0 0 ${MAP_W} ${h}" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      ${spurs.map(spurSvg).join('')}<path class="trail-edge" d="${d}"/><path class="trail-fill" d="${d}"/><path class="trail-steps" d="${d}"/></svg>`;
}

// Caja del cartel: su borde junto al camino en `edge`, el pie del poste en `y`; la placa crece hacia fuera.
export function signBox(sign, h) {
  const across = sign.side === 'left' ? `right:${pct(MAP_W - sign.edge, MAP_W)}` : `left:${pct(sign.edge, MAP_W)}`;
  return `class="road-sign is-${sign.side}" style="${across};bottom:${pct(h - sign.y, h)};max-width:${pct(sign.room, MAP_W)}"`;
}

// Cartel de época: nombre (dos líneas como mucho), siglos y «n/m». Abierta, lleva a la presentación;
// cerrada, abre una hoja con lo que hay que hacer (el motivo no ocupa el cartel).
export function eraSign({ movement, status, sealed, done, total, prevName, sign, h }) {
  const locked = status === 'locked';
  const count = locked ? '' : ` · ${done}/${total}`;
  // El candado va dentro del mismo texto: si los siglos no caben en una línea, no se queda solo.
  const meta = `<span class="sign-meta"><span>${locked ? `${icons.lock(12)} ` : ''}${esc(period(movement.period))}${count}</span></span>`;
  const seal = sealed ? `<span class="sign-seal" aria-hidden="true">${icons.laurel(16)}</span>` : '';
  const name = `<span class="sign-name">${esc(movement.name)}</span>`;
  const why = prevName ? `se abre ${afterEra('terminar', prevName)}` : 'aún cerrada';
  const button = locked
    ? `<button type="button" class="sign-plate is-locked" data-action="era-lock" data-id="${esc(movement.id)}" aria-haspopup="dialog" aria-label="${esc(movement.name)}, ${esc(movement.period)}. Cerrada: ${esc(why)}">${name}${meta}</button>`
    : `<button type="button" class="sign-plate" data-action="intro" data-id="${esc(movement.id)}" aria-label="${esc(movement.name)}, ${esc(movement.period)}, ${done} de ${total}${sealed ? ', completa' : ''}: ver presentación">${seal}${name}${meta}<span class="sign-more" aria-hidden="true">${icons.next(14)}</span></button>`;
  return `<h2 ${signBox(sign, h)}>${button}</h2>`;
}

// Hito de salida: plaza al pie del sendero y arco de piedra por encima de él (dos capas: el dintel pasa sobre
// el camino) y una placa a su lado.
const START_GROUND = `<ellipse class="land-shade" cx="${START_PLAZA.x}" cy="${START_PLAZA.y + 8}" rx="74" ry="15"/>
      <ellipse class="land-top" cx="${START_PLAZA.x}" cy="${START_PLAZA.y}" rx="64" ry="13"/>
      <ellipse class="land-shade" cx="195" cy="131" rx="52" ry="6"/>
      <path class="land-leaf-2" d="M134 136C126 120 126 98 134 86C142 98 142 120 134 136Z"/><path class="land-leaf" d="M134 136C126 120 126 98 134 86C136 98 136 120 134 136Z"/>
      <path class="land-leaf-2" d="M258 136C250 122 250 102 258 90C266 102 266 122 258 136Z"/><path class="land-leaf" d="M258 136C250 122 250 102 258 90C260 102 260 122 258 136Z"/>`;
const START_ARCH = `<rect class="land-front" x="160" y="80" width="12" height="52"/><rect class="land-side" x="172" y="82" width="4" height="50"/>
      <rect class="land-front" x="218" y="80" width="12" height="52"/><rect class="land-side" x="230" y="82" width="4" height="50"/>
      <rect class="land-side" x="157" y="128" width="19" height="5"/><rect class="land-side" x="215" y="128" width="19" height="5"/>
      <path class="land-front" d="M154 70H238V82H154Z"/><path class="land-side" d="M238 70L244 66V78L238 82Z"/><path class="land-top" d="M154 70L160 66H244L238 70Z"/>
      <path class="land-front" d="M164 66L197 50L230 66Z"/><path class="land-side" d="M197 50L236 64L230 66Z"/>
      <rect class="land-window" x="180" y="73" width="32" height="5" rx="1"/>`;

// left: épocas por terminar (con todo hecho, «Camino completo»).
export function startBlock(start, eras, tint, left = eras.length) {
  const art = (cls, body) => `<svg class="${cls}" viewBox="0 0 ${MAP_W} ${start.h}" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" focusable="false">${body}</svg>`;
  const line = !left ? 'Camino completo' : left === 1 ? 'Una época por delante' : `${left} épocas por delante`;
  return `<li class="path-start" style="--era-tint:${tint};aspect-ratio:${MAP_W}/calc(${start.h} * var(--k, 1))">
    ${art('path-start-art', START_GROUND)}${trailSvg(start.h, start.trail)}${art('path-start-art is-front', START_ARCH)}
    <div ${signBox(start.sign, start.h)}><p class="sign-plate is-static"><span class="sign-name">Empieza aquí</span><span class="sign-meta"><span>${line}</span></span></p></div>
  </li>`;
}

// «Tu museo»: la meta, arriba del todo. Cúpula y columnas en el estilo limpio del paisaje; la placa va debajo
// del edificio (no lo tapa). Con todo dominado, la placa lo celebra (sello de oro) y lleva a la Colección.
export function museumBlock(museum, n, done = false) {
  const building = `<svg class="path-museum-art" viewBox="0 0 390 ${museum.h}" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path class="land-far" d="M-10 92V62C60 40 130 66 200 48C270 32 330 62 400 44V92Z"/>
      <path class="land-front" d="M-10 92V78C90 62 150 86 240 70C310 58 350 82 400 70V92Z"/>
      <ellipse class="land-shade" cx="197" cy="100" rx="60" ry="8"/>
      <rect class="land-front" x="146" y="66" width="98" height="30"/>
      <rect class="land-side" x="232" y="66" width="12" height="30"/>
      <path class="land-top" d="M140 66H250L256 60H146Z"/>
      ${[158, 180, 202, 224].map((x) => `<rect class="land-window" x="${x}" y="72" width="8" height="24" rx="1"/>`).join('')}
      <path class="land-side" d="M171 66C171 38 219 38 219 66Z"/>
      <path class="land-front" d="M171 66C171 38 209 38 207 66Z"/>
      <rect class="land-front" x="192" y="34" width="6" height="9"/><path class="land-side" d="M191 34L195 26L199 34Z"/>
      <rect class="land-front" x="128" y="62" width="6" height="34"/><rect class="land-side" x="126" y="60" width="10" height="3"/>
      <rect class="land-front" x="256" y="62" width="6" height="34"/><rect class="land-side" x="254" y="60" width="10" height="3"/>
      <path class="land-leaf-2" d="M108 98C100 82 100 60 108 48C116 60 116 82 108 98Z"/><path class="land-leaf" d="M108 98C100 82 100 60 108 48C110 60 110 82 108 98Z"/>
      <path class="land-leaf-2" d="M284 98C276 84 276 64 284 52C292 64 292 84 284 98Z"/><path class="land-leaf" d="M284 98C276 84 276 64 284 52C286 64 286 84 284 98Z"/>
    </svg>`;
  const epochs = n === 1 ? 'Una época' : `${n} épocas`;
  const plate = done
    ? `<button type="button" class="sign-plate is-done path-museum-head" data-action="collection" aria-label="Museo completo: ${epochs} dominadas. Ver tu colección"><span class="sign-seal" aria-hidden="true">${icons.laurel(16)}</span><span class="sign-name">Museo completo</span><span class="sign-meta"><span>${epochs} dominadas · Ver tu colección</span></span><span class="sign-more" aria-hidden="true">${icons.next(14)}</span></button>`
    : `<p class="sign-plate is-static path-museum-head"><span class="sign-name">Tu museo</span><span class="sign-meta"><span>${epochs}, todos los pintores</span></span></p>`;
  return `<li class="path-museum${done ? ' is-done' : ''}" style="aspect-ratio:${MAP_W}/calc(${museum.h} * var(--k, 1))">
    ${building}${trailSvg(museum.h, museum.trail)}
    <div ${signBox(museum.sign, museum.h)}>${plate}</div>
  </li>`;
}

// Nombre corto para el cartel del desvío (el completo va en la hoja): «Más del Barroco», «Gótico»,
// «Estampa japonesa»… Las palabras muy largas llevan un guion blando para partirse con sentido.
const SOFT = '\u00ad';
export function branchShort(branch, index) {
  if (branch.kind === 'epoca') {
    const era = String(index.movement(branch.movementId || branch.opensAt)?.name || '').split(/\s+/)[0];
    return hyphenate(`Más del ${era.replace(/^Post(?=\p{Ll})/u, `Post${SOFT}`)}`);
  }
  return hyphenate(String(branch.name).replace(/\s*\([^)]*\)\s*$/, ''));
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

// Qué abre una rama cerrada, en una frase: «se abre al dominar a Botticelli y Berruguete».
export function branchWhy(index, st) {
  return st.pending.length ? `se abre al dominar a ${joinNames(st.pending.map((p) => stepName(index, p)))}` : 'aún cerrada';
}

// Desvío de una rama: su placa y su hito. extra: señal de una escuela en una época posterior («Escuela rusa ·
// 14 nuevos»), que abre la misma hoja.
export function branchSpot(spot, branch, st, index, h) {
  const done = st.total && st.mastered === st.total;
  const cls = `${done ? 'is-mastered' : st.open ? 'is-open' : 'is-locked'}${spot.extra ? ' is-extra' : ''}`;
  const short = branchShort(branch, index);
  const n = st.pending.length;
  const allDone = spot.extra && st.total && st.mastered === st.total;
  const fresh = allDone ? `${st.mastered}/${st.total}` : `${st.fresh} ${st.fresh === 1 ? 'nuevo' : 'nuevos'}`;
  const label = spot.extra
    ? `${branch.name}: ${allDone ? `${st.total} de ${st.total} dominados` : `${st.fresh === 1 ? 'un pintor nuevo' : `${st.fresh} pintores nuevos`} en esta época`}${st.open ? '' : `, ${branchWhy(index, st)}`}`
    : st.open ? `${branch.name}: rama abierta, ${st.mastered} de ${st.total} dominados` : `${branch.name}: rama cerrada, ${branchWhy(index, st)}`;
  const line = !st.open ? `${icons.lock(11)}<span>${n === 1 ? 'falta 1' : `faltan ${n}`}</span>` : spot.extra ? fresh : `${st.mastered}/${st.total}`;
  return `<li class="branch-spot is-${spot.side}" style="left:${pct(spot.x, MAP_W)};top:${pct(spot.y, h)}">
      <button type="button" class="branch ${cls}" data-action="branch" data-id="${esc(branch.id)}" aria-haspopup="dialog" aria-label="${esc(label)}">
        <span class="branch-plate"><span class="branch-name">${esc(short)}</span><span class="branch-count">${line}</span></span>
        <span class="branch-dot">${done ? icons.laurel(18) : st.open ? icons.fork(18) : icons.lock(12)}</span>
      </button></li>`;
}

// Cartel único de las ramas de la época cuando hay más de dos: «Ramas (n)» en la placa estrecha (el nombre accesible
// y la hoja dicen «Ramas de esta época»); abre una hoja con todas.
export function branchGroupSpot(spot, sts, eraId, h) {
  const n = sts.length;
  const open = sts.filter((st) => st.open).length;
  const done = sts.every((st) => st.total && st.mastered === st.total);
  const cls = done ? 'is-mastered' : open ? 'is-open' : 'is-locked';
  const line = done ? `${n}/${n}` : open ? `${open} ${open === 1 ? 'abierta' : 'abiertas'}` : `${icons.lock(11)}<span>cerradas</span>`;
  const label = `Ramas de esta época: ${n}${done ? ', todas dominadas' : open ? `, ${open} ${open === 1 ? 'abierta' : 'abiertas'}` : ', cerradas'}`;
  return `<li class="branch-spot is-${spot.side}" style="left:${pct(spot.x, MAP_W)};top:${pct(spot.y, h)}">
      <button type="button" class="branch ${cls} is-group" data-action="branches" data-id="${esc(eraId)}" data-members="${esc(spot.members.map((m) => m.id).join(' '))}" aria-haspopup="dialog" aria-label="${esc(label)}">
        <span class="branch-plate"><span class="branch-name">Ramas (${n})</span><span class="branch-count">${line}</span></span>
        <span class="branch-dot">${done ? icons.laurel(18) : open ? icons.fork(18) : icons.lock(12)}</span>
      </button></li>`;
}
