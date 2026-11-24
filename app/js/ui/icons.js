// Iconos SVG en línea (trazo fino, heredan currentColor). Decorativos: aria-hidden.

const svg = (body, size = 22) =>
  `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

// Logotipo «Pieza» (marca, ronda 2): el vano relleno con el punto en hueco. Hereda currentColor.
export const logoMark = (s = 28) =>
  `<svg class="logo" width="${s}" height="${s}" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M10 38V23a14 14 0 0 1 28 0v15a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4ZM28.6 30.5a4.6 4.6 0 1 0-9.2 0a4.6 4.6 0 1 0 9.2 0Z" fill="currentColor" fill-rule="evenodd"/></svg>`;

export const icons = {
  sun: (s) => svg('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>', s),
  gem: (s) => svg('<path d="M6 4h12l3 5-9 11L3 9z"/><path d="M3 9h18M9 4l3 16M15 4l-3 16"/>', s),
  arch: (s) => svg('<path d="M6.5 20.5V11a5.5 5.5 0 0 1 11 0v9.5"/><path d="M4 20.5h16"/><circle cx="12" cy="14.5" r="1.6"/>', s),
  frames: (s) => svg('<rect x="3" y="4" width="8" height="10" rx="1"/><rect x="13" y="4" width="8" height="6" rx="1"/><rect x="13" y="12" width="8" height="8" rx="1"/><rect x="3" y="16" width="8" height="4" rx="1"/>', s),
  user: (s) => svg('<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.3-3.8 4.2-5.6 7.5-5.6s6.2 1.8 7.5 5.6"/>', s),
  close: (s) => svg('<path d="M6 6l12 12M18 6 6 18"/>', s),
  lock: (s) => svg('<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>', s),
  check: (s) => svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>', s),
  play: (s) => svg('<path d="M8 5.5v13l10-6.5z"/>', s),
  loupe: (s) => svg('<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>', s),
  eye: (s) => svg('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>', s),
  prev: (s) => svg('<path d="M15 5l-7 7 7 7"/>', s),
  next: (s) => svg('<path d="M9 5l7 7-7 7"/>', s),
  calendar: (s) => svg('<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>', s),
  repeat: (s) => svg('<path d="M4 11a8 8 0 0 1 14-4.5L20 8"/><path d="M20 4v4h-4"/><path d="M20 13a8 8 0 0 1-14 4.5L4 16"/><path d="M4 20v-4h4"/>', s),
  duel: (s) => svg('<path d="M4 4l9 9M4 4v4M4 4h4"/><path d="M20 4l-9 9M20 4v4M20 4h-4"/><path d="M7 17l-3 3M17 17l3 3M9.5 14.5l-3 3M14.5 14.5l3 3"/>', s),
  copy: (s) => svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>', s),
  medal: (s) => svg('<circle cx="12" cy="14.5" r="5.5"/><path d="M8.5 3.5 10.5 9M15.5 3.5 13.5 9"/>', s),
  laurel: (s) => svg('<path d="M10.5 20.5C6.6 19.2 4.6 15.6 5.6 10.2 6 8 6.9 6.2 8 5"/><path d="M13.5 20.5c3.9-1.3 5.9-4.9 4.9-10.3-.4-2.2-1.3-4-2.4-5.2"/><ellipse cx="4.6" cy="7.6" rx="1.25" ry="2.3" transform="rotate(-25 4.6 7.6)" fill="currentColor" stroke="none"/><ellipse cx="3.9" cy="11.4" rx="1.25" ry="2.3" transform="rotate(0 3.9 11.4)" fill="currentColor" stroke="none"/><ellipse cx="4.8" cy="15.1" rx="1.25" ry="2.3" transform="rotate(30 4.8 15.1)" fill="currentColor" stroke="none"/><ellipse cx="7.2" cy="18.1" rx="1.25" ry="2.3" transform="rotate(60 7.2 18.1)" fill="currentColor" stroke="none"/><ellipse cx="19.4" cy="7.6" rx="1.25" ry="2.3" transform="rotate(25 19.4 7.6)" fill="currentColor" stroke="none"/><ellipse cx="20.1" cy="11.4" rx="1.25" ry="2.3" transform="rotate(0 20.1 11.4)" fill="currentColor" stroke="none"/><ellipse cx="19.2" cy="15.1" rx="1.25" ry="2.3" transform="rotate(-30 19.2 15.1)" fill="currentColor" stroke="none"/><ellipse cx="16.8" cy="18.1" rx="1.25" ry="2.3" transform="rotate(-60 16.8 18.1)" fill="currentColor" stroke="none"/>', s),
  shuffle: (s) => svg('<path d="M3.5 7h3.2c2 0 3.2 1 4.3 2.7l2 3.2c1.1 1.7 2.3 2.6 4.3 2.6h3.2"/><path d="M3.5 17h3.2c1.4 0 2.4-.5 3.2-1.4M14.1 8.4c.8-.9 1.8-1.4 3.2-1.4h3.2"/><path d="m18 4.5 2.5 2.5L18 9.5M18 13l2.5 2.5L18 18"/>', s),
  target: (s) => svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>', s),
  gear: (s) => svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>', s),
};
