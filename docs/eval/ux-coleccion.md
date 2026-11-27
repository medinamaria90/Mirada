# Colección: auditoría y propuesta

Recorrido con Playwright a 412×915, en claro y en oscuro. Tres estados: al principio (Botticelli dominado y Masaccio a
medias), a medias (8 pintores) y avanzado (30 pintores). Referencias: Apple Music (Biblioteca), Spotify, Instagram (perfil
y búsqueda), Google Arts & Culture y Duolingo (lo bloqueado que se ve). Capturas en `docs/eval/coleccion/`.

## En dos frases

- **Hoy la Colección es un almacén y no un museo.** Repite una misma franja (nombre, «7 de 12», «Ver sus 7 cuadros», tres
  cuadrados) pintor tras pintor, en dos pestañas que ordenan lo mismo. Además, un cuadro de la Colección no cuenta nada: los
  1.041 datos curiosos solo se leen dentro de una ronda.
- **Propuesta: una sola página con estanterías.** Arriba el buscador. Después lo último que has visto, una fila por época con
  sus pintores y, al final, lo que te espera, bloqueado pero con nombre y una frase. Cada cuadro abre el visor con su
  historia, y la página de la obra pasa a ser un sitio al que se vuelve.

## Problemas, por gravedad

### Graves

1. **Lo que no has alcanzado no existe** (`antes-medias-l-coleccion.jpg`). Ni en la lista, ni en el buscador («No encuentro
   nada con ese nombre»), ni como hueco. Para alguien que empieza, la Colección son dos franjas y nada más: no hay deseo ni
   meta. Duolingo, los álbumes de cromos y los logros de cualquier juego enseñan lo bloqueado precisamente para eso.
2. **Un cuadro de la Colección no enseña nada.** Al tocarlo sale el visor con título, autor y museo. El dato curioso y la
   página de la obra («Ver más») solo se ven en la hoja de feedback de una ronda. La parte más didáctica de la app queda fuera
   del único sitio pensado para mirar con calma. María ya había pedido «pasar de un cuadro a otro manteniendo el texto».
3. **Dos pestañas que dicen lo mismo** (`antes-avanzado-l-pintores.jpg`). «Cuadros» y «Pintores» agrupan igual (época →
   pintor) y llevan al mismo sitio, la ficha. Obligan a elegir sin saber qué cambia.

### Medios

4. **Ritmo monótono y tres toques que van casi al mismo sitio.** En cada franja, el nombre lleva a la ficha, «Ver sus 7
   cuadros» a la galería y la miniatura al visor. Con 30 pintores son 90 cuadrados iguales y 60 enlaces de texto.
5. **El rótulo de época parece un botón y no lo es** (una píldora de color). Incumple «todo lo que parece pulsable se pulsa».
6. **«54 de 1460 vistos»**: la primera cifra que lees te dice que no has hecho casi nada.
7. **El buscador solo sale con 15 pintores.** El desplegable «Todos» es nativo y feo, y la fila «Salas» se corta
   («Manierismo y Renac…»).
8. **Recortes cuadrados**: los retablos verticales y los frisos se cortan en las miniaturas.

### Leves

9. En «Pintores», cada fila ocupa cuatro líneas (nombre, años, sello y «Dominado · 7/12») y el aro dice lo mismo que la cifra.
10. Página de la obra: las etiquetas en mayúsculas de la ficha de museo pesan más que el propio dato curioso, y no hay forma
    de seguir a otra obra.

## Propuesta

### Qué se ve primero

1. **Título y una cifra amable**: «8 pintores · 54 cuadros». Sin «de 1.460».
2. **Buscador, siempre.** Encuentra pintores conocidos, sus cuadros y también a los que esperan, marcados «Por descubrir» con
   un candado y sin miniatura.
3. **«Lo último»**: los 12 últimos cuadros, en su proporción y a la misma altura (como una pared de museo). Cada uno se abre
   a pantalla completa. «Ver los 54» lleva a la rejilla con todos.

### Cómo se agrupa

4. **Una fila por época**, deslizable, con su punto de color. El título lleva a la presentación de la época (solo si ya la
   has visto, para no destripar cuadros), y la sala va en una píldora al lado si está abierta. Dentro, **una tarjeta por
   pintor**: portada 4:5 con su cuadro visto más famoso, nombre y «7 de 12», más el check dorado si está dominado. La tarjeta
   lleva a su ficha, que ya tiene galería, rasgos y niveles. Así no se duplica nada.
5. **Detrás de los conocidos, los que esperan**, en el orden en que llegan en el camino.
6. **«Por descubrir» al final**: las épocas en las que aún no conoces a nadie, con tarjetas algo más pequeñas.
7. **Sin «Tus favoritos» por ahora**: la app no tiene favoritos, y añadirlos es una función nueva con su estado. Si María los
   quiere, irían en una fila entre «Lo último» y las épocas.

### Estado bloqueado (qué se enseña sin destripar el juego)

- **Sí**: nombre, años, país, sello (gran maestro, maestro, invitado), época y la frase de «por qué importa», que ya está
  escrita y cuidada para los 174 pintores. También dónde se conoce: «Lo conocerás en el camino» o «… en la rama Gótico», con
  un botón que lleva allí.
- **No**: ninguna imagen suya, ni miniatura, ni portada, ni avatar con cuadro. El juego consiste en reconocer cuadros, y una
  imagen vista antes de su «Conoce a…» le resta emoción. La frase puede nombrar una obra («el pintor de La primavera»), y
  eso no estropea nada: en las preguntas el título va oculto.
- **Por qué con nombre** y no una silueta anónima: la regla de textos de María es «que piense: quiero saber más de esta gente».
  Una casilla con «?» no engancha. «Artemisia Gentileschi · Por descubrir» sí.

### Ficha de obra

- **En el visor**, bajo el título, va el dato curioso (si lo hay) y un «Ver más». Al deslizar al siguiente cuadro cambia el
  texto: es lo que María pidió el 24/11.
- **Página de la obra**: el dato curioso primero y la ficha de museo más ligera. Al final, «Más de Tiziano», una fila con sus
  otras obras vistas: tocar una cambia la página a esa obra sin cerrarla.

### Reglas respetadas

Textos mínimos (sin ayudas bajo los botones), todo lo que parece pulsable se pulsa, los cuadros se abren a pantalla completa
(la portada de una tarjeta de pintor es la carátula de su ficha, como en el mapa) y los colores salen de variables, con el
acento de cada época y nada estridente.

## Capturas de la propuesta construida

- `despues-medias-l.jpg`: a medias, claro. Buscador, «Lo último», Renacimiento y el principio de «Por descubrir».
- `despues-avanzado-d.jpg`: avanzado, oscuro, con salas.
- `despues-bloqueado-d.jpg`: hoja de un pintor por descubrir.
- `despues-buscar-l.jpg`: el buscador encuentra a Velázquez, aún sin conocer.
