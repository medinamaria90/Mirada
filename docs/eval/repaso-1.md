# Puerta de calidad: un único repaso, siguiente paso y tarjeta de rango (27/11)

Evaluadores independientes nuevos en cada ronda (otra sesión, sin tocar código), con capturas reales de Chrome a 360,
412 y 768 px en claro y oscuro (rama temporal `eval-repaso-N`, `docs/eval/repaso-N/`).

## Ronda 1: NO APRUEBA

| Material 3 | UX | Accesibilidad | Rendimiento | Adaptativo | Pulido | Originalidad | Calidad técnica |
|---|---|---|---|---|---|---|---|
| 8 | 7 | 8 | 8 | 7 | 7 | 8 | 8 |

**Sitio del botón «Repasar»: cabecera (variante A)**, frente a una píldora fija en el mapa simétrica a «Tu parada»
(variante B). Por qué: en la cabecera está en el mismo sitio en el camino, la colección y el perfil, y hace pareja con
el reto diario (mismo botón redondo y mismo punto coral): se aprende una vez. La píldora tapaba el mapa (a 412 px pisaba
un cartel y un nodo), competía con «Tu parada» y solo existía en el mapa. El precio de la A: a 360 px el nombre
«Sfumato» se oculta y queda el logotipo.

Mejoras de la ronda: capturas de «Por hoy, hecho» y de la etapa floja; el título de la sesión es «Repaso» (el botón dice
«Repasar»); varias medallas en una sola ficha («2 medallas · Nuevas»); el cuadro del resultado crece con el alto que
sobra (sin hueco sobre los botones); el botón principal va primero en el orden de lectura y foco; fuera la píldora y el
tipo `review5`; `nextStep` calcula la sesión de repaso una sola vez. «¿Lo recuerdas?» de los pintores apagados se queda:
es de los repasos invisibles que María pidió mantener.

## Ronda 2: APRUEBA

| Material 3 | UX | Accesibilidad | Rendimiento | Adaptativo | Pulido | Originalidad | Calidad técnica |
|---|---|---|---|---|---|---|---|
| 8 | 8 | 8 | 8 | 9 | 8 | 8 | 9 |

Sin fallos graves. Pulido aplicado después (sugerencias que no bloqueaban): ↻ solo para «Repasar» (el pintor a medias
lleva un medio círculo y «Repetir» va sin icono); la cabecera es opaca (a 768 px un nodo se veía como una mancha bajo
ella); las medidas del punto de aviso van en variables; la cabecera calcula los cuadros del repaso una sola vez; en la
tarjeta de rango, la otra condición que avanza con el mismo nivel lleva su marca en coral. No se aplicó: que el punto de
«Repasar» ignore a los pintores a medias, porque el diseño aprobado por María lo pide así.


## Ronda 3: NO APRUEBA (tras el feedback de María en producción)

| Material 3 | UX | Accesibilidad | Rendimiento | Adaptativo | Pulido | Originalidad | Calidad técnica |
|---|---|---|---|---|---|---|---|
| 8 | 7 | 8 | 9 | 8 | 7 | 8 | 8 |

**Cabecera: variante B** (nombre + la llama de la racha dentro del aro de la meta de hoy, que se explica al tocarla +
«Repasar» + Cuadro del día) frente a A (sin meta ni racha): la racha a la vista es lo que más motiva a volver y la llama
se entiende sola. Mejoras: frases neutras para pintoras, aro del pintor a medias con la nota real y la muesca del 75 %
(sin insignia con cifra) y «Vas por el 67 %» bajo el nombre, textos de desbloqueo naturales, «puntos» en vez de «XP» en la
cabecera, un solo punto rojo a la vez, fuera el código de la variante A.

## Ronda 4: NO APRUEBA

| Material 3 | UX | Accesibilidad | Rendimiento | Adaptativo | Pulido | Originalidad | Calidad técnica |
|---|---|---|---|---|---|---|---|
| 8 | 7 | 8 | 8 | 8 | 7 | 8 | 8 |

Evaluó la guía nueva (entrada del repaso, botón principal que siempre avanza, candados con «Ir», guía en el mapa y la
regla de lo pendiente atrás, que le pareció buena: «guía sin frenar»). Mejoras: la guía va junto al «Tú» y lleva el camino
a la parada; el último paso se guarda durante la visita y lo usa también el mapa; la muesca es un corte dentro del trazo;
«puntos» en toda la app; píldora más estrecha; la entrada del repaso dice «… y 4 cuadros que ya has visto» con la cara en
buena resolución.

## Ronda 5: APRUEBA

| Material 3 | UX | Accesibilidad | Rendimiento | Adaptativo | Pulido | Originalidad | Calidad técnica |
|---|---|---|---|---|---|---|---|
| 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 |

Sin fallos graves. Aplicado después (menores): número y palabra unidos en la entrada del repaso y título equilibrado;
los nombres de la nota del candado no se parten; lo que enseña la guía del mapa cuenta como último paso; pruebas de
`mapGuide` con `prevStep` y de `ui/last-step.js`. Se dejan: la píldora de guía puede pasar sobre un letrero de época (es
flotante, como «Tú») y las esquinas blancas del Tondo Doni (es la propia imagen del cuadro).

Iteraciones: 5 (dos para el repaso único y el siguiente paso; tres más tras el feedback de María en producción).
