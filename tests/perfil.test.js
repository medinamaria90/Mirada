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
const { figuresHtml, museumHtml, welcomeHtml, testHtml, practiceHtml } = await import('../app/js/ui/screens/profile-parts.js');
const { medalGroupsHtml } = await import('../app/js/ui/screens/profile-medals.js');
const { settingsHtml } = await import('../app/js/ui/screens/profile-settings.js');
const { nameSheetHtml } = await import('../app/js/ui/screens/profile-name.js');
const { lookSheetHtml } = await import('../app/js/ui/screens/profile-look.js');
const { cardLines } = await import('../app/js/ui/screens/profile-share.js');
const { rankLine } = await import('../app/js/ui/screens/result.js');
const { TEST_LEVELS, shareText } = await import('../app/js/test/resultado.js');
const { emptyProgress } = await import('../app/js/engine/progress.js');

const index = bigIndex();
const TODAY = '2026-11-24';
const ctxFor = (progress, settings = {}) => {
  const state = { ...defaultState(), progress, settings: { ...defaultState().settings, ...settings } };
  return { index, today: () => TODAY, dailyDay: () => TODAY, store: { get: () => state } };
};
const FORBIDDEN = /\bayer\b|\bmañana\b/i;
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('nombre: se limpia, se recorta a 24 caracteres, conserva los emojis compuestos y lo que no es texto queda vacío', () => {
  assert.equal(normalizeName('  María   Medina '), 'María Medina');
  assert.equal(normalizeName('a\nb\tc'), 'a b c');
  assert.equal(normalizeName('x'.repeat(40)).length, NAME_MAX);
  assert.equal([...normalizeName('🎨'.repeat(30))].length, NAME_MAX);
  assert.equal(normalizeName('\u{1F469}‍\u{1F3A8}'), '\u{1F469}‍\u{1F3A8}', 'el pegamento de los emojis compuestos se queda');
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
  assert.doesNotMatch(read('../app/js/ui/screens/result.js'), /levelFor|levelName|Nuevo nivel/, 'el resultado enseña la escala de niveles');
  assert.doesNotMatch(read('../app/js/engine/finish.js'), /levelup|levelFor/, 'queda código de la escala de niveles');
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
  assert.equal(P.collectionWorks(p, index).length, 12);
  assert.doesNotMatch(figuresHtml(ctx), /día|racha/i, 'la racha ya está en la cabecera');
});

test('portada y avatar elegibles entre toda la colección, con recorte hacia el foco; portada de muestra sin cuadros', () => {
  const p = emptyProgress();
  assert.deepEqual(P.museumWorks(p, index), []);
  assert.equal(P.coverWork(p, index), null);
  assert.ok(P.sampleCover(index), 'sin cuadros hay una portada de muestra');
  const ws = index.artworks.slice(0, 12);
  ws.forEach((w, i) => { p.collection[w.id] = `2026-11-${String(10 + i).padStart(2, '0')}`; });
  const m = P.museumWorks(p, index);
  assert.equal(m[0].id, ws[11].id);
  assert.equal(m[8].id, ws[3].id);
  const auto = P.coverWork(p, index);
  assert.ok(auto && p.collection[auto.id]);
  assert.equal(P.coverWork(p, index, ws[0].id).id, ws[0].id, 'se puede elegir uno que no es de los últimos');
  assert.equal(P.coverWork(p, index, 'w999999').id, auto.id, 'una elegida que ya no está vuelve a la automática');
  assert.equal(P.avatarWork(p, index, ''), null);
  assert.equal(P.avatarWork(p, index, ws[2].id).id, ws[2].id);
  assert.equal(P.focusPosition({ focus: [0.42, 0.18] }), '42% 18%');
  assert.equal(P.focusPosition({}), '50% 30%');
  assert.equal(P.focusPosition({ focus: [2, -1] }), '100% 0%');
});

test('logros: oro, plata y bronce; reparto por clases; inicial (primera letra); último test con fecha y cuadrícula; mismo texto que el test', () => {
  assert.equal(P.medalTier('eye-x'), 'gold');
  assert.equal(P.medalTier('streak-30'), 'gold');
  assert.equal(P.medalTier('streak-7'), 'silver');
  assert.equal(P.medalTier('streak-3'), 'bronze');
  assert.equal(P.medalTier('movement-barroco'), 'silver');
  assert.equal(P.medalTier('artist-goya'), 'bronze');
  assert.deepEqual(P.interleaveByKind(['eye-a', 'eye-b', 'eye-c', 'artist-x', 'streak-3', 'artist-y']), ['eye-a', 'artist-x', 'streak-3', 'eye-b', 'artist-y', 'eye-c']);
  assert.equal(P.initialOf('  ana'), 'A');
  assert.equal(P.initialOf('<b>Ana'), 'B');
  assert.equal(P.initialOf(''), '');
  assert.equal(P.parseLastTest('nada'), null);
  assert.equal(P.parseLastTest(null), null);
  const lvl = TEST_LEVELS[3];
  assert.deepEqual(P.parseLastTest(`{"correct":24,"asked":40,"level":"${lvl}","percentile":78,"date":"2026-11-12"}`), { correct: 24, asked: 40, level: lvl, percentile: 78, date: '2026-11-12', grid: '' });
  assert.equal(P.parseLastTest('{"correct":24,"asked":40,"level":"Conocedor","percentile":78}').level, '', 'un nivel antiguo con nombre de rango no se enseña');
  assert.equal(P.parseLastTest(`{"correct":24,"asked":40,"level":"${lvl}"}`).percentile, null);
  assert.equal(P.parseLastTest(`{"correct":1,"asked":2,"level":"${lvl}","grid":"🟩🟨⬜⬜⬜"}`).grid, '🟩🟨⬜⬜⬜');
  assert.equal(P.parseLastTest(`{"correct":1,"asked":2,"level":"${lvl}","grid":"<img>"}`).grid, '');
  assert.match(shareText({ correct: 24, asked: 40, level: lvl, percentile: 78, grid: '🟩🟩🟨⬜⬜' }, 'https://x/test/'), /24 de 40[^\n]*\n[^\n]*78 % de la gente 🟩🟩🟨⬜⬜\nhttps:\/\/x\/test\//);
  assert.doesNotMatch(shareText({ correct: 1, asked: 40, level: '', percentile: null, grid: '' }, 'u'), /·|%/, 'sin nivel ni percentil no quedan huecos');
  assert.deepEqual(cardLines({ correct: 24, asked: 40, level: lvl, percentile: 78 }), { level: lvl, score: '24 de 40', percentile: 'Sabes más de pintura que el 78 % de la gente' });
});

test('HTML del perfil nuevo: título «Perfil», logo, bienvenida con propósito, test cerca y reto semanal bloqueado con lo que falta', () => {
  const ctx = ctxFor(emptyProgress());
  const hero = heroHtml(ctx);
  assert.match(hero, /<h1[^>]*>Perfil<\/h1>/);
  assert.match(hero, /Ponte un nombre/);
  assert.match(hero, /class="logo"/);
  assert.match(hero, /Curioso/);
  assert.match(hero, /role="progressbar"/);
  assert.match(hero, /Ganar 300 XP más/);
  assert.match(hero, /pf-cover-cap/, 'portada de muestra con su pie');
  assert.doesNotMatch(hero, /pf-look/, 'sin cuadros no hay nada que elegir');
  assert.match(hero, /data-action="open-settings"[^>]*aria-label="Ajustes"/);
  const welcome = welcomeHtml();
  assert.match(welcome, /Aquí vivirá tu museo/);
  assert.match(welcome, /btn-primary[^>]*href="#inicio"/);
  const test = testHtml(null, { primary: false });
  assert.doesNotMatch(test, /btn-primary/, 'con «Ir al camino» como principal, el test no compite');
  assert.match(test, /Hacer el test/);
  assert.match(testHtml(null), /btn-primary[^>]*href="test\/"/);
  const practice = practiceHtml(ctx);
  assert.match(practice, /is-locked[\s\S]*Reto semanal[\s\S]*Domina el camino: te quedan \d+ paradas?/);
  assert.doesNotMatch(practice, /data-action="weekly"/);
});

test('el orden del DOM es el visual: identidad, cifras, museo, logros, test, accesos; en escritorio, áreas de rejilla', () => {
  const src = read('../app/js/ui/screens/profile.js');
  const from = src.indexOf('pf-layout');
  const order = ['heroHtml(ctx)', 'figuresHtml(ctx)', 'museumHtml(ctx)', 'medalsHtml(ctx)', '${test}', 'practiceHtml(ctx)'].map((k) => src.indexOf(k, from));
  assert.ok(order.every((n) => n > 0) && order.every((n, i) => i === 0 || n > order[i - 1]), `orden: ${order}`);
  const css = read('../app/css/profile.css');
  assert.match(css, /grid-template-areas/);
  assert.doesNotMatch(css, /display: contents/);
});

test('concordancia: 0, 1 y 2 en cifras, requisitos del rango y logros', () => {
  const figs = (n) => {
    const p = emptyProgress();
    index.artworks.slice(0, n).forEach((w) => { p.collection[w.id] = '2026-11-20'; });
    for (const a of index.path.slice(0, n)) p.artists[a.id] = { plays: 1, best: 1, mastered: true, last: TODAY };
    return figuresHtml(ctxFor(p));
  };
  assert.match(figs(0), />cuadros<[\s\S]*>pintores dominados</);
  assert.match(figs(1), />cuadro<[\s\S]*>pintor dominado</);
  assert.match(figs(2), />cuadros<[\s\S]*>pintores dominados</);
  const need = (key, n, next) => P.rankProgress({ next: { name: 'X', ...next }, stats: { xp: 0, deep: 0, eras: 0, complete: 0, grand: [] }, missing: [{ key, have: 0, need: n }] }).parts[0];
  assert.match(need('deep', 1, { deep: 1 }), /1 nivel «a fondo» más/);
  assert.match(need('deep', 2, { deep: 2 }), /2 niveles «a fondo» más/);
  assert.match(need('eras', 1, { eras: 1 }), /en 1 época más/);
  assert.match(need('eras', 2, { eras: 2 }), /en 2 épocas más/);
  assert.match(need('complete', 1, { complete: 1 }), /1 gran maestro más/);
  assert.match(need('complete', 2, { complete: 2 }), /2 grandes maestros más/);
  assert.match(need('grand', 1, { grand: { count: 1, upTo: 2 } }), /1 gran maestro más hasta/);
  assert.match(need('grand', 2, { grand: { count: 2, upTo: 2 } }), /2 grandes maestros más hasta/);
  assert.equal(P.plural(0, 'cuadro', 'cuadros'), '0 cuadros');
  assert.equal(P.plural(1, 'cuadro', 'cuadros'), '1 cuadro');
  assert.equal(P.plural(2, 'cuadro', 'cuadros'), '2 cuadros');
});

test('cifras grandes: exactas hasta 9 999 y abreviadas («31,3 mil», «9,9 M») sin partirse; la exacta, para lectores de pantalla', () => {
  assert.equal(P.compactNumber(0), '0');
  assert.equal(P.compactNumber(9999), '9999');
  assert.equal(P.compactNumber(10000), '10 mil');
  assert.equal(P.compactNumber(31200), '31,2 mil');
  assert.equal(P.compactNumber(31250), '31,3 mil');
  assert.equal(P.compactNumber(9876543), '9,9 M');
  const html = figuresHtml(ctxFor({ ...emptyProgress(), xp: 31250 }));
  assert.match(html, /is-compact[^>]*><span aria-hidden="true">31,3 mil<\/span><span class="sr-only">31\.250<\/span>/);
  const num = read('../app/css/profile.css').match(/\.pf-fig-num \{[^}]*\}/)[0];
  assert.match(num, /white-space: nowrap/);
  assert.doesNotMatch(num, /overflow-wrap/);
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
  const t = testHtml({ correct: 24, asked: 40, level: TEST_LEVELS[2], percentile: 78, date: '2026-11-12', grid: '' });
  assert.match(t, /24<\/strong> de 40/);
  assert.match(t, /78 %/);
  assert.match(t, /Repetir el test/);
  assert.match(t, /Hecho el .*noviembre/);
  assert.match(t, /data-action="share-test"/);
  assert.equal((t.match(/btn-primary/g) || []).length, 1);
});

test('logros: hoja con grupos y filtros, sin la etiqueta de metal repetida y con «dominado» en los pintores', () => {
  const p = emptyProgress();
  p.medals[`artist-${index.path[0].id}`] = '2026-11-20';
  p.medals['streak-3'] = '2026-11-21';
  const ctx = ctxFor(p);
  const all = medalGroupsHtml(ctx, 'all');
  for (const g of ['Pintores', 'Movimientos', 'Rachas', 'Ojo de…', 'Retos y metas']) assert.match(all, new RegExp(g));
  assert.match(all, /dominado/);
  assert.doesNotMatch(all, /pf-tier/);
  const got = medalGroupsHtml(ctx, 'got');
  assert.equal((got.match(/class="pf-medal /g) || []).length, 2);
  assert.doesNotMatch(got, /Movimientos/);
  assert.equal(medalGroupsHtml(ctx, 'missing').match(/is-got/g), null);
});

test('hojas: ajustes con todo, nombre con contador y nota, portada y avatar en pestañas; sin «ayer» ni «mañana»', () => {
  const html = settingsHtml(ctxFor(emptyProgress()));
  for (const k of ['music', 'sfx', 'volume', 'reducedMotion']) assert.match(html, new RegExp(`data-setting="${k}"`));
  assert.match(html, /data-action="theme"/);
  assert.match(html, /data-action="goal"/);
  assert.match(html, /data-action="reset"/);
  const name = nameSheetHtml();
  assert.doesNotMatch(name, /maxlength/, 'el máximo se cuenta por caracteres en JavaScript, no por unidades de texto');
  assert.match(name, /Solo se guarda en este dispositivo/);
  assert.match(name, /pf-counter/);
  const look = lookSheetHtml();
  assert.match(look, /role="tablist"/);
  assert.match(look, /role="tab"[^>]*data-target="avatar"/);
  const ctx = ctxFor(emptyProgress());
  for (const h of [html, name, look, heroHtml(ctx), figuresHtml(ctx), welcomeHtml(), practiceHtml(ctx)]) assert.doesNotMatch(h, FORBIDDEN);
});

test('el foco se queda: las hojas repintan solo lo que cambia, no la cabecera entera ni la rejilla', () => {
  assert.doesNotMatch(read('../app/js/ui/screens/profile-hero.js'), /\.pf-hero['"], el\)\.outerHTML/);
  const look = read('../app/js/ui/screens/profile-look.js');
  assert.doesNotMatch(look.slice(look.indexOf('const save'), look.indexOf('return {', look.indexOf('const save'))), /innerHTML/, 'elegir no reescribe la rejilla');
  assert.doesNotMatch(read('../app/js/ui/screens/profile-name.js'), /\.focus\(\{ preventScroll/, 'el foco vuelve en el cierre de la hoja, no antes');
});

test('«Empezar de cero» borra también el nombre, la portada, el avatar y el último test', () => {
  const src = read('../app/js/ui/screens/profile-settings.js');
  assert.match(src, /name: '', cover: '', avatar: ''/);
  assert.match(src, /'mirada\.test\.last'/);
  assert.match(src, /localStorage\.removeItem/);
});

test('compartir: el código de la tarjeta se pide al pulsar, con botón en espera, JPEG y recorte al rectángulo del cuadro', () => {
  const profile = read('../app/js/ui/screens/profile.js');
  assert.doesNotMatch(profile, /^import .*profile-share/m);
  assert.match(profile, /import\('\.\/profile-share\.js'\)/);
  assert.match(profile, /aria-busy/);
  assert.match(profile, /button\.disabled = true/);
  const card = read('../app/js/ui/screens/profile-share.js');
  assert.match(card, /image\/jpeg/);
  assert.match(card, /g\.clip\(\)/);
  assert.doesNotMatch(card, /sfumato-arte\.onrender\.com/, 'el dominio sale de la página, no está escrito');
  assert.match(read('../app/test/index.html'), /rel="canonical" href="https:\/\/sfumato-arte\.onrender\.com\/test\/"/);
});

test('el perfil no carga el audio con la música apagada', () => {
  assert.match(read('../app/js/ui/screens/profile.js'), /settings\.music\) \(/);
});
