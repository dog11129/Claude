// Teil von extras7.js – Wetter-Abenteuer: am Ende des Regenbogens ein Goldtopf, nach Gewittern Blitzsteine,
// an Nebelmorgen tanzen Irrlichter (mit dem Kescher fangen).
import { MAP, ITEMS } from '../data.js';
import * as S from '../state.js';
import { hour, fmt, rnd } from './util.js';

// Freies Rasenstück: nichts darauf, auch keine Ostereier, Muscheln, Grabstellen oder Unkraut (sonst verdeckt es etwas)
const freeTile = s => { for (let i = 0; i < 300; i++) { const x = rnd(2 * MAP - 3) - MAP + 2, z = rnd(2 * MAP - 3) - MAP + 2, k = `${x},${z}`; if (S.canPlace(s, x, z) && !S.blocked(s, x, z) && !s.paths?.[k] && !s.eggs?.[k]) return [x, z]; } return null; };
export const rainbowNow = s => s.rainbowDay === s.day && s.weather === 'sun' && hour(s) < 13;
export const WISPS = 3;
export const wispTime = s => s.weather === 'fog' && hour(s) >= 5 && hour(s) < 10;
// Irrlichter ziehen langsam über die Insel (alle sehen dieselben)
export function wispPos(s, i, t) {
  const a = t * 0.05 + i * 2.1, r = 8 + i * 3.5;
  return { x: Math.cos(a) * r + Math.sin(t * 0.13 + i) * 2, z: Math.sin(a * 1.2) * r * 0.8 + Math.cos(t * 0.09 + i) * 2, y: 1.1 + Math.sin(t * 1.3 + i) * 0.3 };
}
export function morningWeather(s) {
  const W = s.wx7 ||= {};
  if (W.w === 'storm') { // nach dem Gewitter: drei Blitzsteine
    for (let n = 0; n < 3; n++) { const p = freeTile(s); if (p) (s.ground ||= {})[`${p[0]},${p[1]}`] = { id: 'blitzstein', n: 1 }; }
  }
  W.w = s.weather;
  s.rbpot = s.rainbowDay === s.day ? { day: s.day, at: freeTile(s), found: 0 } : null;
  if (s.rbpot && !s.rbpot.at) s.rbpot = null;
  s.wisps = {};
}
export function resolveWeather(s, me, sel, at) {
  if (S.zoneOf(me) !== 'island') return null;
  const px = at ? at.x : me.x + Math.sin(me.ry) * 0.9, pz = at ? at.z : me.z + Math.cos(me.ry) * 0.9;
  const P = s.rbpot;
  if (P && !P.found && rainbowNow(s) && Math.hypot(px - P.at[0], pz - P.at[1]) < 0.8 && (sel === 'shovel' || !(s.tiles[P.at.join()] || s.obj[P.at.join()] || s.eggs?.[P.at.join()] || s.ground?.[P.at.join()]))) return sel === 'shovel' ? { a: { t: 'weather7', op: 'pot' }, label: '🌈 Am Ende des Regenbogens graben!', tiles: [P.at] } : { label: '🌈 Hier endet der Regenbogen … mit der Schaufel graben!', tiles: [P.at] };
  if (wispTime(s) && sel === 'net') for (let i = 0; i < WISPS; i++) {
    if (s.wisps?.[i] === s.day) continue;
    const w = wispPos(s, i, s.time);
    if (Math.hypot(px - w.x, pz - w.z) < 1.3) return { a: { t: 'weather7', op: 'wisp', i }, label: '💫 Irrlicht fangen!', tiles: [] };
  }
  return null;
}
export function weather7(s, a, out) {
  if (a.op === 'pot') {
    const P = s.rbpot;
    if (!P || P.found || !rainbowNow(s)) return false;
    P.found = s.day;
    s.money += 3000; s.stats.earned += 3000;
    S.addInvX(s, 'goldnugget', 2);
    out.msg = `🌈 Ein Topf voller Gold! +${fmt(3000)} Taler und 2 Goldnuggets`;
    out.snd = 'fanfare';
    S.questEventX(s, 'weather', 1, out);
    return true;
  }
  if (a.op === 'wisp') {
    if (!wispTime(s) || !Number.isInteger(a.i) || a.i < 0 || a.i >= WISPS || (s.wisps ||= {})[a.i] === s.day) return false;
    s.wisps[a.i] = s.day;
    S.addInvX(s, 'irrlicht', 1);
    out.msg = `💫 Ein Irrlicht! ${ITEMS.irrlicht.desc}`; out.snd = 'love';
    S.questEventX(s, 'weather', 1, out);
    return true;
  }
  return false;
}
