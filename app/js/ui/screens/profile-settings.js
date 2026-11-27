// Ajustes del perfil, en una hoja aparte (botón ⚙ de la portada): meta del día, tema, música,
// sonidos, volumen, reducir animaciones, la sección «Superusuario» (con «Empezar de cero» y su confirmación) y,
// «Tu cuenta» (ui/account-section.js) y, al final, los enlaces a «Acerca de Sfumato» y «Fuentes y créditos».

import { $, announce } from '../dom.js';
import { icons } from '../icons.js';
import { goalRing, goalChip } from '../shell.js';
import { todayXp, normalizeGoal, GOAL_OPTIONS } from '../../engine/progress.js';
import { applyAudioSettings, playEra } from '../audio-bridge.js';
import { themePicker, chooseTheme, markThemePicker } from '../theme.js';
import { bindSheet } from './profile-sheet.js';
import { bindDjTaps } from '../dj-sheet.js';
import { superHtml, wireSuper } from '../su-section.js';
import { accountHtml, wireAccount } from '../account-section.js';

const GOAL_NAMES = { 50: 'Tranquila', 100: 'Constante', 200: 'Intensa' };
const RING = 56;
const TEST_KEYS = ['mirada.test.last', 'mirada.test.recent']; // los guarda el test de cultura (js/test/main.js)

// «Empezar de cero» no está en los ajustes de siempre: va en la sección «Superusuario», con su confirmación.
const RESET_HTML = `<div class="setting-reset">
        <button type="button" class="btn btn-quiet btn-wide" data-action="ask-reset">Empezar de cero</button>
        <div class="confirm" hidden>
          <p>Se borrará todo tu progreso.</p>
          <div class="sheet-actions">
            <button type="button" class="btn btn-secondary" data-action="cancel-reset">Cancelar</button>
            <button type="button" class="btn btn-danger" data-action="reset">Borrar todo</button>
          </div>
        </div>
      </div>`;

const toggle = (key, label, on) => `<label class="setting">
    <span>${label}</span>
    <input type="checkbox" role="switch" class="switch" data-setting="${key}" ${on ? 'checked' : ''}>
  </label>`;

export function settingsHtml(ctx) {
  const s = ctx.store.get().settings;
  const goal = normalizeGoal(s.dailyGoal);
  const done = todayXp(ctx.store.get().progress, ctx.today());
  const goalButtons = GOAL_OPTIONS.map((g) => `<button type="button" class="seg ${g === goal ? 'is-on' : ''}" data-action="goal" data-goal="${g}" aria-pressed="${g === goal}">
      <span class="seg-num">${g} XP</span><span class="seg-name">${GOAL_NAMES[g] || ''}</span></button>`).join('');
  return `<dialog class="card-dialog sheet-dialog settings-dialog" aria-labelledby="settings-title">
    <div class="dlg-body">
      <div class="sheet-head"><h2 id="settings-title" class="dlg-title">Ajustes</h2>
        <button type="button" class="icon-btn" data-action="close-sheet" aria-label="Cerrar">${icons.close(22)}</button></div>
      <div class="setting setting-goal"><span id="goal-h">Meta del día <span class="goal-aside">${Math.min(done, goal)}/${goal} XP</span></span>
        <div class="goal-row">${goalRing(done, goal, RING)}<div class="segs" role="group" aria-labelledby="goal-h">${goalButtons}</div></div></div>
      ${themePicker(s.theme)}
      ${toggle('music', 'Música', s.music)}
      ${toggle('sfx', 'Sonidos', s.sfx)}
      <label class="setting setting-range"><span>Volumen</span>
        <input type="range" min="0" max="100" step="5" value="${Math.round(s.volume * 100)}" data-setting="volume" aria-label="Volumen">
      </label>
      ${toggle('reducedMotion', 'Reducir animaciones', s.reducedMotion)}
      ${accountHtml()}
      ${superHtml(RESET_HTML)}
      <button type="button" class="settings-credits" data-action="about">Acerca de Sfumato</button>
      <button type="button" class="settings-credits" data-action="credits">Fuentes y créditos</button>
    </div>
  </dialog>`;
}

// Cambios de los interruptores y del volumen (se guardan al instante).
function onSettingChange(ctx, ev) {
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
}

export function wireSettings(ctx, el) {
  const dialog = $('.settings-dialog', el);
  const sheet = bindSheet(dialog);
  const confirm = $('.confirm', dialog);
  el.addEventListener('change', (ev) => onSettingChange(ctx, ev));
  bindDjTaps($('#settings-title', dialog));
  wireSuper(dialog, ctx, () => sheet.close());
  return {
    ...wireAccount(ctx, dialog),
    'open-settings': (b) => { ctx.audio.sfx('tap'); sheet.open(b, '[data-action="close-sheet"]'); },
    goal: (b) => {
      ctx.audio.sfx('tap');
      const g = normalizeGoal(Number(b.dataset.goal));
      ctx.store.update((st) => ({ ...st, settings: { ...st.settings, dailyGoal: g } }));
      const done = todayXp(ctx.store.get().progress, ctx.today());
      dialog.querySelectorAll('[data-action="goal"]').forEach((x) => {
        const on = Number(x.dataset.goal) === g;
        x.classList.toggle('is-on', on);
        x.setAttribute('aria-pressed', String(on));
      });
      $('.goal-row .ring', dialog).outerHTML = goalRing(done, g, RING);
      $('.goal-aside', dialog).textContent = `${Math.min(done, g)}/${g} XP`;
      const chip = $('.chip-goal', el);
      if (chip) chip.outerHTML = goalChip(done, g);
    },
    theme: (b) => {
      ctx.audio.sfx('tap');
      markThemePicker(dialog, chooseTheme(ctx.store, b.dataset.value));
    },
    about: () => {
      ctx.audio.sfx('tap');
      sheet.close();
      ctx.go('acerca');
    },
    credits: () => {
      ctx.audio.sfx('tap');
      sheet.close();
      ctx.go('fuentes');
    },
    'ask-reset': (b) => {
      ctx.audio.sfx('tap');
      confirm.hidden = false;
      b.hidden = true;
      $('[data-action="cancel-reset"]', dialog).focus();
    },
    'cancel-reset': () => {
      ctx.audio.sfx('tap');
      confirm.hidden = true;
      const ask = $('[data-action="ask-reset"]', dialog);
      ask.hidden = false;
      ask.focus();
    },
    reset: () => {
      // Se queda con los ajustes (tema, sonido…), pero el nombre, la portada, el avatar y el último
      // resultado del test son tuyos y se van con el progreso.
      const keepSettings = { ...ctx.store.get().settings, name: '', cover: '', avatar: '' };
      for (const key of TEST_KEYS) {
        try { localStorage.removeItem(key); } catch { /* sin almacenamiento: nada que borrar */ }
      }
      ctx.store.reset();
      ctx.store.update((st) => ({ ...st, settings: keepSettings, onboarded: true }));
      announce('Progreso borrado');
      ctx.go('inicio');
    },
  };
}
