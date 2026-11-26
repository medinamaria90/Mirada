// Luz del día del juego (puro, sin DOM): el mapa no sigue la hora del móvil sino un reloj propio y rápido, como en
// muchos juegos: un día entero cada GAME_DAY_MIN minutos de juego (amanecer, día largo, atardecer y una noche algo
// más corta), para que quien juega siempre a la misma hora vea pasar el día y la noche. Da cuánto es de noche (0 de
// día, 1 de noche) y cuánto brilla el arrebol (0 a 1, con su pico en mitad del amanecer y del atardecer). El reloj que
// avanza y se guarda está en state/game-clock.js; aquí solo las cuentas a partir del minuto del día de juego.

export const GAME_DAY_MIN = 24;
// Reparto del día de juego, en minutos y en este orden (suman GAME_DAY_MIN).
export const GAME_PHASES_MIN = { dawn: 2.5, day: 12, dusk: 2.5, night: 7 };
// Una sesión nueva (la primera vez o tras este rato fuera) arranca en la hora real del móvil; si se vuelve antes,
// el reloj sigue donde iba.
export const SESSION_GAP_MS = 30 * 60 * 1000;
const NIGHT_AT = 0.5;              // a partir de aquí es de noche (música, pájaros, estrellas)
// Hora «de reloj» de cada fase, para quien la quiera en horas (amanecer de 6 a 8, día hasta las 18, atardecer
// hasta las 20 y noche hasta las 6).
const PHASE_HOURS = [['dawn', 6, 8], ['day', 8, 18], ['dusk', 18, 20], ['night', 20, 30]];
const HOURS_PER_DAY = 24;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (v) => { const t = clamp01(v); return t * t * (3 - 2 * t); };
const round2 = (v) => Math.round(v * 100) / 100;

// Minuto dentro del día de juego (0 ≤ m < GAME_DAY_MIN), venga de donde venga.
export const dayMinute = (min) => { const m = Number(min) % GAME_DAY_MIN; return m < 0 ? m + GAME_DAY_MIN : m; };

// Fase y avance dentro de ella (0 a 1) para un minuto del día de juego.
export function gamePhase(min) {
  let t = dayMinute(min);
  for (const [name, len] of Object.entries(GAME_PHASES_MIN)) {
    if (t < len) return { name, t: t / len };
    t -= len;
  }
  return { name: 'night', t: 1 };
}

// { night, dusk } para un minuto del día de juego: la noche se va al amanecer y llega al atardecer con una curva
// suave; el arrebol sube y baja en cada uno.
export function gameLight(min) {
  const { name, t } = gamePhase(min);
  const glow = smooth(1 - Math.abs(t - 0.5) * 2);
  if (name === 'dawn') return { night: round2(1 - smooth(t)), dusk: round2(glow) };
  if (name === 'dusk') return { night: round2(smooth(t)), dusk: round2(glow) };
  return { night: name === 'night' ? 1 : 0, dusk: 0 };
}

export const isNight = (min) => gameLight(min).night >= NIGHT_AT;

// Minuto del día de juego que corresponde a una hora del reloj (0 a 24): la inversa de gameHour.
export function minuteAtHour(hour) {
  const h = ((Number(hour) % HOURS_PER_DAY) + HOURS_PER_DAY) % HOURS_PER_DAY;
  let start = 0;
  for (const [name, from, to] of PHASE_HOURS) {
    const len = GAME_PHASES_MIN[name];
    const hh = h < from ? h + HOURS_PER_DAY : h;
    if (hh >= from && hh < to) return start + ((hh - from) / (to - from)) * len;
    start += len;
  }
  return 0;
}

// Dónde arranca el reloj al abrir la app: lo guardado ({ min, at }) si es de hace poco; si no, la hora del móvil.
export function resumeMinute(saved, now) {
  const fresh = saved && Number.isFinite(saved.min) && Number.isFinite(saved.at) && now.getTime() - saved.at >= 0 && now.getTime() - saved.at < SESSION_GAP_MS;
  if (fresh) return dayMinute(saved.min);
  return minuteAtHour(now.getHours() + now.getMinutes() / 60);
}

// Hora del reloj del juego (0 a 24, con decimales), por si algo la quiere en horas.
export function gameHour(min) {
  const { name, t } = gamePhase(min);
  const [, from, to] = PHASE_HOURS.find(([n]) => n === name);
  return (from + (to - from) * t) % HOURS_PER_DAY;
}
