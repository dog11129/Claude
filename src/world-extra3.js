// 3D für Inselleben 6: Jahrmarkt (Riesenrad, Karussell, Buden), Becken mit Bewohnern, Wildtiere, Bienen,
// veredelte Obstbäume, Schatz-Zeichen, Tandem, Picknick- und Band-Plätze der Nachbarn.
import { decorFurniture10 } from './world-extra7.js';
import * as THREE from '../vendor/three.module.min.js';
import * as M from './models.js';
import { bm, bmv } from './blend.js';
import { makeNpc } from './npc.js';
import * as E from './extras6.js';
import { ITEMS, NPC_IDS } from './data.js';
import { FURNITURE } from './furni-data.js';
import { spots, fruitOf, zoneOf } from './state.js';

const put = (g, m, x, z, ry = 0) => { m.position.set(x, 0, z); m.rotation.y = ry; g.add(m); return m; };
const hashC = id => { let h = 7; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return new THREE.Color().setHSL((h % 360) / 360, 0.7, 0.6); };

// ---------- Tandem unter der Figur ----------
export function syncTandem(world, e, on, dt) {
  if (!on) { if (e.tandemM) e.tandemM.visible = false; return; }
  if (!e.tandemM) {
    const F = 0xff8fab, D = 0x4a4a54, g = new THREE.Group();
    g.add(bm('ride_tandem', [M.box(0.08, 0.08, 1.5, F, 0, 0.44, 0), M.box(0.08, 0.34, 0.08, F, 0, 0.3, 0.38), M.box(0.08, 0.34, 0.08, F, 0, 0.3, -0.38), M.box(0.06, 0.06, 0.5, F, 0, 0.22, 0),
      M.box(0.2, 0.07, 0.28, 0x8a5a36, 0, 0.52, 0.35), M.box(0.2, 0.07, 0.28, 0x8a5a36, 0, 0.52, -0.42), M.box(0.56, 0.05, 0.05, 0xd8dce2, 0, 0.8, 0.74), M.cyl(0.025, 0.025, 0.34, 0xd8dce2, 0, 0.62, 0.72, 6),
      M.box(0.34, 0.2, 0.24, 0xc99260, 0, 0.62, 0.95), M.box(0.36, 0.04, 0.26, 0xa87449, 0, 0.73, 0.95)]));
    e.tandemW = [0.72, -0.72].map(z => { const w = new THREE.Group(); w.add(bm('ride_tandem_wheel', [M.cyl(0.3, 0.3, 0.07, D, 0, 0, 0, 16, 0, 0, Math.PI / 2), M.cyl(0.2, 0.2, 0.08, 0xffffff, 0, 0, 0, 12, 0, 0, Math.PI / 2), M.cyl(0.06, 0.06, 0.09, F, 0, 0, 0, 8, 0, 0, Math.PI / 2)])); w.position.set(0, 0.3, z); g.add(w); return w; });
    e.tandemM = g; world.scene.add(g);
  }
  e.tandemM.visible = true;
  e.tandemM.position.set(e.x - Math.sin(e.ry) * 0.32, 0, e.z - Math.cos(e.ry) * 0.32); // vorne sitzt, wer lenkt
  e.tandemM.rotation.y = e.ry;
  for (const w of e.tandemW) w.rotation.x += e.speed * dt * 9;
}

// ---------- Aquarium & Terrarium: Glas und Bewohner ----------
const GLASS = new THREE.MeshLambertMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.32, depthWrite: false });
export function decorFurniture(m, o, f) {
  if (!f?.tank) return decorFurniture10(m, o, f); // Mieze im Körbchen (world-extra7.js)
  // Aquarium (1×1, Wasser ist Teil des Modells): Fische schwimmen vor der Scheibe; Terrarium: Glaskasten drumherum
  const fish = f.tank === 'fish', W = fish ? 0.76 : 0.74, H = 0.6, y0 = fish ? 0.6 : 0.44;
  if (!fish) { const box = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.54), GLASS); box.position.y = y0 + H / 2; box.renderOrder = 2; m.add(box); }
  const list = (o.a || []).map((id, i) => {
    const c = hashC(id), g = new THREE.Group();
    if (fish) { const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 4), new THREE.MeshLambertMaterial({ color: c.clone().multiplyScalar(0.8) })); tail.position.set(-0.12, 0, 0); tail.rotation.set(0, 0, Math.PI / 2); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6).scale(1.5, 0.9, 0.6), new THREE.MeshLambertMaterial({ color: c })), tail); }
    else { g.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshLambertMaterial({ color: c }))); for (const s of [-1, 1]) { const wing = new THREE.Mesh(new THREE.CircleGeometry(0.05, 6), new THREE.MeshLambertMaterial({ color: c.clone().lerp(new THREE.Color(0xffffff), 0.4), side: THREE.DoubleSide })); wing.position.set(0, 0.02, s * 0.03); wing.userData.s = s; g.add(wing); } }
    m.add(g);
    return { g, i, ph: i * 1.9 + 0.3 };
  });
  if (!list.length) return null;
  return t => {
    for (const L of list) {
      const a = t * (fish ? 0.6 : 0.9) + L.ph;
      if (fish) { L.g.position.set(Math.sin(a) * (W / 2 - 0.12), y0 + 0.06 + (L.i % 3) * 0.1 + Math.sin(a * 2.3) * 0.02, 0.1); L.g.scale.setScalar(0.7); L.g.rotation.y = Math.cos(a) > 0 ? 0 : Math.PI; }
      else { const fly = Math.sin(a * 0.7) > 0.3; L.g.position.set(Math.sin(a) * 0.25, y0 + 0.1 + (fly ? 0.2 + Math.sin(a * 3) * 0.05 : 0), Math.cos(a * 1.7) * 0.18); L.g.children.slice(1).forEach(w => { w.rotation.x = w.userData.s * (0.5 + Math.sin(t * (fly ? 30 : 4)) * 0.5); }); }
    }
  };
}

// ---------- Wildtiere ----------
function wildModel(id) {
  if (id === 'igel') return bm('wild_igel', [M.ball(0.22, 0x8a6a4a, 0, 0.16, 0, 1, 0.75, 1.2, 10), ...Array.from({ length: 16 }, (_, i) => { const a = i * 2.4, r = i / 16; return M.cone(0.04, 0.14, 0x5a4030, Math.sin(a) * 0.15 * (1 - r * 0.4), 0.26, -0.05 + Math.cos(a) * 0.12 - r * 0.1, 4, -0.6 - r * 0.6); }),
    M.ball(0.09, 0xd8b890, 0, 0.13, 0.22, 1, 0.9, 1.3), M.ball(0.025, 0x2a1a14, 0, 0.14, 0.33), ...[-1, 1].map(s => M.ball(0.018, 0x2a1a14, s * 0.05, 0.18, 0.27))]);
  if (id === 'eichhoernchen') return bm('wild_eichhoernchen', [M.ball(0.12, 0xd86a2a, 0, 0.18, 0, 1, 1.2, 0.9), M.ball(0.09, 0xd86a2a, 0, 0.36, 0.06), M.ball(0.05, 0xfff0e0, 0, 0.17, 0.08, 1, 1.2, 0.6),
    ...[-1, 1].flatMap(s => [M.cone(0.025, 0.07, 0xd86a2a, s * 0.05, 0.46, 0.04, 4), M.ball(0.015, 0x2a1a14, s * 0.04, 0.38, 0.13)]), M.ball(0.12, 0xe07a3a, 0, 0.3, -0.17, 0.7, 1.6, 0.6), M.ball(0.08, 0xe07a3a, 0, 0.48, -0.12, 0.7, 1, 0.6)]);
  return bm('wild_' + id, [M.ball(0.14, 0xf4f0e6, 0, 0.1, 0, 1, 0.7, 1.3), M.ball(0.08, 0x3a8a4a, 0, 0.26, 0.13), M.cone(0.035, 0.08, 0xffa83a, 0, 0.24, 0.23, 6, Math.PI / 2), ...[-1, 1].map(s => M.ball(0.015, 0x1a1a1a, s * 0.04, 0.28, 0.18)), M.ball(0.05, 0xf4f0e6, 0, 0.14, -0.17, 1, 0.8, 1)]);
}
function updateWild(world, s, t) {
  const U = world.wild6 ||= new Map(), tg = world.target, here = zoneOf(tg) === 'island' && tg.x < 150;
  for (const id of E.WILD_IDS) {
    const awake = here && E.wildAwake(s, id), n = id === 'ente' ? 3 : 1;
    let e = U.get(id);
    if (!awake) { if (e) e.list.forEach(m => (m.visible = false)); continue; }
    if (!e) { e = { list: Array.from({ length: n }, () => { const m = wildModel(id); world.scene.add(m); return m; }) }; U.set(id, e); }
    e.list.forEach((m, i) => {
      const p = E.wildPos(s, id, t + i * 2.2);
      if (!p) { m.visible = false; return; }
      m.visible = true;
      const bob = id === 'ente' ? Math.sin(t * 2 + i) * 0.02 : id === 'eichhoernchen' ? Math.abs(Math.sin(t * 5 + i)) * 0.08 * (Math.sin(t * 0.7) > 0.5 ? 1 : 0) : 0;
      m.position.set(p.x + (id === 'ente' ? 0 : Math.sin(t * 0.4 + i) * 0.2), (p.water ? -0.05 : 0) + bob, p.z + (id === 'ente' ? 0 : Math.cos(t * 0.33 + i) * 0.15));
      m.rotation.y = id === 'ente' ? t * 0.15 + i * 2.1 + Math.PI / 2 : Math.sin(t * 0.3 + i) * 1.5;
    });
    const p = e.list[0].position, w = s.wild?.[id] || {};
    if (Math.hypot(p.x - tg.x, p.z - tg.z) < 7) world.tag('wild' + id, `${E.WILD[id].icon} ${'💗'.repeat(w.t || 0) || '🤍'}`, p.x, 0.75, p.z, 'name npc');
  }
}

// ---------- Bienen, veredelte Bäume, Picknick, Schatz-Zeichen ----------
const BEE = new THREE.MeshBasicMaterial({ color: 0xffd23f });
export function updateIsland6(world, s, t, dt) {
  const tg = world.target, onIsle = tg.x < 150 && tg.x > -150 && tg.z > -150 && tg.z < 150;
  updateWild(world, s, t);
  if (zoneOf(tg) === 'street' && tg.x > 3) { const d = E.nextFair(s); world.tag('fairsign', E.fairOpen(s) ? '🎡 Jahrmarkt ➜' : `🎡 Jahrmarkt ${d === s.day ? 'heute ab 10 Uhr' : `in ${d - s.day} Tag${d - s.day > 1 ? 'en' : ''}`}`, 13.6, 2.4, -300, 'name npc'); }
  // Bienen um die Kästen
  const B = world.bees6 ||= { m: new Map() };
  const want = new Set();
  if (onIsle && s.dayTime > 0.05 && s.dayTime < 0.75 && s.weather !== 'rain' && s.weather !== 'storm') for (const [k, o] of Object.entries(s.obj || {})) {
    if (o?.k !== 'bienenkasten') continue;
    const [x, z] = k.split(',').map(Number);
    if (Math.hypot(x - tg.x, z - tg.z) > 16) continue;
    want.add(k);
    let e = B.m.get(k);
    if (!e) { e = Array.from({ length: 5 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), BEE); world.scene.add(m); return m; }); B.m.set(k, e); }
    e.forEach((m, i) => { const a = t * (1.3 + i * 0.2) + i * 1.3, r = 0.5 + Math.sin(t * 0.7 + i) * 0.35; m.position.set(x + Math.sin(a) * r, 0.8 + Math.sin(t * 3 + i) * 0.25, z + Math.cos(a * 1.1) * r); });
    if (s.bees?.[k] !== s.day && E.beeTotal(E.beeFlowers(s, x, z)) >= E.BEE_MIN && Math.hypot(x - tg.x, z - tg.z) < 9) world.tag('bee' + k, '🍯', x, 1.4, z, 'bubble');
  }
  for (const [k, e] of B.m) if (!want.has(k)) { e.forEach(m => world.scene.remove(m)); B.m.delete(k); }
  // Zweite Obstsorte an veredelten Bäumen
  const G = world.graft6 ||= new Map(), all = spots(s);
  for (const [k, g] of Object.entries(s.graft || {})) {
    const sig = `${g.f}|${E.graftGrown(s, k)}|${!(s.fruit?.[k] > s.day)}`;
    let e = G.get(k);
    if (e?.sig === sig) continue;
    if (e) world.scene.remove(e.m);
    if (all[k] !== 'tree') { G.delete(k); continue; }
    const [x, z] = k.split(',').map(Number), grown = E.graftGrown(s, k), ripe = grown && !(s.fruit?.[k] > s.day);
    const col = { apfel: 0xe8383c, kirsche: 0xc8102e, orange: 0xff9a1a, pfirsich: 0xffa880, birne: 0xc8d850 }[g.f] || 0xffd23f;
    const parts = ripe ? [0, 1, 2].map(i => M.ball(0.1, col, Math.sin(i * 2.1 + 1) * 0.75, 1.7 + (i % 2) * 0.35, Math.cos(i * 2.1 + 1) * 0.75)) : [M.ball(0.05, 0x8fd694, 0.5, 1.4, 0.4), M.box(0.18, 0.04, 0.04, 0xe8dcc6, 0.5, 1.35, 0.4)];
    const m = bm(ripe ? 'graft_fruit_' + g.f : 'graft_bud', parts); m.position.set(x, 0, z); world.scene.add(m);
    G.set(k, { sig, m });
  }
  for (const [k, e] of G) if (!s.graft?.[k]) { world.scene.remove(e.m); G.delete(k); }
  // Picknick: Gericht auf der Decke
  const P = E.picnicNow(s);
  if (P && onIsle) { const [x, z] = P.k.split(',').map(Number); if (Math.hypot(x - tg.x, z - tg.z) < 12) world.tag('picnic6', ITEMS[P.dish]?.icon || '🧺', x, 0.55 + Math.sin(t * 2) * 0.05, z, 'bubble'); }
  // Inselband: Instrumente über den Nachbarn
  if (E.bandToday(s) && E.concertTime(s)) E.bandNpcs(s).forEach((id, i) => { const n = world.npcM?.get(id); if (n && Math.hypot(n.x - tg.x, n.z - tg.z) < 14) world.tag('band' + id, ['🎸', '🥁', '🔔'][i] + (s.band.done ? '🎶' : ''), n.x, (n.m.userData.headTop || 1.3) + 0.75 + (s.band.done ? Math.abs(Math.sin(t * 4 + i)) * 0.15 : 0), n.z, 'bubble'); });
  // Schatz-Zeichen: Kreuz im Sand / Glitzern am Ziel
  const X = world.pirate6 ||= { m: null };
  const ready = E.pirateReady(s), at = ready && s.pirate.at, st = ready && E.PIRATE[s.pirate.stage];
  const show = at && Math.hypot(at[0] - tg.x, at[1] - tg.z) < 9;
  if (show && st.dig && !X.m) { X.m = bm('zone_digmark', [M.box(0.9, 0.02, 0.12, 0x8a4a2a, 0, 0.012, 0, Math.PI / 4), M.box(0.9, 0.02, 0.12, 0x8a4a2a, 0, 0.013, 0, -Math.PI / 4)], [], false); world.scene.add(X.m); }
  if (X.m) { X.m.visible = !!(show && st.dig); if (show) X.m.position.set(at[0], 0, at[1]); }
  if (show) world.tag('pirate6', st.dig ? '❌' : '✨', at[0], 0.6 + Math.sin(t * 3) * 0.1, at[1], 'bubble');
}

// ---------- Wo stehen Nachbarn heute anders? (Picknick, Band, Einstieg mit Mira) ----------
export function npcOverride6(world, s, id, t) {
  const p = E.picnicSeat(s, id) || E.bandSpot(s, id);
  if (p) return p;
  if (s.intro?.on && id === 'mira') {
    const tg = world.target;
    if (zoneOf(tg) !== 'island' || tg.x > 150) return null;
    const ry = world.yaw || 0;
    return { x: tg.x - 1.4 * Math.cos(ry) + 0.6 * Math.sin(ry), z: tg.z + 1.4 * Math.sin(ry) + 0.6 * Math.cos(ry), walking: true };
  }
  return null;
}

// ---------- Jahrmarkt ----------
function buildFair() {
  const g = new THREE.Group(), X = E.FAIR.x, Z = E.FAIR.z, P = E.FAIR_SPOTS, parts = [], glow = [];
  const ground = new THREE.Mesh(M.flat(E.FAIR.w * 2 + 8, E.FAIR.d * 2 + 8), new THREE.MeshLambertMaterial({ color: 0xd8c4a0 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(X, -0.01, Z); g.add(ground);
  const grass = new THREE.Mesh(M.flat(120, 120, 2.5), new THREE.MeshLambertMaterial({ color: 0x7ac060 }));
  grass.rotation.x = -Math.PI / 2; grass.position.set(X, -0.03, Z); g.add(grass);
  // Zaun mit Tor im Süden
  for (let x = -E.FAIR.w - 1; x <= E.FAIR.w + 1; x += 1) for (const z of [-E.FAIR.d - 1, E.FAIR.d + 1]) if (Math.abs(x) > 1.6 || z < 0) parts.push(M.box(0.1, 0.6, 0.1, 0xffffff, x, 0.3, z), M.box(1.0, 0.07, 0.05, x % 2 ? 0xff8fab : 0xffffff, x + 0.5, 0.45, z));
  for (let z = -E.FAIR.d - 1; z <= E.FAIR.d + 1; z += 1) for (const x of [-E.FAIR.w - 1, E.FAIR.w + 1]) parts.push(M.box(0.1, 0.6, 0.1, 0xffffff, x, 0.3, z), M.box(0.05, 0.07, 1.0, 0xffffff, x, 0.45, z + 0.5));
  parts.push(...[-1.6, 1.6].map(x => M.cyl(0.1, 0.12, 2.6, 0xff8fab, x, 1.3, E.FAIR.d + 1, 8)), M.box(3.6, 0.5, 0.15, 0xffd23f, 0, 2.6, E.FAIR.d + 1));
  // Riesenrad: Ständer
  const R = P.rad;
  for (const sx of [-1, 1]) parts.push(M.box(0.14, 4.0, 0.14, 0xd8dce2, R.x + sx * 1.1, 1.8, R.z - 0.35, 0, 0, sx * 0.3), M.box(0.14, 4.0, 0.14, 0xd8dce2, R.x + sx * 1.1, 1.8, R.z + 0.25, 0, 0, sx * 0.3));
  parts.push(M.box(1.8, 0.2, 1.2, 0xff8fab, R.x, 0.1, R.z + 0.2));
  // Karussell: Sockel & Dach
  const K = P.karussell;
  parts.push(M.cyl(1.8, 1.9, 0.25, 0xfff3e0, K.x, 0.12, K.z, 24), M.cyl(0.18, 0.18, 2.2, 0xffd23f, K.x, 1.3, K.z, 10));
  // Losbude, Entenangeln, Süßigkeiten
  const booth = (b, col, roof) => { parts.push(M.box(1.8, 0.9, 1.0, col, b.x, 0.45, b.z - 0.2), M.box(1.9, 0.08, 1.1, 0xffffff, b.x, 0.92, b.z - 0.2), ...[-0.85, 0.85].map(x => M.box(0.08, 1.4, 0.08, 0xffffff, b.x + x, 1.6, b.z + 0.25))); for (let i = 0; i < 6; i++) parts.push(M.box(0.33, 0.06, 0.6, i % 2 ? roof : 0xffffff, b.x - 0.83 + i * 0.33, 2.3, b.z, 0, 0.45)); };
  booth(P.lose, 0xb08cff, 0xff8fab); booth(P.suess, 0xffb7c8, 0xffd23f);
  parts.push(M.cyl(1.0, 1.05, 0.4, 0xffffff, P.enten.x, 0.2, P.enten.z, 20));
  const pool = new THREE.Mesh(new THREE.CircleGeometry(0.92, 24), new THREE.MeshLambertMaterial({ color: 0x5ab8e8 }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(X + P.enten.x, 0.41, Z + P.enten.z); g.add(pool);
  // Lichterketten
  for (let i = 0; i < 22; i++) { const x = -E.FAIR.w + i * (E.FAIR.w * 2 / 21); glow.push(M.ball(0.07, [0xffd23f, 0xff8fab, 0x8fd4ff][i % 3], x, 2.4 + Math.sin(i * 0.9) * 0.15, -E.FAIR.d + 0.2), M.ball(0.07, [0xffd23f, 0xff8fab, 0x8fd4ff][i % 3], x, 2.4 + Math.cos(i * 0.9) * 0.15, E.FAIR.d - 0.3)); }
  for (const x of [-E.FAIR.w, E.FAIR.w]) parts.push(M.cyl(0.05, 0.05, 2.5, 0xffffff, x, 1.25, -E.FAIR.d + 0.2, 6), M.cyl(0.05, 0.05, 2.5, 0xffffff, x, 1.25, E.FAIR.d - 0.3, 6));
  g.add(bmv('zone_fair', parts.map(q => (q.g.translate(X, 0, Z), q)), glow.map(q => (q.g.translate(X, 0, Z), q))));
  // drehende Teile
  const wheel = new THREE.Group();
  wheel.add(bm('fair_wheel', [M.cyl(0.25, 0.25, 0.7, 0xffd23f, 0, 0, 0, 12, Math.PI / 2), ...Array.from({ length: 8 }, (_, i) => M.box(0.07, E.WHEEL.r * 2, 0.07, 0xffffff, 0, 0, 0, 0, 0, i * Math.PI / 8)),
    ...[-0.25, 0.25].flatMap(z => Array.from({ length: 24 }, (_, i) => { const a = i / 24 * Math.PI * 2, b = (i + 1) / 24 * Math.PI * 2, mx = (Math.sin(a) + Math.sin(b)) / 2 * E.WHEEL.r, my = (Math.cos(a) + Math.cos(b)) / 2 * E.WHEEL.r; return M.box(E.WHEEL.r * 0.27, 0.08, 0.08, i % 2 ? 0xff8fab : 0x8fd4ff, mx, my, z, 0, 0, -(a + b) / 2); }))]));
  wheel.position.set(X + R.x, E.WHEEL.hub, Z + R.z);
  g.add(wheel);
  const gondolas = Array.from({ length: E.WHEEL.n }, (_, i) => { const m = bm('fair_gondola_' + (i % 4), [M.box(0.7, 0.45, 0.55, [0xff8fab, 0x8fd4ff, 0xffd23f, 0xb08cff][i % 4], 0, 0.12, 0), M.box(0.74, 0.06, 0.6, 0xffffff, 0, 0.62, 0), M.cyl(0.02, 0.02, 0.5, 0xffffff, 0, 0.4, 0, 4)]); g.add(m); return m; });
  const carousel = new THREE.Group();
  carousel.add(bm('fair_carousel', [put0(M.cone(2.1, 0.9, 0xff8fab, 0, 2.65, 0, 16)), M.cyl(2.1, 2.1, 0.25, 0xffffff, 0, 2.15, 0, 16), ...Array.from({ length: 16 }, (_, i) => M.ball(0.06, 0xffd23f, Math.sin(i / 16 * Math.PI * 2) * 2.05, 2.05, Math.cos(i / 16 * Math.PI * 2) * 2.05))]));
  carousel.position.set(X + K.x, 0, Z + K.z);
  g.add(carousel);
  const horses = Array.from({ length: E.CAROUSEL.n }, (_, i) => { const c = [0xffffff, 0xffd8e8, 0xd8ecff][i % 3]; const m = bm('fair_horse_' + (i % 3), [M.ball(0.18, c, 0, 0, 0, 0.8, 0.7, 1.5), M.ball(0.1, c, 0, 0.18, 0.26, 0.8, 1, 1.3), M.box(0.06, 0.22, 0.16, 0xff8fab, 0, 0.18, 0.12), M.cyl(0.025, 0.025, 1.9, 0xffd23f, 0, 0.75, 0, 6), ...[-0.12, 0.12].flatMap(x => [0.18, -0.18].map(z => M.cyl(0.03, 0.03, 0.25, c, x, -0.18, z, 5)))]); g.add(m); return m; });
  const npcs = NPC_IDS.slice(0, 3).map((id, i) => { const m = makeNpc(NPC_IDS[(i * 2 + 1) % NPC_IDS.length]); m.position.set(X + [-3, 3.5, -1][i], 0, Z + [2.5, 0.5, 5][i]); m.rotation.y = [0.6, -0.8, 3][i]; g.add(m); return m; });
  g.userData = { wheel, gondolas, carousel, horses, npcs, lights: [[X, Z + 4], [X + R.x, Z + R.z + 2], [X + K.x, Z + K.z], [X + 6, Z]] };
  return g;
}
const put0 = q => q;
export function zones6(zones, world, s, t, target) {
  const on = E.zone6(target.z) === 'fair' && target.x > -150 && target.x < 150;
  if (zones.fair6) zones.fair6.visible = on;
  if (!on) return false;
  if (!zones.fair6) { zones.fair6 = buildFair(); zones.scene.add(zones.fair6); }
  const U = zones.fair6.userData, X = E.FAIR.x, Z = E.FAIR.z, open = E.fairOpen(s), tt = world.time;
  U.wheel.rotation.z = (tt / E.WHEEL.period) * Math.PI * 2;
  U.gondolas.forEach((m, i) => { const p = E.wheelSeat(tt, i); m.position.set(p.x, p.y - 0.12, p.z); });
  U.carousel.rotation.y = tt / E.CAROUSEL.period * Math.PI * 2;
  U.horses.forEach((m, i) => { const p = E.carouselSeat(tt, i); m.position.set(p.x, p.y + 0.15, p.z); m.rotation.y = p.ry + Math.PI; });
  U.npcs.forEach((m, i) => { m.visible = open; m.userData.update?.(world.dt || 0.016, { speed: 0, time: tt + i }); });
  for (const [k, P] of Object.entries(E.FAIR_SPOTS)) if (Math.hypot(X + P.x - target.x, Z + P.z - target.z) < 10) world.tag('fair' + k, `${P.icon} ${P.name}`, X + P.x, k === 'rad' ? 0.9 : 2.7, Z + P.z + (k === 'rad' ? 1.2 : 0), 'name npc');
  world.tag('fairgate', open ? '🎡 Jahrmarkt' : '🎡 Heute geschlossen', X, 3.3, Z + E.FAIR.d + 1, 'name npc');
  return true;
}
export const lights6 = (zones, target) => (target.z < -450 && Math.abs(target.x) < 150 ? zones.fair6?.userData.lights || null : undefined);

// Für den Blender-Bauplan (tools/capture-world.py)
export function __capture() {
  for (const id of E.WILD_IDS) wildModel(id);
  syncTandem({ scene: { add() {} } }, { x: 0, z: 0, ry: 0, speed: 0 }, true, 0);
}
