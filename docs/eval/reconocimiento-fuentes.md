# Cuántas obras reconoce la gente: datos para calibrar el test de gancho (24/11/2026)

Resumen de una búsqueda con fuentes. Sirve para la curva «sabes más de pintura que el X % de la gente»
del test (`app/test/`). Todo lo de reconocimiento es de Reino Unido y EE. UU.; de España hay hábitos y
preferencias, no reconocimiento. Marcado «supuesto» lo que no tiene dato.

## Datos
| Dato | Población | Fuente |
|---|---|---|
| 95 % identifica la Gioconda; 22 % la Venus del espejo; solo 6 % acierta las 10 obras (Gioconda, Girasoles, Nenúfares, Nacimiento de Venus, Ronda de noche, Hay Wain, Fighting Temeraire, Mujer que llora, Ofelia, Venus del espejo) | YouGov/Channel 5, 2.000 adultos, RU, 2020 | makingamark.blogspot.com/2020/07/good-news-re-great-paintings-of-world.html |
| 22 % no reconoce la Gioconda; 55 % no identifica El grito; 61 % dice no saber nada de arte | Affordable Art Fair, >1.000, RU | scotsman.com/news/uk-news/fifth-britons-have-never-visited-art-gallery-1523019 |
| 24 % no sabe que Los girasoles es de Van Gogh; 60 % califica su conocimiento de «pobre» | Rise Art, 2.000, RU, 2017 | uk.news.yahoo.com/one-six-britons-never-art-gallery-114847877.html |
| 68 % no nombra ningún Picasso; 39 % ningún Van Gogh; 46 % no conoce La joven de la perla; 53 % no conoce La noche estrellada | DS Automobiles/PA, 2.000, RU, 2023 | aol.com/brits-admit-clueless-art-including-114640972.html |
| 82 % no sabe que La joven de la perla es de Vermeer | Meural/YouGov, 1.105, EE. UU., 2016-17 | hyperallergic.com/353756/meural-art-us-survey/ |
| 7 % «muy familiarizado» con movimientos artísticos, 32 % «algo», 58 % poco/nada | YouGov, 1.000, EE. UU., 2023 | docs.cdn.yougov.com/1vukils6cx/Art_poll_results.pdf |
| Fluidez estética (0-2): media 0,55, mediana 0,44, muy asimétrica; fáciles: Van Gogh 1,45, Dalí 1,10, Monet 1,04; difíciles: Richter 0,15, Braque 0,19, Pissarro 0,21, Modigliani 0,23, Sargent y Seurat 0,24 | Cotter et al. 2023, 2.089 adultos | pmc.ncbi.nlm.nih.gov/articles/PMC9907807 |
| Atribución por estilo: estudiantes de arte 78 % (azar 20 %) con obras no vistas de Picasso/Monet/Van Gogh/Dalí/Warhol | Gabora 2010, n = 10 | arxiv.org/pdf/1005.1518 |
| Legos, tras ver 50 Van Goyen, distinguen sus obras al 56 % (azar 50 %) | Poletiek & Olfers 2016, n = 23 | codart.nl/?p=93800 |
| España: 40,6 % visitó un museo el último año; 18,9 % el último trimestre; 7,6 % por profesión/estudios; 14,3 % pinta o dibuja | Ministerio de Cultura, EHPC 2024-25, 16.000 | cultura.gob.es (síntesis 2024-2025) |
| España: Velázquez 71 %, Goya 66 %, El Greco 39 % como favoritos; Las meninas 60 %, Maja desnuda 38 %, Fusilamientos 34 %; 62 % ha visitado el Prado (preferencia, no reconocimiento) | Sondea para el Prado, 3.300, 2019 | diariodeleon.es/cultura/190320/631304 |

No encontrado: encuesta española de reconocimiento de obras; estudio del Prado sobre conocimiento de
pintores; atribución por estilo en población general con varios autores.

## Clasificación (reconocer la obra o su autor, opción múltiple)
- Universales (> 70 %): Gioconda, Girasoles, Creación de Adán, Última cena; en España, Las meninas y
  Guernica (supuesto).
- Conocidas (30-70 %): El grito, Noche estrellada, Joven de la perla, Nenúfares, Nacimiento de Venus,
  Ronda de noche, Maja desnuda, Fusilamientos, Jardín de las delicias.
- De aficionado (< 30 %): Venus del espejo, Ofelia, Hay Wain, autores de segundo nivel (Seurat,
  Pissarro, Modigliani, Sargent; Sorolla fuera de Valencia y Madrid).

## Distribución propuesta para el test (5 tramos × 8; bloques de 4: 3-4 sube, 2 repite, 0-1 para)
T1 iconos universales · T2 conocidas · T3 de aficionado · T4 atribuir obra no icónica a autor de estilo
muy marcado · T5 atribuir a autores de segundo nivel o escuelas próximas (Zurbarán/Ribera/Murillo…).

| Se para en | % población | Base |
|---|---|---|
| T1 | 12 % | 5-22 % no reconoce la Gioconda (dato); punto medio (supuesto) |
| T2 | 35 % | ítems T2 rondan 45-55 % de reconocimiento (dato) |
| T3 | 28 % | 6 % acierta las 10 de YouGov; pasan T3 ≈ visitantes trimestrales de museo 18,9 % (dato); 25 % pasa (supuesto) |
| T4 | 13 % | estudiantes de arte 78 % en estilo marcado; legos ≈ azar (dato); mitad pasa (supuesto) |
| T5 | 12 % | 7 % «muy familiarizado», 7,6 % por profesión (dato); 5-8 aciertos en T5 ≈ 3 % (supuesto) |

Percentil por puntuación acumulada (puntos = aciertos × tramo; máximo honesto 80, el del jugador que
sube con cada bloque y apura el friki; los cortes pensados para 120 se reescalan por 80/120): 0-2 → 1-12 ·
3-9 → 13-47 · 10-22 → 48-75 · 23-33 → 76-88 · 34-46 → 89-92 · 47-63 → 93-96 · 64-80 → 97-99 (interpolar
dentro de cada banda; `app/js/test/resultado.js`). Los cortes vienen de la estructura del test; los
percentiles de cada banda son supuesto.

Advertencias: el formato de opción múltiple es más fácil que nombrar en abierto (Vermeer: 18 % abierto,
54 % de notoriedad); el percentil es frente a la población general, no frente a usuarios de la app, que
se autoseleccionan; recalibrar con datos reales a partir de ~500 usuarios y mostrarlo como estimación.
