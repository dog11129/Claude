# Gegenstands-Icons aus Blender: jedes Ding einzeln, leicht gedreht wie im Spiel, schräg von vorn, weiches Licht,
# transparenter Hintergrund. Welches Modell welches Icon zeigt, steht in art/remaster/plan.json (icons).
# Läuft nach kit.py. Vorher setzen: PLAN, PACKDIR (Ordner mit allen Modell-Paketen .glb), ICONDIR (Ausgabe),
# optional ONLY = [ids]. Danach im Repo: python3 tools/import-icons.py --rand ordner  (Umriss + 256×256 WebP)
try:
    import zipfile
    plan = json.load(open(PLAN, encoding='utf-8'))
    icons = plan['icons']
    if globals().get('ONLY'): icons = [i for i in icons if i['id'] in ONLY]
    os.makedirs(ICONDIR, exist_ok=True)
    sc = bpy.context.scene
    # Szene leeren, damit die Modell-Namen frei sind, dann alle Pakete laden
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.actions, bpy.data.cameras, bpy.data.lights):
        for x in list(coll):
            if x.users == 0: coll.remove(x)
    loaded = []
    for f in sorted(os.listdir(PACKDIR)):
        if f.endswith('.glb') and f[:-4] not in ('sky', 'buildings'):
            bpy.ops.import_scene.gltf(filepath=os.path.join(PACKDIR, f)); loaded.append(f)
    # Material: Vertex-Farben (Leuchtteile leuchten in ihrer Farbe)
    def vcmat(name, glow):
        m = bpy.data.materials.get(name)
        if m: return m
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
        for n in list(nt.nodes):
            if n.type != 'OUTPUT_MATERIAL': nt.nodes.remove(n)
        vc = nt.nodes.new('ShaderNodeVertexColor'); vc.layer_name = ''
        out = nt.nodes['Material Output']
        if glow:
            em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1.4
            nt.links.new(vc.outputs['Color'], em.inputs['Color']); nt.links.new(em.outputs[0], out.inputs['Surface'])
        else:
            b = nt.nodes.new('ShaderNodeBsdfPrincipled'); b.inputs['Roughness'].default_value = 0.62
            for k in ('Specular IOR Level', 'Specular'):
                if k in b.inputs: b.inputs[k].default_value = 0.3
            nt.links.new(vc.outputs['Color'], b.inputs['Base Color']); nt.links.new(b.outputs[0], out.inputs['Surface'])
        return m
    MB, MG = vcmat('IC_VC', False), vcmat('IC_Glow', True)
    for o in bpy.data.objects:
        o.hide_render = True
        if o.type == 'MESH':
            glow = '__glow' in o.name or (o.parent is not None and '__glow' in o.parent.name)
            o.data.materials.clear(); o.data.materials.append(MG if glow else MB)
    # Kamera und Licht
    cam = bpy.data.objects.new('IC_Cam', bpy.data.cameras.new('IC_Cam')); sc.collection.objects.link(cam)
    cam.data.angle = math.radians(26); sc.camera = cam
    def sunlight(name, energy, rot, color, angle):
        L = bpy.data.objects.new(name, bpy.data.lights.new(name, 'SUN')); sc.collection.objects.link(L)
        L.data.energy = energy; L.data.color = color; L.data.angle = math.radians(angle); L.rotation_euler = rot
        return L
    sunlight('IC_Key', 3.2, (math.radians(48), math.radians(-10), math.radians(-38)), (1.0, 0.96, 0.9), 12)
    sunlight('IC_Rim', 1.3, (math.radians(-55), 0, math.radians(30)), (0.9, 0.95, 1.0), 20)
    w = sc.world or bpy.data.worlds.new('World'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes.get('Background')
    if bg: bg.inputs['Color'].default_value = (1.0, 0.97, 0.93, 1); bg.inputs['Strength'].default_value = 0.85
    for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
        try: sc.render.engine = eng; break
        except Exception: pass
    sc.render.film_transparent = True
    sc.render.resolution_x = sc.render.resolution_y = 320; sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    try: sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'; sc.view_settings.exposure = 0
    except Exception: pass
    try: sc.eevee.taa_render_samples = 24
    except Exception: pass

    done, missing = [], []
    EL = math.radians(22)
    for ic in icons:
        root = bpy.data.objects.get(ic['m'])
        if root is None: missing.append(ic['id']); continue
        grp = [root] + list(root.children_recursive)
        root.location = (0, 0, 0); root.rotation_mode = 'XYZ'; root.rotation_euler = (0, 0, 0.25 if ic['side'] else -0.55); root.scale = (1, 1, 1)
        for o in grp: o.hide_render = False
        bpy.context.view_layer.update()
        pts = [o.matrix_world @ Vector(c) for o in grp if o.type == 'MESH' for c in o.bound_box]
        if not pts:
            for o in grp: o.hide_render = True
            missing.append(ic['id']); continue
        lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
        hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
        mid, size = (lo + hi) / 2, hi - lo
        r = max(size.x, size.z, size.y * 0.8) * 0.62 or 1
        dist = r / math.tan(cam.data.angle / 2) * 1.12
        cam.location = mid + Vector((0, -math.cos(EL), math.sin(EL))) * dist
        cam.rotation_euler = (mid - cam.location).to_track_quat('-Z', 'Y').to_euler()
        cam.data.clip_start = dist * 0.02; cam.data.clip_end = dist * 4
        sc.render.filepath = os.path.join(ICONDIR, ic['id'] + '.png')
        bpy.ops.render.render(write_still=True)
        for o in grp: o.hide_render = True
        done.append(ic['id'])
    zpath = os.path.join(os.path.dirname(ICONDIR), 'icons.zip')
    with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
        for i in done: z.write(os.path.join(ICONDIR, i + '.png'), i + '.png')
    result = {'ok': True, 'done': len(done), 'missing': missing, 'zip': zpath, 'packs': loaded}
    log(result)
except Exception:
    result = {'ok': False, 'error': traceback.format_exc()}
    log(result)
