# Icons für das neue Overlay: kleine 3D-Figuren, einzeln gerendert (256×256, transparent) nach kuschel3d/ui/*.png
try:
    clear('KIcons')
    random.seed(3)
    I = {}

    def icon(name):
        m = Model('ic_' + name); I[name] = m; return m

    m = icon('phone')
    m.puff(0.9, 0.22, 1.5, 'rose', 0, 0, -0.75, soft=0.3, taper=0)
    m.puff(0.7, 0.05, 1.1, 0x9FE6D2, 0, -0.11, -0.6, soft=0.35, taper=0)
    for i, c in enumerate(('yellow', 'sky', 'pink', 'leaf')): m.puff(0.2, 0.04, 0.2, c, -0.15 + (i % 2) * 0.3, -0.14, -0.02 - (i // 2) * 0.3 + 0.05, soft=0.4, taper=0)
    m.ball(0.07, 'white', 0, -0.13, -0.62, sy=0.4, seg=10)

    m = icon('bag')
    m.puff(1.2, 0.8, 1.15, 'orange', 0, 0, -0.65, soft=0.32, taper=0.1)
    m.ball(0.6, 0xFFB86B, 0, -0.05, 0.42, sx=1.0, sy=0.75, sz=0.55, half=True, seg=18, rx=PI)
    m.puff(0.6, 0.12, 0.45, 'yellow', 0, -0.42, -0.5, soft=0.4, taper=0)
    m.ball(0.07, 'woodD', 0, -0.48, -0.15, seg=10)
    m.torus(0.28, 0.06, 'woodD', 0, 0, 0.55, rx=PI / 2, arc=PI, seg=16)

    m = icon('friends')
    for x, c, h in ((-0.35, 'rose', 0xFFD8BC), (0.38, 'sky', 0xFFE3CC)):
        m.ball(0.38, c, x, 0, -0.55, sz=0.8, seg=16)
        m.ball(0.33, h, x, 0, 0.0, seg=18)
        m.ball(0.34, 0x6B4428 if x < 0 else 0xE0673A, x, 0.05, 0.08, half=True, rx=-0.6, seg=18)
        for k in (-1, 1): m.ball(0.04, 'black', x + k * 0.11, -0.3, 0.0, sy=0.5, seg=8)
    m.heart(0.38, 'red', 0.02, -0.4, 0.62)

    m = icon('chat')
    m.puff(1.5, 0.45, 1.0, 'white', 0, 0, -0.45, soft=0.3, taper=0)
    m.cone(0.22, 0.4, 'white', -0.4, 0, -0.55, seg=10, ry=-0.6, rx=PI)
    for x in (-0.4, 0, 0.4): m.ball(0.11, 'sky', x, -0.25, 0.05, sy=0.5, seg=12)

    m = icon('emote')
    m.ball(0.72, 'yellow', 0, 0, 0, seg=24)
    for k in (-1, 1):
        m.ball(0.09, 'black', k * 0.24, -0.62, 0.12, sx=0.8, sy=0.5, sz=1.2, seg=10)
        m.ball(0.12, 'blush', k * 0.42, -0.56, -0.12, sy=0.4, sz=0.7, seg=10)
    m.torus(0.17, 0.045, 'dark', 0, -0.66, -0.12, arc=PI, rx=PI / 2, ry=PI, seg=14)

    m = icon('camera')
    m.puff(1.5, 0.7, 1.0, 'sky', 0, 0, -0.5, soft=0.3, taper=0)
    m.puff(0.5, 0.5, 0.3, 'blueD', -0.35, 0, 0.35, soft=0.4, taper=0)
    m.cyl(0.36, 0.36, 0.3, 'white', 0.1, -0.35, -0.05, seg=24, rx=PI / 2, bev=0.06)
    m.cyl(0.24, 0.24, 0.32, 'dark', 0.1, -0.38, -0.05, seg=24, rx=PI / 2)
    m.ball(0.07, 'white', 0.02, -0.55, 0.03, seg=8)
    m.ball(0.09, 'red', 0.55, -0.3, 0.3, seg=10)

    m = icon('settings')
    m.cyl(0.6, 0.6, 0.3, 'mint', 0, 0, 0, seg=32, rx=PI / 2, bev=0.07)
    for i in range(8):
        a = i * PI / 4
        m.puff(0.26, 0.3, 0.3, 'mint', math.sin(a) * 0.7, 0, math.cos(a) * 0.7 - 0.15, soft=0.4, taper=0, rz=0)
    m.cyl(0.22, 0.22, 0.34, 'white', 0, -0.02, 0, seg=24, rx=PI / 2, bev=0.04)

    m = icon('rotate')
    m.torus(0.55, 0.13, 'leaf', 0, 0, 0, arc=PI * 1.5, rx=PI / 2, ry=0.4, seg=24)
    m.cone(0.28, 0.4, 'leaf', 0.55 * math.cos(0.4), 0, -0.55 * math.sin(0.4) - 0.1, seg=12, rx=0)

    m = icon('sky')
    m.cyl(0.18, 0.24, 1.3, 'blueD', 0, 0, 0.15, seg=16, rx=0.9, bev=0.05)
    m.cyl(0.27, 0.27, 0.12, 'yellow', 0, 0.48, 0.55, seg=16, rx=0.9)
    for a in (0, 2.1, 4.2): m.stick((0, 0, -0.2), (math.sin(a) * 0.5, math.cos(a) * 0.3, -0.85), 0.05, 'woodD')
    m.cone(0.13, 0.26, 'yellow', 0.55, -0.2, 0.75, seg=4); m.ball(0.06, 'yellow', -0.6, -0.2, 0.6, seg=8)

    m = icon('coin')
    m.cyl(0.62, 0.62, 0.2, 'yellow', 0, 0, 0, seg=32, rx=PI / 2, bev=0.06)
    m.cyl(0.46, 0.46, 0.22, 0xF2C230, 0, 0, 0, seg=32, rx=PI / 2)
    for k in range(5):
        a = k * 2 * PI / 5
        m.cone(0.09, 0.32, 'yellow', math.sin(a) * 0.15, -0.12, math.cos(a) * 0.15, seg=4, ry=a)

    m = icon('star')
    for k in range(5):
        a = k * 2 * PI / 5
        m.cone(0.3, 0.75, 'yellow', math.sin(a) * 0.32, 0, math.cos(a) * 0.32, seg=6, ry=a)
    m.ball(0.42, 'yellow', 0, 0, 0, sy=0.55, seg=16)
    for k in (-1, 1): m.ball(0.05, 'black', k * 0.12, -0.22, 0.05, sy=0.5, seg=8)

    m = icon('sun')
    m.ball(0.5, 'yellow', 0, 0, 0, seg=20)
    for k in range(8):
        a = k * PI / 4
        m.cone(0.13, 0.3, 'orange', math.sin(a) * 0.7, 0, math.cos(a) * 0.7, seg=8, ry=a)
    for k in (-1, 1): m.ball(0.05, 'black', k * 0.15, -0.45, 0.06, sy=0.5, seg=8); m.ball(0.07, 'blush', k * 0.27, -0.42, -0.08, sy=0.4, seg=8)

    m = icon('moon')
    m.torus(0.42, 0.24, 0xFFE48A, 0.05, 0, 0, arc=PI * 1.15, rx=PI / 2, ry=PI * 0.55, seg=20, tseg=12)
    for k in (-1, 1): m.ball(0.035, 'dark', -0.42 + k * 0.07, -0.22, 0.05, sy=0.5, seg=8)
    m.ball(0.05, 'blush', -0.38, -0.22, -0.08, sy=0.4, seg=8)
    m.cone(0.08, 0.2, 'yellow', 0.45, -0.1, 0.55, seg=4); m.ball(0.05, 'yellow', 0.6, -0.1, -0.3, seg=8)

    m = icon('hand')
    m.puff(0.75, 0.35, 0.7, 'skin', 0, 0, -0.55, soft=0.4, taper=0.05)
    for i in range(4):
        x = -0.27 + i * 0.18
        m.stick((x, 0, 0.05), (x, -0.03, 0.4 - abs(i - 1.5) * 0.08), 0.085, 'skin')
        m.ball(0.085, 'skin', x, -0.03, 0.4 - abs(i - 1.5) * 0.08, seg=10)
    m.stick((0.32, 0, -0.35), (0.55, -0.02, -0.05), 0.09, 'skin'); m.ball(0.09, 'skin', 0.55, -0.02, -0.05, seg=10)
    m.puff(0.8, 0.4, 0.18, 'rose', 0, 0, -0.75, soft=0.4, taper=0)

    m = icon('net')
    m.stick((0.1, 0, -0.9), (-0.2, 0, 0.0), 0.06, 'wood')
    m.torus(0.42, 0.06, 'white', -0.35, 0, 0.4, rx=PI / 2, ry=0.3, seg=24)
    m.ball(0.42, 0xEAF6FF, -0.35, 0.08, 0.4, sy=0.4, seg=16)
    m.ball(0.1, 'yellow', -0.3, -0.12, 0.5, sx=1.3, sy=0.3, seg=10); m.ball(0.06, 'sky', -0.42, -0.1, 0.3, seg=8)

    m = icon('shovel')
    m.stick((0.25, 0, 0.85), (-0.05, 0, -0.15), 0.06, 'wood')
    m.torus(0.13, 0.05, 'wood', 0.3, 0, 0.95, rx=PI / 2, seg=12)
    m.ball(0.38, 0xB9C4CF, -0.18, 0, -0.5, sx=0.85, sy=0.25, sz=1.15, seg=16, soft=0.7)

    m = icon('axe')
    m.stick((0.3, 0, -0.85), (-0.15, 0, 0.75), 0.065, 'wood')
    m.puff(0.55, 0.16, 0.5, 0xB9C4CF, -0.35, 0, 0.45, soft=0.35, taper=0.4, rz=0)
    m.puff(0.5, 0.17, 0.12, 'red', -0.05, 0, 0.45, soft=0.4, taper=0)

    m = icon('can')
    m.cyl(0.45, 0.5, 0.75, 'sky', 0, 0, -0.35, seg=24, bev=0.06)
    m.stick((0.4, 0, -0.45), (0.95, 0, 0.15), 0.08, 'sky', 0.06)
    m.cyl(0.12, 0.07, 0.15, 'blueD', 1.0, 0, 0.2, seg=12, ry=-0.8)
    m.torus(0.3, 0.06, 'blueD', -0.15, 0, 0.1, rx=PI / 2, arc=PI, seg=16)
    m.heart(0.3, 'white', 0, -0.48, -0.35)

    m = icon('sling')
    m.stick((0, 0, -0.9), (0, 0, -0.1), 0.08, 'wood')
    for k in (-1, 1): m.stick((0, 0, -0.15), (k * 0.4, 0, 0.6), 0.075, 'wood')
    m.torus(0.42, 0.03, 'red', 0, 0, 0.45, rx=PI / 2, arc=PI, ry=PI, seg=14)
    m.ball(0.12, 'stone', 0, -0.02, 0.1, seg=10)

    m = icon('pave')
    for i, c in enumerate((0xD9826A, 0xE6A08A, 0xD9826A, 0xC9705A)):
        m.puff(0.62, 0.62, 0.28, c, -0.33 + (i % 2) * 0.66, (i // 2) * 0.66 - 0.33, -0.3 + (i % 2) * 0.05, soft=0.4, taper=0)
    m.stick((0.3, -0.3, 0.1), (0.7, -0.5, 0.9), 0.06, 'wood'); m.puff(0.32, 0.2, 0.3, 'yellow', 0.27, -0.28, -0.05, soft=0.4, taper=0)

    objs = {}
    for k, mm in I.items():
        o = mm.build('KIcons'); objs[k] = o
    # Rendern: jedes Icon einzeln, transparent, Studio-Licht
    sc = bpy.context.scene
    kc = bpy.data.collections.get('Kuschel')
    if kc: kc.hide_render = True
    stage(target=(0, 0, 0), dist=10, el=18, az=22, lens=50, res=(256, 256), ortho=2.7)
    for n in ('K_Ground', 'K_Path'):
        o = bpy.data.objects.get(n)
        if o: o.hide_render = True
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    bpy.data.objects['K_Sun'].data.energy = 2.0
    sc.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0
    os.makedirs(os.path.join(OUT, 'ui'), exist_ok=True)
    for k, o in objs.items(): o.hide_render = True
    outs = []
    for k, o in objs.items():
        o.hide_render = False
        for ch in o.children_recursive: ch.hide_render = False
        outs.append(render(os.path.join('ui', k)))
        o.hide_render = True
        for ch in o.children_recursive: ch.hide_render = True
    sc.render.film_transparent = False
    if kc: kc.hide_render = False
    log({'ok': True, 'icons': outs})
except Exception:
    log({'ok': False, 'error': traceback.format_exc()})
