// Miniaturas sueltas del perfil: un archivo pequeño por cuadro (img/t/<id>.jpg, unos 10 KB, lo pinta
// tools/make_atlas.py) en vez de hojas enteras del atlas. Nueve cuadros recientes caen en hojas distintas y
// costaban megas; así cuestan cien kilobytes. El visor y la portada grande siguen usando la imagen entera.

import { artFrame } from '../art.js';

export const tinySrc = (work) => `img/t/${work.id}.jpg`;

// Igual que artFrame, pero con la miniatura suelta como imagen (la id sigue siendo la de la obra: el visor abre la entera).
export function tinyFrame(work, opts = {}) {
  return artFrame({ ...work, img: tinySrc(work) }, opts);
}
