// «Fuentes y créditos» (`#fuentes`, desde Perfil → Ajustes): las fuentes de los textos por época (con los carteles del
// camino) y por pintor, el crédito de cada imagen (archivo de Commons y licencia) y el agradecimiento a museos y
// Wikimedia. Todo sale de los datos; cada apartado
// se rellena al abrirlo (las historias y las tarjetas de época se piden entonces).

import { esc, focusHeading } from '../dom.js';
import { icons } from '../icons.js';
import { bottomNav } from '../shell.js';
import { loadCss } from '../lazy-css.js';
import { playEra } from '../audio-bridge.js';
import { loadStory } from '../story-data.js';
import { loadCards } from './era-cards.js';
import { backButton } from './artist-page.js';
import { loadSigns } from '../sign-cards.js';
import { eraSources, signSources, artistSources, imageCredits, licenseSummary } from '../../engine/credits.js';

const THANKS = 'Gracias a los museos que comparten sus colecciones y a Wikimedia (Wikipedia, Wikidata y Commons), que lo hacen posible.';
const fmt = new Intl.NumberFormat('es-ES');

const link = (url, text) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>`;
const sourceItem = (s) => `<li>${s.url ? link(s.url, s.title) : esc(s.title)}</li>`;
const imageItem = (c) => `<li>${link(c.url, c.title)}<span class="cr-meta">${esc([c.year, c.license].filter(Boolean).join(' · '))}</span></li>`;
const listHtml = (items, render) => `<ul class="cr-links">${items.map(render).join('')}</ul>`;
const emptyHtml = '<p class="cr-empty">Sin fuentes anotadas.</p>';

const group = (kind, id, name) => `<details class="cr-item" data-kind="${kind}" data-id="${esc(id)}">
    <summary class="cr-sum"><span>${esc(name)}</span><span class="cr-chev" aria-hidden="true">${icons.next(18)}</span></summary>
    <div class="cr-body" aria-busy="true"></div></details>`;

async function eraBody(movementId) {
  const sources = eraSources(await loadCards(movementId));
  return sources.length ? listHtml(sources, sourceItem) : emptyHtml;
}

async function signsBody() {
  const sources = signSources(...await Promise.all([loadSigns('rama'), loadSigns('tramo')]));
  return sources.length ? listHtml(sources, sourceItem) : emptyHtml;
}

async function artistBody(ctx, artistId) {
  const artist = ctx.index.artist(artistId);
  const works = ctx.index.worksOf(artistId);
  const sources = artistSources(artist, works, await loadStory(artistId));
  const images = imageCredits(works);
  return `<h3 class="cr-sub">Textos</h3>${sources.length ? listHtml(sources, sourceItem) : emptyHtml}
    ${images.length ? `<h3 class="cr-sub">Imágenes</h3>${listHtml(images, imageItem)}` : ''}`;
}

async function fill(ctx, details) {
  if (details.dataset.filled) return;
  details.dataset.filled = '1';
  const body = details.querySelector('.cr-body');
  const { kind, id } = details.dataset;
  try {
    body.innerHTML = kind === 'era' ? await eraBody(id) : kind === 'signs' ? await signsBody() : await artistBody(ctx, id);
  } catch (err) {
    delete details.dataset.filled; // se reintenta al volver a abrirlo
    body.innerHTML = '<p class="cr-empty">No se ha podido cargar. Prueba otra vez.</p>';
    console.info('Fuentes no disponibles:', err.message);
  }
  body.removeAttribute('aria-busy');
}

// Atrás vuelve a donde estabas; con un enlace directo, al perfil.
function back(ctx) {
  if (ctx.prevRoute()) history.back();
  else ctx.go('perfil', { replace: true });
}

export async function renderCredits(ctx, el) {
  await Promise.all([loadCss('css/fuentes.css'), loadCss('css/ficha.css'), ctx.ensureFicha()]);
  const { index } = ctx;
  const artists = index.artists.slice().sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const licenses = licenseSummary(index.artworks);
  el.innerHTML = `<div class="page page-credits"><main class="content cr" id="main">
    <header class="aw-head">${backButton()}<div class="aw-titles"><h1 class="aw-title">Fuentes y créditos</h1></div></header>
    <p class="cr-thanks">${esc(THANKS)}</p>
    <section class="cr-section" aria-labelledby="cr-eras"><h2 id="cr-eras" class="cr-h">Épocas</h2>
      <div class="cr-groups">${index.movements.map((m) => group('era', m.id, m.name)).join('')}${group('signs', 'mapa', 'Carteles del camino')}</div></section>
    <section class="cr-section" aria-labelledby="cr-artists"><h2 id="cr-artists" class="cr-h">Pintores</h2>
      <div class="cr-groups">${artists.map((a) => group('artist', a.id, a.name)).join('')}</div></section>
    ${licenses.length ? `<section class="cr-section" aria-labelledby="cr-images"><h2 id="cr-images" class="cr-h">Imágenes</h2>
      <p class="cr-text">De ${link('https://commons.wikimedia.org/', 'Wikimedia Commons')}. Cada una, con su licencia, en su pintor.</p>
      <ul class="cr-licenses">${licenses.map((l) => `<li><span>${esc(l.license)}</span><span class="cr-count">${fmt.format(l.count)}</span></li>`).join('')}</ul></section>` : ''}
  </main>${bottomNav('profile')}</div>`;
  playEra('menu');
  const main = el.querySelector('.cr');
  // «toggle» no burbujea: se escucha en captura.
  main.addEventListener('toggle', (ev) => {
    if (ev.target.open) fill(ctx, ev.target);
  }, true);
  main.querySelector('.ap-back').addEventListener('click', () => { ctx.audio.sfx('tap'); back(ctx); });
  focusHeading(el);
}
