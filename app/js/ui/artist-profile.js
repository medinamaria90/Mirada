// Ficha de pintor al estilo de un perfil de Instagram: portada (su cuadro más famoso de los ya vistos), avatar con
// anillo de historia, nombre, fechas, país y movimiento, su historia, cómo reconocerlo, etapas y las primeras
// obras de su galería. Solo obras ya vistas (sin spoilers). El contenido es común a la pantalla (`#pintor-<id>`) y
// al diálogo que se abre dentro de una ronda (ui/artist-sheet.js).

import { esc } from './dom.js';
import { icons } from './icons.js';
import { artFrame } from './art.js';
import { deepRoute } from './router.js';
import { loadStory } from './story-data.js';
import { levelStory, sourceLabel, storyKey } from '../engine/stories.js';
import { storySeen } from '../state/stories-seen.js';
import { lifeLines, lifeSpan, seenOf, playTargets, stageList, coverAndAvatar, previewCells, avatarCrop, isMastered } from '../engine/painters.js';

const STAGE_LABEL = { mastered: 'Dominada', started: 'En marcha', available: 'Abierta', locked: 'Por abrir' };
const STAGE_ICON = { mastered: 'check', started: 'play', available: 'play', locked: 'lock' };
// «Seguir» a secas se lee como «Follow» en una ficha de perfil: es seguir jugando.
const PLAY_LABEL = { available: 'Empezar su etapa', started: 'Seguir jugando', mastered: 'Jugar otra vez' };

export const initials = (name) => String(name || '').split(/\s+/).filter((w) => /^\p{Lu}/u.test(w)).slice(0, 2).map((w) => w[0]).join('') || '·';

function sourcesHtml(lines) {
  const seen = new Set();
  const links = [];
  for (const l of lines) {
    const label = sourceLabel(l.source);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    links.push(`<a class="ap-source" href="${esc(l.source.split('#')[0])}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`);
  }
  return links.length ? `<p class="ap-sources"><span>Fuente</span>${links.join('')}</p>` : '';
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

function lookHtml(artist) {
  const traits = Array.isArray(artist.traits) ? artist.traits.filter(Boolean) : [];
  if (!traits.length && !artist.hint) return '';
  const body = traits.length
    ? `<ul class="ap-traits">${traits.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`
    : `<p class="ap-hint">${esc(artist.hint)}</p>`;
  return `<section class="ap-section ap-look" aria-labelledby="ap-look-h"><h2 id="ap-look-h" class="ap-h">Cómo reconocerlo</h2>${body}</section>`;
}

// Galería embebida: las primeras 6 casillas (vistas y huecos discretos) y, con navegación, «Ver sus N cuadros».
function galleryHtml(artist, seen, total, withLink) {
  if (!seen.length) return '';
  const { shown, gaps } = previewCells(seen, total);
  const more = withLink
    ? `<button type="button" class="ap-more" data-ap="gallery">${seen.length === 1 ? 'Ver su cuadro' : `Ver sus ${seen.length} cuadros`}${icons.next(16)}</button>` : '';
  return `<section class="ap-section ap-gallery" aria-labelledby="ap-gal-h"><h2 id="ap-gal-h" class="ap-h">Sus cuadros <span class="ap-count">${seen.length} de ${total}</span></h2>
    <ul class="ap-grid">${shown.map((w) => `<li>${artFrame(w, { alt: '', cls: 'art-thumb', label: w.title, thumb: true, defer: true, zoom: { group: `ap-${artist.id}`, label: `Ver en grande: ${w.title}` } })}</li>`).join('')}${'<li class="ap-gap" aria-hidden="true"></li>'.repeat(gaps)}</ul>
    ${more}</section>`;
}

// «✓ Dominado · 9 de 33 cuadros» (dominado = lo que dice el motor) y, si quedan obras en los niveles «a fondo», cuántas.
function masteryHtml(progress, index, artistId, seen, total) {
  const done = isMastered(progress, artistId);
  const deep = index.deepLevels(artistId).length > 0;
  const left = total - seen;
  const count = `${seen} de ${total} cuadros`;
  if (!done) return `<p class="ap-mastery">${count}</p>`;
  return `<p class="ap-mastery is-done"><span class="ap-mastery-mark" aria-hidden="true">${icons.check(14)}</span><span>Dominado · ${count}</span></p>${deep && left > 0 ? `<p class="ap-mastery-more">Te quedan ${left} en los niveles a fondo</p>` : ''}`;
}

function heroHtml(artist, movement, seen, hasStory, storyNew, tag, leadControl) {
  const { cover, avatar } = coverAndAvatar(seen);
  const cx = avatarCrop(cover);
  const ax = avatarCrop(avatar);
  const photo = avatar
    ? `<img class="ap-photo-img" src="${esc(avatar.img)}" alt="" style="--x:${ax.x}%;--y:${ax.y}%" decoding="async">`
    : `<span class="ap-initials" aria-hidden="true">${esc(initials(artist.name))}</span>`;
  const ring = `<span class="ap-ring${hasStory ? (storyNew ? ' is-new' : ' is-seen') : ' is-none'}"><span class="ap-photo">${photo}</span></span>`;
  const avatarEl = hasStory
    ? `<button type="button" class="ap-avatar" data-ap="story" aria-label="Ver la historia de ${esc(artist.name)}">${ring}</button>`
    : `<span class="ap-avatar">${ring}</span>`;
  const meta = [lifeSpan(artist), artist.country].filter(Boolean).join(' · ');
  return `<header class="ap-hero">
    <div class="ap-cover">${cover ? `<img src="${esc(cover.img)}" alt="" style="object-position:${cx.x}% ${cx.y}%" decoding="async" fetchpriority="high">` : ''}</div>
    ${leadControl}
    <div class="ap-id">${avatarEl}
      <div class="ap-who"><${tag} class="ap-name" id="ap-name">${esc(artist.name)}</${tag}>
        <p class="ap-meta">${esc(meta)}</p>${movement ? `<p class="ap-era">${esc(movement.name)}</p>` : ''}</div>
    </div>
  </header>`;
}

// opts: { playable, navigate (hay navegación: galería enlazada), tag ('h1' | 'h2'), leadControl (aspa o atrás) }
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
  const lines = lifeLines(artist, story, movement ? movement.name : '', { known });
  const hasStory = known && Boolean(levelStory(story, 1));
  const target = opts.playable ? playTargets(progress, index, artistId).stage : null;
  const actions = hasStory || target ? `<div class="ap-actions">
      ${target ? `<button type="button" class="btn btn-primary" data-ap="play">${esc(PLAY_LABEL[target])}</button>` : ''}
      ${hasStory ? `<button type="button" class="btn btn-secondary" data-ap="story">${icons.play(18)}<span>Ver su historia</span></button>` : ''}
    </div>` : '';
  return `${heroHtml(artist, movement, seen, hasStory, !storySeen(storyKey(artistId, 1)), opts.tag || 'h2', opts.leadControl || '')}
    ${known ? `<div class="ap-progress">${masteryHtml(progress, index, artistId, seen.length, total)}</div>` : ''}
    ${actions}
    <section class="ap-bio">${lines.map((l) => `<p>${esc(l.text)}</p>`).join('')}${sourcesHtml(lines)}</section>
    ${lookHtml(artist)}
    ${known ? stagesHtml(stageList(progress, index, artistId), opts.playable) : ''}
    ${galleryHtml(artist, seen, total, opts.navigate)}`;
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
    } else if (what === 'play') go(`etapa-${artistId}`);
    else if (what === 'deep') go(deepRoute(artistId, Number(b.dataset.level)));
    else if (what === 'gallery') go(`obras-${artistId}`);
  });
}
