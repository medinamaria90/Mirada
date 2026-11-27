# Evaluación independiente · el camino con la época como lugar (rama `camino-r5g`, ronda 8)

Evaluador y director de arte nuevo; no he construido nada ni toco código. Playwright (Chromium, `isMobile`, `hasTouch`),
360, 412 y 768 px; claro, oscuro y «Como el móvil» de día y de noche (reloj a las 23 h, sin `sfumato.clock`); estado
`version: 10` con 9 pintores del Renacimiento dominados, y sin progreso. 1.471 imágenes y atlas reales. Comparado con
`origin/main` en otro puerto. 0 px de desborde, sin errores de consola. `node --test tests/`: 692, 689 bien, 3 omitidas, 0 fallos.

| Criterio | Nota | | Pieza (dirección de arte) | Nota |
|---|---|---|---|---|
| Material 3 (web) | 8 | | Puerta | 8,5 |
| UX | 8 | | Inscripción | 8 (día) · **7,5** (noche) |
| Accesibilidad | **7** | | Tipografía (Cinzel) | 8,5 |
| Rendimiento | 8 | | Plaza y su vida | 8,5 (claro) · **7** (oscuro) |
| Adaptativo | 8 | | Salida | 8,5 |
| Pulido | **7,5** | | Mojón | 8 (día) · **6,5** (noche) |
| Originalidad | 9 | | Ramas | 8 |
| Calidad técnica | 8 | | Composición general | 8 |

**Veredicto: NO APRUEBA** (accesibilidad 7, pulido 7,5). **Fallos graves: ninguno.** De día y en la salida, ya está.
De noche sigue por debajo de main, ahora por el **mojón**, y en tema oscuro la plaza aún es un plato.

## Comprobación de la ronda anterior (r5d)

1. Inscripción de noche: **mejorada, no resuelta.** Pasa a crema con sombra oscura (`4`) y se lee en la captura; pero
   medido, crema (#F3EAD8) sobre la piedra en sombra (#7E808F) da **3,3:1** a 10–11,5 px (antes 1,8:1; objetivo 4,5:1).
   En la salida, 3,5:1. La sombra ayuda al ojo, no al número.
2. Plaza de la salida: **arreglado** (`1`). Sin trazo, sin el segundo óvalo; ya es la misma familia que las de época.
3. Plaza en oscuro: **sin arreglar** (`5`). Halo gris con un óvalo interior más claro y canto nítido: se lee como una
   bandeja posada en el prado, más visible que la propia puerta. En claro y de noche con «Como el móvil», bien.
4. A 768 el halo de la plaza llega a los bordes del mapa (`6`): menor, sigue.

## Lo que mejora respecto a main (se mantiene)

- La época es un lugar y no un cartel; sin cajas blancas. Salida sin progreso: «Cómo se juega» ya no pisa la muralla.
- La plaza en claro se funde con el suelo (Monument Valley), con pozo y carro como vida, sin competir con los nodos.

## Problemas (por gravedad), con arreglo

1. **De noche el nombre del mojón no se lee** (`2`, `3`). «Nace el Renacimiento», «Rococó», «El óleo en Flandes»…
   siguen en el marrón de día (#5E574F) con un halo `--map-tag` que de noche no aclara: **2,3–2,4:1** a 9 px. En main
   esa tablilla es blanca y se lee perfecta de noche, así que **empeora respecto a main**. Es el mismo fallo que tenía
   la inscripción, en otra pieza. *Arreglo* (`mapa-carteles.css`, `.is-tramo .sign-name`): mismo mix con `--day-night`
   que `.arch-name` (crema de noche, halo oscuro `--map-night` en vez de `--map-tag`); el oro de «hecho», igual.
2. **Inscripción de noche a 3,3:1.** *Arreglo*: o aclarar la piedra del ático de noche (que no reciba todo el tinte,
   como las tablillas) o subir el crema a casi blanco y engrosar la sombra a 1–2 px difusa. Medir ≥ 4,5:1 en el e2e.
3. **Plaza en tema oscuro** (`5`): bajar el contraste halo/óvalo y quitar el canto para que muera en el suelo, como
   en claro. María lo vería en cuanto abra en oscuro.
4. Menores: en la rama, «Volver al camino» perdió la línea «Renacimiento» que tenía en main (dice adónde vuelve);
   la época «Manierismo y Renacimiento del Norte» de main aquí es «Renacimiento del Norte» (confirmar que es querido).
   Ajenos a la rama y sin cambiar: píldora «Prueba de época» sobre la salida; 404 de la foto del Cuadro del día.

## Referencias y lo rechazado por María

- **Monument Valley**: la plaza en claro ya es plataforma que nace del suelo; en oscuro aún es una bandeja.
- **Alto's Adventure**: al caer la noche todo debe seguir leyéndose; la puerta casi, el mojón no.
- **Duolingo**: estado por la forma (portón cerrado, arco abierto), tamaño constante; nodo actual claro. Bien.
- Lo rechazado: sin carteles grandes ni cajas blancas, sin duplicados, nada tapa la muralla, sin «lengua» ni raya
  central. Alineación: inscripción centrada en el ático y partida con guion («POST-/IMPRESIONISMO») sin rozar torreones.

## Capturas (`eval-camino-r5g/`, izquierda r5g, derecha main)

1 salida de día · 2 salida de noche (mojón) · 3 mojón de noche ampliado · 4 Rococó de noche · 5 R. del Norte en
oscuro · 6 R. del Norte a 768.
