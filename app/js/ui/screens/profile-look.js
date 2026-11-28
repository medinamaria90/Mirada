// Avatar del perfil: se elige entre todos los cuadros de la colección (los más recientes primero, de 30 en 30).
// Elegir aplica al momento y solo cambia lo marcado (la rejilla no se reescribe, así el foco se queda).
// «Usar mi inicial» lo devuelve a lo de por defecto.

import { $, esc, announce } from '../dom.js';
import { icons } from '../icons.js';
import { tinyFrame } from './profile-art.js';
import { collectionWorks } from '../../engine/profile.js';
import { bindSheet } from './profile-sheet.js';
import { refreshHero } from './profile-hero.js';

const PAGE = 30;

export function lookSheetHtml() {
  return `<dialog class="card-dialog sheet-dialog look-dialog" aria-labelledby="look-title">
    <div class="dlg-body look-body">
      <div class="sheet-head"><h2 id="look-title" class="dlg-title">Tu avatar</h2>
        <button type="button" class="icon-btn" data-action="close-sheet" aria-label="Cerrar">${icons.close(22)}</button></div>
      <div class="look-panel">
        <ul class="look-grid" aria-labelledby="look-title"></ul>
        <button type="button" class="btn btn-secondary btn-wide look-more" data-action="look-more" hidden>Ver más</button>
      </div>
      <button type="button" class="btn btn-secondary btn-wide" data-action="look-reset" aria-pressed="false">Usar mi inicial</button>
    </div>
  </dialog>`;
}

export function wireLook(ctx, el) {
  const dialog = $('.look-dialog', el);
  const sheet = bindSheet(dialog);
  let works = [];
  let shown = 0;

  // Cuadro elegido ahora ('' si va la inicial: entonces no se marca ninguno).
  const current = () => {
    const st = ctx.store.get();
    const id = st.settings.avatar;
    return id && st.progress.collection?.[id] ? id : '';
  };

  const tile = (w) => `<li><button type="button" class="pf-pick" data-action="look-pick" data-id="${w.id}" aria-pressed="false" aria-label="${esc(w.title)}">${tinyFrame(w, { alt: '', cls: 'pf-tile', label: w.title })}</button></li>`;

  // Solo se cambia lo marcado: el cuadro elegido y el botón de volver a la inicial.
  function mark() {
    const now = current();
    dialog.querySelectorAll('.pf-pick').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === now)));
    const reset = $('[data-action="look-reset"]', dialog);
    reset.setAttribute('aria-pressed', String(!now));
    reset.classList.toggle('is-on', !now);
  }

  function more() {
    const next = works.slice(shown, shown + PAGE);
    $('.look-grid', dialog).insertAdjacentHTML('beforeend', next.map(tile).join(''));
    shown += next.length;
    $('.look-more', dialog).hidden = shown >= works.length;
    mark();
  }

  const save = (value) => {
    ctx.store.update((st) => ({ ...st, settings: { ...st.settings, avatar: value } }));
    refreshHero(ctx, el);
    mark();
    announce('Avatar cambiado');
  };

  return {
    'open-look': (b) => {
      ctx.audio.sfx('tap');
      works = collectionWorks(ctx.store.get().progress, ctx.index);
      shown = 0;
      $('.look-grid', dialog).innerHTML = '';
      more();
      sheet.open(b, '[data-action="close-sheet"]');
    },
    'look-more': () => { ctx.audio.sfx('tap'); more(); },
    'look-pick': (b) => { ctx.audio.sfx('tap'); save(b.dataset.id); },
    'look-reset': () => { ctx.audio.sfx('tap'); save(''); },
  };
}
