// Alle 3D-Modelle, aus einfachen Formen zusammengesetzt (keine externen Dateien nötig).
// Jedes Modell wird zu EINER Geometrie mit Vertex-Farben verschmolzen -> wenig Draw-Calls, läuft flüssig auf dem Handy.
import * as THREE from '../vendor/three.module.min.js';

// Weicher Lichtsaum an den Rändern: lässt alles rund und kuschelig wirken
export function cozy(sh) {
  sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>',
    'outgoingLight += vec3(1.0, 0.96, 0.9) * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 3.0) * 0.2;\n#include <opaque_fragment>');
}
// "Rollende Welt": alles krümmt sich in der Ferne nach unten weg, wie auf einem Baumstamm.
// Gilt für alle Materialien (außer Schattenkarte und NO_CURVE), daher direkt im Shader-Baustein.
export const CURVE_K = 0.0078;
THREE.ShaderChunk.project_vertex = `vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
  mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
#if defined( DEPTH_PACKING ) || defined( NO_CURVE )
  mvPosition = modelViewMatrix * mvPosition;
#else
  vec4 cwp = modelMatrix * mvPosition;
  vec3 cfw = -vec3( viewMatrix[0][2], viewMatrix[1][2], viewMatrix[2][2] );
  vec2 cfh = normalize( cfw.xz + vec2( 1e-5 ) );
  float cD = cameraPosition.y * length( cfw.xz ) / max( -cfw.y, 0.08 );
  float cd = dot( cwp.xz - cameraPosition.xz, cfh ) - cD;
  cwp.y -= ${CURVE_K.toFixed(5)} * cd * cd * smoothstep( 0.25, 0.45, -cfw.y ); // flache Blicke (Editor, Vorschaubilder) bleiben gerade
  mvPosition = viewMatrix * cwp;
#endif
gl_Position = projectionMatrix * mvPosition;`;
// Dieselbe Krümmung in JS (für Beschriftungen und Antippen)
export function curveDrop(camera, x, z) {
  const e = camera.matrixWorld.elements, fx = -e[8], fy = -e[9], fz = -e[10], h = Math.hypot(fx, fz) || 1e-5;
  const D = camera.position.y * h / Math.max(-fy, 0.08), d = ((x - camera.position.x) * fx + (z - camera.position.z) * fz) / h - D;
  const t = Math.min(1, Math.max(0, (-fy - 0.25) / 0.2));
  return CURVE_K * d * d * t * t * (3 - 2 * t);
}
// Die Krümmung wirkt pro Eckpunkt: große Flächen müssen fein unterteilt sein, sonst kippen sie weg und
// "schwimmen" mit der Kamera. flat = Rechteck, disc = runde Scheibe mit Ringen (Abstand höchstens step).
export const flat = (w, d, step = 1.5) => new THREE.PlaneGeometry(w, d, Math.max(1, Math.ceil(w / step)), Math.max(1, Math.ceil(d / step)));
export const disc = (r, seg = 48, step = 1.5) => new THREE.RingGeometry(0, r, seg, Math.max(1, Math.ceil(r / step)));
// Beliebige Geometrie nachträglich unterteilen (längste Kante halbieren, bis alle Kanten ≤ max sind).
// xz: nur waagrechte Ausdehnung zählt (senkrechte Wände brauchen keine Unterteilung); m: Matrix für die Längenmessung
export function fine(geo, max = 1.5, xz = false, m = null, flatOnly = false) {
  const src = geo.index ? geo.toNonIndexed() : geo, names = ['position', ...Object.keys(src.attributes).filter(n => n !== 'position')];
  const A = names.map(n => src.attributes[n]), size = A.map(a => a.itemSize), out = A.map(() => []);
  const get = (a, i, k) => [a.getX, a.getY, a.getZ, a.getW][k].call(a, i);
  const vert = i => A.map((a, j) => Array.from({ length: size[j] }, (_, k) => get(a, i, k)));
  const P = new THREE.Vector3(), Q = new THREE.Vector3(), R = new THREE.Vector3();
  const lying = t => { P.fromArray(t[0][0]); Q.fromArray(t[1][0]); R.fromArray(t[2][0]); if (m) { P.applyMatrix4(m); Q.applyMatrix4(m); R.applyMatrix4(m); } return Math.abs(Q.sub(P).cross(R.sub(P)).normalize().y) >= 0.6; };
  const len = (a, b) => { P.fromArray(a[0]); Q.fromArray(b[0]); if (m) { P.applyMatrix4(m); Q.applyMatrix4(m); } return xz ? Math.hypot(P.x - Q.x, P.z - Q.z) : P.distanceTo(Q); };
  const mid = (a, b) => a.map((v, j) => v.map((x, k) => (x + b[j][k]) / 2));
  const stack = [];
  for (let i = 0; i + 2 < A[0].count; i += 3) stack.push([vert(i), vert(i + 1), vert(i + 2)]);
  let guard = 400000;
  while (stack.length && guard-- > 0) {
    const t = stack.pop(), e = [len(t[0], t[1]), len(t[1], t[2]), len(t[2], t[0])], k = e.indexOf(Math.max(...e));
    if (e[k] <= max || (flatOnly && !lying(t))) { for (const v of t) v.forEach((x, j) => out[j].push(...x)); continue; }
    const a = t[k], b = t[(k + 1) % 3], c = t[(k + 2) % 3], ab = mid(a, b);
    stack.push([a, ab, c], [ab, b, c]);
  }
  for (const t of stack) for (const v of t) v.forEach((x, j) => out[j].push(...x));
  const g = new THREE.BufferGeometry();
  names.forEach((n, j) => g.setAttribute(n, new THREE.Float32BufferAttribute(out[j], size[j])));
  if (g.attributes.normal) { const nr = g.attributes.normal; for (let i = 0; i < nr.count; i++) { P.fromBufferAttribute(nr, i).normalize(); nr.setXYZ(i, P.x, P.y, P.z); } }
  g.computeBoundingSphere();
  return g;
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
  if (globalThis.KUSCHEL_KEEP_PARTS) geo.userData.parts = parts.filter(Boolean); // für tools/dump-models.mjs (Blender-Nachbau)
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

// Wilde Bäume (Obst, Holz), Palmen und Felsen; left = wie oft man heute noch hacken kann, fruit/ready = Obst hängt dran
const FRUIT_COL = { apfel: 0xff3b3b, kirsche: 0xd8102c, orange: 0xffa21f, pfirsich: 0xffa98a, birne: 0xd6dc4a, kokosnuss: 0x8a5a36 };
export function wild(kind, season, left, fruit, ready) {
  return cachedModel('wild' + kind + season + (left > 0 ? 1 : 0) + (ready ? fruit : ''), () => {
    let seed = 9;
    const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    if (kind === 'rock') {
      const big = left > 0 ? 1 : 0.7;
      return [ball(0.5 * big, 0xa9a49c, 0, 0.22 * big, 0, 1.2, 0.85, 1.05, 12), ball(0.3 * big, 0xbdb8b0, 0.3, 0.16 * big, 0.2, 1, 0.8, 1, 10), ball(0.24 * big, 0x958f87, -0.32, 0.12 * big, 0.12, 1, 0.75, 1, 9),
        ...(season === 'winter' ? [ball(0.42 * big, 0xffffff, 0, 0.38 * big, 0, 1.15, 0.3, 1, 10)] : [ball(0.07, 0x7cc95a, -0.18, 0.4 * big, 0.22, 1.6, 0.5, 1)])];
    }
    if (kind === 'palm') {
      const p = [], snow = season === 'winter';
      let x = 0, y = 0, z = 0;
      for (let i = 0; i < 7; i++) { // leicht gebogener Stamm aus Ringen
        const nx = i * i * 0.012, ny = (i + 1) * 0.36;
        p.push(cyl(0.11 - i * 0.006, 0.13 - i * 0.006, 0.36, i % 2 ? 0xb88a56 : 0xa77b4a, nx, ny - 0.18, 0, 10, 0, 0, -i * 0.03));
        x = nx; y = ny;
      }
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2, L = 1.25;
        for (let k = 0; k < 5; k++) {
          const t = (k + 0.5) / 5, d = t * L, dy = 0.15 - t * t * 0.75;
          p.push(ball(0.22 * (1 - t * 0.5), snow ? 0xe8f0f2 : k % 2 ? 0x4fae46 : 0x5cbc4e, x + Math.cos(a) * d, y + dy, z + Math.sin(a) * d, 1.1, 0.22, 0.7, 7));
        }
      }
      p.push(ball(0.16, 0x6aa84a, x, y + 0.08, z, 1, 0.8, 1, 8));
      if (ready) for (let i = 0; i < 3; i++) { const a = i * 2.1; p.push(ball(0.12, 0x7a4e2e, x + Math.cos(a) * 0.15, y - 0.12, z + Math.sin(a) * 0.15, 1, 1, 1, 9)); }
      if (left <= 0) p.push(ball(0.1, 0xc9a46b, 0.25, 0.04, 0.3, 1.6, 0.4, 1));
      return p;
    }
    // runder, dichter Laubbaum mit kurzem Stamm
    const L = { spring: [0x6fcf5a, 0x86dc6a, 0x5bbf4e], summer: [0x4fb548, 0x62c654, 0x43a43f], autumn: [0xf2a23a, 0xe9822f, 0xf6c14a], winter: [0xeef4f8, 0xffffff, 0xe2ecf2] }[season];
    const p = [cyl(0.14, 0.2, 0.9, 0x8a5a36, 0, 0.45, 0, 10), ball(0.24, 0x8a5a36, 0, 0.04, 0, 1.2, 0.25, 1.2, 9)];
    p.push(ball(0.95, L[0], 0, 1.55, 0, 1, 0.92, 1, 14));
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2 + r(), e = (r() - 0.35) * 1.2, R = 0.78;
      p.push(ball(0.42 + r() * 0.12, L[i % 3], Math.cos(a) * Math.cos(e) * R, 1.55 + Math.sin(e) * R * 0.85, Math.sin(a) * Math.cos(e) * R, 1, 0.9, 1, 10));
    }
    p.push(ball(0.45, L[1], 0, 2.35, 0, 1, 0.8, 1, 10));
    if (ready && season !== 'winter') {
      const c = FRUIT_COL[fruit] || 0xff3b3b;
      for (const [a, e] of [[0.3, 0.1], [1.5, -0.1], [2.6, 0.25], [3.7, -0.05], [4.9, 0.2], [5.7, -0.2]]) {
        const R = 1.05, fx = Math.cos(a) * Math.cos(e) * R, fy = 1.55 + Math.sin(e) * R * 0.8, fz = Math.sin(a) * Math.cos(e) * R;
        p.push(ball(fruit === 'kirsche' ? 0.09 : 0.13, c, fx, fy, fz, 1, fruit === 'birne' ? 1.3 : 0.95, 1, 9));
        if (fruit === 'kirsche') p.push(ball(0.09, c, fx + 0.1, fy - 0.03, fz, 1, 1, 1, 8));
      }
    }
    if (left <= 0) p.push(ball(0.1, 0xc9a46b, 0.3, 0.06, 0.45, 1.6, 0.4, 1), ball(0.08, 0xc9a46b, -0.35, 0.05, 0.4, 1.6, 0.4, 1));
    return p;
  });
}
// Muschel am Strand (5 Formen) und Unkraut
export function shell(kind) {
  return cachedModel('shell' + kind, () => {
    if (kind === 'sternsplitter') return [0, 1, 2, 3, 4].map(i => { const a = i / 5 * Math.PI * 2; return cone(0.06, 0.18, 0xffe36b, Math.sin(a) * 0.08, 0.04, Math.cos(a) * 0.08, 5, Math.PI / 2, a, 0); }).concat([ball(0.08, 0xfff3a8, 0, 0.04, 0, 1, 0.6, 1, 8)]);
    if (kind === 'koralle') return [cyl(0.03, 0.04, 0.2, 0xff6f7d, 0, 0.1, 0, 6), cyl(0.025, 0.03, 0.14, 0xff8a95, 0.06, 0.12, 0, 6, 0, 0, -0.6), cyl(0.025, 0.03, 0.14, 0xff8a95, -0.06, 0.12, 0.02, 6, 0, 0, 0.6), ball(0.03, 0xff9aa5, 0, 0.21, 0, 1, 1, 1, 6)];
    if (kind === 'sanddollar') return [cyl(0.13, 0.13, 0.03, 0xf3e3c3, 0, 0.02, 0, 14), ball(0.02, 0xe0caa0, 0, 0.04, 0, 1, 0.3, 1, 6)];
    if (kind === 'kauri') return [ball(0.1, 0xf7e7d6, 0, 0.05, 0, 1.3, 0.7, 0.9, 10), box(0.12, 0.01, 0.015, 0xb89a7a, 0, 0.11, 0)];
    if (kind === 'jakobsmuschel') return [cone(0.15, 0.04, 0xffb98a, 0, 0.03, 0, 9, 0, 0, 0), ball(0.04, 0xff9f6b, 0, 0.03, -0.14, 1.4, 0.5, 0.6, 6)];
    return [ball(0.12, 0xffd1dc, 0, 0.04, 0, 1, 0.45, 1.1, 10), ball(0.035, 0xffbccb, 0, 0.04, -0.12, 1.3, 0.6, 0.6, 6)];
  });
}
export function weed() {
  return cachedModel('weed', () => {
    const p = [];
    for (let i = 0; i < 7; i++) { const a = i * 0.9; p.push(cone(0.05, 0.3 + (i % 3) * 0.06, i % 2 ? 0x4e9e3a : 0x63b247, Math.cos(a) * 0.08, 0.14, Math.sin(a) * 0.08, 4, Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35)); }
    p.push(ball(0.04, 0xffffff, 0.06, 0.3, 0.02, 1, 1, 1, 5), ball(0.035, 0xfff3a0, -0.05, 0.26, -0.04, 1, 1, 1, 5));
    return p;
  });
}
export function digMark() {
  return cachedModel('dig', () => [0, 1, 2, 3, 4].map(i => { const a = i / 5 * Math.PI * 2; return box(0.07, 0.02, 0.3, 0x5e3f24, Math.sin(a) * 0.13, 0.012 + i * 0.001, Math.cos(a) * 0.13, a); })
    .concat([ball(0.06, 0x6e4a2a, 0, 0.015, 0, 1, 0.3, 1, 7)]));
}

// ---------- Landschaft (einmal gebaut, ein einziger Draw-Call) ----------
// Farben der Landschaft je Jahreszeit
const LEAVES = {
  spring: [0xffb7d0, 0xffc8dc, 0x7fd06a, 0x8fdc72], summer: [0x5fb84a, 0x6cc455, 0x4fae46, 0xffb7d0],
  autumn: [0xf0a040, 0xd9583a, 0xf2c94c, 0xe07b39], winter: [0xeef4f8, 0xe2ecf2, 0xf6fafc, 0xdde8ef],
};
export function scenery(isFree, h = () => 0, season = 'summer', plateau = () => false) {
  const p = [], L = LEAVES[season], snow = season === 'winter';
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // Wald oben auf den Klippen
  for (let i = 0; i < 1400 && p.length < 900; i++) {
    const x = (rand() - 0.5) * 50, z = -14 - rand() * 12;
    if (!plateau(x, z) || !plateau(x, z + 1.4) || Math.abs(x - (6.6 + 2.6 * Math.sin(z * 0.2 + 0.5))) < 1.8) continue;
    const s = 0.85 + rand() * 0.6, y = h(x, z) - 0.05, k = rand(), leaf = L[Math.floor(rand() * 4)];
    if (k < 0.45) p.push(cyl(0.12 * s, 0.18 * s, 1.0 * s, 0x7a4b2e, x, y + 0.5 * s, z, 7), cone(0.95 * s, 1.5 * s, 0x3f8f4a, x, y + 1.4 * s, z, 12), cone(0.72 * s, 1.2 * s, snow ? 0xdfeaf0 : 0x4a9f55, x, y + 2.0 * s, z, 12), cone(0.45 * s, 0.9 * s, snow ? 0xffffff : 0x5cb566, x, y + 2.55 * s, z, 10));
    else if (k < 0.9) p.push(cyl(0.12 * s, 0.18 * s, 0.9 * s, 0x7a4b2e, x, y + 0.45 * s, z, 7), ball(0.85 * s, leaf, x, y + 1.4 * s, z, 1, 0.9, 1, 12), ball(0.5 * s, L[(i + 1) % 4], x + 0.4 * s, y + 1.65 * s, z + 0.2 * s, 1, 0.9, 1, 10), ball(0.45 * s, L[(i + 2) % 4], x - 0.4 * s, y + 1.55 * s, z - 0.15 * s, 1, 0.9, 1, 10));
    else p.push(ball(0.5 * s, snow ? 0xe6eef3 : 0x4fa85a, x, y + 0.3 * s, z, 1.3, 0.8, 1.1, 8));
  }
  // Grasbüschel und kleine Wildblumen auf dem Rasen
  for (let i = 0; i < (snow ? 0 : 700); i++) {
    const x = (rand() - 0.5) * 44, z = (rand() - 0.5) * 40;
    if (!isFree(Math.round(x), Math.round(z))) continue;
    if (rand() < 0.8) p.push(cone(0.06, 0.22, rand() < 0.5 ? 0x6fc45a : 0x5aa94a, x, 0.1, z, 4), cone(0.05, 0.18, 0x7fd06a, x + 0.08, 0.08, z + 0.05, 4));
    else p.push(cyl(0.01, 0.01, 0.2, GREEN, x, 0.1, z, 3), ball(0.05, [0xff8fab, 0xffffff, 0xffe066, 0xb39cff][Math.floor(rand() * 4)], x, 0.22, z, 1, 0.7, 1, 5));
  }
  // Steine am Teich
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2;
    p.push(ball(0.25 + (i % 3) * 0.08, 0x9a958e, -15 + Math.cos(a) * 2.45, 0.02, -4 + Math.sin(a) * 2.45, 1, 0.5, 1, 6));
  }
  p.push(cyl(0.3, 0.3, 0.03, 0x4fae4a, -14.2, -0.13, -3.4, 8), cyl(0.25, 0.25, 0.03, 0x4fae4a, -15.8, -0.13, -4.6, 8), ball(0.07, 0xffb7d0, -14.2, -0.08, -3.4));
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

// Geschenkballon: drei bunte Ballons mit Päckchen
export function balloon() {
  return cachedModel('balloon', balloonParts);
}
function balloonParts() {
  {
    const p = [];
    [[0xff5d7a, -0.28, 0.75, 0], [0x6cc4ff, 0.28, 0.8, 0.05], [0xffd23f, 0, 1.05, -0.1]].forEach(([c, x, y, z]) => p.push(ball(0.32, c, x, y, z, 1, 1.18, 1, 12), cone(0.06, 0.08, c, x, y - 0.4, z, 6, Math.PI), cyl(0.006, 0.006, y - 0.25, 0xffffff, x * 0.5, (y - 0.4) / 2 + 0.05, z * 0.5, 3)));
    p.push(box(0.36, 0.3, 0.36, 0xff8fab, 0, -0.15, 0), box(0.38, 0.06, 0.08, 0xffffff, 0, -0.15, 0), box(0.08, 0.31, 0.38, 0xffffff, 0, -0.15, 0), ball(0.07, 0xffffff, -0.05, 0.03, 0, 1, 0.7, 1, 6), ball(0.07, 0xffffff, 0.05, 0.03, 0, 1, 0.7, 1, 6));
    return p;
  }
}

// Gegenstände, die auf dem Boden liegen (eigene, einfache Formen): Obst, Äste, Holz, Steine, Geldsack, Geschenk, Blatt (Möbel), Flaschenpost
const GROUND_FRUIT = { apfel: 0xff3b3b, kirsche: 0xd8102c, orange: 0xffa21f, pfirsich: 0xffa98a, birne: 0xd6dc4a, kokosnuss: 0x7a4e2e };
export function groundItem(kind) {
  return cachedModel('g' + kind, () => groundParts(kind));
}
export const GROUND_KINDS = [...Object.keys(GROUND_FRUIT), 'ast', 'holz', 'stein', 'lehm', 'eisen', 'money', 'present', 'bottle', 'diy', 'leaf'];
// Für den Blender-Export (tools/dump-shapes.mjs)
export const __parts = { groundParts: k => groundParts(k), balloonParts: () => balloonParts() };
function groundParts(kind) {
  {
    if (GROUND_FRUIT[kind]) {
      const c = GROUND_FRUIT[kind];
      if (kind === 'kirsche') return [ball(0.09, c, -0.06, 0.09, 0, 1, 1, 1, 9), ball(0.09, c, 0.07, 0.09, 0.02, 1, 1, 1, 9), cyl(0.008, 0.008, 0.16, 0x5a8a3a, 0, 0.22, 0, 4, 0, 0, 0.3)];
      return [ball(kind === 'kokosnuss' ? 0.17 : 0.15, c, 0, 0.14, 0, 1, kind === 'birne' ? 1.25 : 0.95, 1, 11), cyl(0.012, 0.015, 0.07, 0x6b4a2a, 0, 0.3, 0, 5), ball(0.05, 0x6cc04a, 0.05, 0.3, 0, 1.6, 0.4, 0.8, 6)];
    }
    if (kind === 'ast') return [cyl(0.03, 0.04, 0.6, 0x8a5a36, 0, 0.04, 0, 6, 0, 0, Math.PI / 2), cyl(0.02, 0.025, 0.22, 0x8a5a36, 0.12, 0.06, 0.08, 5, 0, -0.8, Math.PI / 2), ball(0.05, 0x6cc04a, -0.25, 0.06, 0, 1.4, 0.5, 1, 6)];
    if (kind === 'holz') return [cyl(0.12, 0.12, 0.5, 0xa8743f, 0, 0.12, 0, 10, 0, 0, Math.PI / 2), cyl(0.1, 0.1, 0.51, 0xe8c48e, 0, 0.12, 0, 10, 0, 0, Math.PI / 2), cyl(0.12, 0.12, 0.48, 0xa8743f, 0, 0.12, 0, 10, 0, 0, Math.PI / 2)];
    if (kind === 'stein' || kind === 'lehm' || kind === 'eisen') {
      const c = kind === 'stein' ? 0x9a958e : kind === 'lehm' ? 0xc07a4e : 0x7d8694;
      return [ball(0.16, c, 0, 0.1, 0, 1.2, 0.7, 1, 6), ...(kind === 'eisen' ? [ball(0.05, 0xdfe6ee, 0.06, 0.18, 0.05, 1, 1, 1, 5)] : [])];
    }
    if (kind === 'money') return [ball(0.2, 0xd8b27a, 0, 0.18, 0, 1, 1.05, 1, 10), cyl(0.06, 0.09, 0.08, 0xc89a5e, 0, 0.38, 0, 8), ball(0.08, 0xffd23f, 0, 0.18, 0.18, 1, 1, 0.3, 10), box(0.2, 0.03, 0.03, 0xa8743f, 0, 0.35, 0)];
    if (kind === 'present') return [box(0.34, 0.28, 0.34, 0xff8fab, 0, 0.14, 0), box(0.36, 0.06, 0.08, 0xffffff, 0, 0.14, 0), box(0.08, 0.29, 0.36, 0xffffff, 0, 0.14, 0), ball(0.07, 0xffffff, -0.06, 0.31, 0, 1, 0.6, 1, 6), ball(0.07, 0xffffff, 0.06, 0.31, 0, 1, 0.6, 1, 6)];
    if (kind === 'bottle') return [cyl(0.08, 0.08, 0.32, 0xbfe8d8, 0, 0.08, 0, 10, 0, 0, Math.PI / 2 - 0.15), cyl(0.035, 0.05, 0.1, 0xbfe8d8, 0.2, 0.11, 0, 8, 0, 0, Math.PI / 2 - 0.15), cyl(0.03, 0.03, 0.05, 0xa8743f, 0.26, 0.12, 0, 6, 0, 0, Math.PI / 2), box(0.18, 0.08, 0.02, 0xfff3dc, -0.02, 0.09, 0)];
    if (kind === 'diy') return [box(0.36, 0.02, 0.26, 0xfff3dc, 0, 0.02, 0), box(0.2, 0.025, 0.03, 0xe0605a, 0, 0.03, -0.05), box(0.24, 0.025, 0.02, 0x8fd694, 0, 0.03, 0.04)];
    // Blatt: Platzhalter für Möbel & Deko
    const p = [ball(0.2, 0x7ccf5a, 0, 0.06, 0, 1.25, 0.22, 0.75, 10), ball(0.12, 0x9fdc7a, 0.06, 0.08, 0, 1.2, 0.18, 0.6, 8), cyl(0.012, 0.012, 0.32, 0x4f9a3a, 0, 0.09, 0, 4, 0, 0, Math.PI / 2)];
    return p;
  }
}
