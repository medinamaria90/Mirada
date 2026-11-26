// Registro de opciones del superusuario. Para añadir una: otra entrada con id, texto, cómo se lee
// (`get`) y cómo se aplica (`set`). La sección de Ajustes (su-section.js) las pinta todas.

import { isDjOn, setDj } from './dj-mode.js';

export const SU_OPTIONS = [
  { id: 'dj', label: 'Barra de música', get: isDjOn, set: setDj },
];
