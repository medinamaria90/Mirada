"""Revisa el banco de preguntas de concepto (contenido/preguntas-concepto.json) contra el catálogo y lo copia a
app/data/preguntas-concepto.json, lo que sirve la app (engine/concepts.js). Si algo falla, no copia nada.
Uso: python3 -I tools/sync_preguntas.py [--check]"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "contenido" / "preguntas-concepto.json"
DST = ROOT / "app" / "data" / "preguntas-concepto.json"
CATALOG = ROOT / "app" / "data" / "catalog.json"
TRAMOS = ROOT / "contenido" / "tramos.json"

KINDS = {"cual", "comun", "cambia", "rompe"}
SCOPES = {"epoca": (3, 5), "tramo": (2, 3)}
MAX_WHY = 180
MAX_OPTION = 70
OPTIONS = 4
YEAR = re.compile(r"\b1[0-9]{3}\b")


def problems(bank, catalog, tramos):
    out = []
    works = {w["id"]: w for w in catalog["artworks"]}
    artists = {a["id"]: a for a in catalog["artists"]}
    movements = {m["id"]: m for m in catalog["movements"]}
    era_of = lambda wid: artists[works[wid]["artistId"]]["movementId"]
    seen, count = set(), {}
    for q in bank.get("questions", []):
        qid = q.get("id", "?")
        bad = lambda msg: out.append(f"{qid}: {msg}")
        if qid in seen:
            bad("id repetido")
        seen.add(qid)
        scope, mov, kind = q.get("scope"), q.get("movementId"), q.get("kind")
        if scope not in SCOPES:
            bad(f"scope desconocido {scope}")
        if mov not in movements or movements[mov].get("branch"):
            bad(f"época no válida {mov}")
        if kind not in KINDS:
            bad(f"tipo desconocido {kind}")
        if scope == "tramo":
            key = q.get("tramo")
            path = [a for a in catalog["artists"] if a.get("section") == key and a.get("onPath")]
            if key not in tramos or not path:
                bad(f"tramo desconocido {key}")
            elif any(a["movementId"] != mov for a in path):
                bad(f"el tramo {key} no es de {mov}")
        count[(scope, mov if scope == "epoca" else q.get("tramo"))] = count.get((scope, mov if scope == "epoca" else q.get("tramo")), 0) + 1
        prompt = q.get("prompt", "")
        if not prompt.endswith("?") or YEAR.search(prompt):
            bad("enunciado sin «?» o con un año")
        if not str(q.get("source", "")).startswith("https://"):
            bad("sin fuente")
        shown = q.get("works", [])
        # Las obras a la vista pueden llevar firma si está velada (`signs`): aquí no se pregunta por el autor.
        for wid in shown:
            if wid not in works or (works[wid].get("spoiler") and not works[wid].get("signs")):
                bad(f"obra no válida {wid}")
        if q.get("labels") and len(q["labels"]) != len(shown):
            bad("etiquetas y obras no casan")
        if kind == "cual" and shown:
            bad("las de «¿Cuál…?» no llevan obras aparte")
        if kind == "comun" and len(shown) not in (2, 3):
            bad("«en común» necesita 2 o 3 obras")
        if kind == "cambia" and (len(shown) != 2 or len(q.get("labels", [])) != 2):
            bad("«qué cambia» necesita 2 obras con etiqueta")
        if kind == "rompe" and len(shown) not in (1, 2):
            bad("«rompe» necesita 1 o 2 obras")
        opts = q.get("options", [])
        ids = [o.get("id") for o in opts]
        if len(opts) != OPTIONS or len(set(ids)) != OPTIONS or q.get("answer") not in ids:
            bad("opciones o respuesta mal formadas")
            continue
        for o in opts:
            why = o.get("why", "")
            if not why or len(why) > MAX_WHY:
                bad(f"opción {o['id']}: porqué vacío o de más de {MAX_WHY} ({len(why)})")
            if kind == "cual":
                wid = o.get("work")
                if wid not in works or works[wid].get("spoiler") or wid in shown:
                    bad(f"opción {o['id']}: obra no válida {wid}")
                    continue
                right = o["id"] == q["answer"]
                if right != (era_of(wid) == mov):
                    bad(f"opción {o['id']}: {wid} es de {era_of(wid)}")
            else:
                text = o.get("text", "")
                if not text or len(text) > MAX_OPTION or YEAR.search(text):
                    bad(f"opción {o['id']}: texto vacío, largo o con un año")
        if kind == "cual":
            wids = [o.get("work") for o in opts]
            if len(set(wids)) != OPTIONS:
                bad("obras repetidas entre las opciones")
    for (scope, key), n in count.items():
        lo, hi = SCOPES.get(scope, (0, 99))
        if not lo <= n <= hi:
            out.append(f"{scope} {key}: {n} preguntas (deben ser {lo}-{hi})")
    return out


def main():
    bank = json.loads(SRC.read_text(encoding="utf-8"))
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    tramos = json.loads(TRAMOS.read_text(encoding="utf-8"))
    found = problems(bank, catalog, tramos)
    if found:
        print("\n".join(found))
        sys.exit("banco de preguntas con errores: no se copia")
    if "--check" not in sys.argv:
        DST.write_text(json.dumps(bank, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{len(bank['questions'])} preguntas de concepto -> app/data/preguntas-concepto.json")


if __name__ == "__main__":
    main()
