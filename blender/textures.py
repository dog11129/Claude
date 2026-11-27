# Kachelbare Texturen aus Blender (orthografisch gerendert): Detail für Rasen und Wege (hell, wird im Spiel mit der
# Bodenfarbe multipliziert) sowie 8 Böden (2×2 Felder) und 8 Tapeten (2 breit × 2,4 hoch) für die Zimmer.
# Alles, was über den Rand ragt, wird auf der Gegenseite wiederholt -> nahtlos.
try:
    clear()
    rnd = random.Random(77)
    TEX = os.path.join(OUT, 'tex'); os.makedirs(TEX, exist_ok=True)
    sc = bpy.context.scene
    for n in ('K_Ground', 'K_Path'):
        if bpy.data.objects.get(n): bpy.data.objects[n].hide_render = True
    cam = bpy.data.objects.get('K_TexCam')
    if not cam:
        cam = bpy.data.objects.new('K_TexCam', bpy.data.cameras.new('K_TexCam')); collection('KStage').objects.link(cam)
    cam.data.type = 'ORTHO'
    sun = bpy.data.objects.get('K_Sun')
    if not sun:
        sun = bpy.data.objects.new('K_Sun', bpy.data.lights.new('K_Sun', 'SUN')); collection('KStage').objects.link(sun)
    w = sc.world or bpy.data.worlds.new('World'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes.get('Background')
    for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
        try: sc.render.engine = eng; break
        except Exception: pass
    sc.render.film_transparent = False
    try: sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'; sc.view_settings.exposure = 0
    except Exception: pass

    def light(world, energy, rot):
        bg.inputs['Color'].default_value = (1, 1, 1, 1); bg.inputs['Strength'].default_value = world
        sun.data.energy = energy; sun.data.angle = math.radians(20); sun.data.color = (1, 1, 1); sun.rotation_euler = rot

    def shoot(name, center, size, res, view='top'):
        sc.camera = cam; cam.data.ortho_scale = max(size)
        if view == 'top':
            cam.location = (center[0], center[1], 5); cam.rotation_euler = (0, 0, 0)
        else:  # von vorn auf die Wand (Wand liegt in der XZ-Ebene)
            cam.location = (center[0], -5, center[1]); cam.rotation_euler = (PI / 2, 0, 0)
        sc.render.resolution_x, sc.render.resolution_y = res
        sc.render.filepath = os.path.join(TEX, name + '.png')
        bpy.ops.render.render(write_still=True)
        clear()
        return name

    # Element an (x, y) setzen und über die Kachelränder wiederholen (Periode px/py)
    def wrap(fn, x, y, px=2.0, py=2.0, m=0.35, wy=True):
        for dx in (-px, 0, px):
            for dy in ((-py, 0, py) if wy else (0,)):
                X, Y = x + dx, y + dy
                if -m <= X <= px + m and (not wy or -m <= Y <= py + m): fn(X, Y)

    outs = []
    # ---------- Rasen-Detail (hell) ----------
    light(0.55, 1.7, (math.radians(40), 0, math.radians(-30)))
    m = Model('t_grass')
    m.box(2.8, 2.8, 0.02, 0xFFFFFF, 1, 1, -0.01, r=0.002)
    for i in range(26):
        x, y, r = rnd.random() * 2, rnd.random() * 2, 0.12 + rnd.random() * 0.2
        wrap(lambda X, Y, r=r: m.ball(r, 0xF1F1F1, X, Y, 0.0, sz=0.04, seg=12), x, y)
    for i in range(110):
        x, y, a = rnd.random() * 2, rnd.random() * 2, rnd.random() * 6.28
        def blade(X, Y, a=a):
            for k in range(3):
                b = a + k * 0.5 - 0.5
                m.stick((X, Y, 0), (X + math.cos(b) * 0.07, Y + math.sin(b) * 0.07, 0.03), 0.012, 0xF6F6F6 if k % 2 else 0xECECEC, 0.003, seg=4)
        wrap(blade, x, y)
    for i in range(22):
        x, y = rnd.random() * 2, rnd.random() * 2
        def clover(X, Y):
            for k in range(3): m.ball(0.022, 0xF3F3F3, X + math.cos(k * 2.1) * 0.022, Y + math.sin(k * 2.1) * 0.022, 0.006, sz=0.35, seg=8)
        wrap(clover, x, y)
    for i in range(30):
        x, y = rnd.random() * 2, rnd.random() * 2
        wrap(lambda X, Y: m.ball(0.012, 0xDCDCDC, X, Y, 0.004, sz=0.6, seg=6), x, y)
    m.build(); outs.append(shoot('grass', (1, 1), (2, 2), (512, 512)))

    # ---------- Weg-Detail (hell, Kiesel) ----------
    m = Model('t_path')
    m.box(2.8, 2.8, 0.02, 0xFFFFFF, 1, 1, -0.01, r=0.002)
    for i in range(150):
        x, y, r = rnd.random() * 2, rnd.random() * 2, 0.018 + rnd.random() ** 2 * 0.06
        c = rnd.choice([0xF4EFE6, 0xEAE2D3, 0xF8F5F0, 0xE2D8C6]); sx_ = 1 + rnd.random() * 0.4; rz_ = rnd.random() * 3
        wrap(lambda X, Y, r=r, c=c, sx_=sx_, rz_=rz_: m.ball(r, c, X, Y, 0.0, sx=sx_, sz=0.45, rz=rz_, soft=0.8, seg=10), x, y)
    for i in range(80):
        x, y = rnd.random() * 2, rnd.random() * 2
        wrap(lambda X, Y: m.ball(0.008, 0xD6CCBA, X, Y, 0.003, sz=0.5, seg=5), x, y)
    m.build(); outs.append(shoot('path', (1, 1), (2, 2), (512, 512)))

    # ---------- Kopfsteinpflaster (Bummelgasse, farbig) ----------
    light(0.62, 1.25, (math.radians(25), 0, math.radians(-20)))
    m = Model('t_cobble')
    m.box(2.8, 2.8, 0.02, 0xB3A897, 1, 1, -0.02, r=0.002)
    for row in range(8):
        for i in range(8):
            x, y = (i * 0.25 + (row % 2) * 0.125) % 2.0, row * 0.25 + 0.125
            c = rnd.choice([0xD9CFC2, 0xCFC4B5, 0xE3DACE, 0xC7BBAB, 0xDCC9B4])
            wrap(lambda X, Y, c=c: m.puff(0.22, 0.22, 0.05, c, X, Y, 0, soft=0.45, taper=0.15, seg=14), x, y)
    m.build(); outs.append(shoot('cobble', (1, 1), (2, 2), (512, 512)))

    # ---------- Glitzern fürs Wasser (weiß auf schwarz, wird im Wasser-Shader addiert) ----------
    light(1.0, 0.0, (0, 0, 0))
    m = Model('t_glint')
    m.box(2.8, 2.8, 0.02, 0x000000, 1, 1, -0.02, r=0.002)
    for i in range(70):
        x, y, r, a = rnd.random() * 2, rnd.random() * 2, 0.008 + rnd.random() ** 2 * 0.03, rnd.random() * 3
        wrap(lambda X, Y, r=r, a=a: m.ball(r, 0xFFFFFF, X, Y, 0, sx=2.6, sz=0.2, rz=a, seg=8), x, y)
    for i in range(10):
        x, y = rnd.random() * 2, rnd.random() * 2
        def star(X, Y):
            for k in range(2): m.ball(0.05, 0xFFFFFF, X, Y, 0.002, sx=1, sy=0.12, sz=0.2, rz=k * PI / 2, seg=8)
            m.ball(0.018, 0xFFFFFF, X, Y, 0.004, sz=0.3, seg=8)
        wrap(star, x, y)
    m.build(); outs.append(shoot('glint', (1, 1), (2, 2), (256, 256)))

    # ---------- Böden (2×2 Felder, farbig) ----------
    light(0.62, 1.25, (0, 0, 0))
    def planks(name, base):
        m = Model('t_' + name)
        m.box(2.8, 2.8, 0.02, shade(base, -0.3), 1, 1, -0.02, r=0.002)
        for row in range(8):
            y = row * 0.25 + 0.125; x = rnd.random() * 2
            used = 0
            while used < 2.0:
                L = min(0.9 + rnd.random() * 0.9, 2.0 - used)
                c = shade(base, (rnd.random() - 0.5) * 0.08)
                for x0, x1 in (((x, x + L),) if x + L <= 2 else ((x, 2.0), (0.0, x + L - 2))):
                    if x1 - x0 > 0.03: m.box(x1 - x0 - 0.012, 0.235, 0.04, c, (x0 + x1) / 2, y, 0, r=0.008)
                if x + L >= 2 and rnd.random() < 0.6: m.ball(0.008, shade(base, -0.25), (x + 0.06) % 2, y, 0.02, sz=0.4, seg=6)  # Nagel
                x = (x + L) % 2; used += L
        m.build(); return shoot('floor_' + name, (1, 1), (2, 2), (512, 512))
    def checker(name, a, b, n=4):
        m = Model('t_' + name); s = 2 / n
        m.box(2.2, 2.2, 0.02, shade(a, -0.15), 1, 1, -0.02, r=0.002)
        for i in range(n):
            for j in range(n): m.box(s - 0.012, s - 0.012, 0.04, a if (i + j) % 2 else b, (i + 0.5) * s, (j + 0.5) * s, 0, r=0.02)
        m.build(); return shoot('floor_' + name, (1, 1), (2, 2), (512, 512))
    outs.append(planks('dielen', 0xE6C595)); outs.append(planks('dunkel', 0xA0704A))
    outs.append(checker('schach', 0xFFF4E4, 0xF4BCC6))
    m = Model('t_teppich'); m.box(2.2, 2.2, 0.02, 0xF7C6D0, 1, 1, -0.01, r=0.002)
    for i in range(4):
        for j in range(4):
            m.box(0.09, 0.09, 0.02, 0xFBDBE2, i * 0.5 + 0.25, j * 0.5 + 0.25, 0.005, r=0.02, rz=PI / 4)
            m.ball(0.02, 0xFFFFFF, i * 0.5, j * 0.5, 0.005, sz=0.3, seg=6)
    for k in range(160):
        x, y = rnd.random() * 2, rnd.random() * 2
        wrap(lambda X, Y: m.ball(0.02, shade(0xF7C6D0, 0.08), X, Y, 0.0, sz=0.2, seg=6), x, y)
    m.build(); outs.append(shoot('floor_teppich', (1, 1), (2, 2), (512, 512)))
    m = Model('t_stein'); m.box(2.8, 2.8, 0.02, 0x9E948A, 1, 1, -0.02, r=0.002)
    for i in range(4):
        for j in range(4):
            x, y = i * 0.5 + 0.25 + (rnd.random() - 0.5) * 0.04, j * 0.5 + 0.25 + (rnd.random() - 0.5) * 0.04
            m.cyl(0.225 + rnd.random() * 0.03, 0.235, 0.05, shade(0xCDC3B8, (rnd.random() - 0.5) * 0.1), x, y, 0, seg=7, bev=0.02, rz=rnd.random() * 3)
    m.build(); outs.append(shoot('floor_stein', (1, 1), (2, 2), (512, 512)))
    m = Model('t_moos'); m.box(2.8, 2.8, 0.02, 0x93C97C, 1, 1, -0.01, r=0.002)
    for k in range(60):
        x, y = rnd.random() * 2, rnd.random() * 2; t = rnd.random()
        if t < 0.35: wrap(lambda X, Y: m.ball(0.15, 0xAEDB92, X, Y, -0.004, sz=0.05, seg=10), x, y)
        elif t < 0.85:
            c = shade(0xAEDB92, (rnd.random() - 0.5) * 0.2)
            wrap(lambda X, Y, c=c: (m.cone(0.035, 0.06, c, X, Y, 0.03, seg=5), m.cone(0.03, 0.05, 0x9FD388, X + 0.05, Y + 0.03, 0.025, seg=5)), x, y)
        else:
            c = rnd.choice([0xFFFFFF, 0xFFB7C8, 0xFFE39A])
            wrap(lambda X, Y, c=c: m.ball(0.025, c, X, Y, 0.02, sz=0.6, seg=6), x, y)
    m.build(); outs.append(shoot('floor_moos', (1, 1), (2, 2), (512, 512)))
    m = Model('t_parkett'); m.box(2.8, 2.8, 0.02, shade(0xDCAA70, -0.3), 1, 1, -0.02, r=0.002)
    for i in range(4):
        for j in range(4):
            x, y = i * 0.5 + 0.25, j * 0.5 + 0.25
            for o in (-0.125, 0.125):
                c = shade(0xDCAA70 if rnd.random() < 0.5 else 0xC8925A, (rnd.random() - 0.5) * 0.04)
                if (i + j) % 2: m.box(0.49, 0.24, 0.04, c, x, y + o, 0, r=0.01)
                else: m.box(0.24, 0.49, 0.04, c, x + o, y, 0, r=0.01)
    m.build(); outs.append(shoot('floor_parkett', (1, 1), (2, 2), (512, 512)))
    m = Model('t_fliesen'); m.box(2.8, 2.8, 0.02, 0xFDFBF6, 1, 1, -0.02, r=0.002)
    for i in range(4):
        for j in range(4):
            x, y = i * 0.5 + 0.25, j * 0.5 + 0.25
            m.box(0.47, 0.47, 0.04, shade(0x94BFE8, (rnd.random() - 0.5) * 0.08), x, y, 0, r=0.025)
            m.box(0.11, 0.11, 0.045, 0xFDFBF6, x, y, 0.004, r=0.02, rz=PI / 4)
    m.build(); outs.append(shoot('floor_fliesen', (1, 1), (2, 2), (512, 512)))

    # ---------- Tapeten (2 breit × 2,4 hoch, Wand in der XZ-Ebene, schaut nach -Y) ----------
    light(0.62, 1.25, (PI / 2, 0, 0))
    H = 2.4
    def wall(name, base):
        m = Model('t_' + name); m.box(2.8, 0.02, H + 0.6, base, 1, 0.01, H / 2, r=0.002); return m
    def wbox(m, x, z, w_, h_, c, d=0.02, rot=0):
        def f(X, Y): m.box(w_, d, h_, c, X, -d / 2, Y, r=min(0.02, w_ / 3, h_ / 3), ry=rot)
        wrap(f, x, z, py=H, wy=False)
    def shootw(m, name):
        m.build(); return shoot('wall_' + name, (1, H / 2), (2, H), (512, 614), view='front')
    m = wall('vanille', 0xFFF1DC)
    for k in range(90): x, z = rnd.random() * 2, 0.15 + rnd.random() * 2.2; wrap(lambda X, Y: m.ball(0.012, 0xF7E3C6, X, -0.002, Y, sy=0.3, seg=6), x, z, py=H, wy=False)
    outs.append(shootw(m, 'vanille'))
    m = wall('rosa', 0xFFE6EA)
    for i in range(5): wbox(m, 0.2 + i * 0.4, H / 2, 0.18, H + 0.2, 0xFFC9D4, 0.015)
    for i in range(5):
        for j in range(6): wrap(lambda X, Y: m.heart(0.05, 0xFFFFFF, X, -0.02, Y, depth=0.2), 0.4 + i * 0.4, 0.3 + j * 0.4 + (i % 2) * 0.2, py=H, wy=False)
    outs.append(shootw(m, 'rosa'))
    m = wall('bluemchen', 0xFFF5D9)
    for j in range(6):
        for i in range(4):
            x, z = 0.25 + i * 0.5 + (j % 2) * 0.25, 0.32 + j * 0.42
            c = 0xFFB6C8 if (i + j) % 3 else 0xFFFFFF
            def fl(X, Y, c=c):
                for q in range(5): m.ball(0.042, c, X + math.sin(q * 1.257) * 0.055, -0.006, Y + math.cos(q * 1.257) * 0.055, sy=0.25, seg=10)
                m.ball(0.032, 0xFFE39A, X, -0.012, Y, sy=0.3, seg=8)
            wrap(fl, x, z, py=H, wy=False)
            wrap(lambda X, Y: m.ball(0.03, 0xA8D8A0, X + 0.1, -0.004, Y - 0.08, sx=1.5, sy=0.2, sz=0.6, ry=0.6, seg=8), x, z, py=H, wy=False)
    outs.append(shootw(m, 'bluemchen'))
    m = wall('holz', shade(0xD39F6A, -0.3))
    for i in range(8): wbox(m, 0.125 + i * 0.25, H / 2, 0.238, H + 0.2, shade(0xD39F6A if rnd.random() < 0.5 else 0xC58F5B, (rnd.random() - 0.5) * 0.06), 0.03)
    outs.append(shootw(m, 'holz'))
    m = wall('ziegel', 0xF4E6D6)
    for r_ in range(15):
        z = 0.09 + r_ * 0.17
        for i in range(6): wbox(m, (i * 0.4 + (r_ % 2) * 0.2) % 2.0, z, 0.37, 0.14, shade(0xE3A28E, (rnd.random() - 0.5) * 0.1), 0.03)
    outs.append(shootw(m, 'ziegel'))
    m = wall('sterne', 0x3F4B80)
    for k in range(40):
        x, z, s = rnd.random() * 2, 0.2 + rnd.random() * 2.1, 0.03 + rnd.random() * 0.04
        def star(X, Y, s=s):
            for q in range(5):
                a = q * 1.2566 + PI / 2
                m.ball(s, 0xFFE9A8, X + math.cos(a) * s * 0.8, -0.01, Y + math.sin(a) * s * 0.8, sx=1.3, sy=0.2, sz=0.5, ry=-a, seg=6)
            m.ball(s * 0.9, 0xFFF3C8, X, -0.012, Y, sy=0.25, seg=8)
        wrap(star, x, z, py=H, wy=False)
    for k in range(60): wrap(lambda X, Y: m.ball(0.01, 0xFFFFFF, X, -0.004, Y, sy=0.3, seg=5), rnd.random() * 2, 0.2 + rnd.random() * 2.1, py=H, wy=False)
    outs.append(shootw(m, 'sterne'))
    m = wall('karo', 0xE2F0FF)
    for i in range(8):
        for j in range(8):
            if (i + j) % 2: wbox(m, 0.125 + i * 0.25, 0.15 + j * 0.3, 0.25, 0.3, 0xB5D6F6, 0.012)
    outs.append(shootw(m, 'karo'))
    m = wall('mint', 0xCDEEE0)
    wbox(m, 1.0, 0.52, 2.0, 0.76, 0xFFFAF2, 0.02)
    wbox(m, 1.0, 0.92, 2.0, 0.06, 0xFFFAF2, 0.05)
    for i in range(4): wbox(m, 0.25 + i * 0.5, 0.53, 0.38, 0.5, shade(0xFFFAF2, -0.06), 0.03)
    outs.append(shootw(m, 'mint'))

    log({'ok': True, 'textures': outs, 'dir': TEX})
except Exception:
    log({'ok': False, 'error': traceback.format_exc()})
