"""Fase A.1: resuelve/verifica el QID de cada pintor de pipeline/painters.json.

Para los que no tienen qid busca en Wikidata por nombre y elige el candidato cuyo
nacimiento y muerte casan (±2 años). Para todos comprueba años y etiquetas.
Salida: pipeline/out/painters_resolved.json y pipeline/logs/resolve.txt
"""
import json, os, urllib.parse
from lib import *

log = Log("resolve")


def year(claims, p):
    for c in claims.get(p, []):
        try:
            t = c["mainsnak"]["datavalue"]["value"]["time"]
            return int(t[:5]) if t[0] in "+-" else int(t[:4])
        except Exception:
            pass
    return None


def entities(ids):
    out = {}
    for i in range(0, len(ids), 50):
        q = urllib.parse.urlencode({"action": "wbgetentities", "ids": "|".join(ids[i:i + 50]),
                                    "props": "labels|claims|sitelinks", "languages": "es|en",
                                    "format": "json"})
        out.update(get_json("https://www.wikidata.org/w/api.php?" + q)["entities"])
    return out


def main():
    painters = load(os.path.join(PIPE, "painters.json"))
    res = []
    for p in painters:
        cands = [p["qid"]] if p.get("qid") else []
        if not cands:
            for lang in ("en", "es"):
                q = urllib.parse.urlencode({"action": "wbsearchentities", "search": p["en"] if lang == "en" else p["nombre"],
                                            "language": lang, "limit": 10, "type": "item", "format": "json"})
                cands += [x["id"] for x in get_json("https://www.wikidata.org/w/api.php?" + q).get("search", [])]
            cands = list(dict.fromkeys(cands))
        ents = entities(cands) if cands else {}
        best = None
        for qid in cands:
            e = ents.get(qid, {})
            cl = e.get("claims", {})
            b, d = year(cl, "P569"), year(cl, "P570")
            human = any(c["mainsnak"].get("datavalue", {}).get("value", {}).get("id") == "Q5" for c in cl.get("P31", []))
            ok = human and b and d and abs(b - p["nacimiento"]) <= 3 and abs(d - p["muerte"]) <= 2
            sl = len(e.get("sitelinks", {}))
            row = dict(qid=qid, es=e.get("labels", {}).get("es", {}).get("value"),
                       en=e.get("labels", {}).get("en", {}).get("value"), nacimiento=b, muerte=d, sitelinks=sl, ok=bool(ok))
            if (ok or p.get("qid")) and (best is None or sl > best["sitelinks"]):
                best = row
        if best is None:
            log(f"FALLO {p['id']:18} ({p['en']}) candidatos={cands[:5]}")
            res.append(dict(id=p["id"], qid=None))
            continue
        flag = "" if (best["muerte"] or 9999) < 1956 else "  ¡MUERTE >=1956 o desconocida!"
        if not best["ok"]:
            flag += "  (QID dado; años no casan, revisar)"
        log(f"ok    {p['id']:18} {best['qid']:10} {best['es'] or '-'} / {best['en']} ({best['nacimiento']}-{best['muerte']}) sl={best['sitelinks']}{flag}")
        res.append(dict(id=p["id"], **best))
    save(os.path.join(OUT, "painters_resolved.json"), res)
    log("total", len(res), "resueltos", sum(1 for r in res if r.get("qid")))


if __name__ == "__main__":
    main()
