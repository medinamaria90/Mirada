// Nombre humano de cada lista de música (portada, épocas y ramas), con los nombres del catálogo.
const LIST_NAMES = {
  menu: 'Portada', renaissance: 'Renacimiento', baroque: 'Barroco', rococo: 'Rococó', neoclassic: 'Neoclasicismo',
  romantic: 'Romanticismo', realism: 'Realismo', impressionism: 'Impresionismo', postimpressionism: 'Postimpresionismo',
  modern: 'Simbolismo y vanguardias', 'maestros-espanoles': 'Maestros españoles', 'escuela-rusa': 'Escuela rusa',
  'ukiyo-e': 'Estampa japonesa (ukiyo-e)',
};

/** «Renacimiento» para `renaissance`; si la lista no se conoce, su propia clave. */
export const listName = (list) => LIST_NAMES[list] ?? list;
