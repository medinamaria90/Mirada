// Tarjeta del rango: «Aficionado · Rango 2 de 8», la escalera de los ocho tramos y, debajo, una fila por cada
// condición del siguiente (✓ cumplida / ○ pendiente con su avance y un botón que lleva a cumplirla). La cabecera
// abre la hoja con los ocho rangos; «Elegir» abre la de los pintores con un nivel «a fondo» abierto.

import { esc, $ } from '../dom.js';
import { icons } from '../icons.js';
import { medalBadge } from './medals.js';
import { bindSheet } from './profile-sheet.js';
import { rankFor, RANKS } from '../../engine/ranks.js';
import { rankProgress, compactNumber } from '../../engine/profile.js';
import { rankLadder, deepChoices, fmtXp } from '../../engine/rank-goals.js';

const CHOOSE = 'Elegir';
const PLAY = 'Jugar';

// Cifra de XP: abreviada desde 10 000 («31,2 mil», sin partirse); la exacta, para lectores de pantalla.
function xpValue(xp) {
  const short = compactNumber(xp);
  return short === String(xp) ? fmtXp(xp) : `<span aria-hidden="true">${short}</span><span class="sr-only">${fmtXp(xp)}</span>`;
}

// Botón de una condición pendiente: el XP se gana jugando el camino; los «a fondo», eligiendo pintor (si aún
// no hay ninguno con un nivel abierto, se juega el camino para dominar uno).
function goButton(ctx, rank, c) {
  const p = ctx.store.get().progress;
  if (c.key !== 'xp' && deepChoices(p, ctx.index, c.key, rank.next).length) {
    return `<button type="button" class="btn btn-primary pf-cond-go" data-action="rank-choose" data-key="${c.key}" aria-haspopup="dialog" aria-label="${CHOOSE}: ${esc(c.label)}">${CHOOSE}</button>`;
  }
  return `<a class="btn btn-primary pf-cond-go" href="#inicio" aria-label="${PLAY}: ${esc(c.label)}">${PLAY}</a>`;
}

function condRow(ctx, rank, c) {
  const value = c.key === 'xp' ? xpValue(c.have) : `${c.have}/${c.need}`;
  // El XP, cumplido o no, como «1.932/1.200 XP» (lo que llevas delante de lo que pide); lo demás, «Un nivel «a fondo» 0/1».
  const text = c.key === 'xp' ? `<span class="pf-cond-val">${value}</span>/${esc(c.label)}` : `${esc(c.label)} <span class="pf-cond-val">${value}</span>`;
  if (c.done) {
    return `<li class="pf-cond is-done"><span class="pf-cond-mark" aria-hidden="true">${icons.check(18)}</span>
      <span class="pf-cond-label"><span class="sr-only">Hecho: </span>${c.key === 'xp' ? text : esc(c.label)}</span></li>`;
  }
  return `<li class="pf-cond"><span class="pf-cond-mark" aria-hidden="true"></span>
    <span class="pf-cond-label"><span class="sr-only">Falta: </span>${text}</span>${goButton(ctx, rank, c)}</li>`;
}

// Escalera: los tramos alcanzados en oro y el siguiente punteado (cuenta lo larga que es la carrera).
function ladder(i) {
  return `<ol class="pf-ladder" aria-hidden="true">${RANKS.map((_, k) => `<li class="${k <= i ? 'is-on' : k === i + 1 ? 'is-next' : ''}"></li>`).join('')}</ol>`;
}

export function rankCardHtml(ctx) {
  const rank = rankFor(ctx.store.get().progress, ctx.index);
  const bar = rankProgress(rank);
  const pos = `Rango ${rank.index + 1} de ${RANKS.length}`;
  const next = bar.next
    ? `<p class="pf-rank-next">Para ser <strong>${esc(bar.next)}</strong></p>
      <ul class="pf-conds">${bar.conds.map((c) => condRow(ctx, rank, c)).join('')}</ul>`
    : '<p class="pf-rank-next">El rango más alto</p>';
  return `<section class="pf-sec pf-rank-sec" aria-labelledby="pf-rank-h">
    <div class="pf-rank-card">
      <button type="button" class="pf-rank-head" data-action="open-ranks" aria-haspopup="dialog" aria-label="${esc(`${rank.name}, ${pos}. Ver los rangos`)}">
        <span class="pf-rank-gem" aria-hidden="true">${icons.gem(24)}</span>
        <span class="pf-rank-titles"><span class="pf-rank-name" id="pf-rank-h">${esc(rank.name)}</span><span class="pf-rank-pos">${pos}</span></span>
        <span class="pf-chev" aria-hidden="true">${icons.next(20)}</span>
      </button>
      ${ladder(rank.index)}
      ${next}
    </div>
  </section>`;
}

function ranksBody(ctx) {
  const current = rankFor(ctx.store.get().progress, ctx.index).index;
  return rankLadder().map((r) => {
    const state = r.index < current ? 'is-past' : r.index === current ? 'is-current' : '';
    const needs = r.conds.length ? r.conds.map((c) => c.label).join(' · ') : 'Para empezar';
    return `<li class="pf-rank-row ${state}"${r.index === current ? ' aria-current="step"' : ''}>
      <span class="pf-rank-step" aria-hidden="true">${r.index <= current ? icons.check(16) : r.index + 1}</span>
      <span class="pf-rank-row-text"><span class="pf-rank-row-name">${esc(r.name)}${r.index === current ? ' <span class="pf-rank-you">Tu rango</span>' : ''}</span>
      <span class="pf-rank-row-needs">${esc(needs)}</span></span></li>`;
  }).join('');
}

export function rankSheetsHtml() {
  const head = (id, title) => `<div class="sheet-head"><h2 id="${id}" class="dlg-title">${title}</h2>
      <button type="button" class="icon-btn" data-action="close-sheet" aria-label="Cerrar">${icons.close(22)}</button></div>`;
  return `<dialog class="card-dialog sheet-dialog ranks-dialog" aria-labelledby="ranks-title">
    <div class="dlg-body">${head('ranks-title', 'Rangos')}<ol class="pf-rank-list"></ol></div>
  </dialog>
  <dialog class="card-dialog sheet-dialog choose-dialog" aria-labelledby="choose-title">
    <div class="dlg-body">${head('choose-title', 'Elige pintor')}<ul class="pf-choices"></ul></div>
  </dialog>`;
}

const stagesRoute = (artistId) => `pintor-${artistId}-etapas`;

export function wireRank(ctx, el) {
  const ranksDialog = $('.ranks-dialog', el);
  const ranksSheet = bindSheet(ranksDialog);
  const chooseDialog = $('.choose-dialog', el);
  const chooseSheet = bindSheet(chooseDialog);
  return {
    'open-ranks': (b) => {
      ctx.audio.sfx('tap');
      $('.pf-rank-list', ranksDialog).innerHTML = ranksBody(ctx);
      ranksSheet.open(b, '[data-action="close-sheet"]');
    },
    // Con un solo pintor posible se va directo a sus niveles; con varios, se elige en la hoja.
    'rank-choose': (b) => {
      ctx.audio.sfx('tap');
      const rank = rankFor(ctx.store.get().progress, ctx.index);
      const choices = rank.next ? deepChoices(ctx.store.get().progress, ctx.index, b.dataset.key, rank.next) : [];
      if (choices.length <= 1) { ctx.go(choices.length ? stagesRoute(choices[0].artistId) : 'inicio'); return; }
      $('.pf-choices', chooseDialog).innerHTML = choices.map(({ artistId, level }) => {
        const a = ctx.index.artist(artistId);
        return `<li><button type="button" class="pf-choice" data-action="rank-pick" data-artist="${esc(artistId)}">
          ${medalBadge(ctx, `artist-${artistId}`)}<span class="pf-choice-name">${esc(a.name)}<span class="pf-choice-sub">Nivel ${level}</span></span>
          <span class="pf-chev" aria-hidden="true">${icons.next(20)}</span></button></li>`;
      }).join('');
      chooseSheet.open(b, '.pf-choice');
    },
    'rank-pick': (b) => {
      ctx.audio.sfx('tap');
      chooseDialog.close();
      ctx.go(stagesRoute(b.dataset.artist));
    },
  };
}
