// Test de cultura pictórica (app/test/): el banco sobre el catálogo real, la regla adaptativa con
// jugadores simulados, la puntuación acumulada, el percentil y el nivel. Sin navegador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { realIndex } from './helpers-real.js';
import {
  TIERS, PER_TIER, BLOCK, UP_FROM, STOP_BELOW, PAUSE_FROM, MAX_QUESTIONS, KINDS,
  createTest, answer, advance, resume, finish, summary, simulate, perfectScore, isAnswered,
} from '../app/js/test/motor.js';
import { percentileFor, levelForScore, buildResult, shareText, PERCENTILE_BANDS, GRID_OK, GRID_OFF } from '../app/js/test/resultado.js';
import { validateBank, viewOf, prefixImages } from '../app/js/test/preguntas.js';
import { LEVELS } from '../app/js/engine/progress.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bank = JSON.parse(readFileSync(join(root, 'app', 'test', 'preguntas.json'), 'utf8'));
const html = readFileSync(join(root, 'app', 'test', 'index.html'), 'utf8');
const index = realIndex();
const questions = bank.questions;
const MIN_SPANISH = 6;

// Generador determinista para los jugadores simulados (sin Math.random: resultados repetibles).
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

test('banco: 40 preguntas válidas sobre el catálogo real, 8 por tramo, sin spoilers', () => {
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

test('banco: mezcla de mecánicas y de épocas; españoles en todos los tramos', () => {
  for (const t of TIERS) {
    const kinds = new Set(questions.filter((q) => q.tier === t.id).map((q) => q.kind));
    assert.equal(kinds.size, KINDS.length, `tramo ${t.name}: las tres mecánicas`);
  }
  const movementOf = (q) => index.artist(index.artwork(q.artwork).artistId).movementId;
  assert.equal(new Set(questions.map(movementOf)).size, index.movements.length, 'todas las épocas del catálogo');
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

test('jugador perfecto: llega al friki, agota el banco con 24 preguntas, suma el máximo y ve la pausa desde la 20', () => {
  const { state, pauses } = simulate(questions, () => true);
  const s = summary(state);
  assert.equal(s.top.key, 'friki');
  assert.equal(s.reason, 'bank');
  assert.equal(s.asked, TIERS.length * BLOCK + BLOCK);
  assert.equal(s.correct, s.asked);
  assert.equal(s.score, perfectScore(questions));
  assert.equal(s.score, BLOCK * TIERS.reduce((n, t) => n + t.points, 0) + BLOCK * TIERS[TIERS.length - 1].points);
  // Pausa al cerrar cada bloque desde PAUSE_FROM mientras el test siga (20; en la 24 ya no queda banco).
  const expected = [];
  for (let n = PAUSE_FROM; n < s.asked; n += BLOCK) expected.push(n);
  assert.deepEqual(pauses, expected);
  // Quien se para en la pausa termina con lo jugado.
  const stopped = simulate(questions, () => true, { stopAtPause: true });
  assert.equal(summary(stopped.state).asked, PAUSE_FROM);
  assert.equal(stopped.state.reason, 'user');
  // Y quien repite dos bloques de cada tramo ve la pausa en la 20, 24, 28, 32 y 36 (40 preguntas).
  const slow = simulate(questions, (q) => (questions.filter((x) => x.tier === q.tier).indexOf(q) % BLOCK) < STOP_BELOW);
  assert.equal(summary(slow.state).asked, MAX_QUESTIONS);
  assert.deepEqual(slow.pauses, [20, 24, 28, 32, 36]);
  const r = buildResult(s, perfectScore(questions));
  assert.equal(r.level, LEVELS[LEVELS.length - 1].name);
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
  const brief = summary(finish(simulate(questions, () => true, { stopAtPause: true }).state));
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

test('nivel: nombres de la escala de la app, monótono con la puntuación, de Curioso a Gran maestro', () => {
  const max = perfectScore(questions);
  assert.equal(levelForScore(0, max).name, LEVELS[0].name);
  assert.equal(levelForScore(max, max).name, LEVELS[LEVELS.length - 1].name);
  let prev = -1;
  const names = new Set(LEVELS.map((l) => l.name));
  for (let score = 0; score <= max; score++) {
    const lv = levelForScore(score, max);
    assert.ok(names.has(lv.name), lv.name);
    assert.ok(lv.index >= prev);
    prev = lv.index;
  }
  assert.ok(prev < LEVELS.length, 'nunca «Gran maestro II»');
});

test('resultado y texto para compartir: «n de m», nivel, percentil, cuadrados y enlace', () => {
  const { state } = simulate(questions, (q) => q.tier === 1);
  const r = buildResult(summary(state), perfectScore(questions));
  assert.equal(r.asked, 2 * BLOCK);
  assert.equal(r.correct, BLOCK);
  assert.equal(r.topLabel, 'Has llegado al tramo media');
  assert.equal([...r.grid].length, TIERS.length);
  assert.ok(r.grid.endsWith(GRID_OFF.repeat(3)));
  const text = shareText(r, 'https://mirada.onrender.com/test/');
  assert.match(text, new RegExp(`^He acertado ${r.correct} de ${r.asked} en el test de Mirada · ${r.level}\\n`));
  assert.match(text, new RegExp(`Sé más de pintura que el ${r.percentile} % de la gente `));
  assert.ok(text.endsWith('https://mirada.onrender.com/test/'));
  assert.doesNotMatch(text, /\b(ayer|mañana)\b/i);
  assert.equal(advance(resume(state)), state, 'un test terminado no se mueve');
});

test('index.html: SEO y vista previa (título, descripción, canonical, Open Graph, Twitter), sin recursos remotos', () => {
  assert.match(html, /<html lang="es">/);
  assert.match(html, /<title>¿Cuánta pintura reconoces\?/);
  assert.match(html, /<meta name="description" content="[^"]{50,}">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/mirada\.onrender\.com\/test\/">/);
  for (const p of ['og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'twitter:card', 'twitter:image']) {
    assert.ok(html.includes(`"${p}"`), p);
  }
  assert.match(html, /og:image" content="https:\/\/mirada\.onrender\.com\/test\/portada\.jpg"/);
  assert.match(html, /<h1[^>]*>¿Cuánta pintura reconoces\?<\/h1>/, 'texto real en el HTML');
  assert.match(html, /Entre 8 y 40 preguntas/);
  // Sin recursos remotos: las URL absolutas solo en metadatos (canonical, OG), nunca en lo que se carga.
  for (const m of html.matchAll(/<(?:script|img|link)\b[^>]*>/g)) {
    if (m[0].includes('rel="canonical"')) continue;
    const url = /(?:src|href)="([^"]+)"/.exec(m[0]);
    if (url) assert.doesNotMatch(url[1], /^(https?:)?\/\//, m[0]);
  }
  assert.doesNotMatch(html, /\b(ayer|mañana)\b/i);
});
