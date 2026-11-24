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
- Cualquier cuadro se abre a pantalla completa al pulsarlo. Sin zoom de página (pellizco o doble toque);
  para ver detalles está la lupa del visor.
- Sin `alert`/`confirm`/`prompt`, sin recursos remotos en tiempo de ejecución.
- Datos de arte verificados con fuentes (museos, Wikidata, enciclopedias) y con su fuente anotada.
  Nada de memoria del modelo. Solo pintores muertos antes de 1946 y obras anteriores a 1930.
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
python3 -I tools/validate_catalog.py app        # valida catálogo, imágenes y atlas
python3 -I tools/patch_catalog.py app           # regenera el catálogo desde tools/catalog_data.py
cd app && python3 -m http.server 8000           # servir en local
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
- `catalogo/` y `pipeline/` — proceso que reúne ~1.000 obras desde Wikidata/Commons con GitHub Actions.
