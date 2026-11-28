// Títulos cortos de las etapas (`short`, del `stage` de cada historia): salen solos en el aro de niveles, en «Empezar · X», en
// «Jugar X, de Y» y en la cabecera de la historia, sin sitio para una explicación. Por eso cada uno se entiende sin saber
// nada («Años oscuros», no «Savonarola»), y el nombre propio o el término del oficio se enseña en las tarjetas, con su
// explicación al lado (CLAUDE.md: se enseña, no se quita).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(readFileSync(join(here, '..', 'app', 'data', 'catalog.json'), 'utf8'));
const storiesDir = join(here, '..', 'contenido', 'historias');
const stories = readdirSync(storiesDir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(storiesDir, f), 'utf8')));

const SHORT_MAX = 12;

// Nombres y términos que no conoce un adulto culto medio (lo que ya basta con el contexto —Médici, Salón, Bretaña— no se
// glosa: «no tratemos como tontos a los usuarios», María): no van solos en un título corto y, si la historia los nombra en su
// título, alguna tarjeta del pintor los explica (la glosa, que se busca con la expresión).
const OBSCURE = {
  Savonarola: /Savonarola, un fraile/,
  Maestà: /Maestà \(una Virgen en su trono\)|Maestà era un retablo/,
  Shchukin: /Shchukin, un rico ruso/,
  Tōkaidō: /Tōkaidō, el camino entre/,
  Brancacci: /capilla Brancacci de Florencia/,
  Sansepolcro: /Sansepolcro, el pueblo/,
  Estancias: /estancias, sus salas privadas/,
  Hélène: /se casa con Hélène/,
  Quinta: /compra la Quinta del Sordo/,
  Llerena: /Llerena/, // un lugar: basta con que una tarjeta lo nombre en su contexto
  Nuenen: /Nuenen/,
  Pontoise: /Pontoise/,
};
const has = (text, term) => new RegExp(`(^|[^\\p{L}])${term}([^\\p{L}]|$)`, 'iu').test(text);

test('ningún título corto de etapa pasa de 12 letras', () => {
  for (const a of catalog.artists) {
    for (const s of a.stages) assert.ok(s.short && s.short.length <= SHORT_MAX, `${a.id} nivel ${s.id}: «${s.short}»`);
  }
});

test('ningún título corto lleva un nombre o término oscuro sin explicar', () => {
  for (const a of catalog.artists) {
    for (const s of a.stages) {
      const term = Object.keys(OBSCURE).find((t) => has(s.short, t));
      assert.equal(term, undefined, `${a.id} nivel ${s.id}: «${s.short}» no se entiende solo`);
    }
  }
});

test('si el título de una historia nombra un término oscuro, una tarjeta del pintor lo explica', () => {
  for (const st of stories) {
    const texts = st.levels.flatMap((lv) => lv.cards.map((c) => c.text)).join('\n');
    for (const lv of st.levels) {
      for (const [term, gloss] of Object.entries(OBSCURE)) {
        if (has(lv.title || '', term)) assert.match(texts, gloss, `${st.artistId} nivel ${lv.level}: «${lv.title}» sin explicar ${term}`);
      }
    }
  }
});
