// Spiellogik ohne Grafik: Welt-Zustand, Zeit, Aktionen. Läuft beim Host; Gäste rechnen nur zur Anzeige mit.
import {
  DAY, WET, MAP, CROPS, ANIMALS, ANIMAL_NAMES, PENS, BUILDINGS, POND, FIELDS, ITEMS, FISH, PLACE,
  MACHINE_CAP, UPGRADES, needXp, MAX_LEVEL, ACHIEVEMENTS, SEASON_LEN, SEASON_IDS,
  RES_SPOTS, BUGS, FOSSILS, RECIPES, DIG_SPOTS_PER_DAY, NPC_DATA, NPC_IDS,
} from './data.js';

export const key = (x, z) => x + ',' + z;
export const seasonOf = day => SEASON_IDS[Math.floor((day - 1) / SEASON_LEN) % 4];
export const inSeason = (s, k) => CROPS[k].sea.includes(seasonOf(s.day));
const rnd = n => Math.floor(Math.random() * n);
const pick = arr => arr[rnd(arr.length)];

export function newFarm(name = 'Kuschelhof') {
  const s = {
    v: 1, id: Math.random().toString(36).slice(2, 10), name, code: null,
    time: 0, day: 1, dayTime: 0.02, weather: 'sun',
    money: 150, xp: 0, level: 1,
    inv: { s_weizen: 10, s_karotte: 6, futter: 0 },
    up: {}, tiles: {}, obj: {}, animals: [], orders: [], nextId: 1, ach: {},
    album: {}, res: {}, shook: {}, digs: [], mail: [], npc: {},
    stats: { harvested: 0, earned: 0, fish: 0, orders: 0, treasure: 0, bugs: 0, dug: 0, cooked: 0, crafted: 0, wood: 0 },
  };
  for (const [k, u] of Object.entries(UPGRADES)) s.up[k] = u.start;
  for (let x = -5; x <= -2; x++) for (let z = 1; z <= 2; z++) s.tiles[key(x, z)] = { w: 0 };
  s.obj[key(-3, -4)] = { k: 'blumen', r: 0 };
  s.obj[key(2, -4)] = { k: 'blumen', r: 0 };
  s.inv.holz = 0;
  refill(s);
  fillOrders(s);
  return s;
}

export const friend = (s, id) => (s.npc[id] ||= { f: 0, talk: 0, gift: 0, sent: [] });
export const hearts = (s, id) => Math.min(10, Math.floor((s.npc[id]?.f || 0) / 100));

// Nachbarn spazieren um ihren Lieblingsort (alle Spieler sehen dasselbe); nachts sind sie zu Hause
export function npcPos(id, t) {
  const [cx, cz, rx, rz] = NPC_DATA[id].spot, h = NPC_IDS.indexOf(id) * 1.7 + 0.5;
  const ph = t * 0.05 + h, f = Math.floor(ph), r = ph - f;
  const e = f + r * r * (3 - 2 * r);
  return { x: cx + rx * Math.sin(e * 1.1 + h), z: cz + rz * Math.sin(e * 0.8 + h * 1.9), walking: r > 0.12 && r < 0.88 };
}
export const npcAwake = s => { const h = 6 + s.dayTime * 18; return h >= 7 && h < 21.5; };

// Morgens: Bäume & Felsen auffüllen, neue Grabstellen verstecken
function refill(s) {
  for (const [k, kind] of Object.entries(RES_SPOTS)) s.res[k] = 3;
  s.shook = {};
  s.digs = [];
  for (let tries = 0; s.digs.length < DIG_SPOTS_PER_DAY && tries < 200; tries++) {
    const x = rnd(2 * MAP - 1) - MAP + 1, z = rnd(2 * MAP - 1) - MAP + 1, k = key(x, z);
    if (canPlace(s, x, z) && !inField(s, x, z) && !s.digs.includes(k) && !nearPath(x, z)) s.digs.push(k);
  }
}
const nearPath = (x, z) => Math.abs(x) <= 1 && z < 0;

// Alte Spielstände mit neuen Feldern ergänzen, damit Updates nichts kaputt machen.
export function migrate(s) {
  const base = newFarm(s.name);
  for (const k of Object.keys(base)) if (s[k] === undefined) s[k] = base[k];
  for (const k of Object.keys(UPGRADES)) if (s.up[k] === undefined) s.up[k] = UPGRADES[k].start;
  for (const k of Object.keys(base.stats)) if (s.stats[k] === undefined) s.stats[k] = 0;
  for (const k of ['money', 'xp', 'time', 'dayTime']) if (!Number.isFinite(s[k])) s[k] = 0;
  for (const k of ['level', 'day']) if (!Number.isInteger(s[k]) || s[k] < 1) s[k] = 1;
  for (const [k, o] of Object.entries(s.obj)) {
    const p = PLACE[o?.k], [x, z] = k.split(',').map(Number);
    if (p && !buildingAt(x, z)) continue;
    if (p) {
      addInv(s, o.k, 1);
      if (o.o) addInv(s, p.out, o.o);
      if (o.n) addInv(s, p.in[0], o.n);
    }
    delete s.obj[k];
  }
  return s;
}

export const stage = c => {
  const g = CROPS[c.k].grow;
  return c.g >= g ? 3 : Math.min(2, Math.floor(c.g / g * 3));
};

export function inField(s, x, z) {
  const [x0, z0, x1, z1] = FIELDS[s.up.field];
  return x >= x0 && x <= x1 && z >= z0 && z <= z1;
}

export function buildingAt(x, z) {
  for (const [id, b] of Object.entries(BUILDINGS)) if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) return id;
  return null;
}

export const inPond = (x, z) => (x - POND.cx) ** 2 + (z - POND.cz) ** 2 <= POND.r ** 2;

export function canPlace(s, x, z) {
  const k = key(x, z);
  return Math.abs(x) < MAP && Math.abs(z) < MAP && !buildingAt(x, z) && !inPond(x, z) && !s.tiles[k] && !s.obj[k] && !RES_SPOTS[k];
}

// Kann man an dieser Weltposition stehen?
export function blocked(s, x, z) {
  if (Math.abs(x) > MAP || Math.abs(z) > MAP) return true;
  if ((x - POND.cx) ** 2 + (z - POND.cz) ** 2 < (POND.r - 0.1) ** 2) return true;
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
  const pen = PENS[ANIMALS[a.k].home];
  const h = a.id * 2.399;
  const ph = t * (0.07 + (a.id % 5) * 0.013) + h;
  const f = Math.floor(ph), r = ph - f;
  const e = f + r * r * (3 - 2 * r); // laufen – kurz stehen bleiben – weiterlaufen
  return { x: pen.cx + pen.rx * Math.sin(e * 1.3 + h), z: pen.cz + pen.rz * Math.sin(e * 0.9 + h * 2.1), walking: r > 0.08 && r < 0.92 };
}

export const price = (s, id) => Math.round(ITEMS[id].sell * (1 + 0.2 * (s.up['q_' + ITEMS[id].cat] || 0)));
export const capacity = (s, home) => s.up[home] * 4;
export const animalCount = (s, home) => s.animals.filter(a => ANIMALS[a.k].home === home).length;

export function upgradeInfo(s, id) {
  const u = UPGRADES[id], l = s.up[id], i = l - u.start, max = u.start + u.cost.length;
  return { level: l, max, done: l >= max, cost: u.cost[i], req: u.req[i] };
}

// ---------- Zeit ----------

export function tick(s, dt, auth) {
  let changed = false;
  s.time += dt;
  s.dayTime += dt / DAY;
  if (s.dayTime >= 1) {
    if (auth) { newDay(s); changed = true; } else s.dayTime = 0.9999;
  }
  const rain = s.weather !== 'sun'; // Regen und Schnee gießen
  const sea = seasonOf(s.day);
  for (const [k, o] of Object.entries(s.obj)) {
    const p = PLACE[o.k];
    if (p.kind === 'sprinkler') {
      const [x, z] = k.split(',').map(Number);
      for (let i = -p.r; i <= p.r; i++) for (let j = -p.r; j <= p.r; j++) {
        const t = s.tiles[key(x + i, z + j)];
        if (t) { if (!t.w) changed = true; t.w = WET; }
      }
    } else if (p.kind === 'machine' && o.n > 0) {
      o.t += dt;
      if (o.t >= p.time) { o.t = 0; o.n--; o.o++; changed = true; }
    } else if (p.kind === 'producer' && o.t < p.every) {
      o.t = Math.min(p.every, o.t + dt);
      if (o.t >= p.every) changed = true;
    }
  }
  for (const t of Object.values(s.tiles)) {
    if (rain) { if (!t.w) changed = true; t.w = WET; }
    if (t.w > 0) {
      if (t.c && t.c.g < CROPS[t.c.k].grow) {
        const before = stage(t.c);
        t.c.g = Math.min(CROPS[t.c.k].grow, t.c.g + dt * (CROPS[t.c.k].sea.includes(sea) ? 1 : 0.5));
        if (stage(t.c) !== before) changed = true;
      }
      t.w -= dt;
      if (t.w <= 0) { t.w = 0; changed = true; }
    }
  }
  for (const a of s.animals) {
    if (a.fed <= 0) continue;
    a.fed = Math.max(0, a.fed - dt);
    if (!a.fed) changed = true;
    if (!a.ready) {
      a.p += dt;
      if (a.p >= ANIMALS[a.k].time) { a.ready = true; changed = true; }
    }
  }
  return changed;
}

function newDay(s) {
  s.day++;
  s.dayTime = 0;
  const sea = seasonOf(s.day), wet = { spring: 0.25, summer: 0.15, autumn: 0.28, winter: 0.35 }[sea];
  s.weather = s.day > 2 && Math.random() < wet ? (sea === 'winter' ? 'snow' : 'rain') : 'sun';
  for (const a of s.animals) a.pet = 0;
  s.orders = s.orders.filter(o => s.day - o.day < 3);
  refill(s);
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

// ---------- Aufträge ----------

function orderCandidates(s) {
  const c = Object.keys(CROPS).filter(k => CROPS[k].lvl <= s.level);
  for (const a of s.animals) c.push(ANIMALS[a.k].product);
  for (const o of Object.values(s.obj)) {
    const p = PLACE[o.k];
    if (p.kind === 'machine') c.push(p.out);
    if (p.kind === 'producer') c.push(p.item);
  }
  if (s.stats.fish > 0) c.push('barsch', 'forelle');
  const taken = new Set(s.orders.map(o => o.item));
  const free = [...new Set(c)].filter(k => !taken.has(k));
  return free.length ? free : c;
}

function fillOrders(s) {
  while (s.orders.length < 3) {
    const item = pick(orderCandidates(s));
    const n = CROPS[item] ? 4 + rnd(9) : 1 + rnd(4);
    const reward = Math.round(ITEMS[item].sell * n * 1.6 / 5) * 5 + 20;
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
const isInt = v => Number.isInteger(v) && Math.abs(v) <= MAP + 4;
const isCount = v => Number.isInteger(v) && v > 0 && v <= 9999;
const isDir = (dx, dz) => [-1, 0, 1].includes(dx) && [-1, 0, 1].includes(dz) && Math.abs(dx) + Math.abs(dz) === 1;
const has = (o, k) => typeof k === 'string' && Object.hasOwn(o, k);
const fx = (out, x, z, txt, k) => out.fx.push({ x, z, txt, k }); // k = Partikel-Art für die Grafik

const ACTIONS = {
  till(s, a, out) {
    let n = 0;
    for (const [x, z] of area(s.up.hoe, a.x, a.z, a.dx, a.dz)) {
      if (!inField(s, x, z) || s.tiles[key(x, z)] || s.obj[key(x, z)]) continue;
      s.tiles[key(x, z)] = { w: 0 };
      fx(out, x, z, '', 'dirt');
      n++;
    }
    out.snd = 'till';
    return n > 0;
  },
  water(s, a, out) {
    let n = 0;
    for (const [x, z] of area(s.up.can, a.x, a.z, a.dx, a.dz)) {
      const t = s.tiles[key(x, z)];
      if (t) { t.w = WET; n++; fx(out, x, z, '', 'water'); }
    }
    out.snd = 'water';
    return n > 0;
  },
  plant(s, a, out) {
    if (!has(ITEMS, a.item) || !ITEMS[a.item].seed) return false;
    const k = ITEMS[a.item].seed;
    let n = 0;
    for (const [x, z] of area(s.up.hoe, a.x, a.z, a.dx, a.dz)) {
      const t = s.tiles[key(x, z)];
      if (!t || t.c || !takeInv(s, a.item, 1)) continue;
      t.c = { k, g: 0 };
      fx(out, x, z, '', 'seed');
      n++;
    }
    out.snd = 'plant';
    return n > 0;
  },
  harvest(s, a, out) {
    const got = {};
    let xp = 0;
    for (const [x, z] of area(s.up.sickle, a.x, a.z, a.dx, a.dz)) {
      const t = s.tiles[key(x, z)];
      if (!t || !t.c || stage(t.c) < 3) continue;
      const c = CROPS[t.c.k], n = c.yield || 1;
      got[t.c.k] = (got[t.c.k] || 0) + n;
      addInv(s, t.c.k, n);
      xp += c.xp * n;
      s.stats.harvested += n;
      s.stats['h_' + t.c.k] = (s.stats['h_' + t.c.k] || 0) + n;
      fx(out, x, z, '', 'leaf');
      if (c.regrow) t.c.g = c.grow - c.regrow; else delete t.c;
    }
    const entries = Object.entries(got);
    if (!entries.length) return false;
    fx(out, a.x, a.z, entries.map(([k, n]) => `+${n} ${ITEMS[k].icon}`).join(' '));
    addXp(s, xp, out);
    out.snd = 'harvest';
    return true;
  },
  place(s, a, out) {
    if (!has(PLACE, a.item) || !canPlace(s, a.x, a.z) || !takeInv(s, a.item, 1)) return false;
    const o = { k: a.item, r: [0, 1, 2, 3].includes(a.r) ? a.r : 0 };
    const kind = PLACE[a.item].kind;
    if (kind === 'machine') Object.assign(o, { n: 0, t: 0, o: 0 });
    if (kind === 'producer') o.t = 0;
    s.obj[key(a.x, a.z)] = o;
    fx(out, a.x, a.z, '', 'dust');
    out.snd = 'place';
    return true;
  },
  pickup(s, a, out) {
    const k = key(a.x, a.z), o = s.obj[k];
    if (!o) return false;
    if (o.n > 0) { out.msg = 'Die Maschine arbeitet noch.'; return false; }
    if (o.o) addInv(s, PLACE[o.k].out, o.o);
    delete s.obj[k];
    addInv(s, o.k, 1);
    fx(out, a.x, a.z, '', 'dust');
    out.snd = 'place';
    return true;
  },
  use(s, a, out) { // Maschine befüllen/leeren oder Baum/Bienenstock ernten
    const o = s.obj[key(a.x, a.z)];
    if (!o) return false;
    const p = PLACE[o.k];
    if (p.kind === 'producer') {
      if (o.t < p.every) { out.msg = `${p.name}: noch nicht so weit.`; return false; }
      o.t = 0;
      addInv(s, p.item, p.n);
      addXp(s, ITEMS[p.item].xp * p.n, out);
      fx(out, a.x, a.z, `+${p.n} ${ITEMS[p.item].icon}`, 'leaf');
      out.snd = 'harvest';
      return true;
    }
    if (p.kind !== 'machine') return false;
    let did = false;
    if (o.o > 0) {
      addInv(s, p.out, o.o);
      addXp(s, ITEMS[p.out].xp * o.o, out);
      fx(out, a.x, a.z, `+${o.o} ${ITEMS[p.out].icon}`, 'sparkle');
      o.o = 0;
      did = true;
    }
    let loaded = 0;
    for (const id of p.in) {
      const n = Math.min(s.inv[id] || 0, MACHINE_CAP - o.n - o.o);
      if (n > 0) { takeInv(s, id, n); o.n += n; loaded += n; }
    }
    if (loaded) { fx(out, a.x, a.z + 0.01, `${loaded}× rein`); did = true; }
    if (!did) out.msg = `${p.name} braucht ${p.in.map(i => ITEMS[i].icon + ' ' + ITEMS[i].name).join(' oder ')}.`;
    out.snd = did ? 'coin' : null;
    return did;
  },
  animal(s, a, out) {
    const an = s.animals.find(x => x.id === a.id);
    if (!an) return false;
    const d = ANIMALS[an.k], pos = animalPos(an, s.time);
    if (an.ready) {
      const n = 1 + (Math.random() < an.love / 20 ? 1 : 0);
      addInv(s, d.product, n);
      addXp(s, ITEMS[d.product].xp * n, out);
      an.ready = false;
      an.p = 0;
      fx(out, pos.x, pos.z, `+${n} ${ITEMS[d.product].icon}`, 'sparkle');
      out.snd = 'harvest';
      return true;
    }
    if (an.fed <= 0) {
      const food = takeInv(s, 'futter', 1) ? 'futter' : takeInv(s, 'weizen', 1) ? 'weizen' : null;
      if (!food) { out.msg = `${an.name} hat Hunger! Kaufe Futter 🌿 oder ernte Weizen 🌾.`; return false; }
      an.fed = DAY;
      fx(out, pos.x, pos.z, '😋', 'seed');
      out.snd = 'plant';
      return true;
    }
    if (!an.pet) { an.pet = 1; an.love = Math.min(10, an.love + 1); addXp(s, 1, out); }
    fx(out, pos.x, pos.z, '❤️', 'heart');
    out.snd = 'love';
    return true;
  },
  fish(s, a, out) {
    const l = s.up.rod - 1, sea = seasonOf(s.day);
    const id = weighted(FISH.filter(f => !f[2] || f[2].includes(sea)), f => f[1][l])[0];
    addInv(s, id, 1);
    collect(s, id, out);
    s.stats.fish++;
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
    const [id, name, icon] = weighted(pool, b => b[6]);
    addInv(s, id, 1);
    collect(s, id, out);
    s.stats.bugs = (s.stats.bugs || 0) + 1;
    addXp(s, ITEMS[id].xp, out);
    fx(out, a.x, a.z, `+1 ${icon}`, 'sparkle');
    out.caught = id;
    out.snd = 'harvest';
    return true;
  },
  chop(s, a, out) {
    const k = key(a.x, a.z);
    if (RES_SPOTS[k] !== 'tree') return false;
    if (!(s.res[k] > 0)) { out.msg = 'Der Baum braucht eine Pause – morgen wieder!'; return false; }
    s.res[k]--;
    const n = Math.random() < 0.3 ? 2 : 1;
    addInv(s, 'holz', n);
    s.stats.wood = (s.stats.wood || 0) + n;
    addXp(s, 1, out);
    fx(out, a.x, a.z, `+${n} 🪵`, 'leaf');
    out.snd = 'till';
    return true;
  },
  mine(s, a, out) {
    const k = key(a.x, a.z);
    if (RES_SPOTS[k] !== 'rock') return false;
    if (!(s.res[k] > 0)) { out.msg = 'Der Felsen ist für heute leer.'; return false; }
    s.res[k]--;
    const id = Math.random() < 0.06 ? 'kristall' : 'stein';
    addInv(s, id, 1);
    if (id === 'kristall') collect(s, id, out);
    addXp(s, 1, out);
    fx(out, a.x, a.z, `+1 ${ITEMS[id].icon}`, 'dust');
    out.snd = 'place';
    return true;
  },
  shake(s, a, out) {
    const k = key(a.x, a.z);
    if (RES_SPOTS[k] !== 'tree') return false;
    if (s.shook[k]) { out.msg = 'Hier fällt heute nichts mehr runter.'; return false; }
    s.shook[k] = 1;
    const r = Math.random(), id = r < 0.45 ? 'holz' : r < 0.8 ? 'apfel' : null;
    if (id) { addInv(s, id, 1); fx(out, a.x, a.z, `+1 ${ITEMS[id].icon}`, 'leaf'); } else { fx(out, a.x, a.z, '🍃', 'leaf'); out.msg = 'Nur ein paar Blätter …'; }
    out.snd = 'water';
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
      addXp(s, ITEMS[id].xp, out);
      fx(out, a.x, a.z, `+1 ${icon}`, 'dirt');
      out.caught = id;
      out.snd = 'harvest';
      return true;
    }
    if (t && !t.c) { delete s.tiles[k]; fx(out, a.x, a.z, '', 'dirt'); out.snd = 'till'; return true; } // Beet einebnen
    out.msg = 'Hier ist nichts vergraben. Such nach glitzernden Stellen ✨';
    return false;
  },
  craft(s, a, out) {
    if (!has(RECIPES, a.id)) return false;
    const r = RECIPES[a.id];
    if ((r.lvl || 1) > s.level) { out.msg = `Erst ab Level ${r.lvl}.`; return false; }
    if (Object.entries(r.in).some(([id, n]) => (s.inv[id] || 0) < n)) { out.msg = 'Dafür fehlen noch Zutaten.'; return false; }
    for (const [id, n] of Object.entries(r.in)) takeInv(s, id, n);
    addInv(s, r.out, r.n);
    if (r.st === 'cook') s.stats.cooked = (s.stats.cooked || 0) + 1; else s.stats.crafted = (s.stats.crafted || 0) + 1;
    addXp(s, 3 + (ITEMS[r.out].xp || 2), out);
    out.msg = `${r.st === 'cook' ? '🍳' : '🔨'} ${r.n > 1 ? r.n + '× ' : ''}${ITEMS[r.out].name} fertig!`;
    out.snd = 'level';
    return true;
  },
  talk(s, a, out) {
    if (!has(NPC_DATA, a.id)) return false;
    const n = friend(s, a.id);
    if (n.talk !== s.day) { n.talk = s.day; n.f += 15; addXp(s, 1, out); }
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
    addXp(s, 3, out);
    out.reaction = r;
    out.snd = r === 'dislike' ? 'fail' : 'love';
    return true;
  },
  mail(s, a, out) {
    const m = s.mail[a.i];
    if (!m) return false;
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
  buyAnimal(s, a, out) {
    if (!has(ANIMALS, a.id)) return false;
    const d = ANIMALS[a.id];
    if (d.lvl > s.level) { out.msg = `Erst ab Level ${d.lvl}.`; return false; }
    if (animalCount(s, d.home) >= capacity(s, d.home)) {
      out.msg = s.up[d.home] ? 'Kein Platz mehr – baue den Stall aus!' : `Baue zuerst den ${d.home === 'coop' ? 'Hühnerstall' : 'Stall'}.`;
      return false;
    }
    if (s.money < d.cost) { out.msg = 'Nicht genug Taler.'; return false; }
    s.money -= d.cost;
    const used = new Set(s.animals.map(x => x.name));
    const name = ANIMAL_NAMES.find(n => !used.has(n)) || d.name + ' ' + s.nextId;
    s.animals.push({ id: s.nextId++, k: a.id, name, fed: 0, p: 0, ready: false, love: 0, pet: 0 });
    out.msg = `${d.icon} ${name} wohnt jetzt auf eurer Farm!`;
    out.snd = 'love';
    return true;
  },
  sell(s, a, out) {
    if (!has(ITEMS, a.id) || !ITEMS[a.id].sell || !isCount(a.n) || !takeInv(s, a.id, a.n)) return false;
    const m = price(s, a.id) * a.n;
    s.money += m;
    s.stats.earned += m;
    out.msg = `+${m} Taler`;
    out.snd = 'coin';
    return true;
  },
  sellAll(s, a, out) {
    let m = 0;
    for (const [id, n] of Object.entries(s.inv)) {
      if (!ITEMS[id]?.sell || !n) continue;
      m += price(s, id) * n;
      delete s.inv[id];
    }
    if (!m) return false;
    s.money += m;
    s.stats.earned += m;
    out.msg = `Alles verkauft: +${m} Taler`;
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
  const needsTile = ['till', 'water', 'plant', 'harvest', 'place', 'pickup', 'use', 'chop', 'mine', 'shake', 'dig', 'bug', 'fish'].includes(a.t);
  if (needsTile && !(isInt(a.x) && isInt(a.z))) return out;
  if (['till', 'water', 'plant', 'harvest'].includes(a.t) && !isDir(a.dx, a.dz)) return out;
  if ((a.t === 'order' || a.t === 'mail') && !Number.isInteger(a.i)) return out;
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
export function resolve(s, me, sel, at) {
  const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9;
  const x = Math.round(px), z = Math.round(pz), k = key(x, z);
  const toward = at && (x !== Math.round(me.x) || z !== Math.round(me.z)) ? Math.atan2(x - me.x, z - me.z) : me.ry;
  const [dx, dz] = facing(toward);
  const one = [[x, z]];

  let best = null, bd = 1.3;
  for (const an of s.animals) {
    const p = animalPos(an, s.time), d = Math.hypot(p.x - px, p.z - pz);
    if (d < bd) { bd = d; best = an; }
  }
  if (best) {
    const label = best.ready ? `${ITEMS[ANIMALS[best.k].product].icon} Einsammeln` : best.fed <= 0 ? '🌿 Füttern' : '❤️ Streicheln';
    return { a: { t: 'animal', id: best.id }, label, tiles: [] };
  }

  const b = buildingAt(x, z);
  if (b) {
    const B = BUILDINGS[b];
    const label = { sell: '💰 Verkaufen', shop: '🛒 Einkaufen', orders: '📋 Aufträge', farm: '🏡 Farm', animals: '🐾 Tiere', craft: '🔨 Werkeln', cook: '🍳 Kochen', mail: s.mail.length ? `💌 Post (${s.mail.length})` : '📭 Briefkasten' }[B.use];
    return { ui: B.use, label, tiles: one };
  }

  const res = RES_SPOTS[k];
  if (res === 'tree') {
    if (sel === 'axe') return s.res[k] > 0 ? { a: { t: 'chop', x, z }, label: '🪓 Holz hacken', tiles: one } : { label: '🌳 Morgen wieder', tiles: one };
    if (sel === 'hand' || !s.shook[k]) return s.shook[k] ? { label: '🌳 Schon geschüttelt', tiles: one } : { a: { t: 'shake', x, z }, label: '🌳 Schütteln', tiles: one };
    return { label: '🌳 Baum · 🪓 Axt zum Hacken', tiles: one };
  }
  if (res === 'rock') {
    if (sel === 'shovel') return s.res[k] > 0 ? { a: { t: 'mine', x, z }, label: '🪨 Stein abbauen', tiles: one } : { label: '🪨 Morgen wieder', tiles: one };
    return { label: '🪨 Felsen · Schaufel zum Abbauen', tiles: one };
  }

  const o = s.obj[k];
  if (o) {
    const p = PLACE[o.k];
    if (sel === 'hand') return { a: { t: 'pickup', x, z }, label: '✋ Aufheben', tiles: one };
    if (p.kind === 'machine') return { a: { t: 'use', x, z }, label: o.o ? `${ITEMS[p.out].icon} Abholen` : '⚙️ Befüllen', tiles: one };
    if (p.kind === 'producer') return { a: { t: 'use', x, z }, label: `${ITEMS[p.item].icon} Pflücken`, tiles: one };
    if (o.k === 'bank') return { sit: { x, z, r: o.r }, label: '🪑 Hinsetzen', tiles: one };
    if (o.k === 'kirschbaum') return { petals: { x, z }, label: '🌸 Schütteln', tiles: one };
    return { label: p.icon + ' ' + p.name, tiles: one };
  }

  if ((px - POND.cx) ** 2 + (pz - POND.cz) ** 2 < (POND.r + 0.3) ** 2) return { fish: true, label: '🎣 Angeln', tiles: [] };

  const t = s.tiles[k];
  if (t && t.c && stage(t.c) === 3) return { a: { t: 'harvest', x, z, dx, dz }, label: `${CROPS[t.c.k].icon} Ernten`, tiles: area(s.up.sickle, x, z, dx, dz) };
  if (sel === 'net') return { net: { x: px, z: pz }, label: '🦋 Kescher schwingen', tiles: [] };
  if (sel === 'shovel') {
    if (s.digs.includes(k)) return { a: { t: 'dig', x, z }, label: '✨ Ausgraben', tiles: one };
    if (t && !t.c) return { a: { t: 'dig', x, z }, label: '🟫 Beet einebnen', tiles: one };
    return { label: '', tiles: one };
  }

  const tool = (t, lvl, test, label) => {
    const tiles = area(lvl, x, z, dx, dz);
    return tiles.some(test) ? { a: { t, x, z, dx, dz, item: sel }, label, tiles } : null;
  };
  if (sel === 'hoe') return tool('till', s.up.hoe, ([i, j]) => inField(s, i, j) && !s.tiles[key(i, j)] && !s.obj[key(i, j)], '⛏️ Umgraben')
    || { label: inField(s, x, z) ? '' : 'Nur auf dem Feld', tiles: one };
  if (sel === 'can') return tool('water', s.up.can, ([i, j]) => s.tiles[key(i, j)], '💧 Gießen') || { label: '', tiles: one };
  if (ITEMS[sel]?.seed) return tool('plant', s.up.hoe, ([i, j]) => s.tiles[key(i, j)] && !s.tiles[key(i, j)].c, `${ITEMS[sel].icon} Säen`)
    || { label: t ? '' : 'Erst umgraben', tiles: one };
  if (PLACE[sel]) return canPlace(s, x, z)
    ? { a: { t: 'place', x, z, item: sel, r: (Math.round(me.ry / (Math.PI / 2)) % 4 + 4) % 4 }, label: '📍 Platzieren', tiles: one }
    : { label: 'Hier ist kein Platz', tiles: one };
  return { label: '', tiles: one };
}

// Was es auf welchem Level neu gibt (für die Level-Up-Meldung).
export function unlocksAt(l) {
  const out = [];
  for (const c of Object.values(CROPS)) if (c.lvl === l) out.push(c.icon + ' ' + c.name);
  for (const a of Object.values(ANIMALS)) if (a.lvl === l) out.push(a.icon + ' ' + a.name);
  for (const p of Object.values(PLACE)) if (p.lvl === l) out.push(p.icon + ' ' + p.name);
  for (const [id, u] of Object.entries(UPGRADES)) if (u.req.includes(l)) out.push(u.icon + ' ' + u.name);
  return [...new Set(out)];
}
