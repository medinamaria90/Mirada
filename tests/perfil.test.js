// Perfil nuevo: datos puros (rango, portada, museo, metales, test), nombre con su migración y HTML sin navegador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bigIndex } from './helpers.js';

// result.js toca el documento al cargarse (colores): un documento mínimo basta.
globalThis.document = { documentElement: {} };
globalThis.getComputedStyle = () => ({ getPropertyValue: () => '#000000' });

const { migrate, defaultState, normalizeName, normalizeArtworkId, NAME_MAX, SCHEMA_VERSION } = await import('../app/js/state/schema.js');
const { rankFor, RANKS } = await import('../app/js/engine/ranks.js');
const P = await import('../app/js/engine/profile.js');
const { heroHtml } = await import('../app/js/ui/screens/profile-hero.js');
const { figuresHtml, museumHtml, testHtml, practiceHtml } = await import('../app/js/ui/screens/profile-parts.js');
const { settingsHtml } = await import('../app/js/ui/screens/profile-settings.js');
const { nameSheetHtml } = await import('../app/js/ui/screens/profile-name.js');
const { lookSheetHtml } = await import('../app/js/ui/screens/profile-look.js');
const { cardLines } = await import('../app/js/ui/screens/profile-share.js');
const { rankLine } = await import('../app/js/ui/screens/result.js');
const { TEST_LEVELS } = await import('../app/js/test/resultado.js');
const { emptyProgress } = await import('../app/js/engine/progress.js');

const index = bigIndex();
const TODAY = '2026-11-24';
const ctxFor = (progress, settings = {}) => {
  const state = { ...defaultState(), progress, settings: { ...defaultState().settings, ...settings } };
  return { index, today: () => TODAY, dailyDay: () => TODAY, store: { get: () => state } };
};
const FORBIDDEN = /\bayer\b|\bmañana\b/i;

test('nombre: se limpia, se recorta a 24 caracteres y lo que no es texto queda vacío', () => {
  assert.equal(normalizeName('  María   Medina '), 'María Medina');
  assert.equal(normalizeName('a\nb\tc'), 'a b c');
  assert.equal(normalizeName('x'.repeat(40)).length, NAME_MAX);
  assert.equal([...normalizeName('🎨'.repeat(30))].length, NAME_MAX);
  assert.equal(normalizeName(null), '');
  assert.equal(normalizeName(42), '');
  assert.equal(normalizeArtworkId('w123'), 'w123');
  assert.equal(normalizeArtworkId('<img>'), '');
});

test('migración 7 → 8: nombre, portada y avatar vacíos, conserva el resto; y limpia lo que llegue sin pasar por la hoja', () => {
  assert.equal(SCHEMA_VERSION, 8);
  const v7 = { version: 7, onboarded: true, progress: { xp: 500 }, settings: { music: false, sfx: true, volume: 0.2, reducedMotion: true, dailyGoal: 100, theme: 'dark' }, session: {} };
  const out = migrate(v7);
  assert.equal(out.version, 8);
  assert.deepEqual(out.settings, { ...v7.settings, name: '', cover: '', avatar: '' });
  assert.equal(out.progress.xp, 500);
  assert.equal(migrate({ version: 8, settings: { name: 'Ana' } }).settings.name, 'Ana');
  const dirty = migrate({ version: 8, settings: { name: `  ${'x'.repeat(50)}\n`, cover: '<script>', avatar: 'w9' } });
  assert.equal(dirty.settings.name.length, NAME_MAX);
  assert.equal(dirty.settings.cover, '');
  assert.equal(dirty.settings.avatar, 'w9');
  assert.equal(defaultState().settings.name, '');
});

test('rango: la barra avanza con lo cumplido y dice lo que falta con frases humanas; el máximo no tiene siguiente', () => {
  const p = emptyProgress();
  let bar = P.rankProgress(rankFor(p, index));
  assert.equal(bar.next, 'Aficionado');
  assert.equal(bar.fraction, 0);
  assert.deepEqual(bar.parts, ['Ganar 300 XP más']);
  p.xp = 150;
  bar = P.rankProgress(rankFor(p, index));
  assert.equal(bar.fraction, 0.5);
  assert.equal(bar.items[0].fraction, 0.5);
  p.xp = 1300;
  bar = P.rankProgress(rankFor(p, index));
  assert.equal(bar.next, 'Copista');
  assert.match(bar.parts[0], /^Dominar 1 nivel «a fondo» más$/);
  assert.deepEqual(P.rankProgress({ next: null, stats: {}, missing: [] }), { fraction: 1, next: null, parts: [], items: [] });
});

test('una sola escala: los niveles del test no se llaman como ningún rango, y perfil y resultado dan el mismo rango', () => {
  const ranks = RANKS.map((r) => r.name.toLowerCase());
  for (const name of TEST_LEVELS) assert.ok(!ranks.includes(name.toLowerCase()), `«${name}» es también un rango`);
  assert.equal(new Set(TEST_LEVELS).size, TEST_LEVELS.length);
  for (const xp of [0, 150, 300, 1500, 5200, 9300, 26000]) {
    const p = { ...emptyProgress(), xp };
    const line = rankLine(p, index);
    assert.equal(line.name, rankFor(p, index).name);
    const hero = heroHtml(ctxFor(p));
    assert.ok(hero.includes(`<span>${line.name}</span>`), `el perfil no dice «${line.name}» con ${xp} XP`);
    assert.ok(hero.includes(`aria-valuenow="${line.pct}"`), 'la barra del perfil y la del resultado no coinciden');
  }
  const src = readFileSync(new URL('../app/js/ui/screens/result.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /levelFor|levelName|Nuevo nivel/, 'el resultado enseña la escala de niveles');
});

test('museo y cifra de cuadros cuentan lo mismo (la colección); «reconoces» es el dato secundario', () => {
  const p = emptyProgress();
  const ws = index.artworks.slice(0, 12);
  ws.forEach((w, i) => { p.collection[w.id] = `2026-11-${String(10 + i).padStart(2, '0')}`; });
  p.collection.noexiste = '2026-11-30';
  const ctx = ctxFor(p);
  assert.match(figuresHtml(ctx), /pf-fig-num">12<\/strong><span class="pf-fig-label">cuadros</);
  assert.doesNotMatch(figuresHtml(ctx), /que reconoces/, 'sin cuadros en caja 3 no hay dato de reconocidos');
  p.srs[`art:${ws[0].id}`] = { box: 3, due: TODAY };
  assert.match(figuresHtml(ctx), /1 que reconoces/);
  assert.equal(P.museumWorks(p, index).length, 9);
  assert.equal(P.collectionIds(p, index).length, 12);
  assert.doesNotMatch(figuresHtml(ctx), /día|racha/i, 'la racha ya está en la cabecera');
});

test('museo: los últimos nueve cuadros; portada y avatar elegibles entre los de la colección, con recorte hacia el foco', () => {
  const p = emptyProgress();
  assert.deepEqual(P.museumWorks(p, index), []);
  assert.equal(P.coverWork(p, index), null);
  const ws = index.artworks.slice(0, 12);
  ws.forEach((w, i) => { p.collection[w.id] = `2026-11-${String(10 + i).padStart(2, '0')}`; });
  const m = P.museumWorks(p, index);
  assert.equal(m[0].id, ws[11].id);
  assert.equal(m[8].id, ws[3].id);
  const auto = P.coverWork(p, index);
  assert.ok(auto && p.collection[auto.id]);
  assert.equal(P.coverWork(p, index, ws[5].id).id, ws[5].id, 'la portada elegida manda');
  assert.equal(P.coverWork(p, index, 'w999999').id, auto.id, 'una elegida que ya no está vuelve a la automática');
  assert.equal(P.avatarWork(p, index, ''), null);
  assert.equal(P.avatarWork(p, index, ws[2].id).id, ws[2].id);
  assert.equal(P.focusPosition({ focus: [0.42, 0.18] }), '42% 18%');
  assert.equal(P.focusPosition({}), '50% 30%');
  assert.equal(P.focusPosition({ focus: [2, -1] }), '100% 0%');
});

test('logros: oro, plata y bronce; reparto por clases; inicial; último test (con fecha) válido o nulo', () => {
  assert.equal(P.medalTier('eye-x'), 'gold');
  assert.equal(P.medalTier('streak-30'), 'gold');
  assert.equal(P.medalTier('streak-7'), 'silver');
  assert.equal(P.medalTier('streak-3'), 'bronze');
  assert.equal(P.medalTier('movement-barroco'), 'silver');
  assert.equal(P.medalTier('artist-goya'), 'bronze');
  assert.deepEqual(P.interleaveByKind(['eye-a', 'eye-b', 'eye-c', 'artist-x', 'streak-3', 'artist-y']), ['eye-a', 'artist-x', 'streak-3', 'eye-b', 'artist-y', 'eye-c']);
  assert.equal(P.initialOf('  ana'), 'A');
  assert.equal(P.initialOf(''), '');
  assert.equal(P.parseLastTest('nada'), null);
  assert.equal(P.parseLastTest(null), null);
  const lvl = TEST_LEVELS[3];
  assert.deepEqual(P.parseLastTest(`{"correct":24,"asked":40,"level":"${lvl}","percentile":78,"date":"2026-11-12"}`), { correct: 24, asked: 40, level: lvl, percentile: 78, date: '2026-11-12' });
  assert.equal(P.parseLastTest('{"correct":24,"asked":40,"level":"Conocedor","percentile":78}').level, '', 'un nivel antiguo con nombre de rango no se enseña');
  assert.equal(P.parseLastTest(`{"correct":24,"asked":40,"level":"${lvl}"}`).percentile, null);
  assert.match(P.testShareText({ correct: 24, asked: 40, level: lvl, percentile: 78 }, 'https://x/test/'), /24 de 40[^\n]*\n[^\n]*78 %[^\n]*\nhttps:\/\/x\/test\//);
  assert.deepEqual(cardLines({ correct: 24, asked: 40, level: lvl, percentile: 78 }), { level: lvl, score: '24 de 40', percentile: 'Sabes más de pintura que el 78 % de la gente' });
});

test('HTML del perfil vacío: logo y «Ponte un nombre», cifras a cero, museo con texto y un solo botón principal', () => {
  const ctx = ctxFor(emptyProgress());
  const hero = heroHtml(ctx);
  assert.match(hero, /Ponte un nombre/);
  assert.match(hero, /class="logo"/);
  assert.match(hero, /Curioso/);
  assert.match(hero, /role="progressbar"/);
  assert.match(hero, /Ganar 300 XP más/);
  assert.doesNotMatch(hero, /pf-look/, 'sin cuadros no hay nada que elegir');
  assert.match(hero, /data-action="open-settings"[^>]*aria-label="Ajustes"/);
  assert.match(figuresHtml(ctx), /pf-fig-num">0<[\s\S]*pf-fig-num">0<[\s\S]*pf-fig-num">0</);
  const museum = museumHtml(ctx);
  assert.equal((museum.match(/pf-tile-empty/g) || []).length, 9);
  assert.match(museum, /Aquí colgarás los cuadros/);
  assert.match(museum, /btn-primary[^>]*href="#inicio"/);
  assert.doesNotMatch(museum, /Ver todo/);
  assert.equal(practiceHtml(ctx), '');
  const test = testHtml(null, { primary: false });
  assert.doesNotMatch(test, /btn-primary/, 'con «Ir al camino» como principal, el test no compite');
  assert.match(test, /Hacer el test/);
  assert.match(testHtml(null), /btn-primary[^>]*href="test\/"/);
});

test('HTML con nombre y progreso: saludo, inicial, avatar de cuadro, pie de portada, test repetible con fecha; nombre escapado', () => {
  const p = emptyProgress();
  index.artworks.slice(0, 5).forEach((w, i) => { p.collection[w.id] = `2026-11-2${i}`; });
  const hero = heroHtml(ctxFor(p, { name: '<b>Ana</b>' }));
  assert.doesNotMatch(hero, /<b>Ana/);
  assert.match(hero, /Hola, &lt;b&gt;Ana/);
  assert.match(hero, /pf-cover-cap/);
  assert.match(hero, /data-action="open-look"/);
  assert.match(heroHtml(ctxFor(p, { name: 'María' })), /pf-initial">M</);
  const withAvatar = heroHtml(ctxFor(p, { name: 'María', avatar: index.artworks[1].id }));
  assert.match(withAvatar, /pf-avatar has-art/);
  assert.doesNotMatch(withAvatar, /pf-initial/);
  const museum = museumHtml(ctxFor(p));
  assert.equal((museum.match(/data-zoom-group="museo"/g) || []).length, 5);
  assert.equal((museum.match(/pf-tile-empty/g) || []).length, 4);
  assert.match(museum, /href="#coleccion">Ver todo/);
  assert.match(museum, /Último en colgarse/);
  const t = testHtml({ correct: 24, asked: 40, level: TEST_LEVELS[2], percentile: 78, date: '2026-11-12' });
  assert.match(t, /24<\/strong> de 40/);
  assert.match(t, /78 %/);
  assert.match(t, /Repetir el test/);
  assert.match(t, /Hecho el .*noviembre/);
  assert.match(t, /data-action="share-test"/);
  assert.equal((t.match(/btn-primary/g) || []).length, 1);
});

test('hojas: ajustes con todo, nombre con contador y nota, portada y avatar; sin «ayer» ni «mañana»', () => {
  const html = settingsHtml(ctxFor(emptyProgress()));
  for (const k of ['music', 'sfx', 'volume', 'reducedMotion']) assert.match(html, new RegExp(`data-setting="${k}"`));
  assert.match(html, /data-action="theme"/);
  assert.match(html, /data-action="goal"/);
  assert.match(html, /data-action="reset"/);
  const name = nameSheetHtml();
  assert.match(name, new RegExp(`maxlength="${NAME_MAX}"`));
  assert.match(name, /Solo se guarda en este dispositivo/);
  assert.match(name, /pf-counter/);
  assert.match(lookSheetHtml(), /data-target="avatar"/);
  const ctx = ctxFor(emptyProgress());
  for (const h of [html, name, lookSheetHtml(), heroHtml(ctx), figuresHtml(ctx), museumHtml(ctx)]) assert.doesNotMatch(h, FORBIDDEN);
});

test('«Empezar de cero» borra también el nombre, la portada, el avatar y el último test', () => {
  const src = readFileSync(new URL('../app/js/ui/screens/profile-settings.js', import.meta.url), 'utf8');
  assert.match(src, /name: '', cover: '', avatar: ''/);
  assert.match(src, /'mirada\.test\.last'/);
  assert.match(src, /localStorage\.removeItem/);
});

test('el perfil no carga el audio con la música apagada', () => {
  const src = readFileSync(new URL('../app/js/ui/screens/profile.js', import.meta.url), 'utf8');
  assert.match(src, /settings\.music\) playEra/);
});
