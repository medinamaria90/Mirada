// Utilidades de teoría musical: notas, acordes, escalas y un RNG con semilla.
// Lógica pura (sin Web Audio) para poder probarla en Node.

const LETTERS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C#5" | "Bb3" -> número MIDI (C4 = 60). Devuelve NaN si no es válida. */
export function noteToMidi(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(String(name));
  if (!m) return NaN;
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return (Number(m[3]) + 1) * 12 + LETTERS[m[1]] + acc;
}

export const midiToFreq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
export const pcOf = (midi) => ((midi % 12) + 12) % 12;
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/** Lee una clase de altura al inicio de la cadena ("F#m7" -> {pc:6, rest:'m7'}). */
function readPc(str) {
  const letter = LETTERS[str[0]];
  if (letter === undefined) return null;
  let pc = letter;
  let i = 1;
  if (str[i] === '#') { pc += 1; i++; } else if (str[i] === 'b') { pc -= 1; i++; }
  return { pc: (pc + 12) % 12, rest: str.slice(i) };
}

/** Intervalos (en semitonos desde la fundamental) de cada tipo de acorde. */
export const CHORD_QUALITIES = {
  '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10],
  dim: [0, 3, 6], aug: [0, 4, 8], sus4: [0, 5, 7], sus2: [0, 2, 7],
  9: [0, 4, 7, 10, 14], maj9: [0, 4, 7, 11, 14], m9: [0, 3, 7, 10, 14],
  m7b5: [0, 3, 6, 10], q3: [0, 5, 10], 6: [0, 4, 7, 9], add9: [0, 4, 7, 14],
};

/** "Dm7", "Eb/G", "F#q3" -> { name, root, bass, intervals, pcs }. Lanza si no se entiende. */
export function parseChord(name) {
  const [body, slash] = String(name).split('/');
  const head = readPc(body);
  if (!head || !(head.rest in CHORD_QUALITIES)) throw new Error(`Acorde no válido: ${name}`);
  const intervals = CHORD_QUALITIES[head.rest];
  const bassHead = slash ? readPc(slash) : null;
  if (slash && !bassHead) throw new Error(`Bajo no válido: ${name}`);
  const root = head.pc;
  const bass = bassHead ? bassHead.pc : root;
  const pcs = new Set(intervals.map((i) => (root + i) % 12));
  pcs.add(bass);
  return { name, root, bass, intervals, pcs };
}

/** Nota con clase de altura `pc` dentro de [lo, lo+11]. */
export function pcMidi(pc, lo) {
  return lo + ((((pc - lo) % 12) + 12) % 12);
}

/** Nota grave del acorde (respeta bajos "/X") dentro de [lo, lo+11]. */
export const bassMidi = (chord, lo) => pcMidi(chord.bass, lo);

/** Notas del acorde, ascendentes, todas >= lo (como mucho `n`). */
export function voicing(chord, lo, n = 4) {
  const out = new Set();
  for (const i of chord.intervals) {
    let m = pcMidi((chord.root + i) % 12, lo);
    // las extensiones (novena) van por encima de la fundamental si cabe
    if (i >= 12 && m - lo < 5) m += 12;
    out.add(m);
  }
  return [...out].sort((a, b) => a - b).slice(0, n);
}

/** Siguiente nota de la escala (conjunto de clases de altura) en la dirección dada. */
export function stepIn(scalePcs, midi, dir) {
  for (let d = 1; d <= 3; d++) {
    const m = midi + dir * d;
    if (scalePcs.has(pcOf(m))) return m;
  }
  return midi + dir;
}

/** RNG determinista (mulberry32). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const MODES = {
  major: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10],
  minor: [0, 2, 3, 5, 7, 8, 10], mixolydian: [0, 2, 4, 5, 7, 9, 10],
};
export const scalePcs = (tonic, mode, extra = []) =>
  new Set([...MODES[mode].map((i) => (tonic + i) % 12), ...extra]);
