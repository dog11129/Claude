# Platzierbares der Kuschelinsel: Deko, Obstbäume im Garten, Strand-Sachen, Bauprojekte.
# Ursprung = Kachelmitte am Boden, Vorderseite -Y. Maße wie die alten Modelle.
# Spiel (x, y, z) entspricht Blender (x, -z, y). Leuchtteile glühen nachts, kleine Keyframe-Loops machen alles lebendig.
try:
    clear()
    random.seed(8)
    Q = {}
    WATER = 0x8FD8F5; METAL = 0x3D4458; BRASS = 0xE8B84A; SAND = 0xEEDCAA

    def leaf(m, bx, by, bz, yaw, L, W, color, tilt=0.4, th=0.22, seg=8):
        cx = bx + math.cos(yaw) * math.cos(tilt) * L / 2
        cy = by + math.sin(yaw) * math.cos(tilt) * L / 2
        cz = bz + math.sin(tilt) * L / 2
        m.ball(L / 2, color, cx, cy, cz, sx=1, sy=W / L, sz=th * W / L, ry=-tilt, rz=yaw, seg=seg)

    def bloom(m, x, y, z, r, color, n=5, center='yellow', tilt=0.25):
        for i in range(n): leaf(m, x, y, z, i * 2 * PI / n, r, r * 0.75, color, tilt, 0.3, seg=6)
        m.ball(r * 0.32, center, x, y, z + 0.01, sz=0.7, seg=6)

    def crown(m, cx, cy, cz, R, cols, n=7, seed=1):
        rnd = random.Random(seed)
        m.ball(R, cols[0], cx, cy, cz, sz=0.88, seg=16, bump=0.05)
        for i in range(n):
            a = i / n * 2 * PI + rnd.random() * 0.5; e = (rnd.random() - 0.3) * 1.0
            m.ball(R * (0.6 + rnd.random() * 0.15), cols[1 + i % (len(cols) - 1)], cx + math.cos(a) * math.cos(e) * R * 0.75,
                   cy + math.sin(a) * math.cos(e) * R * 0.75, cz + math.sin(e) * R * 0.65, sz=0.88, seg=12, bump=0.05)

    def post(m, x, y, h, color, r=0.04, top=True):
        m.cyl(r, r * 1.15, h, color, x, y, h / 2, seg=10)
        if top: m.ball(r * 1.5, color, x, y, h, seg=10)

    # ---------- Deko ----------
    def weg():
        m = Model('weg')
        for i, (x, y, r) in enumerate(((-0.22, 0.23, 0.21), (0.23, 0.2, 0.2), (-0.24, -0.21, 0.2), (0.21, -0.24, 0.21), (0, 0, 0.1))):
            m.puff(r * 2, r * 1.9, 0.05 + i * 0.004, shade(0xCFC5B8, -0.02 - random.random() * 0.1), x, y, 0, soft=0.5, taper=0.15, rz=random.random() * 3, seg=14)
        for x, y in ((0, -0.42), (-0.43, 0), (0.4, 0)): m.ball(0.04, 'leaf', x, y, 0, sx=1.4, sz=0.5, seg=6)
        return m.build()

    def blumen():
        m = Model('blumen')
        m.puff(0.92, 0.92, 0.16, 'woodD', 0, 0, 0, soft=0.4, taper=0.02)
        m.puff(0.8, 0.8, 0.12, 0x6E4A2E, 0, 0, 0.08, soft=0.45, taper=0)
        for x, y in ((-0.2, 0.2), (0.2, 0.18), (-0.18, -0.2), (0.2, -0.2), (0, 0)): m.ball(0.12, 'leafD', x, y, 0.17, sz=0.45, seg=10)
        cols = ['rose', 0xFFE066, 'lilac', 'white', 0xFF9F6B, 'pink']
        for i in range(12):
            a = i * 2.39996; r = 0.33 * math.sqrt((i + 0.5) / 12); x, y = math.cos(a) * r, math.sin(a) * r
            h = 0.1 + random.random() * 0.1
            m.stick((x, y, 0.15), (x, y, 0.15 + h), 0.01, 'leafD', seg=5)
            leaf(m, x, y, 0.17, a, 0.11, 0.06, 'leaf', 0.5)
            bloom(m, x, y, 0.15 + h, 0.075, cols[i % 6], 5 if i % 2 else 7, 'yellow' if i % 2 else 0xFFB020)
        return m.build()

    def zaun():
        m = Model('zaun')
        for x in (-0.44, 0.44): m.puff(0.1, 0.1, 0.66, 'woodD', x, 0, 0, soft=0.4, taper=0); m.ball(0.065, 'woodD', x, 0, 0.66, sz=0.8, seg=10)
        for z in (0.24, 0.48): m.puff(1.0, 0.05, 0.07, 'wood', 0, 0, z - 0.035, soft=0.4, taper=0)
        for x in (-0.22, 0, 0.22):
            m.puff(0.11, 0.035, 0.52, 'woodL', x, -0.04, 0.04, soft=0.4, taper=0)
            m.heart(0.1, 'woodL', x, -0.045, 0.6, depth=0.25)
        return m.build()

    def heu():
        m = Model('heu')
        m.puff(0.86, 0.62, 0.5, 0xF2CF62, 0, 0, 0, soft=0.45, taper=0.02)
        for x in (-0.22, 0.22): m.puff(0.05, 0.65, 0.53, 0xC0703A, x, 0, -0.01, soft=0.45, taper=0)
        for i in range(16):
            a = random.random() * 2 * PI; z = 0.05 + random.random() * 0.42
            x, y = math.cos(a) * 0.44, math.sin(a) * 0.33
            m.stick((x * 0.9, y * 0.9, z), (x * 1.12, y * 1.12, z + (random.random() - 0.3) * 0.08), 0.008, 0xE8BF4A if i % 2 else 0xFFE08A, seg=4)
        return m.build()

    def shroom(m, s, x, y, ry=0, blush=True):
        m.cyl(0.075 * s, 0.1 * s, 0.28 * s, 0xFFF3E0, x, y, 0.14 * s, seg=12)
        m.ball(0.24 * s, 0xFF4B4B, x, y, 0.28 * s, sz=0.62, seg=16, half=True)
        m.cyl(0.235 * s, 0.13 * s, 0.05 * s, 0xF5DCC0, x, y, 0.27 * s, seg=16)
        for a, e, r in ((0, 0.6, 0.05), (1.3, 0.9, 0.045), (2.5, 0.5, 0.055), (3.8, 0.7, 0.045), (5.1, 0.45, 0.05), (0.7, 1.35, 0.04), (4.4, 0.25, 0.035)):
            px = x + math.cos(a + ry) * math.cos(e) * 0.24 * s; py = y + math.sin(a + ry) * math.cos(e) * 0.24 * s; pz = 0.28 * s + math.sin(e) * 0.24 * s * 0.62
            m.ball(r * s, 'white', px, py, pz, sz=0.45, rx=0, seg=8)
        if blush:  # kleines Gesicht am Stiel
            for k in (-1, 1): m.ball(0.012 * s, 'dark', x + k * 0.03 * s, y - 0.085 * s, 0.17 * s, seg=6); m.ball(0.018 * s, 'blush', x + k * 0.05 * s, y - 0.08 * s, 0.14 * s, sy=0.5, seg=6)

    def pilz():
        m = Model('pilz')
        b = m.part('big', (-0.05, 0.04, 0), ('squish', 0.06, 2.4))
        shroom(b, 1, -0.05, 0.04)
        shroom(m, 0.5, 0.25, -0.2, 1.5, blush=False)
        for i in range(4): leaf(m, -0.2 + i * 0.04, -0.18 + i * 0.03, 0, i * 1.4 - 0.5, 0.14, 0.035, 'leaf' if i % 2 else 'leafL', 1.0)
        return m.build()

    def laterne():
        m = Model('laterne')
        m.cyl(0.17, 0.2, 0.06, METAL, 0, 0, 0.03, seg=10, bev=0.02); m.cyl(0.11, 0.15, 0.12, METAL, 0, 0, 0.12, seg=10)
        m.cyl(0.035, 0.045, 1.2, METAL, 0, 0, 0.75, seg=10)
        m.torus(0.05, 0.016, BRASS, 0, 0, 0.5, seg=12, tseg=5); m.torus(0.05, 0.016, BRASS, 0, 0, 1.25, seg=12, tseg=5)
        m.cyl(0.16, 0.12, 0.05, METAL, 0, 0, 1.36, seg=6); m.cyl(0.18, 0.16, 0.05, METAL, 0, 0, 1.7, seg=6)
        m.cone(0.2, 0.17, METAL, 0, 0, 1.8, seg=6); m.ball(0.04, BRASS, 0, 0, 1.9, seg=8)
        for i in range(6):
            a = i * PI / 3
            m.stick((math.cos(a) * 0.125, math.sin(a) * 0.125, 1.38), (math.cos(a) * 0.155, math.sin(a) * 0.155, 1.69), 0.012, METAL, seg=4)
        m.cyl(0.13, 0.105, 0.3, 0xFFE27A, 0, 0, 1.535, seg=6, glow=True)
        return m.build()

    def zwerg():
        m = Model('zwerg'); s = 1.2
        for k in (-1, 1): m.ball(0.065 * s, 0x6B4A32, k * 0.07 * s, -0.03 * s, 0.035 * s, sy=1.4, sz=0.6, seg=10)
        m.ball(0.16 * s, 0x4A7FD4, 0, 0, 0.2 * s, sz=1.05, sy=0.95, seg=14)
        m.torus(0.158 * s, 0.022 * s, 0x6B4A32, 0, 0, 0.17 * s, seg=18, tseg=5)
        m.box(0.06 * s, 0.02 * s, 0.05 * s, 'yellow', 0, -0.165 * s, 0.17 * s, r=0.008)
        for k in (-1, 1):
            m.ball(0.055 * s, 0x4A7FD4, k * 0.16 * s, -0.03 * s, 0.24 * s, sx=0.8, sy=0.8, sz=1.3, ry=k * 0.3, seg=10)
            m.ball(0.038 * s, 'skin', k * 0.175 * s, -0.07 * s, 0.15 * s, seg=8)
        m.ball(0.12 * s, 'skin', 0, 0, 0.42 * s, seg=14)
        m.ball(0.11 * s, 'white', 0, -0.06 * s, 0.35 * s, sx=1.05, sy=0.75, seg=12)
        m.ball(0.065 * s, 'white', 0, -0.1 * s, 0.27 * s, sy=0.7, sz=1.2, seg=10)
        m.ball(0.035 * s, 0xFFA8A0, 0, -0.12 * s, 0.41 * s, seg=8)
        for k in (-1, 1):
            m.ball(0.016 * s, 'dark', k * 0.045 * s, -0.105 * s, 0.455 * s, sy=0.6, sz=1.2, seg=6)
            m.ball(0.03 * s, 'blush', k * 0.075 * s, -0.09 * s, 0.42 * s, sy=0.5, sz=0.6, seg=6)
        m.torus(0.115 * s, 0.025 * s, 0xD93838, 0, 0, 0.49 * s, seg=18, tseg=5)
        for i in range(6):  # Zipfelmütze, nach hinten gebogen
            t = i / 5
            m.ball(0.13 * s * (1 - t * 0.8), 0xFF4040, 0, t * t * 0.13 * s, (0.5 + t * 0.38) * s, seg=12)
        m.ball(0.03 * s, 'white', 0, 0.13 * s, 0.9 * s, seg=8)
        return m.build()

    def bank():
        m = Model('bank')
        for y in (0.13, 0, -0.13): m.puff(1.08, 0.12, 0.05, 'wood', 0, y, 0.37, soft=0.4, taper=0)
        for z in (0.6, 0.78): m.puff(1.08, 0.045, 0.12, 'wood', 0, 0.215 + (z - 0.6) * 0.15, z - 0.06, soft=0.4, taper=0, rx=-0.15)
        for x in (-0.46, 0.46):
            m.puff(0.07, 0.07, 0.38, 'woodD', x, -0.15, 0, soft=0.4, taper=0)
            m.stick((x, 0.2, 0), (x, 0.25, 0.86), 0.035, 'woodD', seg=8)
            m.puff(0.09, 0.42, 0.05, 'woodD', x + math.copysign(0.02, x), 0, 0.56, soft=0.4, taper=0)
            m.ball(0.04, 'woodD', x + math.copysign(0.02, x), -0.2, 0.58, seg=8)
            m.stick((x, -0.15, 0.4), (x + math.copysign(0.02, x), -0.16, 0.56), 0.025, 'woodD', seg=6)
        m.heart(0.13, 'rose', 0, 0.2, 0.69, depth=0.3)
        return m.build()

    def vogelhaus():
        m = Model('vogelhaus')
        m.cyl(0.04, 0.05, 1.0, 'woodD', 0, 0, 0.5, seg=8); m.puff(0.26, 0.26, 0.04, 'woodD', 0, 0, 0.97, soft=0.4, taper=0)
        m.puff(0.34, 0.3, 0.34, 0xFFD6A5, 0, 0, 1.0, soft=0.35, taper=0.02)
        m.gable(0.3, 0.3, 0.16, 0xFFD6A5, 0, 0, 1.33)
        m.cyl(0.06, 0.06, 0.03, 0x5A3A24, 0, -0.15, 1.2, seg=14, rx=PI / 2)
        m.stick((0, -0.15, 1.1), (0, -0.24, 1.1), 0.012, 'woodD', seg=6)
        m.cuteroof(0.42, 0.34, 0.2, 0xE5625E, z=1.33, rows=2, th=0.06, over=0.08)
        m.heart(0.07, 'rose', 0, -0.16, 1.38, depth=0.25)
        b = m.part('bird', (0.06, -0.22, 1.13), ('bob', 0.03, 1.2))
        b.ball(0.05, 0x7FC8FF, 0.06, -0.22, 1.13, sy=1.15, sz=0.9, seg=10); b.ball(0.033, 0x7FC8FF, 0.06, -0.25, 1.19, seg=10)
        b.cone(0.012, 0.03, 0xFFB020, 0.06, -0.29, 1.19, seg=6, rx=PI / 2)
        for k in (-1, 1): b.ball(0.008, 'dark', 0.06 + k * 0.02, -0.275, 1.2, seg=5)
        return m.build()

    def kirschbaum():
        m = Model('kirschbaum')
        m.cyl(0.1, 0.15, 1.0, 'bark', 0, 0, 0.5, seg=10, bev=0.02)
        m.stick((0, 0, 0.75), (0.3, -0.07, 1.12), 0.06, 'bark', 0.04, seg=6); m.stick((0, 0, 0.8), (-0.28, 0.1, 1.15), 0.06, 'bark', 0.04, seg=6)
        c = m.part('crown', (0, 0, 1.0), ('sway', 'x', 0.025, 3.8))
        crown(c, 0, 0, 1.45, 0.52, [0xFFB7D0, 0xFFA3C4, 0xFFC8DC, 0xFF94B8], 8, seed=3)
        for i in range(18):
            a = i * 2.39996; e = -0.3 + (i % 7) / 7 * 1.3
            bloom(c, math.cos(a) * math.cos(e) * 0.62, math.sin(a) * math.cos(e) * 0.62, 1.45 + math.sin(e) * 0.5, 0.06, 'white' if i % 3 else 0xFF7FA8, 5, 'yellow', 0.3)
        for i in range(8):
            a = random.random() * 2 * PI; r = 0.25 + random.random() * 0.4
            m.ball(0.04, 0xFFB7D0, math.cos(a) * r, math.sin(a) * r, 0.005, sz=0.2, seg=6)
        return m.build()

    def herz():
        m = Model('herz'); W = 0xFFF4EC
        for x in (-0.45, 0.45): post(m, x, 0, 1.3, W, 0.05, top=False); m.cyl(0.08, 0.09, 0.08, W, x, 0, 0.04, seg=10)
        m.torus(0.45, 0.045, W, 0, 0, 1.3, seg=20, tseg=6, arc=PI, rx=PI / 2)
        h = m.part('heart', (0, 0, 1.84), ('squish', 0.08, 1.6))
        h.heart(0.42, 0xFF4D7D, 0, 0, 1.84, depth=0.45); h.heart(0.22, 0xFF8FAB, 0, -0.08, 1.86, depth=0.3)
        spots = [(-0.45, 0.25 + i * 0.19) for i in range(6)] + [(0.45, 0.35 + i * 0.17) for i in range(6)] + [(math.cos(i / 8 * PI) * 0.45, 1.3 + math.sin(i / 8 * PI) * 0.45) for i in range(1, 8)]
        R = [0xFF6B8A, 'white', 0xFF8FAB, 0xFFC0CB]
        for i, (x, z) in enumerate(spots):
            leaf(m, x, 0, z - 0.03, i * 1.7, 0.13, 0.08, 'leaf' if i % 2 else 'leafD', 0.2)
            if i % 2 == 0 or z > 1.3: m.ball(0.06, R[i % 4], x, -0.04, z, sz=0.85, seg=8); m.ball(0.03, shade(0xFF6B8A, 0.3), x, -0.07, z + 0.03, seg=6)
        return m.build()

    def brunnen():
        m = Model('brunnen'); ST = 0xCFC5B8
        m.cyl(0.47, 0.5, 0.3, ST, 0, 0, 0.15, seg=22, bev=0.03)
        m.torus(0.46, 0.06, 0xE6DFD5, 0, 0, 0.3, seg=28, tseg=6)
        m.cyl(0.42, 0.42, 0.02, WATER, 0, 0, 0.27, seg=22)
        m.cyl(0.07, 0.1, 0.5, ST, 0, 0, 0.5, seg=10); m.cyl(0.2, 0.08, 0.1, ST, 0, 0, 0.78, seg=14)
        m.torus(0.19, 0.03, 0xE6DFD5, 0, 0, 0.83, seg=20, tseg=5); m.cyl(0.17, 0.17, 0.015, WATER, 0, 0, 0.82, seg=14)
        for i in range(10):
            a = i * 2 * PI / 10 + 0.3
            m.puff(0.16, 0.04, 0.08, shade(ST, -0.05 - random.random() * 0.08), math.cos(a) * 0.49, math.sin(a) * 0.49, 0.06 + (i % 2) * 0.1, soft=0.5, taper=0, rz=a + PI / 2)
        w = m.part('spout', (0, 0, 0.92), ('squish', 0.25, 0.8))
        w.ball(0.05, 0xBFEAFF, 0, 0, 0.98, sz=1.5, seg=10)
        for i in range(4):
            a = i * PI / 2 + PI / 4
            pts = [(math.cos(a) * 0.19, math.sin(a) * 0.19, 0.84), (math.cos(a) * 0.27, math.sin(a) * 0.27, 0.72), (math.cos(a) * 0.31, math.sin(a) * 0.31, 0.29)]
            for p1, p2 in zip(pts, pts[1:]): m.stick(p1, p2, 0.018, 0xBFEAFF, seg=6)
        m.cyl(0.07, 0.07, 0.01, 'leaf', -0.2, -0.18, 0.285, seg=10); bloom(m, -0.2, -0.18, 0.29, 0.04, 'pink', 6)
        return m.build()

    def sonnenschirm():
        m = Model('sonnenschirm')
        m.cyl(0.03, 0.03, 1.9, 'white', 0, 0, 0.95, seg=8); m.cyl(0.16, 0.2, 0.08, 'woodD', 0, 0, 0.04, seg=10)
        for i in range(8): leaf(m, 0, 0, 2.05, i * PI / 4, 1.1, 0.62, 'white' if i % 2 else 0x5AB8E8, -0.38, 0.12, seg=10)
        for i in range(8): m.ball(0.06, 0x5AB8E8 if i % 2 else 'white', math.cos(i * PI / 4) * 1.0, math.sin(i * PI / 4) * 1.0, 1.66, sz=0.6, seg=6)
        m.ball(0.06, 'yellow', 0, 0, 2.1, seg=8)
        return m.build()

    def liegestuhl():
        m = Model('liegestuhl')
        for x in (-0.28, 0.28):
            m.stick((x, -0.45, 0), (x, 0.05, 0.3), 0.025, 'woodD', seg=6); m.stick((x, 0.05, 0.3), (x, 0.4, 0.75), 0.025, 'woodD', seg=6)
            m.stick((x, 0.35, 0), (x, 0.05, 0.3), 0.025, 'woodD', seg=6)
        for i in range(6):
            t = i / 5
            m.puff(0.56, 0.1, 0.03, 0xFF8FAB if i % 2 else 'white', 0, 0.05 + t * 0.35, 0.3 + t * 0.45, soft=0.4, taper=0, rx=0.9)
        for i in range(4): m.puff(0.56, 0.12, 0.03, 0xFF8FAB if i % 2 else 'white', 0, -0.06 - i * 0.12, 0.3 - i * 0.02, soft=0.4, taper=0, rx=-0.15)
        return m.build()

    def sternlampe():
        m = Model('sternlampe')
        m.cyl(0.16, 0.2, 0.08, METAL, 0, 0, 0.04, seg=10, bev=0.02); m.cyl(0.03, 0.035, 1.0, METAL, 0, 0, 0.55, seg=8)
        s = m.part('star', (0, 0, 1.25), ('sway', 'z', 0.3, 4.0))
        for i in range(5):
            a = i * 2 * PI / 5 + PI / 2
            s.ball(0.11, 0xFFE27A, math.cos(a) * 0.12, 0, 1.25 + math.sin(a) * 0.12, sx=1.4, sy=0.35, sz=0.55, ry=-a, seg=8, glow=True)
        s.ball(0.12, 0xFFE27A, 0, 0, 1.25, sy=0.5, seg=12, glow=True)
        return m.build()

    # Obstbaum im Garten (Früchte setzt das Spiel an die Krone)
    def ptree(flower):
        m = Model('ptree_flower' if flower else 'ptree')
        m.cyl(0.1, 0.15, 1.0, 'bark', 0, 0, 0.5, seg=10, bev=0.02)
        m.stick((0, 0, 0.75), (0.3, -0.07, 1.12), 0.06, 'bark', 0.04, seg=6); m.stick((0, 0, 0.8), (-0.28, 0.1, 1.15), 0.06, 'bark', 0.04, seg=6)
        m.ball(0.16, 'bark', 0, 0, 0.04, sx=1.1, sy=1.1, sz=0.3, seg=10)
        c = m.part('crown', (0, 0, 1.0), ('sway', 'x', 0.02, 4.4))
        crown(c, 0, 0, 1.45, 0.52, [0x5FB84A, 0x4FA843, 0x6CC455, 0x47993F], 7, seed=4)
        for a, e in ((-1.9, 0.5), (-1.2, 0.75), (-2.4, 0.2)): c.ball(0.13, 0x8BD86A, math.cos(a) * math.cos(e) * 0.6, math.sin(a) * math.cos(e) * 0.6, 1.45 + math.sin(e) * 0.5, sz=0.7, seg=8)
        if flower:
            for i in range(12):
                a = i * 2.39996; e = -0.2 + (i % 6) / 6 * 1.1
                bloom(c, math.cos(a) * math.cos(e) * 0.6, math.sin(a) * math.cos(e) * 0.6, 1.45 + math.sin(e) * 0.5, 0.05, 'white' if i % 2 else 0xFFD6E4, 5)
        return m.build()

    def hortensie():
        m = Model('hortensie')
        for i in range(6):
            a = i * PI / 3; m.ball(0.22, 'leaf' if i % 2 else 'leafD', math.cos(a) * 0.18, math.sin(a) * 0.18, 0.25, sz=0.8, seg=12, bump=0.08)
        for i in range(8):
            a = i * 2.39996; e = 0.2 + (i % 4) * 0.3
            x, y, z = math.cos(a) * math.cos(e) * 0.3, math.sin(a) * math.cos(e) * 0.3, 0.32 + math.sin(e) * 0.27
            for j in range(5): m.ball(0.045, 0x8FB4FF if i % 3 else 0xD9A0FF, x + math.cos(j * 1.26) * 0.05, y + math.sin(j * 1.26) * 0.05, z + (0.03 if j % 2 else 0), seg=7)
        return m.build()

    def buchsbaum():
        m = Model('buchsbaum')
        m.cyl(0.2, 0.16, 0.26, 0xD27A5A, 0, 0, 0.13, seg=14, bev=0.02); m.torus(0.2, 0.025, 0xE89070, 0, 0, 0.25, seg=16, tseg=5)
        m.ball(0.32, 'leafD', 0, 0, 0.56, seg=16, bump=0.07); m.ball(0.12, 'leaf', 0.1, -0.18, 0.72, sz=0.8, seg=10)
        m.heart(0.08, 'rose', 0, -0.2, 0.15, depth=0.25)
        return m.build()

    def rosenbogen():
        m = Model('rosenbogen')
        for x in (-0.55, 0.55): post(m, x, 0, 1.5, 'white', 0.03, top=False)
        m.torus(0.55, 0.03, 'white', 0, 0, 1.5, seg=16, tseg=5, arc=PI, rx=PI / 2)
        for i in range(16):
            a = i / 15 * PI; x, z = math.cos(a) * 0.55, 1.5 + math.sin(a) * 0.55
            m.ball(0.08, 'leaf' if i % 2 else 'leafD', x, 0, z, sy=0.8, seg=8); m.ball(0.05, 0xFF3B5C if i % 3 else 'pink', x + 0.03, -0.06, z + 0.02, seg=8)
        for x in (-0.55, 0.55):
            for j in range(4): m.ball(0.07, 'leaf', x, -0.04, 0.3 + j * 0.3, sy=0.8, seg=7); m.ball(0.045, 0xFF3B5C, x + 0.04, -0.08, 0.38 + j * 0.3, seg=7)
        return m.build()

    def banana():
        m = Model('banana')
        m.cyl(0.09, 0.14, 1.5, 0x9A8A4A, 0, 0, 0.75, seg=10)
        for i in range(5): m.torus(0.1 - i * 0.008, 0.015, 0x857740, 0, 0, 0.2 + i * 0.28, seg=10, tseg=4)
        c = m.part('leaves', (0, 0, 1.45), ('sway', 'y', 0.04, 4.5))
        for i in range(7):
            a = i * 2 * PI / 7
            for k in range(4):  # großes, hängendes Blatt aus Polstern
                t = (k + 0.5) / 4; d = 0.08 + t * 0.85
                c.ball(0.2 * (1 - t * 0.35), 'leaf' if (i + k) % 2 else 'leafD', math.cos(a) * d, math.sin(a) * d, 1.5 + 0.12 - t * t * 0.55, sx=1.5, sy=0.85, sz=0.14, rz=a, ry=0.4 * t, seg=10)
        return m.build()

    # ---------- Strand ----------
    def tikifackel():
        m = Model('tikifackel')
        m.cyl(0.04, 0.05, 1.3, 0x8A5A3A, 0, 0, 0.65, seg=8)
        m.cyl(0.1, 0.07, 0.22, 0xC9A06A, 0, 0, 1.35, seg=10); m.torus(0.1, 0.015, 0x6B4428, 0, 0, 1.3, seg=10, tseg=4)
        for k in (-1, 1): m.ball(0.02, 0x6B4428, k * 0.035, -0.085, 1.37, seg=6)  # kleines Tiki-Gesicht
        m.box(0.06, 0.01, 0.012, 0x6B4428, 0, -0.09, 1.31, r=0.004)
        f = m.part('flame', (0, 0, 1.46), ('squish', 0.18, 0.7))
        f.cone(0.08, 0.26, 0xFFB43A, 0, 0, 1.58, seg=8, glow=True); f.ball(0.07, 0xFFD45A, 0, 0, 1.5, seg=8, glow=True)
        return m.build()

    def haengematte():
        m = Model('haengematte')
        for x in (-0.7, 0.7): post(m, x, 0, 1.2, 0x8A5A3A, 0.05)
        h = m.part('net', (0, 0, 1.0), ('sway', 'x', 0.08, 3.0))
        pts = [(-0.68 + t / 8 * 1.36, 0, 1.0 - math.sin(t / 8 * PI) * 0.45) for t in range(9)]
        for a, b in zip(pts, pts[1:]): h.stick(a, b, 0.025, 0xC9A06A, seg=6)
        for i in range(7):
            t = (i + 0.5) / 7; x = -0.6 + t * 1.2; z = 0.98 - math.sin(t * PI) * 0.43
            h.puff(0.18, 0.5, 0.03, 0xFF8FAB if i % 2 else 0x6CC4FF, x, 0, z, soft=0.4, taper=0, rx=0)
        return m.build()

    def surfbrett():
        m = Model('surfbrett')
        m.ball(0.75, 0x6CC4FF, 0, 0, 0.8, sx=0.28, sy=0.06, sz=1.0, rx=0.12, seg=16)
        m.ball(0.7, 'white', 0, -0.035, 0.8, sx=0.05, sy=0.04, sz=0.95, rx=0.12, seg=8)
        m.ball(0.06, 'yellow', 0, -0.06, 1.05, sy=0.3, seg=8); m.heart(0.1, 'rose', 0, -0.06, 0.62, depth=0.2)
        m.puff(0.6, 0.3, 0.1, SAND, 0, 0.05, 0, soft=0.6, taper=0.2)
        return m.build()

    def sandburg():
        m = Model('sandburg')
        m.puff(0.9, 0.8, 0.12, SAND, 0, 0, 0, soft=0.6, taper=0.1); m.puff(0.5, 0.4, 0.3, SAND, 0, 0, 0.12, soft=0.35, taper=0.05)
        for x, y in ((-0.3, 0.25), (0.3, 0.25), (-0.3, -0.25), (0.3, -0.25)):
            m.cyl(0.1, 0.12, 0.42, SAND, x, y, 0.27, seg=10); m.cone(0.11, 0.14, shade(SAND, -0.05), x, y, 0.55, seg=10)
        m.cyl(0.008, 0.008, 0.3, 'bark', 0, 0, 0.55, seg=4); m.box(0.12, 0.01, 0.08, 'red', 0.06, 0, 0.66, r=0.005)
        m.ball(0.05, 0xFFB7C8, 0.35, -0.35, 0.03, sz=0.5, seg=8)
        m.box(0.08, 0.02, 0.1, 0x5A3A24, 0, -0.205, 0.17, r=0.03)  # Tor
        return m.build()

    def pokal():
        m = Model('pokal'); G_ = 0xFFD23F
        m.cyl(0.22, 0.26, 0.1, 0xCFC5B8, 0, 0, 0.05, seg=12); m.puff(0.36, 0.36, 0.2, 0x6B4428, 0, 0, 0.1, soft=0.4, taper=0)
        m.cyl(0.05, 0.08, 0.25, G_, 0, 0, 0.42, seg=10); m.cyl(0.2, 0.06, 0.35, G_, 0, 0, 0.72, seg=14, bev=0.02)
        for x in (-0.22, 0.22): m.torus(0.1, 0.025, G_, x, 0, 0.75, seg=10, tseg=4, rx=PI / 2)
        s = m.part('star', (0, 0, 0.98), ('spin', 'z', 4.0))
        for i in range(5):
            a = i * 2 * PI / 5 + PI / 2
            s.ball(0.05, 'white', math.cos(a) * 0.05, 0, 0.98 + math.sin(a) * 0.05, sx=1.4, sy=0.4, sz=0.55, ry=-a, seg=6)
        return m.build()

    # ---------- Bauprojekte ----------
    def baustelle():
        m = Model('baustelle')
        for x in (-0.25, 0.25): m.cyl(0.03, 0.03, 1.1, 'woodD', x, 0, 0.55, seg=6)
        m.puff(0.75, 0.05, 0.45, 'white', 0, -0.02, 0.73, soft=0.3, taper=0); m.puff(0.7, 0.06, 0.08, 0xFF8A2A, 0, -0.05, 1.08, soft=0.4, taper=0)
        m.ball(0.12, 'yellow', 0, -0.06, 0.92, sy=0.3, seg=10)
        for x, y in ((-0.9, -0.8), (0.9, -0.8), (-0.9, 0.8), (0.9, 0.8)): m.cyl(0.05, 0.07, 0.5, 0xFF8A2A, x, y, 0.25, seg=8); m.torus(0.05, 0.012, 'white', x, y, 0.32, seg=8, tseg=3)
        for a, b in (((-0.9, -0.8), (0.9, -0.8)), ((-0.9, 0.8), (-0.9, -0.8)), ((0.9, 0.8), (0.9, -0.8))):
            for z in (0.32, 0.18): m.stick((a[0], a[1], z), (b[0], b[1], z), 0.012, 0xFF5050 if z > 0.3 else 'white', seg=4)
        for i in range(6): m.puff(0.2, 0.16, 0.12, 0xCFC5B8 if i % 2 else 0xB9B4AD, 0.5 - (i % 3) * 0.14, 0.45 - (i % 2) * 0.1, Math_floor(i / 3) * 0.1, soft=0.5, rz=i)
        return m.build()

    def laternenpfahl():
        m = Model('laternenpfahl'); M_ = 0x2F3E5C
        m.cyl(0.16, 0.2, 0.12, M_, 0, 0, 0.06, seg=10); m.cyl(0.05, 0.06, 2.2, M_, 0, 0, 1.2, seg=8)
        m.torus(0.06, 0.02, BRASS, 0, 0, 0.6, seg=10, tseg=4)
        for sx in (-1, 1):
            m.stick((0, 0, 2.1), (sx * 0.4, 0, 2.15), 0.025, M_, seg=5)
            m.cyl(0.12, 0.08, 0.06, M_, sx * 0.4, 0, 2.05, seg=6); m.cone(0.15, 0.16, M_, sx * 0.4, 0, 2.42, seg=6)
            m.cyl(0.09, 0.07, 0.24, 0xFFE27A, sx * 0.4, 0, 2.2, seg=6, glow=True)
        return m.build()

    def sonnenuhr():
        m = Model('sonnenuhr'); ST = 0xCFC5B8
        m.cyl(0.4, 0.45, 0.12, ST, 0, 0, 0.06, seg=16); m.cyl(0.22, 0.28, 0.6, ST, 0, 0, 0.42, seg=12)
        m.cyl(0.42, 0.38, 0.08, 0xE6DFD5, 0, 0, 0.76, seg=20, bev=0.02)
        for i in range(12):
            a = i * PI / 6; m.box(0.03, 0.08, 0.01, 'dark', math.sin(a) * 0.32, -math.cos(a) * 0.32, 0.805, r=0.004, rz=-a)
        m.cone(0.18, 0.3, BRASS, 0, 0, 0.92, seg=3); m.ball(0.03, BRASS, 0, 0, 1.08, seg=6)
        m.ball(0.05, 'yellow', 0.18, -0.2, 0.82, sz=0.4, seg=8)
        return m.build()

    def picknick():
        m = Model('picknick')
        m.puff(1.4, 0.7, 0.06, 'wood', 0, 0, 0.59, soft=0.4, taper=0)
        for y in (0.55, -0.55): m.puff(1.4, 0.22, 0.05, 'wood', 0, y, 0.335, soft=0.4, taper=0)
        for x in (-0.55, 0.55): m.stick((x, -0.6, 0), (x, 0.1, 0.62), 0.04, 'woodD', seg=6); m.stick((x, 0.6, 0), (x, -0.1, 0.62), 0.04, 'woodD', seg=6)
        for i in range(5):  # karierte Decke
            for j in range(3): m.box(0.12, 0.15, 0.012, 'red' if (i + j) % 2 else 'white', 0.1 - 0.24 + i * 0.12, -0.15 + j * 0.15, 0.625, r=0.004)
        m.puff(0.3, 0.2, 0.2, 0xC9A06A, -0.4, 0, 0.62, soft=0.4); m.torus(0.1, 0.015, 0x8A5A3A, -0.4, 0, 0.82, seg=10, tseg=3, arc=PI, rx=PI / 2)
        m.ball(0.06, 'red', 0.25, -0.05, 0.68, seg=10); m.ball(0.05, 'yellow', 0.35, 0.08, 0.67, sz=0.8, seg=8)
        return m.build()

    def blumentor():
        m = Model('blumentor')
        for x in (-0.8, 0.8): m.puff(0.24, 0.24, 2.0, 'white', x, 0, 0, soft=0.4, taper=0); m.ball(0.14, 'white', x, 0, 2.08, seg=10)
        m.torus(0.8, 0.07, 'white', 0, 0, 2.0, seg=20, tseg=6, arc=PI, rx=PI / 2)
        cols = ['rose', 0xFFE066, 'lilac', 0xFF9F6B]
        for i in range(22):
            a = i / 21 * PI; x, z = math.cos(a) * 0.8, 2.0 + math.sin(a) * 0.8
            m.ball(0.1, cols[i % 4], x, -0.07, z, sy=0.7, seg=8); m.ball(0.035, 'yellow', x, -0.14, z, seg=6)
        for x in (-0.8, 0.8):
            for j in range(6): m.ball(0.08, 'leaf' if j % 2 else 0xFF8FAB, x + (0.1 if j % 2 else -0.1), -0.12, 0.3 + j * 0.28, sy=0.8, seg=7)
        m.heart(0.2, 'rose', 0, -0.05, 2.62, depth=0.3)
        return m.build()

    def fernrohr():
        m = Model('fernrohr')
        m.cyl(0.3, 0.34, 0.12, 0xCFC5B8, 0, 0, 0.06, seg=12)
        for i in range(3): a = i * 2 * PI / 3; m.stick((math.sin(a) * 0.25, -math.cos(a) * 0.25, 0.1), (0, 0, 0.95), 0.03, BRASS, seg=5)
        t = m.part('tube', (0, 0, 0.98), ('sway', 'z', 0.25, 6.0))
        t.cyl(0.09, 0.12, 0.9, 0x3B4A7A, 0, 0.0, 1.15, seg=12, rx=0.7)
        t.cyl(0.13, 0.13, 0.08, BRASS, 0, -0.29, 1.45, seg=12, rx=0.7); t.cyl(0.06, 0.06, 0.1, BRASS, 0, 0.27, 0.86, seg=8, rx=0.7)
        t.ball(0.03, 'yellow', 0.1, -0.05, 1.2, seg=6)
        return m.build()

    def statue():
        m = Model('statue'); T = 0xD9D2C8
        m.puff(0.7, 0.7, 0.5, 0xCFC5B8, 0, 0, 0, soft=0.35, taper=0.03); m.puff(0.8, 0.8, 0.08, 0xB9B4AD, 0, 0, 0.48, soft=0.4, taper=0)
        m.ball(0.32, T, 0, 0, 0.88, sy=0.9, sz=1.05, seg=14); m.ball(0.25, T, 0, 0, 1.35, seg=14)
        for k in (-1, 1):
            m.ball(0.09, T, k * 0.2, 0, 1.55, sy=0.7, seg=10); m.ball(0.05, 0xC9C1B5, k * 0.2, -0.04, 1.55, sy=0.4, seg=8)
            m.ball(0.1, T, k * 0.3, -0.12, 0.95, sz=1.4, seg=10); m.ball(0.1, T, k * 0.16, -0.22, 0.62, sy=1.3, sz=0.8, seg=10)
            m.ball(0.022, 0x8F877C, k * 0.08, -0.22, 1.4, seg=6)
        m.ball(0.09, 0xECE6DE, 0, -0.21, 1.3, sx=1.3, sz=0.9, seg=10); m.ball(0.03, 0x8F877C, 0, -0.29, 1.33, seg=6)
        m.heart(0.16, 0xE0B0B0, 0, -0.29, 0.9, depth=0.3)
        return m.build()

    def pavillon():
        m = Model('pavillon')
        m.cyl(1.1, 1.15, 0.2, 0xCFC5B8, 0, 0, 0.1, seg=8); m.cyl(1.05, 1.05, 0.04, 'woodL', 0, 0, 0.22, seg=8)
        for i in range(8):
            a = i * PI / 4 + PI / 8
            post(m, math.sin(a) * 0.95, -math.cos(a) * 0.95, 1.72, 'white', 0.05, top=False)
            if i != 0:
                b = a + PI / 4
                m.stick((math.sin(a) * 0.95, -math.cos(a) * 0.95, 0.55), (math.sin(b) * 0.95, -math.cos(b) * 0.95, 0.55), 0.02, 'white', seg=4)
        m.cyl(1.2, 1.2, 0.08, 'white', 0, 0, 1.74, seg=8)
        m.cone(1.3, 0.8, 0x6CC4FF, 0, 0, 2.18, seg=8); m.ball(0.08, BRASS, 0, 0, 2.62, seg=8)
        for i in range(8):
            a = i * PI / 4 + PI / 8
            m.ball(0.06, ['rose', 'yellow'][i % 2], math.sin(a) * 1.2, -math.cos(a) * 1.2, 1.68, seg=8)
        f = m.part('flag', (0, 0, 2.66), ('sway', 'z', 0.35, 2.4))
        f.cyl(0.012, 0.012, 0.35, 'woodD', 0, 0, 2.82, seg=5); f.box(0.18, 0.02, 0.12, 'rose', 0.09, 0, 2.92, r=0.02)
        return m.build()

    def springbrunnen():
        m = Model('springbrunnen'); ST = 0xCFC5B8
        m.cyl(1.0, 1.05, 0.35, ST, 0, 0, 0.17, seg=24, bev=0.04); m.torus(1.0, 0.08, 0xE6DFD5, 0, 0, 0.35, seg=30, tseg=6)
        m.cyl(0.94, 0.94, 0.02, WATER, 0, 0, 0.31, seg=24)
        m.cyl(0.12, 0.16, 0.8, ST, 0, 0, 0.7, seg=10); m.cyl(0.45, 0.14, 0.15, ST, 0, 0, 1.08, seg=16)
        m.torus(0.44, 0.04, 0xE6DFD5, 0, 0, 1.15, seg=20, tseg=5); m.cyl(0.4, 0.4, 0.015, WATER, 0, 0, 1.13, seg=16)
        m.cyl(0.05, 0.08, 0.35, ST, 0, 0, 1.3, seg=8); m.cyl(0.2, 0.06, 0.08, ST, 0, 0, 1.5, seg=12)
        w = m.part('spout', (0, 0, 1.55), ('squish', 0.3, 0.9))
        w.ball(0.07, 0xBFEAFF, 0, 0, 1.68, sz=2.0, seg=10)
        for i in range(8):
            a = i * PI / 4
            pts = [(math.cos(a) * 0.42, math.sin(a) * 0.42, 1.12), (math.cos(a) * 0.62, math.sin(a) * 0.62, 0.9), (math.cos(a) * 0.72, math.sin(a) * 0.72, 0.32)]
            for p1, p2 in zip(pts, pts[1:]): m.stick(p1, p2, 0.02, 0xBFEAFF, seg=5)
        for i in range(3): m.ball(0.07, 0xFFB7C8 if i % 2 else 'yellow', math.cos(i * 2.1) * 0.6, math.sin(i * 2.1) * 0.6, 0.33, sz=0.3, seg=8)  # Seerosen
        return m.build()

    def windmuehle():
        m = Model('windmuehle')
        m.cyl(0.55, 0.85, 2.6, 0xFFF3E0, 0, 0, 1.3, seg=14, bev=0.04)
        m.cone(0.75, 0.9, 0xD27A5A, 0, 0, 3.05, seg=14); m.ball(0.12, 0xD27A5A, 0, 0, 3.52, seg=8)
        m.puff(0.5, 0.06, 0.75, 0x8F603C, 0, -0.8, 0.08, soft=0.3, taper=0, rx=0.18)
        m.heart(0.16, 'rose', 0, -0.84, 0.95, depth=0.25)
        for z in (1.1, 1.9): m.roundwin(0, -0.78 + (z - 1.1) * 0.15, z, r=0.16)
        m.cyl(0.1, 0.1, 0.4, 'woodD', 0, -0.65, 2.55, seg=8, rx=PI / 2)
        b = m.part('blades', (0, -0.88, 2.55), ('spin', 'y', 8.0))
        b.ball(0.12, 'woodD', 0, -0.88, 2.55, seg=10)
        for i in range(4):
            a = i * PI / 2 + 0.3
            b.stick((0, -0.9, 2.55), (math.sin(a) * 1.45, -0.9, 2.55 + math.cos(a) * 1.45), 0.03, 'woodD', seg=5)
            for r in (0.35, 0.65, 0.95, 1.25):
                b.box(0.32, 0.02, 0.26, 'white', math.sin(a) * r + math.cos(a) * 0.13, -0.92, 2.55 + math.cos(a) * r - math.sin(a) * 0.13, r=0.02, ry=a)
        return m.build()

    def glockenturm():
        m = Model('glockenturm')
        m.puff(1.0, 1.0, 0.3, 0xCFC5B8, 0, 0, 0, soft=0.3, taper=0); m.puff(0.8, 0.8, 2.6, 0xFFF3E0, 0, 0, 0.3, soft=0.2, taper=0.02)
        m.puff(0.95, 0.95, 0.12, 'white', 0, 0, 2.89, soft=0.3, taper=0)
        for x, y in ((-0.38, -0.38), (0.38, -0.38), (-0.38, 0.38), (0.38, 0.38)): m.cyl(0.06, 0.06, 0.9, 'white', x, y, 3.45, seg=8)
        m.puff(1.0, 1.0, 0.12, 'white', 0, 0, 3.89, soft=0.3, taper=0)
        m.cone(0.75, 1.0, 0x4F7FC9, 0, 0, 4.5, seg=4, rz=PI / 4); m.ball(0.06, BRASS, 0, 0, 5.05, seg=8)
        bell = m.part('bell', (0, 0, 3.6), ('sway', 'x', 0.3, 2.2))
        bell.cyl(0.12, 0.28, 0.4, BRASS, 0, 0, 3.4, seg=14, bev=0.03); bell.ball(0.06, BRASS, 0, 0, 3.18, seg=8)
        m.cyl(0.25, 0.25, 0.04, 'white', 0, -0.41, 2.1, seg=18, rx=PI / 2)
        m.box(0.02, 0.02, 0.16, 'dark', 0, -0.44, 2.16, r=0.005); m.box(0.12, 0.02, 0.02, 'dark', 0.05, -0.44, 2.1, r=0.005)
        m.door(0, -0.4, 0.3, w=0.4, h=0.65, color='teal')
        return m.build()

    def leuchtturm():
        m = Model('leuchtturm')
        m.cyl(0.8, 0.9, 0.3, 0xCFC5B8, 0, 0, 0.15, seg=14, bev=0.03)
        for i in range(6): m.cyl(0.55 - i * 0.04, 0.59 - i * 0.04, 0.6, 'red' if i % 2 else 'white', 0, 0, 0.6 + i * 0.6, seg=16)
        m.cyl(0.5, 0.5, 0.1, 'dark', 0, 0, 4.0, seg=14); m.torus(0.5, 0.025, 'dark', 0, 0, 4.3, seg=16, tseg=4)
        for i in range(8): a = i * PI / 4; m.cyl(0.015, 0.015, 0.3, 'dark', math.cos(a) * 0.5, math.sin(a) * 0.5, 4.15, seg=4)
        m.cyl(0.38, 0.38, 0.06, 'dark', 0, 0, 4.72, seg=12); m.cone(0.42, 0.45, 'red', 0, 0, 4.98, seg=12); m.ball(0.06, BRASS, 0, 0, 5.24, seg=8)
        m.cyl(0.3, 0.3, 0.6, 0xFFF3B0, 0, 0, 4.4, seg=10, glow=True)
        l = m.part('beam', (0, 0, 4.4), ('spin', 'z', 6.0))
        l.box(0.1, 0.62, 0.2, 0xFFF8C8, 0, 0, 4.4, r=0.04, glow=True)
        m.puff(0.3, 0.05, 0.5, 0x8F603C, 0, -0.88, 0.3, soft=0.3, taper=0, rx=0.15)
        for z in (1.6, 2.8): m.roundwin(0, -0.52 + (z - 1.6) * 0.03, z, r=0.13)
        return m.build()

    Math_floor = math.floor
    for f in (weg, blumen, zaun, heu, pilz, laterne, zwerg, bank, vogelhaus, kirschbaum, herz, brunnen, sonnenschirm, liegestuhl, sternlampe,
              hortensie, buchsbaum, rosenbogen, banana, tikifackel, haengematte, surfbrett, sandburg, pokal, baustelle, laternenpfahl, sonnenuhr,
              picknick, blumentor, fernrohr, statue, pavillon, springbrunnen, windmuehle, glockenturm, leuchtturm):
        o = f(); Q[o.name] = o
    for fl in (False, True): o = ptree(fl); Q[o.name] = o

    names = list(Q)
    path = export([Q[n] for n in names], 'place')

    def vis(o, show):
        for ob in [o] + list(o.children_recursive): ob.hide_render = not show
    for o in Q.values(): vis(o, False)
    for g_ in ('K_Ground', 'K_Path'):
        if bpy.data.objects.get(g_): bpy.data.objects[g_].hide_render = False
    small = ['weg', 'blumen', 'zaun', 'heu', 'pilz', 'zwerg', 'bank', 'hortensie', 'buchsbaum', 'surfbrett', 'sandburg', 'pokal', 'sonnenuhr', 'liegestuhl']
    mid = ['laterne', 'vogelhaus', 'kirschbaum', 'herz', 'brunnen', 'sonnenschirm', 'sternlampe', 'rosenbogen', 'banana', 'tikifackel', 'haengematte', 'ptree', 'ptree_flower', 'fernrohr', 'laternenpfahl', 'statue']
    big = ['baustelle', 'picknick', 'blumentor', 'pavillon', 'springbrunnen', 'windmuehle', 'glockenturm', 'leuchtturm']
    outs = []
    for i, (sh, cols, gap, zt) in enumerate(((small, 7, 1.3, 0.3), (mid, 8, 1.7, 0.9), (big, 4, 3.4, 1.6))):
        objs = [Q[n] for n in sh]
        for o in objs: vis(o, True)
        old = arrange(objs, cols=cols, gap=gap)
        rows = (len(objs) + cols - 1) // cols
        stage(target=(0, -(rows - 1) * gap * 0.45, zt), dist=cols * gap * 1.2 + 2, el=32, lens=40)
        outs.append(render('deko_%d' % (i + 1)))
        for o, p in zip(objs, old): o.location = p; vis(o, False)
    for o in Q.values(): o.location = (0, 0, 0)
    tris = {n: sum(len(p.vertices) - 2 for ob in [Q[n]] + list(Q[n].children_recursive) if ob.type == 'MESH' for p in ob.data.polygons) for n in names}
    log({'ok': True, 'glb': path, 'size': os.path.getsize(path), 'renders': outs, 'tris': tris, 'total': sum(tris.values())})
except Exception:
    log({'ok': False, 'error': traceback.format_exc()})
