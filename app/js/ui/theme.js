// Aplica el tema elegido en Ajustes: data-theme="light|dark" en <html> (sin atributo, el del móvil;
// brand.css define el oscuro para ambos casos) y el color de la barra del navegador (theme-color)
// leído de la variable --bg, nunca escrito a mano. El selector de Ajustes también se construye aquí.

import { THEMES, normalizeTheme } from '../state/schema.js';

const THEME_NAMES = { light: 'Claro', dark: 'Oscuro', system: 'Como el móvil' };

// Color original de cada <meta name="theme-color"> (uno por esquema), para volver a «como el móvil».
const SYSTEM_COLOR_ATTR = 'data-system-color';

export function applyTheme(theme, doc = document) {
  const t = normalizeTheme(theme);
  const html = doc.documentElement;
  if (t === 'system') html.removeAttribute('data-theme');
  else html.setAttribute('data-theme', t);
  syncThemeColor(t, doc);
  return t;
}

function syncThemeColor(theme, doc) {
  const metas = [...doc.querySelectorAll('meta[name="theme-color"]')];
  for (const m of metas) if (!m.hasAttribute(SYSTEM_COLOR_ATTR)) m.setAttribute(SYSTEM_COLOR_ATTR, m.getAttribute('content') || '');
  const view = doc.defaultView;
  const forced = theme !== 'system' && view ? view.getComputedStyle(doc.documentElement).getPropertyValue('--bg').trim() : '';
  for (const m of metas) m.setAttribute('content', forced || m.getAttribute(SYSTEM_COLOR_ATTR));
}

// Guarda el tema en el estado y lo aplica. Devuelve el tema normalizado.
export function chooseTheme(store, theme, doc = document) {
  const t = normalizeTheme(theme);
  store.update((st) => ({ ...st, settings: { ...st.settings, theme: t } }));
  return applyTheme(t, doc);
}

// Selector de Ajustes: tres botones segmentados (como los de la meta diaria).
export function themePicker(current) {
  const t = normalizeTheme(current);
  const buttons = THEMES.map((id) => `<button class="seg ${id === t ? 'is-on' : ''}" data-action="theme" data-value="${id}" aria-pressed="${id === t}"><span class="seg-num">${THEME_NAMES[id]}</span></button>`).join('');
  return `<div class="setting setting-theme"><span id="theme-h">Tema</span><div class="segs" role="group" aria-labelledby="theme-h">${buttons}</div></div>`;
}

// Tras pulsar una opción: marca la elegida sin repintar la pantalla.
export function markThemePicker(root, theme) {
  for (const b of root.querySelectorAll('[data-action="theme"]')) {
    const on = b.dataset.value === theme;
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', String(on));
  }
}
