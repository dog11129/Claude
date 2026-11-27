// Modelle für Inselleben 15 „Winterzauber“: Federballnetz, Erinnerungsbaum (fünf Wuchsstufen), Koi und Koi-Deko,
// geschnitzte Kürbisse, Lebkuchenhaus, Puzzletisch, Adventskalender mit seinen Geschenken, Bilderrahmen. Format wie models-14.js.
import * as THREE from '../vendor/three.module.min.js';

const PI = Math.PI, H = PI / 2, TAU = PI * 2;
function put(g, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return { g, c };
}
const plain = g => { const p = new THREE.BufferGeometry().copy(g); p.userData = { ...g.userData, src: [g.type, g.parameters] }; return p; }; // src: für den Blender-Nachbau
const B = (r, c, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, w = 12, h = 9) => put(plain(new THREE.SphereGeometry(r, w, h).scale(sx, sy, sz)), c, x, y, z);
const C = (rt, rb, h, c, x = 0, y = 0, z = 0, seg = 14, rx = 0, ry = 0, rz = 0) => put(plain(new THREE.CylinderGeometry(rt, rb, h, seg)), c, x, y, z, rx, ry, rz);
const K = (r, h, c, x = 0, y = 0, z = 0, seg = 12, rx = 0, ry = 0, rz = 0) => put(plain(new THREE.ConeGeometry(r, h, seg)), c, x, y, z, rx, ry, rz);
const X = (w, h, d, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => put(plain(new THREE.BoxGeometry(w, h, d)), c, x, y, z, rx, ry, rz);
const T = (R, t, c, x, y, z, rx = H, ry = 0, arc = TAU) => put(plain(new THREE.TorusGeometry(R, t, 6, 18, arc)), c, x, y, z, rx, ry);
function soft(w, h, d, c, x = 0, y = 0, z = 0, e = 0.3, ry = 0) {
  const g = new THREE.SphereGeometry(1, 12, 8), a = g.attributes.position.array;
  for (let i = 0; i < a.length; i++) a[i] = Math.sign(a[i]) * Math.abs(a[i]) ** e;
  g.userData.soft = e; // für den Blender-Nachbau
  g.scale(w / 2, h / 2, d / 2);
  return put(g, c, x, y, z, 0, ry);
}
const WOOD = 0xd9a86c, WOODD = 0xa87449, WOODL = 0xeac894, CREAM = 0xfff3e0, WHITE = 0xffffff, PINK = 0xffb7c8, ROSE = 0xff8fab, MINT = 0xa8e2cf, SKY = 0xaed6f5,
  LILA = 0xcdb8f5, BUTTER = 0xffe39a, LEAF = 0x6cc06a, DLEAF = 0x4fa156, DARK = 0x4a3a3a, STONE = 0xc8c0b8, RED = 0xe8445e, GOLD = 0xf2c84b,
  ORANGE = 0xf2903a, GLOWY = 0xfff0a8, EARTH = 0xb98d5e, BARK = 0x9a6a44, FIR = 0x2f6a4a, GINGER = 0xb5733a, SKIN = 0xffd8b8;
const ring = (n, r, fn, off = 0) => Array.from({ length: n }, (_, i) => { const a = i / n * TAU + off; return fn(Math.cos(a) * r, Math.sin(a) * r, i, a); }).flat();
function heart(c, x, y, z, s = 0.05) { // flaches Herz, schaut nach +z
  const k = new THREE.ConeGeometry(s * 0.95, s * 1.15, 4);
  k.rotateY(PI / 4); k.scale(1, 1, 0.45);
  return [B(s * 0.62, c, x - s * 0.42, y + s * 0.2, z, 1, 1, 0.5, 8, 6), B(s * 0.62, c, x + s * 0.42, y + s * 0.2, z, 1, 1, 0.5, 8, 6), put(plain(k), c, x, y - s * 0.5, z, 0, 0, PI)];
}

// ---------- Erinnerungsbaum ----------
export const treeBaseParts = () => [C(0.44, 0.46, 0.04, EARTH, 0, 0.02, 0, 14), ...ring(9, 0.46, (x, z, i) => B(0.085, i % 2 ? STONE : 0xd8d2ca, x, 0.045, z, 1.1, 0.7, 0.9, 7, 5)),
  C(0.018, 0.02, 0.3, WOODD, 0.4, 0.15, 0.34, 6), X(0.2, 0.13, 0.02, WOODL, 0.4, 0.32, 0.345), ...heart(ROSE, 0.4, 0.325, 0.357, 0.035)];
// Krone je Wuchsstufe: [Stammhöhe, Stammradius, Kronenradius, Kugeln]
const TREE = [[0.26, 0.016, 0.07, 2], [0.55, 0.045, 0.3, 3], [0.8, 0.07, 0.44, 5], [1.05, 0.1, 0.6, 7], [1.3, 0.14, 0.78, 9]];
const CROWN = { spring: [0xffc2d6, 0xffa8c4, 0xffe0ea], summer: [0x7ccf74, 0x62bd62, 0x96dc86], autumn: [0xf2a23a, 0xe8733a, 0xf7c64a], winter: [0xf4f9ff, 0xe4eefa, 0xffffff] };
export const treeCrown = st => ({ y: TREE[st][0] + TREE[st][2] * 0.55, r: TREE[st][2] });
export function memTreeParts(st = 3, season = 'summer') {
  const [h, r, cr, n] = TREE[st], col = CROWN[season] || CROWN.summer, p = [C(r * 0.7, r, h, BARK, 0, h / 2, 0, 9)];
  if (st === 0) return [...p, B(0.07, LEAF, 0.06, h, 0, 1.3, 0.5, 0.8, 7, 5), B(0.06, DLEAF, -0.05, h - 0.05, 0.02, 1.2, 0.5, 0.8, 7, 5)];
  if (st >= 3) p.push(C(r * 0.3, r * 0.45, cr * 1.1, BARK, cr * 0.4, h * 0.82, 0, 6, 0, 0, -0.8), C(r * 0.3, r * 0.45, cr * 1.0, BARK, -cr * 0.36, h * 0.8, 0.05, 6, 0, 0, 0.8),
    ...ring(5, r * 1.15, (x, z) => B(r * 0.5, BARK, x, 0.03, z, 1.4, 0.5, 1.4, 6, 4)));
  if (st >= 4) p.push(...heart(ROSE, 0, h * 0.5, r * 0.95, 0.05));
  p.push(B(cr, col[0], 0, h + cr * 0.55, 0, 1, 0.9, 1, 12, 9));
  for (let i = 1; i < n; i++) { const a = i * 2.4, d = cr * 0.7; p.push(B(cr * (0.62 + (i % 3) * 0.07), col[i % 3], Math.cos(a) * d, h + cr * (0.3 + (i % 4) * 0.2), Math.sin(a) * d, 1, 0.9, 1, 10, 7)); }
  if (season === 'spring') for (let i = 0; i < n * 2; i++) { const a = i * 1.7, d = cr * 0.95; p.push(B(cr * 0.09, WHITE, Math.cos(a) * d * 0.9, h + cr * (0.35 + (i % 5) * 0.17), Math.sin(a) * d * 0.9, 1, 1, 1, 6, 4)); }
  return p;
}
const ORN = [RED, GOLD, 0x6cc4ff, ROSE, 0xb39cff, MINT, 0xff8f5a, WHITE];
// Anhänger (Meilensteine) und Zettel hängen unten in der Krone
export function treeHangParts(st, marks, notes) {
  const { y, r } = treeCrown(st), p = [];
  for (let i = 0; i < marks; i++) { const a = i * 2.4 + 0.5, d = r * (0.72 + (i % 2) * 0.16), yy = y - r * 0.55 + (i % 3) * r * 0.14; p.push(C(0.004, 0.004, 0.09, 0xd8d8e0, Math.cos(a) * d, yy + 0.07, Math.sin(a) * d, 4), B(0.045, ORN[i % ORN.length], Math.cos(a) * d, yy, Math.sin(a) * d, 1, 1, 1, 8, 6)); }
  for (let i = 0; i < notes; i++) { const a = i * 2.1 + 1.9, d = r * 0.9, yy = y - r * 0.7 - (i % 2) * 0.05; p.push(C(0.003, 0.003, 0.1, 0xd8d8e0, Math.cos(a) * d, yy + 0.09, Math.sin(a) * d, 4), X(0.075, 0.09, 0.008, i % 3 ? CREAM : PINK, Math.cos(a) * d, yy, Math.sin(a) * d, 0, -a + H)); }
  return p;
}

// ---------- Koi (schwimmt entlang +z) ----------
const RAIN = [0xff6b6b, 0xffb86b, 0xffe066, 0x8fd694, 0x6cc4ff, 0xb39cff];
export function koiParts(base, spot, v = '') {
  const p = [B(0.1, base, 0, 0, 0, 0.6, 0.42, 1.45, 10, 7), B(0.06, base, 0, 0, 0.12, 0.85, 0.6, 0.9, 8, 6), B(0.07, base, 0, 0, -0.19, 1.25, 0.2, 0.9, 7, 5), B(0.035, base, -0.07, -0.01, 0.03, 1.3, 0.25, 0.8, 6, 4), B(0.035, base, 0.07, -0.01, 0.03, 1.3, 0.25, 0.8, 6, 4),
    B(0.012, 0x22222a, -0.035, 0.022, 0.15, 1, 1, 1, 5, 4), B(0.012, 0x22222a, 0.035, 0.022, 0.15, 1, 1, 1, 5, 4)];
  const dots = [[0.02, 0.07, 0.036], [-0.025, -0.03, 0.04], [0.015, -0.12, 0.03]];
  if (v === 'regen') dots.concat([[-0.02, 0.02, 0.03], [0.03, -0.07, 0.03], [0, 0.12, 0.028]]).forEach(([x, z, r], i) => p.push(B(r, RAIN[i], x, 0.03, z, 1, 0.35, 1.2, 7, 5)));
  else if (spot != null) dots.forEach(([x, z, r]) => p.push(B(r, spot, x, 0.03, z, 1, 0.35, 1.2, 7, 5)));
  if (v === 'drei') p.push(B(0.022, 0x34343c, -0.03, 0.03, 0.08, 1, 0.35, 1.1, 6, 4), B(0.02, 0x34343c, 0.035, 0.03, -0.07, 1, 0.35, 1.1, 6, 4));
  if (v === 'herz') p.push(...heart(0xe8445e, 0, 0, 0, 0.034).map(q => (q.g.rotateX(-H), q.g.translate(0, 0.046, 0), q)));
  return p;
}
export const shuttleParts = () => [B(0.04, CREAM, 0, 0, 0, 1, 1, 1, 8, 6), put(plain(new THREE.ConeGeometry(0.075, 0.13, 10, 1, true)), WHITE, 0, 0.085, 0, PI), T(0.03, 0.008, RED, 0, 0.02, 0)];

// ---------- geschnitzte Kürbisse ----------
function carved(face) {
  const p = [B(0.3, ORANGE, 0, 0.27, 0, 1, 0.86, 1, 14, 10), ...ring(7, 0.07, (x, z) => B(0.225, 0xe8802c, x, 0.27, z, 1, 1.02, 1, 10, 8)), C(0.03, 0.045, 0.11, 0x6a8a3a, 0, 0.56, 0, 7, 0, 0, 0.15), B(0.05, DLEAF, 0.08, 0.53, 0, 1.6, 0.25, 1, 6, 4)], g = [];
  if (face === 'froh') g.push(B(0.05, GLOWY, -0.1, 0.34, 0.275, 1, 1, 0.45, 8, 6), B(0.05, GLOWY, 0.1, 0.34, 0.275, 1, 1, 0.45, 8, 6), T(0.105, 0.024, GLOWY, 0, 0.25, 0.292, PI, 0, PI), K(0.025, 0.045, GLOWY, 0, 0.285, 0.3, 3));
  else if (face === 'grusel') g.push(K(0.06, 0.1, GLOWY, -0.1, 0.35, 0.265, 3, 0.2), K(0.06, 0.1, GLOWY, 0.1, 0.35, 0.265, 3, 0.2), ...[-0.12, -0.06, 0, 0.06, 0.12].map((x, i) => K(0.035, 0.07, GLOWY, x, 0.2 + (i % 2) * 0.012, 0.3 - Math.abs(x) * 0.25, 3, 0, 0, i % 2 ? PI : 0)), X(0.26, 0.022, 0.03, GLOWY, 0, 0.21, 0.285));
  else g.push(...heart(GLOWY, -0.1, 0.34, 0.285, 0.05), ...heart(GLOWY, 0.1, 0.34, 0.285, 0.05), T(0.07, 0.02, GLOWY, 0, 0.22, 0.295, PI, 0, PI));
  return [p, g];
}

export const PLACE_15 = {
  federballnetz: () => [...[-1, 1].flatMap(sx => [C(0.03, 0.035, 1.08, WHITE, sx * 0.47, 0.54, 0, 8), C(0.1, 0.12, 0.05, 0x8a93a3, sx * 0.47, 0.025, 0, 10), B(0.04, ROSE, sx * 0.47, 1.1, 0, 1, 1, 1, 8, 6)]),
    X(0.9, 0.04, 0.02, WHITE, 0, 1.04, 0), X(0.9, 0.02, 0.015, WHITE, 0, 0.6, 0), ...[-0.36, -0.24, -0.12, 0, 0.12, 0.24, 0.36].map(x => X(0.012, 0.42, 0.01, 0xe8eef5, x, 0.82, 0)), ...[0.7, 0.8, 0.9].map(y => X(0.9, 0.012, 0.01, 0xe8eef5, 0, y, 0)),
    ...shuttleParts().map(q => (q.g.rotateZ(1.9), q.g.translate(0.3, 0.1, 0.25), q))],
  erinnerungsbaum: () => [...treeBaseParts(), ...memTreeParts(3, 'summer'), ...treeHangParts(3, 5, 3)],
  koifahne: () => [C(0.025, 0.035, 1.9, WOODD, 0, 0.95, 0, 8), B(0.045, GOLD, 0, 1.92, 0), C(0.12, 0.15, 0.06, STONE, 0, 0.03, 0, 10),
    ...[[RED, 1.68], [0x4f8fe8, 1.36], [GOLD, 1.04]].flatMap(([c, y], i) => [B(0.1, c, 0.26, y, 0, 2.1, 0.85, 0.6, 12, 8), B(0.07, WHITE, 0.1, y, 0, 0.9, 1.1, 0.75, 8, 6), K(0.09, 0.14, c, 0.5, y, 0, 4, 0, 0, H), B(0.02, DARK, 0.12, y + 0.03, 0.045, 1, 1, 1, 5, 4),
      ...[0.22, 0.32].map(x => B(0.04, i === 2 ? 0xfff0a8 : WHITE, x, y - 0.02, 0.05, 1, 0.9, 0.4, 6, 4))])],
  koistatue: () => [[C(0.3, 0.34, 0.26, STONE, 0, 0.13, 0, 12), C(0.33, 0.33, 0.04, 0xd8d2ca, 0, 0.28, 0, 12), T(0.2, 0.03, 0x9fd4ff, 0, 0.31, 0), ...ring(6, 0.2, (x, z, i) => B(0.035, 0xd8f0ff, x, 0.34 + (i % 2) * 0.03, z, 1, 1.4, 1, 6, 4)),
    B(0.11, GOLD, 0, 0.5, -0.04, 0.75, 1.5, 0.6, 10, 8), B(0.09, GOLD, 0, 0.72, 0.03, 0.75, 1.2, 0.6, 10, 8), B(0.07, GOLD, 0, 0.88, 0.1, 0.8, 0.9, 0.7, 8, 6), B(0.07, 0xf7dc7a, 0, 0.36, -0.1, 1.5, 0.9, 0.3, 8, 6),
    B(0.04, 0xf7dc7a, -0.09, 0.62, 0, 1.4, 0.8, 0.3, 6, 4), B(0.04, 0xf7dc7a, 0.09, 0.62, 0, 1.4, 0.8, 0.3, 6, 4), B(0.014, DARK, -0.04, 0.9, 0.14), B(0.014, DARK, 0.04, 0.9, 0.14)], [B(0.045, GLOWY, 0, 1.0, 0.16)]],
  schnitzkuerbis_froh: () => carved('froh'),
  schnitzkuerbis_grusel: () => carved('grusel'),
  schnitzkuerbis_herz: () => carved('herz'),
  lebkuchenhaus: () => [[X(0.62, 0.4, 0.5, GINGER, 0, 0.2, 0), K(0.5, 0.36, 0x9c5f2a, 0, 0.58, 0, 4, 0, PI / 4), ...ring(8, 0.36, (x, z) => B(0.055, WHITE, x * 0.95, 0.42, z * 0.8, 1, 0.8, 1, 7, 5)), B(0.07, WHITE, 0, 0.76, 0, 1, 0.7, 1, 8, 6),
    ...[[RED, -0.14, 0.56, 0.17], [MINT, 0.14, 0.56, 0.17], [GOLD, 0, 0.64, 0.12], [ROSE, -0.2, 0.5, 0.21], [SKY, 0.2, 0.5, 0.21]].map(([c, x, y, z]) => B(0.03, c, x, y, z, 1, 1, 1, 6, 5)),
    X(0.13, 0.22, 0.02, 0x7a4a22, 0, 0.11, 0.255), B(0.012, GOLD, 0.04, 0.11, 0.27), X(0.14, 0.012, 0.03, WHITE, 0, 0.225, 0.26), X(0.1, 0.18, 0.1, 0x9c5f2a, 0.2, 0.62, -0.1), B(0.06, WHITE, 0.2, 0.72, -0.1, 1, 0.6, 1, 7, 5),
    ...[-1, 1].flatMap(sx => [C(0.014, 0.014, 0.2, WHITE, sx * 0.36, 0.1, 0.28, 6), T(0.03, 0.014, RED, sx * 0.36 - sx * 0.03, 0.2, 0.28, 0, 0, PI)]), ...[-0.24, 0.24].map(x => X(0.12, 0.12, 0.012, WHITE, x, 0.24, 0.252))],
    [X(0.09, 0.09, 0.02, GLOWY, -0.24, 0.24, 0.256), X(0.09, 0.09, 0.02, GLOWY, 0.24, 0.24, 0.256)]],
};

// ---------- Möbel ----------
const PZ = [0xffb7c8, 0xaed6f5, 0xffe39a, 0xa8e2cf, 0xcdb8f5, 0xffd0a8];
export const POLA_TILT = [0, -0.06, 0.05, -0.03, 0.07, -0.05, 0.03];
const POLA_TAPE = [0, PINK, MINT, BUTTER, SKY, LILA, 0xffd0a8];
const polaroid = n => [X(0.44, 0.52, 0.012, 0xf4f1ea, 0, 1.42, -0.462, 0, 0, POLA_TILT[n]), X(0.36, 0.3, 0.006, 0xd8dde4, 0, 1.47, -0.455, 0, 0, POLA_TILT[n]), X(0.15, 0.05, 0.008, POLA_TAPE[n], 0, 1.69, -0.452, 0, 0, POLA_TILT[n] + 0.12)];
const frame = () => [X(0.94, 0.7, 0.035, WOODD, 0, 1.4, -0.47), X(0.84, 0.6, 0.012, CREAM, 0, 1.4, -0.452), ...[[-0.3, 0.15], [0.3, 0.15], [0, -0.15], [-0.3, -0.15]].map(([x, y], i) => X(0.26, 0.26, 0.006, PZ[i], x, 1.4 + y * 0.9, -0.447))];
export const FURN_15 = {
  puzzletisch: () => [soft(0.88, 0.06, 0.72, WOODL, 0, 0.5, 0, 0.5), ...[[-0.36, -0.28], [0.36, -0.28], [-0.36, 0.28], [0.36, 0.28]].map(([x, z]) => C(0.035, 0.03, 0.47, WOOD, x, 0.235, z, 8)), X(0.62, 0.012, 0.44, 0xf7efe2, -0.04, 0.537, 0),
    ...[[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [3, 1], [0, 2], [1, 2], [2, 2], [4, 2], [0, 3], [1, 3]].map(([i, j]) => X(0.098, 0.014, 0.105, PZ[(i * 2 + j) % 6], -0.29 + i * 0.1, 0.548, -0.16 + j * 0.107)),
    ...[[0.34, 0.2, 0.4], [0.37, 0.02, 1.2], [0.3, -0.2, 2.2], [0.39, -0.12, 0.9]].map(([x, z, r], i) => X(0.09, 0.014, 0.095, PZ[(i + 3) % 6], x, 0.542, z, 0, r)), X(0.2, 0.07, 0.14, RED, 0.3, 0.57, -0.26, 0, 0.3), X(0.2, 0.012, 0.14, CREAM, 0.3, 0.61, -0.26, 0, 0.3)],
  adventskalender: () => [X(0.86, 0.64, 0.03, FIR, 0, 1.4, -0.47), ...Array.from({ length: 24 }, (_, i) => X(0.105, 0.105, 0.016, [RED, CREAM, GOLD, 0x3f8a5e][(i * 3 + (i / 6 | 0)) % 4], -0.335 + (i % 6) * 0.134, 1.6 - (i / 6 | 0) * 0.134, -0.45)),
    ...[-0.3, -0.1, 0.1, 0.3].map((x, i) => B(0.035, i % 2 ? GOLD : RED, x, 1.74, -0.45)), X(0.86, 0.03, 0.035, 0x245238, 0, 1.73, -0.468), K(0.07, 0.12, GOLD, 0, 1.82, -0.46, 5)],
  nikolausstiefel: () => [C(0.13, 0.12, 0.34, RED, 0, 0.27, -0.03, 12), B(0.14, RED, 0, 0.11, 0.08, 0.95, 0.75, 1.55, 10, 8), T(0.135, 0.05, WHITE, 0, 0.45, -0.03), C(0.016, 0.016, 0.26, WHITE, -0.05, 0.56, -0.05, 6, 0, 0, 0.12), T(0.035, 0.016, RED, -0.1, 0.68, -0.05, 0, 0, PI),
    B(0.06, ORANGE, 0.05, 0.5, -0.02, 1, 1, 1, 8, 6), X(0.09, 0.09, 0.09, 0x4f8fe8, 0.01, 0.52, -0.1, 0, 0.5), X(0.1, 0.02, 0.02, GOLD, 0.01, 0.57, -0.1, 0, 0.5), B(0.035, 0x7a4a22, 0.07, 0.47, 0.06, 1, 1.2, 1, 6, 5)],
  nussknacker: () => [C(0.16, 0.18, 0.06, 0x2f3a4a, 0, 0.03, 0, 10), ...[-0.055, 0.055].flatMap(x => [C(0.045, 0.045, 0.3, WHITE, x, 0.21, 0, 8), B(0.055, DARK, x, 0.075, 0.02, 1, 0.6, 1.3, 7, 5)]), C(0.12, 0.11, 0.3, RED, 0, 0.5, 0, 10), X(0.245, 0.03, 0.2, GOLD, 0, 0.38, 0),
    ...[0.44, 0.5, 0.56].map(y => B(0.016, GOLD, 0, y, 0.115, 1, 1, 1, 5, 4)), ...[-1, 1].flatMap(sx => [C(0.04, 0.04, 0.26, RED, sx * 0.155, 0.5, 0, 7), B(0.04, SKIN, sx * 0.155, 0.36, 0, 1, 1, 1, 6, 5), B(0.05, GOLD, sx * 0.155, 0.63, 0, 1.1, 0.6, 1.1, 6, 5)]),
    B(0.11, SKIN, 0, 0.74, 0, 1, 1, 1, 10, 8), B(0.07, WHITE, 0, 0.67, 0.07, 1.2, 1, 0.6, 8, 6), X(0.09, 0.035, 0.03, WHITE, 0, 0.73, 0.1), B(0.014, DARK, -0.04, 0.77, 0.1), B(0.014, DARK, 0.04, 0.77, 0.1), B(0.02, 0xf2a0a0, 0, 0.745, 0.11),
    C(0.105, 0.11, 0.2, DARK, 0, 0.92, 0, 10), C(0.112, 0.112, 0.04, GOLD, 0, 0.84, 0, 10), B(0.03, RED, 0, 1.03, 0)],
  adventsstern: () => [[...Array.from({ length: 10 }, (_, i) => { const a = i / 10 * TAU; return K(0.075, i % 2 ? 0.2 : 0.3, i % 2 ? 0xffe6c4 : CREAM, Math.cos(a) * (i % 2 ? 0.17 : 0.22), 1.5 + Math.sin(a) * (i % 2 ? 0.17 : 0.22), -0.4, 5, 0, 0, a - H); }),
    K(0.07, 0.16, CREAM, 0, 1.5, -0.33, 5, H), C(0.004, 0.004, 0.3, 0xd8d8e0, 0, 1.84, -0.4, 4)], [B(0.12, GLOWY, 0, 1.5, -0.4, 1, 1, 0.7, 10, 8)]],
  weihnachtspyramide: () => [[C(0.3, 0.32, 0.05, WOODL, 0, 0.025, 0, 14), C(0.21, 0.21, 0.03, WOODL, 0, 0.38, 0, 12), C(0.13, 0.13, 0.03, WOODL, 0, 0.66, 0, 12), C(0.012, 0.012, 0.98, WOODD, 0, 0.52, 0, 6),
    ...ring(4, 0.25, (x, z) => C(0.014, 0.014, 0.36, WOOD, x * 0.84, 0.21, z * 0.84, 6), PI / 4), ...ring(4, 0.16, (x, z) => C(0.012, 0.012, 0.28, WOOD, x * 0.75, 0.52, z * 0.75, 6)),
    ...ring(6, 0.16, (x, z, i, a) => X(0.24, 0.008, 0.075, i % 2 ? WOODL : CREAM, x, 1.0, z, 0.35, -a)), B(0.03, RED, 0, 1.03, 0),
    ...ring(4, 0.27, (x, z) => [C(0.02, 0.02, 0.1, RED, x, 0.1, z, 7), C(0.03, 0.03, 0.012, GOLD, x, 0.056, z, 7)]), ...ring(3, 0.13, (x, z, i) => [B(0.04, [WHITE, FIR, RED][i], x, 0.44, z, 1, 1.3, 1, 7, 5), B(0.026, SKIN, x, 0.51, z, 1, 1, 1, 6, 5)], 0.5),
    K(0.05, 0.14, FIR, 0, 0.74, 0.06, 6), B(0.03, WHITE, -0.05, 0.71, -0.03, 1, 1.3, 1, 6, 5)], [...ring(4, 0.27, (x, z) => B(0.022, GLOWY, x, 0.17, z, 1, 1.5, 1, 6, 5))]],
  ...Object.fromEntries([1, 2, 3, 4, 5, 6].map(n => ['puzzlebild' + n, frame])),
  ...Object.fromEntries([1, 2, 3, 4, 5, 6].map(n => ['polaroid' + n, () => polaroid(n)])),
};
