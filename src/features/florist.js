// Teil von extras5.js – Blumenladen: jeden Tag zwei Strauß-Bestellungen nach Farben, aus eigenen Blumen gebunden.
import { CROPS, ITEMS, NPC_IDS, NPC_DATA } from '../data.js';
import * as S from '../state.js';
import { fmt } from './util.js';

export const COLOR_NAMES = { rot: '❤️ rot', rosa: '🩷 rosa', gelb: '💛 gelb', orange: '🧡 orange', lila: '💜 lila', blau: '💙 blau', weiss: '🤍 weiß' };
// Farbe einer Blume aus ihrem Farbwert
export function flowerColor(k) {
  const c = CROPS[k]?.flower;
  if (c === undefined) return null;
  const r = (c >> 16 & 255) / 255, g = (c >> 8 & 255) / 255, b = (c & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx - mn < 0.15) return 'weiss';
  let h = mx === r ? (g - b) / (mx - mn) : mx === g ? 2 + (b - r) / (mx - mn) : 4 + (r - g) / (mx - mn);
  h = (h * 60 + 360) % 360;
  if (h < 15 || h >= 345) return l > 0.72 ? 'rosa' : 'rot';
  if (h < 40) return 'orange';
  if (h < 70) return 'gelb';
  if (h < 200) return 'blau';
  if (h < 260) return 'blau';
  if (h < 300) return 'lila';
  return 'rosa';
}
const hash = (a, b) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 13; return ((Math.imul(h, 0x27d4eb2f) ^ (h >>> 16)) >>> 0) / 4294967296; };
// Bestellungen des Tages (für alle gleich): [Nachbar, {Farbe: Anzahl}]
export function bouquetOrders(day) {
  const cols = Object.keys(COLOR_NAMES);
  return [0, 1].map(i => {
    const npc = NPC_IDS[Math.floor(hash(day, i) * NPC_IDS.length)], a = cols[Math.floor(hash(day * 3 + i, 7) * cols.length)], b = cols[Math.floor(hash(day * 5 + i, 9) * cols.length)];
    const want = { [a]: 2 + Math.floor(hash(day, i + 9) * 2) };
    if (b !== a) want[b] = (want[b] || 0) + 1 + Math.floor(hash(day, i + 19) * 2);
    return [npc, want];
  });
}
// Welche Blumen aus der Tasche passen? (gibt {id: n} zurück oder null)
export function bouquetPick(inv, want) {
  const pick = {};
  for (const [col, n] of Object.entries(want)) {
    let need = n;
    for (const id of Object.keys(CROPS)) { if (!need || flowerColor(id) !== col) continue; const have = (inv[id] || 0) - (pick[id] || 0), take = Math.min(have, need); if (take > 0) { pick[id] = (pick[id] || 0) + take; need -= take; } }
    if (need) return null;
  }
  return pick;
}
export function bouquet(s, a, out) {
  const i = a.i, F = s.florist;
  if (a.op !== 'deliver' || ![0, 1].includes(i)) return false;
  if (F.day !== s.day) { F.day = s.day; F.done = {}; }
  if (F.done[i]) { out.msg = '💐 Diese Bestellung ist schon geliefert.'; return false; }
  const [npc, want] = bouquetOrders(s.day)[i], pick = bouquetPick(s.inv, want);
  if (!pick) { out.msg = '💐 Dafür fehlen noch Blumen in der richtigen Farbe.'; return false; }
  for (const [id, n] of Object.entries(pick)) S.takeInvX(s, id, n);
  F.done[i] = 1;
  const n = Object.values(want).reduce((t, v) => t + v, 0), m = 250 + n * 120;
  s.money += m; s.stats.earned += m;
  S.friendX(s, npc).f += 12;
  out.msg = `💐 ${NPC_DATA[npc]?.name || npc} strahlt: „So ein schöner Strauß!“ +${fmt(m)} Taler`;
  out.snd = 'love';
  S.questEventX(s, 'bouquet', 1, out);
  return true;
}
