// 3D für die Orte außerhalb der Insel: die Bummelgasse (Einkaufsstraße) und die Tropeninsel.
// Beide liegen weit weg von der Insel (wie das Zuhause), die Kamera springt beim Ortswechsel mit.
import * as THREE from '../vendor/three.module.min.js';
import * as M from './models.js';
import * as N from './nature.js';
import { building } from './buildings.js';
import { placeable } from './nature.js';
import { tex, model, GLOW_VC } from './assets.js';
import { STREET, TROPIC, STREET_SHOPS, TROPIC_HUT, TROPIC_TREES, TOURS, TOUR_ICON, shopOpen, concertNow } from './newleaf.js';
import { AREAS, NODES, nodeToday, nodeUses } from './areas.js';
import { cropModel } from './nature.js';
import { crop } from './plants.js';
import { TRIP, TRIP_KINDS, tripLayout, tripUses, nodeThing } from './trips.js';

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
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(90, 60), new THREE.MeshLambertMaterial({ color: 0x86c75e, map: tex('grass', 45, 30) }));
  grass.rotation.x = -Math.PI / 2; grass.position.set(X, -0.02, Z); grass.receiveShadow = true; g.add(grass);
  const cobble = tex('cobble', 29 / 2, 8.2 / 2) || canvasTex(128, 128, c => { // Kopfstein aus Blender
    c.fillStyle = '#c9bfb2'; c.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 16) for (let x = 0; x < 128; x += 16) {
      const o = (y / 16) % 2 ? 8 : 0;
      c.fillStyle = `hsl(${28 + Math.random() * 10} ${12 + Math.random() * 10}% ${70 + Math.random() * 12}%)`;
      c.beginPath(); c.roundRect(x + o + 1, y + 1, 14, 14, 5); c.fill();
    }
  }, [14, 4]);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(29, 8.2), new THREE.MeshLambertMaterial({ map: cobble }));
  road.rotation.x = -Math.PI / 2; road.position.set(X, 0.005, Z); road.receiveShadow = true; g.add(road);
  // Gehweg vor und unter den Läden (Steinplatten), mit Bordstein zur Straße und Beeten dahinter
  const slabs = tex('floor_stein', 29 / 1.6, 5 / 1.6);
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(29, 5, 29, 5), new THREE.MeshLambertMaterial(slabs ? { map: slabs, color: 0xfff6ea } : { color: 0xe3d6c4 }));
  walk.rotation.x = -Math.PI / 2; walk.position.set(X, 0.045, Z - 5.5); walk.receiveShadow = true; g.add(walk);
  const curb = new THREE.Mesh(new THREE.BoxGeometry(29.2, 0.12, 0.22), new THREE.MeshLambertMaterial({ color: 0xd9cfc2 }));
  curb.position.set(X, 0.06, Z - 3.0); curb.receiveShadow = curb.castShadow = true; g.add(curb);
  const back = new THREE.Mesh(new THREE.BoxGeometry(29.2, 0.28, 0.5), new THREE.MeshLambertMaterial({ color: 0xb98a5c }));
  back.position.set(X, 0.14, Z - 8.1); back.receiveShadow = back.castShadow = true; g.add(back);
  const soil = new THREE.Mesh(new THREE.BoxGeometry(28.8, 0.06, 0.36), new THREE.MeshLambertMaterial({ color: 0x7a5a3a }));
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
  const geo = new THREE.CircleGeometry(R + 1.2, 64, 0, Math.PI * 2);
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
const glowModel = (p, g) => { const m = M.model(p, g); if (m.children[1]) m.children[1].material = GLOW_VC; return m; };
function hive() {
  const p = [M.box(0.7, 0.12, 0.7, 0x9a6b44, 0, 0.06, 0)];
  for (let i = 0; i < 4; i++) p.push(M.box(0.62 - i * 0.02, 0.18, 0.62 - i * 0.02, i % 2 ? 0xffd23f : 0xf2b632, 0, 0.21 + i * 0.18, 0));
  p.push(M.cone(0.5, 0.32, 0xc99260, 0, 1.02, 0, 4, 0, Math.PI / 4), M.box(0.16, 0.06, 0.04, 0x4a3a2a, 0, 0.3, 0.32));
  return M.model(p);
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
  return glowModel(p, g);
}
function berryBush(col) {
  const p = [M.ball(0.42, 0x4f9f44, 0, 0.36, 0, 1.1, 0.85, 1, 9), M.ball(0.3, 0x5fb84a, 0.22, 0.48, 0.1, 1, 0.9, 1, 8)];
  return [M.model(p), M.model(Array.from({ length: 9 }, (_, i) => M.ball(0.06, col, Math.cos(i * 2.4) * 0.38, 0.36 + Math.sin(i * 1.3) * 0.22, Math.sin(i * 2.4) * 0.3 + 0.12, 1, 1, 1, 6)), [], false)];
}
function mushroom(kind) {
  const c = { steinpilz: [0x9a5a2a, 0xfff2dc], pfifferling: [0xffb02a, 0xffd27a], morchel: [0x8a6a4a, 0xe8d8b8], fliegenpilz: [0xe8302a, 0xfff6ee] }[kind] || [0x9a5a2a, 0xfff2dc];
  const p = [M.cyl(0.07, 0.09, 0.22, c[1], 0, 0.11, 0, 8), M.ball(0.2, c[0], 0, 0.26, 0, 1, 0.6, 1, 10)];
  if (kind === 'fliegenpilz') for (let i = 0; i < 5; i++) p.push(M.ball(0.035, 0xffffff, Math.cos(i * 1.3) * 0.12, 0.34, Math.sin(i * 1.3) * 0.12));
  return M.model(p, [], false);
}
function buildArea(id) {
  const A = AREAS[id], g = new THREE.Group(), X = A.x, Z = A.z, W = A.w, D = A.d;
  const stoneT = tex('floor_stein', (W * 2 + 18) / 2.2, (D * 2 + 18) / 2.2);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W * 2 + 18, D * 2 + 18), new THREE.MeshLambertMaterial(A.cave ? { color: 0x8a7f9a, map: stoneT } : { color: A.ground, map: tex('grass', W + 9, D + 9) }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(X, -0.02, Z); floor.receiveShadow = true; g.add(floor);
  // Weg vom Eingang (Süden) in die Mitte
  const path = new THREE.Mesh(new THREE.PlaneGeometry(2.2, D + 1.4), new THREE.MeshLambertMaterial(A.cave ? { color: 0x7a7088 } : { color: 0xf2deb0, map: tex('path', 1.2, (D + 1.4) / 2) }));
  path.rotation.x = -Math.PI / 2; path.position.set(X, 0.01, Z + D / 2 + 0.7); path.receiveShadow = true; g.add(path);
  const rnd = (i => () => ((i = Math.imul(i, 48271) % 2147483647) / 2147483647))(id.length * 999 + 7);
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
      if (Math.abs(x) < 1.6 || NODES[id].some(n => Math.abs(n.x - x) < 1.4 && Math.abs(n.z - z) < 1.4)) continue;
      if (i % 3) parts.push(M.cone(0.18 + rnd() * 0.12, 0.5 + rnd() * 0.8, 0x8e84a0, x, 0.3, z, 6));
      else { glow.push(M.ball(0.12, 0x9ff0ff, x, 0.18, z, 1, 0.5, 1, 8)); parts.push(M.cyl(0.03, 0.04, 0.14, 0xe8e0f0, x, 0.07, z, 5)); }
    }
    // Laternen am Weg
    for (const [lx, lz] of [[-1.5, D - 1], [1.5, D - 1], [-1.5, 1], [1.5, 1]]) { parts.push(M.cyl(0.05, 0.06, 1.2, 0x45332f, lx, 0.6, lz, 6)); glow.push(M.box(0.18, 0.22, 0.18, 0xffd27a, lx, 1.3, lz)); }
    g.add(glowModel(parts.map(q => (q.g.translate(X, 0, Z), q)), glow.map(q => (q.g.translate(X, 0, Z), q))));
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
      put(g, m, X + rx, Z + rz, rnd() * 6);
    }
    if (id === 'wiese') for (let i = 0; i < 60; i++) { const m = model('wildflower_' + (i % 4)); if (m) put(g, m, X + (rnd() * 2 - 1) * W, Z + (rnd() * 2 - 1) * D, rnd() * 6); }
    if (id === 'wald') for (let i = 0; i < 30; i++) { const m = model('tuft'); if (m) put(g, m, X + (rnd() * 2 - 1) * W, Z + (rnd() * 2 - 1) * D, rnd() * 6); }
  }
  // Feste Dinge: Kiefern, Erzadern, Bienenstöcke, Beerensträucher
  const dyn = [];
  for (const n of NODES[id]) {
    const x = X + n.x, z = Z + n.z;
    if (n.kind === 'pine') { const m = model('pine') || N.wild('tree', 'summer', 3); m.scale.setScalar(1.15); put(g, m, x, z, n.i); }
    else if (n.kind === 'ore') put(g, oreRock(n.i), x, z, n.i * 0.7);
    else if (n.kind === 'hive') put(g, hive(), x, z, n.i);
    else if (n.kind === 'berry') { const [b, fr] = berryBush(id === 'wiese' ? 0xe8304a : 0x4a5aff); put(g, b, x, z, n.i); put(g, fr, x, z, n.i); dyn.push({ n, m: fr }); }
    else dyn.push({ n, m: null, x, z });
  }
  g.userData.dyn = dyn;
  g.userData.lights = A.cave ? NODES[id].filter((n, i) => i % 3 === 0).map(n => [X + n.x, Z + n.z]) : [];
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
  const geo = new THREE.CircleGeometry(R + 1.2, 64);
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
  const sea = new THREE.Mesh(new THREE.CircleGeometry(70, 48), new THREE.MeshLambertMaterial({ color: 0x3fb0d8, transparent: true, opacity: 0.92 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(X, -0.24, Z); g.add(sea);
  const shallow = new THREE.Mesh(new THREE.RingGeometry(R - 0.2, R + 4, 48), new THREE.MeshLambertMaterial({ color: 0x7fe0dc, transparent: true, opacity: 0.7 }));
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

export class Zones {
  constructor(scene) {
    this.scene = scene;
    this.street = buildStreet();
    this.tropic = buildTropic();
    scene.add(this.street, this.tropic);
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
      g.add(M.model(P, G));
    }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.scene.add(g);
  }
  // Pro Bild: Wasser, Obstbäume, Tour-Ziele und Ladenschilder
  update(world, s, t, night, target) {
    this.tropic.userData.u.t.value = t;
    this.tropic.userData.u.night.value = night;
    const where = target.x < -150 ? 'area' : target.z < -150 ? 'street' : target.z > 450 ? 'trip' : target.z > 150 ? 'tropic' : null;
    this.street.visible = where === 'street';
    this.tropic.visible = where === 'tropic';
    if (this.trip) this.trip.visible = where === 'trip';
    if (where === 'trip') { this.updateTrip(world, s, t); return; }
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
  updateArea(world, s, id, t) {
    const g = this.area(id), A = AREAS[id];
    world.tag('areaexit', '🏝️ Zur Insel', A.x, 2.2, A.z + A.d + 0.6, 'name npc');
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
  lights(target) {
    if (target.x < -150) { for (const [id, A] of Object.entries(AREAS)) if (Math.abs(target.z - A.z) < 35 && this.areas[id]) return this.areas[id].userData.lights.length ? this.areas[id].userData.lights : null; }
    return target.z < -150 ? this.street.userData.lights : target.z > 450 ? this.trip?.userData.lights || null : target.z > 150 ? this.tropic.userData.lights : null;
  }
}
