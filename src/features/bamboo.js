// Teil von extras7.js – Bambushain hinter dem Kiefernwald: Bambus hacken, Sprossen ausgraben, Steinlaternen,
// ein plätscherndes Wasserspiel und das Teehaus mit Teezeremonie.
import { AREAS } from '../areas.js';
import * as S from '../state.js';
import { who, fmt, note } from './util.js';

export const BAMBUS = { x: 0, z: -1200, w: 11, d: 8 };
export const BAMBUS_GATE = { area: 'wald', at: [0, -AREAS.wald.d] }; // Nordrand des Kiefernwalds
export const BAMBUS_PRICE = 30000, BAMBUS_WOOD = 20;
export const CLUMPS = [[-8, -5], [-5.5, -6.5], [-8.5, -1.5], [-6.5, 2.5], [-8.5, 5.5], [8, -5.5], [8.8, -1.2], [6.6, 3], [8.6, 6], [-3.2, 5.8], [3.6, 6.2]];
export const LANTERNS = [[-2.4, -3.6], [2.4, -3.6], [-2.4, 0.4], [2.4, 0.4], [-2.4, 3.8], [2.4, 3.8]];
export const TEAHOUSE = { x: 0, z: -6.2, w: 2.4, d: 1.4 };
export const FOUNTAIN = [5, -2.2]; // Wasserspiel (Bambusrohr, das ins Becken kippt)
export const SHOOT_SPOTS = [[-5, -3], [-4, 0.6], [-5.6, 4.5], [5, 0.4], [4.4, 4.6], [-1.2, 6.2], [1.4, -1.4], [-6.4, -3.6], [6.2, -4]];
const h32 = (a, b) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 13; return (Math.imul(h, 0x27d4eb2f) ^ (h >>> 16)) >>> 0; };
export const shootsToday = day => SHOOT_SPOTS.map((p, i) => i).filter(i => h32(day, i + 5) % 9 < 4);
export const bambusOpen = s => !!s.bambus?.open;
export const TEA_REWARD = 3; // so viele perfekte Zeremonien bis zum Tee-Set

export function blockedBambus(s, x, z) {
  const lx = x - BAMBUS.x, lz = z - BAMBUS.z;
  if (Math.abs(lx) <= 1.1 && lz > BAMBUS.d - 0.2 && lz <= BAMBUS.d + 0.9) return false;
  if (Math.abs(lx) > BAMBUS.w || Math.abs(lz) > BAMBUS.d) return true;
  if (Math.abs(lx - TEAHOUSE.x) < TEAHOUSE.w && Math.abs(lz - TEAHOUSE.z) < TEAHOUSE.d) return true;
  if (Math.hypot(lx - FOUNTAIN[0], lz - FOUNTAIN[1]) < 0.9) return true;
  return CLUMPS.some(([cx, cz]) => Math.hypot(lx - cx, lz - cz) < 0.75) || LANTERNS.some(([cx, cz]) => Math.hypot(lx - cx, lz - cz) < 0.35);
}
export function resolveBambus(s, me, sel, at) {
  const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9, lx = px - BAMBUS.x, lz = pz - BAMBUS.z, B = s.bambus;
  if (lz >= BAMBUS.d - 0.6 && Math.abs(lx) <= 1.2) return { go: 'bambusback', label: '🌲 Zurück in den Kiefernwald', tiles: [] };
  if (Math.abs(lx - TEAHOUSE.x) < TEAHOUSE.w + 0.6 && Math.abs(lz - TEAHOUSE.z) < TEAHOUSE.d + 0.8) return { ui: 'teahouse', label: '🍵 Teehaus', tiles: [] };
  for (const [i, [cx, cz]] of CLUMPS.entries()) if (Math.hypot(lx - cx, lz - cz) < 1.25) {
    if (B.cut?.[i] === s.day) return { label: '🎋 Bambus · morgen wieder', tiles: [] };
    return sel === 'axe' ? { a: { t: 'bambus', op: 'cut', i }, label: '🎋 Bambus hacken', tiles: [] } : { label: '🎋 Bambus · mit der Axt hacken', tiles: [] };
  }
  if (Math.hypot(lx - FOUNTAIN[0], lz - FOUNTAIN[1]) < 1.5) return { label: '💧 Klack! … das Wasserspiel', tiles: [] };
  for (const i of shootsToday(s.day)) {
    const [sx, sz] = SHOOT_SPOTS[i];
    if (Math.hypot(lx - sx, lz - sz) > 0.8 || B.dug?.[i] === s.day) continue;
    return sel === 'shovel' ? { a: { t: 'bambus', op: 'dig', i }, label: '🌱 Bambussprosse ausgraben', tiles: [] } : { label: '🌱 Eine Sprosse · mit der Schaufel ausgraben', tiles: [] };
  }
  return { label: '', tiles: [] };
}
export function resolveBambusGate(s, me, at) {
  if (S.zoneOf(me) !== BAMBUS_GATE.area) return null;
  const A = AREAS[BAMBUS_GATE.area], px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9;
  if (Math.hypot(px - A.x - BAMBUS_GATE.at[0], pz - A.z - BAMBUS_GATE.at[1]) > 1.3) return null;
  return bambusOpen(s) ? { go: 'bambus', label: '🎋 Zum Bambushain', tiles: [] } : { ui: 'bambusgate', label: '⛩️ Das Bambustor', tiles: [] };
}
const LEARN = ['b_bambuszaun', 'b_bambuslampe'];
export function bambus(s, a, out) {
  const B = s.bambus;
  if (a.op === 'open') {
    if (B.open || !s.areas?.wald) return false;
    if (s.money < BAMBUS_PRICE || (s.inv.holz || 0) < BAMBUS_WOOD) { out.msg = `⛩️ Das Tor kostet ${fmt(BAMBUS_PRICE)} Taler aus der Inselkasse und ${BAMBUS_WOOD} Holz.`; return false; }
    s.money -= BAMBUS_PRICE; S.takeInvX(s, 'holz', BAMBUS_WOOD);
    B.open = s.day;
    for (const id of LEARN) s.recipes[id] = 1;
    note(s, '🎋 Der Bambushain ist offen!', 'Hinter dem Kiefernwald rauscht jetzt der Bambus. Im Teehaus gibt es Teezeremonien, und an der Werkbank könnt ihr Bambuszaun und Bambuslampe bauen.', null, 1);
    out.msg = '⛩️ Das Bambustor ist offen!'; out.snd = 'fanfare';
    return true;
  }
  if (!B.open) return false;
  if (a.op === 'cut') {
    if (!CLUMPS[a.i] || B.cut[a.i] === s.day) return false;
    B.cut[a.i] = s.day;
    S.addInvX(s, 'bambus', 2);
    out.msg = '🎋 2× Bambus'; out.snd = 'chop';
    S.questEventX(s, 'bamboo', 1, out);
    return true;
  }
  if (a.op === 'dig') {
    if (!shootsToday(s.day).includes(a.i) || B.dug[a.i] === s.day) return false;
    B.dug[a.i] = s.day;
    S.addInvX(s, 'bambussprosse', 1);
    out.msg = '🌱 Eine zarte Bambussprosse!'; out.snd = 'dig';
    S.questEventX(s, 'bamboo', 1, out);
    return true;
  }
  if (a.op === 'tea') {
    const me = who(s), T = B.tea ||= {};
    if (!Number.isInteger(a.score) || a.score < 0 || a.score > 100) return false;
    if (T[me] === s.day) { out.msg = '🍵 Heute hattet ihr schon eure Teezeremonie.'; return false; }
    T[me] = s.day;
    S.addInvX(s, 'gruener_tee', a.score >= 50 ? 2 : 1);
    if (a.score >= 85) B.perfect = (B.perfect || 0) + 1;
    for (const id of ['kalle', 'wanda']) if (S.friendX) S.friendX(s, id).f += a.score >= 85 ? 8 : 4;
    out.msg = `🍵 ${a.score >= 85 ? 'Eine vollkommene Zeremonie!' : a.score >= 50 ? 'Ein schöner Tee.' : 'Etwas bitter … aber mit Liebe gemacht.'} (${a.score} Punkte)`;
    out.snd = a.score >= 85 ? 'fanfare' : 'love';
    if (B.perfect >= TEA_REWARD && !B.set) { B.set = s.day; note(s, '🍵 Meisterin des Tees', 'Drei vollkommene Teezeremonien! Für zu Hause: ein eigenes Tee-Set.', 'teeschale', 1); }
    return true;
  }
  return false;
}
