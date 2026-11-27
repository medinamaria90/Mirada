"""Empaqueta las imágenes de la app: un único zip con <id>.jpg a lado mayor N px.

Uso: pack.py <lado> --src <carpeta> [--src <carpeta> ...] --out <carpeta> [--reuse <carpeta>]
     pack.py <lado> --needs [--reuse <carpeta>]   (lista los ids que necesitan su original de 1600 px)
- Reutilización: con --reuse (el paquete anterior descomprimido) una obra cuyo archivo de Commons no ha cambiado desde el
  último paquete (pipeline/out/pack_manifest.json) entra tal cual, sin bajar su original ni recomprimir. Así un pack
  tras añadir pocas obras hace unas pocas peticiones a GitHub en vez de ~1.500 (el GITHUB_TOKEN de Actions tiene un tope por hora).
- Origen: JPEG <id>.jpg a 1600 px (carpetas ya descargadas de la release «catalogo-img» y/o catalogo/img/).
  Si un id está en varias carpetas gana la primera.
- Solo entran los ids de catalogo/obras.json. Los que falten se anotan en el log y se informa (código 3).
- Cada imagen se abre como no confiable: solo JPEG, tope de píxeles y de bytes, verify() y reapertura,
  EXIF aplicado y descartado, sin metadatos; salida JPEG calidad 82 progresivo 4:2:0, lado mayor <= N sin ampliar.
- Escribe <out>/app-img-<N>.zip (sin compresión: el JPEG ya está comprimido) y <out>/app-img-<N>.sha256
  (formato de sha256sum). Log en pipeline/logs/pack.txt.
Código de salida: 0 = todo bien, 3 = faltan imágenes (zip generado igualmente), 1 = error.
"""
import hashlib, io, os, sys, zipfile
from PIL import Image, ImageOps
from lib import *

MAX_PIXELS = 60_000_000      # una imagen de 1600 px no pasa de 3 Mpx; esto es un tope de seguridad
MAX_BYTES = 40_000_000
Image.MAX_IMAGE_PIXELS = MAX_PIXELS

log = None  # se abre en main(): con --needs no se pisa el log del último paquete
MANIFEST = os.path.join(OUT, "pack_manifest.json")  # id -> archivo de Commons de la imagen empaquetada, por lado


def reusable(ids, side, reuse):
    """Ids cuyo JPEG del paquete anterior sigue valiendo: mismo archivo de Commons que al empaquetarlo."""
    if not reuse:
        return set()
    meta = load(os.path.join(CAT, "img_meta.json"), {})
    prev = load(MANIFEST, {}).get(str(side), {})
    return {i for i in ids if prev.get(i) and prev[i] == (meta.get(i) or {}).get("archivo")
            and os.path.isfile(os.path.join(reuse, i + ".jpg"))}


def pack_one(path, side):
    if os.path.getsize(path) > MAX_BYTES:
        raise ValueError("fichero demasiado grande")
    with open(path, "rb") as f:
        raw = f.read()
    with Image.open(io.BytesIO(raw), formats=["JPEG"]) as im:
        im.verify()
    with Image.open(io.BytesIO(raw), formats=["JPEG"]) as im:
        im.draft("RGB", (side * 2, side * 2))
        im = ImageOps.exif_transpose(im)
        im = im.convert("RGB")
        im.thumbnail((side, side), Image.LANCZOS)   # no amplía
        out = io.BytesIO()
        im.save(out, "JPEG", quality=82, progressive=True, optimize=True, subsampling="4:2:0")  # sin exif ni icc
        return out.getvalue(), im.size


def main():
    global log
    a = sys.argv[1:]
    side = int(a[0])
    reuse = a[a.index("--reuse") + 1] if "--reuse" in a else None
    obras = load(os.path.join(CAT, "obras.json"), {})["artworks"]
    ids = [o["id"] for o in obras]
    keep = reusable(ids, side, reuse)
    if "--needs" in a:
        print("\n".join(i for i in ids if i not in keep))
        return 0
    log = Log("pack")
    srcs = [a[i + 1] for i, x in enumerate(a) if x == "--src"]
    out = a[a.index("--out") + 1]
    os.makedirs(out, exist_ok=True)
    meta = load(os.path.join(CAT, "img_meta.json"), {})
    packed = {}
    zpath = os.path.join(out, f"app-img-{side}.zip")
    n, total, missing, bad = 0, 0, [], []
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_STORED) as z:
        for i in ids:
            if i in keep:
                with open(os.path.join(reuse, i + ".jpg"), "rb") as f:
                    data = f.read()
                zi = zipfile.ZipInfo(i + ".jpg", date_time=(2026, 1, 1, 0, 0, 0))
                zi.external_attr = 0o644 << 16
                z.writestr(zi, data)
                packed[i] = (meta.get(i) or {}).get("archivo")
                n += 1; total += len(data)
                continue
            p = next((os.path.join(s, i + ".jpg") for s in srcs if os.path.isfile(os.path.join(s, i + ".jpg"))), None)
            if not p:
                missing.append(i); continue
            try:
                data, (w, h) = pack_one(p, side)
            except Exception as ex:
                bad.append(i); log(f"FALLO {i} {str(ex)[:120]}"); continue
            zi = zipfile.ZipInfo(i + ".jpg", date_time=(2026, 1, 1, 0, 0, 0))  # fecha fija: zip reproducible
            zi.compress_type = zipfile.ZIP_STORED
            zi.external_attr = 0o644 << 16
            z.writestr(zi, data)
            packed[i] = (meta.get(i) or {}).get("archivo")
            n += 1; total += len(data)
    h = hashlib.sha256()
    with open(zpath, "rb") as f:
        for ch in iter(lambda: f.read(1 << 20), b""):
            h.update(ch)
    with open(os.path.join(out, f"app-img-{side}.sha256"), "w") as f:
        f.write(f"{h.hexdigest()}  app-img-{side}.zip\n")
    log(f"pack {side}px: {n} imágenes, {total/1e6:.1f} MB de JPEG (media {total//max(n,1)//1024} KB), "
        f"zip {os.path.getsize(zpath)/1e6:.1f} MB, sha256 {h.hexdigest()[:16]}…")
    log(f"obras del catálogo {len(ids)}; reutilizadas del paquete anterior {len(keep)}; sin imagen {len(missing)}; con fallo {len(bad)}")
    if missing:
        log("faltan: " + " ".join(missing[:60]) + (" …" if len(missing) > 60 else ""))
    rc = 1 if (bad or n == 0) else (3 if missing else 0)
    if rc == 0:  # el manifiesto describe el paquete que se va a subir
        man = load(MANIFEST, {})
        man[str(side)] = packed
        save(MANIFEST, man)
    return rc


if __name__ == "__main__":
    sys.exit(main())
