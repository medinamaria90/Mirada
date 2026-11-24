// Historias de inicio de nivel (data/historias/): las copia `tools/sync_historias.py` desde contenido/historias/ y
// su índice dice qué pintores y niveles tienen, así no se pide ningún archivo que no exista.

let indexPromise = null;
const stories = new Map();

const DATA = new URL('../../data/historias/', import.meta.url);

async function getJson(name) {
  const res = await fetch(new URL(name, DATA), { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function loadStoryIndex() {
  indexPromise = indexPromise || getJson('index.json').catch((err) => {
    console.info('Historias no disponibles:', err.message);
    indexPromise = null;
    return {};
  });
  return indexPromise;
}

// Historia completa de un pintor (todos sus niveles) o null si no tiene.
export async function loadStory(artistId) {
  if (stories.has(artistId)) return stories.get(artistId);
  const index = await loadStoryIndex();
  if (!Array.isArray(index[artistId])) return null;
  try {
    const story = await getJson(`${encodeURIComponent(artistId)}.json`);
    stories.set(artistId, story);
    return story;
  } catch (err) {
    console.info('Historia no disponible:', err.message);
    return null;
  }
}
