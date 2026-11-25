# Eigene Icons ins Spiel übernehmen.
#   python3 tools/import-icons.py ordner/mit/bildern
# Jede Datei <id>.png / .webp / .jpg (id wie in der Galerie, z. B. apfel.png, strandgrill.png) wird
# auf 256×256 (transparent, mittig, Seitenverhältnis bleibt) gebracht, als assets/icons/<id>.webp
# gespeichert und in assets/icons/index.json eingetragen. Unbekannte Namen werden nur gemeldet.
# Ein Icon wieder entfernen: Datei in assets/icons löschen und  python3 tools/import-icons.py --sync
# Mit --rand bekommt jedes Bild einen weichen dunklen Umriss (gut lesbar auf dem Handy), z. B. für die Blender-Renderings:
#   python3 tools/import-icons.py --rand ordner
import sys, os, json, re
from PIL import Image, ImageFilter

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
out = os.path.join(root, 'assets', 'icons')
os.makedirs(out, exist_ok=True)

# gültige Namen = alle Item-IDs (mit Node aus src/data.js, sonst grob per Regex)
known = set()
try:
    import subprocess
    known = set(json.loads(subprocess.run(['node', '--input-type=module', '-e', "globalThis.document={createElement:()=>({getContext:()=>null})};const D=await import('./src/data.js');console.log(JSON.stringify(Object.keys(D.ITEMS)))"],
                                          cwd=root, capture_output=True, text=True, check=True).stdout))
except Exception:
    for f in ('src/data.js', 'src/furni-data.js'):
        known |= set(re.findall(r"^\s*([a-z_][a-z0-9_]*)\s*:\s*\{", open(os.path.join(root, f), encoding='utf-8').read(), re.M))

args = sys.argv[1:]
rand = '--rand' in args
args = [a for a in args if a != '--rand']

def outline(im, w=4, color=(84, 60, 52)):
    a = im.getchannel('A').point(lambda v: 255 if v > 40 else 0)
    ring = a.filter(ImageFilter.MaxFilter(2 * w + 1)).filter(ImageFilter.GaussianBlur(0.8))
    base = Image.new('RGBA', im.size, color + (0,))
    base.putalpha(ring)
    base.alpha_composite(im)
    return base

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
        im.thumbnail((224, 224) if rand else (232, 232), Image.LANCZOS)
        canvas = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
        canvas.paste(im, ((256 - im.width) // 2, (256 - im.height) // 2), im)
        if rand: canvas = outline(canvas)
        canvas.save(os.path.join(out, base + '.webp'), 'WEBP', quality=90, method=6)
        print('✔', base)

ids = sorted(f[:-5] for f in os.listdir(out) if f.endswith('.webp'))
json.dump(ids, open(os.path.join(out, 'index.json'), 'w'), indent=0)
print(f'assets/icons/index.json: {len(ids)} eigene Icons')
