// Die 3D-Darstellung: baut aus dem Spielzustand die Szene und hält sie aktuell.
import * as THREE from 'three';
import * as M from './models.js';
import { FIELDS, PENS, PLACE, POND, ANIMALS, ITEMS } from './data.js';
import { stage, animalPos, buildingAt, inPond } from './state.js';

const SKY_DAY = new THREE.Color(0x9fd9ff), SKY_SET = new THREE.Color(0xffb38a), SKY_NIGHT = new THREE.Color(0x1f2d55), SKY_RAIN = new THREE.Color(0x9aa6b5);
const GLOW_DAY = new THREE.Color(0xd8cfa8), GLOW_NIGHT = new THREE.Color(0xffd65a);
const SUN_DAY = new THREE.Color(0xfff6e8), SUN_DUSK = new THREE.Color(0xff9a50), SUN_MOON = new THREE.Color(0x7f9cff);
const HEMI_DAY = new THREE.Color(0xe8f6ff), HEMI_NIGHT = new THREE.Color(0x5a6aa8), GROUND_DAY = new THREE.Color(0x6c9a50), GROUND_NIGHT = new THREE.Color(0x2a3550);
const SOIL_DRY = new THREE.Color(0xa0714a), SOIL_WET = new THREE.Color(0x5c3b25);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export class World {
  constructor(canvas, labels) {
    this.labels = labels;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: devicePixelRatio < 2, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    const s = this.scene = new THREE.Scene();
    s.fog = new THREE.Fog(SKY_DAY.clone(), 32, 70);
    s.background = SKY_DAY.clone();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.5, 200);
    this.target = new THREE.Vector3(0, 0, -4);
    this.zoom = 1;

    this.hemi = new THREE.HemisphereLight(0xe8f6ff, 0x6c9a50, 1.3);
    this.sun = new THREE.DirectionalLight(0xffffff, 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 70 });
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.03;
    this.lamp = new THREE.PointLight(0xffc878, 0, 9, 1.6);
    s.add(this.hemi, this.sun, this.sun.target, this.lamp);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshLambertMaterial({ color: 0x8fd06a }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    s.add(ground);
    const pathMat = new THREE.MeshLambertMaterial({ color: 0xe9d7a6 });
    for (const [x, z, w, d] of [[0, -6.5, 1.6, 4], [0, -3.5, 9, 1.4], [-4.5, -7.8, 1.2, 1.6], [3, -7, 1.2, 1.2], [6, -3.5, 3, 1.2], [5, 2, 1.4, 10], [6.5, 7.5, 3, 1.4]]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), pathMat);
      p.rotation.x = -Math.PI / 2;
      p.position.set(x, 0.01, z);
      p.receiveShadow = true;
      s.add(p);
    }
    const pond = new THREE.Mesh(new THREE.CylinderGeometry(POND.r + 0.25, POND.r + 0.25, 0.04, 28), new THREE.MeshLambertMaterial({ color: 0x5bb6f0 }));
    pond.position.set(POND.cx, 0.02, POND.cz);
    s.add(pond);
    const pondEdge = new THREE.Mesh(new THREE.CylinderGeometry(POND.r + 0.55, POND.r + 0.55, 0.03, 28), new THREE.MeshLambertMaterial({ color: 0xd9c99a }));
    pondEdge.position.set(POND.cx, 0.012, POND.cz);
    s.add(pondEdge);
    this.water = pond;

    const isFree = (x, z) => !buildingAt(x, z) && !inPond(x, z) && !(x >= -14 && x <= 4 && z >= -5 && z <= 11) && Math.abs(x) > 1 && !(x > 5 && x < 14 && ((z > -5 && z < 0) || (z > 7 && z < 14)));
    s.add(M.scenery(isFree));
    const pen = p => [p.cx - p.rx - 0.6, p.cz - p.rz - 0.5, p.cx + p.rx + 0.6, p.cz + p.rz + 0.5];
    const cp = pen(PENS.coop), bp = pen(PENS.barn);
    s.add(M.fences([[...cp, cp[1]], [...bp, bp[1]]]));
    for (const [x, z] of [[PENS.coop.cx + 2, PENS.coop.cz - 1.2], [PENS.barn.cx - 3, PENS.barn.cz + 1.5]]) {
      const t = M.model([M.box(1.2, 0.3, 0.4, 0x9c6b3f, x, 0.15, z), M.box(1.1, 0.05, 0.3, 0x9ccf5a, x, 0.3, z)]);
      s.add(t);
    }

    const soilGeo = new THREE.BoxGeometry(0.96, 0.08, 0.96);
    this.soil = new THREE.InstancedMesh(soilGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), 400);
    this.soil.receiveShadow = true;
    this.soil.count = 0;
    s.add(this.soil);
    const hlGeo = new THREE.PlaneGeometry(0.94, 0.94);
    hlGeo.rotateX(-Math.PI / 2);
    this.hl = new THREE.InstancedMesh(hlGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false }), 25);
    this.hl.count = 0;
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
    this.time = 0;

    const n = 900, pos = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i++) pos[i] = (Math.random() - 0.5) * 30;
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rain = new THREE.Points(rg, new THREE.PointsMaterial({ color: 0xbfe3ff, size: 0.09, transparent: true, opacity: 0.8 }));
    this.rain.visible = false;
    s.add(this.rain);

    this.bobber = M.model([M.ball(0.1, 0xff4d4d, 0, 0.05, 0), M.ball(0.1, 0xffffff, 0, -0.03, 0, 1, 0.5, 1)], [], false);
    this.bobber.visible = false;
    s.add(this.bobber);
    this.resize();
  }

  setShadows(on) {
    this.renderer.shadowMap.enabled = on;
    this.sun.castShadow = on;
    this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.w = w; this.h = h;
  }

  // ---------- HTML-Beschriftungen über 3D-Objekten ----------
  project(x, y, z) {
    const v = this.v.set(x, y, z).project(this.camera);
    return v.z > 1 ? null : [(v.x + 1) / 2 * this.w, (1 - v.y) / 2 * this.h];
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
  float(x, z, txt, y = 1.2) {
    const el = document.createElement('div');
    el.className = 'floater';
    el.textContent = txt;
    this.labels.appendChild(el);
    this.floaters.push({ el, x, y, z, age: 0 });
  }

  // ---------- statische Teile, die sich mit Upgrades ändern ----------
  syncStatic(s) {
    const sig = `${s.up.house}|${s.up.coop}|${s.up.barn}`;
    if (this.static.sig !== sig) {
      if (this.static.group) this.scene.remove(this.static.group);
      const g = new THREE.Group();
      g.add(M.building('house', s.up.house), M.building('coop', s.up.coop), M.building('barn', s.up.barn), M.building('market', 1), M.building('bin', 1), M.building('board', 1));
      this.scene.add(g);
      this.static = { ...this.static, sig, group: g };
    }
    if (this.static.field !== s.up.field) {
      if (this.static.fieldMesh) this.scene.remove(this.static.fieldMesh);
      const [x0, z0, x1, z1] = FIELDS[s.up.field], c = 0x8a5a3a, p = [];
      const w = x1 - x0 + 1, d = z1 - z0 + 1, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      p.push(M.box(w + 0.2, 0.12, 0.1, c, cx, 0.06, z0 - 0.55), M.box(w + 0.2, 0.12, 0.1, c, cx, 0.06, z1 + 0.55), M.box(0.1, 0.12, d + 0.2, c, x0 - 0.55, 0.06, cz), M.box(0.1, 0.12, d + 0.2, c, x1 + 0.55, 0.06, cz));
      p.push(M.box(w + 0.1, 0.01, d + 0.1, 0x7fbf5c, cx, 0.005, cz));
      this.static.fieldMesh = M.model(p, [], false);
      this.static.field = s.up.field;
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
        this.m4.makeTranslation(x, 0.04, z);
        this.soil.setMatrixAt(i, this.m4);
        this.soil.setColorAt(i, t.w > 0 ? SOIL_WET : SOIL_DRY);
        i++;
      }
      this.soil.count = i;
      this.soil.instanceMatrix.needsUpdate = true;
      if (this.soil.instanceColor) this.soil.instanceColor.needsUpdate = true;
    }
    const seen = new Set();
    for (const [k, t] of Object.entries(s.tiles)) {
      if (!t.c) continue;
      const st = stage(t.c), sig2 = t.c.k + st;
      seen.add(k);
      let e = this.crops.get(k);
      if (e && e.sig !== sig2) { this.scene.remove(e.m); e = null; }
      if (!e) {
        const [x, z] = k.split(',').map(Number);
        const m = M.crop(t.c.k, st);
        m.position.set(x, 0.08, z);
        m.rotation.y = ((x * 7 + z * 13) % 4) * 0.4;
        this.scene.add(m);
        e = { m, sig: sig2, x, z, born: this.time };
        this.crops.set(k, e);
      }
      const pop = Math.min(1, (this.time - e.born) * 5);
      e.m.scale.setScalar(0.6 + 0.4 * pop + (st === 3 ? Math.sin(this.time * 3 + e.x) * 0.02 : 0));
    }
    for (const [k, e] of this.crops) if (!seen.has(k)) { this.scene.remove(e.m); this.crops.delete(k); }
  }

  syncObjects(s) {
    const seen = new Set();
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
        this.scene.add(m);
        e = { m, sig, x, z };
        this.objs.set(k, e);
      }
      if (p.kind === 'machine') {
        e.m.scale.y = o.n > 0 ? 1 + Math.sin(this.time * 10) * 0.03 : 1;
        if (o.o > 0) this.tag('o' + k, `${ITEMS[p.out].icon}<b>${o.o}</b>`, e.x, 1.4, e.z, 'bubble');
        else if (o.n > 0) this.tag('o' + k, `⚙️ ${o.n}`, e.x, 1.4, e.z, 'bubble small');
      }
      if (ready) this.tag('o' + k, ITEMS[p.item].icon, e.x, p.kind === 'producer' && o.k === 'apfelbaum' ? 2.3 : 1.3, e.z, 'bubble');
      if (p.kind === 'sprinkler') e.m.rotation.y = this.time * 2;
    }
    for (const [k, e] of this.objs) if (!seen.has(k)) { this.scene.remove(e.m); this.objs.delete(k); }
  }

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
      e.m.rotation.y += (((e.ry - e.m.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * 0.15;
      const h = a.k === 'huhn' ? 0.95 : 1.4;
      if (a.ready) this.tag('a' + a.id, ITEMS[ANIMALS[a.k].product].icon, p.x, h, p.z, 'bubble');
      else if (a.fed <= 0) this.tag('a' + a.id, '🌿?', p.x, h, p.z, 'bubble small hungry');
    }
    for (const [id, e] of this.animals) if (!seen.has(id)) { this.scene.remove(e.m); this.animals.delete(id); }
  }

  syncPlayers(players, me, dt) {
    const seen = new Set();
    for (const p of Object.values(players)) {
      seen.add(p.id);
      let e = this.players.get(p.id);
      const sig = p.color + p.hat;
      if (e && e.sig !== sig) { this.scene.remove(e.m); e = null; }
      if (!e) {
        e = { m: M.player(p.color, p.hat), sig, x: p.x, z: p.z, ry: p.ry, walk: 0 };
        this.scene.add(e.m);
        this.players.set(p.id, e);
      }
      const local = p.id === me;
      const k = local ? 1 : Math.min(1, dt * 12);
      const moved = Math.hypot(p.x - e.x, p.z - e.z);
      e.x += (p.x - e.x) * k;
      e.z += (p.z - e.z) * k;
      e.ry += (((p.ry - e.ry + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 15);
      const walking = local ? p.m : p.m || moved > 0.02;
      e.walk = walking ? e.walk + dt * 11 : 0;
      e.m.position.set(e.x, 0, e.z);
      e.m.rotation.y = e.ry;
      const { body, head } = e.m.userData;
      const bob = Math.abs(Math.sin(e.walk)) * 0.07, hop = p.hop ? Math.sin(Math.min(1, p.hop) * Math.PI) * 0.15 : 0;
      body.position.y = bob + hop;
      head.position.y = 1.0 + bob * 1.2 + hop;
      body.rotation.z = Math.sin(e.walk) * 0.06;
      const now = performance.now();
      this.tag('pn' + p.id, esc(p.name), e.x, 1.75, e.z, 'name' + (local ? ' me' : ''));
      if (p.chatUntil > now) this.tag('pc' + p.id, esc(p.chat), e.x, 2.15, e.z, 'chat');
      if (p.emoteUntil > now) this.tag('pe' + p.id, p.emote, e.x, p.chatUntil > now ? 2.9 : 2.3, e.z, 'emote');
    }
    for (const [id, e] of this.players) if (!seen.has(id)) { this.scene.remove(e.m); this.players.delete(id); }
  }

  light(s) {
    const hour = 6 + s.dayTime * 18;
    const day = smooth(4.8, 6.8, hour) * (1 - smooth(17.5, 21, hour));
    const dusk = Math.max(1 - smooth(6, 8, hour), smooth(16.5, 18.5, hour) * (1 - smooth(19.5, 21.5, hour)));
    const night = 1 - day;
    const rain = s.weather === 'rain';
    const sky = SKY_NIGHT.clone().lerp(SKY_DAY, day).lerp(SKY_SET, dusk * 0.6);
    if (rain) sky.lerp(SKY_RAIN, 0.55 * (0.3 + day * 0.7));
    this.scene.background.copy(sky);
    this.scene.fog.color.copy(sky);
    this.sun.intensity = (rain ? 1.1 : 2.3) * (0.18 + 0.82 * day);
    this.sun.color.copy(SUN_DAY).lerp(SUN_MOON, night).lerp(SUN_DUSK, dusk * 0.75);
    this.hemi.intensity = 0.3 + 1.0 * day;
    this.hemi.color.copy(HEMI_DAY).lerp(HEMI_NIGHT, night);
    this.hemi.groundColor.copy(GROUND_DAY).lerp(GROUND_NIGHT, night);
    this.lamp.intensity = night * 14;
    const a = Math.min(1, Math.max(0, (hour - 6) / 14)) * Math.PI;
    this.sunDir = new THREE.Vector3(-Math.cos(a) * 0.8, 1.1, 0.6).normalize();
    M.GLOW.color.copy(GLOW_DAY).lerp(GLOW_NIGHT, Math.min(1, night * 1.5));
    return { hour, night };
  }

  render(s, players, me, dt, opt = {}) {
    this.time += dt;
    this.syncStatic(s);
    this.syncTiles(s);
    this.syncObjects(s);
    this.syncAnimals(s);
    this.syncPlayers(players, me, dt);
    const info = this.light(s);

    const tiles = opt.tiles || [];
    this.hl.count = Math.min(tiles.length, 25);
    for (let i = 0; i < this.hl.count; i++) {
      this.m4.makeTranslation(tiles[i][0], 0.1, tiles[i][1]);
      this.hl.setMatrixAt(i, this.m4);
    }
    this.hl.instanceMatrix.needsUpdate = true;
    this.hl.material.opacity = opt.hlOn ? 0.5 + Math.sin(this.time * 6) * 0.15 : 0.22;

    // Kamera
    const pl = players[me];
    if (opt.orbit) {
      const a = this.time * 0.06;
      this.target.set(-2, 0, 0);
      this.camera.position.set(Math.sin(a) * 26, 17, Math.cos(a) * 26);
    } else if (pl) {
      this.target.x += (pl.x - this.target.x) * Math.min(1, dt * 6);
      this.target.z += (pl.z - this.target.z) * Math.min(1, dt * 6);
      const portrait = Math.min(1.7, Math.max(1, 1.25 / this.camera.aspect));
      const d = this.zoom * portrait;
      this.camera.position.set(this.target.x, this.target.y + 11 * d, this.target.z + 10 * d);
    }
    this.camera.lookAt(this.target.x, 0.6, this.target.z);
    this.sun.position.copy(this.target).addScaledVector(this.sunDir, 30);
    this.sun.target.position.copy(this.target);
    this.lamp.position.set(this.target.x, 3.2, this.target.z + 1.2);

    // Regen
    this.rain.visible = s.weather === 'rain';
    if (this.rain.visible) {
      const a = this.rain.geometry.attributes.position;
      for (let i = 0; i < a.count; i++) {
        let y = a.getY(i) - dt * 14;
        if (y < -1) y += 16;
        a.setY(i, y);
      }
      a.needsUpdate = true;
      this.rain.position.set(this.target.x, 0, this.target.z);
    }
    this.water.material.color.setHSL(0.56, 0.75, 0.55 + Math.sin(this.time * 1.5) * 0.03 - info.night * 0.25);

    // Angel-Schwimmer
    this.bobber.visible = !!opt.bobber;
    if (opt.bobber) this.bobber.position.set(opt.bobber.x, opt.bobber.bite ? -0.05 + Math.sin(this.time * 30) * 0.05 : 0.08 + Math.sin(this.time * 3) * 0.03, opt.bobber.z);

    this.renderer.render(this.scene, this.camera);

    // Beschriftungen aufräumen
    for (const [id, t] of this.tags) {
      if (!t.used) { t.el.remove(); this.tags.delete(id); } else t.used = false;
    }
    this.floaters = this.floaters.filter(f => {
      f.age += dt;
      const p = this.project(f.x, f.y + f.age * 1.2, f.z);
      if (f.age > 1.6 || !p) { f.el.remove(); return false; }
      f.el.style.transform = `translate(${p[0]}px, ${p[1]}px) translate(-50%, -100%)`;
      f.el.style.opacity = Math.min(1, 2.2 - f.age * 1.4);
      return true;
    });
    return info;
  }
}

export const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
