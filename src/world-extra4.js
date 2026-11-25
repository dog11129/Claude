// Grafik für Inselleben 7: Seerosenmoor & Bambushain (ferne Orte), Regenbogen-Goldtopf, Irrlichter, Nistkästen,
// Umzugskartons, Marktstand, Gymnastik, Laternenumzug, eigenes Silvester-Feuerwerk, Floß und getragene Kartons.
import * as THREE from '../vendor/three.module.min.js';
import * as M from './models.js';
import { bm, bmv } from './blend.js';
import { makeNpc } from './npc.js';
import * as E from './extras7.js';
import { ITEMS, NPC_IDS } from './data.js';
import { AREAS } from './areas.js';
import { zoneOf, seasonOf } from './state.js';

const at = (q, X, Z) => (q.g.translate(X, 0, Z), q);
const hour = s => 6 + s.dayTime * 18;
const night = s => hour(s) >= 19 || hour(s) < 6.5;
const near = (tg, x, z, r) => Math.hypot(x - tg.x, z - tg.z) < r;

// ---------- Seerosenmoor ----------
// Böden sind unterteilt, damit die Krümmung der Welt mitgeht (sonst kippen große Flächen weg)
function buildMoor() {
  const g = new THREE.Group(), X = E.MOOR.x, Z = E.MOOR.z, P = E.POND7, parts = [], glow = [];
  const plane = (w, d, col, y) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d, Math.ceil(w / 2.5), Math.ceil(d / 2.5)), new THREE.MeshLambertMaterial({ color: col })); m.rotation.x = -Math.PI / 2; m.position.set(X, y, Z); g.add(m); return m; };
  plane(140, 140, 0x6b9a52, -0.03);
  plane(E.MOOR.w * 2 + 3, E.MOOR.d * 2 + 3, 0x7a9a4c, -0.015);
  const water = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshLambertMaterial({ color: 0x4f8f90, transparent: true, opacity: 0.92 }));
  water.rotation.x = -Math.PI / 2; water.scale.set(P.rx, P.rz, 1); water.position.set(X + P.x, 0.02, Z + P.z); g.add(water);
  const rim = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshLambertMaterial({ color: 0x5b6e3a }));
  rim.rotation.x = -Math.PI / 2; rim.scale.set(P.rx + 0.5, P.rz + 0.5, 1); rim.position.set(X + P.x, 0.005, Z + P.z); g.add(rim);
  // Steg: vom Tor im Süden über den Teich bis ans Nordufer
  for (let z = -P.rz - 1; z <= E.MOOR.d + 0.6; z += 0.5) parts.push(M.box(1.5, 0.08, 0.42, z % 1 ? 0xb08458 : 0xa07448, 0, 0.12, P.z + z));
  for (let z = -P.rz - 1; z <= P.rz + 1; z += 1.5) for (const x of [-0.7, 0.7]) parts.push(M.cyl(0.06, 0.06, 0.5, 0x7a5432, x, 0.05, P.z + z, 6));
  // Floß-Anleger
  parts.push(M.box(1.2, 0.1, 1.4, 0xa07448, E.RAFT[0] + 0.3, 0.1, E.RAFT[1]));
  // Schilf, Steine, Birken am Rand
  E.REEDS.forEach(([x, z]) => { for (let i = 0; i < 7; i++) { const a = i * 2.4, r = 0.15 + (i % 3) * 0.12; parts.push(M.cyl(0.02, 0.025, 1.1 + (i % 3) * 0.2, 0x8a9a4a, x + Math.cos(a) * r, 0.55, z + Math.sin(a) * r, 4)); if (i % 2) parts.push(M.cyl(0.045, 0.045, 0.22, 0x7a4a2a, x + Math.cos(a) * r, 1.15 + (i % 3) * 0.2, z + Math.sin(a) * r, 6)); } });
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, x = Math.cos(a) * (E.MOOR.w + 1.4), z = Math.sin(a) * (E.MOOR.d + 1.4); if (z > E.MOOR.d - 1 && Math.abs(x) < 3) continue; parts.push(i % 3 ? M.ball(0.6 + (i % 4) * 0.15, 0x5f8a44, x, 0.4, z, 1, 0.7, 1) : M.ball(0.4, 0x9a9a8a, x, 0.2, z, 1.2, 0.6, 1)); }
  for (const [x, z] of [[-10.5, -7], [10.4, -7.4], [-11, 2], [11, 3.5], [-6, 8], [6.4, 8]]) parts.push(M.cyl(0.11, 0.14, 3, 0xf2efe6, x, 1.5, z, 7), M.box(0.12, 0.04, 0.02, 0x333333, x, 1.1, z + 0.12), M.ball(1.1, 0x8fbf5a, x, 3.4, z, 1, 1.2, 1));
  // Tor im Süden
  parts.push(...[-1.4, 1.4].map(x => M.cyl(0.1, 0.12, 2.2, 0x7a5432, x, 1.1, E.MOOR.d + 0.6, 6)), M.box(3.1, 0.4, 0.12, 0xa07448, 0, 2.15, E.MOOR.d + 0.6));
  // Laternen am Steg
  for (const z of [E.MOOR.d - 1.5, P.z + P.rz + 1.3, P.z - P.rz - 1.3]) for (const x of [-1.05, 1.05]) { parts.push(M.cyl(0.04, 0.04, 1.2, 0x5a4a3a, x, 0.6, z, 6), M.box(0.2, 0.05, 0.2, 0x3a2a1a, x, 1.42, z)); glow.push(M.box(0.15, 0.2, 0.15, 0xffd890, x, 1.3, z)); }
  g.add(bmv('zone_moor', parts.map(q => at(q, X, Z)), glow.map(q => at(q, X, Z))));
  // bewegliche Teile
  const pads = E.LILIES.map(([x, z], i) => { const m = bm('moor_pad_' + i, [M.cyl(0.42, 0.42, 0.03, 0x4f9a3c, 0, 0, 0, 14), M.box(0.3, 0.035, 0.06, 0x4f8f90, 0.22, 0, 0, i)], [], false); m.position.set(X + x, 0.05, Z + z); m.rotation.y = i * 1.3; g.add(m); return m; });
  const blooms = E.LILIES.map(([x, z]) => { const m = bm('moor_bloom', [...Array.from({ length: 8 }, (_, k) => M.ball(0.09, k % 2 ? 0xffb7d0 : 0xffd8e6, Math.cos(k / 8 * Math.PI * 2) * 0.1, 0.06, Math.sin(k / 8 * Math.PI * 2) * 0.1, 1, 0.5, 1.6)), M.ball(0.05, 0xffe27a, 0, 0.1, 0)], [], false); m.position.set(X + x + 0.12, 0.06, Z + z - 0.05); g.add(m); return m; });
  const frogs = E.LILIES.map(() => { const m = bm('moor_frog', [M.ball(0.13, 0x6cc04a, 0, 0.1, 0, 1.1, 0.75, 1.2), M.ball(0.05, 0xffffff, -0.06, 0.2, 0.08), M.ball(0.05, 0xffffff, 0.06, 0.2, 0.08), M.ball(0.025, 0x222222, -0.06, 0.21, 0.12), M.ball(0.025, 0x222222, 0.06, 0.21, 0.12), M.box(0.26, 0.04, 0.08, 0x58a83a, 0, 0.03, -0.06)], [], false); g.add(m); return m; });
  const flies = E.DRAGON.map(() => { const m = bm('moor_dragonfly', [M.box(0.03, 0.03, 0.34, 0x3a8ad8, 0, 0, 0), M.box(0.36, 0.005, 0.07, 0xd8f0ff, 0, 0.01, 0.06), M.box(0.3, 0.005, 0.06, 0xd8f0ff, 0, 0.01, -0.02)], [], false); g.add(m); return m; });
  const raft = bm('moor_raft', [...[-0.45, -0.15, 0.15, 0.45].map(x => M.cyl(0.14, 0.14, 1.5, 0x9c6b3f, x, 0.06, 0, 8, Math.PI / 2)), M.box(1.1, 0.05, 0.12, 0x7a4a2a, 0, 0.2, 0.5), M.box(1.1, 0.05, 0.12, 0x7a4a2a, 0, 0.2, -0.5)]);
  g.add(raft);
  const fireflies = Array.from({ length: 14 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 5, 4), new THREE.MeshBasicMaterial({ color: 0xeaff8a })); g.add(m); return m; });
  g.userData = { pads, blooms, frogs, flies, raft, fireflies, day: -1, lights: [[X, Z + E.MOOR.d - 1.5], [X, Z + P.z + P.rz + 1.3], [X, Z + P.z - P.rz - 1.3]] };
  return g;
}
function updateMoor(zones, world, s, t) {
  const U = zones.moor7.userData, X = E.MOOR.x, Z = E.MOOR.z, M7 = s.moor || {}, sea = seasonOf(s.day), warm = sea !== 'winter';
  const frogs = warm ? E.frogPads(s.day) : [], blooms = sea === 'spring' || sea === 'summer' ? E.bloomPads(s.day) : [];
  U.pads.forEach((m, i) => { m.visible = warm || i % 2 === 0; m.position.y = 0.05 + Math.sin(t * 0.8 + i) * 0.01; });
  U.blooms.forEach((m, i) => { m.visible = blooms.includes(i) && M7.lily?.[i] !== s.day; });
  U.frogs.forEach((m, i) => {
    const on = frogs.includes(i) && M7.caught?.['f' + i] !== s.day, [x, z] = E.LILIES[i], hop = Math.max(0, Math.sin(t * 1.7 + i * 2.3)) ** 8;
    m.visible = on; if (!on) return;
    m.position.set(X + x - 0.1, 0.08 + hop * 0.35, Z + z + 0.05); m.rotation.y = Math.sin(t * 0.3 + i) * 1.2;
    if (near(world.target, X + x, Z + z, 6) && hop > 0.9 && Math.random() < 0.02) world.float(X + x, Z + z, 'Quak!', 0.8);
  });
  const awake = E.flyAwake(s);
  U.flies.forEach((m, i) => {
    const on = awake && warm && M7.caught?.['d' + i] !== s.day, [x, z] = E.DRAGON[i];
    m.visible = on; if (!on) return;
    const a = t * 1.3 + i * 2, j = Math.floor(t * 2 + i) % 3 === 0;
    m.position.set(X + x + Math.sin(a) * 0.8, 0.7 + Math.sin(t * 5 + i) * 0.15, Z + z + Math.cos(a * 0.7) * 0.6); m.rotation.y = a + Math.PI / 2;
    if (j) m.position.y += 0.05;
  });
  // Floß liegt am Anleger, außer jemand fährt (dann zeigt die Figur das Floß, siehe syncCarry7)
  U.raft.visible = !world.raftBusy7;
  U.raft.position.set(X + E.RAFT[0] + 0.9, 0.04 + Math.sin(t * 1.2) * 0.02, Z + E.RAFT[1]);
  const dark = night(s);
  U.fireflies.forEach((m, i) => { m.visible = dark && warm; if (!m.visible) return; const a = t * 0.4 + i * 1.7; m.position.set(X + Math.cos(a * 0.9 + i) * (4 + (i % 5) * 1.2), 0.5 + Math.sin(t * 1.3 + i) * 0.3, Z + Math.sin(a * 0.6) * (2 + (i % 4)) - 1); m.material.color.setHSL(0.2, 1, 0.5 + 0.3 * Math.max(0, Math.sin(t * 3 + i * 1.7))); });
  if (s.weather === 'fog' || hour(s) < 8) if (Math.random() < 0.25) world.burst(X + (Math.random() - 0.5) * 12, Z + E.POND7.z + (Math.random() - 0.5) * 6, 'mist', 0.25);
  const tg = world.target;
  world.tag('moorgate7', '🌼 Blütenwiese', X, 2.7, Z + E.MOOR.d + 0.6, 'name npc');
  if (near(tg, X + E.RAFT[0], Z + E.RAFT[1], 7)) world.tag('raft7', '🛶 Floß', X + E.RAFT[0] + 0.3, 1.2, Z + E.RAFT[1], 'name npc');
}

// ---------- Bambushain ----------
const bambooClump = (x, z, h, seed, cut) => {
  const out = [];
  for (let i = 0; i < 7; i++) {
    const a = seed + i * 2.2, r = 0.12 + (i % 3) * 0.14, bx = x + Math.cos(a) * r, bz = z + Math.sin(a) * r, hh = cut ? 0.35 + (i % 2) * 0.15 : h * (0.75 + (i % 4) * 0.12);
    out.push(M.cyl(0.055, 0.065, hh, i % 2 ? 0x7fbf4a : 0x6aac3e, bx, hh / 2, bz, 7));
    if (!cut) { for (let y = 0.6; y < hh; y += 0.55) out.push(M.cyl(0.07, 0.07, 0.04, 0x5a9a34, bx, y, bz, 7)); out.push(M.ball(0.3, 0x8fd068, bx, hh, bz, 1, 0.45, 1.3, 7), M.ball(0.22, 0x9adb72, bx + 0.15, hh - 0.4, bz, 1.3, 0.4, 0.8, 7)); }
  }
  return out;
};
function buildBambus() {
  const g = new THREE.Group(), X = E.BAMBUS.x, Z = E.BAMBUS.z, T = E.TEAHOUSE, parts = [], glow = [];
  const plane = (w, d, col, y, x = X, z = Z) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d, Math.ceil(w / 2.5), Math.ceil(d / 2.5)), new THREE.MeshLambertMaterial({ color: col })); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); g.add(m); return m; };
  plane(140, 140, 0x5f9a4a, -0.03);
  plane(E.BAMBUS.w * 2 + 3, E.BAMBUS.d * 2 + 3, 0x79b05a, -0.015);
  const p0 = T.z + T.d + 0.4, p1 = E.BAMBUS.d + 1;
  plane(1.8, p1 - p0, 0xd8d0c0, -0.005, X, Z + (p0 + p1) / 2); // Kiesweg
  // Trittsteine
  for (let z = T.z + T.d + 0.6; z < E.BAMBUS.d; z += 1.1) parts.push(M.cyl(0.36, 0.38, 0.06, 0xb0aaa0, (z % 2) * 0.2 - 0.1, 0.02, z, 9));
  // Steinlaternen
  E.LANTERNS.forEach(([x, z]) => { parts.push(M.cyl(0.2, 0.26, 0.12, 0x9a968c, x, 0.06, z, 6), M.cyl(0.08, 0.1, 0.55, 0xa8a49a, x, 0.4, z, 6), M.box(0.38, 0.06, 0.38, 0x9a968c, x, 0.7, z), M.cone(0.34, 0.24, 0x8a867c, x, 1.08, z, 4, 0, Math.PI / 4), M.ball(0.06, 0x8a867c, x, 1.22, z)); glow.push(M.box(0.24, 0.24, 0.24, 0xffcf80, x, 0.85, z)); });
  // Teehaus: Holzrahmen, Papierwände, geschwungenes Dach, Veranda
  parts.push(M.box(T.w * 2 + 0.4, 0.25, T.d * 2 + 0.9, 0x9c7a52, T.x, 0.12, T.z + 0.25), M.box(T.w * 2, 1.5, T.d * 2, 0xf6efdc, T.x, 1.0, T.z));
  for (const x of [-T.w, -T.w / 2, 0, T.w / 2, T.w]) parts.push(M.box(0.08, 1.6, 0.08, 0x6a4a2a, T.x + x, 1.0, T.z + T.d + 0.02));
  parts.push(M.box(T.w * 2, 0.06, 0.06, 0x6a4a2a, T.x, 1.25, T.z + T.d + 0.03), M.box(T.w * 2 + 1.2, 0.12, T.d * 2 + 1.4, 0x4a5a5a, T.x, 1.85, T.z), M.box(T.w * 2 + 0.4, 0.5, T.d * 2 + 0.6, 0x5a6a6a, T.x, 2.1, T.z), M.box(T.w * 1.2, 0.18, 0.4, 0x4a5a5a, T.x, 2.42, T.z));
  parts.push(M.box(1.1, 1.2, 0.05, 0xb85a4a, T.x, 0.85, T.z + T.d + 0.04)); // Vorhang am Eingang
  // Wasserspiel: Becken & Zulauf (das kippende Rohr bewegt sich)
  const [fx, fz] = E.FOUNTAIN;
  parts.push(M.cyl(0.5, 0.55, 0.25, 0x9a968c, fx, 0.12, fz, 10), M.cyl(0.05, 0.05, 0.9, 0x7a9a4a, fx + 0.5, 0.45, fz - 0.4, 6), M.cyl(0.04, 0.04, 0.7, 0x7a9a4a, fx + 0.35, 0.85, fz - 0.4, 6, 0, 0, Math.PI / 2.4));
  const pool = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), new THREE.MeshLambertMaterial({ color: 0x6ab8c8 }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(X + fx, 0.26, Z + fz); g.add(pool);
  // Zaun & Tor im Süden
  for (let x = -E.BAMBUS.w - 0.8; x <= E.BAMBUS.w + 0.8; x += 0.5) if (Math.abs(x) > 1.4) parts.push(M.cyl(0.04, 0.04, 0.9, 0x8fbf5a, x, 0.45, E.BAMBUS.d + 0.8, 6));
  parts.push(M.box(E.BAMBUS.w * 2 + 1.6, 0.04, 0.04, 0x6a8a3a, 0, 0.7, E.BAMBUS.d + 0.8));
  parts.push(...[-1.3, 1.3].map(x => M.cyl(0.13, 0.15, 2.6, 0xc8503a, x, 1.3, E.BAMBUS.d + 0.8, 8)), M.box(3.6, 0.2, 0.26, 0x3a2a2a, 0, 2.7, E.BAMBUS.d + 0.8), M.box(3.0, 0.14, 0.18, 0xc8503a, 0, 2.3, E.BAMBUS.d + 0.8));
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; parts.push(...bambooClump(Math.cos(a) * (E.BAMBUS.w + 3), Math.sin(a) * (E.BAMBUS.d + 3), 5, i, false)); }
  g.add(bmv('zone_bambus', parts.map(q => at(q, X, Z)), glow.map(q => at(q, X, Z))));
  const pipe = bm('bambus_pipe', [M.cyl(0.06, 0.06, 1.0, 0x8fbf5a, 0, 0, 0, 7, 0, 0, Math.PI / 2), M.cyl(0.03, 0.03, 0.3, 0x6a4a2a, 0, -0.15, 0, 5)]);
  pipe.position.set(X + fx - 0.2, 0.62, Z + fz - 0.4); g.add(pipe);
  const host = makeNpc('wanda'); host.position.set(X + T.x + 1.2, 0, Z + T.z + T.d + 0.9); host.rotation.y = 0.3; g.add(host);
  g.userData = { pipe, host, clumps: null, csig: '', shoots: null, ssig: '', lights: [[X, Z + 3.8], [X, Z - 3.6], [X + T.x, Z + T.z + T.d + 1]] };
  return g;
}
function updateBambus(zones, world, s, t) {
  const g = zones.bambus7, U = g.userData, X = E.BAMBUS.x, Z = E.BAMBUS.z, B = s.bambus || {};
  const csig = E.CLUMPS.map((_, i) => (B.cut?.[i] === s.day ? 1 : 0)).join('');
  if (U.csig !== csig) { if (U.clumps) g.remove(U.clumps); U.clumps = new THREE.Group(); E.CLUMPS.forEach(([x, z], i) => { const cut = B.cut?.[i] === s.day; U.clumps.add(bm(`bambus_clump_${i}${cut ? '_cut' : ''}`, bambooClump(x, z, 4.2, i * 3.1, cut).map(q => at(q, X, Z)))); }); g.add(U.clumps); U.csig = csig; }
  const sh = E.shootsToday(s.day).filter(i => B.dug?.[i] !== s.day), ssig = s.day + ':' + sh.join();
  if (U.ssig !== ssig) { if (U.shoots) g.remove(U.shoots); U.shoots = sh.length ? new THREE.Group() : null; for (const i of sh) { const [x, z] = E.SHOOT_SPOTS[i], m = bm('bambus_shoot', [M.cone(0.09, 0.32, 0xb8c86a, 0, 0.12, 0, 6), M.cone(0.07, 0.2, 0x8a9a4a, 0.06, 0.08, 0.04, 5)], [], false); m.position.set(X + x, 0, Z + z); U.shoots.add(m); } if (U.shoots) g.add(U.shoots); U.ssig = ssig; }
  // Wasserspiel: füllt sich langsam, kippt – klack!
  const ph = (t % 6) / 6, tip = ph > 0.9 ? Math.sin((ph - 0.9) / 0.1 * Math.PI) : 0;
  U.pipe.rotation.z = -0.25 + ph * 0.1 + tip * 0.75;
  const tg = world.target, [fx, fz] = E.FOUNTAIN;
  if (tip > 0.95 && !U.klack && near(tg, X + fx, Z + fz, 9)) { U.klack = 1; world.burst(X + fx, Z + fz, 'splash', 0.3); world.float(X + fx, Z + fz, 'Klack!', 1); world.onKlack?.(); } else if (tip < 0.5) U.klack = 0;
  U.host.userData.update?.(world.dt || 0.016, { speed: 0, time: t });
  if (Math.random() < 0.04) world.burst(X + (Math.random() - 0.5) * 18, Z + (Math.random() - 0.5) * 12, seasonOf(s.day) === 'autumn' ? 'fall' : 'petal', 3.5);
  world.tag('bamgate7', '🌲 Kiefernwald', X, 3.1, Z + E.BAMBUS.d + 0.8, 'name npc');
  if (near(tg, X, Z + E.TEAHOUSE.z, 9)) world.tag('teahouse7', '🍵 Teehaus', X, 3.0, Z + E.TEAHOUSE.z + E.TEAHOUSE.d, 'name npc');
}

export function zones7(zones, world, s, t, target) {
  const z = E.zone7(target.z), mid = target.x > -150 && target.x < 150;
  if (zones.moor7) zones.moor7.visible = mid && z === 'moor';
  if (zones.bambus7) zones.bambus7.visible = mid && z === 'bambus';
  if (!mid || !z) return false;
  if (z === 'moor') { if (!zones.moor7) { zones.moor7 = buildMoor(); zones.scene.add(zones.moor7); } updateMoor(zones, world, s, t); }
  else { if (!zones.bambus7) { zones.bambus7 = buildBambus(); zones.scene.add(zones.bambus7); } updateBambus(zones, world, s, t); }
  return true;
}
export const lights7 = (zones, target) => (target.z < -1050 ? zones.bambus7?.userData.lights || null : zones.moor7?.userData.lights || null);

// ---------- Auf der Insel ----------
const WISP = new THREE.MeshBasicMaterial({ color: 0xa8e8ff, transparent: true, opacity: 0.85 });
const BOX = () => bm('move_box', [M.box(0.5, 0.4, 0.45, 0xc99a62, 0, 0.2, 0), M.box(0.52, 0.03, 0.08, 0xe8d8b0, 0, 0.41, 0), M.box(0.18, 0.12, 0.01, 0xffffff, 0.08, 0.25, 0.23)]);
export function updateIsland7(world, s, t) {
  const tg = world.target, z = zoneOf(tg), onIsle = z === 'island';
  // Regenbogen: Goldtopf glitzert am Ende
  const P = s.rbpot;
  if (onIsle && P && !P.found && E.rainbowNow(s) && near(tg, P.at[0], P.at[1], 14)) { world.tag('rbpot7', '🌈', P.at[0], 0.7 + Math.sin(t * 3) * 0.12, P.at[1], 'bubble'); if (Math.random() < 0.15) world.burst(P.at[0], P.at[1], 'sparkle', 0.3); }
  // Irrlichter an Nebelmorgen
  const W = world.wisps7 ||= Array.from({ length: E.WISPS }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), WISP); m.visible = false; world.scene.add(m); return m; });
  const wt = onIsle && E.wispTime(s);
  W.forEach((m, i) => { const on = wt && s.wisps?.[i] !== s.day; m.visible = on; if (!on) return; const p = E.wispPos(s, i, s.time); m.position.set(p.x, p.y, p.z); m.scale.setScalar(1 + Math.sin(t * 6 + i) * 0.2); if (Math.random() < 0.2) world.burst(p.x, p.z, 'sparkle', p.y); });
  // Nistkästen: wer wohnt drin?
  if (onIsle) for (const [k, N] of Object.entries(s.nests || {})) {
    if (!N.st || s.obj?.[k]?.k !== 'nistkasten') continue;
    const [x, zz] = k.split(',').map(Number);
    if (near(tg, x, zz, 8)) world.tag('nest7' + k, N.st === 1 ? '🐦' : N.st === 2 ? '🥚' : '🐣', x, 1.75 + Math.abs(Math.sin(t * 2 + x)) * 0.08, zz, 'bubble');
  }
  // Umzugskartons
  const MV = s.moving, BX = world.boxes7 ||= { m: [], sig: '' };
  const held = MV ? Object.values(MV.hold) : [], sig = onIsle && MV ? MV.boxes.map((b, i) => (b && !held.includes(i) ? b.join(',') : '')).join('|') : '';
  if (BX.sig !== sig) {
    for (const m of BX.m) world.scene.remove(m);
    BX.m = sig ? MV.boxes.flatMap((b, i) => (b && !held.includes(i) ? [b] : [])).map(([x, zz], i) => { const m = BOX(); m.position.set(x, 0, zz); m.rotation.y = i * 0.7; world.scene.add(m); return m; }) : [];
    BX.sig = sig;
  }
  if (onIsle && MV) { const [hx, hz] = MV.home.split(',').map(Number); if (near(tg, hx, hz, 16)) world.tag('movehome7', `📦 ${MV.done}/${MV.boxes.length}`, hx, 2.6, hz, 'bubble'); }
  // Marktstand
  if (onIsle) for (const [k, o] of Object.entries(s.obj || {})) {
    if (o?.k !== 'marktstand') continue;
    const [x, zz] = k.split(',').map(Number);
    if (!near(tg, x, zz, 12)) continue;
    const M7 = s.market?.day === s.day && s.market.k === k ? s.market : null;
    if (M7 && !M7.closed) { const sold = E.marketSales(s, M7), n = sold.reduce((a, b) => a + b, 0) - M7.paid.reduce((a, b) => a + b, 0); world.tag('mk7' + k, n > 0 ? `🪙 ${n}` : M7.items.map(i => ITEMS[i.id]?.icon).join(''), x, 1.9, zz, 'bubble'); }
    else if (E.marketOpen(s)) world.tag('mk7' + k, '🧺 Markt!', x, 1.9 + Math.sin(t * 3) * 0.05, zz, 'bubble');
  }
  // Feste auf dem Dorfplatz
  if (onIsle) {
    if (E.paradeTime(s) && s.parade?.done !== s.day && near(tg, E.PARADE_AT[0], E.PARADE_AT[1], 18)) world.tag('parade7', '🏮 Laternenumzug', E.PARADE_AT[0], 1.6 + Math.sin(t * 2) * 0.06, E.PARADE_AT[1], 'name npc');
    if (E.fwTime(s) && s.newyear?.day !== s.day && near(tg, E.FW_AT[0], E.FW_AT[1], 18)) world.tag('fw7', '🎆 Countdown', E.FW_AT[0], 1.6 + Math.sin(t * 2) * 0.06, E.FW_AT[1], 'name npc');
    if (E.gymTime(s) && near(tg, E.GYM_AT[0], E.GYM_AT[1], 16)) world.tag('gym7', '🤸 Morgengymnastik', E.GYM_AT[0], 1.5, E.GYM_AT[1], 'name npc');
  }
  // Wege in Moor & Bambushain (Nordrand von Blütenwiese und Kiefernwald)
  gateSigns(world, s, t, tg, z);
  // Laternenumzug: Laternen über den Nachbarn
  if (world.parade7) for (const id of NPC_IDS) { const n = world.npcM?.get(id); if (n && near(tg, n.x, n.z, 14)) world.tag('pl7' + id, Math.sin(t * 3 + id.length) > 0.6 ? '🏮🎶' : '🏮', n.x, (n.m.userData.headTop || 1.3) + 0.7 + Math.sin(t * 4 + id.length) * 0.06, n.z, 'bubble'); }
}
function gateSigns(world, s, t, tg, z) {
  const G = world.gates7 ||= {};
  for (const [k, area, open, sub] of [['moor', 'wiese', !!s.moor?.open, `🪵 Steg ${s.moor?.steg || 0}/${E.STEG_DAYS}`], ['bambus', 'wald', !!s.bambus?.open, '⛩️ Bambustor']]) {
    const A = AREAS[area], x = A.x, zz = A.z - A.d, here = z === area && near(tg, x, zz, 14), sig = here ? `${open}|${s.moor?.steg || 0}` : '';
    if (G[k]?.sig !== sig) {
      if (G[k]?.m) world.scene.remove(G[k].m);
      let m = null;
      if (here) {
        const parts = [M.cyl(0.07, 0.08, 1.4, 0x7a5432, -1.2, 0.7, -0.4, 6), M.box(0.9, 0.42, 0.06, 0xf2e6c9, -1.2, 1.3, -0.36)];
        if (k === 'moor') { const n = open ? 6 : (s.moor?.steg || 0) * 2; for (let i = 0; i < n; i++) parts.push(M.box(1.4, 0.07, 0.4, i % 2 ? 0xb08458 : 0xa07448, 0, 0.06, -0.3 - i * 0.45)); }
        else parts.push(...[-1.1, 1.1].map(xx => M.cyl(0.1, 0.12, 2.2, 0xc8503a, xx, 1.1, -0.5, 8)), M.box(2.9, 0.16, 0.22, 0x3a2a2a, 0, 2.25, -0.5), ...(open ? [] : [M.box(2.1, 1.2, 0.06, 0x8fbf5a, 0, 0.6, -0.5)]));
        m = bm(k === 'moor' ? 'gate_moor_' + (open ? 6 : (s.moor?.steg || 0) * 2) : 'gate_bambus' + (open ? '_open' : ''), parts); m.position.set(x, 0, zz); world.scene.add(m);
      }
      G[k] = { m, sig };
    }
    if (here) world.tag('gate7' + k, open ? (k === 'moor' ? '🪷 Seerosenmoor' : '🎋 Bambushain') : k === 'moor' ? `🪷 ${sub}` : sub, x, k === 'moor' ? 1.9 : 2.8, zz - 0.4, 'name npc');
  }
}

// ---------- Nachbarn: Gymnastik in Reihen, beim Umzug hinterher ----------
export const npcUp7 = (world, s) => E.gymTime(s) || !!world.parade7;
export function npcOverride7(world, s, id) {
  const g = E.gymSpot(s, id);
  if (g) return g;
  const P = world.parade7;
  if (P) { const i = NPC_IDS.indexOf(id), p = P.trail[Math.min(P.trail.length - 1, (i + 1) * 5)]; if (p && i >= 0) return { x: p[0] + Math.sin(i * 2.1) * 0.35, z: p[1] + Math.cos(i * 1.7) * 0.35, walking: true }; }
  return null;
}

// ---------- getragener Karton & Floß unter der Figur ----------
export function syncCarry7(world, e, box, raft) {
  if (box && !e.box7) { e.box7 = BOX(); e.box7.scale.setScalar(0.8); world.scene.add(e.box7); }
  if (e.box7) { e.box7.visible = box; if (box) { e.box7.position.set(e.x + Math.sin(e.ry) * 0.25, e.m.position.y + 1.05, e.z + Math.cos(e.ry) * 0.25); e.box7.rotation.y = e.ry; } }
  if (raft && !e.raft7) { e.raft7 = bm('ride_raft', [...[-0.45, -0.15, 0.15, 0.45].map(x => M.cyl(0.14, 0.14, 1.5, 0x9c6b3f, x, 0.06, 0, 8, Math.PI / 2)), M.box(1.1, 0.05, 0.12, 0x7a4a2a, 0, 0.2, 0.5)]); world.scene.add(e.raft7); }
  if (e.raft7) { e.raft7.visible = raft; if (raft) { e.raft7.position.set(e.x, 0.04, e.z); e.raft7.rotation.y = e.ry; if (Math.random() < 0.2) world.burst(e.x - Math.sin(e.ry) * 0.7, e.z - Math.cos(e.ry) * 0.7, 'ripple', 0.05); } }
}

// ---------- Feuerwerk mit Form (Herz, Stern, Ring, Trauerweide) ----------
export function rocket7(world, x, z, h, col, shape) {
  const c = new THREE.Color(col), light = c.clone().lerp(new THREE.Color(0xffffff), 0.55);
  world.parts.push({ x, y: 0.5, z, vx: (Math.random() - 0.5) * 0.4, vy: h * 0.95, vz: (Math.random() - 0.5) * 0.4, g: h * 0.45, size: 0.16, life: 1.05, age: 0, c: new THREE.Color(0xfff3c4), fw: 1, boom: [c.getHex(), light.getHex()], shape });
}
export function burstShape(world, p) {
  const [a, b] = p.boom, rx = Math.cos(world.yaw || 0), rz = -Math.sin(world.yaw || 0), pts = [];
  if (p.shape === 'herz') for (let i = 0; i < 90; i++) { const u = i / 90 * Math.PI * 2; pts.push([16 * Math.sin(u) ** 3 / 16, (13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u)) / 16]); }
  else if (p.shape === 'stern') for (let i = 0; i < 100; i++) { const k = Math.floor(i / 20), f = (i % 20) / 20, a0 = k / 5 * Math.PI * 2 + Math.PI / 2, a1 = (k + 0.5) / 5 * Math.PI * 2 + Math.PI / 2, r0 = f < 0.5 ? 1 : 0.42, r1 = f < 0.5 ? 0.42 : 1, ff = (f % 0.5) * 2, A = f < 0.5 ? a0 : a1, B = f < 0.5 ? a1 : a0 + Math.PI * 2 / 5; pts.push([Math.cos(A) * r0 * (1 - ff) + Math.cos(B) * r1 * ff, Math.sin(A) * r0 * (1 - ff) + Math.sin(B) * r1 * ff]); }
  if (pts.length) for (const [j, [px, py]] of pts.entries()) { if (world.parts.length >= 1300) break; const sp = 5.2; world.parts.push({ x: p.x, y: p.y, z: p.z, vx: px * rx * sp, vy: py * sp, vz: px * rz * sp, g: 0.6, drag: 1.0, size: 0.22, life: 1.9, age: 0, c: new THREE.Color(j % 3 ? a : b), fw: 1 }); }
  else {
    const ring = p.shape === 'ring', willow = p.shape === 'weide';
    for (let i = 0; i < 120 && world.parts.length < 1300; i++) {
      const u = ring ? (Math.random() - 0.5) * 0.1 : Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u), sp = willow ? 3.6 + Math.random() : 5.5 + Math.random() * 1.2;
      world.parts.push({ x: p.x, y: p.y, z: p.z, vx: Math.cos(th) * r * sp, vy: u * sp + (willow ? 1.5 : 0), vz: Math.sin(th) * r * sp, g: willow ? 3.2 : 1.3, drag: 1.0, size: 0.24, life: willow ? 3 + Math.random() : 1.8 + Math.random() * 0.7, age: 0, c: new THREE.Color(i % 3 ? a : b), fw: 1 });
    }
  }
  world.fwFlash = { t: world.time, c: new THREE.Color(a) };
  world.onBoom?.(p.x, p.y, p.z);
}

// Für den Blender-Bauplan (tools/capture-world.py): Kartons, Floß, Tor-Zustände, geschnittener Bambus
export function __capture() {
  const W = { scene: { add() {}, remove() {} }, tag() {}, burst() {} };
  BOX();
  syncCarry7(W, { x: 0, z: 0, ry: 0, m: { position: { y: 0 } } }, false, true);
  for (const open of [false, true]) for (let steg = 0; steg <= E.STEG_DAYS; steg++) {
    const s = { moor: { open, steg }, bambus: { open } };
    W.gates7 = {};
    for (const area of ['wiese', 'wald']) { const A = AREAS[area]; gateSigns(W, s, 0, { x: A.x, z: A.z - A.d }, area); }
  }
  const X = E.BAMBUS.x, Z = E.BAMBUS.z;
  E.CLUMPS.forEach(([x, z], i) => { for (const cut of [false, true]) bm(`bambus_clump_${i}${cut ? '_cut' : ''}`, bambooClump(x, z, 4.2, i * 3.1, cut).map(q => at(q, X, Z))); });
}
