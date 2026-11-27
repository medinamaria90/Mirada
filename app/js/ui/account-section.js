// «Tu cuenta» en Ajustes: «Continuar con Google» y, con sesión, el email, si está guardado, «Cerrar sesión» y
// «Borrar mi cuenta y datos» (con su confirmación). Oculta mientras no haya proyecto configurado (cloud/config.js).
// La lógica está en cloud/; aquí solo la sección.

import { esc, announce } from './dom.js';
import { loadCss } from './lazy-css.js';
import { safeStorage, STORAGE_KEY } from '../state/store.js';

const STATUS_TEXT = { saving: 'Guardando…', ok: 'Guardado', offline: 'Sin conexión', off: '' };
const PRIVACY = '<a class="settings-credits" href="privacidad.html">Privacidad</a>';
const GOOGLE_G = `<svg class="acc-g" viewBox="0 0 48 48" aria-hidden="true">
  <path class="g-r" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/>
  <path class="g-b" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z"/>
  <path class="g-y" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/>
  <path class="g-g" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.2 1.5-5 2.3-8.5 2.3-6.2 0-11.5-4.2-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/>
</svg>`;

export const accountHtml = () => '<section class="acc" aria-labelledby="acc-title" hidden><h3 id="acc-title" class="acc-title">Tu cuenta</h3><div class="acc-body"></div></section>';

const signedOutHtml = () => `<button type="button" class="btn btn-secondary btn-wide acc-google" data-action="acc-google">${GOOGLE_G}<span>Continuar con Google</span></button>
  ${PRIVACY}`;

const signedInHtml = (email, status) => `<p class="acc-who"><span class="acc-email">${esc(email)}</span><span class="acc-status" aria-live="polite">${STATUS_TEXT[status] || ''}</span></p>
  <button type="button" class="btn btn-secondary btn-wide" data-action="acc-out">Cerrar sesión</button>
  ${PRIVACY}
  <div class="setting-reset">
    <button type="button" class="btn btn-quiet btn-wide" data-action="acc-ask-delete">Borrar mi cuenta y datos</button>
    <div class="confirm" hidden>
      <p>Se borrarán tu cuenta y tu progreso en la nube. En este dispositivo se queda.</p>
      <div class="sheet-actions">
        <button type="button" class="btn btn-secondary" data-action="acc-cancel-delete">Cancelar</button>
        <button type="button" class="btn btn-danger" data-action="acc-delete">Borrar</button>
      </div>
    </div>
  </div>`;

// Acciones del botón mientras trabaja: no admite otro toque y no pierde el foco.
async function busy(button, fn) {
  if (button.getAttribute('aria-busy') === 'true') return;
  button.setAttribute('aria-busy', 'true');
  button.setAttribute('aria-disabled', 'true');
  try {
    await fn();
  } finally {
    button.removeAttribute('aria-busy');
    button.removeAttribute('aria-disabled');
  }
}

/** Conecta la sección (ya dentro de Ajustes). Devuelve sus acciones para onAction. */
export function wireAccount(ctx, root) {
  const section = root.querySelector('.acc');
  const body = section.querySelector('.acc-body');
  let cloud = null;
  let stopStatus = () => {};

  function paint() {
    const { account } = cloud;
    stopStatus();
    if (!account.signedIn()) { body.innerHTML = signedOutHtml(); return; }
    body.innerHTML = signedInHtml(account.email(), account.status());
    const label = body.querySelector('.acc-status');
    stopStatus = account.onStatus((st) => { if (label.isConnected) label.textContent = STATUS_TEXT[st] || ''; });
  }

  import('../cloud/config.js')
    .then((c) => (c.cloudReady() ? Promise.all([import('../cloud/cloud.js'), loadCss('css/cuenta.css')]) : null))
    .then((r) => {
      if (!r) return;
      [cloud] = r;
      cloud.startCloud({ store: ctx.store, storage: safeStorage(() => window.localStorage), stateKey: STORAGE_KEY });
      paint();
      section.hidden = false;
    })
    .catch(() => {});

  const confirmBox = () => body.querySelector('.confirm');
  return {
    'acc-google': (b) => busy(b, async () => {
      ctx.audio.sfx('tap');
      await cloud.account.signIn().catch(() => ctx.toast('No se ha podido entrar'));
    }),
    'acc-out': (b) => busy(b, async () => {
      ctx.audio.sfx('tap');
      await cloud.account.signOut();
      paint();
      announce('Sesión cerrada');
      body.querySelector('[data-action="acc-google"]')?.focus();
    }),
    'acc-ask-delete': (b) => {
      ctx.audio.sfx('tap');
      confirmBox().hidden = false;
      b.hidden = true;
      body.querySelector('[data-action="acc-cancel-delete"]').focus();
    },
    'acc-cancel-delete': () => {
      ctx.audio.sfx('tap');
      confirmBox().hidden = true;
      const ask = body.querySelector('[data-action="acc-ask-delete"]');
      ask.hidden = false;
      ask.focus();
    },
    'acc-delete': (b) => busy(b, async () => {
      try {
        await cloud.account.deleteAccount();
        paint();
        ctx.toast('Cuenta borrada');
        body.querySelector('[data-action="acc-google"]')?.focus();
      } catch {
        ctx.toast('No se ha podido borrar. Prueba con conexión.');
      }
    }),
  };
}
