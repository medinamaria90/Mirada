// Catálogo grande (1.297 obras, 162 pintores): datos generados, camino común, ramas, niveles «a fondo»,
// dominio con todas las obras de nivel 1 vistas, rangos y migración del estado a la v7.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { planStage } from '../app/js/engine/planner.js';
import { emptyProgress, stageRule, stepStatus } from '../app/js/engine/progress.js';
import { finishRound } from '../app/js/engine/finish.js';
import { seenWorks, pendingWorks, deepStatus, deepProgress } from '../app/js/engine/levels.js';
import { branchStatus, branchProgress, movementReached, firstTramo, tramoOpen, tramoPending, playStatus, canPlay, branchAfterRound, branchOfRound } from '../app/js/engine/branches.js';
import { playTargets } from '../app/js/engine/painters.js';
import { RANKS, rankFor, rankStats } from '../app/js/engine/ranks.js';
import { migrate, MIGRATIONS, SCHEMA_VERSION, defaultState } from '../app/js/state/schema.js';
import { LEGACY_IDS } from '../app/js/state/legacy-ids.js';
import { BOTS, eliminator, roundContext, masteryProbability } from './lib/antibot.js';
import { realIndex, W } from './helpers-real.js';

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, '..', 'app');
const json = (p) => JSON.parse(readFileSync(join(app, p), 'utf8'));
const real = realIndex();
const catalog = json('data/catalog.json');
const TODAY = '2026-11-24';
const askable = (w) => !w.spoiler && !w.attributed;

test('cifras: 1.470 obras, 174 pintores (los Lorenzetti, una sola parada), 11 movimientos (9 del camino y 2 ramas), 14 ramas', () => {
  assert.equal(real.artworks.length, 1470);
  assert.equal(real.artists.length, 174);
  assert.equal(real.movements.length, 11);
  assert.deepEqual(real.movements.filter((m) => m.branch).map((m) => [m.id, m.opensAt]), [['gotico', 'renacimiento'], ['ukiyo-e', 'impresionismo']]);
  assert.equal(real.visibleMovements.length, 9);
  assert.equal(real.branches.length, 14);
  assert.equal(real.hasLevels, true);
});

test('camino común: onPath = grandes maestros + maestros + invitados con alguna obra de fama 3; las ramas, nunca', () => {
  for (const a of real.artists) {
    const fame3 = real.worksOf(a.id).some((w) => w.fame === 3);
    // Un gran maestro de una rama (Giotto en Gótico) tiene niveles pero no es parada del camino.
    const inBranch = Boolean(real.movement(a.movementId).branch);
    const stage = a.category === 'gran-maestro' || a.category === 'maestro';
    const expected = (stage && !inBranch) || (a.category === 'invitado' && fame3);
    assert.equal(a.onPath, expected, a.id);
    if (a.category === 'rama') assert.equal(a.onPath, false, a.id);
  }
  const count = (c) => real.artists.filter((a) => a.onPath && a.category === c).length;
  assert.deepEqual([count('gran-maestro'), count('maestro'), count('invitado')], [14, 50, 16]);
  // Solo los grandes maestros y los maestros son paradas; los invitados del camino van intercalados.
  assert.equal(real.path.length, 64);
  assert.deepEqual(real.path.map((a) => a.id).slice(0, 7), ['botticelli', 'masaccio', 'piero', 'berruguete', 'leonardo', 'miguel-angel', 'rafael']);
  assert.ok(real.path.every((a) => a.onPath && !a.guest));
  const hosted = real.path.flatMap((p) => real.guestsAt(p.id));
  assert.equal(hosted.length, 16, 'cada invitado del camino tiene su pintor con etapa al lado');
  assert.ok(hosted.every((g) => g.onPath && g.guest));
  // Los españoles siguen mezclados en su época (en el Postimpresionismo, el único español es invitado).
  for (const m of real.visibleMovements.filter((x) => x.id !== 'postimpresionismo')) assert.ok(real.stageArtists(m.id).some((a) => a.country === 'España'), m.id);
});

test('cada pintor con etapa tiene al menos 4 obras de nivel 1 sin spoiler y 3-4 en «Conoce a»', () => {
  for (const a of real.path) {
    const l1 = real.levelWorks(a.id, 1);
    assert.ok(l1.filter(askable).length >= 4, `${a.id}: ${l1.filter(askable).length} de nivel 1 sin spoiler`);
    const learn = real.learnWorks(a.id);
    assert.ok(learn.length >= 3 && learn.length <= 4 && learn.every((w) => w.level === 1), `${a.id}: «Conoce a» con ${learn.length}`);
    assert.ok(real.newWorks(a.id).filter((w) => w.level === 1 && askable(w)).length >= 3, `${a.id}: pocas de nivel 1 para preguntar`);
    // Lo que no se puede preguntar (firma, atribución) está en «Conoce a».
    assert.ok(l1.filter((w) => !askable(w)).every((w) => w.role === 'learn'), a.id);
  }
});

test('niveles «a fondo»: cada nivel de una etapa tiene sus obras (≥ 2; los provisionales de ramas, pocas) y todas son «new»', () => {
  let levels = 0;
  for (const a of real.artists) {
    for (const l of real.deepLevels(a.id)) {
      levels++;
      assert.ok(l.works.length >= 2 && l.works.every((w) => w.role === 'new' && w.level === l.id), `${a.id} nivel ${l.id}: ${l.works.length}`);
    }
  }
  assert.ok(levels >= 100, `${levels} niveles «a fondo»`);
});

test('ramas: cronológicas por dentro, con su tramo de apertura, y los «Descubre…» son los invitados fuera del camino', () => {
  for (const b of real.branches) {
    const born = b.artists.map((id) => real.artist(id).born);
    assert.deepEqual(born, born.slice().sort((x, y) => x - y), `${b.id} cronológica`);
    assert.equal(b.opensAt, b.tramos[0].opensAt);
    const orders = b.tramos.map((t) => real.movement(t.opensAt).order);
    assert.deepEqual(orders, orders.slice().sort((x, y) => x - y), `${b.id}: tramos en orden`);
  }
  const byId = Object.fromEntries(real.branches.map((b) => [b.id, b]));
  assert.equal(Object.keys(byId).filter((id) => id.startsWith('descubre-')).length, 9);
  assert.ok(byId.gotico.artists.includes('giotto') && !byId.gotico.artists.includes('van-eyck'), 'Van Eyck ya no está en el Gótico');
  assert.deepEqual(byId['ukiyo-e'].artists.slice().sort(), ['hiroshige', 'hokusai', 'kuniyoshi', 'sharaku', 'utamaro']);
  assert.equal(byId['ukiyo-e'].opensAt, 'impresionismo');
  assert.equal(byId['maestros-espanoles'].artists.length, 40);
  assert.equal(byId['escuela-rusa'].artists.length, 25);
  assert.ok(byId['pintura-britanica'].artists.includes('millais') && byId['pintura-britanica'].artists.includes('turner'));
  const discover = real.branches.filter((b) => b.kind === 'epoca').flatMap((b) => b.artists);
  const offPath = real.artists.filter((a) => a.category === 'invitado' && !a.onPath).map((a) => a.id);
  assert.deepEqual(discover.slice().sort(), offPath.slice().sort());
});

// Regla de apertura (ronda 2 del mapa): un tramo de rama se abre al dominar el primer tramo de su época en
// el camino común; nunca el primer día ni con un pintor de una época sin ver.
const masterSteps = (p, steps) => steps.forEach((s) => { p.artists[s.id] = { plays: 1, best: 1, mastered: true, last: TODAY }; });

test('ramas: un tramo se abre al dominar el primer tramo de su época; nunca el primer día', () => {
  const p0 = emptyProgress();
  for (const b of real.branches) assert.ok(branchStatus(p0, real, b.id).every((s) => s.onPath || s.status === 'locked'), `${b.id}: abierta el primer día`);
  assert.equal(movementReached(p0, real, 'renacimiento'), true);
  assert.deepEqual(firstTramo(real, 'renacimiento').map((s) => s.id), ['botticelli', 'masaccio', 'piero', 'berruguete']);
  assert.deepEqual(firstTramo(real, 'romanticismo').map((s) => s.id), ['goya'], 'sin tramos, la primera parada');
  // Con Botticelli solo, aún no; con el tramo «Nace el Renacimiento» dominado, se abre el Gótico.
  const p = emptyProgress();
  masterSteps(p, real.steps.slice(0, 1));
  assert.equal(tramoOpen(p, real, 'renacimiento'), false);
  assert.deepEqual(tramoPending(p, real, 'renacimiento').map((s) => s.id), ['masaccio', 'piero', 'berruguete']);
  masterSteps(p, real.steps.slice(0, 4));
  assert.equal(branchStatus(p, real, 'gotico')[0].status, 'available');
  // La rama rusa empieza en el Rococó: cerrada hasta dominar su primer tramo («Rococó»: Watteau y Fragonard).
  const rusa = (q) => branchStatus(q, real, 'escuela-rusa');
  const firstRococo = real.steps.findIndex((s) => real.artist(s.id).movementId === 'rococo-neoclasicismo');
  masterSteps(p, real.steps.slice(0, firstRococo));
  assert.equal(movementReached(p, real, 'rococo-neoclasicismo'), true);
  assert.equal(rusa(p)[0].status, 'locked', 'llegar a la época no basta');
  masterSteps(p, firstTramo(real, 'rococo-neoclasicismo'));
  const st = rusa(p);
  assert.equal(st[0].artistId, 'borovikovski');
  assert.equal(st[0].status, 'available');
  assert.ok(st.slice(1).filter((s) => !s.onPath).every((s) => s.status === 'locked'));
  // Dominado el primero, el siguiente sigue cerrado hasta el primer tramo del Romanticismo (Goya).
  p.artists.borovikovski = { plays: 1, best: 1, mastered: true, last: TODAY };
  assert.equal(rusa(p)[1].status, 'locked');
  const own = branchStatus(p, real, 'escuela-rusa').filter((s) => !s.onPath).length;
  assert.deepEqual(branchProgress(p, real, 'escuela-rusa'), { total: own, mastered: 1, open: true });
  masterSteps(p, firstTramo(real, 'romanticismo'));
  assert.equal(rusa(p)[1].status, 'available');
});

test('ramas jugables: una sola regla para la ruta, la ficha y el mapa; rama → ronda → se abre el siguiente', () => {
  const p = emptyProgress();
  const gotico = real.branch('gotico').artists.filter((id) => real.pathIndex(id) < 0);
  const [first, second] = gotico;
  assert.equal(playStatus(p, real, first), 'locked');
  assert.equal(playTargets(p, real, first).stage, null);
  masterSteps(p, firstTramo(real, 'renacimiento'));
  assert.equal(playStatus(p, real, first), 'available');
  assert.equal(canPlay(p, real, first), true);
  assert.equal(playTargets(p, real, first).stage, 'available', 'la ficha ofrece jugar al pintor de rama abierto');
  assert.equal(canPlay(p, real, second), false);
  assert.equal(playStatus(p, real, 'no-existe'), null);
  // Una ronda del primero (perfecta): queda jugado y el siguiente de la rama se abre.
  const { out } = playPerfect(p, first, 7);
  const after = out.progress;
  assert.ok(after.artists[first].plays === 1 && after.artists[first].best === 1);
  assert.equal(playStatus(after, real, second), 'available', 'superar al pintor de la rama abre el siguiente');
  assert.equal(branchStatus(after, real, 'gotico').find((r) => r.artistId === second).status, 'available');
  // Con menos de la mitad de aciertos, el siguiente sigue cerrado.
  const plan = planStage(real, first, 3, { seen: [] });
  const answers = plan.questions.map((q, i) => ({ q, correct: i === 0, retry: false, combo: 1 }));
  const low = finishRound(p, real, { kind: 'stage', artistId: first, answers, firstTry: answers.map((a) => a.correct) }, TODAY).progress;
  assert.equal(playStatus(low, real, second), 'locked');
});

// Una ronda perfecta del pintor con lo que ya ha visto.
function playPerfect(p, artistId, seed, level = 1) {
  const plan = planStage(real, artistId, seed, { seen: [...seenWorks(p, artistId)], ...(level > 1 ? { level } : {}) });
  const answers = plan.questions.map((q) => ({ q, correct: true, retry: false, combo: 1 }));
  return { plan, out: finishRound(p, real, { kind: 'stage', artistId, ...(level > 1 ? { level } : {}), answers, firstTry: answers.map(() => true) }, TODAY) };
}

test('dominado exige haber visto TODAS las obras de nivel 1 (y el 75 % de la ronda): Velázquez, con 9, necesita 2 rondas', () => {
  assert.equal(real.levelWorks('velazquez', 1).length, 9);
  const r1 = playPerfect(emptyProgress(), 'velazquez', 1);
  assert.equal(r1.out.mastered, false, 'una ronda perfecta no basta: faltan obras de nivel 1');
  assert.equal(r1.out.coverShort, true);
  const p = r1.out.progress;
  const pending = pendingWorks(p, real, 'velazquez', 1);
  assert.ok(pending.length >= 1 && pending.length <= 2, `${pending.length} sin ver`);
  assert.equal(p.artists.velazquez.mastered, false);
  const r2 = playPerfect(p, 'velazquez', 2);
  assert.equal(pendingWorks(r2.out.progress, real, 'velazquez', 1).length, 0);
  assert.equal(r2.out.mastered, true);
  assert.equal(r2.out.progress.artists.velazquez.mastered, true);
});

test('con menos de un 75 % no se domina aunque se hayan visto todas', () => {
  let p = playPerfect(emptyProgress(), 'velazquez', 1).out.progress;
  p = playPerfect(p, 'velazquez', 2).out.progress;
  const p2 = { ...p, artists: { ...p.artists, velazquez: { ...p.artists.velazquez, mastered: false } } };
  const plan = planStage(real, 'velazquez', 3, { seen: [...seenWorks(p2, 'velazquez')] });
  const answers = plan.questions.map((q, i) => ({ q, correct: i < 3, retry: false, combo: 0 }));
  const out = finishRound(p2, real, { kind: 'stage', artistId: 'velazquez', answers, firstTry: answers.map((a) => a.correct) }, TODAY);
  assert.equal(out.mastered, false);
});

test('niveles «a fondo»: se desbloquean al dominar el básico, son una ronda por etapa y se dominan viendo todas sus obras', () => {
  let p = emptyProgress();
  assert.equal(deepStatus(p, real, 'velazquez', 2), 'locked');
  p = playPerfect(playPerfect(p, 'velazquez', 1).out.progress, 'velazquez', 2).out.progress;
  assert.equal(deepStatus(p, real, 'velazquez', 2), 'available');
  assert.equal(deepStatus(p, real, 'velazquez', 3), 'locked', 'el siguiente espera al anterior');
  const prevPlays = p.artists.velazquez.plays;
  const plan = planStage(real, 'velazquez', 7, { level: 2 });
  assert.equal(plan.level, 2);
  const level2 = new Set(real.levelWorks('velazquez', 2).map((w) => w.id));
  const own = plan.questions.filter((q) => q.artistId === 'velazquez' && q.type !== 'movement');
  assert.ok(own.length >= 5 && own.every((q) => level2.has(q.type === 'which' ? q.targetArtworkId : q.artworkId)), 'las preguntas propias son de ese nivel');
  const r = playPerfect(p, 'velazquez', 8, 2);
  assert.equal(r.out.mastered, true);
  const q = r.out.progress;
  assert.equal(deepStatus(q, real, 'velazquez', 2), 'mastered');
  assert.equal(deepStatus(q, real, 'velazquez', 3), 'available');
  assert.equal(q.artists.velazquez.plays, prevPlays, 'una ronda «a fondo» no cuenta como jugar la parada del camino');
  assert.ok(r.out.events.some((e) => e.type === 'deep-mastered' && e.level === 2));
  assert.deepEqual(deepProgress(q, real, 'velazquez'), { total: 4, mastered: 1, next: 3 });
});

test('las rondas «a fondo» no se dominan sin mirar (bots ≤ 5 %, por descarte ≤ 25 %)', () => {
  for (const id of ['velazquez', 'goya', 'van-gogh', 'durero', 'zurbaran', 'monet']) {
    const learned = real.path.slice(0, real.pathIndex(id)).map((a) => a.id);
    const rule = stageRule(real, id);
    for (const level of real.deepLevels(id).map((l) => l.id)) {
      const plans = Array.from({ length: 50 }, (_, s) => planStage(real, id, s + 1, { level }));
      for (const [name, bot] of Object.entries({ ...BOTS, eliminator })) {
        let sum = 0;
        for (const plan of plans) {
          const ctx = roundContext(real, plan.questions, { stageArtist: id, stageMovement: real.artist(id).movementId, learned });
          sum += masteryProbability(bot, plan.questions, ctx, rule.mastery, { ownArtist: id, ownRule: rule.ownRule });
        }
        const max = name === 'eliminator' ? 0.25 : 0.05;
        assert.ok(sum / plans.length <= max, `${id} nivel ${level}: «${name}» ${(100 * sum / plans.length).toFixed(1)} %`);
      }
    }
  }
});

test('pintores de rama: se juegan con la misma ronda y su estado entra en el rango como un «a fondo»', () => {
  const plan = planStage(real, 'hokusai', 1);
  assert.ok(plan && plan.questions.length >= 5);
  const p = emptyProgress();
  p.artists.hokusai = { plays: 1, best: 1, mastered: true, last: TODAY };
  assert.equal(rankStats(p, real).deep, 1);
  assert.equal(rankStats(p, real).eras, 1);
  const out = playPerfect(emptyProgress(), 'hokusai', 2).out;
  assert.equal(out.progress.artists.hokusai.plays, 1);
});

test('rangos: XP + niveles «a fondo»; sin uno de los dos no se sube y nunca se baja', () => {
  assert.equal(RANKS.length, 8);
  assert.deepEqual(RANKS.map((r) => r.xp), [0, 300, 1200, 3000, 6000, 10000, 16000, 25000]);
  const p = emptyProgress();
  assert.equal(rankFor(p, real).name, 'Curioso');
  p.xp = 400;
  assert.equal(rankFor(p, real).name, 'Aficionado');
  p.xp = 2000;
  const r = rankFor(p, real);
  assert.equal(r.name, 'Aficionado', 'con XP de Copista pero sin ningún «a fondo» no sube');
  assert.deepEqual(r.missing, [{ key: 'deep', have: 0, need: 1 }]);
  p.artists.velazquez = { plays: 1, best: 1, mastered: true, last: TODAY };
  p.deep['velazquez:2'] = { plays: 1, best: 1, mastered: true, last: TODAY };
  assert.equal(rankFor(p, real).name, 'Copista');
  p.xp = 0;
  p.rank = 2;
  assert.equal(rankFor(p, real).name, 'Copista', 'nunca se baja de rango');
  // Oficial de taller: 4 «a fondo» y un gran maestro hasta su nivel 2.
  const q = emptyProgress();
  q.xp = 3500;
  q.artists.velazquez = { plays: 1, best: 1, mastered: true, last: TODAY };
  for (const k of ['velazquez:2', 'goya:2', 'rafael:2', 'monet:2']) q.deep[k] = { plays: 1, best: 1, mastered: true, last: TODAY };
  assert.equal(rankFor(q, real).name, 'Oficial de taller');
  q.deep['velazquez:2'].mastered = false;
  assert.equal(rankFor(q, real).name, 'Copista', 'el gran maestro necesita su nivel 2 dominado');
  // La ronda que sube de rango lo anuncia y lo guarda.
  const z = emptyProgress();
  z.xp = 290;
  const out = playPerfect(z, 'botticelli', 1).out;
  assert.ok(out.events.some((e) => e.type === 'rank' && e.name === 'Aficionado'));
  assert.equal(out.progress.rank, 1);
});

// --- Migración de esquema v7 -------------------------------------------------------------------------

test('migración 6 → 7: obras a<N> → w<QID>, lo que no tiene equivalente se pierde sin romper; pintores intactos', () => {
  assert.equal(SCHEMA_VERSION, 10);
  const gioconda = W('a154');
  const v6 = {
    version: 6, onboarded: true,
    progress: {
      xp: 900, artists: { leonardo: { plays: 2, best: 0.9, mastered: true, last: '2026-11-20' } },
      salas: { barroco: { plays: 1, best: 0.8, mastered: true } },
      srs: { 'art:a154': { box: 3, due: '2026-12-01' }, 'art:a3': { box: 1, due: '2026-11-25' }, 'art:a41': { box: 5, due: '2026-12-30' }, 'artist:leonardo': { box: 2, due: '2026-11-26' } },
      collection: { a154: '2026-11-20', a41: '2026-11-21', a0: '2026-11-22' },
      fallados: [{ id: 'a154', date: '2026-11-22', times: 1, hits: 0 }, { id: 'a41', date: '2026-11-22', times: 2, hits: 1 }],
      detail: { '2026-11-23': { artworkId: 'a154', correct: true }, '2026-11-22': { artworkId: 'a41', correct: false } },
      medals: { 'artist-leonardo': '2026-11-20', 'eye-leonardo': '2026-11-21' },
      daily: { '2026-11-22': { score: 8, total: 10, firstTry: [true, false] } },
    },
    settings: { music: false, sfx: true, volume: 0.4, reducedMotion: false, dailyGoal: 100, theme: 'dark' },
    session: { route: 'etapa-leonardo', plan: { questions: [] } },
  };
  assert.equal(LEGACY_IDS.a41, undefined, 'a41 (Matisse) no está en el catálogo grande');
  const out = migrate(v6);
  assert.equal(out.version, SCHEMA_VERSION);
  assert.deepEqual(Object.keys(out.progress.collection).sort(), [W('a0'), gioconda].sort());
  assert.equal(out.progress.collection[gioconda], '2026-11-20');
  assert.deepEqual(out.progress.srs[`art:${gioconda}`], { box: 3, due: '2026-12-01' });
  assert.ok(!('art:a154' in out.progress.srs) && !('art:a41' in out.progress.srs));
  assert.deepEqual(out.progress.srs['artist:leonardo'], { box: 2, due: '2026-11-26' }, 'el repaso por pintor se conserva');
  assert.deepEqual(out.progress.fallados, [{ id: gioconda, date: '2026-11-22', times: 1, hits: 0 }]);
  assert.ok(!('detail' in out.progress), 'la lupa del día ya no existe: su registro no pasa');
  assert.deepEqual(out.progress.artists, v6.progress.artists, 'los pintores conservan su id y su estado');
  assert.deepEqual(out.progress.medals, v6.progress.medals);
  assert.deepEqual(out.progress.daily, v6.progress.daily);
  assert.equal(out.progress.xp, 900);
  assert.deepEqual(out.progress.deep, {});
  assert.equal(out.progress.rank, 0);
  assert.deepEqual(out.session, {}, 'la ronda en curso lleva ids antiguos: se descarta');
  assert.deepEqual(out.settings, { ...v6.settings, name: '', avatar: '' });
  // Datos raros no rompen la migración.
  const odd = migrate({ version: 6, progress: { collection: null, srs: 7, fallados: [null, { id: 3 }], detail: { x: 5 } } });
  assert.equal(odd.version, SCHEMA_VERSION);
  assert.deepEqual(odd.progress.collection, {});
  assert.deepEqual(odd.progress.fallados, []);
  // Un id que ya es del catálogo grande no se pierde (estado sembrado a mano o repetido).
  assert.deepEqual(migrate({ version: 6, progress: { collection: { w12418: '2026-11-20', a41: '2026-11-21' } } }).progress.collection, { w12418: '2026-11-20' });
  // Desde muy atrás llega a la última versión.
  assert.equal(migrate({ onboarded: true }).version, SCHEMA_VERSION);
  assert.equal(defaultState().version, SCHEMA_VERSION);
  assert.equal(typeof MIGRATIONS[6], 'function');
});

test('tabla de ids antiguos: todos apuntan a obras del catálogo grande y sin repetidos', () => {
  const table = JSON.parse(readFileSync(join(here, '..', 'tools', 'ids_antiguos.json'), 'utf8'));
  assert.deepEqual(table, LEGACY_IDS, 'legacy-ids.js se genera desde tools/ids_antiguos.json');
  const targets = Object.values(table);
  assert.equal(new Set(targets).size, targets.length);
  assert.ok(targets.every((id) => real.artwork(id)));
  assert.ok(Object.keys(table).length >= 150);
  assert.equal(real.artwork(W('a154')).artistId, 'leonardo');
  assert.equal(real.artwork(W('a62')).artistId, 'velazquez');
});

test('ficha de museo: se pide aparte y se une a las obras', async () => {
  const { mergeCatalogFicha } = await import('../app/js/engine/catalog.js');
  const idx = buildIndex(catalog);
  const n = mergeCatalogFicha(idx, json('data/catalog-ficha.json'));
  assert.equal(n, 1470);
  const g = idx.artwork(W('a154'));
  assert.ok(g.museum && g.city, 'La Gioconda lleva museo y ciudad');
  assert.ok(g.source.wikidata.startsWith('Q'));
  assert.equal(mergeCatalogFicha(idx, { ficha: { nope: { museum: 'x' } } }), 0);
  assert.equal(stepStatus(emptyProgress(), idx, idx.steps[0]), 'available');
});

test('«¿De qué movimiento es?»: opciones en orden cronológico y la buena repartida entre las cuatro posiciones', async () => {
  const { makeMovementQuestion, retryQuestion } = await import('../app/js/engine/questions.js');
  const { createRng } = await import('../app/js/engine/rng.js');
  const order = (id) => real.movement(id).order;
  const works = real.path.flatMap((a) => real.worksOf(a.id)).filter(askable);
  const byPos = [0, 0, 0, 0];
  const byMovement = new Map();
  let n = 0;
  for (let s = 0; s < 1500; s++) {
    const rng = createRng(`pos:${s}`);
    const q = makeMovementQuestion(real, works[s % works.length], (s % 10) / 10, rng);
    const orders = q.options.map((o) => order(o.id));
    assert.deepEqual(orders, orders.slice().sort((x, y) => x - y), 'opciones en orden cronológico');
    assert.equal(new Set(orders).size, 4);
    assert.deepEqual(retryQuestion(real, q, rng).options, q.options, 'el reintento mantiene el orden');
    const pos = q.options.findIndex((o) => o.id === q.answerId);
    byPos[pos]++; n++;
    const m = byMovement.get(q.answerId) || [0, 0, 0, 0];
    m[pos]++; byMovement.set(q.answerId, m);
  }
  // En los extremos de la línea del tiempo la buena no puede ir más que primera o última; en las épocas del
  // medio, con vecinas por los dos lados, se reparte por las cuatro posiciones.
  for (const id of ['rococo-neoclasicismo', 'romanticismo', 'realismo']) {
    const m = byMovement.get(id);
    const total = m.reduce((x, y) => x + y, 0);
    assert.ok(m.every((c) => c / total >= 0.12), `${id}: ${m}`);
  }
  assert.ok(byPos.every((c) => c > 0), `posiciones de la buena ${byPos}`);
});

test('ramas: el resultado sigue en la rama de origen (pintores en dos ramas) y no se salta a nadie', () => {
  const p = emptyProgress();
  real.steps.forEach((x) => { p.artists[x.id] = { plays: 1, best: 1, mastered: true, last: TODAY }; });
  const done = (id) => { p.artists[id] = { plays: 1, best: 1, mastered: true, last: TODAY }; };
  // Giotto, gran maestro de Gótico, solo está en esa rama.
  ['cimabue', 'duccio', 'giotto'].forEach(done);
  assert.deepEqual(real.branchesOf('giotto').map((b) => b.id), ['gotico']);
  const gotico = branchAfterRound(p, real, 'giotto', 'gotico');
  assert.equal(gotico.branch.id, 'gotico');
  assert.equal(gotico.next, 'lorenzetti');
  assert.equal(branchAfterRound(p, real, 'giotto').branch.id, 'gotico');
  // Juan de Juanes, en Descubre el Renacimiento y en Maestros españoles: sin rama indicada, la más concreta.
  assert.equal(real.branchesOf('juan-de-juanes').length, 2);
  // Desde Maestros españoles sigue en la escuela, no salta a Descubre el Renacimiento.
  done('juan-de-juanes');
  assert.equal(branchAfterRound(p, real, 'juan-de-juanes').branch.id, 'maestros-espanoles');
  const esp = branchAfterRound(p, real, 'juan-de-juanes', 'maestros-espanoles');
  assert.equal(esp.branch.id, 'maestros-espanoles');
  assert.ok(esp.next !== 'tintoretto');
  // Y en Descubre el Renacimiento, Tintoretto sigue cerrado mientras falten los de antes (Fra Angelico…).
  assert.equal(branchStatus(p, real, 'descubre-renacimiento').find((r) => r.artistId === 'tintoretto').status, 'locked');
  // Borovikovski desde la Escuela rusa: nunca «se abre Vicente López».
  done('borovikovski');
  const rusa = branchAfterRound(p, real, 'borovikovski', 'escuela-rusa');
  assert.equal(rusa.branch.id, 'escuela-rusa');
  assert.notEqual(rusa.next, 'vicente-lopez');
  assert.equal(branchOfRound(real, 'borovikovski', 'no-existe').id, 'escuela-rusa');
});
