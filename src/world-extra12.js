// Inselleben 15 „Winterzauber“ – nur Anzeige: Koi im selbst gegrabenen Teich, der Erinnerungsbaum (Wuchsstufe, Anhänger, Zettel),
// der Federball über dem Netz, Polaroid-Fotos und fertige Puzzlebilder an der Wand.
import * as THREE from '../vendor/three.module.min.js';
import * as M from './models.js';
import * as E from './extras15.js';
import { koiParts, shuttleParts, treeBaseParts, memTreeParts, treeHangParts, POLA_TILT } from './models-15.js';
import { motifCanvas } from './motifs15.js';

const mesh = (parts, glow) => M.model(parts, glow || [], false);
const shadow = m => { m.traverse(q => { if (q.isMesh) q.castShadow = true; }); return m; };
const onIsland = w => w.target.x > -150 && w.target.x < 150 && Math.abs(w.target.z) < 150;

// ---------- Koi ----------
function updateKoi(w, s, dt) {
  const fish = s.koi?.fish || [], sig = fish.map(f => f.v).join() + '|' + (w.terraSig || '');
  if (w.koiSig !== sig) {
    w.koiSig = sig;
    for (const f of w.koi15 || []) { w.scene.remove(f.m); f.m.traverse(o => o.geometry?.dispose?.()); }
    w.koi15 = [];
    const tiles = Object.keys(s.terra || {}).filter(k => s.terra[k] === 'w');
    if (!tiles.length) return;
    const set = new Set(tiles);
    w.koiAdj = k => { const [x, z] = k.split(',').map(Number); return [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([a, b]) => (x + a) + ',' + (z + b)).filter(n => set.has(n)); };
    fish.forEach((f, i) => {
      const d = E.KOI[f.v], m = mesh(koiParts(d[2], d[3], f.v)), at = tiles[(i * 7 + 3) % tiles.length];
      m.scale.setScalar(0.82);
      w.scene.add(m);
      w.koi15.push({ m, a: at, b: at, u: 1, sp: 0.22 + (i % 4) * 0.05, ox: ((i * 37) % 11 - 5) * 0.045, oz: ((i * 53) % 11 - 5) * 0.045, ry: i, ph: i * 1.7, x: 0, z: 0 });
    });
  }
  if (!w.koi15?.length) return;
  const show = onIsland(w), xz = k => k.split(',').map(Number);
  for (const f of w.koi15) {
    f.m.visible = show;
    if (!show) continue;
    f.u += dt * f.sp;
    if (f.u >= 1) { f.u = 0; f.a = f.b; const n = w.koiAdj(f.a); f.b = n.length && Math.random() < 0.85 ? n[Math.floor(Math.random() * n.length)] : f.a; }
    const [ax, az] = xz(f.a), [bx, bz] = xz(f.b), e = f.u * f.u * (3 - 2 * f.u), t = w.time * 0.7 + f.ph;
    const x = ax + (bx - ax) * e + f.ox + Math.sin(t) * 0.1, z = az + (bz - az) * e + f.oz + Math.cos(t * 0.8) * 0.1, dx = x - f.x, dz = z - f.z;
    if (Math.hypot(dx, dz) > 0.0005) { let d = Math.atan2(dx, dz) - f.ry; d = Math.atan2(Math.sin(d), Math.cos(d)); f.ry += d * Math.min(1, dt * 5); }
    f.x = x; f.z = z;
    f.m.position.set(x, 0.03 + Math.sin(t * 1.3) * 0.004, z);
    f.m.rotation.set(0, f.ry + Math.sin(w.time * 5 + f.ph) * 0.12, 0);
  }
}

// ---------- Erinnerungsbaum und Federballnetz: wo stehen sie? (nur ab und zu nachsehen) ----------
function findSpots(w, s) {
  if (w.spot15T > w.time && w.spot15N === Object.keys(s.obj || {}).length) return;
  w.spot15T = w.time + 1.5; w.spot15N = Object.keys(s.obj || {}).length;
  w.tree15K = null; w.net15 = null;
  for (const [k, o] of Object.entries(s.obj || {})) {
    if (o?.k === E.TREE_ID) w.tree15K = k;
    else if (o?.k === E.NET_ID && !w.net15) { const [x, z] = k.split(',').map(Number); w.net15 = { x, z, r: o.r | 0 }; }
  }
}
function updateTree(w, s) {
  const e = w.tree15K && w.objs.get(w.tree15K);
  if (!e) return;
  const st = E.treeStage(s), marks = Math.min(15, E.treeMarks(s).length), notes = Math.min(8, s.tree?.notes?.length || 0), sig = `${st}|${w.season}|${marks}|${notes}`;
  if (e.m.userData.t15 === sig) return;
  if (e.m.userData.t15g) { e.m.remove(e.m.userData.t15g); e.m.userData.t15g.traverse(o => o.geometry?.dispose?.()); }
  else for (const c of e.m.children) c.visible = false; // das Vorschau-Modell weicht dem gewachsenen Baum
  const g = shadow(mesh([...treeBaseParts(), ...memTreeParts(st, w.season), ...(st > 0 ? treeHangParts(st, marks, notes) : [])]));
  g.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
  e.m.add(g);
  e.m.userData.t15 = sig; e.m.userData.t15g = g;
}

// ---------- Federball ----------
function updateShuttle(w, s, dt) {
  const R = s.rally, N = w.net15, live = !!N && E.rallyLive(s);
  if (!w.shuttle15) { if (!live) return; w.shuttle15 = { m: mesh(shuttleParts()), key: '', t: 9, from: -1, hide: 0 }; w.scene.add(w.shuttle15.m); }
  const B = w.shuttle15;
  if (!live) { B.hide += dt; if (B.hide > 0.8) B.m.visible = false; return; }
  B.hide = 0; B.m.visible = onIsland(w);
  const key = R.n + '|' + R.t;
  if (B.key !== key) { B.key = key; B.t = 0; B.from = R.n % 2 ? 1 : -1; }
  B.t += dt;
  const u = Math.min(1, B.t / 0.75), a = N.r * Math.PI / 2, nx = Math.sin(a), nz = Math.cos(a), side = R.n ? B.from * (1 - 2 * u) : -1, d = side * 1.5;
  const y = R.n ? 1.05 + Math.sin(Math.PI * u) * 1.25 : 1.1 + Math.sin(w.time * 6) * 0.05;
  B.m.position.set(N.x + nx * d, y, N.z + nz * d);
  B.m.rotation.set(Math.sin(w.time * 9) * 0.3, w.time * 3, (R.n ? (0.5 - u) * 2.2 * B.from : 0));
}

// ---------- Bilder an der Wand ----------
const texCache = new Map();
function canvasTex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function polaTex(url, cap) {
  const key = url.length + url.slice(-24) + '|' + cap;
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = 200; c.height = 240;
  const g = c.getContext('2d'), tex = canvasTex(c);
  const paint = img => {
    if (!g) return;
    g.fillStyle = '#f7f4ee'; g.fillRect(0, 0, 200, 240);
    g.fillStyle = '#d8dde4'; g.fillRect(14, 14, 172, 143);
    if (img) g.drawImage(img, 14, 14, 172, 143);
    if (cap) { g.fillStyle = '#4a3a3a'; g.font = '600 24px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(cap, 100, 198, 176); }
    tex.needsUpdate = true;
  };
  paint(null);
  if (url && typeof Image !== 'undefined') { const img = new Image(); img.onload = () => paint(img); img.src = url; }
  if (texCache.size > 24) texCache.delete(texCache.keys().next().value);
  texCache.set(key, tex);
  return tex;
}
const hash = v => { let h = 0; for (let i = 0; i < v.length; i += 7) h = (h * 31 + v.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + v.length; };
// Gehört zum Erkennungszeichen des Möbelstücks: Ändert sich das Foto, wird es neu aufgehängt
export function furnSig15(s, k) {
  const n = E.polaSlot(k);
  return n ? 'P' + hash(s.pola?.img?.[n] || '') + (s.pola?.cap?.[n] || '') : '';
}
export function furnPic15(m, s, k) {
  const n = E.polaSlot(k);
  if (n) {
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.504), new THREE.MeshLambertMaterial({ map: polaTex(s.pola?.img?.[n] || '', s.pola?.cap?.[n] || '') }));
    pic.position.set(0, 1.42, -0.4505); pic.rotation.z = POLA_TILT[n];
    m.add(pic);
    return;
  }
  if (/^puzzlebild[1-6]$/.test(k)) {
    const i = +k.slice(10) - 1, key = 'pz' + i;
    if (!texCache.has(key)) texCache.set(key, canvasTex(motifCanvas(i)));
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.56), new THREE.MeshLambertMaterial({ map: texCache.get(key) }));
    pic.position.set(0, 1.4, -0.443);
    m.add(pic);
  }
}

export function update15(w, s, me, dt) {
  updateKoi(w, s, dt);
  findSpots(w, s);
  updateTree(w, s);
  updateShuttle(w, s, dt);
}
