# Nachbau aller Platzhalter-Modelle in Blender (Bauplan: art/remaster/plan.json aus tools/dump-models.mjs).
# Dieselben Formen, Maße und Farben wie im Spiel, aber in schön: runde Kanten an Klötzen und Zylindern, feinere
# Kugeln und Ringe, weiche Schatten in Ritzen und am Boden (Umgebungsverdeckung, in die Vertex-Farben gebacken).
# Läuft nach kit.py. Vorher setzen: PLAN = Pfad zur plan.json. Ergebnis: OUT/{place2,furniture2,items2,crops2}.glb
try:
    import mathutils
    clear()
    # alles andere (z. B. importierte Pakete der Icon-Bühne) entfernen, damit die Modell-Namen frei sind
    for o in list(bpy.data.objects):
        if not any(c.name == 'KStage' for c in o.users_collection): bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.actions):
        for x in list(coll):
            if x.users == 0: coll.remove(x)
    plan = json.load(open(PLAN, encoding='utf-8'))
    PACKS = globals().get('PACKS') or ['place', 'furniture', 'items', 'crops']
    TAU = 2 * PI
    CONV = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))  # Spiel (y oben) -> Blender (z oben, vorne = -Y)

    def q(R):  # Segmente nach sichtbarer Größe
        return 8 if R < 0.025 else 12 if R < 0.06 else 16 if R < 0.15 else 20 if R < 0.4 else 28

    def mat_of(m):
        M = Matrix(((m[0], m[1], m[2]), (m[4], m[5], m[6]), (m[8], m[9], m[10])))
        L = CONV @ M; t = CONV @ Vector((m[3], m[7], m[11]))
        T = L.to_4x4(); T.translation = t
        s = [M.col[i].length for i in range(3)]
        return T, s, M.determinant() < 0

    # ---------- Grundformen im Spiel-Raum (y oben), wie three.js sie baut, nur feiner ----------
    def sphere(r, ws, hs, p0, pl, t0, tl, soft=None):
        full = pl > TAU - 1e-4
        verts, faces, rows = [], [], []
        for iy in range(hs + 1):
            th = t0 + iy / hs * tl
            st, ct = math.sin(th), math.cos(th)
            if abs(st) < 1e-7:  # Pol
                verts.append((0.0, r * ct, 0.0)); rows.append([len(verts) - 1] * (ws + 1)); continue
            row = []
            for ix in range(ws + (0 if full else 1)):
                ph = p0 + ix / ws * pl
                verts.append((-r * math.cos(ph) * st, r * ct, r * math.sin(ph) * st)); row.append(len(verts) - 1)
            if full: row.append(row[0])
            rows.append(row)
        for iy in range(hs):
            A, B = rows[iy], rows[iy + 1]
            for ix in range(ws):
                f = [A[ix], A[ix + 1], B[ix + 1], B[ix]]
                g = []
                for v in f:
                    if v not in g: g.append(v)
                if len(g) >= 3: faces.append(g[::-1])
        if soft:
            verts = [tuple(math.copysign(abs(c) ** soft, c) for c in v) for v in verts]
        return verts, faces

    def cyl(rt, rb, h, seg, open_, t0, tl, chamfer=0.0):
        full = tl > TAU - 1e-4
        n = seg + (0 if full else 1)
        ang = [t0 + i / seg * tl for i in range(n)]
        verts, faces = [], []
        def ring(r, y):
            base = len(verts)
            for a in ang: verts.append((r * math.sin(a), y, r * math.cos(a)))
            return list(range(base, base + n))
        def strip(A, B):
            for i in range(seg):
                j = (i + 1) % n if full else i + 1
                faces.append([A[i], A[j], B[j], B[i]])
        y0, y1 = -h / 2, h / 2
        cb = chamfer if (chamfer and not open_ and full and rb > chamfer * 1.5) else 0
        ct = chamfer if (chamfer and not open_ and full and rt > chamfer * 1.5) else 0
        rings = []
        if cb: rings.append(ring(rb - cb, y0))
        rings.append(ring(rb, y0 + cb))
        rings.append(ring(rt, y1 - ct))
        if ct: rings.append(ring(rt - ct, y1))
        for A, B in zip(rings, rings[1:]): strip(A, B)
        if not open_:
            for R_, y, top in ((rings[0], y0, False), (rings[-1], y1, True)):
                rr = math.hypot(verts[R_[0]][0], verts[R_[0]][2])
                if rr < 1e-6: continue
                if full: faces.append(R_[::-1] if not top else R_[:])
                else:
                    verts.append((0.0, y, 0.0)); c = len(verts) - 1
                    for i in range(seg): faces.append([c, R_[i + 1], R_[i]] if not top else [c, R_[i], R_[i + 1]])
        return verts, faces

    def torus(R, t, rs, ts, arc):
        full = arc > TAU - 1e-4
        nu = ts + (0 if full else 1)
        verts, faces = [], []
        for i in range(nu):
            u = i / ts * arc
            for j in range(rs):
                v = j / rs * TAU
                verts.append(((R + t * math.cos(v)) * math.cos(u), (R + t * math.cos(v)) * math.sin(u), t * math.sin(v)))
        for i in range(ts):
            i2 = (i + 1) % nu if full else i + 1
            for j in range(rs):
                j2 = (j + 1) % rs
                faces.append([i * rs + j, i2 * rs + j, i2 * rs + j2, i * rs + j2])
        if not full:  # Enden schließen
            faces.append(list(range(rs))); faces.append([ts * rs + j for j in range(rs)][::-1])
        return verts, faces

    def box(w, h, d):
        x, y, z = w / 2, h / 2, d / 2
        verts = [(-x, -y, -z), (x, -y, -z), (x, y, -z), (-x, y, -z), (-x, -y, z), (x, -y, z), (x, y, z), (-x, y, z)]
        faces = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 4, 7, 3]]
        return verts, faces

    def circle(r, seg, t0, tl):
        full = tl > TAU - 1e-4
        n = seg + (0 if full else 1)
        verts = [(r * math.cos(t0 + i / seg * tl), r * math.sin(t0 + i / seg * tl), 0.0) for i in range(n)]
        if full: return verts, [list(range(n))]
        verts.append((0.0, 0.0, 0.0))
        return verts, [[n, i, i + 1] for i in range(seg)]

    def lathe(pts, seg, p0, pl):
        P = [(pts[i], pts[i + 1]) for i in range(0, len(pts), 2)]
        full = pl > TAU - 1e-4
        nu = seg + (0 if full else 1)
        verts, faces = [], []
        for i in range(nu):
            a = p0 + i / seg * pl
            for x, y in P: verts.append((x * math.sin(a), y, x * math.cos(a)))
        k = len(P)
        for i in range(seg):
            i2 = (i + 1) % nu if full else i + 1
            for j in range(k - 1):
                faces.append([i * k + j, i2 * k + j, i2 * k + j + 1, i * k + j + 1])
        return verts, faces

    # ---------- Teil ins Modell einfügen ----------
    def add(m, verts, faces, color, T, flip, glow, bevel=0.0, bseg=1, merge=False, vcols=None):
        bm, cl = m._bm(glow)
        before = set(bm.faces)
        vs = [bm.verts.new(v) for v in verts]
        new = []
        for i, f in enumerate(faces):
            try: new.append(bm.faces.new([vs[k] for k in f]))
            except ValueError: pass
        if not new: return
        if bevel > 0:  # Bevel ersetzt Flächen: danach alle neuen Flächen neu einsammeln
            edges = list({e for f in new for e in f.edges})
            bmesh.ops.bevel(bm, geom=edges + vs, offset=bevel, segments=bseg, profile=0.5, affect='EDGES', clamp_overlap=True)
            new = [f for f in bm.faces if f not in before]
        bmesh.ops.transform(bm, matrix=T, verts=list({v for f in new for v in f.verts}))
        if merge:
            bmesh.ops.remove_doubles(bm, verts=list({v for f in new for v in f.verts}), dist=1e-5)
            new = [f for f in bm.faces if f not in before]
        if flip: bmesh.ops.reverse_faces(bm, faces=new)
        c = col(color) if vcols is None else None
        for fi, f in enumerate(new):
            for l in f.loops:
                l[cl] = c if c is not None else vcols.get(l.vert.index, (1, 1, 1, 1))

    stats = {'tris': 0, 'models': 0}
    def build_part(m, p, keep=False):  # keep: Segmente wie im Spiel lassen (große Welt-Stücke)
        glow = bool(p.get('g')); t = p['t']
        if t == 'raw':
            v = p['v']; n = len(v) // 3
            T = Matrix.Identity(4); T3 = CONV.to_4x4()
            verts = [tuple(v[i * 3:i * 3 + 3]) for i in range(n)]
            faces = [[i, i + 1, i + 2] for i in range(0, n - 2, 3)]
            if 'vc' in p:
                vc = p['vc']; bm, cl = m._bm(glow)
                vs = [bm.verts.new(T3 @ Vector(x)) for x in verts]
                for i in range(0, n - 2, 3):
                    try: f = bm.faces.new([vs[i], vs[i + 1], vs[i + 2]])
                    except ValueError: continue
                    for k, l in enumerate(f.loops):
                        j = i + k; l[cl] = (vc[j * 3] / 255, vc[j * 3 + 1] / 255, vc[j * 3 + 2] / 255, 1.0)
                return
            add(m, verts, faces, p.get('c', 0xFFFFFF), T3, False, glow, merge=True)
            return
        T, s, flip = mat_of(p['m']); a = p['a']; smax = max(s) or 1; smin = min(s) or 1
        if t == 'box':
            w, h, d = a[0], a[1], a[2]
            dims = sorted([w * s[0], h * s[1], d * s[2]])
            r = 0 if dims[0] < 0.006 else min(dims[0] * 0.2, 0.03)
            add(m, *box(w, h, d), p['c'], T, flip, glow, bevel=r / smax if r else 0, bseg=2 if dims[2] > 0.3 and dims[0] > 0.05 else 1)
        elif t in ('sphere', 'soft'):
            if t == 'soft':
                e, ws0, hs0 = a
                ws = ws0 if keep else 16 if smax > 0.6 else 12; hs = hs0 if keep else ws * 2 // 3
                add(m, *sphere(1.0, ws, hs, 0, TAU, 0, PI, soft=e), p['c'], T, flip, glow)
            else:
                r, ws0, hs0, p0, pl, t0, tl = a
                R = r * smax
                if ws0 <= 6 or keep: ws, hs = ws0, hs0  # bewusst eckig bzw. wie im Spiel
                else:
                    W, Hh = (8, 5) if R < 0.02 else (8, 6) if R < 0.04 else (10, 6) if R < 0.08 else (12, 8) if R < 0.15 else (16, 10) if R < 0.3 else (20, 12)
                    ws = max(3, round(W * pl / TAU)); hs = max(2, round(Hh * tl / PI))
                add(m, *sphere(r, ws, hs, p0, pl, t0, tl), p['c'], T, flip, glow)
        elif t in ('cyl', 'cone'):
            rt, rb, h, seg0, open_, t0, tl = a
            R = max(rt, rb) * max(s[0], s[2])
            qc = 8 if R < 0.03 else 12 if R < 0.08 else 16 if R < 0.2 else 20 if R < 0.4 else 28
            seg = seg0 if seg0 <= 6 or keep else max(3, round(qc * tl / TAU))
            sh = h * s[1]; rr = min(rt if rt > 0 else rb, rb if rb > 0 else rt) * max(s[0], s[2])
            ch = 0 if seg0 <= 6 or sh < 0.01 or rr < 0.02 else min(0.18 * min(rr, sh), 0.02)
            add(m, *cyl(rt, rb, h, seg, open_, t0, tl, chamfer=ch / max(s[0], s[2]) if ch else 0), p['c'], T, flip, glow)
        elif t == 'torus':
            R0, tb, rs0, ts0, arc = a
            rs = rs0 if rs0 <= 4 or keep else 8
            Rt = R0 * smax; qt = 12 if Rt < 0.05 else 18 if Rt < 0.15 else 24 if Rt < 0.3 else 32
            ts = ts0 if keep else max(4, round(qt * arc / TAU))
            add(m, *torus(R0, tb, rs, ts, arc), p['c'], T, flip, glow)
        elif t == 'circle':
            r, seg0, t0, tl = a
            add(m, *circle(r, max(seg0, round(q(r * smax) * 1.5 * tl / TAU)), t0, tl), p['c'], T, flip, glow)
        elif t == 'plane':
            w, h = a
            add(m, [(-w / 2, -h / 2, 0), (w / 2, -h / 2, 0), (w / 2, h / 2, 0), (-w / 2, h / 2, 0)], [[0, 1, 2, 3]], p['c'], T, flip, glow)
        elif t == 'lathe':
            pts, seg0, p0, pl = a
            add(m, *lathe(pts, max(seg0, round(q(smax * max(pts[0::2])) * pl / TAU)), p0, pl), p['c'], T, flip, glow, merge=True)

    # ---------- alle Modelle bauen ----------
    built = {}
    ONLY_MODELS = globals().get('ONLY_MODELS')
    todo = [M for M in plan['models'] if M['pack'] in PACKS and (not ONLY_MODELS or M['name'] in ONLY_MODELS)]
    for i, M in enumerate(todo):
        m = Model(M['name'])
        for p in M['parts']:
            try: build_part(m, p, bool(M.get('keep')))
            except Exception as e: print('Teil übersprungen', M['name'], p.get('t'), e)
        root = m.build()
        if M.get('keep'):  # wie im Spiel: erst ab 55° kantig (7-eckige Felsen bleiben rund, 6-eckige Stäbe kantig)
            for o in [root] + list(root.children_recursive):
                if o.type != 'MESH': continue
                try: o.data.set_sharp_from_angle(angle=math.radians(55), keep_sharp_edges=False)
                except TypeError: o.data.set_sharp_from_angle(angle=math.radians(55))
                except Exception: pass
        if root.name != M['name']:  # nur Leuchtteile: leere Wurzel mit dem richtigen Namen
            e = bpy.data.objects.new(M['name'], None); collection('Kuschel').objects.link(e); root.parent = e; root = e
        built.setdefault(M['pack'], []).append(root)
        stats['models'] += 1

    wrong = [M['name'] for M in todo if bpy.data.objects.get(M['name']) is None]
    if wrong: raise RuntimeError('Modell-Namen nicht frei: ' + ', '.join(wrong[:10]))

    # ---------- auslegen: jedes Modell mit Abstand nebeneinander (sonst beschatten sie sich beim Backen) ----------
    LAYOUT = {}
    cur, cy, rowh, ROW = 0.0, 0.0, 0.0, 160.0
    for objs in built.values():
        for r in objs:
            pts = [Vector(c) for o in [r] + list(r.children_recursive) if o.type == 'MESH' for c in o.bound_box]
            if not pts: pts = [Vector((0, 0, 0))]
            x0, x1 = min(q.x for q in pts), max(q.x for q in pts); y0, y1 = min(q.y for q in pts), max(q.y for q in pts)
            if cur > 0 and cur + (x1 - x0) > ROW: cy -= rowh + 3; cur = 0.0; rowh = 0.0
            LAYOUT[r.name] = (cur - x0, cy - y1, 0.0); r.location = LAYOUT[r.name]
            cur += (x1 - x0) + 3; rowh = max(rowh, y1 - y0)
    EXT = (ROW, -cy + rowh)

    # ---------- sehr dichte Modelle sanft ausdünnen (Handys!) ----------
    CAP = {'furniture': 4000, 'place': 5500, 'items': 1200, 'crops': 1200}
    def ntris(me): return sum(len(p.vertices) - 2 for p in me.polygons)
    stats['decimated'] = []
    for pack, objs in built.items():
        for r in objs:
            for o in [r] + list(r.children_recursive):
                if o.type != 'MESH' or '__glow' in o.name: continue
                n = ntris(o.data)
                if not CAP.get(pack) or n <= CAP[pack]: continue
                mod = o.modifiers.new('dec', 'DECIMATE'); mod.ratio = CAP[pack] / n
                ev = o.evaluated_get(bpy.context.evaluated_depsgraph_get())
                me = bpy.data.meshes.new_from_object(ev); old = o.data
                o.modifiers.remove(mod); o.data = me; bpy.data.meshes.remove(old)
                me.name = o.name
                for pl in me.polygons: pl.use_smooth = True
                try: me.set_sharp_from_angle(angle=math.radians(48))
                except Exception: pass
                try: me.color_attributes.active_color = me.color_attributes['Col']
                except Exception: pass
                stats['decimated'].append([o.name, n, ntris(me)])

    # ---------- Umgebungsverdeckung in die Vertex-Farben backen (Cycles, Boden als Ebene) ----------
    meshes = [o for objs in built.values() for r in objs for o in [r] + list(r.children_recursive) if o.type == 'MESH' and '__glow' not in o.name]
    sc = bpy.context.scene
    eng = sc.render.engine
    gnd = bpy.data.objects.get('K_AOGround')
    if not gnd:
        me = bpy.data.meshes.new('K_AOGround'); bmg = bmesh.new(); bmesh.ops.create_grid(bmg, x_segments=1, y_segments=1, size=1); bmg.to_mesh(me); bmg.free()
        gnd = bpy.data.objects.new('K_AOGround', me); collection('KStage').objects.link(gnd)
    gnd.location = (EXT[0] / 2, -EXT[1] / 2, 0); gnd.scale = (EXT[0] + 60, EXT[1] + 60, 1)
    gnd.hide_render = False; gnd.hide_set(False)
    baked = False
    try:
        sc.render.engine = 'CYCLES'
        sc.cycles.device = 'CPU'; sc.cycles.samples = 48
        w = sc.world or bpy.data.worlds.new('World'); sc.world = w
        w.light_settings.distance = 0.35
        for o in meshes:
            ca = o.data.color_attributes
            if 'AO' in ca: ca.remove(ca['AO'])
            ao = ca.new('AO', 'FLOAT_COLOR', 'POINT'); ca.active_color = ao
        bpy.ops.object.select_all(action='DESELECT')
        for o in meshes: o.select_set(True)
        bpy.context.view_layer.objects.active = meshes[0]
        bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
        for o in meshes:
            me = o.data; ca = me.color_attributes
            ao = ca['AO']; vals = [0.0] * (len(me.vertices) * 4); ao.data.foreach_get('color', vals)
            colr = ca['Col']; cv = [0.0] * (len(me.loops) * 4); colr.data.foreach_get('color', cv)
            li = [0] * len(me.loops); me.loops.foreach_get('vertex_index', li)
            for k, vi in enumerate(li):
                a_ = vals[vi * 4]; f = 0.58 + 0.42 * max(0.0, min(1.0, a_)) ** 0.8
                cv[k * 4] *= f; cv[k * 4 + 1] *= f; cv[k * 4 + 2] *= f
            colr.data.foreach_set('color', cv)
            ca.remove(ao); ca.active_color = ca['Col']
            try: ca.render_color_index = ca.active_color_index
            except Exception: pass
        baked = True
    except Exception:
        stats['bake_error'] = traceback.format_exc()[-1500:]
    finally:
        sc.render.engine = eng
        gnd.hide_render = True; gnd.hide_set(True)

    # ---------- exportieren (je Paket eine Datei, stärker komprimiert als kit.export) ----------
    def export_small(objs, name):
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:
            o.select_set(True)
            for ch in o.children_recursive: ch.select_set(True)
        path = os.path.join(OUT, name + '.glb')
        bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_normals=True,
                                  export_texcoords=False, export_animations=False, export_extras=False, export_materials='NONE', export_vertex_color='ACTIVE',
                                  export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=10, export_draco_position_quantization=12,
                                  export_draco_normal_quantization=8, export_draco_color_quantization=8)
        return path

    files = {}
    for pack, objs in built.items():
        for r in objs: r.location = (0, 0, 0)
        for r in objs:
            for o in [r] + list(r.children_recursive):
                if o.type == 'MESH': stats['tris'] += sum(len(p.vertices) - 2 for p in o.data.polygons)
        if not globals().get('NO_EXPORT'): files[pack] = export_small(objs, pack + '2')
        for r in objs: r.location = LAYOUT[r.name]
    stats['baked'] = baked
    result = {'ok': True, 'files': files, 'stats': stats}
    log(result)
except Exception:
    result = {'ok': False, 'error': traceback.format_exc()}
    log(result)
