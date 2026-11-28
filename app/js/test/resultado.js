// Test de cultura pictórica: del resumen al resultado (nivel, percentil, frase, texto para
// compartir). Puro: sin DOM.

import { LEVELS, levelFor } from '../engine/progress.js';
import { TIERS } from './motor.js';

// Percentil estimado («Sabes más de pintura que el X % de la gente»). Calibración en
// docs/eval/reconocimiento-fuentes.md (encuestas de reconocimiento: YouGov/Channel 5 2020, Cotter et
// al. 2023, Encuesta de Hábitos y Prácticas Culturales 2024-25; sin encuesta española de
// reconocimiento, así que es una ESTIMACIÓN y la interfaz lo dice). Población general que se para en
// cada tramo: T1 12 % · T2 35 % · T3 28 % · T4 13 % · T5 12 %. Bandas por puntuación acumulada
// (acierto = puntos de su tramo, 1-5), reescaladas al máximo honesto de 80 puntos (el jugador
// perfecto sube de tramo con cada bloque y apura el friki: 4·(1+2+3+4+5) + 4·5; los cortes del
// documento, pensados para 120, se multiplican por 80/120 y se redondean): [desde, hasta,
// percentil desde, percentil hasta], interpolando dentro de cada banda; monótono; entero entre 1 y 99.
export const PERCENTILE_BANDS = [
  [0, 2, 1, 12],
  [3, 9, 13, 47],
  [10, 22, 48, 75],
  [23, 33, 76, 88],
  [34, 46, 89, 92],
  [47, 63, 93, 96],
  [64, 80, 97, 99],
];
export const PERCENTILE_MIN = 1;
export const PERCENTILE_MAX = 99;
export const PERCENTILE_SOURCES = 'Cálculo aproximado con encuestas sobre cuadros famosos';

export function percentileFor(score) {
  const last = PERCENTILE_BANDS[PERCENTILE_BANDS.length - 1];
  const s = Math.min(last[1], Math.max(0, Number(score) || 0));
  const band = PERCENTILE_BANDS.find(([lo, hi]) => s >= lo && s <= hi) || last;
  const [lo, hi, p0, p1] = band;
  const value = hi > lo ? p0 + ((s - lo) / (hi - lo)) * (p1 - p0) : p0;
  return Math.min(PERCENTILE_MAX, Math.max(PERCENTILE_MIN, Math.round(value)));
}

// Nivel del test: nombres propios, de la primera visita a un museo al ojo clínico, que no chocan con los
// rangos de la app (engine/ranks.js).
// La puntuación se proyecta sobre la escala de XP del motor (0 → máximo honesto) y se reparte en
// tantos niveles como nombres hay; manda la frase del percentil, el nombre es solo una etiqueta.
export const TEST_LEVELS = ['Primera visita al museo', 'De paseo por las salas', 'Sabes lo que miras', 'Como en casa en el Prado', 'Ojo de galerista', 'Ojo clínico'];
// Nombres de antes (resultados guardados): se leen como el nivel nuevo de la misma posición.
export const OLD_TEST_LEVELS = ['Mirada de principiante', 'Mirada curiosa', 'Mirada atenta', 'Mirada entrenada', 'Mirada fina', 'Mirada experta'];
export function testLevelName(name) {
  if (TEST_LEVELS.includes(name)) return name;
  const old = OLD_TEST_LEVELS.indexOf(name);
  return old >= 0 ? TEST_LEVELS[old] : '';
}

export function levelForScore(score, maxScore) {
  const top = LEVELS[LEVELS.length - 1].min;
  const xp = maxScore > 0 ? Math.round((Math.max(0, score) / maxScore) * top) : 0;
  const step = levelFor(Math.min(xp, top)).index;
  const index = Math.min(TEST_LEVELS.length - 1, Math.floor((step * TEST_LEVELS.length) / LEVELS.length));
  return { index, name: TEST_LEVELS[index] };
}

// Una frase según el tramo más alto jugado.
const PHRASES = {
  1: 'Todos empezamos por algún sitio. Lo bueno viene ahora: cada cuadro esconde una historia',
  2: 'Te sabes los cuadros famosos. Falta lo mejor: los pintores que no salen en las postales',
  3: 'Distingues a los grandes; los que se parecen todavía te la juegan',
  4: 'Separas pintores que casi todo el mundo confunde. Te queda un escalón',
  5: 'Aquí dudan hasta los especialistas, y muy poca gente llega',
};
export function phraseFor(summary) {
  return PHRASES[summary.top.id] || PHRASES[1];
}

// Un cuadrado por tramo: verde si se acertó al menos la mitad, amarillo si se jugó con menos,
// blanco si no se llegó.
export const GRID_OK = '🟩';
export const GRID_HALF = '🟨';
export const GRID_OFF = '⬜';
export function gridFor(summary) {
  return TIERS.map((t) => {
    const r = summary.tiers.find((x) => x.id === t.id);
    if (!r) return GRID_OFF;
    return r.correct * 2 >= r.asked ? GRID_OK : GRID_HALF;
  }).join('');
}

// Resultado completo a partir del resumen del motor.
export function buildResult(summary, maxScore) {
  const level = levelForScore(summary.score, maxScore);
  return {
    ...summary,
    maxScore,
    level: level.name,
    percentile: percentileFor(summary.score),
    phrase: phraseFor(summary),
    grid: gridFor(summary),
  };
}

// Texto para compartir (el mismo en el test y en el perfil): un reto corto y el enlace al test, que se abre directo
// (app/test/, con su vista previa). Sin percentil (resultados antiguos) o con uno bajo, que nadie presume de «más
// que el 15 %», los aciertos.
export const SHARE_PCT_MIN = 40;
export function shareText(result, url) {
  const what = result.percentile != null && result.percentile >= SHARE_PCT_MIN ? `Sé más de pintura que el ${result.percentile} % de la gente` : `He acertado ${result.correct} de ${result.asked} en el test de pintura`;
  return [`Sfumato · ${what}. ¿Y tú?`, url].filter(Boolean).join('\n');
}
