// Ambiente (Inselleben 12): Wolkenschatten ziehen über den Boden, Vogelschwärme am Himmel, Spatzen picken am Boden
// und fliegen auf, wenn man näher kommt, Möwen kreisen am Strand. Rein optisch, läuft nur im Browser und kostet fast nichts.
import * as THREE from '../vendor/three.module.min.js';
import * as M from './models.js';
import { zoneOf } from './newleaf.js';
import { blocked } from './state.js';
import { coast } from './island.js';
import { TROPIC, tropicBeach } from './newleaf.js';

// Wo gibt es was? (Himmel sichtbar, Boden begehbar)
const ZONES = {
  island: { shade: 1, flock: 1, hop: 4, gull: 2, sea: 22, crab: 3, dolphin: 1 }, wald: { shade: 1, flock: 1, hop: 3 }, wiese: { shade: 1, flock: 1, hop: 4, dragon: 2 },
  street: { flock: 1, hop: 3 }, fair: { flock: 1 }, moor: { flock: 1, hop: 2, dragon: 4 }, bambus: { hop: 3 }, tropic: { shade: 1, gull: 3, crab: 4, dolphin: 1 }, trip: { shade: 1, gull: 2 },
};
const COLS = { spatz: [0xa9825c, 0xe9dcc8], meise: [0x6fa8dc, 0xffe58a], rotkehlchen: [0x8a6a4a, 0xf2783c], moewe: [0xffffff, 0xd8dde4] };
const mats = {};
const mat = c => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));
// Vogel: Körper, Kopf, Schnabel, Schwanz – Flügel als eigene Gruppen zum Schlagen
function makeBird(kind, size = 1) {
  const [c, belly] = COLS[kind], g = new THREE.Group(), part = (geo, col, x, y, z) => { const m = new THREE.Mesh(geo, mat(col)); m.position.set(x, y, z); g.add(m); return m; };
  const body = new THREE.SphereGeometry(0.11, 8, 6); body.scale(0.8, 0.8, 1.25);
  part(body, c, 0, 0, 0);
  const bl = new THREE.SphereGeometry(0.085, 7, 5); bl.scale(0.8, 0.7, 1.1);
  part(bl, belly, 0, -0.03, 0.02);
  part(new THREE.SphereGeometry(0.075, 8, 6), c, 0, 0.07, 0.12);
  const beak = new THREE.ConeGeometry(0.022, 0.06, 5); beak.rotateX(Math.PI / 2);
  part(beak, kind === 'moewe' ? 0xffb03c : 0xf2a03c, 0, 0.06, 0.21);
  for (const s of [-1, 1]) part(new THREE.SphereGeometry(0.012, 5, 4), 0x2b2222, 0.04 * s, 0.09, 0.17);
  const tail = new THREE.BoxGeometry(0.08, 0.015, 0.12); tail.translate(0, 0, -0.06);
  const t = part(tail, kind === 'moewe' ? belly : c, 0, 0.02, -0.12); t.rotation.x = -0.25;
  const wings = [-1, 1].map(s => {
    const w = new THREE.Group(), geo = new THREE.BoxGeometry(kind === 'moewe' ? 0.34 : 0.2, 0.014, 0.13);
    geo.translate((kind === 'moewe' ? 0.17 : 0.1) * s, 0, 0);
    const m = new THREE.Mesh(geo, mat(kind === 'moewe' ? belly : c));
    w.add(m); w.position.set(0.06 * s, 0.03, 0); g.add(w);
    return w;
  });
  g.scale.setScalar(size);
  g.userData.wings = wings;
  g.traverse(o => { if (o.isMesh) o.castShadow = false; });
  return g;
}
const flap = (b, t, speed = 18, amp = 0.9) => { const a = Math.sin(t * speed) * amp; b.userData.wings[0].rotation.z = -a; b.userData.wings[1].rotation.z = a; };
const fold = b => { b.userData.wings[0].rotation.z = 1.25; b.userData.wings[1].rotation.z = -1.25; };

// Strandkrabbe: flacher Panzer, zwei Scheren, Stielaugen, sechs Beinchen
function makeCrab() {
  const g = new THREE.Group(), C1 = 0xf2683c, C2 = 0xd9502c, part = (geo, col, x, y, z) => { const m = new THREE.Mesh(geo, mat(col)); m.position.set(x, y, z); g.add(m); return m; };
  const body = new THREE.SphereGeometry(0.12, 9, 6); body.scale(1.25, 0.55, 0.9);
  part(body, C1, 0, 0.08, 0);
  const legs = [];
  for (const s of [-1, 1]) {
    part(new THREE.SphereGeometry(0.055, 7, 5), C2, 0.17 * s, 0.1, 0.1);
    part(new THREE.CylinderGeometry(0.008, 0.008, 0.07, 4), C1, 0.05 * s, 0.16, 0.08);
    part(new THREE.SphereGeometry(0.018, 5, 4), 0x2b2222, 0.05 * s, 0.2, 0.08);
    for (let i = 0; i < 3; i++) { const l = part(new THREE.BoxGeometry(0.11, 0.014, 0.014), C2, 0.17 * s, 0.05, -0.07 + i * 0.06); l.rotation.z = -0.5 * s; legs.push(l); }
  }
  g.userData.legs = legs;
  return g;
}
// Delfin: springt weit draußen im Bogen aus dem Wasser
function makeDolphin() {
  const g = new THREE.Group(), part = (geo, col, x, y, z) => { const m = new THREE.Mesh(geo, mat(col)); m.position.set(x, y, z); g.add(m); return m; };
  const body = new THREE.SphereGeometry(0.3, 10, 7); body.scale(0.62, 0.62, 2);
  part(body, 0x7fa8c8, 0, 0, 0);
  const belly = new THREE.SphereGeometry(0.26, 8, 6); belly.scale(0.6, 0.5, 1.8);
  part(belly, 0xe6f0f6, 0, -0.06, 0.03);
  const snout = new THREE.ConeGeometry(0.07, 0.24, 6); snout.rotateX(Math.PI / 2);
  part(snout, 0x7fa8c8, 0, -0.02, 0.66);
  const fin = new THREE.ConeGeometry(0.09, 0.24, 4); fin.scale(0.3, 1, 1); fin.rotateX(-0.5);
  part(fin, 0x6a94b6, 0, 0.22, -0.08);
  const tail = new THREE.BoxGeometry(0.4, 0.03, 0.16);
  part(tail, 0x6a94b6, 0, 0, -0.64);
  for (const s of [-1, 1]) { const f = new THREE.BoxGeometry(0.2, 0.025, 0.11); const m = part(f, 0x6a94b6, 0.2 * s, -0.1, 0.2); m.rotation.z = -0.6 * s; part(new THREE.SphereGeometry(0.02, 5, 4), 0x22303c, 0.13 * s, 0.05, 0.45); }
  return g;
}
// Libelle: schlanker Körper, vier durchscheinende Flügel
let WING = null;
function makeDragon() {
  const g = new THREE.Group(), col = [0x4fc0d8, 0x7ad86a, 0xf2783c][Math.floor(Math.random() * 3)];
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.006, 0.22, 5).rotateX(Math.PI / 2), mat(col)); g.add(b);
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), mat(col)); h.position.z = 0.12; g.add(h);
  WING ||= new THREE.MeshBasicMaterial({ color: 0xeaf8ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  const wings = [];
  for (const s of [-1, 1]) for (const z of [0.06, 0.0]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.04).translate(0.08 * s, 0, 0).rotateX(-Math.PI / 2), WING); w.position.set(0, 0.012, z); g.add(w); wings.push([w, s]); }
  g.userData.dw = wings;
  return g;
}
// Strandplatz in der Nähe: Sand nah am Wasser (Hauptinsel über die Küstenlinie, Tropeninsel über ihren Sandring)
function beachSpot(w, zone, near = 11) {
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * 6.28, d = 3 + Math.random() * near, x = w.target.x + Math.sin(a) * d, z = w.target.z + Math.cos(a) * d;
    const ok = zone === 'tropic' ? tropicBeach(x - TROPIC.x, z - TROPIC.z) : (() => { const c = coast(x, z); return c > -2.4 && c < -0.5; })();
    if (ok && landable(w, x, z)) return [x, z];
  }
  return null;
}
// Stelle im Meer, ein gutes Stück vor der Küste
function seaSpot(w, zone) {
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * 6.28, d = 7 + Math.random() * 9, x = w.target.x + Math.sin(a) * d, z = w.target.z + Math.cos(a) * d;
    if (zone === 'tropic' ? Math.abs(Math.hypot(x - TROPIC.x, z - TROPIC.z) - 14.5) < 1.5 : (() => { const c = coast(x, z); return c > 4.5 && c < 8; })()) return [x, z];
  }
  return null;
}

let SHADE = null;
function shadeTex() {
  if (SHADE || typeof document === 'undefined') return SHADE;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'); if (!x) return null;
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 31); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.6, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return (SHADE = new THREE.CanvasTexture(c));
}

function init(w) {
  const A = w.amb = { g: new THREE.Group(), shades: [], flock: null, hops: [], gulls: [], crabs: [], dragons: [], dolphin: null, nextDolphin: 20 + Math.random() * 25, zone: '', nextFlock: 6 + Math.random() * 10, quality: 1 };
  w.scene.add(A.g);
  const map = shadeTex();
  if (map) for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(M.disc(1, 20, 0.14), new THREE.MeshBasicMaterial({ color: 0x1a2a44, map, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    m.rotation.x = -Math.PI / 2; m.renderOrder = 2; m.visible = false;
    m.userData = { ox: (i - 1.5) * 13 + Math.random() * 6, oz: (Math.random() - 0.5) * 30, r: 6 + Math.random() * 5, sp: 0.5 + Math.random() * 0.5 };
    A.g.add(m); A.shades.push(m);
  }
  return A;
}
const KINDS = ['spatz', 'meise', 'rotkehlchen'];
function spawnHop(w, A, far) {
  let x = 0, z = 0, ok = false;
  for (let i = 0; i < 8 && !ok; i++) { const a = Math.random() * 6.28, d = far ? 8 + Math.random() * 7 : 5 + Math.random() * 7; x = w.target.x + Math.sin(a) * d; z = w.target.z + Math.cos(a) * d; ok = landable(w, x, z) && landable(w, x + 0.4, z) && landable(w, x - 0.4, z); }
  if (!ok) return;
  const b = makeBird(KINDS[Math.floor(Math.random() * 3)], 1.15);
  const e = { m: b, st: 'land', x, z, y: 5 + Math.random() * 2, ry: Math.random() * 6.28, t: 0, peck: Math.random() * 3, tx: 0, tz: 0 };
  A.g.add(b); A.hops.push(e);
}
// Darf hier ein Vogel landen? (nicht im Wasser, nicht im Haus – prüft die Welt, wenn sie es kann)
const landable = (w, x, z) => { try { return !w.lastS || !blocked(w.lastS, x, z); } catch { return false; } };
const someoneNear = (w, x, z, r) => Object.values(w.lastPlayers || {}).some(p => p && Math.hypot(p.x - x, p.z - z) < r);

export function updateAmbient(w, s, info, dt, rain, indoors) {
  const A = w.amb || init(w), t = w.time || 0, me = w.target;
  const zone = indoors ? '' : zoneOf(me), Z = ZONES[zone] || null, day = info.night < 0.45, calm = !rain && s.weather !== 'storm' && s.weather !== 'snow' && s.weather !== 'fog';
  const lite = w.lowFx ? 0.5 : 1; // schwache Geräte: weniger Tiere
  A.g.visible = !!Z;
  if (!Z) { A.zone = ''; return; }
  if (A.zone !== zone) { // Ortswechsel: alles neu verteilen
    A.zone = zone;
    for (const e of A.hops) A.g.remove(e.m);
    for (const e of A.gulls) A.g.remove(e.m);
    for (const e of [...A.crabs, ...A.dragons]) A.g.remove(e.m);
    if (A.dolphin) { A.g.remove(A.dolphin.m); A.dolphin = null; }
    A.hops = []; A.gulls = []; A.crabs = []; A.dragons = [];
    if (A.flock) { for (const b of A.flock.birds) A.g.remove(b); A.flock = null; }
  }
  // --- Wolkenschatten: nur bei Sonne, ziehen mit dem Wind ---
  const sunny = Z.shade && day && calm && (s.weather === 'sun' || !s.weather || s.weather === 'clear');
  for (const m of A.shades) {
    const u = m.userData, want = sunny ? 0.13 : 0;
    m.material.opacity += (want - m.material.opacity) * Math.min(1, dt * 0.8);
    m.visible = m.material.opacity > 0.004;
    if (!m.visible) continue;
    const span = 56, px = ((u.ox + t * u.sp * 0.55) % span + span) % span - span / 2;
    m.position.set(me.x + px, 0.03, me.z + u.oz * 0.5 + Math.sin(t * 0.03 + u.ox) * 3);
    m.scale.set(u.r, u.r * 0.62, 1);
    m.material.opacity *= Math.min(1, (span / 2 - Math.abs(px)) / 6 + 0.02) ** 0.2; // am Rand sanft ausblenden
  }
  // --- Vogelschwarm: zieht ab und zu hoch über die Insel ---
  if (Z.flock && day && calm) {
    if (!A.flock && t > A.nextFlock) {
      const dir = Math.random() * 6.28, n = Math.round((3 + Math.random() * 4) * lite) + 1, birds = [];
      for (let i = 0; i < n; i++) { const b = makeBird('spatz', 1.3); A.g.add(b); birds.push(b); }
      A.flock = { birds, dir, d: -34, y: 7.5 + Math.random() * 2.5, sp: 5 + Math.random() * 2, side: (Math.random() - 0.5) * 16 };
    }
    const F = A.flock;
    if (F) {
      F.d += dt * F.sp;
      const dx = Math.sin(F.dir), dz = Math.cos(F.dir);
      F.birds.forEach((b, i) => {
        const row = Math.ceil(i / 2), sgn = i % 2 ? 1 : -1, back = row * 0.9, out = row * 0.75 * sgn;
        b.position.set(me.x + dx * (F.d - back) + dz * (F.side + out), F.y + Math.sin(t * 2 + i) * 0.25, me.z + dz * (F.d - back) - dx * (F.side + out));
        b.rotation.set(0, F.dir, Math.sin(t * 1.5 + i) * 0.15);
        flap(b, t + i * 0.4, 13, 0.75);
      });
      if (F.d > 36) { for (const b of F.birds) A.g.remove(b); A.flock = null; A.nextFlock = t + 18 + Math.random() * 30; }
    }
  } else if (A.flock) { for (const b of A.flock.birds) A.g.remove(b); A.flock = null; }
  // --- Spatzen & Co.: landen, picken, hüpfen – und fliegen auf, wenn jemand kommt ---
  const wantHops = Z.hop && day && calm ? Math.round(Z.hop * lite) : 0;
  if (A.hops.length < wantHops && Math.random() < dt * 0.6) spawnHop(w, A, A.hops.length > 0);
  for (let i = A.hops.length - 1; i >= 0; i--) {
    const e = A.hops[i], b = e.m, dist = Math.hypot(e.x - me.x, e.z - me.z);
    e.t += dt;
    if (e.st === 'land') {
      e.y = Math.max(0, e.y - dt * 4.5);
      flap(b, t + i, 22, 0.8);
      if (e.y <= 0) { if (landable(w, e.x, e.z)) { e.st = 'peck'; e.t = 0; fold(b); } else { e.st = 'flee'; e.t = 0; } }
    } else if (e.st === 'peck') {
      const near = dist < 2.6 || someoneNear(w, e.x, e.z, 2.6);
      if (near || !wantHops || e.t > 22 + i * 5) { e.st = 'flee'; e.t = 0; e.ry = Math.atan2(e.x - me.x, e.z - me.z) + (Math.random() - 0.5); continue; }
      e.peck -= dt;
      if (e.peck < 0) { e.peck = 1.2 + Math.random() * 2.5; if (Math.random() < 0.55) { const a = e.ry + (Math.random() - 0.5) * 2.4; e.tx = e.x + Math.sin(a) * 0.5; e.tz = e.z + Math.cos(a) * 0.5; if (landable(w, e.tx, e.tz)) { e.hop = 1; e.ry = a; } } }
      if (e.hop > 0) { e.hop -= dt * 3; const k = Math.min(1, dt * 6); e.x += (e.tx - e.x) * k; e.z += (e.tz - e.z) * k; e.y = Math.max(0, Math.sin((1 - e.hop) * Math.PI)) * 0.12; }
      else { e.y = 0; b.rotation.x = e.peck < 0.5 ? Math.max(0, Math.sin(e.peck * 25)) * 0.7 : 0; }
    } else { // flee
      e.y += dt * (2.5 + e.t * 3);
      e.x += Math.sin(e.ry) * dt * (4 + e.t * 3); e.z += Math.cos(e.ry) * dt * (4 + e.t * 3);
      b.rotation.x = -0.35;
      flap(b, t + i, 24, 1.0);
      if (e.t > 4) { A.g.remove(b); A.hops.splice(i, 1); continue; }
    }
    b.position.set(e.x, e.y + 0.1, e.z);
    b.rotation.y = e.ry;
    if (e.st !== 'peck') b.rotation.z = 0;
  }
  // --- Möwen: kreisen über dem Wasser am Strand ---
  const wantGulls = Z.gull && day && calm ? Math.round(Z.gull * lite) : 0;
  while (A.gulls.length < wantGulls) { const m = makeBird('moewe', 1.7); A.g.add(m); A.gulls.push({ m, ph: Math.random() * 6.28, r: 5 + Math.random() * 4, y: 5 + Math.random() * 2.5, sp: 0.22 + Math.random() * 0.12, cx: (Math.random() - 0.5) * 14 }); }
  while (A.gulls.length > wantGulls) A.g.remove(A.gulls.pop().m);
  for (const e of A.gulls) {
    e.ph += dt * e.sp;
    const cz = Z.sea ? Z.sea : me.z + 9, cx = Z.sea ? e.cx : me.x + e.cx * 0.6;
    const x = cx + Math.cos(e.ph) * e.r, z = cz + Math.sin(e.ph) * e.r * 0.7;
    e.m.position.set(x, e.y + Math.sin(e.ph * 2.3) * 0.5, z);
    e.m.rotation.set(0, -e.ph, -0.25);
    const glide = Math.sin(e.ph * 1.7) > 0.2; // gleiten und zwischendurch ein paar Schläge
    if (glide) { e.m.userData.wings[0].rotation.z = -0.12; e.m.userData.wings[1].rotation.z = 0.12; } else flap(e.m, t, 7, 0.55);
  }
  // --- Krabben: flitzen seitwärts über den Strand und buddeln sich ein, wenn jemand kommt ---
  const wantCrabs = Z.crab && calm && s.weather !== 'snow' ? Math.round(Z.crab * lite) : 0;
  if (A.crabs.length < wantCrabs && Math.random() < dt * 0.5) { const sp = beachSpot(w, zone); if (sp) { const m = makeCrab(); m.scale.setScalar(0.01); A.g.add(m); A.crabs.push({ m, x: sp[0], z: sp[1], tx: sp[0], tz: sp[1], ry: Math.random() * 6.28, wait: 1 + Math.random() * 3, k: 0, t: 0 }); } }
  for (let i = A.crabs.length - 1; i >= 0; i--) {
    const e = A.crabs[i], near = someoneNear(w, e.x, e.z, 1.9) || Math.hypot(e.x - me.x, e.z - me.z) < 1.9, gone = Math.hypot(e.x - me.x, e.z - me.z) > 26 || !wantCrabs;
    e.t += dt;
    e.k += ((near || gone ? 0 : 1) - e.k) * Math.min(1, dt * (near ? 9 : 3)); // eingebuddelt = klein
    if ((near || gone) && e.k < 0.03) { if (gone || e.t > 3) { A.g.remove(e.m); A.crabs.splice(i, 1); continue; } }
    if (!near) {
      e.wait -= dt;
      if (e.wait < 0) { e.wait = 1.5 + Math.random() * 4; const a = e.ry + Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1), d = 0.6 + Math.random() * 1.2, tx = e.x + Math.sin(a) * d, tz = e.z + Math.cos(a) * d;
        const c = zone === 'tropic' ? (tropicBeach(tx - TROPIC.x, tz - TROPIC.z) ? -1 : 1) : coast(tx, tz);
        if (c > -2.8 && c < -0.3 && landable(w, tx, tz)) { e.tx = tx; e.tz = tz; } else e.ry += 1.2; }
      const dx = e.tx - e.x, dz = e.tz - e.z, d = Math.hypot(dx, dz);
      if (d > 0.03) { const v = Math.min(d, dt * 1.8); e.x += dx / d * v; e.z += dz / d * v; e.m.userData.legs.forEach((l, j) => { l.rotation.y = Math.sin(t * 26 + j * 1.7) * 0.5; }); }
    }
    e.m.position.set(e.x, -0.1 * (1 - e.k), e.z);
    e.m.rotation.y = e.ry;
    e.m.scale.setScalar(Math.max(0.01, e.k) * 1.15);
  }
  // --- Delfin: ab und zu ein Sprung weit draußen ---
  if (Z.dolphin && day && calm) {
    if (!A.dolphin && t > A.nextDolphin) { const sp = seaSpot(w, zone); if (sp) { const m = makeDolphin(); A.g.add(m); const a = Math.random() * 6.28; A.dolphin = { m, x: sp[0], z: sp[1], a, k: 0, n: 1 + Math.floor(Math.random() * 3) }; } else A.nextDolphin = t + 6; }
    const D = A.dolphin;
    if (D) {
      const k0 = D.k; D.k += dt * 0.85;
      const x = D.x + Math.sin(D.a) * D.k * 2.6, z = D.z + Math.cos(D.a) * D.k * 2.6, y = Math.sin(D.k * Math.PI) * 1.5 - 0.35;
      D.m.position.set(x, y, z);
      D.m.rotation.set(-Math.cos(D.k * Math.PI) * 1.0, D.a, 0, 'YXZ');
      if ((k0 < 0.08 && D.k >= 0.08) || (k0 < 0.92 && D.k >= 0.92)) w.burst?.(x, z, 'splash', 0.05);
      if (D.k >= 1) { D.n--; if (D.n > 0) { D.x = x + Math.sin(D.a) * 0.8; D.z = z + Math.cos(D.a) * 0.8; D.k = -0.35; } else { A.g.remove(D.m); A.dolphin = null; A.nextDolphin = t + 40 + Math.random() * 60; } }
      D.m.visible = D.k >= 0;
    }
  } else if (A.dolphin) { A.g.remove(A.dolphin.m); A.dolphin = null; }
  // --- Libellen: schwirren im Zickzack über Moor und Wiese ---
  const wantDr = Z.dragon && day && calm ? Math.round(Z.dragon * lite) : 0;
  while (A.dragons.length < wantDr) { const m = makeDragon(); A.g.add(m); A.dragons.push({ m, x: me.x + (Math.random() - 0.5) * 10, z: me.z + (Math.random() - 0.5) * 10, y: 0.7 + Math.random(), tx: me.x, tz: me.z, ty: 1, wait: 0, ry: 0 }); }
  while (A.dragons.length > wantDr) A.g.remove(A.dragons.pop().m);
  for (const e of A.dragons) {
    e.wait -= dt;
    if (e.wait < 0) { e.wait = 0.5 + Math.random() * 1.8; e.tx = me.x + (Math.random() - 0.5) * 13; e.tz = me.z + (Math.random() - 0.5) * 10; e.ty = 0.5 + Math.random() * 1.1; }
    const dx = e.tx - e.x, dz = e.tz - e.z, d = Math.hypot(dx, dz);
    if (d > 0.15) { const v = Math.min(d, dt * 5.5); e.x += dx / d * v; e.z += dz / d * v; e.ry = Math.atan2(dx, dz); }
    e.y += (e.ty - e.y) * Math.min(1, dt * 3);
    e.m.position.set(e.x, e.y + Math.sin(t * 9 + e.tx) * 0.02, e.z);
    e.m.rotation.y = e.ry;
    for (const [wg, sgn] of e.m.userData.dw) wg.rotation.z = Math.sin(t * 60 + sgn) * 0.5 * sgn;
  }
}
