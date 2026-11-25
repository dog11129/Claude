// Bauplan aller Platzhalter-Modelle für den Nachbau in Blender (blender/remaster.py).
//   node tools/dump-models.mjs
// Jedes Bauteil wird als Grundform mit Maßen, Lage (3×4-Matrix im Spiel-Koordinatensystem, y = oben), Farbe und
// Leucht-Kennung gespeichert. Blender baut daraus dieselben Modelle in schöner: runde Kanten, mehr Segmente,
// weiche Schatten in den Vertex-Farben. Formen, die sich nicht als Grundform erkennen lassen (gebogene Stängel,
// ausgestanzte Sterne …), kommen als Dreiecke mit. Dazu die Liste, welches Modell welches Icon zeigt.
// Ergebnis: art/remaster/plan.json
import { writeFileSync, mkdirSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

globalThis.document ||= { createElement: () => ({ getContext: () => null }) };
globalThis.KUSCHEL_KEEP_PARTS = true; // models.js merkt sich die Bauteile jeder Geometrie
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const THREE = await import('../vendor/three.module.min.js');
const D = await import('../src/data.js');
const { FURNITURE } = await import('../src/furni-data.js');
const P = await import('../src/plants.js');
const F = await import('../src/furniture.js');
const IM = await import('../src/itemmodels.js');

// ---------- schon vorhandene Blender-Modelle ----------
function glbRoots(file) {
  const b = readFileSync(file), len = b.readUInt32LE(12), json = JSON.parse(b.subarray(20, 20 + len).toString('utf8'));
  return (json.scenes?.[json.scene || 0]?.nodes || []).map(i => json.nodes[i].name);
}
const HAVE = new Set(), OWN = new Set(['place2', 'furniture2', 'items2', 'crops2']); // OWN: die Pakete, die remaster.py selbst baut
const MODELS = join(ROOT, 'assets/models');
for (const f of readdirSync(MODELS).filter(f => f.endsWith('.glb') && !OWN.has(f.slice(0, -4)))) for (const n of glbRoots(join(MODELS, f))) HAVE.add(n);
const PLACE_ALIAS = { kuerbislaterne: 'lantern_pumpkin', schneemann: 'snowman', herzballon: 'heart_balloon', torte: 'cake', angelpokal: 'pokal', kaeferpokal: 'pokal', apfelbaum: 'ptree', orangenbaum: 'ptree', pfirsichbaum: 'ptree', kirschenbaum: 'ptree', birnbaum: 'ptree', mangobaum: 'ptree', bananenbaum: 'banana', lichterbaum: 'lichterbaum' };
// Diese zeigen im Spiel zusammengesetzte Modelle (Obst an der Krone, Eier im Nest) – Icon bleibt vom Spiel gerendert
const ICON_SKIP = new Set(['apfelbaum', 'orangenbaum', 'pfirsichbaum', 'kirschenbaum', 'birnbaum', 'mangobaum', 'bananenbaum', 'eiernest']);
const MODEL_SKIP = new Set(['eiernest']); // baut nature.js selbst zusammen (Nest + Eier aus Blender)

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
const stats = {};
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
function part(geo, c, Mw, glow) {
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
function dump(group) {
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
const sig = parts => JSON.stringify(parts);
const GLOW_C = 0xffe08a;

// ---------- alle Platzhalter einsammeln ----------
const models = [], NEW = new Set();
function add(pack, name, make) {
  if (HAVE.has(name) || MODEL_SKIP.has(name)) return null;
  let g = null;
  try { g = make(); } catch (e) { console.warn('übersprungen:', name, e.message); }
  if (!g) return null;
  const parts = dump(g);
  if (!parts.length) return null;
  models.push({ name, pack, parts });
  NEW.add(name);
  return parts;
}
for (const id of Object.keys(D.PLACE)) {
  const name = PLACE_ALIAS[id] || id;
  if (HAVE.has(name) || NEW.has(name)) continue;
  const a = add('place', name, () => P.placeable(id, false));
  if (!a) continue;
  let b = null;
  try { b = dump(P.placeable(id, true)); } catch { b = null; }
  if (b && sig(a) !== sig(b)) { models.push({ name: name + '_ready', pack: 'place', parts: b }); NEW.add(name + '_ready'); }
}
for (const id of Object.keys(FURNITURE)) add('furniture', id, () => F.makeFurniture(id));
for (const id of IM.ITEM_MODEL_IDS) if (D.ITEMS[id] && !id.startsWith('s_')) add('items', 'item_' + id, () => IM.itemModel(id));
for (const k of Object.keys(D.CROPS)) if (D.ITEMS['s_' + k]) add('items', 'item_s_' + k, () => IM.itemModel('s_' + k));
for (const [k] of Object.entries(D.CROPS)) for (const st of [1, 2, 3]) add('crops', `crop_${k}_${st}`, () => P.crop(k, st));

// ---------- Icons: welches Modell zeigt welchen Gegenstand (wie src/icons.js modelFor) ----------
const has = n => HAVE.has(n) || NEW.has(n);
const MAT_ASSET = { holz: 'ground_holz', ast: 'ground_ast', stein: 'ground_stein', lehm: 'ground_lehm', eisen: 'ground_eisen', flaschenpost: 'ground_bottle' };
const SHELLS = ['herzmuschel', 'jakobsmuschel', 'kauri', 'koralle', 'sanddollar', 'sternsplitter'];
const icons = [];
for (const [id, it] of Object.entries(D.ITEMS)) {
  if (ICON_SKIP.has(id)) continue;
  let m = null, side = false;
  if (has('item_' + id)) { m = 'item_' + id; side = !id.startsWith('s_'); }
  else if (it.furn) m = has(id) ? id : null;
  else if (it.place && D.PLACE[id]) { const n = PLACE_ALIAS[id] || id; m = has(n + '_ready') ? n + '_ready' : has(n) ? n : null; }
  else if (D.CROPS[id]) m = has(`crop_${id}_3`) ? `crop_${id}_3` : null;
  else if (has('fruit_' + id)) m = 'fruit_' + id;
  else if (SHELLS.includes(id)) m = has('shell_' + id) ? 'shell_' + id : null;
  else if (MAT_ASSET[id]) m = has(MAT_ASSET[id]) ? MAT_ASSET[id] : null;
  else if (id === 'unkraut') m = has('weed') ? 'weed' : null;
  if (m) icons.push({ id, m, side: side ? 1 : 0, own: HAVE.has(m) ? 0 : 1 });
}

const OUT = join(ROOT, 'art/remaster');
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'plan.json'), JSON.stringify({ version: 1, models, icons }));
const nparts = models.reduce((s, m) => s + m.parts.length, 0);
console.log(`art/remaster/plan.json: ${models.length} Modelle, ${nparts} Bauteile, ${icons.length} Icons`);
console.log(Object.entries(stats).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));
