// Grafik für Inselleben 9: lebendige Gebiete. Mehr Natur (Farne, Moossteine, Baumstämme, Lichtstrahlen, Blumeninseln,
// Wasserfall in der Höhle), Tiere (Rehe, Hasen, Schmetterlinge, Bienen, Fledermäuse, Glühwürmchen), die Bewohner
// Eule Oskar, Hummel Hilde und Maulwurf Grubi, Fundstücke und die Ereignisse (weißer Hirsch, Pilzkreis, Schmetterlingstanz, Kristallklang).
import * as THREE from '../vendor/three.module.min.js';
import * as M from './models.js';
import { bm, bmv } from './blend.js';
import { placeable } from './nature.js';
import { model } from './assets.js';
import { itemModel } from './itemmodels.js';
import { AREAS, NODES } from './areas.js';
import * as E from './extras9.js';

const hourOf = s => 6 + s.dayTime * 18;
const put = (g, m, x, z, ry = 0, y = 0) => { m.position.set(x, y, z); m.rotation.y = ry; g.add(m); return m; };
const at = (parts, X, Z) => parts.map(q => (q.g.translate(X, 0, Z), q));
const free = (id, x, z, r = 1.3) => !NODES[id].some(n => Math.hypot(n.x - x, n.z - z) < r) && Math.abs(x) > 1.6;

// ---------- Modelle ----------
const OWL = () => bmv('zone9_owl', [M.cyl(0.42, 0.5, 0.55, 0x8a5a36, 0, 0.27, 0, 12), M.cyl(0.4, 0.4, 0.02, 0xd9a86c, 0, 0.555, 0, 12), M.ball(0.3, 0x9a7a5a, 0, 0.86, 0, 1, 1.15, 0.9),
  M.ball(0.2, 0xe8d8c0, 0, 0.8, 0.14, 1, 1.2, 0.6), ...[-1, 1].flatMap(s => [M.ball(0.1, 0xffffff, s * 0.1, 1.02, 0.2), M.ball(0.055, 0x2b2222, s * 0.1, 1.02, 0.27), M.cone(0.05, 0.14, 0x7a5a3a, s * 0.16, 1.2, 0, 4, 0, 0, -s * 0.3), M.ball(0.12, 0x7a5a3a, s * 0.27, 0.82, 0, 0.5, 1.1, 0.9)]),
  M.cone(0.035, 0.08, 0xffb02a, 0, 0.94, 0.27, 4, Math.PI / 2), M.ball(0.12, 0x6cc06a, 0.3, 0.6, 0.25, 1, 0.5, 1)], [M.ball(0.03, 0xfff2a0, -0.33, 0.62, 0.3), M.ball(0.03, 0xfff2a0, 0.35, 0.65, 0.18)]);
const BEE = () => { const m = bm('zone9_bee', [M.ball(0.26, 0xffc83a, 0, 0, 0, 1.25, 1, 1), ...[-0.1, 0.1].map(x => M.cyl(0.255, 0.255, 0.06, 0x3a2a1a, x, 0, 0, 12, 0, 0, Math.PI / 2)), M.ball(0.17, 0x3a2a1a, 0.3, 0.04, 0),
  ...[-1, 1].flatMap(s => [M.ball(0.045, 0xffffff, 0.42, 0.1, s * 0.08), M.ball(0.025, 0x2b2222, 0.45, 0.1, s * 0.08), M.cyl(0.008, 0.008, 0.16, 0x3a2a1a, 0.38, 0.24, s * 0.06, 4, s * 0.4)]), M.ball(0.06, 0xff9ab8, 0.4, 0.0, 0.1, 1, 0.6, 0.4)], [], false);
  const wings = [-1, 1].map(s => { const w = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshLambertMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.7 })); w.scale.set(0.9, 0.12, 0.55); w.position.set(-0.02, 0.24, s * 0.16); m.add(w); return w; });
  m.userData.wings = wings; return m; };
const MOLE = () => bmv('zone9_mole', [M.ball(0.34, 0x5a5262, 0, 0.36, 0, 1, 1.05, 1.1), M.ball(0.22, 0x6a6272, 0, 0.62, 0.16), M.ball(0.06, 0xff9ab8, 0, 0.6, 0.38), ...[-1, 1].flatMap(s => [M.ball(0.03, 0x1a1a1a, s * 0.08, 0.7, 0.33), M.ball(0.09, 0xffb8c8, s * 0.3, 0.3, 0.26, 1, 0.5, 1.2)]),
  M.cyl(0.24, 0.26, 0.1, 0xffc83a, 0, 0.82, 0.08, 12), M.ball(0.22, 0xffc83a, 0, 0.84, 0.08, 1, 0.55, 1), M.cyl(0.3, 0.3, 0.02, 0xffc83a, 0, 0.78, 0.1, 14),
  M.box(0.85, 0.42, 0.55, 0x8a6a4a, 0.85, 0.3, -0.1), M.box(0.9, 0.05, 0.6, 0x5a4a3a, 0.85, 0.52, -0.1), ...[0.6, 1.1].flatMap(x => [-0.32, 0.12].map(z => M.cyl(0.1, 0.1, 0.05, 0x3a3a44, x, 0.1, z, 10, Math.PI / 2))),
  M.box(1.8, 0.04, 0.08, 0x8a8a9a, 0.85, 0.02, -0.38), M.box(1.8, 0.04, 0.08, 0x8a8a9a, 0.85, 0.02, 0.18)],
  [M.cyl(0.06, 0.07, 0.06, 0xfff2a0, 0, 0.86, 0.32, 10, Math.PI / 2), M.cone(0.1, 0.22, 0xc9a8ff, 0.7, 0.68, -0.1, 5), M.cone(0.08, 0.18, 0x8fd4ff, 0.95, 0.65, 0.0, 5), M.cone(0.07, 0.16, 0xff9ad8, 1.05, 0.62, -0.2, 5)]);
const DEER = (white) => bm(white ? 'zone9_stag' : 'zone9_deer', [M.ball(0.38, white ? 0xfaf8f2 : 0xb07a4a, 0, 0.78, 0, 1.4, 0.8, 0.8), M.cyl(0.08, 0.1, 0.42, white ? 0xfaf8f2 : 0xb07a4a, 0.42, 1.05, 0, 6, 0, 0, -0.6),
  M.ball(0.16, white ? 0xffffff : 0xb88a5a, 0.62, 1.28, 0, 1.3, 0.9, 0.9), M.ball(0.05, 0x2b2222, 0.8, 1.27, 0), ...[-1, 1].flatMap(s => [M.ball(0.025, 0x2b2222, 0.68, 1.33, s * 0.09), M.ball(0.07, white ? 0xffe8f0 : 0xa06a3a, 0.55, 1.42, s * 0.12, 0.5, 1, 0.3)]),
  ...[[-0.35, -0.16], [-0.35, 0.16], [0.32, -0.16], [0.32, 0.16]].map(([x, z]) => M.cyl(0.04, 0.035, 0.6, white ? 0xf2eee6 : 0x9a6a3a, x, 0.3, z, 6)), M.ball(0.07, 0xffffff, -0.52, 0.86, 0),
  ...(white ? [-1, 1].flatMap(s => [M.cyl(0.02, 0.025, 0.36, 0xffe08a, 0.58, 1.55, s * 0.1, 5, s * 0.35), M.cyl(0.018, 0.02, 0.2, 0xffe08a, 0.66, 1.66, s * 0.2, 5, s * 0.9, 0, -0.5), M.cyl(0.018, 0.02, 0.18, 0xffe08a, 0.5, 1.7, s * 0.18, 5, s * 0.6, 0, 0.6)])
    : [...Array.from({ length: 5 }, (_, i) => M.ball(0.035, 0xfff4e0, -0.2 + i * 0.1, 0.98, (i % 2 - 0.5) * 0.2))])], [], false);
const BUNNY = c => bm('zone9_bunny_' + c.toString(16), [M.ball(0.18, c, 0, 0.18, 0, 1.2, 0.95, 1), M.ball(0.12, c, 0.18, 0.3, 0), M.ball(0.06, 0xffffff, -0.22, 0.2, 0), ...[-1, 1].flatMap(s => [M.ball(0.04, c, 0.15, 0.48, s * 0.05, 0.6, 2.2, 0.5), M.ball(0.018, 0x2b2222, 0.27, 0.33, s * 0.05)]), M.ball(0.02, 0xff9ab8, 0.3, 0.3, 0)], [], false);
const BAT = () => { const m = bm('zone9_bat', [M.ball(0.1, 0x3a3048, 0, 0, 0, 1, 1.1, 1), ...[-1, 1].map(s => M.cone(0.03, 0.06, 0x3a3048, 0.04, 0.1, s * 0.05, 4))], [], false);
  m.userData.wings = [-1, 1].map(s => { const w = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 4), new THREE.MeshLambertMaterial({ color: 0x4a3e5a })); w.scale.set(0.6, 0.06, 1); w.position.set(0, 0.02, s * 0.2); m.add(w); return w; }); return m; };
const FLY = col => { const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }); g.userData.wings = [-1, 1].map(s => { const w = new THREE.Mesh(new THREE.CircleGeometry(0.09, 6), mat); w.position.z = s * 0.06; w.rotation.x = -Math.PI / 2; g.add(w); return w; }); return g; };
const ORB = (r, c) => new THREE.Mesh(new THREE.SphereGeometry(r, 5, 4), new THREE.MeshBasicMaterial({ color: c }));
const CRYSTAL = (c, k) => bmv('zone9_chime_' + k, [M.ball(0.45, 0x6a6078, 0, 0.16, 0, 1.2, 0.45, 1, 8)], [M.cone(0.16, 1.3, c, 0, 0.75, 0, 6), M.cone(0.11, 0.8, c, 0.2, 0.45, 0.06, 6, 0, 0, -0.35), M.cone(0.1, 0.7, c, -0.18, 0.42, -0.05, 6, 0.2, 0, 0.4)]);
export const CHIME_COLS = [0xff8fc8, 0x8fd4ff, 0xffe066];

// weicher Fleck auf dem Boden (Moos, Nadeln, Blütenteppich, Leuchtmoos) – Rand läuft weich aus
let SOFT = null;
function softTex() {
  if (SOFT || typeof document === 'undefined') return SOFT;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'); if (!x) return null;
  const g = x.createRadialGradient(32, 32, 4, 32, 32, 31); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return (SOFT = new THREE.CanvasTexture(c));
}
function patches(g, id, X, Z, rnd) {
  const map = softTex(), A = AREAS[id], cols = { wald: [0x4f8f3c, 0x8a6a3a, 0x5fa04a, 0x3f7a34], wiese: [0xb8e070, 0x9ad468, 0xd8f08a, 0x7cc85a], hoehle: [0x4fd0a0, 0x8a7ad8, 0x5ad0c8] }[id];
  if (!map) return;
  for (let i = 0; i < (id === 'hoehle' ? 10 : 22); i++) {
    const r = 0.9 + rnd() * 1.8, mat = id === 'hoehle' ? new THREE.MeshBasicMaterial({ color: cols[i % cols.length], map, transparent: true, opacity: 0.35, depthWrite: false }) : new THREE.MeshLambertMaterial({ color: cols[i % cols.length], map, transparent: true, opacity: 0.55, depthWrite: false });
    const m = new THREE.Mesh(M.disc(r, 20, 1), mat);
    m.rotation.x = -Math.PI / 2; m.rotation.z = rnd() * 6; m.scale.y = 0.6 + rnd() * 0.5;
    m.position.set(X + (rnd() * 2 - 1) * (A.w + 1), 0.004 + i * 0.0004, Z + (rnd() * 2 - 1) * (A.d + 1)); m.renderOrder = -1;
    g.add(m);
  }
}
// ---------- feste Deko & Bewohner (einmal beim Bau des Gebiets) ----------
export function decorateArea9(g, id) {
  const A = AREAS[id], X = A.x, Z = A.z, W = A.w, D = A.d, parts = [], glow = [];
  const rnd = (i => () => ((i = Math.imul(i, 48271) % 2147483647) / 2147483647))(id.length * 1234 + 17);
  const U = g.userData.n9 = { anim: [], finds: new Map(), lights: [] };
  patches(g, id, X, Z, rnd); // Bodenflecken: Moos & Nadeln, Blütenteppich, Leuchtmoos
  const C = E.CREATURES[id], cx = X + C.at[0], cz = Z + C.at[1];
  if (id === 'wald') {
    // Farne und Moossteine am Rand, zwei umgefallene Stämme, Pilzkreis (nachts), Lichtstrahlen
    for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2, x = Math.cos(a) * (W - 0.4 - rnd() * 1.5), z = Math.sin(a) * (D - 0.4 - rnd() * 1.2); if (!free(id, x, z, 1.2) || (z > D - 2 && Math.abs(x) < 3)) continue; const f = placeable('farnbusch'); f.scale.setScalar(0.7 + rnd() * 0.5); put(g, f, X + x, Z + z, rnd() * 6); }
    for (const [x, z, ry] of [[-W + 0.8, 2.5, 0.3], [W - 0.9, -3.2, -0.5]]) parts.push(M.cyl(0.28, 0.3, 2.6, 0x8a5a36, x, 0.26, z, 10, 0, ry, Math.PI / 2), M.cyl(0.22, 0.22, 0.02, 0xd9a86c, x + Math.cos(ry) * 1.31, 0.26, z - Math.sin(ry) * 1.31, 10, 0, ry, Math.PI / 2), M.ball(0.3, 0x5fa84a, x, 0.5, z, 2.4, 0.4, 0.8));
    for (let i = 0; i < 9; i++) { const x = (rnd() * 2 - 1) * (W - 1), z = (rnd() * 2 - 1) * (D - 1); if (!free(id, x, z)) continue; parts.push(M.ball(0.3 + rnd() * 0.2, 0x8a8e88, x, 0.12, z, 1.3, 0.6, 1, 7), M.ball(0.22, 0x6cb04a, x, 0.26, z - 0.05, 1.3, 0.35, 1, 7)); }
    U.ring = bmv('zone9_ring', [...Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2; return M.cyl(0.04, 0.05, 0.16, 0xfff2e0, Math.cos(a) * 1.15, 0.08, Math.sin(a) * 1.15, 6); })],
      Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2; return M.ball(0.13, i % 2 ? 0x9ff0ff : 0xc9a8ff, Math.cos(a) * 1.15, 0.2, Math.sin(a) * 1.15, 1, 0.55, 1); }));
    put(g, U.ring, X + E.RING_AT[0], Z + E.RING_AT[1]);
    U.stag = put(g, DEER(true), X + E.STAG_AT[0], Z + E.STAG_AT[1], -0.7);
    U.shafts = Array.from({ length: 5 }, (_, i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.3, 9, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide })); m.rotation.z = 0.35; m.position.set(X - 7 + i * 3.6, 3.6, Z - 4 + (i % 3) * 3.2); g.add(m); return m; });
    U.deer = [0, 1].map(i => ({ m: put(g, DEER(false), X - W + 2 + i * 3, Z + D - 2), x: X - W + 2 + i * 3, z: Z + D - 2, tx: 0, tz: 0, sp: 0.6, k: 'deer' }));
    U.critters = U.deer;
  } else if (id === 'wiese') {
    // Blumeninseln, Fliederbüsche, alter Baum mit Schaukel, Zaun im Süden, Hasen, Bienen, Schmetterlinge
    for (const [x, z] of [[-W + 1.2, -D + 1.6], [W - 1.2, -D + 1.8], [-W + 1, D - 2.2], [W - 1.4, 0.5], [-W + 1.2, -1.2]]) { const f = placeable(rnd() < 0.5 ? 'fliederbusch' : 'rosenstrauch'); put(g, f, X + x, Z + z, rnd() * 6); }
    for (let i = 0; i < 40; i++) { const x = (rnd() * 2 - 1) * (W - 0.6), z = (rnd() * 2 - 1) * (D - 0.6); if (!free(id, x, z, 0.8)) continue; const c = [0xff8fab, 0xffe066, 0xffffff, 0xb39cff, 0x6cb4ff][i % 5]; for (let k = 0; k < 3; k++) parts.push(M.ball(0.06, c, x + (k - 1) * 0.12, 0.2 + (k % 2) * 0.05, z + (k % 2) * 0.1), M.cyl(0.01, 0.01, 0.2, 0x6ab83a, x + (k - 1) * 0.12, 0.1, z + (k % 2) * 0.1, 4)); }
    const tx = -W - 1.6, tz = -D + 4;
    parts.push(M.cyl(0.35, 0.5, 2.6, 0x8a5a36, tx, 1.3, tz, 10), M.cyl(0.12, 0.16, 1.6, 0x8a5a36, tx + 0.6, 2.6, tz, 8, 0, 0, -0.9), M.ball(1.6, 0x5fb84a, tx, 3.4, tz, 1.3, 0.9, 1.2, 10), M.ball(1.1, 0x6cc85a, tx + 1.2, 3.0, tz + 0.4, 1, 0.9, 1, 9),
      ...[-0.3, 0.3].map(z => M.cyl(0.012, 0.012, 1.9, 0xd9c08a, tx + 1.35, 1.55, tz + z, 4)), M.box(0.35, 0.05, 0.75, 0xd9a86c, tx + 1.35, 0.6, tz));
    for (let x = -W; x <= W; x += 1.2) if (Math.abs(x) > 2.4) parts.push(M.box(0.08, 0.6, 0.08, 0xfff3e0, x, 0.3, D + 0.6), M.box(1.2, 0.06, 0.05, 0xfff3e0, x + 0.6, 0.45, D + 0.6));
    U.bees = Array.from({ length: 6 }, (_, i) => { const n = NODES.wiese.filter(n => n.kind === 'hive')[i % 4], m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffc83a })); m.userData = { x: X + n.x, z: Z + n.z, p: i * 1.7 }; g.add(m); return m; });
    U.flies = Array.from({ length: 10 }, (_, i) => { const m = FLY([0xff8fab, 0xffe066, 0x8fd4ff, 0xffffff, 0xc9a8ff][i % 5]); m.userData.p = i * 2.1; m.userData.c = [X + (rnd() * 2 - 1) * (W - 2), Z + (rnd() * 2 - 1) * (D - 2)]; g.add(m); return m; });
    U.swarm = Array.from({ length: 24 }, (_, i) => { const m = FLY([0xff8fab, 0xffd23f, 0x8fd4ff, 0xc9a8ff, 0xffffff, 0xff9a3a][i % 6]); m.scale.setScalar(1.2); m.userData.p = i / 24 * Math.PI * 2; g.add(m); return m; });
    U.critters = [0xfff6ee, 0xc8a07a, 0xe8e0d8].map((c, i) => ({ m: put(g, BUNNY(c), X - 6 + i * 5, Z + 2), x: X - 6 + i * 5, z: Z + 2, tx: 0, tz: 0, sp: 1.2, k: 'bunny' }));
  } else {
    // Wasserfall in den See, Glühwurm-Punkte an den Wänden, Fledermäuse, Kristalle zum Anschlagen, Klangstein
    const lx = -W + 2.2, lz = -D + 2;
    parts.push(M.ball(1.3, 0x6e6478, lx - 0.4, 2.2, lz - 1.6, 1.3, 1.6, 0.8, 8), M.ball(0.5, 0x7e748a, lx + 0.6, 0.25, lz - 1.2, 1.2, 0.5, 1, 7));
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 2.6, 1, 8), new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
    fall.position.set(X + lx - 0.2, 1.3, Z + lz - 1.1); g.add(fall); U.fall = fall;
    for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2; if (Math.sin(a) > 0.6 && Math.abs(Math.cos(a)) < 0.3) continue; glow.push(M.ball(0.04, 0x9ff0ff, Math.cos(a) * (W + 1.0), 1.6 + rnd() * 1.6, Math.sin(a) * (D + 0.9))); }
    CHIME_COLS.forEach((c, k) => { const [x, z] = E.CHIME_CRYSTALS[k]; (U.chime ||= [])[k] = put(g, CRYSTAL(c, k), X + x, Z + z, k * 1.3); });
    parts.push(M.cyl(0.5, 0.58, 0.28, 0x8a8094, E.CHIME_STONE[0], 0.14, E.CHIME_STONE[1], 12), M.cyl(0.46, 0.46, 0.02, 0x9a90a4, E.CHIME_STONE[0], 0.29, E.CHIME_STONE[1], 12));
    glow.push(...[0, 1, 2].map(k => M.ball(0.07, CHIME_COLS[k], E.CHIME_STONE[0] + Math.cos(k * 2.1) * 0.25, 0.31, E.CHIME_STONE[1] + Math.sin(k * 2.1) * 0.25, 1, 0.3, 1)));
    U.bats = Array.from({ length: 6 }, (_, i) => { const m = BAT(); m.userData.p = i * 1.05; g.add(m); return m; });
    U.lights.push([X + lx, Z + lz]);
  }
  if (parts.length || glow.length) g.add(bmv('zone9_decor_' + id, at(parts, X, Z), at(glow, X, Z)));
  // Bewohner
  U.creature = put(g, id === 'wald' ? OWL() : id === 'wiese' ? BEE() : MOLE(), cx, cz, id === 'hoehle' ? -0.6 : 0.4, id === 'wiese' ? 0.9 : 0);
  if (id === 'wiese') put(g, placeable('blumenkuebel') || new THREE.Group(), cx, cz);
  U.lights.push([cx, cz]);
  // Glühwürmchen (Wald & Wiese nachts), Staub in der Höhle
  U.motes = Array.from({ length: id === 'hoehle' ? 16 : 22 }, (_, i) => { const m = ORB(0.035, id === 'hoehle' ? 0xc9b8ff : 0xeaff8a); m.userData.p = i * 1.37; g.add(m); return m; });
  g.userData.lights = [...(g.userData.lights || []), ...U.lights];
}

// ---------- jede Bildaktualisierung im Gebiet ----------
export function updateArea9(world, s, id, t, g) {
  const U = g.userData.n9;
  if (!U) return;
  const A = AREAS[id], X = A.x, Z = A.z, h = hourOf(s), night = h >= 19.5 || h < 6.3, tg = world.target, dt = world.dt || 0.016, me = world.me9;
  seeThrough(world, g, me, dt);
  // Bewohner
  const C = E.CREATURES[id], cx = X + C.at[0], cz = Z + C.at[1], c = U.creature;
  if (id === 'wiese') { c.position.y = 0.95 + Math.sin(t * 2.2) * 0.08; c.rotation.y = 0.4 + Math.sin(t * 0.6) * 0.5; for (const w of c.userData.wings) w.rotation.x = Math.sin(t * 40) * 0.5; }
  else if (id === 'wald') { c.rotation.y = 0.4 + Math.sin(t * 0.35) * 0.6; if (!night && Math.random() < 0.004) world.float(cx, cz, '💤', 1.6); }
  else c.rotation.y = -0.6 + Math.sin(t * 0.5) * 0.25;
  if (Math.hypot(tg.x - cx, tg.z - cz) < 7) world.tag('crit9' + id, `${C.icon} ${C.name}`, cx, id === 'wiese' ? 1.6 : 1.55, cz, 'name npc');
  // besuchende Nachbarn sagen ab und zu etwas, wenn man in der Nähe ist
  if (me && world.time > (U.talkT || 0)) for (const v of E.VISITS) if (v.area === id && E.visitNow(s, v)) { const e = world.npcM?.get(v.npc); if (e && Math.hypot(e.x - me.x, e.z - me.z) < 4.5) { U.talkT = world.time + 9 + Math.random() * 8; world.npcBubble(v.npc, v.lines[Math.floor(Math.random() * v.lines.length)]); break; } }
  // Fundstücke des Tages (Modell + Glitzern)
  const want = new Set();
  for (const f of E.findsToday(id, s.day)) {
    if (!E.findVisible(s, id, f)) continue;
    const key = s.day + ':' + f.i;
    want.add(key);
    let e = U.finds.get(key);
    if (!e) {
      const m = f.tool === 'shovel' ? null : itemModel(f.id);
      if (m) { m.scale.setScalar(0.75); put(g, m, X + f.x, Z + f.z, f.i * 1.3, 0.02); }
      e = { m, x: X + f.x, z: Z + f.z, sh: f.tool === 'shovel' };
      U.finds.set(key, e);
    }
    if (Math.random() < (e.sh ? 0.06 : 0.025)) world.burst(e.x, e.z, 'sparkle', e.sh ? 0.15 : 0.4);
  }
  for (const [k, e] of U.finds) if (!want.has(k)) { if (e.m) g.remove(e.m); U.finds.delete(k); }
  // Glühwürmchen / Höhlenstaub
  const glowOn = id === 'hoehle' || night;
  U.motes.forEach((m, i) => { m.visible = glowOn; if (!glowOn) return; const p = m.userData.p, a = t * 0.25 + p; m.position.set(X + Math.cos(a * 0.8 + p) * (A.w - 2) * Math.sin(p * 3.1), (id === 'hoehle' ? 1.4 : 0.5) + Math.sin(t * 1.1 + p) * 0.4 + (i % 3) * 0.35, Z + Math.sin(a * 0.6) * (A.d - 2)); if (id !== 'hoehle') m.material.color.setHSL(0.2, 1, 0.45 + 0.35 * Math.max(0, Math.sin(t * 3 + p * 2))); });
  // Tiere: laufen herum, weichen aus, wenn man ihnen zu nahe kommt
  for (const a of U.critters || []) {
    const near = me && Math.hypot(me.x - a.x, me.z - a.z) < (me.run ? 3.2 : 1.6);
    if (near) { const d = Math.hypot(a.x - me.x, a.z - me.z) || 1; a.tx = Math.max(X - A.w + 1, Math.min(X + A.w - 1, a.x + (a.x - me.x) / d * 3)); a.tz = Math.max(Z - A.d + 1, Math.min(Z + A.d - 1, a.z + (a.z - me.z) / d * 3)); a.wait = 0; }
    else if (!a.tx || Math.hypot(a.tx - a.x, a.tz - a.z) < 0.2) { a.wait = (a.wait || 0) + dt; if (a.wait > 2 + Math.random() * 3) { a.wait = 0; a.tx = X + (Math.random() * 2 - 1) * (A.w - 1.5); a.tz = Z + (Math.random() * 2 - 1) * (A.d - 1.5); } }
    const dx = (a.tx || a.x) - a.x, dz = (a.tz || a.z) - a.z, d = Math.hypot(dx, dz);
    if (d > 0.05) { const sp = (near ? 2.6 : a.sp) * dt; a.x += dx / d * Math.min(sp, d); a.z += dz / d * Math.min(sp, d); a.m.rotation.y = Math.atan2(dx, dz) - Math.PI / 2; }
    a.m.position.set(a.x, a.k === 'bunny' && d > 0.05 ? Math.abs(Math.sin(t * 9 + a.x)) * 0.18 : 0, a.z);
    if (a.k === 'deer') a.m.rotation.z = d > 0.05 ? 0 : Math.sin(t * 0.8 + a.x) * 0.08 - 0.1; // grasen
  }
  if (id === 'wald') {
    const stag = E.stagNow(s) && world.stagFled9 !== s.day;
    U.stag.visible = stag;
    if (stag) { U.stag.rotation.z = Math.sin(t * 0.7) * 0.06 - 0.04; if (Math.random() < 0.08) world.burst(X + E.STAG_AT[0] + (Math.random() - 0.5), Z + E.STAG_AT[1] + (Math.random() - 0.5) * 0.6, 'sparkle', 0.6 + Math.random()); if (Math.random() < 0.02) world.burst(X + E.STAG_AT[0], Z + E.STAG_AT[1], 'mist', 0.2); }
    U.ring.visible = E.ringNow(s);
    if (U.ring.visible && Math.random() < 0.08) world.burst(X + E.RING_AT[0] + (Math.random() - 0.5) * 2, Z + E.RING_AT[1] + (Math.random() - 0.5) * 2, 'sparkle', 0.3 + Math.random());
    const day = h > 7 && h < 18 && !['rain', 'storm', 'fog'].includes(s.weather);
    U.shafts.forEach((m, i) => { m.visible = day; m.material.opacity = 0.08 + 0.06 * Math.sin(t * 0.4 + i * 1.7); });
    if (Math.random() < 0.05) world.burst(tg.x + (Math.random() - 0.5) * 14, tg.z + (Math.random() - 0.5) * 10, 'fall', 3.5);
    if (h < 8.5 && Math.random() < 0.15) world.burst(X + (Math.random() - 0.5) * 18, Z + (Math.random() - 0.5) * 12, 'mist', 0.2);
    if (stag && Math.hypot(tg.x - X - E.STAG_AT[0], tg.z - Z - E.STAG_AT[1]) < 9) world.tag('stag9', '🦌 Der weiße Hirsch · ganz leise!', X + E.STAG_AT[0], 2.0, Z + E.STAG_AT[1], 'name npc');
  } else if (id === 'wiese') {
    U.bees.forEach((m, i) => { const u = m.userData, a = t * 2.2 + u.p; m.position.set(u.x + Math.cos(a) * 0.7, 0.9 + Math.sin(t * 5 + u.p) * 0.15, u.z + Math.sin(a * 1.3) * 0.6); });
    const sunny = !['rain', 'storm', 'snow'].includes(s.weather) && !night;
    U.flies.forEach((m, i) => { m.visible = sunny; if (!sunny) return; const u = m.userData, a = t * 0.5 + u.p; m.position.set(u.c[0] + Math.sin(a) * 1.6, 0.7 + Math.sin(t * 2 + u.p) * 0.3, u.c[1] + Math.sin(a * 1.7) * 1.1); m.rotation.y = a; m.userData.wings.forEach((w, k) => { w.rotation.x = -Math.PI / 2 + (k ? 1 : -1) * Math.abs(Math.sin(t * 14 + u.p)) * 0.9; }); });
    const sw = E.swarmNow(s);
    U.swarm.forEach((m, i) => { m.visible = sw; if (!sw) return; const p = m.userData.p, a = t * 0.9 + p; m.position.set(X + E.SWARM_AT[0] + Math.sin(a) * 1.4 * Math.cos(p * 2), 0.9 + Math.sin(t * 1.7 + p * 3) * 0.6 + (i % 4) * 0.18, Z + E.SWARM_AT[1] + Math.sin(2 * a) * 0.8); m.rotation.y = a; m.userData.wings.forEach((w, k) => { w.rotation.x = -Math.PI / 2 + (k ? 1 : -1) * Math.abs(Math.sin(t * 16 + p * 5)) * 0.9; }); });
    if (sw) { if (Math.random() < 0.1) world.burst(X + E.SWARM_AT[0] + (Math.random() - 0.5) * 2, Z + E.SWARM_AT[1] + (Math.random() - 0.5) * 1.6, 'sparkle', 0.8 + Math.random()); if (Math.hypot(tg.x - X - E.SWARM_AT[0], tg.z - Z - E.SWARM_AT[1]) < 9) world.tag('swarm9', '🦋 Schmetterlingstanz · Kescher!', X + E.SWARM_AT[0], 2.4, Z + E.SWARM_AT[1], 'name npc'); }
    if (sunny && Math.random() < 0.06) world.burst(tg.x + (Math.random() - 0.5) * 14, tg.z + (Math.random() - 0.5) * 10, 'petal', 2.5); // Pusteblumen-Flusen
  } else {
    U.fall.material.opacity = 0.5 + Math.sin(t * 6) * 0.08;
    if (Math.random() < 0.2) world.burst(X - A.w + 2.0, Z - A.d + 1.3, 'splash', 0.05);
    if (Math.random() < 0.03) world.burst(X + (Math.random() * 2 - 1) * (A.w - 1), Z + (Math.random() * 2 - 1) * (A.d - 1), 'drop', 2.6);
    U.bats.forEach((m, i) => { const p = m.userData.p, a = t * (0.7 + (i % 3) * 0.15) + p; m.position.set(X + Math.cos(a) * (3 + i % 3 * 1.5), 3.2 + Math.sin(t * 2 + p) * 0.4, Z + Math.sin(a) * (2 + i % 2)); m.rotation.y = -a; m.userData.wings.forEach((w, k) => { w.rotation.x = (k ? 1 : -1) * Math.sin(t * 18 + p) * 0.7; }); });
    const lit = world.chime9 && world.chime9.until > world.time ? world.chime9.i : -1;
    U.chime.forEach((m, k) => { const on = k === lit; m.scale.setScalar(on ? 1.18 : 1 + Math.sin(t * 1.5 + k) * 0.02); if (on && Math.random() < 0.5) world.burst(m.position.x, m.position.z, 'sparkle', 1.2); });
  }
}
// Bäume zwischen Kamera und Figur werden halb durchsichtig (im dichten Kiefernwald sieht man sich sonst nicht)
function seeThrough(world, g, me, dt) {
  const occ = g.userData.occ, cam = world.camera?.position;
  if (!occ?.length || !me || !cam) return;
  let cx = cam.x - me.x, cz = cam.z - me.z; const L = Math.hypot(cx, cz) || 1; cx /= L; cz /= L;
  for (const m of occ) {
    const vx = m.position.x - me.x, vz = m.position.z - me.z, along = vx * cx + vz * cz, side = Math.abs(vx * cz - vz * cx);
    const want = along > 0.2 && along < 8 && side < 1.3 + along * 0.12 ? 0.32 : 1, u = m.userData;
    if (u.op === undefined) { if (want === 1) continue; u.op = 1; m.traverse(o => { if (o.isMesh) { o.material = Array.isArray(o.material) ? o.material.map(q => q.clone()) : o.material.clone(); for (const q of [].concat(o.material)) q.transparent = true; } }); }
    if (Math.abs(u.op - want) < 0.01) continue;
    u.op += (want - u.op) * Math.min(1, dt * 6);
    m.traverse(o => { if (o.isMesh) for (const q of [].concat(o.material)) { q.opacity = u.op; q.depthWrite = u.op > 0.95; } });
  }
}
// Nachbarn zu Besuch im Gebiet (schlendern um ihren Platz herum)
export function npcOverride9(world, s, id) {
  const v = E.visitOf(s, id);
  if (!v) return null;
  const A = AREAS[v.area], t = s.time || 0, k = E.VISITS.indexOf(v);
  return { x: A.x + v.at[0] + Math.sin(t * 0.09 + k) * 0.9, z: A.z + v.at[1] + Math.sin(t * 0.13 + k * 2) * 0.5, walking: Math.abs(Math.cos(t * 0.09 + k)) > 0.7 };
}
// Antippen: Bewohner und Kristalle als Säulen
export function picks9(id) {
  const A = AREAS[id], C = E.CREATURES[id], out = [[A.x + C.at[0], A.z + C.at[1], 0.6, 1.4]];
  if (id === 'hoehle') { for (const [x, z] of E.CHIME_CRYSTALS) out.push([A.x + x, A.z + z, 0.5, 1.5]); out.push([A.x + E.CHIME_STONE[0], A.z + E.CHIME_STONE[1], 0.6, 0.4]); }
  return out;
}
