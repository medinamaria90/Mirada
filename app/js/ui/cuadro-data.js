// Datos del Cuadro del día (data/dia/, los genera tools/sync_cuadro_dia.py): el calendario (index.json, pequeño: se pide tras
// el catálogo para pintar el detalle de hoy en la cabecera) y cada día (<n>.json: opciones, pistas e historia), al abrirlo.

import { dayNumber, entryFor } from '../engine/cuadro-calendar.js';

let indexPromise = null;
let calendar = null;
const days = new Map();

async function fetchJson(path) {
  const res = await fetch(new URL(`../../data/dia/${path}`, import.meta.url), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function ensureCuadroIndex() {
  indexPromise = indexPromise || fetchJson('index.json')
    .then((data) => {
      if (!data || !Array.isArray(data.days) || !data.days.length) throw new Error('calendario vacío');
      calendar = data;
      return data;
    })
    .catch((err) => { indexPromise = null; throw err; });
  return indexPromise;
}

// Hoy, si el calendario ya ha llegado: { n (número del día), slot (su posición en el calendario), artwork, focus }; si no, null.
export function cuadroToday(day) {
  if (!calendar) return null;
  const n = dayNumber(day, calendar.start);
  const e = entryFor(calendar.days, n);
  return e ? { n, slot: e.n, artwork: e.artwork, focus: e.focus } : null;
}

// Un día del calendario (por su posición), con caché.
export function loadCuadroDay(slot) {
  if (!days.has(slot)) days.set(slot, fetchJson(`${slot}.json`).catch((err) => { days.delete(slot); throw err; }));
  return days.get(slot);
}
