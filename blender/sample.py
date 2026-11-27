# Stilprobe: Rathaus, Haus, Apfelbaum, Tulpe, Bank, Nachbarin Mira (Igel-Bäckerin), Spielfigur
try:
    clear()
    random.seed(7)

    def cityhall():
        m = Model('cityhall'); W, D, top, B = 4.6, 2.6, 2.0, 0.3
        m.box(W + 0.5, D + 0.8, B, 'stoneD', 0, 0.1, B / 2, r=0.1)
        m.box(W, D, top, 'cream', 0, 0, B + top / 2, r=0.16)
        m.gable(W - 0.06, D - 0.06, 1.0, 'cream', 0, 0, B + top)
        m.roof(W, D, 1.0, 'blue', z=B + top, th=0.24, over=0.3, ridge='blueD')
        # Uhrturm
        tz = B + top + 0.55
        m.box(1.25, 1.25, 1.5, 'cream', 0, 0.25, tz + 0.75, r=0.12)
        m.box(1.5, 1.5, 0.16, 'white', 0, 0.25, tz + 1.55, r=0.06)
        m.cyl(1.02, 0.06, 1.15, 'blue', 0, 0.25, tz + 2.2, seg=4, rz=PI / 4, bev=0.04)
        m.ball(0.11, 'yellow', 0, 0.25, tz + 2.85)
        cy = 0.25 - 0.66
        m.cyl(0.42, 0.42, 0.08, 'white', 0, cy, tz + 0.85, seg=28, rx=PI / 2, bev=0.02)
        m.torus(0.42, 0.045, 'yellow', 0, cy - 0.04, tz + 0.85, rx=PI / 2)
        m.box(0.05, 0.03, 0.26, 'dark', 0, cy - 0.06, tz + 0.95, r=0.015)
        m.box(0.2, 0.03, 0.05, 'dark', 0.08, cy - 0.06, tz + 0.85, r=0.015)
        # Tür mit Rundbogen, Säulen, Vordach, Stufen
        fy = -D / 2
        m.box(0.95, 0.12, 1.15, 'woodD', 0, fy - 0.03, B + 0.58, r=0.04)
        m.cyl(0.475, 0.475, 0.12, 'woodD', 0, fy - 0.03, B + 1.15, seg=24, rx=PI / 2)
        m.torus(0.5, 0.06, 'white', 0, fy - 0.06, B + 1.15, arc=PI, rx=PI / 2)
        m.ball(0.06, 'yellow', 0.3, fy - 0.12, B + 0.6)
        m.box(0.12, 0.03, 0.7, 'woodD', -0.18, fy - 0.1, B + 0.55, r=0.02)
        for x in (-0.85, 0.85):
            m.cyl(0.13, 0.15, 1.55, 'white', x, fy - 0.45, B + 0.78, seg=16)
            m.box(0.34, 0.34, 0.1, 'white', x, fy - 0.45, B + 1.58, r=0.04)
        m.box(2.3, 0.85, 0.16, 'white', 0, fy - 0.3, B + 1.7, r=0.06)
        m.box(2.0, 0.6, 0.1, 'blue', 0, fy - 0.3, B + 1.82, r=0.04)
        for i in range(3): m.box(1.9 - i * 0.25, 0.4, 0.1, 'stone', 0, fy - 0.95 + i * 0.2, 0.05 + i * 0.1, r=0.04)
        for x in (-1.7, 1.7): m.window(x, fy, B + 1.05, w=0.62, h=0.72, shut='blue', box=['rose', 'yellow', 'white'])
        # Fahnen und Büsche
        for sx, c in ((-1, 'rose'), (1, 'sky')):
            x = sx * (W / 2 + 0.5)
            m.cyl(0.05, 0.06, 3.1, 'white', x, fy - 0.5, 1.55, seg=10)
            m.ball(0.09, 'yellow', x, fy - 0.5, 3.15)
            m.box(0.62, 0.04, 0.4, c, x + sx * 0.33, fy - 0.5, 2.78, r=0.03)
            m.bush(sx * 1.35, fy - 0.75, 0, 0.75, flowers=['rose', 'yellow', 'white'])
        return m.build()

    def house():
        m = Model('house'); W, D, top, B = 3.8, 2.8, 1.75, 0.3
        WALL = 0xFFE8DA
        m.box(W + 0.3, D + 0.3, B, 'stoneD', 0, 0, B / 2, r=0.1)
        for i in range(5):  # Bruchsteine am Sockel
            m.ball(0.17, 'stoneD', -W / 2 + 0.3 + i * 0.8, -D / 2 - 0.12, 0.17, sy=0.45, sz=0.75, seg=8, bump=0.1)
        m.box(W, D, top, WALL, 0, 0, B + top / 2, r=0.15)
        m.gable(W - 0.06, D - 0.06, 1.25, WALL, 0, 0, B + top)
        m.roof(W, D, 1.25, 'coral', z=B + top, th=0.24, over=0.3, ridge='berry')
        m.box(0.5, 0.5, 1.3, 'stone', 1.05, 0.45, B + top + 1.0, r=0.08)
        m.box(0.62, 0.62, 0.12, 'stoneD', 1.05, 0.45, B + top + 1.68, r=0.04)
        fy = -D / 2
        # Holzbalken (Fachwerk)
        for x in (-W / 2 + 0.06, W / 2 - 0.06): m.box(0.14, 0.1, top - 0.1, 'woodD', x, fy - 0.03, B + top / 2, r=0.04)
        m.box(W - 0.1, 0.1, 0.13, 'woodD', 0, fy - 0.03, B + top - 0.08, r=0.04)
        # Tür
        m.box(0.85, 0.12, 1.05, 'teal', -0.55, fy - 0.03, B + 0.53, r=0.04)
        m.cyl(0.425, 0.425, 0.12, 'teal', -0.55, fy - 0.03, B + 1.05, seg=24, rx=PI / 2)
        m.torus(0.46, 0.05, 'woodD', -0.55, fy - 0.07, B + 1.05, arc=PI, rx=PI / 2)
        m.ball(0.055, 'yellow', -0.3, fy - 0.12, B + 0.6)
        m.box(1.1, 0.5, 0.12, 'stone', -0.55, fy - 0.3, 0.06, r=0.05)
        # Fenster, rundes Giebelfenster, Laterne
        m.window(0.95, fy, B + 1.0, w=0.7, h=0.66, frame='white', shut='mint', box=['rose', 'yellow', 'lilac'])
        m.cyl(0.24, 0.24, 0.06, 'glass', -1.9, 0, B + top + 0.5, seg=20, ry=PI / 2, glow=True)
        m.torus(0.25, 0.05, 'white', -1.93, 0, B + top + 0.5, ry=PI / 2)
        m.box(0.16, 0.16, 0.22, 'dark', -1.2, fy - 0.18, B + 1.35, r=0.04)
        m.box(0.1, 0.1, 0.14, 'yellow', -1.2, fy - 0.18, B + 1.35, r=0.02, glow=True)
        m.bush(1.55, fy - 0.45, 0, 0.7, flowers=['rose', 'white'])
        return m.build()

    def appletree(ready=True):
        m = Model('apfelbaum')
        m.cone(0.3, 0.35, 'bark', 0, 0, 0.17, seg=12)
        m.cyl(0.15, 0.1, 1.4, 'bark', 0, 0, 0.7, seg=12)
        m.stick((0, 0, 1.0), (0.4, -0.05, 1.45), 0.07, 'bark', 0.04)
        m.stick((0, 0, 1.05), (-0.38, 0.1, 1.5), 0.07, 'bark', 0.04)
        blobs = [(0, 0, 1.85, 0.62, 'leaf'), (0.48, -0.05, 1.62, 0.44, 'leafD'), (-0.46, 0.08, 1.66, 0.46, 'leaf'),
                 (0.05, 0.02, 2.3, 0.42, 'leafL'), (-0.12, -0.38, 1.6, 0.4, 'leafD'), (0.25, 0.38, 1.8, 0.42, 'leafD'), (-0.3, 0.3, 2.05, 0.34, 'leaf')]
        for x, y, z, r, c in blobs: m.ball(r, c, x, y, z, sz=0.88, seg=18, bump=0.1)
        if ready:
            for i in range(10):
                a = i * 2.39996; e = 0.1 + (i % 4) * 0.22
                p = Vector((math.cos(a) * math.cos(e), math.sin(a) * math.cos(e), math.sin(e) * 0.85)) * 0.66 + Vector((0, 0, 1.85))
                if p.y > 0.3: p.y = -p.y
                m.ball(0.085, 'red', p.x, p.y, p.z, seg=10)
                m.ball(0.025, 'leafD', p.x, p.y, p.z + 0.08, sz=0.6, seg=6)
        return m.build()

    def tulip():
        m = Model('tulpe')
        for i in range(6):
            a = i * PI / 3 + 0.3
            m.ball(0.17, 'leaf' if i % 2 else 'leafD', math.cos(a) * 0.08, math.sin(a) * 0.08, 0.1, sx=1.0, sy=0.32, sz=0.45, rz=a, ry=-0.5, seg=10)
        for i, (x, y, h) in enumerate([(0, 0, 0.42), (0.13, -0.06, 0.34), (-0.11, 0.07, 0.31)]):
            m.stick((x * 0.3, y * 0.3, 0), (x, y, h), 0.014, 'leafD')
            m.ball(0.075, 'red', x, y, h + 0.06, sz=1.25, seg=12)
            for j in range(3):
                b = j * 2 * PI / 3
                m.ball(0.06, 'berry', x + math.cos(b) * 0.04, y + math.sin(b) * 0.04, h + 0.08, sx=0.6, sy=0.6, sz=1.4, seg=8)
        return m.build()

    def bench():
        m = Model('bank')
        for y in (-0.14, 0, 0.14): m.box(1.15, 0.12, 0.06, 'woodL', 0, y, 0.42, r=0.025)
        for z in (0.62, 0.8): m.box(1.15, 0.05, 0.12, 'woodL', 0, 0.24 + (z - 0.62) * 0.18, z, r=0.025, rx=-0.15)
        for x in (-0.5, 0.5):
            m.box(0.08, 0.08, 0.42, 'woodD', x, -0.15, 0.21, r=0.03)
            m.box(0.08, 0.08, 0.92, 'woodD', x, 0.2, 0.46, r=0.03, rx=-0.08)
            m.box(0.09, 0.44, 0.06, 'woodD', x + math.copysign(0.03, x), 0.0, 0.6, r=0.025)
            m.ball(0.045, 'woodD', x + math.copysign(0.03, x), -0.22, 0.6, seg=8)
        m.ball(0.06, 'rose', -0.05, 0.27, 0.72, sx=1, sy=0.4, seg=8); m.ball(0.06, 'rose', 0.05, 0.27, 0.72, sx=1, sy=0.4, seg=8)
        return m.build()

    def eyes(m, z, y, sep=0.12, r=0.055):
        for sx in (-1, 1):
            m.ball(r, 'black', sx * sep, y, z, sx=0.85, sy=0.5, sz=1.15, seg=12)
            m.ball(r * 0.35, 'white', sx * sep - 0.015, y - 0.025, z + 0.025, seg=6)
            m.ball(0.05, 'blush', sx * (sep + 0.08), y + 0.02, z - 0.08, sx=1.2, sy=0.35, sz=0.7, seg=8)

    def spikes(m, c, r, color, ymin, zmin, n=90, L=0.19, w=0.065):
        for i in range(n):  # gleichmäßig verteilte Punkte auf der Kugel (Goldener Winkel)
            zz = 1 - 2 * (i + 0.5) / n; rr = math.sqrt(1 - zz * zz); a = i * 2.39996
            d = Vector((rr * math.cos(a), rr * math.sin(a), zz))
            if d.y < ymin or d.z < zmin: continue
            base = Vector(c) + d * (r - 0.03)
            m.stick(base, base + (d + Vector((0, 0.35, 0.15))).normalized() * L, w, color, 0.0, seg=6)

    def mira():
        m = Model('npc_mira'); FUR = 0xE9C49B; SPINE = 0x7E5537; FACE = 0xFCEAD6
        for sx in (-1, 1):
            m.ball(0.1, FUR, sx * 0.12, 0, 0.12, sz=1.2, seg=10)
            m.ball(0.09, 'woodD', sx * 0.12, -0.05, 0.04, sx=1, sy=1.3, sz=0.5, seg=10)
        m.ball(0.31, 'rose', 0, 0, 0.45, seg=20)                            # Kleid
        spikes(m, (0, 0.03, 0.47), 0.3, SPINE, 0.15, -0.5, n=70, L=0.16)
        m.box(0.36, 0.06, 0.36, 'white', 0, -0.27, 0.42, r=0.08, rx=0.12)   # Schürze
        m.box(0.14, 0.03, 0.1, 'pink', 0, -0.31, 0.36, r=0.03)
        for sx in (-1, 1):
            m.ball(0.08, FUR, sx * 0.31, -0.05, 0.47, sx=0.9, sz=1.4, ry=sx * 0.5, seg=10)
            m.ball(0.06, FACE, sx * 0.35, -0.08, 0.36, seg=8)
        m.ball(0.34, SPINE, 0, 0.02, 0.98, seg=22)                         # Kopf (Stachelkappe)
        spikes(m, (0, 0.02, 0.98), 0.34, SPINE, -0.05, -0.25, n=110, L=0.2)
        m.ball(0.31, FACE, 0, -0.08, 0.95, sx=1.0, sy=0.85, sz=0.95, seg=22)  # helles Gesicht
        m.ball(0.12, FACE, 0, -0.36, 0.9, sx=1, sy=1.25, sz=0.85, seg=14)
        m.ball(0.045, 'black', 0, -0.5, 0.93, seg=10)
        eyes(m, 1.0, -0.33, sep=0.13)
        for sx in (-1, 1):
            m.ball(0.075, FUR, sx * 0.24, -0.02, 1.2, sy=0.55, seg=10)
            m.ball(0.04, 'pink', sx * 0.24, -0.06, 1.2, sy=0.3, seg=8)
        # Bäckermütze
        m.cyl(0.16, 0.17, 0.12, 'white', 0, 0.0, 1.32, seg=18, rx=-0.2)
        for dx, dz in ((0, 0.12), (-0.09, 0.07), (0.09, 0.07)): m.ball(0.12, 'white', dx, 0.02, 1.38 + dz, seg=12, bump=0.05)
        return m.build()

    def player():
        m = Model('player'); SHIRT = 0x8FD694; HAIR = 0xE0673A
        for sx in (-1, 1):
            m.stick((sx * 0.1, 0, 0.08), (sx * 0.1, 0, 0.32), 0.07, 0x4A6FA5)
            m.ball(0.085, 'dark', sx * 0.1, -0.03, 0.06, sy=1.35, sz=0.6, seg=10)
        m.ball(0.25, SHIRT, 0, 0, 0.5, sz=1.05, seg=18)
        m.cyl(0.25, 0.27, 0.12, 0x4A6FA5, 0, 0, 0.33, seg=18)
        for sx in (-1, 1):
            m.ball(0.075, SHIRT, sx * 0.25, 0, 0.6, seg=10)
            m.stick((sx * 0.28, 0, 0.56), (sx * 0.34, -0.02, 0.38), 0.05, 'skin')
            m.ball(0.06, 'skin', sx * 0.34, -0.02, 0.36, seg=10)
        m.ball(0.37, 'skin', 0, 0, 1.0, seg=24)
        m.ball(0.392, HAIR, 0, 0.03, 1.03, seg=24, half=True, rx=-0.75)          # Haare hinten und oben
        m.ball(0.38, HAIR, 0, 0.07, 0.98, sx=1.02, sy=0.95, sz=1.0, seg=24, half=True, rx=-1.9)       # Hinterkopf bis zum Nacken
        for i in range(5):                                                       # Pony
            a = -0.8 + i * 0.4
            m.ball(0.1, HAIR, math.sin(a) * 0.3, -0.26 + abs(math.sin(a)) * 0.09, 1.24 - abs(a) * 0.05, sx=1.1, sy=0.7, sz=0.75, seg=12)
        for sx in (-1, 1): m.ball(0.09, HAIR, sx * 0.33, -0.1, 0.93, sx=0.6, sy=0.8, sz=1.5, seg=10)
        m.ball(0.14, HAIR, -0.27, 0.08, 1.33, seg=14, bump=0.05); m.ball(0.14, HAIR, 0.27, 0.08, 1.33, seg=14, bump=0.05)
        eyes(m, 0.98, -0.34, sep=0.13, r=0.06)
        m.torus(0.035, 0.012, 'dark', 0, -0.365, 0.88, arc=PI, rx=PI / 2, ry=PI, seg=10, tseg=5)
        return m.build()

    objs = {'cityhall': cityhall(), 'house': house(), 'apfelbaum': appletree(), 'tulpe': tulip(), 'bank': bench(), 'npc_mira': mira(), 'player': player()}
    lay = {'cityhall': (-5.4, 1.2, 0), 'house': (1.0, 1.4, 0), 'apfelbaum': (5.2, 0.6, 0), 'tulpe': (-1.9, -2.6, 0), 'bank': (3.4, -2.2, 0.0), 'npc_mira': (-0.9, -3.0, 0), 'player': (0.6, -3.1, 0)}
    for k, o in objs.items(): o.location = lay[k]
    for i in range(6):  # ein paar Tulpen mehr fürs Bild
        t = objs['tulpe'].copy(); collection('Kuschel').objects.link(t); t.location = (-2.6 + (i % 3) * 0.45, -2.1 - (i // 3) * 0.45, 0)
    stage(target=(0, -0.8, 1.0), dist=17, el=34, lens=38)
    p1 = render('stilprobe_insel')
    stage(target=(0, -3.0, 0.75), dist=5.2, el=18, lens=45)
    p2 = render('stilprobe_figuren')
    tris = {k: sum(len(p.vertices) - 2 for p in o.data.polygons) for k, o in objs.items()}
    log({'ok': True, 'renders': [p1, p2], 'tris': tris})
except Exception:
    log({'ok': False, 'error': traceback.format_exc()})
