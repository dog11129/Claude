// Alle 3D-Modelle, aus einfachen Formen zusammengesetzt (keine externen Dateien nötig).
// Jedes Modell wird zu EINER Geometrie mit Vertex-Farben verschmolzen -> wenig Draw-Calls, läuft flüssig auf dem Handy.
import * as THREE from '../vendor/three.module.min.js';

// Weicher Lichtsaum an den Rändern: lässt alles rund und kuschelig wirken
export function cozy(sh) {
  sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>',
    'outgoingLight += vec3(1.0, 0.96, 0.9) * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 3.0) * 0.2;\n#include <opaque_fragment>');
}
export const MAT = new THREE.MeshLambertMaterial({ vertexColors: true });
MAT.onBeforeCompile = cozy;
MAT.customProgramCacheKey = () => 'cozy';
export const GLOW = new THREE.MeshBasicMaterial({ color: 0xffe27a });

function mk(g, c, x, y, z, rx = 0, ry = 0, rz = 0) {
  if (rx) g.rotateX(rx);
  if (ry) g.rotateY(ry);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return { g, c };
}
export const box = (w, h, d, c, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) => mk(new THREE.BoxGeometry(w, h, d), c, x, y, z, rx, ry, rz);
export const ball = (r, c, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, seg = 9) => {
  const g = new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2));
  g.scale(sx, sy, sz);
  return mk(g, c, x, y, z);
};
export const cyl = (rt, rb, h, c, x = 0, y = 0, z = 0, seg = 8, rx = 0, ry = 0, rz = 0) => mk(new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y, z, rx, ry, rz);
export const cone = (r, h, c, x = 0, y = 0, z = 0, seg = 8, rx = 0, ry = 0, rz = 0) => mk(new THREE.ConeGeometry(r, h, seg), c, x, y, z, rx, ry, rz);

// Runde Formen behalten ihre weichen Normalen, eckige (wenige Segmente) werden facettiert.
const lowPoly = g => (g.parameters?.radialSegments ?? g.parameters?.widthSegments ?? 99) <= 6;
export function merge(parts) {
  let n = 0;
  const gs = parts.filter(Boolean).map(p => {
    const g = p.g.index ? p.g.toNonIndexed() : p.g;
    if (lowPoly(p.g) || !g.attributes.normal) g.computeVertexNormals();
    n += g.attributes.position.count;
    return [g, new THREE.Color(p.c)];
  });
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), nrm = new Float32Array(n * 3);
  let o = 0;
  for (const [g, c] of gs) {
    const a = g.attributes.position.array, cnt = a.length / 3;
    pos.set(a, o * 3);
    nrm.set(g.attributes.normal.array, o * 3);
    for (let i = 0; i < cnt; i++) { col[(o + i) * 3] = c.r; col[(o + i) * 3 + 1] = c.g; col[(o + i) * 3 + 2] = c.b; }
    o += cnt;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  return geo;
}

const cache = new Map();
const cached = (k, fn) => { if (!cache.has(k)) cache.set(k, fn()); return cache.get(k); };

// Modell = Gruppe aus normalem Teil und optionalem Leucht-Teil (Fenster, Laternen).
export function model(parts, glow = [], shadow = true) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(merge(parts), MAT);
  m.castShadow = shadow;
  m.receiveShadow = true;
  g.add(m);
  if (glow.length) g.add(new THREE.Mesh(merge(glow), GLOW));
  return g;
}
function cachedModel(k, fn) {
  const [parts, glow] = cached(k, () => {
    const r = fn();
    return Array.isArray(r[0]) ? [merge(r[0]), r[1].length ? merge(r[1]) : null] : [merge(r), null];
  });
  const g = new THREE.Group();
  const m = new THREE.Mesh(parts, MAT);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  if (glow) g.add(new THREE.Mesh(glow, GLOW));
  return g;
}

const GREEN = 0x5fb84a, WOOD = 0x9c6b3f;

// Wilde Bäume (Holz) und Felsen (Stein); left = wie viel heute noch geht
export function wild(kind, season, left) {
  return cachedModel('wild' + kind + season + (left > 0 ? 1 : 0), () => {
    if (kind === 'rock') {
      const big = left > 0 ? 1 : 0.65;
      return [ball(0.42 * big, 0x9a958e, 0, 0.18, 0, 1.25, 0.8, 1.05, 10), ball(0.28 * big, 0xb2ada6, 0.25, 0.12, 0.18, 1, 0.75, 1, 9), ball(0.2 * big, 0x8a857e, -0.28, 0.1, 0.12, 1, 0.7, 1, 8),
        ...(season === 'winter' ? [ball(0.36 * big, 0xffffff, 0, 0.3 * big, 0, 1.2, 0.35, 1, 10)] : [ball(0.05, 0x7cc95a, -0.15, 0.32 * big, 0.2, 1.6, 0.5, 1)])];
    }
    const L = { spring: [0xffc2d8, 0x8fdc72], summer: [0x5fb84a, 0x7fd06a], autumn: [0xf0a040, 0xe07b39], winter: [0xeef4f8, 0xffffff] }[season];
    const p = [cyl(0.13, 0.2, 1.2, 0x8a5a36, 0, 0.6, 0, 10), ball(0.75, L[0], 0, 1.65, 0, 1.05, 0.9, 1.05, 12), ball(0.5, L[1], 0.38, 1.45, 0.25, 1, 0.9, 1, 10), ball(0.45, L[1], -0.35, 1.55, -0.2, 1, 0.9, 1, 10), ball(0.42, L[0], 0.05, 2.1, 0.1, 1, 0.9, 1, 10)];
    if (left <= 0) p.push(ball(0.1, 0xc9a46b, 0.2, 0.06, 0.35, 1.6, 0.4, 1), ball(0.08, 0xc9a46b, -0.25, 0.05, 0.3, 1.6, 0.4, 1));
    return p;
  });
}
export function digMark() {
  return cachedModel('dig', () => [box(0.42, 0.02, 0.07, 0x6e4a2a, 0, 0.012, 0, Math.PI / 4), box(0.42, 0.02, 0.07, 0x6e4a2a, 0, 0.014, 0, -Math.PI / 4), ball(0.05, 0x8a5a3a, 0.18, 0.02, 0.1, 1, 0.4, 1), ball(0.04, 0x8a5a3a, -0.16, 0.02, -0.12, 1, 0.4, 1)]);
}

// ---------- Landschaft (einmal gebaut, ein einziger Draw-Call) ----------
// Farben der Landschaft je Jahreszeit
const LEAVES = {
  spring: [0xffb7d0, 0xffc8dc, 0x7fd06a, 0x8fdc72], summer: [0x5fb84a, 0x6cc455, 0x4fae46, 0xffb7d0],
  autumn: [0xf0a040, 0xd9583a, 0xf2c94c, 0xe07b39], winter: [0xeef4f8, 0xe2ecf2, 0xf6fafc, 0xdde8ef],
};
export function scenery(isFree, h = () => 0, season = 'summer') {
  const p = [], L = LEAVES[season], snow = season === 'winter';
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 240; i++) {
    const a = rand() * Math.PI * 2, r = 17.5 + rand() * 18, x = Math.cos(a) * r, z = Math.sin(a) * r, s = 0.8 + rand() * 0.8, y = h(x, z) - 0.1;
    const k = rand(), leaf = L[Math.floor(rand() * 4)];
    // runde, weiche Formen (mehr Segmente), damit der Wald zu den Figuren passt
    if (k < 0.45) p.push(cyl(0.12 * s, 0.18 * s, 1.2 * s, 0x7a4b2e, x, y + 0.6 * s, z, 7), cone(0.95 * s, 1.5 * s, 0x3f8f4a, x, y + 1.55 * s, z, 14), cone(0.75 * s, 1.25 * s, snow ? 0xdfeaf0 : 0x4a9f55, x, y + 2.2 * s, z, 14), cone(0.5 * s, 0.95 * s, snow ? 0xffffff : 0x5cb566, x, y + 2.8 * s, z, 12), ball(0.12 * s, snow ? 0xffffff : 0x66c070, x, y + 3.25 * s, z, 1, 1, 1, 6));
    else if (k < 0.85) p.push(cyl(0.12 * s, 0.18 * s, 1 * s, 0x7a4b2e, x, y + 0.5 * s, z, 7), ball(0.8 * s, leaf, x, y + 1.4 * s, z, 1, 0.88, 1, 12), ball(0.5 * s, L[(i + 1) % 4], x + 0.35 * s, y + 1.75 * s, z + 0.2 * s, 1, 0.9, 1, 10), ball(0.45 * s, L[(i + 2) % 4], x - 0.38 * s, y + 1.6 * s, z - 0.15 * s, 1, 0.9, 1, 10));
    else if (k < 0.95) p.push(ball(0.45 * s, snow ? 0xe6eef3 : 0x4fa85a, x, y + 0.3 * s, z, 1.3, 0.8, 1.1, 7), ...(snow ? [] : [ball(0.08, [0xff8fab, 0xffffff, 0xffe066][i % 3], x + 0.2, y + 0.6 * s, z + 0.3, 1, 1, 1, 5)]));
    else p.push(ball(0.5 * s, 0xa8a39c, x, y + 0.15, z, 1.2, 0.6, 1, 6), ball(0.3 * s, snow ? 0xffffff : 0xb9b4ad, x + 0.4 * s, y + 0.1, z + 0.2, 1, 0.6, 1, 6));
  }
  for (let i = 0; i < (snow ? 0 : 260); i++) {
    const x = (rand() - 0.5) * 30, z = (rand() - 0.5) * 30;
    if (!isFree(Math.round(x), Math.round(z))) continue;
    if (rand() < 0.75) p.push(cone(0.06, 0.22, rand() < 0.5 ? 0x6fc45a : 0x5aa94a, x, 0.1, z, 4), cone(0.05, 0.18, 0x7fd06a, x + 0.08, 0.08, z + 0.05, 4));
    else p.push(cyl(0.01, 0.01, 0.2, GREEN, x, 0.1, z, 3), ball(0.05, [0xff8fab, 0xffffff, 0xffe066, 0xb39cff][Math.floor(rand() * 4)], x, 0.22, z, 1, 0.7, 1, 5));
  }
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    p.push(ball(0.25 + (i % 3) * 0.08, 0x9a958e, -11 + Math.cos(a) * 2.75, 0.05, -10 + Math.sin(a) * 2.75, 1, 0.5, 1, 5));
  }
  p.push(cyl(0.3, 0.3, 0.03, 0x4fae4a, -10, 0.07, -9.5, 8), cyl(0.25, 0.25, 0.03, 0x4fae4a, -12, 0.07, -10.8, 8), ball(0.07, 0xffb7d0, -10, 0.12, -9.5));
  return model(p, [], false);
}

// Zaun um Feld und Gehege (Optik)
export function fences(rects) {
  const p = [];
  for (const [x0, z0, x1, z1, gap] of rects) {
    const post = (x, z) => p.push(box(0.1, 0.45, 0.1, WOOD, x, 0.22, z));
    for (let x = x0; x <= x1 + 0.01; x += 1) { post(x, z0); post(x, z1); }
    for (let z = z0 + 1; z < z1 - 0.01; z += 1) { post(x0, z); post(x1, z); }
    const rail = (x, z, w, d) => p.push(box(w, 0.06, d, 0xb5844f, x, 0.32, z));
    for (const z of [z0, z1]) {
      const mid = (x0 + x1) / 2, half = (x1 - x0) / 2 - 0.8;
      if (gap === z) { rail((x0 + mid - 0.8) / 2, z, half, 0.05); rail((mid + 0.8 + x1) / 2, z, half, 0.05); }
      else rail(mid, z, x1 - x0, 0.05);
    }
    rail(x0, (z0 + z1) / 2, 0.05, z1 - z0);
    rail(x1, (z0 + z1) / 2, 0.05, z1 - z0);
  }
  return model(p);
}
