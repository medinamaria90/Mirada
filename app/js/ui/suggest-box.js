// Buscador con sugerencias (combobox + listbox): desde la primera letra, hasta 6 sugerencias con miniatura y
// lo que casa en negrita; flechas y Enter para elegir, Esc para cerrar. La búsqueda es engine/suggest.js.

import { esc } from './dom.js';
import { artFrame } from './art.js';
import { suggest, splitByMarks } from '../engine/suggest.js';

const CLOSE_DELAY = 120; // deja pasar el toque en una sugerencia antes de cerrar por perder el foco

export function suggestBoxHtml(label = 'Buscar pintor o cuadro') {
  return `<div class="sg">
    <label class="sg-field"><span class="sr-only">${esc(label)}</span>
      <input class="sg-input" type="search" role="combobox" aria-expanded="false" aria-controls="sg-list" aria-autocomplete="list" aria-haspopup="listbox"
        placeholder="Buscar" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"></label>
    <ul class="sg-list" id="sg-list" role="listbox" aria-label="Sugerencias" hidden></ul>
    <p class="sg-empty" role="status" hidden>No encuentro nada con ese nombre, de momento.</p>
  </div>`;
}

function optionHtml(index, item, i) {
  const work = index.artwork(item.thumbId);
  const parts = splitByMarks(item.label, item.marks).map((p) => (p.hit ? `<strong>${esc(p.text)}</strong>` : esc(p.text))).join('');
  const sub = item.kind === 'artist' ? 'Pintor' : esc(index.artist(index.artwork(item.id)?.artistId)?.name || '');
  return `<li class="sg-option" role="option" id="sg-o-${i}" aria-selected="false" data-kind="${item.kind}" data-id="${esc(item.id)}">
    <span class="sg-thumb">${work ? artFrame(work, { alt: '', cls: 'art-thumb', label: '', thumb: true }) : ''}</span>
    <span class="sg-text"><span class="sg-label">${parts}</span><span class="sg-sub">${sub}</span></span></li>`;
}

// host: el elemento con suggestBoxHtml(). onPick({ kind, id }). pool: () => { artists, works } (se lee al escribir).
// Devuelve una función que lo desmonta.
export function mountSuggestBox(host, { index, pool, onPick }) {
  const input = host.querySelector('.sg-input');
  const list = host.querySelector('.sg-list');
  const empty = host.querySelector('.sg-empty');
  let items = [];
  let active = -1;
  let closeTimer = null;

  function setActive(i) {
    active = items.length ? (i + items.length) % items.length : -1;
    list.querySelectorAll('.sg-option').forEach((o, k) => o.setAttribute('aria-selected', String(k === active)));
    if (active >= 0) input.setAttribute('aria-activedescendant', `sg-o-${active}`);
    else input.removeAttribute('aria-activedescendant');
  }
  function close() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  }
  function refresh() {
    const q = input.value;
    items = q.trim() ? suggest(pool(), q) : [];
    empty.hidden = !q.trim() || items.length > 0;
    if (!items.length) { list.innerHTML = ''; close(); return; }
    list.innerHTML = items.map((it, i) => optionHtml(index, it, i)).join('');
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    setActive(-1);
  }
  function pick(i) {
    const it = items[i];
    if (!it) return;
    close();
    onPick({ kind: it.kind, id: it.id });
  }

  const onInput = () => refresh();
  const onKey = (ev) => {
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      if (!items.length) return;
      ev.preventDefault();
      if (list.hidden) { list.hidden = false; input.setAttribute('aria-expanded', 'true'); }
      setActive(active < 0 ? (ev.key === 'ArrowDown' ? 0 : items.length - 1) : active + (ev.key === 'ArrowDown' ? 1 : -1));
    } else if (ev.key === 'Enter') {
      if (list.hidden || !items.length) return;
      ev.preventDefault();
      pick(active >= 0 ? active : 0);
    } else if (ev.key === 'Escape') {
      if (!list.hidden) { ev.preventDefault(); ev.stopPropagation(); close(); }
    }
  };
  const onDown = (ev) => {
    const o = ev.target.closest('.sg-option');
    if (!o) return;
    ev.preventDefault(); // no pierde el foco el campo antes del toque
    pick([...list.children].indexOf(o));
  };
  const onBlur = () => { closeTimer = setTimeout(close, CLOSE_DELAY); };
  const onFocus = () => { clearTimeout(closeTimer); if (items.length) { list.hidden = false; input.setAttribute('aria-expanded', 'true'); } };

  input.addEventListener('input', onInput);
  input.addEventListener('keydown', onKey);
  input.addEventListener('blur', onBlur);
  input.addEventListener('focus', onFocus);
  list.addEventListener('pointerdown', onDown);
  return () => {
    clearTimeout(closeTimer);
    input.removeEventListener('input', onInput);
    input.removeEventListener('keydown', onKey);
    input.removeEventListener('blur', onBlur);
    input.removeEventListener('focus', onFocus);
    list.removeEventListener('pointerdown', onDown);
  };
}
