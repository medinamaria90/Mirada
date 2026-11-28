// «Repasar a Vermeer» / «Repasar el Barroco» (#repasar-<pintor>, #repasar-epoca-<movimiento>): la sesión única para repasar a un
// pintor o una época, la misma desde la ruta (cuando se le está olvidando, engine/recall.js) y desde la ficha.
// Pintor: sin historia (ya la conoce), directo a «Cómo reconocer a…» (sus «Fíjate en…», sus cuadros y con quién no
// confundirlo), con «Ficha de…» (la ficha en una hoja, sin perder el repaso) e «Ir a las preguntas». Época: sus tarjetas clave
// con «Seguir» e «Ir a las preguntas» y, si la confunde con otra, el contraste. Después, las preguntas
// (engine/recall-session.js). Al terminar la ronda, el resultado normal; su cuenta de fallos vuelve a cero (engine/finish.js).

import { esc, onAction, accentStyle, defaultAccent, focusHeading } from '../dom.js';
import { icons } from '../icons.js';
import { artFrame, coverOf } from '../art.js';
import { avatarHtml } from '../avatar.js';
import { loadCss } from '../lazy-css.js';
import { playEra } from '../audio-bridge.js';
import { openArtistSheet } from '../artist-sheet.js';
import { DECK_LABEL } from '../deck-nav.js';
import { randomSeed } from '../../engine/rng.js';
import { seenOf, avatarWork, avatarCrop, lifeSpan } from '../../engine/painters.js';
import { forgottenSubject, isLearned, recallLabel, movementLabel, ARTIST, MOVEMENT } from '../../engine/recall.js';
import { recallParts, planRecall, eraKeyCards, shortName } from '../../engine/recall-session.js';

// Los mismos textos que los visores de tarjetas (deck-nav.js): en cada tarjeta, «Ir a las preguntas» además de «Seguir».
const NEXT_LABEL = DECK_LABEL.next;
const QUESTIONS_LABEL = DECK_LABEL.questions;
const STEPS = { questions: QUESTIONS_LABEL };
// «Ver ficha» (a 360 px, «Ficha de Botticelli» parte el botón en dos líneas); el lector de pantalla oye de quién.
const FICHA_LABEL = 'Ver ficha';
// La ronda necesita al menos estas preguntas; si no llega, la sesión termina en lo enseñado.
const MIN_QUESTIONS = 3;
// Cómo se cerró una historia (ui/story-core.js STORY_END), sin cargarla antes de tiempo.
const ENDED = { CLOSE: 'close', BACK: 'back', QUESTIONS: 'questions', PLAY: 'play' };

function faceOf(ctx, artistId) {
  const artist = ctx.index.artist(artistId);
  const cover = coverOf(ctx.index, artistId);
  const face = avatarWork(seenOf(ctx.store.get().progress, ctx.index, artistId)) || (cover ? { work: cover, ...avatarCrop(cover) } : null);
  return avatarHtml(artist, face, 'recall-twin-av');
}

// ¿Se le está olvidando? El sujeto con su confusión (de los fallos) o null.
function forgotten(ctx, type, id) {
  const p = ctx.store.get().progress;
  const found = forgottenSubject({ ...p, recall: {} }, ctx.index, ctx.today());
  return found && found.type === type && found.id === id ? found : null;
}

export async function renderRecall(ctx, el, type, id, { play, leave }) {
  const { index } = ctx;
  const artist = type === ARTIST ? index.artist(id) : null;
  const movement = type === MOVEMENT ? index.movement(id) : index.movement(artist?.movementId);
  const p = ctx.store.get().progress;
  // Solo lo ya conocido: un pintor ya jugado; una época con algo dominado.
  const known = isLearned(p, index, type, id) || (artist && (p.artists?.[id]?.plays || 0) > 0);
  if (!movement || (type === ARTIST && !artist) || !known) return leave(ctx);
  await loadCss('css/recordar.css');
  const subject = forgotten(ctx, type, id);
  const seen = artist ? seenOf(p, index, id) : [];
  const parts = recallParts(p, index, subject || { type, id, confused: null }, ctx.today(), { seen });
  const title = recallLabel(index, type, id);
  const accent = movement.accent || defaultAccent();
  const plan = planRecall(p, index, parts, randomSeed(), { seen });
  const steps = type === ARTIST ? [parts.traits.length || parts.works.length ? 'look' : ''].filter(Boolean) : ['story', parts.contrast ? 'contrast' : ''].filter(Boolean);
  playEra(movement.era);
  let at = 0;
  let off = () => {};
  const exit = () => { off(); return ctx.prevRoute() ? history.back() : ctx.go('inicio'); };
  const startRound = () => {
    off();
    if (plan.questions.length < MIN_QUESTIONS) return exit();
    const extra = { recallType: type, ...(type === MOVEMENT ? { movementId: id } : { artistId: id }) };
    ctx.setCleanup(play(ctx, el, { plan, accent, title, kind: 'recall', extra, shareTopic: '' }));
  };
  const next = () => { at += 1; return at < steps.length ? show() : startRound(); };
  if (!steps.length) return startRound();

  function show() {
    off();
    const step = steps[at];
    const last = at === steps.length - 1;
    const body = step === 'look' ? lookHtml(ctx, artist, movement, parts)
      : step === 'contrast' ? contrastHtml(ctx, type, id, parts)
        : launcherHtml(movement);
    // En la historia de la época, sus botones van en cada tarjeta; detrás queda cuál es, por si se cierra o no llega.
    const actions = step === 'story' ? ''
      : step === 'look' ? `<div class="recall-actions"><button class="btn btn-secondary" data-action="ficha" aria-label="${esc(`Ficha de ${shortName(artist)}`)}">${FICHA_LABEL}</button>
          <button class="btn btn-primary" data-action="questions" data-primary>${QUESTIONS_LABEL}</button></div>`
        : last ? `<button class="btn btn-primary btn-wide" data-action="questions" data-primary>${QUESTIONS_LABEL}</button>`
          : `<div class="recall-actions"><button class="btn btn-secondary" data-action="questions">${QUESTIONS_LABEL}</button>
          <button class="btn btn-primary" data-action="next" data-primary>${NEXT_LABEL}</button></div>`;
    el.innerHTML = `<div class="recall${step === 'look' ? ' recall-look' : ''}" style="${accentStyle(accent)}">
      <div class="lesson-bar recall-bar">
        <button class="icon-btn" data-action="leave" aria-label="Salir">${icons.close(22)}</button>
        <span class="recall-bar-title">${esc(title)}</span>
      </div>
      <main class="recall-body" id="main">${body}</main>
      ${actions ? `<div class="recall-foot">${actions}</div>` : ''}
    </div>`;
    window.scrollTo(0, 0);
    focusHeading(el);
    off = onAction(el, {
      leave: () => { ctx.audio.sfx('tap'); exit(); },
      next: () => { ctx.audio.sfx('tap'); next(); },
      questions: () => { ctx.audio.sfx('tap'); startRound(); },
      // La ficha va en una hoja encima: al cerrarla se vuelve a esta tarjeta, con el repaso intacto.
      ficha: (btn) => { ctx.audio.sfx('tap'); openArtistSheet(ctx, id, { opener: btn, playable: false }); },
      twin: (btn) => { ctx.audio.sfx('tap'); openArtistSheet(ctx, btn.dataset.id, { opener: btn, playable: false }); },
    });
    if (step === 'story') tell();
  }

  // Las tarjetas de la época: «Seguir» pasa a lo siguiente, «Ir a las preguntas» salta a la ronda y la X sale.
  async function tell() {
    const ended = await openEraCards(ctx, movement);
    if (!el.isConnected || ended === ENDED.BACK) return;
    if (ended === ENDED.CLOSE) return exit();
    if (ended === ENDED.QUESTIONS) return startRound();
    next();
  }
  show();
}

// Lo que queda bajo las tarjetas de la época: cuál es.
function launcherHtml(movement) {
  return `<p class="kicker">${esc(movement.period || '')}</p><h1 class="recall-title">${esc(movement.name)}</h1>
    <p class="recall-line">${esc(movement.blurb || '')}</p>`;
}

// «Renacimiento · vivió 1445–1510»: las fechas son las de su vida, no las de la época.
const eraAndLife = (movement, artist) => [movement.name, lifeSpan(artist) && `vivió ${lifeSpan(artist)}`].filter(Boolean).join(' · ');

// «Cómo reconocer a…»: sus «Fíjate en…», sus cuadros (se abren en el visor) y con quién no confundirlo (cada uno abre su ficha).
function lookHtml(ctx, artist, movement, parts) {
  const traits = parts.traits.map((t) => `<li>${esc(t)}</li>`).join('');
  const works = parts.works.map((w) => `<figure class="recall-work">${artFrame(w, { alt: '', cls: 'recall-art', label: w.title, small: true, zoom: { group: 'recall-look' } })}<figcaption>${esc(w.title)}</figcaption></figure>`).join('');
  const twins = parts.twins.map((tid) => `<li><button type="button" class="recall-twin" data-action="twin" data-id="${esc(tid)}">${faceOf(ctx, tid)}<span>${esc(shortName(ctx.index.artist(tid)))}</span></button></li>`).join('');
  return `<p class="kicker recall-life">${esc(eraAndLife(movement, artist))}</p>
    <h1 class="recall-title">Cómo reconocer a ${esc(shortName(artist))}</h1>
    ${traits ? `<ul class="recall-traits">${traits}</ul>` : ''}
    ${works ? `<div class="recall-works">${works}</div>` : ''}
    ${twins ? `<section class="recall-twins" aria-labelledby="recall-twins-h"><h2 class="recall-h" id="recall-twins-h">No lo confundas con</h2>
      <ul>${twins}</ul>${parts.contrast ? `<p class="recall-note">${esc(parts.contrast.text)}</p>` : ''}</section>` : ''}`;
}

function contrastHtml(ctx, type, id, parts) {
  const { index } = ctx;
  const names = type === MOVEMENT ? [index.movement(id).name, index.movement(parts.rival).name] : [shortName(index.artist(id)), shortName(index.artist(parts.rival))];
  const pair = parts.contrast.works.map((w, i) => `<figure class="recall-work">${artFrame(w, { alt: '', cls: 'recall-art', label: w.title, zoom: { group: 'recall-pair' } })}<figcaption><strong>${esc(names[i])}</strong><span>${esc(w.title)}</span></figcaption></figure>`).join('');
  return `<p class="kicker">¿Te suena?</p>
    <h1 class="recall-title">${esc(names[0])} o ${esc(names[1])}</h1>
    <div class="recall-works recall-pair">${pair}</div>
    <p class="recall-line">${esc(parts.contrast.text)}</p>`;
}

// Las tarjetas clave de la época, como una historia, con su antetítulo («Fíjate en»). Devuelve cómo acabó.
async function openEraCards(ctx, movement) {
  const [{ loadCards }, { runStory }] = await Promise.all([import('./era-cards.js'), import('../story-core.js'), loadCss('css/historias.css'), loadCss('css/deck.css')]);
  const cards = eraKeyCards(await loadCards(movement.id)).map((c) => ({ text: c.text, artwork: c.artwork, kicker: c.kicker, region: c.region, whole: true }));
  if (!cards.length) return ENDED.PLAY;
  const { ended } = await runStory(ctx, {
    cards,
    name: movement.name,
    history: false,
    steps: STEPS,
    onPlay: () => {},
    onMore: false,
    label: `Repasar ${movementLabel(movement)}`,
    accent: movement.accent,
    whoHtml: `<span class="story-who"><span class="story-who-text"><span class="story-name">${esc(movement.name)}</span><span class="story-title">${esc(movement.period || '')}</span></span></span>`,
  });
  return ended;
}
