"""Fase A.3 (local, sin red): elige las obras de cada pintor a partir de las candidatas.

Entrada: pipeline/painters.json, pipeline/out/candidates/*.json, pipeline/out/painters_resolved.json,
         pipeline/excluir.json (QID -> motivo, de la revisión obra a obra),
         pipeline/extra.json (pintor -> {QID: motivo}: obras icónicas forzadas; entran aunque tengan
           dos autores, palabras sospechosas o medidas que no casan, y con imagen >= 1000 px),
         pipeline/ajustes.json (QID -> {titulo, archivo, archivoInfo, anio, anioSort} correcciones a mano),
         pipeline/titulos_es.json (QID -> título en español para las que no tienen etiqueta es).
         pipeline/etapas.json (pintor -> etapas con años y fuente; la `categoria` de cada pintor está en painters.json).
Salida:  catalogo/seleccion.json (con `level` 1..n y `etapa`: nivel 1 = básico; 2..n = «a fondo», uno por etapa),
         pipeline/logs/select.txt (recuento por pintor) y pipeline/logs/select_drops.txt (descartes con fama).
Uso:     seleccionar.py [pintor ...]  Con ids, solo vuelve a elegir esos pintores: el resto de seleccion.json se queda
         tal cual (con su fama), para no deshacer ajustes hechos a mano en la selección.
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
# Estampas (ukiyo-e): «print», «grabado» o «dibujo» no son sospechosos; sí las reimpresiones tardías y las copias
BAD_WORDS_ESTAMPA = re.compile(BAD_WORDS.pattern.replace(r"|etching|grabado|engraving|lithograph|litograf|print\b", "")
                               .replace("(cop", "(reprint|reimpresi|restrike|facsimile|later impression|cop", 1), re.I)
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


# Obras por categoría (docs/propuesta-pintores.md): (nivel básico, cada «a fondo»). Los invitados españoles llevan 4 en el básico.
CUPOS = {"gran-maestro": (8, 6), "maestro": (7, 5), "invitado": (3, 5), "rama": (4, 0)}  # rama: 4 en el básico y el resto hasta `objetivo` en un único «a fondo»
FASE = int(os.environ.get("FASE", "1"))  # fase 1: grandes maestros completos, maestros con su 1.er «a fondo», invitados solo el básico


def cupo_basico(p):
    n = CUPOS[p["categoria"]][0]
    return 4 if p["categoria"] == "invitado" and p["pais"] == "España" else n


def cupo_fondo(p):
    return max(0, p["objetivo"] - 4) if p["categoria"] == "rama" else CUPOS[p["categoria"]][1]


def corte(h):
    """`hasta` de una etapa: 1648 o «1888-02» -> (año, mes|None); None -> sin corte."""
    if h is None:
        return None
    if isinstance(h, int):
        return h, None
    y, m = h.split("-")
    return int(y), int(m)


def mes_de(dates, y):
    """Mes de la fecha de creación si Wikidata la da con precisión de mes o día (y no es circa) en el año y."""
    for t, prec, c in dates:
        try:
            neg = t[0] in "+-"
            ty = int(t[:5]) if neg else int(t[:4])
            tm = int(t[6:8]) if neg else int(t[5:7])
        except Exception:
            continue
        if prec >= 10 and not c and ty == y:
            return tm
    return None


def etapa_de(etapas, o, adj):
    """Etapa (de todas las del pintor, también las de la fase 2) a la que pertenece la obra, o None.
    ajustes.json[QID].etapa fija el nivel a mano. Si no: la primera etapa cuyo `hasta` alcanza el año (mismo año con
    corte de mes: el mes de la fecha; sin mes, la etapa siguiente). Las obras sin año exacto no tienen etapa."""
    fijo = adj.get(o["q"], {}).get("etapa")
    if fijo:
        return next((e for e in etapas if e["nivel"] == fijo), None)
    if o["yq"] not in ("exact", "circa"):
        return None
    y = o["ysort"]
    for e in etapas:
        c = corte(e.get("hasta"))
        if c is None or y < c[0]:
            return e
        if y == c[0] and (c[1] is None or (o["mes"] is not None and o["mes"] <= c[1])):
            return e
    return None


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
    etapas_all = (load(os.path.join(PIPE, "etapas.json"), {}) or {}).get("pintores", {})
    solo = set(sys.argv[1:])
    desconocidos = solo - {p["id"] for p in painters}
    if desconocidos:
        sys.exit(f"pintores que no están en painters.json: {sorted(desconocidos)}")
    sel, total, pais = [], 0, {}
    log(f"{'pintor':18} {'categ':5} {'cand':>5} {'aptas':>5} {'elegidas':>4}/obj  nivel 1 y «a fondo»  | motivos de descarte")
    for p in painters:
        if solo and p["id"] not in solo:
            continue
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
            if (BAD_WORDS_ESTAMPA if p.get("tipos") else BAD_WORDS).search(text) and q not in forced and "titulo" not in a:
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
                           mes=mes_de(it["dates"], ysort) if ysort else None,
                           coll=colls[0] if colls else None, file=f, x=x, sl=it["sl"], flags=flags, conf=conf,
                           key=norm(re.sub(r"\([^)]*\)", "", it.get("en") or it.get("es") or title)), types=it["types"]))
        ok.sort(key=lambda o: -o["score"])
        seen_keys, seen_files, pool = set(), set(), []  # sin duplicados, de más a menos famosa (score)
        for o in ok:
            if o["key"] in seen_keys or o["file"] in seen_files:
                why["duplicado/versión"] = why.get("duplicado/versión", 0) + 1
                continue
            seen_keys.add(o["key"]); seen_files.add(o["file"])
            pool.append(o)
        cat = p["categoria"]
        etapas = sorted(etapas_all.get(p["id"]) or [], key=lambda e: e["nivel"])
        if cat == "rama" and not etapas and cupo_fondo(p):  # ramas (gótico, ukiyo-e): un solo «a fondo» con las siguientes más famosas
            etapas = [dict(nivel=2, nombre="Más obras", desde=None, hasta=None, fuente=None, fase=1, provisional=True)]
        # Nivel 1 (básico): las icónicas forzadas (extra.json) y las fijadas a mano (ajustes.json level=1) siempre entran,
        # aunque pasen del cupo; el resto, las más famosas. Una icónica de una etapa tardía sigue en el nivel 1 y no cuenta para su etapa.
        prio = [o for o in pool if o["q"] in forced or adj.get(o["q"], {}).get("level") == 1]
        n1 = max(cupo_basico(p), len(prio))
        nivel1 = prio + [o for o in pool if o not in prio][:n1 - len(prio)]
        chosen = [(1, None, o) for o in nivel1]
        usadas = {o["q"] for o in nivel1}
        porNivel = {}
        for e in etapas:  # «a fondo»: una etapa por nivel; las de fase posterior se dejan para más adelante
            if e["fase"] > FASE:
                continue
            if e.get("provisional"):
                aptas = [o for o in pool if o["q"] not in usadas]
            else:
                aptas = [o for o in pool if o["q"] not in usadas and etapa_de(etapas, o, adj) is e]
            toma = aptas[:cupo_fondo(p)]
            usadas.update(o["q"] for o in toma)
            porNivel[e["nivel"]] = len(toma)
            chosen += [(e["nivel"], e["nombre"], o) for o in toma]
        for nivel, nombre, o in chosen:
            if o["src"] in ("traducir", "revisar-idioma"):
                o["conf"] = "medium"
            sel.append(dict(
                id="w" + o["q"][1:], pintorId=p["id"], qid=o["q"], titulo=o["title"], tituloFuente=o["src"],
                level=nivel, etapa=nombre, forzada=o["q"] in forced,
                anio=o["ytxt"], anioSort=o["ysort"], anioCalidad=o["yq"], coleccion=o["coll"], tipo=o["types"],
                archivo=o["file"], archivoUrl="https://commons.wikimedia.org/wiki/File:" + o["file"].replace(" ", "_"),
                srcW=o["x"]["width"], srcH=o["x"]["height"], mime=o["x"]["mime"],
                licencia=o["x"].get("license"), autorArchivo=o["x"].get("artist"), creditoArchivo=o["x"].get("credit"),
                sitelinks=o["sl"], confianza=o["conf"], avisos=o["flags"]))
        corto = len(nivel1) < cupo_basico(p) or any(n < cupo_fondo(p) for n in porNivel.values())
        objetivo = cupo_basico(p) + cupo_fondo(p) * len(porNivel)
        total += len(chosen)
        pais[p["pais"]] = pais.get(p["pais"], 0) + len(chosen)
        mark = "  <-- corto" if corto else ""
        log(f"{p['id']:18} {cat[:5]:5} {len(cand['items']):5} {len(ok):5} {len(chosen):4}/{objetivo:<3} n1={len(nivel1)} "
            + " ".join(f"L{k}:{v}" for k, v in sorted(porNivel.items())) + "  | "
            + ", ".join(f"{k}:{v}" for k, v in sorted(why.items(), key=lambda kv: -kv[1])) + mark)
    # Con pintores sueltos, el resto de la selección anterior se conserva (y su fama, que decide quién va al camino).
    previa = [s for s in load(os.path.join(CAT, "seleccion.json"), []) if s["pintorId"] not in solo] if solo else []
    # fama 1-3 por cuantiles de sitelinks
    sls = sorted(s["sitelinks"] for s in sel + previa)
    if sls:
        t1, t2 = sls[int(len(sls) * 0.5)], sls[int(len(sls) * 0.85)]
        for s in sel:
            s["fama"] = 3 if s["sitelinks"] >= t2 else 2 if s["sitelinks"] >= t1 else 1
    if solo:
        orden = {p["id"]: i for i, p in enumerate(painters)}
        sel = sorted(previa + sel, key=lambda s: orden[s["pintorId"]])
    save(os.path.join(CAT, "seleccion.json"), sel)
    log("TOTAL", total, "obras de", len({s['pintorId'] for s in sel}), "pintores")
    log("por país:", ", ".join(f"{k} {v}" for k, v in sorted(pais.items(), key=lambda kv: -kv[1])))
    log("títulos por fuente:", {k: sum(1 for s in sel if s["tituloFuente"] == k) for k in {s["tituloFuente"] for s in sel}})


if __name__ == "__main__":
    main()
