// Contador de visitas sin cookies (GoatCounter) y eventos de retorno. Se importa en diferido, ya en
// reposo tras pintar (como el audio), así que no cuenta en el arranque. Con GOATCOUNTER_CODE vacío
// (stats-config.js) no carga nada ni pide nada. No se envía ningún dato personal: ni ids, ni
// cuadros, ni respuestas; solo nombres de evento fijos (vuelve/dia-3, ronda/termina, racha/2-3…).
// Lo único que se guarda en el navegador es `mirada.stats` (días de visita y último envío de cada
// evento diario).

import { GOATCOUNTER_CODE } from './stats-config.js';

export const STATS_KEY = 'mirada.stats';
export const SCRIPT_URL = 'https://gc.zgo.at/count.js';
const KEEP_DAYS = 14;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

const isDay = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

// ¿Se puede contar en este entorno? Código válido, sin «no rastrear» ni control global de
// privacidad, y fuera de localhost.
export function canCount({ code, doNotTrack, globalPrivacyControl, hostname } = {}) {
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(String(code || ''))) return false;
  if (doNotTrack === '1' || doNotTrack === 'yes' || globalPrivacyControl === true) return false;
  return !LOCAL_HOSTS.has(String(hostname || '').toLowerCase());
}

// Días distintos con actividad hasta hoy: los de visita guardados + los de racha y de XP del estado
// de juego (lectura defensiva) + hoy.
export function activityDays(state, stats, today) {
  const days = new Set([today]);
  for (const d of Array.isArray(stats?.days) ? stats.days : []) if (isDay(d) && d <= today) days.add(d);
  const progress = state?.progress || {};
  for (const d of Array.isArray(progress.streak?.days) ? progress.streak.days : []) if (isDay(d) && d <= today) days.add(d);
  for (const [d, xp] of Object.entries(progress.xpByDay || {})) if (isDay(d) && d <= today && Number(xp) > 0) days.add(d);
  return [...days].sort();
}

export function returnEvent(daysCount) {
  if (daysCount <= 1) return 'vuelve/dia-1';
  if (daysCount === 2) return 'vuelve/dia-2';
  if (daysCount === 3) return 'vuelve/dia-3';
  if (daysCount < 7) return 'vuelve/dia-4-a-6';
  return 'vuelve/dia-7-o-mas';
}

export function streakBucket(n) {
  const v = Math.floor(Number(n) || 0);
  if (v <= 1) return '1';
  if (v <= 3) return '2-3';
  if (v <= 7) return '4-7';
  return '8+';
}

function readStats(storage) {
  try {
    const v = JSON.parse(storage?.getItem(STATS_KEY));
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return { days: Array.isArray(v.days) ? v.days.filter(isDay) : [], sent: v.sent && typeof v.sent === 'object' ? v.sent : {} };
    }
  } catch { /* sin datos o corrupto */ }
  return { days: [], sent: {} };
}

function writeStats(storage, stats) {
  try { storage?.setItem(STATS_KEY, JSON.stringify(stats)); } catch { /* sin almacenamiento */ }
}

// Contador con todo inyectado (para probarlo sin navegador). `win` aporta navigator, location,
// document y goatcounter; `today` es una función que da el día local 'AAAA-MM-DD'.
export function createStats({ code, win, storage, today }) {
  const nav = win?.navigator || {};
  const enabled = canCount({
    code,
    doNotTrack: nav.doNotTrack,
    globalPrivacyControl: nav.globalPrivacyControl,
    hostname: win?.location?.hostname,
  });
  const queue = [];
  let loaded = false;
  let started = false;

  function flush() {
    const gc = win.goatcounter;
    if (!gc || typeof gc.count !== 'function') return;
    loaded = true;
    while (queue.length) gc.count({ path: queue.shift(), event: true });
  }

  // Carga el script oficial (async, sin cookies). Idempotente.
  function load() {
    if (!enabled || started) return;
    started = true;
    const s = win.document.createElement('script');
    s.async = true;
    s.src = SCRIPT_URL;
    s.setAttribute('data-goatcounter', `https://${code}.goatcounter.com/count`);
    s.addEventListener('load', flush);
    win.document.head.appendChild(s);
  }

  // Un evento: se envía ya si el script está cargado y, si no, se encola.
  function countEvent(path) {
    if (!enabled || typeof path !== 'string' || !path) return false;
    queue.push(path);
    if (loaded || win.goatcounter?.count) flush();
    return true;
  }

  // Como mucho una vez al día por clave.
  function countDaily(key, path) {
    if (!enabled) return false;
    const day = today();
    const stats = readStats(storage);
    if (stats.sent[key] === day) return false;
    stats.sent[key] = day;
    writeStats(storage, stats);
    return countEvent(path);
  }

  // Al abrir la app: registra el día y envía vuelve/dia-n (n = días distintos con actividad).
  function countReturn(state) {
    if (!enabled) return false;
    const day = today();
    const stats = readStats(storage);
    const days = activityDays(state, stats, day);
    stats.days = days.slice(-KEEP_DAYS);
    writeStats(storage, stats);
    return countDaily('vuelve', returnEvent(days.length));
  }

  // Escucha el estado de juego: al terminar una ronda (contador de rondas) envía ronda/termina y,
  // si hoy cuenta para la racha, racha/<tramo> (una vez al día). Al acabar el Cuadro del día, cuadro/termina (sin saber cuál
  // ni si acertó).
  function watchStore(store) {
    if (!enabled || !store?.subscribe) return () => {};
    const rounds = (s) => Number(s?.progress?.stats?.rounds) || 0;
    const cuadros = (s) => Object.keys(s?.progress?.cuadros || {}).length;
    let before = rounds(store.get());
    let cuadrosBefore = cuadros(store.get());
    return store.subscribe((s) => {
      const played = cuadros(s);
      if (played > cuadrosBefore) countEvent('cuadro/termina');
      cuadrosBefore = played;
      const now = rounds(s);
      if (now <= before) { before = now; return; }
      before = now;
      countEvent('ronda/termina');
      const streak = s.progress?.streak;
      if (streak?.last === today()) countDaily('racha', `racha/${streakBucket(streak.current)}`);
    });
  }

  return { enabled, load, countEvent, countDaily, countReturn, watchStore };
}

// Instancia de la página: solo existe si el navegador la ofrece (no en las pruebas sin navegador).
let shared = null;
function instance() {
  if (!shared && typeof window !== 'undefined') {
    let storage = null;
    try { storage = window.localStorage; } catch { /* bloqueado */ }
    shared = createStats({
      code: GOATCOUNTER_CODE,
      win: window,
      storage,
      today: () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      },
    });
  }
  return shared;
}

export function startStats({ store } = {}) {
  const s = instance();
  if (!s || !s.enabled) return;
  s.load();
  if (store) {
    s.countReturn(store.get());
    s.watchStore(store);
  }
}

export function countEvent(path) {
  const s = instance();
  if (!s || !s.enabled) return;
  s.load();
  s.countEvent(path);
}
