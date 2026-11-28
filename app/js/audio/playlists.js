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
  // Ramas: música propia, variación del tema de la portada con el color de cada sitio. Los clásicos que
  // sonaban antes (Korobéiniki, El lago de los cisnes, Sakura, Narváez) quedan fuera de lista. En las
  // «Descubre…», el secundario es el tema de su época (`baroque/base` = su original). El
  // Gótico no tiene lista propia: usa la de su época (`gothic`, ver branchMusic en screens/branch.js).
  'descubre-renacimiento': { main: 'gallarda', alt: ['renaissance/base'] },
  'descubre-manierismo-y-norte': { main: 'tiento', alt: ['northern/base'] },
  'descubre-barroco': { main: 'aria', alt: ['baroque/base'] },
  'descubre-rococo-neoclasicismo': { main: 'serenata', alt: ['rococo/base'] },
  'descubre-romanticismo': { main: 'barcarola', alt: ['romantic/base'] },
  'descubre-realismo': { main: 'vals', alt: ['realism/base'] },
  'descubre-impresionismo': { main: 'acuarela', alt: ['impressionism/base'] },
  'descubre-postimpresionismo': { main: 'tresillo', alt: ['postimpressionism/base'] },
  'descubre-simbolismo-modernismo': { main: 'cristal', alt: ['modern/base'] },
  'maestros-espanoles': { main: 'seguidilla', alt: ['folia'] },
  'escuela-rusa': { main: 'balalaica', alt: ['neva'] },
  'pintura-britanica': { main: 'campina', alt: ['colina'] },
  'ukiyo-e': { main: 'koto', alt: ['lluvia'] },
  // Test de cultura pictórica (app/test/): «Sala de entrada» en piano de puntillas (María, 27/11).
  test: { main: 'reto', alt: [] },
};

/** Máximo de secundarios por sitio. */
export const MAX_ALT = 2;
