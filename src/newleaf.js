// "Bürgermeister-Update": Rathaus mit Inselprojekten und Verordnungen, die Bummelgasse (Einkaufsstraße),
// Hauskredit & Wohnwert-Verein und die Tropeninsel mit Touren. Nur Daten und reine Rechnungen (keine Grafik).
import { ITEMS, PLACE, PROJECTS, CROPS, weekday } from './data.js';
import { FURNITURE } from './furni-data.js';
export { PROJECTS };

// ---------- Orte außerhalb der Insel (wie das Zuhause bei x = 300 liegen sie weit weg) ----------
export const STREET = { x: 0, z: -300, w: 13.3, d: 3.3 };   // Bummelgasse: begehbar |lx| ≤ w, |lz| ≤ d
export const TROPIC = { x: 0, z: 300, r: 9.3 };             // Tropeninsel: runde Insel mit Steg nach Süden
export const zoneOf = p => (p.x > 150 ? 'home' : p.z < -150 ? 'street' : p.z > 150 ? 'tropic' : 'island');

// Läden in der Bummelgasse (lokale Kacheln, Norden = Ladenreihe)
export const STREET_SHOPS = {
  tailor: { x0: -11, x1: -6, z0: -6, z1: -4, use: 'tailor', name: 'Schneiderei Wollknäuel', who: '🐑 Frau Wolle' },
  garden: { x0: -2, x1: 2, z0: -6, z1: -4, use: 'garden', name: 'Gärtnerei Knolle', who: '🦔 Opa Knolle' },
  club:   { x0: 6, x1: 11, z0: -6, z1: -4, use: 'club', name: 'Mondschein-Club', who: '🐸 DJ Quak' },
};
export const streetWalk = (lx, lz) => Math.abs(lx) <= STREET.w && Math.abs(lz) <= STREET.d;
export function streetShopAt(lx, lz) {
  for (const [id, b] of Object.entries(STREET_SHOPS)) if (lx >= b.x0 && lx <= b.x1 && lz >= b.z0 && lz <= b.z1) return id;
  return null;
}

// Tropeninsel: Hütte im Norden, Obstbäume, Steg im Süden
export const TROPIC_HUT = { x0: -2, x1: 2, z0: -7, z1: -5, use: 'hut', name: 'Kikis Tauschhütte', who: '🦜 Kiki' };
export const TROPIC_TREES = [[-5, -2, 'banane'], [5, -2, 'mango'], [-6, 3, 'mango'], [6, 3, 'banane'], [-2, 5, 'sternfrucht'], [3, 6, 'banane']];
export const TROPIC_DOCK = { w: 0.75, z0: 8.6, z1: 13 };
export const onDock = (lx, lz) => Math.abs(lx) < TROPIC_DOCK.w && lz > TROPIC_DOCK.z0 && lz < TROPIC_DOCK.z1;
export const tropicWalk = (lx, lz) => Math.hypot(lx, lz) <= TROPIC.r || onDock(lx, lz);
export const tropicBeach = (lx, lz) => { const r = Math.hypot(lx, lz); return r > 6.8 && r <= TROPIC.r; };
export const tropicTree = (lx, lz) => TROPIC_TREES.findIndex(([x, z]) => x === lx && z === lz);
export const BOAT_PRICE = 1000;

// Spielerpositionen vom Netz auf den jeweiligen Ort begrenzen
export function clampPos(x, z, isl) {
  const c = (v, a, b) => Math.max(a, Math.min(b, v));
  const zone = zoneOf({ x, z });
  if (zone === 'home') return [c(x, 292, 308), c(z, -8, 8)];
  if (zone === 'street') return [c(x, STREET.x - 16, STREET.x + 16), c(z, STREET.z - 8, STREET.z + 8)];
  if (zone === 'tropic') return [c(x, TROPIC.x - 16, TROPIC.x + 16), c(z, TROPIC.z - 16, TROPIC.z + 16)];
  return [c(x, -isl - 6, isl + 6), c(z, -isl - 6, isl + 6)];
}

// ---------- Verordnungen ----------
export const ORDS = {
  none:   { name: 'Keine Verordnung', icon: '⚖️', desc: 'Alles bleibt, wie es ist.' },
  frueh:  { name: 'Frühaufsteher', icon: '🐓', desc: 'Die Nachbarn stehen schon um 6 Uhr auf, die Läden der Bummelgasse öffnen früher.' },
  nacht:  { name: 'Nachteule', icon: '🦉', desc: 'Die Nachbarn bleiben bis Mitternacht wach, die Läden haben bis 24 Uhr offen.' },
  schoen: { name: 'Schöne Insel', icon: '🌷', desc: 'Kein neues Unkraut, und Blumen wachsen auch ungegossen fast so schnell wie gegossen.' },
  reich:  { name: 'Wohlstand', icon: '💰', desc: 'Läden zahlen 20 % mehr für eure Sachen – dafür kostet alles 20 % mehr.' },
};
export const ORD_PRICE = 20000;
export const ord = s => (ORDS[s.mayor?.ord] ? s.mayor.ord : 'none');
export const hourOf = s => 6 + s.dayTime * 18;
export const sellFactor = s => (ord(s) === 'reich' ? 1.2 : 1);
export const buyFactor = s => (ord(s) === 'reich' ? 1.2 : 1);
export const buyPrice = (s, base) => Math.round(base * buyFactor(s));
export function awakeHours(s) {
  const o = ord(s);
  return o === 'frueh' ? [6, 20] : o === 'nacht' ? [9, 24] : [7, 21.5];
}
// Öffnungszeiten der Läden in der Bummelgasse
export function shopHours(s, id) {
  const o = ord(s);
  if (id === 'club') return [18, 24];
  return o === 'frueh' ? [6, 21] : o === 'nacht' ? [9, 24] : [8, 22];
}
export const shopOpen = (s, id) => { const [a, b] = shopHours(s, id), h = hourOf(s); return h >= a && h < b; };
export const concertNow = s => weekday(s.day) === 6 && hourOf(s) >= 20; // Samstagabend: Livemusik im Club

// ---------- Schneiderei: besondere Hüte (werden für die ganze Insel freigeschaltet) ----------
export const WARDROBE = {
  beret:  { name: 'Baskenmütze', icon: '🎨', price: 1800 },
  tophat: { name: 'Zylinder', icon: '🎩', price: 3200 },
  pirate: { name: 'Piratenhut', icon: '🏴‍☠️', price: 4200 },
  tiara:  { name: 'Diadem', icon: '👸', price: 6800 },
  sunhat: { name: 'Tropen-Sonnenhut', icon: '👒', medals: 6 },
};
export const isPremiumHat = id => !!WARDROBE[id];

// ---------- Club: Lieder vom Samstagskonzert ----------
export const SONGS = [
  ['inselwind', 'Inselwind'], ['kuschelwalzer', 'Kuschelwalzer'], ['mondscheinblues', 'Mondschein-Blues'], ['sternschnuppenswing', 'Sternschnuppen-Swing'],
  ['ruebenrock', 'Rüben-Rock'], ['muschelbossa', 'Muschel-Bossa'], ['regentropfen', 'Regentropfen-Reggae'], ['kaffeehaus', 'Kaffeehaus-Jazz'],
  ['morgentau', 'Morgentau-Folk'], ['lagerfeuer', 'Lagerfeuer-Lied'], ['leuchtturm', 'Leuchtturm-Ballade'], ['pusteblume', 'Pusteblumen-Pop'],
  ['wolkenwalzer', 'Wolken-Walzer'], ['kirschbluete', 'Kirschblüten-Kanon'], ['gluehwuermchen', 'Tanz der Glühwürmchen'], ['heimweh', 'Heimweh-Hymne'],
];

// ---------- Tropeninsel: Touren ----------
// kind: was man an den Zielen tun muss (pick = Hand, net = Kescher, dig = Schaufel)
export const TOURS = {
  frucht: { name: 'Sternfrucht-Tour', icon: '⭐', kind: 'pick', n: 8, time: 90, medals: 3, desc: 'Sammelt in 90 Sekunden alle 8 leuchtenden Sternfrüchte ein.' },
  kaefer: { name: 'Käfer-Tour', icon: '🪲', kind: 'net', n: 6, time: 120, medals: 4, desc: 'Fangt in 2 Minuten alle 6 Käfer mit dem Kescher.' },
  schatz: { name: 'Schatz-Tour', icon: '💎', kind: 'dig', n: 5, time: 120, medals: 5, desc: 'Grabt in 2 Minuten alle 5 Schätze mit der Schaufel aus.' },
  muschel:{ name: 'Muschel-Tour', icon: '🐚', kind: 'pick', n: 10, time: 100, medals: 3, beach: 1, desc: 'Sammelt in 100 Sekunden alle 10 Muscheln am Strand.' },
};
export const TOUR_ICON = { frucht: '⭐', kaefer: '🪲', schatz: '✨', muschel: '🐚' };
export function tourTargets(k, rnd = Math.random) {
  const T = TOURS[k], out = [];
  for (let t = 0; out.length < T.n && t < 500; t++) {
    const a = rnd() * Math.PI * 2, r = T.beach ? 7.2 + rnd() * 1.8 : 1.5 + rnd() * 6.5;
    const x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r);
    if (!tropicWalk(x, z) || tropicTree(x, z) >= 0 || (x >= TROPIC_HUT.x0 - 1 && x <= TROPIC_HUT.x1 + 1 && z >= TROPIC_HUT.z0 - 1 && z <= TROPIC_HUT.z1 + 1)) continue;
    if (onDock(x, z) || out.some(o => o.x === x && o.z === z)) continue;
    out.push({ x, z, got: 0 });
  }
  return out;
}
export const MEDAL_SHOP = ['bananenbaum', 'mangobaum', 'tikifackel', 'haengematte', 'surfbrett', 'sandburg'];

// ---------- Wohnwert-Verein: Punkte fürs Zuhause ----------
export function homeScore(s) {
  const h = s.home || {}, all = [...Object.values(h.items || {}), ...Object.values(h.rugs || {}), ...Object.values(h.walls || {})];
  let pts = 0;
  const kinds = new Set();
  for (const o of all) {
    const f = FURNITURE[o.k];
    if (!f) continue;
    kinds.add(o.k);
    pts += 200 + Math.round((f.buy || 1500) / 8);
  }
  pts += kinds.size * 250;                                   // Abwechslung
  if (h.wall && h.wall !== 'vanille') pts += 600;            // eigene Tapete
  if (h.floor && h.floor !== 'dielen') pts += 600;           // eigener Boden
  pts += (s.up?.house || 1) * 800;                           // größeres Haus
  return { pts, pieces: all.length, kinds: kinds.size };
}
export const HHA_RANKS = [[0, 'Gemütlich angefangen', '🌱'], [6000, 'Schön eingerichtet', '🏡'], [12000, 'Wohnwert-Stern', '⭐'], [20000, 'Traumhaus', '🌟'], [30000, 'Wohnwert-Legende', '🏆']];
export const hhaRank = pts => HHA_RANKS.filter(r => pts >= r[0]).pop();

// ---------- Inselbewertung (1–5 Sterne) ----------
export function islandScore(s) {
  let flowers = 0, decos = 0, projects = 0;
  for (const t of Object.values(s.tiles || {})) if (t.c && CROPS[t.c.k]?.cat === 'fruit') flowers++;
  for (const o of Object.values(s.obj || {})) { const k = PLACE[o.k]?.kind; if (k === 'project') projects++; else if (k === 'deco' || k === 'producer') decos++; }
  const weeds = Object.keys(s.weeds || {}).length, paths = Object.keys(s.paths || {}).length;
  const pts = Math.min(60, flowers) + Math.min(40, decos * 2) + projects * 8 + Math.min(20, Math.floor(paths / 3)) - weeds * 3;
  const stars = pts >= 120 ? 5 : pts >= 85 ? 4 : pts >= 50 ? 3 : pts >= 20 ? 2 : 1;
  const tips = [];
  if (weeds > 2) tips.push(`🌿 Zupft das Unkraut (${weeds} Stück) – das mag niemand.`);
  if (flowers < 40) tips.push(`🌷 Pflanzt mehr Blumen (gerade ${flowers}).`);
  if (projects < 3) tips.push('🏗️ Baut Inselprojekte – die machen viel her.');
  if (decos < 15) tips.push('🏮 Stellt mehr Deko und Obstbäume auf.');
  if (paths < 30) tips.push('🧱 Schöne Wege mit dem Insel-Designer helfen auch.');
  return { pts, stars, flowers, decos, projects, weeds, tips };
}

// Kleine Helfer für Texte
export const fmt = n => Math.round(n).toLocaleString('de-DE');
export const itemName = id => `${ITEMS[id]?.icon || ''} ${ITEMS[id]?.name || id}`;
