// Ficha de pintor al estilo de un perfil de Instagram: portada (su cuadro más famoso de los ya vistos), avatar con
// anillo de historia, nombre, fechas, país y movimiento, su historia, cómo reconocerlo, etapas y las primeras
// obras de su galería. Solo obras ya vistas (sin spoilers). El contenido es común a la pantalla (`#pintor-<id>`) y
// al diálogo que se abre dentro de una ronda (ui/artist-sheet.js).

import { esc, joinNames } from './dom.js';
import { icons } from './icons.js';
import { artFrame, tinySrc, smallSrc, mediumSrc } from './art.js';
import { deepRoute, stageRoute } from './router.js';
import { branchLockReason } from '../engine/branches.js';
import { avatarHtml, initials } from './avatar.js';
import { loadStory } from './story-data.js';
import { levelStory, sourceLabel, storyKey } from '../engine/stories.js';
import { storySeen } from '../state/stories-seen.js';
import { factsOf, wikidataUrl, lifeSpan, seenOf, playTargets, stageList, coverWork, previewCells, avatarCrop, avatarWork, isMastered, missingNote } from '../engine/painters.js';

const STAGE_LABEL = { mastered: 'Dominada', started: 'En marcha', available: 'Abierta', locked: 'Por abrir' };
const STAGE_ICON = { mastered: 'check', started: 'play', available: 'play', locked: 'lock' };
// «Seguir» a secas se lee como «Follow» en una ficha de perfil: es seguir jugando.
const PLAY_LABEL = { available: 'Empezar su etapa', started: 'Seguir jugando', mastered: 'Jugar otra vez' };

export { initials };

function factsHtml(index, artist, seenCount) {
  return `<dl class="ap-facts">${factsOf(index, artist, seenCount).map((f) => `<div><dt>${esc(f.label)}</dt><dd>${f.value}</dd></div>`).join('')}</dl>`;
}

// Fuente de las fechas y el país (los que enseña la cabecera), al pie: no van junto a los contadores de la app.
function sourceFoot(artist) {
  const url = wikidataUrl(artist);
  return url ? `<p class="ap-sources ap-foot"><span>Fechas y país</span><a class="ap-source" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Wikidata</a></p>` : '';
}

function stagesHtml(stages, playable) {
  if (!stages.length) return '';
  const item = (s) => {
    const inner = `<span class="ap-stage-mark" aria-hidden="true">${icons[STAGE_ICON[s.status]](16)}</span>
      <span class="ap-stage-name">${esc(s.name)}</span><span class="ap-stage-state">${STAGE_LABEL[s.status]}</span>`;
    return playable && s.status !== 'locked'
      ? `<li><button type="button" class="ap-stage is-${s.status}" data-ap="deep" data-level="${s.id}" aria-label="${esc(s.name)}: ${STAGE_LABEL[s.status].toLowerCase()}, jugar">${inner}<span class="ap-stage-go" aria-hidden="true">${icons.next(16)}</span></button></li>`
      : `<li class="ap-stage is-${s.status}">${inner}</li>`;
  };
  return `<section class="ap-section ap-stages-section" aria-labelledby="ap-stages-h"><h2 id="ap-stages-h" class="ap-h">Etapas</h2>
    <ul class="ap-stages">${stages.map(item).join('')}</ul></section>`;
}

// «Quién fue»: la biografía corta, los textos de su historia de nivel 1, a la vista (sin tener que abrir la historia).
function bioHtml(lv) {
  const cards = lv ? lv.cards.filter((c) => c.text) : [];
  if (!cards.length) return '';
  const sources = [...new Map(cards.filter((c) => c.source).map((c) => [String(c.source).split('#')[0], sourceLabel(c.source)])).entries()];
  return `<section class="ap-section ap-life" aria-labelledby="ap-life-h"><h2 id="ap-life-h" class="ap-h">Quién fue</h2>
    ${cards.map((c) => `<p class="ap-life-text">${esc(c.text)}</p>`).join('')}
    ${sources.length ? `<p class="ap-sources">${sources.map(([url, label]) => `<a class="ap-source" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`).join('')}</p>` : ''}</section>`;
}

function lookHtml(artist) {
  const traits = Array.isArray(artist.traits) ? artist.traits.filter(Boolean) : [];
  if (!traits.length && !artist.hint) return '';
  const body = traits.length
    ? `<ul class="ap-traits">${traits.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`
    : `<p class="ap-hint">${esc(artist.hint)}</p>`;
  return `<section class="ap-section ap-look" aria-labelledby="ap-look-h"><h2 id="ap-look-h" class="ap-h">Cómo reconocerlo</h2>${body}</section>`;
}

// «Te faltan 24 · se desbloquean en sus etapas» con enlace a las etapas si procede (en la ficha baja a ellas; en la galería va a la ficha).
export function missingHtml(progress, index, artistId, seenCount, total, where) {
  const note = missingNote(progress, index, artistId, seenCount, total);
  if (!note) return '';
  const link = !note.toStages ? '' : where === 'ficha'
    ? `<button type="button" class="ap-missing-link" data-ap="stages">Ver etapas${icons.next(14)}</button>`
    : `<button type="button" class="ap-missing-link" data-artist="${esc(artistId)}" data-focus="stages">Ver etapas${icons.next(14)}</button>`;
  return `<p class="ap-missing"><span>${esc(note.text)}</span>${link}</p>`;
}

// Galería embebida: las primeras 6 obras vistas; lo que falta, un bloque discreto (no una pared de casillas vacías) y,
// con navegación, «Ver sus N cuadros».
function galleryHtml(artist, seen, total, withLink, missing) {
  if (!seen.length) return '';
  const more = withLink
    ? `<button type="button" class="ap-more" data-ap="gallery">${seen.length === 1 ? 'Ver su cuadro' : `Ver sus ${seen.length} cuadros`}${icons.next(16)}</button>` : '';
  return `<section class="ap-section ap-gallery" aria-labelledby="ap-gal-h"><h2 id="ap-gal-h" class="ap-h">Sus cuadros <span class="ap-count">${seen.length} de ${total}</span></h2>
    <ul class="ap-grid">${previewCells(seen).map((w) => `<li>${artFrame(w, { alt: '', cls: 'art-thumb', label: w.title, small: true, defer: true, zoom: { group: `ap-${artist.id}`, label: `Ver en grande: ${w.title}`, badge: false } })}</li>`).join('')}</ul>
    ${missing}${more}</section>`;
}

// «✓ Dominado» (lo que dice el motor) y, si quedan obras en los niveles «a fondo», cuántas. Los números de cuadros van en los contadores de
// debajo: no se repiten aquí. Sin dominar, nada.
function masteryHtml(progress, index, artistId, seen, total) {
  if (!isMastered(progress, artistId)) return '';
  const deep = index.deepLevels(artistId).length > 0;
  const left = total - seen;
  return `<p class="ap-mastery is-done"><span class="ap-mastery-mark" aria-hidden="true">${icons.check(14)}</span><span>Dominado</span></p>${deep && left > 0 ? `<p class="ap-mastery-more">Te quedan ${left} en los niveles a fondo</p>` : ''}`;
}

function heroHtml(artist, movement, seen, hasStory, storyNew, tag, leadControl) {
  const cover = coverWork(seen);
  const cx = avatarCrop(cover);
  const ring = `<span class="ap-ring${hasStory ? (storyNew ? ' is-new' : ' is-seen') : ' is-none'}"><span class="ap-photo">${avatarHtml(artist, avatarWork(seen), 'av-lg', { texture: cover })}</span></span>`;
  const avatarEl = hasStory
    ? `<button type="button" class="ap-avatar" data-ap="story" aria-label="Ver la historia de ${esc(artist.name)}">${ring}</button>`
    : `<span class="ap-avatar">${ring}</span>`;
  const meta = [lifeSpan(artist), artist.country].filter(Boolean).join(' · ');
  return `<header class="ap-hero">
    <div class="ap-cover">${cover ? `<img src="${esc(cover.img)}" srcset="${esc(tinySrc(cover))} 240w, ${esc(smallSrc(cover))} 320w, ${esc(mediumSrc(cover))} 800w, ${esc(cover.img)} 1200w" sizes="(min-width: 720px) 720px, 100vw" alt="" style="object-position:${cx.x}% ${cx.y}%" decoding="async" fetchpriority="high">` : ''}</div>
    ${leadControl}
    <div class="ap-id">${avatarEl}
      <div class="ap-who"><${tag} class="ap-name" id="ap-name">${esc(artist.name)}</${tag}>
        <p class="ap-meta">${esc(meta)}</p>${movement ? `<p class="ap-era">${esc(movement.name)}</p>` : ''}</div>
    </div>
  </header>`;
}

// opts: { playable, branchId (abierta desde la hoja de una rama: manda el estado en esa rama), navigate (hay navegación:
// galería enlazada), tag ('h1' | 'h2'), leadControl (aspa o atrás) }
export async function profileHtml(ctx, artistId, opts) {
  const { index } = ctx;
  const artist = index.artist(artistId);
  const progress = ctx.store.get().progress;
  const story = await loadStory(artistId);
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
  const actions = hasStory || target ? `<div class="ap-actions">
      ${target ? (play.next
    ? `<button type="button" class="btn btn-primary" data-ap="deep" data-level="${play.next.id}">${esc(`Jugar: ${play.next.name}`)}</button>`
    : `<button type="button" class="btn btn-primary" data-ap="play" data-branch="${esc(branchId)}">${esc(PLAY_LABEL[target])}</button>`) : ''}
      ${hasStory ? `<button type="button" class="btn btn-secondary" data-ap="story">${icons.play(18)}<span>Ver su historia</span></button>` : ''}
    </div>` : '';
  return `${heroHtml(artist, movement, seen, hasStory, !storySeen(storyKey(artistId, 1)), opts.tag || 'h2', opts.leadControl || '')}
    ${known && isMastered(progress, artistId) ? `<div class="ap-progress">${masteryHtml(progress, index, artistId, seen.length, total)}</div>` : ''}
    ${lock}${actions}
    ${known ? bioHtml(levelStory(story, 1)) : ''}
    <section class="ap-bio" aria-label="Datos">${factsHtml(index, artist, seen.length)}</section>
    ${lookHtml(artist)}
    ${known ? stagesHtml(stageList(progress, index, artistId), opts.playable) : ''}
    ${galleryHtml(artist, seen, total, opts.navigate, missingHtml(progress, index, artistId, seen.length, total, 'ficha'))}
    ${sourceFoot(artist)}`;
}

// Acciones de la ficha. hooks: { beforeGo() } se llama antes de salir a otra ruta.
export function wireProfile(ctx, root, artistId, hooks = {}) {
  root.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-ap]');
    if (!b) return;
    ctx.audio.sfx('tap');
    const go = (route) => { if (hooks.beforeGo) hooks.beforeGo(); ctx.go(route); };
    const what = b.dataset.ap;
    if (what === 'story') {
      import('./story-viewer.js').then((m) => m.playStory(ctx, artistId, 1, { force: true }))
        .then(() => root.querySelector('.ap-ring.is-new')?.classList.replace('is-new', 'is-seen'))
        .catch((err) => console.error(err));
    } else if (what === 'play') go(stageRoute(artistId, b.dataset.branch || ''));
    else if (what === 'deep') go(deepRoute(artistId, Number(b.dataset.level)));
    else if (what === 'gallery') go(`obras-${artistId}`);
    else if (what === 'stages') {
      // «Ver etapas» baja a ellas y mueve el foco a su título (el lector de pantalla se entera).
      const h = root.querySelector('#ap-stages-h');
      h?.setAttribute('tabindex', '-1');
      h?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      h?.focus({ preventScroll: true });
    }
  });
}
