# Propuesta: grandes maestros, maestros e invitados (24/11/2026)

Para que María la revise. **No cambia nada todavía**: ni el proceso de catálogo ni la app.
Concreta el punto 16 del traspaso («no es lo mismo un pintor que otro»).

## Resumen

- **13 grandes maestros**, **42 maestros**, **93 invitados** (los 148 pintores del catálogo).
- Cada pintor tiene su **nivel básico** y **0 a n niveles «a fondo»**.
- Los niveles «a fondo» siguen **las etapas que fijan los historiadores** para ese pintor.
  Cada etapa con fuente. Un nivel necesita **5 obras nuevas** como mínimo.
- **Camino común: 55 etapas** (hoy saldrían ~100).
- **160 niveles «a fondo»** y **1.547 obras** en total, o **1.192** en una primera fase.
- **417 obras de españoles** (27 %); 357 en la primera fase (30 %).

## Cómo se ha hecho

**Etapas.** Para cada pintor se toma la división de su artículo en Wikipedia en español
(secciones con años, que citan bibliografía) o de la fuente que se indica. No se corta por
años ni por número de obras. Si una etapa no llega a 5 obras, se dice y se decide a mano
si se une a la contigua y por qué.

**Candidatas.** Son las obras de `pipeline/out/candidates/` que pasan los filtros del proceso:
pintura, imagen ≥ 1.200 px, un solo autor, anterior a 1930, sin duplicados. Solo hay datos de
imagen de las 80 más famosas de cada pintor (más las forzadas).

- **Cand.**: candidatas aptas en ese tramo de años.
- **Wikidata**: todas las pinturas fechadas del pintor en ese tramo, sin mirar la imagen. Es el
  techo si se amplían las candidatas.

**Año de cada obra.** El de Wikidata, con mes si lo tiene. Las fechas dudosas se revisan a mano
al seleccionar (p. ej. la *Adoración de los Magos* de Leonardo, c. 1481-1482, es aún de Florencia).

**Tamaños.** Nivel básico: 8 obras (grandes maestros), 7 (maestros), 3 (invitados; 4 los españoles).
Cada «a fondo»: 6 obras (grandes maestros) o 5 (maestros e invitados).

**Aviso de fuentes.** Las páginas se leyeron con una herramienta que trae unos 40.000 caracteres
literales; el resto, resumido. Los títulos de sección y sus años son literales. Donde la etapa sale
del resumen lo marco con «(verificar)». Antes de escribir fichas, contrastar con museo o monografía.

---

## 1. Grandes maestros (13)

**Criterio:** peso histórico, fama (sitelinks), obra en museos españoles, una o dos figuras por
época y sesgo español (5 de 13).

| Pintor | Época | Por qué | A fondo |
|---|---|---|---|
| Leonardo | Renacimiento | El más famoso del catálogo (Gioconda: 146 sitelinks) | 1 |
| Rafael | Renacimiento | Cima del Alto Renacimiento; 8 candidatas en España | 4 |
| Tiziano | Renacimiento | Venecia; pintor de Carlos V y Felipe II; 14 candidatas en España | 4 |
| El Greco | Manierismo | Español; 33 candidatas en España | 3 |
| Caravaggio | Barroco | Inventa el claroscuro barroco; 63 candidatas | 3 |
| Rubens | Barroco | Flandes; 17 candidatas en España | 4 |
| Rembrandt | Barroco | Holanda; 71 candidatas | 4 |
| Velázquez | Barroco | Español; 41 candidatas en España | 4 |
| Murillo | Barroco | Español; 24 candidatas en España (ver dudas) | 4 |
| Goya | Romanticismo | Español; 45 candidatas en España | 5 |
| Monet | Impresionismo | Da nombre al movimiento | 4 |
| Sorolla | Impresionismo | Español; luminismo; 30 candidatas en España | 3 |
| Van Gogh | Postimpresionismo | Segundo más famoso (443 sitelinks en sus 10 primeras) | 5 |

**Quiénes se quedan fuera y por qué**
- **Vermeer**: las candidatas darían 3 «a fondo» (tiene 33 de unas 35 obras), pero su
  periodización solo está en el resumen de Wikipedia. Queda como maestro con 3 «a fondo».
- **Bruegel, Botticelli, Manet, Durero**: mucha fama, pero sin etapas claras con fuente o con
  menos peso que los elegidos. Maestros.
- **Leonardo** solo da para **1 «a fondo»**: hay unas 16 pinturas suyas. Lo limita la historia.
  Sigue como gran maestro por peso, pero ver dudas.
- **Picasso** no entra: murió en 1973.

**Cómo leer cada ficha.** Nivel 1 = el del camino común (obligatorio). Los «a fondo» se abren al
hacer el nivel 1 y son voluntarios. «Límite» dice si el número lo pone la historia (no hay más
etapas) o las candidatas (faltan obras).

### Velázquez · 4 a fondo · límite: historia
Fuente: [Wikipedia, «Reseña biográfica»](https://es.wikipedia.org/wiki/Diego_Vel%C3%A1zquez).
Las dos estancias en Italia van con su tramo: la primera cierra la etapa de corte joven
(*La fragua*, *La túnica de José*, 1630); la segunda abre la «última década», que según la
fuente «se inauguró» con *Inocencio X*.

| Nivel | Años | Cand. | Obras |
|---|---|---|---|
| 1 Icónicas | — | 8 | Las Meninas (1656), La rendición de Breda (c. 1634-1635), Vieja friendo huevos (1618) |
| 2 Sevilla | hasta 1622 | 13 | Tres músicos (c. 1618), Adoración de los Magos (1619), Cristo en casa de Marta y María (c. 1618) |
| 3 Corte joven y 1.er viaje a Italia | 1623-1631 | 12 | La túnica de José (1630), Demócrito (1628), Vista del jardín de la Villa Médicis (c. 1630) |
| 4 Madurez en Madrid | 1631-1648 | 29 | Cristo crucificado (c. 1632), Pablo de Valladolid (c. 1632-1635), El príncipe Baltasar Carlos a caballo (c. 1634) |
| 5 2.º viaje a Italia y última década | 1649-1660 | 12 | Juan de Pareja (c. 1650), La infanta Margarita en azul (1659), La reina Mariana de Austria (c. 1652) |

### Goya · 5 a fondo · límite: candidatas
Fuente: [Wikipedia, 8 secciones con años](https://es.wikipedia.org/wiki/Francisco_de_Goya).
- Zaragoza (3 cand., 18 en Wikidata) se une a los cartones: es su arranque.
- Restauración (1 cand., 26 en Wikidata) y Burdeos (1; 5 en Wikidata) se unen a las pinturas
  negras. Las pinturas negras (1819-1823) van con «Trienio y pinturas negras».
- Con más candidatas, la Restauración y Zaragoza podrían ser niveles propios (hasta 7).

| Nivel | Años | Cand. | Obras |
|---|---|---|---|
| 1 Icónicas | — | 8 | El tres de mayo (1814), La maja desnuda (c. 1790-1800), Saturno (c. 1819-1820) |
| 2 Formación y cartones | 1763-1792 | 19 | La gallina ciega (1788), El quitasol (c. 1777), La familia del infante don Luis (1783-1784) |
| 3 Década de los noventa | 1790-1799 | 13 | Vuelo de brujas (c. 1797-1798), La Verdad, el Tiempo y la Historia (1797), La Tirana (1799) |
| 4 Albores del XIX | 1800-1807 | 8 | La condesa de Chinchón (1800), Isabel de Porcel (c. 1800), Marquesa de Santa Cruz (1805) |
| 5 Los desastres de la guerra | 1808-1814 | 8 | El entierro de la sardina (1814), Casa de locos (1814), La aguadora (1808) |
| 6 Restauración, Quinta del Sordo y Burdeos | 1815-1828 | 18 | Duelo a garrotazos (1820), Átropos (c. 1819-1820), La lechera de Burdeos (c. 1827) |

### El Greco · 3 a fondo · límite: historia y candidatas
Fuente: [Wikipedia, «Biografía»](https://es.wikipedia.org/wiki/El_Greco) (Creta, Venecia, Roma;
en Toledo: llegada, madurez, último periodo). Atribuye a Cossío «dos etapas italianas y tres
españolas» (verificar).
- Creta (2) y Venecia (2) no llegan a 5: van con Roma como «antes de España».
- Llegada a Toledo (4 nuevas) se une a la madurez.
- Con más candidatas (Venecia y llegada tienen 18 cada una en Wikidata) podrían ser 5.

| Nivel | Años | Cand. | Obras |
|---|---|---|---|
| 1 Icónicas | — | 8 | El entierro del conde de Orgaz (1586), Vista de Toledo (1596), El expolio (c. 1578) |
| 2 Creta, Venecia y Roma | hasta 1576 | 9 | Tránsito de la Virgen (1565), Retrato de Giulio Clovio (1571), Muchacho encendiendo una candela (c. 1570-1571) |
| 3 Llegada y madurez en Toledo | 1577-1596 | 20 | La Trinidad (1577), San Pedro y San Pablo (1595), Autorretrato (1595) |
| 4 Último periodo | 1596-1614 | 30 | Adoración de los pastores (1612), Fray Hortensio Paravicino (1609), Concierto de ángeles (c. 1600) |

### Murillo · 4 a fondo · límite: candidatas
Fuente: [Wikipedia, secciones con años](https://es.wikipedia.org/wiki/Bartolom%C3%A9_Esteban_Murillo).
La división clásica en estilo «frío, cálido y vaporoso» **no está** en ese artículo (solo cita a
Mengs con dos estilos). Si María la prefiere, hace falta otra fuente (Prado o monografía).
- Formación (4) y peste (4 nuevas) se unen: la fuente las enlaza (el naturalismo de los primeros
  encargos sigue tras la peste).
- Con más candidatas (16 en Wikidata para 1649-1655) podrían ser 5.

| Nivel | Años | Cand. | Obras |
|---|---|---|---|
| 1 Icónicas | — | 8 | Niños comiendo uvas y melón (1650), Sagrada Familia del pajarito (c. 1650), Inmaculada de Soult (c. 1660) |
| 2 Primeros encargos y años de la peste | hasta 1655 | 11 | La cocina de los ángeles (1646), Inmaculada Esquilache (c. 1645), Adoración de los pastores (c. 1650) |
| 3 Pleno barroco y plenitud | 1655-1661 | 10 | Rebeca y Eliezer (c. 1660), Inmaculada de El Escorial (c. 1660), Mater Dolorosa (c. 1660) |
| 4 Los grandes encargos | 1662-1672 | 17 | San Francisco abrazando a Cristo (c. 1668), Virgen de la servilleta (c. 1668), Descanso en la huida a Egipto (c. 1665) |
| 5 Últimos trabajos | 1673-1682 | 8 | Inmaculada de Aranjuez (c. 1675), Martirio de san Andrés (1675), Santo Tomás de Villanueva (c. 1675) |

### Sorolla · 3 a fondo · límite: candidatas
Fuente: [Wikipedia, «Obra»: cuatro etapas con años](https://es.wikipedia.org/wiki/Joaqu%C3%ADn_Sorolla).
- Formación (2 cand., 19 en Wikidata) se une a la consolidación.
- La etapa final llega justa (5) y con obras poco conocidas: conviene ampliar (69 en Wikidata).

| Nivel | Años | Cand. | Obras |
|---|---|---|---|
| 1 Icónicas | — | 8 | Paseo a orillas del mar (1909), ¡Triste herencia! (1898), Y aún dicen que el pescado es caro (1894) |
| 2 Formación y consolidación | 1863-1899 | 19 | Cosiendo la vela (1896), El beso de la reliquia (1893), Una investigación (1897) |
| 3 Culminación | 1900-1910 | 29 | El baño (1905), Madre (1900), El baño del caballo (1909) |
| 4 Etapa final | 1911-1920 | 5 | Saltando a la comba, La Granja (1911), Jardín de la casa Sorolla (1920), Alfonso XIII con uniforme de húsares (1917) |

### Leonardo · 1 a fondo · límite: historia
Fuente: [Wikipedia, «Biografía» y «Pintura»](https://es.wikipedia.org/wiki/Leonardo_da_Vinci).
Cuatro tramos (Florencia; Milán, 1482-1500; Venecia y Florencia, 1501-1508; Milán, Roma y Francia),
pero solo hay 16 candidatas. Las de los tres últimos tramos caben en el nivel 1.

| Nivel | Años | Cand. | Obras |
|---|---|---|---|
| 1 Icónicas | — | 8 | La Gioconda (c. 1503), La última cena (c. 1490), La dama del armiño (c. 1490) |
| 2 Primeras obras en Florencia | hasta 1482 | 6 | Anunciación (c. 1472), Virgen del clavel (c. 1475), San Jerónimo (c. 1480) |

### Rafael · 4 a fondo · límite: historia
Fuente: [Wikipedia](https://es.wikipedia.org/wiki/Rafael_Sanzio), que recoge las «tres fases» de
Vasari (Umbría, Florencia 1504-1508, Roma) y da sección propia a las Estancias (1509-1513).
Roma se parte en dos: Estancias y últimos años (*La Transfiguración*, *El Pasmo de Sicilia*).

| Nivel | Años | Cand. | Obras |
|---|---|---|---|
| 1 Icónicas | — | 8 | La escuela de Atenas (1512), Madonna Sixtina (c. 1512), Los desposorios de la Virgen (1504) |
| 2 Primeros años en Umbría | hasta 1504 | 9 | Crucifixión Mond (c. 1502), San Sebastián (c. 1501), Virgen Solly (c. 1500-1501) |
| 3 Periodo florentino | 1504-1508 | 26 | El sueño del caballero (c. 1504), La bella jardinera (1507), Virgen del prado (c. 1505) |
| 4 Las Estancias vaticanas | 1509-1513 | 15 | Virgen de la silla (c. 1513), Virgen del pez (c. 1513), Retrato de cardenal (c. 1510) |
| 5 Últimos años en Roma | 1514-1520 | 13 | León X y dos cardenales (c. 1518), Baltasar Castiglione (1515), El Pasmo de Sicilia (c. 1515) |

### Tiziano · 4 a fondo · límite: historia
Fuente: [Wikipedia, secciones con años](https://es.wikipedia.org/wiki/Tiziano).

| Nivel | Años | Cand. | Obras |
|---|---|---|---|
| 1 Icónicas | — | 8 | Venus de Urbino (1538), Carlos V en Mühlberg (1548), Amor sacro y amor profano (c. 1514) |
| 2 Primeros años | hasta 1516 | 19 | La Schiavona (c. 1510), Noli me tangere (c. 1514), Violante (c. 1515) |
| 3 Madurez | 1516-1530 | 9 | La bacanal de los andrios (c. 1523), El tributo de la moneda (c. 1516), Ofrenda a Venus (1518) |
| 4 Consolidación | 1530-1550 | 21 | Paulo III y sus nietos (c. 1546), La bella (c. 1537), Isabel de Este (c. 1535) |
| 5 Años finales | 1550-1576 | 19 | Venus del espejo (c. 1555), Tarquinio y Lucrecia (c. 1571), Desollamiento de Marsias (c. 1573) |

### Caravaggio · 3 a fondo · límite: historia
Fuente: [Wikipedia, «Biografía»](https://es.wikipedia.org/wiki/Caravaggio). De Milán (1571-1592)
no hay obra conservada entre las candidatas.

| Nivel | Años | Cand. | Obras |
|---|---|---|---|
| 1 Icónicas | — | 8 | La vocación de san Mateo (1600), Judit y Holofernes (c. 1598-1599), La decapitación de san Juan (1608) |
| 2 Roma | 1592-1600 | 15 | La buenaventura (c. 1594), Los jugadores de cartas (c. 1596), Los músicos (c. 1595) |
| 3 El pintor más famoso de Roma | 1600-1606 | 27 | David con la cabeza de Goliat (1605), Crucifixión de san Pedro (1600), Martirio de san Mateo (1600) |
| 4 Exilio | 1606-1610 | 18 | Madonna del Rosario (1607), San Jerónimo escribiendo (c. 1607), Siete obras de misericordia (c. 1600-1607) |

### Rubens · 4 a fondo · límite: historia
Fuente: [Wikipedia, «Biografía», cinco secciones](https://es.wikipedia.org/wiki/Pedro_Pablo_Rubens).
«Primeros años» no tiene obras entre las candidatas.

| Nivel | Años | Cand. | Obras |
|---|---|---|---|
| 1 Icónicas | — | 8 | La elevación de la cruz (c. 1609-1610), Rapto de las hijas de Leucipo (c. 1618), Las tres Gracias (c. 1630) |
| 2 Italia | 1600-1608 | 9 | Susana y los viejos (c. 1606), Brígida Spinola-Doria (1606), Transfiguración (1605) |
| 3 Amberes | 1608-1621 | 24 | Cabeza de Medusa (1618), La caza del hipopótamo (c. 1615-1616), Los cuatro filósofos (1611) |
| 4 María de Médici y misiones diplomáticas | 1621-1630 | 8 | Asunción de la Virgen (1626), Retrato de Susanna Lunden (1622), Desembarco de María de Médici (c. 1622) |
| 5 Última década | 1630-1640 | 21 | El jardín del amor (c. 1630-1632), El rapto de Ganímedes (c. 1637), El nacimiento de la Vía Láctea (c. 1636-1637) |

### Rembrandt · 4 a fondo · límite: historia
Fuente: [Wikipedia, «Períodos, temas y estilo»](https://es.wikipedia.org/wiki/Rembrandt), que cita
a Van de Wetering.

| Nivel | Años | Cand. | Obras |
|---|---|---|---|
| 1 Icónicas | — | 8 | La ronda de noche (1642), Lección de anatomía del doctor Tulp (1632), La novia judía (c. 1667) |
| 2 Leiden | 1625-1631 | 13 | El profeta Balaam y su burra (1626), Jeremías prevé la destrucción de Jerusalén (1630), Andrómeda (1630) |
| 3 Primer periodo en Ámsterdam | 1632-1636 | 12 | El rapto de Europa (1632), Flora (1634), El hijo pródigo en la taberna (c. 1635) |
| 4 Segundo periodo en Ámsterdam | 1636-1650 | 17 | El cegamiento de Sansón (1636), Cristo y la adúltera (1644), Autorretrato (1640) |
| 5 Periodo tardío | 1650-1669 | 29 | Los síndicos de los pañeros (1662), Moisés rompiendo las Tablas de la Ley (1659), Betsabé (1654) |

### Monet · 4 a fondo · límite: candidatas
Fuente: [Wikipedia, «Vida» y «Series»](https://es.wikipedia.org/wiki/Claude_Monet). Formación y
Salón van juntos: la fuente los separa sin años y son seguidos. Las series (almiares, catedral de Ruan,
Londres) apenas están entre las candidatas: Wikidata reparte la fama entre versiones. Hay 379
pinturas en Wikidata solo para Giverny. Ampliando, las series serían un 5.º nivel.

| Nivel | Años | Cand. | Obras |
|---|---|---|---|
| 1 Icónicas | — | 8 | Impresión, sol naciente (1872), Mujer con sombrilla (1875), La urraca (1868) |
| 2 Formación y Salón | hasta 1870 | 14 | Camille (1866), Un carro en la carretera nevada en Honfleur (c. 1865-1867), La playa de Sainte-Adresse (1867) |
| 3 Exposiciones impresionistas | 1871-1882 | 28 | Regatas en Argenteuil (1872), Campo de amapolas cerca de Argenteuil (1873), El almuerzo (c. 1873) |
| 4 Giverny | 1883-1899 | 13 | En barca por el Epte (1890), Étretat, mar agitado (1883), Rocas de Belle-Île (1886) |
| 5 Últimos años y nenúfares | 1900-1926 | 7 | San Giorgio Maggiore al anochecer (1908), El Gran Canal (1908), Nenúfares (1919) |

### Van Gogh · 5 a fondo · límite: historia
Fuente: [Wikipedia, «Pintura: aprendizaje» y «Últimos tiempos»](https://es.wikipedia.org/wiki/Vincent_van_Gogh)
(Etten, La Haya, Nuenen; Amberes y París; Arlés; Saint-Rémy; Auvers). La web del Museo Van Gogh
dio error. Las obras fechadas solo por año (1889, 1890) se reparten a mano entre lugares.
*Los girasoles* va al nivel 1 a mano (su fama está repartida entre versiones).

| Nivel | Años | Cand. | Obras |
|---|---|---|---|
| 1 Icónicas | — | 8 | La noche estrellada (1889), Los comedores de patatas (1885), Terraza de café por la noche (1888) |
| 2 Países Bajos | 1880-1885 | 7 | Jardín rectoral en Nuenen en primavera (1884), Vista del mar en Scheveningen (1882), Campos de bulbos (1883) |
| 3 Amberes y París | 1886-1888 | 9 | Cráneo con cigarrillo (1886), Agostina Segatori en el café du Tambourin (1887), Un cangrejo de espaldas (1887) |
| 4 Arlés | 1888-1889 | 22 | La casa amarilla (1888), El viñedo rojo (1888), La mousmé (1888) |
| 5 Saint-Rémy | 1889-1890 | 20 | En la puerta de la eternidad (1890), Camino con ciprés y estrella (1890), Almendro en flor (1890) |
| 6 Auvers | 1890 | 12 | Raíces de árbol (1890), Casa blanca por la noche (1890), Paisaje con carro y tren (1890) |

---

## 2. Maestros (42)

Una etapa en el camino común con **7 obras** y **0 a n «a fondo»** de 5 obras.
**Cand.** = candidatas aptas en total. Fuente de etapas: Wikipedia en español (enlace).
«Sin etapas en la fuente»: 1 «a fondo» provisional («más obras de…») hasta encontrar
periodización en museo o monografía.

### Renacimiento
| Pintor | Cand. | A fondo | Niveles y por qué |
|---|---|---|---|
| [Botticelli](https://es.wikipedia.org/wiki/Sandro_Botticelli) | 62 | 1 | Florencia de los Médici. Sin años de etapa en la fuente |
| [Miguel Ángel](https://es.wikipedia.org/wiki/Miguel_%C3%81ngel) | 13 | 0 | Pocas pinturas (Sixtina, Tondo Doni); su peso es de escultor |
| [Berruguete](https://es.wikipedia.org/wiki/Pedro_Berruguete) | 24 | 1 | Español. La fuente da 3 etapas, pero solo hay obra de la castellana (1483-1503) |
| [Veronés](https://es.wikipedia.org/wiki/Paolo_Veronese) | 53 | 1 | Venecia; grandes banquetes. Sin etapas en la fuente |

### Manierismo y Renacimiento del Norte
| Pintor | Cand. | A fondo | Niveles y por qué |
|---|---|---|---|
| [Van Eyck](https://es.wikipedia.org/wiki/Jan_van_Eyck) | 25 | 1 | Inventa el óleo flamenco. Sin etapas con años |
| [El Bosco](https://es.wikipedia.org/wiki/El_Bosco) | 28 | 1 | Clave en el Prado. «No fechó ninguno de sus cuadros» |
| [Durero](https://es.wikipedia.org/wiki/Alberto_Durero) | 60 | 3 | Aprendizaje y 1.er viaje a Italia (hasta 1505) · 2.º viaje a Italia (1505-1507) · Último viaje y últimas obras (1508-1528) |
| [Bruegel](https://es.wikipedia.org/wiki/Pieter_Brueghel_el_Viejo) | 37 | 3 | Primeras composiciones · Estaciones (1565) · Últimos cuadros (verificar: la fuente no da años) |

### Barroco
| Pintor | Cand. | A fondo | Niveles y por qué |
|---|---|---|---|
| [Ribera](https://es.wikipedia.org/wiki/Jos%C3%A9_de_Ribera) | 47 | 2 | Español. Hasta 1639 (los años veinte solo tienen 3) · Década de 1640 y últimos años |
| [Zurbarán](https://es.wikipedia.org/wiki/Francisco_de_Zurbar%C3%A1n) | 58 | 3 | Español. Primera etapa (hasta 1629) · «Década prodigiosa» (1630-1640) · 1641 hasta el final (1641-1658 solo tiene 2) |
| [Vermeer](https://es.wikipedia.org/wiki/Johannes_Vermeer) | 33 | 3 | Primera etapa · Madurez (1662-1666) · Última época (desde 1667) (verificar) |
| [Hals](https://es.wikipedia.org/wiki/Frans_Hals) | 52 | 1 | Retrato holandés suelto y rápido. Sin etapas en la fuente |
| [Van Dyck](https://es.wikipedia.org/wiki/Anton_van_Dyck) | 56 | 3 | Amberes joven · Italia (1621-1627) · Inglaterra (1632-1641) |
| [Artemisia](https://es.wikipedia.org/wiki/Artemisia_Gentileschi) | 37 | 3 | Florencia (1613-1620) · Roma y Venecia (1621-1630) · Nápoles e Inglaterra (desde 1630) |

### Rococó y Neoclasicismo
| Pintor | Cand. | A fondo | Niveles y por qué |
|---|---|---|---|
| [Watteau](https://es.wikipedia.org/wiki/Antoine_Watteau) | 47 | 1 | Inventa la «fiesta galante». Sin etapas en la fuente |
| [Fragonard](https://es.wikipedia.org/wiki/Jean-Honor%C3%A9_Fragonard) | 38 | 1 | Rococó tardío. Sin etapas en la fuente |
| [Meléndez](https://es.wikipedia.org/wiki/Luis_Egidio_Mel%C3%A9ndez) | 55 | 1 | Español; el gran bodegón del XVIII; 41 candidatas en España |
| [David](https://es.wikipedia.org/wiki/Jacques-Louis_David) | 61 | 4 | Primeras obras · Revolución · Directorio y Napoleón · Exilio |
| [Ingres](https://es.wikipedia.org/wiki/Jean-Auguste-Dominique_Ingres) | 52 | 1 | Neoclasicismo del dibujo. Sin etapas con años |

### Romanticismo
| Pintor | Cand. | A fondo | Niveles y por qué |
|---|---|---|---|
| [Friedrich](https://es.wikipedia.org/wiki/Caspar_David_Friedrich) | 67 | 3 | Formación (1801-1814) · Madurez (1815-1823) · 1824-1840 (la fuente no titula esta etapa) |
| [Turner](https://es.wikipedia.org/wiki/J._M._W._Turner) | 33 | 1 | Paisaje de luz. Sin etapas con años |
| [Delacroix](https://es.wikipedia.org/wiki/Eug%C3%A8ne_Delacroix) | 54 | 2 | Primeros años · Viaje a África y encargos oficiales (el viaje de 1832 solo tiene 2) |
| [Federico de Madrazo](https://es.wikipedia.org/wiki/Federico_Madrazo) | 66 | 1 | Español; retrato isabelino; director del Prado. 49 candidatas en España |

### Realismo
| Pintor | Cand. | A fondo | Niveles y por qué |
|---|---|---|---|
| [Courbet](https://es.wikipedia.org/wiki/Gustave_Courbet) | 44 | 2 | «En sus inicios» · Realista «a partir de 1849» (Suiza, con 1, va aquí) |
| [Millet](https://es.wikipedia.org/wiki/Jean-Fran%C3%A7ois_Millet) | 48 | 3 | Juventud y París · Barbizon (1849) · Últimos años |
| [Fortuny](https://es.wikipedia.org/wiki/Mariano_Fortuny) | 41 | 3 | Español. Roma y Marruecos · Éxito · Últimos años |
| [Rosales](https://es.wikipedia.org/wiki/Eduardo_Rosales) | 14 | 1 | Español; pintura de historia. Justo de material |
| [Repin](https://es.wikipedia.org/wiki/Ili%C3%A1_Repin) | 38 | 1 | Cara de la escuela rusa. Sin etapas con años |

### Impresionismo
| Pintor | Cand. | A fondo | Niveles y por qué |
|---|---|---|---|
| [Manet](https://es.wikipedia.org/wiki/%C3%89douard_Manet) | 61 | 1 | Puente entre Velázquez y el impresionismo. Sin etapas en la fuente |
| [Degas](https://es.wikipedia.org/wiki/Edgar_Degas) | 58 | 1 | Bailarinas. Etapas solo en el resumen (verificar) |
| [Renoir](https://es.wikipedia.org/wiki/Pierre-Auguste_Renoir) | 67 | 3 | Juventud · Madurez · «Periodo ingresco» (últimos años en el resumen: un 4.º si se verifica) |
| [Pissarro](https://es.wikipedia.org/wiki/Camille_Pissarro) | 70 | 1 | El patriarca del grupo. Sin etapas en la fuente |
| [Morisot](https://es.wikipedia.org/wiki/Berthe_Morisot) | 46 | 3 | Comienzos (1864-1874) · Maestría e innovación (1875-1883) · Pleno florecimiento (1884-1894) |

### Postimpresionismo
| Pintor | Cand. | A fondo | Niveles y por qué |
|---|---|---|---|
| [Cézanne](https://es.wikipedia.org/wiki/Paul_C%C3%A9zanne) | 74 | 3 | Periodo oscuro e impresionista (1861-1878; el oscuro solo tiene 4) · Madurez (1878-1890) · Final (1890-1905) |
| [Gauguin](https://es.wikipedia.org/wiki/Paul_Gauguin) | 71 | 4 | Francia y Bretaña · 1.ª Tahití · Regreso a Francia · 2.ª Tahití y Marquesas (años en el resumen: verificar) |
| [Seurat](https://es.wikipedia.org/wiki/Georges_Pierre_Seurat) | 52 | 1 | Puntillismo. Sin etapas en la fuente |
| [Toulouse-Lautrec](https://es.wikipedia.org/wiki/Henri_de_Toulouse-Lautrec) | 61 | 1 | Montmartre. Sin etapas en la fuente |

### Simbolismo y vanguardias
| Pintor | Cand. | A fondo | Niveles y por qué |
|---|---|---|---|
| [Klimt](https://es.wikipedia.org/wiki/Gustav_Klimt) | 70 | 3 | Juventud y Secesión (juventud solo tiene 4) · «Etapa dorada» · Vejez |
| [Munch](https://es.wikipedia.org/wiki/Edvard_Munch) | 61 | 3 | Inicios · Berlín y Friso de la vida · Crisis y años finales (solo hasta 1929) |
| [Kandinsky](https://es.wikipedia.org/wiki/Vasili_Kandinski) | 41 | 3 | Metamorfosis · El Jinete Azul (1911-1914) · Rusia y Bauhaus (1914-1929; 2 y 4 por separado) |
| [Juan Gris](https://es.wikipedia.org/wiki/Juan_Gris) | 60 | 1 | Español; cubismo. Sin etapas en la fuente |
| [Romero de Torres](https://es.wikipedia.org/wiki/Julio_Romero_de_Torres) | 27 | 3 | Español. Primera etapa (1900-1908) · Simbolismo (1908-1915) · Madurez (1916-1930), justo 5 y 5 |

**Maestros «a fondo»:** 82 niveles. 21 maestros con varias etapas con fuente; 20 con 1 «a fondo»
provisional; Miguel Ángel con 0.

---

## 3. Invitados (93)

3 obras intercaladas en el avance (4 los españoles). Se enseñan, se preguntan y salen como
distractores. **30 tienen 1 «a fondo»** (su etapa en el «a fondo» de su época, 5 obras): los de
más peso y algunos españoles. El resto, 0. Todos tienen candidatas de sobra para lo previsto.

| Época | Invitados con 1 «a fondo» | Invitados con 0 |
|---|---|---|
| Renacimiento | Giotto, Fra Angelico, Piero della Francesca, Bellini, Mantegna, Giorgione, Correggio, Tintoretto | Juan de Juanes |
| Norte y Manierismo | Van der Weyden, Cranach, Holbein, Sánchez Coello | Morales |
| Barroco | Poussin, Claudio de Lorena, Alonso Cano, Valdés Leal | Ribalta, Maíno, La Tour, Pereda, Carreño, Steen, Claudio Coello |
| Rococó y Neoclasicismo | Tiepolo, Canaletto, Gainsborough, Vicente López | Chardin, Liotard, Boucher, Reynolds, Greuze, Paret, Vigée Le Brun, Borovikovski |
| Romanticismo | Constable, Géricault, Aivazovski | Tropinin, Delaroche, Briulov, Ivánov, Rossetti, Millais |
| Realismo | Corot | Venetsiánov, Fedótov, Bouguereau, Savrásov, Shishkin, Martín Rico, Gisbert, Perov, Homer, Kramskói, Makovski, Raimundo de Madrazo, Kuindzhi, Vereshchagin, Polénov, Pradilla, Súrikov, Vasnetsov, Levitán |
| Impresionismo | Sisley, Caillebotte, Sargent | Whistler, Cassatt, Beruete, Pinazo, Krøyer, Regoyos, Zorn, Serov |
| Postimpresionismo | — | Rousseau, Signac, Mir |
| Simbolismo y vanguardias | Casas, Modigliani, Schiele | Moreau, Waterhouse, Vrúbel, Rusiñol, Nésterov, Hammershøi, Zuloaga, Nonell, Petrov-Vodkin, Malévich |

Los más justos de material: Fedótov (4 candidatas), Gisbert (5), Mir, Vrúbel y Petrov-Vodkin (8).
Para 3-4 obras bastan.

---

## 4. El camino común

Solo el nivel 1 de los grandes maestros y la etapa de los maestros.
**55 etapas** frente a las ~100 del reparto actual (106 pintores con ≥ 4 obras de nivel 1).

| Época | Etapas | Tramos propuestos (en orden) |
|---|---|---|
| Renacimiento | 7 | Florencia y Castilla: **Botticelli**, Berruguete · Alto Renacimiento: Rafael, Leonardo, Miguel Ángel · Venecia: Tiziano, Veronés |
| Norte y Manierismo | 5 | Primitivos flamencos: Van Eyck, El Bosco · Alemania y Flandes: Durero, Bruegel · El Greco |
| Barroco | 11 | Claroscuro: Caravaggio, Artemisia, Ribera, Zurbarán · Pintores de corte: Rubens, Van Dyck, Velázquez · Vida cotidiana: Hals, Rembrandt, Vermeer, Murillo |
| Rococó y Neoclasicismo | 5 | Rococó: Watteau, Fragonard · Bodegón: Meléndez · Neoclasicismo: David, Ingres |
| Romanticismo | 5 | Goya · Paisaje: Friedrich, Turner · Historia: Delacroix, Madrazo |
| Realismo | 5 | Campo: Millet, Courbet · Historia y luz: Rosales, Fortuny, Repin |
| Impresionismo | 7 | Pioneros: Manet, Monet · El grupo: Degas, Renoir, Pissarro, Morisot · Luz mediterránea: Sorolla |
| Postimpresionismo | 5 | Forma y método: Cézanne, Seurat · Color y expresión: Van Gogh, Gauguin, Toulouse-Lautrec |
| Simbolismo y vanguardias | 5 | Simbolismo: Klimt, Munch, Romero de Torres · Vanguardias: Kandinsky, Juan Gris |

- **Abre Botticelli**, no Leonardo (decisión 6). Rafael va 3.º y Leonardo 4.º.
- Los españoles van **dentro** de cada tramo, nunca en un bloque aparte: hay al menos uno en
  cada época.
- Los invitados se intercalan en el tramo de su época.
- Dentro de cada tramo, el orden va del más distinto al más parecido (para que el «¿Quién?» no
  junte a dos parecidos seguidos), no por fecha.

---

## 5. Rango general

Hoy hay 15 niveles solo por XP (Curioso → Gran maestro). Propuesta: **8 rangos con doble
condición**: XP + niveles «a fondo». El XP sigue contando igual.
Referencia: una etapa da unos 100-130 XP (10 por acierto, más bonus).

| Rango | XP | Además necesita |
|---|---|---|
| Curioso | 0 | — |
| Aficionado | 300 | — |
| Copista | 1.200 | 1 nivel «a fondo» cualquiera |
| Oficial de taller | 3.000 | 1 gran maestro hasta su nivel 2 · 4 «a fondo» en total |
| Conocedor | 6.000 | 3 grandes maestros hasta el nivel 2 · «a fondo» en 3 épocas |
| Conservador | 10.000 | 3 grandes maestros hasta el nivel 3 · 15 «a fondo» |
| Comisario | 16.000 | 1 camino de gran maestro completo · «a fondo» en las 9 épocas · 30 «a fondo» |
| Gran maestro | 25.000 | 5 caminos de gran maestro completos · 60 «a fondo» |

- Sin XP no se sube, aunque se hagan niveles; sin niveles, el XP no basta. Así no se sube
  solo repasando.
- La pantalla dice qué falta: «Te falta 1 nivel a fondo».
- Nunca se baja de rango (la auditoría desaconseja quitar progreso).

---

## 6. Cifras

| | Pintores | Obras | Niveles «a fondo» |
|---|---|---|---|
| Grandes maestros | 13 | 390 | 48 |
| Maestros | 42 | 704 | 82 |
| Invitados | 93 | 453 | 30 |
| **Total** | **148** | **1.547** | **160** |

- **Españoles**: 38 pintores (5 grandes, 9 maestros, 24 invitados) y **417 obras** (27 %).
  Hoy: 336 de 1.180 (28 %).
- **Se pasa del objetivo** (1.200-1.300). Por eso propongo dos fases:
  - **Fase 1: 1.192 obras** (357 de españoles, 30 %). Grandes maestros completos; maestros con su
    1.er «a fondo»; invitados sin «a fondo». 89 niveles «a fondo».
  - **Fase 2: +355 obras**. Resto de «a fondo» de maestros (41) e invitados (30).
- **Ningún pintor se queda corto**: todos tienen candidatas aptas para lo previsto.

**Qué cambiaría en el proceso (solo descrito, no aplicado)**
1. `pipeline/painters.json`: cada pintor con `categoria` (gran-maestro, maestro, invitado) y
   `etapas` (nombre, desde, hasta, fuente, obras). `objetivo` pasa a ser la suma de las etapas.
2. `seleccionar.py`: elegir **por etapa** (cupo por tramo de años) en vez de las N más famosas.
   `level` deja de ser 1|2: 1 = básico, 2…n = «a fondo» k. Nuevo campo `etapa`.
3. Nivel 1 elegido a mano en `ajustes.json` (icónicas como *Los girasoles*, con la fama
   repartida entre versiones).
4. `candidates.py`: pedir datos de imagen de **más de 80 obras** en los pintores que ganan niveles
   con ello: Goya, El Greco, Murillo, Sorolla, Monet (series), Cézanne (periodo oscuro), Munch
   (después de 1908), Renoir y Kandinsky.
5. `excluir.json`: atribuciones dudosas que hoy entran (p. ej. *Milagro de san Donato* y *Cabeza
   de Cristo* como Leonardo).
6. `validate.py`: cada «a fondo» con ≥ 5 obras nuevas; cada etapa con fuente; las reglas de
   siempre (muerte < 1956, obra < 1930).
7. Relanzar `candidates` (los pintores del punto 4) y `seleccionar` → `download` → `fichas` →
   `build` en Actions.

---

## 7. Dudas para María

1. **¿Murillo, gran maestro o maestro?** Da para 4 «a fondo» y suma obra española. Si es
   maestro, se queda en 1-2.
2. **¿Leonardo sigue como gran maestro aunque solo dé para 1 «a fondo»?** (13 obras; no hay más
   pinturas suyas.) ¿Sí, o pasa a maestro?
3. **¿Zurbarán sube a gran maestro?** Tiene 3 «a fondo» con fuente y 19 candidatas en España.
   Serían 14 grandes maestros.
4. **¿Dos fases (1.192 obras y luego +355) o un solo catálogo de 1.547?**
5. **¿Ampliamos candidatas** para que Goya, El Greco, Murillo, Sorolla y Monet ganen 1-2 niveles
   (Goya hasta 7)?
6. **¿Abre el camino Botticelli?**
7. **¿Invitados españoles con 4 obras** (uno más que el resto)?
8. **¿Murillo por secciones de Wikipedia o por «frío, cálido y vaporoso»?** Lo segundo pide otra
   fuente (Prado o monografía).
