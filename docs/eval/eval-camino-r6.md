# Evaluación independiente · el camino con la época como puerta de ciudad (rama `camino-r6`)

Evaluador y director de arte nuevo; no he construido nada ni toco código. Playwright (Chromium, `isMobile`, `hasTouch`),
360, 412 y 768 px; claro, oscuro y «Como el móvil» de día y de noche (Date a las 23 h, sin `sfumato.clock`); con 9
pintores del Renacimiento dominados y sin progreso. 1.469 miniaturas reales. Comparado con `origin/main` en otro puerto.
0 px de desborde y 0 errores de consola en las 16 capturas por versión. `node --test tests/`: 692, 689 bien, 3 omitidas, 0 fallos.

| Criterio | Nota | | Pieza (dirección de arte) | Nota |
|---|---|---|---|---|
| Material 3 (web) | 8 | | Puerta | 8,5 |
| UX | **7,5** | | Inscripción (Outfit) | 8,5 (día) · 8 (noche/oscuro) |
| Accesibilidad | 8 | | Salida | **7** |
| Rendimiento | 8,5 | | Mojón | 8,5 |
| Adaptativo | 8 | | Ramas | 8 |
| Pulido | **7,5** | | Guía | 8,5 |
| Originalidad | 9 | | Composición general | 8,5 |
| Calidad técnica | 8 | | | |

**Veredicto: NO APRUEBA** (UX y pulido 7,5), por dos fallos pequeños, los dos en la salida. **Fallos graves: ninguno.**
Todas las decisiones de María están aplicadas y medidas: sin plaza ni vida en ninguna época ni en la salida (0 nodos),
sin fuente, rótulo «Cómo se juega» oculto (aria-label intacto), guía «Prueba del Renacimiento» entera (213 px, sin cortar).

## Lo que está bien (y mejora a main)

- **Puerta**: limpia, sin bandeja detrás; el muro corre de lado a lado y nada lo tapa. Estado por la forma (portón
  cerrado en Postimpresionismo). Monument Valley: un objeto, una idea. Mejor que el cartel-caja de main (`1`, `3`).
- **Inscripción**: Outfit semibold en capitales espaciadas, sin guiones; tamaño mínimo 10,6 px («Postimpresionismo»
  a 360), el resto 11–12 px; 17,9 px a 768. Contraste medido en píxel: día **13,3:1** (#23201C sobre #F3E7D6);
  noche **10,2:1** (#FBF6EC sobre #2F3A63). Se lee igual que una placa, sin serlo.
- **Mojón** y **ramas**: «El óleo en Flandes», «Más del Rococó · faltan 2 pintores» se leen de día y de noche; «Volver
  al camino» junto a la puerta sin pisarla (`6`).
- **Guía**: cabe entera en 360; al final del mapa queda sitio y la puerta de salida no queda debajo (main cortaba
  «Prueba de época: Ren…» y tapaba la salida, `1`).
- **Composición**: el mapa respira; la época se lee como lugar al que se llega (Alto's: paisaje, no interfaz).

## Problemas (por gravedad), con arreglo

1. **La «i» de la caseta de información queda oculta tras la muralla** (salida, todas las anchuras y temas; `2`). Solo
   asoma un gajo del disco dorado; la caseta parece una casa más y no se adivina que se pulsa. Como el rótulo se ha
   quitado (bien), la «i» es la única pista: **empeora respecto a main**, donde «Cómo se juega» sí se veía.
   *Causa* (`path-art.js:55`): `startArt` pinta `kiosk(KIOSK)` antes que `eraGate(...)`, y el disco está en `top - 21`,
   a la altura del muro. *Arreglo*: bajar la caseta (~`KIOSK.y` +18) para que el disco quede entero sobre el prado
   delante del muro, o pintar la caseta después de la puerta; mover a la vez el botón transparente (`path-signs.js:93`).
2. **El sendero no entra por el arco en la salida** (`1`, `2`). Por arriba llega al ático junto al torreón derecho
   (x ≈ 245 de 360) y por abajo sale del arco (x ≈ 190): parece que el camino se mete detrás de la torre. En el resto de
   puertas (Norte, Rococó, Postimpresionismo, rama) entra centrado. *Arreglo*: centrar `START_GATE.x` en la x del
   sendero a esa altura, o curvar el último tramo para que llegue al centro del ático.
3. Menor (no bloquea): en oscuro y de noche, el hueco de la inscripción es un rectángulo azul que asoma un poco por los
   lados del ático; aceptable por decisión de María, pero 2–4 px más estrecho lo haría grabado y no placa (`3`, `4`).
4. Ajeno a la rama, igual que en main: la guía flotante puede tapar a media pantalla la etiqueta «Prueba de época»
   (visto a 768 px) y repite la misma meta que ese nodo cuando está a la vista (`5`).

## ¿Empeora algo respecto a main?

Solo el punto 1 (descubribilidad de «Cómo se juega»). Lo demás iguala o mejora: sin cajas blancas, sin plaza, guía
entera, salida despejada. Arreglando 1 y 2 (dos cambios de coordenadas) espero UX y pulido en 8–8,5 y aprobado.

## Referencias y lo rechazado por María

- Monument Valley: puertas como objetos limpios, bien. Alto's: la noche se lee (≥ 10:1). Duolingo: nodos constantes,
  estado por la forma, bien.
- Sin carteles grandes ni cajas blancas, sin duplicados (salvo el ajeno 4), nada tapa la muralla, sin «lengua» ni raya
  central. Alineación descuidada: solo el sendero de la salida (punto 2).

## Capturas (`eval-camino-r6/`, izquierda r6, derecha main)

1. Salida al final del mapa, claro, 360. 2. Zoom de la salida en r6: «i» oculta y sendero desalineado.
3. Rococó de noche («Como el móvil»), 412. 4. Rococó en tema oscuro, 360. 5. Renacimiento del Norte con la guía, claro,
360. 6. Rama «Más del Renacimiento» de noche, 412.
