// 3D für Inselleben 4: Gezeiten-Tümpel, Stempelpfosten, Zeitkapseln, Schlitten, die Grotte hinter dem Wasserfall
// und die Vulkaninsel. Wird von world.js (pro Bild) und zones.js (ferne Orte) aufgerufen.
import * as THREE from '../vendor/three.module.min.js';
import * as M from './models.js';
import { bm, bmv } from './blend.js';
import { makeNpc } from './npc.js';
import * as W from './extras4.js';
import { zonesV, lightsV } from './world-extra2.js';
import { zones6, lights6 } from './world-extra3.js';
import { zones7, lights7 } from './world-extra4.js';
import { zones8, lights8 } from './world-extra5.js';

const put = (g, m, x, z, ry = 0) => { m.position.set(x, 0, z); m.rotation.y = ry; g.add(m); return m; };

// ---------- auf der Insel (einmal gebaut) ----------
export function buildIslandW(world) {
  const g = new THREE.Group(), pools = [];
  for (const [x, z] of W.TIDE_POOLS) {
    const rocks = [];
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; rocks.push(M.ball(0.18 + (i % 3) * 0.05, i % 2 ? 0x9a9290 : 0x857d7a, Math.cos(a) * 0.62, 0.06, Math.sin(a) * 0.55, 1.2, 0.6, 1, 7)); }
    put(g, bm('zone_tiderocks', rocks), x, z, x * 0.7);
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), new THREE.MeshLambertMaterial({ color: 0x5ab8d8, transparent: true, opacity: 0.85 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(x, 0.09, z);
    g.add(water);
    pools.push(water);
  }
  for (const P of W.STAMPS) {
    const post = bm('zone_stamppost', [M.cyl(0.05, 0.06, 0.95, 0xa87449, 0, 0.47, 0, 7), M.box(0.42, 0.32, 0.12, 0xff8fab, 0, 1.05, 0), M.box(0.34, 0.24, 0.13, 0xfff3e0, 0, 1.05, 0), M.cone(0.27, 0.16, 0xc8705a, 0, 1.3, 0, 4, 0, Math.PI / 4)]);
    put(g, post, P[3], P[4]);
  }
  world.scene.add(g);
  return { g, pools, caps: new Map() };
}
export function updateIslandW(world, s, t) {
  const U = world.islandW ||= buildIslandW(world), low = W.tideLow(s), tg = world.target;
  U.pools.forEach((w, i) => {
    w.scale.setScalar(low ? 0.7 : 1.15);
    w.position.y = low ? 0.06 : 0.11;
    const [x, z] = W.TIDE_POOLS[i];
    if (low && s.tidepool?.[i] !== s.day && Math.hypot(x - tg.x, z - tg.z) < 9) world.tag('tide' + i, '✨', x, 0.8 + Math.sin(t * 2 + i) * 0.08, z, 'bubble');
  });
  for (const P of W.STAMPS) if (Math.hypot(P[3] - tg.x, P[4] - tg.z) < 7) world.tag('stamp' + P[0], `📮 ${P[2]}`, P[3], 1.7, P[4], 'name npc');
  // Zeitkapseln: Erdhügel mit Fähnchen, glitzert, wenn sie offen werden darf
  const seen = new Set();
  for (const c of s.capsules || []) {
    if (c.opened) continue;
    seen.add(c.k);
    const [x, z] = c.k.split(',').map(Number);
    if (!U.caps.has(c.k)) U.caps.set(c.k, put(U.g, bm('zone_capsule', [M.ball(0.36, 0x8a6a48, 0, 0, 0, 1, 0.35, 1, 10), M.cyl(0.012, 0.012, 0.5, 0xffffff, 0.12, 0.25, 0, 5), M.box(0.18, 0.12, 0.01, 0xb08cff, 0.21, 0.44, 0)]), x, z));
    if (s.day >= c.open && Math.hypot(x - tg.x, z - tg.z) < 9) world.tag('cap' + c.k, '⏳✨', x, 0.8, z, 'bubble');
  }
  for (const [k, m] of U.caps) if (!seen.has(k)) { U.g.remove(m); U.caps.delete(k); }
}

// ---------- Schlitten unter der Figur ----------
export function syncSled(world, e, on) {
  if (!on) { if (e.sledM) e.sledM.visible = false; return; }
  if (!e.sledM) {
    e.sledM = bm('ride_sled', [M.box(0.5, 0.05, 0.9, 0xd8503a, 0, 0.18, 0), ...[-0.22, 0.22].flatMap(x => [M.box(0.04, 0.04, 1.0, 0x8a8e98, x, 0.04, 0.02), M.box(0.04, 0.14, 0.04, 0x8a8e98, x, 0.11, -0.3), M.box(0.04, 0.14, 0.04, 0x8a8e98, x, 0.11, 0.3), M.box(0.04, 0.04, 0.16, 0x8a8e98, x, 0.1, 0.52, 0, 0.9)])]);
    world.scene.add(e.sledM);
  }
  e.sledM.visible = true;
  e.sledM.position.set(e.x, 0, e.z);
  e.sledM.rotation.y = e.ry;
}

// ---------- Grotte hinter dem Wasserfall ----------
function buildGrotto() {
  const g = new THREE.Group(), X = W.GROTTO.x, Z = W.GROTTO.z, R = W.GROTTO.r, parts = [], glow = [], rnd = (i => () => ((i = Math.imul(i, 48271) % 2147483647) / 2147483647))(777);
  const floor = new THREE.Mesh(M.disc(R + 4, 40), new THREE.MeshLambertMaterial({ color: 0x4a5a6a }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(X, -0.02, Z); g.add(floor);
  for (let i = 0; i < 52; i++) { const a = i / 52 * Math.PI * 2, rx = Math.sin(a) * (R + 0.8), rz = Math.cos(a) * (R + 0.8); if (rz > 1 && Math.abs(rx) < 1.6) continue; const low = rz > 1; parts.push(M.ball(low ? 0.8 : 1.2 + rnd() * 0.7, rnd() < 0.5 ? 0x4e5a68 : 0x5a6878, rx, low ? 0.15 : 0.8 + rnd() * 1.5, rz, 1, low ? 0.55 : 1.6 + rnd() * 0.6, 1, 7)); }
  for (let i = 0; i < 30; i++) { const a = rnd() * 6.28, r = R - rnd() * 0.6; glow.push(M.ball(0.05, [0x7affe8, 0x9ad8ff, 0xc8ff9a][i % 3], Math.sin(a) * r, 0.6 + rnd() * 2.2, Math.cos(a) * r, 1, 1, 1, 5)); }
  // Leuchtbecken mit Rand
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; parts.push(M.ball(0.28, 0x6a7888, Math.cos(a) * (W.GROTTO.pool + 0.15), 0.08, Math.sin(a) * (W.GROTTO.pool + 0.15), 1.2, 0.5, 1, 7)); }
  // Truhe & Ausgang (Wasservorhang)
  const [cx, cz] = W.GROTTO_CHEST;
  parts.push(M.box(0.8, 0.45, 0.55, 0x8a5a36, cx, 0.24, cz), M.box(0.84, 0.08, 0.59, 0xe0b862, cx, 0.47, cz));
  g.add(bmv('zone_grotto', parts.map(q => (q.g.translate(X, 0, Z), q)), glow.map(q => (q.g.translate(X, 0, Z), q))));
  const pool = new THREE.Mesh(M.disc(W.GROTTO.pool, 32), new THREE.MeshBasicMaterial({ color: 0x3ad8e8, transparent: true, opacity: 0.85 }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(X, 0.04, Z); g.add(pool);
  g.userData = { pool, lights: [[X, Z], [X + 4, Z + 3], [X - 4, Z + 3]] };
  return g;
}

// ---------- Vulkaninsel ----------
function buildVolcano() {
  const g = new THREE.Group(), X = W.VOLCANO.x, Z = W.VOLCANO.z, R = W.VOLCANO.r, parts = [], glow = [], rnd = (i => () => ((i = Math.imul(i, 48271) % 2147483647) / 2147483647))(4321);
  const sea = new THREE.Mesh(M.disc(R + 40, 48, 2.5), new THREE.MeshLambertMaterial({ color: 0x3a9ad0 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(X, -0.3, Z); g.add(sea);
  const land = new THREE.Mesh(M.fine(new THREE.CylinderGeometry(R, R + 1.2, 0.5, 48), 1.5, true), new THREE.MeshLambertMaterial({ color: 0x9a8070 }));
  land.position.set(X, -0.25, Z); g.add(land);
  const sand = new THREE.Mesh(new THREE.RingGeometry(R - 2.2, R, 48, 2), new THREE.MeshLambertMaterial({ color: 0xd8c4a4 }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(X, 0.005, Z); g.add(sand);
  // Vulkankegel mit glühendem Krater
  const [vx, vz, vr] = W.VOLC_CONE;
  parts.push(M.cone(vr + 1.5, 6, 0x4a3a3a, vx, 3, vz, 14), M.cone(vr * 0.6, 1.2, 0x3a2a2a, vx, 6.2, vz, 12));
  glow.push(M.cyl(1.1, 0.9, 0.15, 0xff6a2a, vx, 6.05, vz, 14));
  for (let i = 0; i < 6; i++) glow.push(M.box(0.18, 2.2, 0.06, 0xff7a3a, vx + Math.cos(i) * 1.6, 3.6, vz + 2.3 + Math.sin(i) * 0.3, 0, 0, 0.3 * (i - 2.5)));
  // Quellen: Steinrand, Wasser dampft
  for (const [sx, sz, r] of W.VOLC_SPRINGS) for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; parts.push(M.ball(0.24, 0x8a8080, sx + Math.cos(a) * (r + 0.1), 0.06, sz + Math.sin(a) * (r + 0.1), 1.2, 0.5, 1, 7)); }
  // Obsidianfelsen und Glutblumen-Büsche
  for (const [rx, rz] of W.VOLC_ROCKS) parts.push(M.ball(0.5, 0x2a2430, rx, 0.3, rz, 1.1, 0.8, 1, 6), M.cone(0.12, 0.45, 0x1a1420, rx + 0.25, 0.6, rz, 5, 0, 0, -0.3), M.cone(0.1, 0.35, 0x3a2a48, rx - 0.2, 0.55, rz + 0.1, 5, 0, 0, 0.4));
  for (const [bx, bz] of W.VOLC_BUSHES) { parts.push(M.ball(0.4, 0x5a8a3a, bx, 0.35, bz, 1.2, 0.8, 1.1, 8)); for (let i = 0; i < 6; i++) glow.push(M.ball(0.07, i % 2 ? 0xff7a2a : 0xffd23f, bx + Math.cos(i) * 0.35, 0.55 + (i % 3) * 0.08, bz + Math.sin(i) * 0.3)); }
  for (let i = 0; i < 16; i++) { const a = rnd() * 6.28, r = 3 + rnd() * (R - 6); parts.push(M.cyl(0.6 + rnd() * 0.8, 0.7 + rnd() * 0.8, 0.04, 0x7aa85a, Math.sin(a) * r, 0.01, Math.cos(a) * r, 12)); }
  // Palmen & Steg
  for (let i = 0; i < 7; i++) { const a = rnd() * 6.28, r = R - 1.5 - rnd() * 2; const x = Math.sin(a) * r, z = Math.cos(a) * r; if (z > 6 && Math.abs(x) < 3) continue; parts.push(M.cyl(0.08, 0.12, 2.2, 0x8a6a48, x, 1.1, z, 6, 0.1), ...[0, 1, 2, 3, 4].map(k => M.ball(0.5, 0x3a8a3a, x + Math.cos(k * 1.26) * 0.45, 2.2, z + Math.sin(k * 1.26) * 0.45, 1.4, 0.25, 0.6, 7))); }
  for (let z = R - 1; z < R + 4; z += 0.45) parts.push(M.box(1.4, 0.07, 0.4, z % 0.9 > 0.45 ? 0xc9945e : 0xe3b47c, 0, 0.03, z));
  g.add(bmv('zone_volcano', parts.map(q => (q.g.translate(X, 0, Z), q)), glow.map(q => (q.g.translate(X, 0, Z), q))));
  const springs = W.VOLC_SPRINGS.map(([sx, sz, r]) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), new THREE.MeshLambertMaterial({ color: 0x7ad8d0, transparent: true, opacity: 0.85 })); m.rotation.x = -Math.PI / 2; m.position.set(X + sx, 0.06, Z + sz); g.add(m); return m; });
  g.userData = { springs, bathers: [], lights: [[X + vx, Z + vz + 3], [X, Z + R - 1]] };
  return g;
}
function updateVolcano(zones, world, s, t) {
  const g = zones.volcanoW, U = g.userData, X = W.VOLCANO.x, Z = W.VOLCANO.z;
  if (Math.random() < 0.3) { const [sx, sz, r] = W.VOLC_SPRINGS[Math.floor(Math.random() * 2)]; world.burst(X + sx + (Math.random() - 0.5) * r, Z + sz + (Math.random() - 0.5) * r, 'smoke', 0.1); }
  if (Math.random() < 0.15) world.burst(X + W.VOLC_CONE[0] + (Math.random() - 0.5), Z + W.VOLC_CONE[1], 'smoke', 6.3);
  // zwei Nachbarn baden in den Quellen
  const ids = W.bathers(s);
  if (U.ids !== ids.join()) { for (const b of U.bathers) g.remove(b.m); U.bathers = ids.map((id, i) => { const [sx, sz] = W.VOLC_SPRINGS[i % 2], m = makeNpc(id); m.position.set(X + sx + 0.5, -0.35, Z + sz - 0.3); g.add(m); return { id, m }; }); U.ids = ids.join(); }
  U.bathers.forEach((b, i) => { b.m.rotation.y = Math.sin(t * 0.3 + i) * 0.4 + Math.PI; b.m.userData.update?.(world.dt || 0.016, { speed: 0, pose: 'sit', time: t }); world.tag('bath' + i, `♨️ ${b.id[0].toUpperCase() + b.id.slice(1)}`, b.m.position.x, 1.5, b.m.position.z, 'name npc'); });
  world.tag('volcdock', '⛵ Käpt\'n Flossi', X + W.VOLC_DOCK[0], 2.2, Z + W.VOLC_DOCK[1], 'name npc');
  W.VOLC_ROCKS.forEach(([x, z], i) => { if (s.volcano?.rock?.[i] !== s.day) world.tag('vrock' + i, '✨', X + x, 1.2, Z + z, 'bubble'); });
  W.VOLC_BUSHES.forEach(([x, z], i) => { if (s.volcano?.bush?.[i] !== s.day) world.tag('vbush' + i, '🦋', X + x, 1.3 + Math.sin(t * 3 + i) * 0.1, Z + z, 'bubble'); });
}
function updateGrotto(zones, world, s, t) {
  const U = zones.grottoW.userData, X = W.GROTTO.x, Z = W.GROTTO.z;
  U.pool.material.color.setHSL(0.5 + Math.sin(t * 0.6) * 0.04, 0.7, 0.55);
  world.tag('grottoexit', '🌊 Hinaus', X + W.GROTTO_UP[0], 2.4, Z + W.GROTTO_UP[1] + 0.6, 'name npc');
  W.GROTTO_SPOTS.forEach(([x, z], i) => { if (s.grotto?.fish?.[i] !== s.day) world.tag('gspot' + i, '🎣', X + x, 0.9, Z + z, 'bubble'); });
  if (s.grotto?.chest !== s.day) world.tag('gchest', '✨', X + W.GROTTO_CHEST[0], 1.1, Z + W.GROTTO_CHEST[1], 'bubble');
  if (Math.random() < 0.3) world.burst(X + (Math.random() - 0.5) * 1.6, Z + W.GROTTO.r + 0.2, 'mist', 0.2);
}
// Aus zones.update: true, wenn die Kamera bei Grotte oder Vulkan ist (dann sind die anderen fernen Orte aus)
export function zonesW(zones, world, s, t, target) {
  const dv = zonesV(zones, world, s, t, target), fv = zones6(zones, world, s, t, target), f7 = zones7(zones, world, s, t, target), f8 = zones8(zones, world, s, t, target), deep = dv || fv || f7 || f8; // Hochsee (world-extra2.js), Jahrmarkt (world-extra3.js), Moor & Bambushain (world-extra4.js)
  const where = deep ? null : W.zoneW(target.z);
  if (zones.grottoW) zones.grottoW.visible = where === 'grotto';
  if (zones.volcanoW) zones.volcanoW.visible = where === 'volcano';
  if (!where && !deep) return false;
  for (const k of ['street', 'tropic', 'trip', 'reef', 'wreck', 'depths']) if (zones[k]) zones[k].visible = false;
  if (deep) return true;
  if (where === 'grotto') { if (!zones.grottoW) { zones.grottoW = buildGrotto(); zones.scene.add(zones.grottoW); } updateGrotto(zones, world, s, t); }
  else { if (!zones.volcanoW) { zones.volcanoW = buildVolcano(); zones.scene.add(zones.volcanoW); } updateVolcano(zones, world, s, t); }
  return true;
}
export const lightsW = (zones, target) => (target.z > 4500 ? lights8(zones) : target.z < -750 && Math.abs(target.x) < 150 ? lights7(zones, target) : target.z < -450 && Math.abs(target.x) < 150 ? lights6(zones, target) : target.z > 3600 ? lightsV(zones, target) : target.z > 3000 ? zones.volcanoW?.userData.lights : target.z > 2600 ? zones.grottoW?.userData.lights : undefined);

// Für den Blender-Bauplan (tools/capture-world.py): Dinge, die nur unter Bedingungen auftauchen
export function __capture() {
  syncSled({ scene: { add() {} } }, { x: 0, z: 0, ry: 0 }, true);
}
