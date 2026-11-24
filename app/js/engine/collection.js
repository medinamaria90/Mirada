// Colección agrupada por pintor: franjas con «n de m» y las 3 últimas obras desbloqueadas, por movimiento en
// orden cronológico (o lo más reciente primero) y los invitados juntos en una sola franja. Puro.

export const STRIP_THUMBS = 3;
export const SEARCH_MIN_PAINTERS = 15; // el buscador sale con tantos pintores con alguna obra desbloqueada

const isGuest = (artist) => artist.category === 'invitado';
const byDayDesc = (owned) => (a, b) => (owned[a.id] < owned[b.id] ? 1 : owned[a.id] > owned[b.id] ? -1 : 0);

// Obras desbloqueadas de un pintor, las más recientes primero (el día de la colección y, a igualdad, las últimas del catálogo).
function unlockedOf(index, owned, artistId) {
  return index.worksOf(artistId)
    .map((w, i) => ({ w, i }))
    .filter(({ w }) => owned[w.id])
    .sort((a, b) => byDayDesc(owned)(a.w, b.w) || b.i - a.i)
    .map(({ w }) => w);
}

const latest = (owned, works) => works.reduce((m, w) => (owned[w.id] > m ? owned[w.id] : m), '');

function strip(kind, id, name, movement, works, total, artist = null) {
  return { kind, id, name, artist, movement, works, shown: works.slice(0, STRIP_THUMBS), count: works.length, total, latest: '' };
}

// Franjas: [{ kind: 'artist' | 'guests', id, name, artist, movement, works (todas las desbloqueadas, recientes primero),
// shown (las 3 que se ven), count, total, latest }]
export function collectionStrips(progress, index, { recent = false, movementId = null } = {}) {
  const owned = progress.collection || {};
  const own = [];
  const guests = [];
  for (const m of index.movements) {
    const artists = index.artistsOf(m.id).slice().sort((a, b) => (a.born || 0) - (b.born || 0) || a.order - b.order);
    const guestWorks = [];
    let guestTotal = 0;
    for (const artist of artists) {
      const works = unlockedOf(index, owned, artist.id);
      if (isGuest(artist)) { guestTotal += index.worksOf(artist.id).length; guestWorks.push(...works); continue; }
      if (works.length) own.push(strip('artist', artist.id, artist.name, m, works, index.worksOf(artist.id).length, artist));
    }
    if (guestWorks.length) guests.push(strip('guests', `invitados-${m.id}`, 'Invitados', m, guestWorks.sort(byDayDesc(owned)), guestTotal));
  }
  for (const s of [...own, ...guests]) s.latest = latest(owned, s.works);
  const keep = (s) => !movementId || s.movement.id === movementId;
  if (recent) {
    const byRecent = (a, b) => (a.latest < b.latest ? 1 : a.latest > b.latest ? -1 : 0);
    return [...own.filter(keep).sort(byRecent), ...guests.filter(keep).sort(byRecent)];
  }
  // Cronológico: cada movimiento con sus pintores y, al final de él, la franja de invitados.
  return index.movements.flatMap((m) => [...own.filter((s) => s.movement.id === m.id), ...guests.filter((s) => s.movement.id === m.id)]).filter(keep);
}

// Pintores con alguna obra desbloqueada (cada invitado cuenta).
export function unlockedPainterCount(progress, index) {
  const owned = progress.collection || {};
  return index.artists.filter((a) => index.worksOf(a.id).some((w) => owned[w.id])).length;
}

// Movimientos con obras desbloqueadas, en orden: los chips de filtro.
export function unlockedMovements(progress, index) {
  const owned = progress.collection || {};
  return index.movements.filter((m) => index.artistsOf(m.id).some((a) => index.worksOf(a.id).some((w) => owned[w.id])));
}

// Lo que puede sugerir el buscador: pintores y obras ya desbloqueados.
export function suggestPool(progress, index) {
  const owned = progress.collection || {};
  const artists = [];
  const works = [];
  for (const a of index.artists) {
    const mine = unlockedOf(index, owned, a.id);
    if (!mine.length) continue;
    artists.push({ id: a.id, name: a.name, thumbId: mine[0].id });
    for (const w of mine) works.push({ id: w.id, title: w.title, artistId: a.id });
  }
  return { artists, works };
}
