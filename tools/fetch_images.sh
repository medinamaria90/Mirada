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

sha_de() {
  if command -v sha256sum >/dev/null; then sha256sum "$1" | awk '{print $1}'
  elif command -v shasum >/dev/null; then shasum -a 256 "$1" | awk '{print $1}'
  else python3 -c "import hashlib,sys;print(hashlib.sha256(open(sys.argv[1],'rb').read()).hexdigest())" "$1"
  fi
}
baja() { curl -fsSL --retry 3 --retry-delay 5 --retry-all-errors --connect-timeout 30 -o "$2" "$1"; }

# El paso «pack» del proceso sube el zip con «gh release upload --clobber», que borra el recurso antes de subir el nuevo:
# durante unos minutos la descarga da 404 o el zip no casa con su .sha256. Se reintenta el par entero con margen amplio.
INTENTOS="${MIRADA_FETCH_TRIES:-12}"
ESPERA="${MIRADA_FETCH_WAIT:-30}"
ok=0
for i in $(seq 1 "$INTENTOS"); do
  echo "fetch_images: descargando $BASE/$ZIP (intento $i/$INTENTOS)"
  if baja "$BASE/$ZIP" "$TMP/$ZIP" && baja "$BASE/$SHA" "$TMP/$SHA"; then
    esperado="$(awk '{print tolower($1)}' "$TMP/$SHA" | head -n 1)"
    real="$(sha_de "$TMP/$ZIP")"
    if [[ "$esperado" =~ ^[0-9a-f]{64}$ ]] && [ "$real" = "$esperado" ]; then ok=1; break; fi
    echo "fetch_images: aviso: el sha256 no coincide (esperado ${esperado:-?}, obtenido $real); quizá se está subiendo un paquete nuevo" >&2
  else
    echo "fetch_images: aviso: no se pudo descargar el paquete; quizá se está subiendo uno nuevo" >&2
  fi
  [ "$i" -lt "$INTENTOS" ] && sleep "$ESPERA"
done
[ "$ok" = 1 ] || fallo "no se pudo bajar un $ZIP íntegro de $BASE tras $INTENTOS intentos (¿existe en la release catalogo-img? lo sube el paso «pack» del proceso)"
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
  # Es opcional: si falla, se avisa y el despliegue sigue (las historias se comparten sin imagen propia).
  "$PY" -I "$here/share_pages.py" --images "$DEST" \
    || echo "fetch_images: aviso: no se pudieron pintar las imágenes para compartir (app/img/og); sigo sin ellas" >&2
fi
