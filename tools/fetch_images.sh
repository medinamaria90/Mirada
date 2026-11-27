#!/usr/bin/env bash
# Baja las imágenes de la app (app-img-1200.zip) de la release pública «catalogo-img» y las deja en <carpeta_destino>.
# Pensado para el comando de construcción de Render:  bash tools/fetch_images.sh app/img
# Después pinta las hojas del atlas de miniaturas (<carpeta_destino>/s) con tools/make_atlas.py a partir de esas imágenes y
# de app/data/catalog.json (las coordenadas de las miniaturas salen del catálogo: hojas y catálogo van siempre a juego) y las
# imágenes ligeras de las historias compartidas (<carpeta_destino>/og, tools/share_pages.py).
# Necesita python3 con Pillow (si falta, lo instala con pip). MIRADA_SKIP_ATLAS=1 lo omite.
# Solo necesita bash, curl, sha256sum (o shasum) y unzip (o python3). No usa gh ni token.
# Variable opcional MIRADA_IMG_BASE: otra URL base (pruebas locales).
set -euo pipefail

BASE="${MIRADA_IMG_BASE:-https://github.com/medinamaria90/Mirada/releases/download/catalogo-img}"
ZIP="app-img-1200.zip"
SHA="app-img-1200.sha256"
MIN_IMG="${MIRADA_MIN_IMG:-1000}"   # por debajo de esto el zip se considera incompleto (el catálogo tiene 1.180 obras)

fallo() { echo "fetch_images: ERROR: $*" >&2; exit 1; }

[ $# -eq 1 ] && [ -n "$1" ] || fallo "uso: bash tools/fetch_images.sh <carpeta_destino>"
DEST="$1"
command -v curl >/dev/null || fallo "falta curl"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "fetch_images: descargando $BASE/$ZIP"
curl -fsSL --retry 5 --retry-delay 5 --retry-all-errors --connect-timeout 30 -o "$TMP/$ZIP" "$BASE/$ZIP" \
  || fallo "no se pudo descargar $BASE/$ZIP (¿existe el recurso en la release catalogo-img? lo sube el paso «pack» del proceso)"
curl -fsSL --retry 5 --retry-delay 5 --retry-all-errors --connect-timeout 30 -o "$TMP/$SHA" "$BASE/$SHA" \
  || fallo "no se pudo descargar $BASE/$SHA"

esperado="$(awk '{print tolower($1)}' "$TMP/$SHA" | head -n 1)"
[[ "$esperado" =~ ^[0-9a-f]{64}$ ]] || fallo "el fichero $SHA no contiene un sha256 válido"
if command -v sha256sum >/dev/null; then real="$(sha256sum "$TMP/$ZIP" | awk '{print $1}')"
elif command -v shasum >/dev/null; then real="$(shasum -a 256 "$TMP/$ZIP" | awk '{print $1}')"
else real="$(python3 -c "import hashlib,sys;print(hashlib.sha256(open(sys.argv[1],'rb').read()).hexdigest())" "$TMP/$ZIP")"
fi
[ "$real" = "$esperado" ] || fallo "sha256 no coincide: esperado $esperado, obtenido $real (descarga corrupta o zip a medio subir; reintenta)"
echo "fetch_images: sha256 correcto ($real)"

# Nombres seguros: solo <id>.jpg planos, sin rutas ni «..» (el zip lo genera pipeline/pack.py)
if command -v unzip >/dev/null; then lista="$(unzip -Z1 "$TMP/$ZIP")"
else lista="$(python3 -m zipfile -l "$TMP/$ZIP" | awk 'NR>1{print $1}')"
fi
echo "$lista" | grep -qvE '^w[0-9]+\.jpg$' && fallo "el zip contiene nombres inesperados (solo se admiten w<QID>.jpg)"

mkdir -p "$DEST"
if command -v unzip >/dev/null; then unzip -q -o "$TMP/$ZIP" -d "$DEST"
else python3 -m zipfile -e "$TMP/$ZIP" "$DEST"
fi

n="$(find "$DEST" -maxdepth 1 -name 'w*.jpg' | wc -l | tr -d ' ')"
[ "$n" -ge "$MIN_IMG" ] || fallo "solo hay $n imágenes en $DEST (se esperaban al menos $MIN_IMG)"
echo "fetch_images: $n imágenes en $DEST ($(du -sh "$DEST" | cut -f1))"

if [ "${MIRADA_SKIP_ATLAS:-0}" != "1" ]; then
  here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  app="$(cd "$DEST/.." && pwd)"
  [ -f "$app/data/catalog.json" ] || fallo "no encuentro $app/data/catalog.json para pintar el atlas (¿la carpeta destino no es app/img?)"
  PY="${MIRADA_PYTHON:-python3}"
  command -v "$PY" >/dev/null || fallo "falta $PY para pintar el atlas"
  "$PY" -c "import PIL" 2>/dev/null || "$PY" -m pip install --quiet pillow || fallo "no se pudo instalar Pillow para pintar el atlas"
  "$PY" -I "$here/make_atlas.py" "$app" "$DEST" || fallo "no se pudo pintar el atlas de miniaturas"
  # Imagen ligera de cada historia compartida para la vista previa de WhatsApp (<carpeta_destino>/og, páginas app/h/).
  "$PY" -I "$here/share_pages.py" --images "$DEST" || fallo "no se pudieron pintar las imágenes para compartir"
fi
