# Evaluación independiente · el camino con la época como lugar (rama `camino-r5d`, ronda 7)

Evaluador y director de arte nuevo; no he construido nada ni toco código. Playwright (Chromium, `isMobile`, `hasTouch`),
360, 412 y 768 px; claro, oscuro, «Como el móvil» de día y **de noche** (reloj del juego a las 23 h); estado `version: 10`
con 9 pintores del Renacimiento dominados, y sin progreso. 1.470 imágenes reales y atlas. Comparado con `origin/main`
en otro puerto. 0 px de desborde horizontal, sin errores de consola.

## Notas

| Criterio | Nota | | Pieza (dirección de arte) | Nota |
|---|---|---|---|---|
| Material 3 (web) | 8 | | Puerta | 8,5 |
| UX | 8 | | Inscripción | **7** (de noche) |
| Accesibilidad | **7** | | Tipografía (Cinzel) | 8,5 |
| Rendimiento | 8 | | Plaza y su vida | 8 (claro) · 7,5 (oscuro) |
| Adaptativo | 8 | | Salida | **7,5** |
| Pulido | **7,5** | | Mojón | 8 |
| Originalidad | 9 | | Ramas | 8 |
| Calidad técnica | 8 | | Composición general | 8 |

**Veredicto: NO APRUEBA** (accesibilidad 7, pulido 7,5). **Fallos graves: ninguno.** De día está a punto; lo que
falla es nuevo en esta ronda porque nadie había mirado la noche: **de noche empeora respecto a main.**

## Comprobación de la ronda anterior (r5c)

1. Borde de la plaza: **arreglado en claro** (`1`, `2`). Sin trazo, halo más claro y adoquín que se aclara y espacia
   hacia fuera: ya no es una alfombra; se funde con el prado. **En oscuro, a medias** (`3`): el adoquín ya se ve (bien),
   pero el halo y el óvalo interior, más claro que el suelo, siguen dibujando un plato gris con canto.
2. «IMPRESIONISMO»: **arreglado**. Partido «POST-/IMPRESIONISMO», 11,5 px a 360 y ~3 px de aire a cada lado (`2`).
   `scrollWidth` 115 sobre 113 de caja: los 2 px caen en el relleno, no tocan los torreones.
3. Guía «Prueba de época» sobre la salida: sin cambiar, como se avisó (también en main).
4. A 768 la plaza sigue grande respecto a pozo y carro y su halo llega al borde del mapa: menor.

## Lo que mejora respecto a main (se mantiene)

- La época es un lugar, no un cartel; sin cajas blancas de época ni tramo. Rama «Más del Renacimiento» coherente.
- Salida sin progreso: «Cómo se juega» ya no pisa la muralla. Navegación, foco y etiquetas de lector, iguales.

## Problemas (por gravedad), con arreglo

1. **De noche la inscripción casi no se lee** (`4` frente a `5`). Con «Como el móvil» (lo que trae por defecto), al
   oscurecer el mapa el ático se tiñe de gris azulado (~#7E808F) pero el texto sigue en su marrón de día (#5E574F):
   **contraste 1,8:1**, a 10–11,4 px. «ROCOCÓ Y NEOCLASICISMO» a 360 es una mancha. En main el cartel queda claro y
   legible de noche, igual que la tablilla «Más del Rococó» de esta misma rama, así que además desentona: la tablilla
   se lee y la puerta no. *Arreglo* (`mapa-carteles.css`, `.arch-name` bajo `--day-night`): de noche, texto claro
   grabado (tono crema con sombra oscura debajo, como en el tema oscuro, que sí funciona) o mantener el ático fuera
   del tinte nocturno, como las tablillas. Objetivo ≥ 4,5:1. Una prueba de contraste de noche en el e2e lo blindaría.
2. **Dos plazas distintas** (`6`). La de la salida conserva el borde marrón duro y un segundo óvalo claro que asoma
   por la derecha: justo lo que se quitó a las plazas de época. María lo vería en la primera pantalla. *Arreglo*:
   mismo tratamiento (sin trazo, halo, adoquín que se desvanece) en la plaza de la salida, y quitar el lóbulo derecho.
3. **Plaza en oscuro** (`3`): bajar el contraste entre halo y óvalo interior para que muera en el suelo, como en claro.
4. Menor, ajeno a esta rama: en la primera captura sin progreso el nodo de Botticelli mostró un instante una obra que
   no es suya (parecía «Almuerzo sobre la hierba»), también en main; a los pocos segundos sale la buena. Revisar la
   carga del atlas (puede ser solo mi atlas local).

## Referencias y lo rechazado por María

- **Monument Valley**: la plaza en claro ya «muere» en el suelo como sus plataformas; falta en oscuro y en la salida.
- **Alto's Adventure**: la luz cambia y todo sigue leyéndose; aquí, de noche, el texto se apaga: es lo que falla.
- **Duolingo**: estado por la forma (portón cerrado, arco abierto), tamaño constante. Bien.
- Sin carteles grandes ni cajas blancas, sin duplicados, nada tapa la muralla, sendero sin «lengua» ni raya central.
  Alineaciones correctas; el nombre largo ya respira.

## ¿Empeora algo respecto a main?

Sí, solo de noche: el nombre de la época pasa de cartel claro legible a texto casi invisible (`4`, `5`). De día, no.

## Capturas (`docs/eval/eval-camino-r5d/`)

1 Renacimiento del Norte, claro, 360 · 2 Postimpresionismo cerrada, zoom · 3 oscuro, plaza, zoom · 4 noche «Como el
móvil», rama · 5 lo mismo en main · 6 salida, zoom (plaza con borde).

Con 1 y 2 hechos, accesibilidad y pulido suben a 8 y aprueba; 3 es un remate.
