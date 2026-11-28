// Guía de bienvenida: colocación de la tarjeta (nunca tapa lo señalado ni se sale de la pantalla).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coachPlacement, COACH_MARGIN } from '../app/js/ui/coach-place.js';
import { COACH_STEPS } from '../app/js/ui/coach.js';

const VIEW = { width: 390, height: 844 };
const CARD = { width: 320, height: 150 };

test('guía: con sitio debajo, la tarjeta va debajo del elemento y sin solaparlo', () => {
  const t = { top: 200, left: 100, width: 190, height: 80 };
  const p = coachPlacement(t, CARD, VIEW);
  assert.equal(p.side, 'below');
  assert.ok(p.top >= t.top + t.height);
});

test('guía: un elemento al pie (la pestaña Colección) lleva la tarjeta encima', () => {
  const t = { top: 780, left: 150, width: 90, height: 56 };
  const p = coachPlacement(t, CARD, VIEW);
  assert.equal(p.side, 'above');
  assert.ok(p.top + CARD.height <= t.top);
});

test('guía: la tarjeta nunca se sale de la pantalla en horizontal', () => {
  for (const left of [0, 20, 300, 380]) {
    const p = coachPlacement({ top: 300, left, width: 60, height: 60 }, CARD, VIEW);
    assert.ok(p.left >= COACH_MARGIN && p.left + CARD.width <= VIEW.width - COACH_MARGIN, `left=${left} → ${p.left}`);
  }
});

test('guía: tres pasos (el primero, en el medallón o en el pintor, donde esté «Tú»), una frase cada uno y sin «ayer» ni «mañana»', () => {
  assert.equal(new Set(COACH_STEPS.map((s, i) => s.group || i)).size, 3);
  assert.ok(COACH_STEPS[0].target.includes('.lore-spot.is-here'), 'el primer paso no señala el medallón cuando «Tú» está en él');
  for (const s of COACH_STEPS) assert.ok(s.text.length < 90 && !/ayer|mañana/i.test(s.text));
});
