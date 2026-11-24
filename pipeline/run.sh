#!/usr/bin/env bash
# Ejecuta en GitHub Actions los pasos listados en pipeline/RUN (uno por línea: "<paso> [args]").
# Siempre deja log en pipeline/logs/ y hace commit de las salidas tras cada paso.
set -u
cd "$(dirname "$0")/.."
TRAILER=$'\n\nCo-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_019fDNM6fRf9wS5SBrUcjg2r'
commit() {
  for x in pipeline/out pipeline/logs catalogo CREDITS.md; do [ -e "$x" ] && git add -A "$x"; done
  git commit -qm "$1$TRAILER" || return 0
  for i in 1 2 3 4 5 6; do
    git pull --rebase -q -X theirs && git push -q && return 0
    sleep $((i*5))
  done
  echo "NO SE PUDO HACER PUSH" >> pipeline/logs/run.txt
}
echo "inicio $(date -u)" > pipeline/logs/run.txt
while read -r step args <&3; do
  case "$step" in ''|'#'*) continue;; esac
  echo "== $step $args $(date -u +%H:%M:%S)" | tee -a pipeline/logs/run.txt
  case "$step" in
    resolve)    python3 pipeline/resolve.py > pipeline/logs/resolve.stdout.txt 2>&1; tail -n 5 pipeline/logs/resolve.stdout.txt >> pipeline/logs/run.txt ;;
    candidates)
      ids=${args:-$(python3 -c "import json;print(' '.join(p['id'] for p in json.load(open('pipeline/painters.json'))))")}
      set -- $ids; : > pipeline/logs/candidates.stdout.txt
      while [ $# -gt 0 ]; do
        chunk="${@:1:15}"; shift $(( $# < 15 ? $# : 15 ))
        python3 pipeline/candidates.py $chunk >> pipeline/logs/candidates.stdout.txt 2>&1
        cp pipeline/logs/candidates.stdout.txt pipeline/logs/candidates.txt
        commit "datos: candidatas ($chunk)"
      done
      tail -n 3 pipeline/logs/candidates.stdout.txt >> pipeline/logs/run.txt ;;
    download)  # download [lotes] [tamaño]: n lotes de <tamaño> imágenes (150 por defecto), con commit tras cada lote
      set -- $args; lotes=${1:-8}; tam=${2:-150}
      for n in $(seq 1 "$lotes"); do
        python3 pipeline/download.py --limit "$tam" > pipeline/logs/download.stdout.txt 2>&1; rc=$?
        tail -n 4 pipeline/logs/download.stdout.txt >> pipeline/logs/run.txt
        python3 pipeline/build.py >> pipeline/logs/run.txt 2>&1
        commit "datos: lote de imágenes $n"
        [ $rc -ne 0 ] && { echo "download rc=$rc" >> pipeline/logs/run.txt; break; }
      done ;;
    fichas)   python3 pipeline/fichas.py $args > pipeline/logs/fichas.stdout.txt 2>&1; tail -n 3 pipeline/logs/fichas.stdout.txt >> pipeline/logs/run.txt ;;
    build)    python3 pipeline/build.py >> pipeline/logs/run.txt 2>&1 ;;
    validate) python3 pipeline/validate.py $args >> pipeline/logs/run.txt 2>&1 ;;  # validate --parcial mientras falten imágenes
    *) echo "paso desconocido: $step" >> pipeline/logs/run.txt ;;
  esac
  du -sh .git catalogo 2>/dev/null >> pipeline/logs/run.txt
  commit "datos: $step"
done 3< pipeline/RUN
echo "fin $(date -u)" >> pipeline/logs/run.txt
commit "datos: fin de ejecución"
