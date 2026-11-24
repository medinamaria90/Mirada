// Personaje del camino (fase 1): un muñeco sencillo y propio en el estilo limpio del mapa, con una
// boina pequeña como guiño. Está en el sendero junto al nodo actual y respira (CSS); al dominar un
// pintor y volver a la portada, camina por el sendero hasta el nuevo nodo actual (≈1 s). Con
// movimiento reducido no se anima: aparece en su sitio. Sin ropa ni objetos todavía.

const CHARACTER_SIZE = 36;
export const WALK_MS = 1000;
const WALK_STEPS = 32;   // puntos del paseo (transform por fotograma, sin depender de offset-path)

// 36×36: cabeza redonda, boina ladeada, cuerpo simple sin género marcado, dos pies.
export function characterHtml() {
  return `<span class="path-character" aria-hidden="true"><svg class="pc" viewBox="0 0 36 36" width="${CHARACTER_SIZE}" height="${CHARACTER_SIZE}" focusable="false">
      <ellipse class="pc-shade" cx="18" cy="34" rx="9" ry="2"/>
      <path class="pc-body" d="M11 33V22a7 7 0 0 1 14 0v11Z"/>
      <rect class="pc-foot" x="12" y="31" width="5" height="3" rx="1.5"/><rect class="pc-foot" x="19" y="31" width="5" height="3" rx="1.5"/>
      <circle class="pc-head" cx="18" cy="13" r="7.5"/>
      <path class="pc-beret" d="M10.5 11.5C11 6 25 5 26.5 10.5c-5-1.4-11-1.2-16 1Z"/><circle class="pc-beret" cx="18.5" cy="6.4" r="1.2"/>
      <circle class="pc-eye" cx="15.5" cy="14" r="1"/><circle class="pc-eye" cx="20.5" cy="14" r="1"/>
    </svg></span>`;
}

// Fotogramas del paseo hasta el sitio final (0,0): desde (dx,dy), por el sendero: si el nodo anterior
// está en otro tramo, primero sube en vertical hasta la línea del tramo (yLine) y desde ahí la curva
// en S con tangentes verticales, que es como está dibujado el camino. Todo relativo al destino.
export function walkFrames(dx, dy, yLine = null) {
  const pts = [];
  const bend = yLine !== null && yLine > 0 && yLine < dy ? yLine : null;
  const straight = bend === null ? 0 : (dy - bend) / Math.max(1, dy);   // parte del recorrido en vertical
  for (let i = 0; i <= WALK_STEPS; i++) {
    const t = i / WALK_STEPS;
    if (bend !== null && t < straight) {
      pts.push({ x: dx, y: dy - (dy - bend) * (t / straight) });
      continue;
    }
    const u = bend === null ? t : (t - straight) / Math.max(1e-9, 1 - straight);
    const y0 = bend === null ? dy : bend;
    const ym = y0 / 2;
    const k = 1 - u;
    // Cúbica (dx,y0) → (0,0) con control en (dx,ym) y (0,ym).
    pts.push({ x: dx * (k * k * k + 3 * k * k * u), y: y0 * (k * k * k) + ym * (3 * k * k * u + 3 * k * u * u) });
  }
  return pts.map((p) => ({ transform: `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)` }));
}

let lastStep = null;

// Tras pintar la portada: si la parada actual ha cambiado desde la última vez (y no hay movimiento
// reducido), el personaje camina desde la anterior hasta la nueva. La primera vez, aparece sin más.
export function settleCharacter(root, { reduced = false } = {}) {
  const ch = root.querySelector('.path-character');
  const spot = ch?.closest('.stage-spot');
  const step = spot?.dataset.step || null;
  const from = lastStep && lastStep !== step ? root.querySelector(`.stage-spot[data-step="${lastStep}"]`) : null;
  lastStep = step;
  if (!ch || !from || reduced || typeof ch.animate !== 'function') return false;
  const a = from.getBoundingClientRect();
  const b = spot.getBoundingClientRect();
  const fromEra = from.closest('.path-era');
  const yLine = fromEra && fromEra !== spot.closest('.path-era') ? fromEra.getBoundingClientRect().top - b.top : null;
  ch.classList.add('is-walking');
  const anim = ch.animate(walkFrames(a.left - b.left, a.top - b.top, yLine), { duration: WALK_MS, easing: 'ease-in-out' });
  anim.onfinish = () => ch.classList.remove('is-walking');
  anim.oncancel = anim.onfinish;
  return true;
}

export function resetCharacter() {
  lastStep = null;
}
