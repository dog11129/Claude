// Gruppen für Taschen, Verkauf, Lagerkiste und Schenken (nur Daten – auch der Host rechnet damit).
import { ITEMS, ALBUM } from './data.js';

const IN = (...lists) => { const s = new Set(lists.flat()); return id => s.has(id); };
const fishy = IN(ALBUM.fish, ALBUM.sea), bugs = IN(ALBUM.bug), finds = IN(ALBUM.fossil, ALBUM.shell, ALBUM.gem), mush = IN(ALBUM.mush);
export const GROUPS = [
  ['fish', '🎣 Fische & Meerestiere', id => fishy(id)],
  ['bug', '🦋 Insekten', id => bugs(id)],
  ['finds', '🐚 Muscheln, Funde & Edelsteine', id => finds(id)],
  ['food', '🍎 Obst, Gemüse & Essen', id => mush(id) || ['fruit', 'veg', 'dish'].includes(ITEMS[id]?.cat)],
  ['mat', '🪵 Material', id => ITEMS[id]?.cat === 'mat'],
  ['seed', '🌱 Samen & Setzlinge', id => !!(ITEMS[id]?.seed || ITEMS[id]?.sapling) || id.startsWith('baum_') || id.startsWith('s_')],
  ['home', '🛋️ Möbel & Deko', id => !!(ITEMS[id]?.furn || ITEMS[id]?.place)],
  ['gear', '🛠️ Werkzeug', id => !!ITEMS[id]?.gear],
  ['misc', '✨ Schätze & Sonstiges', () => true],
];
export const GROUP_IDS = GROUPS.map(g => g[0]);
const cache = new Map();
export function groupOf(id) {
  if (!cache.has(id)) cache.set(id, (GROUPS.find(([, , f]) => f(id)) || GROUPS[GROUPS.length - 1])[0]);
  return cache.get(id);
}
// Einträge [id, n] nach Gruppen sortiert: [[gruppe, titel, [[id, n] …]] …]
export function grouped(entries) {
  const by = new Map(GROUPS.map(([k, t]) => [k, [k, t, []]]));
  for (const e of entries) by.get(groupOf(e[0]))[2].push(e);
  for (const g of by.values()) g[2].sort((a, b) => (ITEMS[a[0]]?.name || a[0]).localeCompare(ITEMS[b[0]]?.name || b[0], 'de'));
  return [...by.values()].filter(g => g[2].length);
}
