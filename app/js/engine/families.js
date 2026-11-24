// Familias visuales: qué obras y pintores pueden salir juntos como opciones de una pregunta.
// Los datos (familias, topes, cortes) viven en catalogo/familias.json y llegan en catalog.json
// (`families`, `family` de movimientos y pintores). Puro: sin DOM. Sin `families`, todo vale.

// Años de margen con los que se relaja el tope si una familia no tiene relleno suficiente.
export const RELAX_STEPS = [1, 1.5, 2.5];
export const RELAX_MAX = RELAX_STEPS.at(-1);
// Distancia máxima, en posiciones de la línea del tiempo, entre el movimiento bueno y los de relleno.
export const MOVEMENT_HARD_GAP = 4;

// Intentos para que la buena no sea «la rara» de las cuatro.
export const ODD_TRIES = 16;
const FAMILY_GAP = 1000;

// ¿Es la opción `good` la más distinta de las otras (por familia y, después, por años)? Cuenta los empates.
// Si las falsas se agrupan en un lado del tiempo, la buena queda en el extremo y se delata sola.
export function isOddOne(refs, good = 0) {
  if (refs.some((r) => !r)) return false;
  const total = refs.map((a) => refs.reduce((n, b) => n + (a.family === b.family ? 0 : FAMILY_GAP) + Math.abs(a.year - b.year), 0));
  return total[good] >= Math.max(...total);
}

const median = (list) => {
  const v = list.slice().sort((a, b) => a - b);
  return v.length ? v[Math.floor((v.length - 1) / 2)] : 0;
};

export function buildFamilies(catalog, artistById, worksByArtist) {
  const data = catalog.families;
  if (!data || !Array.isArray(data.list)) return null;
  const byId = new Map(data.list.map((f) => [f.id, f]));
  const cutoff = Number.isFinite(data.cutoff) ? data.cutoff : 1800;
  const fam = (id) => byId.get(id) || null;
  const artistYear = new Map();
  const yearOfArtist = (a) => {
    if (!artistYear.has(a.id)) artistYear.set(a.id, median((worksByArtist.get(a.id) || []).map((w) => w.yearSort).filter(Number.isFinite)) || (a.born || 0) + 35);
    return artistYear.get(a.id);
  };
  // Familia de una obra: la del pintor, salvo los que cambian de familia en una fecha (Kandinsky).
  const familyOfWork = (a, w) => (a.familyFrom && w.yearSort >= a.familyFrom.year ? a.familyFrom.family : a.family);
  // Como candidato, un pintor «partido» cuenta con su familia posterior (la más estricta).
  const refOfArtist = (a) => ({ family: a.familyFrom ? a.familyFrom.family : a.family, year: yearOfArtist(a), artistId: a.id });
  const refOfWork = (w) => {
    const a = artistById.get(w.artistId);
    return { family: familyOfWork(a, w), year: w.yearSort, artistId: a.id };
  };
  const old = (r) => r.year < cutoff;
  // 'strict' (misma familia), 'near' (familia cercana de relleno) o null (no pueden salir juntas).
  const relation = (target, other, relax = 1) => {
    const ft = fam(target.family);
    const fo = fam(other.family);
    if (!ft || !fo) return 'strict';
    if ((ft.moderna && old(other)) || (fo.moderna && old(target))) return null;
    let kind = null;
    if (ft.id === fo.id) kind = 'strict';
    else if ((ft.cercanas || []).includes(fo.id)) kind = 'near';
    if (!kind) return null;
    const caps = [ft.tope, kind === 'near' ? fo.tope : null].filter(Number.isFinite);
    if (caps.length && Math.abs(target.year - other.year) > Math.min(...caps) * relax) return null;
    return kind;
  };
  // ¿Puede salir el movimiento `m` como opción en una pregunta sobre la obra `ref`?
  const movementAllowed = (ref, m) => {
    const f = fam(ref.family);
    if (!f || !m.family) return true;
    if (m.family !== (f.familiaMovimiento || f.id)) return false;
    if (old(ref) && m.vanguardias) return false;
    return !(f.moderna && Number.isFinite(m.hasta) && m.hasta <= cutoff);
  };
  return { cutoff, family: fam, refOfArtist, refOfWork, relation, movementAllowed, yearOfArtist };
}
