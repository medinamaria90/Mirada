// Test de cultura pictórica (app/test/index.html): arranque y pantallas. La portada va escrita en
// el HTML; aquí se cargan catálogo, preguntas fijas y ajustes, se arma la bolsa por tramos
// (test/bolsa.js), cada partida sortea sus 40 (test/sorteo.js), se juega el test adaptativo
// (test/motor.js) y se pinta el resultado (test/resultado.js). Sin cuentas ni progreso: en
// localStorage solo el último resultado y las preguntas vistas en las últimas partidas.

import { buildIndex, mergeCatalogText } from '../engine/catalog.js';
import { createRng, randomSeed } from '../engine/rng.js';
import { dayKey } from '../engine/dates.js';
import { $, $$, onAction, announce } from '../ui/dom.js';
import { installArtListeners } from '../ui/art.js';
import { upgradeMarcos } from '../ui/marco.js';
import { createTest, answer, advance, finish, summary, isAnswered, perfectScore } from './motor.js';
import { buildResult, shareText, testLevelName } from './resultado.js';
import { validateBank, viewOf, prefixImages } from './preguntas.js';
import { buildBolsa } from './bolsa.js';
import { drawGame, startHistory, markSeen } from './sorteo.js';
import { revealTitle } from '../ui/title-slot.js';
import { unveil } from '../ui/signature-veil.js';
import { barHtml, questionHtml, feedbackHtml, resultHtml, errorHtml, CHEER_UP } from './pantallas.js';
import { setupSound, play } from './sonido.js';
import { createLeaveGuard } from './salida.js';
import { revealAnswers, resetReveal } from './revelar.js';
import { STORAGE_KEY } from '../state/store.js';

const LAST_KEY = 'mirada.test.last';
const RECENT_KEY = 'mirada.test.recent';
const IMG_PREFIX = '../';
const FEEDBACK_FOCUS_MS = 340;
const KEY_OPTIONS = ['1', '2', '3', '4'];
const ALT_WORK = 'Cuadro para identificar';

// Contador de visitas sin cookies (js/stats.js; vacío por defecto: no pide nada). En diferido.
const stats = (path) => import('../stats.js').then((m) => m.countEvent(path)).catch(() => {});
setTimeout(() => import('../stats.js').then((m) => m.startStats()).catch(() => {}), 3000);
// Música propia del test (test/musica.js): suena tras el primer toque si está encendida en la app.
import('./musica.js').then((m) => m.startTestMusic()).catch(() => {});

// Mudanza de dirección (state/mudanza.js, ui/move-redirect.js), como en la app: llegada con lo guardado (el test de
// cultura incluido) y, en la dirección antigua, paso a la nueva. Mismos valores que MOVE_PREFIX y OLD_HOST.
const MOVE_HASH = '#mudanza=';
const OLD_HOSTNAME = 'sfumato-arte.onrender.com';
const localStore = (() => { try { return window.localStorage; } catch { return null; } })();
if ((location.hash || '').startsWith(MOVE_HASH)) {
  const { receiveMove } = await import('../state/mudanza.js');
  const got = await receiveMove(localStore, STORAGE_KEY, location.hash).catch(() => ({ route: '' }));
  history.replaceState(null, '', `${location.pathname}${location.search}${got.route}`);
} else if (location.hostname === OLD_HOSTNAME) {
  import('../ui/move-redirect.js').then((m) => m.moveToNewHome({ storage: localStore, stateKey: STORAGE_KEY })).catch(() => {});
}

const root = document.getElementById('test');
const home = $('.test-home');

async function loadJson(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Los textos (pistas de cada obra) y los ajustes de tramos son opcionales: sin ellos, pista del
// pintor y tramos de la regla.
const optional = (path) => loadJson(path).catch(() => null);

// Catálogo, preguntas fijas y ajustes se piden ya, en paralelo, mientras se lee la portada.
const data = Promise.all([loadJson('../data/catalog.json'), loadJson('preguntas.json'), optional('../data/catalog-text.json'), optional('tramos.json')]).then(([catalog, bank, text, adjustments]) => {
  const index = prefixImages(buildIndex(catalog), IMG_PREFIX);
  mergeCatalogText(index, text);
  const problems = validateBank(bank, index);
  if (problems.length) throw new Error(problems[0]);
  return { index, fixed: bank.questions, bolsa: buildBolsa(index, { fixed: bank.questions, adjustments }) };
});
data.catch(() => { /* se informa al pulsar «Empezar» */ });

let state = null;
let view = null;
let ctx = null;

installArtListeners(document);

// ---------------------------------------------------------------- Portada
function readLast() {
  try {
    const v = JSON.parse(localStorage.getItem(LAST_KEY));
    return v && Number.isFinite(v.correct) && Number.isFinite(v.asked) && typeof v.level === 'string' ? v : null;
  } catch {
    return null;
  }
}

function saveLast(result) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify({ correct: result.correct, asked: result.asked, level: result.level, percentile: result.percentile, score: result.score, grid: result.grid, date: dayKey(new Date()) }));
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

// Preguntas vistas en las últimas partidas (sorteo.js): lista de partidas, cada una con sus ids.
function readHistory() {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY));
    return Array.isArray(v) ? v.filter((g) => Array.isArray(g) && g.every((id) => typeof id === 'string')) : [];
  } catch {
    return [];
  }
}

let seen = [];
function saveHistory(next) {
  seen = next;
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(seen));
  } catch {
    /* sin almacenamiento: la siguiente partida sortea sin historial */
  }
}

// Las 40 de esta partida; si el sorteo fallara (catálogo raro), las fijas.
function newGame() {
  const before = readHistory();
  const game = drawGame(ctx.bolsa, createRng(randomSeed()), before);
  const bank = validateBank({ questions: game }, ctx.index).length ? ctx.fixed : game;
  saveHistory(startHistory(before));
  return bank;
}

function showLast() {
  const last = readLast();
  const line = $('.test-last', home);
  if (!last || !line) return;
  const level = testLevelName(last.level);
  line.textContent = `La última vez: ${last.correct} de ${last.asked}${level ? ` · ${level}` : ''}`;
  line.hidden = false;
}

function showHome() {
  root.hidden = true;
  root.innerHTML = '';
  home.hidden = false;
  showLast();
  document.documentElement.classList.remove('is-playing');
}

async function start() {
  const btn = $('[data-action="start"]', home);
  btn.setAttribute('aria-disabled', 'true');
  try {
    ctx = await data;
  } catch {
    home.hidden = true;
    root.hidden = false;
    root.innerHTML = errorHtml();
    return;
  } finally {
    btn.removeAttribute('aria-disabled');
  }
  stats('test/empieza');
  play('tap');
  const bank = newGame();
  ctx = { ...ctx, maxScore: perfectScore(bank) };
  state = createTest(bank);
  home.hidden = true;
  root.hidden = false;
  document.documentElement.classList.add('is-playing');
  root.innerHTML = `<div class="lesson test-lesson">${barHtml(state)}<div class="lesson-stage" id="main"></div><div class="feedback" role="status" aria-live="polite"></div></div>`;
  leaveGuard.arm();
  renderQuestion();
}

// ---------------------------------------------------------------- Pregunta y feedback
function renderQuestion(cheer = '') {
  const q = state.current;
  view = viewOf(ctx.index, q);
  saveHistory(markSeen(seen, q.id));
  const stage = $('.lesson-stage', root);
  const bar = $('.test-bar', root);
  if (bar) bar.outerHTML = barHtml(state);
  stage.dataset.type = view.kind;
  resetReveal(root);
  stage.classList.remove('enter');
  stage.innerHTML = questionHtml(view, state.answers.length + 1, { cheer });
  upgradeMarcos(stage);
  requestAnimationFrame(() => stage.classList.add('enter'));
  const feedback = $('.feedback', root);
  feedback.className = 'feedback';
  feedback.innerHTML = '';
  window.scrollTo(0, 0);
  const h = $('.q-prompt', stage);
  h.setAttribute('tabindex', '-1');
  h.focus({ preventScroll: true });
}

// Visor a pantalla completa (ui/viewer.js, diferido: no cuenta en el arranque). Sin responder no
// revela nada; en «¿Cuál es de X?» lleva las 4 miniaturas y «Es este» responde con la que se ve.
// Tras responder, el visor muestra las fichas (título, autor y año).
let viewerMod = null;
const loadViewer = () => (viewerMod ? Promise.resolve(viewerMod) : import('../ui/viewer.js').then((m) => { viewerMod = m; return m; }));
function zoom(opener, start = 0) {
  if (!state || state.status !== 'playing' || !view) return;
  const which = view.kind === 'which';
  const works = which ? view.options.map((o) => o.artwork) : [view.artwork];
  const reveal = isAnswered(state);
  const askedId = state.current.id;
  loadViewer().then((m) => {
    if (!state || state.status !== 'playing' || state.current.id !== askedId || isAnswered(state) !== reveal) return;
    m.openViewer({
      index: ctx.index, works, start, reveal, opener,
      label: which ? view.prompt : reveal ? null : ALT_WORK,
      title: which ? view.prompt : null,
      pick: which && !reveal ? { label: 'Es este', onPick: (i) => choose(view.options[i].id) } : null,
    });
  }).catch((err) => console.error(err));
}

function choose(optionId) {
  if (!state || state.status !== 'playing' || isAnswered(state)) return;
  state = answer(state, optionId);
  const correct = optionId === view.answer;
  for (const b of $$('.lesson-stage .option', root)) {
    // Las miniaturas siguen activas tras responder: abren el visor, ya con las fichas.
    if (b.classList.contains('option-art')) b.setAttribute('aria-label', `${b.getAttribute('aria-label')}: ver en grande`);
    else b.setAttribute('aria-disabled', 'true');
    b.classList.add('is-done');
    if (b.dataset.id === view.answer) b.classList.add('is-correct');
    else if (b.dataset.id === optionId) {
      b.classList.add('is-wrong');
      if (view.kind === 'which') b.insertAdjacentHTML('beforeend', `<span class="option-tag">${view.artistOf(optionId)}</span>`);
    }
    if (b.dataset.id === optionId) b.classList.add('is-picked');
  }
  unveil(root);
  if (view.kind !== 'which') revealTitle(root, view.artwork.title);
  play(correct ? 'correct' : 'wrong');
  const feedback = $('.feedback', root);
  feedback.innerHTML = feedbackHtml(view, correct);
  feedback.classList.add('is-open', correct ? 'is-correct' : 'is-wrong');
  announce(`${correct ? 'Acierto' : 'Fallo'}. ${correct ? '' : `Era ${view.answerText}. `}${view.hint}`);
  requestAnimationFrame(() => revealAnswers(root));
  setTimeout(() => $('[data-action="continue"]', feedback)?.focus({ preventScroll: true }), FEEDBACK_FOCUS_MS);
}

function next() {
  if (!state || state.status !== 'playing' || !isAnswered(state)) return;
  const tier = state.tier;
  state = advance(state);
  render(state.tier > tier ? CHEER_UP : '');
}

function render(cheer = '') {
  if (state.status === 'done') return showResult();
  if (!$('.lesson-stage', root) || !$('.feedback', root)) {
    root.innerHTML = `<div class="lesson test-lesson">${barHtml(state)}<div class="lesson-stage" id="main"></div><div class="feedback" role="status" aria-live="polite"></div></div>`;
  }
  renderQuestion(cheer);
}

// ---------------------------------------------------------------- Resultado
let lastResult = null;

function showResult() {
  state = finish(state);
  document.documentElement.classList.remove('is-playing');
  lastResult = buildResult(summary(state), ctx.maxScore);
  saveLast(lastResult);
  play('complete');
  stats('test/termina');
  stats(`test/tramo-${lastResult.top.id}`);
  root.innerHTML = resultHtml(lastResult);
  window.scrollTo(0, 0);
  $('.result-title', root).focus({ preventScroll: true });
  announce(`${lastResult.level}. Has acertado ${lastResult.correct} de ${lastResult.asked}.`);
}

async function share() {
  const url = location.href.split('#')[0];
  const text = shareText(lastResult, url);
  stats('test/comparte');
  const status = $('.copy-status', root);
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch {
      /* cancelado o sin soporte real: se copia */
    }
  }
  let ok = false;
  try {
    await navigator.clipboard.writeText(text);
    ok = true;
  } catch {
    const fallback = $('.copy-fallback', root);
    fallback.hidden = false;
    fallback.value = text;
    fallback.select();
    ok = Boolean(document.execCommand && document.execCommand('copy'));
  }
  status.textContent = ok ? 'Copiado. Pégalo donde quieras.' : 'Copia el texto de abajo.';
  status.classList.add('is-visible');
}

// ---------------------------------------------------------------- Eventos
onAction(document.body, {
  start,
  answer: (b) => choose(b.dataset.id),
  pick: (b) => { play('tap'); zoom(b, Number(b.dataset.pos) || 0); },
  zoom: (b) => { play('tap'); zoom(b); },
  continue: () => { play('tap'); next(); },
  finish: () => { if (state && state.status !== 'done') { state = finish(state); showResult(); } },
  share,
  restart: () => { play('tap'); backToHome(); },
  'leave-ask': () => { play('tap'); leaveGuard.ask(); },
  'leave-stay': () => { play('tap'); leaveGuard.stay(); },
  'leave-go': () => { play('tap'); leaveGuard.leave(); },
});

function backToHome() {
  leaveGuard.disarm();
  state = null;
  lastResult = null;
  showHome();
}

// Salir a medias pide confirmación (aspa, Esc y «atrás»); con el resultado en pantalla, «atrás» vuelve a la portada.
const leaveGuard = createLeaveGuard(document, window, {
  phase: () => (!state ? null : state.status === 'done' ? 'done' : 'playing'),
  onLeave: () => { state = null; lastResult = null; showHome(); },
  onBackFromResult: () => { state = null; lastResult = null; showHome(); },
});

document.addEventListener('keydown', (ev) => {
  // Con el visor abierto, el teclado es suyo (flechas, Esc, «Es este»).
  if (!state || ev.altKey || ev.ctrlKey || ev.metaKey || document.querySelector('.viewer')) return;
  if (ev.key === 'Escape') {
    if (leaveGuard.onEscape()) ev.preventDefault();
    return;
  }
  if (state.status !== 'playing' || leaveGuard.isOpen()) return;
  if (KEY_OPTIONS.includes(ev.key) && !isAnswered(state)) {
    const b = $$('.lesson-stage .option', root)[Number(ev.key) - 1];
    if (b) { ev.preventDefault(); choose(b.dataset.id); }
  } else if (ev.key === 'Enter' && isAnswered(state) && !ev.target.closest('button, a')) {
    ev.preventDefault();
    next();
  }
});

setupSound(localStore);
showLast();
