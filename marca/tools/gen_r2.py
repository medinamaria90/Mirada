# Ronda 2: genera las mesas (.dc.html), las vistas previas y el canvas.json en marca/project-r2/.
# Rutas configurables por variables de entorno (ninguna absoluta en el código):
#   MIRADA_MARCA        carpeta marca/ (por defecto, la que contiene tools/)
#   MIRADA_PLAYWRIGHT   carpeta del paquete playwright (por defecto, el require normal de Node)
#   MIRADA_CHROME       ejecutable de Chrome (por defecto, el Chromium de Playwright)
# Uso: python marca/tools/gen_r2.py            (mide alturas con Chrome, sin ventana)
#      python marca/tools/gen_r2.py --sin-medir (usa las alturas guardadas en alturas-r2.json)
import json, os, subprocess, sys, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from r2_theme import LETRAS, NEUTRA_CSS, RECOMENDADA, ACCENTS
from r2_boards import portada, logo_board, letra_board, color_board, preguntas
from r2_screens import PANTALLAS, camino_entero

ROOT = os.environ.get('MIRADA_MARCA') or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJ = os.path.join(ROOT, 'project-r2')
PREV = os.path.join(ROOT, 'preview-r2')
ALTURAS = os.path.join(ROOT, 'tools', 'alturas-r2.json')
GAP_X, GAP_Y, NOTA = 80, 120, 260


def helmet(css_list):
    fams = '&amp;'.join(dict.fromkeys(css_list))
    return (f'<helmet>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?{fams}&amp;display=swap">\n'
            '<style>\nbody{margin:0}\n*{box-sizing:border-box}\nbutton{cursor:pointer}\nh1,h2,h3,p{margin:0}\n</style>\n</helmet>')


def dc(title, css_list, body, w, h):
    props = json.dumps({'$preview': {'width': w, 'height': h}})
    return f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
{helmet(css_list)}
{body.strip()}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{props}'>
class Component extends DCLogic {{
renderVals() {{
return {{}};
}}
}}
</script>
</body>
</html>
'''


def preview(title, css_list, body):
    fams = '&'.join(dict.fromkeys(css_list))
    return (f'<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=390">'
            f'<title>{title}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?{fams}&display=swap">'
            f'<style>body{{margin:0}}*{{box-sizing:border-box}}h1,h2,h3,p{{margin:0}}</style></head>'
            f'<body>{body.replace(chr(34) + "img/", chr(34) + "../project-r2/img/")}</body></html>')


def boards():
    """(archivo, título, fila, fuentes, html, alto fijo o None)."""
    L1 = LETRAS[RECOMENDADA['letra']]['css']
    out = [('Main.dc.html', 'Portada · ronda 2', 0, [NEUTRA_CSS], portada(), None)]
    for n in (1, 2, 3):
        out.append((f'Logo-{n}.dc.html', f'Logo {n}', 1, [NEUTRA_CSS, L1], logo_board(n), None))
    for k in (1, 2, 3):
        out.append((f'Letra-{k}.dc.html', f'Letra {k}', 2, [NEUTRA_CSS, LETRAS[k]['css']], letra_board(k), None))
    for key in ACCENTS:
        out.append((f'Color-{key}.dc.html', f'Color · {ACCENTS[key]["nombre"]}', 3, [NEUTRA_CSS, L1], color_board(key), None))
    for slug, label, fn in PANTALLAS:
        out.append((f'P-{slug}.dc.html', label, 4, [L1], fn(), 844))
    html, h = camino_entero()
    out.append(('Camino-entero.dc.html', 'Camino entero, con rama', 5, [L1], html, h))
    out.append(('Preguntas.dc.html', 'Cinco preguntas', 5, [NEUTRA_CSS, L1], preguntas(), None))
    return out


FILAS = {1: 'Logo: tres variantes del vano con punto', 2: 'Letra: tres parejas finas', 3: 'Color protagonista: tres opciones',
         4: 'Pantallas con la mezcla elegida', 5: 'Camino entero y preguntas'}


def medir(files):
    env = dict(os.environ)
    res = subprocess.run(['node', os.path.join(ROOT, 'tools', 'measure.js')] + files, capture_output=True, text=True, env=env)
    if res.returncode:
        print(res.stderr)
        sys.exit(1)
    return json.loads(res.stdout)


def main():
    sin_medir = '--sin-medir' in sys.argv
    bs = boards()
    os.makedirs(PREV, exist_ok=True)
    os.makedirs(PROJ, exist_ok=True)
    prev_files = []
    for f, t, fila, css, body, fijo in bs:
        p = os.path.join(PREV, f[:-8] + '.html')
        open(p, 'w', encoding='utf-8').write(preview(t, css, body))
        prev_files.append(p)
    if sin_medir and os.path.exists(ALTURAS):
        heights = json.load(open(ALTURAS, encoding='utf-8'))
    else:
        medidas = medir(prev_files)
        heights = {os.path.basename(k)[:-5]: v for k, v in medidas.items()}
        json.dump(heights, open(ALTURAS, 'w', encoding='utf-8'), indent=1)
    # alturas definitivas
    altos = {}
    for f, t, fila, css, body, fijo in bs:
        medido = heights.get(f[:-8], fijo or 844)
        if fijo:
            if medido > fijo + 2:
                print('DESBORDA', f, medido, '>', fijo)
            altos[f] = fijo
        else:
            altos[f] = medido
    # colocación por filas
    filas = {}
    for f, t, fila, *_ in bs:
        filas.setdefault(fila, []).append(f)
    boards_idx, order, notes = {}, [], {}
    y = 0
    for fila in sorted(filas):
        if fila > 0:
            y += NOTA
            notes[f't{fila}'] = {'x': 0, 'y': y - NOTA + 20, 'text': FILAS[fila], 'kind': 'title1',
                                 'maxW': len(filas[fila]) * 390 + (len(filas[fila]) - 1) * GAP_X, 'page': 'p0'}
        x = 0
        for f in filas[fila]:
            boards_idx[f] = {'x': x, 'y': y, 'w': 390, 'h': altos[f], 'title': dict((b[0], b[1]) for b in bs)[f], 'page': 'p0'}
            order.append(f)
            x += 390 + GAP_X
        y += max(altos[f] for f in filas[fila]) + GAP_Y
    for f, t, fila, css, body, fijo in bs:
        h = altos[f]
        b2 = body if fijo else body.replace('<div data-root style="width: 390px;', f'<div data-root style="width: 390px; height: {h}px;', 1)
        open(os.path.join(PROJ, f), 'w', encoding='utf-8').write(dc(t, css, b2, 390, h))
        print(f, h)
    now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    canvas = {'v': 3, 'createdOnFiles': {'v': 1, 'at': now}, 'title': 'Mirada · identidad, ronda 2',
              'launch': {'view': 'canvas', 'page': 'p0'}, 'pages': [{'id': 'p0', 'name': 'Ronda 2'}],
              'boards': boards_idx, 'order': order, 'notes': notes, 'designSystems': []}
    json.dump(canvas, open(os.path.join(PROJ, 'canvas.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('mesas:', len(order), 'alto total:', y)


if __name__ == '__main__':
    main()
