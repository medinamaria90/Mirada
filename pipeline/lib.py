"""Utilidades comunes del proceso de catálogo de Mirada (solo biblioteca estándar).

Etiqueta de uso de Wikimedia: User-Agent descriptivo, peticiones en serie con pausa,
reintentos con espera ante 429/5xx.
"""
import json, os, sys, time, urllib.parse, urllib.request, urllib.error

UA = "MiradaCatalogBot/1.0 (https://github.com/medinamaria90/mirada; educational art quiz) python-urllib"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PIPE = os.path.join(ROOT, "pipeline")
OUT = os.path.join(PIPE, "out")
LOGS = os.path.join(PIPE, "logs")
CAT = os.path.join(ROOT, "catalogo")
for d in (OUT, LOGS, CAT):
    os.makedirs(d, exist_ok=True)

_last = [0.0]
MIN_GAP = 0.5  # ≤ 2 peticiones/s


class Log:
    def __init__(self, name):
        self.path = os.path.join(LOGS, name + ".txt")
        self.f = open(self.path, "w", encoding="utf-8")

    def __call__(self, *a):
        s = " ".join(str(x) for x in a)
        print(s, flush=True)
        self.f.write(s + "\n")
        self.f.flush()


def http(url, data=None, headers=None, tries=6, timeout=90, binary=False):
    h = {"User-Agent": UA, "Accept-Encoding": "identity"}
    if headers:
        h.update(headers)
    for i in range(tries):
        wait = _last[0] + MIN_GAP - time.time()
        if wait > 0:
            time.sleep(wait)
        _last[0] = time.time()
        try:
            req = urllib.request.Request(url, data=data, headers=h)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                body = r.read()
                return body if binary else body.decode("utf-8")
        except urllib.error.HTTPError as e:
            code = e.code
            if code in (429, 500, 502, 503, 504) and i < tries - 1:
                ra = e.headers.get("Retry-After")
                s = int(ra) if ra and ra.isdigit() else 5 * (2 ** i)
                print(f"  HTTP {code}, espero {s}s: {url[:120]}", flush=True)
                time.sleep(min(s, 120))
                continue
            raise
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            if i < tries - 1:
                time.sleep(5 * (2 ** i))
                continue
            raise


def get_json(url, **kw):
    return json.loads(http(url, **kw))


def sparql(q, tries=3):
    url = "https://query.wikidata.org/sparql"
    data = urllib.parse.urlencode({"query": q, "format": "json"}).encode()
    body = http(url, data=data, headers={"Accept": "application/sparql-results+json",
                                         "Content-Type": "application/x-www-form-urlencoded"}, timeout=70, tries=tries)
    return json.loads(body)["results"]["bindings"]


def load(path, default=None):
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return default


def save(path, obj, compact=False):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        if compact:
            json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
        else:
            json.dump(obj, f, ensure_ascii=False, indent=1)
        f.write("\n")
    os.replace(tmp, path)
