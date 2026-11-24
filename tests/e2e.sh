#!/usr/bin/env bash
# Recorrido real en Chrome headless. Levanta un servidor estático de app/ en un puerto libre (8941+),
# ejecuta tools/e2e.mjs y cierra el servidor al terminar.
# Uso: bash tests/e2e.sh [carpeta_capturas] [prefijo]            recorrido completo (varios minutos)
#      MIRADA_E2E_MODE=smoke bash tests/e2e.sh [carpeta] [prefijo]  modo humo (~1 min; el de node --test)
# Requisitos: Playwright en /opt/npm-tools/node_modules/playwright y Chrome en /usr/bin/google-chrome,
# o sus rutas en MIRADA_PLAYWRIGHT y MIRADA_CHROME; intérprete de Python en MIRADA_PYTHON (python3).
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out="${1:-$root/docs/screens}"
prefix="${2:-o9-}"
port=8941
while (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; do port=$((port + 1)); done
"${MIRADA_PYTHON:-python3}" -m http.server "$port" --bind 127.0.0.1 --directory "$root/app" >/dev/null 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null || true' EXIT
for _ in $(seq 50); do (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null && break; sleep 0.1; done
node "$root/tools/e2e.mjs" "http://127.0.0.1:$port/" "$root/app/data/catalog.json" "$out" "$prefix"
