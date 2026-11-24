// Die 3D-Darstellung: baut aus dem Spielzustand die Szene und hält sie aktuell.
import * as THREE from '../vendor/three.module.min.js';
import { EffectComposer } from '../vendor/post/EffectComposer.js';
import { RenderPass } from '../vendor/post/RenderPass.js';
import { UnrealBloomPass } from '../vendor/post/UnrealBloomPass.js';
import { OutputPass } from '../vendor/post/OutputPass.js';
import * as M from './models.js';
import { makeAvatar, makePet, lookKey } from './avatar.js';
import { makeNpc, NPCS } from './npc.js';
import { FIELDS, PENS, PLACE, POND, ANIMALS, ITEMS, CROPS, MAP, RES_SPOTS, NPC_IDS } from './data.js';
import { stage, animalPos, buildingAt, inPond, key, seasonOf, npcPos, npcAwake } from './state.js';

const C = h => new THREE.Color(h);
const SKY_TOP = [C(0x5fb4f5), C(0x2a3f86), C(0x0b1433)], SKY_HOR = [C(0xcfeeff), C(0xffb38a), C(0x26365e)];
const SKY_RAIN_TOP = C(0x7d8a9c), SKY_RAIN_HOR = C(0xb7c1cc);
const GLOW_DAY = C(0xd8cfa8), GLOW_NIGHT = C(0xffd65a).multiplyScalar(2.6);
const SUN_DAY = C(0xfff6e8), SUN_DUSK = C(0xff9a50), SUN_MOON = C(0x7f9cff);
const HEMI_DAY = C(0xe8f6ff), HEMI_NIGHT = C(0x5a6aa8), GROUND_DAY = C(0x6c9a50), GROUND_NIGHT = C(0x2a3550);
const WET = C(0x9a9098), WHITE = C(0xffffff);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const angDiff = (a, b) => ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
const isTouch = matchMedia('(pointer: coarse)').matches;
const HAT_TOP = { straw: 1.5, bunny: 1.72, wizard: 1.86, crown: 1.58, cowboy: 1.55, beanie: 1.52, cat: 1.55, bow: 1.5 };

// Wege auf dem Hof (x, z, Breite, Tiefe)
const PATHS = [[0, -6.5, 1.6, 4], [0, -3.5, 9, 1.4], [-4.5, -7.8, 1.2, 1.6], [3, -7, 1.2, 1.2], [6, -3.5, 3, 1.2], [5, 2, 1.4, 10], [6.5, 7.5, 3, 1.4]];
const onPath = (x, z) => PATHS.some(([px, pz, w, d]) => Math.abs(x - px) < w / 2 + 0.3 && Math.abs(z - pz) < d / 2 + 0.3);

// Sanfte Hügel rund um das Tal der Farm
const noise = (x, z) => Math.sin(x * 0.21 + 1.3) * Math.sin(z * 0.17 + 0.4) * 0.5 + Math.sin(x * 0.07 - z * 0.11 + 2) * 0.5;
export function heightAt(x, z) {
  const r = Math.pow(x ** 4 + z ** 4, 0.25);
  return smooth(17, 34, r) * (3.2 + 2.6 * noise(x, z));
}

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
  };
  m.customProgramCacheKey = () => 'wind' + amp;
  return m;
}
const WIND_CROP = windy(M.MAT, 0.09), WIND_TREE = windy(M.MAT, 0.012);

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
    s.fog = new THREE.Fog(SKY_HOR[0].clone(), 38, 95);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.3, 400);
    this.target = new THREE.Vector3(0, 0, -4);
    this.zoom = 1;
    this.yaw = 0;
    this.yawT = 0;
    this.el = 0.83;
    this.ray = new THREE.Raycaster();

    this.hemi = new THREE.HemisphereLight(0xe8f6ff, 0x6c9a50, 1.3);
    this.sun = new THREE.DirectionalLight(0xffffff, 2.2);
    Object.assign(this.sun.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 80 });
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    this.lamp = new THREE.PointLight(0xffc878, 0, 9, 1.6);
    s.add(this.hemi, this.sun, this.sun.target, this.lamp);

    this.buildSky();
    this.buildGround();
    this.buildPond();

    const pen = p => [p.cx - p.rx - 0.6, p.cz - p.rz - 0.5, p.cx + p.rx + 0.6, p.cz + p.rz + 0.5];
    const cp = pen(PENS.coop), bp = pen(PENS.barn);
    s.add(M.fences([[...cp, cp[3]], [...bp, bp[1]]]));
    for (const [x, z] of [[PENS.coop.cx + 2, PENS.coop.cz - 1.2], [PENS.barn.cx - 3, PENS.barn.cz + 1.5]]) {
      s.add(M.model([M.box(1.2, 0.3, 0.4, 0x9c6b3f, x, 0.15, z), M.box(1.1, 0.05, 0.3, 0x9ccf5a, x, 0.3, z)]));
    }

    // Beete: Erde mit Furchen, einmal instanziert
    const soilGeo = M.merge([M.box(0.96, 0.08, 0.96, 0x9a6a44, 0, 0.04, 0), ...[-0.3, 0, 0.3].map(z => M.box(0.88, 0.05, 0.14, 0x86583a, 0, 0.09, z))]);
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
    this.setQuality(quality);
  }

  // ---------- Grafikstufe ----------
  setQuality(q) {
    const Q = this.Q = QUALITY[q] || QUALITY.mid;
    this.quality = q;
    const r = this.renderer;
    r.setPixelRatio(Math.min(devicePixelRatio, Q.ratio));
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
    this.composer = this.bloom = null;
    if (Q.bloom) {
      const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
      this.composer = new EffectComposer(r, rt);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.35, 0.55, 0.92);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    }
    this.grassSig = null;
    this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
    this.resize();
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer?.setSize(w, h);
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
      c.userData = { a: i / 9 * Math.PI * 2, r: 60 + Math.random() * 50, y: 24 + Math.random() * 12 };
      this.clouds.push(c);
      this.scene.add(c);
    }
    this.scene.add(sky);
  }

  buildGround() {
    const geo = this.groundGeo = new THREE.PlaneGeometry(220, 220, 110, 110);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3));
    this.colorGround('summer');
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    ground.receiveShadow = true;
    this.scene.add(ground);
    const pathMat = new THREE.MeshLambertMaterial({ color: 0xe9d7a6 });
    for (const [x, z, w, d] of PATHS) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), pathMat);
      p.rotation.x = -Math.PI / 2;
      p.position.set(x, 0.012, z);
      p.receiveShadow = true;
      this.scene.add(p);
    }
  }

  // Boden, Wald und Gras passend zur Jahreszeit färben
  colorGround(season) {
    const [a, b, c] = { spring: [0x95d66e, 0x84c95e, 0xb2e284], summer: [0x86c95a, 0x72b94b, 0x9fd46a], autumn: [0xb4c46a, 0xc7a75a, 0xd6be78], winter: [0xeef3f6, 0xdfe8ee, 0xffffff] }[season].map(C);
    const pos = this.groundGeo.attributes.position, col = this.groundGeo.attributes.color, tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), n = noise(x * 2.3, z * 2.1) * 0.5 + 0.5;
      tmp.copy(a).lerp(b, n * 0.8).lerp(c, Math.min(1, pos.getY(i) / 6) * 0.6);
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
    this.forest = M.scenery((x, z) => !buildingAt(x, z) && !inPond(x, z) && !(x >= -14 && x <= 4 && z >= -5 && z <= 11) && !onPath(x, z), heightAt, season);
    this.forest.children[0].material = WIND_TREE;
    this.scene.add(this.forest);
    this.grassSig = null;
  }

  buildPond() {
    this.waterU = { t: { value: 0 }, night: { value: 0 }, ice: { value: 0 } };
    const water = new THREE.Mesh(new THREE.CircleGeometry(POND.r + 0.3, 48), new THREE.ShaderMaterial({
      uniforms: this.waterU, transparent: true,
      vertexShader: 'varying vec2 vu; void main(){ vu = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform float t; uniform float night; uniform float ice; varying vec2 vu;
        void main(){
          float r = length(vu) / ${(POND.r + 0.3).toFixed(2)};
          vec3 deep = vec3(0.16, 0.55, 0.78), shallow = vec3(0.45, 0.82, 0.92);
          vec3 c = mix(deep, shallow, smoothstep(0.35, 1.0, r));
          float w = sin(vu.x * 3.1 + t * 1.3) * sin(vu.y * 2.7 - t * 1.1) + sin((vu.x + vu.y) * 4.3 + t * 2.0) * 0.5;
          c += smoothstep(0.75, 1.3, w) * 0.22 * (1.0 - ice);
          c = mix(c, vec3(0.86, 0.94, 0.99) + sin(vu.x * 7.0 + vu.y * 3.0) * 0.03, ice * 0.8);
          c = mix(c, vec3(0.95, 0.98, 1.0), smoothstep(0.9, 1.0, r) * 0.55);
          c *= mix(1.0, 0.35, night);
          gl_FragColor = vec4(c, 0.92);
        }`,
    }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(POND.cx, 0.035, POND.cz);
    const edge = new THREE.Mesh(new THREE.CircleGeometry(POND.r + 0.6, 48), new THREE.MeshLambertMaterial({ color: 0xd9c99a }));
    edge.rotation.x = -Math.PI / 2;
    edge.position.set(POND.cx, 0.02, POND.cz);
    edge.receiveShadow = true;
    this.scene.add(edge, water);
  }

  // ---------- Gras (instanziert, wiegt im Wind) ----------
  syncGrass(s) {
    const per = this.season === 'winter' ? 0 : this.Q.grass, sig = `${per}|${this.season}|${s.up.field}|${Object.keys(s.obj).join()}`;
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
    const [fx0, fz0, fx1, fz1] = FIELDS[s.up.field], spots = [];
    for (let x = -MAP - 3; x <= MAP + 3; x++) for (let z = -MAP - 3; z <= MAP + 3; z++) {
      if (x >= fx0 - 1 && x <= fx1 + 1 && z >= fz0 - 1 && z <= fz1 + 1) continue;
      if (buildingAt(x, z) || (x - POND.cx) ** 2 + (z - POND.cz) ** 2 < (POND.r + 1) ** 2 || onPath(x, z) || s.obj[key(x, z)]) continue;
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
    const v = this.v.set(x, y, z).project(this.camera);
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
    this.floaters.push({ el, x, y, z, age: -(o.delay || 0), vx: o.vx || 0, life: o.life || 1.6 });
  }

  // Bildschirmpunkt -> Punkt auf dem Boden
  pick(cx, cy) {
    this.ray.setFromCamera(new THREE.Vector2(cx / this.w * 2 - 1, -(cy / this.h) * 2 + 1), this.camera);
    const { origin: o, direction: d } = this.ray.ray;
    const t = -o.y / d.y;
    return t > 0 ? { x: o.x + d.x * t, z: o.z + d.z * t } : null;
  }

  snapshot() {
    this.draw();
    return this.canvas.toDataURL('image/jpeg', 0.92);
  }

  // ---------- statische Teile, die sich mit Upgrades ändern ----------
  syncStatic(s) {
    const sig = `${s.up.house}|${s.up.coop}|${s.up.barn}|${s.mail?.length ? 1 : 0}`;
    if (this.static.sig !== sig) {
      if (this.static.group) this.scene.remove(this.static.group);
      const g = new THREE.Group();
      g.add(M.building('house', s.up.house), M.building('coop', s.up.coop), M.building('barn', s.up.barn), M.building('market', 1), M.building('bin', 1), M.building('board', 1),
        M.building('bench', 1), M.building('kitchen', 1), M.building('mail', s.mail?.length ? 1 : 0));
      this.scene.add(g);
      this.static = { ...this.static, sig, group: g };
    }
    if (this.static.field !== s.up.field + this.season) {
      if (this.static.fieldMesh) this.scene.remove(this.static.fieldMesh);
      const [x0, z0, x1, z1] = FIELDS[s.up.field], c = 0x8a5a3a, p = [];
      const w = x1 - x0 + 1, d = z1 - z0 + 1, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      p.push(M.box(w + 0.2, 0.12, 0.1, c, cx, 0.06, z0 - 0.55), M.box(w + 0.2, 0.12, 0.1, c, cx, 0.06, z1 + 0.55), M.box(0.1, 0.12, d + 0.2, c, x0 - 0.55, 0.06, cz), M.box(0.1, 0.12, d + 0.2, c, x1 + 0.55, 0.06, cz));
      p.push(M.box(w + 0.1, 0.01, d + 0.1, { winter: 0xe4ecf1, autumn: 0xb3bf68 }[this.season] || 0x86c463, cx, 0.006, cz));
      this.static.fieldMesh = M.model(p, [], false);
      this.static.field = s.up.field + this.season;
      this.scene.add(this.static.fieldMesh);
    }
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
        const m = M.crop(t.c.k, st);
        m.children[0].material = WIND_CROP;
        m.position.set(x, 0.08, z);
        m.rotation.y = ((x * 7 + z * 13) % 4) * 0.4;
        this.scene.add(m);
        e = { m, sig: sig2, x, z, born: this.time };
        this.crops.set(k, e);
      }
      if (st === 3) this.ripe.push(e);
      const pop = Math.min(1, (this.time - e.born) * 4);
      e.m.scale.setScalar(0.5 + 0.5 * (1 - (1 - pop) ** 3) + (pop < 1 ? Math.sin(pop * Math.PI) * 0.15 : 0));
    }
    for (const [k, e] of this.crops) if (!seen.has(k)) { this.scene.remove(e.m); this.crops.delete(k); }
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
        const m = M.placeable(o.k, ready);
        m.position.set(x, 0, z);
        m.rotation.y = o.r * Math.PI / 2;
        if (['kirschbaum', 'apfelbaum', 'blumen'].includes(o.k)) m.children[0].material = WIND_CROP;
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
      if (ready) this.tag('o' + k, ITEMS[p.item].icon, e.x, o.k === 'apfelbaum' ? 2.3 : 1.3, e.z, 'bubble');
      if (p.kind === 'sprinkler') { e.m.rotation.y = this.time * 2; this.sprinklers.push(e); }
    }
    for (const [k, e] of this.objs) if (!seen.has(k)) { this.scene.remove(e.m); this.objs.delete(k); }
  }

  // Bäume, Felsen und Grabstellen
  syncNature(s) {
    this.wildM ||= new Map();
    for (const [k, kind] of Object.entries(RES_SPOTS)) {
      const left = s.res?.[k] ?? 3, sig = kind + this.season + (left > 0);
      let e = this.wildM.get(k);
      if (e && e.sig !== sig) { this.scene.remove(e.m); e = null; }
      if (!e) {
        const [x, z] = k.split(',').map(Number);
        const m = M.wild(kind, this.season, left);
        m.position.set(x, 0, z);
        m.rotation.y = (x * 3 + z) % 6;
        if (kind === 'tree') m.children[0].material = WIND_TREE;
        this.scene.add(m);
        e = { m, sig, x, z };
        this.wildM.set(k, e);
      }
      if (e.shake > 0) { e.shake -= 1 / 60; e.m.rotation.z = Math.sin(e.shake * 40) * 0.06 * e.shake; }
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
    for (const [k, e] of this.digM) if (!seen.has(k)) { this.scene.remove(e.m); this.digM.delete(k); this.burst(e.x, e.z, 'dirt'); }
  }
  shakeTree(x, z) { const e = this.wildM?.get(x + ',' + z); if (e) e.shake = 1; }

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
    const awake = npcAwake(s);
    for (const id of NPC_IDS) {
      let e = this.npcM.get(id);
      if (!e) {
        const p = npcPos(id, s.time);
        e = { m: makeNpc(id), x: p.x, z: p.z, ry: 0, speed: 0 };
        this.scene.add(e.m);
        this.npcM.set(id, e);
      }
      e.m.visible = e.awake = awake;
      if (!awake) continue;
      const talk = this.npcTalk?.id === id;
      if (talk) {
        e.ry = Math.atan2(this.npcTalk.x - e.x, this.npcTalk.z - e.z);
        e.speed += (0 - e.speed) * Math.min(1, dt * 8);
      } else {
        const p = npcPos(id, s.time), q = npcPos(id, s.time + 0.3), k = Math.min(1, dt * 5);
        e.x += (p.x - e.x) * k;
        e.z += (p.z - e.z) * k;
        if (Math.hypot(q.x - p.x, q.z - p.z) > 0.01) e.ry = Math.atan2(q.x - p.x, q.z - p.z);
        e.speed += ((p.walking ? 0.7 : 0) - e.speed) * Math.min(1, dt * 6);
      }
      e.m.position.set(e.x, 0, e.z);
      e.m.rotation.y += angDiff(e.m.rotation.y, e.ry) * Math.min(1, dt * 8);
      const md = this.npcMood[id];
      e.m.userData.update(dt, { speed: e.speed, talking: talk, mood: md && md.until > this.time ? md.mood : null, time: this.time });
      this.tag('npc' + id, `${NPCS[id].icon} ${NPCS[id].name}`, e.x, (e.m.userData.headTop || 1.3) + 0.3, e.z, 'name npc');
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
  npcSay(id, mood) { this.npcMood[id] = { mood, until: this.time + 2.5 }; }

  syncAnimals(s) {
    const seen = new Set();
    for (const a of s.animals) {
      seen.add(a.id);
      let e = this.animals.get(a.id);
      if (!e) {
        e = { m: M.animal(a.k), ry: 0 };
        this.scene.add(e.m);
        this.animals.set(a.id, e);
      }
      const p = animalPos(a, s.time), q = animalPos(a, s.time + 0.3);
      if (Math.hypot(q.x - p.x, q.z - p.z) > 0.01) e.ry = Math.atan2(q.x - p.x, q.z - p.z);
      e.m.position.set(p.x, p.walking ? Math.abs(Math.sin(this.time * 9 + a.id)) * 0.08 : 0, p.z);
      e.m.rotation.y += angDiff(e.m.rotation.y, e.ry) * 0.15;
      e.m.rotation.z = p.walking ? Math.sin(this.time * 9 + a.id) * 0.05 : 0;
      e.x = p.x; e.z = p.z;
      const h = a.k === 'huhn' ? 0.95 : 1.4;
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
      e.speed += ((local ? (p.m ? 1 : 0) : Math.min(1, v / 3.5)) - e.speed) * Math.min(1, dt * 10);
      if (p.an !== e.an) { e.an = p.an; e.ak = p.ak; e.actT = 0; }
      e.actT = Math.min(1, e.actT + dt / 0.45);
      const fishing = p.ak === 'fish' && p.fishing;
      if (e.held !== p.held) { e.held = p.held; e.m.userData.setHeld(p.held || null); }
      e.m.position.set(e.x, 0, e.z);
      e.m.rotation.y = e.ry;
      const emote = p.emoteUntil > now ? p.emote : null;
      e.m.userData.update(dt, { speed: p.pose ? 0 : e.speed, act: e.actT < 1 || fishing ? e.ak : null, actT: e.actT, pose: p.pose || null, emote, time: this.time });

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

      const top = (HAT_TOP[p.look.hat] || 1.45) - (p.pose ? 0.35 : 0); // Kopf-/Hutoberkante der Figur
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
    this.sun.intensity = (rain ? 1.1 : 2.4) * (0.18 + 0.82 * day);
    this.sun.color.copy(SUN_DAY).lerp(SUN_MOON, night).lerp(SUN_DUSK, dusk * 0.75);
    this.hemi.intensity = 0.3 + 1.0 * day;
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
    windTime.value = this.time;
    this.waterU.t.value = this.time;
    this.syncSeason(s);
    this.syncStatic(s);
    this.syncTiles(s);
    this.syncObjects(s);
    this.syncAnimals(s);
    this.syncNature(s);
    this.syncNpcs(s, dt);
    this.syncGrass(s);
    this.syncPlayers(players, me, dt, !opt.hideNames);
    const info = this.light(s), rain = s.weather === 'rain', snowing = s.weather === 'snow';

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
    this.yaw += angDiff(this.yaw, this.yawT) * Math.min(1, dt * 8);
    const pl = players[me];
    if (opt.orbit) {
      const a = this.time * 0.05;
      this.target.set(-2, 0, 0);
      this.camera.position.set(Math.sin(a) * 30, 15 + Math.sin(this.time * 0.1) * 2, Math.cos(a) * 30);
      this.camera.lookAt(-2, 0.6, 0);
    } else if (opt.preview) {
      const p = opt.preview, d = 3.6 * this.zoom * Math.max(1, 0.8 / this.camera.aspect);
      this.target.set(p.x, 0, p.z);
      this.camera.position.set(p.x + Math.sin(this.yaw) * d, 1.5 + (p.lift || 0) * 0.4, p.z + Math.cos(this.yaw) * d);
      this.camera.lookAt(p.x + Math.cos(this.yaw) * (p.shift || 0), 0.7 - (p.lift || 0), p.z - Math.sin(this.yaw) * (p.shift || 0));
    } else {
      if (pl) {
        this.target.x += (pl.x - this.target.x) * Math.min(1, dt * 6);
        this.target.z += (pl.z - this.target.z) * Math.min(1, dt * 6);
      }
      const portrait = Math.min(1.7, Math.max(1, 1.25 / this.camera.aspect));
      const d = 14.9 * this.zoom * portrait, el = opt.photo ? this.el : 0.83;
      this.camera.position.set(this.target.x + Math.sin(this.yaw) * Math.cos(el) * d, Math.max(0.6, Math.sin(el) * d), this.target.z + Math.cos(this.yaw) * Math.cos(el) * d);
      this.camera.lookAt(this.target.x, 0.6, this.target.z);
    }
    this.sky.position.copy(this.camera.position);
    for (const c of this.clouds) {
      const u = c.userData, a = u.a + this.time * 0.004;
      c.position.set(Math.cos(a) * u.r, u.y, Math.sin(a) * u.r);
    }
    this.sun.position.copy(this.target).addScaledVector(this.sunDir, 35);
    this.sun.target.position.copy(this.target);
    this.lamp.position.set(this.target.x, 3.2, this.target.z + 1.2);

    // Laternen beleuchten nachts ihre Umgebung (nur die nächsten, Grafik "Hoch")
    if (this.lanternLights.length) {
      const near = (this.lanterns || []).map(e => [e, (e.x - this.target.x) ** 2 + (e.z - this.target.z) ** 2]).sort((a, b) => a[1] - b[1]);
      this.lanternLights.forEach((l, i) => {
        const e = near[i]?.[0];
        l.intensity = e ? info.night * 5 : 0;
        if (e) l.position.set(e.x, 1.5, e.z);
      });
    }

    // kleine Effekte: Kaminrauch, Sprinkler, Funkeln über reifen Pflanzen, Regentropfen
    if (this.time > this.nextFx) {
      this.nextFx = this.time + 0.12;
      if (Math.random() < 0.35) this.burst(1.3 + (Math.random() - 0.5) * 0.2, -11, 'smoke', 3.9);
      for (const e of this.sprinklers || []) if (Math.random() < 0.6) this.burst(e.x, e.z, 'drop', 0.4);
      for (const e of this.digM?.values() || []) if (Math.random() < 0.15) this.burst(e.x + (Math.random() - 0.5) * 0.3, e.z + (Math.random() - 0.5) * 0.3, 'sparkle', 0.15);
      if (this.ripe.length && Math.random() < 0.7) { const e = this.ripe[Math.floor(Math.random() * this.ripe.length)]; this.burst(e.x + (Math.random() - 0.5) * 0.5, e.z + (Math.random() - 0.5) * 0.5, 'sparkle', 0.4 + Math.random() * 0.5); }
      if (rain) for (let i = 0; i < 4; i++) this.burst(this.target.x + (Math.random() - 0.5) * 16, this.target.z + (Math.random() - 0.5) * 12, 'splash', 0.03);
      // Jahreszeit: Blütenblätter im Frühling, bunte Blätter im Herbst
      const drift = { spring: 'petal', autumn: 'fall' }[this.season];
      if (drift && !rain && Math.random() < 0.5) this.burst(this.target.x + (Math.random() - 0.5) * 18, this.target.z + (Math.random() - 0.5) * 14, drift, 4 + Math.random() * 2);
    }
    this.updateParticles(dt);
    this.updateCritters(info, rain);

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
    if (opt.bobber) this.bobber.position.set(opt.bobber.x, opt.bobber.bite ? -0.02 + Math.sin(this.time * 30) * 0.05 : 0.1 + Math.sin(this.time * 3) * 0.03, opt.bobber.z);

    this.draw();

    // Beschriftungen aufräumen
    for (const [id, t] of this.tags) {
      if (!t.used) { t.el.remove(); this.tags.delete(id); } else t.used = false;
    }
    this.floaters = this.floaters.filter(f => {
      f.age += dt;
      if (f.age < 0) return true;
      const p = this.project(f.x + f.vx * f.age + Math.sin(f.age * 5) * 0.08 * (f.vx ? 1 : 0), f.y + f.age * 1.2, f.z);
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
