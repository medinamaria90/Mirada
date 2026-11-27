# Evaluación de dirección de arte — prototipo «la época como lugar» (r5)

Evaluador independiente (no ha construido nada, no toca código). Rama `proto-epoca-lugar` (5a12e9b).
Capturas de `docs/eval/proto-r5/` (360 px, día, claro) y lectura de `path-art.js` (`cityGate`, `loggia`, `protoPlace`).

## Veredicto corto

**Ninguna se enseña tal cual.** Las dos fallan en lo que María ya rechazó: el nombre vive en una **caja beige
grande con letrero**, no en un edificio. Enseñar **A rehecha**; **descartar B**.
La idea de A es la buena (el sendero cruza la puerta justo en el seto que separa épocas: umbral real). La de B es
errónea de base: el edificio queda al lado y, para que el sendero «pase», hay dos pilares en el camino → dos
marcadores para lo mismo (justo el «duplicado» vetado).

## Notas de gusto y composición (0–10)

| Pieza | A (puerta) | B (logia) |
|---|---|---|
| Edificio de época | 4 | 3 |
| Inscripción / nombre | 3 | 4 |
| Plaza | 3 | 3 |
| Integración con sendero | 6 | 3 |
| Escala frente a casas y nodos | 5 | 4 |
| **Global** | **4** | **3** |
| Piedra del tramo (igual en ambas) | 3 | 3 |
| Salida (muralla, igual en ambas) | 5 | 5 |

Referencia: la iglesia con torres y fuente sobre plaza ovalada junto a Caravaggio (`b-barroco.png`, arriba a la
derecha) ya es un **lugar** de 8: tejas terracota, torres que suben, fuente sobre la plaza. Eso es lo que hay que
alcanzar, y está en el mismo mapa.

## A — Puerta de ciudad

- **Parece una caja sobre dos patas, no una puerta.** El ático (104 de ancho × 46 de alto) es más ancho que toda la
  puerta (80) y casi tan alto como el cuerpo (62): pesa demasiado arriba. Los torreones no asoman por encima, así que
  no se leen torres; las almenas son una sierra fina sobre un rectángulo. Sin tejado ni terracota, frente a las casas
  y la cúpula (que sí lo tienen) parece cartón.
- **Nombre largo = cartel.** «Manierismo y Renacimiento del Norte» en 3 líneas llena el ático: es una lápida con
  almenas. Con «Barroco» y el candado mejora, pero el ático sigue siendo un panel en blanco con una palabra.
- **Raya oscura bajo el nombre** (barra de progreso del rótulo): parece un fallo o un subrayado; sobra aquí.
- **La plaza es un plato flotante.** Óvalo plano a 124 px de la puerta, encima del ático, sin nada sobre él; el
  sendero desaparece debajo y reaparece. Se lee disco/tapa de alcantarilla, no plaza. Además en el sentido de la
  marcha queda *antes* de la puerta en pantalla, lo que confunde «detrás».
- Bien: el sendero sí cruza el arco; centrado sobre el sendero; ancho (~28 %) dentro de la mitad máxima.

## B — Logia

- **Es la «logia con nombre enorme» ya rechazada, en pequeño.** El friso ocupa casi la altura de los arcos; es una
  franja crema con texto encima de tres agujeros. Caja con letrero.
- **Plaza desmesurada:** 68 % del ancho, sobresale por ambos lados del sendero, la logia no se apoya en ella (queda
  en el borde trasero) y los pilares del sendero caen encima. Sin coherencia de planta.
- **Pilares en el sendero + logia = dos objetos para una idea.** El ojo no sabe cuál es «la época».
- **Alineaciones descuidadas:** en Manierismo la logia casi roza el sendero (≈15 px); en Barroco queda al otro lado
  y a otra distancia. Lado y hueco cambian según la curva: se ve azaroso.
- Lo único salvable: la línea de teja terracota del tejado armoniza con las casas.

## Piedra del tramo («El óleo en Flandes», «Luz en la oscuridad»)

**Es una etiqueta, no una piedra.** Píldora beige con sombra plana idéntica a «Nace el Renacimiento»: se lee como
botón o chip. Flota en el prado sin relación con el sendero (ni junto al borde, ni con base en el suelo), y su
anchura la marca el texto, no la piedra. Una piedra real: forma irregular de mojón bajo, cara gris piedra
más oscura que el camino, base apoyada con sombra elíptica, texto pequeño grabado (tono hundido), pegada al borde del
sendero a la altura donde empieza el tramo.

## Salida (primera época)

Aceptable de composición (muralla, puerta, plaza con fuente: ¡esta plaza sí es plaza!), pero «Renacimiento» flota
sobre las almenas sin soporte y algo descentrado respecto al arco. Debe grabarse en una tablilla del propio arco.

## ¿Se entiende que es pulsable?

Poco, en ambas. En el mapa de Duolingo lo pulsable es un objeto con volumen y estado; aquí el edificio es decorado
SVG y solo el rótulo HTML encima recibe el toque. Toda la silueta del edificio debe ser zona de toque y tener
respuesta al pulsar (hundirse 2 px, como los nodos).

## Cambios imprescindibles antes de enseñar A (rehacer, no retocar)

1. **Invertir proporciones de la puerta:** torreones más altos que el cuerpo, con tejadillo cónico terracota
   (como la iglesia de referencia); ático **más estrecho que la puerta** y de ≤ 18 px de alto.
2. **Inscripción real:** nombre en una línea, cuerpo pequeño (≈ 11–12 px), tono hundido sobre la piedra, sin caja
   ni barra de progreso. Nombres largos: usar nombre corto en el edificio («Manierismo») y el completo en la
   ficha al pulsar; nunca 3 líneas.
3. **Plaza pegada a la salida de la puerta**, parcialmente tapada por ella, con el sendero entrando y saliendo
   visible y algo encima (fuente o pozo, 1–2 casitas en el borde). Si no, quitarla: mejor sin plaza que un plato.
4. **Toda la puerta pulsable** con estado presionado; candado pequeño en la propia puerta si está cerrada.
5. **Piedra del tramo rehecha** como mojón (ver arriba), al borde del sendero; misma familia de color que la puerta.
6. **Rótulo de salida** grabado en el arco de la muralla, centrado en el eje del vano.
7. Comprobar en 360 px los tres casos (nombre corto, largo, bloqueado) y día/noche antes de pasar a María.

B: descartar. Si se quiere conservar algo, solo la teja terracota para la puerta de A.
