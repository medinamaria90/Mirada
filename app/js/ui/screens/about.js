// «Acerca de Sfumato» (`#acerca`, desde Perfil → Ajustes): qué es, por qué existe y quién lo hace. Página corta y discreta;
// enlaza a «Fuentes y créditos». Solo su LinkedIn como enlace; sin email ni teléfono.

import { focusHeading } from '../dom.js';
import { bottomNav } from '../shell.js';
import { loadCss } from '../lazy-css.js';
import { playEra } from '../audio-bridge.js';
import { backButton } from './artist-page.js';

const AUTHOR = 'María Medina Cañete';
const LINKEDIN = 'https://www.linkedin.com/in/mariamedinacanete';

const SECTIONS = [
  { id: 'ab-what', title: 'Qué es', text: 'Un juego para aprender a mirar pintura clásica. Rondas cortas, cuadros de verdad y, con cada acierto, algo más que contar de quien lo pintó.' },
  { id: 'ab-why', title: 'Por qué existe', text: 'Porque el arte parece cosa de entendidos y no lo es. Con unas pocas pistas, un cuadro deja de ser una pared bonita y empieza a hablarte.' },
  { id: 'ab-who', title: 'Quién lo hace', text: `${AUTHOR}, autora y dueña de Sfumato. <a class="ab-link" href="${LINKEDIN}" target="_blank" rel="noopener noreferrer">LinkedIn</a>` },
];

const sectionHtml = (s) => `<section class="ab-section" aria-labelledby="${s.id}"><h2 id="${s.id}" class="ab-h">${s.title}</h2><p class="ab-text">${s.text}</p></section>`;

// Atrás vuelve a donde estabas; con un enlace directo, al perfil.
function back(ctx) {
  if (ctx.prevRoute()) history.back();
  else ctx.go('perfil', { replace: true });
}

export async function renderAbout(ctx, el) {
  await Promise.all([loadCss('css/ficha.css'), loadCss('css/acerca.css')]);
  el.innerHTML = `<div class="page page-about"><main class="content ab" id="main">
    <header class="aw-head">${backButton()}<div class="aw-titles"><h1 class="aw-title">Acerca de Sfumato</h1></div></header>
    ${SECTIONS.map(sectionHtml).join('')}
    <section class="ab-section" aria-labelledby="ab-free"><h2 id="ab-free" class="ab-h">De todos</h2>
      <p class="ab-text">Todos los cuadros son de dominio público. Mira las <a class="ab-link" href="#fuentes" data-action="sources">fuentes y créditos</a>.</p></section>
  </main>${bottomNav('profile')}</div>`;
  playEra('menu');
  el.querySelector('.ap-back').addEventListener('click', () => { ctx.audio.sfx('tap'); back(ctx); });
  el.querySelector('[data-action="sources"]').addEventListener('click', () => ctx.audio.sfx('tap'));
  focusHeading(el);
}
