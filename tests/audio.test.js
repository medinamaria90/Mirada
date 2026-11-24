// Pruebas de la lógica pura del motor de audio (sin Web Audio real).
import test from 'node:test';
import assert from 'node:assert/strict';
import { ERAS, SCORES } from '../app/js/audio/scores.js';
import { compilePiece, validatePiece, parseBar, parseChordCell, varyLoop, barFactors, makeTimeMap } from '../app/js/audio/compose.js';
import { noteToMidi, parseChord, voicing, bassMidi, mulberry32 } from '../app/js/audio/theory.js';
import { pluckBuffer } from '../app/js/audio/ks.js';
import { SFX, SFX_NAMES, sfxLength } from '../app/js/audio/sfx.js';
import { Sequencer } from '../app/js/audio/sequencer.js';
import { audio, getState, restore } from '../app/js/audio/index.js';

const CONTRACT_ERAS = ['menu', 'renaissance', 'baroque', 'rococo', 'neoclassic', 'romantic',
  'realism', 'impressionism', 'postimpressionism', 'modern'];
const CONTRACT_SFX = ['tap', 'correct', 'wrong', 'streak', 'levelup', 'medal', 'unlock', 'complete'];

test('todas las eras del contrato tienen partitura', () => {
  assert.deepEqual([...ERAS].sort(), [...CONTRACT_ERAS].sort());
  for (const era of CONTRACT_ERAS) assert.ok(SCORES[era], era);
});

for (const era of CONTRACT_ERAS) {
  test(`partitura válida: ${era}`, () => {
    assert.deepEqual(validatePiece(era), []);
    const c = compilePiece(era);
    assert.ok(c.bars >= 24 && c.bars <= 48, `${c.bars} compases`);
    // forma clara: 3 o 4 pasadas de 8 compases
    assert.equal(c.bars % 8, 0);
    // cada compás de melodía suma exactamente el compás
    const p = SCORES[era];
    for (const sec of Object.values(p.sections)) {
      for (const bar of sec.mel) assert.ok(Math.abs(parseBar(bar).total - p.beatsPerBar) < 1e-9, bar);
    }
    // hay melodía y acompañamiento
    assert.ok(c.events.some((e) => e.voice === 'mel'));
    assert.ok(c.events.some((e) => e.voice !== 'mel'));
    // el acompañamiento tampoco se sale de rango ni de la polifonía razonable
    const maxSimul = Math.max(...c.events.map((a) => c.events.filter((b) => b.t <= a.t && b.t + b.dur > a.t).length));
    assert.ok(maxSimul <= 30, `polifonía teórica ${maxSimul}`);
  });
}

test('las piezas no repiten tonalidad/tempo idénticos (variedad)', () => {
  const sigs = new Set(CONTRACT_ERAS.map((e) => `${SCORES[e].tonic}-${SCORES[e].bpm}-${SCORES[e].beatsPerBar}`));
  assert.equal(sigs.size, CONTRACT_ERAS.length);
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
  for (const era of CONTRACT_ERAS) {
    const c = compilePiece(era);
    const a = varyLoop(c, 1, mulberry32(5));
    const b = varyLoop(c, 1, mulberry32(5));
    assert.deepEqual(a, b);
    assert.ok(a.length >= c.events.length);
    for (const e of a) assert.ok(e.midi >= 24 && e.midi <= 108 && e.dur > 0 && e.vel > 0, era);
  }
});

test('mapa de tiempo: monótono y con rubato acotado', () => {
  for (const era of CONTRACT_ERAS) {
    const c = compilePiece(era);
    const f = barFactors(c, mulberry32(2));
    assert.ok(f.every((x) => x > 0.9 && x < 1.25), era);
    const m = makeTimeMap(c, f);
    let prev = -1;
    for (let beat = 0; beat <= c.bars * c.beatsPerBar; beat += 0.5) {
      const t = m.at(beat);
      assert.ok(t > prev - 1e-12);
      prev = t;
    }
    const nominal = (c.bars * c.beatsPerBar * 60) / c.bpm;
    assert.ok(Math.abs(m.total / nominal - 1) < 0.1, `${era} ${m.total} vs ${nominal}`);
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
});

test('la API pública no lanza sin AudioContext y devuelve un estado coherente', () => {
  assert.equal(typeof globalThis.AudioContext, 'undefined');
  assert.doesNotThrow(() => {
    audio.sfx('correct');                 // antes de unlock: no-op
    audio.startMusic();
    audio.setEra('baroque');
    audio.setEra('no-existe');
    audio.setEra(undefined);
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
    audio.restore({ volume: {}, era: 42, musicEnabled: 'x' });
  });
  assert.equal(audio.unlock(), false);
  const s = getState();
  assert.deepEqual(Object.keys(s).sort(), ['era', 'musicEnabled', 'playing', 'sfxEnabled', 'unlocked', 'volume']);
  assert.equal(s.unlocked, false);
  assert.equal(s.playing, false);
  assert.ok(s.volume >= 0 && s.volume <= 1);
  assert.ok(ERAS.includes(s.era));
});

test('restore y getState: las preferencias se recuerdan y se sanean', () => {
  restore({ musicEnabled: false, sfxEnabled: false, volume: 0.25, era: 'romantic' });
  assert.deepEqual(getState(), { unlocked: false, era: 'romantic', musicEnabled: false, sfxEnabled: false, volume: 0.25, playing: false });
  restore({ volume: 7 });
  assert.equal(getState().volume, 1);
  restore({ era: 'inexistente' });
  assert.equal(getState().era, 'romantic');
  audio.getState().era = 'x'; // getState devuelve una copia
  assert.equal(getState().era, 'romantic');
});
