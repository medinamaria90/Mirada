# Evaluación independiente · mapa del camino y pantallas de rama (rama `camino-rediseno-r3`, ronda 3)

Evaluador nuevo, sin tocar código. Playwright (Chromium, `isMobile`, `hasTouch`), 360/412/768 px, móvil claro y oscuro,
reloj del juego sembrado (`sfumato.clock`) a las 7, 12, 19 y 23 h, tema «Como el móvil», «Oscuro» y «Claro» (estado
`version: 10`, 8 pintores del Renacimiento dominados, parada actual Veronés). Imágenes reales (1.472) y atlas pintado.
`node --test tests/`: 609 pruebas, 607 bien, 2 omitidas, 0 fallos. Sin errores de consola en ningún recorrido.

## Notas

| Criterio | Nota | | Pieza | Nota |
|---|---|---|---|---|
| Material 3 (web) | 8 | | Salida / plaza | 8 |
| UX | 8 | | Lápida | 8 |
| Accesibilidad | 8 | | Mojón / tramo completado | **7** |
| Rendimiento | 8 | | Espaciado | 9 |
| Adaptativo | 8 | | Sendero | 8 |
| Pulido | **7** | | Desvíos de rama | 8 |
| Originalidad | 9 | | Vuelta desde la rama | 9 |
| Calidad técnica | **7** | | Candados | 8 |
| | | | Botón «Tú» | 8 |
| | | | Paleta de luz / edificios | **7** |

**Veredicto: NO APRUEBA** (pulido 7, calidad técnica 7; piezas mojón 7 y paleta 7). Fallos graves: ninguno (sin roturas
ni trampas ni pérdida de progreso; 0 solapes entre carteles, paradas, lápidas, mojones y kiosco a 360, 412 y 768; sin
desbordes horizontales). Mejora clara respecto a la ronda 2: la salida sube de 7 a 8 y la vuelta desde la rama queda
perfecta en todos los casos.

## Comprobado de la ronda 2 (resuelto)

- **Salida** (`01`, `02`, `03`): hileras de adoquines visibles, la fuente ya está **dentro** de la plaza a la izquierda
  del arranque y la puerta de la muralla tiene arco con canto en sombra: ahora es un lugar, no un trozo de mapa.
- **Vuelta desde la rama** (`07`): la tablilla «Volver al camino» (115×41, `data-action="back-to-fork"`) cae en su
  desvío en los cuatro casos probados: entrando por el desvío (cartel en y=373 de 800, foco en «Descubre el
  Renacimiento»); Gótico (379, foco en «Gótico»); **por hash tras volver de Gótico** (373, el de Descubre, no el de
  Gótico: arreglado); y abriendo `#rama-escuela-rusa` en frío por URL (365, foco en «Escuela rusa»).
- **Una sola noche de reloj** (`08`, col. 4): 23 h es el mismo azul pizarra con el móvil en claro y en oscuro (suelo
  rgb 125,134,150; sendero/suelo 1,9:1, el mejor contraste del día).
- **Alba ≠ atardecer** (`09`): ya no son iguales: suelo a las 7 h rgb 177,172,177 (tono 300°, lila gris) y a las 19 h
  rgb 180,169,159 (tono 29°, topo cálido). `--day-warm` cambia de 0 a 1 justo al empezar el atardecer (`map-life.js`).
- **«Tú»**: salto de la salida a y=3000: flecha ↓ con la parada 12.714 px más abajo; al pulsarlo la centra (y=358
  de 800) y se oculta. **Candados** (`06`): un globo, bajo el cartel, con cierre. Reglas duplicadas de `main.css`, fuera.

## Lo que hay que arreglar (por prioridad)

1. **Paleta: el arrebol existe pero está apagado** (pieza 7, pulido) · `08`, `09`.
   Alba y tarde se distinguen solo comparándolas: las dos son grises (saturación del suelo ≈ 3 % y 12 %), las casas,
   árboles y la fuente se funden, y a 360 nadie diría «amanecer rosa» ni «atardecer ámbar». Causa: en el pico
   (`dusk` = 1) la noche va ya a 0,5 y se mezcla **después** del arrebol (`mapa-vivo.css`, `--lit-*`: primero
   `--map-glow` al 30 %, luego `--map-night` al 27 %), así que el azul noche lava el color. Arreglo: invertir el orden
   (noche primero, arrebol encima) o retrasar la curva de noche en las fases `dawn`/`dusk` (`daylight.js`,
   `gameLight`: p. ej. `night = smooth(t)²` al atardecer); subir `--map-dusk-max` a .4 y saturar `--map-dawn`
   (#efa9c0 en claro). Meta medible: saturación del suelo ≥ 15 % en el pico, tejado/suelo ≥ 1,5:1.
2. **Mojón: más grande, pero sigue leyéndose como una hoja o un archivador** (pieza 7) · `05`, `04`.
   22×32 px, bien; pero la cara partida en vertical al 62 % (`.tramo-stone` en `mapa-carteles.css:79-82`) y tres
   rayas horizontales dibujan un cuaderno, y el «remate» (franja oscura del 16 %) no se percibe a tamaño real.
   Arreglo: remate en arco (`border-radius: 50% 50% 2px 2px / 35% 35% 2px 2px`), canto en sombra estrecho (≤ 20 %),
   zócalo algo más ancho que el fuste (`::before`) y una sola marca grabada (el número romano del tramo, `I`, `II`…,
   en un `span aria-hidden`) en vez de tres renglones. Comprobar a 360 sin zoom que «se lee piedra».
3. **Tema «Oscuro» forzado: lo andado y los desvíos se pierden** (accesibilidad, paleta) · `10`.
   Decisión del generador aceptada (noche forzada más profunda, a juego con la interfaz), pero en esa noche el sendero
   recorrido pierde el oro (gris parduzco igual que el pendiente), el desvío «Más del Renacimiento» apenas se ve,
   y el arco de la puerta y la fuente desaparecen. Arreglo: que `--lit-trail-done*` mezclen la mitad de noche que el
   resto (como las ventanas, que se encienden) y aclarar `--map-trail-edge` en la paleta oscura.
4. **Calidad técnica** (7).
   - Cambio de comportamiento sin prueba (regla de CLAUDE.md): ni `back-to-fork` (`branch.js:151`) ni el arrebol
     cálido/frío tienen test. Arreglo: sacar `glowWarmth(min)` puro a `engine/daylight.js` con su prueba, y una prueba
     de que la vuelta fija el foco del mapa en la rama actual (`map-memory`).
   - `branch.js`: los manejadores `back` y `back-to-fork` repiten cuatro líneas; extraer `returnToMap()`.
   - `brand.css:170-174`: el comentario «sitio de la estela junto a la tablilla» quedó en `--radius-pill` y
     `--tramo-stone-room` se quedó sin el suyo.
   - Medidas a mano nuevas: `.plaza-stones.is-in { stroke-dasharray: 2 5; stroke-width: 1.2 }` (`main.css:237`) →
     variables junto a `--trail-grain-*`.
   - `path-map.js` en 300 líneas: razón aceptada (una petición más al arranque), pero que no crezca ni una línea.
   - Commits «wip camino 1…6»: fusionar en uno con mensaje claro al publicar, como se anuncia.
5. **Pulido menor**.
   - La fuente de la plaza (blanca sobre piedra crema, `02`) casi no se ve de día y nada de noche: darle borde de
     `--map-stone-side` y su sombra elíptica, como los árboles.
   - Kiosco «Cómo se juega» sigue en 56×56 px a 768 (`03`): escalar con `--map-fs` (pedido en la ronda 2).
   - Lápida del Romanticismo aún en dos líneas desiguales («finales s. XVIII– / mediados s. XIX», `06`):
     `text-wrap: balance` en los siglos.
   - A 768 el mojón «Nace el Renacimiento» queda a ~60 px del sendero (`03`): acercarlo con el mismo margen que a 360.

## Por pieza (lo que está bien)

- **Salida / plaza** (8): adoquines, fuente dentro, arco y torres: se entiende como puerta de la primera época. Para
  9: fuente con contraste y kiosco escalado.
- **Lápida** (8): estela con progreso 8/9 en su ranura; candado en línea con los siglos cuando está cerrada.
- **Espaciado** (9): Leonardo / «Los tres genios» / «Más del Renacimiento» / Berruguete respiran a 360 (`04`).
- **Sendero** (8): nace de la plaza, lo andado en oro de día; de noche de reloj, 1,9:1. Pierde en el Oscuro forzado.
- **Desvíos** (8): tangentes, tablilla con flecha y recuento; cerrados con «tras Goya».
- **Vuelta desde la rama** (9): funciona siempre y aterriza con foco; solo le falta la prueba y quitar la repetición.
- **Candados** (8) y **«Tú»** (8): como en la ronda 2, correctos. «Tú» sigue tapando a veces el extremo de la plaza
  a 360 (`01`); aceptable en un botón flotante.

## Capturas (`docs/eval/eval-camino-r3/`)

01 salida 360 día · 02 plaza en detalle (DPR 2) · 03 salida 768 · 04 Renacimiento, tramo + desvío · 05 mojón en
detalle (DPR 3) · 06 Romanticismo, globo de rama cerrada · 07 rama Descubre con «Volver al camino» · 08 luz por reloj
(fila 1 móvil claro, fila 2 oscuro; 7/12/19/23 h) · 09 salida a las 7, 19 y 23 h · 10 «Oscuro» forzado (Renacimiento y salida).

## Qué pedir si hay otra iteración

1 (arrebol saturado) y 2 (mojón de piedra) para aprobar las piezas; 4 (prueba de los dos cambios de comportamiento y
limpieza) para la calidad técnica; 3 y 5 en la misma ronda. Todo es ajuste fino: la estructura del mapa está aprobada.
