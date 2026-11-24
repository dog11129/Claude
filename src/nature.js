// Natur aus Blender (assets/models/nature.glb): Bäume, Palmen, Felsen, Obst, Muscheln, Unkraut, Grabstellen.
// Gleiche Aufrufe wie die alten Modelle in models.js; fehlt die Datei, bleiben die alten Modelle.
import { hasModel, model, part } from './assets.js';
import * as M from './models.js';
import { placeable as oldPlaceable } from './plants.js';

// Obst sitzt an festen Stellen der Krone (Winkel, Höhe) und schaukelt mit ihr im Wind
const FRUIT_AT = [[0.3, 0.1], [1.5, -0.1], [2.6, 0.25], [3.7, -0.05], [4.9, 0.2], [5.7, -0.2], [4.3, 0.45]];

function hang(parent, kind, x, y, z, s = 1) {
  const f = model('fruit_' + kind);
  if (!f) return;
  f.position.set(x, y, z);
  f.rotation.y = x * 3 + z;
  f.scale.setScalar(s);
  parent.add(f);
}

export function wild(kind, season, left, fruit, ready) {
  if (!hasModel('tree_summer')) return M.wild(kind, season, left, fruit, ready);
  if (kind === 'rock') return model(left > 0 ? 'rock' : 'rock_small');
  const g = model(kind === 'palm' ? 'palm' : 'tree_' + season);
  if (kind === 'palm') {
    const f = part(g, 'fronds') || g;
    if (ready) for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.4; hang(f, 'kokosnuss', Math.cos(a) * 0.17, -0.16, Math.sin(a) * 0.17); }
  } else if (ready && season !== 'winter') {
    // Krone dreht um (0, 1.0, 0); ihr Mittelpunkt liegt auf 1.62
    const c = part(g, 'crown') || g, cy = c === g ? 0 : c.position.y;
    for (const [a, e] of FRUIT_AT) {
      const R = 1.02;
      hang(c, fruit, Math.cos(a) * Math.cos(e) * R, 1.62 + Math.sin(e) * R * 0.8 - cy, Math.sin(a) * Math.cos(e) * R);
    }
  }
  if (left <= 0) { const w = model('woodchips'); if (w) g.add(w); }
  return g;
}

export const shell = kind => model('shell_' + kind) || M.shell(kind);
export const weed = () => model('weed') || M.weed();
export const digMark = () => model('dig') || M.digMark();
// Frucht einzeln (z. B. für Obstbäume im Garten)
export const fruitModel = kind => model('fruit_' + kind);

// Beet-Pflanzen (assets/models/crops.glb): Stufe 0 = Keimling, dann crop_<art>_<stufe>
const GRASSY = ['weizen', 'mais'];
export function cropModel(k, st, fallback) {
  const name = st === 0 ? (GRASSY.includes(k) ? 'sprout_grass' : 'sprout') : `crop_${k}_${st}`;
  return model(name) || fallback(k, st);
}
// Wind-Material auf alle Teile legen, deren Höhe im Modell = Höhe über dem Boden ist (keine gedrehten Unterteile)
export function windify(m, mat) {
  if (!m.userData.asset) { m.children[0].material = mat; return; }
  let moved = false; // Unterteile mit eigenem Drehpunkt (z. B. geneigter Sonnenblumenkopf): lieber ohne Wind
  m.traverse(o => { if (o !== m && (o.position.lengthSq() > 1e-6 || o.rotation.x || o.rotation.y || o.rotation.z)) moved = true; });
  if (moved) return;
  m.traverse(o => { if (o.isMesh && !o.name.includes('__glow')) o.material = mat; });
}

// Platzierbares (assets/models/place.glb). Gartenbäume teilen sich ein Modell, das Obst hängt das Spiel in die Krone.
const GARDEN_FRUIT = { apfelbaum: 'apfel', orangenbaum: 'orange', pfirsichbaum: 'pfirsich', kirschenbaum: 'kirsche', birnbaum: 'birne', mangobaum: 'mango' };
const PTREE_AT = [[0.1, 0.1], [0.9, -0.15], [-0.7, 0.05], [1.8, 0.2], [-1.6, -0.1], [0.4, 0.6], [-0.3, -0.35], [2.6, -0.05], [3.6, 0.3], [-0.9, 0.55]];
export function placeable(k, ready, fruit) {
  if (GARDEN_FRUIT[k] && hasModel('ptree')) {
    const g = model(ready ? 'ptree' : 'ptree_flower');
    if (ready) {
      const c = part(g, 'crown') || g, cy = c === g ? 0 : c.position.y;
      for (const [a, e] of PTREE_AT) hang(c, fruit || GARDEN_FRUIT[k], Math.sin(a) * Math.cos(e) * 0.6, 1.45 + Math.sin(e) * 0.6 * 0.85 - cy, Math.cos(a) * Math.cos(e) * 0.6, 0.62);
    }
    return g;
  }
  if (k === 'bananenbaum' && hasModel('banana')) {
    const g = model('banana');
    if (ready) { const l = part(g, 'leaves') || g, ly = l === g ? 0 : l.position.y; hang(l, 'banane', 0.02, 1.2 - ly, 0.16, 1.4); hang(l, 'banane', -0.12, 1.25 - ly, -0.06, 1.2); }
    return g;
  }
  return model(k) || oldPlaceable(k, ready);
}

// Landschaft: Wald auf den Klippen, Grasbüschel, Wildblumen, Teichsteine – gleiche Verteilung wie vorher,
// jetzt aus Blender-Modellen als InstancedMesh (ein Draw-Call pro Modell)
import * as THREE from '../vendor/three.module.min.js';
import { flatGeometry, OUTDOOR } from './assets.js';
export function scenery(isFree, h = () => 0, season = 'summer', plateau = () => false) {
  if (!hasModel('pine') || !hasModel('ftree_' + season)) return M.scenery(isFree, h, season, plateau);
  const snow = season === 'winter', L = {}, add = (name, x, y, z, s, ry = 0, sy = s) =>
    (L[name] ||= []).push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(s, sy, s)));
  let seed = 7, parts = 0;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 1400 && parts < 900; i++) {
    const x = (rand() - 0.5) * 50, z = -14 - rand() * 12;
    if (!plateau(x, z) || !plateau(x, z + 1.4) || Math.abs(x - (6.6 + 2.6 * Math.sin(z * 0.2 + 0.5))) < 1.8) continue;
    const s = 0.85 + rand() * 0.6, y = h(x, z) - 0.05, k = rand(), ry = rand() * 6.28;
    if (k < 0.45) { add('pine', x, y, z, s, ry); parts += 4; }
    else if (k < 0.9) { add('ftree_' + season, x, y, z, s, ry); parts += 4; }
    else { add('bush', x, y, z, s * 0.9, ry); parts += 1; }
  }
  for (let i = 0; i < (snow ? 0 : 700); i++) {
    const x = (rand() - 0.5) * 44, z = (rand() - 0.5) * 40;
    if (!isFree(Math.round(x), Math.round(z))) continue;
    if (rand() < 0.8) add('tuft', x, 0, z, 0.9 + rand() * 0.4, rand() * 6.28);
    else add('wildflower_' + Math.floor(rand() * 4), x, 0, z, 1, rand() * 6.28);
  }
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; add('pondstone', -15 + Math.cos(a) * 2.45, 0.02, -4 + Math.sin(a) * 2.45, 0.85 + (i % 3) * 0.25, a); }
  add('lilypad', -14.2, -0.13, -3.4, 1); add('lilypad', -15.8, -0.13, -4.6, 0.85, 1.3);
  const g = new THREE.Group();
  for (const [name, mats] of Object.entries(L)) {
    const geo = flatGeometry(name);
    if (!geo) continue;
    const im = new THREE.InstancedMesh(geo, OUTDOOR, mats.length);
    mats.forEach((m, i) => im.setMatrixAt(i, m));
    im.castShadow = !/tuft|wildflower|lilypad/.test(name);
    im.receiveShadow = true;
    im.computeBoundingSphere();
    g.add(im);
  }
  g.userData.asset = 'scenery';
  return g;
}
