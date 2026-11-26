"""Comprueba contenido/curiosidades.json y contenido/explicaciones.json:
ids válidos, longitudes, número de frases o párrafos y palabras vetadas."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CURIOSIDADES = ROOT / "contenido" / "curiosidades.json"
EXPLICACIONES = ROOT / "contenido" / "explicaciones.json"
CATALOGO = ROOT / "app" / "data" / "catalog.json"
MAX_CARACTERES = 220
MAX_FRASES = 2
MIN_PARRAFOS = 3
MAX_PARRAFOS = 5
MAX_CARACTERES_PARRAFO = 350
VETADAS = re.compile(r"\b(ayer|mañanas?)\b", re.IGNORECASE)


def frases(texto):
    return len([f for f in re.split(r"(?<=[.!?»])\s+(?=[A-ZÁÉÍÓÚÑ¿¡«])", texto.strip()) if f])


def revisar_explicaciones(ids, curiosidades):
    if not EXPLICACIONES.exists():
        return [], 0
    datos = json.loads(EXPLICACIONES.read_text(encoding="utf-8"))
    errores = []
    for clave, parrafos in datos.items():
        if clave not in ids:
            errores.append(f"explicación {clave}: id desconocido")
        if not isinstance(parrafos, list) or not MIN_PARRAFOS <= len(parrafos) <= MAX_PARRAFOS:
            errores.append(f"explicación {clave}: debe tener de {MIN_PARRAFOS} a {MAX_PARRAFOS} párrafos")
            continue
        for numero, parrafo in enumerate(parrafos, 1):
            if not isinstance(parrafo, str) or not parrafo.strip():
                errores.append(f"explicación {clave}, párrafo {numero}: vacío")
                continue
            if len(parrafo) > MAX_CARACTERES_PARRAFO:
                errores.append(f"explicación {clave}, párrafo {numero}: {len(parrafo)} caracteres (máx. {MAX_CARACTERES_PARRAFO})")
            if VETADAS.search(parrafo):
                errores.append(f"explicación {clave}, párrafo {numero}: contiene «ayer» o «mañana»")
            if parrafo.strip() == curiosidades.get(clave, "").strip():
                errores.append(f"explicación {clave}, párrafo {numero}: repite la curiosidad")
    return errores, len(datos)


def main():
    datos = json.loads(CURIOSIDADES.read_text(encoding="utf-8"))
    ids = {obra["id"] for obra in json.loads(CATALOGO.read_text(encoding="utf-8"))["artworks"]}
    errores = []
    for clave, texto in datos.items():
        if clave not in ids:
            errores.append(f"{clave}: id desconocido")
        if not isinstance(texto, str) or not texto.strip():
            errores.append(f"{clave}: texto vacío")
            continue
        if len(texto) > MAX_CARACTERES:
            errores.append(f"{clave}: {len(texto)} caracteres (máx. {MAX_CARACTERES})")
        if frases(texto) > MAX_FRASES:
            errores.append(f"{clave}: más de {MAX_FRASES} frases")
        if VETADAS.search(texto):
            errores.append(f"{clave}: contiene «ayer» o «mañana»")
    errores_explicaciones, total_explicaciones = revisar_explicaciones(ids, datos)
    errores += errores_explicaciones
    for error in errores:
        print(error)
    print(f"{len(datos)} curiosidades, {total_explicaciones} explicaciones, {len(errores)} errores")
    return 1 if errores else 0


if __name__ == "__main__":
    sys.exit(main())
