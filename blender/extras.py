# Update 6: Feiertags-Deko, Accessoires der Nachbarn, Strandgut, Turnierstand – und das App-Symbol.
# extras.glb: egg_0..4, lantern_pumpkin, lichterbaum, snowman, umbrella_0..2, scarf, partyhat, cake, driftwood, puddle, contest_stand,
#             firework_box, heart_balloon. Dazu appicon.png (1024², farbiger Hintergrund, für Android "maskable" geeignet).
try:
    clear()
    random.seed(66)
    X = {}
    EGG = [(0xFFB7C8, 0xFFFFFF), (0xA8E2CF, 0xFFE39A), (0xC9B4F7, 0xFFFFFF), (0xFFE39A, 0xFF8FAB), (0x9FD8FF, 0xFFFFFF)]

    def egg(i):
        m = Model('egg_%d' % i); c, d = EGG[i]
        m.ball(0.12, c, 0, 0, 0.13, sz=1.3, taper=0.25, seg=16)
        if i % 2 == 0:
            for z in (0.08, 0.17): m.torus(0.112 - abs(z - 0.13) * 0.4, 0.014, d, 0, 0, z, seg=18, tseg=5)
        else:
            for k in range(7): a = k * 2.4; m.ball(0.022, d, math.cos(a) * 0.105, math.sin(a) * 0.105, 0.07 + (k % 3) * 0.05, sx=0.5, seg=8)
        m.ball(0.035, 0x7DC35A, 0.06, -0.06, 0.01, sx=1.6, sz=0.3, seg=8)  # Grasbüschel
        return m.build()

    def lantern_pumpkin():
        m = Model('lantern_pumpkin')
        for i in range(8):
            a = i * PI / 4
            m.ball(0.2, 0xFF8C1A if i % 2 else 0xF77F10, math.cos(a) * 0.15, math.sin(a) * 0.15, 0.24, sx=0.75, sy=0.75, sz=1.0, rz=a, seg=14)
        m.ball(0.22, 0xFF9A2A, 0, 0, 0.25, sz=0.95, seg=16)
        m.stick((0, 0, 0.44), (0.03, 0.02, 0.55), 0.03, 0x6B7A2A, 0.024, seg=6)
        m.ball(0.06, 'leaf', 0.08, 0, 0.5, sx=1.5, sy=0.4, sz=0.8, ry=-0.4, seg=8)
        # Gesicht (leuchtet nachts): runde Augen, Lächeln, keine Gruselzähne
        for k in (-1, 1): m.ball(0.045, 0xFFD45A, k * 0.09, -0.27, 0.3, sy=0.3, seg=10, glow=True)
        m.torus(0.08, 0.025, 0xFFD45A, 0, -0.26, 0.2, seg=14, tseg=5, arc=PI, rx=PI / 2, ry=PI, glow=True)
        for k in (-1, 1): m.ball(0.035, 0xFFB0A0, k * 0.16, -0.25, 0.22, sy=0.25, seg=8)
        return m.build()

    def lichterbaum():
        m = Model('lichterbaum')
        m.cyl(0.1, 0.14, 0.5, 'bark', 0, 0, 0.25, seg=10)
        m.cyl(0.26, 0.3, 0.22, 0xE8564E, 0, 0, 0.11, seg=12, bev=0.03)  # Topf
        for i, (r, h, z) in enumerate(((0.85, 0.9, 0.45), (0.68, 0.8, 0.95), (0.5, 0.7, 1.4), (0.3, 0.55, 1.8))):
            m.cone(r, h, 0x3F9A55 if i % 2 else 0x48A85C, 0, 0, z + h / 2, seg=14)
            m.torus(r * 0.86, 0.06, 0x3F9A55, 0, 0, z + 0.04, seg=14, tseg=5)
            n = 6 + i * 0
            for k in range(n):  # Lichterkette + Kugeln
                a = k / n * 2 * PI + i * 0.5
                m.ball(0.045, [0xFFE27A, 0xFFB7C8, 0x9FD8FF, 0xC9B4F7][k % 4], math.cos(a) * r * 0.82, math.sin(a) * r * 0.82, z + 0.12, seg=8, glow=True)
                if k % 2: m.ball(0.06, [0xE8564E, 0xFFD23F, 0x6FA0E6][(k + i) % 3], math.cos(a + 0.4) * r * 0.6, math.sin(a + 0.4) * r * 0.6, z + h * 0.45, seg=10)
        for k in range(5):  # Stern
            a = k * 1.2566 + PI / 2
            m.ball(0.1, 0xFFE27A, math.cos(a) * 0.1, 0, 2.5 + math.sin(a) * 0.1, sx=1.4, sy=0.35, sz=0.55, ry=-a + PI / 2, seg=8, glow=True)
        m.ball(0.09, 0xFFF3B0, 0, 0, 2.5, sy=0.5, seg=10, glow=True)
        for k in range(3): m.box(0.22, 0.22, 0.18, [0xFF8FAB, 0x9FD8FF, 0xFFE39A][k], math.cos(k * 2.1) * 0.55, math.sin(k * 2.1) * 0.55 - 0.15, 0.09, r=0.03, rz=k)
        return m.build()

    def snowman():
        m = Model('snowman')
        m.ball(0.42, 0xF7FBFF, 0, 0, 0.36, sz=0.9, seg=18)
        m.ball(0.3, 0xF7FBFF, 0, 0, 0.9, sz=0.95, seg=16)
        m.ball(0.22, 0xF7FBFF, 0, 0, 1.3, seg=16)
        for k in (-1, 1):
            m.ball(0.025, 'dark', k * 0.075, -0.2, 1.36, seg=8)
            m.ball(0.04, 0xFF9AA8, k * 0.13, -0.17, 1.27, sy=0.4, seg=8)
            m.stick((k * 0.26, 0, 0.95), (k * 0.55, -0.05, 1.18), 0.022, 'bark', 0.015, seg=5)
        m.cone(0.045, 0.16, 0xFF8A2A, 0, -0.25, 1.3, seg=8, rx=PI / 2)
        m.torus(0.21, 0.06, 0xE8564E, 0, 0, 1.12, seg=16, tseg=6)
        m.box(0.1, 0.05, 0.28, 0xE8564E, 0.12, -0.2, 0.98, r=0.02, ry=0.2)
        m.cyl(0.2, 0.2, 0.04, 0x4A6FA5, 0, 0, 1.47, seg=16); m.cyl(0.13, 0.14, 0.2, 0x4A6FA5, 0, 0, 1.58, seg=14)
        for z in (0.82, 0.95, 0.4): m.ball(0.03, 'dark', 0, -0.3 if z > 0.5 else -0.41, z, seg=8)
        return m.build()

    def umbrella(i):
        c, d = [(0xFF8FAB, 0xFFFFFF), (0x9FD8FF, 0xFFE39A), (0xFFE39A, 0xFFFFFF)][i]
        m = Model('umbrella_%d' % i)
        m.cyl(0.012, 0.012, 0.75, 'woodD', 0, 0, 0.375, seg=6)
        m.torus(0.05, 0.012, 'woodD', 0.05, 0, 0.0, seg=10, tseg=4, arc=PI, rx=PI / 2, ry=PI)
        for k in range(8):
            a = k * PI / 4
            L = 0.5
            m.ball(L / 2, c if k % 2 else d, math.cos(a) * L / 2 * 0.93, math.sin(a) * L / 2 * 0.93, 0.75 - 0.08, sx=1, sy=0.55, sz=0.1, ry=0.35, rz=a, seg=10)
        m.ball(0.035, c, 0, 0, 0.8, seg=8)
        return m.build()

    def scarf():  # Ring mit Radius 1 (das Spiel skaliert ihn auf den Hals)
        m = Model('scarf')
        m.torus(1.0, 0.28, 0xE8564E, 0, 0, 0, seg=24, tseg=8)
        m.box(0.38, 0.16, 0.9, 0xE8564E, 0.45, -0.95, -0.45, r=0.06, ry=0.25)
        for k in range(3): m.box(0.38, 0.165, 0.08, 0xFFFFFF, 0.45 + k * 0.0, -0.95, -0.2 - k * 0.22, r=0.02, ry=0.25)
        return m.build()

    def partyhat():
        m = Model('partyhat')
        m.cone(0.11, 0.26, 0xFF8FAB, 0, 0, 0.13, seg=16)
        for k in range(6): a = k * 1.05; m.ball(0.018, [0xFFE39A, 0x9FD8FF, 0xFFFFFF][k % 3], math.cos(a) * 0.07, math.sin(a) * 0.07, 0.07 + (k % 2) * 0.06, seg=6)
        m.ball(0.04, 0xFFE39A, 0, 0, 0.27, seg=10)
        return m.build()

    def cake():
        m = Model('cake')
        m.cyl(0.32, 0.32, 0.03, 0xFFFFFF, 0, 0, 0.015, seg=24, bev=0.01)
        m.cyl(0.25, 0.25, 0.16, 0xFFD6E4, 0, 0, 0.11, seg=24, bev=0.03)
        m.cyl(0.18, 0.18, 0.12, 0xFFF3E0, 0, 0, 0.25, seg=20, bev=0.03)
        for k in range(10): a = k * PI / 5; m.ball(0.035, 0xFFFFFF, math.cos(a) * 0.245, math.sin(a) * 0.245, 0.19, seg=8)
        for k in range(5):
            a = k * 1.2566
            m.ball(0.03, 0xE8283C, math.cos(a) * 0.12, math.sin(a) * 0.12, 0.32, seg=8)
        for k in range(3):
            a = k * 2.094 + 0.5; x, y = math.cos(a) * 0.08, math.sin(a) * 0.08
            m.cyl(0.012, 0.012, 0.1, [0x9FD8FF, 0xFFE39A, 0xC9B4F7][k], x, y, 0.36, seg=6)
            m.ball(0.018, 0xFFD27A, x, y, 0.43, sz=1.5, seg=6, glow=True)
        return m.build()

    def driftwood():
        m = Model('driftwood')
        m.cyl(0.06, 0.07, 0.7, 0xC9B79C, 0, 0, 0.05, seg=8, rx=PI / 2, rz=0.3)
        m.stick((0.05, 0.05, 0.05), (0.25, 0.2, 0.07), 0.035, 0xBFAC90, 0.02, seg=6)
        m.ball(0.05, 0x7DC35A, -0.1, -0.2, 0.06, sx=1.6, sz=0.3, seg=8)  # etwas Seegras
        return m.build()

    def puddle():
        m = Model('puddle')
        for x, y, r in ((0, 0, 0.42), (0.3, 0.15, 0.25), (-0.28, -0.12, 0.22)): m.ball(r, 0xA8D8F0, x, y, 0, sx=1.2, sz=0.02, seg=18)
        m.ball(0.06, 0xFFFFFF, -0.1, 0.06, 0.004, sx=2, sz=0.02, seg=8)
        return m.build()

    def contest_stand():
        m = Model('contest_stand')
        m.puff(1.4, 0.7, 0.75, 0xFFF3E0, 0, 0, 0, soft=0.3, taper=0.03)
        m.puff(1.5, 0.8, 0.08, 'wood', 0, 0, 0.75, soft=0.4, taper=0)
        for x in (-0.65, 0.65): m.cyl(0.04, 0.04, 1.2, 'woodD', x, 0.25, 1.35, seg=8)
        for i in range(7):
            m.box(0.22, 0.06, 0.4, [0xFF8FAB, 0xFFFFFF][i % 2], -0.66 + i * 0.22, 0.12, 2.0, r=0.03, rx=0.4)
        m.heart(0.3, 'rose', 0, -0.36, 0.42, depth=0.3)
        m.cyl(0.12, 0.1, 0.22, 0xFFD23F, -0.4, 0, 0.9, seg=12); m.ball(0.12, 0xFFD23F, -0.4, 0, 1.05, sz=0.6, seg=10)
        for k in (-1, 1): m.torus(0.06, 0.015, 0xFFD23F, -0.4 + k * 0.14, 0, 0.98, seg=10, tseg=4, rx=PI / 2)
        m.box(0.3, 0.2, 0.05, 0x9FD8FF, 0.35, 0, 0.82, r=0.02); m.ball(0.05, 0xFF8A2A, 0.35, -0.02, 0.88, sx=1.8, sy=0.6, seg=8)  # Fisch auf Brett
        return m.build()

    def heart_balloon():
        m = Model('heart_balloon')
        m.heart(0.5, 0xFF6B8A, 0, 0, 1.4, depth=0.5)
        m.ball(0.05, 0xFFFFFF, -0.12, -0.12, 1.55, sy=0.4, seg=8)
        m.stick((0, 0, 1.15), (0.05, 0, 0.0), 0.006, 0xFFFFFF, seg=4)
        return m.build()

    for i in range(5): o = egg(i); X[o.name] = o
    for f in (lantern_pumpkin, lichterbaum, snowman, scarf, partyhat, cake, driftwood, puddle, contest_stand, heart_balloon): o = f(); X[o.name] = o
    for i in range(3): o = umbrella(i); X[o.name] = o
    names = list(X)
    path = export([X[n] for n in names], 'extras')

    def vis(o, show):
        for ob in [o] + list(o.children_recursive): ob.hide_render = not show
    for o in X.values(): vis(o, False)
    for g_ in ('K_Ground', 'K_Path'):
        if bpy.data.objects.get(g_): bpy.data.objects[g_].hide_render = False
    show = ['lantern_pumpkin', 'lichterbaum', 'snowman', 'cake', 'contest_stand', 'umbrella_0', 'partyhat', 'egg_0', 'egg_1', 'egg_3', 'driftwood', 'heart_balloon']
    sel = [X[n] for n in show]
    for o in sel: vis(o, True)
    old = arrange(sel, cols=6, gap=1.6)
    stage(target=(0, -0.7, 0.6), dist=12, el=28, lens=40)
    out = render('extras')
    for o, p in zip(sel, old): o.location = p; vis(o, False)

    # ---------- App-Symbol: kleine Insel mit Palme, Haus und Herz ----------
    I = Model('appicon')
    I.ball(1.5, 0xF3E0AA, 0, 0, 0.0, sz=0.32, seg=28, soft=0.9)
    I.ball(1.15, 0x7DC35A, 0, -0.05, 0.25, sz=0.22, seg=24)
    I.puff(0.7, 0.6, 0.55, 0xFFE4D6, -0.35, 0.1, 0.35, soft=0.35, taper=0.05)
    I.cuteroof(0.75, 0.65, 0.4, 'coral', x=-0.35, y=0.1, z=0.88, rows=2, th=0.12, over=0.1)
    I.door(-0.35, -0.21, 0.36, w=0.22, h=0.3, color='teal')
    x0 = 0.55; z0 = 0.3
    for i in range(6): I.cyl(0.07 - i * 0.004, 0.08 - i * 0.004, 0.2, 0xC08E5A if i % 2 else 0xA97B4C, x0 + i * i * 0.008, 0.25, z0 + i * 0.19, seg=10)
    tx, tz = x0 + 25 * 0.008, z0 + 6 * 0.19
    for i in range(6):
        a = i / 6 * 2 * PI
        for k in range(4):
            t = (k + 0.5) / 4
            I.ball(0.16 * (1 - t * 0.4), 0x58B84C if k % 2 else 0x6CC65A, tx + math.cos(a) * t * 0.6, 0.25 + math.sin(a) * t * 0.6, tz + 0.05 - t * t * 0.35, sx=1.3, sy=0.8, sz=0.25, rz=a, seg=10)
    I.heart(0.45, 0xFF6B8A, 0.15, -0.3, 1.75, depth=0.4)
    I.ball(0.08, 0xFFFFFF, 0.05, -0.42, 1.85, sy=0.3, seg=8)
    for k in range(5): a = k * 1.25; I.ball(0.06, [0xFFB7C8, 0xFFE066, 0xFFFFFF][k % 3], math.cos(a) * 0.8, -0.2 + math.sin(a) * 0.35, 0.33, seg=8)
    icon = I.build()
    for o in X.values(): vis(o, False)
    for g_ in ('K_Ground', 'K_Path'):
        if bpy.data.objects.get(g_): bpy.data.objects[g_].hide_render = True
    sc = bpy.context.scene
    stage(target=(0, 0, 0.75), dist=9.5, el=26, lens=50, res=(1024, 1024))
    bg = sc.world.node_tree.nodes.get('Background')
    bg.inputs['Color'].default_value = lin(0xFFD6E4); bg.inputs['Strength'].default_value = 0.9
    ic = render('appicon')
    bg.inputs['Color'].default_value = lin(0xBFE2FF); bg.inputs['Strength'].default_value = 0.6
    icon.hide_render = True
    for ob in icon.children_recursive: ob.hide_render = True
    for g_ in ('K_Ground', 'K_Path'):
        if bpy.data.objects.get(g_): bpy.data.objects[g_].hide_render = False
    log({'ok': True, 'glb': path, 'size': os.path.getsize(path), 'renders': [out, ic]})
except Exception:
    log({'ok': False, 'error': traceback.format_exc()})
