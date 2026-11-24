// Perfil nuevo: datos puros (rango, portada, museo, metales, test), nombre con su migración y HTML sin navegador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bigIndex } from './helpers.js';
import { migrate, defaultState, normalizeName, NAME_MAX, SCHEMA_VERSION } from '../app/js/state/schema.js';
import { rankFor } from '../app/js/engine/ranks.js';
import { rankProgress, museumWorks, coverWork, medalTier, initialOf, parseLastTest, testShareText } from '../app/js/engine/profile.js';
import { heroHtml, figuresHtml, museumHtml, testHtml, practiceHtml } from '../app/js/ui/screens/profile-parts.js';
import { settingsHtml } from '../app/js/ui/screens/profile-settings.js';
import { nameSheetHtml } from '../app/js/ui/screens/profile-name.js';
import { emptyProgress } from '../app/js/engine/progress.js';

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
});

test('migración 7 → 8: añade settings.name vacío y conserva el resto', () => {
  assert.equal(SCHEMA_VERSION, 8);
  const v7 = { version: 7, onboarded: true, progress: { xp: 500 }, settings: { music: false, sfx: true, volume: 0.2, reducedMotion: true, dailyGoal: 100, theme: 'dark' }, session: {} };
  const out = migrate(v7);
  assert.equal(out.version, 8);
  assert.deepEqual(out.settings, { ...v7.settings, name: '' });
  assert.equal(out.progress.xp, 500);
  assert.equal(migrate({ version: 8, settings: { name: 'Ana' } }).settings.name, 'Ana');
  assert.equal(defaultState().settings.name, '');
});

test('rango: la barra avanza con lo cumplido y dice lo que falta; el máximo no tiene siguiente', () => {
  const p = emptyProgress();
  let bar = rankProgress(rankFor(p, index));
  assert.equal(bar.next, 'Aficionado');
  assert.equal(bar.fraction, 0);
  assert.deepEqual(bar.parts, ['300 XP']);
  p.xp = 150;
  bar = rankProgress(rankFor(p, index));
  assert.equal(bar.fraction, 0.5);
  p.xp = 1300;
  bar = rankProgress(rankFor(p, index));
  assert.equal(bar.next, 'Copista');
  assert.match(bar.parts[0], /nivel «a fondo»/);
  assert.deepEqual(rankProgress({ next: null, stats: {}, missing: [] }), { fraction: 1, next: null, parts: [] });
});

test('museo: los últimos nueve cuadros, el más reciente primero; portada: cuadro famoso del pintor con más', () => {
  const p = emptyProgress();
  assert.deepEqual(museumWorks(p, index), []);
  assert.equal(coverWork(p, index), null);
  const ws = index.artworks.slice(0, 12);
  ws.forEach((w, i) => { p.collection[w.id] = `2026-11-${String(10 + i).padStart(2, '0')}`; });
  p.collection.noexiste = '2026-11-30';
  const m = museumWorks(p, index);
  assert.equal(m.length, 9);
  assert.equal(m[0].id, ws[11].id);
  assert.equal(m[8].id, ws[3].id);
  const cover = coverWork(p, index);
  assert.ok(cover && p.collection[cover.id]);
  const mine = ws.filter((w) => w.artistId === cover.artistId);
  assert.ok(mine.every((w) => (w.fame || 0) <= (cover.fame || 0)));
});

test('logros: oro, plata y bronce; inicial del avatar; último test válido o nulo', () => {
  assert.equal(medalTier('eye-x'), 'gold');
  assert.equal(medalTier('streak-30'), 'gold');
  assert.equal(medalTier('streak-7'), 'silver');
  assert.equal(medalTier('streak-3'), 'bronze');
  assert.equal(medalTier('movement-barroco'), 'silver');
  assert.equal(medalTier('artist-goya'), 'bronze');
  assert.equal(initialOf('  ana'), 'A');
  assert.equal(initialOf(''), '');
  assert.equal(parseLastTest('nada'), null);
  assert.equal(parseLastTest(null), null);
  assert.deepEqual(parseLastTest('{"correct":24,"asked":40,"level":"Conocedor","percentile":78}'), { correct: 24, asked: 40, level: 'Conocedor', percentile: 78 });
  assert.equal(parseLastTest('{"correct":24,"asked":40,"level":"X"}').percentile, null);
  assert.match(testShareText({ correct: 24, asked: 40, level: 'Conocedor', percentile: 78 }, 'https://x/test/'), /24 de 40[^\n]*\n[^\n]*78 %[^\n]*\nhttps:\/\/x\/test\//);
});

test('HTML del perfil vacío: logo y «Ponte un nombre», cifras a cero, museo con huecos y «Ir al camino»', () => {
  const ctx = ctxFor(emptyProgress());
  const hero = heroHtml(ctx);
  assert.match(hero, /Ponte un nombre/);
  assert.match(hero, /class="logo"/);
  assert.match(hero, /Curioso/);
  assert.match(hero, /role="progressbar"/);
  assert.match(hero, /data-action="open-settings"[^>]*aria-label="Ajustes"/);
  assert.match(figuresHtml(ctx), /pf-fig-num">0<[\s\S]*pf-fig-num">0<[\s\S]*pf-fig-num">0</);
  const museum = museumHtml(ctx);
  assert.equal((museum.match(/pf-tile-empty/g) || []).length, 9);
  assert.match(museum, /href="#inicio"/);
  assert.doesNotMatch(museum, /Ver todo/);
  assert.equal(practiceHtml(ctx), '');
  assert.doesNotMatch(testHtml(null), /Compartir/);
  assert.match(testHtml(null), /href="test\/"/);
});

test('HTML con nombre y progreso: saludo, inicial, museo que abre el visor, test con resultado; nombre escapado', () => {
  const p = emptyProgress();
  index.artworks.slice(0, 5).forEach((w, i) => { p.collection[w.id] = `2026-11-2${i}`; });
  const hero = heroHtml(ctxFor(p, { name: '<b>Ana</b>' }));
  assert.doesNotMatch(hero, /<b>Ana/);
  assert.match(hero, /Hola, &lt;b&gt;Ana/);
  assert.doesNotMatch(hero, /class="logo"[^>]*>[\s\S]*pf-greeting/);
  const museum = museumHtml(ctxFor(p));
  assert.equal((museum.match(/data-zoom-group="museo"/g) || []).length, 5);
  assert.equal((museum.match(/pf-tile-empty/g) || []).length, 4);
  assert.match(museum, /href="#coleccion">Ver todo/);
  const t = testHtml({ correct: 24, asked: 40, level: 'Conocedor', percentile: 78 });
  assert.match(t, /24<\/strong> de 40/);
  assert.match(t, /78 %/);
  assert.match(t, /data-action="share-test"/);
  assert.match(heroHtml(ctxFor(p, { name: 'María' })), /pf-initial">M</);
});

test('ajustes y nombre: hoja con tema, música, sonidos, volumen, meta, animaciones; campo con máximo', () => {
  const html = settingsHtml(ctxFor(emptyProgress()));
  for (const k of ['music', 'sfx', 'volume', 'reducedMotion']) assert.match(html, new RegExp(`data-setting="${k}"`));
  assert.match(html, /data-action="theme"/);
  assert.match(html, /data-action="goal"/);
  assert.match(html, /data-action="reset"/);
  assert.match(nameSheetHtml(), new RegExp(`maxlength="${NAME_MAX}"`));
  const ctx = ctxFor(emptyProgress());
  for (const h of [html, nameSheetHtml(), heroHtml(ctx), figuresHtml(ctx)]) assert.doesNotMatch(h, FORBIDDEN);
});
