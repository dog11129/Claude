# Schwere Natur- und Beet-Modelle verschlanken: läuft nach kit.py, liest OUT/nature.glb und OUT/crops.glb, dünnt dichte
# Netze aus (Palmwedel, Baumkronen, Felsen, reife Beete) und schreibt sie zurück. Originale bleiben als *_orig.glb liegen.
import os, bpy, math, shutil
def ntris(me): return sum(len(p.vertices) - 2 for p in me.polygons)
def slim(fname, rule):
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.actions):
        for x in list(coll):
            if x.users == 0: coll.remove(x)
    src = os.path.join(OUT, fname + '.glb'); bak = os.path.join(OUT, fname + '_orig.glb')
    if not os.path.exists(bak): shutil.copy2(src, bak)
    bpy.ops.import_scene.gltf(filepath=bak)
    objs = list(bpy.context.scene.objects)
    done = []; before = after = 0; names = {}
    for o in objs:
        if o.type != 'MESH': continue
        n = ntris(o.data); before += n
        cap = rule(o.name, n)
        if cap and n > cap * 1.08:
            mod = o.modifiers.new('dec', 'DECIMATE'); mod.ratio = cap / n
            ev = o.evaluated_get(bpy.context.evaluated_depsgraph_get())
            me = bpy.data.meshes.new_from_object(ev); old = o.data
            o.modifiers.remove(mod); o.data = me; bpy.data.meshes.remove(old); me.name = o.name
            for pl in me.polygons: pl.use_smooth = True
            try: me.set_sharp_from_angle(angle=math.radians(50))
            except Exception: pass
            done.append([o.name, n, ntris(me)])
        me = o.data
        if len(me.color_attributes):
            try:
                me.color_attributes.active_color = me.color_attributes[0]; me.color_attributes.render_color_index = 0
            except Exception: pass
        names[o.name] = [len(me.color_attributes), me.color_attributes[0].name if len(me.color_attributes) else None]
        after += ntris(me)
    roots = [o for o in objs if o.parent is None]
    path = export(roots, fname)
    nocol = [k for k, v in names.items() if not v[0]]
    return {'file': path, 'size': os.path.getsize(path), 'orig': os.path.getsize(bak), 'before': before, 'after': after, 'roots': len(roots),
            'meshes': len(names), 'nocol': nocol[:10], 'attr': sorted({v[1] for v in names.values() if v[1]}), 'done': sorted(done, key=lambda d: -d[1])[:40]}
def nat(name, n):
    l = name.lower()
    if 'frond' in l: return 2600
    if 'crown' in l or 'leaves' in l or 'canopy' in l: return 1700
    if 'rock' in l or 'stone' in l or 'boulder' in l: return 650
    return 2200
R = {'nature': slim('nature', nat), 'crops': slim('crops', lambda name, n: 1000)}
result = R
