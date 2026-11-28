// Pistas que no engañan (feedback de María, 24/11): tras un fallo en «¿Cuál es de X?» la pista
// apunta al cuadro correcto y nunca es un rasgo que el cuadro elegido también cumpla; tras un fallo
// se devuelve lo elegido para marcarlo en su opción (sin línea «has elegido»); las pistas rotan (segunda pista con fuente); textos cortos y sin
// «ayer»/«mañana». Recorre con el motor real TODAS las combinaciones (pintor, cuadro correcto,
// distractor) del catálogo publicado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { realIndex, realCatalogJson, realTextJson, W } from './helpers-real.js';
import { feedbackFor, artistLines, looksOf, tagsOf, teachingLines, generalLine, styleLines } from '../app/js/engine/feedback.js';
import { noAuthorQuestion, optionText, makeMovementQuestion } from '../app/js/engine/questions.js';
import { buildIndex, mergeCatalogText } from '../app/js/engine/catalog.js';
import { createRng } from '../app/js/engine/rng.js';

const real = realIndex();
const text = realTextJson();
const MAX_HINT = 110;
const MAX_LOOK = 100;
const BANNED = /\b(ayer|mañana)\b/i;
const short = (a) => a.short || a.name;
const askable = (w) => !noAuthorQuestion(w);

const whichQ = (work, others) => ({
  type: 'which', prompt: '', artistId: work.artistId, targetArtworkId: work.id, artworkId: null,
  options: [work, ...others].map((w) => ({ id: w.id, artworkId: w.id, label: '' })), answerId: work.id, isNew: false,
});
const whoQ = (work, others) => ({
  type: 'who', prompt: '', artistId: work.artistId, artworkId: work.id,
  options: [work.artistId, ...others].map((id) => ({ id, label: real.artist(id).name })), answerId: work.artistId, isNew: false,
});

// La pista tras agotar las propias del cuadro: una frase del pintor verdadera en el correcto y que el
// elegido no comparte; si no la hay, ninguna (el pintor del elegido va en la etiqueta de su miniatura).
function checkTraitLine(fb, artist, work, chosenWork, counters) {
  assert.equal(fb.lines.length <= 1, true);
  if (!fb.lines.length) {
    counters.neutral++;
    assert.ok(fb.chosen && fb.chosen.artistId === chosenWork.artistId);
    return;
  }
  counters.trait++;
  const lines = artistLines(artist);
  const i = lines.indexOf(fb.lines[0]);
  // Un refuerzo de estilo (contenido/pistas.json) cumple lo mismo con sus propias etiquetas.
  const hint = (artist.styleHints || []).find((h) => fb.lines[0] === `${h.text.replace(/[.!?…]$/, '')}.` || fb.lines[0] === h.text);
  assert.ok(i >= 0 || hint, `la frase no es del pintor: ${fb.lines[0]}`);
  const tags = i >= 0 ? artist.traitTags[i] : hint.tags;
  assert.ok(Array.isArray(tags) && tags.length, `${artist.id}: frase sin etiquetas usada tras un fallo`);
  const avoid = tagsOf(chosenWork);
  for (const t of tags) assert.ok(!avoid.has(t), `${work.id}/${chosenWork.id}: «${fb.lines[0]}» también se cumple en el elegido (${t})`);
  const seen = tagsOf(work);
  if (seen.size) for (const t of tags) assert.ok(seen.has(t), `${work.id}: «${fb.lines[0]}» no se ve en el cuadro correcto (${t})`);
}

test('«¿Cuál es de X?» tras un fallo, todas las combinaciones: look del correcto, luego rasgo que el elegido no comparte', () => {
  const counters = { combos: 0, look: 0, trait: 0, neutral: 0 };
  const pool = real.artworks.filter(askable);
  for (const a of real.path) {
    for (const w of real.worksOf(a.id).filter(askable)) {
      const looks = looksOf(w);
      for (const d of pool) {
        if (d.artistId === a.id) continue;
        counters.combos++;
        const q = whichQ(w, [d]);
        const memo = new Map();
        const first = feedbackFor(real, q, false, memo, null, { chosenId: d.id });
        assert.equal(first.title, 'Era este');
        assert.equal(first.who, a.name);
        assert.ok(first.chosen, 'se sabe lo elegido');
        assert.equal(first.chosen.artistId, d.artistId);
        assert.equal(first.chosen.artworkId, d.id);
        assert.equal(first.chosen.name, short(real.artist(d.artistId)));
        assert.equal('line' in first.chosen, false, 'sin línea «El que has elegido…»');
        if (looks.length) {
          counters.look++;
          assert.ok(first.lines[0].startsWith(looks[0].text), `${w.id}: la primera pista es el look`);
          assert.equal(first.source, looks[0].source);
        } else checkTraitLine(first, a, w, d, counters);
        // Mismo cuadro fallado otra vez en la ronda: la segunda pista si existe; si no, el rasgo seguro.
        const second = feedbackFor(real, q, false, memo, null, { chosenId: d.id });
        if (looks.length > 1) assert.ok(second.lines[0].startsWith(looks[1].text), `${w.id}: segunda pista`);
        else checkTraitLine(second, a, w, d, counters);
        const third = feedbackFor(real, q, false, memo, null, { chosenId: d.id });
        checkTraitLine(third, a, w, d, counters);
      }
    }
  }
  assert.ok(counters.combos > 20000, `combinaciones recorridas: ${counters.combos}`);
  assert.ok(counters.look > 0 && counters.trait > 0 && counters.neutral > 0, JSON.stringify(counters));
});

test('el caso de María: Tiziano con Carlos V correcto y la Virgen del canciller Rolin elegida nunca habla de rojos', () => {
  const w = real.artwork(W('a147'));
  const d = real.artwork(W('b8'));
  const q = whichQ(w, [d]);
  const memo = new Map();
  const seen = [];
  for (let i = 0; i < 4; i++) {
    const fb = feedbackFor(real, q, false, memo, null, { chosenId: d.id });
    seen.push(...fb.lines);
    assert.deepEqual(fb.chosen, { artistId: d.artistId, name: 'Van Eyck', artworkId: d.id, title: 'Virgen del canciller Rolin' });
    for (const line of fb.lines) assert.doesNotMatch(line, /roj|dorad/i, line);
  }
  assert.ok(seen.length >= 2, 'dos pistas propias y, después, un rasgo seguro o nada');
  assert.ok(seen[0].startsWith('Mira el cielo de atardecer'));
  assert.ok(seen[1].startsWith('Mira al jinete solo ante el río'));
});

test('«¿Quién lo pintó?» tras un fallo: lo elegido se marca en su opción, sin línea «No es de X»', () => {
  const a = real.path[0];
  const w = real.worksOf(a.id).find(askable);
  const c = real.artists.find((x) => x.id !== a.id);
  const fb = feedbackFor(real, whoQ(w, [c.id]), false, new Map(), null, { chosenId: c.id });
  assert.equal(fb.title, `Es de ${a.name}`);
  assert.deepEqual(fb.chosen, { artistId: c.id, name: short(c), artworkId: null, title: '' });
  for (const line of fb.lines) assert.doesNotMatch(line, /^No es de/);
});

test('al acertar no hay línea del elegido; al fallar el movimiento tampoco, y el título lleva el periodo', () => {
  const w = real.worksOf(real.path[0].id).find(askable);
  const other = real.artists.find((a) => a.id !== w.artistId);
  const ok = feedbackFor(real, whoQ(w, [other.id]), true, new Map(), null, { chosenId: w.artistId });
  assert.equal(ok.chosen, null);
  const okWhich = feedbackFor(real, whichQ(w, [real.worksOf(other.id)[0]]), true, new Map(), null, { chosenId: w.id });
  assert.equal(okWhich.chosen, null);
  const mq = makeMovementQuestion(real, w, 0.5, createRng('mov'));
  const wrongMovement = mq.options.find((o) => o.id !== mq.answerId).id;
  const bad = feedbackFor(real, mq, false, new Map(), null, { chosenId: wrongMovement });
  assert.equal(bad.chosen, null);
  const m = real.movement(mq.answerId);
  assert.equal(bad.title, `Es ${m.name} · ${m.period}`);
  // Sin `chosenId` (llamadas antiguas) todo sigue funcionando y no hay línea del elegido.
  assert.equal(feedbackFor(real, whoQ(w, [other.id]), false).chosen, null);
});

test('opciones de movimiento: nombre y periodo del catálogo; en las demás, sin detalle', () => {
  const w = real.artworks.find((x) => !x.spoiler && real.artist(x.artistId).family === 'occidental');
  const mq = makeMovementQuestion(real, w, 0.5, createRng('opt'));
  for (const o of mq.options) {
    const { label, detail } = optionText(real, mq, o);
    assert.equal(label, real.movement(o.id).name);
    assert.equal(detail, real.movement(o.id).period);
    assert.ok(detail, 'todo movimiento tiene periodo');
  }
  const { detail } = optionText(real, whoQ(w, []), { id: w.artistId, label: 'x' });
  assert.equal(detail, '');
});

test('rotación de pistas: primera, segunda (con fuente = verificada) y después el rasgo del pintor', () => {
  const base = real.artworks.find((x) => real.pathIndex(x.artistId) >= 0 && askable(x) && !x.kind);
  const patched = { ...base, looks: [{ text: 'Mira uno', source: 'Museo de prueba' }, { text: 'Mira dos', source: '' }] };
  const index = { ...real, artwork: (id) => (id === base.id ? patched : real.artwork(id)) };
  const list = looksOf(patched);
  assert.deepEqual(list.map((l) => l.verified), [true, false]);
  const q = whoQ(base, []);
  const memo = new Map();
  const first = feedbackFor(index, q, false, memo);
  const second = feedbackFor(index, q, false, memo);
  const third = feedbackFor(index, q, false, memo);
  assert.equal(first.lines[0], 'Mira uno.');
  assert.equal(first.source, 'Museo de prueba');
  assert.equal(second.lines[0], 'Mira dos.');
  assert.equal(second.source, '');
  const artist = real.artist(base.artistId);
  const own = [...artistLines(artist), ...artistLines(artist).map((_, i) => generalLine(artist, base, i)), ...styleLines(artist, base)];
  assert.ok(!third.lines.length || own.includes(third.lines[0]), 'después, una frase del pintor (o su versión general) o nada');
  // Compatibilidad: una obra con solo `look` (texto) se comporta como antes.
  assert.deepEqual(looksOf({ look: 'Mira algo' }), [{ text: 'Mira algo', source: '', verified: false }]);
  assert.deepEqual(looksOf({}), []);
});

test('cuadros atípicos: su pista propia y nunca los rasgos genéricos del pintor', () => {
  for (const id of [W('a182'), W('a236')]) {
    const w = real.artwork(id);
    assert.equal(w.kind, 'atipico');
    assert.ok(looksOf(w)[0].verified, `${id}: la pista atípica lleva fuente`);
    const q = whoQ(w, []);
    const memo = new Map();
    const first = feedbackFor(real, q, true, memo);
    assert.equal(first.kind, 'atipico');
    assert.ok(first.lines[0].startsWith('No parece un '));
    const second = feedbackFor(real, q, true, memo);
    assert.deepEqual(second.lines, []);
  }
});

test('todas las pistas: cortas, sin «ayer»/«mañana», con etiquetas del vocabulario y alineadas', () => {
  const labels = text.tagLabels;
  assert.ok(Object.keys(labels).length > 30);
  for (const t of text.negableTags) assert.ok(labels[t], `negable fuera del vocabulario: ${t}`);
  assert.deepEqual(real.negableTags, text.negableTags, 'todas las etiquetas negables llegan al índice');
  assert.deepEqual(Object.keys(real.tagLabels), Object.keys(labels));
  // Rojos, negros y desnudos no se niegan nunca (un detalle pequeño desmentiría la frase).
  for (const t of ['rojo', 'negro', 'desnudo']) assert.ok(!real.negableTags.includes(t), t);
  for (const a of real.artists) {
    for (const line of artistLines(a)) {
      assert.ok(line.length <= MAX_HINT + 1, `${a.id}: «${line}» (${line.length})`);
      assert.doesNotMatch(line, BANNED, `${a.id}: ${line}`);
    }
    // Los pintores nuevos del catálogo grande aún no tienen rasgos ni etiquetas (textos por escribir).
    if (real.pathIndex(a.id) >= 0 && a.traits?.length) {
      assert.equal(a.traitTags.length, 1 + a.traits.length, `${a.id}: traitTags alineado con [hint, *traits]`);
      assert.ok(a.traitTags[0].length, `${a.id}: la pista principal lleva etiquetas`);
    }
    for (const tag of (a.traitTags || []).flat()) assert.ok(labels[tag], `${a.id}: etiqueta desconocida ${tag}`);
  }
  for (const w of real.artworks) {
    for (const l of looksOf(w)) {
      assert.ok(l.text.length <= MAX_LOOK + 10, `${w.id}: «${l.text}» (${l.text.length})`);
      assert.doesNotMatch(l.text, BANNED, `${w.id}: ${l.text}`);
    }
    for (const tag of w.tags || []) assert.ok(labels[tag], `${w.id}: etiqueta desconocida ${tag}`);
    // Las obras de pintores con etapa que entran en preguntas de autor llevan su pista propia.
    if (w.kind) assert.ok(looksOf(w).length, `${w.id}: obra con tipo y sin look`);
  }
  for (const m of real.movements) assert.doesNotMatch(`${m.blurb} ${(m.traits || []).join(' ')}`, BANNED);
  // Los rasgos de color de un pintor con etapa que comparten sus distractores habituales (parecido ≥ 1)
  // quedan etiquetados: así el motor puede evitarlos.
  const colour = /roj|dorad|azul|amarill|rosa/i;
  for (const a of real.path.filter((x) => x.traitTags)) {
    artistLines(a).forEach((line, i) => {
      if (colour.test(line)) assert.ok(a.traitTags[i].length, `${a.id}: rasgo de color sin etiquetas: ${line}`);
    });
  }
});

test('mergeCatalogText: acepta looks/kind/tags/traitTags/tagLabels y descarta lo que no encaja', () => {
  const index = buildIndex(realCatalogJson());
  const w = index.artworks[0];
  const a = index.artist(w.artistId);
  const n = mergeCatalogText(index, {
    looks: { [w.id]: [{ text: 'Mira a', source: 'S' }, { text: 'Mira b' }, { text: 'Mira c' }], nope: [{ text: 'x' }] },
    kind: { [w.id]: 'memoria', [index.artworks[1].id]: 'rarísimo' },
    tags: { [w.id]: ['rojo', 'Mal Tag', 7, 'oscuro'], [index.artworks[2].id]: 'rojo  oscuro' },
    traitTags: { [a.id]: [['rojo'], 7, 'oscuro'] },
    tagLabels: { rojo: 'rojos', 'Mal Tag': 'x', oscuro: 'fondo oscuro' },
    negableTags: ['rojo', 'no-existe-pero-vale', 'Mal'],
  });
  assert.ok(n >= 5);
  assert.equal(w.looks.length, 2);
  assert.equal(w.look, 'Mira a');
  assert.equal(w.kind, 'memoria');
  assert.equal(index.artworks[1].kind, undefined);
  assert.deepEqual(w.tags, ['rojo', 'oscuro']);
  assert.deepEqual(index.artworks[2].tags, ['rojo', 'oscuro'], 'las etiquetas también llegan como cadena');
  assert.deepEqual(a.traitTags, [['rojo'], null, ['oscuro']]);
  assert.deepEqual(index.tagLabels, { rojo: 'rojos', oscuro: 'fondo oscuro' });
  assert.deepEqual(index.negableTags, ['rojo', 'no-existe-pero-vale']);
  assert.deepEqual(teachingLines(['Uno.', 'Dos.', 'Tres.'], a, w, { tags: ['rojo'] }), ['Tres.']);
});
