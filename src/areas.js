// Insel-Erweiterungen: neue Gebiete, die man im Rathaus freischaltet (Kiefernwald, Blütenwiese, Kristallhöhle).
// Sie liegen – wie Zuhause, Bummelgasse und Tropeninsel – weit weg (x = -300) und werden über ein Tor auf der Insel betreten.
// Nur Daten und reine Rechnungen (keine Grafik), damit Spiellogik und Tests in Node laufen.
import { rng } from './island.js';

export const AREAS = {
  wald: {
    name: 'Kiefernwald', icon: '🌲', x: -300, z: 0, w: 11, d: 8, lvl: 4, cost: 18000, mats: { holz: 30, stein: 10 },
    gate: [-17, -15], gateName: 'Waldtreppe', ground: 0x6fb556,
    desc: 'Eine Treppe hinauf aufs Klippenplateau: hohe Kiefern (Harz & Zapfen), Pilze, Blaubeeren und seltene Waldkäfer.',
  },
  wiese: {
    name: 'Blütenwiese', icon: '🌼', x: -300, z: 70, w: 11, d: 8, lvl: 5, cost: 25000, mats: { holz: 20, stein: 20 },
    gate: [15, 6], gateName: 'Blumentor', ground: 0x8fd067,
    desc: 'Eine bunte Wiese hinter dem Blumentor: Bienenstöcke mit Honig, Himbeeren und seltene Wiesenblumen zum Samen-Sammeln.',
  },
  hoehle: {
    name: 'Kristallhöhle', icon: '💎', x: -300, z: -70, w: 10, d: 7, lvl: 6, cost: 35000, mats: { stein: 40, eisen: 10 },
    gate: [14, -15], gateName: 'Höhleneingang', ground: 0x6d6478, cave: true,
    desc: 'Ein Höhleneingang in der Klippe: Erzadern mit Eisen, Gold und Edelsteinen – jeden Tag neu.',
  },
};
export const AREA_IDS = Object.keys(AREAS);

// Was in den Gebieten steht. kind: pine (hacken/schütteln), mush (Pilz pflücken), berry (Beeren), hive (Honig), bloom (Blumensamen), ore (Erz hauen)
const LAYOUT = { wald: [['pine', 16], ['mush', 12], ['berry', 6]], wiese: [['hive', 4], ['bloom', 16], ['berry', 6]], hoehle: [['ore', 14]] };
export const NODES = {};
for (const [id, list] of Object.entries(LAYOUT)) {
  const A = AREAS[id], r = rng(id.length * 7919 + id.charCodeAt(0)), out = [], used = new Set();
  const free = (x, z) => !used.has(x + ',' + z) && !(Math.abs(x) <= 1 && z >= A.d - 3) && !(Math.abs(x) <= 2 && Math.abs(z) <= 1);
  for (const [kind, n] of list) {
    for (let i = 0, t = 0; i < n && t < 600; t++) {
      const x = Math.round((r() * 2 - 1) * (A.w - 1)), z = Math.round((r() * 2 - 1) * (A.d - 1));
      if (!free(x, z)) continue;
      if (kind === 'pine' || kind === 'ore' || kind === 'hive') for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) used.add((x + dx) + ',' + (z + dz));
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
export const GEMS = [['stein', 0.34], ['eisen', 0.24], ['goldnugget', 0.1], ['kristall', 0.1], ['amethyst', 0.09], ['rubin', 0.05], ['saphir', 0.05], ['opal', 0.03]];
export function nodeToday(id, n, day) {
  const h = hash(day * 31 + n.i, id.charCodeAt(0) * 97 + id.length);
  if (n.kind === 'mush') { if (h > 0.75) return null; let a = h / 0.75; for (const [k, p] of MUSHROOMS) { if ((a -= p) < 0) return k; } return 'steinpilz'; }
  if (n.kind === 'bloom') return h < 0.7 ? BLOOMS[Math.floor(hash(n.i, day) * BLOOMS.length)] : null;
  if (n.kind === 'berry') return id === 'wiese' ? 'himbeere' : 'blaubeere';
  return true;
}
// wie oft am Tag: Kiefer 3× hacken, Erz 3× hauen, Bienenstock 1× Honig, Rest 1×
export const nodeUses = n => (n.kind === 'pine' || n.kind === 'ore' ? 3 : 1);
