"""Comprueba los carteles del mapa: contenido/ramas.json (uno por rama) y contenido/tramos.json
(uno por tramo con nombre del camino común y por grupo de época dentro de las ramas de escuela).
Revisa claves válidas y completas, longitudes, palabras vetadas, fuente y que cada tarjeta lleve una obra
distinta, «learn» de un pintor del grupo (sin cuadro, la presentación sale en blanco)."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAMAS = ROOT / "contenido" / "ramas.json"
TRAMOS = ROOT / "contenido" / "tramos.json"
CATALOGO = ROOT / "app" / "data" / "catalog.json"
CAMINO = ROOT / "tools" / "camino.json"
MAX_LEAD = 140
MAX_TARJETA = 180
KICKERS_RAMA = ["Qué los une", "Cuándo y dónde", "Fíjate en", "Curiosidad"]
MIN_TARJETAS_TRAMO = 2
MAX_TARJETAS_TRAMO = 3
VETADAS = re.compile(r"\b(ayer|mañanas?)\b", re.IGNORECASE)
SEPARADOR = "/"


def grupos_esperados(catalogo, camino):
    """Pintores de cada rama y de cada tramo esperado (nombre de sección o «rama/época»)."""
    ramas = {rama["id"]: set(rama["artists"]) for rama in catalogo["branches"]}
    tramos = {}
    for grupos in camino.values():
        for grupo in grupos:
            if grupo["section"]:
                tramos[grupo["section"]] = set(grupo["artists"])
    for rama in catalogo["branches"]:
        if len(rama["tramos"]) < 2:
            continue  # rama de un solo tramo: su cartel de rama ya lo cuenta
        for tramo in rama["tramos"]:
            tramos[f"{rama['id']}{SEPARADOR}{tramo['opensAt']}"] = set(tramo["artists"])
    return ramas, tramos


def revisar_texto(donde, texto, maximo, errores):
    if not isinstance(texto, str) or not texto.strip():
        errores.append(f"{donde}: vacío")
        return
    if len(texto) > maximo:
        errores.append(f"{donde}: {len(texto)} caracteres (máx. {maximo})")
    if VETADAS.search(texto):
        errores.append(f"{donde}: contiene «ayer» o «mañana»")


def revisar_cartel(clave, cartel, pintores, obras, errores, es_rama):
    revisar_texto(f"{clave} · title", cartel.get("title"), MAX_LEAD, errores)
    revisar_texto(f"{clave} · lead", cartel.get("lead"), MAX_LEAD, errores)
    if not str(cartel.get("source", "")).startswith("https://"):
        errores.append(f"{clave}: falta «source» con https")
    tarjetas = cartel.get("cards") or []
    if es_rama:
        if cartel.get("kicker") != "Rama":
            errores.append(f"{clave}: kicker debe ser «Rama»")
        if [t.get("kicker") for t in tarjetas] != KICKERS_RAMA:
            errores.append(f"{clave}: tarjetas deben ser {KICKERS_RAMA}")
        if not tarjetas or not any(t.get("artwork") for t in tarjetas if t.get("kicker") == "Fíjate en"):
            errores.append(f"{clave}: «Fíjate en» sin obra")
    elif not MIN_TARJETAS_TRAMO <= len(tarjetas) <= MAX_TARJETAS_TRAMO:
        errores.append(f"{clave}: {len(tarjetas)} tarjetas (de {MIN_TARJETAS_TRAMO} a {MAX_TARJETAS_TRAMO})")
    vistas = set()
    for numero, tarjeta in enumerate(tarjetas, 1):
        donde = f"{clave} · tarjeta {numero}"
        revisar_texto(f"{donde} · kicker", tarjeta.get("kicker"), MAX_LEAD, errores)
        revisar_texto(donde, tarjeta.get("text"), MAX_TARJETA, errores)
        obra = tarjeta.get("artwork")
        if not obra:
            errores.append(f"{donde}: sin obra (cada tarjeta enseña un cuadro)")
            continue
        if obra in vistas:
            errores.append(f"{donde}: repite la obra {obra}")
        vistas.add(obra)
        datos = obras.get(obra)
        if not datos:
            errores.append(f"{donde}: obra {obra} desconocida")
        elif datos["role"] != "learn":
            errores.append(f"{donde}: obra {obra} no es «learn»")
        elif datos["artistId"] not in pintores:
            errores.append(f"{donde}: obra {obra} es de {datos['artistId']}, fuera del grupo")


def revisar(archivo, esperados, obras, errores, es_rama):
    datos = json.loads(archivo.read_text(encoding="utf-8"))
    for clave in esperados.keys() - datos.keys():
        errores.append(f"{archivo.name}: falta {clave}")
    for clave, cartel in datos.items():
        if clave not in esperados:
            errores.append(f"{archivo.name}: {clave} no es un grupo del mapa")
            continue
        revisar_cartel(clave, cartel, esperados[clave], obras, errores, es_rama)
    return len(datos)


def main():
    catalogo = json.loads(CATALOGO.read_text(encoding="utf-8"))
    camino = json.loads(CAMINO.read_text(encoding="utf-8"))
    obras = {obra["id"]: obra for obra in catalogo["artworks"]}
    ramas, tramos = grupos_esperados(catalogo, camino)
    errores = []
    total_ramas = revisar(RAMAS, ramas, obras, errores, True)
    total_tramos = revisar(TRAMOS, tramos, obras, errores, False)
    for error in errores:
        print(error)
    print(f"{total_ramas} ramas, {total_tramos} tramos, {len(errores)} errores")
    return 1 if errores else 0


if __name__ == "__main__":
    sys.exit(main())
