// Compartir una historia (ui/story-viewer.js) o las tarjetas de una época (ui/screens/era-cards.js): el botón manda el enlace a su
// página para compartir (h/<pintor>-1.html, h/epoca-<id>.html; tools/share_pages.py: llevan el cuadro y una frase para la vista
// previa de WhatsApp), que abre la app en la historia o en la época para cualquiera (ui/story-link.js, renderIntro 'shared').
// Con la hoja de compartir del móvil (Web Share API) si la hay; si no, copia el enlace y lo avisa (en la historia, dentro de ella:
// el aviso general quedaría debajo).

const APP_NAME = 'Sfumato';
const NOTE_MS = 2600; // lo que se ve el aviso «Enlace copiado»

let noteTimer = null;

export const SHARE_RESULT = Object.freeze({ SHARED: 'shared', COPIED: 'copied', CANCELLED: 'cancelled', FAILED: 'failed' });

export const noteHtml = () => '<p class="story-note" role="status" aria-live="polite"></p>';

// Enlace a la página de la historia en esta misma dirección de la app (sin nada de quien comparte).
export const storyUrl = (artistId, level, href = location.href) => new URL(`h/${artistId}-${level}.html`, href).href;

// Enlace a la página de las tarjetas de una época, igual que el de las historias.
export const eraUrl = (movementId, href = location.href) => new URL(`h/epoca-${movementId}.html`, href).href;

// title: lo que se comparte («Quién fue Velázquez», «Barroco»); text: la frase, si no es «<title>, en Sfumato» (el cierre de
// una época: «He terminado el Barroco en Sfumato»). Sin hoja de compartir se copia la frase con el enlace. Devuelve SHARE_RESULT.
export async function shareLink({ url, title, text = '' }) {
  if (navigator.share) {
    try {
      await navigator.share({ title: `${title} · ${APP_NAME}`, text: text || `${title}, en ${APP_NAME}`, url });
      return SHARE_RESULT.SHARED;
    } catch (err) {
      if (err?.name === 'AbortError') return SHARE_RESULT.CANCELLED;
      console.info('Sin hoja de compartir:', err?.message);
    }
  }
  try {
    await navigator.clipboard.writeText(text ? `${text}\n${url}` : url);
    return SHARE_RESULT.COPIED;
  } catch (err) {
    console.info('No se ha podido copiar:', err?.message);
    return SHARE_RESULT.FAILED;
  }
}

export const shareStory = ({ artistId, level, title }) => shareLink({ url: storyUrl(artistId, level), title });

export const NOTES = { [SHARE_RESULT.COPIED]: 'Enlace copiado', [SHARE_RESULT.FAILED]: 'No se ha podido copiar' };

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
