// Página de una obra, abierta desde «Ver más» del dato curioso en la hoja de feedback: el cuadro grande (abre el visor
// con la lupa), título, año y pintor (su ficha), el dato curioso, la explicación larga si la hay y la ficha de museo (las fuentes, en «Fuentes y créditos»).
// Va en un diálogo a pantalla completa, sin cambiar de ruta, para no perder la ronda; el «atrás» del móvil lo cierra
// (entrada de historial propia, marcada también como guarda de la ronda para que la ronda no lo tome por salir).

import { esc, accentStyle } from './dom.js';
import { icons } from './icons.js';
import { artFrame } from './art.js';
import { avatarHtml } from './avatar.js';
import { loadCss } from './lazy-css.js';
import { ensureFicha, museumLine } from './ficha-data.js';
import { modalSlot } from './modal-slot.js';
import { avatarWork, lifeSpan, seenOf } from '../engine/painters.js';

const slot = modalSlot();
const HISTORY_STATE = { miradaGuard: true, miradaWork: true };

function factsHtml(work) {
  const facts = [['Museo', museumLine(work)], ['Técnica', work.technique], ['Medidas', work.dimensions]].filter(([, v]) => v);
  return facts.length ? `<dl class="ws-facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : '';
}

function pageHtml(ctx, work) {
  const { index } = ctx;
  const artist = index.artist(work.artistId);
  const face = artist ? avatarWork(seenOf(ctx.store.get().progress, index, artist.id)) : null;
  // Autor real de la obra (`by`) cuando la parada agrupa a varios (p. ej. los hermanos Lorenzetti); la ficha es la de la parada.
  const name = work.by || artist?.name || '';
  const painter = artist ? `<button type="button" class="ws-artist" data-artist="${esc(artist.id)}" aria-label="${esc(name)}: ver ficha del pintor">
      <span class="ws-face">${avatarHtml(artist, face)}</span>
      <span class="ws-artist-txt"><span class="ws-artist-name">${esc(name)}</span><span class="ws-artist-meta">${esc([lifeSpan(artist), index.movement(artist.movementId)?.name].filter(Boolean).join(' · '))}</span></span>
      ${icons.next(18)}</button>` : '';
  const curio = work.curio ? `<p class="ws-curio"><span class="ws-curio-mark" aria-hidden="true">${icons.spark(20)}</span><span>${esc(work.curio.text)}</span></p>` : '';
  const about = work.about ? `<section class="ws-about" aria-labelledby="ws-about-h"><h3 id="ws-about-h" class="ap-h">La obra</h3>
      ${work.about.text.map((t) => `<p>${esc(t)}</p>`).join('')}</section>` : '';
  return `<button type="button" class="ap-close" data-ws="close" aria-label="Cerrar">${icons.close(22)}</button>
    <div class="ws-stage">${artFrame(work, { alt: '', cls: 'ws-art', label: work.title, eager: true, zoom: { label: `Ver en grande: ${work.title}` } })}</div>
    <header class="ws-head">
      <h2 class="ws-title" id="ws-title">${esc(work.title)}</h2>
      ${work.year ? `<p class="ws-year">${esc(work.year)}</p>` : ''}
      ${painter}
    </header>
    ${curio}${about}${factsHtml(work)}`;
}

export async function openArtworkSheet(ctx, workId, opts = {}) {
  const work = ctx.index.artwork(workId);
  if (!work) return null;
  const turn = slot.begin();
  const opener = opts.opener || document.activeElement;
  await Promise.all([loadCss('css/ficha.css'), loadCss('css/obra.css'), ensureFicha(ctx.index)]);
  if (slot.stale(turn)) return null;
  const dlg = document.createElement('dialog');
  dlg.className = 'artist-sheet work-sheet';
  dlg.setAttribute('aria-labelledby', 'ws-title');
  dlg.setAttribute('style', accentStyle(ctx.index.movement(ctx.index.artist(work.artistId)?.movementId)?.accent));
  dlg.innerHTML = `<div class="ap ws ap-in-dialog">${pageHtml(ctx, work)}</div>`;
  document.body.appendChild(dlg);

  // Atrás del móvil: una entrada de historial propia. Al volver a ella desde el visor (abierto encima) sigue abierta.
  let pushed = false;
  const prevRestoration = 'scrollRestoration' in history ? history.scrollRestoration : null;
  try {
    if (prevRestoration) history.scrollRestoration = 'manual';
    history.pushState(HISTORY_STATE, '');
    pushed = true;
  } catch { /* sin historial: el aspa y Esc siguen funcionando */ }
  const restoreScroll = () => { if (prevRestoration) history.scrollRestoration = prevRestoration; };

  const handle = {};
  let closed = false;
  // fromPop: ya se ha vuelto atrás (no se vuelve otra vez); silent: se va a otra ruta (no se devuelve el foco).
  function close({ fromPop = false, silent = false } = {}) {
    if (closed) return;
    closed = true;
    slot.release(handle);
    window.removeEventListener('popstate', onPop);
    window.removeEventListener('hashchange', onHash);
    if (dlg.open) dlg.close();
    dlg.remove();
    if (pushed && !fromPop && !silent) {
      const done = () => { window.removeEventListener('popstate', done); setTimeout(restoreScroll, 0); };
      window.addEventListener('popstate', done);
      history.back();
    } else restoreScroll();
    if (!silent && opener && opener.isConnected) opener.focus({ preventScroll: true });
  }
  function onPop() {
    if (history.state && history.state.miradaWork) return;
    close({ fromPop: true });
  }
  const onHash = () => close({ silent: true });
  handle.close = close;
  slot.take(handle);
  dlg.addEventListener('click', (ev) => { if (ev.target === dlg || ev.target.closest('[data-ws="close"]')) close(); });
  // Esc cierra la página y no llega a la ronda (que lo tomaría por «salir»).
  dlg.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape') return;
    ev.preventDefault();
    close();
  });
  dlg.addEventListener('cancel', (ev) => { ev.preventDefault(); close(); });
  window.addEventListener('popstate', onPop);
  window.addEventListener('hashchange', onHash);
  try { dlg.showModal(); } catch { dlg.setAttribute('open', ''); }
  dlg.querySelector('.ap-close').focus({ preventScroll: true });
  return handle;
}
