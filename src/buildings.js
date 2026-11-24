// Gebäude im Kuschel-Stil: weiche Kanten, Steinsockel, Holzbalken, Schindeldächer, Blumenkästen, Laternen.
// Modelle stehen in Weltkoordinaten (Grundflächen: data.js BUILDINGS), die Kamera schaut von Süden (+z) schräg herab.
// Pro (id, Stufe, Jahreszeit) wird EINMAL gebaut: ein MAT-Mesh + ein GLOW-Mesh (Fenster, Laternen, Glut); Kopien teilen die Geometrie.
import * as THREE from '../vendor/three.module.min.js';
import { MAT, GLOW, merge, box, ball, cyl, cone } from './models.js';
import { model } from './assets.js';

const PI = Math.PI, H = PI / 2;
const SNOW = 0xfbfdff, ICE = 0xdcf1ff, PLASTER = 0xfff0dc, TIMBER = 0x93613d, STONE = 0xc6bdb2, STONE_D = 0xa2998f,
  WOOD = 0xc99260, WOODL = 0xe3b47c, WOODD = 0x8f603c, CREAM = 0xfff7ea, DARK = 0x45332f, IRON = 0x5d5862, BRASS = 0xf0c45a,
  LEAF = 0x6cc06a, PINE = 0x3e8a5c, TERRA = 0xe08a62, PINK = 0xffb7c8, ROSE = 0xff8fab, LILA = 0xcdb8f5, BERRY = 0xe23d4a,
  HAY = 0xf2cf6b, ORANGE = 0xff8a2a, MINT = 0x8fcdb4;
const FLOWERS = {
  spring: [0xffb7d0, 0xffffff, 0xcdb8f5, 0xffe39a], summer: [0xff6b8a, 0xffd23f, 0xffffff, 0xb39cff],
  autumn: [0xff8a3d, 0xd9483b, 0xffc145, 0xb5473a],
};

let seed = 1;
const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
const jit = a => (rnd() * 2 - 1) * a;
const vary = (c, l = 0.04) => new THREE.Color(c).offsetHSL(jit(0.006), jit(0.03), jit(l));
const shade = (c, l) => new THREE.Color(c).offsetHSL(0, 0, l);

// ---------- Grundformen ----------
function place(g, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return { g, c };
}
// Klotz mit abgefasten Kanten (44 Dreiecke): jede Ecke einer Seite trägt deren Normale,
// so verlaufen die Normalen über die Fase -> sieht rund aus. Ergebnis wird für alle Maße wiederverwendet.
const RB = (() => {
  const pos = [], nrm = [], idx = [], id = {};
  const v = (a, s, sb, sc) => {
    const k = [a, s, sb, sc].join();
    if (!(k in id)) {
      const p = [0, 0, 0], n = [0, 0, 0], b = (a + 1) % 3, c = (a + 2) % 3;
      p[a] = s; p[b] = sb; p[c] = sc; n[a] = s;
      id[k] = pos.length / 6;
      pos.push(...p, ...[0, 1, 2].map(i => (i === a ? 0 : 1))); // Ecke + Maske (welche Achsen um r eingerückt werden)
      nrm.push(...n);
    }
    return id[k];
  };
  const P = i => [0, 1, 2].map(k => pos[i * 6 + k] * (1 - 0.3 * pos[i * 6 + 3 + k]));
  const tri = (i, j, k) => { // nach außen drehen
    const [a, b, c] = [P(i), P(j), P(k)], u = b.map((x, q) => x - a[q]), w = c.map((x, q) => x - a[q]);
    const cr = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    idx.push(...(cr[0] * (a[0] + b[0] + c[0]) + cr[1] * (a[1] + b[1] + c[1]) + cr[2] * (a[2] + b[2] + c[2]) > 0 ? [i, j, k] : [i, k, j]));
  };
  const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
  for (let a = 0; a < 3; a++) for (const s of [-1, 1]) quad(v(a, s, -1, -1), v(a, s, 1, -1), v(a, s, 1, 1), v(a, s, -1, 1));
  // Kanten: Seite a (Vorzeichen sa) trifft Seite b (sb), entlang Achse c
  const corner = (a, s, p) => { const b = (a + 1) % 3, c = (a + 2) % 3; return v(a, s, p[b], p[c]); };
  for (let a = 0; a < 3; a++) {
    const b = (a + 1) % 3, c = (a + 2) % 3;
    for (const sa of [-1, 1]) for (const sb of [-1, 1]) {
      const p0 = [0, 0, 0], p1 = [0, 0, 0];
      p0[a] = p1[a] = sa; p0[b] = p1[b] = sb; p0[c] = -1; p1[c] = 1;
      quad(corner(a, sa, p0), corner(a, sa, p1), corner(b, sb, p1), corner(b, sb, p0));
    }
  }
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) { const p = [sx, sy, sz]; tri(corner(0, sx, p), corner(1, sy, p), corner(2, sz, p)); }
  return { pos, nrm, idx };
})();
function rb(w, h, d, c, x = 0, y = 0, z = 0, r = 0.05, ry = 0, rx = 0, rz = 0) {
  const hs = [w / 2, h / 2, d / 2], n = RB.pos.length / 6, a = new Float32Array(n * 3);
  r = Math.max(0.002, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) a[i * 3 + k] = RB.pos[i * 6 + k] * (hs[k] - r * RB.pos[i * 6 + 3 + k]);
  const g = new THREE.BufferGeometry(); // ohne .parameters -> merge() behält die weichen Normalen
  g.setAttribute('position', new THREE.BufferAttribute(a, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(RB.nrm, 3));
  g.setIndex(RB.idx);
  return place(g, c, x, y, z, rx, ry, rz);
}
// Halbe Scheibe (Rundbogen), flache Seite unten, Dicke entlang z; down: Bogen nach unten
const semi = (r, d, c, x, y, z, down = false) => place(new THREE.CylinderGeometry(r, r, d, 16, 1, false, -H, PI), c, x, y, z, down ? H : -H);
const disc = (r, d, c, x, y, z, seg = 16) => cyl(r, r, d, c, x, y, z, seg, H);
const arc = (R, t, c, x, y, z, a = PI, ry = 0) => place(new THREE.TorusGeometry(R, t, 4, a > 4 ? 14 : 8, a), c, x, y, z, 0, ry);
// Schindel: nur Ober- und Unterkante-Vorderseite (der Rest liegt verdeckt) -> 4 Dreiecke
const SH_P = [-1, 1, -1, -1, 1, 1, 1, 1, 1, -1, 1, -1, 1, 1, 1, 1, 1, -1, -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, -1, 1, 1, 1, 1, -1, 1, 1].map(v => v / 2);
const SH_N = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1];
function shingle(w, h, d, c, x, y, z, ry, rx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(SH_P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(SH_N, 3));
  g.scale(w, h, d);
  return place(g, c, x, y, z, rx, ry);
}
const heart = (s, c, x, y, z) => [ball(s * 0.3, c, x - s * 0.21, y + s * 0.08, z, 1, 1, 0.25, 6), ball(s * 0.3, c, x + s * 0.21, y + s * 0.08, z, 1, 1, 0.25, 6),
  box(s * 0.5, s * 0.5, s * 0.15, c, x, y - s * 0.12, z, 0, 0, PI / 4)];
// Balken von Punkt a nach b
function beam(a, b, t, c, td = t) {
  const v = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), g = new THREE.BoxGeometry(t, v.length(), td);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()));
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return { g, c };
}
const M4 = new THREE.Matrix4();
function tf(parts, x, y, z, ry = 0) {
  M4.makeRotationY(ry).setPosition(x, y, z);
  for (const p of parts) p.g.applyMatrix4(M4);
  return parts;
}
// Teile im lokalen Raum bauen (Vorderseite +z) und an (x,y,z) mit Drehung ry setzen
function at(P, G, x, y, z, ry, fn) {
  const p = [], g = [];
  fn(p, g);
  P.push(...tf(p, x, y, z, ry));
  G.push(...tf(g, x, y, z, ry));
}

// ---------- Dächer ----------
// Schindelreihen auf einer Dachfläche von Traufe (za,ya) hinauf bis (zb,yb); Fläche schaut nach +z, Länge L entlang x
function slope(p, L, za, ya, zb, yb, col, o) {
  const S = Math.hypot(zb - za, yb - ya), a = Math.atan2(yb - ya, za - zb), uz = (zb - za) / S, uy = (yb - ya) / S, nz = Math.sin(a), ny = Math.cos(a);
  const pt = (v, n) => [ya + uy * v + ny * n, za + uz * v + nz * n];
  let [y, z] = pt(S / 2, -0.04);
  p.push(box(L, 0.08, S, shade(col, -0.22), 0, y, z, 0, a));
  const sw = o.sw || 0.3, st = o.st || 0.2, th = 0.045, tilt = 0.12;
  for (let i = 0, v0 = -0.07; v0 < S - 0.04; i++, v0 += st) {
    for (let x0 = -L / 2 - (i % 2) * sw / 2; x0 < L / 2 - 0.04; x0 += sw) {
      const xa = Math.max(x0, -L / 2), xb = Math.min(x0 + sw, L / 2);
      if (xb - xa < 0.07) continue;
      const lo = v0 + rnd() * 0.035, hi = Math.min(v0 + st * 1.5, S + 0.01), len = hi - lo;
      [y, z] = pt((lo + hi) / 2, th / 2 + tilt * len / 2); // Unterkante gehoben -> sichtbare Stufen
      p.push(shingle(xb - xa - 0.022, th, len, rnd() < 0.12 ? vary(shade(col, 0.06), 0.03) : vary(col, 0.045), (xa + xb) / 2, y, z, 0, a - tilt));
    }
  }
  if (o.trim) for (const s of [-1, 1]) { [y, z] = pt(S / 2, 0.03); p.push(box(0.07, 0.16, S + 0.08, o.trim, s * (L / 2 + 0.035), y, z, 0, a)); }
  if (o.snow) {
    [y, z] = pt(S / 2 + 0.02, th + 0.1);
    p.push(rb(L - 0.1, 0.12, S + 0.02, SNOW, 0, y, z, 0.06, 0, a));
    for (let x = -L / 2 + 0.16; o.lumps !== false && x < L / 2 - 0.1; x += 0.3 + jit(0.05)) {
      [y, z] = pt(0.03, th + 0.09);
      p.push(ball(0.1 + jit(0.02), SNOW, x, y, z, 1.5, 0.75, 1.1, 6));
      if (o.ice && rnd() < 0.55) { const h = 0.09 + rnd() * 0.12; p.push(cone(0.022, h, ICE, x + 0.07, ya - 0.03 - h / 2, za + 0.02, 6, PI)); }
    }
  }
}
// Dach aus Profil [[z,y] von Traufe bis First] (Satteldach: 2 Punkte, Mansarddach: 3), First entlang x, beidseitig
function roofOf(L, prof, col, o = {}) {
  const side = () => {
    const q = [];
    for (let i = 1; i < prof.length; i++) slope(q, L, ...prof[i - 1], ...prof[i], col, { ...o, ice: o.snow && i === 1, lumps: i === 1 && o.lumps });
    return q;
  };
  const top = prof[prof.length - 1][1], p = side();
  if (o.back) { const sw = o.sw || 0.3, st = o.st || 0.2; o = { ...o, sw: sw * 1.45, st: st * 1.45, lumps: false }; } // Rückseite sieht man kaum
  p.push(...tf(side(), 0, 0, 0, PI));
  p.push(cyl(0.075, 0.075, L + 0.1, o.ridge ?? shade(col, -0.08), 0, top + 0.05, 0, 10, 0, 0, H));
  if (o.snow) p.push(ball(1, SNOW, 0, top + 0.1, 0, L / 2 + 0.02, 0.1, 0.17, 8));
  return p;
}
// Giebelfüllung unter der Dachunterseite über einer Wand der Tiefe Dw (entlang x extrudiert, Länge Lw).
// h(z) = Höhe der Dachunterseite, yw = Wandhöhe an der Traufseite (relativ zur Traufe)
function fill(Lw, Dw, prof, col) {
  const pts = [[Dw / 2, 0]];
  for (let i = 1; i < prof.length; i++) {
    const [z0, y0] = prof[i - 1], [z1, y1] = prof[i], off = 0.09 / Math.cos(Math.atan2(y1 - y0, z0 - z1));
    if (z0 >= Dw / 2 && z1 < Dw / 2) pts.push([Dw / 2, y0 + (y1 - y0) * (z0 - Dw / 2) / (z0 - z1) - off]);
    if (z1 < Dw / 2) pts.push([z1, y1 - off]);
  }
  const all = [...pts, ...pts.slice(0, -1).reverse().map(([z, y]) => [-z, y])];
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(all.map(([z, y]) => new THREE.Vector2(z, y))), { depth: Lw, bevelEnabled: false });
  g.rotateY(H);
  g.translate(-Lw / 2, 0, 0);
  const h = z => {
    z = Math.abs(z);
    for (let i = 2; i < pts.length; i++) if (z >= pts[i][0]) return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * (pts[i - 1][0] - z) / (pts[i - 1][0] - pts[i][0]);
    return pts[pts.length - 1][1];
  };
  return { p: { g, c: col }, yw: pts[1][1], h };
}
// Kegeldach mit Schindelringen (Turm)
function coneRoof(p, R, Hc, col, snow) {
  const S = Math.hypot(R, Hc), a = Math.atan2(Hc, R), st = 0.17, th = 0.045, tilt = 0.12;
  p.push(cone(R - 0.03, Hc, shade(col, -0.2), 0, Hc / 2, 0, 18));
  for (let i = 0, v0 = -0.07; v0 < S - 0.14; i++, v0 += st) {
    const len = Math.min(st * 1.5, S - v0), vm = v0 + len / 2, r = R * (1 - vm / S), y = Hc * vm / S, off = th / 2 + tilt * len / 2;
    const n = Math.max(5, Math.round(2 * PI * r / 0.24)), w = 2 * PI * r / n + 0.01;
    for (let k = 0; k < n; k++) {
      const f = (k + (i % 2) * 0.5) / n * 2 * PI, rr = r + Math.sin(a) * off;
      p.push(shingle(w, th, len, vary(col, 0.045), Math.sin(f) * rr, y + Math.cos(a) * off, Math.cos(f) * rr, f, a - tilt));
    }
  }
  if (snow) p.push(cone(R * 0.78, Hc * 0.78, SNOW, 0, Hc * 0.61 + 0.08, 0, 16), cyl(R * 0.8, R * 0.78, 0.06, SNOW, 0, Hc * 0.22 + 0.06, 0, 16));
}

// ---------- Kleinteile (lokal, Vorderseite +z) ----------
// halber Bruchstein (nur die sichtbare Vorderhälfte, facettiert), schaut nach +z bzw. ry
const stone = (w, h, d, c, x, y, z, ry = 0) => place(new THREE.SphereGeometry(0.5, 5, 3, 0, PI).scale(w, h, d * 2), c, x, y, z, 0, ry);
// Bruchsteine auf einer Sockelseite: Länge len entlang x, Höhe h ab y=0, Front bei z=0
function stones(p, len, h, rows = 2) {
  const rh = h / rows;
  for (let r = 0; r < rows; r++) for (let x = -len / 2 + (r % 2 ? 0.1 : 0.02); x < len / 2 - 0.08;) {
    const w = 0.22 + rnd() * 0.14, cx = Math.min(x + w / 2, len / 2 - w / 2);
    p.push(stone(w * 0.92, rh * 0.92, 0.09, vary(STONE, 0.07), cx, rh * (r + 0.5) + jit(0.01), 0));
    x += w;
  }
}
// Senkrechte Bretter vor einer Giebelwand: Breite W, von y0 bis top(x)
function boards(p, W, y0, top, col, bw = 0.2) {
  const n = Math.round(W / bw), w = W / n;
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + (i + 0.5) * w, y1 = Math.min(top(x - w / 2), top(x + w / 2)) - 0.02;
    p.push(box(w - 0.025, y1 - y0, 0.04, vary(col, 0.05), x, (y0 + y1) / 2, 0.02));
  }
}
function flowerBox(p, w, s, y, z) {
  p.push(rb(w, 0.16, 0.2, 0xb27a4c, 0, y, z, 0.03), box(w + 0.01, 0.025, 0.21, 0x9a663e, 0, y - 0.03, z));
  if (s === 'winter') {
    p.push(rb(w + 0.02, 0.06, 0.21, SNOW, 0, y + 0.1, z, 0.03));
    for (let x = -w / 2 + 0.1; x < w / 2 - 0.05; x += 0.15) p.push(cone(0.055, 0.15, PINE, x, y + 0.17, z - 0.02, 6), ball(0.025, BERRY, x + 0.05, y + 0.15, z + 0.06, 1, 1, 1, 6));
    return;
  }
  const F = FLOWERS[s] || FLOWERS.summer;
  for (let x = -w / 2 + 0.08; x < w / 2 - 0.04; x += 0.135) p.push(ball(0.075, vary(LEAF, 0.06), x, y + 0.1, z + jit(0.03), 1, 0.75, 1, 6));
  for (let x = -w / 2 + 0.11, i = 0; x < w / 2 - 0.06; x += 0.15, i++) p.push(ball(0.05, F[i % F.length], x + jit(0.02), y + 0.17 + jit(0.02), z + 0.03 + jit(0.03), 1, 1, 1, 5));
}
// Fenster: Glasmitte im Ursprung. o: w, h, frame, curtain, shut (Farbe), box, cross ('x' = Stallfenster), s
function win(p, g, o) {
  const { w = 0.6, h = 0.7, frame = CREAM } = o, f = 0.08;
  g.push(box(w, h, 0.04, 0, 0, 0, 0));
  p.push(rb(w + 2 * f, f, 0.14, frame, 0, h / 2 + f / 2, 0.02, 0.03), rb(w + 0.24, 0.07, 0.2, frame, 0, -h / 2 - 0.035, 0.05, 0.03),
    rb(f, h, 0.14, frame, -w / 2 - f / 2, 0, 0.02, 0.025), rb(f, h, 0.14, frame, w / 2 + f / 2, 0, 0.02, 0.025));
  if (o.cross === 'x') p.push(beam([-w / 2, -h / 2, 0.05], [w / 2, h / 2, 0.05], 0.04, frame, 0.03), beam([w / 2, -h / 2, 0.05], [-w / 2, h / 2, 0.05], 0.04, frame, 0.03));
  else p.push(box(0.035, h, 0.03, frame, 0, 0, 0.055), box(w, 0.035, 0.03, frame, 0, h * 0.12, 0.055));
  if (o.curtain) {
    const c = o.curtain;
    for (const sx of [-1, 1]) p.push(box(w * 0.26, h * 0.55, 0.025, c, sx * w * 0.36, h * 0.2, 0.03), box(w * 0.15, h * 0.42, 0.025, c, sx * w * 0.42, -h * 0.26, 0.03),
      box(w * 0.2, 0.025, 0.03, shade(c, -0.12), sx * w * 0.38, -h * 0.06, 0.035));
    p.push(box(w, 0.08, 0.03, c, 0, h / 2 - 0.04, 0.04));
    for (let i = 0; i < 4; i++) p.push(ball(0.04, c, -w * 0.375 + i * w * 0.25, h / 2 - 0.09, 0.04, 1, 0.75, 0.4, 5));
  }
  if (o.shut) for (const sx of [-1, 1]) {
    const x = sx * (w / 2 + f + 0.125), c = o.shut;
    p.push(rb(0.23, h + 0.06, 0.04, c, x, 0, 0.0, 0.02));
    for (const y of [-0.32, -0.12, 0.08]) p.push(box(0.16, 0.018, 0.012, shade(c, -0.12), x, y * h, 0.022));
    p.push(...heart(0.09, shade(c, -0.25), x, h * 0.3, 0.02));
  }
  if (o.box) flowerBox(p, w + 0.22, o.s, -h / 2 - 0.15, 0.13);
  if (o.s === 'winter') p.push(rb(w + 0.24, 0.06, 0.18, SNOW, 0, h / 2 + f + 0.02, 0.04, 0.03));
}
function roundWin(p, g, r, frame = CREAM) {
  g.push(disc(r, 0.04, 0, 0, 0, 0));
  p.push(arc(r + 0.025, 0.04, frame, 0, 0, 0.02, 2 * PI), box(0.03, 2 * r, 0.03, frame, 0, 0, 0.04), box(2 * r, 0.03, 0.03, frame, 0, 0, 0.04));
}
// Wandlaterne: Wandplatte bei z=0, Laterne hängt bei z≈0.22 knapp unter y=0
function lantern(p, g, s) {
  p.push(rb(0.1, 0.17, 0.03, IRON, 0, 0.03, 0.015, 0.012), box(0.03, 0.03, 0.23, IRON, 0, 0.08, 0.12), box(0.018, 0.06, 0.018, IRON, 0, 0.05, 0.22),
    cone(0.1, 0.09, IRON, 0, -0.03, 0.22, 6), ball(0.025, IRON, 0, 0.025, 0.22, 1, 1, 1, 6), cyl(0.07, 0.05, 0.035, IRON, 0, -0.25, 0.22, 6));
  for (let k = 0; k < 3; k++) { const f = k / 3 * 2 * PI + 0.5; p.push(box(0.014, 0.16, 0.014, IRON, Math.sin(f) * 0.066, -0.155, 0.22 + Math.cos(f) * 0.066)); }
  g.push(cyl(0.06, 0.05, 0.15, 0, 0, -0.155, 0.22, 6));
  if (s === 'winter') p.push(ball(0.085, SNOW, 0, 0.0, 0.22, 1.1, 0.45, 1.1, 7));
}
// Lichterkette mit Durchhang zwischen x0 und x1
function garland(p, g, x0, x1, y, z, sag = 0.12, span = 1.1) {
  const n = Math.max(1, Math.round((x1 - x0) / span)), seg = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    let prev = null;
    for (let k = 0; k <= 6; k++) {
      const t = k / 6, q = [x0 + (i + t) * seg, y - sag * Math.sin(PI * t), z];
      if (prev) p.push(beam(prev, q, 0.014, 0x55524a));
      if (k % 6) g.push(ball(0.034, 0, q[0], q[1] - 0.035, z, 1, 1.25, 1, 4));
      prev = q;
    }
  }
}
function pumpkin(p, x, y, z, s = 1) {
  s *= 1.3;
  for (let k = 0; k < 5; k++) { const f = k / 5 * 2 * PI; p.push(ball(0.1 * s, k % 2 ? ORANGE : 0xf07a1e, x + Math.sin(f) * 0.06 * s, y + 0.1 * s, z + Math.cos(f) * 0.06 * s, 1, 0.9, 1, 7)); }
  p.push(cyl(0.015 * s, 0.022 * s, 0.08 * s, 0x6b7f2f, x, y + 0.22 * s, z, 6), ball(0.035 * s, LEAF, x + 0.05 * s, y + 0.2 * s, z, 1.3, 0.4, 1, 6));
}
function pot(p, x, y, z, s) {
  p.push(cyl(0.13, 0.1, 0.22, TERRA, x, y + 0.11, z, 10), cyl(0.145, 0.145, 0.045, shade(TERRA, 0.05), x, y + 0.21, z, 10));
  if (s === 'winter') p.push(cone(0.13, 0.36, PINE, x, y + 0.4, z, 8), ball(0.11, SNOW, x, y + 0.26, z, 1.2, 0.4, 1.2, 7), ball(0.035, BERRY, x + 0.06, y + 0.36, z + 0.07, 1, 1, 1, 6));
  else if (s === 'autumn') pumpkin(p, x, y + 0.2, z, 0.9);
  else {
    const F = FLOWERS[s];
    p.push(ball(0.16, vary(LEAF), x, y + 0.36, z, 1, 0.9, 1, 7), ball(0.11, vary(LEAF), x + 0.08, y + 0.44, z + 0.04, 1, 1, 1, 6));
    for (let k = 0; k < 5; k++) { const f = k * 1.3; p.push(ball(0.045, F[k % F.length], x + Math.sin(f) * 0.13, y + 0.4 + (k % 2) * 0.08, z + Math.cos(f) * 0.13, 1, 1, 1, 6)); }
  }
}
function wreath(p, x, y, z) {
  p.push(arc(0.16, 0.055, PINE, x, y, z, 2 * PI));
  for (let k = 0; k < 6; k++) { const f = k / 6 * 2 * PI + 0.3; p.push(ball(0.028, BERRY, x + Math.cos(f) * 0.16, y + Math.sin(f) * 0.16, z + 0.05, 1, 1, 1, 5)); }
  p.push(ball(0.045, BERRY, x - 0.05, y - 0.16, z + 0.05, 1.3, 0.8, 0.6, 7), ball(0.045, BERRY, x + 0.05, y - 0.16, z + 0.05, 1.3, 0.8, 0.6, 7));
}

// ---------- Bauernhaus ----------
function house(l, s, P, G) {
  l = Math.max(1, Math.min(3, l));
  const W = l === 1 ? 4.2 : 4.8, D = 3.2, cz = -10.5, zf = cz + D / 2, top = 2.2, Dr = D + 0.75, Hh = 1.45, snow = s === 'winter';
  const xl = l === 3 ? -1.95 : -W / 2, xr = W / 2, bw = xr - xl, bx = (xl + xr) / 2;
  const roofC = [0, 0xe5735c, 0xd95f66, 0x6d8fd8][l], doorC = [0, 0xa86f44, 0x6fb5a3, 0xe88a9a][l], prof = [[Dr / 2, 0], [0, Hh]];
  const gf = fill(bw, D, prof, PLASTER), wallH = top + gf.yw;
  // Sockel und Wände
  P.push(rb(bw + 0.16, 0.34, D + 0.16, STONE_D, bx, 0.17, cz, 0.05), rb(bw, wallH - 0.3, D, PLASTER, bx, 0.3 + (wallH - 0.3) / 2, cz, 0.05), ...tf([gf.p], bx, top, cz));
  at(P, G, bx, 0, zf + 0.08, 0, p => stones(p, bw + 0.16, 0.34));
  at(P, G, xr + 0.08, 0, cz, H, p => stones(p, D + 0.16, 0.34));
  if (l < 3) at(P, G, xl - 0.08, 0, cz, -H, p => stones(p, D + 0.16, 0.34));
  // Fachwerk
  for (const x of [xl, xr]) for (const z of [cz - D / 2, zf]) P.push(rb(0.15, wallH - 0.32, 0.15, TIMBER, x, 0.3 + (wallH - 0.32) / 2, z, 0.03));
  P.push(rb(bw + 0.1, 0.13, 0.09, TIMBER, bx, wallH - 0.08, zf + 0.03, 0.03));
  for (const [a, b] of [[xl, -0.58], [0.58, xr]]) P.push(rb(b - a, 0.11, 0.08, TIMBER, (a + b) / 2, 0.4, zf + 0.03, 0.03));
  for (const sx of l === 3 ? [1] : [-1, 1]) at(P, G, sx > 0 ? xr : xl, top, cz, sx * H, (p, g) => {
    p.push(rb(D + 0.1, 0.12, 0.08, TIMBER, 0, gf.yw - 0.02, 0.03, 0.03));
    for (const z of [-0.6, 0.6]) p.push(rb(0.1, gf.h(z) - gf.yw, 0.08, TIMBER, z, (gf.h(z) + gf.yw) / 2, 0.03, 0.025));
    p.push(beam([-D / 2 + 0.1, gf.yw, 0.03], [-0.6, gf.h(0.6) - 0.1, 0.03], 0.08, TIMBER), beam([D / 2 - 0.1, gf.yw, 0.03], [0.6, gf.h(0.6) - 0.1, 0.03], 0.08, TIMBER));
    at(p, g, 0, gf.yw + 0.48, 0.02, 0, (pp, gg) => roundWin(pp, gg, 0.17));
    at(p, g, 0, 1.3 - top, 0, 0, (pp, gg) => win(pp, gg, { w: 0.5, h: 0.6, curtain: LILA, s }));
  });
  // Dach + Schornstein (Rauch kommt bei (1.3, 3.9, -11))
  const rl = l === 3 ? xl : xl - 0.25, rr = xr + 0.25;
  P.push(...tf(roofOf(rr - rl, prof, roofC, { snow, trim: CREAM, back: true, sw: 0.32, st: 0.21 }), (rl + rr) / 2, top, cz));
  P.push(rb(0.5, 1.35, 0.46, STONE_D, 1.3, 3.17, -11, 0.04), rb(0.62, 0.1, 0.58, shade(STONE_D, -0.14), 1.3, 3.895, -11, 0.03), cyl(0.09, 0.11, 0.15, TERRA, 1.3, 4.0, -11, 10));
  at(P, G, 1.3, 3.3, -11 + 0.23, 0, p => stones(p, 0.5, 0.54, 3));
  if (snow) P.push(ball(0.3, SNOW, 1.3, 3.95, -11, 1.05, 0.25, 0.98, 9));
  // Tür mit Steinbogen, Stufen, Laterne
  at(P, G, 0, 0, zf, 0, (p, g) => {
    p.push(rb(0.8, 1.02, 0.06, doorC, 0, 0.81, 0.03, 0.02), semi(0.4, 0.06, doorC, 0, 1.3, 0.03));
    for (const x of [-0.2, 0, 0.2]) { const t = 1.3 + Math.sqrt(0.16 - x * x) - 0.05; p.push(box(0.02, t - 0.32, 0.012, shade(doorC, -0.13), x, (t + 0.32) / 2, 0.065)); }
    for (const y of [0.55, 1.12]) p.push(box(0.42, 0.05, 0.014, IRON, -0.17, y, 0.068), ball(0.03, IRON, 0.04, y, 0.07, 1, 1, 0.5, 6));
    p.push(ball(0.045, BRASS, 0.28, 0.86, 0.1, 1, 1, 1, 8), rb(0.06, 0.11, 0.02, BRASS, 0.28, 0.74, 0.07, 0.01), ...heart(0.27, shade(doorC, -0.2), 0, 1.4, 0.058));
    g.push(...heart(0.2, 0, 0, 1.4, 0.075));
    for (let k = 0; k <= 8; k++) { const t = k / 8 * PI; p.push(rb(0.16, 0.15, 0.1, vary(STONE, 0.06), Math.cos(t) * 0.49, 1.3 + Math.sin(t) * 0.49, 0.05, 0.03, 0, 0, t)); }
    for (const sx of [-1, 1]) for (let j = 0; j < 3; j++) p.push(rb(0.16, 0.3, 0.1, vary(STONE, 0.06), sx * 0.49, 0.48 + j * 0.31, 0.05, 0.03));
    if (l === 1) p.push(rb(1.15, 0.3, 0.32, STONE, 0, 0.15, 0.24, 0.04), rb(1.35, 0.15, 0.3, STONE_D, 0, 0.075, 0.52, 0.04), rb(0.62, 0.025, 0.22, 0xe58f7a, 0, 0.31, 0.22, 0.012));
    at(p, g, 0.72, 1.58, 0, 0, (pp, gg) => lantern(pp, gg, s));
    if (snow) wreath(p, 0, 0.95, 0.1);
    if (s === 'autumn' && l === 1) { pumpkin(p, -0.8, 0, 0.45); pumpkin(p, 0.82, 0, 0.4, 0.75); }
  });
  // Fenster vorne
  const wx = l === 1 ? 1.4 : 1.6;
  for (const sx of l === 3 ? [1] : [-1, 1]) at(P, G, sx * wx, 1.3, zf, 0, (p, g) => win(p, g, { w: 0.62, h: 0.68, curtain: PINK, shut: l >= 2 ? 0x8cc7b0 : 0, box: true, s }));
  if (l >= 2) {
    // Gaube über der Tür
    const dz = -9.3, dy = 2.72;
    P.push(rb(0.95, 0.56, 1.1, PLASTER, 0, dy + 0.28, dz - 0.55, 0.03));
    for (const sx of [-1, 1]) P.push(rb(0.1, 0.58, 0.1, TIMBER, sx * 0.475, dy + 0.28, dz, 0.025));
    const dp = [[0.6, 0], [0, 0.32]], df = fill(1.1, 0.95, dp, PLASTER);
    P.push(...tf([df.p], 0, dy + 0.56, dz - 0.55, H), ...tf(roofOf(1.25, dp, roofC, { snow, trim: CREAM, sw: 0.24, st: 0.16 }), 0, dy + 0.56, dz - 0.6, H));
    at(P, G, 0, dy + 0.29, dz, 0, (p, g) => win(p, g, { w: 0.36, h: 0.3, curtain: LILA, s }));
    // Veranda mit Geländer
    const px0 = l === 3 ? -1.1 : -1.65, px1 = W / 2, pc = (px0 + px1) / 2, z1 = -7.8, pz = (zf + z1) / 2; // links frei für den Briefkasten
    P.push(rb(px1 - px0, 0.11, z1 - zf, WOODD, pc, 0.055, pz, 0.03), rb(1.05, 0.15, 0.26, STONE, 0, 0.225, zf + 0.13, 0.04));
    for (let z = zf + 0.1; z < z1; z += 0.185) P.push(rb(px1 - px0 - 0.04, 0.045, 0.17, vary(WOOD, 0.05), pc + jit(0.02), 0.128, z, 0.02));
    const posts = [[px0 + 0.06, z1 - 0.06], [-0.62, z1 - 0.06], [0.62, z1 - 0.06], [px1 - 0.06, z1 - 0.06], [px0 + 0.06, zf + 0.08], [px1 - 0.06, zf + 0.08]];
    for (const [x, z] of posts) P.push(rb(0.1, 0.64, 0.1, CREAM, x, 0.47, z, 0.025), ball(0.06, CREAM, x, 0.83, z, 1, 1, 1, 7), ...(snow ? [ball(0.07, SNOW, x, 0.87, z, 1, 0.55, 1, 6)] : []));
    const rail = (a, b) => {
      const [x0, z0] = a, [x1, zz] = b, L = Math.hypot(x1 - x0, zz - z0), alongX = Math.abs(x1 - x0) > 0.01;
      P.push(rb(alongX ? L : 0.07, 0.06, alongX ? 0.07 : L, CREAM, (x0 + x1) / 2, 0.72, (z0 + zz) / 2, 0.02), rb(alongX ? L : 0.05, 0.05, alongX ? 0.05 : L, CREAM, (x0 + x1) / 2, 0.25, (z0 + zz) / 2, 0.015));
      if (snow) P.push(rb(alongX ? L : 0.09, 0.04, alongX ? 0.09 : L, SNOW, (x0 + x1) / 2, 0.76, (z0 + zz) / 2, 0.02));
      const n = Math.round(L / 0.17);
      for (let i = 1; i < n; i++) P.push(box(0.04, 0.44, 0.04, CREAM, x0 + (x1 - x0) * i / n, 0.485, z0 + (zz - z0) * i / n));
    };
    rail(posts[0], posts[1]); rail(posts[2], posts[3]); rail(posts[4], posts[0]); rail(posts[5], posts[3]);
    pot(P, -0.88, 0.15, z1 - 0.28, s); pot(P, 0.88, 0.15, z1 - 0.28, s);
    // Bank vor dem rechten Fenster
    const bx0 = 1.55, bz = -8.42;
    P.push(rb(0.9, 0.06, 0.32, WOOD, bx0, 0.52, bz, 0.02), rb(0.9, 0.28, 0.05, WOOD, bx0, 0.76, bz - 0.16, 0.02), rb(0.34, 0.07, 0.26, ROSE, bx0 - 0.2, 0.58, bz + 0.01, 0.03));
    for (const x of [-0.38, 0.38]) for (const z of [-0.12, 0.12]) P.push(box(0.05, 0.36, 0.05, WOODD, bx0 + x, 0.33, bz + z));
    // Lichterkette unter der Traufe
    at(P, G, 0, 0, 0, 0, (p, g) => garland(p, g, l === 3 ? -1.05 : -W / 2 - 0.1, W / 2 + 0.1, 2.12, -8.48));
  }
  if (l === 3) {
    // Turm mit Kegeldach
    const tx = -1.95, tz = -9.6, r = 0.8, ty = 3.6;
    P.push(cyl(r + 0.08, r + 0.12, 0.36, STONE_D, tx, 0.18, tz, 22), cyl(r, r, ty - 0.34, PLASTER, tx, 0.34 + (ty - 0.34) / 2, tz, 24));
    for (const y of [0.4, 2.32, ty - 0.04]) P.push(cyl(r + 0.035, r + 0.035, 0.12, TIMBER, tx, y, tz, 20));
    for (let k = -5; k <= 5; k++) for (const row of [0, 1]) { const f = k * 0.26 + row * 0.13; P.push(stone(0.26, 0.15, 0.06, vary(STONE, 0.07), tx + Math.sin(f) * (r + 0.07), 0.09 + row * 0.17, tz + Math.cos(f) * (r + 0.07), f)); }
    at(P, G, tx, 1.3, tz + r - 0.03, 0, (p, g) => win(p, g, { w: 0.46, h: 0.62, curtain: PINK, box: true, s }));
    at(P, G, tx, 2.95, tz + r - 0.01, 0, (p, g) => roundWin(p, g, 0.19));
    at(P, G, tx, ty + 0.02, tz, 0, p => coneRoof(p, 1.08, 1.75, roofC, snow));
    P.push(cyl(0.015, 0.015, 0.5, IRON, tx, ty + 1.95, tz, 6), ball(0.06, BRASS, tx, ty + 1.8, tz, 1, 1, 1, 8),
      place(new THREE.ConeGeometry(0.1, 0.34, 4).scale(1, 1, 0.18), ROSE, tx + 0.18, ty + 2.08, tz, 0, 0, -H));
    if (s !== 'winter') { // Kletterrosen
      const F = FLOWERS[s];
      for (let i = 0; i < 14; i++) {
        const f = 0.55 + rnd() * 0.75, y = 0.45 + i * 0.13 + jit(0.05);
        P.push(ball(0.075, vary(s === 'autumn' ? 0xd98a3a : LEAF, 0.06), tx + Math.sin(f) * (r + 0.03), y, tz + Math.cos(f) * (r + 0.03), 1, 1, 1, 6));
        if (i % 3 === 1) P.push(ball(0.05, F[i % F.length], tx + Math.sin(f + 0.1) * (r + 0.08), y + 0.03, tz + Math.cos(f + 0.1) * (r + 0.08), 1, 1, 1, 6));
      }
    }
  }
  if (s === 'autumn' && l >= 2) pumpkin(P, -0.62, 0.15, -8.1, 0.8);
}

// ---------- Hühnerstall ----------
function coop(l, s, P, G) {
  if (!l) return site(P, 9.5, -6, 1.45, 1.0, 'coop', s);
  const cx = 9.25, cz = -6.3, W = 2.2, D = 1.7, zf = cz + D / 2, fy = 0.36, top = 1.42, snow = s === 'winter';
  const wallC = 0xffdf96, roofC = 0x6fb0d6, prof = [[W / 2 + 0.25, 0], [0, 0.95]], gf = fill(D, W, prof, wallC), wallH = top + gf.yw;
  for (const x of [cx - W / 2 + 0.14, cx + W / 2 - 0.14]) for (const z of [cz - D / 2 + 0.14, zf - 0.14]) P.push(rb(0.13, fy, 0.13, WOODD, x, fy / 2, z, 0.03), ball(0.1, vary(STONE), x, 0.03, z, 1.2, 0.5, 1.2, 7));
  P.push(rb(W + 0.1, 0.08, D + 0.1, WOODD, cx, fy, cz, 0.03), rb(W, wallH - fy, D, wallC, cx, fy + (wallH - fy) / 2, cz, 0.04), ...tf([gf.p], cx, top, cz, H));
  P.push(...tf(roofOf(D + 0.45, prof, roofC, { snow, trim: CREAM, sw: 0.26, st: 0.18 }), cx, top, cz, H));
  at(P, G, cx, 0, zf, 0, (p, g) => {
    boards(p, W, fy + 0.04, x => top + gf.h(x), wallC);
    for (const sx of [-1, 1]) p.push(rb(0.1, wallH - fy, 0.08, CREAM, sx * W / 2, fy + (wallH - fy) / 2, 0.02, 0.025));
    // Hühnertür + Rampe
    p.push(rb(0.4, 0.3, 0.03, DARK, -0.42, fy + 0.19, 0.05, 0.01), semi(0.2, 0.03, DARK, -0.42, fy + 0.34, 0.05), arc(0.225, 0.035, CREAM, -0.42, fy + 0.34, 0.07),
      box(0.06, 0.3, 0.06, CREAM, -0.645, fy + 0.19, 0.07), box(0.06, 0.3, 0.06, CREAM, -0.195, fy + 0.19, 0.07));
    const ra = Math.atan2(fy + 0.04, 0.8);
    p.push(rb(0.42, 0.045, Math.hypot(fy + 0.04, 0.8), WOOD, -0.42, (fy + 0.04) / 2 + 0.01, 0.45, 0.015, 0, ra));
    for (let i = 1; i < 5; i++) p.push(box(0.38, 0.035, 0.04, WOODD, -0.42, fy + 0.06 - (fy + 0.04) * i / 5 + 0.02, 0.05 + 0.8 * i / 5, 0, ra));
    for (let i = 0; i < 5; i++) p.push(ball(0.09, vary(HAY, 0.06), -0.42 + jit(0.35), 0.02, 0.95 + jit(0.12), 1.4, 0.35, 1, 6));
    at(p, g, 0.48, 0.98, 0, 0, (pp, gg) => win(pp, gg, { w: 0.36, h: 0.34, curtain: ROSE, box: true, s }));
    at(p, g, 0, top + gf.yw + 0.3, 0.01, 0, (pp, gg) => roundWin(pp, gg, 0.12));
    if (s === 'autumn') pumpkin(p, 0.15, 0, 0.35, 0.8);
  });
  if (l >= 2) {
    // Legenest-Anbau mit Pultdach
    const ax = cx + W / 2 + 0.46;
    P.push(rb(0.92, 0.72, 1.3, wallC, ax, fy + 0.36, cz, 0.04), rb(0.98, 0.07, 1.36, WOODD, ax, fy, cz, 0.03));
    for (const z of [cz - 0.5, cz + 0.5]) P.push(rb(0.12, fy, 0.12, WOODD, ax + 0.33, fy / 2, z, 0.03));
    const q = [];
    slope(q, 1.55, 0.62, 0, -0.5, 0.3, roofC, { snow, trim: CREAM, sw: 0.26, st: 0.18 });
    P.push(...tf(q, ax + 0.02, fy + 0.72, cz, H));
    at(P, G, ax, 0, cz + 0.65, 0, p => {
      boards(p, 0.92, fy + 0.04, () => fy + 0.72, wallC);
      p.push(disc(0.17, 0.03, CREAM, 0, 0.75, 0.05), ball(0.07, 0xfff3dc, 0, 0.75, 0.07, 1, 1.3, 0.4, 10), ...heart(0.06, ROSE, 0.1, 0.86, 0.07));
    });
    // Wetterfahne mit Huhn
    const vx = cx, vy = top + 0.95, vz = zf + 0.1;
    P.push(cyl(0.015, 0.015, 0.45, IRON, vx, vy + 0.22, vz, 6), box(0.3, 0.02, 0.02, IRON, vx, vy + 0.3, vz), cone(0.03, 0.06, IRON, vx + 0.17, vy + 0.3, vz, 4, 0, 0, -H),
      ball(0.075, CREAM, vx, vy + 0.5, vz, 1.3, 1, 0.6, 8), ball(0.045, CREAM, vx + 0.08, vy + 0.58, vz, 1, 1, 1, 8), ball(0.025, BERRY, vx + 0.08, vy + 0.63, vz, 1, 1, 0.5, 6),
      cone(0.018, 0.04, BRASS, vx + 0.13, vy + 0.58, vz, 5, 0, 0, -H), cone(0.05, 0.09, CREAM, vx - 0.09, vy + 0.56, vz, 6, 0, 0, 0.6));
    // Heuballen
    P.push(rb(0.55, 0.36, 0.4, HAY, 7.95, 0.18, -4.95, 0.07), box(0.56, 0.37, 0.03, shade(HAY, -0.12), 7.95, 0.18, -5.06), box(0.56, 0.37, 0.03, shade(HAY, -0.12), 7.95, 0.18, -4.84));
    if (snow) P.push(rb(0.56, 0.06, 0.41, SNOW, 7.95, 0.38, -4.95, 0.03));
  }
}

// ---------- Stall ----------
function barn(l, s, P, G) {
  if (!l) return site(P, 10, 6, 1.95, 1.2, 'barn', s);
  const cx = 9.6, cz = 6, W = 3.4, D = 2.8, zf = cz + D / 2, top = 1.95, snow = s === 'winter';
  const red = 0xd65a4e, roofC = 0x6e7f9e, prof = [[W / 2 + 0.2, 0], [1.2, 0.85], [0, 1.42]], gf = fill(D, W, prof, red), wallH = top + gf.yw;
  P.push(rb(W + 0.14, 0.32, D + 0.14, STONE_D, cx, 0.16, cz, 0.05), rb(W, wallH - 0.3, D, red, cx, 0.3 + (wallH - 0.3) / 2, cz, 0.05), ...tf([gf.p], cx, top, cz, H));
  at(P, G, cx, 0, zf + 0.07, 0, p => stones(p, W + 0.14, 0.32));
  at(P, G, cx - W / 2 - 0.07, 0, cz, -H, p => stones(p, D + 0.14, 0.32));
  if (l < 2) at(P, G, cx + W / 2 + 0.07, 0, cz, H, p => stones(p, D + 0.14, 0.32));
  P.push(...tf(roofOf(D + 0.4, prof, roofC, { snow, trim: CREAM }), cx, top, cz, H));
  for (const x of [cx - W / 2, cx + W / 2]) P.push(rb(0.12, wallH - 0.3, 0.12, CREAM, x, 0.3 + (wallH - 0.3) / 2, cz - D / 2, 0.03));
  at(P, G, cx, 0, zf, 0, (p, g) => {
    boards(p, W, 0.32, x => top + gf.h(x), red, 0.22);
    for (const sx of [-1, 1]) p.push(rb(0.12, wallH - 0.3, 0.1, CREAM, sx * W / 2, 0.3 + (wallH - 0.3) / 2, 0.03, 0.03));
    // Große Doppeltür
    p.push(rb(1.78, 0.13, 0.1, CREAM, 0, 1.9, 0.05, 0.03));
    for (const sx of [-1, 1]) {
      const x = sx * 0.38;
      p.push(rb(0.1, 1.55, 0.1, CREAM, sx * 0.84, 1.08, 0.05, 0.03), rb(0.74, 1.5, 0.05, shade(red, -0.07), x, 1.07, 0.05, 0.015),
        box(0.74, 0.07, 0.03, CREAM, x, 0.38, 0.09), box(0.74, 0.07, 0.03, CREAM, x, 1.78, 0.09), box(0.07, 1.47, 0.03, CREAM, x - 0.335, 1.08, 0.09), box(0.07, 1.47, 0.03, CREAM, x + 0.335, 1.08, 0.09),
        beam([x - 0.3, 0.41, 0.09], [x + 0.3, 1.75, 0.09], 0.06, CREAM, 0.03), beam([x + 0.3, 0.41, 0.09], [x - 0.3, 1.75, 0.09], 0.06, CREAM, 0.03),
        box(0.04, 0.3, 0.04, IRON, sx * 0.09, 1.07, 0.12));
    }
    // Heuboden-Luke mit Heu
    const hy = top + gf.yw + 0.62;
    p.push(rb(0.62, 0.58, 0.03, DARK, 0, hy, 0.04, 0.01), rb(0.76, 0.08, 0.1, CREAM, 0, hy + 0.33, 0.05, 0.025), rb(0.8, 0.08, 0.14, CREAM, 0, hy - 0.33, 0.06, 0.025),
      rb(0.08, 0.66, 0.1, CREAM, -0.35, hy, 0.05, 0.025), rb(0.08, 0.66, 0.1, CREAM, 0.35, hy, 0.05, 0.025));
    for (let i = 0; i < 7; i++) p.push(ball(0.1, vary(HAY, 0.05), -0.22 + i * 0.075, hy - 0.2 + jit(0.04), 0.08, 1, 0.8, 0.8, 7));
    for (let i = 0; i < 5; i++) p.push(cone(0.03, 0.14, vary(HAY, 0.05), -0.2 + i * 0.1, hy - 0.3, 0.14, 5, 1.2 + jit(0.3), 0, jit(0.3)));
    for (const sx of [-1, 1]) at(p, g, sx * 1.26, 1.2, 0.02, 0, (pp, gg) => win(pp, gg, { w: 0.42, h: 0.42, cross: 'x', box: true, s }));
    at(p, g, 0, 2.1, 0.04, 0, (pp, gg) => lantern(pp, gg, s));
    if (s === 'autumn') { pumpkin(p, -1.05, 0, 0.35); pumpkin(p, 1.0, 0, 0.32, 0.75); pumpkin(p, 1.18, 0, 0.42, 0.6); }
  });
  // Heuballen
  P.push(rb(0.42, 0.38, 0.5, HAY, 7.62, 0.19, 7.12, 0.07), box(0.03, 0.39, 0.51, shade(HAY, -0.12), 7.54, 0.19, 7.12), box(0.03, 0.39, 0.51, shade(HAY, -0.12), 7.7, 0.19, 7.12));
  if (snow) P.push(rb(0.43, 0.06, 0.51, SNOW, 7.62, 0.4, 7.12, 0.03));
  if (l >= 2) {
    // Silo
    const sx = 12.15, sz = 5.85, r = 0.64, sh = 3.3;
    P.push(cyl(r + 0.08, r + 0.12, 0.3, STONE_D, sx, 0.15, sz, 20), cyl(r, r, sh, 0xe3e9ec, sx, 0.3 + sh / 2, sz, 22));
    for (let y = 0.8; y < sh; y += 0.62) P.push(cyl(r + 0.025, r + 0.025, 0.07, 0xa9b6c2, sx, y, sz, 22));
    P.push(ball(r + 0.06, roofC, sx, 0.3 + sh, sz, 1, 0.8, 1, 18), cyl(0.1, 0.13, 0.14, shade(roofC, -0.1), sx, 0.3 + sh + 0.55, sz, 10), ball(0.06, BRASS, sx, 0.3 + sh + 0.66, sz, 1, 1, 1, 8));
    if (snow) P.push(ball(r + 0.08, SNOW, sx, 0.3 + sh + 0.08, sz, 1, 0.65, 1, 14));
    for (const dx of [-0.13, 0.13]) P.push(box(0.035, sh - 0.3, 0.035, IRON, sx + dx, 0.3 + sh / 2, sz + r + 0.06));
    for (let y = 0.5; y < sh; y += 0.22) P.push(box(0.26, 0.025, 0.025, IRON, sx, y, sz + r + 0.06));
    // Laterne-Türmchen auf dem First
    const ky = top + 1.42;
    P.push(rb(0.5, 0.5, 0.5, CREAM, cx, ky + 0.2, cz, 0.03));
    for (let i = 0; i < 3; i++) P.push(box(0.36, 0.035, 0.03, shade(roofC, -0.1), cx, ky + 0.08 + i * 0.11, cz + 0.255, 0, -0.4));
    P.push(cone(0.48, 0.38, roofC, cx, ky + 0.64, cz, 4, 0, PI / 4), cyl(0.012, 0.012, 0.4, IRON, cx, ky + 0.98, cz, 6), box(0.34, 0.02, 0.02, IRON, cx, ky + 1.02, cz),
      cone(0.035, 0.07, IRON, cx + 0.19, ky + 1.02, cz, 4, 0, 0, -H), box(0.06, 0.08, 0.01, IRON, cx - 0.16, ky + 1.02, cz));
    if (snow) P.push(ball(0.3, SNOW, cx, ky + 0.6, cz, 1, 0.45, 1, 9));
    P.push(rb(0.42, 0.38, 0.5, HAY, 7.62, 0.57, 7.12, 0.07, 0.15));
  }
}

// ---------- Baustelle (Stufe 0) ----------
function site(P, cx, cz, sx, sz, kind, s) {
  const snow = s === 'winter';
  P.push(rb(2 * sx + 0.3, 0.04, 2 * sz + 0.3, snow ? 0xe6edf1 : 0xd3b383, cx, 0.02, cz, 0.02));
  const posts = [[-sx, -sz], [sx, -sz], [sx, sz], [-sx, sz]];
  for (const [x, z] of posts) P.push(cyl(0.045, 0.045, 0.62, WOOD, cx + x, 0.31, cz + z, 8), cone(0.05, 0.08, WOODL, cx + x, 0.66, cz + z, 8));
  for (let i = 0; i < 4; i++) {
    const [x0, z0] = posts[i], [x1, z1] = posts[(i + 1) % 4], L = Math.hypot(x1 - x0, z1 - z0), n = Math.round(L / 0.16), alongX = Math.abs(x1 - x0) > 0.01;
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, y = 0.5 - 0.05 * Math.sin(PI * t);
      P.push(box(alongX ? L / n : 0.012, 0.055, alongX ? 0.012 : L / n, k % 2 ? CREAM : 0xf2665e, cx + x0 + (x1 - x0) * t, y, cz + z0 + (z1 - z0) * t));
    }
  }
  // Bretterstapel, Steine, Werkzeugkiste
  for (let i = 0; i < 5; i++) P.push(rb(1.1, 0.07, 0.18, vary(WOODL, 0.06), cx - sx * 0.35 + jit(0.06), 0.08 + Math.floor(i / 3) * 0.07, cz + sz * 0.2 + (i % 3) * 0.2 + (i > 2 ? 0.1 : 0), 0.02, jit(0.08)));
  if (snow) P.push(rb(1.1, 0.05, 0.62, SNOW, cx - sx * 0.35, 0.21, cz + sz * 0.2 + 0.2, 0.025));
  for (let i = 0; i < 6; i++) P.push(ball(0.13 + rnd() * 0.05, vary(STONE, 0.07), cx + sx * 0.45 + jit(0.25), 0.08 + (i > 3 ? 0.13 : 0), cz - sz * 0.35 + jit(0.2), 1.2, 0.8, 1, 7));
  if (snow) P.push(ball(0.28, SNOW, cx + sx * 0.45, 0.22, cz - sz * 0.35, 1.2, 0.45, 1, 9));
  P.push(rb(0.4, 0.2, 0.22, 0xe0605a, cx + sx * 0.5, 0.12, cz + sz * 0.45, 0.04, 0.3), arc(0.09, 0.016, IRON, cx + sx * 0.5, 0.22, cz + sz * 0.45, PI, 0.3));
  // Schild mit Hammer und Bild
  const bx = cx - sx * 0.55, bz = cz + sz + 0.22;
  P.push(cyl(0.04, 0.045, 1.0, WOODD, bx, 0.5, bz - 0.04, 8), rb(0.76, 0.5, 0.06, WOOD, bx, 0.98, bz, 0.04), rb(0.66, 0.4, 0.03, CREAM, bx, 0.98, bz + 0.03, 0.03),
    box(0.03, 0.26, 0.02, WOODD, bx - 0.16, 0.96, bz + 0.05, 0, 0, -0.6), rb(0.13, 0.06, 0.04, IRON, bx - 0.1, 1.06, bz + 0.055, 0.015, 0, 0, -0.6));
  if (kind === 'coop') P.push(ball(0.08, 0xfff3dc, bx + 0.14, 0.98, bz + 0.06, 1, 1.3, 0.4, 10), ball(0.03, ROSE, bx + 0.22, 1.1, bz + 0.06, 1, 1, 0.4, 6));
  else P.push(box(0.2, 0.14, 0.02, 0xd65a4e, bx + 0.14, 0.92, bz + 0.06), cone(0.14, 0.09, 0x6e7f9e, bx + 0.14, 1.04, bz + 0.06, 4, 0, PI / 4), box(0.06, 0.09, 0.025, CREAM, bx + 0.14, 0.9, bz + 0.065));
  if (snow) P.push(rb(0.8, 0.06, 0.1, SNOW, bx, 1.25, bz, 0.03));
}

// ---------- Kleine Bauten ----------
const PRODUCE = {
  spring: [[0xff3b5c, 0.05], [0xff7aa0, 0.06], [0x9fdc6a, 0.09]], summer: [[0xff4836, 0.07], [0xffd23f, 0.06], [0x7cc95a, 0.1]],
  autumn: [[ORANGE, 0.1], [0xe23d3d, 0.07], [0x8a5ab8, 0.05]], winter: [[0xc6ee92, 0.09], [0xd9b47a, 0.06], [0xffa53a, 0.065]],
};
function crate(p, x, y, z, w, d, fill) {
  p.push(rb(w, 0.18, d, WOOD, x, y + 0.09, z, 0.02), box(w + 0.01, 0.025, d + 0.01, WOODD, x, y + 0.07, z), box(w + 0.01, 0.025, d + 0.01, WOODD, x, y + 0.13, z));
  if (!fill) return;
  const [c, r] = fill;
  for (let i = 0; i < 9; i++) p.push(ball(r, vary(c, 0.05), x + jit(w / 2 - r), y + 0.18 + (i > 5 ? r * 1.2 : 0) + jit(0.01), z + jit(d / 2 - r), 1, 0.92, 1, 8));
}
function market(P, G, s) {
  const cx = -4.5, cz = -9, snow = s === 'winter', fr = PRODUCE[s] || PRODUCE.summer;
  P.push(rb(1.8, 0.78, 0.66, WOODD, cx, 0.39, cz - 0.05, 0.04), rb(1.96, 0.08, 0.8, WOODL, cx, 0.82, cz - 0.03, 0.03));
  for (let i = 0; i < 9; i++) P.push(box(0.18, 0.7, 0.03, vary(WOOD, 0.05), cx - 0.8 + i * 0.2, 0.42, cz + 0.29));
  for (const x of [-0.92, 0.92]) P.push(cyl(0.045, 0.05, 2.45, WOODD, cx + x, 1.22, cz - 0.42, 8), cyl(0.045, 0.05, 1.86, WOODD, cx + x, 0.93, cz + 0.35, 8));
  // Markise mit Wellenkante
  const a = Math.atan2(0.36, 1.05);
  for (let i = 0; i < 7; i++) {
    const x = cx - 1.05 + (i + 0.5) * 0.3, c = i % 2 ? CREAM : ROSE;
    P.push(box(0.3, 0.04, 1.14, c, x, 2.0, cz - 0.02, 0, a), semi(0.15, 0.03, c, x, 1.82, cz + 0.53, true));
  }
  if (snow) P.push(rb(2.0, 0.1, 1.08, SNOW, cx, 2.08, cz - 0.03, 0.05, 0, a));
  P.push(rb(1.0, 0.34, 0.05, CREAM, cx, 2.42, cz - 0.46, 0.04), rb(1.06, 0.06, 0.07, WOODD, cx, 2.62, cz - 0.46, 0.02),
    ball(0.08, 0xe23d3d, cx - 0.22, 2.42, cz - 0.42, 1, 1, 0.5, 10), ball(0.035, LEAF, cx - 0.17, 2.52, cz - 0.42, 1.4, 0.6, 0.5, 6),
    cone(0.05, 0.22, ORANGE, cx + 0.2, 2.42, cz - 0.42, 8, 0, 0, -2.4), ball(0.04, LEAF, cx + 0.12, 2.5, cz - 0.42, 1, 1.3, 0.5, 6));
  crate(P, cx - 0.58, 0.86, cz - 0.04, 0.5, 0.42, fr[0]);
  crate(P, cx, 0.86, cz - 0.04, 0.5, 0.42, fr[1]);
  crate(P, cx + 0.58, 0.86, cz - 0.04, 0.5, 0.42, fr[2]);
  // Kreidetafel
  const tx = cx + 1.1, tz = cz + 0.32;
  P.push(rb(0.34, 0.46, 0.03, 0x3d5248, tx, 0.3, tz, 0.015, -0.3, -0.18), rb(0.38, 0.5, 0.025, WOOD, tx - 0.004, 0.3, tz - 0.012, 0.015, -0.3, -0.18));
  for (let i = 0; i < 3; i++) P.push(box(0.18 - i * 0.03, 0.02, 0.01, CREAM, tx + 0.008, 0.4 - i * 0.09, tz + 0.03, -0.3, -0.18));
  if (s === 'autumn') pumpkin(P, cx - 1.05, 0, cz + 0.25);
}
function bin(P, G, s) {
  const cx = 3, cz = -8;
  P.push(rb(0.88, 0.5, 0.64, WOODD, cx, 0.31, cz, 0.04));
  for (const y of [0.16, 0.32, 0.48]) P.push(rb(0.92, 0.145, 0.68, vary(WOOD, 0.05), cx, y, cz, 0.03));
  for (const x of [-0.45, 0.45]) for (const z of [-0.33, 0.33]) P.push(rb(0.07, 0.52, 0.07, 0xb39a7a, cx + x, 0.32, cz + z, 0.02), ball(0.05, WOODD, cx + x * 0.85, 0.03, cz + z * 0.85, 1, 0.6, 1, 6));
  P.push(rb(1.0, 0.1, 0.76, WOODL, cx, 0.62, cz, 0.04), rb(0.1, 0.03, 0.78, WOODD, cx - 0.3, 0.68, cz, 0.01), rb(0.1, 0.03, 0.78, WOODD, cx + 0.3, 0.68, cz, 0.01),
    rb(0.2, 0.05, 0.05, BRASS, cx, 0.6, cz + 0.39, 0.02), disc(0.11, 0.03, BRASS, cx, 0.32, cz + 0.35), ...heart(0.09, shade(BRASS, -0.15), cx, 0.32, cz + 0.37));
  // Münzen obendrauf + Anhänger
  const cy = s === 'winter' ? 0.745 : 0.685; // Münzen liegen auf dem Schnee
  for (const [x, z, n] of [[-0.18, 0.05, 3], [0.05, -0.1, 2], [0.22, 0.08, 1]]) for (let i = 0; i < n; i++) P.push(cyl(0.06, 0.06, 0.025, BRASS, cx + x + jit(0.01), cy + i * 0.027, cz + z, 12));
  P.push(box(0.01, 0.12, 0.01, 0xe0605a, cx + 0.38, 0.5, cz + 0.39), rb(0.11, 0.14, 0.012, CREAM, cx + 0.38, 0.38, cz + 0.4, 0.01, 0, 0, 0.15));
  if (s === 'winter') P.push(rb(0.96, 0.06, 0.72, SNOW, cx, 0.7, cz - 0.02, 0.03));
  if (s === 'autumn') pumpkin(P, cx - 0.6, 0, cz + 0.2, 0.8);
}
function board(P, G, s) {
  const cx = -7, cz = -8, snow = s === 'winter';
  for (const x of [-0.6, 0.6]) P.push(rb(0.11, 1.75, 0.11, WOODD, cx + x, 0.875, cz, 0.03), ball(0.1, STONE_D, cx + x, 0.04, cz, 1.3, 0.5, 1.3, 7));
  P.push(rb(1.12, 0.82, 0.06, 0xd9ad7c, cx, 1.2, cz, 0.02), rb(1.3, 0.08, 0.1, WOOD, cx, 1.64, cz, 0.025), rb(1.3, 0.08, 0.1, WOOD, cx, 0.77, cz, 0.025));
  P.push(...tf(roofOf(1.6, [[0.34, 0], [0, 0.28]], 0xe5735c, { snow, trim: CREAM, sw: 0.22, st: 0.14 }), cx, 1.78, cz));
  const papers = [[-0.32, 1.32, 0.3, 0.36, CREAM, 0.06, BERRY], [0.03, 1.38, 0.28, 0.3, 0xfff1a8, -0.08, 0x5aa0e0], [0.34, 1.24, 0.26, 0.34, 0xffd6e0, 0.05, 0x5cb85c],
    [-0.15, 0.97, 0.34, 0.22, 0xd6f0ff, -0.04, 0xffb020], [0.3, 0.94, 0.22, 0.2, 0xd8f5df, 0.1, ROSE]];
  for (const [x, y, w, h, c, r, pin] of papers) {
    P.push(box(w, h, 0.01, c, cx + x, y, cz + 0.035, 0, 0, r), ball(0.025, pin, cx + x, y + h / 2 - 0.045, cz + 0.05, 1, 1, 1, 6));
    for (let i = 0; i < 3 && h > 0.25; i++) P.push(box(w * (0.7 - i * 0.12), 0.015, 0.006, 0x8a8090, cx + x - i * 0.01, y + 0.06 - i * 0.07, cz + 0.042, 0, 0, r));
  }
  at(P, G, cx + 0.66, 1.42, cz, H, (p, g) => lantern(p, g, s));
}
function bench(P, G, s) {
  const cx = 5.5, cz = -10;
  for (let i = 0; i < 3; i++) P.push(rb(1.85, 0.1, 0.22, vary(WOODL, 0.05), cx, 0.84, cz - 0.24 + i * 0.235, 0.025));
  for (const x of [-0.8, 0.8]) {
    P.push(rb(0.1, 0.8, 0.1, WOODD, cx + x, 0.4, cz + 0.28, 0.02), rb(0.1, 1.98, 0.1, WOODD, cx + x, 0.99, cz - 0.3, 0.02));
    P.push(beam([cx + x, 0.12, cz + 0.28], [cx + x, 0.62, cz - 0.3], 0.05, WOODD));
  }
  P.push(rb(1.65, 0.05, 0.6, WOOD, cx, 0.22, cz, 0.02));
  for (let i = 0; i < 3; i++) P.push(rb(0.7, 0.05, 0.13, vary(WOODL, 0.06), cx - 0.4 + jit(0.03), 0.27 + i * 0.05, cz + jit(0.04), 0.015, jit(0.06)));
  P.push(rb(0.42, 0.2, 0.24, 0xe0605a, cx + 0.4, 0.35, cz, 0.04), arc(0.08, 0.015, IRON, cx + 0.4, 0.45, cz), box(0.43, 0.03, 0.25, shade(0xe0605a, -0.12), cx + 0.4, 0.4, cz));
  // Schraubstock, Hobel, Späne, Glas mit Stiften
  P.push(rb(0.17, 0.14, 0.13, 0x7f95a8, cx - 0.72, 0.96, cz + 0.33, 0.02), rb(0.17, 0.12, 0.04, 0x7f95a8, cx - 0.72, 0.95, cz + 0.42, 0.015), cyl(0.014, 0.014, 0.26, IRON, cx - 0.72, 0.93, cz + 0.5, 6, H), cyl(0.012, 0.012, 0.22, IRON, cx - 0.72, 0.93, cz + 0.62, 6, 0, 0, H));
  P.push(rb(0.62, 0.04, 0.15, WOODL, cx + 0.1, 0.91, cz + 0.08, 0.01, 0.12), rb(0.22, 0.08, 0.08, 0x9a6a42, cx + 0.22, 0.97, cz + 0.07, 0.02, 0.12), ball(0.03, 0xe0605a, cx + 0.15, 1.03, cz + 0.06, 1, 1, 1, 6));
  for (let i = 0; i < 4; i++) P.push(arc(0.035, 0.008, 0xf5d8a8, cx - 0.2 + jit(0.15), 0.9, cz + 0.05 + jit(0.1), PI * 1.4, rnd() * 3));
  P.push(cyl(0.05, 0.05, 0.13, 0xbfe3ef, cx + 0.68, 0.955, cz - 0.15, 12));
  for (const [dx, c] of [[-0.02, 0xffc145], [0.015, 0x5aa0e0], [0.0, BERRY]]) P.push(box(0.012, 0.2, 0.012, c, cx + 0.68 + dx, 1.03, cz - 0.15 + dx, 0, 0, dx * 6));
  P.push(box(0.035, 0.28, 0.03, WOOD, cx - 0.3, 0.91, cz - 0.05, 0, H, 0.4), rb(0.06, 0.06, 0.14, IRON, cx - 0.39, 0.92, cz + 0.07, 0.015, -0.4));
  // Lochwand mit Werkzeug
  const wz = cz - 0.36;
  P.push(rb(1.92, 1.0, 0.05, 0xe9c89a, cx, 1.45, wz, 0.02), rb(1.98, 0.07, 0.08, WOODD, cx, 1.96, wz, 0.02), rb(1.98, 0.07, 0.08, WOODD, cx, 0.94, wz, 0.02));
  for (let r = 0; r < 4; r++) for (let c = 0; c < 14; c++) P.push(box(0.022, 0.022, 0.01, 0xb8956a, cx - 0.84 + c * 0.13, 1.1 + r * 0.24, wz + 0.028));
  const fz = wz + 0.04;
  P.push(box(0.42, 0.13, 0.012, 0xc9d3db, cx - 0.55, 1.62, fz), rb(0.13, 0.14, 0.03, 0xd0604a, cx - 0.3, 1.63, fz, 0.025));
  P.push(box(0.035, 0.34, 0.03, WOOD, cx - 0.1, 1.42, fz), rb(0.17, 0.065, 0.065, IRON, cx - 0.1, 1.6, fz, 0.015));
  P.push(box(0.03, 0.28, 0.015, 0x9aa6b2, cx + 0.12, 1.45, fz), arc(0.035, 0.012, 0x9aa6b2, cx + 0.12, 1.6, fz, 2 * PI), arc(0.03, 0.012, 0x9aa6b2, cx + 0.12, 1.3, fz, 2 * PI));
  P.push(cyl(0.025, 0.025, 0.1, 0xffc145, cx + 0.3, 1.6, fz + 0.01, 8), box(0.012, 0.16, 0.012, IRON, cx + 0.3, 1.47, fz + 0.01));
  P.push(arc(0.1, 0.025, 0xd9c08a, cx + 0.55, 1.45, fz + 0.01, 2 * PI), arc(0.085, 0.025, 0xcdb27a, cx + 0.57, 1.43, fz + 0.03, 2 * PI));
  P.push(rb(0.7, 0.04, 0.13, WOOD, cx + 0.45, 1.78, wz + 0.08, 0.01));
  for (const [i, c] of [[0, 0x8fd0f0], [1, ROSE], [2, 0xffe066]]) P.push(cyl(0.05, 0.05, 0.11, c, cx + 0.22 + i * 0.16, 1.855, wz + 0.08, 12), cyl(0.051, 0.051, 0.015, 0xb9bcc4, cx + 0.22 + i * 0.16, 1.915, wz + 0.08, 12));
  // Klemmlampe
  P.push(box(0.02, 0.3, 0.02, IRON, cx - 0.85, 2.1, wz + 0.04), beam([cx - 0.85, 2.24, wz + 0.04], [cx - 0.7, 2.18, wz + 0.22], 0.02, IRON), cone(0.08, 0.1, 0x5aa0e0, cx - 0.7, 2.14, wz + 0.22, 10));
  G.push(ball(0.04, 0, cx - 0.7, 2.08, wz + 0.22, 1, 1, 1, 8));
  if (s === 'winter') P.push(rb(1.98, 0.06, 0.12, SNOW, cx, 2.02, wz, 0.03), rb(0.6, 0.05, 0.3, SNOW, cx - 0.45, 0.91, cz - 0.15, 0.025));
}
function kitchen(P, G, s) {
  const cz = -12, hx = -6.05, snow = s === 'winter', F = FLOWERS[s] || FLOWERS.summer;
  // Herd (links, unter dem Dach)
  P.push(rb(0.82, 0.82, 0.74, 0xf3dcc4, hx, 0.41, cz - 0.06, 0.06), rb(0.88, 0.06, 0.8, IRON, hx, 0.84, cz - 0.06, 0.02));
  at(P, G, hx, 0, cz + 0.31, 0, p => stones(p, 0.82, 0.2, 1));
  G.push(box(0.34, 0.16, 0.02, 0, hx, 0.4, cz + 0.32), semi(0.17, 0.02, 0, hx, 0.48, cz + 0.32));
  P.push(arc(0.2, 0.035, IRON, hx, 0.48, cz + 0.33), box(0.05, 0.18, 0.05, IRON, hx - 0.2, 0.39, cz + 0.33), box(0.05, 0.18, 0.05, IRON, hx + 0.2, 0.39, cz + 0.33), box(0.45, 0.05, 0.06, IRON, hx, 0.3, cz + 0.34));
  P.push(cyl(0.15, 0.13, 0.18, 0xe0605a, hx + 0.13, 0.96, cz - 0.02, 14), cyl(0.155, 0.155, 0.03, shade(0xe0605a, -0.08), hx + 0.13, 1.06, cz - 0.02, 14), ball(0.03, CREAM, hx + 0.13, 1.09, cz - 0.02, 1, 1, 1, 8),
    box(0.4, 0.03, 0.04, shade(0xe0605a, -0.1), hx + 0.13, 1.0, cz - 0.02));
  P.push(ball(0.1, 0x8fcfbf, hx - 0.2, 0.95, cz - 0.2, 1, 0.85, 1, 12), cone(0.025, 0.12, 0x8fcfbf, hx - 0.07, 0.98, cz - 0.2, 8, 0, 0, -1.0), arc(0.07, 0.014, IRON, hx - 0.2, 1.02, cz - 0.2, PI), ball(0.025, CREAM, hx - 0.2, 1.04, cz - 0.2, 1, 1, 1, 6));
  P.push(cyl(0.07, 0.07, 1.65, IRON, hx - 0.25, 1.68, cz - 0.32, 10), cyl(0.12, 0.08, 0.08, IRON, hx - 0.25, 2.54, cz - 0.32, 10), cyl(0.11, 0.11, 0.03, IRON, hx - 0.25, 2.62, cz - 0.32, 10));
  for (let i = 0; i < 3; i++) P.push(cyl(0.065, 0.065, 0.4, vary(0xa87449, 0.06), hx - 0.18 + (i === 2 ? 0.07 : i * 0.14), 0.065 + (i === 2 ? 0.12 : 0), cz + 0.52, 8, 0, 0, H));
  // kleines Dach über dem Herd
  for (const [x, z] of [[-6.47, -11.55], [-5.6, -11.55], [-6.47, -12.47], [-5.6, -12.47]]) P.push(rb(0.09, 1.98, 0.09, WOODD, x, 0.99, z, 0.025));
  P.push(...tf(roofOf(1.15, [[0.62, 0], [0, 0.34]], 0xe5735c, { snow, trim: CREAM, sw: 0.24, st: 0.16 }), hx + 0.01, 1.98, cz - 0.01));
  // Theke mit Fliesen, Schränkchen, Brett mit Gemüse
  const kx = -5.07;
  P.push(rb(1.02, 0.84, 0.7, 0x9fd4c0, kx, 0.42, cz - 0.05, 0.04), rb(1.1, 0.07, 0.8, WOODL, kx, 0.88, cz - 0.04, 0.025));
  for (const dx of [-0.25, 0.25]) P.push(rb(0.44, 0.6, 0.03, shade(0x9fd4c0, 0.06), kx + dx, 0.42, cz + 0.31, 0.02), ball(0.025, BRASS, kx + dx - Math.sign(dx) * 0.15, 0.55, cz + 0.34, 1, 1, 1, 6));
  P.push(rb(0.36, 0.03, 0.24, WOODL, kx - 0.15, 0.93, cz + 0.05, 0.01), cone(0.035, 0.16, ORANGE, kx - 0.2, 0.96, cz + 0.06, 8, 0, 0, H), ball(0.04, 0xe23d3d, kx - 0.05, 0.98, cz + 0.02, 1, 1, 1, 8),
    box(0.16, 0.012, 0.04, 0xc9d3db, kx - 0.1, 0.96, cz + 0.13, 0.4), cyl(0.12, 0.08, 0.08, CREAM, kx + 0.25, 0.96, cz - 0.05, 12));
  for (let i = 0; i < 3; i++) P.push(ball(0.05, i % 2 ? 0xe23d3d : 0x9ad85a, kx + 0.22 + i * 0.03, 1.02, cz - 0.07 + jit(0.03), 1, 1, 1, 8));
  // Rückwand mit Regal, Gläsern und Kellen
  P.push(rb(1.04, 1.02, 0.06, WOOD, kx, 1.42, cz - 0.42, 0.02), rb(1.0, 0.04, 0.16, WOODD, kx, 1.5, cz - 0.33, 0.01), rb(0.9, 0.025, 0.025, IRON, kx, 1.25, cz - 0.36, 0.008));
  for (let i = 0; i < 4; i++) P.push(cyl(0.05, 0.05, 0.13, [0xffd0a0, 0xd9483b, 0xfff1a8, 0xb5d98a][i], kx - 0.33 + i * 0.22, 1.585, cz - 0.33, 12), cyl(0.052, 0.052, 0.025, [ROSE, CREAM, ROSE, CREAM][i], kx - 0.33 + i * 0.22, 1.66, cz - 0.33, 12));
  P.push(cyl(0.012, 0.012, 0.2, WOOD, kx - 0.25, 1.15, cz - 0.34, 6), ball(0.05, WOOD, kx - 0.25, 1.04, cz - 0.33, 1, 0.5, 1, 8), cyl(0.012, 0.012, 0.18, IRON, kx + 0.25, 1.16, cz - 0.34, 6), cyl(0.1, 0.09, 0.03, 0x5d5862, kx + 0.25, 0.98, cz - 0.3, 12, H));
  // Pergola über der Theke mit Ranken und Lichterkette
  for (const z of [-11.55, -12.47]) P.push(rb(0.09, 1.98, 0.09, WOODD, -4.55, 0.99, z, 0.025), rb(1.15, 0.08, 0.1, WOOD, -5.07, 2.0, z, 0.02));
  for (const x of [-5.45, -5.15, -4.85]) P.push(rb(0.08, 0.06, 1.12, WOOD, x, 2.07, cz - 0.01, 0.02));
  for (let i = 0; i < 9; i++) {
    const x = -5.55 + i * 0.12, z = -11.55 + jit(0.04);
    P.push(ball(0.08, vary(snow ? 0xa6c9a0 : s === 'autumn' ? 0xd98a3a : LEAF, 0.06), x, 2.08 + jit(0.03), z, 1, 0.8, 1, 7));
    if (i % 3 === 0 && !snow) P.push(ball(0.055, vary(LEAF, 0.06), x + 0.03, 1.9 - (i % 2) * 0.1, z + 0.03, 0.9, 1.2, 0.9, 6), ball(0.04, F[i % F.length], x - 0.03, 2.13, z + 0.06, 1, 1, 1, 6));
    if (snow) P.push(ball(0.09, SNOW, x, 2.14, z, 1, 0.45, 1, 7));
  }
  for (const x of [-5.3, -4.9]) P.push(box(0.008, 0.12, 0.008, 0xd9c08a, x, 1.9, -11.6), cone(0.05, 0.14, x < -5 ? 0x7cbf6a : 0xa98fd6, x, 1.79, -11.6, 6, PI));
  at(P, G, 0, 0, 0, 0, (p, g) => garland(p, g, -5.6, -4.55, 1.97, -11.5, 0.1, 1.05));
  if (s === 'autumn') pumpkin(P, -4.7, 0, -11.45, 0.8);
}
function mail(l, P, G, s) {
  const x = -2, z = -8, col = 0x8ec9ef, red = 0xff5d5d, dc = shade(col, -0.08);
  P.push(rb(0.1, 0.95, 0.1, WOOD, x, 0.475, z, 0.025), rb(0.22, 0.05, 0.22, WOODD, x, 0.025, z, 0.02), rb(0.3, 0.05, 0.44, WOODD, x, 0.96, z, 0.015),
    beam([x, 0.72, z], [x, 0.95, z + 0.16], 0.04, WOOD));
  P.push(rb(0.34, 0.22, 0.5, col, x, 1.09, z, 0.03), cyl(0.17, 0.17, 0.5, col, x, 1.2, z, 16, H));
  P.push(rb(0.3, 0.2, 0.02, dc, x, 1.09, z + 0.255, 0.01), semi(0.15, 0.02, dc, x, 1.19, z + 0.255), ball(0.03, BRASS, x + 0.1, 1.12, z + 0.27, 1, 1, 1, 8));
  at(P, G, x - 0.172, 1.12, z, -H, p => p.push(...heart(0.13, ROSE, 0, 0, 0)));
  if (l) {
    P.push(box(0.025, 0.32, 0.025, red, x + 0.2, 1.24, z + 0.05), box(0.02, 0.1, 0.15, red, x + 0.2, 1.36, z + 0.12));
    P.push(box(0.24, 0.16, 0.012, CREAM, x, 1.43, z + 0.12, 0, 0.15), ball(0.025, BERRY, x, 1.45, z + 0.13, 1, 1, 0.5, 6)); // Brief schaut heraus
  } else P.push(box(0.025, 0.025, 0.3, red, x + 0.2, 1.08, z + 0.19), box(0.02, 0.09, 0.14, red, x + 0.2, 1.06, z + 0.28)); // Fahne unten
  P.push(ball(0.03, IRON, x + 0.19, 1.08, z + 0.05, 1, 1, 1, 6));
  if (s === 'winter') P.push(ball(0.19, SNOW, x, 1.36, z, 1, 0.3, 1.45, 10), ball(0.2, SNOW, x, 0.02, z, 1.2, 0.35, 1.2, 9));
  else {
    const F = FLOWERS[s];
    for (let k = 0; k < 5; k++) { const f = k * 1.25; P.push(ball(0.07, vary(LEAF), x + Math.sin(f) * 0.14, 0.06, z + Math.cos(f) * 0.14, 1, 0.8, 1, 7)); }
    for (let k = 0; k < 3; k++) { const f = k * 2.1 + 0.4; P.push(ball(0.04, F[k], x + Math.sin(f) * 0.15, 0.14, z + Math.cos(f) * 0.15, 1, 1, 1, 6)); }
  }
}


// ---------- Insel-Gebäude (lokal um den Ursprung gebaut, Vorderseite +z; die Welt setzt sie an ihre Stelle) ----------
// Dreieck (Giebel) als dünne Platte
function tri(w, h, d, c, x, y, z) {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, h)]), { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  return place(g, c, x, y, z);
}
// Inselbüro: großes, gestreiftes Zelt mit Wimpelkette
function office(P, G, s) {
  const W = 4.6, D = 2.7, H0 = 0.9, H1 = 2.5, snow = s === 'winter', A = 0x6cbf63, B = 0xfff4d6;
  P.push(rb(W + 0.5, 0.12, D + 0.6, 0xd9c49a, 0, 0.06, 0, 0.05));
  // senkrechte Seitenwände bis H0, darüber das Satteldach aus Stoffbahnen
  for (let i = 0; i < 10; i++) {
    const x = -W / 2 + (i + 0.5) * W / 10, c = i % 2 ? A : B;
    P.push(box(W / 10 + 0.005, H0, 0.05, c, x, H0 / 2 + 0.1, -D / 2), box(W / 10 + 0.005, H0, 0.05, c, x, H0 / 2 + 0.1, D / 2));
    const S = Math.hypot(D / 2 + 0.2, H1 - H0), a = Math.atan2(H1 - H0, D / 2 + 0.2);
    for (const sz of [-1, 1]) P.push(box(W / 10 + 0.005, 0.05, S, c, x, (H0 + H1) / 2 + 0.1, sz * (D / 4 + 0.05), 0, sz * a));
    P.push(semi(W / 20, 0.05, c, x, H0 + 0.1, D / 2 + 0.22, true));
  }
  for (const sx of [-1, 1]) P.push(box(0.05, H0, D, B, sx * W / 2, H0 / 2 + 0.1, 0), tri(D + 0.4, H1 - H0, 0.05, sx > 0 ? A : B, sx * W / 2, H0 + 0.1, 0));
  P.push(cyl(0.06, 0.06, W + 0.3, 0xa8743f, 0, H1 + 0.12, 0, 8, 0, 0, H));
  // Eingang: hochgeschlagene Plane
  P.push(box(1.2, 1.5, 0.06, 0x5a4636, 0, 0.85, D / 2 + 0.02), tri(1.3, 0.5, 0.06, 0x5a4636, 0, 1.6, D / 2 + 0.02));
  for (const sx of [-1, 1]) P.push(beam([sx * 0.62, 2.0, D / 2 + 0.06], [sx * 0.95, 0.4, D / 2 + 0.1], 0.18, A, 0.05));
  G.push(box(1.0, 1.2, 0.02, 0, 0, 0.75, D / 2 + 0.06));
  // Schild mit Blatt
  P.push(rb(1.1, 0.5, 0.08, 0xfff7ea, 0, 2.05, D / 2 + 0.12, 0.04), rb(1.2, 0.08, 0.1, 0xa8743f, 0, 2.33, D / 2 + 0.12, 0.02),
    ball(0.15, 0x5cb85c, -0.05, 2.05, D / 2 + 0.17, 1.4, 0.8, 0.3, 10), cyl(0.012, 0.012, 0.22, 0x3e8a3e, 0.12, 2.0, D / 2 + 0.18, 4, 0, 0, 0.8));
  // Masten mit Wimpeln
  for (const sx of [-1, 1]) {
    const x = sx * (W / 2 + 0.35);
    P.push(cyl(0.05, 0.06, 3.1, 0xa8743f, x, 1.55, D / 2 + 0.3, 8), ball(0.08, 0xffd23f, x, 3.15, D / 2 + 0.3, 1, 1, 1, 8));
  }
  const cols = [0xff6b8a, 0xffd23f, 0x6cc4ff, 0x8fd694, 0xb39cff];
  for (let i = 0; i < 12; i++) {
    const t = (i + 0.5) / 12, x = -W / 2 - 0.35 + t * (W + 0.7), y = 2.95 - Math.sin(t * PI) * 0.35;
    P.push(cone(0.1, 0.22, cols[i % 5], x, y - 0.1, D / 2 + 0.3, 3, 0, 0, PI));
  }
  // Tisch mit Laterne und Blumentöpfen
  P.push(rb(0.9, 0.06, 0.5, WOOD, 1.6, 0.72, D / 2 + 0.55, 0.02), rb(0.08, 0.7, 0.08, WOODD, 1.25, 0.36, D / 2 + 0.55, 0.02), rb(0.08, 0.7, 0.08, WOODD, 1.95, 0.36, D / 2 + 0.55, 0.02));
  pot(P, -1.75, 0, D / 2 + 0.5, s);
  pot(P, -1.35, 0, D / 2 + 0.7, s);
  if (snow) P.push(rb(W, 0.08, D * 0.62, SNOW, 0, H1 - 0.35, -0.1, 0.04));
}
// Krämerladen: Holzhaus mit gestreifter Markise, großem Schaufenster und Kisten voller Obst
function shop(P, G, s) {
  const W = 4.5, D = 2.6, top = 2.0, snow = s === 'winter', prof = [[D / 2 + 0.4, 0], [0, 1.3]], gf = fill(W, D, prof, WOODL), fr = PRODUCE[s] || PRODUCE.summer;
  P.push(rb(W + 0.2, 0.25, D + 0.2, STONE_D, 0, 0.125, 0, 0.05));
  for (let i = 0; i < 9; i++) P.push(rb(W, 0.22, D, vary(i % 2 ? WOODL : WOOD, 0.03), 0, 0.36 + i * 0.205, 0, 0.03));
  P.push(...tf([gf.p], 0, top, 0), ...tf(roofOf(W + 0.5, prof, 0x48a9a6, { snow, trim: CREAM, back: true, sw: 0.32, st: 0.21 }), 0, top, 0));
  // Schaufenster + Tür
  at(P, G, -1.05, 1.05, D / 2, 0, (p, g) => win(p, g, { w: 1.4, h: 0.8, frame: CREAM, s }));
  at(P, G, 1.25, 0, D / 2, 0, (p, g) => {
    p.push(rb(0.78, 1.5, 0.06, 0x6fb5a3, 0, 0.98, 0.03, 0.03), ball(0.045, BRASS, 0.26, 0.95, 0.08, 1, 1, 1, 8));
    g.push(box(0.4, 0.45, 0.02, 0, 0, 1.3, 0.07));
  });
  // Markise
  const a = Math.atan2(0.35, 0.9);
  for (let i = 0; i < 13; i++) {
    const x = -W / 2 + (i + 0.5) * W / 13, c = i % 2 ? CREAM : 0x5cb85c;
    P.push(box(W / 13 + 0.005, 0.04, 0.95, c, x, 1.9, D / 2 + 0.42, 0, a), semi(W / 26, 0.03, c, x, 1.72, D / 2 + 0.88, true));
  }
  // Schild mit Blatt + Kisten
  P.push(rb(1.3, 0.45, 0.08, CREAM, 0, 2.75, D / 2 + 0.3, 0.04), ball(0.16, 0x5cb85c, 0, 2.75, D / 2 + 0.36, 1.4, 0.8, 0.3, 10));
  crate(P, -1.55, 0, D / 2 + 0.75, 0.5, 0.42, fr[0]);
  crate(P, -0.95, 0, D / 2 + 0.75, 0.5, 0.42, fr[1]);
  crate(P, -1.25, 0.2, D / 2 + 0.35, 0.5, 0.42, fr[2]);
  if (s === 'autumn') pumpkin(P, 2.1, 0, D / 2 + 0.5);
}
// Museum: heller Steinbau mit Säulen, Giebel und Kuppel
function museum(P, G, s) {
  const W = 4.6, D = 3.4, snow = s === 'winter', MARB = 0xf4eee4, ROOF = 0x4e9fa8;
  for (let i = 0; i < 3; i++) P.push(rb(W + 0.6 - i * 0.2, 0.14, D + 0.9 - i * 0.2, vary(STONE, 0.03), 0, 0.07 + i * 0.14, 0.15 + i * 0.05, 0.03));
  P.push(rb(W, 2.0, D - 0.6, MARB, 0, 1.42, -0.3, 0.05));
  for (let i = 0; i < 5; i++) { const x = -1.9 + i * 0.95; P.push(cyl(0.16, 0.18, 1.9, 0xfffaf2, x, 1.37, D / 2 - 0.05, 14), rb(0.44, 0.12, 0.44, MARB, x, 2.37, D / 2 - 0.05, 0.03), rb(0.44, 0.12, 0.44, MARB, x, 0.48, D / 2 - 0.05, 0.03)); }
  P.push(rb(W + 0.3, 0.25, D + 0.1, MARB, 0, 2.55, -0.05, 0.04), tri(W + 0.3, 0.9, 0.3, MARB, 0, 2.66, D / 2 - 0.1), tri(W - 0.2, 0.65, 0.32, 0xe8dfd0, 0, 2.74, D / 2 - 0.09));
  // Dach: zwei Flächen + Kuppel
  const a = Math.atan2(0.9, W / 2);
  for (const sx of [-1, 1]) P.push(box(Math.hypot(W / 2 + 0.2, 0.9), 0.1, D + 0.2, ROOF, sx * (W / 4 + 0.05), 3.13, -0.05, 0, 0, -sx * a));
  P.push(cyl(0.95, 1.0, 0.5, MARB, 0, 3.4, -0.6, 20), ball(0.95, ROOF, 0, 3.6, -0.6, 1, 0.85, 1, 20), cyl(0.06, 0.06, 0.4, BRASS, 0, 4.55, -0.6, 8), ball(0.1, BRASS, 0, 4.78, -0.6, 1, 1, 1, 8));
  // Tür, Fenster und Rundfenster im Giebel
  at(P, G, 0, 0, D / 2 - 0.58, 0, (p, g) => { p.push(rb(1.0, 1.55, 0.08, 0x7a4e35, 0, 1.15, 0.04, 0.03), semi(0.5, 0.08, 0x7a4e35, 0, 1.92, 0.04)); g.push(semi(0.4, 0.02, 0, 0, 1.92, 0.09)); });
  for (const sx of [-1, 1]) at(P, G, sx * 1.45, 1.5, D / 2 - 0.58, 0, (p, g) => win(p, g, { w: 0.5, h: 0.8, frame: MARB, s }));
  at(P, G, 0, 3.05, D / 2 + 0.06, 0, (p, g) => roundWin(p, g, 0.2, MARB));
  // Banner und Büsche
  for (const sx of [-1, 1]) {
    P.push(box(0.4, 1.0, 0.03, sx > 0 ? 0x6cc4ff : 0xff8fab, sx * 2.55, 1.9, D / 2 + 0.05), cone(0.2, 0.2, sx > 0 ? 0x6cc4ff : 0xff8fab, sx * 2.55, 1.3, D / 2 + 0.05, 4, 0, PI / 4, PI));
    if (!snow) P.push(ball(0.35, vary(LEAF), sx * 2.7, 0.35, D / 2 + 0.55, 1, 0.8, 1, 9));
  }
  if (snow) P.push(ball(0.9, SNOW, 0, 3.85, -0.6, 1, 0.45, 1, 16));
}
// Dorfbaum auf dem Platz: großer Baum mit Steinring und Blumen
function plazatree(P, G, s) {
  const L = { spring: [0xffb7d0, 0xffc8dc], summer: [0x4fb548, 0x62c654], autumn: [0xf2a23a, 0xe9822f], winter: [0xeef4f8, 0xffffff] }[s] || [0x4fb548, 0x62c654];
  P.push(cyl(0.95, 1.0, 0.3, STONE, 0, 0.15, 0, 18), cyl(0.85, 0.85, 0.32, 0x7a5232, 0, 0.17, 0, 18));
  P.push(cyl(0.3, 0.45, 2.2, 0x8a5a36, 0, 1.2, 0, 12));
  for (const [x, y, z, r, c] of [[0, 3.0, 0, 1.6, 0], [1.1, 2.6, 0.4, 1.0, 1], [-1.1, 2.7, -0.2, 1.05, 1], [0.3, 3.9, 0.1, 1.0, 1], [-0.4, 2.5, 1.0, 0.9, 0], [0.5, 2.7, -1.0, 0.95, 0]]) P.push(ball(r, vary(L[c], 0.03), x, y, z, 1, 0.9, 1, 14));
  if (s !== 'winter') { const F = FLOWERS[s] || FLOWERS.summer; for (let k = 0; k < 10; k++) { const a = k / 10 * PI * 2; P.push(ball(0.08, F[k % F.length], Math.cos(a) * 0.65, 0.4, Math.sin(a) * 0.65, 1, 1, 1, 6)); } }
  else P.push(cyl(0.86, 0.86, 0.05, SNOW, 0, 0.35, 0, 18));
}
// Häuschen der Nachbarn: in ihren Lieblingsfarben, mit Briefkasten
const VH = { mira: [0xfff2e6, 0xff8fab, 0xb77a5a], bruno: [0xd9a46b, 0x4f8f5a, 0x7a4e35], pippa: [0xd6efff, 0x5aa0e0, 0xfff7ea], lio: [0xffc98f, 0xd9583a, 0x8f5a3c], kalle: [0xfff0c9, 0x7fbf6a, 0x9a6b44], wanda: [0xf3e6ff, 0xff8fbf, 0x7d9ad6] };
function vhouse(id, P, G, s) {
  const [wall, roof, door] = VH[id] || VH.mira, W = 1.9, D = 1.6, top = 1.35, snow = s === 'winter', prof = [[D / 2 + 0.3, 0], [0, 0.95]], gf = fill(W, D, prof, wall);
  P.push(rb(W + 0.14, 0.2, D + 0.14, STONE_D, 0, 0.1, -0.1, 0.04), rb(W, top - 0.2, D, wall, 0, 0.2 + (top - 0.2) / 2, -0.1, 0.05), ...tf([gf.p], 0, top, -0.1));
  P.push(...tf(roofOf(W + 0.4, prof, roof, { snow, trim: CREAM, back: true, sw: 0.26, st: 0.18 }), 0, top, -0.1));
  at(P, G, 0, 0, D / 2 - 0.1, 0, (p, g) => { p.push(rb(0.55, 0.95, 0.05, door, -0.35, 0.67, 0.03, 0.02), ball(0.035, BRASS, -0.18, 0.66, 0.07, 1, 1, 1, 6)); });
  at(P, G, 0.45, 0.85, D / 2 - 0.1, 0, (p, g) => win(p, g, { w: 0.42, h: 0.42, frame: CREAM, s, box: true }));
  P.push(cyl(0.04, 0.04, 0.8, WOODD, 1.15, 0.4, D / 2 + 0.25, 6), rb(0.24, 0.18, 0.32, roof, 1.15, 0.86, D / 2 + 0.25, 0.04));
  if (!snow) { const F = FLOWERS[s] || FLOWERS.summer; for (let k = 0; k < 4; k++) P.push(ball(0.13, vary(LEAF), -0.9 + k * 0.18, 0.12, D / 2 + 0.1, 1, 0.8, 1, 7), ball(0.05, F[k % F.length], -0.9 + k * 0.18, 0.24, D / 2 + 0.15, 1, 1, 1, 6)); }
}

// ---------- Bürgermeister-Update ----------
// Rathaus: Steinbau mit Uhrturm, Säulen und Fahnen (ersetzt das Zelt des Inselbüros)
function cityhall(P, G, s) {
  const W = 4.6, D = 2.6, top = 1.9, snow = s === 'winter', WALL = 0xfff3e0, ROOF = 0x4f7fc9, prof = [[D / 2 + 0.35, 0], [0, 1.0]], gf = fill(W, D, prof, WALL);
  P.push(rb(W + 0.4, 0.22, D + 0.6, STONE_D, 0, 0.11, 0.1, 0.05), rb(W, top - 0.22, D, WALL, 0, 0.22 + (top - 0.22) / 2, 0, 0.05), ...tf([gf.p], 0, top, 0));
  at(P, G, 0, 0, D / 2 + 0.06, 0, p => stones(p, W + 0.4, 0.22, 1));
  P.push(...tf(roofOf(W + 0.4, prof, ROOF, { snow, trim: CREAM, back: true, sw: 0.3, st: 0.2 }), 0, top, 0));
  // Treppe + Säulen + Tür
  for (let i = 0; i < 3; i++) P.push(rb(1.8 - i * 0.2, 0.1, 0.34, vary(STONE, 0.03), 0, 0.05 + i * 0.1, D / 2 + 0.55 - i * 0.16, 0.03));
  for (const x of [-0.8, 0.8]) P.push(cyl(0.11, 0.13, 1.5, 0xfffaf2, x, 1.05, D / 2 + 0.25, 12), rb(0.3, 0.1, 0.3, CREAM, x, 1.83, D / 2 + 0.25, 0.02));
  P.push(rb(2.0, 0.14, 0.5, CREAM, 0, 1.94, D / 2 + 0.2, 0.03));
  at(P, G, 0, 0, D / 2, 0, (p, g) => { p.push(rb(0.9, 1.25, 0.06, 0x8f603c, 0, 0.88, 0.03, 0.03), semi(0.45, 0.06, 0x8f603c, 0, 1.5, 0.03), ball(0.05, BRASS, 0.3, 0.9, 0.08, 1, 1, 1, 8)); g.push(semi(0.3, 0.02, 0, 0, 1.52, 0.07)); });
  for (const x of [-1.65, 1.65]) at(P, G, x, 1.05, D / 2, 0, (p, g) => win(p, g, { w: 0.6, h: 0.7, frame: CREAM, shut: ROOF, s, box: true }));
  // Uhrturm
  const tw = 1.1, th = 1.6, ty = top + 0.7;
  P.push(rb(tw, th, tw, WALL, 0, ty + th / 2, -0.2, 0.04), rb(tw + 0.12, 0.12, tw + 0.12, CREAM, 0, ty + th, -0.2, 0.03));
  P.push(cyl(0.36, 0.36, 0.06, CREAM, 0, ty + th * 0.62, -0.2 + tw / 2 + 0.02, 20, H), cyl(0.31, 0.31, 0.04, 0xfffdf6, 0, ty + th * 0.62, -0.2 + tw / 2 + 0.05, 20, H));
  P.push(box(0.03, 0.22, 0.02, DARK, 0, ty + th * 0.62 + 0.09, -0.2 + tw / 2 + 0.08), box(0.16, 0.03, 0.02, DARK, 0.07, ty + th * 0.62, -0.2 + tw / 2 + 0.08));
  at(P, G, 0, ty + th, -0.2, 0, p => coneRoof(p, 0.78, 0.9, ROOF, snow));
  P.push(cyl(0.02, 0.02, 0.5, IRON, 0, ty + th + 1.1, -0.2, 5), box(0.3, 0.2, 0.01, 0xff6b8a, 0.15, ty + th + 1.25, -0.2));
  // Fahnen an Masten
  for (const [sx, c] of [[-1, 0xff8fab], [1, 0x6cc4ff]]) {
    const x = sx * (W / 2 + 0.45);
    P.push(cyl(0.05, 0.06, 3.0, 0xd9d2c8, x, 1.5, D / 2 + 0.4, 8), ball(0.08, BRASS, x, 3.04, D / 2 + 0.4, 1, 1, 1, 8), box(0.6, 0.38, 0.02, c, x + sx * 0.32, 2.72, D / 2 + 0.4));
  }
  if (!snow) for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) P.push(ball(0.28, vary(LEAF), sx * (1.3 + k * 0.45), 0.3, D / 2 + 0.55, 1, 0.8, 1, 9));
}
// Ladenfront für die Bummelgasse: Wand, Dach, Schaufenster, Markise, Schild
function storefront(P, G, s, o) {
  const { W = 4.8, D = 2.6, top = 2.2, wall, roof, door, awn = [CREAM, ROSE], sign = CREAM } = o, prof = [[D / 2 + 0.35, 0], [0, 1.1]], gf = fill(W, D, prof, wall);
  P.push(rb(W + 0.2, 0.25, D + 0.2, STONE_D, 0, 0.125, 0, 0.05), rb(W, top - 0.25, D, wall, 0, 0.25 + (top - 0.25) / 2, 0, 0.05), ...tf([gf.p], 0, top, 0));
  P.push(...tf(roofOf(W + 0.4, prof, roof, { trim: CREAM, back: true, sw: 0.32, st: 0.21 }), 0, top, 0));
  at(P, G, -1.15, 1.1, D / 2, 0, (p, g) => win(p, g, { w: 1.6, h: 0.9, frame: CREAM, s }));
  at(P, G, 1.3, 0, D / 2, 0, (p, g) => { p.push(rb(0.8, 1.55, 0.06, door, 0, 1.02, 0.03, 0.03), ball(0.045, BRASS, 0.27, 0.95, 0.08, 1, 1, 1, 8)); g.push(box(0.42, 0.45, 0.02, 0, 0, 1.4, 0.07)); });
  const a = Math.atan2(0.35, 0.9);
  for (let i = 0; i < 14; i++) { const x = -W / 2 + (i + 0.5) * W / 14, c = awn[i % 2]; P.push(box(W / 14 + 0.005, 0.04, 0.9, c, x, 2.05, D / 2 + 0.4, 0, a), semi(W / 28, 0.03, c, x, 1.88, D / 2 + 0.84, true)); }
  P.push(rb(1.7, 0.5, 0.1, sign, 0, 2.75, D / 2 + 0.3, 0.05), rb(1.8, 0.08, 0.12, WOODD, 0, 3.04, D / 2 + 0.3, 0.02));
}
function tailor(P, G, s) {
  storefront(P, G, s, { wall: 0xffe3ec, roof: 0xd96a8f, door: 0x9a6bd6, awn: [CREAM, 0xb39cff] });
  // Schild: Garnrolle mit Nadel, Schneiderpuppe im Fenster
  P.push(cyl(0.16, 0.16, 0.06, 0xff8fab, 0, 2.75, 1.65, 14, H), cyl(0.1, 0.1, 0.08, CREAM, 0, 2.75, 1.66, 12, H), box(0.5, 0.025, 0.02, 0xb9b6b2, 0.1, 2.85, 1.7, 0, 0, 0.5));
  P.push(cyl(0.02, 0.02, 0.5, WOODD, -1.15, 0.9, 1.05, 5), ball(0.2, 0x8fcdb4, -1.15, 1.22, 1.05, 1, 1.4, 0.8, 10), ball(0.07, 0xffd23f, -1.15, 1.5, 1.05, 1, 1, 1, 6));
}
function garden(P, G, s) {
  storefront(P, G, s, { wall: 0xe8f5d8, roof: 0x5aa84a, door: 0xc9884f, awn: [CREAM, 0x7cc96a] });
  // Glasdach-Anbau, Blumentöpfe, Gießkanne aufs Schild
  P.push(ball(0.2, 0x7cc96a, 0, 2.76, 1.68, 1.5, 0.9, 0.35, 10), cyl(0.012, 0.012, 0.26, 0x3e8a3e, 0.15, 2.72, 1.7, 4, 0, 0, 0.8));
  for (const [x, c] of [[-2.0, 0xff6b8a], [-1.5, 0xffd23f], [-0.85, 0xb39cff], [2.1, 0xff8a3d]]) P.push(cyl(0.17, 0.13, 0.26, TERRA, x, 0.13, 1.75, 10), ball(0.2, vary(LEAF), x, 0.38, 1.75, 1, 0.8, 1, 8), ball(0.07, c, x + 0.07, 0.5, 1.82, 1, 1, 1, 6), ball(0.06, c, x - 0.08, 0.47, 1.85, 1, 1, 1, 6));
}
function club(P, G, s) {
  const W = 5.2, D = 2.6, top = 2.4, WALL = 0x3b3560, prof = [[D / 2 + 0.3, 0], [0, 0.6]], gf = fill(W, D, prof, WALL);
  P.push(rb(W + 0.2, 0.25, D + 0.2, 0x5d5862, 0, 0.125, 0, 0.05), rb(W, top - 0.25, D, WALL, 0, 0.25 + (top - 0.25) / 2, 0, 0.05), ...tf([gf.p], 0, top, 0));
  P.push(...tf(roofOf(W + 0.4, prof, 0x2a2648, { trim: 0x6c63a8, back: true, sw: 0.32, st: 0.21 }), 0, top, 0));
  // Tür mit Vordach, Mond-Schild, bunte Lichterkette
  at(P, G, 0, 0, D / 2, 0, (p, g) => { p.push(rb(1.1, 1.6, 0.06, 0x7b5cd6, 0, 1.05, 0.03, 0.03), rb(1.6, 0.1, 0.6, 0x6c63a8, 0, 1.95, 0.3, 0.03)); g.push(box(0.9, 0.06, 0.02, 0, 0, 1.75, 0.07)); });
  G.push(ball(0.34, 0, 0, 2.95, D / 2 + 0.12, 1, 1, 0.25, 14));
  P.push(ball(0.3, 0x3b3560, 0.16, 3.02, D / 2 + 0.17, 1, 1, 0.25, 12));
  for (let i = 0; i < 13; i++) { const x = -W / 2 + 0.2 + i * (W - 0.4) / 12, y = 2.2 - Math.sin(i / 12 * PI) * 0.18; G.push(ball(0.06, 0, x, y, D / 2 + 0.07, 1, 1, 1, 6)); }
  for (const x of [-1.8, 1.8]) at(P, G, x, 1.2, D / 2, 0, (p, g) => roundWin(p, g, 0.32, 0x6c63a8));
  for (const [x, c] of [[-2.3, 0xff6b8a], [2.3, 0x6cc4ff]]) P.push(cyl(0.05, 0.05, 1.6, IRON, x, 0.8, D / 2 + 0.5, 6), ball(0.13, c, x, 1.7, D / 2 + 0.5, 1, 1, 1, 8));
}
// Tor zur Bummelgasse (auf der Insel) und dasselbe Tor am Ende der Bummelgasse
function streetgate(P, G, s) {
  const snow = s === 'winter';
  for (const sx of [-1, 1]) {
    P.push(rb(0.5, 2.6, 0.5, STONE, sx * 1.4, 1.3, 0, 0.05), rb(0.62, 0.16, 0.62, STONE_D, sx * 1.4, 2.66, 0, 0.04), cone(0.35, 0.4, 0xd96a8f, sx * 1.4, 2.94, 0, 4, 0, PI / 4));
    at(P, G, sx * 1.4, 0, 0.26, 0, p => stones(p, 0.5, 0.4));
    if (!snow) P.push(ball(0.32, vary(LEAF), sx * 1.95, 0.3, 0.3, 1, 0.8, 1, 8), ball(0.08, 0xff8fab, sx * 1.9, 0.5, 0.5, 1, 1, 1, 6));
  }
  P.push(arc(1.4, 0.09, WOODD, 0, 2.3, 0, PI), rb(2.4, 0.55, 0.1, CREAM, 0, 2.75, 0.12, 0.05), rb(2.5, 0.08, 0.12, WOODD, 0, 3.06, 0.12, 0.02));
  for (let i = 0; i < 9; i++) { const a = i / 8 * PI; G.push(ball(0.05, 0, Math.cos(a) * 1.4, 2.3 + Math.sin(a) * 1.4, 0.08, 1, 1, 1, 6)); }
  const cols = [0xff6b8a, 0xffd23f, 0x6cc4ff, 0x8fd694, 0xb39cff];
  for (let i = 0; i < 6; i++) P.push(cone(0.1, 0.18, cols[i % 5], -1.0 + i * 0.4, 3.25, 0.12, 3, PI));
}
// Käpt'n Flossis Boot am Steg
function boat(P, G, s) {
  const HULL = 0xf4f1ea, RED = 0xe0605a;
  P.push(ball(0.6, HULL, 0, -0.05, 0, 0.95, 0.45, 2.1, 14), box(1.05, 0.12, 2.3, WOODL, 0, 0.18, 0), ball(0.62, RED, 0, -0.18, 0, 0.97, 0.18, 2.12, 14));
  P.push(rb(0.7, 0.4, 0.6, WOODL, 0, 0.42, 0.5, 0.05), rb(0.8, 0.06, 0.7, 0x6cc4ff, 0, 0.66, 0.5, 0.03));
  P.push(cyl(0.04, 0.05, 2.0, WOODD, 0, 1.2, -0.35, 6), beam([0, 2.1, -0.35], [0, 0.6, -1.1], 0.03, CREAM, 0.6));
  P.push(cyl(0.12, 0.12, 0.05, RED, 0.5, 0.35, -0.6, 10, 0, 0, H), cyl(0.08, 0.08, 0.06, CREAM, 0.5, 0.35, -0.6, 10, 0, 0, H));
  // Robbe Käpt'n Flossi
  P.push(ball(0.22, 0x9aa6b2, 0, 0.55, -0.1, 1, 1.2, 1, 10), ball(0.16, 0x9aa6b2, 0, 0.86, -0.04, 1, 1, 1, 10), ball(0.06, 0xd9dde2, 0, 0.82, 0.1, 1.4, 0.8, 1, 8),
    ball(0.025, DARK, -0.06, 0.92, 0.1, 1, 1, 1, 6), ball(0.025, DARK, 0.06, 0.92, 0.1, 1, 1, 1, 6), cyl(0.16, 0.17, 0.08, 0x2f3e5c, 0, 1.0, -0.04, 12), box(0.22, 0.02, 0.12, 0x2f3e5c, 0, 0.97, 0.12));
}
// Steg und Hütte auf der Tropeninsel
function hut(P, G, s) {
  const W = 4.2, D = 2.4, top = 1.7, prof = [[D / 2 + 0.6, 0], [0, 1.4]], gf = fill(W, D, prof, 0xe3b47c);
  P.push(rb(W + 0.4, 0.3, D + 0.4, WOODD, 0, 0.15, 0, 0.04));
  for (let i = 0; i < 8; i++) P.push(rb(W, 0.2, D, vary(i % 2 ? WOODL : WOOD, 0.03), 0, 0.4 + i * 0.18, 0, 0.03));
  P.push(...tf([gf.p], 0, top, 0), ...tf(roofOf(W + 0.8, prof, HAY, { back: true, sw: 0.4, st: 0.24, trim: 0xd9b45a }), 0, top, 0));
  at(P, G, 0, 0, D / 2, 0, (p, g) => { p.push(rb(0.9, 1.3, 0.06, 0x5a4636, 0, 0.95, 0.03, 0.03)); g.push(box(0.7, 1.0, 0.02, 0, 0, 0.95, 0.06)); });
  P.push(rb(1.5, 0.45, 0.08, CREAM, 0, 2.15, D / 2 + 0.35, 0.04), ball(0.14, 0xff6b6b, -0.45, 2.15, D / 2 + 0.42, 1, 1.2, 0.4, 8), ball(0.08, 0xffd23f, -0.42, 2.3, D / 2 + 0.44, 1, 1, 0.4, 6));
  for (const sx of [-1, 1]) P.push(cyl(0.05, 0.06, 1.8, WOODD, sx * 2.6, 0.9, D / 2 + 0.3, 6), cone(0.12, 0.18, HAY, sx * 2.6, 1.9, D / 2 + 0.3, 6)), G.push(ball(0.1, 0, sx * 2.6, 2.05, D / 2 + 0.3, 1, 1.4, 1, 6));
  // Kiki der Papagei auf der Stange
  P.push(cyl(0.02, 0.02, 0.9, WOODD, 1.6, 0.45, D / 2 + 0.6, 5), box(0.4, 0.03, 0.03, WOODD, 1.6, 0.9, D / 2 + 0.6), ball(0.12, 0x3fbf5a, 1.6, 1.05, D / 2 + 0.6, 1, 1.3, 1, 8),
    ball(0.08, 0xff4d4d, 1.6, 1.24, D / 2 + 0.62, 1, 1, 1, 8), cone(0.03, 0.07, 0xffd23f, 1.6, 1.22, D / 2 + 0.72, 5, H), ball(0.06, 0x3f7fd9, 1.6, 0.9, D / 2 + 0.55, 0.8, 2, 0.6, 6));
}
function dock(P, G, s) {
  for (let i = 0; i < 9; i++) P.push(box(1.5, 0.08, 0.46, vary(WOODL, 0.05), 0, 0.02, 9 + i * 0.5));
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) P.push(cyl(0.07, 0.07, 1.0, WOODD, sx * 0.72, -0.3, 9.2 + i * 1.3, 6));
  P.push(...tf(boatParts(), 1.6, 0, 12));
}
const boatParts = () => { const p = [], g = []; boat(p, g); return p; };

const BUILD = {
  house, coop, barn, mail,
  office: (l, s, P, G) => cityhall(P, G, s), tent: (l, s, P, G) => office(P, G, s), gate: (l, s, P, G) => streetgate(P, G, s), boat: (l, s, P, G) => boat(P, G, s),
  tailor: (l, s, P, G) => tailor(P, G, s), garden: (l, s, P, G) => garden(P, G, s), club: (l, s, P, G) => club(P, G, s), hut: (l, s, P, G) => hut(P, G, s), dock: (l, s, P, G) => dock(P, G, s), shop: (l, s, P, G) => shop(P, G, s), museum: (l, s, P, G) => museum(P, G, s), plazatree: (l, s, P, G) => plazatree(P, G, s),
  vhouse_mira: (l, s, P, G) => vhouse('mira', P, G, s), vhouse_bruno: (l, s, P, G) => vhouse('bruno', P, G, s), vhouse_pippa: (l, s, P, G) => vhouse('pippa', P, G, s), vhouse_lio: (l, s, P, G) => vhouse('lio', P, G, s),
  vhouse_kalle: (l, s, P, G) => vhouse('kalle', P, G, s), vhouse_wanda: (l, s, P, G) => vhouse('wanda', P, G, s),
  market: (l, s, P, G) => market(P, G, s), bin: (l, s, P, G) => bin(P, G, s), board: (l, s, P, G) => board(P, G, s),
  bench: (l, s, P, G) => bench(P, G, s), kitchen: (l, s, P, G) => kitchen(P, G, s),
};
BUILD.mail = (l, s, P, G) => mail(l, P, G, s);

const cache = new Map();
// Neue Blender-Modelle (assets/models/buildings.glb) haben Vorrang
function assetName(id, level, season) {
  if (id === 'house') return 'house_' + Math.max(1, Math.min(5, level));
  if (id === 'mail') return 'mail_' + (level ? 1 : 0);
  if (id === 'plazatree') return 'plazatree_' + (['spring', 'summer', 'autumn', 'winter'].includes(season) ? season : 'summer');
  return id;
}
// Dein Haus Stufe 4 und 5: Grundform von Stufe 3 (Turm links, Anbau), neu eingefärbt und vergrößert,
// dazu eine richtig sitzende Dachgaube, Blumenbalkon, Veranda und ein zweiter Turm vorne rechts.
const HOUSE_LOOK = { 4: { hue: 0.94, roof: 0xe77ba0, wall: 0xffe6f0, trim: 0xffffff, scale: 1.07 }, 5: { hue: 0.075, roof: 0xf2a15a, wall: 0xfff3e4, trim: 0xffffff, scale: 1.13 } };
const variantGeo = new Map();
function recolored(geo, hue) {
  const g = geo.clone(), a = g.getAttribute('color');
  if (!a) return g;
  const c = new THREE.Color(), hsl = {};
  for (let i = 0; i < a.count; i++) {
    c.setRGB(a.getX(i), a.getY(i), a.getZ(i));
    c.getHSL(hsl);
    if (hsl.h > 0.5 && hsl.h < 0.72 && hsl.s > 0.12) { c.setHSL(hue, hsl.s * 0.92, hsl.l); a.setXYZ(i, c.r, c.g, c.b); }
  }
  a.needsUpdate = true;
  return g;
}
function houseExtras(l, L) {
  const P = [], G = [], W = L.wall, R = L.roof;
  // Vorgarten: zwei Blumenbeete mit Holzrand und zwei Laternen
  for (const x of [-1.55, 1.45]) {
    P.push(box(0.95, 0.14, 0.42, WOODD, x, 0.07, 1.78), box(0.85, 0.08, 0.32, 0x7a5a3a, x, 0.15, 1.78));
    for (let i = 0; i < 4; i++) P.push(ball(0.075, [ROSE, BRASS, LILA, PINK][(i + (x > 0 ? 2 : 0)) % 4], x - 0.3 + i * 0.2, 0.25, 1.78 + (i % 2 ? 0.06 : -0.06)), cyl(0.012, 0.012, 0.12, LEAF, x - 0.3 + i * 0.2, 0.17, 1.78, 4));
  }
  for (const x of [-2.25, 2.0]) { P.push(cyl(0.04, 0.05, 1.1, DARK, x, 0.55, 2.05, 8), box(0.16, 0.06, 0.16, DARK, x, 1.13, 2.05)); G.push(box(0.12, 0.16, 0.12, 0, x, 1.22, 2.05)); P.push(cone(0.13, 0.12, DARK, x, 1.36, 2.05, 4, 0, PI / 4)); }
  if (l >= 5) {
    // Veranda mit Säulen vor der Tür
    for (const x of [-1.25, 0.05]) P.push(cyl(0.07, 0.09, 1.45, L.trim, x, 0.98, 1.72, 12), cyl(0.12, 0.12, 0.08, L.trim, x, 0.3, 1.72, 12));
    P.push(box(1.65, 0.12, 0.85, R, -0.6, 1.72, 1.45), box(1.75, 0.06, 0.95, L.trim, -0.6, 1.64, 1.45));
    // zweiter Turm vorne rechts – mit sichtbarem Körper und Kuppel
    const tx = 2.15, tz = 0.85;
    P.push(cyl(0.48, 0.52, 2.75, W, tx, 1.38, tz, 22), cyl(0.56, 0.56, 0.12, STONE, tx, 0.06, tz, 22));
    P.push(ball(0.64, R, tx, 2.76, tz, 1, 1.35, 1, 18), cyl(0.6, 0.6, 0.1, L.trim, tx, 2.76, tz, 22));
    P.push(cyl(0.02, 0.02, 0.6, DARK, tx, 3.85, tz, 6), ball(0.08, BRASS, tx, 4.15, tz));
    P.push(cyl(0.18, 0.18, 0.05, L.trim, tx, 1.75, tz + 0.5, 14, H));
    G.push(cyl(0.14, 0.14, 0.06, 0, tx, 1.75, tz + 0.51, 14, H));
    for (let i = 0; i < 4; i++) P.push(ball(0.07, [ROSE, BRASS, LILA, PINK][i], tx - 0.3 + i * 0.2, 0.18, tz + 0.55));
  }
  return [P, G];
}
function houseVariant(l) {
  const base = model('house_3');
  if (!base) return null;
  const L = HOUSE_LOOK[l];
  base.traverse(o => {
    if (!o.isMesh || o.name.includes('__glow') || o.parent?.name?.includes('__glow')) return;
    const k = l + '|' + o.name;
    if (!variantGeo.has(k)) variantGeo.set(k, recolored(o.geometry, L.hue));
    o.geometry = variantGeo.get(k);
  });
  const k = 'x' + l;
  if (!variantGeo.has(k)) { const [P, G] = houseExtras(l, L); variantGeo.set(k, [merge(P), G.length ? merge(G) : null]); }
  const [geo, glow] = variantGeo.get(k), ex = new THREE.Mesh(geo, MAT);
  ex.castShadow = ex.receiveShadow = true;
  base.add(ex);
  if (glow) base.add(new THREE.Mesh(glow, GLOW));
  base.scale.setScalar(L.scale);
  base.userData.asset = 'house_' + l;
  return base;
}

export function building(id, level = 1, season = 'summer') {
  if (id === 'house' && level >= 4) { const v = houseVariant(Math.min(5, level)); if (v) return v; }
  const a = model(assetName(id, level, season));
  if (a) return a;
  if (season !== 'winter' && !FLOWERS[season]) season = 'summer';
  const k = id + '|' + level + '|' + season;
  if (!cache.has(k)) {
    seed = 11 + id.length * 97 + level * 13;
    const P = [], G = [];
    BUILD[id]?.(level, season, P, G);
    cache.set(k, [merge(P), G.length ? merge(G) : null]);
  }
  const [geo, glow] = cache.get(k), g = new THREE.Group(), m = new THREE.Mesh(geo, MAT);
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  if (glow) g.add(new THREE.Mesh(glow, GLOW));
  return g;
}
