// Portada y avatar del perfil: se eligen entre todos los cuadros de la colección (los más recientes
// primero, de 30 en 30). Una hoja con dos pestañas (Portada · Avatar); elegir aplica al momento y solo
// cambia lo marcado (la rejilla no se reescribe, así el foco se queda). «Automática» y «Usar mi inicial»
// lo devuelven a lo de por defecto.

import { $, esc, announce } from '../dom.js';
import { icons } from '../icons.js';
import { artFrame } from '../art.js';
import { collectionWorks, coverWork, avatarWork } from '../../engine/profile.js';
import { bindSheet } from './profile-sheet.js';
import { refreshHero } from './profile-hero.js';

const TARGETS = { cover: 'Portada', avatar: 'Avatar' };
const RESET = { cover: 'Automática', avatar: 'Usar mi inicial' };
const PAGE = 30;

export function lookSheetHtml() {
  return `<dialog class="card-dialog sheet-dialog look-dialog" aria-labelledby="look-title">
    <div class="dlg-body look-body">
      <div class="sheet-head"><h2 id="look-title" class="dlg-title">Portada y avatar</h2>
        <button type="button" class="icon-btn" data-action="close-sheet" aria-label="Cerrar">${icons.close(22)}</button></div>
      <div class="segs look-tabs" role="tablist" aria-label="Qué cambiar">
        ${Object.entries(TARGETS).map(([id, name]) => `<button type="button" class="seg" role="tab" id="look-tab-${id}" aria-controls="look-panel" data-action="look-target" data-target="${id}" aria-selected="false"><span class="seg-num">${name}</span></button>`).join('')}
      </div>
      <div id="look-panel" role="tabpanel" class="look-panel">
        <ul class="look-grid"></ul>
        <button type="button" class="btn btn-secondary btn-wide look-more" data-action="look-more" hidden>Ver más</button>
      </div>
      <button type="button" class="btn btn-secondary btn-wide" data-action="look-reset"></button>
    </div>
  </dialog>`;
}

export function wireLook(ctx, el) {
  const dialog = $('.look-dialog', el);
  const sheet = bindSheet(dialog);
  let target = 'cover';
  let works = [];
  let shown = 0;

  // Cuadro que se ve ahora en cada sitio (el elegido o, en la portada, el automático).
  const current = () => {
    const st = ctx.store.get();
    return target === 'cover'
      ? coverWork(st.progress, ctx.index, st.settings.cover)?.id
      : avatarWork(st.progress, ctx.index, st.settings.avatar)?.id;
  };

  const tile = (w) => `<li><button type="button" class="pf-pick" data-action="look-pick" data-id="${w.id}" aria-pressed="false" aria-label="${esc(w.title)}">${artFrame(w, { alt: '', cls: 'pf-tile', label: w.title, thumb: true })}</button></li>`;

  // Solo se cambia lo marcado: pestaña activa, cuadro elegido y texto del botón de volver a lo automático.
  function mark() {
    const now = current();
    dialog.querySelectorAll('.pf-pick').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === now)));
    dialog.querySelectorAll('[data-action="look-target"]').forEach((b) => {
      const on = b.dataset.target === target;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    $('#look-panel', dialog).setAttribute('aria-labelledby', `look-tab-${target}`);
    $('[data-action="look-reset"]', dialog).textContent = RESET[target];
  }

  function more() {
    const next = works.slice(shown, shown + PAGE);
    $('.look-grid', dialog).insertAdjacentHTML('beforeend', next.map(tile).join(''));
    shown += next.length;
    $('.look-more', dialog).hidden = shown >= works.length;
    mark();
  }

  const save = (value) => {
    ctx.store.update((st) => ({ ...st, settings: { ...st.settings, [target]: value } }));
    refreshHero(ctx, el);
    mark();
    announce(`${TARGETS[target]} cambiado`);
  };

  return {
    'open-look': (b) => {
      ctx.audio.sfx('tap');
      target = 'cover';
      works = collectionWorks(ctx.store.get().progress, ctx.index);
      shown = 0;
      $('.look-grid', dialog).innerHTML = '';
      more();
      sheet.open(b, '#look-tab-cover');
    },
    'look-target': (b) => { ctx.audio.sfx('tap'); target = b.dataset.target; mark(); },
    'look-more': () => { ctx.audio.sfx('tap'); more(); },
    'look-pick': (b) => { ctx.audio.sfx('tap'); save(b.dataset.id); },
    'look-reset': () => { ctx.audio.sfx('tap'); save(''); },
  };
}
