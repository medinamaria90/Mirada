"""Validaciones del catálogo. Sale con código 1 si hay errores.
Uso: validate.py [--parcial]   (--parcial: no exige que toda la selección esté descargada)"""
import os, re, struct, sys
from lib import *

EN = re.compile(r"\b(the|of|with|and|portrait|lady|young|woman|girl|boy|saint|still life|landscape|view|holy)\b", re.I)


def jpeg_size(path):
    with open(path, "rb") as f:
        d = f.read()
    i = 2
    while i < len(d):
        if d[i] != 0xFF:
            i += 1; continue
        m = d[i + 1]
        if m in (0xC0, 0xC1, 0xC2):
            h, w = struct.unpack(">HH", d[i + 5:i + 9]); return w, h
        i += 2 + struct.unpack(">H", d[i + 2:i + 4])[0]
    return None


def main():
    parcial = "--parcial" in sys.argv
    obras = load(os.path.join(CAT, "obras.json"), [])
    pintores = {p["id"]: p for p in load(os.path.join(CAT, "pintores.json"), [])}
    sel = load(os.path.join(CAT, "seleccion.json"), [])
    err, warn = [], []
    ids = [o["id"] for o in obras]
    if len(ids) != len(set(ids)):
        err.append("ids repetidos: %s" % sorted({i for i in ids if ids.count(i) > 1}))
    qids = [o["qid"] for o in obras]
    if len(qids) != len(set(qids)):
        err.append("QID repetidos")
    files = [o["archivo"] for o in obras]
    if len(files) != len(set(files)):
        err.append("archivo de Commons repetido")
    if not parcial and len(obras) < len(sel):
        err.append(f"faltan {len(sel) - len(obras)} imágenes de la selección")
    for p in pintores.values():
        if p["muerte"] >= 1956:
            err.append(f"pintor muerto en 1956 o después: {p['id']} ({p['muerte']})")
    for o in obras:
        p = pintores.get(o["pintorId"])
        tag = f"{o['id']} ({o['pintorId']})"
        if not p:
            err.append(f"{tag}: pintor inexistente"); continue
        path = os.path.join(CAT, o["img"])
        if not os.path.exists(path):
            err.append(f"{tag}: imagen ausente"); continue
        wh = jpeg_size(path)
        if not wh:
            err.append(f"{tag}: no es un JPEG válido")
        elif max(wh) < 1000:
            err.append(f"{tag}: imagen pequeña {wh}")
        elif list(wh) != [o["w"], o["h"]]:
            err.append(f"{tag}: w/h no casan con el archivo")
        y = o["anioSort"]
        if not y or y >= 1930 or y < p["nacimiento"] or y > p["muerte"] + 1:
            err.append(f"{tag}: año fuera de rango ({o['anio']} / {y})")
        if not o["titulo"].strip():
            err.append(f"{tag}: título vacío")
        if o["tituloFuente"] in ("traducir", "revisar-idioma"):
            if o["confianza"] != "medium":
                err.append(f"{tag}: título por traducir sin marcar")
            else:
                warn.append(f"{tag}: título pendiente de traducir: {o['titulo']}")
        elif EN.search(o["titulo"]) and o["tituloFuente"] == "wikidata-es":
            warn.append(f"{tag}: título quizá en inglés: {o['titulo']}")
        if not o.get("licencia"):
            warn.append(f"{tag}: licencia no indicada en Commons")
    size = sum(os.path.getsize(os.path.join(CAT, o["img"])) for o in obras if os.path.exists(os.path.join(CAT, o["img"])))
    print(f"validate: {len(obras)} obras, {len(pintores)} pintores, imágenes {size/1e6:.1f} MB; {len(err)} errores, {len(warn)} avisos")
    for e in err:
        print("ERROR", e)
    for w in warn[:80]:
        print("aviso", w)
    sys.exit(1 if err else 0)


if __name__ == "__main__":
    main()
