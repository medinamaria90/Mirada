// Historias de inicio de nivel (data/historias/): las copia `tools/sync_historias.py` desde contenido/historias/ y
// su índice dice qué pintores y niveles tienen, así no se pide ningún archivo que no exista.
// Cada historia se pide una sola vez por sesión (también si dos pantallas la piden a la vez) y lo que ya ha llegado se
// lee sin esperar (peekStory): la tarjeta del nodo del mapa se pinta al instante con ello (ui/level-card.js).

let indexPromise = null;
const stories = new Map();   // artistId → historia (o null si no tiene) ya llegada
const pending = new Map();   // artistId → promesa en vuelo

const DATA = new URL('../../data/historias/', import.meta.url);

async function getJson(name) {
  const res = await fetch(new URL(name, DATA), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Índice de historias, o null si no ha llegado (se reintenta la próxima vez).
function loadStoryIndex() {
  indexPromise = indexPromise || getJson('index.json').catch((err) => {
    console.info('Historias no disponibles:', err.message);
    indexPromise = null;
    return null;
  });
  return indexPromise;
}

async function fetchStory(artistId) {
  const index = await loadStoryIndex();
  if (!index) return null;
  if (!Array.isArray(index[artistId])) {
    stories.set(artistId, null);
    return null;
  }
  try {
    const story = await getJson(`${encodeURIComponent(artistId)}.json`);
    stories.set(artistId, story);
    return story;
  } catch (err) {
    // Un fallo (sin red, a medio desplegar) no se recuerda: se reintenta la próxima vez.
    console.info('Historia no disponible:', err.message);
    return null;
  }
}

// Historia completa de un pintor (todos sus niveles) o null si no tiene.
export function loadStory(artistId) {
  if (stories.has(artistId)) return Promise.resolve(stories.get(artistId));
  if (!pending.has(artistId)) pending.set(artistId, fetchStory(artistId).finally(() => pending.delete(artistId)));
  return pending.get(artistId);
}

// Lo ya llegado, sin esperar: la historia, null si no tiene, o undefined si aún no se sabe.
export function peekStory(artistId) {
  return stories.has(artistId) ? stories.get(artistId) : undefined;
}
