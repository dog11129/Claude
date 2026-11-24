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
// Dach: dreieckiges Prisma entlang x
export const roof = (w, h, d, c, x = 0, y = 0, z = 0) => {
  const g = new THREE.CylinderGeometry(1, 1, w, 3);
  g.rotateZ(Math.PI / 2);
  g.rotateX(Math.PI / 2 + Math.PI);
  g.scale(1, h / 1.5, d / 1.732);
  return mk(g, c, x, y + h / 3, z);
};

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

const GREEN = 0x5fb84a, DGREEN = 0x3f8f3a, LEAF = 0x76c955, WOOD = 0x9c6b3f, DWOOD = 0x6e4a2a, STONE = 0xb9b4ad;

// ---------- Pflanzen ----------
export function crop(k, st) {
  return cachedModel('crop' + k + st, () => {
    if (st === 0) return [cone(0.05, 0.18, LEAF, -0.05, 0.09, 0, 5, 0, 0, 0.4), cone(0.05, 0.16, LEAF, 0.05, 0.08, 0, 5, 0, 0, -0.4)];
    const s = [0, 0.55, 0.8, 1][st], ripe = st === 3, p = [];
    switch (k) {
      case 'weizen': {
        const col = ripe ? 0xe8c25a : 0x9ccf5a;
        for (let i = 0; i < 7; i++) {
          const a = i * 2.4, r = 0.08 + (i % 3) * 0.08, x = Math.cos(a) * r, z = Math.sin(a) * r;
          p.push(cyl(0.015, 0.02, 0.55 * s, col, x, 0.27 * s, z, 4));
          p.push(ball(0.05, ripe ? 0xf2d16b : 0xb5dc6a, x, 0.58 * s, z, 0.7, 1.8, 0.7, 5));
        }
        break;
      }
      case 'karotte':
        for (let i = 0; i < 4; i++) p.push(cone(0.06, 0.4 * s, LEAF, Math.cos(i * 1.6) * 0.07, 0.2 * s + 0.04, Math.sin(i * 1.6) * 0.07, 5, Math.sin(i * 1.6) * 0.3, 0, -Math.cos(i * 1.6) * 0.3));
        if (ripe) p.push(cone(0.09, 0.22, 0xff8a2a, 0, 0.06, 0, 7, Math.PI));
        break;
      case 'kartoffel':
        p.push(ball(0.22 * s, DGREEN, 0, 0.18 * s, 0, 1.2, 0.8, 1.2), ball(0.16 * s, GREEN, 0.12, 0.25 * s, 0.05), ball(0.15 * s, GREEN, -0.1, 0.24 * s, -0.08));
        if (ripe) for (let i = 0; i < 4; i++) p.push(ball(0.05, i % 2 ? 0xffffff : 0xd8b4f8, Math.cos(i * 1.7) * 0.18, 0.38, Math.sin(i * 1.7) * 0.18));
        break;
      case 'erdbeere':
        for (let i = 0; i < 5; i++) p.push(ball(0.12 * s, i % 2 ? GREEN : DGREEN, Math.cos(i * 1.25) * 0.15 * s, 0.08, Math.sin(i * 1.25) * 0.15 * s, 1, 0.45, 1));
        if (ripe) for (let i = 0; i < 4; i++) p.push(cone(0.06, 0.12, 0xff3b5c, Math.cos(i * 1.6 + 0.4) * 0.22, 0.07, Math.sin(i * 1.6 + 0.4) * 0.22, 6, Math.PI));
        break;
      case 'tomate':
        p.push(box(0.04, 0.9 * s, 0.04, WOOD, 0.05, 0.45 * s, 0), ball(0.2 * s, DGREEN, 0, 0.45 * s, 0, 1, 1.5, 1), ball(0.14 * s, GREEN, 0.08, 0.68 * s, 0.06));
        if (ripe) for (let i = 0; i < 5; i++) p.push(ball(0.075, 0xff4836, Math.cos(i * 1.3) * 0.2, 0.3 + (i % 3) * 0.16, Math.sin(i * 1.3) * 0.2));
        break;
      case 'mais':
        p.push(cyl(0.035, 0.05, 1.3 * s, GREEN, 0, 0.65 * s, 0, 5));
        for (let i = 0; i < 4; i++) p.push(box(0.5 * s, 0.03, 0.1, LEAF, Math.cos(i * 1.6) * 0.2 * s, (0.3 + i * 0.22) * s, Math.sin(i * 1.6) * 0.2 * s, -i * 1.6, 0, 0.35));
        if (ripe) p.push(ball(0.07, 0xffd23f, 0.1, 0.8, 0, 1, 2.3, 1), ball(0.07, 0xffd23f, -0.09, 0.65, 0.05, 1, 2.3, 1), cone(0.05, 0.3, 0xd9e8a0, 0, 1.4, 0, 5));
        break;
      case 'sonnenblume':
        p.push(cyl(0.035, 0.05, 1.4 * s, GREEN, 0, 0.7 * s, 0, 5), ball(0.12 * s, LEAF, 0.12, 0.5 * s, 0, 1, 0.3, 0.7), ball(0.12 * s, LEAF, -0.12, 0.8 * s, 0, 1, 0.3, 0.7));
        if (ripe) p.push(cyl(0.3, 0.3, 0.05, 0xffcf1f, 0, 1.45, 0.05, 12, Math.PI / 2 - 0.3), cyl(0.14, 0.14, 0.08, 0x6b3e1e, 0, 1.46, 0.09, 10, Math.PI / 2 - 0.3));
        else if (st === 2) p.push(ball(0.1, DGREEN, 0, 1.15, 0));
        break;
      case 'salatkopf':
        p.push(ball(0.2 * s, 0x9fdc6a, 0, 0.12 * s, 0, 1, 0.75, 1), ball(0.15 * s, 0xc6ee92, 0, 0.18 * s, 0, 1, 0.8, 1));
        for (let i = 0; i < 5; i++) p.push(ball(0.13 * s, 0x7cc95a, Math.cos(i * 1.25) * 0.17 * s, 0.1 * s, Math.sin(i * 1.25) * 0.17 * s, 1, 0.55, 1));
        break;
      case 'brokkoli':
        p.push(cyl(0.05 * s, 0.07 * s, 0.35 * s, 0x8ccf6a, 0, 0.17 * s, 0, 8));
        for (let i = 0; i < 5; i++) p.push(ball(0.12 * s, 0x5a9e3c, Math.cos(i * 1.25) * 0.12 * s, 0.1, Math.sin(i * 1.25) * 0.12 * s, 1, 0.4, 1));
        if (st >= 2) for (let i = 0; i < 6; i++) p.push(ball(0.09 * s, ripe ? 0x3f8a3a : 0x6fae4a, Math.cos(i * 1.05) * 0.1, 0.42 * s, Math.sin(i * 1.05) * 0.1));
        break;
      case 'melone':
        for (let i = 0; i < 4; i++) p.push(ball(0.16 * s, i % 2 ? GREEN : DGREEN, Math.cos(i * 1.6 + 0.5) * 0.28 * s, 0.07, Math.sin(i * 1.6 + 0.5) * 0.28 * s, 1, 0.4, 1));
        if (ripe) {
          p.push(ball(0.3, 0x4fae46, 0, 0.24, 0, 1.25, 0.85, 1, 14));
          for (let i = 0; i < 6; i++) { // dunkle Streifen
            const st = ball(0.3, 0x2a7a2e, 0, 0, 0, 0.12, 1.02, 1.02, 14);
            st.g.rotateY(i * Math.PI / 6);
            st.g.scale(1.25, 0.85, 1);
            st.g.translate(0, 0.24, 0);
            p.push(st);
          }
        }
        break;
      case 'traube':
        p.push(box(0.05, 0.9 * s, 0.05, WOOD, -0.25, 0.45 * s, 0), box(0.05, 0.9 * s, 0.05, WOOD, 0.25, 0.45 * s, 0), box(0.56, 0.04, 0.04, WOOD, 0, 0.85 * s, 0));
        p.push(ball(0.16 * s, DGREEN, -0.12, 0.7 * s, 0.05, 1.2, 0.7, 0.8), ball(0.16 * s, GREEN, 0.14, 0.72 * s, -0.03, 1.2, 0.7, 0.8));
        if (ripe) for (const x of [-0.12, 0.13]) for (let i = 0; i < 6; i++) p.push(ball(0.05, 0x7b4bb5, x + (i % 2) * 0.06 - 0.03, 0.62 - Math.floor(i / 2) * 0.07, 0.1, 1, 1, 1, 8));
        break;
      case 'kuerbis':
        for (let i = 0; i < 4; i++) p.push(ball(0.16 * s, i % 2 ? GREEN : DGREEN, Math.cos(i * 1.6) * 0.28 * s, 0.07, Math.sin(i * 1.6) * 0.28 * s, 1, 0.4, 1));
        if (ripe) p.push(ball(0.34, 0xff8c1a, 0, 0.24, 0, 1.15, 0.75, 1.15, 10), cyl(0.04, 0.05, 0.14, 0x5b8a2a, 0, 0.5, 0, 5));
        break;
    }
    return p;
  });
}

// ---------- Tiere (schauen nach +z) ----------
export function animal(k) {
  return cachedModel('animal' + k, () => {
    const eyes = (y, z, w, r = 0.03) => [ball(r, 0x222222, -w, y, z), ball(r, 0x222222, w, y, z)];
    switch (k) {
      case 'huhn': return [
        ball(0.24, 0xffffff, 0, 0.32, 0, 1, 0.9, 1.15), ball(0.15, 0xffffff, 0, 0.55, 0.17),
        box(0.05, 0.1, 0.12, 0xff3b3b, 0, 0.7, 0.17), cone(0.05, 0.1, 0xffb020, 0, 0.54, 0.33, 6, Math.PI / 2),
        ball(0.04, 0xff3b3b, 0, 0.47, 0.3), cone(0.12, 0.18, 0xf2f2f2, 0, 0.42, -0.26, 6, -Math.PI / 3),
        cyl(0.02, 0.02, 0.18, 0xffa020, -0.08, 0.09, 0), cyl(0.02, 0.02, 0.18, 0xffa020, 0.08, 0.09, 0), ...eyes(0.58, 0.3, 0.07)];
      case 'kuh': {
        const legs = [[-0.22, 0.28], [0.22, 0.28], [-0.22, -0.28], [0.22, -0.28]].map(([x, z]) => box(0.14, 0.4, 0.14, 0xffffff, x, 0.2, z));
        return [...legs, box(0.62, 0.45, 0.95, 0xffffff, 0, 0.6, 0),
          box(0.3, 0.2, 0.3, 0x2b2b2b, 0.18, 0.75, 0.15), box(0.25, 0.2, 0.25, 0x2b2b2b, -0.2, 0.6, -0.25), box(0.18, 0.18, 0.2, 0x2b2b2b, -0.25, 0.75, 0.25),
          box(0.42, 0.4, 0.38, 0xffffff, 0, 0.85, 0.6), box(0.44, 0.2, 0.14, 0xffb3c1, 0, 0.75, 0.82),
          cone(0.05, 0.16, 0xfff1c9, -0.17, 1.1, 0.55, 6), cone(0.05, 0.16, 0xfff1c9, 0.17, 1.1, 0.55, 6),
          box(0.16, 0.06, 0.1, 0xffffff, -0.28, 0.95, 0.55), box(0.16, 0.06, 0.1, 0xffffff, 0.28, 0.95, 0.55),
          box(0.05, 0.4, 0.05, 0xffffff, 0, 0.55, -0.5, 0, 0.3), ball(0.08, 0xffb3c1, 0, 0.32, 0.1), ...eyes(0.92, 0.8, 0.12, 0.035)];
      }
      case 'schaf': {
        const p = [];
        for (let i = 0; i < 9; i++) p.push(ball(0.22, 0xfaf6ee, Math.cos(i * 2.1) * 0.2, 0.55 + (i % 3) * 0.08, Math.sin(i * 0.9) * 0.3, 1, 1, 1, 6));
        for (const [x, z] of [[-0.15, 0.2], [0.15, 0.2], [-0.15, -0.2], [0.15, -0.2]]) p.push(box(0.1, 0.35, 0.1, 0x3a3a3a, x, 0.18, z));
        p.push(ball(0.17, 0x3a3a3a, 0, 0.72, 0.42, 0.9, 1, 1.1), ball(0.13, 0xfaf6ee, 0, 0.86, 0.38),
          ball(0.06, 0x3a3a3a, -0.17, 0.72, 0.38, 1.5, 0.6, 1), ball(0.06, 0x3a3a3a, 0.17, 0.72, 0.38, 1.5, 0.6, 1), ...eyes(0.76, 0.56, 0.07));
        return p;
      }
      case 'schwein': return [
        ball(0.33, 0xffb0c0, 0, 0.42, 0, 1, 0.9, 1.3), ball(0.24, 0xffb0c0, 0, 0.52, 0.38),
        cyl(0.1, 0.1, 0.08, 0xff8fa5, 0, 0.48, 0.62, 10, Math.PI / 2), ball(0.02, 0x7a3b4a, -0.04, 0.48, 0.66), ball(0.02, 0x7a3b4a, 0.04, 0.48, 0.66),
        cone(0.07, 0.12, 0xff8fa5, -0.14, 0.75, 0.38, 4, 0.3), cone(0.07, 0.12, 0xff8fa5, 0.14, 0.75, 0.38, 4, 0.3),
        ...[[-0.15, 0.22], [0.15, 0.22], [-0.15, -0.22], [0.15, -0.22]].map(([x, z]) => cyl(0.06, 0.06, 0.2, 0xff9fb2, x, 0.1, z, 6)),
        ball(0.05, 0xff8fa5, 0, 0.55, -0.42), ...eyes(0.6, 0.58, 0.09)];
    }
  });
}

// ---------- Spieler (schaut nach +z) ----------
export function player(color, hat) {
  const g = new THREE.Group();
  const body = model([
    cyl(0.2, 0.26, 0.45, color, 0, 0.5, 0, 10), box(0.16, 0.25, 0.18, 0x4a6fa5, -0.1, 0.16, 0), box(0.16, 0.25, 0.18, 0x4a6fa5, 0.1, 0.16, 0),
    box(0.17, 0.08, 0.24, 0x6b4a32, -0.1, 0.03, 0.03), box(0.17, 0.08, 0.24, 0x6b4a32, 0.1, 0.03, 0.03),
    ball(0.09, color, -0.27, 0.55, 0, 1, 1.4, 1), ball(0.09, color, 0.27, 0.55, 0, 1, 1.4, 1),
    ball(0.07, 0xffd8b8, -0.29, 0.38, 0.02), ball(0.07, 0xffd8b8, 0.29, 0.38, 0.02),
  ]);
  const hp = [
    ball(0.3, 0xffd8b8, 0, 0, 0, 1, 0.95, 1, 10), ball(0.04, 0x2b2b2b, -0.1, 0.03, 0.27), ball(0.04, 0x2b2b2b, 0.1, 0.03, 0.27),
    ball(0.05, 0xff9aa8, -0.18, -0.06, 0.23, 1, 0.6, 0.5), ball(0.05, 0xff9aa8, 0.18, -0.06, 0.23, 1, 0.6, 0.5),
    ball(0.31, 0x6b4428, 0, 0.08, -0.05, 1, 0.85, 1, 10),
  ];
  if (hat === 'straw') hp.push(cyl(0.48, 0.48, 0.04, 0xf2d27a, 0, 0.2, 0, 14), cyl(0.22, 0.26, 0.2, 0xf2d27a, 0, 0.3, 0, 12), cyl(0.265, 0.265, 0.05, 0xff6b8a, 0, 0.23, 0, 12));
  if (hat === 'cap') hp.push(ball(0.32, color, 0, 0.12, 0, 1, 0.7, 1, 10), box(0.3, 0.04, 0.25, color, 0, 0.12, 0.3));
  if (hat === 'flowers') for (let i = 0; i < 8; i++) hp.push(ball(0.07, [0xff8fab, 0xffe066, 0xffffff, 0xb39cff][i % 4], Math.cos(i * 0.785) * 0.27, 0.2, Math.sin(i * 0.785) * 0.27));
  if (hat === 'bunny') hp.push(ball(0.08, 0xffffff, -0.12, 0.45, -0.02, 0.8, 2.6, 0.6), ball(0.08, 0xffffff, 0.12, 0.45, -0.02, 0.8, 2.6, 0.6),
    ball(0.045, 0xffb3c8, -0.12, 0.45, 0.02, 0.7, 2.2, 0.5), ball(0.045, 0xffb3c8, 0.12, 0.45, 0.02, 0.7, 2.2, 0.5));
  if (hat === 'crown') hp.push(cyl(0.2, 0.18, 0.12, 0xffd23f, 0, 0.3, 0, 8), ...[0, 1, 2, 3, 4].map(i => cone(0.05, 0.12, 0xffd23f, Math.cos(i * 1.256) * 0.17, 0.41, Math.sin(i * 1.256) * 0.17, 4)), ball(0.04, 0xff4d6d, 0, 0.3, 0.19));
  const head = model(hp);
  head.position.y = 1.0;
  g.add(body, head);
  g.userData = { body, head };
  return g;
}

// ---------- Platzierbares (Deko, Maschinen, Bäume, Sprinkler) ----------
export function placeable(k, ready) {
  return cachedModel('place' + k + (ready ? 1 : 0), () => {
    switch (k) {
      case 'weg': return [cyl(0.25, 0.27, 0.05, STONE, -0.18, 0.03, -0.15, 7), cyl(0.2, 0.22, 0.05, 0xa8a39c, 0.2, 0.03, 0.05, 6), cyl(0.18, 0.2, 0.05, 0xc4bfb8, -0.1, 0.03, 0.25, 6), cyl(0.12, 0.14, 0.05, STONE, 0.25, 0.03, -0.3, 6)];
      case 'blumen': {
        const p = [box(0.9, 0.1, 0.9, 0x7a5030, 0, 0.05, 0)];
        const cols = [0xff6b8a, 0xffe066, 0xb39cff, 0xffffff, 0xff9f43];
        for (let i = 0; i < 9; i++) {
          const x = (i % 3 - 1) * 0.28, z = (Math.floor(i / 3) - 1) * 0.28;
          p.push(cyl(0.015, 0.015, 0.25, GREEN, x, 0.2, z, 4), ball(0.08, cols[i % 5], x, 0.34, z, 1, 0.7, 1, 6), ball(0.03, 0xffd23f, x, 0.38, z, 1, 1, 1, 4));
        }
        return p;
      }
      case 'zaun': return [box(0.1, 0.6, 0.1, WOOD, -0.42, 0.3, 0), box(0.1, 0.6, 0.1, WOOD, 0.42, 0.3, 0), box(1, 0.08, 0.06, 0xb5844f, 0, 0.42, 0), box(1, 0.08, 0.06, 0xb5844f, 0, 0.22, 0), cone(0.07, 0.1, WOOD, -0.42, 0.65, 0, 4), cone(0.07, 0.1, WOOD, 0.42, 0.65, 0, 4)];
      case 'heu': return [box(0.85, 0.55, 0.6, 0xf0cf62, 0, 0.28, 0), box(0.87, 0.05, 0.62, 0xc9a03e, 0, 0.18, 0), box(0.87, 0.05, 0.62, 0xc9a03e, 0, 0.4, 0)];
      case 'vogelhaus': return [cyl(0.05, 0.06, 1.1, WOOD, 0, 0.55, 0, 8), box(0.4, 0.34, 0.34, 0xffd6a5, 0, 1.25, 0), roof(0.5, 0.22, 0.46, 0xd9534f, 0, 1.42, 0),
        cyl(0.06, 0.06, 0.03, 0x5a3a24, 0, 1.25, 0.17, 10, Math.PI / 2), box(0.12, 0.02, 0.08, WOOD, 0, 1.15, 0.21), ball(0.05, 0x7fc8ff, 0.08, 1.2, 0.2, 1, 0.9, 1.1), ball(0.022, 0xffb020, 0.08, 1.2, 0.25)];
      case 'pilz': return [cyl(0.08, 0.1, 0.3, 0xfff6e6, 0, 0.15, 0), ball(0.25, 0xff3b3b, 0, 0.32, 0, 1, 0.6, 1, 9), ball(0.04, 0xffffff, 0.1, 0.45, 0.08), ball(0.04, 0xffffff, -0.1, 0.43, -0.05), ball(0.03, 0xffffff, 0.02, 0.47, -0.12), ball(0.035, 0xffffff, -0.06, 0.42, 0.15)];
      case 'laterne': return [[cyl(0.05, 0.07, 1.4, 0x3b3b4a, 0, 0.7, 0), box(0.3, 0.06, 0.3, 0x3b3b4a, 0, 1.42, 0), cone(0.22, 0.2, 0x3b3b4a, 0, 1.78, 0, 4, 0, Math.PI / 4), box(0.3, 0.06, 0.3, 0x3b3b4a, 0, 1.68, 0), cyl(0.15, 0.2, 0.08, 0x3b3b4a, 0, 0.04, 0)],
        [box(0.2, 0.22, 0.2, 0, 0, 1.56, 0)]];
      case 'zwerg': return [cyl(0.14, 0.18, 0.3, 0x3b6fd4, 0, 0.15, 0), ball(0.13, 0xffd8b8, 0, 0.42, 0), cone(0.13, 0.35, 0xff3b3b, 0, 0.66, 0), cone(0.12, 0.22, 0xffffff, 0, 0.3, 0.07, 6, Math.PI), ball(0.04, 0xff9aa8, 0, 0.42, 0.13)];
      case 'bank': return [box(1, 0.08, 0.35, 0xc98d55, 0, 0.42, 0), box(1, 0.3, 0.06, 0xc98d55, 0, 0.65, -0.17), box(0.08, 0.42, 0.3, 0x3b3b4a, -0.42, 0.21, 0), box(0.08, 0.42, 0.3, 0x3b3b4a, 0.42, 0.21, 0)];
      case 'kirschbaum': return [cyl(0.1, 0.15, 1.1, 0x7a4b2e, 0, 0.55, 0, 6), ball(0.55, 0xffb7d0, 0, 1.4, 0, 1, 0.8, 1, 8), ball(0.4, 0xff9fc0, 0.35, 1.25, 0.1, 1, 0.8, 1, 7), ball(0.38, 0xffc8dc, -0.3, 1.3, -0.15, 1, 0.8, 1, 7), ball(0.3, 0xffd6e4, 0, 1.7, 0.1, 1, 0.8, 1, 7)];
      case 'herz': return [
        box(0.12, 1.4, 0.12, 0xffffff, -0.45, 0.7, 0), box(0.12, 1.4, 0.12, 0xffffff, 0.45, 0.7, 0), box(1.02, 0.1, 0.14, 0xffffff, 0, 1.4, 0),
        ball(0.17, 0xff4d7d, -0.11, 1.68, 0, 1, 1, 0.6), ball(0.17, 0xff4d7d, 0.11, 1.68, 0, 1, 1, 0.6), cone(0.24, 0.3, 0xff4d7d, 0, 1.48, 0, 4, Math.PI, Math.PI / 4),
        ...[0.2, 0.5, 0.8, 1.1].flatMap(y => [ball(0.07, 0xff8fab, -0.45, y, 0.07), ball(0.07, 0xffffff, 0.45, y + 0.12, 0.07), ball(0.06, GREEN, -0.45, y + 0.12, -0.07), ball(0.06, GREEN, 0.45, y, -0.07)])];
      case 'brunnen': return [cyl(0.48, 0.5, 0.35, STONE, 0, 0.17, 0, 12), cyl(0.4, 0.4, 0.05, 0x6cc4ff, 0, 0.33, 0, 12), cyl(0.07, 0.09, 0.6, STONE, 0, 0.6, 0, 8), cyl(0.2, 0.08, 0.1, STONE, 0, 0.9, 0, 10), ball(0.1, 0x9fdcff, 0, 1.0, 0, 1, 1.5, 1)];
      case 'sprinkler': return [cyl(0.12, 0.15, 0.1, 0x7d8a99, 0, 0.05, 0), cyl(0.03, 0.03, 0.3, 0xb8c2cc, 0, 0.2, 0, 6), box(0.35, 0.04, 0.05, 0xb8c2cc, 0, 0.36, 0), ball(0.04, 0x6cc4ff, 0.17, 0.36, 0), ball(0.04, 0x6cc4ff, -0.17, 0.36, 0)];
      case 'supersprinkler': return [cyl(0.15, 0.2, 0.12, 0xd4a72c, 0, 0.06, 0), cyl(0.04, 0.04, 0.4, 0xffd23f, 0, 0.25, 0, 6), box(0.5, 0.05, 0.06, 0xffd23f, 0, 0.46, 0), box(0.06, 0.05, 0.5, 0xffd23f, 0, 0.46, 0), ball(0.06, 0x6cc4ff, 0, 0.52, 0)];
      case 'apfelbaum': {
        const p = [cyl(0.12, 0.18, 1.1, 0x7a4b2e, 0, 0.55, 0, 6), ball(0.6, 0x4fae4a, 0, 1.45, 0, 1, 0.85, 1, 8), ball(0.42, 0x5fc456, 0.35, 1.3, 0.15, 1, 0.8, 1, 7), ball(0.4, 0x3f9a3d, -0.3, 1.35, -0.2, 1, 0.8, 1, 7)];
        if (ready) for (let i = 0; i < 6; i++) p.push(ball(0.09, 0xff3b3b, Math.cos(i * 1.05) * 0.55, 1.2 + (i % 2) * 0.3, Math.sin(i * 1.05) * 0.55));
        return p;
      }
      case 'bienenstock': {
        const p = [box(0.6, 0.12, 0.6, WOOD, 0, 0.06, 0), box(0.5, 0.25, 0.5, 0xffe08a, 0, 0.25, 0), box(0.52, 0.05, 0.52, 0xd4a72c, 0, 0.4, 0), box(0.5, 0.25, 0.5, 0xffe08a, 0, 0.55, 0), cone(0.45, 0.25, 0xd4a72c, 0, 0.8, 0, 4, 0, Math.PI / 4), box(0.12, 0.05, 0.02, 0x3b2b1b, 0, 0.18, 0.26)];
        if (ready) p.push(ball(0.08, 0xffb020, 0.2, 0.4, 0.27, 1, 1.4, 0.6), ball(0.06, 0xffb020, -0.12, 0.66, 0.27, 1, 1.4, 0.6));
        return p;
      }
      case 'm_mayo': return [box(0.7, 0.6, 0.6, 0xf4f4f4, 0, 0.3, 0), box(0.72, 0.08, 0.62, 0x6cc4ff, 0, 0.62, 0), ball(0.14, 0xfff6dc, 0, 0.82, 0, 1, 1.3, 1), box(0.2, 0.15, 0.04, 0x3b3b4a, 0, 0.35, 0.31), ball(0.04, 0xff4d6d, 0.2, 0.45, 0.31)];
      case 'm_jam': return [box(0.75, 0.5, 0.6, 0xb5844f, 0, 0.25, 0), box(0.6, 0.06, 0.06, 0xff6b6b, 0, 0.35, 0.31), cyl(0.25, 0.22, 0.35, 0xc0c6cc, 0, 0.68, 0, 10), cyl(0.22, 0.22, 0.03, 0xd63a5a, 0, 0.86, 0, 10), box(0.4, 0.04, 0.04, 0x3b3b4a, 0, 0.82, 0)];
      case 'm_kaese': return [cyl(0.35, 0.38, 0.7, WOOD, 0, 0.35, 0, 10), cyl(0.37, 0.37, 0.06, 0x3b3b4a, 0, 0.2, 0, 10), cyl(0.37, 0.37, 0.06, 0x3b3b4a, 0, 0.55, 0, 10), cyl(0.3, 0.3, 0.12, 0xffd23f, 0, 0.76, 0, 10), cyl(0.04, 0.04, 0.4, 0x3b3b4a, 0, 0.95, 0), box(0.35, 0.05, 0.05, 0x3b3b4a, 0, 1.15, 0)];
      case 'm_web': return [box(0.08, 1.0, 0.08, WOOD, -0.4, 0.5, -0.2), box(0.08, 1.0, 0.08, WOOD, 0.4, 0.5, -0.2), box(0.08, 0.6, 0.08, WOOD, -0.4, 0.3, 0.25), box(0.08, 0.6, 0.08, WOOD, 0.4, 0.3, 0.25),
        box(0.9, 0.08, 0.08, WOOD, 0, 1.0, -0.2), box(0.9, 0.08, 0.5, WOOD, 0, 0.6, 0.02), box(0.7, 0.4, 0.02, 0xb39cff, 0, 0.8, -0.2), box(0.7, 0.03, 0.4, 0xff8fab, 0, 0.65, 0.02)];
      case 'm_oel': return [box(0.7, 0.45, 0.7, 0x8a9aa8, 0, 0.22, 0), cyl(0.2, 0.25, 0.5, 0xffd23f, 0, 0.7, 0, 8), cyl(0.05, 0.05, 0.3, 0x3b3b4a, 0, 1.05, 0), box(0.6, 0.05, 0.05, 0x3b3b4a, 0, 1.2, 0, 0.6), box(0.15, 0.15, 0.1, 0xffb020, 0.2, 0.3, 0.36)];
    }
    return [box(0.5, 0.5, 0.5, 0xff00ff)];
  });
}

// ---------- Gebäude ----------
function house(l) {
  const w = [0, 4.4, 5, 5][l], d = 3.2, p = [], gl = [];
  const wall = 0xfff1dc, roofc = [0, 0xe5625e, 0xd9534f, 0x6c8ed9][l];
  p.push(box(w, 2.2, d, wall, 0, 1.1, -10.5), box(w + 0.2, 0.25, d + 0.2, 0xb9a48a, 0, 0.12, -10.5));
  p.push(roof(w + 0.6, 1.7, d + 0.8, roofc, 0, 2.2, -10.5));
  p.push(box(0.8, 1.3, 0.1, 0x9c5a32, 0, 0.65, -8.88), ball(0.05, 0xffd23f, 0.25, 0.65, -8.8));
  gl.push(box(0.7, 0.6, 0.06, 0, -1.4, 1.3, -8.88), box(0.7, 0.6, 0.06, 0, 1.4, 1.3, -8.88));
  p.push(box(0.8, 0.08, 0.1, 0xffffff, -1.4, 1.3, -8.84), box(0.08, 0.7, 0.1, 0xffffff, -1.4, 1.3, -8.84), box(0.8, 0.08, 0.1, 0xffffff, 1.4, 1.3, -8.84), box(0.08, 0.7, 0.1, 0xffffff, 1.4, 1.3, -8.84));
  p.push(box(0.5, 1.2, 0.5, 0xb05a4a, 1.3, 3.2, -11));
  if (l >= 2) {
    p.push(box(w, 0.12, 1.4, 0xc98d55, 0, 0.3, -8.2), box(0.1, 1.6, 0.1, 0xffffff, -w / 2 + 0.2, 1.1, -7.6), box(0.1, 1.6, 0.1, 0xffffff, w / 2 - 0.2, 1.1, -7.6), box(w + 0.2, 0.1, 1.6, roofc, 0, 1.9, -8.15, 0, 0.15));
    for (const x of [-1.4, 1.4]) { p.push(box(0.8, 0.15, 0.2, WOOD, x, 0.95, -8.78)); for (let i = 0; i < 4; i++) p.push(ball(0.06, [0xff6b8a, 0xffe066, 0xb39cff, 0xffffff][i], x - 0.3 + i * 0.2, 1.08, -8.75)); }
  }
  if (l >= 3) {
    p.push(cyl(0.75, 0.75, 3.8, 0xfff1dc, 1.8, 1.9, -10.6, 10), cone(1, 1.5, roofc, 1.8, 4.55, -10.6, 10), ball(0.12, 0xffd23f, 1.8, 5.35, -10.6));
    gl.push(box(0.4, 0.5, 0.06, 0, 1.8, 2.8, -9.86));
  }
  return [p, gl];
}

function coop(l) {
  if (!l) return [constructionSite(9, -6)];
  return [[
    box(2.4, 1.4, 2, 0xd9534f, 9, 0.7, -6.2), roof(2.8, 1, 2.4, 0x8a5a3a, 9, 1.4, -6.2), box(2.5, 0.1, 0.06, 0xffffff, 9, 1.38, -5.18),
    box(0.5, 0.6, 0.06, 0x5a3a24, 9, 0.35, -5.18), box(0.5, 0.06, 1, WOOD, 9, 0.15, -4.7, 0, 0.3),
    ball(0.12, 0xfff6dc, 8.3, 1.0, -5.15, 1, 1.3, 0.5), ...(l >= 2 ? [box(1.2, 1, 1.6, 0xd9534f, 10.6, 0.5, -6.2), roof(1.4, 0.7, 2, 0x8a5a3a, 10.6, 1, -6.2)] : []),
  ], [box(0.4, 0.3, 0.06, 0, 9.7, 0.95, -5.17)]];
}

function barn(l) {
  if (!l) return [constructionSite(9.5, 6)];
  const p = [
    box(3.6, 2.4, 2.8, 0xc8453f, 9.5, 1.2, 6), roof(4, 1.6, 3.2, 0x8f3d36, 9.5, 2.4, 6),
    box(1.4, 1.7, 0.08, 0xffffff, 9.5, 0.85, 7.42), box(1.2, 1.5, 0.08, 0xa63832, 9.5, 0.85, 7.45),
    box(1.6, 0.1, 0.1, 0xffffff, 9.5, 0.85, 7.5, 0, 0, 0.82), box(1.6, 0.1, 0.1, 0xffffff, 9.5, 0.85, 7.5, 0, 0, -0.82),
  ];
  if (l >= 2) p.push(cyl(0.7, 0.7, 3.4, 0xd7dde2, 12, 1.7, 5.8, 10), ball(0.7, 0x9aa8b5, 12, 3.4, 5.8, 1, 0.7, 1, 10));
  return [p, [box(0.6, 0.4, 0.06, 0, 9.5, 2.75, 7.42)]];
}

function constructionSite(x, z) {
  return [box(0.1, 0.8, 0.1, WOOD, x - 1, 0.4, z + 1), box(0.1, 0.8, 0.1, WOOD, x + 1, 0.4, z + 1), box(0.1, 0.8, 0.1, WOOD, x - 1, 0.4, z - 1), box(0.1, 0.8, 0.1, WOOD, x + 1, 0.4, z - 1),
    box(2.1, 0.06, 0.06, 0xffd23f, x, 0.6, z + 1), box(2.1, 0.06, 0.06, 0xffd23f, x, 0.6, z - 1), box(0.06, 0.06, 2.1, 0xffd23f, x - 1, 0.6, z), box(0.06, 0.06, 2.1, 0xffd23f, x + 1, 0.6, z),
    box(0.08, 1, 0.08, WOOD, x, 0.5, z + 1.3), box(0.7, 0.45, 0.05, 0xfff1dc, x, 1, z + 1.33)];
}

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

export function building(id, l) {
  const r = cached('bld' + id + l, () => {
    let parts, glow = [];
    if (id === 'house') [parts, glow] = house(l);
    else if (id === 'coop') [parts, glow = []] = coop(l);
    else if (id === 'barn') [parts, glow = []] = barn(l);
    else if (id === 'market') {
      parts = [box(2, 0.9, 0.8, 0xc98d55, -4.5, 0.45, -9), box(0.08, 2, 0.08, WOOD, -5.45, 1, -9.35), box(0.08, 2, 0.08, WOOD, -3.55, 1, -9.35), box(0.08, 2, 0.08, WOOD, -5.45, 1, -8.65), box(0.08, 2, 0.08, WOOD, -3.55, 1, -8.65)];
      for (let i = 0; i < 6; i++) parts.push(box(0.36, 0.08, 1.2, i % 2 ? 0xffffff : 0xff6b8a, -5.4 + i * 0.36 + 0.18, 2.05, -9, 0, 0.25));
      parts.push(box(0.4, 0.2, 0.3, WOOD, -5, 1, -9), ball(0.07, 0xff8a2a, -5.1, 1.15, -9), ball(0.07, 0xff8a2a, -4.95, 1.15, -8.95), box(0.4, 0.2, 0.3, WOOD, -4, 1, -9), ball(0.08, 0xff3b3b, -4.05, 1.15, -9), ball(0.08, 0x8fd694, -3.9, 1.15, -9.05));
    } else if (id === 'bench') {
      parts = [box(1.8, 0.12, 0.8, 0xc98d55, 5.5, 0.82, -10), ...[[4.75, -10.3], [6.25, -10.3], [4.75, -9.7], [6.25, -9.7]].map(([x, z]) => box(0.1, 0.8, 0.1, WOOD, x, 0.4, z)), box(1.6, 0.06, 0.6, 0xb5844f, 5.5, 0.3, -10),
        box(0.3, 0.12, 0.2, 0x8a9aa8, 5, 0.94, -10.1), cyl(0.02, 0.02, 0.35, WOOD, 5.6, 0.92, -9.9, 6, 0, 0, Math.PI / 2), box(0.08, 0.12, 0.05, 0x8a9aa8, 5.78, 0.92, -9.9),
        box(1.9, 0.9, 0.06, 0x9c6b3f, 5.5, 1.35, -10.42), ...[4.9, 5.3, 5.8, 6.15].map((x, i) => box(0.06, 0.3, 0.04, [0x8a9aa8, 0xd9534f, 0x7cc6e8, 0xffd23f][i], x, 1.45, -10.36)), box(0.4, 0.25, 0.3, 0xe0b07a, 6.05, 0.95, -9.95)];
    } else if (id === 'kitchen') {
      parts = [box(1.8, 0.85, 0.8, 0xfff1dc, -5.5, 0.42, -12), box(1.9, 0.08, 0.9, 0xb5844f, -5.5, 0.88, -12), cyl(0.08, 0.08, 1.4, 0x8a9aa8, -6.1, 1.5, -12.25, 8),
        cyl(0.18, 0.18, 0.05, 0x3b3b4a, -5.95, 0.93, -11.95, 12), cyl(0.18, 0.18, 0.05, 0x3b3b4a, -5.45, 0.93, -11.95, 12), cyl(0.15, 0.13, 0.18, 0xd63a5a, -5.95, 1.04, -11.95, 12), cyl(0.03, 0.03, 0.2, WOOD, -5.85, 1.12, -11.85, 5, 0.6),
        box(0.5, 0.35, 0.05, 0x9ad4ff, -5.0, 0.45, -11.58), box(0.3, 0.2, 0.25, 0xc98d55, -5.0, 1.02, -12.05), ball(0.06, 0xff3b3b, -5.05, 1.15, -12.0), ball(0.05, 0x8fd694, -4.95, 1.15, -12.08),
        box(2.1, 0.08, 1.2, 0xd9534f, -5.5, 2.1, -12.05, 0, 0.12), ...[[-6.45, -12.55], [-4.55, -12.55], [-6.45, -11.5], [-4.55, -11.5]].map(([x, z]) => box(0.08, 2.1, 0.08, WOOD, x, 1.05, z))];
      glow = [box(0.32, 0.08, 0.05, 0, -5.5, 0.35, -11.6)];
    } else if (id === 'mail') {
      parts = [box(0.08, 0.9, 0.08, WOOD, -2, 0.45, -8), box(0.36, 0.26, 0.5, l ? 0xd9534f : 0x6cc4ff, -2, 1.0, -8), cyl(0.18, 0.18, 0.5, l ? 0xd9534f : 0x6cc4ff, -2, 1.13, -8, 12, Math.PI / 2),
        box(0.02, 0.24, 0.06, 0xffd23f, -1.8, l ? 1.3 : 1.05, -7.85), box(0.12, 0.08, 0.02, 0xffd23f, -1.75, l ? 1.4 : 1.12, -7.85), box(0.3, 0.2, 0.02, 0x3b3b4a, -2, 1.0, -7.74)];
    } else if (id === 'bin') {
      parts = [box(0.9, 0.6, 0.7, 0xb5844f, 3, 0.3, -8), box(0.95, 0.12, 0.75, 0x8a5a3a, 3, 0.66, -8, 0, -0.15), box(0.92, 0.06, 0.72, 0x6e4a2a, 3, 0.3, -8), ball(0.08, 0xffd23f, 3, 0.4, -7.63, 1, 1, 0.4)];
    } else if (id === 'board') {
      parts = [box(0.1, 1.6, 0.1, WOOD, -7.5, 0.8, -8), box(0.1, 1.6, 0.1, WOOD, -6.5, 0.8, -8), box(1.2, 0.8, 0.08, 0xc98d55, -7, 1.2, -8), roof(1.4, 0.3, 0.4, 0xd9534f, -7, 1.6, -8),
        box(0.3, 0.35, 0.02, 0xffffff, -7.3, 1.2, -7.95), box(0.3, 0.3, 0.02, 0xfff3a8, -6.9, 1.25, -7.95), box(0.25, 0.3, 0.02, 0xffd0dc, -6.6, 1.15, -7.95)];
    }
    return [merge(parts), glow.length ? merge(glow) : null];
  });
  const g = new THREE.Group();
  const m = new THREE.Mesh(r[0], MAT);
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  if (r[1]) g.add(new THREE.Mesh(r[1], GLOW));
  return g;
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
    if (k < 0.45) p.push(cyl(0.12 * s, 0.18 * s, 1.2 * s, 0x7a4b2e, x, y + 0.6 * s, z, 6), cone(0.9 * s, 1.6 * s, 0x3f8f4a, x, y + 1.6 * s, z, 8), cone(0.7 * s, 1.3 * s, snow ? 0xdfeaf0 : 0x4fa85a, x, y + 2.3 * s, z, 8), cone(0.45 * s, 0.9 * s, snow ? 0xffffff : 0x5fb86a, x, y + 2.9 * s, z, 8));
    else if (k < 0.85) p.push(cyl(0.12 * s, 0.18 * s, 1 * s, 0x7a4b2e, x, y + 0.5 * s, z, 6), ball(0.8 * s, leaf, x, y + 1.4 * s, z, 1, 0.9, 1, 8), ball(0.5 * s, L[(i + 1) % 4], x + 0.3 * s, y + 1.75 * s, z + 0.2 * s, 1, 0.9, 1, 7));
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
