// Bauplan aller Platzhalter-Modelle für den Nachbau in Blender (blender/remaster.py).
//   node tools/dump-models.mjs
// Jedes Bauteil wird als Grundform mit Maßen, Lage (3×4-Matrix im Spiel-Koordinatensystem, y = oben), Farbe und
// Leucht-Kennung gespeichert. Blender baut daraus dieselben Modelle in schöner: runde Kanten, mehr Segmente,
// weiche Schatten in den Vertex-Farben. Formen, die sich nicht als Grundform erkennen lassen (gebogene Stängel,
// ausgestanzte Sterne …), kommen als Dreiecke mit. Dazu die Liste, welches Modell welches Icon zeigt.
// Ergebnis: art/remaster/plan.json
import { writeFileSync, mkdirSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

globalThis.document ||= { createElement: () => ({ getContext: () => null }) };
globalThis.KUSCHEL_KEEP_PARTS = true; // models.js merkt sich die Bauteile jeder Geometrie
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const THREE = await import('../vendor/three.module.min.js');
const { dump, stats } = await import('./partplan.mjs');
const sig = parts => JSON.stringify(parts);
const D = await import('../src/data.js');
const { FURNITURE } = await import('../src/furni-data.js');
const P = await import('../src/plants.js');
const F = await import('../src/furniture.js');
const IM = await import('../src/itemmodels.js');

// ---------- schon vorhandene Blender-Modelle ----------
function glbRoots(file) {
  const b = readFileSync(file), len = b.readUInt32LE(12), json = JSON.parse(b.subarray(20, 20 + len).toString('utf8'));
  return (json.scenes?.[json.scene || 0]?.nodes || []).map(i => json.nodes[i].name);
}
const HAVE = new Set(), OWN = new Set(['place2', 'furniture2', 'items2', 'crops2']); // OWN: die Pakete, die remaster.py selbst baut
const MODELS = join(ROOT, 'assets/models');
for (const f of readdirSync(MODELS).filter(f => f.endsWith('.glb') && !OWN.has(f.slice(0, -4)))) for (const n of glbRoots(join(MODELS, f))) HAVE.add(n);
const PLACE_ALIAS = { kuerbislaterne: 'lantern_pumpkin', schneemann: 'snowman', herzballon: 'heart_balloon', torte: 'cake', angelpokal: 'pokal', kaeferpokal: 'pokal', apfelbaum: 'ptree', orangenbaum: 'ptree', pfirsichbaum: 'ptree', kirschenbaum: 'ptree', birnbaum: 'ptree', mangobaum: 'ptree', bananenbaum: 'banana', lichterbaum: 'lichterbaum' };
// Diese zeigen im Spiel zusammengesetzte Modelle (Obst an der Krone, Eier im Nest) – Icon bleibt vom Spiel gerendert
const ICON_SKIP = new Set(['apfelbaum', 'orangenbaum', 'pfirsichbaum', 'kirschenbaum', 'birnbaum', 'mangobaum', 'bananenbaum', 'eiernest']);
const MODEL_SKIP = new Set(['eiernest']); // baut nature.js selbst zusammen (Nest + Eier aus Blender)

// ---------- alle Platzhalter einsammeln ----------
const models = [], NEW = new Set();
function add(pack, name, make) {
  if (HAVE.has(name) || MODEL_SKIP.has(name)) return null;
  let g = null;
  try { g = make(); } catch (e) { console.warn('übersprungen:', name, e.message); }
  if (!g) return null;
  const parts = dump(g);
  if (!parts.length) return null;
  models.push({ name, pack, parts });
  NEW.add(name);
  return parts;
}
for (const id of [...Object.keys(D.PLACE), 'heissluftballon', 'nachtstand', 'riffboje', 'wrackboje']) { // dazu Dinge, die nur die Welt aufstellt
  const name = PLACE_ALIAS[id] || id;
  if (HAVE.has(name) || NEW.has(name)) continue;
  const a = add('place', name, () => P.placeable(id, false));
  if (!a) continue;
  let b = null;
  try { b = dump(P.placeable(id, true)); } catch { b = null; }
  if (b && sig(a) !== sig(b)) { models.push({ name: name + '_ready', pack: 'place', parts: b }); NEW.add(name + '_ready'); }
}
// Inselleben 13: Zaunstücke für jede Nachbarschaft (Maske 1–15) und Tore als Rahmen + Flügel
for (const kind of new Set(Object.values(D.PLACE).map(p => p.fence).filter(Boolean))) for (let m = 1; m < 16; m++) add('place', `zaun_${kind}_${m}`, () => P.fencePiece(kind, m));
for (const kind of new Set(Object.values(D.PLACE).map(p => p.gate).filter(Boolean))) { add('place', `tor_${kind}_rahmen`, () => P.gateFramePiece(kind)); add('place', `tor_${kind}_fluegel`, () => P.gateLeafPiece(kind)); }
for (const id of Object.keys(FURNITURE)) add('furniture', id, () => F.makeFurniture(id));
for (const id of IM.ITEM_MODEL_IDS) if (D.ITEMS[id] && !id.startsWith('s_')) add('items', 'item_' + id, () => IM.itemModel(id));
for (const k of Object.keys(D.CROPS)) if (D.ITEMS['s_' + k]) add('items', 'item_s_' + k, () => IM.itemModel('s_' + k));
for (const [k] of Object.entries(D.CROPS)) for (const st of [1, 2, 3]) add('crops', `crop_${k}_${st}`, () => P.crop(k, st));

// ---------- Icons: welches Modell zeigt welchen Gegenstand (wie src/icons.js modelFor) ----------
const has = n => HAVE.has(n) || NEW.has(n);
const MAT_ASSET = { holz: 'ground_holz', ast: 'ground_ast', stein: 'ground_stein', lehm: 'ground_lehm', eisen: 'ground_eisen', flaschenpost: 'ground_bottle' };
const SHELLS = ['herzmuschel', 'jakobsmuschel', 'kauri', 'koralle', 'sanddollar', 'sternsplitter'];
const icons = [];
for (const [id, it] of Object.entries(D.ITEMS)) {
  if (ICON_SKIP.has(id)) continue;
  let m = null, side = false;
  if (has('item_' + id)) { m = 'item_' + id; side = !id.startsWith('s_'); }
  else if (it.furn) m = has(id) ? id : null;
  else if (it.place && D.PLACE[id]) { const n = PLACE_ALIAS[id] || id; m = has(n + '_ready') ? n + '_ready' : has(n) ? n : null; }
  else if (D.CROPS[id]) m = has(`crop_${id}_3`) ? `crop_${id}_3` : null;
  else if (has('fruit_' + id)) m = 'fruit_' + id;
  else if (SHELLS.includes(id)) m = has('shell_' + id) ? 'shell_' + id : null;
  else if (MAT_ASSET[id]) m = has(MAT_ASSET[id]) ? MAT_ASSET[id] : null;
  else if (id === 'unkraut') m = has('weed') ? 'weed' : null;
  if (m) icons.push({ id, m, side: side ? 1 : 0, own: HAVE.has(m) ? 0 : 1 });
}

const OUT = join(ROOT, 'art/remaster');
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'plan.json'), JSON.stringify({ version: 1, models, icons }));
const nparts = models.reduce((s, m) => s + m.parts.length, 0);
console.log(`art/remaster/plan.json: ${models.length} Modelle, ${nparts} Bauteile, ${icons.length} Icons`);
console.log(Object.entries(stats).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));
