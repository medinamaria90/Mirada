// Perfil: quién eres (avatar y nombre), tu rango y lo que pide el siguiente, cuatro cifras, una fila de
// logros, «Practicar» y, aparte, las hojas de ajustes, nombre, avatar, rangos y logro. Las piezas están en
// profile-*.js; la pantalla de todos los logros (#logros), en achievements.js.

import { onAction, focusHeading } from '../dom.js';
import { page } from '../shell.js';
import { playEra } from '../audio-bridge.js';
import { parseLastTest, shareCover, collectionIds } from '../../engine/profile.js';
import { heroHtml } from './profile-hero.js';
import { welcomeHtml, practiceHtml } from './profile-parts.js';
import { medalsHtml, medalSheetHtml, wireMedals } from './profile-medals.js';
import { rankCardHtml, rankSheetsHtml, wireRank } from './profile-rank.js';
import { statsHtml } from './profile-stats.js';
import { renderAchievements } from './achievements.js';
import { settingsHtml, wireSettings } from './profile-settings.js';
import { nameSheetHtml, wireName } from './profile-name.js';
import { lookSheetHtml, wireLook } from './profile-look.js';

const TEST_KEY = 'mirada.test.last'; // lo escribe el test de cultura (js/test/main.js)
const STYLES_WAIT_MS = 1500; // si los estilos tardan más, se pinta igual

// Los estilos del perfil se piden al abrirlo (no pesan en el arranque). Mientras llegan se enseña un
// esqueleto; si no llegan en STYLES_WAIT_MS, se sigue sin ellos.
// profile.css: identidad, hojas y ajustes; profile-cards.css: rango, cifras, logros y la pantalla de logros.
function loadStyles(file) {
  if (typeof document === 'undefined' || typeof document.querySelector !== 'function') return Promise.resolve();
  const href = new URL(`../../../css/${file}`, import.meta.url).href;
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
const stylesReady = Promise.all([loadStyles('profile.css'), loadStyles('profile-cards.css')]);

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
  return `<div aria-hidden="true">${block('5.5rem', 'width:5.5rem;border-radius:999px;margin:1rem 1.1rem 0')}
    <div style="display:grid;gap:1.1rem;padding:1.6rem 1.1rem">${block('2rem', 'width:60%')}${block('12px')}${block('5rem')}${block('9rem')}</div></div>`;
}

export async function renderMedals(ctx, el) {
  el.innerHTML = skeletonHtml();
  await stylesReady;
  if (el.isConnected) renderAchievements(ctx, el);
}

// Sin cuadros vistos, en lugar de las cuatro cifras (a cero) va la bienvenida, que dice por dónde empezar.
export async function renderProfile(ctx, el) {
  el.innerHTML = page(ctx, 'profile', skeletonHtml());
  await stylesReady;
  if (!el.isConnected) return; // mientras tanto se fue a otra pantalla
  const last = readLastTest();
  const hasPictures = collectionIds(ctx.store.get().progress, ctx.index).length > 0;
  el.innerHTML = page(ctx, 'profile', `
    <div class="pf-layout ${hasPictures ? '' : 'is-new'}">
      ${heroHtml(ctx)}
      ${rankCardHtml(ctx)}
      ${hasPictures ? statsHtml(ctx) : welcomeHtml()}
      ${medalsHtml(ctx)}
      ${practiceHtml(ctx, last)}
    </div>
    ${settingsHtml(ctx)}
    ${nameSheetHtml()}
    ${lookSheetHtml()}
    ${rankSheetsHtml()}
    ${medalSheetHtml()}`);
  focusHeading(el);
  // Sin música no se carga el audio; con ella, cuando el navegador esté libre (componerla pesa).
  if (ctx.store.get().settings.music) (typeof requestIdleCallback === 'function' ? requestIdleCallback : setTimeout)(() => playEra('menu'));

  const go = (route) => () => { ctx.audio.sfx('tap'); ctx.go(route); };
  onAction(el, {
    ...wireMedals(ctx, el),
    ...wireRank(ctx, el),
    ...wireSettings(ctx, el),
    ...wireName(ctx, el),
    ...wireLook(ctx, el),
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
  button.innerHTML = '<span class="pf-spinner" aria-hidden="true"></span>';
  try {
    const { shareTest } = await import('./profile-share.js');
    const st = ctx.store.get();
    // La tarjeta sale de la lista blanca: el cuadro del avatar solo viaja si es amable.
    await shareTest(ctx, last, shareCover(st.progress, ctx.index, st.settings.avatar));
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
