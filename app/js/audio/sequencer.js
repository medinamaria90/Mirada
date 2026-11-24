// Planificador con "lookahead": cada ~100 ms programa las notas que caen en los próximos ~0,4 s
// usando el reloj del AudioContext (currentTime), de modo que el ritmo no depende del temporizador JS.
import { compilePiece, varyLoop, barFactors, makeTimeMap } from './compose.js';
import { mulberry32 } from './theory.js';

export class Sequencer {
  /**
   * @param ctx    AudioContext (o un objeto con currentTime en las pruebas)
   * @param era    clave de la pieza
   * @param play   (ev, when, durSec, loopIdx) => void
   */
  constructor(ctx, era, play, { seed = 1, lookahead = 0.4, interval = 100 } = {}) {
    this.ctx = ctx;
    this.compiled = compilePiece(era);
    this.play = play;
    this.lookahead = lookahead;
    this.interval = interval;
    this.rng = mulberry32(seed);
    this.timer = null;
    this.loop = 0;
    this.idx = 0;
    this.loopStart = 0;
  }

  /** Prepara la vuelta `loop`: nuevo rubato y variaciones. */
  prepare(loop) {
    this.loop = loop;
    this.events = varyLoop(this.compiled, loop, this.rng);
    this.map = makeTimeMap(this.compiled, barFactors(this.compiled, this.rng));
    this.idx = 0;
  }

  start(atTime = this.ctx.currentTime + 0.05) {
    this.loopStart = atTime;
    this.prepare(0);
    this.stopTimer();
    this.timer = setInterval(() => this.tick(), this.interval);
    this.tick();
  }

  tick() {
    try { this.scheduleRange(this.ctx.currentTime + this.lookahead, this.ctx.currentTime); } catch { /* nunca romper el reloj */ }
  }

  /** Programa todo lo que caiga antes de `horizon`. `now` = -Infinity en renderizado sin conexión. */
  scheduleRange(horizon, now) {
    let guard = 0;
    while (guard++ < 5000) {
      if (this.idx >= this.events.length) {
        const next = this.loopStart + this.map.total;
        if (next > horizon) return;
        this.loopStart = next;
        this.prepare(this.loop + 1);
        continue;
      }
      const ev = this.events[this.idx];
      const when = this.loopStart + this.map.at(ev.t);
      if (when > horizon) return;
      this.idx++;
      if (when < now - 0.1) continue; // llegamos tarde (pestaña dormida): se omite en vez de amontonar
      const dur = Math.max(0.03, this.map.at(ev.t + ev.dur) - this.map.at(ev.t));
      this.play(ev, Math.max(when, Number.isFinite(now) ? now : 0), dur, this.loop);
    }
  }

  stopTimer() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }
  stop() { this.stopTimer(); }
}
