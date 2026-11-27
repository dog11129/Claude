// Teil von extras9.js – Lebendige Gebiete: in Kiefernwald, Blütenwiese und Kristallhöhle liegen jeden Tag Fundstücke,
// die es nur dort gibt. Ein Bewohner pro Gebiet (Eule Oskar, Hummel Hilde, Maulwurf Grubi) tauscht sie gegen eigene
// Möbel und Deko. Dazu Ereignisse: weißer Hirsch am Morgen, Pilzkreis in der Nacht, Schmetterlingstanz, Kristallklang.
import { ITEMS } from '../data.js';
import { AREAS, NODES, nodeAt, pathX, areaBlock, CAVE_LAKE } from '../areas.js';
import * as X from '../extras.js';
import { hour } from './util.js';
import { areaTreesInside } from '../decotrees.js';

const h32 = (a, b) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 13; return ((Math.imul(h, 0x27d4eb2f) ^ (h >>> 16)) >>> 0) / 4294967296; };
const code = s => [...s].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) | 0;

// Bewohner (fester Platz, lokale Kachel) mit Tauschliste
export const CREATURES = {
  wald: { panel: 'oskar', name: 'Eule Oskar', icon: '🦉', at: [4, 4], hello: 'Huhu! Wer bringt mir Moos und Federn? Ich schnitze daraus die schönsten Dinge.' },
  wiese: { panel: 'hilde', name: 'Hummel Hilde', icon: '🐝', at: [-6, 6], hello: 'Summ summ! Pusteblumen, Klee und Morgentau – daraus mache ich Wiesenschätze.' },
  hoehle: { panel: 'grubi', name: 'Maulwurf Grubi', icon: '⛏️', at: [6, 5], hello: 'Glück auf! Leuchtmoos, Tropfstein, Kristallblumen … und Geoden knacke ich dir auch.' },
};
export const PANEL_AREA = Object.fromEntries(Object.entries(CREATURES).map(([id, c]) => [c.panel, id]));
export const TRADES = {
  wald: [['eulenuhr', { eulenfeder: 3, waldmoos: 4 }], ['baumstumpfhocker', { waldmoos: 6, holz: 5 }], ['geweihleuchter', { geweihstange: 1, harzperle: 2 }], ['mooslaterne', { waldmoos: 4, harzperle: 1 }]],
  wiese: [['pusteblumenlampe', { pusteblume: 5 }], ['kleeteppich', { gluecksklee: 2, pusteblume: 4 }], ['hummelkissen', { goldstaub: 3, morgentau: 2 }], ['wiesenschaukel', { goldstaub: 3, morgentau: 3, holz: 10 }]],
  hoehle: [['leuchtmoosglas', { leuchtmoos: 5 }], ['kristallspiegel', { kristallblume: 1, tropfstein: 4 }], ['geodentisch', { tropfstein: 6, leuchtmoos: 3 }], ['kristallsaeule', { kristallblume: 2, leuchtmoos: 4 }]],
};
export const GEODE_GEMS = [['amethyst', 0.34], ['kristall', 0.24], ['rubin', 0.14], ['saphir', 0.14], ['opal', 0.08], ['kristallblume', 0.06]];
// Fundstücke pro Tag: [Gegenstand, Anzahl, Bedingungen]
export const FINDS = {
  wald: [['waldmoos', 4], ['harzperle', 1, { chance: 0.65 }], ['eulenfeder', 2, { from: 19 }]],
  wiese: [['pusteblume', 4], ['gluecksklee', 1, { chance: 0.45 }], ['morgentau', 3, { to: 9.5 }]],
  hoehle: [['leuchtmoos', 3], ['tropfstein', 2], ['geode', 2, { tool: 'shovel' }]],
};
// Ereignisorte (lokal)
export const STAG_AT = [1.6, -1.4], RING_AT = [-7, -1], SWARM_AT = [4, -4.6];
export const CHIME_STONE = [-5, 2], CHIME_CRYSTALS = [[-7, 3], [-5, 5], [-3, 3]];
export const CHIME_LEN = 4;
// Sitzplätze: umgefallene Baumstämme im Wald, die Schaukel am alten Baum auf der Wiese
export const LOGS9 = [[-AREAS.wald.w + 0.8, 2.5, 0.3], [AREAS.wald.w - 0.9, -3.2, -0.5]];
export const SWING9 = [-AREAS.wiese.w - 0.25, -AREAS.wiese.d + 4];
// feste Dinge, an denen man nicht durchlaufen kann
const SOLID9 = { wald: [CREATURES.wald.at], wiese: [CREATURES.wiese.at], hoehle: [CREATURES.hoehle.at, CHIME_STONE, ...CHIME_CRYSTALS] };
export const blockedArea9 = (id, tx, tz) => !!SOLID9[id]?.some(([x, z]) => x === tx && z === tz);

// Seilbahn-Haltestelle (gleiche Rechnung wie features/cable.js) – dort liegt nichts
function cableAt(id) {
  const A = AREAS[id], ok = (x, z) => Math.abs(x) <= A.w + 0.4 && Math.abs(z) <= A.d + 0.4;
  for (let lz = A.d - 2; lz > 0; lz--) for (let lx = -A.w + 2; lx < 0; lx++) {
    let free = true;
    for (let i = -1; i <= 1 && free; i++) for (let j = -1; j <= 1; j++) if (nodeAt(id, lx + i, lz + j) || !ok(lx + i, lz + j)) { free = false; break; }
    if (free) return [lx, lz];
  }
  return [-A.w + 2, A.d - 2];
}
// Freie Kacheln für Fundstücke (keine Knoten, kein Weg, nicht am Ausgang, nicht bei Bewohnern & Ereignissen)
export const SPOTS9 = {};
for (const [id, A] of Object.entries(AREAS)) {
  const busy = [...(SOLID9[id] || []), cableAt(id), ...areaTreesInside(id), ...(id === 'wald' ? [STAG_AT, RING_AT] : id === 'wiese' ? [SWARM_AT] : [[0, -(A.d - 1)], [-2, -(A.d - 1)], [2, -(A.d - 1)], CAVE_LAKE])];
  const out = [];
  for (let z = -A.d + 1; z <= A.d - 2; z++) for (let x = -A.w + 1; x <= A.w - 1; x++) {
    if (Math.abs(x - pathX(id, z)) <= 1.2 || areaBlock(id, x, z, 0.7) || NODES[id].some(n => Math.abs(n.x - x) <= 1 && Math.abs(n.z - z) <= 1 && (n.x === x && n.z === z || ['pine', 'ore', 'hive'].includes(n.kind)))) continue;
    if (busy.some(([bx, bz]) => Math.hypot(bx - x, bz - z) < 2.2) || (x > 1 && x < 4 && z > A.d - 3)) continue;
    out.push([x, z]);
  }
  SPOTS9[id] = out;
}
const whenOk = (s, o = {}) => (o.from == null || hour(s) >= o.from) && (o.to == null || hour(s) < o.to);
// Fundstücke des Tages: [{ i, id, x, z, tool }] (für alle gleich; ob etwas gerade sichtbar ist, hängt an der Uhrzeit)
export function findsToday(id, day) {
  const spots = SPOTS9[id] || [], out = [], used = new Set();
  for (const [k, [item, n, o = {}]] of FINDS[id].entries()) {
    if (o.chance != null && h32(day * 13 + k, code(id)) > o.chance) continue;
    for (let j = 0, t = 0; j < n && t < 40; t++) {
      const p = Math.floor(h32(day * 97 + k * 11 + t, code(id) + 3) * spots.length);
      if (used.has(p)) continue;
      used.add(p); j++;
      out.push({ i: out.length, id: item, x: spots[p][0], z: spots[p][1], tool: o.tool || 'hand', when: o });
    }
  }
  return out;
}
const A9 = s => (s.area9?.day === s.day ? s.area9 : (s.area9 = { day: s.day, got: {}, ev: {}, done: s.area9?.done || {} }));
export const findVisible = (s, id, f) => whenOk(s, f.when) && !A9(s).got[id + ':' + f.i];

// Ereignisse: an welchen Tagen und zu welchen Stunden
export const stagToday = (s, day = s.day) => !!s.areas?.wald && h32(day, 4711) < 0.4;
export const stagNow = s => stagToday(s) && hour(s) >= 6 && hour(s) < 9.5;
export const ringToday = (s, day = s.day) => !!s.areas?.wald && h32(day, 5303) < 0.35;
export const ringNow = s => ringToday(s) && hour(s) >= 19;
export const swarmToday = (s, day = s.day) => !!s.areas?.wiese && h32(day, 6011) < 0.45;
export const swarmNow = s => swarmToday(s) && hour(s) >= 10 && hour(s) < 16 && !['rain', 'storm', 'snow'].includes(s.weather);
export const SWARM_MAX = 3;
// Kristallklang: Ton-Folge des Tages (für alle gleich)
export const chimeSeq = day => Array.from({ length: CHIME_LEN }, (_, i) => Math.floor(h32(day * 5 + i, 9001) * 3));

const has = (s, need) => Object.entries(need).every(([k, n]) => (s.inv[k] || 0) >= n);
const take = (s, need) => { for (const [k, n] of Object.entries(need)) { s.inv[k] -= n; if (!s.inv[k]) delete s.inv[k]; } };
const give = (s, id, n = 1) => { s.inv[id] = (s.inv[id] || 0) + n; };

// Was liegt vor der Figur? (Vor-Prüfung in resolveArea)
export function resolveArea9(s, id, sel, px, pz, me) {
  const A = AREAS[id], lx = px - A.x, lz = pz - A.z, mx = me.x - A.x, mz = me.z - A.z, tiles = [[Math.round(px), Math.round(pz)]];
  const C = CREATURES[id], d = (p, x = lx, z = lz) => Math.hypot(p[0] - x, p[1] - z);
  if (C && d(C.at) < 1.2) return { ui: C.panel, label: `${C.icon} ${C.name}`, tiles };
  if (id === 'wald') for (const [x, z] of LOGS9) if (d([x, z]) < 1.1) return { sit: { x: A.x + x, z: A.z + z, r: 0 }, label: '🪵 Auf den Baumstamm setzen', tiles };
  if (id === 'wiese' && d(SWING9) < 1.0) return { sit: { x: A.x + SWING9[0], z: A.z + SWING9[1], r: 0 }, label: '🌼 Schaukeln', tiles };
  if (id === 'hoehle') {
    if (d(CHIME_STONE) < 1.1) return { chime9: 'start', label: A9(s).ev['chime:' + who(s)] ? '🎵 Klangstein (heute schon gelöst)' : '🎵 Den Klangstein anschlagen', tiles };
    const c = CHIME_CRYSTALS.findIndex(p => d(p) < 1.1);
    if (c >= 0) return { chime9: c, label: '💎 Kristall anschlagen', tiles };
  }
  if (id === 'wald' && stagNow(s) && d(STAG_AT, mx, mz) < 2.6) return { stag9: true, label: A9(s).ev['stag:' + who(s)] ? '🦌 Der weiße Hirsch' : '🦌 Ganz leise die Hand hinhalten', tiles: [] };
  if (id === 'wald' && ringNow(s) && d(RING_AT, mx, mz) < 1.6) return A9(s).ev['ring:' + who(s)] ? { label: '🍄 Der Pilzkreis leuchtet', tiles: [] } : { a: { t: 'area9', op: 'ring' }, label: '🍄 Im Pilzkreis tanzen', tiles: [] };
  if (id === 'wiese' && swarmNow(s) && d(SWARM_AT, mx, mz) < 2.4) {
    const n = A9(s).ev['swarm:' + who(s)] || 0;
    if (n >= SWARM_MAX) return { label: '🦋 Die Schmetterlinge tanzen', tiles: [] };
    return sel === 'net' ? { a: { t: 'area9', op: 'swarm' }, label: '✨ Goldstaub einfangen', tiles: [] } : { label: '🦋 Schmetterlingstanz – mit dem Kescher Goldstaub fangen', tiles: [] };
  }
  const tx = Math.round(lx), tz = Math.round(lz), f = findsToday(id, s.day).find(f => f.x === tx && f.z === tz && findVisible(s, id, f));
  if (f) {
    const it = ITEMS[f.id];
    if (f.tool === 'shovel' && sel !== 'shovel') return { label: `✨ Hier glitzert etwas – mit der Schaufel graben`, tiles };
    return { a: { t: 'area9', op: 'find', area: id, i: f.i }, label: f.tool === 'shovel' ? `⛏️ ${it.icon} ${it.name} ausgraben` : `${it.icon} ${it.name} aufheben`, tiles };
  }
  return null;
}
const who = s => s._who || 'host';

export function area9(s, a, out) {
  const S9 = A9(s), me = who(s);
  if (a.op === 'find') {
    const id = a.area, f = AREAS[id] && s.areas?.[id] && findsToday(id, s.day)[a.i];
    if (!f || !findVisible(s, id, f)) return false;
    S9.got[id + ':' + f.i] = 1;
    give(s, f.id);
    s.stats.finds9 = (s.stats.finds9 || 0) + 1;
    out.got = f.id;
    out.fx.push({ x: AREAS[id].x + f.x, z: AREAS[id].z + f.z, txt: `+1 ${ITEMS[f.id].icon}`, k: 'sparkle' });
    out.msg = `${ITEMS[f.id].icon} ${ITEMS[f.id].name}!${f.id === 'gluecksklee' ? ' Vier Blätter – was für ein Glück!' : ''}`;
    out.snd = f.tool === 'shovel' ? 'till' : 'harvest';
    return true;
  }
  if (a.op === 'stag') {
    if (!stagNow(s) || S9.ev['stag:' + me]) return false;
    S9.ev['stag:' + me] = 1;
    give(s, 'geweihstange');
    X.moment(s, 'stag', '🦌', 'Der weiße Hirsch', 'Ganz still auf der Lichtung im Morgennebel – und er hat sich streicheln lassen.', out);
    out.got = 'geweihstange';
    out.msg = '🦌 Der weiße Hirsch schnuppert an deiner Hand … und lässt eine Geweihstange für dich liegen!';
    out.snd = 'love';
    return true;
  }
  if (a.op === 'ring') {
    if (!ringNow(s) || S9.ev['ring:' + me]) return false;
    S9.ev['ring:' + me] = 1;
    give(s, 'waldmoos', 2); give(s, 'harzperle'); give(s, Math.random() < 0.5 ? 'morchel' : 'eulenfeder');
    X.moment(s, 'ring', '🍄', 'Im Pilzkreis getanzt', 'Mitten in der Nacht leuchteten die Pilze im Kreis – und alles glitzerte.', out);
    out.msg = '🍄✨ Die Pilze leuchten auf – Moos, eine Harzperle und noch etwas Schönes liegen im Kreis!';
    out.fx.push({ x: AREAS.wald.x + RING_AT[0], z: AREAS.wald.z + RING_AT[1], txt: '✨', k: 'sparkle' });
    out.snd = 'fanfare';
    return true;
  }
  if (a.op === 'swarm') {
    const n = S9.ev['swarm:' + me] || 0;
    if (!swarmNow(s) || n >= SWARM_MAX) return false;
    S9.ev['swarm:' + me] = n + 1;
    give(s, 'goldstaub');
    if (!n) X.moment(s, 'swarm', '🦋', 'Schmetterlingstanz', 'Hunderte Schmetterlinge tanzten über der Blütenwiese.', out);
    out.got = 'goldstaub';
    out.msg = `✨ Goldener Blütenstaub! (${n + 1}/${SWARM_MAX})`;
    out.snd = 'found';
    return true;
  }
  if (a.op === 'chime') {
    if (!s.areas?.hoehle || S9.ev['chime:' + me]) return false;
    if (!Array.isArray(a.seq) || a.seq.join() !== chimeSeq(s.day).join()) return false;
    S9.ev['chime:' + me] = 1;
    give(s, 'kristallblume');
    X.moment(s, 'chime', '🎵', 'Der Kristallklang', 'Die Kristalle haben gesungen – und eine Kristallblume ist aufgeblüht.', out);
    out.got = 'kristallblume';
    out.msg = '🎵💠 Die Kristalle singen – eine Kristallblume blüht auf!';
    out.snd = 'fanfare';
    return true;
  }
  if (a.op === 'trade') {
    const t = TRADES[a.area]?.find(([id]) => id === a.id);
    if (!t || !s.areas?.[a.area]) return false;
    if (!has(s, t[1])) { out.msg = 'Dafür fehlt noch etwas.'; return false; }
    take(s, t[1]);
    give(s, t[0]);
    (s.catalog ||= {})[t[0]] = 1;
    S9.done[t[0]] = (S9.done[t[0]] || 0) + 1;
    out.got = t[0];
    out.msg = `${CREATURES[a.area].icon} „Bitte schön – ${ITEMS[t[0]]?.name}!“`;
    out.snd = 'coin';
    return true;
  }
  if (a.op === 'crack') {
    if (!s.areas?.hoehle || !(s.inv.geode > 0)) return false;
    take(s, { geode: 1 });
    let r = Math.random(), gem = 'amethyst';
    for (const [k, p] of GEODE_GEMS) { if ((r -= p) < 0) { gem = k; break; } }
    give(s, gem);
    out.got = gem;
    out.msg = `⛏️ Knack! In der Geode: ${ITEMS[gem].icon} ${ITEMS[gem].name}!`;
    out.snd = gem === 'kristallblume' ? 'fanfare' : 'found';
    return true;
  }
  return false;
}

// Nachbarn besuchen die Gebiete (an zwei von drei Tagen, zu festen Zeiten)
export const VISITS = [
  { npc: 'kalle', area: 'wald', from: 9, to: 12, at: [-4, 3], lines: ['Psst … hier wachsen die besten Steinpilze!', 'Eule Oskar schläft tagsüber – aber tauschen tut er trotzdem.', 'Riechst du das Harz? Herrlich!'] },
  { npc: 'lio', area: 'wald', from: 16, to: 19, at: [7, -2], lines: ['Die Blaubeeren hier sind die süßesten der ganzen Insel!', 'Hast du schon mal den weißen Hirsch gesehen? Ganz früh morgens …', 'Wenn es dunkel wird, leuchten hier manchmal Pilze im Kreis.'] },
  { npc: 'mira', area: 'wiese', from: 10, to: 13, at: [-2, -3], lines: ['Ich pflücke einen Strauß für mein Haus!', 'Pusteblumen! Einmal pusten und was wünschen. 🌼', 'Hilde macht aus Pusteblumen die schönsten Lampen.'] },
  { npc: 'pippa', area: 'wiese', from: 14, to: 17, at: [6, 1], lines: ['Quak! Hier summt und brummt alles!', 'Glücksklee findet man nur, wenn man nicht danach sucht.', 'Bei Sonne tanzen hier die Schmetterlinge!'] },
  { npc: 'bruno', area: 'hoehle', from: 11, to: 14, at: [3, -1], lines: ['Wow, schau dir diese Kristalle an!', 'Grubi hat mir gezeigt, wie man Geoden knackt!', 'Hörst du, wie die Kristalle summen?'] },
  { npc: 'wanda', area: 'hoehle', from: 15, to: 18, at: [-2, 5], lines: ['Faszinierend! Tropfsteine wachsen nur einen Zentimeter in hundert Jahren.', 'Das Leuchtmoos braucht kaum Licht.', 'Spiel die Töne der Kristalle nach – sie mögen das.'] },
];
export const visitNow = (s, v) => !!s.areas?.[v.area] && (s.day + VISITS.indexOf(v)) % 3 !== 0 && hour(s) >= v.from && hour(s) < v.to;
export const visitOf = (s, npc) => VISITS.find(v => v.npc === npc && visitNow(s, v)) || null;

// Für die Zeitung: was heute in den Gebieten los ist
export function gossip9(s) {
  const g = [];
  if (stagToday(s)) g.push('🦌 Frühaufsteher aufgepasst: Im Kiefernwald wurde im Morgennebel ein weißer Hirsch gesehen!');
  if (ringToday(s)) g.push('🍄 Heute Nacht soll im Kiefernwald wieder der Pilzkreis leuchten …');
  if (swarmToday(s)) g.push('🦋 Über der Blütenwiese tanzen heute die Schmetterlinge – Kescher mitnehmen!');
  return g;
}
export function migrate9(s) {
  const S9 = s.area9;
  if (S9 && !(Number.isInteger(S9.day) && S9.got && typeof S9.got === 'object' && S9.ev && typeof S9.ev === 'object')) s.area9 = null;
  if (s.area9 && !(s.area9.done && typeof s.area9.done === 'object')) s.area9.done = {};
}
export { nodeAt };
