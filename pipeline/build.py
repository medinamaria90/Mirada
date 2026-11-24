"""Construye catalogo/obras.json, catalogo/pintores.json y CREDITS.md (sin red).
Solo entran las obras de la selección cuya imagen ya está descargada."""
import os
from lib import *


def main():
    painters = load(os.path.join(PIPE, "painters.json"))
    resolved = {r["id"]: r for r in load(os.path.join(OUT, "painters_resolved.json"), [])}
    sel = load(os.path.join(CAT, "seleccion.json"), [])
    meta = load(os.path.join(CAT, "img_meta.json"), {})
    obras = []
    for s in sel:
        m = meta.get(s["id"])
        if not m or m.get("archivo") != s["archivo"] or not os.path.exists(os.path.join(CAT, "img", s["id"] + ".jpg")):
            continue
        obras.append(dict(
            id=s["id"], pintorId=s["pintorId"], titulo=s["titulo"], tituloFuente=s["tituloFuente"],
            anio=s["anio"], anioSort=s["anioSort"], coleccion=s["coleccion"],
            img="img/%s.jpg" % s["id"], w=m["w"], h=m["h"], fama=s.get("fama", 1), sitelinks=s["sitelinks"],
            fuente="wikidata", qid=s["qid"], archivo=s["archivo"], archivoUrl=s["archivoUrl"],
            licencia=s["licencia"], confianza=s["confianza"], avisos=s["avisos"]))
    used = {o["pintorId"] for o in obras}
    pintores = []
    for p in painters:
        r = resolved.get(p["id"], {})
        if p["id"] not in used:
            continue
        pintores.append(dict(id=p["id"], nombre=p["nombre"], corto=p["corto"], qid=p.get("qid") or r.get("qid"),
                             nacimiento=r.get("nacimiento") or p["nacimiento"], muerte=r.get("muerte") or p["muerte"],
                             pais=p["pais"], movimiento=p["movimiento"],
                             obras=sum(1 for o in obras if o["pintorId"] == p["id"])))
    save(os.path.join(CAT, "obras.json"), obras)
    save(os.path.join(CAT, "pintores.json"), pintores)
    names = {p["id"]: p["nombre"] for p in painters}
    lines = ["# Créditos de las imágenes", "",
             "Reproducciones fotográficas fieles de pinturas bidimensionales en dominio público (autores muertos antes de 1946,",
             "obras anteriores a 1930), obtenidas de Wikimedia Commons. Metadatos de Wikidata (CC0).",
             "Para cada imagen se indica el archivo de origen, su licencia en Commons y el autor/crédito del archivo.", ""]
    for o in sorted(obras, key=lambda o: (names[o["pintorId"]], o["anioSort"] or 0)):
        s = next(x for x in sel if x["id"] == o["id"])
        extra = "; ".join(filter(None, [s.get("autorArchivo") and "autor del archivo: " + s["autorArchivo"][:120],
                                        s.get("creditoArchivo") and "crédito: " + s["creditoArchivo"][:120]]))
        lines.append(f"- `{o['id']}` — {names[o['pintorId']]}, *{o['titulo']}* ({o['anio'] or 's. f.'}). "
                     f"[{o['archivo']}]({o['archivoUrl']}) — {o['licencia'] or 'licencia no indicada'}"
                     f" — [Wikidata {o['qid']}](https://www.wikidata.org/wiki/{o['qid']})" + (f" — {extra}" if extra else ""))
    with open(os.path.join(ROOT, "CREDITS.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"build: {len(obras)} obras con imagen, {len(pintores)} pintores")


if __name__ == "__main__":
    main()
