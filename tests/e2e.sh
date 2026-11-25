#!/usr/bin/env bash
# Recorrido real en Chrome headless. Levanta un servidor estático de app/ en un puerto libre (8941+),
# ejecuta tools/e2e.mjs y cierra el servidor al terminar.
# Uso: bash tests/e2e.sh [carpeta_capturas] [prefijo]            recorrido completo (varios minutos)
#      MIRADA_E2E_MODE=smoke bash tests/e2e.sh [carpeta] [prefijo]  modo humo (~1 min; el de node --test)
# Requisitos: Playwright en /opt/npm-tools/node_modules/playwright y Chrome en /usr/bin/google-chrome,
# o sus rutas en MIRADA_PLAYWRIGHT y MIRADA_CHROME; intérprete de Python en MIRADA_PYTHON (python3).
# Imágenes: MIRADA_IMG_DIR (carpeta de tools/fetch_images.sh) y el atlas generado: python3 tools/make_atlas.py app <esa carpeta>.
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out="${1:-$root/docs/screens}"
prefix="${2:-o9-}"
port=8941
while (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; do port=$((port + 1)); done
# MIRADA_IMG_DIR: carpeta con las w<QID>.jpg (las baja tools/fetch_images.sh; no están en el repo).
"${MIRADA_PYTHON:-python3}" "$root/tools/serve_local.py" "$port" "$root/app" "${MIRADA_IMG_DIR:-}" >/dev/null 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null || true' EXIT
for _ in $(seq 50); do (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null && break; sleep 0.1; done
# El servidor local de pruebas rechaza de vez en cuando una conexión (ERR_CONNECTION_REFUSED) y el recorrido sale
# con error aunque la app esté bien: si el fallo es solo ese, se repite una vez. Cualquier otro fallo se da tal cual.
# Solo se imprime el informe del último intento (quien lo lee espera un único JSON).
log="$(mktemp)"
run() { node "$root/tools/e2e.mjs" "http://127.0.0.1:$port/" "$root/app/data/catalog.json" "$out" "$prefix" >"$log"; }
status=0
run || status=$?
if [ "$status" -ne 0 ] && grep -q 'ERR_CONNECTION_REFUSED' "$log"; then
  echo "reintento: el servidor local rechazó una conexión" >&2
  status=0
  run || status=$?
fi
cat "$log"
exit "$status"
