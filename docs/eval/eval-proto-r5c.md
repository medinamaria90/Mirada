# Evaluación de dirección de arte: prototipo «la época como lugar» (r5c)
Director de arte independiente nuevo (no ha construido nada y no toca código). Rama `proto-epoca-lugar` (e4a0f50).
Me baso en las capturas `docs/eval/proto-r5/a3-*.png` (360 px, día, claro) y en `path-art.js` (`eraGate`, `CITY`),
`path-signs.js` (`eraArch`, `INSCR_CHARS`) y `mapa-carteles.css`. **No he renderizado noche ni modo oscuro.**

## Veredicto
**Sí, se puede enseñar a María como propuesta**, con un solo arreglo previo que es imprescindible: el nombre largo.
Por fin es un **lugar**: una puerta de ciudad del mismo tamaño en todas las épocas, asentada sobre el seto que separa
las épocas, con el sendero cruzando el arco y una plaza con fuente nada más salir. El ático ya no es un cartel y el
estado «cerrada» se lee por la forma (el portón), como en Duolingo. Lo que queda es pulido, salvo dos cosas.

## Notas (0–10)
| Pieza | r5 | r5b | r5c | Comentario breve |
|---|---|---|---|---|
| Puerta | 4 | 6,5 | 8 | Tamaño fijo (~33 % del ancho), torreones con canto lateral y conos terracota. El arco es un recorte sin grosor (sin intradós) |
| Inscripción | 3 | 6,5 | 6,5 | «Barroco» y «Manierismo», perfectas (11 px, piedra entre molduras). «Postimpresionismo» baja a **~7 px**: no se lee |
| Plaza | 3 | 4 | 7 | Ya está donde toca y tiene fuente dentro. El sendero se pinta **encima** del empedrado y el borde marrón es grueso: sigue pareciendo un plato bajo la carretera |
| Salida | 5 | 5,5 | 7,5 | Es la misma puerta en la muralla. «Cómo se juega» ya no pisa nada. La plaza queda *antes* de la puerta (se sale de la ciudad) y en las épocas *después* (se entra): se entiende |
| Mojón | 3 | 4 | 6,5 | Por fin es una piedra y no un chip. Pero un canto redondo, liso y crema, de pie, **se lee como una lápida** junto a una frase. Y su rótulo pesa más que el de la época |
| Integración | 6 | 7 | 8 | El sendero entra limpio por el arco, sin la franja oscura. Puerta, seto y cambio de color del suelo coinciden: es un umbral de verdad |
| Escala | 5 | 6,5 | 8,5 | Constante en todas las épocas, menos de la mitad del ancho, en armonía con las casas y la iglesia de Caravaggio |
| **Global** | **4** | **6** | **7,5** | Ya funciona como idea. Le falta acabado en dos sitios para que llegue a 8 |

## Referencias
- **Monument Valley**: el volumen ya está (frente, canto y tejado). Falta el grosor del arco: una franja `land-side` de
  3 a 4 px por dentro del vano haría que la puerta pareciera de piedra maciza y no un decorado recortado.
- **Alto's Adventure**: la silueta ya no anuncia texto. Bien.
- **Duolingo**: tamaño fijo y estado por la forma (portón cerrado o arco abierto). Bien. Pero al pulsar solo se hunden
  las letras (el `translateY(2px)` va al botón HTML y el SVG se queda quieto): el edificio no responde y el texto «salta».

## Fallos concretos
1. **Nombre largo ilegible (grave).** `--fit = 12 / (largo + 2 si está cerrada)`: «Postimpresionismo» cerrada sale a
   0,63 × 11,2 ≈ 7 px. Por debajo de 9 px en el móvil no se lee y María lo verá a la primera. El candado dentro del ático
   empeora las cosas, porque se come el sitio de dos letras.
2. **Dato de arte engañoso.** `inscription()` corta en « y », así que «Manierismo y Renacimiento del Norte» queda en
   «Manierismo»… y el primer pintor tras la puerta es Jan van Eyck, que no es manierista (y vivió un siglo antes). La
   inscripción no puede contradecir lo que hay detrás de la puerta.
3. **Plaza bajo el sendero.** Con el sendero pintado encima, el empedrado parece una alfombra. Una plaza es suelo
   pavimentado: el sendero debería **fundirse** con ella (cortarse en su borde o ir a ras con el mismo tono).
4. **Mojón = lápida.** La forma es correcta (alta y estrecha), pero, sin detalle, el canto redondo crema se lee como
   lápida. Además, el rótulo del tramo (12 px, 600, tinta oscura) pesa más que el nombre de la época (11 px, tinta 2):
   la jerarquía está al revés.
5. Pulsar: no hay respuesta del edificio (punto Duolingo, arriba).

## Cambios imprescindibles antes de enseñarlo
1. **Inscripción ≥ 9,5 px siempre.** Saca el candado del ático y ponlo en el portón (allí ya dice «cerrada»). Si aun
   así no cabe, ensancha el ático **para todas las épocas** por igual (unos 90 px útiles, con `half` de 44 a ~50) en vez
   de encoger la letra. Comprobar con el nombre corto más largo del catálogo.
2. **Nombre corto fiel al contenido**: para esa época, uno que no deje fuera a Van Eyck (p. ej. «Norte y Manierismo»,
   si cabe con el punto 1, o un `shortName` en los datos de cada época, revisado a mano).

## Pulido recomendado (no bloquea la propuesta)
3. Plaza: el sendero se funde con el empedrado; borde de 1 px en tono `land-side`, no marrón grueso.
4. Mojón: tono piedra gris cálido (no crema), una muesca o banda grabada a media altura, o la cabeza algo apuntada
   (hito), y el rótulo a 11 px 500 en tinta 2, por debajo del nombre de la época.
5. Grosor del arco (intradós `land-side` de 3–4 px) y que al pulsar se hunda todo el grupo SVG de la puerta, no solo el texto.
6. Capturas de noche y modo oscuro antes de llevarlo a producción.

Con 1 y 2 hechos, se enseña a María como prototipo; con 3 a 5, esto pasa de 8 en todas las piezas.
