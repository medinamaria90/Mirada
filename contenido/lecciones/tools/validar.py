import json, os, re, sys, unicodedata
from collections import Counter
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAT = os.path.join(os.path.dirname(os.path.dirname(BASE)), 'app', 'data', 'catalog.json')
cat = json.load(open(CAT, encoding='utf-8'))
art = {w['id']: w['artistId'] for w in cat['artworks']}
artists = {a['id']: a for a in cat['artists']}
etapa = {a['id'] for a in cat['artists'] if not a['guest']}
errs = []; warns = []
def e(m): errs.append(m)
def norm(s): return unicodedata.normalize('NFD', s.lower()).encode('ascii', 'ignore').decode()
KINDS = ('tecnica', 'vida', 'obra', 'epoca')
for fn in sorted(os.listdir(BASE)):
    if not fn.endswith('.json'): continue
    try: d = json.load(open(os.path.join(BASE, fn), encoding='utf-8'))
    except Exception as ex: e(f'{fn}: JSON inválido {ex}'); continue
    aid = d.get('artistId')
    if aid != fn[:-5] or aid not in etapa: e(f'{fn}: artistId inválido')
    if set(d.keys()) != {'artistId', 'cards'}: e(f'{fn}: claves {list(d.keys())}')
    cards = d['cards']
    if not 10 <= len(cards) <= 12: e(f'{aid}: {len(cards)} tarjetas (10-12)')
    ids = [c['id'] for c in cards]
    if len(set(ids)) != len(ids): e(f'{aid}: ids repetidos')
    # palabras del nombre que delatan
    a = artists[aid]
    toks = {norm(t) for t in re.split(r'[\s-]+', a['name']+' '+a['short']+' '+aid) if len(t) > 3}
    toks |= {'da vinci'} if aid == 'leonardo' else set()
    nclue = 0; kinds = Counter(); cl_by_kind = Counter()
    for c in cards:
        w = c.get('id', '?')
        if not re.fullmatch(re.escape(aid) + r'-c\d+', w): e(f'{w}: formato de id')
        if c['kind'] not in KINDS: e(f'{w}: kind')
        kinds[c['kind']] += 1
        if len(c['title']) > 40: e(f'{w}: title {len(c["title"])}>40')
        if len(c['text']) > 220: e(f'{w}: text {len(c["text"])}>220')
        blob = c['title'] + ' ' + c['text'] + ' ' + c.get('clue', '')
        if re.search(r'\b(ayer|mañana)\b', blob, re.I): e(f'{w}: ayer/mañana')
        if '!' in blob or '¡' in blob or '¿Sabías' in blob: e(f'{w}: exclamación/sabías')
        s = c.get('sources')
        if not s or not all(isinstance(u, str) and u.startswith('http') for u in s): e(f'{w}: sin fuente')
        x = c.get('artworkId')
        if c['kind'] == 'obra' and not x: e(f'{w}: obra sin artworkId')
        if c['kind'] == 'tecnica' and not x: warns.append(f'{w}: tecnica sin artworkId (recomendable)')
        if x:
            if x not in art: e(f'{w}: artworkId {x} no existe')
            elif art[x] != aid: e(f'{w}: {x} es de {art[x]}')
        if 'clue' in c:
            nclue += 1; cl_by_kind[c['kind']] += 1
            cl = c['clue']
            if len(cl) > 90: e(f'{w}: clue {len(cl)}>90')
            if not cl.startswith('¿') or not cl.endswith('?'): e(f'{w}: clue sin ¿?')
            if any(t in norm(cl) for t in toks): e(f'{w}: clue delata el nombre')
            dc = c.get('decoys')
            if not isinstance(dc, list) or not 2 <= len(dc) <= 4: e(f'{w}: decoys 2-4')
            else:
                for q in dc:
                    if q not in etapa: e(f'{w}: decoy {q} no existe o no tiene etapa')
                    if q == aid: e(f'{w}: decoy es el propio pintor')
                if len(set(dc)) != len(dc): e(f'{w}: decoys repetidos')
        elif 'decoys' in c: e(f'{w}: decoys sin clue')
    if nclue < 0.6 * len(cards): e(f'{aid}: pocas pistas ({nclue}/{len(cards)})')
    print(f'{aid}: {len(cards)} tarjetas, {nclue} con pista, tipos {dict(kinds)}, pistas por tipo {dict(cl_by_kind)}')
for m in warns: print('AVISO', m)
print('ERRORES:' if errs else 'OK sin errores')
for m in errs: print(' -', m)
sys.exit(1 if errs else 0)
