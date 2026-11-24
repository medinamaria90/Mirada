// Pruebas de la lógica pura del motor de audio (sin Web Audio real).
import test from 'node:test';
import assert from 'node:assert/strict';
import { ERAS, SCORES } from '../app/js/audio/scores.js';
import { compilePiece, validatePiece, parseBar, parseChordCell, varyLoop, barFactors, makeTimeMap } from '../app/js/audio/compose.js';
import { noteToMidi, parseChord, voicing, bassMidi, mulberry32 } from '../app/js/audio/theory.js';
import { pluckBuffer } from '../app/js/audio/ks.js';
import { SFX, SFX_NAMES, sfxLength } from '../app/js/audio/sfx.js';
import { Sequencer } from '../app/js/audio/sequencer.js';
import { INSTRUMENTS, WET } from '../app/js/audio/instruments.js';
import { STYLES } from '../app/js/audio/styles.js';
import { variantsOf, pieceKey, splitKey, getPiece, allPieceKeys, DEFAULT_VARIANT } from '../app/js/audio/variants.js';
import { audio, getState, restore } from '../app/js/audio/index.js';

const CONTRACT_ERAS = ['menu', 'renaissance', 'baroque', 'rococo', 'neoclassic', 'romantic',
  'realism', 'impressionism', 'postimpressionism', 'modern'];
// Eras que usa el catálogo (más la portada): cada una tiene al menos dos variantes además de la original.
const PLAYED_ERAS = CONTRACT_ERAS.filter((e) => e !== 'neoclassic');
const CONTRACT_SFX = ['tap', 'correct', 'wrong', 'streak', 'levelup', 'medal', 'unlock', 'complete'];
const ALL_KEYS = allPieceKeys();

test('todas las eras del contrato tienen partitura', () => {
  assert.deepEqual([...ERAS].sort(), [...CONTRACT_ERAS].sort());
  for (const era of CONTRACT_ERAS) assert.ok(SCORES[era], era);
});

test('variantes: la original es la primera y las eras jugadas tienen al menos dos más', () => {
  for (const era of CONTRACT_ERAS) {
    const vs = variantsOf(era);
    assert.equal(vs[0].id, DEFAULT_VARIANT);
    assert.equal(vs[0].piece, SCORES[era]);
    const ids = vs.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, `ids repetidos en ${era}`);
    for (const v of vs) {
      assert.match(v.id, /^[a-z]+$/, `${era}/${v.id}`);
      assert.ok(v.name && v.piece && v.piece.title, `${era}/${v.id} sin nombre o partitura`);
      assert.ok(v.label.length > 10 && v.label.length <= 80 && !v.label.includes('\n'), `${era}/${v.id}: etiqueta "${v.label}"`);
      assert.equal(v.character.split(',').map((w) => w.trim()).filter(Boolean).length, 3, `${era}/${v.id}: tres palabras de carácter`);
    }
  }
  for (const era of PLAYED_ERAS) assert.ok(variantsOf(era).length >= 3, `${era}: ${variantsOf(era).length} variantes`);
  assert.ok(variantsOf('renaissance').length >= 4 && variantsOf('baroque').length >= 4, 'tres nuevas en las épocas más jugadas');
  assert.deepEqual(variantsOf('inexistente'), []);
  assert.ok(ALL_KEYS.length >= CONTRACT_ERAS.length + 2 * PLAYED_ERAS.length);
});

test('claves de pieza: era (base) o era/variante; por defecto suena la original', () => {
  assert.equal(pieceKey('baroque'), 'baroque');
  assert.equal(pieceKey('baroque', DEFAULT_VARIANT), 'baroque');
  assert.equal(pieceKey('baroque', 'zarabanda'), 'baroque/zarabanda');
  assert.deepEqual(splitKey('baroque/zarabanda'), { era: 'baroque', variant: 'zarabanda' });
  assert.deepEqual(splitKey('menu'), { era: 'menu', variant: DEFAULT_VARIANT });
  assert.equal(getPiece('baroque'), SCORES.baroque);
  assert.equal(getPiece('baroque/zarabanda').title, 'Zarabanda de la sala');
  assert.equal(getPiece('baroque/nada'), null);
  assert.equal(getPiece('nada'), null);
  assert.ok(compilePiece('nada/nada').errors.length > 0);
});

for (const key of ALL_KEYS) {
  test(`partitura válida: ${key}`, () => {
    assert.deepEqual(validatePiece(key), []);
    const c = compilePiece(key);
    const p = getPiece(key);
    assert.ok(c.bars >= 24 && c.bars <= 48, `${c.bars} compases`);
    // forma clara: 3 o 4 pasadas de 8 compases (A–A'–B–A' o A–A'–B), no un bucle de 4
    assert.equal(c.bars % 8, 0);
    assert.ok(p.form.length >= 3);
    // cada compás de melodía (y de contramelodía) suma exactamente el compás
    for (const sec of Object.values(p.sections)) {
      for (const bar of [...sec.mel, ...(sec.cnt || [])]) assert.ok(Math.abs(parseBar(bar).total - p.beatsPerBar) < 1e-9, bar);
    }
    // hay melodía, bajo y acompañamiento; la melodía tiene bastantes notas y no es un solo tono
    const mel = c.events.filter((e) => e.voice === 'mel');
    assert.ok(mel.length >= 40, `melodía con ${mel.length} notas`);
    assert.ok(new Set(mel.map((e) => e.midi)).size >= 6);
    assert.ok(c.events.some((e) => e.voice === 'bass'), 'sin bajo');
    // instrumentos y patrón existen para cada voz usada
    assert.ok(STYLES[p.style], `patrón ${p.style}`);
    for (const voice of new Set(c.events.map((e) => e.voice))) {
      const inst = p.voices[voice];
      assert.ok(INSTRUMENTS[inst], `${key}: voz ${voice} -> instrumento ${inst}`);
      assert.ok(WET[inst] !== undefined, `${key}: reverb de ${inst}`);
    }
    // el acompañamiento tampoco se sale de rango ni de la polifonía razonable
    const maxSimul = Math.max(...c.events.map((a) => c.events.filter((b) => b.t <= a.t && b.t + b.dur > a.t).length));
    assert.ok(maxSimul <= 30, `polifonía teórica ${maxSimul}`);
    assert.ok(p.level > 0 && p.level <= 1.6 && p.reverb >= 0 && p.reverb <= 1);
  });
}

test('las piezas no repiten tonalidad/tempo idénticos (variedad)', () => {
  const sigs = new Set(CONTRACT_ERAS.map((e) => `${SCORES[e].tonic}-${SCORES[e].bpm}-${SCORES[e].beatsPerBar}`));
  assert.equal(sigs.size, CONTRACT_ERAS.length);
  // dentro de cada era, las variantes cambian de compás o de tempo y no comparten patrón de acompañamiento
  for (const era of PLAYED_ERAS) {
    const vs = variantsOf(era);
    const meters = new Set(vs.map((v) => `${v.piece.beatsPerBar}-${v.piece.bpm}`));
    assert.equal(meters.size, vs.length, `${era}: variantes con el mismo compás y tempo`);
    const styles = vs.slice(1).map((v) => v.piece.style); // las nuevas no comparten patrón entre sí
    assert.equal(new Set(styles).size, styles.length, `${era}: patrón repetido ${styles}`);
  }
  // entre todas las piezas hay al menos cinco compases distintos (2/4, 3/4, 4/4, 5/4, 6/8)
  assert.ok(new Set(ALL_KEYS.map((k) => getPiece(k).beatsPerBar)).size >= 5);
});

test('portada: las dos variantes del tema principal comparten el motivo-firma (mi–sol–la–do)', () => {
  const MOTIF = [4, 7, 9, 0];
  for (const v of variantsOf('menu').slice(1)) {
    const mel = compilePiece(pieceKey('menu', v.id)).events.filter((e) => e.voice === 'mel').map((e) => e.midi % 12);
    const found = mel.some((_, i) => MOTIF.every((pc, j) => mel[i + j] === pc));
    assert.ok(found, `menu/${v.id} no contiene el motivo`);
  }
});

test('parseBar y notas', () => {
  assert.equal(noteToMidi('C4'), 60);
  assert.equal(noteToMidi('Bb3'), 58);
  assert.equal(noteToMidi('F#5'), 78);
  assert.ok(Number.isNaN(noteToMidi('H4')));
  const b = parseBar('*.5 C5 D5 r/1 E5/2');
  assert.equal(b.total, 4);
  assert.equal(b.notes.length, 3);
  assert.ok(parseBar('C5/x').error);
});

test('acordes', () => {
  const c = parseChord('Eb/G');
  assert.equal(c.root, 3);
  assert.equal(c.bass, 7);
  assert.ok(c.pcs.has(10));
  assert.throws(() => parseChord('Hm'));
  assert.deepEqual(voicing(parseChord('C'), 48, 3), [48, 52, 55]);
  assert.equal(bassMidi(parseChord('G'), 43), 43);
  const parts = parseChordCell('Am:2|D:1', 3);
  assert.deepEqual(parts.map((p) => p.len), [2, 1]);
  assert.deepEqual([...parseChord('Eaug').pcs].sort((a, b) => a - b), [0, 4, 8]);
  assert.ok(parseChord('Emaj9').pcs.has(6));
});

test('todos los efectos del contrato están definidos y son cortos', () => {
  assert.deepEqual([...SFX_NAMES].sort(), [...CONTRACT_SFX].sort());
  for (const name of CONTRACT_SFX) {
    const d = SFX[name];
    assert.ok(d && d.notes.length > 0, name);
    for (const n of d.notes) assert.ok(n.m >= 36 && n.m <= 100 && n.v > 0 && n.v <= 1, `${name} nota`);
    const len = sfxLength(name);
    if (name === 'complete') assert.ok(len > 1.5 && len < 3.2, `complete ${len}`);
    else assert.ok(len < 1.2, `${name} dura ${len}`);
  }
  // "complete" es el más celebratorio (más notas y más largo)
  for (const name of CONTRACT_SFX.filter((n) => n !== 'complete')) {
    assert.ok(SFX.complete.notes.length >= SFX[name].notes.length);
    assert.ok(sfxLength('complete') > sfxLength(name));
  }
  assert.ok(SFX.tap.notes[0].v < SFX.correct.notes[0].v); // el tap es el más sutil
});

test('Karplus-Strong: finito, normalizado y afinable', () => {
  const r = pluckBuffer(44100, 261.63, 0.5, { t60: 1.5, seed: 3 });
  assert.equal(r.data.length, 22050);
  let peak = 0;
  for (const v of r.data) { assert.ok(Number.isFinite(v)); peak = Math.max(peak, Math.abs(v)); }
  assert.ok(peak > 0.95 && peak <= 1.0001);
  assert.ok(Math.abs(r.freq / 261.63 - 1) < 0.02);
  const again = pluckBuffer(44100, 261.63, 0.5, { t60: 1.5, seed: 3 });
  assert.deepEqual(r.data.slice(0, 50), again.data.slice(0, 50)); // determinista
});

test('variación del bucle: determinista con semilla y sin salirse de rango', () => {
  for (const key of ALL_KEYS) {
    const c = compilePiece(key);
    const a = varyLoop(c, 1, mulberry32(5));
    const b = varyLoop(c, 1, mulberry32(5));
    assert.deepEqual(a, b);
    assert.ok(a.length >= c.events.length);
    for (const e of a) assert.ok(e.midi >= 24 && e.midi <= 108 && e.dur > 0 && e.vel > 0 && e.vel <= 1, key);
  }
  // dinámica por sección: en las piezas que la definen, B suena algo más que A (de media)
  for (const key of ALL_KEYS.filter((k) => getPiece(k).dyn)) {
    const c = compilePiece(key);
    const v = varyLoop(c, 0, mulberry32(9)).filter((e) => e.voice === 'mel');
    const mean = (sec) => { const xs = v.filter((e) => e.sec === sec); return xs.reduce((s, e) => s + e.vel, 0) / xs.length; };
    assert.ok(mean('B') > mean('A'), key);
  }
});

test('mapa de tiempo: monótono y con rubato acotado', () => {
  for (const key of ALL_KEYS) {
    const c = compilePiece(key);
    const f = barFactors(c, mulberry32(2));
    assert.ok(f.every((x) => x > 0.9 && x < 1.25), key);
    const m = makeTimeMap(c, f);
    let prev = -1;
    for (let beat = 0; beat <= c.bars * c.beatsPerBar; beat += 0.5) {
      const t = m.at(beat);
      assert.ok(t > prev - 1e-12);
      prev = t;
    }
    const nominal = (c.bars * c.beatsPerBar * 60) / c.bpm;
    assert.ok(Math.abs(m.total / nominal - 1) < 0.1, `${key} ${m.total} vs ${nominal}`);
    // una vuelta dura entre 40 s y dos minutos y medio: ni bucle corto ni pieza interminable
    assert.ok(m.total > 40 && m.total < 150, `${key}: vuelta de ${m.total.toFixed(1)} s`);
  }
});

test('secuenciador: programa por adelantado, en orden, y repite el bucle', () => {
  const played = [];
  const ctx = { currentTime: 0 };
  const seq = new Sequencer(ctx, 'neoclassic', (ev, when) => played.push({ ev, when }), { seed: 4 });
  seq.loopStart = 0;
  seq.prepare(0);
  const loopLen = seq.map.total;
  seq.scheduleRange(0.4, 0);
  assert.ok(played.length > 0);
  assert.ok(played.every((p) => p.when <= 0.4 + 1e-9 && p.when >= 0));
  // avanzar el reloj: lo ya programado no se repite y llegamos a la segunda vuelta
  const n0 = played.length;
  for (let t = 0.4; t < loopLen * 2.05; t += 0.1) { ctx.currentTime = t - 0.4; seq.scheduleRange(t, ctx.currentTime); }
  assert.ok(played.length > n0 * 2);
  assert.ok(played.some((p) => p.when > loopLen), 'segunda vuelta');
  const whens = played.map((p) => p.when);
  const sorted = [...whens].sort((a, b) => a - b);
  // casi ordenado (humanización de milisegundos y adornos previos al tiempo)
  assert.ok(whens.every((w, i) => Math.abs(w - sorted[i]) < 0.2));
  // si el reloj se atrasa mucho (pestaña dormida) se omiten las notas vencidas en lugar de amontonarlas
  const late = [];
  const seq2 = new Sequencer({ currentTime: 100 }, 'menu', (ev, when) => late.push(when), { seed: 1 });
  seq2.loopStart = 0;
  seq2.prepare(0);
  seq2.scheduleRange(100.4, 100);
  assert.ok(late.every((w) => w >= 100));
  assert.ok(late.length < 40);
  // también con una variante (clave era/variante)
  const alt = [];
  const seq3 = new Sequencer({ currentTime: 0 }, 'renaissance/saltarello', (ev, when) => alt.push(when), { seed: 1 });
  seq3.loopStart = 0;
  seq3.prepare(0);
  seq3.scheduleRange(2, 0);
  assert.ok(alt.length > 5);
});

test('la API pública no lanza sin AudioContext y devuelve un estado coherente', () => {
  assert.equal(typeof globalThis.AudioContext, 'undefined');
  assert.doesNotThrow(() => {
    audio.sfx('correct');                 // antes de unlock: no-op
    audio.startMusic();
    audio.setEra('baroque');
    audio.setEra('no-existe');
    audio.setEra(undefined);
    audio.setVariant('baroque', 'no-existe');
    audio.setVariant('no-existe', 'base');
    audio.setVariant(null, null);
    audio.setMusicEnabled(false);
    audio.setMusicEnabled(true);
    audio.setSfxEnabled(false);
    audio.setSfxEnabled(true);
    audio.setVolume(5);
    audio.setVolume(-1);
    audio.setVolume('abc');
    audio.setVolume(null);
    audio.stopMusic();
    audio.sfx('no-existe');
    audio.sfx(null);
    audio.restore(null);
    audio.restore('basura');
    audio.restore({ volume: {}, era: 42, musicEnabled: 'x', variants: 'nada' });
  });
  assert.equal(audio.unlock(), false);
  const s = getState();
  assert.deepEqual(Object.keys(s).sort(), ['era', 'musicEnabled', 'playing', 'sfxEnabled', 'unlocked', 'variants', 'volume']);
  assert.equal(s.unlocked, false);
  assert.equal(s.playing, false);
  assert.ok(s.volume >= 0 && s.volume <= 1);
  assert.ok(ERAS.includes(s.era));
  assert.deepEqual(s.variants, {}); // por defecto, ninguna variante elegida: suena la original
});

test('variantes: se eligen por era, se guardan y se sanean; listVariants no expone la partitura', () => {
  audio.setVariant('baroque', 'zarabanda');
  assert.deepEqual(getState().variants, { baroque: 'zarabanda' });
  audio.setVariant('baroque', 'inexistente'); // se ignora
  assert.deepEqual(getState().variants, { baroque: 'zarabanda' });
  audio.setVariant('baroque', 'base');        // vuelve a la original
  assert.deepEqual(getState().variants, {});
  audio.setVariant('menu', 'umbral');
  audio.getState().variants.menu = 'x';       // getState devuelve una copia
  assert.equal(getState().variants.menu, 'umbral');
  const list = audio.listVariants('menu');
  assert.deepEqual(list.map((v) => v.id), variantsOf('menu').map((v) => v.id));
  assert.ok(list.every((v) => !('piece' in v) && v.label && v.character));
  assert.deepEqual(audio.listVariants('nada'), []);
  audio.setVariant('menu');                   // sin variante = original
  assert.deepEqual(getState().variants, {});
});

test('restore y getState: las preferencias se recuerdan y se sanean', () => {
  restore({ musicEnabled: false, sfxEnabled: false, volume: 0.25, era: 'romantic', variants: { romantic: 'balada', realism: 'nada', x: 'y' } });
  assert.deepEqual(getState(), { unlocked: false, era: 'romantic', musicEnabled: false, sfxEnabled: false, volume: 0.25, playing: false, variants: { romantic: 'balada' } });
  restore({ volume: 7 });
  assert.equal(getState().volume, 1);
  restore({ era: 'inexistente' });
  assert.equal(getState().era, 'romantic');
  audio.getState().era = 'x'; // getState devuelve una copia
  assert.equal(getState().era, 'romantic');
  restore({ variants: { romantic: 'base' } });
  assert.deepEqual(getState().variants, {});
});
