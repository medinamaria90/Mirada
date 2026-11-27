// Tarjeta del rango: «Aficionado · Rango 2 de 8», la escalera de los ocho tramos y, debajo, lo que pide el siguiente con UNA
// sola acción recomendada (engine/rank-goals.js rankFocus): un botón grande con el nivel concreto que más cuenta («Rafael ·
// nivel 2»), o «Jugar» si solo falta XP. Las demás condiciones pendientes van en filas discretas: con un toque abren la
// lista de los niveles que de verdad cuentan (o, el XP, el camino); si ninguno cuenta aún, una línea dice por qué. Lo que
// se juega desde aquí vuelve aquí al acabar (ui/router.js GOAL_SCREENS). La cabecera abre la hoja con los ocho rangos.

import { esc, $ } from '../dom.js';
import { icons } from '../icons.js';
import { medalBadge } from './medals.js';
import { bindSheet } from './profile-sheet.js';
import { rankFor, RANKS } from '../../engine/ranks.js';
import { rankProgress, compactNumber } from '../../engine/profile.js';
import { rankLadder, deepChoices, whyNoChoice, rankFocus, fmtXp } from '../../engine/rank-goals.js';
import { deepRoute } from '../router.js';

const PLAY = 'Jugar';

// Cifra de XP: abreviada desde 10 000 («31,2 mil», sin partirse); la exacta, para lectores de pantalla.
function xpValue(xp) {
  const short = compactNumber(xp);
  return short === String(xp) ? fmtXp(xp) : `<span aria-hidden="true">${short}</span><span class="sr-only">${fmtXp(xp)}</span>`;
}

// La acción recomendada, a lo ancho bajo su condición: el nivel que más cuenta, «Jugar» (solo XP) o, si nada cuenta aún, por qué.
function focusAction(ctx, rank, c, focus) {
  if (focus.choice) {
    const a = ctx.index.artist(focus.choice.artistId);
    return `<button type="button" class="btn btn-primary btn-wide pf-cond-play" data-action="rank-play" data-artist="${esc(a.id)}" data-level="${focus.choice.level}">${icons.play(18)}<span>${esc(`${a.short || a.name} · nivel ${focus.choice.level}`)}</span></button>`;
  }
  if (c.key === 'xp') return `<a class="btn btn-primary btn-wide pf-cond-play" href="#inicio">${PLAY}</a>`;
  return `<span class="pf-cond-why">${esc(whyNoChoice(c.key, rank.next))}</span>`;
}

// Lo que dice cada elección: el nivel y, si ya se jugó, cuánto le falta.
function choiceSub(c) {
  if (c.best > 0 && c.pending > 0) return `Nivel ${c.level} · ${c.pending === 1 ? 'te falta 1 cuadro' : `te faltan ${c.pending} cuadros`}`;
  if (c.best > 0) return `Nivel ${c.level} · ${Math.round(c.best * 100)}\u00a0%`;
  return `Nivel ${c.level}`;
}

function condRow(ctx, rank, c, focus) {
  const value = c.key === 'xp' ? xpValue(c.have) : `${c.have}/${c.need}`;
  // El XP, cumplido o no, como «1.932/1.200 XP» (lo que llevas delante de lo que pide); lo demás, «Un nivel «a fondo» 0/1».
  const text = c.key === 'xp' ? `<span class="pf-cond-val">${value}</span>/${esc(c.label)}` : `${esc(c.label)} <span class="pf-cond-val">${value}</span>`;
  const mark = '<span class="pf-cond-mark" aria-hidden="true"></span>';
  if (c.done) {
    return `<li class="pf-cond is-done"><span class="pf-cond-mark" aria-hidden="true">${icons.check(18)}</span>
      <span class="pf-cond-label"><span class="sr-only">Hecho: </span>${c.key === 'xp' ? text : esc(c.label)}</span></li>`;
  }
  const label = `<span class="pf-cond-label"><span class="sr-only">Falta: </span>${text}</span>`;
  if (focus && c.key === focus.key) return `<li class="pf-cond is-focus">${mark}${label}${focusAction(ctx, rank, c, focus)}</li>`;
  // Discretas: una fila que se toca (con su flecha) o, si nada cuenta aún, la línea de por qué.
  const chev = `<span class="pf-chev" aria-hidden="true">${icons.next(18)}</span>`;
  if (c.key === 'xp') return `<li class="pf-cond is-quiet"><a class="pf-cond-row" href="#inicio">${mark}${label}${chev}</a></li>`;
  if (!deepChoices(ctx.store.get().progress, ctx.index, c.key, rank.next).length) {
    return `<li class="pf-cond is-quiet">${mark}${label}<span class="pf-cond-why">${esc(whyNoChoice(c.key, rank.next))}</span></li>`;
  }
  return `<li class="pf-cond is-quiet"><button type="button" class="pf-cond-row" data-action="rank-choose" data-key="${c.key}" aria-haspopup="dialog">${mark}${label}${chev}</button></li>`;
}

// Escalera: los tramos alcanzados en oro y el siguiente punteado (cuenta lo larga que es la carrera).
function ladder(i) {
  return `<ol class="pf-ladder" aria-hidden="true">${RANKS.map((_, k) => `<li class="${k <= i ? 'is-on' : k === i + 1 ? 'is-next' : ''}"></li>`).join('')}</ol>`;
}

export function rankCardHtml(ctx) {
  const rank = rankFor(ctx.store.get().progress, ctx.index);
  const bar = rankProgress(rank);
  const focus = bar.next ? rankFocus(ctx.store.get().progress, ctx.index, rank.next, bar.conds) : null;
  const pos = `Rango ${rank.index + 1} de ${RANKS.length}`;
  const next = bar.next
    ? `<p class="pf-rank-next">Para ser <strong>${esc(bar.next)}</strong></p>
      <ul class="pf-conds">${bar.conds.map((c) => condRow(ctx, rank, c, focus)).join('')}</ul>`
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
    // La lista de los niveles que, aprobados, cuentan para esa condición (del más cerca al más lejos).
    'rank-choose': (b) => {
      ctx.audio.sfx('tap');
      const rank = rankFor(ctx.store.get().progress, ctx.index);
      const choices = rank.next ? deepChoices(ctx.store.get().progress, ctx.index, b.dataset.key, rank.next) : [];
      if (!choices.length) return;
      $('.pf-choices', chooseDialog).innerHTML = choices.map((c) => {
        const a = ctx.index.artist(c.artistId);
        return `<li><button type="button" class="pf-choice" data-action="rank-pick" data-artist="${esc(c.artistId)}" data-level="${c.level}">
          ${medalBadge(ctx, `artist-${c.artistId}`)}<span class="pf-choice-name">${esc(a.name)}<span class="pf-choice-sub">${esc(choiceSub(c))}</span></span>
          <span class="pf-chev" aria-hidden="true">${icons.next(20)}</span></button></li>`;
      }).join('');
      chooseSheet.open(b, '.pf-choice');
    },
    'rank-play': (b) => {
      ctx.audio.sfx('tap');
      ctx.go(deepRoute(b.dataset.artist, Number(b.dataset.level)));
    },
    'rank-pick': (b) => {
      ctx.audio.sfx('tap');
      chooseDialog.close();
      ctx.go(deepRoute(b.dataset.artist, Number(b.dataset.level)));
    },
  };
}
