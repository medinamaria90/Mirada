// Piezas de la vida de paso del mapa: cada figura (paseantes, barcas, pájaros…) es un <span> con su dibujo que se
// mueve por el tramo con la Web Animations API (solo transform y opacity) y se quita al acabar.

// Mete una figura en el tramo: «under», bajo el sendero (barcas que pasan bajo el puente); si no, encima del
// sendero y por debajo de carteles y paradas.
export function spawn(scene, kind, markup, { under = false } = {}) {
  const el = document.createElement('span');
  el.className = `map-critter map-${kind}${under ? ' is-under' : ''}`;
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = markup;
  const trail = scene.li.querySelector('.path-trail');
  (under || !trail ? scene.svg : trail).after(el);
  return el;
}

// transform de un punto del SVG (x, y) en píxeles del tramo, con giro, volteo y el anclaje de la figura.
export function at(scene, x, y, { angle = 0, flip = false, anchor = '-50%, -50%' } = {}) {
  const [px, py] = scene.px(x, y);
  return `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) rotate(${angle.toFixed(1)}deg) scaleX(${flip ? -1 : 1}) translate(${anchor})`;
}

// Ángulo en pantalla (grados) de a hacia b, con el estirado del SVG.
export function heading(scene, a, b) {
  return (Math.atan2((b.y - a.y) * scene.sy, (b.x - a.x) * scene.sx) * 180) / Math.PI;
}

// Opacidad que aparece y se va fundida en las puntas del recorrido (t de 0 a 1).
export function fade(t, edge) {
  if (t <= 0 || t >= 1) return 0;
  return Math.min(1, t / edge, (1 - t) / edge);
}

// Puntos intermedios para que el fundido de las puntas tenga dónde apoyarse (un recorrido de dos puntos, recto).
const MIN_FRAMES = 12;
function densify(pts) {
  if (pts.length >= MIN_FRAMES) return pts;
  const out = [];
  const per = Math.ceil(MIN_FRAMES / (pts.length - 1));
  for (let i = 0; i < pts.length - 1; i++) {
    for (let k = 0; k < per; k++) out.push({ x: pts[i].x + ((pts[i + 1].x - pts[i].x) * k) / per, y: pts[i].y + ((pts[i + 1].y - pts[i].y) * k) / per });
  }
  return out.concat(pts[pts.length - 1]);
}

// Recorrido por puntos [{x, y}] a velocidad constante: keyframes con su offset según la distancia.
export function along(scene, path, { speed, edge = 0.12, turn = false, flip = null, anchor } = {}) {
  const pts = densify(path);
  const dist = [0];
  for (let i = 1; i < pts.length; i++) dist.push(dist[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = dist[dist.length - 1] || 1;
  const frames = pts.map((p, i) => {
    const q = pts[Math.min(i + 1, pts.length - 1)];
    const o = pts[Math.max(i - 1, 0)];
    const t = dist[i] / total;
    return {
      offset: t,
      transform: at(scene, p.x, p.y, { angle: turn ? heading(scene, o, q) : 0, flip: flip ?? false, anchor }),
      opacity: fade(t, edge),
    };
  });
  return { frames, duration: (total / speed) * 1000 };
}

export function play(el, frames, duration, opts = {}) {
  const anim = el.animate(frames, { duration, easing: 'linear', fill: 'both', ...opts });
  return anim.finished.catch(() => 'cancelado').finally(() => el.remove());
}

export const pick = (list) => list[Math.floor(Math.random() * list.length)];
export const between = ([a, b]) => a + Math.random() * (b - a);
