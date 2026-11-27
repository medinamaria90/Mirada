# Notas del proceso de catálogo

Proceso que reúne ~1.000 cuadros en dominio público con metadatos y títulos en español.
Todo lo que necesita internet corre en GitHub Actions (`.github/workflows/pipeline.yml`),
que se lanza al hacer push de `pipeline/RUN` (una línea por paso) y hace commit de sus salidas.

## Pasos
1. `resolve` — verifica el QID de cada pintor (`pipeline/painters.json`) → `pipeline/out/painters_resolved.json`.
2. `candidates` — obras candidatas por pintor (Wikidata SPARQL + datos del archivo en Commons) → `pipeline/out/candidates/<id>.json`.
3. `seleccionar.py` (local, sin red; `PYTHONUTF8=1 python pipeline/seleccionar.py`) — elige las obras con `extra.json`, `excluir.json` y `ajustes.json` → `catalogo/seleccion.json` (con `level`).
4. `download [lotes] [tamaño]` — descarga en lotes (150 por defecto), reanudable por `catalogo/img_meta.json`, commit tras cada lote. Las imágenes **no entran en main** (pesarían ~400 MB y cualquier `git pull` las bajaría a un PC): `run.sh` las sube a la **release `catalogo-img`** del repo (un JPEG por obra, `https://github.com/medinamaria90/Mirada/releases/download/catalogo-img/<id>.jpg`) y las borra del checkout; `img-release` sube las que haya en `catalogo/img/` y las saca de main. **GitHub admite como máximo 1.000 recursos por release**: `run.sh` reparte las sueltas en `catalogo-img`, `catalogo-img-2`… (`TOPE` 995 por release) y deja en `catalogo-img` hueco para el zip y el sha256. Para traerlas a un sitio: `gh release download catalogo-img -D catalogo/img` (y `-2`; o `--pattern 'w208758.jpg'`).
5. `fichas` — museo, ciudad, país, técnica, medidas, fecha y «qué aparece» de cada obra desde Wikidata → `pipeline/out/fichas.json` (reanudable; museos en `out/museos.json`, niveles administrativos en `out/lugares.json`).
6. `build` / `validate [--parcial]` — `catalogo/obras.json` (esquema de la app + ficha), `catalogo/pintores.json`, `CREDITS.md` y comprobaciones.
7. `pack [lado] [--parcial]` (por defecto 1200) — `pipeline/pack.py`: toma las imágenes sueltas de las releases (y las de `catalogo/img/` si las hay), deja solo las de `catalogo/obras.json` a lado mayor 1200 px (JPEG 82, progresivo, sin metadatos; Pillow las abre como no confiables: solo JPEG, tope de píxeles y de bytes), y sube **un único recurso** `app-img-1200.zip` (+ `app-img-1200.sha256`) a la release `catalogo-img`, sustituyendo el anterior. Si faltan imágenes no sube nada salvo con `--parcial`. Peso e imágenes quedan en `pipeline/logs/pack.txt`.
8. `reconciliar` — quita de `catalogo/img_meta.json` lo que no está en ninguna release (para que `download` lo vuelva a bajar).
9. `hd` — `pipeline/hd.py`: imágenes HD de las obras que las historias enseñan en detalle (`region`, o `focus` con zoom ≥ 1,5). Con `tools/nitidez.py` calcula los píxeles de imagen por píxel CSS en el móvil típico (412 × 915); si con la de 1200 px no llega a 1,5, baja de Commons la miniatura que da 2 (lado mayor hasta 3840 px, ≤ 2,5 MB) y sube `app-img-hd.zip` (+ `.sha256`) a `catalogo-img`. Escribe `catalogo/hd.json`; `tools/catalog_from_pipeline.py` pone `hd` en esas obras y `tools/fetch_images.sh` las deja en `app/img/hd/`. Relanzarlo (`hd` en `pipeline/RUN`) cuando una historia nueva use `region` o zoom: `tools/sync_historias.py` avisa del detalle borroso.

## Bitácora

### 24/11 (tarde) — revisión de la selección y arreglos del proceso

**Estado al llegar.** 148 pintores con QID verificado, candidatas para todos, y una `seleccion.json` de
1.079 obras de 130 pintores: faltaban 18 (Fra Angelico, Van der Weyden, Hals, Artemisia, Canaletto y
los 13 rusos invitados) porque `select.py` se había ejecutado antes de que llegaran sus candidatas. No había
ninguna imagen descargada.

**Fallo de nombre.** `pipeline/select.py` hacía sombra al módulo `select` de la biblioteca estándar
(`urllib` → `socket` → `selectors` → `import select` cargaba nuestro archivo) y el paso fallaba al arrancar.
Renombrado a `pipeline/seleccionar.py`. En Windows hay que ejecutarlo con `PYTHONUTF8=1`.

**Por qué faltaban obras icónicas.** Al comparar la selección automática con lo que debería haber por pintor
salieron ausencias graves (Velázquez sin *Las hilanderas*, Leonardo sin *La Última Cena* ni *La dama del
armiño*, Rafael sin *La escuela de Atenas* ni *La Fornarina*, Caravaggio sin *La vocación de San Mateo*,
Munch sin *El grito*, Van Gogh sin *Los girasoles* ni autorretratos, Millais sin *Ofelia*, Bruegel sin
*La torre de Babel*, Van Eyck sin el *Políptico de Gante*, Miguel Ángel sin *La creación de Adán*…). Causas:
- la comprobación «proporción de la imagen ≠ medidas de Wikidata» descartaba obras con medidas mal
  cargadas o intercambiadas en Wikidata (*Ofelia*, *La Última Cena*, *La dama del armiño*);
- «varios autores» descartaba obras cumbre con dos creadores (*Políptico de Gante*, *Venus dormida*,
  *Mañana en un bosque de pinos*, *El rapto de las hijas de Leucipo*);
- Wikidata modela algunas obras como **series** y la fama (sitelinks) se queda en el ítem de la serie,
  mientras cada versión tiene 1-6 sitelinks (*El grito*, *Los girasoles*, *La torre de Babel*, *Los
  jugadores de cartas*, *El dormitorio en Arlés*, *Nenúfares*);
- frescos que la consulta general no devuelve como obra del pintor (*La creación de Adán*, *El Juicio
  Final*, *La escuela de Atenas*) o cuadros que no salían en la consulta (*La condesa de Vilches*);
- imágenes de Wikidata pequeñas (< 1.200 px) aunque Commons tenga otras grandes (*La Anunciación* del
  Prado de Fra Angelico, *¡Triste herencia!*, *Los acuchilladores de parqué*, *Judit I*).

**Qué cambia en el proceso.**
- `pipeline/extra.json`: pintor → {QID: motivo}. Las obras **forzadas** entran aunque tengan dos autores,
  palabras sospechosas, medidas que no casen o una imagen de 1.000-1.200 px, y `candidates.py` las consulta
  aparte por QID (sin exigir autor único ni tipo) y pide sus datos de archivo aunque no estén entre las 80
  más famosas. Si a un pintor le faltan datos de alguna forzada, `candidates` lo vuelve a consultar solo.
- `pipeline/excluir.json`: descartes a mano con motivo (versiones repetidas de Carlos II de Carreño, dos de
  los cuatro Hércules de Zurbarán, lunetos menores de la Sixtina, *Sala delle Asse*, *Noli me tangere* que
  pintó Pontormo, bodegones tempranos repetidos de Velázquez…).
- `pipeline/ajustes.json`: título, año, archivo de Commons alternativo (con `archivoInfo`) y `level` a mano.
- `seleccionar.py` compara la proporción con **todas** las medidas declaradas, suaviza la penalización
  (×0,85 si el desvío es pequeño), ignora colecciones «valor desconocido» de Wikidata (salían como URL
  `well-known/genid`) y escribe `pipeline/logs/select_drops.txt` con cada descarte de fama ≥ 8 sitelinks
  para revisar a mano.
- **Nivel** (`level` 1|2) en cada obra: las 4 más conocidas si el pintor tiene ≤ 8 obras, 5 si ≤ 12, 6 si
  más; ordenadas por sitelinks reales (no por la bonificación de forzada); `ajustes.json` puede fijar
  `level: 1` a icónicas con fama repartida entre versiones. El camino usará el nivel 1; «a fondo», el 2.
- Objetivos subidos: Velázquez y Goya 16, Sorolla 14, Leonardo, Rafael, Tiziano, Caravaggio, Rubens,
  Rembrandt, Monet y Van Gogh 12. Total previsto: 1.180 obras, 148 pintores (336 de españoles).
- Límite de fallecimiento alineado a **1956** (dominio público en Europa; antes 1946) en `validate.py`,
  `build.py` y `resolve.py`.
- `run.sh`: `download [lotes] [tamaño]` (antes solo lotes de 150), para probar con un lote pequeño.
- Este PC no debe recibir descargas masivas, y un `git pull` baja todo lo que haya en cualquier rama: por
  eso las imágenes (~1.180 × ~300 KB) van a la **release `catalogo-img`** y no al repo (`catalogo/img/` está
  en `.gitignore`). Cuando se migre la app habrá que decidir cómo llegan a Render (commit de las que use la
  app a su tamaño, o descarga de la release en el despliegue).

**Pendiente de datos (consulta en Actions):** faltan datos de archivo de 8 forzadas
(*La creación de Adán*, *El Juicio Final*, *La escuela de Atenas*, *La condesa de Vilches*, *La rendición
de Granada*, *Los jugadores de cartas*, *El dormitorio en Arlés* y *Los girasoles* de Londres); el RUN
`candidates miguel-angel rafael madrazo pradilla cezanne van-gogh` las trae y después se vuelve a ejecutar
`seleccionar.py` en local.

### 24/11 (noche) — imágenes: tope de la release y paquete para Render

- **Fallo encontrado.** GitHub admite 1.000 recursos por release: `catalogo-img` se llenó con el lote 6 y las 180 imágenes de los
  lotes 7 y 8 no se pudieron subir, pero `img_meta.json` ya las daba por bajadas (se habrían perdido al acabar el job).
- **Arreglo.** `push_img` reparte en `catalogo-img`, `catalogo-img-2`… (tope 995) y, si no sube, deshace el `img_meta.json` del lote y
  corta; paso nuevo `reconciliar` (quita de `img_meta.json` lo que no está en ninguna release). Se volvieron a bajar las 180 y quedaron
  las 1.180 sueltas a 1600 px: 995 en `catalogo-img`, 185 en `catalogo-img-2`.
- **Paquete.** Nuevo paso `pack 1200` (`pipeline/pack.py`): 1.180 imágenes, 267,1 MB de JPEG (media 221 KB), `app-img-1200.zip` de
  255 MiB (267,2 MB) + `app-img-1200.sha256` en `catalogo-img`, 0 obras sin imagen, 0 fallos. Para hacerle sitio se pasaron 4 sueltas
  de `catalogo-img` a `-2` (`liberar_hueco`).
- **Prueba.** `bash tools/fetch_images.sh <carpeta>` con el zip real: 39 s, sha256 correcto, 1.180 imágenes (258 MB); también probados
  sha256 erróneo, recurso inexistente y pocas imágenes (los tres fallan con mensaje claro). Carpeta de prueba borrada.
- **Render (migración, no aplicado):** comando de construcción `bash tools/fetch_images.sh app/img`; ver «Imágenes en el despliegue».
- Pillow se instala en el job (`python3-pil`) en `pipeline.yml`.
- Ojo: `pack` descarga todas las sueltas (~400 MB) en el runner, no en el PC; relanzarlo (`pack 1200` en `pipeline/RUN`) basta si cambia la
  selección tras `download`.

### 24/11 (noche, fase 1) — categorías, etapas y niveles de la propuesta de pintores

Aplicada la fase 1 de `docs/propuesta-pintores.md` con las decisiones de María (punto 16 del traspaso) y los ajustes posteriores.

**Modelo de datos.**
- `pipeline/painters.json`: `categoria` por pintor (`gran-maestro` 14, `maestro` 42, `invitado` 96, `rama` 10) y `objetivo` solo para las ramas; `tipos` (estampas) y `rama` (Giotto y Van Eyck también cuentan en la rama gótica, sin duplicar obras).
- `pipeline/etapas.json` (nuevo): por pintor, las etapas «a fondo» (`nivel` 2..n, `nombre`, `desde`, `hasta`, `fuente` con enlace, `fase` 1|2, `verificar` si la propuesta lo marca, `corteInferido` si el año de corte no lo da la propuesta, `provisional` si no hay etapas con fuente y el nivel es «más obras»). 172 etapas: 104 de fase 1 y 68 de fase 2; 29 con `verificar` (Bruegel, David, Degas, Fortuny, Gauguin, Kandinsky, Klimt, Millet, Munch, Renoir, Vermeer) y 33 con corte inferido. Nivel 1 no se lista.
- `seleccionar.py`: cupos por categoría (básico 8 / 7 / 3, y 4 para invitados españoles; «a fondo» de 6 / 5 / 5). Nivel 1: forzadas de `extra.json` y `level: 1` de `ajustes.json` siempre; el resto, las más famosas. Cada «a fondo»: las más famosas cuyo año de `inception` cae en la etapa (`hasta`: la obra va a la primera etapa cuyo `hasta` alcanza su año; corte de mes con la fecha de Wikidata, p. ej. Van Gogh; las de solo año en un corte de mes van a la etapa siguiente; las de fecha solo secular no tienen etapa). Una icónica de etapa tardía se queda en el nivel 1 y no cuenta para su etapa. `ajustes.json` admite `etapa: <nivel>` para fijarla a mano (Silla con pipa a Arlés). `FASE=1` (variable de entorno) deja fuera las etapas de fase 2. Nuevos campos de `seleccion.json`: `level` 1..n y `etapa`.
- `build.py`: `category`, `stages` y `branches` por pintor, `stage` por obra, movimientos `gotico` y `ukiyo-e` con `branch: true` y `opensAt` (`renacimiento` e `impresionismo`).
- `validate.py`: nivel 1 por categoría (8-11, 7-9, 3-5, 4-6 en ramas), etapas con fuente salvo las provisionales, «a fondo» con error por debajo de 3 obras y aviso por debajo de 5, `level` ∈ niveles del pintor.
- `candidates.py`: `tipos` extra por pintor (estampas, para el ukiyo-e). `run.sh`: paso `seleccionar` (sin red).

**Ajustes aprobados después de la propuesta.** Sisley pasa a maestro (1 «a fondo» provisional); Cassatt y Vigée Le Brun, invitadas con 1 «a fondo» (5 obras); nuevos invitados Sofonisba Anguissola (Q236038; país Italia, 3 obras, sus obras del Prado entran por museo), Judith Leyster, Rosa Bonheur y Frédéric Bazille (QID y fechas verificados). Caillebotte y Regoyos, como estaban. Zurbarán sube a gran maestro y Murillo es gran maestro.
**Ramas** (no camino común): *Gótico* (Cimabue, Duccio, Simone Martini, Pietro y Ambrogio Lorenzetti, más Giotto y Van Eyck) se abre desde el Renacimiento; *Estampa japonesa* (Hokusai, Hiroshige, Utamaro, Sharaku, Kuniyoshi) al llegar al Impresionismo. 4 obras en el nivel 1 y el resto (6-12 por pintor) en un «a fondo». Hokusai: *La gran ola* y *Fuji rojo* forzadas; Hiroshige: *Ciruelo en flor en Kameido* y *Lluvia repentina sobre el puente Ōhashi*. Las estampas entran con otro filtro de palabras (sin «print», «grabado»…, pero con «reprint», «reimpresión», «restrike», «facsimile»). Se excluyen las series (Treinta y seis vistas, Tōkaidō, Cien vistas…) para quedarse con estampas sueltas. Sharaku sin año de nacimiento en Wikidata: se usa c. 1760 solo para filtrar fechas.

**Excluida** *Milagro de san Donato* (atribución dudosa a Leonardo; punto 5 de la propuesta). Forzadas nuevas: *Maestà* de Duccio (medidas de Wikidata que no casan) y la *Anunciación* de Simone Martini y Lippo Memmi (dos autores).

**Ejecuciones en Actions.** (1) `resolve`, `candidates` de los 4 invitados nuevos, `seleccionar`, `fichas`, `download` (394 imágenes nuevas, subidas a `catalogo-img-2`), `build`, `pack 1200`: 1.233 obras. (2) Ramas: 82 obras más, 83 imágenes nuevas; paquete de 1.315 imágenes (301,0 MB de JPEG, zip de 288 MiB en `catalogo-img`, con su sha256). `candidates` de las ramas se consultó en local (solo metadatos) y se subió. Un primer `validate` falló por no tener las ramas etapas en `etapas.json` (42 errores); corregido y `catalogo/obras.json` reconstruido y subido con 0 errores y 337 avisos (títulos por traducir, fichas sin algún campo).

**Cifras finales** (`catalogo/obras.json`): 1.315 obras, 162 pintores, 369 obras de pintores españoles (28 %; 38 pintores) y 296 con museo en España. Por categoría: grandes maestros 413 (nivel 1: 113; 2: 81; 3: 77; 4: 76; 5: 54; 6: 12), maestros 498 (nivel 1: 294; 2: 204), invitados 322 (312 + 10 «a fondo»), ramas 82 (40 + 42). Niveles «a fondo»: 104 (51 de grandes maestros, 41 de maestros incluido Sisley, 2 de invitados y 10 de ramas).
**Niveles cortos** (candidatas aptas, no el proceso): Leonardo 3 (la propuesta daba 6; el *Milagro de san Donato* sale y las tempranas más famosas están en el nivel 1), Fortuny 4, Sorolla etapa final 5 (de 6), Zurbarán último 5 (de 6), Murillo pleno barroco 5 (de 6), Cimabue y Sharaku 6 obras en total. Se amplían en la fase 2 (más candidatas para Goya, El Greco, Murillo, Sorolla y Monet, como se decidió).

**Para la fase 2.** 68 etapas de fase 2 (resto de «a fondo» de maestros: 39; invitados: 29 provisionales); ampliar `candidates` (más de 80 con datos de imagen) para Goya, El Greco, Murillo, Sorolla, Monet, Cézanne, Munch, Renoir y Kandinsky; verificar las 29 etapas con `verificar` y las 33 con corte inferido (David, Fortuny, Renoir, Klimt, Munch, Gauguin… sin años en la propuesta); `seleccionar` con `FASE=2`. Las imágenes de las 1.180 obras de la selección antigua que ya no están siguen en las releases (huérfanas): `pack` solo empaqueta las de `obras.json`.
**Para la migración de la app.** Leer `category`, `stages` y `branches` de `pintores.json`; `level` ya no es 1|2; las ramas (`gotico`, `ukiyo-e`) no entran en el camino común; el nivel 1 de grandes maestros y maestros tiene 7-9 obras (la propuesta daba 8 y 7) y el de invitados 3-4.

### 27/11 — Fra Angelico, frescos Scrovegni y museos de marchante

- Fra Angelico (invitado) pasa a 4 obras de nivel 1 (2 «learn», 2 «new»): entran la *Adoración de los Reyes Magos* y la *Anunciación de
  Cortona*; la *Coronación de la Virgen* se fuerza para que las otras no la saquen del cupo. Fuera el *Retablo de San Marcos*: su imagen
  en Wikidata mide 848 px (haría falta otro archivo de Commons con `archivoInfo` en `ajustes.json`).
- Giotto, nivel «Padua»: entran *El beso de Judas* (Q3504778) y el *Llanto sobre Cristo muerto* (Q2067212). *El Juicio Final* (Q3769209)
  queda fuera por lo mismo: imagen de 513 × 600 px en Wikidata.
- Leyster (*Alegre compañía*, Q4109849) y Malévich (*Composición suprematista*, Q1523466): Wikidata daba un marchante como colección;
  `fichas_ajustes.json` las deja en «Colección privada».
- Ojo: `excluir.json` solo actúa al volver a ejecutar `seleccionar` de ese pintor. Una exclusión hecha a mano en `obras.json` vuelve con
  el siguiente `build` si no se quita también de `catalogo/seleccion.json` (pasó con Kuniyoshi Q69729449; ya quitada).

### 27/11 (2.ª y 3.ª pasada) — archivos alternativos, ramas sienesas y exclusiones

- Archivos de Commons en `ajustes.json` (con `archivoInfo`): *El Juicio Final* de Giotto (foto de 2016, 2048 × 3072), *Retablo de
  San Marcos* (4971 × 5139) y *Maestà* de Duccio (tabla central, CC0; sale de `excluir.json`). Simone Martini: *Maestà* del Palazzo
  Pubblico y *Guidoriccio* (Google Art Project), forzadas. Duccio y Simone Martini, 4 obras de nivel 1; Fra Angelico, 5.
- **`excluir.json` en todos los pasos.** `lib.seleccion()` lee la selección sin las excluidas (claves QID o `w<número>`); la usan
  `seleccionar` (también para los pintores que no vuelve a elegir), `fichas`, `download` y `build`. `validate.py`,
  `tools/validate_catalog.py` y `tests/excluir.test.js` fallan si una excluida llega a `catalogo/` o a `app/data`. Antes solo
  `seleccionar.py` excluía, y solo con claves Q. El *Políptico del juicio final* de Van der Weyden sale de `excluir.json`: volvió y lo
  usan sus textos.
- Ojo: `run.sh` hace `git pull --rebase -X theirs`; si se cambia `catalogo/` en main mientras corre el proceso, gana lo del proceso.

## Plan de migración de la app al catálogo grande (sin tocar `app/` hasta que acabe la portada)

Hoy la app vive de `tools/catalog_data.py` (datos a mano de 235 obras y 75 pintores, ids `a<N>`/`b<N>`,
imágenes `app/img/<id>.jpg` a 1000 px) → `tools/patch_catalog.py` / `tools/make_thumbs.sh` →
`app/data/catalog.json` + `app/data/catalog-text.json` + atlas `app/img/s/`. El catálogo grande llega como
`catalogo/obras.json` (1.180 obras, ids `w<QID>`, esquema de la app + ficha) y la release `catalogo-img`.

1. **Datos.** `tools/catalog_data.py` deja de ser la fuente de las obras: nuevo `tools/catalog_from_pipeline.py`
   que lee `catalogo/obras.json` y produce `catalog.json` con el contrato de SPEC §4: `artworks` con
   `id, artistId, title, year, yearSort, img, w, h, role, fame, confidence, level, museum, city, country,
   inSpain, technique, dimensions, inception, source`; `artists` con `born, died, country, movementId, order,
   section, guest, hint, traits, similarTo` (los textos `hint`/`traits`/`similarTo`/`look` se conservan de
   `catalog_data.py` por id de pintor: hay que mapear los 75 ids actuales a los 148 nuevos, casi todos
   coinciden; `look` de obra se pierde salvo las ~235 obras que ya estaban: mapear por QID→`a<N>` con una
   tabla `tools/ids_antiguos.json` para no perder progreso ni textos). `role`: `learn` para nivel 1 hasta
   3 por pintor con etapa, `new` el resto; `fame` 1-3 ya viene. `catalog-text.json` sigue llevando `look`
   y `traits`; añadir `about` (qué representa) cuando exista.
2. **Imágenes.** `tools/import_release.sh`: `gh release download catalogo-img -D staging/` y reducir a lo que
   use la app (propuesta: 1600 px para el visor con zoom, o 1200 px si pesa demasiado; medir: 1.180 ×
   ~300 KB ≈ 350 MB en `app/img/`). Decidir con María si entran en el repo (Render sirve estático) o si el
   despliegue las baja de la release. Regenerar el atlas (`tools/make_thumbs.sh` → `make_atlas.py`,
   portadas = obra de nivel 1 con más fama de cada pintor con etapa). El e2e vigila el presupuesto de
   arranque (peticiones/KB): el atlas crece de 17 a ~80 hojas; cargar por tramo de época.
3. **Camino.** Pintores con etapa: los que tengan ≥ 4 obras de nivel 1 (hoy 106); invitados el resto (los 13
   rusos de 3 obras, Liotard, Greuze…). `section` por tramos con sentido (Florencia temprana, Alto
   Renacimiento, Venecia, Norte, España del Siglo de Oro…) en un movimiento con > 4 pintores con etapa
   (todos ahora): tabla a mano en `tools/catalog_data.py` o en `catalogo/tramos.json`. Orden dentro del
   tramo: de más distinto a más parecido, no cronológico (hoy `order` = año de nacimiento, provisional).
   La rama «a fondo» usa las obras de nivel 2 del mismo tramo. No empezar por Leonardo (decisión 6).
4. **Validación y pruebas.** `tools/validate_catalog.py app` ya comprueba años (< 1930) y muerte (< 1956);
   añadir: `level` ∈ {1, 2}, 3-6 obras de nivel 1 por pintor con etapa, `museum` y `source.wikidata`
   presentes, ids únicos, imágenes de la selección presentes. `tests/engine.test.js`/`oleada*.test.js` usan
   fixtures con ids `a<N>`: mantener las fixtures (motor puro) y añadir una prueba que cargue el catálogo real
   y compruebe que cada pintor con etapa tiene ≥ 2 `learn` y ≥ 1 `new` sin `spoiler`. Revisar `spoiler`
   (firma visible) y `attributed` en las obras nuevas: pasada visual con `tools/contact_sheets.py`.
5. **Estado guardado.** El progreso de usuarias guarda ids de obra y pintor: migración de esquema en
   `app/js/state` (v6) con la tabla `ids_antiguos.json` (`a<N>` → `w<QID>`), y los pintores nuevos empiezan
   sin progreso.
6. **Fichas y lecciones.** La ficha de obra (decisión 6 de María) se alimenta de `museum`, `city`, `inSpain`,
   `technique`, `dimensions`, `year` y, cuando se escriba, `about` (2-3 líneas con fuente de museo) y
   `look`. Las fichas de pintor de `contenido/lecciones/` (Leonardo, Rafael, Velázquez) se montan por id de
   pintor sin cambios; las nuevas siguen su plantilla.
7. **Textos pendientes de escribir** (no automatizables): `about` y `look` de 1.180 obras (empezar por las 637
   de nivel 1), `hint`/`traits`/`similarTo` de los ~70 pintores nuevos con etapa.

## Imágenes en el despliegue (Render)

Decisión de María: las imágenes **no entran en el repo ni en su PC**; Render las baja de la release al construir.
- Paquete: `https://github.com/medinamaria90/Mirada/releases/download/catalogo-img/app-img-1200.zip` (+ `app-img-1200.sha256`), lo genera el paso `pack`.
- Script: `bash tools/fetch_images.sh <carpeta>` (solo bash, curl, sha256sum, unzip o `python3 -m zipfile`; sin `gh` ni token): descarga, comprueba el sha256, valida que el zip solo trae `w<QID>.jpg`, descomprime y falla con mensaje claro si algo no cuadra (descarga imposible, sha distinto, menos de 1.000 imágenes).
- **Comando de construcción de Render para la migración** (hoy sigue siendo `echo "sin compilación: sitio estático"`; NO cambiarlo hasta migrar): `bash tools/fetch_images.sh app/img`. El directorio de publicación sigue siendo `app`. `app/img/` deberá estar en `.gitignore` cuando el catálogo grande sustituya al actual (hoy `app/img/` contiene las 235 de 1000 px del catálogo viejo y el atlas `app/img/s/`: el zip las pisaría solo si coincide el nombre, y los ids son distintos, así que conviven; el atlas habrá que regenerarlo en la migración).
- Ventana de riesgo: al volver a ejecutar `pack`, `gh release upload --clobber` borra y sube el zip: durante unos segundos puede no estar o no cuadrar con el sha; un despliegue de Render en ese instante fallaría con mensaje claro y basta reintentar.


## Migración de la app al catálogo grande (hecha, parte A: datos, motor y estado)

Sustituye al plan de arriba (que queda como historia). Qué se hizo y dónde está:
- **Datos**: `tools/catalog_from_pipeline.py` (obras.json + pintores.json + `tools/camino.json` + textos de `tools/catalog_data.py` por
  `tools/ids_antiguos.json`) → `app/data/catalog.json`, `catalog-text.json`, `catalog-ficha.json` y `app/js/state/legacy-ids.js`.
  Contrato en `docs/SPEC.md` §4 ter. `ids_antiguos.json` (161 de las 235 obras antiguas) se generó cruzando pintor + imagen
  (huella de la miniatura contra las imágenes del paquete; título cuando coincidía): las 74 restantes (Matisse, rusos sin
  equivalente…) no tienen obra nueva y su progreso se pierde.
- **Imágenes y atlas**: fuera del repo. `bash tools/fetch_images.sh app/img` (comando de construcción de Render, sin cambios) baja
  `app-img-1200.zip`, comprueba el sha256 y **pinta el atlas** (86 hojas, 15,5 MB, ~50 s) con `tools/make_atlas.py`; necesita
  python3 con Pillow (lo instala con pip si falta; `MIRADA_SKIP_ATLAS=1` lo omite). No se sube un `app-atlas.zip` desde `pack`
  a propósito: las coordenadas de las miniaturas salen del catálogo del repo (`tools/atlas_layout.py`), y un zip generado en
  Actions podría quedar desfasado respecto al catálogo que se despliega; pintarlo al desplegar garantiza que encajan.
- **Pruebas locales**: `bash tools/fetch_images.sh <carpeta temporal>` + `MIRADA_IMG_DIR=<carpeta> bash tests/e2e.sh …`
  (`tools/serve_local.py` monta las imágenes sin copiarlas a `app/img/`).
- **Pendiente de revisión visual**: las obras nuevas no tienen marcado `spoiler` (firma visible) ni `attributed`; solo lo heredan
  las 9 ya revisadas. Pasar hojas de contacto antes de subir el nivel de confianza.

### 27/11 — Fra Angelico necesita obras

Solo tiene 2 obras en el catálogo (las 2 «learn»); como invitado necesita ≥ 3 (2 «learn» + ≥ 1 «new»).
`pipeline/out/candidates/fra-angelico.json` trae 30 candidatas. Se han forzado en `extra.json` la *Adoración de los Reyes
Magos* (Q3531531), la *Anunciación de Cortona* (Q2376881) y el *Retablo de San Marcos* (Q1215809). Próximo pipeline: `candidates`
→ `seleccionar` → `download` → `pack`, y quitar `fra-angelico` de `PENDING_WORKS` en `tools/validate_catalog.py`.
