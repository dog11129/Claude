# Natur der Kuschelinsel: Laubbäume (4 Jahreszeiten), Palme, Obst, Felsen, Muscheln, Unkraut, Stern-Risse.
# Ursprung = Kachelmitte am Boden, Vorderseite -Y. Baumkronen und Palmwedel wiegen sich (Keyframe-Loop).
# Obst wird im Spiel an feste Stellen der Krone gesetzt (fruit_<art>, Ursprung = Mitte der Frucht).
try:
    clear()
    random.seed(21)
    N = {}

    def on_ball(cx, cy, cz, r, a, e, sz=1.0):
        return (cx + math.cos(a) * math.cos(e) * r, cy + math.sin(a) * math.cos(e) * r, cz + math.sin(e) * r * sz)

    # ---------- Laubbaum ----------
    LEAVES = {
        'spring': [0x77D35E, 0x8EE06C, 0x63C252, 0xA8EC86],
        'summer': [0x55B84A, 0x6BC957, 0x47A642, 0x8BD86A],
        'autumn': [0xF4A63C, 0xEC8435, 0xF7C64E, 0xF9D77A],
        'winter': [0x4C9A55, 0x5BAA60, 0x3F8A4C, 0x74BE76],
    }
    def tree(season):
        L = LEAVES[season]
        m = Model('tree_' + season)
        # Stamm mit Wurzelfüßchen
        m.cyl(0.12, 0.19, 1.05, 'bark', 0, 0, 0.52, seg=14, bev=0.03)
        for i in range(4):
            a = i * PI / 2 + 0.4
            m.ball(0.13, 'bark', math.cos(a) * 0.17, math.sin(a) * 0.17, 0.05, sx=1.5, sy=0.9, sz=0.55, rz=a, seg=10)
        m.stick((0.02, 0, 0.75), (0.3, -0.05, 1.12), 0.07, 'bark', 0.045, seg=8)
        m.stick((-0.02, 0, 0.8), (-0.3, 0.1, 1.15), 0.07, 'bark', 0.045, seg=8)
        m.ball(0.05, 'woodD', 0.0, -0.17, 0.42, sx=0.9, sy=0.5, sz=1.2, seg=10)  # kleines Astloch
        # Krone als eigenes Teil (wiegt sich im Wind)
        c = m.part('crown', (0, 0, 1.0), ('sway', 'x', 0.022, 4.2))
        CZ = 1.62
        c.ball(0.92, L[0], 0, 0, CZ, sz=0.92, seg=18, bump=0.05)
        for i in range(9):
            a = i / 9 * 2 * PI + random.random() * 0.4; e = (random.random() - 0.35) * 1.1
            x, y, z = on_ball(0, 0, CZ, 0.78, a, e, 0.85)
            c.ball(0.42 + random.random() * 0.12, L[i % 3], x, y, z, sz=0.9, seg=14, bump=0.06)
        c.ball(0.46, L[1], 0, 0, CZ + 0.78, sz=0.8, seg=14, bump=0.05)
        # helle Glanzpolster vorne-oben
        for a, e in ((-1.9, 0.5), (-1.2, 0.75), (-2.4, 0.25), (-0.7, 0.35)):
            x, y, z = on_ball(0, 0, CZ, 1.0, a, e, 0.85)
            c.ball(0.2, L[3], x, y, z, sz=0.7, seg=10)
        if season == 'spring':  # Blütentupfer
            for i in range(34):
                a = i * 2.39996; e = -0.3 + (i % 9) / 9 * 1.4
                x, y, z = on_ball(0, 0, CZ, 1.05, a, e, 0.86)
                c.ball(0.1, 0xFFB8D2 if i % 3 else 0xFFFFFF, x, y, z, sz=0.75, seg=8)
                if i % 3 == 0: c.ball(0.03, 'yellow', x * 1.02, y * 1.02, z + 0.01, seg=6)
        if season == 'autumn':  # ein paar rote Blätter
            for i in range(14):
                a = i * 2.39996; e = -0.2 + (i % 7) / 7 * 1.2
                x, y, z = on_ball(0, 0, CZ, 1.03, a, e, 0.86)
                c.ball(0.09, 0xD9583A, x, y, z, sx=1.3, sz=0.45, rz=a, seg=8)
        return m.build()

    # ---------- Palme ----------
    def palm():
        m = Model('palm')
        x = 0; z = 0
        for i in range(8):  # leicht gebogener Ringel-Stamm
            nx = i * i * 0.011; nz = (i + 0.5) * 0.34
            m.cyl(0.12 - i * 0.006, 0.145 - i * 0.006, 0.36, 0xC08E5A if i % 2 else 0xA97B4C, nx, 0, nz, seg=12, bev=0.04, ry=0.03 * i)
            x, z = nx, nz + 0.17
        m.ball(0.2, 0xA97B4C, 0, 0, 0.04, sx=1.3, sy=1.3, sz=0.4, seg=12)
        f = m.part('fronds', (x, 0, z), ('sway', 'y', 0.05, 5.0))
        f.ball(0.18, 0x6AA84A, x, 0, z + 0.05, sz=0.8, seg=12)
        for i in range(7):
            a = i / 7 * 2 * PI + 0.2
            for k in range(8):  # dicht überlappende Polster = ein durchgehender, hängender Wedel
                t = (k + 0.5) / 8; d = 0.1 + t * 1.25; dz = 0.16 - t * t * 0.75
                f.ball(0.3 * (1 - t * 0.55), 0x58B84C if (k + i) % 2 else 0x6CC65A, x + math.cos(a) * d, math.sin(a) * d, z + dz, sx=1.35, sy=0.95, sz=0.2, rz=a, ry=0.25 * t, seg=10)
        return m.build()

    # ---------- Obst (Ursprung = Mitte) ----------
    def fruit(kind):
        m = Model('fruit_' + kind)
        if kind == 'apfel':
            m.ball(0.13, 0xF2474A, 0, 0, 0, sz=0.92, seg=14); m.ball(0.035, 0xFFB0B0, -0.05, -0.09, 0.05, seg=6)
        elif kind == 'birne':
            m.ball(0.12, 0xC9D84A, 0, 0, -0.03, seg=14); m.ball(0.085, 0xC9D84A, 0, 0, 0.09, seg=12); m.ball(0.03, 0xF1F7B0, -0.05, -0.08, 0.0, seg=6)
        elif kind == 'orange':
            m.ball(0.13, 0xFFA21F, 0, 0, 0, seg=14, bump=0.03); m.ball(0.035, 0xFFE0A8, -0.05, -0.09, 0.05, seg=6)
        elif kind == 'pfirsich':
            m.ball(0.13, 0xFFA98A, 0, 0, 0, seg=14); m.ball(0.07, 0xFF7F7F, 0.06, -0.07, 0.02, sy=0.5, seg=8)
        elif kind == 'kirsche':
            for k in (-1, 1): m.ball(0.085, 0xD8102C, k * 0.075, 0, -0.06, seg=12); m.ball(0.022, 0xFF9AA8, k * 0.075 - 0.03, -0.06, -0.03, seg=6)
            m.stick((-0.075, 0, 0.0), (0, 0, 0.13), 0.012, 'leafD', seg=5); m.stick((0.075, 0, 0.0), (0, 0, 0.13), 0.012, 'leafD', seg=5)
        elif kind == 'kokosnuss':
            m.ball(0.14, 0x7A4E2E, 0, 0, 0, sz=0.95, seg=14, bump=0.06)
            for k in range(3): m.ball(0.018, 0x3E2A1C, math.cos(k * 2.1) * 0.05, -0.12, 0.03 + math.sin(k * 2.1) * 0.03, seg=6)
        elif kind == 'banane':
            for b in range(3):  # drei gebogene Bananen am Stiel
                yaw = (b - 1) * 0.55
                for k in range(7):
                    t = k / 6; ang = -1.0 + t * 1.6
                    px, pz = math.sin(ang) * 0.17, 0.12 - math.cos(ang) * 0.17
                    r = 0.042 * (1 - abs(t - 0.5) * 0.9)
                    m.ball(r, 0xFFE05A if k < 6 else 0x8A6A3A, px * math.cos(yaw), px * math.sin(yaw) - 0.02 * b, pz, seg=10)
            m.cyl(0.022, 0.026, 0.1, 0x9BC24A, -0.15, 0, 0.1, seg=8, ry=-0.4)
        elif kind == 'mango':
            m.ball(0.13, 0xFFA03C, 0, 0, 0, sx=0.85, sz=1.05, seg=14); m.ball(0.08, 0xF56A4A, 0.05, -0.06, 0.04, sy=0.5, seg=8)
        if kind not in ('kirsche', 'kokosnuss', 'banane'):
            m.cyl(0.012, 0.016, 0.07, 'woodD', 0, 0, 0.14, seg=6)
            m.ball(0.06, 'leaf', 0.05, 0, 0.16, sx=1.4, sy=0.35, sz=0.7, ry=-0.5, seg=8)
        return m.build()

    # ---------- Felsen ----------
    def rock(small):
        s = 0.72 if small else 1.0
        m = Model('rock_small' if small else 'rock')
        m.ball(0.52 * s, 0xB4AEA6, 0, 0, 0.3 * s, sx=1.18, sy=1.0, sz=0.78, seg=18, soft=0.7, bump=0.1)
        m.ball(0.3 * s, 0xC6C1B9, 0.38 * s, -0.18 * s, 0.17 * s, sz=0.75, seg=14, soft=0.75, bump=0.1)
        m.ball(0.24 * s, 0x9E978F, -0.4 * s, -0.1 * s, 0.13 * s, sz=0.72, seg=12, soft=0.75, bump=0.1)
        m.ball(0.16 * s, 0xD6D1CA, -0.12 * s, -0.36 * s, 0.5 * s, sx=1.3, sy=0.6, sz=0.5, seg=10)  # Glanzstelle
        if not small:
            m.ball(0.14, 'leaf', -0.22, 0.05, 0.62, sx=1.5, sz=0.45, seg=10, bump=0.15)  # Moospolster
            m.ball(0.05, 0xFFFFFF, -0.2, -0.05, 0.7, seg=8); m.ball(0.02, 'yellow', -0.2, -0.09, 0.72, seg=6)
        return m.build()

    # ---------- Muscheln ----------
    def shell(kind):
        m = Model('shell_' + kind)
        if kind == 'herzmuschel':
            m.ball(0.13, 0xFFC7D6, 0, 0, 0.0, sy=1.1, sz=0.5, seg=16, half=True)
            for i in range(5):  # Rippen auf der Schale, fächerförmig vom Scharnier
                a = (i - 2) * 0.36
                m.ball(0.1, 0xFFA9BF, -math.sin(a) * 0.035, 0.035 - math.cos(a) * 0.035, 0.0, sx=0.16, sy=1.0, sz=0.66, rz=a, seg=10, half=True)
            for k in (-1, 1): m.ball(0.03, 0xFFB0C4, k * 0.035, 0.13, 0.0, sx=1.2, sz=0.6, seg=8, half=True)
        elif kind == 'kauri':
            m.ball(0.1, 0xF7E7D6, 0, 0, 0.05, sx=0.8, sy=1.25, sz=0.65, seg=14)
            m.ball(0.05, 0xD9A97E, 0.03, -0.02, 0.09, sx=0.5, sy=1.6, sz=0.4, seg=8)
            m.box(0.012, 0.16, 0.012, 0x9B7A5E, 0, 0, 0.115, r=0.005)
        elif kind == 'jakobsmuschel':
            for i in range(7):
                a = (i - 3) * 0.26
                m.ball(0.05, 0xFFB98A if i % 2 else 0xFF9F6B, math.sin(a) * 0.09, -math.cos(a) * 0.09 + 0.05, 0.025, sx=0.6, sy=1.9, sz=0.45, rz=a, seg=8)
            for k in (-1, 1): m.ball(0.035, 0xFF9F6B, k * 0.04, 0.08, 0.02, sz=0.5, seg=8)
        elif kind == 'sanddollar':
            m.cyl(0.13, 0.13, 0.03, 0xF3E3C3, 0, 0, 0.015, seg=20, bev=0.012)
            for i in range(5):
                a = i / 5 * 2 * PI
                m.ball(0.035, 0xE0C49A, math.cos(a) * 0.055, math.sin(a) * 0.055, 0.033, sx=1.6, sy=0.7, sz=0.3, rz=a, seg=8)
        elif kind == 'koralle':
            m.cyl(0.035, 0.045, 0.2, 0xFF6F7D, 0, 0, 0.1, seg=8)
            for a, h in ((0.7, 0.16), (-0.8, 0.14), (2.5, 0.12)):
                tip = (math.cos(a) * 0.08, math.sin(a) * 0.05, 0.12 + h)
                m.stick((0, 0, 0.12), tip, 0.026, 0xFF8A95, 0.02, seg=6); m.ball(0.032, 0xFFA6B0, *tip, seg=8)
            m.ball(0.036, 0xFFA6B0, 0, 0, 0.21, seg=8)
        elif kind == 'sternsplitter':
            for i in range(5):
                a = i / 5 * 2 * PI
                m.ball(0.06, 0xFFE36B, math.cos(a) * 0.08, math.sin(a) * 0.08, 0.04, sx=1.6, sy=0.65, sz=0.45, rz=a, seg=8)
            m.ball(0.07, 0xFFF3A8, 0, 0, 0.05, sz=0.6, seg=10, glow=True)
        return m.build()

    def weed():
        m = Model('weed')
        for i in range(7):
            a = i * 0.9; h = 0.26 + (i % 3) * 0.06
            m.stick((math.cos(a) * 0.03, math.sin(a) * 0.03, 0), (math.cos(a) * 0.13, math.sin(a) * 0.13, h), 0.035, 0x4E9E3A if i % 2 else 0x63B247, 0.004, seg=5)
        m.ball(0.04, 0xFFFFFF, 0.06, -0.02, 0.3, seg=8); m.ball(0.017, 'yellow', 0.06, -0.05, 0.31, seg=6)
        m.ball(0.035, 0xFFF3A0, -0.05, 0.04, 0.26, seg=8)
        return m.build()

    def dig():
        m = Model('dig')
        for i in range(4):
            a = i / 4 * 2 * PI + 0.4
            m.ball(0.08, 0x5E3F24, math.cos(a) * 0.08, math.sin(a) * 0.08, 0.0, sx=1.5, sy=0.35, sz=0.12, rz=a, seg=8)
        m.ball(0.07, 0x6E4A2A, 0, 0, 0.0, sz=0.22, seg=10)
        for i in range(4):
            a = i / 4 * 2 * PI
            m.ball(0.025, 0xFFF3A8, 0.05 + math.cos(a) * 0.03, -0.05 + math.sin(a) * 0.03, 0.05, sx=1.8, sy=0.4, sz=0.4, rz=a, seg=6, glow=True)
        m.ball(0.035, 0xFFF3A8, 0.05, -0.05, 0.04, seg=6, glow=True)
        return m.build()

    def chips():
        m = Model('woodchips')
        for x, y, r in ((0.3, -0.45, 0.1), (-0.35, -0.4, 0.08), (0.05, -0.55, 0.06)):
            m.ball(r, 0xD9B077, x, y, 0.03, sx=1.6, sz=0.4, seg=8, rz=x * 3)
        return m.build()

    for s_ in ('spring', 'summer', 'autumn', 'winter'): o = tree(s_); N[o.name] = o
    o = palm(); N[o.name] = o
    for k in ('apfel', 'birne', 'orange', 'pfirsich', 'kirsche', 'kokosnuss', 'banane', 'mango'): o = fruit(k); N[o.name] = o
    for sm in (False, True): o = rock(sm); N[o.name] = o
    for k in ('herzmuschel', 'kauri', 'jakobsmuschel', 'sanddollar', 'koralle', 'sternsplitter'): o = shell(k); N[o.name] = o
    for f in (weed, dig, chips): o = f(); N[o.name] = o

    names = list(N)
    path = export([N[n] for n in names], 'nature')

    def vis(o, show):
        for ob in [o] + list(o.children_recursive): ob.hide_render = not show
    for o in N.values(): vis(o, False)
    outs = []
    sheets = [(['tree_spring', 'tree_summer', 'tree_autumn', 'tree_winter', 'palm', 'rock', 'rock_small', 'weed'], 4, 3.6, 1.0),
              ([n for n in names if n.startswith(('fruit_', 'shell_'))] + ['dig', 'woodchips'], 6, 0.65, 0.12)]
    for i, (sh, cols, gap, zt) in enumerate(sheets):
        objs = [N[n] for n in sh]
        for o in objs: vis(o, True)
        old = arrange(objs, cols=cols, gap=gap)
        rows = (len(objs) + cols - 1) // cols
        stage(target=(0, -(rows - 1) * gap * 0.45, zt), dist=(cols * gap) * 1.25 + 1, el=34, lens=40)
        for g in ('K_Ground', 'K_Path'):
            if bpy.data.objects.get(g): bpy.data.objects[g].hide_render = False
        outs.append(render('natur_%d' % (i + 1)))
        for o, p in zip(objs, old): o.location = p; vis(o, False)
    for o in N.values(): o.location = (0, 0, 0)
    tris = {n: sum(len(p.vertices) - 2 for ob in [N[n]] + list(N[n].children_recursive) if ob.type == 'MESH' for p in ob.data.polygons) for n in names}
    log({'ok': True, 'glb': path, 'size': os.path.getsize(path), 'renders': outs, 'tris': tris, 'total': sum(tris.values())})
except Exception:
    log({'ok': False, 'error': traceback.format_exc()})
