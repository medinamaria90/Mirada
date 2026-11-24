"""Genera hojas de contacto numeradas para revisar visualmente las imágenes.
Uso: python3 -I contact_sheets.py <dir_full> <dir_salida> [por_hoja]"""
import sys, os
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]
per = int(sys.argv[3]) if len(sys.argv) > 3 else 20
os.makedirs(out, exist_ok=True)
nums = sorted(int(f[:-8]) for f in os.listdir(src) if f.endswith("full.jpg"))
cols, T = 5, 300
for s in range(0, len(nums), per):
    chunk = nums[s:s+per]
    rows = (len(chunk) + cols - 1) // cols
    sheet = Image.new("RGB", (cols*T, rows*(T+22)), "white")
    d = ImageDraw.Draw(sheet)
    for i, n in enumerate(chunk):
        im = Image.open(f"{src}/{n}full.jpg").convert("RGB"); im.thumbnail((T-6, T-6))
        x, y = (i % cols)*T, (i//cols)*(T+22)
        sheet.paste(im, (x+3, y+22))
        d.text((x+6, y+5), str(n), fill="red")
    sheet.save(f"{out}/sheet_{s//per:02d}.jpg", quality=80)
print(len(nums))
