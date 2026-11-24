// Familias visuales: las opciones falsas salen de la familia de la buena, con tope de años, y las
// obras anteriores a 1800 no conviven con abstracción ni vanguardias (ni al revés).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { makeQuestion } from '../app/js/engine/questions.js';
import { planStage } from '../app/js/engine/planner.js';
import { createRng } from '../app/js/engine/rng.js';

const here = dirname(fileURLToPath(import.meta.url));
const index = buildIndex(JSON.parse(readFileSync(join(here, '..', 'app', 'data', 'catalog.json'), 'utf8')));
const fam = (id) => index.families.family(id);
const CUTOFF = index.families.cutoff;
const MAX_GAP = 250 * 2.5; // tope más holgado que se admite si una familia no tiene relleno
const ANTIGUOS = ['renacimiento', 'manierismo-y-norte', 'barroco', 'rococo-neoclasicismo'];
const LIMITE_MOVIMIENTOS = 4;

// Las opciones de una pregunta como { family, year, artistId } de obra o de pintor.
function refsOf(q) {
  if (q.type === 'which') return q.options.map((o) => index.refOfWork(index.artwork(o.artworkId)));
  if (q.type === 'who') return q.options.map((o) => index.refOfArtist(index.artist(o.id)));
  return [];
}

// Preguntas de los tres tipos sobre todas las obras, con dificultades y semillas repartidas.
function allQuestions() {
  const out = [];
  for (const work of index.artworks) {
    for (const [i, type] of ['who', 'which', 'movement'].entries()) {
      const d = ((work.id.length * 7 + i * 3 + work.yearSort) % 10) / 10;
      const q = makeQuestion(type, index, work, d, createRng(`${work.id}/${type}`));
      if (q) out.push({ q, work });
    }
  }
  return out;
}
const QUESTIONS = allQuestions();
const falsas = (q) => refsOf(q).filter((r, i) => q.options[i].id !== q.answerId);

test('las familias están definidas y cubren todos los pintores y movimientos', () => {
  const counts = {};
  for (const a of index.artists) {
    assert.ok(fam(a.family), `${a.id} sin familia`);
    counts[a.family] = (counts[a.family] || 0) + index.worksOf(a.id).length;
  }
  for (const m of index.movements) assert.ok(fam(m.family), `${m.id} sin familia`);
  for (const id of ['occidental', 'medieval', 'japones', 'vanguardia', 'abstracto']) assert.ok(counts[id] > 0, `familia ${id} vacía`);
  assert.equal(index.artist('hokusai').family, 'japones');
  assert.equal(index.artist('malevich').family, 'abstracto');
  assert.equal(index.artist('cimabue').family, 'medieval');
});

test('«¿Quién?» y «¿Cuál?»: las falsas son de la familia de la buena o de una cercana si falta relleno', () => {
  let n = 0;
  for (const { q, work } of QUESTIONS.filter((x) => x.q.type !== 'movement')) {
    const target = index.refOfWork(work);
    for (const r of falsas(q)) {
      assert.ok(index.families.relation(target, r, 2.5), `${q.type} de ${work.id}: ${r.artistId} (${r.family}) no pega con ${target.family}`);
    }
    n++;
  }
  assert.ok(n > 1000, `solo ${n} preguntas probadas`);
});

test('el ukiyo-e, lo medieval y lo occidental solo se enseñan entre los suyos', () => {
  for (const { q, work } of QUESTIONS.filter((x) => x.q.type !== 'movement')) {
    const f = index.refOfWork(work).family;
    if (!['japones', 'medieval', 'occidental'].includes(f)) continue;
    const otras = falsas(q).map((r) => r.family);
    assert.ok(otras.every((x) => x === f), `${work.id} (${f}): ${otras}`);
  }
});

test('ninguna pregunta de una obra anterior a 1800 lleva abstracción ni vanguardias, y al revés', () => {
  let antiguas = 0;
  let modernas = 0;
  const moderna = (r) => fam(r.family).moderna;
  for (const { q, work } of QUESTIONS) {
    const target = index.refOfWork(work);
    if (q.type === 'movement') {
      const ids = q.options.map((o) => o.id);
      if (target.year < CUTOFF) assert.ok(!ids.includes('simbolismo-modernismo'), `${work.id}: movimiento moderno en obra antigua`);
      if (moderna(target)) assert.ok(!ids.some((id) => ANTIGUOS.includes(id)), `${work.id}: ${ids}`);
      continue;
    }
    const refs = refsOf(q);
    if (target.year < CUTOFF) { antiguas++; assert.ok(!refs.some(moderna), `${work.id} (${target.year}): ${refs.map((r) => r.family)}`); }
    if (moderna(target)) { modernas++; assert.ok(!refs.some((r) => r.year < CUTOFF), `${work.id}: opción anterior a 1800`); }
  }
  assert.ok(antiguas > 500 && modernas > 20, `${antiguas} antiguas, ${modernas} modernas`);
});

test('tope de distancia: unos 2-3 siglos en la pintura occidental y 4 puestos en los movimientos', () => {
  let n = 0;
  for (const { q, work } of QUESTIONS) {
    if (q.type === 'movement') {
      const orders = q.options.map((o) => index.movement(o.id).order);
      assert.ok(Math.max(...orders) - Math.min(...orders) <= LIMITE_MOVIMIENTOS * 2, `${work.id}: ${q.options.map((o) => o.id)}`);
      continue;
    }
    const target = index.refOfWork(work);
    if (target.family !== 'occidental') continue;
    for (const r of falsas(q)) {
      assert.ok(Math.abs(r.year - target.year) <= MAX_GAP, `${work.id}: ${r.artistId} a ${Math.abs(r.year - target.year)} años`);
      n++;
    }
  }
  assert.ok(n > 1000);
});

test('con el avance las falsas se acercan en el tiempo, sin salir de la familia', () => {
  const distancia = (d) => {
    let sum = 0;
    let n = 0;
    for (const a of index.artists.filter((x) => x.family === 'occidental' && index.worksOf(x.id).length >= 12)) {
      for (let s = 1; s <= 6; s++) {
        const q = makeQuestion('who', index, index.worksOf(a.id)[s], d, createRng(`${a.id}/${s}/${d}`));
        if (!q || q.type !== 'who') continue;
        for (const r of falsas(q)) { sum += Math.abs(r.year - index.families.yearOfArtist(a)); n++; }
      }
    }
    return sum / n;
  };
  const lejos = distancia(0);
  const cerca = distancia(1);
  assert.ok(lejos > cerca + 30, `lejos ${lejos.toFixed(0)} años frente a cerca ${cerca.toFixed(0)}`);
});

test('las rondas planificadas del camino respetan las familias', () => {
  for (const step of index.steps.filter((s) => s.type === 'artist')) {
    for (let s = 1; s <= 8; s++) {
      for (const q of planStage(index, step.id, s).questions) {
        if (q.type === 'movement') continue;
        const target = index.refOfWork(index.artwork(q.type === 'which' ? q.targetArtworkId : q.artworkId));
        for (const r of falsas(q)) assert.ok(index.families.relation(target, r, 2.5), `${step.id}/${s}: ${r.artistId} con ${target.artistId}`);
      }
    }
  }
});
