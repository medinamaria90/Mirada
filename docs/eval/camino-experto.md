# El camino, visto por un diseñador de mapas de niveles

Juicio del camino actual y de la propuesta de `ux-forma-camino.md`, y una propuesta propia con maqueta.
Noviembre de 2026. Incorpora lo que María dijo de la propuesta anterior: «forma muy irreal, cambios
muy bruscos», «sin encanto», «puentes desalineados con el camino, poco cariño».

## Veredicto corto

- **Hoy**: el problema no es solo la forma. Es una **carretera de asfalto gris con línea discontinua**
  (metáfora de autopista, no de viaje por el arte) que hace eslalon pared a pared cada 124 px, sobre un
  paisaje de detalles diminutos repartidos como confeti y apagado por el tinte «dormido». Se lee bien,
  pero no apetece mirarlo.
- **La propuesta anterior** ataca el síntoma con más forma (S, U, diagonales). Un sendero real no hace
  eso: los giros sin motivo en el terreno se ven dibujados con regla, y la U hace bajar el camino. No
  toca lo que de verdad quita encanto (material del camino, escala de los hitos, profundidad, color).
- **Mi propuesta**: un **sendero de tierra** que deriva despacio, con curvas amplias que siempre tienen
  una razón en el paisaje (rodea la colina de la catedral, cruza el río por su puente, bordea la laguna,
  pasa por la puerta de la época), **un hito grande y una «vista» por pantalla**, y lo recorrido
  marcado con un **hilo de oro**.

## 1. Juicio con criterios de oficio

| Criterio | Hoy | Propuesta anterior |
|---|---|---|
| Densidad (paradas por pantalla de 390×700) | ~5,6 a ritmo fijo de 124 px; sin respiros | Variable, pero con tramos de 84 px que apiñan rótulos |
| Distancia y ángulo entre paradas | Siempre 134 px en x y 124 en y: el mismo ángulo de ~47° 64 veces | Cambios de 0° a 90° de una parada a otra: tirones |
| Lectura del siguiente paso | Buena (onda simple) | Peor en la U y en las diagonales (¿hacia dónde sigue?) |
| Sensación de viaje | Baja: el camino no va a ningún sitio, el paisaje no cambia de escala | Media: hay hitos, pero sin motivo para cada giro |
| Hitos y «vistas» | Casitas y árboles de 10-20 px; de lejos no se distingue nada | Monumento y molino, aún esquemáticos |
| Composición por pantalla | Toda pantalla igual: zigzag + rótulos a los lados | Mejor variedad, pero sin composición pensada |
| Profundidad y capas | Plano; sin sombras coherentes; tinte gris encima de todo | Igual de plano |
| Contraste camino/fondo | Gris sobre gris azulado: bajo | Gris oscuro sobre verde: alto pero duro |
| Camino recorrido | Casi igual que el pendiente (en las capturas no se distingue) | Sin tratar |
| Nombres y botones | Píldoras correctas; carteles de rama con «faltan 2» montados sobre el nodo | Los rótulos dentro de la U chocan |
| Material | Asfalto con raya central: carretera moderna | Igual |
| Puentes | Puente sobre río horizontal (bien en el Renacimiento) | Puente cruzado sobre un río en diagonal, desalineado con el trazado |

Lo que sí funciona hoy y hay que conservar: sendero continuo, nodo actual inconfundible (aro coral y
«Empezar»), retratos redondos, carteles de época al borde, salida y museo como principio y fin.

Un aviso aparte: buena parte de lo «soso» es color. `--map-dormant` con `--map-dormant-saturate: .25`
desatura las épocas no empezadas, y se ve gris también donde está la jugadora. Lo pendiente puede ir
algo más suave, nunca gris.

## 2. Mi propuesta

### Forma y ritmo

- **Puntos de paso por época, suavizados (Catmull-Rom)**, en lugar del zigzag fijo `XS` con tangentes
  verticales en cada nodo. Las paradas se colocan sobre la curva; la curva no se dobla en cada parada.
- **Deriva lenta**: el sendero va de un lado a otro en 2-4 paradas, no en cada una. Ancho útil x 115-270.
  Pendiente lateral máxima ~0,6 (≈30° respecto a la vertical) y radio de curva ≥ 120 px. Siempre sube.
- **Cada curva con motivo**: el generador de paisaje pone en el lado cóncavo de cada curva aquello que
  el camino rodea (colina, laguna, pueblo, bosque). Si una curva no tiene motivo, sobra la curva.
- **Ritmo por pantalla**: 3-5 paradas (unas 4) separadas 130-240 px de recorrido. Más aire antes de un
  puente o de la puerta, más juntas en tramos llanos. El repaso, como **plaza** redonda al final del tramo.
- **Composición**: cada pantalla con un hito grande (100-140 px: catedral, laguna con campanario, molino)
  en el lado contrario al de los rótulos, y la pantalla siguiente más tranquila (respiro).

### Por época

Cada época cambia el suelo (degradado de 100 px), la vegetación y el agua, y tiene su hito: Renacimiento
con cipreses, pinos piñoneros, viñedos, la catedral y el río; Venecia con laguna; el Norte con canales
rectos, puentes de ladrillo, casas de piñón escalonado, molinos y campos en franjas. El paso de época es
un **seto con puerta de piedra** por la que pasa el sendero, con el cartel de la época al lado.

### Puentes y agua (reglas)

1. El puente se coloca **en el trazado**, y el río se construye **desde el puente**: su eje es
   perpendicular a la tangente del camino en ese punto (90° ± 10°).
2. El sendero es **recto** en ±35 px alrededor del puente (tres puntos de paso alineados): el tablero
   es recto y el camino no puede curvarse dentro.
3. Tablero alineado con la tangente (< 2°), largo = ancho del río + 2 × 18 px, ancho = sendero + 10 px.
   El sendero entra y sale por sus extremos; el hilo de oro sigue por encima.
4. El río va recto bajo el puente y solo se curva lejos de él. Sombra del puente sobre el agua.
5. Prueba automática: ángulo tablero-tangente, ángulo río-camino y que ninguna pieza toque el puente.

### El camino

- **Tierra clara**: firme de 20 px (`--map-trail`), borde de 3 px (`--map-trail-edge`), sombra suave
  debajo y **grava** de piedrecitas sueltas. Sin raya discontinua.
- **Recorrido**: tierra dorada (`--map-trail-done`) y un **hilo de oro** de 3 px por el centro hasta la
  parada actual. Es lo primero que se ve: «esto ya es tuyo».
- Briznas y flores en los bordes, nunca encima.

### Nombres, carteles y ramas

- Nombre en píldora al lado con más sitio, nunca sobre un hito (prueba de colisión de cajas con árboles,
  edificios, agua y sendero). Nodo actual: nombre y «Empezar» apilados.
- Retratos bloqueados en gris tenue con candado pequeño: se ve qué viene.
- Cartel de unidad: poste de madera al borde, en el tramo donde empieza la unidad.
- **Ramas**: sendero estrecho (9 px) que sale hacia el lado libre y acaba en su edificio (capilla gótica,
  ermita, isba…) con un hito pequeño y su nombre. Nada de líneas de puntos.

### Oficio (lo que da «cariño»)

- Todo apoyado en el suelo: cada pieza con su sombra, todas hacia abajo a la derecha (luz arriba a la izquierda).
- Orden de pintado por la base (lo de abajo tapa lo de arriba). Nada solapado ni cortado por un rótulo.
- En oscuro, ventanas encendidas con un halo pequeño; el mismo dibujo, otra luz.

### Cómo se haría

`path-layout.js` pasa de `XS`/`STEP` a una tabla de puntos de paso por época (más la salida, los puentes y
la puerta como anclas) y expone, además de nodos y sendero, la posición y el ángulo de cada puente.
`tools/mapa_svg.py` pinta el agua desde esos puentes, coloca los hitos en el lado cóncavo de las curvas
y ordena las piezas por su base. Las pruebas de `tests/mapa.test.js` comprueban que el sendero siempre
sube, el radio mínimo, los ángulos de los puentes y que no haya solapes.

## 3. Maqueta

HTML/SVG estático con la paleta de `app/css/brand.css`, tres pantallas seguidas (de abajo arriba:
Renacimiento con el río y la catedral; viñedos, pueblo y laguna de Venecia hasta la plaza del repaso;
puerta al Norte, rama del Gótico, canal con puente de ladrillo y molinos), en claro y en oscuro.

Capturas (temporales, en el scratchpad de la sesión):

- `/tmp/claude-0/-home-user-Mirada/6e4efa67-f85b-5559-9545-892873e98ef7/scratchpad/caminos-experto/pantallas.png` — las 3 pantallas, claro y oscuro
- `/tmp/claude-0/-home-user-Mirada/6e4efa67-f85b-5559-9545-892873e98ef7/scratchpad/caminos-experto/tiras.png` — la tira continua, claro y oscuro
- `…/caminos-experto/light-pantalla-1.png` … `light-pantalla-3.png` y `dark-pantalla-1.png` … `dark-pantalla-3.png`
- `…/caminos-experto/maqueta.html` (+ `escena.js`), con `?theme=dark` y `?screen=1|2|3`

Límites de la maqueta: los textos de época y unidad son de ejemplo, el orden de pintores es ilustrativo
y los hitos son bocetos de estilo, no dibujos finales.
