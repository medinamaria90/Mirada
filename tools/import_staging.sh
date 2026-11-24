#!/usr/bin/env bash
# Incorpora a <app>/img/ las obras nuevas preparadas en <staging>/img/b<N>.jpg (oleada 4).
# Las imágenes son material descargado NO confiable: solo se pasan rutas a ImageMagick con el
# decodificador JPEG forzado ("jpg:") y se eliminan metadatos.
# b6 y b7 son trípticos de Rubens con huecos blancos entre tablas: se recorta la tabla central
# (geometría medida sobre las imágenes de staging de 640 px).
# Después: bash tools/make_thumbs.sh <app> y python3 -I tools/patch_catalog.py <app>.
# Uso: bash tools/import_staging.sh <staging> <app>
set -euo pipefail
staging="${1:?uso: import_staging.sh <staging> <app>}"
app="${2:?uso: import_staging.sh <staging> <app>}"
declare -A CROP=( [b6]="327x467+151+2" [b7]="277x371+184+2" )
count=0
for i in $(seq 1 37); do
  id="b$i"
  src="$staging/img/$id.jpg"
  dst="$app/img/$id.jpg"
  if [[ -n "${CROP[$id]:-}" ]]; then
    convert "jpg:$src" -crop "${CROP[$id]}" +repage -strip -interlace JPEG -quality 85 "jpg:$dst"
  else
    # Ya vienen a ≤1000 px, calidad 75 y sin metadatos (lo comprueba validate_catalog.py):
    # se copian tal cual para no recomprimir.
    cp "$src" "$dst"
  fi
  count=$((count + 1))
done
echo "importadas: $count"
