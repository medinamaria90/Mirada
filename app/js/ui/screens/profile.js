// Perfil: quién eres (portada, nombre, rango), tus cifras, «Mi museo», logros, tu test de pintura,
// accesos a seguir practicando y, aparte, las hojas de ajustes, nombre y portada. Las piezas están en profile-*.js.

import { onAction, focusHeading, $ } from '../dom.js';
import { page } from '../shell.js';
import { playEra } from '../audio-bridge.js';
import { parseLastTest, coverWork, collectionIds } from '../../engine/profile.js';
import { heroHtml, upgradeCover } from './profile-hero.js';
import { figuresHtml, museumHtml, testHtml, practiceHtml } from './profile-parts.js';
import { medalsHtml, wireMedals } from './profile-medals.js';
import { settingsHtml, wireSettings } from './profile-settings.js';
import { nameSheetHtml, wireName } from './profile-name.js';
import { lookSheetHtml, wireLook } from './profile-look.js';
import { shareTest } from './profile-share.js';

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
const stylesReady = loadStyles();

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
  el.innerHTML = page(ctx, 'profile', `
    <div class="pf-layout">
      <div class="pf-col pf-col-side">
        ${heroHtml(ctx)}
        ${figuresHtml(ctx)}
        ${testHtml(last, { primary: hasPictures })}
        ${practiceHtml(ctx)}
      </div>
      <div class="pf-col pf-col-main">
        ${museumHtml(ctx)}
        ${medalsHtml(ctx)}
      </div>
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
  if (ctx.store.get().settings.music) playEra('menu'); // sin música no se carga el audio

  const go = (route) => () => { ctx.audio.sfx('tap'); ctx.go(route); };
  onAction(el, {
    ...wireMedals(ctx, el),
    ...wireSettings(ctx, el),
    ...wireName(ctx, el),
    ...wireLook(ctx, el),
    review5: go('repaso5'),
    weekly: go('reto-semanal'),
    'share-test': () => {
      ctx.audio.sfx('tap');
      const st = ctx.store.get();
      if (last) shareTest(ctx, last, coverWork(st.progress, ctx.index, st.settings.cover));
    },
  });
}
