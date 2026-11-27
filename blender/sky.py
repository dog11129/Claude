# Himmel und Kleintiere: Wolken, Regenbogen, Sonne und Mond (mit Gesicht), Schmetterlingsflügel, Fischschatten.
# Sonne/Mond schauen nach -Y (im Spiel zur Kamera gedreht), Größe 1 – das Spiel skaliert sie.
try:
    clear()
    random.seed(31)
    S = {}

    def cloud(i):
        m = Model('cloud_%d' % i)
        rnd = random.Random(40 + i)
        n = 4 + i % 3
        for j in range(n):
            x = (j - (n - 1) / 2) * 2.0 + rnd.uniform(-0.3, 0.3); r = 1.6 + rnd.random() * 1.4 - abs(j - (n - 1) / 2) * 0.25
            m.ball(r, 'white', x, rnd.uniform(-0.6, 0.6), r * 0.35, sz=0.78, seg=16, half=True)
            m.ball(r * 0.98, 0xE9F1FB, x, rnd.uniform(-0.6, 0.6), r * 0.36, sz=0.18, seg=14, rx=PI)  # flacher, bläulicher Boden
        for j in range(2 + i % 2):
            m.ball(1.4 + rnd.random() * 0.6, 'white', rnd.uniform(-1.5, 1.5), rnd.uniform(-0.4, 0.4), 1.6 + rnd.random() * 0.4, sz=0.8, seg=14)
        return m.build()

    def rainbow():
        m = Model('rainbow')
        cols = [0xFF5A5A, 0xFFA23A, 0xFFE14A, 0x6FDC6A, 0x5AB8FF, 0x6F6AFF, 0xB46AFF]
        for i, c in enumerate(cols):
            m.torus(60 - i * 1.6, 0.8, c, 0, 0, 0, seg=72, tseg=6, arc=PI, rx=PI / 2)
        for sx in (-1, 1):  # Wölkchen an den Füßen
            for j in range(5):
                m.ball(3.2 - j * 0.3, 'white', sx * (55.5 + (j - 2) * 2.6), 0.5, 4 + (j % 2) * 1.2, sz=0.75, seg=14)
        return m.build()

    def sun():
        m = Model('skysun')
        m.cyl(1.0, 1.0, 0.1, 0xFFD84A, 0, 0, 0, seg=40, rx=PI / 2, bev=0.04)
        m.cyl(0.82, 0.82, 0.12, 0xFFE57A, 0, -0.02, 0, seg=40, rx=PI / 2)
        for i in range(12):
            a = i * PI / 6
            m.ball(0.2, 0xFFC23A if i % 2 else 0xFFD84A, math.cos(a) * 1.25, 0.02, math.sin(a) * 1.25, sx=0.75, sy=0.25, sz=1.2, ry=-a + PI / 2, seg=10)
        for k in (-1, 1):
            m.ball(0.07, 'dark', k * 0.28, -0.1, 0.12, sy=0.3, sz=1.3, seg=8)
            m.ball(0.14, 0xFF9AA8, k * 0.45, -0.09, -0.12, sy=0.2, sz=0.65, seg=10)
        m.torus(0.13, 0.03, 0x7A3B3B, 0, -0.1, -0.12, seg=12, tseg=5, arc=PI, rx=PI / 2, ry=PI)
        return m.build()

    def moon():  # Sichel aus weichen Kugeln (dick in der Mitte, spitz an den Enden), schläft
        m = Model('skymoon')
        n = 18
        for i in range(n):
            t = i / (n - 1); a = math.radians(100 + t * 160)
            r = 0.36 * math.sin(PI * t) ** 0.7 + 0.05
            m.ball(r, 0xFFF4C8, math.cos(a) * 0.62, 0, math.sin(a) * 0.62, sy=0.35, seg=14)
        for x, z, r in ((-0.62, -0.32, 0.07), (-0.48, 0.42, 0.05)): m.ball(r, 0xEFE2B0, x, -0.12, z, sy=0.3, seg=8)
        m.torus(0.07, 0.016, 'dark', -0.66, -0.15, 0.06, seg=10, tseg=4, arc=PI, rx=PI / 2, ry=PI)  # geschlossenes Auge
        m.ball(0.07, 0xFF9AA8, -0.7, -0.13, -0.1, sy=0.25, sz=0.6, seg=8)
        for k in range(5):  # kleines Sternchen daneben
            a = k * 1.2566 + PI / 2
            m.ball(0.06, 0xFFF0A8, 0.45 + math.cos(a) * 0.05, 0, 0.55 + math.sin(a) * 0.05, sx=1.4, sy=0.3, sz=0.5, ry=-a + PI / 2, seg=6)
        return m.build()

    def wing():
        m = Model('bfly_wing')
        m.ball(0.065, 'white', 0.085, -0.028, 0, sx=1.05, sy=0.85, sz=0.08, seg=14)
        m.ball(0.048, 'white', 0.065, 0.035, 0, sx=1.0, sy=0.85, sz=0.08, seg=12)
        m.ball(0.022, 0xD8D8D8, 0.11, -0.035, 0.004, sz=0.1, seg=8)
        m.ball(0.014, 0xE6E6E6, 0.075, 0.04, 0.004, sz=0.1, seg=8)
        m.ball(0.014, 0x5A4A4A, 0.003, 0, 0.006, sy=3.0, sz=0.9, seg=8)  # halber Körper (zwei Flügel ergeben den ganzen)
        m.stick((0.004, -0.04, 0.008), (0.03, -0.085, 0.02), 0.003, 0x5A4A4A, seg=4)
        return m.build()

    def fish():
        m = Model('fishshadow')
        m.ball(0.85, 'white', 0, -0.15, 0, sx=0.9, sz=0.03, seg=20)
        m.ball(0.42, 'white', 0, 0.85, 0, sx=0.8, sy=0.5, sz=0.03, seg=12)
        for k in (-1, 1): m.ball(0.38, 'white', k * 0.22, 1.25, 0, sx=0.45, sy=1.0, sz=0.03, rz=k * 0.5, seg=10)  # Schwanzflosse
        return m.build()

    def bunting():  # Wimpelkette über der Bummelgasse (26 Wimpel, im Spiel zweimal)
        m = Model('bunting')
        cols = [0xFF6B8A, 0xFFD23F, 0x6CC4FF, 0x8FD694, 0xB39CFF]
        pts = [(-13.5 + i * 0.5, 0, 3.4 - math.sin((i * 0.5) / 27 * PI) * 0.55) for i in range(55)]
        for a_, b_ in zip(pts, pts[1:]): m.stick(a_, b_, 0.012, 0xFFF6EA, seg=4)
        for i in range(26):
            x = -13 + i * 1.04; z = 3.4 - math.sin(i / 25 * PI) * 0.5
            m.ball(0.14, cols[i % 5], x, 0, z - 0.14, sx=0.95, sy=0.12, sz=1.0, taper=-0.9, seg=10)
            m.ball(0.02, 0xFFFFFF, x, -0.02, z - 0.1, sy=0.3, seg=6)
        return m.build()
    o = bunting(); S[o.name] = o
    for i in range(4): o = cloud(i); S[o.name] = o
    for f in (rainbow, sun, moon, wing, fish): o = f(); S[o.name] = o
    names = list(S)
    path = export([S[n] for n in names], 'sky')

    def vis(o, show):
        for ob in [o] + list(o.children_recursive): ob.hide_render = not show
    for o in S.values(): vis(o, False)
    sel = [S[n] for n in ('cloud_0', 'cloud_1', 'skysun', 'skymoon')]
    for o in sel: vis(o, True)
    sc = {'cloud_0': 0.25, 'cloud_1': 0.25, 'skysun': 1, 'skymoon': 1}
    for o in sel: o.scale = (sc[o.name],) * 3
    old = arrange(sel, cols=4, gap=3.2)
    for o in sel: o.location.z = 1.6
    stage(target=(0, 0, 1.4), dist=9, el=8, lens=40)
    out = render('himmel')
    for o, p in zip(sel, old): o.location = p; o.scale = (1, 1, 1)
    tris = {n: sum(len(p.vertices) - 2 for ob in [S[n]] + list(S[n].children_recursive) if ob.type == 'MESH' for p in ob.data.polygons) for n in names}
    log({'ok': True, 'glb': path, 'size': os.path.getsize(path), 'renders': [out], 'tris': tris})
except Exception:
    log({'ok': False, 'error': traceback.format_exc()})
