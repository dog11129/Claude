// Bäume am Rand der Ausflugsziele (Gebiete, Seerosenmoor, Tropeninsel, Ausflugsinseln, Bummelgasse), die keine
// eigenen "Knoten" sind. Damit man mit ALLEN Bäumen etwas machen kann: schütteln (Äste, Zapfen, Kokosnüsse, Blüten)
// und mit der Axt Holz hacken – je Baum einmal am Tag. Nur Daten & Rechnungen; die Grafik baut dieselben Listen.
import { AREAS } from './areas.js';
import { TRIP, tripLayout } from './trips.js';

// Park-Miller-Zufall (exakt gerechnet: Werte immer zwischen 0 und 1 – früher rutschten durch Überlauf Bäume mitten ins Gebiet)
const lcg = seed => (i => () => ((i = (i * 48271) % 2147483647) / 2147483647))(seed);

// Baumring um Kiefernwald und Blütenwiese (gleiche Reihenfolge der Zufallszahlen wie früher in zones.js)
const edgeMemo = {};
export function areaEdge(id) {
  if (edgeMemo[id]) return edgeMemo[id];
  const A = AREAS[id], W = A.w, D = A.d, out = [];
  if (!A.cave) {
    const rnd = lcg(id.length * 999 + 7);
    for (let i = 0; i < 70; i++) {
      const a = i / 70 * Math.PI * 2, r = 1 + rnd() * 0.6, rx = (W + 1.5) * r * Math.cos(a), rz = (D + 1.5) * r * Math.sin(a);
      if (rz > D && Math.abs(rx) < 2.4) continue;
      if (id !== 'wald' && i % 2) { out.push({ k: 'bush', x: rx * 0.9, z: rz * 0.9 }); continue; }
      out.push({ k: id === 'wald' ? 'pine' : 'blossom', x: rx, z: rz, s: 1 + rnd() * 0.4, ry: rnd() * 6 });
    }
  }
  return (edgeMemo[id] = out);
}
// Randbäume, die in den Ecken des begehbaren Bereichs stehen: dort läuft man nicht hindurch
const solidMemo = {};
export function areaTreesInside(id) {
  if (solidMemo[id]) return solidMemo[id];
  const A = AREAS[id];
  return (solidMemo[id] = areaEdge(id).filter(t => t.k !== 'bush' && Math.abs(t.x) < A.w + 0.9 && Math.abs(t.z) < A.d + 0.9).map(t => [t.x, t.z]));
}
export const areaTreeBlock = (id, lx, lz) => areaTreesInside(id).some(([x, z]) => Math.hypot(x - lx, z - lz) < 0.45);
// Feste Bäume der anderen Orte (lokale Koordinaten; die Grafik benutzt genau diese Listen)
export const MOOR_C = { x: 0, z: -900 };
export const MOOR_BIRCHES = [[-10.5, -7], [10.4, -7.4], [-11, 2], [11, 3.5], [-6, 8], [6.4, 8]];
export const TROPIC_C = { x: 0, z: 300 };
export const TROPIC_PALMS = [[-8, -3], [8, -4], [-7.4, 5.5], [7.6, 5], [-3, -8.3], [4.5, -7.8], [-8.6, 1.5], [8.7, 0.5]];
export const STREET_C = { x: 0, z: -300 };
export const STREET_TREES = [-13.2, -4, 4, 13.2].map(x => [x, -5.9]);
// Rand der Ausflugsinsel: Palmen (manche mit Kokosnüssen), Hortensien, auf der Bambusinsel Bambus
export function tripEdge(seed, kind) {
  const rnd = lcg(seed % 2147483646 + 1), R = TRIP.r, out = [];
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2 + rnd() * 0.3, r = R - 0.6 - rnd() * 0.6, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (z > R - 3 && Math.abs(x) < 2.6) continue;
    if (kind === 'bambus' && i % 2) { out.push({ k: 'bamboo', x, z, i, ry: rnd() * 6 }); continue; }
    if (i % 3 === 2) { out.push({ k: 'bush', x, z, ry: rnd() * 6 }); continue; }
    out.push({ k: 'palm', x, z, fruit: rnd() < 0.5, ry: rnd() * 6 });
  }
  return out;
}

// Wie weit liegt ein Punkt außerhalb eines begehbaren Rechtecks?
const outside = (x, z, w, d) => Math.hypot(Math.max(0, Math.abs(x) - w), Math.max(0, Math.abs(z) - d));
const treeMemo = {};
// Bäume eines Orts, mit denen man etwas machen kann: [{ x, z (Welt), k }]
export function decoTrees(zone, s) {
  if (zone === 'trip') {
    if (!s?.trip) return [];
    const key = 'trip:' + s.trip.seed;
    if (treeMemo[key]) return treeMemo[key];
    const kind = tripLayout(s.trip.seed).kind;
    return (treeMemo[key] = tripEdge(s.trip.seed, kind).filter(t => t.k === 'palm').map(t => ({ x: TRIP.x + t.x, z: TRIP.z + t.z, k: t.fruit ? 'palmfruit' : 'palm' })));
  }
  if (treeMemo[zone]) return treeMemo[zone];
  let out = [];
  if (zone === 'wald' || zone === 'wiese') {
    const A = AREAS[zone];
    out = areaEdge(zone).filter(t => t.k !== 'bush' && outside(t.x, t.z, A.w + 0.4, A.d + 0.4) < 1.8 && !(t.z > A.d && Math.abs(t.x) < 3)).map(t => ({ x: A.x + t.x, z: A.z + t.z, k: t.k }));
  } else if (zone === 'moor') out = MOOR_BIRCHES.map(([x, z]) => ({ x: MOOR_C.x + x, z: MOOR_C.z + z, k: 'birch' }));
  else if (zone === 'tropic') out = TROPIC_PALMS.map(([x, z]) => ({ x: TROPIC_C.x + x, z: TROPIC_C.z + z, k: 'palmfruit' }));
  else if (zone === 'street') out = STREET_TREES.map(([x, z]) => ({ x: STREET_C.x + x, z: STREET_C.z + z, k: 'cherry' }));
  return (treeMemo[zone] = out);
}
export const DECO_LABEL = { pine: '🌲 Kiefer', blossom: '🌸 Blütenbaum', birch: '🌳 Birke', palm: '🌴 Palme', palmfruit: '🌴 Kokospalme', cherry: '🌸 Kirschbäumchen' };
