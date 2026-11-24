# Ronda 2: mesas de decisión (portada, logo, letra, color, preguntas). Ancho 390, alto libre.
from r2_theme import BASE, ACCENTS, LETRAS, NEUTRA, RECOMENDADA, contraste, fmt
from r2_parts import logo, wordmark, lockup, app_icon, ico, medalla
from r2_screens import boton, nodo, chip, TIT, UI, acc
from brand import VOICE

INK = BASE['tinta']
INK2 = BASE['tinta2']
BG = BASE['lino']
CARD = f'background: {BASE["blanco"]}; border-radius: 20px; box-shadow: 0 1px 2px rgba(35,32,28,.06)'

LOGOS = {
    1: ('Trazo', 'El vano de la ronda 1 tal cual: línea fina, punto de fuga dentro. El más ligero.'),
    2: ('Pieza', 'El mismo vano, relleno, con el punto en hueco. Una sola forma: aguanta pequeño y de icono.'),
    3: ('Emblema', 'Dos vanos, uno dentro de otro, y el punto al fondo: perspectiva. Al abrir la app se dibuja en tres pasos.'),
}


def _raiz(body, gap=26):
    return (f'<div data-root style="width: 390px; box-sizing: border-box; padding: 26px 20px 30px; background: {BG}; font-family: {NEUTRA}; color: {INK}; '
            f'display: flex; flex-direction: column; gap: {gap}px">{body}</div>')


def _cab(kicker, titulo, texto=None):
    p = f'<p style="margin: 0; font-size: 15px; line-height: 1.45; color: {INK}">{texto}</p>' if texto else ''
    return (f'<div style="display: flex; flex-direction: column; gap: 6px">'
            f'<span style="font-size: 13px; font-weight: 600; color: {INK2}; letter-spacing: .02em">{kicker}</span>'
            f'<h1 style="margin: 0; font-size: 30px; font-weight: 600; letter-spacing: -0.02em; line-height: 1.05">{titulo}</h1>{p}</div>')


def _h2(t):
    return f'<h2 style="margin: 0; font-size: 17px; font-weight: 600; letter-spacing: -0.01em">{t}</h2>'


def _nota(t):
    return f'<p style="margin: 0; font-size: 14px; line-height: 1.45; color: {INK2}">{t}</p>'


# ---------- portada ----------

def portada():
    decidido = [
        ('Estética de interfaz', 'La de «Juego de mirar»: nodos redondos, botones con relieve.'),
        ('Voz', 'La de «Museo vivo»: cálida, culta, sin gritar.'),
        ('Símbolo', 'El vano con punto. Aquí, tres maneras de dibujarlo.'),
        ('Letra', 'Más fina. Nada de Rubik ni de negritas gordas: pesos 400 a 600.'),
    ]
    decide = [
        ('1', 'Logo', 'Tres variantes del mismo símbolo.'),
        ('2', 'Letra', 'Tres parejas finas, en titular, cuadro, texto y botón.'),
        ('3', 'Color', 'Tres colores protagonistas, contenidos y medidos.'),
        ('4', 'Escenario', 'El camino con fondo de época: dibujado o solo siluetas.'),
        ('5', 'Rama', 'Qué rama abrir primero fuera del camino común.'),
    ]
    lista_d = ''.join(f'<div style="display: flex; flex-direction: column; gap: 2px; padding: 10px 0; border-top: 1px solid {BASE["linea"]}">'
                      f'<span style="font-size: 15px; font-weight: 600">{a}</span><span style="font-size: 14px; line-height: 1.4; color: {INK2}">{b}</span></div>' for a, b in decidido)
    lista_q = ''.join(f'<div style="display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 12px; align-items: baseline; padding: 10px 0; border-top: 1px solid {BASE["linea"]}">'
                      f'<span style="display: inline-flex; width: 28px; height: 28px; border-radius: 99px; background: {INK}; color: #FFFFFF; align-items: center; justify-content: center; font-size: 13px; font-weight: 600">{n}</span>'
                      f'<span style="font-size: 15px; line-height: 1.4"><strong>{a}.</strong> {b}</span></div>' for n, a, b in decide)
    return _raiz(f'''
<img src="img/a62.jpg" alt="Las meninas, de Velázquez (detalle)" style="display: block; width: 100%; height: 170px; object-fit: cover; object-position: 50% 28%; border-radius: 18px">
{_cab('Identidad · ronda 2', 'Mirada, afinando', 'Las pantallas de abajo llevan la mezcla que elegiste: juego en la forma, museo en la voz. Falta cerrar logo, letra y color, y ver el camino con su escenario de época.')}
<div style="display: flex; flex-direction: column"><span style="font-size: 15px; font-weight: 600; padding-bottom: 4px">Qué decides en esta ronda</span>{lista_q}</div>
<div style="display: flex; flex-direction: column"><span style="font-size: 15px; font-weight: 600; padding-bottom: 4px">Lo que ya quedó decidido</span>{lista_d}</div>
{_nota('Se lee de arriba abajo: logo, letra, color, pantallas, camino entero y, al final, cinco preguntas con respuestas cerradas.')}
''')


# ---------- logo ----------

def logo_board(n):
    nombre, nota = LOGOS[n]
    c = RECOMENDADA['color']
    A = ACCENTS[c]
    sizes = ''.join(f'<div style="display: flex; flex-direction: column; align-items: center; gap: 6px">{logo(n, INK, A["base"], s)}<span style="font-size: 12px; color: {INK2}">{s}</span></div>' for s in (64, 40, 24, 16))
    fases = ''
    if n == 3:
        fases = (f'<div style="display: flex; flex-direction: column; gap: 12px">{_h2("Se dibuja en tres pasos")}'
                 f'<div style="display: flex; justify-content: space-around; align-items: center; {CARD}; padding: 18px 12px">'
                 + ''.join(f'<div style="display: flex; flex-direction: column; align-items: center; gap: 6px">{logo(3, INK, A["base"], 52, f)}<span style="font-size: 12px; color: {INK2}">{t}</span></div>'
                           for f, t in ((1, 'vano'), (2, 'segundo vano'), (3, 'punto'))) + '</div></div>')
    favicon = (f'<div style="display: flex; align-items: center; gap: 8px; background: {BASE["blanco"]}; border-radius: 10px 10px 0 0; padding: 8px 12px; '
               f'box-shadow: inset 0 0 0 1px {BASE["linea"]}; width: fit-content">{logo(n, INK, A["base"], 16)}<span style="font-size: 13px; color: {INK}">Mirada</span></div>')
    return _raiz(f'''
{_cab(f'Logo · variante {n}', nombre, nota)}
<div style="{CARD}; padding: 40px 20px; display: flex; flex-direction: column; align-items: center; gap: 16px">{lockup(n, RECOMENDADA['letra'], c, 40)}</div>
<div style="display: flex; flex-direction: column; gap: 12px">{_h2('Claro y oscuro')}
<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px">
<div style="background: {BG}; border-radius: 16px; padding: 24px 12px; display: flex; justify-content: center; box-shadow: inset 0 0 0 1px {BASE["linea"]}">{lockup(n, RECOMENDADA['letra'], c, 22)}</div>
<div style="background: {BASE["noche"]}; border-radius: 16px; padding: 24px 12px; display: flex; justify-content: center">{lockup(n, RECOMENDADA['letra'], c, 22, BASE['noche_tinta'])}</div>
</div></div>
<div style="display: flex; flex-direction: column; gap: 12px">{_h2('Icono de app')}
<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px">
<div style="background: #E9E6E1; border-radius: 16px; padding: 18px 12px; display: flex; flex-direction: column; align-items: center; gap: 8px">{app_icon(n, c, False, 72)}<span style="font-size: 12px; color: {INK}">Claro</span></div>
<div style="background: #1C1C1E; border-radius: 16px; padding: 18px 12px; display: flex; flex-direction: column; align-items: center; gap: 8px">{app_icon(n, c, True, 72)}<span style="font-size: 12px; color: #EEE">Oscuro</span></div>
</div></div>
<div style="display: flex; flex-direction: column; gap: 12px">{_h2('Tamaños y pestaña')}
<div style="display: flex; justify-content: space-between; align-items: flex-end; padding: 0 8px">{sizes}</div>{favicon}</div>
{fases}
''')


# ---------- letra ----------

def letra_board(k):
    Lk = LETRAS[k]
    c = RECOMENDADA['color']
    A = ACCENTS[c]
    tit = f"font-family: {Lk['tit']}; font-weight: {Lk['tit_w']}; letter-spacing: {Lk['tit_ls']}"
    nom = f"font-family: {Lk['nom']}; font-weight: {Lk['nom_w']}"
    ui = Lk['ui']
    voz = ''.join(
        f'<div style="display: grid; grid-template-columns: 90px minmax(0, 1fr); gap: 10px; align-items: baseline; padding: 10px 0; border-top: 1px solid {BASE["linea"]}">'
        f'<span style="font-size: 13px; font-weight: 600; color: {INK2}">{t}</span>'
        f'<span style="{tit}; font-size: 19px; line-height: 1.25; color: {INK}">{m}</span></div>' for t, m in VOICE['A'][:4])
    familias = ' + '.join(sorted({Lk['tit'].split(',')[0].strip("'"), Lk['nom'].split(',')[0].strip("'"), Lk['ui'].split(',')[0].strip("'")}))
    return _raiz(f'''
{_cab(f'Letra · pareja {k}', Lk['corto'], Lk['nota'] + f' Pesos de {Lk["ui_w"] if k == 2 else 400} a 600.')}
<div style="{CARD}; padding: 22px 20px; display: flex; flex-direction: column; gap: 14px; font-family: {ui}">
<span style="font-size: 12px; color: {INK2}">Titular · {Lk['tit'].split(',')[0].strip("'")} {Lk['tit_w']}</span>
<h3 style="margin: 0; {tit}; font-size: 36px; line-height: 1.02; color: {INK}">Conoce a Velázquez</h3>
<span style="font-size: 12px; color: {INK2}">Nombre de cuadro · {Lk['nom'].split(',')[0].strip("'")} {Lk['nom_w']}</span>
<span style="{nom}; font-size: 21px; line-height: 1.15; color: {INK}"><em>Las meninas</em>, 1656</span>
<span style="font-size: 12px; color: {INK2}">Texto · {Lk['ui'].split(',')[0].strip("'")} 400</span>
<p style="margin: 0; font-size: 16px; line-height: 1.55; color: {INK}; font-weight: 400">Se retrató dentro del cuadro, pincel en mano, mirando hacia fuera: hacia ti.</p>
<span style="font-size: 12px; color: {INK2}">Botón · {Lk['ui'].split(',')[0].strip("'")} {Lk['ui_w']}</span>
<div style="display: flex; gap: 10px">
<button type="button" style="flex: 1; height: 50px; border: 0; border-radius: 16px; background: {A['base']}; color: {A['sobre']}; box-shadow: 0 4px 0 {A['sombra']}; font-family: {ui}; font-size: 17px; font-weight: {Lk['ui_w']}">Empezar</button>
<button type="button" style="flex: 1; height: 50px; border: 0; border-radius: 16px; background: {BASE['blanco']}; color: {INK}; box-shadow: 0 4px 0 {BASE['linea']}, inset 0 0 0 1.5px {BASE['linea']}; font-family: {ui}; font-size: 17px; font-weight: 500">Más tarde</button>
</div>
</div>
<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; font-family: {ui}">
{''.join(f'<div style="display: flex; flex-direction: column; gap: 2px"><span style="{tit}; font-size: 30px; line-height: 1; font-variant-numeric: tabular-nums">{n}</span><span style="font-size: 13px; color: {INK2}">{l}</span></div>' for n, l in (('12', 'días seguidos'), ('1.240', 'puntos'), ('3 de 7', 'cuadros')))}
</div>
<div style="display: flex; flex-direction: column; gap: 4px; font-family: {ui}">{_h2('Así suena la voz')}<div style="margin-top: 6px">{voz}</div></div>
{_nota(f'Familias: {familias}. Para el lienzo se cargan de Google Fonts; en la app irán en local.')}
''')


# ---------- color ----------

def color_board(key):
    A = ACCENTS[key]
    base = [('Lino', BASE['lino'], 'Fondo'), ('Blanco', BASE['blanco'], 'Tarjetas'), ('Tinta', BASE['tinta'], 'Texto'),
            ('Tinta suave', BASE['tinta2'], 'Texto secundario'), ('Verde tierra', BASE['ok'], 'Acierto'), ('Siena', BASE['fallo'], 'Fallo'), ('Oro viejo', BASE['oro'], 'Premio')]

    def fila(nombre, hx, uso, medida):
        return (f'<div style="display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; gap: 12px; align-items: center">'
                f'<div style="width: 40px; height: 40px; border-radius: 12px; background: {hx}; box-shadow: inset 0 0 0 1px rgba(35,32,28,.12)"></div>'
                f'<div style="display: flex; flex-direction: column; gap: 1px; min-width: 0"><span style="font-size: 15px; font-weight: 600">{nombre} <span style="font-weight: 400; color: {INK2}">· {uso}</span></span>'
                f'<span style="font-size: 13px; color: {INK2}">{medida}</span></div>'
                f'<span style="font-size: 12px; color: {INK2}; font-variant-numeric: tabular-nums">{hx}</span></div>')

    def ok(x):
        return ('cumple' if x >= 4.5 else 'solo para relleno')
    filas_acc = ''.join([
        fila(A['nombre'], A['base'], 'Botones y nodo actual', f'Texto encima ({"tinta" if A["sobre"] != "#FFFFFF" else "blanco"}) {fmt(contraste(A["base"], A["sobre"]))} · {ok(contraste(A["base"], A["sobre"]))}'),
        fila('Sombra', A['sombra'], 'Relieve del botón', 'Solo relieve, no lleva texto'),
        fila('Suave', A['suave'], 'Fondos de pestaña y aro', f'Texto encima (tinta) {fmt(contraste(A["suave"], INK))}'),
        fila('Como texto', A['texto'], 'Enlaces y cifras', f'Sobre lino {fmt(contraste(A["texto"], BG))} · sobre blanco {fmt(contraste(A["texto"], BASE["blanco"]))}'),
    ])
    filas_base = ''.join(fila(n, h, u, (f'Sobre lino {fmt(contraste(h, BG))}' if i >= 2 else ('Base de cada pantalla' if i == 0 else f'Texto encima {fmt(contraste(INK, h))}')))
                         for i, (n, h, u) in enumerate(base))
    ejemplo = (f'<div style="{CARD}; padding: 18px; display: flex; flex-direction: column; gap: 16px; font-family: {UI}">'
               f'<div style="display: flex; align-items: center; justify-content: space-between">{lockup(RECOMENDADA["logo"], RECOMENDADA["letra"], key, 20)}'
               f'<div style="display: flex; gap: 8px">{chip("vela", "12", A["base"])}{chip("punto", "340", BASE["oro_texto"])}</div></div>'
               f'<div style="height: 12px; border-radius: 12px; background: {BASE["hueco"]}; box-shadow: inset 0 2px 0 {BASE["hueco_sombra"]}"><div style="width: 55%; height: 12px; border-radius: 12px; background: {A["base"]}; box-shadow: inset 0 -3px 0 {A["sombra"]}"></div></div>'
               f'<div style="display: flex; align-items: center; justify-content: space-around; padding: 30px 0 8px">'
               f'<div style="position: relative; width: 72px; height: 72px">{nodo("now", "a188", 72, key)}</div>'
               f'<div style="position: relative; width: 64px; height: 64px">{nodo("done", "a200", 64, key, "oro")}</div>'
               f'<div style="position: relative; width: 64px; height: 64px">{nodo("lock", None, 64, key)}</div></div>'
               f'<div style="display: flex; gap: 10px">{boton("Empezar", key, "primario", 50, "flex: 1")}{boton("Más tarde", key, "secundario", 50, "flex: 1")}</div>'
               f'<a href="#" style="font-size: 15px; font-weight: 600; color: {A["texto"]}; text-decoration: none">Ver mi museo</a></div>')
    return _raiz(f'''
{_cab(f'Color · opción {list(ACCENTS).index(key) + 1}', A['nombre'], A['nota'] + ' Solo aparece en lo que se toca: botones, nodo actual, barra y enlaces.')}
{ejemplo}
<div style="display: flex; flex-direction: column; gap: 12px">{_h2('El protagonista')}<div style="display: flex; flex-direction: column; gap: 10px">{filas_acc}</div></div>
<div style="display: flex; flex-direction: column; gap: 12px">{_h2('Paleta base, común a las tres')}<div style="display: flex; flex-direction: column; gap: 10px">{filas_base}</div></div>
{_nota('Contraste medido con la fórmula de accesibilidad web: 4,5:1 o más para texto. Los relieves y aros no llevan texto, así que no se miden.')}
''')


# ---------- preguntas ----------

def preguntas():
    def chips(items):
        return ''.join(f'<span style="display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 12px; border-radius: 99px; background: {BASE["blanco"]}; box-shadow: inset 0 0 0 1px {BASE["linea"]}; font-size: 14px; font-weight: 600">{t}</span>' for t in items)
    sw = lambda c: f'<span style="width: 14px; height: 14px; border-radius: 99px; background: {c}"></span>'
    qs = [
        ('¿Qué logo?', chips([logo(n, INK, ACCENTS[RECOMENDADA['color']]['base'], 22) + f'{n} · {LOGOS[n][0]}' for n in (1, 2, 3)])),
        ('¿Qué letra?', chips([f'{k} · {LETRAS[k]["corto"]}' for k in (1, 2, 3)])),
        ('¿Qué color protagonista?', chips([sw(ACCENTS[k]['base']) + ACCENTS[k]['nombre'] for k in ACCENTS] + ['Otro (dímelo)'])),
        ('¿Qué escenario para el camino?', chips(['Dibujado, como en las pantallas', 'Solo siluetas', 'Probarlo con Gemini'])),
        ('¿Qué rama abrimos primero?', chips(['Gótico', 'Maestros españoles', 'Las dos', 'Ninguna aún'])),
    ]
    items = ''.join(f'''
<div style="display: flex; flex-direction: column; gap: 10px; padding: 16px 0; border-top: 1px solid {BASE["linea"]}">
<span style="font-size: 17px; font-weight: 600; line-height: 1.3"><span style="display: inline-flex; width: 26px; height: 26px; border-radius: 99px; background: {INK}; color: #FFFFFF; align-items: center; justify-content: center; font-size: 13px; margin-right: 8px; vertical-align: 2px">{i + 1}</span>{q}</span>
<div style="display: flex; flex-wrap: wrap; gap: 8px">{c}</div></div>''' for i, (q, c) in enumerate(qs))
    r = RECOMENDADA
    return _raiz(f'''
{_cab('Para cerrar la ronda 2', 'Cinco preguntas', f'Contesta en una línea, por ejemplo: <strong>{r["logo"]} · {r["letra"]} · {ACCENTS[r["color"]]["nombre"].split()[0]} · Dibujado · Gótico</strong>. Y comenta encima de lo que quieras cambiar.')}
<div>{items}</div>
<div style="{CARD}; padding: 18px; display: flex; flex-direction: column; gap: 8px; box-shadow: inset 0 0 0 2px {ACCENTS[r["color"]]["base"]}">
<span style="font-size: 13px; font-weight: 600; color: {ACCENTS[r["color"]]["texto"]}">Mi propuesta</span>
<p style="margin: 0; font-size: 15px; line-height: 1.5">Logo <strong>{r["logo"]} · {LOGOS[r["logo"]][0]}</strong> (aguanta pequeño y de icono), letra <strong>{r["letra"]} · {LETRAS[r["letra"]]["corto"]}</strong> (la serif suave casa con la voz de museo) y color <strong>{ACCENTS[r["color"]]["nombre"]}</strong>, que es el que llevan las pantallas: conserva el calor del juego que elegiste, pero apagado, y es el que menos compite con los cuadros porque ya está en ellos, en la piel y en los cielos.</p>
</div>
''', 18)
