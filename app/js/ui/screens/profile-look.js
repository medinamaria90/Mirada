// Portada y avatar del perfil: se eligen entre los cuadros de «Mi museo». Una hoja con dos pestañas
// (Portada · Avatar) y la rejilla 3×3; elegir aplica al momento. «Automática» y «Mi inicial» lo devuelven
// a lo de por defecto.

import { $, esc, announce } from '../dom.js';
import { icons } from '../icons.js';
import { artFrame } from '../art.js';
import { museumWorks, coverWork, avatarWork } from '../../engine/profile.js';
import { bindSheet } from './profile-sheet.js';
import { refreshHero } from './profile-hero.js';

const TARGETS = { cover: 'Portada', avatar: 'Avatar' };
const RESET = { cover: 'Automática', avatar: 'Usar mi inicial' };

export function lookSheetHtml() {
  return `<dialog class="card-dialog sheet-dialog look-dialog" aria-labelledby="look-title">
    <div class="dlg-body look-body">
      <div class="sheet-head"><h2 id="look-title" class="dlg-title">Portada y avatar</h2>
        <button type="button" class="icon-btn" data-action="close-sheet" aria-label="Cerrar">${icons.close(22)}</button></div>
      <div class="segs look-tabs" role="group" aria-label="Qué cambiar">
        ${Object.entries(TARGETS).map(([id, name]) => `<button type="button" class="seg" data-action="look-target" data-target="${id}" aria-pressed="false"><span class="seg-num">${name}</span></button>`).join('')}
      </div>
      <ul class="look-grid"></ul>
      <button type="button" class="btn btn-secondary btn-wide" data-action="look-reset"></button>
    </div>
  </dialog>`;
}

export function wireLook(ctx, el) {
  const dialog = $('.look-dialog', el);
  const sheet = bindSheet(dialog);
  let target = 'cover';

  // Cuadro que se ve ahora en cada sitio (el elegido o, en la portada, el automático).
  const current = () => {
    const st = ctx.store.get();
    const p = st.progress;
    return target === 'cover'
      ? coverWork(p, ctx.index, st.settings.cover)?.id
      : avatarWork(p, ctx.index, st.settings.avatar)?.id;
  };

  function paint() {
    const works = museumWorks(ctx.store.get().progress, ctx.index);
    const now = current();
    $('.look-grid', dialog).innerHTML = works.map((w) => `<li><button type="button" class="pf-pick" data-action="look-pick" data-id="${w.id}" aria-pressed="${w.id === now}" aria-label="${esc(w.title)}">${artFrame(w, { alt: '', cls: 'pf-tile', label: w.title, thumb: true })}</button></li>`).join('');
    dialog.querySelectorAll('[data-action="look-target"]').forEach((b) => {
      const on = b.dataset.target === target;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    $('[data-action="look-reset"]', dialog).textContent = RESET[target];
  }

  const save = (value) => {
    ctx.store.update((st) => ({ ...st, settings: { ...st.settings, [target]: value } }));
    refreshHero(ctx, el);
    paint();
    announce(`${TARGETS[target]} cambiado`);
  };

  return {
    'open-look': (b) => { ctx.audio.sfx('tap'); target = 'cover'; paint(); sheet.open(b, '.seg.is-on'); },
    'look-target': (b) => { ctx.audio.sfx('tap'); target = b.dataset.target; paint(); },
    'look-pick': (b) => { ctx.audio.sfx('tap'); save(b.dataset.id); },
    'look-reset': () => { ctx.audio.sfx('tap'); save(''); },
  };
}
