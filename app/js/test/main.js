// Test de cultura pictórica (app/test/index.html): arranque y pantallas. La portada va escrita en
// el HTML; aquí se cargan catálogo y banco, se juega el test adaptativo (test/motor.js) y se pinta
// el resultado (test/resultado.js). Sin cuentas ni progreso: solo el último resultado en
// localStorage, bajo su propia clave.

import { buildIndex } from '../engine/catalog.js';
import { $, $$, onAction, announce } from '../ui/dom.js';
import { installArtListeners } from '../ui/art.js';
import { createTest, answer, advance, resume, finish, summary, isAnswered, perfectScore } from './motor.js';
import { buildResult, shareText } from './resultado.js';
import { validateBank, viewOf, prefixImages } from './preguntas.js';
import { barHtml, questionHtml, feedbackHtml, pauseHtml, resultHtml, errorHtml } from './pantallas.js';
import { revealAnswers, resetReveal } from './revelar.js';

const LAST_KEY = 'mirada.test.last';
const IMG_PREFIX = '../';
const FEEDBACK_FOCUS_MS = 340;
const KEY_OPTIONS = ['1', '2', '3', '4'];
const ALT_WORK = 'Cuadro para identificar';

const root = document.getElementById('test');
const home = $('.test-home');

async function loadJson(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Catálogo y banco se piden ya, en paralelo, mientras se lee la portada.
const data = Promise.all([loadJson('../data/catalog.json'), loadJson('preguntas.json')]).then(([catalog, bank]) => {
  const index = prefixImages(buildIndex(catalog), IMG_PREFIX);
  const problems = validateBank(bank, index);
  if (problems.length) throw new Error(problems[0]);
  return { index, bank: bank.questions, maxScore: perfectScore(bank.questions) };
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
    localStorage.setItem(LAST_KEY, JSON.stringify({ correct: result.correct, asked: result.asked, level: result.level, percentile: result.percentile, score: result.score }));
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

function showLast() {
  const last = readLast();
  const line = $('.test-last', home);
  if (!last || !line) return;
  line.textContent = `La última vez: ${last.correct} de ${last.asked} · ${last.level}`;
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
  state = createTest(ctx.bank);
  home.hidden = true;
  root.hidden = false;
  document.documentElement.classList.add('is-playing');
  root.innerHTML = `<div class="lesson test-lesson">${barHtml(state)}<div class="lesson-stage" id="main"></div><div class="feedback" role="status" aria-live="polite"></div></div>`;
  renderQuestion();
}

// ---------------------------------------------------------------- Pregunta y feedback
function renderQuestion() {
  const q = state.current;
  view = viewOf(ctx.index, q);
  const stage = $('.lesson-stage', root);
  const bar = $('.test-bar', root);
  if (bar) bar.outerHTML = barHtml(state);
  stage.dataset.type = view.kind;
  resetReveal(root);
  stage.classList.remove('enter');
  stage.innerHTML = questionHtml(view, state.answers.length + 1);
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
  const feedback = $('.feedback', root);
  feedback.innerHTML = feedbackHtml(view, correct);
  feedback.classList.add('is-open', correct ? 'is-correct' : 'is-wrong');
  announce(`${correct ? 'Acierto' : 'Fallo'}. ${correct ? '' : `Era ${view.answerText}. `}${view.hint}`);
  requestAnimationFrame(() => revealAnswers(root));
  setTimeout(() => $('[data-action="continue"]', feedback)?.focus({ preventScroll: true }), FEEDBACK_FOCUS_MS);
}

function next() {
  if (!state || state.status !== 'playing' || !isAnswered(state)) return;
  state = advance(state);
  render();
}

function render() {
  if (state.status === 'done') return showResult();
  if (state.status === 'pause') {
    root.innerHTML = `<div class="lesson test-lesson">${barHtml(state)}<div class="lesson-stage" id="main">${pauseHtml(state.answers.length)}</div></div>`;
    window.scrollTo(0, 0);
    $('#pause-title', root).focus({ preventScroll: true });
    return;
  }
  if (!$('.lesson-stage', root) || !$('.feedback', root)) {
    root.innerHTML = `<div class="lesson test-lesson">${barHtml(state)}<div class="lesson-stage" id="main"></div><div class="feedback" role="status" aria-live="polite"></div></div>`;
  }
  renderQuestion();
}

// ---------------------------------------------------------------- Resultado
let lastResult = null;

function showResult() {
  state = finish(state);
  document.documentElement.classList.remove('is-playing');
  lastResult = buildResult(summary(state), ctx.maxScore);
  saveLast(lastResult);
  root.innerHTML = resultHtml(lastResult);
  window.scrollTo(0, 0);
  $('.result-title', root).focus({ preventScroll: true });
  announce(`${lastResult.level}. Has acertado ${lastResult.correct} de ${lastResult.asked}.`);
}

async function share() {
  const url = location.href.split('#')[0];
  const text = shareText(lastResult, url);
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
  pick: (b) => zoom(b, Number(b.dataset.pos) || 0),
  zoom: (b) => zoom(b),
  continue: next,
  finish: () => { if (state && state.status !== 'done') { state = finish(state); showResult(); } },
  resume: () => { if (state && state.status === 'pause') { state = resume(state); render(); } },
  share,
  restart: () => { state = null; lastResult = null; showHome(); },
});

document.addEventListener('keydown', (ev) => {
  // Con el visor abierto, el teclado es suyo (flechas, Esc, «Es este»).
  if (!state || state.status !== 'playing' || ev.altKey || ev.ctrlKey || ev.metaKey || document.querySelector('.viewer')) return;
  if (KEY_OPTIONS.includes(ev.key) && !isAnswered(state)) {
    const b = $$('.lesson-stage .option', root)[Number(ev.key) - 1];
    if (b) { ev.preventDefault(); choose(b.dataset.id); }
  } else if (ev.key === 'Enter' && isAnswered(state) && !ev.target.closest('button, a')) {
    ev.preventDefault();
    next();
  }
});

showLast();
