// Inselleben 14 „Lieblingsplätze“ – nur Anzeige: Wege mit runden Ecken, selbst geformtes Gelände (Wasser, Hügel),
// Lichtkreise unter Laternen, Liebesschlösser an der Brücke, Schneemänner, der Hase, der Salon-Stand und die Hausfassade.
import * as THREE from '../vendor/three.module.min.js';
import * as M from './models.js';
import { PLACE } from './data.js';
import { STREET, zoneOf } from './newleaf.js';
import { BRIDGE_W, BRIDGE_HALF, riverX } from './island.js';
import * as E from './extras14.js';
import { rabbitBowParts, lockParts, kranzParts, BLEND_14, FACADE_NAME, facadeParts } from './models-14.js';
import { model as asset } from './assets.js';

// Benanntes Stück: Blender-Fassung, wenn es sie gibt, sonst die Grundformen aus models-14.js
function am(name, shadow = false) {
  const own = asset(name);
  if (own) { own.traverse(o => { if (o.isMesh) o.castShadow = shadow && !o.name.includes('__glow'); }); return own; }
  const [p, g] = BLEND_14[name](), m = M.model(p, g, false);
  if (shadow) m.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return m;
}

// ---------- Kacheln mit runden Ecken und Rand (Wege, Wasser) ----------
// aEdge je Kachel: offen nach Norden (−z), Osten (+x), Süden (+z), Westen (−x). An offenen Ecken wird rund ausgeschnitten.
const EDGE_GLSL = rim => `{
  vec2 q = vPUv; float R = 0.3, d = 1.0;
  if (vEdge.x > 0.5) d = min(d, 1.0 - q.y);
  if (vEdge.y > 0.5) d = min(d, 1.0 - q.x);
  if (vEdge.z > 0.5) d = min(d, q.y);
  if (vEdge.w > 0.5) d = min(d, q.x);
  if (vEdge.x > 0.5 && vEdge.y > 0.5 && q.x > 1.0 - R && q.y > 1.0 - R) d = R - distance(q, vec2(1.0 - R));
  if (vEdge.y > 0.5 && vEdge.z > 0.5 && q.x > 1.0 - R && q.y < R) d = R - distance(q, vec2(1.0 - R, R));
  if (vEdge.z > 0.5 && vEdge.w > 0.5 && q.x < R && q.y < R) d = R - distance(q, vec2(R));
  if (vEdge.w > 0.5 && vEdge.x > 0.5 && q.x < R && q.y > 1.0 - R) d = R - distance(q, vec2(R, 1.0 - R));
  if (d < 0.0) discard;
  ${rim === 'shore' ? 'diffuseColor.rgb = mix(vec3(0.93, 0.85, 0.64), diffuseColor.rgb, smoothstep(0.04, 0.15, d));' : 'diffuseColor.rgb *= mix(0.8, 1.0, smoothstep(0.0, 0.09, d));'}
}`;
export function edgeMesh(map, max, rim = 'dark') {
  const geo = new THREE.PlaneGeometry(1.04, 1.04);
  geo.rotateX(-Math.PI / 2);
  geo.setAttribute('aEdge', new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4));
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, map });
  mat.onBeforeCompile = sh => {
    sh.vertexShader = 'attribute vec4 aEdge;\nvarying vec4 vEdge;\nvarying vec2 vPUv;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvEdge = aEdge; vPUv = uv;');
    sh.fragmentShader = 'varying vec4 vEdge;\nvarying vec2 vPUv;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n' + EDGE_GLSL(rim));
  };
  mat.customProgramCacheKey = () => 'edge14' + rim;
  const m = new THREE.InstancedMesh(geo, mat, max);
  m.count = 0; m.receiveShadow = true; m.frustumCulled = false;
  return m;
}
// i-te Kachel eintragen: has(x, z) sagt, ob dort dieselbe Fläche weitergeht
export function edgeSet(m, i, x, z, has) { m.geometry.attributes.aEdge.setXYZW(i, has(x, z - 1) ? 0 : 1, has(x + 1, z) ? 0 : 1, has(x, z + 1) ? 0 : 1, has(x - 1, z) ? 0 : 1); }
export const PATH_PAINT_14 = {
  kies: (g, r) => { g.fillStyle = '#d6d0c6'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 260; i++) { g.fillStyle = `hsl(${30 + r() * 12} ${6 + r() * 8}% ${70 + r() * 22}%)`; g.beginPath(); g.ellipse(r() * 128, r() * 128, 2 + r() * 3, 1.6 + r() * 2.4, r() * 3, 0, 7); g.fill(); } },
  sandstein: (g, r) => { g.fillStyle = '#c9b182'; g.fillRect(0, 0, 128, 128); for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = `hsl(40 52% ${72 + r() * 10}%)`; g.beginPath(); g.roundRect(x * 64 + 3, y * 64 + 3, 58, 58, 7); g.fill(); g.fillStyle = 'rgba(160,120,60,.18)'; for (let i = 0; i < 5; i++) g.fillRect(x * 64 + 8 + r() * 44, y * 64 + 8 + r() * 44, 6, 2); } },
  kopfstein: (g, r) => { g.fillStyle = '#7f7a74'; g.fillRect(0, 0, 128, 128); for (let y = 0; y < 6; y++) for (let x = -1; x < 6; x++) { g.fillStyle = `hsl(28 5% ${58 + r() * 20}%)`; g.beginPath(); g.ellipse(x * 21.3 + (y % 2) * 10.6 + 10.6, y * 21.3 + 10.6, 9.4, 9.4, 0, 0, 7); g.fill(); } },
  mosaik: (g, r) => { g.fillStyle = '#fbeef2'; g.fillRect(0, 0, 128, 128); for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { const cx = x * 64 + 32, cy = y * 64 + 32, c = ['#ff9ab8', '#b39cff', '#ffc86b', '#8fd4c8'][(x + y * 2 + (r() * 4 | 0)) % 4];
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; g.fillStyle = c; g.beginPath(); g.ellipse(cx + Math.cos(a) * 13, cy + Math.sin(a) * 13, 9, 6, a, 0, 7); g.fill(); } g.fillStyle = '#ffe36b'; g.beginPath(); g.arc(cx, cy, 6, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(200,160,180,.5)'; for (let i = 0; i < 4; i++) { g.fillRect(i * 64 - 1, 0, 2, 128); g.fillRect(0, i * 64 - 1, 128, 2); } },
};

const mesh = (parts, glow) => { const g = M.model(parts, glow || [], false); return g; };
const GRASS = { spring: 0x9fdc7c, summer: 0x8fd36c, autumn: 0xcdb866, winter: 0xf4f8fb };
const EARTH = 0xb98d5e, EARTH_D = 0x9a7248;

// ---------- Gelände ----------
function hillGeo(T, season) {
  const pos = [], col = [], nor = [], top = new THREE.Color(GRASS[season] || GRASS.summer), rim = top.clone().multiplyScalar(0.88), e1 = new THREE.Color(EARTH), e2 = new THREE.Color(EARTH_D), H = E.HILL_H;
  const quad = (pts, n, cols) => { for (const i of [0, 1, 2, 0, 2, 3]) { pos.push(...pts[i]); col.push(cols[i].r, cols[i].g, cols[i].b); nor.push(...n); } };
  const hill = (x, z) => T[x + ',' + z] === 'h';
  // Seitenwand von a nach b (Kachelrand), n zeigt nach außen; oben ein dunklerer Grasrand
  const side = (a, b, n) => {
    quad([[a[0], H, a[1]], [a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], H, b[1]]], n, [e1, e2, e2, e1]);
    const o = [n[0] * 0.012, n[2] * 0.012];
    quad([[a[0] + o[0], H, a[1] + o[1]], [a[0] + o[0], H - 0.1, a[1] + o[1]], [b[0] + o[0], H - 0.1, b[1] + o[1]], [b[0] + o[0], H, b[1] + o[1]]], n, [rim, rim, rim, rim]);
  };
  for (const k of Object.keys(T)) {
    if (T[k] !== 'h') continue;
    const [x, z] = k.split(',').map(Number), x0 = x - 0.5, x1 = x + 0.5, z0 = z - 0.5, z1 = z + 0.5;
    quad([[x0, H, z1], [x1, H, z1], [x1, H, z0], [x0, H, z0]], [0, 1, 0], [top, top, top, top]);
    if (!hill(x, z + 1)) side([x0, z1], [x1, z1], [0, 0, 1]);
    if (!hill(x, z - 1)) side([x1, z0], [x0, z0], [0, 0, -1]);
    if (!hill(x + 1, z)) side([x1, z1], [x1, z0], [1, 0, 0]);
    if (!hill(x - 1, z)) side([x0, z0], [x0, z1], [-1, 0, 0]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return g;
}
const h2 = (x, z) => { let h = Math.imul(x * 374761393 + z * 668265263, 1274126177); return ((h ^ (h >>> 15)) >>> 0) / 4294967296; };
function syncTerra(w, s) {
  const T = s.terra || {};
  let hsh = 0, cnt = 0; // billige Prüfsumme statt JSON – das läuft jeden Frame
  for (const k in T) { cnt++; for (let i = 0; i < k.length; i++) hsh = (hsh * 31 + k.charCodeAt(i)) | 0; hsh = (hsh * 31 + (T[k] === 'w' ? 7 : 13) + (s.obj[k] ? 3 : 0)) | 0; }
  const sig = cnt + '|' + hsh + '|' + w.season;
  if (w.terraSig === sig) return;
  w.terraSig = sig;
  if (!w.terraWater) {
    const map = w.detailTex((g, r) => { g.fillStyle = '#6fc3ee'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(255,255,255,${0.12 + r() * 0.2})`; g.lineWidth = 1.5; g.beginPath(); const x = r() * 128, y = r() * 128; g.moveTo(x, y); g.quadraticCurveTo(x + 9, y - 3, x + 18, y); g.stroke(); } }, [1, 1]);
    w.terraWater = edgeMesh(map, E.TERRA_MAX, 'shore');
    w.terraWater.position.y = 0.022;
    w.scene.add(w.terraWater);
  }
  w.terraWater.material.color.set(w.season === 'winter' ? 0xe4f3ff : 0xffffff);
  let n = 0;
  const pads = [], has = (x, z) => T[x + ',' + z] === 'w';
  for (const [k, t] of Object.entries(T)) {
    if (t !== 'w' || n >= E.TERRA_MAX) continue;
    const [x, z] = k.split(',').map(Number);
    w.m4.makeTranslation(x, 0, z);
    w.terraWater.setMatrixAt(n, w.m4);
    edgeSet(w.terraWater, n++, x, z, has);
    const r = h2(x, z);
    if (r < 0.3 && w.season !== 'winter' && !s.obj[k]) { const px = x + (h2(z, x) - 0.5) * 0.4, pz = z + (h2(x + 7, z) - 0.5) * 0.4; pads.push(M.cyl(0.17, 0.17, 0.012, 0x4fa156, px, 0.035, pz, 9)); if (r < 0.12) pads.push(M.ball(0.06, 0xffb7c8, px, 0.07, pz, 1, 0.7, 1, 7), M.ball(0.025, 0xffe066, px, 0.1, pz)); }
  }
  w.terraWater.count = n; w.terraWater.instanceMatrix.needsUpdate = true; w.terraWater.geometry.attributes.aEdge.needsUpdate = true;
  for (const key of ['terraHill', 'terraPads']) if (w[key]) { w.scene.remove(w[key]); w[key].traverse?.(o => o.geometry?.dispose?.()); w[key] = null; }
  if (Object.values(T).includes('h')) { w.terraHill = new THREE.Mesh(hillGeo(T, w.season), M.MAT); w.terraHill.castShadow = w.terraHill.receiveShadow = true; w.scene.add(w.terraHill); }
  if (pads.length) { w.terraPads = mesh(pads); w.scene.add(w.terraPads); }
}

// ---------- Lichtkreise unter Laternen ----------
function updateLights(w, night) {
  if (!w.light14) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    if (g) { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,226,160,1)'); gr.addColorStop(0.45, 'rgba(255,210,130,.45)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }
    const geo = new THREE.CircleGeometry(1, 20); geo.rotateX(-Math.PI / 2);
    w.light14 = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }), 160);
    w.light14.frustumCulled = false; w.light14.count = 0; w.light14.renderOrder = 2;
    w.scene.add(w.light14);
  }
  const L = w.light14, on = night > 0.04 && (w.lanterns?.length || 0) > 0;
  L.visible = on;
  if (!on) return;
  L.material.opacity = Math.min(0.6, night * 0.75);
  let n = 0;
  const sc = new THREE.Vector3(), q = new THREE.Quaternion(), p = new THREE.Vector3();
  for (const e of w.lanterns) {
    if (n >= 160) break;
    const r = PLACE[e.k]?.light || 1.5;
    w.m4.compose(p.set(e.x, (e.m?.position.y || 0) + 0.04, e.z), q, sc.set(r, 1, r));
    L.setMatrixAt(n++, w.m4);
  }
  L.count = n; L.instanceMatrix.needsUpdate = true;
}

// ---------- Liebesschlösser ----------
function syncLocks(w, s) {
  const L = s.locks || [], sig = L.map(l => l.c).join('');
  if (w.lockSig === sig) return;
  w.lockSig = sig;
  if (w.lockM) { w.scene.remove(w.lockM); w.lockM = null; }
  if (!L.length) return;
  const parts = [], b = E.LOCK_BRIDGE, x0 = riverX(b), len = BRIDGE_HALF * 2;
  L.forEach((l, i) => {
    const side = i % 2 ? 1 : -1, t = ((i >> 1) + 0.5) / 30 - 0.5, x = x0 + t * len * 0.92, y = 0.44 + Math.cos(t * Math.PI) * 0.12 + ((i >> 1) % 3) * 0.035, z = b + side * (BRIDGE_W - 0.05) + side * 0.055;
    for (const q of lockParts(E.LOCK_COLORS[l.c][1])) { if (side < 0) q.g.rotateY(Math.PI); q.g.rotateZ(((i * 37) % 9 - 4) * 0.04); q.g.translate(x, y, z); parts.push(q); }
  });
  w.lockM = mesh(parts);
  w.scene.add(w.lockM);
}

// ---------- Schneemänner & Schneehaufen ----------
function syncSnow(w, s) {
  const sig = JSON.stringify([s.snowmen || {}, s.snowpiles || []]);
  if (w.snowSig === sig) return;
  w.snowSig = sig;
  if (w.snowG) w.scene.remove(w.snowG);
  const g = w.snowG = new THREE.Group();
  for (const [k, m] of Object.entries(s.snowmen || {})) { // Kugeln je Größe, dazu jedes Schmuckstück einzeln
    const [x, z] = k.split(',').map(Number), o = new THREE.Group();
    o.add(am('schneemann14_' + Math.max(1, Math.min(3, m.lv | 0)), true));
    for (const d of Object.keys(m.deco || {})) if (m.deco[d] && BLEND_14['schneemann14_' + d]) o.add(am('schneemann14_' + d, true));
    o.position.set(x, 0, z); g.add(o);
  }
  for (const k of s.snowpiles || []) { const [x, z] = k.split(',').map(Number), o = am('schneehaufen14'); o.position.set(x, 0, z); o.rotation.y = h2(x, z) * 6; g.add(o); }
  w.scene.add(g);
}

// ---------- Der Hase ----------
function updateRabbit(w, s, me, dt) {
  const P = s.pet14, show = !!P?.at && E.rabbitAwake(s) && w.target.x > -150 && w.target.x < 150 && Math.abs(w.target.z) < 150;
  if (w.rabbit && w.rabbitBow !== (P?.bow | 0)) { w.scene.remove(w.rabbit.m); w.rabbit = null; }
  if (!show) { if (w.rabbit) w.rabbit.m.visible = false; E.setRabbitHint(null); return; }
  if (!w.rabbit) { w.rabbitBow = P.bow | 0; const m = am('hase14', true), bow = E.RABBIT_BOWS[P.bow | 0]?.[1] || 0; if (bow) m.add(mesh(rabbitBowParts(bow))); w.scene.add(m); w.rabbit = { m, x: P.at[0], z: P.at[1], ry: 0, hop: 0 }; }
  const R = w.rabbit, t = w.time;
  R.m.visible = true;
  let tx, tz;
  const lead = P.in && P.follow ? Object.values(w.lastPlayers || {}).find(p => p.key === P.follow) || null : null; // P.follow ist der Spieler-Schlüssel
  if (lead) { tx = lead.x - Math.sin(lead.ry || 0) * 0.85; tz = lead.z - Math.cos(lead.ry || 0) * 0.85; }
  else { const a = Math.floor(t / 5), u = t / 5 - a, k = (i) => [P.at[0] + (h2(a + i, 3) - 0.5) * 2.2, P.at[1] + (h2(7, a + i) - 0.5) * 1.8], p0 = k(0), p1 = k(1), e = Math.min(1, u * 2.2); tx = p0[0] + (p1[0] - p0[0]) * e; tz = p0[1] + (p1[1] - p0[1]) * e; }
  const dx = tx - R.x, dz = tz - R.z, d = Math.hypot(dx, dz), sp = (lead ? 4.2 : 1.6) * dt;
  if (d > (lead ? 0.25 : 0.05)) { const st = Math.min(d, sp); R.x += dx / d * st; R.z += dz / d * st; R.ry = Math.atan2(dx, dz); R.hop += dt * 9; } else R.hop = 0;
  if (lead && d > 12) { R.x = tx; R.z = tz; }
  R.m.position.set(R.x, E.terraY(s, R.x, R.z) + Math.abs(Math.sin(R.hop)) * 0.13, R.z);
  R.m.rotation.y = R.ry;
  E.setRabbitHint(lead ? [R.x, R.z] : null);
}

// ---------- Salon-Stand in der Bummelgasse ----------
function syncSalon(w) {
  if (w.salon14) return;
  const m = w.salon14 = am('salon14');
  m.position.set(STREET.x + E.SALON_AT[0], 0, STREET.z + E.SALON_AT[1] + 0.95);
  w.scene.add(m);
}

// ---------- Hausfassade ----------
const tintCache = new Map();
const ROOF_HUE = { 1: [0.028, 0.06], 2: [0.99, 0.05], 3: [0.61, 0.11], 4: [0.94, 0.05], 5: [0.075, 0.04] }; // Dachfarbe je Ausbaustufe: [Farbton, Spanne]
function tintRoof(root, level, hue) {
  const [h0, span] = ROOF_HUE[Math.max(1, Math.min(5, level))], c = new THREE.Color(), hsl = {}, v = new THREE.Vector3();
  root.updateMatrixWorld(true);
  root.traverse(o => {
    if (!o.isMesh || o.name.includes('__glow') || o.parent?.name?.includes('__glow') || !o.geometry.getAttribute('color')) return;
    const key = o.geometry.uuid + '|' + level + '|' + hue;
    if (!tintCache.has(key)) {
      const g = o.geometry.clone(), a = g.getAttribute('color'), p = g.getAttribute('position');
      for (let i = 0; i < a.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
        if (v.y < 2.0) continue;
        c.setRGB(a.getX(i), a.getY(i), a.getZ(i)); c.getHSL(hsl);
        const dh = Math.abs(((hsl.h - h0 + 1.5) % 1) - 0.5);
        if (dh < span && hsl.s > 0.2) { c.setHSL(hue, Math.min(0.75, hsl.s), hsl.l); a.setXYZ(i, c.r, c.g, c.b); }
      }
      a.needsUpdate = true;
      tintCache.set(key, g);
    }
    o.geometry = tintCache.get(key);
  });
}
function numberPlate(n) {
  const c = document.createElement('canvas'); c.width = 96; c.height = 72;
  const g = c.getContext('2d');
  if (g) { g.fillStyle = '#fffaf0'; g.beginPath(); g.roundRect(3, 3, 90, 66, 14); g.fill(); g.lineWidth = 5; g.strokeStyle = '#3d5a80'; g.stroke(); g.fillStyle = '#3d5a80'; g.font = 'bold 44px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 48, 39); }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.225), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
  m.position.set(-0.78, 1.25, 1.69);
  return m;
}
export function houseExterior(m, ext, level) {
  if (!ext || !Object.values(ext).some(Boolean)) return;
  const opt = (k) => E.EXT[k].find(o => o[0] === ext[k]);
  if (ext.roof && opt('roof')) tintRoof(m, level, opt('roof')[2]);
  const xs = level === 1 ? [-1.4, 1.4] : level === 2 ? [-1.6, 1.6] : [1.6], parts = [];
  if (ext.wreath) parts.push(...kranzParts(ext.wreath, 1.2, 1.7, 0.8));
  const g = new THREE.Group();
  g.position.z = m.userData.asset ? 0 : -10.5; // Ersatzmodell aus dem Code liegt anders
  for (const [kind, at] of [['door', [0]], ['shut', xs], ['box', xs]]) { // Tür, Läden und Blumenkästen: je Farbe ein Stück (Blender oder Grundformen)
    const o = ext[kind] && opt(kind);
    if (o) for (const x of at) { const q = asset(FACADE_NAME[kind] + o[0]) || mesh(facadeParts(kind, o[2])); q.traverse(n => { n.castShadow = false; }); q.position.x = x; g.add(q); }
  }
  if (parts.length) g.add(mesh(parts));
  if (ext.nr > 0) g.add(numberPlate(ext.nr));
  m.add(g);
}

// Jeden Frame (nach den Gegenständen): Gelände, Schlösser, Schnee, Hase, Lichter
export function update14(w, s, me, dt, night) {
  const isl = zoneOf({ x: w.target.x, z: w.target.z }) === 'island';
  syncTerra(w, s);
  syncLocks(w, s);
  syncSnow(w, s);
  syncSalon(w);
  updateRabbit(w, s, me, dt);
  updateLights(w, isl ? night : 0);
}
