// Nombre humano de cada lista de música (portada, épocas y ramas), con los nombres del catálogo.
const LIST_NAMES = {
  menu: 'Portada', gothic: 'Gótico', northern: 'Manierismo y Norte', renaissance: 'Renacimiento', baroque: 'Barroco', rococo: 'Rococó', neoclassic: 'Neoclasicismo',
  romantic: 'Romanticismo', realism: 'Realismo', impressionism: 'Impresionismo', postimpressionism: 'Postimpresionismo',
  modern: 'Simbolismo y vanguardias', 'maestros-espanoles': 'Maestros españoles', 'escuela-rusa': 'Escuela rusa',
  'ukiyo-e': 'Estampa japonesa (ukiyo-e)',
  'pintura-britanica': 'Pintura británica', 'descubre-renacimiento': 'Descubre el Renacimiento',
  'descubre-manierismo-y-norte': 'Descubre el Manierismo y el Norte', 'descubre-barroco': 'Descubre el Barroco',
  'descubre-rococo-neoclasicismo': 'Descubre el Rococó y el Neoclasicismo',
  'descubre-romanticismo': 'Descubre el Romanticismo', 'descubre-realismo': 'Descubre el Realismo',
  'descubre-impresionismo': 'Descubre el Impresionismo', 'descubre-postimpresionismo': 'Descubre el Postimpresionismo',
  'descubre-simbolismo-modernismo': 'Descubre el Simbolismo y las vanguardias',
};

/** «Renacimiento» para `renaissance`; si la lista no se conoce, su propia clave. */
export const listName = (list) => LIST_NAMES[list] ?? list;

/** Orden lógico de las listas al recorrerlas en el modo secreto: portada, épocas y luego ramas. */
const LIST_ORDER = [
  'menu', 'gothic', 'renaissance', 'northern', 'baroque', 'rococo', 'neoclassic', 'romantic', 'realism',
  'impressionism', 'postimpressionism', 'modern',
];

/** Claves con piezas (`has`) en ese orden; las que no estén en él (las ramas) van detrás, en su orden. */
export function listOrder(keys, has = () => true) {
  const known = LIST_ORDER.filter((k) => keys.includes(k) && has(k));
  return [...known, ...keys.filter((k) => !LIST_ORDER.includes(k) && has(k))];
}

/** La lista que sigue a `list` en el orden (da la vuelta al final); la primera si `list` no está. */
export const followingList = (order, list) => order[(order.indexOf(list) + 1) % order.length];
