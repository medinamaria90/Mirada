// Compartir una historia (ui/story-viewer.js): el botón de la cabecera manda el enlace a su página para compartir (h/<pintor>-1.html,
// tools/share_pages.py: lleva el cuadro y la primera frase para la vista previa de WhatsApp), que abre la app en la historia para
// cualquiera (ui/story-link.js). Con la hoja de compartir del móvil (Web Share API) si la hay; si no, copia el enlace y lo avisa
// dentro de la propia historia (el aviso general quedaría debajo de ella).

import { icons } from './icons.js';

const APP_NAME = 'Sfumato';
const NOTE_MS = 2600; // lo que se ve el aviso «Enlace copiado»

let noteTimer = null;

export const SHARE_RESULT = Object.freeze({ SHARED: 'shared', COPIED: 'copied', CANCELLED: 'cancelled', FAILED: 'failed' });

export const shareButtonHtml = () =>
  `<button type="button" class="story-icon" data-st="share" aria-label="Compartir">${icons.share(20)}</button>`;

export const noteHtml = () => '<p class="story-note" role="status" aria-live="polite"></p>';

// Enlace a la página de la historia en esta misma dirección de la app (sin nada de quien comparte).
export const storyUrl = (artistId, level, href = location.href) => new URL(`h/${artistId}-${level}.html`, href).href;

// title: el de la historia («Quién fue Velázquez»). Devuelve SHARE_RESULT.
export async function shareStory({ artistId, level, title }) {
  const url = storyUrl(artistId, level);
  if (navigator.share) {
    try {
      await navigator.share({ title: `${title} · ${APP_NAME}`, text: `${title}, en ${APP_NAME}`, url });
      return SHARE_RESULT.SHARED;
    } catch (err) {
      if (err?.name === 'AbortError') return SHARE_RESULT.CANCELLED;
      console.info('Sin hoja de compartir:', err?.message);
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return SHARE_RESULT.COPIED;
  } catch (err) {
    console.info('No se ha podido copiar:', err?.message);
    return SHARE_RESULT.FAILED;
  }
}

const NOTES = { [SHARE_RESULT.COPIED]: 'Enlace copiado', [SHARE_RESULT.FAILED]: 'No se ha podido copiar' };

// Aviso breve dentro de la historia según cómo fue (nada si se compartió o se canceló).
export function flashNote(dlg, result) {
  const el = dlg.querySelector('.story-note');
  const text = NOTES[result];
  if (!el || !text) return;
  clearTimeout(noteTimer);
  el.textContent = text;
  el.classList.add('is-on');
  noteTimer = setTimeout(() => { el.classList.remove('is-on'); el.textContent = ''; }, NOTE_MS);
}
