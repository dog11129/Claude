// Spiellogik ohne Grafik: Welt-Zustand, Zeit, Aktionen. Läuft beim Host; Gäste rechnen nur zur Anzeige mit.
import {
  DAY, WET, MAP, CROPS, ANIMALS, ANIMAL_NAMES, PENS, BUILDINGS, POND, FIELDS, ITEMS, FISH, PLACE,
  MACHINE_CAP, UPGRADES, needXp, MAX_LEVEL,
} from './data.js';

export const key = (x, z) => x + ',' + z;
const rnd = n => Math.floor(Math.random() * n);
const pick = arr => arr[rnd(arr.length)];

export function newFarm(name = 'Kuschelhof') {
  const s = {
    v: 1, id: Math.random().toString(36).slice(2, 10), name, code: null,
    time: 0, day: 1, dayTime: 0.02, weather: 'sun',
    money: 150, xp: 0, level: 1,
    inv: { s_weizen: 10, s_karotte: 6, futter: 0 },
    up: {}, tiles: {}, obj: {}, animals: [], orders: [], nextId: 1,
    stats: { harvested: 0, earned: 0, fish: 0, orders: 0 },
  };
  for (const [k, u] of Object.entries(UPGRADES)) s.up[k] = u.start;
  for (let x = -5; x <= -2; x++) for (let z = 1; z <= 2; z++) s.tiles[key(x, z)] = { w: 0 };
  s.obj[key(-3, -4)] = { k: 'blumen', r: 0 };
  s.obj[key(2, -4)] = { k: 'blumen', r: 0 };
  fillOrders(s);
  return s;
}

// Alte Spielstände mit neuen Feldern ergänzen, damit Updates nichts kaputt machen.
export function migrate(s) {
  const base = newFarm(s.name);
  for (const k of Object.keys(base)) if (s[k] === undefined) s[k] = base[k];
  for (const k of Object.keys(UPGRADES)) if (s.up[k] === undefined) s.up[k] = UPGRADES[k].start;
  for (const k of Object.keys(base.stats)) if (s.stats[k] === undefined) s.stats[k] = 0;
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
  return Math.abs(x) < MAP && Math.abs(z) < MAP && !buildingAt(x, z) && !inPond(x, z) && !s.tiles[k] && !s.obj[k];
}

// Kann man an dieser Weltposition stehen?
export function blocked(s, x, z) {
  if (Math.abs(x) > MAP || Math.abs(z) > MAP) return true;
  if ((x - POND.cx) ** 2 + (z - POND.cz) ** 2 < (POND.r - 0.1) ** 2) return true;
  const tx = Math.round(x), tz = Math.round(z);
  if (buildingAt(tx, tz)) return true;
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
  const rain = s.weather === 'rain';
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
        t.c.g = Math.min(CROPS[t.c.k].grow, t.c.g + dt);
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
  s.weather = s.day > 2 && Math.random() < 0.22 ? 'rain' : 'sun';
  for (const a of s.animals) a.pet = 0;
  s.orders = s.orders.filter(o => s.day - o.day < 3);
  fillOrders(s);
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
    s.orders.push({ item, n, reward, xp: n * 3 + 5, day: s.day });
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
const fx = (out, x, z, txt) => out.fx.push({ x, z, txt });

const ACTIONS = {
  till(s, a, out) {
    let n = 0;
    for (const [x, z] of area(s.up.hoe, a.x, a.z, a.dx, a.dz)) {
      if (!inField(s, x, z) || s.tiles[key(x, z)] || s.obj[key(x, z)]) continue;
      s.tiles[key(x, z)] = { w: 0 };
      n++;
    }
    out.snd = 'till';
    return n > 0;
  },
  water(s, a, out) {
    let n = 0;
    for (const [x, z] of area(s.up.can, a.x, a.z, a.dx, a.dz)) {
      const t = s.tiles[key(x, z)];
      if (t) { t.w = WET; n++; }
    }
    if (n) fx(out, a.x, a.z, '💧');
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
      fx(out, a.x, a.z, `+${p.n} ${ITEMS[p.item].icon}`);
      out.snd = 'harvest';
      return true;
    }
    if (p.kind !== 'machine') return false;
    let did = false;
    if (o.o > 0) {
      addInv(s, p.out, o.o);
      addXp(s, ITEMS[p.out].xp * o.o, out);
      fx(out, a.x, a.z, `+${o.o} ${ITEMS[p.out].icon}`);
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
      fx(out, pos.x, pos.z, `+${n} ${ITEMS[d.product].icon}`);
      out.snd = 'harvest';
      return true;
    }
    if (an.fed <= 0) {
      const food = takeInv(s, 'futter', 1) ? 'futter' : takeInv(s, 'weizen', 1) ? 'weizen' : null;
      if (!food) { out.msg = `${an.name} hat Hunger! Kaufe Futter 🌿 oder ernte Weizen 🌾.`; return false; }
      an.fed = DAY;
      fx(out, pos.x, pos.z, '😋');
      out.snd = 'plant';
      return true;
    }
    if (!an.pet) { an.pet = 1; an.love = Math.min(10, an.love + 1); addXp(s, 1, out); }
    fx(out, pos.x, pos.z, '❤️');
    out.snd = 'love';
    return true;
  },
  fish(s, a, out) {
    const l = s.up.rod - 1, total = FISH.reduce((t, f) => t + f[1][l], 0);
    let r = Math.random() * total, id = FISH[0][0];
    for (const [f, w] of FISH) { if ((r -= w[l]) < 0) { id = f; break; } }
    addInv(s, id, 1);
    s.stats.fish++;
    addXp(s, ITEMS[id].xp, out);
    fx(out, a.x, a.z, `+1 ${ITEMS[id].icon}`);
    out.caught = id;
    out.snd = 'harvest';
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
    if (u.done) return false;
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
    if (!o) return false;
    if (!takeInv(s, o.item, o.n)) { out.msg = 'Dafür fehlt noch etwas.'; return false; }
    s.money += o.reward;
    s.stats.earned += o.reward;
    s.stats.orders++;
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
  const needsTile = ['till', 'water', 'plant', 'harvest', 'place', 'pickup', 'use'].includes(a.t);
  if (needsTile && !(isInt(a.x) && isInt(a.z))) return out;
  if (['till', 'water', 'plant', 'harvest'].includes(a.t) && !isDir(a.dx, a.dz)) return out;
  if (a.t === 'order' && !Number.isInteger(a.i)) return out;
  out.ok = ACTIONS[a.t](s, a, out);
  return out;
}

// ---------- Was passiert, wenn ich jetzt die Aktionstaste drücke? (läuft lokal beim Spieler) ----------

export function facing(ry) {
  const fx = Math.sin(ry), fz = Math.cos(ry);
  return Math.abs(fx) > Math.abs(fz) ? [Math.sign(fx), 0] : [0, Math.sign(fz)];
}

export function resolve(s, me, sel) {
  const px = me.x + Math.sin(me.ry) * 0.9, pz = me.z + Math.cos(me.ry) * 0.9;
  const x = Math.round(px), z = Math.round(pz), k = key(x, z);
  const [dx, dz] = facing(me.ry);
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
    const label = { sell: '💰 Verkaufen', shop: '🛒 Einkaufen', orders: '📋 Aufträge', farm: '🏡 Farm', animals: '🐾 Tiere' }[B.use];
    return { ui: B.use, label, tiles: one };
  }

  const o = s.obj[k];
  if (o) {
    const p = PLACE[o.k];
    if (sel === 'hoe') return { a: { t: 'pickup', x, z }, label: '✋ Aufheben', tiles: one };
    if (p.kind === 'machine') return { a: { t: 'use', x, z }, label: o.o ? `${ITEMS[p.out].icon} Abholen` : '⚙️ Befüllen', tiles: one };
    if (p.kind === 'producer') return { a: { t: 'use', x, z }, label: `${ITEMS[p.item].icon} Pflücken`, tiles: one };
    return { label: p.icon + ' ' + p.name, tiles: one };
  }

  if ((px - POND.cx) ** 2 + (pz - POND.cz) ** 2 < (POND.r + 0.3) ** 2) return { fish: true, label: '🎣 Angeln', tiles: [] };

  const t = s.tiles[k];
  if (t && t.c && stage(t.c) === 3) return { a: { t: 'harvest', x, z, dx, dz }, label: `${CROPS[t.c.k].icon} Ernten`, tiles: area(s.up.sickle, x, z, dx, dz) };

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
