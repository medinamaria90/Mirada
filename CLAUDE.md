# Mirada — reglas del proyecto

Mirada es una web app en español, móvil primero, para aprender a mirar y reconocer pintura clásica
jugando («Duolingo de arte»). Dueña y autora: María Medina Cañete. Lee `docs/TRASPASO.md` antes de
empezar: tiene el estado, las decisiones tomadas y la lista de pendientes en orden.

## Cómo trabajar con María

- Habla en español de España. Respuestas cortas, con lo importante primero. Lee desde el móvil a menudo.
- Quiere sentido crítico: recomienda, lleva la contraria con argumentos y no conviertas un comentario
  suyo en un cambio radical. Ajustes sutiles y coherentes con lo ya validado.
- El trabajo lo hacen agentes en segundo plano; tú coordinas y sigues disponible para hablar. Usa
  modelos ligeros donde baste y el potente solo donde haga falta.
- Si pide instrucciones «paso a paso», da un solo paso cada vez y espera a que diga que lo ha hecho.
  Si tiene que entrar en algún sitio, dale el enlace exacto.
- No pegues ni pidas claves en el chat. Las claves van en variables de entorno o secretos.

## Publicar

- Cada novedad se sube a producción (main + despliegue en Render) en cuanto está hecha, sin pedir
  permiso: María la prueba en tiempo real desde el móvil y da feedback. Aún no hay usuarios.
- Pruebas justas: `node --test tests/` antes de publicar; el e2e completo solo cuando el cambio lo
  pida. María hace las pruebas de estrés a mano.

## Puerta de calidad (obligatoria para toda pantalla o mejora)

Planificador → generador → **evaluador independiente nuevo** que puntúa de 0 a 10 ocho criterios:
Material 3 (equivalente web), UX, accesibilidad, rendimiento, adaptativo, pulido, originalidad y
calidad técnica. Aprueba si todos ≥ 8 y no hay fallos graves (roturas, trampas, pérdida de progreso,
privacidad, datos de arte erróneos). Bucle sin pedir permiso, máximo 5 iteraciones. Al final: tabla de
notas, número de iteraciones y mejoras clave por ronda, sin narrar pasos intermedios. El evaluador no
puede ser quien construyó y no modifica código. Informes anteriores en `docs/eval/`.

## Reglas de producto y diseño

- Textos mínimos y en lenguaje humano. Nada de textos de ayuda bajo los botones.
- Todo lo que parece pulsable se puede pulsar.
- Colores armoniosos, nada estridente. La interfaz no compite con los cuadros.
- Nunca «ayer» ni «mañana» en textos de la app (los títulos de cuadros no cuentan).
- Cualquier cuadro se abre a pantalla completa al pulsarlo, salvo donde el cuadro es la carátula de un
  destino (mapa, tarjeta «Continuar», medallas), que lleva a su sitio. Sin zoom de página (pellizco o
  doble toque); para ver detalles está la lupa del visor.
- Sin `alert`/`confirm`/`prompt`.
- Música: todas las piezas nuevas son composiciones propias (los clásicos encajados en el motor suenan
  peor). Cada sitio tiene su música: portada, cada época y cada rama (también las «Descubre…»), con un
  tema principal y como mucho dos secundarios (`app/js/audio/playlists.js`). El tema de la portada,
  «Sala de entrada», es el hilo de la app: sus variaciones por época, a lo Animal Crossing. María elige
  con el modo secreto (Perfil → Ajustes, 5 toques en el título, código 1538).
- Código, letras, imágenes y música se sirven desde la propia app (más rápido y sin depender de nadie).
  Un servicio externo se permite si aporta algo claro y no usa cookies ni datos personales: hoy, solo
  el contador de visitas GoatCounter (`app/js/stats.js`). Cada servicio nuevo, con el visto bueno de
  María y anotado aquí.
- **Valor supremo de los textos: que sean didácticos y enganchen.** Que quien lo lea piense «qué
  interesante el arte, quiero saber más de esta gente». Por encima de la exhaustividad: frases vivas,
  anécdotas, el porqué de cada pintor y cada época; nada de tono de enciclopedia.
- Datos de arte: se pueden escribir de memoria; solo se busca lo dudoso (fechas, lugares, anécdotas
  de las que no se esté seguro), y lo que siga dudoso se deja fuera. Cada texto lleva una fuente de
  referencia (Wikipedia del pintor o de la época, el museo de la obra). Decisión de María, 26/11.
- Solo pintores muertos antes de 1956 (dominio público en Europa) y obras anteriores a 1930; lo
  comprueba `tools/validate_catalog.py`.
- Los autores españoles van sobrerrepresentados, mezclados en su época (no en un bloque aparte).

## Código (skill `buenas-practicas-codigo`)

- JS vanilla con módulos ES, sin dependencias ni paso de build. Motor puro sin DOM (`app/js/engine`),
  estado versionado con migraciones (`app/js/state`), interfaz (`app/js/ui`), audio (`app/js/audio`).
- Nada de archivos monolíticos: cada archivo una responsabilidad; revisa lo que pase de ~300 líneas.
- `const`/`let`, nunca `var`. Valores con significado en constantes con nombre.
- Ningún color escrito a mano fuera del archivo de variables CSS; tampoco en JS. Espaciados, radios,
  duraciones y capas, también en variables.
- Sin código muerto ni `catch` vacíos. Un cambio de comportamiento lleva su prueba.
- Commits pequeños con mensaje claro en español.

## Comandos

```bash
node --test tests/                              # pruebas del motor y del estado (rápidas, sin navegador)
MIRADA_E2E=1 node --test tests/e2e.test.js      # humo en Chrome (~20 s)
bash tests/e2e.sh                               # recorrido completo con auditoría de contraste y táctil (~6 min)
python3 -I tools/catalog_from_pipeline.py app    # regenera app/data/catalog*.json desde catalogo/ (+ textos de tools/catalog_data.py)
bash tools/fetch_images.sh <carpeta>            # baja las imágenes (release catalogo-img); con «app/img» también pinta el atlas
python3 -I tools/make_atlas.py app <carpeta>    # solo el atlas de miniaturas (app/img/s) con las imágenes de <carpeta>
python3 -I tools/validate_catalog.py app [<carpeta>]   # valida catálogo, ramas, atlas y, si se da, las imágenes
python3 tools/serve_local.py 8000 app <carpeta> # servir en local, montando las imágenes de <carpeta> bajo /img/
```

El e2e usa Playwright con Chrome del sistema; si en tu máquina están en otro sitio, pásalos en las
variables `MIRADA_PLAYWRIGHT` (carpeta del paquete) y `MIRADA_CHROME` (ejecutable).

## Estructura

- `app/` — la app estática que se publica (index.html, css, js, data, img, fonts).
- `tests/`, `tools/` — pruebas y herramientas (catálogo, atlas de miniaturas, e2e).
- `docs/SPEC.md` — contrato técnico (esquema del catálogo, audio, diseño, calidad).
- `docs/BITACORA.md` — decisiones y versiones, en orden. `docs/eval/` — evaluaciones y auditoría de UX.
- `contenido/lecciones/` — fichas por pintor con fuentes (piloto de 3 pintores).
- `marca/` — fuentes de la propuesta de identidad (en curso, por rondas con María).
- `catalogo/` y `pipeline/` — proceso que reúne las 1.315 obras desde Wikidata/Commons con GitHub Actions. Las imágenes
  (`app/img/w*.jpg`) y el atlas (`app/img/s/`) NO están en el repo: se bajan y se pintan al desplegar (`tools/fetch_images.sh`).
  En local, bájalas a una carpeta temporal fuera del repo y pásala en `MIRADA_IMG_DIR` al e2e.
