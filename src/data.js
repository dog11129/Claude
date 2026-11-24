// Spielinhalte: alles, was man kaufen, anbauen, züchten und verbessern kann.

export const DAY = 300;          // Sekunden pro Spieltag
export const WET = 120;          // so lange bleibt gegossener Boden nass
export const MAP = 15;           // Spielfeld geht von -MAP bis +MAP
export const SPAWN = { x: 0, z: -6 };

export const CROPS = {
  weizen:      { name: 'Weizen',      icon: '🌾', seed: 5,   sell: 12,  grow: 40,  lvl: 1, cat: 'veg',   xp: 1,  yield: 2 },
  karotte:     { name: 'Karotte',     icon: '🥕', seed: 10,  sell: 28,  grow: 60,  lvl: 1, cat: 'veg',   xp: 2 },
  kartoffel:   { name: 'Kartoffel',   icon: '🥔', seed: 20,  sell: 55,  grow: 100, lvl: 2, cat: 'veg',   xp: 3 },
  erdbeere:    { name: 'Erdbeere',    icon: '🍓', seed: 40,  sell: 45,  grow: 120, lvl: 3, cat: 'fruit', xp: 3, regrow: 60 },
  tomate:      { name: 'Tomate',      icon: '🍅', seed: 50,  sell: 50,  grow: 140, lvl: 4, cat: 'veg',   xp: 4, regrow: 70 },
  mais:        { name: 'Mais',        icon: '🌽', seed: 60,  sell: 130, grow: 180, lvl: 5, cat: 'veg',   xp: 6 },
  sonnenblume: { name: 'Sonnenblume', icon: '🌻', seed: 80,  sell: 170, grow: 200, lvl: 6, cat: 'fruit', xp: 7 },
  kuerbis:     { name: 'Kürbis',      icon: '🎃', seed: 120, sell: 400, grow: 300, lvl: 7, cat: 'veg',   xp: 12 },
};

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
};
for (const [k, c] of Object.entries(CROPS)) {
  ITEMS[k] = { name: c.name, icon: c.icon, sell: c.sell, cat: c.cat, xp: c.xp };
  ITEMS['s_' + k] = { name: c.name + '-Samen', icon: c.icon, buy: c.seed, lvl: c.lvl, seed: k };
}

export const FISH = [ // [id, Gewicht je Angel-Stufe 1..3]
  ['barsch', [60, 45, 30]],
  ['forelle', [30, 32, 30]],
  ['krebs', [9, 15, 22]],
  ['kugelfisch', [1, 7, 14]],
  ['schatz', [0, 1, 4]],
];

// Platzierbare Dinge: Deko, Sprinkler, Maschinen, Bäume.
// solid = man kann nicht hindurchlaufen. glow = leuchtet nachts.
export const PLACE = {
  weg:        { name: 'Steinweg',     icon: '🪨', buy: 5,    lvl: 1, kind: 'deco' },
  blumen:     { name: 'Blumenbeet',   icon: '🌷', buy: 25,   lvl: 1, kind: 'deco' },
  zaun:       { name: 'Zaun',         icon: '🪵', buy: 10,   lvl: 1, kind: 'deco', solid: 1 },
  heu:        { name: 'Strohballen',  icon: '🟨', buy: 30,   lvl: 1, kind: 'deco', solid: 1 },
  pilz:       { name: 'Fliegenpilz',  icon: '🍄', buy: 40,   lvl: 1, kind: 'deco' },
  laterne:    { name: 'Laterne',      icon: '🏮', buy: 90,   lvl: 2, kind: 'deco', solid: 1, glow: 1 },
  zwerg:      { name: 'Gartenzwerg',  icon: '🧙', buy: 120,  lvl: 2, kind: 'deco', solid: 1 },
  bank:       { name: 'Gartenbank',   icon: '🪑', buy: 150,  lvl: 2, kind: 'deco', solid: 1 },
  kirschbaum: { name: 'Kirschbaum',   icon: '🌸', buy: 250,  lvl: 3, kind: 'deco', solid: 1 },
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
export const EMOTES = ['❤️', '👋', '😂', '😮', '🎉', '😴', '🥰', '👍'];
