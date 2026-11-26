// Nombre del perfil: opcional, hasta NAME_MAX caracteres, guardado solo en este navegador
// (settings.name). Se cambia en una hoja con un campo y «Guardar»; vacío, se quita.

import { $, announce } from '../dom.js';
import { NAME_MAX, normalizeName, graphemes } from '../../state/schema.js';
import { bindSheet } from './profile-sheet.js';
import { refreshHero } from './profile-hero.js';

export function nameSheetHtml() {
  return `<dialog class="card-dialog sheet-dialog name-dialog" aria-labelledby="name-dlg-title">
    <form class="dlg-body name-form" novalidate>
      <h2 id="name-dlg-title" class="dlg-title">Tu nombre</h2>
      <input class="pf-input" name="nickname" type="text" inputmode="text" autocomplete="nickname" autocapitalize="words" autocorrect="off" data-lpignore="true" data-1p-ignore data-form-type="other" enterkeyhint="done" spellcheck="false" aria-labelledby="name-dlg-title" aria-describedby="name-note">
      <p class="pf-note" id="name-note"><span>Solo se guarda en este dispositivo</span><span class="pf-counter" aria-hidden="true">0/${NAME_MAX}</span></p>
      <div class="sheet-actions">
        <button type="button" class="btn btn-secondary" data-action="close-sheet">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
    </form>
  </dialog>`;
}

export function wireName(ctx, el) {
  const dialog = $('.name-dialog', el);
  const form = $('.name-form', dialog);
  const input = $('.pf-input', dialog);
  const sheet = bindSheet(dialog);
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const name = normalizeName(input.value);
    ctx.store.update((st) => ({ ...st, settings: { ...st.settings, name } }));
    sheet.close();
    // Solo se repinta la identidad (el resto de la pantalla no cambia); el foco vuelve al nombre.
    refreshHero(ctx, el);
    announce(name ? `Nombre guardado: ${name}` : 'Nombre quitado');
  });
  const counter = $('.pf-counter', dialog);
  // Máximo por caracteres como se ven (grafemas): un emoji compuesto o con tono de piel cuenta uno.
  const count = () => {
    const chars = graphemes(input.value);
    if (chars.length > NAME_MAX) input.value = chars.slice(0, NAME_MAX).join('');
    counter.textContent = `${Math.min(chars.length, NAME_MAX)}/${NAME_MAX}`;
  };
  input.addEventListener('input', count);
  return {
    'edit-name': (b) => {
      ctx.audio.sfx('tap');
      input.value = ctx.store.get().settings.name || '';
      sheet.open(b, '.pf-input');
      count();
      input.select();
    },
  };
}
