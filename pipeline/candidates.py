"""Fase A.2: obras candidatas por pintor (Wikidata SPARQL) + datos del archivo en Commons.

Salida: pipeline/out/candidates/<pintor>.json (una lista por pintor, reanudable: si el
archivo existe, tiene la misma QID y ya incluye las obras forzadas de pipeline/extra.json
con sus datos de archivo, no se vuelve a consultar, salvo FORCE=1) y pipeline/logs/candidates.txt.
Las obras forzadas (extra.json) se consultan aparte por QID, sin exigir autor único ni tipo,
para que entren obras icónicas que Wikidata modela como series, frescos o con dos autores.
No descarga imágenes.
"""
import json, os, re, sys, time, urllib.parse
from lib import *

log = Log("candidates")
CDIR = os.path.join(OUT, "candidates")
os.makedirs(CDIR, exist_ok=True)

TYPES = {
    "Q3305213": "painting", "Q79218": "triptych", "Q475476": "diptych", "Q1278452": "polyptych",
    "Q134194": "fresco", "Q219423": "mural", "Q18761202": "watercolor",
}
BAD_QUAL = ["P5102", "P1480", "P1774", "P1775", "P1776", "P1777", "P1877", "P1780", "P2354", "P1773"]

Q = """
SELECT ?item ?type ?image ?sl ?les ?len ?des ?den ?inc ?prec ?circa ?coll ?collLabel ?h ?w ?hu ?wu ?creator ?after WHERE {
  ?item p:P170 ?st . ?st ps:P170 wd:%(qid)s . ?st wikibase:rank ?rk . FILTER(?rk != wikibase:DeprecatedRank)
  %(badq)s
  ?item wdt:P31 ?type . VALUES ?type { %(types)s }
  ?item wdt:P18 ?image .
  ?item wikibase:sitelinks ?sl .
  OPTIONAL { ?item rdfs:label ?les FILTER(lang(?les)="es") }
  OPTIONAL { ?item rdfs:label ?len FILTER(lang(?len)="en") }
  OPTIONAL { ?item schema:description ?des FILTER(lang(?des)="es") }
  OPTIONAL { ?item schema:description ?den FILTER(lang(?den)="en") }
  OPTIONAL { ?item p:P571 ?is . ?is psv:P571 ?iv . ?iv wikibase:timeValue ?inc ; wikibase:timePrecision ?prec .
             OPTIONAL { ?is pq:P1480 ?circa } }
  OPTIONAL { ?item p:P195 ?cs . ?cs ps:P195 ?coll . FILTER NOT EXISTS { ?cs pq:P582 [] } }
  OPTIONAL { ?item p:P2048/psv:P2048 ?hv . ?hv wikibase:quantityAmount ?h ; wikibase:quantityUnit ?hu }
  OPTIONAL { ?item p:P2049/psv:P2049 ?wv . ?wv wikibase:quantityAmount ?w ; wikibase:quantityUnit ?wu }
  OPTIONAL { ?item wdt:P170 ?creator }
  OPTIONAL { ?item wdt:P1877 ?after }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en,fr,it,de,nl". ?coll rdfs:label ?collLabel . }
}
"""


Q_FORCED = """
SELECT ?item ?type ?image ?sl ?les ?len ?des ?den ?inc ?prec ?circa ?coll ?collLabel ?h ?w ?hu ?wu ?creator ?after WHERE {
  VALUES ?item { %(values)s }
  ?item wdt:P18 ?image .
  ?item wikibase:sitelinks ?sl .
  OPTIONAL { ?item wdt:P31 ?type }
  OPTIONAL { ?item rdfs:label ?les FILTER(lang(?les)="es") }
  OPTIONAL { ?item rdfs:label ?len FILTER(lang(?len)="en") }
  OPTIONAL { ?item schema:description ?des FILTER(lang(?des)="es") }
  OPTIONAL { ?item schema:description ?den FILTER(lang(?den)="en") }
  OPTIONAL { ?item p:P571 ?is . ?is psv:P571 ?iv . ?iv wikibase:timeValue ?inc ; wikibase:timePrecision ?prec .
             OPTIONAL { ?is pq:P1480 ?circa } }
  OPTIONAL { ?item p:P195 ?cs . ?cs ps:P195 ?coll . FILTER NOT EXISTS { ?cs pq:P582 [] } }
  OPTIONAL { ?item p:P2048/psv:P2048 ?hv . ?hv wikibase:quantityAmount ?h ; wikibase:quantityUnit ?hu }
  OPTIONAL { ?item p:P2049/psv:P2049 ?wv . ?wv wikibase:quantityAmount ?w ; wikibase:quantityUnit ?wu }
  OPTIONAL { ?item wdt:P170 ?creator }
  OPTIONAL { ?item wdt:P1877 ?after }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en,fr,it,de,nl". ?coll rdfs:label ?collLabel . }
}
"""


def forced_qids(extra, pid):
    x = extra.get(pid) or {}
    return sorted(x.keys() if isinstance(x, dict) else x)


def v(b, k):
    x = b.get(k)
    return x["value"] if x else None


def qid(uri):
    return uri.rsplit("/", 1)[-1] if uri else None


def fname(uri):
    return urllib.parse.unquote(uri.rsplit("/", 1)[-1]).replace("_", " ")


def query(pqid, forced=()):
    badq = "\n  ".join("FILTER NOT EXISTS { ?st pq:%s [] }" % p for p in BAD_QUAL)
    rows = sparql(Q % dict(qid=pqid, badq=badq, types=" ".join("wd:" + t for t in TYPES)))
    if forced:
        rows += sparql(Q_FORCED % dict(values=" ".join("wd:" + q for q in forced)))
    items = {}
    for b in rows:
        q = qid(v(b, "item"))
        it = items.setdefault(q, dict(qid=q, types=set(), images=[], sl=int(v(b, "sl")), es=v(b, "les"), en=v(b, "len"),
                                      des=v(b, "des"), den=v(b, "den"), dates=set(), colls={}, h=None, w=None, hu=None, wu=None,
                                      dims=[], creators=set(), after=False))
        it["types"].add(TYPES.get(qid(v(b, "type")), "?"))
        img = fname(v(b, "image"))
        if img not in it["images"]:
            it["images"].append(img)
        if v(b, "inc"):
            it["dates"].add((v(b, "inc"), int(v(b, "prec") or 0), bool(v(b, "circa"))))
        if v(b, "coll") and not v(b, "coll").startswith("http://www.wikidata.org/.well-known/"):
            it["colls"][qid(v(b, "coll"))] = v(b, "collLabel")
        for k in ("h", "w"):
            if v(b, k) and it[k] is None:
                it[k] = float(v(b, k)); it[k + "u"] = qid(v(b, k + "u"))
        if v(b, "h") and v(b, "w") and qid(v(b, "hu")) == qid(v(b, "wu")):
            pair = [float(v(b, "h")), float(v(b, "w"))]
            if pair not in it["dims"]:
                it["dims"].append(pair)  # todas las combinaciones alto/ancho declaradas (una obra puede tener varias)
        if v(b, "creator"):
            it["creators"].add(qid(v(b, "creator")))
        if v(b, "after"):
            it["after"] = True
    out = []
    for it in items.values():
        it["types"] = sorted(it["types"]); it["creators"] = sorted(it["creators"])
        it["dates"] = sorted(it["dates"])
        out.append(it)
    out.sort(key=lambda x: -x["sl"])
    return out


def imageinfo(files):
    info = {}
    for i in range(0, len(files), 50):
        chunk = files[i:i + 50]
        q = urllib.parse.urlencode({
            "action": "query", "format": "json", "formatversion": "2", "prop": "imageinfo",
            "titles": "|".join("File:" + f for f in chunk), "iiprop": "size|mime|extmetadata",
            "iiextmetadatafilter": "LicenseShortName|License|Artist|Credit|UsageTerms|AttributionRequired|Categories|ObjectName",
        })
        d = get_json("https://commons.wikimedia.org/w/api.php?" + q)
        norm = {n["to"]: n["from"] for n in d["query"].get("normalized", [])}
        for pg in d["query"]["pages"]:
            t = pg["title"]
            t = norm.get(t, t)
            name = t.split(":", 1)[1]
            ii = (pg.get("imageinfo") or [None])[0]
            if not ii:
                info[name] = None
                continue
            em = {k: (val.get("value") if isinstance(val, dict) else val) for k, val in ii.get("extmetadata", {}).items()}
            info[name] = dict(width=ii.get("width"), height=ii.get("height"), mime=ii.get("mime"), bytes=ii.get("size"),
                              license=em.get("LicenseShortName"), licenseCode=em.get("License"),
                              artist=re.sub(r"<[^>]+>", "", em.get("Artist") or "").strip()[:300],
                              credit=re.sub(r"<[^>]+>", "", em.get("Credit") or "").strip()[:300],
                              categories=(em.get("Categories") or "")[:1500])
    return info


def main():
    painters = load(os.path.join(PIPE, "painters.json"))
    resolved = {r["id"]: r.get("qid") for r in load(os.path.join(OUT, "painters_resolved.json"), [])}
    for p in painters:
        if not p.get("qid"):
            p["qid"] = resolved.get(p["id"])
    only = set(sys.argv[1:])
    force = os.environ.get("FORCE") == "1"
    extra = load(os.path.join(PIPE, "extra.json"), {})
    for p in painters:
        if only and p["id"] not in only:
            continue
        if not p.get("qid"):
            log(f"SIN QID {p['id']}")
            continue
        path = os.path.join(CDIR, p["id"] + ".json")
        old = load(path)
        forced = forced_qids(extra, p["id"])
        if old and old.get("qid") == p["qid"] and not force:
            have = {it["qid"] for it in old["items"] if it.get("files")}
            missing = [q for q in forced if q not in have]
            if not missing:
                log(f"ya     {p['id']:18} {len(old['items'])} candidatas")
                continue
            log(f"repito {p['id']:18} faltan datos de forzadas: {' '.join(missing)}")
        try:
            items = query(p["qid"], forced)
        except Exception as e:
            log(f"ERROR  {p['id']:18} SPARQL {e}")
            time.sleep(10)
            continue
        top = items[:80] + [it for it in items[80:] if it["qid"] in forced]  # datos de archivo: 80 más famosas + forzadas
        files = list(dict.fromkeys(f for it in top for f in it["images"][:2]))
        try:
            info = imageinfo(files)
        except Exception as e:
            log(f"ERROR  {p['id']:18} imageinfo {e}")
            info = {}
        for it in items:
            it["files"] = {f: info.get(f) for f in it["images"][:2] if f in info}
        save(path, dict(qid=p["qid"], fetched=time.strftime("%Y-%m-%d"), items=items), compact=True)
        big = sum(1 for it in top for f, x in it["files"].items() if x and max(x["width"], x["height"]) >= 1200)
        log(f"ok     {p['id']:18} {p['qid']:10} {len(items):4} candidatas; de las 80 primeras, {big} con imagen >=1200px")
        time.sleep(1)
    log("fin", time.strftime("%Y-%m-%d %H:%M:%S"))


if __name__ == "__main__":
    main()
