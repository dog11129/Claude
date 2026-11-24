# App-Symbole aus dem Blender-Rendering (appicon.png, transparenter Hintergrund) bauen.
#   python3 tools/icons.py pfad/zu/appicon.png
# Schreibt icon-192.png, icon-512.png, icon-maskable-512.png und apple-touch-icon.png ins Projekt.
import sys, os, math, random
from PIL import Image, ImageDraw, ImageFilter

src = Image.open(sys.argv[1]).convert('RGBA')
art = src.crop(src.getbbox())
root = os.path.join(os.path.dirname(__file__), '..')

def background(n):
    # weicher Verlauf von zartem Rosa (oben) zu Pfirsich (unten), dazu ein heller Schein in der Mitte
    top, bot = (255, 236, 243), (255, 200, 214)
    bg = Image.new('RGB', (n, n))
    px = bg.load()
    for y in range(n):
        t = y / (n - 1)
        for x in range(n):
            d = math.hypot(x / n - 0.5, y / n - 0.45)
            glow = max(0, 1 - d * 2.2) * 0.35
            c = [a + (b - a) * t for a, b in zip(top, bot)]
            px[x, y] = tuple(int(min(255, v + (255 - v) * glow)) for v in c)
    # ein paar Glitzerpunkte
    d = ImageDraw.Draw(bg)
    rnd = random.Random(7)
    for _ in range(14):
        x, y, r = rnd.random() * n, rnd.random() * n * 0.55, n * (0.006 + rnd.random() * 0.008)
        d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 255, 255))
    return bg

def make(n, fill, name):
    bg = background(n).convert('RGBA')
    s = fill * n / max(art.size)
    a = art.resize((round(art.width * s), round(art.height * s)), Image.LANCZOS)
    x, y = (n - a.width) // 2, (n - a.height) // 2 + round(n * 0.02)
    # weicher Schatten unter der Insel
    sh = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse((x + a.width * 0.12, y + a.height * 0.86, x + a.width * 0.88, y + a.height * 1.02), fill=(200, 110, 140, 70))
    bg = Image.alpha_composite(bg, sh.filter(ImageFilter.GaussianBlur(n * 0.02)))
    bg.alpha_composite(a, (x, y))
    bg.convert('RGB').save(os.path.join(root, name), optimize=True)

make(512, 0.8, 'icon-512.png')
make(192, 0.8, 'icon-192.png')
make(180, 0.76, 'apple-touch-icon.png')
make(512, 0.6, 'icon-maskable-512.png')
print('ok')
