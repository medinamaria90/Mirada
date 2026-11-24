// Utilidades mínimas de DOM y texto.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
}

export function $(sel, root = document) {
  return root.querySelector(sel);
}

export function $$(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

// Delegación: data-action="nombre" en cualquier elemento pulsable.
export function onAction(root, handlers) {
  const listener = (ev) => {
    const el = ev.target.closest('[data-action]');
    if (!el || !root.contains(el)) return;
    if (el.getAttribute('aria-disabled') === 'true' && !el.dataset.allowDisabled) return;
    const fn = handlers[el.dataset.action];
    if (fn) fn(el, ev);
  };
  root.addEventListener('click', listener);
  return () => root.removeEventListener('click', listener);
}

export function focusHeading(root) {
  const h = root.querySelector('[data-autofocus]') || root.querySelector('h1');
  if (h) {
    if (!h.hasAttribute('tabindex') && !/^(BUTTON|A|INPUT)$/.test(h.tagName)) h.setAttribute('tabindex', '-1');
    h.focus({ preventScroll: true });
  }
}

let liveTimer = null;
export function clearAnnounce() {
  clearTimeout(liveTimer);
  const live = document.getElementById('live');
  if (live) live.textContent = '';
}

export function announce(text) {
  const live = document.getElementById('live');
  if (!live) return;
  live.textContent = '';
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => {
    live.textContent = text;
  }, 60);
}

// Texto de color legible sobre un fondo dado (#rrggbb).
export function onColor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return L > 0.35 ? '#1d1b18' : '#ffffff';
}

export function safeAccent(hex) {
  return /^#[0-9a-f]{6}$/i.test(hex || '') ? hex : '#6b5b45';
}

export function accentStyle(hex) {
  const a = safeAccent(hex);
  return `--accent:${a};--on-accent:${onColor(a)}`;
}

const DATE_FMT = (() => {
  try {
    return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch {
    return null;
  }
})();

export function longDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const text = DATE_FMT ? DATE_FMT.format(date) : key;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function prefersReducedMotion() {
  return document.documentElement.classList.contains('reduce-motion')
    || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

export function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}
