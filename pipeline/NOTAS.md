# Notas del proceso de catálogo

Proceso que reúne ~1.000 cuadros en dominio público con metadatos y títulos en español.
Todo lo que necesita internet corre en GitHub Actions (`.github/workflows/pipeline.yml`),
que se lanza al hacer push de `pipeline/RUN` (una línea por paso) y hace commit de sus salidas.

## Pasos
1. `resolve` — verifica el QID de cada pintor (`pipeline/painters.json`) → `pipeline/out/painters_resolved.json`.
2. `candidates` — obras candidatas por pintor (Wikidata SPARQL + datos del archivo en Commons) → `pipeline/out/candidates/<id>.json`.
3. `select.py` (local, sin red) — elige las obras → `catalogo/seleccion.json`.
4. `download [n]` — descarga en lotes de 150 (n lotes), reanudable → `catalogo/img/<id>.jpg`.
5. `build` / `validate` — `catalogo/obras.json`, `catalogo/pintores.json`, `CREDITS.md` y comprobaciones.

## Bitácora
