// Avatar de un pintor, el mismo en la ficha, la historia y la lista de Pintores: un autorretrato o retrato con buen
// encuadre de sus obras ya vistas (engine/painters.js `avatarWork`) o, si no hay, sus iniciales sobre el color de su
// movimiento. Es la miniatura del atlas (barata) recortada por el punto de interés.

import { esc } from './dom.js';
import { artFrame, tinySrc } from './art.js';

export const initials = (name) => String(name || '').split(/\s+/).filter((w) => /^\p{Lu}/u.test(w)).slice(0, 2).map((w) => w[0]).join('') || '·';

// avatar: { work, x, y } | null. El tamaño lo pone el contenedor. Sin avatar, el monograma lleva de textura, muy desenfocada y
// oscurecida, la obra más famosa ya vista (`texture`): así no es una columna de discos iguales y el contraste del texto no baja
// (la textura solo oscurece: mix-blend-mode multiply).
// defer: las imágenes se piden al acercarse (listas largas; ver ui/lazy-img.js).
export function avatarHtml(artist, avatar, cls = '', { defer = false, texture = null } = {}) {
  const style = avatar ? ` style="--x:${avatar.x}%;--y:${avatar.y}%"` : '';
  const key = defer ? 'data-src' : 'src';
  const inner = avatar
    ? artFrame(avatar.work, { alt: '', cls: 'av-art', label: '', tiny: true, defer })
    : `${texture ? `<img class="av-bg" ${key}="${esc(tinySrc(texture))}" alt="" aria-hidden="true">` : ''}<span class="av-initials" aria-hidden="true">${esc(initials(artist.name))}</span>`;
  return `<span class="av ${cls}${avatar ? '' : ' is-initials'}"${style}>${inner}</span>`;
}
