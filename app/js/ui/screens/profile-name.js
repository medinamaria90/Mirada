// Nombre del perfil: opcional, hasta NAME_MAX caracteres, guardado solo en este navegador
// (settings.name). Se cambia en una hoja con un campo y «Guardar»; vacío, se quita.

import { $, announce } from '../dom.js';
import { NAME_MAX, normalizeName } from '../../state/schema.js';
import { bindSheet } from './profile-sheet.js';
import { heroHtml } from './profile-parts.js';

export function nameSheetHtml() {
  return `<dialog class="card-dialog sheet-dialog name-dialog" aria-labelledby="name-dlg-title">
    <form class="dlg-body name-form" novalidate>
      <h2 id="name-dlg-title" class="dlg-title">Tu nombre</h2>
      <input class="pf-input" name="name" type="text" maxlength="${NAME_MAX}" autocomplete="off" autocapitalize="words" enterkeyhint="done" spellcheck="false" aria-labelledby="name-dlg-title">
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
    // Solo se repinta la portada (el resto de la pantalla no cambia); el foco vuelve al nombre.
    const hero = $('.pf-hero', el);
    hero.outerHTML = heroHtml(ctx);
    $('[data-action="edit-name"]', el).focus({ preventScroll: true });
    announce(name ? `Nombre guardado: ${name}` : 'Nombre quitado');
  });
  return {
    'edit-name': (b) => {
      ctx.audio.sfx('tap');
      input.value = ctx.store.get().settings.name || '';
      sheet.open(b, '.pf-input');
      input.select();
    },
  };
}
