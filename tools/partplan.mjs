// Bauteile (Grundformen aus models.js) in den Bauplan für blender/remaster.py umrechnen: Form, Maße, Lage
// (3×4-Matrix, Spiel-Koordinaten mit y = oben), Farbe, Leucht-Kennung; Unbekanntes als Dreiecke.
// Gemeinsam genutzt von tools/dump-models.mjs (Node) und tools/capture-world.py (im Browser).
import * as THREE from '../vendor/three.module.min.js';

// ---------- Bauteil erkennen ----------
const r4 = v => Math.round(v * 1e4) / 1e4;
const KNOWN = { BoxGeometry: 'box', SphereGeometry: 'sphere', CylinderGeometry: 'cyl', ConeGeometry: 'cone', TorusGeometry: 'torus',
  CircleGeometry: 'circle', PlaneGeometry: 'plane', LatheGeometry: 'lathe' }; // Kristalle (Okta-/Dodekaeder …) bleiben facettiert: als Dreiecke
const FLAT = new Set(['circle', 'plane']);

function fresh(type, params, soft) {
  if (type === 'LatheGeometry') return new THREE.LatheGeometry(params.points.map(p => new THREE.Vector2(p.x, p.y)), params.segments, params.phiStart, params.phiLength);
  const g = new THREE[type](...Object.values(params));
  if (soft) { const a = g.attributes.position.array; for (let i = 0; i < a.length; i++) a[i] = Math.sign(a[i]) * Math.abs(a[i]) ** soft; }
  return g;
}
// Affine Abbildung A (3×4) mit A·[p0, 1] = p1 für alle Punkte (kleinste Quadrate); null, wenn sie nicht passt
function affine(p0, p1, flat) {
  const n = p0.length / 3;
  if (n < 3 || p1.length !== p0.length) return null;
  const k = flat ? 3 : 4, row = i => (flat ? [p0[i * 3], p0[i * 3 + 1], 1] : [p0[i * 3], p0[i * 3 + 1], p0[i * 3 + 2], 1]);
  const A = Array.from({ length: k }, () => new Float64Array(k)), B = Array.from({ length: k }, () => new Float64Array(3));
  for (let i = 0; i < n; i++) {
    const x = row(i);
    for (let a = 0; a < k; a++) { for (let b = 0; b < k; b++) A[a][b] += x[a] * x[b]; for (let c = 0; c < 3; c++) B[a][c] += x[a] * p1[i * 3 + c]; }
  }
  for (let a = 0; a < k; a++) A[a][a] += 1e-12;
  // Gauß-Elimination
  for (let c = 0; c < k; c++) {
    let piv = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    if (Math.abs(A[piv][c]) < 1e-14) return null;
    [A[c], A[piv]] = [A[piv], A[c]]; [B[c], B[piv]] = [B[piv], B[c]];
    for (let r = 0; r < k; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let q = c; q < k; q++) A[r][q] -= f * A[c][q];
      for (let q = 0; q < 3; q++) B[r][q] -= f * B[c][q];
    }
  }
  const X = B.map((b, i) => [...b].map(v => v / A[i][i])); // k Zeilen × 3 Spalten
  let cols; // Spalten der 3×4-Matrix: x-, y-, z-Achse, Verschiebung
  if (flat) {
    const cx = X[0], cy = X[1], cz = [cx[1] * cy[2] - cx[2] * cy[1], cx[2] * cy[0] - cx[0] * cy[2], cx[0] * cy[1] - cx[1] * cy[0]];
    const l = Math.hypot(...cz) || 1, s = Math.sqrt(Math.hypot(...cx) * Math.hypot(...cy));
    cols = [cx, cy, cz.map(v => (v / l) * s), X[2]];
  } else cols = [X[0], X[1], X[2], X[3]];
  let ext = 0, err = 0;
  for (let i = 0; i < n; i++) {
    const x = p0[i * 3], y = p0[i * 3 + 1], z = flat ? 0 : p0[i * 3 + 2];
    for (let c = 0; c < 3; c++) {
      const v = cols[0][c] * x + cols[1][c] * y + cols[2][c] * z + cols[3][c];
      err = Math.max(err, Math.abs(v - p1[i * 3 + c]));
      ext = Math.max(ext, Math.abs(p1[i * 3 + c]));
    }
  }
  if (err > 2e-4 * (1 + ext)) return null;
  return [0, 1, 2].flatMap(r => cols.map(col => col[r])); // Zeilen-weise 3×4
}
const mul = (M, A) => { // 4×4 (three, spaltenweise) · 3×4 (zeilenweise) -> 3×4 zeilenweise
  const e = M.elements, out = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    let v = e[r + 12] * (c === 3 ? 1 : 0);
    for (let k = 0; k < 3; k++) v += e[r + k * 4] * A[k * 4 + c];
    out.push(v);
  }
  return out;
};
function args(type, p) {
  switch (type) {
    case 'box': return [p.width, p.height, p.depth];
    case 'sphere': return [p.radius, p.widthSegments, p.heightSegments, p.phiStart, p.phiLength, p.thetaStart, p.thetaLength];
    case 'cyl': return [p.radiusTop, p.radiusBottom, p.height, p.radialSegments, p.openEnded ? 1 : 0, p.thetaStart, p.thetaLength];
    case 'cone': return [0, p.radius, p.height, p.radialSegments, p.openEnded ? 1 : 0, p.thetaStart, p.thetaLength];
    case 'torus': return [p.radius, p.tube, p.radialSegments, p.tubularSegments, p.arc];
    case 'circle': return [p.radius, p.segments, p.thetaStart, p.thetaLength];
    case 'plane': return [p.width, p.height];
    case 'lathe': return [p.points.flatMap(q => [r4(q.x), r4(q.y)]), p.segments, p.phiStart, p.phiLength];
    default: return [];
  }
}
export const stats = {};
function raw(geo, Mw, c, glow) {
  const g = geo.index ? geo.toNonIndexed() : geo, a = g.attributes.position, v = [], vc = g.attributes.color && c == null ? [] : null, t = new THREE.Vector3();
  for (let i = 0; i < a.count; i++) {
    t.fromBufferAttribute(a, i).applyMatrix4(Mw);
    v.push(r4(t.x), r4(t.y), r4(t.z));
    if (vc) vc.push(...[0, 1, 2].map(k => Math.round(g.attributes.color.array[i * g.attributes.color.itemSize + k] * 255)));
  }
  stats.raw = (stats.raw || 0) + 1;
  return { t: 'raw', v, ...(vc ? { vc } : { c: c ?? 0xffffff }), ...(glow ? { g: 1 } : {}) };
}
export function part(geo, c, Mw, glow) {
  const src = geo.userData?.src, type = src?.[0] || geo.type, params = src?.[1] || geo.parameters, t = KNOWN[type], soft = geo.userData?.soft;
  if (t && params && !(soft && type !== 'SphereGeometry')) {
    try {
      let f = fresh(type, params, soft);
      let p0 = f.attributes.position.array;
      const p1 = geo.attributes.position.array;
      if (p0.length !== p1.length && f.index) p0 = f.toNonIndexed().attributes.position.array;
      const A = affine(p0, p1, FLAT.has(t));
      if (A) {
        const kind = soft ? 'soft' : t;
        const a = kind === 'soft' ? [soft, params.widthSegments, params.heightSegments] : args(t, params);
        stats[kind] = (stats[kind] || 0) + 1;
        return { t: kind, a: a.map(x => (Array.isArray(x) ? x : r4(x))), m: mul(Mw, A).map(r4), c, ...(glow ? { g: 1 } : {}) };
      }
      stats['fail:' + type + (soft ? ':soft' : '')] = (stats['fail:' + type + (soft ? ':soft' : '')] || 0) + 1;
    } catch (e) { stats['err:' + type] = (stats['err:' + type] || 0) + 1; }
  }
  return raw(geo, Mw, c, glow);
}
export function dump(group) {
  group.updateMatrixWorld(true);
  const inv = group.matrixWorld.clone().invert(), parts = [];
  group.traverse(o => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    const Mw = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld), glow = o.material?.type === 'MeshBasicMaterial';
    const ps = o.geometry.userData.parts;
    // Leuchtteile: im Spiel zeigt das Leucht-Material eine Einheitsfarbe; ohne eigene Farbe also warmes Lampengelb
    if (ps) for (const p of ps) parts.push(part(p.g, glow && !p.c ? GLOW_C : new THREE.Color(p.c).getHex(), Mw, glow));
    else parts.push(part(o.geometry, o.geometry.attributes.color ? null : (o.material?.color?.getHex() ?? 0xffffff), Mw, glow));
  });
  return parts;
}

// Teile-Listen (wie für models.js model()) direkt umrechnen; vc = Leuchtteile behalten ihre eigene Farbe
export function planParts(parts, glow = [], vc = false) {
  const I = new THREE.Matrix4(), out = [];
  for (const p of parts) if (p) out.push(part(p.g, new THREE.Color(p.c).getHex(), I, false));
  for (const p of glow) if (p) out.push(part(p.g, !vc || !p.c ? GLOW_C : new THREE.Color(p.c).getHex(), I, true));
  return out;
}
export const GLOW_C = 0xffe08a;
