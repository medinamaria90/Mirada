"""Fase A.3 (local, sin red): elige las obras de cada pintor a partir de las candidatas.

Entrada: pipeline/painters.json, pipeline/out/candidates/*.json, pipeline/out/painters_resolved.json,
         pipeline/excluir.json (QID -> motivo, de la revisión visual),
         pipeline/ajustes.json (QID -> {titulo, archivo, anio, ...} correcciones a mano),
         pipeline/titulos_es.json (QID -> título en español para las que no tienen etiqueta es).
Salida:  catalogo/seleccion.json y pipeline/logs/select.txt (recuento por pintor).
"""
import math, os, re, sys, unicodedata
from lib import *

log = Log("select")

BAD_WORDS = re.compile(r"\b(cop(y|ia|ie)|replica|réplica|taller|workshop|atelier|attributed|atribuid[oa]|attribu|circle of|c[ií]rculo de|"
                       r"follower|seguidor|school of|escuela de|manner of|manera de|after |según |d'après|nach |study for|estudio para|"
                       r"sketch|boceto|bozzetto|esbozo|modello|oil sketch|detail|detalle|fragment|fragmento|x-ray|radiograf|infrared|"
                       r"reverse|reverso|verso|back of|frame|marco|drawing|dibujo|etching|grabado|engraving|lithograph|litograf|print\b|"
                       r"cartoon for|cartón para)", re.I)
CEILING = re.compile(r"\b(ceiling|techo|b[óo]veda|vault|cupola|c[úu]pula|dome|soffitto)\b", re.I)
FILE_BAD = re.compile(r"(detail|detalle|ausschnitt|crop|x-?ray|infrared|reverse|verso|back side|r[üu]ckseite|in situ|"
                      r"exhibition|ausstellung|install|room|sala |\bwall\b)", re.I)
FILE_PEN = re.compile(r"(frame|framed|marco|rahmen|cornice|museum|gallery|IMG_|DSC|DSCF|P\d{6,}|\bphoto\b|foto)", re.I)
FILE_GOOD = re.compile(r"(Google Art Project|Google Cultural Institute|Museo del Prado|Rijksmuseum|National Gallery|"
                       r"Metropolitan Museum|Hermitage|Louvre|Uffizi|Kunsthistorisches|Gemäldegalerie|WGA|Web Gallery)", re.I)
EN_WORDS = re.compile(r"\b(the|of|with|and|portrait|lady|young|man|woman|girl|boy|saint|virgin|still life|landscape|view|holy|family)\b", re.I)
LIC_OK = re.compile(r"(public domain|^pd|cc0|cc[- ]by)", re.I)
MIMES = {"image/jpeg", "image/png", "image/tiff", "image/webp"}


def norm(s):
    s = unicodedata.normalize("NFKD", (s or "").lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    s = re.sub(r"\b(the|a|an|el|la|los|las|le|les|il|lo|de|del|of|with|con|and|y)\b", " ", s)
    return " ".join(s.split())


def roman(n):
    vals = [(1000, "M"), (900, "CM"), (500, "D"), (400, "CD"), (100, "C"), (90, "XC"), (50, "L"), (40, "XL"), (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")]
    r = ""
    for v, s in vals:
        while n >= v:
            r += s; n -= v
    return r


def year_info(dates, born, died):
    ys, circa, rough = [], False, None
    for t, prec, c in dates:
        try:
            y = int(t[:5]) if t[0] in "+-" else int(t[:4])
        except Exception:
            continue
        if prec >= 9:
            ys.append(y); circa |= c
        elif prec == 8:
            ys.append(y); circa = True
        elif prec == 7 and rough is None:
            rough = y
    ys = [y for y in ys if born - 1 <= y <= died + 1]
    if ys:
        a, b = min(ys), max(ys)
        txt = (f"{a}–{b}" if b != a else str(a))
        return ("c. " if circa else "") + txt, a, ("circa" if circa else "exact")
    if rough:
        c = (rough - 1) // 100 + 1 if rough % 100 else rough // 100
        return f"s. {roman(c)}", None, "century"
    return "", None, "none"


def main():
    painters = load(os.path.join(PIPE, "painters.json"))
    resolved = {r["id"]: r for r in load(os.path.join(OUT, "painters_resolved.json"), [])}
    excl = load(os.path.join(PIPE, "excluir.json"), {})
    adj = load(os.path.join(PIPE, "ajustes.json"), {})
    tit = load(os.path.join(PIPE, "titulos_es.json"), {})
    extra = load(os.path.join(PIPE, "extra.json"), {})  # pintor -> [QID] obras a forzar
    sel, total, pais = [], 0, {}
    log(f"{'pintor':18} {'cand':>5} {'aptas':>5} {'elegidas':>8}/obj  motivos de descarte")
    for p in painters:
        r = resolved.get(p["id"], {})
        pq = p.get("qid") or r.get("qid")
        cand = load(os.path.join(OUT, "candidates", p["id"] + ".json"))
        if not pq or not cand:
            log(f"{p['id']:18} sin datos")
            continue
        born, died = r.get("nacimiento") or p["nacimiento"], r.get("muerte") or p["muerte"]
        why = {}
        ok = []
        forced = set(extra.get(p["id"], []))
        for it in cand["items"]:
            def drop(k):
                why[k] = why.get(k, 0) + 1
            q = it["qid"]
            a = adj.get(q, {})
            if q in excl:
                drop("excluida"); continue
            if pq not in it["creators"]:
                drop("autoría no preferente"); continue
            if len(it["creators"]) > 1 and q not in forced:
                drop("varios autores"); continue
            if it["after"]:
                drop("según otra obra"); continue
            text = " ".join(filter(None, [it.get("es"), it.get("en"), it.get("des"), it.get("den")]))
            if BAD_WORDS.search(text) and q not in forced and "titulo" not in a:
                drop("palabra"); continue
            if CEILING.search(" ".join(filter(None, [it.get("es"), it.get("en")]))) and q not in forced:
                drop("techo"); continue
            ytxt, ysort, yq = year_info(it["dates"], born, died)
            if "anio" in a:
                ytxt, ysort, yq = a["anio"], a["anioSort"], "exact"
            if ysort and ysort >= 1930:
                drop("posterior a 1929"); continue
            if not ysort and died >= 1930:
                drop("sin fecha (pintor muerto ≥1930)"); continue
            if it["dates"] and not ysort and yq == "none":
                drop("fecha fuera de vida"); continue
            files = it.get("files") or {}
            pick = None
            names = [a["archivo"]] if "archivo" in a else list(files)
            for f in names:
                x = files.get(f) if "archivo" not in a else (files.get(f) or a.get("archivoInfo"))
                if not x or x.get("mime") not in MIMES:
                    continue
                if max(x["width"], x["height"]) < 1200:
                    continue
                if FILE_BAD.search(f) and "archivo" not in a:
                    continue
                if x.get("license") and not LIC_OK.search(x["license"]):
                    continue
                pick = (f, x); break
            if not pick:
                drop("sin imagen apta" if files else "sin datos de imagen"); continue
            f, x = pick
            score = it["sl"] + 1
            flags = []
            conf = "high"
            if it.get("h") and it.get("w") and it.get("hu") == it.get("wu"):
                phys = it["w"] / it["h"]; img = x["width"] / x["height"]
                d = abs(math.log(img / phys))
                if d > 0.25 and "archivo" not in a:
                    drop("proporción ≠ medidas"); continue
                if d > 0.08:
                    flags.append("proporcion"); score *= 0.6; conf = "medium"
            if FILE_PEN.search(f):
                flags.append("archivo-sospechoso"); score *= 0.7; conf = "medium"
            if FILE_GOOD.search(f):
                score *= 1.15
            if yq in ("none", "century"):
                score *= 0.7
            if q in forced:
                score += 1000
            title, src = None, None
            if a.get("titulo"):
                title, src = a["titulo"], "manual"
            elif q in tit:
                title, src = tit[q], "traducido"
            elif it.get("es"):
                title, src = it["es"], "wikidata-es"
                if EN_WORDS.search(title) and title == it.get("en"):
                    src = "revisar-idioma"
            elif it.get("en"):
                title, src = it["en"], "traducir"
            else:
                drop("sin título"); continue
            title = re.sub(r"\s*\([^)]*\)\s*$", "", title).strip().rstrip(".").strip()
            title = title[0].upper() + title[1:]
            colls = [c for c in it["colls"].values() if c]
            ok.append(dict(score=score, q=q, title=title, src=src, ytxt=ytxt, ysort=ysort or (born + 35), yq=yq,
                           coll=colls[0] if colls else None, file=f, x=x, sl=it["sl"], flags=flags, conf=conf,
                           key=norm(re.sub(r"\([^)]*\)", "", it.get("en") or it.get("es") or title)), types=it["types"]))
        ok.sort(key=lambda o: -o["score"])
        seen_keys, seen_files, chosen = set(), set(), []
        for o in ok:
            if o["key"] in seen_keys or o["file"] in seen_files:
                why["duplicado/versión"] = why.get("duplicado/versión", 0) + 1
                continue
            seen_keys.add(o["key"]); seen_files.add(o["file"])
            if len(chosen) < p["objetivo"]:
                chosen.append(o)
        for o in chosen:
            if o["src"] in ("traducir", "revisar-idioma"):
                o["conf"] = "medium"
            sel.append(dict(
                id="w" + o["q"][1:], pintorId=p["id"], qid=o["q"], titulo=o["title"], tituloFuente=o["src"],
                anio=o["ytxt"], anioSort=o["ysort"], anioCalidad=o["yq"], coleccion=o["coll"], tipo=o["types"],
                archivo=o["file"], archivoUrl="https://commons.wikimedia.org/wiki/File:" + o["file"].replace(" ", "_"),
                srcW=o["x"]["width"], srcH=o["x"]["height"], mime=o["x"]["mime"],
                licencia=o["x"].get("license"), autorArchivo=o["x"].get("artist"), creditoArchivo=o["x"].get("credit"),
                sitelinks=o["sl"], confianza=o["conf"], avisos=o["flags"]))
        total += len(chosen)
        pais[p["pais"]] = pais.get(p["pais"], 0) + len(chosen)
        mark = "" if len(chosen) >= p["objetivo"] else "  <-- corto"
        log(f"{p['id']:18} {len(cand['items']):5} {len(ok):5} {len(chosen):8}/{p['objetivo']:<3} "
            + ", ".join(f"{k}:{v}" for k, v in sorted(why.items(), key=lambda kv: -kv[1])) + mark)
    # fama 1-3 por cuantiles de sitelinks
    sls = sorted(s["sitelinks"] for s in sel)
    if sls:
        t1, t2 = sls[int(len(sls) * 0.5)], sls[int(len(sls) * 0.85)]
        for s in sel:
            s["fama"] = 3 if s["sitelinks"] >= t2 else 2 if s["sitelinks"] >= t1 else 1
    save(os.path.join(CAT, "seleccion.json"), sel)
    log("TOTAL", total, "obras de", len({s['pintorId'] for s in sel}), "pintores")
    log("por país:", ", ".join(f"{k} {v}" for k, v in sorted(pais.items(), key=lambda kv: -kv[1])))
    log("títulos por fuente:", {k: sum(1 for s in sel if s["tituloFuente"] == k) for k in {s["tituloFuente"] for s in sel}})


if __name__ == "__main__":
    main()
