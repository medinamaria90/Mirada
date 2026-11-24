// Ficha de pintor: se abre sobre cualquier pantalla (feedback, «Conoce a», Colección, ficha de obra) sin
// cambiar de ruta, para no perder una ronda. Fechas, país, época, líneas de vida con fuente, «Fíjate
// en…», etapas, SOLO las obras ya vistas (sin spoilers), progreso y botón para jugar.

import { esc, accentStyle } from './dom.js';
import { icons } from './icons.js';
import { artFrame } from './art.js';
import { loadCss } from './lazy-css.js';
import { loadStory } from './story-data.js';
import { lifeLines, lifeSpan, seenOf, playTargets, stageList } from '../engine/painters.js';

const STAGE_LABEL = { mastered: 'Dominada', started: 'En marcha', available: 'Abierta', locked: 'Por abrir' };
const STAGE_ICON = { mastered: 'check', started: 'play', available: 'play', locked: 'lock' };
const PLAY_LABEL = { available: 'Empezar', started: 'Seguir', mastered: 'Jugar otra vez' };

let current = null;

export const initials = (name) => String(name || '').split(/\s+/).filter((w) => /^\p{Lu}/u.test(w)).slice(0, 2).map((w) => w[0]).join('') || '·';

// «es.wikipedia.org» → «Wikipedia»; el resto, el nombre del sitio.
export function sourceLabel(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (/wikipedia\.org$/.test(host)) return 'Wikipedia';
    if (/wikidata\.org$/.test(host)) return 'Wikidata';
    return host;
  } catch { return ''; }
}

function sourcesHtml(lines) {
  const seen = new Set();
  const links = [];
  for (const l of lines) {
    const url = l.source;
    const label = sourceLabel(url);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    links.push(`<a class="as-source" href="${esc(url.split('#')[0])}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`);
  }
  return links.length ? `<p class="as-sources"><span>Fuente</span>${links.join('')}</p>` : '';
}

function stagesHtml(stages) {
  if (!stages.length) return '';
  return `<section class="as-section" aria-labelledby="as-stages-h"><h3 id="as-stages-h" class="as-h">Etapas</h3>
    <ol class="as-stages">${stages.map((s) => `<li class="as-stage is-${s.status}">
      <span class="as-stage-mark" aria-hidden="true">${icons[STAGE_ICON[s.status]](16)}</span>
      <span class="as-stage-name">${esc(s.name)}</span><span class="as-stage-state">${STAGE_LABEL[s.status]}</span></li>`).join('')}</ol></section>`;
}

function seenHtml(artist, works, total) {
  if (!works.length) return '';
  return `<section class="as-section" aria-labelledby="as-seen-h"><h3 id="as-seen-h" class="as-h">Cuadros que has visto <span class="as-count">${works.length}/${total}</span></h3>
    <ul class="as-grid">${works.map((w) => `<li>${artFrame(w, { alt: '', cls: 'art-thumb', label: w.title, thumb: true, zoom: { group: `as-${artist.id}`, label: `Ver en grande: ${w.title}` } })}</li>`).join('')}</ul></section>`;
}

function sheetHtml(ctx, artist, story, playable) {
  const { index } = ctx;
  const progress = ctx.store.get().progress;
  const movement = index.movement(artist.movementId);
  const works = seenOf(progress, index, artist.id);
  const total = index.worksOf(artist.id).length;
  const lines = lifeLines(artist, story, movement ? movement.name : '');
  const target = playable ? playTargets(progress, index, artist.id).stage : null;
  const stages = artist.category === 'gran-maestro' ? stageList(progress, index, artist.id) : [];
  const pct = total ? Math.round((works.length / total) * 100) : 0;
  const meta = [lifeSpan(artist), artist.country].filter(Boolean).join(' · ');
  return `<div class="as-body">
    <button type="button" class="icon-btn as-close" data-as="close" aria-label="Cerrar">${icons.close(22)}</button>
    <header class="as-head">
      <span class="as-seal" aria-hidden="true">${esc(initials(artist.name))}</span>
      <h2 class="as-name" id="as-name">${esc(artist.name)}</h2>
      <p class="as-meta">${esc(meta)}</p>
      ${movement ? `<p class="as-era">${esc(movement.name)}</p>` : ''}
    </header>
    <div class="as-progress" role="img" aria-label="${works.length} de ${total} cuadros vistos">
      <span class="as-bar"><span style="width:${pct}%"></span></span><span class="as-progress-text">${works.length} de ${total} vistos</span>
    </div>
    <section class="as-life">${lines.map((l) => `<p>${esc(l.text)}</p>`).join('')}${sourcesHtml(lines)}</section>
    ${artist.hint ? `<aside class="as-look"><span class="as-look-icon">${icons.eye(20)}</span><p>${esc(artist.hint)}</p></aside>` : ''}
    ${stagesHtml(stages)}
    ${seenHtml(artist, works, total)}
    ${target ? `<div class="as-actions"><button type="button" class="btn btn-primary btn-wide" data-as="play">${esc(PLAY_LABEL[target])}</button></div>` : ''}
  </div>`;
}

export function closeArtistSheet() {
  if (current) current.close();
}

// opts: { opener, playable } (playable: dentro de una ronda no se ofrece jugar).
export async function openArtistSheet(ctx, artistId, opts = {}) {
  const artist = ctx.index.artist(artistId);
  if (!artist) return null;
  closeArtistSheet();
  const opener = opts.opener || document.activeElement;
  const [story] = await Promise.all([loadStory(artistId), loadCss('css/ficha.css')]);
  const dlg = document.createElement('dialog');
  dlg.className = 'artist-sheet';
  dlg.setAttribute('aria-labelledby', 'as-name');
  dlg.setAttribute('style', accentStyle(ctx.index.movement(artist.movementId)?.accent));
  dlg.innerHTML = sheetHtml(ctx, artist, story, opts.playable !== false);
  document.body.appendChild(dlg);

  const close = () => {
    if (current !== handle) return;
    current = null;
    if (dlg.open) dlg.close();
    dlg.remove();
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
  };
  const handle = { close };
  current = handle;
  dlg.addEventListener('click', (ev) => {
    if (ev.target === dlg) return close();
    const b = ev.target.closest('[data-as]');
    if (!b) return;
    ctx.audio.sfx('tap');
    if (b.dataset.as === 'close') close();
    else if (b.dataset.as === 'play') { close(); ctx.go(`etapa-${artistId}`); }
  });
  dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); close(); });
  try { dlg.showModal(); } catch { dlg.setAttribute('open', ''); }
  dlg.querySelector('.as-close').focus({ preventScroll: true });
  return handle;
}
