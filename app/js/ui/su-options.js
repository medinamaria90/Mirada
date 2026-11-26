// Registro de opciones del superusuario. Para añadir una: otra entrada con id, texto, cómo se lee
// (`get(ctx)`) y cómo se aplica (`set(ctx, on)`). La sección de Ajustes (su-section.js) las pinta todas.
// `leaves`: la opción cambia de pantalla, así que Ajustes se cierra.

import { isDjOn, setDj } from './dj-mode.js';
import { isTrialOn, setTrial } from './su-trial.js';

export const SU_OPTIONS = [
  { id: 'dj', label: 'Barra de música', get: () => isDjOn(), set: (ctx, on) => setDj(on) },
  { id: 'trial', label: 'Ver todo desbloqueado (modo prueba)', get: (ctx) => isTrialOn(ctx), set: setTrial, leaves: true },
];
