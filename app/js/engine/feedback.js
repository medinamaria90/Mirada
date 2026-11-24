// Feedback que enseña (puro): qué mirar en ESE cuadro (`look`) y el rasgo del pintor.
// Para no repetir el mismo texto, el rasgo rota entre la pista y los rasgos del pintor.

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

// Una sola frase que enseña: el `look` de ESE cuadro o, si no hay, un rasgo del pintor (que rota
// para no repetir el mismo texto). En las de movimiento, al fallar, la línea del movimiento.
// memo: Map artistId → veces que ya se ha mostrado un rasgo de ese pintor en la ronda.
// opts.retry: la pregunta es la repetición de una fallada en esta ronda (el elogio de «cuadro nuevo»
// solo vale la primera vez que se ve).
// Devuelve { title, who, lines[] } con una línea como mucho (texto plano; la UI escapa).
export function feedbackFor(index, q, correct, memo = new Map(), rng = null, { retry = false } = {}) {
  const artist = index.artist(q.artistId);
  const movement = artist ? index.movement(artist.movementId) : null;
  const subject = index.artwork(q.type === 'which' ? q.targetArtworkId : q.artworkId);
  const look = subject && typeof subject.look === 'string' && subject.look.trim() ? sentence(subject.look) : '';
  const pick = (list) => (rng ? rng.pick(list) : list[0]);
  const teach = () => {
    // El `look` de una obra se dice una vez por ronda; si la obra vuelve a salir, un rasgo del pintor.
    const lookKey = subject ? `look:${subject.id}` : '';
    if (look && !memo.has(lookKey)) {
      memo.set(lookKey, 1);
      return look;
    }
    const pool = artistLines(artist);
    if (!pool.length) return '';
    const n = memo.get(q.artistId) || 0;
    memo.set(q.artistId, n + 1);
    return pool[n % pool.length];
  };
  let title;
  let who = artist ? artist.name : '';
  let line;

  if (correct) {
    title = pick(retry ? PRAISE_RETRY : q.isNew ? PRAISE_NEW : PRAISE);
    if (q.type === 'movement' && movement) who = `${artist.name} · ${movement.name}`;
    line = teach();
  } else if (q.type === 'movement' && movement) {
    title = `Es ${movement.name}`;
    line = movement.blurb ? sentence(movement.blurb) : teach();
  } else if (q.type === 'which') {
    title = 'Era este';
    line = teach();
  } else {
    title = `Es de ${artist ? artist.name : ''}`;
    who = '';
    line = teach();
  }
  return { title, who, lines: line ? [line] : [] };
}
