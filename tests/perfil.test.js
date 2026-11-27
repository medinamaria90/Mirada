// Perfil nuevo: datos puros (rango, cuadro de la tarjeta, museo, metales, test), nombre con su migración y HTML sin navegador.
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
const { welcomeHtml, practiceHtml } = await import('../app/js/ui/screens/profile-parts.js');
const { medalRow, medalsHtml } = await import('../app/js/ui/screens/profile-medals.js');
const { medalGroupsHtml } = await import('../app/js/ui/screens/achievements.js');
const { rankCardHtml } = await import('../app/js/ui/screens/profile-rank.js');
const { profileStats, statsHtml } = await import('../app/js/ui/screens/profile-stats.js');
const { rankConditions, rankLadder, deepChoices } = await import('../app/js/engine/rank-goals.js');
const { nearestMedal, medalProgress } = await import('../app/js/engine/medal-near.js');
const { parseRoute } = await import('../app/js/ui/router.js');
const { settingsHtml } = await import('../app/js/ui/screens/profile-settings.js');
const { nameSheetHtml } = await import('../app/js/ui/screens/profile-name.js');
const { lookSheetHtml } = await import('../app/js/ui/screens/profile-look.js');
const { cardLines } = await import('../app/js/ui/screens/profile-share.js');
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
  assert.ok(SCHEMA_VERSION >= 8);
  const v7 = { version: 7, onboarded: true, progress: { xp: 500 }, settings: { music: false, sfx: true, volume: 0.2, reducedMotion: true, dailyGoal: 100, theme: 'dark' }, session: {} };
  const out = migrate(v7);
  assert.equal(out.version, SCHEMA_VERSION);
  assert.deepEqual(out.settings, { ...v7.settings, name: '', avatar: '' });
  assert.equal(out.progress.xp, 500);
  assert.equal(migrate({ version: 8, settings: { name: 'Ana' } }).settings.name, 'Ana');
  const dirty = migrate({ version: 8, settings: { name: `  ${'x'.repeat(50)}\n`, cover: '<script>', avatar: 'w9' } });
  assert.equal(dirty.settings.name.length, NAME_MAX);
  assert.equal('cover' in dirty.settings, false, 'la portada ya no existe');
  assert.equal(dirty.settings.avatar, 'w9');
  assert.equal(defaultState().settings.name, '');
});

test('rango: una fila por condición, cumplidas y pendientes (sin barra única que se quede vacía con el XP cumplido)', () => {
  const p = emptyProgress();
  let bar = P.rankProgress(rankFor(p, index));
  assert.equal(bar.next, 'Aficionado');
  assert.deepEqual(bar.conds.map((c) => [c.key, c.have, c.need, c.done]), [['xp', 0, 300, false]]);
  assert.deepEqual(bar.parts, ['Ganar 300 XP más']);
  p.xp = 1877;
  p.rank = 1;
  bar = P.rankProgress(rankFor(p, index));
  assert.equal(bar.next, 'Copista');
  assert.deepEqual(bar.conds.map((c) => [c.key, c.label, c.have, c.done]), [['xp', '1.200 XP', 1877, true], ['deep', 'Un nivel «a fondo»', 0, false]],
    'con el XP cumplido se ve cumplido, y lo que falta aparte');
  assert.match(bar.parts[0], /^Dominar 1 nivel «a fondo» más$/);
  assert.equal('fraction' in bar, false, 'ya no hay barra del mínimo');
  assert.deepEqual(P.rankProgress({ next: null, stats: {}, missing: [] }), { next: null, conds: [], parts: [] });
  const ladder = rankLadder();
  assert.equal(ladder.length, RANKS.length);
  assert.deepEqual(ladder[0].conds, [], 'el primero no pide nada');
  assert.deepEqual(ladder[3].conds.map((c) => c.label), ['3.000 XP', '4 niveles «a fondo»', 'Un gran maestro hasta el nivel 2']);
  assert.deepEqual(rankConditions(RANKS[6]).map((c) => c.key), ['xp', 'deep', 'eras', 'complete']);
});

test('rango: «Elegir» ofrece los pintores dominados con un nivel «a fondo» abierto; sin ninguno, la tarjeta manda a jugar', () => {
  const p = { ...emptyProgress(), xp: 1500, rank: 1 };
  const card = rankCardHtml(ctxFor(p));
  assert.match(card, /Aficionado/);
  assert.match(card, /Rango 2 de 8/);
  assert.match(card, /Para ser <strong>Copista<\/strong>/);
  assert.match(card, /pf-cond is-done[\s\S]*<span class="pf-cond-val">1\.500<\/span>\/1\.200 XP/, 'el XP cumplido se lee como «1.500/1.200 XP», no «1200 XP … 1500»');
  assert.match(card, /Un nivel «a fondo» <span class="pf-cond-val">0\/1<\/span>/);
  assert.match(card, /href="#inicio"[^>]*>Jugar</, 'sin pintores dominados, se juega el camino');
  assert.equal((card.match(/class="pf-ladder/g) || []).length, 1);
  assert.equal((card.match(/<li class="is-on"><\/li>/g) || []).length, 2);
  assert.equal((card.match(/is-next/g) || []).length, 1);
  assert.doesNotMatch(card, /role="progressbar"/);
  const real = realIndex();
  const withDeep = real.path.find((a) => real.deepLevels(a.id).length);
  assert.ok(withDeep, 'el catálogo tiene niveles «a fondo»');
  p.artists[withDeep.id] = { plays: 1, best: 1, mastered: true, last: TODAY };
  assert.deepEqual(deepChoices(p, real, 'deep', RANKS[2]), [{ artistId: withDeep.id, level: real.deepLevels(withDeep.id)[0].id }]);
  assert.match(rankCardHtml({ ...ctxFor(p), index: real }), /data-action="rank-choose" data-key="deep"[^>]*>Elegir</);
  assert.deepEqual(deepChoices(p, real, 'complete', RANKS[6]).length, withDeep.category === 'gran-maestro' ? 1 : 0);
  assert.match(rankCardHtml(ctxFor({ ...emptyProgress(), xp: 30000, rank: 7 })), /El rango más alto/);
});

test('una sola escala: los niveles del test no se llaman como ningún rango, y el perfil da el rango de la escala', () => {
  const ranks = RANKS.map((r) => r.name.toLowerCase());
  for (const name of TEST_LEVELS) assert.ok(!ranks.includes(name.toLowerCase()), `«${name}» es también un rango`);
  assert.equal(new Set(TEST_LEVELS).size, TEST_LEVELS.length);
  for (const xp of [0, 150, 300, 1500, 5200, 9300, 26000]) {
    const p = { ...emptyProgress(), xp };
    const rank = rankFor(p, index);
    const card = rankCardHtml(ctxFor(p));
    assert.ok(card.includes(`id="pf-rank-h">${rank.name}</span>`), `el perfil no dice «${rank.name}» con ${xp} XP`);
    assert.ok(card.includes(`Rango ${rank.index + 1} de ${RANKS.length}`));
  }
  assert.doesNotMatch(read('../app/js/ui/screens/result.js'), /levelFor|levelName|Nuevo nivel/, 'el resultado enseña la escala de niveles');
  assert.doesNotMatch(read('../app/js/engine/finish.js'), /levelup|levelFor/, 'queda código de la escala de niveles');
});

test('cuatro cifras pulsables: racha (su logro), pintores dominados, cuadros vistos y épocas completas; sin museo', () => {
  const p = emptyProgress();
  const ws = index.artworks.slice(0, 12);
  ws.forEach((w, i) => { p.collection[w.id] = `2026-11-${String(10 + i).padStart(2, '0')}`; });
  for (const a of index.path.slice(0, 3)) p.artists[a.id] = { plays: 1, best: 1, mastered: true, last: TODAY };
  p.artists['no-existe'] = { plays: 1, best: 1, mastered: true, last: TODAY };
  const m = index.visibleMovements[0];
  p.medals[`movement-${m.id}`] = TODAY;
  p.streak = { current: 5, best: 5, last: TODAY, graceOn: null, graceDays: [], days: [] };
  p.medals['streak-3'] = TODAY;
  const ctx = ctxFor(p);
  assert.deepEqual(profileStats(ctx), { streak: 5, painters: 3, works: 12, eras: 1, erasTotal: index.visibleMovements.length });
  const html = statsHtml(ctx);
  assert.match(html, /data-action="medal" data-id="streak-7"/, 'la racha abre el logro de racha que toca');
  assert.match(html, /href="#coleccion-pintores"[^>]*aria-label="3 pintores dominados"/);
  assert.match(html, /href="#coleccion"[^>]*aria-label="12 cuadros vistos"/);
  assert.match(html, new RegExp(`href="#inicio"[^>]*aria-label="Épocas completas: 1 de ${index.visibleMovements.length}"`));
  assert.equal((html.match(/class="pf-stat /g) || []).length, 4);
  assert.match(statsHtml(ctxFor({ ...emptyProgress(), streak: { current: 1, best: 1, last: TODAY, graceDays: [], days: [] } })), /Día de racha/);
  assert.doesNotMatch(welcomeHtml(), /museo|reconozc|reconoc/i);
  assert.match(welcomeHtml(), /Colecci/);
  assert.equal(P.collectionIds(p, index).length, 12);
  assert.equal(P.collectionWorks(p, index)[0].id, ws[11].id, 'lo último primero');
  const css = read('../app/css/profile.css') + read('../app/css/profile-cards.css');
  assert.doesNotMatch(css, /pf-museum|pf-tile-empty|pf-cta|pf-figs|pf-fig-|pf-bar|pf-needs|pf-test-|pf-more|pf-extra/, 'CSS muerto');
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

test('HTML del perfil nuevo: título «Perfil», logo, bienvenida con propósito, test en «Practicar» y reto semanal bloqueado con lo que falta', () => {
  const ctx = ctxFor(emptyProgress());
  const hero = heroHtml(ctx);
  assert.match(hero, /<h1[^>]*>Perfil<\/h1>/);
  assert.match(hero, /Ponte un nombre/);
  assert.match(hero, /class="logo"/);
  assert.doesNotMatch(hero, /Curioso|role="progressbar"/, 'el rango va en su tarjeta');
  assert.doesNotMatch(hero, /pf-cover/, 'sin portada');
  assert.doesNotMatch(hero, /open-look|pf-avatar-btn/, 'sin cuadros no hay nada que elegir');
  assert.match(hero, /data-action="open-settings"[^>]*aria-label="Ajustes"/);
  const card = rankCardHtml(ctx);
  assert.match(card, /Curioso/);
  assert.match(card, /Para ser <strong>Aficionado<\/strong>/);
  assert.match(card, /300 XP/);
  const welcome = welcomeHtml();
  assert.match(welcome, /Tu perfil empieza aquí/);
  assert.match(welcome, /btn-primary[^>]*href="#inicio"/);
  const practice = practiceHtml(ctx);
  assert.match(practice, />Practicar</);
  assert.match(practice, /href="test\/"[\s\S]*Test de pintura[\s\S]*Mide lo que sabes/);
  assert.doesNotMatch(practice, /btn-primary|share-test/, 'el test ya no compite como botón principal');
  assert.match(practice, /is-locked[\s\S]*Reto semanal[\s\S]*Se abre al dominar el camino/, 'sin ninguna parada dominada no se da una cifra que desanime');
  assert.doesNotMatch(practice, /quedan \d+/);
  const started = emptyProgress();
  const firstStep = index.steps[0];
  (firstStep.type === 'sala' ? started.salas : started.artists)[firstStep.id] = { plays: 1, best: 1, mastered: true, last: TODAY };
  assert.match(practiceHtml(ctxFor(started)), /Domina el camino: te quedan \d+ paradas?/);
  assert.doesNotMatch(practice, /data-action="weekly"/);
});

test('el orden del DOM es el visual: identidad, rango, cifras, logros, practicar; en escritorio, las mismas filas con áreas de rejilla', () => {
  const src = read('../app/js/ui/screens/profile.js');
  const from = src.indexOf('pf-layout');
  const order = ['heroHtml(ctx)', 'rankCardHtml(ctx)', 'statsHtml(ctx)', 'medalsHtml(ctx)', 'practiceHtml(ctx, last)'].map((k) => src.indexOf(k, from));
  assert.ok(order.every((n) => n > 0) && order.every((n, i) => i === 0 || n > order[i - 1]), `orden: ${order}`);
  assert.match(read('../app/js/ui/screens/profile-look.js'), /aria-pressed', String\(!now\)/, '«Automática» marca cuándo está activa');
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
  const html = rankCardHtml(ctxFor({ ...emptyProgress(), xp: 31290, rank: 6 }));
  assert.match(html, /<span aria-hidden="true">31,2 mil<\/span><span class="sr-only">31\.290<\/span>/);
  assert.match(read('../app/css/profile-cards.css').match(/\.pf-cond-val \{[^}]*\}/)[0], /white-space: nowrap/);
});

test('texto al 200 %: el saludo no se recorta (sin line-clamp ni overflow oculto), baja a su fila si no cabe y el avatar no come el ancho', () => {
  const css = read('../app/css/profile.css');
  const name = css.match(/\.pf-name-text \{[^}]*\}/)[0];
  assert.doesNotMatch(name, /line-clamp|overflow: hidden/);
  assert.match(css.match(/\.pf-id \{[^}]*\}/)[0], /grid-template-areas: "avatar name gear"/);
  assert.match(css, /\.pf-hero \{ container: pf-hero \/ inline-size; \}/);
  assert.match(css, /@container pf-hero \(max-width: 20em\) \{\s*\.pf-id \{[^}]*"avatar gear" "name name"/, 'con letra grande el saludo baja a su fila');
  assert.match(css, /--pf-avatar: min\(4\.5rem, 20vw\)/);
});

test('el móvil apaisado gana a las reglas de ancho (va después de ellas) y el escritorio va por filas del DOM', () => {
  const css = read('../app/css/profile.css');
  assert.ok(css.indexOf('max-height: 500px') > css.indexOf('min-width: 720px') && css.indexOf('min-width: 720px') > 0, 'el bloque apaisado debe ir al final');
  assert.match(css, /grid-template-areas: "hero hero" "rank stats" "medals practice"/);
});

test('las pestañas Portada y Avatar siguen el patrón ARIA: flechas, Inicio y Fin, y solo la activa en el orden de Tab', () => {
  assert.match(read('../app/js/ui/screens/profile-look.js'), /aria-pressed', String\(!now\)/, '«Usar mi inicial» marca cuándo está activa');
});

test('HTML con nombre y progreso: saludo, inicial, avatar de cuadro, pie de portada, último test en su fila con «Compartir»; nombre escapado', () => {
  const p = emptyProgress();
  index.artworks.slice(0, 5).forEach((w, i) => { p.collection[w.id] = `2026-11-2${i}`; });
  const hero = heroHtml(ctxFor(p, { name: '<b>Ana</b>' }));
  assert.doesNotMatch(hero, /<b>Ana/);
  assert.match(hero, /Hola, &lt;b&gt;Ana/);
  assert.match(hero, /<button[^>]*class="pf-avatar-slot pf-avatar-btn"[^>]*data-action="open-look"[^>]*aria-label="Cambiar avatar"/);
  assert.match(heroHtml(ctxFor(p, { name: 'María' })), /pf-initial">M</);
  const withAvatar = heroHtml(ctxFor(p, { name: 'María', avatar: index.artworks[1].id }));
  assert.match(withAvatar, /pf-avatar has-art/);
  assert.doesNotMatch(withAvatar, /pf-initial/);
  const t = practiceHtml(ctxFor(p), { correct: 24, asked: 40, level: TEST_LEVELS[2], percentile: 78, date: '2026-11-12', grid: '' });
  assert.match(t, new RegExp(`Test de pintura<span class="pf-go-sub">${TEST_LEVELS[2]} · 24 de 40`));
  assert.match(t, /class="icon-btn pf-share" data-action="share-test" aria-label="Compartir el resultado del test"/);
});

test('logros: pantalla con grupos y filtros, nombres cortos y, para lectores, «dominado» o «Domina a»', () => {
  const p = emptyProgress();
  p.medals[`artist-${index.path[0].id}`] = '2026-11-20';
  p.medals['streak-3'] = '2026-11-21';
  const ctx = ctxFor(p);
  const all = medalGroupsHtml(ctx, 'all');
  for (const g of ['Pintores', 'Movimientos', 'Rachas', 'Ojo de…', 'Retos y metas']) assert.match(all, new RegExp(g));
  assert.match(all, /aria-label="[^"]* dominado, Bronce, conseguida"/);
  assert.match(all, /aria-label="Domina a [^"]*, pendiente"/, 'el pendiente es una meta, no un hecho');
  assert.doesNotMatch(all, /pf-medal-name[^>]*>[^<]* dominado</, 'el nombre de la casilla es corto');
  assert.match(all, /aria-label="Racha de 3 días, Bronce, conseguida"/);
  assert.doesNotMatch(all, /pf-tier/);
  const got = medalGroupsHtml(ctx, 'got');
  assert.equal((got.match(/class="pf-medal /g) || []).length, 2);
  assert.doesNotMatch(got, /Movimientos/);
  assert.equal(medalGroupsHtml(ctx, 'missing').match(/is-got/g), null);
  assert.deepEqual(parseRoute('#logros'), { name: 'medals' });
  assert.deepEqual(parseRoute('#medallas'), { name: 'medals' }, 'los enlaces antiguos siguen valiendo');
});

test('logros del perfil: una fila de cuatro (tres últimas y la más cercana con su avance) y «N de M» que abre #logros', () => {
  const p = emptyProgress();
  const ids = index.path.slice(0, 4).map((a) => `artist-${a.id}`);
  ids.forEach((id, i) => { p.medals[id] = `2026-11-1${i}`; });
  p.streak = { current: 2, best: 2, last: TODAY, graceOn: null, graceDays: [], days: [] };
  const ctx = ctxFor(p);
  assert.deepEqual(medalProgress(p, index, 'streak-3', TODAY), { have: 2, need: 3 });
  const near = nearestMedal(p, index, ['streak-3', 'streak-7', 'goal-1'], TODAY);
  assert.deepEqual(near, { id: 'streak-3', have: 2, need: 3 });
  const row = medalRow(ctx);
  assert.equal((row.match(/<li>/g) || []).length, 4);
  const order = [...row.matchAll(/data-id="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(order.slice(0, 3), [ids[3], ids[2], ids[1]], 'las tres últimas, la más reciente primero');
  assert.match(row, /is-near[\s\S]*pf-arc[\s\S]*2 de 3/);
  const sec = medalsHtml(ctx);
  assert.match(sec, /href="#logros"[^>]*>4 de \d+/);
  assert.doesNotMatch(sec, /Ver los/);
  const fresh = medalRow(ctxFor(emptyProgress()));
  assert.equal((fresh.match(/<li>/g) || []).length, 4, 'sin logros, cuatro pendientes');
});

test('hojas: ajustes con todo, nombre con contador y nota, avatar; sin «ayer» ni «mañana»', () => {
  const html = settingsHtml(ctxFor(emptyProgress()));
  for (const k of ['music', 'sfx', 'volume', 'reducedMotion']) assert.match(html, new RegExp(`data-setting="${k}"`));
  assert.match(html, /data-action="theme"/);
  assert.match(html, /data-action="goal"/);
  const su = html.indexOf('class="su-section"');
  assert.ok(su > 0 && html.indexOf('data-action="ask-reset"') > su && html.indexOf('data-action="reset"') > su, '«Empezar de cero» solo en la sección «Superusuario»');
  assert.ok(html.indexOf('data-action="reset"') < html.indexOf('</section>', su), 'y dentro de ella');
  const name = nameSheetHtml();
  assert.doesNotMatch(name, /maxlength/, 'el máximo se cuenta por caracteres en JavaScript, no por unidades de texto');
  assert.match(name, /Solo se guarda en este dispositivo/);
  assert.match(name, /pf-counter/);
  assert.match(read('../app/js/ui/screens/profile-name.js'), /graphemes\(/, 'el contador cuenta caracteres, no puntos de código');
  const look = lookSheetHtml();
  assert.match(look, /look-grid/);
  const ctx = ctxFor(emptyProgress());
  for (const h of [html, name, look, heroHtml(ctx), welcomeHtml(), practiceHtml(ctx), rankCardHtml(ctx), statsHtml(ctx), medalsHtml(ctx), medalGroupsHtml(ctx, 'all')]) assert.doesNotMatch(h, FORBIDDEN);
});

test('el foco se queda: las hojas repintan solo lo que cambia, no la cabecera entera ni la rejilla', () => {
  assert.doesNotMatch(read('../app/js/ui/screens/profile-hero.js'), /\.pf-hero['"], el\)\.outerHTML/);
  const look = read('../app/js/ui/screens/profile-look.js');
  assert.doesNotMatch(look.slice(look.indexOf('const save'), look.indexOf('return {', look.indexOf('const save'))), /innerHTML/, 'elegir no reescribe la rejilla');
  assert.doesNotMatch(read('../app/js/ui/screens/profile-name.js'), /\.focus\(\{ preventScroll/, 'el foco vuelve en el cierre de la hoja, no antes');
});

test('«Empezar de cero» borra también el nombre, el avatar y el último test', () => {
  const src = read('../app/js/ui/screens/profile-settings.js');
  assert.match(src, /name: '', avatar: ''/);
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
  assert.doesNotMatch(card, /sfumato\.dibulios\.com/);
  assert.match(read('../app/test/index.html'), /rel="canonical" href="https:\/\/sfumato\.dibulios\.com\/test\/"/);
});

test('el perfil no carga el audio con la música apagada', () => {
  assert.match(read('../app/js/ui/screens/profile.js'), /settings\.music\) \(/);
});

test('portada: la automática sale de la colección sin excluir ninguna obra por su contenido', () => {
  const real = realIndex();
  const maja = real.artworks.find((x) => /maja desnuda/i.test(x.title));
  assert.ok(maja);
  const only = { ...emptyProgress(), collection: { [maja.id]: '2026-11-20' } };
  assert.equal(P.coverWork(only, real).id, maja.id);
  assert.equal(P.shareCover(only, real, maja.id).id, maja.id);
  const all = { ...emptyProgress(), collection: Object.fromEntries(real.artworks.map((w) => [w.id, '2026-11-20'])) };
  const top = P.coverWork(all, real);
  assert.ok(real.artworks.every((w) => (w.fame || 0) <= (top.fame || 0)), 'no es la de más fama');
  assert.ok(P.sampleCover(real));
  assert.equal(P.isHarsh, undefined);
  assert.equal(P.gentleSet, undefined);
});

test('último test: rechaza aciertos mayores que preguntas o negativos', () => {
  const lvl = TEST_LEVELS[0];
  assert.equal(P.parseLastTest(`{"correct":20,"asked":12,"level":"${lvl}"}`), null);
  assert.equal(P.parseLastTest(`{"correct":-1,"asked":12,"level":"${lvl}"}`), null);
  assert.equal(P.parseLastTest(`{"correct":1.5,"asked":12,"level":"${lvl}"}`), null);
  assert.ok(P.parseLastTest(`{"correct":12,"asked":12,"level":"${lvl}"}`));
});

test('el avatar y el engranaje llevan su anillo de foco; las hojas se comportan como dicen', () => {
  const css = read('../app/css/profile.css');
  assert.match(css, /\.pf-avatar-btn:focus-visible \{ outline: 2\.5px solid var\(--ink\)/);
  assert.match(css, /\.pf-gear:focus-visible \{ outline: 2\.5px solid var\(--ink\)/);
  assert.doesNotMatch(css.match(/\.look-panel \{[^}]*\}/)[0], /overflow|max-height/, 'un solo scroll: el de la hoja');
  assert.match(css, /\.look-body > \.btn \{ position: sticky; bottom: 0/);
  assert.match(css, /\.pf-layout \{[^}]*\}[\s\S]*@media \(min-width: 720px\)[\s\S]*grid-template-areas: "hero hero" "rank stats" "medals practice"/);
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
});

test('cabecera sin portada (27/11): avatar, saludo y engranaje en una fila; el avatar abre su hoja, que ya no tiene pestañas', () => {
  const p = emptyProgress();
  index.artworks.slice(0, 3).forEach((w, i) => { p.collection[w.id] = `2026-11-2${i}`; });
  const hero = heroHtml(ctxFor(p, { name: 'Meri', cover: index.artworks[0].id }));
  assert.doesNotMatch(hero, /pf-cover|pf-look|zoom/, 'ni portada, ni su pie, ni pantalla completa, ni el botón de cuadrícula');
  const row = hero.match(/<div class="pf-id">([\s\S]*)<\/div>\s*<\/header>/)[1];
  const order = ['pf-avatar-btn', 'pf-name-btn', 'pf-gear'].map((c) => row.indexOf(c));
  assert.ok(order.every((i, k) => i >= 0 && (k === 0 || i > order[k - 1])), `orden avatar → saludo → engranaje: ${order}`);
  const sheet = lookSheetHtml();
  assert.match(sheet, />Tu avatar</);
  assert.doesNotMatch(sheet, /role="tab|Portada/);
  assert.match(sheet, />Usar mi inicial</);
  assert.doesNotMatch(read('../app/css/profile.css'), /pf-cover|look-tabs/, 'sin estilos huérfanos');
});

test('estado guardado con portada elegida: se descarta al cargar sin tocar el progreso ni el avatar', () => {
  const saved = { ...defaultState(), onboarded: true, progress: { ...emptyProgress(), xp: 1932, collection: { w1: '2026-11-20' } }, settings: { ...defaultState().settings, name: 'Meri', cover: 'w1', avatar: 'w1' } };
  const out = migrate(JSON.parse(JSON.stringify(saved)));
  assert.equal(out.version, SCHEMA_VERSION, 'sin versión nueva: un móvil con la app vieja en caché no la rechaza');
  assert.equal('cover' in out.settings, false);
  assert.equal(out.settings.avatar, 'w1');
  assert.equal(out.settings.name, 'Meri');
  assert.equal(out.progress.xp, 1932);
  assert.deepEqual(out.progress.collection, { w1: '2026-11-20' });
  assert.equal('cover' in defaultState().settings, false);
});

test('compartir: la tarjeta usa el cuadro del avatar (ya no hay portada)', () => {
  const src = read('../app/js/ui/screens/profile.js');
  assert.match(src, /shareCover\(st\.progress, ctx\.index, st\.settings\.avatar\)/);
  assert.doesNotMatch(src, /settings\.cover/);
});
