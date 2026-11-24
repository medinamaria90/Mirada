"""Fichas de obra desde Wikidata (museo y ciudad, técnica, medidas, fecha, qué aparece, género).

Para cada obra de catalogo/seleccion.json consulta Wikidata por lotes (SPARQL con VALUES) y guarda
pipeline/out/fichas.json: {QID: {museum, museumQid, city, country, inSpain, technique, materials,
dimensions, inception, depicts, genre, movement, source, fetched}}. Reanudable: solo pide las que faltan
(FORCE=1 para rehacer todas). Los museos se resuelven aparte (pipeline/out/museos.json: tipo, ciudad por la
cadena P131 hasta llegar a un municipio, país por P17) y los niveles administrativos en
pipeline/out/lugares.json. Uso: fichas.py [--limit N]
"""
import math, os, re, sys, time
from lib import *

log = Log("fichas")
FICHAS = os.path.join(OUT, "fichas.json")
MUSEOS = os.path.join(OUT, "museos.json")
LUGARES = os.path.join(OUT, "lugares.json")
CM = "Q174728"
UNITS = {"Q174728": 1.0, "Q174789": 0.1, "Q11573": 100.0, "Q218593": 2.54}  # cm, mm, m, pulgada -> cm
CITY_ALIASES = {"Q23306": "Londres", "Q84": "Londres", "Q90": "París", "Q60": "Nueva York", "Q2807": "Madrid",
                "Q23436": "Edimburgo", "Q2379199": "Edimburgo", "Q2044": "Florencia", "Q220": "Roma", "Q641": "Venecia", "Q64": "Berlín",
                "Q1726": "Múnich", "Q1748": "Copenhague", "Q1754": "Estocolmo", "Q656": "San Petersburgo", "Q649": "Moscú",
                "Q1741": "Viena", "Q727": "Ámsterdam", "Q239": "Bruselas", "Q12892": "Amberes", "Q1492": "Barcelona",
                "Q8717": "Valencia", "Q8818": "Sevilla", "Q8692": "Bilbao", "Q1297": "Chicago", "Q100": "Boston",
                "Q61": "Washington", "Q1345": "Filadelfia", "Q65": "Los Ángeles", "Q490": "Milán", "Q2634": "Nápoles"}
PAINT_WORDS = {"técnica mixta", "mixed media", "grisalla", "aguada", "temple", "óleo", "fresco", "acuarela", "pastel",
               "gouache", "pan de oro", "tinta", "carboncillo", "encáustica", "acrílico", "temple al huevo"}

# Materiales que son «pintura» (van antes de «sobre») y traducción de los QID más corrientes.
PAINTS = {"Q296955": "óleo", "Q175166": "temple", "Q4259259": "temple al huevo", "Q134194": "fresco",
          "Q22669850": "fresco", "Q50030": "acuarela", "Q189085": "pastel", "Q1130859": "gouache",
          "Q127418": "pan de oro", "Q181870": "tinta", "Q1663976": "carboncillo", "Q2706780": "encáustica",
          "Q4252254": "temple al huevo", "Q1046583": "acrílico"}
SUPPORTS = {"Q12321255": "lienzo", "Q106857709": "tabla", "Q287": "tabla", "Q291034": "tabla de álamo",
            "Q2225257": "tabla de roble", "Q1402592": "tabla de tilo", "Q11472": "papel", "Q389782": "cartón",
            "Q753": "cobre", "Q274988": "yeso", "Q3374106": "lino", "Q165447": "yute", "Q189555": "marfil",
            "Q1426648": "tabla", "Q10306": "tabla", "Q2095": "tabla", "Q106895220": "tabla", "Q43238": "pizarra",
            "Q2118": "pizarra", "Q21471468": "tabla", "Q3914823": "pergamino", "Q226697": "pergamino",
            "Q11469": "madera", "Q29440": "madera"}
LABELS = {"témpera": "temple", "tempera": "temple", "oil paint": "óleo", "pintura al óleo": "óleo", "oro": "pan de oro",
          "gold leaf": "pan de oro", "hoja de oro": "pan de oro", "canvas": "lienzo", "panel": "tabla", "wood": "tabla",
          "paper": "papel", "cardboard": "cartón", "copper": "cobre", "plaster": "yeso", "watercolor": "acuarela",
          "fresco": "fresco", "pastel": "pastel", "tinta china": "tinta", "ink": "tinta", "charcoal": "carboncillo"}
WOODS = re.compile(r"\b(madera|wood|tabla|panel|álamo|roble|tilo|nogal|haya|pino|abeto|cedro|caoba)\b", re.I)
# Clases de Wikidata que cuentan como «ciudad o municipio» al subir por P131.
CITY_TYPES = {"Q515", "Q1549591", "Q5119", "Q2074737", "Q484170", "Q747074", "Q42744322", "Q1637706", "Q174844",
              "Q1093829", "Q15284", "Q702492", "Q3957", "Q1187811", "Q3327873", "Q2039348", "Q532", "Q7930989",
              "Q15303838", "Q262166", "Q131596", "Q1134686", "Q1500350", "Q2989398", "Q21518270", "Q1907114",
              "Q5084", "Q27676428", "Q3750285", "Q13220204", "Q2755753", "Q498162", "Q667509", "Q1799794",
              "Q3685430", "Q3455524", "Q2616791", "Q619610", "Q1066984", "Q1065118", "Q10354598",
              "Q2514025", "Q3184121"}
STRICT_MUSEUM = {"Q33506", "Q207694", "Q1007870", "Q17431399", "Q2772772", "Q3950", "Q1329623", "Q106855583", "Q1060829"}
# Clases que indican museo, iglesia, palacio, capilla... (dónde está la obra de verdad).
MUSEUM_TYPES = {"Q33506", "Q207694", "Q1007870", "Q17431399", "Q2772772", "Q16970", "Q2977", "Q44613", "Q108325",
                "Q1128397", "Q16560", "Q1497364", "Q24398318", "Q4989906", "Q1030034", "Q5003624", "Q1370598",
                "Q3950", "Q35112127", "Q12518", "Q860861", "Q2087181", "Q1021290", "Q22746", "Q811979", "Q1976594",
                "Q210272", "Q7075", "Q1329623", "Q3947", "Q1802963", "Q56750657", "Q106855583", "Q1060829"}

Q_OBRAS = """
SELECT ?item ?coll ?collLabel ?cstart ?loc ?locLabel ?mat ?matLabel ?h ?w ?hu ?wu ?inc ?prec ?genre ?genreLabel
       ?mov ?movLabel ?dep ?depLabel WHERE {
  VALUES ?item { %(values)s }
  OPTIONAL { ?item p:P195 ?cs . ?cs ps:P195 ?coll . FILTER NOT EXISTS { ?cs pq:P582 [] } OPTIONAL { ?cs pq:P580 ?cstart } }
  OPTIONAL { ?item wdt:P276 ?loc }
  OPTIONAL { ?item wdt:P186 ?mat }
  OPTIONAL { ?item p:P2048 ?hs . ?hs psv:P2048 ?hv . ?hv wikibase:quantityAmount ?h ; wikibase:quantityUnit ?hu .
             FILTER NOT EXISTS { ?hs pq:P518 [] } }
  OPTIONAL { ?item p:P2049 ?ws . ?ws psv:P2049 ?wv . ?wv wikibase:quantityAmount ?w ; wikibase:quantityUnit ?wu .
             FILTER NOT EXISTS { ?ws pq:P518 [] } }
  OPTIONAL { ?item p:P571 ?is . ?is psv:P571 ?iv . ?iv wikibase:timeValue ?inc ; wikibase:timePrecision ?prec }
  OPTIONAL { ?item wdt:P136 ?genre }
  OPTIONAL { ?item wdt:P135 ?mov }
  OPTIONAL { ?item wdt:P180 ?dep }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
}
"""

Q_MUSEOS = """
SELECT ?m ?mLabel ?mt ?adm ?loc ?p ?c ?cLabel WHERE {
  VALUES ?m { %(values)s }
  OPTIONAL { ?m wdt:P31 ?mt }
  OPTIONAL { ?m wdt:P131 ?adm }
  OPTIONAL { ?m wdt:P276 ?loc }
  OPTIONAL { ?m wdt:P361 ?p }
  OPTIONAL { ?m wdt:P17 ?c }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
}
"""

Q_LUGARES = """
SELECT ?x ?xLabel ?xt ?up ?c ?cLabel WHERE {
  VALUES ?x { %(values)s }
  OPTIONAL { ?x wdt:P31 ?xt }
  OPTIONAL { ?x wdt:P131 ?up }
  OPTIONAL { ?x wdt:P17 ?c }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
}
"""


def v(b, k):
    x = b.get(k)
    return x["value"] if x else None


def qid(uri):
    return uri.rsplit("/", 1)[-1] if uri else None


def blank(uri):
    return not uri or uri.startswith("http://www.wikidata.org/.well-known/")


def label_ok(label, q):
    return bool(label) and label != q


def fmt(n):
    s = f"{n:.1f}".rstrip("0").rstrip(".")
    return s.replace(".", ",")


def technique(mats):
    """mats: [(qid, label)] -> «Óleo sobre lienzo»."""
    paints, supports = [], []
    for q, lab in mats:
        if q in PAINTS:
            t = PAINTS[q]; lst = paints
        elif q in SUPPORTS:
            t = SUPPORTS[q]; lst = supports
        else:
            t = LABELS.get((lab or "").lower(), (lab or "").lower())
            if not t:
                continue
            t = "tabla" if WOODS.search(t) and "tabla" not in t else t
            lst = paints if t in PAINTS.values() or t in PAINT_WORDS else supports
        if t not in lst:
            lst.append(t)
    if paints and supports:
        s = " y ".join(paints) + " sobre " + " y ".join(supports)
    else:
        s = " y ".join(paints or supports)
    return s[:1].upper() + s[1:] if s else ""


def pick_dims(pairs, ratio):
    """pairs: [(h, w)] en cm; elige la que más se parece a la proporción de la imagen (ancho/alto)."""
    pairs = [(h, w) for h, w in pairs if h and w]
    if not pairs:
        return None, None, None
    if ratio:
        pairs.sort(key=lambda p: abs(math.log((p[1] / p[0]) / ratio)))
    h, w = pairs[0]
    return f"{fmt(h)} × {fmt(w)} cm", h, w


def year_text(dates):
    """dates: {(time, prec)} -> texto corto de la fecha declarada (solo precisión de año o mejor)."""
    ys = []
    for t, prec in dates:
        try:
            y = int(t[:5]) if t[0] in "+-" else int(t[:4])
        except Exception:
            continue
        if prec >= 9:
            ys.append(y)
    if ys:
        a, b = min(ys), max(ys)
        return str(a) if a == b else f"{a}–{b}"
    return ""


def fetch_obras(qids):
    rows = sparql(Q_OBRAS % dict(values=" ".join("wd:" + q for q in qids)), tries=4)
    out = {}
    for b in rows:
        q = qid(v(b, "item"))
        it = out.setdefault(q, dict(colls={}, starts={}, locs={}, mats={}, pairs=set(), dates=set(), genres={}, movs={}, deps={}))
        if not blank(v(b, "coll")):
            it["colls"][qid(v(b, "coll"))] = v(b, "collLabel")
            if v(b, "cstart"):
                it["starts"][qid(v(b, "coll"))] = v(b, "cstart")[:4]
        if not blank(v(b, "loc")):
            it["locs"][qid(v(b, "loc"))] = v(b, "locLabel")
        if v(b, "mat"):
            it["mats"][qid(v(b, "mat"))] = v(b, "matLabel")
        if v(b, "h") and v(b, "w") and qid(v(b, "hu")) in UNITS and qid(v(b, "wu")) in UNITS:
            it["pairs"].add((round(float(v(b, "h")) * UNITS[qid(v(b, "hu"))], 1), round(float(v(b, "w")) * UNITS[qid(v(b, "wu"))], 1)))
        if v(b, "inc"):
            it["dates"].add((v(b, "inc"), int(v(b, "prec") or 0)))
        for k in ("genre", "mov", "dep"):
            if v(b, k) and label_ok(v(b, k + "Label"), qid(v(b, k))):
                it[k + "s"][qid(v(b, k))] = v(b, k + "Label")
    return out


def fetch_museos(mqids):
    rows = sparql(Q_MUSEOS % dict(values=" ".join("wd:" + q for q in mqids)), tries=4)
    out = {}
    for b in rows:
        q = qid(v(b, "m"))
        m = out.setdefault(q, dict(name=v(b, "mLabel"), types=[], adm=None, loc=None, parent=None, country=None))
        if v(b, "mt") and qid(v(b, "mt")) not in m["types"]:
            m["types"].append(qid(v(b, "mt")))
        for k, key in (("adm", "adm"), ("loc", "loc"), ("parent", "p")):
            if v(b, key) and not m[k]:
                m[k] = qid(v(b, key))
        if v(b, "c") and label_ok(v(b, "cLabel"), qid(v(b, "c"))):
            m["country"] = v(b, "cLabel")
    for m in out.values():
        m["isMuseum"] = bool(set(m["types"]) & MUSEUM_TYPES)
    return out


def fetch_lugares(xqids):
    rows = sparql(Q_LUGARES % dict(values=" ".join("wd:" + q for q in xqids)), tries=4)
    out = {}
    for b in rows:
        q = qid(v(b, "x"))
        x = out.setdefault(q, dict(label=v(b, "xLabel"), types=[], up=None, country=None))
        if v(b, "xt") and qid(v(b, "xt")) not in x["types"]:
            x["types"].append(qid(v(b, "xt")))
        if v(b, "up") and not x["up"]:
            x["up"] = qid(v(b, "up"))
        if v(b, "c") and label_ok(v(b, "cLabel"), qid(v(b, "c"))):
            x["country"] = v(b, "cLabel")
    for x in out.values():
        x["isCity"] = bool(set(x["types"]) & CITY_TYPES)
    return out


class Lugares:
    """Caché de niveles administrativos (P131) con consultas por lotes."""

    def __init__(self):
        self.data = load(LUGARES, {})

    def ensure(self, qids):
        missing = sorted({q for q in qids if q and q not in self.data})
        for j in range(0, len(missing), 50):
            try:
                self.data.update(fetch_lugares(missing[j:j + 50]))
            except Exception as e:
                log(f"ERROR lugares {j}: {e}")

    def city(self, start):
        """Sube por P131 desde `start` hasta un municipio/ciudad (máx. 5 niveles)."""
        q, chain = start, []
        for _ in range(5):  # primero la cadena entera: si pasa por una ciudad con alias (Londres, París...) gana el alias
            if not q or q in chain:
                break
            chain.append(q)
            self.ensure([q])
            x = self.data.get(q)
            if not x:
                break
            q = x["up"]
        for q in chain:
            if q in CITY_ALIASES:
                return CITY_ALIASES[q], self.data[q].get("country")
        for q in chain:
            if self.data[q]["isCity"]:
                return self.data[q]["label"], self.data[q].get("country")
        first = self.data.get(start)
        return (first["label"], first.get("country")) if first else (None, None)


def resolve_museo(mq, museos, lugares):
    """Devuelve (nombre, ciudad, país) del museo; si no es museo pero forma parte de uno (P361), sube a él."""
    m = museos.get(mq)
    if not m:
        return None, None, None
    if not m["isMuseum"] and m.get("parent") and museos.get(m["parent"], {}).get("isMuseum"):
        return resolve_museo(m["parent"], museos, lugares)
    start = m.get("adm") or museos.get(m.get("parent") or "", {}).get("adm") or m.get("loc")
    city, country = lugares.city(start) if start else (None, None)
    if city == m["name"]:
        city = None
    return m["name"], city, m.get("country") or country


def main():
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else 10 ** 6
    force = os.environ.get("FORCE") == "1" or "--force" in sys.argv
    sel = load(os.path.join(CAT, "seleccion.json"), [])
    fichas = {} if force else load(FICHAS, {})
    museos = {} if force else load(MUSEOS, {})
    lugares = Lugares()
    todo = [s for s in sel if s["qid"] not in fichas][:limit]
    log(f"selección {len(sel)}, con ficha {len([s for s in sel if s['qid'] in fichas])}, este lote {len(todo)}")
    ratio = {s["qid"]: (s["srcW"] / s["srcH"]) if s.get("srcW") and s.get("srcH") else None for s in sel}
    for i in range(0, len(todo), 40):
        chunk = todo[i:i + 40]
        try:
            data = fetch_obras([s["qid"] for s in chunk])
        except Exception as e:
            log(f"ERROR lote {i}: {e}"); time.sleep(15); continue
        need = sorted({m for it in data.values() for m in list(it["colls"]) + list(it["locs"]) if m not in museos})
        for _ in range(2):  # 2.ª vuelta para los «padres» (P361) que falten
            for j in range(0, len(need), 50):
                try:
                    museos.update(fetch_museos(need[j:j + 50]))
                except Exception as e:
                    log(f"ERROR museos {j}: {e}")
            need = sorted({m["parent"] for m in museos.values() if m.get("parent")} - set(museos))
            if not need:
                break
        lugares.ensure([m.get("adm") or m.get("loc") for m in museos.values()])
        for s in chunk:
            it = data.get(s["qid"]) or dict(colls={}, starts={}, locs={}, mats={}, pairs=set(), dates=set(), genres={}, movs={}, deps={})
            # Dónde está hoy: entre colección (P195 sin fecha de fin) y ubicación (P276) gana la que sea museo
            # propiamente (o parte de uno), luego la que aparezca en ambas, luego la de ingreso más reciente;
            # así el Prado gana al Palacio Real en Las meninas y la National Gallery a la Cook collection.
            cands = list(it["colls"]) + [c for c in it["locs"] if c not in it["colls"]]

            def rank(c):
                m = museos.get(c, {})
                if set(m.get("types") or []) & STRICT_MUSEUM:
                    strict = 3
                elif set(museos.get(m.get("parent") or "", {}).get("types") or []) & STRICT_MUSEUM:
                    strict = 2
                else:
                    strict = 1 if m.get("isMuseum") else 0
                return (strict, int(c in it["colls"] and c in it["locs"]), int(it["starts"].get(c) or 0), -cands.index(c))
            coll_q = max(cands, key=rank) if cands else None
            name, city, country = resolve_museo(coll_q, museos, lugares) if coll_q else (None, None, None)
            name = name or it["colls"].get(coll_q) or it["locs"].get(coll_q)
            dims, h, w = pick_dims(sorted(it["pairs"]), ratio.get(s["qid"]))
            fichas[s["qid"]] = dict(
                museum=name, museumQid=coll_q, city=city, country=country, inSpain=country == "España",
                technique=technique(list(it["mats"].items())), materials=sorted(it["mats"].values()),
                dimensions=dims, heightCm=h, widthCm=w, inception=year_text(it["dates"]),
                depicts=sorted(it["deps"].values())[:10], genre=next(iter(it["genres"].values()), None),
                movement=next(iter(it["movs"].values()), None),
                source="wikidata", fetched=time.strftime("%Y-%m-%d"))
        save(FICHAS, fichas); save(MUSEOS, museos); save(LUGARES, lugares.data)
        log(f"ok lote {i // 40 + 1}: {len(chunk)} fichas ({len(fichas)} en total)")
    fs = list(fichas.values())
    log(f"fin: {len(fs)} fichas; con museo {sum(1 for f in fs if f['museum'])}, con ciudad {sum(1 for f in fs if f['city'])}, "
        f"con técnica {sum(1 for f in fs if f['technique'])}, con medidas {sum(1 for f in fs if f['dimensions'])}, "
        f"en España {sum(1 for f in fs if f['inSpain'])}")


if __name__ == "__main__":
    main()
