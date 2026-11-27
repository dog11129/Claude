// Grafik für Inselleben 8: die Traumwelt (schwebende Inseln, Wolkenbrücken, Mondschaf Luna, Traumsterne, Insel-Miniatur,
// Erinnerungen), die Nachbarn bei der Hochzeit und das Surfbrett unter der Figur.
import * as THREE from '../vendor/three.module.min.js';
import * as M from './models.js';
import { bm, bmv } from './blend.js';
import * as E from './extras8.js';
import { NPC_IDS } from './data.js';

const X0 = E.DREAM.x, Z0 = E.DREAM.z;
const PASTEL = [0xc9b8ff, 0xffc8e0, 0xb8e8ff, 0xd8ffc8, 0xe4d4ff];
const lam = (c, o) => new THREE.MeshLambertMaterial({ color: c, ...(o || {}) });

// ---------- Traumwelt ----------
function buildDream() {
  const g = new THREE.Group(), parts = [], glow = [];
  // Wolkenmeer tief unten
  const sea = new THREE.Mesh(M.disc(90, 48, 4), lam(0xf4e8ff, { transparent: true, opacity: 0.85 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(X0, -7, Z0); g.add(sea);
  for (let i = 0; i < 36; i++) { const a = i * 2.39, r = 14 + (i * 7.3) % 40; parts.push(M.ball(2.2 + (i % 4) * 0.8, i % 3 ? 0xffffff : 0xffe4f2, Math.cos(a) * r, -6.4 + (i % 3) * 0.4, Math.sin(a) * r, 1.6, 0.55, 1.3)); }
  // Inseln: Wiese oben (fein unterteilt wegen der Krümmung), Fels darunter, Wolkenkranz am Rand
  E.DREAM_ISLES.forEach((I, k) => {
    const top = new THREE.Mesh(M.disc(I.r, 40, 1.2), lam(k ? PASTEL[k % 5] : 0xc8f0dc));
    top.rotation.x = -Math.PI / 2; top.position.set(X0 + I.x, 0.005, Z0 + I.z); g.add(top);
    const rim = new THREE.Mesh(M.disc(I.r + 0.25, 40, 1.2), lam(0xffffff));
    rim.rotation.x = -Math.PI / 2; rim.position.set(X0 + I.x, -0.06, Z0 + I.z); g.add(rim);
    parts.push(M.cone(I.r * 0.95, I.r * 0.9, 0xb8a8d8, I.x, -I.r * 0.45 - 0.08, I.z, 14, Math.PI), M.cone(I.r * 0.5, I.r * 0.7, 0x9a8ac8, I.x + 0.4, -I.r * 0.95, I.z - 0.3, 9, Math.PI));
    const n = Math.round(I.r * 2.2);
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; parts.push(M.ball(0.55 + (i % 3) * 0.18, 0xffffff, I.x + Math.cos(a) * (I.r + 0.15), -0.25, I.z + Math.sin(a) * (I.r + 0.15), 1.4, 0.7, 1.2)); }
    // Blümchen & kleine Kristalle
    for (let i = 0; i < I.r * 3; i++) { const a = i * 2.4 + k, d = 1 + (i * 1.7) % (I.r - 1.6); const x = I.x + Math.cos(a) * d, z = I.z + Math.sin(a) * d; if (Math.hypot(x - E.DREAM_START[0], z - E.DREAM_START[1]) < 1.2) continue; if (i % 4) parts.push(M.ball(0.07, PASTEL[(i + k) % 5], x, 0.12, z), M.cyl(0.012, 0.012, 0.12, 0x8ac87a, x, 0.06, z, 4)); else glow.push(M.cone(0.08, 0.3, 0xc8e8ff, x, 0.15, z, 5)); }
  });
  // Wolkenbrücken: Plankenweg aus Wolken
  for (const [x1, z1, x2, z2] of E.DREAM_BRIDGES) {
    const L = Math.hypot(x2 - x1, z2 - z1), ry = Math.atan2(x2 - x1, z2 - z1), n = Math.ceil(L / 0.45);
    for (let i = 0; i <= n; i++) { const u = i / n, x = x1 + (x2 - x1) * u, z = z1 + (z2 - z1) * u; parts.push(M.box(E.BRIDGE_W * 2, 0.08, 0.38, i % 2 ? 0xfff4fb : 0xf0e8ff, x, -0.02, z, ry)); if (i % 2 === 0) for (const s of [-1, 1]) parts.push(M.ball(0.32, 0xffffff, x + Math.cos(ry) * s * (E.BRIDGE_W + 0.15), -0.08, z - Math.sin(ry) * s * (E.BRIDGE_W + 0.15), 1.2, 0.7, 1.2)); }
  }
  // Mondschaf Luna mit Mondsichel-Laterne
  const [lx, lz] = E.LUNA;
  parts.push(...[[-0.18, 0.1], [0.18, 0.1], [-0.18, -0.15], [0.18, -0.15]].map(([x, z]) => M.cyl(0.05, 0.05, 0.3, 0x5a4a6a, lx + x, 0.15, lz + z, 6)),
    ...Array.from({ length: 9 }, (_, i) => M.ball(0.24, 0xffffff, lx + Math.cos(i * 0.7) * 0.2, 0.5 + (i % 2) * 0.1, lz + Math.sin(i * 0.7) * 0.25 - 0.02)),
    M.ball(0.17, 0x6a5a7a, lx, 0.6, lz + 0.42, 1, 1.1, 1.1), ...[-1, 1].flatMap(s => [M.ball(0.04, 0xffffff, lx + s * 0.07, 0.66, lz + 0.56), M.ball(0.09, 0x6a5a7a, lx + s * 0.18, 0.66, lz + 0.36, 1.4, 0.5, 0.8)]),
    M.ball(0.12, 0xffffff, lx, 0.78, lz + 0.38), M.ball(0.06, 0xff9ac8, lx - 0.08, 0.58, lz + 0.55, 1, 0.5, 0.3),
    M.cyl(0.04, 0.05, 1.8, 0xb8a8d8, lx + 1.1, 0.9, lz - 0.4, 6));
  glow.push(M.box(0.6, 0.16, 0.08, 0xfff0a0, lx + 1.25, 1.9, lz - 0.4), M.ball(0.25, 0xfff0a0, lx + 1.1, 2.05, lz - 0.4, 1, 1, 0.3));
  // Aufwach-Kissen: großes weiches Kissen
  const [px, pz] = E.PILLOW;
  parts.push(M.ball(1.05, 0xffffff, px, 0.35, pz, 1.25, 0.38, 0.9), M.ball(0.5, 0xffe4f2, px + 0.6, 0.5, pz - 0.1, 1, 0.5, 0.8), ...[-1, 1].flatMap(s => [-1, 1].map(t => M.ball(0.16, 0xffffff, px + s * 1.15, 0.38, pz + t * 0.72))));
  // Eure Insel als Miniatur: grüne Scheibe auf Sockel, winzige Bäume und ein Häuschen
  const [mx, mz] = E.MINI;
  parts.push(M.cyl(0.95, 0.75, 0.35, 0xb8e0f8, mx, 0.18, mz, 18), M.cyl(0.85, 0.88, 0.12, 0xf2e2b0, mx, 0.4, mz, 18), M.cyl(0.7, 0.75, 0.1, 0x8fd068, mx, 0.48, mz, 18),
    M.box(0.24, 0.18, 0.2, 0xfff3e0, mx + 0.2, 0.62, mz - 0.1), M.cone(0.2, 0.14, 0xff8fab, mx + 0.2, 0.78, mz - 0.1, 4, 0, Math.PI / 4),
    ...[[-0.35, 0.2], [-0.15, -0.4], [0.4, 0.35], [-0.45, -0.15]].flatMap(([x, z]) => [M.cyl(0.02, 0.025, 0.12, 0x8a6040, mx + x, 0.6, mz + z, 5), M.ball(0.1, 0x6cc06a, mx + x, 0.72, mz + z)]));
  // Erinnerungsinsel: Bilderrahmen auf Ständern
  const [ex, ez] = E.MEMO;
  for (let i = 0; i < 3; i++) { const a = (i - 1) * 0.7, x = ex + Math.sin(a) * 1.3, z = ez - Math.cos(a) * 1.3 + 0.8; parts.push(M.cyl(0.03, 0.03, 0.9, 0xb8a8d8, x, 0.45, z, 6), M.box(0.62, 0.5, 0.05, 0xffd8a8, x, 1.1, z, -a), M.box(0.5, 0.38, 0.06, PASTEL[i], x, 1.1, z, -a)); }
  g.add(bmv('zone_dream', parts.map(q => (q.g.translate(X0, 0, Z0), q)), glow.map(q => (q.g.translate(X0, 0, Z0), q))));
  // Sterne der Nacht (beweglich)
  const starGeo = new THREE.OctahedronGeometry(0.2, 0), starMat = new THREE.MeshBasicMaterial({ color: 0xfff2a0 });
  const stars = Array.from({ length: E.STAR_N }, () => { const m = new THREE.Mesh(starGeo, starMat); g.add(m); return m; });
  // schwebende Lichter
  const motes = Array.from({ length: 24 }, (_, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 4), new THREE.MeshBasicMaterial({ color: PASTEL[i % 5] })); g.add(m); return m; });
  g.userData = { stars, motes, lights: [[X0 + lx + 1.1, Z0 + lz - 0.4], [X0, Z0 + E.DREAM_START[1]], [X0 + mx, Z0 + mz]] };
  return g;
}
function updateDream(zones, world, s, t) {
  const U = zones.dream8.userData, st = E.dreamStars(s.day), got = s.dream?.day === s.day ? s.dream.got : {};
  U.stars.forEach((m, i) => { const p = st[i]; m.visible = !!p && !got[i]; if (!m.visible) return; m.position.set(X0 + p[0], 0.55 + Math.sin(t * 2 + i) * 0.12, Z0 + p[1]); m.rotation.y = t * 1.5 + i; if (Math.random() < 0.02) world.burst(X0 + p[0], Z0 + p[1], 'sparkle', 0.6); });
  U.motes.forEach((m, i) => { const a = t * 0.15 + i * 0.9, r = 4 + (i % 6) * 3; m.position.set(X0 + Math.cos(a) * r, 1.2 + Math.sin(t * 0.8 + i) * 0.8 + (i % 3), Z0 + Math.sin(a * 1.3) * r); });
  const tg = world.target, near = (x, z, r) => Math.hypot(tg.x - X0 - x, tg.z - Z0 - z) < r;
  world.tag('dream_luna', '🐑 Mondschaf Luna · 🌠 Tausch', X0 + E.LUNA[0], 1.5, Z0 + E.LUNA[1], 'name npc');
  world.tag('dream_wake', '☁️ Aufwachen', X0 + E.PILLOW[0], 1.3, Z0 + E.PILLOW[1], 'name npc');
  if (near(E.MINI[0], E.MINI[1], 9)) world.tag('dream_mini', `🏝️ ${s.name || 'Eure Insel'}`, X0 + E.MINI[0], 1.4, Z0 + E.MINI[1], 'name npc');
  const book = (s.book || []).slice(-3).reverse();
  for (let i = 0; i < 3; i++) { const p = book[i], a = (i - 1) * 0.7; if (p && near(E.MEMO[0], E.MEMO[1], 8)) world.tag('dream_mem' + i, `${p.icon} ${p.title}`, X0 + E.MEMO[0] + Math.sin(a) * 1.3, 1.75, Z0 + E.MEMO[1] - Math.cos(a) * 1.3 + 0.8, 'name npc'); }
  if (Math.random() < 0.05) world.burst(tg.x + (Math.random() - 0.5) * 14, tg.z + (Math.random() - 0.5) * 10, 'sparkle', 2 + Math.random() * 2);
}
export function zones8(zones, world, s, t, target) {
  const on = target.z > E.DREAM_Z;
  if (zones.dream8) zones.dream8.visible = on;
  if (!on) return false;
  if (!zones.dream8) { zones.dream8 = buildDream(); zones.scene.add(zones.dream8); }
  updateDream(zones, world, s, t);
  return true;
}
export const lights8 = zones => zones.dream8?.userData.lights || null;
// Himmel im Traum: Lavendel und Rosa, Sterne, weiches Licht
export function dreamSky(world, top, hor) {
  top.setRGB(0.36, 0.3, 0.62); hor.setRGB(0.98, 0.72, 0.86);
  world.scene.fog.color.copy(hor); world.scene.fog.near = 30; world.scene.fog.far = 110;
  world.stars.material.opacity = 0.9;
  world.sun.intensity = 1.2; world.sun.color.setRGB(1, 0.86, 0.95);
  world.hemi.color.setRGB(0.92, 0.85, 1); world.hemi.groundColor.setRGB(0.62, 0.52, 0.8); world.hemi.intensity = 1.25;
  world.lamp.intensity = 6;
  if (world.skysun) world.skysun.visible = false;
}

// ---------- Hochzeit: Nachbarn sitzen in Reihen, Mira steht am Altar ----------
export const npcUp8 = s => !!s.wedding;
export function npcOverride8(world, s, id) {
  const W = s.wedding;
  if (!W) return null;
  const sp = E.wedSpots(W.x, W.z, W.r);
  if (id === 'mira') return { x: sp.priest[0], z: sp.priest[1], walking: false, face: sp.priest[2] };
  const i = NPC_IDS.filter(n => n !== 'mira').indexOf(id);
  if (i < 0) return null;
  const [x, z, ry] = sp.guest(i);
  return { x, z, walking: false, face: ry };
}

// ---------- Surfbrett unter der Figur ----------
export function syncSurf8(world, e, on) {
  if (on && !e.surf8) { e.surf8 = bm('ride_surfboard', [M.ball(0.5, 0xffffff, 0, 0, 0, 0.42, 0.06, 1.7), M.box(0.05, 0.012, 1.4, 0xff8fab, 0, 0.032, 0), M.cone(0.07, 0.14, 0x6cb4ff, 0, -0.06, -0.62, 4, Math.PI)]); world.scene.add(e.surf8); }
  if (!e.surf8) return;
  e.surf8.visible = on;
  if (!on) return;
  e.surf8.position.set(e.x, e.m.position.y + 0.02, e.z); e.surf8.rotation.set(Math.sin(world.time * 2.2) * 0.05, e.ry, Math.sin(world.time * 1.7) * 0.06);
  if (Math.random() < 0.3) world.burst(e.x - Math.sin(e.ry) * 0.6, e.z - Math.cos(e.ry) * 0.6, 'splash', -0.15);
}
