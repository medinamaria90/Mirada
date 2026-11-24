#!/usr/bin/env bash
# Genera las hojas de miniaturas (atlas, <app>/img/s/*.jpg) y vuelca el catálogo con su posición.
# Las imágenes de origen se tratan como no confiables: Python aislado (-I) y solo Pillow.
# Uso: bash tools/make_thumbs.sh <dir_app>
set -euo pipefail
app="${1:?uso: make_thumbs.sh <dir_app>}"
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python3 -I "$here/make_atlas.py" "$app"
