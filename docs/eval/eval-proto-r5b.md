# Evaluación de dirección de arte: prototipo «la época como lugar» (r5b)
Evaluador independiente nuevo (no ha construido nada y no toca código). Rama `proto-epoca-lugar` (c217d64).
Me baso en las capturas `docs/eval/proto-r5/a2-*.png` (360 px, día, claro) y en la lectura de `path-art.js` (`eraGate`,
`protoPlace`, `halfFor`) y de `mapa-carteles.css`. **No he visto noche ni modo oscuro**: no me ha dado tiempo a renderizar.

## Veredicto
**Todavía no se puede enseñar a María**, aunque está cerca. La puerta con torreones y conos terracota ya se lee como
**lugar** y no como caja: es el salto que pedía la r5 (4 → 6,5). Fallan tres cosas, y María las ve en un segundo:
el edificio **cambia de tamaño según el nombre** (sigue mandando la lógica de cartel), la **plaza se lee como un aro
alrededor de la puerta** y el **mojón del tramo sigue siendo una píldora**. La salida, además, sigue con un ático-caja
más ancho que su arco y con «Cómo se juega» encima de la muralla.

## Notas (0–10)
| Pieza | r5 | r5b | Comentario breve |
|---|---|---|---|
| Puerta de época | 4 | 6,5 | Silueta buena (torres, conos y arco). Le falta 2,5D: alzado plano, sin cara lateral marcada |
| Inscripción | 3 | 6,5 | 11 px en una línea, sin barra. Pero va sobre un panel claro: sigue siendo una placa |
| Plaza | 3 | 4 | Elipse fina tras la puerta, solo se ven las puntas: parece un ala de sombrero |
| Salida (1.ª época) | 5 | 5,5 | Ático ancho y liso sobre un arco pequeño, sin torreones: no es de la misma familia |
| Mojón de tramo | 3 | 4 | Estadio de 7:1, simétrico y con brillo arriba. Chip, no piedra |
| Integración con el sendero | 6 | 7 | El sendero entra por el arco bien centrado. Bajo el arco queda una franja oscura (la sombra del seto) que corta el sendero |
| Escala | 5 | 6,5 | 27–37 % del ancho (bien), pero varía de una época a otra |
| **Global** | **4** | **6** | Es un lugar a medias: la puerta sí, el conjunto todavía no |

## Comparación con las referencias
- **Monument Valley**: cada edificio tiene **tres planos de luz** (cara clara, lateral media, sombra) y proporciones
  fijas. Aquí la puerta es un alzado frontal con una cara lateral de 4 px casi invisible y la iglesia de Caravaggio
  tiene más volumen. Falta **una cara lateral clara de verdad** en el cuerpo y en los torreones.
- **Alto's Adventure**: los hitos son siluetas que **no anuncian texto**. Aquí el panel claro del ático delata el rótulo.
- **Duolingo**: los hitos especiales (cofres, trofeos) tienen **siempre el mismo tamaño** y su estado se ve por la
  forma (abierto o cerrado). Aquí el tamaño lo dicta el nombre y el estado «cerrada» solo es un candado de 11 px.
  Con el arco abierto, la puerta sigue pareciendo transitable.

## Fallos concretos
1. **Ancho según el nombre** (`halfFor`: `length * charU`). Barroco mide unos 98 px y Impresionismo unos 135. Un
   edificio no crece con su letrero: es justo la «alineación descuidada» que María rechaza al ir comparando épocas.
2. **Plaza**: `plazaRy 12` detrás de una puerta de 80 px de alto. Queda casi entera tapada y solo asoman dos puntas
   finas a los lados, con la fuente posada en el borde derecho, medio fuera. No se lee empedrado ni plaza.
3. **Panel del ático**: el rectángulo `land-front` liso y claro, del ancho de todo el hueco entre las torres, es una
   tablilla. Una inscripción real va sobre la misma piedra del cuerpo (mismo tono), con un friso o una moldura fina encima.
4. **Franja bajo el arco**: la sombra del seto atraviesa el sendero como una banda más oscura en las tres puertas.
   Se lee como una raya transversal, pariente de la «raya central» vetada.
5. **Salida**: el ático (88 u) es más ancho que el vano y no tiene torreones. «Cómo se juega» tapa la muralla (vetado).
   `a2-tramo.png` aún muestra el cartel viejo «RENACIMIENTO» con barra: es una captura antigua y hay que rehacerla.
6. **Mojón**: hay que descartar la píldora. Un mojón es alto y estrecho (proporción de 1:1,3 a 1:2), con la cabeza
   redondeada, una cara frontal y otra lateral, base con sombra elíptica, y el nombre **al lado, en dos líneas** o grabado
   en una placa baja a su pie. El color del texto varía: dorado en «Nace el Renacimiento» y oscuro en el resto.
   El lado y la distancia al sendero cambian (de 0 a 17 px).

## Cambios imprescindibles antes de enseñarlo (retocar, no rehacer)
1. **Puerta de tamaño fijo** en todas las épocas (por ejemplo, un ancho constante de unos 110 px con los torreones).
   El nombre corto cabe a 11 px o se acorta con `inscription()`; nunca se ensancha el edificio.
2. **Ático del tono de la piedra** del cuerpo (sin panel claro), con una moldura `land-top` encima y otra debajo:
   letras hundidas, no una placa.
3. **Plaza visible delante del arco** (en el sentido de la marcha, por donde se sale): un óvalo de unos 60 % de alto
   respecto a hoy, con el sendero cruzándolo, la fuente dentro y no en el borde, y algo de empedrado (3–4 puntos). Si no
   se puede, quitarla.
4. **Quitar la sombra del seto sobre el sendero** bajo el arco: el sendero debe pasar limpio.
5. **Cerrada = portón o reja dentro del arco** (dos hojas de madera), además del candado pequeño en el ático.
6. **Salida de la misma familia**: dos torreones de cono y el ático más estrecho que el vano. Mover «Cómo se juega»
   para que no pise la muralla.
7. **Mojón nuevo** como en el punto 6 de los fallos, con lado y distancia al sendero fijos y el mismo color de texto.
8. Más volumen: una cara lateral visible (de 6 a 8 px, en el tono `land-side`) en el cuerpo y en los torreones.
9. Rehacer `a2-tramo.png` y añadir capturas de noche y de modo oscuro antes de pasárselo a María.

Con los puntos 1 a 4 y el 7, esto pasaría de 8 y se podría enseñar. Los demás son pulido.
