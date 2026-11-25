# Kachelbare Zimmer-Texturen, Teil 2 (wie textures.py): Böden „Rosa Dielen“ und „Pfingstrosen-Parkett“ (2×2 Felder)
# und die Tapete „Pfingstrosen“ (2 breit × 2,4 hoch). Läuft nach kit.py; Ergebnis: OUT/tex/*.png
try:
    clear()
    rnd = random.Random(91)
    TEX = os.path.join(OUT, 'tex'); os.makedirs(TEX, exist_ok=True)
    sc = bpy.context.scene
    for n in ('K_Ground', 'K_Path', 'K_AOGround'):
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
        else:
            cam.location = (center[0], -5, center[1]); cam.rotation_euler = (PI / 2, 0, 0)
        sc.render.resolution_x, sc.render.resolution_y = res
        sc.render.filepath = os.path.join(TEX, name + '.png')
        bpy.ops.render.render(write_still=True)
        clear()
        return name

    def wrap(fn, x, y, px=2.0, py=2.0, m=0.35, wy=True):
        for dx in (-px, 0, px):
            for dy in ((-py, 0, py) if wy else (0,)):
                X, Y = x + dx, y + dy
                if -m <= X <= px + m and (not wy or -m <= Y <= py + m): fn(X, Y)

    outs = []
    # ---------- Böden ----------
    light(0.62, 1.25, (0, 0, 0))
    base = 0xF4C9D2  # Rosa Dielen: rosa lasierte Bretter mit hellen Astlöchern
    m = Model('t_rosadielen')
    m.box(2.8, 2.8, 0.02, shade(base, -0.3), 1, 1, -0.02, r=0.002)
    for row in range(8):
        y = row * 0.25 + 0.125; x = rnd.random() * 2; used = 0
        while used < 2.0:
            L = min(0.9 + rnd.random() * 0.9, 2.0 - used)
            c = shade(base, (rnd.random() - 0.5) * 0.08)
            for x0, x1 in (((x, x + L),) if x + L <= 2 else ((x, 2.0), (0.0, x + L - 2))):
                if x1 - x0 > 0.03: m.box(x1 - x0 - 0.012, 0.235, 0.04, c, (x0 + x1) / 2, y, 0, r=0.008)
            if rnd.random() < 0.5: m.ball(0.022, shade(base, 0.25), (x + L * 0.4) % 2, y + (rnd.random() - 0.5) * 0.1, 0.02, sz=0.25, seg=10)
            if x + L >= 2 and rnd.random() < 0.6: m.ball(0.008, shade(base, -0.25), (x + 0.06) % 2, y, 0.02, sz=0.4, seg=6)
            x = (x + L) % 2; used += L
    m.build(); outs.append(shoot('floor_rosadielen', (1, 1), (2, 2), (512, 512)))

    m = Model('t_rosenparkett')  # Fischgrät-Parkett in Rosé, in der Mitte jeder Kachel eine kleine Blüte
    m.box(2.8, 2.8, 0.02, shade(0xF0B8C6, -0.3), 1, 1, -0.02, r=0.002)
    for i in range(4):
        for j in range(4):
            x, y = i * 0.5 + 0.25, j * 0.5 + 0.25
            for o in (-0.125, 0.125):
                c = shade(0xF8D6DE if rnd.random() < 0.5 else 0xF0B8C6, (rnd.random() - 0.5) * 0.04)
                if (i + j) % 2: m.box(0.49, 0.24, 0.04, c, x, y + o, 0, r=0.01)
                else: m.box(0.24, 0.49, 0.04, c, x + o, y, 0, r=0.01)
    for i in range(5):
        for j in range(5):
            X, Y = i * 0.5, j * 0.5
            for q in range(5): m.ball(0.026, 0xFFFFFF, X + math.cos(q * 1.257) * 0.03, Y + math.sin(q * 1.257) * 0.03, 0.03, sz=0.3, seg=8)
            m.ball(0.018, 0xFF9AC4, X, Y, 0.036, sz=0.4, seg=8)
    m.build(); outs.append(shoot('floor_rosenparkett', (1, 1), (2, 2), (512, 512)))

    # ---------- Tapete „Pfingstrosen“ ----------
    light(0.62, 1.25, (PI / 2, 0, 0))
    H = 2.4
    m = Model('t_pfingstrosen'); m.box(2.8, 0.02, H + 0.6, 0xFFE9EF, 1, 0.01, H / 2, r=0.002)
    for i in range(10):  # zarte Streifen
        X = 0.1 + i * 0.2
        wrap(lambda X_, Y_: m.box(0.05, 0.01, H + 0.2, 0xFFF4F7, X_, -0.003, Y_, r=0.004), X, H / 2, py=H, wy=False)
    def peony(X, Y, s, c):
        for k in range(10):  # äußerer Blütenkranz
            a = k * TAU_ / 10
            m.ball(0.06 * s, shade(c, 0.12), X + math.cos(a) * 0.075 * s, -0.008, Y + math.sin(a) * 0.075 * s, sx=1.25, sy=0.22, sz=0.85, ry=-a, seg=10)
        for k in range(7):
            a = k * TAU_ / 7 + 0.3
            m.ball(0.05 * s, c, X + math.cos(a) * 0.045 * s, -0.016, Y + math.sin(a) * 0.045 * s, sx=1.15, sy=0.28, sz=0.85, ry=-a, seg=10)
        m.ball(0.045 * s, shade(c, -0.12), X, -0.024, Y, sy=0.35, seg=12)
        for k in (-1, 1):
            m.ball(0.05 * s, 0x8FCB7A, X + k * 0.12 * s, -0.004, Y - 0.1 * s, sx=1.5, sy=0.18, sz=0.55, ry=k * 0.6, seg=8)
    TAU_ = 2 * PI
    for j in range(5):
        for i in range(3):
            X, Y = 0.33 + i * 0.67 + (j % 2) * 0.333, 0.25 + j * 0.48
            s = 0.9 + rnd.random() * 0.25
            c = 0xFF9AC4 if (i + j) % 3 else 0xFFC1D8
            wrap(lambda X_, Y_, s=s, c=c: peony(X_, Y_, s, c), X, Y, py=H, wy=False)
            wrap(lambda X_, Y_: m.ball(0.02, 0xFFC1D8, X_, -0.004, Y_, sy=0.3, seg=6), (X + 0.33) % 2, Y + 0.24, py=H, wy=False)
    m.build(); outs.append(shoot('wall_pfingstrosen', (1, H / 2), (2, H), (512, 614), view='front'))

    result = {'ok': True, 'textures': outs, 'dir': TEX}
    log(result)
except Exception:
    result = {'ok': False, 'error': traceback.format_exc()}
    log(result)
