# Genera las mesas (.dc.html) y sus vistas previas locales; mide alturas con Chrome.
import json, os, re, subprocess, sys, datetime
sys.path.insert(0, os.path.dirname(__file__))
from common import R, FONTS, NEUTRAL, col, symbol, lockup, app_icon, ico, cr, fmt
from brand import brand_board, type_board
from screens import SCREENS

ROOT = '/home/claude/mirada/marca'
PROJ = ROOT + '/project'
PREV = ROOT + '/preview'
N = NEUTRAL
INK = '#161616'
BG = '#F6F5F2'


def portada():
    rows = ''.join(f'''
<a href="#" style="text-decoration: none; display: flex; align-items: center; gap: 14px; padding: 14px; background: #FFFFFF; border-radius: 18px; box-shadow: 0 1px 2px rgba(0,0,0,.06)">
{app_icon(k, False, 56)}
<div style="display: flex; flex-direction: column; gap: 2px; min-width: 0">
<span style="font-size: 17px; font-weight: 700; color: {INK}">{k} · {R[k]['name']}</span>
<span style="font-size: 14px; line-height: 1.35; color: #45433F">{R[k]['concept']}</span></div></a>''' for k in 'ABC')
    return f'''
<div data-root style="width: 390px; height: 844px; box-sizing: border-box; overflow: hidden; background: {BG}; font-family: {N}; color: {INK}; display: flex; flex-direction: column">
<img src="img/a62.jpg" alt="Las meninas, de Velázquez (detalle)" style="display: block; width: 100%; height: 190px; object-fit: cover; object-position: 50% 30%">
<div style="padding: 22px 20px 0; display: flex; flex-direction: column; gap: 10px">
<span style="font-size: 14px; font-weight: 600; color: #45433F">Identidad · prepropuesta 1</span>
<h1 style="margin: 0; font-size: 40px; font-weight: 700; letter-spacing: -0.03em; line-height: 1">Mirada</h1>
<p style="margin: 0; font-size: 17px; line-height: 1.45">Aprender a mirar pintura jugando, unos minutos al día.</p>
</div>
<div style="padding: 18px 20px 0; display: flex; flex-direction: column; gap: 10px">{rows}</div>
<div style="padding: 18px 20px 0; display: flex; flex-direction: column; gap: 6px">
<span style="font-size: 15px; font-weight: 700">En esta ronda decide</span>
<p style="margin: 0; font-size: 15px; line-height: 1.45; color: #2E2C29">Qué ruta te dice más y qué te gustaría mezclar. Cada ruta tiene su página: marca, letra y voz, y tres pantallas. Al final, comparativa y cinco preguntas rápidas.</p>
</div>
</div>'''


def mini(k, html):
    s = 108 / 390
    return (f'<div style="width: 108px; height: 234px; overflow: hidden; border-radius: 14px; box-shadow: 0 0 0 1px rgba(0,0,0,.1), 0 8px 18px -10px rgba(0,0,0,.35); flex: none">'
            f'<div style="width: 390px; height: 844px; transform: scale({s:.4f}); transform-origin: 0 0">{html}</div></div>')


def comparativa():
    logos = ''.join(f'<div style="display: flex; flex-direction: column; align-items: center; gap: 10px">{app_icon(k, False, 56)}'
                    f'<span style="font-size: 13px; font-weight: 600; text-align: center">{R[k]["name"]}</span></div>' for k in 'ABC')
    pals = ''.join('<div style="display: flex; flex-direction: column; border-radius: 12px; overflow: hidden; box-shadow: 0 0 0 1px rgba(0,0,0,.08)">'
                   + ''.join(f'<div style="height: {34 if i in (0, 3) else 18}px; background: {R[k]["light"][i][1]}"></div>' for i in (0, 2, 3, 4, 5, 6))
                   + '</div>' for k in 'ABC')
    minis = ''.join(mini(k, SCREENS[k][1][2]()) for k in 'ABC')
    info = {
        'A': ('Quien quiere calma y oficio: sensación de museo bueno, cero estridencias.', 'Puede seguir pareciendo sobria; el granate pide cuidado para no volverse solemne.'),
        'B': ('Quien viene de Duolingo o Tinder: engancha, apetece tocar y celebra cada acierto.', 'Si se exagera, infantil o "indie". El coral debe dosificarse para no gritar.'),
        'C': ('Quien busca algo "caro" y actual, de revista de arte. La más elegante en capturas.', 'Fría para un juego: premios y rachas lucen menos. Depende mucho de buenas fotos.'),
    }
    rows = ''.join(f'''
<div style="display: grid; grid-template-columns: 40px minmax(0, 1fr); gap: 12px; padding: 14px 0; border-top: 1px solid #E2E0DB">
{app_icon(k, False, 40)}
<div style="display: flex; flex-direction: column; gap: 6px">
<p style="margin: 0; font-size: 15px; line-height: 1.4"><strong>Mejor para</strong> {info[k][0]}</p>
<p style="margin: 0; font-size: 15px; line-height: 1.4; color: #3A3835"><strong style="color: {INK}">Riesgo</strong> {info[k][1]}</p></div></div>''' for k in 'ABC')
    mixes = [
        ('B + fichas de C', 'Juego en el camino y las preguntas; letra editorial en las fichas, para los momentos de mirar.'),
        ('Símbolo de A + color de B', 'El punto de fuga, más clásico, con la energía del coral.'),
        ('A con la letra de C', 'Museo vivo, pero con titulares de revista: más actual sin perder calma.'),
    ]
    mix_html = ''.join(f'<div style="display: flex; flex-direction: column; gap: 3px; padding: 12px 0; border-top: 1px solid #E2E0DB"><span style="font-size: 15px; font-weight: 700">{t}</span>'
                       f'<span style="font-size: 15px; line-height: 1.4; color: #3A3835">{d}</span></div>' for t, d in mixes)
    bacc = col('B', 3)
    return f'''
<div data-root style="width: 390px; box-sizing: border-box; padding: 28px 20px 32px; background: {BG}; font-family: {N}; color: {INK}; display: flex; flex-direction: column; gap: 26px">
<div style="display: flex; flex-direction: column; gap: 6px">
<span style="font-size: 14px; font-weight: 600; color: #45433F">Comparar y decidir</span>
<h1 style="margin: 0; font-size: 34px; font-weight: 700; letter-spacing: -0.03em; line-height: 1.05">Las tres, juntas</h1>
</div>
<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px">{logos}</div>
<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px">{pals}</div>
<div style="display: flex; flex-direction: column; gap: 10px">
<span style="font-size: 15px; font-weight: 700">La misma pregunta</span>
<div style="display: flex; justify-content: space-between">{minis}</div>
</div>
<div>{rows}</div>
<section style="background: #FFFFFF; border-radius: 20px; padding: 20px; display: flex; flex-direction: column; gap: 10px; box-shadow: inset 0 0 0 2px {bacc}">
<span style="font-size: 14px; font-weight: 700; color: #A3412B">Mi recomendación</span>
<h2 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1">B, con las fichas de C</h2>
<p style="margin: 0; font-size: 15px; line-height: 1.5">El problema de hoy es que Mirada se siente sobria y antigua. B es la única que da ganas de jugar, que es lo que hace volver cada día. Para que no se vuelva infantil, el coral se reserva para lo que se toca y las fichas se visten de revista, con la letra de C: el juego invita, la ficha enamora.</p>
</section>
<div style="display: flex; flex-direction: column">
<span style="font-size: 15px; font-weight: 700; padding-bottom: 6px">Mezclas posibles</span>
{mix_html}
</div>
</div>'''


def preguntas():
    def chips(items):
        return ''.join(f'<span style="display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 12px; border-radius: 99px; background: #FFFFFF; box-shadow: inset 0 0 0 1px #DAD7D1; font-size: 14px; font-weight: 600">{t}</span>' for t in items)
    sw = lambda c: f'<span style="width: 14px; height: 14px; border-radius: 99px; background: {c}"></span>'
    qs = [
        ('¿Qué ruta te mueve más?', chips(['A · Museo vivo', 'B · Juego de mirar', 'C · Editorial', 'Ninguna aún'])),
        ('¿Cuánto juego quieres? Del 1 (museo) al 5 (juego).', chips(['1', '2', '3', '4', '5'])),
        ('¿Qué color protagonista?', chips([sw(col('A', 3)) + 'Granate', sw(col('B', 3)) + 'Coral', sw(col('C', 3)) + 'Ultramar', 'Otro (dímelo)'])),
        ('¿Qué símbolo?', chips([symbol('A', False, 22) + 'Arco', symbol('B', False, 22) + 'Cartas', symbol('C', False, 22) + 'Encuadre'])),
        ('¿Con qué letra los titulares?', chips(['Clásica (Fraunces)', 'Redonda (Rubik)', 'Revista (Instrument Serif)'])),
    ]
    items = ''.join(f'''
<div style="display: flex; flex-direction: column; gap: 10px; padding: 16px 0; border-top: 1px solid #E2E0DB">
<span style="font-size: 17px; font-weight: 700; line-height: 1.3"><span style="display: inline-flex; width: 26px; height: 26px; border-radius: 99px; background: {INK}; color: #FFFFFF; align-items: center; justify-content: center; font-size: 13px; margin-right: 8px; vertical-align: 2px">{i + 1}</span>{q}</span>
<div style="display: flex; flex-wrap: wrap; gap: 8px">{c}</div></div>''' for i, (q, c) in enumerate(qs))
    return f'''
<div data-root style="width: 390px; box-sizing: border-box; padding: 28px 20px 32px; background: {BG}; font-family: {N}; color: {INK}; display: flex; flex-direction: column; gap: 18px">
<div style="display: flex; flex-direction: column; gap: 6px">
<span style="font-size: 14px; font-weight: 600; color: #45433F">Para la ronda 2</span>
<h1 style="margin: 0; font-size: 34px; font-weight: 700; letter-spacing: -0.03em; line-height: 1.05">Cinco decisiones</h1>
<p style="margin: 0; font-size: 15px; line-height: 1.45">Contesta en una línea, por ejemplo: <strong>B · 4 · Coral · Cartas · Revista</strong>. Y comenta encima de lo que quieras cambiar.</p>
</div>
<div>{items}</div>
</div>'''


# ---------------- salida ----------------

def helmet(keys):
    fams = '&amp;'.join(FONTS[k] for k in keys)
    return (f'<helmet>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?{fams}&amp;display=swap">\n'
            '<style>\nbody{margin:0}\n*{box-sizing:border-box}\nbutton{cursor:pointer}\nh1,h2,h3,p{margin:0}\n</style>\n</helmet>')


def dc(title, keys, body, w, h):
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
{helmet(keys)}
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


def preview(title, body):
    return (f'<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=390">'
            f'<title>{title}</title><style>body{{margin:0}}*{{box-sizing:border-box}}h1,h2,h3,p{{margin:0}}</style></head>'
            f'<body>{body}</body></html>')


def boards():
    out = [('Main.dc.html', 'Portada', 'p0', 'N', portada(), True)]
    for k in 'ABC':
        out.append((f'{k}-marca.dc.html', f'{k} · Logotipo y color', 'p' + k, k + 'N', brand_board(k), False))
        out.append((f'{k}-letra-voz.dc.html', f'{k} · Letra y voz', 'p' + k, k + 'N', type_board(k), False))
        for slug, label, fn in SCREENS[k]:
            out.append((f'{k}-{slug}.dc.html', f'{k} · {label}', 'p' + k, k, fn(), True))
    out.append(('Comparativa.dc.html', 'Comparativa', 'pD', 'ABCN', comparativa(), False))
    out.append(('Preguntas.dc.html', 'Cinco preguntas', 'pD', 'ABCN', preguntas(), False))
    return out


def main():
    bs = boards()
    os.makedirs(PREV, exist_ok=True)
    for f, t, p, keys, body, fixed in bs:
        open(f'{PREV}/{f[:-8]}.html', 'w').write(preview(t, body))
    # medir
    files = [f'{PREV}/{f[:-8]}.html' for f, *_ in bs]
    res = subprocess.run(['node', ROOT + '/tools/measure.js'] + files, capture_output=True, text=True)
    if res.returncode:
        print(res.stderr)
        sys.exit(1)
    heights = json.loads(res.stdout)
    boards_idx, order = {}, []
    xs = {}
    for f, t, p, keys, body, fixed in bs:
        h = 844 if fixed else heights[f'{PREV}/{f[:-8]}.html']
        if fixed and heights[f'{PREV}/{f[:-8]}.html'] > 846:
            print('DESBORDA', f, heights[f'{PREV}/{f[:-8]}.html'])
        b2 = body.replace('<div data-root style="width: 390px;', f'<div data-root style="width: 390px; height: {h}px;', 1) if not fixed else body
        open(f'{PROJ}/{f}', 'w').write(dc(t, keys.replace('N', 'N') if True else keys, b2, 390, h))
        x = xs.get(p, 0)
        xs[p] = x + 390 + 80
        boards_idx[f] = {'x': x, 'y': 0, 'w': 390, 'h': h, 'title': t, 'page': p}
        order.append(f)
        print(f, h)
    pages = [{'id': 'p0', 'name': 'Portada'}, {'id': 'pA', 'name': 'A · Museo vivo'}, {'id': 'pB', 'name': 'B · Juego de mirar'},
             {'id': 'pC', 'name': 'C · Editorial'}, {'id': 'pD', 'name': 'Comparar y decidir'}]
    notes = {}
    for k in 'ABC':
        notes['t' + k] = {'x': 0, 'y': -300, 'text': f'Ruta {k} · {R[k]["name"]}', 'kind': 'title1', 'maxW': 5 * 390 + 4 * 80, 'page': 'p' + k}
    notes['tD'] = {'x': 0, 'y': -300, 'text': 'Comparar y decidir', 'kind': 'title1', 'maxW': 860, 'page': 'pD'}
    now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    canvas = {'v': 3, 'createdOnFiles': {'v': 1, 'at': now}, 'title': 'Mirada · identidad (prepropuesta 1)',
              'launch': {'view': 'canvas', 'page': 'p0'}, 'pages': pages, 'boards': boards_idx, 'order': order,
              'notes': notes, 'designSystems': []}
    json.dump(canvas, open(f'{PROJ}/canvas.json', 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
