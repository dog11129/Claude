# Beet-Pflanzen der Kuschelinsel: 8 Blumen + Weizen, Karotte, Kartoffel, Tomate, Sonnenblume, Kürbis.
# Modelle: sprout, sprout_grass (Stufe 0) und crop_<art>_<stufe> für Stufe 1–3.
# Ursprung = Beetmitte am Boden. Maße wie die alten Modelle (im Spiel noch ×1.25 bzw. ×1.7 skaliert).
# Kein Keyframe-Wind: das Spiel lässt die Pflanzen per Shader im Wind wiegen.
try:
    clear()
    random.seed(5)
    G = {}

    # Blatt / Blütenblatt: Länge L entlang Richtung yaw, nach oben geneigt um tilt, Breite W
    def leaf(m, bx, by, bz, yaw, L, W, color, tilt=0.4, th=0.22, seg=8):
        cx = bx + math.cos(yaw) * math.cos(tilt) * L / 2
        cy = by + math.sin(yaw) * math.cos(tilt) * L / 2
        cz = bz + math.sin(tilt) * L / 2
        m.ball(L / 2, color, cx, cy, cz, sx=1, sy=W / L, sz=th * W / L, ry=-tilt, rz=yaw, seg=seg)

    def rosette(m, n, L, W, cols=('leaf', 'leafL'), tilt=0.5, z=0.01, off=0.3):
        for i in range(n): leaf(m, 0, 0, z, i * 2 * PI / n + off, L, W, cols[i % len(cols)], tilt)

    def soil(m):
        m.ball(0.09, 0x7A5236, 0, 0, 0, sz=0.3, seg=10)

    def sprout(grassy):
        m = Model('sprout_grass' if grassy else 'sprout')
        soil(m)
        if grassy:
            for i in range(3): leaf(m, 0, 0, 0.01, i * 2.1 + 0.3, 0.2, 0.04, 'leafL' if i % 2 else 'leaf', 1.1)
        else:
            m.stick((0, 0, 0), (0, 0, 0.08), 0.012, 'leafD', seg=6)
            for k in (-1, 1): leaf(m, 0, 0, 0.075, PI / 2 + k * PI / 2, 0.11, 0.08, 'leafL', 0.45, 0.3)
            m.ball(0.018, 'leaf', 0, 0, 0.09, seg=6)
        return m.build()

    # ---------- Blumen ----------
    FCOL = dict(tulpe=0xFF5D7A, kosmee=0xFFD23F, stiefmuetterchen=0xB48CFF, rose=0xE8283C, hyazinthe=0x8F7BFF, lilie=0xFFF0F4, mohn=0xFF3B2F, kornblume=0x4F7DFF)
    def head(m, k, x, y, z):
        c = FCOL[k]
        if k == 'tulpe':
            m.ball(0.055, c, x, y, z + 0.05, sz=1.3, seg=12)
            for j in range(4): leaf(m, x, y, z + 0.01, j * PI / 2 + 0.4, 0.1, 0.07, shade(c, 0.1 if j % 2 else -0.05), 1.25, 0.35)
        elif k == 'rose':
            m.ball(0.06, c, x, y, z + 0.035, sz=0.85, seg=12)
            m.torus(0.035, 0.012, shade(c, 0.15), x, y, z + 0.075, seg=12, tseg=6)
            for j in range(6): leaf(m, x, y, z + 0.02, j * PI / 3, 0.08, 0.07, shade(c, -0.08), 0.6, 0.3)
        elif k == 'hyazinthe':
            for j in range(10):
                a = j * 2.4; r = 0.035 * (1 - j / 14)
                m.ball(0.03, c if j % 2 else shade(c, 0.2), x + math.cos(a) * r, y + math.sin(a) * r, z + 0.02 + j * 0.017, seg=6)
        elif k == 'kosmee':
            for j in range(8): leaf(m, x, y, z, j * PI / 4, 0.09, 0.045, c if j % 2 else shade(c, 0.12), 0.18, 0.3, seg=6)
            m.ball(0.026, 0xFFA020, x, y, z + 0.012, sz=0.7, seg=8)
        elif k == 'stiefmuetterchen':
            for j, (a, s) in enumerate(((0.6, 1), (2.5, 1), (1.57, 1.15), (3.9, 0.9), (5.5, 0.9))):
                leaf(m, x, y, z, a, 0.08 * s, 0.075 * s, c if j < 3 else shade(c, 0.25), 0.2, 0.3)
            m.ball(0.03, 0x4A2E6E, x, y - 0.01, z + 0.012, sx=1.4, sz=0.4, seg=8)
            m.ball(0.016, 0xFFD84A, x, y - 0.02, z + 0.02, seg=6)
        elif k == 'lilie':
            for j in range(6): leaf(m, x, y, z, j * PI / 3, 0.11, 0.04, c if j % 2 else 0xFFD3E0, 0.55, 0.3, seg=7)
            for j in range(3): m.stick((x, y, z), (x + math.cos(j * 2.1) * 0.03, y + math.sin(j * 2.1) * 0.03, z + 0.06), 0.004, 0xF0A030, seg=4)
        elif k == 'mohn':
            for j in range(4): leaf(m, x, y, z, j * PI / 2 + 0.3, 0.09, 0.09, c, 0.7, 0.3)
            m.ball(0.022, 0x2E2626, x, y, z + 0.02, seg=8)
        elif k == 'kornblume':
            for j in range(10): leaf(m, x, y, z, j * PI / 5, 0.07, 0.034, c if j % 2 else shade(c, 0.25), 0.45, 0.4, seg=6)
            m.ball(0.02, 0x2E3E8E, x, y, z + 0.02, seg=8)

    def flower(k, st):
        m = Model('crop_%s_%d' % (k, st)); soil(m)
        tall = k in ('tulpe', 'hyazinthe', 'lilie')
        rosette(m, 4 if st == 1 else 6, 0.2 if tall else 0.14, 0.06 if tall else 0.08, tilt=1.0 if tall else 0.35)
        if st == 1: return m.build()
        heads = [(0, 0, 0.3), (0.12, -0.06, 0.24), (-0.1, 0.08, 0.22)][:1 if st == 2 else 3]
        for x, y, z in heads:
            m.stick((x * 0.3, y * 0.3, 0), (x, y, z), 0.012, 'leafD', seg=6)
            if st == 2:
                m.ball(0.04, FCOL[k], x, y, z + 0.035, sz=1.4, seg=10); m.ball(0.032, 'leaf', x, y, z + 0.005, sz=0.8, seg=8)
            else:
                head(m, k, x, y, z)
        return m.build()

    # ---------- Gemüse & Co. ----------
    def weizen(st):
        m = Model('crop_weizen_%d' % st); soil(m)
        if st == 1:
            for i in range(7): leaf(m, 0, 0, 0.01, i * 2.4, 0.26 + (i % 3) * 0.04, 0.045, 'leafL' if i % 2 else 'leaf', 1.15)
            return m.build()
        ripe = st == 3; h = 0.5 if st == 2 else 0.62
        sc = 0xE6BC55 if ripe else 0x8CC858; ec = 0xF5CF63 if ripe else 0xA6D867
        n = 10 if st == 2 else 11
        for i in range(n):
            r = 0.26 * math.sqrt((i + 0.5) / n); a = i * 2.39996
            x, y = math.cos(a) * r, math.sin(a) * r
            hh = h * (0.85 + random.random() * 0.25); tip = (x * 1.25, y * 1.25, hh)
            m.stick((x * 0.6, y * 0.6, 0), tip, 0.012, sc, 0.009, seg=5)
            for j in range(4):  # Ähre aus kleinen Körnern
                m.ball(0.022, ec, tip[0] + x * 0.05 * j, tip[1] + y * 0.05 * j, hh + 0.02 + j * 0.035, sx=0.8, sy=0.8, sz=1.3, seg=5)
        for i in range(4): leaf(m, 0, 0, 0.01, i * 1.57 + 0.5, 0.26, 0.04, 0xBFC860 if ripe else 'leaf', 1.05)
        return m.build()

    def karotte(st):
        m = Model('crop_karotte_%d' % st); soil(m)
        n = [0, 3, 5, 6][st]; h = [0, 0.13, 0.24, 0.28][st]
        for i in range(n):
            a = i * 2 * PI / n + 0.3; tip = (math.cos(a) * h * 0.45, math.sin(a) * h * 0.45, h)
            m.stick((0, 0, 0), tip, 0.01, 'leafD', seg=5)
            for j in (-1, 0, 1): leaf(m, *tip, a + j * 0.7, h * 0.45, h * 0.3, 'leaf' if j else 'leafL', 0.6, 0.3)
        if st >= 2:
            s = 1 if st == 3 else 0.55
            m.ball(0.1 * s, 0xFF8A2A, 0, 0, 0.0, sz=0.8, seg=12)
            m.ball(0.08 * s, 0xFFA64D, 0, 0, 0.04 * s, sz=0.45, seg=10)
            if st == 3: m.ball(0.065, 0xFF8A2A, 0.13, -0.07, 0.0, sz=0.8, seg=10)
        return m.build()

    def kartoffel(st):
        m = Model('crop_kartoffel_%d' % st); soil(m)
        s = [0, 0.55, 0.85, 1][st]
        blobs = [(0, 0, 0.2, 0.15, 'leaf'), (0.12, -0.06, 0.15, 0.11, 'leafD'), (-0.11, 0.05, 0.16, 0.12, 0x5CB246), (0.02, 0.13, 0.15, 0.1, 'leafD'), (-0.05, -0.05, 0.27, 0.1, 'leafL')]
        for x, y, z, r, c in blobs[:3 if st == 1 else 5]: m.ball(r * s, c, x * s, y * s, z * s, sz=0.85, seg=12, bump=0.08)
        for i in range(4): leaf(m, 0, 0, 0.04 * s, i * PI / 2 + 0.7, 0.16 * s, 0.11 * s, 'leaf' if i % 2 else 'leafD', 0.35)
        if st == 3:
            for x, y, c in ((0.05, -0.08, 'white'), (-0.1, 0.02, 0xD9B8F5), (0.08, 0.09, 'white')):
                for j in range(5): leaf(m, x, y, 0.35, j * 1.257, 0.045, 0.035, c, 0.2, 0.3, seg=8)
                m.ball(0.015, 'yellow', x, y, 0.36, seg=6)
            for x, y, r in ((0.16, -0.19, 0.08), (-0.02, -0.25, 0.065)): m.ball(r, 0xD4A064, x, y, 0.04, sx=1.3, sz=0.9, seg=10, bump=0.1)
        return m.build()

    def tomate(st):
        m = Model('crop_tomate_%d' % st); soil(m)
        h = [0, 0.3, 0.62, 0.78][st]; n = [0, 5, 9, 9][st]
        if st > 1:
            m.cyl(0.016, 0.02, h + 0.12, 'woodD', 0.06, 0.04, (h + 0.12) / 2, seg=6); m.ball(0.022, 'woodD', 0.06, 0.04, h + 0.12, seg=6)
        pts = [(0, 0, 0), (0.03, -0.02, h * 0.35), (-0.01, 0.01, h * 0.7), (0.03, 0, h)]
        for a, b in zip(pts, pts[1:]): m.stick(a, b, 0.016, 'leafD', 0.014, seg=6)
        for i in range(n):
            t = (i + 1) / (n + 1); a = i * 2.4
            leaf(m, 0.02, 0, h * t, a, 0.22 * (1.1 - t * 0.4), 0.15 * (1.1 - t * 0.4), 'leaf' if i % 2 else 'leafD', 0.4, 0.3)
        if st == 2:
            for x, y, z in ((0.1, -0.06, 0.4), (-0.08, -0.08, 0.5)):
                for j in range(5): leaf(m, x, y, z, j * 1.257, 0.035, 0.025, 'yellow', 0.3, 0.3, seg=6)
        if st == 3:
            for x, y, z, r in ((0.11, -0.08, 0.42, 0.07), (0.04, -0.14, 0.35, 0.06), (0.15, 0, 0.32, 0.055), (-0.1, -0.06, 0.6, 0.065), (-0.13, 0.04, 0.5, 0.055)):
                m.ball(r, 0xFF4632, x, y, z, sz=0.9, seg=12); m.ball(r * 0.3, 0xFFA090, x - r * 0.35, y - r * 0.6, z + r * 0.35, seg=6)
                for j in range(5): leaf(m, x, y, z + r * 0.85, j * 1.257, r * 0.7, r * 0.3, 'leafD', 0.1, 0.3, seg=6)
        return m.build()

    def sonnenblume(st):
        m = Model('crop_sonnenblume_%d' % st); soil(m)
        h = [0, 0.32, 0.92, 1.22][st]
        m.stick((0, 0, 0), (0.02, 0, h * 0.5), 0.024, 'leafD', 0.022, seg=8)
        m.stick((0.02, 0, h * 0.5), (0, -0.04 if st == 3 else 0, h), 0.022, 'leafD', 0.02, seg=8)
        n = 4 if st == 1 else 6
        for i in range(n):
            z = 0.12 + (i >> 1) * 0.12 if st == 1 else 0.15 + i * h * 0.11
            leaf(m, 0, 0, z, i * PI + (i >> 1) * 1.2, 0.14 if st == 1 else 0.2, 0.13 if st == 1 else 0.18, 'leaf' if i % 2 else 'leafD', 0.35, 0.25)
        if st == 2:
            m.ball(0.07, 0x5CB246, 0, 0, h + 0.03, sz=0.8, seg=10)
            for i in range(6): leaf(m, 0, 0, h + 0.03, i * 1.05, 0.07, 0.04, 'leafD', 1.0, 0.3, seg=6)
            m.ball(0.035, 0xF5D86A, 0, 0, h + 0.085, sz=0.6, seg=8)
        if st == 3:  # großer Blütenkopf: flach gebaut, danach nach vorn gekippt
            cx, cy, cz = 0, -0.04, h + 0.02
            hd = m.part('head', (cx, cy, cz))
            hd.cyl(0.13, 0.15, 0.05, 0x5CB246, cx, cy, cz - 0.02, seg=18)
            hd.cyl(0.115, 0.115, 0.03, 0x7A4A24, cx, cy, cz + 0.01, seg=18)
            hd.ball(0.09, 0x5A3418, cx, cy, cz + 0.02, sz=0.3, seg=14)
            for i in range(14):
                a = i * 2 * PI / 14
                leaf(hd, cx + math.cos(a) * 0.1, cy + math.sin(a) * 0.1, cz + 0.005, a, 0.12, 0.065, 0xFFC21F if i % 2 else 0xFFD84A, 0.12 if i % 2 else 0.04, 0.3, seg=8)
            for k in (-1, 1): hd.ball(0.018, 0xFF9AA8, cx + k * 0.045, cy - 0.03, cz + 0.035, sz=0.4, seg=6)  # Bäckchen
            HEADS.append(m.name + '_head')
        return m.build()

    def kuerbis(st):
        m = Model('crop_kuerbis_%d' % st); soil(m)
        n = 3 if st != 2 else 5; L = 0.2 if st == 1 else 0.36
        for i in range(n):
            a = i * 2 * PI / n + 0.4; ex, ey = math.cos(a) * L, math.sin(a) * L
            m.stick((0, 0, 0.02), (ex * 0.55, ey * 0.55, 0.05), 0.014, 'leafD', seg=5)
            m.stick((ex * 0.55, ey * 0.55, 0.05), (ex, ey, 0.03), 0.013, 'leafD', seg=5)
            leaf(m, ex * 0.55, ey * 0.55, 0.05, a + 0.6, 0.21 if st > 1 else 0.16, 0.22 if st > 1 else 0.17, 0x5CAE46 if i % 2 else 'leafD', 0.3, 0.3)
        if st == 2:
            m.ball(0.08, 0x9BD66A, 0.04, -0.1, 0.06, sx=1.15, sz=0.75, seg=10)
            for j in range(5): leaf(m, -0.12, 0.05, 0.1, j * 1.257, 0.05, 0.04, 0xFFB733, 0.6, 0.3, seg=6)
        if st == 3:
            for i in range(8):  # gerippter Kürbis aus Polstern
                a = i * PI / 4
                m.ball(0.15, 0xFF8C1A if i % 2 else 0xF77F10, math.cos(a) * 0.12, -0.04 + math.sin(a) * 0.12, 0.19, sx=0.75, sy=0.75, sz=1.0, rz=a, seg=12)
            m.ball(0.18, 0xFF9A2A, 0, -0.04, 0.2, sz=0.95, seg=14)
            m.stick((0, -0.04, 0.36), (0.03, -0.02, 0.44), 0.025, 0x6B7A2A, 0.02, seg=6)
            leaf(m, 0.02, -0.03, 0.4, 0.5, 0.12, 0.1, 'leaf', 0.2, 0.3)
        return m.build()

    HEADS = []
    for g in (False, True): o = sprout(g); G[o.name] = o
    for k in FCOL:
        for st in (1, 2, 3): o = flower(k, st); G[o.name] = o
    for f in (weizen, karotte, kartoffel, tomate, sonnenblume, kuerbis):
        for st in (1, 2, 3): o = f(st); G[o.name] = o

    for hn in HEADS:  # Sonnenblumen schauen nach vorn (-Y) und etwas nach oben
        ob = bpy.data.objects.get(hn)
        if ob: ob.rotation_mode = 'XYZ'; ob.rotation_euler.x = PI / 2 - 0.6
    names = list(G)
    path = export([G[n] for n in names], 'crops')

    def vis(o, show):
        for ob in [o] + list(o.children_recursive): ob.hide_render = not show
    for o in G.values(): vis(o, False)
    for g_ in ('K_Ground', 'K_Path'):
        if bpy.data.objects.get(g_): bpy.data.objects[g_].hide_render = False
    outs = []
    sheets = [[n for n in names if n.endswith('_3')], [n for n in names if not n.endswith('_3')]]
    for i, sh in enumerate(sheets):
        objs = [G[n] for n in sh]; cols = 7 if i == 0 else 10; gap = 0.8
        for o in objs: vis(o, True)
        old = arrange(objs, cols=cols, gap=gap)
        rows = (len(objs) + cols - 1) // cols
        stage(target=(0, -(rows - 1) * gap * 0.45, 0.25), dist=cols * gap * 1.15 + 1, el=34, lens=40)
        outs.append(render('beet_%d' % (i + 1)))
        for o, p in zip(objs, old): o.location = p; vis(o, False)
    for o in G.values(): o.location = (0, 0, 0)
    tris = {n: sum(len(p.vertices) - 2 for ob in [G[n]] + list(G[n].children_recursive) if ob.type == 'MESH' for p in ob.data.polygons) for n in names}
    log({'ok': True, 'glb': path, 'size': os.path.getsize(path), 'renders': outs, 'tris': tris, 'total': sum(tris.values())})
except Exception:
    log({'ok': False, 'error': traceback.format_exc()})
