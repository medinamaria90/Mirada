# Tarjetas de época

Ocho tarjetas didácticas por movimiento (nueve si hace falta una extra), que la app enseña deslizando desde la pantalla de presentación de la época (la última lleva un botón para empezar a jugar). Tratan de **la época**, no de un pintor: quien quiera biografías tiene las historias. Un archivo por movimiento, `contenido/epocas/<movementId>.json` (el id es el de `movements` en `app/data/catalog.json`):

```json
{ "movementId": "renacimiento", "cards": [
  { "kicker": "Cuándo y dónde", "text": "≤180 caracteres", "artwork": "w27697131", "source": "https://…" },
  { "kicker": "Por qué surge", "text": "…", "artwork": "w…", "source": "https://…" },
  … ] }
```

Siempre estas ocho tarjetas, en este orden:

1. **Cuándo y dónde**: siglos y lugares.
2. **Por qué surge**: qué pasaba en el mundo (dinero, religión, ciudades, inventos) y a qué reaccionaba.
3. **Qué cambia**: frente a la época anterior del camino (gótico → renacimiento → manierismo y norte → barroco → rococó y neoclasicismo → romanticismo → realismo → impresionismo → postimpresionismo → simbolismo y vanguardias). El ukiyo-e es una rama aparte y se compara con la pintura europea de su tiempo.
4. **Cómo se pintaba**: técnica, materiales y taller (temple, fresco, óleo, pastel, tubos…).
5. **Fíjate en**: un rasgo visible en la obra de la tarjeta para reconocer la época de un vistazo.
6. **Sus grandes temas**.
7. **Qué nos dejó**: lo que hoy damos por hecho gracias a ella.
8. **Curiosidad**: una anécdota sorprendente sobre la época, nunca una biografía.

Como mucho, una **tarjeta extra** con su propio «kicker», en el sitio que pida el relato, cuando la época necesita contar dos caminos a la vez (en manierismo y norte, «Mientras, en el sur», tras «Por qué surge»).

- `text`: como mucho 180 caracteres, una sola idea, frases cortas, lenguaje humano, tono «museo vivo». Nunca «ayer» ni «mañana».
- `artwork`: obra con `role` «learn» del mismo movimiento; a ser posible, una distinta en cada tarjeta.
- `source`: URL real que respalda lo dicho (museo de referencia, Wikipedia, enciclopedia). Datos con fuente, nada de memoria; si un dato no se puede respaldar, no se escribe.

`python3 -I tools/sync_epocas.py` valida todo esto y copia los archivos a `app/data/epocas/` con su `index.json`.

Primera tanda (11 movimientos, 4 tarjetas) y segunda (8 tarjetas): las fuentes se contrastaron con búsquedas web (fichas de museos, Wikipedia, Britannica, artículos académicos), sin acceso directo a Wikipedia en español, por eso casi todas las URL son de museos o de referencias en inglés. Pendiente: sustituirlas por la ficha del museo o la sección de Wikipedia en español cuando se pueda.
