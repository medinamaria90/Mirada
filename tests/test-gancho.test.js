// Test de cultura pictórica (app/test/): las preguntas fijas sobre el catálogo real, la bolsa por
// tramos generada del catálogo y el sorteo de cada partida, la regla adaptativa con jugadores
// simulados, la puntuación acumulada, el percentil y el nivel. Sin navegador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { realIndex, realCatalogJson, W } from './helpers-real.js';
import { bigIndex, sampleIndex } from './helpers.js';
import { buildIndex } from '../app/js/engine/catalog.js';
import { createRng } from '../app/js/engine/rng.js';
import { buildBolsa, shownWorks, TIER_CUTS, tierForScore } from '../app/js/test/bolsa.js';
import { drawGame, startHistory, markSeen, MIN_PER_KIND, MIN_ERAS, MIN_SPANISH as MIN_SPANISH_PER_TIER, RECENT_GAMES, HISTORY_KEEP } from '../app/js/test/sorteo.js';
import {
  TIERS, PER_TIER, BLOCK, UP_FROM, STOP_BELOW, MAX_QUESTIONS, KINDS,
  createTest, answer, advance, finish, summary, simulate, perfectScore, isAnswered,
} from '../app/js/test/motor.js';
import { percentileFor, levelForScore, TEST_LEVELS, buildResult, shareText, PERCENTILE_BANDS, GRID_OK, GRID_OFF } from '../app/js/test/resultado.js';
import { validateBank, viewOf, prefixImages } from '../app/js/test/preguntas.js';
import { similarity } from '../app/js/engine/questions.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bank = JSON.parse(readFileSync(join(root, 'app', 'test', 'preguntas.json'), 'utf8'));
const html = readFileSync(join(root, 'app', 'test', 'index.html'), 'utf8');
const adjustments = JSON.parse(readFileSync(join(root, 'app', 'test', 'tramos.json'), 'utf8'));
const index = realIndex();
const questions = bank.questions;
const MIN_SPANISH = 6;

// Generador determinista para los jugadores simulados (sin Math.random: resultados repetibles).
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

test('preguntas fijas: 40 válidas sobre el catálogo real, 8 por tramo, sin spoilers', () => {
  assert.deepEqual(validateBank(bank, index), []);
  assert.equal(questions.length, MAX_QUESTIONS);
  assert.equal(TIERS.length * PER_TIER, MAX_QUESTIONS);
  for (const t of TIERS) assert.equal(questions.filter((q) => q.tier === t.id).length, PER_TIER, `tramo ${t.name}`);
  for (const q of questions) {
    assert.ok(index.artwork(q.artwork), `${q.id}: obra ${q.artwork}`);
    assert.ok(q.options.includes(q.answer), `${q.id}: la respuesta está entre las opciones`);
    assert.notEqual(index.artwork(q.artwork).spoiler, true, `${q.id}: sin firma visible`);
  }
});

test('preguntas fijas: mezcla de mecánicas y de épocas; españoles en todos los tramos', () => {
  for (const t of TIERS) {
    const kinds = new Set(questions.filter((q) => q.tier === t.id).map((q) => q.kind));
    assert.equal(kinds.size, KINDS.length, `tramo ${t.name}: las tres mecánicas`);
  }
  const movementOf = (q) => index.artist(index.artwork(q.artwork).artistId).movementId;
  assert.equal(new Set(questions.map(movementOf)).size, index.movements.filter((m) => !m.branch).length, 'todas las épocas del camino');
  const spanish = questions.filter((q) => index.artist(index.artwork(q.artwork).artistId).country === 'España');
  assert.ok(spanish.length >= MIN_SPANISH, `${spanish.length} preguntas con pintor español`);
  for (const t of TIERS) assert.ok(spanish.some((q) => q.tier === t.id), `tramo ${t.name} con algún español`);
});

test('vista de una pregunta: movimiento con periodo, «¿Cuál?» con 4 miniaturas, rutas desde app/test/', () => {
  const idx = prefixImages(realIndex(), '../');
  const mov = questions.find((q) => q.kind === 'movement');
  const v = viewOf(idx, mov);
  assert.equal(v.prompt, '¿De qué movimiento es?');
  for (const o of v.options) assert.match(o.detail, /s\. |\d{4}/, `${o.label}: periodo`);
  assert.match(v.artwork.img, /^\.\.\/img\//);
  const which = questions.find((q) => q.kind === 'which');
  const w = viewOf(idx, which);
  assert.equal(w.options.length, 4);
  assert.ok(w.options.every((o) => o.artwork && o.artwork.thumb && o.artwork.thumb.src.startsWith('../img/s/')), 'miniaturas del atlas');
  assert.match(w.prompt, /^¿Cuál es de /);
  const who = viewOf(idx, questions.find((q) => q.kind === 'who'));
  assert.equal(who.prompt, '¿Quién lo pintó?');
  assert.equal(who.options.find((o) => o.id === who.answer).label, who.answerText);
});

test('regla del bloque: 3-4 sube, 2 repite, 0-1 para; y «Ver mi resultado» en cualquier momento', () => {
  let s = createTest(questions);
  assert.equal(s.tier, 1);
  const play = (st, hits) => {
    for (let i = 0; i < BLOCK; i++) {
      const q = st.current;
      st = advance(answer(st, i < hits ? q.answer : q.options.find((o) => o !== q.answer)));
    }
    return st;
  };
  s = play(s, UP_FROM);
  assert.equal(s.tier, 2, 'con 3 aciertos sube');
  s = play(s, STOP_BELOW);
  assert.equal(s.tier, 2, 'con 2 repite el tramo');
  assert.equal(s.used[2], BLOCK + 1, 'sigue con las 4 siguientes del mismo tramo');
  s = play(s, STOP_BELOW);
  assert.equal(s.tier, 3, 'tramo agotado con 2: sube');
  s = play(s, STOP_BELOW - 1);
  assert.equal(s.status, 'done');
  assert.equal(s.reason, 'stop');
  assert.equal(summary(s).asked, 4 * BLOCK);
  // Parcial a mitad de bloque.
  let p = createTest(questions);
  p = advance(answer(p, p.current.answer));
  assert.equal(isAnswered(p), false);
  p = finish(p);
  assert.equal(p.status, 'done');
  assert.equal(p.reason, 'user');
  assert.deepEqual([summary(p).asked, summary(p).correct, summary(p).score], [1, 1, 1]);
  // Responder dos veces no cuenta dos veces.
  let d = createTest(questions);
  d = answer(answer(d, d.current.answer), d.current.answer);
  assert.equal(d.answers.length, 1);
});

test('jugador perfecto: llega al friki, agota el banco con 24 preguntas y suma el máximo, sin pausas', () => {
  const { state } = simulate(questions, () => true);
  const s = summary(state);
  assert.equal(s.top.key, 'friki');
  assert.equal(s.reason, 'bank');
  assert.equal(s.asked, TIERS.length * BLOCK + BLOCK);
  assert.equal(s.correct, s.asked);
  assert.equal(s.score, perfectScore(questions));
  assert.equal(s.score, BLOCK * TIERS.reduce((n, t) => n + t.points, 0) + BLOCK * TIERS[TIERS.length - 1].points);
  // Quien repite dos bloques de cada tramo llega al máximo (40 preguntas) de un tirón: nunca hay pausa.
  let slow = createTest(questions);
  while (slow.status !== 'done') {
    assert.equal(slow.status, 'playing', 'el test no se para a preguntar');
    const q = slow.current;
    const hit = (questions.filter((x) => x.tier === q.tier).indexOf(q) % BLOCK) < STOP_BELOW;
    slow = advance(answer(slow, hit ? q.answer : q.options.find((o) => o !== q.answer)));
  }
  assert.equal(summary(slow).asked, MAX_QUESTIONS);
  assert.equal(MAX_QUESTIONS, 40, 'la portada dice «o a las 40 preguntas»');
  const r = buildResult(s, perfectScore(questions));
  assert.equal(r.level, TEST_LEVELS[TEST_LEVELS.length - 1]);
  assert.equal(r.percentile, 99);
  assert.equal(r.grid, GRID_OK.repeat(TIERS.length));
});

test('jugador al tuntún: se para en 8 preguntas o menos, con percentil bajo', () => {
  // Siempre la primera opción: el orden de las respuestas en el banco le da 1 acierto en el fácil.
  const first = simulate(questions, (q) => q.options[0]);
  assert.equal(summary(first.state).asked, BLOCK);
  assert.equal(first.state.reason, 'stop');
  assert.ok(buildResult(summary(first.state), perfectScore(questions)).percentile <= 15);
  // Al azar (1 de 4), 300 semillas: casi todos se paran en 8 o menos y con percentil bajo.
  let short = 0;
  let low = 0;
  const N = 300;
  for (let seed = 1; seed <= N; seed++) {
    const r = rng(seed);
    const { state } = simulate(questions, () => r() < 0.25);
    const s = summary(state);
    if (s.asked <= 2 * BLOCK) short++;
    if (buildResult(s, perfectScore(questions)).percentile <= 35) low++;
  }
  // Pasar un bloque al azar (≥ 2 de 4 con p = 0,25) ocurre el 26 % de las veces; pasar dos, el 7 %.
  assert.ok(short >= N * 0.88, `${short} de ${N} se paran en ≤ 8`);
  assert.ok(low >= N * 0.95, `${low} de ${N} con percentil ≤ 35`);
});

test('jugador medio: se para en el tramo medio o difícil, con percentil intermedio', () => {
  // Acierta casi todo lo famoso, la mitad de lo medio y poco de lo difícil.
  const skill = { 1: 0.95, 2: 0.55, 3: 0.3, 4: 0.2, 5: 0.15 };
  const tops = { media: 0, dificil: 0, otros: 0 };
  const pcts = [];
  const N = 300;
  for (let seed = 1; seed <= N; seed++) {
    const r = rng(seed);
    const { state } = simulate(questions, (q) => r() < skill[q.tier]);
    const s = summary(state);
    tops[s.top.key === 'media' || s.top.key === 'dificil' ? s.top.key : 'otros']++;
    pcts.push(buildResult(s, perfectScore(questions)).percentile);
  }
  assert.ok(tops.media + tops.dificil >= N * 0.8, `se paran en media/difícil: ${JSON.stringify(tops)}`);
  pcts.sort((a, b) => a - b);
  const median = pcts[Math.floor(N / 2)];
  assert.ok(median >= 30 && median <= 75, `percentil mediano ${median}`);
});

test('puntuación acumulada: cada acierto suma los puntos de su tramo (1-5); ver más preguntas suma más', () => {
  assert.deepEqual(TIERS.map((t) => t.points), [1, 2, 3, 4, 5]);
  // Quien pasa todo con 3 de 4 (y llega al friki) suma más que quien se queda en el fácil con 4 de 4.
  const steady = summary(simulate(questions, (q) => (questions.filter((x) => x.tier === q.tier).indexOf(q) % BLOCK) < UP_FROM).state);
  let early = createTest(questions);
  for (let i = 0; i < 20; i++) early = advance(answer(early, early.current.answer));
  const brief = summary(finish(early));
  assert.ok(steady.asked > BLOCK && steady.score > 4, `${steady.score} puntos en ${steady.asked} preguntas`);
  assert.ok(brief.score > steady.score / 2);
  // Un acierto en el friki vale 5; en el fácil, 1.
  let s = createTest(questions);
  s = advance(answer(s, s.current.answer));
  assert.equal(summary(s).score, 1);
});

test('percentil: monótono con la puntuación, acotado entre 1 y 99, bandas de la calibración en sus extremos', () => {
  // Bandas de docs/eval/reconocimiento-fuentes.md: contiguas, crecientes, de 0 a 120.
  assert.equal(PERCENTILE_BANDS[0][0], 0);
  assert.equal(PERCENTILE_BANDS[PERCENTILE_BANDS.length - 1][1], perfectScore(questions), 'la última banda acaba en el máximo honesto (80)');
  for (let i = 0; i < PERCENTILE_BANDS.length; i++) {
    const [lo, hi, p0, p1] = PERCENTILE_BANDS[i];
    assert.ok(hi > lo && p1 > p0, `banda ${i}`);
    assert.equal(percentileFor(lo), p0, `inicio de la banda ${lo}-${hi}`);
    assert.equal(percentileFor(hi), p1, `final de la banda ${lo}-${hi}`);
    if (i) assert.equal(lo, PERCENTILE_BANDS[i - 1][1] + 1, 'bandas contiguas');
  }
  // Cortes del documento (para 120) reescalados a 80: 0-2, 3-9, 10-22, 23-33, 34-46, 47-63, 64-80.
  assert.deepEqual([0, 2, 3, 9, 10, 22, 23, 33, 34, 46, 47, 63, 64, 80].map(percentileFor), [1, 12, 13, 47, 48, 75, 76, 88, 89, 92, 93, 96, 97, 99]);
  let prev = 0;
  for (let score = 0; score <= 130; score++) {
    const p = percentileFor(score);
    assert.ok(p >= prev, `percentil(${score}) = ${p} < ${prev}`);
    assert.ok(p >= 1 && p <= 99);
    prev = p;
  }
  assert.equal(percentileFor(-5), percentileFor(0));
  assert.equal(percentileFor(perfectScore(questions)), 99, 'el jugador perfecto llega al 99 %');
});

test('nivel del test: nombres propios («Mirada…»), monótono con la puntuación, de principiante a experta', () => {
  const max = perfectScore(questions);
  assert.equal(levelForScore(0, max).name, TEST_LEVELS[0]);
  assert.equal(levelForScore(max, max).name, TEST_LEVELS[TEST_LEVELS.length - 1]);
  let prev = -1;
  for (let score = 0; score <= max; score++) {
    const lv = levelForScore(score, max);
    assert.ok(TEST_LEVELS.includes(lv.name), lv.name);
    assert.ok(lv.index >= prev);
    prev = lv.index;
  }
  assert.equal(new Set(TEST_LEVELS).size, TEST_LEVELS.length);
});

test('resultado y texto para compartir: «n de m», nivel, percentil, cuadrados y enlace', () => {
  const { state } = simulate(questions, (q) => q.tier === 1);
  const r = buildResult(summary(state), perfectScore(questions));
  assert.equal(r.asked, 2 * BLOCK);
  assert.equal(r.correct, BLOCK);
  assert.equal([...r.grid].length, TIERS.length);
  assert.ok(r.grid.endsWith(GRID_OFF.repeat(3)));
  const text = shareText({ ...r, percentile: 78 }, 'https://mirada.onrender.com/test/');
  assert.equal(text, 'Sfumato · Sé más de pintura que el 78 % de la gente. ¿Y tú?\nhttps://mirada.onrender.com/test/');
  assert.equal(shareText({ correct: 3, asked: 4, percentile: 15 }, 'https://x/test/'), 'Sfumato · He acertado 3 de 4 en el test de pintura. ¿Y tú?\nhttps://x/test/', 'con un percentil bajo, los aciertos');
  assert.equal(shareText({ correct: 3, asked: 4 }, 'https://x/test/'), 'Sfumato · He acertado 3 de 4 en el test de pintura. ¿Y tú?\nhttps://x/test/', 'sin percentil, los aciertos');
  assert.ok(text.endsWith('https://mirada.onrender.com/test/'));
  assert.doesNotMatch(text, /\b(ayer|mañana)\b/i);
  assert.equal(advance(state), state, 'un test terminado no se mueve');
});

test('index.html: SEO y vista previa (título, descripción, canonical, Open Graph, Twitter), sin recursos remotos', () => {
  assert.match(html, /<html lang="es">/);
  assert.match(html, /<title>¿Distinguirías un Velázquez de un Murillo\?/);
  assert.match(html, /<meta name="description" content="[^"]{50,}">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/sfumato\.dibulios\.com\/test\/">/);
  for (const p of ['og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'twitter:card', 'twitter:image']) {
    assert.ok(html.includes(`"${p}"`), p);
  }
  assert.match(html, /og:image" content="https:\/\/sfumato\.dibulios\.com\/test\/portada\.jpg"/);
  assert.match(html, /<h1[^>]*>¿Distinguirías un Velázquez de un Murillo\?<\/h1>/, 'texto real en el HTML');
  assert.match(html, /o a las 40 preguntas/);
  assert.doesNotMatch(html, /Cuadros de verdad|Sin registro|según cómo vayas/i, 'sin frases de folleto');
  assert.doesNotMatch(html, /\b(confirm|alert|prompt)\(/, 'sin diálogos del navegador');
  assert.match(html, /id="test-leave"[\s\S]*¿Dejar el test\?[\s\S]*data-action="leave-stay">Seguir jugando<[\s\S]*data-action="leave-go">Salir</, 'hoja propia para salir');
  // Sin recursos remotos: las URL absolutas solo en metadatos (canonical, OG), nunca en lo que se carga.
  for (const m of html.matchAll(/<(?:script|img|link)\b[^>]*>/g)) {
    if (m[0].includes('rel="canonical"')) continue;
    const url = /(?:src|href)="([^"]+)"/.exec(m[0]);
    if (url) assert.doesNotMatch(url[1], /^(https?:)?\/\//, m[0]);
  }
  assert.doesNotMatch(html, /\b(ayer|mañana)\b/i);
});

// ---------------------------------------------------------------- Bolsa por tramos y sorteo

const bolsa = buildBolsa(index, { fixed: questions, adjustments });
const MIN_POOL = 24;
const SEEDS = 60;
const isSpanish = (q) => index.artist(index.artwork(q.artwork).artistId).country === 'España';
const workOf = (id) => index.artwork(id);

// Comprueba una candidata o pregunta sorteada contra el catálogo (lo que no mira validateBank).
function assertPlayable(q, idx = index) {
  const work = idx.artwork(q.artwork);
  assert.ok(work, `${q.id}: obra ${q.artwork}`);
  assert.ok(KINDS.includes(q.kind), `${q.id}: mecánica`);
  assert.equal(new Set(q.options).size, 4, `${q.id}: 4 opciones distintas`);
  assert.ok(q.options.includes(q.answer), `${q.id}: la respuesta está entre las opciones`);
  for (const id of shownWorks(q)) {
    const w = idx.artwork(id);
    assert.ok(w, `${q.id}: obra en pantalla ${id}`);
    assert.notEqual(w.spoiler, true, `${q.id}: ${id} lleva la firma`);
    // Atribución dudosa: solo en la fija t38, de movimiento (la época no depende del autor).
    if (w.attributed) assert.ok(q.kind === 'movement' && questions.some((f) => f.id === q.id), `${q.id}: ${id} es de atribución dudosa`);
  }
  const artist = idx.artist(work.artistId);
  if (q.kind === 'who') {
    assert.equal(q.answer, artist.id);
    for (const id of q.options) assert.ok(idx.artist(id), `${q.id}: pintor ${id}`);
  }
  if (q.kind === 'movement') {
    assert.equal(q.answer, artist.movementId);
    for (const id of q.options) assert.ok(idx.movement(id), `${q.id}: movimiento ${id}`);
  }
  if (q.kind === 'which') {
    assert.equal(q.answer, q.artwork);
    assert.equal(new Set(q.options.map((id) => idx.artwork(id).artistId)).size, 4, `${q.id}: cuatro pintores distintos`);
  }
  assert.ok(typeof q.hint === 'string' && q.hint.trim() && !/\b(ayer|mañana)\b/i.test(q.hint), `${q.id}: pista`);
}

test('bolsa: cada tramo con al menos 24 candidatas, las tres mecánicas y algún español; todas las obras clasificadas', () => {
  for (const t of TIERS) {
    const pool = bolsa.byTier[t.id];
    assert.ok(pool.length >= MIN_POOL, `tramo ${t.name}: ${pool.length} candidatas`);
    for (const k of KINDS) assert.ok(pool.filter((c) => c.kind === k).length >= 2 * MIN_PER_KIND, `tramo ${t.name}: pocas de ${k}`);
    assert.ok(new Set(pool.map((c) => c.movementId)).size >= MIN_ERAS, `tramo ${t.name}: pocas épocas`);
    assert.ok(pool.some((c) => c.spanish), `tramo ${t.name}: sin españoles`);
  }
  // Toda obra que puede preguntarse (sin firma ni atribución dudosa) y tiene pista (suya o de su pintor) está en
  // algún tramo; las nuevas del catálogo grande sin ninguna pista esperan a que se escriba.
  const inBolsa = new Set(bolsa.candidates.map((c) => c.artwork));
  const excluded = new Set(adjustments.excluir || []);
  for (const w of index.artworks) {
    if (w.spoiler || w.attributed || excluded.has(w.id) || !w.look && !index.artist(w.artistId).hint) continue;
    assert.ok(inBolsa.has(w.id), `${w.id} (${w.title}) sin clasificar`);
  }
  assert.equal(bolsa.byId.size, bolsa.candidates.length, 'ids únicos');
});

test('bolsa: todo id existe, nada con firma ni atribución dudosa, respuestas correctas y reservas de miniaturas del mismo pintor', () => {
  for (const c of bolsa.candidates) {
    assertPlayable(c);
    for (const [i, slot] of (c.slots || []).entries()) {
      const artistId = workOf(c.options[i]).artistId;
      for (const id of slot) {
        assert.ok(workOf(id), `${c.id}: reserva ${id}`);
        assert.equal(workOf(id).artistId, artistId, `${c.id}: la reserva ${id} es de otro pintor`);
        assert.ok(!workOf(id).spoiler && !workOf(id).attributed, `${c.id}: reserva ${id} con firma o dudosa`);
      }
    }
  }
});

test('bolsa: las 40 fijas siguen en su tramo (con sus opciones) y sus obras también; tramos.json manda', () => {
  const forced = adjustments.forzar || {};
  for (const q of questions) {
    const c = bolsa.byId.get(q.id);
    assert.ok(c, `${q.id} en la bolsa`);
    assert.equal(c.tier, q.tier);
    assert.deepEqual(c.options, q.options);
    assert.equal(c.hint, q.hint);
    for (const other of bolsa.candidates.filter((x) => x.artwork === q.artwork && x.id !== q.id)) {
      const want = forced[`${other.artwork}:${other.kind}`] || forced[other.artwork] || q.tier;
      assert.equal(other.tier, want, `${other.id}: la obra de ${q.id} fuera de su tramo`);
    }
  }
  for (const [id, tier] of Object.entries(forced)) {
    const [work, kind] = id.split(':');
    const list = bolsa.candidates.filter((c) => c.artwork === work && (!kind || c.kind === kind) && c.source !== 'fija');
    assert.ok(list.length, `ajuste ${id} sin candidatas`);
    for (const c of list) assert.equal(c.tier, tier, `ajuste ${id}`);
  }
  // Las de regla llevan el tramo de su puntuación, y los cortes van en orden.
  for (let i = 1; i < TIER_CUTS.length; i++) assert.ok(TIER_CUTS[i] > TIER_CUTS[i - 1]);
  for (const c of bolsa.candidates.filter((x) => x.source === 'regla')) assert.equal(c.tier, tierForScore(c.score), c.id);
  // Excluir quita la obra entera o solo una mecánica.
  const w = bolsa.candidates.find((c) => c.source === 'regla').artwork;
  const without = buildBolsa(index, { fixed: questions, adjustments: { excluir: [w, `${W('a167')}:which`] } });
  assert.ok(!without.candidates.some((c) => c.artwork === w));
  assert.ok(!without.byId.has(`which-${W('a167')}`) && without.candidates.some((c) => c.artwork === W('a167')));
});

test('bolsa: la dificultad crece con los tramos (obras menos famosas y distractores más parecidos arriba)', () => {
  const rule = bolsa.candidates.filter((c) => c.source === 'regla');
  const mean = (list, f) => list.reduce((n, c) => n + f(c), 0) / list.length;
  const fame = TIERS.map((t) => mean(rule.filter((c) => c.tier === t.id), (c) => workOf(c.artwork).fame));
  const shown = fame.map((f) => f.toFixed(2)).join(' · ');
  for (let i = 1; i < fame.length; i++) assert.ok(fame[i] <= fame[i - 1] + 0.05, `fama media por tramo ${shown}`);
  assert.ok(fame[0] > 2.8 && fame[4] < 1.8, `fama media por tramo ${shown}`);
  const near = (c) => c.options.filter((id) => id !== c.answer).map((id) => similarity(index, index.artist(workOf(c.artwork).artistId), index.artist(c.kind === 'who' ? id : workOf(id).artistId)));
  const sim = TIERS.map((t) => mean(rule.filter((c) => c.tier === t.id && c.kind === 'who'), (c) => near(c).reduce((n, s) => n + s, 0) / 3));
  assert.ok(sim[4] > sim[0], `parecido medio de los distractores por tramo ${sim.map((s) => s.toFixed(2)).join(' · ')}`);
});

test('sorteo: 8 por tramo con mezcla de mecánicas y épocas, un español por tramo, sin repetir obra; motor y máximo de 80 intactos', () => {
  for (let seed = 1; seed <= SEEDS; seed++) {
    const game = drawGame(bolsa, createRng(seed), []);
    assert.deepEqual(validateBank({ questions: game }, index), [], `semilla ${seed}`);
    assert.deepEqual(game.map((q) => q.tier), TIERS.flatMap((t) => Array(PER_TIER).fill(t.id)), 'en orden de tramo');
    for (const t of TIERS) {
      const list = game.filter((q) => q.tier === t.id);
      for (const k of KINDS) assert.ok(list.filter((q) => q.kind === k).length >= MIN_PER_KIND, `semilla ${seed}, tramo ${t.name}: ${k}`);
      assert.ok(new Set(list.map((q) => index.artist(workOf(q.artwork).artistId).movementId)).size >= MIN_ERAS, `semilla ${seed}, tramo ${t.name}: épocas`);
      assert.ok(list.filter(isSpanish).length >= MIN_SPANISH_PER_TIER, `semilla ${seed}, tramo ${t.name}: sin español`);
    }
    for (let i = 0; i < game.length; i += BLOCK) {
      assert.equal(new Set(game.slice(i, i + BLOCK).map((q) => q.kind)).size, KINDS.length, `semilla ${seed}: el bloque ${i / BLOCK + 1} sin las tres mecánicas`);
    }
    const shown = game.flatMap(shownWorks);
    assert.equal(new Set(shown).size, shown.length, `semilla ${seed}: obra repetida en pantalla`);
    for (const q of game) assertPlayable(q);
    assert.equal(perfectScore(game), 80, 'el máximo honesto sigue en 80');
  }
  const { state } = simulate(drawGame(bolsa, createRng(7), []), () => true);
  assert.equal(summary(state).top.key, 'friki');
  assert.equal(summary(state).score, 80);
});

test('sorteo: misma semilla e historial, misma partida; otra semilla, otra; no toca la bolsa', () => {
  const before = JSON.stringify(bolsa.candidates);
  const hist = [['who-a82', 't01', 'no-existe']];
  assert.deepEqual(drawGame(bolsa, createRng(42), hist), drawGame(bolsa, createRng(42), hist));
  const a = drawGame(bolsa, createRng(42), []).map((q) => q.id);
  const b = drawGame(bolsa, createRng(43), []).map((q) => q.id);
  assert.notDeepEqual(a, b);
  assert.equal(JSON.stringify(bolsa.candidates), before);
  // Historial roto: se sortea igual.
  assert.equal(drawGame(bolsa, createRng(1), 'basura').length, 40);
  assert.equal(drawGame(bolsa, createRng(1), [null, 5, ['x']]).length, 40);
});

test('sorteo: siete partidas seguidas, siete contenidos; lo visto en las 2 últimas no vuelve (salvo españoles, que son pocos)', () => {
  // Quien juega todo (40 vistas) y quien se queda en los dos primeros tramos (16).
  for (const seenPerGame of [40, 16]) {
    let repeats = 0;
    let games = 0;
    for (let run = 0; run < 10; run++) {
      let hist = [];
      const played = [];
      for (let g = 0; g < 7; g++) {
        const game = drawGame(bolsa, createRng(1000 * run + g + 1), hist).slice(0, seenPerGame);
        const recent = played.slice(-RECENT_GAMES).flat();
        if (recent.length) {
          games++;
          const works = new Set(recent.map((q) => q.artwork));
          const ids = new Set(recent.map((q) => q.id));
          const again = game.filter((q) => !isSpanish(q) && works.has(q.artwork));
          assert.ok(again.length <= 2, `${seenPerGame} vistas, partida ${g}: ${again.map((q) => q.id)}`);
          repeats += again.length;
          assert.ok(game.filter((q) => ids.has(q.id) && !isSpanish(q)).length <= 1, 'pregunta idéntica repetida');
        }
        assert.ok(!played.some((p) => p.map((q) => q.id).join() === game.map((q) => q.id).join()), 'partida idéntica');
        hist = startHistory(hist);
        for (const q of game) hist = markSeen(hist, q.id);
        played.push(game);
      }
    }
    assert.ok(repeats / games <= 0.25, `${seenPerGame} vistas: ${repeats} obras repetidas en ${games} partidas`);
  }
});

test('historial: una partida nueva al empezar, cada pregunta vista una vez, como mucho HISTORY_KEEP partidas', () => {
  let h = startHistory(null);
  assert.deepEqual(h, [[]]);
  h = markSeen(markSeen(markSeen(h, 'a'), 'b'), 'a');
  assert.deepEqual(h, [['a', 'b']]);
  for (let i = 0; i < HISTORY_KEEP + 3; i++) h = markSeen(startHistory(h), `q${i}`);
  assert.equal(h.length, HISTORY_KEEP);
  assert.deepEqual(h[h.length - 1], [`q${HISTORY_KEEP + 2}`]);
  assert.deepEqual(markSeen([], 'x'), [['x']]);
  assert.ok(RECENT_GAMES < HISTORY_KEEP);
});

test('bolsa con catálogos más grandes: crece sin errores y el sorteo sigue valiendo', () => {
  const small = buildBolsa(sampleIndex());
  const bigIdx = bigIndex();
  const big = buildBolsa(bigIdx);
  assert.ok(big.candidates.length > small.candidates.length, `${big.candidates.length} > ${small.candidates.length}`);
  for (const c of big.candidates) assertPlayable(c, bigIdx);
  const bigGame = drawGame(big, createRng(3), []);
  const shown = bigGame.flatMap(shownWorks);
  assert.equal(new Set(shown).size, shown.length);
  assert.ok(bigGame.length >= 4 * PER_TIER, `${bigGame.length} preguntas con el catálogo sintético`);
  // El catálogo real triplicado (como si llegaran ~700 obras): la bolsa crece y las partidas valen.
  const cat = realCatalogJson();
  const copies = [1, 2].flatMap((k) => cat.artworks.map((w) => ({ ...w, id: `${w.id}x${k}` })));
  const triple = buildIndex({ ...cat, artworks: [...cat.artworks, ...copies] });
  const grown = buildBolsa(triple, { fixed: questions, adjustments });
  assert.ok(grown.candidates.length > 2.5 * bolsa.candidates.length, `${grown.candidates.length} candidatas`);
  for (let seed = 1; seed <= 5; seed++) assert.deepEqual(validateBank({ questions: drawGame(grown, createRng(seed), []) }, triple), []);
});
