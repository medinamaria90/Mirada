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

Iteraciones: 2.
