# App-Symbol der Kuschelinsel: kleine runde Insel mit Häuschen, Palme und Herz.
# Wird mit transparentem Hintergrund gerendert (appicon.png, 1024²); den Farbverlauf legt tools/icons.py dahinter.
try:
    clear()
    I = Model('appicon')
    I.ball(2.3, 0x7FD6EE, 0, 0, -0.12, sz=0.05, seg=40)                         # Wasserring
    for k in range(10):                                                            # Schaumkrönchen
        a = k * 0.628 + 0.2
        I.ball(0.12, 0xFFFFFF, math.cos(a) * 1.72, math.sin(a) * 1.72, -0.06, sx=1.8, sz=0.25, rz=a + PI / 2, seg=10)
    I.ball(1.65, 0xF6E2B0, 0, 0, 0.0, sz=0.17, seg=36, soft=0.9)                   # Sand
    I.ball(1.38, 0x7DC35A, 0, 0.08, 0.17, sz=0.1, seg=32)                          # Wiese
    # Häuschen
    I.puff(0.95, 0.8, 0.82, 0xFFF0E0, -0.4, 0.2, 0.26, soft=0.3, taper=0.06)
    I.cuteroof(1.1, 0.95, 0.42, 'coral', x=-0.4, y=0.2, z=1.06, rows=3, th=0.12, over=0.12)
    I.door(-0.4, -0.22, 0.27, w=0.34, h=0.52, color='teal', heart=None)
    I.roundwin(-0.12, -0.2, 0.68, r=0.1)
    # Palme
    x0, z0 = 0.78, 0.22
    for i in range(7):
        I.cyl(0.085 - i * 0.004, 0.095 - i * 0.004, 0.22, 0xC08E5A if i % 2 else 0xA97B4C, x0 + i * i * 0.007, 0.35, z0 + i * 0.2, seg=10)
    tx, tz = x0 + 36 * 0.007, z0 + 7 * 0.2
    for i in range(7):
        a = i / 7 * 2 * PI + 0.3
        for k in range(4):
            t = (k + 0.5) / 4
            I.ball(0.2 * (1 - t * 0.35), 0x58B84C if k % 2 else 0x6CC65A, tx + math.cos(a) * t * 0.7, 0.35 + math.sin(a) * t * 0.7, tz + 0.06 - t * t * 0.45, sx=1.35, sy=0.85, sz=0.28, rz=a, seg=10)
    I.ball(0.09, 0x8E5E3E, tx, 0.28, tz - 0.05, seg=8); I.ball(0.09, 0x8E5E3E, tx + 0.1, 0.4, tz - 0.08, seg=8)  # Kokosnüsse
    # Blümchen auf der Wiese
    for k, (x, y) in enumerate(((0.45, -0.55), (0.7, -0.25), (-0.95, -0.35), (0.15, -0.8), (-0.6, -0.7))):
        c = [0xFFB7C8, 0xFFE066, 0xFFFFFF, 0xC9B4F7, 0xFF8FAB][k]
        for j in range(5): b = j * 1.2566; I.ball(0.05, c, x + math.cos(b) * 0.055, y + math.sin(b) * 0.055, 0.28, sz=0.5, seg=6)
        I.ball(0.035, 0xFFD23F, x, y, 0.3, seg=6)
    # Herz darüber
    I.heart(0.55, 0xFF6B8A, 0.2, -0.1, 2.05, depth=0.45)
    I.ball(0.08, 0xFFFFFF, 0.06, -0.32, 2.17, sy=0.3, seg=8)
    icon = I.build()
    for o in bpy.data.objects:
        if o.name in ('K_Ground', 'K_Path'): o.hide_render = True
    sc = bpy.context.scene
    stage(target=(0, 0, 0.85), dist=7.6, el=23, lens=50, res=(1024, 1024))
    sc.render.film_transparent = True
    sc.render.image_settings.color_mode = 'RGBA'
    out = render('appicon')
    sc.render.film_transparent = False
    for o in bpy.data.objects:
        if o.name in ('K_Ground', 'K_Path'): o.hide_render = False
    log({'ok': True, 'renders': [out]})
except Exception:
    log({'ok': False, 'error': traceback.format_exc()})
