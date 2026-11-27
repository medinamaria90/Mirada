"""Imágenes HD de las obras que las historias enseñan en detalle (`region` o `focus` con zoom grande).

La imagen normal de la app (1200 px, pack.py) se queda corta para un trozo de la obra a sangre: un panel del tríptico de El
Bosco saldría a 0,7 píxeles de imagen por píxel CSS. Este paso calcula, con tools/nitidez.py, qué obras de
contenido/historias/ bajan de MIN_DENSITY y qué lado mayor necesitan para llegar a HD_DENSITY (hasta HD_MAX_SIDE), baja de
Commons la miniatura justa y las empaqueta en <out>/app-img-hd.zip (+ .sha256), que run.sh sube a la release catalogo-img.
Escribe catalogo/hd.json ({id: {archivo, w, h, bytes}}): lo lee tools/catalog_from_pipeline.py para que la app sepa qué obras
tienen HD (img/hd/<id>.jpg). Log en pipeline/logs/hd.txt.
Uso: hd.py --out <carpeta>   (código 0 = bien, 1 = algún fallo: no se sube nada)
"""
import glob, hashlib, io, json, os, sys, urllib.parse, zipfile
from PIL import Image, ImageOps
from lib import *

sys.path.insert(0, os.path.join(ROOT, "tools"))
import nitidez as N  # noqa: E402

MAX_PIXELS = 120_000_000           # tope de seguridad al abrir lo que llega de Commons
MAX_BYTES = 60_000_000
MAX_JPEG = 2_500_000               # peso máximo de cada HD: si se pasa, baja la calidad
QUALITIES = (82, 78, 74, 70)
STEPS = [1280, 1920, 2560, 3840]   # anchos de miniatura estándar de Commons
Image.MAX_IMAGE_PIXELS = MAX_PIXELS

log = Log("hd")


def needs():
    """{id: lado mayor necesario} de las obras con algún detalle que la imagen de 1200 px no da nítido."""
    sel = {e["id"]: e for e in load(os.path.join(CAT, "seleccion.json"), [])}
    out = {}
    for path in sorted(glob.glob(os.path.join(ROOT, "contenido", "historias", "*.json"))):
        with open(path, encoding="utf-8") as f:
            story = json.load(f)
        for lv in story.get("levels", []):
            for c in lv.get("cards", []):
                e = sel.get(c.get("artwork"))
                if not e or not N.is_detail(c):
                    continue
                W, H = e["srcW"], e["srcH"]
                if N.density(c, *N.served(W, H)) >= N.MIN_DENSITY:
                    continue
                side = min(N.side_needed(c, W, H), N.HD_MAX_SIDE, max(W, H))
                if side > N.APP_SIDE:
                    out[e["id"]] = max(out.get(e["id"], 0), side)
    return out, sel


def thumb_url(e, side):
    W, H = e["srcW"], e["srcH"]
    need = -(-side * W // max(W, H))
    width = next((s for s in STEPS if s >= need), STEPS[-1])
    if width >= W:  # el original, si es JPEG o PNG; si no (TIFF…), la miniatura estándar más grande que haya
        width = W if e.get("mime") in ("image/jpeg", "image/png") else max([s for s in STEPS if s < W] or [W])
    q = urllib.parse.urlencode({"action": "query", "format": "json", "formatversion": "2", "prop": "imageinfo",
                                "titles": "File:" + e["archivo"], "iiprop": "url|size", "iiurlwidth": width})
    ii = (get_json("https://commons.wikimedia.org/w/api.php?" + q)["query"]["pages"][0].get("imageinfo") or [None])[0]
    if not ii:
        raise RuntimeError("sin imageinfo")
    return ii.get("thumburl") or ii["url"]


def make(raw, side):
    """JPEG a lado mayor `side` (sin ampliar), sin metadatos, con la calidad más alta que quepa en MAX_JPEG."""
    if len(raw) > MAX_BYTES:
        raise ValueError("fichero demasiado grande")
    with Image.open(io.BytesIO(raw), formats=["JPEG", "PNG"]) as im:
        im.verify()
    with Image.open(io.BytesIO(raw), formats=["JPEG", "PNG"]) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        im.thumbnail((side, side), Image.LANCZOS)
    for q in QUALITIES:
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=q, progressive=True, optimize=True, subsampling="4:2:0")
        if buf.tell() <= MAX_JPEG:
            break
    return buf.getvalue(), im.size, q


def main():
    out = sys.argv[sys.argv.index("--out") + 1]
    os.makedirs(out, exist_ok=True)
    want, sel = needs()
    log(f"obras con detalle que piden HD: {len(want)}")
    meta, bad = {}, []
    zpath = os.path.join(out, "app-img-hd.zip")
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_STORED) as z:
        for wid, side in sorted(want.items()):
            e = sel[wid]
            try:
                data, (w, h), q = make(http(thumb_url(e, side), binary=True, timeout=300), side)
            except Exception as ex:
                bad.append(wid); log(f"FALLO {wid} {str(ex)[:160]}"); continue
            zi = zipfile.ZipInfo(wid + ".jpg", date_time=(2026, 1, 1, 0, 0, 0))
            zi.external_attr = 0o644 << 16
            z.writestr(zi, data)
            meta[wid] = dict(archivo=e["archivo"], w=w, h=h, bytes=len(data))
            log(f"ok   {wid:11} {e.get('pintorId', ''):14} pide {side} px -> {w}x{h} q{q} {len(data)//1024} KB")
    digest = hashlib.sha256(open(zpath, "rb").read()).hexdigest()
    with open(os.path.join(out, "app-img-hd.sha256"), "w") as f:
        f.write(f"{digest}  app-img-hd.zip\n")
    total = sum(m["bytes"] for m in meta.values())
    log(f"hd: {len(meta)} imágenes, {total/1e6:.1f} MB, fallos {len(bad)}, sha256 {digest[:16]}…")
    if bad:
        return 1
    save(os.path.join(CAT, "hd.json"), dict(sorted(meta.items())))
    return 0


if __name__ == "__main__":
    sys.exit(main())
