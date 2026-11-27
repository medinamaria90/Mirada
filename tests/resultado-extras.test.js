// Resultado: sin franja «Hoy», el Repaso de 5 y el reto semanal se ofrecen al terminar una ronda
// (no el que se acaba de jugar) y el reto diario tiene 5 preguntas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { emptyProgress } from '../app/js/engine/progress.js';
import { dailyGrid } from '../app/js/engine/daily.js';
import { extraRounds } from '../app/js/ui/screens/result.js';

const here = dirname(fileURLToPath(import.meta.url));
const real = buildIndex(JSON.parse(readFileSync(join(here, '..', 'app', 'data', 'catalog.json'), 'utf8')));
const DAY = '2026-11-24';

// Por defecto, la guía ya propuso hoy el Cuadro del día (así no se cuela en las pruebas de las otras rondas).
function ctxWith(progress, { cuadro = false } = {}) {
  if (!cuadro && !progress.cuadroNudge) progress.cuadroNudge = DAY;
  return { index: real, store: { get: () => ({ progress }), update() {} }, today: () => DAY, dailyDay: () => DAY };
}

test('resultado: el Cuadro del día, pendiente, se propone como acción secundaria una vez al día y nunca tras una ronda floja', () => {
  const p = emptyProgress();
  assert.deepEqual(extraRounds(ctxWith(p, { cuadro: true }), { kind: 'stage' }).map((r) => r.to), ['cuadro-del-dia']);
  assert.deepEqual(extraRounds(ctxWith(p, { cuadro: true }), { kind: 'stage' }, { weak: true }), []);
  p.cuadros = { [DAY]: { n: 1, guesses: ['x'], won: true, tries: 1 } };
  assert.deepEqual(extraRounds(ctxWith(p, { cuadro: true }), { kind: 'stage' }), [], 'ya hecho');
  assert.equal(extraRounds(ctxWith(emptyProgress(), { cuadro: true }), { kind: 'stage' }).find((r) => r.to !== 'inicio').to, 'cuadro-del-dia');
});

function masteredAll() {
  const p = emptyProgress();
  for (const a of real.path) p.artists[a.id] = { plays: 1, best: 1, mastered: true, works: real.worksOf(a.id).map((w) => w.id) };
  for (const m of real.movements) { const s = real.stepsOf(m.id).find((x) => x.type === 'sala'); if (s) p.salas[m.id] = { plays: 1, best: 1, mastered: true }; }
  return p;
}

test('resultado: sin nada que repasar ni camino dominado no se ofrece ninguna otra ronda', () => {
  assert.deepEqual(extraRounds(ctxWith(emptyProgress()), { kind: 'stage' }), []);
});

test('resultado: con el camino dominado se ofrece el reto semanal, salvo si ya está hecho o es la ronda jugada', () => {
  const p = masteredAll();
  const ids = (plan) => extraRounds(ctxWith(p), plan).map((r) => r.to);
  assert.ok(ids({ kind: 'stage' }).includes('reto-semanal'));
  assert.ok(!ids({ kind: 'weekly' }).includes('reto-semanal'));
  p.weekly = { '2026-W48': { score: 10, total: 15 } };
  assert.ok(!ids({ kind: 'stage' }).includes('reto-semanal'));
});

test('reto semanal: una casilla por pregunta al compartir', () => {
  assert.equal(dailyGrid([true, false, true, true, true]), '🟩⬜🟩🟩🟩');
});

// ---------------------------------------------------------------- Acciones del resultado sin duplicados
const { renderResult } = await import('../app/js/ui/screens/result.js');
const { practiceAction } = await import('../app/js/ui/screens/result-actions.js');
const { REVIEW_NAME } = await import('../app/js/engine/review.js');

// Pintores dominados con cuadros ya vistos: hay material para repasar lo aprendido.
function withReview() {
  const p = emptyProgress();
  for (const a of real.path.slice(0, 3)) {
    p.artists[a.id] = { plays: 1, best: 1, mastered: true, last: '2026-11-20' };
    for (const w of real.worksOf(a.id)) p.collection[w.id] = '2026-11-20';
  }
  return p;
}

function resultHtmlOf(progress, plan, outcome, opts = {}) {
  const el = { innerHTML: '', querySelector: () => null, addEventListener() {}, removeEventListener() {} };
  globalThis.window = { scrollTo() {}, matchMedia: () => ({ matches: true }) };
  globalThis.document = { documentElement: { classList: { contains: () => true } }, getElementById: () => null };
  globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' });
  const ctx = { ...ctxWith(progress), store: { get: () => ({ progress, settings: { dailyGoal: 50 } }) }, audio: { sfx() {} } };
  renderResult(ctx, el, { plan, outcome, title: 'Ronda', accent: '', firstTry: [true, true, true], ...opts });
  return el.innerHTML;
}
const resultActions = (...args) => resultHtmlOf(...args).match(/<footer class="res-foot">[^]*?<\/footer>/)?.[0] || '';

test('resultado: tras dominar a un pintor, un solo botón principal (el siguiente paso) y «Repasar» una sola vez', () => {
  const p = withReview();
  const veronese = real.artist('veronese');
  const outcome = { xp: 60, score: 8, total: 8, accuracy: 1, mastered: true, events: [] };
  const actions = resultActions(p, { kind: 'stage', artistId: veronese.id, seed: 3 }, outcome);
  assert.ok((actions.match(/data-to="repaso"/g) || []).length <= 1, actions);
  assert.doesNotMatch(actions, /repaso5|Repaso de 5|Repasar lo aprendido/);
  assert.equal((actions.match(/data-primary/g) || []).length, 1, 'un solo botón principal');
  assert.match(actions, /Sigue: /, 'la parada abierta, como principal');
  assert.match(actions, /data-action="done"[^>]*><span>Volver al camino<\/span>/, '«Volver al camino» como secundario');
});

test('resultado: una sola acción para practicar, por prioridad (repetir y, si no, otra ronda), nunca la del principal', () => {
  const p = withReview();
  const ctx = ctxWith(p);
  assert.equal(practiceAction(ctx, { kind: 'stage' }, { retry: 'etapa-x' }).label, 'Repetir');
  assert.equal(practiceAction(ctx, { kind: 'stage' }).to, 'repaso');
  assert.equal(practiceAction(ctx, { kind: 'stage' }).label, REVIEW_NAME);
  assert.equal(practiceAction(ctx, { kind: 'srs' }), null, 'tras un repaso no se ofrece otro');
  assert.equal(practiceAction(ctx, { kind: 'stage' }, { prevKind: 'srs' }), null, 'nunca dos repasos seguidos');
  assert.equal(practiceAction(ctx, { kind: 'stage' }, { main: 'repaso' }), null, 'no repite el botón principal');
  assert.equal(practiceAction(ctx, { kind: 'stage' }, { closing: true }), null, 'al cerrar el día, sin llamadas a seguir jugando');
  assert.equal(practiceAction(ctx, { kind: 'stage' }, { duel: true }), null);
});

test('resultado: con 50-74 % «Repetir» va como secundario y el principal es el siguiente paso; con menos del 50 %, principal', () => {
  const p = withReview();
  const c = real.path[3];
  p.artists[c.id] = { plays: 1, best: 0.6, mastered: false, last: '2026-11-24' };
  const mid = resultActions(p, { kind: 'stage', artistId: c.id, seed: 3 }, { xp: 30, score: 5, total: 8, accuracy: 0.62, mastered: false, events: [] });
  assert.doesNotMatch(mid.match(/<button[^>]*data-primary[^]*?<\/button>/)[0], /Repetir/);
  assert.match(mid, /res-btn2[^>]*data-to="etapa-[^"]+"><span>Repetir<\/span>/);
  const low = resultActions(p, { kind: 'stage', artistId: c.id, seed: 3 }, { xp: 10, score: 2, total: 8, accuracy: 0.25, mastered: false, events: [] });
  assert.match(low.match(/<button[^>]*data-primary[^]*?<\/button>/)[0], /Repetir/);
});

test('resultado: al subir de rango, una línea con lo conseguido y lo que viene; desde el Perfil, «Volver al perfil»', () => {
  const p = withReview();
  const html = resultHtmlOf(p, { kind: 'stage', artistId: 'rafael', level: 2, seed: 3 }, { xp: 60, score: 8, total: 8, accuracy: 1, mastered: true, events: [{ type: 'rank', index: 2, name: 'Copista' }] }, { origin: 'perfil' });
  assert.match(html, /class="res-line res-rank">[^]*?¡Ya eres Copista! Ahora, a por Oficial de taller</);
  assert.match(html, /data-to="perfil" data-primary><span>Volver al perfil<\/span>/);
});

test('momento de dominar a un maestro: se queda hasta cerrarlo (X, «Seguir», Esc o fuera), sin cierre automático', () => {
  const src = readFileSync(join(here, '..', 'app', 'js', 'ui', 'match-moment.js'), 'utf8');
  assert.doesNotMatch(src, /setTimeout\(close/, 'sin temporizador que la cierre sola');
  assert.match(src, /class="match-close"[^>]*aria-label="Cerrar"/);
  assert.match(src, />Seguir<\/button>/);
  assert.match(src, /showModal\(\)/);
  assert.match(src, /'cancel'/, 'Esc la cierra');
  assert.match(src, /!ev\.target\.closest\('\.match-card'\)/, 'un toque fuera de la tarjeta la cierra');
});

test('resultado flojo: la «siguiente» que se abre con la mitad de aciertos se salta las paradas extra', () => {
  const [a, b, c] = real.path;
  const p = emptyProgress();
  p.artists[a.id] = { plays: 1, best: 1, mastered: true, last: '2026-11-20' };
  p.artists[b.id] = { plays: 1, best: 0.3, mastered: false, last: DAY };
  p.roster = { seed: 'done', known: [], extra: [c.id], fresh: [], told: [] };
  const outcome = { xp: 10, score: 1, total: 6, accuracy: 1 / 6, mastered: false, events: [] };
  const resultHtml = resultHtmlOf(p, { kind: 'stage', artistId: b.id, seed: 3 }, outcome);
  assert.match(resultHtml, /Con la mitad de aciertos se abre la siguiente/, 'la parada extra (siempre abierta) no cuenta como «la siguiente»');
});
