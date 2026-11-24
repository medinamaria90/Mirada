// ¿Se puede enseñar el título bajo el cuadro ANTES de responder? Solo si no delata la respuesta.
// Puro: sin DOM. En «¿Cuál es de X?» el título no se enseña nunca (delataría entre las cuatro).

// Ids de obras cuyo título delata sin que lo detecte la regla automática. Se rellena cuando María
// avise de un caso jugando.
export const TITLE_GIVES_AWAY = [];

const MIN_TOKEN = 4;
const SELF_PORTRAIT = 'autorretrato';
// Partículas de apellidos que no delatan por sí solas.
const PARTICLES = new Set(['van', 'der', 'den', 'de', 'del', 'della', 'di', 'da', 'la', 'le', 'el', 'los', 'las', 'viejo', 'joven']);

// Palabras clave de cada movimiento (además de las de su nombre), sin tildes y en minúsculas.
const MOVEMENT_KEYWORDS = {
  gotico: ['gotic'],
  renacimiento: ['renacimiento', 'renacentist'],
  'manierismo-y-norte': ['manierism', 'manierist'],
  barroco: ['barroc'],
  'rococo-neoclasicismo': ['rococo', 'neoclasic'],
  romanticismo: ['romantic'],
  realismo: ['realism', 'realist'],
  impresionismo: ['impresion', 'impresionis'],
  'ukiyo-e': ['ukiyo', 'estampa'],
  postimpresionismo: ['postimpresion'],
  'simbolismo-modernismo': ['simbolis', 'modernis', 'vanguardia'],
};

export function normalize(text) {
  return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function words(text) {
  return normalize(text).split(/[^a-z0-9]+/).filter(Boolean);
}

// Palabras del nombre del pintor que bastarían para delatarlo.
function nameTokens(artist) {
  const out = new Set();
  for (const source of [artist.name, artist.short]) {
    for (const t of words(source)) if (t.length >= MIN_TOKEN && !PARTICLES.has(t)) out.add(t);
  }
  return out;
}

function containsPhrase(title, phrase) {
  const p = normalize(phrase).trim();
  return p.length >= MIN_TOKEN && normalize(title).includes(p);
}

// kind: 'who' | 'movement' | 'which'. Devuelve true si el título delata la respuesta.
export function titleGivesAway(index, work, kind) {
  if (!work || kind === 'which') return true;
  if (TITLE_GIVES_AWAY.includes(work.id)) return true;
  const title = work.title || '';
  const titleWords = new Set(words(title));
  const artist = index.artist(work.artistId);
  if (normalize(title).includes(SELF_PORTRAIT)) return true;
  if (artist) {
    for (const t of nameTokens(artist)) if (titleWords.has(t)) return true;
    if (containsPhrase(title, artist.name) || containsPhrase(title, artist.short)) return true;
  }
  if (kind === 'movement') {
    const movement = artist && index.movement(artist.movementId);
    if (movement) {
      if (containsPhrase(title, movement.name)) return true;
      const normalized = normalize(title);
      if ((MOVEMENT_KEYWORDS[movement.id] || []).some((k) => normalized.includes(k))) return true;
    }
  }
  return false;
}

// Título que se pinta bajo el cuadro antes de responder, o '' si no debe verse.
export function revealedTitle(index, work, kind) {
  return work && work.title && !titleGivesAway(index, work, kind) ? work.title : '';
}
