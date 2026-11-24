"""Fase A.3 (local, sin red): elige las obras de cada pintor a partir de las candidatas.

Entrada: pipeline/painters.json, pipeline/out/candidates/*.json, pipeline/out/painters_resolved.json,
         pipeline/excluir.json (QID -> motivo, de la revisión obra a obra),
         pipeline/extra.json (pintor -> {QID: motivo}: obras icónicas forzadas; entran aunque tengan
           dos autores, palabras sospechosas o medidas que no casan, y con imagen >= 1000 px),
         pipeline/ajustes.json (QID -> {titulo, archivo, archivoInfo, anio, anioSort} correcciones a mano),
         pipeline/titulos_es.json (QID -> título en español para las que no tienen etiqueta es).
Salida:  catalogo/seleccion.json (con `level` 1|2: las 4-6 más conocidas de cada pintor son nivel 1),
         pipeline/logs/select.txt (recuento por pintor) y pipeline/logs/select_drops.txt (descartes con fama).
"""
import math, os, re, sys, unicodedata
from lib import *

log = Log("select")
drops = Log("select_drops")  # descartes con fama (sitelinks >= 8), para revisar a mano

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
MIN_SIDE, MIN_SIDE_FORCED = 1200, 1000
BLANK = "http://www.wikidata.org/.well-known/"


def level1_count(n):
    """Cuántas obras de un pintor van al nivel 1 (camino): 4 si tiene <= 8, 5 si <= 12, 6 si más."""
    return min(n, 4 if n <= 8 else 5 if n <= 12 else 6)


def dims_ok(it, img_w, img_h):
    """Compara la proporción de la imagen con las medidas declaradas; devuelve (comparable, desvío mínimo)."""
    pairs = list(it.get("dims") or [])
    if not pairs and it.get("h") and it.get("w") and it.get("hu") == it.get("wu"):
        pairs = [[it["h"], it["w"]]]
    if not pairs:
        return False, 0.0
    img = img_w / img_h
    return True, min(abs(math.log(img / (w / h))) for h, w in pairs if h and w)


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
    extra = load(os.path.join(PIPE, "extra.json"), {})  # pintor -> {QID: motivo} obras a forzar
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
        forced = set(extra.get(p["id"]) or [])
        for it in cand["items"]:
            q = it["qid"]

            def drop(k):
                why[k] = why.get(k, 0) + 1
                if it["sl"] >= 8:
                    files = it.get("files") or {}
                    fi = ";".join(f"{x['width']}x{x['height']} {x.get('mime','')} {x.get('license','')}" if x else "sin info"
                                  for x in files.values()) or "sin archivos"
                    drops(f"{p['id']:16} {q:10} sl={it['sl']:3} {k:26} {(it.get('es') or it.get('en') or '')[:45]:45} | {fi}")
            a = adj.get(q, {})
            if q in excl:
                drop("excluida"); continue
            if pq not in it["creators"] and not (q in forced and not it["creators"]):
                drop("autoría no preferente"); continue
            if len(it["creators"]) > 1 and q not in forced:
                drop("varios autores"); continue
            if it["after"]:
                drop("según otra obra"); continue
            text = " ".join(filter(None, [it.get("es"), it.get("en"), it.get("des"), it.get("den")]))
            if BAD_WORDS.search(text) and q not in forced and "titulo" not in a:
                drop("palabra"); continue
            if CEILING.search(" ".join(filter(None, [it.get("es"), it.get("en")]))) and q not in forced and "titulo" not in a:
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
            min_side = MIN_SIDE_FORCED if q in forced else MIN_SIDE
            for lax in (False, True):  # 2.ª pasada solo para forzadas: admite nombres de archivo sospechosos
                for f in names:
                    x = files.get(f) if "archivo" not in a else (files.get(f) or a.get("archivoInfo"))
                    if not x or x.get("mime") not in MIMES:
                        continue
                    if max(x["width"], x["height"]) < min_side:
                        continue
                    if FILE_BAD.search(f) and "archivo" not in a and not lax:
                        continue
                    if x.get("license") and not LIC_OK.search(x["license"]):
                        continue
                    pick = (f, x); break
                if pick or q not in forced:
                    break
            if not pick:
                drop("sin imagen apta" if files else "sin datos de imagen"); continue
            f, x = pick
            score = it["sl"] + 1
            flags = []
            conf = "high"
            comparable, d = dims_ok(it, x["width"], x["height"])
            if comparable:
                if d > 0.25 and "archivo" not in a and q not in forced:
                    drop("proporción ≠ medidas"); continue
                if d > 0.08:
                    flags.append("proporcion"); score *= (0.6 if d > 0.15 else 0.85); conf = "medium"
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
            colls = [c for k, c in it["colls"].items() if c and not str(k).startswith(BLANK) and not str(c).startswith("http")]
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
        n1 = level1_count(len(chosen))
        # Nivel: por fama real (sitelinks), no por la bonificación de forzada; ajustes.json puede fijar level=1
        # para icónicas cuya fama está repartida entre versiones (El grito, Los girasoles, La torre de Babel...).
        chosen.sort(key=lambda o: (0 if adj.get(o["q"], {}).get("level") == 1 else 1, -o["sl"], -o["score"]))
        for i, o in enumerate(chosen):
            if o["src"] in ("traducir", "revisar-idioma"):
                o["conf"] = "medium"
            sel.append(dict(
                id="w" + o["q"][1:], pintorId=p["id"], qid=o["q"], titulo=o["title"], tituloFuente=o["src"],
                level=1 if i < n1 else 2, forzada=o["q"] in forced,
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
