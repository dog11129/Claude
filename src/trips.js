// Bootsausflüge mit Käpt'n Flossi zu Zufallsinseln: jeden Tag eine andere kleine Insel weit draußen (z = 600).
// Bambus-, Wasserfall-, Krabbeltier-, Obst-, Kristall- oder Blüteninsel – alles aus einer Zufallszahl,
// damit Gastgeber und Gäste dieselbe Insel sehen. Nur Daten und Rechnungen (keine Grafik).
import { rng } from './island.js';

export const TRIP = { x: 0, z: 600, r: 9 };
export const TRIP_PRICE = 2000;
export const TRIP_KINDS = {
  bambus:     { name: 'Bambusinsel',     icon: '🎋', ground: 0x86c95a, nodes: [['bamboo', 12], ['fruit', 2], ['bugs', 2]], desc: 'Dichter Bambus zum Hacken und zarte Sprossen' },
  wasserfall: { name: 'Wasserfallinsel', icon: '💦', ground: 0x7cc45a, nodes: [['pool', 4], ['bloom', 5], ['ore', 3]], desc: 'Ein Wasserfall mit Becken voller seltener Fische' },
  insekten:   { name: 'Krabbeltierinsel', icon: '🦋', ground: 0x8fd067, nodes: [['bugs', 12], ['fruit', 2]], desc: 'Überall summt und flattert es – seltene Krabbeltiere!' },
  obst:       { name: 'Obstinsel',       icon: '🥭', ground: 0x80cc5c, nodes: [['fruit', 10], ['bloom', 4]], desc: 'Bäume voller exotischer Früchte' },
  kristall:   { name: 'Kristallinsel',   icon: '💎', ground: 0x9cc06a, nodes: [['ore', 10], ['mush', 4]], desc: 'Funkelnde Felsen mit besonders vielen Edelsteinen' },
  blumen:     { name: 'Blüteninsel',     icon: '🌺', ground: 0x8fd56a, nodes: [['bloom', 14], ['bugs', 3]], desc: 'Seltene Blumen, deren Samen man mitnehmen kann' },
};
export const SOLID_TRIP = ['bamboo', 'ore', 'fruit'];
export const tripUses = n => (n.kind === 'bamboo' || n.kind === 'ore' ? 3 : n.kind === 'pool' ? 2 : 1);

// Insel aus der Zufallszahl bauen (zwischengespeichert)
let memo = { seed: null };
export function tripLayout(seed) {
  if (memo.seed === seed) return memo;
  const r = rng(seed), kinds = Object.keys(TRIP_KINDS), kind = kinds[Math.floor(r() * kinds.length)], K = TRIP_KINDS[kind];
  const nodes = [], used = new Set(), R = TRIP.r - 1.6;
  const free = (x, z) => !used.has(x + ',' + z) && Math.hypot(x, z) <= R && !(Math.abs(x) <= 1 && z >= 3) && !(kind === 'wasserfall' && z <= -4 && Math.abs(x) <= 3);
  for (const [k, n] of K.nodes) {
    for (let i = 0, t = 0; i < n && t < 800; t++) {
      const x = Math.round((r() * 2 - 1) * R), z = Math.round((r() * 2 - 1) * R);
      if (!free(x, z)) continue;
      const big = SOLID_TRIP.includes(k);
      for (let dx = big ? -1 : 0; dx <= (big ? 1 : 0); dx++) for (let dz = big ? -1 : 0; dz <= (big ? 1 : 0); dz++) used.add((x + dx) + ',' + (z + dz));
      used.add(x + ',' + z);
      nodes.push({ kind: k, x, z, i: nodes.length, v: Math.floor(r() * 1000) });
      i++;
    }
  }
  return (memo = { seed, kind, nodes });
}
export const tripNodeAt = (s, lx, lz) => s.trip ? tripLayout(s.trip.seed).nodes.find(n => n.x === lx && n.z === lz) || null : null;
export const onTripDock = (lx, lz) => Math.abs(lx) <= 0.75 && lz >= TRIP.r - 0.9 && lz <= TRIP.r + 3.2;
export const tripWalk = (lx, lz) => Math.hypot(lx, lz) <= TRIP.r - 0.3 || onTripDock(lx, lz);

// Was liegt auf den Knoten?
export const TRIP_FRUIT = ['mango', 'banane', 'sternfrucht', 'kokosnuss', 'pfirsich'];
export const TRIP_BLOOM = ['lilie', 'mohn', 'kornblume', 'orchidee', 'pfingstrose', 'glockenblume', 'lavendel'];
export const TRIP_BUGS = ['blaeuling', 'hirschkaefer', 'vogelfalter', 'atlasspinner', 'orchideenmantis', 'goliathkaefer', 'gluehwuermchen', 'zitronenfalter', 'nebelfalter', 'sternenfalter'];
export const TRIP_FISH = ['goldfisch', 'hecht', 'lachs', 'forelle', 'nebelhecht', 'sternbarsch', 'karpfen'];
export const nodeThing = n => n.kind === 'fruit' ? TRIP_FRUIT[n.v % TRIP_FRUIT.length] : n.kind === 'bloom' ? TRIP_BLOOM[n.v % TRIP_BLOOM.length] : n.kind === 'mush' ? ['steinpilz', 'pfifferling', 'morchel'][n.v % 3] : null;
