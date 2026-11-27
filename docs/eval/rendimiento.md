# Rendimiento y fluidez

27/11/2026 · Auditoría con arreglos publicados. Lo que notaba María en su Xiaomi (Chrome, app instalada): toques que
tardaban 1–2 s, hojas que se abrían y se cerraban solas y lag general.

## Cómo se ha medido

- Playwright con Chromium, Pixel 7 emulado (412×915, táctil), **CPU ×4 más lenta** (`Emulation.setCPUThrottlingRate`)
  y, en el arranque, **red 4G lenta** (150 ms de latencia y 1,6 Mbit/s). Es lo más parecido a un Android de gama media.
- Estado avanzado: 12 pintores dominados, con aro de niveles y 60 cuadros en la Colección.
- «Antes» es `main` del 27/11 por la mañana (a977098); «después», esta rama. Mismas imágenes y mismo atlas en los dos.
- Scripts (fuera del repo): `measure.mjs` (arranque, reposo, scroll, toques, música, memoria), `repro.mjs` (doble
  toque) y `music2.mjs`. El «% ocupado» del hilo principal incluye el bucle de medida (unos 20 puntos con todo quieto).

## Causa principal: el mapa vivo tenía el hilo principal ocupado al 100 %

Con el mapa quieto en pantalla había **unas 200 animaciones infinitas** dentro de los SVG del paisaje: 168 estrellas
titilando (también de día, con la capa invisible), 13 brillos del río, el surtidor, las aspas del molino, las luces que
parpadean y el halo de 7 aros. Una animación dentro de un SVG en línea no la hace la tarjeta gráfica: en cada fotograma
el navegador recalcula estilos y geometría del SVG en el hilo principal. Con un móvil medio no daba abasto: **83 tareas
largas en 15 s (hasta 427 ms)**. Cualquier toque esperaba en esa cola. Esa era la «tardanza de 1–2 s» y el lag.

Segunda causa: **la luz del reloj del juego**. Cambiaba `--day-night` en el mapa entero cada 4 s durante amanecer y
atardecer (5 de cada 24 minutos) y cada cambio recalculaba los estilos de unas 3.000 piezas: **un parón de 190–230 ms
cada 4 s** (más si se había recorrido el mapa entero, porque todos los paisajes estaban ya en la página).

## Causa de «se abre y se cierra sola»

Reproducido con doble toque en un pintor con aro: la tarjeta se abre con una copia del nodo justo debajo del dedo, y
el segundo toque cae en esa copia (que cierra la tarjeta) o en el fondo de la hoja. Con el móvil lento, un toque
impaciente al segundo hacía lo mismo: la hoja aparecía justo antes de que llegara el segundo toque. Además, la tarjeta
se cerraba con cualquier evento `scroll` o `resize`: un resto de desplazamiento que llegaba tarde con el hilo ocupado, o
la barra del sistema cambiando el alto, la cerraban nada más abrirse.

No se han visto dobles disparos táctil + clic (todo va por `click`), ni recargas de `load-recovery.js`, ni `hashchange`
que cierren hojas sin cambiar de pantalla.

## Arreglos, por orden de impacto

1. **Animaciones fuera del SVG grande y solo donde se ve.** Brillos del agua, surtidor, aspas y humo salen a un SVG
   diminuto por pieza, en su sitio (`liftMovers`, `map-land.js`). Las estrellas van en 4 capas por tanda de titileo
   (titila la capa entera) y las luces en una capa por tanda (`map-sky.js`, `map-land.js`). El halo del aro va en su
   propio SVG (`deep-badges.js`). Así las anima la tarjeta gráfica. Además, solo se animan en el tramo que se ve
   (`.is-seen`, `map-life.js`), y de día no titilan estrellas ni luces apagadas (`.is-night`, `.is-lit`). El aspecto
   es el mismo: las capturas de día, noche y atardecer salen idénticas píxel a píxel.
2. **Luz tramo a tramo.** `--day-night` y `--day-dusk` se ponen en los tramos que se ven, en pasos de 0,05 (el ojo no
   los distingue), y esperan mientras se toca o se desplaza el mapa (1,5 s de calma). El tramo que entra en pantalla
   la recibe al quedar quieto.
3. **Doble toque.** Tocar el fondo o la copia del nodo solo cierra pasados 600 ms desde que se abre. Los botones de
   cerrar cierran siempre (`modal-slot.js`, `artwork-sheet.js`). La tarjeta del pintor solo se cierra si el mapa se
   mueve más de 40 px o gira la pantalla (`level-card.js`).
4. **Precarga en reposo** de la tarjeta, las hojas y carteles del mapa, las historias, el visor, Colección y Perfil,
   con sus estilos (`warm-up.js`). Antes, el primer toque esperaba a la red: cada módulo y cada hoja de estilo, una ida
   y vuelta revalidada por el service worker.
5. **Escena de la vida de paso**: el sendero y los árboles se miden una vez por paisaje (`map-scene.js`).
6. **Fugas de memoria**: Perfil → Ajustes dejaba en `window` un aviso que retenía la pantalla entera en cada visita
   (`su-section.js`), y los paisajes de una portada que ya se había ido seguían vigilados (`map-land.js`).
7. **Respuesta al dedo** en la barra de abajo (`:active`). El resto de lo pulsable ya la tenía, pero con el hilo
   ocupado tampoco se veía.

## Cifras

### Mapa en reposo (15 s, CPU ×4)

| | Antes | Después |
|---|---|---|
| Animaciones en marcha (día / atardecer / noche) | 199 / 257 / 199 | 22 / 41 / 38 |
| Hilo principal ocupado, de día | 102 % | 29 % |
| Tareas largas de día (n.º, la peor) | 83, 427 ms | 0 |
| Tareas largas al atardecer | 103, 658 ms | 5, 290 ms (y ninguna mientras se toca) |
| Tareas largas de noche | 89, 268 ms | 0 |
| Fotogramas por segundo con el mapa quieto (día / noche) | 18 / 20 | 60 / 60 |

### Desplazar el mapa (3 pasadas con el dedo)

| | Antes | Después |
|---|---|---|
| FPS de día | 41 | 59 |
| FPS de noche | 26 | 59 |
| Fotogramas de más de 33 ms (día / noche) | 32 / 60 | 1 / 1 |
| Peor fotograma (día / noche) | 333 / 583 ms | 183 / 217 ms |

### Toques (CPU ×4). INP: lo que tarda el navegador en pintar la respuesta. «A la vista»: hasta que se ve la hoja

| Toque | INP antes | INP después | A la vista antes | A la vista después |
|---|---|---|---|---|
| Mapa: tarjeta del pintor | 176 ms | 64 ms | 896 ms | 693 ms |
| Mapa: cerrar la tarjeta tocando fuera | 232 ms | 144 ms | 280 ms | 139 ms |
| Mapa: cartel de un tramo | 208 ms | 48 ms | 828 ms | 270 ms |
| Mapa: hoja de época cerrada | 624 ms | 56 ms | 1.266 ms | 388 ms |
| Hoja: cerrar con la X | 472 ms | 224 ms | 575 ms | 227 ms |
| Historia: abrir desde la tarjeta | 256 ms | 88 ms | 960 ms | 337 ms |
| Historia: pasar tarjeta | 368 ms | 120 ms | — | — |
| Entrar en una parada | 144 ms | 40 ms | 353 ms | 137 ms |
| Abrir Colección | 136 ms | 40 ms | 366 ms | 212 ms |
| Colección: abrir un cuadro | 64 ms | 64 ms | 378 ms | 397 ms |

La tarjeta del pintor sigue tardando unos 700 ms en verse porque pide la historia del pintor (`loadStory`) en ese
momento. Es el siguiente paso si se quiere bajar más.

Hecho (27/11): la tarjeta se pinta sin esperar y los círculos se completan con la historia al llegar; el mapa precarga
la historia de la parada actual y de los pintores con niveles que se van a ver (`story-prefetch.js`). El humo lo
comprueba con la historia retrasada 2,5 s: la tarjeta sale en menos de 0,6 s.

### Doble toque (reproducción, CPU ×4)

| Segundo toque a los… | 120 ms | 300 ms | 600 ms | 1.000 ms |
|---|---|---|---|---|
| Antes, tarjeta del pintor | abierta | abierta | abierta | **se abre y se cierra** |
| Después, tarjeta y hoja | abierta | abierta | abierta | ver nota |

Nota: a los 1.000 ms la hoja lleva casi un segundo a la vista, así que ese toque se toma como «cerrar» a propósito.

### Arranque (4G lenta, CPU ×4, mediana de 3)

| | Antes | Después |
|---|---|---|
| Primer pintado (FCP) | 656 ms | 652 ms |
| LCP | 2,92 s | 3,01 s |
| Mapa listo | 3,12 s | 3,37 s |
| Tareas largas en el arranque | 5 (855 ms) | 7 (1.048 ms) |
| Descarga hasta 6 s después | 824 kB, 97 peticiones | 917 kB, 137 peticiones |

El arranque queda igual: lo manda la red. La diferencia de peso y peticiones es la precarga en reposo, que llega
después de pintar. El «después» incluye además lo nuevo de `main` (cuenta en la nube). El reparto: código 305 kB,
catálogo 180 kB, atlas de miniaturas 341 kB, letras 32 kB, estilos 37 kB y paisajes SVG 25 kB.

### Memoria (5 min de uso: tarjeta, hoja, Colección, Perfil, ficha y mapa, en bucle; 24 vueltas)

| | Antes | Después |
|---|---|---|
| Nodos del DOM | 5.136 → 39.067 | 4.943 → 18.179 (la portada actual, con más paisajes ya cargados) |
| Escuchas de eventos | 53 → 715 (unas 28 más por vuelta) | 69 → 73 |
| Memoria de JS | 4,3 → 6,9 MB | 4,6 → 7,0 MB |
| Animaciones al volver al mapa | 202 → 203 | 27 → 12 |

La fuga era Perfil → Ajustes: cada visita dejaba su pantalla entera retenida. Ojo al medir: los elementos que devuelve
`page.waitForSelector` de Playwright quedan retenidos por la consola de DevTools y simulan una fuga de la portada
entera; hay que soltarlos (`dispose()`).

### Música (CPU ×4, sin animaciones para aislarla)

Sintetizar las cuerdas al empezar cuesta unos 250 ms de script repartidos en los 12 primeros segundos, unos 20 ms por
segundo y sin tareas largas propias. Después, menos de 0,5 % del hilo principal. No es una causa del lag. No se ha
tocado.

### Guardado del progreso

Guardar el estado entero en `localStorage` en cada cambio cuesta unos 0,5 ms con un progreso muy grande (108 kB), unos
2 ms en un móvil medio. No compensa retrasar el guardado (con riesgo de perder progreso si se cierra la app). Se queda
como está.

## Qué notará María

- El mapa responde al dedo enseguida: nada de 1–2 s de espera, ni de día, ni de noche, ni al atardecer.
- El mapa se desplaza fluido (60 fps) con toda la vida: agua, molinos, estrellas y luces se ven igual que antes.
- Un doble toque o un toque impaciente ya no abren y cierran la tarjeta o la hoja.
- La tarjeta del pintor ya no se cierra sola nada más abrirse.
- La segunda vez que se abre algo (tarjeta, cartel, historia, Colección, Perfil) no espera a la red.

## Pruebas

`tests/rendimiento-mapa.test.js`: falla si una animación del mapa sigue con la pestaña oculta, si al salir de la
portada queda algún temporizador o escucha, si se anima o recibe luz un tramo que no se ve, si una animación sin fin
del CSS del mapa no está limitada al tramo a la vista, y si el segundo toque de un doble toque cierra la hoja.
