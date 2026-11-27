// «Fuentes y créditos»: reúne de los datos las fuentes de los textos (épocas, pintores, obras) y el crédito de cada imagen
// (su archivo de Wikimedia Commons y la licencia). Las fuentes se guardan en los datos y solo se enseñan aquí, nunca en las
// tarjetas. Puro: no toca el DOM ni la red.

import { sourceLabel } from './stories.js';
import { wikidataUrl } from './painters.js';

const MAX_TITLE = 72;
const COMMONS_FILE = 'https://commons.wikimedia.org/wiki/File:';
// Extensiones de página que sobran en el título de una fuente.
const PAGE_EXT = /\.(html?|php|aspx?)$/i;
// Licencias de Commons dichas en castellano (el resto, con su nombre: «CC BY-SA 4.0»).
const LICENSE_NAMES = { 'Public domain': 'Dominio público', 'PDM-owner': 'Dominio público' };
export const licenseName = (license) => LICENSE_NAMES[license] || String(license || '').trim() || 'Sin licencia anotada';

const cut = (s) => (s.length > MAX_TITLE ? `${s.slice(0, MAX_TITLE - 1).trimEnd()}…` : s);

function lastSegment(path) {
  const seg = path.split('/').filter(Boolean).pop() || '';
  let text = seg;
  try { text = decodeURIComponent(seg); } catch { text = seg; } // un «%» suelto: el segmento tal cual
  return text.replace(PAGE_EXT, '').replace(/[_+-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// Título legible de una fuente: «Wikipedia · Sandro Botticelli», «britannica.com · Baroque». Si el final de la dirección no
// dice nada (un número, nada), solo el sitio. Un texto que no es una dirección («Wikipedia ES, «La fragua»»), tal cual.
export function sourceTitle(source) {
  const text = String(source || '').trim();
  const site = sourceLabel(text);
  if (!site) return cut(text);
  const seg = lastSegment(new URL(text).pathname);
  return cut(/\p{L}{2}/u.test(seg) ? `${site} · ${seg}` : site);
}

// Fuentes sin repetir (sin el ancla de la sección) y en el orden en que salen: [{ url, title }]; url '' si no es una dirección.
export function uniqueSources(list) {
  const seen = new Map();
  for (const raw of list || []) {
    const text = String(raw || '').trim();
    if (!text) continue;
    const url = sourceLabel(text) ? text.split('#')[0] : '';
    const key = url || text;
    if (!seen.has(key)) seen.set(key, { url, title: sourceTitle(url || text) });
  }
  return [...seen.values()];
}

// Fuentes de una época: las de sus tarjetas (data/epocas/<movimiento>.json).
export const eraSources = (cards) => uniqueSources((cards || []).map((c) => c && c.source));

// Fuentes de los carteles del mapa (ramas y tramos): { clave: cartel } de cada tipo.
export const signSources = (...maps) => uniqueSources(maps.flatMap((m) => Object.values(m || {}).map((sign) => sign && sign.source)));

// Fuentes de los textos de un pintor: «por qué importa», fechas y país (Wikidata), sus historias y lo que se cuenta de sus cuadros.
export function artistSources(artist, works, story) {
  const cards = (story?.levels || []).flatMap((l) => l.cards || []);
  const fromWorks = (works || []).flatMap((w) => [w.curio?.source, w.about?.source, ...(w.looks || []).map((l) => l.source)]);
  return uniqueSources([artist?.why?.source, wikidataUrl(artist || {}), ...cards.map((c) => c && c.source), ...fromWorks]);
}

export const commonsUrl = (file) => (file ? `${COMMONS_FILE}${encodeURIComponent(String(file).replace(/ /g, '_'))}` : '');

// Crédito de cada imagen con su archivo de Commons, por orden cronológico: [{ id, title, year, url, license }].
export function imageCredits(works) {
  return (works || [])
    .filter((w) => w.source?.file)
    .slice()
    .sort((a, b) => (a.yearSort || 0) - (b.yearSort || 0))
    .map((w) => ({ id: w.id, title: w.title, year: w.year || '', url: commonsUrl(w.source.file), license: licenseName(w.source.license) }));
}

// Cuántas imágenes hay con cada licencia, de más a menos: [{ license, count }].
export function licenseSummary(works) {
  const counts = new Map();
  for (const w of works || []) {
    if (!w.source?.file) continue;
    const name = licenseName(w.source.license);
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts].map(([license, count]) => ({ license, count })).sort((a, b) => b.count - a.count || a.license.localeCompare(b.license, 'es'));
}
