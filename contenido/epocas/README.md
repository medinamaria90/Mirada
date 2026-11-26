# Tarjetas de época

Cuatro tarjetas didácticas por movimiento, que la app enseña deslizando desde la pantalla de presentación de la época. Un archivo por movimiento, `contenido/epocas/<movementId>.json` (el id es el de `movements` en `app/data/catalog.json`):

```json
{ "movementId": "renacimiento", "cards": [
  { "kicker": "Cuándo y dónde", "text": "≤180 caracteres", "artwork": "w549847", "source": "https://…" },
  { "kicker": "Qué cambia", "text": "…", "artwork": "w…", "source": "https://…" },
  { "kicker": "Fíjate en", "text": "…", "artwork": "w…", "source": "https://…" },
  { "kicker": "Curiosidad", "text": "…", "artwork": "w…", "source": "https://…" } ] }
```

- Siempre esas cuatro tarjetas, en ese orden. «Qué cambia» compara con la época anterior del camino (gótico → renacimiento → manierismo y norte → barroco → rococó y neoclasicismo → romanticismo → realismo → impresionismo → postimpresionismo → simbolismo y vanguardias); el ukiyo-e es una rama aparte y se compara con la pintura europea de su tiempo.
- `text`: como mucho 180 caracteres, frases cortas, lenguaje humano, tono «museo vivo». Nunca «ayer» ni «mañana».
- `artwork`: obra con `role` «learn» del mismo movimiento; a ser posible, una distinta en cada tarjeta.
- `source`: URL real que respalda lo dicho (museo de referencia, Wikipedia, enciclopedia). Datos con fuente, nada de memoria; si un dato no se puede respaldar, no se escribe.

`python3 -I tools/sync_epocas.py` valida todo esto y copia los archivos a `app/data/epocas/` con su `index.json`.

Primera tanda (11 movimientos): las fuentes se contrastaron con búsquedas web (fichas de museos, Wikipedia, Britannica, artículos académicos), sin acceso directo a Wikipedia en español, por eso casi todas las URL son de museos o de referencias en inglés. Pendiente: sustituirlas por la ficha del museo o la sección de Wikipedia en español cuando se pueda.
