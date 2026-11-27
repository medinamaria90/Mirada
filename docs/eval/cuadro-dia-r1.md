# Evaluación independiente · Cuadro del día · ronda 1 (27/11)

Evaluador independiente (no ha construido nada ni modifica código). Producción (sfumato.dibulios.com) no era
accesible desde el contenedor (el proxy bloquea el dominio), así que se probó **el mismo commit en local**
(`tools/serve_local.py` con las imágenes de la release `catalogo-img` y el atlas pintado con `make_atlas.py`).
Playwright + Chromium headless `--mute-audio`, táctil, 360 / 412 / 768 px, claro y oscuro, con partida sembrada
(v10 → migra) y como invitado (localStorage vacío). `node --test tests/`: 0 fallos.

Recorrido hecho en cada combinación: portada con el chip pendiente → cuadro → 3 fallos (Leonardo, Rafael, Piero) →
acierto (Botticelli) → historia de 3 tarjetas → pantalla de hecho → Compartir → Conocer / Lo conocerás → portada con
chip hecho → `#reto-diario`. En cada paso se tocó la imagen. Además: partida a medias + recarga, salir y volver a la
portada, y revisión de los 14 días del calendario (recorte ×3 y ×1,6 de cada uno sobre la HD, cuadro entero y región de
la tarjeta 1).

## Notas

| # | Criterio | Nota |
|---|---|---|
| 1 | Material 3 (equivalente web) | 8 |
| 2 | UX | 8 |
| 3 | Accesibilidad | 8 |
| 4 | Rendimiento | **7** |
| 5 | Adaptativo | 8 |
| 6 | Pulido | 8 |
| 7 | Originalidad | 9 |
| 8 | Calidad técnica | 8 |
| 9 | Calidad de los textos de las historias | **7** |
| 10 | Ninguna pista ni recorte destripa la respuesta | **6** |

## Veredicto: NO APRUEBA

Tres criterios por debajo de 8 (4, 9 y 10) y un **fallo grave (trampa)**: en los pasos 3 y 4 el visor deja leer la
firma del pintor en al menos tres días del calendario.

## Fallos graves

1. **Firma legible antes de acabar (trampa).** En los pasos 3-4 se enseña el cuadro entero y, al tocarlo, el visor
   (`ui/viewer.js`, con su lupa) carga la imagen de 1200 px. En ella se leen sin esfuerzo:
   - día 2, Arnolfini: «Johannes de eyck fuit hic 1434» encima del espejo;
   - día 9, *Impresión, sol naciente*: «Claude Monet 72» abajo a la izquierda;
   - día 12, *Paseo a orillas del mar*: «J Sorolla B 1909» abajo a la izquierda.
   Probables también (revisar): Vermeer (día 7, arriba a la izquierda) y Rembrandt (día 14). Evidencia:
   `cuadro-dia-r1/09-firmas-legibles-pasos-3-4.png` (recortes de la imagen que sirve el visor). Quien falla dos veces
   puede leer el nombre y acertar. Los recortes del paso 1 de los 14 días están limpios (sin firma ni texto).

## Lo que está muy bien

- La mecánica es propia y elegante: el detalle ×3 que se abre a ×1,6 y luego al cuadro entero, con las pistas como
  pastillas que se suman. La transición animada del recorte es preciosa.
- La historia vuelve al detalle del principio («¿Recuerdas…?»): cierra el círculo y enseña a mirar.
- La lupa de los pasos 1-2 enseña exactamente el mismo recorte; el visor de los pasos 3-4 no muestra título ni autor.
- El texto de compartir no destripa nada («Sfumato · Cuadro del día 1 / 🖼️ 🟥🟥🟥🟩 / enlace»).
- Partida a medias: recargar no regala intentos. El progreso se guarda una sola vez (`progress.cuadros`), suma XP
  (0/50 → 10/50) y racha (2 → 3 días). `#reto-diario` lleva a la pantalla de hecho. Ningún error de consola.
- Invitado: juega sin bienvenida, ve la historia y después la invitación («Ahora no» / «Empezar a jugar»); «Lo
  conocerás en el camino» abre la ficha bloqueada.
- Los nombres museo «delatores» ya están tapados (Marmottan → «Un museo de París», Museo Sorolla → «Una casa-museo de
  Madrid»).

## Cambios, por prioridad

### P0 · imprescindibles para aprobar

1. **Tapar la firma en los pasos 3-4** (criterio 10, fallo grave).
   - `contenido/cuadro-del-dia/calendario.json`: campo opcional `signature: [x0, y0, x1, y1]` (de 0 a 1) en cada día
     con firma o inscripción visible (como mínimo días 2, 9 y 12; revisar 7 y 14 y todos los nuevos).
     `tools/sync_cuadro_dia.py` lo vuelca a `app/data/dia/<n>.json` y valida que el `focus` del paso 1 no lo pise.
   - `app/js/ui/cuadro-frame.js`: mientras la partida no ha acabado, pinta sobre esa caja un parche desenfocado
     (un `<span>` con `backdrop-filter: blur()` o el mismo recorte de la imagen pequeña muy borroso), en el marco y en
     el visor grande.
   - Más sencillo y suficiente como primer paso: en `openLarge` sin `reveal`, abrir el visor **sin lupa** y servir la
     imagen pequeña (no la de 1200 px) hasta acabar, o abrir la propia lupa del juego con el cuadro entero a zoom 1
     (`openLoupe(work, focus, 1)`) en vez de `viewer.js`. Aun así, Monet y Sorolla firman grande: hace falta el parche.
   - Prueba en `tests/cuadro-dia.test.js`: ningún día con `signature` tiene el recorte del paso 1 ni el del 2 tocándola.

2. **Peso de la imagen del detalle** (criterio 4). Las HD que se cargan con `fetchpriority="high"` pesan
   0,8-2,9 MB (día 11: 2,9 MB, 3840 px; día 1: 2,4 MB). En datos móviles el detalle tarda y gasta.
   - `tools/sync_cuadro_dia.py` (o el paso «hd» de `pipeline/hd.py`): generar al desplegar un recorte del detalle
     (la caja ×1,6 alrededor del `focus`, que contiene la ×3) a ~1000 px de lado y calidad 80 (≈120-200 KB):
     `img/dia/<n>-detalle.jpg`.
   - `app/js/ui/cuadro-frame.js`: en los pasos 1-2 usar ese recorte (la caja se recalcula respecto al recorte); en los
     pasos 3-4 y en la pantalla de hecho basta la de 1200 px. La HD solo para la historia si una tarjeta hace zoom ≥ 2.

3. **Textos** (criterio 9). Cambios concretos en `contenido/cuadro-del-dia/calendario.json`:
   - **Día 1**, tarjeta 1: explicar a los Médici → «Era Botticelli, el pintor de los Médici (la familia que mandaba
     en Florencia)…». Para no pasar de 180, quitar «¿Recuerdas el detalle del principio?» y empezar «Esos dos que
     soplan son los vientos…».
   - **Día 1**, pista de año «c. 1478–1485» (sale de `catalog.json`): dudoso. Los Uffizi y la Wikipedia la fechan
     hacia 1484-1486 (c. 1485); 1478 es más bien la fecha de *La primavera*. Comprobar y corregir en el catálogo
     (dato de arte; se ve en la pista, en la pantalla de hecho y en la ficha).
   - **Días 3 y 4**: Picasso aparece sin presentar (vivió hasta 1973, no está en el camino). «el pintor Picasso,
     siglos después,…». Día 4: lo de «Picasso lo tuvo muy presente al pintar el Guernica» es discutible; lo
     documentado es su *Masacre en Corea* (1951), que cita la composición. Cambiar a eso o quitarlo.
   - **Una idea por tarjeta**: día 3 (cruz de Santiago + 58 versiones de Picasso), día 10 (partitura + Felipe II),
     día 14 (barniz + recorte de 1715), día 11 (cielo + ciprés). Quedarse con la mejor de cada una o pasar a una
     cuarta tarjeta (las historias admiten hasta 5).
   - **Día 5**: las tarjetas 1 y 2 vuelven a la misma mano de Cristo. La 2 puede centrarse solo en la luz (la
     diagonal que entra por arriba como un foco), y la cita de Miguel Ángel («el gran Miguel Ángel») ir en la 1.
   - **Día 6**: Peruggia no era exactamente «un empleado»: era un vidriero que había trabajado en el Louvre. «un
     vidriero italiano que había trabajado en el museo».
   - **Día 12**: tarjeta 1 «el pintor valenciano de la luz del Mediterráneo» y tarjeta 3 «Lo llamaban "el pintor de
     la luz"» dicen lo mismo. Cambiar el final de la 3 por un dato nuevo (p. ej., que protegía los lienzos del viento
     con estructuras y velas en la playa) o acabar en «…antes de que cambiara».
   - **Día 2**: «es un símbolo de fidelidad» → «se suele leer como un símbolo de fidelidad» (es una interpretación).
   - **Fórmula repetida**: las 14 primeras tarjetas empiezan igual («Era X, el… ¿Recuerdas el detalle del
     principio?»). Al tercer día suena a plantilla. Mantener el gancho y variar la forma: «Esos angelitos del
     principio…», «El perrito que viste al empezar…», o la pregunta solo en uno de cada dos días.
   - **Pista de época** de los días 2 y 10: «Manierismo y Renacimiento del Norte · s. XV–XVII» es el nombre del
     tramo del camino, pero confunde con Van Eyck (1434) y el Bosco (c. 1500), que no son manieristas. Añadir en el
     calendario un `era` opcional por día que mande sobre el del movimiento: «Pintura flamenca · s. XV» (día 2),
     «Pintura flamenca · hacia 1500» (día 10).

### P1 · para subir a 9

4. **Volver a la portada no conserva la posición del mapa** (UX). Al salir del cuadro (X) el mapa se desplaza unos
   360 px (scrollY 14604 → 14244) y tras la pantalla de hecho aparece en otro tramo (se ve Leonardo y no «Tú»).
   `ui/shell.js` / la pantalla de inicio: guardar y restaurar el scroll del camino al volver de `#cuadro-del-dia`, o
   centrar siempre en «Tú».
5. **La historia se abre encima del resultado a los 0,9 s** (`REVEAL_MS`, `renderCuadroDone` con `fresh`). No da
   tiempo a disfrutar del «A la segunda» ni del botón verde. Proponer: mostrar 1,5-2 s la pantalla de hecho (con los
   cuadritos animándose) y abrir la historia después, o abrirla con un toque en un botón destacado «Ver la historia»
   la primera vez.
6. **Accesibilidad**:
   - `app/css/cuadro-dia.css` `.cdd-hint-k` a 0,74 rem (11,8 px) y en mayúsculas: subir a 0,8 rem como mínimo.
   - El texto de cada tarjeta de la historia está dos veces sin ocultar (`p.story-text` y la región viva `sr-only`):
     el lector puede leerlo dos veces. Poner `aria-hidden="true"` en el visible mientras la región viva lo anuncia, o
     anunciar solo «Tarjeta 2 de 3» en la viva (`ui/story-core.js`).
   - Fallo al elegir: hoy solo se tacha el nombre. Añadir una sacudida corta del botón (respetando movimiento
     reducido) y `navigator.vibrate?.(30)` para que el fallo se sienta además de verse.
7. **Pantalla de hecho a 360 px**: «El siguiente, en 12 h» queda bajo la barra de navegación y hay que desplazar.
   Reducir el marco en esta pantalla (`.cdd-done .cdd-frame { width: min(100%, 70vw, 42vh) }`) para que todo quepa
   en 800 px de alto.
8. **768 px**: la pantalla del juego queda en una columna estrecha con mucho vacío lateral. Aceptable, pero en
   tableta el marco podría crecer hasta ~480 px (`--cuadro-frame-max`) y las 6 opciones ir en 3 columnas.

## Notas de lo comprobado

- Tiempo de apertura desde el chip: 150-200 ms (en local). Miniatura del chip pintada a los ~650 ms.
- Chip de la cabecera: 48 × 48 px de zona táctil, etiqueta «Cuadro del día, pendiente» → «…hecho: a la cuarta».
- Sin desbordamiento horizontal en ningún ancho; el juego cabe sin desplazar en 360 × 800 en los 4 pasos.
- Ningún «ayer» ni «mañana» en los textos; todas las tarjetas ≤ 180 caracteres (máx. 174).
- Datos revisados y correctos: moneda de 10 céntimos (Venus), «Johannes de eyck fuit hic 1434», 58 versiones de
  Las meninas, 1814 para *El 3 de mayo*, la mano de Adán y la luz de pago en San Luis de los Franceses, robo de 1911,
  lapislázuli y *tronie*, «Pon Impresión» (1874), la partitura del Jardín, Soult y el canje de 1941, el recorte de La
  ronda de noche en 1715.

## Capturas (`docs/eval/cuadro-dia-r1/`)

01 portada con el chip pendiente (360, claro) · 02 paso 1, detalle ×3 · 03 paso 3, cuadro entero y año ·
04 paso 4 con museo (412, oscuro) · 05 historia, tarjeta 1 · 06 pantalla de hecho (360, claro) · 07 invitado,
«Lo conocerás en el camino» · 08 hecho a 768 (oscuro) · 09 firmas legibles en la imagen del visor (Monet,
Van Eyck, Sorolla).
