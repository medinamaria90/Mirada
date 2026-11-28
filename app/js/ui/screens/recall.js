// «Repasar a Vermeer» / «Repasar el Barroco» (#repasar-<pintor>, #repasar-epoca-<movimiento>): la sesión única para repasar a un
// pintor o una época, la misma desde la ruta (cuando se le está olvidando, engine/recall.js) y desde la ficha.
// Empieza siempre por la primera tarjeta de su historia de nivel 1 (época: sus tarjetas clave) con «Seguir» destacado e «Ir a
// las preguntas» al lado; al final, una sugerencia de otra historia suya, «Cómo reconocer a…» (rasgos y cuadros) y, si lo
// confunde con alguien, el contraste. Desde cualquiera se puede ir a las preguntas, y después vienen las preguntas
// (engine/recall-session.js). Al terminar la ronda, el resultado normal; su cuenta de fallos vuelve a cero (engine/finish.js).

import { esc, onAction, accentStyle, defaultAccent, focusHeading } from '../dom.js';
import { icons } from '../icons.js';
import { artFrame, coverOf } from '../art.js';
import { avatarHtml } from '../avatar.js';
import { loadCss } from '../lazy-css.js';
import { playEra } from '../audio-bridge.js';
import { loadStory } from '../story-data.js';
import { DECK_LABEL } from '../deck-nav.js';
import { randomSeed } from '../../engine/rng.js';
import { seenOf, avatarWork, avatarCrop, lifeSpan } from '../../engine/painters.js';
import { storyKey } from '../../engine/stories.js';
import { storySeen } from '../../state/stories-seen.js';
import { forgottenSubject, isLearned, recallLabel, movementLabel, ARTIST, MOVEMENT } from '../../engine/recall.js';
import { recallParts, planRecall, suggestedStory, firstStoryLevel, eraKeyCards, shortName } from '../../engine/recall-session.js';

// Los mismos textos que los visores de tarjetas (deck-nav.js): en cada tarjeta, «Ir a las preguntas» además de «Seguir».
const NEXT_LABEL = DECK_LABEL.next;
const QUESTIONS_LABEL = DECK_LABEL.questions;
const STEPS = { questions: QUESTIONS_LABEL };
// La ronda necesita al menos estas preguntas; si no llega, la sesión termina en lo enseñado.
const MIN_QUESTIONS = 3;
// Cómo se cerró una historia (ui/story-core.js STORY_END), sin cargarla antes de tiempo.
const ENDED = { CLOSE: 'close', BACK: 'back', QUESTIONS: 'questions', PLAY: 'play' };

function faceOf(ctx, artistId) {
  const artist = ctx.index.artist(artistId);
  const cover = coverOf(ctx.index, artistId);
  const face = avatarWork(seenOf(ctx.store.get().progress, ctx.index, artistId)) || (cover ? { work: cover, ...avatarCrop(cover) } : null);
  return avatarHtml(artist, face, 'recall-av');
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
  const steps = ['story', type === ARTIST && (parts.traits.length || parts.works.length) ? 'look' : '', parts.contrast ? 'contrast' : ''].filter(Boolean);
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

  function show() {
    off();
    const step = steps[at];
    const last = at === steps.length - 1;
    const body = step === 'look' ? lookHtml(artist, movement, parts)
      : step === 'contrast' ? contrastHtml(ctx, type, id, parts)
        : launcherHtml(ctx, type, id, movement, Boolean(subject));
    // En la historia, sus botones van en cada tarjeta; detrás queda quién es, por si se cierra o no llega.
    const actions = step === 'story' ? '' : last
      ? `<button class="btn btn-primary btn-wide" data-action="questions" data-primary>${QUESTIONS_LABEL}</button>`
      : `<div class="recall-actions"><button class="btn btn-secondary" data-action="questions">${QUESTIONS_LABEL}</button>
          <button class="btn btn-primary" data-action="next" data-primary>${NEXT_LABEL}</button></div>`;
    el.innerHTML = `<div class="recall" style="${accentStyle(accent)}">
      <div class="lesson-bar recall-bar">
        <button class="icon-btn" data-action="leave" aria-label="Salir">${icons.close(22)}</button>
        <span class="lesson-bar-title">${esc(title)}</span>
      </div>
      <main class="recall-body" id="main">${body}${actions}</main>
    </div>`;
    window.scrollTo(0, 0);
    focusHeading(el);
    off = onAction(el, {
      leave: () => { ctx.audio.sfx('tap'); exit(); },
      next: () => { ctx.audio.sfx('tap'); next(); },
      questions: () => { ctx.audio.sfx('tap'); startRound(); },
    });
    if (step === 'story') tell();
  }

  // La historia (o las tarjetas de la época): «Seguir» pasa a lo siguiente, «Ir a las preguntas» salta a la ronda y la X sale.
  async function tell() {
    const ended = await (artist ? openStory(ctx, artist, parts) : openEraCards(ctx, movement));
    if (!el.isConnected || ended === ENDED.BACK) return;
    if (ended === ENDED.CLOSE) return exit();
    if (ended === ENDED.QUESTIONS) return startRound();
    next();
  }
  show();
}

// Lo que queda bajo la historia: quién es y de qué época.
function launcherHtml(ctx, type, id, movement, isForgotten) {
  if (type === MOVEMENT) {
    return `<p class="kicker">${esc(movement.period || '')}</p><h1 class="recall-title">${esc(movement.name)}</h1>
      <p class="recall-line">${esc(movement.blurb || '')}</p>`;
  }
  const artist = ctx.index.artist(id);
  return `<span class="recall-face">${faceOf(ctx, id)}</span>
    <p class="kicker">${esc([movement.name, lifeSpan(artist)].filter(Boolean).join(' · '))}</p>
    <h1 class="recall-title">${esc(artist.name)}</h1>
    ${isForgotten ? '<p class="recall-line">Se te está escapando un poco</p>' : ''}`;
}

function lookHtml(artist, movement, parts) {
  const traits = parts.traits.map((t) => `<li>${esc(t)}</li>`).join('');
  const works = parts.works.map((w) => `<figure class="recall-work">${artFrame(w, { alt: '', cls: 'recall-art', label: w.title, zoom: { group: 'recall-look' } })}<figcaption>${esc(w.title)}</figcaption></figure>`).join('');
  return `<p class="kicker">${esc([movement.name, lifeSpan(artist)].filter(Boolean).join(' · '))}</p>
    <h1 class="recall-title">Cómo reconocer a ${esc(shortName(artist))}</h1>
    ${traits ? `<ul class="recall-traits">${traits}</ul>` : ''}
    ${works ? `<div class="recall-works">${works}</div>` : ''}`;
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

// Su historia de nivel 1 (o la del nivel donde se concentran sus fallos) y, tras la de nivel 1, una sola sugerencia de otra
// suya («Más de Velázquez: La corte ›»). Devuelve cómo acabó.
async function openStory(ctx, artist, parts) {
  const [{ playStory, STORY_END }, story] = await Promise.all([import('../story-viewer.js'), loadStory(artist.id)]);
  const levels = (story?.levels || []).map((l) => l.level);
  const failedLevels = parts.failedWorks.map((w) => ctx.index.artwork(w)?.level).filter(Number.isInteger);
  const start = firstStoryLevel(levels, failedLevels);
  const more = start === 1 ? suggestedStory(levels, failedLevels, (l) => storySeen(storyKey(artist.id, l))) : null;
  const stage = more ? story.levels.find((l) => l.level === more) : null;
  const base = { force: true, history: false, steps: STEPS, onPlay: () => {}, look: artist.hint };
  const first = await playStory(ctx, artist.id, start, { ...base, onMore: stage ? () => {} : false, moreLabel: stage ? `Más de ${shortName(artist)}: ${stage.stage || stage.title} ›` : undefined });
  if (first.ended === STORY_END.MORE && stage) return (await playStory(ctx, artist.id, more, { ...base, onMore: false })).ended;
  // Sin historia, se sigue con lo demás.
  return first.ended === STORY_END.NONE ? ENDED.PLAY : first.ended;
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
