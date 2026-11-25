// Repaso «más machacón sin deprimir» (v12): días de gracia, cuadros fallados que vuelven, cuadro de
// repaso escondido en cada etapa, pintores dormidos, repaso de 5 y cierre del día. Sin navegador: el
// motor se prueba directamente y las pantallas, por el HTML que construyen.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// accentStyle y compañía leen variables CSS del documento: lo mínimo para que no haga falta navegador.
globalThis.document = { documentElement: {} };
globalThis.getComputedStyle = () => ({ getPropertyValue: () => '#000000' });
const { graceSavedText } = await import('../app/js/ui/screens/result.js');

test('racha a salvo: textos del resultado coherentes con los días de gracia', () => {
  assert.equal(graceSavedText(0), '');
  assert.equal(graceSavedText(1), 'Racha a salvo: te quedaba un día de gracia');
  assert.equal(graceSavedText(2), 'Racha a salvo: te quedaban dos días de gracia');
  for (const t of [graceSavedText(1), graceSavedText(2)]) {
    assert.doesNotMatch(t, /ayer|mañana/i);
  }
});

// ---------------------------------------------------------------- 2. Errores que vuelven
const { bigIndex } = await import('./helpers.js');
const { createRng } = await import('../app/js/engine/rng.js');
const { makeWhoQuestion, makeWhichQuestion, makeMovementQuestion, retryQuestion } = await import('../app/js/engine/questions.js');
const { planStage, createRound, answerRound, roundDone } = await import('../app/js/engine/planner.js');
const { emptyProgress } = await import('../app/js/engine/progress.js');
const { finishRound } = await import('../app/js/engine/finish.js');
const { updateFallados, falladoQuestion, oldestFallado, FALLADO_HITS } = await import('../app/js/engine/fallados.js');
const { makeSession, readSession } = await import('../app/js/state/session.js');

const big = bigIndex();
const workOf = (artistId, k = 0) => big.worksOf(artistId)[k];
const who = (w, seed = 1) => makeWhoQuestion(big, w, 0.3, createRng(`t${seed}`));

test('fallados: entra al fallar a la primera, el reintento acertado cuenta y sale al acertar dos veces', () => {
  const w = workOf('p11');
  const q = who(w);
  let list = updateFallados([], [{ q, correct: false, retry: false }], '2026-11-20');
  assert.deepEqual(list, [{ id: w.id, date: '2026-11-20', times: 1, hits: 0 }]);
  list = updateFallados(list, [{ q, correct: false, retry: true }], '2026-11-20');
  assert.equal(list[0].times, 1, 'el reintento fallado no es un fallo nuevo');
  list = updateFallados(list, [{ q, correct: true, retry: true }], '2026-11-20');
  assert.equal(list[0].hits, 1);
  // Otro fallo reinicia la cuenta de aciertos.
  list = updateFallados(list, [{ q, correct: false, retry: false }], '2026-11-21');
  assert.deepEqual(list[0], { id: w.id, date: '2026-11-21', times: 2, hits: 0 });
  for (let i = 0; i < FALLADO_HITS; i++) list = updateFallados(list, [{ q, correct: true, retry: false }], '2026-11-22');
  assert.deepEqual(list, [], 'sale al acertarse dos veces');
  // Lo que no cuenta (pintores aún no vistos) no entra.
  assert.deepEqual(updateFallados([], [{ q, correct: false, retry: false }], '2026-11-20', () => true), []);
});

test('reintento al final de la ronda: el mismo cuadro con otra mecánica', () => {
  const rng = createRng('retry');
  const w = workOf('p21', 1);
  const q1 = who(w);
  const r1 = retryQuestion(big, q1, rng);
  assert.equal(r1.type, 'which');
  assert.equal(r1.targetArtworkId, w.id);
  assert.equal(r1.options.length, 4);
  const q2 = makeWhichQuestion(big, w, 0.3, rng);
  const r2 = retryQuestion(big, q2, rng);
  assert.equal(r2.type, 'who');
  assert.equal(r2.artworkId, w.id);
  const q3 = makeMovementQuestion(big, w, 0.3, rng);
  const r3 = retryQuestion(big, q3, rng);
  assert.equal(r3.type, 'movement');
  assert.deepEqual(r3.options.map((o) => o.id).sort(), q3.options.map((o) => o.id).sort());
});

test('pregunta extra de un fallado: al final, como reintento (no cuenta para aciertos ni dominio)', () => {
  const plan = planStage(big, 'p13', 5);
  const old = workOf('p11', 4);
  const p = { ...emptyProgress(), fallados: [{ id: workOf('p12', 4).id, date: '2026-11-19', times: 1, hits: 0 }, { id: old.id, date: '2026-11-10', times: 2, hits: 1 }] };
  const extra = falladoQuestion(p, big, plan.questions, 5, () => true);
  assert.ok(extra, 'no hay pregunta extra');
  assert.equal(extra.type === 'which' ? extra.targetArtworkId : extra.artworkId, old.id, 'no es el más antiguo');
  assert.equal(oldestFallado(p, big, { accept: (w) => w.artistId !== 'p11' }).id, workOf('p12', 4).id);
  let round = createRound(plan.questions, [extra]);
  assert.equal(round.queue.length, plan.questions.length + 1);
  assert.equal(round.firstTry.length, plan.questions.length);
  assert.equal(round.queue.at(-1).retry, true);
  const answers = [];
  while (!roundDone(round)) {
    const item = round.queue[round.pos];
    const correct = item.q === extra ? false : true;
    round = answerRound(round, correct);
    answers.push({ q: item.q, correct, retry: item.retry, combo: 0 });
  }
  assert.equal(round.queue.length, plan.questions.length + 1, 'el extra fallado no se repite otra vez');
  assert.ok(round.firstTry.every((v) => v === true), 'el extra no cuenta para los aciertos');
  const out = finishRound(p, big, { kind: 'stage', artistId: 'p13', answers, firstTry: round.firstTry }, '2026-11-20');
  assert.equal(out.accuracy, 1);
  assert.equal(out.progress.stats.answered, plan.questions.length, 'el extra no cuenta en la precisión');
  assert.equal(out.progress.fallados.find((f) => f.id === old.id).times, 2, 'fallar el extra no suma otro fallo');
  assert.equal(out.progress.seen.p13, '2026-11-20');
  // La ronda guardada con el extra se puede retomar.
  const session = makeSession({ route: 'etapa-p13', title: 'P13', kind: 'stage', plan: { kind: 'stage', seed: 5, artistId: 'p13' } },
    { round: { ...createRound(plan.questions, [extra]), pos: plan.questions.length }, answers: [], xpLive: 0 }, 1000);
  const back = readSession({ session }, big, 2000);
  assert.ok(back && back.round.queue.at(-1).retry, 'la ronda con extra no se retoma');
});

// ---------------------------------------------------------------- 1. Cuadro de repaso en cada etapa
const { contrabandWork, contrabandArtist, worksBySrs, isDormant, lastSeen } = await import('../app/js/engine/review.js');
const { MIN_ROUND, subjectOf } = await import('../app/js/engine/planner.js');

function masteredProgress(dates) {
  const p = emptyProgress();
  for (const [id, { on, seen }] of Object.entries(dates)) {
    p.artists[id] = { plays: 1, best: 0.9, mastered: true, last: on };
    p.medals[`artist-${id}`] = on;
    if (seen) p.seen[id] = seen;
  }
  return p;
}

test('cuadro de repaso: pintor dominado hace más de 5 días que lleva más tiempo sin salir; si no, el de dominio más antiguo', () => {
  const today = '2026-11-24';
  const [a, b, c, d] = big.path;
  // Dominados hace 12, 9 y 2 días; b salió en una pregunta hace 1 día: toca a (más tiempo sin salir).
  let p = masteredProgress({ [a.id]: { on: '2026-11-12' }, [b.id]: { on: '2026-11-15', seen: '2026-11-23' }, [c.id]: { on: '2026-11-22' } });
  assert.equal(contrabandArtist(p, big, d.id, today).id, a.id);
  p.seen[a.id] = '2026-11-23';
  p.seen[b.id] = '2026-11-20';
  assert.equal(contrabandArtist(p, big, d.id, today).id, b.id);
  // Ninguno dominado hace más de 5 días: el de dominio más antiguo.
  p = masteredProgress({ [a.id]: { on: '2026-11-22' }, [b.id]: { on: '2026-11-21' } });
  assert.equal(contrabandArtist(p, big, d.id, today).id, b.id);
  // Solo pintores anteriores en el camino; en la primera etapa, nada.
  assert.equal(contrabandWork(p, big, a.id, today), null);
  assert.equal(contrabandWork(emptyProgress(), big, d.id, today), null);
  // El cuadro lo elige el repaso espaciado: el que más tiempo lleva vencido.
  const works = big.worksOf(b.id);
  p.srs[`art:${works[2].id}`] = { box: 2, due: '2026-11-10' };
  p.srs[`art:${works[0].id}`] = { box: 1, due: '2026-11-20' };
  assert.equal(contrabandWork(p, big, d.id, today), works[2].id);
  assert.deepEqual(worksBySrs(p, big, b.id).slice(0, 2).map((w) => w.id), [works[2].id, works[0].id]);
});

test('cuadro de repaso: va en una pregunta de repaso sin cambiar la ronda (tamaño, tipos, sin repetir cuadro)', () => {
  for (const artist of big.path.slice(2)) {
    const before = big.path.slice(0, big.pathIndex(artist.id));
    for (let seed = 1; seed <= 12; seed++) {
      const hint = big.worksOf(before[0].id)[seed % 6].id;
      const base = planStage(big, artist.id, seed);
      const plan = planStage(big, artist.id, seed, { review: [hint] });
      const subjects = plan.questions.map(subjectOf);
      assert.ok(subjects.includes(hint), `${artist.id}/${seed}: falta el cuadro de repaso`);
      assert.equal(new Set(subjects).size, subjects.length, 'se repite un cuadro');
      assert.ok(plan.questions.length >= MIN_ROUND);
      assert.equal(plan.questions.length, base.questions.length);
      assert.deepEqual(plan.questions.map((q) => q.type).sort(), base.questions.map((q) => q.type).sort());
      // (La de movimiento puede llevar a veces una obra suya no preguntada: no cuenta aquí.)
      const own = (qs) => qs.filter((q) => q.artistId === artist.id && q.type !== 'movement').map(subjectOf).sort();
      assert.deepEqual(own(plan.questions), own(base.questions), 'cambian las preguntas del pintor de la etapa');
      assert.ok(plan.questions.filter((q) => q.artistId === artist.id && !q.isNew && q.type !== 'movement').length <= 1, 'más de un cuadro recién visto');
    }
  }
  // Una obra que no es de un pintor anterior se ignora.
  const own = big.worksOf(big.path[3].id)[4].id;
  assert.deepEqual(planStage(big, big.path[3].id, 7, { review: [own] }).questions, planStage(big, big.path[3].id, 7).questions);
});

// ---------------------------------------------------------------- 5. Pintor dormido
const { renderPathMap, DORMANT_TEXT } = await import('../app/js/ui/screens/path-map.js');
const { readFileSync } = await import('node:fs');

function stageButton(html, id) {
  return html.match(new RegExp(`<button class="stage [^"]*" data-action="stage" data-id="${id}"[^]*?</button>`))?.[0] || '';
}

test('pintor dormido: dominado y sin salir en 7 días se apaga y pregunta «¿Lo recuerdas?»; al jugarlo vuelve', () => {
  const today = '2026-11-24';
  const [a, b, c] = big.path;
  const p = masteredProgress({ [a.id]: { on: '2026-11-17' }, [b.id]: { on: '2026-11-18' }, [c.id]: { on: '2026-11-10', seen: '2026-11-20' } });
  assert.equal(isDormant(p, a.id, today), true, '7 días');
  assert.equal(isDormant(p, b.id, today), false, '6 días');
  assert.equal(isDormant(p, c.id, today), false, 'salió en una pregunta hace 4 días');
  assert.equal(lastSeen(p, c.id), '2026-11-20');
  const html = renderPathMap({ index: big, today: () => today, store: { get: () => ({ progress: p }) } });
  const btnA = stageButton(html, a.id);
  assert.match(btnA, /class="stage is-dormant is-mastered"/);
  assert.match(btnA, /data-status="mastered"/, 'sigue dominado (nunca se bloquea)');
  assert.ok(btnA.includes(`<span class="stage-meta">${DORMANT_TEXT}</span>`));
  assert.ok(btnA.includes('stage-badge'), 'conserva el sello de dominado');
  assert.doesNotMatch(stageButton(html, b.id), /is-dormant|Lo recuerdas/);
  // Al jugar su ronda (aunque falle), vuelve a su estado y sigue dominado.
  const plan = planStage(big, a.id, 3);
  const answers = plan.questions.map((q) => ({ q, correct: false, retry: false, combo: 0 }));
  const after = finishRound(p, big, { kind: 'stage', artistId: a.id, answers, firstTry: answers.map(() => false) }, today).progress;
  assert.equal(isDormant(after, a.id, today), false);
  assert.equal(after.artists[a.id].mastered, true);
  const html2 = renderPathMap({ index: big, today: () => today, store: { get: () => ({ progress: after }) } });
  assert.doesNotMatch(stageButton(html2, a.id), /is-dormant/);
  // Colores por variable: el anillo apagado vive en brand.css (claro y las dos copias del oscuro).
  const brand = readFileSync(new URL('../app/css/brand.css', import.meta.url), 'utf8');
  assert.equal((brand.match(/--map-dormant:/g) || []).length, 3);
  assert.match(readFileSync(new URL('../app/css/main.css', import.meta.url), 'utf8'), /\.stage\.is-mastered\.is-dormant \.stage-dot \{[^}]*var\(--map-dormant\)/);
});

// ---------------------------------------------------------------- 6. Repaso de 5
const { review5Works, hasReview5, REVIEW5_MIN, REVIEW5_NAME } = await import('../app/js/engine/review.js');
const { planReview5 } = await import('../app/js/engine/planner.js');
const { parseRoute } = await import('../app/js/ui/router.js');

test('repaso de 5: fallados, después vencidos y después los más antiguos, solo de pintores dominados', () => {
  const today = '2026-11-24';
  const [a, b, c] = big.path;
  const p = masteredProgress({ [a.id]: { on: '2026-11-01' }, [b.id]: { on: '2026-11-02' } });
  p.artists[c.id] = { plays: 1, best: 0.5, mastered: false, last: '2026-11-20' };
  const wa = big.worksOf(a.id);
  const wb = big.worksOf(b.id);
  const wc = big.worksOf(c.id);
  assert.deepEqual(review5Works(p, big, today), [], 'sin cuadros vistos no hay repaso');
  assert.equal(hasReview5(p, big, today), false);
  p.srs[`art:${wa[0].id}`] = { box: 3, due: '2026-12-01' };
  p.srs[`art:${wa[1].id}`] = { box: 2, due: '2026-11-30' };
  assert.equal(hasReview5(p, big, today), false, `con menos de ${REVIEW5_MIN} no se ofrece`);
  p.srs[`art:${wb[0].id}`] = { box: 1, due: '2026-11-22' };
  p.srs[`art:${wb[1].id}`] = { box: 4, due: '2026-12-20' };
  p.srs[`art:${wc[0].id}`] = { box: 1, due: '2026-11-01' }; // pintor sin dominar: fuera
  p.srs[`art:${wa[2].id}`] = { box: 1, due: '2026-11-24' };
  p.fallados = [{ id: wb[1].id, date: '2026-11-23', times: 1, hits: 0 }, { id: wc[0].id, date: '2026-11-01', times: 1, hits: 0 }];
  const ids = review5Works(p, big, today);
  assert.deepEqual(ids, [wb[1].id, wb[0].id, wa[2].id, wa[1].id, wa[0].id]);
  assert.equal(hasReview5(p, big, today), true);
  const plan = planReview5(big, ids, 9);
  assert.equal(plan.kind, 'review5');
  assert.equal(plan.questions.length, 5);
  assert.deepEqual(plan.questions.map(subjectOf).sort(), ids.slice().sort());
  assert.deepEqual(parseRoute('#repaso5'), { name: 'review5' });
  assert.equal(REVIEW5_NAME, 'Repaso de 5');
  // Da XP y cuenta para meta y racha, sin tocar el dominio de nadie.
  const answers = plan.questions.map((q) => ({ q, correct: true, retry: false, combo: 1 }));
  const out = finishRound(p, big, { kind: 'review5', answers, firstTry: answers.map(() => true) }, today, { goal: 50 });
  assert.ok(out.xp > 0 && out.events.some((e) => e.type === 'goal') && out.events.some((e) => e.type === 'streak'));
  assert.deepEqual(out.progress.artists, p.artists);
  assert.equal(out.progress.fallados.find((f) => f.id === wb[1].id).hits, 1, 'el acierto cuenta para sacar el fallado');
  // La ronda a medias del repaso de 5 se puede retomar.
  const session = makeSession({ route: 'repaso5', title: REVIEW5_NAME, kind: 'review5', plan: { kind: 'review5', seed: 9 } },
    { round: createRound(plan.questions), answers: [], xpLive: 0 }, 1000);
  assert.equal(readSession({ session }, big, 2000)?.kind, 'review5');
});

// ---------------------------------------------------------------- 9. Cierre del día y botones del resultado
const { daySummary, listNames } = await import('../app/js/engine/closure.js');
const { renderResult } = await import('../app/js/ui/screens/result.js');

function renderResultHtml(progress, outcome, plan, opts = {}) {
  const el = { innerHTML: '', querySelector: () => null, addEventListener() {}, removeEventListener() {} };
  globalThis.window = { scrollTo() {}, matchMedia: () => ({ matches: true }) };
  globalThis.document = { documentElement: { classList: { contains: () => true } }, getElementById: () => null };
  const ctx = { index: big, today: () => '2026-11-24', store: { get: () => ({ progress, settings: { dailyGoal: 50 } }) }, audio: { sfx() {} } };
  renderResult(ctx, el, { plan, outcome, title: 'Repaso de 5', accent: '', firstTry: [true, true, true], ...opts });
  return el.innerHTML;
}

test('cierre del día: bloque «Hoy» con pintores y cuadros nuevos, «La próxima vez» y solo «Seguir»', () => {
  const today = '2026-11-24';
  const [a, b, c] = big.path;
  const p = masteredProgress({ [a.id]: { on: '2026-11-20' }, [b.id]: { on: today } });
  p.artists[b.id].since = today;
  p.artists[c.id] = { plays: 1, best: 0.6, mastered: false, last: today, since: today };
  p.collection = { [big.worksOf(a.id)[0].id]: '2026-11-20', [big.worksOf(b.id)[0].id]: today, [big.worksOf(c.id)[3].id]: today };
  const sum = daySummary(p, big, today);
  assert.deepEqual(sum.artists, [b.id, c.id]);
  assert.equal(sum.works.length, 2);
  assert.equal(sum.next.id, big.path[3].id, 'la próxima parada: la siguiente abierta del camino');
  assert.equal(listNames(['A', 'B', 'C']), 'A, B y C');
  const outcome = { xp: 60, score: 3, total: 3, accuracy: 1, mastered: true, events: [{ type: 'goal', goal: 50 }, { type: 'unlock', step: { type: 'artist', id: big.path[3].id }, artistId: big.path[3].id }] };
  const html = renderResultHtml(p, outcome, { kind: 'stage', artistId: c.id, seed: 3 }, { more: { label: 'Repaso de 5', to: 'repaso5' } });
  const hoy = html.match(/<section class="day-done"[^]*?<\/section>/)?.[0] || '';
  assert.ok(hoy.includes('<h2 id="day-done-h" class="event-kicker">Hoy</h2>'));
  // El pintor de la etapa ya sale en «Hoy has aprendido»: en «Hoy» solo los demás.
  assert.ok(hoy.includes(`Has conocido a ${big.artist(b.id).short}</p>`), hoy);
  assert.ok(hoy.includes('2 cuadros nuevos'));
  assert.equal((hoy.match(/ day-done-thumb /g) || []).length, 2);
  assert.ok(hoy.includes(`La próxima vez: <strong>${big.path[3].name}</strong>`));
  assert.doesNotMatch(hoy, /<button(?![^>]*data-zoom)/, 'el bloque «Hoy» no lleva botones (solo los cuadros, que se amplían)');
  assert.doesNotMatch(html, /ayer|mañana/i);
  const actions = html.match(/<div class="result-actions">[^]*?<\/div>\s*<\/main>/)?.[0] || '';
  assert.match(actions, /data-action="done"[^>]*>Seguir</);
  assert.doesNotMatch(actions, /Repetir|Repaso de 5|Repasar más/, 'en el cierre, sin llamadas a seguir jugando');
  assert.deepEqual([...actions.matchAll(/data-action="([a-z]+)"/g)].map((m) => m[1]), ['done', 'share'], 'solo «Seguir» y compartir');
  assert.doesNotMatch(html, /Siguiente etapa/, 'sin llamada a la siguiente etapa: va en «La próxima vez»');
});

test('resultado sin meta cumplida: sin bloque «Hoy» y con «Repaso de 5» cuando hay cuadros para él', () => {
  const p = masteredProgress({ [big.path[0].id]: { on: '2026-11-20' } });
  const outcome = { xp: 30, score: 2, total: 3, accuracy: 0.67, mastered: false, events: [{ type: 'streak', value: 4, grace: 1 }] };
  const html = renderResultHtml(p, outcome, { kind: 'review5', seed: 3 }, { more: { label: 'Repaso de 5', to: 'repaso5' } });
  assert.doesNotMatch(html, /day-done/);
  assert.match(html, /data-to="repaso5"[^>]*>[^]*?<span>Repaso de 5<\/span>/);
  assert.ok(html.includes('Racha a salvo: te quedaba un día de gracia'));
});

test('cierre del día con menos de la mitad de aciertos en una etapa: manda «Repetir» y «Volver al camino»', () => {
  const p = masteredProgress({ [big.path[0].id]: { on: '2026-11-20' } });
  p.artists[big.path[1].id] = { plays: 1, best: 0.3, mastered: false, last: '2026-11-24' };
  const outcome = { xp: 55, score: 1, total: 6, accuracy: 1 / 6, mastered: false, events: [{ type: 'goal', goal: 50 }] };
  const html = renderResultHtml(p, outcome, { kind: 'stage', artistId: big.path[1].id, seed: 2 });
  assert.match(html, /class="day-done"/);
  const actions = html.match(/<div class="result-actions">[^]*?<\/div>\s*<\/main>/)?.[0] || '';
  assert.match(actions, /btn-primary[^>]*data-action="go" data-to="etapa-[^"]+"[^>]*data-primary>[^]*?Repetir/);
  assert.match(actions, /data-action="done">Volver al camino/);
});
