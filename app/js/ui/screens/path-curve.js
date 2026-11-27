// Curvas del sendero (puro, sin DOM): un trazo suave que pasa por puntos de paso, como un camino de tierra que deriva
// despacio. Cada tramo es una curva de Bézier cúbica con tangentes de la dirección media de sus vecinos (sin dobleces
// en las paradas). Un punto con `v` sale y llega en vertical; con `line`, el tramo hasta el siguiente es recto (la
// entrada de la época y el paso de un puente). Los tramos siempre suben: y decrece a lo largo de cada uno.

export const f = (n) => String(Math.round(n * 100) / 100);

const UP = { x: 0, y: -1 };
const unit = (dx, dy) => {
  const l = Math.hypot(dx, dy) || 1;
  return { x: dx / l, y: dy / l };
};
const line = (a, b) => ({ a, b, c1: a, c2: b });

// Dirección del sendero en el punto i: vertical si se pide; si no, la de sus vecinos.
function heading(pts, i) {
  if (pts[i].v) return UP;
  const prev = pts[Math.max(0, i - 1)];
  const next = pts[Math.min(pts.length - 1, i + 1)];
  return unit(next.x - prev.x, next.y - prev.y);
}

// Tramos del sendero que pasa por los puntos (de abajo arriba).
export function spline(pts) {
  const dirs = pts.map((_, i) => heading(pts, i));
  return pts.slice(0, -1).map((a, i) => {
    const b = pts[i + 1];
    const A = { x: a.x, y: a.y };
    const B = { x: b.x, y: b.y };
    if (a.line) return line(A, B);
    const k = Math.hypot(b.x - a.x, b.y - a.y) / 3;
    return { a: A, b: B, c1: { x: a.x + dirs[i].x * k, y: a.y + dirs[i].y * k }, c2: { x: b.x - dirs[i + 1].x * k, y: b.y - dirs[i + 1].y * k } };
  });
}

const bez = (p0, p1, p2, p3, t) => {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
};
export const at = (s, t) => ({ x: bez(s.a.x, s.c1.x, s.c2.x, s.b.x, t), y: bez(s.a.y, s.c1.y, s.c2.y, s.b.y, t) });

export function segmentsD(segs) {
  if (!segs.length) return '';
  return segs.reduce((d, s) => `${d}C${f(s.c1.x)} ${f(s.c1.y)} ${f(s.c2.x)} ${f(s.c2.y)} ${f(s.b.x)} ${f(s.b.y)}`, `M${f(segs[0].a.x)} ${f(segs[0].a.y)}`);
}

// x del sendero a la altura y.
export function roadX(segs, y) {
  const s = segs.find((g) => y <= g.a.y && y >= g.b.y) || (y > segs[0].a.y ? segs[0] : segs[segs.length - 1]);
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (at(s, mid).y > y) lo = mid; else hi = mid;
  }
  return at(s, (lo + hi) / 2).x;
}
