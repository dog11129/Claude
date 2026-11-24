// Die 3D-Darstellung: baut aus dem Spielzustand die Szene und hält sie aktuell.
import * as THREE from '../vendor/three.module.min.js';
import { EffectComposer } from '../vendor/post/EffectComposer.js';
import { RenderPass } from '../vendor/post/RenderPass.js';
import { UnrealBloomPass } from '../vendor/post/UnrealBloomPass.js';
import { OutputPass } from '../vendor/post/OutputPass.js';
import { ShaderPass } from '../vendor/post/ShaderPass.js';

// Miniatur-Look: oben/unten weich unscharf (Tilt-Shift), dazu etwas mehr Farbe und Wärme
const FINISH = {
  uniforms: { tDiffuse: { value: null }, aspect: { value: 1 }, amount: { value: 0.006 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float aspect, amount; varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float d = clamp(abs(vUv.y - 0.45) * 2.4 - 0.3, 0.0, 1.0), r = d * d * amount;
      if (r > 0.0004) {
        vec4 acc = c;
        for (int i = 1; i <= 8; i++) { float a = float(i) * 2.39996; acc += texture2D(tDiffuse, vUv + vec2(cos(a) / aspect, sin(a)) * r * sqrt(float(i) / 8.0)); }
        c = acc / 9.0;
      }
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb = mix(vec3(l), c.rgb, 1.1) * vec3(1.02, 1.0, 0.97);
      gl_FragColor = c;
    }`,
};
import * as M from './models.js';
import { makeAvatar, makePet, lookKey } from './avatar.js';
import { makeNpc, NPCS } from './npc.js';
import { makeAnimal } from './animals.js';
import { crop, placeable } from './plants.js';
import { building } from './buildings.js';
import { Zones } from './zones.js';
import { tickAssets, part, snow } from './assets.js';
import { makeFurniture, makeRoom, FURNITURE } from './furniture.js';
import { PLACE, ANIMALS, ITEMS, CROPS, MAP, RES_SPOTS, TREE_FRUIT, NPC_IDS, BUILDINGS, PAVE } from './data.js';
import { stage, animalPos, buildingAt, key, seasonOf, npcPos, npcAwake, HOME_X, roomSize, fruitReady, balloonPos, turnipSeller } from './state.js';
import { coast, cliffZ, CLIFF_H, riverX, RIVER_W, BRIDGES, BRIDGE_W, POND, inPond, PIER, PATHS, onPath, PLAZA, onPlaza, grass, rng } from './island.js';

const C = h => new THREE.Color(h);
const SKY_TOP = [C(0x4fb3f6), C(0x3a4f96), C(0x14224d)], SKY_HOR = [C(0xd2f0ff), C(0xffb88f), C(0x34507e)];
const SKY_RAIN_TOP = C(0x7d8a9c), SKY_RAIN_HOR = C(0xb7c1cc);
const GLOW_DAY = C(0xd8cfa8), GLOW_NIGHT = C(0xffd65a).multiplyScalar(2.6);
const SUN_DAY = C(0xfff6e8), SUN_DUSK = C(0xff9a50), SUN_MOON = C(0x7f9cff);
const HEMI_DAY = C(0xeef8ff), HEMI_NIGHT = C(0x6f82c8), GROUND_DAY = C(0x7fb85a), GROUND_NIGHT = C(0x34446e);
const WET = C(0x9a9098), WHITE = C(0xffffff);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const angDiff = (a, b) => ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
const isTouch = matchMedia('(pointer: coarse)').matches;
const HAT_TOP = { straw: 1.5, bunny: 1.72, wizard: 1.86, crown: 1.58, cowboy: 1.55, beanie: 1.52, cat: 1.55, bow: 1.5 };

// Gelände: flache Insel (y = 0), Klippen-Plateau im Norden, Strand fällt ins Meer ab, Fluss- und Teichbett
const noise = (x, z) => Math.sin(x * 0.21 + 1.3) * Math.sin(z * 0.17 + 0.4) * 0.5 + Math.sin(x * 0.07 - z * 0.11 + 2) * 0.5;
export const SEA_Y = -0.24;
export function heightAt(x, z) {
  const cz = cliffZ(x);
  let h = CLIFF_H * smooth(cz + 0.2, cz - 0.3, z) + smooth(cz - 3, cz - 9, z) * (0.6 + 0.5 * noise(x, z));
  const c = coast(x, z);
  if (c > -0.85) h = h * (1 - smooth(-0.6, 0.6, c)) - 1.6 * smooth(-0.85, 3.2, c);
  const rd = Math.abs(x - riverX(z));
  if (rd < RIVER_W + 0.35) h -= 0.6 * (1 - smooth(RIVER_W - 0.35, RIVER_W + 0.35, rd));
  const pd = Math.hypot(x - POND.cx, z - POND.cz);
  if (pd < POND.r + 0.35) h -= 0.55 * (1 - smooth(POND.r - 0.4, POND.r + 0.35, pd));
  return h;
}
const plateau = (x, z) => z < cliffZ(x) - 0.4 && coast(x, z) < -1.2;

// Wind: Pflanzen, Gras und Bäume wiegen sich (Vertex-Shader-Ergänzung)
const windTime = { value: 0 };
function windy(base, amp) {
  const m = base.clone();
  m.onBeforeCompile = sh => {
    M.cozy(sh);
    sh.uniforms.uWind = windTime;
    sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 wpos = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        wpos = instanceMatrix * wpos;
      #endif
      wpos = modelMatrix * wpos;
      float hh = max(position.y, 0.0);
      float ww = sin(uWind * 1.6 + wpos.x * 0.55 + wpos.z * 0.35) + 0.45 * sin(uWind * 3.3 + wpos.x * 1.7 - wpos.z);
      transformed.x += ww * ${amp.toFixed(4)} * hh * hh;
      transformed.z += ww * ${(amp * 0.6).toFixed(4)} * hh * hh;`);
    // doppelseitige Halme: Rückseite nicht umdrehen, sonst wirkt sie grau
    if (base.side === THREE.DoubleSide) sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n normal = normalize(vNormal);');
  };
  m.customProgramCacheKey = () => 'wind' + amp;
  return m;
}
const WIND_CROP = windy(M.MAT, 0.09), WIND_TREE = windy(M.MAT, 0.012);
const CLOUD_MAT = new THREE.MeshLambertMaterial({ vertexColors: true, fog: false });
CLOUD_MAT.defines = { NO_CURVE: '' };
const SKY_MATS = [];

export const QUALITY = {
  low: { ratio: 1, shadows: 0, bloom: false, grass: 0, lights: 0 },
  mid: { ratio: 1.5, shadows: 1024, bloom: false, grass: 4, lights: 0 },
  high: { ratio: 2, shadows: 2048, bloom: true, grass: 9, lights: 4 },
};

export class World {
  constructor(canvas, labels, quality = isTouch ? 'mid' : 'high') {
    this.labels = labels;
    this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch || devicePixelRatio < 2, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    const s = this.scene = new THREE.Scene();
    s.fog = new THREE.Fog(SKY_HOR[0].clone(), 34, 80);
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.3, 400);
    this.target = new THREE.Vector3(0, 0, -4);
    this.zoom = 1;
    this.yaw = 0;
    this.yawT = 0;
    this.el = 0.74;
    this.ray = new THREE.Raycaster();

    this.hemi = new THREE.HemisphereLight(0xe8f6ff, 0x6c9a50, 1.3);
    this.sun = new THREE.DirectionalLight(0xffffff, 2.2);
    Object.assign(this.sun.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 80 });
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    this.lamp = new THREE.PointLight(0xffc878, 0, 9, 1.6);
    this.roomLight = new THREE.PointLight(0xffd9a8, 0, 14, 1.4);
    s.add(this.hemi, this.sun, this.sun.target, this.lamp, this.roomLight);

    this.buildSky();
    this.buildGround();

    // Pflanzstellen: kleiner, runder Erdfleck unter Blumen & Gemüse
    const soilGeo = M.merge([M.cyl(0.24, 0.3, 0.03, 0x93764c, 0, 0.012, 0, 14)]);
    this.soil = new THREE.InstancedMesh(soilGeo, M.MAT, 400);
    this.soil.receiveShadow = true;
    this.soil.count = 0;
    s.add(this.soil);

    // Markierung des Zielfelds: weicher, abgerundeter Rahmen
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    g.strokeStyle = '#fff';
    g.lineWidth = 6;
    g.shadowColor = '#fff';
    g.shadowBlur = 6;
    g.beginPath();
    g.roundRect(6, 6, 52, 52, 12);
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.fill();
    const hlGeo = new THREE.PlaneGeometry(1, 1);
    hlGeo.rotateX(-Math.PI / 2);
    this.hl = new THREE.InstancedMesh(hlGeo, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, toneMapped: false }), 25);
    this.hl.count = 0;
    this.hl.renderOrder = 2;
    s.add(this.hl);

    this.crops = new Map();
    this.objs = new Map();
    this.animals = new Map();
    this.players = new Map();
    this.static = {};
    this.tags = new Map();
    this.floaters = [];
    this.v = new THREE.Vector3();
    this.m4 = new THREE.Matrix4();
    this.dummy = new THREE.Object3D();
    this.time = 0;
    this.nextFx = 0;

    // Regen als feine Striche
    const n = 700, rp = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) {
      const x = (Math.random() - 0.5) * 34, y = Math.random() * 16, z = (Math.random() - 0.5) * 34;
      rp.set([x, y, z, x + 0.04, y + 0.38, z], i * 6);
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    this.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.55 }));
    this.rain.visible = false;
    this.rain.frustumCulled = false;
    s.add(this.rain);

    const sp = new Float32Array(900 * 3);
    for (let i = 0; i < sp.length; i++) sp[i] = i % 3 === 1 ? Math.random() * 16 : (Math.random() - 0.5) * 34;
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.snow = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.13, transparent: true, opacity: 0.9, depthWrite: false }));
    this.snow.visible = false;
    this.snow.frustumCulled = false;
    s.add(this.snow);

    this.bobber = M.model([M.ball(0.1, 0xff4d4d, 0, 0.05, 0), M.ball(0.1, 0xffffff, 0, -0.03, 0, 1, 0.5, 1)], [], false);
    this.bobber.visible = false;
    s.add(this.bobber);

    this.buildParticles();
    this.buildCritters();
    this.zones = new Zones(s);
    this.setQuality(quality);
  }

  // ---------- Grafikstufe ----------
  // Grafik: Voreinstellung ('low' …) oder einzelne Werte { scale, shadows, bloom, grass, lights, view }
  setQuality(q) {
    const Q = this.Q = typeof q === 'object' ? { ratio: Math.max(0.5, Math.min(devicePixelRatio, 2) * (q.scale || 1)), shadows: q.shadows, bloom: q.bloom, grass: q.grass, lights: q.lights ? 4 : 0, exact: true } : QUALITY[q] || QUALITY.mid;
    this.quality = q;
    const r = this.renderer;
    r.setPixelRatio(Q.exact ? Q.ratio : Math.min(devicePixelRatio, Q.ratio));
    if (typeof q === 'object') { this.scene.fog.near = 34 * (q.view || 1); this.scene.fog.far = 80 * (q.view || 1); }
    r.shadowMap.enabled = !!Q.shadows;
    this.sun.castShadow = !!Q.shadows;
    if (Q.shadows) {
      this.sun.shadow.mapSize.set(Q.shadows, Q.shadows);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    // Laternenlichter nur in "Hoch" (feste Anzahl, damit Shader nicht ständig neu übersetzt werden)
    for (const l of this.lanternLights || []) this.scene.remove(l);
    this.lanternLights = Array.from({ length: Q.lights }, () => {
      const l = new THREE.PointLight(0xffc06a, 0, 6, 1.8);
      this.scene.add(l);
      return l;
    });
    this.composer?.passes.forEach(p => p.dispose?.());
    this.composer?.renderTarget1.dispose();
    this.composer?.renderTarget2.dispose();
    this.composer = this.bloom = this.finish = null;
    if (Q.bloom) {
      const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
      this.composer = new EffectComposer(r, rt);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.35, 0.55, 0.92);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
      this.finish = new ShaderPass(FINISH);
      this.composer.addPass(this.finish);
    }
    this.grassSig = null;
    this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
    this.resize();
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer?.setSize(w, h);
    if (this.finish) this.finish.uniforms.aspect.value = w / h;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.w = w; this.h = h;
  }

  // ---------- Himmel, Boden, Teich ----------
  buildSky() {
    this.skyU = { top: { value: SKY_TOP[0].clone() }, hor: { value: SKY_HOR[0].clone() } };
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), new THREE.ShaderMaterial({
      uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vp; void main(){ vp = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 hor; varying vec3 vp; void main(){ float h = normalize(vp).y; gl_FragColor = vec4(mix(hor, top, smoothstep(-0.02, 0.45, h)), 1.0); }',
    }));
    sky.renderOrder = -1;
    this.sky = sky;
    const sp = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      const a = Math.random() * Math.PI * 2, y = 0.08 + Math.random() * 0.92, r = Math.sqrt(1 - y * y);
      sp.set([Math.cos(a) * r * 280, y * 280, Math.sin(a) * r * 280], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false }));
    sky.add(this.stars);
    this.clouds = [];
    for (let i = 0; i < 9; i++) {
      const p = [];
      for (let j = 0; j < 5; j++) p.push(M.ball(2 + Math.random() * 1.5, 0xffffff, j * 2.2 - 4.4, Math.random(), Math.random() * 1.5, 1, 0.6, 1, 7));
      const c = M.model(p, [], false);
      c.children[0].material = CLOUD_MAT;
      c.userData = { a: i / 9 * Math.PI * 2, r: 60 + Math.random() * 50, y: 24 + Math.random() * 12 };
      this.clouds.push(c);
      this.scene.add(c);
    }
    this.scene.add(sky);
  }

  // Feine, gekachelte Detailtextur aus dem Canvas (keine Bilddateien nötig)
  detailTex(paint, rep) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, 128, 128);
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    paint(g, rnd);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rep[0], rep[1]);
    t.anisotropy = 4;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  buildGround() {
    const geo = this.groundGeo = new THREE.PlaneGeometry(96, 96, 288, 288);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3));
    geo.computeVertexNormals();
    this.colorGround('summer');
    // Gras mit dem typischen, feinen Rautenmuster
    const grassTex = this.detailTex((g, rnd) => {
      for (let y = 0; y < 128; y += 16) for (let x = 0; x < 128; x += 16) {
        const o = (y / 16) % 2 ? 8 : 0;
        g.fillStyle = `hsl(0 0% ${90 + rnd() * 4}%)`;
        g.beginPath(); g.moveTo(x + o, y + 3); g.lineTo(x + o + 5, y + 11); g.lineTo(x + o - 5, y + 11); g.closePath(); g.fill();
      }
      for (let i = 0; i < 30; i++) {
        const x = rnd() * 128, y = rnd() * 128, r = 8 + rnd() * 14;
        g.fillStyle = `hsla(0 0% ${95 + rnd() * 5}% / .45)`;
        g.beginPath(); g.ellipse(x, y, r, r * 0.7, rnd() * 3, 0, 7); g.fill();
      }
    }, [48, 48]);
    const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, map: grassTex }));
    ground.receiveShadow = true;
    this.scene.add(ground);
    // Sand-Erdwege und der runde Dorfplatz
    const pathTex = this.detailTex((g, rnd) => {
      for (let i = 0; i < 90; i++) {
        const x = rnd() * 128, y = rnd() * 128, r = 1.5 + rnd() * 3.5;
        g.fillStyle = `hsl(35 25% ${72 + rnd() * 22}%)`;
        g.beginPath(); g.ellipse(x, y, r, r * 0.75, rnd() * 3, 0, 7); g.fill();
      }
    }, [1, 1]);
    for (const [x, z, w, d] of PATHS) {
      const map = pathTex.clone();
      map.repeat.set(w / 3, d / 3);
      map.needsUpdate = true;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d, Math.ceil(w * 2), Math.ceil(d * 2)), new THREE.MeshLambertMaterial({ color: 0xe9d29e, map })); // fein unterteilt, damit die Krümmung mitgeht
      p.rotation.x = -Math.PI / 2;
      p.position.set(x, 0.012, z);
      p.receiveShadow = true;
      this.scene.add(p);
    }
    const pm = pathTex.clone();
    pm.repeat.set(2.4, 2.4);
    pm.needsUpdate = true;
    const plaza = new THREE.Mesh(new THREE.RingGeometry(0, PLAZA.r, 40, 8), new THREE.MeshLambertMaterial({ color: 0xefdcaa, map: pm }));
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(PLAZA.x, 0.014, PLAZA.z);
    plaza.receiveShadow = true;
    const ring = [];
    for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2; ring.push(M.ball(0.17 + (i % 3) * 0.03, i % 2 ? 0xd8cfc2 : 0xc9bfb1, PLAZA.x + Math.cos(a) * (PLAZA.r + 0.05), 0.02, PLAZA.z + Math.sin(a) * (PLAZA.r + 0.05), 1.2, 0.45, 1, 7)); }
    this.scene.add(plaza, M.model(ring, [], false));
    this.buildWater();
    this.buildBridges();
  }

  // Boden färben: Rasen (je Jahreszeit), Sand, Klippenwände, Fluss- und Meeresgrund
  colorGround(season) {
    const [a, b, c] = { spring: [0x8ad65c, 0x77c94f, 0xa6e070], summer: [0x6cc24a, 0x5cb43f, 0x86d05a], autumn: [0xa9c45a, 0xc4b052, 0xd0b866], winter: [0xeef3f6, 0xdfe8ee, 0xffffff] }[season].map(C);
    const SAND = C(season === 'winter' ? 0xf2efe6 : 0xf3e0aa), WET_SAND = C(0xd9c48e), ROCK = C(0xa07a55), ROCK2 = C(0x8a6646), BED = C(0x7fb7a8), DEEP = C(0x3f9bb5);
    const pos = this.groundGeo.attributes.position, nrm = this.groundGeo.attributes.normal, col = this.groundGeo.attributes.color, tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), n = noise(x * 2.3, z * 2.1) * 0.5 + 0.5, cst = coast(x, z);
      tmp.copy(a).lerp(b, n * 0.7);
      if (y > 0.6) tmp.lerp(c, 0.25);
      const beach = smooth(-4.2, -3.2, cst) * smooth(cliffZ(x) + 1.5, cliffZ(x) + 3, z);
      tmp.lerp(SAND, beach);
      if (cst > -0.9) tmp.lerp(WET_SAND, smooth(-0.9, 0, cst));
      if (y < -0.08) tmp.lerp(cst > 0 ? DEEP : BED, smooth(-0.08, -0.5, y));
      const steep = 1 - nrm.getY(i);
      if (steep > 0.35 && y > 0.05) tmp.copy(Math.sin(y * 9) > 0 ? ROCK : ROCK2).lerp(c, 0.08);
      col.setXYZ(i, tmp.r, tmp.g, tmp.b);
    }
    col.needsUpdate = true;
  }
  syncSeason(s) {
    const season = seasonOf(s.day);
    if (season === this.season) return;
    this.season = season;
    this.colorGround(season);
    if (this.forest) this.scene.remove(this.forest);
    this.forest = M.scenery((x, z) => grass(x, z) && !buildingAt(x, z) && !onPath(x, z) && !onPlaza(x, z, 0.5) && !RES_SPOTS[key(x, z)], heightAt, season, plateau);
    this.forest.children[0].material = WIND_TREE;
    this.scene.add(this.forest);
    this.grassSig = null;
    this.static.sig = null;
  }

  // Meer, Fluss mit Wasserfall, Teich – alle mit derselben Krümmung wie der Boden
  buildWater() {
    const U = this.waterU = { t: { value: 0 }, night: { value: 0 }, ice: { value: 0 } };
    const vert = `varying vec3 vw; varying float vfall; attribute float fall;
      void main(){ vec3 transformed = position; vec4 wq = modelMatrix * vec4(position, 1.0); vw = wq.xyz; vfall = fall;
      #include <project_vertex>
      }`;
    const coastGL = `float coast(vec2 p){ float r = pow(pow(p.x,4.0)+pow(p.y,4.0), 0.25); float a = atan(p.y, p.x); return r + sin(a*3.0+0.7)*0.8 + sin(a*5.0-1.2)*0.45 - 21.2; }`;
    // Meer: türkis am Ufer, tiefblau draußen, Schaumkante und Wellenglitzern
    const seaGeo = new THREE.PlaneGeometry(260, 260, 130, 130);
    seaGeo.rotateX(-Math.PI / 2);
    seaGeo.setAttribute('fall', new THREE.Float32BufferAttribute(new Float32Array(seaGeo.attributes.position.count), 1));
    const sea = new THREE.Mesh(seaGeo, new THREE.ShaderMaterial({
      uniforms: U, transparent: true, depthWrite: false,
      vertexShader: vert,
      fragmentShader: `uniform float t, night; varying vec3 vw; ${coastGL}
        void main(){
          float c = coast(vw.xz);
          vec3 shallow = vec3(0.42, 0.88, 0.86), mid = vec3(0.18, 0.66, 0.84), deep = vec3(0.10, 0.42, 0.72);
          vec3 col = mix(shallow, mid, smoothstep(0.0, 3.5, c));
          col = mix(col, deep, smoothstep(4.0, 16.0, c));
          float w = sin(vw.x * 0.9 + t * 0.8) * sin(vw.z * 0.7 - t * 0.6) + sin((vw.x - vw.z) * 1.7 + t * 1.6) * 0.5;
          col += smoothstep(0.9, 1.4, w) * 0.12;
          float foam = smoothstep(0.35, 0.0, abs(c - 0.35 - sin(t * 1.3 + vw.x * 0.4 + vw.z * 0.3) * 0.25));
          col = mix(col, vec3(1.0), foam * 0.85);
          col *= mix(1.0, 0.38, night);
          float a = mix(0.7, 0.96, smoothstep(-0.5, 2.0, c));
          gl_FragColor = vec4(col, a);
        }`,
    }));
    sea.position.y = SEA_Y;
    sea.renderOrder = 1;
    this.scene.add(sea);
    // Fluss als Band von der Hochebene bis ins Meer; am Klippenrand fällt es senkrecht ab = Wasserfall
    const zs = [];
    for (let z = -26; z <= 24; z += 0.5) {
      const cz = cliffZ(riverX(z));
      if (z > cz - 0.9 && z < cz + 0.4) for (let k = 0; k < 6; k++) zs.push(z + k * 0.1);
      else zs.push(z);
    }
    const rp = [], rf = [], idx = [];
    zs.forEach((z, i) => {
      const x = riverX(z), cz = cliffZ(x), top = CLIFF_H - 0.22, low = SEA_Y + 0.04, u = (z - (cz - 0.05)) / 0.3;
      const yy = u <= 0 ? top : u >= 1 ? low : top + (low - top) * u, fall = u > -0.5 && u < 1.6 ? 1 : 0;
      rp.push(x - RIVER_W - 0.2, yy, z, x + RIVER_W + 0.2, yy, z);
      rf.push(fall, fall);
      if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    });
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3));
    rg.setAttribute('fall', new THREE.Float32BufferAttribute(rf, 1));
    rg.setIndex(idx);
    const river = new THREE.Mesh(rg, new THREE.ShaderMaterial({
      uniforms: U, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: vert,
      fragmentShader: `uniform float t, night, ice; varying vec3 vw; varying float vfall;
        void main(){
          float flow = sin(vw.z * 3.0 - t * 4.0 + sin(vw.x * 2.0) * 1.5) * 0.5 + 0.5;
          vec3 col = mix(vec3(0.30, 0.74, 0.86), vec3(0.48, 0.86, 0.92), flow * 0.5);
          float streak = smoothstep(0.55, 1.0, sin(vw.x * 13.0 + sin(vw.y * 3.0)) * 0.5 + 0.5) * (0.6 + 0.4 * sin(vw.y * 8.0 + t * 12.0));
          col = mix(col, vec3(0.95, 0.99, 1.0), clamp(vfall * (0.55 + streak * 0.45), 0.0, 1.0));
          col = mix(col, vec3(0.86, 0.94, 0.99), ice * 0.7 * (1.0 - vfall));
          col *= mix(1.0, 0.38, night);
          gl_FragColor = vec4(col, 0.9);
        }`,
    }));
    river.renderOrder = 1;
    this.scene.add(river);
    this.fallAt = { x: riverX(cliffZ(riverX(-16))), z: cliffZ(riverX(-16)) + 0.3 };
    // Teich
    const pg = new THREE.RingGeometry(0, POND.r + 0.25, 48, 6);
    pg.rotateX(-Math.PI / 2);
    pg.setAttribute('fall', new THREE.Float32BufferAttribute(new Float32Array(pg.attributes.position.count), 1));
    const pond = new THREE.Mesh(pg, new THREE.ShaderMaterial({
      uniforms: U, transparent: true, depthWrite: false,
      vertexShader: vert,
      fragmentShader: `uniform float t, night, ice; varying vec3 vw;
        void main(){
          vec2 q = vw.xz - vec2(${POND.cx.toFixed(2)}, ${POND.cz.toFixed(2)});
          float r = length(q) / ${(POND.r + 0.25).toFixed(2)};
          vec3 c = mix(vec3(0.16, 0.55, 0.78), vec3(0.45, 0.82, 0.92), smoothstep(0.35, 1.0, r));
          float w = sin(q.x * 3.1 + t * 1.3) * sin(q.y * 2.7 - t * 1.1) + sin((q.x + q.y) * 4.3 + t * 2.0) * 0.5;
          c += smoothstep(0.75, 1.3, w) * 0.22 * (1.0 - ice);
          c = mix(c, vec3(0.86, 0.94, 0.99), ice * 0.8);
          c *= mix(1.0, 0.35, night);
          gl_FragColor = vec4(c, 0.92);
        }`,
    }));
    pond.position.set(POND.cx, SEA_Y + 0.08, POND.cz);
    pond.renderOrder = 1;
    this.scene.add(pond);
  }

  // Holzbrücken über den Fluss und der Steg ins Meer
  buildBridges() {
    const p = [], W = 0xc9945e, WD = 0x9a6a40, L = 0xe3b47c;
    for (const bz of BRIDGES) {
      const x0 = riverX(bz), len = (RIVER_W + 0.75) * 2;
      for (let i = 0; i < 11; i++) {
        const t = i / 10 - 0.5, x = x0 + t * len, y = 0.06 + Math.cos(t * Math.PI) * 0.12;
        p.push(M.box(len / 10.5, 0.08, BRIDGE_W * 2, i % 2 ? W : L, x, y, bz));
      }
      for (const sz of [-1, 1]) {
        const z = bz + sz * (BRIDGE_W - 0.05);
        for (let i = 0; i <= 4; i++) { const t = i / 4 - 0.5, x = x0 + t * len; p.push(M.cyl(0.05, 0.06, 0.55, WD, x, 0.3 + Math.cos(t * Math.PI) * 0.1, z, 7)); }
        for (let i = 0; i < 8; i++) {
          const t0 = i / 8 - 0.5, t1 = (i + 1) / 8 - 0.5, xa = x0 + t0 * len, xb = x0 + t1 * len;
          const ya = 0.55 + Math.cos(t0 * Math.PI) * 0.12, yb = 0.55 + Math.cos(t1 * Math.PI) * 0.12;
          p.push(M.box(xb - xa + 0.02, 0.07, 0.08, W, (xa + xb) / 2, (ya + yb) / 2, z, 0, 0, Math.atan2(yb - ya, xb - xa)));
        }
      }
    }
    // Steg
    const { x, z0, z1, w } = PIER;
    for (let z = z0; z < z1; z += 0.42) p.push(M.box(w * 2, 0.07, 0.38, Math.round(z * 3) % 2 ? W : L, x, 0.02, z + 0.21));
    for (let z = z0 + 1.4; z < z1; z += 1.6) for (const sx of [-1, 1]) p.push(M.cyl(0.07, 0.08, 1.4, WD, x + sx * (w - 0.05), -0.55, z, 8));
    for (const sx of [-1, 1]) p.push(M.cyl(0.08, 0.08, 0.55, WD, x + sx * (w - 0.05), 0.25, z1 - 0.2, 8));
    this.scene.add(M.model(p));
  }

  // ---------- Gras (instanziert, wiegt im Wind) ----------
  syncGrass(s) {
    const per = this.season === 'winter' ? 0 : this.Q.grass, sig = `${per}|${this.season}|${Object.keys(s.obj).join()}|${Object.keys(s.tiles).length}|${Object.keys(s.paths || {}).length}`;
    if (sig === this.grassSig) return;
    this.grassSig = sig;
    if (this.grass) { this.scene.remove(this.grass); this.grass.dispose(); this.grass = null; }
    if (!per) return;
    if (!this.bladeGeo) {
      const pos = [], col = [], lo = C(0x86c862), hi = C(0xd4f0a0);
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1 + 0.3, ca = Math.cos(a), sa = Math.sin(a), w = 0.03, h = 0.14 + i * 0.05, lx = sa * 0.05, lz = ca * 0.05;
        pos.push(-ca * w, 0, sa * w, ca * w, 0, -sa * w, lx, h, lz);
        col.push(lo.r, lo.g, lo.b, lo.r, lo.g, lo.b, hi.r, hi.g, hi.b);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((v, i) => i % 3 === 1 ? 1 : 0), 3));
      this.bladeGeo = g;
      this.bladeMat = windy(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 1.3);
    }
    const spots = [];
    for (let x = -MAP; x <= MAP; x++) for (let z = -MAP; z <= MAP; z++) {
      if (!grass(x, z) || buildingAt(x, z) || onPath(x, z) || onPlaza(x, z, 0.4) || s.obj[key(x, z)] || s.tiles[key(x, z)] || s.paths?.[key(x, z)]) continue;
      spots.push([x, z]);
    }
    const im = new THREE.InstancedMesh(this.bladeGeo, this.bladeMat, spots.length * per);
    const d = this.dummy, c = new THREE.Color();
    let i = 0, seed = 3;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const [x, z] of spots) for (let k = 0; k < per; k++) {
      const px = x + rnd() - 0.5, pz = z + rnd() - 0.5;
      d.position.set(px, heightAt(px, pz), pz);
      d.rotation.set(0, rnd() * 6.28, 0);
      d.scale.setScalar(0.7 + rnd() * 0.7);
      d.updateMatrix();
      im.setMatrixAt(i, d.matrix);
      im.setColorAt(i, c.setHSL((this.season === 'autumn' ? 0.1 : 0.22) + rnd() * 0.1, 0.5, 0.82 + rnd() * 0.14));
      i++;
    }
    this.grass = im;
    this.scene.add(im);
  }

  // ---------- Partikel ----------
  buildParticles() {
    this.parts = [];
    this.pmesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: 0xffffff }), 500);
    this.pmesh.count = 0;
    this.pmesh.frustumCulled = false;
    // Rauch: eigene, durchscheinende Partikel
    this.smesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.38, depthWrite: false }), 80);
    this.smesh.count = 0;
    this.smesh.frustumCulled = false;
    this.scene.add(this.pmesh, this.smesh);
  }
  burst(x, z, kind, y) {
    const K = {
      dirt: [10, [0x8a5a3a, 0x6e4a2a, 0xa0714a], 1.8, 2.6, 9, 0.06, 0.6, 0.15],
      water: [14, [0x6cc4ff, 0xbfe9ff, 0x9fdcff], 1.4, 1.2, 9, 0.045, 0.7, 0.7],
      leaf: [12, [0x7cc96a, 0xb6e07a, 0xffe066], 2, 3, 7, 0.06, 0.9, 0.3],
      fruit: [14, [0x6cc04a, 0x8fdc72, 0xff5d5d, 0xffd23f], 2.2, 1.5, 7, 0.07, 1.0, 1.8],
      mist: [2, [0xffffff, 0xe6f6ff], 0.5, 0.8, -0.2, 0.18, 1.4, 0.1],
      plop: [6, [0xe8dcc6, 0xffffff], 1.0, 1.6, 6, 0.05, 0.5, 0.2],
      bubble: [1, [0xffffff, 0xdff6ff], 0.15, 0.4, -0.6, 0.06, 0.9, -0.2],
      ripple: [2, [0xffffff, 0xcfeeff], 0.9, 0.6, 5, 0.04, 0.45, -0.2],
      sparkle: [1, [0xfff3a8, 0xffffff], 0.3, 0.8, -0.4, 0.035, 1.1, 0.5],
      seed: [6, [0xc9a46b, 0x8a5a3a], 1.1, 2, 9, 0.04, 0.5, 0.5],
      dust: [10, [0xe8dcc6, 0xffffff], 1.6, 0.8, 1, 0.08, 0.7, 0.15],
      heart: [6, [0xff6b8a, 0xff9fb5], 0.8, 2, 1, 0.07, 0.9, 0.8],
      coin: [8, [0xffd23f, 0xffe98a], 1.4, 3, 8, 0.06, 0.8, 0.6],
      smoke: [1, [0xffffff, 0xf2f2f2], 0.12, 0.6, -0.12, 0.12, 2.6, 0],
      drop: [1, [0x9fdcff], 1.6, 1.6, 9, 0.035, 0.5, 0.35],
      splash: [3, [0xcfe8ff], 0.8, 1.2, 9, 0.025, 0.3, 0.02],
      petal: [1, [0xffc8dc, 0xffb7d0, 0xffffff], 0.6, 0, 0.35, 0.05, 9, 4],
      fall: [1, [0xf0a040, 0xd9583a, 0xf2c94c], 0.6, 0, 0.4, 0.06, 9, 4],
      snowball: [8, [0xffffff, 0xeef4f8], 1.2, 2, 8, 0.06, 0.6, 0.3],
    }[kind];
    if (!K) return;
    const [n, cols, v, up, g, size, life, y0] = K;
    for (let i = 0; i < n && this.parts.length < 500; i++) {
      const a = Math.random() * Math.PI * 2, sp = v * (0.4 + Math.random() * 0.6);
      this.parts.push({ x, y: y ?? y0, z, vx: Math.cos(a) * sp, vy: up * (0.6 + Math.random() * 0.5), vz: Math.sin(a) * sp, g, size, life: life * (0.7 + Math.random() * 0.5), age: 0, c: C(cols[i % cols.length]), grow: kind === 'smoke' });
    }
  }
  updateParticles(dt) {
    const d = this.dummy;
    let ni = 0, si = 0;
    this.parts = this.parts.filter(p => (p.age += dt) < p.life);
    this.parts.forEach(p => {
      p.vy -= p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.02 && p.g > 0) { p.y = 0.02; p.vx *= 0.5; p.vz *= 0.5; p.vy = 0; }
      const t = p.age / p.life;
      d.position.set(p.x, p.y, p.z);
      d.rotation.set(p.age * 3, p.age * 2, 0);
      d.scale.setScalar(p.grow ? p.size * (0.6 + t * 2.4) * (1 - t * t * 0.5) : p.size * (1 - t * t));
      d.updateMatrix();
      if (p.grow) { if (si < 80) this.smesh.setMatrixAt(si++, d.matrix); return; }
      this.pmesh.setMatrixAt(ni, d.matrix);
      this.pmesh.setColorAt(ni++, p.c);
    });
    this.pmesh.count = ni;
    this.smesh.count = si;
    this.pmesh.instanceMatrix.needsUpdate = this.smesh.instanceMatrix.needsUpdate = true;
    if (this.pmesh.instanceColor) this.pmesh.instanceColor.needsUpdate = true;
  }

  // ---------- Schmetterlinge (Tag) & Glühwürmchen (Nacht) ----------
  buildCritters() {
    const wing = new THREE.PlaneGeometry(0.16, 0.12);
    wing.translate(0.08, 0, 0);
    wing.rotateX(-Math.PI / 2);
    this.flies = new THREE.InstancedMesh(wing, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), 28);
    this.flyData = Array.from({ length: 14 }, (_, i) => ({ hx: (Math.random() - 0.5) * 26, hz: (Math.random() - 0.5) * 24, p: Math.random() * 100, s: 0.15 + Math.random() * 0.15, gone: 0 }));
    const cols = [0xffb3d1, 0xfff07a, 0xb7a6ff, 0xffffff, 0x8fd6ff, 0xffa65c];
    this.flyData.forEach((f, i) => { this.flies.setColorAt(i * 2, C(cols[i % 6])); this.flies.setColorAt(i * 2 + 1, C(cols[i % 6])); });
    this.flies.frustumCulled = false;
    this.scene.add(this.flies);
    const n = 60, fp = new Float32Array(n * 3), fc = new Float32Array(n * 3);
    this.bugs = Array.from({ length: n }, () => ({ hx: (Math.random() - 0.5) * 34, hz: (Math.random() - 0.5) * 34, p: Math.random() * 100 }));
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    fg.setAttribute('color', new THREE.BufferAttribute(fc, 3));
    this.fireflies = new THREE.Points(fg, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.fireflies.frustumCulled = false;
    this.scene.add(this.fireflies);
    // Fischschatten im Fluss, im Teich und vor der Küste
    const fg2 = new THREE.CircleGeometry(1, 14);
    fg2.rotateX(-Math.PI / 2);
    this.fishM = new THREE.InstancedMesh(fg2, new THREE.MeshBasicMaterial({ color: 0x14394a, transparent: true, opacity: 0.38, depthWrite: false }), 20);
    this.fishM.frustumCulled = false;
    this.fishM.renderOrder = 0;
    const r = rng(99);
    this.fishData = Array.from({ length: 20 }, (_, i) => {
      const size = 1 + Math.floor(r() * 5);
      if (i < 7) return { k: 'river', z0: -13 + r() * 30, p: r() * 100, s: 0.25 + r() * 0.5, size };
      if (i < 9) return { k: 'pond', p: r() * 100, s: 0.3 + r() * 0.4, size: 1 + Math.floor(r() * 3) };
      const a = r() * Math.PI * 2;
      return { k: 'sea', a, p: r() * 100, s: 0.3 + r() * 0.8, size: r() < 0.12 ? 6 : size };
    });
    this.scene.add(this.fishM);
  }
  fishSize(f) { return f.size === 6 ? 0.55 : 0.12 + f.size * 0.07; }
  // Angeln: nächster Fischschatten beim Schwimmer (gleiches Gewässer) beißt an
  hookFish(x, z, kind) {
    let best = -1, bd = 4.5;
    this.fishData.forEach((f, i) => { if (f.hook || f.gone > this.time || f.k !== kind || f.x === undefined) return; const d = Math.hypot(f.x - x, f.z - z); if (d < bd) { bd = d; best = i; } });
    if (best >= 0) this.fishData[best].hook = { x, z, nib: false };
    return best;
  }
  fishAt(i) { return this.fishData[i]; }
  releaseFish(i, caught) {
    const f = this.fishData[i];
    if (!f) return;
    f.hook = null;
    if (caught) { f.gone = this.time + 30; f.size = 1 + Math.floor(Math.random() * 5); if (f.k === 'sea' && Math.random() < 0.12) f.size = 6; }
    else f.p += 20; // schwimmt erschrocken weg
  }
  updateFish() {
    const d = this.dummy, t = this.time;
    this.fishData.forEach((f, i) => {
      let x, z, yaw;
      if (f.gone > t) { d.position.set(0, -50, 0); d.updateMatrix(); this.fishM.setMatrixAt(i, d.matrix); return; }
      if (f.hook) { // schwimmt zum Köder und knabbert
        const h = f.hook, dx = h.x - f.x, dz = h.z - f.z, dist = Math.hypot(dx, dz), want = 0.35 + (h.nib ? Math.max(0, Math.sin(t * 9)) * 0.15 : 0);
        if (dist > want) { const st = Math.min(dist - want, this.dt * (h.fast ? 2.4 : 0.9)); f.x += dx / dist * st; f.z += dz / dist * st; }
        f.yaw = Math.atan2(dx, dz);
        const sz = this.fishSize(f);
        d.position.set(f.x, SEA_Y - 0.06, f.z); d.rotation.set(0, f.yaw, 0); d.scale.set(sz * 0.55, 1, sz); d.updateMatrix();
        this.fishM.setMatrixAt(i, d.matrix);
        f.dist = dist;
        return;
      }
      if (f.k === 'river') { z = f.z0 + Math.sin(t * 0.05 * f.s + f.p) * 2.5; x = riverX(z) + Math.sin(t * 0.3 + f.p) * 0.35; yaw = Math.cos(t * 0.05 * f.s + f.p) > 0 ? 0 : Math.PI; }
      else if (f.k === 'pond') { const a = t * 0.12 * f.s + f.p; x = POND.cx + Math.cos(a) * 1.1; z = POND.cz + Math.sin(a) * 0.9; yaw = -a; }
      else { const a = f.a + Math.sin(t * 0.02 * f.s + f.p) * 0.12, R = 24.5 + Math.sin(t * 0.2 + f.p) * 1.2; x = Math.cos(a) * R; z = Math.sin(a) * R; for (let k = 0; k < 6 && coast(x, z) < 1.2; k++) { x *= 1.06; z *= 1.06; } yaw = a; }
      const sz = this.fishSize(f);
      f.x = x; f.z = z;
      d.position.set(x, SEA_Y - 0.06, z);
      d.rotation.set(0, yaw, 0);
      d.scale.set(sz * 0.55, 1, sz);
      d.updateMatrix();
      this.fishM.setMatrixAt(i, d.matrix);
    });
    this.fishM.instanceMatrix.needsUpdate = true;
  }
  updateCritters(info, rain) {
    const t = this.time, d = this.dummy, dayish = info.night < 0.5 && !rain;
    this.flies.visible = dayish && this.season !== 'winter';
    if (dayish) this.flyData.forEach((f, i) => {
      const u = t * f.s + f.p;
      const x = f.hx + Math.sin(u * 1.3) * 3 + Math.sin(u * 3.1) * 0.6, z = f.hz + Math.cos(u * 0.9) * 3, y = (f.gone > t ? -5 : 0.7) + Math.sin(u * 2.3) * 0.35;
      f.pos = { x, z };
      const dx = Math.cos(u * 1.3) * 1.3, dz = -Math.sin(u * 0.9) * 0.9, yaw = Math.atan2(dx, dz), flap = Math.sin(t * 22 + f.p) * 1.1;
      for (const side of [0, 1]) {
        d.position.set(x, y, z);
        d.rotation.set(0, yaw + (side ? Math.PI : 0), side ? -flap : flap, 'YXZ');
        d.scale.setScalar(1);
        d.updateMatrix();
        this.flies.setMatrixAt(i * 2 + side, d.matrix);
      }
    });
    this.flies.instanceMatrix.needsUpdate = true;
    const glow = smooth(0.5, 0.9, info.night) * (rain ? 0.3 : 1);
    this.fireflies.visible = glow > 0.01;
    if (this.fireflies.visible) {
      const p = this.fireflies.geometry.attributes.position, c = this.fireflies.geometry.attributes.color;
      this.bugs.forEach((b, i) => {
        const u = t * 0.3 + b.p;
        b.pos = { x: b.hx + Math.sin(u * 1.7) * 1.5, z: b.hz + Math.cos(u * 1.3) * 1.5 };
        p.setXYZ(i, b.pos.x, heightAt(b.hx, b.hz) + 0.6 + Math.sin(u * 2.3) * 0.4, b.pos.z);
        const k = b.gone > t ? 0 : glow * Math.max(0, Math.sin(t * 2.2 + b.p * 3)) * 2.4;
        c.setXYZ(i, k * 0.9, k, k * 0.35);
      });
      p.needsUpdate = c.needsUpdate = true;
    }
  }

  // ---------- HTML-Beschriftungen über 3D-Objekten ----------
  project(x, y, z) {
    const v = this.v.set(x, y - M.curveDrop(this.camera, x, z), z).project(this.camera);
    return v.z > 1 || Math.abs(v.x) > 1.3 || Math.abs(v.y) > 1.3 ? null : [(v.x + 1) / 2 * this.w, (1 - v.y) / 2 * this.h];
  }
  tag(id, html, x, y, z, cls = '') {
    let t = this.tags.get(id);
    if (!t) {
      const el = document.createElement('div');
      this.labels.appendChild(el);
      t = { el, html: null, cls: null };
      this.tags.set(id, t);
    }
    if (t.html !== html) { t.el.innerHTML = html; t.html = html; }
    if (t.cls !== cls) { t.el.className = 'tag ' + cls; t.cls = cls; }
    const p = this.project(x, y, z);
    t.el.style.display = p ? '' : 'none';
    if (p) t.el.style.transform = `translate(${p[0]}px, ${p[1]}px) translate(-50%, -100%)`;
    t.used = true;
  }
  float(x, z, txt, y = 1.2, o = {}) {
    const el = document.createElement('div');
    el.className = 'floater ' + (o.cls || '');
    el.textContent = txt;
    el.style.opacity = 0;
    this.labels.appendChild(el);
    this.floaters.push({ el, x, y, z, age: -(o.delay || 0), vx: o.vx || 0, life: o.life || 1.6, rise: o.rise ?? 1.2, follow: o.follow });
  }

  // Bildschirmpunkt -> Punkt auf dem Boden
  pick(cx, cy) {
    this.ray.setFromCamera(new THREE.Vector2(cx / this.w * 2 - 1, -(cy / this.h) * 2 + 1), this.camera);
    const { origin: o, direction: d } = this.ray.ray;
    let t = -o.y / d.y;
    if (!(t > 0)) return null;
    for (let i = 0; i < 6; i++) { // Boden ist in der Ferne nach unten gekrümmt
      const y = -M.curveDrop(this.camera, o.x + d.x * t, o.z + d.z * t);
      t = (y - o.y) / d.y;
    }
    return t > 0 ? { x: o.x + d.x * t, z: o.z + d.z * t } : null;
  }

  snapshot() {
    this.draw();
    return this.canvas.toDataURL('image/jpeg', 0.92);
  }

  // ---------- statische Teile, die sich mit Upgrades ändern ----------
  syncStatic(s) {
    const sig = `${s.up.house}|${s.mail?.length ? 1 : 0}|${this.season}`;
    if (this.static.sig === sig) return;
    if (this.static.group) this.scene.remove(this.static.group);
    const g = new THREE.Group();
    for (const [id, B] of Object.entries(BUILDINGS)) {
      const model = id.startsWith('vh_') ? 'vhouse_' + B.npc : id === 'plaza' ? 'plazatree' : id;
      const m = building(model, id === 'house' ? s.up.house : id === 'mail' ? (s.mail?.length ? 1 : 0) : 1, this.season);
      if (B.ox !== undefined && !m.userData.asset) m.position.set(B.ox, 0, B.oz); else m.position.set(B.cx, 0, B.cz);
      g.add(m);
      if (id === 'office') this.clock = { h: part(m, 'clock_h'), m: part(m, 'clock_m') };
      // Kamin des neuen Hauses (Blender: x 1.3, y 0.5 → Spiel: z -0.5)
      if (id === 'house') this.chimney = m.userData.asset ? { x: B.cx + 1.3, z: B.cz - 0.5, y: s.up.house >= 4 ? 3.75 : 3.6 } : { x: -7.7, z: -11, y: 3.9 };
    }
    this.scene.add(g);
    this.static = { ...this.static, sig, group: g };
  }

  syncTiles(s) {
    let sig = '';
    for (const [k, t] of Object.entries(s.tiles)) sig += k + (t.w > 0 ? 'w' : '') + ';';
    if (sig !== this.soilSig) {
      this.soilSig = sig;
      let i = 0;
      for (const [k, t] of Object.entries(s.tiles)) {
        if (i >= 400) break;
        const [x, z] = k.split(',').map(Number);
        this.m4.makeTranslation(x, 0, z);
        this.soil.setMatrixAt(i, this.m4);
        this.soil.setColorAt(i, t.w > 0 ? WET : WHITE);
        i++;
      }
      this.soil.count = i;
      this.soil.instanceMatrix.needsUpdate = true;
      if (this.soil.instanceColor) this.soil.instanceColor.needsUpdate = true;
    }
    const seen = new Set();
    this.ripe = [];
    for (const [k, t] of Object.entries(s.tiles)) {
      if (!t.c) continue;
      const st = stage(t.c), sig2 = t.c.k + st;
      seen.add(k);
      let e = this.crops.get(k);
      if (e && e.sig !== sig2) { this.scene.remove(e.m); e = null; }
      if (!e) {
        const [x, z] = k.split(',').map(Number);
        const m = crop(t.c.k, st);
        m.children[0].material = WIND_CROP;
        m.position.set(x, 0.04, z);
        m.rotation.y = ((x * 7 + z * 13) % 4) * 0.4;
        this.scene.add(m);
        e = { m, sig: sig2, x, z, born: this.time, base: CROPS[t.c.k].cat === 'fruit' ? 1.7 : 1.25 };
        this.crops.set(k, e);
      }
      if (st === 3) this.ripe.push(e);
      const pop = Math.min(1, (this.time - e.born) * 4);
      e.m.scale.setScalar(e.base * (0.5 + 0.5 * (1 - (1 - pop) ** 3) + (pop < 1 ? Math.sin(pop * Math.PI) * 0.15 : 0)));
    }
    for (const [k, e] of this.crops) if (!seen.has(k)) { this.vanish(e.m); this.crops.delete(k); }
  }

  syncObjects(s) {
    const seen = new Set();
    this.lanterns = [];
    this.sprinklers = [];
    for (const [k, o] of Object.entries(s.obj)) {
      const p = PLACE[o.k], ready = p.kind === 'producer' && o.t >= p.every, sig = `${o.k}|${o.r}|${ready}`;
      seen.add(k);
      let e = this.objs.get(k);
      if (e && e.sig !== sig) { this.scene.remove(e.m); e = null; }
      if (!e) {
        const [x, z] = k.split(',').map(Number);
        const m = placeable(o.k, ready);
        m.position.set(x, 0, z);
        m.rotation.y = o.r * Math.PI / 2;
        if (['kirschbaum', 'blumen'].includes(o.k)) m.children[0].material = WIND_CROP;
        if (p.kind === 'producer') m.children[0].material = WIND_TREE;
        this.scene.add(m);
        e = { m, sig, x, z, born: this.time };
        this.objs.set(k, e);
      }
      const pop = Math.min(1, (this.time - e.born) * 4);
      e.m.scale.setScalar(pop < 1 ? 0.6 + 0.4 * pop + Math.sin(pop * Math.PI) * 0.2 : 1);
      if (p.glow) this.lanterns.push(e);
      if (p.kind === 'machine') {
        if (o.n > 0) e.m.scale.y = 1 + Math.sin(this.time * 10) * 0.03;
        if (o.o > 0) this.tag('o' + k, `${ITEMS[p.out].icon}<b>${o.o}</b>`, e.x, 1.4, e.z, 'bubble');
        else if (o.n > 0) this.tag('o' + k, `⚙️ ${o.n}`, e.x, 1.4, e.z, 'bubble small');
      }
      if (ready) this.tag('o' + k, ITEMS[p.item].icon, e.x, 2.3, e.z, 'bubble');
      if (p.kind === 'sprinkler') { e.m.rotation.y = this.time * 2; this.sprinklers.push(e); }
    }
    for (const [k, e] of this.objs) if (!seen.has(k)) { this.vanish(e.m); this.objs.delete(k); this.burst(e.x, e.z, 'dust'); }
  }

  // Unser Zuhause: Zimmer + Möbel (liegt weit weg bei x = HOME_X)
  syncHome(s) {
    const h = s.home || { wall: 'vanille', floor: 'dielen', items: {}, rugs: {} }, [w, d] = roomSize(s);
    const sig = `${w}|${d}|${h.wall}|${h.floor}`;
    if (this.roomSig !== sig) {
      this.roomSig = sig;
      if (this.room) this.scene.remove(this.room);
      this.room = new THREE.Group();
      const r = makeRoom(w, d, h.wall, h.floor);
      const base = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshBasicMaterial({ color: 0x2b2238 }));
      base.rotation.x = -Math.PI / 2;
      base.position.y = -0.02;
      this.room.add(r, base);
      this.room.position.set(HOME_X, 0, 0);
      this.room.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
      this.scene.add(this.room);
    }
    this.furnM ||= new Map();
    const seen = new Set();
    for (const [map, tag] of [[h.items, 'i'], [h.rugs, 'r'], [h.walls || {}, 'w']]) for (const [k, o] of Object.entries(map)) {
      const id = tag + k + o.k + o.r, f = FURNITURE[o.k];
      if (!f) continue;
      seen.add(id);
      if (this.furnM.has(id)) continue;
      const [x, z] = k.split(',').map(Number), [fw, fd] = o.r % 2 ? [f.d, f.w] : [f.w, f.d];
      const m = makeFurniture(o.k);
      m.position.set(HOME_X + x + (fw - 1) / 2, f.rug ? 0.005 : 0, z + (fd - 1) / 2);
      m.rotation.y = o.r * Math.PI / 2;
      m.traverse(c => { if (c.isMesh) { c.castShadow = !f.rug; c.receiveShadow = true; } });
      this.scene.add(m);
      this.furnM.set(id, { m, born: this.time, x: m.position.x, z: m.position.z });
    }
    for (const [id, e] of this.furnM) {
      if (!seen.has(id)) { this.vanish(e.m); this.furnM.delete(id); this.burst(e.x, e.z, 'dust'); continue; }
      const pop = Math.min(1, (this.time - e.born) * 4);
      e.m.scale.setScalar(pop < 1 ? 0.6 + 0.4 * pop + Math.sin(pop * Math.PI) * 0.15 : 1);
    }
  }

  // Bäume, Felsen und Grabstellen
  syncNature(s) {
    this.wildM ||= new Map();
    for (const [k, kind] of Object.entries(RES_SPOTS)) {
      const left = s.res?.[k] ?? 3, ready = kind !== 'rock' && fruitReady(s, k), sig = kind + this.season + (left > 0) + ready;
      let e = this.wildM.get(k);
      if (e && e.sig !== sig) { this.scene.remove(e.m); e = null; }
      if (!e) {
        const [x, z] = k.split(',').map(Number);
        const m = M.wild(kind, this.season, left, TREE_FRUIT[k], ready);
        m.position.set(x, 0, z);
        m.rotation.y = (x * 3 + z) % 6;
        if (kind !== 'rock') m.children[0].material = WIND_TREE;
        this.scene.add(m);
        e = { m, sig, x, z };
        this.wildM.set(k, e);
      }
      if (e.shake > 0) { e.shake -= 1 / 60; e.m.rotation.z = Math.sin(e.shake * 40) * 0.06 * e.shake; }
      e.m.visible = !(this.skyK > 0.3 && Math.hypot(e.x - this.camera.position.x, e.z - this.camera.position.z) < 3.2); // Himmelsblick: Bäume direkt an der Kamera ausblenden
    }
    this.digM ||= new Map();
    const seen = new Set(s.digs || []);
    for (const k of seen) {
      if (this.digM.has(k)) continue;
      const [x, z] = k.split(',').map(Number), m = M.digMark();
      m.position.set(x, 0, z);
      this.scene.add(m);
      this.digM.set(k, { m, x, z });
    }
    for (const [k, e] of this.digM) if (!seen.has(k)) { this.vanish(e.m); this.digM.delete(k); this.burst(e.x, e.z, 'dirt'); }
    // Muscheln am Strand und Unkraut
    this.pickM ||= new Map();
    const want = new Map();
    for (const [k, id] of Object.entries(s.shells || {})) want.set(k, 's' + id);
    for (const k of Object.keys(s.weeds || {})) if (!want.has(k)) want.set(k, 'w');
    for (const [k, v] of want) {
      const e = this.pickM.get(k);
      if (e && e.v === v) continue;
      if (e) this.scene.remove(e.m);
      const [x, z] = k.split(',').map(Number), m = v === 'w' ? M.weed() : M.shell(v.slice(1));
      m.position.set(x + ((x * 7) % 3) * 0.08, 0.01, z + ((z * 5) % 3) * 0.08);
      m.rotation.y = x * 1.7 + z;
      if (v === 'w') m.children[0].material = WIND_CROP;
      this.scene.add(m);
      this.pickM.set(k, { m, v, x, z });
    }
    for (const [k, e] of this.pickM) if (!want.has(k)) { this.vanish(e.m); this.pickM.delete(k); this.burst(e.x, e.z, e.v === 'w' ? 'leaf' : 'sparkle', 0.2); }
  }
  shakeTree(x, z) { const e = this.wildM?.get(x + ',' + z); if (e) { e.shake = 1; this.squish(e.m, 0.12, 0.6); this.burst(x, z, this.season === 'winter' ? 'snowball' : 'leaf', 1.8); } }

  // ---------- kleine Wackel-Animationen (Squash & Stretch) ----------
  // Ein Objekt kurz zusammendrücken und zurückfedern lassen
  squish(m, amt = 0.22, dur = 0.45) {
    if (!m || this.animations === false) return;
    this.tw ||= [];
    const old = this.tw.find(t => t.m === m);
    if (old) { old.t = 0; old.amt = amt; old.dur = dur; return; }
    this.tw.push({ m, t: 0, dur, amt, base: m.scale.clone() });
  }
  // Objekt "plopp" verschwinden lassen statt es hart zu entfernen
  vanish(m) {
    if (!m) return;
    if (this.animations === false) { m.parent?.remove(m); return; }
    this.tw ||= [];
    this.tw = this.tw.filter(t => t.m !== m);
    this.tw.push({ m, t: 0, dur: 0.24, out: true, base: m.scale.clone() });
  }
  // was auch immer auf diesem Feld steht, hüpft kurz
  squishAt(x, z, amt) {
    const k = Math.round(x) + ',' + Math.round(z);
    for (const map of [this.crops, this.objs, this.wildM, this.pickM]) { const e = map?.get(k); if (e) { this.squish(e.m, amt); return; } }
  }
  // Gebäude in der Nähe federt (Tür auf, Laden betreten …)
  boingNear(x, z, r = 4.5) {
    let best = null, bd = r;
    for (const m of this.static.group?.children || []) { const d = Math.hypot(m.position.x - x, m.position.z - z); if (d < bd) { bd = d; best = m; } }
    for (const m of [...(this.zones?.street?.children || []), ...(this.zones?.tropic?.children || [])]) { if (!m.userData.asset) continue; const d = Math.hypot(m.position.x - x, m.position.z - z); if (d < bd) { bd = d; best = m; } }
    if (best) this.squish(best, 0.06, 0.5);
  }
  updateTweens(dt) {
    if (!this.tw?.length) return;
    this.tw = this.tw.filter(t => {
      t.t += dt;
      const k = Math.min(1, t.t / t.dur), b = t.base;
      if (t.out) {
        // flach werden und kurz breit, dann weg
        const y = 1 - k * k, w = 1 + Math.sin(k * Math.PI) * 0.35;
        t.m.scale.set(b.x * w, b.y * Math.max(0.001, y), b.z * w);
        if (k >= 1) { t.m.parent?.remove(t.m); return false; }
        return true;
      }
      const q = t.amt * Math.sin(k * Math.PI * 2.5) * (1 - k);
      t.m.scale.set(b.x * (1 + q), b.y * (1 - q), b.z * (1 + q));
      if (k >= 1) { t.m.scale.copy(b); return false; }
      return true;
    });
  }

  // Schmetterling oder Glühwürmchen in der Nähe? (für den Kescher)
  nearCritter(x, z, r = 2) {
    const night = this.fireflies.visible && !this.flies.visible;
    const list = night ? this.bugs : this.flyData;
    let best = null, bd = r;
    for (const c of list) {
      if (!c.pos || c.gone > this.time) continue;
      const d = Math.hypot(c.pos.x - x, c.pos.z - z);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  catchCritter(c) { c.gone = this.time + 25; }

  // kleine Emoji-Wölkchen für Emotes
  emoteFx(x, z, e) {
    const S = {
      '❤️': ['❤️', '💕', '💗'], '🥰': ['💕', '💗', '💖'], '😘': ['💋', '❤️', '💕'], '💃': ['🎵', '🎶', '✨'], '🎵': ['🎵', '🎶'], '👏': ['✨', '⭐'], '🎉': ['🎊', '✨', '🎉'],
      '😴': ['💤', 'z', 'Z'], '💤': ['💤', 'z', 'Z'], '😢': ['💧'], '😡': ['💢'], '🤔': ['❓', '❔'], '😮': ['❗'], '😊': ['🌸', '💮'], '🙈': ['💦', '🌸'], '✨': ['✨', '🌟'], '🍀': ['🍀', '✨'], '😂': ['💦', '✨'],
    }[e];
    if (!S) return;
    for (let i = 0; i < 5; i++) this.float(x + (Math.random() - 0.5) * 0.6, z + (Math.random() - 0.5) * 0.4, S[i % S.length], 1.5 + Math.random() * 0.4, { vx: (Math.random() - 0.5) * 0.8, life: 1.6 + Math.random() * 0.6, delay: i * 0.12, cls: 'mini' });
    if (['❤️', '🥰', '😘'].includes(e)) this.burst(x, z, 'heart', 1.2);
    if (e === '🎉' || e === '✨') this.burst(x, z, 'coin', 1.4);
    if (e === '😢') this.burst(x, z, 'drop', 1.2);
  }

  // Nachbarn: laufen herum, bleiben beim Gespräch stehen und schauen dich an
  syncNpcs(s, dt) {
    this.npcM ||= new Map();
    this.npcMood ||= {};
    const awake = npcAwake(s), hoppel = turnipSeller(s);
    const visit = (id, t) => ({ x: 2.6 + Math.sin(t * 0.07) * 0.6, z: 4.3 + Math.sin(t * 0.05) * 0.25, walking: Math.abs(Math.cos(t * 0.07)) > 0.6 });
    const posOf = (id, t, d) => id === 'hoppel' ? visit(id, t) : npcPos(id, t, d);
    for (const id of [...NPC_IDS, 'hoppel']) {
      let e = this.npcM.get(id);
      if (!e) {
        const p = posOf(id, s.time, s.dayTime);
        e = { m: makeNpc(id), x: p.x, z: p.z, ry: 0, speed: 0 };
        this.scene.add(e.m);
        this.npcM.set(id, e);
      }
      e.m.visible = e.awake = id === 'hoppel' ? hoppel : awake;
      if (!e.awake) continue;
      const talk = this.npcTalk?.id === id;
      if (talk) {
        e.ry = Math.atan2(this.npcTalk.x - e.x, this.npcTalk.z - e.z);
        e.speed += (0 - e.speed) * Math.min(1, dt * 8);
      } else {
        const p = posOf(id, s.time, s.dayTime), q = posOf(id, s.time + 0.3, s.dayTime + 0.0008), k = Math.min(1, dt * 5);
        e.x += (p.x - e.x) * k;
        e.z += (p.z - e.z) * k;
        if (Math.hypot(q.x - p.x, q.z - p.z) > 0.01) e.ry = Math.atan2(q.x - p.x, q.z - p.z);
        e.speed += ((p.walking ? 0.7 : 0) - e.speed) * Math.min(1, dt * 6);
      }
      // kleiner Freudenhüpfer, wenn ein Nachbar etwas sagt
      if (e.hop < 1) e.hop = Math.min(1, e.hop + dt * 3.2);
      const hy = e.hop < 1 && this.animations !== false ? Math.abs(Math.sin(e.hop * Math.PI * 2)) * 0.18 * (1 - e.hop * 0.5) : 0;
      e.m.position.set(e.x, hy, e.z);
      e.m.rotation.y += angDiff(e.m.rotation.y, e.ry) * Math.min(1, dt * 8);
      const md = this.npcMood[id];
      e.m.userData.update(dt, { speed: e.speed, talking: talk, mood: md && md.until > this.time ? md.mood : null, time: this.time });
      this.tag('npc' + id, `${NPCS[id].icon} ${NPCS[id].name}`, e.x, (e.m.userData.headTop || 1.3) + 0.3, e.z, 'name npc');
      if (e.bubble && e.bubble.until > this.time && !talk) this.tag('npcb' + id, esc(e.bubble.text), e.x, (e.m.userData.headTop || 1.3) + 0.7, e.z, 'chat');
    }
  }
  npcNear(x, z, r = 1.1) {
    let best = null, bd = r;
    for (const [id, e] of this.npcM || []) {
      if (!e.awake) continue;
      const d = Math.hypot(e.x - x, e.z - z);
      if (d < bd) { bd = d; best = { id, x: e.x, z: e.z }; }
    }
    return best;
  }
  npcSay(id, mood) { this.npcMood[id] = { mood, until: this.time + 2.5 }; const e = this.npcM?.get(id); if (e) e.hop = 0; }
  npcBubble(id, text) { const e = this.npcM?.get(id); if (e) { e.bubble = { text, until: this.time + 5 }; e.hop = 0; } }

  // ---------- Insel-Designer: selbst verlegte Wege ----------
  syncPaths(s) {
    const sig = JSON.stringify(s.paths || {});
    if (sig === this.pathSig) return;
    this.pathSig = sig;
    if (!this.pathM) {
      this.pathM = {};
      const geo = new THREE.PlaneGeometry(1.04, 1.04);
      geo.rotateX(-Math.PI / 2);
      const paint = {
        erde: (g, r) => { for (let i = 0; i < 70; i++) { g.fillStyle = `hsl(32 38% ${55 + r() * 20}%)`; g.beginPath(); g.ellipse(r() * 128, r() * 128, 2 + r() * 4, 2 + r() * 3, r() * 3, 0, 7); g.fill(); } },
        sand: (g, r) => { for (let i = 0; i < 120; i++) { g.fillStyle = `hsl(42 50% ${78 + r() * 14}%)`; g.fillRect(r() * 128, r() * 128, 2, 2); } },
        stein: (g, r) => { g.fillStyle = '#9c968e'; g.fillRect(0, 0, 128, 128); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = `hsl(30 6% ${66 + r() * 14}%)`; g.beginPath(); g.roundRect(x * 32 + 2 + (y % 2) * 8, y * 32 + 2, 28, 28, 8); g.fill(); } },
        ziegel: (g, r) => { g.fillStyle = '#e8d5c0'; g.fillRect(0, 0, 128, 128); for (let y = 0; y < 8; y++) for (let x = -1; x < 4; x++) { g.fillStyle = `hsl(12 55% ${50 + r() * 12}%)`; g.fillRect(x * 32 + (y % 2) * 16 + 2, y * 16 + 2, 28, 12); } },
        holz: (g, r) => { for (let x = 0; x < 6; x++) { g.fillStyle = `hsl(28 45% ${52 + r() * 12}%)`; g.fillRect(x * 21.3, 0, 20, 128); g.fillStyle = 'rgba(80,50,30,.35)'; g.fillRect(x * 21.3 + 4, 20 + r() * 80, 2, 2); } },
      };
      for (const [k, P] of Object.entries(PAVE)) {
        const map = this.detailTex(paint[k], [1, 1]);
        const m = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0xffffff, map }), 2400);
        m.count = 0;
        m.receiveShadow = true;
        m.position.y = 0.016;
        this.pathM[k] = m;
        this.scene.add(m);
      }
    }
    const n = {};
    for (const [k, t] of Object.entries(s.paths || {})) {
      const m = this.pathM[t];
      if (!m || (n[t] || 0) >= 2400) continue;
      const [x, z] = k.split(',').map(Number);
      this.m4.makeTranslation(x, 0, z);
      m.setMatrixAt(n[t] = (n[t] || 0), this.m4);
      n[t]++;
    }
    for (const [t, m] of Object.entries(this.pathM)) { m.count = n[t] || 0; m.instanceMatrix.needsUpdate = true; }
  }

  // ---------- Gegenstände am Boden (fallen herunter, man hebt sie auf) ----------
  syncGround(s) {
    this.groundM ||= new Map();
    const seen = new Set();
    for (const [k, g] of Object.entries(s.ground || {})) {
      const kind = g.id === 'bottle' || g.id === 'diy' || g.id === 'money' ? g.id : g.box ? 'present' : ITEMS[g.id]?.furn || ITEMS[g.id]?.place ? 'leaf' : g.id, sig = k + kind;
      seen.add(sig);
      let e = this.groundM.get(sig);
      if (!e) {
        const [x, z] = k.split(',').map(Number), m = M.groundItem(kind);
        m.position.set(x, 0.02, z);
        m.rotation.y = (x * 2.3 + z * 1.7) % 6.28;
        this.scene.add(m);
        e = { m, x, z, born: this.time };
        this.groundM.set(sig, e);
      }
      const t = this.time - e.born; // kurzer Hüpfer beim Herunterfallen
      e.m.position.y = 0.02 + (t < 0.6 ? Math.abs(Math.sin(t * 10)) * 0.5 * (1 - t / 0.6) : 0);
    }
    for (const [sig, e] of this.groundM) if (!seen.has(sig)) { this.vanish(e.m); this.groundM.delete(sig); this.burst(e.x, e.z, 'sparkle', 0.2); }
    // Luftblasen über den Meerestieren
    if (this.time > (this.nextBubble || 0)) {
      this.nextBubble = this.time + 0.18;
      for (const d of s.dives || []) if (Math.random() < 0.5 && Math.abs(d.x - this.target.x) < 22 && Math.abs(d.z - this.target.z) < 22) this.burst(d.x + (Math.random() - 0.5) * 0.3, d.z + (Math.random() - 0.5) * 0.3, 'bubble', SEA_Y);
    }
  }

  // ---------- Geschenkballon ----------
  syncBalloon(s) {
    if (!this.balloonM) { this.balloonM = M.balloon(); this.scene.add(this.balloonM); }
    const b = s.balloon;
    this.balloonM.visible = !!b;
    if (b && b.id !== this.balloonId) { this.balloonId = b.id; this.balloonPop = 0; }
    if (!b) return;
    const p = balloonPos(b, s.time);
    this.balloonM.position.set(p.x, p.y, p.z);
    this.balloonM.rotation.z = Math.sin(this.time * 1.3) * 0.12;
    this.balloonPos = p;
  }
  popBalloon() {
    const p = this.balloonPos;
    if (!p) return;
    for (let i = 0; i < 3; i++) this.burst(p.x, p.z, 'coin', p.y);
    this.burst(p.x, p.z, 'heart', p.y);
  }

  // ---------- Sternschnuppen & Regenbogen ----------
  updateSkyFx(s, info, rain) {
    const hour = info.hour;
    if (!this.shoot) {
      this.shoot = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, fog: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      this.shoot.material.defines = { NO_CURVE: '' };
      this.shoot.frustumCulled = false;
      this.scene.add(this.shoot);
      this.shootT = -1;
      // Regenbogen: sieben bunte Bögen weit im Norden
      const g = new THREE.Group(), cols = [0xff5a5a, 0xffa23a, 0xffe14a, 0x6fdc6a, 0x5ab8ff, 0x6f6aff, 0xb46aff];
      cols.forEach((c, i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(60 - i * 1.6, 0.8, 4, 60, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.35, fog: false, depthWrite: false })); m.material.defines = { NO_CURVE: '' }; g.add(m); });
      g.position.set(0, -6, -110);
      this.rainbow = g;
      this.scene.add(g);
    }
    // Regenbogen am Vormittag nach einem Regentag
    const rb = s.rainbowDay === s.day && !rain && hour < 13 ? 1 : 0;
    this.rainbowA = (this.rainbowA || 0) + (rb - (this.rainbowA || 0)) * 0.02;
    this.rainbow.visible = this.rainbowA > 0.01;
    this.rainbow.children.forEach(m => { m.material.opacity = 0.32 * this.rainbowA; });
    this.rainbow.position.x = this.target.x;
    this.rainbow.position.z = this.target.z - 110;
    // Sternschnuppen in Sternschnuppen-Nächten (nur zum Anschauen und Wünschen, jedes Gerät sieht eigene)
    const night = s.starNight && hour >= 19 && !rain && this.target.x < HOME_X / 2;
    if (night && this.shootT < 0 && Math.random() < this.dt / 4) {
      const a = Math.random() * 0.6 - 0.3, fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), dist = 40 + Math.random() * 15, side = (Math.random() - 0.5) * 2 * dist * Math.tan(this.camera.fov / 360 * Math.PI) * this.camera.aspect * 0.6;
      const x = this.target.x + fx * dist - fz * side, z = this.target.z + fz * dist + fx * side;
      this.shootData = { x, z, y: 20 + Math.random() * 10, dx: Math.cos(a) * (Math.random() < 0.5 ? -1 : 1), dy: -0.35 };
      this.shootT = 0;
    }
    if (this.shootT >= 0) {
      this.shootT += this.dt;
      const d = this.shootData, t = this.shootT, L = 5;
      const sp = 6 + 8 * Math.min(1, this.camera.aspect), hx = d.x + d.dx * t * sp, hy = d.y + d.dy * t * sp;
      this.shoot.position.set(hx - d.dx * L / 2, hy - d.dy * L / 2, d.z);
      this.shoot.scale.set(L, 0.12, 1);
      this.shoot.rotation.set(0, 0, Math.atan2(d.dy, d.dx));
      this.shoot.lookAt(this.camera.position);
      this.shoot.rotateZ(Math.atan2(d.dy, d.dx));
      this.shoot.material.opacity = Math.sin(Math.min(1, t / 1.3) * Math.PI) * 0.95;
      if (t > 1.3) { this.shootT = -1; this.shoot.material.opacity = 0; this.shootEnd = this.time; }
    }
  }
  starActive() { return this.shootT >= 0 || this.time - (this.shootEnd || -9) < 0.8; }

  syncAnimals(s) {
    const seen = new Set();
    for (const a of s.animals) {
      seen.add(a.id);
      let e = this.animals.get(a.id);
      if (!e) {
        e = { m: makeAnimal(a.k), ry: 0, pet: a.pet, happyT: 0 };
        this.scene.add(e.m);
        this.animals.set(a.id, e);
      }
      const p = animalPos(a, s.time), q = animalPos(a, s.time + 0.3);
      if (Math.hypot(q.x - p.x, q.z - p.z) > 0.01) e.ry = Math.atan2(q.x - p.x, q.z - p.z);
      if (a.pet && !e.pet) e.happyT = 4; // frisch gestreichelt: kurz freuen
      e.pet = a.pet;
      e.happyT -= this.dt || 0;
      e.m.position.set(p.x, 0, p.z);
      e.m.rotation.y += angDiff(e.m.rotation.y, e.ry) * 0.15;
      e.m.userData.update(this.dt || 0, { speed: p.walking ? 1 : 0, happy: e.happyT > 0, hungry: a.fed <= 0 });
      e.x = p.x; e.z = p.z;
      const h = e.m.userData.headTop + 0.3;
      if (a.ready) this.tag('a' + a.id, ITEMS[ANIMALS[a.k].product].icon, p.x, h, p.z, 'bubble');
      else if (a.fed <= 0) this.tag('a' + a.id, '🌿?', p.x, h, p.z, 'bubble small hungry');
    }
    for (const [id, e] of this.animals) if (!seen.has(id)) { this.scene.remove(e.m); this.animals.delete(id); }
  }

  syncPlayers(players, me, dt, showNames = true) {
    const seen = new Set(), now = performance.now();
    for (const p of Object.values(players)) {
      seen.add(p.id);
      let e = this.players.get(p.id);
      const sig = lookKey(p.look);
      if (e && e.sig !== sig) { this.scene.remove(e.m); if (e.pet) this.scene.remove(e.pet); e = null; }
      if (!e) {
        e = { m: makeAvatar(p.look), sig, x: p.x, z: p.z, ry: p.ry, speed: 0, an: p.an, actT: 1, held: undefined };
        if (p.look.pet && p.look.pet !== 'none') {
          e.pet = makePet(p.look.pet, p.look.petColor);
          e.pet.position.set(p.x - 0.8, 0, p.z - 0.8);
          e.petRy = 0;
          this.scene.add(e.pet);
        }
        this.scene.add(e.m);
        this.players.set(p.id, e);
      }
      const local = p.id === me;
      const k = local ? 1 : Math.min(1, dt * 12);
      const ox = e.x, oz = e.z;
      e.x += (p.x - e.x) * k;
      e.z += (p.z - e.z) * k;
      e.ry += angDiff(e.ry, p.ry) * Math.min(1, dt * 15);
      const v = Math.hypot(e.x - ox, e.z - oz) / Math.max(dt, 1e-3);
      e.speed += ((local ? (p.m ? 1 : 0) : Math.min(1, v / (p.run ? 5.5 : 3.5))) - e.speed) * Math.min(1, dt * 10);
      if (p.an !== e.an) { e.an = p.an; e.ak = p.ak; e.actT = 0; }
      e.actT = Math.min(1, e.actT + dt / 0.45);
      const fishing = p.ak === 'fish' && p.fishing;
      if (e.held !== p.held) { e.held = p.held; e.m.userData.setHeld(p.held || null); }
      const sw = p.sw ? 1 : 0;
      e.swim = (e.swim || 0) + (sw - (e.swim || 0)) * Math.min(1, dt * 6);
      e.m.position.set(e.x, -0.78 * e.swim + (p.sw ? Math.sin(this.time * 2.5) * 0.03 : 0), e.z);
      e.m.rotation.y = e.ry;
      e.m.visible = p.pose !== 'dive';
      if (p.sw && (e.speed > 0.3 || Math.random() < 0.05) && Math.random() < 0.3) this.burst(e.x, e.z, 'ripple', SEA_Y + 0.02);
      const emote = p.emoteUntil > now ? p.emote : null;
      e.m.userData.update(dt, { speed: p.pose ? 0 : e.speed, run: p.run && !p.sw, swim: !!p.sw, act: e.actT < 1 || fishing ? e.ak : null, actT: e.actT, pose: p.pose === 'dive' ? null : p.pose || null, emote, time: this.time });

      if (e.pet) { // Haustier läuft hinterher und setzt sich neben dich
        const side = p.pose ? 0.7 : 0.55, back = p.pose ? 0 : 0.85;
        const tx = e.x - Math.sin(e.ry) * back + Math.cos(e.ry) * side, tz = e.z - Math.cos(e.ry) * back - Math.sin(e.ry) * side;
        const dx = tx - e.pet.position.x, dz = tz - e.pet.position.z, dist = Math.hypot(dx, dz);
        const sp = dist > 0.12 ? Math.min(dist * 4, 6.5) : 0;
        if (dist > 6) e.pet.position.set(tx, 0, tz);
        else if (sp) { e.pet.position.x += dx / dist * sp * dt; e.pet.position.z += dz / dist * sp * dt; e.petRy = Math.atan2(dx, dz); }
        else e.petRy += angDiff(e.petRy, e.ry) * 0.05;
        e.pet.rotation.y += angDiff(e.pet.rotation.y, e.petRy) * Math.min(1, dt * 10);
        e.pet.userData.update(dt, { speed: Math.min(1, sp / 3), time: this.time });
      }

      const top = (HAT_TOP[p.look.hat] || 1.45) - (p.pose ? 0.35 : 0) - (p.sw ? 0.75 : 0); // Kopf-/Hutoberkante der Figur
      if (showNames) this.tag('pn' + p.id, esc(p.name), e.x, top + 0.22, e.z, 'name' + (local ? ' me' : ''));
      if (p.chatUntil > now) this.tag('pc' + p.id, esc(p.chat), e.x, top + 0.6, e.z, 'chat');
      if (emote) this.tag('pe' + p.id, emote, e.x, top + (p.chatUntil > now ? 1.35 : 0.75), e.z, 'emote');
    }
    for (const [id, e] of this.players) if (!seen.has(id)) { this.scene.remove(e.m); if (e.pet) this.scene.remove(e.pet); this.players.delete(id); }
  }

  light(s) {
    const hour = 6 + s.dayTime * 18;
    const day = smooth(4.8, 6.8, hour) * (1 - smooth(17.5, 21, hour));
    const dusk = Math.max(1 - smooth(6, 8, hour), smooth(16.5, 18.5, hour) * (1 - smooth(19.5, 21.5, hour)));
    const night = 1 - day;
    const rain = s.weather !== 'sun';
    const top = this.skyU.top.value, hor = this.skyU.hor.value;
    top.copy(SKY_TOP[2]).lerp(SKY_TOP[0], day).lerp(SKY_TOP[1], dusk * 0.5);
    hor.copy(SKY_HOR[2]).lerp(SKY_HOR[0], day).lerp(SKY_HOR[1], dusk * 0.75);
    if (rain) { top.lerp(SKY_RAIN_TOP, 0.6 * (0.3 + day * 0.7)); hor.lerp(SKY_RAIN_HOR, 0.6 * (0.3 + day * 0.7)); }
    this.scene.fog.color.copy(hor);
    this.stars.material.opacity = smooth(0.6, 1, night) * (rain ? 0.2 : 1);
    this.sun.intensity = (rain ? 1.1 : 2.3) * (0.22 + 0.78 * day);
    this.sun.color.copy(SUN_DAY).lerp(SUN_MOON, night).lerp(SUN_DUSK, dusk * 0.75);
    this.hemi.intensity = 0.55 + 0.95 * day;
    this.hemi.color.copy(HEMI_DAY).lerp(HEMI_NIGHT, night);
    this.hemi.groundColor.copy(GROUND_DAY).lerp(GROUND_NIGHT, night);
    this.lamp.intensity = night * 12;
    const a = Math.min(1, Math.max(0, (hour - 6) / 14)) * Math.PI;
    this.sunDir = new THREE.Vector3(-Math.cos(a) * 0.8, 1.1, 0.6).normalize();
    M.GLOW.color.copy(GLOW_DAY).lerp(GLOW_NIGHT, Math.min(1, night * 1.5));
    this.waterU.night.value = night * 0.8;
    this.waterU.ice.value += ((this.season === 'winter' ? 1 : 0) - this.waterU.ice.value) * 0.02;
    if (this.bloom) this.bloom.strength = 0.25 + night * 0.55;
    return { hour, night, day };
  }

  rotate(d) { this.yawT += d; }

  draw() {
    if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera);
  }

  render(s, players, me, dt, opt = {}) {
    this.time += dt;
    this.dt = dt;
    windTime.value = this.time;
    this.waterU.t.value = this.time;
    this.syncSeason(s);
    this.syncStatic(s);
    this.syncTiles(s);
    this.syncObjects(s);
    this.syncAnimals(s);
    this.syncNature(s);
    this.syncPaths(s);
    this.syncGround(s);
    this.syncBalloon(s);
    this.syncNpcs(s, dt);
    this.syncHome(s);
    this.syncGrass(s);
    this.syncPlayers(players, me, dt, !opt.hideNames);
    const indoors = this.target.x > HOME_X / 2, tropic = this.target.z > 150; // im Haus regnet es nicht, auf der Tropeninsel ist immer Sommer
    const info = this.light(s), rain = s.weather === 'rain' && !indoors && !tropic, snowing = s.weather === 'snow' && !indoors && !tropic;
    this.zones.update(this, s, this.time, info.night || 0, this.target);
    if (this.animations !== false) tickAssets(dt);
    snow.value += ((this.season === 'winter' ? 0.85 : 0) - snow.value) * Math.min(1, dt * 2);
    if (this.clock?.h) { // Rathausuhr zeigt die Spielzeit (bzw. die echte Uhrzeit)
      const h = s.real ? (d => d.getHours() + d.getMinutes() / 60)(new Date()) : 6 + s.dayTime * 18;
      this.clock.h.rotation.z = -(h % 12) / 12 * Math.PI * 2;
      this.clock.m.rotation.z = -(h % 1) * Math.PI * 2;
    }

    // Zielfeld-Markierung
    const tiles = opt.tiles || [];
    this.hl.count = Math.min(tiles.length, 25);
    for (let i = 0; i < this.hl.count; i++) {
      this.m4.makeTranslation(tiles[i][0], 0.13, tiles[i][1]);
      this.hl.setMatrixAt(i, this.m4);
    }
    this.hl.instanceMatrix.needsUpdate = true;
    this.hl.material.opacity = opt.hlOn ? 0.75 + Math.sin(this.time * 6) * 0.2 : 0.35;
    this.hl.material.color.set(opt.hlBad ? 0xff8a8a : 0xffffff);
    if (opt.prompt) this.tag('prompt', opt.prompt.html, opt.prompt.x, opt.prompt.y ?? 1.1, opt.prompt.z, 'prompt');
    if (opt.info) this.tag('info', opt.info.html, opt.info.x, 0.9, opt.info.z, 'info');

    // Kamera
    const cs = this.camSmooth || 1;
    this.yaw += angDiff(this.yaw, this.yawT) * Math.min(1, dt * 8 * cs);
    const pl = players[me];
    if (opt.orbit) {
      const a = this.time * 0.05;
      this.target.set(0, 0, 0);
      this.camera.position.set(Math.sin(a) * 24, 12 + Math.sin(this.time * 0.1) * 1.5, Math.cos(a) * 24);
      this.camera.lookAt(0, 0.6, 0);
    } else if (opt.preview) {
      const p = opt.preview, d = 3.6 * this.zoom * Math.max(1, 0.8 / this.camera.aspect);
      this.target.set(p.x, 0, p.z);
      this.camera.position.set(p.x + Math.sin(this.yaw) * d, 1.5 + (p.lift || 0) * 0.4, p.z + Math.cos(this.yaw) * d);
      this.camera.lookAt(p.x + Math.cos(this.yaw) * (p.shift || 0), 0.7 - (p.lift || 0), p.z - Math.sin(this.yaw) * (p.shift || 0));
    } else {
      if (pl) {
        if (Math.abs(pl.x - this.target.x) > 40 || Math.abs(pl.z - this.target.z) > 40) this.target.set(pl.x, 0, pl.z); // Tür, Tor, Boot: Kamera springt mit
        this.target.x += (pl.x - this.target.x) * Math.min(1, dt * 6 * cs);
        this.target.z += (pl.z - this.target.z) * Math.min(1, dt * 6 * cs);
      }
      const portrait = Math.min(1.7, Math.max(1, 1.25 / this.camera.aspect)), home = this.target.x > HOME_X / 2;
      // Himmelsblick (Sternschnuppen, Regenbogen): Kamera geht tief und schaut nach oben
      this.skyK = (this.skyK || 0) + ((opt.sky && !home ? 1 : 0) - (this.skyK || 0)) * Math.min(1, dt * 3);
      const k = this.skyK, d = 13.4 * this.zoom * portrait * (home ? 0.78 : 1), el = opt.photo ? this.el : home ? 0.83 : (this.baseEl || 0.74);
      const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw), cam = this.camera.position;
      // normal: schräg von oben · Himmel: knapp hinter der Figur, Blick 30° nach oben
      cam.set(this.target.x + sy * Math.cos(el) * d, Math.max(0.6, Math.sin(el) * d), this.target.z + cy * Math.cos(el) * d);
      cam.lerp(this.v.set(this.target.x + sy * 1.6, 1.5, this.target.z + cy * 1.6), k);
      const lx = this.target.x * (1 - k) + (cam.x - sy * 10) * k, lz = this.target.z * (1 - k) + (cam.z - cy * 10) * k, ly = 0.6 * (1 - k) + (cam.y + 5.8) * k;
      this.camera.lookAt(lx, ly, lz);
    }
    this.sky.position.copy(this.camera.position);
    for (const c of this.clouds) {
      const u = c.userData, a = u.a + this.time * 0.004;
      c.position.set(Math.cos(a) * u.r, u.y, Math.sin(a) * u.r);
    }
    this.sun.position.copy(this.target).addScaledVector(this.sunDir, 35);
    this.sun.target.position.copy(this.target);
    this.lamp.position.set(this.target.x, 3.2, this.target.z + 1.2);
    const indoor = this.target.x > HOME_X / 2;
    this.roomLight.intensity = indoor ? 3 + info.night * 9 : 0;
    this.roomLight.position.set(HOME_X, 2.3, 0.5);

    // Laternen beleuchten nachts ihre Umgebung (nur die nächsten, Grafik "Hoch")
    if (this.lanternLights.length) {
      const zl = this.zones.lights(this.target), near = (zl ? zl.map(([x, z]) => ({ x, z })) : this.lanterns || []).map(e => [e, (e.x - this.target.x) ** 2 + (e.z - this.target.z) ** 2]).sort((a, b) => a[1] - b[1]);
      this.lanternLights.forEach((l, i) => {
        const e = near[i]?.[0];
        l.intensity = e ? info.night * 5 : 0;
        if (e) l.position.set(e.x, 1.5, e.z);
      });
    }

    // kleine Effekte: Kaminrauch, Sprinkler, Funkeln über reifen Pflanzen, Regentropfen
    if (this.time > this.nextFx) {
      this.nextFx = this.time + 0.12;
      const ch = this.chimney, cold = this.season === 'winter' || info.night > 0.3;
      if (ch && Math.random() < (cold ? 0.45 : 0.22)) this.burst(ch.x + (Math.random() - 0.5) * 0.2, ch.z + (Math.random() - 0.5) * 0.2, 'smoke', ch.y);
      if (this.fallAt && Math.random() < 0.8) this.burst(this.fallAt.x + (Math.random() - 0.5) * 1.8, this.fallAt.z + 0.2, 'mist', -0.1);
      for (const e of this.sprinklers || []) if (Math.random() < 0.6) this.burst(e.x, e.z, 'drop', 0.4);
      for (const e of this.digM?.values() || []) if (Math.random() < 0.15) this.burst(e.x + (Math.random() - 0.5) * 0.3, e.z + (Math.random() - 0.5) * 0.3, 'sparkle', 0.15);
      if (this.ripe.length && Math.random() < 0.7) { const e = this.ripe[Math.floor(Math.random() * this.ripe.length)]; this.burst(e.x + (Math.random() - 0.5) * 0.5, e.z + (Math.random() - 0.5) * 0.5, 'sparkle', 0.4 + Math.random() * 0.5); }
      if (rain) for (let i = 0; i < 4; i++) this.burst(this.target.x + (Math.random() - 0.5) * 16, this.target.z + (Math.random() - 0.5) * 12, 'splash', 0.03);
      // Jahreszeit: Blütenblätter im Frühling, bunte Blätter im Herbst
      const drift = !indoors && Math.abs(this.target.z) < 150 && { spring: 'petal', autumn: 'fall' }[this.season];
      if (drift && !rain && Math.random() < 0.5) this.burst(this.target.x + (Math.random() - 0.5) * 18, this.target.z + (Math.random() - 0.5) * 14, drift, 4 + Math.random() * 2);
    }
    this.updateParticles(dt);
    this.updateTweens(dt);
    this.updateCritters(info, rain);
    this.updateFish();
    this.updateSkyFx(s, info, rain);

    // Schnee
    this.snow.visible = snowing;
    if (snowing) {
      const a = this.snow.geometry.attributes.position;
      for (let i = 0; i < a.count; i++) {
        let y = a.getY(i) - dt * 1.6;
        if (y < 0) y += 16;
        a.setY(i, y);
        a.setX(i, a.getX(i) + Math.sin(this.time + i) * dt * 0.3);
      }
      a.needsUpdate = true;
      this.snow.position.set(this.target.x, 0, this.target.z);
    }
    // Regen
    this.rain.visible = rain;
    if (rain) {
      const a = this.rain.geometry.attributes.position;
      for (let i = 0; i < a.count; i += 2) {
        let y = a.getY(i) - dt * 16;
        if (y < -0.5) y += 16;
        a.setY(i, y);
        a.setY(i + 1, y + 0.38);
      }
      a.needsUpdate = true;
      this.rain.position.set(this.target.x, 0, this.target.z);
    }

    // Angel-Schwimmer
    this.bobber.visible = !!opt.bobber;
    if (opt.bobber) this.bobber.position.set(opt.bobber.x, opt.bobber.bite ? -0.34 + Math.sin(this.time * 30) * 0.05 : opt.bobber.nib ? -0.22 : -0.16 + Math.sin(this.time * 3) * 0.03, opt.bobber.z);

    this.draw();

    // Beschriftungen aufräumen
    for (const [id, t] of this.tags) {
      if (!t.used) { t.el.remove(); this.tags.delete(id); } else t.used = false;
    }
    this.floaters = this.floaters.filter(f => {
      f.age += dt;
      if (f.age < 0) return true;
      if (f.follow) { const o = f.follow(); if (o) { f.x = o.x; f.z = o.z; } }
      const p = this.project(f.x + f.vx * f.age + Math.sin(f.age * 5) * 0.08 * (f.vx ? 1 : 0), f.y + f.age * f.rise, f.z);
      if (f.age > f.life || !p) { f.el.remove(); return false; }
      f.el.style.transform = `translate(${p[0]}px, ${p[1]}px) translate(-50%, -100%) scale(${Math.min(1, f.age * 6)})`;
      f.el.style.opacity = Math.min(1, (f.life - f.age) * 1.6);
      return true;
    });
    return info;
  }
}

export const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const cropInfo = (t) => {
  const c = CROPS[t.c.k], pct = Math.floor(Math.min(1, t.c.g / c.grow) * 100);
  return `${c.icon} ${c.name} · ${pct >= 100 ? 'reif!' : pct + '%'}${t.w > 0 ? ' 💧' : pct < 100 ? ' · durstig' : ''}`;
};
