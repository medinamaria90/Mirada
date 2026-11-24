// Feedback que enseña (puro): qué mirar en ESE cuadro (`look`) y el rasgo del pintor.
// Para no repetir el mismo texto, el rasgo rota entre la pista y los rasgos del pintor.
// Tras un fallo se dice también de quién era lo elegido (`chosen`), y la pista nunca es un rasgo
// que el cuadro elegido también cumpla: se apoya en las etiquetas visuales del catálogo (`tags` de
// obra, `traitTags` de pintor, `tagLabels` y `negableTags`), que llegan con data/catalog-text.json.

// --- Elección de la pista ---------------------------------------------------------------
// Tipos de cuadro: el típico enseña el rasgo del autor; el atípico se reconoce por otra cosa
// («no parece un X»); el de memoria «hay que sabérselo». En los dos últimos no se enseñan los
// rasgos genéricos del pintor, solo sus pistas propias.
export const WORK_KINDS = ['tipico', 'atipico', 'memoria'];
export const MAX_LOOKS = 2;

// Pistas de una obra en orden: `looks` (con fuente) o, si solo hay `look`, esa. Cada una
// { text, source, verified }: solo está verificada la que trae fuente.
export function looksOf(work) {
  if (!work) return [];
  const list = Array.isArray(work.looks) ? work.looks : [];
  const out = [];
  for (const item of list) {
    const text = typeof item === 'string' ? item : item && typeof item.text === 'string' ? item.text : '';
    const source = item && typeof item.source === 'string' ? item.source.trim() : '';
    if (text.trim()) out.push({ text: text.trim(), source, verified: Boolean(source) });
    if (out.length >= MAX_LOOKS) break;
  }
  if (!out.length && typeof work.look === 'string' && work.look.trim()) out.push({ text: work.look.trim(), source: '', verified: false });
  return out;
}

export function kindOf(work) {
  return work && WORK_KINDS.includes(work.kind) ? work.kind : WORK_KINDS[0];
}

// Etiquetas visuales de una obra (vacío = obra sin revisar: no se afirma nada sobre ella).
export function tagsOf(work) {
  return new Set(Array.isArray(work?.tags) ? work.tags.filter((t) => typeof t === 'string') : []);
}

// Etiquetas de cada frase del pintor, alineadas con `artistLines` ([pista, ...rasgos]).
// null = frase sin etiquetar (no se sabe dónde se ve).
export function traitTagsOf(artist, count) {
  const raw = Array.isArray(artist?.traitTags) ? artist.traitTags : [];
  return Array.from({ length: count }, (_, i) => (Array.isArray(raw[i]) ? raw[i].filter((t) => typeof t === 'string') : null));
}

const disjoint = (tags, set) => tags.every((t) => !set.has(t));
const subset = (tags, set) => tags.every((t) => set.has(t));

// Frases del pintor que sirven para enseñar `work`, en orden de preferencia: primero las que
// se ven seguro en ese cuadro; con `avoidWork` (el cuadro elegido por error) solo las que no
// comparte ese cuadro, y de esas, las verificadas en el correcto. Puede devolver [].
export function teachingLines(lines, artist, work, avoidWork = null) {
  const tags = traitTagsOf(artist, lines.length);
  const seen = tagsOf(work);
  const avoid = avoidWork ? tagsOf(avoidWork) : null;
  const verified = (t) => Boolean(t && t.length && seen.size && subset(t, seen));
  const ranked = lines.map((line, i) => ({ line, tags: tags[i], ok: verified(tags[i]) }));
  if (!avoid) return [...ranked.filter((r) => r.ok), ...ranked.filter((r) => !r.ok)].map((r) => r.line);
  const safe = ranked.filter((r) => r.tags && r.tags.length && disjoint(r.tags, avoid));
  // Sin etiquetas en el cuadro correcto no hay forma de verificar: vale con que no sea del otro.
  return safe.filter((r) => r.ok || !seen.size).map((r) => r.line);
}

// Rasgo del pintor `artist` (el elegido por error) que seguro NO está en `work`: la etiqueta
// humana de una de sus señas (`tagLabels`, solo las negables) ausente del cuadro. '' si no hay
// forma de afirmarlo (cuadro sin etiquetar o pintor sin señas negables).
export function absentTrait(index, artist, work) {
  const labels = index?.tagLabels && typeof index.tagLabels === 'object' ? index.tagLabels : {};
  const negable = new Set(Array.isArray(index?.negableTags) ? index.negableTags : []);
  const seen = tagsOf(work);
  if (!seen.size) return '';
  const own = Array.isArray(artist?.traitTags) ? artist.traitTags.flat() : [];
  for (const tag of own) {
    if (negable.has(tag) && typeof labels[tag] === 'string' && !seen.has(tag)) return labels[tag];
  }
  return '';
}

// --- Títulos y montaje ------------------------------------------------------------------
const PRAISE = ['¡Bien visto!', 'Exacto', 'Eso es', 'Buen ojo', '¡Lo tienes!'];
const PRAISE_NEW = ['¡Y sin haberlo visto antes!', 'Reconocido a la primera', 'Eso es aprender a mirar'];
// Al acertar la repetición de una pregunta fallada: nada de «a la primera».
const PRAISE_RETRY = ['Ahora sí', 'Ya lo tienes', 'Esta vez sí'];

function capital(text) {
  const t = String(text || '').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
}

function sentence(text) {
  const t = capital(text);
  return t && !/[.!?…]$/.test(t) ? `${t}.` : t;
}

// Textos del pintor que pueden rotar: la pista y cada rasgo.
export function artistLines(artist) {
  const traits = Array.isArray(artist?.traits) ? artist.traits.filter((t) => typeof t === 'string' && t.trim()) : [];
  return [artist?.hint, ...traits].filter((t) => typeof t === 'string' && t.trim()).map(sentence);
}

// Rasgo principal (para «Fíjate en…» y la tarjeta de cierre).
export function mainTrait(artist) {
  return artistLines(artist)[0] || '';
}

const shortName = (artist) => (artist ? artist.short || artist.name : '');

// Qué eligió quien ha fallado: en «¿Cuál es de X?» un cuadro (y su pintor); en «¿Quién lo
// pintó?» un pintor. null si no se sabe o no aplica (movimiento).
function chosenOf(index, q, chosenId) {
  if (!chosenId || chosenId === q.answerId) return null;
  if (q.type === 'which') {
    const option = (q.options || []).find((o) => o.id === chosenId);
    const work = option ? index.artwork(option.artworkId || option.id) : null;
    const artist = work ? index.artist(work.artistId) : null;
    return artist ? { artist, work } : null;
  }
  if (q.type === 'who') {
    const artist = index.artist(chosenId);
    return artist ? { artist, work: null } : null;
  }
  return null;
}

// Una sola frase que enseña: el `look` de ESE cuadro o, si no hay, un rasgo del pintor (que rota
// para no repetir el mismo texto). En las de movimiento, al fallar, la línea del movimiento.
// memo: Map artistId → veces que ya se ha mostrado un rasgo de ese pintor en la ronda; y
// `look:<obra>` → pistas propias ya dichas de esa obra (la segunda vez sale la segunda pista).
// opts.retry: la pregunta es la repetición de una fallada en esta ronda (el elogio de «cuadro nuevo»
// solo vale la primera vez que se ve). opts.chosenId: la opción elegida (para decir de quién era).
// Devuelve { title, who, lines[], kind, source, chosen } con una línea como mucho (texto plano; la
// UI escapa). chosen: { artistId, name, artworkId, title, line } tras un fallo de autor; si no, null.
export function feedbackFor(index, q, correct, memo = new Map(), rng = null, { retry = false, chosenId = null } = {}) {
  const artist = index.artist(q.artistId);
  const movement = artist ? index.movement(artist.movementId) : null;
  const subject = index.artwork(q.type === 'which' ? q.targetArtworkId : q.artworkId);
  const chosen = correct ? null : chosenOf(index, q, chosenId);
  const pick = (list) => (rng ? rng.pick(list) : list[0]);
  let source = '';
  // Las pistas propias de la obra se dicen una vez cada una por ronda; después, un rasgo del pintor.
  const nextLook = () => {
    const looks = looksOf(subject);
    const key = subject ? `look:${subject.id}` : '';
    const n = key ? memo.get(key) || 0 : 0;
    if (!key || n >= looks.length) return '';
    memo.set(key, n + 1);
    source = looks[n].source;
    return sentence(looks[n].text);
  };
  const nextTrait = (avoidWork) => {
    const pool = teachingLines(artistLines(artist), artist, subject, avoidWork);
    if (!pool.length) return '';
    const n = memo.get(q.artistId) || 0;
    memo.set(q.artistId, n + 1);
    return pool[n % pool.length];
  };
  // avoidWork: el cuadro elegido por error (no se enseña un rasgo que ese cuadro también tenga).
  // En cuadros atípicos o «de memoria» los rasgos genéricos del pintor no se ven: no se dicen.
  const teach = (avoidWork = null) => nextLook() || (kindOf(subject) === 'tipico' ? nextTrait(avoidWork) : '');
  let title;
  let who = artist ? artist.name : '';
  let line;

  if (correct) {
    title = pick(retry ? PRAISE_RETRY : q.isNew ? PRAISE_NEW : PRAISE);
    if (q.type === 'movement' && movement) who = `${artist.name} · ${movement.name}`;
    line = teach();
  } else if (q.type === 'movement' && movement) {
    title = `Es ${movement.name}${movement.period ? ` · ${movement.period}` : ''}`;
    line = movement.blurb ? sentence(movement.blurb) : teach();
  } else if (q.type === 'which') {
    title = 'Era este';
    line = teach(chosen ? chosen.work : null);
  } else {
    title = `Es de ${artist ? artist.name : ''}`;
    who = '';
    line = teach();
  }
  return { title, who, lines: line ? [line] : [], kind: kindOf(subject), source, chosen: chosen ? chosenLine(index, chosen, subject, line) : null };
}

// Línea sobre lo elegido por error: en «¿Cuál?», de quién es ese cuadro; en «¿Quién?», que no es
// de ese pintor y, si se sabe seguro, qué seña suya falta aquí.
function chosenLine(index, chosen, subject, mainLine) {
  const name = shortName(chosen.artist);
  if (chosen.work) {
    return { artistId: chosen.artist.id, name, artworkId: chosen.work.id, title: chosen.work.title, line: `El que has elegido es de ${name} · ${chosen.work.title}` };
  }
  const missing = absentTrait(index, chosen.artist, subject);
  // Si la pista ya empieza por «Fíjate…», no se repite la muletilla.
  const tail = !missing ? '' : /^Fíjate/.test(mainLine || '') ? `: aquí no hay ${missing}` : `: fíjate en que aquí no hay ${missing}`;
  return { artistId: chosen.artist.id, name, artworkId: null, title: '', line: `No es de ${name}${tail}` };
}
