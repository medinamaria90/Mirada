// Perfil nuevo: datos puros (rango, portada, museo, metales, test), nombre con su migración y HTML sin navegador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bigIndex } from './helpers.js';

// result.js toca el documento al cargarse (colores): un documento mínimo basta.
globalThis.document = { documentElement: {} };
globalThis.getComputedStyle = () => ({ getPropertyValue: () => '#000000' });

const { migrate, defaultState, normalizeName, normalizeArtworkId, graphemes, NAME_MAX, SCHEMA_VERSION } = await import('../app/js/state/schema.js');
const { rankFor, RANKS } = await import('../app/js/engine/ranks.js');
const P = await import('../app/js/engine/profile.js');
const { heroHtml } = await import('../app/js/ui/screens/profile-hero.js');
const { welcomeHtml, testHtml, practiceHtml } = await import('../app/js/ui/screens/profile-parts.js');
const { medalGroupsHtml } = await import('../app/js/ui/screens/profile-medals.js');
const { settingsHtml } = await import('../app/js/ui/screens/profile-settings.js');
const { nameSheetHtml } = await import('../app/js/ui/screens/profile-name.js');
const { lookSheetHtml } = await import('../app/js/ui/screens/profile-look.js');
const { cardLines } = await import('../app/js/ui/screens/profile-share.js');
const { rankLine } = await import('../app/js/ui/screens/result.js');
const { realIndex } = await import('./helpers-real.js');
const { TEST_LEVELS, shareText } = await import('../app/js/test/resultado.js');
const { emptyProgress } = await import('../app/js/engine/progress.js');

const index = bigIndex();
const TODAY = '2026-11-24';
const ctxFor = (progress, settings = {}) => {
  const state = { ...defaultState(), progress, settings: { ...defaultState().settings, ...settings } };
  return { index, today: () => TODAY, dailyDay: () => TODAY, store: { get: () => state } };
};
const FORBIDDEN = /\bayer\b|\bmañana\b/i;
const gentleData = JSON.parse(readFileSync(new URL('../app/data/gentle.json', import.meta.url), 'utf8'));
const GENTLE = P.gentleSet(gentleData);
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('nombre: se limpia, se recorta a 24 caracteres, conserva los emojis compuestos y lo que no es texto queda vacío', () => {
  assert.equal(normalizeName('  María   Medina '), 'María Medina');
  assert.equal(normalizeName('a\nb\tc'), 'a b c');
  assert.equal(normalizeName('x'.repeat(40)).length, NAME_MAX);
  assert.equal(graphemes(normalizeName('🎨'.repeat(30))).length, NAME_MAX);
  const woman = '\u{1F469}\u{1F3FD}\u200D\u{1F3A8}'; // mujer artista con tono de piel: 4 puntos de código, 1 carácter
  assert.equal(graphemes(woman).length, 1);
  const cut = normalizeName(woman.repeat(30));
  assert.equal(graphemes(cut).length, NAME_MAX);
  assert.equal(cut, woman.repeat(NAME_MAX), 'el corte no parte una secuencia compuesta');
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
  assert.equal(bar.fraction, 0, 'con el XP cumplido pero el nivel «a fondo» sin empezar, la barra no marca nada');
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

test('el perfil no repite lo que se ve en otro sitio: sin museo ni cifras de cuadros o pintores; solo los XP, junto al rango', () => {
  const p = emptyProgress();
  const ws = index.artworks.slice(0, 12);
  ws.forEach((w, i) => { p.collection[w.id] = `2026-11-${String(10 + i).padStart(2, '0')}`; });
  p.xp = 3400;
  for (const a of index.path.slice(0, 3)) p.artists[a.id] = { plays: 1, best: 1, mastered: true, last: TODAY };
  const hero = heroHtml(ctxFor(p));
  assert.match(hero, /pf-rank-xp">3400<span class="pf-rank-xp-unit"> XP/);
  assert.doesNotMatch(hero, /cuadros? vistos?|pintores? dominados?/i);
  assert.doesNotMatch(welcomeHtml(), /museo|reconozc|reconoc/i);
  assert.match(welcomeHtml(), /Colecci/);
  assert.equal(P.collectionIds(p, index).length, 12);
  assert.equal(P.collectionWorks(p, index).length, 12);
  assert.equal(P.collectionWorks(p, index)[0].id, ws[11].id, 'lo último primero');
  for (const f of ['profile.js', 'profile-parts.js', 'profile-hero.js']) {
    const src = read(`../app/js/ui/screens/${f}`);
    assert.doesNotMatch(src, /museumHtml|museumWorks|Mi museo|figuresHtml|pf-museum|pf-figs/, `${f} aún habla del museo o de las cifras`);
  }
  const css = read('../app/css/profile.css');
  assert.doesNotMatch(css, /pf-museum|pf-tile-empty|pf-cta|pf-figs|pf-fig-|"museum|"figs/, 'CSS muerto del museo o de las cifras');
  assert.doesNotMatch(read('../app/js/engine/profile.js'), /museumWorks|MUSEUM_SIZE/);
});

test('portada y avatar elegibles entre toda la colección, con recorte hacia el foco; portada de muestra sin cuadros', () => {
  const p = emptyProgress();
  assert.deepEqual(P.collectionWorks(p, index), []);
  assert.equal(P.coverWork(p, index), null);
  assert.ok(P.sampleCover(index), 'sin cuadros hay una portada de muestra');
  const ws = index.artworks.slice(0, 12);
  ws.forEach((w, i) => { p.collection[w.id] = `2026-11-${String(10 + i).padStart(2, '0')}`; });
  const auto = P.coverWork(p, index);
  assert.ok(auto && p.collection[auto.id]);
  assert.equal(P.coverWork(p, index, ws[0].id).id, ws[0].id, 'se puede elegir cualquiera de la colección');
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
  assert.deepEqual(cardLines({ correct: 24, asked: 40, level: lvl, percentile: 78 }), { level: lvl, score: '24 de 40', percentile: 'Sé más de pintura que el 78 % de la gente' }, 'la tarjeta habla en primera persona, como el texto que se comparte');
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
  assert.match(welcome, /Tu perfil empieza aquí/);
  assert.match(welcome, /btn-primary[^>]*href="#inicio"/);
  const test = testHtml(null, { primary: false });
  assert.doesNotMatch(test, /btn-primary/, 'con «Ir al camino» como principal, el test no compite');
  assert.match(test, /Hacer el test/);
  assert.match(testHtml(null), /btn-primary[^>]*href="test\/"/);
  const practice = practiceHtml(ctx);
  assert.match(practice, /is-locked[\s\S]*Reto semanal[\s\S]*Se abre al dominar el camino/, 'sin ninguna parada dominada no se da una cifra que desanime');
  assert.doesNotMatch(practice, /quedan \d+/);
  const started = emptyProgress();
  const firstStep = index.steps[0];
  (firstStep.type === 'sala' ? started.salas : started.artists)[firstStep.id] = { plays: 1, best: 1, mastered: true, last: TODAY };
  assert.match(practiceHtml(ctxFor(started)), /Domina el camino: te quedan \d+ paradas?/);
  assert.doesNotMatch(practice, /data-action="weekly"/);
});

test('el orden del DOM es el visual: identidad, logros, test, accesos; en escritorio, las mismas filas con áreas de rejilla', () => {
  const src = read('../app/js/ui/screens/profile.js');
  const from = src.indexOf('pf-layout');
  const order = ['heroHtml(ctx)', 'medalsHtml(ctx)', '${test}', 'practiceHtml(ctx)'].map((k) => src.indexOf(k, from));
  assert.ok(order.every((n) => n > 0) && order.every((n, i) => i === 0 || n > order[i - 1]), `orden: ${order}`);
  const css = read('../app/css/profile.css');
  assert.match(css, /grid-template-areas: "hero hero" "medals medals" "test practice"/);
  assert.doesNotMatch(css, /display: contents/);
});

test('concordancia: 0, 1 y 2 en cifras, requisitos del rango y logros', () => {
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

test('los XP junto al rango: exactos hasta 9 999 y abreviados hacia abajo («31,2 mil», «9,9 M») sin partirse; la exacta, para lectores de pantalla', () => {
  assert.equal(P.compactNumber(0), '0');
  assert.equal(P.compactNumber(9999), '9999');
  assert.equal(P.compactNumber(10000), '10 mil');
  assert.equal(P.compactNumber(31200), '31,2 mil');
  assert.equal(P.compactNumber(31290), '31,2 mil', 'nunca se redondea hacia arriba');
  assert.equal(P.compactNumber(999999), '999,9 mil');
  assert.equal(P.compactNumber(9999999), '9,9 M', '9 999 999 no es «10 M»');
  assert.equal(P.compactNumber(9876543), '9,8 M');
  const html = heroHtml(ctxFor({ ...emptyProgress(), xp: 31290 }));
  assert.match(html, /<span aria-hidden="true">31,2 mil<\/span><span class="sr-only">31\.290<\/span>/);
  assert.match(read('../app/css/profile.css').match(/\.pf-rank-xp \{[^}]*\}/)[0], /white-space: nowrap/);
});

test('texto al 200 %: el saludo no se recorta (sin line-clamp ni overflow oculto), baja bajo el avatar si no cabe y el avatar no come el ancho', () => {
  const css = read('../app/css/profile.css');
  const name = css.match(/\.pf-name-text \{[^}]*\}/)[0];
  assert.doesNotMatch(name, /line-clamp|overflow: hidden/);
  assert.match(css.match(/\.pf-id \{[^}]*\}/)[0], /flex-wrap: wrap/);
  assert.match(css.match(/\.pf-greeting \{[^}]*\}/)[0], /flex: 1 1 11rem/);
  assert.match(css, /--pf-avatar: min\(5\.5rem, 22vw\)/);
});

test('el móvil apaisado gana a las reglas de ancho (va después de ellas) y el escritorio va por filas del DOM', () => {
  const css = read('../app/css/profile.css');
  assert.ok(css.indexOf('max-height: 500px') > css.indexOf('min-width: 1024px'), 'el bloque apaisado debe ir al final');
  assert.match(css, /grid-template-areas: "hero hero" "medals medals" "test practice"/);
});

test('las pestañas Portada y Avatar siguen el patrón ARIA: flechas, Inicio y Fin, y solo la activa en el orden de Tab', () => {
  const src = read('../app/js/ui/screens/profile-look.js');
  for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) assert.match(src, new RegExp(key));
  assert.match(src, /tabs\[go\]\.focus\(\)/);
  assert.match(src, /b\.tabIndex = on \? 0 : -1/);
  assert.match(src, /aria-pressed', String\(!now\)/, '«Automática» marca cuándo está activa');
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
  const t = testHtml({ correct: 24, asked: 40, level: TEST_LEVELS[2], percentile: 78, date: '2026-11-12', grid: '' });
  assert.match(t, /24<\/strong> de 40/);
  assert.match(t, /78&nbsp;%/);
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
  assert.match(all, /Domina a /, 'el pendiente es una meta, no un hecho');
  assert.doesNotMatch(all, /is-missing[^>]*>[\s\S]{0,400}?[A-Za-zÁ-ú]+ dominado<\/span><\/button>/);
  assert.match(all, /aria-label="[^"]*, (Bronce|Plata|Oro), conseguida"/);
  assert.doesNotMatch(all, /aria-label="3 3 /);
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
  assert.match(read('../app/js/ui/screens/profile-name.js'), /graphemes\(/, 'el contador cuenta caracteres, no puntos de código');
  const look = lookSheetHtml();
  assert.match(look, /role="tablist"/);
  assert.match(look, /role="tab"[^>]*data-target="avatar"/);
  const ctx = ctxFor(emptyProgress());
  for (const h of [html, name, look, heroHtml(ctx), welcomeHtml(), practiceHtml(ctx)]) assert.doesNotMatch(h, FORBIDDEN);
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
  assert.doesNotMatch(profile, /button\.disabled/, 'un botón disabled pierde el foco');
  assert.match(profile, /aria-disabled/);
  assert.match(profile, /button\.focus\(/);
  const card = read('../app/js/ui/screens/profile-share.js');
  assert.match(card, /image\/jpeg/);
  assert.match(card, /g\.clip\(\)/);
  assert.match(card, /work\.title/, 'la tarjeta dice qué cuadro es');
  assert.match(card, /drawGrid/, 'y lleva la cuadrícula del test');
  assert.doesNotMatch(card, /sfumato-arte\.onrender\.com/, 'el dominio sale de la página, no está escrito');
  assert.match(read('../app/test/index.html'), /rel="canonical" href="https:\/\/sfumato-arte\.onrender\.com\/test\/"/);
});

test('el perfil no carga el audio con la música apagada', () => {
  assert.match(read('../app/js/ui/screens/profile.js'), /settings\.music\) \(/);
});

test('lista blanca: la portada automática de cada pintor y la tarjeta salen siempre de app/data/gentle.json', () => {
  const real = realIndex();
  assert.ok(GENTLE.size >= 200, `la lista blanca tiene ${GENTLE.size} obras`);
  assert.equal(GENTLE.size, gentleData.works.length, 'ids repetidos');
  for (const w of gentleData.works) {
    const art = real.artwork(w.id);
    assert.ok(art, `${w.id} no está en el catálogo`);
    assert.equal(art.title, w.title, `${w.id}: el título del catálogo cambió, revisa la obra`);
    assert.ok(!P.isHarsh(art), `«${art.title}» está en la lista y la red de seguridad la tumba`);
  }
  let checked = 0;
  for (const a of real.artists) {
    const works = real.worksOf(a.id);
    if (!works.length) continue;
    const progress = { ...emptyProgress(), collection: Object.fromEntries(works.map((w) => [w.id, '2026-11-20'])) };
    const cover = P.coverWork(progress, real, '', GENTLE);
    assert.ok(cover && GENTLE.has(cover.id), `${a.name}: «${cover?.title}» no está en la lista blanca`);
    const card = P.shareCover(progress, real, '', GENTLE);
    assert.ok(GENTLE.has(card.id), `${a.name}: la tarjeta lleva «${card.title}»`);
    // Aunque haya elegido a mano cualquier obra suya, la tarjeta no sale de la lista.
    for (const w of works.slice(0, 40)) assert.ok(GENTLE.has(P.shareCover(progress, real, w.id, GENTLE).id), `${a.name}: elegida «${w.title}», la tarjeta se sale de la lista`);
    checked += 1;
  }
  assert.ok(checked >= 150, `solo se comprobaron ${checked} pintores`);
  assert.ok(GENTLE.has(P.sampleCover(real, GENTLE).id));
  // Con todo el catálogo en la colección gana la obra amable más famosa; una colección solo de escenas duras da la de muestra.
  const all = { ...emptyProgress(), collection: Object.fromEntries(real.artworks.map((w) => [w.id, '2026-11-20'])) };
  const top = P.coverWork(all, real, '', GENTLE);
  assert.ok(GENTLE.has(top.id));
  assert.ok(real.artworks.filter((w) => GENTLE.has(w.id)).every((w) => (w.fame || 0) <= (top.fame || 0)), 'no es la de más fama');
  for (const t of [/judit decapitando/i, /lamentaci[oó]n sobre cristo muerto/i, /elevaci[oó]n de la cruz/i, /ecce homo/i, /maja desnuda/i, /tres de mayo/i]) {
    const w = real.artworks.find((x) => t.test(x.title));
    assert.ok(w, String(t));
    assert.ok(!GENTLE.has(w.id), `«${w.title}» no debe estar en la lista`);
    const only = { ...emptyProgress(), collection: { [w.id]: '2026-11-20' } };
    assert.ok(GENTLE.has(P.coverWork(only, real, '', GENTLE).id), `«${w.title}»: la portada automática no es de la lista`);
    assert.equal(P.coverWork(only, real, w.id, GENTLE).id, w.id, 'elegida a mano, en pantalla se respeta');
    assert.ok(GENTLE.has(P.shareCover(only, real, w.id, GENTLE).id), `«${w.title}» elegida a mano acaba en la tarjeta`);
  }
  // Sin lista (no cargó), la red de seguridad por palabras sigue tumbando lo duro.
  for (const t of ['El tres de mayo de 1808', 'Lamentación sobre Cristo muerto', 'La elevación de la cruz', 'Ecce Homo', 'Desollamiento de Marsias', 'La coronación de espinas', 'Duelo a garrotazos', 'The Battle of the Amazons', 'La maja desnuda', 'La balsa de la Medusa', 'Saturno devorando a un hijo']) assert.ok(P.isHarsh({ title: t }), t);
  assert.ok(!P.isHarsh({ title: 'La noche estrellada' }));
});

test('último test: rechaza aciertos mayores que preguntas o negativos', () => {
  const lvl = TEST_LEVELS[0];
  assert.equal(P.parseLastTest(`{"correct":20,"asked":12,"level":"${lvl}"}`), null);
  assert.equal(P.parseLastTest(`{"correct":-1,"asked":12,"level":"${lvl}"}`), null);
  assert.equal(P.parseLastTest(`{"correct":1.5,"asked":12,"level":"${lvl}"}`), null);
  assert.ok(P.parseLastTest(`{"correct":12,"asked":12,"level":"${lvl}"}`));
});

test('el foco de la portada gana a main.css y va por encima de la imagen; las hojas y los logros extra se comportan como dicen', () => {
  const css = read('../app/css/profile.css');
  assert.match(css, /\.pf-cover \.pf-cover-art:focus-visible \{ outline: none; \}/);
  const ring = css.match(/\.pf-cover \.pf-cover-art:focus-visible::after \{[^}]*\}/)[0];
  assert.match(ring, /z-index: 3/);
  assert.match(ring, /border: 4px solid var\(--ink\)/);
  assert.match(css, /\.pf-medals > li\.pf-extra \{ display: none; \}/, 'el extra pierde por especificidad frente a `.pf-medals > li`');
  assert.doesNotMatch(css.match(/\.look-panel \{[^}]*\}/)[0], /overflow|max-height/, 'un solo scroll: el de la hoja');
  assert.match(css, /\.look-body > \.btn \{ position: sticky; bottom: 0/);
  assert.match(css, /\.pf-layout \{[^}]*\}[\s\S]*@media \(min-width: 720px\)[\s\S]*grid-template-areas: "hero hero" "medals medals" "test practice"/);
});

test('el repaso se ve siempre (bloqueado y con el motivo) y el logro pendiente no se da por hecho', () => {
  const practice = practiceHtml(ctxFor(emptyProgress()));
  assert.match(practice, /is-locked[\s\S]*Repasar lo aprendido[\s\S]*Vuelve cuando tengas 3 cuadros que repasar/);
  assert.doesNotMatch(practice, /data-action="review5"/);
  const medals = read('../app/js/ui/screens/profile-medals.js');
  assert.match(medals, /date \? info\.sub : KIND_NAMES\[kindOf\(id\)\]/);
});

test('miniaturas sueltas: portada, avatar y hoja usan img/t (no hojas enteras del atlas) y make_atlas las pinta', () => {
  for (const f of ['profile-look.js', 'profile-hero.js']) {
    const src = read(`../app/js/ui/screens/${f}`);
    assert.doesNotMatch(src, /thumb: true/, `${f} pide hojas del atlas`);
    assert.match(src, /tinyFrame|tinySrc/);
  }
  assert.match(read('../app/js/ui/screens/profile-art.js'), /img\/t\/\$\{work\.id\}\.jpg/);
  assert.match(read('../tools/make_atlas.py'), /img\/t/);
  assert.match(read('../.gitignore'), /app\/img\/t\//);
});

test('la tarjeta: cuadrados vacíos con borde, fundido sin gris, esquinas claras recortadas y bloque centrado', () => {
  const card = read('../app/js/ui/screens/profile-share.js');
  assert.match(card, /g\.stroke\(\)/, 'los tramos no alcanzados se dibujan con borde visible');
  assert.match(card, /fadeTo\(g, c\.bg/);
  assert.match(card, /hasLightCorners/);
  assert.match(card, /FOOTER_H - ART_H - blockH\) \/ 2/, 'el bloque se centra, no deja hueco');
});

test('ninguna rejilla del perfil fuerza un ancho mínimo mayor que su contenedor (al 200 % el rem se duplica)', () => {
  const css = read('../app/css/profile.css');
  for (const m of css.matchAll(/minmax\((\d+(?:\.\d+)?rem),/g)) assert.fail(`minmax(${m[1]}, …) sin min(): desborda con texto grande`);
});

test('«vistos» en toda la app: el final del camino y la Colección vacía no hablan de «reconoces»', () => {
  assert.doesNotMatch(read('../app/js/ui/screens/home.js'), /que reconoces|recognizedCount/);
  assert.match(read('../app/js/ui/screens/home.js'), /cuadros vistos/);
  assert.doesNotMatch(read('../app/js/ui/screens/collection.js'), /reconozcas/);
  assert.doesNotMatch(read('../app/js/ui/screens/profile-hero.js'), /pf-mini/, 'sin barra duplicada por requisito');
  assert.match(read('../app/css/profile.css'), /\.pf-cover\.cap-bottom \.pf-cover-cap/, 'el pie baja si lo que hay que ver está arriba');
});
