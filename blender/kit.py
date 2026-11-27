# Kuschelinsel – Modellier-Kit für Blender (Stil: gemütlich-rund, kräftige Pastellfarben)
# Wird einmal in Blenders Python-Konsole ausgeführt; danach bauen die Modell-Skripte damit.
# Koordinaten: Blender Z = oben, Vorderseite zeigt nach -Y (wird beim glTF-Export zu +Z im Spiel). 1 Einheit = 1 Kachel.
import bpy, bmesh, math, os, json, traceback, random
from mathutils import Matrix, Vector, noise

OUT = r"C:\Users\shawn\Downloads\kuschel3d"
os.makedirs(OUT, exist_ok=True)
PI = math.pi

def lin(h):  # Hex (sRGB) -> lineare Farbe
    c = [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]
    return tuple([(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4) for v in c] + [1.0])

# ---------- Palette (für alle Modelle gleich) ----------
P = dict(
    cream=0xFFEBD3, creamD=0xF1D9BC, white=0xFBF6EE, stone=0xCFC5B8, stoneD=0xA9A096, dark=0x4A3B36,
    wood=0xD9A26C, woodL=0xEEC995, woodD=0x9F6B46, bark=0x8E5E3E,
    leaf=0x74C455, leafD=0x4F9F44, leafL=0x9CD86E, grass=0x7DC35A,
    coral=0xF2806E, rose=0xFF9DB6, pink=0xFFC4D2, berry=0xE84D5E, red=0xF0504F,
    sky=0x9FD8FF, blue=0x6FA0E6, blueD=0x4D7CC4, mint=0x86D6BC, teal=0x4FB3A5,
    yellow=0xFFD95C, orange=0xFFA548, lilac=0xC9B4F7, purple=0x9B7BE0,
    glass=0xBFE6FF, skin=0xFFD8BC, blush=0xFF9AA8, black=0x2E2626,
)
C = {k: lin(v) for k, v in P.items()}
def col(c): return lin(c) if isinstance(c, int) else C[c] if isinstance(c, str) else c
def shade(c, d):  # Farbe heller (d > 0) oder dunkler machen, in Hex
    h = c if isinstance(c, int) else P[c]
    rgb = [((h >> s) & 255) for s in (16, 8, 0)]
    rgb = [max(0, min(255, int(v + (255 - v) * d if d > 0 else v * (1 + d)))) for v in rgb]
    return (rgb[0] << 16) | (rgb[1] << 8) | rgb[2]

# ---------- Modell: sammelt Formen in EINEM Mesh mit Vertex-Farben (+ Leucht-Teil) ----------
class Model:
    def __init__(self, name, pivot=(0, 0, 0)):
        self.name = name
        self.bm = bmesh.new(); self.cl = self.bm.loops.layers.float_color.new("Col")
        self.gm = bmesh.new(); self.gcl = self.gm.loops.layers.float_color.new("Col")
        self.pivot = Vector(pivot); self.parts = []; self.anim = None
    # bewegliches Teil (eigenes Objekt mit Drehpunkt): Geometrie wird in Modell-Koordinaten gebaut
    def part(self, name, pivot, anim=None):
        p = Model(self.name + '_' + name, pivot); p.anim = anim; self.parts.append(p); return p
    def _bm(self, glow): return (self.gm, self.gcl) if glow else (self.bm, self.cl)
    def _finish(self, bm, cl, before, color, M):
        faces = [f for f in bm.faces if f not in before]
        verts = {v for f in faces for v in f.verts}
        bmesh.ops.transform(bm, matrix=M, verts=list(verts))
        c = col(color)
        for f in faces:
            for l in f.loops: l[cl] = c
        return faces

    # weicher Klotz: Würfel mit runden Kanten (r = Kantenradius)
    def box(self, w, d, h, color, x=0, y=0, z=0, r=0.08, seg=3, rx=0, ry=0, rz=0, glow=False):
        bm, cl = self._bm(glow); before = set(bm.faces)
        res = bmesh.ops.create_cube(bm, size=1.0)
        vs = res['verts']
        for v in vs: v.co = Vector((v.co.x * w, v.co.y * d, v.co.z * h))
        r = min(r, w / 2 - 1e-3, d / 2 - 1e-3, h / 2 - 1e-3)
        if r > 0.002:
            edges = list({e for v in vs for e in v.link_edges})
            bmesh.ops.bevel(bm, geom=edges + vs, offset=r, segments=seg, profile=0.5, affect='EDGES', clamp_overlap=True)
        M = Matrix.Translation((x, y, z)) @ Matrix.Rotation(rz, 4, 'Z') @ Matrix.Rotation(ry, 4, 'Y') @ Matrix.Rotation(rx, 4, 'X')
        return self._finish(bm, cl, before, color, M)

    # Kugel / Ellipsoid; soft < 1 drückt sie zum runden Kissen (wie ein Würfel mit sehr weichen Kanten)
    def ball(self, r, color, x=0, y=0, z=0, sx=1, sy=1, sz=1, seg=16, soft=1.0, bump=0.0, rx=0, ry=0, rz=0, glow=False, half=False, taper=0.0):
        bm, cl = self._bm(glow); before = set(bm.faces)
        res = bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=max(6, seg // 2 + 2), radius=1.0)
        vs = res['verts']
        seed = random.random() * 100
        for v in vs:
            p = v.co.copy()
            if soft != 1.0: p = Vector([math.copysign(abs(a) ** soft, a) for a in p])
            if bump: p *= 1 + bump * noise.noise(p * 2.2 + Vector((seed, seed, seed)))
            t = 1 - taper * p.z
            v.co = Vector((p.x * r * sx * t, p.y * r * sy * t, p.z * r * sz))
        if half:
            bmesh.ops.delete(bm, geom=[v for v in vs if v.co.z < -1e-4], context='VERTS')
        M = Matrix.Translation((x, y, z)) @ Matrix.Rotation(rz, 4, 'Z') @ Matrix.Rotation(ry, 4, 'Y') @ Matrix.Rotation(rx, 4, 'X')
        return self._finish(bm, cl, before, color, M)

    # Zylinder / Kegelstumpf entlang Z (Mitte bei z), runde Oberkante mit bevel
    def cyl(self, r1, r2, h, color, x=0, y=0, z=0, seg=16, bev=0.0, rx=0, ry=0, rz=0, glow=False, cap=True):
        bm, cl = self._bm(glow); before = set(bm.faces)
        res = bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=seg, radius1=r1, radius2=r2, depth=h)
        vs = res['verts']
        if bev > 0 and cap:
            rims = [e for e in {e for v in vs for e in v.link_edges} if len(e.link_faces) == 2 and abs(e.verts[0].co.z - e.verts[1].co.z) < 1e-5]
            bmesh.ops.bevel(bm, geom=rims, offset=bev, segments=2, profile=0.5, affect='EDGES', clamp_overlap=True)
        M = Matrix.Translation((x, y, z)) @ Matrix.Rotation(rz, 4, 'Z') @ Matrix.Rotation(ry, 4, 'Y') @ Matrix.Rotation(rx, 4, 'X')
        return self._finish(bm, cl, before, color, M)

    def cone(self, r, h, color, x=0, y=0, z=0, seg=16, **k):
        return self.cyl(r, 0.0, h, color, x, y, z, seg, **k)

    # Ring (Torus) in der XY-Ebene
    def torus(self, R, t, color, x=0, y=0, z=0, seg=24, tseg=8, arc=2 * PI, rx=0, ry=0, rz=0, glow=False):
        bm, cl = self._bm(glow); before = set(bm.faces)
        n = seg + (0 if arc >= 2 * PI - 1e-6 else 1)
        rings = []
        for i in range(n):
            a = arc * i / seg
            ring = []
            for j in range(tseg):
                b = 2 * PI * j / tseg
                ring.append(bm.verts.new(((R + t * math.cos(b)) * math.cos(a), (R + t * math.cos(b)) * math.sin(a), t * math.sin(b))))
            rings.append(ring)
        for i in range(seg):
            A, B = rings[i], rings[(i + 1) % n]
            for j in range(tseg):
                bm.faces.new((A[j], B[j], B[(j + 1) % tseg], A[(j + 1) % tseg]))
        M = Matrix.Translation((x, y, z)) @ Matrix.Rotation(rz, 4, 'Z') @ Matrix.Rotation(ry, 4, 'Y') @ Matrix.Rotation(rx, 4, 'X')
        return self._finish(bm, cl, before, color, M)

    # Stab von a nach b (für Äste, Beine, Stängel)
    def stick(self, a, b, r1, color, r2=None, seg=10):
        a, b = Vector(a), Vector(b); d = b - a
        q = Vector((0, 0, 1)).rotation_difference(d.normalized())
        bm, cl = self.bm, self.cl; before = set(bm.faces)
        bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r1, radius2=r2 if r2 is not None else r1, depth=d.length)
        M = Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4()
        return self._finish(bm, cl, before, color, M)

    # puffiger Klotz (Kissenform): w, d, h = volle Maße, z = Unterkante
    def puff(self, w, d, h, color, x=0, y=0, z=0, soft=0.32, taper=0.06, seg=20, rz=0, rx=0, glow=False):
        return self.ball(0.5, color, x, y, z + h / 2, sx=w, sy=d, sz=h, seg=seg, soft=soft, taper=taper, rz=rz, rx=rx, glow=glow)

    # Herz (Vorderseite -Y), s = Größe
    def heart(self, s, color, x=0, y=0, z=0, depth=0.35, glow=False):
        for k in (-1, 1): self.ball(s * 0.3, color, x + k * s * 0.19, y, z + s * 0.08, sy=depth, seg=12, glow=glow)
        self.ball(s * 0.4, color, x, y, z - s * 0.12, sx=0.95, sy=depth * 0.75, sz=0.9, seg=12, taper=-0.8, glow=glow)

    # Giebel-Füllung (dreieckiges Prisma), First entlang X
    def gable(self, L, D, H, color, x=0, y=0, z=0, rz=0):
        bm, cl = self.bm, self.cl; before = set(bm.faces)
        v = [bm.verts.new(p) for p in [(-L / 2, -D / 2, 0), (-L / 2, D / 2, 0), (-L / 2, 0, H), (L / 2, -D / 2, 0), (L / 2, D / 2, 0), (L / 2, 0, H)]]
        fs = [bm.faces.new([v[i] for i in f]) for f in [(0, 2, 1), (3, 4, 5), (0, 3, 5, 2), (1, 2, 5, 4), (0, 1, 4, 3)]]
        bmesh.ops.recalc_face_normals(bm, faces=fs)
        return self._finish(bm, cl, before, color, Matrix.Translation((x, y, z)) @ Matrix.Rotation(rz, 4, 'Z'))

    # Kuschel-Dach: dicke Platten, darauf gestufte Schindel-Reihen in zwei Tönen, gerollte Traufe, Firstrolle mit Kugeln
    def cuteroof(self, L, D, H, color, z=0, y=0, x=0, th=0.24, over=0.32, rows=4, ridge=None, light=None, rz=0):
        a = math.atan2(H, D / 2); S = math.hypot(H, D / 2) + over
        lt = light or shade(color, 0.1)
        M = Matrix.Translation((x, y, z)) @ Matrix.Rotation(rz, 4, 'Z')
        for sy in (-1, 1):
            u = Vector((0, -sy * math.cos(a), math.sin(a)))      # hangaufwärts
            nrm = Vector((0, sy * math.sin(a), math.cos(a)))     # nach außen
            eave = Vector((0, sy * (D / 2 + over * math.cos(a)), -over * math.sin(a)))
            mid = eave + u * (S / 2) + nrm * (th / 2)
            p = M @ mid
            self.box(L + 2 * over, S, th, color, p.x, p.y, p.z, r=th * 0.45, rx=-sy * a, rz=rz)
            rr = S / rows * 0.36
            for i in range(rows):  # Schindelreihen als dicke, runde Wülste
                t = (i + 0.5) / rows * S * 0.95
                q = M @ (eave + u * t + nrm * (th * 0.5 + rr * 0.55))
                self.cyl(rr, rr, L + 2 * over - 0.04, lt if i % 2 else color, q.x, q.y, q.z, seg=12, ry=PI / 2, rz=rz, bev=min(0.05, rr * 0.5))
            q = M @ (eave + nrm * (th * 0.55))                     # gerollte Traufe
            self.cyl(th * 0.62, th * 0.62, L + 2 * over + 0.04, lt, q.x, q.y, q.z, seg=14, ry=PI / 2, rz=rz, bev=0.03)
        rp = M @ Vector((0, 0, H + th * 0.55))
        self.cyl(th * 0.7, th * 0.7, L + 2 * over + 0.12, ridge or color, rp.x, rp.y, rp.z, seg=14, ry=PI / 2, rz=rz, bev=0.05)
        for sx in (-1, 1):
            e = M @ Vector((sx * (L / 2 + over + 0.1), 0, H + th * 0.55))
            self.ball(th * 0.85, ridge or color, e.x, e.y, e.z, seg=12)

    # rundes Fenster (Bullauge) mit Kreuz, Vorderseite -Y
    def roundwin(self, x, y, z, r=0.3, frame='white', ry=0):
        R = Matrix.Rotation(ry, 4, 'Z')
        o = Vector((x, y, z))
        def at(dx, dy, dz): return o + R @ Vector((dx, dy, dz))
        c = at(0, -0.02, 0); self.cyl(r, r, 0.05, 'glass', c.x, c.y, c.z, seg=24, rx=PI / 2, rz=ry, glow=True)
        c = at(0, -0.05, 0); self.torus(r + 0.03, 0.06, frame, c.x, c.y, c.z, rx=PI / 2, rz=ry, seg=24)
        c = at(0, -0.06, 0); self.box(0.04, 0.03, 2 * r, frame, c.x, c.y, c.z, r=0.015, rz=ry); self.box(2 * r, 0.03, 0.04, frame, c.x, c.y, c.z, r=0.015, rz=ry)

    # Rundbogentür mit Rahmen, Klinke und Herzfenster; Vorderseite -Y
    def door(self, x, y, z, w=0.8, h=1.1, color='teal', frame='woodD', heart='yellow'):
        self.box(w, 0.12, h - w / 2, color, x, y - 0.03, z + (h - w / 2) / 2, r=0.04)
        self.cyl(w / 2, w / 2, 0.12, color, x, y - 0.03, z + h - w / 2, seg=24, rx=PI / 2)
        self.torus(w / 2 + 0.04, 0.06, frame, x, y - 0.07, z + h - w / 2, arc=PI, rx=PI / 2, seg=16)
        for sx in (-1, 1): self.box(0.12, 0.14, h - w / 2, frame, x + sx * (w / 2 + 0.04), y - 0.06, z + (h - w / 2) / 2, r=0.04)
        self.ball(0.055, 'yellow', x + w * 0.32, y - 0.13, z + h * 0.45, seg=10)
        if heart: self.heart(0.2, heart, x, y - 0.1, z + h - w / 2 + 0.05, glow=True)

    # Laterne an der Wand (leuchtet)
    def walllamp(self, x, y, z):
        self.box(0.06, 0.2, 0.06, 'dark', x, y - 0.08, z + 0.2, r=0.02)
        self.cyl(0.11, 0.08, 0.06, 'dark', x, y - 0.2, z + 0.16, seg=10)
        self.cyl(0.08, 0.08, 0.16, 'yellow', x, y - 0.2, z + 0.05, seg=10, glow=True)
        self.cone(0.12, 0.12, 'dark', x, y - 0.2, z + 0.19, seg=10)

    # Satteldach: zwei dicke, weich gerundete Platten, die sich am First treffen
    def roof(self, L, D, H, color, z=0, y=0, x=0, th=0.22, over=0.25, ridge=None, rz=0):
        a = math.atan2(H, D / 2); s = math.hypot(H, D / 2) + over
        for sy in (-1, 1):
            cy = sy * (D / 4 + over * 0.5 * math.cos(a)) * 1.0
            cz = H / 2 - over * 0.5 * math.sin(a) + th * 0.35
            M = Matrix.Translation((x, y, z)) @ Matrix.Rotation(rz, 4, 'Z')
            p = M @ Vector((0, cy, cz))
            self.box(L + 2 * over, s, th, color, p.x, p.y, p.z, r=th * 0.45, rx=-sy * a, rz=rz)
        rp = Matrix.Translation((x, y, z)) @ Matrix.Rotation(rz, 4, 'Z') @ Vector((0, 0, H + th * 0.5))
        self.cyl(th * 0.62, th * 0.62, L + 2 * over + 0.1, ridge or color, rp.x, rp.y, rp.z, seg=12, ry=PI / 2, rz=rz)

    # Fenster: Rahmen, Glas (leuchtet nachts), Sprosse; Vorderseite nach -Y bei y
    def window(self, x, y, z, w=0.6, h=0.7, frame='white', shut=None, box=None, rnd=False):
        f = 0.08
        self.box(w, 0.05, h, 'glass', x, y - 0.02, z, r=0.02, glow=True)
        self.box(w + 2 * f, 0.12, f, frame, x, y - 0.05, z + h / 2 + f / 2, r=0.03)
        self.box(w + 0.22, 0.2, 0.08, frame, x, y - 0.08, z - h / 2 - 0.04, r=0.035)
        for sx in (-1, 1): self.box(f, 0.12, h, frame, x + sx * (w / 2 + f / 2), y - 0.05, z, r=0.03)
        self.box(0.035, 0.03, h, frame, x, y - 0.07, z, r=0.01); self.box(w, 0.03, 0.035, frame, x, y - 0.07, z + h * 0.1, r=0.01)
        if shut:
            for sx in (-1, 1): self.box(0.24, 0.05, h + 0.06, shut, x + sx * (w / 2 + f + 0.13), y - 0.03, z, r=0.03)
        if box:
            self.box(w + 0.26, 0.24, 0.18, 'woodD', x, y - 0.16, z - h / 2 - 0.16, r=0.05)
            for i in range(5):
                xx = x - (w + 0.1) / 2 + i * (w + 0.1) / 4
                self.ball(0.09, 'leafD' if i % 2 else 'leaf', xx, y - 0.17, z - h / 2 - 0.04, sz=0.8, seg=10)
                self.ball(0.055, box[i % len(box)], xx + 0.03, y - 0.24, z - h / 2 + 0.03, seg=8)

    # Busch aus gebeulten Kugeln, optional mit Blüten
    def bush(self, x, y, z=0, s=1.0, flowers=None, color='leaf'):
        for i, (dx, dy, dz, r) in enumerate([(0, 0, 0.3, 0.36), (0.28, 0.05, 0.22, 0.27), (-0.27, -0.03, 0.22, 0.28), (0.05, -0.18, 0.18, 0.24)]):
            self.ball(r * s, color if i % 2 == 0 else 'leafD', x + dx * s, y + dy * s, z + dz * s, sz=0.85, seg=14, bump=0.08)
        if flowers:
            for i in range(6):
                a = i * 2.4
                self.ball(0.06 * s, flowers[i % len(flowers)], x + math.cos(a) * 0.3 * s, y - 0.2 * s + math.sin(a) * 0.08 * s, z + (0.42 + 0.08 * math.sin(a * 3)) * s, seg=8)

    def build(self, coll='Kuschel', parent=None):
        objs = []
        for bm, suffix, mat in ((self.bm, '', 'K_Base'), (self.gm, '__glow', 'K_Glow')):
            if not bm.faces: continue
            me = bpy.data.meshes.new(self.name + suffix)
            bm.to_mesh(me)
            try:
                me.color_attributes.active_color_name = 'Col'; me.color_attributes.render_color_index = me.color_attributes.active_color_index
            except Exception: pass
            for p in me.polygons: p.use_smooth = True
            try: me.set_sharp_from_angle(angle=math.radians(48))
            except Exception: pass
            ob = bpy.data.objects.new(self.name + suffix, me)
            me.materials.append(material(mat))
            collection(coll).objects.link(ob)
            objs.append(ob)
        if not objs:  # leeres Teil (nur Drehpunkt)
            ob = bpy.data.objects.new(self.name, None); collection(coll).objects.link(ob); objs.append(ob)
        root = objs[0]
        if len(objs) == 2: objs[1].parent = root
        if parent is not None:
            root.parent = parent; root.location = self.pivot - parent_pivot(parent)
        for p in self.parts:
            # Teil-Geometrie auf den Drehpunkt beziehen
            for bm in (p.bm, p.gm): bmesh.ops.translate(bm, verts=bm.verts[:], vec=-p.pivot)
            ob = p.build(coll, root)
            ob['pivot'] = list(p.pivot)
            if p.anim: animate(ob, *p.anim)
        root['pivot'] = list(self.pivot)
        self.bm.free(); self.gm.free()
        return root

def parent_pivot(ob):
    return Vector(ob.get('pivot', (0, 0, 0))) if ob.parent else Vector((0, 0, 0))

# Animationen (Keyframes, laufen im Spiel in Schleife):
#   ('spin', achse, sekunden)            gleichmäßig drehen
#   ('sway', achse, winkel, sekunden)    hin und her schwingen
#   ('bob', höhe, sekunden)              auf und ab wippen
#   ('squish', stärke, sekunden)         weich zusammendrücken und strecken
FPS = 24
def animate(ob, kind, *a):
    sc = bpy.context.scene; sc.render.fps = FPS
    ob.rotation_mode = 'XYZ'
    ax = {'x': 0, 'y': 1, 'z': 2}
    keys = []
    if kind == 'spin':
        i = ax[a[0]]; n = int(a[1] * FPS)
        for f, v in ((0, 0.0), (n, 2 * PI * (a[2] if len(a) > 2 else 1))):
            ob.rotation_euler[i] = v; ob.keyframe_insert('rotation_euler', index=i, frame=f)
    elif kind == 'sway':
        i = ax[a[0]]; n = int(a[2] * FPS)
        for f, v in ((0, -a[1]), (n // 2, a[1]), (n, -a[1])):
            ob.rotation_euler[i] = v; ob.keyframe_insert('rotation_euler', index=i, frame=f)
    elif kind == 'bob':
        n = int(a[1] * FPS); z0 = ob.location.z
        for f, v in ((0, z0), (n // 2, z0 + a[0]), (n, z0)):
            ob.location.z = v; ob.keyframe_insert('location', index=2, frame=f)
    elif kind == 'squish':
        n = int(a[1] * FPS)
        for f, s in ((0, 1.0), (n // 2, 1 + a[0]), (n, 1.0)):
            ob.scale = (1 - (s - 1) * 0.5, 1 - (s - 1) * 0.5, s)
            ob.keyframe_insert('scale', frame=f)
    ad = ob.animation_data
    if ad and ad.action:
        ad.action.name = ob.name + '_loop'
        try:
            for fc in ad.action.fcurves:
                for kp in fc.keyframe_points: kp.interpolation = 'LINEAR' if kind == 'spin' else 'BEZIER'
        except Exception:
            pass

def collection(name):
    c = bpy.data.collections.get(name)
    if not c:
        c = bpy.data.collections.new(name); bpy.context.scene.collection.children.link(c)
    return c

def material(name):
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; bsdf = nt.nodes.get('Principled BSDF')
    attr = nt.nodes.new('ShaderNodeVertexColor'); attr.layer_name = 'Col'
    if name == 'K_Glow':
        nt.nodes.remove(bsdf)
        em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 2.5
        nt.links.new(attr.outputs['Color'], em.inputs['Color'])
        nt.links.new(em.outputs[0], nt.nodes['Material Output'].inputs['Surface'])
    else:
        nt.links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
        bsdf.inputs['Roughness'].default_value = 0.72
        for k in ('Specular IOR Level', 'Specular'):
            if k in bsdf.inputs: bsdf.inputs[k].default_value = 0.25
    return m

def clear(coll='Kuschel'):
    c = bpy.data.collections.get(coll)
    if c:
        for o in list(c.objects): bpy.data.objects.remove(o, do_unlink=True)
    for me in list(bpy.data.meshes):
        if me.users == 0: bpy.data.meshes.remove(me)

def log(obj):
    open(os.path.join(OUT, 'log.json'), 'w').write(json.dumps(obj, default=str))

# ---------- Vorschau-Bühne: Wiese, Licht, Kamera wie im Spiel ----------
def stage(target=(0, 0, 0.8), dist=16, el=40, az=0, lens=36, res=(1600, 900), ortho=None):
    sc = bpy.context.scene
    for n in ('Cube', 'Light', 'Camera'):
        o = bpy.data.objects.get(n)
        if o: bpy.data.objects.remove(o, do_unlink=True)
    g = bpy.data.objects.get('K_Ground')
    if not g:
        m = Model('K_Ground'); m.ball(40, 'grass', 0, 0, -0.02, sz=0.0005, seg=48); g = m.build('KStage')
        w = Model('K_Path'); w.box(30, 2.2, 0.02, 0xE9D3A6, 0, -2.2, 0.005, r=0.005); w.build('KStage')
    cam = bpy.data.objects.get('K_Cam')
    if not cam:
        cam = bpy.data.objects.new('K_Cam', bpy.data.cameras.new('K_Cam')); collection('KStage').objects.link(cam)
    sun = bpy.data.objects.get('K_Sun')
    if not sun:
        sun = bpy.data.objects.new('K_Sun', bpy.data.lights.new('K_Sun', 'SUN')); collection('KStage').objects.link(sun)
    sun.data.energy = 2.4; sun.data.angle = math.radians(10); sun.data.color = (1, 0.95, 0.88)
    sun.rotation_euler = (math.radians(50), math.radians(-12), math.radians(-35))
    t = Vector(target); a = math.radians(az); e = math.radians(el)
    cam.location = t + Vector((math.sin(a) * math.cos(e) * dist, -math.cos(a) * math.cos(e) * dist, math.sin(e) * dist))
    cam.rotation_euler = (t - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.lens = lens
    if ortho: cam.data.type = 'ORTHO'; cam.data.ortho_scale = ortho
    else: cam.data.type = 'PERSP'
    sc.camera = cam
    w = sc.world or bpy.data.worlds.new('World'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes.get('Background')
    if bg: bg.inputs['Color'].default_value = lin(0xBFE2FF); bg.inputs['Strength'].default_value = 0.6
    for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
        try: sc.render.engine = eng; break
        except Exception: pass
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.film_transparent = False
    try: sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'; sc.view_settings.exposure = -0.15
    except Exception: pass
    try: sc.eevee.taa_render_samples = 32
    except Exception: pass

def render(name):
    sc = bpy.context.scene
    sc.render.filepath = os.path.join(OUT, name + '.png')
    bpy.ops.render.render(write_still=True)
    return sc.render.filepath

def export(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
        for ch in o.children_recursive: ch.select_set(True)
    path = os.path.join(OUT, name + '.glb')
    kw = dict(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_normals=True, export_texcoords=False,
              export_animations=True, export_extras=True)
    draco = dict(export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7, export_draco_position_quantization=14,
                 export_draco_normal_quantization=8, export_draco_color_quantization=8)
    for extra in (dict(export_materials='NONE', export_vertex_color='ACTIVE', **draco), dict(export_materials='NONE', export_vertex_color='ACTIVE'),
                  dict(export_materials='NONE', export_colors=True), dict()):
        try:
            bpy.ops.export_scene.gltf(**kw, **extra); break
        except TypeError: continue
    return path

# Kontaktbogen: Modelle im Raster nebeneinander (nur für Vorschau-Renderings)
def arrange(objs, cols=4, gap=6.5):
    olds = []
    for i, o in enumerate(objs):
        olds.append(o.location.copy())
        o.location = ((i % cols - (cols - 1) / 2) * gap, -(i // cols) * gap * 0.9, 0)
    return olds

print('Kuschel-Kit geladen')
log({'kit': 'ok', 'version': bpy.app.version_string})
