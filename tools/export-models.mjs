// Exportiert alle Platzhalter-Modelle des Spiels (aus Code gebaut) als GLB-Pakete – als Vorlage für schönere
// Modelle in Blender – und schreibt eine Übersicht, was schon ein eigenes Modell oder Icon hat.
//   npm run export-models
// Ergebnis: art/export/{place,furniture,items,crops}.glb, art/export/manifest.json, art/STATUS.md
// Jedes Modell ist ein Wurzel-Objekt mit genau dem Namen, den das Spiel sucht (siehe ART.md).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

globalThis.document ||= { createElement: () => ({ getContext: () => null }) }; // Canvas-Texturen braucht der Export nicht
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const THREE = await import('../vendor/three.module.min.js');
const D = await import('../src/data.js');
const { FURNITURE } = await import('../src/furni-data.js');
const P = await import('../src/plants.js');
const F = await import('../src/furniture.js');
const IM = await import('../src/itemmodels.js');

// ---------- schon vorhandene Blender-Modelle (Wurzel-Namen aus den GLB-Paketen) ----------
function glbRoots(file) {
  const b = readFileSync(file), len = b.readUInt32LE(12), json = JSON.parse(b.subarray(20, 20 + len).toString('utf8'));
  return (json.scenes?.[json.scene || 0]?.nodes || []).map(i => json.nodes[i].name);
}
const HAVE = new Set();
const MODELS = join(ROOT, 'assets/models');
for (const f of readdirSync(MODELS).filter(f => f.endsWith('.glb'))) for (const n of glbRoots(join(MODELS, f))) HAVE.add(n);
const ICONS = new Set(existsSync(join(ROOT, 'assets/icons/index.json')) ? JSON.parse(readFileSync(join(ROOT, 'assets/icons/index.json'), 'utf8')) : []);
const PLACE_ALIAS = { kuerbislaterne: 'lantern_pumpkin', schneemann: 'snowman', herzballon: 'heart_balloon', torte: 'cake', angelpokal: 'pokal', kaeferpokal: 'pokal', apfelbaum: 'ptree', orangenbaum: 'ptree', pfirsichbaum: 'ptree', kirschenbaum: 'ptree', birnbaum: 'ptree', mangobaum: 'ptree', bananenbaum: 'banana', eiernest: 'eiernest_nest' };

// ---------- kleiner GLB-Schreiber (Positionen, Normalen, Vertex-Farben; Leuchtteile heißen __glow) ----------
function glb(models) {
  const json = { asset: { version: '2.0', generator: 'Kuschelinsel export-models' }, scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], accessors: [], bufferViews: [], buffers: [],
    materials: [{ name: 'vertexfarbe', pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 1 } }, { name: 'leuchten', emissiveFactor: [1, 0.9, 0.5], pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 1 } }] };
  const chunks = [];
  let off = 0;
  const view = (arr, target) => {
    const buf = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength), pad = (4 - (buf.length % 4)) % 4;
    json.bufferViews.push({ buffer: 0, byteOffset: off, byteLength: buf.length, ...(target ? { target } : {}) });
    chunks.push(buf, Buffer.alloc(pad));
    off += buf.length + pad;
    return json.bufferViews.length - 1;
  };
  const acc = (arr, type, min, max) => { json.accessors.push({ bufferView: view(arr, 34962), componentType: 5126, count: arr.length / (type === 'VEC3' ? 3 : 4), type, ...(min ? { min, max } : {}) }); return json.accessors.length - 1; };
  for (const [name, group] of models) {
    group.updateMatrixWorld(true);
    const kids = [];
    group.traverse(o => {
      if (!o.isMesh || !o.geometry?.attributes?.position) return;
      const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
      const pos = Float32Array.from(g.attributes.position.array);
      if (!pos.length) return;
      if (!g.attributes.normal) g.computeVertexNormals();
      const nrm = Float32Array.from(g.attributes.normal.array);
      const glow = o.material?.type === 'MeshBasicMaterial';
      const n = pos.length / 3, col = new Float32Array(n * 3);
      if (g.attributes.color) col.set(Array.from({ length: n * 3 }, (_, i) => g.attributes.color.array[Math.floor(i / 3) * g.attributes.color.itemSize + (i % 3)]));
      else { const c = o.material?.color || new THREE.Color(1, 1, 1); for (let i = 0; i < n; i++) col.set([c.r, c.g, c.b], i * 3); }
      const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < pos.length; i++) { min[i % 3] = Math.min(min[i % 3], pos[i]); max[i % 3] = Math.max(max[i % 3], pos[i]); }
      json.meshes.push({ name: name + (glow ? '__glow' : ''), primitives: [{ attributes: { POSITION: acc(pos, 'VEC3', min, max), NORMAL: acc(nrm, 'VEC3'), COLOR_0: acc(col, 'VEC3') }, material: glow ? 1 : 0 }] });
      json.nodes.push({ name: glow ? `${name}__glow` : `${name}_teil${kids.length}`, mesh: json.meshes.length - 1 });
      kids.push(json.nodes.length - 1);
    });
    json.nodes.push({ name, children: kids });
    json.scenes[0].nodes.push(json.nodes.length - 1);
  }
  const bin = Buffer.concat(chunks);
  json.buffers.push({ byteLength: bin.length });
  let js = Buffer.from(JSON.stringify(json), 'utf8');
  js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
  const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
  const c0 = Buffer.alloc(8); c0.writeUInt32LE(js.length, 0); c0.writeUInt32LE(0x4e4f534a, 4);
  const c1 = Buffer.alloc(8); c1.writeUInt32LE(bin.length, 0); c1.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([head, c0, js, c1, bin]);
}

// ---------- alle Modelle einsammeln ----------
const packs = { place: [], furniture: [], items: [], crops: [] }, manifest = [];
const size = g => { const b = new THREE.Box3().setFromObject(g), s = b.getSize(new THREE.Vector3()); return [s.x, s.y, s.z].map(v => Math.round(v * 100) / 100); };
const tris = g => { let n = 0; g.traverse(o => { if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); return n; };
function add(pack, name, id, label, make, extra = {}) {
  let g = null;
  try { g = make(); } catch (e) { console.warn('übersprungen:', name, e.message); }
  if (!g) return;
  packs[pack].push([name, g]);
  manifest.push({ pack, name, id, label, size: size(g), tris: tris(g), model: HAVE.has(name) || HAVE.has(extra.alias || ''), icon: ICONS.has(id), ...extra });
}
for (const [id, p] of Object.entries(D.PLACE)) add('place', id, id, p.name, () => P.placeable(id, true), PLACE_ALIAS[id] ? { alias: PLACE_ALIAS[id] } : {});
for (const [id, f] of Object.entries(FURNITURE)) add('furniture', id, id, f.name, () => F.makeFurniture(id));
for (const id of IM.ITEM_MODEL_IDS) { if (!D.ITEMS[id] || id.startsWith('s_')) continue; add('items', 'item_' + id, id, D.ITEMS[id].name, () => { const r = IM.itemModel(id); return r; }); }
for (const [k, c] of Object.entries(D.CROPS)) for (const st of [1, 2, 3]) add('crops', `crop_${k}_${st}`, k, `${c.name} (Stufe ${st})`, () => P.crop(k, st));

const OUT = join(ROOT, 'art/export');
mkdirSync(OUT, { recursive: true });
for (const [pack, list] of Object.entries(packs)) { writeFileSync(join(OUT, pack + '.glb'), glb(list)); console.log(`art/export/${pack}.glb: ${list.length} Modelle`); }
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));

// ---------- Übersicht ----------
const icons = Object.keys(D.ITEMS).filter(id => !id.startsWith('s_'));
let md = `# Modelle & Icons – Stand\n\nAutomatisch erzeugt mit \`npm run export-models\` – nicht von Hand ändern. Anleitung: [ART.md](../ART.md)\n\n`;
md += `| Bereich | Modelle | davon aus Blender | noch Platzhalter |\n|---|---|---|---|\n`;
for (const pack of Object.keys(packs)) { const l = manifest.filter(m => m.pack === pack), h = l.filter(m => m.model).length; md += `| ${pack} | ${l.length} | ${h} | ${l.length - h} |\n`; }
md += `| Icons | ${icons.length} | ${icons.filter(id => ICONS.has(id)).length} eigene Bilder | ${icons.filter(id => !ICONS.has(id)).length} gerendert |\n\n`;
for (const pack of Object.keys(packs)) {
  const todo = manifest.filter(m => m.pack === pack && !m.model);
  md += `## ${pack} – noch Platzhalter (${todo.length})\n\n| Name im Spiel | Wurzel-Objekt | Größe (B×H×T) | Dreiecke |\n|---|---|---|---|\n`;
  for (const m of todo) md += `| ${m.label} | \`${m.name}\`${m.alias ? ` (oder \`${m.alias}\`)` : ''} | ${m.size.join(' × ')} | ${m.tris} |\n`;
  md += '\n';
}
writeFileSync(join(ROOT, 'art/STATUS.md'), md);
console.log(`art/STATUS.md: ${manifest.filter(m => !m.model).length} von ${manifest.length} Modellen sind noch Platzhalter`);
