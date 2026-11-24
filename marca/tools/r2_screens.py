# Ronda 2: pantallas de la app (390 x 844) con la mezcla elegida:
# estética B (nodos redondos, relieve), voz A, logo A, letras finas (pesos <= 600).
from r2_theme import BASE, ACCENTS, LETRAS, RECOMENDADA
from r2_parts import logo, lockup, ico, medalla
from r2_scene import ESCENAS

W = 'width: 390px; height: 844px; box-sizing: border-box; position: relative; overflow: hidden'
L = LETRAS[RECOMENDADA['letra']]
TIT = f"font-family: {L['tit']}; font-weight: {L['tit_w']}; letter-spacing: {L['tit_ls']}"
NOM = f"font-family: {L['nom']}; font-weight: {L['nom_w']}"
UI = L['ui']


def acc(color=None):
    return ACCENTS[color or RECOMENDADA['color']]


# ---------- piezas ----------

def boton(texto, color=None, tipo='primario', h=52, extra=''):
    A = acc(color)
    if tipo == 'primario':
        st = f'background: {A["base"]}; color: {A["sobre"]}; box-shadow: 0 4px 0 {A["sombra"]}'
    elif tipo == 'ok':
        st = f'background: {BASE["ok"]}; color: #FFFFFF; box-shadow: 0 4px 0 {BASE["ok_sombra"]}'
    elif tipo == 'texto':
        st = 'background: transparent; color: ' + BASE['tinta2']
    else:
        st = f'background: {BASE["blanco"]}; color: {BASE["tinta"]}; box-shadow: 0 4px 0 {BASE["linea"]}, inset 0 0 0 1.5px {BASE["linea"]}'
    return (f'<button type="button" style="height: {h}px; border: 0; border-radius: 16px; padding: 0 18px; {st}; '
            f'font-family: {UI}; font-size: 17px; font-weight: 600; {extra}">{texto}</button>')


def chip(icon, texto, color_icono, bg=BASE['blanco']):
    return (f'<span style="display: inline-flex; align-items: center; gap: 5px; height: 34px; padding: 0 12px 0 9px; border-radius: 99px; background: {bg}; '
            f'box-shadow: 0 2px 0 {BASE["linea"]}, inset 0 0 0 1px {BASE["linea"]}; font-size: 15px; font-weight: 600; color: {BASE["tinta"]}; font-variant-numeric: tabular-nums">'
            f'{ico(icon, color_icono, 18, 2)}{texto}</span>')


def cabecera(color=None, racha='12', puntos='340'):
    A = acc(color)
    return (f'<header style="position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; padding: 18px 18px 6px">'
            f'{lockup(RECOMENDADA["logo"], RECOMENDADA["letra"], color or RECOMENDADA["color"], 22)}'
            f'<div style="display: flex; gap: 8px">{chip("vela", racha, A["base"])}{chip("punto", puntos, BASE["oro_texto"])}</div></header>')


def nav(activo=0, color=None):
    A = acc(color)
    items = [('arco', 'Camino'), ('marco', 'Colección'), ('perfil', 'Perfil')]
    cells = []
    for i, (icon, label) in enumerate(items):
        on = i == activo
        c = A['texto'] if on else BASE['tinta2']
        pill = f'background: {A["suave"]};' if on else ''
        cells.append(f'<a href="#" style="text-decoration: none; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 6px 16px; border-radius: 16px; {pill} color: {c}; font-size: 12px; font-weight: {600 if on else 500}">{ico(icon, c, 24, 1.8)}{label}</a>')
    return (f'<nav style="position: absolute; z-index: 3; left: 0; right: 0; bottom: 0; background: {BASE["blanco"]}; display: flex; justify-content: space-around; '
            f'align-items: center; padding: 8px 12px 20px; box-shadow: 0 -1px 0 {BASE["linea"]}; font-family: {UI}">{"".join(cells)}</nav>')


def nodo(estado, img=None, size=72, color=None, nivel=None, etiqueta=None):
    """Nodo redondo con relieve. estado: done | now | lock | chest | branch."""
    A = acc(color)
    if estado == 'lock':
        inner = (f'<div style="width: {size}px; height: {size}px; border-radius: 99px; background: {BASE["hueco"]}; box-shadow: 0 5px 0 {BASE["hueco_sombra"]}; '
                 f'display: flex; align-items: center; justify-content: center">{ico("candado", "#9A9086", 22, 1.8)}</div>')
    elif estado == 'chest':
        inner = (f'<div style="width: {size - 8}px; height: {size - 8}px; border-radius: 20px; background: {BASE["oro"]}; box-shadow: 0 5px 0 {BASE["oro_sombra"]}; '
                 f'display: flex; align-items: center; justify-content: center; transform: rotate(-6deg)">{ico("cofre", "#FFFFFF", 30, 2)}</div>')
    else:
        anillo = {'bronce': BASE['bronce'], 'plata': BASE['plata'], 'oro': BASE['oro']}.get(nivel, BASE['linea'])
        if estado == 'now':
            ring = f'box-shadow: 0 0 0 4px {BASE["lino"]}, 0 0 0 8px {A["base"]}, 0 10px 0 4px {A["suave"]}'
        else:
            ring = f'box-shadow: 0 0 0 3px {anillo}, 0 5px 0 3px {BASE["hueco_sombra"]}'
        inner = f'<div style="position: relative; width: {size}px; height: {size}px"><img src="img/{img}.jpg" alt="" style="display: block; width: {size}px; height: {size}px; border-radius: 99px; object-fit: cover; {ring}">'
        if estado == 'done' and nivel:
            inner += (f'<span style="position: absolute; right: -6px; bottom: -4px; width: 26px; height: 26px; border-radius: 99px; background: {anillo}; box-shadow: 0 0 0 3px {BASE["lino"]}; '
                      f'display: flex; align-items: center; justify-content: center">{ico("check", "#FFFFFF", 14, 3)}</span>')
        inner += '</div>'
    html = inner
    if etiqueta:
        html += (f'<span style="position: absolute; top: 50%; transform: translateY(-50%); white-space: nowrap; font-family: {UI}; font-size: 14px; font-weight: 500; color: {BASE["tinta2"]}; '
                 f'{"right: calc(100% + 14px)" if etiqueta[1] == "izq" else "left: calc(100% + 14px)"}">{etiqueta[0]}</span>')
    if estado == 'now':
        html += (f'<div style="position: absolute; left: 50%; bottom: calc(100% + 16px); transform: translateX(-50%); white-space: nowrap; background: {BASE["blanco"]}; color: {BASE["tinta"]}; '
                 f'font-family: {UI}; font-weight: 600; font-size: 15px; padding: 8px 14px; border-radius: 14px; box-shadow: 0 3px 0 {BASE["linea"]}, inset 0 0 0 1.5px {BASE["linea"]}">Empezar'
                 f'<span style="position: absolute; left: 50%; bottom: -7px; width: 12px; height: 12px; background: {BASE["blanco"]}; transform: translateX(-50%) rotate(45deg); box-shadow: 2px 2px 0 {BASE["linea"]}"></span></div>')
    return html


def epoca_titulo(nombre, siglos, estado='ahora', color=None):
    A = acc(color)
    c = BASE['tinta'] if estado != 'lock' else BASE['tinta2']
    return (f'<div style="position: relative; z-index: 2; display: flex; align-items: center; gap: 12px; padding: 0 18px">'
            f'<span style="flex: 1; height: 1.5px; background: {BASE["linea"]}"></span>'
            f'<span style="display: flex; flex-direction: column; align-items: center; gap: 1px"><span style="{TIT}; font-size: 20px; color: {c}; line-height: 1.1">{nombre}</span>'
            f'<span style="font-size: 12px; color: {BASE["tinta2"]}; letter-spacing: .02em">{siglos}</span></span>'
            f'<span style="flex: 1; height: 1.5px; background: {BASE["linea"]}"></span></div>')


def tramo(nodos, alto, color=None, ancho=390):
    """Serpentina: nodos colocados por (x, y) con el sendero punteado entre ellos."""
    pts = [(n['x'], n['y']) for n in nodos]
    d = ''
    for i in range(len(pts) - 1):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]
        cx0, cx1 = x0, x1
        d += f'M{x0} {y0} C{cx0} {(y0 + y1) / 2} {cx1} {(y0 + y1) / 2} {x1} {y1} '
    M = 200
    sendero = (f'<svg width="{ancho}" height="{alto + M}" viewBox="0 -{M} {ancho} {alto + M}" fill="none" aria-hidden="true" style="position: absolute; left: 0; top: -{M}px">'
               f'<path d="{d}" stroke="{BASE["hueco_sombra"]}" stroke-width="4" stroke-linecap="round" stroke-dasharray="1 11"/></svg>')
    html = sendero
    for n in nodos:
        if n['estado'] == 'ghost':
            continue
        s = n.get('size', 72)
        html += (f'<div style="position: absolute; left: {n["x"] - s / 2}px; top: {n["y"] - s / 2}px; width: {s}px; height: {s}px">'
                 f'{nodo(n["estado"], n.get("img"), s, color, n.get("nivel"), n.get("etiqueta"))}</div>')
    return f'<div style="position: relative; z-index: 2; height: {alto}px">{html}</div>'


# ---------- pantallas ----------

def camino(epoca='renacimiento', color=None, escena=None):
    A = acc(color)
    if epoca == 'renacimiento':
        titulo = epoca_titulo('Renacimiento', 'Siglos XV y XVI', 'ahora', color)
        tarjeta_txt = ('Conoce a Rafael', 'a188', 'Etapa 2 de 6')
        nodos = [
            dict(x=130, y=40, estado='done', img='a200', nivel='bronce', etiqueta=('Botticelli', 'der')),
            dict(x=236, y=150, estado='now', img='a188', size=80, etiqueta=('Rafael', 'der')),
            dict(x=150, y=262, estado='lock', etiqueta=('Leonardo', 'der')),
            dict(x=256, y=362, estado='chest', size=64),
            dict(x=160, y=456, estado='lock', etiqueta=('Tiziano', 'der')),
        ]
        escena_html = ESCENAS[escena or 'renacimiento'](844, 740) if (escena or 'renacimiento') != 'siluetas' else ESCENAS['siluetas'](844, 740, 'renacimiento')
    else:
        titulo = epoca_titulo('Barroco', 'Siglo XVII', 'ahora', color)
        tarjeta_txt = ('Conoce a Rembrandt', 'a195', 'Etapa 3 de 6')
        nodos = [
            dict(x=130, y=40, estado='done', img='b11', nivel='plata', etiqueta=('Caravaggio', 'der')),
            dict(x=236, y=150, estado='done', img='a62', nivel='oro', etiqueta=('Velázquez', 'der')),
            dict(x=150, y=262, estado='now', img='a195', size=80, etiqueta=('Rembrandt', 'der')),
            dict(x=256, y=372, estado='chest', size=64),
            dict(x=160, y=466, estado='lock', etiqueta=('Vermeer', 'der')),
        ]
        escena_html = ESCENAS[escena or 'barroco'](844, 740) if (escena or 'barroco') != 'siluetas' else ESCENAS['siluetas'](844, 740, 'barroco')
    t, img, etapa = tarjeta_txt
    tarjeta = (f'<section style="position: relative; z-index: 2; margin: 10px 18px 0; background: {BASE["blanco"]}; border-radius: 22px; padding: 14px 14px 14px 18px; display: flex; align-items: center; gap: 14px; '
               f'box-shadow: 0 4px 0 {BASE["linea"]}, inset 0 0 0 1.5px {BASE["linea"]}">'
               f'<div style="flex: 1; display: flex; flex-direction: column; gap: 3px">'
               f'<span style="font-size: 13px; font-weight: 500; color: {BASE["tinta2"]}">{etapa}</span>'
               f'<span style="{TIT}; font-size: 23px; line-height: 1.05; color: {BASE["tinta"]}">{t}</span>'
               f'<span style="margin-top: 8px">{boton("Seguir", color, "primario", 42)}</span></div>'
               f'<img src="img/{img}.jpg" alt="" style="width: 70px; height: 86px; border-radius: 14px; object-fit: cover; transform: rotate(4deg); box-shadow: 0 0 0 3px {BASE["blanco"]}, 0 2px 0 3px {BASE["linea"]}"></section>')
    return f'''
<div style="{W}; background: {BASE['lino']}; font-family: {UI}; color: {BASE['tinta']}">
{escena_html}
{cabecera(color)}
{tarjeta}
<div style="height: 22px"></div>
{titulo}
<div style="height: 8px"></div>
{tramo(nodos, 500, color)}
{nav(0, color)}
</div>'''


def pregunta(color=None):
    A = acc(color)

    def opt(t, estado=None):
        if estado == 'ok':
            st = f'background: {BASE["ok_suave"]}; color: {BASE["ok"]}; box-shadow: 0 4px 0 {BASE["ok_sombra"]}, inset 0 0 0 2px {BASE["ok"]}'
            marca = ico('check', BASE['ok'], 20, 2.6)
        else:
            st = f'background: {BASE["blanco"]}; color: {BASE["tinta"]}; box-shadow: 0 4px 0 {BASE["linea"]}, inset 0 0 0 1.5px {BASE["linea"]}; opacity: .6'
            marca = ''
        return (f'<button type="button" style="height: 54px; border: 0; border-radius: 16px; {st}; display: flex; align-items: center; justify-content: center; gap: 8px; '
                f'font-family: {UI}; font-size: 16px; font-weight: 500">{t}{marca}</button>')
    return f'''
<div style="{W}; background: {BASE['lino']}; font-family: {UI}; color: {BASE['tinta']}">
<header style="display: flex; align-items: center; gap: 14px; padding: 18px 18px 6px">
<button type="button" aria-label="Cerrar" style="border: 0; background: none; padding: 0; width: 28px; height: 28px">{ico('cerrar', BASE['tinta2'], 24, 2)}</button>
<div style="flex: 1; height: 12px; border-radius: 12px; background: {BASE['hueco']}; box-shadow: inset 0 2px 0 {BASE['hueco_sombra']}"><div style="width: 60%; height: 12px; border-radius: 12px; background: {A['base']}; box-shadow: inset 0 -3px 0 {A['sombra']}"></div></div>
{chip('vela', '3', A['base'])}
</header>
<div style="padding: 14px 18px 0; display: flex; flex-direction: column; gap: 14px">
<h1 style="margin: 0; {TIT}; font-size: 30px; line-height: 1.05">¿Quién lo pintó?</h1>
<div style="position: relative">
<img src="img/a115.jpg" alt="La lechera" style="display: block; width: 100%; height: 292px; object-fit: cover; object-position: 50% 30%; border-radius: 20px; box-shadow: 0 1px 2px rgba(35,32,28,.12), 0 14px 30px -16px rgba(35,32,28,.45)">
<span style="position: absolute; right: 12px; bottom: 12px; width: 38px; height: 38px; border-radius: 12px; background: rgba(35,32,28,.62); display: flex; align-items: center; justify-content: center">{ico('ampliar', '#FFFFFF', 20, 2)}</span>
</div>
<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">
{opt('Vermeer', 'ok')}{opt('Rembrandt')}{opt('Velázquez')}{opt('Murillo')}
</div>
</div>
<section style="position: absolute; left: 0; right: 0; bottom: 0; background: {BASE['ok_suave']}; padding: 20px 18px 24px; display: flex; flex-direction: column; gap: 8px; border-radius: 26px 26px 0 0">
<div style="display: flex; align-items: center; gap: 10px">
<span style="width: 34px; height: 34px; border-radius: 99px; background: {BASE['ok']}; display: flex; align-items: center; justify-content: center">{ico('check', '#FFFFFF', 19, 3)}</span>
<span style="{TIT}; font-size: 26px; color: {BASE['ok']}">Exacto.</span>
<span style="margin-left: auto; font-size: 16px; font-weight: 600; color: {BASE['ok']}">+10</span>
</div>
<p style="margin: 0; font-size: 16px; line-height: 1.45; color: {BASE['tinta']}">Esa luz es de Vermeer: una ventana a la izquierda y nada más.</p>
<div style="margin-top: 8px; display: flex">{boton('Seguir', color, 'ok', 54, 'flex: 1')}</div>
</section>
</div>'''


def ficha(color=None):
    A = acc(color)
    seg = ''.join(f'<div style="flex: 1; height: 3px; border-radius: 3px; background: {BASE["noche_tinta"] if i < 2 else "rgba(242,236,226,.28)"}"></div>' for i in range(5))
    return f'''
<div style="{W}; background: {BASE['noche']}; font-family: {UI}; color: {BASE['noche_tinta']}">
<div style="display: flex; gap: 5px; padding: 14px 16px 0">{seg}</div>
<header style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px 10px">
<div style="display: flex; align-items: center; gap: 10px">{logo(RECOMENDADA['logo'], BASE['noche_tinta'], BASE['noche_tinta'], 26)}<span style="font-size: 14px; font-weight: 500; color: {BASE['noche_tinta']}; opacity: .9">Leonardo · 2 de 5</span></div>
<button type="button" aria-label="Cerrar" style="border: 0; background: none; padding: 0">{ico('cerrar', BASE['noche_tinta'], 24, 2)}</button>
</header>
<div style="padding: 0 16px">
<img src="img/a154.jpg" alt="La Gioconda, de Leonardo" style="display: block; width: 100%; height: 440px; object-fit: cover; object-position: 50% 18%; border-radius: 18px; box-shadow: 0 24px 40px -24px rgba(0,0,0,.8)">
</div>
<div style="padding: 20px 22px 0; display: flex; flex-direction: column; gap: 10px">
<span style="display: inline-flex; align-self: flex-start; align-items: center; height: 26px; padding: 0 10px; border-radius: 99px; background: rgba(242,236,226,.12); font-size: 12px; font-weight: 600; letter-spacing: .03em; color: {BASE['noche_tinta']}">Técnica</span>
<h1 style="margin: 0; {TIT}; font-size: 27px; line-height: 1.12">Ningún contorno. Las sombras se funden como humo: es el sfumato.</h1>
<p style="margin: 0; font-size: 16px; line-height: 1.5; color: {BASE['noche_tinta']}; opacity: .85">Mira la comisura de la boca: no hay línea, solo luz que se apaga.</p>
</div>
<div style="position: absolute; left: 0; right: 0; bottom: 22px; display: flex; justify-content: center; gap: 18px; font-size: 13px; color: {BASE['noche_tinta']}; opacity: .6">
<span>Toca para seguir</span><span>·</span><span>Desliza abajo para cerrar</span>
</div>
</div>'''


def celebracion(color=None):
    A = acc(color)
    return f'''
<div style="{W}; background: {BASE['lino']}; font-family: {UI}; color: {BASE['tinta']}">
<div style="position: absolute; left: 50%; top: 150px; width: 420px; height: 420px; transform: translateX(-50%); border-radius: 99px; background: radial-gradient(closest-side, {A['suave']}, {BASE['lino']})"></div>
<div style="position: relative; padding: 54px 0 0; display: flex; flex-direction: column; align-items: center">
<div style="position: relative; width: 250px; height: 230px">
<img src="img/a200.jpg" alt="El nacimiento de Venus, de Botticelli" style="position: absolute; left: 10px; top: 10px; width: 230px; height: 196px; object-fit: cover; border-radius: 14px; transform: rotate(-3deg); box-shadow: 0 0 0 6px {BASE['blanco']}, 0 2px 0 6px {BASE['linea']}, 0 24px 36px -20px rgba(35,32,28,.5)">
<div style="position: absolute; right: -14px; bottom: -6px; transform: rotate(8deg)">{medalla('bronce', 72)}</div>
</div>
<span style="margin-top: 30px; font-size: 14px; font-weight: 500; color: {BASE['tinta2']}">Etapa terminada</span>
<h1 style="margin: 6px 0 0; {TIT}; font-size: 34px; line-height: 1.05; text-align: center">Botticelli, en tu museo.</h1>
<p style="margin: 8px 0 0; font-size: 16px; text-align: center; color: {BASE['tinta2']}; max-width: 300px; line-height: 1.45">Primera etapa del Renacimiento. Sello de bronce.</p>
</div>
<div style="position: relative; margin: 26px 18px 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px">
<div style="background: {BASE['blanco']}; border-radius: 18px; padding: 14px 16px; display: flex; flex-direction: column; gap: 2px; box-shadow: 0 3px 0 {BASE['linea']}, inset 0 0 0 1.5px {BASE['linea']}">
<span style="{TIT}; font-size: 32px; line-height: 1; color: {A['texto']}; font-variant-numeric: tabular-nums">+80</span>
<span style="font-size: 13px; color: {BASE['tinta2']}">puntos</span></div>
<div style="background: {BASE['blanco']}; border-radius: 18px; padding: 14px 16px; display: flex; flex-direction: column; gap: 2px; box-shadow: 0 3px 0 {BASE['linea']}, inset 0 0 0 1.5px {BASE['linea']}">
<span style="display: flex; align-items: center; gap: 6px; {TIT}; font-size: 32px; line-height: 1; font-variant-numeric: tabular-nums">{ico('vela', A['base'], 26, 2)}3</span>
<span style="font-size: 13px; color: {BASE['tinta2']}">días seguidos</span></div>
</div>
<div style="position: relative; margin: 10px 18px 0; background: {BASE['blanco']}; border-radius: 18px; padding: 14px 16px; display: flex; align-items: center; gap: 14px; box-shadow: 0 3px 0 {BASE['linea']}, inset 0 0 0 1.5px {BASE['linea']}">
<span style="width: 52px; height: 52px; border-radius: 99px; background: #3B5591; box-shadow: inset 0 -5px 0 #2A3F6E, inset 0 0 0 3px rgba(255,255,255,.35); flex: none"></span>
<div style="display: flex; flex-direction: column; gap: 2px; min-width: 0">
<span style="font-size: 13px; color: {BASE['tinta2']}">Para tu taller</span>
<span style="{TIT}; font-size: 20px; line-height: 1.1">Lapislázuli</span>
<span style="font-size: 14px; color: {BASE['tinta2']}">Pigmento. Valía más que el oro.</span></div>
</div>
<div style="position: absolute; left: 18px; right: 18px; bottom: 24px; display: flex; flex-direction: column; gap: 8px">
{boton('Seguir con Rafael', color, 'primario', 54)}
{boton('Volver al camino', color, 'texto', 44)}
</div>
</div>'''


def perfil(color=None):
    A = acc(color)
    museo = ''.join(f'<img src="img/{i}.jpg" alt="" style="display: block; width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 10px">'
                    for i in ('a62', 'a109', 'a115', 'a200', 'a154', 'a167', 'a204', 'b11', 'a195'))
    cifras = ''.join(
        f'<div style="display: flex; flex-direction: column; align-items: center; gap: 2px">'
        f'<span style="display: flex; align-items: center; gap: 5px; {TIT}; font-size: 28px; line-height: 1; font-variant-numeric: tabular-nums">{ico(ic, c, 20, 2)}{n}</span>'
        f'<span style="font-size: 12px; color: {BASE["tinta2"]}">{l}</span></div>'
        for ic, c, n, l in (('vela', A['base'], '45', 'días seguidos'), ('punto', BASE['oro_texto'], '9.800', 'puntos'), ('marco', BASE['tinta2'], '154', 'cuadros')))
    logros = (medalla('oro', 46) + medalla('plata', 46) + medalla('bronce', 46) + medalla('bronce', 46) + medalla('oro', 46, cerrada=True) + medalla('oro', 46, cerrada=True))
    return f'''
<div style="{W}; background: {BASE['lino']}; font-family: {UI}; color: {BASE['tinta']}">
<div style="position: relative; height: 122px">
<img src="img/a167.jpg" alt="La noche estrellada, tu cuadro de portada" style="display: block; width: 100%; height: 122px; object-fit: cover; object-position: 50% 40%">
<div style="position: absolute; inset: 0; background: linear-gradient(rgba(30,26,22,.05), rgba(30,26,22,.35) 70%, {BASE['lino']} 100%)"></div>
<button type="button" aria-label="Ajustes" style="position: absolute; right: 14px; top: 14px; width: 40px; height: 40px; border: 0; border-radius: 99px; background: rgba(255,255,255,.9); display: flex; align-items: center; justify-content: center">{ico('ajustes', BASE['tinta'], 20, 1.8)}</button>
<img src="img/a109.jpg" alt="Tu retrato: La joven de la perla" style="position: absolute; left: 18px; bottom: -30px; width: 68px; height: 68px; border-radius: 99px; object-fit: cover; object-position: 50% 20%; box-shadow: 0 0 0 4px {BASE['lino']}, 0 3px 0 4px {BASE['linea']}">
</div>
<div style="padding: 36px 18px 0; display: flex; flex-direction: column; gap: 2px">
<h1 style="margin: 0; {TIT}; font-size: 26px; line-height: 1">María</h1>
<span style="font-size: 14px; color: {BASE['tinta2']}">Conocedora · Tu siglo es el XVII</span>
</div>
<div style="margin: 10px 18px 0; padding: 9px 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-top: 1px solid {BASE['linea']}; border-bottom: 1px solid {BASE['linea']}">{cifras}</div>
<div style="padding: 10px 18px 0; display: flex; align-items: baseline; justify-content: space-between">
<span style="{TIT}; font-size: 19px">Mi museo</span><a href="#" style="font-size: 14px; font-weight: 600; color: {A['texto']}; text-decoration: none">Ver todo</a>
</div>
<div style="margin: 6px 18px 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px">{museo}</div>
<div style="padding: 10px 18px 0; display: flex; align-items: baseline; justify-content: space-between">
<span style="{TIT}; font-size: 19px">Logros</span><span style="font-size: 14px; color: {BASE['tinta2']}">12 de 40</span>
</div>
<div style="margin: 6px 18px 0; display: flex; gap: 10px; overflow: hidden">{logros}</div>
{nav(2, color)}
</div>'''


# ---------- mesa alta: camino entero ----------

def camino_entero(color=None):
    A = acc(color)
    H = 2980
    secciones = []
    y = 0

    def bloque(html, alto):
        nonlocal y
        secciones.append(f'<div style="position: absolute; left: 0; top: {y}px; width: 390px; height: {alto}px">{html}</div>')
        y += alto

    # Renacimiento: terminado
    esc = ESCENAS['renacimiento'](720, 640)
    nodos = [
        dict(x=130, y=110, estado='done', img='a200', nivel='oro', etiqueta=('Botticelli', 'der')),
        dict(x=236, y=215, estado='done', img='a188', nivel='plata', etiqueta=('Rafael', 'der')),
        dict(x=150, y=320, estado='done', img='a154', nivel='oro', etiqueta=('Leonardo', 'der')),
        dict(x=256, y=420, estado='done', img='a147', nivel='bronce', etiqueta=('Tiziano', 'der')),
        dict(x=160, y=520, estado='done', img='a6', nivel='bronce', etiqueta=('Miguel Ángel', 'der')),
    ]
    html = esc + '<div style="height: 30px"></div>' + epoca_titulo('Renacimiento', 'Siglos XV y XVI · completo', 'done', color) + tramo(nodos, 600, color)
    bloque(html, 690)

    # Rama gótica: recién abierta, sale hacia la izquierda
    rama_nodos = [
        dict(x=90, y=90, estado='now', img='a22', size=76, etiqueta=('Van Eyck', 'der')),
        dict(x=60, y=215, estado='lock', etiqueta=('Giotto', 'der')),
        dict(x=100, y=330, estado='lock', etiqueta=('Fra Angelico', 'der')),
    ]
    esc = ESCENAS['gotico'](460, 420)
    cartel = (f'<div style="position: absolute; z-index: 2; left: 18px; top: 10px; display: flex; align-items: center; gap: 10px; background: {BASE["blanco"]}; border-radius: 16px; padding: 10px 14px; '
              f'box-shadow: 0 3px 0 {BASE["linea"]}, inset 0 0 0 1.5px {BASE["linea"]}">'
              f'<span style="width: 34px; height: 34px; border-radius: 99px; background: {A["suave"]}; display: flex; align-items: center; justify-content: center">{ico("arco", A["texto"], 18, 2)}</span>'
              f'<div style="display: flex; flex-direction: column"><span style="{TIT}; font-size: 17px; line-height: 1.1">Rama abierta: Gótico</span>'
              f'<span style="font-size: 13px; color: {BASE["tinta2"]}">Opcional. Siglos XIII a XV.</span></div></div>')
    # el ramal se dibuja desde el último nodo del Renacimiento (160, 520 + 30 + 60 -> abs) hasta el primero de la rama
    ramal = (f'<svg width="390" height="460" viewBox="0 0 390 460" fill="none" aria-hidden="true" style="position: absolute; left: 0; top: 0">'
             f'<path d="M160 -60 C160 10 90 10 90 90" stroke="{A["base"]}" stroke-width="4" stroke-linecap="round" stroke-dasharray="1 11"/></svg>')
    html = esc + ramal + cartel + '<div style="height: 70px"></div>' + tramo(rama_nodos, 380, color)
    bloque(html, 440)

    # Manierismo y Norte: en curso
    esc = ESCENAS['norte'](600, 540)
    nodos = [
        dict(x=160, y=-150, estado='ghost'),
        dict(x=230, y=100, estado='done', img='a184', nivel='bronce', etiqueta=('El Bosco', 'izq')),
        dict(x=140, y=210, estado='now', img='b10', size=80, etiqueta=('Durero', 'der')),
        dict(x=246, y=320, estado='lock', etiqueta=('Brueghel', 'der')),
        dict(x=150, y=420, estado='lock', etiqueta=('El Greco', 'der')),
    ]
    html = esc + '<div style="height: 30px"></div>' + epoca_titulo('Manierismo y Norte', 'Siglo XVI · 1 de 4', 'ahora', color) + tramo(nodos, 500, color)
    bloque(html, 580)

    # Barroco: cerrado, pero se ve
    esc = ESCENAS['barroco'](760, 680)
    nodos = [
        dict(x=150, y=-150, estado='ghost'),
        dict(x=130, y=100, estado='lock', etiqueta=('Caravaggio', 'der')),
        dict(x=236, y=205, estado='lock', etiqueta=('Rubens', 'der')),
        dict(x=150, y=310, estado='lock', etiqueta=('Velázquez', 'der')),
        dict(x=256, y=405, estado='chest', size=64),
        dict(x=160, y=500, estado='lock', etiqueta=('Rembrandt', 'der')),
        dict(x=250, y=600, estado='lock', etiqueta=('Vermeer', 'der')),
    ]
    aviso = (f'<div style="position: absolute; z-index: 2; left: 50%; top: 88px; transform: translateX(-50%); white-space: nowrap; font-size: 13px; color: {BASE["tinta2"]}; '
             f'background: {BASE["lino"]}; padding: 4px 10px; border-radius: 99px">Se abre al terminar Manierismo y Norte</div>')
    html = esc + '<div style="height: 30px"></div>' + epoca_titulo('Barroco', 'Siglo XVII', 'lock', color) + aviso + tramo(nodos, 660, color)
    bloque(html, 740)

    # Rococó: solo el título, para que se vea que sigue
    nodos = [dict(x=250, y=-150, estado='ghost'), dict(x=130, y=90, estado='lock', etiqueta=('Fragonard', 'der')), dict(x=236, y=195, estado='lock', etiqueta=('David', 'der'))]
    html = '<div style="height: 30px"></div>' + epoca_titulo('Rococó y Neoclasicismo', 'Siglo XVIII', 'lock', color) + tramo(nodos, 260, color) + (
        f'<div style="position: absolute; left: 0; right: 0; bottom: 0; height: 160px; background: linear-gradient(rgba(247,243,236,0), {BASE["lino"]})"></div>')
    bloque(html, 360)

    H = y + 110
    return f'''
<div data-root style="width: 390px; height: {H}px; box-sizing: border-box; position: relative; overflow: hidden; background: {BASE['lino']}; font-family: {UI}; color: {BASE['tinta']}">
{cabecera(color, '45', '9.800')}
<div style="position: relative; height: {y}px">{''.join(secciones)}</div>
{nav(0, color)}
</div>''', H


PANTALLAS = [
    ('camino-renacimiento', 'Camino · Renacimiento', lambda: camino('renacimiento')),
    ('camino-barroco', 'Camino · Barroco', lambda: camino('barroco')),
    ('camino-siluetas', 'Camino · variante de siluetas', lambda: camino('renacimiento', escena='siluetas')),
    ('pregunta', 'Pregunta', pregunta),
    ('ficha', 'Ficha tipo historia', ficha),
    ('celebracion', 'Celebración', celebracion),
    ('perfil', 'Perfil', perfil),
]
