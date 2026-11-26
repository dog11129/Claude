// 3D für die Orte außerhalb der Insel: die Bummelgasse (Einkaufsstraße) und die Tropeninsel.
// Beide liegen weit weg von der Insel (wie das Zuhause), die Kamera springt beim Ortswechsel mit.
import * as THREE from '../vendor/three.module.min.js';
import * as M from './models.js';
import { bm, bmv } from './blend.js';
import * as N from './nature.js';
import { building } from './buildings.js';
import { placeable } from './nature.js';
import { tex, model } from './assets.js';
import { STREET, TROPIC, STREET_SHOPS, TROPIC_HUT, TROPIC_TREES, TOURS, TOUR_ICON, shopOpen, concertNow } from './newleaf.js';
import { AREAS, NODES, nodeToday, nodeUses } from './areas.js';
import { cropModel } from './nature.js';
import { crop } from './plants.js';
import { TRIP, TRIP_KINDS, tripLayout, tripUses, nodeThing } from './trips.js';
import { REEF, REEF_SLOTS, REEF_SPOTS, reefScore } from './extras2.js';
import { WRECK, WRECK_CHESTS, WRECK_PORTS, WRECK_DOOR, DEPTH, DEPTH_LV, DEPTH_UP, DEPTH_DOOR, DEPTH_VEINS, DEPTH_RING, ECHO_STONES, DEPTH_LAKE, DEPTH_STAIRS, depthAt } from './extras3.js';
import { itemModel } from './itemmodels.js';
import { zonesW, lightsW } from './world-extra.js';
import { BAMBUS, CLUMPS } from './features/bamboo.js';
import { MOOR, REEDS } from './features/moor.js';
import { decorateArea9, updateArea9, picks9 } from './world-extra6.js';

function canvasTex(w, h, paint, rep) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  paint(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); }
  return t;
}
const put = (g, m, x, z, ry = 0) => { m.position.set(x, 0, z); m.rotation.y = ry; m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); g.add(m); return m; };

// ---------- Bummelgasse ----------
function buildStreet() {
  const g = new THREE.Group(), X = STREET.x, Z = STREET.z;
  // Wiese rundherum, Kopfsteinpflaster, Gehweg vor den Läden
  const grass = new THREE.Mesh(M.flat(90, 60, 2), new THREE.MeshLambertMaterial({ color: 0x86c75e, map: tex('grass', 45, 30) }));
  grass.rotation.x = -Math.PI / 2; grass.position.set(X, -0.02, Z); grass.receiveShadow = true; g.add(grass);
  const cobble = tex('cobble', 29 / 2, 8.2 / 2) || canvasTex(128, 128, c => { // Kopfstein aus Blender
    c.fillStyle = '#c9bfb2'; c.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 16) for (let x = 0; x < 128; x += 16) {
      const o = (y / 16) % 2 ? 8 : 0;
      c.fillStyle = `hsl(${28 + Math.random() * 10} ${12 + Math.random() * 10}% ${70 + Math.random() * 12}%)`;
      c.beginPath(); c.roundRect(x + o + 1, y + 1, 14, 14, 5); c.fill();
    }
  }, [14, 4]);
  const road = new THREE.Mesh(M.flat(29, 8.2, 1), new THREE.MeshLambertMaterial({ map: cobble }));
  road.rotation.x = -Math.PI / 2; road.position.set(X, 0.005, Z); road.receiveShadow = true; g.add(road);
  // Gehweg vor und unter den Läden (Steinplatten), mit Bordstein zur Straße und Beeten dahinter
  const slabs = tex('floor_stein', 29 / 1.6, 5 / 1.6);
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(29, 5, 29, 5), new THREE.MeshLambertMaterial(slabs ? { map: slabs, color: 0xfff6ea } : { color: 0xe3d6c4 }));
  walk.rotation.x = -Math.PI / 2; walk.position.set(X, 0.045, Z - 5.5); walk.receiveShadow = true; g.add(walk);
  const curb = new THREE.Mesh(new THREE.BoxGeometry(29.2, 0.12, 0.22, 30), new THREE.MeshLambertMaterial({ color: 0xd9cfc2 }));
  curb.position.set(X, 0.06, Z - 3.0); curb.receiveShadow = curb.castShadow = true; g.add(curb);
  const back = new THREE.Mesh(new THREE.BoxGeometry(29.2, 0.28, 0.5, 30), new THREE.MeshLambertMaterial({ color: 0xb98a5c }));
  back.position.set(X, 0.14, Z - 8.1); back.receiveShadow = back.castShadow = true; g.add(back);
  const soil = new THREE.Mesh(new THREE.BoxGeometry(28.8, 0.06, 0.36, 30), new THREE.MeshLambertMaterial({ color: 0x7a5a3a }));
  soil.position.set(X, 0.29, Z - 8.1); g.add(soil);
  for (let x = -14; x <= 14; x += 1.15) put(g, placeable(Math.round(x * 3) % 2 ? 'buchsbaum' : 'hortensie'), X + x, Z - 8.35);
  // Läden (Fronten zeigen nach Süden zur Straße)
  for (const [id, B] of Object.entries(STREET_SHOPS)) put(g, building(id, 1, 'summer'), X + (B.x0 + B.x1) / 2, Z + (B.z0 + B.z1) / 2 - 0.2);
  // Lücken zwischen den Läden: Hecken und Bäume
  for (const x of [-13.2, -4, 4, 13.2]) {
    put(g, placeable('buchsbaum'), X + x, Z - 4.4);
    const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.52, 0.42, 18), new THREE.MeshLambertMaterial({ color: 0xc9946a }));
    tub.position.set(X + x, 0.21, Z - 5.9); tub.castShadow = tub.receiveShadow = true; g.add(tub);
    put(g, placeable('kirschbaum'), X + x, Z - 5.9).position.y = 0.36;
  }
  // Südseite: Laternen, Bänke, Blumen, das Tor zurück zur Insel
  for (const x of [-12, -6, 6, 12]) put(g, placeable('laterne'), X + x, Z + 3.9);
  for (const x of [-9, 9]) put(g, placeable('bank'), X + x, Z + 4.1, Math.PI);
  for (const x of [-3.5, 3.5, -14.5, 14.5]) put(g, placeable('blumen'), X + x, Z + 4.1);
  put(g, building('gate', 1, 'summer'), X, Z + 4.6, Math.PI);
  for (const sx of [-1, 1]) for (let k = 0; k < 6; k++) put(g, placeable('hortensie'), X + sx * (2.4 + k * 0.9), Z + 5.2);
  // Wimpelketten über der Straße
  const cols = [0xff6b8a, 0xffd23f, 0x6cc4ff, 0x8fd694, 0xb39cff], flags = [];
  for (let i = 0; i < 26; i++) { const x = -13 + i * 1.04, y = 3.4 - Math.sin(i / 25 * Math.PI) * 0.5; flags.push(M.cone(0.13, 0.26, cols[i % 5], x, y, 0, 3, Math.PI)); }
  for (const z of [-1.2, 1.4]) { const m = model('bunting') || M.model(flags.map(f => ({ g: f.g.clone(), c: f.c })), [], false); m.position.set(X, 0, Z + z); g.add(m); }
  g.userData.lights = [-12, -6, 6, 12].map(x => [X + x, Z + 3.9]);
  return g;
}

// ---------- Tropeninsel ----------
function buildTropic() {
  const g = new THREE.Group(), X = TROPIC.x, Z = TROPIC.z, R = TROPIC.r;
  // Insel: Sandring + Wiese in der Mitte, leicht gewölbt
  const geo = M.disc(R + 1.2, 64, 0.6);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), cs = new THREE.Color(0xf2dfa6), cg = new THREE.Color(0x7fd05a), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getZ(i));
    pos.setY(i, r > R ? -0.45 * (r - R) : 0.12 * (1 - r / R));
    c.copy(cg).lerp(cs, THREE.MathUtils.smoothstep(r, 6.4, 7.1));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const land = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, map: tex('grass', R + 1.2, R + 1.2) }));
  land.position.set(X, 0, Z); land.receiveShadow = true; g.add(land);
  // Meer: türkis am Strand, tiefblau draußen, Schaumkante
  const glintT = tex('glint') || new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  glintT.needsUpdate = true;
  const U = { t: { value: 0 }, night: { value: 0 }, glint: { value: glintT } };
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(140, 140, 70, 70), new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false,
    vertexShader: `varying vec3 vw; void main(){ vec3 transformed = position; vec4 wq = modelMatrix * vec4(position, 1.0); vw = wq.xyz;
      #include <project_vertex>
      }`,
    fragmentShader: `uniform float t, night; uniform sampler2D glint; varying vec3 vw;
      void main(){
        float c = length(vw.xz - vec2(${X.toFixed(1)}, ${Z.toFixed(1)})) - ${(R + 0.3).toFixed(2)};
        vec3 col = mix(vec3(0.45, 0.93, 0.88), vec3(0.16, 0.7, 0.86), smoothstep(0.0, 6.0, c));
        col = mix(col, vec3(0.08, 0.42, 0.74), smoothstep(8.0, 30.0, c));
        float w = sin(vw.x * 0.9 + t * 0.8) * sin(vw.z * 0.7 - t * 0.6) + sin((vw.x - vw.z) * 1.7 + t * 1.6) * 0.5;
        col += smoothstep(0.9, 1.4, w) * 0.12;
        float foam = smoothstep(0.35, 0.0, abs(c - 0.2 - sin(t * 1.3 + vw.x * 0.4 + vw.z * 0.3) * 0.25));
        col = mix(col, vec3(1.0), foam * 0.85);
        float g1 = smoothstep(0.35, 0.95, texture2D(glint, vw.xz * 0.21 + vec2(t * 0.012, t * 0.007)).r), g2 = smoothstep(0.3, 0.9, texture2D(glint, vw.xz * 0.13 - vec2(t * 0.009, -t * 0.011)).r);
        col += g1 * (0.35 + g2 * 0.9) * 0.45 * (1.0 - night * 0.7);
        col *= mix(1.0, 0.38, night);
        gl_FragColor = vec4(col, mix(0.75, 0.96, smoothstep(-0.5, 2.0, c)));
      }`,
  }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(X, -0.24, Z); sea.renderOrder = 1; g.add(sea);
  // Hütte, Steg mit Boot, Palmen, Fackeln
  put(g, building('hut', 1, 'summer'), X + (TROPIC_HUT.x0 + TROPIC_HUT.x1) / 2, Z + (TROPIC_HUT.z0 + TROPIC_HUT.z1) / 2);
  put(g, building('dock', 1, 'summer'), X, Z);
  for (const [x, z] of [[-8, -3], [8, -4], [-7.4, 5.5], [7.6, 5], [-3, -8.3], [4.5, -7.8], [-8.6, 1.5], [8.7, 0.5]]) {
    const m = N.wild('palm', 'summer', 3, 'kokosnuss', true);
    put(g, m, X + x, Z + z, x * 0.7);
  }
  for (const [x, z] of [[-1.5, 8.3], [1.5, 8.3], [-3, -4.2], [3, -4.2]]) put(g, placeable('tikifackel'), X + x, Z + z);
  put(g, placeable('haengematte'), X - 4.2, Z + 7.2, 0.4);
  put(g, placeable('surfbrett'), X + 4.6, Z + 7.6, -0.3);
  put(g, placeable('sandburg'), X - 6.4, Z + 6.6);
  g.userData.u = U;
  g.userData.lights = [[X - 1.5, Z + 8.3], [X + 1.5, Z + 8.3], [X - 3, Z - 4.2], [X + 3, Z - 4.2]];
  return g;
}


// ---------- Insel-Erweiterungen ----------
// Leuchtteile mit eigener Farbe (Kristalle), nachts heller
function hive() {
  const p = [M.box(0.7, 0.12, 0.7, 0x9a6b44, 0, 0.06, 0)];
  for (let i = 0; i < 4; i++) p.push(M.box(0.62 - i * 0.02, 0.18, 0.62 - i * 0.02, i % 2 ? 0xffd23f : 0xf2b632, 0, 0.21 + i * 0.18, 0));
  p.push(M.cone(0.5, 0.32, 0xc99260, 0, 1.02, 0, 4, 0, Math.PI / 4), M.box(0.16, 0.06, 0.04, 0x4a3a2a, 0, 0.3, 0.32));
  return bm('zone_hive', p);
}
function oreRock(seed) {
  const p = [M.ball(0.6, 0x8a8094, 0, 0.34, 0, 1.25, 0.8, 1.05, 8), M.ball(0.38, 0x9a90a4, 0.36, 0.24, 0.24, 1, 0.8, 1, 7), M.ball(0.3, 0x7a7084, -0.4, 0.2, -0.2, 1, 0.8, 1, 7)], g = [];
  const cols = [0xc9a8ff, 0xff7a9a, 0x7ac4ff, 0xffd96a];
  for (let i = 0; i < 6; i++) {
    const a = seed * 1.7 + i * 1.05, c = cols[(seed + i) % 4], r = 0.3 + (i % 2) * 0.12, h = 0.38 + (i % 3) * 0.14;
    const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.8, tilt = 0.35 + (i % 2) * 0.25;
    g.push(M.cyl(0.08, 0.08, h, c, x, 0.6 + h / 2 - 0.1, z, 6, Math.sin(a) * tilt, 0, -Math.cos(a) * tilt));
    g.push(M.cone(0.08, 0.16, c, x + Math.cos(a) * Math.sin(tilt) * h * 0.55, 0.62 + h - 0.06, z + Math.sin(a) * Math.sin(tilt) * h * 0.45, 6, Math.sin(a) * tilt, 0, -Math.cos(a) * tilt));
  }
  return bmv('zone_ore_' + seed, p, g);
}
function berryBush(col) {
  const p = [M.ball(0.42, 0x4f9f44, 0, 0.36, 0, 1.1, 0.85, 1, 9), M.ball(0.3, 0x5fb84a, 0.22, 0.48, 0.1, 1, 0.9, 1, 8)];
  return [bm('zone_berrybush', p), bm('zone_berries_' + col.toString(16), Array.from({ length: 9 }, (_, i) => M.ball(0.06, col, Math.cos(i * 2.4) * 0.38, 0.36 + Math.sin(i * 1.3) * 0.22, Math.sin(i * 2.4) * 0.3 + 0.12, 1, 1, 1, 6)), [], false)];
}
function mushroom(kind) {
  const c = { steinpilz: [0x9a5a2a, 0xfff2dc], pfifferling: [0xffb02a, 0xffd27a], morchel: [0x8a6a4a, 0xe8d8b8], fliegenpilz: [0xe8302a, 0xfff6ee] }[kind] || [0x9a5a2a, 0xfff2dc];
  const p = [M.cyl(0.07, 0.09, 0.22, c[1], 0, 0.11, 0, 8), M.ball(0.2, c[0], 0, 0.26, 0, 1, 0.6, 1, 10)];
  if (kind === 'fliegenpilz') for (let i = 0; i < 5; i++) p.push(M.ball(0.035, 0xffffff, Math.cos(i * 1.3) * 0.12, 0.34, Math.sin(i * 1.3) * 0.12));
  return bm('zone_mushroom_' + kind, p, [], false);
}
function buildArea(id) {
  const A = AREAS[id], g = new THREE.Group(), X = A.x, Z = A.z, W = A.w, D = A.d;
  const stoneT = tex('floor_stein', (W * 2 + 18) / 2.2, (D * 2 + 18) / 2.2);
  const floor = new THREE.Mesh(M.flat(W * 2 + 18, D * 2 + 18), new THREE.MeshLambertMaterial(A.cave ? { color: 0x8a7f9a, map: stoneT } : { color: A.ground, map: tex('grass', W + 9, D + 9) }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(X, -0.02, Z); floor.receiveShadow = true; g.add(floor);
  // Weg vom Eingang (Süden) in die Mitte
  const path = new THREE.Mesh(M.flat(2.2, D + 1.4, 0.75), new THREE.MeshLambertMaterial(A.cave ? { color: 0x7a7088 } : { color: 0xf2deb0, map: tex('path', 1.2, (D + 1.4) / 2) }));
  path.rotation.x = -Math.PI / 2; path.position.set(X, 0.01, Z + D / 2 + 0.7); path.receiveShadow = true; g.add(path);
  const rnd = (i => () => ((i = Math.imul(i, 48271) % 2147483647) / 2147483647))(id.length * 999 + 7), occ = g.userData.occ = []; // Bäume, die durchsichtig werden, wenn sie die Figur verdecken
  if (A.cave) {
    // Felswände rundherum, leuchtende Kristalle, ein kleiner See
    const parts = [], glow = [];
    for (let i = 0; i < 90; i++) {
      const a = i / 90 * Math.PI * 2, rx = (W + 1.6) * Math.cos(a), rz = (D + 1.4) * Math.sin(a);
      if (rz > D && Math.abs(rx) < 2.2) continue; // Ausgang
      parts.push(M.ball(1.1 + rnd() * 0.9, rnd() < 0.5 ? 0x6e6478 : 0x7e748a, rx, 0.6 + rnd() * 1.4, rz, 1, 1.4 + rnd(), 1, 7));
      if (i % 5 === 0) glow.push(M.cone(0.14, 0.7, [0xc9a8ff, 0x8fd4ff, 0xff9ad8][i % 3], rx * 0.93, 0.5 + rnd(), rz * 0.93, 5, (rnd() - 0.5) * 0.6, 0, (rnd() - 0.5) * 0.6));
    }
    for (let i = 0; i < 14; i++) glow.push(M.cone(0.06, 0.5 + rnd() * 0.5, 0xbfa8ff, (rnd() * 2 - 1) * W * 1.1, 2.6 + rnd(), (rnd() * 2 - 1) * D, 5, Math.PI));
    // Tropfsteine und Leuchtpilze auf dem Boden
    for (let i = 0; i < 26; i++) {
      const x = (rnd() * 2 - 1) * (W - 0.5), z = (rnd() * 2 - 1) * (D - 0.5);
      if (Math.abs(x) < 1.6 || NODES[id].some(n => Math.abs(n.x - x) < 1.4 && Math.abs(n.z - z) < 1.4) || Math.hypot(X + x - DEPTH_STAIRS[0], Z + z - DEPTH_STAIRS[1]) < 2) continue;
      if (i % 3) parts.push(M.cone(0.18 + rnd() * 0.12, 0.5 + rnd() * 0.8, 0x8e84a0, x, 0.3, z, 6));
      else { glow.push(M.ball(0.12, 0x9ff0ff, x, 0.18, z, 1, 0.5, 1, 8)); parts.push(M.cyl(0.03, 0.04, 0.14, 0xe8e0f0, x, 0.07, z, 5)); }
    }
    // Laternen am Weg
    for (const [lx, lz] of [[-1.5, D - 1], [1.5, D - 1], [-1.5, 1], [1.5, 1]]) { parts.push(M.cyl(0.05, 0.06, 1.2, 0x45332f, lx, 0.6, lz, 6)); glow.push(M.box(0.18, 0.22, 0.18, 0xffd27a, lx, 1.3, lz)); }
    // Treppe hinab in die Höhlen-Tiefen: dunkles Loch mit Stufen, Felsbogen und einer Laterne
    if (id === 'hoehle') {
      const sx = DEPTH_STAIRS[0] - X, sz = DEPTH_STAIRS[1] - Z;
      parts.push(M.box(1.7, 0.04, 1.5, 0x15101e, sx, 0.0, sz));
      for (let k = 0; k < 4; k++) parts.push(M.box(1.5, 0.08, 0.3, 0x6a6080, sx, -0.02 - k * 0.001, sz + 0.55 - k * 0.32));
      parts.push(M.ball(0.6, 0x5a5070, sx - 1.1, 0.5, sz - 0.3, 1, 1.6, 1, 7), M.ball(0.6, 0x5a5070, sx + 1.1, 0.5, sz - 0.3, 1, 1.6, 1, 7), M.ball(0.55, 0x5a5070, sx, 1.4, sz - 0.6, 2.2, 0.7, 1, 7));
      parts.push(M.cyl(0.04, 0.05, 1.1, 0x45332f, sx + 1.1, 0.55, sz + 0.7, 6));
      glow.push(M.box(0.16, 0.2, 0.16, 0xffb04a, sx + 1.1, 1.2, sz + 0.7));
    }
    g.add(bmv('zone_cave_' + id, parts.map(q => (q.g.translate(X, 0, Z), q)), glow.map(q => (q.g.translate(X, 0, Z), q))));
    const lake = new THREE.Mesh(new THREE.CircleGeometry(1.6, 32), new THREE.MeshLambertMaterial({ color: 0x4f8fd8, transparent: true, opacity: 0.85 }));
    lake.rotation.x = -Math.PI / 2; lake.position.set(X - W + 2.2, 0.02, Z - D + 2); g.add(lake);
  } else {
    // Rand: dichter Wald bzw. Hecken mit Blumen
    for (let i = 0; i < 70; i++) {
      const a = i / 70 * Math.PI * 2, r = 1 + rnd() * 0.6, rx = (W + 1.5) * r * Math.cos(a), rz = (D + 1.5) * r * Math.sin(a);
      if (rz > D && Math.abs(rx) < 2.4) continue;
      const m = id === 'wald' ? (model('pine') || N.wild('tree', 'summer', 3)) : N.wild('tree', 'spring', 3);
      if (id !== 'wald' && i % 2) { put(g, placeable('hortensie'), X + rx * 0.9, Z + rz * 0.9); continue; }
      m.scale.setScalar(1 + rnd() * 0.4);
      occ.push(put(g, m, X + rx, Z + rz, rnd() * 6));
    }
    if (id === 'wiese') for (let i = 0; i < 60; i++) { const m = model('wildflower_' + (i % 4)); if (m) put(g, m, X + (rnd() * 2 - 1) * W, Z + (rnd() * 2 - 1) * D, rnd() * 6); }
    if (id === 'wald') for (let i = 0; i < 30; i++) { const m = model('tuft'); if (m) put(g, m, X + (rnd() * 2 - 1) * W, Z + (rnd() * 2 - 1) * D, rnd() * 6); }
  }
  // Feste Dinge: Kiefern, Erzadern, Bienenstöcke, Beerensträucher
  const dyn = [];
  for (const n of NODES[id]) {
    const x = X + n.x, z = Z + n.z;
    if (n.kind === 'pine') { const m = model('pine') || N.wild('tree', 'summer', 3); m.scale.setScalar(1.15); occ.push(put(g, m, x, z, n.i)); }
    else if (n.kind === 'ore') put(g, oreRock(n.i), x, z, n.i * 0.7);
    else if (n.kind === 'hive') put(g, hive(), x, z, n.i);
    else if (n.kind === 'berry') { const [b, fr] = berryBush(id === 'wiese' ? 0xe8304a : 0x4a5aff); put(g, b, x, z, n.i); put(g, fr, x, z, n.i); dyn.push({ n, m: fr }); }
    else dyn.push({ n, m: null, x, z });
  }
  g.userData.dyn = dyn;
  g.userData.lights = A.cave ? NODES[id].filter((n, i) => i % 3 === 0).map(n => [X + n.x, Z + n.z]) : [];
  decorateArea9(g, id); // Inselleben 9: Natur, Tiere, Bewohner, Ereignisse
  return g;
}

// ---------- Höhlen-Tiefen (drei Höhlen nebeneinander bei z = 2000) ----------
const ECHO_COLS = [0x4a7aff, 0x4ad87a, 0xffd23f, 0xb07aff];
function buildDepths() {
  const g = new THREE.Group(), R = DEPTH.r, Z0 = DEPTH.z, U = { ring: [], doors: [], heart: null, lights: [] };
  const rnd = (i => () => ((i = Math.imul(i, 48271) % 2147483647) / 2147483647))(4242);
  const stoneT = tex('floor_stein', 9, 9);
  DEPTH_LV.forEach((L, lv) => {
    const X0 = L.x, parts = [], glow = [];
    const floor = new THREE.Mesh(M.disc(R + 4, 40), new THREE.MeshLambertMaterial({ color: [0x5a5068, 0x4a5670, 0x4a4a6a][lv], map: stoneT }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(X0, -0.02, Z0); floor.receiveShadow = true; g.add(floor);
    // Felswand rundherum; im Süden die Treppe, im Norden die Tür
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * Math.PI * 2, rx = Math.sin(a) * (R + 0.9), rz = Math.cos(a) * (R + 0.9);
      if (Math.abs(rx) < 1.7) continue;
      const low = rz > 1; // zur Kamera hin (Süden) nur niedrige Felsen, damit man hineinsieht
      parts.push(M.ball(low ? 0.8 + rnd() * 0.4 : 1.2 + rnd() * 0.8, rnd() < 0.5 ? 0x4e4660 : 0x5c5272, rx, low ? 0.15 : 0.8 + rnd() * 1.6, rz, 1, low ? 0.55 : 1.6 + rnd() * 0.8, 1, 7));
    }
    for (const sgn of [-1, 1]) parts.push(M.ball(1.3, 0x4e4660, sgn * 2.4, 1.6, -(R + 0.9), 1, 2, 1, 7));
    // Tropfsteine
    for (let i = 0; i < 16; i++) {
      const a = rnd() * Math.PI * 2, r = 5.4 + rnd() * 2.4, x = Math.sin(a) * r, z = Math.cos(a) * r;
      if (Math.abs(x) < 1.9 || DEPTH_VEINS.some(([vx, vz]) => Math.hypot(vx - x, vz - z) < 1.5) || ECHO_STONES.some(([ex, ez]) => Math.hypot(ex - x, ez - z) < 1.2)) continue;
      parts.push(M.cone(0.16 + rnd() * 0.12, 0.5 + rnd() * 0.9, 0x6a6080, x, 0.3, z, 6));
    }
    // Leuchten an den Wänden: Glühwürmchen (1), blaue Kristalle (2), bunte Kristalle (3)
    for (let i = 0; i < 44; i++) {
      const a = rnd() * Math.PI * 2, r = R + 0.1 - rnd() * 0.5, y = 0.5 + rnd() * 2.6;
      if (lv === 0) glow.push(M.ball(0.035 + rnd() * 0.03, rnd() < 0.7 ? 0xd8ff7a : 0x8affc8, Math.sin(a) * r, y, Math.cos(a) * r, 1, 1, 1, 5));
      else glow.push(M.cone(0.08, 0.3 + rnd() * 0.4, lv === 1 ? [0x7ac4ff, 0x9ad8ff, 0xc9a8ff][i % 3] : [0xff7a9a, 0xffd96a, 0x7affc8, 0x7ac4ff, 0xc9a8ff][i % 5], Math.sin(a) * r, y * 0.45, Math.cos(a) * r, 5, (rnd() - 0.5) * 0.8, 0, (rnd() - 0.5) * 0.8));
    }
    // Treppe nach oben (Süden) mit zwei Laternen
    const [ux, uz] = DEPTH_UP;
    for (let k = 0; k < 4; k++) parts.push(M.box(1.5, 0.08 + k * 0.1, 0.38, 0x5c5272, ux, (0.08 + k * 0.1) / 2, uz + 0.3 + k * 0.38));
    for (const sx of [-1.2, 1.2]) { parts.push(M.cyl(0.04, 0.05, 1.1, 0x45332f, ux + sx, 0.55, uz + 0.1, 6)); glow.push(M.box(0.16, 0.2, 0.16, 0xffd27a, ux + sx, 1.2, uz + 0.1)); }
    // Tür nach unten (Norden): Steinbogen mit leuchtendem Zeichen; der Türflügel wird beim Öffnen ausgeblendet
    const [dx, dz] = DEPTH_DOOR;
    if (lv < 2) {
      parts.push(M.box(0.55, 2.7, 0.7, 0x5c5272, dx - 1.3, 1.35, dz - 0.5), M.box(0.55, 2.7, 0.7, 0x5c5272, dx + 1.3, 1.35, dz - 0.5), M.box(3.2, 0.55, 0.7, 0x5c5272, dx, 2.9, dz - 0.5));
      glow.push(M.ball(0.14, lv ? 0x9ad8ff : 0xd8ff7a, dx, 2.9, dz - 0.12));
      const door = bm('zone_depthdoor_' + lv, [M.box(2.05, 2.5, 0.22, lv ? 0x5a6a8a : 0x6a5a8a, 0, 1.25, 0), M.box(0.5, 0.5, 0.05, lv ? 0x9ad8ff : 0xd8ff7a, 0, 1.5, 0.12)]);
      U.doors[lv] = put(g, door, X0 + dx, Z0 + dz - 0.5);
    }
    // Edelsteinadern
    DEPTH_VEINS.forEach(([x, z], i) => put(g, oreRock(i + lv * 5 + 3), X0 + x, Z0 + z, i * 1.3));
    // Ebene 1: Kristallring – jeder Kristall dunkel oder leuchtend
    if (lv === 0) parts.push(M.cyl(3.75, 3.75, 0.03, 0x6a6080, 0, 0.0, 0.6, 40), M.cyl(2.7, 2.7, 0.04, 0x4a4256, 0, 0.01, 0.6, 40)); // Steinkreis
    if (lv === 0) DEPTH_RING.forEach(([x, z]) => {
      const off = bm('zone_ring_off', [M.cyl(0.2, 0.24, 0.1, 0x4e4660, 0, 0.05, 0, 8), M.cone(0.2, 0.9, 0x9a8ab8, 0, 0.55, 0, 6), M.cone(0.08, 0.4, 0x8a7aa8, 0.16, 0.3, 0.05, 5, 0, 0, -0.5)]);
      const on = bmv('zone_ring_on', [M.cyl(0.2, 0.24, 0.1, 0x4e4660, 0, 0.05, 0, 8)], [M.cone(0.2, 0.9, 0xd8ff7a, 0, 0.55, 0, 6), M.cone(0.08, 0.4, 0x8affc8, 0.16, 0.3, 0.05, 5, 0, 0, -0.5)]);
      U.ring.push({ off: put(g, off, X0 + x, Z0 + z), on: put(g, on, X0 + x, Z0 + z) });
    });
    // Ebene 2: vier Klangsteine vor der singenden Tür (links tief, rechts hoch)
    if (lv === 1) ECHO_STONES.forEach(([x, z], i) => { parts.push(M.cyl(0.32, 0.38, 0.12, 0x4e4660, x, 0.06, z, 10)); glow.push(M.ball(0.3, ECHO_COLS[i], x, 0.3 + i * 0.05, z, 1, 0.75 + i * 0.12, 1, 10)); });
    // Ebene 3: Kristallsee mit dem Herzkristall auf einer kleinen Insel
    if (lv === 2) {
      const lake = new THREE.Mesh(M.disc(DEPTH_LAKE, 40), new THREE.MeshLambertMaterial({ color: 0x2a4a9a, transparent: true, opacity: 0.88 }));
      lake.rotation.x = -Math.PI / 2; lake.position.set(X0, 0.03, Z0); g.add(lake);
      parts.push(M.cyl(0.95, 1.15, 0.28, 0x5c5272, 0, 0.1, 0, 14));
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; glow.push(M.cone(0.06, 0.3, [0xff7a9a, 0xffd96a, 0x7affc8, 0x7ac4ff][i % 4], Math.cos(a) * (DEPTH_LAKE + 0.25), 0.15, Math.sin(a) * (DEPTH_LAKE + 0.25), 5)); }
      U.heart = bmv('zone_heart', [M.cyl(0.18, 0.24, 0.12, 0x6a6080, 0, 0.3, 0, 8)], [M.cone(0.22, 1.0, 0xff8fc8, 0, 0.85, 0, 6), M.cone(0.13, 0.6, 0xc9a8ff, 0.24, 0.62, 0.05, 6, 0, 0, -0.45), M.cone(0.13, 0.55, 0x8fd4ff, -0.23, 0.6, -0.06, 6, 0, 0, 0.45), M.cone(0.1, 0.45, 0xffd96a, 0.02, 0.56, 0.24, 6, 0.5, 0, 0)]);
      put(g, U.heart, X0, Z0);
    }
    g.add(bmv('zone_depth_' + lv, parts.map(q => (q.g.translate(X0, 0, Z0), q)), glow.map(q => (q.g.translate(X0, 0, Z0), q))));
    U.lights.push([X0 - 4.5, Z0 - 1], [X0 + 4.5, Z0 - 1], [X0, Z0 + R - 1.5], [X0, Z0 - 3]);
  });
  g.userData = U;
  return g;
}

// ---------- Ausflugsinsel (jeden Tag eine andere) ----------
function bamboo(v) {
  const p = [];
  for (let i = 0; i < 5; i++) {
    const a = v * 0.7 + i * 1.3, r = i ? 0.22 + (i % 2) * 0.1 : 0, x = Math.cos(a) * r, z = Math.sin(a) * r, h = 1.8 + ((v + i * 37) % 10) / 8;
    for (let j = 0; j < 5; j++) { p.push(M.cyl(0.055, 0.06, h / 5 - 0.03, 0x7cc44a, x, (j + 0.5) * h / 5, z, 7), M.cyl(0.068, 0.068, 0.04, 0x5fa83a, x, (j + 1) * h / 5 - 0.02, z, 7)); }
    for (let j = 0; j < 3; j++) p.push(M.ball(0.12, 0x6cc04a, x + Math.cos(a + j * 2) * 0.16, h * (0.55 + j * 0.15), z + Math.sin(a + j * 2) * 0.16, 1.8, 0.25, 0.7, 6));
  }
  return M.model(p);
}
function bugBush(v) {
  const p = [M.ball(0.45, 0x5fb84a, 0, 0.4, 0, 1.1, 0.85, 1, 9), M.ball(0.3, 0x6cc85a, 0.22, 0.55, 0.12, 1, 0.9, 1, 8)];
  for (let i = 0; i < 10; i++) p.push(M.ball(0.06, [0xff8fab, 0xffe066, 0xffffff, 0xc9a8ff][(v + i) % 4], Math.cos(i * 2.4) * 0.42, 0.42 + Math.sin(i * 1.3) * 0.25, Math.sin(i * 2.4) * 0.36, 1, 1, 1, 6));
  return M.model(p);
}
function pool() {
  const g = new THREE.Group();
  const w = new THREE.Mesh(new THREE.CircleGeometry(0.75, 24), new THREE.MeshLambertMaterial({ color: 0x4fb8e8, transparent: true, opacity: 0.9 }));
  w.rotation.x = -Math.PI / 2; w.position.y = 0.03; g.add(w);
  g.add(M.model(Array.from({ length: 12 }, (_, i) => M.ball(0.16, i % 2 ? 0x9a948e : 0xb0aaa2, Math.cos(i / 12 * Math.PI * 2) * 0.82, 0.06, Math.sin(i / 12 * Math.PI * 2) * 0.82, 1, 0.6, 1, 6))));
  return g;
}
function buildTrip(seed) {
  const L = tripLayout(seed), K = TRIP_KINDS[L.kind], g = new THREE.Group(), X = TRIP.x, Z = TRIP.z, R = TRIP.r;
  const geo = M.disc(R + 1.2, 64, 0.6);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), cs = new THREE.Color(0xf2dfa6), cg = new THREE.Color(K.ground), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getZ(i));
    pos.setY(i, r > R ? -0.45 * (r - R) : 0.1 * (1 - r / R));
    c.copy(cg).lerp(cs, THREE.MathUtils.smoothstep(r, R - 2.2, R - 1.4));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const land = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, map: tex('grass', R + 1.2, R + 1.2) }));
  land.position.set(X, 0, Z); land.receiveShadow = true; g.add(land);
  const sea = new THREE.Mesh(M.disc(70, 48, 2.5), new THREE.MeshLambertMaterial({ color: 0x3fb0d8, transparent: true, opacity: 0.92 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(X, -0.24, Z); g.add(sea);
  const shallow = new THREE.Mesh(new THREE.RingGeometry(R - 0.2, R + 4, 48, 4), new THREE.MeshLambertMaterial({ color: 0x7fe0dc, transparent: true, opacity: 0.7 }));
  shallow.rotation.x = -Math.PI / 2; shallow.position.set(X, -0.2, Z); g.add(shallow);
  // Steg mit Boot im Süden
  const P = [];
  for (let i = 0; i < 9; i++) P.push(M.box(1.5, 0.08, 0.42, i % 2 ? 0xc99260 : 0xb8824f, 0, 0.12, R - 0.6 + i * 0.45));
  for (const sx of [-0.7, 0.7]) for (let i = 0; i < 3; i++) P.push(M.cyl(0.07, 0.07, 0.7, 0x8f603c, sx, -0.15, R + i * 1.5, 6));
  P.push(M.box(1.1, 0.4, 2.2, 0xff8fab, 1.6, -0.05, R + 2.6), M.box(0.9, 0.08, 1.9, 0xfff3e4, 1.6, 0.18, R + 2.6), M.cyl(0.04, 0.04, 1.6, 0xfff3e4, 1.6, 0.9, R + 2.5, 6), M.cone(0.55, 1.1, 0xffffff, 1.95, 1.1, R + 2.5, 3, 0, 0, -0.2));
  g.add(put(new THREE.Group(), M.model(P), X, Z));
  // Rand: Palmen, Sträucher, Bambus (je nach Insel-Art)
  const rnd = (i => () => ((i = Math.imul(i, 48271) % 2147483647) / 2147483647))(seed % 2147483646 + 1);
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2 + rnd() * 0.3, r = R - 0.6 - rnd() * 0.6, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (z > R - 3 && Math.abs(x) < 2.6) continue;
    const m = L.kind === 'bambus' && i % 2 ? bamboo(i * 31) : i % 3 === 2 ? placeable('hortensie') : N.wild('palm', 'summer', 3, 'kokosnuss', rnd() < 0.5);
    put(g, m, X + x, Z + z, rnd() * 6);
  }
  if (L.kind === 'wasserfall') { // Felsklippe mit Wasserfall und Becken
    const F = [M.ball(2.2, 0x8a8094, 0, 1.2, -6.2, 1.6, 1.3, 0.8, 9), M.ball(1.4, 0x9a90a4, -2.2, 0.8, -5.6, 1, 1, 1, 8), M.ball(1.3, 0x7e748a, 2.3, 0.7, -5.7, 1, 1, 1, 8), M.ball(0.5, 0x6cc04a, -1.2, 2.6, -6, 1.4, 0.4, 1, 7)];
    g.add(put(new THREE.Group(), M.model(F), X, Z));
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.8), new THREE.MeshLambertMaterial({ color: 0xd6f4ff, transparent: true, opacity: 0.8 }));
    fall.position.set(X, 1.5, Z - 4.95); g.add(fall);
    const lake = new THREE.Mesh(new THREE.CircleGeometry(1.7, 28), new THREE.MeshLambertMaterial({ color: 0x4fb8e8, transparent: true, opacity: 0.9 }));
    lake.rotation.x = -Math.PI / 2; lake.position.set(X, 0.05, Z - 3.8); g.add(lake);
    g.userData.fall = [X, Z - 4.2];
  }
  const dyn = [];
  for (const n of L.nodes) {
    const x = X + n.x, z = Z + n.z;
    if (n.kind === 'bamboo') put(g, bamboo(n.v), x, z, n.v);
    else if (n.kind === 'ore') put(g, oreRock(n.v % 7), x, z, n.v);
    else if (n.kind === 'pool') put(g, pool(), x, z);
    else if (n.kind === 'bugs') dyn.push({ n, m: put(g, bugBush(n.v), x, z, n.v) });
    else dyn.push({ n, x, z, m: null });
  }
  g.userData.dyn = dyn;
  g.userData.seed = seed;
  g.userData.lights = [[X - 0.8, Z + R], [X + 0.8, Z + R]];
  return g;
}

// ---------- Korallenriff (unter Wasser) ----------
function buildReef() {
  const g = new THREE.Group(), X = REEF.x, Z = REEF.z, R = REEF.r;
  // Meeresboden: heller Sand im Riff, außen steigt er zu einem Felsenkessel an
  const geo = M.disc(48, 72, 1.2);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), cs = new THREE.Color(0xf0dcaa), cd = new THREE.Color(0x5a8aa0), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z);
    pos.setY(i, r > R ? Math.min(4.5, (r - R) ** 1.3 * 0.45) : 0.05 * Math.sin(x * 0.8) * Math.cos(z * 0.6));
    c.copy(cs).lerp(cd, THREE.MathUtils.smoothstep(r, R - 1, R + 6));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const floor = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, map: tex('grass', 24, 24) }));
  floor.position.set(X, 0, Z); floor.receiveShadow = true; g.add(floor);
  const rnd = (i => () => ((i = Math.imul(i, 48271) % 2147483647) / 2147483647))(4711);
  const P = [], G = [];
  // Felsen rundherum
  for (let i = 0; i < 26; i++) {
    const a = i / 26 * Math.PI * 2 + rnd() * 0.2, r = R + 0.4 + rnd() * 1.4, s = (0.6 + rnd() * 0.9) * (Math.sin(a) > 0.2 ? 0.45 : 1);
    if (Math.abs(Math.cos(a) * r) < 2.2 && Math.sin(a) > 0.8) continue; // Platz am Seil zum Auftauchen
    P.push(M.ball(s, [0x8a8098, 0x7a7088, 0x9a8a9a][i % 3], Math.cos(a) * r, s * 0.45, Math.sin(a) * r, 1.3, 0.8, 1.1, 8));
    if (i % 3 === 0) P.push(M.ball(s * 0.35, 0xff8aa8, Math.cos(a) * r, s * 0.95, Math.sin(a) * r, 1.2, 0.5, 1.2, 7)); // Moospolster aus Korallen
  }
  // feste Korallenbüsche am Rand und kleine Steinplatten an den 14 Gestaltungsplätzen
  const CC = [0xff7b8a, 0xffb36b, 0xc9a8ff, 0xff9ad8, 0x6cd4c8];
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + 0.25, r = R - 1.3, x = Math.cos(a) * r, z = Math.sin(a) * r, cc = CC[i % CC.length];
    if (z > R - 3.5 && Math.abs(x) < 2.5) continue;
    for (let j = 0; j < 4; j++) P.push(M.cyl(0.05, 0.08, 0.5 + j * 0.15, cc, x + (j - 1.5) * 0.15, 0.3 + j * 0.06, z + (j % 2) * 0.12, 6, 0, 0, (j - 1.5) * 0.3));
  }
  REEF_SLOTS.forEach(([x, z]) => P.push(M.cyl(0.42, 0.46, 0.06, 0xd8c8a8, x, 0.04, z, 12)));
  // Fundstellen: Sandhügel mit Steinen
  REEF_SPOTS.forEach(([x, z]) => P.push(M.ball(0.55, 0xe2cc98, x, 0, z, 1.3, 0.35, 1.3, 9), M.ball(0.14, 0x9a90a4, x + 0.3, 0.12, z - 0.2), M.ball(0.1, 0x8a8094, x - 0.25, 0.1, z + 0.25)));
  // Seil zum Auftauchen mit Boje oben
  P.push(M.cyl(0.035, 0.035, 2.4, 0xe8d6a8, 0, 1.2, R - 1.2, 6), M.cyl(0.35, 0.35, 0.12, 0x9a90a4, 0, 0.06, R - 1.2, 10), M.ball(0.16, 0xff6b6b, 0, 2.45, R - 1.2), M.cyl(0.165, 0.165, 0.06, 0xffffff, 0, 2.45, R - 1.2, 12));
  G.push(M.ball(0.08, 0, 0, 2.62, R - 1.2));
  g.add(put(new THREE.Group(), bm('zone_reef', P, G), X, Z));
  // Seegras, das sich in der Strömung wiegt
  const weed = [];
  for (let i = 0; i < 22; i++) {
    const a = rnd() * Math.PI * 2, r = 2 + rnd() * (R - 3), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (REEF_SLOTS.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 1) || REEF_SPOTS.some(([sx, sz]) => Math.hypot(sx - x, sz - z) < 1.2) || (z > R - 3 && Math.abs(x) < 1.8)) continue;
    const h = 0.9 + rnd() * 1.2, S = [];
    for (let j = 0; j < 3; j++) S.push(M.cone(0.07, h, [0x4fa156, 0x6cc06a, 0x3f8f6a][j], (j - 1) * 0.1, h / 2, (j % 2) * 0.08, 5, 0, 0, (j - 1) * 0.15));
    const m = bm('zone_reefweed_' + i, S);
    m.position.set(X + x, 0, Z + z);
    g.add(m); weed.push(m);
  }
  // Lichtstrahlen von oben
  const rayMat = new THREE.MeshBasicMaterial({ color: 0xbfefff, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false });
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2 + rnd() * 1.5, 14), rayMat);
    m.position.set(X - 7 + i * 2.8, 6, Z - 4 + rnd() * 6); m.rotation.set(0, rnd() * 3, 0.25);
    g.add(m);
  }
  g.userData = { weed, deco: new Map(), fish: [], lights: [[X - 1, Z + R - 1.2], [X + 1, Z + R - 1.2]], sig: '' };
  return g;
}
// ---------- Schiffswrack (unter Wasser) ----------
function buildWreck() {
  const g = new THREE.Group(), X = WRECK.x, Z = WRECK.z, R = WRECK.r;
  const geo = M.disc(46, 72, 1.2);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), cs = new THREE.Color(0xcdbb8e), cd = new THREE.Color(0x2f5f78), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z);
    pos.setY(i, r > R ? Math.min(5, (r - R) ** 1.3 * 0.5) : 0.06 * Math.sin(x * 0.7) * Math.cos(z * 0.5));
    c.copy(cs).lerp(cd, THREE.MathUtils.smoothstep(r, R - 2, R + 5));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const floor = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, map: tex('grass', 24, 24) }));
  floor.position.set(X, 0, Z); floor.receiveShadow = true; g.add(floor);
  const P = [], G = [], H = [], WD = 0x6a4a2a, WL = 0x8a6440, BR = 0xc8a050; // H = das Schiff selbst (austauschbar)
  // Rumpf (leicht schief im Sand), Deck, Kajüte am Heck (Osten), Galionsfigur am Bug (Westen)
  H.push(M.box(13.2, 1.4, 3.2, WD, 0, 0.5, -3, 0, 0, 0.03), M.box(13.4, 1.2, 0.2, WL, 0, 1.6, -1.45, 0, 0, 0.03), M.box(13.4, 1.0, 0.2, WL, 0, 1.5, -4.55, 0, 0, 0.03));
  for (let i = 0; i < 12; i++) if (i < 4 || i > 6) H.push(M.box(1.05, 0.08, 3.0, i % 2 ? WL : 0x7a5434, -6 + i * 1.08, 1.22, -3));
  H.push(M.box(2.0, 2.4, 3.0, WL, 5.6, 2.3, -3), M.box(2.2, 0.15, 3.2, WD, 5.6, 3.55, -3), M.box(0.08, 1.3, 0.9, 0x3a2a1a, 6.62, 1.85, WRECK_DOOR[1]), M.ball(0.06, BR, 6.68, 1.85, WRECK_DOOR[1] + 0.3));
  H.push(M.cone(0.5, 1.6, WD, -7.2, 1.0, -3, 4, 0, 0, Math.PI / 2), M.ball(0.28, BR, -7.9, 1.7, -3, 1, 1.2, 0.8), M.cone(0.12, 0.4, BR, -8.15, 1.95, -3, 6, 0, 0, Math.PI / 2.4), M.ball(0.08, 0xfff0c0, -8.0, 1.8, -2.8));
  // Bullaugen auf der Südseite (Messingring, dunkles Glas)
  for (const [x, z] of WRECK_PORTS) { H.push(M.cyl(0.34, 0.34, 0.08, BR, x, 1.25, z - 0.27, 16, Math.PI / 2), M.cyl(0.26, 0.26, 0.1, 0x22404a, x, 1.25, z - 0.25, 16, Math.PI / 2)); }
  // umgekippter Mast mit zerrissenem Segel
  H.push(M.cyl(0.14, 0.18, 9, WL, 1.5, 0.6, 1.2, 8, 0, 0, Math.PI / 2 - 0.12), M.box(1.6, 0.03, 1.1, 0xcfc2a2, 2.4, 0.75, 1.75, 0.5, 0.35, 0.1), M.box(0.9, 0.03, 0.7, 0xc4b694, 3.5, 0.62, 2.3, -0.4, 0.25, 0.05));
  // Truhen
  for (const [x, z] of WRECK_CHESTS) P.push(M.box(0.8, 0.45, 0.55, 0x8a5a36, x, 0.24, z), M.cyl(0.275, 0.275, 0.8, 0x8a5a36, x, 0.46, z, 10, 0, 0, Math.PI / 2), M.box(0.06, 0.75, 0.57, BR, x - 0.25, 0.35, z), M.box(0.06, 0.75, 0.57, BR, x + 0.25, 0.35, z), M.box(0.12, 0.12, 0.04, BR, x, 0.38, z + 0.29));
  // Fässer, Felsen, Muscheln
  for (const [x, z, r] of [[-4, 1.5, 0.3], [3.8, 5.2, 1.2], [8.6, 1.0, 0.6], [-8.5, 5.5, 0.2]]) P.push(M.cyl(0.28, 0.28, 0.6, 0x9a6a3a, x, 0.3, z, 12, Math.PI / 2, r));
  const rnd = (i => () => ((i = Math.imul(i, 48271) % 2147483647) / 2147483647))(1711);
  for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2 + rnd() * 0.2, r = R + 0.5 + rnd() * 1.4, s = (0.5 + rnd() * 0.9) * (Math.sin(a) > 0.2 ? 0.45 : 1); if (Math.abs(Math.cos(a) * r) < 2.2 && Math.sin(a) > 0.8) continue; P.push(M.ball(s, [0x6a6478, 0x5a5468, 0x7a7088][i % 3], Math.cos(a) * r, s * 0.4, Math.sin(a) * r, 1.3, 0.8, 1.1, 8)); }
  // Seil zum Auftauchen
  P.push(M.cyl(0.035, 0.035, 2.4, 0xe8d6a8, 0, 1.2, R - 1.2, 6), M.cyl(0.35, 0.35, 0.12, 0x6a6478, 0, 0.06, R - 1.2, 10), M.ball(0.16, 0xffd23f, 0, 2.45, R - 1.2));
  G.push(M.ball(0.08, 0, 0, 2.62, R - 1.2), M.box(0.5, 0.35, 0.02, 0, WRECK_DOOR[0] - 0.4, 2.9, WRECK_DOOR[1] + 1.52));
  g.add(put(new THREE.Group(), bm('zone_wreck', P, G), X, Z));
  // das Schiff: eigenes Modell zone_wreck_ship (Ursprung = Wrack-Mitte), sonst der Platzhalter
  g.add(put(new THREE.Group(), bm('zone_wreck_ship', H), X, Z));
  // Seegras
  const weed = [];
  for (let i = 0; i < 18; i++) {
    const a = rnd() * Math.PI * 2, r = 2 + rnd() * (R - 3), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if ((x > -8.5 && x < 8 && z > -5.5 && z < 0.5) || WRECK_CHESTS.some(([cx, cz]) => Math.hypot(cx - x, cz - z) < 1.2) || (z > R - 3 && Math.abs(x) < 1.8)) continue;
    const h = 0.8 + rnd() * 1.4, Sx = [];
    for (let j = 0; j < 3; j++) Sx.push(M.cone(0.07, h, [0x3f7a4a, 0x4f8f5a, 0x2f6a5a][j], (j - 1) * 0.1, h / 2, (j % 2) * 0.08, 5, 0, 0, (j - 1) * 0.15));
    const m = bm('zone_wreckweed_' + i, Sx);
    m.position.set(X + x, 0, Z + z);
    g.add(m); weed.push(m);
  }
  const rayMat = new THREE.MeshBasicMaterial({ color: 0xbfefff, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false });
  for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4 + rnd() * 1.5, 14), rayMat); m.position.set(X - 8 + i * 4, 6, Z - 2 + rnd() * 6); m.rotation.set(0, rnd() * 3, 0.25); g.add(m); }
  g.userData = { weed, fish: [], lights: [[X + WRECK_DOOR[0] - 0.4, Z + WRECK_DOOR[1] + 1.5], [X, Z + R - 1.2]] };
  return g;
}
const FISH_COL = [[0xff8a3a, 0xffffff], [0xffd23f, 0x6cb4ff], [0x6cb4ff, 0xffe066], [0xff6b8a, 0xffd0dc], [0x8ad45a, 0xffe066], [0xc9a8ff, 0xffffff]];
function reefFish(i) {
  const [a, b] = FISH_COL[i % FISH_COL.length], s = 0.7 + (i % 3) * 0.2;
  const m = bm('zone_reeffish_' + (i % 6), [M.ball(0.16 * s, a, 0, 0, 0, 1.5, 1, 0.55), M.ball(0.08 * s, b, 0.05 * s, 0, 0, 0.3, 1.05, 0.6), M.cone(0.1 * s, 0.16 * s, a, -0.3 * s, 0, 0, 4, 0, 0, Math.PI / 2), M.ball(0.025, 0x2b2222, 0.16 * s, 0.03, 0.06 * s)], [], false);
  Object.assign(m.userData, { r: 3 + (i * 1.7) % 6, y: 0.8 + (i * 0.37) % 2.4, w: (0.25 + (i % 5) * 0.06) * (i % 2 ? 1 : -1), p: i * 1.3 });
  return m;
}

export class Zones {
  constructor(scene) {
    this.scene = scene;
    this.street = this.tropic = null; // Bummelgasse & Tropeninsel erst bauen, wenn man hinkommt (schnellerer Start)
    this.trees = new Map();
    this.areas = Object.fromEntries(Object.keys(AREAS).map(id => [id, null]));
    this.gates = null;
  }
  // Gebiet erst bauen, wenn man hinkommt
  area(id) {
    if (!this.areas[id]) { this.areas[id] = buildArea(id); this.scene.add(this.areas[id]); }
    return this.areas[id];
  }
  // Tore auf der Insel: Treppe, Blumentor, Höhleneingang – mit Schranke, solange es zu ist
  syncGates(world, s) {
    const sig = Object.keys(AREAS).map(id => (s.areas?.[id] ? 1 : 0)).join('');
    if (this.gatesSig === sig) return;
    this.gatesSig = sig;
    if (this.gates) this.scene.remove(this.gates);
    const g = this.gates = new THREE.Group();
    for (const [id, A] of Object.entries(AREAS)) {
      const [x, z] = A.gate, open = !!s.areas?.[id], P = [], G = [];
      if (id === 'wald') { // Holztreppe die Klippe hinauf
        for (let i = 0; i < 6; i++) P.push(M.box(1.3, 0.16, 0.5, 0xc99260, x, 0.1 + i * 0.42, z - 0.1 - i * 0.42));
        for (const sx of [-0.7, 0.7]) { P.push(M.box(0.08, 0.08, 3.4, 0x8f603c, x + sx, 1.6, z - 1.15, 0, 0.78)); for (let i = 0; i < 4; i++) P.push(M.cyl(0.05, 0.05, 0.9, 0x8f603c, x + sx, 0.45 + i * 0.6, z + 0.1 - i * 0.62, 6)); }
      } else if (id === 'hoehle') { // dunkler Bogen in der Felswand mit Laternen
        P.push(M.ball(1.5, 0x7e748a, x, 1.0, z - 0.7, 1.4, 1.2, 0.8, 9), M.ball(0.85, 0x2a2430, x, 0.7, z - 0.35, 1, 1.1, 0.6, 10));
        for (const sx of [-1.1, 1.1]) { P.push(M.cyl(0.05, 0.05, 1.3, 0x45332f, x + sx, 0.65, z + 0.3, 6)); G.push(M.box(0.18, 0.22, 0.18, 0, x + sx, 1.38, z + 0.3)); }
      } else { // Blumentor
        for (const sx of [-0.85, 0.85]) P.push(M.cyl(0.09, 0.11, 1.9, 0xfff3e4, x + sx, 0.95, z, 8));
        P.push(M.box(2.0, 0.16, 0.3, 0xfff3e4, x, 1.95, z));
        for (let i = 0; i < 12; i++) P.push(M.ball(0.13, [0xff9ab8, 0xffd23f, 0xc9a8ff, 0xffffff][i % 4], x - 1 + i * 0.18, 2.08 + Math.sin(i) * 0.05, z + 0.14, 1, 1, 1, 6));
      }
      if (!open) { // Schranke
        P.push(M.box(1.6, 0.14, 0.08, 0xff8a8a, x, 0.75, z + 0.55), M.box(1.6, 0.14, 0.08, 0xffffff, x, 0.5, z + 0.55));
        for (const sx of [-0.8, 0.8]) P.push(M.cyl(0.05, 0.05, 0.9, 0x8f603c, x + sx, 0.45, z + 0.55, 6));
      }
      g.add(bm('gate_' + id + (open ? '_open' : ''), P, G));
    }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.scene.add(g);
  }
  // Pro Bild: Wasser, Obstbäume, Tour-Ziele und Ladenschilder
  update(world, s, t, night, target) {
    if (this.tropic) { this.tropic.userData.u.t.value = t; this.tropic.userData.u.night.value = night; }
    if (zonesW(this, world, s, t, target)) return; // Grotte & Vulkaninsel (world-extra.js)
    const where = target.x < -150 ? 'area' : target.z < -150 ? 'street' : target.z > 1900 ? 'depths' : target.z > 1350 ? 'wreck' : target.z > 1000 ? 'reef' : target.z > 450 ? 'trip' : target.z > 150 ? 'tropic' : null;
    if (where === 'street' && !this.street) { this.street = buildStreet(); this.scene.add(this.street); }
    if (where === 'tropic' && !this.tropic) { this.tropic = buildTropic(); this.scene.add(this.tropic); this.tropic.userData.u.t.value = t; this.tropic.userData.u.night.value = night; }
    if (this.street) this.street.visible = where === 'street';
    if (this.tropic) this.tropic.visible = where === 'tropic';
    if (this.trip) this.trip.visible = where === 'trip';
    if (this.reef) this.reef.visible = where === 'reef';
    if (this.wreck) this.wreck.visible = where === 'wreck';
    if (this.depths) this.depths.visible = where === 'depths';
    if (where === 'depths') { this.updateDepths(world, s, t); return; }
    if (where === 'wreck') { this.updateWreck(world, s, t); return; }
    if (where === 'trip') { this.updateTrip(world, s, t); return; }
    if (where === 'reef') { this.updateReef(world, s, t); return; }
    let here = null;
    if (where === 'area') { let bd = Infinity; for (const [id, A] of Object.entries(AREAS)) { const d = Math.abs(target.z - A.z); if (d < bd) { bd = d; here = id; } } }
    for (const id of Object.keys(AREAS)) if (this.areas[id]) this.areas[id].visible = id === here;
    if (!where) {
      this.syncGates(world, s);
      for (const [id, A] of Object.entries(AREAS)) if (Math.hypot(A.gate[0] - target.x, A.gate[1] - target.z) < 9) world.tag('gate' + id, `${A.icon} ${A.name}${s.areas?.[id] ? '' : ' · 🔒'}`, A.gate[0], 2.6, A.gate[1], 'name npc');
      return;
    }
    if (where === 'area') { this.updateArea(world, s, here, t); return; }
    if (where === 'street') {
      for (const [id, B] of Object.entries(STREET_SHOPS)) {
        const open = shopOpen(s, id), extra = id === 'club' && concertNow(s) ? ' 🎸 Live!' : '';
        world.tag('shop' + id, `${B.who.split(' ')[0]} ${B.name}${open ? extra : ' · 🔒'}`, STREET.x + (B.x0 + B.x1) / 2, 3.5, STREET.z - 3.4, 'name npc');
      }
      world.tag('streetgate', '🏝️ Zur Insel', STREET.x, 3.4, STREET.z + 4.6, 'name npc');
      return;
    }
    // Obstbäume: mit oder ohne Früchte
    TROPIC_TREES.forEach(([x, z, fruit], i) => {
      const ready = s.tropic?.picked?.[i] !== s.day, k = fruit + ready;
      let e = this.trees.get(i);
      if (e && e.k !== k) { this.tropic.remove(e.m); e = null; }
      if (!e) {
        const m = fruit === 'banane' ? placeable('bananenbaum', ready) : fruit === 'mango' ? placeable('mangobaum', ready) : placeable('apfelbaum', ready);
        if (fruit === 'sternfrucht') m.scale.setScalar(0.9);
        put(this.tropic, m, TROPIC.x + x, TROPIC.z + z, i);
        this.trees.set(i, { m, k });
      }
    });
    world.tag('hutsign', `🦜 Kikis Tauschhütte${s.tour ? '' : ' · Touren!'}`, TROPIC.x, 3.2, TROPIC.z + TROPIC_HUT.z1 + 0.6, 'name npc');
    // Tour-Ziele schweben als Sprechblasen über dem Boden
    if (s.tour) {
      const T = TOURS[s.tour.k];
      s.tour.targets.forEach((g, i) => {
        if (g.got) return;
        const bob = T.kind === 'net' ? Math.sin(t * 3 + i) * 0.25 : 0;
        world.tag('tour' + i, TOUR_ICON[s.tour.k], TROPIC.x + g.x + (T.kind === 'net' ? Math.cos(t * 1.3 + i) * 0.15 : 0), 0.75 + bob, TROPIC.z + g.z, 'bubble');
        if (Math.random() < 0.02) world.burst(TROPIC.x + g.x, TROPIC.z + g.z, 'sparkle', 0.2);
      });
    }
  }
  // Pilze, Blumen und Beeren je nach Tag zeigen oder verstecken
  updateTrip(world, s, t) {
    if (!s.trip) return;
    if (this.trip?.userData.seed !== s.trip.seed) { if (this.trip) this.scene.remove(this.trip); this.trip = buildTrip(s.trip.seed); this.scene.add(this.trip); }
    const g = this.trip, K = TRIP_KINDS[tripLayout(s.trip.seed).kind];
    world.tag('tripname', `${K.icon} ${K.name}`, TRIP.x, 3, TRIP.z - 1, 'name npc');
    world.tag('tripboat', '⛵ Nach Hause', TRIP.x + 1.6, 2.4, TRIP.z + TRIP.r + 2.6, 'name npc');
    if (g.userData.fall && Math.random() < 0.3) world.burst(g.userData.fall[0] + (Math.random() - 0.5), g.userData.fall[1], 'mist', 0.1);
    const sig = JSON.stringify(s.trip.used || {});
    if (g.userData.sig === sig) return;
    g.userData.sig = sig;
    for (const e of g.userData.dyn) {
      const used = (s.trip.used?.[e.n.i] || 0) >= tripUses(e.n);
      if (e.n.kind === 'bugs') { e.m.visible = !used; continue; }
      if (used && e.m) { g.remove(e.m); e.m = null; }
      if (!used && !e.m) {
        const thing = nodeThing(e.n);
        e.m = e.n.kind === 'fruit' ? placeable(thing === 'banane' ? 'bananenbaum' : thing === 'mango' ? 'mangobaum' : 'apfelbaum', true) : e.n.kind === 'mush' ? mushroom(thing) : cropModel(thing, 3, crop);
        put(g, e.m, e.x, e.z, e.n.i);
      }
    }
  }
  // Riff: selbst gesetzte Korallen & Muscheln, Fische (mehr Sterne = mehr Fische), Seegras und Blasen
  updateReef(world, s, t) {
    if (!this.reef) { this.reef = buildReef(); this.scene.add(this.reef); }
    const g = this.reef, U = g.userData, X = REEF.x, Z = REEF.z, sc = reefScore(s);
    U.weed.forEach((m, i) => { m.rotation.z = Math.sin(t * 0.9 + i) * 0.12; m.rotation.x = Math.cos(t * 0.7 + i * 1.3) * 0.08; });
    world.tag('reefname', `🪸 Korallenriff ${'⭐'.repeat(sc.stars) || '· noch leer'}`, X, 3.2, Z - REEF.r + 1.5, 'name npc');
    world.tag('reefexit', '🫧 Auftauchen', X, 2.4, Z + REEF.r - 1.2, 'name npc');
    REEF_SPOTS.forEach(([x, z], i) => { if (s.reef?.got?.[i] !== s.day) world.tag('reefspot' + i, '✨', X + x, 0.9 + Math.sin(t * 2 + i) * 0.1, Z + z, 'bubble'); });
    if (Math.random() < 0.25) world.burst(X + (Math.random() - 0.5) * 18, Z + (Math.random() - 0.5) * 18, 'bubble', 0.2 + Math.random() * 2);
    // Fische
    const want = Math.min(26, 4 + sc.stars * 4 + Math.floor(sc.n / 2));
    while (U.fish.length < want) { const f = reefFish(U.fish.length); g.add(f); U.fish.push(f); }
    while (U.fish.length > want) g.remove(U.fish.pop());
    for (const f of U.fish) {
      const u = f.userData, a = u.p + t * u.w;
      f.position.set(X + Math.cos(a) * u.r, u.y + Math.sin(t * 1.3 + u.p) * 0.2, Z + Math.sin(a) * u.r);
      f.rotation.y = -a + (u.w > 0 ? -Math.PI / 2 : Math.PI / 2);
    }
    // Deko auf den Plätzen
    const sig = JSON.stringify(s.reef?.slots || {});
    if (U.sig === sig) return;
    U.sig = sig;
    REEF_SLOTS.forEach(([x, z], i) => {
      const id = s.reef?.slots?.[i] || null, e = U.deco.get(i);
      if (e?.id === id) return;
      if (e) { g.remove(e.m); U.deco.delete(i); }
      if (!id) return;
      const m = itemModel(id) || (['herzmuschel', 'jakobsmuschel', 'kauri', 'koralle', 'sanddollar'].includes(id) ? N.shell(id) : null) || M.model([M.ball(0.2, 0xff8aa8, 0, 0.2, 0)]);
      m.scale.setScalar(1.5);
      put(g, m, X + x, Z + z, i * 0.9);
      U.deco.set(i, { id, m });
      world.burst(X + x, Z + z, 'bubble', 0.3);
    });
  }
  updateWreck(world, s, t) {
    if (!this.wreck) { this.wreck = buildWreck(); this.scene.add(this.wreck); }
    const g = this.wreck, U = g.userData, X = WRECK.x, Z = WRECK.z, W = s.wreck || {};
    U.weed.forEach((m, i) => { m.rotation.z = Math.sin(t * 0.8 + i) * 0.12; });
    world.tag('wreckexit', '🫧 Auftauchen', X, 2.4, Z + WRECK.r - 1.2, 'name npc');
    world.tag('wrecktitle', '⚓ Schiffswrack', X - 2, 4.2, Z - 3, 'name npc');
    world.tag('wreckdoor', W.open ? '🚪 Kajüte (offen)' : '🔒 Kapitänskajüte', X + WRECK_DOOR[0] + 0.3, 2.9, Z + WRECK_DOOR[1], 'name npc');
    WRECK_CHESTS.forEach(([x, z], i) => { if (W.got?.[i] !== s.day) world.tag('wchest' + i, '✨', X + x, 1.1 + Math.sin(t * 2 + i) * 0.1, Z + z, 'bubble'); });
    WRECK_PORTS.forEach(([x, z], i) => { if (Math.hypot(world.target.x - X - x, world.target.z - Z - z) < 4.5) world.tag('wport' + i, W.code?.[i] || '?', X + x, 1.9, Z + z - 0.2, 'bubble'); });
    if (Math.random() < 0.2) world.burst(X + (Math.random() - 0.5) * 18, Z + (Math.random() - 0.5) * 18, 'bubble', 0.2 + Math.random() * 2);
    while (U.fish.length < 6) { const f = reefFish(U.fish.length + 3); g.add(f); U.fish.push(f); }
    for (const f of U.fish) { const u = f.userData, a = u.p + t * u.w * 0.8; f.position.set(X + Math.cos(a) * (u.r + 2), u.y + 0.8, Z + Math.sin(a) * (u.r + 2)); f.rotation.y = -a + (u.w > 0 ? -Math.PI / 2 : Math.PI / 2); }
  }
  updateDepths(world, s, t) {
    if (!this.depths) { this.depths = buildDepths(); this.scene.add(this.depths); }
    const U = this.depths.userData, D = s.depth || {}, lv = Math.max(0, depthAt(world.target)), L = DEPTH_LV[lv], X0 = L.x, Z0 = DEPTH.z;
    U.ring.forEach((c, i) => { const on = !!(D.open?.[0] || D.ring?.[i]); c.on.visible = on; c.off.visible = !on; });
    U.doors.forEach((d, i) => { if (d) d.visible = !D.open?.[i]; });
    if (U.heart) { U.heart.rotation.y = t * 0.5; U.heart.position.y = 0.12 + Math.sin(t * 1.5) * 0.08; }
    world.tag('dtitle', `${L.icon} ${L.name}`, X0, 3.8, Z0 - 2.5, 'name npc');
    world.tag('dup', lv ? '⬆️ Hinauf' : '⬆️ Zur Kristallhöhle', X0 + DEPTH_UP[0], 2.6, Z0 + DEPTH_UP[1] + 0.6, 'name npc');
    if (lv < 2) world.tag('ddoor', D.open?.[lv] ? `⬇️ ${DEPTH_LV[lv + 1].icon} ${DEPTH_LV[lv + 1].name}` : lv ? '🎵 Singende Tür' : '🔒 Kristalltür', X0 + DEPTH_DOOR[0], 3.6, Z0 + DEPTH_DOOR[1], 'name npc');
    DEPTH_VEINS.forEach(([x, z], i) => { if (D.got?.[lv + ':' + i] !== s.day) world.tag('dvein' + i, '✨', X0 + x, 1.5 + Math.sin(t * 2 + i) * 0.1, Z0 + z, 'bubble'); });
    if (lv === 2 && !D.heart) world.tag('dheart', '💗', X0, 2.4, Z0, 'bubble');
    if (Math.random() < 0.3) world.burst(X0 + (Math.random() - 0.5) * 15, Z0 + (Math.random() - 0.5) * 15, 'sparkle', 0.4 + Math.random() * 2.2);
  }
  updateArea(world, s, id, t) {
    const g = this.area(id), A = AREAS[id];
    world.tag('areaexit', '🏝️ Zur Insel', A.x, 2.2, A.z + A.d + 0.6, 'name npc');
    updateArea9(world, s, id, t, g);
    const sig = s.day + '|' + JSON.stringify(Object.entries(s.anode || {}).filter(([k]) => k.startsWith(id + ':')));
    if (g.userData.sig === sig) return;
    g.userData.sig = sig;
    for (const e of g.userData.dyn) {
      const today = nodeToday(id, e.n, s.day), st = s.anode?.[id + ':' + e.n.i], used = st?.d === s.day && st.u >= nodeUses(e.n);
      if (e.n.kind === 'berry') { e.m.visible = !used; continue; }
      const want = !used && today ? today : null;
      if (e.k === want) continue;
      if (e.m) { g.remove(e.m); e.m = null; }
      e.k = want;
      if (!want) continue;
      e.m = e.n.kind === 'mush' ? mushroom(want) : cropModel(want, 3, crop);
      put(g, e.m, e.x, e.z, e.n.i);
    }
  }
  // Antippen: hohe Dinge (Kiefern, Erzfelsen, Bienenstöcke, Bambus, Schilf, Obstbäume) als Säulen [x, z, Radius, Höhe],
  // damit man auch Krone oder Spitze treffen kann – sonst landet der Finger auf dem Boden dahinter
  picks(target) {
    const out = [];
    if (target.x < -150) {
      let id = null, bd = Infinity;
      for (const [k, A] of Object.entries(AREAS)) { const d = Math.abs(target.z - A.z); if (d < bd) { bd = d; id = k; } }
      const A = AREAS[id], H = { pine: [0.6, 3.6], ore: [0.62, 1.3], hive: [0.55, 1.3], berry: [0.5, 0.95], mush: [0.42, 0.6], bloom: [0.42, 0.75] };
      for (const n of NODES[id]) out.push([A.x + n.x, A.z + n.z, ...H[n.kind]]);
      out.push(...picks9(id));
    } else if (target.z < -1050) for (const [x, z] of CLUMPS) out.push([BAMBUS.x + x, BAMBUS.z + z, 0.95, 3.4]);
    else if (target.z < -750) for (const [x, z] of REEDS) out.push([MOOR.x + x, MOOR.z + z, 0.7, 1.5]);
    else if (target.z > 150 && target.z < 450) for (const [x, z] of TROPIC_TREES) out.push([TROPIC.x + x, TROPIC.z + z, 0.6, 3.2]);
    return out;
  }
  lights(target) {
    const lw = lightsW(this, target);
    if (lw !== undefined) return lw || null;
    if (target.x < -150) { for (const [id, A] of Object.entries(AREAS)) if (Math.abs(target.z - A.z) < 35 && this.areas[id]) return this.areas[id].userData.lights.length ? this.areas[id].userData.lights : null; }
    return target.z < -150 ? this.street?.userData.lights || null : target.z > 1900 ? this.depths?.userData.lights || null : target.z > 1350 ? this.wreck?.userData.lights || null : target.z > 1000 ? this.reef?.userData.lights || null : target.z > 450 ? this.trip?.userData.lights || null : target.z > 150 ? this.tropic?.userData.lights || null : null;
  }
}

// Für den Blender-Bauplan (tools/capture-world.py): alle Pilzsorten
export function __capture() {
  for (const k of ['steinpilz', 'pfifferling', 'morchel', 'fliegenpilz']) mushroom(k);
}
