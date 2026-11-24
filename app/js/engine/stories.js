// Historias de inicio de nivel: formato (contenido/historias/README.md), encuadre del detalle y avance entre
// tarjetas. Puro: no toca el DOM ni la red.

export const MAX_CARDS = 3;
export const MAX_TEXT = 180;
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 3;

// Cuánto dura una tarjeta si avanza sola (como las historias de Instagram): lo que se tarda en leerla.
export const CARD_BASE_MS = 4500;
export const CARD_MS_PER_CHAR = 35;
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

// Posición siguiente al pasar de tarjeta: { pos } o { end: true } al pasar de la última; atrás se queda en la primera.
export function step(pos, count, delta) {
  const next = pos + delta;
  if (next >= count) return { end: true, pos };
  return { pos: Math.max(0, next) };
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
