// Spielinhalte der Insel: Pflanzen, Obst, Fische, Insekten, Muscheln, Fossilien, Deko, Ausbau, Quests.
import { MAP, MAP0, SPAWN, POND, PATHS, grass, sand, onPath, onPlaza, rng, walkable, OLD, LOBES, newLand } from './island.js';
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
  lilie:       { name: 'Lilie',          icon: '🪷', seed: 80,  sell: 160, grow: 160, lvl: 1, cat: 'fruit', xp: 3, flower: 0xfff0f4, regrow: 120, garden: 1 },
  mohn:        { name: 'Mohn',           icon: '🌺', seed: 80,  sell: 160, grow: 150, lvl: 1, cat: 'fruit', xp: 3, flower: 0xff3b2f, regrow: 120, sea: ['spring', 'summer'], garden: 1 },
  kornblume:   { name: 'Kornblume',      icon: '💠', seed: 80,  sell: 160, grow: 150, lvl: 1, cat: 'fruit', xp: 3, flower: 0x4f7dff, regrow: 120, sea: ['summer', 'autumn'], garden: 1 },
  lavendel:    { name: 'Lavendel',       icon: '💜', seed: 0, sell: 220, grow: 170, lvl: 1, cat: 'fruit', xp: 4, flower: 0xa98bff, regrow: 130, wild: 1 },
  pfingstrose: { name: 'Pfingstrose',    icon: '🩷', seed: 0, sell: 260, grow: 180, lvl: 1, cat: 'fruit', xp: 4, flower: 0xff9ac4, regrow: 140, wild: 1 },
  glockenblume:{ name: 'Glockenblume',   icon: '🔔', seed: 0, sell: 220, grow: 170, lvl: 1, cat: 'fruit', xp: 4, flower: 0x6f8cff, regrow: 130, wild: 1 },
  orchidee:    { name: 'Orchidee',       icon: '🌸', seed: 0, sell: 420, grow: 220, lvl: 1, cat: 'fruit', xp: 6, flower: 0xf2a0ff, regrow: 170, wild: 1 },
  gaensebluemchen: { name: 'Gänseblümchen', icon: '🌼', seed: 15, sell: 35, grow: 80, lvl: 1, cat: 'fruit', xp: 1, flower: 0xffffff, regrow: 70, sea: ['spring', 'summer'] },
  ringelblume: { name: 'Ringelblume',    icon: '🧡', seed: 25,  sell: 60,  grow: 110, lvl: 1, cat: 'fruit', xp: 1, flower: 0xff9a2a, regrow: 90, sea: ['summer', 'autumn'] },
  vergissmeinnicht: { name: 'Vergissmeinnicht', icon: '💙', seed: 30, sell: 70, grow: 120, lvl: 2, cat: 'fruit', xp: 2, flower: 0x6fa8ff, regrow: 100, sea: ['spring'] },
  narzisse:    { name: 'Narzisse',       icon: '💛', seed: 30,  sell: 70,  grow: 120, lvl: 2, cat: 'fruit', xp: 2, flower: 0xffe14a, regrow: 100, sea: ['spring'] },
  nelke:       { name: 'Nelke',          icon: '🎀', seed: 40,  sell: 90,  grow: 130, lvl: 2, cat: 'fruit', xp: 2, flower: 0xff7fa8, regrow: 110, sea: ['spring', 'summer', 'autumn'] },
  margerite:   { name: 'Margerite',      icon: '🤍', seed: 30,  sell: 70,  grow: 120, lvl: 2, cat: 'fruit', xp: 2, flower: 0xfffbea, regrow: 100, sea: ['summer'] },
  krokus:      { name: 'Krokus',         icon: '🔮', seed: 30,  sell: 70,  grow: 110, lvl: 2, cat: 'fruit', xp: 2, flower: 0xb07bff, regrow: 100, sea: ['winter', 'spring'] },
  dahlie:      { name: 'Dahlie',         icon: '🏵️', seed: 70,  sell: 150, grow: 180, lvl: 3, cat: 'fruit', xp: 3, flower: 0xe0408a, regrow: 140, sea: ['summer', 'autumn'], garden: 1 },
  schneegloeckchen: { name: 'Schneeglöckchen', icon: '❄️', seed: 60, sell: 130, grow: 150, lvl: 3, cat: 'fruit', xp: 3, flower: 0xffffff, regrow: 120, sea: ['winter', 'spring'], garden: 1 },
  christrose:  { name: 'Christrose',     icon: '⭐', seed: 90,  sell: 190, grow: 190, lvl: 4, cat: 'fruit', xp: 4, flower: 0xf8e2ec, regrow: 150, sea: ['winter'], garden: 1 },
  weizen:      { name: 'Weizen',         icon: '🌾', seed: 10,  sell: 25,  grow: 80,  lvl: 2, cat: 'veg',   xp: 1, yield: 2, sea: ['spring', 'summer', 'autumn'] },
  karotte:     { name: 'Karotte',        icon: '🥕', seed: 15,  sell: 45,  grow: 90,  lvl: 2, cat: 'veg',   xp: 2, sea: ['spring', 'autumn', 'winter'] },
  kartoffel:   { name: 'Kartoffel',      icon: '🥔', seed: 25,  sell: 70,  grow: 130, lvl: 3, cat: 'veg',   xp: 3, sea: ['spring', 'autumn'] },
  tomate:      { name: 'Tomate',         icon: '🍅', seed: 50,  sell: 60,  grow: 160, lvl: 4, cat: 'veg',   xp: 3, regrow: 80, sea: ['summer'] },
  kuerbis:     { name: 'Kürbis',         icon: '🎃', seed: 120, sell: 380, grow: 300, lvl: 6, cat: 'veg',   xp: 10, sea: ['autumn'] },
  salatkopf:   { name: 'Salat',          icon: '🥬', seed: 20,  sell: 55,  grow: 100, lvl: 2, cat: 'veg',   xp: 2, sea: ['spring', 'autumn'] },
  erdbeere:    { name: 'Erdbeere',       icon: '🍓', seed: 40,  sell: 90,  grow: 150, lvl: 3, cat: 'veg',   xp: 3, regrow: 90, sea: ['spring', 'summer'] },
  mais:        { name: 'Mais',           icon: '🌽', seed: 30,  sell: 80,  grow: 170, lvl: 3, cat: 'veg',   xp: 3, sea: ['summer', 'autumn'] },
  brokkoli:    { name: 'Brokkoli',       icon: '🥦', seed: 35,  sell: 85,  grow: 140, lvl: 4, cat: 'veg',   xp: 3, sea: ['autumn', 'winter'] },
  traube:      { name: 'Weintrauben',    icon: '🍇', seed: 90,  sell: 160, grow: 260, lvl: 5, cat: 'veg',   xp: 5, regrow: 120, sea: ['autumn'] },
  melone:      { name: 'Melone',         icon: '🍉', seed: 150, sell: 420, grow: 320, lvl: 6, cat: 'veg',   xp: 10, sea: ['summer'] },
  // Inselleben 12: acht neue Blumen aus der Gärtnerei Knolle und vier Gemüsesorten
  veilchen:    { name: 'Veilchen',       icon: '💜', seed: 50,  sell: 110, grow: 120, lvl: 1, cat: 'fruit', xp: 2, flower: 0x8a5cf0, regrow: 100, sea: ['spring', 'autumn', 'winter'], garden: 1 },
  anemone:     { name: 'Anemone',        icon: '🌺', seed: 60,  sell: 130, grow: 150, lvl: 2, cat: 'fruit', xp: 2, flower: 0xe8384c, regrow: 110, sea: ['spring', 'autumn'], garden: 1 },
  iris:        { name: 'Schwertlilie',   icon: '🪻', seed: 70,  sell: 150, grow: 160, lvl: 2, cat: 'fruit', xp: 3, flower: 0x7a6cf0, regrow: 120, sea: ['spring', 'summer'], garden: 1 },
  ranunkel:    { name: 'Ranunkel',       icon: '🏵️', seed: 80,  sell: 170, grow: 170, lvl: 3, cat: 'fruit', xp: 3, flower: 0xffa24a, regrow: 130, sea: ['spring'], garden: 1 },
  sonnenhut:   { name: 'Sonnenhut',      icon: '🌼', seed: 70,  sell: 150, grow: 170, lvl: 3, cat: 'fruit', xp: 3, flower: 0xf070a8, regrow: 130, sea: ['summer', 'autumn'], garden: 1 },
  aster:       { name: 'Aster',          icon: '🌸', seed: 70,  sell: 150, grow: 160, lvl: 3, cat: 'fruit', xp: 3, flower: 0xb070e0, regrow: 120, sea: ['autumn'], garden: 1 },
  lupine:      { name: 'Lupine',         icon: '🪻', seed: 90,  sell: 190, grow: 190, lvl: 4, cat: 'fruit', xp: 4, flower: 0x5f7cf0, regrow: 140, sea: ['summer'], garden: 1 },
  chrysantheme: { name: 'Chrysantheme',  icon: '🌼', seed: 90,  sell: 190, grow: 190, lvl: 4, cat: 'fruit', xp: 4, flower: 0xf2b83a, regrow: 140, sea: ['autumn', 'winter'], garden: 1 },
  radieschen:  { name: 'Radieschen',     icon: '🔴', seed: 15,  sell: 45,  grow: 70,  lvl: 1, cat: 'veg',   xp: 1, sea: ['spring', 'autumn'] },
  gurke:       { name: 'Gurke',          icon: '🥒', seed: 30,  sell: 75,  grow: 130, lvl: 2, cat: 'veg',   xp: 2, regrow: 100, sea: ['summer'] },
  paprika:     { name: 'Paprika',        icon: '🫑', seed: 45,  sell: 110, grow: 170, lvl: 4, cat: 'veg',   xp: 3, regrow: 110, sea: ['summer', 'autumn'] },
  aubergine:   { name: 'Aubergine',      icon: '🍆', seed: 50,  sell: 125, grow: 190, lvl: 5, cat: 'veg',   xp: 4, regrow: 120, sea: ['summer', 'autumn'] },
};
// Pfingstrosen in vielen Farben: fünf gibt es in der Gärtnerei Knolle, die anderen nur durch Kreuzen (siehe HYBRIDS)
const PEONY = ['spring', 'summer', 'autumn'];
for (const [k, name, icon, flower, seed, sell, lvl] of [
  ['weiss', 'Weiße Pfingstrose', '🤍', 0xfffaf6, 120, 240, 1], ['hellrosa', 'Zartrosa Pfingstrose', '🩷', 0xffd0e0, 120, 240, 1],
  ['rot', 'Rote Pfingstrose', '❤️', 0xe8283c, 140, 260, 2], ['gelb', 'Gelbe Pfingstrose', '💛', 0xffe066, 140, 260, 2], ['creme', 'Cremefarbene Pfingstrose', '🌼', 0xfff0c8, 160, 280, 3],
  ['zweifarbig', 'Zweifarbige Pfingstrose', '🌸', 0xffb8d0, 0, 520, 1], ['koralle', 'Korallen-Pfingstrose', '🧡', 0xff8a5c, 0, 520, 1], ['pfirsich', 'Pfirsich-Pfingstrose', '🍑', 0xffb894, 0, 520, 1],
  ['magenta', 'Magenta-Pfingstrose', '💗', 0xe0408a, 0, 520, 1], ['weinrot', 'Weinrote Pfingstrose', '🍷', 0x9a1838, 0, 640, 1], ['lila', 'Lila Pfingstrose', '💜', 0xb07bd8, 0, 640, 1],
  ['blau', 'Blaue Pfingstrose', '💙', 0x7f9cff, 0, 900, 1], ['regenbogen', 'Regenbogen-Pfingstrose', '🌈', 0xffd0f0, 0, 1800, 1],
]) CROPS['pfingstrose_' + k] = { name, icon, seed, sell, grow: 180, lvl, cat: 'fruit', xp: seed ? 3 : 6, flower, regrow: 140, sea: PEONY, peony: k, ...(seed ? { garden: 1 } : { rare: 1 }) };
for (const c of Object.values(CROPS)) c.sea ||= ALL;
export const isFlower = k => !!CROPS[k] && CROPS[k].cat === 'fruit';

export const ANIMALS = {};       // Nutztiere gibt es auf der Insel nicht mehr
export const ANIMAL_NAMES = [];
export const PENS = {};

// Feste Gebäude: Fläche in Kacheln (x0..x1, z0..z1), was beim Benutzen passiert.
// cx/cz = Mitte des 3D-Modells, ox/oz = Verschiebung älterer Modelle, die in eigenen Koordinaten gebaut sind.
export const BUILDINGS = {
  office:   { x0: -2,  x1: 2,   z0: -5,  z1: -3,  use: 'mayor',  name: 'Rathaus' },
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
  gate:     { x0: -2,  x1: 0,   z0: -15, z1: -15, use: 'street', name: 'Tor zur Bummelgasse', late: 1 },
  boat:     { x0: -8,  x1: -7,  z0: 23,  z1: 25,  use: 'boat',   name: 'Käpt\'n Flossis Boot', late: 1 },
};
for (const b of Object.values(BUILDINGS)) { b.cx = (b.x0 + b.x1) / 2; b.cz = (b.z0 + b.z1) / 2; }
// Nachbarhäuser bekommen mehr Platz drumherum (vor allem vor der Tür), damit kein Baum davorsteht
const nearBuilding = (x, z, m) => Object.values(BUILDINGS).some(b => {
  if (b.late) return false; const e = b.npc ? 1 : 0; return x >= b.x0 - m - e && x <= b.x1 + m + e && z >= b.z0 - m - e && z <= b.z1 + m + e * 2; });

// Wilde Bäume (Obst, Holz), Palmen (Kokosnüsse) und Felsen (Stein, Eisen) – auf allen Geräten gleich verteilt
export const FRUITS = ['apfel', 'kirsche', 'orange', 'pfirsich', 'birne'];
export const RES_SPOTS = {};
export const TREE_FRUIT = {};
{
  // WICHTIG: Die alte Verteilung rechnet mit der Insel vor der Erweiterung (OLD, MAP0) – so bleiben alle Bäume der Spielstände am Platz.
  const MAP = MAP0, grass = OLD.grass, sand = OLD.sand;
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
// Neues Land der Inselerweiterung: eigene Bäume, Palmen und Felsen (eigener Zufall, ändert die alten nicht)
{
  const r = rng(9191), taken = Object.keys(RES_SPOTS).map(k => k.split(',').map(Number));
  const far = (x, z, d) => taken.every(([a, b]) => Math.hypot(a - x, b - z) >= d);
  const inLobe = () => { const L = LOBES[Math.floor(r() * LOBES.length)], a = r() * Math.PI * 2, d = Math.sqrt(r()) * (L.r + 1.5); return [Math.round(L.x + Math.cos(a) * d), Math.round(L.z + Math.sin(a) * d)]; };
  const add = (n, kind, ok, gap) => {
    for (let i = 0, c = 0; i < 1500 && c < n; i++) {
      const [x, z] = inLobe();
      if (!newLand(x, z) || !ok(x, z) || !far(x, z, gap) || nearBuilding(x, z, 1.5)) continue;
      taken.push([x, z]);
      RES_SPOTS[x + ',' + z] = kind;
      if (kind === 'tree') TREE_FRUIT[x + ',' + z] = r() < 0.4 ? 'apfel' : FRUITS[1 + Math.floor(r() * 4)];
      if (kind === 'palm') TREE_FRUIT[x + ',' + z] = 'kokosnuss';
      c++;
    }
  };
  add(22, 'tree', (x, z) => grass(x, z), 3.4);
  add(9, 'palm', (x, z) => sand(x, z), 3.2);
  add(5, 'rock', (x, z) => grass(x, z), 2.8);
}
export const FRUIT_REGROW = 3; // Tage, bis ein geschüttelter Baum wieder Obst trägt

// Felder gibt es nicht mehr – gepflanzt wird überall auf dem Rasen
export const FIELDS = [null, [0, 0, -1, -1]];

// Alle Gegenstände. cat = Warengruppe für Preis-Ausbauten und Museum.
export const ITEMS = {
  bonbon:    { name: 'Bonbon',       icon: '🍬', sell: 40, cat: 'misc' },
  apfel:     { name: 'Apfel',        icon: '🍎', sell: 100, cat: 'fruit', xp: 1 },
  kirsche:   { name: 'Kirschen',     icon: '🍒', sell: 100, cat: 'fruit', xp: 1 },
  orange:    { name: 'Orange',       icon: '🍊', sell: 100, cat: 'fruit', xp: 1 },
  pfirsich:  { name: 'Pfirsich',     icon: '🍑', sell: 100, cat: 'fruit', xp: 1 },
  birne:     { name: 'Birne',        icon: '🍐', sell: 100, cat: 'fruit', xp: 1 },
  kokosnuss: { name: 'Kokosnuss',    icon: '🥥', sell: 250, cat: 'fruit', xp: 2 },
  banane:    { name: 'Banane',       icon: '🍌', sell: 500, cat: 'fruit', xp: 2 },
  mango:     { name: 'Mango',        icon: '🥭', sell: 500, cat: 'fruit', xp: 2 },
  sternfrucht: { name: 'Sternfrucht', icon: '⭐', sell: 600, cat: 'fruit', xp: 3 },
  holz:      { name: 'Holz',         icon: '🪵', sell: 60,  cat: 'mat', xp: 1 },
  ast:       { name: 'Ast',          icon: '🥢', sell: 5,   cat: 'mat', xp: 1 },
  stein:     { name: 'Stein',        icon: '🪨', sell: 75,  cat: 'mat', xp: 1 },
  lehm:      { name: 'Lehm',         icon: '🧱', sell: 100, cat: 'mat', xp: 1 },
  eisen:     { name: 'Eisennugget',  icon: '🔩', sell: 375, cat: 'mat', xp: 3 },
  unkraut:   { name: 'Unkraut',      icon: '🌿', sell: 10,  cat: 'mat', xp: 1 },
  sternsplitter: { name: 'Sternsplitter', icon: '🌟', sell: 300, cat: 'misc', xp: 3 },
  goldnugget: { name: 'Goldnugget',  icon: '🪙', sell: 10000, cat: 'misc', xp: 10 },
  neopren:   { name: 'Neoprenanzug', icon: '🤿', buy: 3000, lvl: 1, gear: true },
  baumschaufel: { name: 'Baumschaufel', icon: '🪏', buy: 2800, lvl: 2, gear: true },
  // Mit der Baumschaufel ausgegrabene Bäume (zum Umsetzen)
  baum_apfel:    { name: 'Apfelbaum (Ballen)',    icon: '🌳', sapling: 'apfel' },
  baum_kirsche:  { name: 'Kirschbaum (Ballen)',   icon: '🌳', sapling: 'kirsche' },
  baum_orange:   { name: 'Orangenbaum (Ballen)',  icon: '🌳', sapling: 'orange' },
  baum_pfirsich: { name: 'Pfirsichbaum (Ballen)', icon: '🌳', sapling: 'pfirsich' },
  baum_birne:    { name: 'Birnbaum (Ballen)',     icon: '🌳', sapling: 'birne' },
  baum_palme:    { name: 'Palme (Ballen)',        icon: '🌴', sapling: 'kokosnuss', palm: true },
  // Edelstein-Werkzeuge (Werkbank): kleine Vorteile beim Angeln, Holzhacken, Graben, Keschern, Gießen
  goldangel:     { name: 'Goldangel',      icon: '🎣', gear: true, tool: 'fish',   desc: 'Seltene Fische beißen öfter' },
  kristallaxt:   { name: 'Kristallaxt',    icon: '🪓', gear: true, tool: 'axe',    desc: 'Oft doppelt Holz – und Bäume werden nicht so schnell müde' },
  rubinschaufel: { name: 'Rubinschaufel',  icon: '🪏', gear: true, tool: 'shovel', desc: 'Felsen geben manchmal Edelsteine' },
  saphirkescher: { name: 'Saphirkescher',  icon: '🦋', gear: true, tool: 'net',    desc: 'Seltene Krabbeltiere kommen öfter' },
  opalkanne:     { name: 'Opalkanne',      icon: '💧', gear: true, tool: 'can',    desc: 'Gegossene Pflanzen wachsen schneller' },
  faelschung:    { name: 'Fälschung',      icon: '🎭', sell: 10, cat: 'misc' },
  bambus:        { name: 'Bambus',         icon: '🎋', sell: 120, cat: 'mat', xp: 1 },
  bambussprosse: { name: 'Bambussprosse',  icon: '🌱', sell: 260, cat: 'veg', xp: 2 },
  // Bauernhof-Ecke, Korallenriff, Strand
  goldei:        { name: 'Goldenes Ei',    icon: '🥚', sell: 2500, cat: 'misc' },
  ehering:       { name: 'Ehering',        icon: '💍', sell: 0, cat: 'misc', keep: 1 },
  traumstern:    { name: 'Traumstern',     icon: '🌠', sell: 120, cat: 'misc' },
  // Nur in den Gebieten zu finden (src/extras9.js)
  waldmoos:      { name: 'Waldmoos',       icon: '🌿', sell: 60,  cat: 'mat', xp: 1 },
  harzperle:     { name: 'Harzperle',      icon: '🟠', sell: 320, cat: 'mat', xp: 2 },
  eulenfeder:    { name: 'Eulenfeder',     icon: '🪶', sell: 260, cat: 'mat', xp: 2 },
  geweihstange:  { name: 'Geweihstange',   icon: '🦌', sell: 900, cat: 'mat', xp: 4 },
  pusteblume:    { name: 'Pusteblume',     icon: '🌼', sell: 70,  cat: 'mat', xp: 1 },
  gluecksklee:   { name: 'Glücksklee',     icon: '🍀', sell: 800, cat: 'mat', xp: 3 },
  morgentau:     { name: 'Morgentau',      icon: '💧', sell: 160, cat: 'mat', xp: 2 },
  goldstaub:     { name: 'Goldener Blütenstaub', icon: '✨', sell: 220, cat: 'mat', xp: 2 },
  leuchtmoos:    { name: 'Leuchtmoos',     icon: '💚', sell: 120, cat: 'mat', xp: 1 },
  tropfstein:    { name: 'Tropfsteinsplitter', icon: '🪨', sell: 110, cat: 'mat', xp: 1 },
  geode:         { name: 'Geode',          icon: '🥚', sell: 400, cat: 'mat', xp: 2, desc: 'Grubi in der Kristallhöhle knackt sie auf' },
  kristallblume: { name: 'Kristallblume',  icon: '💠', sell: 1200, cat: 'mat', xp: 4 },
  kaese:         { name: 'Käse',           icon: '🧀', sell: 700, cat: 'misc', xp: 3 },
  seeglas:       { name: 'Seeglas',        icon: '💠', sell: 300, cat: 'misc', xp: 2 },
  riffkoralle:   { name: 'Riffkoralle',    icon: '🪸', sell: 650, cat: 'misc', xp: 3 },
  grillfisch:    { name: 'Grillfisch',     icon: '🐟', sell: 300, cat: 'dish', xp: 4 },
  grillmais:     { name: 'Grillmais',      icon: '🌽', sell: 170, cat: 'dish', xp: 3 },
  ofenkartoffel: { name: 'Ofenkartoffel',  icon: '🥔', sell: 150, cat: 'dish', xp: 3 },
  grillgemuese:  { name: 'Grillgemüse',    icon: '🍢', sell: 160, cat: 'dish', xp: 3 },
  bratapfel:     { name: 'Bratapfel',      icon: '🍎', sell: 170, cat: 'dish', xp: 3 },
  stockbrot:     { name: 'Stockbrot',      icon: '🥖', sell: 70, cat: 'dish', xp: 2 },
  seekarte:      { name: 'Alte Seekarte',  icon: '🗺️', cat: 'misc', desc: 'Aus dem Schiffswrack – sie verrät, wie die Kapitänskajüte aufgeht' },
  dublone:       { name: 'Golddublone',    icon: '🪙', sell: 1500, cat: 'misc', xp: 4 },
  drache:        { name: 'Drachen',        icon: '🪁', buy: 1800, lvl: 1, gear: true, desc: 'Steigen lassen: Böen abpassen und Höhe gewinnen' },
  // Inselleben 4 (src/extras4.js)
  fernglas:      { name: 'Fernglas',       icon: '🔭', buy: 2400, lvl: 1, gear: true, desc: 'Vögel beobachten: in der Leiste wählen und Ausschau halten' },
  schlitten:     { name: 'Schlitten',      icon: '🛷', buy: 2200, lvl: 1, gear: true, desc: 'Im Winter über den Schnee sausen' },
  kanu:          { name: 'Kanu',           icon: '🛶', buy: 6800, lvl: 3, gear: true, desc: 'An der Flussmündung einsteigen und flussaufwärts paddeln' },
  duenger:       { name: 'Riesendünger',   icon: '🧪', buy: 400, lvl: 2, cat: 'mat', desc: 'Reife Kürbisse, Melonen und Kartoffeln wachsen damit weiter – einmal am Tag, vorher gießen' },
  einsiedlerkrebs: { name: 'Einsiedlerkrebs', icon: '🐚', sell: 600, cat: 'misc', xp: 3 },
  strandkrabbe:  { name: 'Strandkrabbe',   icon: '🦀', sell: 400, cat: 'misc', xp: 2 },
  napfschnecke:  { name: 'Napfschnecke',   icon: '🐌', sell: 300, cat: 'misc', xp: 2 },
  seepocke:      { name: 'Seepocke',       icon: '🪨', sell: 250, cat: 'misc', xp: 1 },
  schlangenstern: { name: 'Schlangenstern', icon: '✴️', sell: 900, cat: 'misc', xp: 4 },
  glasgarnele:   { name: 'Glasgarnele',    icon: '🦐', sell: 700, cat: 'misc', xp: 3 },
  grottenforelle: { name: 'Grottenforelle', icon: '🐟', sell: 1400, cat: 'fish', xp: 5 },
  kristallgrundel: { name: 'Kristallgrundel', icon: '🐠', sell: 2200, cat: 'fish', xp: 7 },
  leuchtsalmler: { name: 'Leuchtsalmler',  icon: '✨', sell: 3000, cat: 'fish', xp: 9 },
  obsidian:      { name: 'Obsidian',       icon: '⬛', sell: 1800, cat: 'misc', xp: 6 },
  lavastein:     { name: 'Lavastein',      icon: '🌋', sell: 500, cat: 'mat', xp: 2 },
  feuerfalter:   { name: 'Feuerfalter',    icon: '🦋', sell: 2600, cat: 'bug', xp: 8 },
  glutkaefer:    { name: 'Glutkäfer',      icon: '🪲', sell: 1900, cat: 'bug', xp: 6 },
  // Inselleben 5 (src/extras5.js)
  farbpinsel:    { name: 'Farbpinsel',     icon: '🖌️', buy: 600, lvl: 1, gear: true, desc: 'Im Baumodus (🖌️ Lackieren) Möbel umfärben' },
  kompost:       { name: 'Kompost',        icon: '🟫', sell: 60, cat: 'mat', desc: 'In der Leiste wählen und auf ein wachsendes Beet: halber Weg zur Blüte' },
  regenwurm:     { name: 'Regenwurm',      icon: '🪱', sell: 30, cat: 'mat', desc: 'Köder: beim Angeln beißen seltene Fische öfter (wird verbraucht)' },
  erdbeermarmelade: { name: 'Erdbeermarmelade', icon: '🍓', sell: 520, cat: 'dish', xp: 3, jar: 1 },
  apfelmus:      { name: 'Apfelmus',       icon: '🍎', sell: 380, cat: 'dish', xp: 2, jar: 1 },
  traubensaft:   { name: 'Traubensaft',    icon: '🍇', sell: 460, cat: 'dish', xp: 2, jar: 1 },
  kirschkompott: { name: 'Kirschkompott',  icon: '🍒', sell: 420, cat: 'dish', xp: 2, jar: 1 },
  moehrenglas:   { name: 'Eingelegte Möhren', icon: '🥕', sell: 300, cat: 'dish', xp: 2, jar: 1 },
  popcorn:       { name: 'Popcorn',        icon: '🍿', sell: 80, cat: 'dish', xp: 1 },
  thunfisch:     { name: 'Thunfisch',      icon: '🐟', sell: 4200, cat: 'fish', xp: 10 },
  schwertfisch:  { name: 'Schwertfisch',   icon: '🗡️', sell: 6000, cat: 'fish', xp: 12 },
  mondfisch:     { name: 'Mondfisch',      icon: '🌕', sell: 5200, cat: 'fish', xp: 11 },
  segelfisch:    { name: 'Segelfisch',     icon: '⛵', sell: 7500, cat: 'fish', xp: 14 },
  goldmakrele:   { name: 'Goldmakrele',    icon: '✨', sell: 3000, cat: 'fish', xp: 8 },
  partydeko:     { name: 'Partydeko',      icon: '🎊', buy: 1500, lvl: 1, cat: 'mat', desc: 'Für eine Geburtstagsüberraschung (Handy ➜ Party)' },
  kakao:         { name: 'Kakao',          icon: '☕', sell: 220, cat: 'dish', xp: 1 },
  milchkaffee:   { name: 'Milchkaffee',    icon: '☕', sell: 260, cat: 'dish', xp: 1 },
  kraeutertee:   { name: 'Kräutertee',     icon: '🍵', sell: 200, cat: 'dish', xp: 1 },
  beerenschorle: { name: 'Beerenschorle',  icon: '🧃', sell: 240, cat: 'dish', xp: 1 },
  inselmelange:  { name: 'Insel-Melange',  icon: '☕', sell: 800, cat: 'dish', xp: 3, desc: 'Mit Herz im Milchschaum – nur bei perfekter Zubereitung' },
  riesenkuerbis: { name: 'Riesenkürbis',   icon: '🎃', sell: 4000, cat: 'misc', xp: 10 },
  riesenmelone:  { name: 'Riesenmelone',   icon: '🍉', sell: 4500, cat: 'misc', xp: 10 },
  riesenkartoffel: { name: 'Riesenkartoffel', icon: '🥔', sell: 3500, cat: 'misc', xp: 10 },
  fahrrad:       { name: 'Fahrrad',        icon: '🚲', buy: 4500, lvl: 2, gear: true, desc: 'Viel schneller über die Insel flitzen' },
  // Inselleben 6 (src/extras6.js)
  tandem:        { name: 'Tandem',         icon: '🚲', buy: 9000, lvl: 3, gear: true, desc: 'Fahrrad für zwei: Freunde können hinten aufsitzen' },
  veredelmesser: { name: 'Veredelungsmesser', icon: '✂️', buy: 1200, lvl: 2, gear: true, desc: 'In der Leiste wählen und an einen Obstbaum: eine zweite Obstsorte aufpfropfen' },
  wolle:         { name: 'Wolle',          icon: '🧶', sell: 180, cat: 'mat', xp: 1 },
  rosenhonig:    { name: 'Rosenhonig',     icon: '🍯', sell: 700, cat: 'mat', xp: 3, honey: 'rot' },
  bluetenhonig:  { name: 'Blütenhonig',    icon: '🍯', sell: 650, cat: 'mat', xp: 3, honey: 'rosa' },
  sonnenhonig:   { name: 'Sonnenhonig',    icon: '🍯', sell: 600, cat: 'mat', xp: 3, honey: 'gelb' },
  bernsteinhonig: { name: 'Bernsteinhonig', icon: '🍯', sell: 650, cat: 'mat', xp: 3, honey: 'orange' },
  lavendelhonig: { name: 'Lavendelhonig',  icon: '🍯', sell: 750, cat: 'mat', xp: 3, honey: 'lila' },
  himmelshonig:  { name: 'Himmelshonig',   icon: '🍯', sell: 750, cat: 'mat', xp: 3, honey: 'blau' },
  kleehonig:     { name: 'Kleehonig',      icon: '🍯', sell: 600, cat: 'mat', xp: 3, honey: 'weiss' },
  birnapfel:     { name: 'Birnapfel',      icon: '🍏', sell: 600, cat: 'fruit', xp: 4, hybrid: 1 },
  kirschpfirsich: { name: 'Kirschpfirsich', icon: '🍑', sell: 650, cat: 'fruit', xp: 4, hybrid: 1 },
  sonnenpfirsich: { name: 'Sonnenpfirsich', icon: '🍑', sell: 650, cat: 'fruit', xp: 4, hybrid: 1 },
  rubinapfel:    { name: 'Rubinapfel',     icon: '🍎', sell: 700, cat: 'fruit', xp: 4, hybrid: 1 },
  goldbirne:     { name: 'Goldbirne',      icon: '🍐', sell: 700, cat: 'fruit', xp: 4, hybrid: 1 },
  // Inselleben 7 (src/extras7.js)
  seerose:       { name: 'Seerose',        icon: '🪷', sell: 380, cat: 'misc', xp: 2 },
  schilf:        { name: 'Schilf',         icon: '🌾', sell: 40, cat: 'mat', xp: 1 },
  blitzstein:    { name: 'Blitzstein',     icon: '⚡', sell: 1500, cat: 'misc', xp: 5, desc: 'Liegt nach einem Gewitter auf der Insel' },
  irrlicht:      { name: 'Irrlicht',       icon: '💫', sell: 900, cat: 'misc', xp: 4, desc: 'An Nebelmorgen mit dem Kescher gefangen' },
  gruener_tee:   { name: 'Grüner Tee',     icon: '🍵', sell: 300, cat: 'dish', xp: 2 },
  papierlaterne: { name: 'Papierlaterne',  icon: '🏮', sell: 80, cat: 'misc', xp: 1, desc: 'Für den Laternenumzug im Herbst' },
  feder:         { name: 'Vogelfeder',     icon: '🪶', sell: 120, cat: 'misc', xp: 1 },
  sprossenpfanne: { name: 'Sprossenpfanne', icon: '🥘', sell: 900, cat: 'dish', xp: 4 },
  zuckerwatte:   { name: 'Zuckerwatte',    icon: '🍭', sell: 60, cat: 'dish', xp: 1 },
  kandisapfel:   { name: 'Kandisapfel',    icon: '🍎', sell: 90, cat: 'dish', xp: 1 },
  lutscher:      { name: 'Lutscher',       icon: '🍭', sell: 30, cat: 'dish', xp: 1 },
  // Siegerrezepte vom Kochwettbewerb
  sternentorte:  { name: 'Sternentorte',   icon: '🎂', sell: 3200, cat: 'dish', xp: 12 },
  inselcurry:    { name: 'Insel-Curry',    icon: '🍛', sell: 2600, cat: 'dish', xp: 10 },
  mondpudding:   { name: 'Mondpudding',    icon: '🍮', sell: 2400, cat: 'dish', xp: 10 },
  regenbogeneis: { name: 'Regenbogen-Eis', icon: '🍨', sell: 2800, cat: 'dish', xp: 11 },
  perle:     { name: 'Perle',        icon: '⚪', sell: 10000, cat: 'misc', xp: 10 },
  ruebe:     { name: 'Rübe',         icon: '🍠', cat: 'misc', turnip: true },
  faule_ruebe: { name: 'Faule Rübe', icon: '🥀', sell: 0, cat: 'misc' },
  harz:      { name: 'Kiefernharz',  icon: '🍯', sell: 160, cat: 'mat', xp: 2 },
  kiefernzapfen: { name: 'Kiefernzapfen', icon: '🌰', sell: 50, cat: 'mat', xp: 1 },
  steinpilz: { name: 'Steinpilz',    icon: '🍄', sell: 320, cat: 'veg', xp: 3 },
  pfifferling: { name: 'Pfifferling', icon: '🟠', sell: 240, cat: 'veg', xp: 2 },
  morchel:   { name: 'Morchel',      icon: '🟤', sell: 900, cat: 'veg', xp: 6 },
  fliegenpilz: { name: 'Fliegenpilz', icon: '🔴', sell: 180, cat: 'misc', xp: 2 },
  blaubeere: { name: 'Blaubeeren',   icon: '🫐', sell: 90, cat: 'fruit', xp: 1 },
  himbeere:  { name: 'Himbeeren',    icon: '🍓', sell: 90, cat: 'fruit', xp: 1 },
  honig:     { name: 'Honig',        icon: '🍯', sell: 420, cat: 'mat', xp: 3 },
  amethyst:  { name: 'Amethyst',     icon: '🔮', sell: 1500, cat: 'misc', xp: 6 },
  rubin:     { name: 'Rubin',        icon: '♦️', sell: 3200, cat: 'misc', xp: 8 },
  saphir:    { name: 'Saphir',       icon: '🔷', sell: 3200, cat: 'misc', xp: 8 },
  opal:      { name: 'Opal',         icon: '🫧', sell: 6500, cat: 'misc', xp: 12 },
  // Höhlen-Tiefen (unter der Kristallhöhle)
  mondstein: { name: 'Mondstein',    icon: '🌙', sell: 2400, cat: 'misc', xp: 8 },
  topas:     { name: 'Topas',        icon: '🔶', sell: 2800, cat: 'misc', xp: 8 },
  smaragd:   { name: 'Smaragd',      icon: '💚', sell: 3600, cat: 'misc', xp: 9 },
  regenbogenkristall: { name: 'Regenbogenkristall', icon: '🌈', sell: 12000, cat: 'misc', xp: 16 },
  grubenlaterne: { name: 'Grubenlaterne', icon: '🏮', cat: 'misc', desc: 'Leuchtet in den Höhlen-Tiefen – die Treppe liegt hinten in der Kristallhöhle' },
  mehl:      { name: 'Mehl',         icon: '🥡', buy: 40 },
  zucker:    { name: 'Zucker',       icon: '🧂', buy: 40 },
  milch:     { name: 'Milch',        icon: '🥛', buy: 60 },
  ei:        { name: 'Ei',           icon: '🥚', buy: 40 },
  // Gerichte
  brot:      { name: 'Inselbrot',    icon: '🍞', sell: 260, cat: 'dish', xp: 3 },
  pilzpfanne: { name: 'Pilzpfanne',  icon: '🍳', sell: 1300, cat: 'dish', xp: 8 },
  beerenkuchen: { name: 'Beerenkuchen', icon: '🥧', sell: 1500, cat: 'dish', xp: 9 },
  honigbrot: { name: 'Honigbrot',    icon: '🍞', sell: 1100, cat: 'dish', xp: 7 },
  waldtee:   { name: 'Waldtee',      icon: '🍵', sell: 700, cat: 'dish', xp: 5 },
  pfannkuchen: { name: 'Pfannkuchen', icon: '🥞', sell: 380, cat: 'dish', xp: 4 },
  apfelkuchen: { name: 'Apfelkuchen', icon: '🥧', sell: 620, cat: 'dish', xp: 6 },
  kirschtorte: { name: 'Kirschtorte', icon: '🍰', sell: 640, cat: 'dish', xp: 6 },
  // Inselleben 10: Süßes zum Verschenken (gibt Herzpunkte, wenn ihr es euch gegenseitig schenkt)
  herzkekse:   { name: 'Herzkekse',          icon: '🍪', sell: 320,  cat: 'dish', xp: 4 },
  cupcake:     { name: 'Erdbeer-Cupcake',    icon: '🧁', sell: 560,  cat: 'dish', xp: 5 },
  macarons:    { name: 'Rosen-Macarons',     icon: '🌸', sell: 680,  cat: 'dish', xp: 6 },
  herzchentorte: { name: 'Herzchentorte',    icon: '🎂', sell: 1900, cat: 'dish', xp: 10 },
  // Inselleben 12: Küche mit dem neuen Gemüse
  gurkensalat:   { name: 'Gurkensalat',      icon: '🥗', sell: 300,  cat: 'dish', xp: 3 },
  paprikapfanne: { name: 'Paprikapfanne',    icon: '🍲', sell: 620,  cat: 'dish', xp: 6 },
  ofengemuese:   { name: 'Ofengemüse',       icon: '🍆', sell: 700,  cat: 'dish', xp: 6 },
  blaubeermuffin: { name: 'Blaubeermuffin',  icon: '🧁', sell: 540,  cat: 'dish', xp: 5 },
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
  if (c.peony) ITEMS['s_' + k].name = c.name.replace('Pfingstrose', 'Pfingstrosen') + '-Samen'; // „Weiße Pfingstrosen-Samen“
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
  // nur bei besonderem Wetter (Index 8): storm = Gewitter, fog = Nebel, stars = klarer Sternenhimmel nachts
  ['blitzaal', 'Blitzaal', '⚡', 2600, [3, 5, 7], null, 'sea', 4, 'storm'],
  ['nebelhecht', 'Nebelhecht', '🐟', 1800, [4, 6, 8], null, 'river', 4, 'fog'],
  ['sternbarsch', 'Sternbarsch', '🌟', 2200, [4, 6, 8], null, 'pond', 3, 'stars'],
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
  ['vogelfalter', 'Vogelfalter', '🦋', 2500, null, 'tropic', 14],
  ['goliathkaefer', 'Goliathkäfer', '🪲', 4000, null, 'tropic', 8],
  ['atlasspinner', 'Atlasspinner', '🦋', 3000, null, 'tropic', 10],
  ['orchideenmantis', 'Orchideenmantis', '🌸', 2400, null, 'tropic', 12],
  ['blattschneider', 'Blattschneiderameise', '🐜', 800, null, 'tropic', 26],
  ['stabschrecke', 'Riesen-Stabschrecke', '🥢', 1500, null, 'tropic', 20],
  // nur bei besonderem Wetter (Index 7)
  ['gewitterkaefer', 'Gewitterkäfer', '🪲', 1600, null, 'any', 18, 'storm'],
  ['nebelfalter', 'Nebelfalter', '🦋', 1400, null, 'any', 20, 'fog'],
  ['sternenfalter', 'Sternenfalter', '🦋', 3000, null, 'night', 14, 'stars'],
  // Schmetterlingsgarten (Index 8 = Lieblingsblume): nur in der Nähe eines Schmetterlingshauses
  ['tulpenfalter', 'Tulpenfalter', '🦋', 1200, ['spring'], 'garden', 20, null, 'tulpe'],
  ['lavendelfalter', 'Lavendelfalter', '🦋', 1800, ['spring', 'summer'], 'garden', 16, null, 'lavendel'],
  ['glockenfalter', 'Glockenfalter', '🦋', 1900, ['spring', 'summer'], 'garden', 14, null, 'glockenblume'],
  ['himmelsblaeuling', 'Himmelsbläuling', '🦋', 2400, ['spring'], 'garden', 12, null, 'vergissmeinnicht'],
  ['sonnenfalter', 'Sonnenfalter', '🦋', 1600, ['summer'], 'garden', 18, null, 'sonnenblume'],
  ['rosenschwaermer', 'Rosenschwärmer', '🦋', 2200, ['summer', 'autumn'], 'garden', 12, null, 'rose'],
  ['dahlienpfau', 'Dahlienpfau', '🦋', 2600, ['summer', 'autumn'], 'garden', 10, null, 'dahlie'],
  ['eisfalter', 'Eisfalter', '🦋', 3000, ['winter'], 'garden', 10, null, 'christrose'],
  // Inselleben 7: nur im Seerosenmoor (Frösche auf den Seerosenblättern, Libellen über dem Wasser)
  ['laubfrosch', 'Laubfrosch', '🐸', 420, ['spring', 'summer', 'autumn'], 'moor', 30],
  ['moorfrosch', 'Moorfrosch', '🐸', 650, ['spring', 'summer'], 'moor', 18],
  ['goldfrosch', 'Goldfrosch', '🐸', 2600, ['summer'], 'moor', 4],
  ['azurjungfer', 'Azurjungfer', '🦋', 520, ['spring', 'summer'], 'moor', 26],
  ['mosaikjungfer', 'Mosaikjungfer', '🦋', 900, ['summer', 'autumn'], 'moor', 14],
  ['feuerlibelle', 'Feuerlibelle', '🦋', 1700, ['summer'], 'moor', 6],
];
for (const b of BUGS) b[4] ||= ['spring', 'summer', 'autumn', 'winter'];

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
  nistkasten: { name: 'Nistkasten',    icon: '🐦', buy: 900, lvl: 1, kind: 'deco', solid: 1, desc: 'In die Nähe von Bäumen stellen – Vögel ziehen ein und brüten' },
  klippenbank: { name: 'Klippenbank',  icon: '🌅', buy: 3200, lvl: 1, kind: 'deco', solid: 1, desc: 'Am besten an die Küste im Osten stellen – zu zweit bei Sonnenuntergang hinsetzen' },
  duellpokal: { name: 'Duell-Pokal',    icon: '🏆', lvl: 1, kind: 'deco', solid: 1, desc: 'Für den Sieg im Duell der Woche' },
  mooslaterne: { name: 'Moos-Laterne',  icon: '🏮', lvl: 1, kind: 'deco', solid: 1, glow: 1, desc: 'Von Eule Oskar im Kiefernwald' },
  wiesenschaukel: { name: 'Wiesenschaukel', icon: '🌼', lvl: 1, kind: 'deco', solid: 1, sit: 1, desc: 'Von Hummel Hilde auf der Blütenwiese' },
  kristallsaeule: { name: 'Kristallsäule', icon: '💎', lvl: 1, kind: 'deco', solid: 1, glow: 1, desc: 'Von Maulwurf Grubi in der Kristallhöhle' },
  marktstand: { name: 'Marktstand',    icon: '🧺', buy: 2500, lvl: 2, kind: 'deco', solid: 1, desc: 'Samstags Bauernmarkt: die Nachbarn kaufen eure Ernte' },
  bambuszaun: { name: 'Bambuszaun',    icon: '🎋', lvl: 1, kind: 'deco', solid: 1, desc: 'Aus dem Bambushain' },
  irrlichtlaterne: { name: 'Irrlicht-Laterne', icon: '💫', lvl: 1, kind: 'deco', solid: 1, glow: 1, desc: 'Drei Irrlichter in einem Glas' },
  schafweide: { name: 'Schafweide',    icon: '🐑', buy: 6800, lvl: 2, kind: 'producer', farm: 1, solid: 1, item: 'wolle', n: 1, every: DAY, desc: 'Zwei Schafe geben jeden Tag Wolle – wenn sie gefüttert sind (🌾 Weizen, 🥕 Karotte, 🍎 Apfel)' },
  bienenkasten: { name: 'Bienenkasten', icon: '🐝', buy: 3200, lvl: 1, kind: 'deco', solid: 1, desc: 'Neben blühende Blumen stellen – der Honig schmeckt nach den Blumen ringsum' },
  picknickdecke: { name: 'Picknickdecke', icon: '🧺', buy: 1600, lvl: 1, kind: 'deco', desc: 'Ein Gericht auslegen – die Nachbarn kommen zum Picknick' },
  komposter:  { name: 'Komposter',     icon: '🟫', buy: 1500, lvl: 1, kind: 'deco', solid: 1, desc: 'Unkraut & Reste hinein – morgens Kompost und Regenwürmer' },
  toepferscheibe: { name: 'Töpferscheibe', icon: '🏺', buy: 2800, lvl: 2, kind: 'deco', solid: 1, desc: 'Aus Lehm Vasen, Schalen, Tassen und Krüge – über Nacht im Ofen' },
  ponystall:  { name: 'Ponystall',     icon: '🐴', buy: 12000, lvl: 3, kind: 'deco', solid: 1, desc: 'Ein Pony zum Füttern, Striegeln und Ausreiten' },
  gluehlaterne: { name: 'Glühwürmchen-Laterne', icon: '✨', lvl: 1, kind: 'deco', solid: 1, glow: 1, desc: 'Aus drei Glühwürmchen gebastelt' },
  olympiapokal: { name: 'Olympia-Pokal', icon: '🏅', lvl: 1, kind: 'deco', solid: 1, desc: 'Drei Goldmedaillen bei der Inselolympiade' },
  theaterpokal: { name: 'Theater-Pokal', icon: '🎭', lvl: 1, kind: 'deco', solid: 1, desc: 'Eine Aufführung mit fünf Sternen' },
  zwerg:      { name: 'Gartenzwerg',   icon: '🧙', buy: 600,  lvl: 2, kind: 'deco', solid: 1 },
  bank:       { name: 'Parkbank',      icon: '🪑', buy: 800,  lvl: 2, kind: 'deco', solid: 1 },
  vogelhaus:  { name: 'Vogelhäuschen', icon: '🐦', buy: 700,  lvl: 3, kind: 'deco', solid: 1 },
  kirschbaum: { name: 'Kirschblütenbaum', icon: '🌸', buy: 1800, lvl: 3, kind: 'deco', solid: 1 },
  herz:       { name: 'Herzbogen',     icon: '💕', buy: 2000, lvl: 4, kind: 'deco' },
  brunnen:    { name: 'Brunnen',       icon: '⛲', buy: 3000, lvl: 5, kind: 'deco', solid: 1 },
  sonnenschirm: { name: 'Sonnenschirm', icon: '⛱️', buy: 1200, lvl: 2, kind: 'deco', solid: 1 },
  liegestuhl: { name: 'Liegestuhl',    icon: '🪑', buy: 900,  lvl: 2, kind: 'deco', solid: 1, sit: 1 },
  bienenstock: { name: 'Bienenstock',  icon: '🐝', lvl: 1, kind: 'producer', solid: 1, item: 'honig', n: 1, every: 2 * DAY, desc: 'Gibt alle zwei Tage Honig' },
  beerenstrauch: { name: 'Blaubeerstrauch', icon: '🫐', lvl: 1, kind: 'producer', solid: 1, item: 'blaubeere', n: 4, every: DAY, desc: 'Trägt jeden Tag 4 Blaubeeren' },
  kristallfels: { name: 'Kristallfels', icon: '💎', lvl: 1, kind: 'deco', solid: 1, glow: 1, desc: 'Leuchtet nachts' },
  pilzlaterne: { name: 'Pilzlaterne',  icon: '🍄', lvl: 1, kind: 'deco', solid: 1, glow: 1, desc: 'Ein leuchtender Fliegenpilz' },
  sternlampe: { name: 'Sternenlampe',  icon: '🌠', lvl: 1, kind: 'deco', solid: 1, glow: 1, desc: 'Nur selbst gebaut: aus Sternsplittern' },
  apfelbaum:  { name: 'Apfelbaum',     icon: '🌳', buy: 900,  lvl: 2, kind: 'producer', solid: 1, item: 'apfel', n: 3, every: 2 * DAY, desc: 'Trägt alle zwei Tage 3 Äpfel' },
  orangenbaum:{ name: 'Orangenbaum',   icon: '🌳', buy: 900,  lvl: 3, kind: 'producer', solid: 1, item: 'orange', n: 3, every: 2 * DAY, desc: 'Trägt alle zwei Tage 3 Orangen' },
  pfirsichbaum:{ name: 'Pfirsichbaum', icon: '🌳', buy: 900,  lvl: 3, kind: 'producer', solid: 1, item: 'pfirsich', n: 3, every: 2 * DAY, desc: 'Trägt alle zwei Tage 3 Pfirsiche' },
  kirschenbaum:{ name: 'Kirschbaum',   icon: '🌳', buy: 900,  lvl: 4, kind: 'producer', solid: 1, item: 'kirsche', n: 3, every: 2 * DAY, desc: 'Trägt alle zwei Tage 3 Kirschen' },
  birnbaum:   { name: 'Birnbaum',      icon: '🌳', buy: 900,  lvl: 4, kind: 'producer', solid: 1, item: 'birne', n: 3, every: 2 * DAY, desc: 'Trägt alle zwei Tage 3 Birnen' },
  // Gärtnerei in der Bummelgasse
  hortensie:  { name: 'Hortensienbusch', icon: '💐', buy: 700, lvl: 1, kind: 'deco', solid: 1, garden: 1 },
  buchsbaum:  { name: 'Buchsbaumkugel', icon: '🟢', buy: 500, lvl: 1, kind: 'deco', solid: 1, garden: 1 },
  rosenbogen: { name: 'Rosenbogen',    icon: '🌹', buy: 2400, lvl: 3, kind: 'deco', garden: 1 },
  // Tauschhütte auf der Tropeninsel (für Medaillen)
  bananenbaum:{ name: 'Bananenstaude', icon: '🌴', medals: 8, lvl: 1, kind: 'producer', solid: 1, item: 'banane', n: 3, every: 2 * DAY, desc: 'Trägt alle zwei Tage 3 Bananen' },
  mangobaum:  { name: 'Mangobaum',     icon: '🌳', medals: 8, lvl: 1, kind: 'producer', solid: 1, item: 'mango', n: 3, every: 2 * DAY, desc: 'Trägt alle zwei Tage 3 Mangos' },
  tikifackel: { name: 'Tiki-Fackel',   icon: '🔥', medals: 3, lvl: 1, kind: 'deco', solid: 1, glow: 1 },
  haengematte:{ name: 'Hängematte',    icon: '🏝️', medals: 6, lvl: 1, kind: 'deco', solid: 1, sit: 1 },
  surfbrett:  { name: 'Surfbrett',     icon: '🏄', medals: 4, lvl: 1, kind: 'deco', solid: 1 },
  sandburg:   { name: 'Sandburg',      icon: '🏰', medals: 2, lvl: 1, kind: 'deco', solid: 1 },
  // Belohnungen
  pokal:      { name: 'Wohnwert-Pokal', icon: '🏆', lvl: 1, kind: 'deco', solid: 1, desc: 'Vom Wohnwert-Verein für ein wunderschönes Zuhause' },
  // Feste, Geburtstage und Turniere
  eiernest:   { name: 'Eiernest',      icon: '🪺', lvl: 1, kind: 'deco', solid: 1, desc: 'Für alle 10 Eier bei der Eiersuche' },
  herzballon: { name: 'Herzballon',    icon: '🎈', lvl: 1, kind: 'deco', solid: 1, desc: 'Andenken ans Sommerfeuerwerk' },
  kuerbislaterne: { name: 'Kürbislaterne', icon: '🎃', lvl: 1, kind: 'deco', solid: 1, glow: 1, desc: 'Für Bonbons von allen Nachbarn beim Kürbisfest' },
  lichterbaum: { name: 'Lichterbaum',  icon: '🎄', lvl: 1, kind: 'deco', solid: 1, glow: 1, desc: 'Geschenk zum Lichterfest' },
  schneemann: { name: 'Schneemann',    icon: '⛄', lvl: 1, kind: 'deco', solid: 1, desc: 'Aus Schneebällen gerollt' },
  torte:      { name: 'Geburtstagstorte', icon: '🎂', lvl: 1, kind: 'deco', solid: 1, desc: 'Dankeschön für ein Geburtstagsgeschenk' },
  angelpokal: { name: 'Angel-Pokal',   icon: '🏆', lvl: 1, kind: 'deco', solid: 1, desc: 'Gold beim Angelturnier' },
  kaeferpokal:{ name: 'Krabbeltier-Pokal', icon: '🏆', lvl: 1, kind: 'deco', solid: 1, desc: 'Gold beim Krabbeltier-Turnier' },
  baustelle:  { name: 'Bauplatz-Pflock', icon: '🚩', lvl: 1, kind: 'site', solid: 1, desc: 'Markiert den Bauplatz für ein Inselprojekt' },
  // Gärtnerei-Technik, Feuerwerk, Muster, Handel
  gewaechshaus: { name: 'Gewächshaus',  icon: '🏡', buy: 6800, lvl: 3, kind: 'deco', solid: 1, garden: 1, desc: 'Beete bis 2 Felder rundherum wachsen das ganze Jahr wie in ihrer Saison' },
  sprinkler:  { name: 'Sprinkler',      icon: '💦', buy: 1800, lvl: 2, kind: 'deco', solid: 1, garden: 1, desc: 'Gießt die 8 Beete rundherum von ganz allein' },
  sternsprinkler: { name: 'Sternsprinkler', icon: '⭐', buy: 6500, lvl: 5, kind: 'deco', solid: 1, garden: 1, glow: 1, desc: 'Gießt alle Beete bis 2 Felder rundherum' },
  sternenrakete: { name: 'Sternenrakete', icon: '🚀', lvl: 1, kind: 'deco', solid: 1, glow: 1, desc: 'Für 5 Inselsterne: antippen = Feuerwerk am Abend' },
  fahne:      { name: 'Inselfahne',     icon: '🚩', buy: 600, lvl: 1, kind: 'deco', solid: 1, desc: 'Zeigt euer eigenes Muster (🎨 Muster-Editor)' },
  tauschstand: { name: 'Tauschstand',   icon: '🏪', buy: 2500, lvl: 2, kind: 'deco', solid: 1, desc: 'Hier bietet ihr Sachen an – Nachbarn und Besuch kaufen sie' },
  schatzkiste: { name: 'Schatzkiste',   icon: '🏴‍☠️', lvl: 1, kind: 'deco', solid: 1, glow: 1, desc: 'Vom großen Schatz der Schatzkarte' },
  huehnerstall: { name: 'Hühnerstall',  icon: '🐔', buy: 4800, lvl: 2, kind: 'producer', farm: 1, solid: 1, item: 'ei', n: 2, every: DAY, desc: 'Drei Hühner legen jeden Tag Eier – wenn sie gefüttert sind (🌾 Weizen, 🥔 Kartoffel)' },
  kuhweide:   { name: 'Kuhweide',       icon: '🐄', buy: 7500, lvl: 3, kind: 'producer', farm: 1, solid: 1, item: 'milch', n: 1, every: DAY, desc: 'Eine Kuh gibt jeden Tag Milch – wenn sie gefüttert ist (🌾 Weizen, 🥕 Karotte, 🍎 Apfel)' },
  // Grillabend, Schmetterlingsgarten, Fotowettbewerb, Schiffswrack
  strandgrill: { name: 'Strandgrill',    icon: '🔥', buy: 2600, lvl: 2, kind: 'deco', solid: 1, glow: 1, desc: 'Fisch, Mais & Co. grillen – abends kommen die Nachbarn dazu' },
  schmetterlingshaus: { name: 'Schmetterlingshaus', icon: '🦋', buy: 3800, lvl: 2, kind: 'deco', solid: 1, garden: 1, desc: 'Lockt seltene Schmetterlinge an, wenn ihre Lieblingsblumen rundherum blühen' },
  fotopokal:  { name: 'Foto-Pokal',      icon: '🏆', lvl: 1, kind: 'deco', solid: 1, desc: 'Gewonnen beim Fotowettbewerb' },
  steuerrad:  { name: 'Altes Steuerrad', icon: '☸️', lvl: 1, kind: 'deco', solid: 1, desc: 'Aus dem Schiffswrack' },
  anker:      { name: 'Schiffsanker',    icon: '⚓', lvl: 1, kind: 'deco', solid: 1, desc: 'Aus dem Schiffswrack' },
  // Pflanzen (Gärtnerei Knolle)
  farnbusch:  { name: 'Farnbusch',       icon: '🌿', buy: 600,  lvl: 1, kind: 'deco', solid: 1, garden: 1 },
  fliederbusch: { name: 'Fliederbusch',  icon: '🪻', buy: 900,  lvl: 1, kind: 'deco', solid: 1, garden: 1 },
  rosenstrauch: { name: 'Rosenstrauch',  icon: '🌹', buy: 1100, lvl: 2, kind: 'deco', solid: 1, garden: 1 },
  bambusgruppe: { name: 'Bambus',        icon: '🎋', buy: 1200, lvl: 2, kind: 'deco', solid: 1, garden: 1 },
  kakteengruppe: { name: 'Kakteen',      icon: '🌵', buy: 900,  lvl: 2, kind: 'deco', solid: 1, garden: 1 },
  kuebelpalme: { name: 'Kübelpalme',     icon: '🌴', buy: 1400, lvl: 2, kind: 'deco', solid: 1, garden: 1 },
  blumenkuebel: { name: 'Blumenkübel',   icon: '🪴', buy: 700,  lvl: 1, kind: 'deco', solid: 1, garden: 1 },
  kraeuterbeet: { name: 'Kräuterbeet',   icon: '🌱', buy: 800,  lvl: 1, kind: 'deco', solid: 1, garden: 1 },
  efeusaeule: { name: 'Efeusäule',       icon: '🏛️', buy: 1300, lvl: 3, kind: 'deco', solid: 1, garden: 1 },
  zierkuerbisse: { name: 'Zierkürbisse', icon: '🎃', buy: 600,  lvl: 2, kind: 'deco', garden: 1 },
  seerosenbecken: { name: 'Seerosenbecken', icon: '🪷', buy: 2800, lvl: 3, kind: 'deco', solid: 1, garden: 1 },
  trauerweide: { name: 'Trauerweide',    icon: '🌳', buy: 3600, lvl: 4, kind: 'deco', solid: 1, garden: 1 },
  // Deko
  schaukel:   { name: 'Schaukel',        icon: '🛝', buy: 2400, lvl: 2, kind: 'deco', solid: 1, sit: 1 },
  wippe:      { name: 'Wippe',           icon: '⚖️', buy: 1600, lvl: 2, kind: 'deco', solid: 1 },
  rutsche:    { name: 'Rutsche',         icon: '🛝', buy: 2800, lvl: 3, kind: 'deco', solid: 1 },
  sandkasten: { name: 'Sandkasten',      icon: '🏖️', buy: 1400, lvl: 2, kind: 'deco', solid: 1 },
  vogeltraenke: { name: 'Vogeltränke',   icon: '🐦', buy: 900,  lvl: 1, kind: 'deco', solid: 1 },
  windrad:    { name: 'Windrad',         icon: '🌀', buy: 1200, lvl: 2, kind: 'deco', solid: 1 },
  wegweiser:  { name: 'Wegweiser',       icon: '🪧', buy: 600,  lvl: 1, kind: 'deco', solid: 1 },
  laternenkette: { name: 'Laternenkette', icon: '🏮', buy: 1800, lvl: 2, kind: 'deco', solid: 1, glow: 1 },
  steinlaterne: { name: 'Steinlaterne',  icon: '🏯', buy: 1500, lvl: 2, kind: 'deco', solid: 1, glow: 1 },
  lagerfeuer: { name: 'Lagerfeuer',      icon: '🔥', buy: 900,  lvl: 1, kind: 'deco', solid: 1, glow: 1 },
  strandkorb: { name: 'Strandkorb',      icon: '🏖️', buy: 2200, lvl: 2, kind: 'deco', solid: 1, sit: 1 },
  vogelscheuche: { name: 'Vogelscheuche', icon: '🧑‍🌾', buy: 800, lvl: 1, kind: 'deco', solid: 1 },
  leiterwagen: { name: 'Leiterwagen',    icon: '🛒', buy: 1200, lvl: 2, kind: 'deco', solid: 1 },
  fass:       { name: 'Holzfass',        icon: '🛢️', buy: 400,  lvl: 1, kind: 'deco', solid: 1 },
  kistenstapel: { name: 'Kistenstapel',  icon: '📦', buy: 500,  lvl: 1, kind: 'deco', solid: 1 },
  telefonzelle: { name: 'Telefonzelle',  icon: '☎️', buy: 3200, lvl: 3, kind: 'deco', solid: 1, glow: 1 },
  eiswagen:   { name: 'Eiswagen',        icon: '🍦', buy: 3600, lvl: 3, kind: 'deco', solid: 1 },
  musikbox:   { name: 'Musikbox',        icon: '📻', buy: 2600, lvl: 3, kind: 'deco', solid: 1, glow: 1 },
  gaestebuch: { name: 'Gästebuch',       icon: '📖', buy: 900, lvl: 1, kind: 'deco', solid: 1, desc: 'Besucher und Mitspieler hinterlassen hier Grüße' },
  gartenpokal: { name: 'Garten-Pokal',    icon: '🏆', lvl: 1, kind: 'deco', solid: 1, desc: 'Gewonnen beim Gartenwettbewerb' },
  gemuesepokal: { name: 'Riesengemüse-Pokal', icon: '🏆', lvl: 1, kind: 'deco', solid: 1, desc: 'Schwerstes Gemüse beim Kürbisfest' },
  modepokal:  { name: 'Mode-Pokal',      icon: '🏆', lvl: 1, kind: 'deco', solid: 1, desc: 'Fünf Sterne bei der Modenschau' },
  rallyepokal: { name: 'Rallye-Pokal',   icon: '🏆', lvl: 1, kind: 'deco', solid: 1, desc: 'Den Stempelpass vollgemacht' },
  golfpokal:  { name: 'Minigolf-Pokal',  icon: '🏆', lvl: 1, kind: 'deco', solid: 1, desc: 'Platzrekord auf dem Minigolfplatz' },
  tanzpokal:  { name: 'Tanz-Pokal',      icon: '🏆', lvl: 1, kind: 'deco', solid: 1, desc: 'Ein Gold-Tanz im Mondschein-Club' },
  strandpokal: { name: 'Sandburgen-Pokal', icon: '🏆', lvl: 1, kind: 'deco', solid: 1, desc: 'Gewonnen beim Sandburgen-Wettbewerb' },
  windpokal:  { name: 'Drachen-Pokal',  icon: '🏆', lvl: 1, kind: 'deco', solid: 1, desc: 'Gewonnen beim Drachenfest' },
  grundstueck: { name: 'Grundstück',    icon: '🪧', lvl: 1, kind: 'deco', solid: 1, desc: 'Hier zieht am nächsten Morgen euer neuer Nachbar ein' },
  nachbarhaus: { name: 'Nachbarhaus',   icon: '🏠', lvl: 1, kind: 'deco', solid: 1, desc: 'Hier wohnt Besuch, der geblieben ist' },
  // Inselleben 12: mehr für den Garten (Gärtnerei Knolle) und zum Verweilen
  lavendelbusch: { name: 'Lavendelbusch', icon: '💜', buy: 500,  lvl: 1, kind: 'deco', solid: 1, garden: 1 },
  pampasgras:  { name: 'Pampasgras',      icon: '🌾', buy: 600,  lvl: 1, kind: 'deco', solid: 1, garden: 1 },
  hochbeet:    { name: 'Hochbeet',        icon: '🥬', buy: 900,  lvl: 1, kind: 'deco', solid: 1, garden: 1 },
  blumenschubkarre: { name: 'Blumen-Schubkarre', icon: '🌼', buy: 1100, lvl: 1, kind: 'deco', solid: 1, garden: 1 },
  herzhecke:   { name: 'Herz-Hecke',      icon: '💚', buy: 1500, lvl: 2, kind: 'deco', solid: 1, garden: 1 },
  blumenfahrrad: { name: 'Blumenfahrrad', icon: '🚲', buy: 1800, lvl: 2, kind: 'deco', solid: 1, garden: 1 },
  feenhaus:    { name: 'Feenhäuschen',    icon: '🍄', buy: 2200, lvl: 3, kind: 'deco', solid: 1, glow: 1, garden: 1 },
  giesskannenbrunnen: { name: 'Gießkannen-Brunnen', icon: '⛲', buy: 2600, lvl: 3, kind: 'deco', solid: 1, garden: 1 },
  magnolie:    { name: 'Magnolie',        icon: '🌸', buy: 3400, lvl: 4, kind: 'deco', solid: 1, garden: 1 },
  japanahorn:  { name: 'Japanischer Ahorn', icon: '🍁', buy: 3400, lvl: 4, kind: 'deco', solid: 1, garden: 1 },
  vogelvilla:  { name: 'Vogelvilla',      icon: '🐦', buy: 1400, lvl: 2, kind: 'deco', solid: 1 },
  entenhaus:   { name: 'Entenhäuschen',   icon: '🦆', buy: 1600, lvl: 2, kind: 'deco', solid: 1 },
  lichterbogen: { name: 'Lichterbogen',   icon: '✨', buy: 2800, lvl: 3, kind: 'deco', glow: 1 },
  hollywoodschaukel: { name: 'Hollywoodschaukel', icon: '🛋️', buy: 3200, lvl: 3, kind: 'deco', solid: 1, sit: 1 },
};
// Inselprojekte (Rathaus): erst einen Bauplatz abstecken, dann gemeinsam Spenden sammeln, am nächsten Morgen steht es.
export const PROJECTS = {
  laternenpfahl: { name: 'Gaslaterne',          icon: '💡', cost: 8000,  lvl: 1, glow: 1 },
  sonnenuhr:     { name: 'Sonnenuhr',           icon: '🕰️', cost: 12000, lvl: 1 },
  picknick:      { name: 'Picknickplatz',       icon: '🧺', cost: 15000, lvl: 2, sit: 1 },
  blumentor:     { name: 'Blumentor',           icon: '💐', cost: 18000, lvl: 2 },
  fernrohr:      { name: 'Fernrohr',            icon: '🔭', cost: 24000, lvl: 3 },
  statue:        { name: 'Kuschelstatue',       icon: '🗿', cost: 30000, lvl: 3 },
  pavillon:      { name: 'Musikpavillon',       icon: '🎪', cost: 45000, lvl: 4 },
  springbrunnen: { name: 'Großer Springbrunnen', icon: '⛲', cost: 50000, lvl: 5 },
  windmuehle:    { name: 'Windmühle',           icon: '🌬️', cost: 60000, lvl: 5 },
  glockenturm:   { name: 'Glockenturm',         icon: '🔔', cost: 80000, lvl: 6 },
  leuchtturm:    { name: 'Leuchtturm',          icon: '🗼', cost: 98000, lvl: 7, glow: 1 },
  campingplatz:  { name: 'Campingplatz',        icon: '🏕️', cost: 22000, lvl: 2 },
  seilbahn:      { name: 'Seilbahn',            icon: '🚡', cost: 48000, lvl: 4 },
  ballonplatz:   { name: 'Ballonplatz',         icon: '🎈', cost: 36000, lvl: 3 },
  minigolf:      { name: 'Minigolfplatz',       icon: '⛳', cost: 40000, lvl: 3 },
  inselcafe:     { name: 'Inselcafé',           icon: '☕', cost: 42000, lvl: 3 },
  bibliothek:    { name: 'Bibliothek',          icon: '📚', cost: 52000, lvl: 4 },
  baumhaus:      { name: 'Baumhaus',            icon: '🌳', cost: 38000, lvl: 3 },
  freiluftkino:  { name: 'Freiluftkino',        icon: '🎬', cost: 34000, lvl: 3 },
  buehne:        { name: 'Inselbühne',          icon: '🎭', cost: 44000, lvl: 4 },
  bahnhof:       { name: 'Bimmelbahn',          icon: '🚂', cost: 56000, lvl: 4 },
  restaurant:    { name: 'Inselrestaurant',     icon: '🍽️', cost: 52000, lvl: 4 },
  kapelle:       { name: 'Inselkapelle',        icon: '💒', cost: 48000, lvl: 4 },
};
for (const [k, p] of Object.entries(PROJECTS)) PLACE[k] = { name: p.name, icon: p.icon, lvl: p.lvl, kind: 'project', solid: 1, glow: p.glow, sit: p.sit, desc: 'Inselprojekt' };
for (const [k, p] of Object.entries(PLACE)) ITEMS[k] = { name: p.name, icon: p.icon, buy: p.buy, lvl: p.lvl, place: k, ...(p.buy || p.kind === 'site' || p.kind === 'project' ? {} : { sell: 500, cat: 'misc' }), ...(p.garden ? { garden: 1 } : {}) };
export const MACHINE_CAP = 20;

// Ausbau: cost[i] = Preis für die nächste Stufe, req[i] = benötigtes Insel-Level.
export const UPGRADES = {
  house:  { tab: 'farm',  name: 'Haus ausbauen', icon: '🏡', start: 1, cost: [9800, 39800, 98000, 198000], req: [3, 6, 9, 12], loan: 1,
            desc: l => ['', 'Kleines Häuschen', 'Gemütliches Haus mit Anbau', 'Traumhaus mit Turm', 'Großes Traumhaus (11×9)', 'Inselvilla (13×9)'][l] },
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
  ['👏', 'Klatschen'], ['🎵', 'Singen'], ['👍', 'Super'], ['✨', 'Drehen'], ['😊', 'Schüchtern'], ['🙈', 'Verlegen'], ['🤔', 'Grübeln'], ['😢', 'Traurig'], ['😡', 'Grummelig'], ['😴', 'Müde'], ['💤', 'Schlafen'], ['🍀', 'Glück'], ['🐾', 'Haustier-Trick']];
export const EMOTES = EMOTE_LIST.map(e => e[0]);
export const SOCIAL = { hug: ['🤗', 'Umarmen'], kiss: ['😘', 'Küsschen'], highfive: ['✋', 'High-Five'], dance: ['💃', 'Zusammen tanzen'], hand: ['🤝', 'Händchen halten'], hide: ['🙈', 'Verstecken spielen'], found: ['🎉', 'Gefunden'],
  cuddle: ['🥰', 'Kuscheln'], twirl: ['💫', 'Im Kreis drehen'], heart: ['💞', 'Herz formen'], nose: ['😚', 'Nasenstupser'], forehead: ['💋', 'Stirnküsschen'], lap: ['🫂', 'Anlehnen'] };

// Feste & Turniere im Jahreskreis: Jahreszeit + Tag der Jahreszeit (1–7)
export const FESTS = {
  eier:      { sea: 'spring', d: 4, name: 'Eiersuche', icon: '🥚', desc: '10 bunte Eier sind auf der Insel versteckt – unter Bäumen, am Strand, hinter Häusern. Wer findet alle?' },
  kaefer:    { sea: 'spring', d: 6, name: 'Krabbeltier-Turnier', icon: '🦋', contest: 'bug', desc: 'Am Turnierstand auf dem Dorfplatz anmelden und in 3 Minuten so viele Insekten fangen wie möglich.' },
  angeln:    { sea: 'summer', d: 3, name: 'Angelturnier', icon: '🎣', contest: 'fish', desc: 'Am Turnierstand auf dem Dorfplatz anmelden und in 3 Minuten so viele Fische fangen wie möglich.' },
  feuerwerk: { sea: 'summer', d: 6, name: 'Sommerfeuerwerk', icon: '🎆', desc: 'Ab 19 Uhr leuchtet ein Feuerwerk über der Insel – mit 🔭 in den Himmel schauen, am schönsten zu zweit!' },
  kaefer2:   { sea: 'autumn', d: 2, name: 'Krabbeltier-Turnier', icon: '🐞', contest: 'bug', desc: 'Am Turnierstand auf dem Dorfplatz anmelden und in 3 Minuten so viele Insekten fangen wie möglich.' },
  kuerbis:   { sea: 'autumn', d: 5, name: 'Kürbisfest', icon: '🎃', desc: 'Die Insel leuchtet orange! Besucht alle Nachbarn – jede und jeder hat Bonbons für euch.' },
  angeln2:   { sea: 'winter', d: 3, name: 'Eisangel-Turnier', icon: '🎣', contest: 'fish', desc: 'Am Turnierstand auf dem Dorfplatz anmelden und in 3 Minuten so viele Fische fangen wie möglich.' },
  laternen:  { sea: 'autumn', d: 6, name: 'Laternenumzug', icon: '🏮', desc: 'Abends ab 18 Uhr: Laterne basteln (Werkbank) oder von Mira bekommen, auf dem Dorfplatz den Umzug beginnen – alle Nachbarn laufen singend hinter euch her.' },
  silvester: { sea: 'winter', d: 7, name: 'Silvesternacht', icon: '🎆', desc: 'Im Handy eigene Raketen gestalten, ab 22 Uhr auf dem Dorfplatz den Countdown starten – das letzte Feuerwerk des Jahres!' },
  lichter:   { sea: 'winter', d: 5, name: 'Lichterfest', icon: '🎄', desc: 'Der Lichterbaum strahlt auf dem Dorfplatz und alle beschenken sich. Schaut in den Briefkasten!' },
};
export const CONTEST_SECS = 180;
export const CONTEST_AT = [2, 3];   // Turnierstand auf dem Dorfplatz
// Fest-Deko auf dem Dorfplatz (Modell, x, z) – diese Felder sind an dem Tag belegt
export const FEST_DECO = {
  kuerbis: [['lantern_pumpkin', -3, 1], ['lantern_pumpkin', 3, 1], ['lantern_pumpkin', -2, -1], ['lantern_pumpkin', 2, -1], ['lantern_pumpkin', -2, 3], ['lantern_pumpkin', 2, 3]],
  lichter: [['lichterbaum', -2, 3], ['snowman', 2, 3]],
};
// Blumen-Kreuzungen: zwei verschiedene, gegossene Blumen nebeneinander -> manchmal keimt über Nacht eine seltene Blume daneben
export const HYBRIDS = {
  // Pfingstrosen kreuzen (über Nacht, nebeneinander, gegossen)
  ...Object.fromEntries([['pfingstrose_hellrosa', 'pfingstrose_weiss', 'zweifarbig'], ['pfingstrose', 'pfingstrose_weiss', 'zweifarbig'], ['pfingstrose_gelb', 'pfingstrose_rot', 'koralle'], ['pfingstrose_gelb', 'pfingstrose_hellrosa', 'pfirsich'], ['pfingstrose_creme', 'pfingstrose_koralle', 'pfirsich'],
    ['pfingstrose_hellrosa', 'pfingstrose_rot', 'magenta'], ['pfingstrose', 'pfingstrose_rot', 'magenta'], ['pfingstrose_magenta', 'pfingstrose_rot', 'weinrot'], ['krokus', 'pfingstrose_hellrosa', 'lila'], ['krokus', 'pfingstrose', 'lila'],
    ['kornblume', 'pfingstrose_weiss', 'blau'], ['pfingstrose_blau', 'pfingstrose_gelb', 'regenbogen']].map(([a, b, h]) => [[a, b].sort().join('+'), 'pfingstrose_' + h])),
  'rose+tulpe': 'mohn', 'kosmee+tulpe': 'lilie', 'hyazinthe+stiefmuetterchen': 'kornblume', 'kosmee+rose': 'mohn', 'hyazinthe+rose': 'kornblume', 'stiefmuetterchen+tulpe': 'lilie', 'kosmee+sonnenblume': 'lilie', 'hyazinthe+kosmee': 'kornblume' };
export const BIRTHDAYS = { mira: ['spring', 2], bruno: ['summer', 1], pippa: ['summer', 5], lio: ['autumn', 4], kalle: ['winter', 2], wanda: ['autumn', 7] };

for (const [id, name, icon, sell] of BUGS) ITEMS[id] = { name, icon, sell, cat: 'bug', xp: Math.ceil(sell / 150) };
for (const [id, name, icon, sell] of FOSSILS) ITEMS[id] = { name, icon, sell, cat: 'bug', xp: Math.ceil(sell / 200) };
for (const [id, name, icon, sell] of SHELLS) ITEMS[id] = { name, icon, sell, cat: 'bug', xp: 1 };
for (const [id, name, icon, sell] of SEA) ITEMS[id] = { name, icon, sell, cat: 'fish', xp: Math.ceil(sell / 200) };
export const ALBUM = { fish: FISH.filter(f => !NOT_MUSEUM.includes(f[0])).map(f => f[0]), sea: SEA.map(s => s[0]), bug: BUGS.map(b => b[0]), fossil: FOSSILS.map(f => f[0]), shell: SHELLS.map(s => s[0]), gem: ['goldnugget', 'amethyst', 'rubin', 'saphir', 'opal', 'mondstein', 'topas', 'smaragd', 'regenbogenkristall'], mush: ['steinpilz', 'pfifferling', 'morchel', 'fliegenpilz'] };
// Was ins Museum darf
export const MUSEUM = { fish: ALBUM.fish, sea: ALBUM.sea, bug: ALBUM.bug, fossil: ALBUM.fossil, gem: ALBUM.gem };
export const MUSEUM_ALL = [...MUSEUM.fish, ...MUSEUM.sea, ...MUSEUM.bug, ...MUSEUM.fossil, ...MUSEUM.gem];

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
  ['gebiet1', '🗺️', 'Neues Land', 'Die erste Insel-Erweiterung freigeschaltet', s => Object.keys(s.areas || {}).length >= 1, 2000],
  ['gebiet3', '🧭', 'Entdecker', 'Alle drei Insel-Erweiterungen freigeschaltet', s => Object.keys(s.areas || {}).length >= 3, 8000],
  ['pilze', '🍄', 'Pilzkenner', '25 Pilze gesammelt', s => (s.stats.mush || 0) >= 25, 1500],
  ['honig', '🐝', 'Imkerei', '10 Mal Honig geerntet', s => (s.stats.honey || 0) >= 10, 1500],
  ['edel', '💎', 'Schatzsucher', 'Rubin und Saphir gefunden', s => !!(s.album?.rubin && s.album?.saphir), 3000],
  ['opal', '🌈', 'Regenbogenstein', 'Einen Opal gefunden', s => !!s.album?.opal, 5000],
  ['kiste', '🧰', 'Ordnung muss sein', '50 Sachen in die Lagerkiste gelegt', s => Object.values(s.box || {}).reduce((a, b) => a + b, 0) >= 50, 800],
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
  r_bienenstock: { st: 'craft', out: 'bienenstock', n: 1, in: { holz: 10, honig: 2 } },
  r_beerenstrauch: { st: 'craft', out: 'beerenstrauch', n: 1, in: { blaubeere: 6, ast: 4 } },
  r_kristallfels: { st: 'craft', out: 'kristallfels', n: 1, in: { kristall: 2, amethyst: 1, stein: 6 } },
  r_pilzlaterne: { st: 'craft', out: 'pilzlaterne', n: 1, in: { fliegenpilz: 3, holz: 4, harz: 1 } },
  brot: { st: 'cook', out: 'brot', n: 1, in: { weizen: 3 } },
  pilzpfanne: { st: 'cook', out: 'pilzpfanne', n: 1, in: { steinpilz: 2, pfifferling: 2 } },
  beerenkuchen: { st: 'cook', out: 'beerenkuchen', n: 1, in: { blaubeere: 3, himbeere: 3, mehl: 1 } },
  honigbrot: { st: 'cook', out: 'honigbrot', n: 1, in: { weizen: 2, honig: 1 } },
  waldtee: { st: 'cook', out: 'waldtee', n: 1, in: { kiefernzapfen: 2, honig: 1 } },
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
  // Edelstein-Werkzeuge: immer an der Werkbank sichtbar (kein Bauplan nötig)
  t_goldangel: { st: 'craft', out: 'goldangel', n: 1, in: { goldnugget: 1, holz: 4, eisen: 2 }, gem: 1 },
  t_kristallaxt: { st: 'craft', out: 'kristallaxt', n: 1, in: { amethyst: 2, holz: 4, eisen: 2 }, gem: 1 },
  t_rubinschaufel: { st: 'craft', out: 'rubinschaufel', n: 1, in: { rubin: 1, eisen: 3, holz: 2 }, gem: 1 },
  t_saphirkescher: { st: 'craft', out: 'saphirkescher', n: 1, in: { saphir: 1, holz: 3, ast: 4 }, gem: 1 },
  t_opalkanne: { st: 'craft', out: 'opalkanne', n: 1, in: { opal: 1, eisen: 3 }, gem: 1 },
  t_grubenlaterne: { st: 'craft', out: 'grubenlaterne', n: 1, in: { kristall: 1, eisen: 2, holz: 2 }, gem: 1 },
  // Siegerrezepte vom Kochwettbewerb (excl: nur nach einem Sieg)
  t_gluehlaterne: { st: 'craft', out: 'gluehlaterne', n: 1, in: { gluehwuermchen: 3, eisen: 1, holz: 1 }, gem: 1 },
  b_bambuszaun: { st: 'craft', out: 'bambuszaun', n: 2, in: { bambus: 3 } },
  b_bambuslampe: { st: 'craft', out: 'bambuslampe', n: 1, in: { bambus: 4, harz: 1 } },
  w_irrlichtlaterne: { st: 'craft', out: 'irrlichtlaterne', n: 1, in: { irrlicht: 3, eisen: 1 }, gem: 1 },
  w_blitzlampe: { st: 'craft', out: 'blitzlampe', n: 1, in: { blitzstein: 2, eisen: 2 }, gem: 1 },
  l_papierlaterne: { st: 'craft', out: 'papierlaterne', n: 1, in: { holz: 1, ast: 1 }, gem: 1 },
  sprossenpfanne: { st: 'cook', out: 'sprossenpfanne', n: 1, in: { bambussprosse: 2, karotte: 1 } },
  erdbeermarmelade: { st: 'cook', out: 'erdbeermarmelade', n: 1, in: { erdbeere: 3, zucker: 1 } },
  herzkekse: { st: 'cook', out: 'herzkekse', n: 2, in: { mehl: 1, zucker: 1, ei: 1 } },
  cupcake: { st: 'cook', out: 'cupcake', n: 1, in: { mehl: 1, zucker: 1, ei: 1, erdbeere: 2 } },
  macarons: { st: 'cook', out: 'macarons', n: 1, in: { zucker: 2, ei: 2, rose: 1 } },
  herzchentorte: { st: 'cook', out: 'herzchentorte', n: 1, in: { mehl: 2, zucker: 2, ei: 2, erdbeere: 3, milch: 1 } },
  gurkensalat: { st: 'cook', out: 'gurkensalat', n: 1, in: { gurke: 2, salatkopf: 1 } },
  paprikapfanne: { st: 'cook', out: 'paprikapfanne', n: 1, in: { paprika: 2, tomate: 1, kartoffel: 1 } },
  ofengemuese: { st: 'cook', out: 'ofengemuese', n: 1, in: { aubergine: 1, paprika: 1, kartoffel: 2 } },
  blaubeermuffin: { st: 'cook', out: 'blaubeermuffin', n: 2, in: { mehl: 1, zucker: 1, ei: 1, blaubeere: 2 } },
  apfelmus: { st: 'cook', out: 'apfelmus', n: 1, in: { apfel: 3, zucker: 1 } },
  traubensaft: { st: 'cook', out: 'traubensaft', n: 1, in: { traube: 3 } },
  kirschkompott: { st: 'cook', out: 'kirschkompott', n: 1, in: { kirsche: 3, zucker: 1 } },
  moehrenglas: { st: 'cook', out: 'moehrenglas', n: 1, in: { karotte: 3 } },
  x_sternentorte: { st: 'cook', out: 'sternentorte', n: 1, in: { mehl: 2, ei: 2, zucker: 2, sternfrucht: 1 }, excl: 1 },
  x_inselcurry: { st: 'cook', out: 'inselcurry', n: 1, in: { kokosnuss: 1, kartoffel: 2, karotte: 2, mango: 1 }, excl: 1 },
  x_mondpudding: { st: 'cook', out: 'mondpudding', n: 1, in: { milch: 2, zucker: 1, ei: 1, honig: 1 }, excl: 1 },
  x_regenbogeneis: { st: 'cook', out: 'regenbogeneis', n: 1, in: { milch: 1, zucker: 1, kirsche: 1, orange: 1, blaubeere: 1 }, excl: 1 },
};
export const DIG_SPOTS_PER_DAY = 5;

// Nachbarn: Vorlieben (Geschenke), Lieblingsort (sie spazieren dort herum), Dankesgeschenk im Brief
export const NPC_DATA = {
  mira: { name: 'Mira', icon: '🦔', likes: ['erdbeermarmelade', 'apfel', 'kirsche', 'tulpe', 'weizen'], loves: ['kirschtorte', 'apfelkuchen'], dislikes: ['kugelfisch', 'krebs'], spot: [-12, 4, 2.6, 1.6], gift: ['apfelkuchen', 1] },
  bruno: { name: 'Bruno', icon: '🐻', likes: ['apfelmus', 'holz', 'apfel', 'brot', 'forelle'], loves: ['lachs', 'eintopf'], dislikes: ['stein', 'unkraut'], spot: [12.6, 4.6, 1.8, 1.3], gift: ['holz', 15] },
  pippa: { name: 'Pippa', icon: '🦆', likes: ['kirschkompott', 'barsch', 'makrele', 'herzmuschel', 'weizen'], loves: ['kugelfisch', 'fischsuppe'], dislikes: ['ei', 'unkraut'], spot: [-6, 9.5, 2.6, 1.4], gift: ['makrele', 3] },
  lio: { name: 'Lio', icon: '🦊', likes: ['moehrenglas', 'rose', 'koralle', 'pfirsich', 'saft'], loves: ['sonnenblume', 'bernstein'], dislikes: ['kartoffel', 'stein'], spot: [12.8, 2.3, 1.9, 0.9], gift: ['kirschbaum', 1] },
  kalle: { name: 'Kalle', icon: '🫖', likes: ['traubensaft', 'orange', 'saft', 'tulpe', 'karotte'], loves: ['sorbet', 'kokosmilch'], dislikes: ['hai', 'krebs'], spot: [-12.3, -4, 0.4, 1.0], gift: ['orangenbaum', 1] },
  wanda: { name: 'Wanda', icon: '🔬', likes: ['erdbeermarmelade', 'frosch', 'karpfen', 'seeanemone', 'kristall'], loves: ['goldfisch', 'perle'], dislikes: ['unkraut', 'kartoffel'], spot: [-15, -1.5, 0.8, 0.3], gift: ['neopren', 1] },
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
  { title: 'Neues Land', desc: 'Schaltet im Rathaus eine Insel-Erweiterung frei.', ev: 'expand', n: 1, money: 3000, items: { kiste: 1 } },
  { title: 'Waldläufer', desc: 'Sammelt 10 Pilze, Beeren oder Zapfen in den neuen Gebieten.', ev: 'forage', n: 10, money: 2000, items: { pilzlaterne: 1 } },
  { title: 'Schätze der Tiefe', desc: 'Findet 3 Edelsteine in der Kristallhöhle.', ev: 'gem', n: 3, money: 6000, items: { kristallfels: 1 } },
  { title: 'Alle Gebiete', desc: 'Schaltet alle drei Insel-Erweiterungen frei.', ev: 'expand_all', n: 1, money: 15000, items: { wolkensofa: 1 } },
  // Fortsetzung: die neuen Ecken der Insel entdecken
  { title: 'Sandkünstler', desc: 'Baut mit der Schaufel 2 Sandburgen am Strand.', ev: 'castle', n: 2, money: 1200, items: { spieltisch: 1 } },
  { title: 'Spieleabend', desc: 'Stellt den Spieltisch ins Haus und gewinnt ein Spiel – gegen einen Nachbarn oder einen Mitspieler.', ev: 'gamewin', n: 1, money: 1500, items: { strandgrill: 1 } },
  { title: 'Grillmeister', desc: 'Stellt den Strandgrill auf und grillt 3 Leckereien. Abends kommen vielleicht die Nachbarn!', ev: 'grill', n: 3, money: 1500, items: { neopren: 1 } },
  { title: 'Unter Wasser', desc: 'Schwimmt zur rot-weißen Boje und sucht im Korallenriff nach Schätzen (5-mal tauchen).', ev: 'dive', n: 5, money: 2000 },
  { title: 'Das Geheimnis der gelben Boje', desc: 'Taucht an der gelben Boje im Westen und öffnet eine Truhe im Schiffswrack.', ev: 'chest', n: 1, money: 2000 },
  { title: 'Sternenhimmel', desc: 'Zeichnet im Handy unter ✨ Sternbilder ein eigenes Sternbild.', ev: 'star', n: 1, money: 1000 },
  { title: 'Gute Nachbarn', desc: 'Besucht einen Nachbarn (ab 3 Herzen) und erfüllt einen Einrichtungswunsch.', ev: 'nwish', n: 1, money: 2500 },
  { title: 'Inselfotograf', desc: 'Reicht im Fotomodus (🏆) ein Foto beim Fotowettbewerb ein.', ev: 'photo', n: 1, money: 1000 },
  { title: 'Licht in der Tiefe', desc: 'Baut an der Werkbank eine Grubenlaterne und steigt hinten in der Kristallhöhle die Treppe hinab.', ev: 'depth', n: 1, money: 2500 },
  { title: 'Das Herz der Höhle', desc: 'Öffnet die Kristalltür und die singende Tür und erreicht den Kristallsee ganz unten.', ev: 'depth3', n: 1, money: 5000 },
  { title: 'Vogelfreunde', desc: 'Kauft ein Fernglas im Krämerladen und entdeckt 5 verschiedene Vögel.', ev: 'bird', n: 5, money: 2000 },
  { title: 'Ebbe und Flut', desc: 'Sammelt bei Ebbe 3 Tiere aus den Gezeiten-Tümpeln am Strand.', ev: 'tide', n: 3, money: 1500 },
  { title: 'Stempeljäger', desc: 'Sammelt 5 Stempel für euren Stempelpass (Handy ➜ Stempel).', ev: 'stamp', n: 5, money: 2500 },
  { title: 'Kleine Gärtner', desc: 'Stellt einen Komposter auf und holt euch Kompost.', ev: 'compost', n: 1, money: 1500 },
  { title: 'Gläser für den Winter', desc: 'Kocht in der Gartenküche 3 Gläser ein (Marmelade, Saft, Kompott …).', ev: 'jar', n: 3, money: 2000 },
  { title: 'Blumengrüße', desc: 'Liefert 2 Sträuße aus dem Blumenladen (Handy ➜ Blumen).', ev: 'bouquet', n: 2, money: 2500 },
  { title: 'Kleine Waldfreunde', desc: 'Füttert Igel, Eichhörnchen oder die Enten am Teich – insgesamt 5-mal.', ev: 'wild', n: 5, money: 2000 },
  { title: 'Rummelzeit', desc: 'Der Jahrmarkt kommt einmal pro Jahreszeit hinter die Bummelgasse: dreimal fahren, Lose ziehen oder Enten angeln.', ev: 'fair', n: 3, money: 2500 },
  { title: 'Wollige Freunde', desc: 'Stellt eine Schafweide auf und webt am Webstuhl 2 Sachen aus Wolle.', ev: 'weave', n: 2, money: 2500 },
  { title: 'Unterwasserwelt im Wohnzimmer', desc: 'Setzt 3 Tiere in ein Aquarium oder Terrarium.', ev: 'tank', n: 3, money: 2000 },
  { title: 'Zwei Sorten, ein Baum', desc: 'Veredelt einen Obstbaum mit dem Veredelungsmesser.', ev: 'graft', n: 1, money: 1500 },
  { title: 'Die Inselband', desc: 'Übt ein Instrument (Handy ➜ Band) und gebt abends auf dem Dorfplatz ein Konzert.', ev: 'band', n: 1, money: 3000 },
  { title: 'Gäste, Gäste!', desc: 'Bewirtet im Inselrestaurant 20 Gäste.', ev: 'resto', n: 20, money: 4000 },
  { title: 'Die alte Seekarte', desc: 'Holt euch bei Käpt\'n Flossi die alte Seekarte und folgt allen fünf Spuren bis zur Truhe.', ev: 'pirate', n: 5, money: 5000 },
  { title: 'Ein Steg ins Moor', desc: 'Baut an drei Tagen am Nordrand der Blütenwiese den Steg zum Seerosenmoor (je 10 Holz und 5 Steine).', ev: 'steg', n: 3, money: 4000 },
  { title: 'Frühsport', desc: 'Macht an drei Morgen zwischen 6 und 8:30 Uhr vor dem Dorfbaum bei der Morgengymnastik mit.', ev: 'gym', n: 3, money: 2500 },
];
export const DAILY = [
  ['Gießt 8 Blumen', 'water', 8, 300], ['Erntet 6 Blumen oder Gemüse', 'harvest', 6, 400], ['Pflückt 6 Obst', 'fruit', 6, 400],
  ['Fangt 3 Fische', 'fish', 3, 500], ['Fangt 2 Insekten', 'bug', 2, 500], ['Plaudert mit 2 Nachbarn', 'talk', 2, 300],
  ['Hackt 4 Holz', 'chop', 4, 300], ['Kocht ein Gericht', 'cook', 1, 500], ['Verkauft Waren für 1.500 Taler', 'sell', 1500, 400],
  ['Erfüllt einen Nachbarwunsch', 'order', 1, 600], ['Umarmt euch 💕', 'hug', 1, 300], ['Macht einem Nachbarn ein Geschenk', 'gift', 1, 300],
  ['Grabt etwas aus', 'dig', 1, 400], ['Sammelt 4 Muscheln', 'shell', 4, 300], ['Zupft 5 Unkraut', 'weed', 5, 300], ['Stellt etwas im Museum aus', 'donate', 1, 600], ['Schießt einen Ballon ab', 'balloon', 1, 500],
  // neu (immer nur hinten anhängen – gespeicherte Aufgaben merken sich die Nummer)
  ['Sammelt 4 Pilze im Kiefernwald', 'mush', 4, 600], ['Haut 3× auf Erz in der Kristallhöhle', 'ore', 3, 600], ['Erntet Honig', 'honey', 1, 500], ['Sammelt 6 Beeren', 'berry', 6, 400],
  // Erweiterungen (erscheinen erst, wenn es das Nötige gibt)
  ['Füttert und erntet 3-mal auf dem Hof', 'farm', 3, 400], ['Baut eine Sandburg', 'castle', 1, 300], ['Taucht 3-mal nach Meerestieren', 'dive', 3, 500],
  ['Grillt 3 Leckereien', 'grill', 3, 400], ['Gewinnt ein Spiel am Spieltisch', 'gamewin', 1, 500], ['Öffnet eine Truhe im Schiffswrack', 'chest', 1, 500], ['Lasst den Drachen steigen', 'kite', 1, 300],
  ['Baut 2 Edelsteine in den Höhlen-Tiefen ab', 'deepgem', 2, 600],
  ['Beobachtet 2 Vögel mit dem Fernglas', 'bird', 2, 400], ['Sammelt 2 Tiere aus den Gezeiten-Tümpeln', 'tide', 2, 400], ['Spielt eine Runde Minigolf', 'golf', 1, 500],
  ['Kocht im Inselcafé ein Getränk', 'cafe', 1, 300], ['Holt euch 2 Stempel für den Stempelpass', 'stamp', 2, 400], ['Trefft 3-mal mit Schneebällen', 'snowball', 3, 400],
  ['Tanzt im Mondschein-Club', 'dance', 1, 400], ['Lest in der Bibliothek ein Rätselbuch', 'book', 1, 400],
  ['Liefert einen Blumenstrauß', 'bouquet', 1, 500], ['Reitet mit dem Pony aus', 'ride_pony', 1, 400], ['Fangt einen Hochseefisch', 'bigfish', 1, 600],
  ['Holt eine Medaille bei der Olympiade', 'medal', 1, 400], ['Lotst ein Schiff mit dem Leuchtturm', 'ship', 1, 500],
  ['Habt Spaß auf dem Jahrmarkt', 'fair', 2, 500], ['Bewirtet 8 Gäste im Inselrestaurant', 'resto', 8, 600], ['Füttert ein Wildtier', 'wild', 1, 300], ['Gebt ein Konzert mit der Inselband', 'band', 1, 500],
  ['Fangt oder pflückt 3-mal etwas im Seerosenmoor', 'moor', 3, 500], ['Sammelt 2-mal im Bambushain', 'bamboo', 2, 400], ['Macht bei der Morgengymnastik mit', 'gym', 1, 300], ['Baut euren Marktstand auf', 'market', 1, 500],
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
  muster: { name: 'Muster-Weg', icon: '🎨', col: '#f2c9d8' }, // zeigt das gewählte eigene Muster
};

// ---------- Geschenkballons ----------
export const BALLOON_GIFTS = [ // [Art, Gewicht]
  ['money', 34], ['holz', 12], ['eisen', 10], ['furn', 26], ['sternsplitter', 6], ['goldnugget', 3], ['deco', 9],
];

// ---------- Tagesabläufe der Nachbarn: [ab Stunde, x, z, Radius x, Radius z] ----------
export const NPC_PLAN = {
  mira:  [[6, -14, 8.8, 1, 0.5], [9, -1.9, 3.7, 0.4, 0.3], [12, -8, 2.3, 1.4, 0.5], [15, -12, 4, 2.4, 1.4], [18, 1.8, 4.1, 0.3, 0.2], [20.5, -14, 8.8, 1, 0.5]],
  pippa: [[6, -9, 19.5, 0.2, 2.6], [10, -4, 17, 2.6, 0.8], [13, -12.4, -1.6, 0.8, 0.8], [16, -4.6, 14.6, 1.1, 0.5], [19, 0.5, 4.2, 0.3, 0.2], [21, -4.6, 14.6, 1.1, 0.5]],
  bruno: [[6, 12.5, 10.6, 1, 0.5], [8, 10.8, 2, 0.4, 1.4], [11, -4.5, -9.4, 1, 0.3], [14, 0.8, 4.6, 0.3, 0.2], [17, 13, -5.2, 1.6, 0.4], [20, 12.5, 10.6, 1, 0.5]],
  lio:   [[6, 15.5, 1.7, 0.6, 0.4], [9, 13, -5.3, 1.7, 0.5], [12, 16.6, 7.5, 0.7, 2], [15, 2.2, 4.7, 0.3, 0.2], [18, 12.8, 2.3, 1.9, 0.9], [20.5, 15.5, 1.7, 0.6, 0.4]],
  kalle: [[6, -9, 10.8, 1, 0.5], [8, -12.3, -4.2, 0.4, 1.0], [11, -0.5, 3.9, 0.3, 0.2], [14, -8, 4.6, 1.2, 0.5], [17, -12.3, -3.6, 0.4, 0.8], [20, -9, 10.8, 1, 0.5]],
  wanda: [[6, 3, 10.8, 1, 0.5], [8.5, -15, -1.5, 0.8, 0.3], [11.5, 4.6, 4.4, 0.6, 1.0], [14.5, 13, -5.3, 1.5, 0.4], [17.5, -15, -1.5, 0.8, 0.3], [20, 3, 10.8, 1, 0.5]],
};

// ---------- Baupläne (DIY) ----------
// Werkbank-Rezepte muss man erst finden: Flaschenpost am Strand, Geschenkballons, Nachbarn.
export const STARTER_DIY = ['r_zaun', 'r_weg', 'r_bank', 'f_hocker', 'f_stuhl', 'f_kiste'];
export const DIY_IDS = Object.keys(RECIPES).filter(k => RECIPES[k].st === 'craft' && !RECIPES[k].gem);
// Erfolge fürs Bürgermeister-Update
ACHIEVEMENTS.push(...[
  ['projekt1', '🏗️', 'Spatenstich', 'Das erste Inselprojekt eingeweiht', s => (s.mayor?.built || 0) >= 1, 2000],
  ['projekt5', '🏙️', 'Große Bürgermeister', '5 Inselprojekte gebaut', s => (s.mayor?.built || 0) >= 5, 10000],
  ['schuldenfrei', '🏡', 'Schuldenfrei', '50.000 Taler Hauskredit abbezahlt', s => (s.stats.repaid || 0) >= 50000, 5000],
  ['sterne5', '⭐', 'Fünf-Sterne-Insel', 'Die Inselbewertung hat 5 Sterne', s => (s.stars || 1) >= 5, 10000],
  ['tour5', '🏅', 'Weltenbummler', '5 Touren auf der Tropeninsel geschafft', s => (s.stats.tours || 0) >= 5, 3000],
  ['lieder8', '🎸', 'Musikfans', '8 Lieder im Liederbuch', s => Object.keys(s.songs || {}).length >= 8, 4000],
  ['huete', '🎩', 'Modebewusst', '3 besondere Hüte freigeschaltet', s => Object.keys(s.wardrobe || {}).length >= 3, 2000],
].map(([id, icon, name, desc, test, reward]) => ({ id, icon, name, desc, test, reward })));
// Achievements für Tauchen & Baupläne
ACHIEVEMENTS.push(...[
  ['taucher', '🤿', 'Abgetaucht', '10 Meerestiere beim Tauchen gefunden', s => (s.stats.dives || 0) >= 10, 1500],
  ['diy20', '📜', 'Bastelprofis', '20 Baupläne gelernt', s => Object.keys(s.recipes || {}).length >= 20, 2000],
].map(([id, icon, name, desc, test, reward]) => ({ id, icon, name, desc, test, reward })));
