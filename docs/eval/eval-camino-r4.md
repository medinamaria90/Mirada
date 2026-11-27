# Evaluación independiente · mapa del camino y pantallas de rama (rama `camino-rediseno-r4`, ronda 4)

Evaluador nuevo, sin tocar código. Playwright (Chromium, `isMobile`, `hasTouch`), 360/412/768 px, móvil claro y oscuro,
reloj sembrado en `sfumato.clock` (`minuteAtHour`) a las 7, 12, 19 y 23 h; temas «Como el móvil», «Oscuro» y «Claro»
(estado `version: 10`, 8 pintores del Renacimiento dominados, parada actual Veronés). 1.473 imágenes reales y atlas.
`node --test tests/`: 611 pruebas, 609 bien, 2 omitidas, 0 fallos. Sin errores de consola en ningún recorrido.

## Notas

| Criterio | Nota | | Pieza | Nota |
|---|---|---|---|---|
| Material 3 (web) | 8 | | Salida / plaza | 8 |
| UX | 9 | | Lápida | 8 |
| Accesibilidad | 8 | | Mojón / tramo completado | 8 |
| Rendimiento | 8 | | Espaciado | 9 |
| Adaptativo | 8 | | Sendero | 8 |
| Pulido | 8 | | Desvíos de rama | 8 |
| Originalidad | 9 | | Vuelta desde la rama | 9 |
| Calidad técnica | 8 | | Candados | 8 |
| | | | Botón «Tú» | 8 |
| | | | Paleta de luz / edificios | 8 |

**Veredicto: APRUEBA** (todos ≥ 8). Fallos graves: ninguno. 0 solapes entre carteles, paradas, lápidas, mojones y
caseta a 360, 412 y 768; 0 px de desborde horizontal en mapa y ramas; sin pérdida de progreso.

## Comprobado de la ronda 3 (resuelto)

- **Arrebol** (`05`): ahora sí se ve sin comparar. Suelo a las 7 h rgb 203,178,184 (tono 346°, saturación 19 %: rosa)
  y a las 19 h rgb 204,176,153 (27°, 33 %: ámbar); la meta pedida (≥ 15 %) se cumple en los dos. `--day-warm` 0/1 bien,
  y la noche ya se mezcla antes que el arrebol (`mapa-vivo.css`). Mediodía y 23 h, iguales en móvil claro y oscuro.
- **Mojón** (`02`, `03`): remate en arco, canto en sombra al 80 %, zócalo más ancho y el número romano. A 360 sin zoom
  se lee piedra de camino, no cuaderno. En las ramas cuenta sus propios tramos (I Rococó, II Romanticismo, III Realismo, `08`).
- **«Oscuro» forzado** (`06`): lo andado se distingue (rgb 102,87,65 sobre 33,39,44: 2,2:1; antes se perdía); ventanas
  encendidas, la puerta y la caseta se leen.
- **Vuelta desde la rama**: la tablilla «Volver al camino» (115×41) cae en su desvío en los cuatro casos: por el desvío
  (foco en «Más del Renacimiento», y=373 de 800), Gótico (379), por hash tras Gótico (373, el de Descubre) y
  `#rama-escuela-rusa` en frío (365, foco en «Escuela rusa»). `returnToMap()` quita la repetición.
- **«Tú»**: tras saltar a y=3000, flecha hacia abajo (girada 90°); al pulsarlo centra la parada (393 de 800), se oculta y
  deja el foco en la parada.
- **Pulido**: fuente con borde (`02`), caseta de 67 px a 768 (`12cqi`), siglos del Romanticismo en dos líneas
  equilibradas (`04`), medidas de la plaza en variables y comentarios de `brand.css` corregidos.

## Lo que queda (no impide aprobar, por prioridad)

1. **La prueba de la vuelta no prueba el comportamiento** (calidad técnica). `tests/mapa-carteles.test.js:104` busca
   con una expresión regular el texto `'back-to-fork': () => returnToMap(ctx, branch.id)` en `branch.js`. Cualquier
   cambio de formato la rompe, y no comprueba que el foco caiga en el desvío. Mejor: probar `returnToMap` con un `ctx`
   falso (`prevRoute`, `go`, `audio`) y comprobar `setMapFocus`/`map-memory`. `glowWarmth` sí tiene una prueba de verdad.
2. **Comentario partido en `path-signs.js:173-179`**: el comentario de `tramoSign` corta a media frase («Completo, la
   tablilla / se dora…») y la constante `ROMAN` queda entre el comentario y la función. Juntarlo y poner `ROMAN` encima.
3. **Medidas a mano nuevas en `.tramo-stone`** (`mapa-carteles.css:75-82`): `50% 50% 2px 2px / 35% 35% 2px 2px`,
   `.2 * var(--tramo-stone-w)`, `.7 * var(--map-fs)`, `.04em` → variables `--tramo-stone-*`, como el resto del mojón.
4. **Contraste del sendero en el arrebol**: en el pico de las 7 y las 19 h el sendero queda a 1,1:1 del suelo; se
   sigue por su borde y su sombra, pero es el momento más flojo del día (de día: borde 1,5:1; a las 23 h: 1,7:1).
   Si se toca, oscurecer un punto `--lit-trail-edge` en `dusk`, no la paleta entera.
5. **«Oscuro» forzado**: el desvío «Más del Renacimiento» y la fuente de la plaza siguen casi invisibles (`06`).
   La tablilla los salva; aclarar `.spur-edge` en la paleta oscura bastaría.
6. **«Tú» sobre la plaza a 360** (`01`): el botón flotante tapa el borde derecho del empedrado. Aceptable.
7. `path-map.js` en 300 líneas justas: no admite ni una más sin partirlo.

## Por pieza

- **Salida / plaza** (8): adoquines, fuente con borde, arco y caseta: es un lugar. El 9, cuando «Tú» no la tape.
- **Lápida** (8): equilibrada, con candado y siglos en línea; el progreso, en su ranura.
- **Mojón / tramo completado** (8): piedra que se lee; completo, la tablilla se dora y el número va en oro.
- **Espaciado** (9): Leonardo, «Los tres genios», «Más del Renacimiento» y Berruguete respiran a 360 (`03`).
- **Sendero** (8): oro de lo andado de día, de noche y en el Oscuro; flojo solo en el pico del arrebol (punto 4).
- **Desvíos** (8) y **candados** (8): tangentes, con recuento o «tras Goya» / «faltan 2 pintores», globo de cierre.
- **Vuelta desde la rama** (9): perfecta en los cuatro casos; le falta una prueba de comportamiento.
- **«Tú»** (8): flecha según la dirección, centra y se oculta.
- **Paleta / edificios** (8): alba rosa, tarde ámbar, noche azul con ventanas encendidas; los tejados mantienen el color.

## Capturas (`docs/eval/eval-camino-r4/`)

01 salida 360 a mediodía · 02 plaza y mojón (DPR 2) · 03 Renacimiento: tramo II y desvío · 04 Romanticismo con
candados · 05 luz por reloj (arriba móvil claro, abajo oscuro; 7/12/19/23 h) · 06 «Oscuro» forzado (Renacimiento y
salida) · 07 rama Descubre con «Volver al camino» · 08 Escuela rusa abierta en frío por URL.
