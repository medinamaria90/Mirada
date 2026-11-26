"""Comprueba contenido/curiosidades.json: ids válidos, longitud y palabras vetadas."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CURIOSIDADES = ROOT / "contenido" / "curiosidades.json"
CATALOGO = ROOT / "app" / "data" / "catalog.json"
MAX_CARACTERES = 220
MAX_FRASES = 2
VETADAS = re.compile(r"\b(ayer|mañana)\b", re.IGNORECASE)


def frases(texto):
    return len([f for f in re.split(r"(?<=[.!?»])\s+(?=[A-ZÁÉÍÓÚÑ¿¡«])", texto.strip()) if f])


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
    for error in errores:
        print(error)
    print(f"{len(datos)} curiosidades, {len(errores)} errores")
    return 1 if errores else 0


if __name__ == "__main__":
    sys.exit(main())
