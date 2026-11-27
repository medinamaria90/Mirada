// Cuadro del día hecho: el cuadro entero, «A la segunda» o «Esta vez no», de quién era, tus cuadritos, cuántos llevas y cuándo
// llega el siguiente. «Compartir» (sin pintor, título ni año: engine/cuadro-dia.js cuadroShareText), «Ver la historia» y
// «Conocer a X» (su ficha) o, si aún no lo conoces, «Lo conocerás en el camino» (ui/locked-painter-sheet.js). Recién acabado,
// la historia (3 tarjetas, ui/story-core.js) se abre sola; a quien aún no juega, al cerrarla, la invitación (ui/story-link.js).

import { esc, onAction, accentStyle, defaultAccent, focusHeading, announce } from '../dom.js';
import { icons } from '../icons.js';
import { loadCss } from '../lazy-css.js';
import { page } from '../shell.js';
import { frameHtml, wireFrame, openLarge } from '../cuadro-frame.js';
import { copyText } from './result.js';
import { madridClock } from '../../engine/dates.js';
import { isKnownArtist } from '../../engine/progress.js';
import { cuadroGrid, cuadroShareText, cuadroCount, tryLabel, nextInLabel, CUADRO_TRIES } from '../../engine/cuadro-dia.js';
import { countEvent } from '../../stats.js';

const SHARE_PAGE = (slot) => `h/cuadro-${slot}.html`; // tools/share_pages.py: abre siempre el cuadro de hoy
const STORY_DELAY_MS = 1600; // recién acabado, el resultado se disfruta un momento antes de que se abra la historia

const countLine = (k) => `Llevas ${k} ${k === 1 ? 'cuadro del día' : 'cuadros del día'}`;

function squaresHtml(record) {
  const marks = [...cuadroGrid(record)];
  const label = record.won ? `Acertado en ${record.tries} de ${CUADRO_TRIES} intentos` : `Sin acertar en ${CUADRO_TRIES} intentos`;
  return `<div class="cdd-squares is-in" role="img" aria-label="${label}">${marks.map((m) => `<span class="cdd-sq ${m === '🟩' ? 'is-hit' : m === '🟥' ? 'is-miss' : ''}"></span>`).join('')}</div>`;
}

export async function renderCuadroDone(ctx, el, data, record, { fresh = false } = {}) {
  await loadCss('css/cuadro-dia.css');
  const { index } = ctx;
  const { today, entry, work, artist } = data;
  const onboarded = ctx.store.get().onboarded;
  const p = ctx.store.get().progress;
  const known = onboarded && isKnownArtist(p, index, artist.id);
  const short = artist.short || artist.name;
  const accent = index.movement(artist.movementId)?.accent || defaultAccent();
  const meet = known ? `Conocer a ${short}` : 'Lo conocerás en el camino';
  const body = `<section class="cdd-done" style="${accentStyle(accent)}">
      <p class="cdd-kicker">Cuadro del día ${today.n}</p>
      <h1 class="cdd-title" tabindex="-1">${esc(tryLabel(record))}</h1>
      <p class="cdd-answer">${record.won ? 'Es de' : 'Era'} <strong>${esc(short)}</strong></p>
      ${frameHtml(work, entry.focus, 1, `${work.title}, en grande`)}
      <p class="cdd-caption">${esc(work.title)} · ${esc(work.year)}</p>
      ${squaresHtml(record)}
      <p class="cdd-count">${esc(countLine(cuadroCount(p)))}</p>
      <div class="cdd-actions">
        <button type="button" class="btn btn-primary btn-wide" data-action="share">${icons.share(20)}<span>Compartir</span></button>
        <div class="cdd-row">
          <button type="button" class="btn btn-secondary" data-action="story">${icons.play(18)}<span>Ver la historia</span></button>
          <button type="button" class="btn btn-secondary" data-action="meet">${esc(meet)}</button>
        </div>
        <p class="copy-status" role="status"></p>
        <textarea class="copy-fallback" readonly hidden aria-label="Texto para compartir" rows="3"></textarea>
      </div>
      <p class="cdd-next">${icons.calendar(16)}<span>El siguiente, en ${esc(nextInLabel(madridClock(new Date())))}</span></p>
    </section>`;
  el.innerHTML = onboarded ? page(ctx, 'home', body) : `<div class="cdd-guest"><main class="content" id="main">${body}</main></div>`;
  wireFrame(el);
  focusHeading(el);

  const story = () => playCuadroStory(ctx, data);
  onAction(el, {
    zoom: (b) => { ctx.audio.sfx('tap'); openLarge(ctx, work, entry.focus, 1, { reveal: true, opener: b }); },
    story: () => { ctx.audio.sfx('tap'); story(); },
    meet: (b) => {
      ctx.audio.sfx('tap');
      if (known) return ctx.go(`pintor-${artist.id}`);
      return import('../locked-painter-sheet.js').then((m) => m.openLockedPainter(ctx, artist.id, b));
    },
    share: async () => {
      ctx.audio.sfx('tap');
      const url = new URL(SHARE_PAGE(today.slot), location.href.split('#')[0]).href;
      const text = cuadroShareText(record, url);
      countEvent('cuadro/comparte');
      if (navigator.share) {
        try { await navigator.share({ text }); return; } catch (err) { if (err && err.name === 'AbortError') return; }
      }
      copyText(el, text);
    },
  });
  if (fresh) {
    announce(`${tryLabel(record)}. ${record.won ? 'Es de' : 'Era'} ${short}.`);
    const hash = location.hash;
    const timer = setTimeout(() => { if (el.isConnected && location.hash === hash && !document.querySelector('dialog[open]')) story(); }, STORY_DELAY_MS);
    ctx.setCleanup(() => clearTimeout(timer));
  }
}

// La historia del cuadro: 3 tarjetas sueltas con el núcleo de las historias. Quien aún no juega ve después la invitación.
export async function playCuadroStory(ctx, data) {
  const { today, entry, work, artist } = data;
  const [{ runStory }] = await Promise.all([import('../story-core.js'), loadCss('css/historias.css')]);
  const { shown } = await runStory(ctx, {
    cards: entry.cards,
    name: artist.name,
    label: `Historia del cuadro del día ${today.n}`,
    accent: ctx.index.movement(artist.movementId)?.accent,
    className: 'story-cuadro',
    whoHtml: `<span class="story-who"><span class="story-avatar story-avatar-icon" aria-hidden="true">${icons.frames(20)}</span>
      <span class="story-who-text"><span class="story-name">Cuadro del día ${today.n}</span><span class="story-title">${esc(work.title)}</span></span></span>`,
    onPlay: () => {},
    playLabel: 'Seguir',
    onMore: false,
  });
  if (!ctx.store.get().onboarded) {
    const { inviteToPlay } = await import('../story-link.js');
    await inviteToPlay(ctx, artist, ctx.index.artwork(shown[shown.length - 1]) || work);
  }
}
