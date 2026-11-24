"""Datos curados del catálogo de Mirada (fuente de verdad editable a mano).

Cada obra: num (nº de archivo del dataset), artista, título, año (texto), yearSort,
fama (1-3), rol (learn/new; solo cuenta en pintores con etapa propia), confianza.
Los años y las atribuciones se han revisado contra el conocimiento de historia del arte
y las imágenes se han mirado una a una (hojas de contacto); lo dudoso va en "medium".
"""

MOVEMENTS = [
    ("renacimiento", "Renacimiento", "s. XV–XVI", 1, "renaissance",
     "Equilibrio, perspectiva y belleza ideal en Italia.", "#8a6d3b"),
    ("manierismo-y-norte", "Manierismo y Renacimiento del Norte", "s. XV–XVII", 2, "renaissance",
     "Detalle flamenco, mundos fantásticos y figuras alargadas.", "#52695a"),
    ("barroco", "Barroco", "s. XVII", 3, "baroque",
     "Luz dramática, movimiento y emoción.", "#6b2f3a"),
    ("rococo-neoclasicismo", "Rococó y Neoclasicismo", "s. XVIII", 4, "rococo",
     "De la gracia pastel del rococó al orden severo del neoclasicismo.", "#b0848c"),
    ("romanticismo", "Romanticismo", "finales s. XVIII–mediados s. XIX", 5, "romantic",
     "Emoción, naturaleza desbordada y grandes dramas.", "#3f5d7d"),
    ("realismo", "Realismo", "mediados–finales s. XIX", 6, "realism",
     "La vida real y el paisaje tal como son, sin idealizar.", "#8c5a3c"),
    ("impresionismo", "Impresionismo", "1860–1890", 7, "impressionism",
     "Pintar la luz y el instante, con pincelada suelta.", "#6f9aa8"),
    ("postimpresionismo", "Postimpresionismo", "1880–1905", 8, "postimpressionism",
     "Color y forma al servicio de la emoción personal.", "#b8902e"),
    ("simbolismo-modernismo", "Simbolismo y vanguardias", "1885–1930", 9, "modern",
     "Del simbolismo y el modernismo a la ruptura con la imagen.", "#5b4b7a"),
]

# id: (nombre, corto, movimiento, nació, murió, país, orden, hint, traits, similarTo)
# hint/traits/similarTo se enseñan en los pintores con etapa propia (véase is_guest).
A = {}
def artist(id, name, short, mov, born, died, country, order, hint, traits=(), similar=()):
    A[id] = dict(id=id, name=name, short=short, movementId=mov, born=born, died=died,
                 country=country, order=order, hint=hint, traits=list(traits),
                 similarTo=list(similar))

# --- Renacimiento
artist("leonardo", "Leonardo da Vinci", "Leonardo", "renacimiento", 1452, 1519, "Italia", 1,
       "Fíjate en los bordes difuminados: caras y manos sin contorno, como vistas a través de humo.",
       ["contornos que se deshacen como humo", "paisajes azulados y brumosos al fondo", "caras en penumbra suave"],
       ["rafael"])
artist("rafael", "Rafael", "Rafael", "renacimiento", 1483, 1520, "Italia", 2,
       "Fíjate en la calma nítida: caras ovaladas y serenas, contornos limpios y figuras que forman un triángulo.",
       ["contornos nítidos y limpios", "caras ovaladas y serenas", "figuras colocadas en triángulo"],
       ["leonardo", "tiziano"])
artist("tiziano", "Tiziano", "Tiziano", "renacimiento", 1488, 1576, "Italia", 3,
       "Fíjate en los rojos intensos de las telas junto a pieles cálidas y doradas.",
       ["telas de rojo intenso", "pieles cálidas y doradas", "cielos de atardecer azul y oro"],
       ["veronese", "velazquez"])
artist("veronese", "Veronés", "Veronés", "renacimiento", 1528, 1588, "Italia", 4,
       "Fíjate en los grandes escenarios de columnas y balaustradas llenos de gente vestida con sedas brillantes.",
       ["columnas y balaustradas de mármol", "banquetes con mucha gente", "sedas de colores brillantes"],
       ["tiziano", "rafael"])
artist("botticelli", "Sandro Botticelli", "Botticelli", "renacimiento", 1445, 1510, "Italia", 5,
       "Fíjate en la línea fina y elegante de figuras ligeras y casi flotantes.")
artist("miguel-angel", "Miguel Ángel", "Miguel Ángel", "renacimiento", 1475, 1564, "Italia", 6,
       "Fíjate en los cuerpos musculosos, casi de escultor.")
artist("bellini", "Giovanni Bellini", "Bellini", "renacimiento", 1430, 1516, "Italia", 7,
       "Fíjate en la luz suave y los paisajes serenos de la escuela veneciana.")
artist("correggio", "Correggio", "Correggio", "renacimiento", 1489, 1534, "Italia", 8,
       "Fíjate en la sensualidad suave de las carnes y las figuras en escorzo.")

# --- Manierismo y norte
artist("bosco", "El Bosco", "El Bosco", "manierismo-y-norte", 1450, 1516, "Países Bajos", 1,
       "Fíjate en los seres imposibles, mitad animal y mitad objeto, entre cuerpos desnudos diminutos.",
       ["criaturas imposibles", "cuerpos desnudos diminutos", "escenas de sueño o pesadilla"],
       ["bruegel"])
artist("durero", "Alberto Durero", "Durero", "manierismo-y-norte", 1471, 1528, "Alemania", 2,
       "Fíjate en la precisión de grabador: cada rizo de pelo y cada hoja dibujados uno a uno.",
       ["pelo dibujado rizo a rizo", "detalle minucioso de grabador", "figuras firmes y serias"],
       ["van-eyck", "rafael"])
artist("bruegel", "Brueghel el Viejo", "Brueghel", "manierismo-y-norte", 1525, 1569, "Flandes", 3,
       "Fíjate en los campesinos diminutos vistos desde lo alto, cada uno ocupado en su tarea en un paisaje enorme.",
       ["campesinos diminutos y atareados", "vista desde lo alto", "aldeas y paisajes enormes"],
       ["bosco"])
artist("el-greco", "El Greco", "El Greco", "manierismo-y-norte", 1541, 1614, "España", 4,
       "Fíjate en los cuerpos estirados como llamas, con telas de colores ácidos y luces frías.",
       ["figuras muy alargadas", "colores ácidos: amarillo, verde, rosa", "luces frías y fantasmales"],
       ["tiziano", "veronese"])
artist("van-eyck", "Jan van Eyck", "Van Eyck", "manierismo-y-norte", 1390, 1441, "Países Bajos", 5,
       "Fíjate en el detalle microscópico de telas, espejos y objetos, pintado al óleo.")

# --- Barroco
artist("caravaggio", "Caravaggio", "Caravaggio", "barroco", 1571, 1610, "Italia", 1,
       "Fíjate en el fondo negro y en un foco de luz dura que cae en diagonal sobre gente de la calle.",
       ["fondo negro", "foco de luz dura en diagonal", "gente corriente, muy real"],
       ["rembrandt", "velazquez"])
artist("rubens", "Pedro Pablo Rubens", "Rubens", "barroco", 1577, 1640, "Flandes", 2,
       "Fíjate en los cuerpos carnosos y rosados que se enroscan en espiral, llenos de movimiento.",
       ["cuerpos carnosos y rosados", "composición en espiral", "movimiento y energía"],
       ["tiziano", "delacroix"])
artist("velazquez", "Diego Velázquez", "Velázquez", "barroco", 1599, 1660, "España", 3,
       "Fíjate en los grises plateados y en las pinceladas que de cerca son manchas: el aire parece circular entre las figuras.",
       ["grises y platas", "pinceladas sueltas, como manchas", "aire y espacio entre las figuras"],
       ["murillo", "rembrandt"])
artist("rembrandt", "Rembrandt", "Rembrandt", "barroco", 1606, 1669, "Países Bajos", 4,
       "Fíjate en la luz dorada que brota de la penumbra, como de una vela, entre marrones cálidos y pintura espesa.",
       ["luz dorada en la penumbra", "marrones y ocres cálidos", "pintura espesa y rugosa"],
       ["caravaggio", "velazquez"])
artist("murillo", "Bartolomé Esteban Murillo", "Murillo", "barroco", 1617, 1682, "España", 5,
       "Fíjate en la dulzura: caras amables de niños y Vírgenes, con contornos suaves y vaporosos.",
       ["caras dulces y amables", "contornos suaves y vaporosos", "nubes doradas y angelitos"],
       ["velazquez", "rafael"])
artist("vermeer", "Johannes Vermeer", "Vermeer", "barroco", 1632, 1675, "Países Bajos", 6,
       "Fíjate en la luz de una ventana a la izquierda y en el azul intenso y el amarillo limón de las ropas.",
       ["luz de ventana a la izquierda", "azul intenso y amarillo limón", "puntitos de luz que brillan"],
       ["rembrandt"])
artist("van-dyck", "Antoon van Dyck", "Van Dyck", "barroco", 1599, 1641, "Flandes", 7,
       "Fíjate en la elegancia fluida de telas y retratos aristocráticos.")
artist("poussin", "Nicolas Poussin", "Poussin", "barroco", 1594, 1665, "Francia", 8,
       "Fíjate en los paisajes ordenados como un teatro, con figuras clásicas.")
artist("claudio-de-lorena", "Claudio de Lorena", "Claudio de Lorena", "barroco", 1600, 1682, "Francia", 9,
       "Fíjate en los puertos y paisajes bañados por una luz dorada de atardecer.")

# --- Rococó y neoclasicismo
artist("fragonard", "Jean-Honoré Fragonard", "Fragonard", "rococo-neoclasicismo", 1732, 1806, "Francia", 1,
       "Fíjate en la pincelada rápida y espumosa: sedas que brillan y follajes como nubes en escenas de amor.",
       ["pincelada rápida y espumosa", "sedas rosas y doradas que brillan", "escenas de amor y juego"],
       ["boucher", "renoir"])
artist("david", "Jacques-Louis David", "David", "rococo-neoclasicismo", 1748, 1825, "Francia", 2,
       "Fíjate en las figuras quietas como estatuas, de contorno duro, en fila delante de un fondo sobrio.",
       ["figuras como estatuas", "contornos duros y nítidos", "fondos sobrios y vacíos"],
       ["ingres", "rafael"])
artist("boucher", "François Boucher", "Boucher", "rococo-neoclasicismo", 1703, 1770, "Francia", 3,
       "Fíjate en los tonos rosados y azules y en las diosas de piel de porcelana.")
artist("greuze", "Jean-Baptiste Greuze", "Greuze", "rococo-neoclasicismo", 1725, 1805, "Francia", 4,
       "Fíjate en las escenas familiares moralizantes y sentimentales.")
artist("liotard", "Jean-Étienne Liotard", "Liotard", "rococo-neoclasicismo", 1702, 1789, "Suiza", 5,
       "Fíjate en el acabado liso y casi sin sombras, con contornos muy limpios.")
artist("gainsborough", "Thomas Gainsborough", "Gainsborough", "rococo-neoclasicismo", 1727, 1788, "Reino Unido", 6,
       "Fíjate en los retratos de pincelada vaporosa y peinados altísimos.")
artist("borovikovski", "Vladímir Borovikovski", "Borovikovski", "rococo-neoclasicismo", 1757, 1825, "Rusia", 7,
       "Fíjate en los retratos femeninos suaves y sentimentales sobre fondos de naturaleza.")
artist("ingres", "Jean-Auguste-Dominique Ingres", "Ingres", "rococo-neoclasicismo", 1780, 1867, "Francia", 8,
       "Fíjate en la línea pura y las pieles lisas como porcelana.")

# --- Romanticismo
artist("goya", "Francisco de Goya", "Goya", "romanticismo", 1746, 1828, "España", 1,
       "Fíjate en los fondos oscuros pintados a brochazos y en una figura clara que salta a la vista sin adornos.",
       ["fondos oscuros pintados a brochazos", "una figura clara que salta a la vista", "crudeza sin adornos"],
       ["velazquez", "manet"])
artist("friedrich", "Caspar David Friedrich", "Friedrich", "romanticismo", 1774, 1840, "Alemania", 2,
       "Fíjate en las figuras pequeñas y de espaldas ante paisajes inmensos y silenciosos de niebla, hielo o mar.",
       ["figuras pequeñas y de espaldas", "paisajes inmensos y silenciosos", "niebla, hielo y luz fría"],
       ["aivazovski", "turner"])
artist("delacroix", "Eugène Delacroix", "Delacroix", "romanticismo", 1798, 1863, "Francia", 3,
       "Fíjate en las pinceladas agitadas y en los manchones de rojo vivo que encienden escenas de caos.",
       ["pinceladas agitadas y visibles", "rojos vivos que encienden la escena", "caos, humo y dramatismo"],
       ["rubens", "goya"])
artist("aivazovski", "Iván Aivazovski", "Aivazovski", "romanticismo", 1817, 1900, "Rusia", 4,
       "Fíjate en el mar que brilla desde dentro: olas verdes y transparentes bajo cielos luminosos.",
       ["olas verdes y transparentes", "cielos que brillan como una lámpara", "barcos pequeños en apuros"],
       ["turner", "friedrich"])
artist("turner", "J. M. W. Turner", "Turner", "romanticismo", 1775, 1851, "Reino Unido", 5,
       "Fíjate en la luz amarilla que lo disuelve todo en bruma y vapor.",
       ["luz que disuelve las formas", "brumas doradas", "barcos y trenes entre vapor"],
       ["aivazovski", "monet"])
artist("briullov", "Karl Briulov", "Briulov", "romanticismo", 1799, 1852, "Rusia", 6,
       "Fíjate en el drama romántico con acabado de academia: cuerpos como esculturas y luces de teatro.",
       ["escenas dramáticas", "acabado académico", "luces de teatro"], ["delacroix", "ivanov"])
artist("gericault", "Théodore Géricault", "Géricault", "romanticismo", 1791, 1824, "Francia", 7,
       "Fíjate en los cuerpos en tensión, con luz dramática y tonos terrosos.")
artist("constable", "John Constable", "Constable", "romanticismo", 1776, 1837, "Reino Unido", 8,
       "Fíjate en los cielos con nubes vivas y el campo inglés pintado al natural.")
artist("delaroche", "Paul Delaroche", "Delaroche", "romanticismo", 1797, 1856, "Francia", 9,
       "Fíjate en la escena histórica congelada como en teatro, con acabado pulido.")
artist("ivanov", "Alexander Ivánov", "Ivánov", "romanticismo", 1806, 1858, "Rusia", 10,
       "Fíjate en la gran composición clásica con muchos cuerpos al aire libre.")
artist("tropinin", "Vasili Tropinin", "Tropinin", "romanticismo", 1776, 1857, "Rusia", 11,
       "Fíjate en los retratos de gente corriente con mirada viva y luz cálida.")

# --- Realismo (solo cuatro rusos con etapa en todo el camino: Aivazovski, Shishkin, Repin y
# Levitán; el resto de rusos son invitados aunque tengan ≥3 obras, véase STAGE_RUSSIANS)
artist("shishkin", "Iván Shishkin", "Shishkin", "realismo", 1832, 1898, "Rusia", 1,
       "Fíjate en los pinos y abedules pintados uno a uno, con cada tronco, rama y hierba casi como en una foto.",
       ["árboles pintados uno a uno", "luz clara de mediodía", "cada hierba y raíz del suelo"],
       ["levitan"])
artist("repin", "Iliá Repin", "Repin", "realismo", 1844, 1930, "Rusia", 2,
       "Fíjate en las caras: cada personaje tiene una expresión propia, como un retrato dentro del cuadro.",
       ["cada cara, un retrato distinto", "gestos y miradas que cuentan la historia", "luz natural y pincelada enérgica"],
       ["surikov", "perov"])
artist("levitan", "Isaak Levitán", "Levitán", "realismo", 1860, 1900, "Rusia", 3,
       "Fíjate en la calma melancólica: mucho cielo y agua quieta, pincelada suave y casi nunca gente.",
       ["mucho cielo y agua quieta", "pincelada suave, sin detalle", "paisajes vacíos y melancólicos"],
       ["shishkin", "monet"])
artist("courbet", "Gustave Courbet", "Courbet", "realismo", 1819, 1877, "Francia", 4,
       "Fíjate en la pintura sólida y sin adornos de gente y paisajes reales.")
artist("kuindzhi", "Arjip Kuindzhi", "Kuindzhi", "realismo", 1842, 1910, "Rusia", 5,
       "Fíjate en el brillo casi irreal de la luna o del sol sobre fondos oscuros, como una lámpara.",
       ["luz lunar irreal", "fuertes contrastes", "colores saturados"], ["aivazovski", "shishkin"])
artist("vasnetsov", "Víktor Vasnetsov", "Vasnetsov", "realismo", 1848, 1926, "Rusia", 6,
       "Fíjate en los héroes de cuento ruso: caballeros, princesas y bosques de leyenda.",
       ["cuentos y leyendas rusas", "bogatires y princesas", "paisajes míticos"], ["vrubel", "nesterov"])
artist("polenov", "Vasili Polénov", "Polénov", "realismo", 1844, 1927, "Rusia", 7,
       "Fíjate en la luz limpia de verano sobre patios, jardines y ríos, con sensación de aire libre.",
       ["luz de verano", "jardines y patios", "aire libre"], ["levitan", "shishkin"])
artist("surikov", "Vasili Súrikov", "Súrikov", "realismo", 1848, 1916, "Rusia", 8,
       "Fíjate en las multitudes de la historia rusa, con trajes de colores sobre la nieve o la plaza.",
       ["historia de Rusia", "grandes multitudes", "color intenso sobre nieve"], ["repin"])
artist("perov", "Vasili Perov", "Perov", "realismo", 1834, 1882, "Rusia", 9,
       "Fíjate en la vida cotidiana con crítica social: gente humilde y curas, con gestos muy expresivos.",
       ["crítica social", "humor y ternura", "escenas cotidianas"], ["repin", "makovski"])
artist("makovski", "Konstantín Makovski", "Makovski", "realismo", 1839, 1915, "Rusia", 10,
       "Fíjate en el lujo de trajes y telas y en las escenas históricas o de leyenda de acabado pulido.",
       ["trajes y telas ricos", "banquetes y escenas orientales", "acabado pulido"], ["perov", "repin"])
artist("savrasov", "Alexéi Savrásov", "Savrásov", "realismo", 1830, 1897, "Rusia", 11,
       "Fíjate en el paisaje ruso humilde, con cielos grises y primaveras tempranas.")
artist("kramskoi", "Iván Kramskói", "Kramskói", "realismo", 1837, 1887, "Rusia", 12,
       "Fíjate en los retratos de mirada altiva y mucha presencia.")
artist("fedotov", "Pável Fedótov", "Fedótov", "realismo", 1815, 1852, "Rusia", 13,
       "Fíjate en las escenas de costumbres con humor y mucho detalle.")
artist("vereshchagin", "Vasili Vereshchagin", "Vereshchagin", "realismo", 1842, 1904, "Rusia", 14,
       "Fíjate en las escenas de guerra sin heroísmo, secas y casi fotográficas.")
artist("venetsianov", "Alexéi Venetsiánov", "Venetsiánov", "realismo", 1780, 1847, "Rusia", 15,
       "Fíjate en los campesinos tranquilos en paisajes claros y luminosos.")

# --- Impresionismo
artist("manet", "Édouard Manet", "Manet", "impresionismo", 1832, 1883, "Francia", 1,
       "Fíjate en los negros puros y en las figuras planas, casi sin sombra, que te miran de frente.",
       ["negros intensos", "figuras planas, con poca sombra", "miradas directas al espectador"],
       ["monet", "velazquez"])
artist("monet", "Claude Monet", "Monet", "impresionismo", 1840, 1926, "Francia", 2,
       "Fíjate en las pinceladas cortas y separadas que deshacen las formas en luz, agua y bruma.",
       ["pinceladas cortas y separadas", "agua, niebla y reflejos", "formas que se deshacen en luz"],
       ["renoir", "manet"])
artist("degas", "Edgar Degas", "Degas", "impresionismo", 1834, 1917, "Francia", 3,
       "Fíjate en el encuadre cortado, como una foto robada: figuras vistas de lado o desde arriba y partidas por el borde.",
       ["encuadres cortados, como una foto", "bailarinas y ensayos", "vistas desde arriba o de lado"],
       ["lautrec", "renoir"])
artist("renoir", "Pierre-Auguste Renoir", "Renoir", "impresionismo", 1841, 1919, "Francia", 4,
       "Fíjate en las mejillas rosadas y en la luz que cae a manchas sobre gente feliz.",
       ["mejillas y pieles rosadas", "luz a manchas entre las hojas", "gente feliz en fiestas y paseos"],
       ["monet", "fragonard"])
artist("serov", "Valentín Serov", "Serov", "impresionismo", 1865, 1911, "Rusia", 5,
       "Fíjate en la luz fresca sobre retratos espontáneos y llenos de aire.")

# --- Postimpresionismo
artist("gauguin", "Paul Gauguin", "Gauguin", "postimpresionismo", 1848, 1903, "Francia", 1,
       "Fíjate en las zonas de color plano y sin sombra, con contornos oscuros y colores que no son los reales.",
       ["colores planos, sin sombras", "contornos oscuros marcados", "colores irreales: suelos rojos, cuerpos amarillos"],
       ["van-gogh"])
artist("van-gogh", "Vincent van Gogh", "Van Gogh", "postimpresionismo", 1853, 1890, "Países Bajos", 2,
       "Fíjate en las pinceladas gruesas que giran en remolinos y ondas, como si todo vibrara.",
       ["pinceladas gruesas en remolino", "amarillos y azules muy intensos", "pintura en relieve, a trazos cortos"],
       ["gauguin", "monet"])
artist("lautrec", "Henri de Toulouse-Lautrec", "Toulouse-Lautrec", "postimpresionismo", 1864, 1901, "Francia", 3,
       "Fíjate en el dibujo nervioso de líneas largas y en las caras verdosas por la luz artificial de la noche.",
       ["dibujo de líneas largas y nerviosas", "caras verdosas de luz artificial", "cabarés y cafés de noche"],
       ["degas", "munch"])
artist("cezanne", "Paul Cézanne", "Cézanne", "postimpresionismo", 1839, 1906, "Francia", 4,
       "Fíjate en las formas sólidas, construidas con pinceladas en bloques, como pequeños ladrillos de color.",
       ["pinceladas en bloques", "formas sólidas y geométricas", "ocres, verdes y azules"],
       ["gauguin", "seurat"])
artist("seurat", "Georges Seurat", "Seurat", "postimpresionismo", 1859, 1891, "Francia", 5,
       "Fíjate en los puntitos de color puro que, de lejos, se mezclan en el ojo.",
       ["puntitos de color", "figuras quietas y de perfil", "domingos al aire libre"],
       ["monet", "cezanne"])
artist("rousseau", "Henri Rousseau", "Rousseau", "postimpresionismo", 1844, 1910, "Francia", 6,
       "Fíjate en el estilo ingenuo y plano, con selvas y sueños.")

# --- Simbolismo y vanguardias
artist("munch", "Edvard Munch", "Munch", "simbolismo-modernismo", 1863, 1944, "Noruega", 1,
       "Fíjate en las líneas largas que ondulan alrededor de las figuras y en sus caras pálidas y angustiadas.",
       ["líneas largas que ondulan", "caras pálidas y angustiadas", "pintura raspada y emocional"],
       ["van-gogh", "klimt"])
artist("klimt", "Gustav Klimt", "Klimt", "simbolismo-modernismo", 1862, 1918, "Austria", 2,
       "Fíjate en el oro: ropas y fondos de mosaico dorado con espirales y cuadros, junto a caras muy realistas.",
       ["oro y mosaicos dorados", "ropas llenas de espirales y cuadros", "caras realistas entre adornos planos"],
       ["munch", "vrubel"])
artist("vrubel", "Mijaíl Vrúbel", "Vrúbel", "simbolismo-modernismo", 1856, 1910, "Rusia", 3,
       "Fíjate en la superficie facetada como un mosaico de cristal.")
artist("nesterov", "Mijaíl Nésterov", "Nésterov", "simbolismo-modernismo", 1862, 1942, "Rusia", 4,
       "Fíjate en los paisajes místicos con figuras espirituales.")
artist("matisse", "Henri Matisse", "Matisse", "simbolismo-modernismo", 1869, 1954, "Francia", 5,
       "Fíjate en los colores puros y planos, con formas simplificadas.")
artist("petrov-vodkin", "Kuzmá Petrov-Vodkin", "Petrov-Vodkin", "simbolismo-modernismo", 1878, 1939, "Rusia", 6,
       "Fíjate en los colores primarios rotundos y las formas simplificadas.")
artist("kandinsky", "Vasili Kandinsky", "Kandinsky", "simbolismo-modernismo", 1866, 1944, "Rusia", 7,
       "Fíjate en las formas geométricas y líneas flotantes, sin objetos reconocibles.")
artist("malevich", "Kazimir Malévich", "Malévich", "simbolismo-modernismo", 1879, 1935, "Rusia", 8,
       "Fíjate en las formas geométricas elementales sobre fondo blanco.")

# Únicos pintores rusos con etapa propia (decisión del coordinador, oleada 4): el resto de rusos
# son invitados aunque tengan ≥3 obras (sirven de distractores y de obras no vistas).
STAGE_RUSSIANS = {"aivazovski", "shishkin", "repin", "levitan"}
MIN_STAGE_WORKS = 3


def is_guest(artist_id, n_works):
    """Sin etapa propia: menos de 3 obras, o pintor ruso fuera de STAGE_RUSSIANS."""
    a = A[artist_id]
    return n_works < MIN_STAGE_WORKS or (a["country"] == "Rusia" and artist_id not in STAGE_RUSSIANS)

# num, artista, título, año, yearSort, fame, role, confidence
W = [
 # Leonardo
 (154,"leonardo","La Gioconda","c. 1503–1506",1503,3,"learn","high"),
 (93,"leonardo","La última cena","c. 1495–1498",1495,3,"new","high"),
 (66,"leonardo","La dama del armiño","c. 1489–1491",1489,2,"learn","high"),
 (201,"leonardo","La Virgen de las rocas","1483–1486",1483,2,"new","high"),
 (235,"leonardo","La Virgen, el Niño y santa Ana","c. 1503–1519",1503,2,"new","high"),
 (82,"leonardo","La Anunciación","c. 1472–1476",1472,1,"new","high"),
 (125,"leonardo","La Madonna Litta (atribuida)","c. 1490–1491",1490,1,"new","medium"),
 # Rafael
 (188,"rafael","La Madonna Sixtina","c. 1513",1513,3,"learn","high"),
 (26,"rafael","La Virgen de la silla","c. 1513–1514",1513,2,"learn","high"),
 (89,"rafael","La Madonna del Prato","1505–1506",1505,2,"learn","high"),
 (162,"rafael","El triunfo de Galatea","c. 1512",1512,2,"new","high"),
 (144,"rafael","La dama del unicornio","c. 1505–1506",1505,1,"new","high"),
 (224,"rafael","San Jorge y el dragón","c. 1506",1506,1,"new","high"),
 (169,"rafael","La Virgen de la rosa","c. 1518",1518,1,"new","medium"),
 # Tiziano
 (147,"tiziano","Carlos V a caballo en Mühlberg","1548",1548,2,"learn","high"),
 (84,"tiziano","Amor sagrado y amor profano","c. 1514",1514,2,"learn","high"),
 (77,"tiziano","La Magdalena penitente","c. 1565",1565,1,"learn","high"),
 (56,"tiziano","La bacanal de los andrios","1523–1526",1523,1,"new","high"),
 (79,"tiziano","El denario del César","c. 1516",1516,1,"new","high"),
 (104,"tiziano","Salomé con la cabeza del Bautista","c. 1515",1515,1,"new","high"),
 # Miguel Ángel, Botticelli, Bellini, Veronés, Correggio
 (6,"miguel-angel","La creación de Adán","c. 1511",1511,3,"new","high"),
 (200,"botticelli","El nacimiento de Venus","c. 1485",1485,3,"new","high"),
 (135,"botticelli","La primavera","c. 1477–1482",1477,3,"new","high"),
 (65,"bellini","El festín de los dioses","1514–1529",1514,1,"new","high"),
 (53,"veronese","Las bodas de Caná","1563",1563,2,"learn","high"),
 (2,"veronese","La cena en casa de Leví","1573",1573,1,"learn","high"),
 (12,"veronese","Marte y Venus unidos por el Amor","c. 1575–1580",1575,1,"new","high"),
 (185,"correggio","Dánae","c. 1531",1531,1,"new","high"),
 # Bruegel y norte
 (151,"bruegel","Los cazadores en la nieve","1565",1565,3,"learn","high"),
 (220,"bruegel","La torre de Babel","1563",1563,3,"learn","high"),
 (21,"bruegel","Los proverbios flamencos","1559",1559,2,"new","high"),
 (198,"bruegel","La parábola de los ciegos","1568",1568,2,"new","high"),
 (23,"bruegel","La matanza de los inocentes","c. 1565–1567",1565,1,"new","high"),
 (184,"bosco","El jardín de las delicias","c. 1490–1500",1490,3,"learn","high"),
 (45,"bosco","El Juicio Final (tríptico de Viena)","c. 1500–1510",1500,1,"learn","medium"),
 (157,"durero","Adán y Eva","1507",1507,2,"learn","high"),
 (120,"durero","La fiesta del rosario","1506",1506,1,"new","high"),
 (22,"van-eyck","El matrimonio Arnolfini","1434",1434,3,"new","high"),
 (121,"el-greco","La expulsión de los mercaderes del templo","c. 1600",1600,1,"learn","high"),
 (127,"el-greco","Los apóstoles san Pedro y san Pablo","c. 1592",1592,1,"new","high"),
 (236,"el-greco","Muchacho encendiendo una vela","c. 1570–1572",1570,1,"new","high"),
 # Barroco
 (109,"vermeer","La joven de la perla","c. 1665",1665,3,"learn","high"),
 (115,"vermeer","La lechera","c. 1657–1658",1657,3,"learn","high"),
 (218,"vermeer","La encajera","c. 1669–1670",1669,2,"learn","high"),
 (210,"vermeer","El astrónomo","1668",1668,2,"new","high"),
 (8,"vermeer","La señora y su criada","c. 1666–1667",1666,1,"new","high"),
 (119,"caravaggio","La conversión de san Pablo","1601",1601,2,"learn","high"),
 (91,"caravaggio","El tañedor de laúd","c. 1596",1596,2,"new","high"),
 (206,"caravaggio","Baco enfermo","c. 1593",1593,2,"new","high"),
 (160,"caravaggio","Descanso en la huida a Egipto","c. 1597",1597,1,"new","high"),
 (195,"rembrandt","La ronda de noche","1642",1642,3,"learn","high"),
 (205,"rembrandt","El regreso del hijo pródigo","c. 1668",1668,2,"learn","high"),
 (72,"rembrandt","Autorretrato con Saskia (El hijo pródigo en la taberna)","c. 1635",1635,2,"learn","high"),
 (171,"rembrandt","El festín de Baltasar","c. 1635",1635,2,"new","high"),
 (25,"rembrandt","Dánae","1636",1636,1,"new","high"),
 (34,"rembrandt","Cristo y la mujer adúltera","1644",1644,1,"new","high"),
 (62,"velazquez","Las meninas","1656",1656,3,"learn","high"),
 (175,"velazquez","La rendición de Breda","1634–1635",1634,3,"learn","high"),
 (32,"velazquez","La Venus del espejo","c. 1647–1651",1647,2,"learn","high"),
 (67,"velazquez","El triunfo de Baco (Los borrachos)","1628–1629",1628,2,"new","high"),
 (142,"velazquez","La fragua de Vulcano","1630",1630,2,"new","high"),
 (182,"velazquez","La adoración de los Reyes Magos","1619",1619,1,"new","high"),
 (78,"velazquez","La infanta Margarita Teresa","c. 1653–1654",1653,1,"new","medium"),
 (186,"rubens","El rapto de las hijas de Leucipo","c. 1618",1618,2,"learn","high"),
 (190,"rubens","El rapto de Oritía por Bóreas","c. 1615",1615,1,"new","high"),
 (211,"rubens","La unión de la Tierra y el Agua","c. 1618",1618,1,"new","high"),
 (63,"van-dyck","Sansón y Dalila","c. 1619–1620",1619,1,"new","high"),
 (20,"murillo","La Virgen del rosario","c. 1650–1655",1650,1,"new","high"),
 (37,"murillo","Muchacho con un perro","c. 1650",1650,2,"learn","high"),
 (68,"murillo","La Inmaculada Concepción","c. 1675–1680",1675,1,"learn","medium"),
 (197,"poussin","Paisaje con Polifemo","1649",1649,1,"new","high"),
 (14,"claudio-de-lorena","El embarque de santa Úrsula","1641",1641,1,"new","medium"),
 # Rococó y neoclasicismo
 (16,"fragonard","El columpio","c. 1767",1767,3,"learn","high"),
 (47,"fragonard","El beso robado","c. 1786–1788",1786,2,"new","high"),
 (213,"fragonard","El cerrojo","c. 1777",1777,2,"learn","high"),
 (177,"boucher","Diana saliendo del baño","1742",1742,2,"new","high"),
 (48,"boucher","Venus consolando a Amor","1751",1751,1,"new","high"),
 (85,"greuze","El contrato de boda en el pueblo","1761",1761,1,"new","high"),
 (94,"greuze","El niño mimado","1765",1765,1,"new","high"),
 (71,"liotard","La bella chocolatera","c. 1744",1744,2,"new","high"),
 (102,"gainsborough","Retrato de una dama de azul","c. 1780",1780,1,"new","medium"),
 (30,"borovikovski","Retrato de María Lopujiná","1797",1797,1,"new","high"),
 (156,"david","El juramento de los Horacios","1784",1784,2,"learn","high"),
 (187,"ingres","La gran odalisca","1814",1814,2,"new","high"),
 # Romanticismo
 (116,"aivazovski","La novena ola","1850",1850,2,"learn","high"),
 (217,"aivazovski","Tormenta","1868",1868,1,"learn","high"),
 (232,"aivazovski","Tormenta en el mar","c. 1873",1873,1,"new","medium"),
 (239,"aivazovski","La ola","1889",1889,1,"new","medium"),
 (113,"briullov","El último día de Pompeya","1830–1833",1830,2,"learn","high"),
 (80,"briullov","La amazona","1832",1832,1,"learn","high"),
 (149,"briullov","Mediodía italiano","1827",1827,1,"new","high"),
 (219,"briullov","Autorretrato","1848",1848,1,"new","high"),
 (130,"delacroix","La libertad guiando al pueblo","1830",1830,3,"learn","high"),
 (240,"delacroix","Autorretrato","c. 1837",1837,1,"learn","high"),
 (69,"gericault","La balsa de la Medusa","1818–1819",1818,3,"new","high"),
 (161,"goya","Los fusilamientos del 3 de mayo","1814",1814,3,"learn","high"),
 (166,"constable","La catedral de Salisbury desde los jardines del obispo","1823",1823,2,"new","high"),
 (165,"delaroche","La ejecución de lady Jane Grey","1833",1833,2,"new","high"),
 (145,"ivanov","La aparición de Cristo al pueblo","1837–1857",1837,1,"new","high"),
 (170,"tropinin","La encajera","1823",1823,1,"new","high"),
 (90,"tropinin","Muchacha con una maceta de rosas","1850",1850,1,"new","medium"),
 # Realismo
 (51,"vasnetsov","Los tres bogatires","1881–1898",1881,3,"learn","high"),
 (199,"vasnetsov","Iván Tsarévich y el lobo gris","1889",1889,2,"learn","high"),
 (128,"vasnetsov","El caballero en la encrucijada","1878",1878,2,"learn","high"),
 (13,"vasnetsov","Aliónushka","1881",1881,2,"new","high"),
 (152,"vasnetsov","La alfombra voladora","1880",1880,2,"new","high"),
 (40,"vasnetsov","Las tres princesas del reino subterráneo","1884",1884,1,"new","high"),
 (150,"vasnetsov","El zar Iván el Terrible","1897",1897,1,"new","high"),
 (181,"kuindzhi","Noche de luna en el Dniéper","1880",1880,2,"learn","high"),
 (191,"kuindzhi","Noche ucraniana","1876",1876,1,"learn","high"),
 (17,"kuindzhi","El abedular","1879",1879,1,"new","high"),
 (174,"kuindzhi","En la isla de Valaam","1873",1873,1,"new","high"),
 (70,"shishkin","Mañana en un bosque de pinos","1889",1889,2,"learn","high"),
 (98,"shishkin","Centeno","1878",1878,1,"learn","high"),
 (28,"shishkin","Arroyo en un bosque de abedules","1883",1883,1,"new","high"),
 (49,"shishkin","Bosque de pinos para navíos (Korabelnaya Roscha)","1898",1898,1,"new","high"),
 (222,"shishkin","Pinar","1895",1895,1,"new","medium"),
 (173,"levitan","Otoño dorado","1895",1895,2,"learn","high"),
 (101,"levitan","Sobre la paz eterna","1894",1894,2,"learn","high"),
 (123,"levitan","Marzo","1895",1895,1,"new","high"),
 (230,"levitan","Primavera. Aguas altas","1897",1897,1,"new","high"),
 (9,"polenov","Patio de Moscú","1878",1878,2,"learn","high"),
 (131,"polenov","El jardín de la abuela","1878",1878,1,"learn","high"),
 (106,"polenov","En el parque","c. 1874",1874,1,"new","medium"),
 (111,"polenov","Cruzando el río","c. 1872",1872,1,"new","medium"),
 (100,"surikov","La boyarda Morózova","1884–1887",1884,2,"learn","high"),
 (55,"surikov","La mañana de la ejecución de los strelitzi","1878–1881",1878,2,"learn","high"),
 (172,"surikov","El paso de Suvórov por los Alpes","1899",1899,2,"learn","high"),
 (29,"surikov","La conquista de Siberia por Yermak","1895",1895,1,"new","high"),
 (27,"surikov","La toma de la ciudad de nieve","1891",1891,1,"new","high"),
 (87,"repin","Los sirgadores del Volga","1870–1873",1870,3,"learn","high"),
 (3,"repin","Iván el Terrible y su hijo Iván","1883–1885",1883,2,"learn","high"),
 (176,"repin","No lo esperaban","1884–1888",1884,2,"learn","high"),
 (143,"repin","Los cosacos zaporozhianos escriben una carta al sultán","1880–1891",1880,2,"new","high"),
 (73,"repin","Procesión del icono en la provincia de Kursk","1880–1883",1880,1,"new","high"),
 (11,"repin","La despedida del recluta","1879",1879,1,"new","high"),
 (15,"repin","La velada (Vechornitsy)","1881",1881,1,"new","medium"),
 (180,"repin","Sadkó","1876",1876,1,"new","high"),
 (228,"repin","La libélula","1884",1884,1,"new","high"),
 (38,"perov","Troika","1866",1866,2,"learn","high"),
 (92,"perov","Cazadores de descanso","1871",1871,1,"learn","high"),
 (5,"perov","La llegada de la institutriz a casa del mercader","1866",1866,1,"learn","high"),
 (44,"perov","Procesión campesina de Pascua","1861",1861,1,"new","high"),
 (159,"perov","El pajarero","1870",1870,1,"new","high"),
 (129,"makovski","Banquete de boda boyar","1883",1883,1,"learn","high"),
 (139,"makovski","El traslado de la alfombra sagrada de La Meca a El Cairo","1875",1875,1,"learn","high"),
 (24,"makovski","Niños huyendo de la tormenta","1872",1872,1,"new","high"),
 (133,"makovski","La adivinación","c. 1890",1890,1,"new","medium"),
 (83,"savrasov","Han llegado los grajos","1871",1871,2,"new","high"),
 (141,"kramskoi","La desconocida","1883",1883,2,"new","high"),
 (0,"fedotov","El cortejo del mayor","1848–1852",1848,1,"new","high"),
 (81,"vereshchagin","La apoteosis de la guerra","1871",1871,1,"new","high"),
 (74,"venetsianov","El pastorcito dormido","1823–1826",1823,1,"new","high"),
 (103,"venetsianov","En el campo arado. Primavera","c. 1820",1820,1,"new","high"),
 (193,"venetsianov","En la siega. Verano","c. 1820–1827",1820,1,"new","medium"),
 (137,"courbet","El taller del pintor","1855",1855,2,"new","high"),
 # Impresionismo
 (204,"monet","Impresión, sol naciente","1872",1872,3,"learn","high"),
 (216,"monet","El estanque de nenúfares (puente japonés)","1899",1899,2,"learn","high"),
 (229,"monet","El puente de Waterloo, niebla","1903",1903,2,"new","high"),
 (212,"monet","Almiar en Giverny","1886",1886,1,"new","high"),
 (223,"monet","El almuerzo sobre la hierba (boceto)","1865–1866",1865,1,"new","high"),
 (233,"degas","La clase de danza","1874",1874,2,"new","high"),
 (1,"degas","Bailarinas azules","c. 1897",1897,2,"learn","high"),
 (192,"degas","Bailarinas en la barra","1877",1877,1,"new","high"),
 (226,"degas","Bailarinas antes del ensayo","c. 1880",1880,1,"new","medium"),
 (148,"renoir","El almuerzo de los remeros","1880–1881",1880,3,"learn","high"),
 (140,"renoir","Baile en el Moulin de la Galette","1876",1876,3,"learn","high"),
 (136,"renoir","Los paraguas","c. 1881–1886",1881,2,"learn","high"),
 (36,"renoir","Las grandes bañistas","1887",1887,2,"new","high"),
 (60,"renoir","Muchachas al piano","1892",1892,2,"new","high"),
 (194,"renoir","Dos hermanas (En la terraza)","1881",1881,2,"new","high"),
 (7,"renoir","Amazona en el Bois de Boulogne","1873",1873,1,"new","high"),
 (134,"renoir","El puente de Chatou","1875",1875,1,"new","high"),
 (179,"renoir","Retrato de Jeanne Samary","1877",1877,1,"new","high"),
 (58,"manet","El almuerzo sobre la hierba","1863",1863,3,"learn","high"),
 (196,"manet","Un bar del Folies-Bergère","1882",1882,2,"new","high"),
 (118,"serov","Muchacha con melocotones","1887",1887,1,"new","high"),
 # Postimpresionismo
 (167,"van-gogh","La noche estrellada","1889",1889,3,"learn","high"),
 (117,"van-gogh","Los girasoles","1888",1888,3,"learn","high"),
 (215,"van-gogh","Terraza de café por la noche","1888",1888,2,"learn","high"),
 (164,"van-gogh","Los lirios","1889",1889,2,"new","high"),
 (203,"van-gogh","Autorretrato con la oreja vendada","1889",1889,2,"new","high"),
 (208,"van-gogh","Campo de trigo con cipreses","1889",1889,2,"new","high"),
 (19,"gauguin","¿De dónde venimos? ¿Qué somos? ¿Adónde vamos?","1897–1898",1897,2,"learn","high"),
 (221,"gauguin","Café nocturno en Arlés (Madame Ginoux)","1888",1888,1,"learn","high"),
 (76,"lautrec","Rincón del Moulin de la Galette","1892",1892,1,"learn","high"),
 (110,"rousseau","La gitana dormida","1897",1897,2,"new","high"),
 # Simbolismo y vanguardias
 (97,"klimt","El beso","1907–1908",1907,3,"learn","high"),
 (50,"klimt","Retrato de Adele Bloch-Bauer I","1907",1907,2,"learn","high"),
 (112,"munch","El grito","1893",1893,3,"learn","high"),
 (42,"munch","Madonna","1894",1894,1,"learn","high"),
 (163,"vrubel","El demonio sentado","1890",1890,1,"new","high"),
 (88,"nesterov","La visión del joven Bartolomé","1889–1890",1889,1,"new","high"),
 (41,"matisse","La danza","1910",1910,2,"new","high"),
 (132,"matisse","Retrato de familia","1911",1911,1,"new","high"),
 (96,"petrov-vodkin","El baño del caballo rojo","1912",1912,1,"new","high"),
 (105,"kandinsky","Composición VIII","1923",1923,2,"new","high"),
 (126,"malevich","Cuadrado negro","1915",1915,2,"new","high"),
]

# Autor ruso del dataset -> id (para detectar atribuciones discrepantes)
RU_AUTHOR = {
 "Леонардо да Винчи":"leonardo","Рафаэль":"rafael","Тициан":"tiziano","Микеланджело":"miguel-angel",
 "Сандро Боттичелли":"botticelli","Джованни Беллини":"bellini","Веронезе":"veronese","Корреджо":"correggio",
 "Питер Брейгель":"bruegel","Иероним Босх":"bosco","Альбрехт Дюрер":"durero","Ян ван Эйк":"van-eyck",
 "Эль Греко":"el-greco","Ян Вермеер":"vermeer","Караваджо":"caravaggio","Рембрандт":"rembrandt",
 "Веласкес":"velazquez","Питер Пауль Рубенс":"rubens","Антонис ван Дейк":"van-dyck",
 "Бартоломео Мурильо":"murillo","Никола Пуссен":"poussin","Клод Лоррен":"claudio-de-lorena",
 "Жан Фрагонар":"fragonard","Франсуа Буше":"boucher","Жан Батист Грёз":"greuze",
 "Жан Этьен Лиотар":"liotard","Гейнсборо":"gainsborough","Владимир Боровиковский":"borovikovski",
 "Жак-Луи Давид":"david","Жан Энгр":"ingres","Иван Айвазовский":"aivazovski","Карл Брюллов":"briullov",
 "Эжен Делакруа":"delacroix","Теодор Жерико":"gericault","Франциско Гоя":"goya","Джон Констебл":"constable",
 "Поль Деларош":"delaroche","Александр Иванов":"ivanov","Василий Тропинин":"tropinin",
 "Виктор Васнецов":"vasnetsov","Архип Куинджи":"kuindzhi","Иван Шишкин":"shishkin",
 "Исаак Левитан":"levitan","Василий Поленов":"polenov","Василий Суриков":"surikov","Илья Репин":"repin",
 "Василий Перов":"perov","Константин Маковский":"makovski","Алексей Саврасов":"savrasov",
 "Иван Крамской":"kramskoi","Павел Федотов":"fedotov","Василий Верещагин":"vereshchagin",
 "Алексей Венецианов":"venetsianov","Гюстав Курбе":"courbet","Клод Моне":"monet","Эдгар Дега":"degas",
 "Пьер Огюст Ренуар":"renoir","Эдуард Мане":"manet","Валентин Серов":"serov","Винсент Ван Гог":"van-gogh",
 "Поль Гоген":"gauguin","Анри де Тулуз-Лотрек":"lautrec","Анри Руссо":"rousseau","Густав Климт":"klimt",
 "Эдвард Мунк":"munch","Михаил Врубель":"vrubel","Михаил Нестеров":"nesterov","Анри Матисс":"matisse",
 "Кузьма Петров-Водкин":"petrov-vodkin","Василий Кандинский":"kandinsky","Казимир Малевич":"malevich",
}

# Excluidas: num -> motivo
EXCLUDED = {
 18:"Picasso (m. 1973): artista fallecido después de 1955 y obra de 1937",
 64:"Picasso (m. 1973)", 86:"Picasso (m. 1973)", 225:"Picasso (m. 1973)", 237:"Picasso (m. 1973)",
 31:"Magritte (m. 1967) y obra de 1964", 43:"Chagall (m. 1985)", 153:"Chagall (m. 1985)",
 59:"Dalí (m. 1989) y obra de 1931", 108:"Dalí (m. 1989) y obra de 1944",
 234:"Roerich: obra de 1933 (posterior a 1930)",
 227:"Roerich: obra sin verificar y artista sin otras obras útiles",
 54:"Rublev (icono medieval): sin movimiento claro en el catálogo",
 35:"Waterhouse: una sola obra y sin movimiento claro (prerrafaelismo)",
 95:"Bouguereau: academicismo, sin movimiento propio en el catálogo", 124:"Bouguereau: academicismo, sin movimiento propio en el catálogo",
 99:"Gérôme: academicismo, sin movimiento propio en el catálogo",
 52:"Kaulbach: obra poco conocida y sin utilidad como distractor",
 107:"Lagrenée: pintor poco conocido (obra correcta, solo una)",
 155:"Bacchiacca (atribución dudosa en el dataset): poco conocida y sin verificar",
 146:"Manet «Mujer con jarra»: no pude verificar la obra; fuera por prudencia",
 4:"K. Makovski, retrato de la condesa: no verificada y poco conocida",
 10:"F. Vasíliev: una sola obra poco conocida",
 33:"I. Bogdánov: obra poco conocida", 75:"I. Bogdánov: obra poco conocida",
 39:"Bogdánov-Belski: obra poco conocida", 183:"Bogdánov-Belski: obra poco conocida",
 46:"Lemoj: obra poco conocida", 61:"A. Makovski: obra poco conocida",
 114:"Repin «Paisaje de verano»: título/año sin verificar; Repin ya tiene de sobra",
 122:"Repin «Preparación del examen»: título/año sin verificar; Repin ya tiene de sobra",
 138:"Polénov «Aldea Okúlova Gora»: boceto pobre y de fecha dudosa",
 158:"Atribuida a Murillo en el dataset pero el estilo y el tema (Virgen entregando la casulla a san Ildefonso) no encajan con seguridad: no verificada",
 168:"Boucher «Primavera»: la imagen es una pastoral que no pude identificar con certeza",
 207:"Aivazovski «Lunar»: obra no identificada con seguridad",
 178:"Verevkina: pintora poco conocida", 214:"Verevkina: pintora poco conocida",
 202:"Gallen-Kallela: imagen recortada/confusa y artista sin obras útiles",
 209:"Gallen-Kallela: artista con una sola obra útil, poco reconocible",
 231:"Gallen-Kallela: obra sin verificar",
 57:"Velázquez «Villa Medici»: paisaje atípico que despistaría como obra «nueva»",
 189:"Rembrandt «El rapto de Europa»: paisaje pequeño y atípico que despistaría como obra «nueva»",
 238:"Atribuida a Gallen-Kallela pero parece de Sorolla: sin verificar, fuera",
}

# --- Oleada 4: obras nuevas -------------------------------------------------
# Imágenes preparadas en staging/img/b<N>.jpg (colección lorien-danger/knack-paintings, CC0;
# reproducciones de Wikimedia Commons en dominio público) e incorporadas con
# tools/import_staging.sh. Se miraron una a una; títulos y años revisados a mano.
# id, artista, título, año, yearSort, fame, role, confidence
WB = [
 ("b1","miguel-angel","El Juicio Final","1536–1541",1536,3,"new","high"),
 ("b2","goya","Saturno devorando a su hijo","c. 1820–1823",1820,3,"learn","high"),
 ("b3","goya","La maja desnuda","c. 1797–1800",1797,3,"new","high"),
 ("b4","el-greco","El entierro del conde de Orgaz","1586–1588",1586,3,"learn","high"),
 ("b5","el-greco","Vista de Toledo","c. 1599–1600",1599,3,"new","high"),
 # b6 y b7: trípticos con huecos blancos entre tablas; se publica solo la tabla central.
 ("b6","rubens","La elevación de la cruz (tabla central)","1610–1611",1610,3,"learn","high"),
 ("b7","rubens","El descendimiento de la cruz (tabla central)","1612–1614",1612,3,"new","high"),
 ("b8","van-eyck","La Virgen del canciller Rolin","c. 1435",1435,2,"new","high"),
 ("b9","bosco","La nave de los necios","c. 1500",1500,2,"new","high"),
 ("b10","durero","Autorretrato con abrigo de pieles","1500",1500,3,"learn","high"),
 ("b11","caravaggio","La vocación de san Mateo","1599–1600",1599,3,"learn","high"),
 ("b12","caravaggio","Judit decapitando a Holofernes","c. 1598–1599",1598,2,"learn","high"),
 # Versión de Londres (National Gallery), la de Cristo imberbe: 1601.
 ("b13","caravaggio","La cena de Emaús","1601",1601,2,"new","high"),
 ("b14","vermeer","Vista de Delft","c. 1660–1661",1660,3,"new","high"),
 ("b15","van-gogh","Los comedores de patatas","1885",1885,3,"new","high"),
 ("b16","monet","Mujer con sombrilla (Madame Monet y su hijo)","1875",1875,3,"new","high"),
 ("b17","monet","La urraca","1868–1869",1868,2,"new","high"),
 ("b18","degas","La absenta","1875–1876",1875,3,"learn","high"),
 ("b19","manet","Olimpia","1863",1863,3,"learn","high"),
 # Versión de dos jugadores del Musée d'Orsay (Commons: «Les Joueurs de cartes»); el museo la
 # fecha entre 1890 y 1895. Staging decía c. 1890–1892 (fecha de las versiones con más figuras).
 ("b20","cezanne","Los jugadores de cartas","1890–1895",1890,3,"new","medium"),
 ("b21","cezanne","Las grandes bañistas","1898–1905",1898,3,"new","high"),
 ("b22","gauguin","El Cristo amarillo","1889",1889,3,"learn","high"),
 ("b23","gauguin","La visión después del sermón","1888",1888,2,"new","high"),
 ("b24","seurat","Un domingo en la Grande Jatte","1884–1886",1884,3,"new","high"),
 ("b25","seurat","Bañistas en Asnières","1884",1884,3,"new","high"),
 ("b26","lautrec","En el Moulin Rouge","1892–1895",1892,3,"learn","high"),
 # Musée d'Orsay, «Rousse (La Toilette)», 1889 (así figura en el archivo de Commons).
 ("b27","lautrec","La toilette","1889",1889,2,"new","high"),
 ("b28","delacroix","La muerte de Sardanápalo","1827",1827,3,"new","high"),
 ("b29","david","La muerte de Sócrates","1787",1787,3,"new","high"),
 ("b30","david","La muerte de Marat","1793",1793,3,"learn","high"),
 ("b31","friedrich","El caminante sobre el mar de nubes","c. 1817",1817,3,"learn","high"),
 ("b32","friedrich","El mar de hielo","1823–1824",1823,2,"new","high"),
 ("b33","friedrich","El monje junto al mar","1808–1810",1808,3,"learn","high"),
 ("b34","turner","Lluvia, vapor y velocidad","1844",1844,3,"new","high"),
 ("b35","turner","El Temerario remolcado a su último amarre","1839",1839,3,"new","high"),
 # Primera versión (Oslo, Nasjonalmuseet NG.M.00839), la de superficie raspada: 1885–1886.
 ("b36","munch","La niña enferma","1885–1886",1885,2,"new","high"),
 ("b37","klimt","Judit I","1901",1901,2,"new","high"),
]

# Origen de cada imagen nueva (para CREDITS.md): id -> archivo de la colección de origen.
WB_SOURCE = {
 "b1":"the-last-judgment", "b2":"saturn-devouring-his-son", "b3":"la-maja-desnuda",
 "b4":"the-burial-of-the-count-of-orgaz", "b5":"view-of-toledo", "b6":"the-elevation-of-the-cross",
 "b7":"the-descent-from-the-cross", "b8":"madonna-of-chancellor-rolin", "b9":"ship-of-fools",
 "b10":"self-portrait-with-fur-trimmed-robe", "b11":"the-calling-of-saint-matthew",
 "b12":"judith-beheading-holofernes", "b13":"supper-at-emmaus", "b14":"view-of-delft",
 "b15":"the-potato-eaters", "b16":"woman-with-a-parasol", "b17":"the-magpie", "b18":"l-absinthe",
 "b19":"olympia", "b20":"the-card-players", "b21":"the-large-bathers", "b22":"the-yellow-christ",
 "b23":"vision-after-the-sermon", "b24":"a-sunday-on-la-grande-jatte", "b25":"bathers-at-asnieres",
 "b26":"at-the-moulin-rouge", "b27":"la-toilette", "b28":"death-of-sardanapalus",
 "b29":"the-death-of-socrates", "b30":"the-death-of-marat", "b31":"wanderer-above-the-sea-of-fog",
 "b32":"the-sea-of-ice", "b33":"the-monk-by-the-sea", "b34":"rain-steam-and-speed",
 "b35":"the-fighting-temeraire", "b36":"the-sick-child", "b37":"judith-i",
}

# --- Oleada 3 y 4 -----------------------------------------------------------
# Obras cuya imagen lleva una inscripción o firma legible que delata al autor (revisadas a mano
# en las imágenes). No se usan como imagen de «¿Quién lo pintó?» ni como opción correcta de
# «¿Cuál es de X?»; sí en «Conoce a», salas y colección. (Firmas en cirílico, ilegibles para el
# público de la app, no se marcan.)
SPOILERS = {
    "a66",   # Leonardo, La dama del armiño: «LEONARD D'AWINCI» pintado arriba a la izquierda
    "a77",   # Tiziano, La Magdalena penitente: «TITIANVS P.» a la izquierda
    "a204",  # Monet, Impresión, sol naciente: firma «Claude Monet 72»
    "a212",  # Monet, Almiar en Giverny: firma «Claude Monet 86»
    "a229",  # Monet, El puente de Waterloo: firma «Claude Monet 1903»
    "a217",  # Aivazovski, Tormenta: firma en alfabeto latino «Aivazovsky 1868»
    "a42",   # Munch, Madonna: «E Munch» en rojo abajo a la izquierda
    "a117",  # Van Gogh, Los girasoles: «Vincent» escrito en el jarrón (oleada 4)
    "a221",  # Gauguin, Café nocturno en Arlés: «P. Gauguin 88» abajo a la derecha (oleada 4)
    "b10",   # Durero, Autorretrato: monograma «AD», «1500» e inscripción con su nombre
    "b16",   # Monet, Mujer con sombrilla: firma «Claude Monet 75» abajo a la derecha
    "b18",   # Degas, La absenta: firma «Degas» abajo a la izquierda
    "b22",   # Gauguin, El Cristo amarillo: firma «P Gauguin 89» abajo a la derecha
    "b25",   # Seurat, Bañistas en Asnières: firma «Seurat» abajo a la izquierda
    "b30",   # David, La muerte de Marat: «À MARAT. DAVID» en el cajón
}

# Obras de atribución discutida: el título lo dice («(atribuida)») y no se usan en preguntas de
# autor («¿Quién lo pintó?», «¿Cuál es de X?», ni de relleno); sí en «¿De qué movimiento es?»,
# «Conoce a», salas y colección. Campo `attributed: true` en el catálogo.
ATTRIBUTED = {
    "a125",  # Leonardo, La Madonna Litta: atribución discutida (Boltraffio / taller)
}

# Revisadas y NO marcadas como spoiler (decisión documentada):
#  · b37 (Klimt, Judit I): el marco lleva escrito «JUDITH UND HOLOFERNES», que es el título y no el
#    autor; no delata al pintor.
#  · a12 (Veronese, Marte y Venus unidos por el Amor): la inscripción «…VLVS VERONENSIS F.» del
#    pedestal mide unos pocos píxeles al tamaño de pregunta y no se puede leer.

# Tramos del mapa dentro de un movimiento largo (subtítulo visual; no cambia el contenido).
# Desde la oleada 4 ningún movimiento tiene más de 6 pintores con etapa y el Realismo se queda
# con 3: no hay tramos.
SECTIONS = {}

# Rasgos de cada movimiento (se enseñan en «Conoce el movimiento» y en las salas).
MOVEMENT_TRAITS = {
    "renacimiento": ["equilibrio y perspectiva", "belleza ideal y serena", "colores claros y limpios"],
    "manierismo-y-norte": ["detalle minucioso", "mundos fantásticos y aldeas", "figuras alargadas"],
    "barroco": ["luz y sombra dramáticas", "movimiento y emoción", "gente corriente muy real"],
    "rococo-neoclasicismo": ["rosas y azules pastel", "escenas galantes e íntimas", "después, línea pura y orden"],
    "romanticismo": ["naturaleza inmensa y salvaje", "dramas y pasiones", "color y luz con emoción"],
    "realismo": ["la vida tal como es", "gente corriente y trabajo", "paisajes sin idealizar"],
    "impresionismo": ["pinceladas sueltas y visibles", "luz al aire libre", "escenas del momento"],
    "postimpresionismo": ["color intenso y personal", "formas simplificadas", "una pincelada propia en cada pintor"],
    "simbolismo-modernismo": ["oro y ornamento", "líneas ondulantes", "color puro y formas simples"],
}

# Dónde se ve el rasgo del pintor en cada cuadro concreto (campo opcional `look`, máx. ~90
# caracteres, sin nombrar al autor ni el título). Escrito mirando cada imagen; las obras en las
# que el rasgo no se ve claro no llevan `look`.
LOOK = {
 # Leonardo
 "a82": "Mira las montañas azuladas que se pierden en la bruma al fondo",
 "a201": "Mira cómo las caras salen de la penumbra sin una sola línea de contorno",
 "a66": "Mira la mejilla y el cuello: la luz se funde con la sombra sin borde",
 "a125": "Mira las montañas azules y lejanas que asoman por las dos ventanas",
 "a93": "Mira el paisaje azulado de las ventanas, justo detrás de la figura central",
 "a154": "Mira las comisuras de la boca y los ojos: no hay ni una línea dura",
 "a235": "Mira las montañas azuladas y brumosas detrás de las figuras",
 # Rafael
 "a89": "Mira cómo la madre y los dos niños forman un triángulo perfecto",
 "a144": "Mira el óvalo limpio de la cara y el cielo claro detrás",
 "a224": "Mira los contornos limpios del caballo blanco recortado contra el paisaje claro",
 "a162": "Mira la cara serena de la figura central en medio del torbellino",
 "a188": "Mira el triángulo que forman la figura del centro y los dos santos",
 "a26": "Mira el óvalo perfecto de la cara de la madre y su mirada tranquila",
 "a169": "Mira el grupo en triángulo y la cara ovalada y serena de la madre",
 # Tiziano
 "a84": "Mira el manto rojo intenso de la mujer desnuda",
 "a104": "Mira el vestido rojo que ocupa el centro, junto a la piel dorada",
 "a79": "Mira la túnica roja intensa junto a la piel cálida y dorada",
 "a56": "Mira las pieles cálidas y doradas bajo el cielo azul intenso",
 "a147": "Mira el cielo de atardecer y los rojos de la banda y la gualdrapa",
 "a77": "Mira la piel dorada que brilla contra el cielo azul oscuro",
 # Veronés
 "a53": "Mira las columnas blancas y la balaustrada llena de invitados",
 "a2": "Mira los tres grandes arcos que enmarcan el banquete como un escenario",
 "a12": "Mira cómo brilla el gran manto de seda rosa, con sus pliegues llenos de luz",
 # El Bosco
 "a184": "Mira las fuentes rosas y azules con forma de planta y los cuerpos diminutos",
 "a45": "Mira los monstruos y los cuerpos diminutos entre fuegos y ruinas",
 "b9": "Mira el árbol que sale de la barca y los personajes absurdos de la mesa",
 # Durero
 "b10": "Mira los rizos del pelo y el cuello de piel, pintados pelo a pelo",
 "a157": "Mira los rizos del pelo del hombre, dibujados uno a uno",
 "a120": "Mira la multitud de caras, cada una con su barba y sus arrugas",
 # Brueghel
 "a21": "Mira cuántas escenas pequeñas pasan a la vez por todo el pueblo",
 "a220": "Mira los obreros diminutos trabajando por toda la construcción",
 "a151": "Mira la aldea vista desde arriba y los patinadores diminutos en el hielo",
 "a23": "Mira el pueblo nevado lleno de figuras pequeñas, cada una a lo suyo",
 "a198": "Mira la fila de campesinos que cae en diagonal ante la aldea tranquila",
 # El Greco (a236, obra de juventud, no muestra el rasgo: sin look)
 "a127": "Mira las manos y las caras alargadas, y el manto amarillo ácido",
 "a121": "Mira los cuerpos estirados y retorcidos, con rosas y amarillos ácidos",
 "b4": "Mira las figuras estiradas del cielo entre nubes frías y grises",
 "b5": "Mira el cielo de tormenta, con luces frías y verdosas casi fantasmales",
 # Caravaggio
 "a206": "Mira la luz dura que cae desde la izquierda sobre el hombro",
 "a91": "Mira la luz que entra en diagonal y corta la pared del fondo",
 "a160": "Mira la luz dura sobre la espalda del ángel, recortada contra la sombra",
 "a119": "Mira el foco que ilumina al caído y al caballo sobre un fondo negro",
 "b11": "Mira el rayo de luz en diagonal que entra por la derecha",
 "b12": "Mira el fondo oscuro y la luz dura sobre los brazos y las caras",
 "b13": "Mira la luz que cae desde la izquierda y la sombra en la pared del fondo",
 # Rubens
 "a190": "Mira cómo los dos cuerpos giran en el aire, con la piel rosada y rolliza",
 "a186": "Mira la gran X de cuerpos y caballos que gira en el centro",
 "a211": "Mira la piel rosada y carnosa de la mujer junto al hombre moreno",
 "b6": "Mira la diagonal de cuerpos musculosos que empujan con todas sus fuerzas",
 "b7": "Mira la sábana blanca que baja en diagonal entre cuerpos que se inclinan",
 # Velázquez (a182, obra de juventud en penumbra, sin look)
 "a67": "Mira las caras curtidas y risueñas, resueltas con pocas manchas",
 "a142": "Mira la pared gris y el aire que hay entre las figuras",
 "a175": "Mira el paisaje gris azulado del fondo, como visto a través del aire",
 "a32": "Mira la cara del reflejo: solo unas manchas grises, sin detalle",
 "a78": "Mira el vestido plateado: de cerca son pinceladas sueltas",
 "a62": "Mira la puerta luminosa del fondo y el aire gris de la sala",
 # Rembrandt
 "a72": "Mira el resplandor dorado sobre la mujer, entre marrones oscuros",
 "a171": "Mira el brillo dorado de la capa y la luz que surge en la pared oscura",
 "a25": "Mira cómo la luz dorada baña el cuerpo y la cama en la penumbra",
 "a195": "Mira la figura de amarillo dorado que brilla entre soldados en sombra",
 "a34": "Mira el pequeño grupo iluminado dentro de un templo enorme y oscuro",
 "a205": "Mira la luz cálida sobre las dos figuras abrazadas y los ocres rugosos",
 # Murillo
 "a20": "Mira la cara dulce del niño y los contornos suaves de las caras",
 "a37": "Mira la sonrisa del niño y la luz suave y cálida en su cara",
 "a68": "Mira las nubes doradas y vaporosas llenas de angelitos",
 # Vermeer
 "a115": "Mira la luz de la ventana y el azul y amarillo de la ropa",
 "a109": "Mira el turbante azul y amarillo y el punto de luz en los labios",
 "a8": "Mira la chaqueta amarillo limón junto al mantel azul",
 "a210": "Mira la luz que entra por la ventana de la izquierda sobre el globo",
 "a218": "Mira el amarillo de la ropa y la luz suave que viene de la izquierda",
 "b14": "Mira los puntitos de luz en tejados y barcas junto al agua tranquila",
 # Fragonard
 "a16": "Mira el vestido rosa como espuma y el follaje pintado a toques rápidos",
 "a213": "Mira la cortina roja y las sábanas revueltas, pintadas a toques rápidos",
 "a47": "Mira el brillo de la falda de seda, hecho con pinceladas rápidas",
 # David
 "a156": "Mira los brazos rectos y tensos, alineados como en un relieve de piedra",
 "b29": "Mira las figuras en fila delante de una pared lisa, como estatuas",
 "b30": "Mira el fondo vacío y oscuro y el brazo que cuelga como el de una estatua",
 # Goya
 "a161": "Mira la camisa blanca que estalla en la noche, iluminada por el farol",
 "b2": "Mira el fondo negro hecho a brochazos y la figura que surge de él",
 "b3": "Mira el cuerpo claro sobre el sofá verde y los almohadones, sin ningún adorno",
 # Friedrich
 "b31": "Mira la figura de espaldas ante la niebla que llena todo el valle",
 "b33": "Mira la figura diminuta perdida bajo un cielo enorme y oscuro",
 "b32": "Mira las placas heladas apiladas bajo una luz fría y silenciosa",
 # Delacroix
 "a130": "Mira el rojo de la bandera y el humo que envuelve la escena",
 "a240": "Mira las pinceladas sueltas y nerviosas del fondo y del pelo",
 "b28": "Mira la cama roja en diagonal y el caos de cuerpos alrededor",
 # Aivazovski
 "a116": "Mira la ola verde y translúcida iluminada por el sol de frente",
 "a217": "Mira el verde transparente de las olas al romper",
 "a232": "Mira el agua verdosa y transparente bajo el cielo de tormenta",
 "a239": "Mira la luz que atraviesa las olas y las vuelve verdes y blancas",
 # Shishkin
 "a98": "Mira los pinos altos, cada uno con su silueta, sobre el campo dorado",
 "a28": "Mira los troncos blancos, cada uno con sus manchas y su forma",
 "a70": "Mira la luz entre los troncos y cada rama rota, pintada con detalle",
 "a222": "Mira cada pino con su copa distinta y el camino con charcos",
 "a49": "Mira los troncos rectos uno a uno y las piedras del arroyo",
 # Repin (a180, escena fantástica atípica, sin look)
 "a87": "Mira cómo cada hombre de la fila tiene su propia cara y postura",
 "a11": "Mira las caras del grupo: cada una reacciona a su manera",
 "a143": "Mira las carcajadas: cada hombre se ríe de una forma distinta",
 "a73": "Mira la multitud: cada figura, aunque pequeña, tiene su propio gesto",
 "a15": "Mira las caras alegres alrededor de la que baila, cada una distinta",
 "a3": "Mira los ojos desorbitados del anciano: el horror está en la cara",
 "a176": "Mira las miradas de sorpresa de toda la familia hacia el hombre",
 "a228": "Mira las manchas de luz del vestido de la niña sentada contra el cielo",
 # Levitán
 "a101": "Mira el cielo enorme y el agua inmensa junto a la pequeña iglesia",
 "a173": "Mira el río quieto y los árboles amarillos hechos con toques sueltos",
 "a123": "Mira la nieve y las sombras azules hechas con toques sueltos, sin detalle",
 "a230": "Mira el agua quieta que refleja los árboles finos y desnudos",
 # Manet
 "a58": "Mira a la mujer que te mira de frente y los trajes negros de los hombres",
 "a196": "Mira la camarera de negro que te mira de frente, con la cara plana y clara",
 "b19": "Mira la mirada directa de la mujer y su cuerpo claro, casi sin sombras",
 # Monet
 "a204": "Mira el reflejo naranja del sol, hecho con unas pocas pinceladas cortas",
 "a216": "Mira el agua: manchas sueltas de color que forman flores y reflejos",
 "a229": "Mira cómo la niebla rosa y violeta deshace las formas",
 "a212": "Mira el campo rojo y la luz hechos solo con toques de color separados",
 "a223": "Mira las manchas de sol sobre el mantel, hechas con toques sueltos",
 "b16": "Mira el cielo y la hierba hechos con pinceladas cortas y rápidas",
 "b17": "Mira las sombras azules de la nieve, hechas con toques sueltos",
 # Degas
 "a233": "Mira la bailarina de espaldas en primer plano, cortada por el borde",
 "a1": "Mira las bailarinas vistas muy de cerca y cortadas por el marco",
 "a192": "Mira la vista desde arriba y el suelo vacío que ocupa medio cuadro",
 "a226": "Mira las bailarinas partidas por los bordes, como en una foto improvisada",
 "b18": "Mira las mesas vacías delante y la pareja empujada a un lado",
 # Renoir (a134, paisaje sin figuras, sin look)
 "a148": "Mira las mejillas rosadas y las caras felices alrededor de la mesa",
 "a140": "Mira las manchas de sol que caen entre los árboles sobre la gente",
 "a136": "Mira las caras rosadas y dulces de la niña y la mujer entre tanto gris",
 "a36": "Mira las pieles rosadas y nacaradas de los cuerpos",
 "a60": "Mira las mejillas rosadas y el pelo suave y dorado de la chica",
 "a194": "Mira las mejillas sonrosadas de la niña y la luz entre las hojas",
 "a7": "Mira los toques de luz que salpican el camino y los árboles",
 "a179": "Mira las mejillas rosadas y el fondo rosa que envuelve la cara",
 # Gauguin
 "a221": "Mira la pared roja lisa y el contorno oscuro de la mujer",
 "a19": "Mira los cuerpos amarillos y planos sobre un fondo azul irreal",
 "b22": "Mira los campos amarillos y rojos y el cuerpo amarillo sin sombras",
 "b23": "Mira el suelo rojo y plano, sin sombras, junto a las cofias blancas",
 # Van Gogh
 "a167": "Mira el cielo que gira en remolinos alrededor de las estrellas",
 "a117": "Mira los pétalos hechos con trazos gruesos y nerviosos de amarillo",
 "a215": "Mira las estrellas como flores y los trazos gruesos del suelo",
 "a164": "Mira las hojas hechas con trazos gruesos que ondulan",
 "a203": "Mira los trazos cortos y marcados de la cara y del abrigo",
 "a208": "Mira las nubes y los árboles que se retuercen en remolinos",
 "b15": "Mira los trazos gruesos y oscuros que marcan caras y manos",
 # Toulouse-Lautrec
 "a76": "Mira las líneas largas y nerviosas de los abrigos y la luz fría",
 "b26": "Mira la cara verde de la mujer de la derecha, iluminada desde abajo",
 "b27": "Mira las líneas sueltas y nerviosas que dibujan la espalda y la tela",
 # Munch
 "a112": "Mira cómo el cielo y el agua ondulan en largas líneas alrededor de la figura",
 "a42": "Mira las líneas oscuras que ondulan alrededor del cuerpo",
 "b36": "Mira la cara pálida de perfil y la pintura rayada y raspada",
 # Klimt
 "a97": "Mira la capa dorada llena de rectángulos y la cara realista en medio",
 "a50": "Mira el vestido de oro lleno de espirales y ojos, y la cara realista",
 "b37": "Mira el collar y los adornos de oro que rodean la cara y el cuerpo",
 # Invitados nuevos de la oleada 4
 "b20": "Mira la mesa y las chaquetas construidas con pinceladas en bloques",
 "b21": "Mira los árboles y los cuerpos hechos con pinceladas en bloques",
 "b24": "Mira el césped y el agua: todo está hecho de puntitos de color",
 "b25": "Mira la hierba y el agua hechas de toques diminutos de color",
 "b34": "Mira cómo la luz amarilla disuelve el puente y el tren en bruma",
 "b35": "Mira el cielo dorado que se deshace en bruma alrededor del sol",
}

# Zona del «Detalle del día» (campo opcional `focus`: [x, y] de 0 a 1 sobre la imagen): rostro, mano
# o zona característica, elegida mirando cada imagen con una cuadrícula. Solo en obras con `look`;
# el detalle sale de las obras de fama 3 (las que no tienen `focus` se recortan por el centro).
FOCUS = {
 "a93": (0.5, 0.52),   # Jesús y la ventana del centro
 "a154": (0.5, 0.27),  # el rostro
 "a188": (0.42, 0.18), # la Virgen con el Niño
 "a184": (0.5, 0.33),  # las fuentes y la esfera azul
 "a220": (0.45, 0.3),  # lo alto de la torre
 "a151": (0.7, 0.55),  # los patinadores en el hielo
 "b4": (0.5, 0.62),    # la fila de rostros
 "b5": (0.65, 0.4),    # la ciudad bajo la tormenta
 "b11": (0.5, 0.42),   # la mesa y el rayo de luz
 "b6": (0.45, 0.45),   # el torso en diagonal
 "b7": (0.45, 0.35),   # el cuerpo y la sábana
 "a175": (0.55, 0.5),  # la entrega de la llave
 "a62": (0.45, 0.62),  # la infanta y las meninas
 "a195": (0.6, 0.58),  # el teniente de amarillo dorado
 "a115": (0.45, 0.45), # la jarra y los brazos
 "b14": (0.5, 0.68),   # tejados y agua
 "a109": (0.5, 0.42),  # el rostro y el turbante
 "a16": (0.6, 0.6),    # la joven en el columpio
 "b29": (0.65, 0.5),   # el filósofo en la cama
 "b3": (0.6, 0.35),    # la cabeza sobre los almohadones
 "a161": (0.33, 0.45), # la camisa blanca
 "b2": (0.45, 0.25),   # el rostro
 "b33": (0.37, 0.85),  # el monje diminuto
 "b31": (0.48, 0.5),   # el caminante
 "b28": (0.45, 0.4),   # la cama roja
 "a130": (0.55, 0.3),  # la bandera y la figura que la alza
 "a87": (0.4, 0.5),    # la fila de sirgadores
 "a58": (0.4, 0.55),   # la mujer que mira de frente
 "b19": (0.3, 0.42),   # la mirada y el cuerpo claro
 "a140": (0.45, 0.5),  # caras con manchas de sol
 "a148": (0.45, 0.4),  # caras alrededor de la mesa
 "b15": (0.5, 0.45),   # caras y manos a la luz de la lámpara
 "a167": (0.5, 0.3),   # los remolinos del cielo
 "b26": (0.88, 0.47),  # la cara verde
 "a112": (0.55, 0.6),  # la figura que grita
 "a97": (0.55, 0.25),  # los rostros y la capa dorada
}
