# Alle Gebäude der Kuschelinsel (verspielt-süßer Stil). Ursprung = Mitte der Grundfläche, Vorderseite -Y.
# Bewegliche Teile: office_clock_h / office_clock_m (Uhrzeiger, im Spiel nach Spielzeit gedreht), dazu Keyframe-Loops.
try:
    clear()
    random.seed(11)
    B = {}

    def pot(m, x, y, c='rose', s=1.0):
        m.cyl(0.14 * s, 0.11 * s, 0.22 * s, 0xE08A62, x, y, 0.11 * s, seg=12, bev=0.02)
        m.ball(0.15 * s, 'leaf', x, y, 0.3 * s, sz=0.8, seg=10, bump=0.08)
        for i in range(3): m.ball(0.05 * s, c, x + math.cos(i * 2.1) * 0.08 * s, y - 0.04 * s + math.sin(i * 2.1) * 0.05 * s, 0.38 * s, seg=8)

    def stones(m, x0, x1, y, n=None, z=0.0):
        n = n or max(2, int((x1 - x0) / 0.55))
        for i in range(n):
            x = x0 + (i + 0.5) * (x1 - x0) / n
            m.ball(0.17, 'stoneD' if i % 2 else 'stone', x, y, z + 0.12, sy=0.5, sz=0.62, seg=10, bump=0.12)

    def chimney(m, x, y, zb, h=1.2, c='stone'):
        m.puff(0.48, 0.48, h, c, x, y, zb, soft=0.35, taper=0.08)
        m.puff(0.62, 0.62, 0.16, shade(c if isinstance(c, int) else P[c], -0.15), x, y, zb + h - 0.04, soft=0.4, taper=0)
        m.heart(0.14, 'rose', x, y - 0.25, zb + h * 0.55)

    # ---------- Rathaus ----------
    def office():
        m = Model('office'); W, D, Z, top = 4.6, 2.4, 0.28, 1.95
        m.puff(W + 0.6, D + 0.9, Z, 'stoneD', 0, 0.1, 0, soft=0.4, taper=0)
        m.puff(W, D, top + 0.1, 'cream', 0, 0, Z - 0.05, taper=0.04)
        m.gable(W - 0.2, D - 0.2, 1.0, 'cream', 0, 0, Z + top - 0.05)
        m.cuteroof(W, D, 1.0, 'blue', z=Z + top - 0.05, rows=4, ridge='blueD')
        # Uhrturm mit Zwiebelkuppel
        tz = Z + top + 0.45; ty = 0.25
        m.puff(1.35, 1.3, 1.55, 'cream', 0, ty, tz, taper=0.05)
        m.puff(1.6, 1.55, 0.18, 'white', 0, ty, tz + 1.5, soft=0.4, taper=0)
        m.ball(0.72, 'blue', 0, ty, tz + 1.66, sz=1.05, half=True, seg=20, taper=-0.25)
        m.cone(0.22, 0.5, 'blueD', 0, ty, tz + 2.6, seg=12)
        m.ball(0.12, 'yellow', 0, ty, tz + 2.9, seg=12)
        cy, cz = ty - 0.7, tz + 0.82
        m.cyl(0.46, 0.46, 0.08, 'white', 0, cy, cz, seg=32, rx=PI / 2, bev=0.02)
        m.torus(0.47, 0.06, 'yellow', 0, cy - 0.04, cz, rx=PI / 2, seg=28)
        for i in range(12):
            a = i * PI / 6
            m.ball(0.035 if i % 3 else 0.05, 'blueD', math.sin(a) * 0.36, cy - 0.06, cz + math.cos(a) * 0.36, seg=8)
        m.ball(0.05, 'dark', 0, cy - 0.08, cz, seg=8)
        h = m.part('clock_h', (0, cy - 0.09, cz)); h.box(0.07, 0.03, 0.24, 'dark', 0, cy - 0.09, cz + 0.11, r=0.03)
        mm = m.part('clock_m', (0, cy - 0.11, cz)); mm.box(0.05, 0.03, 0.34, 'dark', 0, cy - 0.11, cz + 0.16, r=0.024)
        # Tür, Säulen, gestreiftes Vordach, Stufen
        fy = -D / 2
        m.door(0, fy, Z, w=1.0, h=1.45, color='woodD', frame='white')
        for x in (-0.85, 0.85):
            m.cyl(0.14, 0.17, 1.6, 'white', x, fy - 0.5, Z + 0.8, seg=16, bev=0.03)
            m.ball(0.17, 'white', x, fy - 0.5, Z + 1.62, sz=0.6, seg=12)
        for i in range(8):
            x = -1.05 + i * 0.3
            m.box(0.3, 0.9, 0.12, 'blue' if i % 2 else 'white', x, fy - 0.35, Z + 1.78, r=0.05, rx=0.18)
            m.ball(0.15, 'blue' if i % 2 else 'white', x, fy - 0.8, Z + 1.7, sy=0.6, sz=0.7, seg=10)
        for i in range(3): m.puff(2.0 - i * 0.3, 0.42, 0.12, 'stone', 0, fy - 1.05 + i * 0.2, i * 0.1, soft=0.4, taper=0)
        for x in (-1.75, 1.75): m.window(x, fy + 0.02, Z + 1.05, w=0.62, h=0.72, shut='blue', box=['rose', 'yellow', 'white'])
        for x in (-0.75, 0.75): m.walllamp(x * 1.55, fy, Z + 1.45)
        # Fahnen (schwingen im Wind)
        for sx, c in ((-1, 'rose'), (1, 'sky')):
            x = sx * (W / 2 + 0.55)
            m.cyl(0.05, 0.06, 3.1, 'white', x, fy - 0.45, 1.55, seg=10)
            m.ball(0.1, 'yellow', x, fy - 0.45, 3.15, seg=10)
            f = m.part('flag' + ('L' if sx < 0 else 'R'), (x, fy - 0.45, 2.8), anim=('sway', 'z', 0.28, 2.6 + sx * 0.3))
            f.puff(0.66, 0.06, 0.42, c, x + sx * 0.36, fy - 0.45, 2.58, soft=0.45, taper=0.15)
            f.heart(0.16, 'white', x + sx * 0.38, fy - 0.49, 2.79)
            m.bush(sx * 1.4, fy - 0.85, 0, 0.75, flowers=['rose', 'yellow', 'white'])
        return m.build()

    # ---------- Dein Haus (Stufe 1–5) ----------
    def house(l):
        m = Model('house_%d' % l); WALL = [0, 0xFFE4D6, 0xFFF0C8, 0xE6F2FF, 0xFFE6F0, 0xFFF3E4][l]
        ROOF = [0, 'coral', 0x6FC7A4, 'blue', 0xE77BA0, 0xF2A15A][l]
        W = [0, 3.3, 3.5, 3.5, 4.2, 4.2][l]; D = 2.6; Z = 0.26; top = 1.7 + (0.15 if l >= 4 else 0)
        cx = 0.4 if l in (2, 3) else 0.0
        m.puff(W + 0.4, D + 0.5, Z, 'stoneD', cx, 0, 0, soft=0.4, taper=0)
        m.puff(W, D, top + 0.1, WALL, cx, 0, Z - 0.05, taper=0.05)
        m.gable(W - 0.2, D - 0.2, 1.2, WALL, cx, 0, Z + top - 0.05)
        m.cuteroof(W, D, 1.2, ROOF, x=cx, z=Z + top - 0.05, rows=4)
        chimney(m, 1.3, 0.5, Z + top + 0.2, 1.35)
        fy = -D / 2
        stones(m, cx - W / 2, cx + W / 2, fy - 0.15)
        m.door(cx - 0.6, fy, Z, w=0.85, h=1.25, color=['', 'teal', 'woodD', 'coral', 'purple', 'teal'][l], frame='woodD')
        m.puff(1.1, 0.5, 0.12, 'stone', cx - 0.6, fy - 0.35, 0, soft=0.4, taper=0)
        m.window(cx + 0.85, fy + 0.02, Z + 1.0, w=0.66, h=0.62, shut=ROOF, box=['rose', 'yellow', 'lilac'])
        m.roundwin(cx - W / 2 + 0.02, 0, Z + top + 0.45, r=0.22, ry=-PI / 2)
        m.walllamp(cx - 0.05, fy, Z + 1.35)
        m.bush(cx + W / 2 + 0.2, fy - 0.45, 0, 0.65, flowers=['rose', 'white'])
        pot(m, cx - 1.25, fy - 0.35)
        if l >= 2:  # Anbau links
            ax = cx - W / 2 - 0.75
            m.puff(1.5, 2.0, 1.4, WALL, ax, 0.15, Z - 0.05, taper=0.05)
            m.gable(1.4, 1.8, 0.8, WALL, ax, 0.15, Z + 1.3, rz=PI / 2)
            m.cuteroof(1.6, 1.4, 0.8, ROOF, x=ax, y=0.15, z=Z + 1.3, rows=3, rz=PI / 2, over=0.22, th=0.2)
            m.window(ax, fy + 0.35, Z + 0.8, w=0.5, h=0.5, box=['yellow', 'rose'])
        if l >= 3:  # Turm mit Wetterhahn
            tx = cx - W / 2 - 0.75 if l == 3 else cx + W / 2 + 0.2
            ty = 0.85 if l == 3 else 0.6
            m.cyl(0.62, 0.66, 3.0, WALL, tx, ty, 1.5, seg=24, bev=0.08)
            m.ball(0.85, ROOF, tx, ty, 3.0, sz=1.5, half=True, seg=22, taper=-0.2)
            m.torus(0.7, 0.1, shade(ROOF if isinstance(ROOF, int) else P[ROOF], 0.15), tx, ty, 3.0, seg=24)
            m.roundwin(tx, ty - 0.64, 2.2, r=0.2)
            m.cyl(0.025, 0.025, 0.8, 'dark', tx, ty, 4.55, seg=6)
            v = m.part('vane', (tx, ty, 4.9), anim=('spin', 'z', 9.0))
            v.box(0.5, 0.04, 0.04, 'dark', tx, ty, 4.9, r=0.015)
            v.heart(0.2, 'yellow', tx + 0.25, ty, 4.95, depth=0.5)
            v.cone(0.07, 0.14, 'dark', tx - 0.27, ty, 4.9, seg=4, ry=PI / 2)
        if l >= 4:  # Gaube und Balkon mit Blumen
            m.puff(0.9, 0.7, 0.75, WALL, cx + 0.6, fy + 0.65, Z + top + 0.15, taper=0.05)
            m.cuteroof(0.9, 0.75, 0.42, ROOF, x=cx + 0.6, y=fy + 0.65, z=Z + top + 0.85, rows=2, th=0.16, over=0.14)
            m.roundwin(cx + 0.6, fy + 0.29, Z + top + 0.5, r=0.2)
            for x in (-1.8, 1.8): pot(m, cx + x, fy - 0.55, 'yellow')
        if l >= 5:  # Veranda mit Säulen und zweitem Turm
            for x in (-1.5, -0.2):
                m.cyl(0.08, 0.1, 1.5, 'white', cx + x, fy - 0.55, Z + 0.75, seg=12)
            m.puff(1.8, 0.8, 0.12, ROOF, cx - 0.85, fy - 0.45, Z + 1.5, soft=0.4, taper=0)
            m.cyl(0.45, 0.5, 2.4, WALL, cx - W / 2 - 0.2, 0.7, 1.2, seg=20, bev=0.06)
            m.ball(0.62, ROOF, cx - W / 2 - 0.2, 0.7, 2.4, sz=1.4, half=True, seg=20, taper=-0.2)
            m.ball(0.12, 'yellow', cx - W / 2 - 0.2, 0.7, 3.35, seg=10)
        return m.build()

    # ---------- Krämerladen ----------
    def shop():
        m = Model('shop'); W, D, Z, top = 4.5, 2.4, 0.24, 1.9
        m.puff(W + 0.3, D + 0.3, Z, 'stoneD', 0, 0, 0, soft=0.4, taper=0)
        for i in range(8): m.puff(W, D, 0.27, 'wood' if i % 2 else 'woodL', 0, 0, Z - 0.02 + i * 0.235, soft=0.45, taper=0.02)
        m.gable(W - 0.2, D - 0.2, 1.1, 'woodL', 0, 0, Z + top - 0.05)
        m.cuteroof(W, D, 1.1, 'mint', z=Z + top - 0.05, rows=4, ridge='teal')
        fy = -D / 2
        m.box(1.7, 0.08, 0.95, 'glass', -1.0, fy - 0.03, Z + 1.0, r=0.04, glow=True)
        m.torus(0.1, 0.04, 'white', -1.0, fy - 0.06, Z + 1.0, seg=4) if False else None
        m.box(1.85, 0.14, 0.12, 'white', -1.0, fy - 0.06, Z + 1.52, r=0.05); m.box(1.95, 0.24, 0.12, 'white', -1.0, fy - 0.1, Z + 0.47, r=0.05)
        for x in (-1.0, -0.3, -1.7): m.ball(0.12, ['red', 'orange', 'yellow'][int((x + 1.7) / 0.7) % 3], x, fy - 0.12, Z + 0.62, seg=10)
        m.door(1.25, fy, Z, w=0.8, h=1.4, color='teal', frame='white')
        for i in range(12):  # Markise mit Wellenrand
            x = -W / 2 + (i + 0.5) * W / 12; c = 'white' if i % 2 else 'leaf'
            m.box(W / 12 + 0.01, 0.9, 0.06, c, x, fy - 0.42, Z + 1.95, r=0.025, rx=0.38)
            m.ball(W / 24, c, x, fy - 0.85, Z + 1.77, sy=0.35, seg=10)
        s = m.part('sign', (0, fy - 0.55, Z + 2.75), anim=('sway', 'x', 0.12, 2.2))
        s.cyl(0.02, 0.02, 0.3, 'dark', -0.4, fy - 0.55, Z + 2.62, seg=6); s.cyl(0.02, 0.02, 0.3, 'dark', 0.4, fy - 0.55, Z + 2.62, seg=6)
        s.puff(1.2, 0.1, 0.5, 'cream', 0, fy - 0.55, Z + 2.2, soft=0.45, taper=0)
        s.ball(0.17, 'leaf', 0, fy - 0.62, Z + 2.45, sx=1.4, sy=0.35, sz=0.8, seg=12, rz=0.4)
        m.box(2.2, 0.12, 0.12, 'woodD', 0, fy - 0.55, Z + 2.76, r=0.04)
        for i, (x, c) in enumerate(((-1.7, 'red'), (-1.1, 'orange'), (-1.4, 'yellow'))):
            yy = fy - 0.85 if i < 2 else fy - 0.55; zz = 0 if i < 2 else 0.4
            m.puff(0.55, 0.45, 0.38, 'woodL', x, yy, zz, soft=0.5, taper=0)
            for k in range(4): m.ball(0.1, c, x - 0.13 + (k % 2) * 0.26, yy - 0.06 + (k // 2) * 0.12, zz + 0.42, seg=10)
        m.cyl(0.25, 0.28, 0.55, 'wood', 2.05, fy - 0.6, 0.28, seg=14, bev=0.04)
        m.torus(0.27, 0.025, 'dark', 2.05, fy - 0.6, 0.15, seg=16); m.torus(0.27, 0.025, 'dark', 2.05, fy - 0.6, 0.42, seg=16)
        m.ball(0.16, 'leaf', 2.05, fy - 0.6, 0.62, seg=10, bump=0.1)
        return m.build()

    # ---------- Museum ----------
    def museum():
        m = Model('museum'); W, D, Z = 4.6, 3.2, 0.3; MARB = 0xFFF6EC
        for i in range(3): m.puff(W + 0.7 - i * 0.25, D + 0.9 - i * 0.25, 0.14, 'stone' if i % 2 else 'stoneD', 0, 0.1 + i * 0.05, i * 0.13, soft=0.4, taper=0)
        m.puff(W, D - 0.4, 2.1, MARB, 0, 0.25, Z + 0.1, taper=0.03)
        fy = -D / 2
        for i in range(5):
            x = -1.9 + i * 0.95
            m.cyl(0.16, 0.19, 1.95, 'white', x, fy + 0.05, Z + 1.07, seg=16, bev=0.03)
            m.puff(0.46, 0.46, 0.13, MARB, x, fy + 0.05, Z + 2.02, soft=0.4, taper=0)
        m.puff(W + 0.35, D + 0.1, 0.28, MARB, 0, 0.05, Z + 2.1, soft=0.4, taper=0)
        m.gable(W + 0.2, 0.6, 0.8, MARB, 0, fy + 0.2, Z + 2.35)
        m.box(W + 0.3, 0.3, 0.1, 'mint', 0, fy + 0.0, Z + 2.4, r=0.04)
        m.ball(1.55, 'mint', 0, 0.45, Z + 2.35, sz=0.8, half=True, seg=28)
        m.torus(1.55, 0.09, 'white', 0, 0.45, Z + 2.38, seg=32)
        for i in range(6):
            a = -PI / 2 + i * PI / 5
            m.roundwin(math.cos(a) * 1.5, 0.45 + math.sin(a) * 1.5 - 0.02, Z + 2.62, r=0.14, ry=a + PI / 2)
        m.cyl(0.08, 0.08, 0.4, 'white', 0, 0.45, Z + 3.75, seg=10)
        st = m.part('star', (0, 0.45, Z + 4.1), anim=('spin', 'z', 6.0))
        for k in range(5):
            a = k * 2 * PI / 5
            st.cone(0.09, 0.26, 'yellow', math.sin(a) * 0.13, 0.45, Z + 4.1 + math.cos(a) * 0.13, seg=4, ry=a)
        st.ball(0.13, 'yellow', 0, 0.45, Z + 4.1, sy=0.55, seg=12)
        m.door(0, fy + 0.45, Z, w=1.05, h=1.6, color='blueD', frame='white')
        for i in range(3): m.puff(1.9 - i * 0.3, 0.42, 0.12, 'stone', 0, fy - 0.75 + i * 0.2, i * 0.11, soft=0.4, taper=0)
        for sx in (-1, 1):
            b = m.part('banner' + ('L' if sx < 0 else 'R'), (sx * 1.42, fy - 0.12, Z + 1.95), anim=('sway', 'x', 0.08, 3.0 + sx * 0.4))
            b.puff(0.36, 0.06, 1.0, 'rose' if sx < 0 else 'sky', sx * 1.42, fy - 0.12, Z + 0.95, soft=0.45, taper=-0.1)
            b.ball(0.09, 'yellow', sx * 1.42, fy - 0.17, Z + 1.55, sy=0.4, seg=10)
            m.bush(sx * 2.45, fy - 0.55, 0, 0.7, flowers=['white', 'lilac'])
        return m.build()

    # ---------- Kleinkram am Dorfplatz ----------
    def board():
        m = Model('board')
        for x in (-0.55, 0.55): m.cyl(0.07, 0.08, 1.7, 'woodD', x, 0, 0.85, seg=10, bev=0.02)
        m.puff(1.25, 0.12, 0.95, 'woodL', 0, 0, 0.6, soft=0.45, taper=0)
        m.puff(1.05, 0.06, 0.78, 0xD9A86C, 0, -0.06, 0.68, soft=0.45, taper=0)
        for i, (x, z, c, r) in enumerate(((-0.28, 1.25, 'white', 0.1), (0.15, 1.3, 'yellow', -0.12), (0.3, 0.95, 'pink', 0.06), (-0.22, 0.88, 'sky', -0.05))):
            m.puff(0.3, 0.02, 0.26, c, x, -0.1, z - 0.13, soft=0.5, taper=0, rx=0)
            m.ball(0.03, 'red' if i % 2 else 'blue', x, -0.12, z + 0.1, seg=8)
        m.cuteroof(1.3, 0.5, 0.25, 'coral', z=1.65, rows=2, th=0.14, over=0.12)
        return m.build()

    def bin_():
        m = Model('bin')
        m.puff(0.9, 0.62, 0.55, 'wood', 0, 0, 0, soft=0.45, taper=0.04)
        for z in (0.12, 0.4): m.box(0.92, 0.64, 0.05, 'woodD', 0, 0, z, r=0.025)
        m.ball(0.47, 'woodL', 0, 0.02, 0.56, sx=1.0, sy=0.7, sz=0.32, half=True, seg=18)
        m.cyl(0.13, 0.13, 0.05, 'yellow', 0, -0.33, 0.3, seg=20, rx=PI / 2, bev=0.015)
        m.ball(0.06, 0xE0B040, 0, -0.36, 0.3, sy=0.3, seg=10)
        for i in range(3): m.cyl(0.08, 0.08, 0.03, 'yellow', 0.25 + i * 0.03, -0.45, 0.015 + i * 0.03, seg=12)
        return m.build()

    def mail(full):
        m = Model('mail_%d' % full)
        m.cyl(0.05, 0.06, 0.95, 'woodD', 0, 0, 0.47, seg=10)
        m.puff(0.36, 0.55, 0.3, 'blue', 0, 0, 0.92, soft=0.45, taper=0)
        m.cyl(0.18, 0.18, 0.55, 'blue', 0, 0, 1.2, seg=18, rx=PI / 2)
        m.heart(0.14, 'white', 0, -0.28, 1.05)
        if full:
            m.box(0.04, 0.03, 0.35, 'red', 0.2, 0.05, 1.32, r=0.015)
            m.puff(0.16, 0.03, 0.12, 'red', 0.27, 0.05, 1.38, soft=0.5, taper=0)
            m.puff(0.26, 0.04, 0.18, 'white', 0, -0.3, 1.18, soft=0.4, taper=0, rx=0.4)
        else:
            m.box(0.03, 0.03, 0.3, 'red', 0.2, 0.05, 1.0, r=0.015, ry=PI / 2)
        m.ball(0.14, 'leaf', 0.18, 0.1, 0.12, seg=10, bump=0.1); m.ball(0.05, 'rose', 0.18, 0.02, 0.22, seg=8)
        return m.build()

    def bench():  # Werkbank
        m = Model('bench')
        m.puff(1.8, 0.8, 0.14, 'woodL', 0, 0, 0.72, soft=0.4, taper=0)
        for x in (-0.75, 0.75):
            for y in (-0.3, 0.3): m.puff(0.12, 0.12, 0.72, 'woodD', x, y, 0, soft=0.45, taper=0)
        m.puff(1.6, 0.6, 0.06, 'wood', 0, 0, 0.25, soft=0.45, taper=0)
        m.puff(1.8, 0.08, 0.9, 0xC98F5C, 0, 0.38, 0.86, soft=0.45, taper=0)
        for x, c in ((-0.6, 'red'), (-0.2, 'blue'), (0.3, 'yellow')):
            m.box(0.06, 0.03, 0.3, 'dark', x, 0.32, 1.35, r=0.015); m.puff(0.18, 0.06, 0.1, c, x, 0.31, 1.18, soft=0.5, taper=0)
        m.box(0.5, 0.03, 0.28, 0xD0D6DC, 0.55, -0.1, 0.88, r=0.02, rx=-PI / 2, rz=0.3)
        m.cyl(0.05, 0.05, 0.12, 'woodD', 0.86, -0.25, 0.9, seg=8, ry=PI / 2, rz=0.3)
        m.box(0.28, 0.1, 0.1, 'dark', -0.35, -0.15, 0.91, r=0.03, rz=-0.3); m.cyl(0.03, 0.03, 0.35, 'wood', -0.2, -0.1, 0.9, seg=8, rx=PI / 2, rz=-0.3)
        m.cyl(0.18, 0.2, 0.35, 'woodD', -0.95, -0.55, 0.17, seg=12)
        m.ball(0.12, 'bark', -0.95, -0.55, 0.38, sz=0.4, seg=10)
        return m.build()

    def kitchen():  # Gartenküche
        m = Model('kitchen')
        m.puff(1.0, 0.8, 0.85, 0xD9826A, -0.4, 0, 0, soft=0.42, taper=0.04)
        for i in range(4): m.box(1.02, 0.82, 0.03, 0xB86A55, -0.4, 0, 0.18 + i * 0.2, r=0.01)
        m.puff(0.5, 0.06, 0.35, 'dark', -0.4, -0.4, 0.2, soft=0.5, taper=0)
        m.puff(0.36, 0.05, 0.22, 'orange', -0.4, -0.43, 0.24, soft=0.5, taper=0, glow=True)
        m.cyl(0.26, 0.22, 0.28, 0x7A8590, -0.4, 0, 0.99, seg=16, bev=0.03)
        lid = m.part('lid', (-0.4, 0, 1.14), anim=('bob', 0.03, 0.9))
        lid.ball(0.27, 0x9AA5B0, -0.4, 0, 1.13, sz=0.3, half=True, seg=16); lid.ball(0.05, 'dark', -0.4, 0, 1.22, seg=8)
        m.cyl(0.09, 0.09, 1.3, 0x7A8590, -0.7, 0.25, 1.5, seg=10); m.cyl(0.15, 0.1, 0.12, 0x7A8590, -0.7, 0.25, 2.2, seg=10)
        m.puff(1.0, 0.75, 0.82, 'woodL', 0.6, 0, 0, soft=0.42, taper=0.03)
        m.puff(1.06, 0.8, 0.08, 'white', 0.6, 0, 0.82, soft=0.4, taper=0)
        m.ball(0.1, 'red', 0.45, -0.1, 0.95, seg=10); m.ball(0.09, 'orange', 0.7, 0.05, 0.94, sz=1.4, rx=1.3, seg=10)
        m.ball(0.12, 'leaf', 0.85, -0.15, 0.97, bump=0.15, seg=10)
        m.puff(0.3, 0.05, 0.55, 'pink', 0.6, -0.39, 0.15, soft=0.5, taper=0)
        return m.build()

    # ---------- Dorfbaum (pro Jahreszeit) ----------
    def plazatree(season):
        m = Model('plazatree_' + season)
        L = {'spring': [0xFFB7D0, 0xFFC8DC, 0xFFA3C4], 'summer': ['leaf', 'leafD', 'leafL'], 'autumn': [0xF2A23A, 0xE9822F, 0xF7C15A], 'winter': [0xEEF4F8, 0xFFFFFF, 0xDDE8F0]}[season]
        m.cyl(1.0, 1.05, 0.3, 'stone', 0, 0, 0.15, seg=24, bev=0.06)
        m.cyl(0.88, 0.88, 0.3, 0x7A5232, 0, 0, 0.18, seg=24)
        for i in range(14):
            a = i * 2 * PI / 14
            m.ball(0.17, 'stoneD' if i % 2 else 'stone', math.cos(a) * 0.98, math.sin(a) * 0.98, 0.3, sz=0.6, seg=10, bump=0.1)
        m.cone(0.5, 0.5, 'bark', 0, 0, 0.5, seg=14)
        m.cyl(0.32, 0.24, 2.2, 'bark', 0, 0, 1.4, seg=14, bev=0.05)
        for a in (0.4, 2.5, 4.4): m.stick((0, 0, 1.8), (math.cos(a) * 0.9, math.sin(a) * 0.9, 2.5), 0.11, 'bark', 0.06)
        for i, (x, y, z, r) in enumerate([(0, 0, 3.0, 1.45), (1.05, -0.2, 2.65, 0.95), (-1.05, 0.15, 2.7, 1.0), (0.25, 0.1, 3.85, 0.95), (-0.35, -0.85, 2.6, 0.85), (0.4, 0.95, 2.75, 0.9), (-0.7, 0.7, 3.3, 0.75)]):
            m.ball(r, L[i % 3], x, y, z, sz=0.88, seg=20, bump=0.1)
        if season == 'spring':
            for i in range(26):
                a = i * 2.39996; e = -0.2 + (i % 5) * 0.25
                p = Vector((math.cos(a) * math.cos(e), math.sin(a) * math.cos(e), math.sin(e))) * 1.5 + Vector((0, 0, 3.0))
                m.ball(0.08, 'white' if i % 2 else 0xFF7FA8, p.x, min(p.y, -abs(p.y) * 0.3 + 0.5), p.z, seg=8)
        if season != 'winter':
            F = {'spring': ['white', 'pink', 'lilac'], 'summer': ['rose', 'yellow', 'white'], 'autumn': ['orange', 'red', 'yellow']}[season]
            for i in range(12):
                a = i * 2 * PI / 12 + 0.2
                m.ball(0.07, F[i % 3], math.cos(a) * 0.6, math.sin(a) * 0.6, 0.38, seg=8)
        return m.build()

    # ---------- Häuschen der Nachbarn ----------
    VH = {'mira': (0xFFEAE0, 0xFF8FAB, 'berry'), 'bruno': (0xD9A46B, 0x4F9A5A, 'woodD'), 'pippa': (0xDDF0FF, 0x5AA0E0, 'blueD'),
          'lio': (0xFFD0A0, 0xE0603E, 'woodD'), 'kalle': (0xFFF1CC, 0x7FBF6A, 'teal'), 'wanda': (0xF3E6FF, 0xFF8FC2, 'purple')}
    def vhouse(id):
        wall, roof, door = VH[id]
        m = Model('vhouse_' + id); W, D, Z, top = 1.9, 1.6, 0.18, 1.2
        fy = -D / 2 + 0.1
        if id == 'wanda':  # rundes Häuschen mit Kuppel und Fernrohr
            m.cyl(1.0, 1.05, 0.2, 'stoneD', 0, 0.1, 0.1, seg=24, bev=0.04)
            m.cyl(0.9, 0.95, 1.4, wall, 0, 0.1, 0.85, seg=28, bev=0.08)
            m.ball(1.05, roof, 0, 0.1, 1.5, sz=0.85, half=True, seg=24)
            m.torus(0.97, 0.1, shade(roof, 0.25), 0, 0.1, 1.52, seg=28)
            m.cyl(0.08, 0.1, 0.6, 'blueD', 0.4, 0.3, 2.35, seg=10, rx=0.8)
            m.ball(0.1, 'yellow', 0, 0.1, 2.42, seg=10)
            fy = -0.8
        elif id == 'bruno':  # Blockhütte
            m.puff(W + 0.2, D + 0.2, Z, 'stoneD', 0, 0.1, 0, soft=0.4, taper=0)
            for i in range(5): m.cyl(0.14, 0.14, W + 0.15, 'wood' if i % 2 else 0xC48A55, 0, 0.1 - D / 2 + 0.08, Z + 0.12 + i * 0.24, seg=12, ry=PI / 2)
            m.puff(W, D - 0.1, top, wall, 0, 0.15, Z, taper=0.04)
            m.gable(W - 0.1, D - 0.1, 0.9, wall, 0, 0.1, Z + top - 0.05)
            m.cuteroof(W, D, 0.9, roof, y=0.1, z=Z + top - 0.05, rows=3, th=0.2, over=0.24)
            m.cyl(0.2, 0.2, 0.5, 'bark', 1.25, -0.5, 0.25, seg=14); m.cyl(0.17, 0.17, 0.02, 'woodL', 1.25, -0.5, 0.51, seg=14)
        else:
            m.puff(W + 0.2, D + 0.2, Z, 'stoneD', 0, 0.1, 0, soft=0.4, taper=0)
            m.puff(W, D, top + 0.1, wall, 0, 0.1, Z - 0.05, taper=0.06)
            if id == 'kalle':  # geschwungenes Teehaus-Dach
                m.ball(1.25, roof, 0, 0.1, Z + top, sx=1.0, sy=0.9, sz=0.75, half=True, seg=24, taper=-0.15)
                m.torus(1.2, 0.12, shade(roof, 0.25), 0, 0.1, Z + top + 0.05, seg=28)
                m.cone(0.2, 0.35, roof, 0, 0.1, Z + top + 1.05, seg=12); m.ball(0.13, 'yellow', 0, 0.1, Z + top + 1.27, seg=10)
            else:
                m.gable(W - 0.2, D - 0.2, 0.95, wall, 0, 0.1, Z + top - 0.05)
                m.cuteroof(W, D, 0.95, roof, y=0.1, z=Z + top - 0.05, rows=3, th=0.2, over=0.24)
        m.door(-0.35, fy, Z, w=0.6, h=0.95, color=door, frame='white', heart='yellow' if id != 'bruno' else None)
        m.roundwin(0.45, fy - 0.02, Z + 0.7, r=0.2)
        # Briefkasten und Schild mit Motiv
        m.cyl(0.035, 0.035, 0.7, 'woodD', 1.15, fy - 0.35, 0.35, seg=8)
        m.puff(0.26, 0.36, 0.22, roof, 1.15, fy - 0.35, 0.68, soft=0.45, taper=0)
        sx, sz = 0.45, Z + 1.18
        m.puff(0.42, 0.06, 0.34, 'white', sx, fy - 0.06, sz - 0.17, soft=0.45, taper=0)
        if id == 'mira': m.ball(0.12, 0xE0A060, sx, fy - 0.12, sz, sx=1.5, sy=0.4, sz=0.8, seg=12)            # Brot
        if id == 'bruno': m.box(0.06, 0.04, 0.26, 'woodD', sx, fy - 0.12, sz, r=0.02, ry=0.6); m.box(0.18, 0.05, 0.1, 'dark', sx + 0.06, fy - 0.12, sz + 0.08, r=0.03)
        if id == 'pippa': m.ball(0.11, 'sky', sx, fy - 0.12, sz, sx=1.5, sy=0.4, sz=0.8, seg=12); m.cone(0.08, 0.12, 'sky', sx + 0.17, fy - 0.12, sz, seg=4, ry=PI / 2)
        if id == 'lio':
            m.ball(0.14, 'woodL', sx, fy - 0.12, sz, sx=1.2, sy=0.3, seg=12)
            for k, c in enumerate(('red', 'yellow', 'blue')): m.ball(0.035, c, sx - 0.06 + k * 0.06, fy - 0.16, sz + 0.03, seg=6)
        if id == 'kalle': m.ball(0.12, 'teal', sx, fy - 0.12, sz - 0.02, sy=0.5, seg=12); m.cyl(0.02, 0.03, 0.12, 'teal', sx + 0.13, fy - 0.12, sz, seg=6, ry=1.0)
        if id == 'wanda': m.torus(0.08, 0.025, 'dark', sx, fy - 0.12, sz + 0.03, rx=PI / 2, seg=12); m.box(0.03, 0.03, 0.12, 'dark', sx + 0.07, fy - 0.12, sz - 0.07, r=0.01, ry=0.6)
        m.bush(-1.05, fy - 0.3, 0, 0.5, flowers=['rose', 'yellow', 'white'])
        return m.build()

    # ---------- Tor (Insel und Bummelgasse) ----------
    def gate():
        m = Model('gate')
        for sx in (-1, 1):
            m.puff(0.55, 0.55, 2.4, 'cream', sx * 1.4, 0, 0, taper=0.06)
            m.puff(0.7, 0.7, 0.16, 'stoneD', sx * 1.4, 0, 0, soft=0.4, taper=0)
            m.heart(0.42, 'rose', sx * 1.4, -0.05, 2.75, depth=0.45)
            m.bush(sx * 2.0, -0.2, 0, 0.6, flowers=['rose', 'yellow'])
        m.torus(1.4, 0.1, 'woodD', 0, 0, 2.2, arc=PI, rx=PI / 2, seg=20)
        m.puff(2.3, 0.14, 0.5, 'white', 0, -0.05, 2.45, soft=0.45, taper=0)
        m.puff(0.36, 0.05, 0.3, 'rose', 0, -0.13, 2.55, soft=0.5, taper=0.25)
        m.torus(0.08, 0.025, 'rose', 0, -0.13, 2.86, arc=PI, rx=PI / 2, seg=10)
        for i in range(9):
            a = i / 8 * PI
            m.ball(0.06, 'yellow', math.cos(a) * 1.4, -0.08, 2.2 + math.sin(a) * 1.4, seg=8, glow=True)
        b = m.part('bunting', (0, 0, 3.4), anim=('sway', 'x', 0.1, 2.8))
        cols = ['rose', 'yellow', 'sky', 'leaf', 'lilac']
        for i in range(7): b.cone(0.13, 0.26, cols[i % 5], -0.95 + i * 0.32, -0.05, 3.18 - math.sin(i / 6 * PI) * 0.12, seg=3, rx=PI, rz=PI / 6)
        return m.build()

    # ---------- Käpt'n Flossis Boot ----------
    def boat_parts(m, x=0, y=0, name='hull'):
        h = m.part(name, (x, y, 0), anim=('bob', 0.07, 3.2))
        h.ball(0.62, 'white', x, y, -0.05, sx=1.0, sy=2.1, sz=0.5, seg=20, soft=0.8)
        h.ball(0.64, 'red', x, y, -0.15, sx=1.0, sy=2.12, sz=0.22, seg=20, soft=0.8)
        h.puff(1.05, 2.3, 0.1, 'woodL', x, y, 0.13, soft=0.45, taper=0)
        h.puff(0.72, 0.62, 0.45, 'woodL', x, y + 0.5, 0.2, soft=0.4, taper=0.05)
        h.puff(0.84, 0.74, 0.1, 'sky', x, y + 0.5, 0.64, soft=0.45, taper=0)
        h.roundwin(x, y + 0.18, 0.43, r=0.12)
        h.cyl(0.04, 0.05, 2.0, 'woodD', x, y - 0.35, 1.2, seg=8)
        h.ball(0.5, 'white', x, y - 0.6, 1.3, sx=0.06, sy=0.5, sz=1.3, seg=14, half=True, ry=0)
        h.ball(0.06, 'yellow', x, y - 0.35, 2.22, seg=8)
        h.torus(0.14, 0.05, 'red', x + 0.5, y - 0.6, 0.35, ry=PI / 2, seg=14)
        # Robbe Käpt'n Flossi mit Mütze
        h.ball(0.22, 0x9AA6B2, x, y - 0.05, 0.5, sz=1.2, seg=14); h.ball(0.17, 0x9AA6B2, x, y - 0.1, 0.82, seg=14)
        h.ball(0.07, 0xD9DDE2, x, y - 0.24, 0.79, sx=1.4, sy=0.8, seg=10); h.ball(0.035, 'dark', x, y - 0.3, 0.82, seg=8)
        for k in (-1, 1): h.ball(0.03, 'dark', x + k * 0.07, y - 0.24, 0.88, seg=8); h.ball(0.035, 'blush', x + k * 0.12, y - 0.22, 0.8, sy=0.4, seg=8)
        h.cyl(0.16, 0.17, 0.08, 0x2F3E5C, x, y - 0.08, 0.98, seg=14); h.puff(0.24, 0.12, 0.03, 0x2F3E5C, x, y - 0.24, 0.94, soft=0.5, taper=0)
        h.ball(0.04, 'yellow', x, y - 0.24, 1.0, sy=0.4, seg=8)
    def boat():
        m = Model('boat'); boat_parts(m); return m.build()

    # ---------- Bummelgasse ----------
    def storefront(m, wall, roof, door, awn, W=4.8):
        D, Z, top = 2.4, 0.22, 2.05
        m.puff(W + 0.3, D + 0.3, Z, 'stoneD', 0, 0, 0, soft=0.4, taper=0)
        m.puff(W, D, top + 0.1, wall, 0, 0, Z - 0.05, taper=0.04)
        m.gable(W - 0.2, D - 0.2, 1.05, wall, 0, 0, Z + top - 0.05)
        m.cuteroof(W, D, 1.05, roof, z=Z + top - 0.05, rows=4)
        fy = -D / 2
        m.box(1.6, 0.08, 0.95, 'glass', -1.0, fy - 0.03, Z + 1.05, r=0.05, glow=True)
        m.box(1.75, 0.14, 0.12, 'white', -1.0, fy - 0.06, Z + 1.58, r=0.05); m.box(1.85, 0.24, 0.12, 'white', -1.0, fy - 0.1, Z + 0.52, r=0.05)
        m.door(1.25, fy, Z, w=0.85, h=1.45, color=door, frame='white')
        for i in range(12):
            x = -W / 2 + (i + 0.5) * W / 12; c = awn[i % 2]
            m.box(W / 12 + 0.01, 0.85, 0.06, c, x, fy - 0.4, Z + 2.0, r=0.025, rx=0.38)
            m.ball(W / 24, c, x, fy - 0.8, Z + 1.83, sy=0.35, seg=10)
        m.puff(1.6, 0.12, 0.5, 'cream', 0, fy - 0.12, Z + 2.35, soft=0.45, taper=0)
        return fy, Z
    def tailor():
        m = Model('tailor'); fy, Z = storefront(m, 0xFFE3EC, 0xE07AA0, 'purple', ['white', 'lilac'])
        m.cyl(0.17, 0.17, 0.08, 'rose', 0, fy - 0.2, Z + 2.6, seg=16, rx=PI / 2); m.cyl(0.1, 0.1, 0.1, 'cream', 0, fy - 0.2, Z + 2.6, seg=12, rx=PI / 2)
        m.box(0.5, 0.02, 0.02, 0xC4CCD4, 0.12, fy - 0.26, Z + 2.68, r=0.008, ry=0.4)
        m.cyl(0.02, 0.02, 0.6, 'woodD', -1.0, fy + 0.15, Z + 0.85, seg=6)
        m.ball(0.2, 'mint', -1.0, fy + 0.15, Z + 1.28, sz=1.4, seg=12); m.ball(0.07, 'yellow', -1.0, fy + 0.02, Z + 1.55, seg=8)
        return m.build()
    def garden():
        m = Model('garden'); fy, Z = storefront(m, 0xE8F6DA, 0x5FB44E, 'woodD', ['white', 'leaf'])
        m.ball(0.2, 'leaf', 0, fy - 0.2, Z + 2.62, sx=1.5, sy=0.35, sz=0.8, seg=12, rz=0.4); m.cyl(0.015, 0.015, 0.25, 'leafD', 0.15, fy - 0.22, Z + 2.55, seg=5, ry=0.8)
        for i, c in enumerate(('rose', 'yellow', 'lilac', 'orange')): pot(m, -2.0 + i * 0.5 if i < 3 else 2.15, fy - 0.45, c)
        return m.build()
    def club():
        m = Model('club'); W, D, Z, top = 5.2, 2.4, 0.22, 2.3; WALL = 0x46406E
        m.puff(W + 0.3, D + 0.3, Z, 0x5D5862, 0, 0, 0, soft=0.4, taper=0)
        m.puff(W, D, top + 0.1, WALL, 0, 0, Z - 0.05, taper=0.04)
        m.gable(W - 0.2, D - 0.2, 0.7, WALL, 0, 0, Z + top - 0.05)
        m.cuteroof(W, D, 0.7, 0x2E2950, z=Z + top - 0.05, rows=3, light=0x3C3668, ridge=0x6C63A8)
        fy = -D / 2
        m.door(0, fy, Z, w=1.1, h=1.6, color='purple', frame=0x6C63A8, heart='rose')
        m.puff(1.6, 0.6, 0.1, 0x6C63A8, 0, fy - 0.3, Z + 1.75, soft=0.45, taper=0)
        for x in (-1.8, 1.8): m.roundwin(x, fy + 0.01, Z + 1.2, r=0.32, frame=0x6C63A8)
        m.ball(0.36, 'yellow', 0, fy - 0.1, Z + 2.7, sy=0.25, seg=20, glow=True); m.ball(0.31, WALL, 0.17, fy - 0.15, Z + 2.77, sy=0.25, seg=20)
        for i in range(13):
            x = -W / 2 + 0.2 + i * (W - 0.4) / 12
            m.ball(0.06, ['rose', 'yellow', 'sky', 'leaf'][i % 4], x, fy - 0.08, Z + 2.05 - math.sin(i / 12 * PI) * 0.18, seg=8, glow=True)
        d = m.part('disco', (1.6, 0.3, Z + top + 1.0), anim=('spin', 'z', 4.0))
        d.ball(0.28, 0xD8E0EA, 1.6, 0.3, Z + top + 1.0, seg=12); d.ball(0.1, 'white', 1.5, 0.2, Z + top + 1.1, seg=6, glow=True)
        m.cyl(0.02, 0.02, 0.5, 'dark', 1.6, 0.3, Z + top + 1.45, seg=6)
        for x, c in ((-2.35, 'rose'), (2.35, 'sky')): m.cyl(0.05, 0.05, 1.6, 'dark', x, fy - 0.45, 0.8, seg=8); m.ball(0.14, c, x, fy - 0.45, 1.68, seg=10, glow=True)
        return m.build()

    # ---------- Tropeninsel ----------
    def hut():
        m = Model('hut'); W, D, Z, top = 4.0, 2.3, 0.3, 1.6; HAY = 0xF2CF6B
        m.puff(W + 0.4, D + 0.4, Z, 'woodD', 0, 0, 0, soft=0.4, taper=0)
        for i in range(7): m.puff(W, D, 0.24, 'wood' if i % 2 else 'woodL', 0, 0, Z - 0.02 + i * 0.22, soft=0.45, taper=0.02)
        m.gable(W - 0.2, D - 0.2, 1.3, 'woodL', 0, 0, Z + top - 0.05)
        m.cuteroof(W, D, 1.3, HAY, z=Z + top - 0.05, rows=5, light=0xF7DC8A, ridge=0xD9B45A, over=0.5)
        fy = -D / 2
        m.puff(0.85, 0.06, 1.25, 0x5A4636, 0, fy - 0.02, Z, soft=0.45, taper=0)
        m.puff(1.5, 0.08, 0.42, 'cream', 0, fy - 0.35, Z + 1.8, soft=0.45, taper=0)
        m.ball(0.14, 'red', -0.4, fy - 0.42, Z + 1.82, sz=1.2, seg=10); m.ball(0.09, 'yellow', -0.38, fy - 0.45, Z + 1.98, seg=8)
        for sx in (-1, 1):
            m.cyl(0.05, 0.06, 1.8, 'woodD', sx * 2.5, fy - 0.3, 0.9, seg=8); m.cone(0.12, 0.18, HAY, sx * 2.5, fy - 0.3, 1.9, seg=8)
            m.ball(0.09, 'orange', sx * 2.5, fy - 0.3, 2.05, sz=1.5, seg=8, glow=True)
        k = m.part('kiki', (1.6, fy - 0.55, 1.0), anim=('bob', 0.06, 1.6))
        k.box(0.4, 0.04, 0.04, 'woodD', 1.6, fy - 0.55, 0.92, r=0.015)
        k.ball(0.13, 0x3FBF5A, 1.6, fy - 0.55, 1.06, sz=1.3, seg=12); k.ball(0.09, 'red', 1.6, fy - 0.57, 1.26, seg=10)
        k.cone(0.03, 0.08, 'yellow', 1.6, fy - 0.67, 1.24, seg=6, rx=PI / 2); k.ball(0.06, 0x3F7FD9, 1.6, fy - 0.5, 0.9, sx=0.8, sz=2, seg=8)
        m.cyl(0.02, 0.02, 0.9, 'woodD', 1.6, fy - 0.55, 0.45, seg=6)
        return m.build()
    def dock():
        m = Model('dock')
        for i in range(9): m.puff(1.5, 0.46, 0.1, 'woodL' if i % 2 else 'wood', 0, -9.1 - i * 0.5, -0.03, soft=0.45, taper=0)
        for sx in (-1, 1):
            for i in range(4): m.cyl(0.07, 0.08, 1.0, 'woodD', sx * 0.72, -9.3 - i * 1.3, -0.3, seg=8)
        boat_parts(m, 1.6, -12.0, 'boat')
        return m.build()

    for f in (office, shop, museum, board, bin_, bench, kitchen, gate, boat, tailor, garden, club, hut, dock):
        o = f(); B[o.name] = o
    for l in range(1, 6): o = house(l); B[o.name] = o
    for full in (0, 1): o = mail(full); B[o.name] = o
    for s_ in ('spring', 'summer', 'autumn', 'winter'): o = plazatree(s_); B[o.name] = o
    for id in VH: o = vhouse(id); B[o.name] = o

    names = list(B)
    path = export([B[n] for n in names], 'buildings')
    # Kontaktbögen
    sheets = [['office', 'house_1', 'house_3', 'house_5', 'shop', 'museum', 'plazatree_summer', 'plazatree_spring'],
              ['vhouse_mira', 'vhouse_bruno', 'vhouse_pippa', 'vhouse_lio', 'vhouse_kalle', 'vhouse_wanda', 'gate', 'boat'],
              ['tailor', 'garden', 'club', 'hut', 'board', 'bin', 'mail_1', 'bench', 'kitchen', 'house_2', 'house_4', 'plazatree_autumn']]
    def vis(o, show):
        for ob in [o] + list(o.children_recursive): ob.hide_render = not show
    for o in B.values(): vis(o, False)
    outs = []
    for i, sh in enumerate(sheets):
        objs = [B[n] for n in sh]
        for o in objs: vis(o, True)
        old = arrange(objs, cols=4, gap=6.5)
        rows = (len(objs) + 3) // 4
        stage(target=(0, -(rows - 1) * 6.5 * 0.45 - 0.5, 1.2), dist=15 + rows * 7.5, el=38, lens=40)
        outs.append(render('gebaeude_%d' % (i + 1)))
        for o, p in zip(objs, old): o.location = p; vis(o, False)
    for o in B.values(): o.location = (0, 0, 0)
    tris = {n: sum(len(p.vertices) - 2 for ob in [B[n]] + list(B[n].children_recursive) if ob.type == 'MESH' for p in ob.data.polygons) for n in names}
    log({'ok': True, 'glb': path, 'size': os.path.getsize(path), 'renders': outs, 'tris': tris, 'total': sum(tris.values())})
except Exception:
    log({'ok': False, 'error': traceback.format_exc()})
