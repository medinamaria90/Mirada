// «Borrar progreso» al final de Ajustes: un botón discreto y, al pulsarlo, un diálogo propio con dos pasos
// (aviso y «mantén pulsado»). La lógica de qué se borra está en state/wipe.js.

import { $, announce } from './dom.js';
import { safeStorage, forgetCoachSeen } from '../state/store.js';
import { wipeProgress, freshState } from '../state/wipe.js';
import { createHold, bindHold } from './hold-press.js';

export const HOLD_MS = 2000;
const STEP_ONE = 'wipe-title';
const STEP_TWO = 'wipe-title-2';

export const wipeButtonHtml = () => '<button type="button" class="settings-wipe" data-action="wipe-ask" aria-haspopup="dialog">Borrar progreso</button>';

export const wipeDialogHtml = () => `<dialog class="card-dialog wipe-dialog" aria-labelledby="${STEP_ONE}">
    <div class="dlg-body">
      <div class="wipe-step" data-step="1">
        <h2 id="${STEP_ONE}" class="dlg-title">¿Borrar todo tu progreso?</h2>
        <p>Se perderán tus pintores, cuadros, medallas, racha y ajustes de juego. No se puede deshacer.</p>
        <p class="wipe-keep">Se conservan el tema, el volumen y la música.</p>
        <p class="wipe-cloud" hidden>También se borrará en tu cuenta.</p>
        <div class="sheet-actions">
          <button type="button" class="btn btn-primary" data-action="wipe-cancel">Cancelar</button>
          <button type="button" class="btn btn-quiet" data-action="wipe-next">Borrar</button>
        </div>
      </div>
      <div class="wipe-step" data-step="2" hidden>
        <h2 id="${STEP_TWO}" class="dlg-title">Última confirmación. Es irreversible.</h2>
        <button type="button" class="btn wipe-hold"><span class="wipe-fill" aria-hidden="true"></span><span class="wipe-label">Mantén pulsado para borrar</span></button>
        <button type="button" class="btn btn-primary" data-action="wipe-cancel">Cancelar</button>
      </div>
    </div>
  </dialog>`;

// ¿Hay sesión de nube? Hoy el proyecto no está configurado (cloud/config.js vacío) y devuelve null.
async function cloudAccount() {
  try {
    const config = await import('../cloud/config.js');
    if (!config.cloudReady()) return null;
    const { account } = await import('../cloud/cloud.js');
    return account.signedIn() ? account : null;
  } catch (err) {
    console.warn('cuenta no disponible:', err);
    return null;
  }
}

// Borra y vuelve a la bienvenida. Recargar deja la memoria limpia; antes se sube lo borrado si hay cuenta.
async function wipeAll(ctx, account) {
  if (ctx.store.inTrial()) ctx.store.exitTrial();
  const settings = ctx.store.get().settings;
  const storage = safeStorage(() => window.localStorage);
  if (!storage) {
    ctx.store.reset();
    ctx.store.update((st) => ({ ...st, settings: freshState(settings).settings }));
    ctx.go('inicio');
    return;
  }
  wipeProgress(storage, settings);
  forgetCoachSeen();
  if (account && !(await account.pushNow())) {
    ctx.toast('No se ha podido borrar en tu cuenta. Prueba con conexión.');
    return;
  }
  history.replaceState(null, '', location.pathname + location.search);
  location.reload();
}

/** Conecta el diálogo (ya dentro de Ajustes). Devuelve sus acciones para onAction. */
export function wireWipe(ctx, root) {
  const dialog = $('.wipe-dialog', root);
  const steps = [...dialog.querySelectorAll('.wipe-step')];
  const holdBtn = $('.wipe-hold', dialog);
  let account = null;

  const show = (n) => {
    steps.forEach((s) => { s.hidden = s.dataset.step !== String(n); });
    dialog.setAttribute('aria-labelledby', n === 1 ? STEP_ONE : STEP_TWO);
  };
  const hold = createHold({
    ms: HOLD_MS,
    onStart: () => { holdBtn.style.setProperty('--wipe-ms', `${HOLD_MS}ms`); holdBtn.classList.add('is-holding'); },
    onCancel: () => holdBtn.classList.remove('is-holding'),
    onDone: () => {
      holdBtn.classList.remove('is-holding');
      announce('Borrando progreso');
      wipeAll(ctx, account).catch((err) => { console.error(err); ctx.toast('No se ha podido borrar'); });
    },
  });
  bindHold(holdBtn, hold);
  dialog.addEventListener('close', () => { hold.cancel(); show(1); });
  dialog.addEventListener('click', (ev) => { if (ev.target === dialog) dialog.close(); });

  return {
    'wipe-ask': async () => {
      ctx.audio.sfx('tap');
      account = await cloudAccount();
      $('.wipe-cloud', dialog).hidden = !account;
      show(1);
      dialog.showModal();
      $('[data-action="wipe-cancel"]', dialog).focus();
    },
    'wipe-next': () => {
      ctx.audio.sfx('tap');
      if (account && navigator.onLine === false) { ctx.toast('Sin conexión: no se puede borrar tu cuenta.'); return; }
      show(2);
      $('[data-action="wipe-cancel"]:not([hidden])', steps[1]).focus();
    },
    'wipe-cancel': () => { ctx.audio.sfx('tap'); dialog.close(); },
  };
}
