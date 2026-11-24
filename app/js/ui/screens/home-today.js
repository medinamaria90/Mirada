// Franja «Hoy» de la portada: fija bajo la cabecera, con tres botones redondos (Reto, Lupa, Repaso) y
// su estado. Con lo de hoy hecho se pliega a una línea que se puede tocar para desplegarla. La lupa
// pendiente se pregunta en un cuadro de diálogo; resuelta, abre el cuadro en el visor.

import { esc, $ } from '../dom.js';
import { icons } from '../icons.js';
import { detailCard, answerDetailCard, DETAIL_NAME } from './home-detail.js';
import { planDetail } from '../../engine/goals.js';
import { dueKeys } from '../../engine/srs.js';
import { isPathMastered } from '../../engine/progress.js';
import { isoWeek } from '../../engine/dates.js';
import { review5Works, REVIEW5_MIN, REVIEW5_NAME } from '../../engine/review.js';

const ICON = 22;
const TICK = 12;
const CHEVRON = 18;

// Plegada solo cuando todo lo de hoy está hecho; el usuario puede desplegarla hasta que cambie de pantalla.
let unfolded = false;

// Botones de hoy. `counts`: cuenta para plegar la franja (el repaso es opcional y no deja marca de «hecho»).
function items(ctx) {
  const { index } = ctx;
  const p = ctx.store.get().progress;
  const day = ctx.dailyDay();
  const daily = p.daily[day];
  const list = [{
    id: 'daily', action: 'daily', icon: icons.calendar(ICON), label: 'Reto', counts: true, done: Boolean(daily),
    score: daily ? `${daily.score}/${daily.total}` : '',
    aria: daily ? `Reto diario, hecho: ${daily.score} de ${daily.total}` : 'Reto diario, pendiente',
  }];
  const plan = planDetail(p, index, day);
  if (plan) {
    const done = p.detail?.[day];
    const work = done ? index.artwork(done.artworkId) || index.artwork(plan.artworkId) : null;
    list.push({
      id: 'lupa', action: done ? '' : 'lupa', zoom: work ? work.id : '', icon: icons.loupe(ICON), label: 'Lupa', counts: true, done: Boolean(done), score: '',
      aria: done ? `${DETAIL_NAME}, hecha: ver ${work.title}` : `${DETAIL_NAME}, pendiente`,
    });
  }
  // Con el camino dominado, también el reto de la semana (antes tenía su propia tarjeta).
  if (isPathMastered(p, index)) {
    const week = p.weekly?.[isoWeek(day).key];
    list.push({
      id: 'weekly', action: 'weekly', icon: icons.target(ICON), label: 'Semanal', counts: true, done: Boolean(week),
      score: week ? `${week.score}/${week.total}` : '',
      aria: week ? `Reto semanal, hecho: ${week.score} de ${week.total}` : 'Reto semanal, pendiente',
    });
  }
  // Repaso de 5 (fallados, vencidos y antiguos de pintores dominados); sin él, el rápido si hay vencidos.
  const review5 = review5Works(p, index, ctx.today()).length >= REVIEW5_MIN;
  if (review5 || dueKeys(p.srs, ctx.today()).length > 0) {
    list.push({ id: 'repaso', action: review5 ? 'review5' : 'quick', icon: icons.repeat(ICON), label: 'Repaso', counts: false, done: false, score: '', aria: review5 ? REVIEW5_NAME : 'Repaso de hoy' });
  }
  return list;
}

function button(it) {
  const attrs = it.zoom ? `data-zoom="${esc(it.zoom)}"` : `data-action="${it.action}"`;
  return `<button type="button" class="today-btn${it.done ? ' is-done' : ''}" ${attrs} aria-label="${esc(it.aria)}">
      <span class="today-circle">${it.icon}${it.done ? `<span class="today-tick">${icons.check(TICK)}</span>` : ''}</span>
      <span class="today-label">${it.label}</span>${it.score ? `<span class="today-score">${esc(it.score)}</span>` : ''}
    </button>`;
}

export function todayStrip(ctx) {
  const list = items(ctx);
  const allDone = list.filter((it) => it.counts).every((it) => it.done);
  if (!allDone) unfolded = false;
  const folded = allDone && !unfolded;
  const fold = allDone
    ? `<button type="button" class="today-fold" data-action="today-toggle" aria-expanded="${!folded}">${icons.check(CHEVRON)}<span>Hoy, hecho</span><span class="today-chevron" aria-hidden="true">${icons.next(CHEVRON)}</span></button>`
    : '';
  return `<section class="today-strip" aria-label="Hoy">${fold}<div class="today-buttons"${folded ? ' hidden' : ''}>${list.map(button).join('')}</div></section>`;
}

export function todayDialog() {
  return '<dialog class="card-dialog lupa-dialog" aria-labelledby="detail-h"></dialog>';
}

export function todayActions(ctx, el) {
  const dialog = $('.lupa-dialog', el);
  const refresh = () => { $('.today-strip', el).outerHTML = todayStrip(ctx); };
  dialog.addEventListener('click', (ev) => { if (ev.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => $('.today-strip .today-btn[data-action="lupa"], .today-strip [data-zoom]', el)?.focus({ preventScroll: true }));
  return {
    'today-toggle': () => {
      ctx.audio.sfx('tap');
      unfolded = !unfolded;
      refresh();
      $('.today-fold', el).focus({ preventScroll: true });
    },
    lupa: () => {
      ctx.audio.sfx('tap');
      dialog.innerHTML = `${detailCard(ctx)}<button type="button" class="btn btn-secondary btn-wide lupa-close" data-action="lupa-close">Cerrar</button>`;
      dialog.showModal();
    },
    'lupa-close': () => dialog.close(),
    detail: (b) => {
      answerDetailCard(ctx, el, b);
      refresh();
    },
  };
}
