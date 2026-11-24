// Perfil y ajustes: estadísticas, semana, medallas, sonido, tema, animaciones y reinicio.

import { esc, onAction, focusHeading, $, announce, longDate } from '../dom.js';
import { page } from '../shell.js';
import { levelFor, visibleStreak, graceLeft, medalInfo, artistStatus, todayXp, normalizeGoal, GOAL_OPTIONS } from '../../engine/progress.js';
import { goalRing, goalChip } from '../shell.js';
import { weekOf } from '../../engine/dates.js';
import { medalBadge, medalZoom, allMedalIds, medalHow, eyeLabel } from './medals.js';
import { applyAudioSettings, playEra } from '../audio-bridge.js';
import { recognizedCount } from '../../engine/goals.js';
import { themePicker, chooseTheme, markThemePicker } from '../theme.js';

const GOAL_NAMES = { 50: 'Tranquila', 100: 'Constante', 200: 'Intensa' };

// Días de gracia que quedan esta semana (se recargan el lunes): un día perdido no rompe la racha.
export function graceLine(left) {
  if (left <= 0) return 'Sin días de gracia hasta el lunes';
  return left === 1 ? 'Te queda 1 día de gracia esta semana' : `Te quedan ${left} días de gracia esta semana`;
}

// opts.focus: 'medals' para abrir directamente en las medallas (#medallas).
export function renderProfile(ctx, el, opts = {}) {
  const { index } = ctx;
  const state = ctx.store.get();
  const p = state.progress;
  const s = state.settings;
  const today = ctx.today();
  const level = levelFor(p.xp);
  const mastered = index.path.filter((a) => artistStatus(p, index, a.id) === 'mastered').length;
  const accuracy = p.stats.answered ? Math.round((p.stats.correct / p.stats.answered) * 100) : 0;
  const days = new Set(p.streak.days);
  const labels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const week = weekOf(today).map((d, i) => `<span class="day ${days.has(d) ? 'is-on' : ''} ${d === today ? 'is-today' : ''}"><span class="day-dot"></span><span class="day-label">${labels[i]}</span></span>`).join('');
  const activeThisWeek = weekOf(today).filter((d) => days.has(d)).length;

  // Se muestran las conseguidas y solo las próximas pendientes, para no abrumar. Los «Ojo de…» de
  // pintores dominados que ya llevan algún cuadro van primero entre las pendientes (con su progreso).
  const ids = allMedalIds(index);
  const got = ids.filter((id) => p.medals[id]);
  const pending = ids.filter((id) => !p.medals[id]);
  const eyes = pending.filter((id) => id.startsWith('eye-'))
    .map((id) => ({ id, e: eyeLabel(ctx, id.slice(4)) }))
    .filter((x) => x.e && x.e.top > 0)
    .sort((x, y) => y.e.top / y.e.total - x.e.top / x.e.total)
    .slice(0, 2).map((x) => x.id);
  const shown = [...eyes, ...pending.filter((id) => !eyes.includes(id))].slice(0, 3);
  const medalName = (id, has) => (!has && id.startsWith('eye-') && eyeLabel(ctx, id.slice(4))?.text) || medalInfo(id, index).title;
  const medalItem = (id, has) => `<li><button class="medal-item ${has ? 'is-got' : 'is-missing'}" data-action="medal" data-id="${esc(id)}" aria-haspopup="dialog">${medalBadge(ctx, id)}<span class="medal-name">${esc(medalName(id, has))}</span><span class="sr-only">${has ? 'conseguida' : 'pendiente'}</span></button></li>`;
  const medals = [...got.map((id) => medalItem(id, true)), ...shown.map((id) => medalItem(id, false))].join('');
  const medalsLeft = Math.max(0, pending.length - shown.length);

  const goal = normalizeGoal(s.dailyGoal);
  const doneToday = todayXp(p, today);
  const goalButtons = GOAL_OPTIONS.map((g) => `<button class="seg ${g === goal ? 'is-on' : ''}" data-action="goal" data-goal="${g}" aria-pressed="${g === goal}">
      <span class="seg-num">${g} XP</span><span class="seg-name">${GOAL_NAMES[g] || ''}</span></button>`).join('');

  const toggle = (key, label) => `<label class="setting">
      <span>${label}</span>
      <input type="checkbox" role="switch" class="switch" data-setting="${key}" ${s[key] ? 'checked' : ''}>
    </label>`;

  el.innerHTML = page(ctx, 'profile', `
    <header class="section-head"><h1>Perfil</h1><p class="section-sub">${esc(level.name)}${level.next ? ` · ${level.next.min - p.xp} XP para ${esc(level.next.name)}` : ''}</p></header>
    <dl class="stats">
      <div><dt>Racha</dt><dd>${visibleStreak(p.streak, today)}</dd></div>
      <div><dt>Mejor racha</dt><dd>${p.streak.best || 0}</dd></div>
      <div><dt>Experiencia</dt><dd>${p.xp}</dd></div>
      <div><dt>Dominados</dt><dd>${mastered}/${index.path.length}</dd></div>
      <div><dt>Precisión</dt><dd>${accuracy}%</dd></div>
      <div><dt>Reconoces</dt><dd>${recognizedCount(p, index)} <span class="dd-unit">${recognizedCount(p, index) === 1 ? 'cuadro' : 'cuadros'}</span></dd></div>
    </dl>
    <section class="panel" aria-labelledby="goal-h">
      <h2 id="goal-h" class="panel-title">Meta del día <span class="panel-aside">${Math.min(doneToday, goal)}/${goal} XP</span></h2>
      <div class="goal-row">${goalRing(doneToday, goal, 56)}<div class="segs" role="group" aria-label="Meta diaria">${goalButtons}</div></div>
    </section>
    <section class="panel" aria-labelledby="week-h">
      <h2 id="week-h" class="panel-title">Esta semana <span class="panel-aside">${activeThisWeek}/7</span></h2>
      <div class="week" role="img" aria-label="${activeThisWeek} días con práctica esta semana">${week}</div>
      <p class="panel-foot">${graceLine(graceLeft(p.streak, today))}</p>
    </section>
    <section class="panel" id="medallas-panel" aria-labelledby="medals-h">
      <h2 id="medals-h" class="panel-title">Medallas <span class="panel-aside">${got.length}/${ids.length}</span></h2>
      <ul class="medal-grid">${medals}</ul>
      ${medalsLeft ? `<p class="panel-foot">Y ${medalsLeft} más por descubrir</p>` : ''}
    </section>
    <dialog class="card-dialog medal-dialog" aria-labelledby="medal-dlg-title"></dialog>
    <section class="panel" aria-labelledby="settings-h">
      <h2 id="settings-h" class="panel-title">Ajustes</h2>
      ${toggle('music', 'Música')}
      ${toggle('sfx', 'Efectos')}
      <label class="setting setting-range"><span>Volumen</span>
        <input type="range" min="0" max="100" step="5" value="${Math.round(s.volume * 100)}" data-setting="volume" aria-label="Volumen">
      </label>
      ${themePicker(s.theme)}
      ${toggle('reducedMotion', 'Reducir animaciones')}
    </section>
    <section class="panel panel-danger" aria-labelledby="reset-h">
      <h2 id="reset-h" class="sr-only">Empezar de cero</h2>
      <button class="btn btn-quiet btn-wide" data-action="ask-reset">Empezar de cero</button>
      <div class="confirm" hidden>
        <p>Se borrará todo tu progreso.</p>
        <div class="sheet-actions">
          <button class="btn btn-secondary" data-action="cancel-reset">Cancelar</button>
          <button class="btn btn-danger" data-action="reset">Borrar todo</button>
        </div>
      </div>
    </section>`);
  if (opts.focus === 'medals') {
    const panel = $('#medallas-panel', el);
    const h = $('#medals-h', el);
    h.setAttribute('tabindex', '-1');
    h.focus({ preventScroll: true });
    panel.scrollIntoView({ block: 'start' });
    window.scrollBy(0, -72);
  } else focusHeading(el);
  playEra('menu');

  el.addEventListener('change', (ev) => {
    const input = ev.target.closest('[data-setting]');
    if (!input) return;
    const key = input.dataset.setting;
    const value = key === 'volume' ? Number(input.value) / 100 : input.checked;
    ctx.store.update((st) => ({ ...st, settings: { ...st.settings, [key]: value } }));
    const settings = ctx.store.get().settings;
    if (key === 'reducedMotion') document.documentElement.classList.toggle('reduce-motion', value);
    else {
      ctx.audio.unlock();
      applyAudioSettings(settings);
      if (key === 'music' && value) playEra('menu');
      if (key === 'music' && !value) ctx.audio.stopMusic();
      if (key !== 'music') ctx.audio.sfx('tap');
    }
  });

  // Hoja de una medalla: qué es, cómo se gana y, si ya está, cuándo. <dialog> modal: Esc la cierra
  // y el foco no sale de ella; al cerrar vuelve a la medalla.
  const dialog = $('.medal-dialog', el);
  let opener = null;
  const closeMedal = () => {
    if (dialog.open) { try { dialog.close(); } catch { dialog.removeAttribute('open'); } }
  };
  dialog.addEventListener('close', () => { if (opener && opener.isConnected) opener.focus({ preventScroll: true }); opener = null; });
  dialog.addEventListener('click', (ev) => { if (ev.target === dialog) closeMedal(); });
  // Foco atrapado: Tab y Mayús+Tab dan la vuelta dentro de la hoja (no salen al navegador).
  dialog.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Tab') return;
    const items = [...dialog.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled);
    if (!items.length) return;
    ev.preventDefault();
    const i = items.indexOf(document.activeElement);
    items[(i + (ev.shiftKey ? -1 : 1) + items.length) % items.length].focus();
  });
  const confirm = $('.confirm', el);
  onAction(el, {
    medal: (b) => {
      ctx.audio.sfx('tap');
      const id = b.dataset.id;
      const info = medalInfo(id, index);
      const date = ctx.store.get().progress.medals[id];
      const eye = id.startsWith('eye-') ? eyeLabel(ctx, id.slice(4)) : null;
      const how = medalHow(id);
      dialog.innerHTML = `<div class="dlg-body medal-dlg ${date ? 'is-got' : 'is-missing'}">
        ${medalZoom(ctx, id, medalBadge(ctx, id, false, 'lg'))}
        <h2 id="medal-dlg-title" class="dlg-title">${esc(info.title)}</h2>
        <p class="dlg-meta">${esc(info.sub)}</p>
        ${date ? `<p class="dlg-hint">Conseguida el ${esc(longDate(date).toLowerCase())}</p>` : how ? `<p class="dlg-hint">${esc(how)}</p>` : ''}
        ${!date && eye ? `<p class="medal-dlg-prog">${eye.top} de ${eye.total} cuadros</p>` : ''}
        <button class="btn btn-secondary btn-wide" data-action="close-medal">Cerrar</button>
      </div>`;
      opener = b;
      try { dialog.showModal(); } catch { dialog.setAttribute('open', ''); }
      $('[data-action="close-medal"]', dialog).focus();
    },
    'close-medal': () => { ctx.audio.sfx('tap'); closeMedal(); },
    goal: (b) => {
      ctx.audio.sfx('tap');
      const g = normalizeGoal(Number(b.dataset.goal));
      ctx.store.update((st) => ({ ...st, settings: { ...st.settings, dailyGoal: g } }));
      const done = todayXp(ctx.store.get().progress, ctx.today());
      el.querySelectorAll('[data-action="goal"]').forEach((x) => {
        const on = Number(x.dataset.goal) === g;
        x.classList.toggle('is-on', on);
        x.setAttribute('aria-pressed', String(on));
      });
      $('.goal-row .ring', el).outerHTML = goalRing(done, g, 56);
      $('#goal-h .panel-aside', el).textContent = `${Math.min(done, g)}/${g} XP`;
      const chip = $('.chip-goal', el);
      if (chip) chip.outerHTML = goalChip(done, g);
    },
    theme: (b) => {
      ctx.audio.sfx('tap');
      markThemePicker(el, chooseTheme(ctx.store, b.dataset.value));
    },
    'ask-reset': (b) => {
      ctx.audio.sfx('tap');
      confirm.hidden = false;
      b.hidden = true;
      $('[data-action="cancel-reset"]', el).focus();
    },
    'cancel-reset': () => {
      ctx.audio.sfx('tap');
      confirm.hidden = true;
      const ask = $('[data-action="ask-reset"]', el);
      ask.hidden = false;
      ask.focus();
    },
    reset: () => {
      const keepSettings = ctx.store.get().settings;
      ctx.store.reset();
      ctx.store.update((st) => ({ ...st, settings: keepSettings, onboarded: true }));
      announce('Progreso borrado');
      ctx.go('inicio');
    },
  });
}

