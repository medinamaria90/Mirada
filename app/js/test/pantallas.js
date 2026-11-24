// Test de cultura pictórica: el HTML de cada pantalla (portada aparte: va escrita en index.html
// para que Google la lea). Reutiliza las clases de la app (main.css): barra, pregunta, opciones,
// hoja de feedback, resultado.

import { esc } from '../ui/dom.js';
import { artFrame, ZOOM_BADGE } from '../ui/art.js';
import { icons, logoMark } from '../ui/icons.js';
import { TIERS, PER_TIER } from './motor.js';
import { PERCENTILE_SOURCES } from './resultado.js';

const ALT_WORK = 'Cuadro para identificar';

// Barra superior: un segmento por tramo (se rellena con las preguntas jugadas de ese tramo) y
// «Ver mi resultado», disponible siempre.
export function barHtml(state) {
  const segments = TIERS.map((t) => {
    const used = state.used[t.id] || 0;
    const cls = t.id === state.tier ? ' is-current' : used ? ' is-done' : '';
    return `<span class="tier-seg${cls}" title="${esc(t.name)}"><span style="width:${Math.round((used / PER_TIER) * 100)}%"></span></span>`;
  }).join('');
  const current = TIERS.find((t) => t.id === state.tier);
  return `<div class="lesson-bar test-bar">
    <div class="tiers" role="progressbar" aria-label="Tramo ${esc(current.name)}, pregunta ${state.answers.length + 1}" aria-valuemin="0" aria-valuemax="${TIERS.length}" aria-valuenow="${state.tier}">${segments}</div>
    <button class="btn btn-ghost test-finish" data-action="finish">Ver mi resultado</button>
  </div>`;
}

export function questionHtml(view, number) {
  const head = `<p class="q-tag">Pregunta ${number}</p><h1 class="q-prompt">${esc(view.prompt)}</h1>`;
  if (view.kind === 'which') {
    // Como en la ronda de la app: tocar una miniatura NO responde, abre el visor con las 4 («Es este»
    // responde desde dentro); las teclas 1-4 responden directo.
    const opts = view.options.map((o, i) => `<button class="option option-art" data-action="pick" data-id="${esc(o.id)}" data-pos="${i}" aria-label="Opción ${i + 1}" aria-haspopup="dialog">
        ${artFrame(o.artwork, { alt: '', eager: true, label: `Opción ${i + 1}`, thumb: true })}<span class="key" aria-hidden="true">${i + 1}</span>${ZOOM_BADGE}</button>`).join('');
    return `<div class="q-head">${head}</div><div class="options options-grid" role="group" aria-label="Elige un cuadro">${opts}</div>`;
  }
  const opts = view.options.map((o, i) => `<button class="option" data-action="answer" data-id="${esc(o.id)}"><span class="key" aria-hidden="true">${i + 1}</span><span class="opt-text">${esc(o.label)}${o.detail ? `<span class="opt-sub">${esc(o.detail)}</span>` : ''}</span></button>`).join('');
  // El cuadro de la pregunta se abre en grande al tocarlo, sin responder ni revelar nada.
  return `<div class="q-head">${head}</div><div class="q-art">${artFrame(view.artwork, { alt: ALT_WORK, eager: true, cls: 'art-hero', label: 'Cuadro sin imagen', zoom: { action: 'zoom', label: `${ALT_WORK}: ver en grande` } })}</div>
    <div class="options options-list" role="group" aria-label="Respuestas">${opts}</div>`;
}

export function feedbackHtml(view, correct) {
  const title = correct ? '¡Eso es!' : 'No era esa';
  const who = correct ? '' : `<p class="fb-who">Era ${esc(view.answerText)}</p>`;
  return `<div class="fb-inner">
    <div class="fb-text">
      <div class="fb-head"><span class="fb-mark" aria-hidden="true">${correct ? icons.check(20) : icons.eye(20)}</span><p class="fb-title">${title}</p></div>
      ${who}<p class="fb-line">${esc(view.hint)}</p>
      <p class="fb-work">${esc(view.caption)}</p>
    </div>
    <button class="btn btn-primary btn-wide" data-action="continue">Seguir</button>
  </div>`;
}

export function pauseHtml(answered) {
  return `<div class="interlude test-pause">
    <h1 id="pause-title" tabindex="-1">Llevas ${answered} y vas muy bien</h1>
    <div class="pause-actions">
      <button class="btn btn-secondary btn-wide" data-action="finish">Ver mi resultado</button>
      <button class="btn btn-primary btn-wide" data-action="resume" aria-describedby="pause-title">Seguir</button>
    </div>
  </div>`;
}

export function resultHtml(result, { last = false } = {}) {
  const tally = result.tiers.map((t) => `<div><dt>${esc(t.name)}</dt><dd>${t.correct}<span class="tally-of">/${t.asked}</span></dd></div>`).join('');
  return `<section class="result test-result">
    <div class="result-body">
      <a class="brand" href="../#inicio" aria-label="Mirada, inicio">${logoMark(28)}Mirada</a>
      <p class="result-kicker">${last ? 'Tu último resultado' : 'Tu resultado'}</p>
      <h1 class="result-title" tabindex="-1">${esc(result.level)}</h1>
      <p class="result-score">Has acertado <strong>${result.correct} de ${result.asked}</strong></p>
      <p class="result-pct">Sabes más de pintura que el <strong>${result.percentile} %</strong> de la gente</p>
      <p class="result-src">${esc(PERCENTILE_SOURCES)}</p>
      <p class="result-note">${esc(result.topLabel)}</p>
      <dl class="tally" style="--n:${result.tiers.length}">${tally}</dl>
      <p class="result-cheer">${esc(result.phrase)}</p>
      <div class="result-actions">
        <button class="btn btn-primary btn-wide" data-action="share">${icons.copy(20)}Compartir</button>
        <a class="btn btn-secondary btn-wide" href="../#inicio">Sigue aprendiendo en Mirada</a>
        <button class="btn btn-ghost" data-action="restart">Repetir el test</button>
        <p class="copy-status" role="status" aria-live="polite"></p>
        <textarea class="copy-fallback" aria-label="Texto para compartir" readonly hidden></textarea>
      </div>
    </div>
  </section>`;
}

export function errorHtml() {
  return `<section class="result test-result"><div class="result-body result-compact">
    <h1 class="result-title">No se ha podido cargar el test</h1>
    <p class="result-note">Comprueba la conexión y vuelve a intentarlo.</p>
    <div class="result-actions"><a class="btn btn-primary btn-wide" href="">Reintentar</a></div>
  </div></section>`;
}
