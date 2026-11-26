// Gótico: los hermanos Lorenzetti son una sola parada. El proceso los trae por separado (cada obra con su autor en
// Wikidata); el catálogo los une en «lorenzetti» y cada obra conserva su autor real en `by`. El progreso guardado con
// los ids antiguos se une al pasar al esquema 9.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrate, MIGRATIONS, MERGED_ARTISTS } from '../app/js/state/schema.js';
import { realIndex } from './helpers-real.js';

const real = realIndex();

test('rama Gótico: Cimabue, Duccio, Giotto, los Lorenzetti y Simone Martini, en ese orden', () => {
  assert.deepEqual(real.branch('gotico').artists, ['cimabue', 'duccio', 'giotto', 'lorenzetti', 'simone-martini']);
});

test('los Lorenzetti: una parada con las obras de los dos, cada una con su autor real', () => {
  const joint = real.artist('lorenzetti');
  assert.equal(joint.short, 'Los Lorenzetti');
  assert.deepEqual(joint.members.map((m) => m.qid), ['Q309635', 'Q211562']);
  assert.equal(real.artist('pietro-lorenzetti'), undefined);
  assert.equal(real.artist('ambrogio-lorenzetti'), undefined);
  const works = real.worksOf('lorenzetti');
  const by = new Set(works.map((w) => w.by));
  assert.deepEqual([...by].sort(), ['Ambrogio Lorenzetti', 'Pietro Lorenzetti']);
  assert.ok(real.artworks.filter((w) => w.artistId !== 'lorenzetti').every((w) => !w.by), '`by` solo en paradas conjuntas');
});

test('migración 8 → 9: el progreso de Pietro y Ambrogio pasa a los Lorenzetti sin perder nada', () => {
  assert.equal(typeof MIGRATIONS[8], 'function');
  assert.deepEqual(Object.values(MERGED_ARTISTS), ['lorenzetti', 'lorenzetti']);
  const v8 = {
    version: 8,
    progress: {
      artists: {
        'pietro-lorenzetti': { plays: 2, best: 0.7, mastered: false, last: '2026-11-20', works: ['w3873247'] },
        'ambrogio-lorenzetti': { plays: 1, best: 0.9, mastered: true, last: '2026-11-18', works: ['w3618171'] },
        duccio: { plays: 1, best: 1, mastered: true, last: '2026-11-19' },
      },
      seen: { 'pietro-lorenzetti': '2026-11-21', 'ambrogio-lorenzetti': '2026-11-22' },
      medals: { 'artist-ambrogio-lorenzetti': '2026-11-18', 'artist-duccio': '2026-11-19' },
      srs: { 'artist:pietro-lorenzetti': { box: 1, due: '2026-11-30' }, 'artist:ambrogio-lorenzetti': { box: 3, due: '2026-12-05' }, 'art:w3873247': { box: 2, due: '2026-11-29' } },
    },
    session: { route: 'etapa-pietro-lorenzetti--gotico', plan: { artistId: 'pietro-lorenzetti' } },
  };
  const out = migrate(v8);
  assert.deepEqual(out.progress.artists.lorenzetti, { plays: 3, best: 0.9, mastered: true, last: '2026-11-20', works: ['w3873247', 'w3618171'] });
  assert.ok(!('pietro-lorenzetti' in out.progress.artists) && !('ambrogio-lorenzetti' in out.progress.artists));
  assert.deepEqual(out.progress.artists.duccio, v8.progress.artists.duccio);
  assert.deepEqual(out.progress.seen, { lorenzetti: '2026-11-22' });
  assert.deepEqual(out.progress.medals, { 'artist-lorenzetti': '2026-11-18', 'artist-duccio': '2026-11-19' });
  assert.deepEqual(out.progress.srs['artist:lorenzetti'], { box: 3, due: '2026-12-05' });
  assert.deepEqual(out.progress.srs['art:w3873247'], { box: 2, due: '2026-11-29' }, 'el repaso por obra no cambia');
  assert.deepEqual(out.session, {}, 'la ronda en curso con un id antiguo se descarta');
  // Sin Lorenzetti, la ronda en curso se conserva.
  const keep = migrate({ version: 8, session: { route: 'etapa-duccio' } });
  assert.equal(keep.session.route, 'etapa-duccio');
});
