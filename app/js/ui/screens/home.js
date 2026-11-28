// Inicio: el mapa del camino (ui/screens/path-map.js) y, al terminarlo, el cierre.

import { esc, onAction, accentStyle } from '../dom.js';
import { icons } from '../icons.js';
import { page } from '../shell.js';
import { artFrame } from '../art.js';
import { renderPathMap, pathActions, watchLandscapes, scrollToCurrent, fillPendingEras, watchMapMode, HOME_MAP } from './path-map.js';
import { rememberMap } from './map-memory.js';
import { liveArt } from '../map-land.js';
import { watchReturn } from './map-return.js';
import { placeCue } from './map-cue.js';
import { startMapLife } from '../map-life.js';
import { isPathMastered, stepsToMaster, isPathComplete, nextStep, stepStatus, artistStatus } from '../../engine/progress.js';
import { playEra } from '../audio-bridge.js';
import { weekOf, isoWeek } from '../../engine/dates.js';
import { addLevelRings } from '../deep-badges.js';
import { watchStoryPrefetch } from '../story-prefetch.js';
import { coachSeen } from '../../state/store.js';
import { allMissingEssentials, essentialStepLabel, essentialOpen } from '../../engine/essentials.js';
import { deepRoute, stageRoute } from '../router.js';

export function renderHome(ctx, el) {
  const { index } = ctx;
  const state = ctx.store.get();
  const p = state.progress;
  const complete = isPathComplete(p, index);
  // «Camino completo» solo con todo dominado; si quedan paradas por repasar, se dice cuántas.
  // El final del camino pide, además, todos los imprescindibles (engine/essentials.js): si falta alguno, se dice cuál.
  const must = isPathMastered(p, index) ? allMissingEssentials(p, index) : [];
  const mastered = isPathMastered(p, index) && !must.length;
  const pending = complete && !mastered ? stepsToMaster(p, index) : [];

  // Los cuadros vistos: los mismos que cuentan Colección y el perfil (una sola palabra y una sola cifra).
  const seen = Object.keys(p.collection || {}).filter((id) => index.artwork(id)).length;
  let finale = '';
  if (mastered) {
    finale = `<section class="finale" aria-label="Camino completo">
      <span class="finale-icon">${icons.laurel(30)}</span>
      <h2 class="finale-title">Camino completo</h2>
      <p class="finale-count"><strong>${seen}</strong> ${seen === 1 ? 'cuadro visto' : 'cuadros vistos'}</p>
      <div class="finale-actions">
        <button class="btn btn-primary btn-wide" data-action="free">${icons.shuffle(20)}<span>Ronda libre</span></button>
        <button class="btn btn-secondary btn-wide" data-action="weekly">${icons.target(20)}<span>Reto semanal</span></button>
      </div>
    </section>`;
  } else if (must.length) {
    finale = `<section class="finale" aria-label="Por terminar">
      <span class="finale-icon">${icons.lock(26)}</span>
      <h2 class="finale-title">${esc(essentialStepLabel(index, must[0]))}</h2>
      <div class="finale-actions">
        <button class="btn btn-primary btn-wide" data-action="essential" data-to="${esc(essentialOpen(p, index, must[0]) ? deepRoute(must[0].artistId, must[0].level) : stageRoute(must[0].artistId))}">Ir</button>
      </div>
    </section>`;
  } else if (pending.length) {
    const first = pending[0];
    const firstName = first.type === 'sala' ? index.movement(first.id).name : index.artist(first.id).name;
    finale = `<section class="finale" aria-label="Por terminar">
      <span class="finale-icon">${icons.repeat(28)}</span>
      <h2 class="finale-title">${pending.length === 1 ? 'Te queda 1 parada' : `Te quedan ${pending.length} paradas`}</h2>
      <div class="finale-actions">
        <button class="btn btn-primary btn-wide" data-action="${first.type === 'sala' ? 'sala' : 'stage'}" data-id="${esc(first.id)}">${icons.repeat(20)}<span>Volver a ${esc(firstName)}</span></button>
      </div>
    </section>`;
  }
  el.innerHTML = page(ctx, 'home', `
    <h1 class="sr-only">Tu camino</h1>
    <div class="home-grid">
      <aside class="home-side">${sideExtras(ctx)}</aside>
      <div class="home-main">
        <a class="skip-link" href="#parada" data-action="goto-current">Ir a tu parada</a>
        <ol class="path path-map" aria-label="Camino por movimientos, del Renacimiento arriba hacia tu museo">${renderPathMap(ctx, { lazy: true })}</ol>
        ${finale}
      </div>
    </div>`);

  playEra('menu');
  watchLandscapes(el);
  liveArt(el);
  // Las épocas lejanas se pintan después, una por tarea; el modo del mapa sigue al tamaño de letra y ventana, y
  // el mapa vive: luz según la hora, viento, agua y carruaje (map-life.js).
  const map = el.querySelector('.path-map');
  const life = startMapLife(map);
  // Pintores nuevos de una actualización: etiqueta «Nuevo» y aviso (se carga solo si los hay).
  const news = ctx.store.get().progress.roster?.fresh?.length ? import('../new-painters.js') : null;
  const tagNew = () => news?.then((m) => m.tagNewStops(ctx, el)).catch((err) => console.error(err));
  // Al salir, se guarda dónde estaba la vista: se vuelve exactamente ahí (map-memory.js).
  // Historias de la parada actual y de los pintores con niveles a la vista: su tarjeta se pinta sin esperar (story-prefetch.js).
  let stories = null;
  // Lo que recomienda el itinerario (engine/next-step.js, cargado después de pintar: no pesa en el arranque) lleva una burbuja con
  // un verbo sobre su parada (map-cue.js); la píldora flotante (map-return.js) lo lanza si su parada no se ve o no la tiene.
  const returnBtn = watchReturn(el, (step) => { ctx.audio.sfx('tap'); ctx.go(step.to); });
  let recommended = null;
  let ready = false;   // el itinerario se calcula tras pintar: hasta entonces no se señala nada
  const showCue = () => {
    if (!ready || !el.isConnected) return;
    const status = recommended?.artistId ? artistStatus(ctx.store.get().progress, index, recommended.artistId) : '';
    returnBtn.set(recommended, placeCue(el, recommended, status === 'started'));
  };
  Promise.all([import('../../engine/next-step.js'), import('../last-step.js'), import('../../engine/deepen.js')]).then(([m, last, deepen]) => {
    recommended = m.mapRecommendation(ctx.store.get().progress, index, ctx.today(), { week: isoWeek(ctx.dailyDay()).key, prevStep: last.lastStep() });
    ready = true;
    showCue();
    if (!recommended || !el.isConnected) return;
    // Lo que enseña el mapa cuenta como recomendado: lo de atrás no sale justo después en el resultado.
    if (recommended.kind !== 'stop') last.rememberStep(recommended.kind);
    // «Profundiza en…» a la vista: cuenta para la rotación (jugar otra cosa la salta: engine/deepen.js).
    if (recommended.kind === 'deepen') ctx.store.update((s) => ({ ...s, progress: deepen.noteOffer(s.progress, ctx.index, recommended.offer) }));
  }).catch((err) => console.error(err));
  const stops = [() => rememberMap(HOME_MAP, map), fillPendingEras(ctx, el, () => { watchLandscapes(el); addLevelRings(ctx, el); tagNew(); life.refresh(); stories?.refresh(); showCue(); }), watchMapMode(map), life.stop, () => returnBtn.stop(), () => stories?.stop()];
  addLevelRings(ctx, el);
  stories = watchStoryPrefetch(el);
  // Desplazamiento rápido por épocas (map-scrubber.js), cargado después de pintar: no pesa en el arranque.
  let scrubStop = () => {};
  let scrubLeft = false;
  import('./map-scrubber-items.js').then((m) => { if (!scrubLeft) scrubStop = m.mountHomeScrubber(ctx, el); }).catch((err) => console.error(err));
  stops.push(() => { scrubLeft = true; scrubStop(); });
  tagNew();
  news?.then((m) => m.tellNewPainters(ctx, el)).catch((err) => console.error(err));
  // Primera vez: guía de tres pasos (se retira al salir de la pantalla).
  if (!coachSeen()) {
    let stop = () => {};
    let left = false;
    import('../coach.js').then((m) => { if (!left) stop = m.maybeStartCoach(el); }).catch((err) => console.error(err));
    stops.push(() => { left = true; stop(); });
  }
  ctx.setCleanup(() => stops.forEach((fn) => fn()));

  onAction(el, {
    ...pathActions(ctx),
    collection: () => {
      ctx.audio.sfx('tap');
      ctx.go('coleccion');
    },
    essential: (b) => {
      ctx.audio.sfx('tap');
      ctx.go(b.dataset.to);
    },
    free: () => {
      ctx.audio.sfx('tap');
      ctx.go('ronda-libre');
    },
    weekly: () => {
      ctx.audio.sfx('tap');
      ctx.go('reto-semanal');
    },
  });
}

// Escritorio: bajo las tarjetas del día, la semana y las últimas obras reconocidas (la columna
// lateral no se queda vacía). En el móvil no se muestra: ya está en Perfil y Colección.
function sideExtras(ctx) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const today = ctx.today();
  const days = new Set(p.streak.days);
  const labels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const week = weekOf(today);
  const active = week.filter((d) => days.has(d)).length;
  const cells = week.map((d, i) => `<span class="day ${days.has(d) ? 'is-on' : ''} ${d === today ? 'is-today' : ''}"><span class="day-dot"></span><span class="day-label">${labels[i]}</span></span>`).join('');
  const recent = Object.entries(p.collection)
    .filter(([id]) => index.artwork(id))
    .sort((a, b) => (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0))
    .slice(0, 4)
    .map(([id]) => index.artwork(id));
  const owned = Object.keys(p.collection).filter((id) => index.artwork(id)).length;
  const coll = recent.length
    ? `<button class="side-coll" data-action="collection" aria-label="Colección: ${owned} ${owned === 1 ? 'obra' : 'obras'}">
        <span class="side-head"><span class="side-title">Colección</span><span class="side-count">${owned}</span><span class="side-go" aria-hidden="true">${icons.next(18)}</span></span>
        <span class="side-thumbs">${recent.map((w) => artFrame(w, { cls: 'side-thumb', alt: '', label: '', thumb: true })).join('')}</span>
      </button>`
    : '';
  return `<div class="side-extras">
      ${sideNow(ctx)}
      <section class="side-week" aria-label="${active} días con práctica esta semana">
        <span class="side-head"><span class="side-title">Esta semana</span><span class="side-count">${active}/7</span></span>
        <div class="week" aria-hidden="true">${cells}</div>
      </section>
      ${coll}
    </div>`;
}

// Escritorio: la época actual, su avance y la siguiente parada, con su botón (lo mismo que el nodo del mapa).
function sideNow(ctx) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const cur = nextStep(p, index);
  if (!cur) return '';
  const m = index.movement(cur.movementId);
  const steps = index.stepsOf(m.id);
  const done = steps.filter((s) => stepStatus(p, index, s) === 'mastered').length;
  const status = stepStatus(p, index, cur);
  const name = cur.type === 'sala' ? 'Conoce el movimiento' : index.artist(cur.id).name;
  return `<section class="side-now" style="${accentStyle(m.accent)}" aria-labelledby="side-now-h">
      <span class="side-head"><span class="side-title" id="side-now-h">${esc(m.name)}</span><span class="side-count">${done}/${steps.length}</span></span>
      <span class="side-bar" role="img" aria-label="${done} de ${steps.length} paradas"><span style="width:${Math.round((done / steps.length) * 100)}%"></span></span>
      <p class="side-next">Siguiente: <strong>${esc(name)}</strong></p>
      <button class="btn btn-primary btn-wide" data-action="${cur.type === 'sala' ? 'sala' : 'stage'}" data-id="${esc(cur.id)}" data-status="${status}">${status === 'started' ? 'Seguir' : 'Empezar'}</button>
    </section>`;
}

export { scrollToCurrent };
