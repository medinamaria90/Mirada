// Qué suena en cada sitio (portada, cada época, cada rama). Archivo de configuración: se cambia aquí
// según lo que vaya diciendo María, sin tocar el motor.
//
//   main  tema principal: suena casi siempre
//   alt   como mucho dos secundarios: salen de noche, tras un rato largo en el mismo sitio y, cada día,
//         uno distinto (ver rotation.js)
//
// Los ids son los de la lista de su época (`base` = la original, o el id de la variante/clásico);
// una pieza de otra lista se escribe con su clave completa (`renaissance/vacas`). Las piezas que no
// están aquí siguen en el catálogo: el modo secreto («Siguiente») las recorre todas para escucharlas.
export const PLAYLISTS = {
  menu: { main: 'base', alt: ['paseo'] }, // «Umbral» fuera: no le gusta a María (26/11)
  gothic: { main: 'base', alt: ['estampida', 'lauda'] }, // provisional: María decide con el modo secreto
  renaissance: { main: 'base', alt: ['greensleeves', 'romanesca'] }, // «Pavana del alba»; «Guárdame las vacas» fuera: suena mal (María, 26/11)
  northern: { main: 'base', alt: ['espejo', 'tema'] }, // provisional: María decide con el modo secreto
  baroque: { main: 'base', alt: ['minueto', 'canon'] },
  rococo: { main: 'base', alt: ['mozart', 'gavota'] },
  neoclassic: { main: 'base', alt: [] },
  romantic: { main: 'base', alt: ['elisa', 'himno'] },
  realism: { main: 'base', alt: ['grieg', 'polca'] },
  impressionism: { main: 'base', alt: ['satie', 'tonos'] },
  postimpressionism: { main: 'base', alt: ['musette', 'rasgueo'] },
  modern: { main: 'base', alt: ['celesta', 'lidio'] },
  'maestros-espanoles': { main: 'renaissance/base', alt: [] }, // provisional hasta tener música española que suene bien
  'escuela-rusa': { main: 'korobeiniki', alt: ['cisnes'] },
  'ukiyo-e': { main: 'sakura', alt: [] },
};

/** Máximo de secundarios por sitio. */
export const MAX_ALT = 2;
