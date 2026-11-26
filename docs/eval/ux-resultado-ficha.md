# Resultado y ficha de pintor: ¿desplazarse o caber en una pantalla?

Opinión de experto (sin código). Maqueta y capturas a 390 px, en claro y en oscuro, en la carpeta temporal de la sesión
(`ux-pantallas/maqueta.html`, `resultado-*.png`, `ficha-*.png`, `ficha-abajo-*.png`; lo de hoy, en `ux-pantallas/actual/`).
Ejemplos: Botticelli recién dominado (resultado) y Velázquez con los niveles 1 y 2 hechos y el 3 por jugar (ficha). Para la ficha
uso a Velázquez porque tiene cinco historias. Botticelli enseñaría lo mismo con un solo círculo, «Quién fue».

## En dos frases

- **Resultado: una sola pantalla, sin desplazarse y sin pestañas.** Es un momento de cierre. Lo que cambia de una ronda a otra
  (meta, racha, rango, medallas) pasa a una fila de chips de alto fijo, así que la pantalla no crece nunca. «Seguir» queda fijo abajo.
- **Ficha: que se desplace está bien.** Es un perfil, y todos los perfiles buenos se desplazan. Lo que falla es el primer vistazo.
  Tiene que responder quién es, por qué importa, por dónde voy y «Jugar», todo antes del primer desplazamiento. Lo de debajo se
  acorta quitando lo que está repetido.

## 1. Pantalla de resultado

### Qué pasa hoy (`actual/resultado-hoy.png`)

Hay hasta diez bloques apilados: título, cifras, «Hoy has aprendido», tarjetas de rango, medalla, desbloqueo, racha, semana, barra
de rango, nota, «Seguir», «Repetir» y «Retar». En una ronda corriente mide unos 2,4 altos de pantalla (Veronés, `actual/resultado-hoy.png`), y con la meta cumplida aún
más. **«Seguir», la acción que busca el 95 % de la gente, queda bajo el pliegue.** Nada se disfruta porque todo compite, y el
tamaño de la pantalla depende de lo que haya pasado: no hay forma estable que el ojo aprenda.

### Qué es imprescindible en el primer vistazo

1. **Cómo me ha ido**: el titular («Muy buen ojo») y el aciertos.
2. **Qué he aprendido**: el rasgo del pintor. Es lo único pedagógico de la pantalla y debe ir pegado al titular, no en una caja.
3. **Qué he ganado**: XP y, si lo hay, los logros, como fichas pequeñas que se pueden pulsar.
4. **Qué hago ahora**: «Seguir».

### Qué sobra o se fusiona

- **Precisión**: repite lo que ya dicen los aciertos (8/9 = 89 %). En su lugar va **«Cuadros nuevos»**, que hoy está en el
  bloque «Hoy: N cuadros nuevos».
- **«Hoy has aprendido» como tarjeta con miniatura**: el cuadro ya llena la cabecera. Basta con la frase, sin rótulo.
- **Una tarjeta por logro** (rango, medalla, racha, meta, desbloqueo): pasan a **chips** de 48 px en una sola fila. Como mucho
  se ven tres y, si hay más, «+2». Cada chip lleva a su sitio (perfil, medallas). Así la pantalla mide siempre lo mismo.
- **Semana de la racha y barra de rango**: ya están en el perfil. Aquí basta «3 días» y «Aficionado».
- **«La próxima vez: X»** y **«Siguiente etapa»**: los dice mejor el mapa, que al pulsar «Seguir» ya se centra en la parada
  siguiente. Cuando la ronda abre algo (otro movimiento, siguiente en la rama), ocupa el sitio del tercer chip.
- **Aspa de cerrar**: haría lo mismo que «Seguir». Una sola salida.

### Jerarquía y acción principal

El cuadro del pintor va a sangre arriba, con la medalla montada encima. Debajo vienen el titular, la frase y luego las cifras y
los chips. **«Seguir» queda fijo abajo, en la zona del pulgar**, con «Repetir» y «Retar» encima a media anchura y menos peso.

### Tres enfoques

| | Qué es | Ejemplo | A favor | En contra |
|---|---|---|---|---|
| **A. Lista que se desplaza** (hoy) | Todo apilado | Informe de entreno de Strava | Cabe cualquier cosa | Ningún logro destaca, la acción queda escondida y el alto cambia cada vez |
| **B. Pantalla con pestañas u hojas** | Resumen y «ver más» en hojas | Ninguna app buena lo hace en un cierre | Pantalla corta | Al acabar nadie explora: lo que va en una pestaña no se ve. Además, hojas sobre una celebración es ruido |
| **C. Secuencia corta y resumen fijo** (recomendada) | Un momento grande si lo hay, y después una pantalla de resumen que cabe entera | Fin de lección de Duolingo: tres cifras en fichas y «Continuar» fijo. Racha y misiones van en pantallas aparte, solo si ocurren | Cada cosa se disfruta y la acción siempre está en el mismo sitio | Hay que elegir qué merece pantalla propia |

**Recomendación: C, con un tope.** Antes del resumen, **como mucho un momento grande por ronda**, por orden de prioridad: dominar a
un maestro (el «match» actual, que funciona bien), superar un nivel a fondo, completar un movimiento o un hito de racha (7, 30…).
Todo lo demás se queda en chips. Con «reducir movimiento», solo el resumen. Es lo que la auditoría ya proponía (cambio 2), pero sin
encadenar cinco pantallas: eso cansa en una app de rondas cortas.

**Pantallas bajas** (iPhone SE, 667 px): la cabecera del cuadro se encoge (`clamp`) y el resto no cambia. Sigue sin haber
desplazamiento. Con una ronda floja, la misma pantalla sin medalla: «Repetir» pasa a ser el botón principal y «Volver al camino» el
secundario, como hoy.

## 2. Ficha del pintor

### Qué pasa hoy (`actual/ficha-hoy.png`)

La portada, el retrato y el nombre están bien. Pero el botón «Jugar» cae hacia la mitad, y tras él hay cinco secciones de texto
seguidas: cómo reconocerlo, etapas, quién fue y los datos. Además, **la misma información sale dos o tres veces**:

- Las etapas aparecen en los círculos, en la lista «Etapas» y en «A fondo: 1» de los datos.
- «Quién fue» está a la vez en el primer círculo (la historia) y en un desplegable con el mismo texto.
- «Cuadros 12 / Vistos 8» de los datos repite lo que dice la cabecera de «Sus cuadros».

### Qué es imprescindible en el primer vistazo

Quién es (retrato, nombre, años y país, sello y movimiento), **por qué importa** (una frase), **por dónde voy** (aro y fila de
círculos) y **«Jugar · La corte»**. En la maqueta todo eso cabe en el primer alto de pantalla, encima de la barra inferior. La tira
de «Sus cuadros» asoma por abajo, y así se ve que hay más.

### Qué sobra

- **La lista «Etapas»**: la sustituyen los círculos, como ya decía la propuesta aprobada de niveles e historias.
- **El desplegable «Quién fue»**: es el primer círculo.
- **El bloque de datos**: queda en «14 de 33» junto a «Sus cuadros». Lo que falta por ver ya lo explican los círculos cerrados.
- La portada se queda en unos 200 px. Sigue siendo el cuadro, pero deja sitio a lo demás.

### Lo de debajo (`ficha-abajo-*.png`)

1. **Sus cuadros**: la tira que se desliza, con «Ver todos».
2. **Cómo reconocerlo**: cada rasgo con **un detalle del cuadro que lo enseña** (los grises de *Felipe IV de castaño y plata*,
   la pincelada de *Juan de Pareja*). Hoy son tres líneas de texto. Con la imagen se aprende a mirar, que es de lo que va la app.
   El recorte de cada detalle tendría que ir en los datos, revisado a mano.
3. **No lo confundas con** (opcional, sale de `similarTo`, que ya existe): Murillo y Rembrandt, y cada uno lleva a su ficha. La
   auditoría señalaba esta comparación como la que más enseña.

Al desplazarse aparece **una cabecera compacta fija** (atrás, retrato pequeño, nombre y «Jugar»), como la de Spotify: la acción
principal nunca se pierde. La ficha se queda en unos 1,6 altos de pantalla, aunque tenga más imagen que hoy.

### Tres enfoques

| | Qué es | Ejemplo | A favor | En contra |
|---|---|---|---|---|
| **A. Perfil que se desplaza, con buen primer vistazo** (recomendada) | Cabecera que se basta sola y debajo secciones cortas | Artista en Spotify (foto, nombre, play, populares, discografía y «Acerca de» al final). Artista en Google Arts & Culture (cabecera, carrusel de obras, biografía) | Es el gesto natural en un perfil y deja sitio a los cuadros | Si la cabecera no basta, la acción se hunde (lo que pasa hoy) |
| **B. Todo en una pantalla, con pestañas** | Cabecera y pestañas (Cuadros · Reconocer · Vida) | Pestañas del perfil de Instagram | Pantalla fija | Las pestañas sirven cuando cada una tiene mucho contenido, y aquí son tres secciones cortas. Esconde «Cómo reconocerlo», lo más didáctico, tras un toque que casi nadie da |
| **C. Tarjetas que se despliegan** | Secciones plegadas | Ajustes y preguntas frecuentes | Pantalla corta | Parece un formulario, no un museo. Cada pliegue es un toque de más, y lo plegado no se lee |

**Recomendación: A.** El problema no es desplazarse sino el orden y lo repetido. Cuando el primer vistazo resuelve lo importante y
lo de debajo vale la pena, desplazarse es un placer, no una carga.

## Coherencia con lo ya aprobado

- La fila de círculos va bajo el nombre y el sello, con los mismos tres estados que el aro (oro hecho, coral siguiente, cerrado
  borroso) y el mismo botón «Jugar · <nivel>» (`propuesta-niveles-historias.md`).
- No hay fuentes visibles ni textos de ayuda bajo los botones. Todo lo que parece pulsable se puede pulsar: los chips, los
  círculos, las miniaturas, los detalles y las fichas de «No lo confundas con».
- Solo se usan colores de `brand.css` y la letra Outfit. El oro significa «hecho» y el coral «lo siguiente».

## Textos nuevos

`Cuadros nuevos` · `Meta · Cumplida` · `Racha` · `Rango` · `No lo confundas con` · `Ver todos`. El resto ya existe.

## Para construirlo, por orden

1. Resultado: chips en lugar de tarjetas, fuera la precisión, la semana y la barra de rango, y «Seguir» fijo. Coste S. Prueba:
   el alto del resultado no pasa del de la pantalla en 390 × 844 con todos los eventos a la vez.
2. Ficha: fuera «Etapas», el desplegable «Quién fue» y los datos, y cabecera compacta al desplazarse. Coste S.
3. Ficha: detalle por rasgo en «Cómo reconocerlo», con recortes revisados a mano. Coste M.
4. «No lo confundas con», si María lo quiere. Coste S.
