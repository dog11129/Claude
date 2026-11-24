// 3D-Modelle aus Blender (assets/models/*.glb, Draco-komprimiert): laden, vorbereiten, kopieren, animieren.
// Jedes Modell ist ein Wurzel-Knoten der Datei (Name = Modell-Name). Teile mit "__glow" leuchten nachts,
// Keyframe-Animationen aus Blender laufen in Schleife; Uhrzeiger & Co. werden vom Spiel gedreht.
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { DRACOLoader } from '../vendor/loaders/DRACOLoader.js';
import { MAT, GLOW, cozy } from './models.js';

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
      o.material = glow ? GLOW : OUTDOOR;
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
