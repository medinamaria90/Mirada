# Evaluación independiente · la época como puerta de ciudad, ronda 6b (rama `camino-r6b`)

Evaluador y director de arte nuevo; no he construido nada ni toco código. Playwright (Chromium, `isMobile`, `hasTouch`),
360, 412 y 768 px; claro, oscuro y «Como el móvil» de noche (Date a las 23 h, sin `sfumato.clock`); con 9 pintores del
Renacimiento dominados y sin progreso. 1.469 miniaturas reales. Comparado con `origin/main` en otro puerto (zoom ×3 de la
salida en los tres temas). 0 px de desborde y 0 errores de consola en las 15 vistas. `node --test tests/`: 692, 689 bien,
3 omitidas, 0 fallos.

| Criterio | Nota | | Pieza (dirección de arte) | Nota |
|---|---|---|---|---|
| Material 3 (web) | 8 | | Puerta | 8,5 |
| UX | 8 | | Inscripción (Outfit) | 8,5 (día) · 8 (noche/oscuro) |
| Accesibilidad | 8 | | Salida | 8 |
| Rendimiento | 8,5 | | Mojón | 8,5 |
| Adaptativo | 8,5 | | Ramas | 8 |
| Pulido | 8 | | Guía | 8,5 |
| Originalidad | 9 | | Composición general | 8,5 |
| Calidad técnica | 8 | | | |

**Veredicto: APRUEBA.** Todo ≥ 8 y **ningún fallo grave**. Los dos fallos que tumbaron la ronda 6 están arreglados y
comprobados en captura, no solo en el código.

## Comprobación de la ronda anterior

1. **«i» de la caseta, oculta tras la muralla → arreglado.** La caseta está ahora a la izquierda de la puerta, delante del
   muro, y la «i» dorada se ve entera con su aro claro en todas las anchuras (`1`). El botón «Cómo se juega» (aria-label
   intacto, 56 × 56 px; 66 px a 768) cubre la caseta y abre el diálogo correcto. Queda a 240 px del botón «Tú» a 360: no
   se confunden. Sin progreso también se ve, sobre la barra de abajo (`3`).
2. **Sendero que no entraba por el arco → arreglado.** Sube recto por el centro del arco y sale por encima del ático
   hacia el primer tramo; la falsa 3D se entiende (cruza la puerta y, ya dentro, tuerce). Igual en la rama (`3`).
3. Hueco oscuro de la inscripción de noche: sin cambios; decisión de María, no puntúa.
4. Guía «Prueba del Renacimiento»: entera (213 px), no tapa la salida. En main sigue cortada («Prueba de época: Ren…») y
   tapa «Cómo se juega» hasta el punto de que Playwright no puede pulsarlo (`1`, derecha).

## Problemas que quedan (ninguno bloquea), con arreglo

1. **De noche la «i» pierde el dorado**: el filtro nocturno la deja gris sobre gris (disco ≈ #7F7F7B sobre muro #7E808F,
   1,03:1; `2`). La caseta se ve por su ventana encendida, pero la «i» no llama. En oscuro sí conserva el ocre. *Arreglo*:
   pasar el disco a la capa de luces (como las ventanas, `data-lamp`) o darle su color de noche en `--map-*`.
2. **Codo del sendero en la cornisa**: por encima del ático el sendero asoma ya curvado, con un pico a la izquierda del
   tramo (se nota a 768, `1`). *Arreglo*: subir `START_GATE_TOP` 6–8 px, para que la curva empiece por detrás del ático.
3. **Caseta algo apretada**: el ciprés y el árbol redondo de su derecha casi tocan el tejadillo, y el macizo de flores cae
   a sus pies (`1`). Apartarlos 8–10 px a la derecha da aire a la caseta.
4. Ajeno a la rama y como en main: el letrero «Gótico · faltan 4 pintores» es una cajita clara arriba a la derecha; es el
   mojón de rama validado, no un cartel grande.

## ¿Empeora algo respecto a main?

No. La salida es más limpia (sin cartel-caja ni plaza), la guía cabe entera y deja ver la salida, y «Cómo se juega» se
pulsa sin obstáculos (en main la guía lo tapa). La única pérdida relativa es de noche: el rótulo blanco de main se leía
mejor que la «i» gris (punto 1); el rótulo se quitó por decisión de María.

## Dirección de arte y lo rechazado por María

- Puerta y rama: objetos limpios a lo Monument Valley; estado por la forma (portón cerrado en Postimpresionismo, candado
  en «Prueba de época»). Norte, Rococó y Postimpresionismo, sin cambios respecto a r6 y correctos en los tres temas (`4`).
- Sin carteles grandes ni cajas blancas, sin duplicados, nada tapa la muralla (la caseta queda delante y por debajo del
  adarve), sin «lengua» ni raya central. Alineación: el sendero ya va al eje del arco; solo queda el codo (punto 2).

## Capturas (`eval-camino-r6b/`)

1. Salida en claro, zoom ×3 a 360: r6b (izquierda) y main (derecha).
2. Salida de noche («Como el móvil») y en tema oscuro, r6b: la «i» gris de noche.
3. Salida sin progreso (claro, 360) y rama «Más del Renacimiento» de noche (412).
4. Renacimiento del Norte con la guía (claro, 360) y Rococó de noche (412).
