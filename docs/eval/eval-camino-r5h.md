# Evaluación independiente · el camino con la época como lugar (rama `camino-r5h`, ronda 9)

Evaluador y director de arte nuevo; no he construido nada ni toco código. Playwright (Chromium, `isMobile`, `hasTouch`),
360, 412 y 768 px; claro, oscuro y «Como el móvil» de día y de noche (Date a las 23 h, sin `sfumato.clock`); estado
`version: 10` con 9 pintores del Renacimiento dominados, y sin progreso. 1.469 miniaturas reales en el atlas. Comparado
con `origin/main` en otro puerto. 0 px de desborde y 0 errores de consola en las 23 capturas por versión. `node --test tests/`: 692, 689 bien, 3 omitidas, 0 fallos.

| Criterio | Nota | | Pieza (dirección de arte) | Nota |
|---|---|---|---|---|
| Material 3 (web) | 8 | | Puerta | 8,5 |
| UX | 8 | | Inscripción | 8,5 (día) · 8 (noche) |
| Accesibilidad | 8 | | Tipografía (Cinzel) | 8,5 |
| Rendimiento | 8 | | Plaza y su vida | 8,5 (claro y noche) · **7,5** (oscuro) |
| Adaptativo | 8 | | Salida | 8,5 |
| Pulido | **7,5** | | Mojón | 8,5 (día) · 8 (noche) |
| Originalidad | 9 | | Ramas | 8 |
| Calidad técnica | 8 | | Composición general | 8 |

**Veredicto: NO APRUEBA, por un solo punto** (pulido 7,5, por la plaza en tema oscuro). **Fallos graves: ninguno.**
Los dos fallos de la noche de r5g están resueltos y medidos; ya no empeora nada de main de noche en «Como el móvil».

## Comprobación de las rondas anteriores (r5d, r5g)

1. **Inscripción de noche: resuelta.** Medido en píxel: casi blanco (#FBF6EC) sobre el hueco (#535A76) = **6,3:1**
   (r5g: 3,3:1). Se lee en las tres anchuras (`1`, `2`). Pega menor: el hueco es un rectángulo azul noche de bordes
   duros, más «placa» que letra grabada; no llega a caja ni tapa la muralla.
2. **Mojón de noche: resuelto.** Crema con halo oscuro: 4,2:1 contra el prado medio y ~6:1 contra el halo pegado a la
   letra, a 12 px (r5g: 2,3:1). «El óleo en Flandes», «Rococó», «Poner orden en la luz» se leen (`2`). Main sigue más
   alto (tablilla blanca), pero el mojón ya no es peor de leer.
3. **Plaza en claro y de noche: bien.** Diferencia con el suelo casi nula (claro #F4E9D5 frente a #EFE6C8; noche
   #80879A frente a #7B879A): plataforma que nace del suelo, con pozo y carro (`4`, `1`).
4. **Plaza en tema oscuro: mejora, no resuelta** (`3`, `6`). Prado #1F282E, plaza #303239: sigue siendo un óvalo
   **gris sobre verde**, con el canto del halo marcado. Causa: `--plaza-stone-share: 78%` deja la piedra (clara en
   oscuro) dominando el tono del prado oscuro.
5. «Renacimiento del Norte» y «Volver al camino» sin línea de época: decisiones de María, no puntúan.

## Lo que mejora respecto a main (se mantiene)

- La época es un lugar, no un cartel; sin cajas blancas. Puerta con estado por la forma (portón cerrado en
  Postimpresionismo, `4`), partición «POST-/IMPRESIONISMO» limpia, sin rozar torreones.
- Salida con y sin progreso, igual que main (no empeora). Ramas: «Más del Renacimiento» con su puerta y plaza (`5`).

## Problemas (por gravedad), con arreglo

1. **Plaza en tema oscuro** (único que bloquea). *Arreglo* (`brand.css`/`mapa-vivo.css`): en `[data-theme=dark]` y en
   `prefers-color-scheme: dark` bajar `--plaza-stone-share` a ~40 % (que gane el suelo) y el halo a la mitad, para que
   la diferencia con el prado quede ≤ 1,1:1 como en claro. Medirlo igual que aquí: píxel de plaza frente a prado.
2. Menor (no bloquea): el hueco de la inscripción de noche, con bordes duros y azul frío sobre piedra cálida. Un
   difuminado de 1–2 px en los bordes (o `border-radius` mínimo y algo menos de azul) lo haría grabado y no placa.
3. Ajenos a la rama y sin cambiar: píldora «Prueba de época» sobre la salida y la puerta; 404 de la foto del Cuadro.

## Referencias y lo rechazado por María

- **Monument Valley**: la plaza ya es plataforma en claro y de noche; en oscuro aún se lee como bandeja.
- **Alto's Adventure**: al caer la noche todo se lee (puerta 6,3:1, mojón ≥ 4,2:1). Bien.
- **Duolingo**: tamaño de nodo constante, actual claro, estado por la forma. Bien.
- Lo rechazado: sin carteles grandes ni cajas blancas, sin duplicados, nada tapa la muralla, sin «lengua» ni raya
  central. «Volver al camino» junto a la puerta en la rama, sin pisarla.

## Capturas (`eval-camino-r5h/`, izquierda r5h, derecha main)

1. Rococó de noche, 360 («Como el móvil»). 2. Renacimiento del Norte de noche, 412 (mojón e inscripción).
3. Rococó en tema oscuro, 360. 4. Postimpresionismo cerrada, de día, 360. 5. Rama «Más del Renacimiento», oscuro de
noche, 412. 6. Zoom de la plaza en tema oscuro (solo r5h).
