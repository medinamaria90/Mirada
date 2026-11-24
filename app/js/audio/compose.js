// Del dato (partitura) al evento: compila acompañamiento, valida, da forma al tiempo
// (rubato y ritardando de frase) y añade variación ligera en cada vuelta del bucle.
import { SCORES, ERAS } from './scores.js';
import { STYLES } from './styles.js';
import { noteToMidi, parseChord, pcOf, stepIn, mulberry32 } from './theory.js';

const EPS = 1e-6;

/** "C#5/1.5 r/1 *.5 E5" -> { notes:[{t,dur,midi}], total, error } */
export function parseBar(str) {
  const notes = [];
  let t = 0;
  let def = 1;
  let error = null;
  for (const tok of String(str).trim().split(/\s+/)) {
    if (tok[0] === '*') { def = Number(tok.slice(1)); continue; }
    const [name, d] = tok.split('/');
    const dur = d === undefined ? def : Number(d);
    if (!(dur > 0)) { error = `duración no válida en "${tok}"`; break; }
    if (name !== 'r') {
      const midi = noteToMidi(name);
      if (Number.isNaN(midi)) { error = `nota no válida "${tok}"`; break; }
      notes.push({ t, dur, midi });
    }
    t += dur;
  }
  return { notes, total: t, error };
}

/** "Am:2|D:1" -> [{chord, off, len}] repartiendo el compás según los pesos. */
export function parseChordCell(cell, beatsPerBar) {
  const items = String(cell).split('|').map((s) => {
    const [name, w] = s.split(':');
    return { chord: parseChord(name), w: w === undefined ? 1 : Number(w) };
  });
  const sum = items.reduce((a, b) => a + b.w, 0);
  let off = 0;
  return items.map((it) => {
    const len = (it.w / sum) * beatsPerBar;
    const part = { chord: it.chord, off, len };
    off += len;
    return part;
  });
}

const cache = new Map();

/** Compila una era: eventos en tiempos desde el inicio, ordenados. Nunca lanza (acumula `errors`). */
export function compilePiece(era) {
  if (cache.has(era)) return cache.get(era);
  const piece = SCORES[era];
  const out = { era, piece, bars: 0, beatsPerBar: 0, bpm: 0, events: [], parts: [], barTags: [], errors: [] };
  if (!piece) { out.errors.push(`era desconocida: ${era}`); return out; }
  const bpb = piece.beatsPerBar;
  Object.assign(out, { beatsPerBar: bpb, bpm: piece.bpm });
  let bar = 0;
  piece.form.forEach((group, pass) => {
    for (const secName of group) {
      const sec = piece.sections[secName];
      if (!sec) { out.errors.push(`sección ausente: ${secName}`); continue; }
      if (sec.chords.length !== sec.mel.length) out.errors.push(`${era}/${secName}: acordes y compases no coinciden`);
      for (let i = 0; i < sec.mel.length; i++, bar++) {
        const t0 = bar * bpb;
        out.barTags.push({ sec: secName, pass });
        try {
          const bm = parseBar(sec.mel[i]);
          if (bm.error) out.errors.push(`${era}/${secName}[${i}]: ${bm.error}`);
          else if (Math.abs(bm.total - bpb) > EPS) out.errors.push(`${era}/${secName}[${i}]: suma ${bm.total} != ${bpb}`);
          for (const n of bm.notes) {
            out.events.push({ t: t0 + n.t, dur: n.dur, midi: n.midi, vel: 0.62, voice: 'mel', sec: secName, bar });
          }
          for (const p of parseChordCell(sec.chords[i], bpb)) {
            out.parts.push({ chord: p.chord, t: t0 + p.off, len: p.len, bar });
          }
        } catch (e) {
          out.errors.push(`${era}/${secName}[${i}]: ${e.message}`);
        }
      }
    }
  });
  out.bars = bar;
  const style = STYLES[piece.style];
  if (!style) out.errors.push(`estilo desconocido: ${piece.style}`);
  else {
    out.parts.forEach((part, idx) => {
      const next = out.parts[(idx + 1) % out.parts.length];
      for (const e of style(part, next, piece)) {
        out.events.push({ t: part.t + e.o, dur: e.dur, midi: e.midi, vel: e.vel, voice: e.voice, sec: out.barTags[part.bar]?.sec, bar: part.bar });
      }
    });
  }
  out.events.sort((a, b) => a.t - b.t || a.midi - b.midi);
  cache.set(era, out);
  return out;
}

/** Comprobaciones de calidad de la partitura; devuelve lista de problemas (vacía = bien). */
export function validatePiece(era) {
  const c = compilePiece(era);
  const errs = [...c.errors];
  if (c.bars < 24 || c.bars > 48) errs.push(`${era}: ${c.bars} compases fuera de 24–48`);
  for (const e of c.events) {
    if (!(e.midi >= 36 && e.midi <= 96)) errs.push(`${era}: nota fuera de rango ${e.midi} en t=${e.t}`);
    if (!(e.dur > 0) || !(e.vel > 0 && e.vel <= 1)) errs.push(`${era}: dur/vel no válidas en t=${e.t}`);
  }
  const mel = c.events.filter((e) => e.voice === 'mel').sort((a, b) => a.t - b.t);
  for (let i = 1; i < mel.length; i++) {
    const leap = Math.abs(mel[i].midi - mel[i - 1].midi);
    if (leap > 12) errs.push(`${era}: salto de ${leap} semitonos en t=${mel[i].t}`);
  }
  for (const m of mel) {
    const part = c.parts.find((p) => m.t >= p.t - EPS && m.t < p.t + p.len - EPS);
    if (!part) { errs.push(`${era}: nota sin acorde en t=${m.t}`); continue; }
    const pc = pcOf(m.midi);
    if (Math.abs(m.t - part.t) < EPS && !part.chord.pcs.has(pc)) {
      errs.push(`${era}: tiempo fuerte (t=${m.t}) fuera del acorde ${part.chord.name}`);
    }
    if (!c.piece.scale.has(pc) && !part.chord.pcs.has(pc)) errs.push(`${era}: nota ${m.midi} fuera de escala en t=${m.t}`);
  }
  return errs;
}

/** Factor de duración de cada compás (>1 = más lento): rubato suave + ritardando al final de frase. */
export function barFactors(compiled, rng) {
  const { amp = 0, ritard = 0.03 } = compiled.piece.rubato || {};
  const phase = rng();
  const f = [];
  for (let b = 0; b < compiled.bars; b++) {
    const k = b % 8;
    f.push(1 + amp * Math.sin(2 * Math.PI * (b / 4 + phase)) + ritard * (k === 7 ? 1 : k === 6 ? 0.4 : 0));
  }
  return f;
}

/** Mapa tiempo(tiempos musicales) -> segundos, con el tempo de cada compás. */
export function makeTimeMap(compiled, factors) {
  const spb = 60 / compiled.bpm;
  const bpb = compiled.beatsPerBar;
  const n = compiled.bars;
  const cum = [0];
  for (let b = 0; b < n; b++) cum.push(cum[b] + bpb * spb * factors[b]);
  return {
    total: cum[n],
    at(beat) {
      const b = Math.floor(beat / bpb);
      if (b < 0) return beat * spb * factors[0];
      if (b >= n) return cum[n] + (beat - n * bpb) * spb * factors[n - 1];
      return cum[b] + (beat - b * bpb) * spb * factors[b];
    },
  };
}

function ornament(ev, piece, rng, kind) {
  const up = (m) => stepIn(piece.scale, m, 1);
  const down = (m) => stepIn(piece.scale, m, -1);
  const mk = (t, dur, midi, vel) => ({ ...ev, t, dur, midi, vel });
  if (kind === 'mordent' && ev.dur >= 1) {
    return [mk(ev.t, 0.125, ev.midi, ev.vel), mk(ev.t + 0.125, 0.125, up(ev.midi), ev.vel * 0.85),
      mk(ev.t + 0.25, ev.dur - 0.25, ev.midi, ev.vel)];
  }
  if (kind === 'grace' && ev.dur >= 0.75 && ev.t > 0.2) {
    return [mk(ev.t - 0.12, 0.12, rng() < 0.5 ? down(ev.midi) : up(ev.midi), ev.vel * 0.6), ev];
  }
  if (kind === 'turn' && ev.dur >= 1.5) {
    const n = ev.midi;
    return [mk(ev.t, 0.2, up(n), ev.vel * 0.9), mk(ev.t + 0.2, 0.2, n, ev.vel * 0.85),
      mk(ev.t + 0.4, 0.2, down(n), ev.vel * 0.8), mk(ev.t + 0.6, ev.dur - 0.6, n, ev.vel)];
  }
  return [ev];
}

/**
 * Eventos de una vuelta concreta del bucle: pequeña humanización de velocidad y tiempo,
 * ornamentos ocasionales (más en la repetición conclusiva) y, en vueltas impares, la
 * sección B se dobla suavemente a la octava para que el bucle no sea idéntico.
 */
export function varyLoop(compiled, loopIdx, rng) {
  const { piece } = compiled;
  const orn = piece.orn;
  const out = [];
  for (const base of compiled.events) {
    let list = [{ ...base }];
    if (base.voice === 'mel') {
      list[0].vel = base.vel * (0.94 + rng() * 0.12);
      if (orn && rng() < orn.prob * (loopIdx === 0 ? 0.5 : 1) * (base.sec === 'close' ? 1.6 : 1)) {
        list = ornament(list[0], piece, rng, orn.kind);
      }
      if (loopIdx % 2 === 1 && base.sec === 'B' && base.midi <= 84 && base.dur >= 1) {
        list.push({ ...base, midi: base.midi + 12, vel: base.vel * 0.3 });
      }
    } else {
      list[0].vel = base.vel * (0.92 + rng() * 0.16);
    }
    for (const e of list) {
      e.t += (rng() - 0.5) * 0.03;
      out.push(e);
    }
  }
  return out.sort((a, b) => a.t - b.t);
}

export { ERAS, mulberry32 };
