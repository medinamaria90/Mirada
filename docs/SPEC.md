# Mirada — especificación de trabajo (contrato entre agentes)

Web app para **aprender a reconocer a los grandes pintores de un vistazo**, con mecánicas de
progreso inspiradas en Duolingo (camino, rachas, experiencia, medallas) y diseño propio.
Nombre provisional: **Mirada**. Idioma de la interfaz: **español de España**.

Proyecto experimental de María (tiempo libre). Se construye de menos a más, por oleadas; cada
oleada deja una versión que funciona.

## 1. Idea de producto (validada con la usuaria)

- No es un test: es un **método**. Primero enseña en qué fijarse, luego pregunta.
- Secuencia de cada pintor: **conocer** (2–3 obras + pista "Fíjate en…") → **una de calentamiento**
  con la obra más conocida de las vistas → **cuadros nuevos** (obras del mismo autor que no se han
  mostrado), mezclados con el repaso de pintores anteriores. Solo si no quedan obras sin enseñar se
  vuelve a preguntar otra vista (al final). Acertar una obra nunca vista es el momento de "he
  aprendido". Oleada 8: «Conoce a» enseña 3 obras solo si quedan ≥ 3 preguntables sin enseñar; si no,
  2 (Bruegel, El Greco, Rubens, Shishkin, Monet y Degas pasaron una obra de `learn` a `new`).
  Oleada 9: en cada etapa solo se pregunta UNA obra recién vista (la de calentamiento); el resto de
  preguntas propias son hasta 2 obras no vistas y lo que falte es repaso de pintores anteriores.
  Leonardo (primera impresión) enseña La Gioconda y La dama del armiño (`spoiler`: se enseña, no se
  pregunta) y deja 4 obras sin ver (La última cena pasó a `new`): su ronda son 5 preguntas con 5
  cuadros distintos — calentamiento + 4 no vistas, una de ellas «¿Quién lo pintó?» (nunca la primera
  ni la última) y el resto «¿Cuál es de Leonardo?».
- La dificultad sube **por parecido** (primero pintores muy distintos; después, parecidos).
- Lo fallado **vuelve a salir** (en la misma ronda y, días después, por repetición espaciada).
- Tres tipos de pregunta de base: *¿Quién lo pintó?* · *¿De qué movimiento es?* ·
  *¿Cuál de estos es de X?* (elegir entre 4 miniaturas).
- La **sensación de avanzar** es clave: mapa por movimientos que se desbloquea, medalla por
  pintor dominado, racha de días, experiencia y niveles, colección de obras reconocidas.
- Canal: algo compartible. **Reto diario** igual para todos y **reto a un amigo por enlace**.
- Extras posteriores (no bloquean): cuadro animado del día, duelo en tiempo real, música clásica.
- **Música original por época** y efectos de sonido (ver §5).

## 2. Restricciones de la plataforma donde se publica (artifact de claude.ai)

La app se publica como página con archivos propios. Reglas que el código DEBE respetar:

- Solo carga **archivos propios por ruta relativa**. Imágenes remotas: NO cargan. `fetch` a otros
  hosts: bloqueado. Sí se puede `fetch('data/catalog.json')` (relativo).
- Scripts externos solo desde cdnjs/jsdelivr/unpkg; **no usar ninguno** (vanilla JS, sin build).
- Fuentes: Google Fonts mediante `<link>` a fonts.googleapis.com está permitido; siempre con
  fallback del sistema.
- Prohibido/ignorado: `alert/confirm/prompt`, Web Share, descargas, service workers, lectura del
  portapapeles, iframes externos. `navigator.clipboard.writeText` y el **audio** solo dentro de
  un manejador de clic y con try/catch.
- `localStorage` puede faltar o lanzar: siempre try/catch y funcionar sin él (estado en memoria).
- Enrutado: solo `location.hash` con un nombre plano `#nombre-asi` (letras ASCII, dígitos y
  guiones). Nada de `#/ruta`, `#k=v` ni query string. Reservados (no usar): settings, sidebar,
  customize, upgrade, downloads, comment-*.
- Meta viewport con `viewport-fit=cover` solo si se usa `env(safe-area-inset-*)`.
- Carruseles: scroller nativo con `scroll-snap`, botones anterior/siguiente y flechas del teclado.
- Sin zoom de página (oleada 8): viewport con `maximum-scale=1, user-scalable=no`, `touch-action:
  pan-x pan-y` en todo (no se hereda) y, en Safari, freno de `gesture*` y de movimientos con dos
  dedos. El tamaño de texto del sistema sigue funcionando (estilos en rem).
- Límite duro del artifact: 512 archivos por versión. Objetivo propio: **< 320 archivos en `app/`**
  (imágenes ya optimizadas en `app/img/`, miniaturas agrupadas en hojas `app/img/s/`; lo comprueba
  `tools/validate_catalog.py`).

## 3. Estructura de carpetas (propiedad de cada agente)

```
/home/claude/mirada/
  docs/SPEC.md                  este documento
  app/                          LO QUE SE PUBLICA (raíz del sitio)
    index.html                  [APP]
    css/*.css                   [APP]
    js/main.js                  [APP] arranque
    js/state/*.js               [APP] estado persistente versionado
    js/engine/*.js              [APP] lógica pura: preguntas, SRS, progreso, RNG con semilla
    js/ui/*.js                  [APP] pantallas y componentes
    js/audio/*.js               [AUDIO] motor de sonido (contrato en §5)
    data/catalog.json           [CATÁLOGO] (contrato en §4)
    data/catalog-text.json      [CATÁLOGO] textos que se piden tras pintar (`look`, `traits`)
    img/*.jpg                   [CATÁLOGO] obras optimizadas
    img/s/*.jpg                 [CATÁLOGO] hojas de miniaturas (atlas)
  tests/*.test.js               [APP] pruebas con node:test (lógica pura)
  tools/                        scripts auxiliares (no se publican)
  data/rs_raw.json              metadatos originales del dataset (ruso)
```

Cada agente escribe SOLO en sus carpetas. JS en **módulos ES** nativos (`type="module"`),
sin dependencias ni paso de compilación. Código legible, funciones pequeñas, nombres claros,
comentarios solo donde aportan. Lógica del motor **pura y testeable** (sin DOM).

## 4. Contrato del catálogo — `app/data/catalog.json`

```jsonc
{
  "version": 1,
  "movements": [
    { "id": "renacimiento", "name": "Renacimiento", "period": "s. XV–XVI", "order": 1,
      "era": "renaissance",            // clave de música (§5)
      "blurb": "Una línea que lo sitúa.",
      "accent": "#8a6d3b" }            // color sobrio propio del movimiento
  ],
  "artists": [
    { "id": "leonardo", "name": "Leonardo da Vinci", "short": "Leonardo",
      "movementId": "renacimiento", "born": 1452, "died": 1519, "country": "Italia",
      "order": 1,                      // orden dentro del movimiento (de más distinto a más parecido)
      "guest": false,                  // true = sin etapa propia (ver reglas): distractor, salas y repasos
      "hint": "Fíjate en el sfumato: contornos que se deshacen como humo.",
      "traits": ["sfumato", "sonrisas enigmáticas", "paisajes azulados al fondo"],
      "similarTo": ["rafael"] }        // ids de pintores con los que es fácil confundirlo
  ],
  "artworks": [
    { "id": "a154", "artistId": "leonardo", "title": "La Gioconda",
      "year": "c. 1503–1506", "yearSort": 1503,
      "img": "img/a154.jpg", "w": 1000, "h": 1490,
      "role": "learn",                 // "learn" (se enseña) | "new" (reservada para cuadros nuevos)
      "fame": 3,                       // 1 poco conocida · 3 icónica
      "confidence": "high" }           // "high" | "medium" (dato a revisar)
  ]
}
```

Campos añadidos en la oleada 3 (opcionales salvo `thumb`):
- obra `thumb` (desde la oleada 5): `[hoja, x, y, w, h]`, región de la miniatura (lado mayor 280 px,
  proporciones del cuadro) dentro de una hoja del atlas; arriba del catálogo
  `atlas: { cell: 288, sheets: ["img/s/c0.jpg", …], size: [[w, h], …] }`. Lo generan
  `tools/make_thumbs.sh` → `tools/make_atlas.py` (portadas de cada pintor primero, en hojas de 3×3;
  el resto por pintor en hojas de 4×4). La app recorta con CSS (unidades de contenedor, como
  `object-fit: cover`). Se usa donde el cuadro se pinta pequeño; `img` solo en la pregunta, el
  carrusel y la ficha.
- obra `attributed: true` (oleada 6): atribución discutida (hoy a125, «La Madonna Litta (atribuida)»;
  el título lo dice). Se trata como `spoiler` en las preguntas de autor: no sale en «¿Quién lo pintó?»
  ni en «¿Cuál es de X?» (ni de relleno), ni en el detalle del día; sí en «¿De qué movimiento es?»,
  «Conoce a», salas y colección. Revisadas y no marcadas: b37 (Klimt, el marco dice el título
  «JUDITH UND HOLOFERNES», no el autor) y a12 (la inscripción de Veronese no se lee a tamaño de pregunta).
- obra `spoiler: true`: la imagen lleva escrito el autor. Regla (oleada 5): **no sale en ninguna
  pregunta** (ni en grande —quién o movimiento— ni como miniatura de «¿Cuál es de X?», tampoco de
  relleno); sí en «Conoce a», salas, colección y medallas.
- pintor `section`: tramo del mapa dentro de un movimiento largo (contiguo; solo con etapa).
- movimiento `traits`: rasgos del movimiento (desde la oleada 4, todos los movimientos los llevan).
- Un movimiento sin pintores con etapa (≥2 invitados, ≥4 obras) es una **sala**: una parada del
  camino con «Conoce el movimiento» y ronda de movimiento y autor (semilla de reto `r<idx>x<seed>`).

Oleada 5: `data/catalog.json` se escribe compacto y **sin** `look` de obra ni `traits` de pintor;
esos textos van en `data/catalog-text.json` (`{ version: 1, look: {id: texto}, traits: {id: [..]} }`),
que la app pide después de pintar la primera pantalla y antes de empezar una ronda
(`engine/catalog.js` `mergeCatalogText`). Sin ese archivo todo funciona (sin las frases `look`).

Campo añadido en la oleada 4 (opcional):
- obra `look`: frase muy corta (≤ 100 caracteres; se escriben de ~90) que señala dónde se ve el
  rasgo del pintor en ESE cuadro, p. ej. «Mira cómo el fondo azulado se deshace detrás de ella».
  Sin punto final, sin nombrar al autor ni el título (puede mostrarse junto a la pregunta o en el
  feedback). Escrita mirando la imagen; si el rasgo no se ve claro en esa obra, no se pone.
  Lo llevan todas las obras de pintores con etapa salvo unas pocas atípicas, y algunas de invitados.
- Ids de obra: `a<N>` (colección original) y `b<N>` (obras añadidas en la oleada 4). Ambos casan
  con `[a-z0-9-]+`.

Reglas (oleada 4): un pintor tiene etapa propia (`guest:false`) si tiene ≥3 obras, con 2–3
`learn` y ≥1 `new` (con 3 obras, 2 `learn` + 1 `new`; ideal 3/3) y al menos una obra `learn` y
una `new` sin `spoiler`. Excepción: como máximo 4 pintores rusos con etapa (Aivazovski, Shishkin,
Repin y Levitán); el resto de rusos son invitados aunque tengan ≥3 obras (todas sus obras con
role `new`). `hint` empieza por «Fíjate en…» y nombra un rasgo visual exclusivo del pintor; 3
`traits`; `similarTo` con ids existentes, preferentemente de pintores con etapa. `section` solo
en movimientos con >4 pintores con etapa (hoy ninguno). `img` relativo a `app/`. Solo artistas
fallecidos antes de 1956 y obras anteriores a 1930. Movimientos previstos (ids): `renacimiento`, `manierismo-y-norte` (opcional),
`barroco`, `rococo-neoclasicismo`, `romanticismo`, `realismo`, `impresionismo`,
`postimpresionismo`, `simbolismo-modernismo`. Eras de música: ver §5.

## 4 bis. Reglas de juego y metas largas (oleada 6)

- **Dominar una etapa** (oleada 9): 70 % de aciertos a la primera (`progress.STAGE_MASTERY`; en rondas
  de 8, 6 aciertos) **y** al menos 2 de cada 3 preguntas sobre el propio pintor
  (`progress.stageRoundMastered` / `ownRoundMastered`; regla para los tests: `progress.stageRule`).
  Rondas de 8 preguntas (`planner.STAGE_ROUND`; 7 con un solo pintor aprendido antes, Rafael, cuya
  única «¿Quién?» propia es la segunda para que «la opción más repetida» no baste): calentamiento +
  hasta 2 no vistas, 2+ «¿Quién?» de repaso (con el de la etapa y otro pintor ya aprendido de
  distractores), una de movimiento si cabe y «¿Cuál es de X?» de repaso hasta completar.
  **Primera etapa**: «¿Quién lo pintó?» siempre es el propio pintor y no cuenta; se domina con 3 de las
  4 «¿Cuál es de X?» y el calentamiento acertado (`firstStageOwnMastered`; adivinar: 3,9 %).
  Alumno atento del evaluador (88 % en obras ya enseñadas, 70 % en no vistas): domina el 69–79 % de las
  rondas en todas las etapas (media ≈ 74,5 %; antes 49–71 %), lo exige `tests/antibot.test.js`
  (65–80 % por etapa y media 70–78 %). Bots simples ≤ 4,6 % y por descarte ≤ 25 %.
  Antes (oleada 6): 75 % y 2 de cada 3. Con solo 2 preguntas propias
  (pintores con 2 obras preguntables) se perdona un fallo si se acierta su «¿Cuál es de X?», que es
  la obra ya vista (por descarte, 1 de cada 4; alumno atento ≈ 75 % de rondas). Conocer a los anteriores y responder por descarte no
  basta. En las preguntas del pintor de la etapa salen pintores aún no aprendidos de distractor (en
  «¿Quién?», uno aprendido + dos sin aprender; en «¿Cuál es de X?», relleno sin aprender).
- «¿De qué movimiento es?» en una etapa: la respuesta se reparte entre los movimientos ya vistos
  (a veces el de la etapa, con obra de un pintor ya aprendido de ese movimiento o del propio); el de la
  etapa y el anterior más cercano salen siempre entre las opciones. Si solo cabría una respuesta, no se hace.
- **Camino completo** = todas las paradas dominadas (`isPathMastered`); si quedan por dominar, el mapa
  dice cuántas y lleva a la primera. Abre la ronda libre y el **reto semanal** (`#reto-semanal`;
  15 preguntas de todo el camino, semilla = semana ISO de Madrid, enlace `#reto-w<AAAAss>-<aciertos>`).
- «Hoy has aprendido» solo con ≥ 50 % de aciertos; con menos, una frase de ánimo y «Repetir».
- **Cuadros que reconoces**: obras en la caja ≥ 3 del repaso espaciado (Perfil «Reconoces N cuadros» y
  final del camino). Colección cuenta otra cosa y lo dice: «N de M vistos» (acertadas alguna vez).
- **Inicio**: «Repaso de hoy · 3 cuadros» (lo que toca hoy, no el total pendiente). Con tres o más
  tarjetas del día (camino avanzado) van en un bloque «Hoy» compacto; el detalle se despliega desde su fila.
- **Reto con pintores no vistos** (p. ej. un semanal aceptado por un jugador nuevo): aviso «Salen
  pintores que aún no has visto», sin bloquear; esas preguntas no cuentan para precisión, repaso ni colección.
- **Ojo de <pintor>** (medalla `eye-<id>`): todas sus obras que se preguntan en la caja 4 o más
  (`progress.EYE_BOX`; la 5 pide ≥ 25 días por obra y, con 3 repasos al día, más de un mes). Progreso
  visible «Ojo de X · 3/7» en Medallas, Colección y la etapa del pintor dominado.
- **Sala** de un movimiento dominado (`#galeria-<movimiento>`): galería con sus obras reconocidas
  (colección; si hay menos de 3, se completan con las de «Conoce a»), su `look` y la música de la época.
  Se abre desde el mapa (junto al sello) y desde Colección. (No confundir con la «sala» de §4: parada
  del camino de un movimiento sin pintores con etapa.)
- **Detalle del día** (tarjeta del inicio): recorte ampliado por CSS (×1,5–1,8) de una obra ya reconocida
  de fama 3 (todas llevan `look`; nunca `spoiler` ni `attributed`), centrado en su `focus` [x, y] (0–1,
  campo opcional del catálogo: rostro, mano o zona característica) o, sin él, en el centro un poco
  por encima; y «¿De quién es?» con 4 opciones; una vez al día (fecha de Madrid), +5 XP
  si se acierta (cuenta para la meta, no para la racha).
- Estado v4 (`state/schema.js`, migración 3 → 4): `progress.weekly` y `progress.detail`.

## 4 ter. Catálogo grande (migración de 24/11, `catalog.json` versión 2)

Lo genera `tools/catalog_from_pipeline.py` desde `catalogo/obras.json` + `catalogo/pintores.json` (proceso `pipeline/`),
con los textos curados de `tools/catalog_data.py` cruzados por `tools/ids_antiguos.json` (`a<N>`/`b<N>` → `w<QID>`).
1.315 obras (ids `w<QID>`), 162 pintores, 9 movimientos del camino + 2 ramas-movimiento, 14 ramas.

- **Archivos** (`app/data/`): `catalog.json` (lo mínimo para pintar), `catalog-text.json` (versión 3: `look`, `looks`, `kind`,
  `tags`, `traits`, `traitTags`, vocabulario) y `catalog-ficha.json` (ficha de museo de cada obra: `museum`, `city`, `country`,
  `technique`, `dimensions`, `source {wikidata, file, license}`; se pide aparte por peso, `mergeCatalogFicha` la une a las obras).
- **Obra**: `id, artistId, title, year, yearSort, img, thumb, w, h, role, fame, confidence, level, stage?, inSpain, spoiler?,
  attributed?, focus?`. `w`/`h` son los de la imagen empaquetada a 1200 px. `level`: 1 = básico, 2..n = «a fondo» (etapa
  `stage` = nombre). Obras con año desconocido: «s. XVIII» (el siglo, por el pintor). `spoiler`/`attributed` solo en las 9 obras
  ya revisadas del catálogo anterior: **las nuevas están sin revisar** (firma visible, atribución).
- **`role`**: grandes maestros y maestros, 4 obras «learn» de nivel 1 («Conoce a»; las con firma o atribución dudosa primero) y
  el resto «new»; invitados y pintores de ramas, 2 «learn» y el resto «new»; todo lo de nivel ≥ 2 es «new».
- **Pintor**: `id, name, short, movementId, born, died, country, order, section?, category` (`gran-maestro` | `maestro` |
  `invitado` | `rama`), `guest` (sin etapa en el camino común), `onPath`, `stages [{id, name, from, to, source, verificar?,
  provisional?}]` (niveles «a fondo» 2..n), `branches` (ids de rama), `hint`, `similarTo`. **Camino común (`onPath`)**: grandes
  maestros + maestros + invitados con alguna obra de fama 3 (19); solo grandes maestros y maestros (56) son paradas, en el orden
  de `tools/camino.json` (abre Botticelli; Rafael 3.º, Leonardo 4.º); los invitados del camino salen intercalados en el repaso
  (`index.guestsAt`) y los demás invitados solo en las ramas «Descubre…». `order` y `section`: tramos de `tools/camino.json`.
- **Movimiento**: además `branch: true` y `opensAt` en `gotico` (orden 0,5, se abre en el Renacimiento) y `ukiyo-e` (7,5,
  Impresionismo); no son paradas ni salas ni opción de «¿De qué movimiento es?» salvo como respuesta.
- **`branches`**: `[{ id, name, kind: 'epoca'|'escuela'|'rama', opensAt, artists: [ids cronológicos por nacimiento],
  tramos: [{ opensAt, artists }] }]`: nueve «Descubre <época>», «Escuela rusa», «Pintura británica», «Maestros españoles»,
  «Gótico» y «Estampa japonesa». Un tramo se abre al llegar a su época en el camino común (`engine/branches.js`).
- **Imágenes y atlas**: `img` = `img/w<QID>.jpg` (1200 px, fuera del repo: `tools/fetch_images.sh` las baja de la release y
  pinta el atlas con `tools/make_atlas.py`, 86 hojas de 15,5 MB, fuera del repo). `thumb` y `atlas` salen de
  `tools/atlas_layout.py`, función solo del catálogo (no de los píxeles): coordenadas y hojas encajan siempre.
- **Motor**: `buildIndex` lee `category`/`onPath`/`level`/`branches`; con `index.hasLevels` (catálogo con niveles) la ronda del
  pintor es de 9 preguntas (8 con un solo pintor antes): calentamiento + 3 obras no enseñadas (nivel 1 que aún no ha visto,
  después nivel 2+) + repaso de pintores anteriores (+ una obra de un invitado del camino de vez en cuando). **Dominado = haber
  visto todas las obras de nivel 1** (`engine/levels.js`; `progress.artists[id].works`) **y ≥ 75 %** en la ronda (más la regla de
  preguntas propias). Niveles «a fondo»: `planStage(index, id, seed, { level })`, una ronda por etapa que se desbloquea al
  dominar el básico y el nivel anterior; su estado en `progress.deep['pintor:nivel']`; no tocan la parada del camino. Rangos:
  `engine/ranks.js` (8 rangos, XP + «a fondo»; `progress.rank` guarda el más alto). Pintores de rama: la misma ronda (`before` =
  los anteriores de su rama). Anti-trampa intacto (bots ≤ 5 %, descarte ≤ 25 %); la prueba de «dificultad justa» pasa a 60–80 %.
- **Estado v7** (`state/schema.js`): obras `a<N>` → `w<QID>` (`state/legacy-ids.js`, generado), lo sin equivalente se pierde;
  `deep: {}` y `rank: 0` nuevos; se descarta la ronda en curso.

- **Ficha de pintor (parte B, paquete 1)**: `ui/artist-sheet.js` (diálogo sobre cualquier pantalla; no cambia de ruta, así no pierde
  una ronda; jugar solo si se abre desde una pantalla con navegación inferior). Se abre con cualquier `data-artist="<id>"`
  (`ui/artist-link.js`, delegación en `main.js`): feedback («Es de X», «El que has elegido es de…»), «Conoce a» y ficha de obra.
  Muestra fechas, país, época, líneas de vida (tarjetas del nivel 1 de `app/data/historias/<id>.json`; sin historia, un dato seco
  con enlace a Wikidata por el `qid` del catálogo), «Fíjate en…» (`hint`), etapas (grandes maestros), SOLO obras ya vistas y
  progreso. Colección tiene dos rutas, `#coleccion` (Cuadros) y `#coleccion-pintores` (lista por épocas alcanzadas con buscador).
  **Historias servidas desde la app**: `tools/sync_historias.py` copia y valida `contenido/historias/` en `app/data/historias/`
  (con `index.json` de pintores y niveles, para no pedir archivos inexistentes); `tests/ficha-pintor.test.js` falla si la copia se
  desfasa: tras tocar una historia, ejecutar el script y subir ambas carpetas. Museo y ciudad (`catalog-ficha.json`, diferido,
  `ui/ficha-data.js`) salen bajo el cuadro en el visor y en la ficha de obra solo con la obra revelada.
- **Colección «Cuadros»** (`ui/screens/collection.js`, `engine/collection.js`): una franja por pintor con «n de m» y sus 3 últimas obras
  desbloqueadas; por movimiento cronológico (o «lo último primero»); invitados (categoría `invitado`) juntos en una franja
  «Invitados» al final de su movimiento; tocar el nombre o «Ver todas» abre la ficha. Con 15 pintores o más con alguna obra
  desbloqueada sale el buscador con sugerencias (`engine/suggest.js`, `ui/suggest-box.js`: combobox/listbox, como mucho 6, pintores y
  luego títulos, sin tildes, principio de cualquier palabra, una errata) y chips por movimiento.
- **Guía de bienvenida** (`ui/coach.js`): tres pasos sobre el nodo actual, la franja «Hoy» y Colección; una vez por navegador
  (`sfumato.coach` en localStorage), se salta con «Saltar» o Esc. La cabecera ya no lleva el chip de rango (irá en el perfil) y lleva el reto diario
  (`dailyChip`: calendario con punto si está pendiente, «4/5» si está hecho). Ya no hay franja «Hoy» ni lupa del día (su registro
  `progress.detail` se descarta en la migración a v7); el reto diario es de 5 preguntas (`DAILY_SIZE`) y el Repaso de 5 y el reto
  semanal se ofrecen al terminar una ronda (`extraRounds` en `ui/screens/result.js`).

## 5. Contrato del audio — `app/js/audio/index.js`

```js
export const audio = {
  unlock(),                // llamar en el primer clic del usuario; crea/reanuda el AudioContext
  setEra(era),             // cambia la pieza de fondo con fundido suave
  startMusic(), stopMusic(),
  sfx(name),               // 'tap' | 'correct' | 'wrong' | 'streak' | 'levelup' | 'medal' | 'unlock' | 'complete'
  setMusicEnabled(bool), setSfxEnabled(bool),
  setVolume(v),            // 0..1
  getState(),              // { unlocked, era, musicEnabled, sfxEnabled, volume, playing }
};
```

Eras: `menu`, `renaissance`, `baroque`, `rococo`, `neoclassic`, `romantic`, `realism`,
`impressionism`, `postimpressionism`, `modern`. Todo sintetizado con Web Audio API (sin
archivos). Piezas **originales** (no citar obras existentes), en bucle, discretas, que no cansen.
Nunca lanza excepciones hacia fuera: si no hay audio, las llamadas no hacen nada.

## 6. Diseño (preferencias de la usuaria, obligatorias)

- **Mobile-first** (~380 px), correcto también en escritorio (columna centrada).
- Estética sobria y con gusto, de museo: colores **armoniosos y ordenados, nada estridente**,
  mucha limpieza visual. Los cuadros son los protagonistas (fondo neutro tipo pared de galería).
- **Textos mínimos**, lenguaje humano. Nada de textos de ayuda bajo los botones.
- **Todo lo que parezca pulsable se puede pulsar.** Nada decorativo con aspecto de botón.
- Accesibilidad: contraste AA, objetivos táctiles ≥44 px, foco visible, navegable con teclado,
  `alt` en imágenes (en preguntas el `alt` no revela autor ni título), `prefers-reduced-motion`.
- Animaciones suaves y con sentido (celebrar aciertos, subir de nivel), nunca molestas.
- **Visor a pantalla completa** (oleada 8, `ui/viewer.js`): todo cuadro que se muestra se abre al
  pulsarlo (marca pequeña de ampliar en la esquina) en un visor que ocupa toda la ventana de la app
  (`<dialog>` modal; no se usa la Fullscreen API): fondo oscuro neutro, cuadro entero con la imagen
  grande y la miniatura del atlas mientras carga, varios cuadros deslizando o con flechas (1/4),
  cerrar con el aspa, Esc, atrás del navegador o tocando fuera; foco atrapado y devuelto. Fuera de
  preguntas, pie «título · autor · año»; en una pregunta sin responder no revela nada. En «¿Cuál es
  de X?» la miniatura abre las 4 en el visor y «Es este» responde con la que se ve (cerrar no
  responde; 1-4 en el teclado responden directo). Oleada 9: al pedir otro cuadro (flechas, teclado)
  la posición queda fijada al pedirlo y «Es este» no responde (`aria-disabled`) hasta que el cuadro
  llega; tocar cualquier fondo (no el cuadro ni un botón) cierra, pero no al deslizar; el cuadro usa
  casi todo el ancho (6 px de margen) y con el móvil en horizontal ocupa la pantalla con los controles
  flotando encima. **Lupa**: botón redondo «Lupa» (`aria-pressed`) junto al aspa; con ella activa,
  mantener el dedo o el ratón sobre el cuadro muestra una lente circular (160 px en móvil, 210 px en
  pantallas grandes) con la zona ampliada con la imagen grande (×2,5 como mucho; menos si la imagen
  no da para ≈1,2 px de pantalla por píxel de imagen, mínimo ×1,6), por encima del dedo y dentro de
  la pantalla; desaparece al soltar. Con la lupa, arrastrar sobre el cuadro no cambia de cuadro ni
  tocarlo cierra; las flechas del teclado mueven la lente y Esc primero apaga la lupa. Se mantiene al
  cambiar de cuadro y se apaga al cerrar; espera a la imagen grande; sin animación con movimiento
  reducido; en preguntas no revela nada (la lente es `aria-hidden`). Recargar en la primera pregunta
  de una ronda (aunque sea con el visor abierto) vuelve a esa pregunta: la ronda se guarda al empezar.
  En las etapas no hay pantalla intermedia «Ahora,
  cuadros que no has visto» (lo visto y lo nuevo van mezclados; queda solo en las salas).
  **Colección** (oleada 9): la rejilla abre la ficha con el cuadro grande de entrada (un toque lo abre
  en el visor); desde la ficha y desde su visor se pasa al anterior/siguiente deslizando, con flechas
  o ←/→, en el orden de la rejilla (todos los vistos, de un pintor al siguiente), con «n / total» y
  título · autor · año y la frase `look` al día; lo pasado en el visor se queda en la ficha y, al
  cerrarla, la rejilla queda en ese cuadro con el foco en él. En la Sala, al cerrar el visor el foco
  vuelve al cuadro donde te has quedado. «¿Cuál es de X?» en móvil: la rejilla 2×2 ocupa el alto libre
  (sin hueco encima) y cada miniatura se ve entera y lo más grande que cabe en su casilla.
  Pulsables: «Conoce a», preguntas y feedback, «Hoy has aprendido», ficha de Colección, salas,
  paredes de bienvenida/intro/«Antes de empezar», detalle del día ya respondido y sello de pintor en
  su hoja de medalla. El mapa y las tarjetas siguen llevando a su sitio.
- Diseño propio: no copiar marca, mascota, colores ni pantallas de Duolingo ni de otras apps.
- Portada: franja «Hoy» fija bajo la cabecera (Reto, Lupa, Repaso) y mapa; sin personaje ni cofres en la v1: vuelven en la v2 con premios de verdad.
- En textos no usar "ayer"/"mañana": decir algo concreto.

## 6 bis. Estadísticas

Contador de visitas sin cookies ni datos personales: GoatCounter (`app/js/stats.js`), para saber si la
gente vuelve. Vacío por defecto: sin código no se carga nada ni se hace ninguna petición.

- **Activarlo**: poner el código de la cuenta (la parte `<código>` de `https://<código>.goatcounter.com`)
  en `GOATCOUNTER_CODE`, en `app/js/stats-config.js`. Se carga en reposo, tras pintar, como el audio.
- **Qué se mide** (nombres de evento fijos): la página vista (la cuenta GoatCounter sola);
  `vuelve/dia-1`, `dia-2`, `dia-3`, `dia-4-a-6` y `dia-7-o-mas` al abrir la app (días distintos con
  actividad, calculados en local; como mucho uno al día); `ronda/termina` y `racha/1`, `2-3`, `4-7`,
  `8+` (racha, una vez al día); en el test, `test/empieza`, `test/termina`, `test/tramo-<1 a 5>` y
  `test/comparte`.
- **Qué no se mide**: ids de usuario, cuadros, respuestas, resultados ni cualquier dato personal. Con
  «no rastrear» o control global de privacidad activos, y en `localhost`, no se cuenta nada.
- **En el navegador** solo se guarda `mirada.stats` (días de visita y último envío de cada evento).
- El e2e permite peticiones únicamente a `gc.zgo.at` y `*.goatcounter.com`, y comprueba que con el
  código vacío no hay ninguna.

## 7. Calidad

Puerta de calidad adversarial de la usuaria: evaluador independiente puntúa 8 criterios
(Material 3, UX, accesibilidad, rendimiento, adaptativo, pulido, originalidad, calidad
técnica); aprueba con todos ≥ 8 y sin fallos graves. Además: pruebas unitarias del motor en
verde y recorrido completo sin errores de consola.

Cómo se comprueba:
- `node --test tests/` — pruebas del motor, el estado y el catálogo real (rápidas, sin navegador).
  Incluye `tests/antibot.test.js`: para cada parada del camino y 120 semillas, bots que no miran los
  cuadros (siempre el pintor o el movimiento de la etapa, siempre la opción más repetida, siempre un
  pintor ya aprendido, el mixto del evaluador —moneda en «quién» + movimiento anterior—, el aprendido
  más reciente, nunca el de la etapa, siempre la misma posición); falla si alguno domina más del 5 %
  de las rondas de una etapa (regla completa de dominio). Además, el alumno que conoce a todos los
  anteriores pero no al de la etapa (responde por descarte) no domina más del 25 %.
  Oleada 9: además, el alumno atento del evaluador (88 % obras ya enseñadas, 70 % no vistas) domina
  entre el 65 % y el 80 % de las rondas en cada etapa (cálculo exacto, 120 semillas).
  `MIRADA_E2E=1 node --test tests/` incluye también el modo «humo» de la interfaz (`tests/e2e.test.js`,
  ~20 s: arranque, una etapa completa con teclado, resultado, perfil y 7 auditorías de contraste/táctil).
- `python3 -I tools/validate_catalog.py app` — contrato del catálogo, atlas y número de archivos.
- `bash tests/e2e.sh [carpeta] [prefijo]` — recorrido completo en Chrome headless (~6 min; Playwright de
  `/opt/npm-tools`, Chrome en `/usr/bin/google-chrome`; `MIRADA_E2E_MODE=smoke` para el humo): levanta
  un servidor de `app/` en el primer puerto libre desde 8941, ejecuta `tools/e2e.mjs` (390×844, 360×640, 768×1024, 1280×800, claro y
  oscuro, zoom 200 %, movimiento reducido, sin localStorage, enlaces inválidos, repaso rápido, camino
  dominado, reto semanal, detalle del día, salas, «Ojo de…») y lo cierra. Mide el contraste de todos
  los textos visibles (≥ 4,5:1) y los objetivos táctiles (≥ 48×48) en las pantallas principales, la
  barra de «Conoce a» (no tapa pista ni flechas), las respuestas sobre la hoja de feedback y las
  peticiones/bytes hasta el primer pintado útil con presupuesto. Las pantallas de la oleada 7
  (medallas con todas las clases de sello y su hoja, bloque «Hoy», «Ojo de…», aviso del reto) se
  auditan en claro/oscuro a 390 y 360. El contraste compone opacidad y grayscale por grupo y toma el
  peor color de los degradados. Oleada 8: el visor se prueba en cada pantalla (abrir, pasar, «Es este», cerrar con aspa/Esc/atrás/fuera, foco, que no revele datos en preguntas, contraste y táctil) a 390×844, 360×640, 1280×800 y 195×422, claro y oscuro, con emulación táctil; y que el pellizco y el doble toque no amplían (CDP). Oleada 9 (prefijo `o9-`): Leonardo jugado entero desde cero (5 preguntas, sin repetir, una vista),
  «¿Cuál?» sin hueco y con miniaturas grandes a 390 y 360, recargar con el visor abierto en la primera
  pregunta, la carrera «siguiente» + «Es este» en < 100 ms, fondo junto a un cuadro vertical que cierra
  y deslizar que no cierra, apaisado a lo ancho y móvil girado (844×390), la lupa (activar, arrastrar
  con toque emulado o ratón, zona correcta, dentro de pantalla, sin cambiar ni cerrar, teclado, Esc,
  apagar, se mantiene al pasar y se apaga al cerrar) y la ficha de Colección (deslizar, flechas, ←/→,
  límites, visor en el mismo orden, foco al cerrar) en 390×844, 360×640 y 1280×800, claro y oscuro.
  Capturas en `docs/screens/` (prefijo `o9-`; antes `o8-`). Sale con código ≠ 0 si hay algún problema.
