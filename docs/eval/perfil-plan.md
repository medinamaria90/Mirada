# Perfil nuevo — plan

Objetivo: que el perfil diga quién eres (no una hoja de números), con el aire de Duolingo y el cuadro como
protagonista. Mesa de diseño: `marca/project-r2/P-perfil.dc.html`. Auditoría: `docs/eval/auditoria-ux.md` §5.

## Secciones (de arriba abajo)
1. **Identidad**: portada con un detalle de un cuadro (el pintor del que más cuadros tienes; dentro de él,
   el más famoso), avatar redondo (logo; con nombre, la inicial), saludo («Hola, María» o «Ponte un nombre»
   con lápiz), rango con barra al siguiente y qué falta (XP, niveles «a fondo»…). Botón ⚙ en la portada.
2. **Tres cifras**: cuadros que reconoces · pintores que distingues (dominados) · racha con días de gracia.
3. **Mi museo**: rejilla 3×3 con los últimos cuadros reconocidos (se abren en el visor, se pasan
   deslizando) y «Ver todo» → Colección. Huecos vacíos sin pulsación.
4. **Logros**: oro/plata/bronce (anillo de color), bloqueados en gris; muestra los mejores y «Ver todos».
   Cada logro abre su hoja (cómo se gana, cuándo).
5. **Tu test de pintura**: último resultado (nivel, «n de m», «sabes más que el X %») con «Hacer el test» y
   «Compartir»; sin resultado, solo «Hacer el test». El test ya guarda el percentil en
   `mirada.test.last` (no hay que tocarlo).
6. **Seguir practicando**: «Repaso de 5» (si hay) y «Reto semanal».
7. **Ajustes** (hoja aparte, ⚙): tema, música, sonidos, volumen, meta diaria, reducir animaciones y
   «Empezar de cero» con confirmación en la propia hoja.

## Nombre (añadido de María)
`settings.name`, opcional, ≤ 24 caracteres, solo en el navegador (`localStorage`, nada sale). Se edita al
tocar el nombre/lápiz (hoja con campo y «Guardar»). Esquema **v8** con migración 7→8 (`name: ''`) y prueba.
Sin nombre: avatar con logo y «Ponte un nombre». Con nombre: saludo e inicial.

## Estados
- **Vacío** (recién empezado): portada de color de marca (sin cuadro), avatar con logo, «Curioso» con barra,
  cifras en 0, museo con huecos y «Ir al camino», logros todos en gris (los 6 primeros), test sin resultado.
- **Inicial** (pocos cuadros): museo parcial, rango Curioso/Aficionado, algún logro bronce.
- **Avanzado**: portada con cuadro, museo lleno, logros de los tres metales, test con resultado, repaso.

## Criterios de aceptación
- Textos mínimos, sin ayuda bajo botones; todo lo pulsable lo parece; táctil ≥ 48 px; contraste ≥ 4,5:1
  en claro y oscuro; sin «ayer»/«mañana»; sin colores fuera de `brand.css`.
- 390×844, 360×640, 768×1024, 1280×800 sin desplazamiento horizontal.
- Un cuadro del museo abre el visor; «Ver todo» va a Colección; «Hacer el test» va a `test/`.
- Ajustes funcionan como antes (tema, audio, meta, reducir animaciones, reinicio).
- Código: módulos pequeños (`engine/profile.js` puro con pruebas; `ui/screens/profile*.js`;
  `css/profile.css`). Pruebas `node --test tests/` y humo en verde.
