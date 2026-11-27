// Cuadro del día (#cuadro-del-dia; #reto-diario y los enlaces de reto antiguos llevan aquí): «¿De quién es?» con un detalle muy
// ampliado, 6 pintores en 2 columnas y 4 intentos. Cada fallo apaga ese nombre y enseña más (engine/cuadro-dia.js). Al acabar,
// se guarda una sola vez (XP, racha, medallas) y se pasa a la pantalla de hecho con su historia (cuadro-dia-hecho.js). Si ya
// está hecho hoy, va directa a esa pantalla. La partida a medias se recuerda en este navegador (volver a entrar no regala
// intentos). Lo puede jugar quien aún no ha empezado la app (un enlace compartido), sin pasar por la bienvenida.

import { esc, onAction, accentStyle, defaultAccent, focusHeading, announce } from '../dom.js';
import { icons } from '../icons.js';
import { loadCss } from '../lazy-css.js';
import { playEra } from '../audio-bridge.js';
import { ensureCuadroIndex, cuadroToday, loadCuadroDay } from '../cuadro-data.js';
import { frameHtml, setFrame, wireFrame, openLarge } from '../cuadro-frame.js';
import {
  newGame, guess, isOver, revealStep, hintsFor, zoomFor, misses, finishCuadro, cuadroOf, CUADRO_TRIES,
} from '../../engine/cuadro-dia.js';

const PARTIAL_KEY = 'mirada.cuadro'; // partida a medias de hoy: { day, guesses } (solo en este navegador)
const HINT_LABEL = { era: 'Época', year: 'Año', museum: 'Dónde está' };
const REVEAL_MS = 900; // tras el último intento, el cuadro entero un momento antes de pasar a la pantalla de hecho

function readPartial(day) {
  try {
    const v = JSON.parse(localStorage.getItem(PARTIAL_KEY));
    return v && v.day === day && Array.isArray(v.guesses) ? v.guesses : [];
  } catch { return []; }
}
function writePartial(day, guesses) {
  try {
    if (guesses) localStorage.setItem(PARTIAL_KEY, JSON.stringify({ day, guesses }));
    else localStorage.removeItem(PARTIAL_KEY);
  } catch { /* sin almacenamiento: la partida dura lo que la pantalla */ }
}

// Carga lo de hoy: { today, entry, work, artist } o null.
export async function loadToday(ctx) {
  await ensureCuadroIndex();
  const today = cuadroToday(ctx.dailyDay());
  if (!today) return null;
  const entry = await loadCuadroDay(today.slot);
  const work = ctx.index.artwork(entry.artwork);
  const artist = ctx.index.artist(entry.artistId);
  if (!work || !artist || entry.options.some((id) => !ctx.index.artist(id))) return null;
  return { today, entry, work, artist };
}

export async function renderCuadro(ctx, el) {
  playEra('menu');
  const [data] = await Promise.all([loadToday(ctx).catch(() => null), loadCss('css/cuadro-dia.css')]);
  if (!data) {
    ctx.toast('El cuadro del día no ha cargado', { carry: true });
    return ctx.go('inicio', { replace: true });
  }
  const day = ctx.dailyDay();
  const done = cuadroOf(ctx.store.get().progress, day);
  if (done) return import('./cuadro-dia-hecho.js').then((m) => m.renderCuadroDone(ctx, el, data, done));
  return play(ctx, el, data, day);
}

function play(ctx, el, data, day) {
  const { today, entry, work } = data;
  const { index } = ctx;
  let game = newGame();
  for (const id of readPartial(day)) game = guess(game, entry, id);
  const accent = index.movement(data.artist.movementId)?.accent || defaultAccent();
  const name = (id) => index.artist(id).short || index.artist(id).name;

  el.innerHTML = `<div class="cdd" style="${accentStyle(accent)}">
    <header class="cdd-bar">
      <button class="icon-btn" data-action="quit" aria-label="Salir">${icons.close(22)}</button>
      <p class="cdd-kicker">Cuadro del día ${today.n}</p>
      <span class="cdd-tries" aria-hidden="true">${Array.from({ length: CUADRO_TRIES }, () => '<span class="cdd-try"></span>').join('')}</span>
    </header>
    <main class="cdd-body" id="main">
      <h1 class="cdd-title" tabindex="-1">¿De quién es?</h1>
      ${frameHtml(work, entry.focus, zoomFor(game), 'Ver el detalle en grande')}
      <ul class="cdd-hints" aria-label="Pistas"></ul>
      <div class="cdd-options" role="group" aria-label="Pintores">
        ${entry.options.map((id) => `<button type="button" class="btn cdd-opt" data-action="pick" data-id="${esc(id)}">${esc(name(id))}</button>`).join('')}
      </div>
      <p class="cdd-left" aria-live="polite"></p>
    </main>
  </div>`;
  wireFrame(el);

  const paint = () => {
    const step = revealStep(game);
    setFrame(el, work, entry.focus, zoomFor(game));
    const frame = el.querySelector('.cdd-frame');
    frame.setAttribute('aria-label', step === 1 || step === 2 ? 'Ver el detalle en grande' : 'Ver el cuadro en grande');
    el.querySelector('.cdd-hints').innerHTML = hintsFor(game).map((k) => `<li class="cdd-hint"><span class="cdd-hint-k">${HINT_LABEL[k]}</span><span class="cdd-hint-v">${esc(entry.hints[k])}</span></li>`).join('');
    el.querySelectorAll('.cdd-try').forEach((t, i) => {
      t.classList.toggle('is-miss', i < misses(game));
      t.classList.toggle('is-hit', game.won && i === game.guesses.length - 1);
    });
    el.querySelectorAll('.cdd-opt').forEach((b) => {
      const id = b.dataset.id;
      const tried = game.guesses.includes(id);
      const right = isOver(game) && id === entry.artistId;
      b.classList.toggle('is-off', tried && id !== entry.artistId);
      b.classList.toggle('is-right', right);
      b.disabled = tried || isOver(game);
      b.setAttribute('aria-label', tried && id !== entry.artistId ? `${name(id)}: no` : name(id));
    });
    const left = CUADRO_TRIES - game.guesses.length;
    el.querySelector('.cdd-left').textContent = isOver(game) ? '' : left === 1 ? 'Último intento' : `Te quedan ${left} intentos`;
  };
  paint();
  focusHeading(el);

  const finish = () => {
    writePartial(day, null);
    let outcome = null;
    ctx.store.update((s) => {
      outcome = finishCuadro(s.progress, index, { date: day, n: today.n, game }, ctx.today(), { goal: s.settings.dailyGoal });
      return outcome.applied ? { ...s, progress: outcome.progress } : s;
    });
    ctx.audio.sfx(game.won ? 'correct' : 'wrong');
    const record = cuadroOf(ctx.store.get().progress, day);
    const go = () => import('./cuadro-dia-hecho.js').then((m) => m.renderCuadroDone(ctx, el, data, record, { fresh: true, events: outcome?.events || [] }));
    setTimeout(go, REVEAL_MS);
  };

  onAction(el, {
    quit: () => { ctx.audio.sfx('tap'); ctx.go('inicio'); },
    zoom: (b) => { ctx.audio.sfx('tap'); openLarge(ctx, work, entry.focus, zoomFor(game), { opener: b }); },
    pick: (b) => {
      const before = game;
      game = guess(game, entry, b.dataset.id);
      if (game === before) return;
      writePartial(day, game.guesses);
      paint();
      if (isOver(game)) {
        announce(game.won ? `Sí, es de ${name(entry.artistId)}` : `Era ${name(entry.artistId)}`);
        return finish();
      }
      ctx.audio.sfx('wrong');
      const hint = hintsFor(game).slice(-1)[0];
      const added = revealStep(game) === 3 ? 'Ahora, el cuadro entero' : '';
      announce([`No es de ${name(b.dataset.id)}.`, added, hint ? `${HINT_LABEL[hint]}: ${entry.hints[hint]}.` : ''].filter(Boolean).join(' '));
      el.querySelector('.cdd-title').focus({ preventScroll: true });
    },
  });
}
