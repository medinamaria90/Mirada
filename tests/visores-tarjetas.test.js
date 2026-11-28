// Los tres visores de tarjetas (presentación de época, cartel de tramo o rama e historia de pintor) se recorren igual: el
// mismo componente de navegación (ui/deck-nav.js), con los mismos controles, nombres accesibles y textos de botón.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

globalThis.document = globalThis.document || { documentElement: {} };
const src = (f) => readFileSync(new URL(`../app/${f}`, import.meta.url), 'utf8');
const VIEWERS = ['js/ui/screens/era-cards.js', 'js/ui/sign-cards.js', 'js/ui/story-core.js'];

test('visores de tarjetas: los tres montan la misma cabecera, las mismas barras y el mismo pie', () => {
  for (const f of VIEWERS) {
    const s = src(f);
    assert.match(s, /deck-nav\.js';/, `${f} no usa deck-nav.js`);
    assert.match(s, /headHtml\(/, `${f} no usa la cabecera común`);
    assert.match(s, /deckFootHtml\(|stepButtonsHtml\(/, `${f} no usa los botones comunes`);
    assert.doesNotMatch(s, /Descubre la época|Descubre más|era-dots|era-more|sc-skip|data-st="pause"/, `${f} conserva navegación propia`);
  }
  // El pie de la historia también sale de deck-nav (story-card.js).
  assert.match(src('js/ui/story-card.js'), /actionsHtml\(/);
});

test('visores de tarjetas: mismos nombres accesibles y mismos textos', async () => {
  const { headHtml, deckFootHtml, DECK_LABEL, DECK_ARIA } = await import('../app/js/ui/deck-nav.js');
  const { copyHtml } = await import('../app/js/ui/story-card.js');
  const head = headHtml({ total: 3, share: true });
  assert.equal((head.match(/class="deck-bar"/g) || []).length, 3);
  assert.match(head, new RegExp(`data-deck="close" aria-label="${DECK_ARIA.close}"`));
  assert.match(head, new RegExp(`data-deck="share" aria-label="${DECK_ARIA.share}"`));
  const foot = deckFootHtml();
  assert.match(foot, new RegExp(`data-deck="prev" aria-label="${DECK_ARIA.prev}"`));
  assert.match(foot, new RegExp(`data-deck="next" aria-label="${DECK_ARIA.next}"`));
  assert.match(foot, new RegExp(`deck-primary" data-deck="primary">${DECK_LABEL.next}<`));
  // La historia: el mismo «Seguir» en el mismo botón principal, y «Ir a las preguntas» de secundario.
  const story = copyHtml({ text: 'Hola' }, null, { last: false, questions: DECK_LABEL.questions });
  assert.match(story, new RegExp(`btn btn-primary deck-primary" data-deck="next">${DECK_LABEL.next}<`));
  assert.match(story, new RegExp(`btn deck-secondary" data-deck="questions">${DECK_LABEL.questions}<`));
  assert.deepEqual({ ...DECK_LABEL }, { next: 'Seguir', questions: 'Ir a las preguntas', skip: 'Saltar', start: 'Empezar', toPath: 'Volver al camino', back: 'Volver' });
});

test('historia de pintor: sin la insignia del rango en la cabecera', () => {
  assert.doesNotMatch(src('js/ui/story-viewer.js'), /sealHtml|seal\.js/);
});
