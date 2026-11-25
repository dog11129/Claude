// Teil von extras4.js – die Vulkaninsel: heiße Quellen, Obsidian und Feuerfalter. Mit Käpt'n Flossi erreichbar.
import { ITEMS, NPC_IDS, NPC_DATA } from '../data.js';
import * as S from '../state.js';
import * as X from '../extras.js';
import { rnd, pick, shuffle } from './util.js';

export const VOLCANO = { x: 0, z: 3200, r: 15 };
export const VOLCANO_PRICE = 1500;
export const VOLCANO_LVL = 4;
export const VOLC_DOCK = [0, VOLCANO.r - 1.5];
export const VOLC_SPRINGS = [[-6, 1.5, 1.7], [5.5, 0.5, 1.6]]; // [x, z, Radius]
export const VOLC_ROCKS = [[-9, -4], [9, -5], [-3, -7], [3.5, 6.5]];
export const VOLC_BUSHES = [[-7.5, 7], [8.5, 4.5], [0, 3]];
export const VOLC_CONE = [0, -9, 4.2]; // Krater im Norden (fest)
export function volcBlocked(s, x, z) {
  const lx = x - VOLCANO.x, lz = z - VOLCANO.z;
  if (Math.hypot(lx, lz) > VOLCANO.r - 0.4) return !(Math.abs(lx) < 0.8 && lz > 0 && lz < VOLCANO.r + 1.2); // Steg im Süden
  if (Math.hypot(lx - VOLC_CONE[0], lz - VOLC_CONE[1]) < VOLC_CONE[2]) return true;
  return VOLC_ROCKS.some(([rx, rz]) => Math.hypot(lx - rx, lz - rz) < 0.6) || VOLC_BUSHES.some(([bx, bz]) => Math.hypot(lx - bx, lz - bz) < 0.45);
}
export const inSpring = (x, z) => VOLC_SPRINGS.findIndex(([sx, sz, r]) => Math.hypot(x - VOLCANO.x - sx, z - VOLCANO.z - sz) < r);
// Wer badet heute in den Quellen? (zwei Nachbarn, für alle gleich)
export const bathers = s => { const r = (s.day * 7919) % 97, ids = NPC_IDS.slice(); return [ids[r % ids.length], ids[(r + 3) % ids.length]].filter((v, i, a) => a.indexOf(v) === i); };
export function resolveVolcano(s, me, sel, at) {
  const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9, lx = px - VOLCANO.x, lz = pz - VOLCANO.z, V = s.volcano;
  if (Math.hypot(me.x - VOLCANO.x - VOLC_DOCK[0], me.z - VOLCANO.z - VOLC_DOCK[1]) < 1.8) return { ui: 'boatback', label: '⛵ Käpt\'n Flossi: zurück nach Hause', tiles: [] };
  const sp = inSpring(me.x, me.z) >= 0 ? inSpring(me.x, me.z) : inSpring(px, pz);
  if (sp >= 0) return { bath: true, sit: { x: me.x, z: me.z, r: 2 }, label: '♨️ In die heiße Quelle setzen', tiles: [] };
  const r = VOLC_ROCKS.findIndex(([x, z]) => Math.hypot(lx - x, lz - z) < 1.1);
  if (r >= 0) return V.rock?.[r] === s.day ? { label: '⬛ Für heute abgebaut', tiles: [] } : sel === 'shovel' ? { a: { t: 'volc', op: 'mine', i: r }, label: '⛏️ Obsidianfels abbauen', tiles: [] } : { label: '⬛ Obsidianfels · mit der Schaufel draufhauen', tiles: [] };
  const b = VOLC_BUSHES.findIndex(([x, z]) => Math.hypot(lx - x, lz - z) < 1.2);
  if (b >= 0) return V.bush?.[b] === s.day ? { label: '🔥 Hier flattert heute nichts mehr', tiles: [] } : sel === 'net' ? { a: { t: 'volc', op: 'bug', i: b }, label: '🦋 Mit dem Kescher fangen', tiles: [] } : { label: '🔥 Glutblumen – hier flattert etwas! (Kescher)', tiles: [] };
  return { label: '', tiles: [] };
}
export function volc(s, a, out) {
  const V = s.volcano;
  if (a.op === 'boat') {
    if (s.level < VOLCANO_LVL) { out.msg = `🌋 Die Vulkaninsel gibt es ab Insel-Level ${VOLCANO_LVL}.`; return false; }
    if (s.money < VOLCANO_PRICE) { out.msg = `🌋 Die Überfahrt kostet ${VOLCANO_PRICE} Taler.`; return false; }
    s.money -= VOLCANO_PRICE;
    if (!V.found) { V.found = s.day; X.moment(s, 'volcano', '🌋', 'Die Vulkaninsel', 'Dampfende Quellen, schwarzer Obsidian und Falter, die wie Funken leuchten.', out); }
    out.snd = 'splash';
    return true;
  }
  if (a.op === 'bath') {
    if (V.bath === s.day) return true; // schon gebadet: einfach sitzen
    V.bath = s.day;
    const who = bathers(s);
    for (const id of who) S.friendX(s, id).f += 6;
    out.msg = `♨️ Herrlich warm! ${who.map(id => NPC_DATA[id]?.name || id).join(' und ')} ${who.length > 1 ? 'baden' : 'badet'} mit – ihr plaudert und lacht.`;
    out.snd = 'splash';
    S.questEventX(s, 'bath', 1, out);
    return true;
  }
  if (a.op === 'mine') {
    const i = a.i;
    if (!Number.isInteger(i) || !VOLC_ROCKS[i] || V.rock[i] === s.day) return false;
    V.rock[i] = s.day;
    const r = Math.random(), id = r < 0.48 ? 'obsidian' : r < 0.9 ? 'lavastein' : 'opal';
    S.addInvX(s, id, 1); S.collectX(s, id, out);
    out.got = id; out.msg = `⛏️ ${ITEMS[id].icon} ${ITEMS[id].name}!`; out.snd = 'found';
    S.questEventX(s, 'gem', id === 'opal' ? 1 : 0, out);
    return true;
  }
  if (a.op === 'bug') {
    const i = a.i;
    if (!Number.isInteger(i) || !VOLC_BUSHES[i] || V.bush[i] === s.day) return false;
    V.bush[i] = s.day;
    const id = Math.random() < 0.6 ? 'feuerfalter' : 'glutkaefer';
    S.addInvX(s, id, 1); S.collectX(s, id, out);
    s.tidebook[id] ||= s.day;
    out.got = id; out.msg = `🦋 ${ITEMS[id].icon} ${ITEMS[id].name} gefangen!`; out.snd = 'found';
    S.questEventX(s, 'bug', 1, out);
    return true;
  }
  return false;
}
