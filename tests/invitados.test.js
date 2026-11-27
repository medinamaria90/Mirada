// Invitados presentados antes de preguntarlos (engine/guest-intro.js). Caso de María: en la ronda de Van Eyck salió
// «¿Quién lo pintó?» con un cuadro de Mantegna, un invitado del camino que nunca se le había presentado (el repaso de
// planStage tomaba obras de todos los invitados de las paradas ya pasadas sin mirar si se conocían).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyProgress } from '../app/js/engine/progress.js';
import { planStage, planSrsReview, planMovementReview, planReviewSession } from '../app/js/engine/planner.js';
import { planWeekly } from '../app/js/engine/daily.js';
import { createRng } from '../app/js/engine/rng.js';
import { metArtistIds } from '../app/js/engine/painters.js';
import {
  askableIds, introNeeded, knownOnly, guestIntro, relationLine, roundWorkIds, isGuestArtist, GUEST_TEXT_MAX, GUEST_INTRO_MAX,
} from '../app/js/engine/guest-intro.js';
import { migrate, SCHEMA_VERSION } from '../app/js/state/schema.js';
import { readSession, makeSession } from '../app/js/state/session.js';
import { realIndex } from './helpers-real.js';

const real = realIndex();
const TODAY = '2026-11-27';
const SEEDS = 60;

// Todo el camino hasta `artistId` (sin él) jugado y dominado.
function pathUpTo(artistId) {
  const p = emptyProgress();
  for (const a of real.path.slice(0, real.pathIndex(artistId))) p.artists[a.id] = { plays: 1, best: 1, mastered: true, last: TODAY };
  return p;
}

// Lo que hace la ronda (ui/screens/lesson.js): un solo invitado nuevo y su tarjeta antes de su primera pregunta.
function simulate(questions, progress) {
  const askable = askableIds(metArtistIds(progress, real), progress);
  const kept = knownOnly(real, questions, askable, createRng('prueba')).filter(Boolean);
  const steps = [];
  for (const q of kept) {
    const guest = introNeeded(real, q, askable);
    if (guest) {
      steps.push({ card: guest });
      askable.add(guest);
    }
    steps.push({ q, askable: new Set(askable) });
  }
  return steps;
}

const isAuthor = (q) => q.type === 'who' || q.type === 'which';

test('el fallo: los invitados de las paradas pasadas llegaban a la ronda de Van Eyck sin presentarse', () => {
  assert.ok(real.guestsUpTo('van-eyck').some((g) => g.id === 'mantegna'));
  assert.ok(isGuestArtist(real.artist('mantegna')));
});

test('Van Eyck: nunca una pregunta cuya respuesta sea un pintor ni conocido ni presentado; la tarjeta va antes', () => {
  const p = pathUpTo('van-eyck');
  let cards = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const plan = planStage(real, 'van-eyck', seed, { met: metArtistIds(p, real) });
    const steps = simulate(plan.questions, p);
    assert.ok(steps.filter((s) => s.card).length <= GUEST_INTRO_MAX, `semilla ${seed}: más de un invitado`);
    for (const s of steps) {
      if (s.card) { cards++; continue; }
      if (!isAuthor(s.q)) continue;
      const ok = s.q.artistId === s.q.host || s.askable.has(s.q.artistId);
      assert.ok(ok, `semilla ${seed}: pregunta por ${s.q.artistId} sin presentarlo`);
    }
  }
  assert.ok(cards > 0, 'algún invitado se presenta en las rondas de Van Eyck');
});

test('en todo el camino, cada respuesta es conocida, de la ronda o presentada antes, y los distractores siguen la regla', () => {
  for (const artist of real.path.slice(1)) {
    const p = pathUpTo(artist.id);
    for (let seed = 1; seed <= 6; seed++) {
      const plan = planStage(real, artist.id, seed, { met: metArtistIds(p, real) });
      for (const s of simulate(plan.questions, p)) {
        if (s.card || !isAuthor(s.q)) continue;
        const known = s.q.artistId === s.q.host || s.askable.has(s.q.artistId);
        assert.ok(known, `${artist.id} ${seed}: respuesta ${s.q.artistId}`);
        // Un invitado sin presentar solo sale de distractor si la respuesta es conocida (lo es siempre: se comprueba igual).
        if (s.q.type === 'who') {
          const strangers = s.q.options.filter((o) => o.id !== s.q.answerId && isGuestArtist(real.artist(o.id)) && !s.askable.has(o.id));
          assert.ok(!strangers.length || known);
        }
      }
    }
  }
});

test('un invitado ya presentado se pregunta sin tarjeta y no cuenta para el camino', () => {
  const p = pathUpTo('van-eyck');
  p.guests = { mantegna: TODAY };
  for (let seed = 1; seed <= SEEDS; seed++) {
    const plan = planStage(real, 'van-eyck', seed, { met: metArtistIds(p, real) });
    const cards = simulate(plan.questions, p).filter((s) => s.card).map((s) => s.card);
    assert.ok(!cards.includes('mantegna'), `semilla ${seed}`);
  }
  assert.ok(!metArtistIds(p, real).includes('mantegna'));
});

test('repaso con cuadros de dos invitados sin presentar: solo entra uno, con su tarjeta', () => {
  const p = pathUpTo('van-eyck');
  const keys = ['mantegna', 'giorgione'].flatMap((id) => real.worksOf(id).map((w) => `art:${w.id}`));
  const plan = planSrsReview(real, keys, 3, 8);
  const steps = simulate(plan.questions, p);
  const cards = steps.filter((s) => s.card);
  assert.equal(cards.length, 1);
  const guest = cards[0].card;
  const first = steps.findIndex((s) => s.q && isAuthor(s.q) && s.q.artistId === guest);
  assert.ok(first > steps.findIndex((s) => s.card === guest));
  assert.ok(steps.every((s) => s.card || !isAuthor(s.q) || s.askable.has(s.q.artistId)));
});

test('knownOnly: un solo invitado nuevo por ronda; el otro se cambia por un conocido y lo conocido no se toca', () => {
  const p = pathUpTo('van-eyck');
  const askable = askableIds(metArtistIds(p, real), p);
  const who = (artistId) => ({ type: 'who', artistId, artworkId: real.worksOf(artistId).find((w) => w.role === 'new').id, options: [] });
  const qs = [who('botticelli'), who('mantegna'), who('giorgione'), who('mantegna')];
  const out = knownOnly(real, qs, askable, createRng('x'));
  assert.equal(out.length, 4);
  assert.equal(out[0], qs[0]);
  assert.equal(out[1], qs[1]);
  assert.equal(out[3], qs[3]);
  assert.ok(out[2] && askable.has(out[2].artistId), 'Giorgione se cambia por un conocido');
});

// Todas las preguntas por autor de una ronda ya filtrada: respuesta conocida (o el invitado recién presentado).
function assertKnown(questions, progress, label) {
  for (const s of simulate(questions, progress)) {
    if (s.card || !isAuthor(s.q)) continue;
    assert.ok(s.q.artistId === s.q.host || s.askable.has(s.q.artistId), `${label}: pregunta por ${s.q.artistId}`);
  }
}

// Caso de María: Prueba de época del Renacimiento sin haber jugado a Piero della Francesca.
function renacimientoSinPiero() {
  const p = emptyProgress();
  for (const id of ['botticelli', 'masaccio', 'berruguete', 'leonardo', 'miguel-angel', 'rafael']) p.artists[id] = { plays: 1, best: 1, mastered: true, last: TODAY };
  return p;
}

test('prueba de época: sin jugar a Piero, nunca «¿Cuál es de Piero?» (ni en el plan con met ni en la ronda)', () => {
  const p = renacimientoSinPiero();
  const met = metArtistIds(p, real);
  let piero = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const bare = planMovementReview(real, 'renacimiento', seed).questions;
    piero += bare.filter((q) => isAuthor(q) && q.artistId === 'piero').length;
    assertKnown(bare, p, `prueba sin met ${seed}`);
    const plan = planMovementReview(real, 'renacimiento', seed, { met });
    assert.ok(plan.questions.filter(isAuthor).every((q) => met.includes(q.artistId)), `prueba ${seed}`);
  }
  assert.ok(piero > 0, 'sin la regla, Piero salía');
});

test('repaso y reto semanal: solo se pregunta por pintores jugados o invitados presentados', () => {
  const p = renacimientoSinPiero();
  const works = real.artists.flatMap((a) => real.worksOf(a.id)).slice(0, 400).map((w) => w.id);
  for (let seed = 1; seed <= 20; seed++) {
    const ids = works.slice(seed * 7, seed * 7 + 12);
    assertKnown(planSrsReview(real, ids.map((id) => `art:${id}`), seed, 8).questions, p, `srs ${seed}`);
    assertKnown(planReviewSession(real, { works: ids }, seed).questions, p, `repaso ${seed}`);
  }
  assertKnown(planWeekly(real, '2026-W48').questions, p, 'semanal');
});

test('conocido = jugado: ver la historia o tener parada antes no basta', () => {
  const p = renacimientoSinPiero();
  assert.ok(!metArtistIds(p, real).includes('piero'));
  assert.ok(!metArtistIds(p, real, () => true).includes('piero'));
  p.artists.piero = { plays: 1, best: 0.5, mastered: false, last: TODAY };
  assert.ok(metArtistIds(p, real).includes('piero'));
});

test('tarjeta: nombre, quién era y relación con el pintor de la ronda en ≤ 180 letras, sin fuente y con otro cuadro', () => {
  const guests = real.path.flatMap((a) => real.guestsAt(a.id));
  assert.ok(guests.length >= 10);
  for (const g of guests) {
    assert.ok(g.who && g.who.text && g.who.source.startsWith('https://'), `${g.id}: falta quién era`);
    for (const host of real.path) {
      const intro = guestIntro(real, g.id, { hostId: host.id });
      assert.ok(intro.text.length <= GUEST_TEXT_MAX, `${g.id}/${host.id}: ${intro.text.length}`);
      assert.ok(!/https?:|wikipedia/i.test(intro.text));
    }
    const asked = real.worksOf(g.id).find((w) => w.role === 'new');
    const intro = guestIntro(real, g.id, { hostId: 'van-eyck', avoid: roundWorkIds([{ q: { artworkId: asked.id } }]) });
    assert.notEqual(intro.work.id, asked.id, `${g.id}: la tarjeta regalaría la respuesta`);
  }
  const m = guestIntro(real, 'mantegna', { hostId: 'van-eyck' });
  assert.equal(m.name, 'Andrea Mantegna');
  assert.match(m.text, /^Mantegna, el pintor de la corte de Mantua/);
  assert.match(m.text.replace(/\u00a0/g, ' '), /Una generación más joven que Van Eyck, italiano\.$/);
});

test('relationLine: misma generación, antes, después y sin datos', () => {
  const a = (born, country, short = 'X') => ({ born, country, short });
  assert.equal(relationLine(a(1776, 'Reino Unido'), a(1775, 'Reino Unido', 'Turner')), 'De la generación de Turner, también británico.');
  assert.equal(relationLine(a(1400, 'Italia'), a(1480, 'Flandes', 'Y')), 'Casi un siglo mayor que Y, italiano.');
  assert.equal(relationLine(a(1830, 'Rusia'), a(1770, 'Francia', 'Z')), 'Dos generaciones más joven que Z, ruso.');
  assert.equal(relationLine(a(0, 'Italia'), a(1400, 'Italia')), '');
  assert.equal(relationLine(a(1500, 'Atlántida'), a(1500, 'Italia', 'W')), 'De la generación de W.');
});

test('sin pintor de la ronda (repasos), la relación es con el conocido nacido más cerca', () => {
  const intro = guestIntro(real, 'mantegna', { met: ['botticelli', 'van-eyck', 'mantegna'] });
  assert.match(intro.text, /Botticelli/);
});

test('estado: los invitados presentados se guardan y un estado anterior los recibe vacíos sin perder nada', () => {
  assert.deepEqual(emptyProgress().guests, {});
  const old = { version: SCHEMA_VERSION, progress: { xp: 420, artists: { botticelli: { plays: 3, mastered: true } } } };
  const out = migrate(old);
  assert.deepEqual(out.progress.guests, {});
  assert.equal(out.progress.xp, 420);
  assert.equal(out.progress.artists.botticelli.plays, 3);
  const kept = migrate({ ...old, progress: { ...old.progress, guests: { mantegna: TODAY } } });
  assert.deepEqual(kept.progress.guests, { mantegna: TODAY });
});

test('la ronda guardada conserva el pintor de la ronda de cada pregunta', () => {
  const p = pathUpTo('van-eyck');
  const plan = planStage(real, 'van-eyck', 5, { met: metArtistIds(p, real) });
  const round = { queue: plan.questions.map((q, i) => ({ q, base: i, retry: false })), pos: 0, baseCount: plan.questions.length, firstTry: plan.questions.map(() => null), combo: 0, bestCombo: 0 };
  const session = makeSession({ route: 'etapa-van-eyck', kind: 'stage', plan: { kind: 'stage', artistId: 'van-eyck' } }, { round, answers: [], xpLive: 0 }, 1000);
  const back = readSession({ session }, real, 2000);
  assert.ok(back.round.queue.every((it) => it.q.type === 'before' || it.q.host === 'van-eyck'));
});
