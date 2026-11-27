// Insel-Erweiterungen: neue Gebiete, die man im Rathaus freischaltet (Kiefernwald, Blütenwiese, Kristallhöhle).
// Sie liegen – wie Zuhause, Bummelgasse und Tropeninsel – weit weg (x = -300) und werden über ein Tor auf der Insel betreten.
// Nur Daten und reine Rechnungen (keine Grafik), damit Spiellogik und Tests in Node laufen.
import { rng } from './island.js';

export const AREAS = {
  wald: {
    name: 'Kiefernwald', icon: '🌲', x: -300, z: 0, w: 15, d: 11, lvl: 4, cost: 18000, mats: { holz: 30, stein: 10 },
    gate: [-17, -15], gateName: 'Waldtreppe', ground: 0x6fb556,
    desc: 'Eine Treppe hinauf aufs Klippenplateau: ein großer Wald mit Bach und Lichtung, hohen Kiefern (Harz & Zapfen), Pilzen, Blaubeeren und alten Baumstümpfen.',
  },
  wiese: {
    name: 'Blütenwiese', icon: '🌼', x: -300, z: 70, w: 15, d: 11, lvl: 5, cost: 25000, mats: { holz: 20, stein: 20 },
    gate: [15, 6], gateName: 'Blumentor', ground: 0x8fd067,
    desc: 'Eine weite, bunte Wiese hinter dem Blumentor: Windmühle, Seerosenteich, Bienenstöcke mit Honig, Himbeeren, Kleefelder und seltene Wiesenblumen.',
  },
  hoehle: {
    name: 'Kristallhöhle', icon: '💎', x: -300, z: -70, w: 13, d: 9, lvl: 6, cost: 35000, mats: { stein: 40, eisen: 10 },
    gate: [14, -15], gateName: 'Höhleneingang', ground: 0x6d6478, cave: true,
    desc: 'Ein Höhleneingang in der Klippe: eine große Grotte mit leuchtendem See, Erzadern mit Eisen, Gold und Edelsteinen und funkelnden Kristallnestern – jeden Tag neu.',
  },
};
export const AREA_IDS = Object.keys(AREAS);

// ---------- Inselleben 13: die Gebiete neu gebaut – größer, mit geschwungenem Weg, Bach, Teich, Mühle und See ----------
// Der Weg schlängelt sich vom Eingang (Süden) durch die Mitte bis zum Nordrand; in der Höhle führt er gerade hinein.
export const pathX = (id, lz) => (AREAS[id].cave ? 0 : (id === 'wald' ? 2.4 : -2.2) * Math.sin((AREAS[id].d - lz) / (2 * AREAS[id].d) * Math.PI * 2));
export const BROOK_Z = x => -5.2 + Math.sin(x * 0.45) * 1.1;                 // Bach im Kiefernwald (zum Durchwaten)
export const POND = [-9.5, -5.5, 2.3], MILL = [10.5, -7.5, 1.7], CAVE_LAKE = [-9.6, -6, 2.5], CAMPFIRE = [-1.7, 1.2], CART = [9.6, 6.2];
export const MEADOW_FENCE = [-1.5, -2.5, -3.5, -4.5, -5.5].flatMap(k => { const z = 11 + k; return [[pathX('wiese', z) - 1.9, z], [pathX('wiese', z) + 1.9, z]]; }); // Lattenzaun am Wiesenweg
// Wo man nicht durchlaufen kann: [x, z, Radius] (lokal)
export const AREA_BLOCK = {
  wald: [[CAMPFIRE[0], CAMPFIRE[1], 0.55]],
  wiese: [POND, MILL, ...MEADOW_FENCE.map(([x, z]) => [x, z, 0.42])],
  hoehle: [CAVE_LAKE, [CART[0], CART[1], 0.8]],
};
export const areaBlock = (id, lx, lz, pad = 0) => !!AREA_BLOCK[id]?.some(([x, z, r]) => Math.hypot(lx - x, lz - z) < r + pad);
// Plätze, die frei bleiben (Lichtung, Bewohner, Ereignisse aus Inselleben 9)
const KEEP = {
  wald: [[0, 0, 2.6], [1.6, -1.4, 2.2], [-7, -1, 2.2], [4, 4, 1.8], [-4, 3, 1.3], [7, -2, 1.3]],
  wiese: [[0, 0, 2.2], [4, -4.6, 2], [-6, 6, 1.8], [5, 4.5, 1.6], [-2, -3, 1.3], [6, 1, 1.3]],
  hoehle: [[0, 0, 2], [-5, 2, 1.8], [-7, 3, 1.3], [-5, 5, 1.3], [-3, 3, 1.3], [6, 5, 1.8], [3, -1, 1.3], [-2, 5, 1.3]],
};
// Was in den Gebieten steht. kind: pine (hacken/schütteln), mush (Pilz pflücken), berry (Beeren), hive (Honig), bloom (Blumensamen),
// ore (Erz hauen), spot (Fundstelle: Baumstumpf, Kleefeld, Kristallnest – einmal am Tag durchstöbern)
const LAYOUT = { wald: [['pine', 24], ['spot', 6], ['mush', 18], ['berry', 9]], wiese: [['hive', 5], ['spot', 6], ['bloom', 26], ['berry', 9]], hoehle: [['ore', 18], ['spot', 6]] };
export const NODES = {};
for (const [id, list] of Object.entries(LAYOUT)) {
  const A = AREAS[id], r = rng(id.length * 7919 + id.charCodeAt(0) + 13), out = [], used = new Set();
  const big = kind => kind === 'pine' || kind === 'ore' || kind === 'hive';
  const free = (x, z, kind) => !used.has(x + ',' + z) && Math.abs(x - pathX(id, z)) > (big(kind) ? 1.7 : 1.05) && !(Math.abs(x) <= 2 && z >= A.d - 3)
    && !(id !== 'hoehle' && z <= -A.d + 2 && Math.abs(x) <= 3) && !(id === 'hoehle' && z <= -A.d + 2) && !(id === 'wald' && Math.abs(z - BROOK_Z(x)) < (big(kind) ? 1.9 : 1.2))
    && !KEEP[id].some(([kx, kz, kr]) => Math.hypot(x - kx, z - kz) < kr + (big(kind) ? 0.8 : 0)) && !areaBlock(id, x, z, big(kind) ? 1.6 : 0.9);
  for (const [kind, n] of list) {
    for (let i = 0, t = 0; i < n && t < 4000; t++) {
      const x = Math.round((r() * 2 - 1) * (A.w - 1)), z = Math.round((r() * 2 - 1) * (A.d - 1));
      if (!free(x, z, kind)) continue;
      if (big(kind)) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) used.add((x + dx) + ',' + (z + dz));
      else used.add(x + ',' + z);
      out.push({ kind, x, z, i: out.length });
      i++;
    }
  }
  NODES[id] = out;
}
export const nodeAt = (id, x, z) => NODES[id]?.find(n => n.x === x && n.z === z) || null;
export const SOLID = ['pine', 'ore', 'hive'];

// Welches Gebiet? (alles bei x < -150)
export function areaOf(p) {
  if (!(p.x < -150)) return null;
  let best = null, bd = Infinity;
  for (const [id, A] of Object.entries(AREAS)) { const d = Math.abs(p.z - A.z); if (d < bd) { bd = d; best = id; } }
  return best;
}
export const inArea = (id, lx, lz) => Math.abs(lx) <= AREAS[id].w + 0.4 && Math.abs(lz) <= AREAS[id].d + 0.4;
export const areaExit = (id, lx, lz) => Math.abs(lx) <= 1.2 && lz > AREAS[id].d - 0.2;
export const gateAt = (x, z) => AREA_IDS.find(id => AREAS[id].gate[0] === x && AREAS[id].gate[1] === z) || null;

// Jeden Tag anders: welche Pilze/Beeren/Blumen sind heute da? (fest je Tag, damit alle dasselbe sehen)
const hash = (a, b) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 13; return ((Math.imul(h, 0x27d4eb2f) ^ (h >>> 16)) >>> 0) / 4294967296; };
export const MUSHROOMS = [['steinpilz', 0.4], ['pfifferling', 0.3], ['morchel', 0.12], ['fliegenpilz', 0.18]];
export const BLOOMS = ['lavendel', 'pfingstrose', 'glockenblume', 'orchidee'];
// Fundstellen: was heute darin steckt (für alle gleich)
export const SPOT_LOOT = {
  wald: [['holz', 0.34], ['harz', 0.22], ['waldmoos', 0.18], ['kiefernzapfen', 0.14], ['eulenfeder', 0.08], ['harzperle', 0.04]],
  wiese: [['pusteblume', 0.3], ['morgentau', 0.22], ['heu', 0.18], ['honig', 0.12], ['gluecksklee', 0.1], ['goldstaub', 0.08]],
  hoehle: [['stein', 0.26], ['kristall', 0.24], ['leuchtmoos', 0.2], ['tropfstein', 0.14], ['geode', 0.1], ['amethyst', 0.06]],
};
export const SPOT_NAME = { wald: ['🪵', 'Baumstumpf durchstöbern'], wiese: ['🍀', 'Im Klee suchen'], hoehle: ['✨', 'Kristallnest ausräumen'] };
export const GEMS = [['stein', 0.34], ['eisen', 0.24], ['goldnugget', 0.1], ['kristall', 0.1], ['amethyst', 0.09], ['rubin', 0.05], ['saphir', 0.05], ['opal', 0.03]];
export function nodeToday(id, n, day) {
  const h = hash(day * 31 + n.i, id.charCodeAt(0) * 97 + id.length);
  if (n.kind === 'mush') { if (h > 0.75) return null; let a = h / 0.75; for (const [k, p] of MUSHROOMS) { if ((a -= p) < 0) return k; } return 'steinpilz'; }
  if (n.kind === 'bloom') return h < 0.7 ? BLOOMS[Math.floor(hash(n.i, day) * BLOOMS.length)] : null;
  if (n.kind === 'berry') return id === 'wiese' ? 'himbeere' : 'blaubeere';
  if (n.kind === 'spot') { let a = hash(day * 17 + n.i * 5, id.charCodeAt(0) * 31 + 7); for (const [k, p] of SPOT_LOOT[id]) { if ((a -= p) < 0) return k; } return SPOT_LOOT[id][0][0]; }
  return true;
}
// wie oft am Tag: Kiefer 3× hacken, Erz 3× hauen, Bienenstock 1× Honig, Rest 1×
export const nodeUses = n => (n.kind === 'pine' || n.kind === 'ore' ? 3 : 1);
