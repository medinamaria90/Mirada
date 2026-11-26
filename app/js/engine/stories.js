// Historias de inicio de nivel: formato (contenido/historias/README.md), encuadre del detalle y avance entre
// tarjetas. Puro: no toca el DOM ni la red.

import { isSelfPortrait } from './painters.js';

export const MAX_CARDS = 3;
export const MAX_TEXT = 180;
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 3;

// Cuánto dura una tarjeta si avanza sola (como las historias de Instagram): lo que se tarda en leerla.
export const CARD_BASE_MS = 3500;
export const CARD_MS_PER_CHAR = 28;
export const cardDuration = (card) => CARD_BASE_MS + CARD_MS_PER_CHAR * String(card?.text || '').length;

export const storyKey = (artistId, level) => `${artistId}:${level}`;

const validCard = (c) => c && typeof c.text === 'string' && c.text.length > 0 && c.text.length <= MAX_TEXT && typeof c.artwork === 'string';

// La historia de un nivel ({ title, stage?, cards }) o null si el pintor no la tiene. Se ignoran las tarjetas
// mal formadas y las que pasan de MAX_CARDS.
export function levelStory(story, level) {
  const lv = story?.levels?.find((l) => l.level === level);
  const cards = (lv?.cards || []).filter(validCard).slice(0, MAX_CARDS);
  return cards.length ? { title: lv.title || '', stage: lv.stage || '', cards } : null;
}

// Encuadre del detalle: [x, y, zoom] con el centro en proporciones de 0 a 1 y el zoom de 1 a 3. Sin `focus`,
// la obra entera (`whole`).
export function cropOf(focus) {
  if (!Array.isArray(focus) || focus.length < 2) return { whole: true, x: 50, y: 50, zoom: 1 };
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
  return { whole: false, x: Math.round(clamp(focus[0], 0, 1) * 100), y: Math.round(clamp(focus[1], 0, 1) * 100), zoom: clamp(focus[2] ?? 1.5, ZOOM_MIN, ZOOM_MAX) };
}

// Cómo se enseña una obra en una tarjeta: 'crop' (a sangre, centrada en su punto de interés) o 'fit' (entera sobre un fondo
// desenfocado de la propia obra). Las muy altas (un retrato de cuerpo entero) se enseñan enteras: un recorte corta la cabeza; las muy
// apaisadas solo se recortan si hay punto de interés (el de la tarjeta o el de la obra); si no, enteras. { mode, x, y, zoom }
export const TALL_RATIO = 0.65;
export const WIDE_RATIO = 1.6;
// Sin punto de interés, las de proporción vertical o casi cuadrada (hasta COVER_MAX) también van a sangre, centradas un poco por
// encima de la mitad (donde suelen estar las caras) y sin zoom: la historia llena la pantalla como en Instagram.
export const COVER_MAX = 1.15;
const COVER_CENTER = { x: 50, y: 40, zoom: 1 };
export function frameFor(work, focus) {
  const ratio = work && work.w && work.h ? work.w / work.h : 1;
  if (ratio < TALL_RATIO) return { mode: 'fit', ...cropOf(null) };
  const c = cropOf(focus || work?.focus);
  if (!c.whole) return { mode: 'crop', ...c };
  return ratio <= COVER_MAX ? { mode: 'crop', whole: false, ...COVER_CENTER } : { mode: 'fit', ...c };
}

// Posición siguiente al pasar de tarjeta: { pos } o { end: true } al pasar de la última; atrás se queda en la primera.
export function step(pos, count, delta) {
  const next = pos + delta;
  if (next >= count) return { end: true, pos };
  return { pos: Math.max(0, next) };
}

// Pie de la obra de una tarjeta: su título y, si es un autorretrato que no lo dice ya, «· autorretrato». Así nadie toma el
// retrato de otro por la cara del pintor.
export function captionOf(work) {
  if (!work?.title) return '';
  return isSelfPortrait(work) && !/autorretrato/i.test(work.title) ? `${work.title} · autorretrato` : work.title;
}

// Fuentes de una historia, juntas y sin repetir (sin el ancla de la sección): [{ url, label }].
export function storySources(cards) {
  const urls = [...new Set((cards || []).map((c) => String(c.source || '').split('#')[0]).filter(Boolean))];
  return urls.map((url) => ({ url, label: sourceLabel(url) })).filter((s) => s.label);
}

// «es.wikipedia.org» → «Wikipedia»; el resto, el nombre del sitio.
export function sourceLabel(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (/wikipedia\.org$/.test(host)) return 'Wikipedia';
    if (/wikidata\.org$/.test(host)) return 'Wikidata';
    return host;
  } catch { return ''; }
}
