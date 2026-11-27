// Cuadro del día (engine/cuadro-dia.js y sus datos de app/data/dia/): calendario determinista por el día de Madrid, pasos y
// pistas, intentos, una sola vez al día con XP, racha y medallas, cuadritos, el texto compartido sin destripes, la guía de
// «siguiente paso», la alarma de calendario corto, el estado v11, las rutas antiguas y la validación del calendario.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildIndex } from '../app/js/engine/catalog.js';
import { emptyProgress } from '../app/js/engine/progress.js';
import { madridDayKey, addDays } from '../app/js/engine/dates.js';
import {
  dayNumber, entryFor, slotFor, daysLeft, calendarAlarm, CUADRO_ALARM_DAYS, newGame, guess, isOver, revealStep, hintsFor, zoomFor,
  finishCuadro, cuadroGrid, cuadroShareText, cuadroNudge, markNudged, cuadroCount, tryLabel, nextInLabel, cropRect, CUADRO_TRIES, CUADRO_XP,
} from '../app/js/engine/cuadro-dia.js';
import { migrate, SCHEMA_VERSION } from '../app/js/state/schema.js';
import { readSession } from '../app/js/state/session.js';
import { parseRoute } from '../app/js/ui/router.js';
import { medalInfo } from '../app/js/engine/medal-info.js';
import { gainsHtml } from '../app/js/ui/cuadro-gains.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const catalog = read('app/data/catalog.json');
const index = buildIndex(catalog);
const cal = read('app/data/dia/index.json');
const day = (n) => read(`app/data/dia/${n}.json`);
const entry = day(1);

test('cuadro del día: el número de día cuenta desde el estreno y la lista da la vuelta (nunca un día vacío)', () => {
  assert.equal(dayNumber(cal.start, cal.start), 1);
  assert.equal(dayNumber(addDays(cal.start, 36), cal.start), 37);
  assert.equal(dayNumber(addDays(cal.start, -5), cal.start), 1, 'antes del estreno, el 1');
  const days = cal.days;
  assert.equal(entryFor(days, 1), days[0]);
  assert.equal(entryFor(days, days.length), days.at(-1));
  assert.equal(entryFor(days, days.length + 1), days[0], 'vuelve a empezar');
  assert.equal(slotFor(days.length, days.length * 3 + 2), 2);
  for (let n = 1; n <= 100; n++) assert.ok(entryFor(days, n), `día ${n} vacío`);
});

test('cuadro del día: determinista y añadir obras al catálogo no mueve ningún día', () => {
  const pick = (cat) => { const idx = buildIndex(cat); return Array.from({ length: 30 }, (_, k) => entryFor(cal.days, k + 1).artwork).map((id) => idx.artwork(id)?.id); };
  const before = pick(catalog);
  const extra = structuredClone(catalog);
  extra.artworks.push({ ...extra.artworks[0], id: 'w999999999', title: 'Obra nueva' });
  assert.deepEqual(pick(extra), before);
  assert.deepEqual(pick(catalog), before);
});

test('cuadro del día: el día cambia a medianoche de Madrid, no a la del móvil', () => {
  assert.equal(madridDayKey(new Date(Date.UTC(2026, 10, 27, 22, 59))), '2026-11-27');
  assert.equal(madridDayKey(new Date(Date.UTC(2026, 10, 27, 23, 1))), '2026-11-28');
  const n = (utc) => dayNumber(madridDayKey(utc), cal.start);
  assert.equal(n(new Date(Date.UTC(2026, 10, 27, 23, 1))) - n(new Date(Date.UTC(2026, 10, 27, 22, 59))), 1);
  assert.equal(nextInLabel({ h: 18, m: 0 }), '6 h');
  assert.equal(nextInLabel({ h: 23, m: 30 }), 'menos de 1 h');
});

test('cuadro del día: cada fallo apaga el nombre y enseña más (×3, ×1,6 y la época, entero y el año, el museo)', () => {
  let g = newGame();
  assert.deepEqual([revealStep(g), zoomFor(g), hintsFor(g)], [1, 3, []]);
  const wrong = entry.options.filter((id) => id !== entry.artistId);
  g = guess(g, entry, wrong[0]);
  assert.deepEqual([revealStep(g), zoomFor(g), hintsFor(g)], [2, 1.6, ['era']]);
  g = guess(g, entry, wrong[1]);
  assert.deepEqual([revealStep(g), zoomFor(g), hintsFor(g)], [3, 1, ['era', 'year']]);
  g = guess(g, entry, wrong[2]);
  assert.deepEqual([revealStep(g), zoomFor(g), hintsFor(g)], [4, 1, ['era', 'year', 'museum']]);
  g = guess(g, entry, entry.artistId);
  assert.ok(g.won && isOver(g) && revealStep(g) === 0);
  assert.equal(tryLabel({ won: true, tries: g.guesses.length }), 'A la cuarta');
});

test('cuadro del día: 4 intentos como mucho, sin repetir nombre ni nombres de fuera', () => {
  const wrong = entry.options.filter((id) => id !== entry.artistId);
  let g = newGame();
  g = guess(g, entry, wrong[0]);
  assert.equal(guess(g, entry, wrong[0]), g, 'repetido');
  assert.equal(guess(g, entry, 'no-existe'), g, 'de fuera');
  for (const id of wrong.slice(1, 4)) g = guess(g, entry, id);
  assert.ok(isOver(g) && !g.won && g.guesses.length === CUADRO_TRIES);
  assert.equal(guess(g, entry, entry.artistId), g, 'terminada');
  assert.equal(tryLabel({ won: false, tries: 4 }), 'Esta vez no');
});

test('cuadro del día: finishCuadro una sola vez, con XP, racha, meta y medallas sin repetir', () => {
  const p0 = emptyProgress();
  const won = guess(newGame(), entry, entry.artistId);
  const r1 = finishCuadro(p0, index, { date: '2026-11-27', n: 1, game: won }, '2026-11-27', { goal: 50 });
  assert.ok(r1.applied);
  assert.equal(r1.xp, CUADRO_XP.won);
  assert.equal(r1.progress.xp, 10);
  assert.equal(r1.progress.xpByDay['2026-11-27'], 10);
  assert.equal(r1.progress.streak.current, 1, 'cuenta para la racha general');
  assert.deepEqual(r1.progress.cuadros['2026-11-27'], { n: 1, guesses: [entry.artistId], won: true, tries: 1 });
  assert.ok(r1.progress.medals['daily-1'] && r1.progress.medals['daily-perfect']);
  assert.deepEqual(r1.events.filter((e) => e.type === 'medal').map((e) => e.id).sort(), ['daily-1', 'daily-perfect']);
  const again = finishCuadro(r1.progress, index, { date: '2026-11-27', n: 1, game: won }, '2026-11-27');
  assert.ok(!again.applied && again.progress === r1.progress, 'el mismo día no cuenta dos veces');
  const wrong = entry.options.filter((id) => id !== entry.artistId);
  let lost = newGame();
  for (const id of wrong.slice(0, 4)) lost = guess(lost, entry, id);
  const r2 = finishCuadro(r1.progress, index, { date: '2026-11-28', n: 2, game: lost }, '2026-11-28');
  assert.equal(r2.xp, CUADRO_XP.lost);
  assert.equal(r2.progress.streak.current, 2);
  assert.equal(r2.events.filter((e) => e.type === 'medal').length, 0, 'las medallas no se repiten');
  assert.equal(cuadroCount(r2.progress), 2);
  assert.ok(!finishCuadro(p0, index, { date: '2026-11-27', n: 1, game: newGame() }, '2026-11-27').applied, 'sin terminar no se guarda');
  assert.deepEqual(medalInfo('daily-1', index).title, 'Primer cuadro del día');
  assert.deepEqual(medalInfo('daily-perfect', index).title, 'A la primera');
});

test('cuadro del día: lo ganado se cuenta (puntos, racha y medallas) sin repetir la medalla de racha', () => {
  const won = gainsHtml(index, { won: true, tries: 2 }, [{ type: 'streak', value: 3 }, { type: 'medal', id: 'streak-3' }, { type: 'medal', id: 'daily-1' }]);
  assert.ok(won.includes('+10 puntos') && won.includes('3 días de racha') && won.includes('Primer cuadro del día'));
  assert.equal((won.match(/<li/g) || []).length, 3, 'la medalla de racha no se repite');
  assert.ok(gainsHtml(index, { won: false, tries: 4 }, []).includes('+5 puntos'));
});

test('cuadro del día: cuadritos y texto compartido sin pintor, título ni año', () => {
  assert.equal(cuadroGrid({ guesses: ['a', 'b', 'c'], won: true }), '🟥🟥🟩⬛');
  assert.equal(cuadroGrid({ guesses: ['a', 'b', 'c', 'd'], won: false }), '🟥🟥🟥🟥');
  assert.equal(cuadroGrid({ guesses: ['a'], won: true }), '🟩⬛⬛⬛');
  const text = cuadroShareText({ n: 37, guesses: ['a', 'b', 'c'], won: true }, 'https://sfumato.dibulios.com/h/cuadro-9.html');
  assert.equal(text, 'Sfumato · Cuadro del día 37\n🖼️ 🟥🟥🟩⬛\nhttps://sfumato.dibulios.com/h/cuadro-9.html');
  for (const d of cal.days) {
    const e = day(d.n);
    const w = index.artwork(e.artwork);
    const a = index.artist(e.artistId);
    const shared = cuadroShareText({ n: d.n, guesses: [e.artistId], won: true }, `https://sfumato.dibulios.com/h/cuadro-${d.n}.html`).toLowerCase();
    for (const bit of [a.name, a.short, w.title, String(w.yearSort)].filter(Boolean)) assert.ok(!shared.includes(bit.toLowerCase()), `día ${d.n}: «${bit}»`);
    const page = readFileSync(join(root, `app/h/cuadro-${d.n}.html`), 'utf8').toLowerCase();
    assert.ok(page.includes("location.replace('../#cuadro-del-dia')"), 'el enlace abre siempre el cuadro de hoy');
    for (const bit of [a.short, w.title].filter(Boolean)) assert.ok(!page.includes(bit.toLowerCase()), `página ${d.n}: «${bit}»`);
  }
});

test('cuadro del día: la guía lo propone una vez al día, pendiente y nunca tras una ronda floja', () => {
  const p = emptyProgress();
  assert.ok(cuadroNudge(p, '2026-11-27'));
  assert.ok(!cuadroNudge(p, '2026-11-27', { weak: true }));
  const shown = markNudged(p, '2026-11-27');
  assert.ok(!cuadroNudge(shown, '2026-11-27'));
  assert.ok(cuadroNudge(shown, '2026-11-28'));
  assert.ok(!cuadroNudge({ ...p, cuadros: { '2026-11-27': { n: 1, guesses: ['x'], won: true, tries: 1 } } }, '2026-11-27'), 'hecho');
});

test('cuadro del día: el detalle se queda dentro del cuadro y el recorte crece con cada paso', () => {
  const w = { w: 2000, h: 1000 };
  const [x0, y0, x1, y1] = cropRect(w, [0.99, 0.01], 3);
  assert.ok(x0 >= 0 && y0 >= 0 && x1 <= 1 + 1e-9 && y1 <= 1 + 1e-9);
  assert.ok(Math.abs((y1 - y0) - 1 / 3) < 1e-9 && Math.abs((x1 - x0) - 1 / 6) < 1e-9);
  const big = cropRect(w, [0.5, 0.5], 1.6);
  assert.ok(big[2] - big[0] > x1 - x0);
});

test('cuadro del día: ALARMA, quedan al menos 3 días de calendario por delante (si falla, añade cuadros al calendario)', () => {
  assert.equal(calendarAlarm(14, '2026-11-27', '2026-12-07'), false);
  assert.equal(calendarAlarm(14, '2026-11-27', '2026-12-08'), true, 'a 3 días del final ya avisa');
  const today = madridDayKey(new Date());
  const left = daysLeft(cal.days.length, cal.start, today);
  assert.ok(left >= CUADRO_ALARM_DAYS,
    `Quedan ${Math.max(0, left)} días de Cuadro del día: el último nuevo es el ${addDays(cal.start, cal.days.length - 1)}. Añade cuadros al final de contenido/cuadro-del-dia/calendario.json y pasa tools/sync_cuadro_dia.py.`);
});

test('cuadro del día: el calendario pasa la validación (obras, 6 pintores, nitidez, reparto) y los datos están al día', () => {
  execFileSync('python3', ['-I', join(root, 'tools/sync_cuadro_dia.py'), '--check', '--hoy', cal.start], { stdio: 'pipe' });
  const src = read('contenido/cuadro-del-dia/calendario.json');
  assert.equal(src.days.length, cal.days.length, 'falta pasar tools/sync_cuadro_dia.py');
  src.days.forEach((d, k) => {
    const e = day(k + 1);
    assert.equal(e.artwork, d.artwork);
    assert.deepEqual([...e.options].sort(), [...d.options, index.artwork(d.artwork).artistId].sort());
    assert.deepEqual(e.cards.map((c) => c.text), d.cards.map((c) => c.text), `día ${k + 1}: datos sin regenerar`);
    assert.ok(!('source' in e.cards[0]), 'la fuente no va en las tarjetas');
  });
});

test('cuadro del día: las firmas legibles (Van Eyck, El Greco, Monet, Sorolla) van tapadas hasta acabar y fuera de los recortes', () => {
  const veiled = cal.days.filter((d) => day(d.n).veil).map((d) => index.artwork(d.artwork).artistId).sort();
  assert.deepEqual(veiled, ['el-greco', 'monet', 'sorolla', 'van-eyck']);
  for (const d of cal.days) {
    const e = day(d.n);
    if (!e.veil) continue;
    for (const z of [3, 1.6]) {
      const [x0, y0, x1, y1] = cropRect(index.artwork(e.artwork), e.focus, z);
      const [a0, b0, a1, b1] = e.veil;
      assert.ok(!(x0 < a1 && a0 < x1 && y0 < b1 && b0 < y1), `día ${d.n}: el recorte ×${z} enseña la firma`);
    }
  }
  const src = readFileSync(join(root, 'app/js/ui/screens/cuadro-dia.js'), 'utf8');
  assert.match(src, /isOver\(game\) \? null : entry\.veil/, 'el velo se quita solo al acabar');
});

test('cuadro del día: sin «ayer» ni «mañana» en sus textos ni en sus pantallas', () => {
  const banned = /\b(ayer|mañana)\b/i;
  for (const f of readdirSync(join(root, 'app/data/dia'))) assert.doesNotMatch(readFileSync(join(root, 'app/data/dia', f), 'utf8'), banned, f);
  for (const f of ['app/js/ui/screens/cuadro-dia.js', 'app/js/ui/screens/cuadro-dia-hecho.js', 'app/js/engine/cuadro-dia.js']) {
    assert.doesNotMatch(readFileSync(join(root, f), 'utf8'), banned, f);
  }
});

test('estado v10 → v11: partidas del Cuadro del día vacías, el diario de antes intacto y su ronda a medias fuera', () => {
  assert.equal(SCHEMA_VERSION, 11);
  const daily = { '2026-11-20': { score: 4, total: 5, firstTry: [true, true, false, true, true] } };
  const old = { version: 10, onboarded: true, progress: { ...emptyProgress(), xp: 120, daily, medals: { 'daily-1': '2026-11-20' } }, settings: {}, session: { kind: 'daily', route: 'reto-diario' } };
  delete old.progress.cuadros;
  delete old.progress.cuadroNudge;
  const s = migrate(old);
  assert.equal(s.version, 11);
  assert.deepEqual(s.progress.cuadros, {});
  assert.equal(s.progress.cuadroNudge, '');
  assert.deepEqual(s.progress.daily, daily);
  assert.equal(s.progress.medals['daily-1'], '2026-11-20', 'las medallas conservan su id');
  assert.deepEqual(s.session, {});
  const kept = migrate({ ...old, session: { kind: 'stage', route: 'etapa-x' } });
  assert.deepEqual(kept.session, { kind: 'stage', route: 'etapa-x' });
  const half = { session: { route: 'reto-diario', kind: 'daily', savedAt: Date.now(), round: { queue: [], firstTry: [], baseCount: 0, pos: 0 } } };
  assert.equal(readSession(half, index, Date.now()), null, 'una ronda diaria a medias se descarta sin error');
});

test('rutas: #cuadro-del-dia, #reto-diario como alias y los enlaces de reto diario antiguos llevan al Cuadro del día', () => {
  const today = '2026-11-27';
  assert.deepEqual(parseRoute('#cuadro-del-dia', { today }), { name: 'cuadro' });
  assert.deepEqual(parseRoute('#reto-diario', { today }), { name: 'cuadro' });
  assert.deepEqual(parseRoute('#reto-d20261120-4', { today }), { name: 'cuadro' });
  assert.equal(parseRoute('#reto-w202647-3', { today }).name, 'challenge', 'el semanal sigue igual');
});
