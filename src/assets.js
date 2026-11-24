// 3D-Modelle aus Blender (assets/models/*.glb, Draco-komprimiert): laden, vorbereiten, kopieren, animieren.
// Jedes Modell ist ein Wurzel-Knoten der Datei (Name = Modell-Name). Teile mit "__glow" leuchten nachts,
// Keyframe-Animationen aus Blender laufen in Schleife; Uhrzeiger & Co. werden vom Spiel gedreht.
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { DRACOLoader } from '../vendor/loaders/DRACOLoader.js';
import { MAT, cozy } from './models.js';

const LIB = new Map();
const mixers = new Set();

// Außen-Material: wie MAT, dazu Schnee auf allem, was nach oben zeigt (Winter)
export const snow = { value: 0 };
export const OUTDOOR = new THREE.MeshLambertMaterial({ vertexColors: true });
OUTDOOR.onBeforeCompile = sh => {
  cozy(sh);
  sh.uniforms.snowAmt = snow;
  sh.fragmentShader = 'uniform float snowAmt;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>',
    `#include <emissivemap_fragment>
    float snowUp = smoothstep(0.5, 0.85, inverseTransformDirection(normal, viewMatrix).y);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.96, 0.98, 1.0), snowUp * snowAmt);`);
};
OUTDOOR.customProgramCacheKey = () => 'cozy-snow';

// Leuchtteile behalten ihre Farbe aus Blender (Flammen orange, Lampen gelb); die Welt dreht nachts die Helligkeit hoch
export const GLOW_VC = new THREE.MeshBasicMaterial({ vertexColors: true });

export async function loadAssets(files, onProgress) {
  const draco = new DRACOLoader().setDecoderPath(new URL('../vendor/draco/', import.meta.url).href);
  const loader = new GLTFLoader().setDRACOLoader(draco);
  let done = 0;
  await Promise.all(files.map(f => loader.loadAsync(new URL(`../assets/models/${f}.glb`, import.meta.url).href)
    .then(g => register(g, f))
    .catch(e => console.warn('Modelle fehlen:', f, e))
    .finally(() => onProgress?.(++done / files.length))));
  draco.dispose();
}

function register(gltf, file) {
  for (const root of [...gltf.scene.children]) {
    const names = new Set();
    root.traverse(o => {
      names.add(o.name);
      if (!o.isMesh) return;
      const glow = o.name.includes('__glow') || o.parent?.name?.includes('__glow');
      o.material = glow ? GLOW_VC : OUTDOOR;
      o.castShadow = !glow;
      o.receiveShadow = !glow;
      o.geometry.computeBoundingSphere();
    });
    const clips = gltf.animations.filter(c => c.tracks.length && c.tracks.every(t => names.has(t.name.split('.')[0])));
    root.position.set(0, 0, 0);
    LIB.set(root.name, { root, clips, file });
  }
}

export const hasModel = name => LIB.has(name);
export const modelNames = () => [...LIB.keys()];

// Kopie eines Modells (Geometrie wird geteilt); Animationen starten mit zufälligem Versatz
export function model(name) {
  const e = LIB.get(name);
  if (!e) return null;
  const g = e.root.clone(true);
  g.userData.asset = name;
  if (e.clips.length) {
    const mixer = new THREE.AnimationMixer(g);
    for (const c of e.clips) { const a = mixer.clipAction(c); a.play(); a.time = Math.random() * c.duration; }
    g.userData.mixer = mixer;
    mixers.add(g);
  }
  return g;
}
export const part = (g, name) => g.getObjectByName(`${g.userData.asset}_${name}`);

// Pro Bild: Animationen weiterlaufen lassen (entfernte Modelle fallen heraus)
export function tickAssets(dt) {
  for (const g of mixers) {
    if (!g.parent) { mixers.delete(g); continue; }
    g.userData.mixer.update(dt);
  }
}

// ---------- Figuren-Teile (characters.glb) ----------
import { mergeGeometries } from '../vendor/loaders/BufferGeometryUtils.js';
// Geometrie eines Teils (geteilt – nicht verändern, sondern klonen)
export const geometryOf = name => { const e = LIB.get(name); return e?.root.isMesh ? e.root.geometry : null; };

// Schlüsselfarben aus Blender gegen die gewählten Farben tauschen (alles linear):
// Magenta = Haut, Cyan = Haare, Gelb = Oberteil, Blau = Hose, Rot = Schuhe, Grün = Fell; abgedunkelte Schlüssel behalten ihre Helligkeit,
// mit Weiß gemischtes Grün (helles Fell) bleibt gemischt.
const lin = c => (c ? new THREE.Color(c) : null);
function recolor(geo, cols) {
  const K = { skin: lin(cols.skin), hair: lin(cols.hairColor), top: lin(cols.topColor), bottom: lin(cols.bottomColor), shoes: lin(cols.shoes), pet: lin(cols.fur) };
  const g = geo.clone(), a = g.getAttribute('color');
  if (!a) return g;
  const lo = 0.02, hi = 0.15, near = (x, y) => Math.abs(x - y) < 0.03, out = new THREE.Color();
  for (let i = 0; i < a.count; i++) {
    const r = a.getX(i), gg = a.getY(i), b = a.getZ(i);
    let c = null, f = 1;
    if (r > hi && gg < lo && b < lo) { c = K.shoes; f = r; }
    else if (b > hi && r < lo && gg < lo) { c = K.bottom; f = b; }
    else if (gg > hi && r < lo && b < lo) { c = K.pet; f = gg; }
    else if (r > hi && b < lo && near(r, gg)) { c = K.top; f = r; }
    else if (r > hi && gg < lo && near(r, b)) { c = K.skin; f = r; }
    else if (gg > hi && r < lo && near(gg, b)) { c = K.hair; f = gg; }
    else if (K.pet && gg > 0.97 && near(r, b) && r > hi && r < 0.95) { out.copy(K.pet).lerp(new THREE.Color(1, 1, 1), r); a.setXYZ(i, out.r, out.g, out.b); continue; }
    if (!c) continue;
    a.setXYZ(i, c.r * f, c.g * f, c.b * f);
  }
  a.needsUpdate = true;
  return g;
}
const KEYED = new Map();
// mehrere Teile zu EINER Geometrie zusammenfügen und umfärben (zwischengespeichert)
export function keyedGeometry(names, cols, cacheKey) {
  if (KEYED.has(cacheKey)) return KEYED.get(cacheKey);
  const parts = names.map(geometryOf).filter(Boolean);
  if (!parts.length) return null;
  const geos = parts.map(g => recolor(g, cols));
  const geo = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
  KEYED.set(cacheKey, geo);
  return geo;
}

// Ganzes Modell (alle Teile außer Leuchtteilen) zu EINER Geometrie flach rechnen – für viele Kopien als InstancedMesh
const FLAT = new Map();
export function flatGeometry(name) {
  if (FLAT.has(name)) return FLAT.get(name);
  const e = LIB.get(name);
  if (!e) return null;
  e.root.updateMatrixWorld(true);
  const inv = e.root.matrixWorld.clone().invert(), geos = [];
  e.root.traverse(o => { if (o.isMesh && !o.name.includes('__glow')) geos.push(o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld))); });
  const g = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
  FLAT.set(name, g);
  return g;
}

// ---------- Texturen aus Blender (assets/tex/*.webp, kachelbar) ----------
const TEXS = new Map();
export async function loadTextures(names) {
  const loader = new THREE.TextureLoader();
  await Promise.all(names.map(n => loader.loadAsync(new URL(`../assets/tex/${n}.webp`, import.meta.url).href).then(t => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    TEXS.set(n, t);
  }).catch(e => console.warn('Textur fehlt:', n, e))));
}
// Kopie mit eigener Wiederholung (teilt das Bild)
export function tex(name, rx = 1, ry = 1) {
  const t = TEXS.get(name);
  if (!t) return null;
  const c = t.clone();
  c.repeat.set(rx, ry);
  c.needsUpdate = true;
  return c;
}
