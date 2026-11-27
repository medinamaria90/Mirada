# Evaluación independiente · el camino con la época como lugar (rama `camino-r5`, ronda 5)

Evaluador y director de arte nuevo; no he construido nada ni toco código. Playwright (Chromium, `isMobile`, `hasTouch`),
360, 412 y 768 px; claro, oscuro y «Como el móvil»; estado `version: 10` con 9 pintores del Renacimiento dominados.
1.470 imágenes reales y atlas. Comparado con `origin/main` en otro puerto. Sin errores de consola. Ningún desborde
horizontal (0 px). `node --test tests/`: 653 pruebas, 651 bien, 2 omitidas, 0 fallos.

## Notas

| Criterio | Nota | | Pieza (dirección de arte) | Nota |
|---|---|---|---|---|
| Material 3 (web) | 8 | | Puerta | 8 |
| UX | 8 | | Inscripción / tipografía | 7,5 |
| Accesibilidad | 8 | | Plaza y su vida | 6 |
| Rendimiento | 8 | | Salida | 8 |
| Adaptativo | **7** | | Mojón | 7 |
| Pulido | **7** | | Ramas («Más del…», puerta, tablilla) | 8,5 |
| Originalidad | 9 | | Composición general | 7,5 |
| Calidad técnica | 8 | | | |

**Veredicto: NO APRUEBA** (adaptativo y pulido en 7). **Fallos graves: ninguno** (sin roturas, sin pérdida de progreso,
datos de arte bien: «Renacimiento del Norte» ya no contradice a Van Eyck). Le falta una ronda corta de acabado.

## Lo que mejora respecto a main (y no se pierde nada de lo que funciona)

- Adiós a las cajas blancas de época y de tramo (`4` frente a `3`): la época es un lugar, no un cartel. Es lo mejor de
  la rama y lo que María pidió. Mismo tamaño de puerta en todas, el sendero cruza el arco, cerrada se lee por el portón.
- Cinzel servida desde la app, nunca por debajo de 10 px (medido: 10,0 a 11,5 px a 360). Lectores: la puerta dice el
  nombre completo, el periodo y el estado; «¿Lo recuerdas?» queda solo para el lector.
- «Más del Renacimiento» en el desvío, en la cabecera y grabado en su puerta; «Volver al camino» cae junto a la puerta
  sin tocarla (`6`). En oscuro, inscripción legible y puertas con su volumen (`7`).
- Navegación, foco, «Tú» y vuelta desde la rama, igual que en main.

## Problemas (por gravedad), con arreglo

1. **La plaza se sale del mapa** (`1`, `5`). Va centrada en la puerta con `rx: 128` sobre 390: en Renacimiento del
   Norte y en Simbolismo la puerta está en x = 262 y la plaza llega a 390, cortada por el borde a 360, 412 y 768 (y a
   768, contra el borde de la columna). Es justo la «alineación descuidada» que María rechaza.
   *Arreglo* (`path-art.js`, `eraPlace`): `cx = clamp(x, PLAZA.rx + EDGE, MAP_W - PLAZA.rx - EDGE)` (el sendero ya entra
   por arriba de la plaza, aguanta el desplazamiento), o `rx` de 128 a ~110.
2. **La plaza parece un plato o una diana, no un suelo** (`1`, `2`, `8`). Óvalo plano de borde marrón con tres
   elipses discontinuas concéntricas: se lee como una pista o una bandeja apoyada detrás de la puerta. La vida es
   diminuta (pozo ~15 px, carro ~20, balas ~10 a 360): de lejos son motas. Monument Valley y Alto resuelven el suelo con
   textura y no con contorno.
   *Arreglo* (`path-art.js`/`path-signs.js` y `mapa-carteles.css`): quitar las elipses concéntricas; adoquín de puntos
   o trazos cortos al azar con el tono `land-side`; borde de 1 px; `ry` 28 → ~34 para dar perspectiva; pozo y carro
   ×1,6 y más cerca del sendero; las balas, junto al carro, no sueltas en el borde.
3. **La inscripción no crece con la puerta** (`5`). A 768 la puerta casi dobla su tamaño y el nombre se queda en
   10,6 px: «RENACIMIENTO DEL NORTE» parece una etiqueta pegada en un muro enorme.
   *Arreglo* (`mapa-carteles.css`, `--inscr-fs`): en unidades del contenedor, p. ej. `clamp(11.5px, 3cqi, 20px)`; el
   mínimo de 10 px se mantiene.
4. **Nombre largo de torreón a torreón** (`2`, `8`). «IMPRESIONISMO» y «NEOCLASICISMO» ocupan el ático entero sin aire,
   y «POST-» queda pegado al canto superior. Con `overflow: hidden`, un nombre un poco más largo se cortaría.
   *Arreglo* (`mapa-carteles.css`, `.arch-name`): `padding-inline` del 5 % y `letter-spacing` 0 cuando `--fit < 1`;
   si no cabe, ensanchar `atticW` por igual en todas las puertas (no encoger la letra).
5. **Mojón todavía con aire de lápida, y la jerarquía al revés** (`2`). La banda grabada ayuda, pero la cabeza en arco
   pardo sigue pareciendo una lápida pequeña. Y su rótulo (12 px, 600, tinta oscura) pesa más que el nombre de la época
   (10–11,5 px en `--map-sign-ink-2`).
   *Arreglo* (`mapa-carteles.css`, `.tramo-stone` y `.sign-plate.is-tramo .sign-name`): cabeza apuntada (hito) o gris
   piedra cálido; rótulo a 11 px y 500 en tinta 2.
6. **Pulsar solo hunde las letras** (r5c, sin resolver). `button.arch-band:active` mueve el texto y el edificio SVG se
   queda quieto: el nombre «salta» dentro de la piedra.
   *Arreglo* (`mapa-carteles.css`): en vez de `translateY`, oscurecer el ático (`::before` con `color-mix` del tono de
   piedra al 12 %) o hundir también `.path-gate` con `:has(.arch-band:active)`.
7. **Menor**: a 360, el botón «Tú» tapa media caseta «Cómo se juega» en la salida (`3`); en main ahí no hay nada
   encima (`4`). *Arreglo*: subir el `scroll-margin` de la salida o apartar la caseta 20 px a la izquierda (`KIOSK`).

## Comparación con las referencias

- **Duolingo**: estado por la forma (portón / arco) y tamaño constante: bien. Falta la respuesta física al pulsar (6).
- **Monument Valley**: la puerta tiene canto, conos y sombra; la plaza, no: necesita textura, no un contorno (2).
- **Alto's Adventure**: nada anuncia texto; la tipografía de inscripción es el acierto de la ronda.
- Lo rechazado por María: sin cajas blancas, sin duplicados, nada tapa la muralla ni el seto, sendero sin «lengua» ni
  raya central. Queda una alineación descuidada (1).

## Capturas (`docs/eval/eval-camino-r5/`)

1 Renacimiento del Norte a 360 (×3): plaza cortada a la derecha · 2 Postimpresionismo cerrada (×3) y mojón ·
3 salida a 360 · 4 main, salida a 360 · 5 Renacimiento del Norte a 768 · 6 rama «Más del Renacimiento» a 360 ·
7 oscuro a 360 · 8 «Rococó y Neoclasicismo» (×3): nombre largo y plaza en diana.

Con 1 a 4 hechos sube a 8 en adaptativo y pulido; 5 y 6 la llevan a «María no vería nada feo».
