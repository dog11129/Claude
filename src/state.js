// Spiellogik ohne Grafik: Welt-Zustand, Zeit, Aktionen. Läuft beim Host; Gäste rechnen nur zur Anzeige mit.
import {
  DAY, WET, MAP, CROPS, ANIMALS, PENS, BUILDINGS, ITEMS, FISH, PLACE,
  UPGRADES, needXp, MAX_LEVEL, ACHIEVEMENTS, SEASON_LEN, SEASON_IDS, isFlower,
  RES_SPOTS, TREE_FRUIT, FRUIT_REGROW, BUGS, FOSSILS, SHELLS, SHELLS_PER_DAY, WEEDS_PER_DAY, RECIPES, DIG_SPOTS_PER_DAY,
  NPC_DATA, NPC_IDS, STORY, DAILY, MUSEUM_ALL, NPC_PLAN, PAVE, BALLOON_GIFTS, weekday, TURNIP_STACK, SEA, DIVES, STARTER_DIY, DIY_IDS,
  FESTS, BIRTHDAYS, CONTEST_SECS, CONTEST_AT, FEST_DECO, HYBRIDS,
} from './data.js';
import { walkable, grass, sand, isWater, isSea, coast, inPond as pondAt, inRiver, onBridge, bridgeRail, onPier, onPlaza, rng, riverX, BRIDGES, MAP as ISLAND, PIER } from './island.js';
import { FURNITURE, WALLS, FLOORS } from './furni-data.js';
import * as X from './extras.js';
import * as Y from './extras2.js';
import * as Z from './extras3.js';
import * as W4 from './extras4.js';
import * as V from './extras5.js';
import * as E6 from './extras6.js';
import * as E7 from './extras7.js';
import { AREAS, AREA_IDS, NODES, nodeAt, nodeToday, nodeUses, SOLID, MUSHROOMS, GEMS, inArea, areaExit, gateAt, areaOf } from './areas.js';
export { AREAS, NODES, areaOf };
import {
  PROJECTS, STREET, TROPIC, zoneOf, STREET_SHOPS, streetWalk, streetShopAt, TROPIC_HUT, TROPIC_TREES, onDock, tropicWalk, tropicTree,
  ORDS, ORD_PRICE, ord, awakeHours, sellFactor, buyPrice, WARDROBE, SONGS, TOURS, tourTargets, MEDAL_SHOP, BOAT_PRICE, concertNow, shopOpen,
  homeScore, hhaRank, islandScore, fmt,
} from './newleaf.js';
export { zoneOf, STREET, TROPIC };

export const key = (x, z) => x + ',' + z;
export const seasonOf = day => SEASON_IDS[Math.floor((day - 1) / SEASON_LEN) % 4];
export const inSeason = (s, k) => CROPS[k].sea.includes(seasonOf(s.day));
const rnd = n => Math.floor(Math.random() * n);
const pick = arr => arr[rnd(arr.length)];

// ---------- Eigene Taschen je Spieler ----------
// s.pinv[Schlüssel] = Inventar eines Spielers ('host' = wer die Insel gerade öffnet, 'u_…' = Gäste).
// s.inv zeigt immer auf die Tasche des Spielers, der gerade handelt (bzw. auf dem Gerät spielt) –
// so bleibt der restliche Code unverändert. s.inv und s._who werden nicht mitgespeichert.
export const PKEY = /^(host|u_[a-z0-9]{6,16}|n_[^\s]{1,16})$/;
export function bindInv(s, who = 'host') {
  s.pinv ||= {};
  Object.defineProperty(s, '_who', { value: who, writable: true, configurable: true, enumerable: false });
  if (!Object.getOwnPropertyDescriptor(s, 'inv')?.get) {
    Object.defineProperty(s, 'inv', {
      get() { return (this.pinv[this._who] ||= {}); },
      set(v) { this.pinv[this._who] = v; },
      configurable: true, enumerable: false,
    });
  }
  return s;
}
// Taschen tauschen, wenn jemand anderes die (kopierte) Insel öffnet: der neue Gastgeber bekommt "host"
// Nur tauschen, wenn man auf dieser Insel schon als Gast eine eigene Tasche hatte (z. B. die Sicherheitskopie
// einer Freundin selbst öffnen). Wer seine eigene Insel auf einem neuen Gerät öffnet, behält "host".
export function claimHost(s, uid) {
  if (!uid || !PKEY.test('u_' + uid)) return;
  const mine = s.pinv['u_' + uid];
  if (mine && s.owner !== uid) {
    s.pinv[s.owner ? 'u_' + s.owner : 'n_Gastgeber'] = s.pinv.host || {};
    s.pinv.host = mine;
    delete s.pinv['u_' + uid];
    s.owner = uid;
  }
  s.owner ||= uid;
}

export function newFarm(name = 'Kuschelinsel') {
  const s = {
    v: 2, id: Math.random().toString(36).slice(2, 10), name, code: null,
    time: 0, day: 1, dayTime: 0.04, weather: 'sun',
    money: 800, xp: 0, level: 1,
    pinv: { host: { s_tulpe: 4 } }, box: {}, owner: null, areas: {}, anode: {},
    up: {}, tiles: {}, obj: {}, animals: [], orders: [], nextId: 1, ach: {},
    album: {}, res: {}, shook: {}, digs: [], mail: [], npc: {},
    shells: {}, weeds: {}, fruit: {}, museum: {}, rock: null, paths: {}, balloon: null, wishes: 0, starNight: false, turnip: null, real: false, ground: {}, dives: [], recipes: Object.fromEntries(STARTER_DIY.map(k => [k, 1])),
    home: { wall: 'vanille', floor: 'dielen', items: {}, rugs: {}, walls: {} },
    quest: { i: 0, p: 0 }, daily: [], met: {},
    mayor: { ord: 'none', free: 1, plan: null, built: 0 }, loan: 0, wardrobe: {}, songs: {}, concert: 0, medals: 0, tropic: { picked: {} }, tour: null, hha: { best: 0 }, stars: 1,
    stats: { harvested: 0, earned: 0, fish: 0, orders: 0, treasure: 0, bugs: 0, dug: 0, cooked: 0, crafted: 0, wood: 0, fruit: 0, shells: 0, weeds: 0, planted: 0, balloons: 0, wishes: 0, turnipProfit: 0, turnipSpent: 0, dives: 0, donated: 0, tours: 0, trips: 0, repaid: 0, mush: 0, honey: 0, ore: 0, berry: 0 },
    intro: { on: 1 }, // geführter Einstieg (nur neue Inseln)
  };
  bindInv(s);
  for (const [k, u] of Object.entries(UPGRADES)) s.up[k] = u.start;
  // ein paar wilde Blumen blühen schon auf der Insel
  const r = rng(77), wild = ['tulpe', 'kosmee', 'stiefmuetterchen', 'rose'];
  for (let i = 0, n = 0; i < 400 && n < 22; i++) {
    const cx = Math.round((r() - 0.5) * 34), cz = Math.round((r() - 0.5) * 30), k = wild[Math.floor(r() * 4)];
    for (const [dx, dz] of [[0, 0], [1, 0], [0, 1]]) {
      const x = cx + dx, z = cz + dz;
      if (!canPlace(s, x, z) || onPlaza(x, z, 1.5)) continue;
      s.tiles[key(x, z)] = { w: 0, c: { k, g: CROPS[k].grow } };
      n++;
    }
  }
  refill(s);
  newTurnips(s);
  newDailies(s);
  fillOrders(s);
  return s;
}

export const STYLE_PRICE = 350;
export const friend = (s, id) => (s.npc[id] ||= { f: 0, talk: 0, gift: 0, sent: [] });
export const hearts = (s, id) => Math.min(10, Math.floor((s.npc[id]?.f || 0) / 100));

// Nachbarn spazieren um ihren Lieblingsort (alle Spieler sehen dasselbe); nachts sind sie zu Hause
// Nachbarn haben einen Tagesablauf (data.js NPC_PLAN): morgens zu Hause, später am Platz, am Fluss, im Museum …
// Zwischen zwei Orten laufen sie los – über eine Brücke, wenn der Fluss dazwischen liegt. Alle Spieler sehen dasselbe.
const WALK_H = 0.7; // so viele Spielstunden dauert ein Weg
const side = (x, z) => Math.sign(x - riverX(z)) || 1;
function route(a, b) {
  const pts = [a];
  if (side(a[0], a[1]) !== side(b[0], b[1])) {
    const bz = BRIDGES.reduce((best, z) => Math.abs(z - (a[1] + b[1]) / 2) < Math.abs(best - (a[1] + b[1]) / 2) ? z : best), bx = riverX(bz), sa = side(a[0], a[1]);
    pts.push([bx + sa * 2.2, bz], [bx - sa * 2.2, bz]);
  }
  pts.push(b);
  return pts;
}
function along(pts, f) {
  const len = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1])), total = len.reduce((a, b) => a + b, 0) || 1;
  let d = f * total;
  for (let i = 0; i < len.length; i++) {
    if (d <= len[i] || i === len.length - 1) { const k = len[i] ? Math.min(1, d / len[i]) : 1; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; }
    d -= len[i];
  }
  return pts[pts.length - 1];
}
export function npcPos(id, t, dayTime = 0.3) {
  const plan = NPC_PLAN[id], hour = 6 + dayTime * 18, h = NPC_IDS.indexOf(id) * 1.7 + 0.5;
  let i = 0;
  for (let k = 0; k < plan.length; k++) if (hour >= plan[k][0]) i = k;
  const [h0, cx, cz, rx, rz] = plan[i], since = hour - h0;
  const ph = t * 0.05 + h, f = Math.floor(ph), r = ph - f, e = f + r * r * (3 - 2 * r);
  const wander = { x: cx + rx * Math.sin(e * 1.1 + h), z: cz + rz * Math.sin(e * 0.8 + h * 1.9), walking: r > 0.12 && r < 0.88 };
  if (i === 0 || since >= WALK_H) return wander;
  const [, px, pz] = plan[i - 1], [x, z] = along(route([px, pz], [cx, cz]), since / WALK_H);
  return { x, z, walking: true };
}
export const npcAwake = s => { const h = 6 + s.dayTime * 18, [a, b] = awakeHours(s); return h >= a && h < b; };

// ---------- Quests ----------
// Aufgaben für neue Gebiete nur, wenn das Gebiet schon offen ist
const DAILY_NEEDS = { mush: ['wald'], ore: ['hoehle'], honey: ['wiese'], berry: ['wald', 'wiese'] };
function newDailies(s) {
  const ok = i => (!DAILY_NEEDS[DAILY[i][1]] || DAILY_NEEDS[DAILY[i][1]].some(a => s.areas?.[a])) && Z.dailyOk(s, DAILY[i][1]) && (!W4.DAILY_OK_W[DAILY[i][1]] || W4.DAILY_OK_W[DAILY[i][1]](s)) && (!V.DAILY_OK_V[DAILY[i][1]] || V.DAILY_OK_V[DAILY[i][1]](s)) && (!E6.DAILY_OK_6[DAILY[i][1]] || E6.DAILY_OK_6[DAILY[i][1]](s)) && (!E7.DAILY_OK_7[DAILY[i][1]] || E7.DAILY_OK_7[DAILY[i][1]](s));
  const pool = DAILY.map((d, i) => i).filter(ok).sort(() => Math.random() - 0.5).slice(0, 3);
  s.daily = pool.map(i => ({ i, p: 0 }));
}
// Etwas ist passiert (gegossen, geerntet, …): Fortschritt für Geschichte und Tagesaufgaben
export function questEvent(s, ev, n = 1, out) {
  const q = STORY[s.quest.i];
  if (q && !s.quest.done) {
    if (q.ev === ev) s.quest.p = q.ev === 'level' || q.ev === 'met' ? n : s.quest.p + n;
    if (s.quest.p >= q.n) { s.quest.done = true; if (out) out.quest = q.title; }
  }
  for (const d of s.daily) {
    if (d.done || DAILY[d.i][1] !== ev) continue;
    d.p += n;
    if (d.p >= DAILY[d.i][2]) { d.done = true; if (out) out.quest = DAILY[d.i][0]; }
  }
  X.weekEvent(s, ev, n, out);
}

// Morgens: Bäume & Felsen auffüllen, neue Grabstellen, Muscheln und Unkraut verteilen
const randTile = () => [rnd(2 * MAP + 1) - MAP, rnd(2 * MAP + 1) - MAP];
function refill(s) {
  for (const k of Object.keys(spots(s))) s.res[k] = 3;
  s.shook = {};
  s.digs = [];
  s.shells = {};
  for (const k of Object.keys(s.weeds || {})) if (Math.random() < 0.3) delete s.weeds[k]; // ein paar verschwinden von selbst
  s.weeds ||= {};
  const free = (x, z) => canPlace(s, x, z) && !onPlaza(x, z, 0.5) && !s.paths?.[key(x, z)];
  for (let t = 0; s.digs.length < DIG_SPOTS_PER_DAY && t < 300; t++) {
    const [x, z] = randTile();
    if (free(x, z)) s.digs.push(key(x, z));
  }
  for (let t = 0, n = 0; n < SHELLS_PER_DAY && t < 400; t++) {
    const [x, z] = randTile(), k = key(x, z);
    if (!sand(x, z) || s.shells[k] || s.obj[k] || resAt(s, k)) continue;
    s.shells[k] = weighted(SHELLS, f => f[4])[0];
    n++;
  }
  for (let t = 0, n = ord(s) === 'schoen' ? WEEDS_PER_DAY : Object.keys(s.weeds).length; n < WEEDS_PER_DAY && t < 300; t++) {
    const [x, z] = randTile();
    if (free(x, z) && !s.weeds[key(x, z)]) { s.weeds[key(x, z)] = 1; n++; }
  }
  const rocks = Object.keys(RES_SPOTS).filter(k => resAt(s, k) === 'rock');
  s.rock = pick(rocks); // einer der Felsen spuckt heute Taler aus
  // jeden Morgen eine Flaschenpost mit Bauplan am Strand
  s.ground ||= {};
  for (const [k, g] of Object.entries(s.ground)) if (g.id === 'bottle') delete s.ground[k];
  const shore = shoreTiles().filter(([x, z, c]) => c > -2 && !s.shells[key(x, z)] && !s.obj[key(x, z)] && !resAt(s, key(x, z)) && !s.ground[key(x, z)]);
  if (shore.length) { const [x, z] = pick(shore); s.ground[key(x, z)] = { id: 'bottle', n: 1 }; }
  s.dives = [];
  while (s.dives.length < DIVES) newDive(s);
  s.drift = {}; // Treibholz am Strand
  const wood = shoreTiles().filter(([x, z, c]) => c > -2.5 && !s.shells[key(x, z)] && !s.obj[key(x, z)] && !resAt(s, key(x, z)) && !s.ground[key(x, z)]);
  for (let n = 0; n < 3 && wood.length; n++) { const [x, z] = wood.splice(rnd(wood.length), 1)[0]; s.drift[key(x, z)] = 1; }
}
// Strandfelder nah am Wasser (für Flaschenpost & Treibholz)
let SHORE = null;
function shoreTiles() {
  if (!SHORE) { SHORE = []; for (let x = -MAP; x <= MAP; x++) for (let z = -MAP; z <= MAP; z++) if (sand(x, z) && coast(x, z) > -2.5) SHORE.push([x, z, coast(x, z)]); }
  return SHORE;
}
// Luftblasen im Meer: hier liegt ein Meerestier
function newDive(s) {
  for (let t = 0; t < 100; t++) {
    const a = Math.random() * Math.PI * 2, r = 18 + Math.random() * 10, x = Math.cos(a) * r, z = Math.sin(a) * r, c = coast(x, z);
    if (c > 0.8 && c < 6 && swimmable(x, z) && Math.abs(x - PIER.x) > 2) { s.dives.push({ id: s.nextId++, x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10 }); return; }
  }
}
// Etwas fällt auf den Boden (Obst vom Baum, Holz, Steine, Geschenke): auf eine freie Nachbarkachel, möglichst zur Spielerin hin
const groundFree = (s, x, z) => walkable(x, z) && !onBridge(x, z) && !onPier(x, z) && !buildingAt(x, z) && !resAt(s, key(x, z)) && !s.ground[key(x, z)] && !s.obj[key(x, z)]?.k && !s.shells[key(x, z)];
function drop(s, x, z, item, out, toward) {
  s.ground ||= {};
  const spots = [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1], [0, 2], [2, 0], [-2, 0], [0, -2]].map(([a, b]) => [x + a, z + b]).filter(([i, j]) => groundFree(s, i, j));
  if (toward) spots.sort((a, b) => Math.hypot(a[0] - toward[0], a[1] - toward[1]) - Math.hypot(b[0] - toward[0], b[1] - toward[1]));
  const [gx, gz] = spots[0] || [x, z];
  if (!spots.length && !groundFree(s, x, z)) { if (item.id === 'money') { s.money += item.n; s.stats.earned += item.n; } else addInv(s, item.id, item.n || 1); return; }
  s.ground[key(gx, gz)] = item;
  out.fx.push({ x: gx, z: gz, txt: '', k: 'plop' });
}
// Unbekannten Bauplan lernen
function learn(s, out) {
  const unknown = DIY_IDS.filter(k => !s.recipes[k]);
  if (!unknown.length) { addInv(s, 'sternsplitter', 1); out.msg = '📜 Ihr kennt schon alle Baupläne! Dafür war ein 🌟 Sternsplitter in der Flasche.'; return; }
  const id = pick(unknown), r = RECIPES[id];
  s.recipes[id] = s.day;
  out.learned = id;
  out.msg = `📜 Neuer Bauplan: ${ITEMS[r.out].icon} ${ITEMS[r.out].name}! (${Object.entries(r.in).map(([k, n]) => `${n}× ${ITEMS[k].icon}`).join(' ')})`;
}

// Alte Spielstände mit neuen Feldern ergänzen, damit Updates nichts kaputt machen.
export function migrate(s) {
  const fresh = !s.digs || !s.res || !s.shells;
  const base = newFarm(s.name);
  const own = Object.getOwnPropertyDescriptor(s, 'inv');
  if (own && 'value' in own) { // alter Stand: eine Tasche für alle – wird die Tasche des Gastgebers, nichts geht verloren
    const old = own.value && typeof own.value === 'object' ? own.value : {};
    delete s.inv;
    if (!s.pinv || typeof s.pinv !== 'object') s.pinv = { host: old };
    else { const h = (s.pinv.host ||= {}); for (const [id, n] of Object.entries(old)) if (Number.isFinite(n) && n > (h[id] || 0)) h[id] = n; }
  }
  if (!s.pinv || typeof s.pinv !== 'object') s.pinv = { host: {} };
  for (const k of Object.keys(s.pinv)) if (!PKEY.test(k) || !s.pinv[k] || typeof s.pinv[k] !== 'object') delete s.pinv[k];
  s.pinv.host ||= {};
  if (!s.box || typeof s.box !== 'object') s.box = {};
  if (s.recipes && typeof s.recipes === 'object') s.recipes.f_kiste ||= 1; // Lagerkiste kann jede Insel bauen
  bindInv(s, s._who || 'host');
  if (s.intro === undefined) s.intro = null; // geführter Einstieg nur für neue Inseln, nie für alte Spielstände
  for (const k of Object.keys(base)) if (s[k] === undefined) s[k] = base[k];
  for (const k of Object.keys(UPGRADES)) if (s.up[k] === undefined) s.up[k] = UPGRADES[k].start;
  for (const k of Object.keys(base.stats)) if (s.stats[k] === undefined) s.stats[k] = 0;
  for (const k of ['money', 'xp', 'time', 'dayTime']) if (!Number.isFinite(s[k])) s[k] = 0;
  for (const k of ['level', 'day']) if (!Number.isInteger(s[k]) || s[k] < 1) s[k] = 1;
  s.home.walls ||= {};
  for (const [k, o] of Object.entries(s.home.items)) if (FURNITURE[o?.k]?.wall) { s.home.walls[k] = o; delete s.home.items[k]; }
  for (const [k, o] of Object.entries(s.obj)) {
    const p = PLACE[o?.k], [x, z] = k.split(',').map(Number);
    if (p && !buildingAt(x, z) && !resAt(s, k) && grass(x, z)) continue;
    if (p) addInv(s, o.k, 1);
    delete s.obj[k];
  }
  for (const k of Object.keys(s.tiles)) { const [x, z] = k.split(',').map(Number); if (buildingAt(x, z)) delete s.tiles[k]; }
  for (const k of Object.keys(base.mayor)) if (s.mayor[k] === undefined) s.mayor[k] = base.mayor[k];
  if (!Number.isFinite(s.loan) || s.loan < 0) s.loan = 0;
  if (fresh) refill(s);
  // Inselerweiterung: neue Bäume/Felsen sind sofort benutzbar; Tauchplätze, die jetzt an Land liegen, verschwinden
  for (const k of Object.keys(RES_SPOTS)) if (s.res[k] === undefined) s.res[k] = 3;
  // Baumschaufel: nur gültige Einträge behalten
  const tr = s.trees = s.trees && typeof s.trees === 'object' ? s.trees : {};
  tr.rm = Object.fromEntries(Object.keys(tr.rm || {}).filter(k => RES_SPOTS[k] === 'tree' || RES_SPOTS[k] === 'palm').map(k => [k, 1]));
  tr.add = Object.fromEntries(Object.entries(tr.add || {}).filter(([k, v]) => /^-?\d+,-?\d+$/.test(k) && (v?.kind === 'tree' || v?.kind === 'palm') && ITEMS[v.fruit]).map(([k, v]) => [k, { kind: v.kind, fruit: v.fruit }]));
  if (Array.isArray(s.dives)) s.dives = s.dives.filter(d => !d || !Number.isFinite(d.x) || swimmable(d.x, d.z));
  s.housePos = s.housePos && Number.isInteger(s.housePos.dx) && Number.isInteger(s.housePos.dz) && Math.abs(s.housePos.dx) <= MAP && Math.abs(s.housePos.dz) <= MAP ? { dx: s.housePos.dx, dz: s.housePos.dz } : null;
  applyHouse(s);
  X.migrateX(s);
  return s;
}

export const stage = c => {
  const g = CROPS[c.k].grow;
  return c.g >= g ? 3 : Math.min(2, Math.floor(c.g / g * 3));
};

export const inField = () => false;

// ---------- Haus umziehen: Haus & Briefkasten an einen neuen Platz (Versatz in s.housePos) ----------
// Die Baumverteilung (RES_SPOTS) rechnet weiter mit dem alten Platz, damit alle Bäume der Spielstände bleiben.
const HOUSE0 = { house: { ...BUILDINGS.house }, mail: { ...BUILDINGS.mail } };
export const HOUSE_HOME = [Math.round(HOUSE0.house.cx), Math.round(HOUSE0.house.cz)]; // Mitte des Hauses am Anfang
export const HOUSE_MOVE_PRICE = 5000;
export function applyHouse(s) {
  const dx = s?.housePos?.dx || 0, dz = s?.housePos?.dz || 0;
  for (const id of ['house', 'mail']) {
    const o = HOUSE0[id];
    Object.assign(BUILDINGS[id], { x0: o.x0 + dx, x1: o.x1 + dx, z0: o.z0 + dz, z1: o.z1 + dz, cx: o.cx + dx, cz: o.cz + dz, ox: o.ox + dx, oz: o.oz + dz });
  }
}
export const houseShift = () => [BUILDINGS.house.x0 - HOUSE0.house.x0, BUILDINGS.house.z0 - HOUSE0.house.z0];
// Passt das Haus mit seiner Mitte auf Feld (tx, tz)? Haus, Briefkasten, Platz vor der Tür und Abstand zu Gebäuden
export function houseFit(s, tx, tz) {
  const dx = tx - HOUSE_HOME[0], dz = tz - HOUSE_HOME[1], H = HOUSE0.house;
  const x0 = H.x0 + dx, x1 = H.x1 + dx, z0 = H.z0 + dz, z1 = H.z1 + dz, [sx, sz] = houseShift();
  if (dx === sx && dz === sz) return { ok: false, why: '🏠 Hier steht euer Haus schon.' };
  const tiles = [[x0 - 1, z1 + 1]], cx = Math.round(H.cx + dx); // Haus, Briefkasten, drei Felder vor der Tür
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) tiles.push([x, z]);
  for (let x = cx - 1; x <= cx + 1; x++) tiles.push([x, z1 + 1]);
  for (let x = x0 - 1; x <= x1 + 1; x++) for (let z = z0 - 1; z <= z1 + 2; z++) { const b = buildingAt(x, z); if (b && b !== 'house' && b !== 'mail') return { ok: false, why: `🏠 Zu nah an: ${BUILDINGS[b].name}`, tiles, dx, dz }; }
  for (const [x, z] of tiles) {
    const k = key(x, z);
    if (!grass(x, z) || gateAt(x, z)) return { ok: false, why: '🏠 Hier ist kein Platz – Wasser, Strand, Klippe oder Weg zum Tor', tiles, dx, dz };
    if (s.obj[k] || resAt(s, k) || s.tiles[k] || s.digs?.includes(k) || s.ground?.[k] || s.shells?.[k] || s.weeds?.[k]) return { ok: false, why: '🏠 Da steht noch etwas im Weg (Baum, Deko, Beet, Unkraut …)', tiles, dx, dz };
  }
  return { ok: true, tiles, dx, dz };
}
export function buildingAt(x, z) {
  for (const [id, b] of Object.entries(BUILDINGS)) if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) return id;
  return null;
}

export const inPond = pondAt;

export const boxCap = s => Object.values(s.home?.items || {}).filter(o => o?.k === 'kiste').length * 40;
export function canPlace(s, x, z) {
  const k = key(x, z);
  return grass(x, z) && !gateAt(x, z) && !buildingAt(x, z) && !s.tiles[k] && !s.obj[k] && !resAt(s, k) && !s.digs?.includes(k) && !s.weeds?.[k] && !s.shells?.[k] && !s.ground?.[k] && !s.capsules?.some(c => c.k === k && !c.opened);
}

// ---------- Zuhause (Innenraum liegt weit weg bei x = HOME_X, damit es eine eigene Welt ist) ----------
export const HOME_X = 300;
export const ROOMS = [null, [7, 5], [9, 7], [11, 7]];
export const roomSize = s => ROOMS[s.up.house] || ROOMS[1];
export const inside = p => p.x > HOME_X / 2;
// Zimmer der Nachbarn liegen hinter dem eigenen Haus (gleiche x, weiter südlich): je Nachbar eins
export const NROOM_Z0 = 60, NROOM_DZ = 40, NROOM_SIZE = [7, 5];
export const nroomZ = id => NROOM_Z0 + NPC_IDS.indexOf(id) * NROOM_DZ;
export const roomIdAt = z => (z < -30 ? V.xroomAt(z) : z < NROOM_Z0 - NROOM_DZ / 2 ? null : NPC_IDS[Math.round((z - NROOM_Z0) / NROOM_DZ)] || null);
const NROOM_STYLE = { mira: ['rosa', 'dielen'], bruno: ['holz', 'dunkel'], pippa: ['karo', 'fliesen'], lio: ['bluemchen', 'parkett'], kalle: ['mint', 'moos'], wanda: ['sterne', 'stein'] };
export const nroomBlank = id => ({ wall: NROOM_STYLE[id]?.[0] || 'vanille', floor: NROOM_STYLE[id]?.[1] || 'dielen', items: { '-2,-1': { k: 'einzelbett', r: 0 } }, rugs: {}, walls: {}, w: 0 });
const blankRooms = {};
// Ein Zimmer: eigenes Haus (id = null) oder das Zimmer eines Nachbarn
export function roomOf(s, id) {
  if (V.XROOMS[id]) return V.xroomOf(s, id); // Dachboden, Keller, Baumhaus
  if (!id) return { id: null, z0: 0, size: roomSize(s), items: s.home.items, rugs: s.home.rugs, walls: s.home.walls || {}, wall: s.home.wall, floor: s.home.floor };
  const h = s.nhome?.[id] || (blankRooms[id] ||= nroomBlank(id));
  return { id, z0: nroomZ(id), size: NROOM_SIZE, items: h.items, rugs: h.rugs, walls: h.walls, wall: h.wall, floor: h.floor };
}
// Kacheln eines Möbels: (x, z) = nordwestliche Kachel, gedreht -> Breite/Tiefe tauschen
export function footprint(k, x, z, r) {
  const f = FURNITURE[k], [w, d] = r % 2 ? [f.d, f.w] : [f.w, f.d], out = [];
  for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) out.push([x + i, z + j]);
  return out;
}
const layer = (s, f, R = roomOf(s)) => f.rug ? R.rugs : f.wall ? R.walls : R.items;
export function homeAt(s, x, z, kind, R = roomOf(s)) { // welches Möbel liegt auf dieser Kachel? kind: true/'rugs' = Teppiche, 'walls' = Wandschmuck
  const map = kind === 'walls' ? R.walls : kind ? R.rugs : R.items;
  for (const [k, o] of Object.entries(map)) {
    const [ax, az] = k.split(',').map(Number);
    if (footprint(o.k, ax, az, o.r).some(([i, j]) => i === x && j === z)) return { key: k, o, x: ax, z: az };
  }
  return null;
}
const inRoom = (s, x, z, R = roomOf(s)) => { const [w, d] = R.size; return Math.abs(x) <= (w - 1) / 2 && Math.abs(z) <= (d - 1) / 2; };
export function wallRot(s, x, z, R = roomOf(s)) { // Wandschmuck: Rückwand, sonst linke/rechte Wand
  const [w, d] = R.size;
  return z === -(d - 1) / 2 ? 0 : x === -(w - 1) / 2 ? 1 : x === (w - 1) / 2 ? 3 : -1;
}
export function canFurnish(s, k, x, z, r, R = roomOf(s)) {
  const f = FURNITURE[k];
  if (!f) return false;
  if (f.wall) {
    const wr = wallRot(s, x, z, R);
    return wr >= 0 && footprint(k, x, z, wr).every(([i, j]) => inRoom(s, i, j, R) && !homeAt(s, i, j, 'walls', R));
  }
  const [, d] = R.size;
  return footprint(k, x, z, r).every(([i, j]) => inRoom(s, i, j, R) && !homeAt(s, i, j, f.rug, R) && (f.rug || !f.solid || !(i === 0 && j === (d - 1) / 2))); // Platz vor der Tür bleibt frei
}
// Kollision im Haus: Wände knapp, Möbel nach ihrer echten Form. Die 3D-Welt trägt die Maße jedes Möbels
// in FURN_HIT ein ([halbe Breite, halbe Tiefe, Versatz x, Versatz z], ungedreht); ohne die (Tests) gilt das Raster.
export const FURN_HIT = {};
export function furnBox(k, ax, az, r) {
  const f = FURNITURE[k], [fw, fd] = r % 2 ? [f.d, f.w] : [f.w, f.d], cx = ax + (fw - 1) / 2, cz = az + (fd - 1) / 2;
  const h = FURN_HIT[k];
  if (!h) return [cx - fw / 2 + 0.12, cx + fw / 2 - 0.12, cz - fd / 2 + 0.12, cz + fd / 2 - 0.12];
  let [hw, hd, ox, oz] = h; // Modell um r·90° gedreht (wie in der Welt: rotation.y = r·π/2)
  for (let i = 0; i < ((r % 4) + 4) % 4; i++) [hw, hd, ox, oz] = [hd, hw, oz, -ox];
  return [cx + ox - hw, cx + ox + hw, cz + oz - hd, cz + oz + hd];
}
function homeBlocked(s, x, z) {
  const R = roomOf(s, roomIdAt(z)), [w, d] = R.size, lx = x - HOME_X, lz = z - R.z0, door = Math.abs(lx) < 0.6;
  if (Math.abs(lx) > w / 2 - 0.1 || lz < -d / 2 + 0.1 || lz > d / 2 + (door ? 0.6 : -0.1)) return true;
  for (const [k, o] of Object.entries(R.items)) {
    if (!FURNITURE[o.k]?.solid) continue;
    const [ax, az] = k.split(',').map(Number);
    if (Math.abs(ax - lx) > 3.5 || Math.abs(az - lz) > 3.5) continue;
    const [x0, x1, z0, z1] = furnBox(o.k, ax, az, o.r || 0);
    if (lx > x0 && lx < x1 && lz > z0 && lz < z1) return true;
  }
  return false;
}

// Zimmer für eine Möbel-Aktion: eigenes Haus oder (a.room) das Zimmer eines Nachbarn ab 3 Herzen
function actRoom(s, a, out) {
  if (a.room === undefined || a.room === null) return roomOf(s);
  if (V.XROOMS[a.room]) return V.xroomOpen(s, a.room) ? roomOf(s, a.room) : null;
  if (!NPC_IDS.includes(a.room)) return null;
  if (hearts(s, a.room) < 3) { if (out) out.msg = 'Erst ab 3 Herzen darfst du hier einrichten.'; return null; }
  s.nhome ||= {};
  s.nhome[a.room] ||= nroomBlank(a.room);
  return roomOf(s, a.room);
}

// Kann man an dieser Weltposition stehen?
// Mit Neoprenanzug (swim) darf man ins Meer – aber nicht zu weit hinaus, nicht in Fluss oder Teich
export const swimmable = (x, z) => isSea(x, z) && !onPier(x, z) && coast(x, z) < 7.5 && Math.abs(x) < ISLAND + 6 && Math.abs(z) < ISLAND + 6;
export function blocked(s, x, z, swim) {
  if (x > HOME_X / 2) return homeBlocked(s, x, z);
  if (z < -750) return E7.blocked7(s, x, z); // Seerosenmoor, Bambushain
  if (z < -450) return E6.blocked6(s, x, z); // Jahrmarkt
  if (z < -150) { // Bummelgasse (nach Süden geht's durchs Tor zurück)
    const lx = x - STREET.x, lz = z - STREET.z;
    return !(streetWalk(lx, lz) || (Math.abs(lx) <= 1.1 && lz > 0 && lz <= STREET.d + 0.9));
  }
  if (z > 3600) return V.blockedV(s, x, z); // Hochsee-Boot
  if (z > 2600) return W4.blockedW(s, x, z); // Grotte hinter dem Wasserfall, Vulkaninsel
  if (z > 1900) return Z.depthBlocked(s, x, z); // Höhlen-Tiefen (unter der Kristallhöhle)
  if (z > 1350) return Z.wreckBlocked(s, x, z); // Schiffswrack (unter Wasser)
  if (z > 1000) return Y.reefBlocked(s, x, z); // Korallenriff (unter Wasser)
  if (z > 450) return X.tripBlocked(s, x, z); // Ausflugsinsel
  if (z > 150) { // Tropeninsel
    const lx = x - TROPIC.x, lz = z - TROPIC.z, tx = Math.round(lx), tz = Math.round(lz);
    if (!tropicWalk(lx, lz)) return true;
    if (tx >= TROPIC_HUT.x0 && tx <= TROPIC_HUT.x1 && tz >= TROPIC_HUT.z0 && tz <= TROPIC_HUT.z1) return true;
    return tropicTree(tx, tz) >= 0;
  }
  if (x < -150) { // Insel-Erweiterungen
    const id = areaOf({ x, z }), A = AREAS[id], lx = x - A.x, lz = z - A.z;
    if (areaExit(id, lx, lz) && lz <= A.d + 1.2) return false;
    if (!inArea(id, lx, lz)) return true;
    const n = nodeAt(id, Math.round(lx), Math.round(lz));
    if (Y.cableBuilt(s)) { const [cx, cz] = Y.cableStop(id); if (Math.hypot(x - cx, z - cz) < 0.7) return true; }
    return !!(n && SOLID.includes(n.kind));
  }
  if (gateAt(Math.round(x), Math.round(z))) return true;
  if (bridgeRail(x, z)) return true; // Brückengeländer
  if (pondAt(x, z) && W4.isWinter(s)) return false; // im Winter ist der Teich zugefroren: Eislaufen!
  if (swim && swimmable(x, z)) return Math.abs(x - PIER.x) < PIER.w + 0.3 && z > PIER.z0 && z < PIER.z1; // unter dem Steg durch geht nicht
  if (!walkable(x, z)) return true;
  const tx = Math.round(x), tz = Math.round(z);
  if (buildingAt(tx, tz) || resAt(s, key(tx, tz))) return true;
  if (Math.abs(tx) <= 3 && tz >= -1 && tz <= 3) { // Dorfplatz: Turnierstand und Fest-Deko
    const f = festToday(s);
    if (f && ((tx === CONTEST_AT[0] && tz === CONTEST_AT[1] && FESTS[f].contest) || FEST_DECO[f]?.some(([, x, z]) => x === tx && z === tz))) return true;
    if (tx === X.NIGHT_AT[0] && tz === X.NIGHT_AT[1] && X.nightOpen(s)) return true;
  }
  const o = s.obj[key(tx, tz)];
  return !!(o && PLACE[o.k].solid);
}

// Welche Kacheln ein Werkzeug der Stufe l trifft (dx/dz = Blickrichtung).
export function area(l, x, z, dx, dz) {
  if (l <= 1) return [[x, z]];
  if (l === 2) return [[x, z], [x + dx, z + dz], [x + 2 * dx, z + 2 * dz]];
  const r = l === 3 ? 1 : 2, cx = x + dx * r, cz = z + dz * r, out = [];
  for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) out.push([cx + i, cz + j]);
  return out;
}

// Tiere laufen auf festen, aber zufällig wirkenden Bahnen: alle Spieler sehen ohne Netzverkehr dasselbe.
export function animalPos(a, t) {
  const pen = PENS[ANIMALS[a.k]?.home] || { cx: 0, cz: 0, rx: 1, rz: 1 };
  const h = a.id * 2.399;
  const ph = t * (0.07 + (a.id % 5) * 0.013) + h;
  const f = Math.floor(ph), r = ph - f;
  const e = f + r * r * (3 - 2 * r); // laufen – kurz stehen bleiben – weiterlaufen
  return { x: pen.cx + pen.rx * Math.sin(e * 1.3 + h), z: pen.cz + pen.rz * Math.sin(e * 0.9 + h * 2.1), walking: r > 0.08 && r < 0.92 };
}

export const price = (s, id) => ITEMS[id]?.turnip ? turnipPrice(s) : Math.round((ITEMS[id]?.sell || 0) * (1 + 0.2 * (s.up['q_' + ITEMS[id].cat] || 0)) * sellFactor(s));

// ---------- Rübenbörse ----------
// Sonntagmorgen kauft man Rüben bei Hoppel, Montag bis Samstag zahlt der Krämerladen zweimal am Tag einen neuen Preis.
// Nach einer Woche werden übrige Rüben faul.
export const halfDay = s => (weekday(s.day) - 1) * 2 + (6 + s.dayTime * 18 >= 12 ? 1 : 0); // 0 = Montagvormittag … 11 = Samstagnachmittag
export const turnipPrice = s => (weekday(s.day) === 0 || !s.turnip ? 0 : s.turnip.p[halfDay(s)] || 0);
export const turnipSeller = s => weekday(s.day) === 0 && 6 + s.dayTime * 18 < 12; // Hoppel ist da
function newTurnips(s) {
  const buy = 90 + rnd(21), r = Math.random(), p = [];
  if (r < 0.35) { // durcheinander
    for (let i = 0; i < 12; i++) p.push(Math.round(buy * (0.6 + Math.random() * 0.8)));
  } else if (r < 0.55) { // fällt nur
    let v = buy * (0.85 + Math.random() * 0.05);
    for (let i = 0; i < 12; i++) { p.push(Math.round(v)); v -= buy * (0.03 + Math.random() * 0.02); }
  } else { // fällt, dann Spitze (klein oder groß)
    const big = r > 0.8, peak = 2 + rnd(7);
    let v = buy * (0.85 + Math.random() * 0.05);
    for (let i = 0; i < 12; i++) {
      const d = i - peak;
      if (d < 0) { p.push(Math.round(v)); v -= buy * 0.04; }
      else if (d <= 2) p.push(Math.round(buy * (big ? [1.4, 2 + Math.random() * 4, 1.6][d] : [1.2, 1.5 + Math.random() * 0.5, 1.3][d])));
      else p.push(Math.round(buy * (0.4 + Math.random() * 0.4)));
    }
  }
  s.turnip = { day: s.day, buy, p: p.map(v => Math.max(9, v)) };
}
export const capacity = () => 0;
export const animalCount = () => 0;

export function upgradeInfo(s, id) {
  const u = UPGRADES[id], l = s.up[id], i = l - u.start, max = u.start + u.cost.length;
  return { level: l, max, done: l >= max, cost: u.cost[i], req: u.req[i] };
}

// ---------- Zeit ----------

export function tick(s, dt, auth) {
  let changed = false;
  if (s.tour && !Number.isFinite(s.tour.end)) s.tour = null;
  s.time += dt;
  if (!s.real) s.dayTime += dt / DAY; // Echtzeit: der Host stellt die Uhr nach der echten Uhrzeit (realClock)
  if (s.dayTime >= 1) {
    if (auth) { newDay(s); changed = true; } else s.dayTime = 0.9999;
  }
  if (X.tickX(s, dt, auth)) changed = true;
  const rain = X.isWet(s); // Regen, Gewitter und Schnee gießen
  const sea = seasonOf(s.day), nice = ord(s) === 'schoen';
  if (auth && contestTick(s)) changed = true;
  // Tour auf der Tropeninsel: Zeit abgelaufen
  if (auth && s.tour && s.time > s.tour.end) { s.tourEnd = { k: s.tour.k, ok: false, t: s.time }; s.tour = null; changed = true; }
  // Geschenkballons: tagsüber ab und zu, fliegen von einer Seite zur anderen
  if (auth) {
    const hour = 6 + s.dayTime * 18;
    if (s.balloon && Math.abs(balloonPos(s.balloon, s.time).x) > ISLAND + 8) { s.balloon = null; changed = true; }
    if (!s.balloon && !rain && hour > 8 && hour < 18 && Math.random() < dt / 70) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      s.balloon = { id: s.nextId++, x0: -dir * (ISLAND + 6), z: -12 + Math.random() * 26, t0: s.time, dir };
      changed = true;
    }
  }
  for (const o of Object.values(s.obj)) {
    const p = PLACE[o.k];
    if (p?.kind === 'producer' && o.t < p.every && (!p.farm || Y.farmFed(s, o))) { // Tiere wachsen nur gefüttert
      o.t = Math.min(p.every, o.t + dt);
      if (o.t >= p.every) changed = true;
    }
  }
  const cov = X.gardenCover(s); // Sprinkler gießen, im Gewächshaus ist immer Saison
  for (const [k, t] of Object.entries(s.tiles)) {
    if (rain || (cov.water.has(k) && !(t.w > 0))) { if (!t.w) changed = true; t.w = WET; }
    if (t.c && t.c.g < CROPS[t.c.k].grow) { // gegossen wächst es viel schneller
      const before = stage(t.c);
      t.c.g = Math.min(CROPS[t.c.k].grow, t.c.g + dt * (CROPS[t.c.k].sea.includes(sea) || cov.green.has(k) ? 1 : 0.5) * (t.w > 0 ? 1 : nice ? 0.85 : 0.3));
      if (stage(t.c) !== before) changed = true;
    }
    if (t.w > 0) {
      t.w -= dt;
      if (t.w <= 0) { t.w = 0; changed = true; }
    }
  }
  return changed;
}

// ---------- Feste, Geburtstage, Turniere ----------
export const daySea = day => ((day - 1) % SEASON_LEN) + 1;
export function festOf(day) {
  const sea = seasonOf(day), d = daySea(day);
  for (const [k, f] of Object.entries(FESTS)) if (f.sea === sea && f.d === d) return k;
  return null;
}
export function birthdayOf(day) {
  const sea = seasonOf(day), d = daySea(day);
  for (const [id, [bs, bd]] of Object.entries(BIRTHDAYS)) if (bs === sea && bd === d) return id;
  return null;
}
let festMemo = [0, null];
export const festToday = s => (festMemo[0] === s.day ? festMemo[1] : (festMemo = [s.day, festOf(s.day)])[1]);
export const contestDay = s => FESTS[festOf(s.day)]?.contest || null;
export const contestOpen = s => { const h = 6 + s.dayTime * 18; return !!contestDay(s) && h >= 9 && h < 18; };
const EGGS = 10;
function festMorning(s) {
  const f = festOf(s.day), F = FESTS[f];
  s.eggs = {};
  s.fest = f ? { k: f, day: s.day, eggs: 0, candy: [], done: 0 } : null;
  s.contest = F?.contest ? { k: F.contest, day: s.day, runs: {}, best: {}, res: [] } : null;
  if (f === 'eier') {
    for (let t = 0, n = 0; n < EGGS && t < 600; t++) {
      const [x, z] = randTile(), k = key(x, z);
      if (!walkable(x, z) || isWater(x, z) || onBridge(x, z) || onPier(x, z) || onPlaza(x, z, 0.5) || buildingAt(x, z) || resAt(s, k) || s.obj[k] || s.tiles[k] || s.shells[k] || s.ground?.[k] || s.eggs[k]) continue;
      if (Object.keys(s.eggs).some(q => { const [a, b] = q.split(',').map(Number); return Math.hypot(a - x, b - z) < 4; })) continue; // schön verteilt
      s.eggs[k] = n % 5;
      n++;
    }
    s.fest.total = Object.keys(s.eggs).length;
  }
  const note = (title, text, item, n) => s.mail.push({ kind: 'note', from: 'rosi', title, text, item: item || null, n: n || 1, day: s.day });
  if (F) {
    const gift = { feuerwerk: ['herzballon', 'Als kleines Andenken lege ich euch einen Herzballon bei.'], lichter: ['lichterbaum', 'Für euren Garten: ein eigener kleiner Lichterbaum!'] }[f];
    note(`${F.icon} Heute: ${F.name}!`, `Liebe Bürgermeister,\n${F.desc}${gift ? '\n' + gift[1] : ''}\n\nEure Rosi 🦌`, gift?.[0]);
  }
  if (f === 'lichter') for (const id of NPC_IDS) if (hearts(s, id) >= 1) {
    const [item, n] = NPC_DATA[id].gift;
    s.mail.push({ kind: 'note', from: id, title: `🎁 Frohes Lichterfest von ${NPC_DATA[id].name}!`, text: `Ihr Lieben,\nein kleines Geschenk für euch – danke, dass ihr so tolle Nachbarn seid!\n\n${NPC_DATA[id].name} ${NPC_DATA[id].icon}`, item, n: Math.min(n, 3), day: s.day });
  }
  const b = birthdayOf(s.day);
  if (b) note(`🎂 ${NPC_DATA[b].name} hat heute Geburtstag!`, `Liebe Bürgermeister,\nheute feiert ${NPC_DATA[b].name} ${NPC_DATA[b].icon} Geburtstag! Schaut doch vorbei – über ein kleines Geschenk freut sich das Geburtstagskind ganz besonders.\n\nEure Rosi 🦌`);
  const tomorrow = birthdayOf(s.day + 1);
  if (tomorrow) note(`🎈 Morgen hat ${NPC_DATA[tomorrow].name} Geburtstag`, `Psst! Morgen ist ${NPC_DATA[tomorrow].name}s Geburtstag. Vielleicht habt ihr ja noch etwas, worüber ${NPC_DATA[tomorrow].name} sich freut?\n\nEure Rosi 🦌`);
  for (const id of NPC_IDS) if (s.npc[id]?.bday === s.day - 1) // Dankeschön fürs Geburtstagsgeschenk
    s.mail.push({ kind: 'note', from: id, title: `🎂 Danke für das Geschenk!`, text: `Ihr Lieben,\ngestern war so ein schöner Geburtstag – und euer Geschenk hat mich riesig gefreut! Hier ist ein Stück von meiner Torte. Na ja … die ganze Torte. Zum Aufstellen!\n\n${NPC_DATA[id].name} ${NPC_DATA[id].icon}`, item: 'torte', n: 1, day: s.day });
}
// Turnier: Runde beim Stand anmelden, Fänge zählen, nach 3 Minuten wertet der Host aus
const MEDAL = n => n >= 9 ? 'gold' : n >= 6 ? 'silber' : n >= 3 ? 'bronze' : null;
function contestCount(s, by, kind, out) {
  const c = s.contest, r = c?.runs?.[by];
  if (!r || c.k !== kind || s.time > r.until) return;
  r.n++;
  out.contest = r.n;
}
function contestTick(s) {
  const c = s.contest;
  if (!c) return false;
  let changed = false;
  for (const [by, r] of Object.entries(c.runs)) {
    if (s.time <= r.until) continue;
    delete c.runs[by];
    const medal = MEDAL(r.n), first = r.n > (c.best[by] || 0);
    c.best[by] = Math.max(c.best[by] || 0, r.n);
    const money = { gold: 3000, silber: 1500, bronze: 600 }[medal] || 100;
    s.money += money; s.stats.earned += money;
    let item = null;
    const cup = c.k === 'fish' ? 'angelpokal' : 'kaeferpokal';
    if (medal === 'gold' && !s.cups?.[cup]) { (s.cups ||= {})[cup] = s.day; addInv(s, cup, 1); item = cup; }
    c.res.push({ by, name: r.name, n: r.n, medal, money, item, first, t: s.time });
    if (c.res.length > 12) c.res.shift();
    (s.diary ||= []).push({ day: s.day, icon: c.k === 'fish' ? '🎣' : '🦋', text: `${r.name}: ${r.n} beim ${c.k === 'fish' ? 'Angel' : 'Krabbeltier'}-Turnier${medal ? ` – ${{ gold: '🥇 Gold', silber: '🥈 Silber', bronze: '🥉 Bronze' }[medal]}` : ''}` });
    changed = true;
  }
  return changed;
}

// Über Nacht: Blumen-Kreuzungen (gegossene, blühende Nachbarblumen verschiedener Sorte)
function crossBreed(s) {
  let n = 0;
  const bloom = k => { const t = s.tiles[k]; return t?.c && isFlower(t.c.k) && t.c.g >= CROPS[t.c.k].grow && (t.w > 0 || X.isWet(s)) ? t.c.k : null; };
  for (const k of Object.keys(s.tiles)) {
    if (n >= 2) break;
    const a = bloom(k);
    if (!a) continue;
    const [x, z] = k.split(',').map(Number);
    for (const [dx, dz] of [[1, 0], [0, 1]]) {
      const b = bloom(key(x + dx, z + dz));
      if (!b || b === a) continue;
      const h = HYBRIDS[[a, b].sort().join('+')];
      if (!h || Math.random() > 0.3) continue;
      const spot = [[x - 1, z], [x + 1 + dx, z + dz], [x, z - 1], [x + dx, z + dz + 1], [x, z + 1], [x + 1, z - 1]].find(([i, j]) => canPlace(s, i, j) && !s.paths?.[key(i, j)]);
      if (!spot) continue;
      s.tiles[key(...spot)] = { w: 0, c: { k: h, g: 0 } };
      (s.diary ||= []).push({ day: s.day + 1, icon: CROPS[h].icon, text: `Eine seltene ${CROPS[h].name} ist zwischen ${CROPS[a].name} und ${CROPS[b].name} gekeimt!` });
      s.bred = (s.bred || 0) + 1;
      n++;
      break;
    }
  }
  return n;
}

function newDay(s) {
  const bred = crossBreed(s);
  s.day++;
  s.dayTime = 0;
  const was = s.weather;
  s.weather = X.nextWeather(s); // mit Vorhersage aus der Inselzeitung (Regen, Gewitter, Nebel, Schnee)
  if ((was === 'rain' || was === 'storm') && s.weather === 'sun') s.rainbowDay = s.day; // nach dem Regen: Regenbogen am Vormittag
  s.orders = s.orders.filter(o => s.day - o.day < 3);
  s.balloon = null;
  refill(s);
  // Wünsche der Nacht: Sternsplitter am Strand
  for (let t = 0, n = 0; n < Math.min(8, s.wishes || 0) && t < 300; t++) {
    const [x, z] = randTile(), k = key(x, z);
    if (sand(x, z) && !s.shells[k] && !s.obj[k] && !resAt(s, k)) { s.shells[k] = 'sternsplitter'; n++; }
  }
  s.wishes = 0;
  s.starNight = s.weather === 'sun' && Math.random() < 0.3;
  if (weekday(s.day) === 0) { // neue Woche: Rüben verfaulen, neue Preise
    for (const inv of [...Object.values(s.pinv), s.box]) if (inv.ruebe) { inv.faule_ruebe = (inv.faule_ruebe || 0) + inv.ruebe; delete inv.ruebe; }
    newTurnips(s);
  }
  newDailies(s);
  // Briefe der Nachbarn bei neuen Herzen (2, 4, 6, 8, 10)
  for (const id of NPC_IDS) {
    const n = friend(s, id), h = hearts(s, id);
    for (const m of [2, 4, 6, 8, 10]) if (h >= m && !n.sent.includes(m)) {
      n.sent.push(m);
      const [item, cnt] = NPC_DATA[id].gift;
      s.mail.push({ from: id, hearts: m, item: m % 4 === 2 ? item : null, n: cnt, day: s.day });
    }
  }
  // Bezahlte Inselprojekte stehen am nächsten Morgen
  for (const [k, o] of Object.entries(s.obj)) if (o.k === 'baustelle' && o.p && o.paid >= (PROJECTS[o.p]?.cost || Infinity)) {
    s.obj[k] = { k: o.p, r: o.r || 0 };
    s.mayor.built = (s.mayor.built || 0) + 1;
    s.mail.push({ kind: 'note', from: 'rosi', title: `🎉 ${PROJECTS[o.p].icon} ${PROJECTS[o.p].name} ist fertig!`, text: `Liebe Bürgermeister,\nheute früh haben wir ${PROJECTS[o.p].name} feierlich eingeweiht. Die ganze Insel ist begeistert! Vielen Dank für eure Spenden.\n\nEure Rosi 🦌\nRathaus`, day: s.day });
  }
  // Samstags schreibt der Wohnwert-Verein
  if (weekday(s.day) === 6) {
    const h = homeScore(s), r = hhaRank(h.pts), first = h.pts > (s.hha.best || 0);
    let item = null, n = 1;
    if (h.pts >= 20000 && !s.hha.pokal) { s.hha.pokal = s.day; item = 'pokal'; }
    const bonus = first ? Math.round(h.pts / 10) : 0;
    if (bonus) { s.money += bonus; s.stats.earned += bonus; }
    s.hha.best = Math.max(s.hha.best || 0, h.pts);
    s.mail.push({ kind: 'note', from: 'hha', title: `${r[2]} Wohnwert-Verein: ${fmt(h.pts)} Punkte`, item, n,
      text: `Hallo ihr Lieben,\nwir haben euer Zuhause bewertet: ${h.pieces} Möbelstücke, ${h.kinds} verschiedene – das macht ${fmt(h.pts)} Punkte. Unsere Auszeichnung: „${r[1]}“.${bonus ? `\nNeuer Rekord! Dafür schicken wir euch ${fmt(bonus)} Taler.` : ''}${item ? '\nUnd weil es so wunderschön ist: unser Wohnwert-Pokal für euren Garten! 🏆' : ''}\n\nEuer Wohnwert-Verein 🛋️`, day: s.day });
  }
  const sc = islandScore(s);
  if (sc.stars > (s.stars || 1)) {
    s.mail.push({ kind: 'note', from: 'rosi', title: `⭐ Die Insel hat jetzt ${sc.stars} Sterne!`, text: `Liebe Bürgermeister,\ndie Inselbewertung ist gestiegen: ${'⭐'.repeat(sc.stars)}! Alle fühlen sich hier pudelwohl.${sc.stars === 5 ? '\nFünf Sterne – eine Trauminsel! Als Dank lege ich euch 10.000 Taler bei.' : ''}\n\nEure Rosi 🦌`, day: s.day });
    if (sc.stars === 5 && !s.mayor.five) { s.mayor.five = s.day; s.money += 10000; }
  }
  s.stars = Math.max(s.stars || 1, sc.stars);
  festMorning(s);
  if (bred) s.mail.push({ kind: 'note', from: 'lio', title: '🌱 Etwas Neues blüht!', text: `Hallo ihr zwei!\nIch hab heute früh in eurem Garten etwas entdeckt: Zwischen euren Blumen ist eine seltene Sorte gekeimt! Das passiert manchmal, wenn verschiedene Blumen nebeneinander stehen und gut gegossen sind.\n\nLio 🦊`, day: s.day });
  if (s.diary?.length > 120) s.diary.splice(0, s.diary.length - 120);
  X.morningX(s);
  if (s.mail.length > 20) s.mail.splice(0, s.mail.length - 20);
  fillOrders(s);
}

const hourOf = s => 6 + s.dayTime * 18;
function weighted(list, w) {
  const total = list.reduce((t, x) => t + w(x), 0);
  let r = Math.random() * total;
  for (const x of list) if ((r -= w(x)) < 0) return x;
  return list[0];
}
function learnOrMoney(s, out) { // kleine Überraschung beim Schütteln
  const n = 100 + Math.floor(Math.random() * 400);
  s.money += n;
  out.msg = `Ein Säckchen mit ${n} Talern ist mit heruntergefallen!`;
}
function collect(s, id, out) { // ins Sammelbuch eintragen
  if (!s.album[id]) out.newAlbum = id;
  s.album[id] = (s.album[id] || 0) + 1;
}

// Alle liegen im Bett und es ist Abend? Dann beginnt gleich der nächste Morgen.
export function sleepThrough(s) {
  if (s.real) return false; // mit echter Uhrzeit vergeht die Nacht von selbst
  if (6 + s.dayTime * 18 < 18) return false;
  questEvent(s, 'sleep');
  newDay(s);
  return true;
}

// Echte Uhrzeit (Einstellung des Hosts): 6–24 Uhr = Spieltag, nachts bleibt es dunkel; um Mitternacht beginnt ein neuer Tag.
export function realClock(s, d = new Date()) {
  const h = d.getHours() + d.getMinutes() / 60, stamp = d.toDateString();
  let changed = false;
  if (s.realDate && s.realDate !== stamp) { newDay(s); changed = true; }
  s.realDate = stamp;
  s.dayTime = h >= 6 ? Math.min(0.9999, (h - 6) / 18) : 0.9999;
  return changed;
}
// Ballon: fliegt in der Höhe quer über die Insel
export function balloonPos(b, t) {
  const dt = t - b.t0, x = b.x0 + b.dir * dt * 1.15;
  return { x, z: b.z + Math.sin(dt * 0.3) * 1.2, y: 3.3 + Math.sin(dt * 0.9) * 0.3 };
}
export const pavable = (s, x, z) => walkable(x, z) && !onBridge(x, z) && !onPier(x, z) && !buildingAt(x, z) && !resAt(s, key(x, z)) && !s.tiles[key(x, z)] && !s.digs?.includes(key(x, z));

// Wo wird geangelt? Fluss, Teich oder Meer
export const waterKind = (x, z) => pondAt(x, z) ? 'pond' : inRiver(x, z) && !onBridge(x, z) ? 'river' : 'sea';
export const fruitReady = (s, k) => !(s.fruit?.[k] > s.day);

// ---------- Bäume, Palmen & Felsen ----------
// Die festen Plätze stehen in RES_SPOTS. Mit der Baumschaufel ausgegrabene Bäume landen in s.trees.rm,
// neu gepflanzte in s.trees.add – so bleibt die Grundverteilung alter Spielstände unangetastet.
export const resAt = (s, k) => s.trees?.add?.[k]?.kind || (s.trees?.rm?.[k] ? null : RES_SPOTS[k] || null);
export const fruitOf = (s, k) => s.trees?.add?.[k]?.fruit || TREE_FRUIT[k] || 'apfel';
export function spots(s) {
  const o = {};
  for (const [k, v] of Object.entries(RES_SPOTS)) if (!s.trees?.rm?.[k]) o[k] = v;
  for (const [k, v] of Object.entries(s.trees?.add || {})) o[k] = v.kind;
  return o;
}
// Darf hier ein Baum (oder eine Palme) gepflanzt werden? Nicht direkt neben andere Bäume, Felsen oder Gebäude.
export function treeSpotOk(s, x, z, palm) {
  const k = key(x, z);
  if (!(grass(x, z) || (palm && sand(x, z) && coast(x, z) < -1.2)) || onBridge(x, z) || onPier(x, z) || onPlaza(x, z, 1) || gateAt(x, z)) return false;
  if (s.tiles[k] || s.obj[k] || s.paths?.[k] || s.digs?.includes(k) || s.ground?.[k] || s.shells?.[k] || s.weeds?.[k]) return false;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    if (buildingAt(x + i, z + j) || resAt(s, key(x + i, z + j))) return false;
    const o = s.obj[key(x + i, z + j)];
    if (o && PLACE[o.k]?.solid) return false;
  }
  return true;
}
export const SAPLING = { apfel: 'baum_apfel', kirsche: 'baum_kirsche', orange: 'baum_orange', pfirsich: 'baum_pfirsich', birne: 'baum_birne', kokosnuss: 'baum_palme' };

// ---------- Wünsche der Nachbarn ----------

function orderCandidates(s) {
  const c = ['apfel', 'kirsche', 'orange', 'pfirsich', 'birne', 'holz', 'stein', 'herzmuschel'];
  for (const k of Object.keys(CROPS)) if (CROPS[k].lvl <= s.level) c.push(k);
  for (const [id] of FISH) if (s.album[id] && ITEMS[id].cat === 'fish') c.push(id);
  for (const [id] of BUGS) if (s.album[id]) c.push(id);
  if (s.level >= 3) c.push('eisen', 'kokosnuss');
  const taken = new Set(s.orders.map(o => o.item));
  const free = [...new Set(c)].filter(k => !taken.has(k));
  return free.length ? free : c;
}

function fillOrders(s) {
  while (s.orders.length < 3) {
    const item = pick(orderCandidates(s)), cat = ITEMS[item].cat;
    const n = cat === 'fruit' || cat === 'veg' ? 3 + rnd(4) : cat === 'mat' ? 2 + rnd(5) : 1 + rnd(2);
    const reward = Math.round(ITEMS[item].sell * n * 1.5 / 10) * 10 + 50;
    s.orders.push({ item, n, reward, xp: n * 3 + 5, day: s.day, npc: pick(NPC_IDS) });
  }
}

// ---------- Aktionen ----------

function addXp(s, n, out) {
  s.xp += n;
  while (s.level < MAX_LEVEL && s.xp >= needXp(s.level)) {
    s.xp -= needXp(s.level);
    s.level++;
    out.levelUp = s.level;
    questEvent(s, 'level', s.level, out);
  }
  if (s.level >= MAX_LEVEL) s.xp = Math.min(s.xp, needXp(MAX_LEVEL));
}

const addInv = (s, id, n) => { s.inv[id] = (s.inv[id] || 0) + n; if (n > 0 && X.catalogOk(id)) (s.catalog ||= {})[id] = 1; };
export const addInvX = (s, id, n) => addInv(s, id, n);
export const questEventX = (s, ev, n, out) => questEvent(s, ev, n, out);
export const DAY_SECS = DAY;
export const collectX = (s, id, out) => collect(s, id, out);
export const friendX = (s, id) => friend(s, id);
export const sandX = (x, z) => sand(x, z);
export const takeInvX = (s, id, n) => takeInv(s, id, n);
const takeInv = (s, id, n) => {
  if ((s.inv[id] || 0) < n) return false;
  s.inv[id] -= n;
  if (!s.inv[id]) delete s.inv[id];
  return true;
};
const isInt = v => Number.isInteger(v) && Math.abs(v) <= MAP + 6;
const isCount = v => Number.isInteger(v) && v > 0 && v <= 9999;
const isDir = (dx, dz) => [-1, 0, 1].includes(dx) && [-1, 0, 1].includes(dz) && Math.abs(dx) + Math.abs(dz) === 1;
const has = (o, k) => typeof k === 'string' && Object.hasOwn(o, k);
const fx = (out, x, z, txt, k) => out.fx.push({ x, z, txt, k }); // k = Partikel-Art für die Grafik
const isTree = (s, k) => resAt(s, k) === 'tree' || resAt(s, k) === 'palm';

const ACTIONS = {
  water(s, a, out) {
    let n = 0;
    for (const [x, z] of area(s.up.can, a.x, a.z, a.dx, a.dz)) {
      const t = s.tiles[key(x, z)];
      if (t) {
        t.w = WET; n++; fx(out, x, z, '', 'water');
        if (s.inv.opalkanne > 0 && t.c && t.op !== s.day) { t.op = s.day; t.c.g = Math.min(CROPS[t.c.k].grow, t.c.g + CROPS[t.c.k].grow * 0.15); } // Opalkanne: Wachstumsschub
      }
    }
    out.snd = 'water';
    if (n) questEvent(s, 'water', n, out);
    return n > 0;
  },
  plant(s, a, out) {
    if (!has(ITEMS, a.item) || !ITEMS[a.item].seed || !canPlace(s, a.x, a.z) || s.paths?.[key(a.x, a.z)] || !takeInv(s, a.item, 1)) return false;
    s.tiles[key(a.x, a.z)] = { w: 0, c: { k: ITEMS[a.item].seed, g: 0 } };
    fx(out, a.x, a.z, '', 'seed');
    s.stats.planted = (s.stats.planted || 0) + 1;
    out.snd = 'plant';
    questEvent(s, 'plant', 1, out);
    return true;
  },
  harvest(s, a, out) {
    const t = s.tiles[key(a.x, a.z)];
    if (!t || !t.c || stage(t.c) < 3) return false;
    if (W4.giantHarvest(s, t, a, out)) return true; // Riesengemüse
    const c = CROPS[t.c.k], n = c.yield || 1;
    addInv(s, t.c.k, n);
    s.stats.harvested += n;
    s.stats['h_' + t.c.k] = (s.stats['h_' + t.c.k] || 0) + n;
    fx(out, a.x, a.z, `+${n} ${c.icon}`, 'leaf');
    if (c.regrow) t.c.g = c.grow - c.regrow; else delete s.tiles[key(a.x, a.z)];
    addXp(s, c.xp * n, out);
    questEvent(s, 'harvest', n, out);
    out.snd = 'harvest';
    return true;
  },
  place(s, a, out) {
    if (!has(PLACE, a.item) || !canPlace(s, a.x, a.z)) return false;
    if (a.item === 'baustelle') {
      if (!PROJECTS[s.mayor.plan]) { out.msg = 'Sucht euch erst im Rathaus ein Projekt aus.'; return false; }
      if (!siteFree(s, a.x, a.z)) { out.msg = '🚩 Ein Inselprojekt braucht rundherum eine Kachel Platz.'; return false; }
    }
    if (PLACE[a.item].kind === 'project' && !siteFree(s, a.x, a.z)) { out.msg = '🏗️ Ein Inselprojekt braucht rundherum eine Kachel Platz.'; return false; }
    if (!takeInv(s, a.item, 1)) return false;
    const o = { k: a.item, r: [0, 1, 2, 3].includes(a.r) ? a.r : 0 };
    if (PLACE[a.item].kind === 'producer') o.t = 0;
    if (a.item === 'baustelle') { o.p = s.mayor.plan; o.paid = 0; s.mayor.plan = null; out.msg = `🚩 Bauplatz für ${PROJECTS[o.p].icon} ${PROJECTS[o.p].name} abgesteckt! Jetzt am Schild Taler spenden.`; }
    s.obj[key(a.x, a.z)] = o;
    fx(out, a.x, a.z, '', 'dust');
    out.snd = 'place';
    return true;
  },
  pickup(s, a, out) {
    const k = key(a.x, a.z), o = s.obj[k];
    if (!o || !PLACE[o.k] || o.k === 'nachbarhaus') return false;
    if (o.k === 'baustelle') {
      if (o.paid > 0) { s.money += o.paid; out.msg = `🚩 Baustelle abgebaut – ${o.paid} Taler Spenden zurück in die Inselkasse. Ihr könnt sie im Baumodus neu abstecken.`; }
      s.mayor.plan = o.p;
    } else if (PLACE[o.k].kind === 'project') out.msg = `🏗️ ${PLACE[o.k].name} abgebaut! Es liegt in deiner Tasche – im Baumodus kannst du es woanders neu aufstellen.`;
    delete s.obj[k];
    addInv(s, o.k, 1);
    fx(out, a.x, a.z, '', 'dust');
    out.snd = 'place';
    return true;
  },
  use(s, a, out) { // Obstbaum pflücken
    const o = s.obj[key(a.x, a.z)], p = o && PLACE[o.k];
    if (!p || p.kind !== 'producer') return false;
    if (o.t < p.every) { out.msg = `${p.name}: Das Obst ist noch nicht reif.`; return false; }
    o.t = 0;
    if (p.farm) { const n = Y.farmHarvest(s, o, p, out); questEvent(s, 'farm', n, out); addXp(s, 2 * n, out); fx(out, a.x, a.z, `+${n} ${ITEMS[p.item].icon}`, 'leaf'); out.snd = 'harvest'; return true; }
    addInv(s, p.item, p.n);
    s.stats.fruit = (s.stats.fruit || 0) + p.n;
    questEvent(s, 'fruit', p.n, out);
    addXp(s, ITEMS[p.item].xp * p.n, out);
    fx(out, a.x, a.z, `+${p.n} ${ITEMS[p.item].icon}`, 'leaf');
    out.snd = 'harvest';
    return true;
  },
  // Muscheln aufheben, Unkraut zupfen
  pick(s, a, out) {
    const k = key(a.x, a.z), g = s.ground?.[k];
    if (g) {
      delete s.ground[k];
      if (g.id === 'bottle') { if (!X.mapPiece(s, out)) learn(s, out); out.snd = 'level'; fx(out, a.x, a.z, '📜', 'sparkle'); return true; }
      if (g.id === 'diy') { learn(s, out); out.snd = 'level'; fx(out, a.x, a.z, '📜', 'sparkle'); return true; }
      if (g.id === 'money') { s.money += g.n; s.stats.earned += g.n; fx(out, a.x, a.z, `+${g.n} 🪙`, 'coin'); out.snd = 'coin'; return true; }
      if (!has(ITEMS, g.id)) return true;
      const n = g.n || 1;
      addInv(s, g.id, n);
      if (CROPS[g.id] === undefined && ITEMS[g.id].cat === 'fruit') { s.stats.fruit = (s.stats.fruit || 0) + n; questEvent(s, 'fruit', n, out); }
      fx(out, a.x, a.z, `+${n} ${ITEMS[g.id].icon}`, 'leaf');
      out.got = g.id;
      if (g.box) out.msg = `🎁 Im Geschenk: ${n > 1 ? n + '× ' : ''}${ITEMS[g.id].icon} ${ITEMS[g.id].name}!`;
      else if (ITEMS[g.id].furn || ITEMS[g.id].place) out.msg = `🍃 ${ITEMS[g.id].icon} ${ITEMS[g.id].name} gefunden!`;
      out.snd = 'harvest';
      return true;
    }
    if (s.shells[k]) {
      const id = s.shells[k];
      delete s.shells[k];
      addInv(s, id, 1);
      collect(s, id, out);
      s.stats.shells = (s.stats.shells || 0) + 1;
      questEvent(s, 'shell', 1, out);
      addXp(s, 1, out);
      fx(out, a.x, a.z, `+1 ${ITEMS[id].icon}`, 'sparkle');
      out.got = id;
      out.snd = 'harvest';
      return true;
    }
    if (s.eggs?.[k] !== undefined) {
      delete s.eggs[k];
      const f = s.fest?.k === 'eier' ? s.fest : null, n = f ? ++f.eggs : 0;
      addXp(s, 2, out);
      fx(out, a.x, a.z, '🥚', 'sparkle');
      out.snd = 'egg';
      if (f && n >= (f.total || EGGS) && !f.done) {
        f.done = 1;
        addInv(s, 'eiernest', 1); s.money += 1000; s.stats.earned += 1000;
        (s.diary ||= []).push({ day: s.day, icon: '🥚', text: 'Alle 10 Eier bei der Eiersuche gefunden!' });
        out.msg = '🎉 Alle 10 Eier gefunden! Dafür gibt es ein 🪺 Eiernest und 1.000 Taler!';
        out.snd = 'fanfare';
      } else out.msg = `🥚 Ei gefunden! (${n} von ${f?.total || EGGS})`;
      return true;
    }
    if (s.drift?.[k]) {
      delete s.drift[k];
      const extra = Math.random() < 0.25 ? pick(['bernstein', 'perle', 'sternsplitter'].filter(id => has(ITEMS, id))) : null;
      addInv(s, 'holz', 2);
      if (extra) addInv(s, extra, 1);
      fx(out, a.x, a.z, '+2 🪵', 'leaf');
      out.msg = extra ? `🪵 Treibholz – und darin verfangen: ${ITEMS[extra].icon} ${ITEMS[extra].name}!` : '🪵 Treibholz aufgesammelt!';
      out.snd = 'harvest';
      return true;
    }
    if (s.weeds[k]) {
      delete s.weeds[k];
      addInv(s, 'unkraut', 1);
      s.stats.weeds = (s.stats.weeds || 0) + 1;
      questEvent(s, 'weed', 1, out);
      addXp(s, 1, out);
      fx(out, a.x, a.z, '+1 🌿', 'leaf');
      out.snd = 'harvest';
      return true;
    }
    return false;
  },
  fish(s, a, out) {
    if (!isWater(a.x, a.z) && !isWater(a.x + 0.4, a.z) && !isWater(a.x - 0.4, a.z) && !isWater(a.x, a.z + 0.4) && !isWater(a.x, a.z - 0.4)) return false;
    const l = s.up.rod - 1, sea = seasonOf(s.day), where = waterKind(a.x, a.z);
    let pool = FISH.filter(f => (!f[5] || f[5].includes(sea)) && X.wxOk(s, f[8]) && (f[6] === where || (where === 'pond' && f[6] === 'river' && f[0] === 'barsch')));
    if (Number.isInteger(a.size)) { const sized = pool.filter(f => f[7] === a.size && (f[4][l] || 0) > 0); if (sized.length) pool = sized; } // Schattengröße verrät den Fisch
    const gold = s.inv.goldangel > 0 || (s.inv.regenwurm > 0 && takeInv(s, 'regenwurm', 1)); // Goldangel oder Regenwurm: seltene Fische beißen öfter
    const f = weighted(pool, f => (f[4][l] || 0) * (gold && f[3] >= 1000 ? 1.8 : 1) * (f[8] ? 2 : 1)), id = f[0];
    addInv(s, id, 1);
    collect(s, id, out);
    s.stats.fish++;
    questEvent(s, 'fish', 1, out);
    if (id === 'schatz') s.stats.treasure++;
    addXp(s, ITEMS[id].xp, out);
    fx(out, a.x, a.z, `+1 ${ITEMS[id].icon}`, 'water');
    out.caught = id;
    out.snd = 'harvest';
    contestCount(s, a.by, 'fish', out);
    return true;
  },
  bug(s, a, out) {
    const sea = seasonOf(s.day), h = hourOf(s), night = h >= 20 || h < 6;
    const garden = night ? [] : Z.gardenBugs(s, a.x, a.z); // am Schmetterlingshaus: seltene Falter bei ihren Lieblingsblumen
    const pool = [...BUGS.filter(b => b[5] !== 'tropic' && b[5] !== 'garden' && b[5] !== 'moor' && b[4].includes(sea) && X.wxOk(s, b[7], night) && (b[5] === 'any' || (b[5] === 'night') === night)), ...garden];
    if (!pool.length) { out.msg = 'Gerade sind keine Insekten unterwegs.'; return false; }
    const saph = s.inv.saphirkescher > 0; // Saphirkescher: seltene Krabbeltiere öfter
    const [id, , icon] = weighted(pool, b => b[6] * (saph && b[3] >= 1000 ? 1.8 : 1) * (b[7] ? 2 : 1) * (b[5] === 'garden' ? 3 : 1));
    addInv(s, id, 1);
    collect(s, id, out);
    s.stats.bugs = (s.stats.bugs || 0) + 1;
    questEvent(s, 'bug', 1, out);
    addXp(s, ITEMS[id].xp, out);
    fx(out, a.x, a.z, `+1 ${icon}`, 'sparkle');
    out.caught = id;
    out.snd = 'harvest';
    contestCount(s, a.by, 'bug', out);
    return true;
  },
  chop(s, a, out) {
    const k = key(a.x, a.z);
    if (!isTree(s, k)) return false;
    if (!(s.res[k] > 0)) { out.msg = 'Der Baum braucht eine Pause – morgen wieder!'; return false; }
    const crystal = s.inv.kristallaxt > 0; // Kristallaxt: oft doppelt, Baum wird seltener müde
    if (!crystal || Math.random() < 0.6) s.res[k]--;
    const n = Math.random() < (crystal ? 0.55 : 0.3) ? 2 : 1;
    drop(s, a.x, a.z, { id: 'holz', n }, out, Number.isFinite(a.px) ? [a.px, a.pz] : null);
    s.stats.wood = (s.stats.wood || 0) + n;
    questEvent(s, 'chop', n, out);
    addXp(s, 1, out);
    fx(out, a.x, a.z, `+${n} 🪵`, 'leaf');
    out.snd = 'chop';
    return true;
  },
  uproot(s, a, out) { // Baumschaufel: Baum mit Wurzelballen einpacken
    const k = key(a.x, a.z), kind = resAt(s, k);
    if ((kind !== 'tree' && kind !== 'palm') || !(s.inv.baumschaufel > 0)) return false;
    const id = SAPLING[fruitOf(s, k)] || (kind === 'palm' ? 'baum_palme' : 'baum_apfel');
    s.trees ||= { rm: {}, add: {} };
    if (s.trees.add[k]) delete s.trees.add[k];
    if (RES_SPOTS[k]) s.trees.rm[k] = 1;
    delete s.res[k]; delete s.shook[k]; if (s.fruit) delete s.fruit[k]; if (s.graft) delete s.graft[k];
    addInv(s, id, 1);
    s.stats.uprooted = (s.stats.uprooted || 0) + 1;
    out.msg = `🪏 ${ITEMS[id].name.replace(' (Ballen)', '')} eingepackt – in der Leiste wählen und woanders einpflanzen.`;
    out.got = id;
    fx(out, a.x, a.z, '', 'dust');
    out.snd = 'dig';
    return true;
  },
  replant(s, a, out) {
    const it = ITEMS[a.item];
    if (!it?.sapling || !(s.inv[a.item] > 0) || !treeSpotOk(s, a.x, a.z, it.palm)) return false;
    const k = key(a.x, a.z), kind = it.palm ? 'palm' : 'tree';
    takeInv(s, a.item, 1);
    s.trees ||= { rm: {}, add: {} };
    if (RES_SPOTS[k] === kind && TREE_FRUIT[k] === it.sapling && s.trees.rm[k]) delete s.trees.rm[k]; // zurück an den alten Platz
    else s.trees.add[k] = { kind, fruit: it.sapling };
    s.res[k] = 3;
    s.fruit ||= {};
    s.fruit[k] = s.day + 1; // muss erst anwachsen
    s.stats.replanted = (s.stats.replanted || 0) + 1;
    fx(out, a.x, a.z, '🌱', 'leaf');
    out.snd = 'place';
    return true;
  },
  mine(s, a, out) {
    const k = key(a.x, a.z);
    if (resAt(s, k) !== 'rock') return false;
    if (!(s.res[k] > 0)) { out.msg = 'Der Felsen ist für heute leer.'; return false; }
    s.res[k]--;
    questEvent(s, 'mine', 1, out);
    addXp(s, 1, out);
    out.snd = 'place';
    if (s.rock === k) { // Glücksfelsen: Taler statt Steine
      const m = [100, 250, 500][2 - s.res[k]] || 100;
      drop(s, a.x, a.z, { id: 'money', n: m }, out);
      fx(out, a.x, a.z, '', 'coin');
      out.snd = 'coin';
      return true;
    }
    const r = Math.random(), id = r < 0.15 ? 'eisen' : r < 0.4 ? 'lehm' : 'stein';
    drop(s, a.x, a.z, { id, n: 1 }, out); // Felsen spucken Material aus
    if (s.inv.rubinschaufel > 0 && Math.random() < 0.1) { const g = Math.random() < 0.6 ? 'amethyst' : Math.random() < 0.5 ? 'rubin' : 'saphir'; drop(s, a.x, a.z, { id: g, n: 1 }, out); out.msg = `💎 Die Rubinschaufel hat ${ITEMS[g].icon} ${ITEMS[g].name} freigelegt!`; }
    fx(out, a.x, a.z, '', 'dust');
    return true;
  },
  shake(s, a, out) {
    const k = key(a.x, a.z), me = Number.isFinite(a.px) && Number.isFinite(a.pz) ? [a.px, a.pz] : null;
    if (!isTree(s, k)) return false;
    questEvent(s, 'shake', 1, out);
    if (fruitReady(s, k)) { // Obst fällt herunter und liegt dann vor dem Baum
      const id = fruitOf(s, k), n = id === 'kokosnuss' ? 2 : 3;
      s.fruit[k] = s.day + FRUIT_REGROW;
      for (let i = 0; i < n; i++) drop(s, a.x, a.z, { id, n: 1 }, out, me);
      E6.graftShake(s, k, out, it => drop(s, a.x, a.z, it, out, me)); // veredelt: zweite Sorte
      fx(out, a.x, a.z, '', 'fruit');
      out.snd = 'harvest';
      return true;
    }
    if (s.shook[k]) { fx(out, a.x, a.z, '🍃', 'leaf'); out.snd = 'water'; return true; }
    s.shook[k] = 1;
    const r = Math.random();
    if (r < 0.06) { out.msg = '🐝 Autsch, ein Wespennest! Schnell weg hier!'; out.snd = 'fail'; fx(out, a.x, a.z, '🐝🐝🐝', 'leaf'); out.sting = true; return true; }
    if (r < 0.14) { drop(s, a.x, a.z, { id: 'money', n: 100 + rnd(5) * 100 }, out, me); out.snd = 'coin'; return true; }
    if (r < 0.19) {
      const list = Object.keys(FURNITURE).filter(id => (FURNITURE[id].lvl || 1) <= s.level && !FURNITURE[id].wall), id = pick(list);
      if (id) { drop(s, a.x, a.z, { id, n: 1 }, out, me); out.snd = 'love'; return true; }
    }
    if (r < 0.6) { drop(s, a.x, a.z, { id: 'ast', n: 1 }, out, me); out.snd = 'water'; return true; }
    fx(out, a.x, a.z, '🍃', 'leaf'); out.snd = 'water';
    return true;
  },
  dive(s, a, out) { // Tauchen an Luftblasen
    const i = s.dives.findIndex(d => d.id === a.id);
    if (i < 0) return false;
    const d = s.dives[i];
    s.dives.splice(i, 1);
    newDive(s);
    const pearl = Math.random() < 0.04, [id] = pearl ? ['perle'] : weighted(SEA, f => f[4]);
    addInv(s, id, 1);
    if (!pearl) collect(s, id, out);
    s.stats.dives = (s.stats.dives || 0) + 1;
    questEvent(s, 'dive', 1, out);
    addXp(s, ITEMS[id].xp || 2, out);
    out.fx.push({ x: d.x, z: d.z, txt: `+1 ${ITEMS[id].icon}`, k: 'splash' });
    out.caught = id;
    out.snd = 'harvest';
    return true;
  },
  dig(s, a, out) {
    const k = key(a.x, a.z), i = s.digs.indexOf(k), t = s.tiles[k];
    if (s.tmap?.spot === k) return X.digTreasure(s, a, out);
    if (i >= 0) {
      s.digs.splice(i, 1);
      const [id, , icon] = weighted(FOSSILS, f => f[4]);
      addInv(s, id, 1);
      collect(s, id, out);
      s.stats.dug = (s.stats.dug || 0) + 1;
      questEvent(s, 'dig', 1, out);
      addXp(s, ITEMS[id].xp, out);
      fx(out, a.x, a.z, `+1 ${icon}`, 'dirt');
      out.caught = id;
      out.snd = 'harvest';
      return true;
    }
    if (t) { // Pflanze ausgraben (Samen zurück, solange sie noch nicht blüht)
      if (t.c && stage(t.c) < 3) addInv(s, 's_' + t.c.k, 1);
      else if (t.c) addInv(s, t.c.k, 1);
      delete s.tiles[k];
      fx(out, a.x, a.z, '', 'dirt');
      out.snd = 'till';
      return true;
    }
    out.msg = 'Hier ist nichts vergraben. Such nach Stern-Rissen im Boden ✨';
    return false;
  },
  donate(s, a, out) {
    if (!MUSEUM_ALL.includes(a.id)) return false;
    if (s.museum[a.id]) { out.msg = 'Das haben wir schon im Museum!'; return false; }
    if (!takeInv(s, a.id, 1)) return false;
    s.museum[a.id] = s.day;
    const n = Object.keys(s.museum).length;
    questEvent(s, 'donate', 1, out);
    questEvent(s, 'museum', n, out);
    addXp(s, 8, out);
    out.msg = `🏛️ ${ITEMS[a.id].icon} ${ITEMS[a.id].name} wird jetzt im Museum ausgestellt! (${n}/${MUSEUM_ALL.length})`;
    out.snd = 'level';
    return true;
  },
  pave(s, a, out) {
    const k = key(a.x, a.z);
    if (a.k === null) { if (!s.paths[k]) return false; delete s.paths[k]; fx(out, a.x, a.z, '', 'dust'); out.snd = 'till'; return true; }
    if (!has(PAVE, a.k) || !pavable(s, a.x, a.z) || s.paths[k] === a.k) return false;
    s.paths[k] = a.k;
    if (s.weeds[k]) delete s.weeds[k];
    fx(out, a.x, a.z, '', 'dust');
    out.snd = 'place';
    return true;
  },
  pop(s, a, out) { // Geschenkballon mit der Schleuder getroffen: das Geschenk fällt herunter
    const b = s.balloon;
    if (!b || b.id !== a.id) return false;
    const p = balloonPos(b, s.time), x = Math.round(p.x), z = Math.round(p.z);
    s.balloon = null;
    s.stats.balloons = (s.stats.balloons || 0) + 1;
    questEvent(s, 'balloon', 1, out);
    addXp(s, 5, out);
    const kind = Math.random() < 0.18 ? 'diy' : weighted(BALLOON_GIFTS, g => g[1])[0];
    let item;
    if (kind === 'money') item = { id: 'money', n: 500 + rnd(16) * 100 };
    else if (kind === 'diy') item = { id: 'diy', n: 1 };
    else if (kind === 'furn' || kind === 'deco') {
      const list = kind === 'furn' ? Object.keys(FURNITURE).filter(id => (FURNITURE[id].lvl || 1) <= s.level + 2) : Object.keys(PLACE).filter(id => PLACE[id].kind === 'deco' && PLACE[id].buy);
      item = { id: pick(list), n: 1 };
    } else item = { id: kind, n: kind === 'holz' ? 5 : kind === 'eisen' ? 2 : 1 };
    item.box = true;
    out.fx.push({ x: p.x, z: p.z, txt: '🎁', k: 'coin', y: p.y });
    if (isWater(p.x, p.z) || !walkable(p.x, p.z)) { out.msg = '💦 Oh nein – das Geschenk ist ins Wasser gefallen!'; out.snd = 'splash'; return true; }
    drop(s, x, z, item, out, [x, z]);
    out.msg = '🎁 Getroffen! Das Geschenk ist heruntergefallen – heb es auf.';
    out.snd = 'level';
    return true;
  },
  wish(s, a, out) { // Wunsch an eine Sternschnuppe
    if (!s.starNight || 6 + s.dayTime * 18 < 19 || (s.wishes || 0) >= 20) return false;
    s.wishes = (s.wishes || 0) + 1;
    s.stats.wishes = (s.stats.wishes || 0) + 1;
    out.snd = 'love';
    return true;
  },
  buyTurnip(s, a, out) {
    if (!turnipSeller(s) || !Number.isInteger(a.n) || a.n < TURNIP_STACK || a.n % TURNIP_STACK || a.n > 1000 || !s.turnip) return false;
    const cost = s.turnip.buy * a.n;
    if (s.money < cost) { out.msg = 'Nicht genug Taler.'; return false; }
    s.money -= cost;
    s.stats.turnipSpent = (s.stats.turnipSpent || 0) + cost;
    addInv(s, 'ruebe', a.n);
    out.msg = `🍠 ${a.n} Rüben gekauft – verkauft sie diese Woche im Krämerladen, bevor sie faulen!`;
    out.snd = 'coin';
    return true;
  },
  craft(s, a, out) {
    if (!has(RECIPES, a.id)) return false;
    const r = RECIPES[a.id];
    if (r.st === 'craft' && !s.recipes?.[a.id] && !r.gem) { out.msg = 'Diesen Bauplan kennt ihr noch nicht.'; return false; }
    if (r.excl && !s.recipes?.[a.id]) { out.msg = 'Dieses Rezept gibt es nur als Preis beim Kochwettbewerb.'; return false; }
    if ((r.lvl || 1) > s.level) { out.msg = `Erst ab Level ${r.lvl}.`; return false; }
    if (Object.entries(r.in).some(([id, n]) => (s.inv[id] || 0) < n)) { out.msg = 'Dafür fehlen noch Zutaten.'; return false; }
    for (const [id, n] of Object.entries(r.in)) takeInv(s, id, n);
    addInv(s, r.out, r.n);
    if (r.st === 'cook') s.stats.cooked = (s.stats.cooked || 0) + 1; else s.stats.crafted = (s.stats.crafted || 0) + 1;
    questEvent(s, r.st === 'cook' ? 'cook' : 'craft', 1, out);
    if (ITEMS[r.out]?.jar) questEvent(s, 'jar', 1, out); // Einmachküche
    addXp(s, 3 + (ITEMS[r.out].xp || 2), out);
    out.msg = `${r.st === 'cook' ? '🍳' : '🔨'} ${r.n > 1 ? r.n + '× ' : ''}${ITEMS[r.out].name} fertig!`;
    out.snd = 'level';
    return true;
  },
  talk(s, a, out) {
    if (!has(NPC_DATA, a.id)) return false;
    const n = friend(s, a.id);
    if (n.talk !== s.day) {
      n.talk = s.day; n.f += 15; addXp(s, 1, out); questEvent(s, 'talk', 1, out);
      if (Math.random() < 0.2 && DIY_IDS.some(k => !s.recipes[k])) { learn(s, out); out.diyFrom = a.id; }
    }
    s.met[a.id] = 1;
    questEvent(s, 'met', Object.keys(s.met).length, out);
    const f = s.fest;
    if (f?.k === 'kuerbis' && f.day === s.day && !f.candy.includes(a.id)) {
      f.candy.push(a.id);
      addInv(s, 'bonbon', 2);
      out.msg = `🍬 ${NPC_DATA[a.id].name} schenkt euch 2 Bonbons! (${f.candy.length} von ${NPC_IDS.length} Nachbarn)`;
      out.snd = 'love';
      if (f.candy.length >= NPC_IDS.length && !f.done) {
        f.done = 1; addInv(s, 'kuerbislaterne', 1);
        (s.diary ||= []).push({ day: s.day, icon: '🎃', text: 'Beim Kürbisfest alle Nachbarn besucht' });
        out.msg = '🎃 Alle Nachbarn besucht! Als Dank gibt es eine leuchtende Kürbislaterne!';
        out.snd = 'fanfare';
      }
    }
    return true;
  },
  letter(s, a, out) { // Brief an jemanden, kommt am nächsten Morgen an
    const text = String(a.text || '').trim().slice(0, 400), to = String(a.to || '').trim().slice(0, 16), from = String(a.name || '').slice(0, 16) || 'Jemand';
    if (!text || !to) return false;
    if (a.item && (!has(ITEMS, a.item) || !(s.inv[a.item] > 0))) return false;
    if (a.item) takeInv(s, a.item, 1);
    s.mail.push({ kind: 'letter', from, to, text, item: a.item || null, n: 1, paper: [0, 1, 2, 3].includes(a.paper) ? a.paper : 0, day: s.day, arrive: s.day + 1 });
    (s.diary ||= []).push({ day: s.day, icon: '💌', text: `${from} hat ${to} einen Brief geschrieben` });
    out.msg = `💌 Brief an ${to} eingeworfen – er liegt morgen früh im Briefkasten!`;
    out.snd = 'love';
    return true;
  },
  riddle(s, a, out) { // Foto-Rätsel gelöst
    if ((s.riddles?.day === s.day ? s.riddles.n : 0) >= 5) { out.msg = '🧩 Gelöst! (Für heute gibt es keine Taler mehr dafür.)'; return true; }
    s.riddles = { day: s.day, n: (s.riddles?.day === s.day ? s.riddles.n : 0) + 1 };
    s.money += 300; s.stats.earned += 300;
    (s.diary ||= []).push({ day: s.day, icon: '🧩', text: `${String(a.name || '').slice(0, 16)} hat ${String(a.from || 'ein').slice(0, 16)}s Foto-Rätsel gelöst` });
    out.msg = '🧩 Ort gefunden! +300 Taler';
    out.snd = 'found';
    return true;
  },
  diary(s, a, out) { // eigener Tagebuch-Eintrag
    const text = String(a.text || '').trim().slice(0, 120);
    if (!text) return false;
    (s.diary ||= []).push({ day: s.day, icon: '✍️', text: `${String(a.name || '').slice(0, 16)}: ${text}` });
    out.msg = '📔 Ins Tagebuch geschrieben!';
    out.snd = 'plopp';
    return true;
  },
  contest(s, a, out) { // beim Turnierstand anmelden
    const c = s.contest;
    if (!c || !contestOpen(s) || typeof a.by !== 'string') { out.msg = 'Das Turnier ist gerade nicht geöffnet (9–18 Uhr).'; return false; }
    if (c.runs[a.by]) return false;
    c.runs[a.by] = { until: s.time + CONTEST_SECS, n: 0, name: String(a.name || '').slice(0, 16) || 'Jemand' };
    out.msg = `${c.k === 'fish' ? '🎣' : '🦋'} Los geht's! 3 Minuten – fangt so viele ${c.k === 'fish' ? 'Fische' : 'Insekten'} wie möglich!`;
    out.snd = 'whistle';
    return true;
  },
  gift(s, a, out) {
    if (!has(NPC_DATA, a.id) || !has(ITEMS, a.item) || ITEMS[a.item].seed) return false;
    const n = friend(s, a.id), d = NPC_DATA[a.id];
    if (n.gift === s.day) { out.msg = `${d.name} hat heute schon ein Geschenk bekommen.`; return false; }
    if (!takeInv(s, a.item, 1)) return false;
    const r = d.loves.includes(a.item) ? 'love' : d.likes.includes(a.item) ? 'like' : d.dislikes.includes(a.item) ? 'dislike' : 'neutral';
    n.gift = s.day;
    const bday = birthdayOf(s.day) === a.id;
    n.f = Math.max(0, n.f + { love: 80, like: 40, neutral: 20, dislike: -10 }[r] * (bday && r !== 'dislike' ? 2 : 1));
    if (bday) { n.bday = s.day; out.bday = 1; (s.diary ||= []).push({ day: s.day, icon: '🎂', text: `${d.name} zum Geburtstag beschenkt` }); }
    questEvent(s, 'gift', 1, out);
    if (r === 'love') questEvent(s, 'gift_love', 1, out);
    addXp(s, 3, out);
    out.reaction = r;
    out.snd = r === 'dislike' ? 'fail' : 'love';
    return true;
  },

  hplace(s, a, out) {
    if (!has(FURNITURE, a.item) || !(s.inv[a.item] > 0)) return false;
    const R = actRoom(s, a, out);
    if (!R) return false;
    const f = FURNITURE[a.item], r = f.wall ? wallRot(s, a.x, a.z, R) : [0, 1, 2, 3].includes(a.r) ? a.r : 0;
    if (!canFurnish(s, a.item, a.x, a.z, r, R)) { out.msg = 'Hier ist kein Platz.'; return false; }
    if (layer(s, f, R)[key(a.x, a.z)]) return false;
    takeInv(s, a.item, 1);
    layer(s, f, R)[key(a.x, a.z)] = { k: a.item, r };
    const T = s.lifted?.[s._who || 'host']; // gerade aufgehobenes Möbelstück behält beim Umstellen seine Farbe
    if (T?.k === a.item && T.day === s.day) { if (T.c) layer(s, f, R)[key(a.x, a.z)].c = T.c; delete s.lifted[s._who || 'host']; }
    questEvent(s, 'furnish', 1, out);
    out.snd = 'place';
    return true;
  },
  hpick(s, a, out) {
    const R = actRoom(s, a, out);
    if (!R) return false;
    const h = homeAt(s, a.x, a.z, false, R) || homeAt(s, a.x, a.z, 'walls', R) || homeAt(s, a.x, a.z, true, R);
    if (!h) return false;
    if (R.id && h.key === '-2,-1' && h.o.k === 'einzelbett' && !h.o.by) { out.msg = 'Das ist das Bett von ' + NPC_DATA[R.id].name + ' – das bleibt hier.'; return false; }
    delete layer(s, FURNITURE[h.o.k], R)[h.key];
    if (h.o.a) E6.tankEmpty(s, h.o); // Aquarium/Terrarium: Bewohner zurück in die Tasche
    (s.lifted ||= {})[s._who || 'host'] = { k: h.o.k, c: h.o.c || 0, day: s.day }; // Farbe merken, falls es gleich woanders hinkommt
    out.lifted = h.o.k;
    addInv(s, h.o.k, 1);
    out.snd = 'place';
    return true;
  },
  // Insel-Erweiterung im Rathaus freischalten (Taler aus der Inselkasse, Material aus der eigenen Tasche)
  // Haus samt Briefkasten umziehen (Taler aus der Inselkasse)
  movehouse(s, a, out) {
    if (!Number.isInteger(a.x) || !Number.isInteger(a.z)) return false;
    const f = houseFit(s, a.x, a.z);
    if (!f.ok) { out.msg = f.why; return false; }
    if (s.money < HOUSE_MOVE_PRICE) { out.msg = `🏠 Ein Umzug kostet ${fmt(HOUSE_MOVE_PRICE)} Taler aus der Inselkasse.`; return false; }
    s.money -= HOUSE_MOVE_PRICE;
    s.housePos = f.dx || f.dz ? { dx: f.dx, dz: f.dz } : null;
    applyHouse(s);
    (s.diary ||= []).push({ day: s.day, icon: '🏠', text: 'Unser Haus ist umgezogen!' });
    out.msg = '🏠 Umgezogen! Euer Haus steht jetzt am neuen Platz – drinnen bleibt alles, wie es war.';
    out.fx.push({ x: BUILDINGS.house.cx, z: BUILDINGS.house.cz, txt: '🏠✨', k: 'dust' });
    out.snd = 'level';
    return true;
  },
  expand(s, a, out) {
    const A = AREAS[a.id];
    if (!A || !has(AREAS, a.id) || s.areas[a.id]) return false;
    if (s.level < A.lvl) { out.msg = `Erst ab Insel-Level ${A.lvl}.`; return false; }
    if (s.money < A.cost) { out.msg = 'Nicht genug Taler in der Inselkasse.'; return false; }
    if (Object.entries(A.mats).some(([id, n]) => (s.inv[id] || 0) < n)) { out.msg = 'Dafür fehlt noch Material in deiner Tasche.'; return false; }
    for (const [id, n] of Object.entries(A.mats)) takeInv(s, id, n);
    s.money -= A.cost;
    s.areas[a.id] = { open: s.day };
    out.msg = `${A.icon} ${A.name} ist offen! Eingang auf der Insel: ${A.gateName} (siehe Karte).`;
    out.snd = 'level';
    questEvent(s, 'expand', 1, out);
    if (AREA_IDS.every(id => s.areas[id])) questEvent(s, 'expand_all', 1, out);
    addXp(s, 40, out);
    return true;
  },
  // In einem Gebiet: Kiefer hacken/schütteln, Pilze & Beeren pflücken, Honig ernten, Blumensamen sammeln, Erz hauen
  aact(s, a, out) {
    const A = AREAS[a.area], n = A && has(AREAS, a.area) && NODES[a.area][a.i];
    if (!n || !s.areas[a.area]) return false;
    const k = a.area + ':' + n.i, st = s.anode[k]?.d === s.day ? s.anode[k] : (s.anode[k] = { d: s.day, u: 0 });
    const today = nodeToday(a.area, n, s.day), got = (id, c = 1) => { addInv(s, id, c); fx(out, A.x + n.x, A.z + n.z, `+${c} ${ITEMS[id].icon}`, 'leaf'); };
    if (!today) return false;
    const use = a.how;
    if (n.kind === 'pine') {
      if (use === 'chop') {
        if (st.u >= nodeUses(n)) { out.msg = '🌲 Für heute ist hier genug gehackt.'; return false; }
        st.u++;
        got(Math.random() < 0.25 ? 'harz' : 'holz');
        s.stats.wood = (s.stats.wood || 0) + 1;
        questEvent(s, 'chop', 1, out);
        out.snd = 'chop';
      } else {
        if (st.shook) { out.msg = '🌲 Heute fällt nichts mehr herunter.'; return false; }
        st.shook = 1;
        got('kiefernzapfen', 1 + Math.floor(Math.random() * 2));
        questEvent(s, 'forage', 1, out);
        if (Math.random() < 0.15) { learnOrMoney(s, out); }
        out.snd = 'shake';
      }
    } else if (n.kind === 'ore') {
      if (use !== 'mine') { out.msg = '🪨 Mit der Schaufel draufhauen!'; return false; }
      if (st.u >= nodeUses(n)) { out.msg = '💎 Diese Ader ist für heute leer.'; return false; }
      st.u++;
      const [id] = weighted(GEMS, g => g[1]);
      got(id);
      if (['amethyst', 'rubin', 'saphir', 'opal', 'kristall'].includes(id)) { collect(s, id, out); questEvent(s, 'gem', 1, out); }
      s.stats.ore = (s.stats.ore || 0) + 1;
      questEvent(s, 'ore', 1, out);
      out.snd = 'mine';
    } else {
      if (st.u >= 1) { out.msg = 'Hier ist heute schon geerntet.'; return false; }
      st.u = 1;
      if (n.kind === 'mush') { got(today); collect(s, today, out); s.stats.mush = (s.stats.mush || 0) + 1; questEvent(s, 'mush', 1, out); questEvent(s, 'forage', 1, out); }
      else if (n.kind === 'berry') { const c = 2 + Math.floor(Math.random() * 3); got(today, c); s.stats.berry = (s.stats.berry || 0) + c; questEvent(s, 'berry', c, out); questEvent(s, 'forage', 1, out); }
      else if (n.kind === 'hive') { got('honig', 1 + (Math.random() < 0.3 ? 1 : 0)); s.stats.honey = (s.stats.honey || 0) + 1; questEvent(s, 'honey', 1, out); }
      else if (n.kind === 'bloom') { got('s_' + today, 1); got(today, 1); questEvent(s, 'forage', 1, out); }
      out.snd = 'harvest';
    }
    addXp(s, 2, out);
    return true;
  },
  // Etwas aus der eigenen Tasche einem anderen Spieler geben (a.to = sein Schlüssel, vom Gastgeber eingesetzt)
  give(s, a, out) {
    const n = Math.floor(a.n);
    if (!has(ITEMS, a.item) || !(n >= 1 && n <= 999) || typeof a.to !== 'string' || !PKEY.test(a.to) || a.to === s._who) return false;
    if (!takeInv(s, a.item, n)) { out.msg = 'So viele hast du nicht.'; return false; }
    const inv = (s.pinv[a.to] ||= {});
    inv[a.item] = (inv[a.item] || 0) + n;
    out.msg = `🎁 ${n}× ${ITEMS[a.item].icon} ${ITEMS[a.item].name} verschenkt!`;
    out.gave = { item: a.item, n, to: a.to };
    out.snd = 'love';
    return true;
  },
  // Lagerkiste im Haus: Platz = 40 Sorten je aufgestellter Kiste
  stash(s, a, out) {
    const n = Math.floor(a.n), cap = boxCap(s);
    if (!has(ITEMS, a.item) || !(n >= 1 && n <= 9999)) return false;
    if (!cap) { out.msg = 'Stellt erst eine Kiste ins Haus.'; return false; }
    if (!s.box[a.item] && Object.keys(s.box).length >= cap) { out.msg = `Die Kiste ist voll (${cap} Sorten). Noch eine Kiste aufstellen!`; return false; }
    if (!takeInv(s, a.item, n)) return false;
    s.box[a.item] = (s.box[a.item] || 0) + n;
    out.snd = 'place';
    return true;
  },
  unstash(s, a, out) {
    const n = Math.floor(a.n);
    if (!has(ITEMS, a.item) || !(n >= 1 && n <= 9999) || !((s.box[a.item] || 0) >= n)) return false;
    s.box[a.item] -= n;
    if (!s.box[a.item]) delete s.box[a.item];
    addInv(s, a.item, n);
    out.snd = 'place';
    return true;
  },
  hstyle(s, a, out) {
    const list = a.kind === 'wall' ? WALLS : a.kind === 'floor' ? FLOORS : null;
    if (!list?.some(w => w[0] === a.id)) return false;
    if (s.home[a.kind] === a.id) return false;
    if (s.money < STYLE_PRICE) { out.msg = 'Nicht genug Taler.'; return false; }
    s.money -= STYLE_PRICE;
    s.home[a.kind] = a.id;
    out.msg = a.kind === 'wall' ? '🖌️ Neue Tapete!' : '🪵 Neuer Boden!';
    out.snd = 'coin';
    return true;
  },
  claim(s, a, out) {
    let money = 0, items = {}, title;
    if (a.q === 'story') {
      const q = STORY[s.quest.i];
      if (!q || !s.quest.done) return false;
      money = q.money || 0; items = q.items || {}; title = q.title;
      s.quest = { i: s.quest.i + 1, p: 0 };
      const nx = STORY[s.quest.i]; // manche Ziele sind schon erfüllt
      if (nx?.ev === 'level') questEvent(s, 'level', s.level);
      if (nx?.ev === 'met') questEvent(s, 'met', Object.keys(s.met).length);
    } else {
      const d = s.daily[a.q];
      if (!d || !d.done || d.claimed) return false;
      d.claimed = true;
      money = DAILY[d.i][3]; title = DAILY[d.i][0];
      addXp(s, 10, out);
    }
    s.money += money;
    for (const [id, n] of Object.entries(items)) if (ITEMS[id]) addInv(s, id, n);
    out.msg = `🎁 ${title}: ${[money ? money + ' Taler' : '', ...Object.entries(items).map(([id, n]) => `${n}× ${ITEMS[id]?.icon || ''} ${ITEMS[id]?.name || id}`)].filter(Boolean).join(', ')}`;
    out.snd = 'level';
    return true;
  },
  mail(s, a, out) {
    const m = s.mail[a.i];
    if (!m || (a.from !== undefined && (a.from !== m.from || a.hearts !== m.hearts))) return false;
    s.mail.splice(a.i, 1);
    if (m.item && has(ITEMS, m.item)) { addInv(s, m.item, m.n || 1); out.msg = `🎁 ${m.n || 1}× ${ITEMS[m.item].name} erhalten!`; out.snd = 'love'; }
    return true;
  },
  buy(s, a, out) {
    if (!has(ITEMS, a.id) || !ITEMS[a.id].buy || !isCount(a.n)) return false;
    const it = ITEMS[a.id], cost = buyPrice(s, it.buy) * a.n;
    if ((it.lvl || 1) > s.level) { out.msg = `Erst ab Level ${it.lvl}.`; return false; }
    if (s.money < cost) { out.msg = 'Nicht genug Taler.'; return false; }
    s.money -= cost;
    addInv(s, a.id, a.n);
    out.snd = 'coin';
    return true;
  },
  sell(s, a, out) {
    if (!has(ITEMS, a.id) || !(price(s, a.id) > 0) || !isCount(a.n) || !takeInv(s, a.id, a.n)) return false;
    const m = price(s, a.id) * a.n;
    if (ITEMS[a.id].turnip) s.stats.turnipProfit = (s.stats.turnipProfit || 0) + m - (s.turnip?.buy || 0) * a.n;
    s.money += m;
    s.stats.earned += m;
    out.msg = `+${m} Taler`;
    questEvent(s, 'sell', m, out);
    out.snd = 'coin';
    return true;
  },
  sellAll(s, a, out) {
    let m = 0;
    for (const [id, n] of Object.entries(s.inv)) {
      if (!ITEMS[id]?.sell || ITEMS[id].turnip || !n) continue;
      m += price(s, id) * n;
      delete s.inv[id];
    }
    if (!m) return false;
    s.money += m;
    s.stats.earned += m;
    out.msg = `Alles verkauft: +${m} Taler`;
    questEvent(s, 'sell', m, out);
    out.snd = 'coin';
    return true;
  },
  upgrade(s, a, out) {
    if (!has(UPGRADES, a.id)) return false;
    const u = upgradeInfo(s, a.id);
    if (u.done || (a.lvl !== undefined && a.lvl !== u.level)) return false;
    if (u.req > s.level) { out.msg = `Erst ab Level ${u.req}.`; return false; }
    if (UPGRADES[a.id].loan) { // Haus: wird sofort ausgebaut, der Preis kommt auf den Kredit
      if (s.loan > 0) { out.msg = `Erst den Hauskredit abbezahlen (noch ${fmt(s.loan)} Taler).`; return false; }
      s.loan = u.cost;
    } else {
      if (s.money < u.cost) { out.msg = 'Nicht genug Taler.'; return false; }
      s.money -= u.cost;
    }
    s.up[a.id]++;
    if (a.id === 'house') for (const [k, o] of Object.entries(s.home.walls)) {
      const [x, z] = k.split(',').map(Number);
      if (wallRot(s, x, z) !== o.r) { delete s.home.walls[k]; addInv(s, o.k, 1); }
    }
    addXp(s, 10, out);
    out.msg = `${UPGRADES[a.id].icon} ${UPGRADES[a.id].name}: ${UPGRADES[a.id].desc(s.up[a.id])}`;
    out.snd = 'level';
    return true;
  },
  order(s, a, out) {
    const o = s.orders[a.i];
    if (!o || (a.item !== undefined && (a.item !== o.item || a.n !== o.n))) return false;
    if (!takeInv(s, o.item, o.n)) { out.msg = 'Dafür fehlt noch etwas.'; return false; }
    s.money += o.reward;
    s.stats.earned += o.reward;
    s.stats.orders++;
    questEvent(s, 'order', 1, out);
    if (NPC_DATA[o.npc]) friend(s, o.npc).f += 40;
    addXp(s, o.xp, out);
    s.orders.splice(a.i, 1);
    fillOrders(s);
    out.msg = `Auftrag erledigt! +${o.reward} Taler`;
    out.snd = 'level';
    return true;
  },
};

// ---------- Bürgermeister-Update: Rathaus, Bummelgasse, Tropeninsel ----------
// Inselprojekte brauchen rundherum eine freie Kachel
export function siteFree(s, x, z) {
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
    const k = key(x + i, z + j);
    if (!(i === 0 && j === 0) && (!walkable(x + i, z + j) || buildingAt(x + i, z + j) || resAt(s, k) || (s.obj[k] && PLACE[s.obj[k].k]?.solid))) return false;
  }
  return true;
}
export const siteOf = s => Object.entries(s.obj).find(([, o]) => o.k === 'baustelle');
const ownsHat = (s, id) => !!s.wardrobe?.[id];
Object.assign(ACTIONS, {
  plan(s, a, out) { // Projekt im Rathaus aussuchen -> Bauplatz-Pflock
    const P = PROJECTS[a.id];
    if (!has(PROJECTS, a.id)) return false;
    if (P.lvl > s.level) { out.msg = `Erst ab Insel-Level ${P.lvl}.`; return false; }
    if (s.mayor.plan || siteOf(s) || s.inv.baustelle) { out.msg = 'Es läuft schon ein Projekt – erst fertig bauen!'; return false; }
    s.mayor.plan = a.id;
    addInv(s, 'baustelle', 1);
    out.msg = `🚩 ${P.icon} ${P.name} geplant! Nehmt den Bauplatz-Pflock aus der Leiste und steckt ihn auf freien Rasen.`;
    out.snd = 'level';
    return true;
  },
  unplan(s, a, out) {
    if (!s.mayor.plan || !takeInv(s, 'baustelle', 1)) return false;
    s.mayor.plan = null;
    out.msg = 'Projekt abgesagt.';
    return true;
  },
  fund(s, a, out) { // Spenden an der Baustelle
    const o = s.obj[key(a.x, a.z)], P = o && PROJECTS[o.p];
    const want = a.n === 'rest' ? Infinity : Number.isInteger(a.n) && a.n > 0 ? a.n : 0;
    if (!o || o.k !== 'baustelle' || !P || !want) return false;
    const left = P.cost - (o.paid || 0), n = Math.min(left, want, s.money);
    if (left <= 0) { out.msg = 'Schon komplett bezahlt – morgen früh steht es!'; return false; }
    if (n <= 0) { out.msg = 'Nicht genug Taler.'; return false; }
    s.money -= n;
    o.paid = (o.paid || 0) + n;
    s.stats.donated = (s.stats.donated || 0) + n;
    fx(out, a.x, a.z, `-${fmt(n)} 🪙`, 'coin');
    out.msg = o.paid >= P.cost ? `🎉 ${P.icon} ${P.name} ist bezahlt! Morgen früh wird es eingeweiht.` : `💰 Danke! Noch ${fmt(P.cost - o.paid)} Taler.`;
    out.snd = o.paid >= P.cost ? 'level' : 'coin';
    return true;
  },
  ordinance(s, a, out) {
    if (!has(ORDS, a.id) || ord(s) === a.id) return false;
    const cost = s.mayor.free ? 0 : ORD_PRICE;
    if (s.money < cost) { out.msg = `Eine neue Verordnung kostet ${fmt(ORD_PRICE)} Taler.`; return false; }
    s.money -= cost;
    s.mayor.free = 0;
    s.mayor.ord = a.id;
    out.msg = `${ORDS[a.id].icon} Neue Verordnung: ${ORDS[a.id].name}!`;
    out.snd = 'level';
    return true;
  },
  repay(s, a, out) {
    if (!(s.loan > 0)) return false;
    const n = Math.min(s.loan, s.money, a.n === 'all' ? Infinity : Number.isInteger(a.n) && a.n > 0 ? a.n : 0);
    if (n <= 0) { out.msg = 'Nicht genug Taler.'; return false; }
    s.money -= n;
    s.loan -= n;
    s.stats.repaid = (s.stats.repaid || 0) + n;
    out.msg = s.loan ? `🏡 ${fmt(n)} Taler abbezahlt, noch ${fmt(s.loan)}.` : '🎉 Der Hauskredit ist abbezahlt! Jetzt geht der nächste Ausbau.';
    out.snd = s.loan ? 'coin' : 'level';
    return true;
  },
  wear(s, a, out) { // Schneiderei / Tauschhütte: besondere Hüte freischalten
    const W = WARDROBE[a.id];
    if (!W || W.knit || ownsHat(s, a.id)) return false;
    if (W.medals) {
      if ((s.medals || 0) < W.medals) { out.msg = 'Nicht genug Medaillen.'; return false; }
      s.medals -= W.medals;
    } else {
      const c = buyPrice(s, W.price);
      if (s.money < c) { out.msg = 'Nicht genug Taler.'; return false; }
      s.money -= c;
    }
    s.wardrobe[a.id] = s.day;
    out.msg = `${W.icon} ${W.name} gekauft! Unter ⚙️ → Aussehen ändern → Extras könnt ihr ihn jetzt tragen.`;
    out.snd = 'love';
    return true;
  },
  song(s, a, out) { // Samstagskonzert im Club: ein Lied wünschen
    if (!concertNow(s)) { out.msg = 'Livemusik gibt es nur samstags ab 20 Uhr.'; return false; }
    if (s.concert === s.day) { out.msg = 'Heute habt ihr schon ein Lied bekommen – nächsten Samstag wieder!'; return false; }
    const left = SONGS.filter(([id]) => !s.songs[id]), [id, name] = left.length ? pick(left) : pick(SONGS);
    s.concert = s.day;
    s.songs[id] = s.day;
    addXp(s, 15, out);
    out.msg = `🎸 Lotte spielt „${name}“ für euch – das Lied ist jetzt in eurem Liederbuch!`;
    out.song = id;
    out.snd = 'love';
    return true;
  },
  boat(s, a, out) { // Bootsfahrt zur Tropeninsel
    if (s.money < BOAT_PRICE) { out.msg = `Die Überfahrt kostet ${fmt(BOAT_PRICE)} Taler.`; return false; }
    s.money -= BOAT_PRICE;
    s.stats.trips = (s.stats.trips || 0) + 1;
    out.snd = 'splash';
    return true;
  },
  tour(s, a, out) { // Tour starten
    if (!has(TOURS, a.k)) return false;
    if (s.tour) { out.msg = 'Es läuft schon eine Tour!'; return false; }
    const T = TOURS[a.k];
    s.tour = { k: a.k, end: s.time + T.time, targets: tourTargets(a.k) };
    out.msg = `${T.icon} ${T.name} – los geht's! ${T.desc}`;
    out.snd = 'level';
    return true;
  },
  hit(s, a, out) { // Tour-Ziel eingesammelt
    const T = s.tour && TOURS[s.tour.k], g = s.tour?.targets[a.i];
    if (!T || !g || g.got || !Number.isInteger(a.i)) return false;
    if (T.kind !== a.kind) return false;
    g.got = 1;
    const left = s.tour.targets.filter(t => !t.got).length;
    fx(out, TROPIC.x + g.x, TROPIC.z + g.z, T.icon, 'sparkle');
    out.snd = 'harvest';
    if (!left) {
      s.medals = (s.medals || 0) + T.medals;
      s.stats.tours = (s.stats.tours || 0) + 1;
      s.tourEnd = { k: s.tour.k, ok: true, t: s.time };
      s.tour = null;
      addXp(s, 20, out);
      out.msg = `🏅 Geschafft! ${T.medals} Medaillen für euch.`;
      out.snd = 'level';
    }
    return true;
  },
  tpick(s, a, out) { // Tropenfrüchte pflücken
    const t = TROPIC_TREES[a.i];
    if (!t || !Number.isInteger(a.i)) return false;
    if (s.tropic.picked[a.i] === s.day) { out.msg = 'Hier wächst morgen wieder Obst.'; return false; }
    s.tropic.picked[a.i] = s.day;
    addInv(s, t[2], 3);
    s.stats.fruit = (s.stats.fruit || 0) + 3;
    questEvent(s, 'fruit', 3, out);
    addXp(s, 6, out);
    fx(out, TROPIC.x + t[0], TROPIC.z + t[1], `+3 ${ITEMS[t[2]].icon}`, 'leaf');
    out.snd = 'harvest';
    return true;
  },
  tbug(s, a, out) { // Kescher auf der Tropeninsel
    const pool = BUGS.filter(b => b[5] === 'tropic'), [id, , icon] = weighted(pool, b => b[6]);
    addInv(s, id, 1);
    collect(s, id, out);
    s.stats.bugs = (s.stats.bugs || 0) + 1;
    questEvent(s, 'bug', 1, out);
    addXp(s, ITEMS[id].xp, out);
    out.caught = id;
    out.msg = `${icon} ${ITEMS[id].name} gefangen!`;
    out.snd = 'harvest';
    return true;
  },
  mbuy(s, a, out) { // Tauschhütte: für Medaillen
    if (!MEDAL_SHOP.includes(a.id)) return false;
    const c = PLACE[a.id].medals;
    if ((s.medals || 0) < c) { out.msg = 'Nicht genug Medaillen.'; return false; }
    s.medals -= c;
    addInv(s, a.id, 1);
    out.msg = `🏅 ${ITEMS[a.id].icon} ${ITEMS[a.id].name} getauscht!`;
    out.snd = 'coin';
    return true;
  },
});

// Führt eine Spieler-Aktion aus. Eingaben kommen evtl. übers Netz, darum wird alles geprüft.
let xMerged = false;
export function act(s, a, who) {
  const out = { ok: false, fx: [], snd: null, msg: null };
  if (!xMerged) { Object.assign(ACTIONS, X.X_ACTIONS, Y.Y_ACTIONS, Z.Z_ACTIONS, W4.W_ACTIONS, V.V_ACTIONS, E6.E6_ACTIONS, E7.E7_ACTIONS); xMerged = true; } // Erweiterungen (extras.js) erst hier: Modul-Kreis
  if (!a || typeof a !== 'object' || !has(ACTIONS, a.t)) return out;
  if (who !== undefined && PKEY.test(who)) { // für die Dauer der Aktion: Tasche dieses Spielers
    const before = s._who;
    bindInv(s, who);
    try { return act(s, a); } finally { s._who = before; }
  }
  const needsTile = ['water', 'plant', 'harvest', 'place', 'pickup', 'use', 'pick', 'chop', 'uproot', 'replant', 'mine', 'shake', 'dig', 'bug', 'fish', 'hplace', 'hpick', 'pave', 'fund'].includes(a.t);
  if (needsTile && !(isInt(a.x) && isInt(a.z))) return out;
  if (a.t === 'water' && !isDir(a.dx, a.dz)) return out;
  if ((a.t === 'order' || a.t === 'mail') && !Number.isInteger(a.i)) return out;
  if (a.t === 'claim' && a.q !== 'story' && ![0, 1, 2].includes(a.q)) return out;
  out.ok = ACTIONS[a.t](s, a, out);
  if (out.ok) { checkAchievements(s, out); X.afterAct(s, a, out); }
  return out;
}

// Neu erreichte Erfolge eintragen und belohnen
export function checkAchievements(s, out) {
  for (const a of ACHIEVEMENTS) {
    if (s.ach[a.id] || !a.test(s)) continue;
    s.ach[a.id] = s.day;
    s.money += a.reward;
    (out.ach ||= []).push(a.id);
  }
}

// ---------- Was passiert, wenn ich jetzt die Aktionstaste drücke? (läuft lokal beim Spieler) ----------

export function facing(ry) {
  const fx = Math.sin(ry), fz = Math.cos(ry);
  return Math.abs(fx) > Math.abs(fz) ? [Math.sign(fx), 0] : [0, Math.sign(fz)];
}

// at = angetippter Punkt {x, z}; ohne at zählt das Feld vor der Figur.
function resolveHome(s, me, sel, at) {
  const R = roomOf(s, roomIdAt(me.z));
  const lx = (at ? at.x : me.x + Math.sin(me.ry) * 0.9) - HOME_X, lz = (at ? at.z : me.z + Math.cos(me.ry) * 0.9) - R.z0;
  const x = Math.round(lx), z = Math.round(lz), [, d] = R.size, W = ([i, j]) => [i + HOME_X, j + R.z0], one = [W([x, z])];
  if (lz > (d - 1) / 2 + 0.3 && Math.abs(lx) < 0.8) return { exit: true, room: R.id, label: '🚪 Hinausgehen', tiles: [], px: lx + HOME_X, pz: lz + R.z0 };
  const h = homeAt(s, x, z, false, R) || (sel === 'hand' && homeAt(s, x, z, 'walls', R)), base = { px: lx + HOME_X, pz: lz + R.z0 };
  if (h) {
    const f = FURNITURE[h.o.k], tiles = footprint(h.o.k, h.x, h.z, h.o.r).map(W);
    const cx = h.x + ((h.o.r % 2 ? f.d : f.w) - 1) / 2 + HOME_X, cz = h.z + ((h.o.r % 2 ? f.w : f.d) - 1) / 2 + R.z0;
    if (R.id && !R.x) return f.sit ? { ...base, sit: { x: cx, z: cz, r: h.o.r }, label: '🪑 Hinsetzen', tiles } : { ...base, label: `${f.icon} ${f.name}`, tiles };
    if (f.sit) return { ...base, sit: { x: cx, z: cz, r: h.o.r }, label: '🪑 Hinsetzen', tiles };
    if (f.bed) return { ...base, sleep: { x: cx, z: cz, r: h.o.r, wide: f.w > 1 }, label: '😴 Schlafen gehen', tiles };
    if (h.o.k === 'herd') return { ...base, ui: 'cook', label: '🍳 Kochen', tiles };
    if (f.store) return { ...base, ui: 'chest', label: '🧰 Kiste öffnen', tiles };
    if (f.pattern) return { ...base, a: { t: 'hpat', x: h.x, z: h.z }, label: '🎨 Anderes Muster zeigen', tiles };
    if (h.o.k === 'klavier') return { ...base, ui: 'piano', label: '🎹 Klavier spielen', tiles };
    if (h.o.k === 'spieltisch') return { ...base, ui: 'games', label: '🎲 Spieleabend', tiles };
    if (E6.FURN_UI6[h.o.k]) return { ...base, ui: E6.FURN_UI6[h.o.k][0], uid: { x: h.x, z: h.z, room: R.id || null }, label: E6.FURN_UI6[h.o.k][1], tiles };
    if (V.FURN_GO5[h.o.k] && !R.id) return { ...base, go: V.FURN_GO5[h.o.k][0], label: V.FURN_GO5[h.o.k][1], tiles };
    if (W4.FURN_UI[h.o.k]) return { ...base, ui: W4.FURN_UI[h.o.k][0], label: W4.FURN_UI[h.o.k][1], tiles };
    return { ...base, label: `${f.icon} ${f.name}`, tiles };
  }
  if (ITEMS[sel]?.furn) return { ...base, label: '🔨 Einrichten geht im Baumodus', tiles: one };
  if (PLACE[sel] || ITEMS[sel]?.seed) return { ...base, label: 'Das gehört nach draußen', tiles: one };
  return { ...base, label: '', tiles: one };
}


// ---------- Baumodus: was passiert, wenn man auf Feld (x, z) tippt? ----------
// b = { inside, mode: 'place' | 'remove' | 'pave', item, r, path }; drinnen sind x/z Zimmer-Kacheln (ohne HOME_X)
export function resolveBuild(s, b, x, z) {
  const R = b.inside ? roomOf(s, b.room || null) : null, one = b.inside ? [[x + HOME_X, z + R.z0]] : [[x, z]];
  if (b.inside) {
    const W = ([i, j]) => [i + HOME_X, j + R.z0], room = b.room ? { room: b.room } : {};
    if (b.mode === 'remove') {
      const h = homeAt(s, x, z, false, R) || homeAt(s, x, z, 'walls', R) || homeAt(s, x, z, true, R);
      if (!h) return { label: 'Hier steht nichts', tiles: one, bad: true };
      const f = FURNITURE[h.o.k];
      return { a: { t: 'hpick', x, z, ...room }, label: `✋ ${f.icon} ${f.name} aufheben`, tiles: footprint(h.o.k, h.x, h.z, h.o.r).map(W) };
    }
    const f = FURNITURE[b.item];
    // Auf ein Möbelstück tippen hebt es auf (wenn das gewählte Möbel dort nicht hinpasst) – danach kann man es woanders hinstellen
    const lift = () => { const h = homeAt(s, x, z, false, R) || homeAt(s, x, z, 'walls', R) || homeAt(s, x, z, true, R), g = h && FURNITURE[h.o.k]; return g ? { a: { t: 'hpick', x, z, ...room }, pick: { id: h.o.k, r: h.o.r | 0 }, label: `✋ ${g.icon} ${g.name} aufheben`, tiles: footprint(h.o.k, h.x, h.z, h.o.r).map(W) } : null; };
    if (!f || !(s.inv[b.item] > 0)) return lift() || { label: 'Wähle unten ein Möbelstück', tiles: one, bad: true };
    const r = f.wall ? wallRot(s, x, z, R) : (((b.r | 0) % 4) + 4) % 4;
    const ok = r >= 0 && canFurnish(s, b.item, x, z, r, R) && !layer(s, f, R)[key(x, z)];
    if (!ok) { const l = lift(); if (l) return l; }
    return { ...(ok ? { a: { t: 'hplace', x, z, item: b.item, r, ...room }, label: `📍 ${f.icon} ${f.name} hinstellen` } : { label: f.wall ? 'Nur an eine Wand' : 'Hier ist kein Platz', bad: true }), tiles: r >= 0 ? footprint(b.item, x, z, r).map(W) : one, r };
  }
  const k = key(x, z);
  if (b.mode === 'remove') {
    const o = s.obj[k];
    if (o?.k === 'nachbarhaus') return { label: `🏠 Hier wohnt jemand – nicht abbaubar`, tiles: one, bad: true };
    if (o && PLACE[o.k]) {
      const p = PLACE[o.k];
      const label = o.k === 'baustelle' ? (o.paid ? `🚩 Baustelle abbauen (+${o.paid} Taler zurück)` : '🚩 Bauplatz abbauen') : p.kind === 'project' ? `🏗️ ${p.name} abbauen` : `✋ ${p.icon} ${p.name} aufheben`;
      return { a: { t: 'pickup', x, z }, label, tiles: one, project: p.kind === 'project' || o.k === 'baustelle' };
    }
    if (s.paths?.[k]) return { a: { t: 'pave', x, z, k: null }, label: '🧹 Weg entfernen', tiles: one };
    return { label: 'Hier steht nichts', tiles: one, bad: true };
  }
  if (b.mode === 'pave') {
    const type = b.path || 'erde';
    if (type === 'none' || s.paths?.[k] === type) return s.paths?.[k] ? { a: { t: 'pave', x, z, k: null }, label: '🧹 Weg entfernen', tiles: one } : { label: 'Hier ist kein Weg', tiles: one, bad: true };
    if (PAVE[type] && pavable(s, x, z)) return { a: { t: 'pave', x, z, k: type }, label: `${PAVE[type].icon} ${PAVE[type].name}`, tiles: one };
    return { label: 'Hier geht kein Weg', tiles: one, bad: true };
  }
  const p = PLACE[b.item];
  // Auf Deko tippen hebt sie auf (Projekte, Baustellen und Nachbarhäuser nur über ✋ Aufheben bzw. gar nicht)
  const o = s.obj[k], q = o && PLACE[o.k], lift = q && q.kind !== 'project' && q.kind !== 'site' && !['baustelle', 'nachbarhaus'].includes(o.k) ? { a: { t: 'pickup', x, z }, pick: { id: o.k, r: o.r | 0 }, label: `✋ ${q.icon} ${q.name} aufheben`, tiles: one } : null;
  if (!p || !(s.inv[b.item] > 0)) return lift || { label: 'Wähle unten etwas zum Aufstellen', tiles: one, bad: true };
  const big = p.kind === 'project' || b.item === 'baustelle';
  const ok = canPlace(s, x, z) && (!big || siteFree(s, x, z)) && (b.item !== 'baustelle' || PROJECTS[s.mayor.plan]);
  if (!ok && lift) return lift;
  const why = !canPlace(s, x, z) ? 'Hier ist kein Platz' : b.item === 'baustelle' && !PROJECTS[s.mayor.plan] ? 'Erst im Rathaus ein Projekt wählen' : 'Projekte brauchen rundherum Platz';
  return { ...(ok ? { a: { t: 'place', x, z, item: b.item, r: (((b.r | 0) % 4) + 4) % 4 }, label: `📍 ${p.icon} ${p.name} aufstellen` } : { label: why, bad: true }), tiles: big ? [-1, 0, 1].flatMap(i => [-1, 0, 1].map(j => [x + i, z + j])) : one };
}

export function resolve(s, me, sel, at) {
  if (inside(me)) return resolveHome(s, me, sel, at);
  const r6 = me.sw ? null : E6.resolve6(s, me, sel, at) || E7.resolve7(s, me, sel, at); // Schatzkarte, Wildtiere, Konzert, Veredeln, Moor-/Bambusweg, Kartons, Wetter, Feste
  if (r6) return r6;
  if (me.x < -150) return resolveArea(s, me, sel, at);
  if (me.z < -750) return E7.resolveZone7(s, me, sel, at);
  if (me.z < -450) return E6.resolveFair6(s, me, sel, at);
  if (me.z < -150) return resolveStreet(s, me, sel, at);
  if (me.z > 3600) return V.resolveV(s, me, sel, at);
  if (me.z > 2600) return W4.resolveW(s, me, sel, at);
  if (me.z > 1900) return Z.resolveDepth(s, me, sel, at);
  if (me.z > 1350) return Z.resolveWreck(s, me, sel, at);
  if (me.z > 1000) return Y.resolveReef(s, me, sel, at);
  if (me.z > 450) return X.resolveTrip(s, me, sel, at);
  if (me.z > 150) return resolveTropic(s, me, sel, at);
  if (me.sw) { // schwimmt: tauchen
    const d = (s.dives || []).map(d => [d, Math.hypot(d.x - me.x, d.z - me.z)]).sort((a, b) => a[1] - b[1])[0];
    if (Math.hypot(me.x - Z.WRECK_BUOY[0], me.z - Z.WRECK_BUOY[1]) < 1.8) return { dive: true, wreck: true, label: s.wreck?.found ? '⚓ Zum Schiffswrack tauchen' : '⚓ Was liegt unter der gelben Boje?', tiles: [] };
    if (Math.hypot(me.x - Y.REEF_BUOY[0], me.z - Y.REEF_BUOY[1]) < 1.8) return { dive: true, reef: true, label: s.reef?.found ? '🪸 Zum Korallenriff tauchen' : '🪸 Was ist unter der Boje?', tiles: [] };
    return d && d[1] < 1.5 ? { a: { t: 'dive', id: d[0].id }, dive: true, label: '🤿 Tauchen!', tiles: [] } : { dive: true, label: '🫧 Abtauchen', tiles: [] };
  }
  const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9;
  const x = Math.round(px), z = Math.round(pz), k = key(x, z);
  const toward = at && (x !== Math.round(me.x) || z !== Math.round(me.z)) ? Math.atan2(x - me.x, z - me.z) : me.ry;
  const [dx, dz] = facing(toward);
  const one = [[x, z]];

  const gid = !s.obj[k] && !s.tiles[k] && gateAt(x, z);
  if (gid) return s.areas?.[gid] ? { go: gid, label: `${AREAS[gid].icon} Zum ${AREAS[gid].name}`.replace('Zum Blütenwiese', 'Zur Blütenwiese').replace('Zum Kristallhöhle', 'Zur Kristallhöhle'), tiles: one } : { ui: 'mayor', label: `🔒 ${AREAS[gid].gateName} · im Rathaus freischalten`, tiles: one };
  const b = buildingAt(x, z);
  if (b === 'house') return { enter: true, label: '🚪 Hineingehen', tiles: one };
  if (b === 'gate') return { go: 'street', label: '🛍️ Zur Bummelgasse', tiles: one };
  if (b === 'boat') return { ui: 'boat', label: '⛵ Käpt\'n Flossi', tiles: one };
  if (b) {
    const B = BUILDINGS[b];
    if (B.use === 'plaza') return { label: '🌳 Der Dorfbaum', tiles: one };
    if (B.use === 'visit') return { visit: B.npc, label: `🚪 ${B.name}`, tiles: one };
    const label = { mayor: '🏛️ Rathaus', sell: '💰 Verkaufen', shop: '🛒 Krämerladen', orders: b === 'office' ? '🏕️ Inselbüro' : '📋 Schwarzes Brett', farm: '🏡 Haus', craft: '🔨 Werkbank', cook: '🍳 Kochen', museum: '🏛️ Museum', mail: s.mail.length ? `💌 Post (${s.mail.length})` : '📭 Briefkasten' }[B.use];
    return { ui: B.use, label, tiles: one };
  }

  const g = s.ground?.[k];
  if (g) {
    const it = ITEMS[g.id], label = g.id === 'bottle' ? '🍾 Flaschenpost aufheben' : g.id === 'diy' || g.box ? '🎁 Aufheben' : g.id === 'money' ? `💰 ${g.n} Taler aufheben` : it?.furn || it?.place ? '🍃 Aufheben' : `${it?.icon || ''} ${it?.name || ''} aufheben`;
    return { a: { t: 'pick', x, z }, label, tiles: one };
  }
  const res = resAt(s, k);
  if (res === 'tree' || res === 'palm') {
    const fruit = fruitOf(s, k), ready = fruitReady(s, k), ic = ITEMS[fruit]?.icon || '🌳';
    if (sel === 'axe') return s.res[k] > 0 ? { a: { t: 'chop', x, z, px: Math.round(me.x), pz: Math.round(me.z) }, label: '🪓 Holz hacken', tiles: one } : { label: '🌳 Morgen wieder', tiles: one };
    if (sel === 'spade') return { a: { t: 'uproot', x, z }, label: res === 'palm' ? '🪏 Palme ausgraben' : '🪏 Baum ausgraben', tiles: one };
    return { a: { t: 'shake', x, z, px: Math.round(me.x), pz: Math.round(me.z) }, label: ready ? `${ic} Schütteln` : '🌳 Schütteln', tiles: one };
  }
  if (res === 'rock') {
    if (sel === 'shovel') return s.res[k] > 0 ? { a: { t: 'mine', x, z }, label: '🪨 Draufhauen', tiles: one } : { label: '🪨 Morgen wieder', tiles: one };
    return { label: '🪨 Felsen · mit der Schaufel draufhauen', tiles: one };
  }
  if (contestDay(s) && x === CONTEST_AT[0] && z === CONTEST_AT[1]) return { ui: 'contest', label: `🏆 ${FESTS[festOf(s.day)].name}`, tiles: one };
  if (X.nightOpen(s) && x === X.NIGHT_AT[0] && z === X.NIGHT_AT[1]) return { ui: 'night', label: '🏮 Nachtmarkt', tiles: one };
  if (s.eggs?.[k] !== undefined) return { a: { t: 'pick', x, z }, label: '🥚 Ei aufheben', tiles: one };
  if (s.drift?.[k]) return { a: { t: 'pick', x, z }, label: '🪵 Treibholz aufheben', tiles: one };
  if (s.shells?.[k]) return { a: { t: 'pick', x, z }, label: `${ITEMS[s.shells[k]].icon} Aufheben`, tiles: one };
  if (s.weeds?.[k] && sel !== 'shovel') return { a: { t: 'pick', x, z }, label: '🌿 Unkraut zupfen', tiles: one };

  if (sel === 'net') return { net: { x: px, z: pz }, label: '🦋 Kescher schwingen', tiles: [] };
  if (sel === 'sling') {
    const b = s.balloon && balloonPos(s.balloon, s.time);
    if (b && Math.hypot(b.x - me.x, b.z - me.z) < 5) return { a: { t: 'pop', id: s.balloon.id }, label: '🎯 Schießen!', tiles: [] };
    return { label: s.balloon ? '🎈 Lauf unter den Ballon!' : '🎈 Kein Ballon in Sicht', tiles: [] };
  }
  const wr = V.resolveIslandV(s, me, sel, at, x, z) || W4.resolveIslandW(s, me, sel, at, x, z);
  if (wr) return wr;
  if (sel.startsWith('pave:')) {
    const type = sel.slice(5);
    if (s.paths[k] === type) return { a: { t: 'pave', x, z, k: null }, label: '🧹 Weg entfernen', tiles: one };
    if (s.paths[k] && type === 'none') return { a: { t: 'pave', x, z, k: null }, label: '🧹 Weg entfernen', tiles: one };
    if (PAVE[type] && pavable(s, x, z)) return { a: { t: 'pave', x, z, k: type }, label: `${PAVE[type].icon} ${PAVE[type].name}`, tiles: one };
    return { label: 'Hier geht kein Weg', tiles: one };
  }
  const o = s.obj[k];
  if (o) {
    const p = PLACE[o.k];
    if (o.k === 'baustelle') return PROJECTS[o.p] ? { ui: 'fund', label: (o.paid || 0) >= PROJECTS[o.p].cost ? `🏗️ ${PROJECTS[o.p].name}: bezahlt!` : `💰 Für ${PROJECTS[o.p].name} spenden`, tiles: one } : { label: '🚩 Bauplatz (im 🔨 Baumodus abbauen)', tiles: one };
    if (o.k === 'seilbahn') return { ui: 'cable', label: '🚡 Seilbahn fahren', tiles: one };
    const o6 = E6.resolveObj6(s, o, k, x, z) || E7.resolveObj7(s, o, k, x, z);
    if (o6) return o6;
    if (V.OBJ_GO5[o.k]) return { go: V.OBJ_GO5[o.k][0], label: V.OBJ_GO5[o.k][1], tiles: one };
    if (V.OBJ_UI5[o.k]) return { ui: V.OBJ_UI5[o.k][0], label: V.OBJ_UI5[o.k][1], tiles: one };
    if (W4.OBJ_UI[o.k]) return { ui: W4.OBJ_UI[o.k][0], label: W4.OBJ_UI[o.k][1], tiles: one };
    if (o.k === 'ballonplatz') return { ui: 'balloon', label: '🎈 Ballonfahrt', tiles: one };
    if (o.k === 'strandgrill') return { ui: 'grill', grill: k, label: '🔥 Grillen', tiles: one };
    if (o.k === 'schmetterlingshaus') return { ui: 'butterfly', label: '🦋 Schmetterlingshaus', tiles: one };
    if (p.kind === 'project') return p.sit ? { sit: { x, z, r: o.r }, label: '🧺 Hinsetzen', tiles: one } : { label: `${p.icon} ${p.name}`, tiles: one };
    if (p.farm) return Y.farmResolve(s, o, x, z);
    if (p.kind === 'producer') return { a: { t: 'use', x, z }, label: `${ITEMS[p.item].icon} Pflücken`, tiles: one };
    if (o.k === 'bank' || p.sit) return { sit: { x, z, r: o.r }, label: '🪑 Hinsetzen', tiles: one };
    if (o.k === 'kirschbaum') return { petals: { x, z }, label: '🌸 Schütteln', tiles: one };
    if (o.k === 'sternenrakete') return { a: { t: 'fwstart', x, z }, label: s.fw?.day === s.day ? '🎆 Heute Abend ist Feuerwerk!' : '🚀 Feuerwerk für heute Abend zünden', tiles: one };
    if (o.k === 'tauschstand') return { ui: 'stall', label: '🏪 Tauschstand', tiles: one };
    if (o.k === 'fahne') return { ui: 'patterns', label: '🚩 Inselfahne · Muster wählen', tiles: one };
    return { label: p.icon + ' ' + p.name, tiles: one };
  }

  if (isWater(px, pz) || (!walkable(px, pz) && isWater(px + (px - me.x) * 0.5, pz + (pz - me.z) * 0.5))) return { fish: true, label: '🎣 Angeln', tiles: [] };

  const t = s.tiles[k];
  const cr = Y.castleResolve(s, x, z, sel);
  if (cr) return cr;
  if (sel === 'shovel') {
    if (s.tmap?.spot === k) return { a: { t: 'dig', x, z }, label: '🏴‍☠️ Hier ist das Kreuz! Graben!', tiles: one };
    if (s.digs.includes(k)) return { a: { t: 'dig', x, z }, label: '✨ Ausgraben', tiles: one };
    if (t) return { a: { t: 'dig', x, z }, label: '🌱 Ausgraben', tiles: one };
    if (s.weeds?.[k]) return { a: { t: 'pick', x, z }, label: '🌿 Unkraut zupfen', tiles: one };
    if (sand(x, z) && Y.castleOk(s, x, z) && !s.digs.includes(k)) return { a: { t: 'castle', op: 'build', x, z }, label: '🏰 Sandburg bauen', tiles: one };
    return { label: '', tiles: one };
  }
  if (sel === 'can') {
    const tiles = area(s.up.can, x, z, dx, dz);
    return tiles.some(([i, j]) => s.tiles[key(i, j)]) ? { a: { t: 'water', x, z, dx, dz }, label: '💧 Gießen', tiles } : { label: '', tiles: one };
  }
  if (t && t.c && stage(t.c) === 3) return { a: { t: 'harvest', x, z }, label: `${CROPS[t.c.k].icon} ${isFlower(t.c.k) ? 'Pflücken' : 'Ernten'}`, tiles: one };
  if (ITEMS[sel]?.sapling) return treeSpotOk(s, x, z, ITEMS[sel].palm) ? { a: { t: 'replant', x, z, item: sel }, label: `${ITEMS[sel].icon} ${ITEMS[sel].name.replace(' (Ballen)', '')} einpflanzen`, tiles: one } : { label: ITEMS[sel].palm ? 'Hier ist kein Platz für eine Palme' : 'Hier ist kein Platz für einen Baum', tiles: one, bad: true };
  if (sel === 'spade') return { label: '🪏 Vor einen Baum oder eine Palme stellen', tiles: one };
  if (ITEMS[sel]?.seed) return canPlace(s, x, z) ? { a: { t: 'plant', x, z, item: sel }, label: `${ITEMS[sel].icon} Pflanzen`, tiles: one } : { label: 'Hier kann man nichts pflanzen', tiles: one };
  if (PLACE[sel]) return { label: '🔨 Aufstellen geht im Baumodus', tiles: one };
  return { label: '', tiles: one };
}

// Insel-Erweiterungen: Kiefern, Pilze, Beeren, Bienenstöcke, Blumen, Erzadern; im Süden geht es zurück
function resolveArea(s, me, sel, at) {
  const id = areaOf(me), A = AREAS[id];
  const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9;
  const lx = Math.round(px - A.x), lz = Math.round(pz - A.z), tiles = [[lx + A.x, lz + A.z]];
  if (areaExit(id, px - A.x, pz - A.z) || (lz >= A.d && Math.abs(lx) <= 1)) return { go: 'island', label: '🏝️ Zurück zur Insel', tiles };
  if (Y.cableBuilt(s)) { const [cx, cz] = Y.cableStop(id); if (Math.hypot(px - cx, pz - cz) < 1.2) return { ui: 'cable', label: '🚡 Seilbahn', tiles }; }
  if (id === 'hoehle' && Math.hypot(px - Z.DEPTH_STAIRS[0], pz - Z.DEPTH_STAIRS[1]) < 1.3) { // Treppe in die Höhlen-Tiefen
    return s.inv.grubenlaterne > 0 ? { go: 'depth:0', label: '🏮 In die Höhlen-Tiefen hinabsteigen', tiles } : { label: '🌑 Eine Treppe ins Dunkle … ohne Grubenlaterne (Werkbank) geht es nicht hinab', tiles };
  }
  const n = nodeAt(id, lx, lz);
  if (!n) return { label: '', tiles: [] };
  const today = nodeToday(id, n, s.day), st = s.anode[id + ':' + n.i], used = st?.d === s.day ? st : null, a = how => ({ t: 'aact', area: id, i: n.i, how, x: lx, z: lz });
  if (n.kind === 'pine') {
    if (sel === 'axe') return (used?.u || 0) < nodeUses(n) ? { a: a('chop'), label: '🪓 Holz hacken', tiles } : { label: '🌲 Morgen wieder', tiles };
    return used?.shook ? { label: '🌲 Kiefer', tiles } : { a: a('shake'), label: '🌰 Schütteln', tiles };
  }
  if (n.kind === 'ore') return sel === 'shovel' ? ((used?.u || 0) < nodeUses(n) ? { a: a('mine'), label: '⛏️ Auf die Erzader hauen', tiles } : { label: '💎 Morgen wieder', tiles }) : { label: '💎 Erzader · mit der Schaufel draufhauen', tiles };
  if (!today || used) return { label: '', tiles: [] };
  const lbl = { mush: `${ITEMS[today]?.icon || '🍄'} ${ITEMS[today]?.name || 'Pilz'} pflücken`, berry: `${ITEMS[today].icon} Beeren pflücken`, hive: '🍯 Honig ernten', bloom: `🌸 ${CROPS[today]?.name} pflücken (Samen!)` }[n.kind];
  return { a: a('pick'), label: lbl, tiles };
}

// Bummelgasse: Läden im Norden, Tor im Süden
function resolveStreet(s, me, sel, at) {
  const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9;
  const lx = Math.round(px - STREET.x), lz = Math.round(pz - STREET.z), tiles = [[lx + STREET.x, lz + STREET.z]];
  const b = streetShopAt(lx, lz);
  if (b) { const B = STREET_SHOPS[b]; return { ui: B.use, label: `${B.who.split(' ')[0]} ${B.name}`, tiles }; }
  if (lz >= 4 && Math.abs(lx) <= 1) return { go: 'island', label: '🏝️ Zurück zur Insel', tiles };
  if (lx >= STREET.w - 0.6) return E6.fairOpen(s) ? { go: 'fair', label: '🎡 Zum Jahrmarkt!', tiles } : { label: `🎡 Jahrmarkt: ${E6.nextFair(s) === s.day ? 'heute ab 10 Uhr' : `in ${E6.nextFair(s) - s.day} Tag${E6.nextFair(s) - s.day > 1 ? 'en' : ''}`}`, tiles };
  return { label: '', tiles: [] };
}
// Tropeninsel: Tauschhütte, Obstbäume, Tour-Ziele, Kescher, Boot zurück
function resolveTropic(s, me, sel, at) {
  const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9;
  const lx = Math.round(px - TROPIC.x), lz = Math.round(pz - TROPIC.z), tiles = [[lx + TROPIC.x, lz + TROPIC.z]];
  const mx = me.x - TROPIC.x, mz = me.z - TROPIC.z;
  if (lx >= TROPIC_HUT.x0 && lx <= TROPIC_HUT.x1 && lz >= TROPIC_HUT.z0 && lz <= TROPIC_HUT.z1) return { ui: 'hut', label: '🦜 Kikis Tauschhütte', tiles };
  if (onDock(mx, mz) && mz > 11) return { ui: 'boatback', label: '⛵ Zurück nach Hause', tiles: [] };
  const T = s.tour && TOURS[s.tour.k];
  if (T) {
    const need = { pick: 'hand', net: 'net', dig: 'shovel' }[T.kind];
    const i = s.tour.targets.findIndex(g => !g.got && Math.hypot(g.x - (px - TROPIC.x), g.z - (pz - TROPIC.z)) < 0.8);
    if (i >= 0) {
      if (sel !== need && !(T.kind === 'pick')) return { label: T.kind === 'net' ? '🦋 Nimm den Kescher!' : '⛏️ Nimm die Schaufel!', tiles };
      return { a: { t: 'hit', i, kind: T.kind }, label: T.kind === 'net' ? '🦋 Fangen!' : T.kind === 'dig' ? '✨ Ausgraben!' : `${TOURS[s.tour.k].icon} Einsammeln!`, tiles, tour: 1 };
    }
  }
  const ti = tropicTree(lx, lz);
  if (ti >= 0) return { a: { t: 'tpick', i: ti }, label: s.tropic?.picked?.[ti] === s.day ? '🌴 Morgen wieder' : `${ITEMS[TROPIC_TREES[ti][2]].icon} Pflücken`, tiles };
  if (sel === 'net') return { net: { x: px, z: pz }, tropic: true, label: '🦋 Kescher schwingen', tiles: [] };
  return { label: '', tiles: [] };
}

// Was es auf welchem Level neu gibt (für die Level-Up-Meldung).
export function unlocksAt(l) {
  const out = [];
  for (const c of Object.values(CROPS)) if (c.lvl === l) out.push(c.icon + ' ' + c.name);
  for (const p of Object.values(PLACE)) if (p.lvl === l) out.push(p.icon + ' ' + p.name);
  for (const [, u] of Object.entries(UPGRADES)) if (u.req.includes(l)) out.push(u.icon + ' ' + u.name);
  return [...new Set(out)];
}
