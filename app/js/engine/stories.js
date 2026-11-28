// Historias de inicio de nivel: formato (contenido/historias/README.md), encuadre del detalle y avance entre
// tarjetas. Puro: no toca el DOM ni la red.

import { isSelfPortrait } from './painters.js';
import { ratioOf, coverLoss, coverBox, focusOf, LOSS_OK, LOSS_FOCUSED, STORY_RATIO } from './framing.js';

export const MAX_CARDS = 5;
export const MAX_TEXT = 180;
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 3;

export const storyKey = (artistId, level) => `${artistId}:${level}`;

// Historias que se comparten con un enlace: las del nivel 1 (presentan al pintor y no destripan nada de lo que viene).
export const SHARE_LEVEL = 1;
export const isShareable = (level) => level === SHARE_LEVEL;

// La pista «Fíjate en…» del pintor para la última tarjeta, salvo que alguna tarjeta ya invite a fijarse en algo ('' entonces).
const LOOK_CUE = /f[ií]jate/i;
export function lookLine(cards, hint) {
  const text = String(hint || '').trim();
  if (!text || (cards || []).some((c) => LOOK_CUE.test(String(c?.text || '')))) return '';
  return text;
}

const validCard = (c) => c && typeof c.text === 'string' && c.text.length > 0 && c.text.length <= MAX_TEXT && typeof c.artwork === 'string';

// Obras vistas que pueden abrir la primera tarjeta en su lugar: ninguna de las que salen en las tarjetas siguientes
// (si no, la historia enseñaría dos veces el mismo cuadro).
export function openingCandidates(seen, cards) {
  const later = new Set((cards || []).slice(1).map((c) => c.artwork));
  return (seen || []).filter((w) => !later.has(w.id));
}

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

// Cómo se enseña una obra en una tarjeta (engine/framing.js): 'crop' (a sangre) solo si se pierde poco del cuadro o, con un
// punto de foco (el de la tarjeta, [x, y, zoom], o el revisado de la obra), hasta LOSS_FOCUSED, con ese punto llevado a
// STORY_TARGET, por encima del texto. Si no, 'fit': entera sobre un fondo desenfocado de la propia obra (y con `whole`, siempre
// entera). `frame` es la proporción del marco (ancho / alto). { mode, box? } con la caja de la imagen en % del marco.
export const STORY_TARGET = [0.5, 0.4];
const COVER_POINT = [0.5, 0.4]; // sin foco, un poco por encima de la mitad, donde suelen estar las caras
export function frameFor(work, focus, frame = STORY_RATIO, region = null) {
  const part = regionOf(region);
  if (part) return regionFrame(work, part, focus, frame);
  const ratio = ratioOf(work);
  const card = cropOf(focus);
  const point = card.whole ? focusOf(work) : [card.x / 100, card.y / 100];
  const zoom = card.whole ? 1 : card.zoom;
  const loss = 1 - (1 - coverLoss(ratio, frame)) / zoom;
  const limit = point ? LOSS_FOCUSED : LOSS_OK;
  if ((work?.whole && card.whole) || loss > limit) return { mode: 'fit' };
  return { mode: 'crop', box: coverBox(ratio, frame, point || COVER_POINT, zoom, STORY_TARGET) };
}

// Detalle intencionado de una tarjeta (`region`): [x0, y0, x1, y1], el rectángulo de la obra que se enseña (de 0 a 1), por
// ejemplo un panel de un tríptico. Es una decisión mirando la imagen: siempre a sangre, con la región como si fuera la obra.
// La proporción la vigilan tools/sync_historias.py y su prueba (que no pierda más de LOSS_FOCUSED). null si no es válida.
export const REGION_MIN = 0.05;
export function regionOf(region) {
  if (!Array.isArray(region) || region.length !== 4) return null;
  const [x0, y0, x1, y1] = region.map(Number);
  const inside = [x0, y0, x1, y1].every((v) => Number.isFinite(v) && v >= 0 && v <= 1);
  return inside && x1 - x0 >= REGION_MIN && y1 - y0 >= REGION_MIN ? { x0, y0, x1, y1 } : null;
}

// Proporción (ancho / alto) de la región dentro de la obra.
export const regionRatio = (work, { x0, y0, x1, y1 }) => (ratioOf(work) * (x1 - x0)) / (y1 - y0);

// La región a sangre: se encuadra como una obra suelta (con su punto [x, y] de la tarjeta, relativo a la región, o el centro)
// y la caja se pasa a la imagen entera, que se sale del marco por los lados (lo recorta .story-art).
function regionFrame(work, part, focus, frame) {
  const card = cropOf(focus);
  const point = card.whole ? [0.5, 0.5] : [card.x / 100, card.y / 100];
  const b = coverBox(regionRatio(work, part), frame, point, card.whole ? 1 : card.zoom, STORY_TARGET);
  const w = b.width / (part.x1 - part.x0);
  const h = b.height / (part.y1 - part.y0);
  const r1 = (v) => Math.round(v * 10) / 10;
  return { mode: 'crop', box: { left: r1(b.left - part.x0 * w), top: r1(b.top - part.y0 * h), width: r1(w), height: r1(h) } };
}

// Imagen de una tarjeta: la HD de la obra (`hd`, catálogo; paso «hd» del proceso) si la tarjeta enseña un trozo, una `region` o
// un `focus` con zoom de HD_ZOOM_MIN o más, porque la de 1200 px se vería borrosa; si no, la normal (pesa menos). Mismo criterio
// que tools/nitidez.py.
export const HD_ZOOM_MIN = 1.5;
export function storySrc(work, focus = null, region = null) {
  const crop = cropOf(focus);
  const detail = Boolean(regionOf(region)) || (!crop.whole && crop.zoom >= HD_ZOOM_MIN);
  return detail && work?.hd?.img ? work.hd.img : work?.img;
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

// «es.wikipedia.org» → «Wikipedia»; el resto, el nombre del sitio.
export function sourceLabel(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (/wikipedia\.org$/.test(host)) return 'Wikipedia';
    if (/wikidata\.org$/.test(host)) return 'Wikidata';
    return host;
  } catch { return ''; }
}
