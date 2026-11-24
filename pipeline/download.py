"""Fase B/C: descarga reanudable de las imágenes de catalogo/seleccion.json.

- Pide a la API de Commons la URL de una miniatura (iiurlwidth) con tamaño estándar >= lo necesario.
- Reduce a 1600 px de lado mayor (sin ampliar), JPEG calidad 82, sin metadatos (ImageMagick).
- Guarda catalogo/img/<id>.jpg y catalogo/img_meta.json (id -> archivo, w, h, bytes).
- No vuelve a bajar lo que ya está (mismo archivo de origen). Borra imágenes que ya no están en la selección.
Uso: download.py --limit 150   (código de salida 0 = quedan pendientes, 3 = no queda nada, 1 = error)
"""
import os, subprocess, sys, tempfile, time, urllib.parse
from lib import *

log = Log("download")
IMG = os.path.join(CAT, "img")
os.makedirs(IMG, exist_ok=True)
MAXSIDE = int(os.environ.get("MAXSIDE", "1600"))
STEPS = [330, 500, 960, 1280, 1920, 3840]


def thumb_urls(entries):
    """Devuelve {archivo: url} usando la API con un ancho estándar por archivo."""
    out = {}
    for e in entries:
        W, H = e["srcW"], e["srcH"]
        need = -(-MAXSIDE * W // max(W, H))
        step = next((s for s in STEPS if s >= need), STEPS[-1])
        if step >= W:
            step = max([s for s in STEPS if s < W] or [W])
            if W <= 3840 and e["mime"] in ("image/jpeg", "image/png"):
                step = W
        q = urllib.parse.urlencode({"action": "query", "format": "json", "formatversion": "2", "prop": "imageinfo",
                                    "titles": "File:" + e["archivo"], "iiprop": "url|size", "iiurlwidth": step})
        d = get_json("https://commons.wikimedia.org/w/api.php?" + q)
        pg = d["query"]["pages"][0]
        ii = (pg.get("imageinfo") or [None])[0]
        if ii:
            out[e["archivo"]] = ii.get("thumburl") or ii.get("url")
    return out


def main():
    limit = 150
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])
    sel = load(os.path.join(CAT, "seleccion.json"), [])
    meta = load(os.path.join(CAT, "img_meta.json"), {})
    fails = load(os.path.join(OUT, "download_fails.json"), {})
    ids = {e["id"] for e in sel}
    for f in os.listdir(IMG):
        if f.endswith(".jpg") and f[:-4] not in ids:
            os.remove(os.path.join(IMG, f)); meta.pop(f[:-4], None)
            log("borrada (ya no está en la selección)", f)
    todo = [e for e in sel if not (os.path.exists(os.path.join(IMG, e["id"] + ".jpg"))
                                   and meta.get(e["id"], {}).get("archivo") == e["archivo"])
            and fails.get(e["id"], {}).get("archivo") != e["archivo"]]
    log(f"selección {len(sel)}, ya bajadas {len(sel) - len(todo)}, pendientes {len(todo)}; este lote {min(limit, len(todo))}")
    batch = todo[:limit]
    ok = 0
    for e in batch:
        try:
            url = thumb_urls([e]).get(e["archivo"])
            if not url:
                raise RuntimeError("sin url")
            data = http(url, binary=True, timeout=180)
            with tempfile.NamedTemporaryFile(suffix=".src", delete=False) as t:
                t.write(data); src = t.name
            dst = os.path.join(IMG, e["id"] + ".jpg")
            subprocess.run(["convert", src + "[0]", "-auto-orient", "-colorspace", "sRGB", "-resize", f"{MAXSIDE}x{MAXSIDE}>",
                            "-strip", "-interlace", "JPEG", "-sampling-factor", "4:2:0", "-quality", "82", dst],
                           check=True, capture_output=True, timeout=300)
            os.remove(src)
            wh = subprocess.run(["identify", "-format", "%w %h", dst], capture_output=True, text=True, check=True).stdout.split()
            meta[e["id"]] = dict(archivo=e["archivo"], w=int(wh[0]), h=int(wh[1]), bytes=os.path.getsize(dst), url=url)
            ok += 1
            log(f"ok   {e['id']:11} {e['pintorId']:16} {wh[0]}x{wh[1]} {os.path.getsize(dst)//1024}KB  {e['titulo'][:60]}")
        except Exception as ex:
            msg = str(ex)[:200]
            log(f"FALLO {e['id']:11} {e['pintorId']:16} {msg}")
            if "404" in msg or "sin url" in msg:
                fails[e["id"]] = dict(archivo=e["archivo"], error=msg)
        if ok and ok % 25 == 0:
            save(os.path.join(CAT, "img_meta.json"), meta)
    save(os.path.join(CAT, "img_meta.json"), meta)
    save(os.path.join(OUT, "download_fails.json"), fails)
    left = len(todo) - len(batch)
    log(f"lote: {ok}/{len(batch)} bien; quedan {left}")
    sys.exit(0 if left > 0 else 3)


if __name__ == "__main__":
    main()
