// Spiellogik ohne Grafik: Welt-Zustand, Zeit, Aktionen. Läuft beim Host; Gäste rechnen nur zur Anzeige mit.
import {
  DAY, WET, MAP, CROPS, ANIMALS, PENS, BUILDINGS, ITEMS, FISH, PLACE,
  UPGRADES, needXp, MAX_LEVEL, ACHIEVEMENTS, SEASON_LEN, SEASON_IDS, isFlower,
  RES_SPOTS, TREE_FRUIT, FRUIT_REGROW, BUGS, FOSSILS, SHELLS, SHELLS_PER_DAY, WEEDS_PER_DAY, RECIPES, DIG_SPOTS_PER_DAY,
  NPC_DATA, NPC_IDS, STORY, DAILY, MUSEUM_ALL, NPC_PLAN, PAVE, BALLOON_GIFTS, weekday, TURNIP_STACK,
} from './data.js';
import { walkable, grass, sand, isWater, inPond as pondAt, inRiver, onBridge, onPier, onPlaza, rng, riverX, BRIDGES, MAP as ISLAND } from './island.js';
import { FURNITURE, WALLS, FLOORS } from './furni-data.js';

export const key = (x, z) => x + ',' + z;
export const seasonOf = day => SEASON_IDS[Math.floor((day - 1) / SEASON_LEN) % 4];
export const inSeason = (s, k) => CROPS[k].sea.includes(seasonOf(s.day));
const rnd = n => Math.floor(Math.random() * n);
const pick = arr => arr[rnd(arr.length)];

export function newFarm(name = 'Kuschelinsel') {
  const s = {
    v: 2, id: Math.random().toString(36).slice(2, 10), name, code: null,
    time: 0, day: 1, dayTime: 0.04, weather: 'sun',
    money: 800, xp: 0, level: 1,
    inv: { s_tulpe: 4 },
    up: {}, tiles: {}, obj: {}, animals: [], orders: [], nextId: 1, ach: {},
    album: {}, res: {}, shook: {}, digs: [], mail: [], npc: {},
    shells: {}, weeds: {}, fruit: {}, museum: {}, rock: null, paths: {}, balloon: null, wishes: 0, starNight: false, turnip: null, real: false,
    home: { wall: 'vanille', floor: 'dielen', items: {}, rugs: {}, walls: {} },
    quest: { i: 0, p: 0 }, daily: [], met: {},
    stats: { harvested: 0, earned: 0, fish: 0, orders: 0, treasure: 0, bugs: 0, dug: 0, cooked: 0, crafted: 0, wood: 0, fruit: 0, shells: 0, weeds: 0, planted: 0, balloons: 0, wishes: 0, turnipProfit: 0, turnipSpent: 0 },
  };
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
export const npcAwake = s => { const h = 6 + s.dayTime * 18; return h >= 7 && h < 21.5; };

// ---------- Quests ----------
function newDailies(s) {
  const pool = DAILY.map((d, i) => i).sort(() => Math.random() - 0.5).slice(0, 3);
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
}

// Morgens: Bäume & Felsen auffüllen, neue Grabstellen, Muscheln und Unkraut verteilen
const randTile = () => [rnd(2 * MAP + 1) - MAP, rnd(2 * MAP + 1) - MAP];
function refill(s) {
  for (const k of Object.keys(RES_SPOTS)) s.res[k] = 3;
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
    if (!sand(x, z) || s.shells[k] || s.obj[k] || RES_SPOTS[k]) continue;
    s.shells[k] = weighted(SHELLS, f => f[4])[0];
    n++;
  }
  for (let t = 0, n = Object.keys(s.weeds).length; n < WEEDS_PER_DAY && t < 300; t++) {
    const [x, z] = randTile();
    if (free(x, z) && !s.weeds[key(x, z)]) { s.weeds[key(x, z)] = 1; n++; }
  }
  const rocks = Object.keys(RES_SPOTS).filter(k => RES_SPOTS[k] === 'rock');
  s.rock = pick(rocks); // einer der Felsen spuckt heute Taler aus
}

// Alte Spielstände mit neuen Feldern ergänzen, damit Updates nichts kaputt machen.
export function migrate(s) {
  const fresh = !s.digs || !s.res || !s.shells;
  const base = newFarm(s.name);
  for (const k of Object.keys(base)) if (s[k] === undefined) s[k] = base[k];
  for (const k of Object.keys(UPGRADES)) if (s.up[k] === undefined) s.up[k] = UPGRADES[k].start;
  for (const k of Object.keys(base.stats)) if (s.stats[k] === undefined) s.stats[k] = 0;
  for (const k of ['money', 'xp', 'time', 'dayTime']) if (!Number.isFinite(s[k])) s[k] = 0;
  for (const k of ['level', 'day']) if (!Number.isInteger(s[k]) || s[k] < 1) s[k] = 1;
  s.home.walls ||= {};
  for (const [k, o] of Object.entries(s.home.items)) if (FURNITURE[o?.k]?.wall) { s.home.walls[k] = o; delete s.home.items[k]; }
  for (const [k, o] of Object.entries(s.obj)) {
    const p = PLACE[o?.k], [x, z] = k.split(',').map(Number);
    if (p && !buildingAt(x, z) && !RES_SPOTS[k] && grass(x, z)) continue;
    if (p) addInv(s, o.k, 1);
    delete s.obj[k];
  }
  if (fresh) refill(s);
  return s;
}

export const stage = c => {
  const g = CROPS[c.k].grow;
  return c.g >= g ? 3 : Math.min(2, Math.floor(c.g / g * 3));
};

export const inField = () => false;

export function buildingAt(x, z) {
  for (const [id, b] of Object.entries(BUILDINGS)) if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) return id;
  return null;
}

export const inPond = pondAt;

export function canPlace(s, x, z) {
  const k = key(x, z);
  return grass(x, z) && !buildingAt(x, z) && !s.tiles[k] && !s.obj[k] && !RES_SPOTS[k] && !s.digs?.includes(k) && !s.weeds?.[k] && !s.shells?.[k];
}

// ---------- Zuhause (Innenraum liegt weit weg bei x = HOME_X, damit es eine eigene Welt ist) ----------
export const HOME_X = 300;
export const ROOMS = [null, [7, 5], [9, 7], [11, 7]];
export const roomSize = s => ROOMS[s.up.house] || ROOMS[1];
export const inside = p => p.x > HOME_X / 2;
// Kacheln eines Möbels: (x, z) = nordwestliche Kachel, gedreht -> Breite/Tiefe tauschen
export function footprint(k, x, z, r) {
  const f = FURNITURE[k], [w, d] = r % 2 ? [f.d, f.w] : [f.w, f.d], out = [];
  for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) out.push([x + i, z + j]);
  return out;
}
const layer = (s, f) => f.rug ? s.home.rugs : f.wall ? s.home.walls : s.home.items;
export function homeAt(s, x, z, kind) { // welches Möbel liegt auf dieser Kachel? kind: true/'rugs' = Teppiche, 'walls' = Wandschmuck
  const map = kind === 'walls' ? s.home.walls : kind ? s.home.rugs : s.home.items;
  for (const [k, o] of Object.entries(map)) {
    const [ax, az] = k.split(',').map(Number);
    if (footprint(o.k, ax, az, o.r).some(([i, j]) => i === x && j === z)) return { key: k, o, x: ax, z: az };
  }
  return null;
}
const inRoom = (s, x, z) => { const [w, d] = roomSize(s); return Math.abs(x) <= (w - 1) / 2 && Math.abs(z) <= (d - 1) / 2; };
export function wallRot(s, x, z) { // Wandschmuck: Rückwand, sonst linke/rechte Wand
  const [w, d] = roomSize(s);
  return z === -(d - 1) / 2 ? 0 : x === -(w - 1) / 2 ? 1 : x === (w - 1) / 2 ? 3 : -1;
}
export function canFurnish(s, k, x, z, r) {
  const f = FURNITURE[k];
  if (!f) return false;
  if (f.wall) {
    const wr = wallRot(s, x, z);
    return wr >= 0 && footprint(k, x, z, wr).every(([i, j]) => inRoom(s, i, j) && !homeAt(s, i, j, 'walls'));
  }
  const [, d] = roomSize(s);
  return footprint(k, x, z, r).every(([i, j]) => inRoom(s, i, j) && !homeAt(s, i, j, f.rug) && (f.rug || !f.solid || !(i === 0 && j === (d - 1) / 2))); // Platz vor der Tür bleibt frei
}
function homeBlocked(s, x, z) {
  const [w, d] = roomSize(s), lx = x - HOME_X, door = Math.abs(lx) < 0.6;
  if (Math.abs(lx) > w / 2 - 0.28 || z < -d / 2 + 0.28 || z > d / 2 + (door ? 0.6 : -0.28)) return true;
  const h = homeAt(s, Math.round(lx), Math.round(z));
  return !!(h && FURNITURE[h.o.k].solid);
}

// Kann man an dieser Weltposition stehen?
export function blocked(s, x, z) {
  if (x > HOME_X / 2) return homeBlocked(s, x, z);
  if (!walkable(x, z)) return true;
  const tx = Math.round(x), tz = Math.round(z);
  if (buildingAt(tx, tz) || RES_SPOTS[key(tx, tz)]) return true;
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

export const price = (s, id) => ITEMS[id]?.turnip ? turnipPrice(s) : Math.round((ITEMS[id]?.sell || 0) * (1 + 0.2 * (s.up['q_' + ITEMS[id].cat] || 0)));

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
  s.time += dt;
  if (!s.real) s.dayTime += dt / DAY; // Echtzeit: der Host stellt die Uhr nach der echten Uhrzeit (realClock)
  if (s.dayTime >= 1) {
    if (auth) { newDay(s); changed = true; } else s.dayTime = 0.9999;
  }
  const rain = s.weather !== 'sun'; // Regen und Schnee gießen
  const sea = seasonOf(s.day);
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
    if (p?.kind === 'producer' && o.t < p.every) {
      o.t = Math.min(p.every, o.t + dt);
      if (o.t >= p.every) changed = true;
    }
  }
  for (const t of Object.values(s.tiles)) {
    if (rain) { if (!t.w) changed = true; t.w = WET; }
    if (t.c && t.c.g < CROPS[t.c.k].grow) { // gegossen wächst es viel schneller
      const before = stage(t.c);
      t.c.g = Math.min(CROPS[t.c.k].grow, t.c.g + dt * (CROPS[t.c.k].sea.includes(sea) ? 1 : 0.5) * (t.w > 0 ? 1 : 0.3));
      if (stage(t.c) !== before) changed = true;
    }
    if (t.w > 0) {
      t.w -= dt;
      if (t.w <= 0) { t.w = 0; changed = true; }
    }
  }
  return changed;
}

function newDay(s) {
  s.day++;
  s.dayTime = 0;
  const sea = seasonOf(s.day), wet = { spring: 0.25, summer: 0.15, autumn: 0.28, winter: 0.35 }[sea], was = s.weather;
  s.weather = s.day > 2 && Math.random() < wet ? (sea === 'winter' ? 'snow' : 'rain') : 'sun';
  if (was === 'rain' && s.weather === 'sun') s.rainbowDay = s.day; // nach dem Regen: Regenbogen am Vormittag
  s.orders = s.orders.filter(o => s.day - o.day < 3);
  s.balloon = null;
  refill(s);
  // Wünsche der Nacht: Sternsplitter am Strand
  for (let t = 0, n = 0; n < Math.min(8, s.wishes || 0) && t < 300; t++) {
    const [x, z] = randTile(), k = key(x, z);
    if (sand(x, z) && !s.shells[k] && !s.obj[k] && !RES_SPOTS[k]) { s.shells[k] = 'sternsplitter'; n++; }
  }
  s.wishes = 0;
  s.starNight = s.weather === 'sun' && Math.random() < 0.3;
  if (weekday(s.day) === 0) { // neue Woche: Rüben verfaulen, neue Preise
    if (s.inv.ruebe) { addInv(s, 'faule_ruebe', s.inv.ruebe); delete s.inv.ruebe; }
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
  if (s.mail.length > 12) s.mail.splice(0, s.mail.length - 12);
  fillOrders(s);
}

const hourOf = s => 6 + s.dayTime * 18;
function weighted(list, w) {
  const total = list.reduce((t, x) => t + w(x), 0);
  let r = Math.random() * total;
  for (const x of list) if ((r -= w(x)) < 0) return x;
  return list[0];
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
export const pavable = (s, x, z) => walkable(x, z) && !onBridge(x, z) && !onPier(x, z) && !buildingAt(x, z) && !RES_SPOTS[key(x, z)] && !s.tiles[key(x, z)] && !s.digs?.includes(key(x, z));

// Wo wird geangelt? Fluss, Teich oder Meer
export const waterKind = (x, z) => pondAt(x, z) ? 'pond' : inRiver(x, z) && !onBridge(x, z) ? 'river' : 'sea';
export const fruitReady = (s, k) => !(s.fruit?.[k] > s.day);

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

const addInv = (s, id, n) => { s.inv[id] = (s.inv[id] || 0) + n; };
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
const isTree = k => RES_SPOTS[k] === 'tree' || RES_SPOTS[k] === 'palm';

const ACTIONS = {
  water(s, a, out) {
    let n = 0;
    for (const [x, z] of area(s.up.can, a.x, a.z, a.dx, a.dz)) {
      const t = s.tiles[key(x, z)];
      if (t) { t.w = WET; n++; fx(out, x, z, '', 'water'); }
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
    if (!has(PLACE, a.item) || !canPlace(s, a.x, a.z) || !takeInv(s, a.item, 1)) return false;
    const o = { k: a.item, r: [0, 1, 2, 3].includes(a.r) ? a.r : 0 };
    if (PLACE[a.item].kind === 'producer') o.t = 0;
    s.obj[key(a.x, a.z)] = o;
    fx(out, a.x, a.z, '', 'dust');
    out.snd = 'place';
    return true;
  },
  pickup(s, a, out) {
    const k = key(a.x, a.z), o = s.obj[k];
    if (!o) return false;
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
    const k = key(a.x, a.z);
    if (s.shells[k]) {
      const id = s.shells[k];
      delete s.shells[k];
      addInv(s, id, 1);
      collect(s, id, out);
      s.stats.shells = (s.stats.shells || 0) + 1;
      questEvent(s, 'shell', 1, out);
      addXp(s, 1, out);
      fx(out, a.x, a.z, `+1 ${ITEMS[id].icon}`, 'sparkle');
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
    const pool = FISH.filter(f => (!f[5] || f[5].includes(sea)) && (f[6] === where || (where === 'pond' && f[6] === 'river' && f[0] === 'barsch')));
    const f = weighted(pool, f => f[4][l] || 0), id = f[0];
    addInv(s, id, 1);
    collect(s, id, out);
    s.stats.fish++;
    questEvent(s, 'fish', 1, out);
    if (id === 'schatz') s.stats.treasure++;
    addXp(s, ITEMS[id].xp, out);
    fx(out, a.x, a.z, `+1 ${ITEMS[id].icon}`, 'water');
    out.caught = id;
    out.snd = 'harvest';
    return true;
  },
  bug(s, a, out) {
    const sea = seasonOf(s.day), h = hourOf(s), night = h >= 20 || h < 6;
    const pool = BUGS.filter(b => b[4].includes(sea) && (b[5] === 'any' || (b[5] === 'night') === night));
    if (!pool.length) { out.msg = 'Gerade sind keine Insekten unterwegs.'; return false; }
    const [id, , icon] = weighted(pool, b => b[6]);
    addInv(s, id, 1);
    collect(s, id, out);
    s.stats.bugs = (s.stats.bugs || 0) + 1;
    questEvent(s, 'bug', 1, out);
    addXp(s, ITEMS[id].xp, out);
    fx(out, a.x, a.z, `+1 ${icon}`, 'sparkle');
    out.caught = id;
    out.snd = 'harvest';
    return true;
  },
  chop(s, a, out) {
    const k = key(a.x, a.z);
    if (!isTree(k)) return false;
    if (!(s.res[k] > 0)) { out.msg = 'Der Baum braucht eine Pause – morgen wieder!'; return false; }
    s.res[k]--;
    const n = Math.random() < 0.3 ? 2 : 1;
    addInv(s, 'holz', n);
    s.stats.wood = (s.stats.wood || 0) + n;
    questEvent(s, 'chop', n, out);
    addXp(s, 1, out);
    fx(out, a.x, a.z, `+${n} 🪵`, 'leaf');
    out.snd = 'chop';
    return true;
  },
  mine(s, a, out) {
    const k = key(a.x, a.z);
    if (RES_SPOTS[k] !== 'rock') return false;
    if (!(s.res[k] > 0)) { out.msg = 'Der Felsen ist für heute leer.'; return false; }
    s.res[k]--;
    questEvent(s, 'mine', 1, out);
    addXp(s, 1, out);
    out.snd = 'place';
    if (s.rock === k) { // Glücksfelsen: Taler statt Steine
      const m = [100, 250, 500][2 - s.res[k]] || 100;
      s.money += m;
      s.stats.earned += m;
      fx(out, a.x, a.z, `+${m} 🪙`, 'coin');
      out.snd = 'coin';
      return true;
    }
    const r = Math.random(), id = r < 0.15 ? 'eisen' : r < 0.4 ? 'lehm' : 'stein';
    addInv(s, id, 1);
    fx(out, a.x, a.z, `+1 ${ITEMS[id].icon}`, 'dust');
    return true;
  },
  shake(s, a, out) {
    const k = key(a.x, a.z);
    if (!isTree(k)) return false;
    questEvent(s, 'shake', 1, out);
    if (fruitReady(s, k)) {
      const id = TREE_FRUIT[k] || 'apfel', n = id === 'kokosnuss' ? 2 : 3;
      s.fruit[k] = s.day + FRUIT_REGROW;
      addInv(s, id, n);
      s.stats.fruit = (s.stats.fruit || 0) + n;
      questEvent(s, 'fruit', n, out);
      addXp(s, n, out);
      fx(out, a.x, a.z, `+${n} ${ITEMS[id].icon}`, 'fruit');
      out.snd = 'harvest';
      return true;
    }
    if (s.shook[k]) { fx(out, a.x, a.z, '🍃', 'leaf'); out.msg = 'Hier fällt heute nichts mehr runter.'; out.snd = 'water'; return true; }
    s.shook[k] = 1;
    const r = Math.random();
    if (r < 0.06) { out.msg = '🐝 Autsch, ein Wespennest! Schnell weg hier!'; out.snd = 'fail'; fx(out, a.x, a.z, '🐝🐝🐝', 'leaf'); return true; }
    if (r < 0.14) {
      const m = 100 + rnd(5) * 100;
      s.money += m; s.stats.earned += m;
      fx(out, a.x, a.z, `+${m} 🪙`, 'coin'); out.msg = `Ein Beutel mit ${m} Talern ist heruntergefallen!`; out.snd = 'coin';
      return true;
    }
    if (r < 0.19) {
      const list = Object.keys(FURNITURE).filter(id => (FURNITURE[id].lvl || 1) <= s.level && !FURNITURE[id].wall), id = pick(list);
      if (id) { addInv(s, id, 1); fx(out, a.x, a.z, `+1 ${ITEMS[id].icon}`, 'leaf'); out.msg = `${ITEMS[id].icon} ${ITEMS[id].name} ist aus dem Baum gefallen!`; out.snd = 'love'; return true; }
    }
    if (r < 0.55) { addInv(s, 'ast', 1); fx(out, a.x, a.z, '+1 🥢', 'leaf'); out.snd = 'water'; return true; }
    fx(out, a.x, a.z, '🍃', 'leaf'); out.msg = 'Nur ein paar Blätter …'; out.snd = 'water';
    return true;
  },
  dig(s, a, out) {
    const k = key(a.x, a.z), i = s.digs.indexOf(k), t = s.tiles[k];
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
  pop(s, a, out) { // Geschenkballon mit der Schleuder getroffen
    const b = s.balloon;
    if (!b || b.id !== a.id) return false;
    const p = balloonPos(b, s.time);
    s.balloon = null;
    s.stats.balloons = (s.stats.balloons || 0) + 1;
    questEvent(s, 'balloon', 1, out);
    addXp(s, 5, out);
    const kind = weighted(BALLOON_GIFTS, g => g[1])[0];
    let txt;
    if (kind === 'money') { const m = 500 + rnd(16) * 100; s.money += m; s.stats.earned += m; txt = `+${m} 🪙`; out.msg = `🎁 Im Geschenk waren ${m} Taler!`; }
    else if (kind === 'furn' || kind === 'deco') {
      const list = kind === 'furn' ? Object.keys(FURNITURE).filter(id => (FURNITURE[id].lvl || 1) <= s.level + 2) : Object.keys(PLACE).filter(id => PLACE[id].kind === 'deco' && PLACE[id].buy);
      const id = pick(list);
      addInv(s, id, 1); txt = `+1 ${ITEMS[id].icon}`; out.msg = `🎁 Im Geschenk war: ${ITEMS[id].icon} ${ITEMS[id].name}!`;
    } else { const n = kind === 'holz' ? 5 : kind === 'eisen' ? 2 : 1; addInv(s, kind, n); txt = `+${n} ${ITEMS[kind].icon}`; out.msg = `🎁 Im Geschenk war: ${n}× ${ITEMS[kind].icon} ${ITEMS[kind].name}!`; }
    out.fx.push({ x: p.x, z: p.z, txt, k: 'coin', y: p.y });
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
    if ((r.lvl || 1) > s.level) { out.msg = `Erst ab Level ${r.lvl}.`; return false; }
    if (Object.entries(r.in).some(([id, n]) => (s.inv[id] || 0) < n)) { out.msg = 'Dafür fehlen noch Zutaten.'; return false; }
    for (const [id, n] of Object.entries(r.in)) takeInv(s, id, n);
    addInv(s, r.out, r.n);
    if (r.st === 'cook') s.stats.cooked = (s.stats.cooked || 0) + 1; else s.stats.crafted = (s.stats.crafted || 0) + 1;
    questEvent(s, r.st === 'cook' ? 'cook' : 'craft', 1, out);
    addXp(s, 3 + (ITEMS[r.out].xp || 2), out);
    out.msg = `${r.st === 'cook' ? '🍳' : '🔨'} ${r.n > 1 ? r.n + '× ' : ''}${ITEMS[r.out].name} fertig!`;
    out.snd = 'level';
    return true;
  },
  talk(s, a, out) {
    if (!has(NPC_DATA, a.id)) return false;
    const n = friend(s, a.id);
    if (n.talk !== s.day) { n.talk = s.day; n.f += 15; addXp(s, 1, out); questEvent(s, 'talk', 1, out); }
    s.met[a.id] = 1;
    questEvent(s, 'met', Object.keys(s.met).length, out);
    return true;
  },
  gift(s, a, out) {
    if (!has(NPC_DATA, a.id) || !has(ITEMS, a.item) || ITEMS[a.item].seed) return false;
    const n = friend(s, a.id), d = NPC_DATA[a.id];
    if (n.gift === s.day) { out.msg = `${d.name} hat heute schon ein Geschenk bekommen.`; return false; }
    if (!takeInv(s, a.item, 1)) return false;
    const r = d.loves.includes(a.item) ? 'love' : d.likes.includes(a.item) ? 'like' : d.dislikes.includes(a.item) ? 'dislike' : 'neutral';
    n.gift = s.day;
    n.f = Math.max(0, n.f + { love: 80, like: 40, neutral: 20, dislike: -10 }[r]);
    questEvent(s, 'gift', 1, out);
    if (r === 'love') questEvent(s, 'gift_love', 1, out);
    addXp(s, 3, out);
    out.reaction = r;
    out.snd = r === 'dislike' ? 'fail' : 'love';
    return true;
  },

  hplace(s, a, out) {
    if (!has(FURNITURE, a.item) || !(s.inv[a.item] > 0)) return false;
    const f = FURNITURE[a.item], r = f.wall ? wallRot(s, a.x, a.z) : [0, 1, 2, 3].includes(a.r) ? a.r : 0;
    if (!canFurnish(s, a.item, a.x, a.z, r)) { out.msg = 'Hier ist kein Platz.'; return false; }
    if (layer(s, f)[key(a.x, a.z)]) return false;
    takeInv(s, a.item, 1);
    layer(s, f)[key(a.x, a.z)] = { k: a.item, r };
    questEvent(s, 'furnish', 1, out);
    out.snd = 'place';
    return true;
  },
  hpick(s, a, out) {
    const h = homeAt(s, a.x, a.z) || homeAt(s, a.x, a.z, 'walls') || homeAt(s, a.x, a.z, true);
    if (!h) return false;
    delete layer(s, FURNITURE[h.o.k])[h.key];
    addInv(s, h.o.k, 1);
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
    const it = ITEMS[a.id], cost = it.buy * a.n;
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
    if (s.money < u.cost) { out.msg = 'Nicht genug Taler.'; return false; }
    s.money -= u.cost;
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

// Führt eine Spieler-Aktion aus. Eingaben kommen evtl. übers Netz, darum wird alles geprüft.
export function act(s, a) {
  const out = { ok: false, fx: [], snd: null, msg: null };
  if (!a || typeof a !== 'object' || !has(ACTIONS, a.t)) return out;
  const needsTile = ['water', 'plant', 'harvest', 'place', 'pickup', 'use', 'pick', 'chop', 'mine', 'shake', 'dig', 'bug', 'fish', 'hplace', 'hpick', 'pave'].includes(a.t);
  if (needsTile && !(isInt(a.x) && isInt(a.z))) return out;
  if (a.t === 'water' && !isDir(a.dx, a.dz)) return out;
  if ((a.t === 'order' || a.t === 'mail') && !Number.isInteger(a.i)) return out;
  if (a.t === 'claim' && a.q !== 'story' && ![0, 1, 2].includes(a.q)) return out;
  out.ok = ACTIONS[a.t](s, a, out);
  if (out.ok) checkAchievements(s, out);
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
  const lx = (at ? at.x : me.x + Math.sin(me.ry) * 0.9) - HOME_X, lz = at ? at.z : me.z + Math.cos(me.ry) * 0.9;
  const x = Math.round(lx), z = Math.round(lz), [, d] = roomSize(s), W = ([i, j]) => [i + HOME_X, j], one = [W([x, z])];
  if (lz > (d - 1) / 2 + 0.3 && Math.abs(lx) < 0.8) return { exit: true, label: '🚪 Hinausgehen', tiles: [], px: lx + HOME_X, pz: lz };
  const h = homeAt(s, x, z) || (sel === 'hand' && homeAt(s, x, z, 'walls')), rug = homeAt(s, x, z, true), base = { px: lx + HOME_X, pz: lz };
  if (h) {
    const f = FURNITURE[h.o.k], tiles = footprint(h.o.k, h.x, h.z, h.o.r).map(W);
    const cx = h.x + ((h.o.r % 2 ? f.d : f.w) - 1) / 2 + HOME_X, cz = h.z + ((h.o.r % 2 ? f.w : f.d) - 1) / 2;
    if (sel === 'hand') return { ...base, a: { t: 'hpick', x, z }, label: '✋ Aufheben', tiles };
    if (f.sit) return { ...base, sit: { x: cx, z: cz, r: h.o.r }, label: '🪑 Hinsetzen', tiles };
    if (f.bed) return { ...base, sleep: { x: cx, z: cz, r: h.o.r, wide: f.w > 1 }, label: '😴 Schlafen gehen', tiles };
    if (h.o.k === 'herd') return { ...base, ui: 'cook', label: '🍳 Kochen', tiles };
    return { ...base, label: `${f.icon} ${f.name}`, tiles };
  }
  if (rug && sel === 'hand') return { ...base, a: { t: 'hpick', x, z }, label: '✋ Teppich aufheben', tiles: footprint(rug.o.k, rug.x, rug.z, rug.o.r).map(W) };
  if (ITEMS[sel]?.furn) {
    const f = FURNITURE[sel], r = f.wall ? wallRot(s, x, z) : (Math.round(me.ry / (Math.PI / 2)) + 2 + 400) % 4; // schaut zu dir
    const ok = r >= 0 && canFurnish(s, sel, x, z, r);
    return { ...base, ...(ok ? { a: { t: 'hplace', x, z, item: sel, r }, label: '📍 Hinstellen' } : { label: f.wall ? 'Nur an eine Wand' : 'Hier ist kein Platz' }), tiles: r >= 0 ? footprint(sel, x, z, r).map(W) : one };
  }
  if (PLACE[sel] || ITEMS[sel]?.seed) return { ...base, label: 'Das gehört nach draußen', tiles: one };
  return { ...base, label: '', tiles: one };
}


export function resolve(s, me, sel, at) {
  if (inside(me)) return resolveHome(s, me, sel, at);
  const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9;
  const x = Math.round(px), z = Math.round(pz), k = key(x, z);
  const toward = at && (x !== Math.round(me.x) || z !== Math.round(me.z)) ? Math.atan2(x - me.x, z - me.z) : me.ry;
  const [dx, dz] = facing(toward);
  const one = [[x, z]];

  const b = buildingAt(x, z);
  if (b === 'house') return { enter: true, label: '🚪 Hineingehen', tiles: one };
  if (b) {
    const B = BUILDINGS[b];
    if (B.use === 'plaza') return { label: '🌳 Der Dorfbaum', tiles: one };
    if (B.use === 'visit') return { visit: B.npc, label: `🚪 ${B.name}`, tiles: one };
    const label = { sell: '💰 Verkaufen', shop: '🛒 Krämerladen', orders: b === 'office' ? '🏕️ Inselbüro' : '📋 Schwarzes Brett', farm: '🏡 Haus', craft: '🔨 Werkbank', cook: '🍳 Kochen', museum: '🏛️ Museum', mail: s.mail.length ? `💌 Post (${s.mail.length})` : '📭 Briefkasten' }[B.use];
    return { ui: B.use, label, tiles: one };
  }

  const res = RES_SPOTS[k];
  if (res === 'tree' || res === 'palm') {
    const fruit = TREE_FRUIT[k], ready = fruitReady(s, k), ic = ITEMS[fruit]?.icon || '🌳';
    if (sel === 'axe') return s.res[k] > 0 ? { a: { t: 'chop', x, z }, label: '🪓 Holz hacken', tiles: one } : { label: '🌳 Morgen wieder', tiles: one };
    return { a: { t: 'shake', x, z }, label: ready ? `${ic} Schütteln` : '🌳 Schütteln', tiles: one };
  }
  if (res === 'rock') {
    if (sel === 'shovel') return s.res[k] > 0 ? { a: { t: 'mine', x, z }, label: '🪨 Draufhauen', tiles: one } : { label: '🪨 Morgen wieder', tiles: one };
    return { label: '🪨 Felsen · mit der Schaufel draufhauen', tiles: one };
  }
  if (s.shells?.[k]) return { a: { t: 'pick', x, z }, label: `${ITEMS[s.shells[k]].icon} Aufheben`, tiles: one };
  if (s.weeds?.[k] && sel !== 'shovel') return { a: { t: 'pick', x, z }, label: '🌿 Unkraut zupfen', tiles: one };

  if (sel === 'net') return { net: { x: px, z: pz }, label: '🦋 Kescher schwingen', tiles: [] };
  if (sel === 'sling') {
    const b = s.balloon && balloonPos(s.balloon, s.time);
    if (b && Math.hypot(b.x - me.x, b.z - me.z) < 5) return { a: { t: 'pop', id: s.balloon.id }, label: '🎯 Schießen!', tiles: [] };
    return { label: s.balloon ? '🎈 Lauf unter den Ballon!' : '🎈 Kein Ballon in Sicht', tiles: [] };
  }
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
    if (sel === 'hand') return { a: { t: 'pickup', x, z }, label: '✋ Aufheben', tiles: one };
    if (p.kind === 'producer') return { a: { t: 'use', x, z }, label: `${ITEMS[p.item].icon} Pflücken`, tiles: one };
    if (o.k === 'bank' || p.sit) return { sit: { x, z, r: o.r }, label: '🪑 Hinsetzen', tiles: one };
    if (o.k === 'kirschbaum') return { petals: { x, z }, label: '🌸 Schütteln', tiles: one };
    return { label: p.icon + ' ' + p.name, tiles: one };
  }

  if (isWater(px, pz) || (!walkable(px, pz) && isWater(px + (px - me.x) * 0.5, pz + (pz - me.z) * 0.5))) return { fish: true, label: '🎣 Angeln', tiles: [] };

  const t = s.tiles[k];
  if (sel === 'shovel') {
    if (s.digs.includes(k)) return { a: { t: 'dig', x, z }, label: '✨ Ausgraben', tiles: one };
    if (t) return { a: { t: 'dig', x, z }, label: '🌱 Ausgraben', tiles: one };
    if (s.weeds?.[k]) return { a: { t: 'pick', x, z }, label: '🌿 Unkraut zupfen', tiles: one };
    return { label: '', tiles: one };
  }
  if (sel === 'can') {
    const tiles = area(s.up.can, x, z, dx, dz);
    return tiles.some(([i, j]) => s.tiles[key(i, j)]) ? { a: { t: 'water', x, z, dx, dz }, label: '💧 Gießen', tiles } : { label: '', tiles: one };
  }
  if (t && t.c && stage(t.c) === 3) return { a: { t: 'harvest', x, z }, label: `${CROPS[t.c.k].icon} ${isFlower(t.c.k) ? 'Pflücken' : 'Ernten'}`, tiles: one };
  if (ITEMS[sel]?.seed) return canPlace(s, x, z) ? { a: { t: 'plant', x, z, item: sel }, label: `${ITEMS[sel].icon} Pflanzen`, tiles: one } : { label: 'Hier kann man nichts pflanzen', tiles: one };
  if (PLACE[sel]) return canPlace(s, x, z)
    ? { a: { t: 'place', x, z, item: sel, r: (Math.round(me.ry / (Math.PI / 2)) % 4 + 4) % 4 }, label: '📍 Aufstellen', tiles: one }
    : { label: 'Hier ist kein Platz', tiles: one };
  return { label: '', tiles: one };
}

// Was es auf welchem Level neu gibt (für die Level-Up-Meldung).
export function unlocksAt(l) {
  const out = [];
  for (const c of Object.values(CROPS)) if (c.lvl === l) out.push(c.icon + ' ' + c.name);
  for (const p of Object.values(PLACE)) if (p.lvl === l) out.push(p.icon + ' ' + p.name);
  for (const [, u] of Object.entries(UPGRADES)) if (u.req.includes(l)) out.push(u.icon + ' ' + u.name);
  return [...new Set(out)];
}
