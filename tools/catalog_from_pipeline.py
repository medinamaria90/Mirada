"""Genera app/data/catalog.json y catalog-text.json desde el catálogo grande del proceso.

Uso: python3 -I tools/catalog_from_pipeline.py [dir_app]    (por defecto, app/)

Entradas: catalogo/obras.json + catalogo/pintores.json (proceso `pipeline/`), los textos curados de
tools/catalog_data.py (hint, traits, similarTo, look, looks, kind, tags, traitTags, focus, spoiler,
attributed; se cruzan por tools/ids_antiguos.json: `a<N>` → `w<QID>`) y tools/camino.json (tramos
del camino común, de docs/propuesta-pintores.md §4).
Salidas: data/catalog.json (contrato de docs/SPEC.md §4 y §4 ter), data/catalog-text.json y
js/state/legacy-ids.js (tabla para migrar el estado guardado). No toca las imágenes: las hojas del
atlas se pintan aparte (tools/make_atlas.py), pero sus coordenadas (`thumb`) salen de
tools/atlas_layout.py, que es función solo del catálogo.

Reglas (decisiones de María):
  · Camino común (`onPath`): grandes maestros + maestros + invitados con alguna obra de fama 3.
    Solo grandes maestros y maestros tienen etapa propia (son las paradas del camino); los invitados
    del camino salen intercalados (como pregunta) y los demás invitados, solo en ramas «Descubre…».
  · Ramas: por época («Descubre …»), por escuela y las del proceso (Gótico, Estampa japonesa);
    cronológicas por dentro, con el tramo (época) en que se abre cada pintor.
  · `role` «learn»: 4 obras de nivel 1 en grandes maestros y maestros (las con firma o atribución
    dudosa primero: no se pueden preguntar), 2 en los invitados y pintores de ramas (el resto, «new»: los invitados del camino salen en el repaso
    con sus obras «new», que nunca se han enseñado).
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import catalog_data as D  # noqa: E402
from atlas_layout import layout  # noqa: E402

LEARN_STAGE = 4        # obras «Conoce a» de un pintor con etapa
LEARN_BRANCH = 2       # idem en pintores de ramas (≥ 1 «new» con 3 obras)
STAGE_CATEGORIES = ("gran-maestro", "maestro")
PATH_FAME = 3          # un invitado entra en el camino común con alguna obra de esta fama
BRANCH_ORDER = {"gotico": 0.5, "ukiyo-e": 7.5}  # orden cronológico de las ramas-movimiento
BRANCH_MOVEMENTS = {
    "gotico": dict(name="Gótico", period="s. XIII–XIV", era="gothic",
                   blurb="Oro, devoción y los primeros pasos hacia el volumen.", accent="#7a6a45",
                   traits=["fondos dorados", "figuras solemnes", "primeros intentos de volumen"]),
    "ukiyo-e": dict(name="Estampa japonesa (ukiyo-e)", period="s. XVII–XIX", era="impressionism",
                    blurb="Línea limpia, color plano y el mundo flotante del Japón antiguo.", accent="#5f8a94",
                    traits=["línea limpia y color plano", "composiciones atrevidas", "escenas de la vida y el paisaje"]),
}
DISCOVER_NAMES = {
    "renacimiento": "Descubre el Renacimiento",
    "manierismo-y-norte": "Descubre el Manierismo y el Norte",
    "barroco": "Descubre el Barroco",
    "rococo-neoclasicismo": "Descubre el Rococó y el Neoclasicismo",
    "romanticismo": "Descubre el Romanticismo",
    "realismo": "Descubre el Realismo",
    "impresionismo": "Descubre el Impresionismo",
    "postimpresionismo": "Descubre el Postimpresionismo",
    "simbolismo-modernismo": "Descubre el Simbolismo y las vanguardias",
}
# Rasgos de color sin etiquetas en los datos curados (el motor las necesita para no dar pistas de color
# que comparte el distractor): Cézanne es ahora maestro del camino y su rasgo «ocres, verdes y azules» las lleva.
TRAIT_TAG_FIXES = {"cezanne": {3: ["verde", "azul"]}}
SCHOOLS = [  # (id, nombre, criterio)
    ("escuela-rusa", "Escuela rusa", lambda a: a["country"] == "Rusia"),
    ("pintura-britanica", "Pintura británica", lambda a: a["country"] == "Reino Unido" or a["id"] == "sargent"),
    ("maestros-espanoles", "Maestros españoles", lambda a: a["country"] == "España"),
]


def load(name):
    with open(os.path.join(ROOT, "catalogo", name), encoding="utf-8") as f:
        return json.load(f)


def spoilers_by_new_id(ids):
    """Datos curados de obras antiguas, indexados por el id nuevo."""
    out = {}
    for old, new in ids.items():
        out[new] = old
    return out


def century(year):
    """«s. XVIII» para una obra sin fecha en Wikidata (solo se conoce el siglo, por el pintor)."""
    n = (year - 1) // 100 + 1
    roman = ""
    for value, sym in ((10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")):
        while n >= value:
            roman += sym
            n -= value
    return f"s. {roman}"


def pick_learn(works, n):
    """Las `n` obras «learn» de una lista de nivel 1: primero las que no se pueden preguntar."""
    unaskable = [w for w in works if w.get("spoiler") or w.get("attributed")]
    rest = sorted((w for w in works if w not in unaskable), key=lambda w: (-w["fame"], -w.get("sitelinks", 0), w["id"]))
    return {w["id"] for w in (unaskable + rest)[:max(n, len(unaskable))]}


def familias_del_catalogo(movements, artists):
    """Familias visuales (catalogo/familias.json): marca cada movimiento y pintor con su familia."""
    data = load("familias.json")
    ids = {f["id"] for f in data["familias"]}
    for m in movements:
        m["family"] = data["porMovimiento"][m["id"]]
        m.update(data["movimientos"][m["id"]])
    for a in artists:
        f = data["porPintor"].get(a["id"], data["porMovimiento"][a["movementId"]])
        if isinstance(f, dict):
            a["family"], a["familyFrom"] = f["antes"], dict(year=f["desde"], family=f["despues"])
        else:
            a["family"] = f
    assert all(m["family"] in ids for m in movements) and all(a["family"] in ids for a in artists)
    return dict(cutoff=data["corteAntiguo"], list=[{k: v for k, v in f.items()} for f in data["familias"]])


def contenido_opcional(name):
    """contenido/<name> si existe (lo escriben otros a su ritmo); si no, vacío."""
    path = os.path.join(ROOT, "contenido", name)
    if not os.path.exists(path):
        return {}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


CURIO_MAX = 240


def texto_con_fuente(v):
    """«texto» o {text, source} → {text, source} (o None si no vale)."""
    text, source = (v, "") if isinstance(v, str) else (v.get("text"), v.get("source", "")) if isinstance(v, dict) else (None, "")
    if not isinstance(text, str) or not text.strip() or len(text) > CURIO_MAX:
        return None
    return dict(text=text.strip(), source=source if isinstance(source, str) else "")


def parrafos_con_fuente(v):
    """[párrafos] o {text: [párrafos], source} → {text: [...], source} (o None si no vale)."""
    paras, source = (v, "") if isinstance(v, list) else (v.get("text"), v.get("source", "")) if isinstance(v, dict) else (None, "")
    paras = [p.strip() for p in paras or [] if isinstance(p, str) and p.strip()] if isinstance(paras, list) else []
    return dict(text=paras, source=source if isinstance(source, str) else "") if paras else None


def titulos_cortos(pid):
    """{nivel: título corto} de las etapas con historia: el `stage` de contenido/historias/<pid>.json (único origen; sin
    historia no hay título ni tramo en el aro de niveles)."""
    story = contenido_opcional(os.path.join("historias", f"{pid}.json"))
    return {lv["level"]: lv["stage"] for lv in story.get("levels", []) if lv.get("level", 0) >= 2 and lv.get("stage")}


def main(app):
    obras = load("obras.json")
    pintores = {p["id"]: p for p in load("pintores.json")}
    with open(os.path.join(HERE, "ids_antiguos.json"), encoding="utf-8") as f:
        ids = json.load(f)
    with open(os.path.join(HERE, "camino.json"), encoding="utf-8") as f:
        camino = json.load(f)
    old_of = spoilers_by_new_id(ids)

    # --- Movimientos ---------------------------------------------------------------------------
    movements = []
    for i, n, p, o, e, b, c in D.MOVEMENTS:
        m = dict(id=i, name=n, period=p, order=o, era=e, blurb=b, accent=c)
        if i in D.MOVEMENT_TRAITS:
            m["traits"] = list(D.MOVEMENT_TRAITS[i])
        movements.append(m)
    pipeline_mov = {m["id"]: m for m in obras["movements"]}
    for mid, extra in BRANCH_MOVEMENTS.items():
        pm = pipeline_mov[mid]
        movements.append(dict(id=mid, order=BRANCH_ORDER[mid], branch=True, opensAt=pm["opensAt"], **extra))
    movements.sort(key=lambda m: m["order"])
    mov_order = {m["id"]: m["order"] for m in movements}
    mov_by_id = {m["id"]: m for m in movements}

    # --- Obras: nivel, fama, textos curados ------------------------------------------------------
    works = [dict(w) for w in obras["artworks"]]
    for w in works:
        old = old_of.get(w["id"])
        w["_old"] = old
        if old in D.SPOILERS:
            w["spoiler"] = True
        if old in getattr(D, "ATTRIBUTED", ()):
            w["attributed"] = True
    by_artist = {}
    for w in works:
        by_artist.setdefault(w["artistId"], []).append(w)

    # --- Pintores: camino común y roles --------------------------------------------------------
    on_path = {}
    for pid, p in pintores.items():
        fame3 = any(w["fame"] >= PATH_FAME for w in by_artist.get(pid, []))
        on_path[pid] = p["category"] in STAGE_CATEGORIES or (p["category"] == "invitado" and fame3)

    # Orden y tramos del camino (tools/camino.json: movimiento → [{section, artists}]).
    order = {}
    section = {}
    for mid, tramos in camino.items():
        k = 0
        for t in tramos:
            for pid in t["artists"]:
                assert pid in pintores and pintores[pid]["category"] in STAGE_CATEGORIES, pid
                k += 1
                order[pid] = k
                section[pid] = t["section"]
    stage_ids = {pid for pid, p in pintores.items() if p["category"] in STAGE_CATEGORIES}
    missing = stage_ids - set(order)
    assert not missing, f"pintores con etapa que no están en camino.json: {sorted(missing)}"
    for pid in stage_ids:
        tramos = camino[pintores[pid]["movementId"]]
        assert any(pid in t["artists"] for t in tramos), f"{pid} en otro movimiento que su tramo"

    # Invitados y ramas después de los pintores con etapa de su movimiento, por año de nacimiento.
    per_mov = {}
    for pid, p in pintores.items():
        per_mov.setdefault(p["movementId"], []).append(p)
    for mid, plist in per_mov.items():
        base = max([order[p["id"]] for p in plist if p["id"] in order] or [0])
        rest = sorted((p for p in plist if p["id"] not in order), key=lambda p: (p["born"] or 0, p["order"]))
        for k, p in enumerate(rest, 1):
            order[p["id"]] = base + k

    # Roles de las obras.
    for pid, ws in by_artist.items():
        cat = pintores[pid]["category"]
        l1 = [w for w in ws if w["level"] == 1]
        if cat in STAGE_CATEGORIES:
            learn = pick_learn(l1, LEARN_STAGE)
        else:
            learn = pick_learn(l1, LEARN_BRANCH)
        for w in ws:
            w["role"] = "learn" if w["id"] in learn else "new"

    # --- Ramas -------------------------------------------------------------------------------------
    def tramo_of(p):
        m = mov_by_id[p["movementId"]]
        return m["opensAt"] if m.get("branch") else m["id"]

    def branch(bid, name, kind, members, movement_id=None):
        members = sorted(members, key=lambda p: (p["born"] or 0, p["id"]))
        tramos = []
        for p in sorted(members, key=lambda p: (mov_order[tramo_of(p)], p["born"] or 0, p["id"])):
            t = tramo_of(p)
            if not tramos or tramos[-1]["opensAt"] != t:
                tramos.append(dict(opensAt=t, artists=[]))
            tramos[-1]["artists"].append(p["id"])
        b = dict(id=bid, name=name, kind=kind, opensAt=tramos[0]["opensAt"],
                 artists=[p["id"] for p in members], tramos=tramos)
        if movement_id:
            b["movementId"] = movement_id
        return b

    branches = []
    for mid, name in DISCOVER_NAMES.items():
        members = [p for p in pintores.values() if p["category"] == "invitado" and not on_path[p["id"]]
                   and p["movementId"] == mid]
        if members:
            branches.append(branch(f"descubre-{mid}", name, "epoca", members, mid))
    for bid, name, crit in SCHOOLS:
        branches.append(branch(bid, name, "escuela", [p for p in pintores.values() if crit(p)]))
    for mid in BRANCH_MOVEMENTS:
        members = [p for p in pintores.values() if mid in p["branches"]]
        branches.append(branch(mid, BRANCH_MOVEMENTS[mid]["name"], "rama", members, mid))
    member_of = {}
    for b in branches:
        for pid in b["artists"]:
            member_of.setdefault(pid, []).append(b["id"])

    # --- Pintores (contrato) -------------------------------------------------------------------------
    artists = []
    text_traits, text_trait_tags = {}, {}
    for pid, p in pintores.items():
        old = D.A.get(pid, {})
        cat = p["category"]
        stages = []
        shorts = titulos_cortos(pid)
        for s in p["stages"]:
            st = dict(id=s["nivel"], name=s["nombre"], **{"from": s.get("desde"), "to": s.get("hasta"), "source": s.get("fuente")})
            if s["nivel"] in shorts:
                st["short"] = shorts[s["nivel"]]
            if s.get("verificar"):
                st["verificar"] = True
            if s.get("provisional"):
                st["provisional"] = True
            stages.append(st)
        a = dict(id=pid, name=p["name"], short=p["short"], movementId=p["movementId"], born=p["born"], died=p["died"],
                 country=p["country"], order=order[pid], section=section.get(pid), category=cat,
                 guest=cat not in STAGE_CATEGORIES, onPath=on_path[pid], stages=stages, qid=p.get("qid"),
                 branches=member_of.get(pid, []), hint=old.get("hint", ""),
                 similarTo=[s for s in old.get("similarTo", []) if s in pintores])
        if not a["section"]:
            del a["section"]
        artists.append(a)
        if old.get("traits"):
            text_traits[pid] = list(old["traits"])
        if pid in D.TRAIT_TAGS:
            tags = [list(t) for t in D.TRAIT_TAGS[pid]]
            for i, extra in TRAIT_TAG_FIXES.get(pid, {}).items():
                tags[i] = extra
            text_trait_tags[pid] = [" ".join(t) for t in tags]
    artists.sort(key=lambda a: (mov_order[a["movementId"]], a["order"]))

    # --- Obras (contrato) --------------------------------------------------------------------------------
    rank = {a["id"]: i for i, a in enumerate(artists)}
    artworks, ficha = [], {}
    # «Por qué importa» de cada pintor (contenido/importancia.json, con fuente): lo primero de su ficha.
    with open(os.path.join(ROOT, "contenido", "importancia.json"), encoding="utf-8") as f:
        why = {pid: dict(text=v["text"], source=v["source"]) for pid, v in json.load(f).items() if pid in pintores}
    # Dato curioso de cada obra (contenido/curiosidades.json, ≤ 220 letras): se lee en la hoja de feedback de la ronda.
    # Explicación larga (contenido/explicaciones.json, párrafos): solo en la página de la obra, así que va en la ficha.
    curio = {wid: v for wid, v in ((k, texto_con_fuente(v)) for k, v in contenido_opcional("curiosidades.json").items()) if v}
    about = {wid: v for wid, v in ((k, parrafos_con_fuente(v)) for k, v in contenido_opcional("explicaciones.json").items()) if v}
    text = dict(version=3, look={}, looks={}, kind={}, tags={}, curio={}, traits=text_traits, traitTags=text_trait_tags, why=why,
                tagLabels=dict(D.TAG_LABELS), negableTags=list(D.NEGABLE_TAGS))
    for w in sorted(works, key=lambda w: (rank[w["artistId"]], w["level"], w["yearSort"], w["id"])):
        o = w["_old"]
        item = dict(id=w["id"], artistId=w["artistId"], title=w["title"], year=w["year"].strip() or century(w["yearSort"]),
                    yearSort=w["yearSort"],
                    img=w["img"], w=w["w"], h=w["h"], role=w["role"], fame=w["fame"], confidence=w["confidence"],
                    level=w["level"], inSpain=bool(w["inSpain"]))
        if w.get("stage"):
            item["stage"] = w["stage"]
        for k in ("spoiler", "attributed"):
            if w.get(k):
                item[k] = True
        if o in getattr(D, "FOCUS", {}):
            item["focus"] = [round(float(v), 3) for v in D.FOCUS[o]]
        if o in D.LOOK:
            text["look"][w["id"]] = D.LOOK[o]
            if o in D.LOOK2 or o in D.LOOK_SOURCE:
                looks = [dict(text=D.LOOK[o], source=D.LOOK_SOURCE.get(o, ""))]
                if o in D.LOOK2:
                    looks.append(dict(text=D.LOOK2[o][0], source=D.LOOK2[o][1]))
                text["looks"][w["id"]] = looks
        if o in D.KIND:
            text["kind"][w["id"]] = D.KIND[o]
        if w["id"] in curio:
            text["curio"][w["id"]] = curio[w["id"]]
        if o in D.TAGS:
            text["tags"][w["id"]] = " ".join(D.TAGS[o])
        # Ficha de museo (se pide aparte: pesa más que el resto del catálogo).
        src = w.get("source") or {}
        ficha[w["id"]] = {k: v for k, v in dict(
            museum=w.get("museum"), city=w.get("city"), country=w.get("country"), technique=w.get("technique") or None,
            dimensions=w.get("dimensions") or None,
            source=dict(wikidata=src.get("wikidata"), file=src.get("file"), license=src.get("license"))).items() if v}
        if w["id"] in about:
            ficha[w["id"]]["about"] = about[w["id"]]
        artworks.append(item)

    families = familias_del_catalogo(movements, artists)
    cat = dict(version=2, movements=movements, artists=artists, artworks=artworks, branches=branches)
    atlas, thumbs = layout(cat)
    cat["atlas"] = atlas
    for item in artworks:
        item["thumb"] = thumbs[item["id"]]
    core = dict(version=2, atlas=atlas, movements=movements, artists=artists, artworks=artworks, branches=branches, families=families)

    os.makedirs(f"{app}/data", exist_ok=True)
    for name, data in (("catalog.json", core), ("catalog-text.json", text), ("catalog-ficha.json", dict(version=1, ficha=ficha))):
        with open(f"{app}/data/{name}", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
            f.write("\n")
    table = ",".join(f'"{k}":"{v}"' for k, v in sorted(ids.items(), key=lambda kv: (kv[0][0], int(kv[0][1:]))))
    os.makedirs(f"{app}/js/state", exist_ok=True)
    with open(f"{app}/js/state/legacy-ids.js", "w", encoding="utf-8") as f:
        f.write("// Generado por tools/catalog_from_pipeline.py desde tools/ids_antiguos.json: no editar a mano.\n"
                "// Ids de obra del catálogo pequeño (a<N>, b<N>) → ids del catálogo grande (w<QID>).\n"
                f"export const LEGACY_IDS = {{{table}}};\n")

    path = [a for a in artists if a["onPath"] and not a["guest"]]
    cats = {}
    for a in artists:
        if a["onPath"]:
            cats[a["category"]] = cats.get(a["category"], 0) + 1
    print(f"obras={len(artworks)} pintores={len(artists)} camino={len(path)} etapas + {cats.get('invitado', 0)} invitados "
          f"(onPath por categoría: {cats}) ramas={len(branches)} hojas={len(atlas['sheets'])}")
    for b in branches:
        print(f"  {b['id']}: {len(b['artists'])} pintores, abre en {b['opensAt']}, tramos={[ (t['opensAt'], len(t['artists'])) for t in b['tramos']]}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "app"))
