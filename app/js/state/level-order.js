// Niveles «a fondo» por importancia (decisión de María, 28/11): antes iban por orden cronológico (las pinturas negras de
// Goya eran su nivel 6); ahora lo imprescindible y lo más famoso va primero (son su nivel 2). Las obras de cada nivel no
// cambian, solo su número. Este módulo traduce lo guardado con la numeración antigua para no perder nada. Puro.
//
// Se aplica al cargar (schema.migrate), sin subir la versión del estado: un móvil con la app vieja en caché no rechaza
// un estado «del futuro». La marca progress.levelOrder dice que el estado ya usa la numeración nueva.

export const LEVEL_ORDER = 1;

// Pintor → { nivel antiguo: nivel nuevo } (solo los que cambian; el nivel 1 nunca se toca).
export const LEVEL_REMAP = Object.freeze({
  giotto: { 2: 3, 3: 2, 4: 4 },
  rafael: { 2: 3, 3: 2, 4: 4, 5: 5 },
  tiziano: { 2: 4, 3: 5, 4: 3, 5: 2 },
  'el-greco': { 2: 3, 3: 4, 4: 2 },
  zurbaran: { 2: 3, 3: 2, 4: 4 },
  rubens: { 2: 5, 3: 3, 4: 2, 5: 4 },
  velazquez: { 2: 4, 3: 5, 4: 3, 5: 2 },
  rembrandt: { 2: 5, 3: 2, 4: 4, 5: 3 },
  murillo: { 2: 4, 3: 3, 4: 2, 5: 5 },
  goya: { 2: 5, 3: 6, 4: 4, 5: 3, 6: 2 },
  monet: { 2: 3, 3: 2, 4: 4, 5: 5 },
  sorolla: { 2: 3, 3: 2, 4: 4 },
  'van-gogh': { 2: 5, 3: 6, 4: 2, 5: 3, 6: 4 },
});

const KEY_RE = /^([a-z0-9-]+):(\d+)$/;
const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function remapLevel(artistId, level) {
  const map = Object.hasOwn(LEVEL_REMAP, artistId) ? LEVEL_REMAP[artistId] : null;
  return map && Object.hasOwn(map, level) ? map[level] : level;
}

// «goya:6» → «goya:2». Lo que no es una clave pintor:nivel se queda igual.
export function remapLevelKey(key) {
  const m = typeof key === 'string' ? KEY_RE.exec(key) : null;
  return m ? `${m[1]}:${remapLevel(m[1], Number(m[2]))}` : key;
}

function remapDict(dict) {
  if (!isPlain(dict)) return dict;
  const out = {};
  for (const [k, v] of Object.entries(dict)) out[remapLevelKey(k)] = v;
  return out;
}

function remapDeepen(d) {
  if (!isPlain(d)) return d;
  return {
    ...d,
    ...(Array.isArray(d.recent) ? { recent: d.recent.map(remapLevelKey) } : {}),
    ...(typeof d.pending === 'string' ? { pending: remapLevelKey(d.pending) } : {}),
    ...(isPlain(d.skips) ? { skips: remapDict(d.skips) } : {}),
  };
}

// Ronda «a fondo» a medias de un pintor que cambia de orden: su ruta y su título llevan el número antiguo; se descarta.
function staleSession(session) {
  const plan = isPlain(session) && isPlain(session.plan) ? session.plan : null;
  return Boolean(plan && plan.kind === 'stage' && Number(plan.level) >= 2 && Object.hasOwn(LEVEL_REMAP, plan.artistId));
}

// Estado con la numeración antigua → nueva: niveles hechos (progress.deep, con medallas y récords dentro) y la rotación
// de «Profundiza» (progress.deepen). Si ya lleva la marca, se devuelve tal cual.
export function migrateLevelOrder(state) {
  if (!isPlain(state)) return state;
  const progress = isPlain(state.progress) ? state.progress : null;
  if ((Number(progress?.levelOrder) || 0) >= LEVEL_ORDER) return state;
  return {
    ...state,
    session: staleSession(state.session) ? {} : state.session,
    progress: {
      ...(progress || {}),
      ...(progress && isPlain(progress.deep) ? { deep: remapDict(progress.deep) } : {}),
      ...(progress && isPlain(progress.deepen) ? { deepen: remapDeepen(progress.deepen) } : {}),
      levelOrder: LEVEL_ORDER,
    },
  };
}

// Historias ya vistas (state/stories-seen.js, lista de «pintor:nivel»): la marca va en la propia lista.
export const STORIES_ORDER_MARK = `@orden:${LEVEL_ORDER}`;

export function migrateStoryKeys(list) {
  const keys = Array.isArray(list) ? list.filter((k) => typeof k === 'string') : [];
  if (keys.includes(STORIES_ORDER_MARK)) return { keys, changed: false };
  return { keys: [...new Set(keys.map(remapLevelKey)), STORIES_ORDER_MARK], changed: true };
}
