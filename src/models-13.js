// Modelle für Inselleben 13 „Gartenzeit“: Zäune, die sich von selbst verbinden, Gartentore, Trittsteine, Pergola
// und die Feengarten-Sachen aus dem Sternchen-Laden. Format wie in models-12.js. Ursprung = Kachelmitte am Boden.
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
  LILA = 0xcdb8f5, BUTTER = 0xffe39a, LEAF = 0x6cc06a, DLEAF = 0x4fa156, DARK = 0x4a3a3a, METAL = 0xb8c4d0, GLASS = 0xd8f0ff, TERRA = 0xd98a5c, RATTAN = 0xd9b07a, RATTAND = 0xb88a54,
  JUTE = 0xe2cfa4, WATER = 0x8fd0f0, STONE = 0xc8c0b8, RED = 0xe8445e;
const BLOOMS = [ROSE, BUTTER, LILA, WHITE, 0xff9a5c, 0xff6b8a], ROPE = 0xd9c49a, IRON = 0x3d3f4a, BAMBOO = 0x8fcf5a, BAMBOOD = 0x6fae42, HEDGE = 0x5fae58, HEDGED = 0x4c9a4e, STONED = 0xa9a199;
const fl = (c, x, y, z, r = 0.05) => [B(r, c, x, y, z, 1, 0.6, 1, 8, 5), B(r * 0.38, 0xffd23f, x, y + r * 0.4, z, 1, 0.7, 1, 6, 4)];
const ring = (n, r, fn, off = 0) => Array.from({ length: n }, (_, i) => { const a = i / n * TAU + off; return fn(Math.cos(a) * r, Math.sin(a) * r, i, a); }).flat();
const turn = (parts, a) => parts.map(p => (p.g.rotateY(a), p)); // Teile um die Kachelmitte drehen

// ---------- Zäune ----------
// Jeder Zaun besteht aus einem Pfosten in der Kachelmitte und „Armen“ bis zum Kachelrand (hier nach +x gebaut, 0 … 0,5).
// Welche Arme es gibt, bestimmt die Nachbarschaft: Bit 1 = Norden (−z), 2 = Osten (+x), 4 = Süden (+z), 8 = Westen (−x).
const picket = (x, c, h = 0.56) => [X(0.075, h, 0.03, c, x, h / 2 + 0.04, 0), K(0.053, 0.08, c, x, h + 0.08, 0, 4, 0, PI / 4)];
export const FENCES = {
  holz: { post: () => [C(0.055, 0.062, 0.66, WOODD, 0, 0.33, 0, 8), B(0.062, WOOD, 0, 0.67, 0, 1, 0.55, 1, 8, 5)],
    arm: () => [X(0.5, 0.07, 0.045, WOOD, 0.25, 0.46, 0), X(0.5, 0.07, 0.045, WOODL, 0.25, 0.24, 0), X(0.05, 0.42, 0.035, WOOD, 0.26, 0.33, 0.03)] },
  latten: { post: () => [X(0.09, 0.72, 0.09, WHITE, 0, 0.36, 0), K(0.075, 0.1, WHITE, 0, 0.77, 0, 4, 0, PI / 4)],
    arm: () => [X(0.5, 0.05, 0.03, CREAM, 0.25, 0.44, -0.03), X(0.5, 0.05, 0.03, CREAM, 0.25, 0.2, -0.03), ...[0.125, 0.25, 0.375].flatMap(x => picket(x, WHITE))] },
  rosen: { post: () => [X(0.09, 0.72, 0.09, WHITE, 0, 0.36, 0), K(0.075, 0.1, WHITE, 0, 0.77, 0, 4, 0, PI / 4), B(0.07, DLEAF, 0.02, 0.55, 0.06, 1.2, 1, 0.8, 7, 5), ...fl(RED, 0, 0.6, 0.11, 0.045)],
    arm: () => [X(0.5, 0.05, 0.03, CREAM, 0.25, 0.44, -0.03), X(0.5, 0.05, 0.03, CREAM, 0.25, 0.2, -0.03), ...[0.125, 0.25, 0.375].flatMap(x => picket(x, WHITE)),
      B(0.1, LEAF, 0.14, 0.4, 0.05, 1.3, 0.8, 0.6, 7, 5), B(0.09, DLEAF, 0.36, 0.3, 0.05, 1.3, 0.8, 0.6, 7, 5), B(0.07, LEAF, 0.26, 0.52, 0.04, 1.4, 0.7, 0.6, 7, 5),
      ...fl(ROSE, 0.12, 0.47, 0.1, 0.045), ...fl(RED, 0.3, 0.38, 0.1, 0.04), ...fl(0xffc4d2, 0.4, 0.5, 0.09, 0.038), ...fl(ROSE, 0.22, 0.25, 0.09, 0.035)] },
  stein: { post: () => [soft(0.36, 0.56, 0.36, STONE, 0, 0.28, 0, 0.45), soft(0.42, 0.08, 0.42, STONED, 0, 0.58, 0, 0.4)],
    arm: () => [soft(0.56, 0.44, 0.27, STONE, 0.26, 0.22, 0, 0.4), soft(0.54, 0.07, 0.31, STONED, 0.26, 0.46, 0, 0.4),
      B(0.07, 0xdcd6cf, 0.14, 0.3, 0.125, 1.3, 0.8, 0.3, 7, 5), B(0.06, STONED, 0.36, 0.16, 0.125, 1.4, 0.8, 0.3, 7, 5), B(0.065, 0xdcd6cf, 0.3, 0.32, -0.125, 1.3, 0.8, 0.3, 7, 5), B(0.05, STONED, 0.12, 0.14, -0.125, 1.4, 0.8, 0.3, 7, 5)] },
  hecke: { post: () => [B(0.3, HEDGE, 0, 0.36, 0, 1, 1.25, 1, 10, 8), B(0.12, 0x76c26c, 0.1, 0.66, 0.08, 1, 0.8, 1, 7, 5), B(0.1, HEDGED, -0.12, 0.5, -0.12, 1, 1, 1, 7, 5)],
    arm: () => [soft(0.56, 0.62, 0.46, HEDGE, 0.26, 0.31, 0, 0.55), B(0.11, 0x76c26c, 0.2, 0.58, 0.1, 1.2, 0.7, 1, 7, 5), B(0.1, HEDGED, 0.38, 0.4, -0.18, 1, 1, 0.7, 7, 5), B(0.09, 0x76c26c, 0.34, 0.24, 0.2, 1, 1, 0.6, 7, 5)] },
  eisen: { post: () => [C(0.035, 0.04, 0.82, IRON, 0, 0.41, 0, 8), B(0.055, IRON, 0, 0.86, 0, 1, 1, 1, 8, 6), C(0.06, 0.07, 0.06, IRON, 0, 0.03, 0, 8)],
    arm: () => [X(0.5, 0.03, 0.03, IRON, 0.25, 0.62, 0), X(0.5, 0.03, 0.03, IRON, 0.25, 0.16, 0), ...[0.1, 0.2, 0.3, 0.4].flatMap(x => [C(0.012, 0.012, 0.64, IRON, x, 0.4, 0, 5), K(0.026, 0.09, IRON, x, 0.765, 0, 4)]),
      T(0.045, 0.01, IRON, 0.25, 0.39, 0, 0)] },
  seil: { post: () => [C(0.06, 0.07, 0.52, WOODD, 0, 0.26, 0, 8), C(0.066, 0.066, 0.04, ROPE, 0, 0.42, 0, 8), B(0.062, WOOD, 0, 0.53, 0, 1, 0.5, 1, 8, 5)],
    arm: () => [X(0.27, 0.036, 0.036, ROPE, 0.13, 0.385, 0, 0, 0, -0.26), X(0.26, 0.036, 0.036, ROPE, 0.375, 0.335, 0, 0, 0, -0.1)] },
  bambus: { post: () => [C(0.05, 0.055, 0.98, BAMBOO, 0, 0.49, 0, 7), C(0.056, 0.056, 0.02, BAMBOOD, 0, 0.4, 0, 7), C(0.056, 0.056, 0.02, BAMBOOD, 0, 0.75, 0, 7)],
    arm: () => [...[0.11, 0.21, 0.31, 0.41].map((x, i) => C(0.038, 0.042, 0.8 + (i % 2) * 0.1, i % 2 ? BAMBOOD : BAMBOO, x, 0.4 + (i % 2) * 0.05, 0, 6)), X(0.5, 0.035, 0.07, 0x6a8a3a, 0.25, 0.62, 0), X(0.5, 0.035, 0.07, 0x6a8a3a, 0.25, 0.2, 0)] },
};
const DIRS = [[1, PI / 2], [2, 0], [4, -PI / 2], [8, PI]]; // Bit, Drehung des +x-Arms
export function fenceParts(kind, mask) {
  const F = FENCES[kind] || FENCES.holz, m = mask & 15 || 10; // allein stehend: gerades Stück (Ost–West)
  return [...F.post(), ...DIRS.filter(([b]) => m & b).flatMap(([, a]) => turn(F.arm(), a))];
}
// Tor: zwei Pfosten und ein Flügel (der Flügel ist ein eigenes Teil und schwingt auf, wenn jemand kommt). Angel bei x = −0,42.
const GATES = {
  holz: { post: x => [C(0.065, 0.072, 0.86, WOODD, x, 0.43, 0, 8), B(0.075, WOOD, x, 0.88, 0, 1, 0.6, 1, 8, 5)],
    leaf: () => [X(0.8, 0.07, 0.04, WOOD, 0.42, 0.56, 0), X(0.8, 0.07, 0.04, WOOD, 0.42, 0.2, 0), ...[0.08, 0.25, 0.42, 0.59, 0.76].map((x, i) => X(0.11, 0.52 + Math.sin(i / 4 * PI) * 0.12, 0.03, WOODL, x, 0.33 + Math.sin(i / 4 * PI) * 0.06, 0.02)),
      X(0.86, 0.05, 0.03, WOODD, 0.42, 0.38, -0.02, 0, 0, 0.42), B(0.03, 0xf0c94a, 0.78, 0.42, 0.05)] },
  latten: { post: x => [X(0.11, 0.9, 0.11, WHITE, x, 0.45, 0), B(0.075, WHITE, x, 0.95, 0, 1, 1, 1, 8, 6)],
    leaf: () => [X(0.8, 0.05, 0.03, CREAM, 0.42, 0.5, -0.02), X(0.8, 0.05, 0.03, CREAM, 0.42, 0.2, -0.02), ...[0.06, 0.18, 0.3, 0.42, 0.54, 0.66, 0.78].flatMap((x, i) => picket(x, WHITE, 0.5 + Math.sin(i / 6 * PI) * 0.14)),
      ...fl(ROSE, 0.42, 0.62, 0.04, 0.05), B(0.028, 0xf0c94a, 0.78, 0.4, 0.05)] },
};
export const gateFrame = kind => [...GATES[kind].post(-0.45), ...GATES[kind].post(0.45)];
export const gateLeaf = kind => GATES[kind].leaf(); // Ursprung = Angel (wird im Spiel bei x = −0,42 eingehängt)
const gateWhole = kind => [...gateFrame(kind), ...GATES[kind].leaf().map(p => (p.g.translate(-0.42, 0, 0), p))];

const wisteria = (x, z, n, c) => Array.from({ length: n }, (_, i) => B(0.05 - i * 0.006, c, x + Math.sin(i * 2.1 + x * 9) * 0.02, 1.72 - i * 0.075, z + Math.cos(i * 1.7 + z * 7) * 0.02, 1, 1.1, 1, 6, 5));
export const PLACE_13 = {
  zaun: () => fenceParts('holz', 0), bambuszaun: () => fenceParts('bambus', 0), lattenzaun: () => fenceParts('latten', 0), rosenzaun: () => fenceParts('rosen', 0),
  steinmauer: () => fenceParts('stein', 0), hecke: () => fenceParts('hecke', 0), eisenzaun: () => fenceParts('eisen', 0), seilzaun: () => fenceParts('seil', 0),
  gartentor: () => gateWhole('holz'), lattentor: () => gateWhole('latten'),
  trittsteine: () => [[-0.22, -0.2, 0.2], [0.2, -0.05, 0.17], [-0.12, 0.22, 0.16], [0.26, 0.3, 0.12], [0.3, -0.34, 0.1], [-0.36, 0.02, 0.09]].map(([x, z, r], i) => C(r, r * 1.08, 0.05, i % 2 ? STONE : 0xd8d2ca, x, 0.025, z, 9, 0, i)),
  pergola: () => [...[[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]].flatMap(([x, z]) => [X(0.09, 1.8, 0.09, WHITE, x, 0.9, z), X(0.16, 0.06, 0.16, CREAM, x, 0.03, z)]),
    X(1.1, 0.07, 0.07, WHITE, 0, 1.82, -0.42), X(1.1, 0.07, 0.07, WHITE, 0, 1.82, 0.42), ...[-0.4, -0.2, 0, 0.2, 0.4].map(x => X(0.05, 0.05, 1.12, CREAM, x, 1.88, 0)),
    ...[[-0.42, -0.42], [0.42, 0.42], [0.42, -0.42], [-0.42, 0.42]].flatMap(([x, z], i) => [B(0.16, LEAF, x * 0.9, 1.86, z * 0.9, 1.3, 0.6, 1.3, 8, 6), ...wisteria(x * 0.86, z * 0.86, 5, i % 2 ? LILA : 0xb39cff)]),
    B(0.2, DLEAF, 0, 1.93, 0, 2.2, 0.4, 1.6, 8, 6), ...wisteria(0.12, -0.44, 4, LILA), ...wisteria(-0.16, 0.44, 4, 0xb39cff), ...wisteria(-0.44, 0.05, 3, LILA), ...wisteria(0.44, -0.1, 3, 0xb39cff)],
  // Feengarten (Sternchen-Laden)
  feenlaterne: () => [[C(0.02, 0.025, 0.9, 0x8a6a4a, 0, 0.45, 0, 6), T(0.1, 0.014, 0x8a6a4a, 0.1, 0.9, 0, 0, 0, PI), C(0.008, 0.008, 0.12, 0x8a6a4a, 0.2, 0.84, 0, 4), K(0.09, 0.07, 0x7ec8a0, 0.2, 0.8, 0, 8), C(0.07, 0.07, 0.015, 0x7ec8a0, 0.2, 0.64, 0, 8),
    B(0.05, LEAF, -0.04, 0.05, 0.05, 1.4, 0.6, 1, 6, 4), ...fl(LILA, 0.06, 0.06, -0.05, 0.035)], [B(0.062, 0xfff0a8, 0.2, 0.71, 0, 1, 1.15, 1, 8, 6), B(0.014, 0xfff7c8, 0.12, 1.02, 0.08), B(0.012, 0xfff7c8, 0.3, 0.92, -0.07), B(0.012, 0xfff7c8, 0.24, 0.52, 0.1)]],
  pilzhocker: () => [C(0.13, 0.17, 0.3, 0xfff3e0, 0, 0.15, 0, 12), B(0.33, RED, 0, 0.33, 0, 1, 0.5, 1, 14, 8), ...[[0.14, 0.12], [-0.16, 0.06], [0.02, -0.19], [-0.05, 0.2], [0.2, -0.1]].map(([x, z]) => B(0.05, WHITE, x, 0.335 + 0.165 * Math.sqrt(1 - (x * x + z * z) / 0.109), z, 1, 0.45, 1, 6, 4)), C(0.2, 0.2, 0.02, 0xf5e6d0, 0, 0.3, 0, 12)],
  pilztisch: () => [C(0.16, 0.22, 0.42, 0xfff3e0, 0, 0.21, 0, 12), B(0.46, 0xff8fab, 0, 0.44, 0, 1, 0.36, 1, 16, 8), C(0.4, 0.4, 0.02, 0xf5e6d0, 0, 0.42, 0, 14), ...ring(6, 0.28, (x, z) => B(0.055, WHITE, x, 0.578, z, 1, 0.45, 1, 6, 4)),
    C(0.05, 0.04, 0.05, WHITE, 0.08, 0.62, 0.04, 8), C(0.035, 0.03, 0.04, MINT, -0.1, 0.61, -0.05, 8)],
  wunschbrunnen: () => [[...ring(10, 0.38, (x, z, i) => soft(0.24, 0.34, 0.2, i % 2 ? STONE : 0xd8d2ca, x, 0.17, z, 0.45, -i / 10 * TAU + H)), C(0.33, 0.33, 0.04, 0x3a6ea8, 0, 0.3, 0, 16),
    X(0.07, 1.25, 0.07, WOODD, -0.38, 0.72, 0), X(0.07, 1.25, 0.07, WOODD, 0.38, 0.72, 0), C(0.03, 0.03, 0.8, WOOD, 0, 1.05, 0, 6, 0, 0, H), K(0.62, 0.36, 0xff8fab, 0, 1.5, 0, 4, 0, PI / 4),
    C(0.008, 0.008, 0.36, ROPE, 0.06, 0.87, 0, 4), C(0.07, 0.055, 0.1, WOOD, 0.06, 0.66, 0, 8), ...fl(BUTTER, -0.5, 0.06, 0.3, 0.04), ...fl(ROSE, 0.5, 0.06, 0.32, 0.04), B(0.07, LEAF, -0.44, 0.05, 0.36, 1.3, 0.6, 1, 6, 4)],
    [C(0.3, 0.3, 0.02, 0x9fe0ff, 0, 0.325, 0, 16), B(0.02, 0xfff7c8, 0.12, 0.36, 0.08), B(0.016, 0xfff7c8, -0.1, 0.36, -0.06), B(0.016, 0xfff7c8, 0.02, 0.36, -0.16)]],
  schmetterlingsstrauch: () => [B(0.34, 0x6aa860, 0, 0.3, 0, 1, 0.8, 1, 12, 8), B(0.2, 0x7ab870, 0.16, 0.5, 0.1, 1, 0.9, 1, 8, 6), B(0.18, 0x5c9a56, -0.18, 0.46, -0.08, 1, 0.9, 1, 8, 6),
    ...[[0, 0, 0.92, 0], [0.26, 0.12, 0.74, 0.5], [-0.28, -0.04, 0.7, -0.5], [0.08, -0.26, 0.66, 0.2], [-0.1, 0.28, 0.62, -0.2]].flatMap(([x, z, h, l], i) => [C(0.012, 0.014, h - 0.4, 0x5c9a56, x * 0.8, (h + 0.3) / 2, z * 0.8, 5, z * 0.5, 0, -x * 0.5),
      ...Array.from({ length: 5 }, (_, j) => B(0.055 - j * 0.008, [LILA, 0xb39cff, 0xd9a6ff][i % 3], x + l * j * 0.012, h - 0.08 + j * 0.055, z, 1, 1, 1, 6, 5))]),
    ...[[0.3, 0.8, 0.2, 0xffb04a], [-0.32, 0.72, 0.06, 0x8fd4ff], [0.04, 1.02, -0.22, ROSE]].flatMap(([x, y, z, c], i) => [X(0.012, 0.012, 0.07, DARK, x, y, z, 0, i), B(0.05, c, x - 0.04, y + 0.02, z, 1, 0.12, 0.8, 6, 4, 0), B(0.05, c, x + 0.04, y + 0.02, z, 1, 0.12, 0.8, 6, 4)])],
  regenbogen: () => [[...[0xff6b8a, 0xffa64d, 0xffe066, 0x8fdc7a, 0x7cc4ff, 0xb39cff].map((c, i) => T(0.62 - i * 0.055, 0.03, c, 0, 0.06, 0, 0, 0, PI)),
    ...[-0.5, 0.5].flatMap(x => [B(0.22, WHITE, x, 0.14, 0, 1.2, 0.8, 1, 10, 7), B(0.15, WHITE, x - 0.16, 0.1, 0.04, 1, 0.8, 1, 8, 6), B(0.15, WHITE, x + 0.16, 0.1, -0.04, 1, 0.8, 1, 8, 6), B(0.13, CREAM, x, 0.26, 0.02, 1, 0.8, 1, 8, 6)])], [B(0.02, 0xfff7c8, 0.2, 0.86, 0.06), B(0.016, 0xfff7c8, -0.3, 0.7, 0.06), B(0.016, 0xfff7c8, 0, 0.5, 0.08)]],
};
