// Eigene Bilder für jeden Gegenstand: das 3D-Modell (Möbel, Deko, Pflanze, Fisch, Insekt …) wird einmal
// klein gerendert und als Bild gemerkt. Bis das Bild fertig ist, steht das Emoji da.
import * as THREE from '../vendor/three.module.min.js';
import { ITEMS, PLACE, CROPS } from './data.js';
import { FURNITURE } from './furni-data.js';
import { model as asset, snow } from './assets.js';
import { makeFurniture } from './furniture.js';
import { placeable, cropModel, fruitModel, shell } from './nature.js';
import { crop } from './plants.js';
import { groundItem, GROUND_KINDS } from './models.js';
import { itemModel } from './itemmodels.js';

const SIZE = 112;
const urls = new Map();
// Eigene Bilder (assets/icons/<id>.webp, Liste in assets/icons/index.json) haben Vorrang vor den gerenderten
const FILES = new Set();
export async function loadIconFiles() {
  try {
    const r = await fetch(new URL('../assets/icons/index.json', import.meta.url));
    if (r.ok) for (const id of await r.json()) if (typeof id === 'string') { FILES.add(id); urls.set(id, new URL(`../assets/icons/${id}.webp`, import.meta.url).href); }
  } catch { /* ohne eigene Bilder */ }
}
export const iconFile = id => FILES.has(id);
let R = null, scene, cam;

function setup() {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  R = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: true, preserveDrawingBuffer: true });
  R.setPixelRatio(1);
  R.setSize(SIZE, SIZE, false);
  R.outputColorSpace = THREE.SRGBColorSpace;
  R.setClearColor(0x000000, 0);
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff8ee, 0xb8c8a8, 2.1));
  const d = new THREE.DirectionalLight(0xffffff, 1.6);
  d.position.set(2, 4, 5);
  scene.add(d);
  cam = new THREE.PerspectiveCamera(26, 1, 0.05, 50);
}

// Welches 3D-Modell zeigt den Gegenstand?
const MAT_ASSET = { holz: 'ground_holz', ast: 'ground_ast', stein: 'ground_stein', lehm: 'ground_lehm', eisen: 'ground_eisen', flaschenpost: 'ground_bottle' };
export function modelFor(id) { // auch für tools/gallery.html
  const it = ITEMS[id];
  if (!it) return null;
  const own = itemModel(id);
  if (own) return own;
  if (it.furn) return asset(id) || makeFurniture(id);
  if (it.place && PLACE[id]) return placeable(id, true);
  if (CROPS[id]) return cropModel(id, 3, crop);
  if (fruitModel(id)) return fruitModel(id);
  if (['herzmuschel', 'jakobsmuschel', 'kauri', 'koralle', 'sanddollar', 'sternsplitter'].includes(id)) return shell(id);
  if (MAT_ASSET[id]) return asset(MAT_ASSET[id]) || (GROUND_KINDS.includes(id) ? groundItem(id) : null);
  if (id === 'unkraut') return asset('weed') || null;
  if (GROUND_KINDS.includes(id)) return groundItem(id);
  return null;
}

function render(id) {
  const m = modelFor(id);
  if (!m) return null;
  if (!R) setup();
  const holder = new THREE.Group();
  holder.add(m);
  // Möbel und Deko etwas gedreht zeigen, Tiere von der Seite
  const side = !!itemModel(id) && !id.startsWith('s_');
  holder.rotation.y = side ? 0.25 : -0.55;
  scene.add(holder);
  holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(holder), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
  const r = Math.max(size.x, size.y, size.z * 0.8) * 0.62 || 1;
  const dist = r / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * 1.08;
  cam.position.set(mid.x, mid.y + dist * 0.28, mid.z + dist * 0.96);
  cam.lookAt(mid);
  const sn = snow.value;
  snow.value = 0;
  R.render(scene, cam);
  snow.value = sn;
  scene.remove(holder);
  return R.domElement.toDataURL('image/png');
}

// HTML für ein Gegenstandsbild (Emoji als Platzhalter, bis das Bild gerendert ist)
export function itemIcon(id, cls = '') {
  const u = urls.get(id), it = ITEMS[id];
  return u ? `<img class="iic ${cls}" src="${u}" alt="${it?.icon || ''}" draggable="false">` : `<span class="iic emo ${cls}" data-icon="${id}">${it?.icon || '❔'}</span>`;
}
export const iconUrl = id => urls.get(id) || null;

// Platzhalter in einem Bereich nach und nach gegen Bilder tauschen (ein paar pro Bild, damit nichts ruckelt)
const queue = new Set();
let busy = false;
export function fillIcons(root) {
  if (!root) return;
  for (const el of root.querySelectorAll('[data-icon]')) queue.add(el);
  if (!busy && queue.size) { busy = true; requestAnimationFrame(work); }
}
function work() {
  const t0 = performance.now();
  for (const el of queue) {
    queue.delete(el);
    const id = el.dataset.icon;
    if (!el.isConnected || !id) continue;
    let u = urls.get(id);
    if (u === undefined) {
      try { u = render(id); } catch (e) { console.warn('Icon', id, e); u = null; }
      urls.set(id, u);
    }
    if (u) {
      const img = document.createElement('img');
      img.className = el.className.replace('emo', '').trim();
      img.src = u;
      img.alt = el.textContent;
      img.draggable = false;
      el.replaceWith(img);
    } else el.removeAttribute('data-icon');
    if (performance.now() - t0 > 14) break;
  }
  if (queue.size) requestAnimationFrame(work); else busy = false;
}
