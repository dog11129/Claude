// Spielinhalte: alles, was man kaufen, anbauen, züchten und verbessern kann.

export const DAY = 300;          // Sekunden pro Spieltag
export const WET = 120;          // so lange bleibt gegossener Boden nass
export const MAP = 15;           // Spielfeld geht von -MAP bis +MAP
export const SPAWN = { x: 0, z: -6 };

// Jahreszeiten: je 7 Tage. Pflanzen wachsen in ihrer Saison doppelt so schnell.
export const SEASON_LEN = 7;
export const SEASONS = { spring: ['Frühling', '🌸'], summer: ['Sommer', '☀️'], autumn: ['Herbst', '🍂'], winter: ['Winter', '❄️'] };
export const SEASON_IDS = Object.keys(SEASONS);
const ALL = SEASON_IDS;

export const CROPS = {
  weizen:      { name: 'Weizen',      icon: '🌾', seed: 5,   sell: 12,  grow: 40,  lvl: 1, cat: 'veg',   xp: 1,  yield: 2, sea: ['spring', 'summer', 'autumn'] },
  karotte:     { name: 'Karotte',     icon: '🥕', seed: 10,  sell: 28,  grow: 60,  lvl: 1, cat: 'veg',   xp: 2, sea: ['spring', 'autumn', 'winter'] },
  salatkopf:   { name: 'Salat',       icon: '🥬', seed: 15,  sell: 38,  grow: 70,  lvl: 2, cat: 'veg',   xp: 2, sea: ['spring'] },
  kartoffel:   { name: 'Kartoffel',   icon: '🥔', seed: 20,  sell: 55,  grow: 100, lvl: 2, cat: 'veg',   xp: 3, sea: ['spring', 'autumn'] },
  erdbeere:    { name: 'Erdbeere',    icon: '🍓', seed: 40,  sell: 45,  grow: 120, lvl: 3, cat: 'fruit', xp: 3, regrow: 60, sea: ['spring', 'summer'] },
  brokkoli:    { name: 'Brokkoli',    icon: '🥦', seed: 45,  sell: 110, grow: 150, lvl: 3, cat: 'veg',   xp: 4, sea: ['autumn', 'winter'] },
  tomate:      { name: 'Tomate',      icon: '🍅', seed: 50,  sell: 50,  grow: 140, lvl: 4, cat: 'veg',   xp: 4, regrow: 70, sea: ['summer'] },
  melone:      { name: 'Melone',      icon: '🍉', seed: 90,  sell: 260, grow: 240, lvl: 5, cat: 'fruit', xp: 9, sea: ['summer'] },
  mais:        { name: 'Mais',        icon: '🌽', seed: 60,  sell: 130, grow: 180, lvl: 5, cat: 'veg',   xp: 6, sea: ['summer', 'autumn'] },
  traube:      { name: 'Trauben',     icon: '🍇', seed: 100, sell: 120, grow: 200, lvl: 6, cat: 'fruit', xp: 6, regrow: 90, sea: ['autumn'] },
  sonnenblume: { name: 'Sonnenblume', icon: '🌻', seed: 80,  sell: 170, grow: 200, lvl: 6, cat: 'fruit', xp: 7, sea: ['summer'] },
  kuerbis:     { name: 'Kürbis',      icon: '🎃', seed: 120, sell: 400, grow: 300, lvl: 7, cat: 'veg',   xp: 12, sea: ['autumn'] },
};
for (const c of Object.values(CROPS)) c.sea ||= ALL;

export const ANIMALS = {
  huhn:    { name: 'Huhn',    icon: '🐔', cost: 250,  lvl: 2, home: 'coop', product: 'ei',       time: 90 },
  kuh:     { name: 'Kuh',     icon: '🐄', cost: 900,  lvl: 3, home: 'barn', product: 'milch',    time: 150 },
  schaf:   { name: 'Schaf',   icon: '🐑', cost: 800,  lvl: 4, home: 'barn', product: 'wolle',    time: 200 },
  schwein: { name: 'Schwein', icon: '🐖', cost: 1500, lvl: 6, home: 'barn', product: 'trueffel', time: 240 },
};

export const ANIMAL_NAMES = ['Bella', 'Lotte', 'Flocke', 'Wolke', 'Krümel', 'Muffin', 'Pünktchen', 'Rosi', 'Kiki',
  'Butterblume', 'Hanni', 'Nanni', 'Keks', 'Mimi', 'Paula', 'Schnuffel', 'Tilda', 'Fritzi', 'Bommel', 'Zimt'];

// Wo die Tiere herumlaufen (Gehege) und wo die Gebäude stehen.
export const PENS = {
  coop: { cx: 9,  cz: -2.5, rx: 3,   rz: 1.6 },
  barn: { cx: 10, cz: 10.5, rx: 3.5, rz: 2.2 },
};

// Feste Gebäude: Fläche in Kacheln (x0..x1, z0..z1), was beim Benutzen passiert.
export const BUILDINGS = {
  house:  { x0: -2, x1: 2,  z0: -12, z1: -9, use: 'farm',   name: 'Haus' },
  bin:    { x0: 3,  x1: 3,  z0: -8,  z1: -8, use: 'sell',   name: 'Verkaufskiste' },
  market: { x0: -5, x1: -4, z0: -9,  z1: -9, use: 'shop',   name: 'Marktstand' },
  board:  { x0: -7, x1: -7, z0: -8,  z1: -8, use: 'orders', name: 'Auftragsbrett' },
  coop:   { x0: 8,  x1: 11, z0: -7,  z1: -5, use: 'animals', name: 'Hühnerstall' },
  barn:   { x0: 8,  x1: 12, z0: 5,   z1: 7,  use: 'animals', name: 'Stall' },
  bench:  { x0: 5,  x1: 6,  z0: -10, z1: -10, use: 'craft', name: 'Werkbank' },
  kitchen:{ x0: -6, x1: -5, z0: -12, z1: -12, use: 'cook',  name: 'Gartenküche' },
  mail:   { x0: -2, x1: -2, z0: -8,  z1: -8,  use: 'mail',  name: 'Briefkasten' },
};

// Wilde Bäume (Holz, schütteln) und Felsen (Stein) – füllen sich jeden Morgen wieder auf
export const RES_SPOTS = {
  '-13,-7': 'tree', '-12,13': 'tree', '-6,13': 'tree', '0,13': 'tree', '13,-12': 'tree', '7,-13': 'tree', '13,2': 'tree',
  '-14,-1': 'rock', '4,13': 'rock', '14,-8': 'rock', '-9,-14': 'rock',
};

export const POND = { cx: -11, cz: -10, r: 2.6 };

// Feldgröße je Ausbaustufe: [x0, z0, x1, z1]
export const FIELDS = [null,
  [-6, 0, -1, 4],
  [-7, -1, 0, 5],
  [-9, -2, 1, 6],
  [-11, -3, 2, 8],
  [-13, -4, 3, 10],
];

// Alle Gegenstände im Lager. cat = Warengruppe für Qualitäts-Upgrades.
export const ITEMS = {
  futter:    { name: 'Futter',      icon: '🌿', buy: 8 },
  ei:        { name: 'Ei',          icon: '🥚', sell: 40,  cat: 'animal', xp: 2 },
  milch:     { name: 'Milch',       icon: '🥛', sell: 110, cat: 'animal', xp: 4 },
  wolle:     { name: 'Wolle',       icon: '🧶', sell: 180, cat: 'animal', xp: 5 },
  trueffel:  { name: 'Trüffel',     icon: '🌰', sell: 300, cat: 'animal', xp: 7 },
  apfel:     { name: 'Apfel',       icon: '🍎', sell: 60,  cat: 'fruit',  xp: 2 },
  honig:     { name: 'Honig',       icon: '🍯', sell: 200, cat: 'animal', xp: 5 },
  mayo:      { name: 'Mayonnaise',  icon: '🥣', sell: 110, cat: 'craft',  xp: 3 },
  kaese:     { name: 'Käse',        icon: '🧀', sell: 260, cat: 'craft',  xp: 5 },
  stoff:     { name: 'Stoff',       icon: '🧵', sell: 420, cat: 'craft',  xp: 7 },
  marmelade: { name: 'Marmelade',   icon: '🫙', sell: 140, cat: 'craft',  xp: 3 },
  oel:       { name: 'Sonnenöl',    icon: '🧴', sell: 400, cat: 'craft',  xp: 6 },
  barsch:    { name: 'Barsch',      icon: '🐟', sell: 35,  cat: 'fish',   xp: 2 },
  forelle:   { name: 'Forelle',     icon: '🐠', sell: 80,  cat: 'fish',   xp: 4 },
  krebs:     { name: 'Flusskrebs',  icon: '🦀', sell: 140, cat: 'fish',   xp: 6 },
  kugelfisch:{ name: 'Kugelfisch',  icon: '🐡', sell: 240, cat: 'fish',   xp: 9 },
  schatz:    { name: 'Schatztruhe', icon: '💎', sell: 700, cat: 'fish',   xp: 20 },
  karpfen:   { name: 'Karpfen',     icon: '🎏', sell: 70,  cat: 'fish',   xp: 3 },
  frosch:    { name: 'Frosch',      icon: '🐸', sell: 90,  cat: 'fish',   xp: 4 },
  hecht:     { name: 'Hecht',       icon: '🦈', sell: 260, cat: 'fish',   xp: 9 },
  flaschenpost: { name: 'Flaschenpost', icon: '📜', sell: 150, cat: 'fish', xp: 6 },
  holz:      { name: 'Holz',        icon: '🪵', sell: 10,  cat: 'mat',    xp: 1 },
  stein:     { name: 'Stein',       icon: '🪨', sell: 12,  cat: 'mat',    xp: 1 },
  brot:      { name: 'Bauernbrot',  icon: '🍞', sell: 60,  cat: 'dish',   xp: 3 },
  pfannkuchen: { name: 'Pfannkuchen', icon: '🥞', sell: 230, cat: 'dish', xp: 5 },
  salat:     { name: 'Gartensalat', icon: '🥗', sell: 200, cat: 'dish',   xp: 5 },
  suppe:     { name: 'Kürbissuppe', icon: '🍲', sell: 620, cat: 'dish',   xp: 9 },
  kuchen:    { name: 'Erdbeerkuchen', icon: '🍰', sell: 380, cat: 'dish', xp: 7 },
  fischsuppe:{ name: 'Fischsuppe',  icon: '🍜', sell: 210, cat: 'dish',   xp: 5 },
  honigtee:  { name: 'Apfel-Honig-Tee', icon: '🍵', sell: 330, cat: 'dish', xp: 6 },
  eintopf:   { name: 'Gemüseeintopf', icon: '🥘', sell: 340, cat: 'dish', xp: 6 },
  sorbet:    { name: 'Melonensorbet', icon: '🍧', sell: 420, cat: 'dish', xp: 7 },
  saft:      { name: 'Traubensaft', icon: '🧃', sell: 420, cat: 'dish',   xp: 7 },
};
for (const [k, c] of Object.entries(CROPS)) {
  ITEMS[k] = { name: c.name, icon: c.icon, sell: c.sell, cat: c.cat, xp: c.xp };
  ITEMS['s_' + k] = { name: c.name + '-Samen', icon: c.icon, buy: c.seed, lvl: c.lvl, seed: k };
}

export const FISH = [ // [id, Gewicht je Angel-Stufe 1..3, Jahreszeiten]
  ['barsch', [60, 45, 30]],
  ['forelle', [30, 32, 30], ['spring', 'autumn', 'winter']],
  ['karpfen', [25, 25, 22], ['summer', 'autumn']],
  ['frosch', [12, 12, 10], ['spring', 'summer']],
  ['krebs', [9, 15, 22]],
  ['hecht', [3, 8, 14], ['autumn', 'winter']],
  ['kugelfisch', [1, 7, 14], ['summer']],
  ['flaschenpost', [1, 3, 5]],
  ['schatz', [0, 1, 4]],
];

// Insekten (Kescher): [id, Name, Symbol, Preis, Jahreszeiten, 'day'|'night'|'any', Gewicht]
export const BUGS = [
  ['kohlweissling', 'Kohlweißling', '🦋', 60, ['spring', 'summer'], 'day', 30],
  ['zitronenfalter', 'Zitronenfalter', '🦋', 90, ['spring'], 'day', 20],
  ['blaeuling', 'Bläuling', '🦋', 220, ['summer'], 'day', 8],
  ['marienkaefer', 'Marienkäfer', '🐞', 70, ['spring', 'summer'], 'day', 22],
  ['biene', 'Honigbiene', '🐝', 80, ['spring', 'summer'], 'day', 18],
  ['raupe', 'Raupe', '🐛', 40, ['spring', 'autumn'], 'any', 18],
  ['grashuepfer', 'Grashüpfer', '🦗', 100, ['summer', 'autumn'], 'day', 16],
  ['ameise', 'Ameise', '🐜', 30, ['spring', 'summer', 'autumn'], 'any', 14],
  ['schnecke', 'Weinbergschnecke', '🐌', 50, ['spring', 'summer', 'autumn'], 'any', 10],
  ['gluehwuermchen', 'Glühwürmchen', '✨', 150, ['summer'], 'night', 30],
  ['hirschkaefer', 'Hirschkäfer', '🪲', 400, ['summer'], 'night', 6],
  ['spinne', 'Kreuzspinne', '🕷️', 120, ['autumn'], 'night', 16],
  ['nachtfalter', 'Nachtfalter', '🦋', 110, ['spring', 'summer', 'autumn'], 'night', 22],
  ['wintermuecke', 'Wintermücke', '🦟', 60, ['winter'], 'any', 30],
  ['schneefloh', 'Schneefloh', '❄️', 160, ['winter'], 'day', 12],
];

// Ausgrabungen (Schaufel an glitzernden Stellen): [id, Name, Symbol, Preis, Gewicht]
export const FOSSILS = [
  ['ammonit', 'Ammonit', '🐚', 350, 22],
  ['knochen', 'Saurierknochen', '🦴', 300, 22],
  ['zahn', 'Saurierzahn', '🦷', 450, 14],
  ['abdruck', 'Pfotenabdruck', '🐾', 400, 14],
  ['altmuenze', 'Alte Münze', '🪙', 250, 12],
  ['amphore', 'Amphore', '🏺', 600, 8],
  ['kristall', 'Kristall', '🔮', 700, 6],
  ['eiszapfen', 'Ur-Eis', '🧊', 520, 2],
];

// Platzierbare Dinge: Deko, Sprinkler, Maschinen, Bäume.
// solid = man kann nicht hindurchlaufen. glow = leuchtet nachts.
export const PLACE = {
  weg:        { name: 'Steinweg',     icon: '🧱', buy: 5,    lvl: 1, kind: 'deco' },
  blumen:     { name: 'Blumenbeet',   icon: '🌷', buy: 25,   lvl: 1, kind: 'deco' },
  zaun:       { name: 'Zaun',         icon: '🪵', buy: 10,   lvl: 1, kind: 'deco', solid: 1 },
  heu:        { name: 'Strohballen',  icon: '🟨', buy: 30,   lvl: 1, kind: 'deco', solid: 1 },
  pilz:       { name: 'Fliegenpilz',  icon: '🍄', buy: 40,   lvl: 1, kind: 'deco' },
  laterne:    { name: 'Laterne',      icon: '🏮', buy: 90,   lvl: 2, kind: 'deco', solid: 1, glow: 1 },
  zwerg:      { name: 'Gartenzwerg',  icon: '🧙', buy: 120,  lvl: 2, kind: 'deco', solid: 1 },
  bank:       { name: 'Gartenbank',   icon: '🪑', buy: 150,  lvl: 2, kind: 'deco', solid: 1 },
  kirschbaum: { name: 'Kirschbaum',   icon: '🌸', buy: 250,  lvl: 3, kind: 'deco', solid: 1 },
  vogelhaus:  { name: 'Vogelhäuschen', icon: '🐦', buy: 200,  lvl: 2, kind: 'deco', solid: 1 },
  herz:       { name: 'Herzbogen',    icon: '💕', buy: 400,  lvl: 3, kind: 'deco' },
  brunnen:    { name: 'Brunnen',      icon: '⛲', buy: 600,  lvl: 5, kind: 'deco', solid: 1 },
  sprinkler:  { name: 'Sprinkler',      icon: '💦', buy: 400,  lvl: 3, kind: 'sprinkler', r: 1, desc: 'Gießt 3×3 Felder automatisch' },
  supersprinkler: { name: 'Super-Sprinkler', icon: '🌊', buy: 1500, lvl: 6, kind: 'sprinkler', r: 2, desc: 'Gießt 5×5 Felder automatisch' },
  apfelbaum:  { name: 'Apfelbaum',    icon: '🌳', buy: 500,  lvl: 2, kind: 'producer', solid: 1, item: 'apfel', n: 2, every: 200, desc: 'Trägt regelmäßig 2 Äpfel' },
  bienenstock:{ name: 'Bienenstock',  icon: '🐝', buy: 1200, lvl: 4, kind: 'producer', solid: 1, item: 'honig', n: 1, every: 240, desc: 'Bienen machen Honig' },
  m_mayo:     { name: 'Mayo-Maschine', icon: '🥣', buy: 600,  lvl: 2, kind: 'machine', solid: 1, in: ['ei'], out: 'mayo', time: 60 },
  m_jam:      { name: 'Einmachtopf',   icon: '🫙', buy: 1000, lvl: 3, kind: 'machine', solid: 1, in: ['erdbeere', 'apfel'], out: 'marmelade', time: 80 },
  m_kaese:    { name: 'Käserei',       icon: '🧀', buy: 1500, lvl: 3, kind: 'machine', solid: 1, in: ['milch'], out: 'kaese', time: 90 },
  m_web:      { name: 'Webstuhl',      icon: '🧵', buy: 2000, lvl: 4, kind: 'machine', solid: 1, in: ['wolle'], out: 'stoff', time: 120 },
  m_oel:      { name: 'Ölpresse',      icon: '🧴', buy: 2500, lvl: 6, kind: 'machine', solid: 1, in: ['sonnenblume'], out: 'oel', time: 100 },
};
for (const [k, p] of Object.entries(PLACE)) ITEMS[k] = { name: p.name, icon: p.icon, buy: p.buy, lvl: p.lvl, place: k };
export const MACHINE_CAP = 20;

// Upgrades: cost[i] = Preis für Stufe i+2 (bzw. i+1 bei Start 0), req[i] = benötigtes Farm-Level.
export const UPGRADES = {
  field:  { tab: 'farm',  name: 'Feld erweitern', icon: '🟫', start: 1, cost: [500, 1500, 4000, 9000], req: [2, 4, 6, 8],
            desc: l => `Feldgröße ${fieldSize(l)}` },
  house:  { tab: 'farm',  name: 'Haus ausbauen', icon: '🏡', start: 1, cost: [2500, 8000], req: [3, 6],
            desc: l => ['', 'Kleines Häuschen', 'Gemütliches Landhaus', 'Traumhaus mit Turm'][l] },
  coop:   { tab: 'farm',  name: 'Hühnerstall', icon: '🐔', start: 0, cost: [500, 2000], req: [2, 5],
            desc: l => l ? `Platz für ${l * 4} Hühner` : 'Noch nicht gebaut' },
  barn:   { tab: 'farm',  name: 'Stall', icon: '🐄', start: 0, cost: [1500, 4500], req: [3, 5],
            desc: l => l ? `Platz für ${l * 4} Kühe, Schafe & Schweine` : 'Noch nicht gebaut' },
  hoe:    { tab: 'tools', name: 'Hacke', icon: '⛏️', start: 1, cost: [400, 1500, 5000], req: [2, 4, 7],
            desc: l => `Bearbeitet & sät ${AREA_NAME[l]}` },
  can:    { tab: 'tools', name: 'Gießkanne', icon: '💧', start: 1, cost: [400, 1500, 5000], req: [2, 4, 7],
            desc: l => `Gießt ${AREA_NAME[l]}` },
  sickle: { tab: 'tools', name: 'Sichel', icon: '🌙', start: 1, cost: [300, 1200, 4000], req: [2, 4, 7],
            desc: l => `Erntet ${AREA_NAME[l]}` },
  boots:  { tab: 'tools', name: 'Stiefel', icon: '👢', start: 1, cost: [300, 1200, 3500], req: [1, 3, 6],
            desc: l => `Tempo ${Math.round(SPEED[l] / SPEED[1] * 100)}%` },
  rod:    { tab: 'tools', name: 'Angel', icon: '🎣', start: 1, cost: [500, 2500], req: [2, 5],
            desc: l => ['', 'Einfache Angel', 'Bessere Fische, schnellerer Biss', 'Profi-Angel: Schätze!'][l] },
  q_veg:    { tab: 'goods', name: 'Gemüse-Qualität', icon: '🥕', start: 0, cost: [300, 800, 2000, 4500, 9000], req: [1, 2, 4, 6, 8], desc: l => `+${l * 20}% Verkaufspreis` },
  q_fruit:  { tab: 'goods', name: 'Obst & Blumen', icon: '🍓', start: 0, cost: [300, 800, 2000, 4500, 9000], req: [3, 3, 5, 7, 9], desc: l => `+${l * 20}% Verkaufspreis` },
  q_animal: { tab: 'goods', name: 'Tierprodukte', icon: '🥚', start: 0, cost: [400, 1000, 2500, 5000, 10000], req: [2, 3, 5, 7, 9], desc: l => `+${l * 20}% Verkaufspreis` },
  q_craft:  { tab: 'goods', name: 'Handwerkswaren', icon: '🧀', start: 0, cost: [500, 1200, 3000, 6000, 12000], req: [2, 4, 6, 8, 10], desc: l => `+${l * 20}% Verkaufspreis` },
  q_dish:   { tab: 'goods', name: 'Feinkost', icon: '🍰', start: 0, cost: [500, 1200, 3000, 6000, 12000], req: [3, 4, 6, 8, 10], desc: l => `+${l * 20}% für Gekochtes` },
  q_bug:    { tab: 'goods', name: 'Naturkunde', icon: '🦋', start: 0, cost: [300, 800, 2000, 4500, 9000], req: [2, 3, 5, 7, 9], desc: l => `+${l * 20}% für Insekten & Funde` },
  q_fish:   { tab: 'goods', name: 'Fisch-Händler', icon: '🐟', start: 0, cost: [300, 800, 2000, 4500, 9000], req: [2, 3, 5, 7, 9], desc: l => `+${l * 20}% Verkaufspreis` },
};
export const AREA_NAME = ['', '1 Feld', '3 Felder', '3×3 Felder', '5×5 Felder'];
export const SPEED = [0, 4, 5, 6, 7.2];

export function fieldSize(l) {
  const [x0, z0, x1, z1] = FIELDS[l];
  return `${x1 - x0 + 1}×${z1 - z0 + 1}`;
}

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

// Erfolge: gemeinsame Ziele mit Belohnung (Taler)
const decos = s => Object.values(s.obj).filter(o => PLACE[o.k]?.kind === 'deco').length;
const hasAnimal = (s, k) => s.animals.some(a => a.k === k);
export const ACHIEVEMENTS = [
  ['ernte1', '🌱', 'Erste Ernte', 'Erntet zum ersten Mal etwas', s => s.stats.harvested >= 1, 50],
  ['ernte100', '🧺', 'Fleißige Hände', '100 Pflanzen geerntet', s => s.stats.harvested >= 100, 300],
  ['ernte1000', '🏆', 'Erntekönige', '1000 Pflanzen geerntet', s => s.stats.harvested >= 1000, 2500],
  ['kuerbis', '🎃', 'Riesenkürbis', 'Einen Kürbis geerntet', s => (s.stats.h_kuerbis || 0) >= 1, 400],
  ['tier1', '🐣', 'Neue Freunde', 'Das erste Tier gekauft', s => s.animals.length >= 1, 100],
  ['zoo', '🐾', 'Bauernhof-Zoo', 'Huhn, Kuh, Schaf und Schwein auf der Farm', s => ['huhn', 'kuh', 'schaf', 'schwein'].every(k => hasAnimal(s, k)), 1500],
  ['liebe', '💞', 'Ganz viel Liebe', 'Ein Tier hat 10 Herzen', s => s.animals.some(a => a.love >= 10), 800],
  ['fisch10', '🎣', 'Anglerglück', '10 Fische gefangen', s => s.stats.fish >= 10, 250],
  ['schatz', '💎', 'Schatzsucher', 'Eine Schatztruhe geangelt', s => (s.stats.treasure || 0) >= 1, 500],
  ['maschine', '⚙️', 'Handwerker', 'Die erste Maschine aufgestellt', s => Object.values(s.obj).some(o => PLACE[o.k]?.kind === 'machine'), 200],
  ['auftrag10', '📋', 'Dorfhelden', '10 Aufträge erledigt', s => s.stats.orders >= 10, 600],
  ['reich', '💰', 'Gut betucht', '10.000 Taler verdient', s => s.stats.earned >= 10000, 500],
  ['reich2', '👑', 'Großgrundbesitzer', '100.000 Taler verdient', s => s.stats.earned >= 100000, 5000],
  ['deko20', '🌷', 'Gartenkünstler', '20 Deko-Stücke aufgestellt', s => decos(s) >= 20, 400],
  ['herz', '💕', 'Für immer zusammen', 'Einen Herzbogen aufgestellt', s => Object.values(s.obj).some(o => o.k === 'herz'), 200],
  ['feld', '🟫', 'Großbauern', 'Das Feld voll ausgebaut', s => s.up.field >= 5, 3000],
  ['haus', '🏰', 'Traumhaus', 'Das Haus voll ausgebaut', s => s.up.house >= 3, 3000],
  ['werkzeug', '🛠️', 'Profi-Ausrüstung', 'Hacke, Gießkanne und Sichel auf Stufe 4', s => s.up.hoe >= 4 && s.up.can >= 4 && s.up.sickle >= 4, 2000],
  ['level5', '⭐', 'Aufsteiger', 'Farm-Level 5 erreicht', s => s.level >= 5, 300],
  ['level10', '🌟', 'Meisterhof', 'Farm-Level 10 erreicht', s => s.level >= 10, 2000],
  ['tag10', '📅', 'Treue Seelen', '10 Tage zusammen gefarmt', s => s.day >= 10, 500],
  ['regen', '🌧️', 'Regentänzer', 'Einen Regen- oder Schneetag erlebt', s => s.weather !== 'sun', 100],
  ['kescher10', '🦋', 'Insektenfreunde', '10 Insekten gefangen', s => (s.stats.bugs || 0) >= 10, 300],
  ['fossil5', '🦴', 'Hobby-Archäologen', '5 verschiedene Funde ausgegraben', s => FOSSILS.filter(f => s.album?.[f[0]]).length >= 5, 600],
  ['album30', '📖', 'Naturforscher', '30 verschiedene Einträge im Sammelbuch', s => Object.keys(s.album || {}).length >= 30, 2000],
  ['koch', '🍳', 'Sternekoch', 'Das erste Gericht gekocht', s => (s.stats.cooked || 0) >= 1, 150],
  ['koch25', '👩‍🍳', 'Kuschelküche', '25 Gerichte gekocht', s => (s.stats.cooked || 0) >= 25, 1200],
  ['holz', '🪵', 'Holzfäller', '50 Holz gesammelt', s => (s.stats.wood || 0) >= 50, 300],
  ['werk', '🔨', 'Selbstgemacht', 'Etwas an der Werkbank gebaut', s => (s.stats.crafted || 0) >= 1, 150],
  ['freund', '💛', 'Beste Nachbarn', 'Mit einem Nachbarn 5 Herzen erreicht', s => Object.values(s.npc || {}).some(n => n.f >= 500), 800],
  ['dorf', '🏘️', 'Das ganze Dorf mag euch', 'Mit allen Nachbarn 3 Herzen erreicht', s => ['mira', 'bruno', 'pippa', 'lio'].every(k => (s.npc?.[k]?.f || 0) >= 300), 1500],
  ['jahr', '🎂', 'Ein ganzes Jahr', 'Alle vier Jahreszeiten zusammen erlebt', s => s.day >= 29, 3000],
].map(([id, icon, name, desc, test, reward]) => ({ id, icon, name, desc, test, reward }));

for (const [id, name, icon, sell] of BUGS) ITEMS[id] = { name, icon, sell, cat: 'bug', xp: Math.ceil(sell / 40) };
for (const [id, name, icon, sell] of FOSSILS) ITEMS[id] = { name, icon, sell, cat: 'bug', xp: Math.ceil(sell / 50) };
export const ALBUM = { fish: FISH.map(f => f[0]), bug: BUGS.map(b => b[0]), fossil: FOSSILS.map(f => f[0]) };

// Rezepte: Werkbank (craft) und Küche (cook)
export const RECIPES = {
  r_zaun: { st: 'craft', out: 'zaun', n: 2, in: { holz: 2 } },
  r_weg: { st: 'craft', out: 'weg', n: 4, in: { stein: 2 } },
  r_futter: { st: 'craft', out: 'futter', n: 3, in: { weizen: 2 } },
  r_heu: { st: 'craft', out: 'heu', n: 1, in: { weizen: 6 } },
  r_bank: { st: 'craft', out: 'bank', n: 1, in: { holz: 6 } },
  r_vogelhaus: { st: 'craft', out: 'vogelhaus', n: 1, in: { holz: 5 } },
  r_laterne: { st: 'craft', out: 'laterne', n: 1, in: { holz: 2, stein: 3 } },
  r_sprinkler: { st: 'craft', out: 'sprinkler', n: 1, in: { stein: 6, holz: 3 }, lvl: 3 },
  r_brunnen: { st: 'craft', out: 'brunnen', n: 1, in: { stein: 15 }, lvl: 5 },
  brot: { st: 'cook', out: 'brot', n: 1, in: { weizen: 3 } },
  pfannkuchen: { st: 'cook', out: 'pfannkuchen', n: 1, in: { weizen: 2, ei: 1, milch: 1 } },
  salat: { st: 'cook', out: 'salat', n: 1, in: { salatkopf: 1, tomate: 1, karotte: 1 } },
  fischsuppe: { st: 'cook', out: 'fischsuppe', n: 1, in: { barsch: 2, kartoffel: 1 } },
  eintopf: { st: 'cook', out: 'eintopf', n: 1, in: { kartoffel: 2, karotte: 1, brokkoli: 1 } },
  kuchen: { st: 'cook', out: 'kuchen', n: 1, in: { erdbeere: 3, weizen: 2, ei: 1 } },
  honigtee: { st: 'cook', out: 'honigtee', n: 1, in: { honig: 1, apfel: 1 } },
  suppe: { st: 'cook', out: 'suppe', n: 1, in: { kuerbis: 1, milch: 1 } },
  sorbet: { st: 'cook', out: 'sorbet', n: 1, in: { melone: 1, milch: 1 } },
  saft: { st: 'cook', out: 'saft', n: 1, in: { traube: 3 } },
};
export const DIG_SPOTS_PER_DAY = 4;

// Nachbarn: Vorlieben (Geschenke), Lieblingsort (sie spazieren dort herum), Dankesgeschenk im Brief
export const NPC_DATA = {
  mira: { name: 'Mira', icon: '🦔', likes: ['erdbeere', 'honig', 'milch', 'weizen'], loves: ['kuchen', 'marmelade'], dislikes: ['kugelfisch', 'krebs'], spot: [-4.5, -6.9, 2.4, 1.1], gift: ['kuchen', 2] },
  bruno: { name: 'Bruno', icon: '🐻', likes: ['holz', 'apfel', 'brot', 'forelle'], loves: ['honig', 'eintopf'], dislikes: ['stein', 'mayo'], spot: [5.5, -8.4, 1.8, 0.7], gift: ['holz', 15] },
  pippa: { name: 'Pippa', icon: '🦆', likes: ['barsch', 'forelle', 'mais', 'weizen'], loves: ['kugelfisch', 'fischsuppe'], dislikes: ['ei', 'mayo'], spot: [-8.2, -5.8, 1.6, 1.2], gift: ['forelle', 3] },
  lio: { name: 'Lio', icon: '🦊', likes: ['oel', 'stoff', 'kaese', 'honigtee'], loves: ['sonnenblume', 'trueffel'], dislikes: ['kartoffel', 'stein'], spot: [0, -3.7, 3.4, 0.5], gift: ['kirschbaum', 1] },
};
export const NPC_IDS = Object.keys(NPC_DATA);

// Möbel fürs Haus (Daten in furni-data.js): kaufen im Laden, manche selbst bauen
import { FURNITURE as FURN } from './furni-data.js';
for (const [id, f] of Object.entries(FURN)) {
  ITEMS[id] = { name: f.name, icon: f.icon, buy: f.buy, lvl: f.lvl, furn: id };
  if (f.craft) RECIPES['f_' + id] = { st: 'craft', out: id, n: 1, in: f.craft, lvl: f.lvl };
}
