// Perfil: quién eres (portada, nombre, rango), tus cifras, «Mi museo», logros, tu test de pintura,
// accesos a seguir practicando y, aparte, la hoja de ajustes. Las piezas están en profile-*.js.

import { onAction, focusHeading, $ } from '../dom.js';
import { page } from '../shell.js';
import { playEra } from '../audio-bridge.js';
import { parseLastTest, testShareText } from '../../engine/profile.js';
import { heroHtml, figuresHtml, museumHtml, testHtml, practiceHtml } from './profile-parts.js';
import { medalsHtml, wireMedals } from './profile-medals.js';
import { settingsHtml, wireSettings } from './profile-settings.js';
import { nameSheetHtml, wireName } from './profile-name.js';

export { graceLine } from './profile-parts.js';

// Los estilos del perfil se piden al abrirlo (no pesan en el arranque); el módulo espera a que lleguen
// para que no parpadee sin estilo.
function loadStyles() {
  if (typeof document === 'undefined' || typeof document.querySelector !== 'function') return Promise.resolve();
  const href = new URL('../../../css/profile.css', import.meta.url).href;
  if (document.querySelector(`link[href="${href}"]`)) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = resolve;
    link.onerror = resolve; // sin estilos el perfil se ve peor, pero se ve
    document.head.append(link);
  });
}
await loadStyles();

const TEST_KEY = 'mirada.test.last'; // lo escribe el test de cultura (js/test/main.js)
const MEDALS_SCROLL_OFFSET = -72;

function readLastTest() {
  try {
    return parseLastTest(localStorage.getItem(TEST_KEY));
  } catch {
    return null;
  }
}

async function shareTest(ctx, last) {
  const text = testShareText(last, new URL('test/', location.href).href);
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    ctx.toast('Copiado');
  } catch {
    ctx.toast('No se ha podido copiar');
  }
}

// opts.focus: 'medals' para abrir directamente en los logros (#medallas).
export function renderProfile(ctx, el, opts = {}) {
  const last = readLastTest();
  el.innerHTML = page(ctx, 'profile', `
    ${heroHtml(ctx)}
    <div class="pf-body">
      ${figuresHtml(ctx)}
      ${museumHtml(ctx)}
      ${medalsHtml(ctx)}
      ${testHtml(last)}
      ${practiceHtml(ctx)}
    </div>
    ${settingsHtml(ctx)}
    ${nameSheetHtml()}`);
  if (opts.focus === 'medals') {
    const h = $('#pf-medals-h', el);
    h.setAttribute('tabindex', '-1');
    h.focus({ preventScroll: true });
    $('#logros', el).scrollIntoView({ block: 'start' });
    window.scrollBy(0, MEDALS_SCROLL_OFFSET);
  } else focusHeading(el);
  playEra('menu');

  const go = (route) => () => { ctx.audio.sfx('tap'); ctx.go(route); };
  onAction(el, {
    ...wireMedals(ctx, el),
    ...wireSettings(ctx, el),
    ...wireName(ctx, el),
    'close-sheet': (b) => { ctx.audio.sfx('tap'); b.closest('dialog')?.close(); },
    review5: go('repaso5'),
    weekly: go('reto-semanal'),
    'share-test': () => { ctx.audio.sfx('tap'); if (last) shareTest(ctx, last); },
  });
}
