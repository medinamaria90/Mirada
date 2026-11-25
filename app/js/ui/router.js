// Enrutado por location.hash con nombres planos (§2).

import { decodeChallenge } from '../engine/challenge.js';

export const ROUTES = {
  home: 'inicio',
  welcome: 'bienvenida',
  daily: 'reto-diario',
  srs: 'repaso',
  quick: 'repaso-rapido',
  review5: 'repaso5',
  collection: 'coleccion',
  painters: 'coleccion-pintores',
  profile: 'perfil',
  medals: 'medallas',
  free: 'ronda-libre',
  weekly: 'reto-semanal',
};

// opts.today: día del reto diario (para rechazar retos de fechas futuras).
// Un nombre que no es ninguna ruta devuelve { name: 'invalid' } (se avisa y se va al inicio).
export function parseRoute(hash, opts = {}) {
  const name = String(hash || '').replace(/^#/, '');
  if (name === '' || name === ROUTES.home) return { name: 'home' };
  if (!/^[a-z0-9-]*$/.test(name)) return { name: 'invalid' };
  if (name === ROUTES.quick) return { name: 'quick' };
  if (name === ROUTES.review5) return { name: 'review5' };
  if (name === ROUTES.welcome) return { name: 'welcome' };
  if (name === ROUTES.daily) return { name: 'daily' };
  if (name === ROUTES.srs) return { name: 'srs' };
  if (name === ROUTES.collection) return { name: 'collection', tab: 'works' };
  if (name === ROUTES.painters) return { name: 'collection', tab: 'painters' };
  if (name === ROUTES.profile) return { name: 'profile' };
  if (name === ROUTES.medals) return { name: 'medals' };
  if (name === ROUTES.free) return { name: 'free' };
  if (name === ROUTES.weekly) return { name: 'weekly' };
  let m = /^etapa-([a-z0-9]+(?:-[a-z0-9]+)*)(?:--([a-z0-9]+(?:-[a-z0-9]+)*))?$/.exec(name);
  if (m) return { name: 'stage', artistId: m[1], branchId: m[2] || '' };
  m = /^repaso-([a-z0-9-]+)$/.exec(name);
  if (m) return { name: 'review', movementId: m[1] };
  m = /^sala-([a-z0-9-]+)$/.exec(name);
  if (m) return { name: 'sala', movementId: m[1] };
  m = /^galeria-([a-z0-9-]+)$/.exec(name);
  if (m) return { name: 'gallery', movementId: m[1] };
  m = /^movimiento-([a-z0-9-]+)$/.exec(name);
  if (m) return { name: 'intro', movementId: m[1] };
  const challenge = decodeChallenge(name, opts);
  if (challenge) return { name: 'challenge', challenge };
  return { name: 'invalid' };
}

// replace: true no deja la pantalla actual en el historial (p. ej. al salir de una ronda).
export function go(hashName, { replace = false } = {}) {
  const target = `#${hashName}`;
  if (location.hash === target) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else if (replace) location.replace(target);
  else location.hash = target;
}
