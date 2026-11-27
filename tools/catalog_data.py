"""Datos curados del catálogo de Mirada (fuente de verdad editable a mano).

Cada obra: num (nº de archivo del dataset), artista, título, año (texto), yearSort,
fama (1-3), rol (learn/new; solo cuenta en pintores con etapa propia), confianza.
Los años y las atribuciones se han revisado contra el conocimiento de historia del arte
y las imágenes se han mirado una a una (hojas de contacto); lo dudoso va en "medium".
"""

MOVEMENTS = [
    ("renacimiento", "Renacimiento", "s. XV–XVI", 1, "renaissance",
     "Equilibrio, perspectiva y belleza ideal en Italia.", "#8a6d3b"),
    ("manierismo-y-norte", "Manierismo y Renacimiento del Norte", "s. XV–XVII", 2, "northern",
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
artist("bellini", "Giovanni Bellini", "Giovanni Bellini", "renacimiento", 1430, 1516, "Italia", 7,
       "Fíjate en la luz suave y los paisajes serenos de la escuela veneciana.")
artist("correggio", "Correggio", "Correggio", "renacimiento", 1489, 1534, "Italia", 8,
       "Fíjate en la sensualidad suave de las carnes y las figuras en escorzo.")
artist("berruguete", "Pedro Berruguete", "Berruguete", "renacimiento", 1450, 1504, "España", 7,
       "Fíjate en la mezcla: detalle flamenco, arquitecturas con perspectiva italiana y fondos de brocado dorado.",
       ["brocados de oro en relieve", "arquitecturas con perspectiva italiana", "santos de rostro serio y detalle flamenco"],
       ["van-eyck", "botticelli"])

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
       "Fíjate en los grises plateados y en las pinceladas que de cerca son manchas, con aire entre las figuras.",
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
artist("hals", "Frans Hals", "Frans Hals", "barroco", 1582, 1666, "Países Bajos", 5,
       "Fíjate en la pincelada rápida y suelta de los retratos: gente que sonríe o ríe, con encajes hechos a brochazos.",
       ["pincelada suelta y rápida", "caras que sonríen o ríen", "negros y blancos de encajes y cuellos"],
       ["rembrandt", "velazquez"])
artist("ribera", "José de Ribera", "Ribera", "barroco", 1591, 1652, "España", 6,
       "Fíjate en la piel: arrugas, vello y pies sucios a pincel espeso, con luz dura sobre fondo oscuro.",
       ["pieles arrugadas, muy reales", "luz dura sobre fondo oscuro", "pintura espesa, casi en relieve"],
       ["caravaggio", "zurbaran"])
artist("artemisia", "Artemisia Gentileschi", "Artemisia", "barroco", 1593, 1656, "Italia", 7,
       "Fíjate en las heroínas en plena acción, de brazos fuertes, bajo una luz dura y sobre fondo oscuro.",
       ["fondo oscuro y luz dura", "mujeres decididas, en plena acción", "telas amarillas y rojas de pliegues pesados"],
       ["caravaggio", "ribera"])
artist("zurbaran", "Francisco de Zurbarán", "Zurbarán", "barroco", 1598, 1664, "España", 10,
       "Fíjate en los hábitos blancos de pliegues duros, como esculpidos, con una sola luz lateral sobre fondo oscuro.",
       ["blancos de pliegues duros, como de escultura", "fondo oscuro y una sola luz", "objetos y telas de realidad casi táctil"],
       ["ribera", "caravaggio"])
artist("van-dyck", "Anton van Dyck", "Van Dyck", "barroco", 1599, 1641, "Flandes", 7,
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
artist("watteau", "Antoine Watteau", "Watteau", "rococo-neoclasicismo", 1684, 1721, "Francia", 1,
       "Fíjate en las parejas elegantes de sedas tornasoladas en parques brumosos, con un aire melancólico.",
       ["parejas galantes en parques", "sedas que brillan en tonos suaves", "personajes de la comedia italiana"],
       ["fragonard", "boucher"])
artist("melendez", "Luis Meléndez", "Meléndez", "rococo-neoclasicismo", 1716, 1780, "España", 7,
       "Fíjate en la cocina: frutas, pan y cacharros de barro sobre una mesa, con luz lateral en cada textura.",
       ["frutas, pan y cacharros de barro", "mesa de madera y fondo oscuro", "cada textura, casi palpable"],
       ["zurbaran"])
artist("david", "Jacques-Louis David", "Jacques-Louis David", "rococo-neoclasicismo", 1748, 1825, "Francia", 2,
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
       "Fíjate en los cuerpos en tensión y los caballos nerviosos, bajo una luz de tormenta y tonos terrosos.",
       ["caballos briosos en movimiento", "cuerpos al límite: náufragos, heridos, locos", "luz de tormenta y tonos oscuros"],
       ["delacroix", "david"])
artist("constable", "John Constable", "Constable", "romanticismo", 1776, 1837, "Reino Unido", 8,
       "Fíjate en los cielos con nubes vivas y el campo inglés pintado al natural.")
artist("delaroche", "Paul Delaroche", "Delaroche", "romanticismo", 1797, 1856, "Francia", 9,
       "Fíjate en la escena histórica congelada como en teatro, con acabado pulido.")
artist("ivanov", "Alexander Ivánov", "Alexander Ivánov", "romanticismo", 1806, 1858, "Rusia", 10,
       "Fíjate en la gran composición clásica con muchos cuerpos al aire libre.")
artist("tropinin", "Vasili Tropinin", "Tropinin", "romanticismo", 1776, 1857, "Rusia", 11,
       "Fíjate en los retratos de gente corriente con mirada viva y luz cálida.")
artist("madrazo", "Federico de Madrazo", "Federico de Madrazo", "romanticismo", 1815, 1894, "España", 11,
       "Fíjate en el acabado liso y pulido de los retratos: caras suaves, sedas y elegancia aprendida de Ingres.",
       ["acabado liso, sin pincelada visible", "vestidos de seda y encajes", "caras serenas sobre fondos neutros"],
       ["ingres"])

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
artist("millet", "Jean-François Millet", "Millet", "realismo", 1814, 1875, "Francia", 3,
       "Fíjate en los campesinos, pesados y con la cara en sombra, inclinados sobre la tierra bajo cielos de atardecer.",
       ["campesinos inclinados sobre la tierra", "figuras pesadas, con la cara en sombra", "campos llanos y luz de atardecer"],
       ["courbet", "pissarro"])
artist("rosales", "Eduardo Rosales", "Eduardo Rosales", "realismo", 1836, 1873, "España", 14,
       "Fíjate en lo abocetado: zonas a manchas junto a caras y manos acabadas, en tonos sobrios.",
       ["historia de España en escenas íntimas", "pincelada amplia, zonas solo esbozadas", "tonos sobrios: ocres, grises y negros"],
       ["velazquez", "madrazo"])
artist("fortuny", "Mariano Fortuny", "Fortuny", "realismo", 1838, 1874, "España", 16,
       "Fíjate en el formato pequeño y el detalle minucioso: trajes, alfombras y objetos con toques de luz brillantes.",
       ["cuadros pequeños llenos de detalle", "trajes y telas de toques brillantes", "luz de sol intensa, casi cegadora"],
       ["madrazo", "sorolla"])
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
       "Fíjate en el encuadre cortado, como una foto robada: figuras de lado o desde arriba, partidas por el borde.",
       ["encuadres cortados, como una foto", "bailarinas y ensayos", "vistas desde arriba o de lado"],
       ["lautrec", "renoir"])
artist("renoir", "Pierre-Auguste Renoir", "Renoir", "impresionismo", 1841, 1919, "Francia", 4,
       "Fíjate en las mejillas rosadas y en la luz que cae a manchas sobre gente feliz.",
       ["mejillas y pieles rosadas", "luz a manchas entre las hojas", "gente feliz en fiestas y paseos"],
       ["monet", "fragonard"])
artist("serov", "Valentín Serov", "Serov", "impresionismo", 1865, 1911, "Rusia", 5,
       "Fíjate en la luz fresca sobre retratos espontáneos y llenos de aire.")
artist("pissarro", "Camille Pissarro", "Pissarro", "impresionismo", 1830, 1903, "Francia", 1,
       "Fíjate en los pueblos y campos vistos entre árboles, con gente trabajando, a pinceladas pequeñas y rápidas.",
       ["pueblos y caminos entre árboles", "campesinos trabajando", "pinceladas pequeñas que unifican el cuadro"],
       ["sisley", "monet"])
artist("sisley", "Alfred Sisley", "Sisley", "impresionismo", 1839, 1899, "Francia", 5,
       "Fíjate en los cielos enormes de nubes y en el agua de ríos y pueblos del Sena, con pincelada suave y vaporosa.",
       ["cielos grandes y nublados", "ríos, puentes y pueblos del Sena", "atmósfera vaporosa y pincelada suave"],
       ["pissarro", "monet"])
artist("morisot", "Berthe Morisot", "Morisot", "impresionismo", 1841, 1895, "Francia", 8,
       "Fíjate en la pincelada rápida y ligera, casi inacabada, en escenas íntimas de mujeres y niños con mucho blanco.",
       ["pincelada rápida, casi inacabada", "mujeres y niños en interiores y jardines", "blancos y tonos claros"],
       ["renoir", "manet"])
artist("sorolla", "Joaquín Sorolla", "Sorolla", "impresionismo", 1863, 1923, "España", 18,
       "Fíjate en la luz blanca del sol de playa: reflejos en el agua y en la ropa, con pincelada larga y vigorosa.",
       ["sol fuerte de playa y reflejos en el agua", "blancos deslumbrantes de ropa y velas", "pincelada larga, suelta y vigorosa"],
       ["monet", "renoir"])

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
artist("rousseau", "Henri Rousseau", "Henri Rousseau", "postimpresionismo", 1844, 1910, "Francia", 6,
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
       "Fíjate en el color puro, plano y a veces inventado: caras verdes, árboles rojos y contornos simples.",
       ["colores puros e inventados", "formas simples con contorno", "fondos planos y decorativos"],
       ["gauguin", "kandinsky"])
artist("petrov-vodkin", "Kuzmá Petrov-Vodkin", "Petrov-Vodkin", "simbolismo-modernismo", 1878, 1939, "Rusia", 6,
       "Fíjate en los colores primarios rotundos y las formas simplificadas.")
artist("kandinsky", "Vasili Kandinsky", "Kandinsky", "simbolismo-modernismo", 1866, 1944, "Rusia", 7,
       "Fíjate en las formas geométricas y líneas flotantes, sin objetos reconocibles.")
artist("malevich", "Kazimir Malévich", "Malévich", "simbolismo-modernismo", 1879, 1935, "Rusia", 8,
       "Fíjate en las formas geométricas elementales sobre fondo blanco.")
artist("romero-de-torres", "Julio Romero de Torres", "Romero de Torres", "simbolismo-modernismo", 1874, 1930, "España", 13,
       "Fíjate en las mujeres morenas de mirada seria, en penumbra, con Córdoba al fondo y un acabado liso y oscuro.",
       ["mujeres morenas de mirada seria", "fondos con vistas de Córdoba", "penumbra y acabado liso"],
       ["klimt"])
artist("juan-gris", "Juan Gris", "Juan Gris", "simbolismo-modernismo", 1887, 1927, "España", 17,
       "Fíjate en guitarras, botellas y periódicos partidos en planos geométricos de colores limpios.",
       ["objetos partidos en planos geométricos", "guitarras, botellas y periódicos sobre una mesa", "colores planos, limpios y bien delimitados"],
       ["cezanne"])

# Pistas y rasgos de los pintores jugables que no los tenían (gótico, invitados de sala y estampa
# japonesa). Gótico y ukiyo-e, a partir de sus historias y fuentes; el resto, con conocimiento propio
# por decisión de María (uso personal).
artist("cimabue", "Cimabue", "Cimabue", "gotico", 1240, 1302, "Italia", 1,
       "Fíjate en los pliegues trazados con finas líneas de oro y en el trono gigante visto en profundidad.",
       ["pliegues marcados con líneas de oro", "tronos altos con arcos y profetas", "Vírgenes enormes sobre fondo dorado"],
       ["duccio", "giotto"])
artist("duccio", "Duccio di Buoninsegna", "Duccio", "gotico", 1255, 1319, "Italia", 2,
       "Fíjate en el ribete dorado que serpentea por el manto azul y en los ángeles que sostienen el trono.",
       ["manto azul con borde de oro ondulante", "ángeles arrodillados junto al trono", "escenas pequeñas y delicadas"],
       ["cimabue", "simone-martini"])
# Los hermanos Lorenzetti: una sola parada (decisión de María, 27/11). El proceso los trata por separado (cada obra con su
# autor en Wikidata) y tools/catalog_from_pipeline.py los une aquí; cada obra conserva su autor real en `by`.
JOINT = {"lorenzetti": dict(name="Los hermanos Lorenzetti", short="Los Lorenzetti",
                            members=["pietro-lorenzetti", "ambrogio-lorenzetti"])}
artist("lorenzetti", "Los hermanos Lorenzetti", "Los Lorenzetti", "gotico", 1280, 1348, "Italia", 3,
       "Fíjate en la profundidad: marcos que entran en la escena, bóvedas y suelos que se estrechan al fondo.",
       ["marcos que se funden con la casa pintada", "interiores con bóvedas y suelos en perspectiva", "escenas de la vida de cada día"],
       ["giotto", "simone-martini"])
artist("simone-martini", "Simone Martini", "Simone Martini", "gotico", 1284, 1344, "Italia", 4,
       "Fíjate en las líneas curvas que fluyen y en las figuras finas, casi sin peso, sobre el fondo de oro.",
       ["líneas curvas y elegantes", "figuras ligeras sobre oro", "gestos delicados, como de sorpresa"],
       ["duccio"])
artist("giotto", "Giotto", "Giotto", "gotico", 1267, 1337, "Italia", 8,
       "Fíjate en el peso: figuras macizas que pisan el suelo, con pliegues de luz y sombra, no de oro.",
       ["figuras sólidas, como esculpidas", "pliegues modelados con luz y sombra", "gestos de dolor y emoción humana"],
       ["cimabue", "lorenzetti"])
artist("fra-angelico", "Fra Angelico", "Fra Angelico", "renacimiento", 1395, 1455, "Italia", 9,
       "Fíjate en los colores limpios y claros, como de acuarela, y en los pórticos de columnas en perspectiva.",
       ["colores limpios, claros y luminosos", "pórticos y arcos en perspectiva", "ángeles de alas de colores y mucho oro"],
       ["giotto", "botticelli"])
artist("juan-de-juanes", "Juan de Juanes", "Juan de Juanes", "renacimiento", 1507, 1579, "España", 15,
       "Fíjate en los Cristos y Vírgenes de belleza dulce, a lo Rafael, con dibujo nítido y acabado esmaltado.",
       ["belleza serena a lo Rafael", "dibujo nítido y acabado pulido", "Cristos de rostro idealizado"],
       ["rafael", "morales"])
artist("tintoretto", "Tintoretto", "Tintoretto", "renacimiento", 1518, 1594, "Italia", 16,
       "Fíjate en la luz violenta que rompe la penumbra y en las figuras en escorzo que vuelan en diagonal.",
       ["luz como relámpagos en la penumbra", "figuras en escorzo y en diagonal", "escenas con mucha gente en movimiento"],
       [])
artist("cranach", "Lucas Cranach el Viejo", "Cranach", "manierismo-y-norte", 1472, 1553, "Alemania", 7,
       "Fíjate en los desnudos esbeltos y pálidos sobre fondo negro, con sombreros y collares por todo adorno.",
       ["cuerpos pálidos y esbeltos", "fondos negros o bosques oscuros", "sombreros, velos finos y collares"],
       ["durero", "holbein"])
artist("morales", "Luis de Morales", "Luis de Morales", "manierismo-y-norte", 1510, 1586, "España", 9,
       "Fíjate en el modelado suavísimo, sin bordes, de Vírgenes y Cristos dolientes, con velos transparentes.",
       ["esfumado suave, a lo Leonardo", "velos finos y transparentes", "rostros de dolor tierno sobre fondo oscuro"],
       ["leonardo", "juan-de-juanes"])
artist("sanchez-coello", "Alonso Sánchez Coello", "Sánchez Coello", "manierismo-y-norte", 1531, 1588, "España", 10,
       "Fíjate en la formalidad: reyes e infantas serios y quietos, con cada joya y cada bordado al detalle.",
       ["retratos de la familia real", "poses serias y rígidas", "joyas y telas minuciosas"],
       ["sofonisba", "tiziano"])
artist("sofonisba", "Sofonisba Anguissola", "Sofonisba", "manierismo-y-norte", 1532, 1625, "Italia", 11,
       "Fíjate en los retratos íntimos y cercanos, a menudo de su familia, con miradas vivas y trajes oscuros.",
       ["retratos cercanos y naturales", "miradas vivas al espectador", "trajes oscuros con cuellos blancos"],
       ["sanchez-coello"])
artist("ribalta", "Francisco Ribalta", "Ribalta", "barroco", 1565, 1628, "España", 12,
       "Fíjate en las figuras macizas y monumentales que salen de la oscuridad con una luz realista.",
       ["fondos oscuros, tenebristas", "figuras monumentales y macizas", "composición sencilla y luz natural"],
       ["ribera", "zurbaran", "caravaggio"])
artist("maino", "Juan Bautista Maíno", "Maíno", "barroco", 1581, 1649, "España", 13,
       "Fíjate en la luz de Caravaggio con colores claros y vivos: figuras de volumen firme y telas brillantes.",
       ["luz dirigida con colores vivos", "figuras de volumen firme", "telas de colores brillantes"],
       ["caravaggio", "zurbaran"])
artist("la-tour", "Georges de La Tour", "La Tour", "barroco", 1593, 1652, "Francia", 14,
       "Fíjate en la llama de una vela que ilumina caras quietas en plena oscuridad, con formas lisas y simples.",
       ["una vela como única luz", "rostros quietos y silenciosos", "formas lisas y geométricas"],
       ["caravaggio", "zurbaran"])
artist("alonso-cano", "Alonso Cano", "Alonso Cano", "barroco", 1601, 1667, "España", 17,
       "Fíjate en la belleza serena e idealizada de las figuras y en los tonos claros de aire veneciano.",
       ["figuras bellas e idealizadas", "tonos claros de raíz veneciana", "volúmenes de escultor"],
       ["murillo", "zurbaran"])
artist("leyster", "Judith Leyster", "Leyster", "barroco", 1609, 1660, "Países Bajos", 18,
       "Fíjate en los músicos y bebedores que ríen, pintados con pincelada rápida sobre un fondo liso.",
       ["gente alegre que ríe o toca música", "pincelada suelta a lo Hals", "fondos lisos y neutros"],
       ["hals", "steen"])
artist("pereda", "Antonio de Pereda", "Antonio de Pereda", "barroco", 1611, 1678, "España", 19,
       "Fíjate en las mesas llenas de calaveras, relojes, joyas y monedas: todo dice que la vida se acaba.",
       ["calaveras, relojes y velas apagadas", "joyas, monedas y armas al detalle", "fondo oscuro y luz sobre los objetos"],
       ["valdes-leal", "zurbaran"])
artist("carreno", "Juan Carreño de Miranda", "Carreño", "barroco", 1614, 1685, "España", 20,
       "Fíjate en el retrato de corte a lo Velázquez: el rey pálido, de pie, en un salón con espejos.",
       ["retratos de Carlos II y su corte", "pincelada suelta, aprendida de Velázquez", "salones con espejos y cortinajes rojos"],
       ["velazquez", "claudio-coello"])
artist("valdes-leal", "Juan de Valdés Leal", "Valdés Leal", "barroco", 1622, 1690, "España", 21,
       "Fíjate en el dramatismo: pincelada rápida, figuras agitadas y la muerte presente en calaveras.",
       ["calaveras y escenas de muerte", "pincelada nerviosa y rápida", "figuras en movimiento agitado"],
       ["murillo", "pereda"])
artist("steen", "Jan Steen", "Jan Steen", "barroco", 1626, 1679, "Países Bajos", 22,
       "Fíjate en las casas alborotadas: niños, borrachos, animales y cacharros por el suelo, todo en desorden.",
       ["casas llenas de gente y desorden", "caras pícaras y risueñas", "cacharros y objetos por el suelo"],
       ["leyster", "vermeer"])
artist("claudio-coello", "Claudio Coello", "Claudio Coello", "barroco", 1642, 1693, "España", 23,
       "Fíjate en las grandes escenas de corte e iglesia: arquitecturas en perspectiva, cortinajes y gentío.",
       ["arquitecturas en perspectiva que engañan", "cortinajes y ángeles en movimiento", "multitudes de cortesanos y clérigos"],
       ["carreno", "murillo"])
artist("tiepolo", "Giambattista Tiepolo", "Tiepolo", "rococo-neoclasicismo", 1696, 1770, "Italia", 6,
       "Fíjate en los cielos claros y enormes llenos de figuras que vuelan entre nubes, vistas desde abajo.",
       ["cielos luminosos y abiertos", "figuras que vuelan en escorzo", "colores pastel muy claros"],
       ["veronese", "boucher"])
artist("canaletto", "Canaletto", "Canaletto", "rococo-neoclasicismo", 1697, 1768, "Italia", 7,
       "Fíjate en Venecia con exactitud de foto: canales, palacios y góndolas bajo un cielo azul y luz clara.",
       ["vistas exactas de canales y palacios", "cielos azules y luz limpia", "góndolas y gente diminuta"],
       ["martin-rico"])
artist("chardin", "Jean-Siméon Chardin", "Chardin", "rococo-neoclasicismo", 1699, 1779, "Francia", 8,
       "Fíjate en las cosas sencillas de casa: jarras, frutas y niños quietos, con pincelada granulosa y suave.",
       ["objetos humildes de cocina", "escenas tranquilas de casa", "pincelada granulosa, como polvo de luz"],
       ["melendez", "vermeer"])
artist("reynolds", "Joshua Reynolds", "Reynolds", "rococo-neoclasicismo", 1723, 1792, "Reino Unido", 11,
       "Fíjate en los retratos de pose noble, a lo maestro antiguo, con fondos de paisaje y cielos oscuros.",
       ["poses de estatua clásica", "fondos de paisaje y cielos de tormenta", "tonos cálidos y dorados"],
       ["gainsborough", "van-dyck"])
artist("paret", "Luis Paret y Alcázar", "Luis Paret", "rococo-neoclasicismo", 1746, 1799, "España", 14,
       "Fíjate en las escenas pequeñas y finas, llenas de figuritas elegantes de colores vivos, como joyas.",
       ["escenas diminutas y minuciosas", "figuritas elegantes con trajes de colores", "puertos y fiestas de España"],
       ["watteau", "fragonard"])
artist("vigee-le-brun", "Élisabeth Vigée Le Brun", "Vigée Le Brun", "rococo-neoclasicismo", 1755, 1842, "Francia", 15,
       "Fíjate en los retratos de mujeres sonrientes y naturales, de piel luminosa, con telas ligeras y cintas.",
       ["mujeres de sonrisa amable", "piel fresca y luminosa", "vestidos ligeros, muselinas y cintas"],
       ["gainsborough", "boucher"])
artist("vicente-lopez", "Vicente López Portaña", "Vicente López", "rococo-neoclasicismo", 1772, 1850, "España", 17,
       "Fíjate en el detalle minucioso del retrato: cada encaje, condecoración y bordado pintado con nitidez.",
       ["retratos oficiales de la corte", "encajes y bordados minuciosos", "caras precisas, sin idealizar"],
       ["goya", "madrazo"])
artist("rossetti", "Dante Gabriel Rossetti", "Rossetti", "romanticismo", 1828, 1882, "Reino Unido", 13,
       "Fíjate en las mujeres de cuello largo, labios rojos y melena abundante, entre telas verdes y flores.",
       ["mujeres de melena y labios rojos", "primer plano de medio cuerpo", "verdes intensos y flores simbólicas"],
       ["millais", "waterhouse"])
artist("millais", "John Everett Millais", "Millais", "romanticismo", 1829, 1896, "Reino Unido", 14,
       "Fíjate en el detalle de botánico: cada hoja y cada flor pintadas del natural, con colores vivos.",
       ["plantas y flores minuciosas", "colores claros, vivos y brillantes", "escenas literarias y emotivas"],
       ["rossetti", "waterhouse"])
artist("corot", "Jean-Baptiste Camille Corot", "Corot", "realismo", 1796, 1875, "Francia", 7,
       "Fíjate en los paisajes de grises plateados y verdes lechosos, con árboles vaporosos y un toque rojo.",
       ["tonos plateados y verdes suaves", "árboles de follaje vaporoso", "una pequeña mancha roja o amarilla"],
       ["millet", "pissarro"])
artist("bonheur", "Rosa Bonheur", "Bonheur", "realismo", 1822, 1899, "Francia", 9,
       "Fíjate en los animales como protagonistas, caballos y bueyes, con una anatomía exacta de naturalista.",
       ["animales como protagonistas", "caballos y bueyes en movimiento", "pelajes y músculos exactos"],
       ["courbet", "millet"])
artist("martin-rico", "Martín Rico", "Martín Rico", "realismo", 1833, 1908, "España", 13,
       "Fíjate en la luz clara de Venecia: canales, fachadas blancas y cielos limpios, con dibujo preciso.",
       ["canales de Venecia y fachadas al sol", "cielos limpios y luz blanca", "dibujo preciso y toques de color"],
       ["fortuny", "canaletto"])
artist("gisbert", "Antonio Gisbert", "Gisbert", "realismo", 1834, 1901, "España", 15,
       "Fíjate en la historia de España a gran escala: figuras a tamaño natural, en fila y con gesto grave.",
       ["episodios de la historia de España", "lienzos enormes con muchas figuras", "escenas graves al aire libre"],
       ["rosales", "pradilla"])
artist("homer", "Winslow Homer", "Winslow Homer", "realismo", 1836, 1910, "Estados Unidos", 16,
       "Fíjate en el mar del norte: olas que rompen contra las rocas y barcas escoradas que luchan con el agua.",
       ["olas contra las rocas", "barcas y marineros", "acuarelas frescas y seguras"],
       ["sargent", "aivazovski"])
artist("raimundo-madrazo", "Raimundo de Madrazo", "Raimundo de Madrazo", "realismo", 1841, 1920, "España", 19,
       "Fíjate en las damas elegantes de salón, con sedas brillantes y una pincelada ágil y luminosa.",
       ["damas elegantes de su época", "sedas y rasos que brillan", "pincelada ágil y fresca"],
       ["madrazo", "fortuny"])
artist("pradilla", "Francisco Pradilla", "Pradilla", "realismo", 1848, 1921, "España", 23,
       "Fíjate en la historia de España como un teatro: reinas y cortejos en paisajes de niebla, muy detallados.",
       ["escenas de la historia de España", "paisajes grises y brumosos", "detalle minucioso de trajes"],
       ["gisbert", "rosales"])
artist("bazille", "Frédéric Bazille", "Bazille", "impresionismo", 1841, 1870, "Francia", 10,
       "Fíjate en las figuras grandes y sólidas al aire libre, bajo la luz fuerte y clara del sur de Francia.",
       ["figuras grandes al aire libre", "luz fuerte y clara", "contornos más firmes que los de Monet"],
       ["monet", "renoir"])
artist("cassatt", "Mary Cassatt", "Cassatt", "impresionismo", 1844, 1926, "Estados Unidos", 11,
       "Fíjate en madres con sus hijos en escenas íntimas, de color claro y encuadres a la japonesa.",
       ["madres e hijos abrazados", "escenas íntimas de casa", "encuadres cortados y colores claros"],
       ["morisot", "degas"])
artist("beruete", "Aureliano de Beruete", "Beruete", "impresionismo", 1845, 1912, "España", 12,
       "Fíjate en las vistas de Madrid y de Castilla: cielos amplios, pincelada suelta y la sierra al fondo.",
       ["vistas de Madrid y Castilla", "cielos amplios y luminosos", "pincelada suelta impresionista"],
       ["sorolla", "pissarro"])
artist("caillebotte", "Gustave Caillebotte", "Caillebotte", "impresionismo", 1848, 1894, "Francia", 13,
       "Fíjate en el París moderno con perspectivas audaces: bulevares, puentes y suelos que se van al fondo.",
       ["calles y bulevares de París", "perspectivas muy marcadas", "encuadres desde arriba o cortados"],
       ["degas", "monet"])
artist("pinazo", "Ignacio Pinazo", "Pinazo", "impresionismo", 1849, 1916, "España", 14,
       "Fíjate en las manchas sueltas y rápidas: escenas de familia y de playa con luz mediterránea.",
       ["manchas de color rápidas", "niños y escenas de familia", "luz y playas mediterráneas"],
       ["sorolla"])
artist("kroyer", "Peder Severin Krøyer", "Krøyer", "impresionismo", 1851, 1909, "Dinamarca", 15,
       "Fíjate en la luz del atardecer nórdico en la playa: azules suaves, con mar y cielo casi del mismo color.",
       ["playas de Skagen al atardecer", "azules suaves y luminosos", "grupos de amigos a la mesa o paseando"],
       ["sorolla", "zorn"])
artist("sargent", "John Singer Sargent", "Sargent", "impresionismo", 1856, 1925, "Estados Unidos", 16,
       "Fíjate en la pincelada veloz y segura, a lo Velázquez: retratos elegantes con blancos y sedas que brillan.",
       ["pinceladas largas y seguras", "sedas y blancos luminosos", "poses elegantes y naturales"],
       ["velazquez", "zorn"])
artist("regoyos", "Darío de Regoyos", "Regoyos", "impresionismo", 1857, 1913, "España", 17,
       "Fíjate en los paisajes del norte de España hechos con toques de puntos y comas, en colores claros.",
       ["paisajes del norte de España", "toques de color en puntos y comas", "trenes, procesiones y vida de pueblo"],
       ["signac", "pissarro"])
artist("zorn", "Anders Zorn", "Zorn", "impresionismo", 1860, 1920, "Suecia", 18,
       "Fíjate en las pinceladas largas y rápidas y en el agua llena de reflejos junto a cuerpos al sol.",
       ["pinceladas largas y veloces", "agua llena de reflejos", "bañistas y escenas de Suecia"],
       ["sargent", "sorolla"])
artist("utamaro", "Kitagawa Utamaro", "Utamaro", "ukiyo-e", 1753, 1806, "Japón", 1,
       "Fíjate en una sola mujer elegante vista muy de cerca, de cabeza y medio cuerpo, que llena la estampa.",
       ["mujeres hermosas como tema", "retratos de busto o medio cuerpo", "líneas finas y colores suaves"],
       ["sharaku"])
artist("hokusai", "Katsushika Hokusai", "Hokusai", "ukiyo-e", 1760, 1849, "Japón", 2,
       "Fíjate en el azul de Prusia intenso y en la naturaleza poderosa: olas, montes y gente pequeña.",
       ["azul de Prusia intenso", "olas y montañas con profundidad", "personas pequeñas ante la naturaleza"],
       ["hiroshige"])
artist("sharaku", "Tōshūsai Sharaku", "Sharaku", "ukiyo-e", 1760, 1801, "Japón", 3,
       "Fíjate en las caras de actor exageradas, casi caricaturas, sobre un fondo liso gris plateado.",
       ["actores de kabuki de busto", "gestos exagerados, de caricatura", "fondo liso y brillante de mica"],
       ["utamaro"])
artist("hiroshige", "Utagawa Hiroshige", "Hiroshige", "ukiyo-e", 1797, 1858, "Japón", 4,
       "Fíjate en el tiempo que hace: viajeros diminutos bajo la lluvia o la nieve en un camino de estampa.",
       ["lluvia, nieve y estaciones", "caminos y viajeros", "degradados de color en el cielo"],
       ["hokusai"])
artist("kuniyoshi", "Utagawa Kuniyoshi", "Kuniyoshi", "ukiyo-e", 1797, 1861, "Japón", 5,
       "Fíjate en los guerreros en plena hazaña y en los monstruos enormes, como su esqueleto gigante.",
       ["guerreros y héroes en combate", "fantasmas y criaturas gigantes", "composiciones llenas de movimiento"],
       ["hokusai"])
artist("signac", "Paul Signac", "Signac", "postimpresionismo", 1863, 1935, "Francia", 7,
       "Fíjate en los puertos y las velas hechos con toques cuadrados de color puro, como un mosaico de luz.",
       ["toques de color en forma de teselas", "puertos, barcos y mar", "colores puros y vibrantes"],
       ["seurat", "regoyos"])
artist("mir", "Joaquín Mir", "Joaquín Mir", "postimpresionismo", 1873, 1940, "España", 8,
       "Fíjate en la explosión de color: paisajes casi abstractos con manchas encendidas de luz mediterránea.",
       ["colores encendidos e irreales", "paisajes que rozan la abstracción", "grutas, rocas y calas de Mallorca"],
       ["sorolla", "rusinol"])
artist("moreau", "Gustave Moreau", "Moreau", "simbolismo-modernismo", 1826, 1898, "Francia", 6,
       "Fíjate en los mitos cubiertos de joyas y arabescos finísimos, como bordados de oro sobre fondos oscuros.",
       ["figuras mitológicas enjoyadas", "arabescos y detalles como bordados", "fondos oscuros de piedra preciosa"],
       ["klimt", "waterhouse"])
artist("waterhouse", "John William Waterhouse", "Waterhouse", "simbolismo-modernismo", 1849, 1917, "Reino Unido", 7,
       "Fíjate en las damas de leyenda en barcas, estanques y bosques, de melena larga y gesto melancólico.",
       ["heroínas de leyenda y mito", "agua, juncos y flores", "rostros pálidos y melancólicos"],
       ["millais", "rossetti"])
artist("rusinol", "Santiago Rusiñol", "Rusiñol", "simbolismo-modernismo", 1861, 1931, "España", 9,
       "Fíjate en los jardines vacíos con cipreses, escalinatas y fuentes, en la luz suave del atardecer.",
       ["jardines sin gente", "cipreses, arcos y escalinatas", "luz tenue y melancólica"],
       ["casas", "mir"])
artist("hammershoi", "Vilhelm Hammershøi", "Hammershøi", "simbolismo-modernismo", 1864, 1916, "Dinamarca", 11,
       "Fíjate en las habitaciones casi vacías, grises y en silencio, con luz de ventana y una mujer de espaldas.",
       ["habitaciones vacías y grises", "luz suave de ventana", "una mujer de espaldas"],
       ["vermeer"])
artist("casas", "Ramón Casas", "Ramón Casas", "simbolismo-modernismo", 1866, 1932, "España", 12,
       "Fíjate en el dibujo seguro y en la gente moderna de Barcelona, con grises y negros elegantes.",
       ["dibujo firme y seguro", "gente de la Barcelona moderna", "grises y negros elegantes"],
       ["rusinol", "sargent"])
artist("zuloaga", "Ignacio Zuloaga", "Zuloaga", "simbolismo-modernismo", 1870, 1945, "España", 13,
       "Fíjate en la España dura: toreros, campesinos y pueblos de Castilla, en tonos terrosos y cielos de tormenta.",
       ["tipos populares y toreros", "colores terrosos y negros", "cielos oscuros sobre Castilla"],
       ["goya", "velazquez"])
artist("nonell", "Isidro Nonell", "Nonell", "simbolismo-modernismo", 1872, 1911, "España", 14,
       "Fíjate en las figuras encogidas de gitanas y mendigos, hechas con trazos gruesos y tonos sombríos.",
       ["gitanas y marginados encogidos", "trazos gruesos y cortos", "tonos azulados y sombríos"],
       ["casas"])
artist("modigliani", "Amedeo Modigliani", "Modigliani", "simbolismo-modernismo", 1884, 1920, "Italia", 17,
       "Fíjate en los cuellos larguísimos, las caras ovaladas y los ojos almendrados, a veces sin pupila.",
       ["cuellos largos y caras ovaladas", "ojos almendrados sin pupila", "colores cálidos y planos"],
       ["el-greco"])
artist("schiele", "Egon Schiele", "Schiele", "simbolismo-modernismo", 1890, 1918, "Austria", 18,
       "Fíjate en los cuerpos angulosos y torcidos, de contorno nervioso y piel con manchas de color.",
       ["contornos nerviosos y quebrados", "cuerpos angulosos y huesudos", "fondos vacíos"],
       ["klimt"])

# Pintores que faltaban (docs/eval/pintores-que-faltan.md, 26/11): pistas y rasgos de los nuevos y de los
# invitados del camino que no los tenían (Mantegna, Giorgione, Bouguereau, Whistler). Con conocimiento propio
# por decisión de María, como el bloque anterior.
artist("masaccio", "Masaccio", "Masaccio", "renacimiento", 1401, 1428, "Italia", 17,
       "Fíjate en las figuras macizas que pisan firme y echan sombra, con una sola luz que llega de un lado.",
       ["figuras pesadas, como de piedra", "luz de un solo lado con sombras de verdad", "caras serias y gestos sobrios"],
       ["giotto", "piero"])
artist("piero", "Piero della Francesca", "Piero", "renacimiento", 1415, 1492, "Italia", 18,
       "Fíjate en la luz clara y quieta: figuras como columnas, caras impasibles y espacios medidos.",
       ["luz clara y blanca, sin sombras duras", "figuras quietas, como estatuas", "arquitecturas en perspectiva perfecta"],
       ["masaccio", "berruguete"])
artist("uccello", "Paolo Uccello", "Uccello", "renacimiento", 1397, 1475, "Italia", 19,
       "Fíjate en la perspectiva hecha juego: lanzas, suelos y caballos como juguetes geométricos.",
       ["perspectiva marcada como un tablero", "caballos y lanzas de juguete", "escenas de cuento, a veces de noche"],
       ["piero", "masaccio"])
artist("filippo-lippi", "Filippo Lippi", "Filippo Lippi", "renacimiento", 1406, 1469, "Italia", 20,
       "Fíjate en las Vírgenes de cara dulce y cercana, con velos transparentes y ángeles traviesos.",
       ["Vírgenes jóvenes y cercanas", "velos finos y transparentes", "ángeles con aire de niño"],
       ["botticelli", "fra-angelico"])
artist("perugino", "Perugino", "Perugino", "renacimiento", 1448, 1523, "Italia", 21,
       "Fíjate en la calma: figuras dulces de cabeza ladeada y un paisaje abierto con arbolitos finos.",
       ["cabezas ladeadas y gesto dulce", "paisajes abiertos y luminosos", "plazas y templos en perspectiva"],
       ["rafael", "botticelli"])
artist("bermejo", "Bartolomé Bermejo", "Bermejo", "renacimiento", 1440, 1501, "España", 22,
       "Fíjate en el óleo minucioso a la flamenca: oros, joyas y armaduras que brillan, y cielos de tormenta.",
       ["detalle flamenco con oro y joyas", "paisajes con cielos de tormenta", "santos y diablos de gesto intenso"],
       ["van-eyck", "berruguete"])
artist("mantegna", "Andrea Mantegna", "Mantegna", "renacimiento", 1431, 1506, "Italia", 23,
       "Fíjate en las figuras duras como piedra, en escorzos atrevidos, con ruinas romanas al fondo.",
       ["figuras como esculpidas en piedra", "escorzos y vistas desde abajo", "ruinas y arquitectura romana"],
       ["bellini", "piero"])
artist("giorgione", "Giorgione", "Giorgione", "renacimiento", 1478, 1510, "Italia", 24,
       "Fíjate en el paisaje que envuelve a figuras quietas y pensativas, con una luz suave y dorada.",
       ["el paisaje como protagonista", "figuras quietas y misteriosas", "luz suave y dorada"],
       ["tiziano", "bellini"])
artist("van-der-weyden", "Rogier van der Weyden", "Van der Weyden", "manierismo-y-norte", 1399, 1464, "Flandes", 11,
       "Fíjate en el llanto: lágrimas transparentes y cuerpos que se doblan de dolor, como tallados en madera.",
       ["lágrimas y gestos de dolor", "figuras como relieves de madera", "telas de pliegues duros y angulosos"],
       ["van-eyck", "memling"])
artist("memling", "Hans Memling", "Memling", "manierismo-y-norte", 1430, 1494, "Flandes", 12,
       "Fíjate en la calma ordenada: caras serenas, colores limpios y un paisaje flamenco al fondo.",
       ["caras serenas y suaves", "colores limpios y luminosos", "paisajes tras la ventana o el trono"],
       ["van-der-weyden", "van-eyck"])
artist("holbein", "Hans Holbein el Joven", "Holbein", "manierismo-y-norte", 1497, 1543, "Alemania", 13,
       "Fíjate en el retrato exacto y frío: cara impasible, pieles y terciopelos, y un fondo liso de color.",
       ["retratos de precisión casi fotográfica", "fondos lisos de azul o verde", "pieles, terciopelos y joyas al detalle"],
       ["durero", "cranach"])
artist("parmigianino", "Parmigianino", "Parmigianino", "manierismo-y-norte", 1503, 1540, "Italia", 14,
       "Fíjate en la elegancia estirada: cuellos y dedos larguísimos, piel de porcelana y poses rebuscadas.",
       ["cuellos y manos muy alargados", "piel pálida y pulida como porcelana", "poses retorcidas y refinadas"],
       ["bronzino", "correggio"])
artist("bronzino", "Agnolo Bronzino", "Bronzino", "manierismo-y-norte", 1503, 1572, "Italia", 15,
       "Fíjate en los retratos fríos como esmalte: caras sin emoción, sedas que brillan y dedos largos.",
       ["caras serias y distantes", "superficie lisa como esmalte", "sedas y brocados brillantes"],
       ["parmigianino", "pontormo"])
artist("pontormo", "Pontormo", "Pontormo", "manierismo-y-norte", 1494, 1557, "Italia", 16,
       "Fíjate en los colores ácidos (rosas, verdes, naranjas) y en cuerpos que flotan sin suelo firme.",
       ["rosas, verdes y naranjas ácidos", "figuras que parecen flotar", "caras de ojos grandes e inquietos"],
       ["bronzino", "el-greco"])
artist("arcimboldo", "Giuseppe Arcimboldo", "Arcimboldo", "manierismo-y-norte", 1526, 1593, "Italia", 17,
       "Fíjate en la cara: está hecha de frutas, verduras, flores, libros o animales.",
       ["caras hechas de objetos", "frutas, flores y animales amontonados", "fondo oscuro y liso"],
       ["bosco"])
artist("sanchez-cotan", "Juan Sánchez Cotán", "Sánchez Cotán", "barroco", 1560, 1627, "España", 25,
       "Fíjate en unas pocas hortalizas en un hueco de piedra, sobre negro y ordenadas como una geometría.",
       ["frutas y verduras sobre fondo negro", "un marco de piedra como ventana", "orden quieto y casi geométrico"],
       ["melendez", "zurbaran"])
artist("hogarth", "William Hogarth", "Hogarth", "rococo-neoclasicismo", 1697, 1764, "Reino Unido", 20,
       "Fíjate en las escenas con mucha gente que cuentan un vicio, como una viñeta satírica llena de detalles.",
       ["historias morales por capítulos", "interiores llenos de gente", "gestos exagerados, con humor"],
       ["steen", "gainsborough"])
artist("bouguereau", "William-Adolphe Bouguereau", "Bouguereau", "realismo", 1825, 1905, "Francia", 30,
       "Fíjate en la piel de porcelana sin una pincelada a la vista: ninfas, niñas y ángeles de belleza dulce.",
       ["piel lisa como porcelana", "desnudos y ninfas idealizados", "caras dulces y perfectas"],
       ["ingres", "waterhouse"])
artist("whistler", "James McNeill Whistler", "Whistler", "impresionismo", 1834, 1903, "Estados Unidos", 20,
       "Fíjate en la armonía de muy pocos tonos, como una música: grises, negros o azules de noche.",
       ["paleta de pocos tonos", "nocturnos azules y brumosos", "figuras de cuerpo entero en gris y negro"],
       ["manet", "sargent"])

# Únicos pintores rusos con etapa propia (decisión del coordinador, oleada 4): el resto de rusos
# son invitados aunque tengan ≥3 obras (sirven de distractores y de obras no vistas).
STAGE_RUSSIANS = {"aivazovski", "shishkin", "repin", "levitan"}
MIN_STAGE_WORKS = 3

# Título corto (≤ 12 letras) de las etapas «a fondo» sin historia y con nombre largo: es el nombre de su círculo en la fila de
# niveles, el del botón «Jugar · …» y el de la ronda. Único origen: las etapas con historia lo toman del `stage` de su historia
# (contenido/historias) y las de nombre corto («Más obras», «Florencia»), de su nombre (tools/catalog_from_pipeline.py).
STAGE_SHORT_MAX = 12
STAGE_SHORT = {
    ("giotto", 2): "Asís", ("giotto", 3): "Padua", ("giotto", 4): "Florencia",
    ("berruguete", 2): "Castilla", ("durero", 2): "Aprendizaje", ("bruegel", 2): "Comienzos",
    ("van-dyck", 2): "Amberes", ("vermeer", 2): "Comienzos", ("david", 2): "Comienzos",
    ("delacroix", 2): "Juventud", ("millet", 2): "París", ("courbet", 2): "Inicios", ("fortuny", 2): "Roma",
    ("cezanne", 2): "Época oscura", ("gauguin", 2): "Bretaña", ("klimt", 2): "Secesión",
    ("romero-de-torres", 2): "Comienzos",
}


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
 "a147": "Mira el cielo de atardecer, azul y oro, detrás del jinete oscuro",
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
 # El Greco (a236, obra de juventud: atípica, véase KIND)
 "a236": "No parece un Greco: obra de juventud en Roma, con la luz de la vela en la cara y el fondo a oscuras",
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
 # Velázquez (a182, obra de juventud en penumbra: atípica, véase KIND)
 "a182": "No parece un Velázquez: obra de juventud, con luz de noche que despeja las sombras hacia el Niño",
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
 # Repin (a180, escena fantástica, poco habitual en él: la pista cuenta lo que se ve)
 "a180": "Mira el fondo del mar de cuento: figuras y peces entre luces doradas en el agua oscura",
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
 # Renoir (a134, paisaje sin figuras: la pista va a la pincelada)
 "a134": "Mira el agua y el cielo hechos a toques sueltos de azul y naranja",
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

# --- Pistas que no engañan (feedback de María, 24/11) -------------------------------------
# Esquema que debe seguir el catálogo grande:
#  · LOOK[id]         primera pista propia de la obra (texto corto, sin autor ni título).
#  · LOOK2[id]        segunda pista propia: (texto, fuente). Se dice al repetir el fallo del mismo cuadro.
#  · LOOK_SOURCE[id]  fuente de la primera pista (museo o publicación). Sin fuente, la pista no
#                     cuenta como verificada (`verified: false` en el motor).
#  · KIND[id]         tipo de cuadro: "tipico" (la pista enseña el rasgo del autor; es lo que se
#                     supone si falta), "atipico" («no parece un X; lo reconoces por…») o "memoria"
#                     («este hay que sabérselo»). En atípicos y de memoria el motor no enseña los
#                     rasgos genéricos del pintor, solo sus pistas propias.
#  · TAGS[id]         etiquetas visuales de la obra (vocabulario cerrado TAG_LABELS), escritas
#                     mirando la imagen a 1000 px. Sirven para no dar, tras un fallo en «¿Cuál es de
#                     X?», un rasgo de X que el cuadro elegido también cumpla, y para decir en
#                     «¿Quién lo pintó?» qué seña del pintor elegido falta aquí.
#  · TRAIT_TAGS[pintor] etiquetas de cada frase del pintor, alineadas con [hint, *traits]
#                     (invitados: solo [hint]). Una frase sin etiquetas ([]) no se usa tras un fallo.
# En data/catalog-text.json: look, looks ([{text, source}]), kind, tags, traits, traitTags,
# tagLabels y negableTags.

# Vocabulario visual cerrado: etiqueta -> cómo se dice en «aquí no hay …».
TAG_LABELS = {
    "rojo": "rojos intensos", "oro": "dorados", "azul": "azules intensos", "amarillo": "amarillos vivos",
    "rosa": "tonos rosados", "verde": "verdes", "gris": "grises plateados", "negro": "negros intensos",
    "oscuro": "fondo oscuro", "claro": "luz clara", "foco": "un foco de luz dura", "ventana": "luz de ventana",
    "noche": "escena de noche", "suelta": "pincelada suelta", "nitido": "contornos nítidos", "difuminado": "bruma",
    "grueso": "trazos gruesos", "puntos": "puntitos de color", "plano": "colores planos",
    "bloques": "pinceladas en bloques", "lineas": "líneas largas y nerviosas", "ondulante": "líneas ondulantes",
    "mosaico": "mosaicos y adornos", "multitud": "una multitud", "diminutas": "figuras diminutas",
    "alargado": "figuras alargadas", "estatua": "figuras como estatuas", "desnudo": "cuerpos desnudos",
    "retrato": "una cara en primer plano", "mirada": "una mirada de frente", "espaldas": "una figura de espaldas",
    "expresion": "gestos expresivos", "cortado": "encuadre cortado", "dinamico": "composición en diagonal",
    "triangulo": "composición en triángulo", "paisaje": "paisaje", "cielo": "un gran cielo", "mar": "mar",
    "agua": "agua y reflejos", "nieve": "nieve", "arboles": "árboles", "arquitectura": "columnas y arcos",
    "interior": "un interior", "sedas": "sedas brillantes", "baile": "bailarinas", "barcos": "barcos",
    "monstruos": "criaturas imposibles", "dulzura": "caras dulces",
}
# Etiquetas tan claras que se puede afirmar que NO están en un cuadro («aquí no hay fondo oscuro»).
# Las de pincelada o de tono (suelta, nítido, dorados…) no: dependen del ojo. Tampoco rojos, negros
# ni desnudos: un detalle pequeño (una manga, un niño) desmentiría la negación; esas tres sirven solo
# para no enseñar un rasgo que el cuadro elegido también cumple.
NEGABLE_TAGS = ["oscuro", "foco", "ventana", "noche", "puntos", "grueso", "plano", "bloques",
                "mosaico", "multitud", "diminutas", "alargado", "estatua", "espaldas", "ondulante",
                "mar", "nieve", "arquitectura", "baile", "barcos", "monstruos"]

# Etiquetas de cada frase del pintor: [pista, rasgo 1, rasgo 2, rasgo 3]; en invitados, [pista].
# La primera etiqueta de la pista es la seña más inconfundible (es la que se niega primero).
TRAIT_TAGS = {
    "leonardo": [["difuminado"], ["difuminado"], ["difuminado", "paisaje", "azul"], ["oscuro", "difuminado"]],
    "rafael": [["nitido", "triangulo"], ["nitido"], [], ["triangulo"]],
    "tiziano": [["rojo", "desnudo"], ["rojo"], ["desnudo"], ["cielo"]],
    "veronese": [["arquitectura", "multitud", "sedas"], ["arquitectura"], ["multitud"], ["sedas"]],
    "bosco": [["monstruos", "diminutas", "desnudo"], ["monstruos"], ["diminutas", "desnudo"], ["monstruos"]],
    "durero": [["nitido"], ["nitido"], ["nitido"], []],
    "bruegel": [["diminutas", "paisaje"], ["diminutas"], ["diminutas"], ["paisaje"]],
    "el-greco": [["alargado"], ["alargado"], ["amarillo", "rosa"], []],
    "caravaggio": [["oscuro", "foco"], ["oscuro"], ["foco"], []],
    "rubens": [["desnudo", "rosa", "dinamico"], ["desnudo", "rosa"], ["dinamico"], ["dinamico"]],
    "velazquez": [["gris", "suelta"], ["gris"], ["suelta"], []],
    "rembrandt": [["oscuro", "oro"], ["oscuro", "oro"], ["oscuro"], ["grueso"]],
    "murillo": [["dulzura"], ["dulzura"], ["difuminado"], ["oro", "difuminado"]],
    "vermeer": [["ventana", "azul", "amarillo"], ["ventana"], ["azul", "amarillo"], []],
    "fragonard": [["suelta", "sedas"], ["suelta"], ["sedas", "rosa"], []],
    "david": [["estatua", "nitido"], ["estatua"], ["nitido"], ["oscuro"]],
    "goya": [["oscuro", "suelta"], ["oscuro", "suelta"], ["oscuro"], []],
    "friedrich": [["espaldas", "paisaje"], ["espaldas", "diminutas"], ["paisaje"], []],
    "delacroix": [["rojo", "suelta"], ["suelta"], ["rojo"], ["dinamico"]],
    "aivazovski": [["mar", "verde"], ["mar", "verde"], ["cielo"], ["barcos"]],
    "shishkin": [["arboles"], ["arboles"], ["claro"], []],
    "repin": [["expresion"], ["expresion"], ["expresion"], []],
    "levitan": [["cielo", "agua"], ["cielo", "agua"], ["suelta"], ["paisaje"]],
    "manet": [["negro", "plano", "mirada"], ["negro"], ["plano"], ["mirada"]],
    "monet": [["suelta"], ["suelta"], ["agua"], ["suelta"]],
    "degas": [["cortado"], ["cortado"], ["baile"], ["cortado"]],
    "renoir": [["rosa", "suelta"], ["rosa"], ["suelta", "claro"], ["multitud"]],
    "gauguin": [["plano"], ["plano"], ["plano"], ["plano"]],
    "van-gogh": [["grueso"], ["grueso"], ["azul", "amarillo"], ["grueso"]],
    "lautrec": [["lineas"], ["lineas"], ["verde"], ["interior"]],
    "munch": [["ondulante"], ["ondulante"], ["expresion"], ["suelta"]],
    "klimt": [["oro", "mosaico"], ["oro", "mosaico"], ["mosaico"], ["mosaico"]],
    # Invitados (solo la pista): sirven para decir qué seña suya falta cuando se les elige por error.
    "botticelli": [["nitido"]], "miguel-angel": [["desnudo"]], "bellini": [[]], "correggio": [["desnudo"]],
    "van-eyck": [["nitido", "interior"]], "van-dyck": [["sedas"]], "poussin": [["paisaje"]],
    "claudio-de-lorena": [["mar", "barcos", "oro"]], "boucher": [["rosa", "azul", "desnudo"]],
    "greuze": [["interior", "expresion"]], "liotard": [["nitido"]], "gainsborough": [["suelta", "retrato"]],
    "borovikovski": [["retrato"]], "ingres": [["nitido"]],
    "constable": [["cielo", "paisaje"]], "delaroche": [["nitido"]],
    "ivanov": [["multitud"]], "tropinin": [["retrato"]], "courbet": [[]],
    "savrasov": [["nieve"]], "kramskoi": [["retrato", "mirada"]],
    "fedotov": [["interior"]], "vereshchagin": [[]], "venetsianov": [["claro", "paisaje"]], "serov": [["claro"]],
    "rousseau": [["plano"]], "vrubel": [["bloques"]],
    "nesterov": [["paisaje"]], "petrov-vodkin": [["plano", "rojo"]],
    "kandinsky": [["plano"]], "malevich": [["plano"]],
    # Invitados con tres rasgos (se enseñan en las salas): alineados con [pista, rasgo 1, 2, 3].
    "briullov": [["nitido"], ["dinamico"], ["nitido"], []],
    "kuindzhi": [["noche", "foco"], ["noche", "foco"], ["oscuro"], []],
    "vasnetsov": [[], [], [], ["paisaje"]],
    "polenov": [["claro"], ["claro"], ["paisaje"], ["paisaje"]],
    "surikov": [["multitud"], [], ["multitud"], ["nieve"]],
    "perov": [["expresion"], [], [], []],
    "makovski": [["interior"], [], ["multitud"], ["nitido"]],
    "turner": [["difuminado"], ["difuminado"], ["difuminado", "oro"], ["barcos", "difuminado"]],
    "cezanne": [["bloques"], ["bloques"], ["bloques"], []],
    "seurat": [["puntos"], ["puntos"], [], ["claro"]],
    # Maestros con etapa añadidos en la oleada de historias y rasgos: alineados con [pista, rasgo 1, 2, 3].
    "berruguete": [["oro", "arquitectura", "nitido"], ["oro"], ["arquitectura"], ["nitido"]],
    "hals": [["suelta", "retrato"], ["suelta"], ["expresion", "retrato"], ["negro"]],
    "ribera": [["oscuro", "foco"], [], ["oscuro", "foco"], ["grueso"]],
    "artemisia": [["oscuro", "foco", "expresion"], ["oscuro", "foco"], ["expresion"], ["amarillo", "rojo"]],
    "zurbaran": [["oscuro", "foco"], ["nitido"], ["oscuro", "foco"], ["nitido"]],
    "watteau": [["sedas", "paisaje", "difuminado"], ["paisaje"], ["sedas"], []],
    "melendez": [["oscuro", "nitido"], [], ["oscuro"], ["nitido"]],
    "madrazo": [["nitido", "retrato", "sedas"], ["nitido"], ["sedas"], ["retrato"]],
    "millet": [["paisaje", "cielo"], [], [], ["paisaje", "cielo"]],
    "rosales": [["suelta", "gris"], [], ["suelta"], ["gris", "negro"]],
    "fortuny": [["nitido", "sedas"], ["nitido"], ["sedas"], ["claro"]],
    "pissarro": [["paisaje", "arboles", "suelta"], ["paisaje", "arboles"], [], ["suelta"]],
    "sisley": [["cielo", "agua", "difuminado"], ["cielo"], ["agua", "paisaje"], ["difuminado", "suelta"]],
    "morisot": [["suelta", "claro"], ["suelta"], ["interior"], ["claro"]],
    "sorolla": [["claro", "mar", "suelta"], ["mar", "agua", "claro"], ["claro"], ["suelta"]],
    "romero-de-torres": [["oscuro", "mirada", "nitido"], ["mirada", "retrato"], ["paisaje", "arquitectura"], ["oscuro", "nitido"]],
    "juan-gris": [["plano", "nitido"], ["plano"], [], ["plano", "nitido"]],
    # Pintores jugables que no tenían pista: alineados con [pista, rasgo 1, 2, 3].
    "cimabue": [["oro", "arquitectura"], ["oro"], ["arquitectura"], ["oro"]],
    "duccio": [["azul", "oro"], ["azul", "oro"], [], ["diminutas"]],
    "lorenzetti": [["arquitectura", "interior"], ["arquitectura"], ["arquitectura", "interior"], ["multitud"]],
    "simone-martini": [["ondulante", "oro"], ["ondulante"], ["oro"], ["expresion"]],
    "giotto": [["estatua"], ["estatua"], [], ["expresion"]],
    "fra-angelico": [["claro", "arquitectura"], ["claro"], ["arquitectura"], ["oro"]],
    "juan-de-juanes": [["dulzura", "nitido"], ["dulzura"], ["nitido"], ["retrato"]],
    "tintoretto": [["oscuro", "dinamico"], ["oscuro", "foco"], ["dinamico"], ["multitud"]],
    "cranach": [["desnudo", "oscuro"], ["desnudo"], ["oscuro"], []],
    "morales": [["difuminado"], ["difuminado"], [], ["oscuro", "expresion"]],
    "sanchez-coello": [["retrato", "nitido"], ["retrato"], [], ["nitido"]],
    "sofonisba": [["retrato", "mirada"], ["retrato"], ["mirada"], ["negro"]],
    "ribalta": [["oscuro", "estatua"], ["oscuro"], ["estatua"], ["foco"]],
    "maino": [["foco", "claro"], ["foco"], ["estatua"], ["sedas"]],
    "la-tour": [["noche", "foco", "oscuro"], ["foco", "noche"], [], ["nitido"]],
    "alonso-cano": [["dulzura", "claro"], ["dulzura"], ["claro"], ["estatua"]],
    "leyster": [["expresion", "suelta"], ["expresion"], ["suelta"], []],
    "pereda": [["oscuro", "nitido"], [], ["nitido"], ["oscuro", "foco"]],
    "carreno": [["retrato", "interior"], ["retrato"], ["suelta"], ["rojo", "interior"]],
    "valdes-leal": [["suelta", "oscuro"], ["oscuro"], ["suelta"], ["dinamico"]],
    "steen": [["interior", "multitud"], ["interior", "multitud"], ["expresion"], []],
    "claudio-coello": [["arquitectura", "multitud"], ["arquitectura"], ["dinamico"], ["multitud"]],
    "tiepolo": [["cielo", "claro"], ["cielo", "claro"], ["dinamico"], ["claro"]],
    "canaletto": [["arquitectura", "agua", "claro"], ["arquitectura", "agua"], ["azul", "cielo", "claro"], ["barcos", "diminutas"]],
    "chardin": [["interior"], [], ["interior"], ["suelta"]],
    "reynolds": [["retrato", "paisaje"], ["retrato"], ["paisaje", "cielo"], ["oro"]],
    "paret": [["diminutas", "nitido"], ["diminutas"], ["sedas"], ["barcos", "agua"]],
    "vigee-le-brun": [["retrato", "dulzura"], ["dulzura"], ["claro"], ["sedas"]],
    "vicente-lopez": [["retrato", "nitido"], ["retrato"], ["nitido"], ["nitido"]],
    "rossetti": [["retrato", "rojo", "verde"], ["rojo", "retrato"], ["retrato"], ["verde"]],
    "millais": [["nitido", "verde"], ["nitido"], ["claro"], ["expresion"]],
    "corot": [["gris", "arboles", "difuminado"], ["gris", "verde"], ["arboles", "difuminado"], ["rojo"]],
    "bonheur": [["paisaje", "nitido"], ["paisaje"], ["dinamico"], ["nitido"]],
    "martin-rico": [["agua", "claro", "arquitectura"], ["agua", "arquitectura"], ["claro", "cielo"], ["nitido"]],
    "gisbert": [["multitud"], [], ["multitud"], ["paisaje"]],
    "homer": [["mar"], ["mar"], ["barcos", "mar"], ["suelta"]],
    "raimundo-madrazo": [["sedas", "retrato"], ["retrato"], ["sedas"], ["suelta"]],
    "pradilla": [["paisaje", "nitido"], [], ["paisaje", "gris"], ["nitido"]],
    "bazille": [["claro", "paisaje"], ["paisaje"], ["claro"], ["nitido"]],
    "cassatt": [["dulzura", "claro"], ["dulzura"], ["interior"], ["cortado", "claro"]],
    "beruete": [["paisaje", "cielo", "suelta"], ["paisaje"], ["cielo", "claro"], ["suelta"]],
    "caillebotte": [["arquitectura", "dinamico"], ["arquitectura"], ["dinamico"], ["cortado"]],
    "pinazo": [["suelta"], ["suelta"], [], ["mar", "claro"]],
    "kroyer": [["mar", "azul"], ["mar"], ["azul", "claro"], ["multitud"]],
    "sargent": [["suelta", "retrato", "sedas"], ["suelta"], ["sedas"], ["retrato"]],
    "regoyos": [["paisaje", "puntos"], ["paisaje"], ["puntos"], []],
    "zorn": [["suelta", "agua"], ["suelta"], ["agua"], ["desnudo"]],
    "utamaro": [["retrato", "plano"], ["retrato"], ["retrato"], ["plano"]],
    "hokusai": [["azul", "paisaje"], ["azul"], ["mar", "paisaje"], ["diminutas"]],
    "sharaku": [["expresion", "retrato"], ["retrato"], ["expresion"], ["plano"]],
    "hiroshige": [["diminutas", "paisaje"], ["nieve"], ["paisaje", "diminutas"], ["cielo"]],
    "kuniyoshi": [["monstruos", "dinamico"], ["dinamico"], ["monstruos"], ["dinamico"]],
    "signac": [["puntos", "mar"], ["puntos"], ["barcos", "mar"], ["claro"]],
    "mir": [["grueso", "paisaje"], [], ["paisaje"], ["mar"]],
    "moreau": [["oro", "oscuro", "mosaico"], ["oro"], ["mosaico"], ["oscuro"]],
    "waterhouse": [["agua", "paisaje"], [], ["agua"], ["expresion"]],
    "rusinol": [["arboles", "arquitectura"], ["arboles"], ["arquitectura"], ["difuminado"]],
    "hammershoi": [["interior", "gris", "ventana"], ["interior", "gris"], ["ventana"], ["espaldas"]],
    "casas": [["nitido", "gris"], ["nitido"], ["retrato"], ["gris", "negro"]],
    "zuloaga": [["oscuro", "negro"], ["retrato"], ["negro", "oscuro"], ["cielo", "paisaje"]],
    "nonell": [["grueso", "oscuro"], ["oscuro"], ["grueso"], ["azul", "oscuro"]],
    "modigliani": [["alargado", "retrato"], ["alargado"], ["retrato"], ["plano"]],
    "schiele": [["lineas", "expresion"], ["lineas"], ["desnudo", "expresion"], []],
    # Pintores que faltaban (26/11): alineados con [pista, rasgo 1, 2, 3].
    "gericault": [["dinamico", "oscuro"], ["dinamico"], ["expresion"], ["oscuro"]],
    "matisse": [["plano"], ["plano"], ["plano"], ["mosaico"]],
    "masaccio": [["estatua"], ["estatua"], [], ["expresion"]],
    "piero": [["claro", "estatua", "arquitectura"], ["claro"], ["estatua"], ["arquitectura"]],
    "uccello": [["nitido"], ["nitido"], [], ["noche"]],
    "filippo-lippi": [["dulzura"], ["dulzura"], [], []],
    "perugino": [["dulzura", "paisaje"], ["dulzura"], ["paisaje", "claro"], ["arquitectura"]],
    "bermejo": [["oro", "nitido"], ["oro", "nitido"], ["cielo", "paisaje"], ["expresion", "monstruos"]],
    "mantegna": [["estatua", "arquitectura"], ["estatua"], ["dinamico"], ["arquitectura"]],
    "giorgione": [["paisaje", "difuminado"], ["paisaje"], [], ["difuminado", "oro"]],
    "van-der-weyden": [["expresion"], ["expresion"], ["estatua"], ["nitido"]],
    "memling": [["dulzura", "nitido"], ["dulzura"], ["claro"], ["paisaje"]],
    "holbein": [["retrato", "nitido"], ["retrato", "nitido"], ["azul", "verde"], ["sedas"]],
    "parmigianino": [["alargado"], ["alargado"], ["nitido"], []],
    "bronzino": [["retrato", "nitido", "sedas"], ["retrato"], ["nitido"], ["sedas"]],
    "pontormo": [["rosa", "verde"], ["rosa", "verde"], [], ["expresion"]],
    "arcimboldo": [["monstruos", "retrato"], ["monstruos"], [], ["oscuro"]],
    "sanchez-cotan": [["oscuro", "nitido"], ["oscuro"], [], ["nitido"]],
    "hogarth": [["multitud", "interior"], [], ["interior", "multitud"], ["expresion"]],
    "bouguereau": [["nitido", "dulzura"], ["nitido"], ["desnudo"], ["dulzura"]],
    "whistler": [["gris", "difuminado"], ["gris"], ["noche", "azul", "difuminado"], ["retrato", "negro"]],
}

# Etiquetas visibles en cada cuadro, escritas mirando las imágenes (hojas de contacto a 420 px y
# la imagen entera cuando hacía falta). Solo lo que se ve sin duda.
TAGS = {
 # Leonardo
 "a82": ["paisaje", "difuminado", "claro", "rojo", "azul"], "a201": ["oscuro", "difuminado", "paisaje", "desnudo"],
 "a66": ["oscuro", "retrato", "azul", "rojo"], "a125": ["rojo", "azul", "paisaje", "difuminado", "desnudo", "oscuro"],
 "a93": ["multitud", "interior", "arquitectura", "paisaje", "rojo"], "a154": ["retrato", "difuminado", "paisaje", "oscuro"],
 "a235": ["difuminado", "paisaje", "triangulo", "azul", "desnudo"],
 # Rafael
 "a144": ["retrato", "nitido", "claro", "mirada", "arquitectura", "paisaje"],
 "a89": ["triangulo", "rojo", "azul", "claro", "paisaje", "nitido", "desnudo"], "a224": ["paisaje", "claro", "nitido", "azul"],
 "a162": ["multitud", "desnudo", "rojo", "claro", "dinamico"], "a188": ["triangulo", "rojo", "azul", "verde", "claro", "desnudo"],
 "a26": ["oscuro", "rojo", "oro", "nitido"], "a169": ["oscuro", "rojo", "azul", "triangulo", "desnudo"],
 # Tiziano
 "a84": ["paisaje", "rojo", "desnudo", "cielo"], "a104": ["rojo", "oscuro"], "a79": ["rojo", "azul", "oscuro", "retrato"],
 "a56": ["multitud", "desnudo", "paisaje", "cielo", "rojo"], "a147": ["oscuro", "paisaje", "cielo"],
 "a77": ["cielo", "azul", "oscuro"],
 # Veronés
 "a53": ["multitud", "arquitectura", "claro", "sedas", "rojo"], "a2": ["multitud", "arquitectura", "claro", "sedas", "rojo"],
 "a12": ["desnudo", "rosa", "sedas", "arquitectura"],
 # El Bosco, Durero
 "a184": ["multitud", "diminutas", "monstruos", "claro", "paisaje", "desnudo"],
 "a45": ["oscuro", "monstruos", "diminutas", "multitud", "desnudo"], "b9": ["monstruos", "paisaje", "agua"],
 "b10": ["retrato", "oscuro", "mirada", "nitido"], "a120": ["multitud", "rojo", "azul", "claro", "nitido", "desnudo"],
 "a157": ["oscuro", "desnudo", "nitido"],
 # Brueghel
 "a21": ["multitud", "diminutas", "paisaje", "claro", "rojo"], "a220": ["diminutas", "arquitectura", "paisaje", "claro", "multitud"],
 "a151": ["nieve", "diminutas", "paisaje", "arboles", "claro"], "a23": ["nieve", "multitud", "diminutas", "paisaje", "rojo"],
 "a198": ["paisaje", "claro", "dinamico", "expresion"],
 # El Greco
 "a236": ["oscuro", "foco", "retrato", "noche"], "b4": ["multitud", "alargado", "oscuro", "oro"],
 "a127": ["oscuro", "amarillo", "rojo", "alargado"], "b5": ["paisaje", "cielo", "verde", "oscuro"],
 "a121": ["multitud", "alargado", "rosa", "amarillo", "rojo", "arquitectura"],
 # Caravaggio
 "a206": ["oscuro", "foco", "retrato", "mirada", "desnudo"], "a91": ["oscuro", "foco", "retrato", "interior"],
 "a160": ["foco", "paisaje", "rojo", "oscuro", "desnudo"], "b12": ["oscuro", "foco", "rojo", "expresion"],
 "b11": ["oscuro", "foco", "interior"], "a119": ["oscuro", "foco"], "b13": ["oscuro", "foco", "interior", "rojo"],
 # Rubens
 "b6": ["oscuro", "desnudo", "dinamico", "multitud"], "b7": ["oscuro", "rojo", "dinamico", "desnudo"],
 "a190": ["desnudo", "rosa", "rojo", "dinamico", "cielo"], "a186": ["desnudo", "rosa", "rojo", "dinamico", "paisaje"],
 "a211": ["desnudo", "rosa", "rojo"],
 # Velázquez
 "a182": ["oscuro", "rojo", "foco"], "a67": ["expresion", "oscuro", "suelta", "rojo"], "a142": ["interior", "gris", "suelta", "foco"],
 "a175": ["multitud", "paisaje", "gris", "suelta"], "a32": ["desnudo", "rojo", "gris", "espaldas"],
 "a78": ["oscuro", "rojo", "retrato", "gris", "suelta"], "a62": ["interior", "gris", "oscuro", "suelta", "mirada"],
 # Rembrandt
 "a171": ["oscuro", "oro", "foco", "expresion", "rojo"], "a72": ["oscuro", "oro", "rojo", "interior"],
 "a25": ["oscuro", "oro", "desnudo", "interior"], "a195": ["oscuro", "oro", "multitud", "foco", "rojo"],
 "a34": ["oscuro", "oro", "diminutas", "foco", "interior"], "a205": ["oscuro", "rojo", "oro", "foco"],
 # Murillo, Vermeer
 "a20": ["oscuro", "rojo", "azul", "dulzura", "desnudo"], "a37": ["retrato", "expresion", "oscuro", "dulzura"],
 "a68": ["oro", "azul", "claro", "difuminado", "dulzura", "desnudo"],
 "a115": ["ventana", "azul", "amarillo", "interior", "claro", "rojo"], "b14": ["paisaje", "agua", "cielo", "claro"],
 "a109": ["oscuro", "azul", "amarillo", "retrato", "mirada"], "a8": ["oscuro", "amarillo", "azul", "interior"],
 "a210": ["ventana", "interior", "azul"], "a218": ["amarillo", "interior", "claro", "azul", "rojo"],
 # Fragonard, David, Goya
 "a16": ["rosa", "verde", "suelta", "sedas", "oscuro"], "a213": ["rojo", "oscuro", "suelta", "interior"], "a47": ["sedas", "interior", "rojo"],
 "a156": ["estatua", "nitido", "rojo", "arquitectura", "oscuro"], "b29": ["estatua", "nitido", "rojo", "oscuro", "interior", "arquitectura"],
 "b30": ["oscuro", "estatua", "nitido"], "b3": ["desnudo", "verde", "oscuro"],
 "a161": ["oscuro", "noche", "foco", "multitud", "suelta", "rojo"], "b2": ["oscuro", "suelta", "expresion"],
 # Friedrich, Delacroix, Aivazovski
 "b33": ["paisaje", "mar", "cielo", "diminutas", "difuminado"], "b31": ["espaldas", "paisaje", "difuminado", "claro", "cielo"],
 "b32": ["nieve", "paisaje", "claro", "cielo"], "b28": ["rojo", "desnudo", "multitud", "dinamico", "suelta", "oscuro"],
 "a130": ["rojo", "azul", "multitud", "dinamico", "suelta", "desnudo"], "a240": ["retrato", "suelta", "oscuro", "mirada"],
 "a116": ["mar", "cielo", "oro", "verde", "claro", "barcos"], "a217": ["mar", "verde", "cielo", "barcos"],
 "a232": ["mar", "verde", "cielo", "barcos", "oscuro"], "a239": ["mar", "verde", "cielo", "barcos", "oscuro"],
 # Shishkin, Repin, Levitán
 "a98": ["paisaje", "arboles", "claro", "cielo", "oro"], "a28": ["paisaje", "arboles", "claro", "agua"],
 "a70": ["paisaje", "arboles", "difuminado"], "a222": ["paisaje", "arboles", "claro", "cielo"], "a49": ["paisaje", "arboles", "claro", "agua"],
 "a87": ["multitud", "claro", "expresion", "paisaje", "barcos", "rojo"], "a180": ["oscuro", "multitud", "oro"],
 "a11": ["multitud", "expresion", "interior", "rojo", "oscuro"], "a143": ["multitud", "expresion", "rojo"], "a73": ["multitud", "claro", "paisaje", "rojo"],
 "a15": ["multitud", "interior", "oscuro", "noche", "expresion", "rojo"], "a3": ["rojo", "interior", "oscuro", "expresion"],
 "a176": ["interior", "claro", "ventana", "expresion", "negro"], "a228": ["claro", "cielo", "suelta"],
 "a101": ["paisaje", "cielo", "agua", "claro"], "a123": ["nieve", "claro", "suelta", "arboles"],
 "a173": ["paisaje", "arboles", "amarillo", "agua", "claro", "suelta", "cielo"], "a230": ["paisaje", "arboles", "agua", "claro", "cielo"],
 # Manet, Monet, Degas, Renoir
 "a58": ["desnudo", "mirada", "plano", "negro", "paisaje"], "b19": ["desnudo", "mirada", "plano", "oscuro", "negro"],
 "a196": ["mirada", "interior", "noche", "plano", "negro", "multitud", "rojo"],
 "a223": ["suelta", "claro", "verde", "paisaje"], "b17": ["nieve", "suelta", "claro"], "a204": ["difuminado", "agua", "suelta", "barcos", "cielo"],
 "b16": ["suelta", "cielo", "claro"], "a212": ["suelta", "rojo", "paisaje", "claro"], "a216": ["verde", "suelta", "agua", "paisaje"],
 "a229": ["difuminado", "agua", "rosa"],
 "a233": ["baile", "interior", "verde", "cortado", "multitud", "espaldas", "rojo"], "b18": ["interior", "cortado", "negro"],
 "a192": ["baile", "cortado", "interior"], "a226": ["baile", "cortado", "interior", "suelta"], "a1": ["baile", "azul", "suelta", "cortado"],
 "a7": ["claro", "paisaje"], "a134": ["paisaje", "agua", "suelta", "claro"], "a140": ["multitud", "suelta", "claro", "rosa"],
 "a179": ["retrato", "rosa", "suelta", "mirada"], "a148": ["multitud", "claro", "rosa", "suelta", "rojo"], "a136": ["multitud", "gris", "azul", "rosa"],
 "a194": ["rojo", "rosa", "retrato", "claro", "suelta"], "a36": ["desnudo", "rosa", "claro", "nitido"], "a60": ["interior", "rosa", "claro", "suelta", "rojo"],
 # Gauguin, Van Gogh, Toulouse-Lautrec, Munch, Klimt
 "a221": ["plano", "rojo", "verde", "interior", "noche"], "b23": ["rojo", "plano", "multitud"], "b22": ["amarillo", "plano", "paisaje"],
 "a19": ["amarillo", "azul", "plano", "multitud", "paisaje"],
 "b15": ["oscuro", "interior", "noche", "grueso", "expresion"], "a117": ["amarillo", "grueso"], "a215": ["noche", "amarillo", "azul", "grueso", "oscuro"],
 "a164": ["azul", "verde", "grueso"], "a167": ["azul", "amarillo", "grueso", "noche", "ondulante", "oscuro"],
 "a203": ["retrato", "rojo", "grueso", "verde", "mirada"], "a208": ["grueso", "ondulante", "azul", "amarillo", "paisaje", "claro"],
 "b27": ["espaldas", "lineas", "interior", "suelta"], "a76": ["lineas", "interior", "multitud", "verde"],
 "b26": ["noche", "interior", "verde", "lineas", "multitud", "oscuro"],
 "b36": ["interior", "retrato", "suelta"], "a112": ["ondulante", "rojo", "expresion"], "a42": ["ondulante", "desnudo", "oscuro"],
 "b37": ["oro", "mosaico", "retrato", "desnudo"], "a50": ["oro", "mosaico", "retrato"], "a97": ["oro", "mosaico"],
 # Invitados
 "a135": ["multitud", "oscuro", "nitido", "desnudo"], "a200": ["desnudo", "claro", "nitido", "mar"], "a6": ["desnudo", "claro", "nitido"],
 "b1": ["multitud", "azul", "desnudo"], "a65": ["multitud", "paisaje", "arboles", "azul", "rojo", "desnudo"], "a185": ["desnudo", "interior", "difuminado", "oscuro"],
 "a22": ["interior", "verde", "rojo", "nitido", "ventana"], "b8": ["rojo", "interior", "arquitectura", "paisaje", "nitido", "azul"],
 "a63": ["rosa", "sedas", "dinamico", "oscuro", "desnudo", "rojo"], "a197": ["paisaje", "arboles", "cielo", "diminutas"],
 "a14": ["oro", "mar", "barcos", "arquitectura", "cielo", "claro", "rojo"],
 "a177": ["desnudo", "rosa", "azul", "claro"], "a48": ["desnudo", "rosa", "azul", "claro"], "a85": ["interior", "multitud", "expresion", "oscuro"],
 "a94": ["interior", "expresion", "oscuro"], "a71": ["nitido", "claro", "interior"], "a102": ["retrato", "azul", "suelta", "oscuro", "mirada"],
 "a30": ["retrato", "paisaje", "mirada", "nitido"], "a187": ["desnudo", "azul", "nitido", "oscuro", "espaldas"],
 "b35": ["difuminado", "oro", "mar", "barcos", "cielo"], "b34": ["difuminado", "suelta", "paisaje"],
 "a149": ["retrato", "verde", "rojo", "nitido", "oscuro"], "a113": ["multitud", "rojo", "dinamico", "oscuro", "expresion", "desnudo"],
 "a80": ["nitido", "rosa", "arquitectura"], "a219": ["retrato", "rojo", "oscuro", "mirada", "suelta", "negro"],
 "a69": ["oscuro", "multitud", "desnudo", "dinamico", "mar"], "a166": ["paisaje", "arboles", "cielo", "claro", "arquitectura"],
 "a165": ["oscuro", "nitido", "rojo", "interior", "arquitectura"], "a145": ["multitud", "paisaje", "claro", "desnudo", "nitido", "rojo"],
 "a170": ["retrato", "mirada", "nitido", "interior", "oscuro"], "a90": ["retrato", "rosa", "nitido", "interior", "oscuro"],
 "a137": ["interior", "multitud", "oscuro", "desnudo"], "a174": ["paisaje", "arboles", "agua"],
 "a191": ["noche", "oscuro", "paisaje", "foco"], "a17": ["paisaje", "arboles", "verde", "claro"],
 "a181": ["noche", "oscuro", "foco", "agua", "paisaje"], "a128": ["paisaje", "cielo"], "a152": ["paisaje", "cielo", "rojo"],
 "a13": ["paisaje", "arboles", "agua", "oscuro"], "a51": ["paisaje", "cielo", "claro"], "a40": ["oscuro", "oro", "cielo", "rojo"],
 "a199": ["oscuro", "arboles", "paisaje"], "a150": ["retrato", "oro", "interior", "nitido", "oscuro"], "a111": ["paisaje", "agua", "cielo", "claro"],
 "a106": ["paisaje", "arboles", "claro"], "a131": ["paisaje", "verde", "claro", "arquitectura"],
 "a9": ["paisaje", "claro", "cielo", "arquitectura", "verde"], "a55": ["multitud", "arquitectura", "expresion", "rojo"],
 "a100": ["multitud", "nieve", "expresion"], "a27": ["multitud", "nieve", "dinamico", "rojo"], "a29": ["multitud", "agua", "dinamico", "rojo"],
 "a172": ["multitud", "nieve", "dinamico"], "a44": ["multitud", "expresion", "rojo"], "a38": ["nieve", "expresion"],
 "a5": ["interior", "expresion", "rojo"], "a159": ["paisaje", "arboles", "oscuro"], "a92": ["paisaje", "expresion", "rojo"],
 "a24": ["paisaje", "cielo", "nitido"], "a139": ["multitud", "arquitectura", "claro", "rojo"], "a129": ["multitud", "interior", "oro", "oscuro", "rojo"],
 "a133": ["interior", "oscuro", "foco", "noche"], "a83": ["nieve", "arboles", "cielo"], "a141": ["retrato", "mirada", "nitido", "negro"],
 "a0": ["interior", "expresion", "nitido", "rojo"], "a81": ["paisaje", "claro", "cielo"], "a103": ["paisaje", "claro", "cielo", "nitido", "rojo"],
 "a193": ["paisaje", "claro", "cielo", "nitido", "rojo"], "a74": ["paisaje", "claro", "cielo", "nitido"],
 "a118": ["rosa", "ventana", "interior", "claro", "mirada", "suelta"], "b20": ["bloques", "interior", "oscuro"],
 "b21": ["bloques", "desnudo", "azul", "paisaje", "triangulo"], "b24": ["puntos", "multitud", "claro", "verde", "rojo"],
 "b25": ["puntos", "claro", "agua", "rojo"], "a110": ["plano", "noche", "nitido", "oscuro"], "a163": ["bloques", "azul", "cielo"],
 "a88": ["paisaje", "claro", "nitido"], "a41": ["plano", "rojo", "azul", "verde", "desnudo"], "a132": ["plano", "interior", "rojo"],
 "a96": ["rojo", "plano", "desnudo", "azul"], "a105": ["plano", "claro", "rojo"], "a126": ["plano", "oscuro"],
}

# Segunda pista propia (texto, fuente): sale al repetir el fallo del mismo cuadro en la ronda.
LOOK2 = {
 "a147": ("Mira al jinete solo ante el río, con el bosque detrás y la armadura labrada",
          "Wikipedia ES, «Carlos V a caballo en Mühlberg»"),
 "a62": ("Mira la puerta abierta del fondo, un segundo foco de luz tras la penumbra",
         "Wikipedia ES, «Las meninas»"),
 "a115": ("Mira cómo la luz se posa en el pan y la cesta en cientos de puntitos de color",
          "Rijksmuseum, ficha «The Milkmaid» (SK-A-2344)"),
 "a195": ("Mira cómo la luz destaca solo unos detalles: la mano del capitán y la niña",
          "Rijksmuseum, ficha «The Night Watch» (SK-C-5)"),
 "a112": ("Mira el cielo de rojo intenso sobre el fiordo y los colores irreales",
          "Nasjonalmuseet, ficha «The Scream» (NG.M.00939)"),
}

# Fuente de la primera pista, cuando la hay (si no, la pista no cuenta como verificada).
LOOK_SOURCE = {
 "a182": "Wikipedia ES, «Adoración de los Reyes Magos (Velázquez)»",
 "a236": "Wikipedia ES, «Muchacho encendiendo una candela»",
}

# Tipo de cuadro cuando no es el típico (véase el esquema de arriba). Solo con fuente.
KIND = {
 "a182": "atipico",  # Velázquez a los 20 años: luz de noche y modelos cercanos, sin grises ni manchas
 "a236": "atipico",  # El Greco en Roma: la vela ilumina la cara, el fondo queda a oscuras
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
