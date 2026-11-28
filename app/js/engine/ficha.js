// Ficha del pintor: el detalle de cuadro que enseña cada rasgo de «Cómo reconocerlo» y los pintores de «No lo confundas
// con». Solo con obras y pintores ya vistos (sin spoilers). Puro.

import { tagsOf, traitTagsOf, skipsTrait, scopeFits } from './feedback.js';
import { coverWork, avatarCrop, painterState } from './painters.js';

// Cuánto se aleja del punto de interés de la portada el recorte de cada rasgo sin cuadro propio (en % de la imagen), para
// que tres rasgos no repitan el mismo recorte; y los bordes que no se pasan (un recorte pegado al marco enseña el marco).
const SPREAD = [[0, 0], [-18, 16], [18, -12], [-14, -16], [16, 18], [0, 22]];
const EDGE = [15, 85];
const clamp = (v) => Math.min(EDGE[1], Math.max(EDGE[0], v));
const byFame = (a, b) => (b.fame || 0) - (a.fame || 0) || (a.yearSort || 0) - (b.yearSort || 0);

// Rasgos con su detalle: [{ text, work, x, y }]. Para cada rasgo, el cuadro visto más famoso cuyas etiquetas lo enseñan
// seguro (las del rasgo, todas en el cuadro) y que no se haya usado ya; si no hay ninguno, la portada recortada en otro
// punto (y solo si no queda otro cuadro por usar). Sin rasgos, la pista. Sin obras vistas, rasgos sin detalle (work null).
export function traitDetails(artist, seen) {
  const raw = Array.isArray(artist?.traits) ? artist.traits : [];
  const tags = traitTagsOf(artist, 1 + raw.length);
  // pos: lugar de la frase en [pista, ...rasgos] (para no ilustrarla con una obra donde no se ve).
  const rows = raw.map((text, i) => ({ text, tags: tags[i + 1], pos: i + 1 })).filter((r) => typeof r.text === 'string' && r.text.trim());
  if (!rows.length && typeof artist?.hint === 'string' && artist.hint.trim()) rows.push({ text: artist.hint, tags: tags[0], pos: 0 });
  const cover = coverWork(seen);
  const used = new Set();
  let spread = 0;
  return rows.map(({ text, tags: want, pos }) => {
    const tagged = (w) => Boolean(want && want.length && want.every((t) => tagsOf(w).has(t)));
    const free = (w) => !used.has(w.id) && !skipsTrait(w, pos) && scopeFits(artist, w, pos, tagged(w));
    const shows = want && want.length ? seen.filter((w) => free(w) && tagged(w)).sort(byFame)[0] : null;
    if (shows) {
      used.add(shows.id);
      return { text, work: shows, ...avatarCrop(shows) };
    }
    if (!cover) return { text, work: null, x: 50, y: 50 };
    // Sin cuadro que lo enseñe seguro: otro cuadro visto aún no usado en la ficha (que dos rasgos no repitan obra);
    // solo si ya están todos usados, la portada recortada en otro punto.
    const other = seen.filter(free).sort(byFame)[0];
    if (other) {
      used.add(other.id);
      return { text, work: other, ...avatarCrop(other) };
    }
    const c = avatarCrop(cover);
    const [dx, dy] = SPREAD[spread++ % SPREAD.length];
    return { text, work: cover, x: clamp(c.x + dx), y: clamp(c.y + dy) };
  });
}

// «No lo confundas con»: los pintores de `similarTo` que ya conoce (algo visto o dominado); los que no, ni se nombran.
export function lookAlikes(progress, index, artist) {
  const ids = Array.isArray(artist?.similarTo) ? artist.similarTo : [];
  return ids.filter((id) => id !== artist.id && index.artist(id) && painterState(progress, index, id) !== 'new');
}
