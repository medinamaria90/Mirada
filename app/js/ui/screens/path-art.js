// Dibujos propios del mapa (SVG en línea, coordenadas de diseño de ancho 390): la puerta de salida (muralla con
// su puerta, plaza con fuente y tejados asomando) y «Tu museo» arriba. Los colores van por clases land-* (las
// variables --map-* de brand.css); los árboles llevan data-sway (se mecen con el viento) y las ventanas que se
// encienden de noche, data-lamp (map-land.js las copia a la capa de luces).

import { START_PLAZA, f } from './path-layout.js';

const KX = 0.5;   // falsa 3D: la profundidad va hacia arriba y a la derecha
const KY = 0.3;

const cypress = (x, y, h, w = 6) => {
  const body = (k) => `M${f(x)} ${f(y)}C${f(x - w)} ${f(y - h * 0.35)} ${f(x - w)} ${f(y - h * 0.78)} ${f(x)} ${f(y - h)}C${f(x + w * k)} ${f(y - h * 0.78)} ${f(x + w * k)} ${f(y - h * 0.35)} ${f(x)} ${f(y)}Z`;
  return `<g data-sway="${f(x)}"><ellipse class="land-shade" cx="${f(x + 2)}" cy="${f(y + 1)}" rx="${f(w * 1.6)}" ry="${f(w * 0.5)}"/><path class="land-leaf-2" d="${body(1)}"/><path class="land-leaf" d="${body(0.3)}"/></g>`;
};
const tree = (x, y, r) => `<g data-sway="${f(x)}"><ellipse class="land-shade" cx="${f(x + 2)}" cy="${f(y + 1)}" rx="${f(r * 1.1)}" ry="${f(r * 0.35)}"/><rect class="land-side" x="${f(x - 1.5)}" y="${f(y - r * 0.9)}" width="3" height="${f(r * 0.9)}"/><circle class="land-leaf-2" cx="${f(x)}" cy="${f(y - r * 1.4)}" r="${f(r)}"/><circle class="land-leaf" cx="${f(x - r * 0.18)}" cy="${f(y - r * 1.55)}" r="${f(r * 0.8)}"/></g>`;
const flowers = (x, y) => `<ellipse class="land-leaf-2" cx="${f(x)}" cy="${f(y)}" rx="7" ry="2.6"/>${[[-4, -1, 'bloom'], [0, -2.2, 'top'], [3.6, -.6, 'gold'], [-1, .6, 'bloom'], [5.4, -2, 'bloom']].map(([dx, dy, c]) => `<circle class="land-${c}" cx="${f(x + dx)}" cy="${f(y + dy)}" r="1.4"/>`).join('')}`;
const wall = (x0, x1, y, h) => {
  const d = 8 * KX;
  const merlons = Array.from({ length: Math.floor((x1 - x0) / 10) }, (_, i) => `<rect class="land-front" x="${f(x0 + 2 + i * 10)}" y="${f(y - h - 4)}" width="5" height="4"/>`).join('');
  return `<path class="land-top" d="M${f(x0)} ${f(y - h)}H${f(x1)}L${f(x1 + d)} ${f(y - h - d * KY / KX)}H${f(x0 + d)}Z"/><rect class="land-front" x="${f(x0)}" y="${f(y - h)}" width="${f(x1 - x0)}" height="${f(h)}"/>${merlons}`;
};
const roof = (x, y, w, h) => `<rect class="land-front" x="${f(x)}" y="${f(y - h)}" width="${f(w)}" height="${f(h)}"/><path class="land-tile" d="M${f(x - 1)} ${f(y - h)}H${f(x + w + 1)}L${f(x + w - 2 + 6 * KX)} ${f(y - h - 9)}H${f(x + 2)}Z"/><rect class="land-window" data-lamp x="${f(x + w / 2 - 2)}" y="${f(y - h + 3)}" width="4" height="5" rx="1"/>`;
const fountain = (cx, y) => `<ellipse class="land-shade" cx="${f(cx)}" cy="${f(y + 2)}" rx="20" ry="5"/><ellipse class="land-side" cx="${f(cx)}" cy="${f(y)}" rx="16" ry="4.6"/><ellipse class="land-front fountain-rim" cx="${f(cx)}" cy="${f(y - 3)}" rx="16" ry="4.6"/><ellipse class="land-water" cx="${f(cx)}" cy="${f(y - 3)}" rx="12.6" ry="3.2"/><ellipse class="land-water-2" data-flow cx="${f(cx - 3)}" cy="${f(y - 3.6)}" rx="4" ry="1"/><rect class="land-front" x="${f(cx - 2)}" y="${f(y - 17)}" width="4" height="14"/><ellipse class="land-front" cx="${f(cx)}" cy="${f(y - 17)}" rx="7" ry="2.2"/><ellipse class="land-water-2" data-jet cx="${f(cx)}" cy="${f(y - 21)}" rx="1.6" ry="3.4"/>`;

// Caseta de «Información» en el borde de la plaza, a la derecha de la puerta (a la izquierda va la lápida de la primera
// época), apartada del botón «Tú» de la esquina: caseta con tejadillo y un letrero con la «i» dorada. Tocarla abre
// «Cómo se juega» (el botón transparente que la cubre lo pone path-signs.js con KIOSK).
export const KIOSK = { x: 246, y: 136, w: 32, h: 22 };
const kiosk = ({ x, y, w, h }) => {
  const d = 10 * KX;
  const top = y - h;
  return `<ellipse class="land-shade" cx="${f(x + w / 2 + 3)}" cy="${f(y + 1.5)}" rx="${f(w * .75)}" ry="4"/>
      <path class="land-side" d="M${f(x + w)} ${f(y)}V${f(top)}L${f(x + w + d)} ${f(top - d * KY / KX)}V${f(y - d * KY / KX)}Z"/>
      <rect class="land-front" x="${f(x)}" y="${f(top)}" width="${f(w)}" height="${f(h)}"/>
      <rect class="land-window" data-lamp x="${f(x + 4)}" y="${f(top + 5)}" width="${f(w - 8)}" height="7" rx="1"/>
      <rect class="land-side" x="${f(x + 2)}" y="${f(top + 13)}" width="${f(w - 4)}" height="2"/>
      <path class="land-tile" d="M${f(x - 3)} ${f(top)}H${f(x + w + 3)}L${f(x + w + 3 + d)} ${f(top - 7)}H${f(x - 3 + d)}Z"/>
      <path class="land-tile-2" d="M${f(x - 3)} ${f(top)}H${f(x + w + 3)}V${f(top + 2.4)}H${f(x - 3)}Z"/>
      <rect class="land-side" x="${f(x + w / 2 + d / 2 - .8)}" y="${f(top - 17)}" width="1.6" height="11"/>
      <circle class="land-top" cx="${f(x + w / 2 + d / 2)}" cy="${f(top - 21)}" r="8.6"/>
      <circle class="land-gold" cx="${f(x + w / 2 + d / 2)}" cy="${f(top - 21)}" r="7"/>
      <circle class="land-top" cx="${f(x + w / 2 + d / 2)}" cy="${f(top - 24.4)}" r="1.3"/>
      <rect class="land-top" x="${f(x + w / 2 + d / 2 - .9)}" y="${f(top - 22.4)}" width="2" height="6" rx=".7"/>`;
};

const PX = START_PLAZA.x;
const PY = START_PLAZA.y;
// Empedrado de la plaza: el sendero nace de él (path-signs.js lo pinta con el sendero, encima de su arranque).
export const START_PAVING = { cx: PX + 6, cy: PY + 6, rx: 84, ry: 15 };
// La fuente, dentro de la plaza, a la izquierda del arranque del sendero.
const FOUNTAIN = { x: PX - 42, y: PY + 10 };
const GATE = { left: 173, right: 231, y: 96, tower: 14, h: 38 };   // la puerta, donde el sendero va casi recto
const START_BACK = `<ellipse class="land-shade" cx="${PX + 28}" cy="${PY + 9}" rx="112" ry="16"/>
      <ellipse class="land-top" cx="${PX + 28}" cy="${PY + 2}" rx="102" ry="13"/>
      ${cypress(28, 80, 30)}${cypress(112, 82, 24)}${roof(262, 80, 22, 10)}${roof(296, 79, 26, 12)}${roof(352, 80, 20, 9)}
      <rect class="land-front" x="326" y="44" width="12" height="36"/><path class="land-side" d="M338 80V44L344 40.4V76.4Z"/><path class="land-top" d="M326 44H338L344 40.4H332Z"/><path class="land-tile-2" d="M326 44H338L335 22Z"/><path class="land-tile" d="M338 44L344 40.4L335 22Z"/><path class="land-window" data-lamp d="M330 56V51a2 2 0 0 1 4 0V56Z"/>
      ${wall(-10, GATE.left, GATE.y, 18)}${wall(GATE.right + GATE.tower, 400, GATE.y, 18)}
      ${tree(30, PY + 6, 8)}${tree(122, PY + 2, 7)}${cypress(122, PY + 20, 22)}
      ${flowers(232, PY + 28)}${flowers(340, PY + 24)}${flowers(176, PY + 26)}${flowers(KIOSK.x + 50, KIOSK.y + 4)}`;
// La primera época entra por la misma puerta de ciudad que las demás, abierta en la muralla (delante del sendero, con la
// fuente y la caseta de la plaza de salida). Su plaza es la de salida: la puerta no lleva otra detrás.
const START_GATE = { x: (GATE.left + GATE.tower + GATE.right) / 2, y: GATE.y };
export const startPlace = () => eraPlace(START_GATE.x, START_GATE.y).box;
export const startArt = () => ({ back: START_BACK, front: `${fountain(FOUNTAIN.x, FOUNTAIN.y)}${kiosk(KIOSK)}${eraGate(START_GATE.x, START_GATE.y, { plaza: false })}` });

// «Tu museo»: cúpula y columnas; sus ventanas se encienden de noche.
export function museumArt() {
  return `<path class="land-far" d="M-10 92V62C60 40 130 66 200 48C270 32 330 62 400 44V92Z"/>
      <path class="land-front" d="M-10 92V78C90 62 150 86 240 70C310 58 350 82 400 70V92Z"/>
      <ellipse class="land-shade" cx="197" cy="100" rx="60" ry="8"/>
      <rect class="land-front" x="146" y="66" width="98" height="30"/>
      <rect class="land-side" x="232" y="66" width="12" height="30"/>
      <path class="land-top" d="M140 66H250L256 60H146Z"/>
      ${[158, 180, 202, 224].map((x) => `<rect class="land-window" data-lamp x="${x}" y="72" width="8" height="24" rx="1"/>`).join('')}
      <path class="land-side" d="M171 66C171 38 219 38 219 66Z"/>
      <path class="land-front" d="M171 66C171 38 209 38 207 66Z"/>
      <rect class="land-front" x="192" y="34" width="6" height="9"/><path class="land-side" d="M191 34L195 26L199 34Z"/>
      <rect class="land-front" x="128" y="62" width="6" height="34"/><rect class="land-side" x="126" y="60" width="10" height="3"/>
      <rect class="land-front" x="256" y="62" width="6" height="34"/><rect class="land-side" x="254" y="60" width="10" height="3"/>
      ${cypress(108, 98, 50, 8)}${cypress(284, 98, 46, 8)}${flowers(150, 108)}${flowers(244, 110)}`;
}

// Puerta de ciudad al entrar en cada época (la época es un lugar, docs/eval/plan-camino-r5.md): dos torreones de tejado
// cónico, el sendero pasa por su arco y el nombre va grabado en el ático (path-signs.js, misma piedra entre dos
// molduras). Mismo tamaño en todas las épocas. Al cruzar el arco, una plaza empedrada amplia (la pinta trailSvg, a ras
// del sendero) con un pozo, balas de paja, sacos y un carro. Cerrada: portón de madera en el arco. x, y: centro del
// paso, al pie.
const CITY = { half: 60, body: 42, side: 7, arch: 15, tower: 17, towerH: 72, roof: 19, attic: 28 };
const PLAZA = { up: 104, rx: 118, ry: 34, edge: 6 };   // centro de la plaza sobre el pie de la puerta, sus radios y su aire con el borde
const CITY_W = (CITY.half + CITY.tower) * 2;
const MAP_SIZE = 390;   // ancho de diseño (path-layout.js, MAP_W)
// Nombre grabado en el ático: el de la época sin paréntesis, en una o dos líneas de capitales. Si no cabe, uno corto
// fiel a lo que hay al cruzar la puerta (la época de Van Eyck empieza por el Renacimiento del Norte; «Manierismo» sigue
// en su tramo y en la presentación). Las palabras muy largas se pueden partir con guion.
const SHORT = { 'Manierismo y Renacimiento del Norte': 'Renacimiento del Norte', Postimpresionismo: 'Post\u00adimpresionismo' };
export const inscription = (name) => SHORT[name] || String(name).replace(/\s*\(.*\)\s*$/, '');
// Geometría del lugar: la plaza (para trailSvg) y la caja pulsable (toda la puerta), con el sitio del ático en ella.
export function eraPlace(x, y) {
  const top = y - CITY.towerH - CITY.roof;
  const hh = y - top;
  // La plaza no se sale del mapa: si la puerta va cerca de un borde, se corre hacia dentro (el sendero la cruza igual).
  const cx = Math.min(Math.max(x, PLAZA.rx + PLAZA.edge), MAP_SIZE - PLAZA.rx - PLAZA.edge);
  return {
    plaza: { cx, cy: y - PLAZA.up, rx: PLAZA.rx, ry: PLAZA.ry, rim: 1, cobbles: true },
    box: { x0: x - CITY.half - CITY.tower, x1: x + CITY.half + CITY.tower, y, top, atticAt: CITY.body / hh, atticH: CITY.attic / hh, atticW: (CITY.half * 2 - 6) / CITY_W },
  };
}
const cone = (x, y, w) => `<path class="land-tile" d="M${f(x - 2)} ${f(y)}L${f(x + w / 2)} ${f(y - CITY.roof)}L${f(x + w + 2)} ${f(y)}Z"/><path class="land-tile-2" d="M${f(x + w / 2)} ${f(y - CITY.roof)}L${f(x + w + 2)} ${f(y)}H${f(x + w * .6)}Z"/>`;
const townTower = (x, y) => {
  const { tower: w, towerH: h, side: d } = CITY;
  return `<ellipse class="land-shade" cx="${f(x + w / 2 + 3)}" cy="${f(y + 1.5)}" rx="${f(w * .8)}" ry="3.5"/>
    <path class="land-side" d="M${f(x + w)} ${f(y)}V${f(y - h)}L${f(x + w + d)} ${f(y - h - d * .6)}V${f(y - d * .6)}Z"/><rect class="land-front" x="${f(x)}" y="${f(y - h)}" width="${w}" height="${h}"/>
    <path class="land-window" data-lamp d="M${f(x + w / 2 - 2)} ${f(y - h + 18)}V${f(y - h + 12)}a2 2 0 0 1 4 0V${f(y - h + 18)}Z"/>${cone(x, y - h, w + d * .6)}`;
};
// Vida de la plaza, a escala del mapa: un pozo, un carro con balas de paja al lado y unos sacos, cerca del sendero.
const LIFE = 1.6;   // escala de las piezas de la plaza
const life = (x, y, body) => `<g transform="translate(${f(x)} ${f(y)}) scale(${LIFE})">${body}</g>`;
const well = () => `<ellipse class="land-shade" cx="1" cy="1" rx="8" ry="2.4"/><rect class="land-side" x="-6" y="-7" width="12" height="7"/><ellipse class="land-top" cx="0" cy="-7" rx="6" ry="2"/><rect class="land-side" x="-6" y="-17" width="1.4" height="10"/><rect class="land-side" x="4.6" y="-17" width="1.4" height="10"/><path class="land-tile" d="M-8 -16L0 -21L8 -16Z"/>`;
const bale = (dx = 0, dy = 0) => `<ellipse class="land-shade" cx="${f(dx + 1)}" cy="${f(dy + .6)}" rx="6" ry="1.8"/><rect class="land-hay" x="${f(dx - 5)}" y="${f(dy - 5)}" width="10" height="5" rx="1"/><rect class="land-hay-2" x="${f(dx - 5)}" y="${f(dy - 3)}" width="10" height="1"/>`;
const sacks = () => `<path class="land-top" d="M-6 0Q-7 -4 -4.5 -6H-1.5Q1 -4 0 0Z"/><path class="land-top" d="M0 .5Q-1 -3.5 1.5 -5.5H4.5Q7 -3.5 6 .5Z"/><rect class="land-side" x="-4.5" y="-6.6" width="3" height="1.2"/><rect class="land-side" x="1.5" y="-6.1" width="3" height="1.2"/>`;
const cart = () => `<ellipse class="land-shade" cx="2" cy="1" rx="12" ry="2.4"/><rect class="land-side" x="-9" y="-8" width="16" height="5" rx="1"/><rect class="land-hay" x="-8" y="-11" width="14" height="3.4" rx="1.4"/><circle class="land-side" cx="-5" cy="-2.6" r="2.6"/><circle class="land-side" cx="4" cy="-2.6" r="2.6"/><rect class="land-side" x="7" y="-5" width="9" height="1.1" rx=".5"/>${bale(22, 2)}${bale(17, 6)}`;
const plazaLife = (x, y) => {
  const { plaza } = eraPlace(x, y);
  const near = (dx) => plaza.cx + dx;
  return `${life(near(-62), plaza.cy + 6, well())}${life(near(-30), plaza.cy - 14, sacks())}${life(near(40), plaza.cy + 4, cart())}`;
};
export function eraGate(x, y, { locked = false, plaza = true } = {}) {
  const { half, body, arch, attic, side: d } = CITY;
  const leaves = locked ? `<path class="land-side" d="M${f(x - arch)} ${f(y)}V${f(y - body + 18)}Q${f(x)} ${f(y - body + 4)} ${f(x + arch)} ${f(y - body + 18)}V${f(y)}Z"/><rect class="land-front" x="${f(x - .6)}" y="${f(y - body + 8)}" width="1.2" height="${f(body - 8)}"/>` : '';
  return `${plaza ? plazaLife(x, y) : ''}
    <path class="land-side" d="M${f(x + half)} ${f(y)}V${f(y - body - attic)}L${f(x + half + d)} ${f(y - body - attic - d * .6)}V${f(y - d * .6)}Z"/>
    <path class="land-front" d="M${f(x - half)} ${f(y)}V${f(y - body - attic)}H${f(x + half)}V${f(y)}H${f(x + arch)}V${f(y - body + 18)}Q${f(x)} ${f(y - body + 4)} ${f(x - arch)} ${f(y - body + 18)}V${f(y)}Z"/>
    <rect class="land-top" x="${f(x - half - 1)}" y="${f(y - body - 1.5)}" width="${f(half * 2 + 2)}" height="1.5"/>
    <path class="land-top" d="M${f(x - half - 2)} ${f(y - body - attic)}H${f(x + half + 2)}L${f(x + half + 2 + d)} ${f(y - body - attic - d * .6)}H${f(x - half - 2 + d)}Z"/>
    <path class="land-side" d="M${f(x + arch - 3.5)} ${f(y)}V${f(y - body + 18)}Q${f(x)} ${f(y - body + 6.5)} ${f(x - arch)} ${f(y - body + 18)}Q${f(x)} ${f(y - body + 4)} ${f(x + arch)} ${f(y - body + 18)}V${f(y)}Z"/>
    ${leaves}${townTower(x - half - CITY.tower, y)}${townTower(x + half, y)}`;
}

// Pretiles de un puente del sendero (delante del sendero, que pasa entre ellos; el tablero, el agua y la sombra los
// pinta el paisaje). b: centro y largo del paso recto (path-layout.js).
const RAIL = { w: 4, gap: 15, inset: 5, post: 7 };
export function bridgeRails(b) {
  const len = b.len - 2 * RAIL.inset;
  const y0 = b.y - len / 2;
  const rail = (x) => `<rect class="land-front bridge-rail" x="${f(x)}" y="${f(y0)}" width="${RAIL.w}" height="${f(len)}" rx="1"/>
      ${[y0, b.y - RAIL.post / 2, y0 + len - RAIL.post].map((y) => `<rect class="land-side bridge-rail" x="${f(x - 1)}" y="${f(y)}" width="${RAIL.w + 2}" height="${RAIL.post}" rx="1.5"/>`).join('')}`;
  return `<rect class="land-shade" x="${f(b.x + RAIL.gap + RAIL.w)}" y="${f(y0 + 3)}" width="3" height="${f(len)}"/>${rail(b.x - RAIL.gap - RAIL.w)}${rail(b.x + RAIL.gap)}`;
}
