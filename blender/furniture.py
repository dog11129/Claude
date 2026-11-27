# Möbel fürs Haus (41 Stück). Maße wie die alten Modelle; Ursprung = Mitte der Grundfläche, Vorderseite -Y.
# Die Helfer unten nehmen Spiel-Koordinaten (x, y = oben, z = nach vorn) und rechnen sie in Blender um (x, -z, y),
# damit die bewährten Proportionen gleich bleiben. Dazu kleine Loops: Fische schwimmen, Platte dreht sich, Feuer flackert …
# Die Wanduhr hat Zeiger (wanduhr_clock_h / _m), die das Spiel nach der Spielzeit stellt.
try:
    clear()
    random.seed(12)
    F = {}
    H_ = PI / 2
    WOOD, WOODL, WOODD, CREAM, WHITE, PINK, ROSE = 0xD9A86C, 0xEAC894, 0xA87449, 0xFFF3E0, 0xFFFFFF, 0xFFB7C8, 0xFF8FAB
    MINT, SKY, LILA, BUTTER, PEACH, LEAF, DLEAF = 0xA8E2CF, 0xAED6F5, 0xCDB8F5, 0xFFE39A, 0xFFC9A8, 0x6CC06A, 0x4FA156
    DARK, BRASS, TERRA, STONE, BEAR, BEARL = 0x4A3A3A, 0xE0B862, 0xE58E66, 0xD9CFC3, 0xC8925E, 0xF2D6B0

    # ---------- Helfer in Spiel-Koordinaten ----------
    def B(m, r, c, x, y, z, sx=1, sy=1, sz=1, seg=12, glow=False):
        m.ball(r, c, x, -z, y, sx=sx, sy=sz, sz=sy, seg=seg, glow=glow)
    def ELL(m, ax, ay, az, c, x, y, z, rx=0, ry=0, rz=0, glow=False, seg=10):
        m.ball(1.0, c, x, -z, y, sx=ax, sy=az, sz=ay, rx=rx, ry=-rz, rz=ry, seg=seg, glow=glow)
    def SOFT(m, w, h, d, c, x=0, y=0, z=0, e=0.3, ry=0, rx=0, rz=0, glow=False):
        m.ball(0.5, c, x, -z, y, sx=w, sy=d, sz=h, soft=e, rx=rx, ry=-rz, rz=ry, seg=14, glow=glow)
    def CY(m, rt, rb, h, c, x, y, z, seg=14, rx=0, ry=0, rz=0, glow=False):
        m.cyl(rb, rt, h, c, x, -z, y, seg=seg, rx=rx, ry=-rz, rz=ry, glow=glow)
    def CONE(m, r, h, c, x, y, z, seg=8, rx=0, ry=0, rz=0, glow=False):
        CY(m, 0.0, r, h, c, x, y, z, seg, rx, ry, rz, glow)
    def BOX(m, w, h, d, c, x, y, z, ry=0, rx=0, rz=0, glow=False):
        m.box(w, d, h, c, x, -z, y, r=min(0.012, w / 3, h / 3, d / 3), rx=rx, ry=-rz, rz=ry, glow=glow)
    def RING(m, R, t, c, x, y, z, rx=H_):
        m.torus(R, t, c, x, -z, y, seg=24, tseg=6, rx=H_ - rx)
    def ST(m, a, b, r, c):
        m.stick((a[0], -a[2], a[1]), (b[0], -b[2], b[1]), r, c, seg=6)
    def SEMI(m, r, c, x, y, z):
        m.ball(r, c, x, -z, y, sy=0.02, seg=16, half=True)
    def HEART(m, s, c, x, y, z, dz=0.05):
        m.heart(s, c, x, -z, y, depth=max(0.08, dz / (0.6 * s)))
    def FLATHEART(m, k, c, y, h):
        CY(m, 0.24 * k, 0.24 * k, h, c, -0.17 * k, y, -0.12 * k, 20); CY(m, 0.24 * k, 0.24 * k, h, c, 0.17 * k, y, -0.12 * k, 20)
        BOX(m, 0.48 * k, h, 0.48 * k, c, 0, y, 0.05 * k, PI / 4)
    def LEGS4(m, x, z, h, c, r=0.035, dz=0.0):
        for a, b in ((-x, z), (x, z), (-x, -z), (x, -z)): CY(m, r, r * 0.8, h, c, a, h / 2, b + dz, 10)
    def FLOWER(m, c, x, y, z):
        CY(m, 0.008, 0.008, 0.1, DLEAF, x, y - 0.05, z, 5); B(m, 0.035, c, x, y + 0.01, z); B(m, 0.015, BUTTER, x, y + 0.04, z)
    def face(m, x, y, z, s=1.0):  # kleines süßes Gesicht (Augen + Bäckchen), schaut nach +z
        for k in (-1, 1):
            B(m, 0.014 * s, DARK, x + k * 0.045 * s, y, z, sz=0.5)
            B(m, 0.02 * s, 0xFF9AA8, x + k * 0.075 * s, y - 0.025 * s, z - 0.005, sz=0.4, sy=0.6)

    def mk(name):
        return Model(name)

    def stuhl():
        m = mk('stuhl')
        SOFT(m, 0.5, 0.08, 0.46, WOOD, 0, 0.44, 0.02, 0.25); SOFT(m, 0.42, 0.07, 0.38, PINK, 0, 0.5, 0.04, 0.45)
        LEGS4(m, 0.19, 0.17, 0.42, WOOD, 0.032)
        for x in (-0.19, 0.19): CY(m, 0.03, 0.03, 0.5, WOOD, x, 0.7, -0.19, 10); B(m, 0.04, WOOD, x, 0.96, -0.19)
        SOFT(m, 0.44, 0.15, 0.05, WOOD, 0, 0.86, -0.19, 0.3); HEART(m, 0.1, ROSE, 0, 0.86, -0.155, 0.03)
        return m.build()
    def hocker():
        m = mk('hocker')
        CY(m, 0.12, 0.15, 0.36, CREAM, 0, 0.18, 0, 14); B(m, 0.3, 0xFF7B8F, 0, 0.4, 0, 1, 0.45, 1, 16)
        for x, y, z in ((0, 0.52, 0), (0.16, 0.47, 0.1), (-0.15, 0.47, 0.12), (0.05, 0.46, -0.2), (-0.18, 0.45, -0.1), (0.2, 0.44, -0.08)): B(m, 0.04, WHITE, x, y, z, 1, 0.5, 1)
        face(m, 0, 0.24, 0.125, 1.0)
        return m.build()
    def sessel():
        m = mk('sessel'); c, cl = 0xF4A7B9, 0xFFD3DD
        SOFT(m, 0.84, 0.3, 0.78, c, 0, 0.25, 0.02, 0.35); SOFT(m, 0.58, 0.14, 0.6, cl, 0, 0.45, 0.08, 0.4); SOFT(m, 0.84, 0.62, 0.22, c, 0, 0.66, -0.28, 0.4)
        for x in (-0.36, 0.36): SOFT(m, 0.18, 0.34, 0.76, c, x, 0.5, 0.03, 0.45)
        for x, z in ((-0.3, 0.3), (0.3, 0.3), (-0.3, -0.3), (0.3, -0.3)): B(m, 0.05, WOODD, x, 0.06, z)
        SOFT(m, 0.3, 0.28, 0.1, BUTTER, 0.06, 0.66, -0.13, 0.5, 0.2, -0.25)
        return m.build()
    def sofa():
        m = mk('sofa'); c, cl = 0x8FCFBF, 0xB5E3D6
        SOFT(m, 1.9, 0.3, 0.8, c, 0, 0.25, 0.02, 0.35)
        for x in (-0.39, 0.39): SOFT(m, 0.76, 0.14, 0.6, cl, x, 0.46, 0.08, 0.4)
        SOFT(m, 1.9, 0.62, 0.24, c, 0, 0.66, -0.29, 0.4)
        for x in (-0.86, 0.86): SOFT(m, 0.2, 0.36, 0.78, c, x, 0.5, 0.03, 0.45)
        for x, z in ((-0.8, 0.3), (0.8, 0.3), (-0.8, -0.3), (0.8, -0.3)): B(m, 0.05, WOODD, x, 0.06, z)
        SOFT(m, 0.32, 0.3, 0.1, PINK, -0.55, 0.67, -0.13, 0.5, 0.25, -0.25); SOFT(m, 0.3, 0.28, 0.1, BUTTER, 0.58, 0.66, -0.13, 0.5, -0.2, -0.25)
        HEART(m, 0.12, ROSE, -0.55, 0.68, -0.07, 0.03)
        return m.build()
    def esstisch():
        m = mk('esstisch')
        SOFT(m, 1.86, 0.09, 0.86, WOOD, 0, 0.74, 0, 0.2); LEGS4(m, 0.8, 0.32, 0.72, WOOD, 0.045)
        BOX(m, 1.5, 0.012, 0.34, 0xFFD6DF, 0, 0.79, 0); BOX(m, 1.5, 0.014, 0.04, ROSE, 0, 0.79, 0.15); BOX(m, 1.5, 0.014, 0.04, ROSE, 0, 0.79, -0.15)
        for x in (-0.55, 0.55): CY(m, 0.13, 0.13, 0.015, WHITE, x, 0.8, 0.12, 16)
        B(m, 0.06, 0xFF6B6B, -0.55, 0.83, 0.12, 1, 0.8, 1); B(m, 0.05, BUTTER, 0.55, 0.83, 0.12, 1, 0.7, 1)
        B(m, 0.07, SKY, 0, 0.86, -0.02, 1, 1.1, 1); CY(m, 0.03, 0.04, 0.06, SKY, 0, 0.93, -0.02, 10)
        FLOWER(m, ROSE, -0.03, 1.02, -0.02); FLOWER(m, WHITE, 0.04, 1.0, 0.01)
        return m.build()
    def rundtisch():
        m = mk('rundtisch')
        CY(m, 0.42, 0.42, 0.06, WOOD, 0, 0.72, 0, 22); CY(m, 0.06, 0.07, 0.7, WOOD, 0, 0.36, 0, 10); CY(m, 0.24, 0.28, 0.05, WOOD, 0, 0.025, 0, 18)
        CY(m, 0.36, 0.36, 0.008, 0xFFF0F4, 0, 0.754, 0, 22)
        B(m, 0.1, MINT, 0, 0.84, -0.05, 1, 0.85, 1); B(m, 0.03, WHITE, 0, 0.93, -0.05); CONE(m, 0.03, 0.12, MINT, 0.12, 0.86, -0.05, 8, 0, 0, -1)
        RING(m, 0.045, 0.012, MINT, -0.11, 0.85, -0.05, 0)
        CY(m, 0.045, 0.035, 0.06, WHITE, 0.18, 0.79, 0.18, 12); CY(m, 0.045, 0.035, 0.06, WHITE, -0.2, 0.79, 0.15, 12)
        B(m, 0.03, 0xE0A060, 0.0, 0.775, 0.22, 1.3, 0.5, 1); B(m, 0.03, 0xE0A060, 0.07, 0.775, 0.2, 1.3, 0.5, 1)
        return m.build()
    def couchtisch():
        m = mk('couchtisch')
        SOFT(m, 0.9, 0.08, 0.66, WOOD, 0, 0.4, 0, 0.2); LEGS4(m, 0.36, 0.24, 0.38, WOODD, 0.035); BOX(m, 0.78, 0.03, 0.52, WOODL, 0, 0.12, 0)
        BOX(m, 0.3, 0.05, 0.22, SKY, -0.18, 0.47, -0.08, 0.2); BOX(m, 0.26, 0.045, 0.2, PINK, -0.18, 0.52, -0.08, 0.05)
        CY(m, 0.05, 0.045, 0.1, CREAM, 0.18, 0.49, 0.06, 12); CY(m, 0.04, 0.04, 0.01, 0x8A5A3A, 0.18, 0.537, 0.06, 12); RING(m, 0.03, 0.01, CREAM, 0.235, 0.49, 0.06, 0)
        BOX(m, 0.25, 0.02, 0.2, LILA, -0.05, 0.14, 0.05, 0.4)
        return m.build()
    def schreibtisch():
        m = mk('schreibtisch')
        SOFT(m, 0.95, 0.06, 0.62, WOOD, 0, 0.74, -0.08, 0.2); SOFT(m, 0.32, 0.68, 0.56, WOODL, -0.29, 0.37, -0.08, 0.15)
        for z in (0.17, -0.33): CY(m, 0.03, 0.03, 0.71, WOOD, 0.4, 0.355, z, 10)
        for c, y in ((PEACH, 0.55), (MINT, 0.34), (SKY, 0.13)): SOFT(m, 0.26, 0.17, 0.03, c, -0.29, y, 0.2, 0.3); B(m, 0.022, BRASS, -0.29, y, 0.22)
        BOX(m, 0.3, 0.02, 0.22, WHITE, 0.08, 0.78, 0.02, -0.2); BOX(m, 0.3, 0.015, 0.22, PINK, 0.08, 0.792, 0.02, -0.2)
        CY(m, 0.05, 0.045, 0.12, ROSE, 0.32, 0.83, -0.25, 12); CY(m, 0.006, 0.006, 0.14, 0xFFD23F, 0.31, 0.9, -0.25, 5); CY(m, 0.006, 0.006, 0.14, SKY, 0.34, 0.9, -0.24, 5)
        CY(m, 0.05, 0.04, 0.08, TERRA, -0.3, 0.81, -0.25, 12); B(m, 0.07, LEAF, -0.3, 0.9, -0.25, 1, 0.8, 1)
        return m.build()
    def bed(name, W, quilt, cushion, n_cush):
        m = mk(name)
        SOFT(m, W, 0.26, 1.96, WOOD, 0, 0.2, 0, 0.2); SOFT(m, W - 0.08, 0.2, 1.84, CREAM, 0, 0.4, 0.03, 0.3)
        SOFT(m, W - 0.02, 0.12, 1.3, quilt, 0, 0.5, 0.32, 0.3); SOFT(m, W, 0.09, 0.22, cushion, 0, 0.56, -0.3, 0.4)
        for x in ([0] if n_cush == 1 else [-0.44, 0.44]): SOFT(m, 0.68 if n_cush == 1 else 0.74, 0.17, 0.4, WHITE, x, 0.58, -0.66, 0.45)
        SOFT(m, W + 0.06, 0.85 if n_cush == 1 else 0.95, 0.14, WOOD, 0, 0.55 if n_cush == 1 else 0.6, -0.93, 0.25)
        HEART(m, 0.12 if n_cush == 1 else 0.16, BUTTER if n_cush == 1 else ROSE, 0, 0.78 if n_cush == 1 else 0.88, -0.85, 0.04)
        for i in range(6 if n_cush == 1 else 12):
            x = -0.3 + (i * 0.37) % 0.6 if n_cush == 1 else -0.66 + (i % 4) * 0.44 + (i >> 2) % 2 * 0.2
            z = 0.05 + i * 0.15 if n_cush == 1 else -0.05 + (i >> 2) * 0.36
            B(m, 0.04, BUTTER if n_cush == 1 else WHITE, x, 0.56, z, 1, 0.25, 1)
        LEGS4(m, W / 2 - 0.05, 0.9, 0.1, WOODD, 0.04)
        return m.build()
    def kommode():
        m = mk('kommode')
        SOFT(m, 0.9, 0.76, 0.52, WOODL, 0, 0.46, -0.2, 0.2); SOFT(m, 0.94, 0.05, 0.56, WOOD, 0, 0.85, -0.2, 0.3); LEGS4(m, 0.38, 0.2, 0.1, WOODD, 0.035, -0.2)
        for c, y in ((PEACH, 0.66), (BUTTER, 0.45), (MINT, 0.24)):
            SOFT(m, 0.8, 0.18, 0.04, c, 0, y, 0.07, 0.3); B(m, 0.028, BRASS, -0.18, y, 0.1); B(m, 0.028, BRASS, 0.18, y, 0.1)
        SOFT(m, 0.18, 0.22, 0.03, ROSE, 0.2, 0.98, -0.3, 0.4, -0.2, -0.15); B(m, 0.06, LILA, -0.2, 0.93, -0.25, 1, 1.2, 1); FLOWER(m, PINK, -0.2, 1.07, -0.25)
        return m.build()
    def kleiderschrank():
        m = mk('kleiderschrank')
        SOFT(m, 0.92, 1.8, 0.58, CREAM, 0, 0.95, -0.2, 0.15); SOFT(m, 0.98, 0.08, 0.64, WOOD, 0, 1.87, -0.2, 0.3)
        for x in (-0.215, 0.215): SOFT(m, 0.41, 1.55, 0.04, MINT, x, 0.98, 0.09, 0.2); HEART(m, 0.1, PINK, x, 1.55, 0.115, 0.02)
        for x in (-0.04, 0.04): CY(m, 0.015, 0.015, 0.2, BRASS, x, 1.0, 0.13, 8)
        LEGS4(m, 0.38, 0.22, 0.06, WOODD, 0.04, -0.2)
        return m.build()
    def stehlampe():
        m = mk('stehlampe')
        CY(m, 0.17, 0.2, 0.05, 0x9C7A5A, 0, 0.025, 0, 16); CY(m, 0.025, 0.025, 1.4, BRASS, 0, 0.75, 0, 8); B(m, 0.03, BRASS, 0, 1.73, 0)
        CY(m, 0.27, 0.27, 0.03, ROSE, 0, 1.39, 0, 18); CY(m, 0.17, 0.17, 0.025, ROSE, 0, 1.71, 0, 18)
        CY(m, 0.16, 0.26, 0.32, 0xFFE9B0, 0, 1.55, 0, 18, glow=True)
        for i in range(8): a = i * PI / 4; B(m, 0.025, ROSE, math.cos(a) * 0.27, 1.37, math.sin(a) * 0.27)  # Bommel
        return m.build()
    def tischlampe():
        m = mk('tischlampe')
        SOFT(m, 0.55, 0.5, 0.5, WOOD, 0, 0.27, -0.1, 0.25); SOFT(m, 0.45, 0.16, 0.03, PEACH, 0, 0.33, 0.16, 0.3); B(m, 0.025, BRASS, 0, 0.33, 0.18)
        B(m, 0.1, MINT, 0, 0.6, -0.12, 1, 1.1, 1); CY(m, 0.015, 0.015, 0.12, BRASS, 0, 0.74, -0.12, 6)
        BOX(m, 0.16, 0.03, 0.12, SKY, 0.17, 0.535, 0.0, 0.3); CY(m, 0.035, 0.03, 0.05, WHITE, -0.17, 0.545, 0.02, 10)
        CY(m, 0.1, 0.16, 0.18, 0xFFE9B0, 0, 0.86, -0.12, 16, glow=True)
        return m.build()
    def kerzen():
        m = mk('kerzen')
        CY(m, 0.36, 0.38, 0.04, WOOD, 0, 0.02, 0, 20)
        for i, (r, h, x, z, c) in enumerate(((0.1, 0.5, -0.1, -0.08, CREAM), (0.09, 0.34, 0.14, -0.1, PINK), (0.08, 0.22, 0.02, 0.15, BUTTER))):
            CY(m, r, r, h, c, x, 0.04 + h / 2, z, 16); CY(m, r * 0.85, r, 0.02, shade(c, -0.05), x, 0.04 + h, z, 16); CY(m, 0.006, 0.006, 0.04, DARK, x, 0.06 + h, z, 5)
            f = m.part('flame%d' % i, (x, -z, 0.08 + h), ('squish', 0.25, 0.6 + i * 0.17))
            ELL(f, 0.025, 0.05, 0.025, 0xFFD27A, x, 0.12 + h, z, glow=True)
        B(m, 0.04, 0x8A5A3A, 0.2, 0.07, 0.15, 1, 1.3, 1); FLOWER(m, WHITE, -0.22, 0.14, 0.17)
        return m.build()
    def lichterkette():
        m = mk('lichterkette'); cols = [ROSE, BUTTER, MINT, SKY, LILA]; n = 0
        for x0, x1 in ((-0.95, 0), (0, 0.95)):
            prev = None
            for k in range(11):
                t = k / 10; x = x0 + (x1 - x0) * t; y = 2.05 - 0.22 * 4 * t * (1 - t)
                if prev: ST(m, prev, (x, y, -0.46), 0.006, 0x4F7A4F)
                prev = (x, y, -0.46)
                if k % 2 and k < 10:
                    CY(m, 0.018, 0.018, 0.03, cols[n % 5], x, y - 0.025, -0.455, 8)
                    ELL(m, 0.026, 0.038, 0.026, [0xFFC2D2, 0xFFF0A8, 0xC8F5E2, 0xCFE6FF, 0xE2D6FF][n % 5], x, y - 0.07, -0.455, glow=True); n += 1
        for x in (-0.95, 0, 0.95): HEART(m, 0.08, ROSE, x, 2.05, -0.46, 0.02)
        return m.build()
    def kamin():
        m = mk('kamin'); rnd = random.Random(11)
        SOFT(m, 1.95, 0.1, 0.85, 0xC4B6A8, 0, 0.05, -0.08, 0.3); SOFT(m, 1.8, 1.1, 0.55, STONE, 0, 0.65, -0.22, 0.2)
        SOFT(m, 0.86, 0.5, 0.06, 0x4A3530, 0, 0.36, 0.06, 0.3); CY(m, 0.43, 0.43, 0.06, 0x4A3530, 0, 0.61, 0.06, 20, H_)
        SOFT(m, 2.0, 0.1, 0.68, WOOD, 0, 1.25, -0.18, 0.25); SOFT(m, 1.3, 1.1, 0.42, STONE, 0, 1.85, -0.29, 0.15)
        CY(m, 0.06, 0.06, 0.55, WOODD, 0, 0.17, 0.1, 10, H_, H_ + 0.3); CY(m, 0.06, 0.06, 0.55, 0x8A5A3A, 0, 0.2, 0.1, 10, H_, H_ - 0.3)
        CY(m, 0.04, 0.04, 0.16, CREAM, -0.6, 1.38, -0.15, 12); CY(m, 0.04, 0.04, 0.1, PINK, -0.5, 1.35, -0.1, 12)
        SOFT(m, 0.24, 0.3, 0.04, ROSE, 0.55, 1.45, -0.28, 0.4, 0, -0.1); BOX(m, 0.17, 0.22, 0.01, BUTTER, 0.55, 1.45, -0.255, 0, -0.1)
        CY(m, 0.05, 0.04, 0.08, TERRA, 0.25, 1.34, -0.15, 12); B(m, 0.06, LEAF, 0.25, 1.42, -0.15)
        def stone(x, y, z, w): BOX(m, w - 0.02, 0.14, 0.04 + rnd.random() * 0.02, shade(STONE, -0.03 - rnd.random() * 0.09), x, y, z)
        for r in range(5):
            for s in (-1, 1):
                for x, w in (((0.79, 0.19), (0.59, 0.19)) if r % 2 else ((0.69, 0.38),)): stone(s * x, 0.22 + r * 0.18, 0.055, w)
        for x in (-0.27, 0, 0.27): stone(x, 1.12, 0.055, 0.25)
        for r in range(6):
            x = -0.6 + (r % 2) * 0.15
            while x < 0.6: stone(max(-0.5, min(0.5, x)), 1.4 + r * 0.18, -0.08, 0.18 if (x < -0.5 or x > 0.5) else 0.27); x += 0.3
        f = m.part('fire', (0, -0.12, 0.14), ('squish', 0.22, 0.5))
        ELL(f, 0.11, 0.24, 0.05, 0xFF9A3A, -0.12, 0.38, 0.12, glow=True); ELL(f, 0.13, 0.3, 0.05, 0xFFC23A, 0.04, 0.42, 0.13, glow=True); ELL(f, 0.09, 0.2, 0.05, 0xFF7A3A, 0.18, 0.34, 0.12, glow=True)
        for x, y, z in ((-0.6, 1.49, -0.15), (-0.5, 1.43, -0.1)): ELL(m, 0.015, 0.03, 0.015, 0xFFD27A, x, y, z, glow=True)
        return m.build()
    def herd():
        m = mk('herd')
        SOFT(m, 0.9, 0.86, 0.62, MINT, 0, 0.45, -0.16, 0.2); BOX(m, 0.84, 0.02, 0.56, 0x5A5560, 0, 0.885, -0.16)
        for x, z in ((-0.2, -0.3), (0.2, -0.3), (-0.2, -0.02), (0.2, -0.02)): CY(m, 0.1, 0.1, 0.02, 0x2E2A30, x, 0.9, z, 16)
        CY(m, 0.14, 0.12, 0.2, ROSE, 0.2, 1.0, -0.02, 16)
        for x in (0.36, 0.04): BOX(m, 0.06, 0.03, 0.04, ROSE, x, 1.06, -0.02)
        lid = m.part('lid', (0.2, 0.02, 1.1), ('bob', 0.025, 0.7))
        CY(lid, 0.145, 0.145, 0.02, 0xFF7A98, 0.2, 1.1, -0.02, 16); B(lid, 0.03, WHITE, 0.2, 1.12, -0.02)
        B(m, 0.11, BUTTER, -0.2, 0.99, -0.3, 1, 0.85, 1); CONE(m, 0.03, 0.12, BUTTER, -0.08, 1.0, -0.3, 8, 0, 0, -1)
        SOFT(m, 0.72, 0.44, 0.04, CREAM, 0, 0.37, 0.155, 0.25); SOFT(m, 0.46, 0.2, 0.02, 0x7A4A3A, 0, 0.4, 0.178, 0.3)
        CY(m, 0.016, 0.016, 0.5, 0xC0C6CC, 0, 0.63, 0.2, 8, 0, 0, H_)
        for x in (-0.27, -0.09, 0.09, 0.27): B(m, 0.035, CREAM, x, 0.77, 0.16, 1, 1, 0.6)
        SOFT(m, 0.9, 0.24, 0.08, MINT, 0, 1.0, -0.44, 0.3); CY(m, 0.05, 0.05, 0.02, CREAM, 0, 1.02, -0.4, 14, H_)
        return m.build()
    def kuechenzeile():
        m = mk('kuechenzeile')
        SOFT(m, 0.9, 0.84, 0.6, CREAM, 0, 0.44, -0.18, 0.2); SOFT(m, 0.96, 0.07, 0.66, WOOD, 0, 0.9, -0.17, 0.25)
        for x in (-0.21, 0.21): SOFT(m, 0.4, 0.62, 0.03, PINK, x, 0.42, 0.13, 0.3)
        for x in (-0.06, 0.06): B(m, 0.025, BRASS, x, 0.55, 0.15)
        BOX(m, 0.36, 0.025, 0.24, WOODL, -0.15, 0.95, -0.1, 0.15); ELL(m, 0.12, 0.07, 0.07, 0xE0A060, -0.15, 1.0, -0.1, 0, 0.15)
        CY(m, 0.07, 0.065, 0.16, SKY, 0.27, 1.02, -0.32, 12); CY(m, 0.012, 0.012, 0.22, WOOD, 0.25, 1.12, -0.32, 6, 0, 0, 0.15); CY(m, 0.012, 0.012, 0.22, WOOD, 0.29, 1.12, -0.31, 6, 0, 0, -0.2)
        B(m, 0.03, WOOD, 0.23, 1.23, -0.32); B(m, 0.055, 0xFF6B6B, 0.22, 0.97, 0.0); B(m, 0.05, 0x9FD46A, 0.32, 0.965, 0.04)
        return m.build()
    def kuehlschrank():
        m = mk('kuehlschrank')
        SOFT(m, 0.84, 1.72, 0.64, 0xFFE3A0, 0, 0.9, -0.16, 0.25); BOX(m, 0.8, 0.02, 0.02, 0xE8C27A, 0, 1.2, 0.16)
        CY(m, 0.022, 0.022, 0.28, WHITE, -0.3, 1.42, 0.2, 8); CY(m, 0.022, 0.022, 0.4, WHITE, -0.3, 0.86, 0.2, 8)
        HEART(m, 0.08, ROSE, 0.15, 1.45, 0.16, 0.02); B(m, 0.03, BUTTER, 0.25, 1.32, 0.16, 1, 1, 0.5); B(m, 0.03, MINT, -0.05, 1.55, 0.16, 1, 1, 0.5)
        BOX(m, 0.14, 0.18, 0.01, WHITE, 0.05, 1.32, 0.162, 0, 0, 0.12); BOX(m, 0.16, 0.12, 0.01, 0xFFF6C8, 0.15, 0.85, 0.162, 0, 0, -0.08)
        face(m, 0.0, 1.0, 0.17, 1.6)
        LEGS4(m, 0.34, 0.25, 0.04, 0xE8C27A, 0.035, -0.16)
        return m.build()
    def teppich_rund():
        m = mk('teppich_rund')
        for i in range(18): CY(m, 0.12, 0.12, 0.016, MINT, math.cos(i * PI / 9) * 0.86, 0.008, math.sin(i * PI / 9) * 0.86, 12)
        for r, c, y in ((0.88, MINT, 0.009), (0.74, CREAM, 0.01), (0.58, PINK, 0.011), (0.4, CREAM, 0.012), (0.22, BUTTER, 0.013)): CY(m, r, r, 0.018 + (y - 0.009) * 2, c, 0, y, 0, 36)
        return m.build()
    def teppich():
        m = mk('teppich')
        BOX(m, 1.8, 0.016, 1.62, 0xF6B2BF, 0, 0.008, 0); BOX(m, 1.64, 0.02, 1.46, CREAM, 0, 0.01, 0)
        for i, c in enumerate((ROSE, BUTTER, MINT, SKY, LILA)): BOX(m, 1.64, 0.024, 0.12, c, 0, 0.012, -0.5 + i * 0.25)
        for i in range(20):
            for z in (0.85, -0.85): BOX(m, 0.05, 0.01, 0.1, CREAM, -0.855 + i * 0.09, 0.005, z)
        return m.build()
    def herzteppich():
        m = mk('herzteppich')
        FLATHEART(m, 1.1, ROSE, 0.008, 0.016); FLATHEART(m, 0.92, PINK, 0.012, 0.022); FLATHEART(m, 0.45, 0xFFE0E8, 0.014, 0.026)
        return m.build()
    def topfpflanze():
        m = mk('topfpflanze')
        CY(m, 0.17, 0.12, 0.28, TERRA, 0, 0.14, 0, 14); CY(m, 0.19, 0.19, 0.06, 0xEE9F7A, 0, 0.27, 0, 14); CY(m, 0.16, 0.16, 0.02, 0x6B4A32, 0, 0.29, 0, 14)
        face(m, 0, 0.15, 0.16, 1.3)
        p = m.part('leaves', (0, 0, 0.3), ('sway', 'x', 0.05, 3.0))
        B(p, 0.2, LEAF, 0, 0.45, 0, 1, 0.85, 1); B(p, 0.15, DLEAF, 0.13, 0.4, 0.06); B(p, 0.14, 0x82D07A, -0.12, 0.42, -0.05); B(p, 0.12, LEAF, 0.02, 0.6, 0.02); B(p, 0.1, 0x82D07A, -0.06, 0.4, 0.14)
        for x, y, z, c in ((0.1, 0.56, 0.12, PINK), (-0.13, 0.52, 0.09, WHITE), (0.0, 0.66, -0.08, PINK)): B(p, 0.03, c, x, y, z)
        return m.build()
    def kaktus():
        m = mk('kaktus'); G_ = 0x7CC47A
        CY(m, 0.14, 0.11, 0.2, PINK, 0, 0.1, 0, 14); CY(m, 0.155, 0.155, 0.04, ROSE, 0, 0.2, 0, 14); CY(m, 0.13, 0.13, 0.02, 0x8A6A4A, 0, 0.215, 0, 14)
        B(m, 0.1, G_, 0, 0.4, 0, 1, 1.9, 1); B(m, 0.05, G_, 0.1, 0.36, 0, 1.4, 0.8, 0.9); B(m, 0.055, G_, 0.15, 0.44, 0, 1, 1.5, 1)
        B(m, 0.045, G_, -0.09, 0.42, 0, 1.4, 0.8, 0.9); B(m, 0.05, G_, -0.13, 0.5, 0, 1, 1.4, 1)
        B(m, 0.04, ROSE, 0, 0.6, 0); B(m, 0.02, BUTTER, 0, 0.63, 0)
        face(m, 0, 0.42, 0.095, 0.9)
        return m.build()
    def blumenvase():
        m = mk('blumenvase')
        CY(m, 0.22, 0.22, 0.04, WOOD, 0, 0.48, 0, 18); CY(m, 0.17, 0.17, 0.03, WOOD, 0, 0.16, 0, 16)
        for i in range(3): CY(m, 0.022, 0.02, 0.48, WOODD, math.cos(i * 2.09) * 0.17, 0.24, math.sin(i * 2.09) * 0.17, 8)
        B(m, 0.12, SKY, 0, 0.62, 0, 1, 1.15, 1); CY(m, 0.055, 0.075, 0.12, SKY, 0, 0.78, 0, 14); CY(m, 0.065, 0.065, 0.02, 0x8FC4EE, 0, 0.84, 0, 14)
        for a, t, c in ((0, 0, ROSE), (0.4, 0.07, BUTTER), (-0.4, 0.07, PINK), (1.9, 0.06, WHITE), (-1.9, 0.07, ROSE)):
            x, z = math.sin(a) * t * 2.2, math.cos(a) * t * 2.2
            ST(m, (0, 0.8, 0), (x, 1.18, z), 0.01, DLEAF); ELL(m, 0.045, 0.065, 0.045, c, x, 1.2, z); ELL(m, 0.02, 0.07, 0.04, LEAF, x * 0.4 + 0.03, 0.94, z * 0.4, 0.3, a)
        return m.build()
    def monstera():
        m = mk('monstera')
        CY(m, 0.2, 0.16, 0.36, CREAM, 0, 0.18, 0, 16); CY(m, 0.205, 0.2, 0.06, PINK, 0, 0.27, 0, 16); CY(m, 0.18, 0.18, 0.02, 0x6B4A32, 0, 0.36, 0, 16)
        p = m.part('leaves', (0, 0, 0.36), ('sway', 'y', 0.05, 3.6))
        for i in range(7):
            a = i * 0.9 + 0.3; t = 0.35 + (i % 3) * 0.17; L = 0.45 + (i % 2) * 0.25
            dx, dy, dz = math.sin(t) * math.sin(a), math.cos(t), math.sin(t) * math.cos(a)
            ST(p, (0, 0.36, 0), (dx * L, 0.36 + dy * L, dz * L), 0.013, DLEAF)
            lx, ly, lz = dx * L + math.sin(a) * 0.14, 0.36 + dy * L, dz * L + math.cos(a) * 0.14; c = 0x4FAE5A if i % 2 else 0x3F9A4F
            ELL(p, 0.17, 0.012, 0.21, c, lx, ly, lz, 0.35, a); ELL(p, 0.012, 0.016, 0.18, shade(c, 0.1), lx, ly + 0.006, lz, 0.35, a)
        return m.build()
    def teeservice():
        m = mk('teeservice'); W2 = 0xFFF6EA
        CY(m, 0.3, 0.26, 0.05, WOOD, 0, 0.32, 0, 20); CY(m, 0.31, 0.31, 0.025, WOODL, 0, 0.355, 0, 20)
        for x, z in ((-0.2, -0.2), (0.2, -0.2), (-0.2, 0.2), (0.2, 0.2)): CY(m, 0.025, 0.02, 0.3, WOODD, x, 0.15, z, 8)
        B(m, 0.11, W2, -0.05, 0.47, -0.04, 1.15, 0.9, 1.15); CY(m, 0.06, 0.08, 0.03, W2, -0.05, 0.56, -0.04, 12); B(m, 0.025, MINT, -0.05, 0.59, -0.04)
        ST(m, (0.08, 0.47, -0.04), (0.17, 0.53, -0.04), 0.016, W2); RING(m, 0.05, 0.012, W2, -0.17, 0.48, -0.04, 0); CY(m, 0.11, 0.11, 0.02, MINT, -0.05, 0.47, -0.04, 18)
        for x, z in ((0.17, 0.14), (-0.14, 0.17)): CY(m, 0.05, 0.04, 0.06, W2, x, 0.4, z, 12); CY(m, 0.045, 0.045, 0.006, 0x9FD26E, x, 0.428, z, 12); CY(m, 0.08, 0.08, 0.01, MINT, x, 0.372, z, 16)
        B(m, 0.03, BUTTER, 0.16, 0.38, -0.17, 1, 0.5, 1); B(m, 0.03, PEACH, 0.2, 0.38, -0.12, 1, 0.5, 1)
        s = m.part('steam', (0.17, -0.14, 0.45), ('bob', 0.05, 1.4))
        for k in range(3): B(s, 0.02 - k * 0.004, WHITE, 0.17 + math.sin(k) * 0.015, 0.47 + k * 0.05, 0.14)
        return m.build()
    def forschertisch():
        m = mk('forschertisch')
        SOFT(m, 0.86, 0.06, 0.6, WOOD, 0, 0.72, -0.05, 0.2)
        for x, z in ((-0.38, 0.2), (0.38, 0.2), (-0.38, -0.3), (0.38, -0.3)): CY(m, 0.03, 0.025, 0.7, WOODD, x, 0.36, z, 8)
        SOFT(m, 0.3, 0.2, 0.36, WOODL, 0.24, 0.6, -0.08, 0.25)
        SOFT(m, 0.2, 0.04, 0.16, 0x6D7F91, -0.18, 0.77, -0.1, 0.3); ST(m, (-0.18, 0.78, -0.17), (-0.18, 1.0, -0.14), 0.025, 0x8796A6); ST(m, (-0.18, 0.98, -0.16), (-0.18, 1.08, -0.02), 0.035, 0xE9EEF2)
        CY(m, 0.02, 0.02, 0.05, DARK, -0.18, 1.11, 0.0, 10, 0.5); BOX(m, 0.12, 0.012, 0.1, 0xC6D4DE, -0.18, 0.84, -0.04); ELL(m, 0.03, 0.01, 0.03, 0xFF8FBF, -0.18, 0.85, -0.04)
        BOX(m, 0.2, 0.025, 0.26, 0x8FAE6A, 0.18, 0.765, 0.05, -0.2); BOX(m, 0.18, 0.006, 0.24, CREAM, 0.18, 0.78, 0.05, -0.2); ST(m, (0.06, 0.785, 0.16), (0.24, 0.785, 0.2), 0.008, BUTTER)
        CY(m, 0.04, 0.035, 0.08, 0xCDEEFF, 0.33, 0.79, -0.2, 12); B(m, 0.02, LEAF, 0.33, 0.8, -0.2)
        return m.build()
    def muschellampe():
        m = mk('muschellampe')
        CY(m, 0.16, 0.19, 0.06, 0xF3E3CF, 0, 0.03, 0, 18); ST(m, (0, 0.06, 0), (0.03, 0.9, 0.02), 0.022, 0xD9C2A3); B(m, 0.03, 0xF3E3CF, 0.03, 0.92, 0.02)
        for i in range(7):
            a = -1.05 + i * 0.35; ELL(m, 0.07, 0.2, 0.05, 0xFFD4DC if i % 2 else 0xFFC2CF, math.sin(a) * 0.2, 1.1 + math.cos(a) * 0.12, -0.05, 0.35, 0, -a)
        for i in range(3): B(m, 0.03, 0xFFF4F6, -0.08 + i * 0.08, 0.06, 0.15, 1, 0.6, 1)
        ELL(m, 0.143, 0.0975, 0.117, 0xFFE9B0, 0.0, 1.02, 0.03, glow=True)
        return m.build()
    def badezuber():
        m = mk('badezuber')
        CY(m, 0.4, 0.36, 0.48, WOOD, 0, 0.24, 0, 22)
        for y in (0.08, 0.4): RING(m, 0.385, 0.018, 0x8A929C, 0, y, 0)
        for i in range(11): a = i / 11 * PI * 2; BOX(m, 0.012, 0.47, 0.012, WOODD, math.cos(a) * 0.39, 0.24, math.sin(a) * 0.39, -a)
        CY(m, 0.37, 0.37, 0.02, 0xA8DCF2, 0, 0.42, 0, 22); RING(m, 0.39, 0.03, WOODL, 0, 0.48, 0)
        for i, (x, z) in enumerate(((-0.1, 0.05), (0.12, -0.08), (0.02, 0.15), (-0.15, -0.12))): B(m, 0.06 + (i % 2) * 0.02, WHITE, x, 0.44, z, 1, 0.45, 1)
        d = m.part('duck', (0.15, -0.12, 0.44), ('bob', 0.02, 1.1))
        B(d, 0.06, BUTTER, 0.15, 0.47, 0.12); B(d, 0.04, BUTTER, 0.19, 0.52, 0.15); CONE(d, 0.018, 0.04, 0xFF9D4D, 0.22, 0.515, 0.17, 6, 0, 0, -H_)
        B(d, 0.008, DARK, 0.205, 0.535, 0.18)
        BOX(m, 0.3, 0.08, 0.05, WOODL, 0, 0.53, -0.32); ELL(m, 0.1, 0.04, 0.07, 0xC7E8FF, 0, 0.6, -0.32)
        return m.build()
    def wolkensofa():
        m = mk('wolkensofa'); c1, c2, c3 = 0xF4F8FF, 0xE3ECFB, 0xD6E2F6
        SOFT(m, 1.75, 0.3, 0.72, c3, 0, 0.2, 0, 0.6)
        t = m.part('fluff', (0, 0, 0.35), ('bob', 0.025, 2.6))
        for i, x in enumerate((-0.55, 0, 0.55)): B(t, 0.34, c1 if i == 1 else c2, x, 0.4, 0.06, 1.05, 0.48, 1.0)
        for i, x in enumerate((-0.6, -0.2, 0.2, 0.6)): B(t, 0.3, c1 if i % 2 else c2, x, 0.72, -0.24, 1, 0.95, 0.55)
        for x in (-0.82, 0.82): B(t, 0.26, c1, x, 0.56, 0.02, 0.6, 0.95, 1.1)
        for x in (-0.45, 0.45): B(t, 0.12, 0xFFD6E4, x, 0.6, 0.08, 1, 0.9, 0.55)
        B(t, 0.07, BUTTER, 0.12, 0.98, -0.3, 1, 1, 0.5)
        face(t, 0, 0.78, -0.08, 1.8)
        return m.build()
    def teddy():
        m = mk('teddy')
        B(m, 0.19, BEAR, 0, 0.2, 0, 1, 1, 0.9); B(m, 0.12, BEARL, 0, 0.19, 0.1, 1, 1.1, 0.6)
        h = m.part('head', (0, 0, 0.34), ('sway', 'y', 0.08, 3.2))
        B(h, 0.15, BEAR, 0, 0.46, 0.02); B(h, 0.065, BEARL, 0, 0.43, 0.15, 1, 0.8, 0.8); B(h, 0.025, DARK, 0, 0.455, 0.205)
        B(h, 0.018, DARK, -0.055, 0.5, 0.15); B(h, 0.018, DARK, 0.055, 0.5, 0.15)
        for x in (-0.11, 0.11): B(h, 0.06, BEAR, x, 0.58, 0, 1, 1, 0.6); B(h, 0.035, BEARL, x, 0.58, 0.03, 1, 1, 0.4)
        for x in (-0.09, 0.09): B(h, 0.022, PINK, x, 0.43, 0.13, 1, 0.7, 0.5)
        for x in (-0.17, 0.17): B(m, 0.06, BEAR, x, 0.24, 0.07, 0.9, 1.5, 0.9)
        for x in (-0.1, 0.1): B(m, 0.075, BEAR, x, 0.07, 0.12, 1, 0.9, 1.4); B(m, 0.045, BEARL, x, 0.07, 0.22, 1, 1, 0.4)
        B(m, 0.03, ROSE, 0, 0.34, 0.13); ELL(m, 0.06, 0.04, 0.025, ROSE, -0.055, 0.34, 0.12, 0, 0, 0.3); ELL(m, 0.06, 0.04, 0.025, ROSE, 0.055, 0.34, 0.12, 0, 0, -0.3)
        return m.build()
    def katzenbett():
        m = mk('katzenbett'); cat, st = 0xFFB36B, 0xF0954A
        CY(m, 0.38, 0.3, 0.18, WOOD, 0, 0.09, 0, 22); RING(m, 0.37, 0.05, 0xC99258, 0, 0.18, 0); RING(m, 0.34, 0.015, WOODD, 0, 0.09, 0); CY(m, 0.32, 0.32, 0.05, PINK, 0, 0.18, 0, 22)
        c = m.part('cat', (0, 0, 0.2), ('squish', 0.05, 2.8))
        ELL(c, 0.2, 0.1, 0.16, cat, -0.02, 0.27, -0.02); ELL(c, 0.06, 0.03, 0.12, st, -0.06, 0.34, -0.02, 0, 0.2); ELL(c, 0.05, 0.03, 0.11, st, 0.06, 0.33, -0.04, 0, -0.2)
        B(c, 0.1, cat, 0.12, 0.3, 0.09, 1, 0.88, 1); B(c, 0.045, 0xFFF1E0, 0.13, 0.27, 0.17, 1.2, 0.8, 0.8); B(c, 0.012, ROSE, 0.13, 0.29, 0.19)
        CONE(c, 0.035, 0.07, cat, 0.06, 0.4, 0.08, 6, 0, 0, 0.3); CONE(c, 0.035, 0.07, cat, 0.18, 0.39, 0.08, 6, 0, 0, -0.3)
        BOX(c, 0.035, 0.008, 0.01, DARK, 0.085, 0.31, 0.18, -0.25); BOX(c, 0.035, 0.008, 0.01, DARK, 0.165, 0.31, 0.18, 0.25)
        ELL(c, 0.035, 0.03, 0.16, cat, -0.12, 0.25, 0.13, 0, 1.2); B(c, 0.035, st, -0.2, 0.25, 0.08)
        return m.build()
    def buecherregal():
        m = mk('buecherregal'); rnd = random.Random(7)
        cols = [ROSE, MINT, SKY, BUTTER, LILA, PEACH, 0xE57373, 0x7FB3D5, 0x9CCC65]
        BOX(m, 0.05, 1.78, 0.36, WOOD, -0.435, 0.89, -0.3); BOX(m, 0.05, 1.78, 0.36, WOOD, 0.435, 0.89, -0.3); BOX(m, 0.86, 1.78, 0.03, WOODL, 0, 0.89, -0.465)
        for y in (0.05, 0.47, 0.89, 1.31): BOX(m, 0.86, 0.04, 0.36, WOOD, 0, y, -0.3)
        SOFT(m, 0.96, 0.08, 0.42, WOOD, 0, 1.8, -0.3, 0.3)
        CY(m, 0.05, 0.04, 0.08, TERRA, 0.25, 1.37, -0.3, 12); B(m, 0.07, LEAF, 0.25, 1.45, -0.3); B(m, 0.04, LEAF, 0.31, 1.38, -0.22, 0.7, 1.4, 0.7)
        SOFT(m, 0.2, 0.14, 0.2, PINK, -0.22, 1.4, -0.3, 0.3); HEART(m, 0.06, WHITE, -0.22, 1.41, -0.195, 0.01)
        for y in (0.07, 0.49, 0.91):
            x = -0.4
            while x < 0.37:
                bw = 0.05 + rnd.random() * 0.05; bh = 0.25 + rnd.random() * 0.12
                if x + bw > 0.41: break
                if rnd.random() < 0.08: BOX(m, bw, bh, 0.26, cols[int(rnd.random() * 9)], x + 0.05, y + bh / 2 - 0.01, -0.3, 0, 0, -0.35); x += 0.16; continue
                BOX(m, bw, bh, 0.27, cols[int(rnd.random() * 9)], x + bw / 2, y + 0.02 + bh / 2, -0.3); BOX(m, bw + 0.002, 0.02, 0.272, WHITE, x + bw / 2, y + bh * 0.7, -0.3)
                x += bw + 0.005
        return m.build()
    def plattenspieler():
        m = mk('plattenspieler')
        SOFT(m, 0.75, 0.42, 0.45, WOOD, 0, 0.42, -0.15, 0.2)
        for x, z in ((-0.3, 0.02), (0.3, 0.02), (-0.3, -0.32), (0.3, -0.32)): CY(m, 0.025, 0.015, 0.22, WOODD, x, 0.11, z, 8)
        SOFT(m, 0.32, 0.3, 0.03, 0xF3DCC0, -0.17, 0.42, 0.08, 0.3)
        for y, d in ((0.47, 0), (0.37, 0), (0.47, 0.1), (0.37, 0.1)): B(m, 0.02, 0xD9B890, -0.24 + d, y, 0.095)
        for i, c in enumerate((ROSE, SKY, BUTTER, MINT, LILA)): BOX(m, 0.03, 0.26, 0.04, c, 0.07 + i * 0.05, 0.42, 0.08)
        SOFT(m, 0.56, 0.07, 0.4, CREAM, 0, 0.665, -0.15, 0.25)
        r = m.part('record', (-0.06, 0.15, 0.71), ('spin', 'z', 2.0))
        CY(r, 0.16, 0.16, 0.02, 0x3A3434, -0.06, 0.71, -0.15, 22); CY(r, 0.05, 0.05, 0.022, ROSE, -0.06, 0.712, -0.15, 14); B(r, 0.015, WHITE, 0.02, 0.722, -0.15)
        CY(m, 0.03, 0.03, 0.04, 0xC8CCD2, 0.18, 0.72, -0.3, 10); BOX(m, 0.018, 0.018, 0.24, 0xC8CCD2, 0.14, 0.74, -0.2, 0.35); B(m, 0.025, CREAM, 0.2, 0.71, 0.0)
        n = m.part('note', (0.25, 0.15, 0.95), ('bob', 0.06, 1.6))
        B(n, 0.025, ROSE, 0.25, 0.95, -0.15, 1, 0.8, 0.6); CY(n, 0.006, 0.006, 0.1, ROSE, 0.27, 1.0, -0.15, 5)
        return m.build()
    def aquarium():
        m = mk('aquarium'); fr, w = 0x6D7F91, 0xA3DCEF
        SOFT(m, 0.9, 0.5, 0.52, WOOD, 0, 0.26, -0.15, 0.2)
        for x in (-0.2, 0.2): SOFT(m, 0.36, 0.34, 0.03, WOODL, x, 0.26, 0.12, 0.3)
        BOX(m, 0.88, 0.04, 0.5, fr, 0, 0.53, -0.15); BOX(m, 0.84, 0.46, 0.46, w, 0, 0.78, -0.15); BOX(m, 0.85, 0.012, 0.47, 0xC8EEF8, 0, 0.98, -0.15)
        for x, z in ((-0.43, 0.09), (0.43, 0.09), (-0.43, -0.39), (0.43, -0.39)): BOX(m, 0.025, 0.5, 0.025, fr, x, 0.78, z)
        BOX(m, 0.88, 0.04, 0.18, fr, 0, 1.03, -0.31); BOX(m, 0.88, 0.025, 0.025, fr, 0, 1.0, 0.09)
        BOX(m, 0.84, 0.07, 0.02, 0xF3DFAE, 0, 0.59, 0.085); B(m, 0.035, 0xB0A8A0, -0.25, 0.63, 0.09, 1.3, 0.8, 0.5); B(m, 0.03, 0xD9D0C6, 0.3, 0.62, 0.09, 1.3, 0.8, 0.5)
        pl = m.part('plants', (0, -0.09, 0.62), ('sway', 'y', 0.08, 2.4))
        for x, h in ((-0.32, 0.1), (-0.27, 0.14), (0.22, 0.12), (0.28, 0.16)): ELL(pl, 0.02, h, 0.008, LEAF, x, 0.62 + h, 0.088)
        fish = m.part('fish', (0, -0.09, 0.8), ('bob', 0.035, 2.2))
        for (x, y, c, s, d) in ((-0.05, 0.8, 0xFF9A3C, 0.06, 1), (0.15, 0.7, 0xFFD23F, 0.05, -1), (0.05, 0.9, ROSE, 0.045, 1)):
            ELL(fish, s, s * 0.58, 0.012, c, x, y, 0.09); CONE(fish, s * 0.5, s * 0.8, c, x - d * s * 1.15, y, 0.09, 6, 0, 0, d * H_)
            B(fish, 0.008, DARK, x + d * s * 0.5, y + 0.008, 0.1, seg=6)
        b = m.part('bubbles', (0, -0.09, 0.86), ('bob', 0.05, 1.3))
        for x, y, r in ((-0.01, 0.86, 0.012), (0.0, 0.92, 0.016), (0.02, 0.95, 0.01)): B(b, r, WHITE, x, y, 0.09, seg=6)
        BOX(m, 0.7, 0.02, 0.1, 0xFFF3B0, 0, 1.055, -0.31, glow=True)
        return m.build()
    def klavier():
        m = mk('klavier'); c = 0x8A5540
        SOFT(m, 1.7, 1.15, 0.45, c, 0, 0.68, -0.25, 0.2); SOFT(m, 1.62, 0.08, 0.32, c, 0, 0.72, 0.06, 0.25); SOFT(m, 1.76, 0.06, 0.5, c, 0, 1.27, -0.25, 0.3)
        SOFT(m, 1.5, 0.42, 0.04, 0x9C6550, 0, 1.0, -0.02, 0.25); BOX(m, 0.42, 0.26, 0.015, WHITE, 0, 1.06, 0.01, 0, -0.15)
        for y, z in ((1.1, 0.02), (1.04, 0.03)): BOX(m, 0.36, 0.005, 0.016, DARK, 0, y, z, 0, -0.15)
        for x in (-0.74, 0.74): CY(m, 0.045, 0.04, 0.66, c, x, 0.33, 0.12, 10)
        for x in (-0.06, 0.06): BOX(m, 0.05, 0.02, 0.1, BRASS, x, 0.06, 0.0)
        CONE(m, 0.08, 0.22, WOODL, -0.55, 1.41, -0.25, 4, 0, PI / 4)
        B(m, 0.07, LILA, 0.5, 1.36, -0.25, 1, 1.1, 1); FLOWER(m, ROSE, 0.5, 1.5, -0.25); FLOWER(m, BUTTER, 0.55, 1.47, -0.22)
        for i in range(24):
            x = -0.69 + i * 0.06
            BOX(m, 0.055, 0.035, 0.17, WHITE, x, 0.77, 0.12)
            if i % 7 in (0, 1, 3, 4, 5) and i < 23: BOX(m, 0.032, 0.03, 0.1, 0x2E2A2A, x + 0.03, 0.795, 0.08)
        return m.build()
    def bild():
        m = mk('bild')
        SOFT(m, 0.74, 0.58, 0.05, 0xE8B86A, 0, 1.45, -0.465, 0.3); BOX(m, 0.6, 0.44, 0.02, 0xCDEAFF, 0, 1.45, -0.44)
        SEMI(m, 0.24, 0x9FD49A, -0.15, 1.23, -0.428); SEMI(m, 0.2, 0x86C986, 0.16, 1.23, -0.425); CY(m, 0.06, 0.06, 0.01, BUTTER, 0.18, 1.57, -0.428, 14, H_)
        for r, x, y in ((0.045, -0.15, 1.55), (0.035, -0.1, 1.56), (0.03, -0.2, 1.545)): CY(m, r, r, 0.01, WHITE, x, y, -0.426, 12, H_)
        BOX(m, 0.06, 0.05, 0.01, WHITE, 0.08, 1.37, -0.42); CONE(m, 0.05, 0.04, 0xFF8A8A, 0.08, 1.415, -0.42, 4, 0, PI / 4)
        B(m, 0.025, ROSE, -0.22, 1.27, -0.42, 1, 1, 0.3); B(m, 0.025, WHITE, -0.07, 1.3, -0.42, 1, 1, 0.3)
        return m.build()
    def wandregal():
        m = mk('wandregal')
        SOFT(m, 0.85, 0.05, 0.24, WOOD, 0, 1.3, -0.38, 0.3)
        for x in (-0.3, 0.3): BOX(m, 0.04, 0.14, 0.16, WOODD, x, 1.21, -0.42)
        CY(m, 0.06, 0.06, 0.14, 0xD6F0FF, -0.28, 1.395, -0.37, 12); CY(m, 0.065, 0.065, 0.03, ROSE, -0.28, 1.475, -0.37, 12); B(m, 0.04, 0xFF7B7B, -0.28, 1.37, -0.37)
        CY(m, 0.05, 0.05, 0.1, 0xE2F7EA, -0.14, 1.375, -0.35, 12); CY(m, 0.055, 0.055, 0.025, BUTTER, -0.14, 1.435, -0.35, 12)
        BOX(m, 0.18, 0.04, 0.14, LILA, 0.04, 1.345, -0.38, 0.1); BOX(m, 0.16, 0.035, 0.13, MINT, 0.04, 1.383, -0.38, -0.1)
        CY(m, 0.06, 0.05, 0.09, TERRA, 0.27, 1.37, -0.38, 12); B(m, 0.06, LEAF, 0.27, 1.43, -0.38)
        for x, y, z in ((0.32, 1.33, -0.3), (0.33, 1.26, -0.29), (0.31, 1.19, -0.29), (0.22, 1.3, -0.29), (0.21, 1.23, -0.28)): B(m, 0.03, DLEAF, x, y, z, 1, 1.2, 0.6)
        return m.build()
    def wanduhr():
        m = mk('wanduhr')
        CY(m, 0.21, 0.21, 0.06, ROSE, 0, 1.62, -0.45, 24, H_); CY(m, 0.175, 0.175, 0.02, CREAM, 0, 1.62, -0.415, 24, H_)
        for i in range(12):
            BOX(m, 0.02, 0.02 if i % 3 else 0.04, 0.01, 0xD9A0A0 if i % 3 else DARK, math.sin(i * PI / 6) * 0.14, 1.62 + math.cos(i * PI / 6) * 0.14, -0.403, 0, 0, -i * PI / 6)
        hh = m.part('clock_h', (0, 0.398, 1.62)); BOX(hh, 0.02, 0.09, 0.008, DARK, 0, 1.665, -0.4)
        mm = m.part('clock_m', (0, 0.396, 1.62)); BOX(mm, 0.014, 0.12, 0.008, DARK, 0, 1.68, -0.398)
        B(m, 0.018, DARK, 0, 1.62, -0.396)
        for x in (-0.15, 0.15): B(m, 0.06, BRASS, x, 1.82, -0.45, 1, 0.8, 0.8)
        B(m, 0.025, BRASS, 0, 1.85, -0.45)
        p = m.part('pendulum', (0, 0.45, 1.44), ('sway', 'y', 0.25, 1.6))
        SOFT(p, 0.16, 0.3, 0.05, WOOD, 0, 1.3, -0.465, 0.3); BOX(p, 0.012, 0.2, 0.01, BRASS, 0, 1.3, -0.435); CY(p, 0.045, 0.045, 0.015, BRASS, 0, 1.2, -0.43, 16, H_)
        return m.build()

    for f in (stuhl, hocker, sessel, sofa, esstisch, rundtisch, couchtisch, schreibtisch, kommode, kleiderschrank, stehlampe, tischlampe, kerzen,
              lichterkette, kamin, herd, kuechenzeile, kuehlschrank, teppich_rund, teppich, herzteppich, topfpflanze, kaktus, blumenvase, monstera,
              teddy, katzenbett, buecherregal, plattenspieler, aquarium, klavier, bild, wandregal, wanduhr, teeservice, forschertisch, muschellampe,
              badezuber, wolkensofa):
        o = f(); F[o.name] = o
    o = bed('einzelbett', 0.94, LILA, 0xE4D8FB, 1); F[o.name] = o
    o = bed('bett', 1.9, PINK, 0xFFDDE5, 2); F[o.name] = o

    names = list(F)
    path = export([F[n] for n in names], 'furniture')

    def vis(o, show):
        for ob in [o] + list(o.children_recursive): ob.hide_render = not show
    for o in F.values(): vis(o, False)
    for g_ in ('K_Ground', 'K_Path'):
        if bpy.data.objects.get(g_): bpy.data.objects[g_].hide_render = False
    outs = []
    half = (len(names) + 1) // 2
    for i, sh in enumerate((names[:half], names[half:])):
        objs = [F[n] for n in sh]; cols = 7; gap = 2.1
        for o in objs: vis(o, True)
        old = arrange(objs, cols=cols, gap=gap)
        rows = (len(objs) + cols - 1) // cols
        stage(target=(0, -(rows - 1) * gap * 0.45, 0.6), dist=cols * gap * 1.15 + 2, el=32, lens=40)
        outs.append(render('moebel_%d' % (i + 1)))
        for o, p in zip(objs, old): o.location = p; vis(o, False)
    for o in F.values(): o.location = (0, 0, 0)
    tris = {n: sum(len(p.vertices) - 2 for ob in [F[n]] + list(F[n].children_recursive) if ob.type == 'MESH' for p in ob.data.polygons) for n in names}
    log({'ok': True, 'glb': path, 'size': os.path.getsize(path), 'renders': outs, 'tris': tris, 'total': sum(tris.values())})
except Exception:
    log({'ok': False, 'error': traceback.format_exc()})
