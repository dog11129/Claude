# Figuren der Kuschelinsel in Blender bauen: Avatar-Teile, Werkzeuge, Haustiere, Nachbarn und Nutztiere.
# Die Formen kommen aus shapes_data.py (Grundformen + Lage + Farbe, aus den Spiel-Figuren ausgelesen) und werden hier
# feiner und weicher gebaut: mehr Segmente, glatte Normalen, Klötzchen mit runden Kanten. Ursprung je Teil = sein Gelenk,
# damit die Animationen im Spiel unverändert passen. Schlüsselfarben (Magenta = Haut, Cyan = Haare, Gelb = Oberteil,
# Blau = Hose, Rot = Schuhe, Grün = Fell) ersetzt das Spiel beim Laden durch die gewählten Farben.
try:
    clear()
    AX = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))  # Spiel (x, y, z) -> Blender (x, -z, y)
    TAU = 2 * PI

    def grid(bm, rows):  # rows: Liste von Vertex-Reihen -> Vierecke
        faces = []
        for a, b in zip(rows, rows[1:]):
            for i in range(len(a) - 1):
                try: faces.append(bm.faces.new((a[i], b[i], b[i + 1], a[i + 1])))  # gleiche Drehrichtung wie three.js
                except ValueError: pass
        return faces

    def sphere(bm, r, ws, hs, ps, pl, ts, tl):
        ws = max(14, int(ws * 1.6)); hs = max(9, int(hs * 1.6))
        rows = []
        for iy in range(hs + 1):
            v = iy / hs; th = ts + v * tl
            rows.append([bm.verts.new((-r * math.cos(ps + ix / ws * pl) * math.sin(th), r * math.cos(th), r * math.sin(ps + ix / ws * pl) * math.sin(th))) for ix in range(ws + 1)])
        return grid(bm, rows)

    def cylinder(bm, rt, rb, h, rs, hs, open_, ts, tl):
        rs = max(12, int(rs * 1.5)); hs = max(1, int(hs))
        rows = []
        for iy in range(hs + 1):
            v = iy / hs; r = v * (rb - rt) + rt; y = -v * h + h / 2
            rows.append([bm.verts.new((r * math.sin(ts + ix / rs * tl), y, r * math.cos(ts + ix / rs * tl))) for ix in range(rs + 1)])
        faces = grid(bm, rows)
        if not open_:
            for ring, y, r in ((rows[0], h / 2, rt), (rows[-1], -h / 2, rb)):
                if r <= 1e-6: continue
                c = bm.verts.new((0, y, 0))
                for i in range(len(ring) - 1):
                    try: faces.append(bm.faces.new((c, ring[i], ring[i + 1]) if y > 0 else (c, ring[i + 1], ring[i])))
                    except ValueError: pass
        return faces

    def torus(bm, R, t, rs, ts, arc):
        ts = max(16, int(ts * 1.5)); rs = max(6, int(rs))
        rows = []
        for i in range(ts + 1):
            u = i / ts * arc
            rows.append([bm.verts.new(((R + t * math.cos(j / rs * TAU)) * math.cos(u), (R + t * math.cos(j / rs * TAU)) * math.sin(u), t * math.sin(j / rs * TAU))) for j in range(rs + 1)])
        return grid(bm, rows)

    def box(bm, w, h, d):
        res = bmesh.ops.create_cube(bm, size=1.0); vs = res['verts']
        for v in vs: v.co = Vector((v.co.x * w, v.co.y * h, v.co.z * d))
        r = min(w, h, d) * 0.22
        if r > 0.002:
            edges = list({e for v in vs for e in v.link_edges})
            bmesh.ops.bevel(bm, geom=edges + vs, offset=r, segments=2, profile=0.5, affect='EDGES', clamp_overlap=True)

    def build_piece(name, prims):
        m = Model(name)
        bm, cl = m.bm, m.cl
        for t, p, e, c in prims:
            before = set(bm.faces)
            if t == 's': sphere(bm, *p)
            elif t == 'c': cylinder(bm, *p)
            elif t == 't': torus(bm, *p)
            elif t == 'b': box(bm, *p)
            faces = [f for f in bm.faces if f not in before]
            verts = list({v for f in faces for v in f.verts})
            # lose Vertices (z. B. von Box-Bevel) mitnehmen
            verts += [v for v in bm.verts if not v.link_faces and v not in verts]
            bmesh.ops.remove_doubles(bm, verts=verts, dist=1e-6)
            faces = [f for f in bm.faces if f not in before]
            verts = list({v for f in faces for v in f.verts})
            M = Matrix([[e[col * 4 + row] for col in range(4)] for row in range(4)])
            bmesh.ops.transform(bm, matrix=AX @ M, verts=verts)
            if M.to_3x3().determinant() < 0: bmesh.ops.reverse_faces(bm, faces=faces)
            colr = lin(c)
            for f in faces:
                for l in f.loops: l[cl] = colr
        loose = [v for v in bm.verts if not v.link_faces]
        if loose: bmesh.ops.delete(bm, geom=loose, context='VERTS')
        return m.build()

    objs = {}
    for name, prims in SHAPES.items():
        objs[name] = build_piece(name, prims)

    path = export(list(objs.values()), 'characters')

    # Vorschau: ein paar Figuren zusammengesetzt nebeneinander (nur grob, zum Anschauen)
    def vis(o, show):
        for ob in [o] + list(o.children_recursive): ob.hide_render = not show
    for o in objs.values(): vis(o, False)
    for g_ in ('K_Ground', 'K_Path'):
        if bpy.data.objects.get(g_): bpy.data.objects[g_].hide_render = False
    show = [n for n in objs if n.startswith(('npc_', 'ani_')) and n.endswith(('_head', '_body'))] + [n for n in objs if n.startswith('av_hat_')]
    sel = [objs[n] for n in show]
    for o in sel: vis(o, True)
    old = arrange(sel, cols=10, gap=0.9)
    rows = (len(sel) + 9) // 10
    stage(target=(0, -(rows - 1) * 0.9 * 0.45, 0.3), dist=10 * 0.9 * 1.15 + 1, el=30, lens=40)
    out = render('figuren_teile')
    for o, p in zip(sel, old): o.location = p
    tris = sum(len(p.vertices) - 2 for o in objs.values() for ob in [o] + list(o.children_recursive) if ob.type == 'MESH' for p in ob.data.polygons)
    log({'ok': True, 'glb': path, 'size': os.path.getsize(path), 'renders': [out], 'pieces': len(objs), 'total': tris})
except Exception:
    log({'ok': False, 'error': traceback.format_exc()})
