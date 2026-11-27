// Ficha de pintor, un perfil que se desplaza con un primer vistazo que se basta solo: portada, avatar con su aro, nombre,
// sello, «por qué importa», la fila de círculos de sus niveles (ui/level-row.js) y el botón de jugar, con «Sus cuadros»
// asomando. Debajo, sus cuadros vistos, cómo reconocerlo (cada rasgo con un detalle de un cuadro), su tiempo (si lo hay) y
// con quién no confundirlo. Solo obras y pintores ya vistos (sin spoilers). El contenido es común a la pantalla
// (`#pintor-<id>`, con cabecera compacta al desplazarse: screens/artist-page.js) y al diálogo de dentro de una ronda
// (ui/artist-sheet.js).

import { esc, joinNames } from './dom.js';
import { icons } from './icons.js';
import { artFrame, tinySrc, smallSrc, mediumSrc } from './art.js';
import { deepRoute, stageRoute } from './router.js';
import { loadCss } from './lazy-css.js';
import { ringSvg } from './deep-badges.js';
import { rowLevels, rowHtml, wireRow, watchStory, levelRoute } from './level-row.js';
import { levelStates, levelRing, FIRST_LEVEL_SHORT } from '../engine/level-ring.js';
import { branchLockReason } from '../engine/branches.js';
import { avatarHtml, initials } from './avatar.js';
import { loadStory } from './story-data.js';
import { levelStory, storyKey } from '../engine/stories.js';
import { storySeen } from '../state/stories-seen.js';
import { sealHtml } from './seal.js';
import { traitDetails, lookAlikes } from '../engine/ficha.js';
import { timeHtml } from './ficha-tiempo.js';
import { lifeSpan, seenOf, playTargets, coverWork, previewCells, avatarCrop, avatarWork, isMastered, missingNote } from '../engine/painters.js';

// La tira de cuadros enseña unos cuantos; el resto, en su galería.
const STRIP_CELLS = 12;

export { initials };

// «Te faltan 24 · se desbloquean en sus etapas» (galería del pintor), con enlace a sus niveles en la ficha si procede.
export function missingHtml(progress, index, artistId, seenCount, total) {
  const note = missingNote(progress, index, artistId, seenCount, total);
  if (!note) return '';
  const link = note.toStages ? `<button type="button" class="ap-missing-link" data-artist="${esc(artistId)}" data-focus="stages">Ver etapas${icons.next(14)}</button>` : '';
  return `<p class="ap-missing"><span>${esc(note.text)}</span>${link}</p>`;
}

const whyHtml = (artist) => (artist.why ? `<p class="ap-why">${esc(artist.why.text)}</p>` : '');

// Tira deslizable con sus cuadros vistos (se abren a pantalla completa) y, con navegación, «Ver todos» (su galería).
function galleryHtml(artist, seen, total, withLink) {
  if (!seen.length) return '';
  const all = withLink ? `<button type="button" class="ap-all" data-ap="gallery">Ver todos${icons.next(16)}</button>` : '';
  return `<section class="ap-section ap-gallery" aria-labelledby="ap-gal-h"><div class="ap-head"><h2 id="ap-gal-h" class="ap-h">Sus cuadros <span class="ap-count">${seen.length} de ${total}</span></h2>${all}</div>
    <ul class="ap-strip">${previewCells(seen, STRIP_CELLS).map((w) => `<li>${artFrame(w, { alt: '', cls: 'ap-strip-art', label: w.title, small: true, defer: true, zoom: { group: `ap-${artist.id}`, label: `Ver en grande: ${w.title}`, badge: false } })}</li>`).join('')}</ul>
    </section>`;
}

const upperFirst = (t) => `${t.charAt(0).toUpperCase()}${t.slice(1)}`;

// «Cómo reconocerlo»: cada rasgo con un detalle recortado del cuadro que lo enseña (se abre en grande al tocarlo).
function lookHtml(artist, seen) {
  const rows = traitDetails(artist, seen);
  if (!rows.length) return '';
  const item = (r) => {
    const text = upperFirst(r.text.trim());
    if (!r.work) return `<li class="ap-trait"><p>${esc(text)}</p></li>`;
    const pos = `${r.x}% ${r.y}%`;
    return `<li><button type="button" class="ap-trait" data-zoom="${esc(r.work.id)}" aria-label="${esc(`${text}. Ver en grande: ${r.work.title}`)}">
      <span class="ap-detail" aria-hidden="true"><img src="${esc(mediumSrc(r.work))}" alt="" loading="lazy" decoding="async" style="object-position:${pos};transform-origin:${pos}"></span>
      <p>${esc(text)}</p></button></li>`;
  };
  return `<section class="ap-section ap-look" aria-labelledby="ap-look-h"><h2 id="ap-look-h" class="ap-h">Cómo reconocerlo</h2>
    <ul class="ap-traits">${rows.map(item).join('')}</ul></section>`;
}

// Cara de un pintor: su autorretrato o retrato visto o, si no, un detalle de su cuadro visto más famoso.
function faceOf(progress, index, artistId) {
  const seen = seenOf(progress, index, artistId);
  const cover = coverWork(seen);
  return avatarWork(seen) || (cover ? { work: cover, ...avatarCrop(cover) } : null);
}

// «No lo confundas con»: los parecidos ya conocidos, cada uno a su ficha (solo con navegación: dentro de una ronda, no).
function twinsHtml(progress, index, artist, withLink) {
  const ids = withLink ? lookAlikes(progress, index, artist) : [];
  if (!ids.length) return '';
  const twin = (id) => {
    const a = index.artist(id);
    return `<li><button type="button" class="ap-twin" data-ap="artist" data-id="${esc(id)}">${avatarHtml(a, faceOf(progress, index, id), 'ap-twin-av')}<span>${esc(a.short || a.name)}</span></button></li>`;
  };
  return `<section class="ap-section ap-twins-section" aria-labelledby="ap-twins-h"><h2 id="ap-twins-h" class="ap-h">No lo confundas con</h2>
    <ul class="ap-twins">${ids.map(twin).join('')}</ul></section>`;
}

// Avatar: con aro de niveles (pintor dominado con niveles), tocarlo juega el siguiente nivel o, con todo hecho, vuelve a ver
// «Quién fue»; si no, el anillo de su historia (degradado si no se ha visto).
function avatarEl(artist, seen, cover, story) {
  // Sin autorretrato visto, un detalle de su cuadro más famoso de los vistos (no unas iniciales).
  const face = avatarWork(seen) || (cover ? { work: cover, ...avatarCrop(cover) } : null);
  const photo = `<span class="ap-photo">${avatarHtml(artist, face, 'av-lg', { texture: cover })}</span>`;
  if (story.ring) {
    const next = story.playable && story.ring.levels.find((l) => l.state === 'next');
    const label = next ? `Jugar ${next.short}, de ${artist.name}` : `Ver la historia de ${artist.name}`;
    return `<button type="button" class="ap-avatar" data-ap="${next ? 'deep' : 'story'}"${next ? ` data-level="${next.level}"` : ''} aria-label="${esc(label)}"><span class="ap-ring has-levels">${ringSvg(story.ring.levels)}${photo}</span></button>`;
  }
  const ring = `<span class="ap-ring${story.has ? (story.isNew ? ' is-new' : ' is-seen') : ' is-none'}">${photo}</span>`;
  return story.has
    ? `<button type="button" class="ap-avatar" data-ap="story" aria-label="Ver la historia de ${esc(artist.name)}">${ring}</button>`
    : `<span class="ap-avatar">${ring}</span>`;
}

function heroHtml(artist, movement, seen, story, tag, leadControl) {
  const cover = coverWork(seen);
  const cx = avatarCrop(cover);
  const meta = [lifeSpan(artist), artist.country].filter(Boolean).join(' · ');
  return `<header class="ap-hero">
    <div class="ap-cover">${cover ? `<img src="${esc(cover.img)}" srcset="${esc(tinySrc(cover))} 240w, ${esc(smallSrc(cover))} 320w, ${esc(mediumSrc(cover))} 800w, ${esc(cover.img)} 1200w" sizes="(min-width: 720px) 720px, 100vw" alt="" style="object-position:${cx.x}% ${cx.y}%" decoding="async" fetchpriority="high">` : ''}</div>
    ${leadControl}
    <div class="ap-id">${avatarEl(artist, seen, cover, story)}
      <div class="ap-who"><${tag} class="ap-name" id="ap-name">${esc(artist.name)}</${tag}>
        <p class="ap-meta">${esc(meta)}</p></div>
    </div>
    <div class="ap-tags">${sealHtml(artist)}${movement ? `<span class="ap-era">${esc(movement.name)}</span>` : ''}</div>
    ${whyHtml(artist)}
    ${story.row ? `${story.row}<div class="hl-more" hidden></div>` : ''}
  </header>`;
}

// opts: { playable, branchId (abierta desde la hoja de una rama: manda el estado en esa rama), navigate (hay navegación:
// galería y parecidos enlazados), tag ('h1' | 'h2'), leadControl (aspa o atrás) }
export async function profileHtml(ctx, artistId, opts) {
  const { index } = ctx;
  const artist = index.artist(artistId);
  const progress = ctx.store.get().progress;
  const [story] = await Promise.all([loadStory(artistId), loadCss('css/niveles.css')]);
  const movement = index.movement(artist.movementId);
  const seen = seenOf(progress, index, artistId);
  const total = index.worksOf(artistId).length;
  // Sin nada visto ni dominado (p. ej. un enlace directo): nada que nombre cuadros aún no vistos.
  const known = seen.length > 0 || isMastered(progress, artistId);
  const hasStory = known && Boolean(levelStory(story, 1));
  const branchId = opts.branchId || '';
  const play = opts.playable ? playTargets(progress, index, artistId, branchId) : { stage: null, next: null };
  // Cerrado en la rama desde la que se abre: qué falta (y sin botón de jugar).
  const why = opts.playable && branchId && !play.stage ? branchLockReason(progress, index, artistId, branchId) : null;
  const nameOf = (s) => (s.type === 'sala' ? index.movement(s.id)?.name : index.artist(s.id)?.short || index.artist(s.id)?.name);
  const whyText = !why ? '' : why.before ? `Se abre al superar a ${nameOf({ type: 'artist', id: why.before })}` : why.pending.length ? `Se abre al dominar a ${joinNames(why.pending.map(nameOf))}` : '';
  const lock = whyText ? `<p class="ap-lock">${icons.lock(16)}<span>${esc(`${whyText} en ${index.branch(branchId).name}.`)}</span></p>` : '';
  const target = play.stage;
  // Fila de niveles: un círculo por nivel (el mismo aro del mapa); con un solo nivel, solo si tiene historia.
  const levels = known ? rowLevels(index, artistId, story, levelStates(progress, index, artistId)) : [];
  const ring = known ? levelRing(progress, index, artistId) : null;
  // Un único botón: «Empezar · <nivel>» (el siguiente, como su círculo: su historia y las preguntas) o, con todo hecho, «Repasar».
  const actions = !target ? '' : `<div class="ap-actions">${play.next
    ? `<button type="button" class="btn btn-primary" data-ap="deep" data-level="${play.next.id}">Empezar <small>· ${esc(play.next.name)}</small></button>`
    : `<button type="button" class="btn btn-primary" data-ap="play" data-branch="${esc(branchId)}">${target === 'mastered' ? 'Repasar' : `Empezar <small>· ${esc(FIRST_LEVEL_SHORT)}</small>`}</button>`}</div>`;
  const storyInfo = { has: hasStory, isNew: !storySeen(storyKey(artistId, 1)), ring, playable: Boolean(opts.playable), row: levels.length > 1 || levels.some((l) => l.story) ? rowHtml(levels, opts.playable ? '' : 'is-watch') : '' };
  return `${heroHtml(artist, movement, seen, storyInfo, opts.tag || 'h2', opts.leadControl || '')}
    ${lock}${actions}
    ${galleryHtml(artist, seen, total, opts.navigate)}
    ${lookHtml(artist, seen)}
    ${known ? timeHtml(ctx, artistId, (id) => faceOf(progress, index, id)) : ''}
    ${known ? twinsHtml(progress, index, artist, opts.navigate) : ''}`;
}

// Acciones de la ficha. hooks: { beforeGo() } se llama antes de salir a otra ruta.
export function wireProfile(ctx, root, artistId, hooks = {}) {
  const go = (route) => { if (hooks.beforeGo) hooks.beforeGo(); ctx.go(route); };
  // Historias destacadas: el siguiente nivel se juega como el botón principal (el nivel 1, con su regla de rama); en la ficha
  // dentro de una ronda (.is-watch) los círculos solo ponen su historia.
  const row = root.querySelector('.hl-row');
  if (row) {
    const watch = row.classList.contains('is-watch');
    wireRow(ctx, root, artistId, root.querySelector('.hl-more'), watch ? { play: (level) => watchStory(ctx, artistId, level) } : {
      play: (level) => {
        const main = level === 1 && root.querySelector('[data-ap="play"]');
        return main ? main.click() : go(levelRoute(artistId, level));
      },
      replay: (level) => go(levelRoute(artistId, level)),
    });
  }
  root.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-ap]');
    if (!b) return;
    ctx.audio.sfx('tap');
    const what = b.dataset.ap;
    if (what === 'story') {
      // «Jugar» de la última tarjeta hace lo mismo que el botón de jugar de la ficha; «Ver más» deja en la ficha.
      const playBtn = root.querySelector('.ap-actions [data-ap]');
      const onPlay = playBtn ? () => playBtn.click() : false;
      import('./story-viewer.js').then((m) => m.playStory(ctx, artistId, 1, { force: true, onPlay, onMore: () => {} }))
        .then(() => root.querySelector('.ap-ring.is-new')?.classList.replace('is-new', 'is-seen'))
        .catch((err) => console.error(err));
    } else if (what === 'play') go(stageRoute(artistId, b.dataset.branch || ''));
    else if (what === 'deep') go(deepRoute(artistId, Number(b.dataset.level)));
    else if (what === 'gallery') go(`obras-${artistId}`);
    else if (what === 'artist') go(`pintor-${b.dataset.id}`);
  });
}
