// Kleine 3D-Modelle für Gegenstände, die sonst nur ein Emoji hätten (Fische, Meerestiere, Insekten, Fossilien,
// Samentüten, Essen …). Daraus rendert icons.js die Bilder fürs Inventar. Alle Formen sind eigene, einfache Entwürfe.
// Achsen: y = oben, Tiere schauen nach +x (die Icon-Kamera blickt von vorne auf die Seite).
import * as THREE from '../vendor/three.module.min.js';
import { ball, cyl, cone, box, model } from './models.js';
import { model as asset } from './assets.js';
import { CROPS } from './data.js';

const PI = Math.PI;
const EYE = 0x2b2222, WHITE = 0xffffff;
// gedrehtes Ellipsoid
const ell = (r, c, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0, seg = 12) => {
  const g = new THREE.SphereGeometry(r, seg, Math.max(6, seg - 3));
  g.scale(sx, sy, sz);
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return { g, c };
};
const torus = (R, t, c, x, y, z, rx = 0, ry = 0, rz = 0, arc = PI * 2) => {
  const g = new THREE.TorusGeometry(R, t, 8, 20, arc);
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return { g, c };
};
// flaches Dreieck/Flosse in der x-y-Ebene
const fin = (pts, c, z = 0, th = 0.02) => {
  const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: false });
  g.translate(0, 0, z - th / 2);
  return { g, c };
};
const eye = (x, y, z, r = 0.035) => [ball(r * 1.25, WHITE, x, y, z, 1, 1, 0.6), ball(r, EYE, x + r * 0.15, y, z + r * 0.45, 1, 1, 0.6), ball(r * 0.3, WHITE, x + r * 0.35, y + r * 0.35, z + r * 0.9)];

// ---------- Fische ----------
// [Körper, Bauch, Flossen, Form, Muster-Farbe]
const FISH_LOOK = {
  barsch: [0x8bbf5a, 0xf3f0c8, 0xff8a5a, 'fish', 0x3f6b2a], forelle: [0x9cb7a0, 0xfff1e0, 0x86a08a, 'fish', 0xd86a8a],
  hecht: [0x6f9a54, 0xe8edc2, 0x8a9a50, 'long', 0xd9e6a0], lachs: [0xf29d86, 0xffe2d6, 0xe7826b, 'fish', 0xb9d0e0],
  karpfen: [0xd7a046, 0xfff0c8, 0xc58534, 'deep', 0x9a6a2a], goldfisch: [0xff8a2a, 0xffd39a, 0xffb36b, 'gold'],
  makrele: [0x5aa0c8, 0xf2f6fa, 0x4c88aa, 'long', 0x23506e], kugelfisch: [0xe8d27a, 0xfff6d6, 0xd9b85a, 'round', 0x8a6a2a],
  rochen: [0x8e9db0, 0xe8eef4, 0x7a8a9c, 'flat'], hai: [0x8597a8, 0xf2f4f6, 0x73879a, 'shark'],
  blitzaal: [0x3a4a8a, 0xfff6a0, 0xffe040, 'long', 0xffe040], nebelhecht: [0xb8c4cc, 0xf4f6f8, 0x9aa8b4, 'long', 0xe0e6ec], sternbarsch: [0x2f3f78, 0xc8d4ff, 0xffd23f, 'fish', 0xffe066],
};
function fish(id) {
  const [c, belly, fc, shape, pat] = FISH_LOOK[id] || [0x8ab0d0, 0xf4f8fa, 0x6a90b0, 'fish'];
  const p = [];
  if (shape === 'flat') { // Rochen: flache Raute mit Schwanz
    p.push(ell(0.42, c, 0, 0.08, 0, 1, 0.16, 1.15, 0, PI / 4), ell(0.3, belly, 0, 0.055, 0, 1, 0.08, 1.1, 0, PI / 4));
    p.push(cyl(0.012, 0.03, 0.5, c, -0.5, 0.1, 0, 6, 0, 0, PI / 2), ...eye(0.18, 0.14, 0.1, 0.03), ...eye(0.18, 0.14, -0.1, 0.03));
    return p;
  }
  const L = shape === 'long' ? 0.5 : shape === 'shark' ? 0.55 : shape === 'round' ? 0.3 : 0.38, H = shape === 'deep' ? 0.24 : shape === 'round' ? 0.3 : shape === 'long' ? 0.12 : 0.18;
  p.push(ell(1, c, 0, 0.3, 0, L, H, H * 0.75), ell(1, belly, 0.02, 0.27, 0, L * 0.85, H * 0.62, H * 0.62));
  const tx = -L * 0.92, ty = 0.3;
  if (shape === 'gold') p.push(fin([[tx + 0.08, ty], [tx - 0.3, ty + 0.25], [tx - 0.22, ty], [tx - 0.3, ty - 0.25]], fc, 0, 0.03), fin([[tx + 0.05, ty], [tx - 0.25, ty + 0.12], [tx - 0.25, ty - 0.12]], 0xffe0b0, 0.03, 0.02));
  else if (shape === 'shark') p.push(fin([[tx + 0.08, ty], [tx - 0.24, ty + 0.3], [tx - 0.12, ty], [tx - 0.2, ty - 0.18]], fc), fin([[-0.06, ty + H * 0.8], [-0.24, ty + H + 0.22], [-0.24, ty + H * 0.7]], fc));
  else p.push(fin([[tx + 0.06, ty], [tx - 0.2, ty + 0.17], [tx - 0.15, ty], [tx - 0.2, ty - 0.17]], fc));
  if (shape !== 'shark' && shape !== 'round') p.push(fin([[L * 0.25, ty + H * 0.85], [-L * 0.25, ty + H * 1.45], [-L * 0.5, ty + H * 0.75]], fc));
  p.push(fin([[0.02, ty - H * 0.5], [-0.12, ty - H - 0.08], [-0.16, ty - H * 0.5]], fc, H * 0.55));
  if (pat && shape !== 'round') for (let i = 0; i < 3; i++) p.push(ell(0.05, pat, -0.12 + i * 0.12, ty + H * 0.45, H * 0.6, 0.5, 1.4, 0.3));
  if (shape === 'round') for (let i = 0; i < 14; i++) { const a = i / 14 * PI * 2; p.push(cone(0.025, 0.08, pat, Math.cos(a) * 0.3, ty + Math.sin(a) * 0.3, 0.05, 5, 0, 0, a - PI / 2)); }
  p.push(...eye(L * 0.62, ty + H * 0.25, H * 0.55, shape === 'shark' ? 0.025 : 0.04));
  if (shape !== 'shark') p.push(ell(0.03, 0xd86a6a, L * 0.95, ty - H * 0.1, 0, 0.6, 0.5, 0.7));
  return p;
}
function crab(c, claw, big) {
  const s = big ? 1.15 : 1, p = [ell(0.24 * s, c, 0, 0.18, 0, 1.25, 0.55, 1)];
  for (const sz of [-1, 1]) {
    for (let i = 0; i < 3; i++) p.push(cyl(0.02, 0.016, 0.22, c, -0.05 + i * 0.1, 0.08, sz * 0.24, 6, sz * 0.9, 0, 0));
    p.push(ell(0.09 * s, claw, 0.26 * s, 0.22, sz * 0.2, 1.3, 0.8, 0.8), cone(0.04, 0.1, claw, 0.36 * s, 0.25, sz * 0.2, 6, 0, 0, -PI / 2));
  }
  p.push(cyl(0.012, 0.012, 0.12, c, 0.12, 0.3, 0.07, 5), cyl(0.012, 0.012, 0.12, c, 0.12, 0.3, -0.07, 5), ...eye(0.13, 0.37, 0.07, 0.03), ...eye(0.13, 0.37, -0.07, 0.03));
  return p;
}
function lobster(c) {
  const p = [ell(0.12, c, 0.08, 0.15, 0, 1.6, 0.8, 0.8)];
  for (let i = 0; i < 4; i++) p.push(ell(0.08 - i * 0.008, c, -0.12 - i * 0.09, 0.14, 0, 0.8, 0.7, 0.9));
  p.push(fin([[-0.45, 0.14], [-0.6, 0.26], [-0.6, 0.02]], 0xd85a3a, 0, 0.04));
  for (const sz of [-1, 1]) p.push(ell(0.08, c, 0.34, 0.16, sz * 0.12, 1.6, 0.8, 0.8), ell(0.06, 0xd85a3a, 0.48, 0.18, sz * 0.14, 1.2, 0.9, 0.7));
  p.push(...eye(0.22, 0.24, 0.05, 0.025), cyl(0.006, 0.006, 0.4, c, 0.4, 0.3, 0.04, 4, 0, 0, -1.1));
  return p;
}
const SEA_MODELS = {
  dublone: () => [cyl(0.15, 0.15, 0.03, 0xffd23f, 0, 0.16, 0, 18, PI / 2), cyl(0.11, 0.11, 0.035, 0xf0c020, 0, 0.16, 0, 18, PI / 2), box(0.04, 0.1, 0.04, 0xffe98a, 0, 0.16, 0.02)],
  seekarte: () => [box(0.5, 0.01, 0.36, 0xf2e0b8, 0, 0.02, 0), cyl(0.03, 0.03, 0.38, 0xe8d0a0, -0.25, 0.04, 0, 8, PI / 2), cyl(0.03, 0.03, 0.38, 0xe8d0a0, 0.25, 0.04, 0, 8, PI / 2), ...[[-0.1, -0.05], [0.05, 0.08], [0.15, -0.06]].map(([x, z]) => ball(0.025, 0x6cb4ff, x, 0.03, z, 1, 0.3, 1)), box(0.05, 0.012, 0.012, 0xe8283c, 0.12, 0.03, 0.08, 0, 0.8), box(0.05, 0.012, 0.012, 0xe8283c, 0.12, 0.03, 0.08, 0, -0.8)],
  seeglas: () => [ell(0.16, 0x8fe0d0, -0.06, 0.06, 0, 1.2, 0.35, 0.9, 0, 0.4), ell(0.12, 0xa8c8ff, 0.14, 0.05, 0.06, 1.1, 0.35, 0.8, 0, -0.6), ell(0.09, 0xc8f0e0, 0.02, 0.05, -0.14, 1, 0.3, 1)],
  riffkoralle: () => [ell(0.2, 0xe8d8c8, 0, 0.04, 0, 1.1, 0.3, 1), ...[[0, 0.36, 0, 0, 0xff7b8a], [0.12, 0.28, 0.05, -0.5, 0xffb36b], [-0.12, 0.3, -0.03, 0.5, 0xc9a8ff], [0.04, 0.22, 0.12, -0.2, 0xff9ad8], [-0.06, 0.24, -0.12, 0.3, 0x6cd4c8]].flatMap(([x, h, z, r, c]) => [cyl(0.03, 0.045, h, c, x, h / 2 + 0.04, z, 6, 0, 0, r), ball(0.045, c, x - Math.sin(r) * h * 0.5, h + 0.06, z)])],
  krebs: () => lobster(0xd2603a), hummer: () => lobster(0xc8402e), krabbe: () => crab(0xf07a4a, 0xf05a3a),
  frosch: () => [ell(0.2, 0x7cc65a, 0, 0.16, 0, 1.2, 0.8, 1), ell(0.12, 0xe8f2c0, 0.08, 0.12, 0, 1, 0.7, 0.9), ...[-1, 1].flatMap(sz => [ell(0.08, 0x6ab24a, -0.08, 0.08, sz * 0.17, 1.6, 0.6, 0.7), ball(0.07, 0x7cc65a, 0.12, 0.32, sz * 0.1), ...eye(0.15, 0.34, sz * 0.12, 0.035)]), torus(0.06, 0.008, 0x3f6b2a, 0.2, 0.2, 0, 0, PI / 2, 0, PI)],
  tintenfisch: () => [ell(0.14, 0xf2b8c8, 0.12, 0.3, 0, 1.6, 0.8, 0.8), cone(0.12, 0.12, 0xf2b8c8, 0.4, 0.3, 0, 8, 0, 0, -PI / 2), ...Array.from({ length: 6 }, (_, i) => cyl(0.018, 0.01, 0.28, 0xe8a0b4, -0.15, 0.24 + (i - 2.5) * 0.03, (i % 2 - 0.5) * 0.08, 5, 0, 0, PI / 2 + (i - 2.5) * 0.12)), ...eye(0.02, 0.33, 0.1, 0.035)],
  seestern: () => Array.from({ length: 5 }, (_, i) => { const a = i / 5 * PI * 2 + PI / 2; return ell(0.17, 0xff8a5a, Math.cos(a) * 0.16, 0.06, Math.sin(a) * 0.16, 1, 0.3, 0.42, 0, -a); }).concat([ball(0.1, 0xff9a6a, 0, 0.07, 0, 1, 0.4, 1), ...Array.from({ length: 10 }, (_, i) => { const a = i / 10 * PI * 2; return ball(0.02, 0xffd2a0, Math.cos(a) * 0.15, 0.11, Math.sin(a) * 0.15); })]),
  seegurke: () => [ell(0.14, 0x9a6a4a, 0, 0.12, 0, 2.2, 0.85, 0.9), ...Array.from({ length: 8 }, (_, i) => cone(0.02, 0.06, 0xc89a6a, -0.25 + i * 0.07, 0.24, (i % 2 - 0.5) * 0.08, 5)), ...Array.from({ length: 6 }, (_, i) => cone(0.015, 0.06, 0xf0d8a0, 0.32, 0.12 + (i - 2.5) * 0.02, (i % 2 - 0.5) * 0.04, 5, 0, 0, -PI / 2 + (i - 2.5) * 0.2))],
  seeanemone: () => [cyl(0.12, 0.16, 0.18, 0xd84a7a, 0, 0.09, 0, 12), ...Array.from({ length: 16 }, (_, i) => { const a = i / 16 * PI * 2, r = i % 2 ? 0.08 : 0.12; return cyl(0.018, 0.01, 0.2, i % 3 ? 0xff7aa8 : 0xffc2d8, Math.cos(a) * r, 0.25, Math.sin(a) * r, 5, Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); })],
  auster: () => [ell(0.24, 0x9aa0a6, 0, 0.06, 0, 1.2, 0.3, 1), ell(0.22, 0xb8bec4, 0, 0.14, -0.02, 1.15, 0.25, 0.95, -0.35), ell(0.16, 0xfaf0f4, 0, 0.09, 0.04, 1, 0.25, 0.8)],
  krake: () => [ell(0.2, 0xd8604a, 0, 0.4, 0, 1, 1.15, 1), ...Array.from({ length: 8 }, (_, i) => { const a = i / 8 * PI * 2; return ell(0.06, 0xe8705a, Math.cos(a) * 0.2, 0.14, Math.sin(a) * 0.2, 1, 2.6, 1, Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); }), ...eye(0.17, 0.42, 0.1, 0.04), ...eye(0.17, 0.42, -0.1, 0.04)],
  garnele: () => [...Array.from({ length: 6 }, (_, i) => ell(0.07 - i * 0.005, 0xff9a7a, 0.2 - i * 0.08, 0.18 + Math.sin(i * 0.6) * 0.08, 0, 0.9, 0.9, 0.8)), fin([[-0.24, 0.3], [-0.36, 0.42], [-0.34, 0.24]], 0xff7a5a, 0, 0.03), cyl(0.005, 0.005, 0.35, 0xff7a5a, 0.35, 0.25, 0, 4, 0, 0, -0.9), ...eye(0.24, 0.24, 0.05, 0.022)],
  seeigel: () => [ball(0.16, 0x4a2a5a, 0, 0.16, 0, 1, 0.8, 1, 12), ...Array.from({ length: 26 }, (_, i) => { const a = i * 2.4, b = Math.acos(1 - 2 * ((i + 0.5) / 26)); if (b > 2.2) return null; return cyl(0.008, 0.002, 0.18, 0x6a3a8a, Math.sin(b) * Math.cos(a) * 0.2, 0.16 + Math.cos(b) * 0.17, Math.sin(b) * Math.sin(a) * 0.2, 4, Math.sin(a) * b, 0, -Math.cos(a) * b); }).filter(Boolean)],
  qualle: () => [ell(0.22, 0xc9b4f7, 0, 0.45, 0, 1, 0.75, 1, 0, 0, 0, 14), ell(0.18, 0xeee6ff, 0, 0.36, 0, 1, 0.25, 1), ...Array.from({ length: 7 }, (_, i) => { const a = i / 7 * PI * 2; return cyl(0.012, 0.006, 0.32, 0xd8c8ff, Math.cos(a) * 0.12, 0.18, Math.sin(a) * 0.12, 4, 0, 0, Math.sin(i) * 0.2); }), ...eye(0.17, 0.48, 0.12, 0.03), ...eye(0.17, 0.48, -0.0, 0.03)],
};

// ---------- Insekten ----------
function butterfly(top, bottom, spot, big = 1) {
  const p = [ell(0.035, 0x3a2e2e, 0, 0.3, 0, 1, 1, 3.2, PI / 2), ball(0.04, 0x3a2e2e, 0, 0.3, 0.14)];
  for (const s of [-1, 1]) {
    p.push(ell(0.17 * big, top, s * 0.15 * big, 0.36 + 0.06 * big, 0.04, 1, 0.82, 0.12, 0, 0, s * 0.35), ell(0.12 * big, bottom, s * 0.1 * big, 0.2, 0.03, 1, 0.9, 0.12, 0, 0, -s * 0.3));
    if (spot) p.push(ball(0.035 * big, spot, s * 0.18 * big, 0.4 + 0.06 * big, 0.07, 1, 1, 0.3));
    p.push(cyl(0.004, 0.004, 0.16, 0x3a2e2e, s * 0.04, 0.42, 0.15, 4, 0, 0, -s * 0.35), ball(0.012, 0x3a2e2e, s * 0.07, 0.49, 0.15));
  }
  return p;
}
function beetle(shell, body, spots, horn) {
  const p = [ell(0.2, shell, 0, 0.14, 0, 1.25, 0.7, 1), ell(0.09, body, 0.24, 0.12, 0, 1, 0.8, 1), ball(0.006, 0x222222, 0, 0.27, 0, 1.2, 1, 0.2)];
  p.push(box(0.46, 0.008, 0.012, 0x2a2222, -0.02, 0.27, 0));
  for (const [x, z] of spots || []) p.push(ball(0.04, 0x2a2222, x, 0.25, z, 1, 0.4, 1));
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) p.push(cyl(0.012, 0.008, 0.16, 0x2a2222, -0.1 + i * 0.12, 0.06, s * 0.2, 5, s * 1.0, 0, 0));
  if (horn === 'stag') for (const s of [-1, 1]) p.push(torus(0.09, 0.018, 0x5a3a2a, 0.38, 0.14, s * 0.05, 0, 0, s * 0.2, 2.2));
  p.push(...eye(0.3, 0.16, 0.06, 0.018), ...eye(0.3, 0.16, -0.06, 0.018));
  return p;
}
const BUG_MODELS = {
  kohlweissling: () => butterfly(0xfaf8f0, 0xf0eee0, 0x3a3a3a),
  zitronenfalter: () => butterfly(0xfff070, 0xf8e860, 0xff9a3a),
  blaeuling: () => butterfly(0x6aa8ff, 0x9ac4ff, 0xffffff, 0.85),
  vogelfalter: () => butterfly(0x2a3a2a, 0x3ad08a, 0x7affb0, 1.2),
  atlasspinner: () => butterfly(0xc8743a, 0xa85a2a, 0xffe8c0, 1.3),
  nachtfalter: () => butterfly(0xb0a690, 0x9a907a, 0x6a5a4a, 0.95),
  marienkaefer: () => beetle(0xe8302a, 0x2a2222, [[-0.08, 0.1], [0.08, -0.1], [-0.12, -0.08], [0.06, 0.1]]),
  hirschkaefer: () => beetle(0x6a3a22, 0x3a2418, [], 'stag'),
  gewitterkaefer: () => beetle(0x2a3a6a, 0x1a2244, [[0.04, 0.07], [-0.08, -0.07], [0.04, -0.07], [-0.08, 0.07]]),
  nebelfalter: () => butterfly(0xe6ecf2, 0xc8d2dc, 0x9aa8b8, 1.05),
  sternenfalter: () => butterfly(0x2a3470, 0x4a5aa8, 0xffe066, 1.1),
  tulpenfalter: () => butterfly(0xff5d7a, 0xffb0c0, 0xffffff, 0.95),
  lavendelfalter: () => butterfly(0xa98bff, 0xd2c0ff, 0x5a3aa8, 1.0),
  glockenfalter: () => butterfly(0x6f8cff, 0xb8c8ff, 0xffffff, 1.0),
  himmelsblaeuling: () => butterfly(0x8fd0ff, 0xd8f0ff, 0xffe066, 0.9),
  sonnenfalter: () => butterfly(0xffb020, 0xffd860, 0x6a3a1a, 1.1),
  rosenschwaermer: () => butterfly(0xd8283c, 0xff8fa0, 0x2a1a1a, 1.15),
  dahlienpfau: () => butterfly(0xc02a7a, 0xff9ad8, 0x2a6aff, 1.2),
  eisfalter: () => butterfly(0xeaf6ff, 0xbfe4ff, 0x8fc8ff, 1.15),
  goliathkaefer: () => [...beetle(0xf0ecdf, 0x2a2222, [[0.0, 0.08], [0.0, -0.08], [-0.12, 0.1], [-0.12, -0.1]])],
  biene: () => [ell(0.13, 0xffc83a, 0, 0.25, 0, 1.4, 1, 1), ...[-0.07, 0.03].map(x => cyl(0.125, 0.125, 0.04, 0x2a2222, x, 0.25, 0, 12, 0, 0, PI / 2)), ball(0.08, 0x2a2222, 0.18, 0.27, 0), cone(0.02, 0.06, 0x2a2222, -0.21, 0.25, 0, 5, 0, 0, PI / 2), ...[-1, 1].map(s => ell(0.1, 0xe8f4ff, -0.02, 0.4, s * 0.08, 0.7, 0.3, 1, s * 0.4)), ...eye(0.23, 0.3, 0.05, 0.022)],
  raupe: () => [...Array.from({ length: 6 }, (_, i) => ball(0.07, i % 2 ? 0x8ad45a : 0x6ab83a, -0.3 + i * 0.11, 0.08 + Math.sin(i * 1.1) * 0.03, 0)), ball(0.09, 0x8ad45a, 0.36, 0.12, 0), ...eye(0.42, 0.15, 0.05, 0.022), ...eye(0.42, 0.15, -0.05, 0.022), cyl(0.008, 0.008, 0.08, 0x3a2e2e, 0.38, 0.22, 0.03, 4)],
  grashuepfer: () => [ell(0.08, 0x7cc65a, 0, 0.16, 0, 3.2, 0.9, 0.9), ell(0.06, 0x6ab24a, 0.26, 0.18, 0, 1.2, 1.1, 1), ...[-1, 1].map(s => ell(0.04, 0x5aa03a, -0.08, 0.24, s * 0.07, 3.6, 0.7, 0.6, 0, 0, 0.6)), ...eye(0.3, 0.22, 0.05, 0.022), cyl(0.005, 0.005, 0.28, 0x4a8a2a, 0.36, 0.34, 0.02, 4, 0, 0, -0.8)],
  ameise: () => [ball(0.08, 0x3a2622, -0.18, 0.12, 0, 1.3, 1, 1), ball(0.05, 0x3a2622, 0, 0.12, 0), ball(0.07, 0x3a2622, 0.13, 0.15, 0), ...[-1, 1].flatMap(s => [0, 1, 2].map(i => cyl(0.008, 0.006, 0.16, 0x3a2622, -0.06 + i * 0.06, 0.07, s * 0.08, 4, s * 1.1, 0, 0))), ...eye(0.18, 0.17, 0.04, 0.018)],
  blattschneider: () => [ball(0.06, 0xa0502a, -0.14, 0.1, 0, 1.3, 1, 1), ball(0.04, 0xa0502a, 0, 0.1, 0), ball(0.055, 0xa0502a, 0.1, 0.12, 0), fin([[0.08, 0.16], [0.0, 0.5], [-0.2, 0.42], [-0.12, 0.2]], 0x6ab83a, 0, 0.015)],
  schnecke: () => [ell(0.08, 0xd8c09a, 0, 0.06, 0, 4, 0.7, 1), torus(0.11, 0.06, 0xc8843a, -0.04, 0.2, 0, 0, 0, 0), ball(0.06, 0xb8742a, -0.04, 0.2, 0, 1, 1, 0.9), cyl(0.01, 0.01, 0.12, 0xd8c09a, 0.26, 0.15, 0.03, 4, 0, 0, -0.3), ball(0.02, EYE, 0.28, 0.21, 0.03)],
  gluehwuermchen: () => [[ell(0.07, 0x3a3a2a, 0, 0.2, 0, 2, 0.9, 1), ball(0.05, 0xd8302a, 0.16, 0.21, 0), ...[-1, 1].map(s => ell(0.07, 0xe8f4ff, 0.02, 0.29, s * 0.06, 1.2, 0.25, 0.8, s * 0.3))], [ball(0.08, 0, -0.12, 0.19, 0, 1.3, 1, 1)]],
  spinne: () => [ball(0.13, 0x4a3a3a, -0.06, 0.16, 0), ball(0.08, 0x5a4a4a, 0.12, 0.15, 0), ...[-1, 1].flatMap(s => [0, 1, 2, 3].map(i => cyl(0.01, 0.006, 0.26, 0x4a3a3a, 0.04 - i * 0.06 + 0.06, 0.12, s * 0.15, 4, s * 0.9, -0.3 + i * 0.2, 0))), ...eye(0.18, 0.2, 0.04, 0.02), ...eye(0.18, 0.2, -0.04, 0.02)],
  wintermuecke: () => [ell(0.03, 0x6a6a7a, 0, 0.25, 0, 4, 1, 1), ball(0.03, 0x5a5a6a, 0.14, 0.26, 0), ...[-1, 1].map(s => ell(0.09, 0xe8f0ff, -0.02, 0.32, s * 0.06, 1.2, 0.2, 0.5, s * 0.5)), ...[-1, 1].flatMap(s => [0, 1, 2].map(i => cyl(0.004, 0.004, 0.26, 0x5a5a6a, -0.06 + i * 0.06, 0.14, s * 0.06, 3, s * 0.4, 0, 0)))],
  schneefloh: () => [ell(0.07, 0x8a8aa0, 0, 0.1, 0, 1.6, 1, 1), ball(0.05, 0x9a9ab0, 0.12, 0.11, 0), ...[-1, 1].map(s => ell(0.03, 0x7a7a90, -0.06, 0.07, s * 0.06, 2.6, 0.6, 0.6, 0, 0, 0.5)), ...eye(0.15, 0.13, 0.03, 0.015)],
  orchideenmantis: () => [ell(0.06, 0xffc8dc, 0, 0.2, 0, 3, 1, 1), ...[-1, 1].map(s => ell(0.08, 0xffb0cc, -0.06, 0.1, s * 0.1, 1.4, 0.4, 1, s * 0.4)), ell(0.05, 0xffd8e8, 0.18, 0.3, 0, 1, 1.2, 1), ...[-1, 1].map(s => ell(0.03, 0xffa8c4, 0.28, 0.28, s * 0.04, 2.2, 0.6, 0.6, 0, 0, -0.6)), ...eye(0.21, 0.34, 0.03, 0.018)],
  stabschrecke: () => [cyl(0.02, 0.016, 0.7, 0x8a7a4a, 0, 0.12, 0, 6, 0, 0, PI / 2), ...[-1, 1].flatMap(s => [0, 1, 2].map(i => cyl(0.006, 0.006, 0.2, 0x7a6a3a, -0.15 + i * 0.15, 0.06, s * 0.08, 4, s * 1.0, 0, 0))), ball(0.025, 0x8a7a4a, 0.36, 0.12, 0)],
};

// ---------- Fossilien, Fundstücke, Muscheln ----------
const STONE = 0xd8cbb4, STONED = 0xb4a68e;
const FOSSIL_MODELS = {
  ammonit: () => [cyl(0.24, 0.24, 0.12, STONE, 0, 0.24, 0, 20, PI / 2), ...Array.from({ length: 4 }, (_, i) => torus(0.2 - i * 0.05, 0.02, STONED, 0, 0.24, 0.06 + i * 0.002, 0, 0, i)), ...Array.from({ length: 10 }, (_, i) => { const a = i / 10 * PI * 2; return box(0.008, 0.06, 0.02, STONED, Math.cos(a) * 0.17, 0.24 + Math.sin(a) * 0.17, 0.065, 0, 0, a); })],
  knochen: () => [cyl(0.05, 0.05, 0.5, 0xf4eedc, 0, 0.1, 0, 10, 0, 0, PI / 2), ...[-1, 1].flatMap(s => [ball(0.07, 0xf4eedc, s * 0.26, 0.1, 0.05), ball(0.07, 0xf4eedc, s * 0.26, 0.1, -0.05)])],
  zahn: () => [cone(0.12, 0.42, 0xf4eedc, 0, 0.25, 0, 12, 0, 0, -0.25), ell(0.12, 0xe0d4b8, 0.04, 0.05, 0, 1, 0.35, 1)],
  abdruck: () => [ell(0.3, STONE, 0, 0.06, 0, 1, 0.22, 0.8), fin([[-0.18, 0.12], [0, 0.135], [0.18, 0.12], [0, 0.105]], STONED, 0, 0.02), ...Array.from({ length: 6 }, (_, i) => box(0.12, 0.012, 0.012, STONED, -0.12 + i * 0.05, 0.13, 0, 0, 0, (i % 2 ? 0.6 : -0.6)))].map((p, i) => i === 0 ? p : p),
  schaedel: () => [ell(0.24, 0xf2ead6, 0, 0.24, 0, 1.3, 0.9, 0.9), ell(0.14, 0xf2ead6, 0.28, 0.16, 0, 1.4, 0.7, 0.8), ball(0.06, 0x6a5a4a, 0.02, 0.28, 0.17, 1, 1, 0.5), ...Array.from({ length: 5 }, (_, i) => cone(0.018, 0.05, 0xffffff, 0.24 + i * 0.05, 0.1, 0.08, 5, PI))],
  bernstein: () => [[ell(0.2, 0xffa63a, 0, 0.2, 0, 1, 1.15, 0.8), ball(0.04, 0x5a3a1a, 0, 0.2, 0.05, 1.4, 0.7, 0.6)], []],
  amphore: () => [ell(0.2, 0xd8834a, 0, 0.3, 0, 1, 1.4, 1), cyl(0.06, 0.09, 0.18, 0xd8834a, 0, 0.6, 0, 12), torus(0.08, 0.02, 0xc0703a, 0, 0.7, 0, PI / 2), cone(0.1, 0.12, 0xd8834a, 0, 0.04, 0, 12, PI), ...[-1, 1].map(s => torus(0.08, 0.018, 0xc0703a, s * 0.12, 0.52, 0, 0, 0, s * 0.3, PI)), box(0.3, 0.03, 0.02, 0x2a2222, 0, 0.34, 0.2), box(0.3, 0.03, 0.02, 0x2a2222, 0, 0.24, 0.2)],
  kristall: () => [[...[[0, 0.34, 0, 0], [0.12, 0.22, 0.04, -0.4], [-0.12, 0.2, -0.02, 0.45], [0.04, 0.16, 0.12, -0.2]].map(([x, h, z, r]) => cyl(0.06, 0.06, h * 2, 0xbfa8ff, x, h, z, 6, 0, 0, r)), ...[[0, 0.72, 0, 0], [0.24, 0.44, 0.04, -0.4], [-0.22, 0.4, -0.02, 0.45]].map(([x, y, z, r]) => cone(0.06, 0.1, 0xd8c8ff, x, y, z, 6, 0, 0, r)), ell(0.2, STONED, 0, 0.03, 0, 1.2, 0.3, 1)], []],
};

// ---------- Essen, Zutaten, Kleinkram ----------
const PLATE = 0xfffaf2;
const bowl = (soup, extras = []) => [cyl(0.22, 0.14, 0.14, 0xf2e6d6, 0, 0.07, 0, 18), cyl(0.2, 0.2, 0.01, soup, 0, 0.13, 0, 18), torus(0.215, 0.02, 0xe8dccc, 0, 0.14, 0, PI / 2), ...extras];
const plate = extras => [cyl(0.3, 0.24, 0.04, PLATE, 0, 0.02, 0, 22), ...extras];
const DISH_MODELS = {
  grillfisch: () => [ell(0.24, 0xe8d8c8, 0, 0.03, 0, 1.3, 0.1, 0.9), ell(0.12, 0xc88a4a, 0, 0.1, 0, 2.2, 0.6, 0.8), cone(0.08, 0.14, 0xb8783a, -0.32, 0.1, 0, 4, 0, 0, PI / 2), ...[-0.12, 0, 0.12].map(x => box(0.02, 0.015, 0.16, 0x5a3a2a, x, 0.17, 0, 0, 0.3)), ball(0.025, 0xffd23f, 0.25, 0.1, 0.06)],
  grillmais: () => [ell(0.08, 0xffc830, 0, 0.12, 0, 3, 1, 1), ...Array.from({ length: 10 }, (_, i) => ball(0.02, 0x6a4a2a, -0.18 + i * 0.04, 0.2, (i % 2 - 0.5) * 0.06)), cyl(0.012, 0.012, 0.3, 0xd9a86c, 0.32, 0.12, 0, 6, 0, 0, PI / 2)],
  ofenkartoffel: () => [ell(0.16, 0xc8c8d0, 0, 0.1, 0, 1.4, 0.7, 1.1), ell(0.12, 0xd8a85a, 0, 0.15, 0, 1.2, 0.6, 1), ell(0.06, 0xfff8e8, 0, 0.21, 0, 1.3, 0.5, 1), ball(0.015, 0x6cc04a, 0.03, 0.24, 0.02)],
  grillgemuese: () => [cyl(0.008, 0.008, 0.6, 0xd9a86c, 0, 0.15, 0, 6, 0, 0, PI / 2), ...[[0xff8a2a, -0.2], [0x6cc04a, -0.08], [0xe8283c, 0.04], [0xffd23f, 0.16]].map(([c, x]) => box(0.09, 0.09, 0.09, c, x, 0.15, 0, 0, 0.3))],
  bratapfel: () => [ell(0.17, 0xc8402e, 0, 0.17, 0, 1, 0.9, 1), cyl(0.012, 0.015, 0.08, 0x6a4a2a, 0, 0.34, 0, 5), ell(0.06, 0xfff0d0, 0, 0.3, 0, 1, 0.4, 1), ell(0.22, 0xffffff, 0, 0.02, 0, 1.1, 0.12, 1.1)],
  stockbrot: () => [cyl(0.012, 0.012, 0.7, 0x8a5a36, 0, 0.12, 0, 6, 0, 0, PI / 2 - 0.2), ...Array.from({ length: 5 }, (_, i) => ell(0.06, i % 2 ? 0xe8b86a : 0xd8a050, 0.1 + i * 0.04, 0.16 + i * 0.008, 0, 1, 0.8, 0.8))],
  goldei: () => [[ell(0.13, 0xffd23f, 0, 0.17, 0, 1, 1.3, 1)], [ball(0.025, 0, 0.05, 0.24, 0.11), ball(0.018, 0, -0.06, 0.12, 0.11)]],
  kaese: () => [cyl(0.24, 0.24, 0.18, 0xffd85a, 0, 0.09, 0, 18, 0, 0, 0), box(0.2, 0.17, 0.2, 0xffe48a, 0.13, 0.09, 0.13, 0, PI / 4), ...[[0.08, 0.13, 0.2], [-0.12, 0.08, 0.18], [0.18, 0.06, -0.08]].map(([x, y, z]) => ball(0.035, 0xe8b830, x, y, z, 1, 1, 0.4))],
  brot: () => [ell(0.24, 0xd8944a, 0, 0.14, 0, 1.4, 0.65, 0.9), ...[-0.12, 0, 0.12].map(x => box(0.03, 0.02, 0.16, 0xf2c88a, x, 0.29, 0, 0, 0, 0.4))],
  pfannkuchen: () => plate([...[0, 1, 2].map(i => cyl(0.2, 0.2, 0.04, 0xf2c070, 0, 0.07 + i * 0.045, 0, 18)), cyl(0.2, 0.17, 0.02, 0xa8542a, 0, 0.2, 0, 18), box(0.08, 0.04, 0.06, 0xfff2b0, 0, 0.23, 0)]),
  apfelkuchen: () => plate([cyl(0.24, 0.22, 0.1, 0xe0a050, 0, 0.09, 0, 20), ...Array.from({ length: 5 }, (_, i) => box(0.46, 0.015, 0.03, 0xf4c47a, 0, 0.145, -0.16 + i * 0.08, i % 2 ? 0.8 : -0.8))]),
  kirschtorte: () => plate([cyl(0.22, 0.22, 0.2, 0xfff2f4, 0, 0.14, 0, 20), cyl(0.225, 0.225, 0.04, 0xff9ab0, 0, 0.1, 0, 20), ...Array.from({ length: 6 }, (_, i) => { const a = i / 6 * PI * 2; return ball(0.04, 0xd8102c, Math.cos(a) * 0.15, 0.28, Math.sin(a) * 0.15); })]),
  saft: () => [cyl(0.11, 0.09, 0.32, 0xeaf6ff, 0, 0.16, 0, 16), cyl(0.1, 0.085, 0.24, 0xffa630, 0, 0.13, 0, 16), cyl(0.012, 0.012, 0.3, 0xff6b8a, 0.04, 0.3, 0, 6, 0, 0, -0.25), ell(0.05, 0x8ad45a, -0.08, 0.33, 0, 1, 0.4, 1)],
  sorbet: () => [cyl(0.16, 0.06, 0.12, 0xfff2f4, 0, 0.12, 0, 16), cyl(0.04, 0.06, 0.06, 0xfff2f4, 0, 0.03, 0, 12), ball(0.09, 0xffb0c8, -0.05, 0.22, 0), ball(0.09, 0xfff0a0, 0.06, 0.22, 0.03), ball(0.08, 0xb0f0c8, 0, 0.3, -0.02), ell(0.04, 0x6ab83a, 0.02, 0.38, 0, 1, 0.4, 1)],
  kokosmilch: () => [ball(0.2, 0x7a4e2e, 0, 0.2, 0, 1, 0.95, 1), cyl(0.15, 0.15, 0.01, 0xfffaf0, 0, 0.36, 0, 16), cyl(0.012, 0.012, 0.3, 0x6cc4ff, 0.04, 0.45, 0, 6, 0, 0, -0.3), ell(0.06, 0xff8ab0, -0.12, 0.38, 0.05, 1, 0.4, 1)],
  fischsuppe: () => bowl(0xf0d8a8, [ell(0.06, 0x8ab0d0, 0, 0.15, 0, 2, 0.5, 0.8), ball(0.02, 0xff7a4a, 0.08, 0.145, 0.06), ball(0.02, 0x6ab83a, -0.06, 0.145, -0.05)]),
  suppe: () => bowl(0xe8603a, [ball(0.02, 0xfff2e0, 0.05, 0.145, 0.03), ball(0.02, 0x6ab83a, -0.04, 0.145, -0.04)]),
  eintopf: () => [cyl(0.24, 0.22, 0.22, 0x8a8e98, 0, 0.11, 0, 18), cyl(0.22, 0.22, 0.01, 0xa8643a, 0, 0.215, 0, 18), ...[[0.06, 0.04, 0xff9a3a], [-0.07, 0.02, 0xf2d070], [0, -0.08, 0x6ab83a]].map(([x, z, c]) => ball(0.04, c, x, 0.225, z)), ...[-1, 1].map(s => torus(0.05, 0.015, 0x6a6e78, s * 0.25, 0.18, 0, 0, PI / 2, 0))],
  salat: () => bowl(0x8ad45a, [...Array.from({ length: 6 }, (_, i) => ell(0.07, i % 2 ? 0x6ab83a : 0x9ae06a, Math.cos(i) * 0.08, 0.17, Math.sin(i) * 0.08, 1, 0.4, 1)), ball(0.035, 0xff3b3b, 0.05, 0.2, 0.04), ball(0.03, 0xffa630, -0.06, 0.2, 0.0)]),
  mehl: () => [ell(0.2, 0xf6eedf, 0, 0.22, 0, 1, 1.2, 0.8), cyl(0.07, 0.1, 0.1, 0xf6eedf, 0, 0.46, 0, 10), torus(0.07, 0.015, 0xd8a86a, 0, 0.44, 0, PI / 2), ...[0, 1, 2].map(i => ell(0.03, 0xe8c070, -0.04 + i * 0.04, 0.24, 0.16, 0.6, 1.4, 0.3, 0, 0, (i - 1) * 0.4))],
  zucker: () => [cyl(0.15, 0.15, 0.3, 0xeaf6ff, 0, 0.15, 0, 16), cyl(0.155, 0.155, 0.04, 0xff9ab0, 0, 0.32, 0, 16), ...[[0, 0.06], [0.06, -0.04], [-0.06, -0.02], [0, 0.0]].map(([x, z], i) => box(0.07, 0.07, 0.07, 0xffffff, x, 0.06 + (i === 3 ? 0.07 : 0), z, i))],
  milch: () => [cyl(0.1, 0.12, 0.34, 0xffffff, 0, 0.17, 0, 16), cyl(0.06, 0.1, 0.1, 0xffffff, 0, 0.39, 0, 16), cyl(0.065, 0.065, 0.04, 0x6cb4ff, 0, 0.46, 0, 12), cyl(0.121, 0.121, 0.1, 0x6cb4ff, 0, 0.14, 0, 16)],
  neopren: () => [box(0.36, 0.14, 0.3, 0x2f4a6a, 0, 0.07, 0), box(0.37, 0.03, 0.31, 0x6cc4ff, 0, 0.12, 0), cyl(0.04, 0.04, 0.16, 0xffd23f, 0.1, 0.16, 0, 8, PI / 2), box(0.2, 0.04, 0.15, 0x2f4a6a, -0.04, 0.17, 0.04)],
  bonbon: () => [ell(0.13, 0xff6b8a, 0, 0.13, 0, 1.3, 1, 1), ...[-1, 1].map(s => cone(0.09, 0.14, 0xffb0c8, s * 0.22, 0.13, 0, 8, 0, 0, s * PI / 2)), ...[-0.06, 0.06].map(x => box(0.025, 0.24, 0.2, 0xffffff, x, 0.13, 0))],
  goldnugget: () => [ell(0.16, 0xffc83a, 0, 0.12, 0, 1.2, 0.75, 1, 0, 0.4, 0.2, 7), ell(0.1, 0xffe080, 0.08, 0.17, 0.05, 1, 0.8, 1, 0.3, 0, 0, 6), ball(0.03, 0xffffff, -0.04, 0.22, 0.08)],
  perle: () => [ell(0.24, 0xc8d4e0, 0, 0.05, 0, 1.15, 0.25, 1), ell(0.22, 0xdce6f0, 0, 0.18, -0.12, 1.1, 0.22, 0.9, -1.0), ball(0.08, 0xfff8fb, 0, 0.12, 0.04), ball(0.025, 0xffffff, 0.025, 0.16, 0.08)],
  ruebe: () => [ell(0.16, 0xf6f0ff, 0, 0.18, 0, 1, 1, 1), ell(0.15, 0xb06ad8, 0, 0.22, 0, 1.02, 0.6, 1.02), cone(0.05, 0.12, 0xf6f0ff, 0, 0.03, 0, 8, PI), ...[-1, 0, 1].map(i => ell(0.05, 0x6ab83a, i * 0.05, 0.42, 0, 0.5, 1.5, 0.3, 0, 0, i * 0.4))],
  faule_ruebe: () => [ell(0.16, 0xa8a070, 0, 0.16, 0, 1.1, 0.85, 1), ell(0.15, 0x6a5a7a, 0, 0.2, 0, 1.08, 0.5, 1.05), cone(0.05, 0.1, 0xa8a070, 0, 0.03, 0, 8, PI), ...[-1, 1].map(i => ell(0.05, 0x8a7a4a, i * 0.06, 0.36, 0, 0.5, 1.2, 0.3, 0, 0, i * 0.9)), ball(0.025, 0x4a4a4a, 0.12, 0.42, 0.05)],
  schatz: () => [[box(0.42, 0.22, 0.28, 0xa8643a, 0, 0.11, 0), cyl(0.14, 0.14, 0.42, 0xb8743a, 0, 0.22, -0.0, 14, 0, 0, PI / 2), ...[-0.15, 0.15].map(x => box(0.04, 0.24, 0.3, 0xffc83a, x, 0.12, 0)), box(0.08, 0.08, 0.04, 0xffc83a, 0, 0.18, 0.15)], [ball(0.1, 0, 0, 0.32, 0.08, 1.6, 0.5, 0.6)]],
  sternfrucht: () => Array.from({ length: 5 }, (_, i) => { const a = i / 5 * PI * 2; return ell(0.15, 0xf6d23a, Math.cos(a) * 0.08, 0.2 + Math.sin(a) * 0.08, 0, 1.1, 0.55, 1.8, 0, 0, a); }).concat([cyl(0.015, 0.015, 0.08, 0x6a8a3a, 0, 0.2, -0.3, 5, PI / 2)]),
  ei: () => [ell(0.13, 0xfff4e6, 0, 0.17, 0, 1, 1.3, 1), ball(0.02, 0xf4e4cc, 0.05, 0.2, 0.12)],
  // Aus den Insel-Erweiterungen
  harz: () => [[ell(0.14, 0xffb02a, 0, 0.14, 0, 1, 1.15, 0.9), ell(0.08, 0xffc85a, 0.1, 0.08, 0.04, 1, 0.8, 1)], []],
  kiefernzapfen: () => [ell(0.13, 0x8a5a36, 0, 0.2, 0, 1, 1.5, 1), ...Array.from({ length: 14 }, (_, i) => { const a = i * 2.4, y = 0.06 + (i / 14) * 0.3; return ell(0.05, i % 2 ? 0xa86a3a : 0x7a4a2a, Math.cos(a) * 0.1, y, Math.sin(a) * 0.1, 1, 0.5, 1, 0, -a, 0.6); }), cyl(0.015, 0.015, 0.06, 0x5a3a1a, 0, 0.42, 0, 5)],
  steinpilz: () => [cyl(0.09, 0.12, 0.24, 0xfff2dc, 0, 0.12, 0, 12), ell(0.2, 0x9a5a2a, 0, 0.27, 0, 1, 0.6, 1)],
  pfifferling: () => [cone(0.16, 0.24, 0xffb02a, 0, 0.18, 0, 12, PI), cyl(0.05, 0.06, 0.12, 0xffc85a, 0, 0.06, 0, 8), cyl(0.16, 0.16, 0.03, 0xffa21f, 0, 0.3, 0, 12)],
  morchel: () => [cyl(0.06, 0.08, 0.14, 0xf2e6cc, 0, 0.07, 0, 10), ell(0.12, 0x8a6a4a, 0, 0.28, 0, 1, 1.5, 1), ...Array.from({ length: 10 }, (_, i) => ball(0.035, 0x6a4a30, Math.cos(i * 2.1) * 0.1, 0.2 + (i % 4) * 0.05, Math.sin(i * 2.1) * 0.1))],
  fliegenpilz: () => [cyl(0.07, 0.09, 0.22, 0xfff6ee, 0, 0.11, 0, 12), ell(0.21, 0xe8302a, 0, 0.27, 0, 1, 0.6, 1), ...Array.from({ length: 7 }, (_, i) => ball(0.03, 0xffffff, Math.cos(i * 0.9) * 0.13, 0.36 - (i % 3) * 0.02, Math.sin(i * 0.9) * 0.13 + 0.02))],
  blaubeere: () => Array.from({ length: 7 }, (_, i) => ball(0.08, 0x4a5aff, Math.cos(i * 1.1) * 0.12 * (i ? 1 : 0), 0.08 + (i > 4 ? 0.12 : 0), Math.sin(i * 1.1) * 0.12 * (i ? 1 : 0), 1, 1, 1, 10)).concat([ell(0.08, 0x5fb84a, 0.06, 0.28, 0, 1.5, 0.3, 0.8)]),
  himbeere: () => [...Array.from({ length: 16 }, (_, i) => { const a = i * 2.4, y = 0.08 + (i % 5) * 0.05; return ball(0.045, 0xe8304a, Math.cos(a) * 0.08, y, Math.sin(a) * 0.08); }), cone(0.08, 0.06, 0x5fb84a, 0, 0.33, 0, 6)],
  honig: () => [cyl(0.14, 0.15, 0.26, 0xffb02a, 0, 0.13, 0, 16), cyl(0.155, 0.155, 0.06, 0xfff2dc, 0, 0.29, 0, 16), torus(0.12, 0.015, 0xd86a3a, 0, 0.27, 0, PI / 2), box(0.16, 0.1, 0.01, 0xfff6e6, 0, 0.14, 0.15)],
  amethyst: () => [[...[[0, 0.3, 0, 0], [0.1, 0.2, 0.04, -0.4], [-0.1, 0.18, -0.02, 0.45]].map(([x, h, z, r]) => cyl(0.07, 0.07, h * 2, 0xa87af0, x, h, z, 6, 0, 0, r)), ...[[0, 0.64, 0, 0], [0.2, 0.4, 0.04, -0.4], [-0.18, 0.37, -0.02, 0.45]].map(([x, y, z, r]) => cone(0.07, 0.1, 0xc9a8ff, x, y, z, 6, 0, 0, r))], []],
  rubin: () => [[cyl(0.18, 0.1, 0.12, 0xe8203a, 0, 0.2, 0, 8), cone(0.1, 0.16, 0xd8102c, 0, 0.06, 0, 8, PI), cyl(0.12, 0.18, 0.05, 0xff5a6a, 0, 0.28, 0, 8)], []],
  saphir: () => [[cyl(0.16, 0.1, 0.12, 0x2a6aff, 0, 0.2, 0, 6), cone(0.1, 0.16, 0x1a4ad8, 0, 0.06, 0, 6, PI), cyl(0.1, 0.16, 0.05, 0x6aa8ff, 0, 0.28, 0, 6)], []],
  mondstein: () => [[ell(0.17, 0xdfe8ff, 0, 0.15, 0, 1.15, 0.85, 1), ell(0.1, 0xbfd0ff, 0.05, 0.22, 0.08, 1, 0.5, 1)], [ell(0.05, 0xf4f8ff, -0.06, 0.24, 0.11, 1, 0.5, 1)]],
  topas: () => [[cyl(0.15, 0.1, 0.14, 0xffa02a, 0, 0.21, 0, 8), cone(0.1, 0.16, 0xe8801a, 0, 0.06, 0, 8, PI), cyl(0.09, 0.15, 0.05, 0xffc86a, 0, 0.3, 0, 8)], []],
  smaragd: () => [[cyl(0.13, 0.13, 0.26, 0x1ab86a, 0, 0.17, 0, 4, 0, PI / 4), cyl(0.09, 0.13, 0.05, 0x5ae89a, 0, 0.32, 0, 4, 0, PI / 4), cyl(0.13, 0.09, 0.05, 0x0a8a4a, 0, 0.02, 0, 4, 0, PI / 4)], []],
  regenbogenkristall: () => [[cyl(0.14, 0.16, 0.06, 0x6a6080, 0, 0.03, 0, 8)], [cone(0.07, 0.42, 0xff7a9a, 0, 0.27, 0, 6), cone(0.05, 0.3, 0xffd96a, 0.1, 0.18, 0.03, 6, 0, 0, -0.4), cone(0.05, 0.3, 0x7affc8, -0.1, 0.18, -0.02, 6, 0, 0, 0.4), cone(0.045, 0.26, 0x7ac4ff, 0.02, 0.16, 0.1, 6, 0.4, 0, 0), cone(0.045, 0.24, 0xc9a8ff, -0.02, 0.15, -0.1, 6, -0.4, 0, 0)]],
  opal: () => [[ell(0.18, 0xf2f6ff, 0, 0.16, 0, 1.2, 0.8, 1), ball(0.05, 0xff9ad8, 0.06, 0.24, 0.12, 1, 0.4, 1), ball(0.05, 0x8fd4ff, -0.07, 0.22, 0.13, 1, 0.4, 1), ball(0.04, 0xb8ff9a, 0, 0.28, 0.08, 1, 0.4, 1)], []],
  pilzpfanne: () => [cyl(0.26, 0.22, 0.08, 0x4a4a52, 0, 0.06, 0, 18), cyl(0.03, 0.03, 0.3, 0x8a5a36, 0.4, 0.08, 0, 6, 0, 0, PI / 2), cyl(0.23, 0.23, 0.01, 0xf2d070, 0, 0.1, 0, 18), ...[[0.08, 0.05, 0x9a5a2a], [-0.08, 0.06, 0xffb02a], [0, -0.09, 0x9a5a2a], [-0.1, -0.06, 0xffb02a]].map(([x, z, c]) => ell(0.06, c, x, 0.12, z, 1, 0.5, 1)), ball(0.02, 0x6ab83a, 0.03, 0.13, 0.12)],
  beerenkuchen: () => plate([cyl(0.24, 0.22, 0.1, 0xe0a050, 0, 0.09, 0, 20), ...Array.from({ length: 14 }, (_, i) => ball(0.035, i % 2 ? 0x4a5aff : 0xe8304a, Math.cos(i * 2.4) * (0.06 + (i % 4) * 0.04), 0.15, Math.sin(i * 2.4) * (0.06 + (i % 4) * 0.04)))]),
  honigbrot: () => [ell(0.24, 0xd8944a, 0, 0.12, 0, 1.3, 0.55, 0.9), ell(0.18, 0xffb02a, 0, 0.21, 0, 1.2, 0.15, 0.8), ball(0.04, 0xffc85a, 0.12, 0.2, 0.08)],
  waldtee: () => [cyl(0.12, 0.1, 0.2, 0xffffff, 0, 0.1, 0, 16), cyl(0.11, 0.11, 0.01, 0x9a6a3a, 0, 0.19, 0, 16), torus(0.06, 0.018, 0xffffff, 0.14, 0.11, 0, 0, 0, 0), cyl(0.18, 0.16, 0.02, 0xfff2dc, 0, 0.01, 0, 18), ell(0.04, 0x8a5a36, -0.08, 0.2, 0.05, 1, 1.4, 1)],
};

// ---------- Werkzeuge & Ballen ----------
const FRUIT_COL = { apfel: 0xe8302a, kirsche: 0xc8102c, orange: 0xff9a1a, pfirsich: 0xffa880, birne: 0xc8d83a, kokosnuss: 0x7a4e2e };
const sapling = (fruit, palm) => {
  const p = [ell(0.2, 0xc8a06a, 0, 0.12, 0, 1, 0.65, 1), torus(0.17, 0.025, 0x9a7040, 0, 0.17, 0, PI / 2), ...[0, 1, 2].map(i => box(0.02, 0.14, 0.02, 0xa8804a, Math.cos(i * 2.1) * 0.18, 0.12, Math.sin(i * 2.1) * 0.18, i))];
  if (palm) {
    p.push(cyl(0.035, 0.05, 0.42, 0xa8784a, 0.02, 0.38, 0, 7, 0, 0, -0.12));
    for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; p.push(ell(0.16, 0x4aa84a, Math.cos(a) * 0.14 + 0.04, 0.6, Math.sin(a) * 0.14, 1.6, 0.18, 0.5, 0, -a, -0.35)); }
    p.push(ball(0.045, FRUIT_COL.kokosnuss, 0.06, 0.55, 0.04), ball(0.045, FRUIT_COL.kokosnuss, 0.0, 0.54, -0.05));
  } else {
    p.push(cyl(0.03, 0.045, 0.26, 0x8a5a36, 0, 0.3, 0, 7));
    p.push(ball(0.2, 0x5fb84a, 0, 0.52, 0), ball(0.14, 0x6ec85a, 0.12, 0.6, 0.06), ball(0.13, 0x4aa040, -0.12, 0.58, -0.04));
    for (let i = 0; i < 4; i++) { const a = i / 4 * PI * 2 + 0.4; p.push(ball(0.04, FRUIT_COL[fruit] || 0xe8302a, Math.cos(a) * 0.17, 0.48 + (i % 2) * 0.1, Math.sin(a) * 0.17)); }
  }
  return p;
};
const GEAR_MODELS = {
  grubenlaterne: () => [[cyl(0.12, 0.13, 0.04, 0x4a3a3a, 0, 0.02, 0, 10), cyl(0.1, 0.12, 0.05, 0x4a3a3a, 0, 0.42, 0, 10), cone(0.1, 0.08, 0x4a3a3a, 0, 0.48, 0, 10), torus(0.07, 0.012, 0x8a8e98, 0, 0.56, 0),
    ...[0, 1, 2, 3].map(i => cyl(0.012, 0.012, 0.36, 0x4a3a3a, Math.cos(i * PI / 2 + PI / 4) * 0.1, 0.22, Math.sin(i * PI / 2 + PI / 4) * 0.1, 5))], [cyl(0.08, 0.08, 0.34, 0xffd27a, 0, 0.22, 0, 10)]],
  drache: () => [cone(0.3, 0.38, 0xff6b8a, 0, 0.58, 0, 4, 0, 0, 0), cone(0.3, 0.2, 0x6cb4ff, 0, 0.29, 0, 4, PI, 0, 0), cyl(0.008, 0.008, 0.58, 0xffffff, 0, 0.47, 0.03, 4), ...[0, 1, 2].map(i => box(0.08, 0.05, 0.02, [0xffd23f, 0x8ad45a, 0xff8a3a][i], Math.sin(i * 1.5) * 0.04, 0.12 - i * 0.09, 0))],
  fahrrad: () => [...[-0.3, 0.3].flatMap(x => [torus(0.18, 0.025, 0x3a3a44, x, 0.2, 0), cyl(0.03, 0.03, 0.04, 0x8a8e98, x, 0.2, 0, 8, PI / 2)]), cyl(0.02, 0.02, 0.55, 0xff6b8a, 0, 0.32, 0, 6, 0, 0, 1.25), cyl(0.02, 0.02, 0.32, 0xff6b8a, -0.14, 0.3, 0, 6, 0, 0, -0.4), cyl(0.02, 0.02, 0.3, 0xff6b8a, 0.22, 0.32, 0, 6, 0, 0, 0.35),
    box(0.16, 0.04, 0.1, 0x4a3a3a, -0.17, 0.46, 0), cyl(0.015, 0.015, 0.26, 0x8a8e98, 0.27, 0.48, 0, 6, PI / 2), box(0.08, 0.06, 0.12, 0xf2d27a, 0.33, 0.4, 0)],
  baumschaufel: () => [cyl(0.025, 0.025, 0.56, 0xb8864a, -0.06, 0.38, 0, 8, 0, 0, 0.5), box(0.14, 0.03, 0.04, 0x8a5a36, -0.2, 0.64, 0, 0, 0, 0.5), cyl(0.03, 0.03, 0.12, 0x5fb84a, -0.2, 0.64, 0, 8, PI / 2),
    ell(0.15, 0x9aa8b8, 0.1, 0.12, 0, 0.85, 1.3, 0.25, 0, 0, 0.5), ell(0.1, 0xc8d4e0, 0.09, 0.15, 0.03, 0.7, 1, 0.15, 0, 0, 0.5), ell(0.05, 0x5fb84a, 0.08, 0.14, 0.05, 1, 1.4, 0.2, 0, 0, 0.9)],
  baum_apfel: () => sapling('apfel'), baum_kirsche: () => sapling('kirsche'), baum_orange: () => sapling('orange'),
  baum_pfirsich: () => sapling('pfirsich'), baum_birne: () => sapling('birne'), baum_palme: () => sapling('kokosnuss', true),
  // Edelstein-Werkzeuge
  goldangel: () => [cyl(0.02, 0.025, 0.8, 0xffc83a, -0.05, 0.38, 0, 8, 0, 0, 0.45), cyl(0.05, 0.05, 0.06, 0xd8a020, -0.2, 0.12, 0.04, 12, PI / 2), cyl(0.004, 0.004, 0.5, 0xffffff, 0.18, 0.5, 0, 4), ball(0.04, 0xff6b6b, 0.18, 0.25, 0), ball(0.03, 0xffffff, 0.18, 0.29, 0)],
  kristallaxt: () => [[cyl(0.025, 0.03, 0.66, 0xb8864a, 0, 0.33, 0, 8), box(0.06, 0.08, 0.06, 0x8a5a36, 0, 0.6, 0)], [cone(0.13, 0.26, 0xc9a8ff, 0.12, 0.62, 0, 6, 0, 0, -PI / 2), cone(0.06, 0.14, 0xb08cff, -0.08, 0.64, 0, 6, 0, 0, PI / 2)]],
  rubinschaufel: () => [cyl(0.025, 0.025, 0.56, 0xb8864a, -0.06, 0.38, 0, 8, 0, 0, 0.5), ell(0.15, 0xc0c8d4, 0.1, 0.12, 0, 0.85, 1.3, 0.25, 0, 0, 0.5), ...[[0.06, 0.16], [0.13, 0.08]].map(([x, y]) => ell(0.035, 0xe8203a, x, y, 0.04, 1, 1, 0.5))],
  saphirkescher: () => [cyl(0.02, 0.02, 0.6, 0xb8864a, 0, 0.3, 0, 8), torus(0.16, 0.015, 0x2a6aff, 0, 0.72, 0, 0, 0, 0), ell(0.15, 0xeaf2ff, 0, 0.62, 0, 1, 0.9, 0.3), ell(0.035, 0x6aa8ff, 0, 0.88, 0, 1, 1, 0.6)],
  opalkanne: () => [[cyl(0.16, 0.18, 0.26, 0xf2f6ff, 0, 0.13, 0, 16), cyl(0.03, 0.04, 0.3, 0xf2f6ff, 0.22, 0.24, 0, 8, 0, 0, -0.9), torus(0.08, 0.02, 0xd8e0f0, -0.17, 0.18, 0, 0, 0, 0)], [ell(0.05, 0, 0.0, 0.18, 0.15, 1, 1, 0.4), ell(0.035, 0, -0.07, 0.1, 0.15, 1, 1, 0.4)]],
  faelschung: () => [ell(0.22, 0xf2e6d6, 0, 0.2, 0, 1, 1.1, 0.4), ball(0.04, 0x2a2222, -0.07, 0.25, 0.08), ball(0.04, 0x2a2222, 0.07, 0.25, 0.08), torus(0.06, 0.012, 0x2a2222, 0, 0.13, 0.08, 0, 0, PI, PI)],
  sternentorte: () => plate([cyl(0.22, 0.22, 0.24, 0x2f3f78, 0, 0.14, 0, 20), cyl(0.225, 0.225, 0.04, 0xffe066, 0, 0.27, 0, 20), ...Array.from({ length: 5 }, (_, i) => { const a = i / 5 * PI * 2; return ball(0.035, 0xffe066, Math.cos(a) * 0.14, 0.31, Math.sin(a) * 0.14); }), cone(0.06, 0.1, 0xffd23f, 0, 0.35, 0, 5)]),
  inselcurry: () => bowl(0xf0a030, [ell(0.07, 0xfff2e0, 0.04, 0.15, 0.02, 1, 0.4, 1), ball(0.025, 0x6ab83a, -0.05, 0.15, -0.04), ball(0.025, 0xff5a3a, 0.08, 0.15, -0.06)]),
  mondpudding: () => plate([cyl(0.15, 0.19, 0.2, 0xfff0b0, 0, 0.13, 0, 18), cyl(0.15, 0.15, 0.03, 0xa8642a, 0, 0.24, 0, 18), torus(0.06, 0.02, 0xffffff, 0.05, 0.3, 0, 0, 0, 0.4, PI * 1.3)]),
  regenbogeneis: () => [cyl(0.05, 0.1, 0.12, 0xfff2f4, 0, 0.06, 0, 12), ...[0xff7b7b, 0xffe066, 0x8ad45a, 0x6cb4ff].map((c, i) => ball(0.085, c, Math.cos(i * 1.6) * 0.06, 0.18 + (i > 1 ? 0.1 : 0), Math.sin(i * 1.6) * 0.06)), ball(0.03, 0xff3b5a, 0, 0.38, 0)],
};

// ---------- Samentüten ----------
const SEED_COL = { gaensebluemchen: 0xffffff, ringelblume: 0xff9a2a, vergissmeinnicht: 0x6fa8ff, narzisse: 0xffe14a, nelke: 0xff7fa8, margerite: 0xfffbea, krokus: 0xb07bff, dahlie: 0xe0408a, schneegloeckchen: 0xf0f4ff, christrose: 0xf8e2ec, salatkopf: 0x8fd06a, erdbeere: 0xe8283c, mais: 0xffc830, brokkoli: 0x4a9e3c, traube: 0x8a4ab0, melone: 0x5aa84a, lavendel: 0xa98bff, pfingstrose: 0xff9ac4, glockenblume: 0x6f8cff, orchidee: 0xf2a0ff, tulpe: 0xff6b8a, kosmee: 0xff9ad8, stiefmuetterchen: 0x9b7be0, rose: 0xe8304a, hyazinthe: 0x7a8aff, sonnenblume: 0xffd23f, lilie: 0xfff0f6, mohn: 0xff4a2a, kornblume: 0x4a7aff, weizen: 0xf0c860, karotte: 0xff8a2a, kartoffel: 0xc8965a, tomate: 0xf0402a, kuerbis: 0xff9a2a };
function seedBag(k) {
  const c = SEED_COL[k] || (CROPS[k]?.peony ? CROPS[k].flower : 0) || 0x8ad45a, p = [box(0.34, 0.44, 0.06, 0xf6ecd8, 0, 0.24, 0), box(0.36, 0.06, 0.07, 0xe8d8b8, 0, 0.47, 0), box(0.3, 0.26, 0.02, 0xffffff, 0, 0.22, 0.035)];
  // kleines Bild der Pflanze vorne drauf
  p.push(cyl(0.008, 0.008, 0.12, 0x6ab83a, 0, 0.16, 0.05, 4), ell(0.03, 0x6ab83a, 0.04, 0.16, 0.05, 1.3, 0.6, 0.3, 0, 0, -0.5));
  for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; p.push(ball(0.035, c, Math.cos(a) * 0.04, 0.26 + Math.sin(a) * 0.04, 0.055, 1, 1, 0.35)); }
  p.push(ball(0.025, 0xffe08a, 0, 0.26, 0.065, 1, 1, 0.4));
  for (let i = 0; i < 3; i++) p.push(ell(0.02, 0x8a5a36, -0.1 + i * 0.1, 0.02, 0.12, 1, 0.5, 1.4));
  return p;
}

// Liefert eine Gruppe (oder null, wenn es kein eigenes Modell gibt)
export function itemModel(id) {
  const own = asset('item_' + id); // schöneres Modell aus Blender (assets/models/*.glb, Name item_<id>) hat Vorrang
  if (own) return own;
  let r = null;
  if (id.startsWith('s_')) r = seedBag(id.slice(2));
  else if (FISH_LOOK[id]) r = fish(id);
  else r = (SEA_MODELS[id] || BUG_MODELS[id] || FOSSIL_MODELS[id] || DISH_MODELS[id] || GEAR_MODELS[id])?.() || null;
  if (!r) return null;
  const [parts, glow] = Array.isArray(r[0]) ? r : [r, []];
  return model(parts.filter(Boolean), glow, false);
}
export const ITEM_MODEL_IDS = [...Object.keys(FISH_LOOK), ...Object.keys(SEA_MODELS), ...Object.keys(BUG_MODELS), ...Object.keys(FOSSIL_MODELS), ...Object.keys(DISH_MODELS), ...Object.keys(GEAR_MODELS)];
