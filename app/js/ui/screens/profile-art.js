// Miniaturas sueltas del perfil: un archivo pequeño por cuadro (img/t/<id>.jpg, unos 10 KB, lo pinta
// tools/make_atlas.py) en vez de hojas enteras del atlas. Nueve cuadros recientes caen en hojas distintas y
// costaban megas; así cuestan cien kilobytes. El visor y la portada grande siguen usando la imagen entera.

import { artFrame } from '../art.js';
import { gentleSet } from '../../engine/profile.js';

export const tinySrc = (work) => `img/t/${work.id}.jpg`;

// Igual que artFrame, pero con la miniatura suelta como imagen (la id sigue siendo la de la obra: el visor abre la entera).
export function tinyFrame(work, opts = {}) {
  return artFrame({ ...work, img: tinySrc(work) }, opts);
}

// Lista blanca de obras amables (data/gentle.json): se pide una vez, al abrir el perfil por primera vez. Sin
// ella (red caída, archivo ausente) las funciones del motor usan solo la red de seguridad de palabras clave.
let gentle = null;
let gentleLoad = null;

export function loadGentle() {
  if (!gentleLoad) {
    gentleLoad = (typeof fetch === 'function' ? fetch(new URL('../../../data/gentle.json', import.meta.url)) : Promise.reject(new Error('sin fetch')))
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { gentle = gentleSet(data); return gentle; })
      .catch(() => null);
  }
  return gentleLoad;
}

export const gentleWorks = () => gentle;
