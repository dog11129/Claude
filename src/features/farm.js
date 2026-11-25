// Teil von extras2.js (siehe dort für den Ablauf: Aktionen, Laden, Morgen).
import { ITEMS, PLACE, NPC_IDS, NPC_DATA, weekday, DAY, SHELLS } from '../data.js';
import * as S from '../state.js';
import * as X from '../extras.js';
import { AREAS, nodeAt, inArea } from '../areas.js';
import { rnd, pick, fmt, hour, who, note, shuffle, near } from './util.js';

// =====================================================================
// Bauernhof-Ecke: Hühnerstall & Kuhweide (Produzenten mit Tieren). Gefüttert wird jeden Tag, gestreichelt macht glücklich.
// =====================================================================
export const FARM_FOOD = { huehnerstall: ['weizen', 'kartoffel'], kuhweide: ['weizen', 'karotte', 'apfel'] };
export const farmHappy = o => Math.min(10, o?.h || 0);
// Darf der Produzent heute wachsen? (Tiere wollen gefüttert sein: heute oder gestern)
export const farmFed = (s, o) => o.fed >= s.day - 1;
export function farmResolve(s, o, x, z) {
  const p = PLACE[o.k], one = [[x, z]], kind = o.k === 'kuhweide' ? '🐄' : '🐔';
  if (o.t >= p.every) return { a: { t: 'use', x, z }, label: `${ITEMS[p.item].icon} ${o.k === 'kuhweide' ? 'Melken' : 'Eier einsammeln'}`, tiles: one };
  if (o.fed !== s.day) {
    const food = FARM_FOOD[o.k].find(f => s.inv?.[f] > 0);
    return food ? { a: { t: 'farm', op: 'feed', x, z, item: food }, label: `${ITEMS[food].icon} ${kind} füttern`, tiles: one } : { label: `${kind} haben Hunger: ${FARM_FOOD[o.k].map(f => ITEMS[f]?.icon).join(' ')} mitbringen`, tiles: one };
  }
  if (o.pet !== s.day) return { a: { t: 'farm', op: 'pet', x, z }, label: `🤗 ${kind} streicheln`, tiles: one };
  return { label: `${kind} ${'💗'.repeat(Math.ceil(farmHappy(o) / 2)) || '🤍'} – morgen gibt es mehr`, tiles: one };
}
export function farm(s, a, out) {
  const k = `${a.x},${a.z}`, o = s.obj?.[k], p = o && PLACE[o.k];
  if (!p?.farm) return false;
  if (a.op === 'feed') {
    if (o.fed === s.day || !FARM_FOOD[o.k].includes(a.item) || !S.takeInvX(s, a.item, 1)) return false;
    o.fed = s.day;
    out.msg = o.k === 'kuhweide' ? '🐄 Muuuh! Die Kuh mampft zufrieden.' : '🐔 Gack gack! Die Hühner picken alles auf.';
    out.fx.push({ x: a.x, z: a.z, txt: '🌾', k: 'leaf' });
    out.snd = 'harvest';
    S.questEventX(s, 'farm', 1, out);
    return true;
  }
  if (a.op === 'pet') {
    if (o.pet === s.day) return false;
    o.pet = s.day;
    o.h = Math.min(10, (o.h || 0) + 1);
    out.msg = `${o.k === 'kuhweide' ? '🐄' : '🐔'} ${'💗'.repeat(Math.ceil(o.h / 2))} So glücklich!`;
    out.fx.push({ x: a.x, z: a.z, txt: '💕', k: 'heart' });
    out.snd = 'love';
    return true;
  }
  return false;
}
// Ernte mit Glücks-Bonus (aus state.use aufgerufen)
export function farmHarvest(s, o, p, out) {
  const n = p.n + (farmHappy(o) >= 5 ? 1 : 0), extra = farmHappy(o) >= 10 && Math.random() < (o.k === 'kuhweide' ? 0.3 : 0.15) ? (o.k === 'kuhweide' ? 'kaese' : 'goldei') : null;
  S.addInvX(s, p.item, n);
  if (extra) { S.addInvX(s, extra, 1); out.msg = `✨ Was für ein Glück: ${ITEMS[extra].icon} ${ITEMS[extra].name}!`; }
  s.stats.farm = (s.stats.farm || 0) + n;
  return n;
}
