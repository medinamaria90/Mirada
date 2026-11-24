"""Construye catalogo/obras.json, catalogo/pintores.json y CREDITS.md (sin red).

obras.json sigue el esquema de la app (docs/SPEC.md §4, claves en inglés) más los campos de la ficha:
level, museum, city, country, inSpain, technique, dimensions, inception, depicts, genre, source. Entran
todas las obras de la selección; `downloaded` dice si su imagen ya está en catalogo/img/ (w/h solo entonces).
Los textos humanos `about` («qué representa») y `look` («fíjate en») quedan vacíos para una pasada posterior
con fuentes de museo. pintores.json: id, name, short, born, died, country, movementId, order (por año de
nacimiento dentro del movimiento), section (vacío hasta diseñar los tramos del mapa), qid, works.
"""
import os
from lib import *

MOVEMENTS = [  # mismos ids que tools/catalog_data.py (la app); la migración los fusiona
    ("renacimiento", "Renacimiento", 1), ("manierismo-y-norte", "Manierismo y Renacimiento del Norte", 2),
    ("barroco", "Barroco", 3), ("rococo-neoclasicismo", "Rococó y Neoclasicismo", 4), ("romanticismo", "Romanticismo", 5),
    ("realismo", "Realismo", 6), ("impresionismo", "Impresionismo", 7), ("postimpresionismo", "Postimpresionismo", 8),
    ("simbolismo-modernismo", "Simbolismo y vanguardias", 9),
]


def cap(s):
    return s[:1].upper() + s[1:] if s else s


def main():
    painters = load(os.path.join(PIPE, "painters.json"))
    resolved = {r["id"]: r for r in load(os.path.join(OUT, "painters_resolved.json"), [])}
    sel = load(os.path.join(CAT, "seleccion.json"), [])
    meta = load(os.path.join(CAT, "img_meta.json"), {})
    fichas = load(os.path.join(OUT, "fichas.json"), {})
    obras = []
    for s in sel:
        m = meta.get(s["id"])
        ok = bool(m and m.get("archivo") == s["archivo"] and os.path.exists(os.path.join(CAT, "img", s["id"] + ".jpg")))
        f = fichas.get(s["qid"], {})
        warnings = list(s.get("avisos") or [])
        if not f:
            warnings.append("sin-ficha")
        obras.append(dict(
            id=s["id"], artistId=s["pintorId"], title=s["titulo"], titleSource=s["tituloFuente"],
            year=s["anio"], yearSort=s["anioSort"], yearQuality=s["anioCalidad"],
            level=s.get("level", 2), fame=s.get("fama", 1), sitelinks=s["sitelinks"],
            img="img/%s.jpg" % s["id"], w=m["w"] if ok else None, h=m["h"] if ok else None, downloaded=ok,
            museum=cap(f.get("museum")) if f.get("museum") else (s.get("coleccion") or None),
            city=f.get("city"), country=f.get("country"), inSpain=bool(f.get("inSpain")),
            technique=f.get("technique") or "", dimensions=f.get("dimensions") or "",
            inception=f.get("inception") or "", depicts=f.get("depicts") or [], genre=f.get("genre"),
            about="", look="",
            source=dict(wikidata=s["qid"], commons=s["archivoUrl"], file=s["archivo"], license=s.get("licencia"),
                        credit=s.get("creditoArchivo"), ficha=f.get("source"), fetched=f.get("fetched")),
            confidence=s["confianza"], warnings=warnings))
    pintores = []
    by_mov = {}
    for p in painters:
        r = resolved.get(p["id"], {})
        n = sum(1 for o in obras if o["artistId"] == p["id"])
        if not n:
            continue
        row = dict(id=p["id"], name=p["nombre"], short=p["corto"], born=r.get("nacimiento") or p["nacimiento"],
                   died=r.get("muerte") or p["muerte"], country=p["pais"], movementId=p["movimiento"], order=None,
                   section=None, qid=p.get("qid") or r.get("qid"), works=n,
                   level1=sum(1 for o in obras if o["artistId"] == p["id"] and o["level"] == 1))
        pintores.append(row)
        by_mov.setdefault(p["movimiento"], []).append(row)
    for rows in by_mov.values():
        for i, row in enumerate(sorted(rows, key=lambda r: (r["born"], r["id"]))):
            row["order"] = i + 1
    movements = [dict(id=i, name=n, order=o, painters=len(by_mov.get(i, []))) for i, n, o in MOVEMENTS]
    save(os.path.join(CAT, "obras.json"), dict(version=1, generated=__import__("time").strftime("%Y-%m-%d"),
                                               movements=movements, artists=pintores, artworks=obras))
    save(os.path.join(CAT, "pintores.json"), pintores)
    names = {p["id"]: p["nombre"] for p in painters}
    lines = ["# Créditos de las imágenes", "",
             "Reproducciones fotográficas fieles de pinturas bidimensionales en dominio público (autores muertos antes de 1956,",
             "obras anteriores a 1930), obtenidas de Wikimedia Commons. Metadatos de Wikidata (CC0).",
             "Para cada imagen se indica el archivo de origen, su licencia en Commons y el autor/crédito del archivo.", ""]
    bysel = {s["id"]: s for s in sel}
    for o in sorted((o for o in obras if o["downloaded"]), key=lambda o: (names[o["artistId"]], o["yearSort"] or 0)):
        s = bysel[o["id"]]
        extra = "; ".join(filter(None, [s.get("autorArchivo") and "autor del archivo: " + s["autorArchivo"][:120],
                                        s.get("creditoArchivo") and "crédito: " + s["creditoArchivo"][:120]]))
        lines.append(f"- `{o['id']}` — {names[o['artistId']]}, *{o['title']}* ({o['year'] or 's. f.'}). "
                     f"[{s['archivo']}]({s['archivoUrl']}) — {s.get('licencia') or 'licencia no indicada'}"
                     f" — [Wikidata {o['source']['wikidata']}](https://www.wikidata.org/wiki/{o['source']['wikidata']})"
                     + (f" — {extra}" if extra else ""))
    with open(os.path.join(ROOT, "CREDITS.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    n_img = sum(1 for o in obras if o["downloaded"])
    n_f = sum(1 for o in obras if "sin-ficha" not in o["warnings"])
    print(f"build: {len(obras)} obras ({n_img} con imagen, {n_f} con ficha), {len(pintores)} pintores, "
          f"{sum(1 for p in pintores if p['country'] == 'España')} españoles; por movimiento: "
          + ", ".join(f"{m['id']} {m['painters']}" for m in movements))


if __name__ == "__main__":
    main()
