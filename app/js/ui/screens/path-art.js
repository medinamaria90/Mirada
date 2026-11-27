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
const tower = (x, y, w, h) => {
  const dx = w * KX;
  const dy = w * KY;
  const merlons = [0, 1, 2].map((i) => `<rect class="land-front" x="${f(x + i * (w / 2.5))}" y="${f(y - h - 5)}" width="${f(w / 5)}" height="5"/>`).join('');
  return `<path class="land-top" d="M${f(x)} ${f(y - h)}H${f(x + w)}L${f(x + w + dx)} ${f(y - h - dy)}H${f(x + dx)}Z"/><path class="land-side" d="M${f(x + w)} ${f(y)}V${f(y - h)}L${f(x + w + dx)} ${f(y - h - dy)}V${f(y - dy)}Z"/><rect class="land-front" x="${f(x)}" y="${f(y - h)}" width="${f(w)}" height="${f(h)}"/>${merlons}<path class="land-window" data-lamp d="M${f(x + w / 2 - 2)} ${f(y - h + 16)}V${f(y - h + 11)}a2 2 0 0 1 4 0V${f(y - h + 16)}Z"/>`;
};
const fountain = (cx, y) => `<ellipse class="land-shade" cx="${f(cx)}" cy="${f(y + 2)}" rx="20" ry="5"/><ellipse class="land-side" cx="${f(cx)}" cy="${f(y)}" rx="16" ry="4.6"/><ellipse class="land-front fountain-rim" cx="${f(cx)}" cy="${f(y - 3)}" rx="16" ry="4.6"/><ellipse class="land-water" cx="${f(cx)}" cy="${f(y - 3)}" rx="12.6" ry="3.2"/><ellipse class="land-water-2" data-flow cx="${f(cx - 3)}" cy="${f(y - 3.6)}" rx="4" ry="1"/><rect class="land-front" x="${f(cx - 2)}" y="${f(y - 17)}" width="4" height="14"/><ellipse class="land-front" cx="${f(cx)}" cy="${f(y - 17)}" rx="7" ry="2.2"/><ellipse class="land-water-2" data-jet cx="${f(cx)}" cy="${f(y - 21)}" rx="1.6" ry="3.4"/>`;

// Caseta de «Información» en el borde de la plaza, a la derecha de la puerta (a la izquierda va la lápida de la primera
// época), apartada del botón «Tú» de la esquina: caseta con tejadillo y un letrero con la «i» dorada. Tocarla abre
// «Cómo se juega» (el botón transparente que la cubre lo pone path-signs.js con KIOSK).
export const KIOSK = { x: 268, y: 136, w: 32, h: 22 };
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
// Delante del sendero (y de la plaza): las dos torres de la puerta, el arco por el que pasa y la caseta.
const START_FRONT = `${fountain(FOUNTAIN.x, FOUNTAIN.y)}${kiosk(KIOSK)}${tower(GATE.left, GATE.y, GATE.tower, GATE.h)}${tower(GATE.right, GATE.y, GATE.tower, GATE.h)}
      <path class="land-top" d="M${GATE.left + GATE.tower} 66H${GATE.right}L${GATE.right + 4} 63.6H${GATE.left + GATE.tower + 4}Z"/>
      <path class="land-front" d="M${GATE.left + GATE.tower} 66H${GATE.right}V88Q${(GATE.left + GATE.tower + GATE.right) / 2} 70 ${GATE.left + GATE.tower} 88Z"/>
      <path class="land-side" d="M${GATE.left + GATE.tower} 88Q${(GATE.left + GATE.tower + GATE.right) / 2} 70 ${GATE.right} 88L${GATE.right} 85.5Q${(GATE.left + GATE.tower + GATE.right) / 2} 67.5 ${GATE.left + GATE.tower} 85.5Z"/>
      ${[0, 1, 2, 3].map((i) => `<rect class="land-front" x="${GATE.left + GATE.tower + 2 + i * 11}" y="62" width="5" height="4"/>`).join('')}`;

export const startArt = () => ({ back: START_BACK, front: START_FRONT });

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

// Puerta de piedra al entrar en cada época: dos pilares altos a los lados del sendero (van delante de él). El arco es el
// rótulo de la época (path-signs.js), que se apoya en sus remates; el seto que la flanquea lo pinta el paisaje.
// x, y: centro del paso, al pie. h: alto hasta el remate (el pie del rótulo queda en y - ARCH.lift, path-layout.js).
const GATE_ART = { half: 17, pillar: 10, h: 48, depth: 4 };
const pillar = (x, y) => {
  const { pillar: w, h, depth: d } = GATE_ART;
  return `<path class="land-side" d="M${f(x + w)} ${f(y)}V${f(y - h)}L${f(x + w + d)} ${f(y - h - d * KY / KX)}V${f(y - d * KY / KX)}Z"/>
      <rect class="land-front" x="${f(x)}" y="${f(y - h)}" width="${w}" height="${h}"/>
      <rect class="land-top" x="${f(x - 1.5)}" y="${f(y - h - 4)}" width="${w + 3}" height="4"/>`;
};
export function eraGate(x, y) {
  const { half, pillar: w } = GATE_ART;
  return `<ellipse class="land-shade" cx="${f(x + 5)}" cy="${f(y + 2)}" rx="${half + w + 8}" ry="4"/>${pillar(x - half - w, y)}${pillar(x + half, y)}`;
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
