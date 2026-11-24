// Ronda en curso guardada en el estado para retomarla tras recargar o cerrar. Puro.
// Se guarda la ronda ya planificada (preguntas, cola, respuestas) y lo justo para pintar el
// resultado. Al leerla se valida contra el catálogo y caduca a las 12 horas.

export const SESSION_TTL = 12 * 60 * 60 * 1000;
const ROUTE_RE = /^[a-z0-9-]{1,40}$/;
const WEEK_RE = /^\d{4}-W\d{2}$/;
const TYPES = new Set(['who', 'movement', 'which']);
const KINDS = new Set(['stage', 'sala', 'review', 'srs', 'daily', 'weekly', 'general', 'challenge']);

// meta: { route, title, accent, kind, extra, friendScore, shareTopic, plan:{kind,seed,artistId,movementId,date} }
// lesson: { round, answers, xpLive, freshIntroShown }
export function makeSession(meta, lesson, now) {
  return {
    route: meta.route,
    savedAt: now,
    title: meta.title || '',
    accent: meta.accent || '',
    kind: meta.kind,
    extra: { ...(meta.extra || {}) },
    friendScore: meta.friendScore ?? null,
    shareTopic: meta.shareTopic || '',
    plan: pickPlan(meta.plan || {}),
    round: lesson.round,
    answers: lesson.answers,
    xpLive: lesson.xpLive || 0,
    freshIntroShown: Boolean(lesson.freshIntroShown),
  };
}

export function withSession(state, session) {
  return { ...state, session: session || {} };
}

export function clearSession(state) {
  return state.session && Object.keys(state.session).length ? { ...state, session: {} } : state;
}

// Devuelve la sesión válida (con etiquetas reconstruidas desde el catálogo) o null.
export function readSession(state, index, now) {
  const s = state && state.session;
  if (!s || typeof s !== 'object' || !s.route) return null;
  try {
    if (!ROUTE_RE.test(s.route) || !KINDS.has(s.kind)) return null;
    if (typeof s.savedAt !== 'number' || now - s.savedAt >= SESSION_TTL || s.savedAt - now > 60000) return null;
    const round = s.round;
    if (!round || !Array.isArray(round.queue) || !Array.isArray(round.firstTry)) return null;
    const baseCount = round.queue.filter((it) => it && !it.retry).length;
    if (round.baseCount !== baseCount || round.firstTry.length !== baseCount) return null;
    if (!Number.isInteger(round.pos) || round.pos < 0 || round.pos >= round.queue.length) return null;
    const queue = round.queue.map((it) => {
      if (!it || !Number.isInteger(it.base) || it.base < 0 || it.base >= baseCount) throw new Error('item');
      return { q: cleanQuestion(it.q, index), base: it.base, retry: Boolean(it.retry) };
    });
    const answers = (Array.isArray(s.answers) ? s.answers : []).map((a) => ({
      q: cleanQuestion(a.q, index), correct: Boolean(a.correct), retry: Boolean(a.retry), combo: num(a.combo),
    }));
    return {
      ...s,
      round: {
        queue,
        pos: round.pos,
        baseCount,
        firstTry: round.firstTry.map((v) => (v === true ? true : v === false ? false : null)),
        combo: num(round.combo),
        bestCombo: num(round.bestCombo),
      },
      answers,
      xpLive: num(s.xpLive),
      friendScore: Number.isInteger(s.friendScore) ? s.friendScore : null,
      accent: /^#[0-9a-f]{6}$/i.test(s.accent || '') ? s.accent : '#6b5b45',
      title: String(s.title || '').slice(0, 120),
      shareTopic: String(s.shareTopic || '').slice(0, 120),
      extra: pickExtra(s.extra || {}),
      plan: pickPlan(s.plan || {}),
    };
  } catch {
    return null;
  }
}

function cleanQuestion(q, index) {
  if (!q || !TYPES.has(q.type)) throw new Error('tipo');
  const artist = index.artist(q.artistId);
  if (!artist) throw new Error('pintor');
  if (!Array.isArray(q.options) || q.options.length < 2) throw new Error('opciones');
  const options = q.options.map((o) => {
    const id = o && o.id;
    if (q.type === 'who' && index.artist(id)) return { id, label: index.artist(id).name };
    if (q.type === 'movement' && index.movement(id)) return { id, label: index.movement(id).name };
    if (q.type === 'which' && index.artwork(id)) return { id, artworkId: id, label: '' };
    throw new Error('opción');
  });
  if (!options.some((o) => o.id === q.answerId)) throw new Error('respuesta');
  const out = {
    type: q.type,
    prompt: q.type === 'which' ? `¿Cuál es de ${artist.short || artist.name}?` : q.type === 'who' ? '¿Quién lo pintó?' : '¿De qué movimiento es?',
    artworkId: null,
    artistId: artist.id,
    options,
    answerId: q.answerId,
    isNew: Boolean(q.isNew),
    phase: typeof q.phase === 'string' ? q.phase.replace(/[^a-z]/g, '').slice(0, 12) : '',
  };
  if (q.type === 'which') {
    const target = index.artwork(q.targetArtworkId);
    if (!target || target.artistId !== artist.id || q.answerId !== target.id) throw new Error('obra');
    out.targetArtworkId = target.id;
  } else {
    const art = index.artwork(q.artworkId);
    if (!art || art.artistId !== artist.id) throw new Error('obra');
    out.artworkId = art.id;
  }
  return out;
}

function pickPlan(p) {
  const out = { kind: KINDS.has(p.kind) ? p.kind : 'general' };
  if (Number.isFinite(p.seed)) out.seed = p.seed;
  for (const k of ['artistId', 'movementId', 'date']) if (typeof p[k] === 'string' && ROUTE_RE.test(p[k])) out[k] = p[k];
  if (typeof p.week === 'string' && WEEK_RE.test(p.week)) out.week = p.week;
  return out;
}

function pickExtra(e) {
  const out = {};
  for (const k of ['artistId', 'movementId', 'date']) if (typeof e[k] === 'string' && ROUTE_RE.test(e[k])) out[k] = e[k];
  if (typeof e.week === 'string' && WEEK_RE.test(e.week)) out.week = e.week;
  if (e.unseen === true) out.unseen = true;
  return out;
}

function num(v) {
  return Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
}
