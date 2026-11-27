// Hoja de un pintor que aún no conoces (Colección y buscador): quién es en una frase, su época y su sello, y dónde lo
// conocerás. Ninguna obra suya: sus cuadros se descubren jugando. Usa la hoja del mapa (ui/map-sheet.js).

import { esc } from './dom.js';
import { icons } from './icons.js';
import { avatarHtml } from './avatar.js';
import { sealHtml, loadSealCss } from './seal.js';
import { openSheet } from './map-sheet.js';
import { lifeSpan } from '../engine/painters.js';
import { whereToMeet } from '../engine/collection-shelves.js';

export async function openLockedPainter(ctx, artistId, opener) {
  const { index } = ctx;
  const artist = index.artist(artistId);
  if (!artist) return null;
  await Promise.all([ctx.ensureText(), loadSealCss()]);
  const movement = index.movement(artist.movementId);
  const where = whereToMeet(index, artist);
  const meta = [lifeSpan(artist), artist.country].filter(Boolean).join(' · ');
  const lock = where.kind === 'branch' ? `Lo conocerás en la rama ${where.name}.` : 'Lo conocerás en el camino.';
  const go = where.kind === 'branch'
    ? `<a class="btn btn-primary btn-wide ms-ok" href="#rama-${esc(where.id)}">Ver la rama</a>`
    : '<a class="btn btn-primary btn-wide ms-ok" href="#inicio">Ir al camino</a>';
  const body = `<header class="ms-head lp-head"><span class="lp-av">${avatarHtml(artist, null)}</span>
      <div class="lp-titles"><p class="ms-kicker">${esc(movement?.name || '')}</p><h2 class="ms-title" id="ms-title">${esc(artist.name)}</h2>
      <span class="lp-meta">${esc(meta)}</span></div></header>
    ${sealHtml(artist) ? `<div class="lp-seal">${sealHtml(artist)}</div>` : ''}
    ${artist.why ? `<p class="ms-about lp-why">${esc(artist.why.text)}</p>` : ''}
    <p class="ms-lock">${icons.lock(16)}<span>${esc(lock)}</span></p>
    ${go}`;
  return openSheet(ctx, opener, movement?.accent, body);
}
