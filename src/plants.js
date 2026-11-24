// Pflanzen und Garten-Deko: rund, weich, gemütlich. Ersatz für crop()/placeable() aus models.js (gleiche Signatur).
// Ursprung = Kachelmitte auf dem Boden (Beet-Oberfläche bei Pflanzen), Vorderseite nach +z.
// Jedes Modell ist EIN Mesh mit Vertex-Farben (+ optional ein Leucht-Mesh) und wird pro (Art, Stufe) zwischengespeichert.
// Pflanzen bleiben schlank (≈ 150–900 Dreiecke), weil bis zu ~250 gleichzeitig zu sehen sind.
import * as THREE from '../vendor/three.module.min.js';
import { MAT, GLOW, merge, box, cyl, cone } from './models.js';

const PI = Math.PI, H = PI / 2, TAU = PI * 2;
let seed = 1;
const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
const shade = (c, l) => new THREE.Color(c).offsetHSL(0, 0, l);

// ---------- Bauteile ----------
function put(g, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return { g, c };
}
// ohne "parameters" behält merge() unsere glatten Normalen, auch bei wenigen Segmenten
const plain = g => new THREE.BufferGeometry().copy(g);
function bend(g, fn) {
  const a = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < a.count; i++) { fn(v.fromBufferAttribute(a, i)); a.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals();
  return g;
}
// glatte Kugel / Ellipsoid
const B = (r, c, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, w = 8, h = 6, rx = 0, ry = 0, rz = 0) =>
  put(plain(new THREE.SphereGeometry(r, w, h).scale(sx, sy, sz)), c, x, y, z, rx, ry, rz);
// Halbkugel (Kuppel), flache Seite unten
const dome = (r, c, x, y, z, sx = 1, sy = 1, sz = 1, w = 12, h = 5) =>
  put(plain(new THREE.SphereGeometry(r, w, h, 0, TAU, 0, H).scale(sx, sy, sz)), c, x, y, z);
const C = (rt, rb, h, c, x = 0, y = 0, z = 0, seg = 8, open = false, rx = 0, ry = 0, rz = 0) =>
  put(plain(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open)), c, x, y, z, rx, ry, rz);
const ring = (R, t, c, x, y, z, rx = H, arc = TAU, ts = 16, rs = 5, ry = 0, rz = 0) =>
  put(plain(new THREE.TorusGeometry(R, t, rs, ts, arc)), c, x, y, z, rx, ry, rz);
// weicher Klotz: Kugel zum Würfel gedrückt (e: 1 = Kugel, 0.2 = fast eckig), wie in furniture.js
function soft(w, h, d, c, x = 0, y = 0, z = 0, e = 0.3, ry = 0, rx = 0, rz = 0, seg = 12) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 2 / 3)), a = g.attributes.position.array;
  for (let i = 0; i < a.length; i++) a[i] = Math.sign(a[i]) * Math.abs(a[i]) ** e;
  g.scale(w / 2, h / 2, d / 2);
  return put(g, c, x, y, z, rx, ry, rz);
}
const UP = new THREE.Vector3(0, 1, 0);
// Geometrie (entlang +y gebaut) in Richtung d drehen und nach p schieben
function aim(g, p, d) {
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, new THREE.Vector3(...d).normalize()));
  g.translate(p[0], p[1], p[2]);
  return g;
}
// Stab von a nach b (rb unten, rt oben)
function stick(a, b, r, c, seg = 5, rt = r) {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d);
  const g = plain(new THREE.CylinderGeometry(rt, r, L, seg, 1, true)).translate(0, L / 2, 0);
  return { g: aim(g, a, d), c };
}
// gebogener Stängel / Ranke durch Punkte
const tube = (pts, r, c, seg = 8, rs = 4) =>
  ({ g: plain(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), seg, r, rs)), c });
// Blatt: wächst von (x,y,z) aus in Richtung yaw (0 = +z), pitch hebt die Spitze, droop lässt sie hängen, cup wölbt die Ränder
function leaf(len, wid, c, x, y, z, yaw = 0, pitch = 0, droop = 0.2, cup = 0.2, w = 4, h = 7) {
  const g = bend(plain(new THREE.SphereGeometry(1, w, h)), v => {
    const t = (v.y + 1) / 2, X = v.x;
    v.set(X * wid / 2 * (1.2 - 0.45 * t), v.z * wid * 0.07 + cup * wid * 0.5 * X * X - droop * len * t * t, t * len);
  });
  g.rotateX(-pitch);
  g.rotateY(yaw);
  g.translate(x, y, z);
  g.computeVertexNormals();
  return { g, c };
}
// Blüte als gewellte Scheibe mit n runden Blütenblättern
function bloom(r, c, x, y, z, n = 5, cup = 0.3, h = 0.014, rx = 0, ry = 0) {
  const g = bend(plain(new THREE.CylinderGeometry(1, 1, 1, n * 3)), v => {
    const R = Math.hypot(v.x, v.z), a = Math.atan2(v.z, v.x), k = r * (0.62 + 0.38 * Math.abs(Math.cos(a * n / 2)));
    if (R > 1e-4) { v.x *= k; v.z *= k; }
    v.y = v.y * h + cup * r * (R * k / r) ** 2;
  });
  return put(g, c, x, y, z, rx, ry);
}
// Herz aus zwei schrägen Ellipsoiden (schaut nach +z)
const heart = (s, c, x, y, z, d = 0.45) => [-1, 1].map(k => B(s * 0.5, c, x + k * s * 0.2, y, z, 0.62, 1, d, 10, 8, 0, 0, -k * 0.72));
// Punkt auf einer Kugeloberfläche (Richtung a = Azimut, e = Höhe)
const onBall = (cx, cy, cz, r, a, e, sy = 1) => [cx + Math.sin(a) * Math.cos(e) * r, cy + Math.sin(e) * r * sy, cz + Math.cos(a) * Math.cos(e) * r];

// ---------- Farben ----------
const LEAF = 0x6cc04a, LEAFD = 0x4a9e3c, LEAFL = 0x9fd86a, STEM = 0x7cb850, SOILD = 0x7a5232, WHITE = 0xfffaf2,
  WOOD = 0xd9a86c, WOODL = 0xeac894, WOODD = 0xa87449, BARK = 0x8a5a3a, DARK = 0x3b3340, BRASS = 0xe0b862,
  ROSE = 0xff8fab, PINK = 0xffb7c8, BUTTER = 0xffe39a, MINT = 0xa8e2cf, SKY = 0xaed6f5, LILA = 0xcdb8f5, YEL = 0xffd23f,
  STONE = 0xd4cdc3, WATER = 0x7fd0f2, RED = 0xff4d4d;

// ---------- Pflanzen ----------
const GRASSY = ['weizen', 'mais'];
function sprout(k) {
  const p = [B(0.075, SOILD, 0, 0, 0, 1, 0.32, 1, 7, 4)];
  if (GRASSY.includes(k)) for (let i = 0; i < 3; i++) p.push(leaf(0.19, 0.035, i % 2 ? LEAFL : LEAF, 0, 0.01, 0, i * 2.1 + 0.3, 1.15, 0.35, 0.2, 4, 5));
  else p.push(stick([0, 0, 0], [0, 0.08, 0], 0.012, STEM, 4), leaf(0.1, 0.075, LEAFL, 0.005, 0.075, 0, H, 0.4, 0.15, 0.45, 4, 6),
    leaf(0.1, 0.075, LEAFL, -0.005, 0.075, 0, -H, 0.4, 0.15, 0.45, 4, 6), B(0.016, LEAF, 0, 0.09, 0, 1, 1, 1, 5, 4));
  return p;
}
// Punkte auf einer Scheibe (Sonnenblumen-Spirale)
const disc = (n, R, off = 0) => Array.from({ length: n }, (_, i) => { const r = R * Math.sqrt((i + 0.5) / n), a = i * 2.39996 + off; return [Math.cos(a) * r, Math.sin(a) * r, a]; });
// Ranke mit Blättern über den Boden (Melone, Kürbis)
function vine(n, L, leafLen, col = [LEAF, LEAFD]) {
  const p = [];
  for (let i = 0; i < n; i++) {
    const a = i * TAU / n + 0.4, ex = Math.sin(a) * L, ez = Math.cos(a) * L;
    p.push(tube([[0, 0.02, 0], [ex * 0.5, 0.05, ez * 0.5 + 0.02], [ex, 0.03, ez]], 0.014, STEM, 5, 4));
    p.push(leaf(leafLen, leafLen * 1.05, col[i % 2], ex * 0.55, 0.05, ez * 0.55, a + 0.6, 0.35, 0.25, 0.3));
  }
  return p;
}
// Ranken-Löckchen
const curl = (x, y, z, r, c = STEM) => tube(Array.from({ length: 9 }, (_, i) => { const a = i * 0.9; return [x + Math.cos(a) * r * (1 - i / 12), y + i * 0.012, z + Math.sin(a) * r * (1 - i / 12)]; }), 0.006, c, 12, 3);

const CROP = {
  weizen(st) {
    const p = [], ripe = st === 3, n = [0, 7, 10, 11][st];
    if (st === 1) { for (let i = 0; i < n; i++) p.push(leaf(0.26 + (i % 3) * 0.04, 0.045, i % 2 ? LEAFL : LEAF, 0, 0, 0, i * 2.4, 1.15, 0.4, 0.2, 4, 5)); return p; }
    const h = st === 2 ? 0.5 : 0.62, sc = ripe ? 0xe6bc55 : 0x8cc858, ec = ripe ? 0xf5cf63 : 0xa6d867;
    for (const [x, z] of disc(n, 0.26)) {
      const hh = h * (0.85 + rnd() * 0.25), tip = [x * 1.25, hh, z * 1.25];
      p.push(stick([x * 0.6, 0, z * 0.6], tip, 0.012, sc, 4, 0.009));
      const d = [x * (ripe ? 2.8 : 1.5), 1, z * (ripe ? 2.8 : 1.5)], g = new THREE.SphereGeometry(0.03, 5, 6).scale(1, 3, 0.9).translate(0, 0.085, 0);
      p.push({ g: aim(g, tip, d), c: ec });
      if (ripe) p.push({ g: aim(new THREE.CylinderGeometry(0.003, 0.006, 0.09, 3, 1, true).translate(0, 0.21, 0), tip, d), c: 0xf7e09a });
    }
    for (let i = 0; i < 4; i++) p.push(leaf(0.26, 0.04, ripe ? 0xbfc860 : LEAF, 0, 0, 0, i * 1.57 + 0.5, 1.05, 0.4, 0.2, 4, 5));
    return p;
  },
  karotte(st) {
    const p = [], n = [0, 3, 5, 6][st], h = [0, 0.13, 0.24, 0.28][st];
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n + 0.3, tip = [Math.sin(a) * h * 0.5, h, Math.cos(a) * h * 0.5];
      p.push(stick([0, 0, 0], tip, 0.01, STEM, 4));
      p.push(leaf(h * 0.55, h * 0.36, i % 2 ? LEAF : 0x5cb246, tip[0], tip[1] - 0.02, tip[2], a, 0.7, 0.3, 0.35, 4, 6),
        leaf(h * 0.4, h * 0.26, LEAFL, tip[0] * 0.65, tip[1] * 0.62, tip[2] * 0.65, a + 0.9, 0.5, 0.3, 0.35, 4, 5));
    }
    if (st === 3) p.push(B(0.1, 0xff8a2a, 0, 0.0, 0, 1, 0.8, 1, 10, 7), B(0.08, 0xffa64d, 0, 0.045, 0, 1, 0.45, 1, 10, 5), B(0.065, 0xff8a2a, 0.13, -0.005, 0.07, 1, 0.8, 1, 8, 6));
    else if (st === 2) p.push(B(0.05, 0xff9a3a, 0, -0.01, 0, 1, 0.7, 1, 8, 5));
    return p;
  },
  salatkopf(st) {
    const p = [], s = [0, 0.5, 0.78, 1][st], n = [0, 5, 6, 7][st];
    for (let i = 0; i < n; i++) p.push(leaf(0.27 * s, 0.24 * s, i % 2 ? 0x5fb646 : 0x74c450, 0, 0.01, 0, i * TAU / n, 0.45, 0.3, 0.45));
    p.push(B(0.15 * s, 0xbfe88a, 0, 0.1 * s, 0, 1, 0.85, 1, 10, 7));
    const m = [0, 2, 4, 5][st];
    for (let i = 0; i < m; i++) p.push(leaf(0.2 * s, 0.19 * s, i % 2 ? 0x9fd86a : 0xaee27a, Math.sin(i * TAU / m) * 0.08 * s, 0.02, Math.cos(i * TAU / m) * 0.08 * s, i * TAU / m + 0.5, 1.2, 0.05, 0.6));
    return p;
  },
  kartoffel(st) {
    const p = [], s = [0, 0.55, 0.85, 1][st];
    const blobs = [[0, 0.2, 0, 0.15, LEAF], [0.12, 0.15, 0.06, 0.11, LEAFD], [-0.11, 0.16, -0.05, 0.12, 0x5cb246], [0.02, 0.15, -0.13, 0.1, LEAFD], [-0.05, 0.27, 0.05, 0.1, LEAFL]];
    for (const [x, y, z, r, c] of blobs.slice(0, st === 1 ? 3 : 5)) p.push(B(r * s, c, x * s, y * s, z * s, 1, 0.85, 1, 7, 5));
    for (let i = 0; i < 4; i++) p.push(leaf(0.16 * s, 0.11 * s, i % 2 ? LEAF : LEAFD, 0, 0.04 * s, 0, i * H + 0.7, 0.35, 0.3, 0.3, 4, 5));
    if (st === 3) {
      for (const [x, z, c] of [[0.05, 0.08, WHITE], [-0.1, -0.02, 0xd9b8f5], [0.08, -0.09, WHITE]]) p.push(bloom(0.045, c, x, 0.36, z, 5, 0.25), B(0.015, YEL, x, 0.37, z, 1, 1, 1, 5, 3));
      for (const [x, z, r, a] of [[0.16, 0.19, 0.08, 0.3], [-0.02, 0.25, 0.065, -0.4]]) p.push(B(r, 0xd4a064, x, 0.045, z, 1.3, 0.9, 1, 10, 7, 0, a));
    }
    return p;
  },
  erdbeere(st) {
    const p = [], s = [0, 0.6, 0.85, 1][st], n = [0, 3, 5, 5][st];
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n, d = 0.1 * s, x = Math.sin(a) * d, z = Math.cos(a) * d, y = 0.1 * s;
      p.push(stick([0, 0, 0], [x, y, z], 0.008, STEM, 4));
      for (let j = -1; j <= 1; j++) p.push(leaf(0.1 * s, 0.085 * s, j ? LEAF : 0x5cb246, x, y, z, a + j * 0.75, 0.15, 0.25, 0.35, 4, 4));
    }
    if (st === 2) for (const [x, z] of [[0.12, 0.05], [-0.08, 0.1], [0.0, -0.14]]) p.push(bloom(0.04, WHITE, x, 0.13, z, 5, 0.2), B(0.014, YEL, x, 0.14, z, 1, 1, 1, 5, 3));
    if (st === 3) {
      p.push(bloom(0.04, WHITE, -0.05, 0.14, -0.08, 5, 0.2), B(0.014, YEL, -0.05, 0.15, -0.08, 1, 1, 1, 5, 3));
      for (const [a, r] of [[0.3, 0.2], [1.9, 0.19], [3.4, 0.21], [4.8, 0.18]]) {
        const x = Math.sin(a) * r, z = Math.cos(a) * r, g = bend(plain(new THREE.SphereGeometry(0.06, 7, 5)), v => { const k = 1 - 0.45 * Math.max(0, -v.y / 0.06); v.x *= k; v.z *= k; v.y *= 1.25; });
        p.push({ g: aim(g, [x, 0.06, z], [-Math.sin(a), 0.5, -Math.cos(a)]), c: 0xff3d5a });
        p.push({ g: aim(plain(new THREE.ConeGeometry(0.045, 0.03, 5)), [x - Math.sin(a) * 0.06, 0.09, z - Math.cos(a) * 0.06], [-Math.sin(a), 0.6, -Math.cos(a)]), c: LEAFD });
      }
    }
    return p;
  },
  brokkoli(st) {
    const p = [], s = [0, 0.55, 0.85, 1][st], n = [0, 4, 6, 6][st];
    for (let i = 0; i < n; i++) p.push(leaf(0.3 * s, 0.16 * s, i % 2 ? 0x5e9e78 : 0x6fb088, 0, 0.02, 0, i * TAU / n + 0.3, 0.85, 0.45, 0.35));
    if (st >= 2) {
      const r = st === 3 ? 1 : 0.55, y = 0.22 * s;
      p.push(C(0.035, 0.05, y, 0xa8d48a, 0, y / 2, 0, 6, true));
      const c = st === 3 ? [0x3f8a3a, 0x4f9e45, 0x3c8238] : [0x8cc86a, 0x9bd27a, 0x84c062];
      p.push(B(0.085 * r, c[0], 0, y + 0.03 * r, 0, 1, 0.8, 1, 8, 6));
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6; p.push(B(0.065 * r, c[1 + i % 2], Math.sin(a) * 0.08 * r, y + 0.01, Math.cos(a) * 0.08 * r, 1, 0.85, 1, 7, 5)); }
    }
    return p;
  },
  tomate(st) {
    const p = [], h = [0, 0.3, 0.62, 0.78][st], n = [0, 5, 9, 9][st];
    if (st > 1) p.push(C(0.016, 0.02, h + 0.12, WOODD, 0.06, (h + 0.12) / 2, -0.04, 5), B(0.02, WOODD, 0.06, h + 0.12, -0.04, 1, 1, 1, 5, 3));
    p.push(tube([[0, 0, 0], [0.03, h * 0.35, 0.02], [-0.01, h * 0.7, -0.01], [0.03, h, 0]], 0.016, STEM, 6, 4));
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / (n + 1), y = h * t, a = i * 2.4;
      p.push(leaf(0.22 * (1.1 - t * 0.4), 0.15 * (1.1 - t * 0.4), i % 2 ? LEAF : LEAFD, 0.02, y, 0, a, 0.45, 0.35, 0.35));
    }
    if (st === 2) for (const [x, y, z] of [[0.1, 0.4, 0.06], [-0.08, 0.5, 0.08]]) p.push(bloom(0.03, YEL, x, y, z, 5, 0.3), B(0.035, 0x9bd66a, x - 0.02, y - 0.07, z + 0.02, 1, 1, 1, 7, 5));
    if (st === 3) {
      for (const [x, y, z, r] of [[0.11, 0.42, 0.08, 0.07], [0.04, 0.35, 0.14, 0.06], [0.15, 0.32, 0.0, 0.055], [-0.1, 0.6, 0.06, 0.065], [-0.13, 0.5, -0.04, 0.055]])
        p.push(B(r, 0xff4632, x, y, z, 1, 0.9, 1, 7, 5), { g: plain(new THREE.ConeGeometry(r * 0.6, r * 0.3, 5)).translate(x, y + r * 0.95, z), c: LEAFD });
    }
    return p;
  },
  melone(st) {
    if (st < 3) {
      const p = vine(st === 1 ? 3 : 5, st === 1 ? 0.2 : 0.34, st === 1 ? 0.15 : 0.2);
      if (st === 2) p.push(B(0.08, 0x6fbf55, 0.05, 0.07, 0.08, 1.2, 0.9, 1, 8, 6), bloom(0.035, YEL, -0.12, 0.1, -0.05, 5, 0.4), curl(0.15, 0.04, -0.15, 0.04));
      return p;
    }
    const p = vine(4, 0.38, 0.2), g = [], n = 10;
    for (let i = 0; i < n; i++) {
      const w = TAU / n * (i % 2 ? 0.7 : 1.3), a0 = Math.floor(i / 2) * TAU / (n / 2) + (i % 2 ? TAU / n * 1.3 : 0);
      const s = plain(new THREE.SphereGeometry(0.2, 3, 7, a0, w)).rotateZ(H).scale(1.35, 0.95, 1).translate(0, 0.18, 0);
      g.push({ g: s, c: i % 2 ? 0x8fd06a : 0x3a8f3c });
    }
    return [...p, ...g, stick([0.26, 0.2, 0], [0.31, 0.25, 0.02], 0.014, 0x7a9a3a, 4), curl(0.3, 0.06, -0.2, 0.04)];
  },
  mais(st) {
    const p = [], h = [0, 0.32, 0.95, 1.25][st];
    if (st === 1) { for (let i = 0; i < 4; i++) p.push(leaf(0.34, 0.06, i % 2 ? LEAFL : LEAF, 0, 0.02, 0, i * 1.6, 1.0, 0.45, 0.25, 4, 5)); return p; }
    p.push(C(0.024, 0.038, h, 0x88c258, 0, h / 2, 0, 6, true));
    const n = st === 2 ? 6 : 7;
    for (let i = 0; i < n; i++) p.push(leaf(0.5 - i * 0.03, 0.075, i % 2 ? LEAF : 0x5cb246, 0, 0.08 + i * h * 0.12, 0, i * 2.5, 0.75, 0.55, 0.25, 4, 5));
    const tc = st === 3 ? 0xe8cc7a : 0xb8d880;
    for (let i = 0; i < 5; i++) p.push(stick([0, h - 0.02, 0], [Math.sin(i * 1.26) * 0.09, h + 0.13, Math.cos(i * 1.26) * 0.09], 0.008, tc, 3));
    const cobs = st === 3 ? [[0.55, 0.3], [0.75, 2.6]] : [[0.5, 0.3]];
    for (const [y, a] of cobs) {
      const d = [Math.sin(a) * 0.55, 1, Math.cos(a) * 0.55], o = [Math.sin(a) * 0.04, y, Math.cos(a) * 0.04];
      if (st === 3) {
        p.push({ g: aim(plain(new THREE.SphereGeometry(0.05, 8, 6)).scale(1, 2.4, 1).translate(0, 0.11, 0), o, d), c: 0xffd23f });
        for (const k of [-1, 1]) p.push({ g: aim(leaf(0.17, 0.07, 0xc9e08a, 0, 0, 0, k * 0.5 * PI + PI, 1.25, 0.1, 0.5, 4, 5).g, o, d), c: 0xc9e08a });
        p.push({ g: aim(plain(new THREE.ConeGeometry(0.025, 0.06, 4)).translate(0, 0.24, 0), o, d), c: 0xc98a4a });
      } else p.push({ g: aim(plain(new THREE.SphereGeometry(0.035, 6, 5)).scale(1, 2.4, 1).translate(0, 0.08, 0), o, d), c: 0xb8dc80 });
    }
    return p;
  },
  traube(st) {
    const p = [], P = 0.32, T = 0.82;
    for (const x of [-P, P]) p.push(box(0.06, T, 0.06, WOODD, x, T / 2, 0), B(0.035, WOODD, x, T + 0.005, 0, 1, 0.6, 1, 6, 3));
    p.push(C(0.012, 0.012, 2 * P, WOOD, 0, T - 0.07, 0, 5, true, 0, 0, H), C(0.01, 0.01, 2 * P, WOOD, 0, T * 0.5, 0, 5, true, 0, 0, H));
    const h = [0, 0.35, T - 0.07, T - 0.07][st];
    p.push(tube([[0, 0, 0], [0.04, h * 0.4, 0.03], [-0.03, h * 0.75, 0.0], [0, h, 0.01]], 0.018, BARK, 6, 4));
    if (st >= 2) p.push(tube([[-P + 0.03, h, 0.02], [-0.15, h + 0.03, 0.02], [0, h, 0.01], [0.15, h + 0.03, 0.02], [P - 0.03, h, 0.02]], 0.013, BARK, 6, 4));
    const L = st === 1 ? [[0.02, 0.2, 0.4], [-0.02, 0.3, -2.6], [0.03, 0.36, 1.6]] :
      [[-0.26, h, 0.3], [-0.13, h + 0.04, -2.8], [0, h + 0.02, 0.1], [0.14, h + 0.04, 2.9], [0.27, h, -0.3], [0.02, h * 0.55, 0.6]];
    L.forEach(([x, y, a], i) => p.push(leaf(0.17, 0.18, i % 2 ? LEAF : LEAFD, x, y, 0.02, a, 0.5, 0.3, 0.25)));
    if (st >= 2) {
      const col = st === 3 ? [0x7b4bb5, 0x9562cf] : [0xb8dc80, 0xa6d070], r = st === 3 ? 0.034 : 0.022;
      for (const [bx, bz] of [[-0.14, 0.05], [0.15, 0.04]]) {
        let i = 0;
        for (const [row, cnt] of [[0, 3], [1, 2], [2, 1], [3, 1]]) for (let j = 0; j < cnt; j++) {
          if (st === 2 && row > 1) continue;
          p.push(B(r, col[(i++) % 2], bx + (j - (cnt - 1) / 2) * r * 1.8, h - 0.06 - row * r * 1.6, bz + (row % 2) * 0.012, 1, 1, 1, 5, 4));
        }
      }
    }
    return p;
  },
  sonnenblume(st) {
    const p = [], h = [0, 0.32, 0.92, 1.22][st];
    p.push(tube([[0, 0, 0], [0.02, h * 0.5, 0], [0, h, st === 3 ? 0.04 : 0]], 0.022, STEM, 5, 5));
    const n = st === 1 ? 4 : 6;
    for (let i = 0; i < n; i++) {
      const y = st === 1 ? 0.12 + (i >> 1) * 0.12 : 0.15 + i * h * 0.11;
      p.push(leaf(st === 1 ? 0.14 : 0.2, st === 1 ? 0.13 : 0.18, i % 2 ? LEAF : LEAFD, 0, y, 0, i * PI + (i >> 1) * 1.2, 0.35, 0.4, 0.25));
    }
    if (st === 2) {
      p.push(B(0.07, 0x5cb246, 0, h + 0.03, 0, 1, 0.8, 1, 8, 6));
      for (let i = 0; i < 6; i++) p.push(leaf(0.07, 0.04, LEAFD, 0, h + 0.03, 0, i * 1.05, 1.0, -0.1, 0.3, 4, 5));
      p.push(B(0.035, 0xf5d86a, 0, h + 0.085, 0, 1, 0.6, 1, 6, 4));
    }
    if (st === 3) {
      const tilt = 0.6, y = h + 0.02, z = 0.06;
      const parts = [C(0.13, 0.15, 0.05, 0x5cb246, 0, -0.03, 0, 14), C(0.115, 0.115, 0.03, 0x7a4a24, 0, 0.0, 0, 14), B(0.085, 0x5a3418, 0, 0.012, 0, 1, 0.25, 1, 10, 5)];
      for (let i = 0; i < 14; i++) { const a = i * TAU / 14; parts.push(leaf(0.12, 0.065, i % 2 ? 0xffc21f : 0xffd84a, Math.sin(a) * 0.1, 0, Math.cos(a) * 0.1, a, i % 2 ? 0.12 : 0.05, 0.06, 0.15, 4, 4)); }
      for (const q of parts) { q.g.rotateX(H - tilt).translate(0, y, z); p.push(q); }
    }
    return p;
  },
  kuerbis(st) {
    if (st < 3) {
      const p = vine(st === 1 ? 3 : 5, st === 1 ? 0.2 : 0.34, st === 1 ? 0.16 : 0.21, [0x5cae46, LEAFD]);
      if (st === 2) p.push(B(0.08, 0x9bd66a, 0.04, 0.06, 0.1, 1.15, 0.75, 1.15, 8, 6), bloom(0.045, 0xffb733, -0.12, 0.1, -0.05, 5, 0.6), curl(0.15, 0.04, -0.15, 0.04));
      return p;
    }
    const p = vine(3, 0.38, 0.21, [0x5cae46, LEAFD]);
    const g = bend(plain(new THREE.SphereGeometry(1, 32, 8)), v => {
      const a = Math.atan2(v.z, v.x), rib = 0.86 + 0.14 * Math.abs(Math.sin(a * 4)) ** 0.6, rho = Math.hypot(v.x, v.z);
      v.x *= rib; v.z *= rib;
      v.y = v.y * 0.72 - Math.sign(v.y) * 0.22 * (1 - rho) ** 2;
    }).scale(0.27, 0.27, 0.27).translate(0, 0.19, 0);
    p.push({ g, c: 0xff8c1a }, tube([[0, 0.3, 0], [0.01, 0.36, 0], [0.05, 0.4, 0.02]], 0.022, 0x6b7a2a, 5, 5), curl(0.24, 0.05, -0.22, 0.04));
    return p;
  },
};


// ---------- Blumen (Tulpe, Kosmee, Stiefmütterchen, Rose, Hyazinthe) ----------
const FCOL = { tulpe: 0xff5d7a, kosmee: 0xffd23f, stiefmuetterchen: 0xb48cff, rose: 0xe8283c, hyazinthe: 0x8f7bff, lilie: 0xfff0f4, mohn: 0xff3b2f, kornblume: 0x4f7dff, lavendel: 0xa98bff, pfingstrose: 0xff9ac4, glockenblume: 0x6f8cff, orchidee: 0xf2a0ff };
function flowerPlant(k, st) {
  const c = FCOL[k], p = [];
  const n = st === 1 ? 4 : 6;
  for (let i = 0; i < n; i++) p.push(leaf(k === 'tulpe' || k === 'hyazinthe' ? 0.2 : 0.13, k === 'tulpe' || k === 'hyazinthe' ? 0.06 : 0.08, i % 2 ? LEAF : LEAFL, 0, 0.01, 0, i * TAU / n + 0.3, 1.0, 0.35, 0.35, 4, 6));
  if (st === 1) return p;
  const heads = [[0, 0.3, 0], [0.13, 0.24, 0.06], [-0.1, 0.22, -0.09]].slice(0, st === 2 ? 1 : 3);
  for (const [x, y, z] of heads) {
    p.push(stick([x * 0.3, 0, z * 0.3], [x, y, z], 0.012, STEM, 4));
    if (st === 2) { p.push(B(0.04, c, x, y + 0.03, z, 1, 1.4, 1, 6, 5), B(0.03, LEAF, x, y, z, 1.1, 0.8, 1.1, 6, 4)); continue; }
    if (k === 'tulpe') p.push(B(0.06, c, x, y + 0.05, z, 1, 1.3, 1, 8, 6), ...[0, 1, 2].map(j => leaf(0.09, 0.065, c, x, y + 0.01, z, j * 2.1, 1.25, -0.05, 0.45, 4, 5)));
    else if (k === 'rose') p.push(B(0.06, c, x, y + 0.04, z, 1, 0.85, 1, 9, 6), B(0.045, shade(c, 0.08), x, y + 0.07, z, 1, 0.8, 1, 8, 5), bloom(0.075, shade(c, -0.05), x, y + 0.02, z, 6, 0.55, 0.016));
    else if (k === 'hyazinthe') for (let j = 0; j < 9; j++) { const a = j * 2.4; p.push(B(0.03, j % 2 ? c : shade(c, 0.1), x + Math.cos(a) * 0.035, y + 0.02 + j * 0.018, z + Math.sin(a) * 0.035, 1, 1, 1, 6, 4)); }
    else p.push(bloom(k === 'kosmee' ? 0.09 : 0.075, c, x, y, z, k === 'kosmee' ? 8 : 5, k === 'kosmee' ? 0.15 : 0.25, 0.016, -0.35, x * 9), B(0.025, k === 'kosmee' ? 0xffa020 : 0xfff0a0, x, y + 0.012, z + 0.01, 1, 0.7, 1, 6, 4));
  }
  return p;
}
for (const k of Object.keys(FCOL)) CROP[k] = st => flowerPlant(k, st);

// ---------- Platzierbares ----------
const tree = (blobs) => blobs.map(([x, y, z, r, c, sy = 0.85]) => B(r, c, x, y, z, 1, sy, 1, 12, 9));
const trunk = () => [C(0.1, 0.15, 1.05, BARK, 0, 0.52, 0, 9), stick([0, 0.8, 0], [0.32, 1.2, 0.08], 0.06, BARK, 6, 0.04), stick([0, 0.85, 0], [-0.3, 1.25, -0.1], 0.06, BARK, 6, 0.04),
  B(0.16, BARK, 0, 0.04, 0, 1.1, 0.3, 1.1, 9, 4)];
const FLOWERS = [ROSE, 0xffe066, LILA, WHITE, 0xff9f6b, PINK];

const PLACE = {
  bienenstock: () => [box(0.7, 0.12, 0.7, 0x9a6b44, 0, 0.06, 0), ...[0, 1, 2, 3].map(i => box(0.62 - i * 0.02, 0.18, 0.62 - i * 0.02, i % 2 ? 0xffd23f : 0xf2b632, 0, 0.21 + i * 0.18, 0)), cone(0.5, 0.32, 0xc99260, 0, 1.02, 0, 4, 0, Math.PI / 4), box(0.16, 0.06, 0.04, 0x4a3a2a, 0, 0.3, 0.32), B(0.04, 0x2a2222, 0.3, 0.8, 0.3), B(0.04, 0xffd23f, 0.34, 0.82, 0.28)],
  beerenstrauch: ready => [B(0.45, 0x4f9f44, 0, 0.42, 0, 1.1, 0.9, 1), B(0.3, 0x5fb84a, 0.22, 0.6, 0.12, 1, 0.9, 1), ...(ready ? Array.from({ length: 10 }, (_, i) => B(0.065, 0x4a5aff, Math.cos(i * 2.4) * 0.42, 0.42 + Math.sin(i * 1.3) * 0.24, Math.sin(i * 2.4) * 0.34 + 0.12)) : [])],
  kristallfels: () => [[B(0.45, 0x8a8094, 0, 0.26, 0, 1.2, 0.7, 1), B(0.3, 0x9a90a4, 0.3, 0.2, 0.2), C(0.09, 0.09, 0.6, 0xc9a8ff, 0, 0.6, 0, 6), cone(0.09, 0.18, 0xd8c8ff, 0, 0.98, 0, 6), C(0.07, 0.07, 0.4, 0x8fd4ff, 0.22, 0.5, 0.05, 6, false, 0, 0, -0.4), C(0.07, 0.07, 0.38, 0xff9ad8, -0.22, 0.48, -0.02, 6, false, 0, 0, 0.45)], [B(0.08, 0, 0, 0.45, 0.12)]],
  pilzlaterne: () => [[C(0.1, 0.13, 0.7, 0xfff6ee, 0, 0.35, 0, 12), B(0.38, 0xff5a4a, 0, 0.78, 0, 1, 0.55, 1), ...Array.from({ length: 6 }, (_, i) => B(0.05, 0xffffff, Math.cos(i) * 0.3, 0.86, Math.sin(i) * 0.3))], [B(0.3, 0, 0, 0.66, 0, 1, 0.2, 1)]],
  weg() {
    seed = 3;
    const p = [];
    [[-0.22, -0.23, 0.21], [0.23, -0.2, 0.2], [-0.24, 0.21, 0.2], [0.21, 0.24, 0.21], [0.0, 0.0, 0.1]].forEach(([x, z, r], i) => {
      const k = rnd() * 0.25, g = bend(plain(new THREE.CylinderGeometry(1, 1, 1, 9)), v => {
        const a = Math.atan2(v.z, v.x), j = 1 + 0.12 * Math.sin(a * 3 + k * 20);
        v.x *= r * j * (v.y > 0 ? 0.9 : 1); v.z *= r * j * (v.y > 0 ? 0.9 : 1); v.y = v.y > 0 ? 0.04 + i * 0.004 : 0; // verschiedene Höhen: kein Z-Flimmern
      });
      p.push(put(g, shade(STONE, -0.02 - rnd() * 0.1), x, 0, z, 0, rnd() * 3));
    });
    p.push(B(0.03, LEAF, 0.0, 0, 0.42, 1.3, 0.5, 1, 6, 3), B(0.025, LEAFL, -0.43, 0, 0.0, 1, 0.5, 1.3, 6, 3), B(0.03, LEAF, 0.4, 0, 0.0, 1, 0.5, 1.3, 6, 3));
    return p;
  },
  blumen() {
    seed = 5;
    const p = [soft(0.92, 0.16, 0.92, WOODD, 0, 0.07, 0, 0.25), soft(0.8, 0.1, 0.8, 0x6e4a2e, 0, 0.12, 0, 0.3)];
    for (const [x, z] of [[-0.2, -0.2], [0.2, -0.18], [-0.18, 0.2], [0.2, 0.2], [0, 0]]) p.push(B(0.12, LEAFD, x, 0.15, z, 1, 0.45, 1, 8, 5));
    for (let i = 0; i < 12; i++) {
      const a = i * 2.39996, r = 0.33 * Math.sqrt((i + 0.5) / 12), x = Math.cos(a) * r, z = Math.sin(a) * r, c = FLOWERS[i % 6], h = 0.1 + rnd() * 0.1;
      p.push(stick([x, 0.15, z], [x, 0.15 + h, z], 0.01, STEM, 4), leaf(0.11, 0.06, i % 2 ? LEAF : LEAFL, x, 0.17, z, a, 0.6, 0.3, 0.3, 4, 5));
      if (i % 4 === 1) p.push(B(0.05, c, x, 0.18 + h, z, 1, 1.25, 1, 8, 6), ...[0, 1, 2].map(j => leaf(0.075, 0.055, c, x, 0.15 + h, z, j * 2.1, 1.2, -0.05, 0.4, 4, 5)));
      else p.push(bloom(0.075, c, x, 0.15 + h, z, i % 2 ? 5 : 8, 0.35, 0.018, -0.3 + rnd() * 0.2, rnd() * 3), B(0.026, i % 2 ? YEL : 0xffb020, x, 0.165 + h, z + 0.008, 1, 0.7, 1, 6, 4));
    }
    return p;
  },

  zaun() {
    const p = [];
    for (const x of [-0.44, 0.44]) p.push(soft(0.1, 0.66, 0.1, WOODD, x, 0.33, 0, 0.3, 0, 0, 0, 8), B(0.06, WOODD, x, 0.66, 0, 1, 0.7, 1, 8, 5));
    for (const y of [0.24, 0.48]) p.push(soft(1.0, 0.07, 0.05, WOOD, 0, y, 0.0, 0.3, 0, 0, 0, 8));
    for (const x of [-0.22, 0, 0.22]) p.push(soft(0.11, 0.56, 0.035, WOODL, x, 0.29, 0.04, 0.3, 0, 0, 0, 8), B(0.055, WOODL, x, 0.56, 0.04, 1, 1.1, 0.32, 8, 5));
    return p;
  },
  heu() {
    seed = 9;
    const p = [soft(0.86, 0.5, 0.62, 0xf2cf62, 0, 0.26, 0, 0.35)];
    for (const x of [-0.22, 0.22]) p.push(soft(0.05, 0.53, 0.65, 0xc0703a, x, 0.26, 0, 0.35));
    // herausstehende Halme an den Seiten und am Boden
    for (let i = 0; i < 14; i++) {
      const a = rnd() * TAU, y = 0.05 + rnd() * 0.42, x = Math.sin(a) * 0.44, z = Math.cos(a) * 0.33;
      p.push(stick([x * 0.9, y, z * 0.9], [x * 1.12, y + (rnd() - 0.3) * 0.08, z * 1.12], 0.007, i % 2 ? 0xe8bf4a : 0xffe08a, 3));
    }
    for (let i = 0; i < 4; i++) p.push(leaf(0.12, 0.05, 0xffe08a, (rnd() - 0.5) * 0.5, 0.5, (rnd() - 0.5) * 0.3, rnd() * TAU, 0.3, 0.2, 0, 4, 4));
    return p;
  },

  pilz() {
    const p = [], shroom = (s, x, z, ry) => {
      const q = [C(0.075, 0.1, 0.28, 0xfff3e0, 0, 0.14, 0, 12), ring(0.08, 0.02, 0xfff3e0, 0, 0.22, 0, H, TAU, 14, 4),
        C(0.24, 0.12, 0.06, 0xf5dcc0, 0, 0.29, 0, 16, false), dome(0.25, 0xff4b4b, 0, 0.3, 0, 1, 0.68, 1, 16, 6)];
      for (const [a, e, r] of [[0, 0.6, 0.045], [1.3, 0.9, 0.04], [2.5, 0.5, 0.05], [3.8, 0.7, 0.04], [5.1, 0.45, 0.045], [0.7, 1.35, 0.035], [3.1, 1.2, 0.035], [4.4, 0.25, 0.03]]) {
        const [px, py, pz] = onBall(0, 0.3, 0, 0.25, a, e, 0.68);
        q.push({ g: aim(plain(new THREE.SphereGeometry(r, 8, 4)).scale(1, 0.3, 1), [px, py, pz], [px, (py - 0.3) / 0.68 ** 2, pz]), c: WHITE });
      }
      for (const o of q) { o.g.rotateY(ry); o.g.scale(s, s, s); o.g.translate(x, 0, z); }
      return q;
    };
    p.push(...shroom(1, -0.05, -0.04, 0), ...shroom(0.5, 0.25, 0.2, 1.5));
    for (let i = 0; i < 4; i++) p.push(leaf(0.14, 0.035, i % 2 ? LEAF : LEAFL, -0.2 + i * 0.04, 0, 0.18 - i * 0.03, i * 1.4 - 0.5, 1.0, 0.35, 0.2, 4, 5));
    return p;
  },
  laterne() {
    const M = 0x3d4458, p = [
      C(0.17, 0.2, 0.06, M, 0, 0.03, 0, 8), C(0.11, 0.15, 0.12, M, 0, 0.12, 0, 8), C(0.035, 0.045, 1.2, M, 0, 0.75, 0, 8),
      ring(0.05, 0.016, BRASS, 0, 0.5, 0, H, TAU, 10, 4), ring(0.05, 0.016, BRASS, 0, 1.25, 0, H, TAU, 10, 4),
      cyl(0.16, 0.12, 0.05, M, 0, 1.36, 0, 6), cyl(0.18, 0.16, 0.04, M, 0, 1.7, 0, 6), cone(0.2, 0.17, M, 0, 1.8, 0, 6), B(0.035, BRASS, 0, 1.9, 0, 1, 1, 1, 8, 6),
      ring(0.035, 0.01, BRASS, 0, 1.95, 0, 0, TAU, 10, 4),
    ];
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6; p.push(stick([Math.sin(a) * 0.125, 1.38, Math.cos(a) * 0.125], [Math.sin(a) * 0.155, 1.69, Math.cos(a) * 0.155], 0.012, M, 4)); }
    p.push(...[-1, 1].map(s => stick([0, 1.2, 0], [s * 0.1, 1.3, 0], 0.012, M, 4)));
    return [p, [cyl(0.13, 0.105, 0.3, 0, 0, 1.535, 0, 6)]];
  },
  zwerg() {
    const SK = 0xffd8b8, BL = 0x4a7fd4, p = [
      ...[-1, 1].map(s => B(0.065, 0x6b4a32, s * 0.07, 0.035, 0.03, 1, 0.6, 1.4, 10, 6)),
      B(0.16, BL, 0, 0.2, 0, 1, 1.05, 0.95, 12, 9), ring(0.158, 0.022, 0x6b4a32, 0, 0.17, 0, H, TAU, 18, 4), soft(0.06, 0.05, 0.02, YEL, 0, 0.17, 0.165, 0.4),
      ...[-1, 1].map(s => B(0.055, BL, s * 0.16, 0.24, 0.03, 0.8, 1.3, 0.8, 8, 6, 0, 0, s * 0.3)), ...[-1, 1].map(s => B(0.038, SK, s * 0.175, 0.15, 0.07, 1, 1, 1, 8, 6)),
      B(0.12, SK, 0, 0.42, 0, 1, 1, 1, 12, 9), B(0.11, WHITE, 0, 0.35, 0.06, 1.05, 1, 0.75, 10, 8), B(0.065, WHITE, 0, 0.27, 0.1, 1, 1.2, 0.7, 8, 6),
      B(0.035, 0xffa8a0, 0, 0.41, 0.12, 1, 1, 1, 8, 6), ...[-1, 1].map(s => B(0.016, DARK, s * 0.045, 0.455, 0.105, 1, 1.2, 0.6, 6, 4)),
      ...[-1, 1].map(s => B(0.03, 0xffb3b3, s * 0.075, 0.42, 0.09, 1, 0.6, 0.5, 6, 4)),
      ring(0.115, 0.025, 0xd93838, 0, 0.49, 0, H, TAU, 18, 5),
    ];
    const hat = bend(plain(new THREE.ConeGeometry(0.13, 0.42, 14, 5)), v => { const t = (v.y + 0.21) / 0.42; v.z -= t * t * 0.13; v.y -= t * t * 0.04; });
    p.push(put(hat, 0xff4040, 0, 0.69, 0), B(0.03, WHITE, 0, 0.84, -0.13, 1, 1, 1, 8, 6));
    for (const o of p) o.g.scale(1.2, 1.2, 1.2);
    return p;
  },
  bank() {
    const p = [];
    for (const z of [-0.13, 0, 0.13]) p.push(soft(1.08, 0.05, 0.12, WOOD, 0, 0.395, z, 0.25));
    for (const y of [0.6, 0.78]) p.push(soft(1.08, 0.12, 0.045, WOOD, 0, y, -0.215 - (y - 0.6) * 0.15, 0.25, 0, -0.15));
    for (const x of [-0.46, 0.46]) {
      p.push(soft(0.07, 0.38, 0.07, WOODD, x, 0.19, 0.15, 0.3), soft(0.07, 0.86, 0.07, WOODD, x, 0.43, -0.2, 0.3, 0, -0.08),
        soft(0.06, 0.05, 0.4, WOODD, x, 0.3, -0.02, 0.3), soft(0.09, 0.05, 0.42, WOODD, x + Math.sign(x) * 0.02, 0.58, 0.0, 0.3), B(0.04, WOODD, x + Math.sign(x) * 0.02, 0.58, 0.2, 1, 0.8, 1, 8, 6),
        stick([x, 0.4, 0.15], [x + Math.sign(x) * 0.02, 0.56, 0.16], 0.025, WOODD, 6));
    }
    p.push(...heart(0.11, ROSE, 0, 0.69, -0.215, 0.3));
    return p;
  },
  sonnenschirm() {
    const p = [C(0.03, 0.03, 1.9, WHITE, 0, 0.95, 0, 8), C(0.16, 0.2, 0.08, WOODD, 0, 0.04, 0, 10)];
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8, a2 = (i + 1) * TAU / 8, c = i % 2 ? WHITE : 0x5ab8e8;
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 2.05, 0, Math.sin(a) * 1.05, 1.62, Math.cos(a) * 1.05, Math.sin(a2) * 1.05, 1.62, Math.cos(a2) * 1.05], 3));
      g.computeVertexNormals(); p.push({ g, c }, B(0.07, c, Math.sin((a + a2) / 2) * 1.0, 1.6, Math.cos((a + a2) / 2) * 1.0, 1, 0.6, 1, 6, 4)); }
    p.push(B(0.05, 0xffd23f, 0, 2.08, 0, 1, 1, 1, 8, 6));
    return p;
  },
  liegestuhl() {
    const p = [];
    for (const x of [-0.28, 0.28]) p.push(stick([x, 0, 0.45], [x, 0.3, -0.05], 0.025, WOODD, 6), stick([x, 0.3, -0.05], [x, 0.75, -0.4], 0.025, WOODD, 6), stick([x, 0, -0.35], [x, 0.3, -0.05], 0.025, WOODD, 6));
    for (let i = 0; i < 6; i++) { const t = i / 5, y = 0.3 + t * 0.45, z = -0.05 - t * 0.35; p.push(soft(0.56, 0.03, 0.1, i % 2 ? 0xff8fab : WHITE, 0, y, z, 0.3, 0, -0.9)); }
    for (let i = 0; i < 4; i++) p.push(soft(0.56, 0.03, 0.12, i % 2 ? 0xff8fab : WHITE, 0, 0.31 - i * 0.02, 0.06 + i * 0.12, 0.3, 0, 0.15));
    return p;
  },
  sternlampe() {
    const p = [C(0.16, 0.2, 0.08, 0x3d4458, 0, 0.04, 0, 10), C(0.03, 0.035, 1.0, 0x3d4458, 0, 0.55, 0, 8)];
    const star = [];
    for (let i = 0; i < 5; i++) { const a = i * TAU / 5; star.push(cone(0.09, 0.26, 0, Math.sin(a) * 0.13, 1.25 + Math.cos(a) * 0.13, 0, 6, 0, 0, -a)); }
    star.push(B(0.12, 0, 0, 1.25, 0, 1, 1, 0.6, 10, 8));
    return [p, star];
  },
  kirschbaum() {
    seed = 21;
    const P = [0xffb7d0, 0xffa3c4, 0xffc8dc, 0xff94b8], p = [...trunk(), ...tree([
      [0, 1.55, 0, 0.52, P[0]], [0.4, 1.38, 0.14, 0.36, P[1]], [-0.38, 1.44, -0.08, 0.38, P[2]], [0.05, 1.92, 0.02, 0.36, P[2]],
      [-0.12, 1.34, 0.34, 0.32, P[3]], [0.22, 1.62, -0.32, 0.34, P[1]], [-0.3, 1.75, 0.2, 0.26, P[0]]])];
    for (let i = 0; i < 16; i++) {
      const [x, y, z] = onBall(0, 1.55, 0.05, 0.62, rnd() * TAU, (rnd() - 0.25) * 1.2, 0.85);
      p.push(bloom(0.06, i % 3 ? WHITE : 0xff7fa8, x, y, z, 5, 0.2, 0.02, (rnd() - 0.5) * 1.2, rnd() * 3));
    }
    for (let i = 0; i < 8; i++) { const a = rnd() * TAU, r = 0.25 + rnd() * 0.4; p.push(B(0.035, P[i % 4], Math.sin(a) * r, 0.005, Math.cos(a) * r, 1, 0.2, 0.7, 6, 3, 0, a)); }
    for (const o of p) o.g.scale(0.92, 0.92, 0.92);
    return p;
  },
  herz() {
    seed = 13;
    const W = 0xfff4ec, p = [];
    for (const x of [-0.45, 0.45]) p.push(C(0.045, 0.055, 1.3, W, x, 0.65, 0, 8), C(0.08, 0.09, 0.08, W, x, 0.04, 0, 8));
    p.push(ring(0.45, 0.045, W, 0, 1.3, 0, 0, PI, 20, 6), ...heart(0.36, 0xff4d7d, 0, 1.84, 0, 0.5), ...heart(0.2, 0xff8fab, 0, 1.85, 0.07, 0.35));
    const R = [0xff6b8a, WHITE, 0xff8fab, 0xffc0cb];
    const spots = [];
    for (let i = 0; i < 6; i++) spots.push([-0.45, 0.25 + i * 0.19], [0.45, 0.35 + i * 0.17]);
    for (let i = 1; i < 8; i++) { const a = i / 8 * PI; spots.push([Math.cos(a) * 0.45, 1.3 + Math.sin(a) * 0.45]); }
    spots.forEach(([x, y], i) => {
      const z = (i % 2 ? 1 : -1) * 0.05;
      p.push(leaf(0.13, 0.08, i % 2 ? LEAF : LEAFD, x, y - 0.03, z * 0.6, i * 1.7, 0.2, 0.2, 0.3, 4, 5), leaf(0.11, 0.07, LEAF, x, y + 0.05, -z * 0.6, i * 1.7 + 2.5, 0.3, 0.2, 0.3, 4, 5));
      if (i % 2 === 0 || y > 1.3) p.push(B(0.06, R[i % 4], x + (rnd() - 0.5) * 0.04, y, z, 1, 0.85, 1, 8, 6), B(0.03, shade(R[i % 4], -0.08), x, y + 0.04, z, 1, 0.7, 1, 6, 4));
    });
    return p;
  },
  brunnen() {
    seed = 17;
    const p = [C(0.47, 0.5, 0.3, STONE, 0, 0.15, 0, 22), ring(0.46, 0.06, 0xe6dfd5, 0, 0.3, 0, H, TAU, 28, 6), C(0.42, 0.42, 0.02, WATER, 0, 0.26, 0, 22),
      C(0.07, 0.1, 0.5, STONE, 0, 0.5, 0, 10), C(0.2, 0.08, 0.1, STONE, 0, 0.78, 0, 14), ring(0.19, 0.03, 0xe6dfd5, 0, 0.83, 0, H, TAU, 20, 5),
      C(0.17, 0.17, 0.015, WATER, 0, 0.82, 0, 14), C(0.03, 0.04, 0.12, STONE, 0, 0.88, 0, 8), B(0.05, 0xbfeaff, 0, 0.98, 0, 1, 1.5, 1, 8, 6)];
    for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + 0.3; p.push(soft(0.16, 0.08, 0.04, shade(STONE, -0.05 - rnd() * 0.08), Math.sin(a) * 0.49, 0.1 + (i % 2) * 0.1, Math.cos(a) * 0.49, 0.4, a)); }
    for (let i = 0; i < 4; i++) { const a = i * H + PI / 4; p.push(tube([[Math.sin(a) * 0.19, 0.84, Math.cos(a) * 0.19], [Math.sin(a) * 0.27, 0.72, Math.cos(a) * 0.27], [Math.sin(a) * 0.31, 0.27, Math.cos(a) * 0.31]], 0.018, 0xbfeaff, 6, 4)); }
    p.push(C(0.07, 0.07, 0.01, LEAF, -0.2, 0.275, 0.18, 10), bloom(0.04, PINK, -0.2, 0.285, 0.18, 6, 0.6), B(0.015, YEL, -0.2, 0.29, 0.18, 1, 1, 1, 5, 3), C(0.05, 0.05, 0.01, LEAFD, -0.08, 0.275, 0.3, 10));
    return p;
  },
  vogelhaus() {
    const BL = 0x7fc8ff, R = 0xe5625e, gable = new THREE.CylinderGeometry(1, 1, 0.3, 3).rotateX(-H).scale(0.17 / 0.866, 0.16 / 1.5, 1).translate(0, 1.34 + 0.16 / 3, 0);
    const p = [C(0.04, 0.05, 1.0, WOODD, 0, 0.5, 0, 8), soft(0.26, 0.04, 0.26, WOODD, 0, 0.99, 0, 0.3),
      soft(0.34, 0.34, 0.3, 0xffd6a5, 0, 1.17, 0, 0.25), { g: gable, c: 0xffd6a5 }, C(0.06, 0.06, 0.02, 0x5a3a24, 0, 1.2, 0.15, 14, false, H), C(0.012, 0.012, 0.1, WOODD, 0, 1.1, 0.19, 6, false, H),
      soft(0.27, 0.035, 0.42, R, -0.105, 1.42, 0, 0.3, 0, 0, 0.62), soft(0.27, 0.035, 0.42, R, 0.105, 1.42, 0, 0.3, 0, 0, -0.62), C(0.022, 0.022, 0.42, 0xc94e4a, 0, 1.5, 0, 8, false, H),
      ...heart(0.06, ROSE, 0, 1.38, 0.155, 0.25),
      B(0.05, BL, 0.06, 1.13, 0.22, 1, 0.9, 1.15, 8, 6), B(0.033, BL, 0.06, 1.19, 0.25, 1, 1, 1, 8, 6), cone(0.012, 0.03, 0xffb020, 0.06, 1.19, 0.29, 5, H),
      B(0.008, DARK, 0.04, 1.2, 0.275, 1, 1, 1, 4, 3), B(0.008, DARK, 0.08, 1.2, 0.275, 1, 1, 1, 4, 3), B(0.025, BL, 0.06, 1.13, 0.16, 1, 0.4, 1.6, 6, 4),
      B(0.045, 0xffe066, -0.06, 1.56, 0.02, 1, 0.9, 1.2, 8, 6), B(0.03, 0xffe066, -0.06, 1.61, 0.05, 1, 1, 1, 8, 6), cone(0.01, 0.025, 0xff8a2a, -0.06, 1.61, 0.085, 5, H)];
    return p;
  },

  sprinkler() {
    const ST = 0x9fb0c2, BLU = 0x4fa8e8, p = [C(0.16, 0.19, 0.05, 0x8a939e, 0, 0.025, 0, 16), C(0.065, 0.085, 0.2, ST, 0, 0.15, 0, 14), ring(0.072, 0.018, BRASS, 0, 0.13, 0, H, TAU, 14, 4),
      B(0.08, BRASS, 0, 0.27, 0, 1, 0.75, 1, 12, 7), B(0.035, BLU, 0, 0.33, 0, 1, 0.8, 1, 8, 5)];
    for (const s of [-1, 1]) p.push(tube([[0, 0.27, 0], [s * 0.13, 0.29, 0], [s * 0.19, 0.35, s * 0.03]], 0.022, ST, 6, 6), C(0.03, 0.026, 0.04, BLU, s * 0.195, 0.365, s * 0.03, 10),
      B(0.022, 0x9fdcff, s * 0.25, 0.4, s * 0.07, 1, 1.4, 1, 6, 4), B(0.017, 0x9fdcff, s * 0.3, 0.39, s * 0.12, 1, 1.4, 1, 6, 4), B(0.013, 0x9fdcff, s * 0.34, 0.36, s * 0.17, 1, 1.4, 1, 6, 4));
    return p;
  },

  supersprinkler() {
    const G = 0xffcf3a, GD = 0xd9a62c, BLU = 0x4fa8e8, p = [C(0.22, 0.26, 0.07, GD, 0, 0.035, 0, 18), ring(0.22, 0.022, G, 0, 0.07, 0, H, TAU, 22, 4), C(0.08, 0.11, 0.28, G, 0, 0.21, 0, 14),
      ring(0.09, 0.022, GD, 0, 0.16, 0, H, TAU, 14, 4), ring(0.085, 0.02, GD, 0, 0.3, 0, H, TAU, 14, 4), B(0.11, G, 0, 0.39, 0, 1, 0.75, 1, 14, 8), B(0.055, 0x4fc3ff, 0, 0.47, 0, 1, 1, 1, 10, 7),
      ...[0, 1, 2, 3, 4].map(i => B(0.022, 0xff8fab, Math.sin(i * 1.257) * 0.1, 0.43, Math.cos(i * 1.257) * 0.1, 1, 1, 1, 6, 4))];
    for (let i = 0; i < 4; i++) {
      const a = i * H + PI / 4, dx = Math.sin(a), dz = Math.cos(a), e = [dx * 0.25, 0.47, dz * 0.25];
      p.push(tube([[0, 0.39, 0], [dx * 0.17, 0.41, dz * 0.17], e], 0.024, G, 6, 6), C(0.034, 0.03, 0.045, BLU, e[0], e[1] + 0.015, e[2], 10),
        B(0.022, 0x9fdcff, dx * 0.31, 0.52, dz * 0.31, 1, 1.4, 1, 6, 4), B(0.017, 0x9fdcff, dx * 0.36, 0.51, dz * 0.36, 1, 1.4, 1, 6, 4));
    }
    return p;
  },

  apfelbaum(ready, fruitCol = 0xff3b3b, big = 1) {
    seed = 31;
    const G = [0x5fb84a, 0x4fa843, 0x6cc455, 0x47993f], p = [...trunk(), ...tree([
      [0, 1.55, 0, 0.55, G[0]], [0.42, 1.36, 0.12, 0.38, G[1]], [-0.4, 1.42, -0.06, 0.4, G[2]], [0.04, 1.95, 0.0, 0.38, G[2]],
      [-0.1, 1.32, 0.36, 0.34, G[3]], [0.22, 1.6, -0.34, 0.36, G[1]], [-0.3, 1.78, 0.22, 0.27, G[0]]])];
    if (ready) for (const [a, e] of [[0.1, 0.1], [0.9, -0.15], [-0.7, 0.05], [1.8, 0.2], [-1.6, -0.1], [0.4, 0.6], [-0.3, -0.35], [2.6, -0.05], [3.6, 0.3], [-0.9, 0.55]]) {
      const [x, y, z] = onBall(0, 1.55, 0.02, 0.6, a, e, 0.88);
      p.push(B(0.075 * big, fruitCol, x, y, z, 1, 0.92, 1, 8, 6), stick([x, y + 0.06, z], [x + 0.01, y + 0.1, z], 0.008, BARK, 3), leaf(0.05, 0.03, LEAFL, x + 0.01, y + 0.09, z, a, 0.4, 0, 0.3, 4, 4));
    }
    else for (let i = 0; i < 10; i++) { const [x, y, z] = onBall(0, 1.55, 0.05, 0.62, rnd() * TAU, (rnd() - 0.2) * 1.1, 0.85); p.push(bloom(0.05, i % 2 ? WHITE : 0xffd6e4, x, y, z, 5, 0.2, 0.02, (rnd() - 0.5), rnd() * 3)); }
    for (const o of p) o.g.scale(0.92, 0.92, 0.92);
    return p;
  },
  orangenbaum: ready => PLACE.apfelbaum(ready, 0xffa21f, 1.1),
  pfirsichbaum: ready => PLACE.apfelbaum(ready, 0xffa98a, 1.05),
  kirschenbaum: ready => PLACE.apfelbaum(ready, 0xd8102c, 0.8),
  birnbaum: ready => PLACE.apfelbaum(ready, 0xd6dc4a, 1.05),
  // ---------- Bürgermeister-Update ----------
  bananenbaum(ready) { // Staude mit großen Blättern und Bananenbündel
    seed = 41;
    const p = [C(0.09, 0.14, 1.5, 0x9a8a4a, 0, 0.75, 0, 9)];
    for (let i = 0; i < 7; i++) { const a = i * TAU / 7; p.push(leaf(0.95, 0.32, i % 2 ? LEAF : LEAFD, 0, 1.45, 0, a, 0.5, 0.55, 0.15, 5, 8)); }
    if (ready) for (let i = 0; i < 6; i++) { const a = i * 1.1; p.push(B(0.05, 0xffe14d, Math.sin(a) * 0.12, 1.15 - (i % 3) * 0.06, Math.cos(a) * 0.12 + 0.12, 1, 2.6, 1, 6, 5, 0.3, 0, 0.4)); }
    return p;
  },
  mangobaum: ready => PLACE.apfelbaum(ready, 0xff9a3c, 1.25),
  hortensie() {
    seed = 51;
    const p = [];
    for (let i = 0; i < 6; i++) { const a = i * TAU / 6; p.push(B(0.22, i % 2 ? LEAF : LEAFD, Math.sin(a) * 0.18, 0.25, Math.cos(a) * 0.18, 1, 0.8, 1, 9, 7)); }
    for (let i = 0; i < 7; i++) { const [x, y, z] = onBall(0, 0.32, 0, 0.3, rnd() * TAU, rnd() * 1.2, 0.9); p.push(B(0.1, i % 3 ? 0x8fb4ff : 0xd9a0ff, x, y, z, 1, 0.85, 1, 8, 6)); }
    return p;
  },
  buchsbaum() {
    return [C(0.2, 0.16, 0.26, 0xd27a5a, 0, 0.13, 0, 12), B(0.32, LEAFD, 0, 0.56, 0, 1, 1, 1, 14, 10), B(0.12, LEAF, 0.1, 0.72, 0.18, 1, 0.8, 1, 8, 6)];
  },
  rosenbogen() {
    const p = [];
    for (const x of [-0.55, 0.55]) p.push(C(0.03, 0.03, 1.5, WHITE, x, 0.75, 0, 6));
    p.push(ring(0.55, 0.03, WHITE, 0, 1.5, 0, 0, PI, 16, 4));
    for (let i = 0; i < 16; i++) { const a = i / 15 * PI, r = 0.55; p.push(B(0.08, i % 2 ? LEAF : LEAFD, Math.cos(a) * r, 1.5 + Math.sin(a) * r, 0, 1, 1, 0.8, 7, 5), B(0.05, i % 3 ? 0xff3b5c : PINK, Math.cos(a) * r + 0.03, 1.52 + Math.sin(a) * r, 0.06, 1, 1, 1, 6, 4)); }
    for (const x of [-0.55, 0.55]) for (let j = 0; j < 4; j++) p.push(B(0.07, LEAF, x, 0.3 + j * 0.3, 0.04, 1, 1, 0.8, 6, 4), B(0.045, 0xff3b5c, x + 0.04, 0.38 + j * 0.3, 0.08, 1, 1, 1, 6, 4));
    return p;
  },
  tikifackel() {
    const p = [C(0.04, 0.05, 1.3, 0x8a5a3a, 0, 0.65, 0, 6), C(0.1, 0.07, 0.22, 0xc9a06a, 0, 1.35, 0, 8), ring(0.1, 0.015, 0x6b4428, 0, 1.3, 0, H, TAU, 10, 3)];
    return [p, [cone(0.08, 0.26, 0, 0, 1.58, 0, 7), B(0.07, 0, 0, 1.5, 0, 1, 1, 1, 7, 5)]];
  },
  haengematte() {
    const p = [];
    for (const x of [-0.7, 0.7]) p.push(C(0.05, 0.06, 1.2, 0x8a5a3a, x, 0.6, 0, 7), B(0.06, 0x8a5a3a, x, 1.22, 0, 1, 1, 1, 6, 4));
    const pts = Array.from({ length: 9 }, (_, i) => { const t = i / 8; return [-0.68 + t * 1.36, 1.0 - Math.sin(t * PI) * 0.45, 0]; });
    p.push(tube(pts, 0.025, 0xc9a06a, 12, 4));
    for (let i = 0; i < 7; i++) { const t = (i + 0.5) / 7, x = -0.6 + t * 1.2, y = 0.98 - Math.sin(t * PI) * 0.43; p.push(soft(0.18, 0.03, 0.5, i % 2 ? 0xff8fab : 0x6cc4ff, x, y, 0, 0.3, 0, 0, Math.cos(t * PI) * 0.6)); }
    return p;
  },
  surfbrett() {
    return [soft(0.42, 1.5, 0.08, 0x6cc4ff, 0, 0.78, 0, 0.6, 0, -0.12), soft(0.08, 1.3, 0.09, WHITE, 0, 0.8, 0.005, 0.5, 0, -0.12), B(0.06, 0xffd23f, 0, 1.05, 0.06, 1, 1, 0.3, 6, 4), soft(0.6, 0.1, 0.3, 0xeedcaa, 0, 0.04, 0.05, 0.6)];
  },
  sandburg() {
    const SA = 0xeedcaa, p = [soft(0.9, 0.12, 0.8, SA, 0, 0.06, 0, 0.6), soft(0.5, 0.3, 0.4, SA, 0, 0.27, 0, 0.3)];
    for (const [x, z] of [[-0.3, -0.25], [0.3, -0.25], [-0.3, 0.25], [0.3, 0.25]]) p.push(C(0.1, 0.12, 0.42, SA, x, 0.27, z, 10), cone(0.11, 0.14, SA, x, 0.55, z, 10));
    p.push(C(0.008, 0.008, 0.3, BARK, 0, 0.55, 0, 4), box(0.12, 0.08, 0.01, RED, 0.06, 0.66, 0), B(0.05, 0xffb7c8, 0.35, 0.03, 0.35, 1, 0.5, 1, 6, 4));
    return p;
  },
  pokal() {
    const G = 0xffd23f;
    return [C(0.22, 0.26, 0.1, STONE, 0, 0.05, 0, 12), soft(0.36, 0.2, 0.36, 0x6b4428, 0, 0.2, 0, 0.4), C(0.05, 0.08, 0.25, G, 0, 0.42, 0, 10), C(0.2, 0.06, 0.35, G, 0, 0.72, 0, 14),
      ring(0.1, 0.025, G, -0.22, 0.75, 0, 0, TAU, 10, 4), ring(0.1, 0.025, G, 0.22, 0.75, 0, 0, TAU, 10, 4), B(0.04, 0xffffff, 0, 0.92, 0, 1, 1, 1, 6, 4)];
  },
  baustelle() { // Bauschild mit Absperrung und Steinhaufen
    const p = [C(0.03, 0.03, 1.1, WOODD, -0.25, 0.55, 0, 6), C(0.03, 0.03, 1.1, WOODD, 0.25, 0.55, 0, 6), soft(0.75, 0.45, 0.05, WHITE, 0, 0.95, 0.02, 0.2),
      soft(0.7, 0.08, 0.06, 0xff8a2a, 0, 1.12, 0.05, 0.3), B(0.12, 0xffd23f, 0, 0.92, 0.05, 1, 1, 0.3, 8, 6)];
    for (const [x, z] of [[-0.9, 0.8], [0.9, 0.8], [-0.9, -0.8], [0.9, -0.8]]) p.push(C(0.05, 0.07, 0.5, 0xff8a2a, x, 0.25, z, 6), ring(0.05, 0.012, WHITE, x, 0.32, z, H, TAU, 8, 3));
    for (const [a, b] of [[[-0.9, 0.8], [0.9, 0.8]], [[-0.9, -0.8], [-0.9, 0.8]], [[0.9, -0.8], [0.9, 0.8]]]) for (const y of [0.32, 0.18]) p.push(stick([a[0], y, a[1]], [b[0], y, b[1]], 0.012, y > 0.3 ? 0xff5050 : WHITE, 4));
    for (let i = 0; i < 6; i++) p.push(soft(0.2, 0.12, 0.16, i % 2 ? STONE : 0xb9b4ad, 0.5 - (i % 3) * 0.14, 0.06 + Math.floor(i / 3) * 0.1, -0.45 + (i % 2) * 0.1, 0.5, i));
    return p;
  },
  laternenpfahl() {
    const M = 0x2f3e5c, p = [C(0.16, 0.2, 0.12, M, 0, 0.06, 0, 10), C(0.05, 0.06, 2.2, M, 0, 1.2, 0, 8), ring(0.06, 0.02, BRASS, 0, 0.6, 0, H, TAU, 10, 4)];
    for (const sx of [-1, 1]) p.push(stick([0, 2.1, 0], [sx * 0.4, 2.15, 0], 0.025, M, 5), C(0.12, 0.08, 0.06, M, sx * 0.4, 2.05, 0, 6), cone(0.15, 0.16, M, sx * 0.4, 2.42, 0, 6));
    return [p, [-1, 1].map(sx => C(0.09, 0.07, 0.24, 0, sx * 0.4, 2.2, 0, 6))];
  },
  sonnenuhr() {
    const p = [C(0.4, 0.45, 0.12, STONE, 0, 0.06, 0, 16), C(0.22, 0.28, 0.6, STONE, 0, 0.42, 0, 12), C(0.42, 0.38, 0.08, 0xe6dfd5, 0, 0.76, 0, 20)];
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; p.push(box(0.03, 0.01, 0.08, DARK, Math.sin(a) * 0.32, 0.805, Math.cos(a) * 0.32, a)); }
    p.push(cone(0.18, 0.3, BRASS, 0, 0.92, 0, 3, 0, 0, 0), B(0.03, BRASS, 0, 1.08, 0, 1, 1, 1, 6, 4));
    return p;
  },
  picknick() {
    const p = [soft(1.4, 0.06, 0.7, WOOD, 0, 0.62, 0, 0.25), soft(1.4, 0.05, 0.22, WOOD, 0, 0.36, 0.55, 0.25), soft(1.4, 0.05, 0.22, WOOD, 0, 0.36, -0.55, 0.25)];
    for (const x of [-0.55, 0.55]) p.push(stick([x, 0, 0.6], [x, 0.62, -0.1], 0.04, WOODD, 6), stick([x, 0, -0.6], [x, 0.62, 0.1], 0.04, WOODD, 6));
    p.push(soft(0.6, 0.02, 0.45, 0xff6b6b, 0.1, 0.66, 0, 0.2), soft(0.3, 0.2, 0.2, 0xc9a06a, -0.4, 0.75, 0, 0.5), ring(0.1, 0.015, 0x8a5a3a, -0.4, 0.88, 0, 0, PI, 10, 3), B(0.06, RED, 0.25, 0.7, 0.05, 1, 1, 1, 7, 5));
    return p;
  },
  blumentor() {
    const p = [];
    for (const x of [-0.8, 0.8]) p.push(soft(0.24, 2.0, 0.24, WHITE, x, 1.0, 0, 0.3), B(0.14, WHITE, x, 2.08, 0, 1, 1, 1, 8, 6));
    p.push(ring(0.8, 0.07, WHITE, 0, 2.0, 0, 0, PI, 18, 5));
    for (let i = 0; i < 22; i++) { const a = i / 21 * PI; p.push(B(0.1, [ROSE, 0xffe066, LILA, 0xff9f6b][i % 4], Math.cos(a) * 0.8, 2.0 + Math.sin(a) * 0.8, 0.07, 1, 1, 0.7, 7, 5)); }
    for (const x of [-0.8, 0.8]) for (let j = 0; j < 6; j++) p.push(B(0.08, j % 2 ? LEAF : 0xff8fab, x + (j % 2 ? 0.1 : -0.1), 0.3 + j * 0.28, 0.12, 1, 1, 0.8, 6, 4));
    return p;
  },
  fernrohr() {
    const p = [C(0.3, 0.34, 0.12, STONE, 0, 0.06, 0, 12)];
    for (let i = 0; i < 3; i++) { const a = i * TAU / 3; p.push(stick([Math.sin(a) * 0.25, 0.1, Math.cos(a) * 0.25], [0, 0.95, 0], 0.03, BRASS, 5)); }
    p.push(C(0.09, 0.12, 0.9, 0x3b4a7a, 0, 1.15, 0.1, 12, false, -0.7), C(0.13, 0.13, 0.08, BRASS, 0, 1.45, 0.42, 12, false, -0.7), C(0.06, 0.06, 0.1, BRASS, 0, 0.85, -0.25, 8, false, -0.7));
    return p;
  },
  statue() { // Teddy auf Sockel
    const T = 0xd9d2c8, p = [soft(0.7, 0.5, 0.7, STONE, 0, 0.25, 0, 0.3), soft(0.8, 0.08, 0.8, 0xb9b4ad, 0, 0.52, 0, 0.3)];
    p.push(B(0.32, T, 0, 0.88, 0, 1, 1.05, 0.9, 12, 10), B(0.25, T, 0, 1.35, 0, 1, 1, 1, 12, 10), B(0.09, T, -0.2, 1.55, 0, 1, 1, 0.7, 8, 6), B(0.09, T, 0.2, 1.55, 0, 1, 1, 0.7, 8, 6),
      B(0.09, 0xece6de, 0, 1.3, 0.21, 1.3, 0.9, 0.8, 8, 6), B(0.1, T, -0.3, 0.95, 0.12, 1, 1.4, 1, 8, 6), B(0.1, T, 0.3, 0.95, 0.12, 1, 1.4, 1, 8, 6), ...heart(0.16, 0xe0b0b0, 0, 0.9, 0.29, 0.3));
    return p;
  },
  pavillon() {
    const p = [C(1.1, 1.15, 0.2, STONE, 0, 0.1, 0, 8), C(1.05, 1.05, 0.04, WOODL, 0, 0.22, 0, 8)];
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + PI / 8; p.push(C(0.05, 0.05, 1.5, WHITE, Math.sin(a) * 0.95, 0.97, Math.cos(a) * 0.95, 8)); if (i !== 0) p.push(stick([Math.sin(a) * 0.95, 0.55, Math.cos(a) * 0.95], [Math.sin(a + PI / 4) * 0.95, 0.55, Math.cos(a + PI / 4) * 0.95], 0.02, WHITE, 4)); }
    p.push(C(1.2, 1.2, 0.08, WHITE, 0, 1.74, 0, 8), cone(1.3, 0.8, 0x6cc4ff, 0, 2.18, 0, 8), B(0.08, BRASS, 0, 2.62, 0, 1, 1, 1, 8, 6));
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + PI / 8; p.push(B(0.05, [ROSE, YEL][i % 2], Math.sin(a) * 1.2, 1.68, Math.cos(a) * 1.2, 1, 1, 1, 6, 4)); }
    return p;
  },
  springbrunnen() {
    seed = 61;
    const p = [C(1.0, 1.05, 0.35, STONE, 0, 0.17, 0, 24), ring(1.0, 0.08, 0xe6dfd5, 0, 0.35, 0, H, TAU, 30, 6), C(0.94, 0.94, 0.02, WATER, 0, 0.3, 0, 24),
      C(0.12, 0.16, 0.8, STONE, 0, 0.7, 0, 10), C(0.45, 0.14, 0.15, STONE, 0, 1.08, 0, 16), ring(0.44, 0.04, 0xe6dfd5, 0, 1.15, 0, H, TAU, 20, 5), C(0.4, 0.4, 0.015, WATER, 0, 1.13, 0, 16),
      C(0.05, 0.08, 0.35, STONE, 0, 1.3, 0, 8), C(0.2, 0.06, 0.08, STONE, 0, 1.5, 0, 12), B(0.07, 0xbfeaff, 0, 1.68, 0, 1, 2, 1, 8, 6)];
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8; p.push(tube([[Math.sin(a) * 0.42, 1.12, Math.cos(a) * 0.42], [Math.sin(a) * 0.62, 0.9, Math.cos(a) * 0.62], [Math.sin(a) * 0.72, 0.32, Math.cos(a) * 0.72]], 0.02, 0xbfeaff, 6, 4)); }
    return p;
  },
  windmuehle() {
    const p = [C(0.55, 0.85, 2.6, 0xfff3e0, 0, 1.3, 0, 12), cone(0.75, 0.9, 0xd27a5a, 0, 3.05, 0, 12), soft(0.5, 0.75, 0.06, 0x8f603c, 0, 0.45, 0.78, 0.2, 0, 0.18),
      C(0.1, 0.1, 0.4, WOODD, 0, 2.55, 0.65, 8, false, H), B(0.12, WOODD, 0, 2.55, 0.85, 1, 1, 1, 8, 6)];
    for (let i = 0; i < 4; i++) { const a = i * H + 0.3; p.push(...[0.3, 0.6, 0.9, 1.2].map(r => soft(0.34, 0.04, 0.02, WHITE, Math.sin(a) * r, 2.55 + Math.cos(a) * r, 0.88, 0.3, 0, 0, -a)), stick([0, 2.55, 0.9], [Math.sin(a) * 1.45, 2.55 + Math.cos(a) * 1.45, 0.9], 0.03, WOODD, 4)); }
    for (const y of [1.1, 1.9]) p.push(soft(0.3, 0.3, 0.05, SKY, 0, y, 0.68 - (y - 1.1) * 0.15, 0.3, 0, 0.2));
    return p;
  },
  glockenturm() {
    const p = [soft(1.0, 0.3, 1.0, STONE, 0, 0.15, 0, 0.2), soft(0.8, 2.6, 0.8, 0xfff3e0, 0, 1.6, 0, 0.15), soft(0.95, 0.12, 0.95, WHITE, 0, 2.95, 0, 0.2)];
    for (const [x, z] of [[-0.38, -0.38], [0.38, -0.38], [-0.38, 0.38], [0.38, 0.38]]) p.push(C(0.06, 0.06, 0.9, WHITE, x, 3.45, z, 8));
    p.push(soft(1.0, 0.12, 1.0, WHITE, 0, 3.95, 0, 0.2), cone(0.75, 1.0, 0x4f7fc9, 0, 4.5, 0, 4, 0, PI / 4), B(0.06, BRASS, 0, 5.05, 0, 1, 1, 1, 8, 6));
    p.push(C(0.12, 0.28, 0.4, BRASS, 0, 3.4, 0, 14), B(0.06, BRASS, 0, 3.18, 0, 1, 1, 1, 8, 6), C(0.25, 0.25, 0.04, WHITE, 0, 2.1, 0.41, 18, false, H), box(0.02, 0.16, 0.02, DARK, 0, 2.16, 0.44), box(0.12, 0.02, 0.02, DARK, 0.05, 2.1, 0.44));
    return p;
  },
  leuchtturm() {
    const p = [C(0.8, 0.9, 0.3, STONE, 0, 0.15, 0, 14)];
    for (let i = 0; i < 6; i++) p.push(C(0.55 - i * 0.04, 0.59 - i * 0.04, 0.6, i % 2 ? RED : WHITE, 0, 0.6 + i * 0.6, 0, 14));
    p.push(C(0.5, 0.5, 0.1, DARK, 0, 4.0, 0, 14), ring(0.5, 0.025, DARK, 0, 4.3, 0, H, TAU, 16, 4), C(0.38, 0.38, 0.06, DARK, 0, 4.72, 0, 12), cone(0.42, 0.45, RED, 0, 4.98, 0, 12), B(0.06, BRASS, 0, 5.24, 0, 1, 1, 1, 6, 4));
    p.push(soft(0.3, 0.5, 0.05, 0x8f603c, 0, 0.55, 0.88, 0.2, 0, 0.15));
    return [p, [C(0.3, 0.3, 0.6, 0, 0, 4.4, 0, 10)]];
  },
  bienenstock(ready) {
    const S = [0xf2c35a, 0xe2ad45], p = [C(0.3, 0.34, 0.22, BARK, 0, 0.11, 0, 14), C(0.29, 0.29, 0.02, 0xe8c48e, 0, 0.225, 0, 14), ring(0.16, 0.008, 0xc9a06a, 0, 0.236, 0, H, TAU, 16, 3),
      dome(0.27, S[0], 0, 0.23, 0, 1, 1.85, 1, 14, 7)];
    for (let i = 0; i < 6; i++) { const y = 0.27 + i * 0.085; p.push(ring(0.27 * Math.sqrt(1 - ((y - 0.23) / 0.5) ** 2) + 0.012, 0.045, S[i % 2], 0, y, 0, H, TAU, 18, 5)); }
    p.push(B(0.075, 0x4a3020, 0, 0.27, 0.25, 1, 0.75, 0.5, 10, 6), soft(0.2, 0.025, 0.08, WOODD, 0, 0.24, 0.3, 0.3), B(0.05, S[1], 0, 0.73, 0, 1, 0.7, 1, 8, 5));
    const bee = (x, y, z, a) => {
      const q = [B(0.035, 0xffd23f, 0, 0, 0, 1, 1, 1.35, 8, 6), ring(0.034, 0.009, DARK, 0, 0, 0.0, 0, TAU, 10, 3), ring(0.03, 0.008, DARK, 0, 0, -0.025, 0, TAU, 10, 3),
        B(0.022, DARK, 0, 0.005, 0.045, 1, 1, 1, 6, 4), ...[-1, 1].map(s => B(0.03, 0xffffff, s * 0.03, 0.035, -0.005, 0.7, 0.25, 1, 6, 4, 0, 0, s * 0.5))];
      for (const o of q) { o.g.rotateY(a); o.g.translate(x, y, z); }
      return q;
    };
    p.push(...bee(0.3, 0.68, 0.2, 1.2), ...bee(-0.28, 0.9, 0.1, -0.8), ...bee(0.1, 1.02, -0.18, 2.5));
    if (ready) {
      const HO = 0xffa81a;
      for (const [a, l] of [[0.4, 0.12], [-0.5, 0.09], [1.2, 0.07], [-1.3, 0.1]]) p.push(B(0.035, HO, Math.sin(a) * 0.29, 0.5 - l / 2, Math.cos(a) * 0.29, 1, l / 0.05, 0.7, 8, 5), B(0.03, HO, Math.sin(a) * 0.3, 0.48 - l, Math.cos(a) * 0.3, 1, 1.1, 1, 8, 5));
      p.push(C(0.075, 0.07, 0.12, 0xffb52e, 0.26, 0.06, 0.32, 12), C(0.08, 0.08, 0.025, 0xffffff, 0.26, 0.13, 0.32, 12), B(0.085, 0xff8fab, 0.26, 0.14, 0.32, 1, 0.3, 1, 10, 5),
        C(0.076, 0.076, 0.05, 0xfff3e0, 0.26, 0.06, 0.322, 12, true), B(0.06, HO, 0.0, 0.29, 0.3, 1.4, 0.35, 0.8, 8, 5));
    }
    return p;
  },
  m_mayo() {
    const CR = 0xfff6ea, p = [
      soft(0.66, 0.5, 0.52, CR, 0, 0.33, -0.02, 0.3), soft(0.7, 0.08, 0.56, MINT, 0, 0.09, -0.02, 0.35), soft(0.7, 0.07, 0.56, MINT, 0, 0.6, -0.02, 0.35),
      ...[[-0.27, 0.2], [0.27, 0.2], [-0.27, -0.22], [0.27, -0.22]].map(([x, z]) => B(0.045, WOODD, x, 0.03, z, 1, 0.7, 1, 8, 5)),
      C(0.2, 0.15, 0.1, SKY, 0, 0.68, -0.04, 16), dome(0.2, 0xd6eef8, 0, 0.73, -0.04, 1, 1.0, 1, 16, 6), B(0.13, 0xfff1c4, 0, 0.74, -0.04, 1, 0.6, 1, 10, 6), B(0.06, 0xfff1c4, 0, 0.81, -0.04, 1, 0.9, 1, 8, 6),
      ring(0.2, 0.018, SKY, 0, 0.73, -0.04, H, TAU, 20, 4), B(0.03, ROSE, 0, 0.96, -0.04, 1, 1, 1, 8, 6),
      C(0.1, 0.1, 0.02, 0xffffff, -0.13, 0.4, 0.245, 16, false, H), C(0.08, 0.08, 0.022, 0xeaf6ff, -0.13, 0.4, 0.25, 16, false, H), box(0.008, 0.06, 0.01, ROSE, -0.13, 0.42, 0.263, 0, 0, -0.6),
      B(0.05, 0xffffff, 0.14, 0.44, 0.235, 0.85, 1.1, 0.35, 8, 6), B(0.025, BUTTER, 0.14, 0.43, 0.25, 1, 1, 0.4, 6, 4),
      C(0.025, 0.035, 0.07, BRASS, 0.08, 0.22, 0.27, 8, false, 0.3), C(0.05, 0.045, 0.1, 0xe6f4fb, 0.08, 0.05, 0.3, 12), C(0.045, 0.045, 0.06, 0xfff1c4, 0.08, 0.04, 0.3, 12), C(0.052, 0.052, 0.02, ROSE, 0.08, 0.11, 0.3, 12),
      stick([0.33, 0.4, 0], [0.42, 0.4, 0], 0.02, BRASS, 6), stick([0.42, 0.4, 0], [0.42, 0.52, 0.06], 0.015, BRASS, 6), B(0.035, RED, 0.42, 0.54, 0.07, 1, 1.2, 1, 8, 6),
    ];
    return p;
  },
  m_jam() {
    const CU = 0xe0814e, p = [
      soft(0.82, 0.46, 0.58, 0xe58e66, 0, 0.24, -0.04, 0.25), soft(0.86, 0.06, 0.62, 0xc96f4e, 0, 0.48, -0.04, 0.3),
      soft(0.26, 0.18, 0.04, 0x4a3530, 0, 0.2, 0.25, 0.35), soft(0.8, 0.05, 0.14, WOOD, 0, 0.34, 0.33, 0.3),
      C(0.24, 0.2, 0.28, CU, -0.08, 0.65, -0.05, 18), ring(0.24, 0.025, 0xf0a070, -0.08, 0.79, -0.05, H, TAU, 22, 4), dome(0.22, 0xf0a070, -0.08, 0.79, -0.05, 1, 0.35, 1, 16, 4),
      B(0.035, WOODD, -0.08, 0.875, -0.05, 1, 0.8, 1, 8, 5), ...[-1, 1].map(s => ring(0.05, 0.014, 0xc96f4e, -0.08 + s * 0.25, 0.7, -0.05, 0, TAU, 10, 4, H)),
      stick([0.22, 0.52, -0.1], [0.3, 0.95, -0.2], 0.014, WOOD, 6), B(0.04, WOOD, 0.3, 0.97, -0.2, 1, 1.5, 0.6, 8, 5),
    ];
    [[-0.26, RED], [-0.04, 0x9b4bb5], [0.18, 0xff6b8a]].forEach(([x, c]) => p.push(C(0.055, 0.055, 0.12, 0xe6f4fb, x, 0.42, 0.33, 12), C(0.05, 0.05, 0.09, c, x, 0.41, 0.33, 12),
      C(0.058, 0.058, 0.02, WHITE, x, 0.485, 0.33, 12), B(0.07, c === RED ? 0xff8fab : SKY, x, 0.49, 0.33, 1, 0.3, 1, 8, 4)));
    return [p, [soft(0.2, 0.12, 0.02, 0, 0, 0.19, 0.27, 0.4)]];
  },
  m_kaese() {
    const p = [soft(0.8, 0.08, 0.62, WOODD, 0, 0.04, 0, 0.3), soft(0.08, 1.0, 0.1, WOOD, -0.32, 0.54, -0.05, 0.3), soft(0.08, 1.0, 0.1, WOOD, 0.32, 0.54, -0.05, 0.3),
      soft(0.78, 0.1, 0.12, WOOD, 0, 1.0, -0.05, 0.3), C(0.19, 0.19, 0.24, WOODL, 0, 0.2, -0.05, 16), ring(0.192, 0.012, 0x8a939e, 0, 0.12, -0.05, H, TAU, 18, 3), ring(0.192, 0.012, 0x8a939e, 0, 0.28, -0.05, H, TAU, 18, 3),
      C(0.17, 0.17, 0.04, WOOD, 0, 0.34, -0.05, 16), C(0.02, 0.02, 0.7, 0x5a5a66, 0, 0.7, -0.05, 6)];
    for (let i = 0; i < 6; i++) p.push(ring(0.024, 0.006, 0x7a7a88, 0, 0.45 + i * 0.07, -0.05, H, TAU, 8, 3));
    p.push(stick([-0.2, 1.1, -0.05], [0.2, 1.1, -0.05], 0.018, WOODD, 8), B(0.035, RED, -0.21, 1.1, -0.05, 1, 1, 1, 8, 6), B(0.035, RED, 0.21, 1.1, -0.05, 1, 1, 1, 8, 6), C(0.03, 0.03, 0.1, WOODD, 0, 1.07, -0.05, 8));
    p.push(C(0.13, 0.13, 0.09, 0xffd23f, 0.22, 0.13, 0.22, 16), ring(0.13, 0.012, 0xffc21a, 0.22, 0.13, 0.22, H, TAU, 18, 3),
      soft(0.12, 0.07, 0.07, 0xffe066, -0.24, 0.115, 0.22, 0.6, 0.5), B(0.012, 0xe0b020, -0.24, 0.13, 0.255, 1, 1, 0.4, 5, 3), B(0.01, 0xe0b020, -0.21, 0.1, 0.255, 1, 1, 0.4, 5, 3));
    return p;
  },
  m_web() {
    const p = [];
    for (const x of [-0.42, 0.42]) p.push(soft(0.07, 1.0, 0.07, WOOD, x, 0.5, -0.18, 0.3), soft(0.07, 0.56, 0.07, WOOD, x, 0.28, 0.24, 0.3), soft(0.06, 0.06, 0.48, WOODD, x, 0.18, 0.03, 0.3));
    p.push(C(0.04, 0.04, 0.92, WOODD, 0, 0.98, -0.18, 10, false, 0, 0, H), C(0.045, 0.045, 0.92, WOODD, 0, 0.55, 0.24, 10, false, 0, 0, H),
      soft(0.86, 0.05, 0.06, WOOD, 0, 0.75, -0.02, 0.3), C(0.06, 0.06, 0.74, 0xff8fab, 0, 0.55, 0.24, 14, false, 0, 0, H));
    const cols = [0xff8fab, LILA, MINT, BUTTER, SKY];
    for (let i = 0; i < 11; i++) { const x = -0.33 + i * 0.066; p.push(stick([x, 0.96, -0.16], [x, 0.58, 0.2], 0.006, cols[i % 5], 3)); }
    // gewebtes Stück liegt schräg auf den Kettfäden (vorne unten -> hinten oben)
    const at = (t, o = 0) => [0.58 + 0.38 * t + o * 0.69, 0.2 - 0.36 * t + o * 0.73];
    p.push(soft(0.68, 0.016, 0.2, 0xff8fab, 0, ...at(0.19, 0.008), 0.3, 0, 0.81));
    for (const t of [0.1, 0.22, 0.34]) { const [y, z] = at(t, 0.018); p.push(stick([-0.33, y, z], [0.33, y, z], 0.008, t > 0.3 ? MINT : LILA, 3)); }
    p.push(soft(0.24, 0.035, 0.06, WOODL, 0.1, ...at(0.5, 0.03), 0.5, 0.1, 0.81));
    p.push(C(0.12, 0.1, 0.1, WOODL, 0.3, 0.05, 0.36, 12, true), ...[[0.27, 0.12, 0.34, 0xff8fab], [0.34, 0.12, 0.38, MINT], [0.3, 0.16, 0.4, BUTTER]].map(([x, y, z, c]) => B(0.05, c, x, y, z, 1, 1, 1, 8, 6)));
    return p;
  },
  m_oel() {
    const p = [soft(0.72, 0.28, 0.62, 0xa8a39c, 0, 0.14, -0.02, 0.25), soft(0.74, 0.05, 0.64, 0xc4bfb8, 0, 0.28, -0.02, 0.3),
      C(0.21, 0.23, 0.42, 0xb5844f, 0, 0.5, -0.06, 16), ...[0.35, 0.5, 0.65].map(y => ring(0.225 - (y - 0.35) * 0.05, 0.014, 0x6b6b78, 0, y, -0.06, H, TAU, 18, 3)),
      C(0.19, 0.19, 0.03, 0xffd23f, 0, 0.71, -0.06, 16), C(0.025, 0.025, 0.5, 0x5a5a66, 0, 0.92, -0.06, 6)];
    for (let i = 0; i < 5; i++) p.push(ring(0.03, 0.006, 0x7a7a88, 0, 0.78 + i * 0.06, -0.06, H, TAU, 8, 3));
    p.push(ring(0.17, 0.018, WOODD, 0, 1.12, -0.06, H, TAU, 20, 4));
    for (let i = 0; i < 4; i++) { const a = i * H + 0.4; p.push(stick([0, 1.12, -0.06], [Math.sin(a) * 0.17, 1.12, -0.06 + Math.cos(a) * 0.17], 0.012, WOODD, 5)); }
    p.push(B(0.03, RED, 0, 1.17, -0.06, 1, 1, 1, 8, 6), C(0.022, 0.028, 0.13, BRASS, 0, 0.52, 0.2, 8, false, H + 0.5), B(0.016, 0xffc83a, 0, 0.455, 0.255, 1, 1.5, 1, 8, 5));
    p.push(C(0.045, 0.05, 0.09, 0xffc83a, 0, 0.35, 0.25, 12), C(0.018, 0.035, 0.04, 0xffc83a, 0, 0.415, 0.25, 10), C(0.047, 0.047, 0.035, WHITE, 0, 0.35, 0.25, 12, true));
    p.push(C(0.065, 0.065, 0.015, 0x7a4a24, -0.2, 0.15, 0.3, 12, false, H), bloom(0.11, 0xffc21f, -0.2, 0.15, 0.293, 10, 0, 0.012, H));
    return p;
  },
};

// ---------- Zwischenspeicher + Ausgabe ----------
const cache = new Map();
function make(key, fn) {
  if (!cache.has(key)) {
    const r = fn(), [p, gl] = Array.isArray(r[0]) ? r : [r, []];
    cache.set(key, [merge(p), gl.length ? merge(gl) : null]);
  }
  const [geo, glow] = cache.get(key), g = new THREE.Group(), m = new THREE.Mesh(geo, MAT);
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  if (glow) g.add(new THREE.Mesh(glow, GLOW));
  return g;
}
const missing = () => [box(0.5, 0.5, 0.5, 0xff00ff, 0, 0.25, 0)];

export function crop(k, st) {
  return make('c' + k + st, () => { seed = 7; return st === 0 ? sprout(k) : CROP[k] ? CROP[k](st) : missing(); });
}
export function placeable(k, ready) {
  return make('p' + k + (ready ? 1 : 0), () => (PLACE[k] ? PLACE[k](!!ready) : missing()));
}
