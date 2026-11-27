# Evaluación independiente · el camino con la época como lugar (rama `camino-r5c`, ronda 6)

Evaluador y director de arte nuevo; no he construido nada ni toco código. Playwright (Chromium, `isMobile`, `hasTouch`),
360, 412 y 768 px; claro, oscuro y «Como el móvil»; estado `version: 10` con 9 pintores del Renacimiento dominados, y
también sin progreso. 1.470 imágenes reales y atlas. Comparado con `origin/main` en otro puerto. Sin errores de consola,
0 px de desborde horizontal. `node --test tests/`: 689 pruebas, 686 bien, 3 omitidas, 0 fallos.

## Notas

| Criterio | Nota | | Pieza (dirección de arte) | Nota |
|---|---|---|---|---|
| Material 3 (web) | 8 | | Puerta | 8,5 |
| UX | 8 | | Inscripción | 8 |
| Accesibilidad | 8 | | Tipografía (Cinzel) | 8,5 |
| Rendimiento | 8 | | Plaza y su vida | **7** |
| Adaptativo | 8 | | Salida | 8,5 |
| Pulido | **7,5** | | Mojón | 8 |
| Originalidad | 9 | | Ramas | 8 |
| Calidad técnica | 8 | | Composición general | 8 |

**Veredicto: NO APRUEBA, por poco** (pulido 7,5). **Fallos graves: ninguno.** No empeora nada respecto a main. Lo
que queda es un solo motivo visual (el borde de la plaza) y dos detalles medidos.

## Comprobación de la ronda anterior (r5)

1. Plaza fuera del mapa: **arreglado**. Renacimiento del Norte y Postimpresionismo, dentro a 360, 412 y 768 (`1`, `3`).
2. Plaza en diana: **a medias**. Adiós a los anillos; el adoquín de puntos y trazos y la perspectiva funcionan en
   claro. Pozo, carro y balas se leen y están junto al sendero. Pero queda el óvalo con borde marrón duro: sigue
   pareciendo una alfombra o una bandeja apoyada en el prado (`1`, `3`). A 768 la plaza crece a ~340 px y la vida se
   queda pequeña en medio de tanto suelo (`3`). En oscuro el adoquín desaparece: es un charco gris liso (`4`).
3. La inscripción crece: **arreglado**. 10,0–11,5 px a 360, 10,8–12,4 a 412 y 14,6–16,7 a 768. Nunca baja de 10.
4. Nombre largo de torreón a torreón: **a medias**. «Rococó y Neoclasicismo» respira. «IMPRESIONISMO» (dentro de
   «Post-impresionismo») mide 110 px en una caja de 105 a 360 (123/120 a 412): toca los torreones (`2`, `4`).
5. Mojón: **arreglado**. Hito apuntado en piedra gris con banda; el rótulo ya no pesa más que la puerta.
6. Pulsar: **arreglado**. `:active` oscurece el ático, el texto no salta; abre la presentación de la época.
7. Caseta tapada por «Tú»: **arreglado**, pero ver el problema 3.

## Lo que mejora respecto a main

- La época es un lugar, no un cartel: ni cajas blancas de época ni de tramo. Es la mejora que pidió María.
- Salida sin progreso (`6`): puerta, plaza con fuente y caseta «Cómo se juega» con el rótulo libre. En main ese
  rótulo pisa la muralla. Mejor que main.
- Rama «Más del Renacimiento»: la puerta lleva su nombre grabado, «Volver al camino» al lado sin tocarla, cabecera
  coherente.
- Navegación, foco, lectores (la puerta dice nombre, periodo y estado) y «Tú», igual que en main.

## Problemas (por gravedad), con arreglo

1. **El borde de la plaza** (`1`, `3`, `4`). Es lo único que María vería «raro»: un óvalo recortado sobre la hierba.
   Monument Valley y Alto no dibujan el contorno del suelo; lo dejan morir.
   *Arreglo* (`path-art.js`, plaza): sin trazo, o trazo de 0,5 px al 30 %; que los adoquines se vayan aclarando y
   espaciando hacia el borde (borde suave). Limitar el radio de la plaza a unos 1,25× el de 360 en pantallas anchas, o
   escalar pozo y carro con ella. En oscuro, un token propio para los puntos del adoquín (más claro que el suelo).
2. **«IMPRESIONISMO» desborda 5 px** (`2`, `4`). *Arreglo* (`mapa-carteles.css`, `.arch-name`): cuando `--fit < 1`,
   que el ajuste tenga en cuenta el `padding-inline`, o ensanchar el ático por igual en todas las puertas.
3. **Menor: con la guía «Prueba de época» visible, la salida queda debajo** (`5`). La caseta y la plaza del
   Renacimiento caen bajo la píldora y no se puede bajar más; el rótulo «Cómo se juega» no se ve (en main la píldora
   también tapa la caseta, pero el rótulo asoma). *Arreglo*: margen inferior del mapa = alto de la píldora + respiro
   cuando la guía está visible.

## Referencias y lo rechazado por María

- **Duolingo**: estado por la forma (portón cerrado, arco abierto), tamaño constante, respuesta al pulsar. Bien.
- **Monument Valley**: la puerta tiene volumen, sombra y conos; la plaza aún no: le sobra el contorno (1).
- **Alto's Adventure**: nada anuncia texto; la inscripción en Cinzel es la pieza más lograda.
- Sin carteles grandes ni cajas blancas en las épocas, sin duplicados, nada tapa la muralla, sendero sin «lengua» ni
  raya central. Las tablillas de rama («Más del Rococó») siguen siendo pequeñas placas claras, como en main: aceptable.

## Capturas (`docs/eval/eval-camino-r5c/`)

1 Renacimiento del Norte a 360 · 2 Postimpresionismo cerrada a 360 · 3 Renacimiento del Norte a 768 · 4 oscuro a 412,
plaza lisa · 5 salida con la guía visible · 6 salida sin progreso.

Con 1 y 2 hechos, pulido y plaza suben a 8 y aprueba; 3 es un remate.
