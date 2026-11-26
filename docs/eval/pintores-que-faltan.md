# Pintores que faltan — plan (26/11)

## Diagnóstico

- **Faltan del todo** (no están en `pipeline/painters.json`): Masaccio, Filippo Lippi, Paolo Uccello, Perugino,
  Hans Memling, Parmigianino, Bronzino, Pontormo, Arcimboldo, William Hogarth y Henri Matisse. Revisando con
  criterio de historiador, también Matthias Grünewald (Retablo de Isenheim) y dos españoles de primera fila
  (Bartolomé Bermejo y Juan Sánchez Cotán), que encajan con la regla de sobrerrepresentar a los españoles.
- **Están, pero escondidos.** Géricault, Piero della Francesca, Rogier van der Weyden y Holbein son invitados
  con 2-3 obras y sin parada propia: parecen ausentes. Mantegna y Giorgione, igual (se quedan así en esta tanda).
- **El problema de fondo** no es solo quién falta: los invitados tienen 3 obras, así que grandes como Giotto,
  Fra Angelico, Bellini, Tintoretto, Poussin, Chardin o Corot quedan en «Descubre…» con el mismo peso que pintores
  menores. Sus «a fondo» provisionales están en `etapas.json` como fase 2 (ver «Siguiente tanda»).

## Quién entra y dónde

Maestro = parada propia en el camino común (7 obras en el básico + 5 en «Más obras» = 12). Invitado = 3 obras
(4 si es español) + 5 en «Más obras» = 8; va a «Descubre…» o, si tiene alguna obra de fama 3, intercalado en el
camino (lo decide `tools/catalog_from_pipeline.py` por datos).

| Pintor | Categoría | Movimiento · tramo | Obras |
|---|---|---|---|
| Masaccio (1401-1428) | maestro (nuevo) | Renacimiento · Primer Renacimiento | 12 |
| Piero della Francesca | invitado → maestro | Renacimiento · Primer Renacimiento | 12 |
| Rogier van der Weyden | invitado → maestro | Manierismo y Norte · Primitivos flamencos | 12 |
| Holbein el Joven | invitado → maestro | Manierismo y Norte · Alemania y Flandes | 12 |
| Parmigianino (1503-1540) | maestro (nuevo) | Manierismo y Norte · Manierismo (tramo nuevo) | 12 |
| Bronzino (1503-1572) | maestro (nuevo) | Manierismo y Norte · Manierismo | 12 |
| Théodore Géricault | invitado → maestro | Romanticismo · Historia | 12 |
| Henri Matisse (1869-1954, solo obras < 1930) | maestro (nuevo) | Simbolismo y vanguardias · Vanguardias | 12 |
| Paolo Uccello | invitado | Renacimiento | 8 |
| Filippo Lippi | invitado | Renacimiento | 8 |
| Perugino | invitado | Renacimiento | 8 |
| Bartolomé Bermejo | invitado (España) | Renacimiento | 4 |
| Hans Memling | invitado | Manierismo y Norte | 8 |
| Matthias Grünewald | invitado | Manierismo y Norte | 8 |
| Pontormo | invitado | Manierismo y Norte | 8 |
| Arcimboldo | invitado | Manierismo y Norte | 8 |
| Juan Sánchez Cotán | invitado (España) | Barroco | 4 |
| William Hogarth | invitado | Rococó y Neoclasicismo | 8 |

El camino pasa de 56 a 64 paradas. El Manierismo, que hoy solo tiene a El Greco como manierista, gana un tramo
propio con Parmigianino y Bronzino.

`tools/camino.json` propuesto (aplicar **solo después** de que el proceso regenere `catalogo/`; antes rompe el
generador porque esos pintores aún no están en `catalogo/pintores.json`):

- renacimiento: «Florencia y Castilla» → **«Primer Renacimiento»**: masaccio, piero, botticelli, berruguete.
- manierismo-y-norte: Primitivos flamencos: van-eyck, **van-der-weyden**, bosco · Alemania y Flandes: durero,
  **holbein**, bruegel · **Manierismo** (nuevo, antes de El Greco): parmigianino, bronzino.
- romanticismo · Historia: **gericault**, delacroix, madrazo.
- simbolismo-modernismo · Vanguardias: **matisse**, kandinsky, juan-gris.

## ¿Sobra alguien en «Descubre…»?

No propongo borrar a nadie: casi todos se eligieron con María y los españoles están a propósito. Lo que sí
desentona es «Descubre el Realismo» (18 pintores, 9 rusos de segunda fila) y los rusos menores repartidos por
otras épocas (Borovikovski, Tropinin, Ivánov, Venetsiánov, Fedótov, Savrásov, Perov, Makovski, Polénov,
Nésterov, Petrov-Vodkin): son claramente menos relevantes que los que entran ahora. Ya tienen su rama «Escuela
rusa», así que la recomendación es **sacarlos de las «Descubre…»** y dejarlos solo en esa rama (un filtro por
país en `tools/catalog_from_pipeline.py`, función de ramas). Queda para decidir con María; no lo he tocado.

## Hecho en esta rama

- `pipeline/painters.json`: 14 pintores nuevos y 4 que pasan a maestros. QID: solo Matisse (Q5589); el resto va
  con `qid: null` porque desde aquí no hay acceso a Wikidata: el paso `resolve` lo busca por nombre y exige que
  casen nacimiento (±3) y muerte (±2).
- `pipeline/etapas.json`: un «Más obras» provisional (fase 1, con fuente) para cada uno de los 18 (Bermejo y
  Sánchez Cotán sin «a fondo»: tienen poca obra).
- `pipeline/seleccionar.py <pintor …>`: elige solo esos pintores y deja el resto de `catalogo/seleccion.json` tal
  cual (con su fama). Sin esto, un `seleccionar` completo deshace las 18 exclusiones y los niveles a mano del
  24/11 (lo he comprobado: cambiaban obras de Berruguete, Duccio, los Lorenzetti, Simone Martini…). Prueba:
  `tests/seleccionar-parcial.test.js`. `run.sh` pasa los ids al paso.
- `pipeline/RUN`: los pasos listos (ver abajo). Simulado en local sin red para los 4 que suben: 12 obras cada
  uno, solo cambian ellos, `build` + `validate --parcial` con 0 errores.

## Pasos para traer obras e imágenes

1. Fusionar esta rama en `main`. El push de `pipeline/RUN` a `main` lanza solo el workflow **pipeline**
   (`.github/workflows/pipeline.yml`); si ya está en `main`, a mano: `gh workflow run pipeline.yml --ref main`.
   Pasos: `resolve` → `candidates` de los 14 → `seleccionar` de los 18 → `fichas` → `reconciliar` →
   `download 2 150` (unas 170 imágenes nuevas a 1600 px; van a la release con hueco, hoy `catalogo-img-2`) →
   `build` → `validate --parcial` → `pack 1200` (rehace `app-img-1200.zip` + `.sha256` en `catalogo-img`) →
   `validate`. El job hace commit en `main` de `catalogo/`, `pipeline/out`, `pipeline/logs` y `CREDITS.md`.
2. Revisar `pipeline/logs/resolve.txt` (ningún `FALLO`; las fechas de Memling, Grünewald, Bermejo y Perugino son
   aproximadas), `select.txt` (marcas «corto», sobre todo Masaccio) y `select_drops.txt`. Si falta una obra
   clave, añadir su QID a `pipeline/extra.json` y relanzar `candidates <id>` + `seleccionar <ids>` + `fichas` +
   `download` + `build` + `pack 1200`. Obras a vigilar: Masaccio *Trinidad*, *El tributo*, *Expulsión*; Uccello
   *La batalla de San Romano*, *San Jorge y el dragón*; Lippi *Virgen con el Niño y dos ángeles*; Perugino
   *Entrega de las llaves*; Memling *Juicio Final* de Gdansk; Bermejo *Piedad Desplà*, *Santo Domingo de Silos*;
   Grünewald *Retablo de Isenheim*; Parmigianino *Virgen del cuello largo*, *Autorretrato en espejo convexo*;
   Bronzino *Alegoría con Venus y Cupido*, *Leonor de Toledo con su hijo*; Pontormo *Descendimiento*; Arcimboldo
   *Vertumno*, *Las estaciones*; Sánchez Cotán *Bodegón con membrillo, repollo, melón y pepino*; Hogarth
   *Matrimonio a la moda*; Matisse *La danza*, *La alegría de vivir*, *Mujer con sombrero*, *La raya verde*.
3. En local, tras `git pull`: aplicar el `tools/camino.json` de arriba; textos de los nuevos (pista, rasgos y
   parecidos en `tools/catalog_data.py`, historias e importancia, a cargo de quien lleve esos archivos);
   `python3 -I tools/catalog_from_pipeline.py app`; `bash tools/fetch_images.sh <carpeta>` y
   `python3 -I tools/make_atlas.py app <carpeta>`; `python3 -I tools/validate_catalog.py app <carpeta>`;
   `node --test tests/` (actualizar las cifras de `tests/catalogo-grande.test.js`) y e2e.

## Siguiente tanda (propuesta, sin hacer)

- Dar «a fondo» en fase 1 a los invitados grandes que hoy tienen 3 obras: Giotto, Fra Angelico, Bellini,
  Mantegna, Giorgione, Tintoretto, Correggio, Poussin, Claudio de Lorena, Chardin, Canaletto, Corot.
- Imprescindibles que aún faltan: Hugo van der Goes, Ghirlandaio, Annibale Carracci, Guido Reni, Jordaens,
  Ruisdael, Füssli, William Blake, Böcklin, Redon, Bonnard, Klee, Mondrian y Franz Marc (todos muertos antes
  de 1956); españoles: Juan de Flandes, Fernando Gallego, Eugenio Lucas y María Blanchard.
