# Plan · composición del camino (arco, tramos, sendero)

Planificador, 27/11. Base: `path-layout.js`, `path-signs.js`, `path-map.js`, `mapa-carteles.css`, `main.css`,
capturas a 360 px (Renacimiento, claro). Unidades: diseño de 390 de ancho (1 u ≈ 0,92 px a 360, 1,06 px a 412).

## 1. Diagnóstico

- **Orden de lectura roto.** La tablilla de tramo cuelga *bajo* su primer pintor (`TRAMO_BOX` 58–106 bajo el nodo) y
  pegada a él: se lee como «etiqueta de Botticelli», no como «aquí empieza el Primer Renacimiento». En tramos a mitad
  de época («Alto Renacimiento») cae a medio camino entre dos pintores y no se sabe de cuál es.
- **El tramo no ocupa sitio en el trazado.** Las paradas van cada `STEP`=172 pase lo que pase; la tablilla se
  encaja en el hueco que haya (o se sube a la fuerza bajo el arco, `ARCH.gap`=24). Por eso se amontona.
- **Arco = banda flotante.** `.arch-band` es un rótulo en forma de arco *encima* de los pilares (lift 52 + alto 82):
  tapa 52 u de sendero justo tras la puerta y no pertenece a la puerta. «s. XV–XVI · 2/9» mezcla dato y progreso.
- **Completado = icono suelto.** `.sign-check` (círculo dorado con ✓) pegado al nombre; la tablilla no cambia.
- **Sendero de autopista.** Borde 26 + firme 20 de trazo perfecto y `trail-thread` (hilo dorado de 3 u por el centro)
  en lo recorrido = raya central. Arranque en la plaza con `stroke-linecap: round`: acaba en punta redondeada.

## 2. Jerarquía de hitos (tres familias, una forma cada una)

| Hito | Forma | Lugar | Pulsar abre |
|---|---|---|---|
| Época | **Puerta con lápida**: el rótulo es la piedra del dintel | Sobre el sendero, que pasa *por debajo* | Presentación de la época (`intro`) |
| Tramo | **Mojón**: estela de piedra de remate redondo en un ensanche del sendero, con su tablilla de madera al lado | Sobre el sendero, como una parada | Cartel del tramo (`cartel`) |
| Pintor | Medallón redondo (sin cambios) | Sobre el sendero | Ficha / ronda |

El tramo pasa a ser **una parada propia** (en el trazado y en el DOM, sin ronda): así el orden al subir es siempre
puerta → mojón → pintores → mojón → pintores, y las distancias se controlan en un solo sitio. No es pulsable para
jugar; no cuenta en «Tu parada» ni en `keys.current`.

## 3. Composición y medidas (desde la puerta, subiendo)

Se sustituye «nodo cada STEP» por una **secuencia de pasos** con avance propio. `eraLayout(n, …, marks)` recibe los
índices de pintor que abren tramo y acumula `y`:

| Tramo del trazado | Avance (u) | Por qué |
|---|---|---|
| Pie del tramo → puerta (`GATE_Y`) | 44 (igual) | — |
| Puerta → borde alto de la lápida | 118 (`ARCH.lift` 34 + `ARCH.h` 84) | lápida integrada, más baja que hoy |
| Lápida → centro del mojón | **64** (aire 36 + medio mojón 28) | nunca pegado al arco |
| Mojón → primer pintor | **120** | el nombre del pintor (±36) y la tablilla del mojón no se tocan |
| Pintor → pintor | **172** (`STEP`, igual) | ~4 paradas por pantalla, validado |
| Pintor → mojón (a mitad de época) | **112** | el mojón se lee antes del pintor que sigue |
| Primera época (sin puerta propia, arco en la muralla) | lápida → mojón 64 desde `START_ARCH` | mismo ritmo |

Constantes nuevas en `path-layout.js`: `HITO = { h: 56, half: 28, before: 112, after: 120, afterArch: 64 }`;
`ENTRY.pad` y `FIRST_ENTRY.pad` se recalculan para que el primer paso tras la puerta sea el mojón (si la época abre
con tramo) o el pintor a 120 de la lápida (si no tiene tramos). Se elimina `TRAMO_BOX` y `tramoSign()` bajo el nodo.

**Mojón (tramo).** Estela 34×46 u centrada en el sendero (encima del firme, como un nodo), sobre un **ensanche**
circular del sendero de r 24 (mismo color de firme y borde: una plazoleta). La tablilla de madera (nombre del tramo,
1–2 líneas) cuelga hacia el lado libre, **el mismo lado donde cuelgan los nombres de los pintores** (coherencia de
lectura). Zona táctil: estela + tablilla en un solo `<button>`, ≥ 48×48 px. El sendero entra recto ±20 u por el ensanche
(punto `v` como los puentes) para que el mojón no quede en una curva.

**Distancias mínimas (nuevas pruebas en `tests/camino-forma.test.js`):** nodo–nodo ≥ 172; mojón–nodo ≥ 112;
lápida–mojón ≥ 36 de aire; extremo de puente ↔ nodo o mojón ≥ 40 (los puentes solo entre dos *pintores* del mismo lado,
nunca con un mojón dentro: `bridgeSlots` veta `k` si `k+1` abre tramo); rama: `branchSlots` veta también los pintores
que abren tramo (su cartel, `BRANCH_BELOW` 118, caería sobre el mojón). Cartel de rama ↔ tablilla de mojón ≥ 24.

**Pantallas de rama.** Mismo esquema: lápida con el nombre de la rama, y en escuelas con varias épocas un mojón por
época («Barroco», «Rococó»…), antes de sus pintores. Las temáticas (Gótico, Estampa) sin mojones. Revisar a mano: 
`#rama/escuela-rusa` (2 ríos), `#rama/descubre-barroco`, Gótico.

## 4. Arco de época (lápida en el dintel)

- `eraGate` gana el **dintel**: los dos pilares actuales + una losa de piedra que los une (alto 84, ancho
  `min(268, 2·(x−EDGE))`), dibujada en SVG con `land-front`; el rótulo HTML se centra **dentro** de la losa. El sendero
  pasa bajo el vano (vano libre 52 u entre pilares y losa): se ve entrar y salir; nada flota encima del camino.
- Contenido, dos niveles: **nombre** (600, 1,1 fs, máx. 2 líneas con `text-wrap: balance`) y **siglos** (500, 0,76 fs).
  Progreso **fuera del texto**: una ranura grabada bajo los siglos (barra de 3 u, ancho 60 % de la losa, fondo
  `--map-sign-line`, relleno `--accent`), con `aria-label` «2 de 9 pintores». Nada de «8/9».
- Legible a 360: «Manierismo y Renacimiento del Norte», «Simbolismo y las vanguardias» en 2 líneas dentro de 268 u;
  si no caben, `--map-fs` local −8 % (nunca corte ni elipsis). Probar las 10 épocas a 360 y 412 en la auditoría e2e.
- Estados: abierta (piedra clara, filete del color de la época en el borde alto); **completa**: la losa se dora
  (`--map-sign-done` de fondo, filete `--gold`, letras `--gold-text`) y la ranura se sustituye por una rama de laurel
  grabada a lo ancho (forma parte de la losa, no es un icono suelto); cerrada: piedra apagada (`--map-locked`) y el
  candado a la izquierda de los siglos.
- Primera época: la losa va en la puerta de la muralla (`START_ARCH`), misma pieza.

## 5. Estado completado del tramo (sin iconos sueltos)

La propia pieza cambia: estela de piedra → **estela con inscripción dorada** (cara interior `--map-sign-done`, filete
`--gold`) y tablilla de madera con **cinta dorada** en el canto inferior (`box-shadow: inset 0 -3px 0 var(--gold)`) y
nombre en `--gold-text`. Abierto en curso: estela clara con filete del acento. Cerrado: estela y tablilla apagadas,
nombre en `--map-sign-ink-2`, sin candado (lo dice el primer pintor cerrado). Se borra `.sign-check` del tramo y del
arco (la rama puede conservar su cifra 9/9 con la cinta, mismo lenguaje).

## 6. Sendero

- **Fuera** `trail-thread` y la variable `--map-trail-thread`.
- Capas: `trail-shade` (28, sombra) → `trail-rough` **nuevo** (30, `--map-trail-edge`, opacidad .55,
  `stroke-dasharray: 13 7 5 11`, extremos redondos: borde festoneado irregular) → `trail-edge` (25) → `trail-fill`
  (20) → `trail-grain` **nuevo** (18, `stroke: url(#map-grain)`: patrón de motas 9×9 u definido una sola vez en un
  `<svg><defs>` oculto del mapa, motas `--map-trail-grain` al 35 %). Sin filtros (`feTurbulence`): caros en móvil.
- **Recorrido**: firme `--map-trail-done` (más cálido y algo más oscuro, tierra pisada), borde `--map-trail-done-edge`,
  mismo grano encima. Sin hilo, sin dorado brillante. Ajustar en `brand.css` claro/oscuro (y noche en `mapa-vivo.css`)
  que done vs. pendiente se distinga con contraste ≥ 1,3:1 entre firmes sin chillar.
- Variables nuevas: `--map-trail-grain` (claro y oscuro). Grosores a variables (`--map-trail-w`, `--map-trail-edge-w`…).
- **Arranque**: la plaza (`START_PLAZA`) se dibuja *dentro* de `trailSvg` como elipse empedrada rx 64 ry 24 con las
  mismas clases (borde + firme, `fill`); orden: borde del sendero → plaza → firme del sendero, de modo que la juntura
  no se ve y el camino **nace de la plaza**. `stroke-linecap: butt` en el primer segmento; en «Tu museo», el sendero
  termina bajo el umbral de la puerta (butt, oculto por el escalón).

## 7. Riesgos

- **Paisajes pregenerados.** `tools/mapa_svg.py` y `mapa_ramas.py` leen el trazado (`tools/mapa-layout.mjs`): cambian
  `h`, nodos, puentes y cajas. Hay que exportar las cajas nuevas (lápida, mojón con tablilla y ensanche) en
  `mapa-layout.mjs` como zonas sin dibujo, **regenerar los 23 SVG de `app/img/mapa/`** y pasar la prueba de «agua sin
  puente». Sin regenerar, los hitos del paisaje caerían bajo nombres y el agua no casaría con los puentes.
- **Memoria de scroll.** `map-memory.js` ancla por índice de época + fracción de alto: aguanta el cambio de alturas.
  El mojón **no** debe ser `.stage-spot` ni llevar `data-step` (rompería `placeMap`, «Tu parada» y `keys.next`); va
  como `<li class="tramo-spot">` en el mismo `<ol>`, antes de su primer pintor (orden de tabulación = orden visual).
- **Modo en línea** (`.is-linear`, letra muy grande): mojón y lápida pasan a placas en el flujo; revisar.
- **e2e / contraste**: selectores `.arch-band`, `.is-tramo .sign-plate`, `.sign-check` en `tests/e2e*.js`; actualizar
  y añadir la auditoría táctil del mojón. Mapa vivo noche: la losa dorada y el grano con su variante nocturna.
- Altura total del mapa crece ~60 u por tramo a mitad de época y ~10 u por época: asumible.

## 8. Cambios priorizados

1. **Trazado** (`path-layout.js`): secuencia de pasos con `HITO`, mojones como puntos del sendero con ensanche, vetos
   de puentes y ramas, cajas nuevas en `mapa-layout.mjs`; pruebas de distancias mínimas. *(lo más importante)*
2. **Mojón de tramo** (`path-signs.js`, `path-map.js`, `mapa-carteles.css`): estela + tablilla, estados
   abierto/cerrado/completado; quitar la tablilla bajo el nodo y `.sign-check`.
3. **Lápida de época** (`path-art.js` dintel, `eraArch`): rótulo dentro de la losa, ranura de progreso, dorado al
   completar; también en la muralla y en `branchEntrySign`.
4. **Sendero**: fuera el hilo, borde festoneado, grano por patrón, recorrido en tierra pisada; plaza que hace nacer el
   camino. Variables en `brand.css` (+ noche).
5. **Regenerar paisajes** (`mapa_svg.py`, `mapa_ramas.py`) y revisar 360/412, claro/oscuro, día/noche en Renacimiento,
   Barroco, Impresionismo, `#rama/escuela-rusa` y Gótico.
6. `node --test tests/` + e2e completo (cambia el mapa entero) → evaluador independiente.
