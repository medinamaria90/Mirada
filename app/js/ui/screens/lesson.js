// Ronda de preguntas: barra de progreso, respuesta, feedback inmediato y reintentos al final.

import { artistLink } from '../artist-link.js';
import { curioHtml, toggleCurio, loadCurioCss } from '../fb-curio.js';
import { esc, onAction, accentStyle, announce, focusHeading, $, $$ } from '../dom.js';
import { icons } from '../icons.js';
import { artFrame, onArtworkError, isBroken, preload, coverOf } from '../art.js';
import { marcoHtml, upgradeMarcos } from '../marco.js';
import { createRng } from '../../engine/rng.js';
import { isCorrect, questionAlt, optionText, makeQuestion, makeWhichQuestion, artworksInQuestion, retryQuestion } from '../../engine/questions.js';
import { createRound, currentItem, answerRound, roundDone, roundProgress } from '../../engine/planner.js';
import { xpForAnswer } from '../../engine/progress.js';
import { feedbackFor } from '../../engine/feedback.js';
import { titleSlotHtml, revealTitle } from '../title-slot.js';
import { veilsHtml, unveil } from '../signature-veil.js';
import { beforeQuestionHtml, beforeRibbonHtml } from '../before-question.js';
import { loadRibbonCss } from '../chrono-ribbon.js';
import { guestCardHtml, loadGuestCss } from '../guest-card.js';
import { askableIds, introNeeded, knownOnly, guestIntro, roundWorkIds } from '../../engine/guest-intro.js';
import { metArtistIds, seenOf, avatarWork, avatarCrop } from '../../engine/painters.js';
import { avatarHtml } from '../avatar.js';

const MAX_SUBSTITUTIONS = 3;
const COMBO_SHOW = 3; // aciertos seguidos a partir de los que se ve el indicador
const DUNNO_LABEL = 'No lo sé';

// config: { questions, extras?, accent, seed, kind, label, interlude?, dunno?, onDone(summary), onQuit(), resume?, onSave? }
// dunno: true pone «No lo sé» bajo las opciones (modo aprender; nunca en retos ni en el test): enseña la respuesta sin sonido
// ni rojo de fallo, no da puntos y cuenta como fallo (rompe «seguidas», vuelve al final y pesa doble en engine/recall.js).
// extras: preguntas que no cuentan, al final (cuadros fallados en rondas anteriores).
// resume: { round, answers, xpLive, freshIntroShown } de una ronda guardada (state/session.js).
// onSave(snapshot) se llama tras cada respuesta para poder retomar la ronda.
export function runLesson(ctx, el, config) {
  const { index } = ctx;
  const rng = createRng(`lesson:${config.seed}:${Date.now() % 100000}`);
  const resume = config.resume || null;
  // Pintores por los que se puede preguntar ahora: los jugados y los invitados ya presentados.
  const progressNow = () => ctx.store?.get().progress || {};
  const metNow = () => metArtistIds(progressNow(), index);
  const askable = () => askableIds(metNow(), progressNow());
  // Solo se pregunta por pintores conocidos, el de la ronda o un invitado (uno por ronda) que se presenta antes; las demás
  // preguntas se cambian por otras de conocidos (engine/guest-intro.js knownOnly). Sin ninguna válida, la ronda tal cual.
  function knownRound() {
    const base = config.questions;
    const extras = config.extras || [];
    const checked = knownOnly(index, [...base, ...extras], askable(), rng);
    const questions = checked.slice(0, base.length).filter(Boolean);
    return questions.length ? createRound(questions, checked.slice(base.length).filter(Boolean)) : createRound(base, extras);
  }
  let round = resume ? resume.round : knownRound();
  const answers = resume ? resume.answers.slice() : [];
  let xpLive = resume ? resume.xpLive : 0;
  let answered = false;
  // Pantalla intermedia «Ahora, cuadros que no has visto»: solo en rondas en dos bloques (salas: lo
  // visto y luego lo nuevo). En las etapas lo visto y lo nuevo van mezclados y cada cuadro nuevo
  // lleva su etiqueta.
  let freshIntroShown = resume ? resume.freshIntroShown : !(config.interlude && round.queue.some((it) => it.q.phase === 'fresh'));
  let substitutions = 0;
  const traitMemo = new Map();
  let curioOpen = false; // el dato curioso, abierto una vez, sale abierto el resto de la ronda

  function save() {
    if (!config.onSave) return;
    try {
      config.onSave({ round, answers, xpLive, freshIntroShown });
    } catch (err) {
      console.error(err);
    }
  }

  el.innerHTML = `<div class="lesson" style="${accentStyle(config.accent)}">
    <div class="lesson-bar">
      <button class="icon-btn" data-action="quit" aria-label="Salir de la ronda">${icons.close(22)}</button>
      <div class="progress" role="progressbar" aria-label="Progreso de la ronda" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div>
      <span class="combo" aria-hidden="true"><span class="combo-num"></span><span class="combo-label">seguidas</span></span>
    </div>
    <div class="lesson-stage" id="main"></div>
    <div class="feedback" role="status" aria-live="polite"></div>
    <div class="sheet-backdrop" hidden></div>
    <div class="sheet quit-sheet" role="dialog" aria-modal="true" aria-labelledby="quit-title" hidden>
      <h2 id="quit-title">¿Salir de la ronda?</h2>
      <p>Perderás lo de esta ronda.</p>
      <div class="sheet-actions">
        <button class="btn btn-primary" data-action="stay">Seguir</button>
        <button class="btn btn-ghost" data-action="leave">Salir</button>
      </div>
    </div>
  </div>`;

  loadCurioCss();
  if (round.queue.some((it) => introNeeded(index, it.q, askable()))) loadGuestCss();
  if (round.queue.some((it) => it.q.type === 'before')) loadRibbonCss();
  const stage = $('.lesson-stage', el);
  const feedback = $('.feedback', el);
  const bar = $('.progress', el);
  const combo = $('.combo', el);

  function updateBar(pulse = false) {
    const pct = Math.round(roundProgress(round) * 100);
    bar.firstElementChild.style.width = `${pct}%`;
    bar.setAttribute('aria-valuenow', String(pct));
    const on = round.combo >= COMBO_SHOW;
    $('.combo-num', combo).textContent = on ? String(round.combo) : '';
    combo.classList.toggle('is-on', on);
    if (pulse && on) {
      for (const node of [combo, bar]) {
        node.classList.remove('is-pulse');
        void node.offsetWidth;
        node.classList.add('is-pulse');
      }
    }
  }

  function render() {
    answered = false;
    window.scrollTo(0, 0);
    feedback.classList.remove('is-open', 'is-correct', 'is-wrong', 'is-dunno');
    feedback.innerHTML = '';
    stage.style.paddingBottom = '';
    updateBar();
    if (roundDone(round)) return finish();
    const item = currentItem(round);
    if (!freshIntroShown && item.q.phase === 'fresh') return renderFreshIntro();
    ensureVisible(item);
    const guestId = introNeeded(index, currentItem(round).q, askable());
    if (guestId) return renderGuest(guestId);
    const q = currentItem(round).q;
    stage.innerHTML = questionHtml(q, item.retry);
    stage.dataset.type = q.type;
    upgradeMarcos(stage);
    stage.classList.remove('enter');
    void stage.offsetWidth;
    stage.classList.add('enter');
    focusHeading(stage);
    const nextItem = round.queue[round.pos + 1];
    if (nextItem) preload(artworksInQuestion(nextItem.q).map((id) => index.artwork(id)), nextItem.q.type === 'which');
  }

  function renderFreshIntro() {
    freshIntroShown = true;
    save();
    stage.innerHTML = `<div class="interlude">
      <span class="interlude-icon">${icons.eye(34)}</span>
      <h1 id="interlude-title">Ahora, cuadros que no has visto</h1>
      <button class="btn btn-primary btn-wide" data-action="continue" data-primary aria-describedby="interlude-title">Vamos</button>
    </div>`;
    stage.classList.remove('enter');
    void stage.offsetWidth;
    stage.classList.add('enter');
    // Foco en el botón (Enter o Espacio siguen); el lector lee también el título (aria-describedby).
    $('[data-action="continue"]', stage).focus({ preventScroll: true });
  }

  // Tarjeta del invitado antes de su primera pregunta: con el cuadro más famoso suyo que no sale en la ronda.
  let guestShown = null;
  function renderGuest(guestId) {
    const host = round.queue.find((it) => it.q.host)?.q.host || '';
    const intro = guestIntro(index, guestId, { hostId: host, met: metNow(), avoid: roundWorkIds(round.queue) });
    guestShown = intro;
    stage.innerHTML = guestCardHtml(intro);
    stage.dataset.type = 'guest';
    upgradeMarcos(stage);
    stage.classList.remove('enter');
    void stage.offsetWidth;
    stage.classList.add('enter');
    focusHeading(stage);
  }

  // «Seguir»: queda presentado (cuenta como conocido solo para preguntarle) y sale su pregunta.
  function guestContinue() {
    const id = guestShown?.artistId;
    guestShown = null;
    ctx.audio.sfx('tap');
    if (id && ctx.store) {
      const day = ctx.today ? ctx.today() : '';
      ctx.store.update((s) => ({ ...s, progress: { ...s.progress, guests: { ...(s.progress.guests || {}), [id]: day } } }));
    }
    render();
  }

  function guestZoom(opener) {
    const work = guestShown?.work;
    if (!work) return;
    ctx.audio.sfx('tap');
    loadViewer().then((m) => {
      if (cleaned || !guestShown) return;
      m.openViewer({ index, works: [work], start: 0, reveal: true, opener, label: null, title: null, pick: null });
    }).catch((err) => console.error(err));
  }

  function questionHtml(q, retry) {
    const tag = retry ? 'Otra vez' : q.isNew ? 'Cuadro nuevo' : '';
    const head = `${tag ? `<p class="q-tag">${tag}</p>` : ''}<h1 class="q-prompt">${esc(q.prompt)}</h1>`;
    if (q.type === 'before') return beforeQuestionHtml(index, q, head);
    if (q.type === 'which') {
      // Pulsar una miniatura abre el visor con las 4 («Es este» responde); 1-4 responden directo.
      // Las firmas, veladas también en las miniaturas hasta responder: a su tamaño se leen.
      const opts = q.options.map((o, i) => `<button class="option option-art" data-action="pick" data-id="${esc(o.id)}" data-pos="${i}" aria-label="Opción ${i + 1}" aria-haspopup="dialog">
          ${marcoHtml(index.artwork(o.artworkId), { alt: '', eager: true, label: `Opción ${i + 1}`, veils: veilsHtml(index.artwork(o.artworkId)) })}<span class="key" aria-hidden="true">${i + 1}</span></button>`).join('');
      return `<div class="q-head">${head}</div><div class="options options-grid" role="group" aria-label="Elige un cuadro">${opts}</div>${dunnoHtml(q)}`;
    }
    const art = index.artwork(q.artworkId);
    // En las de movimiento, el periodo debajo del nombre («s. XV–XVI»), en tinta secundaria.
    const optText = (o) => {
      const { label, detail } = optionText(index, q, o);
      return `<span class="opt-text">${esc(label)}${detail ? `<span class="opt-sub">${esc(detail)}</span>` : ''}</span>`;
    };
    const opts = q.options.map((o, i) => `<button class="option" data-action="answer" data-id="${esc(o.id)}"><span class="key" aria-hidden="true">${i + 1}</span>${optText(o)}</button>`).join('');
    // En escritorio, el cuadro a la izquierda y la pregunta con las opciones a la derecha.
    // El título (hueco reservado) se escribe tras responder: antes delataría autor, época o movimiento.
    const titleLine = titleSlotHtml();
    return `<div class="q-head">${head}</div><div class="q-art">${artFrame(art, { alt: questionAlt(q), eager: true, cls: 'art-hero', veils: veilsHtml(art), label: 'Cuadro sin imagen', zoom: { action: 'zoom', label: `${questionAlt(q)}: ver en grande` } })}${titleLine}</div>
      <div class="options options-list" role="group" aria-label="Respuestas">${opts}${dunnoHtml(q)}</div>`;
  }

  // «No lo sé»: discreto, bajo las opciones, para no contestar al azar.
  function dunnoHtml(q) {
    return config.dunno && q.type !== 'before' ? `<button type="button" class="q-dunno" data-action="dunno">${DUNNO_LABEL}</button>` : '';
  }

  // Si la imagen principal no carga, se cambia por otra obra del mismo pintor.
  function ensureVisible(item) {
    const q = item.q;
    const subject = q.type === 'which' ? q.targetArtworkId : q.artworkId;
    if (!isBroken(subject) || substitutions >= MAX_SUBSTITUTIONS) return false;
    const subjectWork = index.artwork(subject);
    const pool = index.worksOf(q.artistId).filter((w) => w.id !== subject && !isBroken(w.id));
    const sameRole = pool.filter((w) => w.role === subjectWork.role);
    const choice = (sameRole.length ? sameRole : pool)[0];
    if (!choice) return false;
    const replacement = q.type === 'which'
      ? makeWhichQuestion(index, choice, 0.5, rng)
      : makeQuestion(q.type, index, choice, 0.5, rng);
    if (!replacement) return false;
    substitutions += 1;
    const queue = round.queue.slice();
    queue[round.pos] = { ...item, q: { ...replacement, phase: q.phase, isNew: q.isNew && choice.role === 'new' } };
    round = { ...round, queue };
    return true;
  }

  const offError = onArtworkError((id) => {
    if (answered || roundDone(round)) return;
    const item = currentItem(round);
    if (!item) return;
    const subject = item.q.type === 'which' ? item.q.targetArtworkId : item.q.artworkId;
    if (id === subject && ensureVisible(item)) render();
  });

  // Visor a pantalla completa. Sin responder no revela nada (ni título ni autor); en «¿Cuál es de
  // X?» lleva las 4 opciones y «Es este» responde con la que se está viendo.
  let viewerMod = null;
  const loadViewer = () => (viewerMod ? Promise.resolve(viewerMod) : import('../viewer.js').then((m) => { viewerMod = m; return m; }));
  function zoom(opener, start = 0) {
    const item = currentItem(round);
    const q = answered ? answers[answers.length - 1]?.q : item?.q;
    if (!q) return;
    const which = q.type === 'which';
    const works = which ? q.options.map((o) => index.artwork(o.artworkId)) : [index.artwork(q.artworkId)];
    const reveal = answered;
    const askedAt = round.pos;
    ctx.audio.sfx('tap');
    loadViewer().then((m) => {
      if (cleaned || round.pos !== askedAt || answered !== reveal) return;
      m.openViewer({
        index, works, start, reveal, opener,
        label: which ? q.prompt : reveal ? null : 'Cuadro para identificar',
        title: which ? q.prompt : null,
        pick: which && !reveal ? {
          label: 'Es este',
          onPick: (i) => {
            const btn = $$('.option', stage)[i];
            if (btn && !answered) answer(btn.dataset.id, btn);
          },
        } : null,
      });
    }).catch((err) => console.error(err));
  }

  // dunno: «No lo sé» (sin opción elegida): como un fallo para la ronda, sin sonido ni rojo y sin puntos.
  function answer(optionId, button, { dunno = false } = {}) {
    if (answered) return;
    answered = true;
    const item = currentItem(round);
    const q = item.q;
    const correct = !dunno && isCorrect(q, optionId);
    round = answerRound(round, correct, (qq) => retryQuestion(index, qq, rng));
    const gained = xpForAnswer({ correct, isNew: q.isNew, combo: round.combo, retry: item.retry });
    xpLive += gained;
    answers.push({ q, correct, retry: item.retry, combo: round.combo, chosen: dunno ? null : optionId, ...(dunno ? { dunno: true } : {}) });
    if (!roundDone(round)) save();
    $('.q-dunno', stage)?.remove();

    $$('.option', stage).forEach((b) => {
      // Las miniaturas siguen activas tras responder: abren el visor (ya con título y autor).
      if (b.classList.contains('option-art')) {
        b.classList.add('is-done');
        b.setAttribute('aria-label', `${b.getAttribute('aria-label')}: ver en grande`);
      } else b.setAttribute('aria-disabled', 'true');
      if (b.dataset.id === q.answerId) b.classList.add('is-correct');
    });
    if (dunno) { /* sin marca de fallo: solo se ve la buena */ } else if (!correct) button.classList.add('is-wrong');
    else button.classList.add('is-picked');
    unveil(stage);
    if (q.type !== 'which') revealTitle(stage, index.artwork(q.artworkId)?.title);

    // Combo: cada 3 seguidas suena la pequeña fanfarria ascendente en lugar del acierto.
    const milestone = correct && round.combo >= COMBO_SHOW && round.combo % COMBO_SHOW === 0;
    if (correct) ctx.audio.sfx(milestone ? 'streak' : 'correct');
    else if (!dunno) ctx.audio.sfx('wrong');
    showFeedback(q, correct, gained, item.retry, dunno ? null : optionId, dunno);
    updateBar(milestone);
  }

  function showFeedback(q, correct, gained, retry, chosenId, dunno = false) {
    const subject = index.artwork(q.type === 'which' ? q.targetArtworkId : q.artworkId);
    const fb = feedbackFor(index, q, correct, traitMemo, rng, { retry, chosenId });
    const caption = subject ? `<p class="fb-work"><em>${esc(subject.title)}</em>${subject.year ? ` · ${esc(subject.year)}` : ''}</p>` : '';
    // El nombre del pintor abre su ficha: la línea «quién» o, en «Es de X», el propio título.
    const who = fb.who ? `<p class="fb-who">${artistLink(fb.artistId, fb.who)}</p>` : '';
    const titleLinked = !fb.who && fb.artistId && /^Es de /.test(fb.title);
    const title = titleLinked ? artistLink(fb.artistId, fb.title, 'fb-title') : `<p class="fb-title">${esc(fb.title)}</p>`;
    // Tras un fallo de autor: de quién era lo elegido («No es de X…» / «El que has elegido es de X · título»).
    const chosen = fb.chosen ? `<p class="fb-line-2">${artistLink(fb.chosen.artistId, fb.chosen.line)}</p>` : '';
    const lines = fb.lines.slice(0, 1).map((t) => `<p class="fb-line">${esc(t)}</p>`).join('') + chosen;
    // En «¿Cuál es de X?», la miniatura elegida por error lleva el nombre de su pintor.
    const wrongArt = fb.chosen && fb.chosen.artworkId ? $('.option-art.is-wrong', stage) : null;
    if (wrongArt) {
      ($('.marco', wrongArt) || wrongArt).insertAdjacentHTML('beforeend', `<span class="option-tag">${esc(fb.chosen.name)}</span>`);
      wrongArt.setAttribute('aria-label', `${wrongArt.getAttribute('aria-label')}, de ${fb.chosen.name}`);
    }
    // El texto se desplaza dentro de la hoja si no cabe (zoom de texto); «Seguir» siempre a la vista.
    feedback.innerHTML = `<div class="fb-inner">
      <div class="fb-text">
        <div class="fb-head">${dunno ? dunnoMark(q) : `<span class="fb-mark" aria-hidden="true">${correct ? icons.check(20) : icons.eye(20)}</span>`}
        ${title}${gained ? `<span class="fb-xp">+${gained} puntos</span>` : ''}</div>
        ${who}${lines}${beforeRibbonHtml(ctx, fb)}${caption}${curioHtml(subject, curioOpen)}
      </div>
      <button class="btn btn-primary btn-wide" data-action="continue">Seguir</button>
    </div>`;
    feedback.classList.add('is-open', correct ? 'is-correct' : dunno ? 'is-dunno' : 'is-wrong');
    const btn = $('[data-action="continue"]', feedback);
    requestAnimationFrame(revealAnswers);
    setTimeout(() => btn.focus({ preventScroll: true }), 340);
  }

  // Tras «No lo sé», en las de autor, la cara del pintor (su autorretrato visto o su cuadro más conocido); si no, el ojo.
  function dunnoMark(q) {
    const artist = q.type !== 'movement' ? index.artist(q.artistId) : null;
    const cover = artist ? coverOf(index, artist.id) : null;
    const face = artist ? avatarWork(seenOf(progressNow(), index, artist.id)) || (cover ? { work: cover, ...avatarCrop(cover) } : null) : null;
    return face ? `<span class="fb-face" aria-hidden="true">${avatarHtml(artist, face, 'fb-av')}</span>` : `<span class="fb-mark" aria-hidden="true">${icons.eye(20)}</span>`;
  }

  // La opción elegida y la correcta quedan a la vista por encima de la hoja de feedback: se deja
  // sitio debajo (tanto como mide la hoja) y se desplaza lo justo, sin esconder la de arriba bajo
  // la barra de la ronda. Si las dos no caben a la vez (pantallas muy bajas o texto muy grande), se
  // ocultan las otras opciones para que queden juntas.
  function revealAnswers() {
    const marked = $$('.option.is-correct, .option.is-wrong', stage);
    if (!marked.length) return;
    const sheet = feedback.getBoundingClientRect();
    // En escritorio la hoja va en otra columna: si no se cruzan en horizontal, nada que hacer.
    const overlapsX = marked.some((m) => { const r = m.getBoundingClientRect(); return r.right > sheet.left && r.left < sheet.right; });
    if (!overlapsX) return;
    const barBottom = $('.lesson-bar', el).getBoundingClientRect().bottom;
    // La hoja aún está entrando: su borde superior final sale de su alto y de su separación del
    // borde inferior (0 en móvil; en escritorio flota como tarjeta).
    const sheetTop = window.innerHeight - sheet.height - (parseFloat(getComputedStyle(feedback).bottom) || 0);
    const span = () => {
      const rects = marked.map((m) => m.getBoundingClientRect());
      return { top: Math.min(...rects.map((r) => r.top)), bottom: Math.max(...rects.map((r) => r.bottom)) };
    };
    const room = sheetTop - barBottom - 20;
    let { top, bottom } = span();
    if (bottom - top > room && marked.length > 1) {
      $('.options', stage)?.classList.add('is-trimmed');
      ({ top, bottom } = span());
    }
    stage.style.paddingBottom = `${Math.ceil(sheet.height + 24)}px`;
    const need = bottom + 12 - sheetTop;
    const delta = need > 0 ? Math.min(need, Math.max(0, top - (barBottom + 8))) : top < barBottom + 8 ? top - barBottom - 8 : 0;
    if (delta !== 0) {
      window.scrollBy({ top: delta, behavior: document.documentElement.classList.contains('reduce-motion') ? 'auto' : 'smooth' });
    }
  }

  function finish() {
    cleanup();
    finished = true;
    config.onDone({
      answers,
      firstTry: round.firstTry.map((v) => v === true),
      xpLive,
    });
  }

  function openQuit(open) {
    $('.quit-sheet', el).hidden = !open;
    $('.sheet-backdrop', el).hidden = !open;
    if (open) $('[data-action="stay"]', el).focus();
  }

  const offActions = onAction(el, {
    answer: (b) => answer(b.dataset.id, b),
    dunno: (b) => answer(null, b, { dunno: true }),
    pick: (b) => zoom(b, Number(b.dataset.pos) || 0),
    zoom: (b) => zoom(b),
    continue: () => {
      ctx.audio.sfx('tap');
      render();
    },
    'guest-continue': guestContinue,
    'guest-zoom': (b) => guestZoom(b),
    curio: (b) => {
      ctx.audio.sfx('tap');
      curioOpen = toggleCurio(b);
      requestAnimationFrame(revealAnswers);
    },
    work: (b) => {
      ctx.audio.sfx('tap');
      import('../artwork-sheet.js').then((m) => m.openArtworkSheet(ctx, b.dataset.work, { opener: b })).catch((err) => console.error(err));
    },
    quit: () => openQuit(true),
    stay: () => openQuit(false),
    leave: () => {
      cleanup();
      dispose();
      config.onQuit();
    },
  });

  function onKey(ev) {
    if (ev.defaultPrevented || ev.altKey || ev.ctrlKey || ev.metaKey) return;
    const quitOpen = !$('.quit-sheet', el).hidden;
    if (ev.key === 'Escape') {
      openQuit(!quitOpen);
      ev.preventDefault();
      return;
    }
    if (quitOpen) return;
    if (/^[1-4]$/.test(ev.key) && !answered) {
      const btn = $$('.option', stage)[Number(ev.key) - 1];
      if (btn) {
        ev.preventDefault();
        answer(btn.dataset.id, btn);
      }
    }
  }
  document.addEventListener('keydown', onKey);

  let cleaned = false;
  function cleanup() {
    if (cleaned) return;
    cleaned = true;
    document.removeEventListener('keydown', onKey);
    offError();
    offActions();
  }

  // Botón atrás del navegador: durante la ronda se pide confirmación (hoja «¿Salir?»); con la
  // ronda terminada, vuelve al camino. Se usa una entrada de historial de guarda con la misma URL.
  let finished = false;
  let guarded = false;
  const guardHash = location.hash;
  try {
    history.pushState({ miradaGuard: true }, '');
    guarded = true;
  } catch { /* sin historial: el aspa sigue funcionando */ }
  function onPop(ev) {
    // Se vuelve a la entrada de guarda al cerrar el visor (ui/viewer.js): no es salir.
    if (ev && ev.state && ev.state.miradaGuard && location.hash === guardHash) return;
    // Navegaciones a otra ruta (también location.replace) disparan popstate: no son «atrás».
    if (location.hash !== guardHash) {
      dispose();
      return;
    }
    if (finished) {
      dispose();
      if (config.onBackAfterDone) config.onBackAfterDone();
      return;
    }
    if (cleaned) return;
    try { history.pushState({ miradaGuard: true }, ''); } catch { /* nada */ }
    openQuit(true);
  }
  if (guarded) window.addEventListener('popstate', onPop);

  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    cleanup();
    window.removeEventListener('popstate', onPop);
  }

  render();
  // Se guarda ya al empezar (no solo tras la primera respuesta): recargar en la primera pregunta,
  // p. ej. con el visor abierto, vuelve a esa pregunta y no a la pantalla anterior.
  if (!resume) save();
  announce(config.label || 'Ronda');
  return dispose;
}
