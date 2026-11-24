// 3D für die Orte außerhalb der Insel: die Bummelgasse (Einkaufsstraße) und die Tropeninsel.
// Beide liegen weit weg von der Insel (wie das Zuhause), die Kamera springt beim Ortswechsel mit.
import * as THREE from '../vendor/three.module.min.js';
import * as M from './models.js';
import { building } from './buildings.js';
import { placeable } from './plants.js';
import { STREET, TROPIC, STREET_SHOPS, TROPIC_HUT, TROPIC_TREES, TOURS, TOUR_ICON, shopOpen, concertNow } from './newleaf.js';

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
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(90, 60), new THREE.MeshLambertMaterial({ color: 0x86c75e }));
  grass.rotation.x = -Math.PI / 2; grass.position.set(X, -0.02, Z); grass.receiveShadow = true; g.add(grass);
  const cobble = canvasTex(128, 128, c => {
    c.fillStyle = '#c9bfb2'; c.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 16) for (let x = 0; x < 128; x += 16) {
      const o = (y / 16) % 2 ? 8 : 0;
      c.fillStyle = `hsl(${28 + Math.random() * 10} ${12 + Math.random() * 10}% ${70 + Math.random() * 12}%)`;
      c.beginPath(); c.roundRect(x + o + 1, y + 1, 14, 14, 5); c.fill();
    }
  }, [14, 4]);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(29, 8.2), new THREE.MeshLambertMaterial({ map: cobble }));
  road.rotation.x = -Math.PI / 2; road.position.set(X, 0.005, Z); road.receiveShadow = true; g.add(road);
  const walk = new THREE.Mesh(new THREE.BoxGeometry(29, 0.12, 1.2), new THREE.MeshLambertMaterial({ color: 0xe3d6c4 }));
  walk.position.set(X, 0.04, Z - 3.6); walk.receiveShadow = true; g.add(walk);
  // Läden (Fronten zeigen nach Süden zur Straße)
  for (const [id, B] of Object.entries(STREET_SHOPS)) put(g, building(id, 1, 'summer'), X + (B.x0 + B.x1) / 2, Z + (B.z0 + B.z1) / 2 - 0.2);
  // Lücken zwischen den Läden: Hecken und Bäume
  for (const x of [-13.2, -4, 4, 13.2]) { put(g, placeable('buchsbaum'), X + x, Z - 4.6); put(g, placeable('kirschbaum'), X + x, Z - 5.8); }
  // Südseite: Laternen, Bänke, Blumen, das Tor zurück zur Insel
  for (const x of [-12, -6, 6, 12]) put(g, placeable('laterne'), X + x, Z + 3.9);
  for (const x of [-9, 9]) put(g, placeable('bank'), X + x, Z + 4.1, Math.PI);
  for (const x of [-3.5, 3.5, -14.5, 14.5]) put(g, placeable('blumen'), X + x, Z + 4.1);
  put(g, building('gate', 1, 'summer'), X, Z + 4.6, Math.PI);
  for (const sx of [-1, 1]) for (let k = 0; k < 6; k++) put(g, placeable('hortensie'), X + sx * (2.4 + k * 0.9), Z + 5.2);
  // Wimpelketten über der Straße
  const cols = [0xff6b8a, 0xffd23f, 0x6cc4ff, 0x8fd694, 0xb39cff], flags = [];
  for (let i = 0; i < 26; i++) { const x = -13 + i * 1.04, y = 3.4 - Math.sin(i / 25 * Math.PI) * 0.5; flags.push(M.cone(0.13, 0.26, cols[i % 5], x, y, 0, 3, Math.PI)); }
  for (const z of [-1.2, 1.4]) { const m = M.model(flags.map(f => ({ g: f.g.clone(), c: f.c })), [], false); m.position.set(X, 0, Z + z); g.add(m); }
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
  const land = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  land.position.set(X, 0, Z); land.receiveShadow = true; g.add(land);
  // Meer: türkis am Strand, tiefblau draußen, Schaumkante
  const U = { t: { value: 0 }, night: { value: 0 } };
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(140, 140, 70, 70), new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false,
    vertexShader: `varying vec3 vw; void main(){ vec3 transformed = position; vec4 wq = modelMatrix * vec4(position, 1.0); vw = wq.xyz;
      #include <project_vertex>
      }`,
    fragmentShader: `uniform float t, night; varying vec3 vw;
      void main(){
        float c = length(vw.xz - vec2(${X.toFixed(1)}, ${Z.toFixed(1)})) - ${(R + 0.3).toFixed(2)};
        vec3 col = mix(vec3(0.45, 0.93, 0.88), vec3(0.16, 0.7, 0.86), smoothstep(0.0, 6.0, c));
        col = mix(col, vec3(0.08, 0.42, 0.74), smoothstep(8.0, 30.0, c));
        float w = sin(vw.x * 0.9 + t * 0.8) * sin(vw.z * 0.7 - t * 0.6) + sin((vw.x - vw.z) * 1.7 + t * 1.6) * 0.5;
        col += smoothstep(0.9, 1.4, w) * 0.12;
        float foam = smoothstep(0.35, 0.0, abs(c - 0.2 - sin(t * 1.3 + vw.x * 0.4 + vw.z * 0.3) * 0.25));
        col = mix(col, vec3(1.0), foam * 0.85);
        col *= mix(1.0, 0.38, night);
        gl_FragColor = vec4(col, mix(0.75, 0.96, smoothstep(-0.5, 2.0, c)));
      }`,
  }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(X, -0.24, Z); sea.renderOrder = 1; g.add(sea);
  // Hütte, Steg mit Boot, Palmen, Fackeln
  put(g, building('hut', 1, 'summer'), X + (TROPIC_HUT.x0 + TROPIC_HUT.x1) / 2, Z + (TROPIC_HUT.z0 + TROPIC_HUT.z1) / 2);
  put(g, building('dock', 1, 'summer'), X, Z);
  for (const [x, z] of [[-8, -3], [8, -4], [-7.4, 5.5], [7.6, 5], [-3, -8.3], [4.5, -7.8], [-8.6, 1.5], [8.7, 0.5]]) {
    const m = M.wild('palm', 'summer', 3, 'kokosnuss', true);
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

export class Zones {
  constructor(scene) {
    this.scene = scene;
    this.street = buildStreet();
    this.tropic = buildTropic();
    scene.add(this.street, this.tropic);
    this.trees = new Map();
  }
  // Pro Bild: Wasser, Obstbäume, Tour-Ziele und Ladenschilder
  update(world, s, t, night, target) {
    this.tropic.userData.u.t.value = t;
    this.tropic.userData.u.night.value = night;
    const where = target.z < -150 ? 'street' : target.z > 150 ? 'tropic' : null;
    this.street.visible = where === 'street';
    this.tropic.visible = where === 'tropic';
    if (!where) return;
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
  lights(target) {
    return target.z < -150 ? this.street.userData.lights : target.z > 150 ? this.tropic.userData.lights : null;
  }
}
