# Mesas de marca por ruta: logotipo + color, y tipografía + voz.
from common import R, col, cr, fmt, symbol, wordmark, lockup, app_icon, ico, logo_a, logo_b, logo_c

VOICE = {
    'A': [('Bienvenida', 'Bienvenida a Mirada. Hoy, un cuadro y una idea.'),
          ('Acierto', 'Exacto. Esa luz es de Vermeer.'),
          ('Fallo', 'Casi. Fíjate en la ventana: de ahí viene la luz.'),
          ('Racha', 'Siete días mirando. Se nota.'),
          ('Premio', 'Has abierto la sala de Velázquez.')],
    'B': [('Bienvenida', 'Hola. ¿Jugamos a mirar?'),
          ('Acierto', '¡Ojo fino! +10'),
          ('Fallo', 'Uy, era Monet. La próxima es tuya.'),
          ('Racha', 'Cinco días seguidos. Vas que vuelas.'),
          ('Premio', 'Cofre abierto: tres cuadros nuevos.')],
    'C': [('Bienvenida', 'Mirar también se aprende.'),
          ('Acierto', 'Correcto. Vermeer, 1665.'),
          ('Fallo', 'No. Es Monet: la niebla lo delata.'),
          ('Racha', 'Doce días seguidos.'),
          ('Premio', 'Nueva sala: Barroco español.')],
}


def h2(k, text, color):
    r = R[k]
    if k == 'A':
        st = f"font-family: {r['disp']}; font-weight: 600; font-size: 22px; letter-spacing: -0.01em"
    elif k == 'B':
        st = f"font-family: {r['disp']}; font-weight: 700; font-size: 20px; letter-spacing: -0.02em"
    else:
        st = f"font-family: {r['disp']}; font-size: 28px; letter-spacing: -0.01em"
    return f'<h2 style="margin: 0; {st}; color: {color}; line-height: 1.1">{text}</h2>'


def head(k, sub):
    r = R[k]
    ink = col(k, 2)
    big = {'A': f"font-family: {r['disp']}; font-weight: 600; font-size: 44px; letter-spacing: -0.02em",
           'B': f"font-family: {r['disp']}; font-weight: 800; font-size: 42px; letter-spacing: -0.035em",
           'C': f"font-family: {r['disp']}; font-size: 56px; letter-spacing: -0.02em"}[k]
    return (f'<div style="display: flex; flex-direction: column; gap: 8px">'
            f'<div style="display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: {col(k, 3) if k != "B" else ink}">'
            f'<span style="display: inline-flex; width: 26px; height: 26px; border-radius: 99px; background: {col(k, 3)}; color: {"#fff" if k != "B" else ink}; align-items: center; justify-content: center; font-size: 13px">{k}</span>Ruta {k} · {sub}</div>'
            f'<h1 style="margin: 0; {big}; line-height: 1; color: {ink}">{r["name"]}</h1>'
            f'<p style="margin: 0; font-size: 16px; line-height: 1.45; color: {ink}">{r["concept"]}</p></div>')


def swatch_rows(k, dark):
    pal = R[k]['dark' if dark else 'light']
    bg = pal[0][1]
    ink = pal[2][1]
    rows = []
    for i, (name, hx, use) in enumerate(pal):
        if i == 0:
            note = 'Base de cada pantalla'
        elif i == 2 or i in (3, 4, 5):
            c = cr(hx, bg)
            if c >= 4.5:
                note = f'Texto sobre fondo {fmt(c)}'
            else:
                note = f'Relleno · texto encima {fmt(cr(ink, hx))}'
        elif i == 1:
            note = f'Texto encima {fmt(cr(ink, hx))}'
        else:
            c = cr(hx, bg)
            note = f'Texto sobre fondo {fmt(c)}' if c >= 4.5 else f'Relleno · texto encima {fmt(cr(ink, hx))}'
        edge = 'box-shadow: inset 0 0 0 1px rgba(127,127,127,.35);'
        rows.append(
            f'<div style="display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; gap: 12px; align-items: center">'
            f'<div style="width: 44px; height: 44px; border-radius: 12px; background: {hx}; {edge}"></div>'
            f'<div style="display: flex; flex-direction: column; gap: 2px; min-width: 0">'
            f'<span style="font-size: 15px; font-weight: 600; color: {ink}">{name} <span style="font-weight: 400; opacity: .8">· {use}</span></span>'
            f'<span style="font-size: 13px; color: {ink}; opacity: .85">{note}</span></div>'
            f'<span style="font-size: 13px; font-variant-numeric: tabular-nums; color: {ink}; opacity: .85">{hx}</span></div>')
    return ''.join(rows)


def brand_board(k):
    r = R[k]
    bg, sf, ink, acc = col(k, 0), col(k, 1), col(k, 2), col(k, 3)
    dbg, dsf, dink = col(k, 0, True), col(k, 1, True), col(k, 2, True)
    sizes = ''.join(
        f'<div style="display: flex; flex-direction: column; align-items: center; gap: 6px">{symbol(k, False, s)}'
        f'<span style="font-size: 13px; color: {ink}">{s} px</span></div>' for s in (64, 40, 24, 16))
    favicon = (f'<div style="display: flex; align-items: center; gap: 8px; background: {sf}; border-radius: 10px 10px 0 0; padding: 8px 12px; '
               f'box-shadow: inset 0 0 0 1px rgba(0,0,0,.08); width: fit-content">'
               f'{symbol(k, False, 16)}<span style="font-size: 13px; color: {ink}">Mirada</span></div>')
    out = f'''
<div data-root style="width: 390px; box-sizing: border-box; padding: 28px 20px 32px; background: {bg}; font-family: {r['text']}; color: {ink}; display: flex; flex-direction: column; gap: 28px">
{head(k, 'logotipo y color')}
<div style="background: {sf}; border-radius: 20px; padding: 40px 20px; display: flex; flex-direction: column; align-items: center; gap: 18px; box-shadow: 0 1px 2px rgba(0,0,0,.05)">
{lockup(k, False, 44)}
<p style="margin: 0; font-size: 14px; color: {ink}; text-align: center; max-width: 290px; line-height: 1.45"><strong>{r['symbol']}.</strong> {r['symbol_note']}</p>
</div>
<div style="display: flex; flex-direction: column; gap: 14px">
{h2(k, 'Símbolo y tamaños', ink)}
<div style="display: flex; justify-content: space-between; align-items: flex-end; padding: 0 8px">{sizes}</div>
{favicon}
</div>
<div style="display: flex; flex-direction: column; gap: 14px">
{h2(k, 'Una sola tinta', ink)}
<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px">
<div style="background: #FFFFFF; border-radius: 16px; padding: 22px 12px; display: flex; justify-content: center; box-shadow: inset 0 0 0 1px rgba(0,0,0,.08)">{lockup(k, False, 22, '#111111')}</div>
<div style="background: #111111; border-radius: 16px; padding: 22px 12px; display: flex; justify-content: center">{lockup(k, False, 22, '#FFFFFF')}</div>
</div>
</div>
<div style="display: flex; flex-direction: column; gap: 14px">
{h2(k, 'Icono de app', ink)}
<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px">
<div style="background: #E9E6E1; border-radius: 16px; padding: 18px 12px; display: flex; flex-direction: column; align-items: center; gap: 8px">{app_icon(k, False, 72)}<span style="font-size: 13px; color: #222">Claro</span></div>
<div style="background: #1C1C1E; border-radius: 16px; padding: 18px 12px; display: flex; flex-direction: column; align-items: center; gap: 8px">{app_icon(k, True, 72)}<span style="font-size: 13px; color: #EEE">Oscuro</span></div>
</div>
</div>
<div style="display: flex; flex-direction: column; gap: 14px">
{h2(k, 'Paleta · claro', ink)}
<div style="display: flex; flex-direction: column; gap: 10px">{swatch_rows(k, False)}</div>
</div>
<div style="background: {dbg}; border-radius: 20px; padding: 20px 16px; display: flex; flex-direction: column; gap: 14px">
{h2(k, 'Paleta · oscuro', dink)}
<div style="display: flex; flex-direction: column; gap: 10px">{swatch_rows(k, True)}</div>
</div>
<p style="margin: 0; font-size: 15px; line-height: 1.5; color: {ink}"><strong>Con los cuadros.</strong> {r['why']}</p>
</div>'''
    return out


def type_board(k):
    r = R[k]
    bg, sf, ink, acc, ok, bad, gold = [col(k, i) for i in range(7)]
    on_acc = '#FFFFFF' if cr('#FFFFFF', acc) >= 4.5 else ink
    if k == 'A':
        disp = f"font-family: {r['disp']}; font-weight: 600; letter-spacing: -0.02em"
        btn = f'border-radius: 14px; background: {acc}; color: {on_acc}'
        btn2 = f'border-radius: 14px; background: transparent; color: {ink}; box-shadow: inset 0 0 0 1.5px {ink}'
    elif k == 'B':
        disp = f"font-family: {r['disp']}; font-weight: 800; letter-spacing: -0.035em"
        btn = f'border-radius: 18px; background: {acc}; color: {on_acc}; box-shadow: 0 4px 0 #C9553E'
        btn2 = f'border-radius: 18px; background: #FFFFFF; color: {ink}; box-shadow: 0 4px 0 #E4DDD3, inset 0 0 0 2px #E4DDD3'
    else:
        disp = f"font-family: {r['disp']}; letter-spacing: -0.02em"
        btn = f'border-radius: 999px; background: {acc}; color: #FFFFFF'
        btn2 = f'border-radius: 999px; background: transparent; color: {ink}; box-shadow: inset 0 0 0 1.5px {ink}'
    title_px = {'A': 40, 'B': 36, 'C': 52}[k]
    nums = [('12', 'días de racha'), ('1.240', 'puntos'), ('3/7', 'cuadros')]
    nums_html = ''.join(
        f'<div style="display: flex; flex-direction: column; gap: 2px"><span style="{disp}; font-size: {34 if k != "C" else 44}px; line-height: 1; font-variant-numeric: lining-nums tabular-nums; color: {ink}">{n}</span>'
        f'<span style="font-size: 13px; color: {ink}; opacity: .85">{l}</span></div>' for n, l in nums)
    voice_colors = {'Acierto': ok, 'Fallo': bad, 'Premio': gold, 'Racha': acc, 'Bienvenida': ink}
    voice = ''.join(
        f'<div style="display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 10px; align-items: baseline; padding: 12px 0; border-top: 1px solid rgba(0,0,0,.09)">'
        f'<span style="font-size: 13px; font-weight: 600; color: {ink}; display: flex; align-items: center; gap: 6px">'
        f'<span style="width: 8px; height: 8px; border-radius: 99px; background: {voice_colors[t]}; flex: none"></span>{t}</span>'
        f'<span style="{disp}; font-size: {19 if k != "C" else 24}px; line-height: 1.2; color: {ink}">{m}</span></div>'
        for t, m in VOICE[k])
    return f'''
<div data-root style="width: 390px; box-sizing: border-box; padding: 28px 20px 32px; background: {bg}; font-family: {r['text']}; color: {ink}; display: flex; flex-direction: column; gap: 28px">
{head(k, 'letra y voz')}
<div style="background: {sf}; border-radius: 20px; padding: 24px 20px; display: flex; flex-direction: column; gap: 16px; box-shadow: 0 1px 2px rgba(0,0,0,.05)">
<div style="display: flex; justify-content: space-between; font-size: 13px; color: {ink}; opacity: .85"><span>Titular · {r['disp_name']}</span><span>Texto · {r['text_name']}</span></div>
<h3 style="margin: 0; {disp}; font-size: {title_px}px; line-height: 1.02; color: {ink}">Conoce a Velázquez</h3>
<p style="margin: 0; font-size: 16px; line-height: 1.55; color: {ink}">Pintó <em>Las meninas</em> en 1656. Se retrató dentro del cuadro, pincel en mano, mirando hacia fuera: hacia ti.</p>
<div style="display: flex; gap: 10px">
<button type="button" style="flex: 1; height: 50px; border: 0; font-family: {r['text']}; font-size: 16px; font-weight: 700; {btn}">Empezar</button>
<button type="button" style="flex: 1; height: 50px; border: 0; font-family: {r['text']}; font-size: 16px; font-weight: 600; {btn2}">Más tarde</button>
</div>
</div>
<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px">{nums_html}</div>
<div style="display: flex; flex-direction: column; gap: 4px">
{h2(k, 'Así habla', ink)}
<div style="margin-top: 10px">{voice}</div>
</div>
</div>'''
