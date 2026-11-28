// Historia al empezar un nivel, como las de Instagram (el núcleo, con sus gestos y la navegación común de los visores de
// tarjetas, está en ui/story-core.js): quién la cuenta en la cabecera (su cara, su nombre y la etapa) y, abajo, los botones
// comunes. Una vez por nivel (se vuelve a ver desde la ficha del pintor). Pintores sin historia: no se muestra nada. Atrás
// cierra la historia (entra en el historial, como el visor). Las del nivel 1 llevan «Compartir» en la cabecera (ui/story-share.js).

import { esc } from './dom.js';
import { loadCss } from './lazy-css.js';
import { loadStory } from './story-data.js';
import { avatarHtml } from './avatar.js';
import { shareStory } from './story-share.js';
import { runStory, STORY_END } from './story-core.js';
import { seenOf, avatarWork, openingWork, coverWork } from '../engine/painters.js';
import { levelStory, storyKey, lookLine, isShareable, openingCandidates } from '../engine/stories.js';
import { storySeen, markStorySeen } from '../state/stories-seen.js';

// Cómo se cerró (ui/story-core.js): lo siguen importando de aquí quienes abren la historia de un nivel.
export { STORY_END };

// Muestra la historia del nivel y devuelve una promesa que se cumple al cerrarla con { shown, ended }: los cuadros que ha
// enseñado y cómo se cerró (STORY_END). opts: { force } vuelve a mostrarla aunque ya se haya visto; { history: false } cuando va
// seguida de una ronda: no entra en el historial (su «atrás» llegaría cuando la ronda ya está montada); { onPlay } lo que hace
// el botón principal de la última tarjeta tras cerrar (sin él, solo cerrar: lo que sigue lo decide quien llama) y { playLabel }
// su texto («Volver»; «Seguir» si no se dice); { steps } «Ir a las preguntas» en cada tarjeta (ui/story-core.js); en la última,
// «Más sobre <pintor> ›» lleva a su ficha, salvo con { onMore: false } (ya se está en ella) o { onMore } + { moreLabel }, otra
// historia sugerida; { look } la pista «Fíjate en…» del pintor, que la última tarjeta añade si la historia no lo dice ya; { guest } la abre un enlace
// compartido: no se marca como vista ni usa lo que ha visto quien la abre (no toca su partida).
export async function playStory(ctx, artistId, level, opts = {}) {
  const key = storyKey(artistId, level);
  const none = { shown: [], ended: STORY_END.NONE };
  const guest = Boolean(opts.guest);
  if (!opts.force && storySeen(key)) return none;
  const [story] = await Promise.all([loadStory(artistId), loadCss('css/historias.css'), loadCss('css/deck.css')]);
  const lv = levelStory(story, level);
  if (!lv) return none;
  const { index } = ctx;
  if (!guest) markStorySeen(key);
  const artist = index.artist(artistId);
  const name = artist?.name || '';
  const mine = guest ? [] : seenOf(ctx.store.get().progress, index, artistId);
  // Su cara solo si el catálogo tiene un autorretrato suyo (mejor uno ya visto); nunca el retrato de otro.
  const face = avatarWork(mine, { selfOnly: true }) || avatarWork(index.worksOf(artistId), { selfOnly: true });
  // La primera tarjeta del nivel básico abre con su autorretrato visto o con su obra más representativa de las vistas,
  // nunca con una que ya sale en otra tarjeta de la historia.
  const pool = openingCandidates(mine, lv.cards);
  const ownFace = avatarWork(pool, { selfOnly: true });
  const opening = ownFace ? ownFace.work : (pool.length ? openingWork(pool, null) : null);
  const look = lookLine(lv.cards, opts.look);
  const shareable = isShareable(level);
  // «Más sobre…»: a la ficha del pintor (no en la compartida: quien la abre aún no juega).
  const about = opts.onMore === undefined && !guest;

  return runStory(ctx, {
    cards: lv.cards,
    name,
    guest,
    look,
    shareable,
    history: opts.history,
    label: `Historia: ${lv.title || name}`,
    accent: index.movement(artist?.movementId)?.accent,
    whoHtml: `<span class="story-who"><span class="story-avatar" aria-hidden="true">${avatarHtml(artist, face, '', { texture: coverWork(mine) })}</span>
            <span class="story-who-text"><span class="story-name">${esc(artist?.short || name)}</span><span class="story-title">${esc(lv.stage || lv.title)}</span></span></span>`,
    // Una tarjeta con detalle intencionado (`region`) enseña siempre su obra: la portada propia no la sustituye.
    override: (pos, card) => (level === 1 && pos === 0 && !card.region ? opening : null),
    onPlay: opts.onPlay,
    playLabel: opts.playLabel,
    steps: opts.steps,
    moreLabel: opts.moreLabel,
    onMore: about ? () => ctx.go(`pintor-${artistId}`) : opts.onMore || false,
    aboutLabel: about ? `Más sobre ${artist?.short || name} ›` : '',
    onShare: () => shareStory({ artistId, level, title: lv.title || name }),
  });
}
