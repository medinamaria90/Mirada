// Perfil: quién eres (portada, nombre, rango), tu rango, logros, tu test de pintura,
// accesos a seguir practicando y, aparte, las hojas de ajustes, nombre y portada. Las piezas están en profile-*.js.

import { onAction, focusHeading, $ } from '../dom.js';
import { page } from '../shell.js';
import { playEra } from '../audio-bridge.js';
import { parseLastTest, shareCover, collectionIds } from '../../engine/profile.js';
import { loadGentle, gentleWorks } from './profile-art.js';
import { heroHtml, upgradeCover } from './profile-hero.js';
import { welcomeHtml, testHtml, practiceHtml } from './profile-parts.js';
import { medalsHtml, wireMedals } from './profile-medals.js';
import { settingsHtml, wireSettings } from './profile-settings.js';
import { nameSheetHtml, wireName } from './profile-name.js';
import { lookSheetHtml, wireLook } from './profile-look.js';

const TEST_KEY = 'mirada.test.last'; // lo escribe el test de cultura (js/test/main.js)
const STYLES_WAIT_MS = 1500; // si los estilos tardan más, se pinta igual

// Los estilos del perfil se piden al abrirlo (no pesan en el arranque). Mientras llegan se enseña un
// esqueleto; si no llegan en STYLES_WAIT_MS, se sigue sin ellos.
function loadStyles() {
  if (typeof document === 'undefined' || typeof document.querySelector !== 'function') return Promise.resolve();
  const href = new URL('../../../css/profile.css', import.meta.url).href;
  if (document.querySelector(`link[href="${href}"]`)) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = resolve;
    link.onerror = resolve;
    document.head.append(link);
    setTimeout(resolve, STYLES_WAIT_MS);
  });
}
const stylesReady = Promise.all([loadStyles(), loadGentle()]);

function readLastTest() {
  try {
    return parseLastTest(localStorage.getItem(TEST_KEY));
  } catch {
    return null;
  }
}

// Bloques grises con el tamaño del perfil (estilos en línea con variables: no dependen de profile.css).
function skeletonHtml() {
  const block = (h, extra = '') => `<div style="height:${h};border-radius:var(--radius-sm);background:var(--surface-2);${extra}"></div>`;
  return `<div aria-hidden="true">${block('156px', 'border-radius:0')}
    <div style="display:grid;gap:1.1rem;padding:1.6rem 1.1rem">${block('2rem', 'width:60%')}${block('12px')}${block('5rem')}${block('9rem')}</div></div>`;
}

// opts.focus: 'medals' para abrir directamente en los logros (#medallas).
export async function renderProfile(ctx, el, opts = {}) {
  el.innerHTML = page(ctx, 'profile', skeletonHtml());
  await stylesReady;
  if (!el.isConnected) return; // mientras tanto se fue a otra pantalla
  const last = readLastTest();
  const hasPictures = collectionIds(ctx.store.get().progress, ctx.index).length > 0;
  const test = testHtml(last, { primary: hasPictures });
  el.innerHTML = page(ctx, 'profile', `
    <div class="pf-layout ${hasPictures ? '' : 'is-new'}">
      ${heroHtml(ctx)}
      ${hasPictures ? `${medalsHtml(ctx)}${test}` : `${welcomeHtml()}${test}${medalsHtml(ctx)}`}
      ${practiceHtml(ctx)}
    </div>
    ${settingsHtml(ctx)}
    ${nameSheetHtml()}
    ${lookSheetHtml()}`);
  upgradeCover(el);
  if (opts.focus === 'medals') {
    const h = $('#pf-medals-h', el);
    h.setAttribute('tabindex', '-1');
    h.focus({ preventScroll: true });
    $('#logros', el).scrollIntoView({ block: 'start' });
  } else focusHeading(el);
  // Sin música no se carga el audio; con ella, cuando el navegador esté libre (componerla pesa).
  if (ctx.store.get().settings.music) (typeof requestIdleCallback === 'function' ? requestIdleCallback : setTimeout)(() => playEra('menu'));

  const go = (route) => () => { ctx.audio.sfx('tap'); ctx.go(route); };
  onAction(el, {
    ...wireMedals(ctx, el),
    ...wireSettings(ctx, el),
    ...wireName(ctx, el),
    ...wireLook(ctx, el),
    review5: go('repaso5'),
    weekly: go('reto-semanal'),
    'share-test': (b) => shareLast(ctx, b, last),
  });
}

// «Compartir»: el código de la tarjeta se pide al pulsar. Mientras se genera, el botón espera (aria-disabled,
// no disabled, para que no pierda el foco) y no admite otro toque; al terminar, el foco sigue en él.
async function shareLast(ctx, button, last) {
  if (!last || button.getAttribute('aria-busy') === 'true') return;
  ctx.audio.sfx('tap');
  const label = button.innerHTML;
  button.setAttribute('aria-busy', 'true');
  button.setAttribute('aria-disabled', 'true');
  button.innerHTML = '<span class="pf-spinner" aria-hidden="true"></span><span>Preparando…</span>';
  try {
    const { shareTest } = await import('./profile-share.js');
    const st = ctx.store.get();
    // La tarjeta sale de la lista blanca: la portada elegida solo viaja si es amable.
    await shareTest(ctx, last, shareCover(st.progress, ctx.index, st.settings.cover, gentleWorks()));
  } catch (err) {
    console.error(err);
    ctx.toast('No se ha podido compartir');
  } finally {
    button.removeAttribute('aria-busy');
    button.removeAttribute('aria-disabled');
    button.innerHTML = label;
    button.focus({ preventScroll: true });
  }
}
