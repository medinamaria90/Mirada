// Enrutado por location.hash con nombres planos (§2).

import { decodeChallenge } from '../engine/challenge.js';

export const ROUTES = {
  home: 'inicio',
  welcome: 'bienvenida',
  cuadro: 'cuadro-del-dia',
  srs: 'repaso',
  collection: 'coleccion',
  painters: 'coleccion-pintores',
  allWorks: 'coleccion-cuadros',
  profile: 'perfil',
  medals: 'logros',
  free: 'ronda-libre',
  weekly: 'reto-semanal',
  credits: 'fuentes',
  about: 'acerca',
};

// Nombre antiguo de la pantalla de logros: los enlaces que ya lo usan siguen valiendo.
const OLD_MEDALS = 'medallas';
// El reto diario ya no existe: su ruta y sus enlaces de reto (token d<AAAAMMDD>) llevan al Cuadro del día.
const OLD_DAILY = 'reto-diario';
// Rutas antiguas del repaso: redirigen a la sesión única (#repaso).
const OLD_REVIEWS = new Set(['repaso5', 'repaso-rapido']);

// Ronda «a fondo» de un pintor: a-fondo-<pintor>-<nivel> (nivel 2 en adelante).
export const deepRoute = (artistId, level) => `a-fondo-${artistId}-${level}`;

// opts.today: día del reto diario (para rechazar retos de fechas futuras).
// Un nombre que no es ninguna ruta devuelve { name: 'invalid' } (se avisa y se va al inicio).
// Ruta de la etapa de un pintor; desde una rama lleva la rama («etapa-giotto--gotico») para seguir en ella.
export const stageRoute = (artistId, branchId = '') => `etapa-${artistId}${branchId ? `--${branchId}` : ''}`;

// Historia compartida (ui/story-link.js): la ve cualquiera, juegue o no, sin tocar su progreso.
export const storyRoute = (artistId, level) => `historia-${artistId}-${level}`;

// Época compartida (tarjetas «Descubre la época», h/epoca-<id>.html): la ve cualquiera, juegue o no, sin tocar su progreso.
export const eraRoute = (movementId) => `epoca-${movementId}`;

// Pantalla de una rama (su propio paisaje y sus pintores): rama-<id>.
export const branchRoute = (branchId) => `rama-${branchId}`;

// A dónde vuelven atrás, «Salir» y la X de una ronda: a la rama si se juega desde ella (la ruta de la etapa la lleva,
// aunque la pantalla anterior sea otra etapa de la misma rama); si no, a la ficha del pintor o su galería.
export function stageReturnTo(branchId, prev) {
  if (branchId) return branchRoute(branchId);
  if (GOAL_SCREENS.has(prev)) return prev;
  return /^(pintor|obras|rama)-[a-z0-9-]+$/.test(prev) ? prev : null;
}

// Pantallas con un objetivo (el rango del Perfil, los logros): si se entra a jugar desde ellas, el resultado vuelve ahí.
export const GOAL_SCREENS = new Set([ROUTES.profile, ROUTES.medals]);
export const isGoalScreen = (route) => GOAL_SCREENS.has(route);

export function parseRoute(hash, opts = {}) {
  const name = String(hash || '').replace(/^#/, '');
  if (name === '' || name === ROUTES.home) return { name: 'home' };
  if (!/^[a-z0-9-]*$/.test(name)) return { name: 'invalid' };
  if (OLD_REVIEWS.has(name)) return { name: 'srs', redirect: ROUTES.srs };
  if (name === ROUTES.welcome) return { name: 'welcome' };
  if (name === ROUTES.cuadro || name === OLD_DAILY) return { name: 'cuadro' };
  if (name === ROUTES.srs) return { name: 'srs' };
  if (name === ROUTES.collection) return { name: 'collection' };
  if (name === ROUTES.painters) return { name: 'collection' };
  if (name === ROUTES.allWorks) return { name: 'works', spec: { kind: 'all' } };
  if (name === ROUTES.profile) return { name: 'profile' };
  if (name === ROUTES.medals || name === OLD_MEDALS) return { name: 'medals' };
  if (name === ROUTES.free) return { name: 'free' };
  if (name === ROUTES.weekly) return { name: 'weekly' };
  if (name === ROUTES.credits) return { name: 'credits' };
  if (name === ROUTES.about) return { name: 'about' };
  let m = /^obras-invitados-([a-z0-9-]+)$/.exec(name);
  if (m) return { name: 'works', spec: { kind: 'guests', movementId: m[1] } };
  m = /^obras-([a-z0-9-]+)$/.exec(name);
  if (m) return { name: 'works', spec: { kind: 'artist', artistId: m[1] } };
  // «Repasar a Vermeer» / «Repasar el Barroco» (ui/screens/recall.js): repasar-<pintor> y repasar-epoca-<movimiento>.
  m = /^repasar-epoca-([a-z0-9-]+)$/.exec(name);
  if (m) return { name: 'recall', recallType: 'movement', id: m[1] };
  m = /^repasar-([a-z0-9-]+)$/.exec(name);
  if (m) return { name: 'recall', recallType: 'artist', id: m[1] };
  m = /^pintor-([a-z0-9-]+)-etapas$/.exec(name);
  if (m) return { name: 'artist', artistId: m[1], focus: 'stages' };
  m = /^pintor-([a-z0-9-]+)$/.exec(name);
  if (m) return { name: 'artist', artistId: m[1], focus: '' };
  m = /^a-fondo-([a-z0-9-]+)-([2-9])$/.exec(name);
  if (m) return { name: 'deep', artistId: m[1], level: Number(m[2]) };
  m = /^etapa-([a-z0-9]+(?:-[a-z0-9]+)*)(?:--([a-z0-9]+(?:-[a-z0-9]+)*))?$/.exec(name);
  if (m) return { name: 'stage', artistId: m[1], branchId: m[2] || '' };
  m = /^historia-([a-z0-9-]+)-([1-9])$/.exec(name);
  if (m) return { name: 'story', artistId: m[1], level: Number(m[2]) };
  m = /^epoca-([a-z0-9-]+)$/.exec(name);
  if (m) return { name: 'era', movementId: m[1] };
  m = /^rama-([a-z0-9-]+)$/.exec(name);
  if (m) return { name: 'branch', branchId: m[1] };
  m = /^repaso-([a-z0-9-]+)$/.exec(name);
  if (m) return { name: 'review', movementId: m[1] };
  m = /^sala-([a-z0-9-]+)$/.exec(name);
  if (m) return { name: 'sala', movementId: m[1] };
  m = /^galeria-([a-z0-9-]+)$/.exec(name);
  if (m) return { name: 'gallery', movementId: m[1] };
  m = /^movimiento-([a-z0-9-]+)$/.exec(name);
  if (m) return { name: 'intro', movementId: m[1] };
  const challenge = decodeChallenge(name, opts);
  if (challenge) return challenge.kind === 'daily' ? { name: 'cuadro' } : { name: 'challenge', challenge };
  return { name: 'invalid' };
}

// replace: true no deja la pantalla actual en el historial (p. ej. al salir de una ronda).
export function go(hashName, { replace = false } = {}) {
  const target = `#${hashName}`;
  if (location.hash === target) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else if (replace) location.replace(target);
  else location.hash = target;
}
