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
# GitHub admite como máximo 1000 recursos por release: las imágenes sueltas se reparten en catalogo-img,
# catalogo-img-2, catalogo-img-3… (con margen para el zip y el sha256 del paquete, que van en catalogo-img).
TAGS="catalogo-img catalogo-img-2 catalogo-img-3 catalogo-img-4"
TOPE=995
cuenta() { gh release view "$1" --json assets --jq '.assets|length' 2>/dev/null || echo -1; }
crear_release() {
  gh release create "$1" --title "Imágenes del catálogo (1600 px) — $1" --notes "Imágenes de las obras a 1600 px de lado mayor (JPEG 82), generadas por el proceso de pipeline/. Se reparten en varias releases porque GitHub admite 1000 recursos por release. El paquete para la app (app-img-1200.zip) está en catalogo-img." >/dev/null 2>&1 || true
}
release_con_hueco() {  # release_con_hueco <n>: primera release con sitio para n recursos más
  for t in $TAGS; do
    c=$(cuenta "$t"); [ "$c" -lt 0 ] && { crear_release "$t"; c=$(cuenta "$t"); }
    [ "$c" -ge 0 ] && [ $((c + $1)) -le $TOPE ] && { echo "$t"; return 0; }
  done
  return 1
}
push_img() {  # sube las imágenes de catalogo/img/ a la release con hueco (no entran en main: pesarían ~400 MB) y las borra
  ls catalogo/img/*.jpg >/dev/null 2>&1 || return 0
  n=$(ls catalogo/img/*.jpg | wc -l)
  tag=$(release_con_hueco "$n") || { echo "NO HAY RELEASE CON HUECO PARA $n IMÁGENES" >> pipeline/logs/run.txt; return 1; }
  for i in 1 2 3; do
    gh release upload "$tag" catalogo/img/*.jpg --clobber && { echo "subidas $n imágenes a la release $tag" >> pipeline/logs/run.txt; rm -f catalogo/img/*.jpg; return 0; }
    sleep $((i*20))
  done
  echo "NO SE PUDIERON SUBIR LAS IMÁGENES A LA RELEASE $tag" >> pipeline/logs/run.txt
  return 1
}
descargar_origen() {  # descargar_origen <carpeta>: baja a <carpeta> las imágenes sueltas de todas las releases
  for t in $TAGS; do
    [ "$(cuenta "$t")" -gt 0 ] && gh release download "$t" -D "$1" --pattern 'w*.jpg' --clobber
  done
}
liberar_hueco() {  # deja >= 5 huecos en catalogo-img para el zip y el sha256: pasa las últimas imágenes a la release con hueco
  c=$(cuenta catalogo-img); [ "$c" -le $((1000 - 5)) ] && return 0
  sobran=$((c - (1000 - 5))); tmp=$(mktemp -d)
  gh release view catalogo-img --json assets --jq '.assets[].name' | grep -E '^w[0-9]+\.jpg$' | sort | tail -n "$sobran" > "$tmp/lista"
  tag=""
  for t in $TAGS; do
    [ "$t" = catalogo-img ] && continue
    c2=$(cuenta "$t"); [ "$c2" -lt 0 ] && { crear_release "$t"; c2=$(cuenta "$t"); }
    [ "$c2" -ge 0 ] && [ $((c2 + sobran)) -le $TOPE ] && { tag=$t; break; }
  done
  [ -n "$tag" ] || return 1
  while read -r f; do
    gh release download catalogo-img -D "$tmp" --pattern "$f" --clobber && gh release upload "$tag" "$tmp/$f" --clobber       && gh release delete-asset catalogo-img "$f" -y || return 1
  done < "$tmp/lista"
  echo "movidas $sobran imágenes de catalogo-img a $tag para hacer sitio al paquete" >> pipeline/logs/run.txt
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
        if ! push_img; then  # si no se suben, que no consten como bajadas: se repetirán en la siguiente ejecución
          git checkout -- catalogo/img_meta.json 2>/dev/null
          echo "lote $n sin subir: abandono la descarga" >> pipeline/logs/run.txt; break
        fi
        python3 pipeline/build.py >> pipeline/logs/run.txt 2>&1
        commit "datos: lote de imágenes $n"
        [ $rc -ne 0 ] && { echo "download rc=$rc" >> pipeline/logs/run.txt; break; }
      done ;;
    img-release) push_img; git rm -r -q --cached catalogo/img 2>/dev/null || true ;;  # saca de main las imágenes ya subidas
    pack)  # pack [lado] [--parcial]: zip único app-img-<lado>.zip (+ .sha256) con <id>.jpg a <lado> px, subido a catalogo-img
      set -- $args; lado=${1:-1200}; parcial=${2:-}
      src=$(mktemp -d); out=$(mktemp -d)
      descargar_origen "$src" >> pipeline/logs/run.txt 2>&1
      python3 pipeline/pack.py "$lado" --src catalogo/img --src "$src" --out "$out" >> pipeline/logs/run.txt 2>&1; rc=$?
      if [ $rc -eq 0 ] || { [ $rc -eq 3 ] && [ "$parcial" = "--parcial" ]; }; then
        liberar_hueco && gh release upload catalogo-img "$out/app-img-$lado.zip" "$out/app-img-$lado.sha256" --clobber >> pipeline/logs/run.txt 2>&1           && echo "paquete app-img-$lado subido a catalogo-img ($(du -h "$out/app-img-$lado.zip" | cut -f1))" >> pipeline/logs/run.txt           || echo "NO SE PUDO SUBIR EL PAQUETE" >> pipeline/logs/run.txt
      else
        echo "pack rc=$rc: paquete NO subido (faltan imágenes o hay fallos; ver pipeline/logs/pack.txt)" >> pipeline/logs/run.txt
      fi
      rm -rf "$src" "$out" ;;
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
