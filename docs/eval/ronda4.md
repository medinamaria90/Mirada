# Mirada — Evaluación independiente, ronda 4

Método: servidor estático :8911; Playwright/Chrome 390×844, 360×640, 768×1024, 1280×800 y 195×422, claro y oscuro. Camino de 32 etapas jugado por la interfaz (jugador con 85 % de acierto: 32/32 dominadas, 1,4 intentos de media, 0 errores de consola); simulación propia sobre el motor (planStage real + regla real `stageRoundMastered`, 400 semillas × 32 etapas) con 5 modelos de jugador y 8 bots sin mirar; contraste y áreas táctiles con script propio (/tmp/ev/audit.mjs) en 10 rutas × 5 tamaños × 2 temas; teclado, reduced-motion, localStorage bloqueado, recarga a mitad de ronda, atrás, enlaces válidos/manipulados/inválidos, cambio de día/semana simulado (page.clock), reto semanal, detalle del día, medalla «Ojo de…», salas, red lenta (100 KB/s, 300 ms); 48 obras nuevas contrastadas con su imagen. `node --test tests/`: 96 pasan, 1 omitida (e2e); validate_catalog OK (306 archivos). Capturas en docs/eval/r4/.

## Notas

| Criterio | R1 | R2 | R3 | R4 | Justificación |
|---|---|---|---|---|---|
| Material 3 | 8 | 8 | 8 | 8 | Superficies, hoja de feedback, oscuro y escritorio de dos columnas coherentes; sigue sin una identidad cinética/forma propia que lo lleve a 9. |
| UX | 7 | 7 | 8 | 8 | Enlaces rotos avisan («Ese enlace no vale»), mapa con auto-scroll a la etapa actual, bloqueos explican por qué; resta la regla de dominio dura en pintores con 2 obras y metas invisibles. |
| Accesibilidad | 8 | 8 | 7 | 8 | Los fallos de R3 están cerrados (pista/flechas, volumen 48 px, hoja a 200 %, numerales); queda un contraste real (numerales de rachas bloqueadas 1,2:1 claro/2,5:1 oscuro) y Enter no avanza en la pantalla intermedia. |
| Rendimiento | 8 | 8 | 8 | 8 | Bienvenida 19 peticiones/198 KB (R3: 36/504 KB), mapa 50/588 KB; a 100 KB/s el mapa tarda 7,8 s (R3: 5,8 s). |
| Adaptativo | 8 | 8 | 8 | 8 | 0 desbordes en 5 tamaños × 10 rutas × 2 temas; hoja de feedback ya cabe a 1280×800; a 195 px la frase `look` queda bajo «Continuar». |
| Pulido | 7 | 8 | 8 | 8 | «Camino completo» honesto («Por repasar · quedan 4»), «Hoy has aprendido» solo ≥50 %, copiado confirmado; resta un hueco grande en el resultado y el recuento «66 cuadros por repasar». |
| Originalidad | 7 | 8 | 8 | 8 | Sala por movimiento con música, detalle del día, reto semanal y «Ojo de…» dan motivos para volver; ninguno es memorable por sí solo. |
| Calidad técnica | 8 | 7 | 8 | 8 | Motor puro, 96 tests, antibot en `node --test`; el e2e no entra por defecto y tarda más de 280 s (no pude verlo terminar). |

## Veredicto: APRUEBA, con margen mínimo (todos ≥ 8, sin fallos graves). Los puntos 1–4 de la lista deberían hacerse antes de dar por cerrada la puerta.

## FALLOS GRAVES
Ninguno. Sin roturas, callejones sin salida, pérdida de progreso (recarga a mitad de ronda conserva la posición 3/…; con localStorage bloqueado una ronda completa funciona y no hay errores de consola), privacidad ni autor/título erróneo en 48 obras.

## Trampas «dominar sin mirar» (reproducido por mí, regla de dominio real: 75 % y ≥2/3 sobre el propio pintor)
- Bots propios (300 semillas por etapa, máximo sobre las 32 etapas): «sin aprender en quién + movimiento de la etapa» 0,7 %; «obra más famosa en ¿Cuál?» 2,0 %; «obra nueva» 0 %; «obra learn» 1,7 %; «último movimiento» 0,3 %; «primera opción» 1,7 %; «pintor más repetido» 1,3 %; azar 0–1 %. Todos ≤ 2 % salvo mi bot «obra con año más cercano a la vida del pintor» en Leonardo (39,7 %): en la primera etapa los distractores son de otros siglos; no es explotable sin ver el año (la UI no lo muestra en la pregunta) y es legítimo reconocer el estilo, así que no lo cuento como fallo.
- Alumno que conoce a los anteriores y no mira al pintor nuevo (por descarte): 0–22 % por etapa (R3: 25–61 %). Máximos: Levitán 22 %, Klimt 22 %, Degas 21 %. Resuelto.
- Estado: **RESUELTO**.

## Regla de dominio: ¿es justa?
Simulación con probabilidades por pregunta (aprendiz «atento» 88 % conocidos / 90 % obra vista / 70 % obra nueva):
- Pintores con 2 preguntas propias por ronda (Durero, David, Gauguin, Munch; rondas de 6 preguntas): dominio por intento 57–61 %; «medio» (80/80/60): 35–40 %; «flojo»: 19–22 %.
- Leonardo (6 preguntas, todas propias, hace falta 5/6): atento 68 %, medio 43 %, flojo 18 %.
- Pintores con 4 preguntas propias: atento 76–90 %, medio 52–67 %.
- Jugando por interfaz con 85 %: 32/32 dominadas, 22 a la primera y el máximo fue 4 intentos (Toulouse-Lautrec). No es un callejón (reintento ilimitado; abrir la siguiente parada solo exige 50 %), pero dominar gobierna Repaso de movimiento, Sala/galería y «Camino completo», y en pintores con 2 obras una sola pifia en una ronda de 6 lo invalida. Comprensible, pero se siente injusta ahí; ver problema 3.

## Estado de los problemas de la ronda 3
1. Barra «Practicar» tapa pista/flechas: **resuelto** (360×640: pista y=170–240, flechas y=579–627 sobre la barra, nada tapado).
2. Contraste numerales de movimientos bloqueados y teclas 1–4: **resuelto** (mínimo medido 6,8:1 claro y 8,0:1 oscuro en el mapa; 0 fallos en 9 rutas). **Pero aparece uno nuevo**: numerales «3/7/30» de las rachas bloqueadas (ver nuevo 1).
3. Deslizador de volumen 44 px: **resuelto** (176×48; interruptores 56×48).
4. Hoja de feedback tapa la opción fallada a 200 %: **resuelto** (195×422: opciones marcadas y=94–216, hoja desde 228).
5. Hash roto sin aviso: **resuelto** (`#reto-zzz`, `#etapa-nope`, `#reto-d90261124-9`, `#reto-w202648-99`, fechas pasadas/futuras → inicio + «Ese enlace no vale»). Un reto válido (`#reto-w202648-12`, `#reto-d20261124-7`) muestra «Te han retado · 12 de 15 · Aceptar el reto / Ahora no».
6. «Camino completo» con etapas por repasar: **resuelto** («Por repasar · quedan 4», solo «Camino completo» con 32/32).
7. «Hoy has aprendido» con 14 %: **resuelto** (1/6 → «Se aprende mirando · Vuelve a mirar sus cuadros», con «Repetir»).
8. Exploit del movimiento anterior: **resuelto** (bot 0,3 %).
9. Etapa superable por descarte: **resuelto** (≤ 22 %).
10. Hoja cortada a 1280×800: **resuelto** (hoja y=545–776 en 800).
11. Peso de arranque: **mejorado** (19 peticiones/198 KB en la bienvenida; 50/588 KB en el mapa; 306 archivos).
12. Tests de interfaz fuera de `node --test`: **parcial** (`MIRADA_E2E=1` lo incluye, pero no terminó en 280 s).
13. Franja oscura en miniatura: **no reproducida** (no vista en ~60 capturas).
14. b37 / fecha local de retos: sin cambios; a125 ya marcada «(atribuida)» y fuera de preguntas de autor.
15. Progresión a largo plazo: **resuelto en lo esencial** (sala de movimiento, detalle del día, reto semanal, «Ojo de…», racha 30; ver «Engancha»).

## Novedades de la ronda 4, comprobadas
- **Sala/galería (`#galeria-<mov>`)**: 36 elementos de imagen en Renacimiento (18 obras con título, autor·año y frase `look`); si el movimiento no está dominado → inicio + «Se abre al dominar el movimiento». Funciona bien y es lo más bonito de la app (captura galeria-barroco 768 oscuro).
- **Detalle del día**: cambia cada día (8 días muestreados), una sola respuesta al día y conservada tras recarga, «Es de Caravaggio · La vocación de san Mateo · +5 XP». Dificultad desigual: algunos recortes (día 5: un fragmento de tela y brazo; día 8: mesa y vasos de Gauguin) son casi irresolubles; los distractores suelen ser de otra época, lo que facilita (Borovikovski frente a Rembrandt).
- **Reto semanal**: 15 preguntas (la ronda dura 18 con repeticiones), semana ISO, guarda 12/15 en la tarjeta, medalla «Primer reto semanal», «Copiar resultado» deja el texto con cuadrícula y enlace `#reto-w202648-8` y confirma «Copiado. Pégalo donde quieras.». Un jugador nuevo que acepta un reto semanal enviado por un amigo recibe 15 preguntas de todo el camino sin haber aprendido nada (8/15 con un jugador omnisciente al 50 % de ruido); es un reto, pero el estreno es duro.
- **«Ojo de…»**: al cerrar una ronda con todas las obras de Leonardo en caja 5 se concede «Ojo de Leonardo» («Todas sus obras, sin fallar») con tarjeta en el resultado. Pero la meta es invisible: está en «Y 36 más por descubrir» y `eyeProgress` no se usa en ninguna pantalla. Con 7–8 obras por pintor y ≈5 aciertos espaciados por obra, el repaso rápido (3 preguntas/día) lo hace prácticamente inalcanzable.
- **Contador «Reconoces»**: 41 en Perfil frente a «120 de 154 obras» en Colección; ambos correctos según definiciones distintas (caja ≥3 / vistas), pero dos cifras para algo parecido confunden.
- **Cambio de día/semana**: racha 1 → 2 al día siguiente, a los 5 días baja a 0, el repaso rápido aparece el día siguiente (68 → 116 → 143 «cuadros por repasar» según pasan los días), la tarjeta semanal cambia a «Semana 49» el 1 de diciembre, el detalle y el reto diario cambian.
- **Teclado**: Tab llega a la tarjeta de etapa, Enter entra, 1–4 responden, Enter continúa, el resultado enfoca su título. Salvedad: en la pantalla intermedia («Ahora, cuadros que no has visto») el foco está en el encabezado y Enter no hace nada; hay que pulsar Tab antes.
- **prefers-reduced-motion**: 0 elementos con animación o transición > 50 ms en la etapa; ajuste propio «Reducir animaciones» en Perfil.
- **Reglas de la dueña**: «ayer/mañana» ausentes en js, css, index y en los 156 `look`; el mapa bloqueado explica por qué al pulsar; en cambio las medallas de Perfil (círculos con sombra) no hacen nada al pulsarlas (ver nuevo 5). Colores armoniosos: sí (paleta tierra, oscuro bien resuelto). Textos mínimos: el inicio de un jugador avanzado tiene hasta 5 tarjetas (Ronda libre, Semanal, Diario, Repaso rápido, Detalle) antes del mapa; el mapa hace auto-scroll a la etapa actual, así que a mitad de camino no estorba, pero con todo dominado el mapa queda fuera de la primera pantalla.

## Problemas nuevos o pendientes (priorizados)

IMPRESCINDIBLE (para consolidar el 8 de Accesibilidad)
1. **Contraste de numerales de rachas bloqueadas.** Dónde: Perfil/Medallas, `.medal-num` «3», «7», «30» (13 px). Qué: blanco sobre gris claro 1,2:1 en claro y 2,5:1 en oscuro (script y captura m-medals-streak-light.png). Repro: abrir `#medallas` con cualquier estado. Arreglo: color de texto ≥ 4,5:1 sobre el fondo del sello bloqueado, o quitar el número (el rótulo «3 días» ya está debajo y el sello es `aria-hidden`).
2. **Enter no avanza en la pantalla intermedia.** Dónde: `.interlude`. Qué: el foco queda en el h1 y, a diferencia de la hoja de feedback, Enter no hace nada (hay que Tab+Enter). Repro: teclado puro, etapa de Leonardo, tras la 3.ª pregunta. Arreglo: mover el foco al botón «Seguir» o atender Enter/Espacio en la pantalla.

IMPRESCINDIBLE SOLO SI SE QUIERE UN 9 EN UX
3. **Dominio duro en pintores con 2 obras propias.** Dónde: `planStage` (Durero, David, Gauguin, Munch: 6 preguntas, 2 propias, hacen falta 5/6 y 2/2); Leonardo 5/6. Qué: un alumno atento domina solo el 57–68 % de los intentos. Arreglo: subir a 3 preguntas propias en esos pintores (rondas de 7) o aceptar 1 fallo propio cuando n ≤ 3 si la precisión global ≥ 75 %; mantener la prueba antibot.

MEJORAS
4. **«Ojo de…» invisible e inalcanzable.** Mostrar «Ojo de X · 3/7» en la ficha del pintor/colección con `eyeProgress`, y/o rebajar a «≥ caja 4».
5. **Medallas de Perfil con aspecto de botón pero inertes.** Dónde: `.medal` en Perfil y Medallas. Arreglo: hacerlas pulsables (hoja con título, subtítulo y fecha) o quitarles la sombra/borde elevado; los sellos bloqueados deberían decir qué piden.
6. **Detalle del día demasiado difícil en algunos recortes** (día del 2/12: tela y brazo; día del 5/12: mesa y vasos). Arreglo: exigir un recorte con rostro, mano o pincelada característica, o ampliar menos.
7. **Reto semanal aceptado por un jugador nuevo** sin ninguna etapa: mostrar antes «Incluye pintores que aún no has visto» o limitarlo a lo desbloqueado.
8. **Recuento «66/143 cuadros por repasar»** crece sin parar y desanima; el repaso rápido solo son 3 preguntas. Mostrar «3 cuadros» o «Repaso de hoy» en lugar del total.
9. **Frase `look` bajo «Continuar» a 195 px** (200 % de zoom): el texto de la hoja queda tapado. Arreglo: `padding-bottom` de la hoja = altura del botón o scroll interno.
10. **Resultado con hueco central grande** en Ronda libre (captura share.png): colocar el nivel/pista en el centro o compactar.
11. **Mapa con todo dominado fuera de la primera pantalla** (5 tarjetas arriba). Arreglo: plegar Detalle/Repaso en una sola tarjeta «Hoy» o dejar solo Ronda libre + Semanal.
12. **Dos cifras de «reconocidas»** (41 / 120 de 154). Unificar etiqueta («Dominadas» vs «Vistas»).
13. **Peso a red lenta**: mapa 7,8 s a 100 KB/s, 27 módulos sueltos (272 KB de JS, 60 KB de CSS). Empaquetar en 3–4 módulos o `modulepreload` solo de los necesarios.
14. **e2e tarda > 280 s**: dividir en un humo de 60 s dentro de `node --test` (menús + una ronda + retos) y dejar el resto aparte.
15. **a60 (Renoir, «Muchachas al piano»)** con marco negro de escaneo y firmas rusas visibles en a228/a176 (Repin): recortar el marco; las firmas son pequeñas y no delatan (no se leen a tamaño de pregunta).

## Errores de contenido artístico
48 obras contrastadas (ids de b*, a* no revisadas en R1–R3: a14, a60, a121, b24, a193, a182, a91, b8, a174, a27, a79, b6, a211, a232, a3, a176, a102, a105, a141, a106, a9, a21, a172, b18, a228, a199, a76, a89, a70, a88, a186, a135, a6, a30, a119, a203, a127, a74, a32, a170, a13, a145, a62, a136, b20, a144, a173, a126): **ninguna con autor, título o año erróneo**. Las 29 frases `look` presentes coinciden con la imagen (p. ej. a91 luz diagonal sobre la pared, a32 reflejo sin rostro, a144 cielo claro tras el óvalo de la cara, a186 la gran X, a21 mil escenas pequeñas). Observaciones:
- a14 (Claudio de Lorena, «El embarque de santa Úrsula», 1641), a232 (Aivazovski, «Tormenta en el mar», c. 1873), a193, a102, a106, b20 llevan `confidence: medium`; los datos visibles son correctos, pero no tienen `look`.
- a60 tiene marco negro de escaneo; a126 «Cuadrado negro» está bien (margen blanco propio de la obra).
- a228 `look` «entorna los ojos al sol»: a tamaño de pregunta los ojos no se aprecian; «la niña sentada en una rama» sería más visible.

## ¿Engancha? ¿Enseña?
Enseña: pista «Fíjate en…» al inicio de cada pintor, frase `look` en el cuadro y en la galería, repaso espaciado y cuadros nuevos; con el 85 % se reconocieron 107 cuadros nuevos en 307 respuestas. Engancha: racha, meta diaria (se cumple con una ronda), reto diario/semanal, repaso rápido (3 preguntas, sirve para la racha), detalle con +5 XP y salas con música al terminar cada movimiento; las metas largas («Ojo de…») no se ven. Hay motivo para volver tras el camino, que en R3 faltaba.

## Qué subiría cada criterio de 8 a 9
- Material 3: sistema de forma/movimiento propio (transiciones de contenedor entre tarjeta del mapa, ficha y ronda) y color dinámico por movimiento en toda la ronda.
- UX: dominio tolerante en pintores con 2 obras, metas largas visibles con progreso, tarjeta única «Hoy».
- Accesibilidad: corregir 1 y 2, probar con lector de pantalla real (anuncios de acierto/fallo y de desbloqueo) y soporte de `forced-colors`.
- Rendimiento: paquetes de 3–4 módulos, carga diferida del atlas de la galería, mapa < 3 s a 100 KB/s.
- Adaptativo: layout propio de tableta (dos columnas con galería a la derecha) y hoja de feedback sin tapar texto a 200 %.
- Pulido: medallas pulsables con hoja de detalle, resultado sin huecos, recortes del día curados a mano.
- Originalidad: «Ojo de…» y rasgos coleccionables visibles, duelo asíncrono con marcador, galería con una línea explicativa por sala.
- Calidad técnica: humo e2e < 60 s dentro de `node --test`; bots antibot independientes de la regla (hoy miden la probabilidad bajo la misma regla de dominio) y un test de dominio justo para ≥ 70 % de intentos de un aprendiz atento.
