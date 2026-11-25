// 3D für Inselleben 5: Pony (im Stall und zum Reiten), Bimmelbahn, Hochsee-Boot, Lack auf Möbeln, Party-Deko.
// Wird von world.js (pro Bild), world-extra.js (ferne Orte) aufgerufen.
import * as THREE from '../vendor/three.module.min.js';
import * as M from './models.js';
import { bm } from './blend.js';
import * as V from './extras5.js';

const put = (g, m, x, z, ry = 0) => { m.position.set(x, 0, z); m.rotation.y = ry; g.add(m); return m; };
const objPos = (s, k) => { const e = Object.entries(s.obj || {}).find(([, o]) => o?.k === k); return e ? e[0].split(',').map(Number) : null; };

// ---------- Pony ----------
export function ponyModel(c = 0xc89a6a, mane = 0x7a4a2a) {
  const legs = [[-0.13, -0.3], [0.13, -0.3], [-0.13, 0.3], [0.13, 0.3]];
  return bm(c === 0xc89a6a && mane === 0x7a4a2a ? 'ride_pony' : `ride_pony_${c.toString(16)}_${mane.toString(16)}`, [
    M.ball(0.3, c, 0, 0.62, 0, 0.9, 0.8, 1.45, 12),
    ...legs.map(([x, z]) => M.cyl(0.055, 0.05, 0.46, c, x, 0.27, z, 7)),
    ...legs.map(([x, z]) => M.cyl(0.06, 0.06, 0.06, 0x4a3a30, x, 0.03, z, 7)),
    M.cyl(0.09, 0.13, 0.42, c, 0, 0.9, 0.38, 8, 0.55),
    M.ball(0.14, c, 0, 1.08, 0.56, 0.85, 0.85, 1.45, 10),
    M.ball(0.08, 0xe8c8a8, 0, 1.03, 0.73, 1, 0.8, 1, 8),
    ...[-1, 1].map(s => M.ball(0.03, 0x2a1a14, s * 0.09, 1.13, 0.64)),
    ...[-1, 1].map(s => M.cone(0.045, 0.12, c, s * 0.07, 1.24, 0.5, 5)),
    M.box(0.06, 0.32, 0.26, mane, 0, 1.02, 0.36, 0, 0.55),
    M.cyl(0.03, 0.08, 0.42, mane, 0, 0.6, -0.5, 6, -0.45),
    M.box(0.38, 0.06, 0.36, 0xd85a6a, 0, 0.88, 0),
  ]);
}
export function syncPony(world, e, on) {
  if (!on) { if (e.ponyM) e.ponyM.visible = false; return; }
  if (!e.ponyM) { e.ponyM = ponyModel(); world.scene.add(e.ponyM); }
  e.ponyM.visible = true;
  const bob = e.speed > 0.2 ? Math.abs(Math.sin(world.time * 9)) * 0.06 : 0;
  e.ponyM.position.set(e.x, bob, e.z);
  e.ponyM.rotation.y = e.ry;
}

// ---------- Bimmelbahn: Lok unter der Figur, Wagen folgen der Strecke ----------
const trainAt = (f, P) => { const n = P.length, i = ((Math.floor(f) % n) + n) % n, k = f - Math.floor(f), a = P[i], b = P[(i + 1) % n]; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, Math.atan2(b[0] - a[0], b[1] - a[1])]; };
function trainCar(k) {
  const col = [0xff6b6b, 0x6cb4ff, 0xffd23f][k], P = [M.box(0.9, 0.42, 1.2, col, 0, 0.38, 0), M.box(0.96, 0.06, 1.26, 0xfff3e0, 0, 0.6, 0)];
  for (const [x, z] of [[-0.45, -0.4], [0.45, -0.4], [-0.45, 0.4], [0.45, 0.4]]) P.push(M.cyl(0.15, 0.15, 0.08, 0x3a3a44, x, 0.15, z, 12, 0, 0, Math.PI / 2));
  if (!k) P.push(M.cyl(0.09, 0.12, 0.42, 0x3a3a44, 0, 0.82, 0.38, 10), M.box(0.5, 0.3, 0.06, 0xfff3e0, 0, 0.7, 0.62));
  return bm('ride_train_' + k, P);
}
export function syncTrain(world, e, on) {
  if (!on) { if (e.trainM) e.trainM.visible = false; return; }
  if (!e.trainM) { e.trainM = new THREE.Group(); for (let k = 0; k < 3; k++) e.trainM.add(trainCar(k)); world.scene.add(e.trainM); }
  e.trainM.visible = true;
  const P = V.TRAIN_PATH;
  let bi = 0, bd = Infinity;
  P.forEach(([x, z], i) => { const d = (x - e.x) ** 2 + (z - e.z) ** 2; if (d < bd) { bd = d; bi = i; } });
  const [ax, az] = P[bi], [bx, bz] = P[(bi + 1) % P.length], L = (bx - ax) ** 2 + (bz - az) ** 2 || 1;
  const f = bi + Math.max(-0.5, Math.min(1, ((e.x - ax) * (bx - ax) + (e.z - az) * (bz - az)) / L));
  e.trainM.children.forEach((car, k) => {
    if (!k) { car.position.set(e.x, 0, e.z); car.rotation.y = e.ry; return; }
    const [x, z, r] = trainAt(f - k * 0.55, P);
    car.position.set(x, 0, z); car.rotation.y = r;
  });
  if (Math.random() < 0.06) world.burst(e.x + Math.sin(e.ry) * 0.4, e.z + Math.cos(e.ry) * 0.4, 'smoke', 1.1);
}

// ---------- Möbel lackieren: Farbe aufs Material ----------
const TINT_C = V.TINTS.map(c => new THREE.Color(c));
export function tintFurniture(m, c) {
  if (!c || !TINT_C[c]) return;
  m.traverse(o => {
    if (!o.isMesh || !o.material?.color) return;
    o.material = o.material.clone();
    o.material.color.multiply(TINT_C[c]);
  });
}

// ---------- auf der Insel: Pony am Stall, Partydeko am Geburtstag ----------
export function updateIslandV(world, s, riding) {
  const U = world.islandV ||= { pony: null };
  const at = objPos(s, 'ponystall');
  if (at && !riding) {
    if (!U.pony) { U.pony = ponyModel(); world.scene.add(U.pony); }
    U.pony.visible = true;
    U.pony.position.set(at[0] + 1.25, 0, at[1] + 0.55);
    U.pony.rotation.y = -0.8 + Math.sin(world.time * 0.4) * 0.3;
    const tg = world.target;
    if (Math.hypot(at[0] - tg.x, at[1] - tg.z) < 8) world.tag('ponyname', `🐴 ${s.pony?.name || 'Pony'}${V.ponyHappy(s) ? ' 💕' : ''}`, at[0] + 1.25, 1.55, at[1] + 0.55, 'name npc');
  } else if (U.pony) U.pony.visible = false;
}

// ---------- Hochsee: das Boot von Käpt'n Flossi auf offenem Meer ----------
function buildDeepsea() {
  const g = new THREE.Group(), X = V.DEEPSEA.x, Z = V.DEEPSEA.z, w = V.DEEPSEA.w, d = V.DEEPSEA.d;
  const sea = new THREE.Mesh(M.disc(120, 48, 3), new THREE.MeshLambertMaterial({ color: 0x2a78b8 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(X, -0.55, Z); g.add(sea);
  const P = [
    M.box(w * 2, 0.9, d * 2, 0xffffff, 0, -0.5, 0), M.box(w * 2 + 0.1, 0.18, d * 2 + 0.1, 0x3a6aa8, 0, -0.85, 0),
    M.box(w * 1.41, 0.9, w * 1.41, 0xffffff, 0, -0.5, -d, Math.PI / 4), M.box(w * 1.41 - 0.2, 0.06, w * 1.41 - 0.2, 0xc9945e, 0, -0.03, -d, Math.PI / 4),
    M.box(w * 2 - 0.2, 0.06, d * 2 - 0.2, 0xc9945e, 0, -0.03, 0),
    ...[-1, 1].map(s => M.box(0.08, 0.35, d * 2, 0xffffff, s * (w - 0.04), 0.17, 0)),
    M.box(w * 2, 0.35, 0.08, 0xffffff, 0, 0.17, d - 0.04),
    M.cyl(0.09, 0.1, 4.6, 0xa87449, 0, 2.3, 0.2, 8),
    M.box(2.2, 0.1, 0.1, 0xa87449, 0, 1.0, 0.2),
    M.box(1.6, 1.1, 1.2, 0xfff3e0, 0, 0.55, -3.3), M.box(1.75, 0.12, 1.35, 0x5a8aa8, 0, 1.15, -3.3), M.box(0.9, 0.35, 0.04, 0x9ad0f0, 0, 0.7, -2.68),
    M.box(0.5, 0.25, 0.5, 0x5a8aa8, -1.3, 0.13, 3.9), M.box(0.5, 0.25, 0.5, 0xc8705a, 1.3, 0.13, 1.6), M.cyl(0.18, 0.18, 0.5, 0xa87449, -1.3, 0.25, 1.4, 10),
  ];
  g.add(bm('zone_deepsea', P.map(q => (q.g.translate(X, 0, Z), q))));
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 3.0), new THREE.MeshLambertMaterial({ color: 0xfff3e0, side: THREE.DoubleSide }));
  sail.position.set(X, 2.6, Z + 0.28); g.add(sail);
  const waves = [];
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.6 + (i % 3) * 0.3, 0.03, 4, 18, Math.PI), new THREE.MeshBasicMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.6 }));
    const a = i * 2.4, r = 7 + (i % 7) * 3;
    m.rotation.x = -Math.PI / 2; m.position.set(X + Math.sin(a) * r, -0.5, Z + Math.cos(a) * r); g.add(m); waves.push(m);
  }
  g.userData = { sail, waves, lights: [[X, Z + 2.6], [X, Z - 2]] };
  return g;
}
export function zonesV(zones, world, s, t, target) {
  const on = V.zoneV(target.z) === 'deepsea';
  if (zones.deepV) zones.deepV.visible = on;
  if (!on) return false;
  if (!zones.deepV) { zones.deepV = buildDeepsea(); zones.scene.add(zones.deepV); }
  const U = zones.deepV.userData, X = V.DEEPSEA.x, Z = V.DEEPSEA.z;
  zones.deepV.position.y = Math.sin(t * 0.9) * 0.05;
  zones.deepV.rotation.z = Math.sin(t * 0.7) * 0.012;
  U.sail.rotation.y = Math.sin(t * 0.5) * 0.12;
  U.waves.forEach((w, i) => { w.position.y = -0.5 + Math.sin(t * 1.3 + i) * 0.06; w.material.opacity = 0.3 + 0.3 * Math.sin(t + i); });
  world.tag('deepcap', '🦭 Käpt\'n Flossi · ⛵ hinten: nach Hause', X, 1.6, Z + 4.2, 'name npc');
  for (const sx of [-1, 1]) world.tag('deeprail' + sx, '🎣', X + sx * (V.DEEPSEA.w - 0.3), 1.0 + Math.sin(t * 2 + sx) * 0.06, Z - 0.5, 'bubble');
  if (Math.random() < 0.04) world.burst(X + (Math.random() - 0.5) * 30, Z + (Math.random() - 0.5) * 30, 'splash', -0.4);
  return true;
}
export const lightsV = (zones, target) => (target.z > 3600 ? zones.deepV?.userData.lights || null : undefined);

// Für den Blender-Bauplan (tools/capture-world.py)
export function __capture() {
  ponyModel();
  for (let k = 0; k < 3; k++) trainCar(k);
}
