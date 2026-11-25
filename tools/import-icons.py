# Eigene Icons ins Spiel übernehmen.
#   python3 tools/import-icons.py ordner/mit/bildern
# Jede Datei <id>.png / .webp / .jpg (id wie in der Galerie, z. B. apfel.png, strandgrill.png) wird
# auf 256×256 (transparent, mittig, Seitenverhältnis bleibt) gebracht, als assets/icons/<id>.webp
# gespeichert und in assets/icons/index.json eingetragen. Unbekannte Namen werden nur gemeldet.
# Ein Icon wieder entfernen: Datei in assets/icons löschen und  python3 tools/import-icons.py --sync
import sys, os, json, re
from PIL import Image

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
out = os.path.join(root, 'assets', 'icons')
os.makedirs(out, exist_ok=True)

# gültige Namen = alle Item-IDs aus src/data.js und src/furni-data.js (grob per Regex, ohne Node)
known = set()
for f in ('src/data.js', 'src/furni-data.js'):
    known |= set(re.findall(r"^\s*([a-z_][a-z0-9_]*)\s*:\s*\{", open(os.path.join(root, f), encoding='utf-8').read(), re.M))

args = sys.argv[1:]
if args and args[0] != '--sync':
    src = args[0]
    for name in sorted(os.listdir(src)):
        base, ext = os.path.splitext(name)
        if ext.lower() not in ('.png', '.webp', '.jpg', '.jpeg'):
            continue
        if base not in known:
            print('⚠️  unbekannt, übersprungen:', name)
            continue
        im = Image.open(os.path.join(src, name)).convert('RGBA')
        box = im.getbbox()
        if box:
            im = im.crop(box)
        im.thumbnail((232, 232), Image.LANCZOS)
        canvas = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
        canvas.paste(im, ((256 - im.width) // 2, (256 - im.height) // 2), im)
        canvas.save(os.path.join(out, base + '.webp'), 'WEBP', quality=90, method=6)
        print('✔', base)

ids = sorted(f[:-5] for f in os.listdir(out) if f.endswith('.webp'))
json.dump(ids, open(os.path.join(out, 'index.json'), 'w'), indent=0)
print(f'assets/icons/index.json: {len(ids)} eigene Icons')
