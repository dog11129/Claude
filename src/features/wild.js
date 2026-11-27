// Teil von extras6.js – Wildtiere: Igel (abends), Eichhörnchen (tagsüber unter Bäumen), Enten (am Teich).
// Jeden Tag einmal füttern – nach fünf Tagen sind sie zahm, kommen in den Garten und lassen morgens Geschenke da.
import { ITEMS, BUILDINGS, NPC_IDS } from '../data.js';
import { POND } from '../island.js';
import * as S from '../state.js';
import { hour, note, pick } from './util.js';

export const WILD = {
  igel: { name: 'Igel', icon: '🦔', food: ['apfel', 'birne', 'steinpilz', 'pfifferling', 'blaubeere'], from: 18, to: 24, gifts: ['steinpilz', 'apfel', 'kiefernzapfen'] },
  eichhoernchen: { name: 'Eichhörnchen', icon: '🐿️', food: ['kiefernzapfen', 'apfel', 'kirsche'], from: 7, to: 17, gifts: ['kiefernzapfen', 'harz', 'ast'] },
  ente: { name: 'Enten', icon: '🦆', food: ['weizen'], from: 6, to: 20, gifts: ['ast', 'weizen'] },
};
export const WILD_TAME = 5;
const h32 = (a, b) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 13; return (Math.imul(h, 0x27d4eb2f) ^ (h >>> 16)) >>> 0; };
export const wildAwake = (s, id) => { const h = hour(s), W = WILD[id]; return h >= W.from && h < W.to; };
export const wildTame = (s, id) => (s.wild?.[id]?.t || 0) >= WILD_TAME;
// Wo ist das Tier heute? Zahme kommen in den Garten vor eurem Haus.
export function wildPos(s, id, t = 0) {
  const i = Object.keys(WILD).indexOf(id);
  if (id === 'ente') return { x: POND.cx + Math.cos(t * 0.15 + i) * 0.9, z: POND.cz + Math.sin(t * 0.12 + i) * 0.6, water: true };
  if (wildTame(s, id)) { const B = BUILDINGS.house; return { x: B.cx + (i ? 2.6 : -2.4), z: B.z1 + 2.2 }; }
  const trees = Object.entries(S.spots(s)).filter(([, k]) => k === 'tree').map(([k]) => k).sort();
  if (!trees.length) return null;
  const [x, z] = trees[h32(s.day, i + 7) % trees.length].split(',').map(Number);
  return { x: x + (i ? 0.9 : -0.9), z: z + 0.8 };
}
export function resolveWild(s, me, at) {
  if (S.zoneOf(me) !== 'island') return null;
  const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9;
  for (const id of Object.keys(WILD)) {
    if (!wildAwake(s, id)) continue;
    const p = wildPos(s, id, s.time);
    if (!p || Math.hypot(px - p.x, pz - p.z) > (p.water ? 2.4 : 0.9)) continue;
    const W = WILD[id], w = s.wild[id] || {}, hearts = '💗'.repeat(Math.min(WILD_TAME, w.t || 0));
    if (w.fed === s.day) return { label: `${W.icon} ${W.name} ${hearts || '🤍'} · morgen wieder füttern`, tiles: [] };
    const food = W.food.find(f => s.inv[f] > 0);
    return food ? { a: { t: 'wild', id, item: food }, label: `${ITEMS[food].icon} ${W.name} füttern ${hearts}`, tiles: [] } : { label: `${W.icon} ${W.name} mögen ${W.food.map(f => ITEMS[f]?.icon).join(' ')}`, tiles: [] };
  }
  return null;
}
export function wild(s, a, out) {
  const W = Object.hasOwn(WILD, a.id) ? WILD[a.id] : null;
  if (!W || !W.food.includes(a.item) || !wildAwake(s, a.id)) return false;
  const w = s.wild[a.id] ||= { t: 0 };
  if (w.fed === s.day || !S.takeInvX(s, a.item, 1)) return false;
  w.fed = s.day;
  w.t = Math.min(WILD_TAME, (w.t || 0) + 1);
  out.msg = w.t >= WILD_TAME && !w.tame ? `${W.icon} Die ${W.name} sind jetzt zahm! Ab morgen besuchen sie euren Garten.` : `${W.icon} Mampf! ${'💗'.repeat(w.t)}`;
  if (w.t >= WILD_TAME && !w.tame) { w.tame = s.day; out.snd = 'fanfare'; } else out.snd = 'love';
  out.fx.push({ x: Math.round(wildPos(s, a.id, s.time)?.x || 0), z: Math.round(wildPos(s, a.id, s.time)?.z || 0), txt: '💕', k: 'heart' });
  S.questEventX(s, 'wild', 1, out);
  return true;
}
// Morgens: zahme Tiere lassen eine Kleinigkeit da
export function wildMorning(s) {
  for (const [id, W] of Object.entries(WILD)) if (wildTame(s, id) && Math.random() < 0.5) {
    const it = pick(W.gifts.filter(g => ITEMS[g]));
    if (it) note(s, `${W.icon} Ein Geschenk im Garten`, `Die ${W.name} haben euch heute Nacht ${ITEMS[it].icon} ${ITEMS[it].name} vor die Tür gelegt.`, it, 1);
  }
}
export const WILD_IDS = Object.keys(WILD);
export { NPC_IDS };
