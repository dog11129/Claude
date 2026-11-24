// Spielinhalte der Insel: Pflanzen, Obst, Fische, Insekten, Muscheln, Fossilien, Deko, Ausbau, Quests.
import { MAP, SPAWN, POND, PATHS, grass, sand, onPath, onPlaza, rng, walkable } from './island.js';
export { MAP, SPAWN, POND };

export const DAY = 420;          // Sekunden pro Spieltag
export const WET = 150;          // so lange bleibt gegossener Boden nass

// Jahreszeiten: je 7 Tage. Pflanzen wachsen in ihrer Saison schneller.
export const SEASON_LEN = 7;
export const SEASONS = { spring: ['Frühling', '🌸'], summer: ['Sommer', '☀️'], autumn: ['Herbst', '🍂'], winter: ['Winter', '❄️'] };
export const SEASON_IDS = Object.keys(SEASONS);
const ALL = SEASON_IDS;

// Blumen blühen immer wieder nach (regrow), Gemüse wird geerntet.
export const CROPS = {
  tulpe:       { name: 'Tulpe',          icon: '🌷', seed: 20,  sell: 40,  grow: 90,  lvl: 1, cat: 'fruit', xp: 1, flower: 0xff5d7a, regrow: 80, sea: ['spring', 'summer', 'autumn'] },
  kosmee:      { name: 'Kosmee',         icon: '🌼', seed: 20,  sell: 40,  grow: 90,  lvl: 1, cat: 'fruit', xp: 1, flower: 0xffd23f, regrow: 80, sea: ['summer', 'autumn'] },
  stiefmuetterchen: { name: 'Stiefmütterchen', icon: '🌸', seed: 20, sell: 40, grow: 90, lvl: 1, cat: 'fruit', xp: 1, flower: 0xb48cff, regrow: 80, sea: ['spring', 'autumn', 'winter'] },
  rose:        { name: 'Rose',           icon: '🌹', seed: 40,  sell: 80,  grow: 140, lvl: 2, cat: 'fruit', xp: 2, flower: 0xe8283c, regrow: 110 },
  hyazinthe:   { name: 'Hyazinthe',      icon: '🪻', seed: 40,  sell: 80,  grow: 140, lvl: 3, cat: 'fruit', xp: 2, flower: 0x8f7bff, regrow: 110, sea: ['spring', 'winter'] },
  sonnenblume: { name: 'Sonnenblume',    icon: '🌻', seed: 60,  sell: 120, grow: 200, lvl: 4, cat: 'fruit', xp: 3, regrow: 150, sea: ['summer'] },
  weizen:      { name: 'Weizen',         icon: '🌾', seed: 10,  sell: 25,  grow: 80,  lvl: 2, cat: 'veg',   xp: 1, yield: 2, sea: ['spring', 'summer', 'autumn'] },
  karotte:     { name: 'Karotte',        icon: '🥕', seed: 15,  sell: 45,  grow: 90,  lvl: 2, cat: 'veg',   xp: 2, sea: ['spring', 'autumn', 'winter'] },
  kartoffel:   { name: 'Kartoffel',      icon: '🥔', seed: 25,  sell: 70,  grow: 130, lvl: 3, cat: 'veg',   xp: 3, sea: ['spring', 'autumn'] },
  tomate:      { name: 'Tomate',         icon: '🍅', seed: 50,  sell: 60,  grow: 160, lvl: 4, cat: 'veg',   xp: 3, regrow: 80, sea: ['summer'] },
  kuerbis:     { name: 'Kürbis',         icon: '🎃', seed: 120, sell: 380, grow: 300, lvl: 6, cat: 'veg',   xp: 10, sea: ['autumn'] },
};
for (const c of Object.values(CROPS)) c.sea ||= ALL;
export const isFlower = k => !!CROPS[k] && CROPS[k].cat === 'fruit';

export const ANIMALS = {};       // Nutztiere gibt es auf der Insel nicht mehr
export const ANIMAL_NAMES = [];
export const PENS = {};

// Feste Gebäude: Fläche in Kacheln (x0..x1, z0..z1), was beim Benutzen passiert.
// cx/cz = Mitte des 3D-Modells, ox/oz = Verschiebung älterer Modelle, die in eigenen Koordinaten gebaut sind.
export const BUILDINGS = {
  office:   { x0: -2,  x1: 2,   z0: -5,  z1: -3,  use: 'orders', name: 'Inselbüro' },
  plaza:    { x0: 0,   x1: 0,   z0: 1,   z1: 1,   use: 'plaza',  name: 'Dorfbaum' },
  board:    { x0: -3,  x1: -3,  z0: -2,  z1: -2,  use: 'orders', name: 'Schwarzes Brett', ox: 4, oz: 6 },
  shop:     { x0: -10, x1: -6,  z0: -2,  z1: 0,   use: 'shop',   name: 'Krämerladen' },
  bin:      { x0: -5,  x1: -5,  z0: 0,   z1: 0,   use: 'sell',   name: 'Ankaufkiste', ox: -8, oz: 8 },
  museum:   { x0: 11,  x1: 15,  z0: -11, z1: -7,  use: 'museum', name: 'Museum' },
  house:    { x0: -11, x1: -7,  z0: -12, z1: -9,  use: 'farm',   name: 'Dein Haus', ox: -9, oz: 0 },
  mail:     { x0: -12, x1: -12, z0: -8,  z1: -8,  use: 'mail',   name: 'Briefkasten', ox: -10, oz: 0 },
  bench:    { x0: -5,  x1: -4,  z0: -11, z1: -11, use: 'craft',  name: 'Werkbank', ox: -10, oz: -1 },
  kitchen:  { x0: -16, x1: -15, z0: -12, z1: -12, use: 'cook',   name: 'Gartenküche', ox: -10, oz: 0 },
  vh_mira:  { x0: -15, x1: -14, z0: 6,   z1: 7,   use: 'visit',  name: 'Miras Haus', npc: 'mira' },
  vh_pippa: { x0: -5,  x1: -4,  z0: 12,  z1: 13,  use: 'visit',  name: 'Pippas Haus', npc: 'pippa' },
  vh_bruno: { x0: 12,  x1: 13,  z0: 8,   z1: 9,   use: 'visit',  name: 'Brunos Haus', npc: 'bruno' },
  vh_lio:   { x0: 15,  x1: 16,  z0: -1,  z1: 0,   use: 'visit',  name: 'Lios Haus', npc: 'lio' },
  vh_kalle: { x0: -10, x1: -9,  z0: 8,   z1: 9,   use: 'visit',  name: 'Kalles Haus', npc: 'kalle' },
  vh_wanda: { x0: 2,   x1: 3,   z0: 8,   z1: 9,   use: 'visit',  name: 'Wandas Haus', npc: 'wanda' },
};
for (const b of Object.values(BUILDINGS)) { b.cx = (b.x0 + b.x1) / 2; b.cz = (b.z0 + b.z1) / 2; }
// Nachbarhäuser bekommen mehr Platz drumherum (vor allem vor der Tür), damit kein Baum davorsteht
const nearBuilding = (x, z, m) => Object.values(BUILDINGS).some(b => { const e = b.npc ? 1 : 0; return x >= b.x0 - m - e && x <= b.x1 + m + e && z >= b.z0 - m - e && z <= b.z1 + m + e * 2; });

// Wilde Bäume (Obst, Holz), Palmen (Kokosnüsse) und Felsen (Stein, Eisen) – auf allen Geräten gleich verteilt
export const FRUITS = ['apfel', 'kirsche', 'orange', 'pfirsich', 'birne'];
export const RES_SPOTS = {};
export const TREE_FRUIT = {};
{
  const r = rng(4242), free = (x, z, m) => grass(x, z) && !nearBuilding(x, z, m) && !onPath(x, z, 1) && !onPlaza(x, z, 2.2) && Math.hypot(x - SPAWN.x, z - SPAWN.z) > 2.5;
  const taken = [];
  const far = (x, z, d) => taken.every(([a, b]) => Math.hypot(a - x, b - z) >= d);
  for (let i = 0; i < 900 && taken.length < 38; i++) {
    const x = Math.round((r() - 0.5) * 2 * MAP), z = Math.round((r() - 0.5) * 2 * MAP);
    if (!free(x, z, 1.6) || !far(x, z, 3.6)) continue;
    taken.push([x, z]);
    const k = x + ',' + z;
    RES_SPOTS[k] = 'tree';
    TREE_FRUIT[k] = r() < 0.6 ? 'apfel' : FRUITS[1 + Math.floor(r() * 4)];
  }
  for (let i = 0; i < 600 && Object.values(RES_SPOTS).filter(v => v === 'palm').length < 12; i++) {
    const x = Math.round((r() - 0.5) * 2 * MAP), z = Math.round((r() - 0.5) * 2 * MAP);
    if (!sand(x, z) || !far(x, z, 3.4) || nearBuilding(x, z, 1.5) || Math.abs(x + 9) < 2.5) continue;
    taken.push([x, z]);
    RES_SPOTS[x + ',' + z] = 'palm';
    TREE_FRUIT[x + ',' + z] = 'kokosnuss';
  }
  for (let i = 0, n = 0; i < 600 && n < 7; i++) {
    const x = Math.round((r() - 0.5) * 2 * MAP), z = Math.round((r() - 0.5) * 2 * MAP);
    if (!free(x, z, 1.5) || !far(x, z, 2.8)) continue;
    taken.push([x, z]);
    RES_SPOTS[x + ',' + z] = 'rock';
    n++;
  }
}
export const FRUIT_REGROW = 3; // Tage, bis ein geschüttelter Baum wieder Obst trägt

// Felder gibt es nicht mehr – gepflanzt wird überall auf dem Rasen
export const FIELDS = [null, [0, 0, -1, -1]];

// Alle Gegenstände. cat = Warengruppe für Preis-Ausbauten und Museum.
export const ITEMS = {
  apfel:     { name: 'Apfel',        icon: '🍎', sell: 100, cat: 'fruit', xp: 1 },
  kirsche:   { name: 'Kirschen',     icon: '🍒', sell: 100, cat: 'fruit', xp: 1 },
  orange:    { name: 'Orange',       icon: '🍊', sell: 100, cat: 'fruit', xp: 1 },
  pfirsich:  { name: 'Pfirsich',     icon: '🍑', sell: 100, cat: 'fruit', xp: 1 },
  birne:     { name: 'Birne',        icon: '🍐', sell: 100, cat: 'fruit', xp: 1 },
  kokosnuss: { name: 'Kokosnuss',    icon: '🥥', sell: 250, cat: 'fruit', xp: 2 },
  holz:      { name: 'Holz',         icon: '🪵', sell: 60,  cat: 'mat', xp: 1 },
  ast:       { name: 'Ast',          icon: '🥢', sell: 5,   cat: 'mat', xp: 1 },
  stein:     { name: 'Stein',        icon: '🪨', sell: 75,  cat: 'mat', xp: 1 },
  lehm:      { name: 'Lehm',         icon: '🧱', sell: 100, cat: 'mat', xp: 1 },
  eisen:     { name: 'Eisennugget',  icon: '🔩', sell: 375, cat: 'mat', xp: 3 },
  unkraut:   { name: 'Unkraut',      icon: '🌿', sell: 10,  cat: 'mat', xp: 1 },
  sternsplitter: { name: 'Sternsplitter', icon: '🌟', sell: 300, cat: 'misc', xp: 3 },
  goldnugget: { name: 'Goldnugget',  icon: '🪙', sell: 10000, cat: 'misc', xp: 10 },
  neopren:   { name: 'Neoprenanzug', icon: '🤿', buy: 3000, lvl: 1, gear: true },
  perle:     { name: 'Perle',        icon: '⚪', sell: 10000, cat: 'misc', xp: 10 },
  ruebe:     { name: 'Rübe',         icon: '🍠', cat: 'misc', turnip: true },
  faule_ruebe: { name: 'Faule Rübe', icon: '🥀', sell: 0, cat: 'misc' },
  mehl:      { name: 'Mehl',         icon: '🥡', buy: 40 },
  zucker:    { name: 'Zucker',       icon: '🧂', buy: 40 },
  milch:     { name: 'Milch',        icon: '🥛', buy: 60 },
  ei:        { name: 'Ei',           icon: '🥚', buy: 40 },
  // Gerichte
  brot:      { name: 'Inselbrot',    icon: '🍞', sell: 260, cat: 'dish', xp: 3 },
  pfannkuchen: { name: 'Pfannkuchen', icon: '🥞', sell: 380, cat: 'dish', xp: 4 },
  apfelkuchen: { name: 'Apfelkuchen', icon: '🥧', sell: 620, cat: 'dish', xp: 6 },
  kirschtorte: { name: 'Kirschtorte', icon: '🍰', sell: 640, cat: 'dish', xp: 6 },
  saft:      { name: 'Orangensaft',  icon: '🧃', sell: 420, cat: 'dish', xp: 4 },
  sorbet:    { name: 'Pfirsich-Sorbet', icon: '🍧', sell: 480, cat: 'dish', xp: 5 },
  kokosmilch:{ name: 'Kokos-Shake',  icon: '🥤', sell: 700, cat: 'dish', xp: 6 },
  fischsuppe:{ name: 'Fischsuppe',   icon: '🍜', sell: 520, cat: 'dish', xp: 5 },
  suppe:     { name: 'Kürbissuppe',  icon: '🍲', sell: 900, cat: 'dish', xp: 8 },
  eintopf:   { name: 'Gemüseeintopf', icon: '🥘', sell: 560, cat: 'dish', xp: 5 },
  salat:     { name: 'Tomatensalat', icon: '🥗', sell: 300, cat: 'dish', xp: 3 },
};
for (const [k, c] of Object.entries(CROPS)) {
  ITEMS[k] = { name: c.name, icon: c.icon, sell: c.sell, cat: c.cat, xp: c.xp };
  ITEMS['s_' + k] = { name: c.name + (isFlower(k) ? '-Samen' : '-Saat'), icon: c.icon, buy: c.seed, lvl: c.lvl, seed: k };
}

// Fische: [id, Name, Symbol, Preis, Gewicht je Angel-Stufe 1..3, Jahreszeiten|null, Ort: 'river' | 'sea' | 'pond', Schattengröße 1..6 (6 = Flosse)]
export const FISH = [
  ['barsch', 'Barsch', '🐟', 80, [40, 30, 22], null, 'river', 3],
  ['forelle', 'Forelle', '🐠', 160, [26, 26, 24], ['spring', 'autumn', 'winter'], 'river', 3],
  ['krebs', 'Flusskrebs', '🦞', 200, [12, 16, 18], null, 'river', 2],
  ['hecht', 'Hecht', '🐟', 1100, [2, 6, 10], ['autumn', 'winter'], 'river', 5],
  ['lachs', 'Lachs', '🍣', 700, [3, 7, 10], ['autumn'], 'river', 4],
  ['karpfen', 'Karpfen', '🎏', 300, [30, 26, 22], null, 'pond', 3],
  ['goldfisch', 'Goldfisch', '🐠', 1300, [3, 6, 9], null, 'pond', 1],
  ['frosch', 'Frosch', '🐸', 120, [20, 18, 14], ['spring', 'summer'], 'pond', 2],
  ['makrele', 'Makrele', '🐟', 150, [40, 30, 22], null, 'sea', 3],
  ['tintenfisch', 'Tintenfisch', '🦑', 500, [16, 18, 18], ['spring', 'summer', 'autumn'], 'sea', 3],
  ['kugelfisch', 'Kugelfisch', '🐡', 250, [12, 14, 14], ['summer'], 'sea', 3],
  ['krabbe', 'Krabbe', '🦀', 180, [18, 16, 14], null, 'sea', 2],
  ['rochen', 'Rochen', '🐟', 3000, [1, 4, 7], ['summer', 'autumn'], 'sea', 5],
  ['hai', 'Hai', '🦈', 8000, [0, 2, 5], ['summer'], 'sea', 6],
  ['flaschenpost', 'Flaschenpost', '📜', 300, [3, 4, 5], null, 'sea', 2],
  ['schatz', 'Schatztruhe', '💎', 2000, [0, 1, 3], null, 'sea', 4],
];
const NOT_MUSEUM = ['flaschenpost', 'schatz'];
for (const [id, name, icon, sell] of FISH) ITEMS[id] = { name, icon, sell, cat: NOT_MUSEUM.includes(id) ? 'misc' : 'fish', xp: Math.ceil(sell / 150) };

// Insekten (Kescher): [id, Name, Symbol, Preis, Jahreszeiten, 'day'|'night'|'any', Gewicht]
export const BUGS = [
  ['kohlweissling', 'Kohlweißling', '🦋', 160, ['spring', 'summer'], 'day', 30],
  ['zitronenfalter', 'Zitronenfalter', '🦋', 240, ['spring'], 'day', 20],
  ['blaeuling', 'Bläuling', '🦋', 600, ['summer'], 'day', 8],
  ['marienkaefer', 'Marienkäfer', '🐞', 200, ['spring', 'summer'], 'day', 22],
  ['biene', 'Honigbiene', '🐝', 200, ['spring', 'summer'], 'day', 18],
  ['raupe', 'Raupe', '🐛', 100, ['spring', 'autumn'], 'any', 18],
  ['grashuepfer', 'Grashüpfer', '🦗', 280, ['summer', 'autumn'], 'day', 16],
  ['ameise', 'Ameise', '🐜', 80, ['spring', 'summer', 'autumn'], 'any', 14],
  ['schnecke', 'Weinbergschnecke', '🐌', 250, ['spring', 'summer', 'autumn'], 'any', 10],
  ['gluehwuermchen', 'Glühwürmchen', '✨', 300, ['summer'], 'night', 30],
  ['hirschkaefer', 'Hirschkäfer', '🪲', 2000, ['summer'], 'night', 6],
  ['spinne', 'Kreuzspinne', '🕷️', 480, ['autumn'], 'night', 16],
  ['nachtfalter', 'Nachtfalter', '🦋', 300, ['spring', 'summer', 'autumn'], 'night', 22],
  ['wintermuecke', 'Wintermücke', '🦟', 130, ['winter'], 'any', 30],
  ['schneefloh', 'Schneefloh', '❄️', 400, ['winter'], 'day', 12],
];

// Ausgrabungen (Schaufel an den Stern-Rissen): [id, Name, Symbol, Preis, Gewicht]
export const FOSSILS = [
  ['ammonit', 'Ammonit', '🐚', 1100, 22],
  ['knochen', 'Saurierknochen', '🦴', 1000, 22],
  ['zahn', 'Saurierzahn', '🦷', 1500, 14],
  ['abdruck', 'Pfotenabdruck', '🐾', 1200, 14],
  ['schaedel', 'Saurierschädel', '💀', 2500, 8],
  ['bernstein', 'Bernstein', '🟠', 1300, 10],
  ['amphore', 'Uralte Amphore', '🏺', 1800, 8],
  ['kristall', 'Kristall', '🔮', 2000, 6],
];

// Muscheln & Strandgut (liegen jeden Morgen neu am Strand): [id, Name, Symbol, Preis, Gewicht]
export const SHELLS = [
  ['herzmuschel', 'Herzmuschel', '🐚', 120, 34],
  ['kauri', 'Kaurischnecke', '🫧', 60, 30],
  ['jakobsmuschel', 'Jakobsmuschel', '🦪', 200, 18],
  ['sanddollar', 'Sanddollar', '🍪', 120, 12],
  ['koralle', 'Koralle', '🪸', 500, 6],
];
export const SHELLS_PER_DAY = 7, WEEDS_PER_DAY = 9;

// Meerestiere (Tauchen mit dem Neoprenanzug): [id, Name, Symbol, Preis, Gewicht]
export const SEA = [
  ['seestern', 'Seestern', '⭐', 500, 26], ['seegurke', 'Seegurke', '🥒', 500, 20], ['seeanemone', 'Seeanemone', '🌺', 500, 18],
  ['auster', 'Auster', '🦪', 1100, 14], ['krake', 'Krake', '🐙', 1200, 10], ['garnele', 'Garnele', '🦐', 1400, 10],
  ['seeigel', 'Seeigel', '🌰', 1700, 8], ['qualle', 'Ohrenqualle', '🪼', 600, 12], ['hummer', 'Hummer', '🦞', 4500, 4],
];
export const DIVES = 8;

// Platzierbare Dinge: Deko und Obstbäume. solid = man kann nicht hindurchlaufen. glow = leuchtet nachts.
export const PLACE = {
  weg:        { name: 'Steinweg',      icon: '🧱', buy: 20,   lvl: 1, kind: 'deco' },
  blumen:     { name: 'Blumenbeet',    icon: '🌷', buy: 120,  lvl: 1, kind: 'deco' },
  zaun:       { name: 'Holzzaun',      icon: '🪵', buy: 60,   lvl: 1, kind: 'deco', solid: 1 },
  heu:        { name: 'Strohballen',   icon: '🟨', buy: 150,  lvl: 2, kind: 'deco', solid: 1 },
  pilz:       { name: 'Fliegenpilz',   icon: '🍄', buy: 200,  lvl: 1, kind: 'deco' },
  laterne:    { name: 'Laterne',       icon: '🏮', buy: 400,  lvl: 2, kind: 'deco', solid: 1, glow: 1 },
  zwerg:      { name: 'Gartenzwerg',   icon: '🧙', buy: 600,  lvl: 2, kind: 'deco', solid: 1 },
  bank:       { name: 'Parkbank',      icon: '🪑', buy: 800,  lvl: 2, kind: 'deco', solid: 1 },
  vogelhaus:  { name: 'Vogelhäuschen', icon: '🐦', buy: 700,  lvl: 3, kind: 'deco', solid: 1 },
  kirschbaum: { name: 'Kirschblütenbaum', icon: '🌸', buy: 1800, lvl: 3, kind: 'deco', solid: 1 },
  herz:       { name: 'Herzbogen',     icon: '💕', buy: 2000, lvl: 4, kind: 'deco' },
  brunnen:    { name: 'Brunnen',       icon: '⛲', buy: 3000, lvl: 5, kind: 'deco', solid: 1 },
  sonnenschirm: { name: 'Sonnenschirm', icon: '⛱️', buy: 1200, lvl: 2, kind: 'deco', solid: 1 },
  liegestuhl: { name: 'Liegestuhl',    icon: '🪑', buy: 900,  lvl: 2, kind: 'deco', solid: 1, sit: 1 },
  sternlampe: { name: 'Sternenlampe',  icon: '🌠', lvl: 1, kind: 'deco', solid: 1, glow: 1, desc: 'Nur selbst gebaut: aus Sternsplittern' },
  apfelbaum:  { name: 'Apfelbaum',     icon: '🌳', buy: 900,  lvl: 2, kind: 'producer', solid: 1, item: 'apfel', n: 3, every: 2 * DAY, desc: 'Trägt alle zwei Tage 3 Äpfel' },
  orangenbaum:{ name: 'Orangenbaum',   icon: '🌳', buy: 900,  lvl: 3, kind: 'producer', solid: 1, item: 'orange', n: 3, every: 2 * DAY, desc: 'Trägt alle zwei Tage 3 Orangen' },
  pfirsichbaum:{ name: 'Pfirsichbaum', icon: '🌳', buy: 900,  lvl: 3, kind: 'producer', solid: 1, item: 'pfirsich', n: 3, every: 2 * DAY, desc: 'Trägt alle zwei Tage 3 Pfirsiche' },
  kirschenbaum:{ name: 'Kirschbaum',   icon: '🌳', buy: 900,  lvl: 4, kind: 'producer', solid: 1, item: 'kirsche', n: 3, every: 2 * DAY, desc: 'Trägt alle zwei Tage 3 Kirschen' },
  birnbaum:   { name: 'Birnbaum',      icon: '🌳', buy: 900,  lvl: 4, kind: 'producer', solid: 1, item: 'birne', n: 3, every: 2 * DAY, desc: 'Trägt alle zwei Tage 3 Birnen' },
};
for (const [k, p] of Object.entries(PLACE)) ITEMS[k] = { name: p.name, icon: p.icon, buy: p.buy, lvl: p.lvl, place: k, ...(p.buy ? {} : { sell: 500, cat: 'misc' }) };
export const MACHINE_CAP = 20;

// Ausbau: cost[i] = Preis für die nächste Stufe, req[i] = benötigtes Insel-Level.
export const UPGRADES = {
  house:  { tab: 'farm',  name: 'Haus ausbauen', icon: '🏡', start: 1, cost: [9800, 39800], req: [3, 6],
            desc: l => ['', 'Kleines Häuschen', 'Gemütliches Haus mit Anbau', 'Traumhaus mit Turm'][l] },
  can:    { tab: 'tools', name: 'Gießkanne', icon: '💧', start: 1, cost: [800, 2500, 6000], req: [2, 4, 7],
            desc: l => `Gießt ${AREA_NAME[l]}` },
  boots:  { tab: 'tools', name: 'Laufschuhe', icon: '👟', start: 1, cost: [600, 2000, 5000], req: [1, 3, 6],
            desc: l => `Tempo ${Math.round(SPEED[l] / SPEED[1] * 100)}%` },
  rod:    { tab: 'tools', name: 'Angel', icon: '🎣', start: 1, cost: [1200, 4800], req: [2, 5],
            desc: l => ['', 'Einfache Angel', 'Seltenere Fische, schnellerer Biss', 'Profi-Angel: Haie & Schätze!'][l] },
  q_fruit:  { tab: 'goods', name: 'Obst & Blumen', icon: '🍑', start: 0, cost: [600, 1600, 4000, 9000, 18000], req: [1, 2, 4, 6, 8], desc: l => `+${l * 20}% Verkaufspreis` },
  q_veg:    { tab: 'goods', name: 'Gemüse', icon: '🥕', start: 0, cost: [600, 1600, 4000, 9000, 18000], req: [2, 3, 5, 7, 9], desc: l => `+${l * 20}% Verkaufspreis` },
  q_fish:   { tab: 'goods', name: 'Fischhändler', icon: '🐟', start: 0, cost: [600, 1600, 4000, 9000, 18000], req: [2, 3, 5, 7, 9], desc: l => `+${l * 20}% Verkaufspreis` },
  q_bug:    { tab: 'goods', name: 'Naturkunde', icon: '🦋', start: 0, cost: [600, 1600, 4000, 9000, 18000], req: [2, 3, 5, 7, 9], desc: l => `+${l * 20}% für Insekten, Fossilien & Muscheln` },
  q_mat:    { tab: 'goods', name: 'Rohstoffe', icon: '🪵', start: 0, cost: [500, 1400, 3500, 8000, 16000], req: [2, 3, 5, 7, 9], desc: l => `+${l * 20}% für Holz, Steine & Eisen` },
  q_dish:   { tab: 'goods', name: 'Feinkost', icon: '🍰', start: 0, cost: [800, 2000, 5000, 10000, 20000], req: [3, 4, 6, 8, 10], desc: l => `+${l * 20}% für Gekochtes` },
};
export const AREA_NAME = ['', '1 Feld', '3 Felder', '3×3 Felder', '5×5 Felder'];
export const SPEED = [0, 4, 5, 6, 7.2];
export const fieldSize = () => '';

export const needXp = lvl => 40 * lvl * lvl;
export const MAX_LEVEL = 20;

export const HATS = [
  ['straw', '👒 Strohhut'], ['cap', '🧢 Mütze'], ['flowers', '🌼 Blumenkranz'],
  ['bunny', '🐰 Hasenohren'], ['crown', '👑 Krone'], ['none', '🙂 Ohne'],
];
export const COLORS = ['#ff8fab', '#ffb86b', '#ffe066', '#8fd694', '#6cc4ff', '#b39cff', '#ff6b6b', '#f5f5f5'];
export const EMOTE_LIST = [['❤️', 'Liebe'], ['👋', 'Winken'], ['😂', 'Lachen'], ['😮', 'Staunen'], ['🎉', 'Jubeln'], ['🥰', 'Verliebt'], ['😘', 'Küsschen'], ['💃', 'Tanzen'],
  ['👏', 'Klatschen'], ['🎵', 'Singen'], ['👍', 'Super'], ['✨', 'Drehen'], ['😊', 'Schüchtern'], ['🙈', 'Verlegen'], ['🤔', 'Grübeln'], ['😢', 'Traurig'], ['😡', 'Grummelig'], ['😴', 'Müde'], ['💤', 'Schlafen'], ['🍀', 'Glück']];
export const EMOTES = EMOTE_LIST.map(e => e[0]);
export const SOCIAL = { hug: ['🤗', 'Umarmen'], kiss: ['😘', 'Küsschen'], highfive: ['✋', 'High-Five'], dance: ['💃', 'Zusammen tanzen'] };

for (const [id, name, icon, sell] of BUGS) ITEMS[id] = { name, icon, sell, cat: 'bug', xp: Math.ceil(sell / 150) };
for (const [id, name, icon, sell] of FOSSILS) ITEMS[id] = { name, icon, sell, cat: 'bug', xp: Math.ceil(sell / 200) };
for (const [id, name, icon, sell] of SHELLS) ITEMS[id] = { name, icon, sell, cat: 'bug', xp: 1 };
for (const [id, name, icon, sell] of SEA) ITEMS[id] = { name, icon, sell, cat: 'fish', xp: Math.ceil(sell / 200) };
export const ALBUM = { fish: FISH.filter(f => !NOT_MUSEUM.includes(f[0])).map(f => f[0]), sea: SEA.map(s => s[0]), bug: BUGS.map(b => b[0]), fossil: FOSSILS.map(f => f[0]), shell: SHELLS.map(s => s[0]) };
// Was ins Museum darf
export const MUSEUM = { fish: ALBUM.fish, sea: ALBUM.sea, bug: ALBUM.bug, fossil: ALBUM.fossil };
export const MUSEUM_ALL = [...MUSEUM.fish, ...MUSEUM.sea, ...MUSEUM.bug, ...MUSEUM.fossil];

// Erfolge: gemeinsame Ziele mit Belohnung (Taler)
const decos = s => Object.values(s.obj).filter(o => PLACE[o.k]?.kind === 'deco').length;
const donated = s => Object.keys(s.museum || {}).length;
export const ACHIEVEMENTS = [
  ['obst1', '🍎', 'Frisch vom Baum', 'Zum ersten Mal Obst gepflückt', s => (s.stats.fruit || 0) >= 1, 100],
  ['obst100', '🧺', 'Obstkörbe voll', '100 Obst gepflückt', s => (s.stats.fruit || 0) >= 100, 1500],
  ['blume', '🌷', 'Grüner Daumen', '10 Blumen gepflanzt', s => (s.stats.planted || 0) >= 10, 400],
  ['ernte100', '🌻', 'Blütenmeer', '100 Blumen & Gemüse geerntet', s => s.stats.harvested >= 100, 1500],
  ['kuerbis', '🎃', 'Riesenkürbis', 'Einen Kürbis geerntet', s => (s.stats.h_kuerbis || 0) >= 1, 800],
  ['fisch10', '🎣', 'Anglerglück', '10 Fische gefangen', s => s.stats.fish >= 10, 500],
  ['fisch100', '🐟', 'Meister-Angler', '100 Fische gefangen', s => s.stats.fish >= 100, 4000],
  ['hai', '🦈', 'Der große Fang', 'Einen Hai gefangen', s => (s.album?.hai || 0) >= 1, 2000],
  ['schatz', '💎', 'Schatzsucher', 'Eine Schatztruhe geangelt', s => (s.stats.treasure || 0) >= 1, 1000],
  ['kescher10', '🦋', 'Insektenfreunde', '10 Insekten gefangen', s => (s.stats.bugs || 0) >= 10, 500],
  ['muschel', '🐚', 'Strandgut', '20 Muscheln gesammelt', s => (s.stats.shells || 0) >= 20, 600],
  ['unkraut', '🌿', 'Inselpflege', '50 Unkraut gezupft', s => (s.stats.weeds || 0) >= 50, 800],
  ['fossil5', '🦴', 'Hobby-Archäologen', '5 verschiedene Funde ausgegraben', s => FOSSILS.filter(f => s.album?.[f[0]]).length >= 5, 1000],
  ['museum1', '🏛️', 'Eröffnung!', 'Das erste Stück im Museum ausgestellt', s => donated(s) >= 1, 300],
  ['museum20', '🖼️', 'Sammlerherzen', '20 Stücke im Museum', s => donated(s) >= 20, 3000],
  ['museum', '🏆', 'Komplettes Museum', 'Alle Fische, Insekten und Fossilien ausgestellt', s => donated(s) >= MUSEUM_ALL.length, 30000],
  ['auftrag10', '📋', 'Inselhelden', '10 Wünsche der Nachbarn erfüllt', s => s.stats.orders >= 10, 1200],
  ['reich', '💰', 'Gut betucht', '10.000 Taler verdient', s => s.stats.earned >= 10000, 800],
  ['reich2', '👑', 'Insel-Millionäre', '1.000.000 Taler verdient', s => s.stats.earned >= 1000000, 20000],
  ['deko20', '🏮', 'Inselgestalter', '20 Deko-Stücke aufgestellt', s => decos(s) >= 20, 1000],
  ['herz', '💕', 'Für immer zusammen', 'Einen Herzbogen aufgestellt', s => Object.values(s.obj).some(o => o.k === 'herz'), 500],
  ['haus', '🏰', 'Traumhaus', 'Das Haus voll ausgebaut', s => s.up.house >= 3, 5000],
  ['level5', '⭐', 'Aufsteiger', 'Insel-Level 5 erreicht', s => s.level >= 5, 600],
  ['level10', '🌟', 'Trauminsel', 'Insel-Level 10 erreicht', s => s.level >= 10, 4000],
  ['tag10', '📅', 'Treue Seelen', '10 Tage zusammen auf der Insel', s => s.day >= 10, 1000],
  ['regen', '🌧️', 'Regentänzer', 'Einen Regen- oder Schneetag erlebt', s => s.weather !== 'sun', 200],
  ['koch', '🍳', 'Sterneköche', 'Das erste Gericht gekocht', s => (s.stats.cooked || 0) >= 1, 300],
  ['holz', '🪓', 'Holzfäller', '50 Holz gesammelt', s => (s.stats.wood || 0) >= 50, 600],
  ['werk', '🔨', 'Selbstgemacht', 'Etwas an der Werkbank gebaut', s => (s.stats.crafted || 0) >= 1, 300],
  ['freund', '💛', 'Beste Nachbarn', 'Mit einem Nachbarn 5 Herzen erreicht', s => Object.values(s.npc || {}).some(n => n.f >= 500), 1500],
  ['dorf', '🏘️', 'Die ganze Insel mag euch', 'Mit allen Nachbarn 3 Herzen erreicht', s => NPC_IDS.every(k => (s.npc?.[k]?.f || 0) >= 300), 3000],
  ['ballon', '🎈', 'Volltreffer!', '5 Geschenkballons abgeschossen', s => (s.stats.balloons || 0) >= 5, 800],
  ['wunsch', '🌠', 'Sternenkinder', '10 Wünsche an Sternschnuppen', s => (s.stats.wishes || 0) >= 10, 800],
  ['ruebe', '📈', 'Börsen-Profis', 'Mit Rüben 10.000 Taler Gewinn gemacht', s => (s.stats.turnipProfit || 0) >= 10000, 3000],
  ['wege', '🧱', 'Inselplaner', '50 Wegstücke verlegt', s => Object.keys(s.paths || {}).length >= 50, 1000],
  ['jahr', '🎂', 'Ein ganzes Jahr', 'Alle vier Jahreszeiten zusammen erlebt', s => s.day >= 29, 5000],
].map(([id, icon, name, desc, test, reward]) => ({ id, icon, name, desc, test, reward }));

// Rezepte: Werkbank (craft) und Küche (cook)
export const RECIPES = {
  r_zaun: { st: 'craft', out: 'zaun', n: 2, in: { holz: 2 } },
  r_weg: { st: 'craft', out: 'weg', n: 4, in: { stein: 2 } },
  r_heu: { st: 'craft', out: 'heu', n: 1, in: { weizen: 6 }, lvl: 2 },
  r_bank: { st: 'craft', out: 'bank', n: 1, in: { holz: 6, ast: 2 } },
  r_vogelhaus: { st: 'craft', out: 'vogelhaus', n: 1, in: { holz: 5, ast: 3 } },
  r_laterne: { st: 'craft', out: 'laterne', n: 1, in: { eisen: 1, stein: 2 } },
  r_zwerg: { st: 'craft', out: 'zwerg', n: 1, in: { lehm: 3 } },
  r_blumen: { st: 'craft', out: 'blumen', n: 1, in: { holz: 2, tulpe: 3 } },
  r_brunnen: { st: 'craft', out: 'brunnen', n: 1, in: { stein: 12, eisen: 2 }, lvl: 5 },
  r_sternlampe: { st: 'craft', out: 'sternlampe', n: 1, in: { sternsplitter: 3, eisen: 1 } },
  brot: { st: 'cook', out: 'brot', n: 1, in: { weizen: 3 } },
  pfannkuchen: { st: 'cook', out: 'pfannkuchen', n: 1, in: { mehl: 1, ei: 1, milch: 1 } },
  apfelkuchen: { st: 'cook', out: 'apfelkuchen', n: 1, in: { apfel: 3, mehl: 1, zucker: 1 } },
  kirschtorte: { st: 'cook', out: 'kirschtorte', n: 1, in: { kirsche: 3, mehl: 1, ei: 1 } },
  saft: { st: 'cook', out: 'saft', n: 1, in: { orange: 3 } },
  sorbet: { st: 'cook', out: 'sorbet', n: 1, in: { pfirsich: 2, zucker: 1 } },
  kokosmilch: { st: 'cook', out: 'kokosmilch', n: 1, in: { kokosnuss: 1, milch: 1 } },
  fischsuppe: { st: 'cook', out: 'fischsuppe', n: 1, in: { barsch: 1, makrele: 1, kartoffel: 1 } },
  salat: { st: 'cook', out: 'salat', n: 1, in: { tomate: 2, karotte: 1 } },
  eintopf: { st: 'cook', out: 'eintopf', n: 1, in: { kartoffel: 2, karotte: 1, tomate: 1 } },
  suppe: { st: 'cook', out: 'suppe', n: 1, in: { kuerbis: 1, milch: 1 } },
};
export const DIG_SPOTS_PER_DAY = 5;

// Nachbarn: Vorlieben (Geschenke), Lieblingsort (sie spazieren dort herum), Dankesgeschenk im Brief
export const NPC_DATA = {
  mira: { name: 'Mira', icon: '🦔', likes: ['apfel', 'kirsche', 'tulpe', 'weizen'], loves: ['kirschtorte', 'apfelkuchen'], dislikes: ['kugelfisch', 'krebs'], spot: [-12, 4, 2.6, 1.6], gift: ['apfelkuchen', 1] },
  bruno: { name: 'Bruno', icon: '🐻', likes: ['holz', 'apfel', 'brot', 'forelle'], loves: ['lachs', 'eintopf'], dislikes: ['stein', 'unkraut'], spot: [12.6, 4.6, 1.8, 1.3], gift: ['holz', 15] },
  pippa: { name: 'Pippa', icon: '🦆', likes: ['barsch', 'makrele', 'herzmuschel', 'weizen'], loves: ['kugelfisch', 'fischsuppe'], dislikes: ['ei', 'unkraut'], spot: [-6, 9.5, 2.6, 1.4], gift: ['makrele', 3] },
  lio: { name: 'Lio', icon: '🦊', likes: ['rose', 'koralle', 'pfirsich', 'saft'], loves: ['sonnenblume', 'bernstein'], dislikes: ['kartoffel', 'stein'], spot: [12.8, 2.3, 1.9, 0.9], gift: ['kirschbaum', 1] },
  kalle: { name: 'Kalle', icon: '🫖', likes: ['orange', 'saft', 'tulpe', 'karotte'], loves: ['sorbet', 'kokosmilch'], dislikes: ['hai', 'krebs'], spot: [-12.3, -4, 0.4, 1.0], gift: ['orangenbaum', 1] },
  wanda: { name: 'Wanda', icon: '🔬', likes: ['frosch', 'karpfen', 'seeanemone', 'kristall'], loves: ['goldfisch', 'perle'], dislikes: ['unkraut', 'kartoffel'], spot: [-15, -1.5, 0.8, 0.3], gift: ['neopren', 1] },
};
export const NPC_IDS = Object.keys(NPC_DATA);

// Möbel fürs Haus (Daten in furni-data.js): kaufen im Laden, manche selbst bauen
import { FURNITURE as FURN } from './furni-data.js';
for (const [id, f] of Object.entries(FURN)) {
  ITEMS[id] = { name: f.name, icon: f.icon, buy: f.buy, lvl: f.lvl, furn: id };
  if (f.craft) RECIPES['f_' + id] = { st: 'craft', out: id, n: 1, in: f.craft, lvl: f.lvl };
}

// Quests: die Insel-Geschichte (nacheinander) und tägliche Aufgaben. ev = Ereignis, n = Ziel
export const STORY = [
  { title: 'Willkommen auf der Insel!', desc: 'Schüttelt 3 Bäume – mal sehen, was herunterfällt.', ev: 'shake', n: 3, money: 300, items: { s_tulpe: 4 } },
  { title: 'Obstkorb', desc: 'Sammelt 6 Stück Obst von den Bäumen.', ev: 'fruit', n: 6, money: 300 },
  { title: 'Blumenkinder', desc: 'Pflanzt 4 Blumensamen auf den Rasen.', ev: 'plant', n: 4, money: 200, items: { s_kosmee: 4 } },
  { title: 'Hallo Nachbarn!', desc: 'Plaudert mit vier verschiedenen Nachbarn.', ev: 'met', n: 4, money: 400, items: { apfelkuchen: 1 } },
  { title: 'Strandspaziergang', desc: 'Sammelt 5 Muscheln am Strand.', ev: 'shell', n: 5, money: 300 },
  { title: 'Kleine Händler', desc: 'Verdient 1.000 Taler im Krämerladen.', ev: 'sell', n: 1000, items: { blumen: 1, weg: 8 } },
  { title: 'Holzfäller', desc: 'Hackt 5 Holz mit der Axt.', ev: 'chop', n: 5, money: 300 },
  { title: 'Steinreich', desc: 'Schlagt 3-mal mit der Schaufel auf Felsen.', ev: 'mine', n: 3, money: 300 },
  { title: 'Selbstgebaut', desc: 'Baut etwas an der Werkbank.', ev: 'craft', n: 1, items: { stuhl: 1, hocker: 1 } },
  { title: 'Am Wasser', desc: 'Fangt 3 Fische – im Fluss, im Teich oder im Meer.', ev: 'fish', n: 3, money: 400 },
  { title: 'Krabbeltiere', desc: 'Fangt 3 Insekten mit dem Kescher.', ev: 'bug', n: 3, money: 400 },
  { title: 'Schatzsuche', desc: 'Grabt 2 Funde an den Stern-Rissen aus.', ev: 'dig', n: 2, money: 500 },
  { title: 'Das Museum öffnet', desc: 'Stellt 3 Fundstücke im Museum aus.', ev: 'donate', n: 3, money: 1000, items: { s_rose: 4 } },
  { title: 'Inselpflege', desc: 'Zupft 8 Unkraut.', ev: 'weed', n: 8, money: 400 },
  { title: 'Kochstunde', desc: 'Kocht 2 Gerichte in der Gartenküche.', ev: 'cook', n: 2, items: { herd: 1, kuechenzeile: 1 } },
  { title: 'Ein gemütliches Zuhause', desc: 'Stellt 5 Möbel im Haus auf.', ev: 'furnish', n: 5, items: { teppich_rund: 1, kerzen: 1, topfpflanze: 1 } },
  { title: 'Herzensgeschenk', desc: 'Schenkt einem Nachbarn etwas, das er liebt.', ev: 'gift_love', n: 1, money: 1000 },
  { title: 'Zu zweit', desc: 'Umarmt euch auf der Insel 🤗', ev: 'hug', n: 1, items: { herz: 1, herzteppich: 1 } },
  { title: 'Gute Nacht', desc: 'Schlaft eine Nacht im Bett durch.', ev: 'sleep', n: 1, items: { stehlampe: 1, teddy: 1 } },
  { title: 'Museumsfreunde', desc: 'Stellt insgesamt 15 Stücke im Museum aus.', ev: 'museum', n: 15, money: 3000 },
  { title: 'Insel-Stars', desc: 'Erreicht Insel-Level 8.', ev: 'level', n: 8, money: 5000, items: { bett: 1 } },
];
export const DAILY = [
  ['Gießt 8 Blumen', 'water', 8, 300], ['Erntet 6 Blumen oder Gemüse', 'harvest', 6, 400], ['Pflückt 6 Obst', 'fruit', 6, 400],
  ['Fangt 3 Fische', 'fish', 3, 500], ['Fangt 2 Insekten', 'bug', 2, 500], ['Plaudert mit 2 Nachbarn', 'talk', 2, 300],
  ['Hackt 4 Holz', 'chop', 4, 300], ['Kocht ein Gericht', 'cook', 1, 500], ['Verkauft Waren für 1.500 Taler', 'sell', 1500, 400],
  ['Erfüllt einen Nachbarwunsch', 'order', 1, 600], ['Umarmt euch 💕', 'hug', 1, 300], ['Macht einem Nachbarn ein Geschenk', 'gift', 1, 300],
  ['Grabt etwas aus', 'dig', 1, 400], ['Sammelt 4 Muscheln', 'shell', 4, 300], ['Zupft 5 Unkraut', 'weed', 5, 300], ['Stellt etwas im Museum aus', 'donate', 1, 600], ['Schießt einen Ballon ab', 'balloon', 1, 500],
];

// ---------- Wochentage, Rübenbörse ----------
// Jede Jahreszeit hat 7 Tage = eine Woche, die mit dem Sonntag beginnt.
export const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
export const weekday = day => (day - 1) % 7;
export const TURNIP_STACK = 10;

// ---------- Insel-Designer: Wege ----------
export const PAVE = {
  erde:   { name: 'Erdweg', icon: '🟫', col: '#c9a26b' },
  stein:  { name: 'Steinpflaster', icon: '🪨', col: '#b9b4ad' },
  ziegel: { name: 'Ziegelweg', icon: '🧱', col: '#d27a5a' },
  holz:   { name: 'Holzdielen', icon: '🪵', col: '#c89564' },
  sand:   { name: 'Sandweg', icon: '🏖️', col: '#eedcaa' },
};

// ---------- Geschenkballons ----------
export const BALLOON_GIFTS = [ // [Art, Gewicht]
  ['money', 34], ['holz', 12], ['eisen', 10], ['furn', 26], ['sternsplitter', 6], ['goldnugget', 3], ['deco', 9],
];

// ---------- Tagesabläufe der Nachbarn: [ab Stunde, x, z, Radius x, Radius z] ----------
export const NPC_PLAN = {
  mira:  [[6, -14, 8.8, 1, 0.5], [9, -1.8, 3.6, 1.3, 0.6], [12, -8, 2.3, 1.4, 0.5], [15, -12, 4, 2.4, 1.4], [18, 1.8, 4, 1, 0.5], [20.5, -14, 8.8, 1, 0.5]],
  pippa: [[6, -9, 19.5, 0.2, 2.6], [10, -4, 17, 2.6, 0.8], [13, -12.4, -1.6, 0.8, 0.8], [16, -4.6, 14.6, 1.1, 0.5], [19, -1.6, -1.4, 1, 0.4], [21, -4.6, 14.6, 1.1, 0.5]],
  bruno: [[6, 12.5, 10.6, 1, 0.5], [8, 10.8, 2, 0.4, 1.4], [11, -4.5, -9.4, 1, 0.3], [14, 1.6, 4.4, 1.2, 0.6], [17, 13, -5.2, 1.6, 0.4], [20, 12.5, 10.6, 1, 0.5]],
  lio:   [[6, 15.5, 1.7, 0.6, 0.4], [9, 13, -5.3, 1.7, 0.5], [12, 16.6, 7.5, 0.7, 2], [15, 2.6, 0.2, 0.6, 1.6], [18, 12.8, 2.3, 1.9, 0.9], [20.5, 15.5, 1.7, 0.6, 0.4]],
  kalle: [[6, -9, 10.8, 1, 0.5], [8, -12.3, -4.2, 0.4, 1.0], [11, -1.6, -1.4, 1, 0.4], [14, -8, 4.6, 1.2, 0.5], [17, -12.3, -3.6, 0.4, 0.8], [20, -9, 10.8, 1, 0.5]],
  wanda: [[6, 3, 10.8, 1, 0.5], [8.5, -15, -1.5, 0.8, 0.3], [11.5, 4.6, 4.4, 0.6, 1.0], [14.5, 13, -5.3, 1.5, 0.4], [17.5, -15, -1.5, 0.8, 0.3], [20, 3, 10.8, 1, 0.5]],
};

// ---------- Baupläne (DIY) ----------
// Werkbank-Rezepte muss man erst finden: Flaschenpost am Strand, Geschenkballons, Nachbarn.
export const STARTER_DIY = ['r_zaun', 'r_weg', 'r_bank', 'f_hocker', 'f_stuhl'];
export const DIY_IDS = Object.keys(RECIPES).filter(k => RECIPES[k].st === 'craft');
// Achievements für Tauchen & Baupläne
ACHIEVEMENTS.push(...[
  ['taucher', '🤿', 'Abgetaucht', '10 Meerestiere beim Tauchen gefunden', s => (s.stats.dives || 0) >= 10, 1500],
  ['diy20', '📜', 'Bastelprofis', '20 Baupläne gelernt', s => Object.keys(s.recipes || {}).length >= 20, 2000],
].map(([id, icon, name, desc, test, reward]) => ({ id, icon, name, desc, test, reward })));
