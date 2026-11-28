// Cierre de época o de rama (#cierre-<clave>, engine/era-end.js): «Has terminado el Renacimiento», los pintores que has
// conocido en ella, dos cifras, la medalla de la época, una frase puente que invita a la siguiente y «Cruzar al <época>»
// (su medallón y presentación) o «Volver al camino». Sale una vez: al abrirse queda vista. Un brillo breve que no se ve con
// «reducir animaciones». Compartir manda la página de la época (h/epoca-<id>.html) con «He terminado… en Sfumato».
// Estilos: css/cierre.css.

import { esc, onAction, accentStyle, defaultAccent, focusHeading, announce, $ } from '../dom.js';
import { icons } from '../icons.js';
import { loadCss } from '../lazy-css.js';
import { coverOf } from '../art.js';
import { avatarHtml } from '../avatar.js';
import { playEra } from '../audio-bridge.js';
import { medalBadge } from './medals.js';
import { loadBridges, bridgeOf } from '../closure-data.js';
import { shareLink, eraUrl, NOTES } from '../story-share.js';
import { stageRoute } from '../router.js';
import { missingEssentials, allMissingEssentials, essentialStepLabel } from '../../engine/essentials.js';
import { essentialRoute } from '../../engine/next-step.js';
import { seenOf, avatarWork, avatarCrop } from '../../engine/painters.js';
import {
  parseClosureKey, isClosed, markClosureSeen, closureTitle, closurePainters, eraAfter, crossRoute, eraShort, ERA,
} from '../../engine/era-end.js';

const SPARKS = 14;
// Mosaico equilibrado: como mucho FACES_ROW retratos por fila (MANY_ROW, más pequeños y sin nombre, con más de MANY pintores).
const FACES_ROW = 4;
const MANY = 12;
const MANY_ROW = 6;
export function mosaicCols(n) {
  const max = n > MANY ? MANY_ROW : FACES_ROW;
  return Math.max(1, Math.ceil(n / Math.ceil(n / max)));
}
const MEDAL_AT_MS = 450; // la medalla suena cuando se estampa
const COLLECTION_ROUTE = 'coleccion';
const APP_NAME = 'Sfumato';

// Cuadros vistos y acertados (los de la colección) de los pintores del capítulo.
export function closureTally(progress, index, painters) {
  const owned = progress.collection || {};
  const seen = painters.flatMap((a) => seenOf(progress, index, a.id));
  return { seen: seen.length, hits: seen.filter((w) => owned[w.id]).length };
}

// Texto que se comparte.
export const shareTextOf = (title) => `${title.replace(/^Has terminado/, 'He terminado')} en ${APP_NAME}`;

function faceHtml(progress, index, artist, n) {
  const seen = seenOf(progress, index, artist.id);
  const face = avatarWork(seen);
  const work = face ? null : coverOf(index, artist.id);
  const avatar = face || (work ? { work, ...avatarCrop(work) } : null);
  const name = artist.short || artist.name;
  return `<li><button type="button" class="ce-face" style="--n:${n}" data-action="painter" data-id="${esc(artist.id)}" aria-label="${esc(artist.name)}: ver ficha">${avatarHtml(artist, avatar, 'ce-av')}<span class="ce-name">${esc(name)}</span></button></li>`;
}

const sparksHtml = () => `<div class="ce-sparks" aria-hidden="true">${Array.from({ length: SPARKS }, (_, i) => `<span style="--i:${i}"></span>`).join('')}</div>`;

// Botón principal: cruzar a la época siguiente si ya se puede; tras la última, la colección; si no, volver al camino.
function primaryOf(progress, index, closure, bridge) {
  const toEra = closure.type === ERA ? eraAfter(index, closure.id) : bridge?.to || null;
  const stepTo = (s) => (s.type === 'sala' ? `sala-${s.id}` : stageRoute(s.id));
  const route = toEra ? crossRoute(progress, index, toEra, stepTo) : null;
  if (route) return { to: route, label: `Cruzar al ${eraShort(index.movement(toEra))}` };
  // Época sin cruzar por sus imprescindibles (o el final del camino sin todos): primero, el que falta.
  const must = closure.type === ERA ? (toEra ? missingEssentials(progress, index, closure.id) : allMissingEssentials(progress, index))[0] : null;
  if (must) return { to: essentialRoute(progress, index, must), label: essentialStepLabel(index, must) };
  if (closure.type === ERA && !toEra) return { to: COLLECTION_ROUTE, label: 'Ver tu colección' };
  return null;
}

export async function renderEraEnd(ctx, el, key) {
  const { index } = ctx;
  const closure = parseClosureKey(index, key);
  const p0 = ctx.store.get().progress;
  if (!closure || !isClosed(p0, index, closure)) return ctx.go('inicio', { replace: true });
  const [data] = await Promise.all([loadBridges().catch((err) => { console.info('Frases puente no disponibles:', err.message); return null; }), loadCss('css/cierre.css')]);
  if (!el.isConnected) return;
  // Visto en cuanto se abre: no vuelve a salir.
  ctx.store.update((s) => ({ ...s, progress: markClosureSeen(s.progress, index, closure.key, ctx.today()) }));
  const p = ctx.store.get().progress;
  const movement = closure.type === ERA ? index.movement(closure.id) : index.movement(index.branch(closure.id)?.movementId);
  const accent = movement?.accent || defaultAccent();
  const title = closureTitle(index, closure);
  const painters = closurePainters(index, closure);
  const tally = closureTally(p, index, painters);
  const bridge = bridgeOf(data, closure);
  const primary = primaryOf(p, index, closure, bridge);
  const medal = closure.type === ERA && p.medals?.[`movement-${closure.id}`] ? `<div class="ce-medal">${medalBadge(ctx, `movement-${closure.id}`, true, 'lg')}</div>` : '';
  const kicker = closure.type === ERA ? movement?.period || '' : 'Rama';
  const main = primary
    ? `<button class="btn btn-primary btn-wide" data-action="go" data-to="${esc(primary.to)}" data-primary>${icons.next(20)}<span>${esc(primary.label)}</span></button>`
    : '<button class="btn btn-primary btn-wide" data-action="back" data-primary>Volver al camino</button>';
  const back = primary ? '<button class="btn btn-secondary" data-action="back">Volver al camino</button>' : '';
  el.innerHTML = `<div class="ce${painters.length > MANY ? ' is-many' : ''}" style="${accentStyle(accent)};--cols:${mosaicCols(painters.length)}">
    ${sparksHtml()}
    <main class="ce-body" id="main">
      ${medal}
      <p class="ce-kicker">${esc(kicker)}</p>
      <h1 class="ce-title">${esc(title)}</h1>
      <ul class="ce-faces" aria-label="Pintores que has conocido">${painters.map((a, i) => faceHtml(p, index, a, i)).join('')}</ul>
      <dl class="ce-tally">
        <div><dt>Cuadros vistos</dt><dd>${tally.seen}</dd></div>
        <div><dt>Acertados</dt><dd>${tally.hits}</dd></div>
      </dl>
      ${bridge ? `<p class="ce-bridge">${esc(bridge.text)}</p>` : ''}
    </main>
    <footer class="ce-foot">
      <p class="copy-status" role="status"></p>
      ${main}
      <div class="ce-row${back ? '' : ' is-one'}">${back}<button class="btn btn-secondary ce-share" data-action="share" aria-label="Compartir">${icons.share(20)}${back ? '' : '<span>Compartir</span>'}</button></div>
    </footer>
  </div>`;

  playEra(movement?.era || 'menu');
  ctx.audio.sfx('complete');
  if (medal) setTimeout(() => ctx.audio.sfx('medal'), MEDAL_AT_MS);
  focusHeading(el);
  announce(`${title}. ${tally.seen} cuadros vistos, ${tally.hits} acertados.${bridge ? ` ${bridge.text}` : ''}`);

  onAction(el, {
    go: (b) => { ctx.audio.sfx('tap'); ctx.go(b.dataset.to, { replace: true }); },
    back: () => { ctx.audio.sfx('tap'); ctx.go('inicio', { replace: true }); },
    painter: (b) => { ctx.audio.sfx('tap'); ctx.go(`pintor-${b.dataset.id}`); },
    share: async () => {
      ctx.audio.sfx('tap');
      const url = closure.type === ERA ? eraUrl(closure.id) : new URL('./', location.href).href;
      const result = await shareLink({ url, title: movement?.name || title, text: shareTextOf(title) });
      const note = NOTES[result];
      const status = $('.copy-status', el);
      if (note && status) { status.textContent = note; status.classList.add('is-visible'); }
    },
  });
}
